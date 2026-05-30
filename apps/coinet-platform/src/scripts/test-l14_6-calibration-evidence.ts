/**
 * L14.6 — Calibration Evidence Certification (Bands A..H)
 *
 * §14.6.71 — Proves request/policy/sample, aggregation/window/cohort,
 * score/confidence/threshold, hypothesis/scenario/trigger/invld,
 * alert usefulness, feature attribution, counterevidence/review/proposal,
 * audit + invariants.
 */

import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import {
  ALL_L14_CALIBRATION_EVIDENCE_CLASSES,
  ALL_L14_CALIBRATION_SUBJECT_CLASSES,
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationEvidenceInputMode,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationProposalEligibilityClass,
  L14CalibrationReviewPriority,
  L14CalibrationSampleSufficiencyClass,
  L14CalibrationSubjectClass,
  L14_EVIDENCE_CLASS_INPUT_MODE,
} from '../l14/contracts/calibration-evidence-core';
import {
  L14CalibrationFindingClass,
  L14CalibrationFindingDirection,
  L14CalibrationFindingSeverity,
  L14CalibrationObservedMetric,
} from '../l14/contracts/calibration-evidence-findings';
import {
  L14CalibrationEvidenceWindowClass,
  L14CalibrationMetricCompletenessClass,
} from '../l14/contracts/calibration-evidence-aggregation';
import {
  L14AlertClassUsefulnessClass,
  L14PerformanceAssociationStrength,
  L14PerformanceAttributionMethodClass,
} from '../l14/contracts/calibration-evidence-specialized';
import {
  buildL14CalibrationAggregateComputation,
  buildL14CalibrationCohortDefinition,
  buildL14CalibrationEvidenceClassPolicy,
  buildL14CalibrationEvidenceRecord,
  buildL14CalibrationEvidenceRequest,
  buildL14CalibrationEvidenceWindow,
  buildL14CalibrationFinding,
  buildL14CalibrationTargetRef,
  buildL14PerformanceAttributionFinding,
  buildL14PerformanceAttributionProfile,
  classifyL14EvidenceConfidence,
  classifyL14ProposalEligibility,
  classifyL14ReviewPriority,
  classifyL14SampleSufficiency,
  composeL14AlertClassUsefulness,
  computeL14CalibrationMetric,
  detectL14CalibrationPatterns,
  detectL14Counterevidence,
  isSubjectClassAllowed,
} from '../l14/calibration/calibration-evidence-engines';
import {
  validateL14AlertClassUsefulnessProfile,
  validateL14CalibrationAggregateComputation,
  validateL14CalibrationCohortDefinition,
  validateL14CalibrationCounterevidence,
  validateL14CalibrationEvidenceRecord,
  validateL14CalibrationEvidenceRequest,
  validateL14CalibrationEvidenceWindow,
  validateL14CalibrationTargetRef,
  validateL14HypothesisFailureEvidence,
  validateL14PerformanceAttributionProfile,
  validateL14ScenarioConfidenceEvidence,
  validateL14ThresholdNoiseEvidence,
} from '../l14/validation/calibration-evidence.validators';
import { L14CalibrationEvidenceViolationCode } from '../l14/validation/l14-calibration-evidence-violation-codes';
import {
  L14CalibrationEvidenceAuditSubjectClass,
  emitL14CalibrationEvidenceAuditRecord,
  getL14CalibrationEvidenceAuditLog,
  getL14CalibrationEvidenceCriticalViolations,
  isL14CalibrationEvidenceBlockingCode,
  resetL14CalibrationEvidenceAuditLog,
  severityForL14CalibrationEvidenceCode,
} from '../l14/constitution/l14-calibration-evidence-audit';
import { runAllL14_6Invariants } from '../l14/invariants/l14_6-invariants';

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

const W = buildL14CalibrationEvidenceWindow({
  window_class: L14CalibrationEvidenceWindowClass.ROLLING_7D,
  window_start: '2026-05-08T00:00:00Z',
  window_end: '2026-05-15T00:00:00Z',
  includes_outcome_horizon_classes: ['DAILY_24H'],
  fully_elapsed: true,
});

