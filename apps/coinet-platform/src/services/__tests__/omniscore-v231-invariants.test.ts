/**
 * OmniScore v2.3.1 Production Invariant Tests
 * 
 * Trading-desk grade test suite covering:
 * - Property-based tests for all invariants
 * - Golden-case snapshots
 * - Plugin-pack validation harness
 * - INV-11 confidence determinism
 */

import {
  clamp01,
  clampScore100,
  clampScore100WithTracking,
  clampGamma,
  normalizeProbs,
  normalizeWeights,
  assertFeatureIsolation,
  assertTimestampSanity,
  assertConfidenceDeterminism,
  coverageToConfidence,
  validateInvariants,
  hasErrorViolations,
  calculateReflexivitySentinel,
  applyAdversarialAdjustments,
  calculateOmniScoreProduction,
  OMNISCORE_CONFIG,
  type RegimeType,
  type FeatureInput,
  type ScoreState,
  type Segment,
  type ConfidenceLevel,
} from '../omniscore-v2.3';

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS: INV-1 (Quality Bounds)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-1: Quality Bounds (0 ≤ Q_i ≤ 1)', () => {
  it('should clamp values below 0 to 0', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-1000)).toBe(0);
    expect(clamp01(-Infinity)).toBe(0);
  });

  it('should clamp values above 1 to 1', () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(1000)).toBe(1);
    expect(clamp01(Infinity)).toBe(0); // Inf -> 0 due to isFinite check
  });

  it('should preserve valid values in range [0, 1]', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(0.123456)).toBe(0.123456);
  });

  it('should handle NaN by returning 0', () => {
    expect(clamp01(NaN)).toBe(0);
  });

  // Property-based: random values
  it('should always return value in [0, 1] for any input', () => {
    const randomValues = Array.from({ length: 100 }, () => 
      (Math.random() - 0.5) * 10000
    );
    randomValues.forEach(v => {
      const result = clamp01(v);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS: INV-4a/4b (Score Bounds with Tracking)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-4a/4b: Score Bounds (0 ≤ score ≤ 100)', () => {
  describe('clampScore100WithTracking', () => {
    it('should track clamping when value exceeds bounds', () => {
      const above = clampScore100WithTracking(150);
      expect(above.value).toBe(100);
      expect(above.clamped).toBe(true);
      expect(above.isHardFailure).toBe(false);

      const below = clampScore100WithTracking(-50);
      expect(below.value).toBe(0);
      expect(below.clamped).toBe(true);
      expect(below.isHardFailure).toBe(false);
    });

    it('should not flag clamping for valid values', () => {
      const valid = clampScore100WithTracking(75);
      expect(valid.value).toBe(75);
      expect(valid.clamped).toBe(false);
      expect(valid.isHardFailure).toBe(false);
    });

    it('should flag INV-4b hard failure for NaN/Inf', () => {
      const nan = clampScore100WithTracking(NaN);
      expect(nan.value).toBe(0);
      expect(nan.clamped).toBe(true);
      expect(nan.isHardFailure).toBe(true);

      const inf = clampScore100WithTracking(Infinity);
      expect(inf.value).toBe(0);
      expect(inf.clamped).toBe(true);
      expect(inf.isHardFailure).toBe(true);

      const negInf = clampScore100WithTracking(-Infinity);
      expect(negInf.value).toBe(0);
      expect(negInf.clamped).toBe(true);
      expect(negInf.isHardFailure).toBe(true);
    });
  });

  // Property-based: random scores
  it('should always return value in [0, 100] for any input', () => {
    const randomValues = Array.from({ length: 100 }, () => 
      (Math.random() - 0.5) * 1000
    );
    randomValues.forEach(v => {
      const result = clampScore100(v);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS: INV-3 (Probability Hygiene)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-3: Probability Hygiene (Σ p_r = 1)', () => {
  it('should normalize probabilities to sum to 1', () => {
    const unnormalized: Record<RegimeType, number> = {
      bull: 0.3,
      bear: 0.2,
      neutral: 0.5,
      crisis: 0.1,
      recovery: 0.1,
    };
    const normalized = normalizeProbs(unnormalized);
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
  });

  it('should handle all zeros by defaulting to neutral', () => {
    const zeros: Record<RegimeType, number> = {
      bull: 0,
      bear: 0,
      neutral: 0,
      crisis: 0,
      recovery: 0,
    };
    const normalized = normalizeProbs(zeros);
    expect(normalized.neutral).toBe(1);
    expect(normalized.bull).toBe(0);
  });

  it('should handle negative values by treating as zero', () => {
    const negative: Record<RegimeType, number> = {
      bull: -0.5,
      bear: 0.5,
      neutral: 0.5,
      crisis: 0,
      recovery: 0,
    };
    const normalized = normalizeProbs(negative);
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
    expect(normalized.bull).toBe(0);
  });

  // Property-based: random probabilities
  it('should always produce normalized output for any input', () => {
    for (let i = 0; i < 50; i++) {
      const random: Record<RegimeType, number> = {
        bull: Math.random() * 10 - 5,
        bear: Math.random() * 10 - 5,
        neutral: Math.random() * 10 - 5,
        crisis: Math.random() * 10 - 5,
        recovery: Math.random() * 10 - 5,
      };
      const normalized = normalizeProbs(random);
      const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS: INV-7 (Weight Sanity)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-7: Weight Sanity (ω_k ∈ [0,1], Σ ω_k = 1)', () => {
  it('should normalize weights to sum to 1', () => {
    const weights = { ω_F: 0.45, ω_O: 0.40, ω_R: 0.15 };
    const normalized = normalizeWeights(weights);
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
  });

  it('should handle all zero weights with safe defaults', () => {
    const zeros = { ω_F: 0, ω_O: 0, ω_R: 0 };
    const normalized = normalizeWeights(zeros);
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
  });

  it('should ensure all weights are in [0, 1]', () => {
    const weights = { ω_F: 10, ω_O: 20, ω_R: 30 };
    const normalized = normalizeWeights(weights);
    Object.values(normalized).forEach(w => {
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS: INV-8 (Gamma Safety)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-8: Gamma Safety (γ ≥ 0)', () => {
  it('should clamp negative gamma to 0', () => {
    expect(clampGamma(-5)).toBe(0);
    expect(clampGamma(-Infinity)).toBe(0);
  });

  it('should preserve non-negative gamma', () => {
    expect(clampGamma(0)).toBe(0);
    expect(clampGamma(15)).toBe(15);
    expect(clampGamma(100)).toBe(100);
  });

  it('should handle NaN/Inf', () => {
    expect(clampGamma(NaN)).toBe(0);
    expect(clampGamma(Infinity)).toBe(0); // isFinite check
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS: INV-9 (Feature Isolation)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-9: Feature Isolation (QS ∩ OS = ∅)', () => {
  const makeFeature = (key: string, segment: Segment): FeatureInput => ({
    key,
    segment,
    raw: 50,
    timestamp: new Date().toISOString(),
  });

  it('should pass for properly isolated features', () => {
    const qsInputs = [
      makeFeature('team_exp', 'TEAM'),
      makeFeature('tech_tps', 'TECH'),
    ];
    const osInputs = [
      makeFeature('market_vol', 'MARKET'),
      makeFeature('comm_growth', 'COMM'),
    ];
    const violations = assertFeatureIsolation(qsInputs, osInputs);
    expect(violations.length).toBe(0);
  });

  it('should flag QS contamination by OS segments', () => {
    const qsInputs = [
      makeFeature('team_exp', 'TEAM'),
      makeFeature('market_vol', 'MARKET'), // OS segment in QS!
    ];
    const osInputs = [makeFeature('comm_growth', 'COMM')];
    const violations = assertFeatureIsolation(qsInputs, osInputs);
    expect(violations.length).toBe(1);
    expect(violations[0].code).toBe('INV-9');
    expect(violations[0].severity).toBe('ERROR');
  });

  it('should flag OS contamination by QS segments', () => {
    const qsInputs = [makeFeature('team_exp', 'TEAM')];
    const osInputs = [
      makeFeature('comm_growth', 'COMM'),
      makeFeature('tech_tps', 'TECH'), // QS segment in OS!
    ];
    const violations = assertFeatureIsolation(qsInputs, osInputs);
    expect(violations.length).toBe(1);
    expect(violations[0].code).toBe('INV-9');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS: INV-10 (Timestamp Sanity)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-10: Timestamp Sanity', () => {
  const now = new Date().toISOString();
  
  const makeFeature = (segment: Segment, daysAgo: number): FeatureInput => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      key: `test_${segment}`,
      segment,
      raw: 50,
      timestamp: date.toISOString(),
    };
  };

  it('should flag future-dated features as ERROR', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const inputs: FeatureInput[] = [{
      key: 'future_feature',
      segment: 'TEAM',
      raw: 50,
      timestamp: futureDate.toISOString(),
    }];
    const violations = assertTimestampSanity(inputs, now);
    expect(violations.some(v => v.code === 'INV-10' && v.severity === 'ERROR')).toBe(true);
  });

  it('should flag stale MARKET features (>2 days) as WARN', () => {
    const inputs = [makeFeature('MARKET', 5)]; // 5 days old
    const violations = assertTimestampSanity(inputs, now);
    expect(violations.some(v => v.code === 'INV-10' && v.severity === 'WARN')).toBe(true);
  });

  it('should pass for fresh features within segment limits', () => {
    const inputs = [
      makeFeature('TEAM', 30), // TEAM allows 180 days
      makeFeature('MARKET', 1), // MARKET allows 2 days
    ];
    const violations = assertTimestampSanity(inputs, now);
    expect(violations.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TESTS: INV-11 (Confidence Determinism)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-11: Confidence Determinism', () => {
  it('should map coverage to confidence deterministically', () => {
    expect(coverageToConfidence(0.85)).toBe('high');
    expect(coverageToConfidence(0.75)).toBe('medium');
    expect(coverageToConfidence(0.50)).toBe('low');
    expect(coverageToConfidence(0.20)).toBe('insufficient');
  });

  it('should detect confidence mismatch', () => {
    const violation = assertConfidenceDeterminism(0.85, 'low'); // Should be 'high'
    expect(violation).not.toBeNull();
    expect(violation!.code).toBe('INV-11');
    expect(violation!.severity).toBe('ERROR');
  });

  it('should pass for correct confidence mapping', () => {
    const violation = assertConfidenceDeterminism(0.85, 'high');
    expect(violation).toBeNull();
  });

  // Property-based: all coverage values map consistently
  it('should be idempotent for any coverage value', () => {
    for (let i = 0; i <= 100; i++) {
      const coverage = i / 100;
      const confidence1 = coverageToConfidence(coverage);
      const confidence2 = coverageToConfidence(coverage);
      expect(confidence1).toBe(confidence2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REFLEXIVITY SENTINEL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Reflexivity Sentinel', () => {
  it('should return healthy for no price data', () => {
    const sentinel = calculateReflexivitySentinel(70, undefined);
    expect(sentinel.status).toBe('healthy');
    expect(sentinel.corrQsPrice30d).toBe(0);
  });

  it('should detect warning level correlation', () => {
    const sentinel = calculateReflexivitySentinel(80, 40); // High QS + positive price
    expect(['warning', 'alert']).toContain(sentinel.status);
  });

  it('should return healthy for uncorrelated signals', () => {
    const sentinel = calculateReflexivitySentinel(50, 0); // Neutral QS + flat price
    expect(sentinel.status).toBe('healthy');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADVERSARIAL RESISTANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Adversarial Resistance', () => {
  it('should reduce score with bot risk', () => {
    const original = 80;
    const adjusted = applyAdversarialAdjustments(original, 0.5, 0);
    expect(adjusted).toBe(40); // 80 * (1 - 0.5) * 1
  });

  it('should reduce score with anomaly score', () => {
    const original = 80;
    const adjusted = applyAdversarialAdjustments(original, 0, 0.5);
    expect(adjusted).toBe(40);
  });

  it('should compound both adjustments', () => {
    const original = 100;
    const adjusted = applyAdversarialAdjustments(original, 0.5, 0.5);
    expect(adjusted).toBe(25); // 100 * 0.5 * 0.5
  });

  it('should never increase COMM beyond cap', () => {
    // This is tested in the full calculate function
    // Here we verify the adjustment function behavior
    const adjusted = applyAdversarialAdjustments(100, 0, 0);
    expect(adjusted).toBe(100); // No penalty = no reduction
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN-CASE SNAPSHOT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Golden-Case Snapshots', () => {
  const makeQSInputs = (values: Partial<Record<'TEAM' | 'TECH' | 'SEC' | 'GOV' | 'ECO', number>>): FeatureInput[] => {
    const now = new Date().toISOString();
    return Object.entries(values).map(([segment, value]) => ({
      key: `${segment.toLowerCase()}_score`,
      segment: segment as Segment,
      raw: value ?? null,
      timestamp: now,
    }));
  };

  const makeOSInputs = (values: Partial<Record<'MARKET' | 'TOKEN' | 'VAL' | 'ADOPT' | 'COMM', number>>): FeatureInput[] => {
    const now = new Date().toISOString();
    return Object.entries(values).map(([segment, value]) => ({
      key: `${segment.toLowerCase()}_score`,
      segment: segment as Segment,
      raw: value ?? null,
      timestamp: now,
    }));
  };

  it('should produce consistent output for a known high-quality project', () => {
    const result = calculateOmniScoreProduction({
      projectId: 'golden-test-high',
      qsInputs: makeQSInputs({ TEAM: 85, TECH: 80, SEC: 90, GOV: 75, ECO: 70 }),
      osInputs: makeOSInputs({ MARKET: 70, TOKEN: 65, VAL: 60, ADOPT: 75, COMM: 80 }),
      sector: 'L1',
    });

    expect(result.success).toBe(true);
    expect(result.qualityScore.tier).toBe('Strong');
    expect(result.audit.invariantStatus).toBe('pass');
    expect(result.version).toBe('2.3.3');
  });

  // v2.3.3: Tier consistency test - ensures tier labels match fixed thresholds
  it('should use fixed threshold tier labels (not conditioned tier)', () => {
    // Create a project with POS in the 40s to verify it gets "Weak" tier (30-49)
    // NOT "Neutral" from conditioned percentile
    const result = calculateOmniScoreProduction({
      projectId: 'tier-consistency-test',
      qsInputs: makeQSInputs({ TEAM: 45, TECH: 40, SEC: 42, GOV: 38, ECO: 35 }),
      osInputs: makeOSInputs({ MARKET: 40, TOKEN: 38, VAL: 42, ADOPT: 35, COMM: 45 }),
      sector: 'DeFi',
    });

    // Score should be in "Weak" range (30-49)
    // Fixed tier thresholds: Elite 85+, Strong 70-84, Neutral 50-69, Weak 30-49, Critical <30
    if (result.pos.adjusted >= 30 && result.pos.adjusted < 50) {
      expect(result.pos.tier).toBe('Weak');
    } else if (result.pos.adjusted >= 50 && result.pos.adjusted < 70) {
      expect(result.pos.tier).toBe('Neutral');
    }
    
    // Also verify tierContext shows both rawTier and conditionedTier
    expect(result.tierContext).toHaveProperty('rawTier');
    expect(result.tierContext).toHaveProperty('conditionedTier');
    expect(result.tierContext).toHaveProperty('tierMismatch');
    
    // The pos.tier should ALWAYS match rawTier (fixed thresholds)
    expect(result.pos.tier).toBe(result.tierContext.rawTier);
  });

  it('should gate OS for low QS coverage', () => {
    const result = calculateOmniScoreProduction({
      projectId: 'golden-test-gated',
      qsInputs: makeQSInputs({ TEAM: 70 }), // Only 1/5 = 20% coverage
      osInputs: makeOSInputs({ MARKET: 90, TOKEN: 85, VAL: 80, ADOPT: 85, COMM: 90 }),
      sector: 'DeFi',
    });

    expect(result.opportunityScore.status).toBe('gated');
    expect(result.opportunityScore.gateReason).toContain('coverage');
  });

  it('should include methodology provenance in audit', () => {
    const result = calculateOmniScoreProduction({
      projectId: 'golden-test-audit',
      qsInputs: makeQSInputs({ TEAM: 70, TECH: 70, SEC: 70, GOV: 70, ECO: 70 }),
      osInputs: makeOSInputs({ MARKET: 60, TOKEN: 60, VAL: 60, ADOPT: 60, COMM: 60 }),
    });

    expect(result.audit.methodology.id).toBe('OMNISCORE_V2.3.2_DIABOLICAL');
    expect(result.audit.methodology.url).toBe('/docs/omniscore/v2.3');
    expect(result.audit.methodology.hash).toMatch(/^sha256:/);
  });

  it('should track clamp application in audit', () => {
    const result = calculateOmniScoreProduction({
      projectId: 'golden-test-clamp',
      qsInputs: makeQSInputs({ TEAM: 70, TECH: 70, SEC: 70, GOV: 70, ECO: 70 }),
      osInputs: makeOSInputs({ MARKET: 60, TOKEN: 60, VAL: 60, ADOPT: 60, COMM: 60 }),
    });

    expect(result.audit.clampApplied).toHaveProperty('qs');
    expect(result.audit.clampApplied).toHaveProperty('os');
    expect(result.audit.clampApplied).toHaveProperty('pos');
    expect(result.audit.clampApplied).toHaveProperty('posAdj');
  });

  it('should include reflexivity sentinel in audit', () => {
    const result = calculateOmniScoreProduction({
      projectId: 'golden-test-reflexivity',
      qsInputs: makeQSInputs({ TEAM: 70, TECH: 70, SEC: 70, GOV: 70, ECO: 70 }),
      osInputs: makeOSInputs({ MARKET: 60, TOKEN: 60, VAL: 60, ADOPT: 60, COMM: 60 }),
      priceChange30d: 10,
    });

    expect(result.audit.reflexivitySentinel).toHaveProperty('status');
    expect(result.audit.reflexivitySentinel).toHaveProperty('corrQsPrice30d');
    expect(result.audit.reflexivitySentinel).toHaveProperty('threshold');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN-PACK VALIDATION HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Plugin-Pack Validation Harness', () => {
  interface PluginPack {
    id: string;
    sector: string;
    qsFeatures: Array<{ key: string; segment: Segment }>;
    osFeatures: Array<{ key: string; segment: Segment }>;
  }

  const validatePluginPack = (pack: PluginPack): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate QS features are in allowed segments
    for (const f of pack.qsFeatures) {
      if (!OMNISCORE_CONFIG.QS_SEGMENTS.includes(f.segment)) {
        errors.push(`QS feature "${f.key}" uses non-QS segment "${f.segment}"`);
      }
    }

    // Validate OS features are in allowed segments
    for (const f of pack.osFeatures) {
      if (!OMNISCORE_CONFIG.OS_SEGMENTS.includes(f.segment)) {
        errors.push(`OS feature "${f.key}" uses non-OS segment "${f.segment}"`);
      }
    }

    // Check for overlaps
    const qsKeys = new Set(pack.qsFeatures.map(f => f.key));
    for (const f of pack.osFeatures) {
      if (qsKeys.has(f.key)) {
        errors.push(`Feature key "${f.key}" appears in both QS and OS`);
      }
    }

    return { valid: errors.length === 0, errors };
  };

  it('should validate a correct DeFi plugin pack', () => {
    const defiPack: PluginPack = {
      id: 'defi-core',
      sector: 'DeFi',
      qsFeatures: [
        { key: 'tvl_growth', segment: 'ECO' },
        { key: 'audit_count', segment: 'SEC' },
        { key: 'smart_contract_quality', segment: 'TECH' },
      ],
      osFeatures: [
        { key: 'trading_volume', segment: 'MARKET' },
        { key: 'token_utility', segment: 'TOKEN' },
      ],
    };
    const result = validatePluginPack(defiPack);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject a plugin pack with INV-9 violations', () => {
    const badPack: PluginPack = {
      id: 'bad-pack',
      sector: 'Unknown',
      qsFeatures: [
        { key: 'price_momentum', segment: 'MARKET' }, // MARKET is OS!
      ],
      osFeatures: [
        { key: 'team_score', segment: 'TEAM' }, // TEAM is QS!
      ],
    };
    const result = validatePluginPack(badPack);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  it('should reject overlapping feature keys', () => {
    const overlapPack: PluginPack = {
      id: 'overlap-pack',
      sector: 'Unknown',
      qsFeatures: [
        { key: 'shared_metric', segment: 'TECH' },
      ],
      osFeatures: [
        { key: 'shared_metric', segment: 'MARKET' }, // Same key!
      ],
    };
    const result = validatePluginPack(overlapPack);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('appears in both'))).toBe(true);
  });
});

