/**
 * L11.4 — Component Contribution Builder (§11.4.5)
 *
 * Maps `L11ComponentEvaluationResult` instances into governed
 * `L11ComponentContribution` objects. Materiality is classified by
 * absolute weighted contribution divided by 100.
 */

import {
  L11ComponentContribution,
  L11AttributionDriverClass,
  L11ContributionDirection,
  L11AttributionMaterialityClass,
  classifyL11Materiality,
  L11_DEFAULT_MATERIALITY_THRESHOLDS,
  L11AttributionMaterialityThresholds,
  L11ScoreFamily,
  L11ScoreFamilyDirectionClass,
  L11ScoreComponentDefinition,
  L11ComponentDirectionClass,
  L11ScoreComponentRole,
  L11FormulaEvaluationResult,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11_ATTRIBUTION_POLICY_VERSION,
} from '../contracts';

const RISK_DIRECTION_FAMILIES: ReadonlySet<L11ScoreFamilyDirectionClass> = new Set([
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_SUPPLY_RISK,
]);

function isRiskFamily(family: L11ScoreFamily): boolean {
  const dir = L11_REQUIRED_DIRECTION_BY_FAMILY[family];
  return RISK_DIRECTION_FAMILIES.has(dir);
}

function deriveDriverClass(
  def: L11ScoreComponentDefinition,
  weighted_contribution: number,
): L11AttributionDriverClass {
  if (def.component_role === L11ScoreComponentRole.PENALTY_COMPONENT) {
    return L11AttributionDriverClass.PENALTY_DRIVER;
  }
  if (def.component_role === L11ScoreComponentRole.CAP_COMPONENT) {
    return L11AttributionDriverClass.CAP_DRIVER;
  }
  if (def.component_role === L11ScoreComponentRole.MODIFIER_COMPONENT) {
    return L11AttributionDriverClass.REGIME_MODIFIER_DRIVER;
  }
  if (def.component_role === L11ScoreComponentRole.CONFIDENCE_COMPONENT) {
    return L11AttributionDriverClass.CONFIDENCE_DRIVER;
  }
  if (def.component_role === L11ScoreComponentRole.PRIMARY_RISK_COMPONENT ||
      def.component_role === L11ScoreComponentRole.SECONDARY_RISK_COMPONENT) {
    return weighted_contribution >= 0
      ? L11AttributionDriverClass.PRIMARY_NEGATIVE_DRIVER
      : L11AttributionDriverClass.SECONDARY_NEGATIVE_DRIVER;
  }
  if (def.component_role === L11ScoreComponentRole.PRIMARY_POSITIVE_COMPONENT) {
    return weighted_contribution >= 0
      ? L11AttributionDriverClass.PRIMARY_POSITIVE_DRIVER
      : L11AttributionDriverClass.PRIMARY_NEGATIVE_DRIVER;
  }
  if (def.component_role === L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT) {
    return weighted_contribution >= 0
      ? L11AttributionDriverClass.SECONDARY_POSITIVE_DRIVER
      : L11AttributionDriverClass.SECONDARY_NEGATIVE_DRIVER;
  }
  if (def.component_role === L11ScoreComponentRole.STRUCTURE_COMPONENT) {
    return L11AttributionDriverClass.SECONDARY_POSITIVE_DRIVER;
  }
  if (def.component_role === L11ScoreComponentRole.TIMING_COMPONENT) {
    return L11AttributionDriverClass.SECONDARY_POSITIVE_DRIVER;
  }
  return L11AttributionDriverClass.SECONDARY_POSITIVE_DRIVER;
}

