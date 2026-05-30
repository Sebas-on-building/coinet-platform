/**
 * L14.5 — Outcome Evaluation Core Contracts
 *
 * §14.5.8 / §14.5.10 / §14.5.12 / §14.5.15 / §14.5.17 / §14.5.56 /
 * §14.5.57 / §14.5.58 / §14.5.59 — Consolidated core taxonomy +
 * request + record shape.
 */

export enum L14EvaluatedArtifactClass {
  SCORE = 'SCORE',
  SCORE_CONFIDENCE = 'SCORE_CONFIDENCE',
  HYPOTHESIS = 'HYPOTHESIS',
  SCENARIO = 'SCENARIO',
  TRIGGER = 'TRIGGER',
  INVALIDATION = 'INVALIDATION',
  ALERT = 'ALERT',
  L13_EXPLANATION = 'L13_EXPLANATION',
}

export const ALL_L14_EVALUATED_ARTIFACT_CLASSES:
  readonly L14EvaluatedArtifactClass[] =
  Object.values(L14EvaluatedArtifactClass);

export enum L14EvaluationHorizonClass {
  IMMEDIATE_1H = 'IMMEDIATE_1H',
  INTRADAY_4H = 'INTRADAY_4H',
  DAILY_24H = 'DAILY_24H',
  MULTIDAY_72H = 'MULTIDAY_72H',
  WEEKLY_7D = 'WEEKLY_7D',
  MONTHLY_30D = 'MONTHLY_30D',
  CUSTOM_DECLARED = 'CUSTOM_DECLARED',
}

export const ALL_L14_EVALUATION_HORIZON_CLASSES:
  readonly L14EvaluationHorizonClass[] =
  Object.values(L14EvaluationHorizonClass);

export type L14EvaluationHorizonSource =
  | 'L11_CALIBRATION_TARGET'
  | 'L12_SCENARIO_POLICY'
  | 'L13_ALERT_POLICY'
  | 'L14_OUTCOME_EVALUATION_POLICY';

export interface L14EvaluationHorizon {
  readonly horizon_id: string;
  readonly horizon_class: L14EvaluationHorizonClass;
  readonly evaluation_window_start: string;
  readonly evaluation_window_end: string;
  readonly horizon_source: L14EvaluationHorizonSource;
  readonly horizon_elapsed: boolean;
  readonly policy_version: string;
}

export enum L14OutcomeAlignmentClass {
  ALIGNED = 'ALIGNED',
  PARTIALLY_ALIGNED = 'PARTIALLY_ALIGNED',
  MISALIGNED = 'MISALIGNED',
  INCONCLUSIVE = 'INCONCLUSIVE',
  NOT_YET_EVALUABLE = 'NOT_YET_EVALUABLE',
}

export const ALL_L14_OUTCOME_ALIGNMENT_CLASSES:
  readonly L14OutcomeAlignmentClass[] =
  Object.values(L14OutcomeAlignmentClass);

export enum L14OutcomeEvaluationStatus {
  EVALUATION_READY = 'EVALUATION_READY',
  WAITING_FOR_HORIZON = 'WAITING_FOR_HORIZON',
  WAITING_FOR_REALIZED_OUTCOME_FACT = 'WAITING_FOR_REALIZED_OUTCOME_FACT',
  WAITING_FOR_CALIBRATION_TARGET = 'WAITING_FOR_CALIBRATION_TARGET',
  EVALUATED = 'EVALUATED',
  BLOCKED_INVALID_INPUT = 'BLOCKED_INVALID_INPUT',
}

export enum L14OutcomeInterpretationLimitation {
  REALIZED_FACTS_PARTIAL = 'REALIZED_FACTS_PARTIAL',
  HORIZON_TOO_SHORT_FOR_TARGET = 'HORIZON_TOO_SHORT_FOR_TARGET',
  HORIZON_TOO_LONG_FOR_SIGNAL = 'HORIZON_TOO_LONG_FOR_SIGNAL',
  REGIME_CHANGED_DURING_WINDOW = 'REGIME_CHANGED_DURING_WINDOW',
  ARTIFACT_TARGET_TOO_BROAD = 'ARTIFACT_TARGET_TOO_BROAD',
  EVENT_RESOLUTION_AMBIGUOUS = 'EVENT_RESOLUTION_AMBIGUOUS',
  CALIBRATION_TARGET_MISSING = 'CALIBRATION_TARGET_MISSING',
  ATTRIBUTION_NOT_REQUIRED_FOR_ARTIFACT = 'ATTRIBUTION_NOT_REQUIRED_FOR_ARTIFACT',
}

