/**
 * L11.5 — Score Missing-Data Profile (§11.5.5 / §11.5.15.1)
 *
 * Canonical runtime object describing every missing/stale/degraded/
 * restricted/evidence-only/conflicting input that affected a score,
 * the runtime behaviour resolved per condition, the score and
 * confidence effects applied, the visibility class, the readiness
 * effect, and the deterministic FNV-1a 32-bit replay hash.
 */

import { L11ScoreFamily } from './score-family';
import { L11MissingDataConditionClass } from './missing-data-condition';
import { L11RuntimeMissingDataBehaviorClass } from './missing-data-behavior';
import {
  L11MissingInputRef,
  L11InsufficientInputSetRef,
} from './missing-input-ref';
import {
  L11ScoreVisibilityClass,
  L11MissingDataReadinessEffect,
} from './score-visibility-class';

export const L11_MISSING_DATA_POLICY_VERSION = 'l11.5.missing.v1';

/**
 * §11.5.5.1 — One per resolved (condition, input) pair. Lists what
 * runtime behaviour was applied and what its score/confidence
 * effect was.
 */
export interface L11AppliedMissingDataBehavior {
  readonly applied_behavior_id: string;
  readonly missing_input_ref_id: string;

  readonly condition_class: L11MissingDataConditionClass;
  readonly behavior: L11RuntimeMissingDataBehaviorClass;

  readonly score_effect: number;
  readonly confidence_effect: number;

  readonly cap_rule_ref?: string;
  readonly penalty_rule_ref?: string;
  readonly attribution_warning_ref?: string;
  readonly omitted_component_ref?: string;
  readonly evidence_only_component_ref?: string;

  readonly disclosure_required: boolean;

  readonly reason_codes: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export interface L11ScoreMissingDataProfile {
  readonly missing_profile_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly missing_required_inputs: readonly L11MissingInputRef[];
  readonly missing_optional_inputs: readonly L11MissingInputRef[];
  readonly stale_inputs: readonly L11MissingInputRef[];
  readonly degraded_inputs: readonly L11MissingInputRef[];
  readonly evidence_only_inputs: readonly L11MissingInputRef[];
  readonly restricted_inputs: readonly L11MissingInputRef[];
  readonly conflicting_inputs: readonly L11MissingInputRef[];
  readonly insufficient_input_sets: readonly L11InsufficientInputSetRef[];

  readonly applied_behaviors: readonly L11AppliedMissingDataBehavior[];

  readonly applied_penalties: readonly string[];
  readonly applied_caps: readonly string[];
  readonly confidence_reduction_refs: readonly string[];
  readonly attribution_warning_refs: readonly string[];

  readonly omitted_component_refs: readonly string[];
  readonly evidence_only_component_refs: readonly string[];

  readonly score_effect: number;
  readonly confidence_effect: number;

  readonly visibility_class: L11ScoreVisibilityClass;
  readonly readiness_effect: L11MissingDataReadinessEffect;

  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];
  readonly input_snapshot_ref: string;

  readonly policy_version: string;
  readonly replay_hash: string;
}

// ─────────────────────────────────────────────────────────────────────
// Replay material (§11.5.15.1)
// ─────────────────────────────────────────────────────────────────────

export interface L11MissingDataProfileReplayMaterial {
  readonly missing_profile_id: string;
  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_id: string;
  readonly formula_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly missing_required_input_keys: readonly string[];
  readonly missing_optional_input_keys: readonly string[];
  readonly stale_input_keys: readonly string[];
  readonly degraded_input_keys: readonly string[];
  readonly evidence_only_input_keys: readonly string[];
  readonly restricted_input_keys: readonly string[];
  readonly conflicting_input_keys: readonly string[];
  readonly insufficient_input_set_keys: readonly string[];
  readonly applied_behavior_keys: readonly string[];
  readonly applied_caps: readonly string[];
  readonly applied_penalties: readonly string[];
  readonly visibility_class: L11ScoreVisibilityClass;
  readonly readiness_effect: L11MissingDataReadinessEffect;
  readonly score_effect: number;
  readonly confidence_effect: number;
  readonly input_snapshot_ref: string;
  readonly policy_version: string;
}

function inputKey(r: L11MissingInputRef): string {
  return [
    r.input_ref_id,
    r.input_surface_ref,
    r.source_layer,
    r.dependency_class,
    r.condition_class,
    r.required_for_component_refs.slice().sort().join(','),
  ].join('|');
}

