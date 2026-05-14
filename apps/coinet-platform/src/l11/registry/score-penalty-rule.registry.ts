/**
 * L11.3 — Penalty Rule Registry (§11.3.18)
 */

import {
  L11FormulaPenaltyRule,
  isL11PenaltyRuleStructurallyValid,
} from '../contracts/formula-penalty-rule';
import {
  L11ScoreFormulaDefinition,
} from '../contracts/score-formula';
import {
  L11_PRODUCTION_FORMULAS,
} from '../contracts/formula-catalogue';

export interface L11PenaltyRuleRegistryIssue {
  readonly formula_id: string | null;
  readonly penalty_rule_id: string | null;
  readonly reason: string;
}

export interface L11PenaltyRuleRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly issues: readonly L11PenaltyRuleRegistryIssue[];
}

export function buildL11PenaltyRuleRegistryReport(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11PenaltyRuleRegistryReport {
  const issues: L11PenaltyRuleRegistryIssue[] = [];
  const seen = new Set<string>();
  let count = 0;

  for (const f of formulas) {
    const componentIds = new Set(f.component_definitions.map(c => c.component_id));
    for (const p of f.penalty_rules) {
      count += 1;
      if (seen.has(p.penalty_rule_id)) {
        issues.push({ formula_id: f.formula_id, penalty_rule_id: p.penalty_rule_id, reason: 'duplicate penalty_rule_id' });
        continue;
      }
      seen.add(p.penalty_rule_id);
      if (p.score_family !== f.score_family) {
        issues.push({
          formula_id: f.formula_id, penalty_rule_id: p.penalty_rule_id,
          reason: `penalty family ${p.score_family} != formula family ${f.score_family}`,
        });
      }
      const v = isL11PenaltyRuleStructurallyValid(p);
      if (!v.ok) {
        issues.push({
          formula_id: f.formula_id, penalty_rule_id: p.penalty_rule_id,
          reason: `penalty structurally invalid: ${v.reason}`,
        });
      }
      for (const cid of p.affected_component_ids) {
        if (!componentIds.has(cid)) {
          issues.push({
            formula_id: f.formula_id, penalty_rule_id: p.penalty_rule_id,
            reason: `affected component_id ${cid} not in formula`,
          });
        }
      }
    }
  }
  return { ok: issues.length === 0, count, issues };
}

export function getL11PenaltyRulesForFormula(
  formula_id: string,
): readonly L11FormulaPenaltyRule[] {
  const f = L11_PRODUCTION_FORMULAS.find(x => x.formula_id === formula_id);
  return f ? f.penalty_rules : [];
}
