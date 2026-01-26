/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 EVIDENCE PACK — COVERAGE TESTS                                         ║
 * ║                                                                               ║
 * ║   Tests for coverage tracking and formatting.                                 ║
 * ║   Ensures INVARIANT I3: Coverage map always complete.                         ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  CoverageTracker,
  analyzeCoverage,
  formatCoverageForAI,
  formatCoverageSummary,
  buildFactGate,
} from '../coverage';
import { CoverageMap, EvidenceModule } from '../types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockModule<T>(
  name: string,
  status: 'success' | 'failed' | 'timeout',
  freshnessSeconds = 30,
  data: T | null = null
): EvidenceModule<T> {
  return {
    module: name,
    status,
    ts: Date.now(),
    freshness_seconds: freshnessSeconds,
    source: `${name}.api`,
    data,
    from_cache: false,
    latency_ms: 250,
    ...(status !== 'success' && { error: { code: status.toUpperCase(), message: `${name} ${status}` } }),
  };
}

// ============================================================================
// TESTS: COVERAGE TRACKER
// ============================================================================

describe('CoverageTracker', () => {
  describe('planModules', () => {
    test('should plan modules based on budget tier - minimal', () => {
      const tracker = new CoverageTracker('TOKEN', 'minimal');
      const planned = tracker.planModules('ethereum', new Set());

      // Minimal should only include dexscreener
      expect(planned).toContain('dexscreener');
      expect(planned).not.toContain('security'); // Not in minimal
      expect(planned).not.toContain('holders'); // Not in minimal
    });

    test('should plan modules based on budget tier - standard', () => {
      const tracker = new CoverageTracker('TOKEN', 'standard');
      const planned = tracker.planModules('ethereum', new Set());

      expect(planned).toContain('dexscreener');
      expect(planned).toContain('security');
      expect(planned).not.toContain('holders'); // Only in full
    });

    test('should plan modules based on budget tier - full', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      const planned = tracker.planModules('ethereum', new Set());

      expect(planned).toContain('dexscreener');
      expect(planned).toContain('security');
      expect(planned).toContain('holders');
    });

    test('should exclude modules not supported by chain', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      const planned = tracker.planModules('ethereum', new Set());

      // pumpfun only supports solana
      expect(planned).not.toContain('pumpfun');
    });

    test('should include pumpfun for solana with condition', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      const planned = tracker.planModules('solana', new Set(['pumpfun_context']));

      expect(planned).toContain('pumpfun');
    });
  });

  describe('recordModule', () => {
    test('should track successful modules as available', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      tracker.planModules('ethereum', new Set());

      const module = createMockModule('dexscreener', 'success', 15, { price: 1.0 });
      tracker.recordModule('dexscreener', module);

      const coverage = tracker.build();
      expect(coverage.available).toContain('dexscreener');
      expect(coverage.missing).not.toContain('dexscreener');
      expect(coverage.freshness_seconds['dexscreener']).toBe(15);
    });

    test('should track failed modules as missing with errors', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      tracker.planModules('ethereum', new Set());

      const module = createMockModule('security', 'failed', 0, null);
      tracker.recordModule('security', module);

      const coverage = tracker.build();
      expect(coverage.missing).toContain('security');
      expect(coverage.available).not.toContain('security');
      expect(coverage.errors['security']).toBeDefined();
    });

    test('should track timeout modules correctly', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      tracker.planModules('ethereum', new Set());

      const module = createMockModule('holders', 'timeout', 0, null);
      tracker.recordModule('holders', module);

      const coverage = tracker.build();
      expect(coverage.missing).toContain('holders');
      expect(coverage.errors['holders']).toBeDefined();
      expect(coverage.errors['holders'].code).toBe('TIMEOUT');
    });
  });

  describe('build', () => {
    test('should include all required fields (INVARIANT I3)', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      tracker.planModules('ethereum', new Set());
      tracker.recordModule('dexscreener', createMockModule('dexscreener', 'success', 10));
      tracker.recordModule('security', createMockModule('security', 'failed', 0));

      const coverage = tracker.build();

      // All required fields must be present
      expect(coverage.kind).toBe('TOKEN');
      expect(coverage.available).toBeDefined();
      expect(coverage.missing).toBeDefined();
      expect(coverage.freshness_seconds).toBeDefined();
      expect(coverage.errors).toBeDefined();
      expect(coverage.planned_modules).toBeDefined();
      expect(coverage.used_budget_tier).toBe('full');
      expect(coverage.total_latency_ms).toBeGreaterThanOrEqual(0);
    });

    test('should calculate total latency', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      tracker.planModules('ethereum', new Set());
      tracker.recordModule('dexscreener', { ...createMockModule('dexscreener', 'success'), latency_ms: 100 });
      tracker.recordModule('security', { ...createMockModule('security', 'success'), latency_ms: 200 });

      const coverage = tracker.build();
      expect(coverage.total_latency_ms).toBeGreaterThanOrEqual(300);
    });
  });

  describe('getStats', () => {
    test('should return correct stats', () => {
      const tracker = new CoverageTracker('TOKEN', 'full');
      const planned = tracker.planModules('ethereum', new Set());
      tracker.recordModule('dexscreener', createMockModule('dexscreener', 'success'));
      tracker.recordModule('security', createMockModule('security', 'failed'));

      const stats = tracker.getStats();
      expect(stats.planned).toBe(planned.length);
      expect(stats.available).toBe(1);
      expect(stats.missing).toBe(1);
    });
  });
});

