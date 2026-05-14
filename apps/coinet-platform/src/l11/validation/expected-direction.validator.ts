/**
 * L11.6 — Expected Direction Validator (§11.6.8.3)
 */

import {
  L11ExpectedOutcomeDirection,
  isL11ExpectedDirectionCompatible,
  isL11CalibrationDescriptionCausalityFree,
} from '../contracts/expected-direction';
import { L11ScoreFamily } from '../contracts/score-family';
import { L11OutcomeMetric } from '../contracts/outcome-metric';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from './l11-calibration-violation-codes';

export function validateL11ExpectedDirection(
  family: L11ScoreFamily,
  metric: L11OutcomeMetric,
  direction: L11ExpectedOutcomeDirection,
  ctx: { target_id?: string } = {},
): readonly L11CalibrationIssue[] {
  const issues: L11CalibrationIssue[] = [];
  if (!direction) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_EXPECTED_DIRECTION_MISSING,
      'expected_direction missing', ctx));
    return issues;
  }
  if (direction === L11ExpectedOutcomeDirection.FAMILY_DEFINED) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_EXPECTED_DIRECTION_NOT_PRODUCTION_LEGAL,
      'FAMILY_DEFINED is not a production direction', ctx));
    return issues;
  }
  const compat = isL11ExpectedDirectionCompatible(family, metric, direction);
  if (!compat.ok) {
    const code = compat.reason.includes('metric')
      ? L11CalibrationViolationCode.L11C_EXPECTED_DIRECTION_CONTRADICTS_OUTCOME_METRIC
      : L11CalibrationViolationCode.L11C_EXPECTED_DIRECTION_CONTRADICTS_SCORE_MEANING;
    issues.push(makeL11CalibrationIssue(code, compat.reason,
      { ...ctx, score_family: family, metric }));
  }
  return issues;
}

/**
 * §11.6.8.3 + §11.6.3 — Calibration descriptions may not imply
 * causality, judgment, or action.
 */
export function validateL11CalibrationDescription(
  description: string,
  ctx: { target_id?: string } = {},
): readonly L11CalibrationIssue[] {
  const issues: L11CalibrationIssue[] = [];
  if (!description || description.trim().length === 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_TARGET_DESCRIPTION_MISSING,
      'description missing', ctx));
    return issues;
  }
  const causal = isL11CalibrationDescriptionCausalityFree(description);
  if (!causal.ok) {
    const lower = causal.reason.toLowerCase();
    if (/buy|sell|long|short|enter|exit|trade/.test(lower)) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_CALIBRATION_ACTS_AS_JUDGMENT,
        causal.reason, ctx));
    } else {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_CALIBRATION_IMPLIES_CAUSALITY,
        causal.reason, ctx));
    }
  }
  return issues;
}
