/**
 * L14.5 — Outcome Evaluation Invariants
 *
 * §14.5.69 — INV-14.5-A through INV-14.5-L.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  L14EvaluatedArtifactClass,
  L14EvaluationHorizonClass,
  L14OutcomeAlignmentClass,
  type L14EvaluationHorizon,
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
} from '../contracts/outcome-evaluation-effects';
import {
  L14ConfidenceAccuracyClass,
  L14ExplanationOutcomeConsistencyClass,
  L14HypothesisRankingPersistenceClass,
  L14HypothesisSupportPersistenceClass,
  L14ScenarioPathResolutionClass,
} from '../contracts/outcome-evaluation-artifacts';
import { L14AlertEffectivenessMatrixClass } from '../contracts/outcome-evaluation-classification';
import {
  bindL14OutcomeRegimeContext,
  buildL14EvaluationHorizon,
  buildL14ExpectedEffectProfile,
  buildL14OutcomeEvaluationRecord,
  buildL14RealizedOutcomeProfile,
  classifyL14FalseClassification,
  classifyL14OutcomeAlignment,
  composeL14AlertEffectiveness,
  evaluateL14AlertOutcome,
  evaluateL14ConfidenceAccuracy,
  evaluateL14ExplanationOutcome,
  evaluateL14HypothesisOutcome,
  evaluateL14InvalidationOutcome,
  evaluateL14OutcomeEligibility,
  evaluateL14ScenarioOutcome,
  evaluateL14ScoreOutcome,
  evaluateL14TriggerOutcome,
} from '../evaluation/outcome-evaluation-engines';
import {
  validateL14AlertEffectivenessProfile,
  validateL14AlertOutcomeEvaluation,
  validateL14ConfidenceAccuracyProfile,
  validateL14EvaluationHorizon,
  validateL14ExpectedEffectProfile,
  validateL14ExplanationOutcomeEvaluation,
  validateL14FalseClassificationProfile,
  validateL14HypothesisOutcomeEvaluation,
  validateL14InvalidationOutcomeEvaluation,
  validateL14OutcomeEvaluationRecord,
  validateL14OutcomeEvaluationRequest,
  validateL14OutcomeRegimeContext,
  validateL14RealizedOutcomeProfile,
  validateL14ScenarioOutcomeEvaluation,
  validateL14ScoreOutcomeEvaluation,
  validateL14TriggerOutcomeEvaluation,
} from '../validation/outcome.validators';

const POLICY_V = 'l14.outcome.v1';

export interface L14_5InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): L14_5InvariantResult {
  return { id, name, holds, evidence };
}

// ── Fixture builders ──────────────────────────────────────────────

function buildRequest(cls: L14EvaluatedArtifactClass, ref: string): L14OutcomeEvaluationRequest {
  const id = `l14.outcome.req.${fnv1a([cls, ref, POLICY_V].join('|'))}`;
  return {
    outcome_evaluation_request_id: id,
    evaluated_artifact_class: cls,
    evaluated_artifact_ref: ref,
    requested_by: 'SCHEDULED_EVALUATION',
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

function buildHorizonElapsed(): L14EvaluationHorizon {
  return buildL14EvaluationHorizon(
    L14EvaluationHorizonClass.DAILY_24H,
    '2026-05-15T00:00:00Z',
    '2026-05-16T00:00:00Z',
    'L11_CALIBRATION_TARGET',
    true,
  );
}

function buildHorizonNotElapsed(): L14EvaluationHorizon {
  return buildL14EvaluationHorizon(
    L14EvaluationHorizonClass.WEEKLY_7D,
    '2026-05-15T00:00:00Z',
    '2026-05-22T00:00:00Z',
    'L11_CALIBRATION_TARGET',
    false,
  );
}

function buildExpectedScore() {
  return buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.score.ref.1',
    evaluated_artifact_class: L14EvaluatedArtifactClass.SCORE,
    expected_effect_class: L14ExpectedEffectClass.FORWARD_RETURN_OUTPERFORMANCE,
    expected_direction: L14ExpectedDirectionClass.POSITIVE,
    expected_magnitude_class: L14ExpectedMagnitudeClass.MODERATE,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
  });
}

function buildRealizedAligned(horizonRef: string) {
  return buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: horizonRef,
    realized_fact_refs: ['l14.fact.return.1'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
    realized_direction: L14RealizedDirectionClass.POSITIVE,
    realized_magnitude_class: L14RealizedMagnitudeClass.MODERATE,
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
}

function buildRealizedMisaligned(horizonRef: string) {
  return buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: horizonRef,
    realized_fact_refs: ['l14.fact.return.2'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
    realized_direction: L14RealizedDirectionClass.NEGATIVE,
    realized_magnitude_class: L14RealizedMagnitudeClass.MODERATE,
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.OPPOSITE_EFFECT_OBSERVED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
}

function buildRealizedIncomplete(horizonRef: string) {
  return buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: horizonRef,
    realized_fact_refs: [],
    realized_fact_classes: [],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EVIDENCE_INSUFFICIENT],
    completeness_class: L14RealizedOutcomeCompletenessClass.MISSING_REQUIRED_FACTS,
  });
}

// ── INV-14.5-A : semantic evaluation law ──────────────────────────

export function checkINV_145_A(): L14_5InvariantResult {
  const horizon = buildHorizonElapsed();
  const expected = buildExpectedScore();
  const realized = buildRealizedAligned(horizon.horizon_id);
  const score = evaluateL14ScoreOutcome({
    score_ref: 'l14.score.ref.1',
    score_family_ref: 'l14.score.family.directional',
    calibration_target_ref: 'l11.target.1',
    score_band_at_emission: 'HIGH',
    score_value_at_emission: 82,
    expected, realized, horizon,
  });
  const v = validateL14ScoreOutcomeEvaluation(score);
  // Score outcome semantics are SCORE_ALIGNED_WITH_TARGET, not raw price.
  return inv('INV-14.5-A', 'semantic evaluation', v.clean && score.outcome_alignment_class === L14OutcomeAlignmentClass.ALIGNED,
    `validator=${v.clean} align=${score.outcome_alignment_class}`);
}

// ── INV-14.5-B : horizon law ──────────────────────────────────────

export function checkINV_145_B(): L14_5InvariantResult {
  const horizon = buildHorizonNotElapsed();
  // Validating with evaluationFinalized=true must reject.
  const v = validateL14EvaluationHorizon(horizon, true);
  // And eligibility must report WAITING.
  const req = buildRequest(L14EvaluatedArtifactClass.SCORE, 'l14.score.ref.1');
  const elig = evaluateL14OutcomeEligibility({ request: req, horizon });
  return inv('INV-14.5-B', 'horizon law',
    !v.clean && elig.eligibility_status === 'WAITING_FOR_HORIZON',
    `validatorRejects=${!v.clean} eligibility=${elig.eligibility_status}`);
}

// ── INV-14.5-C : realized fact law ────────────────────────────────

export function checkINV_145_C(): L14_5InvariantResult {
  const horizon = buildHorizonElapsed();
  const realized = buildRealizedIncomplete(horizon.horizon_id);
  const v = validateL14RealizedOutcomeProfile(realized, /*markedAligned=*/true);
  return inv('INV-14.5-C', 'realized fact law', !v.clean,
    `validatorRejectsAlignedOnIncomplete=${!v.clean}`);
}

