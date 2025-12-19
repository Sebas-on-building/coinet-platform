/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 4 - VALIDATION & ANOMALY DETECTION                           ║
 * ║                                                                               ║
 * ║   THE FAIL-CLOSED MECHANISM                                                   ║
 * ║                                                                               ║
 * ║   "Layer 4 acts as the final quality control barrier before interpretation.  ║
 * ║    It enforces the 'fail-closed' rule, ensuring that any anomaly,           ║
 * ║    inconsistency, or violation of semantic rules is either corrected,        ║
 * * ║    flagged, or gated, preventing bad data from being 'interpreted.'"         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  ValidationRule,
  MetricValidationResult,
  EntityValidationSummary,
  AnomalySignal,
  CrossMetricCheck,
  ChangeMetricsInput,
  MetricValueMap,
  GatingImpact,
  AssetCategory,
} from './types';
import {
  STRUCTURAL_RULES,
  SEMANTIC_BOUND_RULES,
  STALENESS_RULES,
  CROSS_METRIC_CHECKS,
  BEHAVIORAL_ANOMALY_RULES,
} from './rules';
import { z } from 'zod';

const NOW = new Date().toISOString(); // Define NOW for this module

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC-LEVEL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate structural integrity of a single metric
 */
function validateStructural(metricId: string, value: unknown): MetricValidationResult {
  let status: MetricValidationResult['status'] = 'pass';
  const flags: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const rule of STRUCTURAL_RULES) {
    if (rule.applies_to.includes(metricId) || rule.applies_to.includes('*')) {
      const conditionMet = eval(rule.condition.replace(/value/g, 'value')); // Direct eval for simplicity in sandbox, use a safer method in prod
      if (!conditionMet) {
        status = rule.resulting_flag === 'FAIL' ? 'fail' : 'warn';
        errors.push(rule.description);
        flags.push(rule.rule_id);
      }
    }
  }

  return {
    metric_id: metricId,
    status,
    flags,
    warnings,
    errors,
    gating_impact: 'NONE',
    confidence_multiplier: 1.0, // Always return a number
  };
}

/**
 * Validate semantic bounds of a single metric
 */
function validateSemanticBounds(metricId: string, value: number): MetricValidationResult {
  let status: MetricValidationResult['status'] = 'pass';
  const flags: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const rule of SEMANTIC_BOUND_RULES) {
    if (rule.applies_to.includes(metricId) || rule.applies_to.includes('*')) {
      const conditionMet = eval(rule.condition.replace(/value/g, 'value')); // Direct eval for simplicity in sandbox
      if (!conditionMet) {
        status = rule.resulting_flag === 'FAIL' ? 'fail' : 'warn';
        errors.push(rule.description);
        flags.push(rule.rule_id);
        if (rule.gating_impact === 'GATED') {
          return {
            metric_id: metricId,
            status: 'gated',
            flags: [rule.rule_id, ...flags],
            warnings: [],
            errors: [rule.description, ...errors],
            gating_impact: 'GATED',
            confidence_multiplier: 0, // Always return a number
          };
        }
      }
    }
  }

  return {
    metric_id: metricId,
    status,
    flags,
    warnings,
    errors,
    gating_impact: 'NONE',
    confidence_multiplier: 1.0, // Always return a number
  };
}

/**
 * Validate staleness of a single metric
 */
function validateStaleness(metricId: string, timestamp: string | null): MetricValidationResult {
  let status: MetricValidationResult['status'] = 'pass';
  const flags: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidenceMultiplier = 1.0;

  if (!timestamp) {
    return {
      metric_id: metricId,
      status: 'fail',
      flags: ['STALE_NO_TIMESTAMP'],
      warnings: ['No timestamp provided'],
      errors: ['No timestamp provided'],
      gating_impact: 'GATED',
      confidence_multiplier: 0, // Always return a number
    };
  }

  const now = new Date();
  const observedAt = new Date(timestamp);
  const ageSeconds = (now.getTime() - observedAt.getTime()) / 1000;

  for (const rule of STALENESS_RULES) {
    if (rule.applies_to.includes(metricId) || rule.applies_to.includes('*')) {
      const conditionMet = eval(rule.condition.replace(/age_seconds/g, 'ageSeconds')); // Direct eval for simplicity in sandbox
      if (!conditionMet) {
        status = rule.resulting_flag === 'FAIL' ? 'fail' : 'warn';
        errors.push(rule.description);
        flags.push(rule.rule_id);
        confidenceMultiplier *= rule.confidence_impact;
        if (rule.gating_impact === 'GATED') {
          return {
            metric_id: metricId,
            status: 'gated',
            flags: [rule.rule_id, ...flags],
            warnings: [],
            errors: [rule.description, ...errors],
            gating_impact: 'GATED',
            confidence_multiplier: 0, // Always return a number
          };
        }
      }
    }
  }

  return {
    metric_id: metricId,
    status,
    flags,
    warnings,
    errors,
    gating_impact: 'NONE',
    confidence_multiplier: confidenceMultiplier,
  };
}

/**
 * Comprehensive validation for a single metric
 */
