/**
 * L13.10 — Output Quality Metric Contract
 *
 * §13.10.22 / §13.10.23 / §13.10.24 — Precisely-defined metric
 * classes with numerator/denominator semantics. Distinguishes
 * satisfaction proxies from adjudicated correctness (§13.10.23).
 */

export enum L13OutputQualityMetricClass {
  GROUNDEDNESS_RATE = 'GROUNDEDNESS_RATE',
  CONTRADICTION_DISCLOSURE_RATE = 'CONTRADICTION_DISCLOSURE_RATE',
  UNSUPPORTED_CLAIM_ATTEMPT_RATE = 'UNSUPPORTED_CLAIM_ATTEMPT_RATE',
  UNSUPPORTED_CLAIM_EMISSION_RATE = 'UNSUPPORTED_CLAIM_EMISSION_RATE',
  OUTPUT_USEFULNESS_SCORE = 'OUTPUT_USEFULNESS_SCORE',
  USER_CORRECTION_RATE = 'USER_CORRECTION_RATE',
  ANSWER_LENGTH_SATISFACTION_RATE = 'ANSWER_LENGTH_SATISFACTION_RATE',
  SAFETY_REWRITE_RATE = 'SAFETY_REWRITE_RATE',
  REFUSAL_SATISFACTION_PROXY = 'REFUSAL_SATISFACTION_PROXY',
  REFUSAL_CORRECTNESS_ADJUDICATED = 'REFUSAL_CORRECTNESS_ADJUDICATED',
  HALLUCINATION_INCIDENT_COUNT = 'HALLUCINATION_INCIDENT_COUNT',
  EVIDENCE_COVERAGE_RATE = 'EVIDENCE_COVERAGE_RATE',
}

export const ALL_L13_OUTPUT_QUALITY_METRIC_CLASSES:
  readonly L13OutputQualityMetricClass[] =
  Object.values(L13OutputQualityMetricClass);

/**
 * Classes that may derive from raw feedback (satisfaction proxies).
 * Adjudicated-correctness classes require explicit review labels.
 */
const SATISFACTION_PROXY = new Set<L13OutputQualityMetricClass>([
  L13OutputQualityMetricClass.OUTPUT_USEFULNESS_SCORE,
  L13OutputQualityMetricClass.USER_CORRECTION_RATE,
  L13OutputQualityMetricClass.ANSWER_LENGTH_SATISFACTION_RATE,
  L13OutputQualityMetricClass.REFUSAL_SATISFACTION_PROXY,
]);

const ADJUDICATED = new Set<L13OutputQualityMetricClass>([
  L13OutputQualityMetricClass.REFUSAL_CORRECTNESS_ADJUDICATED,
  L13OutputQualityMetricClass.HALLUCINATION_INCIDENT_COUNT,
]);

export function l13IsSatisfactionProxyMetric(
  cls: L13OutputQualityMetricClass,
): boolean {
  return SATISFACTION_PROXY.has(cls);
}

export function l13IsAdjudicatedMetric(
  cls: L13OutputQualityMetricClass,
): boolean {
  return ADJUDICATED.has(cls);
}

export enum L13QualityEvaluationWindow {
  PER_OUTPUT = 'PER_OUTPUT',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ROLLING_24H = 'ROLLING_24H',
  ROLLING_7D = 'ROLLING_7D',
  ROLLING_30D = 'ROLLING_30D',
}

export const ALL_L13_QUALITY_EVALUATION_WINDOWS:
  readonly L13QualityEvaluationWindow[] =
  Object.values(L13QualityEvaluationWindow);

export enum L13MetricConfidenceClass {
  CONFIDENT = 'CONFIDENT',
  PROVISIONAL_LOW_SAMPLE = 'PROVISIONAL_LOW_SAMPLE',
  PROXY_ONLY = 'PROXY_ONLY',
  ADJUDICATED = 'ADJUDICATED',
}

export const ALL_L13_METRIC_CONFIDENCE_CLASSES:
  readonly L13MetricConfidenceClass[] =
  Object.values(L13MetricConfidenceClass);

export enum L13MetricStatus {
  METRIC_CLEAN = 'METRIC_CLEAN',
  METRIC_FLAG_REVIEW = 'METRIC_FLAG_REVIEW',
  METRIC_INVALID_DENOMINATOR = 'METRIC_INVALID_DENOMINATOR',
  METRIC_DEFERRED = 'METRIC_DEFERRED',
}

export const ALL_L13_METRIC_STATUSES:
  readonly L13MetricStatus[] =
  Object.values(L13MetricStatus);

export interface L13OutputQualityMetric {
  readonly output_quality_metric_id: string;
  readonly metric_class: L13OutputQualityMetricClass;
  readonly metric_window: L13QualityEvaluationWindow;
  readonly scope_type?: string;
  readonly scope_id?: string;
  readonly answer_mode?: string;
  readonly output_class?: string;
  readonly numerator: number;
  readonly denominator: number;
  readonly metric_value: number;
  readonly metric_confidence_class: L13MetricConfidenceClass;
  readonly metric_status: L13MetricStatus;
  readonly derived_from_fact_refs: readonly string[];
  readonly created_at: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
