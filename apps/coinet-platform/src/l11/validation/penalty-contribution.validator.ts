/**
 * L11.4 — Penalty Contribution Validator (§11.4.7.2)
 */

import {
  L11PenaltyContribution,
  L11FormulaEvaluationResult,
  L11ContributionDirection,
  L11ScoreFamily,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';

export interface L11PenaltyContributionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreAttributionIssue[];
}

const RISK_DIRECTIONS: ReadonlySet<L11ScoreFamilyDirectionClass> = new Set([
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_SUPPLY_RISK,
]);

function isRiskFamily(family: L11ScoreFamily): boolean {
  return RISK_DIRECTIONS.has(L11_REQUIRED_DIRECTION_BY_FAMILY[family]);
}

export function validateL11PenaltyContribution(
  c: L11PenaltyContribution,
): L11PenaltyContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  if (!c.penalty_rule_id) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_PENALTY_CONTRIBUTION_INVALID,
      'penalty_rule_id missing', { contribution_id: c.penalty_contribution_id }));
  }
  if (!c.penalty_reason_code) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_PENALTY_CONTRIBUTION_INVALID,
      'penalty_reason_code missing', { contribution_id: c.penalty_contribution_id }));
  }
  if (!Number.isFinite(c.score_effect) || !Number.isFinite(c.penalty_magnitude)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_PENALTY_CONTRIBUTION_INVALID,
      'penalty numeric fields must be finite',
      { contribution_id: c.penalty_contribution_id }));
  }
  if (c.affected_component_refs.length === 0) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_PENALTY_CONTRIBUTION_INVALID,
      'affected_component_refs must be non-empty',
      { contribution_id: c.penalty_contribution_id }));
  }
  // Direction sanity vs family direction
  if (isRiskFamily(c.score_family)) {
    if (c.contribution_direction !== L11ContributionDirection.INCREASES_RISK_SCORE &&
        c.contribution_direction !== L11ContributionDirection.CAPS_SCORE) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_PENALTY_DIRECTION_INCONSISTENT,
        `penalty in risk family must increase risk or cap`,
        { contribution_id: c.penalty_contribution_id }));
    }
  } else {
    if (c.contribution_direction !== L11ContributionDirection.LOWERS_SCORE &&
        c.contribution_direction !== L11ContributionDirection.CAPS_SCORE) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_PENALTY_DIRECTION_INCONSISTENT,
        `penalty in constructive family must lower or cap`,
        { contribution_id: c.penalty_contribution_id }));
    }
  }
  return { ok: issues.length === 0, issues };
}

export interface ValidatePenaltyCoverageArgs {
  readonly penalty_contributions: readonly L11PenaltyContribution[];
  readonly evaluation: L11FormulaEvaluationResult;
}

export function validateL11PenaltyAttributionCoverage(
  args: ValidatePenaltyCoverageArgs,
): L11PenaltyContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  const attributedRules = new Set(args.penalty_contributions.map(c => c.penalty_rule_id));
  for (const ap of args.evaluation.applied_penalties) {
    if (!attributedRules.has(ap.penalty_rule_id)) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_PENALTY_APPLIED_BUT_NOT_ATTRIBUTED,
        `applied penalty ${ap.penalty_rule_id} has no contribution`));
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateL11PenaltyContributions(
  cs: readonly L11PenaltyContribution[],
): L11PenaltyContributionValidationResult {
  const all: L11ScoreAttributionIssue[] = [];
  for (const c of cs) all.push(...validateL11PenaltyContribution(c).issues);
  return { ok: all.length === 0, issues: all };
}
