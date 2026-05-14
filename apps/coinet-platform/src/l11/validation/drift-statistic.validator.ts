/**
 * L11.7 — Drift statistic validator (§11.7.9)
 *
 * Validates one or more `L11DriftStatistic` instances against
 * the structural / consistency / sample-size laws.
 */

import {
  L11DriftStatistic,
  ALL_L11_DRIFT_STATISTIC_TYPES,
  ALL_L11_DRIFT_THRESHOLD_DIRECTIONS,
  L11DriftStatisticConfidenceClass,
  computeL11DriftStatisticPassed,
  isL11DriftStatisticSampleSufficient,
  isL11DriftStatisticConfidenceSufficient,
} from '../contracts/drift-statistic';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';

export function validateL11DriftStatistic(
  s: L11DriftStatistic,
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  const ref = s.statistic_id;
  if (!s.statistic_type ||
      !ALL_L11_DRIFT_STATISTIC_TYPES.includes(s.statistic_type)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_STATISTIC_TYPE_UNKNOWN,
      `statistic_type ${s.statistic_type} is not registered`,
      { statistic_id: ref }));
  }
  if (!Number.isFinite(s.statistic_value)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_STATISTIC_VALUE_INVALID,
      'statistic_value is not finite',
      { statistic_id: ref }));
  }
  if (!Number.isFinite(s.threshold_value)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_STATISTIC_THRESHOLD_INVALID,
      'threshold_value is not finite',
      { statistic_id: ref }));
  }
  if (!s.threshold_direction ||
      !ALL_L11_DRIFT_THRESHOLD_DIRECTIONS.includes(s.threshold_direction)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_STATISTIC_DIRECTION_MISSING,
      'threshold_direction missing or unknown',
      { statistic_id: ref }));
  }
  if (!Number.isFinite(s.sample_size) || s.sample_size < 0) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_SAMPLE_SIZE_INVALID,
      'sample_size missing or negative',
      { statistic_id: ref }));
  }
  if (!Number.isFinite(s.minimum_sample_size) ||
      s.minimum_sample_size <= 0) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_SAMPLE_SIZE_INVALID,
      'minimum_sample_size missing or non-positive',
      { statistic_id: ref }));
  }
  if (!s.confidence_class) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_CONFIDENCE_CLASS_MISSING,
      'confidence_class missing',
      { statistic_id: ref }));
  }
  // Passed-threshold consistency.
  if (Number.isFinite(s.statistic_value) &&
      Number.isFinite(s.threshold_value) && s.threshold_direction) {
    const expected = computeL11DriftStatisticPassed(
      s.statistic_value, s.threshold_value, s.threshold_direction);
    if (expected !== s.passed_threshold) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_STATISTIC_PASSED_INCONSISTENT,
        `passed_threshold=${s.passed_threshold} but expected=${expected}`,
        { statistic_id: ref }));
    }
  }
  // Sample-size + confidence consistency.
  const sampleOk = isL11DriftStatisticSampleSufficient(s);
  if (!sampleOk) {
    if (s.confidence_class &&
        s.confidence_class !== L11DriftStatisticConfidenceClass.INSUFFICIENT_SAMPLE &&
        isL11DriftStatisticConfidenceSufficient(s.confidence_class)) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_CONFIDENCE_CLASS_INCONSISTENT_WITH_SAMPLE,
        'sample below minimum but confidence_class claims MODERATE/HIGH',
        { statistic_id: ref }));
    }
  }
  return issues;
}