export type L14OutcomeEvaluationRequestSource =
  | 'SCHEDULED_EVALUATION'
  | 'HORIZON_EXPIRY_JOB'
  | 'MANUAL_ANALYST_REVIEW'
  | 'CALIBRATION_BACKFILL'
  | 'REPLAY_REPAIR';

export interface L14OutcomeEvaluationRequest {
  readonly outcome_evaluation_request_id: string;
  readonly evaluated_artifact_class: L14EvaluatedArtifactClass;
  readonly evaluated_artifact_ref: string;
  readonly requested_evaluation_horizon_ref?: string;
  readonly calibration_target_ref?: string;
  readonly source_delivery_ref?: string;
  readonly source_execution_ref?: string;
  readonly requested_by: L14OutcomeEvaluationRequestSource;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14OutcomeEvaluationEligibilityStatus {
  ELIGIBLE = 'ELIGIBLE',
  WAITING_FOR_HORIZON = 'WAITING_FOR_HORIZON',
  WAITING_FOR_REALIZED_FACTS = 'WAITING_FOR_REALIZED_FACTS',
  WAITING_FOR_CALIBRATION_TARGET = 'WAITING_FOR_CALIBRATION_TARGET',
  BLOCKED_UNREGISTERED_ARTIFACT = 'BLOCKED_UNREGISTERED_ARTIFACT',
  BLOCKED_INVALID_EVALUATION_TARGET = 'BLOCKED_INVALID_EVALUATION_TARGET',
}

export enum L14OutcomeEvaluationMissingRequirement {
  HORIZON = 'HORIZON',
  REALIZED_FACTS = 'REALIZED_FACTS',
  CALIBRATION_TARGET = 'CALIBRATION_TARGET',
  EXPECTED_EFFECT_PROFILE = 'EXPECTED_EFFECTPROFILE',
  EVALUATION_SEMANTICS = 'EVALUATION_SEMANTICS',
}

export interface L14OutcomeEvaluationEligibilityResult {
  readonly eligibility_result_id: string;
  readonly evaluation_request_ref: string;
  readonly eligible: boolean;
  readonly eligibility_status: L14OutcomeEvaluationEligibilityStatus;
  readonly missing_requirements: readonly L14OutcomeEvaluationMissingRequirement[];
  readonly horizon_ref?: string;
  readonly target_ref?: string;
  readonly realized_outcome_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14OutcomeEvaluationRecord {
  readonly outcome_evaluation_id: string;
  readonly evaluated_artifact_class: L14EvaluatedArtifactClass;
  readonly evaluated_artifact_ref: string;
  readonly evaluation_horizon: L14EvaluationHorizon;
  readonly realized_outcome_ref: string;
  readonly expected_direction?: string;
  readonly realized_direction?: string;
  readonly calibration_target_ref?: string;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly false_positive_flag: boolean;
  readonly false_negative_flag: boolean;
  readonly regime_ref?: string;
  readonly score_family_ref?: string;
  readonly hypothesis_family_ref?: string;
  readonly scenario_family_ref?: string;
  readonly alert_class_ref?: string;
  readonly evaluation_semantics_ref: string;
  readonly expected_effect_profile_ref: string;
  readonly realized_effect_profile_ref: string;
  readonly confidence_accuracy_ref?: string;
  readonly false_classification_profile_ref?: string;
  readonly alert_effectiveness_profile_ref?: string;
  readonly evaluation_status: L14OutcomeEvaluationStatus;
  readonly interpretation_limitations: readonly L14OutcomeInterpretationLimitation[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