// ============================================================================
// TESTS: COVERAGE ANALYSIS
// ============================================================================

describe('analyzeCoverage', () => {
  function createCoverage(
    available: string[],
    missing: string[],
    freshnessSeconds: Record<string, number> = {}
  ): CoverageMap {
    return {
      kind: 'TOKEN',
      available,
      missing,
      freshness_seconds: freshnessSeconds,
      errors: {},
      planned_modules: [...available, ...missing],
      used_budget_tier: 'full',
      total_latency_ms: 500,
    };
  }

  test('should detect complete coverage', () => {
    const coverage = createCoverage(
      ['dexscreener', 'security', 'holders'],
      [],
      { dexscreener: 10, security: 30, holders: 60 }
    );

    const analysis = analyzeCoverage(coverage);
    expect(analysis.isComplete).toBe(true);
    expect(analysis.coveragePercent).toBe(100);
  });

  test('should detect critical missing modules', () => {
    const coverage = createCoverage(
      ['security', 'holders'],
      ['dexscreener'], // Critical for TOKEN
      { security: 30, holders: 60 }
    );

    const analysis = analyzeCoverage(coverage);
    expect(analysis.criticalMissing).toContain('dexscreener');
    expect(analysis.healthLevel).toBe('poor');
  });

  test('should calculate max staleness', () => {
    const coverage = createCoverage(
      ['dexscreener', 'security'],
      [],
      { dexscreener: 10, security: 300 }
    );

    const analysis = analyzeCoverage(coverage);
    expect(analysis.maxStalenessSeconds).toBe(300);
  });

  test('should determine health level based on coverage', () => {
    // Good health: >80% coverage, no critical missing
    const goodCoverage = createCoverage(
      ['dexscreener', 'security', 'holders', 'smartmoney'],
      ['pumpfun'],
      { dexscreener: 10, security: 30, holders: 60, smartmoney: 120 }
    );
    expect(analyzeCoverage(goodCoverage).healthLevel).toBe('good');

    // Degraded: 50-80% coverage
    const degradedCoverage = createCoverage(
      ['dexscreener', 'security'],
      ['holders', 'pumpfun', 'smartmoney'],
      { dexscreener: 10, security: 30 }
    );
    expect(analyzeCoverage(degradedCoverage).healthLevel).toBe('degraded');

    // Poor: <50% coverage
    const poorCoverage = createCoverage(
      ['dexscreener'],
      ['security', 'holders', 'pumpfun', 'smartmoney'],
      { dexscreener: 10 }
    );
    expect(analyzeCoverage(poorCoverage).healthLevel).toBe('poor');
  });
});

