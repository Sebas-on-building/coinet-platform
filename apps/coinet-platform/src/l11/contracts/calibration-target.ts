/**
 * L11.6 — Calibration Target object (§11.6.4)
 *
 * Defines what a score family should be measured against in
 * future-empirical evaluation: horizon, evaluation window,
 * outcome metric, expected direction, cohort, exclusion rules,
 * stratification requirements, version constraints, lineage,
 * and replay identity.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand } from './score-band-policy';
import {
  L11CalibrationHorizon,
  L11EvaluationWindow,
} from './calibration-horizon';
import { L11OutcomeMetric } from './outcome-metric';
import { L11ExpectedOutcomeDirection } from './expected-direction';
import { L11CalibrationCohortDefinition } from './calibration-cohort';
import { L11CalibrationExclusionRule } from './calibration-exclusion';

export const L11_CALIBRATION_TARGET_POLICY_VERSION = 'l11.6.target.v1';

/**
 * §11.6.4.1 — Required-context dimension reference. Engines and
 * later evaluation pipelines use this to check that hooks carry
 * the required context refs.
 */
export interface L11CalibrationContextRequirement {
  readonly requirement_id: string;
  readonly context_dimension:
    | 'REGIME'
    | 'SEQUENCE'
    | 'HYPOTHESIS'
    | 'VISIBILITY'
    | 'ATTRIBUTION'
    | 'MISSING_DATA';
  readonly required: boolean;
  readonly description: string;
}

export interface L11ScoreCalibrationTarget {
  readonly calibration_target_id: string;

  readonly score_family: L11ScoreFamily;
  readonly score_name: string;

  readonly target_version: string;
  readonly policy_version: string;

  readonly horizon: L11CalibrationHorizon;
  readonly evaluation_window: L11EvaluationWindow;

  readonly outcome_metric: L11OutcomeMetric;
  readonly expected_direction: L11ExpectedOutcomeDirection;

  readonly cohort_definition: L11CalibrationCohortDefinition;
  readonly minimum_sample_size: number;

  readonly exclusion_rules: readonly L11CalibrationExclusionRule[];

  readonly required_context_refs: readonly L11CalibrationContextRequirement[];

  readonly allowed_score_bands: readonly L11ScoreBand[];
  readonly allowed_score_versions: readonly string[];
  readonly allowed_formula_versions: readonly string[];

  readonly regime_stratification_required: boolean;
  readonly sequence_stratification_required: boolean;
  readonly hypothesis_stratification_required: boolean;
  readonly visibility_stratification_required: boolean;

