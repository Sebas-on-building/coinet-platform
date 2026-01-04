/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 SMOOTHING & PERSISTENCE TESTS                                          ║
 * ║                                                                               ║
 * ║   Tests for EMA smoothing and restart simulation                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  applySmoothingEMA,
  simulateSmoothing,
  applyBatchSmoothing,
  analyzeSmoothingResults,
  isSmoothingWarmedUp,
  calculateHalfLife,
  calculateReflection,
  SMOOTHING_CONFIG,
  type SmoothingState,
} from '../persistence/smoothing';
import {
  InMemoryOmniScoreStore,
  persistScore,
  getLatestScore,
  getScoreHistory,
  getStore,
  resetStore,
} from '../persistence/store';
import { createInitialSmoothingState } from '../persistence/schema';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: EMA SMOOTHING
// ═══════════════════════════════════════════════════════════════════════════════

describe('EMA Smoothing', () => {
  describe('Cold Start', () => {
    it('should use raw value on cold start', () => {
      const result = applySmoothingEMA({
        posRaw: 75,
        prevState: null,
        timestamp: new Date(),
      });
      
      expect(result.posSmoothed).toBe(75);
      expect(result.isColdStart).toBe(true);
      expect(result.delta).toBe(0);
    });
    
    it('should use raw value when prevPosSmoothed is null', () => {
      const state: SmoothingState = {
        prevPosSmoothed: null,
        prevTimestamp: new Date(),
        stateCount: 0,
        projectId: 'test',
      };
      
      const result = applySmoothingEMA({
        posRaw: 80,
        prevState: state,
        timestamp: new Date(),
      });
      
      expect(result.posSmoothed).toBe(80);
      expect(result.isColdStart).toBe(true);
    });
  });
  
  describe('EMA Formula', () => {
    it('should apply correct EMA formula', () => {
      const prevSmoothed = 70;
      const posRaw = 80;
      const alpha = SMOOTHING_CONFIG.alpha;
      
      const state: SmoothingState = {
        prevPosSmoothed: prevSmoothed,
        prevTimestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        stateCount: 5,
        projectId: 'test',
      };
      
      const result = applySmoothingEMA({
        posRaw,
        prevState: state,
        timestamp: new Date(),
      });
      
      // Expected: 0.25 * 80 + 0.75 * 70 = 20 + 52.5 = 72.5
      const expected = alpha * posRaw + (1 - alpha) * prevSmoothed;
      expect(result.posSmoothed).toBeCloseTo(expected, 2);
      expect(result.isColdStart).toBe(false);
      expect(result.isGapReset).toBe(false);
    });
    
    it('should use alpha = 0.25', () => {
      expect(SMOOTHING_CONFIG.alpha).toBe(0.25);
    });
    
    it('should bound result to [0, 100]', () => {
      const state: SmoothingState = {
        prevPosSmoothed: 98,
        prevTimestamp: new Date(Date.now() - 60 * 60 * 1000),
        stateCount: 5,
        projectId: 'test',
      };
      
      const result = applySmoothingEMA({
        posRaw: 100,
        prevState: state,
        timestamp: new Date(),
      });
      
      expect(result.posSmoothed).toBeLessThanOrEqual(100);
      expect(result.posSmoothed).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Gap Reset', () => {
    it('should reset when gap exceeds maxGapHours', () => {
      const state: SmoothingState = {
        prevPosSmoothed: 50,
        prevTimestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        stateCount: 10,
        projectId: 'test',
      };
      
      const result = applySmoothingEMA({
        posRaw: 80,
        prevState: state,
        timestamp: new Date(),
      });
      
      expect(result.isGapReset).toBe(true);
      expect(result.posSmoothed).toBe(80); // Uses raw value
    });
    
    it('should not reset within maxGapHours', () => {
      const state: SmoothingState = {
        prevPosSmoothed: 50,
        prevTimestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        stateCount: 10,
        projectId: 'test',
      };
      
      const result = applySmoothingEMA({
        posRaw: 80,
        prevState: state,
        timestamp: new Date(),
      });
      
      expect(result.isGapReset).toBe(false);
      expect(result.posSmoothed).not.toBe(80); // Uses EMA
    });
  });
  
  describe('Emergency Cap', () => {
    it('should cap large positive deltas', () => {
      const state: SmoothingState = {
        prevPosSmoothed: 50,
        prevTimestamp: new Date(Date.now() - 60 * 60 * 1000),
        stateCount: 5,
        projectId: 'test',
      };
      
      // Raw value that would cause delta > maxDeltaPerPeriod (15)
      const result = applySmoothingEMA({
        posRaw: 100, // Would cause delta of 12.5 without cap (0.25 * 100 + 0.75 * 50 = 62.5)
        prevState: state,
        timestamp: new Date(),
      });
      
      // Delta should be <= maxDeltaPerPeriod
      expect(Math.abs(result.delta)).toBeLessThanOrEqual(SMOOTHING_CONFIG.maxDeltaPerPeriod);
    });
    
    it('should cap large negative deltas', () => {
      const state: SmoothingState = {
        prevPosSmoothed: 80,
        prevTimestamp: new Date(Date.now() - 60 * 60 * 1000),
        stateCount: 5,
        projectId: 'test',
      };
      
      const result = applySmoothingEMA({
        posRaw: 0, // Would cause negative delta
        prevState: state,
        timestamp: new Date(),
      });
      
      expect(Math.abs(result.delta)).toBeLessThanOrEqual(SMOOTHING_CONFIG.maxDeltaPerPeriod);
    });
  });
  
  describe('Forced Reset', () => {
    it('should reset when forceReset is true', () => {
      const state: SmoothingState = {
        prevPosSmoothed: 50,
        prevTimestamp: new Date(Date.now() - 60 * 60 * 1000),
        stateCount: 10,
        projectId: 'test',
      };
      
      const result = applySmoothingEMA({
        posRaw: 80,
        prevState: state,
        timestamp: new Date(),
        forceReset: true,
      });
      
      expect(result.posSmoothed).toBe(80);
      expect(result.isColdStart).toBe(false); // Not cold start
      // But effectively reset to raw
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SMOOTHING SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Smoothing Simulation', () => {
  it('should smooth volatile series', () => {
    // Simulate volatile raw values
    const rawValues = [50, 80, 40, 90, 30, 70, 50];
    const smoothed = simulateSmoothing(rawValues);
    
    // First value should equal raw (cold start)
    expect(smoothed[0]).toBe(50);
    
    // Subsequent values should be smoothed
    expect(smoothed[1]).toBeCloseTo(57.5, 1); // 0.25*80 + 0.75*50
    
    // Volatility should be reduced
    const rawStd = calculateStd(rawValues);
    const smoothedStd = calculateStd(smoothed);
    expect(smoothedStd).toBeLessThan(rawStd);
  });
  
  it('should converge to stable value', () => {
    // Stable input
    const rawValues = Array(20).fill(75);
    const smoothed = simulateSmoothing(rawValues);
    
    // Should converge to 75
    expect(smoothed[smoothed.length - 1]).toBeCloseTo(75, 1);
  });
  
  it('should track trends with delay', () => {
    // Gradual increase
    const rawValues = [50, 55, 60, 65, 70, 75, 80, 85, 90];
    const smoothed = simulateSmoothing(rawValues);
    
    // Smoothed should lag behind raw
    for (let i = 1; i < smoothed.length; i++) {
      expect(smoothed[i]).toBeLessThan(rawValues[i]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: RESTART SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Restart Simulation', () => {
  beforeEach(() => {
    resetStore();
  });
  
  afterEach(() => {
    resetStore();
  });
  
  it('should persist smoothing state across restarts', async () => {
    const projectId = 'test-project';
    
    // Simulate first run
    await persistScore({
      projectId,
      posRaw: 70,
      qs: 80,
      os: 60,
      risk: 30,
      confidence: 85,
      coverageQs: 0.9,
      coverageOs: 0.8,
      legitimacy: 'LEGIT',
      status: 'scored',
      posFinal: 70,
      dataTimestamp: new Date('2024-01-01T10:00:00Z'),
    });
    
    // Simulate second run (1 hour later)
    const result2 = await persistScore({
      projectId,
      posRaw: 80,
      qs: 82,
      os: 75,
      risk: 28,
      confidence: 87,
      coverageQs: 0.92,
      coverageOs: 0.82,
      legitimacy: 'LEGIT',
      status: 'scored',
      posFinal: 80,
      dataTimestamp: new Date('2024-01-01T11:00:00Z'),
    });
    
    // Second run should use EMA, not cold start
    expect(result2.smoothing.isColdStart).toBe(false);
    expect(result2.smoothing.posSmoothed).not.toBe(80);
    
    // Expected: 0.25 * 80 + 0.75 * 70 = 72.5
    expect(result2.smoothing.posSmoothed).toBeCloseTo(72.5, 1);
  });
  
  it('should maintain history after restart', async () => {
    const projectId = 'history-project';
    
    // Add several records
    for (let i = 0; i < 5; i++) {
      await persistScore({
        projectId,
        posRaw: 70 + i * 2,
        qs: 80,
        os: 60,
        risk: 30,
        confidence: 85,
        coverageQs: 0.9,
        coverageOs: 0.8,
        legitimacy: 'LEGIT',
        status: 'scored',
        posFinal: 70 + i * 2,
        dataTimestamp: new Date(`2024-01-01T1${i}:00:00Z`),
      });
    }
    
    // Query history
    const history = await getScoreHistory(projectId);
    
    expect(history.records.length).toBe(5);
    expect(history.totalCount).toBe(5);
  });
  
  it('should recover from long gap', async () => {
    const projectId = 'gap-project';
    
    // First score
    await persistScore({
      projectId,
      posRaw: 70,
      qs: 80,
      os: 60,
      risk: 30,
      confidence: 85,
      coverageQs: 0.9,
      coverageOs: 0.8,
      legitimacy: 'LEGIT',
      status: 'scored',
      posFinal: 70,
      dataTimestamp: new Date('2024-01-01T10:00:00Z'),
    });
    
    // Score after 48 hours (should reset)
    const result2 = await persistScore({
      projectId,
      posRaw: 90,
      qs: 85,
      os: 70,
      risk: 25,
      confidence: 90,
      coverageQs: 0.95,
      coverageOs: 0.85,
      legitimacy: 'LEGIT',
      status: 'scored',
      posFinal: 90,
      dataTimestamp: new Date('2024-01-03T10:00:00Z'), // 48 hours later
    });
    
    // Should reset to raw value
    expect(result2.smoothing.isGapReset).toBe(true);
    expect(result2.smoothing.posSmoothed).toBe(90);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SMOOTHING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Smoothing Helpers', () => {
  it('should correctly identify warmed up state', () => {
    const coldState: SmoothingState = {
      prevPosSmoothed: 70,
      prevTimestamp: new Date(),
      stateCount: 1,
      projectId: 'test',
    };
    
    const warmState: SmoothingState = {
      prevPosSmoothed: 70,
      prevTimestamp: new Date(),
      stateCount: 5,
      projectId: 'test',
    };
    
    expect(isSmoothingWarmedUp(coldState)).toBe(false);
    expect(isSmoothingWarmedUp(warmState)).toBe(true);
  });
  
  it('should calculate correct half-life', () => {
    const halfLife = calculateHalfLife(0.25);
    // ln(0.5) / ln(0.75) ≈ 2.41
    expect(halfLife).toBeCloseTo(2.41, 1);
  });
  
  it('should calculate correct reflection after N periods', () => {
    const reflection1 = calculateReflection(1, 0.25);
    expect(reflection1).toBeCloseTo(0.25, 2); // 25% reflected after 1 period
    
    const reflection3 = calculateReflection(3, 0.25);
    expect(reflection3).toBeCloseTo(0.578, 2); // ~58% reflected after 3 periods
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SMOOTHING ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Smoothing Analysis', () => {
  it('should analyze smoothing effectiveness', () => {
    const rawValues = [50, 80, 40, 90, 30, 70, 50, 85, 35, 75];
    
    const batchResult = applyBatchSmoothing({
      projectId: 'test',
      scores: rawValues.map((posRaw, i) => ({
        posRaw,
        timestamp: new Date(Date.now() + i * 60 * 60 * 1000),
      })),
    });
    
    const analysis = analyzeSmoothingResults(batchResult.results);
    
    // Should reduce volatility
    expect(analysis.volatilityReduction).toBeGreaterThan(0);
    
    // First result is cold start (reset count >= 1)
    expect(analysis.resetCount).toBeGreaterThanOrEqual(1);
    
    // Average delta should be positive
    expect(analysis.avgDelta).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateStd(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}
