/**
 * L11.7 — Formula Change Assessment (§11.7.13 / §11.7.18.3)
 *
 * Captures a comparison between an old and new formula version,
 * the changed surfaces, and the resulting classification with
 * migration / recalibration / replay-backfill requirements.
 */

import { L11ScoreFamily } from './score-family';
import {
  L11FormulaChangeClassification,
} from './formula-change-classification';

export const L11_FORMULA_CHANGE_POLICY_VERSION = 'l11.7.formula-change.v1';

export enum L11FormulaChangeSurface {
  COMPONENT_ADDED = 'COMPONENT_ADDED',
  COMPONENT_REMOVED = 'COMPONENT_REMOVED',
  COMPONENT_WEIGHT_CHANGED = 'COMPONENT_WEIGHT_CHANGED',
  COMPONENT_DIRECTION_CHANGED = 'COMPONENT_DIRECTION_CHANGED',
  REQUIRED_INPUT_CHANGED = 'REQUIRED_INPUT_CHANGED',
  OPTIONAL_INPUT_CHANGED = 'OPTIONAL_INPUT_CHANGED',
  CAP_RULE_CHANGED = 'CAP_RULE_CHANGED',
  PENALTY_RULE_CHANGED = 'PENALTY_RULE_CHANGED',
  MODIFIER_RULE_CHANGED = 'MODIFIER_RULE_CHANGED',
  MISSING_DATA_RULE_CHANGED = 'MISSING_DATA_RULE_CHANGED',
  SCORE_DIRECTION_CHANGED = 'SCORE_DIRECTION_CHANGED',
  MEANING_CLAIM_CHANGED = 'MEANING_CLAIM_CHANGED',
  CALIBRATION_TARGET_CHANGED = 'CALIBRATION_TARGET_CHANGED',
}

export const ALL_L11_FORMULA_CHANGE_SURFACES:
  readonly L11FormulaChangeSurface[] =
  Object.values(L11FormulaChangeSurface);

/**
 * §11.7.13.5 — Surfaces that always trigger PROHIBITED unless an
 * explicit migration ratification is attached.
 */
export const L11_PROHIBITED_SILENT_SURFACES:
  readonly L11FormulaChangeSurface[] = [
  L11FormulaChangeSurface.SCORE_DIRECTION_CHANGED,
  L11FormulaChangeSurface.MEANING_CLAIM_CHANGED,
];

/**
 * Surfaces that mandate at minimum MIGRATION_REQUIRED.
 */
export const L11_MIGRATION_REQUIRED_SURFACES:
  readonly L11FormulaChangeSurface[] = [
  L11FormulaChangeSurface.SCORE_DIRECTION_CHANGED,
  L11FormulaChangeSurface.MEANING_CLAIM_CHANGED,
  L11FormulaChangeSurface.COMPONENT_REMOVED,
  L11FormulaChangeSurface.COMPONENT_DIRECTION_CHANGED,
  L11FormulaChangeSurface.REQUIRED_INPUT_CHANGED,
];

/**
 * Surfaces that mandate at minimum RECALIBRATION_REQUIRED.
 */
export const L11_RECALIBRATION_REQUIRED_SURFACES:
  readonly L11FormulaChangeSurface[] = [
  L11FormulaChangeSurface.COMPONENT_WEIGHT_CHANGED,
  L11FormulaChangeSurface.CAP_RULE_CHANGED,
  L11FormulaChangeSurface.PENALTY_RULE_CHANGED,
  L11FormulaChangeSurface.MODIFIER_RULE_CHANGED,
  L11FormulaChangeSurface.MISSING_DATA_RULE_CHANGED,
  L11FormulaChangeSurface.CALIBRATION_TARGET_CHANGED,
];

export enum L11FormulaChangeReasonCode {
  CALIBRATION_DRIFT = 'CALIBRATION_DRIFT',
  THRESHOLD_DRIFT = 'THRESHOLD_DRIFT',
  REGIME_DRIFT = 'REGIME_DRIFT',
  ADVERSARIAL_DRIFT = 'ADVERSARIAL_DRIFT',
  INPUT_DEPRECATION = 'INPUT_DEPRECATION',
  COMPONENT_GOVERNANCE = 'COMPONENT_GOVERNANCE',
  POLICY_UPDATE = 'POLICY_UPDATE',
  OUTCOME_CORRELATION_DRIFT = 'OUTCOME_CORRELATION_DRIFT',
  GOVERNANCE_RATIFICATION = 'GOVERNANCE_RATIFICATION',
  MEANING_CLARIFICATION = 'MEANING_CLARIFICATION',
}

export const ALL_L11_FORMULA_CHANGE_REASON_CODES:
  readonly L11FormulaChangeReasonCode[] =
  Object.values(L11FormulaChangeReasonCode);

export interface L11FormulaChangeAssessment {
  readonly formula_change_assessment_id: string;

  readonly old_formula_id: string;
  readonly old_formula_version: string;

  readonly new_formula_id: string;
  readonly new_formula_version: string;

  readonly score_family: L11ScoreFamily;

  readonly changed_surfaces: readonly L11FormulaChangeSurface[];