// ── INV-14.5-D : score calibration target law ────────────────────

export function checkINV_145_D(): L14_5InvariantResult {
  const horizon = buildHorizonElapsed();
  const expected = buildExpectedScore();
  const realized = buildRealizedAligned(horizon.horizon_id);
  const score = evaluateL14ScoreOutcome({
    score_ref: 'l14.score.ref.D',
    score_family_ref: 'l14.score.family.directional',
    calibration_target_ref: '', // missing target → must reject
    score_band_at_emission: 'HIGH',
    score_value_at_emission: 70,
    expected, realized, horizon,
  });
  const v = validateL14ScoreOutcomeEvaluation(score);
  return inv('INV-14.5-D', 'score calibration target law', !v.clean,
    `validatorRejects=${!v.clean}`);
}

// ── INV-14.5-E : hypothesis/scenario conditionality law ──────────

export function checkINV_145_E(): L14_5InvariantResult {
  const hypo = evaluateL14HypothesisOutcome({
    hypothesis_ref: 'l14.hypo.ref.1',
    hypothesis_family_ref: 'l14.hypo.family.1',
    expected_confirmation_refs: ['l12.conf.1'],
    invalidation_refs: ['l12.invld.1'],
    realized_confirmation_refs: ['l12.realconf.1'],
    realized_invalidation_refs: [],
    ranking_persistence_class: L14HypothesisRankingPersistenceClass.REMAINED_PRIMARY,
    support_persistence_class: L14HypothesisSupportPersistenceClass.SUPPORT_HELD,
  });
  const vh = validateL14HypothesisOutcomeEvaluation(hypo);
  // Negative case: no realized confirmations/invalidations.
  const hypoBad = evaluateL14HypothesisOutcome({
    hypothesis_ref: 'l14.hypo.ref.2',
    hypothesis_family_ref: 'l14.hypo.family.1',
    expected_confirmation_refs: [],
    invalidation_refs: [],
    realized_confirmation_refs: [],
    realized_invalidation_refs: [],
    ranking_persistence_class: L14HypothesisRankingPersistenceClass.BECAME_UNRESOLVED,
    support_persistence_class: L14HypothesisSupportPersistenceClass.INCONCLUSIVE,
  });
  const vhBad = validateL14HypothesisOutcomeEvaluation(hypoBad);
  const scen = evaluateL14ScenarioOutcome({
    scenario_set_ref: 'l14.set.1',
    scenario_ref: 'l14.scen.1',
    scenario_family_ref: 'l14.scen.family.1',
    base_case_at_emission: true,
    path_confidence_at_emission: 'MEDIUM',
    expected_trigger_refs: ['l12.trig.1'],
    invalidation_refs: ['l12.invld.1'],
    realized_trigger_refs: ['l12.realtrig.1'],
    realized_invalidation_refs: [],
    path_resolution_class: L14ScenarioPathResolutionClass.BASE_CASE_FOLLOWED,
  });
  const vs = validateL14ScenarioOutcomeEvaluation(scen);
  return inv('INV-14.5-E', 'conditionality law',
    vh.clean && !vhBad.clean && vs.clean,
    `hypoOk=${vh.clean} hypoBadRejected=${!vhBad.clean} scenOk=${vs.clean}`);
}

