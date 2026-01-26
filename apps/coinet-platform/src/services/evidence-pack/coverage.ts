/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📋 EVIDENCE PACK — COVERAGE TRACKING                                      ║
 * ║                                                                               ║
 * ║   Tracks available/missing modules and freshness.                             ║
 * ║   Ensures INVARIANT I3: Coverage map always present.                          ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  CoverageMap,
  EvidencePackKind,
  BudgetTier,
  ModuleStatus,
  ModuleError,
  EvidenceModule,
  TOKEN_MODULE_CONFIG,
  MARKET_MODULE_CONFIG,
  ChainId,
} from './types';

// ============================================================================
// COVERAGE BUILDER
// ============================================================================

export class CoverageTracker {
  private plannedModules: string[] = [];
  private available: string[] = [];
  private missing: string[] = [];
  private freshness: Record<string, number> = {};
  private errors: Record<string, ModuleError> = {};
  private latencies: Record<string, number> = {};
  private startTime: number;
  
  constructor(
    private kind: EvidencePackKind,
    private budgetTier: BudgetTier
  ) {
    this.startTime = Date.now();
  }

  /**
   * Plan which modules to fetch based on budget and conditions
   */
  planModules(
    chain: ChainId | undefined,
    conditions: Set<string>
  ): string[] {
    const config = this.kind === 'TOKEN' || this.kind === 'BOTH'
      ? TOKEN_MODULE_CONFIG
      : MARKET_MODULE_CONFIG;

    this.plannedModules = [];

    for (const [moduleName, moduleConfig] of Object.entries(config)) {
      // Check if required for this budget tier
      if (!moduleConfig.requiredForBudget[this.budgetTier]) {
        continue;
      }

      // Check chain support
      if (chain && moduleConfig.chainSupport !== 'all') {
        if (!moduleConfig.chainSupport.includes(chain)) {
          continue;
        }
      }

      // Check additional conditions
      if (moduleConfig.conditions) {
        const hasAllConditions = moduleConfig.conditions.every(c => conditions.has(c));
        if (!hasAllConditions) {
          continue;
        }
      }

      this.plannedModules.push(moduleName);
    }

    return this.plannedModules;
  }

  /**
   * Record a module fetch result
   */
  recordModule<T>(
    moduleName: string,
    result: EvidenceModule<T>
  ): void {
    this.latencies[moduleName] = result.latency_ms;

    if (result.status === 'success' || result.status === 'partial') {
      this.available.push(moduleName);
      this.freshness[moduleName] = result.freshness_seconds;
    } else {
      this.missing.push(moduleName);
      if (result.error) {
        this.errors[moduleName] = result.error;
      }
    }
  }

  /**
   * Record a skipped module
   */
  recordSkipped(moduleName: string, reason: string): void {
    this.missing.push(moduleName);
    this.errors[moduleName] = {
      code: 'SKIPPED',
      message: reason,
    };
  }

  /**
   * Record a not applicable module (e.g., pumpfun for ETH)
   */
  recordNotApplicable(moduleName: string): void {
    // Don't add to missing - it's not a failure
    this.errors[moduleName] = {
      code: 'NOT_APPLICABLE',
      message: `Module ${moduleName} not applicable for this context`,
    };
  }

  /**
   * Build the final coverage map
   */
  build(): CoverageMap {
    const totalLatency = Object.values(this.latencies).reduce((a, b) => a + b, 0);
    const endTime = Date.now();
    const wallClockLatency = endTime - this.startTime;

    return {
      kind: this.kind,
      available: this.available,
      missing: this.missing.filter(m => !this.errors[m]?.code.includes('NOT_APPLICABLE')),
      freshness_seconds: this.freshness,
      errors: this.errors,
      planned_modules: this.plannedModules,
      used_budget_tier: this.budgetTier,
      total_latency_ms: Math.max(totalLatency, wallClockLatency),
    };
  }

  /**
   * Get current stats
   */
  getStats(): {
    planned: number;
    available: number;
    missing: number;
    coverage: number;
  } {
    const planned = this.plannedModules.length;
    const available = this.available.length;
    const missing = this.missing.length;
    const coverage = planned > 0 ? available / planned : 0;

    return { planned, available, missing, coverage };
  }
}

// ============================================================================
// COVERAGE ANALYSIS
// ============================================================================

export interface CoverageAnalysis {
  isComplete: boolean;
  coveragePercent: number;
  criticalMissing: string[];
  maxStalenessSeconds: number;
  healthLevel: 'good' | 'degraded' | 'poor';
  summary: string;
}

/**
 * Analyze coverage quality
 */
