/**
 * L11.3 — Penalty Rule Validator (§11.3.6.1)
 */

import { isL11PenaltyRuleStructurallyValid } from '../contracts/formula-penalty-rule';
import { L11ScoreFormulaDefinition } from '../contracts/score-formula';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';

export interface L11PenaltyRuleValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

export function validateL11FormulaPenaltyRules(
  formula: L11ScoreFormulaDefinition,
): L11PenaltyRuleValidationResult {
  const issues: L11ScoreFormulaIssue[] = [];
  const componentIds = new Set(formula.component_definitions.map(c => c.component_id));
  const seen = new Set<string>();
  for (const p of formula.penalty_rules) {
    if (!p.penalty_rule_id) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_PENALTY_RULE_UNDECLARED,
        'penalty_rule_id missing',
        { formula_id: formula.formula_id },
      ));
      continue;
    }
    if (seen.has(p.penalty_rule_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_PENALTY_RULE_INVALID,
        `duplicate penalty_rule_id ${p.penalty_rule_id}`,
        { formula_id: formula.formula_id },
      ));
      continue;
    }
    seen.add(p.penalty_rule_id);
    if (p.score_family !== formula.score_family) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_PENALTY_RULE_INVALID,
        `penalty family ${p.score_family} != formula family ${formula.score_family}`,
        { formula_id: formula.formula_id },
      ));
    }
    const v = isL11PenaltyRuleStructurallyValid(p);
    if (!v.ok) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_PENALTY_RULE_INVALID,
        `penalty structurally invalid: ${v.reason}`,
        { formula_id: formula.formula_id },
      ));
    }
    for (const cid of p.affected_component_ids) {
      if (!componentIds.has(cid)) {
        issues.push(makeL11ScoreFormulaIssue(
          L11ScoreFormulaViolationCode.L11F_PENALTY_RULE_INVALID,
          `penalty references unknown component_id ${cid}`,
          { formula_id: formula.formula_id, component_id: cid },
        ));
      }
    }
  }
  return { ok: issues.length === 0, issues };
}
