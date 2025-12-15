/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 OMNISCORE v2.5.0 PRODUCTION READINESS TESTS                           ║
 * ║                                                                               ║
 * ║   Tests that verify ALL production-ready criteria are met.                   ║
 * ║   These tests MUST pass before deployment.                                   ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 8                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Import from canonical entrypoint ONLY
import {
  // Version constants
  ENGINE_VERSION,
  FORMULA_VERSION,
  METHODOLOGY_ID,
  METHODOLOGY_PROVENANCE,
  computeMethodologyHash,
  assertVersionIntegrity,
  OmniScoreVersionError,
  getVersionInfo,
  
  // Validation
  validateOmniScoreParams,
  safeValidateOmniScoreParams,
  OmniScoreValidationError,
  MIN_QS_INPUTS,
  MIN_OS_INPUTS,
  
  // Errors & Data Quality
  OmniScoreError,
  checkDataQuality,
  assertDataQualityOrThrow,
  isOmniScoreError,
  assertFinite,
  assertScoreBounds,
  
  // Invariants
  INVARIANT_CODES,
  validateBundleOrThrow,
  clampScore,
  normalizeProbs,
  
  // Feature flags
  getFeatureFlags,
  resetFeatureFlagCache,
  shouldUseNewBehavior,
} from '../omniscore';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createValidQsInput(key: string, value: number) {
  return {
    key,
    segment: 'TEAM' as const,
    raw: value,
    timestamp: new Date().toISOString(),
    sources: ['test'],
  };
}

function createValidOsInput(key: string, value: number) {
  return {
    key,
    segment: 'MARKET' as const,
    raw: value,
    timestamp: new Date().toISOString(),
    sources: ['test'],
  };
}

const validMarketData = {
  btcTrend30d: 5,
  btcTrend90d: 10,
  volatilityIndex: 25,
  fearGreedIndex: 60,
};

const minValidQsInputs = [
  createValidQsInput('team_size', 80),
  createValidQsInput('tech_quality', 75),
  createValidQsInput('security_audit', 90),
];

