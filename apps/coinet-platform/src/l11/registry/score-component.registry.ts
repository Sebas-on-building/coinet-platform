/**
 * L11.3 — Score Component Registry (§11.3.18)
 *
 * Aggregates components across the production formula catalogue and
 * enforces:
 *   - no duplicate component_id within a single formula (the
 *     registry permits the same component_id to recur across
 *     different formulas because each formula carries its own
 *     normalisation contract)
 *   - bounded value ranges
 *   - normalizer references present
 *   - required components have weight > 0
 */

import {
  L11ScoreComponentDefinition,
  isL11ComponentBoundedZeroToHundred,
} from '../contracts/score-component';
import {
  L11ScoreFormulaDefinition,
} from '../contracts/score-formula';
import {
  L11_PRODUCTION_FORMULAS,
} from '../contracts/formula-catalogue';
import { L11ScoreFamily } from '../contracts/score-family';

export interface L11ComponentRegistryIssue {
  readonly formula_id: string | null;
  readonly component_id: string | null;
  readonly reason: string;
}

export interface L11ComponentRegistryReport {
  readonly ok: boolean;
  readonly total_components: number;
  readonly issues: readonly L11ComponentRegistryIssue[];
}

export function buildL11ComponentRegistryReport(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11ComponentRegistryReport {
  const issues: L11ComponentRegistryIssue[] = [];
  let total = 0;

  for (const f of formulas) {
    const seen = new Set<string>();
    for (const c of f.component_definitions) {
      total += 1;
      if (seen.has(c.component_id)) {
        issues.push({
          formula_id: f.formula_id, component_id: c.component_id,
          reason: 'duplicate component_id within formula',
        });
        continue;
      }
      seen.add(c.component_id);

      if (!c.normalizer_id || !c.normalizer_version) {
        issues.push({
          formula_id: f.formula_id, component_id: c.component_id,
          reason: 'normalizer_id/version missing',
        });
      }
      if (!isL11ComponentBoundedZeroToHundred(c)) {
        issues.push({
          formula_id: f.formula_id, component_id: c.component_id,
          reason: `component bounds [${c.min_value},${c.max_value}] not [0,100]`,
        });
      }
      if (c.required_for_formula && c.weight <= 0) {
        issues.push({
          formula_id: f.formula_id, component_id: c.component_id,
          reason: 'required component has zero or negative weight',
        });
      }
      if (c.score_family !== f.score_family) {
        issues.push({
          formula_id: f.formula_id, component_id: c.component_id,
          reason: `component family ${c.score_family} != formula family ${f.score_family}`,
        });
      }
    }
  }

  return { ok: issues.length === 0, total_components: total, issues };
}

export function getL11ComponentsForFormula(
  family: L11ScoreFamily,
): readonly L11ScoreComponentDefinition[] {
  const f = L11_PRODUCTION_FORMULAS.find(x => x.score_family === family);
  return f ? f.component_definitions : [];
}
