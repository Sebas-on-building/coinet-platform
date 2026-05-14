/**
 * L11.5 — Regime Modifier Matrix Validator (§11.5.10 / §11.5.11)
 *
 * Validates the structural integrity of the §11.5.10 frozen matrix
 * and individual matrix-aware modifier checks (hard caps).
 */

import {
  L11_REGIME_MODIFIER_MATRIX,
  L11RegimeModifierMatrixEntry,
  L11RegimePostureCode,
  L11ScoreFamily,
  L11ScoreBand,
  L11RegimeModifierType,
  ALL_L11_SCORE_BANDS,
  L11ScoreOutput,
  L11ScoreRegimeModifier,
  getL11RegimeHardCapBand,
} from '../contracts';
import {
  L11MissingRegimeIssue,
  L11MissingRegimeViolationCode,
  makeL11MissingRegimeIssue,
} from './l11-missing-regime-violation-codes';

export function validateL11RegimeModifierMatrixIntegrity(): {
  ok: boolean; issues: readonly L11MissingRegimeIssue[];
} {
  const issues: L11MissingRegimeIssue[] = [];
  const seenIds = new Set<string>();
  for (const e of L11_REGIME_MODIFIER_MATRIX) {
    if (seenIds.has(e.entry_id)) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_OUTSIDE_MATRIX,
        `duplicate matrix entry ${e.entry_id}`));
      continue;
    }
    seenIds.add(e.entry_id);
    if (!Number.isFinite(e.recommended_strength) ||
        e.recommended_strength < 0 || e.recommended_strength > 1) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_STRENGTH_OUT_OF_BOUNDS,
        `entry ${e.entry_id} recommended_strength ${e.recommended_strength} out of [0,1]`));
    }
    if (e.is_hard_cap && !e.hard_cap_band) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_HARD_CAP_VIOLATED,
        `entry ${e.entry_id} marked is_hard_cap but no hard_cap_band`));
    }
    if (e.hard_cap_band && !ALL_L11_SCORE_BANDS.includes(e.hard_cap_band)) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_HARD_CAP_VIOLATED,
        `entry ${e.entry_id} unknown hard_cap_band ${e.hard_cap_band}`));
    }
  }
  return { ok: issues.length === 0, issues };
}

const BAND_RANK: Readonly<Record<L11ScoreBand, number>> = {
  [L11ScoreBand.VERY_LOW]: 0,
  [L11ScoreBand.LOW]: 1,
  [L11ScoreBand.MEDIUM]: 2,
  [L11ScoreBand.HIGH]: 3,
  [L11ScoreBand.VERY_HIGH]: 4,
};

export interface ValidateModifierAgainstMatrixArgs {
  readonly score: L11ScoreOutput;
  readonly modifier: L11ScoreRegimeModifier;
}

export function validateL11ModifierAgainstMatrix(
  args: ValidateModifierAgainstMatrixArgs,
): { ok: boolean; issues: readonly L11MissingRegimeIssue[] } {
  const issues: L11MissingRegimeIssue[] = [];
  const cap = getL11RegimeHardCapBand(
    args.modifier.score_family,
    args.modifier.primary_regime as L11RegimePostureCode,
  );
  if (cap && BAND_RANK[args.score.score_band] > BAND_RANK[cap]) {
    issues.push(makeL11MissingRegimeIssue(
      L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_HARD_CAP_VIOLATED,
      `score in band ${args.score.score_band} exceeds hard cap ${cap} under regime ${args.modifier.primary_regime}`,
      { modifier_id: args.modifier.modifier_id, score_id: args.score.score_id }));
  }
  return { ok: issues.length === 0, issues };
}

export function listMatrixEntriesByFamily(
  family: L11ScoreFamily,
): readonly L11RegimeModifierMatrixEntry[] {
  return L11_REGIME_MODIFIER_MATRIX.filter(e => e.score_family === family);
}

/** Convenience: assert every production family has at least one
 * matrix entry. */
export function validateMatrixCoverageAcrossProductionFamilies(
  productionFamilies: readonly L11ScoreFamily[],
): { ok: boolean; issues: readonly L11MissingRegimeIssue[] } {
  const issues: L11MissingRegimeIssue[] = [];
  for (const f of productionFamilies) {
    if (listMatrixEntriesByFamily(f).length === 0) {
      issues.push(makeL11MissingRegimeIssue(
        L11MissingRegimeViolationCode.L11M_REGIME_MODIFIER_OUTSIDE_MATRIX,
        `production family ${f} has zero matrix entries`));
    }
  }
  // Suppress unused-import lint — `L11RegimeModifierType` is exposed
  // via this validator's public surface for downstream callers.
  void L11RegimeModifierType;
  return { ok: issues.length === 0, issues };
}
