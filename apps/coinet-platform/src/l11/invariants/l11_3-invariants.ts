/**
 * L11.3 — Formula Law Invariants (§11.3.22)
 *
 * Eight machine-enforced invariants that prove the L11.3 formula
 * catalogue is complete, deterministic, and direction-safe.
 *
 *   INV-11.3-A  formula coverage law
 *   INV-11.3-B  reserved-family embargo law
 *   INV-11.3-C  direction consistency law
 *   INV-11.3-D  component completeness law
 *   INV-11.3-E  weight legality law
 *   INV-11.3-F  cap/penalty/modifier/missing-data law
 *   INV-11.3-G  deterministic evaluation law
 *   INV-11.3-H  non-judgment formula law
 */

import {
  L11_PRODUCTION_SCORE_FAMILIES,
  L11_RESERVED_SCORE_FAMILIES,
} from '../contracts/score-family';
import { L11_REQUIRED_DIRECTION_BY_FAMILY } from '../contracts/score-direction';
import {
  L11ScoreFormulaDefinition,
  canonicalScoreFormulaReplayHash,
} from '../contracts/score-formula';
import {
  L11FormulaEvaluationResult,
  canonicalFormulaEvaluationReplayHash,
} from '../contracts/formula-evaluation-result';
import { L11FormulaStatus } from '../contracts/formula-status';
import { isL11WeightSumLegal } from '../contracts/formula-weight-profile';
import { isL11CapRuleStructurallyValid } from '../contracts/formula-cap-rule';
import { isL11PenaltyRuleStructurallyValid } from '../contracts/formula-penalty-rule';
import { isL11ModifierRuleStructurallyValid } from '../contracts/formula-modifier-rule';
import {
  isL11MissingDataRuleLegal,
  ALL_L11_INPUT_CONDITION_CLASSES,
} from '../contracts/formula-missing-data-rule';

import { L11_PRODUCTION_FORMULAS } from '../contracts/formula-catalogue';
import { validateL11ScoreFormulaDefinition } from '../validation/score-formula.validator';
import { validateL11FormulaEvaluationResult } from '../validation/formula-evaluation-result.validator';
import { validateL11FormulaFamilyConsistency } from '../validation/formula-family-consistency.validator';

// ── Forbidden phrase scanner reused for §11.3.22 INV-11.3-H ──
const FORBIDDEN_FORMULA_PHRASES: readonly RegExp[] = [
  /\bbuy\b/i, /\bsell\b/i, /\blong\b/i, /\bshort\b/i,
  /\benter\s+now\b/i, /\bexit\s+now\b/i,
  /\brecommend(?:s|ed)?\b/i, /\brecommendation\b/i,
  /\btrade\s+action\b/i, /\bplace\s+(?:trade|order)\b/i,
  /\bportfolio\s+allocation\b/i,
  /\bfinal\s+judgment\b/i, /\bfinal\s+answer\b/i, /\bfinal\s+decision\b/i,
  /\bscenario\s+winner\b/i, /\bbest\s+trade\b/i, /\bbest\s+opportunity\b/i,
  /\bguaranteed\b/i,
];

export interface L11_3InvariantResult {
  readonly invariant_id: string;
  readonly title: string;
  readonly ok: boolean;
  readonly violations: readonly string[];
}

