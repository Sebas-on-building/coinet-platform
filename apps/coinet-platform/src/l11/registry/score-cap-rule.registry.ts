/**
 * L11.3 — Cap Rule Registry (§11.3.18)
 */

import {
  L11FormulaCapRule,
  isL11CapRuleStructurallyValid,
} from '../contracts/formula-cap-rule';
import {
  L11ScoreFormulaDefinition,
} from '../contracts/score-formula';
import {
  L11_PRODUCTION_FORMULAS,
} from '../contracts/formula-catalogue';

export interface L11CapRuleRegistryIssue {
  readonly formula_id: string | null;
  readonly cap_rule_id: string | null;
  readonly reason: string;
}

export interface L11CapRuleRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly issues: readonly L11CapRuleRegistryIssue[];
}

export function buildL11CapRuleRegistryReport(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11CapRuleRegistryReport {
  const issues: L11CapRuleRegistryIssue[] = [];
  const seen = new Set<string>();
  let count = 0;
  for (const f of formulas) {
    for (const c of f.cap_rules) {
      count += 1;
      if (seen.has(c.cap_rule_id)) {
        issues.push({ formula_id: f.formula_id, cap_rule_id: c.cap_rule_id, reason: 'duplicate cap_rule_id' });
        continue;
      }
      seen.add(c.cap_rule_id);
      if (c.score_family !== f.score_family) {
        issues.push({
          formula_id: f.formula_id, cap_rule_id: c.cap_rule_id,
          reason: `cap rule family ${c.score_family} != formula family ${f.score_family}`,
        });
      }
      const v = isL11CapRuleStructurallyValid(c);
      if (!v.ok) {
        issues.push({
          formula_id: f.formula_id, cap_rule_id: c.cap_rule_id,
          reason: `cap rule structurally invalid: ${v.reason}`,
        });
      }
    }
  }
  return { ok: issues.length === 0, count, issues };
}

export function getL11CapRulesForFormula(
  formula_id: string,
): readonly L11FormulaCapRule[] {
  const f = L11_PRODUCTION_FORMULAS.find(x => x.formula_id === formula_id);
  return f ? f.cap_rules : [];
}
