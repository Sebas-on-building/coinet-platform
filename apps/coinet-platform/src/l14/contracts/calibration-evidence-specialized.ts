/**
 * L14.6 — Alert Usefulness + Performance Attribution Contracts
 *
 * §14.6.36 / §14.6.37 / §14.6.40 / §14.6.41 / §14.6.42 / §14.6.43
 */

import {
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationSubjectClass,
} from './calibration-evidence-core';

// ── Alert usefulness ──────────────────────────────────────────────

export enum L14AlertClassUsefulnessClass {
  HIGH_VALUE_ALERT_CLASS = 'HIGH_VALUE_ALERT_CLASS',
  OUTCOME_STRONG_BUT_UNDERENGAGED = 'OUTCOME_STRONG_BUT_UNDERENGAGED',
  BEHAVIORALLY_ACTIVE_BUT_OUTCOME_WEAK = 'BEHAVIORALLY_ACTIVE_BUT_OUTCOME_WEAK',
  LOW_VALUE_ALERT_CLASS = 'LOW_VALUE_ALERT_CLASS',
  INCONCLUSIVE_ALERT_CLASS = 'INCONCLUSIVE_ALERT_CLASS',
}

export interface L14AlertClassUsefulnessProfile {
  readonly alert_usefulness_profile_id: string;
  readonly alert_class_ref: string;
  readonly regime_ref?: string;
  readonly horizon_ref?: string;
  readonly evaluated_alert_count: number;
  readonly outcome_alignment_rate: number;
  readonly false_positive_rate: number;
  readonly open_rate?: number;
  readonly ignore_rate?: number;
  readonly deeper_investigation_rate?: number;
  readonly positive_feedback_rate?: number;
  readonly negative_feedback_rate?: number;
  readonly usefulness_class: L14AlertClassUsefulnessClass;
  readonly may_support_calibration_evidence: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Performance attribution ───────────────────────────────────────

export enum L14PerformanceAssociationStrength {
  WEAK_ASSOCIATION = 'WEAK_ASSOCIATION',
  MODERATE_ASSOCIATION = 'MODERATE_ASSOCIATION',
  STRONG_ASSOCIATION = 'STRONG_ASSOCIATION',
  VERY_STRONG_ASSOCIATION = 'VERY_STRONG_ASSOCIATION',
  INCONCLUSIVE_ASSOCIATION = 'INCONCLUSIVE_ASSOCIATION',
}

export enum L14PerformanceAttributionMethodClass {
  DESCRIPTIVE_COHORT_COMPARISON = 'DESCRIPTIVE_COHORT_COMPARISON',
  BAND_STRATIFIED_COMPARISON = 'BAND_STRATIFIED_COMPARISON',
  REGIME_CONDITIONAL_COMPARISON = 'REGIME_CONDITIONAL_COMPARISON',
  FEATURE_PRESENCE_RATE_COMPARISON = 'FEATURE_PRESENCE_RATE_COMPARISON',
  COMPONENT_CONTRIBUTION_BUCKET_COMPARISON = 'COMPONENT_CONTRIBUTION_BUCKET_COMPARISON',
}

export type L14PerformanceAttributionOutcomeClass =
  | 'ALIGNED'
  | 'MISALIGNED'
  | 'FALSE_POSITIVE'
  | 'FALSE_NEGATIVE'
  | 'OVERCONFIDENCE'
  | 'UNDERCONFIDENCE';

export interface L14PerformanceAttributionFinding {
  readonly attribution_finding_id: string;
  readonly feature_or_component_ref: string;
  readonly feature_label: string;
  readonly associated_outcome_class: L14PerformanceAttributionOutcomeClass;
  readonly association_strength: L14PerformanceAssociationStrength;
  readonly support_count: number;
  readonly counter_count: number;
  readonly interpretation: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export interface L14PerformanceAttributionProfile {
  readonly performance_attribution_id: string;
  readonly subject_class: L14CalibrationSubjectClass;
  readonly subject_ref: string;
  readonly regime_ref?: string;
  readonly horizon_ref?: string;
  readonly positive_association_findings: readonly L14PerformanceAttributionFinding[];
  readonly negative_association_findings: readonly L14PerformanceAttributionFinding[];
  readonly attribution_method_class: L14PerformanceAttributionMethodClass;
  readonly causal_claim_allowed: false;
  readonly sample_size: number;
  readonly confidence_class: L14CalibrationEvidenceConfidenceClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