function deriveDirection(
  def: L11ScoreComponentDefinition,
  family: L11ScoreFamily,
  weighted_contribution: number,
): L11ContributionDirection {
  const risk = isRiskFamily(family);
  switch (def.component_direction) {
    case L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE:
      return risk ? L11ContributionDirection.REDUCES_RISK_SCORE : L11ContributionDirection.RAISES_SCORE;
    case L11ComponentDirectionClass.HIGHER_REDUCES_SCORE:
      return risk ? L11ContributionDirection.INCREASES_RISK_SCORE : L11ContributionDirection.LOWERS_SCORE;
    case L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE:
      return L11ContributionDirection.INCREASES_RISK_SCORE;
    case L11ComponentDirectionClass.HIGHER_INCREASES_CONFIDENCE:
      return weighted_contribution >= 0
        ? L11ContributionDirection.RAISES_SCORE
        : L11ContributionDirection.NARROWS_CONFIDENCE;
    case L11ComponentDirectionClass.FAMILY_DIRECTION_ALIGNED:
      return risk ? L11ContributionDirection.INCREASES_RISK_SCORE : L11ContributionDirection.RAISES_SCORE;
    case L11ComponentDirectionClass.FAMILY_DIRECTION_INVERTED:
      return risk ? L11ContributionDirection.REDUCES_RISK_SCORE : L11ContributionDirection.LOWERS_SCORE;
    default:
      return weighted_contribution >= 0
        ? L11ContributionDirection.RAISES_SCORE
        : L11ContributionDirection.LOWERS_SCORE;
  }
}

export interface BuildComponentContributionsArgs {
  readonly score_id: string;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly component_definitions: readonly L11ScoreComponentDefinition[];
  readonly evidence_refs_by_component?: Readonly<Record<string, readonly string[]>>;
  readonly lineage_refs?: readonly string[];
  readonly thresholds?: L11AttributionMaterialityThresholds;
}

export function buildL11ComponentContributions(
  args: BuildComponentContributionsArgs,
): readonly L11ComponentContribution[] {
  const defsById = new Map(
    args.component_definitions.map(c => [c.component_id, c]),
  );
  const ranked = [...args.evaluation.component_results]
    .map(cr => ({
      cr,
      abs: Math.abs(cr.weighted_contribution),
    }))
    .sort((a, b) => b.abs - a.abs || a.cr.component_id.localeCompare(b.cr.component_id));

  const results: L11ComponentContribution[] = [];
  ranked.forEach(({ cr }, idx) => {
    const def = defsById.get(cr.component_id);
    if (!def) return;
    const normalized_impact = Math.min(1, Math.abs(cr.weighted_contribution) / 100);
    const materiality = classifyL11Materiality(
      normalized_impact,
      args.thresholds ?? L11_DEFAULT_MATERIALITY_THRESHOLDS,
    );
    results.push({
      contribution_id: `l11a.cc.${args.score_id}.${cr.component_id}`,
      score_id: args.score_id,
      score_family: args.evaluation.score_family,
      component_id: cr.component_id,
      component_name: cr.component_name,
      component_raw_value: cr.value,
      component_normalized_value: cr.value,
      component_weight: cr.weight,
      weighted_contribution: cr.weighted_contribution,
      contribution_direction: deriveDirection(def, args.evaluation.score_family, cr.weighted_contribution),
      contribution_rank: idx + 1,
      materiality_class: materiality,
      driver_class: deriveDriverClass(def, cr.weighted_contribution),
      evidence_refs: args.evidence_refs_by_component?.[cr.component_id] ?? [`l11a.evidence.${cr.component_id}`],
      lineage_refs: args.lineage_refs ?? [`l11a.lineage.${args.score_id}`],
      policy_version: L11_ATTRIBUTION_POLICY_VERSION,
    });
  });

  return results;
}

/**
 * Helper used by the attribution engine to surface component
 * materiality without rebuilding the contributions list.
 */
export function pickMaterialComponentContributions(
  contributions: readonly L11ComponentContribution[],
): readonly L11ComponentContribution[] {
  return contributions.filter(c =>
    c.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
    c.materiality_class === L11AttributionMaterialityClass.MAJOR ||
    c.materiality_class === L11AttributionMaterialityClass.MATERIAL);
}