// ── INV-14.5-F : trigger/invalidation significance law ───────────

export function checkINV_145_F(): L14_5InvariantResult {
  const horizon = buildHorizonElapsed();
  const expected = buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.trig.ref.1',
    evaluated_artifact_class: L14EvaluatedArtifactClass.TRIGGER,
    expected_effect_class: L14ExpectedEffectClass.TRIGGER_SIGNIFICANCE,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.TRIGGER_REALIZATION_FACT],
  });
  const realized = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: horizon.horizon_id,
    realized_fact_refs: ['l14.fact.trig.1'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.TRIGGER_REALIZATION_FACT],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
  const trig = evaluateL14TriggerOutcome({
    trigger_ref: 'l14.trig.ref.1',
    scenario_ref: 'l14.scen.ref.1',
    trigger_activation_time: '2026-05-15T01:00:00Z',
    expected, realized, horizon,
  });
  const vt = validateL14TriggerOutcomeEvaluation(trig);
  const expectedInv = buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.invld.ref.1',
    evaluated_artifact_class: L14EvaluatedArtifactClass.INVALIDATION,
    expected_effect_class: L14ExpectedEffectClass.INVALIDATION_MATERIALIZATION,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.INVALIDATION_REALIZATION_FACT],
  });
  const realizedInv = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: horizon.horizon_id,
    realized_fact_refs: ['l14.fact.invld.1'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.INVALIDATION_REALIZATION_FACT],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
  const inv1 = evaluateL14InvalidationOutcome({
    invalidation_ref: 'l14.invld.ref.1',
    scenario_ref: 'l14.scen.ref.1',
    invalidation_activation_time: '2026-05-15T01:00:00Z',
    expected: expectedInv, realized: realizedInv, horizon,
  });
  const vi = validateL14InvalidationOutcomeEvaluation(inv1);
  return inv('INV-14.5-F', 'trigger/invalidation significance',
    vt.clean && vi.clean,
    `trigger=${vt.clean} invld=${vi.clean}`);
}