// ============================================================================
// TESTS: FORMATTING
// ============================================================================

describe('formatCoverageForAI', () => {
  function createCoverage(): CoverageMap {
    return {
      kind: 'TOKEN',
      available: ['dexscreener', 'security'],
      missing: ['holders'],
      freshness_seconds: { dexscreener: 15, security: 60 },
      errors: { holders: { code: 'TIMEOUT', message: 'API timeout' } },
      planned_modules: ['dexscreener', 'security', 'holders'],
      used_budget_tier: 'full',
      total_latency_ms: 500,
    };
  }

  test('should include available modules', () => {
    const formatted = formatCoverageForAI(createCoverage());
    expect(formatted).toContain('AVAILABLE');
    expect(formatted).toContain('dexscreener');
    expect(formatted).toContain('security');
  });

  test('should include missing modules', () => {
    const formatted = formatCoverageForAI(createCoverage());
    expect(formatted).toContain('MISSING');
    expect(formatted).toContain('holders');
    expect(formatted).toContain('DO NOT invent');
  });

  test('should include freshness information', () => {
    const formatted = formatCoverageForAI(createCoverage());
    expect(formatted).toContain('15s');
    expect(formatted).toContain('1m'); // 60s = 1m
  });
});

describe('formatCoverageSummary', () => {
  test('should format full coverage', () => {
    const coverage: CoverageMap = {
      kind: 'TOKEN',
      available: ['dexscreener', 'security'],
      missing: [],
      freshness_seconds: {},
      errors: {},
      planned_modules: ['dexscreener', 'security'],
      used_budget_tier: 'full',
      total_latency_ms: 500,
    };

    const summary = formatCoverageSummary(coverage);
    expect(summary).toContain('Full coverage');
  });

  test('should format partial coverage', () => {
    const coverage: CoverageMap = {
      kind: 'TOKEN',
      available: ['dexscreener'],
      missing: ['security'],
      freshness_seconds: {},
      errors: {},
      planned_modules: ['dexscreener', 'security'],
      used_budget_tier: 'full',
      total_latency_ms: 500,
    };

    const summary = formatCoverageSummary(coverage);
    expect(summary).toContain('Partial');
    expect(summary).toContain('Missing');
  });
});

describe('buildFactGate', () => {
  test('should include mandatory compliance header', () => {
    const coverage: CoverageMap = {
      kind: 'TOKEN',
      available: ['dexscreener'],
      missing: ['security'],
      freshness_seconds: { dexscreener: 10 },
      errors: {},
      planned_modules: ['dexscreener', 'security'],
      used_budget_tier: 'full',
      total_latency_ms: 500,
    };

    const factGate = buildFactGate(coverage);
    expect(factGate).toContain('FACT_GATE');
    expect(factGate).toContain('MANDATORY');
  });

  test('should list available data', () => {
    const coverage: CoverageMap = {
      kind: 'TOKEN',
      available: ['dexscreener', 'security'],
      missing: [],
      freshness_seconds: { dexscreener: 10, security: 30 },
      errors: {},
      planned_modules: ['dexscreener', 'security'],
      used_budget_tier: 'full',
      total_latency_ms: 500,
    };

    const factGate = buildFactGate(coverage);
    expect(factGate).toContain('AVAILABLE DATA');
    expect(factGate).toContain('dexscreener');
    expect(factGate).toContain('security');
  });

  test('should list missing data with warning', () => {
    const coverage: CoverageMap = {
      kind: 'TOKEN',
      available: ['dexscreener'],
      missing: ['security', 'holders'],
      freshness_seconds: { dexscreener: 10 },
      errors: {},
      planned_modules: ['dexscreener', 'security', 'holders'],
      used_budget_tier: 'full',
      total_latency_ms: 500,
    };

    const factGate = buildFactGate(coverage);
    expect(factGate).toContain('MISSING DATA');
    expect(factGate).toContain('security');
    expect(factGate).toContain('holders');
    expect(factGate).toContain('do NOT invent');
  });
});
