/**
 * L11.3 — Score Formula Validator (§11.3.3 / §11.3.19)
 *
 * Top-level validator that combines component, weight, cap, penalty,
 * modifier, and missing-data validators with formula-level identity
 * checks.
 */

import {
  L11ScoreFormulaDefinition,
  canonicalScoreFormulaReplayHash,
} from '../contracts/score-formula';
import {
  L11FormulaStatus,
  formulaStatusAllowsCurrentEmission,
} from '../contracts/formula-status';
import {
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts/score-direction';
import { isL11ReservedScoreFamily } from '../contracts/score-family';
import { L11DependencySurfaceClass } from '../contracts/l11-constitutional-types';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';
import { validateL11ScoreComponentDefinition } from './score-component.validator';
import { validateL11FormulaWeightProfile } from './score-weight-profile.validator';
import { validateL11FormulaCapRules } from './score-cap-rule.validator';
import { validateL11FormulaPenaltyRules } from './score-penalty-rule.validator';
import { validateL11FormulaModifierRules } from './score-modifier-rule.validator';
import { validateL11FormulaMissingDataRules } from './score-missing-data-rule.validator';

const KNOWN_SURFACE_CLASSES: ReadonlySet<L11DependencySurfaceClass> =
  new Set(Object.values(L11DependencySurfaceClass));

export interface L11FormulaValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

export function validateL11ScoreFormulaDefinition(
  f: L11ScoreFormulaDefinition,
): L11FormulaValidationResult {
  const issues: L11ScoreFormulaIssue[] = [];

  // ── Identity ──
  if (!f.formula_id) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_ID_MISSING,
      'formula_id missing',
    ));
  }
  if (!f.formula_version) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_VERSION_MISSING,
      'formula_version missing',
      { formula_id: f.formula_id },
    ));
  }
  if (!f.formula_status) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_STATUS_MISSING,
      'formula_status missing',
      { formula_id: f.formula_id },
    ));
  }

  // ── Reserved-family embargo ──
  if (isL11ReservedScoreFamily(f.score_family) &&
      f.formula_status === L11FormulaStatus.PRODUCTION_ENABLED) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_RESERVED_FAMILY_HAS_FORMULA,
      `reserved family ${f.score_family} cannot have a production formula`,
      { formula_id: f.formula_id, score_family: f.score_family },
    ));
  }

  // ── Direction integrity ──
  if (!f.score_direction) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_DIRECTION_MISSING,
      'score_direction missing',
      { formula_id: f.formula_id },
    ));
  } else {
    const required = L11_REQUIRED_DIRECTION_BY_FAMILY[f.score_family];
    if (required && f.score_direction !== required) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_FORMULA_DIRECTION_MISMATCH,
        `formula direction ${f.score_direction} does not match required direction ${required} for family ${f.score_family}`,
        { formula_id: f.formula_id, score_family: f.score_family },
      ));
    }
  }

  // ── Calibration & band policy refs ──
  if (!f.calibration_target_ref) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_CALIBRATION_TARGET_MISSING,
      'calibration_target_ref missing',
      { formula_id: f.formula_id },
    ));
  }
  if (!f.output_band_policy_ref) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_OUTPUT_BAND_POLICY_MISSING,
      'output_band_policy_ref missing',
      { formula_id: f.formula_id },
    ));
  }

  // ── Required input surfaces present and registered ──
  if (f.required_input_surfaces.length === 0) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_REQUIRED_INPUT_SURFACE_MISSING,
      'no required input surfaces declared',
      { formula_id: f.formula_id },
    ));
  }
  for (const s of [
    ...f.required_input_surfaces,
    ...f.optional_input_surfaces,
    ...f.evidence_only_input_surfaces,
  ]) {
    if (!KNOWN_SURFACE_CLASSES.has(s.surface_class)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_UNREGISTERED_INPUT_SURFACE,
        `unregistered surface_class ${s.surface_class}`,
        { formula_id: f.formula_id },
      ));
    }
  }

  // ── Components ──
  if (f.component_definitions.length === 0) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_COMPONENT_MISSING,
      'formula has no components',
      { formula_id: f.formula_id },
    ));
  }
  const seenComponentIds = new Set<string>();
  for (const c of f.component_definitions) {
    if (seenComponentIds.has(c.component_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_COMPONENT_DUPLICATE,
        `duplicate component_id ${c.component_id}`,
        { formula_id: f.formula_id, component_id: c.component_id },
      ));
    } else {
      seenComponentIds.add(c.component_id);
    }
    issues.push(...validateL11ScoreComponentDefinition(c, f.score_family, f.formula_id).issues);
  }

  // ── Weight profile ──
  issues.push(...validateL11FormulaWeightProfile(f).issues);
  // ── Cap / penalty / modifier / missing-data ──
  issues.push(...validateL11FormulaCapRules(f).issues);
  issues.push(...validateL11FormulaPenaltyRules(f).issues);
  issues.push(...validateL11FormulaModifierRules(f).issues);
  issues.push(...validateL11FormulaMissingDataRules(f).issues);

  // ── Replay hash determinism (recomputes hash and ensures a non-empty string)
  const recomputed = canonicalScoreFormulaReplayHash(f);
  if (!recomputed || !recomputed.startsWith('l11f.h.')) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_REPLAY_HASH_MISSING,
      'formula replay hash could not be computed',
      { formula_id: f.formula_id },
    ));
  }

  // ── Production status legality ──
  if (f.formula_status === L11FormulaStatus.PRODUCTION_ENABLED &&
      isL11ReservedScoreFamily(f.score_family)) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_STATUS_NOT_PRODUCTION,
      'production formula cannot belong to reserved family',
      { formula_id: f.formula_id },
    ));
  }
  if (f.formula_status &&
      ![L11FormulaStatus.PRODUCTION_ENABLED,
        L11FormulaStatus.SHADOW_ONLY,
        L11FormulaStatus.EXPERIMENTAL_BLOCKED,
        L11FormulaStatus.DEPRECATED,
        L11FormulaStatus.FROZEN].includes(f.formula_status)) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_STATUS_NOT_PRODUCTION,
      `unknown formula_status ${f.formula_status}`,
      { formula_id: f.formula_id },
    ));
  }
  // Track whether status would allow emission — informative only
  void formulaStatusAllowsCurrentEmission;

  return { ok: issues.length === 0, issues };
}
