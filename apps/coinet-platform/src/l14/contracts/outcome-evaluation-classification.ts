/**
 * L14.5 — False Classification + Alert Effectiveness Contracts
 *
 * §14.5.48–§14.5.53
 */

import type {
  L14EvaluatedArtifactClass,
  L14OutcomeAlignmentClass,
} from './outcome-evaluation-core';

export enum L14FalseClassificationStatus {
  FALSE_POSITIVE_CONFIRMED = 'FALSE_POSITIVE_CONFIRMED',
  FALSE_NEGATIVE_CONFIRMED = 'FALSE_NEGATIVE_CONFIRMED',
  NOT_FALSE_POSITIVE = 'NOT_FALSE_POSITIVE',
  NOT_FALSE_NEGATIVE = 'NOT_FALSE_NEGATIVE',
  INCONCLUSIVE = 'INCONCLUSIVE',
  NOT_YET_EVALUABLE = 'NOT_YET_EVALUABLE',
}

export enum L14FalseClassificationReasonCode {
  EXPECTED_EFFECT_FAILED_WITHIN_HORIZON = 'EXPECTED_EFFECT_FAILED_WITHIN_HORIZON',
  OPPOSITE_EFFECT_OCCURRED = 'OPPOSITE_EFFECT_OCCURRED',
  SIGNAL_CONTRADICTED_AFTER_ALERT = 'SIGNAL_CONTRADICTED_AFTER_ALERT',
  INVALIDATION_DID_NOT_LEAD_TO_EXPECTED_DEGRADATION = 'INVALIDATION_DID_NOT_LEAD_TO_EXPECTED_DEGRADATION',
  TRIGGER_DID_NOT_LEAD_TO_EXPECTED_CONFIRMATION = 'TRIGGER_DID_NOT_LEAD_TO_EXPECTED_CONFIRMATION',
  OUTCOME_INCONCLUSIVE = 'OUTCOME_INCONCLUSIVE',
  HORIZON_NOT_ELAPSED = 'HORIZON_NOT_ELAPSED',
  ELIGIBLE_OMISSION_DETECTED = 'ELIGIBLE_OMISSION_DETECTED',
}

export interface L14FalseClassificationProfile {
  readonly false_classification_profile_id: string;
  readonly evaluated_artifact_ref: string;
  readonly evaluated_artifact_class: L14EvaluatedArtifactClass;
  readonly false_positive_flag: boolean;
  readonly false_negative_flag: boolean;
  readonly classification_status: L14FalseClassificationStatus;
  readonly classification_reason_codes: readonly L14FalseClassificationReasonCode[];
  readonly regime_ref?: string;
  readonly horizon_ref: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14AlertEffectivenessMatrixClass {
  OUTCOME_ALIGNED_HIGH_ENGAGEMENT = 'OUTCOME_ALIGNED_HIGH_ENGAGEMENT',
  OUTCOME_ALIGNED_LOW_ENGAGEMENT = 'OUTCOME_ALIGNED_LOW_ENGAGEMENT',
  OUTCOME_MISALIGNED_HIGH_ENGAGEMENT = 'OUTCOME_MISALIGNED_HIGH_ENGAGEMENT',
  OUTCOME_MISALIGNED_LOW_ENGAGEMENT = 'OUTCOME_MISALIGNED_LOW_ENGAGEMENT',
  OUTCOME_INCONCLUSIVE_BEHAVIOR_HIGH = 'OUTCOME_INCONCLUSIVE_BEHAVIOR_HIGH',
  OUTCOME_INCONCLUSIVE_BEHAVIOR_LOW = 'OUTCOME_INCONCLUSIVE_BEHAVIOR_LOW',
  NOT_YET_EVALUABLE = 'NOT_YET_EVALUABLE',
}

export interface L14AlertEffectivenessProfile {
  readonly alert_effectiveness_profile_id: string;
  readonly alert_ref: string;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly behavioral_response_summary_ref?: string;
  readonly effectiveness_matrix_class: L14AlertEffectivenessMatrixClass;
  readonly may_feed_alert_calibration_evidence: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
