/**
 * L11.7 — Formula change assessment validator (§11.7.13.2 / §11.7.13.4)
 */

import {
  L11FormulaChangeAssessment,
  L11FormulaChangeSurface,
  L11_PROHIBITED_SILENT_SURFACES,
  extractL11FormulaChangeReplayMaterial,
  canonicalFormulaChangeReplayHash,
  ALL_L11_FORMULA_CHANGE_SURFACES,
  ALL_L11_FORMULA_CHANGE_REASON_CODES,
} from '../contracts/formula-change-assessment';
import {
  L11FormulaChangeClassification,
  l11FormulaChangeRequiresMigration,
  l11FormulaChangeRequiresRecalibration,
} from '../contracts/formula-change-classification';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';
import { validateL11FormulaChangeClassification } from './formula-change-classification.validator';

export function validateL11FormulaChangeAssessment(
  a: L11FormulaChangeAssessment,
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  const ref = a.formula_change_assessment_id;
  if (!a.formula_change_assessment_id) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_ID_MISSING,
      'formula_change_assessment_id missing'));
  }
  if (!a.old_formula_id || !a.old_formula_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_OLD_REF_MISSING,
      'old_formula_id / old_formula_version missing',
      { formula_change_assessment_id: ref }));
  }
  if (!a.new_formula_id || !a.new_formula_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_NEW_REF_MISSING,
      'new_formula_id / new_formula_version missing',
      { formula_change_assessment_id: ref }));
  }
  if (a.old_formula_id === a.new_formula_id &&
      a.old_formula_version === a.new_formula_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_OLD_FORMULA_OVERWRITTEN,
      'old and new formula identifiers identical (in-place overwrite)',
      { formula_change_assessment_id: ref }));
  }
  if (!Array.isArray(a.changed_surfaces) || a.changed_surfaces.length === 0) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_NO_SURFACES,
      'changed_surfaces must be non-empty',
      { formula_change_assessment_id: ref }));
  } else {
    for (const s of a.changed_surfaces) {
      if (!ALL_L11_FORMULA_CHANGE_SURFACES.includes(s)) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_FORMULA_CHANGE_NO_SURFACES,
          `unknown formula change surface ${s}`,
          { formula_change_assessment_id: ref }));
      }
    }
  }
  if (!Array.isArray(a.reason_codes) || a.reason_codes.length === 0) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_NO_REASONS,
      'reason_codes must be non-empty',
      { formula_change_assessment_id: ref }));
  } else {
    for (const r of a.reason_codes) {
      if (!ALL_L11_FORMULA_CHANGE_REASON_CODES.includes(r)) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_FORMULA_CHANGE_NO_REASONS,
          `unknown formula change reason ${r}`,
          { formula_change_assessment_id: ref }));
      }
    }
  }
  issues.push(...validateL11FormulaChangeClassification(
    a.classification, { formula_change_assessment_id: ref }));

  // Cross-field consistency: classification implications.
  if (l11FormulaChangeRequiresMigration(a.classification) &&
      !a.migration_required) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_REQUIRES_MIGRATION,
      `classification ${a.classification} requires migration_required=true`,
      { formula_change_assessment_id: ref }));
  }
  if (l11FormulaChangeRequiresRecalibration(a.classification) &&
      !a.recalibration_required) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_REQUIRES_RECALIBRATION,
      `classification ${a.classification} requires recalibration_required=true`,
      { formula_change_assessment_id: ref }));
  }
  if (a.classification === L11FormulaChangeClassification.BREAKING_SEMANTIC &&
      !a.replay_backfill_required) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_BACKFILL_REQUIRED,
      'BREAKING_SEMANTIC change must set replay_backfill_required=true',
      { formula_change_assessment_id: ref }));
  }

  // §11.7.13.5 — Always-prohibited surfaces require ratification.
  for (const s of L11_PROHIBITED_SILENT_SURFACES) {
    if (a.changed_surfaces.includes(s) && !a.migration_ratification_ref) {
      const code = s === L11FormulaChangeSurface.SCORE_DIRECTION_CHANGED
        ? L11DriftViolationCode.L11G_DIRECTION_CHANGE_PROHIBITED
        : L11DriftViolationCode.L11G_MEANING_CHANGE_SILENT;
      issues.push(makeL11DriftIssue(
        code,
        `${s} requires migration_ratification_ref`,
        { formula_change_assessment_id: ref }));
    }
  }

  // Replay hash.
  if (!a.replay_hash) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_FORMULA_CHANGE_REPLAY_HASH_MISSING,
      'replay_hash missing', { formula_change_assessment_id: ref }));
  } else {
    try {
      const expected = canonicalFormulaChangeReplayHash(
        extractL11FormulaChangeReplayMaterial(a));
      if (expected !== a.replay_hash) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_FORMULA_CHANGE_REPLAY_HASH_MISMATCH,
          `replay_hash declared=${a.replay_hash} expected=${expected}`,
          { formula_change_assessment_id: ref }));
      }
    } catch (e) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_FORMULA_CHANGE_REPLAY_HASH_MISMATCH,
        `replay_hash recomputation failed: ${(e as Error).message}`,
        { formula_change_assessment_id: ref }));
    }
  }
  return issues;
}
