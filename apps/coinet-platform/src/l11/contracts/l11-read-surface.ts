/**
 * L11.8 — Read Surfaces (§11.8.11)
 *
 * Governed read surfaces, read modes, consumer classes, and the
 * canonical read-request object. Raw storage reads must never serve
 * official score state; readers go through this contract.
 */

import { L11ScoreFamily } from './score-family';

export const L11_READ_SURFACE_POLICY_VERSION = 'l11.8.read.v1';

export enum L11ReadSurfaceId {
  CURRENT_SCORE_SNAPSHOT_BY_SCOPE = 'CURRENT_SCORE_SNAPSHOT_BY_SCOPE',
  CURRENT_SCORE_FAMILY_BY_SCOPE = 'CURRENT_SCORE_FAMILY_BY_SCOPE',
  SCORE_ATTRIBUTION_BY_SCORE_ID = 'SCORE_ATTRIBUTION_BY_SCORE_ID',
  SCORE_COMPONENT_BREAKDOWN_BY_SCORE_ID = 'SCORE_COMPONENT_BREAKDOWN_BY_SCORE_ID',
  SCORE_MODIFIERS_BY_SCORE_ID = 'SCORE_MODIFIERS_BY_SCORE_ID',
  SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID = 'SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID',
  SCORE_CALIBRATION_HOOKS_BY_SCORE_ID = 'SCORE_CALIBRATION_HOOKS_BY_SCORE_ID',
  SCORE_HISTORY_BY_SCOPE_WINDOW = 'SCORE_HISTORY_BY_SCOPE_WINDOW',
  CALIBRATION_TARGET_BY_SCORE_FAMILY = 'CALIBRATION_TARGET_BY_SCORE_FAMILY',
  DRIFT_REPORT_BY_FORMULA_VERSION = 'DRIFT_REPORT_BY_FORMULA_VERSION',
  SCORE_EVIDENCE_BUNDLE = 'SCORE_EVIDENCE_BUNDLE',
  SCORE_LINEAGE_BY_RUN_ID = 'SCORE_LINEAGE_BY_RUN_ID',
}

export const ALL_L11_READ_SURFACE_IDS:
  readonly L11ReadSurfaceId[] = Object.values(L11ReadSurfaceId);

export enum L11ReadMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL = 'LIVE_HISTORICAL',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_VIEW = 'REPAIR_VIEW',
  LINEAGE_VIEW = 'LINEAGE_VIEW',
  EVIDENCE_VIEW = 'EVIDENCE_VIEW',
}

export const ALL_L11_READ_MODES:
  readonly L11ReadMode[] = Object.values(L11ReadMode);

export enum L11ConsumerClass {
  L12_SCENARIO_ENGINE = 'L12_SCENARIO_ENGINE',
  L13_AI_JUDGMENT_LAYER = 'L13_AI_JUDGMENT_LAYER',
  L14_DELIVERY_LAYER = 'L14_DELIVERY_LAYER',
  INTERNAL_REPLAY_ADAPTER = 'INTERNAL_REPLAY_ADAPTER',
  INTERNAL_REPAIR_ADAPTER = 'INTERNAL_REPAIR_ADAPTER',
  INTERNAL_CALIBRATION_JOB = 'INTERNAL_CALIBRATION_JOB',
  INTERNAL_DRIFT_JOB = 'INTERNAL_DRIFT_JOB',
  OBSERVABILITY = 'OBSERVABILITY',
}

export const ALL_L11_CONSUMER_CLASSES:
  readonly L11ConsumerClass[] = Object.values(L11ConsumerClass);

export interface L11ReadSurfaceDescriptor {
  readonly read_surface_id: L11ReadSurfaceId;
  readonly read_modes_allowed: readonly L11ReadMode[];
  readonly consumer_classes_allowed: readonly L11ConsumerClass[];
  readonly requires_lineage: boolean;
  readonly requires_evidence: boolean;
  readonly requires_replay_hash: boolean;
  readonly redis_acceleration_allowed: boolean;
  readonly current_authority_required: boolean;
  readonly historical_only: boolean;
}

export interface L11ReadRequest {
  readonly read_request_id: string;

  readonly read_surface_id: L11ReadSurfaceId;
  readonly read_mode: L11ReadMode;
  readonly consumer_class: L11ConsumerClass;

  readonly scope_type?: string;
  readonly scope_id?: string;
  readonly score_id?: string;
  readonly score_family?: L11ScoreFamily;
  readonly run_id?: string;
  readonly formula_id?: string;
  readonly formula_version?: string;

  readonly window_start?: string;
  readonly window_end?: string;

  readonly require_current_authority: boolean;
  readonly allow_cache_acceleration: boolean;
  readonly require_lineage: boolean;
  readonly require_evidence: boolean;
  readonly require_replay_hash: boolean;

  readonly policy_version: string;
}

export function isL11ReadRequestStructurallyValid(
  r: L11ReadRequest,
): { ok: boolean; reason: string } {
  if (!r.read_request_id) {
    return { ok: false, reason: 'read_request_id missing' };
  }
  if (!r.read_surface_id) {
    return { ok: false, reason: 'read_surface_id missing' };
  }
  if (!r.read_mode) return { ok: false, reason: 'read_mode missing' };
  if (!r.consumer_class) {
    return { ok: false, reason: 'consumer_class missing' };
  }
  if (!r.policy_version) return { ok: false, reason: 'policy_version missing' };
  return { ok: true, reason: 'ok' };
}
