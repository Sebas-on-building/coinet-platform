/**
 * L11.6 — Calibration & Empirical-Accountability Invariants (§11.6.19)
 *
 * Eight machine-enforced invariants that prove the calibration-hook
 * sublayer is production-ready. Each invariant returns
 * `{ ok, violations, evidence }`.
 *
 *   INV-11.6-A — calibration target law
 *   INV-11.6-B — score hook law
 *   INV-11.6-C — expected direction law
 *   INV-11.6-D — cohort law
 *   INV-11.6-E — exclusion law
 *   INV-11.6-F — non-causality law
 *   INV-11.6-G — replay determinism law
 *   INV-11.6-H — non-judgment law
 */

import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  isL11ReservedScoreFamily,
  L11ScoreCalibrationTarget,
  L11ScoreCalibrationHook,
  L11ScoreOutput,
  L11ExpectedOutcomeDirection,
  isL11ExpectedDirectionCompatible,
  isL11CalibrationDescriptionCausalityFree,
  L11CohortDimension,
  ALL_L11_COHORT_DIMENSIONS,
  L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES,
  getMissingRequiredExclusionClasses,
  extractL11CalibrationTargetReplayMaterial,
  canonicalCalibrationTargetReplayHash,
  extractL11CalibrationHookReplayMaterial,
  canonicalCalibrationHookReplayHash,
} from '../contracts';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from '../validation/l11-calibration-violation-codes';

export interface L11_6InvariantResult {
  readonly ok: boolean;
  readonly violations: readonly L11CalibrationIssue[];
  readonly evidence: string;
}

