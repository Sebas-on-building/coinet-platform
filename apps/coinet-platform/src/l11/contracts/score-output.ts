/**
 * L11.2 — Universal Score Output Contract (§11.2.9 / §11.2.11 / §11.2.18)
 *
 * Every emitted Layer 11 score output object must conform to this
 * shape. Identity, scope, numeric, meaning, attribution, modifier,
 * restriction, calibration, evidence, and replay-hash fields are
 * mandatory.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreFamilyDirectionClass } from './score-direction';
import { L11ScoreBand } from './score-band-policy';

/**
 * §11.2.9.1 — Universal score output object. Distinct from L11.1's
 * abstract `L11OutputSurfaceClass.SCORE_OUTPUT` registration: this is
 * the concrete object every formula must emit.
 */
export interface L11ScoreOutput {
  // ── Identity ──
  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly score_name: string;
  readonly score_version: string;

  // ── Scope/time ──
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  // ── Numeric score (§11.2.11) ──
  readonly raw_score: number;
  readonly modified_score: number;
  readonly final_score: number;
  readonly score_band: L11ScoreBand;

  // ── Meaning ──
  readonly score_meaning_claim_ref: string;
  readonly direction_class: L11ScoreFamilyDirectionClass;

  // ── Explainability ──
  readonly component_score_refs: readonly string[];
  readonly positive_attribution_refs: readonly string[];
  readonly negative_attribution_refs: readonly string[];

  // ── Missing-data and modifiers ──
  readonly missing_data_profile_ref: string;
  readonly missing_data_penalty_refs: readonly string[];
  readonly regime_modifier_refs: readonly string[];
  readonly sequence_modifier_refs: readonly string[];
  readonly hypothesis_modifier_refs: readonly string[];
  readonly confidence_modifier_ref: string | null;

  // ── Governance ──
  readonly restriction_profile_ref: string;
  readonly calibration_target_ref: string;
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly policy_version: string;
}

/**
 * §11.2.11.1 / §11.2.11.3 — Whether a transformation between raw,
 * modified, and final score is consistent with declared modifier and
 * penalty refs.
 */
export function isL11ScoreTransformationConsistent(o: L11ScoreOutput): {
  ok: boolean; reason: string;
} {
  if (o.raw_score !== o.modified_score) {
    const hasModifier =
      o.regime_modifier_refs.length > 0 ||
      o.sequence_modifier_refs.length > 0 ||
      o.hypothesis_modifier_refs.length > 0 ||
      o.confidence_modifier_ref !== null;
    if (!hasModifier) {
      return {
        ok: false,
        reason: 'raw_score != modified_score but no modifier refs declared',
      };
    }
  }
  if (o.modified_score !== o.final_score) {
    const hasPenaltyOrCap =
      o.missing_data_penalty_refs.length > 0 ||
      o.restriction_profile_ref.length > 0;
    if (!hasPenaltyOrCap) {
      return {
        ok: false,
        reason: 'modified_score != final_score but no penalty/cap/restriction refs declared',
      };
    }
  }
  return { ok: true, reason: 'ok' };
}

/**
 * §11.2.11.2 — Numeric bound law for the [0, 100] score domain.
 */
export function isL11ScoreInBounds(s: number): boolean {
  if (!Number.isFinite(s)) return false;
  return s >= 0 && s <= 100;
}

/**
 * §11.2.18.1 — Stable canonical material list used for replay-hash
 * computation. The order is part of the contract: changing the order
 * is a replay-breaking change.
 */
export interface L11ScoreReplayMaterial {
  readonly score_family: L11ScoreFamily;
  readonly score_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly raw_score: number;
  readonly modified_score: number;
  readonly final_score: number;
  readonly score_band: L11ScoreBand;
  readonly score_meaning_claim_ref: string;
  readonly direction_class: L11ScoreFamilyDirectionClass;
  readonly component_score_refs: readonly string[];
  readonly positive_attribution_refs: readonly string[];
  readonly negative_attribution_refs: readonly string[];
  readonly regime_modifier_refs: readonly string[];
  readonly sequence_modifier_refs: readonly string[];
  readonly hypothesis_modifier_refs: readonly string[];
  readonly missing_data_profile_ref: string;
  readonly restriction_profile_ref: string;
  readonly calibration_target_ref: string;
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly policy_version: string;
}

