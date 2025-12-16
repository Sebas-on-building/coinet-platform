/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🚪 CONFIDENCE + COVERAGE GATING                                           ║
 * ║                                                                               ║
 * ║   Fail-closed: if data isn't good enough, NO SCORE                           ║
 * ║                                                                               ║
 * ║   Gates:                                                                      ║
 * ║   - if coverageQS < minQS → no score                                         ║
 * ║   - if coverageOS < minOS → os null or gated                                 ║
 * ║   - if confidence < minConfidence → no score                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ScoringResult } from './scoring';
import type { CoverageResult } from './reliability';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type GateStatus = 'pass' | 'warn' | 'fail';

export interface GateCheckResult {
  /** Name of the gate */
  gate: string;
  /** Status: pass/warn/fail */
  status: GateStatus;
  /** Actual value */
  actual: number;
  /** Threshold value */
  threshold: number;
  /** Human-readable message */
  message: string;
}

export interface GatingResult {
  /** Can we produce a score at all? */
  canScore: boolean;
  /** Should OS be included? */
  includeOS: boolean;
  /** Overall confidence level (0-100) */
  confidence: number;
  /** Individual gate results */
  gates: GateCheckResult[];
  /** Reasons for gating */
  gateReasons: string[];
  /** Warnings (non-blocking) */
  warnings: string[];
}