function makeReq(cls: L14CalibrationEvidenceClass, sub: L14CalibrationSubjectClass, ref: string, regime?: string) {
  return buildL14CalibrationEvidenceRequest({
    evidence_class: cls, subject_class: sub, subject_ref: ref,
    regime_ref: regime, evidence_window_ref: W.evidence_window_id,
    requested_by: 'SCHEDULED_CALIBRATION_SWEEP',
  });
}

function makeCohort(cls: L14CalibrationEvidenceClass, sub: L14CalibrationSubjectClass, ref: string, regimes?: readonly string[]) {
  return buildL14CalibrationCohortDefinition({
    evidence_class: cls, subject_class: sub, subject_ref: ref,
    included_regime_refs: regimes ?? ['l10.regime.chop'],
    included_horizon_refs: ['DAILY_24H'],
  });
}

function makeAgg(cls: L14CalibrationEvidenceClass, sub: L14CalibrationSubjectClass, ref: string, n: number, opts?: { withBehavior?: boolean; withFeedback?: boolean }) {
  const cohort = makeCohort(cls, sub, ref);
  const metric = computeL14CalibrationMetric({
    metric_name: L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE,
    numerator: Math.floor(n * 0.55), denominator: n,
  });
  return buildL14CalibrationAggregateComputation({
    evidence_class: cls, subject_class: sub, subject_ref: ref,
    cohort_definition_ref: cohort.cohort_definition_id,
    evidence_window_ref: W.evidence_window_id,
    source_outcome_evaluation_refs: Array.from({ length: 5 }, (_, i) => `l14.outcome.${i}`),
    source_behavior_refs: opts?.withBehavior ? ['l14.beh.1'] : [],
    source_feedback_refs: opts?.withFeedback ? ['l13.fb.1'] : [],
    computed_metrics: [metric],
    sample_size: n,
  });
}

function makeFinding(severity: L14CalibrationFindingSeverity, metric = L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE) {
  return buildL14CalibrationFinding({
    finding_class: L14CalibrationFindingClass.MISALIGNMENT_RATE,
    observed_metric: metric, observed_value: 0.55,
    severity_class: severity, interpretation: 'cert fixture',
    direction_of_concern: L14CalibrationFindingDirection.ABOVE_ALLOWED_RANGE,
  });
}

function makeTargetL11Threshold() {
  return buildL14CalibrationTargetRef({
    target_layer: 'L11',
    target_class: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    target_ref: 'l11.threshold.opportunity.80',
    why_affected: 'cert fixture',
  });
}

console.log('L14.6 — Calibration Evidence Certification');

// ── BAND A : Evidence object, policies, and sample law ───────────
band('BAND A — evidence object / policies / sample law');

