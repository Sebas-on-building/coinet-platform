/**
 * L11.3 — Missing-Data Rule Validator (§11.3.7)
 */

import {
  ALL_L11_INPUT_CONDITION_CLASSES,
  L11InputConditionClass,
  isL11MissingDataRuleLegal,
} from '../contracts/formula-missing-data-rule';
import { L11ScoreFormulaDefinition } from '../contracts/score-formula';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';

export interface L11MissingDataRuleValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

export function validateL11FormulaMissingDataRules(
  formula: L11ScoreFormulaDefinition,
): L11MissingDataRuleValidationResult {
  const issues: L11ScoreFormulaIssue[] = [];
  const conditionsCovered = new Set<L11InputConditionClass>();
  const seen = new Set<string>();
  for (const r of formula.missing_data_rules) {
    if (!r.missing_data_rule_id) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MISSING_DATA_RULE_MISSING,
        'missing_data_rule_id missing',
        { formula_id: formula.formula_id },
      ));
      continue;
    }
    if (seen.has(r.missing_data_rule_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MISSING_DATA_RULE_ILLEGAL,
        `duplicate missing_data_rule_id ${r.missing_data_rule_id}`,
        { formula_id: formula.formula_id },
      ));
      continue;
    }
    seen.add(r.missing_data_rule_id);
    if (r.score_family !== formula.score_family) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MISSING_DATA_RULE_ILLEGAL,
        `missing-data rule family ${r.score_family} != formula family ${formula.score_family}`,
        { formula_id: formula.formula_id },
      ));
    }
    const legal = isL11MissingDataRuleLegal(r);
    if (!legal.ok) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MISSING_DATA_RULE_ILLEGAL,
        `missing-data rule illegal: ${legal.reason}`,
        { formula_id: formula.formula_id },
      ));
    }
    conditionsCovered.add(r.input_condition);
  }
  for (const c of ALL_L11_INPUT_CONDITION_CLASSES) {
    if (!conditionsCovered.has(c)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MISSING_DATA_RULE_MISSING,
        `formula missing rule for input condition ${c}`,
        { formula_id: formula.formula_id },
      ));
    }
  }
  return { ok: issues.length === 0, issues };
}
