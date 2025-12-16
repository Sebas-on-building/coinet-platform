/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 CALIBRATION TESTS                                                      ║
 * ║                                                                               ║
 * ║   Tests for distribution sanity, anchor priors, and golden cases             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Distribution
  calculateDistributionStats,
  analyzeScoreDistribution,
  checkDistributionHealth,
  compareDistributions,
  
  // Priors
  initializeWellKnownPriors,
  getPrior,
  setPrior,
  hasPrior,
  calculatePriorInfluence,
  applyPriorAdjustment,
  adjustScoresWithPrior,
  checkPriorDeviation,
  DEFAULT_ANCHOR_PRIOR_CONFIG,
  WELL_KNOWN_PRIORS,
  
  // Golden cases
  BITCOIN_GOLDEN_CASE,
  ETHEREUM_GOLDEN_CASE,
  SOLANA_GOLDEN_CASE,
  ALL_GOLDEN_CASES,
  validateGoldenCase,
  
  // Types
  type DistributionStats,
  type AnchorPrior,
} from '../calibration';
import type { OmniScoreSnapshot } from '../pipeline';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

function createMockSnapshot(overrides: Partial<OmniScoreSnapshot> = {}): OmniScoreSnapshot {
  return {
    identity: {
      id: 'test-asset',
      symbol: 'TEST',
      name: 'Test Asset',
      confidence: 80,
    },
    legitimacy: 'LEGIT',
    legitimacyDetails: {
      warnings: [],
      criticalIssues: [],
      allowAllocator: true,
      allowTrader: true,
      allowRanking: true,
    },
    qs: 70,
    qsTier: 'Strong',
    os: 60,
    osTier: 'Strong',
    osGated: false,
    risk: 30,
    riskTier: 'Strong',
    posRaw: 67,
    posSmoothed: 67,
    posFinal: 67,
    posTier: 'Strong',
    confidence: 75,
    confidenceLevel: 'medium',
    coverageQS: 0.8,
    coverageOS: 0.7,
    flag: 'Clean',
    status: 'scored',
    drivers: { qs: [], os: [], risk: [] },
    audit: {
      engineVersion: '3.0.0',
      methodologyId: 'M3.0',
      pipelineSteps: [],
      stepDurations: {} as any,
      dataTimestamp: new Date().toISOString(),
      calculatedAt: new Date().toISOString(),
      warnings: [],
    },
    ...overrides,
  };
}

