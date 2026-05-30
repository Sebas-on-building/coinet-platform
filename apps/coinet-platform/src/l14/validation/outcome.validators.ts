/**
 * L14.5 — Outcome Evaluation Validators
 *
 * §14.5.62 / §14.5.63 — Consolidated per-shape validators.
 * Each validator returns { clean, issues } and uses L14O_* codes.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import {
  L14EvaluatedArtifactClass,
  L14OutcomeAlignmentClass,
  L14OutcomeEvaluationStatus,
  type L14EvaluationHorizon,
  type L14OutcomeEvaluationRecord,
  type L14OutcomeEvaluationRequest,
} from '../contracts/outcome-evaluation-core';
import {
  L14ExpectedEffectClass,
  L14RealizedOutcomeCompletenessClass,
  L14RealizedOutcomeSummaryCode,
  type L14ExpectedEffectProfile,
  type L14OutcomeRegimeContext,
  type L14RealizedOutcomeProfile,
} from '../contracts/outcome-evaluation-effects';
import {
  L14ConfidenceAccuracyClass,
  L14ScoreCalibrationObservationClass,
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
  L14FalseClassificationStatus,
  type L14AlertEffectivenessProfile,
  type L14FalseClassificationProfile,
} from '../contracts/outcome-evaluation-classification';
import { L14OutcomeViolationCode as C } from './l14-outcome-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;

export interface L14OutcomeIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14OutcomeValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14OutcomeIssue[];
}

function result(issues: readonly L14OutcomeIssue[]): L14OutcomeValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: C, severity: L14ConstitutionalAuditSeverity, message: string): L14OutcomeIssue {
  return { code, severity, message };
}

// ── 1. Evaluation request ─────────────────────────────────────────

export function validateL14OutcomeEvaluationRequest(
  r: L14OutcomeEvaluationRequest,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!r.outcome_evaluation_request_id) {
    issues.push(err(C.L14O_EVALUATION_REQUEST_MISSING, SEV.ERROR, 'outcome_evaluation_request_id missing'));
  }
  if (!r.evaluated_artifact_ref) {
    issues.push(err(C.L14O_EVALUATED_ARTIFACT_REF_MISSING, SEV.ERROR, 'evaluated_artifact_ref missing'));
  }
  if (!Object.values(L14EvaluatedArtifactClass).includes(r.evaluated_artifact_class)) {
    issues.push(err(C.L14O_UNREGISTERED_ARTIFACT_CLASS, SEV.CRITICAL, `unregistered artifact class: ${r.evaluated_artifact_class}`));
  }
  if (!r.replay_hash) issues.push(err(C.L14O_REPLAY_HASH_MISSING, SEV.ERROR, 'replay_hash missing'));
  if (!r.lineage_refs || r.lineage_refs.length === 0) {
    issues.push(err(C.L14O_LINEAGE_MISSING, SEV.ERROR, 'lineage_refs empty'));
  }
  return result(issues);
}

// ── 2. Evaluation horizon ─────────────────────────────────────────

export function validateL14EvaluationHorizon(
  h: L14EvaluationHorizon,
  evaluationFinalized: boolean,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!h.horizon_id || !h.horizon_class) {
    issues.push(err(C.L14O_HORIZON_MISSING, SEV.ERROR, 'horizon_id/horizon_class missing'));
  }
  if (evaluationFinalized && !h.horizon_elapsed) {
    issues.push(err(C.L14O_HORIZON_NOT_ELAPSED_BUT_FINALIZED, SEV.CRITICAL, 'evaluation finalized before horizon elapsed'));
  }
  const ALLOWED_SOURCES = ['L11_CALIBRATION_TARGET', 'L12_SCENARIO_POLICY', 'L13_ALERT_POLICY', 'L14_OUTCOME_EVALUATION_POLICY'];
  if (!ALLOWED_SOURCES.includes(h.horizon_source as string)) {
    issues.push(err(C.L14O_HORIZON_SOURCE_ILLEGAL, SEV.CRITICAL, `illegal horizon_source: ${h.horizon_source}`));
  }
  return result(issues);
}

// ── 3. Expected effect profile ────────────────────────────────────

export function validateL14ExpectedEffectProfile(
  p: L14ExpectedEffectProfile,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!p.expected_effect_profile_id) {
    issues.push(err(C.L14O_EXPECTED_EFFECT_PROFILE_MISSING, SEV.ERROR, 'expected_effect_profile_id missing'));
  }
  // Cross-artifact legality (small precondition set).
  const cls = p.evaluated_artifact_class;
  const eff = p.expected_effect_class;
  const allowed: Record<L14EvaluatedArtifactClass, readonly L14ExpectedEffectClass[]> = {
    [L14EvaluatedArtifactClass.SCORE]: [
      L14ExpectedEffectClass.FORWARD_RETURN_OUTPERFORMANCE,
      L14ExpectedEffectClass.FORWARD_RETURN_UNDERPERFORMANCE,
      L14ExpectedEffectClass.MAX_DRAWDOWN_RISK,
      L14ExpectedEffectClass.VOLATILITY_SPIKE,
      L14ExpectedEffectClass.LIQUIDITY_STRESS_INCREASE,
    ],
    [L14EvaluatedArtifactClass.SCORE_CONFIDENCE]: [L14ExpectedEffectClass.CONFIDENCE_WELL_CALIBRATED],
    [L14EvaluatedArtifactClass.HYPOTHESIS]: [
      L14ExpectedEffectClass.HYPOTHESIS_SUPPORT_PERSISTENCE,
      L14ExpectedEffectClass.HYPOTHESIS_INVALIDATION,
    ],
    [L14EvaluatedArtifactClass.SCENARIO]: [
      L14ExpectedEffectClass.SCENARIO_PATH_FOLLOW_THROUGH,
      L14ExpectedEffectClass.SCENARIO_PATH_FAILURE,
    ],
    [L14EvaluatedArtifactClass.TRIGGER]: [L14ExpectedEffectClass.TRIGGER_SIGNIFICANCE],
    [L14EvaluatedArtifactClass.INVALIDATION]: [L14ExpectedEffectClass.INVALIDATION_MATERIALIZATION],
    [L14EvaluatedArtifactClass.ALERT]: [L14ExpectedEffectClass.ALERT_OUTCOME_RELEVANCE],
    [L14EvaluatedArtifactClass.L13_EXPLANATION]: [L14ExpectedEffectClass.EXPLANATION_OUTCOME_CONSISTENCY],
  };
  if (allowed[cls] && !allowed[cls]!.includes(eff)) {
    issues.push(err(C.L14O_EXPECTED_EFFECT_CLASS_ILLEGAL_FOR_ARTIFACT, SEV.CRITICAL, `expected_effect_class ${eff} illegal for ${cls}`));
  }
  return result(issues);
}

// ── 4. Realized outcome profile ───────────────────────────────────

export function validateL14RealizedOutcomeProfile(
  p: L14RealizedOutcomeProfile,
  markedAligned: boolean,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!p.realized_effect_profile_id) {
    issues.push(err(C.L14O_REALIZED_OUTCOME_REF_MISSING, SEV.ERROR, 'realized_effect_profile_id missing'));
  }
  if (!p.replay_hash) issues.push(err(C.L14O_REPLAY_HASH_MISSING, SEV.ERROR, 'replay_hash missing'));
  if (!p.lineage_refs || p.lineage_refs.length === 0) {
    issues.push(err(C.L14O_LINEAGE_MISSING, SEV.ERROR, 'lineage_refs empty'));
  }
  if (markedAligned && (
    p.completeness_class === L14RealizedOutcomeCompletenessClass.MISSING_REQUIRED_FACTS ||
    p.completeness_class === L14RealizedOutcomeCompletenessClass.PARTIAL_INCONCLUSIVE
  )) {
    issues.push(err(C.L14O_REALIZED_FACTS_INCOMPLETE_BUT_MARKED_ALIGNED, SEV.CRITICAL,
      'realized facts incomplete but evaluation marked ALIGNED'));
  }
  return result(issues);
}

// ── 5. Score outcome ──────────────────────────────────────────────

export function validateL14ScoreOutcomeEvaluation(
  e: L14ScoreOutcomeEvaluation,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!e.calibration_target_ref) {
    issues.push(err(C.L14O_SCORE_EVALUATED_WITHOUT_L11_TARGET, SEV.CRITICAL,
      'score evaluated without L11 calibration target'));
  }
  if (!e.expected_effect_profile_ref || !e.realized_effect_profile_ref) {
    issues.push(err(C.L14O_EXPECTED_EFFECT_PROFILE_MISSING, SEV.ERROR,
      'score outcome missing expected/realized profile refs'));
  }
  // Honesty: aligned class must match calibration class.
  if (e.outcome_alignment_class === L14OutcomeAlignmentClass.ALIGNED &&
      e.calibration_observation_class !== L14ScoreCalibrationObservationClass.SCORE_ALIGNED_WITH_TARGET) {
    issues.push(err(C.L14O_ALIGNMENT_FALSE_GREEN, SEV.CRITICAL,
      'ALIGNED alignment must produce SCORE_ALIGNED_WITH_TARGET'));
  }
  if (e.outcome_alignment_class === L14OutcomeAlignmentClass.MISALIGNED &&
      e.calibration_observation_class !== L14ScoreCalibrationObservationClass.SCORE_MISALIGNED_WITH_TARGET) {
    issues.push(err(C.L14O_MISALIGNMENT_HIDDEN, SEV.CRITICAL,
      'MISALIGNED alignment must produce SCORE_MISALIGNED_WITH_TARGET'));
  }
  if (!e.lineage_refs || e.lineage_refs.length === 0) {
    issues.push(err(C.L14O_LINEAGE_MISSING, SEV.ERROR, 'lineage_refs empty'));
  }
  return result(issues);
}

// ── 6. Confidence accuracy ────────────────────────────────────────

export function validateL14ConfidenceAccuracyProfile(
  p: L14ConfidenceAccuracyProfile,
  required: boolean,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (required && !p.confidence_accuracy_id) {
    issues.push(err(C.L14O_CONFIDENCE_ACCURACY_MISSING_WHEN_REQUIRED, SEV.ERROR,
      'confidence accuracy profile required but missing'));
  }
  if (p.outcome_alignment_class === L14OutcomeAlignmentClass.MISALIGNED &&
      p.confidence_accuracy_class === L14ConfidenceAccuracyClass.CONFIDENCE_APPROPRIATELY_HIGH) {
    issues.push(err(C.L14O_OVERCONFIDENCE_HIDDEN, SEV.CRITICAL,
      'misaligned outcome reported as CONFIDENCE_APPROPRIATELY_HIGH'));
  }
  return result(issues);
}

// ── 7. Hypothesis outcome ─────────────────────────────────────────

export function validateL14HypothesisOutcomeEvaluation(
  e: L14HypothesisOutcomeEvaluation,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!e.realized_confirmation_refs && !e.realized_invalidation_refs) {
    issues.push(err(C.L14O_HYPOTHESIS_EVALUATED_BY_PRICE_ONLY, SEV.CRITICAL,
      'hypothesis evaluation requires conditionality refs, not price-only'));
  }
  if (e.realized_confirmation_refs.length === 0 && e.realized_invalidation_refs.length === 0) {
    issues.push(err(C.L14O_HYPOTHESIS_EVALUATED_BY_PRICE_ONLY, SEV.CRITICAL,
      'hypothesis evaluation has no realized confirmation/invalidation refs'));
  }
  return result(issues);
}

// ── 8. Scenario outcome ───────────────────────────────────────────

export function validateL14ScenarioOutcomeEvaluation(
  e: L14ScenarioOutcomeEvaluation,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (e.expected_trigger_refs.length === 0 && e.invalidation_refs.length === 0) {
    issues.push(err(C.L14O_SCENARIO_EVALUATED_AS_BINARY_PREDICTION, SEV.CRITICAL,
      'scenario lacks expected triggers/invalidations — collapsed to binary prediction'));
  }
  return result(issues);
}

// ── 9. Trigger outcome ────────────────────────────────────────────

export function validateL14TriggerOutcomeEvaluation(
  e: L14TriggerOutcomeEvaluation,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!e.expected_effect_profile_ref) {
    issues.push(err(C.L14O_TRIGGER_EVALUATED_WITHOUT_DOWNSTREAM_EFFECT, SEV.CRITICAL,
      'trigger evaluated without declared downstream expected effect'));
  }
  return result(issues);
}

// ── 10. Invalidation outcome ──────────────────────────────────────

export function validateL14InvalidationOutcomeEvaluation(
  e: L14InvalidationOutcomeEvaluation,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!e.expected_failure_effect_profile_ref) {
    issues.push(err(C.L14O_INVALIDATION_EVALUATED_BY_PRICE_DIP_ONLY, SEV.CRITICAL,
      'invalidation evaluated without declared failure effect profile'));
  }
  return result(issues);
}

// ── 11. Alert outcome ─────────────────────────────────────────────

export function validateL14AlertOutcomeEvaluation(
  e: L14AlertOutcomeEvaluation,
  openRateOnly: boolean,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (openRateOnly) {
    issues.push(err(C.L14O_ALERT_EVALUATED_BY_OPEN_RATE, SEV.CRITICAL,
      'alert evaluated by open rate only — engagement collapsed into correctness'));
  }
  if (!e.alert_semantic_claim_ref) {
    issues.push(err(C.L14O_EXPECTED_EFFECT_PROFILE_MISSING, SEV.ERROR,
      'alert evaluation missing semantic claim ref'));
  }
  return result(issues);
}

// ── 12. Explanation outcome ───────────────────────────────────────

export function validateL14ExplanationOutcomeEvaluation(
  e: L14ExplanationOutcomeEvaluation,
  styleScoreOnly: boolean,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (styleScoreOnly) {
    issues.push(err(C.L14O_EXPLANATION_EVALUATED_AS_STYLE_SCORE, SEV.CRITICAL,
      'L13 explanation evaluated as style score — must use outcome consistency'));
  }
  if (e.linked_scenario_refs.length === 0 &&
      e.linked_score_refs.length === 0 &&
      e.linked_hypothesis_refs.length === 0) {
    issues.push(err(C.L14O_EXPLANATION_EVALUATED_AS_STYLE_SCORE, SEV.CRITICAL,
      'explanation outcome has no linked source artifacts'));
  }
  return result(issues);
}

// ── 13. False classification ──────────────────────────────────────

export function validateL14FalseClassificationProfile(
  p: L14FalseClassificationProfile,
  horizonElapsed: boolean,
  eligibleOmissionPresent: boolean,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (p.false_positive_flag && !horizonElapsed) {
    issues.push(err(C.L14O_FALSE_POSITIVE_DECLARED_FROM_IMMEDIATE_PRICE_MOVE, SEV.CRITICAL,
      'false positive declared before horizon elapsed'));
  }
  if (p.false_negative_flag && !eligibleOmissionPresent) {
    issues.push(err(C.L14O_FALSE_NEGATIVE_WITHOUT_ELIGIBLE_OMISSION_BASIS, SEV.CRITICAL,
      'false negative declared without eligible omission basis'));
  }
  if (p.false_positive_flag && p.classification_status !== L14FalseClassificationStatus.FALSE_POSITIVE_CONFIRMED) {
    issues.push(err(C.L14O_MISALIGNMENT_HIDDEN, SEV.CRITICAL,
      'false_positive_flag set but status not FALSE_POSITIVE_CONFIRMED'));
  }
  return result(issues);
}

// ── 14. Alert effectiveness ───────────────────────────────────────

export function validateL14AlertEffectivenessProfile(
  p: L14AlertEffectivenessProfile,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  // Effectiveness MUST keep outcome vs engagement disjoint.
  // INCONCLUSIVE outcome MUST NOT promote to ALIGNED via high engagement.
  if (p.outcome_alignment_class === L14OutcomeAlignmentClass.INCONCLUSIVE && (
    p.effectiveness_matrix_class === L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_HIGH_ENGAGEMENT ||
    p.effectiveness_matrix_class === L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_LOW_ENGAGEMENT
  )) {
    issues.push(err(C.L14O_ALERT_EFFECTIVENESS_COLLAPSES_BEHAVIOR_INTO_TRUTH, SEV.CRITICAL,
      'INCONCLUSIVE outcome must not be promoted to ALIGNED matrix'));
  }
  if (p.outcome_alignment_class === L14OutcomeAlignmentClass.MISALIGNED && (
    p.effectiveness_matrix_class === L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_HIGH_ENGAGEMENT ||
    p.effectiveness_matrix_class === L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_LOW_ENGAGEMENT
  )) {
    issues.push(err(C.L14O_ALERT_EFFECTIVENESS_COLLAPSES_BEHAVIOR_INTO_TRUTH, SEV.CRITICAL,
      'MISALIGNED outcome rewritten as ALIGNED by engagement'));
  }
  return result(issues);
}

// ── 15. Regime context ────────────────────────────────────────────

export function validateL14OutcomeRegimeContext(
  ctx: L14OutcomeRegimeContext | undefined,
  artifactCls: L14EvaluatedArtifactClass,
  regimeChanged: boolean,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  const REGIME_SENSITIVE = new Set<L14EvaluatedArtifactClass>([
    L14EvaluatedArtifactClass.SCORE,
    L14EvaluatedArtifactClass.SCORE_CONFIDENCE,
    L14EvaluatedArtifactClass.SCENARIO,
    L14EvaluatedArtifactClass.HYPOTHESIS,
  ]);
  if (REGIME_SENSITIVE.has(artifactCls) && !ctx) {
    issues.push(err(C.L14O_REGIME_CONTEXT_MISSING_WHEN_REQUIRED, SEV.ERROR,
      'regime context missing for regime-sensitive artifact'));
  }
  if (ctx && regimeChanged && !ctx.regime_changed_during_horizon) {
    issues.push(err(C.L14O_REGIME_SHIFT_IGNORED, SEV.CRITICAL,
      'regime shift occurred but not flagged on context'));
  }
  return result(issues);
}

// ── 16. Master record validator ───────────────────────────────────

export function validateL14OutcomeEvaluationRecord(
  rec: L14OutcomeEvaluationRecord,
): L14OutcomeValidationResult {
  const issues: L14OutcomeIssue[] = [];
  if (!rec.outcome_evaluation_id) {
    issues.push(err(C.L14O_EVALUATION_REQUEST_MISSING, SEV.ERROR, 'outcome_evaluation_id missing'));
  }
  if (!rec.replay_hash) issues.push(err(C.L14O_REPLAY_HASH_MISSING, SEV.ERROR, 'replay_hash missing'));
  if (!rec.lineage_refs || rec.lineage_refs.length === 0) {
    issues.push(err(C.L14O_LINEAGE_MISSING, SEV.ERROR, 'lineage_refs empty'));
  }
  // Inconclusive must not be quietly forced to ALIGNED.
  if (rec.evaluation_status === L14OutcomeEvaluationStatus.EVALUATED &&
      rec.outcome_alignment_class === L14OutcomeAlignmentClass.ALIGNED &&
      !rec.evaluation_horizon.horizon_elapsed) {
    issues.push(err(C.L14O_NOT_YET_EVALUABLE_FORCED_TO_VERDICT, SEV.CRITICAL,
      'EVALUATED+ALIGNED but horizon not elapsed'));
  }
  if (rec.outcome_alignment_class === L14OutcomeAlignmentClass.INCONCLUSIVE &&
      rec.evaluation_status === L14OutcomeEvaluationStatus.EVALUATED &&
      (rec.false_positive_flag || rec.false_negative_flag)) {
    issues.push(err(C.L14O_INCONCLUSIVE_FORCED_TO_ALIGNED, SEV.CRITICAL,
      'INCONCLUSIVE with false_positive/negative flag set'));
  }
  return result(issues);
}
