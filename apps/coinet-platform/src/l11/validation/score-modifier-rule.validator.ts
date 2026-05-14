/**
 * L11.3 — Modifier Rule Validator (§11.3.6.5)
 */

import { isL11ModifierRuleStructurallyValid } from '../contracts/formula-modifier-rule';
import { L11ScoreFormulaDefinition } from '../contracts/score-formula';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';

export interface L11ModifierRuleValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

export function validateL11FormulaModifierRules(
  formula: L11ScoreFormulaDefinition,
): L11ModifierRuleValidationResult {
  const issues: L11ScoreFormulaIssue[] = [];
  const seen = new Set<string>();
  for (const m of formula.modifier_rules) {
    if (!m.modifier_rule_id) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MODIFIER_RULE_UNDECLARED,
        'modifier_rule_id missing',
        { formula_id: formula.formula_id },
      ));
      continue;
    }
    if (seen.has(m.modifier_rule_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MODIFIER_RULE_INVALID,
        `duplicate modifier_rule_id ${m.modifier_rule_id}`,
        { formula_id: formula.formula_id },
      ));
      continue;
    }
    seen.add(m.modifier_rule_id);
    if (m.score_family !== formula.score_family) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MODIFIER_RULE_INVALID,
        `modifier family ${m.score_family} != formula family ${formula.score_family}`,
        { formula_id: formula.formula_id },
      ));
    }
    const v = isL11ModifierRuleStructurallyValid(m);
    if (!v.ok) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MODIFIER_RULE_INVALID,
        `modifier structurally invalid: ${v.reason}`,
        { formula_id: formula.formula_id },
      ));
    }
  }
  return { ok: issues.length === 0, issues };
}
