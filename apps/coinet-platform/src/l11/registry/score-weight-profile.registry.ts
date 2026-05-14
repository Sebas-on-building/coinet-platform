/**
 * L11.3 — Weight Profile Registry (§11.3.18)
 */

import {
  L11FormulaWeightProfile,
  isL11WeightSumLegal,
} from '../contracts/formula-weight-profile';
import {
  L11ScoreFormulaDefinition,
} from '../contracts/score-formula';
import {
  L11_PRODUCTION_FORMULAS,
} from '../contracts/formula-catalogue';
import { L11ScoreFamily } from '../contracts/score-family';

export interface L11WeightProfileRegistryIssue {
  readonly formula_id: string | null;
  readonly weight_profile_id: string | null;
  readonly reason: string;
}

export interface L11WeightProfileRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly issues: readonly L11WeightProfileRegistryIssue[];
}

export function buildL11WeightProfileRegistryReport(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11WeightProfileRegistryReport {
  const issues: L11WeightProfileRegistryIssue[] = [];
  const seen = new Set<string>();

  for (const f of formulas) {
    const wp = f.weight_profile;
    if (seen.has(wp.weight_profile_id)) {
      issues.push({
        formula_id: f.formula_id, weight_profile_id: wp.weight_profile_id,
        reason: 'duplicate weight_profile_id',
      });
      continue;
    }
    seen.add(wp.weight_profile_id);

    if (wp.score_family !== f.score_family) {
      issues.push({
        formula_id: f.formula_id, weight_profile_id: wp.weight_profile_id,
        reason: `weight profile family ${wp.score_family} != formula family ${f.score_family}`,
      });
    }
    const sumCheck = isL11WeightSumLegal(wp);
    if (!sumCheck.ok) {
      issues.push({
        formula_id: f.formula_id, weight_profile_id: wp.weight_profile_id,
        reason: `weight sum invalid: ${sumCheck.reason}`,
      });
    }

    // Required components must have a weight present in component_weights
    for (const c of f.component_definitions) {
      if (c.required_for_formula && !(c.component_id in wp.component_weights)) {
        issues.push({
          formula_id: f.formula_id, weight_profile_id: wp.weight_profile_id,
          reason: `required component ${c.component_id} missing from weight profile`,
        });
      }
    }
  }

  return { ok: issues.length === 0, count: seen.size, issues };
}

export function getL11WeightProfileForFamily(
  family: L11ScoreFamily,
): L11FormulaWeightProfile | null {
  const f = L11_PRODUCTION_FORMULAS.find(x => x.score_family === family);
  return f ? f.weight_profile : null;
}
