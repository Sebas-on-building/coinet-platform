/**
 * L11.3 — Score Component Validator (§11.3.4 / §11.3.19)
 */

import {
  L11ScoreComponentDefinition,
  L11ScoreComponentRole,
  L11ComponentDirectionClass,
  isL11ComponentBoundedZeroToHundred,
} from '../contracts/score-component';
import { L11ScoreFamily } from '../contracts/score-family';
import { L11DependencySurfaceClass } from '../contracts/l11-constitutional-types';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';

const KNOWN_SURFACE_CLASSES: ReadonlySet<L11DependencySurfaceClass> =
  new Set(Object.values(L11DependencySurfaceClass));

export interface L11ComponentValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

export function validateL11ScoreComponentDefinition(
  c: L11ScoreComponentDefinition,
  formulaFamily: L11ScoreFamily,
  formulaId: string,
): L11ComponentValidationResult {
  const issues: L11ScoreFormulaIssue[] = [];
  if (!c.component_id) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_COMPONENT_MISSING,
      'component_id missing', { formula_id: formulaId },
    ));
  }
  if (c.score_family !== formulaFamily) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_COMPONENT_FAMILY_MISMATCH,
      `component family ${c.score_family} != formula family ${formulaFamily}`,
      { formula_id: formulaId, component_id: c.component_id },
    ));
  }
  if (!isL11ComponentBoundedZeroToHundred(c)) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_COMPONENT_OUT_OF_BOUNDS,
      `component bounds [${c.min_value},${c.max_value}] not [0,100]`,
      { formula_id: formulaId, component_id: c.component_id },
    ));
  }
  if (!c.normalizer_id || !c.normalizer_version) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_COMPONENT_NORMALIZER_MISSING,
      'normalizer_id/version missing',
      { formula_id: formulaId, component_id: c.component_id },
    ));
  }
  if (c.required_for_formula && !(c.weight > 0)) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_COMPONENT_REQUIRED_ZERO_WEIGHT,
      `required component ${c.component_id} has weight ${c.weight}`,
      { formula_id: formulaId, component_id: c.component_id },
    ));
  }
  if (!c.attribution_required) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_COMPONENT_ATTRIBUTION_REQUIRED,
      `component ${c.component_id} must require attribution`,
      { formula_id: formulaId, component_id: c.component_id },
    ));
  }

  // Direction sanity
  const dir = c.component_direction;
  const role = c.component_role;
  if (role === L11ScoreComponentRole.PENALTY_COMPONENT &&
      dir !== L11ComponentDirectionClass.HIGHER_REDUCES_SCORE &&
      dir !== L11ComponentDirectionClass.HIGHER_INCREASES_RISK_SCORE &&
      dir !== L11ComponentDirectionClass.FAMILY_DIRECTION_INVERTED) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_COMPONENT_DIRECTION_MISMATCH,
      `penalty component ${c.component_id} has incompatible direction ${dir}`,
      { formula_id: formulaId, component_id: c.component_id },
    ));
  }

  // Input surface registration
  for (const s of [...c.required_input_surfaces, ...c.optional_input_surfaces]) {
    if (!KNOWN_SURFACE_CLASSES.has(s.surface_class)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_UNREGISTERED_INPUT_SURFACE,
        `unregistered surface_class ${s.surface_class}`,
        { formula_id: formulaId, component_id: c.component_id },
      ));
    }
    if (s.evidence_only && c.required_for_formula) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_EVIDENCE_ONLY_USED_AS_DECISIVE,
        `required component ${c.component_id} cannot consume evidence-only surface ${s.surface_class}`,
        { formula_id: formulaId, component_id: c.component_id },
      ));
    }
  }

  return { ok: issues.length === 0, issues };
}
