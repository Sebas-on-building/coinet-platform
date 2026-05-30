/**
 * L14.5 — Outcome Evaluation Certification (Bands A..H)
 *
 * §14.5.66 — Proves request/horizon, score/confidence,
 * hypothesis/scenario, trigger/invalidation, alert/explanation,
 * false pos/neg + effectiveness, regime/honesty/not-yet-evaluable,
 * audit + invariants.
 */

import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import {
  L14EvaluatedArtifactClass,
  L14EvaluationHorizonClass,
  L14OutcomeAlignmentClass,
  L14OutcomeEvaluationEligibilityStatus,
  L14OutcomeEvaluationStatus,
} from '../l14/contracts/outcome-evaluation-core';
import {
  L14ExpectedDirectionClass,
  L14ExpectedEffectClass,
  L14ExpectedMagnitudeClass,
  L14RealizedDirectionClass,
  L14RealizedMagnitudeClass,
  L14RealizedOutcomeCompletenessClass,
  L14RealizedOutcomeFactClass,
  L14RealizedOutcomeSummaryCode,
} from '../l14/contracts/outcome-evaluation-effects';
import {
  L14AlertSemanticClaimClass,
  L14ConfidenceAccuracyClass,
  L14ExplanationOutcomeConsistencyClass,
  L14HypothesisRankingPersistenceClass,
  L14HypothesisSupportPersistenceClass,
  L14InvalidationEffectivenessClass,
  L14ScenarioPathResolutionClass,
  L14ScoreCalibrationObservationClass,
  L14TriggerSignificanceClass,
} from '../l14/contracts/outcome-evaluation-artifacts';
import {
  L14AlertEffectivenessMatrixClass,
  L14FalseClassificationReasonCode,
  L14FalseClassificationStatus,
} from '../l14/contracts/outcome-evaluation-classification';
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
} from '../l14/evaluation/outcome-evaluation-engines';
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
} from '../l14/validation/outcome.validators';
import { L14OutcomeViolationCode } from '../l14/validation/l14-outcome-violation-codes';
import {
  L14OutcomeAuditSubjectClass,
  emitL14OutcomeAuditRecord,
  getL14OutcomeAuditLog,
  getL14OutcomeCriticalViolations,
  isL14OutcomeBlockingCode,
  resetL14OutcomeAuditLog,
  severityForL14OutcomeCode,
} from '../l14/constitution/l14-outcome-evaluation-audit';
import { runAllL14_5Invariants } from '../l14/invariants/l14_5-invariants';
import { fnv1a } from '../l13/context/_fnv1a';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function band(name: string): void {
  console.log('');
  console.log(`── ${name} ──`);
}

const POLICY_V = 'l14.outcome.v1';

