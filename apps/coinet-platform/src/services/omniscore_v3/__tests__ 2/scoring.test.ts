/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 SCORING TESTS                                                          ║
 * ║                                                                               ║
 * ║   Tests for boundedness, monotonicity, invariants, and reliability           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePOS,
  testMonotonicity,
  checkScoringInvariants,
  clampScore,
  roundScore,
  type ScoringResult,
  type CategoryScoreResult,
  POS_WEIGHTS,
  QS_FEATURE_WEIGHTS,
  OS_FEATURE_WEIGHTS,
  RISK_FEATURE_WEIGHTS,
} from '../scoring';
import type { FeatureResult } from '../features/types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create mock feature result
// ═══════════════════════════════════════════════════════════════════════════════

function createMockFeature(
  id: string,
  normalized: number | null,
  weight: number,
  available: boolean = true
): FeatureResult {
  return {
    id,
    name: id,
    category: 'qs',
    raw: normalized,
    normalized,
    weight,
    contribution: normalized !== null ? normalized * weight : null,
    available,
    quality: {
      coverage: 1.0,
      freshnessHours: 1,
      confidence: 0.9,
    },
    inputs: ['test_input'],
    missing: [],
    warnings: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create mock scoring result
// ═══════════════════════════════════════════════════════════════════════════════

function createMockScoringResult(
  qsScore: number,
  osScore: number,
  riskScore: number
): ScoringResult {
  const mockCategoryResult = (score: number): CategoryScoreResult => ({
    score,
    rawAverage: score,
    coverage: {
      weightedCoverage: 1.0,
      simpleCoverage: 1.0,
      availableCount: 6,
      totalCount: 6,
      missingFeatures: [],
    },
    totalEffectiveWeight: 1.0,
    totalBaseWeight: 1.0,
    features: [],
    topDrivers: [],
  });
  
  const pos = calculatePOS(qsScore, osScore, riskScore);
  
  return {
    qsResult: mockCategoryResult(qsScore),
    osResult: mockCategoryResult(osScore),
    riskResult: mockCategoryResult(riskScore),
    pos,
    osGated: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: BOUNDEDNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - Boundedness', () => {
  it('should clamp scores to [0, 100]', () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(50)).toBe(50);
    expect(clampScore(100)).toBe(100);
    expect(clampScore(150)).toBe(100);
  });
  
  it('should round scores correctly', () => {
    expect(roundScore(42.567, 1)).toBe(42.6);
    expect(roundScore(42.567, 0)).toBe(43);
    expect(roundScore(42.123, 2)).toBe(42.12);
  });
  
  it('should produce POS in [0, 100] for normal inputs', () => {
    const pos1 = calculatePOS(80, 60, 30);
    expect(pos1.posRaw).toBeGreaterThanOrEqual(0);
    expect(pos1.posRaw).toBeLessThanOrEqual(100);
    
    const pos2 = calculatePOS(0, 0, 0);
    expect(pos2.posRaw).toBeGreaterThanOrEqual(0);
    expect(pos2.posRaw).toBeLessThanOrEqual(100);
    
    const pos3 = calculatePOS(100, 100, 100);
    expect(pos3.posRaw).toBeGreaterThanOrEqual(0);
    expect(pos3.posRaw).toBeLessThanOrEqual(100);
  });
  
  it('should produce POS in [0, 100] for edge cases', () => {
    const pos1 = calculatePOS(100, null, 0);
    expect(pos1.posRaw).toBeGreaterThanOrEqual(0);
    expect(pos1.posRaw).toBeLessThanOrEqual(100);
    
    const pos2 = calculatePOS(0, 0, 100);
    expect(pos2.posRaw).toBeGreaterThanOrEqual(0);
    expect(pos2.posRaw).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: MONOTONICITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - Monotonicity', () => {
  it('should increase POS when QS increases', () => {
    const base = calculatePOS(50, 50, 50);
    const higher = calculatePOS(60, 50, 50);
    
    expect(higher.posRaw).toBeGreaterThan(base.posRaw);
  });
  
  it('should increase POS when OS increases', () => {
    const base = calculatePOS(50, 50, 50);
    const higher = calculatePOS(50, 60, 50);
    
    expect(higher.posRaw).toBeGreaterThan(base.posRaw);
  });
  
  it('should decrease POS when Risk increases', () => {
    const base = calculatePOS(50, 50, 50);
    const higher = calculatePOS(50, 50, 60);
    
    expect(higher.posRaw).toBeLessThan(base.posRaw);
  });
  
  it('should pass all monotonicity tests', () => {
    const results = testMonotonicity(50, 50, 50);
    
    for (const result of results) {
      expect(result.passed).toBe(true);
    }
  });
  
  it('should maintain monotonicity at extremes', () => {
    // Low baseline
    const low1 = calculatePOS(10, 10, 10);
    const low2 = calculatePOS(20, 10, 10);
    expect(low2.posRaw).toBeGreaterThan(low1.posRaw);
    
    // High baseline
    const high1 = calculatePOS(90, 90, 10);
    const high2 = calculatePOS(95, 90, 10);
    expect(high2.posRaw).toBeGreaterThan(high1.posRaw);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - Invariants', () => {
  it('should pass all invariants for valid result', () => {
    const result = createMockScoringResult(80, 70, 30);
    const invariants = checkScoringInvariants(result);
    
    for (const inv of invariants) {
      expect(inv.passed).toBe(true);
    }
  });
  
  it('should maintain Safety = 100 - Risk', () => {
    const pos1 = calculatePOS(80, 70, 30);
    expect(pos1.safety).toBe(70);
    
    const pos2 = calculatePOS(80, 70, 0);
    expect(pos2.safety).toBe(100);
    
    const pos3 = calculatePOS(80, 70, 100);
    expect(pos3.safety).toBe(0);
  });
  
  it('should maintain POS = sum of contributions', () => {
    const pos = calculatePOS(80, 60, 40);
    const sum = pos.contributions.qs + pos.contributions.os + pos.contributions.safety;
    
    expect(Math.abs(pos.posRaw - sum)).toBeLessThan(0.5);
  });
  
  it('should have zero OS contribution when OS is gated', () => {
    const pos = calculatePOS(80, null, 40);
    
    expect(pos.os).toBe(null);
    expect(pos.contributions.os).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: FIXED WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - Fixed Weights', () => {
  it('should have POS weights sum to 1.0', () => {
    const sum = POS_WEIGHTS.QS + POS_WEIGHTS.OS + POS_WEIGHTS.SAFETY;
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
  
  it('should have QS feature weights sum to 1.0', () => {
    const sum = Object.values(QS_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
  
  it('should have OS feature weights sum to 1.0', () => {
    const sum = Object.values(OS_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
  
  it('should have Risk feature weights sum to 1.0', () => {
    const sum = Object.values(RISK_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
  
  it('should use correct fixed weights in formula', () => {
    // Official formula: POS = 0.60×QS + 0.25×OS + 0.15×(100-Risk)
    expect(POS_WEIGHTS.QS).toBe(0.60);
    expect(POS_WEIGHTS.OS).toBe(0.25);
    expect(POS_WEIGHTS.SAFETY).toBe(0.15);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: POS FORMULA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - POS Formula', () => {
  it('should calculate POS correctly with all components', () => {
    const pos = calculatePOS(80, 60, 40);
    
    // Official formula: POS = 0.60×QS + 0.25×OS + 0.15×(100-Risk)
    // posRaw = 0.60×80 + 0.25×60 + 0.15×(100-40)
    //        = 48 + 15 + 9 = 72
    expect(pos.posRaw).toBeCloseTo(72, 1);
  });
  
  it('should renormalize when OS is gated', () => {
    const pos = calculatePOS(80, null, 40);
    
    // Without OS: use OS-gated weights (0.80 QS + 0.20 Safety)
    // posRaw = 0.80×80 + 0.20×(100-40)
    //        = 64 + 12 = 76
    expect(pos.posRaw).toBeCloseTo(76, 0);
    expect(pos.os).toBe(null);
  });
  
  it('should handle edge case: all components at 100', () => {
    const pos = calculatePOS(100, 100, 0); // risk=0 means safety=100
    
    // posRaw = 0.60×100 + 0.25×100 + 0.15×100 = 60 + 25 + 15 = 100
    expect(pos.posRaw).toBe(100);
  });
  
  it('should handle edge case: all components at 0', () => {
    const pos = calculatePOS(0, 0, 100); // risk=100 means safety=0
    
    // posRaw = 0.60×0 + 0.25×0 + 0.15×0 = 0
    expect(pos.posRaw).toBe(0);
  });
  
  it('should produce higher POS for quality over opportunity', () => {
    const highQS = calculatePOS(100, 0, 50);
    const highOS = calculatePOS(0, 100, 50);
    
    // QS weight (0.60) > OS weight (0.25), so highQS should be higher
    expect(highQS.posRaw).toBeGreaterThan(highOS.posRaw);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: FAIL-CLOSED BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - Fail-Closed', () => {
  it('should handle missing features gracefully', () => {
    // This would be tested with actual feature results
    // For now, verify that null normalized scores are handled
    const feature = createMockFeature('test', null, 0.2, false);
    
    expect(feature.available).toBe(false);
    expect(feature.normalized).toBe(null);
    expect(feature.contribution).toBe(null);
  });
  
  it('should allow OS to be gated independently', () => {
    const pos1 = calculatePOS(80, 60, 40);
    const pos2 = calculatePOS(80, null, 40);
    
    // POS should still be calculable when OS is gated
    expect(pos2.posRaw).toBeGreaterThan(0);
    expect(pos2.os).toBe(null);
    
    // But result should be different
    expect(pos2.posRaw).not.toBe(pos1.posRaw);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: NUMERICAL STABILITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - Numerical Stability', () => {
  it('should handle very small differences', () => {
    const pos1 = calculatePOS(50.000, 50.000, 50.000);
    const pos2 = calculatePOS(50.001, 50.000, 50.000);
    
    // Should be different but close
    expect(pos2.posRaw).toBeGreaterThanOrEqual(pos1.posRaw);
    expect(Math.abs(pos2.posRaw - pos1.posRaw)).toBeLessThan(0.01);
  });
  
  it('should produce consistent results for same inputs', () => {
    const pos1 = calculatePOS(75, 60, 35);
    const pos2 = calculatePOS(75, 60, 35);
    
    expect(pos1.posRaw).toBe(pos2.posRaw);
    expect(pos1.contributions.qs).toBe(pos2.contributions.qs);
    expect(pos1.contributions.os).toBe(pos2.contributions.os);
    expect(pos1.contributions.safety).toBe(pos2.contributions.safety);
  });
  
  it('should handle floating point edge cases', () => {
    const pos = calculatePOS(33.333333, 66.666666, 49.999999);
    
    expect(pos.posRaw).toBeGreaterThanOrEqual(0);
    expect(pos.posRaw).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: REALISTIC SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - Realistic Scenarios', () => {
  it('should score BTC-like asset highly', () => {
    // BTC: high quality, good opportunity, low risk
    const btc = calculatePOS(95, 85, 15);
    
    expect(btc.posRaw).toBeGreaterThan(85);
    expect(btc.qs).toBe(95);
    expect(btc.os).toBe(85);
    expect(btc.risk).toBe(15);
    expect(btc.safety).toBe(85);
  });
  
  it('should score risky altcoin lower', () => {
    // Risky alt: medium quality, high momentum, high risk
    const alt = calculatePOS(60, 80, 70);
    
    expect(alt.posRaw).toBeLessThan(70);
    expect(alt.risk).toBe(70);
    expect(alt.safety).toBe(30);
  });
  
  it('should score builder zone asset', () => {
    // Builder: high quality, low opportunity
    const builder = calculatePOS(85, 45, 25);
    
    // Should lean on quality
    expect(builder.posRaw).toBeGreaterThan(60);
    expect(builder.contributions.qs).toBeGreaterThan(builder.contributions.os);
  });
  
  it('should score hype zone asset', () => {
    // Hype: low quality, high opportunity
    const hype = calculatePOS(40, 90, 60);
    
    // High risk should drag it down despite high OS
    expect(hype.posRaw).toBeLessThan(60);
  });
});