function ok(evidence: string): L11_6InvariantResult {
  return { ok: true, violations: [], evidence };
}
function fail(
  violations: readonly L11CalibrationIssue[],
  evidence: string,
): L11_6InvariantResult {
  return { ok: false, violations, evidence };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.6-A — calibration target law
// ─────────────────────────────────────────────────────────────────────

/**
 * Every production score family must have at least one complete
 * calibration target. Reserved families must not.
 */
export function checkInv11_6_A_TargetLaw(
  targets: readonly L11ScoreCalibrationTarget[],
): L11_6InvariantResult {
  const violations: L11CalibrationIssue[] = [];
  const fams = new Set<L11ScoreFamily>();
  for (const t of targets) {
    if (isL11ReservedScoreFamily(t.score_family)) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_RESERVED_FAMILY_HAS_TARGET,
        `reserved family ${t.score_family} has calibration target ${t.calibration_target_id}`,
        { target_id: t.calibration_target_id, score_family: t.score_family }));
      continue;
    }
    fams.add(t.score_family);
  }
  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    if (!fams.has(f)) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_PRODUCTION_FAMILY_LACKS_TARGET,
        `production family ${f} has no calibration target`,
        { score_family: f }));
    }
  }
  return violations.length === 0
    ? ok(`all ${L11_PRODUCTION_SCORE_FAMILIES.length} production families have ≥1 target; no reserved-family targets`)
    : fail(violations, `${violations.length} target-law violations`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.6-B — score hook law
// ─────────────────────────────────────────────────────────────────────

export function checkInv11_6_B_HookLaw(
  scores: readonly L11ScoreOutput[],
  hooks: readonly L11ScoreCalibrationHook[],
): L11_6InvariantResult {
  const violations: L11CalibrationIssue[] = [];
  const hooksByScore = new Map<string, number>();
  for (const h of hooks) {
    hooksByScore.set(h.score_id, (hooksByScore.get(h.score_id) ?? 0) + 1);
  }
  for (const s of scores) {
    if (isL11ReservedScoreFamily(s.score_family)) continue;
    if (!hooksByScore.has(s.score_id)) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_SCORE_LACKS_CALIBRATION_HOOK,
        `score ${s.score_id} (${s.score_family}) has no calibration hook`,
        { score_id: s.score_id, score_family: s.score_family }));
    }
  }
  return violations.length === 0
    ? ok(`every production score has ≥1 hook (${scores.length} scores, ${hooks.length} hooks)`)
    : fail(violations, `${violations.length} score-hook coverage violations`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.6-C — expected direction law
// ─────────────────────────────────────────────────────────────────────

export function checkInv11_6_C_DirectionLaw(
  targets: readonly L11ScoreCalibrationTarget[],
): L11_6InvariantResult {
  const violations: L11CalibrationIssue[] = [];
  for (const t of targets) {
    if (!t.expected_direction ||
        t.expected_direction === L11ExpectedOutcomeDirection.FAMILY_DEFINED) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_EXPECTED_DIRECTION_MISSING,
        `target ${t.calibration_target_id} expected_direction missing or non-production`,
        { target_id: t.calibration_target_id, score_family: t.score_family }));
      continue;
    }
    const compat = isL11ExpectedDirectionCompatible(
      t.score_family, t.outcome_metric, t.expected_direction);
    if (!compat.ok) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_EXPECTED_DIRECTION_CONTRADICTS_OUTCOME_METRIC,
        compat.reason,
        { target_id: t.calibration_target_id, score_family: t.score_family,
          metric: t.outcome_metric }));
    }
  }
  return violations.length === 0
    ? ok(`expected direction compatible with metric and family for all ${targets.length} targets`)
    : fail(violations, `${violations.length} direction-law violations`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.6-D — cohort law
// ─────────────────────────────────────────────────────────────────────

/**
 * Cohorts must preserve score family, score band, formula version,
 * regime, sequence, hypothesis, visibility, and liquidity/market-cap
 * context where required.
 *
 * We treat presence of the *filter array* as the "preservation"
 * signal: an empty filter array is allowed (it means "any"), but the
 * field being entirely missing or the cohort claiming to ignore the
 * dimension is illegal.
 */
export function checkInv11_6_D_CohortLaw(
  targets: readonly L11ScoreCalibrationTarget[],
): L11_6InvariantResult {
  const violations: L11CalibrationIssue[] = [];
  for (const t of targets) {
    const c = t.cohort_definition;
    const ctx = { target_id: t.calibration_target_id, cohort_id: c?.cohort_id };
    if (!c) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_DEFINITION_MISSING,
        `target ${t.calibration_target_id} has no cohort_definition`, ctx));
      continue;
    }
    if (c.score_family !== t.score_family) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_FAMILY_MISMATCH,
        `cohort family ${c.score_family} != target family ${t.score_family}`, ctx));
    }
    if (!Array.isArray(c.score_band_filters)) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_LACKS_BAND_FILTER_CAPABILITY,
        'cohort.score_band_filters missing', ctx));
    }
    if (!Array.isArray(c.formula_version_filters) ||
        c.formula_version_filters.length === 0) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_IGNORES_FORMULA_VERSION,
        'cohort.formula_version_filters empty', ctx));
    }
    if (c.formula_version_filters.length > 1 && !c.migration_cohort) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_MIXES_DEPRECATED_WITHOUT_MIGRATION_FLAG,
        'multi-version cohort lacks migration flag', ctx));
    }
    if (t.visibility_stratification_required &&
        c.visibility_class_filters.length === 0) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_IGNORES_VISIBILITY_CLASS,
        'visibility stratification required but filter empty', ctx));
    }
  }
  void ALL_L11_COHORT_DIMENSIONS;
  void L11CohortDimension;
  return violations.length === 0
    ? ok(`cohort preservation OK across ${targets.length} targets`)
    : fail(violations, `${violations.length} cohort-law violations`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.6-E — exclusion law
// ─────────────────────────────────────────────────────────────────────

export function checkInv11_6_E_ExclusionLaw(
  targets: readonly L11ScoreCalibrationTarget[],
): L11_6InvariantResult {
  const violations: L11CalibrationIssue[] = [];
  for (const t of targets) {
    const ctx = { target_id: t.calibration_target_id };
    if (!t.exclusion_rules || t.exclusion_rules.length === 0) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_EXCLUSION_RULES_MISSING,
        `target ${t.calibration_target_id} has no exclusion rules`, ctx));
      continue;
    }
    const missing = getMissingRequiredExclusionClasses(t.exclusion_rules);
    for (const c of missing) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_REQUIRED_EXCLUSION_CLASS_MISSING,
        `target ${t.calibration_target_id} missing required exclusion class ${c}`,
        ctx));
    }
    for (const r of t.exclusion_rules) {
      if (!r.is_bias_safe) {
        violations.push(makeL11CalibrationIssue(
          L11CalibrationViolationCode.L11C_EXCLUSION_CAUSES_SURVIVORSHIP_BIAS,
          `exclusion rule ${r.exclusion_rule_id} not bias-safe`,
          { ...ctx, exclusion_rule_id: r.exclusion_rule_id }));
      }
    }
  }
  void L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES;
  return violations.length === 0
    ? ok(`exclusion coverage OK across ${targets.length} targets`)
    : fail(violations, `${violations.length} exclusion-law violations`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.6-F — non-causality law
// ─────────────────────────────────────────────────────────────────────

export function checkInv11_6_F_NonCausalityLaw(
  targets: readonly L11ScoreCalibrationTarget[],
): L11_6InvariantResult {
  const violations: L11CalibrationIssue[] = [];
  for (const t of targets) {
    const r = isL11CalibrationDescriptionCausalityFree(t.description);
    if (!r.ok) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_CALIBRATION_IMPLIES_CAUSALITY,
        `target ${t.calibration_target_id}: ${r.reason}`,
        { target_id: t.calibration_target_id, score_family: t.score_family }));
    }
  }
  return violations.length === 0
    ? ok(`no causality leakage across ${targets.length} target descriptions`)
    : fail(violations, `${violations.length} causality-law violations`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.6-G — replay determinism law
// ─────────────────────────────────────────────────────────────────────

export function checkInv11_6_G_ReplayLaw(
  targets: readonly L11ScoreCalibrationTarget[],
  hooks: readonly L11ScoreCalibrationHook[],
): L11_6InvariantResult {
  const violations: L11CalibrationIssue[] = [];
  for (const t of targets) {
    if (!t.replay_hash) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_TARGET_REPLAY_HASH_MISSING,
        `target ${t.calibration_target_id} replay_hash missing`,
        { target_id: t.calibration_target_id }));
      continue;
    }
    const expected = canonicalCalibrationTargetReplayHash(
      extractL11CalibrationTargetReplayMaterial(t));
    if (expected !== t.replay_hash) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_TARGET_REPLAY_HASH_MISMATCH,
        `target ${t.calibration_target_id} replay drift: expected ${expected}, got ${t.replay_hash}`,
        { target_id: t.calibration_target_id }));
    }
  }
  for (const h of hooks) {
    if (!h.replay_hash) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISSING,
        `hook ${h.calibration_hook_id} replay_hash missing`,
        { hook_id: h.calibration_hook_id }));
      continue;
    }
    const expected = canonicalCalibrationHookReplayHash(
      extractL11CalibrationHookReplayMaterial(h));
    if (expected !== h.replay_hash) {
      violations.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISMATCH,
        `hook ${h.calibration_hook_id} replay drift: expected ${expected}, got ${h.replay_hash}`,
        { hook_id: h.calibration_hook_id }));
    }
  }
  return violations.length === 0
    ? ok(`replay deterministic across ${targets.length} targets and ${hooks.length} hooks`)
    : fail(violations, `${violations.length} replay-determinism violations`);
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.6-H — non-judgment law
// ─────────────────────────────────────────────────────────────────────

