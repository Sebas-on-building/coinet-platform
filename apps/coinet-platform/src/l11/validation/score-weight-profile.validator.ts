/**
 * L11.3 — Weight Profile Validator (§11.3.5 / §11.3.19)
 */

import {
  L11FormulaWeightProfile,
  isL11WeightSumLegal,
} from '../contracts/formula-weight-profile';
import { L11ScoreFormulaDefinition } from '../contracts/score-formula';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';

export interface L11WeightProfileValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

export function validateL11FormulaWeightProfile(
  formula: L11ScoreFormulaDefinition,
): L11WeightProfileValidationResult {
  const issues: L11ScoreFormulaIssue[] = [];
  const wp: L11FormulaWeightProfile | undefined = formula.weight_profile;
  if (!wp) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_WEIGHT_PROFILE_MISSING,
      'weight profile missing', { formula_id: formula.formula_id },
    ));
    return { ok: false, issues };
  }
  if (wp.score_family !== formula.score_family) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_WEIGHT_PROFILE_FAMILY_MISMATCH,
      `weight profile family ${wp.score_family} != formula family ${formula.score_family}`,
      { formula_id: formula.formula_id },
    ));
  }
  const sumCheck = isL11WeightSumLegal(wp);
  if (!sumCheck.ok) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_WEIGHT_SUM_INVALID,
      `weight sum invalid: ${sumCheck.reason}`,
      { formula_id: formula.formula_id },
    ));
  }
  // Hidden component weights — weight present but no matching component
  const componentIds = new Set(formula.component_definitions.map(c => c.component_id));
  for (const id of Object.keys(wp.component_weights)) {
    if (!componentIds.has(id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_HIDDEN_COMPONENT_WEIGHT,
        `weight profile references unknown component_id ${id}`,
        { formula_id: formula.formula_id, component_id: id },
      ));
    }
  }
  // Required components missing from weight profile
  for (const c of formula.component_definitions) {
    if (c.required_for_formula && !(c.component_id in wp.component_weights)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_HIDDEN_COMPONENT_WEIGHT,
        `required component ${c.component_id} missing from weight profile`,
        { formula_id: formula.formula_id, component_id: c.component_id },
      ));
    }
  }
  return { ok: issues.length === 0, issues };
}
