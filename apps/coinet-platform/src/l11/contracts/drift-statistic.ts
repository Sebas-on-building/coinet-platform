/**
 * L11.7 — Drift Statistic (§11.7.9)
 *
 * Single-statistic record carried inside a drift report, with
 * threshold direction, sample-size sufficiency, and confidence
 * class.
 */

export enum L11DriftStatisticType {
  MEAN_SHIFT = 'MEAN_SHIFT',
  MEDIAN_SHIFT = 'MEDIAN_SHIFT',
  STDDEV_SHIFT = 'STDDEV_SHIFT',
  PSI = 'PSI',
  KL_DIVERGENCE = 'KL_DIVERGENCE',
  KS_DISTANCE = 'KS_DISTANCE',
  CORRELATION_DELTA = 'CORRELATION_DELTA',
  AUC_DELTA = 'AUC_DELTA',
  BAND_FREQUENCY_SHIFT = 'BAND_FREQUENCY_SHIFT',
  THRESHOLD_BREACH_RATE_DELTA = 'THRESHOLD_BREACH_RATE_DELTA',
  TOP_DRIVER_FREQUENCY_SHIFT = 'TOP_DRIVER_FREQUENCY_SHIFT',
  MISSING_DATA_RATE_SHIFT = 'MISSING_DATA_RATE_SHIFT',
}

export const ALL_L11_DRIFT_STATISTIC_TYPES:
  readonly L11DriftStatisticType[] = Object.values(L11DriftStatisticType);

export enum L11DriftStatisticConfidenceClass {
  INSUFFICIENT_SAMPLE = 'INSUFFICIENT_SAMPLE',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  MODERATE_CONFIDENCE = 'MODERATE_CONFIDENCE',
  HIGH_CONFIDENCE = 'HIGH_CONFIDENCE',
}

export const ALL_L11_DRIFT_STATISTIC_CONFIDENCE_CLASSES:
  readonly L11DriftStatisticConfidenceClass[] =
  Object.values(L11DriftStatisticConfidenceClass);

/**
 * Direction in which the statistic *must* be evaluated:
 *  - GREATER_THAN: passes when value > threshold (e.g., PSI > 0.2)
 *  - LESS_THAN:    passes when value < threshold
 *  - ABSOLUTE_GREATER_THAN: passes when |value| > threshold
 */
export enum L11DriftThresholdDirection {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  ABSOLUTE_GREATER_THAN = 'ABSOLUTE_GREATER_THAN',
}

export const ALL_L11_DRIFT_THRESHOLD_DIRECTIONS:
  readonly L11DriftThresholdDirection[] =
  Object.values(L11DriftThresholdDirection);

export interface L11DriftStatistic {
  readonly statistic_id: string;
  readonly statistic_type: L11DriftStatisticType;
  readonly statistic_value: number;
  readonly threshold_value: number;
  readonly threshold_direction: L11DriftThresholdDirection;
  readonly passed_threshold: boolean;
  readonly sample_size: number;
  readonly minimum_sample_size: number;
  readonly confidence_class: L11DriftStatisticConfidenceClass;
  readonly policy_version: string;
}

/**
 * §11.7.9.4 — Compute the *expected* `passed_threshold` value
 * deterministically, used by validators to detect tampered or
 * inconsistent statistics.
 */
export function computeL11DriftStatisticPassed(
  value: number,
  threshold: number,
  direction: L11DriftThresholdDirection,
): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(threshold)) return false;
  switch (direction) {
    case L11DriftThresholdDirection.GREATER_THAN:
      return value > threshold;
    case L11DriftThresholdDirection.LESS_THAN:
      return value < threshold;
    case L11DriftThresholdDirection.ABSOLUTE_GREATER_THAN:
      return Math.abs(value) > Math.abs(threshold);
  }
}

export function isL11DriftStatisticConfidenceSufficient(
  c: L11DriftStatisticConfidenceClass,
): boolean {
  return c === L11DriftStatisticConfidenceClass.MODERATE_CONFIDENCE ||
    c === L11DriftStatisticConfidenceClass.HIGH_CONFIDENCE;
}

/**
 * §11.7.9.4 — Sample-size sufficiency. A stat with
 * `sample_size < minimum_sample_size` *must* be tagged
 * `INSUFFICIENT_SAMPLE`; a stat with sufficient sample may be
 * MODERATE / HIGH.
 */
export function isL11DriftStatisticSampleSufficient(
  s: Pick<L11DriftStatistic, 'sample_size' | 'minimum_sample_size'>,
): boolean {
  return Number.isFinite(s.sample_size) &&
    Number.isFinite(s.minimum_sample_size) &&
    s.sample_size > 0 &&
    s.minimum_sample_size > 0 &&
    s.sample_size >= s.minimum_sample_size;
}

export function isL11DriftStatisticStructurallyValid(
  s: L11DriftStatistic,
): { ok: boolean; reason: string } {
  if (!s.statistic_id) return { ok: false, reason: 'statistic_id missing' };
  if (!s.statistic_type) return { ok: false, reason: 'statistic_type missing' };
  if (!Number.isFinite(s.statistic_value)) {
    return { ok: false, reason: 'statistic_value not finite' };
  }
  if (!Number.isFinite(s.threshold_value)) {
    return { ok: false, reason: 'threshold_value not finite' };
  }
  if (!s.threshold_direction) {
    return { ok: false, reason: 'threshold_direction missing' };
  }
  if (!Number.isFinite(s.sample_size) || s.sample_size < 0) {
    return { ok: false, reason: 'sample_size invalid' };
  }
  if (!Number.isFinite(s.minimum_sample_size) || s.minimum_sample_size <= 0) {
    return { ok: false, reason: 'minimum_sample_size missing or non-positive' };
  }
  if (!s.confidence_class) {
    return { ok: false, reason: 'confidence_class missing' };
  }
  if (!s.policy_version) return { ok: false, reason: 'policy_version missing' };
  const expectedPassed = computeL11DriftStatisticPassed(
    s.statistic_value, s.threshold_value, s.threshold_direction);
  if (expectedPassed !== s.passed_threshold) {
    return {
      ok: false,
      reason: `passed_threshold ${s.passed_threshold} != expected ${expectedPassed}`,
    };
  }
  if (!isL11DriftStatisticSampleSufficient(s) &&
      isL11DriftStatisticConfidenceSufficient(s.confidence_class)) {
    return {
      ok: false,
      reason: 'insufficient sample but confidence class claims MODERATE/HIGH',
    };
  }
  return { ok: true, reason: 'ok' };
}