export interface L11_3InvariantSuiteResult {
  readonly ok: boolean;
  readonly results: readonly L11_3InvariantResult[];
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.3-A — formula coverage law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_3_A_FormulaCoverage(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11_3InvariantResult {
  const violations: string[] = [];
  const consistency = validateL11FormulaFamilyConsistency(formulas);
  for (const i of consistency.issues) {
    violations.push(`${i.code}: ${i.message}`);
  }
  for (const fam of L11_PRODUCTION_SCORE_FAMILIES) {
    const c = consistency.production_count_by_family[fam] ?? 0;
    if (c !== 1) {
      violations.push(`family ${fam} expected exactly 1 production formula, got ${c}`);
    }
  }
  return {
    invariant_id: 'INV-11.3-A',
    title: 'formula coverage law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.3-B — reserved-family embargo law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_3_B_ReservedEmbargo(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11_3InvariantResult {
  const violations: string[] = [];
  const reservedSet = new Set<string>(L11_RESERVED_SCORE_FAMILIES);
  for (const f of formulas) {
    if (reservedSet.has(f.score_family) &&
        f.formula_status === L11FormulaStatus.PRODUCTION_ENABLED) {
      violations.push(
        `reserved family ${f.score_family} has PRODUCTION_ENABLED formula ${f.formula_id}`,
      );
    }
  }
  return {
    invariant_id: 'INV-11.3-B',
    title: 'reserved-family embargo law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.3-C — direction consistency law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_3_C_DirectionConsistency(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11_3InvariantResult {
  const violations: string[] = [];
  for (const f of formulas) {
    const required = L11_REQUIRED_DIRECTION_BY_FAMILY[f.score_family];
    if (!required) continue;
    if (f.score_direction !== required) {
      violations.push(
        `formula ${f.formula_id} direction ${f.score_direction} != required ${required} for family ${f.score_family}`,
      );
    }
  }
  return {
    invariant_id: 'INV-11.3-C',
    title: 'direction consistency law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.3-D — component completeness law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_3_D_ComponentCompleteness(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11_3InvariantResult {
  const violations: string[] = [];
  for (const f of formulas) {
    if (f.component_definitions.length === 0) {
      violations.push(`formula ${f.formula_id} has no components`);
    }
    if (f.required_input_surfaces.length === 0) {
      violations.push(`formula ${f.formula_id} has no required input surfaces`);
    }
    for (const c of f.component_definitions) {
      if (!c.normalizer_id || !c.normalizer_version) {
        violations.push(`formula ${f.formula_id} component ${c.component_id} missing normalizer`);
      }
      if (c.min_value !== 0 || c.max_value !== 100) {
        violations.push(`formula ${f.formula_id} component ${c.component_id} bounds [${c.min_value},${c.max_value}] != [0,100]`);
      }
      if (!c.attribution_required) {
        violations.push(`formula ${f.formula_id} component ${c.component_id} attribution_required=false`);
      }
    }
  }
  return {
    invariant_id: 'INV-11.3-D',
    title: 'component completeness law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.3-E — weight legality law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_3_E_WeightLegality(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11_3InvariantResult {
  const violations: string[] = [];
  for (const f of formulas) {
    const wp = f.weight_profile;
    if (!wp) {
      violations.push(`formula ${f.formula_id} missing weight profile`);
      continue;
    }
    const r = isL11WeightSumLegal(wp);
    if (!r.ok) {
      violations.push(`formula ${f.formula_id} weight profile invalid: ${r.reason}`);
    }
    for (const c of f.component_definitions) {
      if (c.required_for_formula && !(c.component_id in wp.component_weights)) {
        violations.push(`formula ${f.formula_id} required component ${c.component_id} missing from weight profile`);
      }
    }
  }
  return {
    invariant_id: 'INV-11.3-E',
    title: 'weight legality law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.3-F — cap / penalty / modifier / missing-data law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_3_F_CapPenaltyModifierMissingData(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11_3InvariantResult {
  const violations: string[] = [];
  for (const f of formulas) {
    if (f.cap_rules.length === 0) {
      violations.push(`formula ${f.formula_id} declares no cap rules`);
    }
    for (const c of f.cap_rules) {
      const r = isL11CapRuleStructurallyValid(c);
      if (!r.ok) violations.push(`formula ${f.formula_id} cap ${c.cap_rule_id} invalid: ${r.reason}`);
    }
    for (const p of f.penalty_rules) {
      const r = isL11PenaltyRuleStructurallyValid(p);
      if (!r.ok) violations.push(`formula ${f.formula_id} penalty ${p.penalty_rule_id} invalid: ${r.reason}`);
    }
    for (const m of f.modifier_rules) {
      const r = isL11ModifierRuleStructurallyValid(m);
      if (!r.ok) violations.push(`formula ${f.formula_id} modifier ${m.modifier_rule_id} invalid: ${r.reason}`);
    }
    const conditionsCovered = new Set(f.missing_data_rules.map(r => r.input_condition));
    for (const c of ALL_L11_INPUT_CONDITION_CLASSES) {
      if (!conditionsCovered.has(c)) {
        violations.push(`formula ${f.formula_id} missing rule for condition ${c}`);
      }
    }
    for (const r of f.missing_data_rules) {
      const v = isL11MissingDataRuleLegal(r);
      if (!v.ok) violations.push(`formula ${f.formula_id} missing-data rule ${r.missing_data_rule_id} illegal: ${v.reason}`);
    }
  }
  return {
    invariant_id: 'INV-11.3-F',
    title: 'cap/penalty/modifier/missing-data law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.3-G — deterministic evaluation law
// ─────────────────────────────────────────────────────────────────────

/**
 * Identical formula material produces identical replay hash; identical
 * evaluation material produces identical evaluation replay hash. Any
 * material change must flip the hash. Caller may pass an optional
 * evaluation/formula pair to verify.
 */
export function checkInvariantL11_3_G_DeterministicEvaluation(opts: {
  readonly formulas?: readonly L11ScoreFormulaDefinition[];
  readonly evaluation_pairs?: readonly {
    formula: L11ScoreFormulaDefinition;
    result: L11FormulaEvaluationResult;
  }[];
} = {}): L11_3InvariantResult {
  const violations: string[] = [];
  const formulas = opts.formulas ?? L11_PRODUCTION_FORMULAS;

  for (const f of formulas) {
    const h1 = canonicalScoreFormulaReplayHash(f);
    const h2 = canonicalScoreFormulaReplayHash(f);
    if (h1 !== h2) {
      violations.push(`formula ${f.formula_id} replay hash not deterministic`);
    }
    const formulaResult = validateL11ScoreFormulaDefinition(f);
    if (!formulaResult.ok) {
      violations.push(`formula ${f.formula_id} fails its own validator`);
    }
  }

  for (const pair of opts.evaluation_pairs ?? []) {
    const h1 = canonicalFormulaEvaluationReplayHash(pair.result);
    const h2 = canonicalFormulaEvaluationReplayHash(pair.result);
    if (h1 !== h2) {
      violations.push(`evaluation ${pair.result.formula_id} replay hash not deterministic`);
    }
    const r = validateL11FormulaEvaluationResult(pair.result, pair.formula);
    if (!r.ok) {
      for (const i of r.issues) {
        violations.push(`[eval ${pair.result.formula_id}] ${i.code}: ${i.message}`);
      }
    }
  }

  return {
    invariant_id: 'INV-11.3-G',
    title: 'deterministic evaluation law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.3-H — non-judgment formula law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_3_H_NonJudgment(
  formulas: readonly L11ScoreFormulaDefinition[] = L11_PRODUCTION_FORMULAS,
): L11_3InvariantResult {
  const violations: string[] = [];
  for (const f of formulas) {
    const texts: string[] = [];
    for (const c of f.cap_rules) {
      texts.push(c.trigger_condition.description);
      texts.push(c.reason_code);
    }
    for (const p of f.penalty_rules) texts.push(p.reason_code);
    for (const m of f.modifier_rules) {
      texts.push(m.description);
      texts.push(m.trigger_code);
    }
    for (const r of f.missing_data_rules) texts.push(r.reason_code);

    for (const t of texts) {
      if (!t) continue;
      for (const re of FORBIDDEN_FORMULA_PHRASES) {
        if (re.test(t)) {
          violations.push(`formula ${f.formula_id} contains forbidden phrase matched by ${re} in: "${t}"`);
        }
      }
    }
  }
  return {
    invariant_id: 'INV-11.3-H',
    title: 'non-judgment formula law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Suite runner
// ─────────────────────────────────────────────────────────────────────

export function runAllL11_3Invariants(opts: {
  readonly formulas?: readonly L11ScoreFormulaDefinition[];
  readonly evaluation_pairs?: readonly {
    formula: L11ScoreFormulaDefinition;
    result: L11FormulaEvaluationResult;
  }[];
} = {}): L11_3InvariantSuiteResult {
  const results = [
    checkInvariantL11_3_A_FormulaCoverage(opts.formulas),
    checkInvariantL11_3_B_ReservedEmbargo(opts.formulas),
    checkInvariantL11_3_C_DirectionConsistency(opts.formulas),
    checkInvariantL11_3_D_ComponentCompleteness(opts.formulas),
    checkInvariantL11_3_E_WeightLegality(opts.formulas),
    checkInvariantL11_3_F_CapPenaltyModifierMissingData(opts.formulas),
    checkInvariantL11_3_G_DeterministicEvaluation(opts),
    checkInvariantL11_3_H_NonJudgment(opts.formulas),
  ];
  return {
    ok: results.every(r => r.ok),
    results,
  };
}
