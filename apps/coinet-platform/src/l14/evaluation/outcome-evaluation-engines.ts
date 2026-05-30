/**
 * L14.5 — Outcome Evaluation Engines
 *
 * §14.5.60 / §14.5.61 — Pure-function evaluators for each
 * artifact class plus alignment / false-classification /
 * confidence / effectiveness / regime / record builder.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  L14EvaluatedArtifactClass,
  L14EvaluationHorizonClass,
  L14OutcomeAlignmentClass,
  L14OutcomeEvaluationEligibilityStatus,
  L14OutcomeEvaluationMissingRequirement,
  L14OutcomeEvaluationStatus,
  L14OutcomeInterpretationLimitation,
  type L14EvaluationHorizon,
  type L14OutcomeEvaluationEligibilityResult,
  type L14OutcomeEvaluationRecord,
  type L14OutcomeEvaluationRequest,
} from '../contracts/outcome-evaluation-core';
import {
  L14ExpectedDirectionClass,
  L14ExpectedEffectClass,
  L14ExpectedMagnitudeClass,
  L14RealizedDirectionClass,
  L14RealizedMagnitudeClass,
  L14RealizedOutcomeCompletenessClass,
  L14RealizedOutcomeFactClass,
  L14RealizedOutcomeSummaryCode,
  type L14ExpectedEffectProfile,
  type L14OutcomeRegimeContext,
  type L14RealizedOutcomeProfile,
} from '../contracts/outcome-evaluation-effects';
import {
  L14ConfidenceAccuracyClass,
  L14ExplanationOutcomeConsistencyClass,
  L14HypothesisRankingPersistenceClass,
  L14HypothesisSupportPersistenceClass,
  L14InvalidationEffectivenessClass,
  L14ScenarioPathResolutionClass,
  L14ScoreCalibrationObservationClass,
  L14TriggerSignificanceClass,
  type L14AlertOutcomeEvaluation,
  type L14ConfidenceAccuracyProfile,
  type L14ExplanationOutcomeEvaluation,
  type L14HypothesisOutcomeEvaluation,
  type L14InvalidationOutcomeEvaluation,
  type L14ScenarioOutcomeEvaluation,
  type L14ScoreOutcomeEvaluation,
  type L14TriggerOutcomeEvaluation,
} from '../contracts/outcome-evaluation-artifacts';
import {
  L14AlertEffectivenessMatrixClass,
  L14FalseClassificationReasonCode,
  L14FalseClassificationStatus,
  type L14AlertEffectivenessProfile,
  type L14FalseClassificationProfile,
} from '../contracts/outcome-evaluation-classification';

const POLICY_V = 'l14.outcome.v1';

// ── Eligibility ────────────────────────────────────────────────────

export interface L14EligibilityInput {
  readonly request: L14OutcomeEvaluationRequest;
  readonly horizon?: L14EvaluationHorizon;
  readonly realized_outcome_ref?: string;
  readonly calibration_target_ref?: string;
  readonly score_requires_target?: boolean;
}

export function evaluateL14OutcomeEligibility(
  input: L14EligibilityInput,
): L14OutcomeEvaluationEligibilityResult {
  const missing: L14OutcomeEvaluationMissingRequirement[] = [];
  let status: L14OutcomeEvaluationEligibilityStatus =
    L14OutcomeEvaluationEligibilityStatus.ELIGIBLE;
  if (!input.horizon) {
    missing.push(L14OutcomeEvaluationMissingRequirement.HORIZON);
    status = L14OutcomeEvaluationEligibilityStatus.WAITING_FOR_HORIZON;
  } else if (!input.horizon.horizon_elapsed) {
    status = L14OutcomeEvaluationEligibilityStatus.WAITING_FOR_HORIZON;
  }
  if (!input.realized_outcome_ref) {
    missing.push(L14OutcomeEvaluationMissingRequirement.REALIZED_FACTS);
    if (status === L14OutcomeEvaluationEligibilityStatus.ELIGIBLE) {
      status = L14OutcomeEvaluationEligibilityStatus.WAITING_FOR_REALIZED_FACTS;
    }
  }
  if (input.score_requires_target && !input.calibration_target_ref) {
    missing.push(L14OutcomeEvaluationMissingRequirement.CALIBRATION_TARGET);
    status = L14OutcomeEvaluationEligibilityStatus.WAITING_FOR_CALIBRATION_TARGET;
  }
  const eligible = missing.length === 0 && status === L14OutcomeEvaluationEligibilityStatus.ELIGIBLE;
  const replayHash = fnv1a([
    input.request.outcome_evaluation_request_id,
    input.horizon?.horizon_id ?? '',
    input.realized_outcome_ref ?? '',
    input.calibration_target_ref ?? '',
    status,
    POLICY_V,
  ].join('|'));
  return {
    eligibility_result_id: `l14.outcome.eligibility.${replayHash}`,
    evaluation_request_ref: input.request.outcome_evaluation_request_id,
    eligible,
    eligibility_status: status,
    missing_requirements: missing,
    horizon_ref: input.horizon?.horizon_id,
    target_ref: input.calibration_target_ref,
    realized_outcome_ref: input.realized_outcome_ref,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Horizon builder ───────────────────────────────────────────────

export function buildL14EvaluationHorizon(
  cls: L14EvaluationHorizonClass,
  start: string,
  end: string,
  source: L14EvaluationHorizon['horizon_source'],
  elapsed: boolean,
): L14EvaluationHorizon {
  return {
    horizon_id: `l14.horizon.${fnv1a([cls, start, end, source, String(elapsed), POLICY_V].join('|'))}`,
    horizon_class: cls,
    evaluation_window_start: start,
    evaluation_window_end: end,
    horizon_source: source,
    horizon_elapsed: elapsed,
    policy_version: POLICY_V,
  };
}

// ── Expected/Realized effect builders ────────────────────────────

export interface L14ExpectedEffectInput {
  readonly evaluated_artifact_ref: string;
  readonly evaluated_artifact_class: L14EvaluatedArtifactClass;
  readonly expected_effect_class: L14ExpectedEffectClass;
  readonly expected_direction?: L14ExpectedDirectionClass;
  readonly expected_magnitude_class?: L14ExpectedMagnitudeClass;
  readonly required_realized_fact_classes: readonly L14RealizedOutcomeFactClass[];
  readonly evaluation_tolerance_profile_ref?: string;
}

export function buildL14ExpectedEffectProfile(
  input: L14ExpectedEffectInput,
): L14ExpectedEffectProfile {
  return {
    expected_effect_profile_id: `l14.expected.${fnv1a([input.evaluated_artifact_ref, input.expected_effect_class, POLICY_V].join('|'))}`,
    evaluated_artifact_ref: input.evaluated_artifact_ref,
    evaluated_artifact_class: input.evaluated_artifact_class,
    expected_effect_class: input.expected_effect_class,
    expected_direction: input.expected_direction,
    expected_magnitude_class: input.expected_magnitude_class,
    required_realized_fact_classes: input.required_realized_fact_classes,
    evaluation_tolerance_profile_ref: input.evaluation_tolerance_profile_ref ?? 'l14.tolerance.default.v1',
    policy_version: POLICY_V,
  };
}

export interface L14RealizedOutcomeInput {
  readonly evaluation_horizon_ref: string;
  readonly realized_fact_refs: readonly string[];
  readonly realized_fact_classes: readonly L14RealizedOutcomeFactClass[];
  readonly realized_direction?: L14RealizedDirectionClass;
  readonly realized_magnitude_class?: L14RealizedMagnitudeClass;
  readonly realized_summary_codes: readonly L14RealizedOutcomeSummaryCode[];
  readonly completeness_class: L14RealizedOutcomeCompletenessClass;
}

export function buildL14RealizedOutcomeProfile(
  input: L14RealizedOutcomeInput,
): L14RealizedOutcomeProfile {
  const replayHash = fnv1a([
    input.evaluation_horizon_ref,
    input.realized_fact_classes.slice().sort().join(','),
    input.realized_direction ?? '',
    input.realized_magnitude_class ?? '',
    input.realized_summary_codes.slice().sort().join(','),
    input.completeness_class,
    POLICY_V,
  ].join('|'));
  return {
    realized_effect_profile_id: `l14.realized.${replayHash}`,
    evaluation_horizon_ref: input.evaluation_horizon_ref,
    realized_fact_refs: input.realized_fact_refs,
    realized_fact_classes: input.realized_fact_classes,
    realized_direction: input.realized_direction,
    realized_magnitude_class: input.realized_magnitude_class,
    realized_summary_codes: input.realized_summary_codes,
    completeness_class: input.completeness_class,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Alignment classifier ─────────────────────────────────────────

export function classifyL14OutcomeAlignment(
  expected: L14ExpectedEffectProfile,
  realized: L14RealizedOutcomeProfile,
  horizon: L14EvaluationHorizon,
): L14OutcomeAlignmentClass {
  if (!horizon.horizon_elapsed) return L14OutcomeAlignmentClass.NOT_YET_EVALUABLE;
  if (realized.completeness_class === L14RealizedOutcomeCompletenessClass.MISSING_REQUIRED_FACTS) return L14OutcomeAlignmentClass.NOT_YET_EVALUABLE;
  if (realized.completeness_class === L14RealizedOutcomeCompletenessClass.PARTIAL_INCONCLUSIVE) return L14OutcomeAlignmentClass.INCONCLUSIVE;
  // Required facts must be present.
  for (const reqFact of expected.required_realized_fact_classes) {
    if (!realized.realized_fact_classes.includes(reqFact)) {
      return L14OutcomeAlignmentClass.NOT_YET_EVALUABLE;
    }
  }
  // Summary codes drive alignment.
  if (realized.realized_summary_codes.includes(L14RealizedOutcomeSummaryCode.EVIDENCE_INSUFFICIENT)) return L14OutcomeAlignmentClass.INCONCLUSIVE;
  if (realized.realized_summary_codes.includes(L14RealizedOutcomeSummaryCode.OPPOSITE_EFFECT_OBSERVED)) return L14OutcomeAlignmentClass.MISALIGNED;
  if (realized.realized_summary_codes.includes(L14RealizedOutcomeSummaryCode.NO_MATERIAL_EFFECT_OBSERVED)) return L14OutcomeAlignmentClass.MISALIGNED;
  if (realized.realized_summary_codes.includes(L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_PARTIALLY_MATERIALIZED)) return L14OutcomeAlignmentClass.PARTIALLY_ALIGNED;
  if (realized.realized_summary_codes.includes(L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED)) return L14OutcomeAlignmentClass.ALIGNED;
  return L14OutcomeAlignmentClass.INCONCLUSIVE;
}

// ── Score outcome ────────────────────────────────────────────────

export interface L14ScoreOutcomeInput {
  readonly score_ref: string;
  readonly score_family_ref: string;
  readonly calibration_target_ref: string;
  readonly score_band_at_emission: string;
  readonly score_value_at_emission: number;
  readonly expected: L14ExpectedEffectProfile;
  readonly realized: L14RealizedOutcomeProfile;
  readonly horizon: L14EvaluationHorizon;
}

export function evaluateL14ScoreOutcome(
  input: L14ScoreOutcomeInput,
): L14ScoreOutcomeEvaluation {
  const align = classifyL14OutcomeAlignment(input.expected, input.realized, input.horizon);
  let calibration: L14ScoreCalibrationObservationClass;
  switch (align) {
    case L14OutcomeAlignmentClass.ALIGNED:
      calibration = L14ScoreCalibrationObservationClass.SCORE_ALIGNED_WITH_TARGET;
      break;
    case L14OutcomeAlignmentClass.PARTIALLY_ALIGNED:
      calibration = L14ScoreCalibrationObservationClass.SCORE_PARTIALLY_ALIGNED_WITH_TARGET;
      break;
    case L14OutcomeAlignmentClass.MISALIGNED:
      calibration = L14ScoreCalibrationObservationClass.SCORE_MISALIGNED_WITH_TARGET;
      break;
    default:
      calibration = L14ScoreCalibrationObservationClass.SCORE_RESULT_INCONCLUSIVE;
  }
  const replayHash = fnv1a([
    input.score_ref,
    input.calibration_target_ref,
    input.expected.expected_effect_profile_id,
    input.realized.realized_effect_profile_id,
    align,
    calibration,
    POLICY_V,
  ].join('|'));
  return {
    score_outcome_evaluation_id: `l14.score.outcome.${replayHash}`,
    score_ref: input.score_ref,
    score_family_ref: input.score_family_ref,
    calibration_target_ref: input.calibration_target_ref,
    score_band_at_emission: input.score_band_at_emission,
    score_value_at_emission: input.score_value_at_emission,
    expected_effect_profile_ref: input.expected.expected_effect_profile_id,
    realized_effect_profile_ref: input.realized.realized_effect_profile_id,
    outcome_alignment_class: align,
    calibration_observation_class: calibration,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Confidence accuracy ──────────────────────────────────────────

const HIGH_BANDS = new Set(['HIGH', 'VERY_HIGH', 'CRITICAL']);
const LOW_BANDS = new Set(['LOW', 'VERY_LOW', 'BLOCKED']);

export function evaluateL14ConfidenceAccuracy(input: {
  evaluated_artifact_ref: string;
  evaluated_artifact_class: L14EvaluatedArtifactClass;
  emitted_confidence_band: string;
  emitted_confidence_restriction_class?: string;
  outcome_alignment_class: L14OutcomeAlignmentClass;
}): L14ConfidenceAccuracyProfile {
  const band = input.emitted_confidence_band.toUpperCase();
  const isHigh = HIGH_BANDS.has(band);
  const isLow = LOW_BANDS.has(band);
  const align = input.outcome_alignment_class;
  let cls: L14ConfidenceAccuracyClass;
  let over = false;
  let under = false;
  if (align === L14OutcomeAlignmentClass.NOT_YET_EVALUABLE || align === L14OutcomeAlignmentClass.INCONCLUSIVE) {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_NOT_EVALUABLE;
  } else if (align === L14OutcomeAlignmentClass.ALIGNED && isHigh) {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_APPROPRIATELY_HIGH;
  } else if (align === L14OutcomeAlignmentClass.ALIGNED && isLow) {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_UNDERSTATED; under = true;
  } else if (align === L14OutcomeAlignmentClass.ALIGNED) {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_APPROPRIATELY_MEDIUM;
  } else if (align === L14OutcomeAlignmentClass.MISALIGNED && isHigh) {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_OVERSTATED; over = true;
  } else if (align === L14OutcomeAlignmentClass.MISALIGNED && isLow) {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_APPROPRIATELY_LOW;
  } else if (align === L14OutcomeAlignmentClass.MISALIGNED) {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_OVERSTATED; over = true;
  } else if (align === L14OutcomeAlignmentClass.PARTIALLY_ALIGNED && isHigh) {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_OVERSTATED; over = true;
  } else {
    cls = L14ConfidenceAccuracyClass.CONFIDENCE_APPROPRIATELY_MEDIUM;
  }
  const replayHash = fnv1a([input.evaluated_artifact_ref, band, align, cls, POLICY_V].join('|'));
  return {
    confidence_accuracy_id: `l14.confidence.${replayHash}`,
    evaluated_artifact_ref: input.evaluated_artifact_ref,
    evaluated_artifact_class: input.evaluated_artifact_class,
    emitted_confidence_band: band,
    emitted_confidence_restriction_class: input.emitted_confidence_restriction_class,
    outcome_alignment_class: align,
    confidence_accuracy_class: cls,
    overstatement_flag: over,
    understatement_flag: under,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Hypothesis outcome ──────────────────────────────────────────

export function evaluateL14HypothesisOutcome(input: {
  hypothesis_ref: string;
  hypothesis_family_ref: string;
  expected_confirmation_refs: readonly string[];
  invalidation_refs: readonly string[];
  realized_confirmation_refs: readonly string[];
  realized_invalidation_refs: readonly string[];
  ranking_persistence_class: L14HypothesisRankingPersistenceClass;
  support_persistence_class: L14HypothesisSupportPersistenceClass;
}): L14HypothesisOutcomeEvaluation {
  let align: L14OutcomeAlignmentClass;
  switch (input.support_persistence_class) {
    case L14HypothesisSupportPersistenceClass.SUPPORT_STRENGTHENED:
    case L14HypothesisSupportPersistenceClass.SUPPORT_HELD:
      align = L14OutcomeAlignmentClass.ALIGNED;
      break;
    case L14HypothesisSupportPersistenceClass.SUPPORT_WEAKENED:
      align = L14OutcomeAlignmentClass.PARTIALLY_ALIGNED;
      break;
    case L14HypothesisSupportPersistenceClass.INVALIDATED:
      align = L14OutcomeAlignmentClass.MISALIGNED;
      break;
    default:
      align = L14OutcomeAlignmentClass.INCONCLUSIVE;
  }
  const replayHash = fnv1a([input.hypothesis_ref, input.support_persistence_class, input.ranking_persistence_class, align, POLICY_V].join('|'));
  return {
    hypothesis_outcome_evaluation_id: `l14.hypothesis.outcome.${replayHash}`,
    hypothesis_ref: input.hypothesis_ref,
    hypothesis_family_ref: input.hypothesis_family_ref,
    expected_confirmation_refs: input.expected_confirmation_refs,
    invalidation_refs: input.invalidation_refs,
    realized_confirmation_refs: input.realized_confirmation_refs,
    realized_invalidation_refs: input.realized_invalidation_refs,
    ranking_persistence_class: input.ranking_persistence_class,
    support_persistence_class: input.support_persistence_class,
    outcome_alignment_class: align,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Scenario outcome ────────────────────────────────────────────

export function evaluateL14ScenarioOutcome(input: {
  scenario_set_ref: string;
  scenario_ref: string;
  scenario_family_ref: string;
  base_case_at_emission: boolean;
  path_confidence_at_emission: string;
  expected_trigger_refs: readonly string[];
  invalidation_refs: readonly string[];
  realized_trigger_refs: readonly string[];
  realized_invalidation_refs: readonly string[];
  path_resolution_class: L14ScenarioPathResolutionClass;
}): L14ScenarioOutcomeEvaluation {
  let align: L14OutcomeAlignmentClass;
  switch (input.path_resolution_class) {
    case L14ScenarioPathResolutionClass.BASE_CASE_FOLLOWED:
      align = L14OutcomeAlignmentClass.ALIGNED;
      break;
    case L14ScenarioPathResolutionClass.BASE_CASE_PARTIALLY_FOLLOWED:
      align = L14OutcomeAlignmentClass.PARTIALLY_ALIGNED;
      break;
    case L14ScenarioPathResolutionClass.ALTERNATIVE_PATH_RESOLVED:
    case L14ScenarioPathResolutionClass.FAILURE_CONDITION_ACTIVATED:
      align = L14OutcomeAlignmentClass.MISALIGNED;
      break;
    case L14ScenarioPathResolutionClass.INCONCLUSIVE_WITHIN_HORIZON:
      align = L14OutcomeAlignmentClass.INCONCLUSIVE;
      break;
    default:
      align = L14OutcomeAlignmentClass.NOT_YET_EVALUABLE;
  }
  const replayHash = fnv1a([input.scenario_ref, input.path_resolution_class, align, POLICY_V].join('|'));
  return {
    scenario_outcome_evaluation_id: `l14.scenario.outcome.${replayHash}`,
    scenario_set_ref: input.scenario_set_ref,
    scenario_ref: input.scenario_ref,
    scenario_family_ref: input.scenario_family_ref,
    base_case_at_emission: input.base_case_at_emission,
    path_confidence_at_emission: input.path_confidence_at_emission,
    expected_trigger_refs: input.expected_trigger_refs,
    invalidation_refs: input.invalidation_refs,
    realized_trigger_refs: input.realized_trigger_refs,
    realized_invalidation_refs: input.realized_invalidation_refs,
    path_resolution_class: input.path_resolution_class,
    outcome_alignment_class: align,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Trigger outcome ─────────────────────────────────────────────

export function evaluateL14TriggerOutcome(input: {
  trigger_ref: string;
  scenario_ref: string;
  trigger_activation_time: string;
  expected: L14ExpectedEffectProfile;
  realized: L14RealizedOutcomeProfile;
  horizon: L14EvaluationHorizon;
}): L14TriggerOutcomeEvaluation {
  const align = classifyL14OutcomeAlignment(input.expected, input.realized, input.horizon);
  let sig: L14TriggerSignificanceClass;
  switch (align) {
    case L14OutcomeAlignmentClass.ALIGNED:
      sig = L14TriggerSignificanceClass.SIGNIFICANT_CONFIRMATORY_TRIGGER;
      break;
    case L14OutcomeAlignmentClass.PARTIALLY_ALIGNED:
      sig = L14TriggerSignificanceClass.PARTIALLY_SIGNIFICANT_TRIGGER;
      break;
    case L14OutcomeAlignmentClass.MISALIGNED:
      sig = input.realized.realized_summary_codes.includes(L14RealizedOutcomeSummaryCode.OPPOSITE_EFFECT_OBSERVED)
        ? L14TriggerSignificanceClass.TRIGGER_EFFECT_CONTRADICTED
        : L14TriggerSignificanceClass.WEAK_OR_NOISY_TRIGGER;
      break;
    case L14OutcomeAlignmentClass.NOT_YET_EVALUABLE:
      sig = L14TriggerSignificanceClass.NOT_YET_EVALUABLE;
      break;
    default:
      sig = L14TriggerSignificanceClass.WEAK_OR_NOISY_TRIGGER;
  }
  const replayHash = fnv1a([input.trigger_ref, input.scenario_ref, align, sig, POLICY_V].join('|'));
  return {
    trigger_outcome_evaluation_id: `l14.trigger.outcome.${replayHash}`,
    trigger_ref: input.trigger_ref,
    scenario_ref: input.scenario_ref,
    trigger_activation_time: input.trigger_activation_time,
    expected_effect_profile_ref: input.expected.expected_effect_profile_id,
    realized_effect_profile_ref: input.realized.realized_effect_profile_id,
    trigger_significance_class: sig,
    outcome_alignment_class: align,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Invalidation outcome ────────────────────────────────────────

export function evaluateL14InvalidationOutcome(input: {
  invalidation_ref: string;
  scenario_ref: string;
  invalidation_activation_time: string;
  expected: L14ExpectedEffectProfile;
  realized: L14RealizedOutcomeProfile;
  horizon: L14EvaluationHorizon;
}): L14InvalidationOutcomeEvaluation {
  const align = classifyL14OutcomeAlignment(input.expected, input.realized, input.horizon);
  let cls: L14InvalidationEffectivenessClass;
  switch (align) {
    case L14OutcomeAlignmentClass.ALIGNED:
      cls = L14InvalidationEffectivenessClass.INVALIDATION_CORRECTLY_SIGNALLED_PATH_DEGRADATION;
      break;
    case L14OutcomeAlignmentClass.PARTIALLY_ALIGNED:
      cls = L14InvalidationEffectivenessClass.INVALIDATION_PARTIALLY_SIGNALLED_WEAKNESS;
      break;
    case L14OutcomeAlignmentClass.MISALIGNED:
      cls = input.realized.realized_summary_codes.includes(L14RealizedOutcomeSummaryCode.OPPOSITE_EFFECT_OBSERVED)
        ? L14InvalidationEffectivenessClass.INVALIDATION_EFFECT_CONTRADICTED
        : L14InvalidationEffectivenessClass.INVALIDATION_TOO_EARLY_OR_NOISY;
      break;
    case L14OutcomeAlignmentClass.NOT_YET_EVALUABLE:
      cls = L14InvalidationEffectivenessClass.NOT_YET_EVALUABLE;
      break;
    default:
      cls = L14InvalidationEffectivenessClass.INVALIDATION_TOO_EARLY_OR_NOISY;
  }
  const replayHash = fnv1a([input.invalidation_ref, input.scenario_ref, align, cls, POLICY_V].join('|'));
  return {
    invalidation_outcome_evaluation_id: `l14.invalidation.outcome.${replayHash}`,
    invalidation_ref: input.invalidation_ref,
    scenario_ref: input.scenario_ref,
    invalidation_activation_time: input.invalidation_activation_time,
    expected_failure_effect_profile_ref: input.expected.expected_effect_profile_id,
    realized_effect_profile_ref: input.realized.realized_effect_profile_id,
    invalidation_effectiveness_class: cls,
    outcome_alignment_class: align,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Alert outcome ───────────────────────────────────────────────

export function evaluateL14AlertOutcome(input: {
  alert_ref: string;
  alert_class_ref: string;
  source_artifact_refs: readonly string[];
  alert_semantic_claim_ref: string;
  expected: L14ExpectedEffectProfile;
  realized: L14RealizedOutcomeProfile;
  horizon: L14EvaluationHorizon;
  false_positive_profile_ref?: string;
  alert_effectiveness_profile_ref?: string;
}): L14AlertOutcomeEvaluation {
  const align = classifyL14OutcomeAlignment(input.expected, input.realized, input.horizon);
  const replayHash = fnv1a([input.alert_ref, input.alert_class_ref, input.alert_semantic_claim_ref, align, POLICY_V].join('|'));
  return {
    alert_outcome_evaluation_id: `l14.alert.outcome.${replayHash}`,
    alert_ref: input.alert_ref,
    alert_class_ref: input.alert_class_ref,
    source_artifact_refs: input.source_artifact_refs,
    alert_semantic_claim_ref: input.alert_semantic_claim_ref,
    expected_effect_profile_ref: input.expected.expected_effect_profile_id,
    realized_effect_profile_ref: input.realized.realized_effect_profile_id,
    outcome_alignment_class: align,
    false_positive_profile_ref: input.false_positive_profile_ref,
    alert_effectiveness_profile_ref: input.alert_effectiveness_profile_ref,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Explanation outcome ────────────────────────────────────────

export function evaluateL14ExplanationOutcome(input: {
  l13_output_ref: string;
  output_class_ref: string;
  linked_scenario_refs: readonly string[];
  linked_score_refs: readonly string[];
  linked_hypothesis_refs: readonly string[];
  stated_watchpoint_refs: readonly string[];
  stated_invalidation_refs: readonly string[];
  realized_relevance_refs: readonly string[];
  consistency_class: L14ExplanationOutcomeConsistencyClass;
}): L14ExplanationOutcomeEvaluation {
  let align: L14OutcomeAlignmentClass;
  switch (input.consistency_class) {
    case L14ExplanationOutcomeConsistencyClass.EXPLANATION_REMAINED_OUTCOME_CONSISTENT:
      align = L14OutcomeAlignmentClass.ALIGNED;
      break;
    case L14ExplanationOutcomeConsistencyClass.EXPLANATION_PARTIALLY_CONSISTENT:
      align = L14OutcomeAlignmentClass.PARTIALLY_ALIGNED;
      break;
    case L14ExplanationOutcomeConsistencyClass.EXPLANATION_BECAME_OUTCOME_MISALIGNED:
      align = L14OutcomeAlignmentClass.MISALIGNED;
      break;
    default:
      align = L14OutcomeAlignmentClass.NOT_YET_EVALUABLE;
  }
  const replayHash = fnv1a([input.l13_output_ref, input.consistency_class, align, POLICY_V].join('|'));
  return {
    explanation_outcome_evaluation_id: `l14.explanation.outcome.${replayHash}`,
    l13_output_ref: input.l13_output_ref,
    output_class_ref: input.output_class_ref,
    linked_scenario_refs: input.linked_scenario_refs,
    linked_score_refs: input.linked_score_refs,
    linked_hypothesis_refs: input.linked_hypothesis_refs,
    stated_watchpoint_refs: input.stated_watchpoint_refs,
    stated_invalidation_refs: input.stated_invalidation_refs,
    realized_relevance_refs: input.realized_relevance_refs,
    explanation_outcome_consistency_class: input.consistency_class,
    outcome_alignment_class: align,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── False classification engine ────────────────────────────────

export function classifyL14FalseClassification(input: {
  evaluated_artifact_ref: string;
  evaluated_artifact_class: L14EvaluatedArtifactClass;
  alignment: L14OutcomeAlignmentClass;
  horizon_ref: string;
  horizon_elapsed: boolean;
  realized: L14RealizedOutcomeProfile;
  eligible_omission_present?: boolean;
  regime_ref?: string;
}): L14FalseClassificationProfile {
  let status: L14FalseClassificationStatus;
  let falsePositive = false;
  let falseNegative = false;
  const reasons: L14FalseClassificationReasonCode[] = [];
  if (!input.horizon_elapsed) {
    status = L14FalseClassificationStatus.NOT_YET_EVALUABLE;
    reasons.push(L14FalseClassificationReasonCode.HORIZON_NOT_ELAPSED);
  } else if (input.alignment === L14OutcomeAlignmentClass.MISALIGNED) {
    status = L14FalseClassificationStatus.FALSE_POSITIVE_CONFIRMED;
    falsePositive = true;
    if (input.realized.realized_summary_codes.includes(L14RealizedOutcomeSummaryCode.OPPOSITE_EFFECT_OBSERVED)) {
      reasons.push(L14FalseClassificationReasonCode.OPPOSITE_EFFECT_OCCURRED);
    } else {
      reasons.push(L14FalseClassificationReasonCode.EXPECTED_EFFECT_FAILED_WITHIN_HORIZON);
    }
  } else if (input.eligible_omission_present) {
    status = L14FalseClassificationStatus.FALSE_NEGATIVE_CONFIRMED;
    falseNegative = true;
    reasons.push(L14FalseClassificationReasonCode.ELIGIBLE_OMISSION_DETECTED);
  } else if (input.alignment === L14OutcomeAlignmentClass.ALIGNED || input.alignment === L14OutcomeAlignmentClass.PARTIALLY_ALIGNED) {
    status = L14FalseClassificationStatus.NOT_FALSE_POSITIVE;
  } else if (input.alignment === L14OutcomeAlignmentClass.INCONCLUSIVE) {
    status = L14FalseClassificationStatus.INCONCLUSIVE;
    reasons.push(L14FalseClassificationReasonCode.OUTCOME_INCONCLUSIVE);
  } else {
    status = L14FalseClassificationStatus.NOT_YET_EVALUABLE;
    reasons.push(L14FalseClassificationReasonCode.HORIZON_NOT_ELAPSED);
  }
  const replayHash = fnv1a([
    input.evaluated_artifact_ref,
    input.evaluated_artifact_class,
    input.alignment,
    input.horizon_ref,
    String(input.horizon_elapsed),
    status,
    reasons.slice().sort().join(','),
    String(falsePositive),
    String(falseNegative),
    input.regime_ref ?? '',
    POLICY_V,
  ].join('|'));
  return {
    false_classification_profile_id: `l14.falseclass.${replayHash}`,
    evaluated_artifact_ref: input.evaluated_artifact_ref,
    evaluated_artifact_class: input.evaluated_artifact_class,
    false_positive_flag: falsePositive,
    false_negative_flag: falseNegative,
    classification_status: status,
    classification_reason_codes: reasons,
    regime_ref: input.regime_ref,
    horizon_ref: input.horizon_ref,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Alert effectiveness composer ───────────────────────────────

export function composeL14AlertEffectiveness(input: {
  alert_ref: string;
  alignment: L14OutcomeAlignmentClass;
  high_engagement: boolean;
  behavioral_response_summary_ref?: string;
}): L14AlertEffectivenessProfile {
  let matrix: L14AlertEffectivenessMatrixClass;
  switch (input.alignment) {
    case L14OutcomeAlignmentClass.ALIGNED:
    case L14OutcomeAlignmentClass.PARTIALLY_ALIGNED:
      matrix = input.high_engagement
        ? L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_HIGH_ENGAGEMENT
        : L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_LOW_ENGAGEMENT;
      break;
    case L14OutcomeAlignmentClass.MISALIGNED:
      matrix = input.high_engagement
        ? L14AlertEffectivenessMatrixClass.OUTCOME_MISALIGNED_HIGH_ENGAGEMENT
        : L14AlertEffectivenessMatrixClass.OUTCOME_MISALIGNED_LOW_ENGAGEMENT;
      break;
    case L14OutcomeAlignmentClass.INCONCLUSIVE:
      matrix = input.high_engagement
        ? L14AlertEffectivenessMatrixClass.OUTCOME_INCONCLUSIVE_BEHAVIOR_HIGH
        : L14AlertEffectivenessMatrixClass.OUTCOME_INCONCLUSIVE_BEHAVIOR_LOW;
      break;
    default:
      matrix = L14AlertEffectivenessMatrixClass.NOT_YET_EVALUABLE;
  }
  const replayHash = fnv1a([input.alert_ref, input.alignment, String(input.high_engagement), matrix, POLICY_V].join('|'));
  return {
    alert_effectiveness_profile_id: `l14.effectiveness.${replayHash}`,
    alert_ref: input.alert_ref,
    outcome_alignment_class: input.alignment,
    behavioral_response_summary_ref: input.behavioral_response_summary_ref,
    effectiveness_matrix_class: matrix,
    may_feed_alert_calibration_evidence: matrix !== L14AlertEffectivenessMatrixClass.NOT_YET_EVALUABLE,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Regime context binder ──────────────────────────────────────

export function bindL14OutcomeRegimeContext(input: {
  evaluation_ref: string;
  regime_ref: string;
  primary_regime_at_emission: string;
  transition_risk_at_emission?: string;
  regime_changed_during_horizon: boolean;
  realized_regime_ref_at_resolution?: string;
}): L14OutcomeRegimeContext {
  const replayHash = fnv1a([
    input.evaluation_ref,
    input.regime_ref,
    input.primary_regime_at_emission,
    input.transition_risk_at_emission ?? '',
    String(input.regime_changed_during_horizon),
    input.realized_regime_ref_at_resolution ?? '',
    POLICY_V,
  ].join('|'));
  return {
    outcome_regime_context_id: `l14.regime.${replayHash}`,
    evaluation_ref: input.evaluation_ref,
    regime_ref: input.regime_ref,
    primary_regime_at_emission: input.primary_regime_at_emission,
    transition_risk_at_emission: input.transition_risk_at_emission,
    regime_changed_during_horizon: input.regime_changed_during_horizon,
    realized_regime_ref_at_resolution: input.realized_regime_ref_at_resolution,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Outcome evaluation record builder ──────────────────────────

export interface L14OutcomeEvaluationRecordInput {
  readonly request: L14OutcomeEvaluationRequest;
  readonly horizon: L14EvaluationHorizon;
  readonly expected: L14ExpectedEffectProfile;
  readonly realized: L14RealizedOutcomeProfile;
  readonly alignment: L14OutcomeAlignmentClass;
  readonly false_classification?: L14FalseClassificationProfile;
  readonly confidence_accuracy?: L14ConfidenceAccuracyProfile;
  readonly alert_effectiveness?: L14AlertEffectivenessProfile;
  readonly regime_context?: L14OutcomeRegimeContext;
  readonly evaluation_semantics_ref: string;
  readonly score_family_ref?: string;
  readonly hypothesis_family_ref?: string;
  readonly scenario_family_ref?: string;
  readonly alert_class_ref?: string;
  readonly calibration_target_ref?: string;
  readonly limitations?: readonly L14OutcomeInterpretationLimitation[];
}

export function buildL14OutcomeEvaluationRecord(
  input: L14OutcomeEvaluationRecordInput,
): L14OutcomeEvaluationRecord {
  const status = input.horizon.horizon_elapsed && input.realized.completeness_class !== L14RealizedOutcomeCompletenessClass.MISSING_REQUIRED_FACTS
    ? L14OutcomeEvaluationStatus.EVALUATED
    : !input.horizon.horizon_elapsed
      ? L14OutcomeEvaluationStatus.WAITING_FOR_HORIZON
      : L14OutcomeEvaluationStatus.WAITING_FOR_REALIZED_OUTCOME_FACT;
  const limitations = input.limitations ?? [];
  const replayHash = fnv1a([
    input.request.outcome_evaluation_request_id,
    input.horizon.horizon_id,
    input.expected.expected_effect_profile_id,
    input.realized.realized_effect_profile_id,
    input.alignment,
    input.false_classification?.false_classification_profile_id ?? '',
    input.confidence_accuracy?.confidence_accuracy_id ?? '',
    input.alert_effectiveness?.alert_effectiveness_profile_id ?? '',
    input.regime_context?.outcome_regime_context_id ?? '',
    status,
    POLICY_V,
  ].join('|'));
  return {
    outcome_evaluation_id: `l14.outcome.evaluation.${replayHash}`,
    evaluated_artifact_class: input.request.evaluated_artifact_class,
    evaluated_artifact_ref: input.request.evaluated_artifact_ref,
    evaluation_horizon: input.horizon,
    realized_outcome_ref: input.realized.realized_effect_profile_id,
    calibration_target_ref: input.calibration_target_ref,
    outcome_alignment_class: input.alignment,
    false_positive_flag: input.false_classification?.false_positive_flag === true,
    false_negative_flag: input.false_classification?.false_negative_flag === true,
    regime_ref: input.regime_context?.regime_ref,
    score_family_ref: input.score_family_ref,
    hypothesis_family_ref: input.hypothesis_family_ref,
    scenario_family_ref: input.scenario_family_ref,
    alert_class_ref: input.alert_class_ref,
    evaluation_semantics_ref: input.evaluation_semantics_ref,
    expected_effect_profile_ref: input.expected.expected_effect_profile_id,
    realized_effect_profile_ref: input.realized.realized_effect_profile_id,
    confidence_accuracy_ref: input.confidence_accuracy?.confidence_accuracy_id,
    false_classification_profile_ref: input.false_classification?.false_classification_profile_id,
    alert_effectiveness_profile_ref: input.alert_effectiveness?.alert_effectiveness_profile_id,
    evaluation_status: status,
    interpretation_limitations: limitations,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