export interface GatingConfig {
  /** Minimum QS coverage to produce score */
  minQSCoverage: number;
  /** Minimum OS coverage to include OS */
  minOSCoverage: number;
  /** Minimum Risk coverage to produce score */
  minRiskCoverage: number;
  /** Minimum overall confidence to produce score */
  minConfidence: number;
  /** Warning threshold for QS coverage */
  warnQSCoverage: number;
  /** Warning threshold for OS coverage */
  warnOSCoverage: number;
  /** Warning threshold for confidence */
  warnConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_GATING_CONFIG: GatingConfig = {
  minQSCoverage: 0.40,      // Need 40% of QS features
  minOSCoverage: 0.30,      // Need 30% of OS features
  minRiskCoverage: 0.30,    // Need 30% of Risk features
  minConfidence: 0.40,      // Need 40% overall confidence
  warnQSCoverage: 0.60,     // Warn below 60%
  warnOSCoverage: 0.50,     // Warn below 50%
  warnConfidence: 0.60,     // Warn below 60%
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfidenceFactors {
  /** QS coverage contribution */
  qsCoverage: number;
  /** OS coverage contribution */
  osCoverage: number;
  /** Risk coverage contribution */
  riskCoverage: number;
  /** Average data freshness (0-1) */
  freshness: number;
  /** Source agreement (0-1) */
  agreement: number;
  /** Anomaly penalty (0-1) */
  anomalyFactor: number;
}

/**
 * Calculate overall confidence score
 * 
 * confidence = weighted combination of coverage, freshness, agreement, anomalies
 */
export function calculateConfidence(factors: ConfidenceFactors): number {
  // Weights for each factor
  const weights = {
    qsCoverage: 0.30,
    osCoverage: 0.15,
    riskCoverage: 0.15,
    freshness: 0.20,
    agreement: 0.10,
    anomalyFactor: 0.10,
  };
  
  const confidence = 
    factors.qsCoverage * weights.qsCoverage +
    factors.osCoverage * weights.osCoverage +
    factors.riskCoverage * weights.riskCoverage +
    factors.freshness * weights.freshness +
    factors.agreement * weights.agreement +
    factors.anomalyFactor * weights.anomalyFactor;
  
  // Scale to 0-100
  return Math.max(0, Math.min(100, confidence * 100));
}

/**
 * Extract confidence factors from scoring result
 */
export function extractConfidenceFactors(result: ScoringResult): ConfidenceFactors {
  // Calculate average freshness from features
  const allFeatures = [
    ...result.qsResult.features,
    ...result.osResult.features,
    ...result.riskResult.features,
  ];
  
  const availableFeatures = allFeatures.filter(
    f => f.result.available && f.result.quality.freshnessHours !== Infinity
  );
  
  const avgFreshness = availableFeatures.length > 0
    ? availableFeatures.reduce((sum, f) => {
        // Convert freshness hours to 0-1 score (24h = 0.5, 48h = 0)
        const score = Math.max(0, 1 - f.result.quality.freshnessHours / 48);
        return sum + score;
      }, 0) / availableFeatures.length
    : 0;
  
  // Calculate average provider trust as proxy for agreement
  const avgTrust = availableFeatures.length > 0
    ? availableFeatures.reduce((sum, f) => sum + f.result.quality.confidence, 0) / availableFeatures.length
    : 0;
  
  // Anomaly factor based on warnings
  const totalWarnings = allFeatures.reduce(
    (sum, f) => sum + f.result.warnings.length,
    0
  );
  const anomalyFactor = Math.max(0, 1 - totalWarnings * 0.05);
  
  return {
    qsCoverage: result.qsResult.coverage.weightedCoverage,
    osCoverage: result.osResult.coverage.weightedCoverage,
    riskCoverage: result.riskResult.coverage.weightedCoverage,
    freshness: avgFreshness,
    agreement: avgTrust,
    anomalyFactor,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check QS coverage gate
 */
function checkQSCoverage(
  coverage: CoverageResult,
  config: GatingConfig
): GateCheckResult {
  const actual = coverage.weightedCoverage;
  
  if (actual < config.minQSCoverage) {
    return {
      gate: 'QS_COVERAGE',
      status: 'fail',
      actual,
      threshold: config.minQSCoverage,
      message: `QS coverage ${(actual * 100).toFixed(0)}% below minimum ${(config.minQSCoverage * 100).toFixed(0)}%`,
    };
  }
  
  if (actual < config.warnQSCoverage) {
    return {
      gate: 'QS_COVERAGE',
      status: 'warn',
      actual,
      threshold: config.warnQSCoverage,
      message: `QS coverage ${(actual * 100).toFixed(0)}% below warning threshold ${(config.warnQSCoverage * 100).toFixed(0)}%`,
    };
  }
  
  return {
    gate: 'QS_COVERAGE',
    status: 'pass',
    actual,
    threshold: config.minQSCoverage,
    message: `QS coverage ${(actual * 100).toFixed(0)}% OK`,
  };
}

/**
 * Check OS coverage gate
 */
function checkOSCoverage(
  coverage: CoverageResult,
  config: GatingConfig
): GateCheckResult {
  const actual = coverage.weightedCoverage;
  
  if (actual < config.minOSCoverage) {
    return {
      gate: 'OS_COVERAGE',
      status: 'fail',
      actual,
      threshold: config.minOSCoverage,
      message: `OS coverage ${(actual * 100).toFixed(0)}% below minimum ${(config.minOSCoverage * 100).toFixed(0)}%`,
    };
  }
  
  if (actual < config.warnOSCoverage) {
    return {
      gate: 'OS_COVERAGE',
      status: 'warn',
      actual,
      threshold: config.warnOSCoverage,
      message: `OS coverage ${(actual * 100).toFixed(0)}% below warning threshold ${(config.warnOSCoverage * 100).toFixed(0)}%`,
    };
  }
  
  return {
    gate: 'OS_COVERAGE',
    status: 'pass',
    actual,
    threshold: config.minOSCoverage,
    message: `OS coverage ${(actual * 100).toFixed(0)}% OK`,
  };
}

/**
 * Check Risk coverage gate
 */
function checkRiskCoverage(
  coverage: CoverageResult,
  config: GatingConfig
): GateCheckResult {
  const actual = coverage.weightedCoverage;
  
  if (actual < config.minRiskCoverage) {
    return {
      gate: 'RISK_COVERAGE',
      status: 'fail',
      actual,
      threshold: config.minRiskCoverage,
      message: `Risk coverage ${(actual * 100).toFixed(0)}% below minimum ${(config.minRiskCoverage * 100).toFixed(0)}%`,
    };
  }
  
  return {
    gate: 'RISK_COVERAGE',
    status: 'pass',
    actual,
    threshold: config.minRiskCoverage,
    message: `Risk coverage ${(actual * 100).toFixed(0)}% OK`,
  };
}

/**
 * Check confidence gate
 */
function checkConfidence(
  confidence: number,
  config: GatingConfig
): GateCheckResult {
  if (confidence < config.minConfidence * 100) {
    return {
      gate: 'CONFIDENCE',
      status: 'fail',
      actual: confidence,
      threshold: config.minConfidence * 100,
      message: `Confidence ${confidence.toFixed(0)}% below minimum ${(config.minConfidence * 100).toFixed(0)}%`,
    };
  }
  
  if (confidence < config.warnConfidence * 100) {
    return {
      gate: 'CONFIDENCE',
      status: 'warn',
      actual: confidence,
      threshold: config.warnConfidence * 100,
      message: `Confidence ${confidence.toFixed(0)}% below warning threshold ${(config.warnConfidence * 100).toFixed(0)}%`,
    };
  }
  
  return {
    gate: 'CONFIDENCE',
    status: 'pass',
    actual: confidence,
    threshold: config.minConfidence * 100,
    message: `Confidence ${confidence.toFixed(0)}% OK`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GATING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply all gates to a scoring result
 * 
 * Fail-closed: if data isn't good enough, NO SCORE
 */
export function applyGates(
  result: ScoringResult,
  config: GatingConfig = DEFAULT_GATING_CONFIG
): GatingResult {
  const gates: GateCheckResult[] = [];
  const gateReasons: string[] = [];
  const warnings: string[] = [];
  
  // Extract confidence factors and calculate confidence
  const factors = extractConfidenceFactors(result);
  const confidence = calculateConfidence(factors);
  
  // Check QS coverage
  const qsGate = checkQSCoverage(result.qsResult.coverage, config);
  gates.push(qsGate);
  if (qsGate.status === 'fail') {
    gateReasons.push(qsGate.message);
  } else if (qsGate.status === 'warn') {
    warnings.push(qsGate.message);
  }
  
  // Check OS coverage
  const osGate = checkOSCoverage(result.osResult.coverage, config);
  gates.push(osGate);
  if (osGate.status === 'fail') {
    gateReasons.push(osGate.message);
  } else if (osGate.status === 'warn') {
    warnings.push(osGate.message);
  }
  
  // Check Risk coverage
  const riskGate = checkRiskCoverage(result.riskResult.coverage, config);
  gates.push(riskGate);
  if (riskGate.status === 'fail') {
    gateReasons.push(riskGate.message);
  }
  
  // Check confidence
  const confGate = checkConfidence(confidence, config);
  gates.push(confGate);
  if (confGate.status === 'fail') {
    gateReasons.push(confGate.message);
  } else if (confGate.status === 'warn') {
    warnings.push(confGate.message);
  }
  
  // Determine final gating status
  const criticalGates = gates.filter(g => 
    g.gate === 'QS_COVERAGE' || g.gate === 'CONFIDENCE' || g.gate === 'RISK_COVERAGE'
  );
  const canScore = criticalGates.every(g => g.status !== 'fail');
  const includeOS = osGate.status !== 'fail';
  
  return {
    canScore,
    includeOS,
    confidence,
    gates,
    gateReasons,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATED RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface GatedScoringResult extends ScoringResult {
  /** Gating result */
  gating: GatingResult;
  /** Final POS (null if gated) */
  posFinal: number | null;
  /** Final OS (null if OS gated) */
  osFinal: number | null;
  /** Overall status */
  status: 'scored' | 'gated' | 'partial';
}

/**
 * Apply gates and produce final gated result
 */
export function produceGatedResult(
  result: ScoringResult,
  config: GatingConfig = DEFAULT_GATING_CONFIG
): GatedScoringResult {
  const gating = applyGates(result, config);
  
  let status: 'scored' | 'gated' | 'partial';
  let posFinal: number | null;
  let osFinal: number | null;
  
  if (!gating.canScore) {
    // Hard gate - no score at all
    status = 'gated';
    posFinal = null;
    osFinal = null;
  } else if (!gating.includeOS) {
    // Partial - OS gated
    status = 'partial';
    posFinal = result.pos.posRaw;
    osFinal = null;
  } else {
    // Full score
    status = 'scored';
    posFinal = result.pos.posRaw;
    osFinal = result.pos.os;
  }
  
  return {
    ...result,
    gating,
    posFinal,
    osFinal,
    status,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE LEVEL MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export function mapConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 80) return 'very_high';
  if (confidence >= 60) return 'high';
  if (confidence >= 40) return 'medium';
  if (confidence >= 20) return 'low';
  return 'very_low';
}

export const CONFIDENCE_LEVEL_DESCRIPTIONS: Record<ConfidenceLevel, string> = {
  very_high: 'Excellent data quality with comprehensive coverage',
  high: 'Good data quality with most features available',
  medium: 'Acceptable data quality but some gaps',
  low: 'Limited data available, interpret with caution',
  very_low: 'Insufficient data for reliable scoring',
};