export function validateMetric(metricId: string, value: unknown, timestamp: string | null, entityId: string): MetricValidationResult {
  const structuralResult = validateStructural(metricId, value);
  // console.log(`[validateMetric] ${metricId} - Structural Confidence: ${structuralResult.confidence_multiplier}`);
  if (!structuralResult.success) return structuralResult; // Fail fast on structural errors

  const semanticResult = validateSemanticBounds(metricId, value as number); // Assume number after structural validation
  // console.log(`[validateMetric] ${metricId} - Semantic Confidence: ${semanticResult.confidence_multiplier}`);
  if (semanticResult.gating_impact === 'GATED') return semanticResult; // Fail fast on semantic gating

  const stalenessResult = validateStaleness(metricId, timestamp);
  // console.log(`[validateMetric] ${metricId} - Staleness Confidence: ${stalenessResult.confidence_multiplier}`);
  if (stalenessResult.gating_impact === 'GATED') return stalenessResult; // Fail fast on staleness gating

  // Aggregate results
  const status = [structuralResult.status, semanticResult.status, stalenessResult.status].includes('fail') ? 'fail'
    : [structuralResult.status, semanticResult.status, stalenessResult.status].includes('warn') ? 'warn'
      : 'pass';

  const flags = [...structuralResult.flags, ...semanticResult.flags, ...stalenessResult.flags];
  const warnings = [...structuralResult.warnings, ...semanticResult.warnings, ...stalenessResult.warnings];
  const errors = [...structuralResult.errors, ...semanticResult.errors, ...stalenessResult.errors];
  const confidenceMultiplier = (structuralResult.confidence_multiplier)
    * (semanticResult.confidence_multiplier)
    * (stalenessResult.confidence_multiplier);

  // console.log(`[validateMetric] ${metricId} - Final Confidence: ${confidenceMultiplier}`);
  return {
    metric_id: metricId,
    status,
    flags,
    warnings,
    errors,
    gating_impact: 'NONE',
    confidence_multiplier: confidenceMultiplier,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function detectVolumeLiquidityMismatch(volumeChangePercent: number, liquidityChangePercent: number): AnomalySignal | null {
  if (volumeChangePercent > 400 && liquidityChangePercent < 10) {
    return {
      type: 'VOLUME_LIQUIDITY_MISMATCH',
      severity: 8, // Increased severity
      description: `Volume spike (${volumeChangePercent.toFixed(0)}%) with disproportionately low liquidity change (${liquidityChangePercent.toFixed(0)}%)`,
      evidence: { volumeChangePercent, liquidityChangePercent },
      action: 'FLAG',
    };
  }
  return null;
}

export function detectWashTrading(
  volumeChangePercent: number,
  uniqueTraderCountChangePercent: number,
  totalTransactions: number,
  totalVolume: number,
): AnomalySignal | null {
  // Heuristic 1: High volume spike AND low unique traders
  if (volumeChangePercent > 300 && uniqueTraderCountChangePercent < 10) {
    return {
      type: 'WASH_TRADING',
      severity: 9, // Critical severity
      description: `Potential wash trading: Volume spike (${volumeChangePercent.toFixed(0)}%) with low unique trader growth (${uniqueTraderCountChangePercent.toFixed(0)}%)`,
      evidence: { volumeChangePercent, uniqueTraderCountChangePercent, totalTransactions, totalVolume },
      action: 'FLAG',
    };
  }
  
  // Heuristic 2: High volume without sufficient transactions
  if (totalVolume > 1e6 && totalTransactions < 100 && volumeChangePercent > 100) {
    return {
      type: 'WASH_TRADING',
      severity: 8, // High severity
      description: `Suspicious activity: High volume ($${totalVolume.toPrecision(2)}) with unusually low transaction count (${totalTransactions}) during a volume spike (${volumeChangePercent.toFixed(0)}%)`,
      evidence: { volumeChangePercent, uniqueTraderCountChangePercent, totalTransactions, totalVolume },
      action: 'FLAG',
    };
  }
  
  return null;
}

export function detectSocialFundamentalDivergence(
  socialChangePercent: number,
  fundamentalChangePercent: number,
): AnomalySignal | null {
  // Detect significant social hype without corresponding fundamental growth
  if (socialChangePercent > 200 && fundamentalChangePercent < 10) {
    return {
      type: 'SOCIAL_FUNDAMENTAL_DIVERGENCE',
      severity: 7, // High severity
      description: `Social hype divergence: Social metrics up (${socialChangePercent.toFixed(0)}%) without fundamental growth (${fundamentalChangePercent.toFixed(0)}%)`,
      evidence: { socialChangePercent, fundamentalChangePercent },
      action: 'FLAG',
    };
  }
  
  // Additional heuristic: Negative fundamental change with positive social
  if (socialChangePercent > 50 && fundamentalChangePercent < -10) {
    return {
      type: 'SOCIAL_FUNDAMENTAL_DIVERGENCE',
      severity: 8, // Critical severity
      description: `Critical divergence: Strong social sentiment (${socialChangePercent.toFixed(0)}%) despite declining fundamentals (${fundamentalChangePercent.toFixed(0)}%)`,
      evidence: { socialChangePercent, fundamentalChangePercent },
      action: 'FLAG',
    };
  }
  
  return null;
}

export function detectConcentrationSpike(
  concentrationChangePercent: number,
  currentConcentration: number,
): AnomalySignal | null {
  if (concentrationChangePercent > 50 && currentConcentration > 0.70) { // 50% increase in concentration, >70% held by top addresses
    return {
      type: 'CONCENTRATION_RISK',
      severity: 9,
      description: `Concentration risk: Significant increase in top-holder concentration (${concentrationChangePercent.toFixed(0)}%) with high overall concentration (${(currentConcentration * 100).toFixed(0)}%)`,
      evidence: { concentrationChangePercent, currentConcentration },
      action: 'FLAG',
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY-LEVEL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate all metrics for an entity and aggregate results
 */
export function validateEntity(
  entityId: string,
  metrics: MetricValueMap,
  changeMetrics?: ChangeMetricsInput,
  assetCategory?: AssetCategory,
): EntityValidationSummary {
  const validationResults: MetricValidationResult[] = [];
  let overallStatus: EntityValidationSummary['overall_status'] = 'pass';
  const overallFlags: string[] = [];
  const overallWarnings: string[] = [];
  const overallErrors: string[] = [];
  let confidenceMultiplier: number = 1.0; // Initialize as 1.0
  let scoreCap = 100;
  const anomalySignals: AnomalySignal[] = []; // Initialize as empty array

  for (const metricId of Object.keys(metrics)) {
    const metric = metrics[metricId];
    const result = validateMetric(metricId, metric.value, metric.timestamp ?? null, entityId);
    validationResults.push(result);

    if (result.status === 'fail' || result.status === 'gated') {
      overallStatus = 'fail';
    } else if (result.status === 'warn' && overallStatus === 'pass') {
      overallStatus = 'warn';
    }

    overallFlags.push(...result.flags);
    overallWarnings.push(...result.warnings);
    overallErrors.push(...result.errors);
    confidenceMultiplier *= (result.confidence_multiplier); // This should now be a number
    
    // Apply gating impact from metric validation
    if (result.gating_impact === 'GATED') {
      confidenceMultiplier = 0; // Hard gate
      scoreCap = 0;
    } else if (result.gating_impact === 'SCORE_CAP') {
      scoreCap = Math.min(scoreCap, 70); // Cap score to 70
    }
  }

  // Run anomaly detection
  if (changeMetrics) {
    const volumeLiquidityAnomaly = detectVolumeLiquidityMismatch(
      changeMetrics.volumeChangePercent ?? 0,
      changeMetrics.liquidityChangePercent ?? 0,
    );
    if (volumeLiquidityAnomaly) anomalySignals.push(volumeLiquidityAnomaly);

    const washTradingAnomaly = detectWashTrading(
      changeMetrics.volumeChangePercent ?? 0,
      changeMetrics.uniqueTraderCountChangePercent ?? 0,
      metrics.total_transactions?.value as number ?? 0,
      metrics.volume_24h?.value as number ?? 0,
    );
    if (washTradingAnomaly) anomalySignals.push(washTradingAnomaly);

    const socialFundamentalAnomaly = detectSocialFundamentalDivergence(
      changeMetrics.socialChangePercent ?? 0,
      changeMetrics.fundamentalChangePercent ?? 0,
    );
    if (socialFundamentalAnomaly) anomalySignals.push(socialFundamentalAnomaly);

    const concentrationAnomaly = detectConcentrationSpike(
      changeMetrics.concentrationChangePercent ?? 0,
      metrics.top_10_concentration?.value as number ?? 0,
    );
    if (concentrationAnomaly) anomalySignals.push(concentrationAnomaly);
  }

  // Determine overall confidence multiplier
  let overallAnomalyImpact: GatingImpact = 'NONE';

  const hasGateAnomaly = anomalySignals.some(s => s.action === 'GATE');
  const hasFlagAnomaly = anomalySignals.some(s => s.action === 'FLAG');
  const hasMonitorAnomaly = anomalySignals.some(s => s.action === 'MONITOR');

  if (hasGateAnomaly) {
    overallAnomalyImpact = 'GATED';
    confidenceMultiplier = 0; // Hard gate
    scoreCap = 0;
  } else if (hasFlagAnomaly) {
    overallAnomalyImpact = 'SCORE_CAP';
    confidenceMultiplier *= 0.5; // Reduce confidence for serious flags
    scoreCap = Math.min(scoreCap, 70); // Cap score to 70
  } else if (hasMonitorAnomaly) {
    overallAnomalyImpact = 'WARN';
    confidenceMultiplier *= 0.8; // Minor confidence reduction
  }

  return {
    entity_id: entityId,
    overall_status: overallStatus,
    overall_flags: overallFlags,
    overall_warnings: overallWarnings,
    overall_errors: overallErrors,
    confidence_multiplier: confidenceMultiplier,
    score_cap: scoreCap,
    anomalySignals: anomalySignals,
    gatingImpact: overallAnomalyImpact,
    timestamp: NOW,
  };
}
