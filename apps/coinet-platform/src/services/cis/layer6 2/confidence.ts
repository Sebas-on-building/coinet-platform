/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 6 - CONFIDENCE CALCULATION ENGINE                           ║
 * ║                                                                               ║
 * ║   THE HONESTY LAYER                                                           ║
 * ║                                                                               ║
 * ║   Formula: C = Σ(wᵢ × Qᵢ)                                                     ║
 * ║                                                                               ║
 * ║   Where:                                                                      ║
 * ║   - Q_AG (0.40): Agreement Factor from Layer 3                               ║
 * ║   - Q_VAL (0.30): Validation Status from Layer 4                             ║
 * ║   - Q_STALE (0.15): Staleness Penalty from Layer 1                           ║
 * ║   - Q_COV (0.15): Coverage Factor from Layer 3                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  ConfidenceInput,
  ConfidenceScore,
  AgreementFactorInput,
  ValidationFactorInput,
  StalenessInput,
  CoverageFactorInput,
  GateCheckResult,
  GateAssessment,
} from './types';
import {
  CONFIDENCE_WEIGHTS,
  HARD_GATE_THRESHOLDS,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Agreement Factor (Q_AG)
 * 
 * Derivation: 1 - (Dispute Count / Total High-Impact Metrics)
 * Weight: 0.40
 */
export function calculateAgreementFactor(input: AgreementFactorInput): number {
  if (input.total_high_impact_metrics === 0) {
    return 1.0; // No metrics = no disputes
  }
  
  const disputeRatio = input.dispute_count / input.total_high_impact_metrics;
  const factor = Math.max(0, Math.min(1, 1 - disputeRatio));
  
  return factor;
}

/**
 * Calculate Validation Status Factor (Q_VAL)
 * 
 * Derivation: 1 - (FAIL/GATED Count / Total Metrics)
 * Weight: 0.30
 */
export function calculateValidationFactor(input: ValidationFactorInput): number {
  if (input.total_metrics === 0) {
    return 0; // No metrics = no validation = low confidence
  }
  
  const failRatio = input.fail_gated_count / input.total_metrics;
  const factor = Math.max(0, Math.min(1, 1 - failRatio));
  
  return factor;
}

/**
 * Calculate Staleness Penalty (Q_STALE)
 * 
 * Penalty function based on observation latency
 * Weight: 0.15
 */
export function calculateStalenessFactor(input: StalenessInput): number {
  // Define staleness thresholds (in seconds)
  const FRESH_THRESHOLD = 300;      // 5 minutes - no penalty
  const ACCEPTABLE_THRESHOLD = 3600; // 1 hour - minor penalty
  const STALE_THRESHOLD = 86400;    // 24 hours - significant penalty
  
  const avgAge = input.average_age_seconds;
  
  // Calculate base penalty from average age
  let baseFactor: number;
  
  if (avgAge <= FRESH_THRESHOLD) {
    baseFactor = 1.0; // Perfect freshness
  } else if (avgAge <= ACCEPTABLE_THRESHOLD) {
    // Linear decay from 1.0 to 0.9
    const ratio = (avgAge - FRESH_THRESHOLD) / (ACCEPTABLE_THRESHOLD - FRESH_THRESHOLD);
    baseFactor = 1.0 - (0.1 * ratio);
  } else if (avgAge <= STALE_THRESHOLD) {
    // Faster decay from 0.9 to 0.5
    const ratio = (avgAge - ACCEPTABLE_THRESHOLD) / (STALE_THRESHOLD - ACCEPTABLE_THRESHOLD);
    baseFactor = 0.9 - (0.4 * ratio);
  } else {
    // Expired - severe penalty
    baseFactor = 0.3;
  }
  
  // Additional penalty for proportion of stale metrics
  if (input.total_metrics > 0) {
    const staleRatio = input.stale_count / input.total_metrics;
    baseFactor *= (1 - staleRatio * 0.3); // Up to 30% additional penalty
  }
  
  return Math.max(0, Math.min(1, baseFactor));
}

/**
 * Calculate Coverage Factor (Q_COV)
 * 
 * Derivation: Min(1.0, Source Count / Min Required Sources)
 * Weight: 0.15
 */
export function calculateCoverageFactor(input: CoverageFactorInput): number {
  const sourceCounts = Object.values(input.source_counts);
  
  if (sourceCounts.length === 0) {
    return 0; // No metrics = no coverage
  }
  
  // Calculate average source coverage
  let totalSourceCoverage = 0;
  
  for (const count of sourceCounts) {
    const metricCoverage = Math.min(1, count / input.min_required_sources);
    totalSourceCoverage += metricCoverage;
  }
  
  const avgSourceCoverage = totalSourceCoverage / sourceCounts.length;
  
  // Weight by critical metrics coverage
  const criticalWeight = 0.6;
  const generalWeight = 0.4;
  
  const factor = 
    input.critical_metrics_coverage * criticalWeight +
    avgSourceCoverage * generalWeight;
  
  return Math.max(0, Math.min(1, factor));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONFIDENCE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the complete Confidence Score
 * 
 * Formula: C = Σ(wᵢ × Qᵢ)
 * 
 * C = 0.40 × Q_AG + 0.30 × Q_VAL + 0.15 × Q_STALE + 0.15 × Q_COV
 */
export function calculateConfidenceScore(input: ConfidenceInput): ConfidenceScore {
  const now = new Date().toISOString();
  const warnings: string[] = [];
  
  // Calculate individual factors
  const q_agreement = calculateAgreementFactor(input.agreement);
  const q_validation = calculateValidationFactor(input.validation);
  const q_staleness = calculateStalenessFactor(input.staleness);
  const q_coverage = calculateCoverageFactor(input.coverage);
  
  // Calculate weighted contributions
  const agreement_contribution = q_agreement * CONFIDENCE_WEIGHTS.W_AGREEMENT;
  const validation_contribution = q_validation * CONFIDENCE_WEIGHTS.W_VALIDATION;
  const staleness_contribution = q_staleness * CONFIDENCE_WEIGHTS.W_STALENESS;
  const coverage_contribution = q_coverage * CONFIDENCE_WEIGHTS.W_COVERAGE;
  
  // Calculate final confidence score (0-100)
  const rawConfidence = 
    agreement_contribution +
    validation_contribution +
    staleness_contribution +
    coverage_contribution;
  
  const confidence_score = Math.round(rawConfidence * 100);
  
  // Check gates
  const confidenceGatePassed = confidence_score >= HARD_GATE_THRESHOLDS.CONFIDENCE_GATE;
  const coverageGatePassed = input.coverage.critical_metrics_coverage >= HARD_GATE_THRESHOLDS.COVERAGE_GATE;
  const identityGatePassed = input.identity_confidence >= HARD_GATE_THRESHOLDS.IDENTITY_GATE;
  
  const canProduceOutput = confidenceGatePassed && coverageGatePassed && identityGatePassed;
  
  // Determine gate failure reason
  let gateFailureReason: string | null = null;
  
  if (!identityGatePassed) {
    gateFailureReason = `Identity confidence ${input.identity_confidence}% < ${HARD_GATE_THRESHOLDS.IDENTITY_GATE}% threshold. Asset classification is ambiguous.`;
  } else if (!coverageGatePassed) {
    gateFailureReason = `Critical metrics coverage ${(input.coverage.critical_metrics_coverage * 100).toFixed(0)}% < ${HARD_GATE_THRESHOLDS.COVERAGE_GATE * 100}% threshold. Missing critical data.`;
  } else if (!confidenceGatePassed) {
    gateFailureReason = `Confidence score ${confidence_score}% < ${HARD_GATE_THRESHOLDS.CONFIDENCE_GATE}% threshold. Data quality insufficient.`;
  }
  
  // Add warnings
  if (confidence_score < HARD_GATE_THRESHOLDS.CONFIDENCE_WARNING && confidenceGatePassed) {
    warnings.push(`Confidence score ${confidence_score}% is below warning threshold ${HARD_GATE_THRESHOLDS.CONFIDENCE_WARNING}%`);
  }
  
  if (input.coverage.critical_metrics_coverage < HARD_GATE_THRESHOLDS.COVERAGE_WARNING && coverageGatePassed) {
    warnings.push(`Critical metrics coverage ${(input.coverage.critical_metrics_coverage * 100).toFixed(0)}% is below warning threshold ${HARD_GATE_THRESHOLDS.COVERAGE_WARNING * 100}%`);
  }
  
  if (q_staleness < 0.7) {
    warnings.push(`Data freshness is degraded (staleness factor: ${(q_staleness * 100).toFixed(0)}%)`);
  }
  
  if (q_agreement < 0.8) {
    warnings.push(`Source agreement is low (${(q_agreement * 100).toFixed(0)}%). Multiple sources disagree.`);
  }
  
  // Determine confidence level
  let confidence_level: ConfidenceScore['confidence_level'];
  
  if (!canProduceOutput) {
    confidence_level = 'INSUFFICIENT';
  } else if (confidence_score >= 90) {
    confidence_level = 'HIGH';
  } else if (confidence_score >= 75) {
    confidence_level = 'MEDIUM';
  } else {
    confidence_level = 'LOW';
  }
  
  return {
    entity_id: input.entity_id,
    confidence_score,
    factor_scores: {
      q_agreement,
      q_validation,
      q_staleness,
      q_coverage,
    },
    weighted_contributions: {
      agreement_contribution: Math.round(agreement_contribution * 100),
      validation_contribution: Math.round(validation_contribution * 100),
      staleness_contribution: Math.round(staleness_contribution * 100),
      coverage_contribution: Math.round(coverage_contribution * 100),
    },
    identity_confidence: input.identity_confidence,
    critical_coverage: input.coverage.critical_metrics_coverage,
    gate_status: {
      confidence_gate_passed: confidenceGatePassed,
      coverage_gate_passed: coverageGatePassed,
      identity_gate_passed: identityGatePassed,
      can_produce_output: canProduceOutput,
      gate_failure_reason: gateFailureReason,
    },
    warnings,
    confidence_level,
    calculated_at: now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check a single gate
 */
function checkGate(
  gate: 'CONFIDENCE' | 'COVERAGE' | 'IDENTITY',
  actualValue: number,
  threshold: number,
  isPercentage: boolean = true
): GateCheckResult {
  const passed = actualValue >= threshold;
  const deficit = passed ? 0 : threshold - actualValue;
  
  const formatValue = (v: number) => isPercentage ? `${v.toFixed(0)}%` : v.toFixed(2);
  
  return {
    gate,
    passed,
    actual_value: actualValue,
    threshold,
    deficit,
    message: passed
      ? `${gate} gate PASSED: ${formatValue(actualValue)} ≥ ${formatValue(threshold)}`
      : `${gate} gate FAILED: ${formatValue(actualValue)} < ${formatValue(threshold)} (deficit: ${formatValue(deficit)})`,
  };
}

/**
 * Perform complete gate assessment
 */
export function assessGates(
  confidenceScore: number,
  criticalCoverage: number,
  identityConfidence: number,
  entityId: string
): GateAssessment {
  const gates: GateCheckResult[] = [
    checkGate('CONFIDENCE', confidenceScore, HARD_GATE_THRESHOLDS.CONFIDENCE_GATE),
    checkGate('COVERAGE', criticalCoverage * 100, HARD_GATE_THRESHOLDS.COVERAGE_GATE * 100),
    checkGate('IDENTITY', identityConfidence, HARD_GATE_THRESHOLDS.IDENTITY_GATE),
  ];
  
  const allGatesPassed = gates.every(g => g.passed);
  
  // Find primary failure (in priority order)
  const priorityOrder: Array<'IDENTITY' | 'COVERAGE' | 'CONFIDENCE'> = 
    ['IDENTITY', 'COVERAGE', 'CONFIDENCE'];
  
  let primaryFailure: string | null = null;
  
  for (const priority of priorityOrder) {
    const gate = gates.find(g => g.gate === priority);
    if (gate && !gate.passed) {
      primaryFailure = gate.message;
      break;
    }
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  for (const gate of gates) {
    if (!gate.passed) {
      switch (gate.gate) {
        case 'IDENTITY':
          recommendations.push('Improve asset classification by adding more provider data or manual review');
          recommendations.push('Verify asset category is correctly identified');
          break;
        case 'COVERAGE':
          recommendations.push('Increase data source coverage for critical metrics');
          recommendations.push('Add fallback data providers for missing metrics');
          break;
        case 'CONFIDENCE':
          recommendations.push('Resolve data source disputes');
          recommendations.push('Refresh stale metrics');
          recommendations.push('Fix validation failures');
          break;
      }
    }
  }
  
  return {
    entity_id: entityId,
    gates,
    all_gates_passed: allGatesPassed,
    primary_failure: primaryFailure,
    recommendations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE FROM LAYER RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build confidence input from Layer 3 and Layer 4 results
 * 
 * This helper extracts the required inputs from the reconciliation
 * and validation results of previous layers.
 */
export function buildConfidenceInput(
  entityId: string,
  reconciliationResults: Array<{
    metric_id: string;
    dispute_status: string;
    agreement_score: number;
    source_count: number;
  }>,
  validationResults: Array<{
    metric_id: string;
    status: string;
    staleness_seconds?: number;
  }>,
  identityConfidence: number,
  criticalMetricIds: string[]
): ConfidenceInput {
  // Agreement factor inputs
  const highImpactMetrics = reconciliationResults.filter(r => 
    ['price', 'volume', 'supply', 'tvl'].some(p => r.metric_id.includes(p))
  );
  const disputeCount = highImpactMetrics.filter(r => 
    r.dispute_status === 'DISPUTED' || r.dispute_status === 'SEVERE_DISPUTE'
  ).length;
  
  const metricAgreements: Record<string, number> = {};
  for (const r of reconciliationResults) {
    metricAgreements[r.metric_id] = r.agreement_score;
  }
  
  // Validation factor inputs
  const failGatedCount = validationResults.filter(r => 
    r.status === 'GATED' || r.status === 'INVALID'
  ).length;
  
  const metricStatuses: Record<string, 'PASS' | 'WARN' | 'FAIL' | 'GATED'> = {};
  for (const r of validationResults) {
    metricStatuses[r.metric_id] = r.status as any;
  }
  
  // Staleness inputs
  const stalenessValues = validationResults
    .filter(r => r.staleness_seconds !== undefined)
    .map(r => r.staleness_seconds!);
  
  const avgAge = stalenessValues.length > 0
    ? stalenessValues.reduce((a, b) => a + b, 0) / stalenessValues.length
    : 0;
  const maxAge = stalenessValues.length > 0
    ? Math.max(...stalenessValues)
    : 0;
  const staleCount = stalenessValues.filter(s => s > 3600).length;
  
  // Coverage inputs
  const sourceCounts: Record<string, number> = {};
  for (const r of reconciliationResults) {
    sourceCounts[r.metric_id] = r.source_count;
  }
  
  const criticalPresent = criticalMetricIds.filter(m => 
    reconciliationResults.some(r => r.metric_id === m)
  ).length;
  const criticalCoverage = criticalMetricIds.length > 0
    ? criticalPresent / criticalMetricIds.length
    : 1.0;
  
  return {
    entity_id: entityId,
    agreement: {
      dispute_count: disputeCount,
      total_high_impact_metrics: highImpactMetrics.length,
      metric_agreements: metricAgreements,
    },
    validation: {
      fail_gated_count: failGatedCount,
      total_metrics: validationResults.length,
      metric_statuses: metricStatuses,
    },
    staleness: {
      average_age_seconds: avgAge,
      max_age_seconds: maxAge,
      stale_count: staleCount,
      total_metrics: validationResults.length,
    },
    coverage: {
      source_counts: sourceCounts,
      min_required_sources: 2,
      critical_metrics_coverage: criticalCoverage,
    },
    identity_confidence: identityConfidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK CONFIDENCE CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick check: Can we produce output for this entity?
 */
export function canProduceOutput(
  confidenceScore: number,
  criticalCoverage: number,
  identityConfidence: number
): { canProduce: boolean; reason: string | null } {
  if (identityConfidence < HARD_GATE_THRESHOLDS.IDENTITY_GATE) {
    return {
      canProduce: false,
      reason: `Identity confidence ${identityConfidence}% below ${HARD_GATE_THRESHOLDS.IDENTITY_GATE}% threshold`,
    };
  }
  
  if (criticalCoverage < HARD_GATE_THRESHOLDS.COVERAGE_GATE) {
    return {
      canProduce: false,
      reason: `Critical coverage ${(criticalCoverage * 100).toFixed(0)}% below ${HARD_GATE_THRESHOLDS.COVERAGE_GATE * 100}% threshold`,
    };
  }
  
  if (confidenceScore < HARD_GATE_THRESHOLDS.CONFIDENCE_GATE) {
    return {
      canProduce: false,
      reason: `Confidence score ${confidenceScore}% below ${HARD_GATE_THRESHOLDS.CONFIDENCE_GATE}% threshold`,
    };
  }
  
  return { canProduce: true, reason: null };
}
