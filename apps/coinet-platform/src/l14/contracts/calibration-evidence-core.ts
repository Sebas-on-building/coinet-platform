/**
 * L14.6 — Calibration Evidence Core Contracts
 *
 * §14.6.7 / §14.6.9 / §14.6.10 / §14.6.11 / §14.6.12 / §14.6.14 /
 * §14.6.16 / §14.6.23 / §14.6.24 / §14.6.25 — Consolidated core taxonomy.
 */

import type { L14EvaluationHorizon } from './outcome-evaluation-core';

// ── Evidence class ────────────────────────────────────────────────

export enum L14CalibrationEvidenceClass {
  SCORE_OUTCOME_PERFORMANCE = 'SCORE_OUTCOME_PERFORMANCE',
  SCORE_CONFIDENCE_ACCURACY = 'SCORE_CONFIDENCE_ACCURACY',
  THRESHOLD_NOISE_DETECTION = 'THRESHOLD_NOISE_DETECTION',
  HYPOTHESIS_SUCCESS_RATE = 'HYPOTHESIS_SUCCESS_RATE',
  HYPOTHESIS_FAILURE_PATTERN = 'HYPOTHESIS_FAILURE_PATTERN',
  SCENARIO_CONFIDENCE_CALIBRATION = 'SCENARIO_CONFIDENCE_CALIBRATION',
  TRIGGER_SIGNAL_VALUE = 'TRIGGER_SIGNAL_VALUE',
  INVALIDATION_SIGNAL_VALUE = 'INVALIDATION_SIGNAL_VALUE',
  REGIME_SPECIFIC_PERFORMANCE = 'REGIME_SPECIFIC_PERFORMANCE',
  ALERT_CLASS_USEFULNESS = 'ALERT_CLASS_USEFULNESS',
  FEATURE_IMPORTANCE_BY_REGIME = 'FEATURE_IMPORTANCE_BY_REGIME',
}
export const ALL_L14_CALIBRATION_EVIDENCE_CLASSES: readonly L14CalibrationEvidenceClass[] =
  Object.values(L14CalibrationEvidenceClass);

// ── Subject class ─────────────────────────────────────────────────

export enum L14CalibrationSubjectClass {
  SCORE_FAMILY = 'SCORE_FAMILY',
  SCORE_BAND = 'SCORE_BAND',
  SCORE_THRESHOLD_POLICY = 'SCORE_THRESHOLD_POLICY',
  SCORE_COMPONENT = 'SCORE_COMPONENT',
  HYPOTHESIS_FAMILY = 'HYPOTHESIS_FAMILY',
  SCENARIO_TEMPLATE = 'SCENARIO_TEMPLATE',
  SCENARIO_CONFIDENCE_CLASS = 'SCENARIO_CONFIDENCE_CLASS',
  TRIGGER_FAMILY = 'TRIGGER_FAMILY',
  INVALIDATION_FAMILY = 'INVALIDATION_FAMILY',
  ALERT_CLASS = 'ALERT_CLASS',
  DELIVERY_CLASS = 'DELIVERY_CLASS',
  REGIME_CLASS = 'REGIME_CLASS',
  FEATURE_SURFACE = 'FEATURE_SURFACE',
  L13_OUTPUT_CLASS = 'L13_OUTPUT_CLASS',
}
export const ALL_L14_CALIBRATION_SUBJECT_CLASSES: readonly L14CalibrationSubjectClass[] =
  Object.values(L14CalibrationSubjectClass);

// ── Confidence + sufficiency ──────────────────────────────────────

export enum L14CalibrationEvidenceConfidenceClass {
  LOW_CONFIDENCE_EVIDENCE = 'LOW_CONFIDENCE_EVIDENCE',
  MODERATE_CONFIDENCE_EVIDENCE = 'MODERATE_CONFIDENCE_EVIDENCE',
  HIGH_CONFIDENCE_EVIDENCE = 'HIGH_CONFIDENCE_EVIDENCE',
  STRONG_REPEATED_EVIDENCE = 'STRONG_REPEATED_EVIDENCE',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
}

export enum L14CalibrationSampleSufficiencyClass {
  SAMPLE_INSUFFICIENT = 'SAMPLE_INSUFFICIENT',
  SAMPLE_SMALL_DIRECTIONAL = 'SAMPLE_SMALL_DIRECTIONAL',
  SAMPLE_MODERATE = 'SAMPLE_MODERATE',
  SAMPLE_STRONG = 'SAMPLE_STRONG',
  SAMPLE_LARGE_STABLE = 'SAMPLE_LARGE_STABLE',
}

