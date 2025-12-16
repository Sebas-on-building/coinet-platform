/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 4 - VALIDATION & ANOMALY DETECTION                          ║
 * ║                                                                               ║
 * ║   THE FAIL-CLOSED MECHANISM                                                   ║
 * ║                                                                               ║
 * ║   "Layer 4 acts as the final quality control barrier before interpretation.  ║
 * ║    It enforces the 'fail-closed' rule, ensuring that any anomaly,            ║
 * ║    inconsistency, or violation of semantic rules is either corrected,        ║
 * ║    flagged, or gated."                                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const CIS_LAYER4_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rule type classification
 */
export type RuleType =
  | 'STRUCTURAL'           // Data type, format, completeness
  | 'SEMANTIC_BOUND'       // Hard economic/mathematical limits
  | 'CROSS_METRIC'         // Consistency between related metrics
  | 'BEHAVIORAL_ANOMALY'   // Manipulation/wash trading signals
  | 'STALENESS'            // Time-based freshness
  | 'RECONCILIATION';      // Multi-source disagreement

/**
 * Quality flag resulting from validation
 */
export type ValidationFlag =
  | 'PASS'                 // All checks passed
  | 'WARN'                 // Minor issue, proceed with caution
  | 'SUSPICIOUS'           // Potential manipulation, cap score
  | 'STALE'                // Data freshness issue
  | 'FAIL'                 // Critical failure, must gate
  | 'DISPUTED';            // Multi-source disagreement

/**
 * Gating impact from validation failure
 */
export type GatingImpact =
  | 'NONE'                 // No impact, informational only
  | 'WARN'                 // Warning logged, scoring continues
  | 'CONFIDENCE_REDUCE'    // Reduce confidence score
  | 'SCORE_CAP'            // Cap final score at threshold
  | 'METRIC_EXCLUDE'       // Exclude this metric from scoring
  | 'CATEGORY_GATE'        // Gate entire category (QS/OS/Risk)
  | 'GATED';               // Hard gate - no score output

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULE SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Individual validation rule specification
 */
export interface ValidationRule {
  /** Unique rule identifier */
  rule_id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Rule type */
  type: RuleType;
  
  /** Metric ID(s) this rule applies to (empty = all) */
  applies_to: string[];
  
  /** Description of the validation logic */
  description: string;
  
  /** The condition/expression (human-readable) */
  condition: string;
  
  /** Flag raised if rule fails */
  resulting_flag: ValidationFlag;
  
  /** Gating impact if rule fails */
  gating_impact: GatingImpact;
  
  /** Severity (1-10) */
  severity: number;
  
  /** Is this rule enabled? */
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of a single rule check
 */
export interface RuleCheckResult {
  /** Rule ID */
  rule_id: string;
  
  /** Did the check pass? */
  passed: boolean;
  
  /** Resulting flag */
  flag: ValidationFlag;
  
  /** Gating impact */
  impact: GatingImpact;
  
  /** Detail message */
  message: string;
  
  /** Actual value(s) checked */
  actual_values: Record<string, number | string | boolean | null>;
  
  /** Expected/threshold value(s) */
  expected: Record<string, number | string | boolean | null>;
}

/**
 * Complete validation result for a metric
 */
export interface MetricValidationResult {
  /** Metric ID */
  metric_id: string;
  
  /** Entity ID */
  entity_id: string;
  
  /** Overall status */
  status: 'VALID' | 'WARNING' | 'SUSPICIOUS' | 'INVALID' | 'GATED';
  
  /** All rule checks performed */
  rule_checks: RuleCheckResult[];
  
  /** Failed rule IDs */
  failed_rules: string[];
  
  /** Warning rule IDs */
  warning_rules: string[];
  
  /** Most severe flag encountered */
  worst_flag: ValidationFlag;
  
  /** Most severe gating impact */
  worst_impact: GatingImpact;
  
  /** Confidence multiplier (0-1) */
  confidence_multiplier: number;
  
  /** Score cap (if applicable) */
  score_cap: number | null;
  
  /** Should this metric be excluded from scoring? */
  exclude_from_scoring: boolean;
  
  /** Should the final score be gated? */
  gate_final_score: boolean;
  
  /** Validation timestamp */
  validated_at: string;
}

/**
 * Entity-level validation summary
 */
export interface EntityValidationSummary {
  /** Entity ID */
  entity_id: string;
  
  /** Overall entity status */
  status: 'HEALTHY' | 'DEGRADED' | 'SUSPICIOUS' | 'GATED';
  
  /** Total metrics validated */
  total_metrics: number;
  
  /** Metrics by status */
  metrics_by_status: {
    valid: number;
    warning: number;
    suspicious: number;
    invalid: number;
    gated: number;
  };
  
  /** Individual metric results */
  metric_results: MetricValidationResult[];
  
  /** Aggregated confidence multiplier */
  confidence_multiplier: number;
  
  /** Final score cap (minimum of all caps) */
  score_cap: number | null;
  
  /** Excluded metrics */
  excluded_metrics: string[];
  
  /** Can we produce a score? */
  can_score: boolean;
  
  /** Gating reason (if cannot score) */
  gating_reason: string | null;
  
  /** Anomaly signals detected */
  anomaly_signals: AnomalySignal[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Anomaly signal type
 */
export type AnomalyType =
  | 'WASH_TRADING'             // Volume without organic activity
  | 'VOLUME_LIQUIDITY_MISMATCH' // Volume spike without liquidity
  | 'SOCIAL_FUNDAMENTAL_DIVERGENCE' // Hype without fundamentals
  | 'SUPPLY_MANIPULATION'       // Unusual supply changes
  | 'PRICE_VOLUME_DIVERGENCE'   // Price move without volume
  | 'CONCENTRATION_SPIKE';      // Sudden holder concentration

/**
 * Anomaly signal
 */
export interface AnomalySignal {
  /** Anomaly type */
  type: AnomalyType;
  
  /** Severity (0-1) */
  severity: number;
  
  /** Confidence in detection (0-1) */
  confidence: number;
  
  /** Description */
  description: string;
  
  /** Evidence metrics */
  evidence: Record<string, number>;
  
  /** Recommended action */
  action: 'MONITOR' | 'FLAG' | 'GATE';
  
  /** Detection timestamp */
  detected_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-METRIC CHECK TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cross-metric consistency check
 */
export interface CrossMetricCheck {
  /** Check ID */
  check_id: string;
  
  /** Description */
  description: string;
  
  /** Metrics involved */
  metrics: string[];
  
  /** Mathematical relationship (formula) */
  relationship: string;
  
  /** Tolerance (percentage) */
  tolerance_percent: number;
  
  /** Flag if check fails */
  failure_flag: ValidationFlag;
  
  /** Impact if check fails */
  failure_impact: GatingImpact;
}

/**
 * Result of a cross-metric check
 */
export interface CrossMetricCheckResult {
  /** Check ID */
  check_id: string;
  
  /** Did the check pass? */
  passed: boolean;
  
  /** Actual values */
  values: Record<string, number>;
  
  /** Computed relationship */
  computed_value: number;
  
  /** Expected relationship */
  expected_value: number;
  
  /** Deviation percentage */
  deviation_percent: number;
  
  /** Tolerance used */
  tolerance_percent: number;
  
  /** Message */
  message: string;
}