// ── INV-14.5-G : false positive/negative law ─────────────────────

export function checkINV_145_G(): L14_5InvariantResult {
  const horizon = buildHorizonElapsed();
  const realized = buildRealizedMisaligned(horizon.horizon_id);
  const fp = classifyL14FalseClassification({
    evaluated_artifact_ref: 'l14.alert.ref.1',
    evaluated_artifact_class: L14EvaluatedArtifactClass.ALERT,
    alignment: L14OutcomeAlignmentClass.MISALIGNED,
    horizon_ref: horizon.horizon_id,
    horizon_elapsed: true,
    realized,
  });
  const v1 = validateL14FalseClassificationProfile(fp, /*elapsed=*/true, /*omission=*/false);
  // Premature false positive: horizon not elapsed.
  const fpEarly = {
    ...fp,
    false_positive_flag: true,
  };
  const v2 = validateL14FalseClassificationProfile(fpEarly, /*elapsed=*/false, /*omission=*/false);
  // False negative without basis.
  const fnNoBasis = {
    ...fp,
    false_positive_flag: false,
    false_negative_flag: true,
  };
  const v3 = validateL14FalseClassificationProfile(fnNoBasis, /*elapsed=*/true, /*omission=*/false);
  return inv('INV-14.5-G', 'false classification law',
    v1.clean && !v2.clean && !v3.clean,
    `fpValid=${v1.clean} fpEarlyRejected=${!v2.clean} fnNoBasisRejected=${!v3.clean}`);
}

// ── INV-14.5-H : confidence accuracy law ────────────────────────

export function checkINV_145_H(): L14_5InvariantResult {
  const c1 = evaluateL14ConfidenceAccuracy({
    evaluated_artifact_ref: 'l14.score.ref.H',
    evaluated_artifact_class: L14EvaluatedArtifactClass.SCORE_CONFIDENCE,
    emitted_confidence_band: 'HIGH',
    outcome_alignment_class: L14OutcomeAlignmentClass.MISALIGNED,
  });
  const v = validateL14ConfidenceAccuracyProfile(c1, /*required=*/true);
  const overstated = c1.confidence_accuracy_class === L14ConfidenceAccuracyClass.CONFIDENCE_OVERSTATED;
  return inv('INV-14.5-H', 'confidence accuracy law',
    overstated && c1.overstatement_flag && v.clean,
    `class=${c1.confidence_accuracy_class} flag=${c1.overstatement_flag} validator=${v.clean}`);
}

// ── INV-14.5-I : alert effectiveness separation law ─────────────

export function checkINV_145_I(): L14_5InvariantResult {
  // High engagement on misaligned alert: matrix MUST stay MISALIGNED_HIGH.
  const eff = composeL14AlertEffectiveness({
    alert_ref: 'l14.alert.eff.1',
    alignment: L14OutcomeAlignmentClass.MISALIGNED,
    high_engagement: true,
  });
  const v = validateL14AlertEffectivenessProfile(eff);
  // Adversarial fixture: hand-craft an attempt to relabel as ALIGNED_HIGH.
  const bad = {
    ...eff,
    effectiveness_matrix_class: L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_HIGH_ENGAGEMENT,
  };
  const vBad = validateL14AlertEffectivenessProfile(bad);
  return inv('INV-14.5-I', 'alert effectiveness separation',
    eff.effectiveness_matrix_class === L14AlertEffectivenessMatrixClass.OUTCOME_MISALIGNED_HIGH_ENGAGEMENT &&
    v.clean && !vBad.clean,
    `matrix=${eff.effectiveness_matrix_class} legit=${v.clean} adversarialRejected=${!vBad.clean}`);
}

// ── INV-14.5-J : regime context law ─────────────────────────────