export function extractL11ReplayMaterial(o: L11ScoreOutput): L11ScoreReplayMaterial {
  return {
    score_family: o.score_family,
    score_version: o.score_version,
    scope_type: o.scope_type,
    scope_id: o.scope_id,
    as_of: o.as_of,
    raw_score: o.raw_score,
    modified_score: o.modified_score,
    final_score: o.final_score,
    score_band: o.score_band,
    score_meaning_claim_ref: o.score_meaning_claim_ref,
    direction_class: o.direction_class,
    component_score_refs: [...o.component_score_refs],
    positive_attribution_refs: [...o.positive_attribution_refs],
    negative_attribution_refs: [...o.negative_attribution_refs],
    regime_modifier_refs: [...o.regime_modifier_refs],
    sequence_modifier_refs: [...o.sequence_modifier_refs],
    hypothesis_modifier_refs: [...o.hypothesis_modifier_refs],
    missing_data_profile_ref: o.missing_data_profile_ref,
    restriction_profile_ref: o.restriction_profile_ref,
    calibration_target_ref: o.calibration_target_ref,
    evidence_pack_ref: o.evidence_pack_ref,
    input_snapshot_ref: o.input_snapshot_ref,
    policy_version: o.policy_version,
  };
}

/**
 * §11.2.18.1 — Canonical replay-hash function. FNV-1a 32-bit over a
 * stable canonical encoding so the exact same material always yields
 * the exact same hash, and any material difference flips the hash.
 */
export function canonicalScoreOutputReplayHash(
  m: L11ScoreReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`fam:${m.score_family}`);
  parts.push(`ver:${m.score_version}`);
  parts.push(`stp:${m.scope_type}`);
  parts.push(`sid:${m.scope_id}`);
  parts.push(`as:${m.as_of}`);
  parts.push(`r:${normalizeNum(m.raw_score)}`);
  parts.push(`m:${normalizeNum(m.modified_score)}`);
  parts.push(`f:${normalizeNum(m.final_score)}`);
  parts.push(`b:${m.score_band}`);
  parts.push(`mcr:${m.score_meaning_claim_ref}`);
  parts.push(`dir:${m.direction_class}`);
  parts.push(`csr:${[...m.component_score_refs].sort().join('|')}`);
  parts.push(`par:${[...m.positive_attribution_refs].sort().join('|')}`);
  parts.push(`nar:${[...m.negative_attribution_refs].sort().join('|')}`);
  parts.push(`rmr:${[...m.regime_modifier_refs].sort().join('|')}`);
  parts.push(`smr:${[...m.sequence_modifier_refs].sort().join('|')}`);
  parts.push(`hmr:${[...m.hypothesis_modifier_refs].sort().join('|')}`);
  parts.push(`mdr:${m.missing_data_profile_ref}`);
  parts.push(`rpr:${m.restriction_profile_ref}`);
  parts.push(`ctr:${m.calibration_target_ref}`);
  parts.push(`epr:${m.evidence_pack_ref}`);
  parts.push(`isn:${m.input_snapshot_ref}`);
  parts.push(`pv:${m.policy_version}`);
  const canonical = parts.join('::');
  return fnv1a32(canonical);
}

function normalizeNum(n: number): string {
  if (!Number.isFinite(n)) return 'NaN';
  // Stable string encoding: avoid floating-point drift from toString()
  // on integer-equivalent values.
  if (Number.isInteger(n)) return `${n}.000000`;
  return n.toFixed(6);
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11d.h.${hash.toString(16).padStart(8, '0')}`;
}