// Suggested v1 thresholds (§14.6.13)
export const L14_SAMPLE_INSUFFICIENT_MAX = 29;
export const L14_SAMPLE_SMALL_MAX = 99;
export const L14_SAMPLE_MODERATE_MAX = 299;
export const L14_SAMPLE_STRONG_MAX = 999;

export enum L14CalibrationReviewPriority {
  NO_REVIEW = 'NO_REVIEW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum L14CalibrationProposalEligibilityClass {
  NOT_ELIGIBLE_INSUFFICIENT_SAMPLE = 'NOT_ELIGIBLE_INSUFFICIENT_SAMPLE',
  NOT_ELIGIBLE_WEAK_SIGNAL = 'NOT_ELIGIBLE_WEAK_SIGNAL',
  ELIGIBLE_FOR_HUMAN_REVIEW_ONLY = 'ELIGIBLE_FOR_HUMAN_REVIEW_ONLY',
  ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT = 'ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT',
  BLOCKED_CONTRADICTORY_EVIDENCE = 'BLOCKED_CONTRADICTORY_EVIDENCE',
}

// ── Input mode ────────────────────────────────────────────────────

export enum L14CalibrationEvidenceInputMode {
  OUTCOME_ONLY = 'OUTCOME_ONLY',
  OUTCOME_PLUS_BEHAVIOR = 'OUTCOME_PLUS_BEHAVIOR',
  OUTCOME_PLUS_FEEDBACK = 'OUTCOME_PLUS_FEEDBACK',
  OUTCOME_BEHAVIOR_FEEDBACK = 'OUTCOME_BEHAVIOR_FEEDBACK',
}