export function analyzeCoverage(coverage: CoverageMap): CoverageAnalysis {
  const totalPlanned = coverage.planned_modules.length;
  const available = coverage.available.length;
  const coveragePercent = totalPlanned > 0 ? (available / totalPlanned) * 100 : 0;

  // Determine critical modules based on kind
  const criticalModules = coverage.kind === 'TOKEN'
    ? ['dexscreener']
    : ['market_snapshot'];

  const criticalMissing = criticalModules.filter(m => coverage.missing.includes(m));

  // Calculate max staleness
  const freshnessValues = Object.values(coverage.freshness_seconds);
  const maxStalenessSeconds = freshnessValues.length > 0 
    ? Math.max(...freshnessValues) 
    : 0;

  // Determine health level
  let healthLevel: 'good' | 'degraded' | 'poor';
  if (criticalMissing.length > 0) {
    healthLevel = 'poor';
  } else if (coveragePercent >= 80 && maxStalenessSeconds < 300) {
    healthLevel = 'good';
  } else if (coveragePercent >= 50) {
    healthLevel = 'degraded';
  } else {
    healthLevel = 'poor';
  }

  // Build summary
  const summaryParts: string[] = [];
  summaryParts.push(`${available}/${totalPlanned} modules available (${coveragePercent.toFixed(0)}%)`);
  
  if (criticalMissing.length > 0) {
    summaryParts.push(`Critical missing: ${criticalMissing.join(', ')}`);
  }
  
  if (coverage.missing.length > 0) {
    summaryParts.push(`Missing: ${coverage.missing.join(', ')}`);
  }
  
  if (maxStalenessSeconds > 300) {
    summaryParts.push(`Stale data: ${maxStalenessSeconds}s`);
  }

  return {
    isComplete: coverage.missing.length === 0,
    coveragePercent,
    criticalMissing,
    maxStalenessSeconds,
    healthLevel,
    summary: summaryParts.join('. '),
  };
}

// ============================================================================
// COVERAGE FORMATTERS
// ============================================================================

/**
 * Format coverage for AI context
 */
export function formatCoverageForAI(coverage: CoverageMap): string {
  const analysis = analyzeCoverage(coverage);
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════════════════════',
    '📋 EVIDENCE COVERAGE (Trust this, not invented facts)',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    `Data availability: ${analysis.summary}`,
    '',
  ];

  if (coverage.available.length > 0) {
    lines.push(`✅ AVAILABLE: ${coverage.available.join(', ')}`);
    
    // Show freshness for each
    for (const module of coverage.available) {
      const freshness = coverage.freshness_seconds[module];
      if (freshness !== undefined) {
        const freshnessLabel = freshness < 60 ? `${freshness}s ago` : `${Math.floor(freshness / 60)}m ago`;
        lines.push(`   - ${module}: ${freshnessLabel}`);
      }
    }
  }

  if (coverage.missing.length > 0) {
    lines.push('');
    lines.push(`❌ MISSING: ${coverage.missing.join(', ')}`);
    lines.push('   (DO NOT invent data for missing modules)');
    
    // Show errors
    for (const module of coverage.missing) {
      const error = coverage.errors[module];
      if (error) {
        lines.push(`   - ${module}: ${error.code} - ${error.message}`);
      }
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Format coverage as short summary
 */
export function formatCoverageSummary(coverage: CoverageMap): string {
  const { available, missing } = coverage;
  
  if (missing.length === 0) {
    return `Full coverage: ${available.join(', ')}`;
  }
  
  return `Partial coverage: ${available.join(', ')} | Missing: ${missing.join(', ')}`;
}

// ============================================================================
// FACT GATE BUILDER
// ============================================================================

/**
 * Build the FACT_GATE instruction for LLM
 */
export function buildFactGate(coverage: CoverageMap): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════════════════════',
    '🚫 FACT_GATE — MANDATORY COMPLIANCE',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    'You MUST obey these rules:',
    '',
    '1. Only cite numbers/facts present in the Evidence Pack above',
    '2. If a module is MISSING, do NOT invent or estimate its data',
    '3. If you need data from a missing module, say "I don\'t have [module] data"',
    '4. Never claim "real-time" or "live" for stale data (>5 min old)',
    '',
  ];

  if (coverage.missing.length > 0) {
    lines.push('MISSING DATA (do NOT invent):');
    for (const module of coverage.missing) {
      lines.push(`  - ${module}`);
    }
    lines.push('');
  }

  lines.push('AVAILABLE DATA (use ONLY these):');
  for (const module of coverage.available) {
    const freshness = coverage.freshness_seconds[module];
    const label = freshness !== undefined 
      ? `(${freshness < 60 ? freshness + 's' : Math.floor(freshness / 60) + 'm'} old)`
      : '';
    lines.push(`  - ${module} ${label}`);
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
