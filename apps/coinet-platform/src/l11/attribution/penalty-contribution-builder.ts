/**
 * L11.4 — Penalty Contribution Builder (§11.4.7)
 */

import {
  L11PenaltyContribution,
  L11AttributionDriverClass,
  L11ContributionDirection,
  L11AttributionMaterialityClass,
  classifyL11Materiality,
  L11AttributionMaterialityThresholds,
  L11_DEFAULT_MATERIALITY_THRESHOLDS,
  L11FormulaEvaluationResult,
  L11ScoreFormulaDefinition,
  L11ScoreFamily,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11_ATTRIBUTION_POLICY_VERSION,
  L11PenaltyApplicationMode,
} from '../contracts';

const RISK_DIRECTION_FAMILIES: ReadonlySet<L11ScoreFamilyDirectionClass> = new Set([
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_SUPPLY_RISK,
]);

function isRiskFamily(family: L11ScoreFamily): boolean {
  return RISK_DIRECTION_FAMILIES.has(L11_REQUIRED_DIRECTION_BY_FAMILY[family]);
}

export interface BuildPenaltyContributionsArgs {
  readonly score_id: string;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly formula: L11ScoreFormulaDefinition;
  readonly thresholds?: L11AttributionMaterialityThresholds;
  readonly lineage_refs?: readonly string[];
}

export function buildL11PenaltyContributions(
  args: BuildPenaltyContributionsArgs,
): readonly L11PenaltyContribution[] {
  const rulesById = new Map(args.formula.penalty_rules.map(p => [p.penalty_rule_id, p]));
  const results: L11PenaltyContribution[] = [];
  for (const ap of args.evaluation.applied_penalties) {
    const rule = rulesById.get(ap.penalty_rule_id);
    if (!rule) continue;
    const score_effect = ap.magnitude_applied;
    const normalized_impact = Math.min(1, Math.abs(score_effect) / 100);
    const materiality = classifyL11Materiality(
      normalized_impact,
      args.thresholds ?? L11_DEFAULT_MATERIALITY_THRESHOLDS,
    );
    const direction = isRiskFamily(args.evaluation.score_family)
      ? L11ContributionDirection.INCREASES_RISK_SCORE
      : L11ContributionDirection.LOWERS_SCORE;

    const penalty_type =
      ap.mode === L11PenaltyApplicationMode.MULTIPLICATIVE
        ? L11PenaltyApplicationMode.MULTIPLICATIVE
        : L11PenaltyApplicationMode.ADDITIVE;

    results.push({
      penalty_contribution_id: `l11a.pen.${args.score_id}.${ap.penalty_rule_id}`,
      score_id: args.score_id,
      score_family: args.evaluation.score_family,
      penalty_rule_id: ap.penalty_rule_id,
      penalty_reason_code: ap.reason_code,
      penalty_type,
      penalty_magnitude: rule.magnitude,
      affected_component_refs: rule.affected_component_ids.length > 0
        ? rule.affected_component_ids
        : [`l11a.formula.${args.formula.formula_id}`],
      score_effect,
      contribution_direction: direction,
      triggered_by_refs: ap.attribution_ref ? [ap.attribution_ref] : [rule.reason_code],
      driver_class: L11AttributionDriverClass.PENALTY_DRIVER,
      materiality_class: materiality,
      lineage_refs: args.lineage_refs ?? [`l11a.lineage.${args.score_id}`],
      policy_version: L11_ATTRIBUTION_POLICY_VERSION,
    });
  }
  return results;
}

export function pickMaterialPenaltyContributions(
  contributions: readonly L11PenaltyContribution[],
): readonly L11PenaltyContribution[] {
  return contributions.filter(c =>
    c.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
    c.materiality_class === L11AttributionMaterialityClass.MAJOR ||
    c.materiality_class === L11AttributionMaterialityClass.MATERIAL);
}