{
  assert(ALL_L14_CALIBRATION_EVIDENCE_CLASSES.length === 11, `A.1 11 evidence classes registered (got ${ALL_L14_CALIBRATION_EVIDENCE_CLASSES.length})`);
  assert(ALL_L14_CALIBRATION_SUBJECT_CLASSES.length === 14, `A.2 14 subject classes registered (got ${ALL_L14_CALIBRATION_SUBJECT_CLASSES.length})`);
  // Policy registry for each evidence class.
  let allPolicyOk = true;
  for (const c of ALL_L14_CALIBRATION_EVIDENCE_CLASSES) {
    const p = buildL14CalibrationEvidenceClassPolicy(c);
    if (p.evidence_class !== c) allPolicyOk = false;
    if (p.input_mode !== L14_EVIDENCE_CLASS_INPUT_MODE[c]) allPolicyOk = false;
  }
  assert(allPolicyOk, 'A.3 policy registry covers all evidence classes with correct input mode');
  // isSubjectClassAllowed correct.
  assert(isSubjectClassAllowed(L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION, L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY), 'A.4 threshold noise allows SCORE_THRESHOLD_POLICY');
  assert(!isSubjectClassAllowed(L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN, L14CalibrationSubjectClass.ALERT_CLASS), 'A.5 hypothesis failure rejects ALERT_CLASS subject');
  // Sample sufficiency thresholds.
  assert(classifyL14SampleSufficiency(10) === L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT, 'A.6 N=10 → SAMPLE_INSUFFICIENT');
  assert(classifyL14SampleSufficiency(50) === L14CalibrationSampleSufficiencyClass.SAMPLE_SMALL_DIRECTIONAL, 'A.7 N=50 → SAMPLE_SMALL_DIRECTIONAL');
  assert(classifyL14SampleSufficiency(150) === L14CalibrationSampleSufficiencyClass.SAMPLE_MODERATE, 'A.8 N=150 → SAMPLE_MODERATE');
  assert(classifyL14SampleSufficiency(500) === L14CalibrationSampleSufficiencyClass.SAMPLE_STRONG, 'A.9 N=500 → SAMPLE_STRONG');
  assert(classifyL14SampleSufficiency(1500) === L14CalibrationSampleSufficiencyClass.SAMPLE_LARGE_STABLE, 'A.10 N=1500 → SAMPLE_LARGE_STABLE');
  // Confidence cannot be false-green: aggregate with mis-declared sufficiency.
  const aggFalseGreen = {
    ...makeAgg(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.A', 50),
    sample_sufficiency_class: L14CalibrationSampleSufficiencyClass.SAMPLE_LARGE_STABLE,
  };
  assert(!validateL14CalibrationAggregateComputation(aggFalseGreen).clean, 'A.11 sample sufficiency false-green rejected');
  // Insufficient sample promoted: record validation rejects.
  const req = makeReq(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.A');
  const aggSmall = makeAgg(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.A', 10);
  const recSmallPromoted = buildL14CalibrationEvidenceRecord({
    request: req, aggregate: aggSmall, findings: [makeFinding(L14CalibrationFindingSeverity.MAJOR)],
    affected_targets: [makeTargetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.NOT_ELIGIBLE_INSUFFICIENT_SAMPLE,
    confidence_class: L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(!validateL14CalibrationEvidenceRecord(recSmallPromoted).clean, 'A.12 insufficient sample + HIGH review priority rejected');
}

// ── BAND B : Aggregation, cohort, and window law ─────────────────
band('BAND B — aggregation / cohort / window law');

{
  assert(validateL14CalibrationEvidenceWindow(W, false).clean, 'B.1 window legal when horizons compatible');
  assert(!validateL14CalibrationEvidenceWindow(W, true).clean, 'B.2 incompatible horizons merged rejected');
  // Cohort required.
  const v = validateL14CalibrationCohortDefinition(undefined, L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE);
  assert(!v.clean, 'B.3 missing cohort rejected');
  const c = makeCohort(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.B');
  assert(validateL14CalibrationCohortDefinition(c, L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE).clean, 'B.4 cohort accepted');
  // Regime-specific evidence requires regime refs.
  const cohortNoRegimes = buildL14CalibrationCohortDefinition({
    evidence_class: L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE,
    subject_class: L14CalibrationSubjectClass.SCORE_FAMILY,
    subject_ref: 'l11.score.opportunity',
  });
  assert(!validateL14CalibrationCohortDefinition(cohortNoRegimes, L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE).clean, 'B.5 regime-specific evidence missing regime refs rejected');
  // Behavior on OUTCOME_ONLY rejected.
  const aggBeh = makeAgg(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.B', 500, { withBehavior: true });
  assert(!validateL14CalibrationAggregateComputation(aggBeh).clean, 'B.6 behavior on OUTCOME_ONLY class rejected');
  // Feedback on non-feedback-allowed rejected.
  const aggFb = makeAgg(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.B', 500, { withFeedback: true });
  assert(!validateL14CalibrationAggregateComputation(aggFb).clean, 'B.7 feedback as truth on OUTCOME_ONLY rejected');
  // Behavior+feedback legal for ALERT_CLASS_USEFULNESS.
  const aggUse = makeAgg(L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS, L14CalibrationSubjectClass.ALERT_CLASS, 'l13.alert.cls.X', 500, { withBehavior: true, withFeedback: true });
  assert(validateL14CalibrationAggregateComputation(aggUse).clean, 'B.8 behavior+feedback legal for ALERT_CLASS_USEFULNESS');
  // Replay determinism.
  const agg1 = makeAgg(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.B', 500);
  const agg2 = makeAgg(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.B', 500);
  assert(agg1.replay_hash === agg2.replay_hash, 'B.9 aggregate replay deterministic');
  // Computed metric value math.
  const m = computeL14CalibrationMetric({ metric_name: L14CalibrationObservedMetric.OUTCOME_ALIGNMENT_RATE, numerator: 30, denominator: 100 });
  assert(m.value === 0.3 && m.metric_completeness_class === L14CalibrationMetricCompletenessClass.COMPLETE, 'B.10 metric computation correct');
}

// ── BAND C : score / threshold / confidence ───────────────────────
band('BAND C — score / threshold / confidence');

{
  // Score outcome performance evidence record.
  const req = makeReq(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.VERY_HIGH');
  const agg = makeAgg(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.VERY_HIGH', 1240);
  const finding = makeFinding(L14CalibrationFindingSeverity.MATERIAL);
  const target = buildL14CalibrationTargetRef({
    target_layer: 'L11',
    target_class: L14CalibrationLowerLayerTargetClass.L11_SCORE_FORMULA,
    target_ref: 'l11.score.opportunity', why_affected: 'cert',
  });
  const rec = buildL14CalibrationEvidenceRecord({
    request: req, aggregate: agg, findings: [finding],
    affected_targets: [target],
    review_priority: L14CalibrationReviewPriority.LOW,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.NOT_ELIGIBLE_WEAK_SIGNAL,
    confidence_class: L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(validateL14CalibrationEvidenceRecord(rec).clean, 'C.1 score outcome performance record clean');
  // Threshold noise must show outcome weakness.
  const reqN = makeReq(L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION, L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY, 'l11.threshold.80');
  const aggN = makeAgg(L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION, L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY, 'l11.threshold.80', 912, { withBehavior: true, withFeedback: true });
  const recN = buildL14CalibrationEvidenceRecord({
    request: reqN, aggregate: aggN, findings: [makeFinding(L14CalibrationFindingSeverity.MAJOR, L14CalibrationObservedMetric.THRESHOLD_NOISE_RATE)],
    affected_targets: [makeTargetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(validateL14ThresholdNoiseEvidence(recN, 0.29).clean, 'C.2 threshold noise with weak alignment accepted');
  assert(!validateL14ThresholdNoiseEvidence(recN, 0.65).clean, 'C.3 threshold noise with strong alignment rejected');
  // Score confidence accuracy: high-conf overstatement evidence.
  const reqC = makeReq(L14CalibrationEvidenceClass.SCORE_CONFIDENCE_ACCURACY, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.HIGH');
  const aggC = makeAgg(L14CalibrationEvidenceClass.SCORE_CONFIDENCE_ACCURACY, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.HIGH', 600);
  const findingOver = makeFinding(L14CalibrationFindingSeverity.MAJOR, L14CalibrationObservedMetric.CONFIDENCE_OVERSTATEMENT_FREQUENCY);
  const recC = buildL14CalibrationEvidenceRecord({
    request: reqC, aggregate: aggC, findings: [findingOver],
    affected_targets: [buildL14CalibrationTargetRef({
      target_layer: 'L11',
      target_class: L14CalibrationLowerLayerTargetClass.L11_SCORE_CONFIDENCE_RULE,
      target_ref: 'l11.conf.rule.1', why_affected: 'cert',
    })],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(validateL14CalibrationEvidenceRecord(recC).clean, 'C.4 confidence accuracy evidence record clean');
  // Affected target law for L11 thresholds.
  const targetVal = validateL14CalibrationTargetRef(makeTargetL11Threshold());
  assert(targetVal.clean && makeTargetL11Threshold().mutation_allowed_in_l14_6 === false, 'C.5 L11 threshold target hard-pinned no-mutation');
}

// ── BAND D : hypothesis / scenario / trigger / invalidation ──────
band('BAND D — hypothesis / scenario / trigger / invalidation');

{
  // Hypothesis failure pattern.
  const reqH = makeReq(L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN, L14CalibrationSubjectClass.HYPOTHESIS_FAMILY, 'l10.hypo.X');
  const aggH = makeAgg(L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN, L14CalibrationSubjectClass.HYPOTHESIS_FAMILY, 'l10.hypo.X', 486);
  const recH = buildL14CalibrationEvidenceRecord({
    request: reqH, aggregate: aggH,
    findings: [makeFinding(L14CalibrationFindingSeverity.MAJOR, L14CalibrationObservedMetric.HYPOTHESIS_INVALIDATION_RATE)],
    affected_targets: [buildL14CalibrationTargetRef({
      target_layer: 'L10',
      target_class: L14CalibrationLowerLayerTargetClass.L10_HYPOTHESIS_FAMILY_INTERPRETATION,
      target_ref: 'l10.hypo.X', why_affected: 'cert',
    })],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(validateL14HypothesisFailureEvidence(recH, true).clean, 'D.1 hypothesis failure pattern with invalidation evidence accepted');
  assert(!validateL14HypothesisFailureEvidence(recH, false).clean, 'D.2 hypothesis failure pattern without invalidation evidence rejected');
  // Scenario confidence calibration.
  const reqS = makeReq(L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION, L14CalibrationSubjectClass.SCENARIO_TEMPLATE, 'l12.scen.tmpl.Y');
  const aggS = makeAgg(L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION, L14CalibrationSubjectClass.SCENARIO_TEMPLATE, 'l12.scen.tmpl.Y', 318);
  const recS = buildL14CalibrationEvidenceRecord({
    request: reqS, aggregate: aggS,
    findings: [makeFinding(L14CalibrationFindingSeverity.MAJOR, L14CalibrationObservedMetric.SCENARIO_FAILURE_CONDITION_RATE)],
    affected_targets: [buildL14CalibrationTargetRef({
      target_layer: 'L12',
      target_class: L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE,
      target_ref: 'l12.cap.rule', why_affected: 'cert',
    })],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(validateL14ScenarioConfidenceEvidence(recS, true).clean, 'D.3 scenario confidence calibration with misalignment accepted');
  assert(!validateL14ScenarioConfidenceEvidence(recS, false).clean, 'D.4 scenario confidence calibration without misalignment rejected');
  // Trigger signal value evidence.
  const reqT = makeReq(L14CalibrationEvidenceClass.TRIGGER_SIGNAL_VALUE, L14CalibrationSubjectClass.TRIGGER_FAMILY, 'l12.trig.fam.T');
  const aggT = makeAgg(L14CalibrationEvidenceClass.TRIGGER_SIGNAL_VALUE, L14CalibrationSubjectClass.TRIGGER_FAMILY, 'l12.trig.fam.T', 400);
  const recT = buildL14CalibrationEvidenceRecord({
    request: reqT, aggregate: aggT,
    findings: [makeFinding(L14CalibrationFindingSeverity.MATERIAL, L14CalibrationObservedMetric.TRIGGER_DOWNSTREAM_EFFECT_RATE)],
    affected_targets: [buildL14CalibrationTargetRef({
      target_layer: 'L12',
      target_class: L14CalibrationLowerLayerTargetClass.L12_TRIGGER_RULE,
      target_ref: 'l12.trig.rule.T', why_affected: 'cert',
    })],
    review_priority: L14CalibrationReviewPriority.MEDIUM,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(validateL14CalibrationEvidenceRecord(recT).clean, 'D.5 trigger signal value evidence clean');
  // Invalidation signal value evidence.
  const reqI = makeReq(L14CalibrationEvidenceClass.INVALIDATION_SIGNAL_VALUE, L14CalibrationSubjectClass.INVALIDATION_FAMILY, 'l12.invld.fam.I');
  const aggI = makeAgg(L14CalibrationEvidenceClass.INVALIDATION_SIGNAL_VALUE, L14CalibrationSubjectClass.INVALIDATION_FAMILY, 'l12.invld.fam.I', 350);
  const recI = buildL14CalibrationEvidenceRecord({
    request: reqI, aggregate: aggI,
    findings: [makeFinding(L14CalibrationFindingSeverity.MATERIAL, L14CalibrationObservedMetric.INVALIDATION_DOWNSTREAM_EFFECT_RATE)],
    affected_targets: [buildL14CalibrationTargetRef({
      target_layer: 'L12',
      target_class: L14CalibrationLowerLayerTargetClass.L12_INVALIDATION_RULE,
      target_ref: 'l12.invld.rule', why_affected: 'cert',
    })],
    review_priority: L14CalibrationReviewPriority.MEDIUM,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(validateL14CalibrationEvidenceRecord(recI).clean, 'D.6 invalidation signal value evidence clean');
}

// ── BAND E : alert usefulness + behavior separation ──────────────
band('BAND E — alert usefulness + behavior separation');

{
  const highValue = composeL14AlertClassUsefulness({
    alert_class_ref: 'l13.alert.cls.fragility',
    evaluated_alert_count: 1104,
    outcome_alignment_rate: 0.71,
    false_positive_rate: 0.18,
    open_rate: 0.42,
    deeper_investigation_rate: 0.31,
    ignore_rate: 0.05,
  });
  assert(highValue.usefulness_class === L14AlertClassUsefulnessClass.HIGH_VALUE_ALERT_CLASS, 'E.1 outcome-strong + behavior-high → HIGH_VALUE');
  assert(validateL14AlertClassUsefulnessProfile(highValue, false).clean, 'E.2 high-value validator clean');
  // Outcome-strong + low engagement → OUTCOME_STRONG_BUT_UNDERENGAGED.
  const underEng = composeL14AlertClassUsefulness({
    alert_class_ref: 'l13.alert.cls.unlock',
    evaluated_alert_count: 200,
    outcome_alignment_rate: 0.7,
    false_positive_rate: 0.15,
    open_rate: 0.2,
    deeper_investigation_rate: 0.05,
  });
  assert(underEng.usefulness_class === L14AlertClassUsefulnessClass.OUTCOME_STRONG_BUT_UNDERENGAGED, 'E.3 outcome-strong+underengaged classified correctly');
  // Engagement-active but outcome-weak → BEHAVIORALLY_ACTIVE_BUT_OUTCOME_WEAK.
  const engWeak = composeL14AlertClassUsefulness({
    alert_class_ref: 'l13.alert.cls.hype',
    evaluated_alert_count: 600,
    outcome_alignment_rate: 0.2,
    false_positive_rate: 0.55,
    open_rate: 0.5,
    deeper_investigation_rate: 0.25,
  });
  assert(engWeak.usefulness_class === L14AlertClassUsefulnessClass.BEHAVIORALLY_ACTIVE_BUT_OUTCOME_WEAK, 'E.4 high engagement + weak outcome classified correctly');
  // Ignored + outcome-weak → LOW_VALUE.
  const lowValue = composeL14AlertClassUsefulness({
    alert_class_ref: 'l13.alert.cls.weak',
    evaluated_alert_count: 400,
    outcome_alignment_rate: 0.2,
    false_positive_rate: 0.55,
    ignore_rate: 0.7,
  });
  assert(lowValue.usefulness_class === L14AlertClassUsefulnessClass.LOW_VALUE_ALERT_CLASS, 'E.5 ignored + outcome-weak → LOW_VALUE');
  // Open rate alone declaration rejected.
  const openOnly = composeL14AlertClassUsefulness({
    alert_class_ref: 'l13.alert.cls.openonly',
    evaluated_alert_count: 200,
    outcome_alignment_rate: 0.2,
    false_positive_rate: 0.5,
    open_rate: 0.6,
  });
  assert(!validateL14AlertClassUsefulnessProfile(openOnly, true).clean, 'E.6 open-rate-only declaration rejected');
  // Feedback cannot rescue weak outcome.
  const crafted = { ...openOnly, usefulness_class: L14AlertClassUsefulnessClass.HIGH_VALUE_ALERT_CLASS };
  assert(!validateL14AlertClassUsefulnessProfile(crafted, false).clean, 'E.7 HIGH_VALUE crafted with weak outcome rejected');
}

// ── BAND F : feature importance + performance attribution ────────
band('BAND F — feature importance + performance attribution');

{
  const fPos = buildL14PerformanceAttributionFinding({
    feature_or_component_ref: 'l11.comp.spot_breadth',
    feature_label: 'Spot breadth',
    associated_outcome_class: 'ALIGNED',
    support_count: 240, counter_count: 60,
    interpretation: 'cert',
  });
  assert(fPos.association_strength === L14PerformanceAssociationStrength.STRONG_ASSOCIATION, 'F.1 240/300 → STRONG_ASSOCIATION');
  const fInc = buildL14PerformanceAttributionFinding({
    feature_or_component_ref: 'l11.comp.tiny',
    feature_label: 'tiny',
    associated_outcome_class: 'ALIGNED',
    support_count: 10, counter_count: 5,
    interpretation: 'cert',
  });
  assert(fInc.association_strength === L14PerformanceAssociationStrength.INCONCLUSIVE_ASSOCIATION, 'F.2 small N → INCONCLUSIVE_ASSOCIATION');
  const prof = buildL14PerformanceAttributionProfile({
    subject_class: L14CalibrationSubjectClass.FEATURE_SURFACE,
    subject_ref: 'l11.feature.spot_breadth',
    regime_ref: 'l10.regime.expansion',
    horizon_ref: 'DAILY_24H',
    positive_findings: [fPos], negative_findings: [],
    attribution_method_class: L14PerformanceAttributionMethodClass.FEATURE_PRESENCE_RATE_COMPARISON,
    sample_size: 300,
  });
  assert(prof.causal_claim_allowed === false, 'F.3 causal_claim_allowed hard-pinned false');
  assert(validateL14PerformanceAttributionProfile(prof, false).clean, 'F.4 attribution profile validator clean');
  // Causal claim attempt rejected.
  const bad = { ...prof, causal_claim_allowed: true } as any;
  assert(!validateL14PerformanceAttributionProfile(bad, false).clean, 'F.5 causal-flag-flipped profile rejected');
  // Causal language rejection at validator level.
  assert(!validateL14PerformanceAttributionProfile(prof, true).clean, 'F.6 stateAsCausal=true rejected');
}

// ── BAND G : counterevidence / review / proposal eligibility ─────
band('BAND G — counterevidence / review priority / proposal eligibility');

{
  // Detection.
  const fA = buildL14CalibrationFinding({
    finding_class: L14CalibrationFindingClass.MISALIGNMENT_RATE,
    observed_metric: L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE,
    observed_value: 0.6,
    severity_class: L14CalibrationFindingSeverity.MAJOR,
    direction_of_concern: L14CalibrationFindingDirection.ABOVE_ALLOWED_RANGE,
    interpretation: 'a',
  });
  const fB = buildL14CalibrationFinding({
    finding_class: L14CalibrationFindingClass.MISALIGNMENT_RATE,
    observed_metric: L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE,
    observed_value: 0.2,
    severity_class: L14CalibrationFindingSeverity.MINOR,
    direction_of_concern: L14CalibrationFindingDirection.BELOW_ALLOWED_RANGE,
    interpretation: 'b',
  });
  const counter = detectL14Counterevidence([fA], [fB]);
  assert(counter.length === 1 && counter[0] === fB.finding_id, 'G.1 counterevidence detected');
  // Review priority deterministic.
  const crit = classifyL14ReviewPriority({
    confidence_class: L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE,
    max_severity: L14CalibrationFindingSeverity.CRITICAL,
    sample_sufficiency_class: L14CalibrationSampleSufficiencyClass.SAMPLE_LARGE_STABLE,
    counterevidence_present: false,
  });
  assert(crit === L14CalibrationReviewPriority.CRITICAL, 'G.2 strong+critical+no-counter → CRITICAL');
  const noRev = classifyL14ReviewPriority({
    confidence_class: L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE,
    max_severity: L14CalibrationFindingSeverity.MAJOR,
    sample_sufficiency_class: L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT,
    counterevidence_present: false,
  });
  assert(noRev === L14CalibrationReviewPriority.NO_REVIEW, 'G.3 insufficient evidence → NO_REVIEW');
  // Proposal eligibility blocked by counterevidence.
  const blocked = classifyL14ProposalEligibility({
    sample_size: 640,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    review_priority: L14CalibrationReviewPriority.HIGH,
    counterevidence_present: true,
    policy_minimum_sample: 300,
  });
  assert(blocked === L14CalibrationProposalEligibilityClass.BLOCKED_CONTRADICTORY_EVIDENCE, 'G.4 counterevidence blocks proposal eligibility');
  const elig = classifyL14ProposalEligibility({
    sample_size: 640,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    review_priority: L14CalibrationReviewPriority.HIGH,
    counterevidence_present: false,
    policy_minimum_sample: 300,
  });
  assert(elig === L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT, 'G.5 strong+high → ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT');
  // Critical review unsupported (with low confidence) rejected at record level.
  const reqU = makeReq(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.G');
  const aggU = makeAgg(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.G', 500);
  const recU = buildL14CalibrationEvidenceRecord({
    request: reqU, aggregate: aggU, findings: [makeFinding(L14CalibrationFindingSeverity.CRITICAL)],
    affected_targets: [makeTargetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.CRITICAL,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.LOW_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(!validateL14CalibrationEvidenceRecord(recU).clean, 'G.6 CRITICAL review with LOW confidence rejected');
  // Counterevidence hidden rejected.
  const recHide = buildL14CalibrationEvidenceRecord({
    request: reqU, aggregate: aggU, findings: [fA],
    counterevidence_refs: [], // hide it
    affected_targets: [makeTargetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'cert',
  });
  assert(!validateL14CalibrationCounterevidence(recHide, [fB.finding_id]).clean, 'G.7 hidden counterevidence rejected');
  // Target ref mutation must be hard-pinned.
  const t = makeTargetL11Threshold();
  assert(t.mutation_allowed_in_l14_6 === false && validateL14CalibrationTargetRef(t).clean, 'G.8 target ref hard-pinned no-mutation');
}

// ── BAND H : audit + invariants ───────────────────────────────────
band('BAND H — audit + invariants');

{
  resetL14CalibrationEvidenceAuditLog();
  const a = emitL14CalibrationEvidenceAuditRecord({
    subjectClass: L14CalibrationEvidenceAuditSubjectClass.CALIBRATION_EVIDENCE_RECORD,
    subjectRef: 'l14.evidence.cert.1',
    violationCodes: [L14CalibrationEvidenceViolationCode.L14E_PROPOSAL_ELIGIBILITY_OVERSTATED],
    message: 'cert',
  });
  const b = emitL14CalibrationEvidenceAuditRecord({
    subjectClass: L14CalibrationEvidenceAuditSubjectClass.CALIBRATION_EVIDENCE_RECORD,
    subjectRef: 'l14.evidence.cert.1',
    violationCodes: [L14CalibrationEvidenceViolationCode.L14E_PROPOSAL_ELIGIBILITY_OVERSTATED],
    message: 'cert',
  });
  assert(a.replay_hash === b.replay_hash, 'H.1 audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL && a.blocking, 'H.2 eligibility-overstated is CRITICAL + blocking');
  assert(severityForL14CalibrationEvidenceCode(L14CalibrationEvidenceViolationCode.L14E_LINEAGE_MISSING) === L14ConstitutionalAuditSeverity.ERROR, 'H.3 lineage-missing classified ERROR');
  assert(!isL14CalibrationEvidenceBlockingCode(L14CalibrationEvidenceViolationCode.L14E_LINEAGE_MISSING), 'H.4 lineage-missing not blocking');
  assert(isL14CalibrationEvidenceBlockingCode(L14CalibrationEvidenceViolationCode.L14E_FEEDBACK_TREATED_AS_CORRECTNESS), 'H.5 feedback-as-truth blocking');
  assert(getL14CalibrationEvidenceAuditLog().length === 2, 'H.6 audit log queryable');
  assert(getL14CalibrationEvidenceCriticalViolations().length === 2, 'H.7 critical violations queryable');
  const invs = runAllL14_6Invariants();
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

// Touch a few imports to keep them live.
void detectL14CalibrationPatterns;
void classifyL14EvidenceConfidence;
