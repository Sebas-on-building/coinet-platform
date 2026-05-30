/**
 * L14.5 — Artifact-Specific Outcome Evaluation Contracts
 *
 * §14.5.24–§14.5.46 — Score / confidence / hypothesis / scenario /
 * trigger / invalidation / alert / explanation evaluation shapes.
 */

import type { L14EvaluatedArtifactClass, L14OutcomeAlignmentClass } from './outcome-evaluation-core';

// ── Score outcome ──────────────────────────────────────────────────

export enum L14ScoreCalibrationObservationClass {
  SCORE_ALIGNED_WITH_TARGET = 'SCORE_ALIGNED_WITH_TARGET',
  SCORE_PARTIALLY_ALIGNED_WITH_TARGET = 'SCORE_PARTIALLY_ALIGNED_WITH_TARGET',
  SCORE_MISALIGNED_WITH_TARGET = 'SCORE_MISALIGNED_WITH_TARGET',
  SCORE_RESULT_INCONCLUSIVE = 'SCORE_RESULT_INCONCLUSIVE',
}

export interface L14ScoreOutcomeEvaluation {
  readonly score_outcome_evaluation_id: string;
  readonly score_ref: string;
  readonly score_family_ref: string;
  readonly calibration_target_ref: string;
  readonly score_band_at_emission: string;
  readonly score_value_at_emission: number;
  readonly expected_effect_profile_ref: string;
  readonly realized_effect_profile_ref: string;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly calibration_observation_class: L14ScoreCalibrationObservationClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Confidence accuracy ────────────────────────────────────────────

export enum L14ConfidenceAccuracyClass {
  CONFIDENCE_APPROPRIATELY_HIGH = 'CONFIDENCE_APPROPRIATELY_HIGH',
  CONFIDENCE_APPROPRIATELY_MEDIUM = 'CONFIDENCE_APPROPRIATELY_MEDIUM',
  CONFIDENCE_APPROPRIATELY_LOW = 'CONFIDENCE_APPROPRIATELY_LOW',
  CONFIDENCE_OVERSTATED = 'CONFIDENCE_OVERSTATED',
  CONFIDENCE_UNDERSTATED = 'CONFIDENCE_UNDERSTATED',
  CONFIDENCE_NOT_EVALUABLE = 'CONFIDENCE_NOT_EVALUABLE',
}

export interface L14ConfidenceAccuracyProfile {
  readonly confidence_accuracy_id: string;
  readonly evaluated_artifact_ref: string;
  readonly evaluated_artifact_class: L14EvaluatedArtifactClass;
  readonly emitted_confidence_band: string;
  readonly emitted_confidence_restriction_class?: string;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly confidence_accuracy_class: L14ConfidenceAccuracyClass;
  readonly overstatement_flag: boolean;
  readonly understatement_flag: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Hypothesis outcome ────────────────────────────────────────────

export enum L14HypothesisRankingPersistenceClass {
  REMAINED_PRIMARY = 'REMAINED_PRIMARY',
  REMAINED_SECONDARY = 'REMAINED_SECONDARY',
  WAS_OVERTAKEN = 'WAS_OVERTAKEN',
  BECAME_UNRESOLVED = 'BECAME_UNRESOLVED',
}

export enum L14HypothesisSupportPersistenceClass {
  SUPPORT_STRENGTHENED = 'SUPPORT_STRENGTHENED',
  SUPPORT_HELD = 'SUPPORT_HELD',
  SUPPORT_WEAKENED = 'SUPPORT_WEAKENED',
  INVALIDATED = 'INVALIDATED',
  INCONCLUSIVE = 'INCONCLUSIVE',
}

export interface L14HypothesisOutcomeEvaluation {
  readonly hypothesis_outcome_evaluation_id: string;
  readonly hypothesis_ref: string;
  readonly hypothesis_family_ref: string;
  readonly expected_confirmation_refs: readonly string[];
  readonly invalidation_refs: readonly string[];
  readonly realized_confirmation_refs: readonly string[];
  readonly realized_invalidation_refs: readonly string[];
  readonly ranking_persistence_class: L14HypothesisRankingPersistenceClass;
  readonly support_persistence_class: L14HypothesisSupportPersistenceClass;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Scenario outcome ──────────────────────────────────────────────

export enum L14ScenarioPathResolutionClass {
  BASE_CASE_FOLLOWED = 'BASE_CASE_FOLLOWED',
  BASE_CASE_PARTIALLY_FOLLOWED = 'BASE_CASE_PARTIALLY_FOLLOWED',
  ALTERNATIVE_PATH_RESOLVED = 'ALTERNATIVE_PATH_RESOLVED',
  FAILURE_CONDITION_ACTIVATED = 'FAILURE_CONDITION_ACTIVATED',
  INCONCLUSIVE_WITHIN_HORIZON = 'INCONCLUSIVE_WITHIN_HORIZON',
  NOT_YET_EVALUABLE = 'NOT_YET_EVALUABLE',
}

export interface L14ScenarioOutcomeEvaluation {
  readonly scenario_outcome_evaluation_id: string;
  readonly scenario_set_ref: string;
  readonly scenario_ref: string;
  readonly scenario_family_ref: string;
  readonly base_case_at_emission: boolean;
  readonly path_confidence_at_emission: string;
  readonly expected_trigger_refs: readonly string[];
  readonly invalidation_refs: readonly string[];
  readonly realized_trigger_refs: readonly string[];
  readonly realized_invalidation_refs: readonly string[];
  readonly path_resolution_class: L14ScenarioPathResolutionClass;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Trigger outcome ───────────────────────────────────────────────

export enum L14TriggerSignificanceClass {
  SIGNIFICANT_CONFIRMATORY_TRIGGER = 'SIGNIFICANT_CONFIRMATORY_TRIGGER',
  PARTIALLY_SIGNIFICANT_TRIGGER = 'PARTIALLY_SIGNIFICANT_TRIGGER',
  WEAK_OR_NOISY_TRIGGER = 'WEAK_OR_NOISY_TRIGGER',
  TRIGGER_EFFECT_CONTRADICTED = 'TRIGGER_EFFECT_CONTRADICTED',
  NOT_YET_EVALUABLE = 'NOT_YET_EVALUABLE',
}

export interface L14TriggerOutcomeEvaluation {
  readonly trigger_outcome_evaluation_id: string;
  readonly trigger_ref: string;
  readonly scenario_ref: string;
  readonly trigger_activation_time: string;
  readonly expected_effect_profile_ref: string;
  readonly realized_effect_profile_ref: string;
  readonly trigger_significance_class: L14TriggerSignificanceClass;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Invalidation outcome ──────────────────────────────────────────

export enum L14InvalidationEffectivenessClass {
  INVALIDATION_CORRECTLY_SIGNALLED_PATH_DEGRADATION = 'INVALIDATION_CORRECTLY_SIGNALLED_PATH_DEGRADATION',
  INVALIDATION_PARTIALLY_SIGNALLED_WEAKNESS = 'INVALIDATION_PARTIALLY_SIGNALLED_WEAKNESS',
  INVALIDATION_TOO_EARLY_OR_NOISY = 'INVALIDATION_TOO_EARLY_OR_NOISY',
  INVALIDATION_EFFECT_CONTRADICTED = 'INVALIDATION_EFFECT_CONTRADICTED',
  NOT_YET_EVALUABLE = 'NOT_YET_EVALUABLE',
}

export interface L14InvalidationOutcomeEvaluation {
  readonly invalidation_outcome_evaluation_id: string;
  readonly invalidation_ref: string;
  readonly scenario_ref: string;
  readonly invalidation_activation_time: string;
  readonly expected_failure_effect_profile_ref: string;
  readonly realized_effect_profile_ref: string;
  readonly invalidation_effectiveness_class: L14InvalidationEffectivenessClass;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Alert outcome ─────────────────────────────────────────────────

export enum L14AlertSemanticClaimClass {
  STATE_SHIFT_ALERT = 'STATE_SHIFT_ALERT',
  SCENARIO_TRIGGER_ALERT = 'SCENARIO_TRIGGER_ALERT',
  SCENARIO_INVALIDATION_ALERT = 'SCENARIO_INVALIDATION_ALERT',
  SCORE_THRESHOLD_ALERT = 'SCORE_THRESHOLD_ALERT',
  HYPOTHESIS_SHIFT_ALERT = 'HYPOTHESIS_SHIFT_ALERT',
  RISK_ESCALATION_ALERT = 'RISK_ESCALATION_ALERT',
  UNLOCK_RISK_ALERT = 'UNLOCK_RISK_ALERT',
}

export interface L14AlertOutcomeEvaluation {
  readonly alert_outcome_evaluation_id: string;
  readonly alert_ref: string;
  readonly alert_class_ref: string;
  readonly source_artifact_refs: readonly string[];
  readonly alert_semantic_claim_ref: string;
  readonly expected_effect_profile_ref: string;
  readonly realized_effect_profile_ref: string;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly false_positive_profile_ref?: string;
  readonly false_negative_profile_ref?: string;
  readonly alert_effectiveness_profile_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Explanation outcome ──────────────────────────────────────────

export enum L14ExplanationOutcomeConsistencyClass {
  EXPLANATION_REMAINED_OUTCOME_CONSISTENT = 'EXPLANATION_REMAINED_OUTCOME_CONSISTENT',
  EXPLANATION_PARTIALLY_CONSISTENT = 'EXPLANATION_PARTIALLY_CONSISTENT',
  EXPLANATION_BECAME_OUTCOME_MISALIGNED = 'EXPLANATION_BECAME_OUTCOME_MISALIGNED',
  EXPLANATION_NOT_EVALUABLE = 'EXPLANATION_NOT_EVALUABLE',
}

export interface L14ExplanationOutcomeEvaluation {
  readonly explanation_outcome_evaluation_id: string;
  readonly l13_output_ref: string;
  readonly output_class_ref: string;
  readonly linked_scenario_refs: readonly string[];
  readonly linked_score_refs: readonly string[];
  readonly linked_hypothesis_refs: readonly string[];
  readonly stated_watchpoint_refs: readonly string[];
  readonly stated_invalidation_refs: readonly string[];
  readonly realized_relevance_refs: readonly string[];
  readonly explanation_outcome_consistency_class: L14ExplanationOutcomeConsistencyClass;
  readonly outcome_alignment_class: L14OutcomeAlignmentClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
