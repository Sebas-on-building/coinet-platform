/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 COVERAGE ENGINE — Quality Score & Freshness Analysis                   ║
 * ║                                                                               ║
 * ║   Computes deterministic coverage maps and quality scores.                    ║
 * ║   Identifies stale, missing, and error states explicitly.                     ║
 * ║                                                                               ║
 * ║   QUALITY SCORE FORMULA:                                                      ║
 * ║   Start at 1.0, subtract penalties for:                                       ║
 * ║   - Missing required modules (weighted by intent importance)                  ║
 * ║   - Stale modules beyond TTL                                                  ║
 * ║   - Error states                                                              ║
 * ║   - Unconfirmed token resolution                                              ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  EvidenceModules,
  CoverageMap,
  ModuleStatus,
  EvidenceIntent,
  MODULE_TTL_SECONDS,
  ResolvedToken,
  getModulesForIntent,
} from './types';

// ============================================================================
// MODULE WEIGHTS (for quality score calculation)
// ============================================================================

const MODULE_WEIGHTS: Record<string, number> = {
  dexscreener: 0.30,      // Critical for token analysis
  security: 0.20,         // Important for new tokens
  holders: 0.10,
  sentiment: 0.10,
  news: 0.10,
  derivatives: 0.10,
  onchain: 0.05,
  market_snapshot: 0.25,  // Critical for market overview
};

const STALENESS_PENALTY_MULTIPLIER = 0.5;  // 50% of weight if stale
const ERROR_PENALTY_MULTIPLIER = 0.75;     // 75% of weight if error
const UNCONFIRMED_TOKEN_PENALTY = 0.10;    // 10% penalty if token not confirmed

// ============================================================================
// FRESHNESS CALCULATION
// ============================================================================

export interface ModuleFreshness {
  module: string;
  status: ModuleStatus;
  freshness_seconds: number;
  ttl_seconds: number;
  is_stale: boolean;
}

/**
 * Calculate freshness for a single module
 */
export function calculateModuleFreshness(
  moduleName: string,
  moduleData: { status: ModuleStatus; ts: number } | undefined,
  nowUnix: number = Math.floor(Date.now() / 1000)
): ModuleFreshness {
  const ttl = MODULE_TTL_SECONDS[moduleName] || 300;  // Default 5min

  if (!moduleData) {
    return {
      module: moduleName,
      status: 'missing',
      freshness_seconds: Infinity,
      ttl_seconds: ttl,
      is_stale: false,  // Missing != stale
    };
  }

  const freshness = nowUnix - moduleData.ts;

  // Determine if stale (only for 'ok' status)
  const isStale = moduleData.status === 'ok' && freshness > ttl;

  return {
    module: moduleName,
    status: isStale ? 'stale' : moduleData.status,
    freshness_seconds: freshness,
    ttl_seconds: ttl,
    is_stale: isStale,
  };
}

// ============================================================================
// COVERAGE MAP COMPUTATION
// ============================================================================

export interface CoverageAnalysis {
  coverage: CoverageMap;
  analysis: {
    totalModules: number;
    availableCount: number;
    missingCount: number;
    staleCount: number;
    errorCount: number;
    requiredMissing: string[];
    optionalMissing: string[];
  };
}

/**
 * Compute comprehensive coverage map from evidence modules
 */
export function computeCoverage(
  evidence: EvidenceModules,
  intent: EvidenceIntent,
  hasResolvedToken: boolean,
  nowUnix: number = Math.floor(Date.now() / 1000)
): CoverageAnalysis {
  const { required, optional } = getModulesForIntent(intent, hasResolvedToken);
  const allExpected = [...new Set([...required, ...optional])];

  const available: string[] = [];
  const missing: string[] = [];
  const stale: string[] = [];
  const errors: string[] = [];
  const freshness_seconds: Record<string, number> = {};

  const requiredMissing: string[] = [];
  const optionalMissing: string[] = [];

  // Analyze each expected module
  for (const moduleName of allExpected) {
    const moduleData = (evidence as any)[moduleName];
    const freshness = calculateModuleFreshness(moduleName, moduleData, nowUnix);

    freshness_seconds[moduleName] = freshness.freshness_seconds;

    switch (freshness.status) {
      case 'ok':
        available.push(moduleName);
        break;
      case 'stale':
        stale.push(moduleName);
        available.push(moduleName);  // Still available, just stale
        break;
      case 'missing':
        missing.push(moduleName);
        if (required.includes(moduleName)) {
          requiredMissing.push(moduleName);
        } else {
          optionalMissing.push(moduleName);
        }
        break;
      case 'error':
        errors.push(moduleName);
        if (required.includes(moduleName)) {
          requiredMissing.push(moduleName);
        }
        break;
    }
  }

  // Check for time coherence issues
  const timeDisclosureRequired = checkTimeCoherence(evidence, nowUnix);

  // Compute quality score
  const qualityScore = computeQualityScore(
    available,
    missing,
    stale,
    errors,
    required,
    hasResolvedToken
  );

  return {
    coverage: {
      available,
      missing,
      stale,
      errors,
      freshness_seconds,
      quality_score: qualityScore,
      time_disclosure_required: timeDisclosureRequired,
    },
    analysis: {
      totalModules: allExpected.length,
      availableCount: available.length,
      missingCount: missing.length,
      staleCount: stale.length,
      errorCount: errors.length,
      requiredMissing,
      optionalMissing,
    },
  };
}

// ============================================================================
// QUALITY SCORE COMPUTATION
// ============================================================================

