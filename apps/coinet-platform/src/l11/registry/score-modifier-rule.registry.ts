/**
 * L11.3 — Modifier Rule Registry (§11.3.18)
 */

import {
  L11FormulaModifierRule,
  isL11ModifierRuleStructurallyValid,
} from '../contracts/formula-modifier-rule';
import {
  L11ScoreFormulaDefinition,
} from '../contracts/score-formula';
import {
  L11_PRODUCTION_FORMULAS,
} from '../contracts/formula-catalogue';

export interface L11ModifierRuleRegistryIssue {
  readonly formula_id: string | null;
  readonly modifier_rule_id: string | null;
  readonly reason: string;
}

export interface L11ModifierRuleRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly issues: readonly L11ModifierRuleRegistryIssue[];
}

export function buildL11ModifierRuleRegistryReport(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11ModifierRuleRegistryReport {
  const issues: L11ModifierRuleRegistryIssue[] = [];
  const seen = new Set<string>();
  let count = 0;

  for (const f of formulas) {
    for (const m of f.modifier_rules) {
      count += 1;
      if (seen.has(m.modifier_rule_id)) {
        issues.push({ formula_id: f.formula_id, modifier_rule_id: m.modifier_rule_id, reason: 'duplicate modifier_rule_id' });
        continue;
      }
      seen.add(m.modifier_rule_id);
      if (m.score_family !== f.score_family) {
        issues.push({
          formula_id: f.formula_id, modifier_rule_id: m.modifier_rule_id,
          reason: `modifier family ${m.score_family} != formula family ${f.score_family}`,
        });
      }
      const v = isL11ModifierRuleStructurallyValid(m);
      if (!v.ok) {
        issues.push({
          formula_id: f.formula_id, modifier_rule_id: m.modifier_rule_id,
          reason: `modifier structurally invalid: ${v.reason}`,
        });
      }
    }
  }
  return { ok: issues.length === 0, count, issues };
}

export function getL11ModifierRulesForFormula(
  formula_id: string,
): readonly L11FormulaModifierRule[] {
  const f = L11_PRODUCTION_FORMULAS.find(x => x.formula_id === formula_id);
  return f ? f.modifier_rules : [];
}
