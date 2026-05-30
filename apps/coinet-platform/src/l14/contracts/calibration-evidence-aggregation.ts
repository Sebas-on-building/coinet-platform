/**
 * L14.6 — Evidence Window, Cohort, Aggregate, Class Policy
 *
 * §14.6.44–§14.6.50 / §14.6.60
 */

import {
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceInputMode,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationSampleSufficiencyClass,
  L14CalibrationSubjectClass,
} from './calibration-evidence-core';
import { L14CalibrationObservedMetric } from './calibration-evidence-findings';

// ── Window ────────────────────────────────────────────────────────

export enum L14CalibrationEvidenceWindowClass {
  ROLLING_7D = 'ROLLING_7D',
  ROLLING_30D = 'ROLLING_30D',
  ROLLING_90D = 'ROLLING_90D',
  ROLLING_180D = 'ROLLING_180D',
  VERSION_EPOCH = 'VERSION_EPOCH',
  REGIME_EPOCH = 'REGIME_EPOCH',
  CUSTOM_GOVERNED = 'CUSTOM_GOVERNED',
}

export interface L14CalibrationEvidenceWindow {
  readonly evidence_window_id: string;
  readonly window_class: L14CalibrationEvidenceWindowClass;
  readonly window_start: string;
  readonly window_end: string;
  readonly includes_outcome_horizon_classes: readonly string[];
  readonly fully_elapsed: boolean;
  readonly policy_version: string;
}

// ── Aggregate ─────────────────────────────────────────────────────

export enum L14CalibrationMetricCompletenessClass {
  COMPLETE = 'COMPLETE',
  PARTIAL_BUT_EVALUABLE = 'PARTIAL_BUT_EVALUABLE',
  PARTIAL_NOT_EVALUABLE = 'PARTIAL_NOT_EVALUABLE',
  MISSING_REQUIRED_INPUT = 'MISSING_REQUIRED_INPUT',
}

export interface L14CalibrationComputedMetric {
  readonly metric_id: string;
  readonly metric_name: L14CalibrationObservedMetric;
  readonly numerator?: number;
  readonly denominator?: number;
  readonly value: number;
  readonly baseline_value?: number;
  readonly delta_vs_baseline?: number;
  readonly metric_completeness_class: L14CalibrationMetricCompletenessClass;
}

export interface L14CalibrationAggregateComputation {
  readonly aggregate_computation_id: string;
  readonly evidence_class: L14CalibrationEvidenceClass;
  readonly subject_class: L14CalibrationSubjectClass;
  readonly subject_ref: string;
  readonly cohort_definition_ref: string;
  readonly evidence_window_ref: string;
  readonly source_outcome_evaluation_refs: readonly string[];
  readonly source_behavior_refs: readonly string[];
  readonly source_feedback_refs: readonly string[];
  readonly computed_metrics: readonly L14CalibrationComputedMetric[];
  readonly sample_size: number;
  readonly sample_sufficiency_class: L14CalibrationSampleSufficiencyClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Cohort definition ─────────────────────────────────────────────

export type L14CalibrationCohortRule = {
  readonly rule_class: string;
  readonly rule_value: string;
};

export interface L14CalibrationCohortDefinition {
  readonly cohort_definition_id: string;
  readonly evidence_class: L14CalibrationEvidenceClass;
  readonly subject_class: L14CalibrationSubjectClass;
  readonly subject_ref: string;
  readonly included_regime_refs?: readonly string[];
  readonly included_horizon_refs?: readonly string[];
  readonly included_score_band_refs?: readonly string[];
  readonly included_alert_class_refs?: readonly string[];
  readonly inclusion_rules: readonly L14CalibrationCohortRule[];
  readonly exclusion_rules: readonly L14CalibrationCohortRule[];
  readonly policy_version: string;
}

// ── Class policy ──────────────────────────────────────────────────

export interface L14CalibrationEvidenceClassPolicy {
  readonly evidence_class: L14CalibrationEvidenceClass;
  readonly allowed_subject_classes: readonly L14CalibrationSubjectClass[];
  readonly input_mode: L14CalibrationEvidenceInputMode;
  readonly minimum_sample_size_for_record: number;
  readonly minimum_sample_size_for_review: number;
  readonly minimum_sample_size_for_proposal_eligibility: number;
  readonly permits_behavioral_signals: boolean;
  readonly permits_feedback_signals: boolean;
  readonly permits_feature_attribution: boolean;
  readonly may_affect_lower_layer_targets: readonly L14CalibrationLowerLayerTargetClass[];
  readonly policy_version: string;
}
