/**
 * L11.6 — Calibration Exclusion Rule Registry (§11.6.13)
 *
 * Authoritative production exclusion-rule catalogue. Targets
 * compose these rules into their `exclusion_rules` arrays. Every
 * required-for-production class is represented by at least one
 * shared rule.
 */

import {
  L11CalibrationExclusionRule,
  L11CalibrationExclusionClass,
  L11_CALIBRATION_EXCLUSION_POLICY_VERSION,
  ALL_L11_CALIBRATION_EXCLUSION_CLASSES,
  isL11CalibrationExclusionRuleStructurallyValid,
  L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES,
} from '../contracts/calibration-exclusion';
import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11OutcomeMetric,
  ALL_L11_OUTCOME_METRICS,
} from '../contracts/outcome-metric';

const ALL_PROD_FAMS: readonly L11ScoreFamily[] = L11_PRODUCTION_SCORE_FAMILIES;
const ALL_METRICS: readonly L11OutcomeMetric[] = ALL_L11_OUTCOME_METRICS;

const E = (
  exclusion_rule_id: string,
  exclusion_class: L11CalibrationExclusionClass,
  description: string,
  bias_safe_justification: string,
  required_for_production = true,
  applies_to_score_families: readonly L11ScoreFamily[] = ALL_PROD_FAMS,
  applies_to_metrics: readonly L11OutcomeMetric[] = ALL_METRICS,
): L11CalibrationExclusionRule => ({
  exclusion_rule_id,
  exclusion_class,
  description,
  applies_to_score_families,
  applies_to_metrics,
  required_for_production,
  is_bias_safe: true,
  bias_safe_justification,
  policy_version: L11_CALIBRATION_EXCLUSION_POLICY_VERSION,
});

export const L11_PRODUCTION_EXCLUSION_RULES:
  readonly L11CalibrationExclusionRule[] = [
  E('excl.score.quarantined.v1',
    L11CalibrationExclusionClass.SCORE_QUARANTINED,
    'exclude scores marked quarantined by L11.5 missing-data or L11.4 attribution',
    'data-quality based; symmetric across positive and negative outcomes'),
  E('excl.blocked.visibility.v1',
    L11CalibrationExclusionClass.BLOCKED_VISIBILITY,
    'exclude scores emitted under BLOCKED_VISIBILITY class',
    'visibility-based; independent of outcome direction'),
  E('excl.formula.deprecated.v1',
    L11CalibrationExclusionClass.FORMULA_DEPRECATED,
    'exclude scores produced by deprecated formula versions',
    'version-based; applies regardless of outcome'),
  E('excl.target.outcome.missing.v1',
    L11CalibrationExclusionClass.TARGET_OUTCOME_MISSING,
    'exclude observations whose required future outcome data did not arrive',
    'data-availability based; independent of outcome direction'),
  E('excl.asset.delisted.v1',
    L11CalibrationExclusionClass.ASSET_DELISTED_OR_EXPLOITED,
    'exclude assets that delisted, exploited, or paused trading inside the evaluation window',
    'asset-availability based; explicitly tracked as excluded rather than ignored, so survivorship is declared not hidden'),

  E('excl.data.outage.v1',
    L11CalibrationExclusionClass.DATA_OUTAGE_WINDOW,
    'exclude evaluation windows overlapping a registered data outage',
    'pipeline-availability based; independent of outcome',
    false),
  E('excl.score.corrected.v1',
    L11CalibrationExclusionClass.SCORE_CORRECTED,
    'exclude scores that were post-emission corrected',
    'replaces corrected sample with corrected lineage; symmetric',
    false),
  E('excl.extreme.shock.v1',
    L11CalibrationExclusionClass.EXTREME_EXTERNAL_SHOCK,
    'exclude evaluation windows during registered extreme external shocks',
    'macro-shock based; documented in registry, applied symmetrically',
    false),
  E('excl.insufficient.liquidity.v1',
    L11CalibrationExclusionClass.INSUFFICIENT_LIQUIDITY_FOR_OUTCOME,
    'exclude observations where tradable liquidity is too low to produce meaningful outcome',
    'liquidity-availability based; symmetric across positive and negative outcomes',
    false,
    [L11ScoreFamily.OPPORTUNITY, L11ScoreFamily.MARKET_STRUCTURE,
      L11ScoreFamily.UNLOCK_RISK, L11ScoreFamily.WHALE_CONVICTION]),
];

const RULES_BY_ID =
  new Map(L11_PRODUCTION_EXCLUSION_RULES.map(r => [r.exclusion_rule_id, r]));

export function getL11ExclusionRule(id: string):
  L11CalibrationExclusionRule | null {
  return RULES_BY_ID.get(id) ?? null;
}

export function getL11RequiredProductionExclusionRules():
  readonly L11CalibrationExclusionRule[] {
  return L11_PRODUCTION_EXCLUSION_RULES.filter(r => r.required_for_production);
}

export interface L11ExclusionRegistryIssue {
  readonly exclusion_rule_id: string | null;
  readonly reason: string;
}

export interface L11ExclusionRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly classes_covered: readonly L11CalibrationExclusionClass[];
  readonly missing_required_classes: readonly L11CalibrationExclusionClass[];
  readonly issues: readonly L11ExclusionRegistryIssue[];
}

export function buildL11ExclusionRegistryReport(
  rules: readonly L11CalibrationExclusionRule[] = L11_PRODUCTION_EXCLUSION_RULES,
): L11ExclusionRegistryReport {
  const issues: L11ExclusionRegistryIssue[] = [];
  const seen = new Set<string>();
  const classesPresent = new Set<L11CalibrationExclusionClass>();

  for (const r of rules) {
    if (seen.has(r.exclusion_rule_id)) {
      issues.push({ exclusion_rule_id: r.exclusion_rule_id,
        reason: 'duplicate exclusion_rule_id' });
      continue;
    }
    seen.add(r.exclusion_rule_id);
    if (!ALL_L11_CALIBRATION_EXCLUSION_CLASSES.includes(r.exclusion_class)) {
      issues.push({ exclusion_rule_id: r.exclusion_rule_id,
        reason: `unknown exclusion_class ${r.exclusion_class}` });
    }
    const sv = isL11CalibrationExclusionRuleStructurallyValid(r);
    if (!sv.ok) {
      issues.push({ exclusion_rule_id: r.exclusion_rule_id, reason: sv.reason });
    }
    classesPresent.add(r.exclusion_class);
  }

  const missing = L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES
    .filter(c => !classesPresent.has(c));
  for (const c of missing) {
    issues.push({ exclusion_rule_id: null,
      reason: `required production exclusion class ${c} not registered` });
  }

  return {
    ok: issues.length === 0,
    count: rules.length,
    classes_covered: [...classesPresent],
    missing_required_classes: missing,
    issues,
  };
}