function req(cls: L14EvaluatedArtifactClass, ref: string) {
  const id = `l14.outcome.req.${fnv1a([cls, ref, POLICY_V].join('|'))}`;
  return {
    outcome_evaluation_request_id: id,
    evaluated_artifact_class: cls,
    evaluated_artifact_ref: ref,
    requested_by: 'SCHEDULED_EVALUATION' as const,
    lineage_refs: ['l14.outcome.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

function horizonElapsed() {
  return buildL14EvaluationHorizon(
    L14EvaluationHorizonClass.DAILY_24H,
    '2026-05-15T00:00:00Z',
    '2026-05-16T00:00:00Z',
    'L11_CALIBRATION_TARGET',
    true,
  );
}

function horizonNotElapsed() {
  return buildL14EvaluationHorizon(
    L14EvaluationHorizonClass.WEEKLY_7D,
    '2026-05-15T00:00:00Z',
    '2026-05-22T00:00:00Z',
    'L11_CALIBRATION_TARGET',
    false,
  );
}

console.log('L14.5 — Outcome Evaluation Certification');

// ── BAND A : request, horizon, eligibility ────────────────────────
band('BAND A — request, horizon, eligibility');

{
  const r = req(L14EvaluatedArtifactClass.SCORE, 'l14.score.A');
  const v = validateL14OutcomeEvaluationRequest(r);
  assert(v.clean, 'A.1 request validator accepts clean request');
  const rBad = { ...r, evaluated_artifact_class: 'XXX' as any };
  const vBad = validateL14OutcomeEvaluationRequest(rBad);
  assert(!vBad.clean, 'A.2 request validator rejects unregistered artifact class');
  const h = horizonElapsed();
  const vh = validateL14EvaluationHorizon(h, true);
  assert(vh.clean, 'A.3 horizon validator accepts elapsed horizon');
  const hBad = horizonNotElapsed();
  const vhBad = validateL14EvaluationHorizon(hBad, true);
  assert(!vhBad.clean, 'A.4 horizon validator rejects not-elapsed when finalized');
  const hIllegal = { ...h, horizon_source: 'L99_BAD' as any };
  const vhIllegal = validateL14EvaluationHorizon(hIllegal, true);
  assert(!vhIllegal.clean, 'A.5 horizon validator rejects illegal source');
  const elig1 = evaluateL14OutcomeEligibility({ request: r, horizon: h, realized_outcome_ref: 'l14.realized.A' });
  assert(elig1.eligibility_status === L14OutcomeEvaluationEligibilityStatus.ELIGIBLE && elig1.eligible, 'A.6 eligibility green with horizon+realized');
  const elig2 = evaluateL14OutcomeEligibility({ request: r, horizon: hBad });
  assert(elig2.eligibility_status === L14OutcomeEvaluationEligibilityStatus.WAITING_FOR_HORIZON, 'A.7 eligibility WAITING_FOR_HORIZON');
  const elig3 = evaluateL14OutcomeEligibility({ request: r, horizon: h });
  assert(elig3.eligibility_status === L14OutcomeEvaluationEligibilityStatus.WAITING_FOR_REALIZED_FACTS, 'A.8 eligibility WAITING_FOR_REALIZED_FACTS');
  const elig4 = evaluateL14OutcomeEligibility({ request: r, horizon: h, realized_outcome_ref: 'r', score_requires_target: true });
  assert(elig4.eligibility_status === L14OutcomeEvaluationEligibilityStatus.WAITING_FOR_CALIBRATION_TARGET, 'A.9 eligibility WAITING_FOR_CALIBRATION_TARGET');
}

// ── BAND B : score / confidence ───────────────────────────────────
band('BAND B — score / confidence');

{
  const h = horizonElapsed();
  const expected = buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.score.B',
    evaluated_artifact_class: L14EvaluatedArtifactClass.SCORE,
    expected_effect_class: L14ExpectedEffectClass.FORWARD_RETURN_OUTPERFORMANCE,
    expected_direction: L14ExpectedDirectionClass.POSITIVE,
    expected_magnitude_class: L14ExpectedMagnitudeClass.MODERATE,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
  });
  const ve = validateL14ExpectedEffectProfile(expected);
  assert(ve.clean, 'B.1 expected effect profile clean for SCORE');
  const expectedIllegal = buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.score.B',
    evaluated_artifact_class: L14EvaluatedArtifactClass.SCORE,
    expected_effect_class: L14ExpectedEffectClass.EXPLANATION_OUTCOME_CONSISTENCY,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
  });
  assert(!validateL14ExpectedEffectProfile(expectedIllegal).clean, 'B.2 illegal expected effect class for SCORE rejected');
  const realized = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: h.horizon_id,
    realized_fact_refs: ['l14.fact.ret.B'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
    realized_direction: L14RealizedDirectionClass.POSITIVE,
    realized_magnitude_class: L14RealizedMagnitudeClass.MODERATE,
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
  assert(validateL14RealizedOutcomeProfile(realized, false).clean, 'B.3 realized outcome profile clean');
  const realizedIncomplete = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: h.horizon_id,
    realized_fact_refs: [],
    realized_fact_classes: [],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EVIDENCE_INSUFFICIENT],
    completeness_class: L14RealizedOutcomeCompletenessClass.MISSING_REQUIRED_FACTS,
  });
  assert(!validateL14RealizedOutcomeProfile(realizedIncomplete, true).clean, 'B.4 incomplete realized + markedAligned rejected');
  const align = classifyL14OutcomeAlignment(expected, realized, h);
  assert(align === L14OutcomeAlignmentClass.ALIGNED, 'B.5 alignment ALIGNED on materialized effect');
  const score = evaluateL14ScoreOutcome({
    score_ref: 'l14.score.B', score_family_ref: 'l14.fam.dir',
    calibration_target_ref: 'l11.tgt.B',
    score_band_at_emission: 'HIGH', score_value_at_emission: 85,
    expected, realized, horizon: h,
  });
  assert(score.calibration_observation_class === L14ScoreCalibrationObservationClass.SCORE_ALIGNED_WITH_TARGET, 'B.6 score calibration class ALIGNED_WITH_TARGET');
  assert(validateL14ScoreOutcomeEvaluation(score).clean, 'B.7 score outcome validator clean');
  const scoreNoTarget = { ...score, calibration_target_ref: '' };
  assert(!validateL14ScoreOutcomeEvaluation(scoreNoTarget).clean, 'B.8 score without L11 target rejected');
  // Confidence accuracy.
  const cHi = evaluateL14ConfidenceAccuracy({
    evaluated_artifact_ref: 'l14.score.B',
    evaluated_artifact_class: L14EvaluatedArtifactClass.SCORE_CONFIDENCE,
    emitted_confidence_band: 'HIGH',
    outcome_alignment_class: L14OutcomeAlignmentClass.ALIGNED,
  });
  assert(cHi.confidence_accuracy_class === L14ConfidenceAccuracyClass.CONFIDENCE_APPROPRIATELY_HIGH, 'B.9 confidence HIGH + ALIGNED → APPROPRIATELY_HIGH');
  const cOver = evaluateL14ConfidenceAccuracy({
    evaluated_artifact_ref: 'l14.score.B',
    evaluated_artifact_class: L14EvaluatedArtifactClass.SCORE_CONFIDENCE,
    emitted_confidence_band: 'HIGH',
    outcome_alignment_class: L14OutcomeAlignmentClass.MISALIGNED,
  });
  assert(cOver.confidence_accuracy_class === L14ConfidenceAccuracyClass.CONFIDENCE_OVERSTATED && cOver.overstatement_flag, 'B.10 HIGH + MISALIGNED → OVERSTATED with flag');
  assert(validateL14ConfidenceAccuracyProfile(cOver, true).clean, 'B.11 correctly-labeled OVERSTATED on MISALIGNED accepted by validator');
  const cOverLowBand = { ...cOver, confidence_accuracy_class: L14ConfidenceAccuracyClass.CONFIDENCE_APPROPRIATELY_HIGH };
  assert(!validateL14ConfidenceAccuracyProfile(cOverLowBand, true).clean, 'B.12 misaligned but reported APPROPRIATELY_HIGH rejected');
}