/**
 * Compute evidence quality score (0..1)
 * 
 * Formula:
 * - Start at 1.0
 * - Subtract (weight * 1.0) for missing required modules
 * - Subtract (weight * 0.5) for missing optional modules
 * - Subtract (weight * 0.5) for stale modules
 * - Subtract (weight * 0.75) for error modules
 * - Subtract 0.10 if token not confirmed (for token intents)
 * - Floor at 0.0
 */
export function computeQualityScore(
  available: string[],
  missing: string[],
  stale: string[],
  errors: string[],
  required: string[],
  hasConfirmedToken: boolean
): number {
  let score = 1.0;

  // Penalize missing required modules (full weight)
  for (const mod of missing) {
    if (required.includes(mod)) {
      const weight = MODULE_WEIGHTS[mod] || 0.05;
      score -= weight;
    } else {
      // Optional modules: half penalty
      const weight = MODULE_WEIGHTS[mod] || 0.05;
      score -= weight * 0.5;
    }
  }

  // Penalize stale modules
  for (const mod of stale) {
    const weight = MODULE_WEIGHTS[mod] || 0.05;
    score -= weight * STALENESS_PENALTY_MULTIPLIER;
  }

  // Penalize error modules
  for (const mod of errors) {
    const weight = MODULE_WEIGHTS[mod] || 0.05;
    score -= weight * ERROR_PENALTY_MULTIPLIER;
  }

  // Penalize unconfirmed token (only if token-related modules are expected)
  if (!hasConfirmedToken && required.includes('dexscreener')) {
    score -= UNCONFIRMED_TOKEN_PENALTY;
  }

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

// ============================================================================
// TIME COHERENCE CHECK
// ============================================================================

/**
 * Check if there's a significant time mismatch between modules
 * that requires disclosure in the response
 */
export function checkTimeCoherence(
  evidence: EvidenceModules,
  nowUnix: number = Math.floor(Date.now() / 1000)
): boolean {
  const timestamps: number[] = [];

  // Collect timestamps from all available modules
  const modules = ['dexscreener', 'security', 'holders', 'sentiment', 'news', 'derivatives', 'onchain', 'market_snapshot'];
  
  for (const mod of modules) {
    const moduleData = (evidence as any)[mod];
    if (moduleData?.status === 'ok' && moduleData?.ts) {
      timestamps.push(moduleData.ts);
    }
  }

  if (timestamps.length < 2) {
    return false;  // Can't have coherence issue with < 2 data points
  }

  // Check time spread
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const spreadSeconds = maxTs - minTs;

  // If news is > 10 minutes older than price data, require disclosure
  const newsTs = (evidence.news?.status === 'ok' && evidence.news?.ts) || 0;
  const priceTs = (evidence.dexscreener?.status === 'ok' && evidence.dexscreener?.ts) ||
                  (evidence.market_snapshot?.status === 'ok' && evidence.market_snapshot?.ts) || 0;

  if (newsTs && priceTs && (priceTs - newsTs) > 600) {
    return true;
  }

  // General rule: > 15 minutes spread requires disclosure
  return spreadSeconds > 900;
}

// ============================================================================
// COVERAGE SUMMARY (for Pass-1 prompts)
// ============================================================================

/**
 * Generate a human-readable coverage summary for Pass-1 prompts
 */
export function generateCoverageSummary(coverage: CoverageMap): string {
  const parts: string[] = [];

  // Available modules
  if (coverage.available.length > 0) {
    parts.push(`Available: ${coverage.available.join(', ')}`);
  }

  // Missing modules
  if (coverage.missing.length > 0) {
    parts.push(`Missing: ${coverage.missing.join(', ')}`);
  }

  // Stale modules
  if (coverage.stale.length > 0) {
    parts.push(`Stale: ${coverage.stale.join(', ')}`);
  }

  // Errors
  if (coverage.errors.length > 0) {
    parts.push(`Errors: ${coverage.errors.join(', ')}`);
  }

  // Freshness details for key modules
  const freshnessDetails: string[] = [];
  const keyModules = ['dexscreener', 'news', 'sentiment', 'market_snapshot'];
  for (const mod of keyModules) {
    if (coverage.freshness_seconds[mod] !== undefined) {
      const secs = coverage.freshness_seconds[mod];
      if (secs < 60) {
        freshnessDetails.push(`${mod} ${secs}s ago`);
      } else if (secs < 3600) {
        freshnessDetails.push(`${mod} ${Math.round(secs / 60)}m ago`);
      } else {
        freshnessDetails.push(`${mod} ${Math.round(secs / 3600)}h ago`);
      }
    }
  }

  if (freshnessDetails.length > 0) {
    parts.push(`Freshness: ${freshnessDetails.join(', ')}`);
  }

  // Quality score
  parts.push(`Quality: ${Math.round(coverage.quality_score * 100)}%`);

  // Time disclosure
  if (coverage.time_disclosure_required) {
    parts.push('⚠️ Time mismatch between data sources');
  }

  return parts.join('. ');
}

// ============================================================================
// CONFIDENCE CAPS BASED ON QUALITY
// ============================================================================

/**
 * Determine confidence cap for Pass-1 based on evidence quality
 */
export function getConfidenceCapFromQuality(qualityScore: number): 'high' | 'medium' | 'low' {
  if (qualityScore >= 0.80) return 'high';
  if (qualityScore >= 0.50) return 'medium';
  return 'low';
}

/**
 * Determine if uncertainty disclosure is required
 */
export function requiresUncertaintyDisclosure(coverage: CoverageMap): boolean {
  return (
    coverage.quality_score < 0.70 ||
    coverage.time_disclosure_required ||
    coverage.errors.length > 0 ||
    coverage.stale.length > 0
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MODULE_WEIGHTS,
  STALENESS_PENALTY_MULTIPLIER,
  ERROR_PENALTY_MULTIPLIER,
  UNCONFIRMED_TOKEN_PENALTY,
};