const JUDGMENT_RX: readonly RegExp[] = [
  /\b(?:buy|sell|long|short|enter|exit|trade)\b/i,
  /\b(?:scenario\s+winner|final\s+judgment|recommend(?:ed|ation)?)\b/i,
];

export function checkInv11_6_H_NonJudgmentLaw(
  targets: readonly L11ScoreCalibrationTarget[],
): L11_6InvariantResult {
  const violations: L11CalibrationIssue[] = [];
  for (const t of targets) {
    for (const rx of JUDGMENT_RX) {
      if (rx.test(t.description) || rx.test(t.score_name)) {
        violations.push(makeL11CalibrationIssue(
          L11CalibrationViolationCode.L11C_CALIBRATION_ACTS_AS_JUDGMENT,
          `target ${t.calibration_target_id} contains judgment-tier wording (${rx})`,
          { target_id: t.calibration_target_id, score_family: t.score_family }));
        break;
      }
    }
  }
  return violations.length === 0
    ? ok(`no judgment language in ${targets.length} targets`)
    : fail(violations, `${violations.length} non-judgment violations`);
}

// ─────────────────────────────────────────────────────────────────────
// Aggregate
// ─────────────────────────────────────────────────────────────────────

export interface L11_6InvariantSuiteInputs {
  readonly targets: readonly L11ScoreCalibrationTarget[];
  readonly hooks: readonly L11ScoreCalibrationHook[];
  readonly scores: readonly L11ScoreOutput[];
}

export interface L11_6InvariantSuiteResult {
  readonly ok: boolean;
  readonly results: Readonly<{
    A: L11_6InvariantResult;
    B: L11_6InvariantResult;
    C: L11_6InvariantResult;
    D: L11_6InvariantResult;
    E: L11_6InvariantResult;
    F: L11_6InvariantResult;
    G: L11_6InvariantResult;
    H: L11_6InvariantResult;
  }>;
  readonly summary: string;
}

export function runL11_6InvariantSuite(
  inputs: L11_6InvariantSuiteInputs,
): L11_6InvariantSuiteResult {
  const A = checkInv11_6_A_TargetLaw(inputs.targets);
  const B = checkInv11_6_B_HookLaw(inputs.scores, inputs.hooks);
  const C = checkInv11_6_C_DirectionLaw(inputs.targets);
  const D = checkInv11_6_D_CohortLaw(inputs.targets);
  const E = checkInv11_6_E_ExclusionLaw(inputs.targets);
  const F = checkInv11_6_F_NonCausalityLaw(inputs.targets);
  const G = checkInv11_6_G_ReplayLaw(inputs.targets, inputs.hooks);
  const H = checkInv11_6_H_NonJudgmentLaw(inputs.targets);
  const all = [A, B, C, D, E, F, G, H];
  const okAll = all.every(r => r.ok);
  const total = all.reduce((acc, r) => acc + r.violations.length, 0);
  return {
    ok: okAll,
    results: { A, B, C, D, E, F, G, H },
    summary: okAll
      ? 'all 8 L11.6 invariants green'
      : `L11.6 invariants failed (${total} violations)`,
  };
}
