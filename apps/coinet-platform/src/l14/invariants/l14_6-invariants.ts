/**
 * L14.6 — Calibration Evidence Invariants
 *
 * §14.6.70 — INV-14.6-A through INV-14.6-L.
 */

import {
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationProposalEligibilityClass,
  L14CalibrationReviewPriority,
  L14CalibrationSampleSufficiencyClass,
  L14CalibrationSubjectClass,
} from '../contracts/calibration-evidence-core';
import {
  L14CalibrationFindingClass,
  L14CalibrationFindingDirection,
  L14CalibrationFindingSeverity,
  L14CalibrationObservedMetric,
} from '../contracts/calibration-evidence-findings';
import {
  L14CalibrationEvidenceWindowClass,
} from '../contracts/calibration-evidence-aggregation';
import {
  L14AlertClassUsefulnessClass,
  L14PerformanceAttributionMethodClass,
} from '../contracts/calibration-evidence-specialized';
import {
  buildL14CalibrationAggregateComputation,
  buildL14CalibrationCohortDefinition,
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
} from '../calibration/calibration-evidence-engines';
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
} from '../validation/calibration-evidence.validators';
import { L14CalibrationMetricCompletenessClass } from '../contracts/calibration-evidence-aggregation';

export interface L14_6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): L14_6InvariantResult {
  return { id, name, holds, evidence };
}

// ── Fixture builders ──────────────────────────────────────────────

function window7d() {
  return buildL14CalibrationEvidenceWindow({
    window_class: L14CalibrationEvidenceWindowClass.ROLLING_7D,
    window_start: '2026-05-08T00:00:00Z',
    window_end: '2026-05-15T00:00:00Z',
    includes_outcome_horizon_classes: ['DAILY_24H'],
    fully_elapsed: true,
  });
}

function strongAggregate(evidenceClass: L14CalibrationEvidenceClass, subjectClass: L14CalibrationSubjectClass, subjectRef: string, sampleSize = 640, opts?: { withBehavior?: boolean; withFeedback?: boolean }) {
  const w = window7d();
  const cohort = buildL14CalibrationCohortDefinition({
    evidence_class: evidenceClass, subject_class: subjectClass, subject_ref: subjectRef,
    included_regime_refs: ['l10.regime.chop'],
    included_horizon_refs: ['DAILY_24H'],
  });
  const metric = computeL14CalibrationMetric({
    metric_name: L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE,
    numerator: 380, denominator: sampleSize,
  });
  return buildL14CalibrationAggregateComputation({
    evidence_class: evidenceClass, subject_class: subjectClass, subject_ref: subjectRef,
    cohort_definition_ref: cohort.cohort_definition_id,
    evidence_window_ref: w.evidence_window_id,
    source_outcome_evaluation_refs: Array.from({ length: 5 }, (_, i) => `l14.outcome.eval.${i}`),
    source_behavior_refs: opts?.withBehavior ? ['l14.beh.1'] : [],
    source_feedback_refs: opts?.withFeedback ? ['l13.fb.1'] : [],
    computed_metrics: [metric],
    sample_size: sampleSize,
  });
}

function makeFinding(metric: L14CalibrationObservedMetric, value: number, severity: L14CalibrationFindingSeverity, direction?: L14CalibrationFindingDirection) {
  return buildL14CalibrationFinding({
    finding_class: L14CalibrationFindingClass.MISALIGNMENT_RATE,
    observed_metric: metric,
    observed_value: value,
    severity_class: severity,
    interpretation: 'fixture finding',
    direction_of_concern: direction,
  });
}

function targetL11Threshold() {
  return buildL14CalibrationTargetRef({
    target_layer: 'L11',
    target_class: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    target_ref: 'l11.threshold.opportunity.80',
    why_affected: 'fixture',
  });
}

// ── INV-14.6-A : evidence-not-modification law ─────────────────────