export function checkINV_145_J(): L14_5InvariantResult {
  const ctx = bindL14OutcomeRegimeContext({
    evaluation_ref: 'l14.outcome.evaluation.J',
    regime_ref: 'l10.regime.btc-mania',
    primary_regime_at_emission: 'BTC_MANIA',
    regime_changed_during_horizon: true,
    realized_regime_ref_at_resolution: 'l10.regime.deleveraging',
  });
  const vOk = validateL14OutcomeRegimeContext(ctx, L14EvaluatedArtifactClass.SCORE, /*regimeChanged=*/true);
  // Missing for regime-sensitive artifact.
  const vMissing = validateL14OutcomeRegimeContext(undefined, L14EvaluatedArtifactClass.SCORE, /*regimeChanged=*/false);
  // Regime shift ignored: ctx says no change, but caller asserts changed.
  const ctxIgnored = bindL14OutcomeRegimeContext({
    evaluation_ref: 'l14.outcome.evaluation.J2',
    regime_ref: 'l10.regime.btc-mania',
    primary_regime_at_emission: 'BTC_MANIA',
    regime_changed_during_horizon: false,
  });
  const vIgnored = validateL14OutcomeRegimeContext(ctxIgnored, L14EvaluatedArtifactClass.SCORE, /*regimeChanged=*/true);
  return inv('INV-14.5-J', 'regime context law',
    vOk.clean && !vMissing.clean && !vIgnored.clean,
    `ok=${vOk.clean} missingRejected=${!vMissing.clean} ignoredRejected=${!vIgnored.clean}`);
}

// ── INV-14.5-K : not-yet-evaluable law ───────────────────────────

export function checkINV_145_K(): L14_5InvariantResult {
  const horizon = buildHorizonNotElapsed();
  const expected = buildExpectedScore();
  const realized = buildRealizedAligned(horizon.horizon_id);
  const align = classifyL14OutcomeAlignment(expected, realized, horizon);
  // Not elapsed → must produce NOT_YET_EVALUABLE.
  return inv('INV-14.5-K', 'not-yet-evaluable law',
    align === L14OutcomeAlignmentClass.NOT_YET_EVALUABLE,
    `align=${align}`);
}

// ── INV-14.5-L : lineage and replay law ──────────────────────────

export function checkINV_145_L(): L14_5InvariantResult {
  const horizon = buildHorizonElapsed();
  const expected = buildExpectedScore();
  const realized = buildRealizedAligned(horizon.horizon_id);
  const align = classifyL14OutcomeAlignment(expected, realized, horizon);
  const req = buildRequest(L14EvaluatedArtifactClass.SCORE, 'l14.score.ref.L');
  const rec = buildL14OutcomeEvaluationRecord({
    request: req,
    horizon, expected, realized,
    alignment: align,
    evaluation_semantics_ref: 'l14.semantics.directional',
    calibration_target_ref: 'l11.target.L',
    score_family_ref: 'l14.score.family.directional',
  });
  const v = validateL14OutcomeEvaluationRecord(rec);
  // Replay determinism: rebuilding same record yields same replay_hash.
  const rec2 = buildL14OutcomeEvaluationRecord({
    request: req, horizon, expected, realized,
    alignment: align,
    evaluation_semantics_ref: 'l14.semantics.directional',
    calibration_target_ref: 'l11.target.L',
    score_family_ref: 'l14.score.family.directional',
  });
  const same = rec.replay_hash === rec2.replay_hash;
  return inv('INV-14.5-L', 'lineage and replay law',
    v.clean && rec.replay_hash.length > 0 && rec.lineage_refs.length > 0 && same,
    `validator=${v.clean} replay=${rec.replay_hash.length > 0} lineage=${rec.lineage_refs.length > 0} deterministic=${same}`);
}

// ── Sanity references to silence unused imports in lean cert paths ─

// Touch validators to keep import set live for downstream cert/audit consumers.
void validateL14OutcomeEvaluationRequest;
void validateL14ExpectedEffectProfile;
void validateL14AlertOutcomeEvaluation;
void validateL14ExplanationOutcomeEvaluation;
void evaluateL14AlertOutcome;
void evaluateL14ExplanationOutcome;
void L14ExplanationOutcomeConsistencyClass;

export function runAllL14_5Invariants(): readonly L14_5InvariantResult[] {
  return [
    checkINV_145_A(),
    checkINV_145_B(),
    checkINV_145_C(),
    checkINV_145_D(),
    checkINV_145_E(),
    checkINV_145_F(),
    checkINV_145_G(),
    checkINV_145_H(),
    checkINV_145_I(),
    checkINV_145_J(),
    checkINV_145_K(),
    checkINV_145_L(),
  ];
}
