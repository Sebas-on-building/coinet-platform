/**
 * L11.6 — Calibration Hook object (§11.6.5)
 *
 * Attaches a calibration target to a specific emitted score so
 * later evaluation can locate the score, its cohort, and its
 * evaluation window deterministically.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand } from './score-band-policy';
import { L11CalibrationHorizon } from './calibration-horizon';
import { L11OutcomeMetric } from './outcome-metric';
import { L11ExpectedOutcomeDirection } from './expected-direction';
import { L11CalibrationReadinessClass } from './calibration-readiness';

export const L11_CALIBRATION_HOOK_POLICY_VERSION = 'l11.6.hook.v1';

export interface L11ScoreCalibrationHook {
  readonly calibration_hook_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly score_version: string;
  readonly formula_id: string;
  readonly formula_version: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly final_score: number;
  readonly score_band: L11ScoreBand;

  readonly calibration_target_ref: string;

  readonly horizon: L11CalibrationHorizon;
  readonly outcome_metric: L11OutcomeMetric;
  readonly expected_direction: L11ExpectedOutcomeDirection;

  readonly cohort_key: string;
  readonly cohort_definition_ref: string;

  readonly exclusion_rule_refs: readonly string[];

  readonly regime_context_ref?: string;
  readonly sequence_context_ref?: string;
  readonly hypothesis_context_ref?: string;
  readonly visibility_context_ref?: string;
  readonly attribution_ref?: string;
  readonly missing_data_profile_ref?: string;

  readonly evaluation_due_at: string;
  readonly evaluation_window_start: string;
  readonly evaluation_window_end: string;

  readonly calibration_readiness_class: L11CalibrationReadinessClass;

  readonly lineage_refs: readonly string[];
  readonly input_snapshot_ref: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

export function isL11CalibrationHookStructurallyValid(
  h: L11ScoreCalibrationHook,
): { ok: boolean; reason: string } {
  if (!h.calibration_hook_id) return { ok: false, reason: 'calibration_hook_id missing' };
  if (!h.score_id) return { ok: false, reason: 'score_id missing' };
  if (!h.score_family) return { ok: false, reason: 'score_family missing' };
  if (!h.score_version) return { ok: false, reason: 'score_version missing' };
  if (!h.formula_id) return { ok: false, reason: 'formula_id missing' };
  if (!h.formula_version) return { ok: false, reason: 'formula_version missing' };
  if (!h.scope_type) return { ok: false, reason: 'scope_type missing' };
  if (!h.scope_id) return { ok: false, reason: 'scope_id missing' };
  if (!h.as_of) return { ok: false, reason: 'as_of missing' };
  if (!h.calibration_target_ref) return { ok: false, reason: 'calibration_target_ref missing' };
  if (!h.horizon) return { ok: false, reason: 'horizon missing' };
  if (!h.outcome_metric) return { ok: false, reason: 'outcome_metric missing' };
  if (!h.expected_direction) return { ok: false, reason: 'expected_direction missing' };
  if (!h.cohort_key) return { ok: false, reason: 'cohort_key missing' };
  if (!h.cohort_definition_ref) return { ok: false, reason: 'cohort_definition_ref missing' };
  if (!h.evaluation_due_at) return { ok: false, reason: 'evaluation_due_at missing' };
  if (!h.evaluation_window_start) return { ok: false, reason: 'evaluation_window_start missing' };
  if (!h.evaluation_window_end) return { ok: false, reason: 'evaluation_window_end missing' };
  if (!h.calibration_readiness_class) return { ok: false, reason: 'calibration_readiness_class missing' };
  if (!h.input_snapshot_ref) return { ok: false, reason: 'input_snapshot_ref missing' };
  if (!Array.isArray(h.lineage_refs) || h.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  if (!h.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!h.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  if (!Number.isFinite(h.final_score)) {
    return { ok: false, reason: 'final_score must be finite' };
  }
  return { ok: true, reason: 'ok' };
}

// ── Replay-hash material (§11.6.16.2) ──────────────────────────

export interface L11CalibrationHookReplayMaterial {
  readonly calibration_hook_id: string;
  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly score_version: string;
  readonly formula_id: string;
  readonly formula_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly final_score: number;
  readonly score_band: L11ScoreBand;
  readonly calibration_target_ref: string;
  readonly horizon: L11CalibrationHorizon;
  readonly outcome_metric: L11OutcomeMetric;
  readonly expected_direction: L11ExpectedOutcomeDirection;
  readonly cohort_key: string;
  readonly exclusion_rule_refs: readonly string[];
  readonly regime_context_ref?: string;
  readonly sequence_context_ref?: string;
  readonly hypothesis_context_ref?: string;
  readonly visibility_context_ref?: string;
  readonly attribution_ref?: string;
  readonly missing_data_profile_ref?: string;
  readonly evaluation_window_start: string;
  readonly evaluation_window_end: string;
  readonly readiness_class: L11CalibrationReadinessClass;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export function extractL11CalibrationHookReplayMaterial(
  h: Omit<L11ScoreCalibrationHook, 'replay_hash'> | L11ScoreCalibrationHook,
): L11CalibrationHookReplayMaterial {
  return {
    calibration_hook_id: h.calibration_hook_id,
    score_id: h.score_id,
    score_family: h.score_family,
    score_version: h.score_version,
    formula_id: h.formula_id,
    formula_version: h.formula_version,
    scope_type: h.scope_type,
    scope_id: h.scope_id,
    as_of: h.as_of,
    final_score: h.final_score,
    score_band: h.score_band,
    calibration_target_ref: h.calibration_target_ref,
    horizon: h.horizon,
    outcome_metric: h.outcome_metric,
    expected_direction: h.expected_direction,
    cohort_key: h.cohort_key,
    exclusion_rule_refs: [...h.exclusion_rule_refs],
    regime_context_ref: h.regime_context_ref,
    sequence_context_ref: h.sequence_context_ref,
    hypothesis_context_ref: h.hypothesis_context_ref,
    visibility_context_ref: h.visibility_context_ref,
    attribution_ref: h.attribution_ref,
    missing_data_profile_ref: h.missing_data_profile_ref,
    evaluation_window_start: h.evaluation_window_start,
    evaluation_window_end: h.evaluation_window_end,
    readiness_class: h.calibration_readiness_class,
    lineage_refs: [...h.lineage_refs],
    policy_version: h.policy_version,
  };
}

export function canonicalCalibrationHookReplayHash(
  m: L11CalibrationHookReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`hid:${m.calibration_hook_id}`);
  parts.push(`sid:${m.score_id}`);
  parts.push(`fam:${m.score_family}`);
  parts.push(`sv:${m.score_version}`);
  parts.push(`fid:${m.formula_id}`);
  parts.push(`fv:${m.formula_version}`);
  parts.push(`stp:${m.scope_type}`);
  parts.push(`sco:${m.scope_id}`);
  parts.push(`as:${m.as_of}`);
  parts.push(`fs:${normalizeNum(m.final_score)}`);
  parts.push(`bnd:${m.score_band}`);
  parts.push(`tref:${m.calibration_target_ref}`);
  parts.push(`hz:${m.horizon}`);
  parts.push(`om:${m.outcome_metric}`);
  parts.push(`ed:${m.expected_direction}`);
  parts.push(`ck:${m.cohort_key}`);
  parts.push(`exc:${[...m.exclusion_rule_refs].sort().join('|')}`);
  parts.push(`reg:${m.regime_context_ref ?? ''}`);
  parts.push(`seq:${m.sequence_context_ref ?? ''}`);
  parts.push(`hyp:${m.hypothesis_context_ref ?? ''}`);
  parts.push(`vis:${m.visibility_context_ref ?? ''}`);
  parts.push(`att:${m.attribution_ref ?? ''}`);
  parts.push(`mdp:${m.missing_data_profile_ref ?? ''}`);
  parts.push(`ws:${m.evaluation_window_start}`);
  parts.push(`we:${m.evaluation_window_end}`);
  parts.push(`rdy:${m.readiness_class}`);
  parts.push(`lin:${[...m.lineage_refs].sort().join('|')}`);
  parts.push(`pv:${m.policy_version}`);
  return fnv1a32('l11c.hook::' + parts.join('::'));
}

function normalizeNum(n: number): string {
  if (!Number.isFinite(n)) return 'NaN';
  if (Number.isInteger(n)) return `${n}.000000`;
  return n.toFixed(6);
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11c.h.${hash.toString(16).padStart(8, '0')}`;
}
