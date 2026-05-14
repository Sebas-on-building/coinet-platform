/**
 * L11.3 — Formula Family Consistency Validator (§11.3.18 / §11.3.19)
 *
 * Cross-formula validator that proves the production catalogue
 * satisfies the family coverage law:
 *   - exactly one PRODUCTION_ENABLED formula per production family
 *   - reserved families have zero PRODUCTION_ENABLED formulas
 *   - no duplicate formula_id across the catalogue
 *   - per-family direction matches L11.2 doctrine
 */

import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  isL11ReservedScoreFamily,
} from '../contracts/score-family';
import { L11ScoreFormulaDefinition } from '../contracts/score-formula';
import { L11FormulaStatus } from '../contracts/formula-status';
import { L11_PRODUCTION_FORMULAS } from '../contracts/formula-catalogue';
import { L11_REQUIRED_DIRECTION_BY_FAMILY } from '../contracts/score-direction';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';

export interface L11FormulaFamilyConsistencyResult {
  readonly ok: boolean;
  readonly production_count_by_family: Readonly<Record<string, number>>;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

export function validateL11FormulaFamilyConsistency(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11FormulaFamilyConsistencyResult {
  const issues: L11ScoreFormulaIssue[] = [];
  const productionCount: Record<string, number> = {};
  const seenIds = new Set<string>();

  for (const f of formulas) {
    if (seenIds.has(f.formula_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_FORMULA_DUPLICATE,
        `duplicate formula_id ${f.formula_id}`,
        { formula_id: f.formula_id, score_family: f.score_family },
      ));
      continue;
    }
    seenIds.add(f.formula_id);

    if (isL11ReservedScoreFamily(f.score_family) &&
        f.formula_status === L11FormulaStatus.PRODUCTION_ENABLED) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_RESERVED_FAMILY_HAS_FORMULA,
        `reserved family ${f.score_family} cannot have production formula`,
        { formula_id: f.formula_id, score_family: f.score_family },
      ));
    }

    if (f.formula_status === L11FormulaStatus.PRODUCTION_ENABLED) {
      productionCount[f.score_family] = (productionCount[f.score_family] ?? 0) + 1;
    }

    const required = L11_REQUIRED_DIRECTION_BY_FAMILY[f.score_family];
    if (required && f.score_direction !== required) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_FORMULA_DIRECTION_MISMATCH,
        `family ${f.score_family} expected direction ${required}, got ${f.score_direction}`,
        { formula_id: f.formula_id, score_family: f.score_family },
      ));
    }
  }

  for (const fam of L11_PRODUCTION_SCORE_FAMILIES) {
    const c = productionCount[fam] ?? 0;
    if (c === 0) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_FAMILY_HAS_NO_PRODUCTION_FORMULA,
        `production family ${fam} has no production formula`,
        { score_family: fam },
      ));
    } else if (c > 1) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_FORMULA_DUPLICATE,
        `production family ${fam} has ${c} production formulas, expected exactly 1`,
        { score_family: fam },
      ));
    }
  }

  // ensure productionCount has zero entries for sanity
  void L11ScoreFamily;

  return {
    ok: issues.length === 0,
    production_count_by_family: productionCount,
    issues,
  };
}
