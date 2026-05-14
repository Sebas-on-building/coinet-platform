/**
 * L11.8 — Replay Adapter (§11.8.15)
 *
 * Pure verification adapter. Given a source run id and the recomputed
 * replay material (hashes for score, attribution, missing-data,
 * modifier, calibration, formula version, threshold policy version),
 * the adapter checks consistency with the recorded historical fact
 * and emits an `L11ReplayResult`.
 *
 * The adapter never writes current state nor overwrites historical
 * facts; downstream callers must dispatch any persistence through L5
 * with the appropriate materialization mode.
 */

import { L11ScoreFamily } from '../contracts/score-family';

export const L11_REPLAY_POLICY_VERSION = 'l11.8.replay.v1';

export enum L11ReplayStatus {
  IDENTICAL = 'IDENTICAL',
  ATTRIBUTION_MISMATCH = 'ATTRIBUTION_MISMATCH',
  MISSING_DATA_MISMATCH = 'MISSING_DATA_MISMATCH',
  MODIFIER_MISMATCH = 'MODIFIER_MISMATCH',
  CALIBRATION_MISMATCH = 'CALIBRATION_MISMATCH',
  SCORE_HASH_MISMATCH = 'SCORE_HASH_MISMATCH',
  FORMULA_VERSION_MISMATCH = 'FORMULA_VERSION_MISMATCH',
  THRESHOLD_POLICY_MISMATCH = 'THRESHOLD_POLICY_MISMATCH',
  SEMANTIC_DRIFT = 'SEMANTIC_DRIFT',
}

export const ALL_L11_REPLAY_STATUSES:
  readonly L11ReplayStatus[] = Object.values(L11ReplayStatus);

export enum L11ReplayDifferenceKind {
  SCORE_HASH = 'SCORE_HASH',
  ATTRIBUTION_HASH = 'ATTRIBUTION_HASH',
  MISSING_DATA_HASH = 'MISSING_DATA_HASH',
  MODIFIER_HASH = 'MODIFIER_HASH',
  CALIBRATION_HASH = 'CALIBRATION_HASH',
  FORMULA_VERSION = 'FORMULA_VERSION',
  THRESHOLD_POLICY = 'THRESHOLD_POLICY',
}

export interface L11ReplayDifference {
  readonly kind: L11ReplayDifferenceKind;
  readonly expected: string;
  readonly actual: string;
}

export interface L11ReplayResult {
  readonly replay_id: string;
  readonly source_run_id: string;
  readonly score_family: L11ScoreFamily;

  readonly replay_status: L11ReplayStatus;

  readonly score_hash_match: boolean;
  readonly attribution_hash_match: boolean;
  readonly missing_data_hash_match: boolean;
  readonly modifier_hash_match: boolean;
  readonly calibration_hash_match: boolean;

  readonly semantic_drift_detected: boolean;
  readonly formula_version_match: boolean;
  readonly threshold_policy_match: boolean;

