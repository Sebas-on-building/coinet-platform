/**
 * L11.3 — Missing-Data Rule Registry (§11.3.18)
 */

import {
  L11FormulaMissingDataRule,
  L11InputConditionClass,
  ALL_L11_INPUT_CONDITION_CLASSES,
  isL11MissingDataRuleLegal,
} from '../contracts/formula-missing-data-rule';
import {
  L11ScoreFormulaDefinition,
} from '../contracts/score-formula';
import {
  L11_PRODUCTION_FORMULAS,
} from '../contracts/formula-catalogue';

export interface L11MissingDataRuleRegistryIssue {
  readonly formula_id: string | null;
  readonly missing_data_rule_id: string | null;
  readonly reason: string;
}

export interface L11MissingDataRuleRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly issues: readonly L11MissingDataRuleRegistryIssue[];
}

export function buildL11MissingDataRuleRegistryReport(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11MissingDataRuleRegistryReport {
  const issues: L11MissingDataRuleRegistryIssue[] = [];
  const seen = new Set<string>();
  let count = 0;

  for (const f of formulas) {
    const conditionsCovered = new Set<L11InputConditionClass>();
    for (const r of f.missing_data_rules) {
      count += 1;
      if (seen.has(r.missing_data_rule_id)) {
        issues.push({
          formula_id: f.formula_id, missing_data_rule_id: r.missing_data_rule_id,
          reason: 'duplicate missing_data_rule_id',
        });
        continue;
      }
      seen.add(r.missing_data_rule_id);
      if (r.score_family !== f.score_family) {
        issues.push({
          formula_id: f.formula_id, missing_data_rule_id: r.missing_data_rule_id,
          reason: `missing-data rule family ${r.score_family} != formula family ${f.score_family}`,
        });
      }
      const legal = isL11MissingDataRuleLegal(r);
      if (!legal.ok) {
        issues.push({
          formula_id: f.formula_id, missing_data_rule_id: r.missing_data_rule_id,
          reason: `missing-data rule illegal: ${legal.reason}`,
        });
      }
      conditionsCovered.add(r.input_condition);
    }

    for (const c of ALL_L11_INPUT_CONDITION_CLASSES) {
      if (!conditionsCovered.has(c)) {
        issues.push({
          formula_id: f.formula_id, missing_data_rule_id: null,
          reason: `formula missing rule for input condition ${c}`,
        });
      }
    }
  }
  return { ok: issues.length === 0, count, issues };
}

export function getL11MissingDataRulesForFormula(
  formula_id: string,
): readonly L11FormulaMissingDataRule[] {
  const f = L11_PRODUCTION_FORMULAS.find(x => x.formula_id === formula_id);
  return f ? f.missing_data_rules : [];
}