// ── BAND C : hypothesis / scenario ────────────────────────────────
band('BAND C — hypothesis / scenario');

{
  const hypo = evaluateL14HypothesisOutcome({
    hypothesis_ref: 'l14.hypo.C',
    hypothesis_family_ref: 'l14.fam.hypo',
    expected_confirmation_refs: ['l12.conf.C1'],
    invalidation_refs: ['l12.invld.C1'],
    realized_confirmation_refs: ['l12.realconf.C1'],
    realized_invalidation_refs: [],
    ranking_persistence_class: L14HypothesisRankingPersistenceClass.REMAINED_PRIMARY,
    support_persistence_class: L14HypothesisSupportPersistenceClass.SUPPORT_STRENGTHENED,
  });
  assert(hypo.outcome_alignment_class === L14OutcomeAlignmentClass.ALIGNED, 'C.1 hypothesis SUPPORT_STRENGTHENED → ALIGNED');
  assert(validateL14HypothesisOutcomeEvaluation(hypo).clean, 'C.2 hypothesis outcome validator clean');
  const hypoBad = evaluateL14HypothesisOutcome({
    hypothesis_ref: 'l14.hypo.Cbad',
    hypothesis_family_ref: 'l14.fam.hypo',
    expected_confirmation_refs: [],
    invalidation_refs: [],
    realized_confirmation_refs: [],
    realized_invalidation_refs: [],
    ranking_persistence_class: L14HypothesisRankingPersistenceClass.BECAME_UNRESOLVED,
    support_persistence_class: L14HypothesisSupportPersistenceClass.INCONCLUSIVE,
  });
  assert(!validateL14HypothesisOutcomeEvaluation(hypoBad).clean, 'C.3 hypothesis without realized confirmation/invalidation rejected (price-only collapse)');
  const scen = evaluateL14ScenarioOutcome({
    scenario_set_ref: 'l14.set.C', scenario_ref: 'l14.scen.C',
    scenario_family_ref: 'l14.fam.scen',
    base_case_at_emission: true,
    path_confidence_at_emission: 'MEDIUM',
    expected_trigger_refs: ['l12.trig.C1'],
    invalidation_refs: ['l12.invld.C1'],
    realized_trigger_refs: ['l12.realtrig.C1'],
    realized_invalidation_refs: [],
    path_resolution_class: L14ScenarioPathResolutionClass.BASE_CASE_FOLLOWED,
  });
  assert(scen.outcome_alignment_class === L14OutcomeAlignmentClass.ALIGNED, 'C.4 BASE_CASE_FOLLOWED → ALIGNED');
  assert(validateL14ScenarioOutcomeEvaluation(scen).clean, 'C.5 scenario outcome validator clean');
  const scenBin = evaluateL14ScenarioOutcome({
    scenario_set_ref: 'l14.set.C', scenario_ref: 'l14.scen.Cbin',
    scenario_family_ref: 'l14.fam.scen',
    base_case_at_emission: true,
    path_confidence_at_emission: 'MEDIUM',
    expected_trigger_refs: [],
    invalidation_refs: [],
    realized_trigger_refs: [],
    realized_invalidation_refs: [],
    path_resolution_class: L14ScenarioPathResolutionClass.BASE_CASE_FOLLOWED,
  });
  assert(!validateL14ScenarioOutcomeEvaluation(scenBin).clean, 'C.6 scenario evaluated as binary prediction rejected');
  const scenFail = evaluateL14ScenarioOutcome({
    scenario_set_ref: 'l14.set.C', scenario_ref: 'l14.scen.Cfail',
    scenario_family_ref: 'l14.fam.scen',
    base_case_at_emission: true,
    path_confidence_at_emission: 'HIGH',
    expected_trigger_refs: ['l12.trig.x'],
    invalidation_refs: ['l12.invld.x'],
    realized_trigger_refs: [],
    realized_invalidation_refs: ['l12.invld.x'],
    path_resolution_class: L14ScenarioPathResolutionClass.FAILURE_CONDITION_ACTIVATED,
  });
  assert(scenFail.outcome_alignment_class === L14OutcomeAlignmentClass.MISALIGNED, 'C.7 FAILURE_CONDITION_ACTIVATED → MISALIGNED');
}