  readonly description: string;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export function isL11CalibrationTargetStructurallyValid(
  t: L11ScoreCalibrationTarget,
): { ok: boolean; reason: string } {
  if (!t.calibration_target_id) return { ok: false, reason: 'calibration_target_id missing' };
  if (!t.score_family) return { ok: false, reason: 'score_family missing' };
  if (!t.score_name) return { ok: false, reason: 'score_name missing' };
  if (!t.target_version) return { ok: false, reason: 'target_version missing' };
  if (!t.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!t.horizon) return { ok: false, reason: 'horizon missing' };
  if (!t.evaluation_window) return { ok: false, reason: 'evaluation_window missing' };
  if (!t.outcome_metric) return { ok: false, reason: 'outcome_metric missing' };
  if (!t.expected_direction) return { ok: false, reason: 'expected_direction missing' };
  if (!t.cohort_definition) return { ok: false, reason: 'cohort_definition missing' };
  if (!Number.isFinite(t.minimum_sample_size) || t.minimum_sample_size <= 0) {
    return { ok: false, reason: 'minimum_sample_size must be > 0' };
  }
  if (!Array.isArray(t.exclusion_rules) || t.exclusion_rules.length === 0) {
    return { ok: false, reason: 'exclusion_rules missing or empty' };
  }
  if (!Array.isArray(t.lineage_refs) || t.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  if (!t.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  return { ok: true, reason: 'ok' };
}

// ── Replay-hash material (§11.6.16.1) ──────────────────────────

export interface L11CalibrationTargetReplayMaterial {
  readonly calibration_target_id: string;
  readonly score_family: L11ScoreFamily;
  readonly target_version: string;
  readonly horizon: L11CalibrationHorizon;
  readonly window_offset_ms: number;
  readonly window_length_ms: number;
  readonly outcome_metric: L11OutcomeMetric;
  readonly expected_direction: L11ExpectedOutcomeDirection;
  readonly cohort_id: string;
  readonly cohort_version: string;
  readonly minimum_sample_size: number;
  readonly exclusion_rule_ids: readonly string[];
  readonly allowed_score_bands: readonly L11ScoreBand[];
  readonly allowed_score_versions: readonly string[];
  readonly allowed_formula_versions: readonly string[];
  readonly regime_stratification_required: boolean;
  readonly sequence_stratification_required: boolean;
  readonly hypothesis_stratification_required: boolean;
  readonly visibility_stratification_required: boolean;
  readonly policy_version: string;
}

export function extractL11CalibrationTargetReplayMaterial(
  t: Omit<L11ScoreCalibrationTarget, 'replay_hash'> | L11ScoreCalibrationTarget,
): L11CalibrationTargetReplayMaterial {
  return {
    calibration_target_id: t.calibration_target_id,
    score_family: t.score_family,
    target_version: t.target_version,
    horizon: t.horizon,
    window_offset_ms: t.evaluation_window.window_offset_ms,
    window_length_ms: t.evaluation_window.window_length_ms,
    outcome_metric: t.outcome_metric,
    expected_direction: t.expected_direction,
    cohort_id: t.cohort_definition.cohort_id,
    cohort_version: t.cohort_definition.cohort_version,
    minimum_sample_size: t.minimum_sample_size,
    exclusion_rule_ids: t.exclusion_rules.map(r => r.exclusion_rule_id),
    allowed_score_bands: [...t.allowed_score_bands],
    allowed_score_versions: [...t.allowed_score_versions],
    allowed_formula_versions: [...t.allowed_formula_versions],
    regime_stratification_required: t.regime_stratification_required,
    sequence_stratification_required: t.sequence_stratification_required,
    hypothesis_stratification_required: t.hypothesis_stratification_required,
    visibility_stratification_required: t.visibility_stratification_required,
    policy_version: t.policy_version,
  };
}

export function canonicalCalibrationTargetReplayHash(
  m: L11CalibrationTargetReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`tid:${m.calibration_target_id}`);
  parts.push(`fam:${m.score_family}`);
  parts.push(`tv:${m.target_version}`);
  parts.push(`hz:${m.horizon}`);
  parts.push(`woff:${m.window_offset_ms}`);
  parts.push(`wlen:${m.window_length_ms}`);
  parts.push(`om:${m.outcome_metric}`);
  parts.push(`ed:${m.expected_direction}`);
  parts.push(`coh:${m.cohort_id}@${m.cohort_version}`);
  parts.push(`mss:${m.minimum_sample_size}`);
  parts.push(`exc:${[...m.exclusion_rule_ids].sort().join('|')}`);
  parts.push(`abnd:${[...m.allowed_score_bands].sort().join('|')}`);
  parts.push(`asv:${[...m.allowed_score_versions].sort().join('|')}`);
  parts.push(`afv:${[...m.allowed_formula_versions].sort().join('|')}`);
  parts.push(`rs:${m.regime_stratification_required ? '1' : '0'}`);
  parts.push(`ss:${m.sequence_stratification_required ? '1' : '0'}`);
  parts.push(`hs:${m.hypothesis_stratification_required ? '1' : '0'}`);
  parts.push(`vs:${m.visibility_stratification_required ? '1' : '0'}`);
  parts.push(`pv:${m.policy_version}`);
  return fnv1a32('l11c.target::' + parts.join('::'));
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11c.h.${hash.toString(16).padStart(8, '0')}`;
}