function setKey(s: L11InsufficientInputSetRef): string {
  return [
    s.insufficient_set_id,
    s.required_input_surface_refs.slice().sort().join(','),
    s.missing_input_surface_refs.slice().sort().join(','),
    s.required_for_component_refs.slice().sort().join(','),
    s.reason_code,
  ].join('|');
}

function behaviorKey(b: L11AppliedMissingDataBehavior): string {
  return [
    b.applied_behavior_id,
    b.missing_input_ref_id,
    b.condition_class,
    b.behavior,
    normalizeNum(b.score_effect),
    normalizeNum(b.confidence_effect),
    b.cap_rule_ref ?? '',
    b.penalty_rule_ref ?? '',
    b.attribution_warning_ref ?? '',
    b.omitted_component_ref ?? '',
    b.evidence_only_component_ref ?? '',
    b.disclosure_required ? '1' : '0',
  ].join('|');
}

export function extractL11MissingDataProfileReplayMaterial(
  p: Omit<L11ScoreMissingDataProfile, 'replay_hash'> | L11ScoreMissingDataProfile,
): L11MissingDataProfileReplayMaterial {
  return {
    missing_profile_id: p.missing_profile_id,
    score_id: p.score_id,
    score_family: p.score_family,
    formula_id: p.formula_id,
    formula_version: p.formula_version,
    scope_type: p.scope_type,
    scope_id: p.scope_id,
    as_of: p.as_of,
    missing_required_input_keys: p.missing_required_inputs.map(inputKey),
    missing_optional_input_keys: p.missing_optional_inputs.map(inputKey),
    stale_input_keys: p.stale_inputs.map(inputKey),
    degraded_input_keys: p.degraded_inputs.map(inputKey),
    evidence_only_input_keys: p.evidence_only_inputs.map(inputKey),
    restricted_input_keys: p.restricted_inputs.map(inputKey),
    conflicting_input_keys: p.conflicting_inputs.map(inputKey),
    insufficient_input_set_keys: p.insufficient_input_sets.map(setKey),
    applied_behavior_keys: p.applied_behaviors.map(behaviorKey),
    applied_caps: p.applied_caps,
    applied_penalties: p.applied_penalties,
    visibility_class: p.visibility_class,
    readiness_effect: p.readiness_effect,
    score_effect: p.score_effect,
    confidence_effect: p.confidence_effect,
    input_snapshot_ref: p.input_snapshot_ref,
    policy_version: p.policy_version,
  };
}

export function canonicalMissingDataProfileReplayHash(
  m: L11MissingDataProfileReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`pid:${m.missing_profile_id}`);
  parts.push(`sid:${m.score_id}`);
  parts.push(`fam:${m.score_family}`);
  parts.push(`fid:${m.formula_id}`);
  parts.push(`fv:${m.formula_version}`);
  parts.push(`stp:${m.scope_type}`);
  parts.push(`sco:${m.scope_id}`);
  parts.push(`as:${m.as_of}`);
  parts.push(`vis:${m.visibility_class}`);
  parts.push(`rdy:${m.readiness_effect}`);
  parts.push(`se:${normalizeNum(m.score_effect)}`);
  parts.push(`ce:${normalizeNum(m.confidence_effect)}`);
  parts.push(`mri:${[...m.missing_required_input_keys].sort().join('||')}`);
  parts.push(`moi:${[...m.missing_optional_input_keys].sort().join('||')}`);
  parts.push(`sti:${[...m.stale_input_keys].sort().join('||')}`);
  parts.push(`dgi:${[...m.degraded_input_keys].sort().join('||')}`);
  parts.push(`evi:${[...m.evidence_only_input_keys].sort().join('||')}`);
  parts.push(`rsi:${[...m.restricted_input_keys].sort().join('||')}`);
  parts.push(`cfi:${[...m.conflicting_input_keys].sort().join('||')}`);
  parts.push(`iis:${[...m.insufficient_input_set_keys].sort().join('||')}`);
  parts.push(`ab:${[...m.applied_behavior_keys].sort().join('||')}`);
  parts.push(`acap:${[...m.applied_caps].sort().join('|')}`);
  parts.push(`apen:${[...m.applied_penalties].sort().join('|')}`);
  parts.push(`isr:${m.input_snapshot_ref}`);
  parts.push(`pv:${m.policy_version}`);
  return fnv1a32('l11m.profile::' + parts.join('::'));
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
  return `l11m.h.${hash.toString(16).padStart(8, '0')}`;
}
