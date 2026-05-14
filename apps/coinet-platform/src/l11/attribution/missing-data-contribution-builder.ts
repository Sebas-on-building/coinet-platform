/**
 * L11.4 — Missing-Data Contribution Builder (§11.4.9)
 */

import {
  L11MissingDataContribution,
  L11AttributionDriverClass,
  L11AttributionMaterialityClass,
  classifyL11Materiality,
  L11AttributionMaterialityThresholds,
  L11_DEFAULT_MATERIALITY_THRESHOLDS,
  L11FormulaEvaluationResult,
  L11ScoreFormulaDefinition,
  L11_ATTRIBUTION_POLICY_VERSION,
  L11InputConditionClass,
  L11MissingDataBehaviorClass,
} from '../contracts';

export interface BuildMissingDataContributionsArgs {
  readonly score_id: string;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly formula: L11ScoreFormulaDefinition;
  readonly thresholds?: L11AttributionMaterialityThresholds;
  readonly lineage_refs?: readonly string[];
}

const DISCLOSURE_REQUIRED_BEHAVIOURS:
  ReadonlySet<L11MissingDataBehaviorClass> = new Set([
  L11MissingDataBehaviorClass.BLOCK_SCORE,
  L11MissingDataBehaviorClass.CAP_SCORE,
  L11MissingDataBehaviorClass.PENALIZE_SCORE,
  L11MissingDataBehaviorClass.REQUIRE_DISCLOSURE,
  L11MissingDataBehaviorClass.EVIDENCE_ONLY,
  L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
]);

export function buildL11MissingDataContributions(
  args: BuildMissingDataContributionsArgs,
): readonly L11MissingDataContribution[] {
  const rulesById = new Map(args.formula.missing_data_rules.map(r => [r.missing_data_rule_id, r]));
  const omittedComponents = new Set(
    args.evaluation.component_results.filter(c => c.omitted).map(c => c.component_id),
  );

  const results: L11MissingDataContribution[] = [];
  for (const ef of args.evaluation.missing_data_effects) {
    const rule = rulesById.get(ef.missing_data_rule_id);
    const behavior = (ef.behavior as L11MissingDataBehaviorClass) ?? rule?.behavior;
    const condition = (ef.input_condition as L11InputConditionClass) ?? rule?.input_condition;
    const score_effect = behavior === L11MissingDataBehaviorClass.BLOCK_SCORE ? 50
      : behavior === L11MissingDataBehaviorClass.CAP_SCORE ? 20
      : behavior === L11MissingDataBehaviorClass.PENALIZE_SCORE ? 10
      : 0;
    const confidence_effect = behavior === L11MissingDataBehaviorClass.LOWER_CONFIDENCE ? 15 : 5;
    const normalized_impact = Math.min(1, (score_effect + confidence_effect) / 100);
    const materiality = classifyL11Materiality(
      normalized_impact,
      args.thresholds ?? L11_DEFAULT_MATERIALITY_THRESHOLDS,
    );

    results.push({
      missing_data_contribution_id: `l11a.mdc.${args.score_id}.${ef.missing_data_rule_id}`,
      score_id: args.score_id,
      score_family: args.evaluation.score_family,
      missing_input_ref: ef.disclosure_ref ?? `l11a.disclosure.${ef.missing_data_rule_id}`,
      missing_input_class: condition,
      missing_data_behavior: behavior,
      score_effect,
      confidence_effect,
      affected_component_refs: ef.affected_component_id
        ? [ef.affected_component_id]
        : Array.from(omittedComponents),
      disclosure_required: DISCLOSURE_REQUIRED_BEHAVIOURS.has(behavior),
      driver_class: L11AttributionDriverClass.MISSING_DATA_DRIVER,
      materiality_class: materiality,
      lineage_refs: args.lineage_refs ?? [`l11a.lineage.${args.score_id}`],
      policy_version: L11_ATTRIBUTION_POLICY_VERSION,
    });
  }

  return results;
}

export function pickMaterialMissingDataContributions(
  contributions: readonly L11MissingDataContribution[],
): readonly L11MissingDataContribution[] {
  return contributions.filter(c =>
    c.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
    c.materiality_class === L11AttributionMaterialityClass.MAJOR ||
    c.materiality_class === L11AttributionMaterialityClass.MATERIAL);
}
