/**
 * L11.4 — Modifier Contribution Validator (§11.4.8.3)
 */

import {
  L11ModifierContribution,
  L11FormulaEvaluationResult,
  L11AttributionMaterialityClass,
  L11AttributionDriverClass,
  L11ModifierSourceLayerLabel,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';

export interface L11ModifierContributionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreAttributionIssue[];
}

const ALLOWED_LAYERS: ReadonlySet<L11ModifierSourceLayerLabel> = new Set([
  'L6', 'L7', 'L8', 'L9', 'L10',
]);

const REQUIRED_DRIVER_BY_LAYER: Readonly<Record<string, L11AttributionDriverClass | null>> = {
  L8: L11AttributionDriverClass.REGIME_MODIFIER_DRIVER,
  L9: L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER,
  L10: L11AttributionDriverClass.HYPOTHESIS_DRIVER,
  L7: null,
  L6: null,
};

export function validateL11ModifierContribution(
  c: L11ModifierContribution,
): L11ModifierContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  if (!c.modifier_rule_id) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MODIFIER_CONTRIBUTION_INVALID,
      'modifier_rule_id missing', { contribution_id: c.modifier_contribution_id }));
  }
  if (!c.modifier_source_layer || !ALLOWED_LAYERS.has(c.modifier_source_layer)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MODIFIER_SOURCE_LAYER_MISSING,
      `modifier_source_layer must be one of L6/L7/L8/L9/L10`,
      { contribution_id: c.modifier_contribution_id }));
  }
  if (!Number.isFinite(c.score_effect)) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MODIFIER_CONTRIBUTION_INVALID,
      'score_effect must be finite', { contribution_id: c.modifier_contribution_id }));
  }
  if (c.triggered_by_refs.length === 0) {
    issues.push(makeL11ScoreAttributionIssue(
      L11ScoreAttributionViolationCode.L11A_MODIFIER_CONTRIBUTION_INVALID,
      'triggered_by_refs must be non-empty',
      { contribution_id: c.modifier_contribution_id }));
  }
  // §11.4.8.4 — material L8/L9/L10 modifiers must surface as the
  // canonical regime / sequence / hypothesis driver class.
  if (
    (c.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
     c.materiality_class === L11AttributionMaterialityClass.MAJOR ||
     c.materiality_class === L11AttributionMaterialityClass.MATERIAL)
  ) {
    const required = REQUIRED_DRIVER_BY_LAYER[c.modifier_source_layer];
    if (required && c.driver_class !== required) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MODIFIER_CONTRIBUTION_INVALID,
        `material modifier from ${c.modifier_source_layer} must use driver_class ${required}`,
        { contribution_id: c.modifier_contribution_id }));
    }
  }
  return { ok: issues.length === 0, issues };
}

export interface ValidateModifierCoverageArgs {
  readonly modifier_contributions: readonly L11ModifierContribution[];
  readonly evaluation: L11FormulaEvaluationResult;
}

export function validateL11ModifierAttributionCoverage(
  args: ValidateModifierCoverageArgs,
): L11ModifierContributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  const attributed = new Set(args.modifier_contributions.map(c => c.modifier_rule_id));
  for (const am of args.evaluation.applied_modifiers) {
    if (!attributed.has(am.modifier_rule_id)) {
      issues.push(makeL11ScoreAttributionIssue(
        L11ScoreAttributionViolationCode.L11A_MODIFIER_APPLIED_BUT_NOT_ATTRIBUTED,
        `applied modifier ${am.modifier_rule_id} has no contribution`));
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateL11ModifierContributions(
  cs: readonly L11ModifierContribution[],
): L11ModifierContributionValidationResult {
  const all: L11ScoreAttributionIssue[] = [];
  for (const c of cs) all.push(...validateL11ModifierContribution(c).issues);
  return { ok: all.length === 0, issues: all };
}
