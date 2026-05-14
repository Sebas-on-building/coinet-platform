/**
 * L11.3 — Cap Rule Validator (§11.3.6.2 → 6.4)
 */

import {
  L11FormulaCapRule,
  isL11CapRuleStructurallyValid,
} from '../contracts/formula-cap-rule';
import { L11ScoreFormulaDefinition } from '../contracts/score-formula';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';

export interface L11CapRuleValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

export function validateL11FormulaCapRules(
  formula: L11ScoreFormulaDefinition,
): L11CapRuleValidationResult {
  const issues: L11ScoreFormulaIssue[] = [];
  const seen = new Set<string>();
  for (const c of formula.cap_rules) {
    if (!c.cap_rule_id) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_CAP_RULE_UNDECLARED,
        'cap_rule_id missing',
        { formula_id: formula.formula_id },
      ));
      continue;
    }
    if (seen.has(c.cap_rule_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_CAP_RULE_INVALID,
        `duplicate cap_rule_id ${c.cap_rule_id}`,
        { formula_id: formula.formula_id },
      ));
      continue;
    }
    seen.add(c.cap_rule_id);
    if (c.score_family !== formula.score_family) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_CAP_RULE_INVALID,
        `cap rule family ${c.score_family} != formula family ${formula.score_family}`,
        { formula_id: formula.formula_id },
      ));
    }
    const v = isL11CapRuleStructurallyValid(c as L11FormulaCapRule);
    if (!v.ok) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_CAP_RULE_INVALID,
        `cap rule structurally invalid: ${v.reason}`,
        { formula_id: formula.formula_id },
      ));
    }
  }
  return { ok: issues.length === 0, issues };
}