function createMockSnapshots(count: number): OmniScoreSnapshot[] {
  const snapshots: OmniScoreSnapshot[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate varied scores following a roughly normal distribution
    const baseScore = 50 + (Math.random() - 0.5) * 40;
    const qs = Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 20));
    const os = Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 30));
    const risk = Math.max(0, Math.min(100, 50 + (Math.random() - 0.5) * 40));
    const pos = 0.50 * qs + 0.30 * os + 0.20 * (100 - risk);
    
    snapshots.push(createMockSnapshot({
      identity: {
        id: `asset-${i}`,
        symbol: `A${i}`,
        name: `Asset ${i}`,
        confidence: 80,
      },
      qs,
      os,
      risk,
      posRaw: pos,
      posSmoothed: pos,
      posFinal: pos,
      confidence: 70 + Math.random() * 20,
      coverageQS: 0.5 + Math.random() * 0.4,
      coverageOS: 0.4 + Math.random() * 0.4,
    }));
  }
  
  return snapshots;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DISTRIBUTION STATS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Calibration - Distribution Stats', () => {
  it('should calculate correct stats for simple array', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const stats = calculateDistributionStats(values);
    
    expect(stats.count).toBe(10);
    expect(stats.mean).toBe(55);
    expect(stats.median).toBe(55);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(100);
  });
  
  it('should calculate correct percentiles', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1-100
    const stats = calculateDistributionStats(values);
    
    expect(stats.percentiles.p50).toBeCloseTo(50.5, 0);
    expect(stats.percentiles.p25).toBeCloseTo(25.75, 0);
    expect(stats.percentiles.p75).toBeCloseTo(75.25, 0);
  });
  
  it('should handle empty array', () => {
    const stats = calculateDistributionStats([]);
    
    expect(stats.count).toBe(0);
    expect(stats.mean).toBe(0);
    expect(stats.median).toBe(0);
  });
  
  it('should handle single value', () => {
    const stats = calculateDistributionStats([42]);
    
    expect(stats.count).toBe(1);
    expect(stats.mean).toBe(42);
    expect(stats.median).toBe(42);
    expect(stats.stdDev).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SCORE DISTRIBUTION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Calibration - Score Distribution Analysis', () => {
  it('should analyze distribution from snapshots', () => {
    const snapshots = createMockSnapshots(100);
    const distribution = analyzeScoreDistribution(snapshots);
    
    expect(distribution.universeSize).toBe(100);
    expect(distribution.pos.count).toBeGreaterThan(0);
    expect(distribution.qs.count).toBe(100);
    expect(distribution.risk.count).toBe(100);
  });
  
  it('should count gated assets', () => {
    const snapshots = [
      createMockSnapshot({ status: 'scored', posFinal: 70 }),
      createMockSnapshot({ status: 'gated', posFinal: null }),
      createMockSnapshot({ status: 'partial', posFinal: 50 }),
    ];
    
    const distribution = analyzeScoreDistribution(snapshots);
    
    expect(distribution.gatedCount).toBe(1);
    expect(distribution.gatedPercent).toBeCloseTo(33.33, 0);
  });
  
  it('should count legitimacy labels', () => {
    const snapshots = [
      createMockSnapshot({ legitimacy: 'LEGIT' }),
      createMockSnapshot({ legitimacy: 'LEGIT' }),
      createMockSnapshot({ legitimacy: 'WATCH' }),
      createMockSnapshot({ legitimacy: 'SUSPICIOUS' }),
    ];
    
    const distribution = analyzeScoreDistribution(snapshots);
    
    expect(distribution.legitimacyCounts['LEGIT']).toBe(2);
    expect(distribution.legitimacyCounts['WATCH']).toBe(1);
    expect(distribution.legitimacyCounts['SUSPICIOUS']).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DISTRIBUTION HEALTH
// ═══════════════════════════════════════════════════════════════════════════════

describe('Calibration - Distribution Health', () => {
  it('should pass health check for healthy distribution', () => {
    // Create a well-distributed set of snapshots
    const snapshots = createMockSnapshots(100);
    const distribution = analyzeScoreDistribution(snapshots);
    const health = checkDistributionHealth(distribution);
    
    // Should have some checks
    expect(health.checks.length).toBeGreaterThan(0);
    
    // Overall should be at least warning or healthy
    expect(['healthy', 'warning']).toContain(health.overall);
  });
  
  it('should detect score compression', () => {
    // Create compressed scores (all similar)
    const snapshots = Array.from({ length: 50 }, () => 
      createMockSnapshot({
        posRaw: 50 + Math.random() * 2, // Very tight range
        posFinal: 50 + Math.random() * 2,
      })
    );
    
    const distribution = analyzeScoreDistribution(snapshots);
    const health = checkDistributionHealth(distribution);
    
    // Should detect compression warning
    const stdDevCheck = health.checks.find(c => c.metric === 'POS StdDev');
    expect(stdDevCheck).toBeDefined();
    // Low std dev should trigger warning
    expect(distribution.pos.stdDev).toBeLessThan(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DISTRIBUTION COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

describe('Calibration - Distribution Comparison', () => {
  it('should detect significant changes', () => {
    const snapshots1 = createMockSnapshots(100);
    const snapshots2 = createMockSnapshots(100);
    
    const dist1 = analyzeScoreDistribution(snapshots1);
    const dist2 = analyzeScoreDistribution(snapshots2);
    
    const deltas = compareDistributions(dist1, dist2);
    
    expect(deltas.length).toBeGreaterThan(0);
    
    // Each delta should have required fields
    for (const delta of deltas) {
      expect(delta.metric).toBeDefined();
      expect(typeof delta.previous).toBe('number');
      expect(typeof delta.current).toBe('number');
      expect(typeof delta.isSignificant).toBe('boolean');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: ANCHOR PRIORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Calibration - Anchor Priors', () => {
  beforeEach(() => {
    initializeWellKnownPriors();
  });
  
  describe('Well-known priors', () => {
    it('should have priors for major assets', () => {
      expect(hasPrior('bitcoin')).toBe(true);
      expect(hasPrior('ethereum')).toBe(true);
      expect(hasPrior('solana')).toBe(true);
    });
    
    it('should return correct prior for BTC', () => {
      const btcPrior = getPrior('bitcoin');
      
      expect(btcPrior).not.toBeNull();
      expect(btcPrior!.qsPrior).toBe(95);
      expect(btcPrior!.riskPrior).toBe(12);
    });
    
    it('should return null for unknown asset', () => {
      const unknown = getPrior('unknown-token-xyz');
      expect(unknown).toBeNull();
    });
  });
  
  describe('Prior influence calculation', () => {
    it('should return max influence at 0% coverage', () => {
      const influence = calculatePriorInfluence(0);
      expect(influence).toBe(DEFAULT_ANCHOR_PRIOR_CONFIG.maxPriorInfluence);
    });
    
    it('should return 0 influence at full coverage', () => {
      const influence = calculatePriorInfluence(1.0);
      expect(influence).toBe(0);
    });
    
    it('should decrease influence as coverage increases', () => {
      const influence20 = calculatePriorInfluence(0.2);
      const influence50 = calculatePriorInfluence(0.5);
      const influence70 = calculatePriorInfluence(0.7);
      
      expect(influence20).toBeGreaterThan(influence50);
      expect(influence50).toBeGreaterThan(influence70);
    });
    
    it('should return max influence below minimum threshold', () => {
      const influence = calculatePriorInfluence(0.1);
      expect(influence).toBe(DEFAULT_ANCHOR_PRIOR_CONFIG.maxPriorInfluence);
    });
  });
  
  describe('Prior adjustment', () => {
    it('should not adjust when coverage is high', () => {
      const result = applyPriorAdjustment(
        70,  // observed
        90,  // prior
        0.9  // high coverage
      );
      
      expect(result.wasAdjusted).toBe(false);
      expect(result.adjusted).toBe(70);
    });
    
    it('should adjust toward prior when coverage is low', () => {
      const result = applyPriorAdjustment(
        70,  // observed
        90,  // prior
        0.2  // low coverage
      );
      
      expect(result.wasAdjusted).toBe(true);
      expect(result.adjusted).toBeGreaterThan(70);
      expect(result.adjusted).toBeLessThan(90);
    });
    
    it('should be bounded between observed and prior', () => {
      const result = applyPriorAdjustment(50, 80, 0.3);
      
      expect(result.adjusted).toBeGreaterThanOrEqual(50);
      expect(result.adjusted).toBeLessThanOrEqual(80);
    });
  });
  
  describe('Full score adjustment', () => {
    it('should adjust all scores for known asset with low coverage', () => {
      const result = adjustScoresWithPrior(
        'bitcoin',
        { qs: 60, os: 40, risk: 50, pos: 55 },
        { qs: 0.3, os: 0.3 }
      );
      
      expect(result.hasPrior).toBe(true);
      expect(result.qs.wasAdjusted).toBe(true);
      expect(result.qs.adjusted).toBeGreaterThan(60); // Moves toward 95
      expect(result.risk.adjusted).toBeLessThan(50);  // Moves toward 12
    });
    
    it('should not adjust for unknown asset', () => {
      const result = adjustScoresWithPrior(
        'unknown-token',
        { qs: 60, os: 40, risk: 50, pos: 55 },
        { qs: 0.3, os: 0.3 }
      );
      
      expect(result.hasPrior).toBe(false);
      expect(result.qs.wasAdjusted).toBe(false);
    });
  });
  
  describe('Prior deviation check', () => {
    it('should not flag deviation within range', () => {
      const result = checkPriorDeviation('bitcoin', {
        qs: 92,  // Close to prior 95
        os: 68,  // Close to prior 70
        risk: 18, // Close to prior 15
        pos: 80,
      });
      
      expect(result.deviates).toBe(false);
    });
    
    it('should flag large deviation', () => {
      const result = checkPriorDeviation('bitcoin', {
        qs: 50,  // Far from prior 95
        os: 70,
        risk: 15,
        pos: 60,
      });
      
      expect(result.deviates).toBe(true);
      expect(result.deviations.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: GOLDEN CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Calibration - Golden Cases', () => {
  describe('Golden case definitions', () => {
    it('should have all required golden cases', () => {
      expect(ALL_GOLDEN_CASES.length).toBeGreaterThanOrEqual(3);
      expect(ALL_GOLDEN_CASES.map(c => c.name)).toContain('BTC-Elite');
      expect(ALL_GOLDEN_CASES.map(c => c.name)).toContain('ETH-Elite');
      expect(ALL_GOLDEN_CASES.map(c => c.name)).toContain('SOL-Strong');
    });
    
    it('should have valid BTC golden case', () => {
      const btc = BITCOIN_GOLDEN_CASE;
      
      expect(btc.input.assetId).toBe('bitcoin');
      expect(btc.expected.qs.value).toBeGreaterThan(85);
      expect(btc.expected.legitimacy).toBe('LEGIT');
    });
    
    it('should have valid ETH golden case', () => {
      const eth = ETHEREUM_GOLDEN_CASE;
      
      expect(eth.input.assetId).toBe('ethereum');
      expect(eth.expected.qs.value).toBeGreaterThan(80);
    });
    
    it('should have valid SOL golden case', () => {
      const sol = SOLANA_GOLDEN_CASE;
      
      expect(sol.input.assetId).toBe('solana');
      expect(sol.expected.qs.value).toBeGreaterThan(60);
    });
  });
  
  describe('Golden case validation', () => {
    it('should pass when actual matches expected', () => {
      // BTC expected: QS ~95, OS ~85, Risk ~12, POS ~91
      const result = validateGoldenCase(BITCOIN_GOLDEN_CASE, {
        qs: 94,
        os: 83,
        risk: 14,
        posFinal: 90,
        legitimacy: 'LEGIT',
        tier: 'Elite',
        flag: 'Clean',
      });
      
      expect(result.passed).toBe(true);
      expect(result.deviations.every(d => d.withinTolerance)).toBe(true);
    });
    
    it('should fail when actual deviates too much', () => {
      const result = validateGoldenCase(BITCOIN_GOLDEN_CASE, {
        qs: 50, // Way off from expected 92
        os: 70,
        risk: 18,
        posFinal: 60,
        legitimacy: 'LEGIT',
        tier: 'Neutral',
        flag: 'Clean',
      });
      
      expect(result.passed).toBe(false);
      
      const qsDeviation = result.deviations.find(d => d.field === 'qs');
      expect(qsDeviation?.withinTolerance).toBe(false);
    });
    
    it('should fail when legitimacy mismatches', () => {
      const result = validateGoldenCase(BITCOIN_GOLDEN_CASE, {
        qs: 92,
        os: 70,
        risk: 18,
        posFinal: 82,
        legitimacy: 'SUSPICIOUS', // Wrong
        tier: 'Elite',
        flag: 'Suspicious',
      });
      
      expect(result.passed).toBe(false);
      
      const legitDeviation = result.deviations.find(d => d.field === 'legitimacy');
      expect(legitDeviation?.withinTolerance).toBe(false);
    });
    
    it('should respect tolerance ranges', () => {
      const expected = BITCOIN_GOLDEN_CASE.expected;
      
      // Just inside tolerance - all values at edge of tolerance
      const result1 = validateGoldenCase(BITCOIN_GOLDEN_CASE, {
        qs: expected.qs.value + expected.qs.tolerance,
        os: expected.os!.value - expected.os!.tolerance,
        risk: expected.risk.value + expected.risk.tolerance,
        posFinal: expected.posFinal!.value + expected.posFinal!.tolerance,
        legitimacy: 'LEGIT',
        tier: 'Elite',
        flag: 'Clean',
      });
      
      expect(result1.passed).toBe(true);
      
      // Just outside tolerance on QS
      const result2 = validateGoldenCase(BITCOIN_GOLDEN_CASE, {
        qs: expected.qs.value + expected.qs.tolerance + 1,
        os: expected.os!.value,
        risk: expected.risk.value,
        posFinal: expected.posFinal!.value,
        legitimacy: 'LEGIT',
        tier: 'Elite',
        flag: 'Clean',
      });
      
      expect(result2.passed).toBe(false);
    });
  });
  
  describe('Gated golden cases', () => {
    const gatedCase = ALL_GOLDEN_CASES.find(c => c.name === 'LOW-QUAL-GATED');
    
    it('should have gated case defined', () => {
      expect(gatedCase).toBeDefined();
    });
    
    it('should expect null posFinal for gated case', () => {
      expect(gatedCase!.expected.posFinal).toBeNull();
      expect(gatedCase!.expected.legitimacy).toBe('INSUFFICIENT_DATA');
    });
    
    it('should pass when actual is correctly gated', () => {
      const result = validateGoldenCase(gatedCase!, {
        qs: 20,
        os: null,
        risk: 70,
        posFinal: null,
        legitimacy: 'INSUFFICIENT_DATA',
        tier: null,
        flag: 'Gated',
      });
      
      expect(result.passed).toBe(true);
    });
    
    it('should fail when actual has score but should be gated', () => {
      const result = validateGoldenCase(gatedCase!, {
        qs: 20,
        os: 50, // Should be null
        risk: 70,
        posFinal: 40, // Should be null
        legitimacy: 'LEGIT', // Wrong
        tier: 'Weak',
        flag: 'Clean', // Wrong
      });
      
      expect(result.passed).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Calibration - Invariants', () => {
  it('should maintain BTC > ETH > SOL ordering in priors', () => {
    const btcPrior = WELL_KNOWN_PRIORS['bitcoin'];
    const ethPrior = WELL_KNOWN_PRIORS['ethereum'];
    const solPrior = WELL_KNOWN_PRIORS['solana'];
    
    // BTC should have highest QS
    expect(btcPrior.qsPrior).toBeGreaterThan(ethPrior.qsPrior);
    expect(ethPrior.qsPrior).toBeGreaterThan(solPrior.qsPrior);
    
    // BTC should have lowest risk
    expect(btcPrior.riskPrior).toBeLessThan(ethPrior.riskPrior);
    expect(ethPrior.riskPrior).toBeLessThan(solPrior.riskPrior);
  });
  
  it('should maintain golden case expected ordering', () => {
    const btcExpected = BITCOIN_GOLDEN_CASE.expected;
    const ethExpected = ETHEREUM_GOLDEN_CASE.expected;
    const solExpected = SOLANA_GOLDEN_CASE.expected;
    
    // BTC should have highest POS, then ETH, then SOL
    expect(btcExpected.posFinal!.value).toBeGreaterThanOrEqual(ethExpected.posFinal!.value);
    expect(ethExpected.posFinal!.value).toBeGreaterThan(solExpected.posFinal!.value);
    
    // All three majors should be Strong or Elite (POS >= 75)
    expect(btcExpected.posFinal!.value).toBeGreaterThanOrEqual(75);
    expect(ethExpected.posFinal!.value).toBeGreaterThanOrEqual(75);
    expect(solExpected.posFinal!.value).toBeGreaterThanOrEqual(75);
  });
  
  it('should ensure prior influence is bounded [0, maxInfluence]', () => {
    for (let coverage = 0; coverage <= 1; coverage += 0.1) {
      const influence = calculatePriorInfluence(coverage);
      
      expect(influence).toBeGreaterThanOrEqual(0);
      expect(influence).toBeLessThanOrEqual(DEFAULT_ANCHOR_PRIOR_CONFIG.maxPriorInfluence);
    }
  });
  
  it('should ensure adjusted scores are bounded [0, 100]', () => {
    const testCases = [
      { observed: 0, prior: 100, coverage: 0.2 },
      { observed: 100, prior: 0, coverage: 0.2 },
      { observed: 50, prior: 50, coverage: 0.5 },
    ];
    
    for (const { observed, prior, coverage } of testCases) {
      const result = applyPriorAdjustment(observed, prior, coverage);
      
      expect(result.adjusted).toBeGreaterThanOrEqual(0);
      expect(result.adjusted).toBeLessThanOrEqual(100);
    }
  });
});
