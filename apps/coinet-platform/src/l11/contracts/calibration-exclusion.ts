/**
 * L11.6 — Calibration Exclusion Rules (§11.6.10)
 *
 * Rules that mark observations as inadmissible for calibration so
 * later evaluation does not corrupt itself with quarantined,
 * blocked-visibility, deprecated, corrected, or missing-outcome
 * samples.
 */

import { L11ScoreFamily } from './score-family';
import { L11OutcomeMetric } from './outcome-metric';

export const L11_CALIBRATION_EXCLUSION_POLICY_VERSION = 'l11.6.exclusion.v1';

export enum L11CalibrationExclusionClass {
  SCORE_QUARANTINED = 'SCORE_QUARANTINED',
  BLOCKED_VISIBILITY = 'BLOCKED_VISIBILITY',
  DATA_OUTAGE_WINDOW = 'DATA_OUTAGE_WINDOW',
  FORMULA_DEPRECATED = 'FORMULA_DEPRECATED',
  SCORE_CORRECTED = 'SCORE_CORRECTED',
  TARGET_OUTCOME_MISSING = 'TARGET_OUTCOME_MISSING',
  EXTREME_EXTERNAL_SHOCK = 'EXTREME_EXTERNAL_SHOCK',
  ASSET_DELISTED_OR_EXPLOITED = 'ASSET_DELISTED_OR_EXPLOITED',
  INSUFFICIENT_LIQUIDITY_FOR_OUTCOME = 'INSUFFICIENT_LIQUIDITY_FOR_OUTCOME',
}

export const ALL_L11_CALIBRATION_EXCLUSION_CLASSES:
  readonly L11CalibrationExclusionClass[] =
  Object.values(L11CalibrationExclusionClass);

/**
 * §11.6.10.4 — Production calibration targets must include at
 * least these classes; otherwise survivorship/quarantine bias
 * leaks through.
 */
export const L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES:
  readonly L11CalibrationExclusionClass[] = [
  L11CalibrationExclusionClass.SCORE_QUARANTINED,
  L11CalibrationExclusionClass.BLOCKED_VISIBILITY,
  L11CalibrationExclusionClass.FORMULA_DEPRECATED,
  L11CalibrationExclusionClass.TARGET_OUTCOME_MISSING,
  L11CalibrationExclusionClass.ASSET_DELISTED_OR_EXPLOITED,
];

export interface L11CalibrationExclusionRule {
  readonly exclusion_rule_id: string;
  readonly exclusion_class: L11CalibrationExclusionClass;
  readonly description: string;

  readonly applies_to_score_families: readonly L11ScoreFamily[];
  readonly applies_to_metrics: readonly L11OutcomeMetric[];

  readonly required_for_production: boolean;

  /**
   * §11.6.10.4 — Survivorship-bias detector flag. An exclusion
   * rule that filters only "bad" outcomes (e.g. excluding
   * negative-return tokens) is illegal — that introduces
   * survivorship bias. Rules that legitimately filter by data
   * quality must explicitly declare `is_bias_safe = true`.
   */
  readonly is_bias_safe: boolean;
  readonly bias_safe_justification: string;

  readonly policy_version: string;
}

export function isL11CalibrationExclusionRuleStructurallyValid(
  r: L11CalibrationExclusionRule,
): { ok: boolean; reason: string } {
  if (!r.exclusion_rule_id) return { ok: false, reason: 'exclusion_rule_id missing' };
  if (!r.exclusion_class) return { ok: false, reason: 'exclusion_class missing' };
  if (!r.description) return { ok: false, reason: 'description missing' };
  if (!r.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!ALL_L11_CALIBRATION_EXCLUSION_CLASSES.includes(r.exclusion_class)) {
    return { ok: false, reason: `unknown exclusion_class ${r.exclusion_class}` };
  }
  if (!r.is_bias_safe) {
    return {
      ok: false,
      reason: 'exclusion rule must declare is_bias_safe = true with justification',
    };
  }
  if (!r.bias_safe_justification) {
    return { ok: false, reason: 'bias_safe_justification missing' };
  }
  return { ok: true, reason: 'ok' };
}

/**
 * §11.6.10.4 — A target's exclusion-rule set must cover every
 * required production class.
 */
export function getMissingRequiredExclusionClasses(
  rules: readonly L11CalibrationExclusionRule[],
): readonly L11CalibrationExclusionClass[] {
  const present = new Set(rules.map(r => r.exclusion_class));
  return L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES.filter(c => !present.has(c));
}
