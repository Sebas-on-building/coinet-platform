/**
 * L11.4 — Cap Contribution Validator (§11.4.6.2 / §11.4.6.3)
 */

import {
  L11CapContribution,
  L11FormulaEvaluationResult,
  L11AttributionMaterialityClass,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';

export interface L11CapContributionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreAttributionIssue[];
}

export function validateL11CapContribution(
  c: L11CapContribution,
): L11CapContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  if (!c.cap_rule_id) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_CAP_CONTRIBUTION_INVALID,
      'cap_rule_id missing', { contribution_id: c.cap_contribution_id }));
  }
  if (!c.cap_reason_code) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_CAP_CONTRIBUTION_INVALID,
      'cap_reason_code missing', { contribution_id: c.cap_contribution_id }));
  }
  if (!Number.isFinite(c.cap_value) || !Number.isFinite(c.cap_effect_magnitude)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_CAP_CONTRIBUTION_INVALID,
      'cap numeric fields must be finite', { contribution_id: c.cap_contribution_id }));
  }
  if (c.triggered_by_refs.length === 0) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_CAP_CONTRIBUTION_INVALID,
      'triggered_by_refs must be non-empty',
      { contribution_id: c.cap_contribution_id }));
  }
  return { ok: issues.length === 0, issues };
}

export interface ValidateCapCoverageArgs {
  readonly cap_contributions: readonly L11CapContribution[];
  readonly evaluation: L11FormulaEvaluationResult;
}

/**
 * §11.4.6.2 — every applied cap from the formula evaluation must
 * have a corresponding cap contribution.
 */
export function validateL11CapAttributionCoverage(
  args: ValidateCapCoverageArgs,
): L11CapContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  const attributedCapRules = new Set(args.cap_contributions.map(c => c.cap_rule_id));
  for (const ac of args.evaluation.applied_caps) {
    if (!attributedCapRules.has(ac.cap_rule_id)) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_CAP_APPLIED_BUT_NOT_ATTRIBUTED,
        `applied cap ${ac.cap_rule_id} has no contribution`));
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateL11CapContributions(
  cs: readonly L11CapContribution[],
): L11CapContributionValidationResult {
  const all: L11ScoreAttributionIssue[] = [];
  for (const c of cs) all.push(...validateL11CapContribution(c).issues);
  return { ok: all.length === 0, issues: all };
}

/**
 * §11.4.6.3 — material caps must surface in negative driver refs
 * and explanatory summary codes.
 */
export interface ValidateCapVisibilityArgs {
  readonly cap_contributions: readonly L11CapContribution[];
  readonly negative_driver_refs: readonly string[];
}

export function validateL11MaterialCapVisibility(
  args: ValidateCapVisibilityArgs,
): L11CapContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  for (const c of args.cap_contributions) {
    if (c.materiality_class !== L11AttributionMaterialityClass.CRITICAL &&
        c.materiality_class !== L11AttributionMaterialityClass.MAJOR &&
        c.materiality_class !== L11AttributionMaterialityClass.MATERIAL) {
      continue;
    }
    const expectedRef = `l11a.driver.cap.${c.cap_contribution_id}`;
    if (!args.negative_driver_refs.includes(expectedRef)) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MATERIAL_CAP_HIDDEN,
        `material cap ${c.cap_rule_id} not in negative driver refs`,
        { contribution_id: c.cap_contribution_id }));
    }
  }
  return { ok: issues.length === 0, issues };
}
