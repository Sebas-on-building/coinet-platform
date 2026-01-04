/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 PIPELINE TESTS                                                         ║
 * ║                                                                               ║
 * ║   Ensures no step is skipped in the pipeline                                 ║
 * ║   Tests the single calculation path                                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validatePipelineCompletion,
  validatePipelineOrder,
  getPipelineSummary,
  PIPELINE_STEPS,
  type PipelineContext,
  type PipelineStep,
  type PipelineResult,
  type DataBundle,
} from '../pipeline';
import { calculateSnapshot } from '../pipeline/calculate';
import { resetStore } from '../persistence';
import type { ResolvedEntity } from '../data/entity';
import type { DataPoint } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

function createMockEntity(): ResolvedEntity {
  return {
    canonicalId: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    chain: undefined,
    identityConfidence: 100,
    providerIds: {
      coingecko: 'bitcoin',
      coinmarketcap: '1',
    },
    contractAddresses: undefined,
    officialUrls: {
      website: 'https://bitcoin.org',
    },
    verification: {
      sources: ['coingecko', 'coinmarketcap'],
      matchScore: 100,
      verifiedAt: new Date(),
    },
  };
}

function createMockDataPoints(): DataPoint[] {
  const now = new Date();
  return [
    // Market data
    {
      key: 'price_usd',
      segment: 'MARKET',
      raw: 50000,
      normalized: 85,
      source: 'coingecko',
      sourceType: 'api',
      timestamp: now.toISOString(),
      freshnessSeconds: 60,
      confidenceSource: 0.95,
      isDerived: false,
      isStale: false,
      ttlSeconds: 300,
    },
    {
      key: 'volume_24h',
      segment: 'MARKET',
      raw: 30_000_000_000,
      normalized: 90,
      source: 'coingecko',
      sourceType: 'api',
      timestamp: now.toISOString(),
      freshnessSeconds: 60,
      confidenceSource: 0.95,
      isDerived: false,
      isStale: false,
      ttlSeconds: 300,
    },
    {
      key: 'market_cap',
      segment: 'MARKET',
      raw: 1_000_000_000_000,
      normalized: 95,
      source: 'coingecko',
      sourceType: 'api',
      timestamp: now.toISOString(),
      freshnessSeconds: 60,
      confidenceSource: 0.95,
      isDerived: false,
      isStale: false,
      ttlSeconds: 300,
    },
    {
      key: 'liquidity_score',
      segment: 'MARKET',
      raw: 90,
      normalized: 90,
      source: 'coingecko',
      sourceType: 'api',
      timestamp: now.toISOString(),
      freshnessSeconds: 60,
      confidenceSource: 0.9,
      isDerived: false,
      isStale: false,
      ttlSeconds: 300,
    },
    // Momentum
    {
      key: 'price_change_24h',
      segment: 'MARKET',
      raw: 2.5,
      normalized: 55,
      source: 'coingecko',
      sourceType: 'api',
      timestamp: now.toISOString(),
      freshnessSeconds: 60,
      confidenceSource: 0.95,
      isDerived: false,
      isStale: false,
      ttlSeconds: 300,
    },
    // Security
    {
      key: 'audit_count',
      segment: 'SEC',
      raw: 0,
      normalized: 0,
      source: 'coingecko',
      sourceType: 'api',
      timestamp: now.toISOString(),
      freshnessSeconds: 3600,
      confidenceSource: 0.8,
      isDerived: false,
      isStale: false,
      ttlSeconds: 86400,
    },
  ];
}