// ── BAND D : trigger / invalidation ───────────────────────────────
band('BAND D — trigger / invalidation');

{
  const h = horizonElapsed();
  const expected = buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.trig.D',
    evaluated_artifact_class: L14EvaluatedArtifactClass.TRIGGER,
    expected_effect_class: L14ExpectedEffectClass.TRIGGER_SIGNIFICANCE,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.TRIGGER_REALIZATION_FACT],
  });
  const realized = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: h.horizon_id,
    realized_fact_refs: ['l14.fact.trig.D'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.TRIGGER_REALIZATION_FACT],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
  const trig = evaluateL14TriggerOutcome({
    trigger_ref: 'l14.trig.D',
    scenario_ref: 'l14.scen.D',
    trigger_activation_time: '2026-05-15T01:00:00Z',
    expected, realized, horizon: h,
  });
  assert(trig.trigger_significance_class === L14TriggerSignificanceClass.SIGNIFICANT_CONFIRMATORY_TRIGGER, 'D.1 trigger ALIGNED → SIGNIFICANT_CONFIRMATORY_TRIGGER');
  assert(validateL14TriggerOutcomeEvaluation(trig).clean, 'D.2 trigger outcome validator clean');
  const trigNoEffect = { ...trig, expected_effect_profile_ref: '' };
  assert(!validateL14TriggerOutcomeEvaluation(trigNoEffect).clean, 'D.3 trigger without downstream effect rejected');
  const expectedInv = buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.invld.D',
    evaluated_artifact_class: L14EvaluatedArtifactClass.INVALIDATION,
    expected_effect_class: L14ExpectedEffectClass.INVALIDATION_MATERIALIZATION,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.INVALIDATION_REALIZATION_FACT],
  });
  const realizedInv = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: h.horizon_id,
    realized_fact_refs: ['l14.fact.inv.D'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.INVALIDATION_REALIZATION_FACT],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
  const inv1 = evaluateL14InvalidationOutcome({
    invalidation_ref: 'l14.invld.D',
    scenario_ref: 'l14.scen.D',
    invalidation_activation_time: '2026-05-15T01:00:00Z',
    expected: expectedInv, realized: realizedInv, horizon: h,
  });
  assert(inv1.invalidation_effectiveness_class === L14InvalidationEffectivenessClass.INVALIDATION_CORRECTLY_SIGNALLED_PATH_DEGRADATION, 'D.4 invalidation ALIGNED → CORRECTLY_SIGNALLED');
  assert(validateL14InvalidationOutcomeEvaluation(inv1).clean, 'D.5 invalidation validator clean');
  const invNoEff = { ...inv1, expected_failure_effect_profile_ref: '' };
  assert(!validateL14InvalidationOutcomeEvaluation(invNoEff).clean, 'D.6 invalidation by price-dip only rejected');
}