const minValidOsInputs = [
  createValidOsInput('market_volume', 70),
  createValidOsInput('market_cap', 85),
];

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: VERSION INTEGRITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 1: Version Integrity', () => {
  test('ENGINE_VERSION is 2.5.0', () => {
    expect(ENGINE_VERSION).toBe('2.5.0');
  });
  
  test('FORMULA_VERSION is v2.5', () => {
    expect(FORMULA_VERSION).toBe('v2.5');
  });
  
  test('METHODOLOGY_ID contains V2.5.0', () => {
    expect(METHODOLOGY_ID).toContain('V2.5.0');
    expect(METHODOLOGY_ID).toContain('CONVEX_COMBINATION');
  });
  
  test('METHODOLOGY_PROVENANCE has all required fields', () => {
    expect(METHODOLOGY_PROVENANCE.id).toBe(METHODOLOGY_ID);
    expect(METHODOLOGY_PROVENANCE.version).toBe(ENGINE_VERSION);
    expect(METHODOLOGY_PROVENANCE.formula).toBe(FORMULA_VERSION);
    expect(METHODOLOGY_PROVENANCE.hash).toMatch(/^sha256:[a-f0-9]+$/);
    expect(METHODOLOGY_PROVENANCE.url).toBe('/docs/omniscore/v2.5');
  });
  
  test('computeMethodologyHash is deterministic', () => {
    const hash1 = computeMethodologyHash('2.5.0');
    const hash2 = computeMethodologyHash('2.5.0');
    expect(hash1).toBe(hash2);
    
    // Different versions produce different hashes
    const hash3 = computeMethodologyHash('2.4.0');
    expect(hash1).not.toBe(hash3);
  });
  
  test('assertVersionIntegrity throws on ENGINE_VERSION mismatch', () => {
    expect(() => assertVersionIntegrity('2.4.0', FORMULA_VERSION))
      .toThrow(OmniScoreVersionError);
    
    try {
      assertVersionIntegrity('2.4.0', FORMULA_VERSION);
    } catch (e) {
      expect(e).toBeInstanceOf(OmniScoreVersionError);
      expect((e as OmniScoreVersionError).code).toBe('ENGINE_VERSION_MISMATCH');
    }
  });
  
  test('assertVersionIntegrity throws on FORMULA_VERSION mismatch', () => {
    expect(() => assertVersionIntegrity(ENGINE_VERSION, 'v2.3'))
      .toThrow(OmniScoreVersionError);
    
    try {
      assertVersionIntegrity(ENGINE_VERSION, 'v2.3');
    } catch (e) {
      expect(e).toBeInstanceOf(OmniScoreVersionError);
      expect((e as OmniScoreVersionError).code).toBe('FORMULA_VERSION_MISMATCH');
    }
  });
  
  test('assertVersionIntegrity passes on correct versions', () => {
    expect(() => assertVersionIntegrity(ENGINE_VERSION, FORMULA_VERSION))
      .not.toThrow();
  });
  
  test('getVersionInfo returns complete version object', () => {
    const info = getVersionInfo();
    expect(info.engineVersion).toBe(ENGINE_VERSION);
    expect(info.formulaVersion).toBe(FORMULA_VERSION);
    expect(info.methodologyId).toBe(METHODOLOGY_ID);
    expect(info.methodologyHash).toBeDefined();
    expect(info.buildCommitSha).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: INPUT VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 3: Input Validation', () => {
  test('rejects empty projectId', () => {
    expect(() => validateOmniScoreParams({
      projectId: '',
      qsInputs: minValidQsInputs,
      osInputs: minValidOsInputs,
      marketData: validMarketData,
    })).toThrow(OmniScoreValidationError);
  });
  
  test('rejects missing projectId', () => {
    expect(() => validateOmniScoreParams({
      qsInputs: minValidQsInputs,
      osInputs: minValidOsInputs,
      marketData: validMarketData,
    })).toThrow(OmniScoreValidationError);
  });
  
  test('rejects missing marketData AND cryptoRegimeSignals', () => {
    const result = safeValidateOmniScoreParams({
      projectId: 'test',
      qsInputs: minValidQsInputs,
      osInputs: minValidOsInputs,
      // Missing both marketData and cryptoRegimeSignals
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('marketData');
    }
  });
  
  test('accepts cryptoRegimeSignals instead of marketData', () => {
    const result = safeValidateOmniScoreParams({
      projectId: 'test',
      qsInputs: minValidQsInputs,
      osInputs: minValidOsInputs,
      cryptoRegimeSignals: { btcTrend30d: 5 },
    });
    
    expect(result.success).toBe(true);
  });
  
  test('rejects NaN in numeric fields', () => {
    expect(() => validateOmniScoreParams({
      projectId: 'test',
      qsInputs: [createValidQsInput('test', NaN), ...minValidQsInputs.slice(1)],
      osInputs: minValidOsInputs,
      marketData: validMarketData,
    })).toThrow(OmniScoreValidationError);
  });
  
  test('rejects Infinity in numeric fields', () => {
    expect(() => validateOmniScoreParams({
      projectId: 'test',
      qsInputs: [createValidQsInput('test', Infinity), ...minValidQsInputs.slice(1)],
      osInputs: minValidOsInputs,
      marketData: validMarketData,
    })).toThrow(OmniScoreValidationError);
  });
  
  test('rejects invalid timestamp format', () => {
    expect(() => validateOmniScoreParams({
      projectId: 'test',
      qsInputs: [{
        key: 'test',
        segment: 'TEAM',
        raw: 50,
        timestamp: 'not-a-timestamp',
      }],
      osInputs: minValidOsInputs,
      marketData: validMarketData,
    })).toThrow(OmniScoreValidationError);
  });
  
  test('applies default sector=Unknown when missing', () => {
    const result = validateOmniScoreParams({
      projectId: 'test',
      qsInputs: minValidQsInputs,
      osInputs: minValidOsInputs,
      marketData: validMarketData,
      // No sector provided
    });
    
    expect(result.sector).toBe('Unknown');
  });
  
  test('validates complete valid input', () => {
    const result = validateOmniScoreParams({
      projectId: 'test-project',
      qsInputs: minValidQsInputs,
      osInputs: minValidOsInputs,
      sector: 'DeFi',
      capBucket: 'large',
      marketData: validMarketData,
    });
    
    expect(result.projectId).toBe('test-project');
    expect(result.sector).toBe('DeFi');
    expect(result.capBucket).toBe('large');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: DATA QUALITY & FAIL-CLOSED TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 4: Data Quality & Fail-Closed', () => {
  test('checkDataQuality detects insufficient QS inputs', () => {
    const result = checkDataQuality(
      [{ raw: 50 }, { raw: 60 }], // Only 2 inputs (below MIN_QS_INPUTS)
      minValidOsInputs
    );
    
    expect(result.passed).toBe(false);
    expect(result.qsValidCount).toBe(2);
    expect(result.failedFields).toContain('qsInputs');
    expect(result.failureReason).toContain('QS');
  });
  
  test('checkDataQuality detects insufficient OS inputs', () => {
    const result = checkDataQuality(
      minValidQsInputs,
      [{ raw: 50 }] // Only 1 input (below MIN_OS_INPUTS)
    );
    
    expect(result.passed).toBe(false);
    expect(result.osValidCount).toBe(1);
    expect(result.failedFields).toContain('osInputs');
  });
  
  test('checkDataQuality counts only valid (non-null, finite) inputs', () => {
    const result = checkDataQuality(
      [
        { raw: 50 },
        { raw: null },
        { raw: NaN },
        { raw: 70 },
        { raw: 80 },
      ],
      minValidOsInputs
    );
    
    expect(result.qsValidCount).toBe(3); // Only 50, 70, 80 are valid
    expect(result.qsTotalCount).toBe(5);
    expect(result.qsCoverage).toBe(0.6); // 3/5
  });
  
  test('assertDataQualityOrThrow throws INSUFFICIENT_DATA on failure', () => {
    expect(() => assertDataQualityOrThrow(
      [{ raw: 50 }], // Insufficient
      minValidOsInputs
    )).toThrow(OmniScoreError);
    
    try {
      assertDataQualityOrThrow([{ raw: 50 }], minValidOsInputs);
    } catch (e) {
      expect(isOmniScoreError(e)).toBe(true);
      expect((e as OmniScoreError).code).toBe('INSUFFICIENT_DATA');
      expect((e as OmniScoreError).severity).toBe('CRITICAL');
    }
  });
  
  test('assertDataQualityOrThrow passes with valid data', () => {
    const result = assertDataQualityOrThrow(
      minValidQsInputs,
      minValidOsInputs
    );
    
    expect(result.passed).toBe(true);
    expect(result.qsValidCount).toBeGreaterThanOrEqual(MIN_QS_INPUTS);
    expect(result.osValidCount).toBeGreaterThanOrEqual(MIN_OS_INPUTS);
  });
  
  test('checkDataQuality marks low coverage as degraded', () => {
    const result = checkDataQuality(
      [
        { raw: 50 },
        { raw: 60 },
        { raw: 70 },
        { raw: null },
        { raw: null },
        { raw: null },
        { raw: null },
      ], // 3 valid out of 7 = 42% coverage
      minValidOsInputs
    );
    
    expect(result.passed).toBe(true); // Still passes min count
    expect(result.degraded).toBe(true); // But marked as degraded
    expect(result.qsCoverage).toBeLessThan(0.5);
  });
  
  test('OmniScoreError has all required properties', () => {
    const error = new OmniScoreError(
      'INSUFFICIENT_DATA',
      'Test error message',
      'CRITICAL',
      { qsValidCount: 2, osValidCount: 1 }
    );
    
    expect(error.code).toBe('INSUFFICIENT_DATA');
    expect(error.severity).toBe('CRITICAL');
    expect(error.message).toBe('Test error message');
    expect(error.details.qsValidCount).toBe(2);
    expect(error.timestamp).toBeDefined();
    expect(error.isRetryable).toBe(false);
    
    const json = error.toJSON();
    expect(json.code).toBe('INSUFFICIENT_DATA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: INVARIANT VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 6: Invariant Validation', () => {
  test('INVARIANT_CODES are properly defined', () => {
    expect(INVARIANT_CODES.INV_1).toBe('INV-1');
    expect(INVARIANT_CODES.INV_4b).toBe('INV-4b');
    expect(INVARIANT_CODES.INV_6).toBe('INV-6');
  });
  
  test('validateBundleOrThrow catches non-finite values', () => {
    expect(() => validateBundleOrThrow({
      qsInputs: [{ raw: NaN, key: 'test' }],
      osInputs: [],
    })).toThrow(OmniScoreError);
  });
  
  test('validateBundleOrThrow catches invalid coverage', () => {
    expect(() => validateBundleOrThrow({
      qsInputs: [],
      osInputs: [],
      coverageQS: 1.5, // Out of bounds
    })).toThrow(OmniScoreError);
  });
  
  test('validateBundleOrThrow catches probability sum ≠ 1', () => {
    expect(() => validateBundleOrThrow({
      qsInputs: [],
      osInputs: [],
      regimeProbs: { bull: 0.3, bear: 0.3 }, // Sum = 0.6, not 1
    })).toThrow(OmniScoreError);
  });
  
  test('validateBundleOrThrow catches negative gamma', () => {
    expect(() => validateBundleOrThrow({
      qsInputs: [],
      osInputs: [],
      gamma: -0.5, // Negative
    })).toThrow(OmniScoreError);
  });
  
  test('validateBundleOrThrow passes valid bundle', () => {
    const result = validateBundleOrThrow({
      qsInputs: minValidQsInputs,
      osInputs: minValidOsInputs,
      coverageQS: 0.9,
      coverageOS: 0.8,
      gamma: 0.1,
      regimeProbs: { bull: 0.4, bear: 0.3, neutral: 0.3 },
    });
    
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
  
  test('clampScore throws on NaN', () => {
    expect(() => clampScore(NaN, 'testScore')).toThrow(OmniScoreError);
  });
  
  test('clampScore clamps out-of-bounds values', () => {
    const low = clampScore(-10, 'testScore');
    expect(low.value).toBe(0);
    expect(low.clamped).toBe(true);
    
    const high = clampScore(150, 'testScore');
    expect(high.value).toBe(100);
    expect(high.clamped).toBe(true);
    
    const valid = clampScore(75, 'testScore');
    expect(valid.value).toBe(75);
    expect(valid.clamped).toBe(false);
  });
  
  test('normalizeProbs normalizes to sum 1', () => {
    const probs = normalizeProbs({ a: 2, b: 3, c: 5 });
    const sum = Object.values(probs).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
  
  test('normalizeProbs handles all zeros', () => {
    const probs = normalizeProbs({ a: 0, b: 0, c: 0 });
    expect(probs.a).toBeCloseTo(1/3, 10);
    expect(probs.b).toBeCloseTo(1/3, 10);
    expect(probs.c).toBeCloseTo(1/3, 10);
  });
  
  test('assertFinite catches NaN', () => {
    expect(() => assertFinite(NaN, 'testField')).toThrow(OmniScoreError);
    
    try {
      assertFinite(NaN, 'testField');
    } catch (e) {
      expect((e as OmniScoreError).code).toBe('NAN_DETECTED');
    }
  });
  
  test('assertFinite catches Infinity', () => {
    expect(() => assertFinite(Infinity, 'testField')).toThrow(OmniScoreError);
    expect(() => assertFinite(-Infinity, 'testField')).toThrow(OmniScoreError);
    
    try {
      assertFinite(Infinity, 'testField');
    } catch (e) {
      expect((e as OmniScoreError).code).toBe('INFINITY_DETECTED');
    }
  });
  
  test('assertScoreBounds validates 0-100 range', () => {
    expect(() => assertScoreBounds(-1, 'testScore')).toThrow(OmniScoreError);
    expect(() => assertScoreBounds(101, 'testScore')).toThrow(OmniScoreError);
    expect(() => assertScoreBounds(50, 'testScore')).not.toThrow();
    expect(() => assertScoreBounds(0, 'testScore')).not.toThrow();
    expect(() => assertScoreBounds(100, 'testScore')).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 9: FEATURE FLAGS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 9: Feature Flags', () => {
  beforeEach(() => {
    resetFeatureFlagCache();
  });
  
  afterEach(() => {
    // Clean up environment variables
    delete process.env.OMNISCORE_FAIL_CLOSED;
    delete process.env.OMNISCORE_SMOOTHING_PERSIST;
    delete process.env.OMNISCORE_ROLLOUT_PERCENT;
    resetFeatureFlagCache();
  });
  
  test('getFeatureFlags returns default values', () => {
    const flags = getFeatureFlags();
    
    expect(flags.failClosed).toBe(false); // Default off
    expect(flags.smoothingPersist).toBe(false); // Default off
    expect(flags.verboseAudit).toBe(true); // Default on
    expect(flags.versionCheckStrict).toBe(true); // Default on
  });
  
  test('feature flags respect environment variables', () => {
    process.env.OMNISCORE_FAIL_CLOSED = 'true';
    process.env.OMNISCORE_SMOOTHING_PERSIST = 'true';
    resetFeatureFlagCache();
    
    const flags = getFeatureFlags();
    expect(flags.failClosed).toBe(true);
    expect(flags.smoothingPersist).toBe(true);
  });
  
  test('shouldUseNewBehavior is deterministic for same projectId', () => {
    process.env.OMNISCORE_ROLLOUT_PERCENT = '50';
    resetFeatureFlagCache();
    
    const result1 = shouldUseNewBehavior('test-project-123');
    const result2 = shouldUseNewBehavior('test-project-123');
    
    expect(result1).toBe(result2);
  });
  
  test('shouldUseNewBehavior returns true at 100%', () => {
    process.env.OMNISCORE_ROLLOUT_PERCENT = '100';
    resetFeatureFlagCache();
    
    expect(shouldUseNewBehavior('any-project')).toBe(true);
    expect(shouldUseNewBehavior('another-project')).toBe(true);
  });
  
  test('shouldUseNewBehavior returns false at 0%', () => {
    process.env.OMNISCORE_ROLLOUT_PERCENT = '0';
    resetFeatureFlagCache();
    
    expect(shouldUseNewBehavior('any-project')).toBe(false);
    expect(shouldUseNewBehavior('another-project')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: OBSERVABILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// Note: Metrics and logging modules are tested via their exported functions
// The full integration with the engine is tested in separate e2e tests

describe('Phase 7: Observability', () => {
  test('metrics exports are available', async () => {
    // Dynamic import to avoid module resolution issues at test collection time
    const metrics = await import('../omniscore/current/metrics');
    
    expect(metrics.recordCalcSuccess).toBeDefined();
    expect(metrics.recordCalcError).toBeDefined();
    expect(metrics.recordUpstreamFailure).toBeDefined();
    expect(metrics.getPrometheusMetrics).toBeDefined();
    expect(metrics.getMetricsJson).toBeDefined();
    expect(metrics.resetMetrics).toBeDefined();
  });
  
  test('logging exports are available', async () => {
    const logging = await import('../omniscore/current/logging');
    
    expect(logging.OmniScoreLogger).toBeDefined();
    expect(logging.createOmniScoreLogger).toBeDefined();
    expect(logging.createAuditLogEntry).toBeDefined();
  });
  
  test('getMetricsJson returns structured data', async () => {
    const { getMetricsJson, resetMetrics } = await import('../omniscore/current/metrics');
    
    resetMetrics();
    const json = getMetricsJson() as any;
    
    expect(json.engineVersion).toBe(ENGINE_VERSION);
    expect(json.timestamp).toBeDefined();
    expect(json.counters).toBeDefined();
    expect(json.histograms).toBeDefined();
    expect(json.gauges).toBeDefined();
  });
  
  test('getPrometheusMetrics returns text format', async () => {
    const { getPrometheusMetrics, resetMetrics } = await import('../omniscore/current/metrics');
    
    resetMetrics();
    const text = getPrometheusMetrics();
    
    expect(text).toContain('OmniScore Metrics');
    expect(text).toContain(ENGINE_VERSION);
  });
  
  test('createOmniScoreLogger creates logger with context', async () => {
    const { createOmniScoreLogger } = await import('../omniscore/current/logging');
    
    const logger = createOmniScoreLogger('req-123', 'project-abc');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.calcStart).toBe('function');
    expect(typeof logger.calcError).toBe('function');
  });
  
  test('createAuditLogEntry creates complete entry', async () => {
    const { createAuditLogEntry } = await import('../omniscore/current/logging');
    
    const entry = createAuditLogEntry({
      requestId: 'req-123',
      projectId: 'test-project',
      qsInputCount: 5,
      osInputCount: 3,
      qsCoverage: 0.8,
      osCoverage: 0.7,
      posScore: 75,
      tier: 'Strong',
      degraded: false,
      smoothingApplied: true,
      durationMs: 150,
    });
    
    expect(entry.requestId).toBe('req-123');
    expect(entry.projectId).toBe('test-project');
    expect(entry.engineVersion).toBe(ENGINE_VERSION);
    expect(entry.posScore).toBe(75);
    expect(entry.timestamp).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GO/NO-GO CHECKLIST VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Production Ready Go/No-Go Checklist', () => {
  test('✅ No v2.3.* strings in version constants', () => {
    expect(ENGINE_VERSION).not.toContain('2.3');
    expect(FORMULA_VERSION).not.toContain('2.3');
    expect(METHODOLOGY_ID).not.toContain('2.3');
  });
  
  test('✅ Version mismatches throw, not warn', () => {
    // This test verifies that assertVersionIntegrity throws
    let threw = false;
    try {
      assertVersionIntegrity('2.4.0', FORMULA_VERSION);
    } catch (e) {
      threw = true;
      expect(e).toBeInstanceOf(OmniScoreVersionError);
    }
    expect(threw).toBe(true);
  });
  
  test('✅ Empty data throws INSUFFICIENT_DATA', () => {
    let threw = false;
    try {
      assertDataQualityOrThrow([], []);
    } catch (e) {
      threw = true;
      expect(isOmniScoreError(e)).toBe(true);
      expect((e as OmniScoreError).code).toBe('INSUFFICIENT_DATA');
    }
    expect(threw).toBe(true);
  });
  
  test('✅ All error codes are typed', () => {
    const error = new OmniScoreError('INSUFFICIENT_DATA', 'test', 'CRITICAL');
    expect(error.code).toBe('INSUFFICIENT_DATA');
    expect(error.severity).toBe('CRITICAL');
  });
  
  test('✅ Feature flags exist for safe rollout', () => {
    const flags = getFeatureFlags();
    expect(flags).toHaveProperty('failClosed');
    expect(flags).toHaveProperty('smoothingPersist');
    expect(flags).toHaveProperty('strictValidation');
  });
});
