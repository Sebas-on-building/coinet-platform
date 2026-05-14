/**
 * L11.6 — Calibration Exclusion Validator (§11.6.10.4)
 */

import {
  L11CalibrationExclusionRule,
  ALL_L11_CALIBRATION_EXCLUSION_CLASSES,
  getMissingRequiredExclusionClasses,
  isL11CalibrationExclusionRuleStructurallyValid,
} from '../contracts/calibration-exclusion';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from './l11-calibration-violation-codes';

export function validateL11CalibrationExclusionRule(
  r: L11CalibrationExclusionRule,
  ctx: { target_id?: string } = {},
): readonly L11CalibrationIssue[] {
  const issues: L11CalibrationIssue[] = [];
  if (!ALL_L11_CALIBRATION_EXCLUSION_CLASSES.includes(r.exclusion_class)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_EXCLUSION_CLASS_UNKNOWN,
      `unknown exclusion_class ${r.exclusion_class}`,
      { ...ctx, exclusion_rule_id: r.exclusion_rule_id }));
  }
  if (!r.policy_version) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_EXCLUSION_RULE_NOT_VERSIONED,
      `exclusion rule ${r.exclusion_rule_id} missing policy_version`,
      { ...ctx, exclusion_rule_id: r.exclusion_rule_id }));
  }
  const sv = isL11CalibrationExclusionRuleStructurallyValid(r);
  if (!sv.ok && sv.reason.includes('bias')) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_EXCLUSION_CAUSES_SURVIVORSHIP_BIAS,
      sv.reason, { ...ctx, exclusion_rule_id: r.exclusion_rule_id }));
  }
  return issues;
}

export function validateL11CalibrationExclusionRuleSet(
  rules: readonly L11CalibrationExclusionRule[],
  ctx: { target_id?: string } = {},
): readonly L11CalibrationIssue[] {
  const issues: L11CalibrationIssue[] = [];
  if (!rules || rules.length === 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_EXCLUSION_RULES_MISSING,
      'exclusion_rules array missing or empty', ctx));
    return issues;
  }
  for (const r of rules) {
    issues.push(...validateL11CalibrationExclusionRule(r, ctx));
  }
  const missing = getMissingRequiredExclusionClasses(rules);
  for (const c of missing) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_REQUIRED_EXCLUSION_CLASS_MISSING,
      `required production exclusion class ${c} not present`,
      ctx));
  }
  return issues;
}
