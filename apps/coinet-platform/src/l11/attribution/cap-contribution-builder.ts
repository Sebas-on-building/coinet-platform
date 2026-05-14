/**
 * L11.4 — Cap Contribution Builder (§11.4.6)
 */

import {
  L11CapContribution,
  L11AttributionDriverClass,
  L11AttributionMaterialityClass,
  classifyL11Materiality,
  L11AttributionMaterialityThresholds,
  L11_DEFAULT_MATERIALITY_THRESHOLDS,
  L11FormulaEvaluationResult,
  L11ScoreFormulaDefinition,
  L11_ATTRIBUTION_POLICY_VERSION,
  L11CapDirection,
  L11CapType,
} from '../contracts';

export interface BuildCapContributionsArgs {
  readonly score_id: string;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly formula: L11ScoreFormulaDefinition;
  readonly thresholds?: L11AttributionMaterialityThresholds;
  readonly lineage_refs?: readonly string[];
  /** Snapshot of the pre-cap raw score; defaults to the evaluation's
   * raw_score when not provided. */
  readonly pre_cap_score?: number;
}

const CAP_DIRECTION_BY_RAW: Readonly<Record<string, L11CapDirection>> = {
  LIMIT_UPSIDE: L11CapDirection.LIMIT_UPSIDE,
  LIMIT_DOWNSIDE: L11CapDirection.LIMIT_DOWNSIDE,
  LIMIT_BAND_BAND: L11CapDirection.LIMIT_BAND_BAND,
  LIMIT_READINESS: L11CapDirection.LIMIT_READINESS,
};

export function buildL11CapContributions(
  args: BuildCapContributionsArgs,
): readonly L11CapContribution[] {
  const capRulesById = new Map(args.formula.cap_rules.map(c => [c.cap_rule_id, c]));
  const results: L11CapContribution[] = [];
  for (const ac of args.evaluation.applied_caps) {
    const rule = capRulesById.get(ac.cap_rule_id);
    if (!rule) continue;
    const pre = args.pre_cap_score ?? args.evaluation.raw_score;
    // Non-numeric cap types (UPPER_BAND, LOWER_BAND, READINESS_CAP)
    // store the cap reference in cap_band / direction; coerce
    // cap_value to 0 so attribution arithmetic stays finite.
    const numericCap = Number.isFinite(ac.cap_value) ? ac.cap_value : 0;
    const post = (() => {
      if (rule.cap_type === L11CapType.UPPER_VALUE) return Math.min(pre, numericCap);
      if (rule.cap_type === L11CapType.LOWER_VALUE) return Math.max(pre, numericCap);
      return pre;
    })();
    const effect = Math.abs(pre - post);
    const normalized_impact = Math.min(1, effect / 100);
    const materiality = classifyL11Materiality(
      normalized_impact,
      args.thresholds ?? L11_DEFAULT_MATERIALITY_THRESHOLDS,
    );
    const direction = CAP_DIRECTION_BY_RAW[ac.cap_direction] ?? rule.cap_direction;
    results.push({
      cap_contribution_id: `l11a.cap.${args.score_id}.${ac.cap_rule_id}`,
      score_id: args.score_id,
      score_family: args.evaluation.score_family,
      cap_rule_id: ac.cap_rule_id,
      cap_reason_code: ac.reason_code,
      pre_cap_score: pre,
      cap_value: numericCap,
      post_cap_score: post,
      cap_effect_magnitude: effect,
      cap_direction: direction,
      triggered_by_refs: ac.attribution_ref ? [ac.attribution_ref]
        : [rule.trigger_condition.trigger_code],
      driver_class: L11AttributionDriverClass.CAP_DRIVER,
      materiality_class: materiality,
      lineage_refs: args.lineage_refs ?? [`l11a.lineage.${args.score_id}`],
      policy_version: L11_ATTRIBUTION_POLICY_VERSION,
    });
  }
  return results;
}

export function pickMaterialCapContributions(
  contributions: readonly L11CapContribution[],
): readonly L11CapContribution[] {
  return contributions.filter(c =>
    c.materiality_class === L11AttributionMaterialityClass.CRITICAL ||
    c.materiality_class === L11AttributionMaterialityClass.MAJOR ||
    c.materiality_class === L11AttributionMaterialityClass.MATERIAL);
}
