/**
 * L14.6 — Calibration Evidence Engines
 *
 * §14.6.58 — Consolidated pure-function engines:
 * request resolver, class policy, subject resolver, window resolver,
 * cohort builder, aggregate/behavior/feedback loaders (deterministic),
 * metric computation, sample sufficiency, pattern detection,
 * performance attribution, counterevidence detection, evidence confidence,
 * review priority, proposal eligibility, evidence record builder.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationEvidenceInputMode,
  L14CalibrationEvidenceLimitation,
  L14CalibrationEvidenceRequest,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationProposalEligibilityClass,
  L14CalibrationReviewPriority,
  L14CalibrationSampleSufficiencyClass,
  L14CalibrationSubjectClass,
  L14CalibrationTargetRef,
  L14_EVIDENCE_CLASS_INPUT_MODE,
  L14_SAMPLE_INSUFFICIENT_MAX,
  L14_SAMPLE_MODERATE_MAX,
  L14_SAMPLE_SMALL_MAX,
  L14_SAMPLE_STRONG_MAX,
  type L14CalibrationEvidenceRecord,
} from '../contracts/calibration-evidence-core';
import {
  L14CalibrationFindingClass,
  L14CalibrationFindingDirection,
  L14CalibrationFindingSeverity,
  L14CalibrationObservedMetric,
  type L14CalibrationFinding,
} from '../contracts/calibration-evidence-findings';
import {
  L14CalibrationEvidenceWindowClass,
  L14CalibrationMetricCompletenessClass,
  type L14CalibrationAggregateComputation,
  type L14CalibrationComputedMetric,
  type L14CalibrationCohortDefinition,
  type L14CalibrationCohortRule,
  type L14CalibrationEvidenceClassPolicy,
  type L14CalibrationEvidenceWindow,
} from '../contracts/calibration-evidence-aggregation';
import {
  L14AlertClassUsefulnessClass,
  L14PerformanceAssociationStrength,
  L14PerformanceAttributionMethodClass,
  L14PerformanceAttributionOutcomeClass,
  type L14AlertClassUsefulnessProfile,
  type L14PerformanceAttributionFinding,
  type L14PerformanceAttributionProfile,
} from '../contracts/calibration-evidence-specialized';
import type { L14EvaluationHorizon } from '../contracts/outcome-evaluation-core';

const POLICY_V = 'l14.evidence.v1';

// ── Request resolver ──────────────────────────────────────────────

export interface L14CalibrationEvidenceRequestInput {
  readonly evidence_class: L14CalibrationEvidenceClass;
  readonly subject_class: L14CalibrationSubjectClass;
  readonly subject_ref: string;
  readonly regime_ref?: string;
  readonly evidence_window_ref: string;
  readonly requested_by: L14CalibrationEvidenceRequest['requested_by'];
}

export function buildL14CalibrationEvidenceRequest(
  input: L14CalibrationEvidenceRequestInput,
): L14CalibrationEvidenceRequest {
  const id = `l14.evidence.req.${fnv1a([
    input.evidence_class, input.subject_class, input.subject_ref,
    input.regime_ref ?? '', input.evidence_window_ref, input.requested_by, POLICY_V,
  ].join('|'))}`;
  return {
    calibration_evidence_request_id: id,
    evidence_class: input.evidence_class,
    subject_class: input.subject_class,
    subject_ref: input.subject_ref,
    regime_ref: input.regime_ref,
    evidence_window_ref: input.evidence_window_ref,
    requested_by: input.requested_by,
    lineage_refs: ['l14.evidence.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Class policy registry ─────────────────────────────────────────

const ALLOWED_SUBJECTS_BY_CLASS: Readonly<Record<L14CalibrationEvidenceClass, readonly L14CalibrationSubjectClass[]>> = {
  [L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE]: [
    L14CalibrationSubjectClass.SCORE_FAMILY,
    L14CalibrationSubjectClass.SCORE_BAND,
  ],
  [L14CalibrationEvidenceClass.SCORE_CONFIDENCE_ACCURACY]: [
    L14CalibrationSubjectClass.SCORE_FAMILY,
    L14CalibrationSubjectClass.SCORE_BAND,
  ],
  [L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION]: [
    L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    L14CalibrationSubjectClass.SCORE_BAND,
  ],
  [L14CalibrationEvidenceClass.HYPOTHESIS_SUCCESS_RATE]: [L14CalibrationSubjectClass.HYPOTHESIS_FAMILY],
  [L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN]: [L14CalibrationSubjectClass.HYPOTHESIS_FAMILY],
  [L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION]: [
    L14CalibrationSubjectClass.SCENARIO_TEMPLATE,
    L14CalibrationSubjectClass.SCENARIO_CONFIDENCE_CLASS,
  ],
  [L14CalibrationEvidenceClass.TRIGGER_SIGNAL_VALUE]: [L14CalibrationSubjectClass.TRIGGER_FAMILY],
  [L14CalibrationEvidenceClass.INVALIDATION_SIGNAL_VALUE]: [L14CalibrationSubjectClass.INVALIDATION_FAMILY],
  [L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE]: [
    L14CalibrationSubjectClass.REGIME_CLASS,
    L14CalibrationSubjectClass.SCORE_FAMILY,
    L14CalibrationSubjectClass.HYPOTHESIS_FAMILY,
    L14CalibrationSubjectClass.SCENARIO_TEMPLATE,
  ],
  [L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS]: [L14CalibrationSubjectClass.ALERT_CLASS],
  [L14CalibrationEvidenceClass.FEATURE_IMPORTANCE_BY_REGIME]: [
    L14CalibrationSubjectClass.FEATURE_SURFACE,
    L14CalibrationSubjectClass.SCORE_COMPONENT,
  ],
};

const TARGETS_BY_CLASS: Readonly<Record<L14CalibrationEvidenceClass, readonly L14CalibrationLowerLayerTargetClass[]>> = {
  [L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE]: [
    L14CalibrationLowerLayerTargetClass.L11_SCORE_FORMULA,
    L14CalibrationLowerLayerTargetClass.L11_SCORE_COMPONENT_WEIGHT_PROFILE,
  ],
  [L14CalibrationEvidenceClass.SCORE_CONFIDENCE_ACCURACY]: [
    L14CalibrationLowerLayerTargetClass.L11_SCORE_CONFIDENCE_RULE,
  ],
  [L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION]: [
    L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
  ],
  [L14CalibrationEvidenceClass.HYPOTHESIS_SUCCESS_RATE]: [
    L14CalibrationLowerLayerTargetClass.L10_HYPOTHESIS_FAMILY_INTERPRETATION,
  ],
  [L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN]: [
    L14CalibrationLowerLayerTargetClass.L10_HYPOTHESIS_FAMILY_INTERPRETATION,
    L14CalibrationLowerLayerTargetClass.L12_SCENARIO_TEMPLATE,
  ],
  [L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION]: [
    L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE,
    L14CalibrationLowerLayerTargetClass.L12_SCENARIO_TEMPLATE,
  ],
  [L14CalibrationEvidenceClass.TRIGGER_SIGNAL_VALUE]: [
    L14CalibrationLowerLayerTargetClass.L12_TRIGGER_RULE,
  ],
  [L14CalibrationEvidenceClass.INVALIDATION_SIGNAL_VALUE]: [
    L14CalibrationLowerLayerTargetClass.L12_INVALIDATION_RULE,
  ],
  [L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE]: [
    L14CalibrationLowerLayerTargetClass.L11_SCORE_FORMULA,
    L14CalibrationLowerLayerTargetClass.L12_SCENARIO_TEMPLATE,
  ],
  [L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS]: [
    L14CalibrationLowerLayerTargetClass.L13_ALERT_EXPRESSION_POLICY,
    L14CalibrationLowerLayerTargetClass.L14_DELIVERY_PRIORITY_POLICY,
    L14CalibrationLowerLayerTargetClass.L14_SUPPRESSION_POLICY,
  ],
  [L14CalibrationEvidenceClass.FEATURE_IMPORTANCE_BY_REGIME]: [
    L14CalibrationLowerLayerTargetClass.L11_SCORE_COMPONENT_WEIGHT_PROFILE,
  ],
};

export function buildL14CalibrationEvidenceClassPolicy(
  evidenceClass: L14CalibrationEvidenceClass,
): L14CalibrationEvidenceClassPolicy {
  const inputMode = L14_EVIDENCE_CLASS_INPUT_MODE[evidenceClass];
  const allowsBehavior =
    inputMode === L14CalibrationEvidenceInputMode.OUTCOME_PLUS_BEHAVIOR ||
    inputMode === L14CalibrationEvidenceInputMode.OUTCOME_BEHAVIOR_FEEDBACK;
  const allowsFeedback =
    inputMode === L14CalibrationEvidenceInputMode.OUTCOME_PLUS_FEEDBACK ||
    inputMode === L14CalibrationEvidenceInputMode.OUTCOME_BEHAVIOR_FEEDBACK;
  return {
    evidence_class: evidenceClass,
    allowed_subject_classes: ALLOWED_SUBJECTS_BY_CLASS[evidenceClass],
    input_mode: inputMode,
    minimum_sample_size_for_record: 1,
    minimum_sample_size_for_review: 100,
    minimum_sample_size_for_proposal_eligibility: 300,
    permits_behavioral_signals: allowsBehavior,
    permits_feedback_signals: allowsFeedback,
    permits_feature_attribution: evidenceClass === L14CalibrationEvidenceClass.FEATURE_IMPORTANCE_BY_REGIME,
    may_affect_lower_layer_targets: TARGETS_BY_CLASS[evidenceClass],
    policy_version: POLICY_V,
  };
}

export function isSubjectClassAllowed(
  evidenceClass: L14CalibrationEvidenceClass,
  subjectClass: L14CalibrationSubjectClass,
): boolean {
  return ALLOWED_SUBJECTS_BY_CLASS[evidenceClass].includes(subjectClass);
}

// ── Window resolver ───────────────────────────────────────────────

export function buildL14CalibrationEvidenceWindow(input: {
  window_class: L14CalibrationEvidenceWindowClass;
  window_start: string;
  window_end: string;
  includes_outcome_horizon_classes: readonly string[];
  fully_elapsed: boolean;
}): L14CalibrationEvidenceWindow {
  return {
    evidence_window_id: `l14.evidence.window.${fnv1a([
      input.window_class, input.window_start, input.window_end,
      input.includes_outcome_horizon_classes.slice().sort().join(','),
      String(input.fully_elapsed), POLICY_V,
    ].join('|'))}`,
    window_class: input.window_class,
    window_start: input.window_start,
    window_end: input.window_end,
    includes_outcome_horizon_classes: input.includes_outcome_horizon_classes,
    fully_elapsed: input.fully_elapsed,
    policy_version: POLICY_V,
  };
}

// ── Cohort builder ────────────────────────────────────────────────

export function buildL14CalibrationCohortDefinition(input: {
  evidence_class: L14CalibrationEvidenceClass;
  subject_class: L14CalibrationSubjectClass;
  subject_ref: string;
  included_regime_refs?: readonly string[];
  included_horizon_refs?: readonly string[];
  included_score_band_refs?: readonly string[];
  included_alert_class_refs?: readonly string[];
  inclusion_rules?: readonly L14CalibrationCohortRule[];
  exclusion_rules?: readonly L14CalibrationCohortRule[];
}): L14CalibrationCohortDefinition {
  const inclusion = input.inclusion_rules ?? [];
  const exclusion = input.exclusion_rules ?? [];
  return {
    cohort_definition_id: `l14.evidence.cohort.${fnv1a([
      input.evidence_class, input.subject_class, input.subject_ref,
      (input.included_regime_refs ?? []).slice().sort().join(','),
      (input.included_horizon_refs ?? []).slice().sort().join(','),
      (input.included_score_band_refs ?? []).slice().sort().join(','),
      (input.included_alert_class_refs ?? []).slice().sort().join(','),
      inclusion.map(r => `${r.rule_class}=${r.rule_value}`).sort().join(','),
      exclusion.map(r => `${r.rule_class}=${r.rule_value}`).sort().join(','),
      POLICY_V,
    ].join('|'))}`,
    evidence_class: input.evidence_class,
    subject_class: input.subject_class,
    subject_ref: input.subject_ref,
    included_regime_refs: input.included_regime_refs,
    included_horizon_refs: input.included_horizon_refs,
    included_score_band_refs: input.included_score_band_refs,
    included_alert_class_refs: input.included_alert_class_refs,
    inclusion_rules: inclusion,
    exclusion_rules: exclusion,
    policy_version: POLICY_V,
  };
}

// ── Metric computation ────────────────────────────────────────────

export function computeL14CalibrationMetric(input: {
  metric_name: L14CalibrationObservedMetric;
  numerator?: number;
  denominator?: number;
  baseline_value?: number;
}): L14CalibrationComputedMetric {
  let value = 0;
  let completeness = L14CalibrationMetricCompletenessClass.COMPLETE;
  if (input.denominator === undefined || input.numerator === undefined) {
    completeness = L14CalibrationMetricCompletenessClass.MISSING_REQUIRED_INPUT;
  } else if (input.denominator === 0) {
    completeness = L14CalibrationMetricCompletenessClass.PARTIAL_NOT_EVALUABLE;
  } else {
    value = input.numerator / input.denominator;
  }
  const delta = input.baseline_value !== undefined ? value - input.baseline_value : undefined;
  return {
    metric_id: `l14.evidence.metric.${fnv1a([
      input.metric_name, String(input.numerator ?? ''), String(input.denominator ?? ''), String(input.baseline_value ?? ''), POLICY_V,
    ].join('|'))}`,
    metric_name: input.metric_name,
    numerator: input.numerator,
    denominator: input.denominator,
    value,
    baseline_value: input.baseline_value,
    delta_vs_baseline: delta,
    metric_completeness_class: completeness,
  };
}

// ── Sample sufficiency ────────────────────────────────────────────

export function classifyL14SampleSufficiency(n: number): L14CalibrationSampleSufficiencyClass {
  if (n < 0) return L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT;
  if (n <= L14_SAMPLE_INSUFFICIENT_MAX) return L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT;
  if (n <= L14_SAMPLE_SMALL_MAX) return L14CalibrationSampleSufficiencyClass.SAMPLE_SMALL_DIRECTIONAL;
  if (n <= L14_SAMPLE_MODERATE_MAX) return L14CalibrationSampleSufficiencyClass.SAMPLE_MODERATE;
  if (n <= L14_SAMPLE_STRONG_MAX) return L14CalibrationSampleSufficiencyClass.SAMPLE_STRONG;
  return L14CalibrationSampleSufficiencyClass.SAMPLE_LARGE_STABLE;
}

// ── Aggregate computation builder ─────────────────────────────────

export function buildL14CalibrationAggregateComputation(input: {
  evidence_class: L14CalibrationEvidenceClass;
  subject_class: L14CalibrationSubjectClass;
  subject_ref: string;
  cohort_definition_ref: string;
  evidence_window_ref: string;
  source_outcome_evaluation_refs: readonly string[];
  source_behavior_refs?: readonly string[];
  source_feedback_refs?: readonly string[];
  computed_metrics: readonly L14CalibrationComputedMetric[];
  sample_size: number;
}): L14CalibrationAggregateComputation {
  const sufficiency = classifyL14SampleSufficiency(input.sample_size);
  const replayHash = fnv1a([
    input.evidence_class, input.subject_class, input.subject_ref,
    input.cohort_definition_ref, input.evidence_window_ref,
    input.source_outcome_evaluation_refs.slice().sort().join(','),
    String(input.sample_size),
    input.computed_metrics.map(m => m.metric_id).sort().join(','),
    POLICY_V,
  ].join('|'));
  return {
    aggregate_computation_id: `l14.evidence.aggregate.${replayHash}`,
    evidence_class: input.evidence_class,
    subject_class: input.subject_class,
    subject_ref: input.subject_ref,
    cohort_definition_ref: input.cohort_definition_ref,
    evidence_window_ref: input.evidence_window_ref,
    source_outcome_evaluation_refs: input.source_outcome_evaluation_refs,
    source_behavior_refs: input.source_behavior_refs ?? [],
    source_feedback_refs: input.source_feedback_refs ?? [],
    computed_metrics: input.computed_metrics,
    sample_size: input.sample_size,
    sample_sufficiency_class: sufficiency,
    lineage_refs: ['l14.evidence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Calibration finding builder ───────────────────────────────────

export function buildL14CalibrationFinding(input: {
  finding_class: L14CalibrationFindingClass;
  observed_metric: L14CalibrationObservedMetric;
  observed_value: number | string;
  comparison_baseline?: number | string;
  direction_of_concern?: L14CalibrationFindingDirection;
  severity_class: L14CalibrationFindingSeverity;
  interpretation: string;
  supporting_refs?: readonly string[];
  counterevidence_refs?: readonly string[];
}): L14CalibrationFinding {
  return {
    finding_id: `l14.evidence.finding.${fnv1a([
      input.finding_class, input.observed_metric, String(input.observed_value),
      String(input.comparison_baseline ?? ''), input.direction_of_concern ?? '',
      input.severity_class, POLICY_V,
    ].join('|'))}`,
    finding_class: input.finding_class,
    observed_metric: input.observed_metric,
    observed_value: input.observed_value,
    comparison_baseline: input.comparison_baseline,
    direction_of_concern: input.direction_of_concern,
    severity_class: input.severity_class,
    interpretation: input.interpretation,
    supporting_refs: input.supporting_refs ?? [],
    counterevidence_refs: input.counterevidence_refs ?? [],
    policy_version: POLICY_V,
  };
}

// ── Pattern detection (deterministic) ─────────────────────────────

export function detectL14CalibrationPatterns(
  metrics: readonly L14CalibrationComputedMetric[],
  thresholds?: Partial<Record<L14CalibrationObservedMetric, number>>,
): readonly L14CalibrationFinding[] {
  const t = thresholds ?? {};
  const findings: L14CalibrationFinding[] = [];
  for (const m of metrics) {
    const concern = t[m.metric_name];
    if (concern === undefined) continue;
    if (m.value >= concern) {
      let severity = L14CalibrationFindingSeverity.MATERIAL;
      if (m.value >= concern * 1.5) severity = L14CalibrationFindingSeverity.MAJOR;
      if (m.value >= concern * 2) severity = L14CalibrationFindingSeverity.CRITICAL;
      findings.push(buildL14CalibrationFinding({
        finding_class: metricToFindingClass(m.metric_name),
        observed_metric: m.metric_name,
        observed_value: m.value,
        comparison_baseline: concern,
        direction_of_concern: L14CalibrationFindingDirection.ABOVE_ALLOWED_RANGE,
        severity_class: severity,
        interpretation: `${m.metric_name} above concern band (${m.value} >= ${concern})`,
      }));
    }
  }
  return findings;
}

function metricToFindingClass(m: L14CalibrationObservedMetric): L14CalibrationFindingClass {
  switch (m) {
    case L14CalibrationObservedMetric.OUTCOME_ALIGNMENT_RATE: return L14CalibrationFindingClass.ALIGNMENT_RATE;
    case L14CalibrationObservedMetric.OUTCOME_MISALIGNMENT_RATE: return L14CalibrationFindingClass.MISALIGNMENT_RATE;
    case L14CalibrationObservedMetric.FALSE_POSITIVE_FREQUENCY: return L14CalibrationFindingClass.FALSE_POSITIVE_RATE;
    case L14CalibrationObservedMetric.FALSE_NEGATIVE_FREQUENCY: return L14CalibrationFindingClass.FALSE_NEGATIVE_RATE;
    case L14CalibrationObservedMetric.CONFIDENCE_OVERSTATEMENT_FREQUENCY: return L14CalibrationFindingClass.OVERCONFIDENCE_RATE;
    case L14CalibrationObservedMetric.CONFIDENCE_UNDERSTATEMENT_FREQUENCY: return L14CalibrationFindingClass.UNDERCONFIDENCE_RATE;
    case L14CalibrationObservedMetric.HYPOTHESIS_INVALIDATION_RATE: return L14CalibrationFindingClass.HYPOTHESIS_FAILURE_RATE;
    case L14CalibrationObservedMetric.SCENARIO_FAILURE_CONDITION_RATE: return L14CalibrationFindingClass.SCENARIO_PATH_FAILURE_RATE;
    case L14CalibrationObservedMetric.TRIGGER_DOWNSTREAM_EFFECT_RATE: return L14CalibrationFindingClass.TRIGGER_SIGNIFICANCE_RATE;
    case L14CalibrationObservedMetric.INVALIDATION_DOWNSTREAM_EFFECT_RATE: return L14CalibrationFindingClass.INVALIDATION_EFFECTIVENESS_RATE;
    case L14CalibrationObservedMetric.ALERT_IGNORE_RATE: return L14CalibrationFindingClass.ALERT_IGNORE_RATE;
    case L14CalibrationObservedMetric.ALERT_DEEPER_INVESTIGATION_RATE: return L14CalibrationFindingClass.ALERT_DEEPER_INVESTIGATION_RATE;
    case L14CalibrationObservedMetric.FEEDBACK_POSITIVE_RATE: return L14CalibrationFindingClass.POSITIVE_FEEDBACK_RATE;
    case L14CalibrationObservedMetric.FEEDBACK_NEGATIVE_RATE: return L14CalibrationFindingClass.NEGATIVE_FEEDBACK_RATE;
    case L14CalibrationObservedMetric.THRESHOLD_FIRING_RATE: return L14CalibrationFindingClass.THRESHOLD_EVENT_FREQUENCY;
    case L14CalibrationObservedMetric.THRESHOLD_NOISE_RATE: return L14CalibrationFindingClass.THRESHOLD_NOISE_RATIO;
    case L14CalibrationObservedMetric.FEATURE_CONTRIBUTION_ASSOCIATION: return L14CalibrationFindingClass.FEATURE_ASSOCIATION_STRENGTH;
    default: return L14CalibrationFindingClass.ALIGNMENT_RATE;
  }
}

// ── Performance attribution ──────────────────────────────────────

export function buildL14PerformanceAttributionFinding(input: {
  feature_or_component_ref: string;
  feature_label: string;
  associated_outcome_class: L14PerformanceAttributionOutcomeClass;
  support_count: number;
  counter_count: number;
  interpretation: string;
}): L14PerformanceAttributionFinding {
  const ratio = input.support_count / Math.max(1, input.support_count + input.counter_count);
  let strength: L14PerformanceAssociationStrength;
  if (input.support_count + input.counter_count < 30) {
    strength = L14PerformanceAssociationStrength.INCONCLUSIVE_ASSOCIATION;
  } else if (ratio >= 0.85) strength = L14PerformanceAssociationStrength.VERY_STRONG_ASSOCIATION;
  else if (ratio >= 0.7) strength = L14PerformanceAssociationStrength.STRONG_ASSOCIATION;
  else if (ratio >= 0.55) strength = L14PerformanceAssociationStrength.MODERATE_ASSOCIATION;
  else strength = L14PerformanceAssociationStrength.WEAK_ASSOCIATION;
  return {
    attribution_finding_id: `l14.evidence.attr.${fnv1a([
      input.feature_or_component_ref, input.associated_outcome_class,
      String(input.support_count), String(input.counter_count), POLICY_V,
    ].join('|'))}`,
    feature_or_component_ref: input.feature_or_component_ref,
    feature_label: input.feature_label,
    associated_outcome_class: input.associated_outcome_class,
    association_strength: strength,
    support_count: input.support_count,
    counter_count: input.counter_count,
    interpretation: input.interpretation,
    lineage_refs: ['l14.evidence.lineage'],
    policy_version: POLICY_V,
  };
}

export function buildL14PerformanceAttributionProfile(input: {
  subject_class: L14CalibrationSubjectClass;
  subject_ref: string;
  regime_ref?: string;
  horizon_ref?: string;
  positive_findings: readonly L14PerformanceAttributionFinding[];
  negative_findings: readonly L14PerformanceAttributionFinding[];
  attribution_method_class: L14PerformanceAttributionMethodClass;
  sample_size: number;
}): L14PerformanceAttributionProfile {
  const confidence = sampleToConfidence(input.sample_size);
  const replayHash = fnv1a([
    input.subject_class, input.subject_ref, input.regime_ref ?? '', input.horizon_ref ?? '',
    input.positive_findings.map(f => f.attribution_finding_id).sort().join(','),
    input.negative_findings.map(f => f.attribution_finding_id).sort().join(','),
    input.attribution_method_class, String(input.sample_size), POLICY_V,
  ].join('|'));
  return {
    performance_attribution_id: `l14.evidence.attribution.${replayHash}`,
    subject_class: input.subject_class,
    subject_ref: input.subject_ref,
    regime_ref: input.regime_ref,
    horizon_ref: input.horizon_ref,
    positive_association_findings: input.positive_findings,
    negative_association_findings: input.negative_findings,
    attribution_method_class: input.attribution_method_class,
    causal_claim_allowed: false,
    sample_size: input.sample_size,
    confidence_class: confidence,
    lineage_refs: ['l14.evidence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Alert usefulness composer ─────────────────────────────────────

export function composeL14AlertClassUsefulness(input: {
  alert_class_ref: string;
  regime_ref?: string;
  horizon_ref?: string;
  evaluated_alert_count: number;
  outcome_alignment_rate: number;
  false_positive_rate: number;
  open_rate?: number;
  ignore_rate?: number;
  deeper_investigation_rate?: number;
  positive_feedback_rate?: number;
  negative_feedback_rate?: number;
}): L14AlertClassUsefulnessProfile {
  let cls: L14AlertClassUsefulnessClass;
  const outcomeStrong = input.outcome_alignment_rate >= 0.6 && input.false_positive_rate <= 0.25;
  const outcomeWeak = input.outcome_alignment_rate < 0.4 || input.false_positive_rate > 0.4;
  const behaviorHigh = (input.deeper_investigation_rate ?? 0) >= 0.2 || (input.open_rate ?? 0) >= 0.4;
  const behaviorLow = (input.ignore_rate ?? 0) >= 0.5;
  if (input.evaluated_alert_count < 30) cls = L14AlertClassUsefulnessClass.INCONCLUSIVE_ALERT_CLASS;
  else if (outcomeStrong && behaviorHigh) cls = L14AlertClassUsefulnessClass.HIGH_VALUE_ALERT_CLASS;
  else if (outcomeStrong && !behaviorHigh) cls = L14AlertClassUsefulnessClass.OUTCOME_STRONG_BUT_UNDERENGAGED;
  else if (!outcomeStrong && behaviorHigh && outcomeWeak) cls = L14AlertClassUsefulnessClass.BEHAVIORALLY_ACTIVE_BUT_OUTCOME_WEAK;
  else if (outcomeWeak && behaviorLow) cls = L14AlertClassUsefulnessClass.LOW_VALUE_ALERT_CLASS;
  else cls = L14AlertClassUsefulnessClass.INCONCLUSIVE_ALERT_CLASS;
  const replayHash = fnv1a([
    input.alert_class_ref, input.regime_ref ?? '', input.horizon_ref ?? '',
    String(input.evaluated_alert_count), String(input.outcome_alignment_rate),
    String(input.false_positive_rate), String(input.open_rate ?? ''), String(input.ignore_rate ?? ''),
    String(input.deeper_investigation_rate ?? ''), String(input.positive_feedback_rate ?? ''),
    String(input.negative_feedback_rate ?? ''), cls, POLICY_V,
  ].join('|'));
  return {
    alert_usefulness_profile_id: `l14.evidence.alertuse.${replayHash}`,
    alert_class_ref: input.alert_class_ref,
    regime_ref: input.regime_ref,
    horizon_ref: input.horizon_ref,
    evaluated_alert_count: input.evaluated_alert_count,
    outcome_alignment_rate: input.outcome_alignment_rate,
    false_positive_rate: input.false_positive_rate,
    open_rate: input.open_rate,
    ignore_rate: input.ignore_rate,
    deeper_investigation_rate: input.deeper_investigation_rate,
    positive_feedback_rate: input.positive_feedback_rate,
    negative_feedback_rate: input.negative_feedback_rate,
    usefulness_class: cls,
    may_support_calibration_evidence: cls !== L14AlertClassUsefulnessClass.INCONCLUSIVE_ALERT_CLASS,
    lineage_refs: ['l14.evidence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Counterevidence detector ─────────────────────────────────────

export function detectL14Counterevidence(
  candidate: readonly L14CalibrationFinding[],
  alternate: readonly L14CalibrationFinding[],
): readonly string[] {
  // Counterevidence = a finding of the same class+metric but in OPPOSITE direction.
  const refs: string[] = [];
  for (const c of candidate) {
    for (const a of alternate) {
      if (a.finding_class === c.finding_class && a.observed_metric === c.observed_metric &&
          c.direction_of_concern && a.direction_of_concern && c.direction_of_concern !== a.direction_of_concern) {
        refs.push(a.finding_id);
      }
    }
  }
  return refs;
}

// ── Evidence confidence engine ───────────────────────────────────

function sampleToConfidence(n: number): L14CalibrationEvidenceConfidenceClass {
  const suf = classifyL14SampleSufficiency(n);
  switch (suf) {
    case L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT: return L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE;
    case L14CalibrationSampleSufficiencyClass.SAMPLE_SMALL_DIRECTIONAL: return L14CalibrationEvidenceConfidenceClass.LOW_CONFIDENCE_EVIDENCE;
    case L14CalibrationSampleSufficiencyClass.SAMPLE_MODERATE: return L14CalibrationEvidenceConfidenceClass.MODERATE_CONFIDENCE_EVIDENCE;
    case L14CalibrationSampleSufficiencyClass.SAMPLE_STRONG: return L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE;
    case L14CalibrationSampleSufficiencyClass.SAMPLE_LARGE_STABLE: return L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE;
  }
}

export function classifyL14EvidenceConfidence(input: {
  sample_size: number;
  counterevidence_present: boolean;
  metric_completeness_class: L14CalibrationMetricCompletenessClass;
}): L14CalibrationEvidenceConfidenceClass {
  let base = sampleToConfidence(input.sample_size);
  if (input.counterevidence_present) {
    // Downgrade one rung.
    base = downgrade(base);
  }
  if (input.metric_completeness_class === L14CalibrationMetricCompletenessClass.PARTIAL_NOT_EVALUABLE ||
      input.metric_completeness_class === L14CalibrationMetricCompletenessClass.MISSING_REQUIRED_INPUT) {
    base = L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE;
  }
  return base;
}

function downgrade(c: L14CalibrationEvidenceConfidenceClass): L14CalibrationEvidenceConfidenceClass {
  switch (c) {
    case L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE: return L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE;
    case L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE: return L14CalibrationEvidenceConfidenceClass.MODERATE_CONFIDENCE_EVIDENCE;
    case L14CalibrationEvidenceConfidenceClass.MODERATE_CONFIDENCE_EVIDENCE: return L14CalibrationEvidenceConfidenceClass.LOW_CONFIDENCE_EVIDENCE;
    default: return L14CalibrationEvidenceConfidenceClass.LOW_CONFIDENCE_EVIDENCE;
  }
}

// ── Review priority ──────────────────────────────────────────────

export function classifyL14ReviewPriority(input: {
  confidence_class: L14CalibrationEvidenceConfidenceClass;
  max_severity: L14CalibrationFindingSeverity;
  sample_sufficiency_class: L14CalibrationSampleSufficiencyClass;
  counterevidence_present: boolean;
}): L14CalibrationReviewPriority {
  if (input.confidence_class === L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE) return L14CalibrationReviewPriority.NO_REVIEW;
  if (input.sample_sufficiency_class === L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT) return L14CalibrationReviewPriority.NO_REVIEW;
  const isStrong =
    input.confidence_class === L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE ||
    input.confidence_class === L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE;
  if (input.max_severity === L14CalibrationFindingSeverity.CRITICAL && isStrong && !input.counterevidence_present) {
    return L14CalibrationReviewPriority.CRITICAL;
  }
  if ((input.max_severity === L14CalibrationFindingSeverity.MAJOR || input.max_severity === L14CalibrationFindingSeverity.CRITICAL) && isStrong) {
    return L14CalibrationReviewPriority.HIGH;
  }
  if (input.max_severity === L14CalibrationFindingSeverity.MATERIAL && isStrong) return L14CalibrationReviewPriority.MEDIUM;
  if (input.max_severity === L14CalibrationFindingSeverity.MINOR) return L14CalibrationReviewPriority.LOW;
  if (input.max_severity === L14CalibrationFindingSeverity.TRACE) return L14CalibrationReviewPriority.NO_REVIEW;
  return L14CalibrationReviewPriority.LOW;
}

// ── Proposal eligibility ─────────────────────────────────────────

export function classifyL14ProposalEligibility(input: {
  sample_size: number;
  confidence_class: L14CalibrationEvidenceConfidenceClass;
  review_priority: L14CalibrationReviewPriority;
  counterevidence_present: boolean;
  policy_minimum_sample: number;
}): L14CalibrationProposalEligibilityClass {
  if (input.counterevidence_present) return L14CalibrationProposalEligibilityClass.BLOCKED_CONTRADICTORY_EVIDENCE;
  if (input.sample_size < input.policy_minimum_sample) return L14CalibrationProposalEligibilityClass.NOT_ELIGIBLE_INSUFFICIENT_SAMPLE;
  if (input.confidence_class === L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE ||
      input.confidence_class === L14CalibrationEvidenceConfidenceClass.LOW_CONFIDENCE_EVIDENCE) {
    return L14CalibrationProposalEligibilityClass.NOT_ELIGIBLE_WEAK_SIGNAL;
  }
  if (input.review_priority === L14CalibrationReviewPriority.CRITICAL ||
      input.review_priority === L14CalibrationReviewPriority.HIGH) {
    return L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT;
  }
  if (input.review_priority === L14CalibrationReviewPriority.MEDIUM) {
    return L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY;
  }
  return L14CalibrationProposalEligibilityClass.NOT_ELIGIBLE_WEAK_SIGNAL;
}

// ── Lower-layer target ref builder ───────────────────────────────

export function buildL14CalibrationTargetRef(input: {
  target_layer: 'L10' | 'L11' | 'L12' | 'L13' | 'L14';
  target_class: L14CalibrationLowerLayerTargetClass;
  target_ref: string;
  why_affected: string;
}): L14CalibrationTargetRef {
  return {
    calibration_target_ref_id: `l14.evidence.target.${fnv1a([
      input.target_layer, input.target_class, input.target_ref, POLICY_V,
    ].join('|'))}`,
    target_layer: input.target_layer,
    target_class: input.target_class,
    target_ref: input.target_ref,
    why_affected: input.why_affected,
    mutation_allowed_in_l14_6: false,
    policy_version: POLICY_V,
  };
}

// ── Evidence record builder ──────────────────────────────────────

export interface L14CalibrationEvidenceRecordInput {
  readonly request: L14CalibrationEvidenceRequest;
  readonly horizon?: L14EvaluationHorizon;
  readonly aggregate: L14CalibrationAggregateComputation;
  readonly findings: readonly L14CalibrationFinding[];
  readonly performance_attribution?: L14PerformanceAttributionProfile;
  readonly counterevidence_refs?: readonly string[];
  readonly affected_targets: readonly L14CalibrationTargetRef[];
  readonly review_priority: L14CalibrationReviewPriority;
  readonly proposal_eligibility: L14CalibrationProposalEligibilityClass;
  readonly confidence_class: L14CalibrationEvidenceConfidenceClass;
  readonly observed_pattern_summary: string;
  readonly limitations?: readonly L14CalibrationEvidenceLimitation[];
}

export function buildL14CalibrationEvidenceRecord(
  input: L14CalibrationEvidenceRecordInput,
): L14CalibrationEvidenceRecord {
  const inputMode = L14_EVIDENCE_CLASS_INPUT_MODE[input.request.evidence_class];
  const replayHash = fnv1a([
    input.request.calibration_evidence_request_id,
    input.aggregate.aggregate_computation_id,
    input.findings.map(f => f.finding_id).sort().join(','),
    input.performance_attribution?.performance_attribution_id ?? '',
    (input.counterevidence_refs ?? []).slice().sort().join(','),
    input.affected_targets.map(t => t.calibration_target_ref_id).sort().join(','),
    input.review_priority, input.proposal_eligibility, input.confidence_class,
    input.observed_pattern_summary, POLICY_V,
  ].join('|'));
  return {
    calibration_evidence_id: `l14.evidence.${replayHash}`,
    evidence_class: input.request.evidence_class,
    subject_class: input.request.subject_class,
    subject_ref: input.request.subject_ref,
    regime_ref: input.request.regime_ref,
    horizon: input.horizon,
    sample_size: input.aggregate.sample_size,
    sample_sufficiency_class: input.aggregate.sample_sufficiency_class,
    confidence_class: input.confidence_class,
    observed_pattern_summary: input.observed_pattern_summary,
    structured_findings: input.findings,
    performance_attribution_ref: input.performance_attribution?.performance_attribution_id,
    supporting_aggregate_refs: [input.aggregate.aggregate_computation_id],
    counterevidence_refs: input.counterevidence_refs ?? [],
    affected_lower_layer_targets: input.affected_targets,
    recommended_review_priority: input.review_priority,
    proposal_eligibility: input.proposal_eligibility,
    interpretation_limitations: input.limitations ?? [],
    input_mode: inputMode,
    lineage_refs: ['l14.evidence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
