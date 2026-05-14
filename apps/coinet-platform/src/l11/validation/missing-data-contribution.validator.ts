/**
 * L11.4 — Missing-Data Contribution Validator (§11.4.9.3)
 */

import {
  L11MissingDataContribution,
  L11FormulaEvaluationResult,
  L11AttributionMaterialityClass,
  L11AttributionDriverClass,
  L11MissingDataBehaviorClass,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';

export interface L11MissingDataContributionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreAttributionIssue[];
}

export function validateL11MissingDataContribution(
  c: L11MissingDataContribution,
): L11MissingDataContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  if (!c.missing_input_ref) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MISSING_DATA_CONTRIBUTION_INVALID,
      'missing_input_ref missing',
      { contribution_id: c.missing_data_contribution_id }));
  }
  if (!c.missing_input_class) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MISSING_DATA_CONTRIBUTION_INVALID,
      'missing_input_class missing',
      { contribution_id: c.missing_data_contribution_id }));
  }
  if (!c.missing_data_behavior) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MISSING_DATA_CONTRIBUTION_INVALID,
      'missing_data_behavior missing',
      { contribution_id: c.missing_data_contribution_id }));
  }
  if (!Number.isFinite(c.score_effect) || !Number.isFinite(c.confidence_effect)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MISSING_DATA_CONTRIBUTION_INVALID,
      'score_effect and confidence_effect must be finite',
      { contribution_id: c.missing_data_contribution_id }));
  }
  if (c.driver_class !== L11AttributionDriverClass.MISSING_DATA_DRIVER) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MISSING_DATA_CONTRIBUTION_INVALID,
      'driver_class must be MISSING_DATA_DRIVER',
      { contribution_id: c.missing_data_contribution_id }));
  }
  if (
    (c.missing_data_behavior === L11MissingDataBehaviorClass.BLOCK_SCORE ||
     c.missing_data_behavior === L11MissingDataBehaviorClass.CAP_SCORE ||
     c.missing_data_behavior === L11MissingDataBehaviorClass.PENALIZE_SCORE ||
     c.missing_data_behavior === L11MissingDataBehaviorClass.REQUIRE_DISCLOSURE ||
     c.missing_data_behavior === L11MissingDataBehaviorClass.LOWER_CONFIDENCE) &&
    !c.disclosure_required
  ) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MISSING_DATA_CONTRIBUTION_INVALID,
      `behavior ${c.missing_data_behavior} requires disclosure_required=true`,
      { contribution_id: c.missing_data_contribution_id }));
  }
  return { ok: issues.length === 0, issues };
}

export interface ValidateMissingDataCoverageArgs {
  readonly missing_data_contributions: readonly L11MissingDataContribution[];
  readonly evaluation: L11FormulaEvaluationResult;
}

export function validateL11MissingDataCoverage(
  args: ValidateMissingDataCoverageArgs,
): L11MissingDataContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  const attributed = new Set(args.missing_data_contributions.map(c => c.missing_input_ref));
  for (const ef of args.evaluation.missing_data_effects) {
    const expectedRef = ef.disclosure_ref ?? `l11a.disclosure.${ef.missing_data_rule_id}`;
    if (!attributed.has(expectedRef)) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MISSING_DATA_EFFECT_NOT_ATTRIBUTED,
        `missing-data effect ${ef.missing_data_rule_id} not attributed`));
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateL11MaterialMissingDataVisibility(args: {
  readonly missing_data_contributions: readonly L11MissingDataContribution[];
  readonly negative_driver_refs: readonly string[];
}): L11MissingDataContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  for (const c of args.missing_data_contributions) {
    const material =
      c.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
      c.materiality_class === L11AttributionMaterialityClass.MAJOR ||
      c.materiality_class === L11AttributionMaterialityClass.MATERIAL;
    if (!material) continue;
    const expectedRef = `l11a.driver.mdc.${c.missing_data_contribution_id}`;
    if (!args.negative_driver_refs.includes(expectedRef)) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MATERIAL_MISSING_DATA_HIDDEN,
        `material missing-data ${c.missing_input_ref} not in negative driver refs`,
        { contribution_id: c.missing_data_contribution_id }));
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateL11MissingDataContributions(
  cs: readonly L11MissingDataContribution[],
): L11MissingDataContributionValidationResult {
  const all: L11ScoreAttributionIssue[] = [];
  for (const c of cs) all.push(...validateL11MissingDataContribution(c).issues);
  return { ok: all.length === 0, issues: all };
}