// ── BAND E : alert / explanation ─────────────────────────────────
band('BAND E — alert / explanation');

{
  const h = horizonElapsed();
  const expected = buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.alert.E',
    evaluated_artifact_class: L14EvaluatedArtifactClass.ALERT,
    expected_effect_class: L14ExpectedEffectClass.ALERT_OUTCOME_RELEVANCE,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.TRIGGER_REALIZATION_FACT],
  });
  const realized = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: h.horizon_id,
    realized_fact_refs: ['l14.fact.E'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.TRIGGER_REALIZATION_FACT],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
  const alert = evaluateL14AlertOutcome({
    alert_ref: 'l14.alert.E',
    alert_class_ref: 'l14.alert.class.scen-trigger',
    source_artifact_refs: ['l13.alert.payload.E'],
    alert_semantic_claim_ref: L14AlertSemanticClaimClass.SCENARIO_TRIGGER_ALERT,
    expected, realized, horizon: h,
  });
  assert(alert.outcome_alignment_class === L14OutcomeAlignmentClass.ALIGNED, 'E.1 alert ALIGNED on materialized trigger');
  assert(validateL14AlertOutcomeEvaluation(alert, false).clean, 'E.2 alert validator clean when not open-rate-only');
  assert(!validateL14AlertOutcomeEvaluation(alert, true).clean, 'E.3 alert evaluated by open-rate only rejected');
  const expl = evaluateL14ExplanationOutcome({
    l13_output_ref: 'l13.out.E',
    output_class_ref: 'l13.out.cls.deep',
    linked_scenario_refs: ['l12.scen.E'],
    linked_score_refs: ['l11.score.E'],
    linked_hypothesis_refs: ['l12.hypo.E'],
    stated_watchpoint_refs: ['l12.watch.E'],
    stated_invalidation_refs: ['l12.invld.E'],
    realized_relevance_refs: ['l14.fact.relevance.E'],
    consistency_class: L14ExplanationOutcomeConsistencyClass.EXPLANATION_REMAINED_OUTCOME_CONSISTENT,
  });
  assert(expl.outcome_alignment_class === L14OutcomeAlignmentClass.ALIGNED, 'E.4 explanation consistent → ALIGNED');
  assert(validateL14ExplanationOutcomeEvaluation(expl, false).clean, 'E.5 explanation validator clean');
  assert(!validateL14ExplanationOutcomeEvaluation(expl, true).clean, 'E.6 explanation evaluated as style score rejected');
}