  readonly differences: readonly L11ReplayDifference[];

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export interface L11ReplayInput {
  readonly replay_id: string;
  readonly source_run_id: string;
  readonly score_family: L11ScoreFamily;

  readonly recorded: {
    readonly score_replay_hash: string;
    readonly attribution_replay_hash: string;
    readonly missing_data_replay_hash: string;
    readonly modifier_replay_hash: string;
    readonly calibration_replay_hash: string;
    readonly formula_version: string;
    readonly threshold_policy_version: string;
  };
  readonly recomputed: {
    readonly score_replay_hash: string;
    readonly attribution_replay_hash: string;
    readonly missing_data_replay_hash: string;
    readonly modifier_replay_hash: string;
    readonly calibration_replay_hash: string;
    readonly formula_version: string;
    readonly threshold_policy_version: string;
  };

  readonly lineage_refs: readonly string[];
}

/**
 * Computes a deterministic replay result. Mismatches are reported
 * in priority order so the `replay_status` reflects the most
 * structurally significant divergence (formula version > threshold
 * policy > score hash > attribution > modifier > missing-data >
 * calibration).
 */
export function runL11Replay(input: L11ReplayInput): L11ReplayResult {
  const diffs: L11ReplayDifference[] = [];

  const score_match =
    input.recorded.score_replay_hash === input.recomputed.score_replay_hash;
  if (!score_match) {
    diffs.push({
      kind: L11ReplayDifferenceKind.SCORE_HASH,
      expected: input.recorded.score_replay_hash,
      actual: input.recomputed.score_replay_hash,
    });
  }
  const attribution_match =
    input.recorded.attribution_replay_hash ===
    input.recomputed.attribution_replay_hash;
  if (!attribution_match) {
    diffs.push({
      kind: L11ReplayDifferenceKind.ATTRIBUTION_HASH,
      expected: input.recorded.attribution_replay_hash,
      actual: input.recomputed.attribution_replay_hash,
    });
  }
  const md_match =
    input.recorded.missing_data_replay_hash ===
    input.recomputed.missing_data_replay_hash;
  if (!md_match) {
    diffs.push({
      kind: L11ReplayDifferenceKind.MISSING_DATA_HASH,
      expected: input.recorded.missing_data_replay_hash,
      actual: input.recomputed.missing_data_replay_hash,
    });
  }
  const mod_match =
    input.recorded.modifier_replay_hash ===
    input.recomputed.modifier_replay_hash;
  if (!mod_match) {
    diffs.push({
      kind: L11ReplayDifferenceKind.MODIFIER_HASH,
      expected: input.recorded.modifier_replay_hash,
      actual: input.recomputed.modifier_replay_hash,
    });
  }
  const cal_match =
    input.recorded.calibration_replay_hash ===
    input.recomputed.calibration_replay_hash;
  if (!cal_match) {
    diffs.push({
      kind: L11ReplayDifferenceKind.CALIBRATION_HASH,
      expected: input.recorded.calibration_replay_hash,
      actual: input.recomputed.calibration_replay_hash,
    });
  }
  const fv_match =
    input.recorded.formula_version === input.recomputed.formula_version;
  if (!fv_match) {
    diffs.push({
      kind: L11ReplayDifferenceKind.FORMULA_VERSION,
      expected: input.recorded.formula_version,
      actual: input.recomputed.formula_version,
    });
  }
  const tp_match =
    input.recorded.threshold_policy_version ===
    input.recomputed.threshold_policy_version;
  if (!tp_match) {
    diffs.push({
      kind: L11ReplayDifferenceKind.THRESHOLD_POLICY,
      expected: input.recorded.threshold_policy_version,
      actual: input.recomputed.threshold_policy_version,
    });
  }

  let status: L11ReplayStatus = L11ReplayStatus.IDENTICAL;
  if (!fv_match) status = L11ReplayStatus.FORMULA_VERSION_MISMATCH;
  else if (!tp_match) status = L11ReplayStatus.THRESHOLD_POLICY_MISMATCH;
  else if (!score_match) status = L11ReplayStatus.SCORE_HASH_MISMATCH;
  else if (!attribution_match) status = L11ReplayStatus.ATTRIBUTION_MISMATCH;
  else if (!md_match) status = L11ReplayStatus.MISSING_DATA_MISMATCH;
  else if (!mod_match) status = L11ReplayStatus.MODIFIER_MISMATCH;
  else if (!cal_match) status = L11ReplayStatus.CALIBRATION_MISMATCH;

  const semantic_drift =
    !fv_match || !tp_match ||
    (score_match && (!attribution_match || !md_match || !mod_match));

  return {
    replay_id: input.replay_id,
    source_run_id: input.source_run_id,
    score_family: input.score_family,
    replay_status: semantic_drift && status === L11ReplayStatus.IDENTICAL
      ? L11ReplayStatus.SEMANTIC_DRIFT
      : status,
    score_hash_match: score_match,
    attribution_hash_match: attribution_match,
    missing_data_hash_match: md_match,
    modifier_hash_match: mod_match,
    calibration_hash_match: cal_match,
    semantic_drift_detected: semantic_drift,
    formula_version_match: fv_match,
    threshold_policy_match: tp_match,
    differences: diffs,
    lineage_refs: input.lineage_refs,
    policy_version: L11_REPLAY_POLICY_VERSION,
  };
}
