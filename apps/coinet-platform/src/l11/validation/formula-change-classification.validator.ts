/**
 * L11.7 — Formula change classification validator (§11.7.13.1)
 */

import {
  L11FormulaChangeClassification,
  ALL_L11_FORMULA_CHANGE_CLASSIFICATIONS,
  isL11FormulaChangeProhibited,
} from '../contracts/formula-change-classification';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';

export function validateL11FormulaChangeClassification(
  classification: L11FormulaChangeClassification | undefined,
  ctx: { formula_change_assessment_id?: string } = {},
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  if (!classification) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_UNCLASSIFIED,
      'formula change classification missing',
      ctx));
    return issues;
  }
  if (!ALL_L11_FORMULA_CHANGE_CLASSIFICATIONS.includes(classification)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_UNCLASSIFIED,
      `unknown formula change classification ${classification}`,
      ctx));
    return issues;
  }
  if (isL11FormulaChangeProhibited(classification)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_PROHIBITED,
      'formula change classified PROHIBITED',
      ctx));
  }
  return issues;
}