export function checkINV_146_A(): L14_6InvariantResult {
  const t = targetL11Threshold();
  const v = validateL14CalibrationTargetRef(t);
  // Adversarial: try to mutate.
  const bad = { ...t, mutation_allowed_in_l14_6: true } as any;
  const vBad = validateL14CalibrationTargetRef(bad);
  return inv('INV-14.6-A', 'evidence-not-modification', v.clean && !vBad.clean && t.mutation_allowed_in_l14_6 === false,
    `legit=${v.clean} mutateRejected=${!vBad.clean}`);
}

// ── INV-14.6-B : sample sufficiency law ────────────────────────────

export function checkINV_146_B(): L14_6InvariantResult {
  // Insufficient sample, promoted priority → rejected.
  const req = buildL14CalibrationEvidenceRequest({
    evidence_class: L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE,
    subject_class: L14CalibrationSubjectClass.SCORE_BAND,
    subject_ref: 'l11.band.HIGH',
    evidence_window_ref: window7d().evidence_window_id,
    requested_by: 'SCHEDULED_CALIBRATION_SWEEP',
  });
  const agg = strongAggregate(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.HIGH', 15);
  const finding = makeFinding(L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE, 0.6, L14CalibrationFindingSeverity.MAJOR);
  const rec = buildL14CalibrationEvidenceRecord({
    request: req, aggregate: agg, findings: [finding],
    affected_targets: [targetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.NOT_ELIGIBLE_INSUFFICIENT_SAMPLE,
    confidence_class: L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE,
    observed_pattern_summary: 'fixture',
  });
  const v = validateL14CalibrationEvidenceRecord(rec);
  return inv('INV-14.6-B', 'sample sufficiency law', !v.clean,
    `validatorRejectsInsufficientPromoted=${!v.clean}`);
}

// ── INV-14.6-C : outcome-before-behavior law ───────────────────────

export function checkINV_146_C(): L14_6InvariantResult {
  // OUTCOME_ONLY class with behavior refs in aggregate → rejected.
  const agg = strongAggregate(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.HIGH', 640, { withBehavior: true });
  const v = validateL14CalibrationAggregateComputation(agg);
  return inv('INV-14.6-C', 'outcome-before-behavior law', !v.clean,
    `aggregateRejected=${!v.clean}`);
}

// ── INV-14.6-D : threshold noise law ───────────────────────────────

export function checkINV_146_D(): L14_6InvariantResult {
  const agg = strongAggregate(L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION, L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY, 'l11.threshold.80', 912, { withBehavior: true, withFeedback: true });
  const req = buildL14CalibrationEvidenceRequest({
    evidence_class: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subject_class: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subject_ref: 'l11.threshold.80',
    evidence_window_ref: window7d().evidence_window_id,
    requested_by: 'SCHEDULED_CALIBRATION_SWEEP',
  });
  const finding = makeFinding(L14CalibrationObservedMetric.THRESHOLD_NOISE_RATE, 0.7, L14CalibrationFindingSeverity.MAJOR);
  const rec = buildL14CalibrationEvidenceRecord({
    request: req, aggregate: agg, findings: [finding],
    affected_targets: [targetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'fixture',
  });
  // Threshold noise with strong outcome alignment (0.7) must be rejected.
  const vStrong = validateL14ThresholdNoiseEvidence(rec, /*alignment=*/0.7);
  // Threshold noise with weak alignment (0.29) accepted.
  const vWeak = validateL14ThresholdNoiseEvidence(rec, /*alignment=*/0.29);
  return inv('INV-14.6-D', 'threshold noise law', !vStrong.clean && vWeak.clean,
    `strongRejected=${!vStrong.clean} weakAccepted=${vWeak.clean}`);
}

// ── INV-14.6-E : hypothesis/scenario review law ───────────────────

export function checkINV_146_E(): L14_6InvariantResult {
  const agg = strongAggregate(L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN, L14CalibrationSubjectClass.HYPOTHESIS_FAMILY, 'l10.hypo.fam.X', 486);
  const req = buildL14CalibrationEvidenceRequest({
    evidence_class: L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN,
    subject_class: L14CalibrationSubjectClass.HYPOTHESIS_FAMILY,
    subject_ref: 'l10.hypo.fam.X',
    evidence_window_ref: window7d().evidence_window_id,
    requested_by: 'SCHEDULED_CALIBRATION_SWEEP',
  });
  const finding = makeFinding(L14CalibrationObservedMetric.HYPOTHESIS_INVALIDATION_RATE, 0.57, L14CalibrationFindingSeverity.MAJOR);
  const rec = buildL14CalibrationEvidenceRecord({
    request: req, aggregate: agg, findings: [finding],
    affected_targets: [buildL14CalibrationTargetRef({
      target_layer: 'L10',
      target_class: L14CalibrationLowerLayerTargetClass.L10_HYPOTHESIS_FAMILY_INTERPRETATION,
      target_ref: 'l10.hypo.fam.X',
      why_affected: 'fixture',
    })],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'fixture',
  });
  const vMissing = validateL14HypothesisFailureEvidence(rec, /*invldEvidencePresent=*/false);
  const vPresent = validateL14HypothesisFailureEvidence(rec, /*invldEvidencePresent=*/true);
  const scenRec = buildL14CalibrationEvidenceRecord({
    request: buildL14CalibrationEvidenceRequest({
      evidence_class: L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION,
      subject_class: L14CalibrationSubjectClass.SCENARIO_TEMPLATE,
      subject_ref: 'l12.scen.tmpl.Y',
      evidence_window_ref: window7d().evidence_window_id,
      requested_by: 'SCHEDULED_CALIBRATION_SWEEP',
    }),
    aggregate: strongAggregate(L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION, L14CalibrationSubjectClass.SCENARIO_TEMPLATE, 'l12.scen.tmpl.Y', 318),
    findings: [makeFinding(L14CalibrationObservedMetric.SCENARIO_FAILURE_CONDITION_RATE, 0.46, L14CalibrationFindingSeverity.MAJOR)],
    affected_targets: [buildL14CalibrationTargetRef({
      target_layer: 'L12',
      target_class: L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE,
      target_ref: 'l12.cap.rule.1',
      why_affected: 'fixture',
    })],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'fixture',
  });
  const scenMissing = validateL14ScenarioConfidenceEvidence(scenRec, false);
  const scenPresent = validateL14ScenarioConfidenceEvidence(scenRec, true);
  return inv('INV-14.6-E', 'hypothesis/scenario review law',
    !vMissing.clean && vPresent.clean && !scenMissing.clean && scenPresent.clean,
    `hypMissing=${!vMissing.clean} hypPresent=${vPresent.clean} scenMissing=${!scenMissing.clean} scenPresent=${scenPresent.clean}`);
}

// ── INV-14.6-F : alert usefulness separation law ──────────────────

export function checkINV_146_F(): L14_6InvariantResult {
  // High open rate alone with weak outcome → must NOT classify as HIGH_VALUE.
  const profOpenOnly = composeL14AlertClassUsefulness({
    alert_class_ref: 'l14.alert.class.X',
    evaluated_alert_count: 200,
    outcome_alignment_rate: 0.2,
    false_positive_rate: 0.5,
    open_rate: 0.6,
  });
  const notHigh = profOpenOnly.usefulness_class !== L14AlertClassUsefulnessClass.HIGH_VALUE_ALERT_CLASS;
  // Validator: opens-only declaration rejected.
  const v = validateL14AlertClassUsefulnessProfile(profOpenOnly, true);
  // Validator: HIGH_VALUE crafted with weak alignment rejected.
  const crafted = { ...profOpenOnly, usefulness_class: L14AlertClassUsefulnessClass.HIGH_VALUE_ALERT_CLASS };
  const vCrafted = validateL14AlertClassUsefulnessProfile(crafted, false);
  return inv('INV-14.6-F', 'alert usefulness separation',
    notHigh && !v.clean && !vCrafted.clean,
    `notHigh=${notHigh} openOnlyRejected=${!v.clean} craftedRejected=${!vCrafted.clean}`);
}

// ── INV-14.6-G : performance attribution non-causality law ────────

export function checkINV_146_G(): L14_6InvariantResult {
  const f = buildL14PerformanceAttributionFinding({
    feature_or_component_ref: 'l11.comp.spot_breadth',
    feature_label: 'Spot breadth',
    associated_outcome_class: 'ALIGNED',
    support_count: 120, counter_count: 30,
    interpretation: 'fixture',
  });
  const prof = buildL14PerformanceAttributionProfile({
    subject_class: L14CalibrationSubjectClass.FEATURE_SURFACE,
    subject_ref: 'l11.feature.spot_breadth',
    positive_findings: [f], negative_findings: [],
    attribution_method_class: L14PerformanceAttributionMethodClass.FEATURE_PRESENCE_RATE_COMPARISON,
    sample_size: 300,
  });
  const v = validateL14PerformanceAttributionProfile(prof, false);
  // Adversarial: forced causal flag.
  const bad = { ...prof, causal_claim_allowed: true } as any;
  const vBad = validateL14PerformanceAttributionProfile(bad, false);
  return inv('INV-14.6-G', 'attribution non-causality',
    v.clean && prof.causal_claim_allowed === false && !vBad.clean,
    `legit=${v.clean} hardPinned=${prof.causal_claim_allowed === false} causalForcedRejected=${!vBad.clean}`);
}

// ── INV-14.6-H : counterevidence preservation law ─────────────────

export function checkINV_146_H(): L14_6InvariantResult {
  const fA = makeFinding(L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE, 0.6, L14CalibrationFindingSeverity.MAJOR, L14CalibrationFindingDirection.ABOVE_ALLOWED_RANGE);
  const fB = makeFinding(L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE, 0.2, L14CalibrationFindingSeverity.MINOR, L14CalibrationFindingDirection.BELOW_ALLOWED_RANGE);
  const counter = detectL14Counterevidence([fA], [fB]);
  const detected = counter.length > 0 && counter[0] === fB.finding_id;
  // Construct record that hides counterevidence and grants proposal eligibility.
  const req = buildL14CalibrationEvidenceRequest({
    evidence_class: L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE,
    subject_class: L14CalibrationSubjectClass.SCORE_BAND,
    subject_ref: 'l11.band.HIGH',
    evidence_window_ref: window7d().evidence_window_id,
    requested_by: 'SCHEDULED_CALIBRATION_SWEEP',
  });
  const agg = strongAggregate(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.HIGH', 640);
  const hiding = buildL14CalibrationEvidenceRecord({
    request: req, aggregate: agg, findings: [fA],
    counterevidence_refs: [], // hidden
    affected_targets: [targetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'fixture',
  });
  const vHidden = validateL14CalibrationCounterevidence(hiding, [fB.finding_id]);
  return inv('INV-14.6-H', 'counterevidence preservation',
    detected && !vHidden.clean,
    `detected=${detected} hiddenRejected=${!vHidden.clean}`);
}

// ── INV-14.6-I : regime/horizon cohort law ────────────────────────

export function checkINV_146_I(): L14_6InvariantResult {
  // Regime-specific evidence missing included_regime_refs.
  const cohortBad = buildL14CalibrationCohortDefinition({
    evidence_class: L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE,
    subject_class: L14CalibrationSubjectClass.SCORE_FAMILY,
    subject_ref: 'l11.score.opportunity',
  });
  const v = validateL14CalibrationCohortDefinition(cohortBad, L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE);
  // Window merging incompatible horizons.
  const w = window7d();
  const vw = validateL14CalibrationEvidenceWindow(w, /*incompatibleHorizonsMerged=*/true);
  return inv('INV-14.6-I', 'regime/horizon cohort law',
    !v.clean && !vw.clean,
    `cohortRejected=${!v.clean} windowMergeRejected=${!vw.clean}`);
}

// ── INV-14.6-J : review priority law ──────────────────────────────

export function checkINV_146_J(): L14_6InvariantResult {
  const crit = classifyL14ReviewPriority({
    confidence_class: L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE,
    max_severity: L14CalibrationFindingSeverity.CRITICAL,
    sample_sufficiency_class: L14CalibrationSampleSufficiencyClass.SAMPLE_LARGE_STABLE,
    counterevidence_present: false,
  });
  const noRev = classifyL14ReviewPriority({
    confidence_class: L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE,
    max_severity: L14CalibrationFindingSeverity.CRITICAL,
    sample_sufficiency_class: L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT,
    counterevidence_present: false,
  });
  const elig = classifyL14ProposalEligibility({
    sample_size: 640,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    review_priority: L14CalibrationReviewPriority.HIGH,
    counterevidence_present: false,
    policy_minimum_sample: 300,
  });
  const blocked = classifyL14ProposalEligibility({
    sample_size: 640,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    review_priority: L14CalibrationReviewPriority.HIGH,
    counterevidence_present: true,
    policy_minimum_sample: 300,
  });
  return inv('INV-14.6-J', 'review priority law',
    crit === L14CalibrationReviewPriority.CRITICAL &&
    noRev === L14CalibrationReviewPriority.NO_REVIEW &&
    elig === L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT &&
    blocked === L14CalibrationProposalEligibilityClass.BLOCKED_CONTRADICTORY_EVIDENCE,
    `crit=${crit} noRev=${noRev} elig=${elig} blocked=${blocked}`);
}

// ── INV-14.6-K : lower-layer target law ───────────────────────────

export function checkINV_146_K(): L14_6InvariantResult {
  const t = targetL11Threshold();
  const v = validateL14CalibrationTargetRef(t);
  // Missing target_ref.
  const missing = { ...t, target_ref: '' };
  const vMissing = validateL14CalibrationTargetRef(missing);
  return inv('INV-14.6-K', 'lower-layer target law',
    v.clean && t.target_layer === 'L11' && t.mutation_allowed_in_l14_6 === false && !vMissing.clean,
    `legit=${v.clean} hardPinned=${t.mutation_allowed_in_l14_6 === false} missingRejected=${!vMissing.clean}`);
}

// ── INV-14.6-L : lineage and replay law ───────────────────────────

export function checkINV_146_L(): L14_6InvariantResult {
  const req = buildL14CalibrationEvidenceRequest({
    evidence_class: L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE,
    subject_class: L14CalibrationSubjectClass.SCORE_BAND,
    subject_ref: 'l11.band.L',
    evidence_window_ref: window7d().evidence_window_id,
    requested_by: 'SCHEDULED_CALIBRATION_SWEEP',
  });
  const agg = strongAggregate(L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE, L14CalibrationSubjectClass.SCORE_BAND, 'l11.band.L', 640);
  const finding = makeFinding(L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE, 0.55, L14CalibrationFindingSeverity.MAJOR);
  const rec = buildL14CalibrationEvidenceRecord({
    request: req, aggregate: agg, findings: [finding],
    affected_targets: [targetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'fixture',
  });
  const rec2 = buildL14CalibrationEvidenceRecord({
    request: req, aggregate: agg, findings: [finding],
    affected_targets: [targetL11Threshold()],
    review_priority: L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    confidence_class: L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'fixture',
  });
  const v = validateL14CalibrationEvidenceRecord(rec);
  const reqV = validateL14CalibrationEvidenceRequest(req);
  const aggV = validateL14CalibrationAggregateComputation(agg);
  return inv('INV-14.6-L', 'lineage and replay law',
    v.clean && reqV.clean && aggV.clean &&
    rec.replay_hash.length > 0 && rec.lineage_refs.length > 0 &&
    rec.replay_hash === rec2.replay_hash,
    `record=${v.clean} request=${reqV.clean} agg=${aggV.clean} replay=${rec.replay_hash === rec2.replay_hash}`);
}

// Keep some helper symbols live for downstream uses.
void detectL14CalibrationPatterns;
void classifyL14EvidenceConfidence;
void classifyL14SampleSufficiency;
void L14CalibrationMetricCompletenessClass;
void buildL14PerformanceAttributionFinding;
void buildL14PerformanceAttributionProfile;

export function runAllL14_6Invariants(): readonly L14_6InvariantResult[] {
  return [
    checkINV_146_A(),
    checkINV_146_B(),
    checkINV_146_C(),
    checkINV_146_D(),
    checkINV_146_E(),
    checkINV_146_F(),
    checkINV_146_G(),
    checkINV_146_H(),
    checkINV_146_I(),
    checkINV_146_J(),
    checkINV_146_K(),
    checkINV_146_L(),
  ];
}