  readonly classification: L11FormulaChangeClassification;
  readonly migration_required: boolean;
  readonly recalibration_required: boolean;
  readonly replay_backfill_required: boolean;

  readonly reason_codes: readonly L11FormulaChangeReasonCode[];

  readonly affected_threshold_policy_refs: readonly string[];
  readonly affected_calibration_target_refs: readonly string[];

  readonly migration_ratification_ref?: string;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

export function isL11FormulaChangeAssessmentStructurallyValid(
  a: L11FormulaChangeAssessment,
): { ok: boolean; reason: string } {
  if (!a.formula_change_assessment_id) {
    return { ok: false, reason: 'formula_change_assessment_id missing' };
  }
  if (!a.old_formula_id) return { ok: false, reason: 'old_formula_id missing' };
  if (!a.old_formula_version) return { ok: false, reason: 'old_formula_version missing' };
  if (!a.new_formula_id) return { ok: false, reason: 'new_formula_id missing' };
  if (!a.new_formula_version) return { ok: false, reason: 'new_formula_version missing' };
  if (!a.score_family) return { ok: false, reason: 'score_family missing' };
  if (!a.classification) return { ok: false, reason: 'classification missing' };
  if (!Array.isArray(a.changed_surfaces) || a.changed_surfaces.length === 0) {
    return { ok: false, reason: 'changed_surfaces must be non-empty' };
  }
  if (!Array.isArray(a.reason_codes) || a.reason_codes.length === 0) {
    return { ok: false, reason: 'reason_codes must be non-empty' };
  }
  if (!Array.isArray(a.lineage_refs) || a.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  if (!a.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!a.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  if (a.old_formula_id === a.new_formula_id &&
      a.old_formula_version === a.new_formula_version) {
    return { ok: false,
      reason: 'old and new formula identifier+version are identical (no change)' };
  }
  return { ok: true, reason: 'ok' };
}

// ── Replay material (§11.7.18.3) ─────────────────────────────────

export interface L11FormulaChangeReplayMaterial {
  readonly formula_change_assessment_id: string;
  readonly old_formula_id: string;
  readonly old_formula_version: string;
  readonly new_formula_id: string;
  readonly new_formula_version: string;
  readonly score_family: L11ScoreFamily;
  readonly changed_surfaces: readonly L11FormulaChangeSurface[];
  readonly classification: L11FormulaChangeClassification;
  readonly migration_required: boolean;
  readonly recalibration_required: boolean;
  readonly replay_backfill_required: boolean;
  readonly reason_codes: readonly L11FormulaChangeReasonCode[];
  readonly affected_threshold_policy_refs: readonly string[];
  readonly affected_calibration_target_refs: readonly string[];
  readonly migration_ratification_ref?: string;
  readonly policy_version: string;
}

export function extractL11FormulaChangeReplayMaterial(
  a: Omit<L11FormulaChangeAssessment, 'replay_hash'> | L11FormulaChangeAssessment,
): L11FormulaChangeReplayMaterial {
  return {
    formula_change_assessment_id: a.formula_change_assessment_id,
    old_formula_id: a.old_formula_id,
    old_formula_version: a.old_formula_version,
    new_formula_id: a.new_formula_id,
    new_formula_version: a.new_formula_version,
    score_family: a.score_family,
    changed_surfaces: [...a.changed_surfaces],
    classification: a.classification,
    migration_required: a.migration_required,
    recalibration_required: a.recalibration_required,
    replay_backfill_required: a.replay_backfill_required,
    reason_codes: [...a.reason_codes],
    affected_threshold_policy_refs: [...a.affected_threshold_policy_refs],
    affected_calibration_target_refs: [...a.affected_calibration_target_refs],
    migration_ratification_ref: a.migration_ratification_ref,
    policy_version: a.policy_version,
  };
}

export function canonicalFormulaChangeReplayHash(
  m: L11FormulaChangeReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`fcid:${m.formula_change_assessment_id}`);
  parts.push(`of:${m.old_formula_id}@${m.old_formula_version}`);
  parts.push(`nf:${m.new_formula_id}@${m.new_formula_version}`);
  parts.push(`fam:${m.score_family}`);
  parts.push(`cs:${[...m.changed_surfaces].sort().join('|')}`);
  parts.push(`cl:${m.classification}`);
  parts.push(`mig:${m.migration_required ? '1' : '0'}`);
  parts.push(`rec:${m.recalibration_required ? '1' : '0'}`);
  parts.push(`bf:${m.replay_backfill_required ? '1' : '0'}`);
  parts.push(`rc:${[...m.reason_codes].sort().join('|')}`);
  parts.push(`atp:${[...m.affected_threshold_policy_refs].sort().join('|')}`);
  parts.push(`act:${[...m.affected_calibration_target_refs].sort().join('|')}`);
  parts.push(`rat:${m.migration_ratification_ref ?? ''}`);
  parts.push(`pv:${m.policy_version}`);
  return fnv1a32('l11g.fchange::' + parts.join('::'));
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11g.h.${hash.toString(16).padStart(8, '0')}`;
}
