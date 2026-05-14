/**
 * L11.3 — Score Formula Registry (§11.3.18)
 *
 * Authoritative registry of L11.3 production formulas.
 * Enforces:
 *   - exactly one production formula per production score family
 *   - no production formulas for reserved families
 *   - no duplicate formula_id
 *   - formula version uniqueness within a family
 *   - production formula must be PRODUCTION_ENABLED status
 */

import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  isL11ReservedScoreFamily,
} from '../contracts/score-family';
import {
  L11ScoreFormulaDefinition,
} from '../contracts/score-formula';
import {
  L11_PRODUCTION_FORMULAS,
  getL11ProductionFormulaForFamily,
} from '../contracts/formula-catalogue';
import {
  L11FormulaStatus,
  formulaStatusAllowsCurrentEmission,
} from '../contracts/formula-status';

export interface L11FormulaRegistryIssue {
  readonly family: L11ScoreFamily | null;
  readonly formula_id: string | null;
  readonly reason: string;
}

export interface L11FormulaRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly production_formula_ids_by_family: Readonly<Record<string, string>>;
  readonly issues: readonly L11FormulaRegistryIssue[];
}

export function buildL11FormulaRegistryReport(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11FormulaRegistryReport {
  const issues: L11FormulaRegistryIssue[] = [];
  const seenIds = new Set<string>();
  const formulasByFamily: Record<string, string[]> = {};
  const productionByFamily: Record<string, string> = {};

  for (const f of formulas) {
    if (seenIds.has(f.formula_id)) {
      issues.push({ family: f.score_family, formula_id: f.formula_id, reason: 'duplicate formula_id' });
      continue;
    }
    seenIds.add(f.formula_id);

    if (isL11ReservedScoreFamily(f.score_family) &&
        f.formula_status === L11FormulaStatus.PRODUCTION_ENABLED) {
      issues.push({
        family: f.score_family, formula_id: f.formula_id,
        reason: 'reserved family must not have production formula',
      });
    }

    if (f.formula_status === L11FormulaStatus.PRODUCTION_ENABLED) {
      const fam = f.score_family;
      if (productionByFamily[fam]) {
        issues.push({
          family: fam, formula_id: f.formula_id,
          reason: `family ${fam} has more than one production formula (${productionByFamily[fam]} and ${f.formula_id})`,
        });
      } else {
        productionByFamily[fam] = f.formula_id;
      }
    }

    formulasByFamily[f.score_family] ??= [];
    formulasByFamily[f.score_family].push(f.formula_version);

    if (!formulaStatusAllowsCurrentEmission(f.formula_status) &&
        f.formula_status !== L11FormulaStatus.SHADOW_ONLY &&
        f.formula_status !== L11FormulaStatus.EXPERIMENTAL_BLOCKED &&
        f.formula_status !== L11FormulaStatus.DEPRECATED) {
      issues.push({
        family: f.score_family, formula_id: f.formula_id,
        reason: `unknown formula_status ${f.formula_status}`,
      });
    }
  }

  // Each production family must have exactly one production formula
  for (const fam of L11_PRODUCTION_SCORE_FAMILIES) {
    if (!productionByFamily[fam]) {
      issues.push({
        family: fam, formula_id: null,
        reason: `production family ${fam} has no production formula`,
      });
    }
  }

  // Version uniqueness within family
  for (const fam of Object.keys(formulasByFamily)) {
    const versions = formulasByFamily[fam];
    const uniq = new Set(versions);
    if (uniq.size !== versions.length) {
      issues.push({
        family: fam as L11ScoreFamily, formula_id: null,
        reason: `family ${fam} has duplicate formula_version`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    count: formulas.length,
    production_formula_ids_by_family: productionByFamily,
    issues,
  };
}

export function getL11FormulaById(
  formula_id: string,
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11ScoreFormulaDefinition | null {
  return formulas.find(f => f.formula_id === formula_id) ?? null;
}

export function getL11ProductionFormula(
  family: L11ScoreFamily,
): L11ScoreFormulaDefinition | null {
  return getL11ProductionFormulaForFamily(family) ?? null;
}