// Canonical mapping (§14.6.56)
export const L14_EVIDENCE_CLASS_INPUT_MODE: Readonly<Record<L14CalibrationEvidenceClass, L14CalibrationEvidenceInputMode>> = {
  [L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
  [L14CalibrationEvidenceClass.SCORE_CONFIDENCE_ACCURACY]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
  [L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION]: L14CalibrationEvidenceInputMode.OUTCOME_BEHAVIOR_FEEDBACK,
  [L14CalibrationEvidenceClass.HYPOTHESIS_SUCCESS_RATE]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
  [L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
  [L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
  [L14CalibrationEvidenceClass.TRIGGER_SIGNAL_VALUE]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
  [L14CalibrationEvidenceClass.INVALIDATION_SIGNAL_VALUE]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
  [L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
  [L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS]: L14CalibrationEvidenceInputMode.OUTCOME_BEHAVIOR_FEEDBACK,
  [L14CalibrationEvidenceClass.FEATURE_IMPORTANCE_BY_REGIME]: L14CalibrationEvidenceInputMode.OUTCOME_ONLY,
};

// ── Lower-layer target refs ───────────────────────────────────────

export enum L14CalibrationLowerLayerTargetClass {
  L10_HYPOTHESIS_FAMILY_INTERPRETATION = 'L10_HYPOTHESIS_FAMILY_INTERPRETATION',
  L10_HYPOTHESIS_CONFIDENCE_RULE = 'L10_HYPOTHESIS_CONFIDENCE_RULE',
  L11_SCORE_FORMULA = 'L11_SCORE_FORMULA',
  L11_SCORE_THRESHOLD_POLICY = 'L11_SCORE_THRESHOLD_POLICY',
  L11_SCORE_CONFIDENCE_RULE = 'L11_SCORE_CONFIDENCE_RULE',
  L11_SCORE_COMPONENT_WEIGHT_PROFILE = 'L11_SCORE_COMPONENT_WEIGHT_PROFILE',
  L12_SCENARIO_TEMPLATE = 'L12_SCENARIO_TEMPLATE',
  L12_TRIGGER_RULE = 'L12_TRIGGER_RULE',
  L12_INVALIDATION_RULE = 'L12_INVALIDATION_RULE',
  L12_PATH_CONFIDENCE_CAP_RULE = 'L12_PATH_CONFIDENCE_CAP_RULE',
  L13_ALERT_EXPRESSION_POLICY = 'L13_ALERT_EXPRESSION_POLICY',
  L13_OUTPUT_MODE_POLICY = 'L13_OUTPUT_MODE_POLICY',
  L14_DELIVERY_PRIORITY_POLICY = 'L14_DELIVERY_PRIORITY_POLICY',
  L14_SUPPRESSION_POLICY = 'L14_SUPPRESSION_POLICY',
}

export interface L14CalibrationTargetRef {
  readonly calibration_target_ref_id: string;
  readonly target_layer: 'L10' | 'L11' | 'L12' | 'L13' | 'L14';
  readonly target_class: L14CalibrationLowerLayerTargetClass;
  readonly target_ref: string;
  readonly why_affected: string;
  readonly mutation_allowed_in_l14_6: false;
  readonly policy_version: string;
}

// ── Limitations ───────────────────────────────────────────────────

export enum L14CalibrationEvidenceLimitation {
  SAMPLE_INSUFFICIENT = 'SAMPLE_INSUFFICIENT',
  SAMPLE_REGIME_CONCENTRATED = 'SAMPLE_REGIME_CONCENTRATED',
  OUTCOME_WINDOWS_PARTIALLY_ELAPSED = 'OUTCOME_WINDOWS_PARTIALLY_ELAPSED',
  BEHAVIORAL_SIGNALS_WEAKLY_ATTRIBUTED = 'BEHAVIORAL_SIGNALS_WEAKLY_ATTRIBUTED',
  FEEDBACK_RATE_TOO_LOW = 'FEEDBACK_RATE_TOO_LOW',
  COUNTEREVIDENCE_PRESENT = 'COUNTEREVIDENCE_PRESENT',
  REGIME_SHIFT_CONFOUNDS_INTERPRETATION = 'REGIME_SHIFT_CONFOUNDS_INTERPRETATION',
  FEATURE_ASSOCIATION_NOT_CAUSAL = 'FEATURE_ASSOCIATION_NOT_CAUSAL',
  DELIVERY_SUPPRESSION_BIASES_OBSERVATION = 'DELIVERY_SUPPRESSION_BIASES_OBSERVATION',
  ARTIFACT_CLASS_TOO_HETEROGENEOUS = 'ARTIFACT_CLASS_TOO_HETEROGENEOUS',
}

// ── Request ───────────────────────────────────────────────────────

export type L14CalibrationEvidenceRequestSource =
  | 'SCHEDULED_CALIBRATION_SWEEP'
  | 'DRIFT_ESCALATION_JOB'
  | 'HUMAN_ANALYST_REVIEW'
  | 'RATIFICATION_BACKFILL'
  | 'REPLAY_REPAIR';

export interface L14CalibrationEvidenceRequest {
  readonly calibration_evidence_request_id: string;
  readonly evidence_class: L14CalibrationEvidenceClass;
  readonly subject_class: L14CalibrationSubjectClass;
  readonly subject_ref: string;
  readonly regime_ref?: string;
  readonly evidence_window_ref: string;
  readonly requested_by: L14CalibrationEvidenceRequestSource;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Calibration evidence record ───────────────────────────────────

// Forward-decl placeholders to avoid circular imports.
// `L14CalibrationFinding` is defined in calibration-evidence-findings.ts
// and referenced by name only via `unknown[]` until imported by consumers.
export interface L14CalibrationEvidenceRecord {
  readonly calibration_evidence_id: string;
  readonly evidence_class: L14CalibrationEvidenceClass;
  readonly subject_class: L14CalibrationSubjectClass;
  readonly subject_ref: string;
  readonly regime_ref?: string;
  readonly horizon?: L14EvaluationHorizon;
  readonly sample_size: number;
  readonly sample_sufficiency_class: L14CalibrationSampleSufficiencyClass;
  readonly confidence_class: L14CalibrationEvidenceConfidenceClass;
  readonly observed_pattern_summary: string;
  readonly structured_findings: readonly unknown[]; // L14CalibrationFinding[]
  readonly performance_attribution_ref?: string;
  readonly supporting_aggregate_refs: readonly string[];
  readonly counterevidence_refs: readonly string[];
  readonly affected_lower_layer_targets: readonly L14CalibrationTargetRef[];
  readonly recommended_review_priority: L14CalibrationReviewPriority;
  readonly proposal_eligibility: L14CalibrationProposalEligibilityClass;
  readonly interpretation_limitations: readonly L14CalibrationEvidenceLimitation[];
  readonly input_mode: L14CalibrationEvidenceInputMode;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
