/**
 * L11.6 — Outcome Metric Validator (§11.6.7.3)
 */

import {
  L11OutcomeMetric,
  ALL_L11_OUTCOME_METRICS,
  getL11OutcomeMetricDefinition,
  isL11OutcomeMetricLegalForFamily,
  isL11OutcomeMetricLegalForHorizon,
} from '../contracts/outcome-metric';
import { L11ScoreFamily } from '../contracts/score-family';
import { L11CalibrationHorizon } from '../contracts/calibration-horizon';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from './l11-calibration-violation-codes';

export function validateL11OutcomeMetricForFamily(
  metric: L11OutcomeMetric,
  family: L11ScoreFamily,
  horizon: L11CalibrationHorizon,
  ctx: { target_id?: string } = {},
): readonly L11CalibrationIssue[] {
  const issues: L11CalibrationIssue[] = [];

  if (!metric) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_OUTCOME_METRIC_MISSING,
      'outcome_metric absent', ctx));
    return issues;
  }
  if (!ALL_L11_OUTCOME_METRICS.includes(metric)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_OUTCOME_METRIC_UNSUPPORTED,
      `unknown outcome metric ${metric}`,
      { ...ctx, metric }));
    return issues;
  }
  const def = getL11OutcomeMetricDefinition(metric);
  if (!def) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_OUTCOME_METRIC_UNSUPPORTED,
      `metric ${metric} has no registered definition`,
      { ...ctx, metric }));
    return issues;
  }
  if (!def.measurement_source) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_OUTCOME_METRIC_LACKS_MEASUREMENT_SOURCE,
      `metric ${metric} lacks measurement_source`,
      { ...ctx, metric }));
  }
  if (def.required_future_data_surface_refs.length === 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_OUTCOME_METRIC_LACKS_FUTURE_DATA_SURFACE,
      `metric ${metric} requires no future data surface`,
      { ...ctx, metric }));
  }
  if (!isL11OutcomeMetricLegalForFamily(metric, family)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_OUTCOME_METRIC_NOT_ALLOWED_FOR_FAMILY,
      `metric ${metric} not allowed for family ${family}`,
      { ...ctx, metric, score_family: family }));
  }
  if (!isL11OutcomeMetricLegalForHorizon(metric, horizon)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HORIZON_UNSUPPORTED_FOR_METRIC,
      `metric ${metric} does not support horizon ${horizon}`,
      { ...ctx, metric }));
  }
  return issues;
}