// ── BAND F : false pos/neg + effectiveness ───────────────────────
band('BAND F — false pos/neg + effectiveness');

{
  const h = horizonElapsed();
  const realizedMis = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: h.horizon_id,
    realized_fact_refs: ['l14.fact.F'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.OPPOSITE_EFFECT_OBSERVED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
  const fp = classifyL14FalseClassification({
    evaluated_artifact_ref: 'l14.alert.F',
    evaluated_artifact_class: L14EvaluatedArtifactClass.ALERT,
    alignment: L14OutcomeAlignmentClass.MISALIGNED,
    horizon_ref: h.horizon_id,
    horizon_elapsed: true,
    realized: realizedMis,
  });
  assert(fp.classification_status === L14FalseClassificationStatus.FALSE_POSITIVE_CONFIRMED && fp.false_positive_flag, 'F.1 FP confirmed on horizon-elapsed MISALIGNED');
  assert(fp.classification_reason_codes.includes(L14FalseClassificationReasonCode.OPPOSITE_EFFECT_OCCURRED), 'F.2 FP reason includes OPPOSITE_EFFECT_OCCURRED');
  assert(validateL14FalseClassificationProfile(fp, true, false).clean, 'F.3 FP validator clean');
  const fpEarly = { ...fp };
  assert(!validateL14FalseClassificationProfile(fpEarly, false, false).clean, 'F.4 FP without horizon elapsed rejected');
  const fn = classifyL14FalseClassification({
    evaluated_artifact_ref: 'l14.alert.Fn',
    evaluated_artifact_class: L14EvaluatedArtifactClass.ALERT,
    alignment: L14OutcomeAlignmentClass.INCONCLUSIVE,
    horizon_ref: h.horizon_id,
    horizon_elapsed: true,
    realized: realizedMis,
    eligible_omission_present: true,
  });
  assert(fn.classification_status === L14FalseClassificationStatus.FALSE_NEGATIVE_CONFIRMED && fn.false_negative_flag, 'F.5 FN confirmed with eligible_omission_present');
  assert(validateL14FalseClassificationProfile(fn, true, true).clean, 'F.6 FN validator clean with basis');
  const fnNoBasis = { ...fn };
  assert(!validateL14FalseClassificationProfile(fnNoBasis, true, false).clean, 'F.7 FN without eligible omission basis rejected');
  const effA = composeL14AlertEffectiveness({
    alert_ref: 'l14.alert.Feff',
    alignment: L14OutcomeAlignmentClass.ALIGNED,
    high_engagement: true,
  });
  assert(effA.effectiveness_matrix_class === L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_HIGH_ENGAGEMENT, 'F.8 effectiveness ALIGNED+HIGH');
  assert(validateL14AlertEffectivenessProfile(effA).clean, 'F.9 effectiveness validator clean');
  const effM = composeL14AlertEffectiveness({
    alert_ref: 'l14.alert.FeffM',
    alignment: L14OutcomeAlignmentClass.MISALIGNED,
    high_engagement: true,
  });
  assert(effM.effectiveness_matrix_class === L14AlertEffectivenessMatrixClass.OUTCOME_MISALIGNED_HIGH_ENGAGEMENT, 'F.10 effectiveness MISALIGNED+HIGH stays MISALIGNED');
  const effRelabel = { ...effM, effectiveness_matrix_class: L14AlertEffectivenessMatrixClass.OUTCOME_ALIGNED_HIGH_ENGAGEMENT };
  assert(!validateL14AlertEffectivenessProfile(effRelabel).clean, 'F.11 effectiveness relabel attempt rejected');
  const effInc = composeL14AlertEffectiveness({
    alert_ref: 'l14.alert.FeffInc',
    alignment: L14OutcomeAlignmentClass.INCONCLUSIVE,
    high_engagement: true,
  });
  assert(effInc.effectiveness_matrix_class === L14AlertEffectivenessMatrixClass.OUTCOME_INCONCLUSIVE_BEHAVIOR_HIGH, 'F.12 INCONCLUSIVE high → INCONCLUSIVE_BEHAVIOR_HIGH');
}

// ── BAND G : regime / honesty / not-yet-evaluable ────────────────
band('BAND G — regime / honesty / not-yet-evaluable');

{
  const ctx = bindL14OutcomeRegimeContext({
    evaluation_ref: 'l14.out.G',
    regime_ref: 'l10.regime.btc-mania',
    primary_regime_at_emission: 'BTC_MANIA',
    regime_changed_during_horizon: true,
    realized_regime_ref_at_resolution: 'l10.regime.deleveraging',
  });
  assert(validateL14OutcomeRegimeContext(ctx, L14EvaluatedArtifactClass.SCORE, true).clean, 'G.1 regime context valid');
  assert(!validateL14OutcomeRegimeContext(undefined, L14EvaluatedArtifactClass.SCORE, false).clean, 'G.2 regime context missing for SCORE rejected');
  const ctxIgnored = bindL14OutcomeRegimeContext({
    evaluation_ref: 'l14.out.G2',
    regime_ref: 'l10.regime.btc-mania',
    primary_regime_at_emission: 'BTC_MANIA',
    regime_changed_during_horizon: false,
  });
  assert(!validateL14OutcomeRegimeContext(ctxIgnored, L14EvaluatedArtifactClass.SCORE, true).clean, 'G.3 regime shift ignored rejected');
  // Honesty: score with ALIGNED alignment but mis-class.
  const h = horizonElapsed();
  const expected = buildL14ExpectedEffectProfile({
    evaluated_artifact_ref: 'l14.score.G',
    evaluated_artifact_class: L14EvaluatedArtifactClass.SCORE,
    expected_effect_class: L14ExpectedEffectClass.FORWARD_RETURN_OUTPERFORMANCE,
    required_realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
  });
  const realized = buildL14RealizedOutcomeProfile({
    evaluation_horizon_ref: h.horizon_id,
    realized_fact_refs: ['l14.fact.G'],
    realized_fact_classes: [L14RealizedOutcomeFactClass.FORWARD_RETURN_FACT],
    realized_summary_codes: [L14RealizedOutcomeSummaryCode.EXPECTED_EFFECT_MATERIALIZED],
    completeness_class: L14RealizedOutcomeCompletenessClass.COMPLETE,
  });
  const score = evaluateL14ScoreOutcome({
    score_ref: 'l14.score.G', score_family_ref: 'l14.fam.dir',
    calibration_target_ref: 'l11.tgt.G',
    score_band_at_emission: 'HIGH', score_value_at_emission: 85,
    expected, realized, horizon: h,
  });
  const scoreFalseGreen = { ...score, calibration_observation_class: L14ScoreCalibrationObservationClass.SCORE_MISALIGNED_WITH_TARGET };
  assert(!validateL14ScoreOutcomeEvaluation(scoreFalseGreen).clean, 'G.4 ALIGNED with mis-class observation rejected (alignment-false-green)');
  // Not yet evaluable.
  const hNot = horizonNotElapsed();
  const align = classifyL14OutcomeAlignment(expected, realized, hNot);
  assert(align === L14OutcomeAlignmentClass.NOT_YET_EVALUABLE, 'G.5 horizon not elapsed → NOT_YET_EVALUABLE');
  // Forced verdict rejected at record level.
  const r = req(L14EvaluatedArtifactClass.SCORE, 'l14.score.G');
  const recForced = buildL14OutcomeEvaluationRecord({
    request: r, horizon: hNot, expected, realized,
    alignment: L14OutcomeAlignmentClass.ALIGNED,
    evaluation_semantics_ref: 'l14.semantics.dir',
    calibration_target_ref: 'l11.tgt.G',
    score_family_ref: 'l14.fam.dir',
  });
  // Bypass status by hand to simulate downstream tampering.
  const recForcedEval = { ...recForced, evaluation_status: L14OutcomeEvaluationStatus.EVALUATED };
  assert(!validateL14OutcomeEvaluationRecord(recForcedEval).clean, 'G.6 EVALUATED+ALIGNED+horizon not elapsed rejected');
  const recIncForced = {
    ...recForced,
    outcome_alignment_class: L14OutcomeAlignmentClass.INCONCLUSIVE,
    evaluation_status: L14OutcomeEvaluationStatus.EVALUATED,
    false_positive_flag: true,
  };
  assert(!validateL14OutcomeEvaluationRecord(recIncForced).clean, 'G.7 INCONCLUSIVE with false flags rejected');
}

// ── BAND H : audit + invariants ───────────────────────────────────
band('BAND H — audit + invariants');

{
  resetL14OutcomeAuditLog();
  const a = emitL14OutcomeAuditRecord({
    subjectClass: L14OutcomeAuditSubjectClass.SCORE_OUTCOME,
    subjectRef: 'l14.score.H',
    violationCodes: [L14OutcomeViolationCode.L14O_SCORE_EVALUATED_WITHOUT_L11_TARGET],
    message: 'cert: score without L11 target',
  });
  const b = emitL14OutcomeAuditRecord({
    subjectClass: L14OutcomeAuditSubjectClass.SCORE_OUTCOME,
    subjectRef: 'l14.score.H',
    violationCodes: [L14OutcomeViolationCode.L14O_SCORE_EVALUATED_WITHOUT_L11_TARGET],
    message: 'cert: score without L11 target',
  });
  assert(a.replay_hash === b.replay_hash, 'H.1 audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL && a.blocking, 'H.2 score-without-target is CRITICAL + blocking');
  assert(severityForL14OutcomeCode(L14OutcomeViolationCode.L14O_LINEAGE_MISSING) === L14ConstitutionalAuditSeverity.ERROR, 'H.3 lineage-missing classified ERROR');
  assert(!isL14OutcomeBlockingCode(L14OutcomeViolationCode.L14O_LINEAGE_MISSING), 'H.4 lineage-missing not blocking');
  assert(isL14OutcomeBlockingCode(L14OutcomeViolationCode.L14O_FALSE_POSITIVE_DECLARED_FROM_IMMEDIATE_PRICE_MOVE), 'H.5 false-positive-from-immediate is blocking');
  assert(getL14OutcomeAuditLog().length === 2, 'H.6 audit log queryable');
  assert(getL14OutcomeCriticalViolations().length === 2, 'H.7 critical violations queryable');
  // Invariants.
  const invs = runAllL14_5Invariants();
  assert(invs.length === 12, `H.8 twelve invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `H.9 ${i.id} ${i.name} (${i.evidence})`);
  }
}

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