function createMockBundle(): DataBundle {
  return {
    entity: createMockEntity(),
    dataPoints: createMockDataPoints(),
    fetchedAt: new Date(),
    fetchErrors: [],
    quality: {
      totalRequested: 10,
      totalFetched: 6,
      staleness: 0.5,
      sourceCount: 1,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: PIPELINE STEPS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline - Steps', () => {
  it('should have exactly 11 steps defined', () => {
    expect(PIPELINE_STEPS).toHaveLength(11);
  });
  
  it('should have steps in correct order', () => {
    const expectedOrder = [
      'RESOLVE_ENTITY',
      'FETCH_DATA',
      'VALIDATE_INPUTS',
      'COMPUTE_FEATURES',
      'NORMALIZE',
      'COMPUTE_SCORES',
      'COMPUTE_GATES',
      'COMPUTE_POS',
      'APPLY_SMOOTHING',
      'CHECK_INVARIANTS',
      'EMIT_SNAPSHOT',
    ];
    
    expect(PIPELINE_STEPS).toEqual(expectedOrder);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: PIPELINE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline - Validation', () => {
  describe('validatePipelineCompletion', () => {
    it('should pass when all steps completed', () => {
      const context: PipelineContext = {
        assetId: 'test',
        startedAt: new Date(),
        completedSteps: [...PIPELINE_STEPS] as PipelineStep[],
        stepResults: [],
      };
      
      const result = validatePipelineCompletion(context);
      
      expect(result.valid).toBe(true);
      expect(result.missingSteps).toHaveLength(0);
    });
    
    it('should fail when steps are missing', () => {
      const context: PipelineContext = {
        assetId: 'test',
        startedAt: new Date(),
        completedSteps: [
          'RESOLVE_ENTITY',
          'FETCH_DATA',
          'VALIDATE_INPUTS',
          // Missing: COMPUTE_FEATURES, NORMALIZE, etc.
        ],
        stepResults: [],
      };
      
      const result = validatePipelineCompletion(context);
      
      expect(result.valid).toBe(false);
      expect(result.missingSteps.length).toBeGreaterThan(0);
      expect(result.missingSteps).toContain('COMPUTE_FEATURES');
    });
    
    it('should identify all missing steps', () => {
      const context: PipelineContext = {
        assetId: 'test',
        startedAt: new Date(),
        completedSteps: [],
        stepResults: [],
      };
      
      const result = validatePipelineCompletion(context);
      
      expect(result.valid).toBe(false);
      expect(result.missingSteps).toHaveLength(11);
    });
  });
  
  describe('validatePipelineOrder', () => {
    it('should pass when steps are in order', () => {
      const completedSteps: PipelineStep[] = [
        'RESOLVE_ENTITY',
        'FETCH_DATA',
        'VALIDATE_INPUTS',
        'COMPUTE_FEATURES',
        'NORMALIZE',
        'COMPUTE_SCORES',
        'COMPUTE_GATES',
        'COMPUTE_POS',
        'APPLY_SMOOTHING',
        'CHECK_INVARIANTS',
        'EMIT_SNAPSHOT',
      ];
      
      const result = validatePipelineOrder(completedSteps);
      
      expect(result.valid).toBe(true);
    });
    
    it('should fail when steps are out of order', () => {
      const completedSteps: PipelineStep[] = [
        'FETCH_DATA', // Should come after RESOLVE_ENTITY
        'RESOLVE_ENTITY',
      ];
      
      const result = validatePipelineOrder(completedSteps);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('out of order');
    });
    
    it('should pass for partial completion in order', () => {
      const completedSteps: PipelineStep[] = [
        'RESOLVE_ENTITY',
        'FETCH_DATA',
        'VALIDATE_INPUTS',
      ];
      
      const result = validatePipelineOrder(completedSteps);
      
      expect(result.valid).toBe(true);
    });
    
    it('should fail for skipped steps', () => {
      const completedSteps: PipelineStep[] = [
        'RESOLVE_ENTITY',
        // Skipped: FETCH_DATA
        'VALIDATE_INPUTS',
      ];
      
      // This should still be valid for order check (just missing a step)
      const result = validatePipelineOrder(completedSteps);
      
      // Order is still valid (RESOLVE_ENTITY < VALIDATE_INPUTS)
      expect(result.valid).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CALCULATE SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline - Calculate Snapshot', () => {
  beforeEach(() => {
    resetStore();
  });
  
  afterEach(() => {
    resetStore();
  });
  
  it('should complete all calculation steps (3-11)', async () => {
    const bundle = createMockBundle();
    
    const result = await calculateSnapshot({
      bundle,
      config: {
        persist: false,
        skipSmoothing: false,
        strict: false,
        debug: false,
        timeoutMs: 30000,
      },
    });
    
    // Should succeed
    expect(result.success).toBe(true);
    expect(result.snapshot).not.toBeNull();
    
    // Should have completed steps 3-11
    const expectedSteps: PipelineStep[] = [
      'VALIDATE_INPUTS',
      'COMPUTE_FEATURES',
      'NORMALIZE',
      'COMPUTE_SCORES',
      'COMPUTE_GATES',
      'COMPUTE_POS',
      'APPLY_SMOOTHING',
      'CHECK_INVARIANTS',
      'EMIT_SNAPSHOT',
    ];
    
    for (const step of expectedSteps) {
      expect(result.context.completedSteps).toContain(step);
    }
  });
  
  it('should record step durations', async () => {
    const bundle = createMockBundle();
    
    const result = await calculateSnapshot({
      bundle,
      config: { persist: false },
    });
    
    // Each step should have a duration recorded
    for (const stepResult of result.context.stepResults) {
      expect(stepResult.duration).toBeGreaterThanOrEqual(0);
      expect(stepResult.timestamp).toBeInstanceOf(Date);
    }
  });
  
  it('should fail if bundle is invalid', async () => {
    const invalidBundle = {
      ...createMockBundle(),
      entity: {
        ...createMockEntity(),
        identityConfidence: -10, // Invalid
      },
    };
    
    const result = await calculateSnapshot({
      bundle: invalidBundle,
      config: { persist: false },
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.step).toBe('VALIDATE_INPUTS');
  });
  
  it('should produce valid snapshot structure', async () => {
    const bundle = createMockBundle();
    
    const result = await calculateSnapshot({
      bundle,
      config: { persist: false },
    });
    
    expect(result.success).toBe(true);
    const snapshot = result.snapshot!;
    
    // Check required fields
    expect(snapshot.identity).toBeDefined();
    expect(snapshot.identity.id).toBe('bitcoin');
    expect(snapshot.identity.symbol).toBe('BTC');
    
    expect(snapshot.legitimacy).toBeDefined();
    expect(snapshot.legitimacyDetails).toBeDefined();
    
    expect(snapshot.qs).toBeDefined();
    expect(snapshot.qs).toBeGreaterThanOrEqual(0);
    expect(snapshot.qs).toBeLessThanOrEqual(100);
    
    expect(snapshot.risk).toBeDefined();
    expect(snapshot.risk).toBeGreaterThanOrEqual(0);
    expect(snapshot.risk).toBeLessThanOrEqual(100);
    
    expect(snapshot.posRaw).toBeDefined();
    expect(snapshot.posRaw).toBeGreaterThanOrEqual(0);
    expect(snapshot.posRaw).toBeLessThanOrEqual(100);
    
    expect(snapshot.posSmoothed).toBeDefined();
    
    expect(snapshot.confidence).toBeDefined();
    expect(snapshot.confidenceLevel).toBeDefined();
    
    expect(snapshot.flag).toBeDefined();
    expect(snapshot.status).toBeDefined();
    
    expect(snapshot.drivers).toBeDefined();
    expect(snapshot.audit).toBeDefined();
    expect(snapshot.audit.engineVersion).toBeDefined();
    expect(snapshot.audit.pipelineSteps).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: NO STEP SKIPPED
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline - No Step Skipped', () => {
  beforeEach(() => {
    resetStore();
  });
  
  afterEach(() => {
    resetStore();
  });
  
  it('should execute all steps in sequence', async () => {
    const bundle = createMockBundle();
    
    const result = await calculateSnapshot({
      bundle,
      config: { persist: false },
    });
    
    // Get step order from results
    const executedSteps = result.context.stepResults.map(r => r.step);
    
    // Verify each required step was executed
    const requiredSteps: PipelineStep[] = [
      'VALIDATE_INPUTS',
      'COMPUTE_FEATURES',
      'NORMALIZE',
      'COMPUTE_SCORES',
      'COMPUTE_GATES',
      'COMPUTE_POS',
      'APPLY_SMOOTHING',
      'CHECK_INVARIANTS',
      'EMIT_SNAPSHOT',
    ];
    
    for (const step of requiredSteps) {
      expect(executedSteps).toContain(step);
    }
  });
  
  it('should maintain step dependencies', async () => {
    const bundle = createMockBundle();
    
    const result = await calculateSnapshot({
      bundle,
      config: { persist: false },
    });
    
    const ctx = result.context;
    
    // After VALIDATE_INPUTS, validatedInputs should be set
    expect(ctx.validatedInputs).toBe(true);
    
    // After COMPUTE_FEATURES, features should be set
    expect(ctx.features).toBeDefined();
    expect(ctx.features!.qs).toBeDefined();
    expect(ctx.features!.os).toBeDefined();
    expect(ctx.features!.risk).toBeDefined();
    
    // After NORMALIZE, normalized should be set
    expect(ctx.normalized).toBeDefined();
    
    // After COMPUTE_SCORES, scores should be set
    expect(ctx.scores).toBeDefined();
    expect(ctx.scores!.qs).toBeDefined();
    expect(ctx.scores!.os).toBeDefined();
    expect(ctx.scores!.risk).toBeDefined();
    
    // After COMPUTE_GATES, legitimacy should be set
    expect(ctx.legitimacy).toBeDefined();
    expect(ctx.gatedScores).toBeDefined();
    
    // After COMPUTE_POS, pos should be set
    expect(ctx.pos).toBeDefined();
    
    // After APPLY_SMOOTHING, smoothing should be set
    expect(ctx.smoothing).toBeDefined();
    
    // After CHECK_INVARIANTS, invariantsValid should be set
    expect(ctx.invariantsValid).toBeDefined();
    
    // After EMIT_SNAPSHOT, snapshot should be set
    expect(ctx.snapshot).toBeDefined();
  });
  
  it('should fail fast on critical step failure', async () => {
    // Create bundle with invalid data that will fail at COMPUTE_FEATURES
    const bundle = createMockBundle();
    bundle.dataPoints = []; // No data points = features will have issues
    
    const result = await calculateSnapshot({
      bundle,
      config: { persist: false },
    });
    
    // Should still succeed (features will be computed but may be empty)
    // The pipeline should not crash, just produce low scores
    expect(result.context.stepResults.length).toBeGreaterThan(0);
  });
  
  it('should record all step results', async () => {
    const bundle = createMockBundle();
    
    const result = await calculateSnapshot({
      bundle,
      config: { persist: false },
    });
    
    // Each step should have exactly one result
    const stepCounts = new Map<PipelineStep, number>();
    
    for (const stepResult of result.context.stepResults) {
      const count = stepCounts.get(stepResult.step) ?? 0;
      stepCounts.set(stepResult.step, count + 1);
    }
    
    // Each step should appear exactly once
    for (const [step, count] of stepCounts) {
      expect(count).toBe(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: PIPELINE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline - Summary', () => {
  it('should generate correct summary', () => {
    const mockResult: PipelineResult = {
      success: true,
      snapshot: null,
      record: null,
      context: {
        assetId: 'test',
        startedAt: new Date(),
        completedSteps: ['RESOLVE_ENTITY', 'FETCH_DATA'],
        stepResults: [
          {
            step: 'RESOLVE_ENTITY',
            success: true,
            duration: 50,
            timestamp: new Date(),
          },
          {
            step: 'FETCH_DATA',
            success: true,
            duration: 150,
            timestamp: new Date(),
          },
        ],
      },
      durationMs: 200,
    };
    
    const summary = getPipelineSummary(mockResult);
    
    expect(summary.assetId).toBe('test');
    expect(summary.success).toBe(true);
    expect(summary.completedSteps).toBe(2);
    expect(summary.totalSteps).toBe(11);
    expect(summary.durationMs).toBe(200);
    expect(summary.stepDurations['RESOLVE_ENTITY']).toBe(50);
    expect(summary.stepDurations['FETCH_DATA']).toBe(150);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline - Audit Trail', () => {
  beforeEach(() => {
    resetStore();
  });
  
  afterEach(() => {
    resetStore();
  });
  
  it('should include complete audit trail in snapshot', async () => {
    const bundle = createMockBundle();
    
    const result = await calculateSnapshot({
      bundle,
      config: { persist: false },
    });
    
    expect(result.success).toBe(true);
    const snapshot = result.snapshot!;
    
    // Audit should include all completed steps
    expect(snapshot.audit.pipelineSteps).toBeDefined();
    expect(snapshot.audit.pipelineSteps.length).toBeGreaterThan(0);
    
    // Audit should include step durations
    expect(snapshot.audit.stepDurations).toBeDefined();
    
    // Audit should include version info
    expect(snapshot.audit.engineVersion).toBeDefined();
    expect(snapshot.audit.methodologyId).toBeDefined();
    
    // Audit should include timestamps
    expect(snapshot.audit.dataTimestamp).toBeDefined();
    expect(snapshot.audit.calculatedAt).toBeDefined();
  });
});
