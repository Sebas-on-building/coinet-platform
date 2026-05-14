/**
 * L11.4 — Modifier Contribution Builder (§11.4.8)
 */

import {
  L11ModifierContribution,
  L11AttributionDriverClass,
  L11ContributionDirection,
  L11AttributionMaterialityClass,
  classifyL11Materiality,
  L11AttributionMaterialityThresholds,
  L11_DEFAULT_MATERIALITY_THRESHOLDS,
  L11FormulaEvaluationResult,
  L11ScoreFormulaDefinition,
  L11_ATTRIBUTION_POLICY_VERSION,
  L11ModifierEffect,
  L11ModifierSourceLayer,
  L11ScoreFamily,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11ModifierSourceLayerLabel,
} from '../contracts';

const RISK_DIRECTION_FAMILIES: ReadonlySet<L11ScoreFamilyDirectionClass> = new Set([
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_SUPPLY_RISK,
]);

function isRiskFamily(family: L11ScoreFamily): boolean {
  return RISK_DIRECTION_FAMILIES.has(L11_REQUIRED_DIRECTION_BY_FAMILY[family]);
}

const SOURCE_LAYER_LABEL: Readonly<Record<L11ModifierSourceLayer, L11ModifierSourceLayerLabel>> = {
  [L11ModifierSourceLayer.L6_PRIMITIVE]: 'L6',
  [L11ModifierSourceLayer.L7_VALIDATION]: 'L7',
  [L11ModifierSourceLayer.L8_REGIME]: 'L8',
  [L11ModifierSourceLayer.L9_SEQUENCE]: 'L9',
  [L11ModifierSourceLayer.L10_HYPOTHESIS]: 'L10',
  // §11.4.8 only allows L6/L7/L8/L9/L10. MISSING_DATA / RESTRICTION
  // postures must be raised through dedicated builders.
  [L11ModifierSourceLayer.MISSING_DATA]: 'L6',
  [L11ModifierSourceLayer.RESTRICTION_POSTURE]: 'L7',
};

function deriveDriverClass(
  source: L11ModifierSourceLayer,
): L11AttributionDriverClass {
  switch (source) {
    case L11ModifierSourceLayer.L7_VALIDATION:
      return L11AttributionDriverClass.VALIDATION_DRIVER;
    case L11ModifierSourceLayer.L8_REGIME:
      return L11AttributionDriverClass.REGIME_MODIFIER_DRIVER;
    case L11ModifierSourceLayer.L9_SEQUENCE:
      return L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER;
    case L11ModifierSourceLayer.L10_HYPOTHESIS:
      return L11AttributionDriverClass.HYPOTHESIS_DRIVER;
    case L11ModifierSourceLayer.L6_PRIMITIVE:
      return L11AttributionDriverClass.SECONDARY_POSITIVE_DRIVER;
    case L11ModifierSourceLayer.RESTRICTION_POSTURE:
      return L11AttributionDriverClass.VALIDATION_DRIVER;
    case L11ModifierSourceLayer.MISSING_DATA:
      return L11AttributionDriverClass.MISSING_DATA_DRIVER;
    default:
      return L11AttributionDriverClass.SECONDARY_POSITIVE_DRIVER;
  }
}

function deriveDirection(
  effect: L11ModifierEffect,
  family: L11ScoreFamily,
  score_effect: number,
): L11ContributionDirection {
  const risk = isRiskFamily(family);
  if (effect === L11ModifierEffect.DISCLOSURE_ONLY) return L11ContributionDirection.DISCLOSURE_ONLY;
  if (effect === L11ModifierEffect.CAP_TRIGGER) return L11ContributionDirection.CAPS_SCORE;
  if (effect === L11ModifierEffect.SHIFT_UP || effect === L11ModifierEffect.AMPLIFY) {
    return risk ? L11ContributionDirection.INCREASES_RISK_SCORE : L11ContributionDirection.RAISES_SCORE;
  }
  if (effect === L11ModifierEffect.SHIFT_DOWN || effect === L11ModifierEffect.DAMPEN) {
    return risk ? L11ContributionDirection.REDUCES_RISK_SCORE : L11ContributionDirection.LOWERS_SCORE;
  }
  return score_effect >= 0
    ? (risk ? L11ContributionDirection.INCREASES_RISK_SCORE : L11ContributionDirection.RAISES_SCORE)
    : (risk ? L11ContributionDirection.REDUCES_RISK_SCORE : L11ContributionDirection.LOWERS_SCORE);
}

export interface BuildModifierContributionsArgs {
  readonly score_id: string;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly formula: L11ScoreFormulaDefinition;
  readonly thresholds?: L11AttributionMaterialityThresholds;
  readonly lineage_refs?: readonly string[];
}

export function buildL11ModifierContributions(
  args: BuildModifierContributionsArgs,
): readonly L11ModifierContribution[] {
  const rulesById = new Map(args.formula.modifier_rules.map(m => [m.modifier_rule_id, m]));
  const results: L11ModifierContribution[] = [];
  for (const am of args.evaluation.applied_modifiers) {
    const rule = rulesById.get(am.modifier_rule_id);
    if (!rule) continue;
    const score_effect = am.magnitude_applied;
    const normalized_impact = Math.min(1, Math.abs(score_effect) / 100);
    const materiality = classifyL11Materiality(
      normalized_impact,
      args.thresholds ?? L11_DEFAULT_MATERIALITY_THRESHOLDS,
    );
    const sourceLabel = SOURCE_LAYER_LABEL[rule.source_layer];
    const direction = deriveDirection(rule.effect, args.evaluation.score_family, score_effect);
    results.push({
      modifier_contribution_id: `l11a.mod.${args.score_id}.${am.modifier_rule_id}`,
      score_id: args.score_id,
      score_family: args.evaluation.score_family,
      modifier_rule_id: am.modifier_rule_id,
      modifier_source_layer: sourceLabel,
      modifier_type: rule.effect,
      modifier_magnitude: rule.magnitude,
      affected_component_refs: [`l11a.formula.${args.formula.formula_id}`],
      score_effect,
      contribution_direction: direction,
      triggered_by_refs: am.attribution_ref ? [am.attribution_ref] : [rule.trigger_code],
      driver_class: deriveDriverClass(rule.source_layer),
      materiality_class: materiality,
      lineage_refs: args.lineage_refs ?? [`l11a.lineage.${args.score_id}`],
      policy_version: L11_ATTRIBUTION_POLICY_VERSION,
    });
  }
  return results;
}

export function pickMaterialModifierContributions(
  contributions: readonly L11ModifierContribution[],
): readonly L11ModifierContribution[] {
  return contributions.filter(c =>
    c.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
    c.materiality_class === L11AttributionMaterialityClass.MAJOR ||
    c.materiality_class === L11AttributionMaterialityClass.MATERIAL);
}
