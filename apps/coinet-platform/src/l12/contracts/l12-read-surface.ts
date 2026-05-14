/**
 * L12.6 — Read surfaces, read modes, read requests, read results, consumer
 * classes, and freshness classes (§12.6.11 – §12.6.16).
 *
 * Every L12 read flows through a registered read surface; raw storage rows
 * are never exposed and lower-layer rebuild surfaces are never named.
 */

import { L12DurableSurfaceId } from './l12-persistence-surface';

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.11 — Read surface ids                                   */
/* ────────────────────────────────────────────────────────────── */

export enum L12ReadSurfaceId {
  CURRENT_SCENARIO_SET_BY_SCOPE = 'CURRENT_SCENARIO_SET_BY_SCOPE',
  CURRENT_BASE_CASE_BY_SCOPE = 'CURRENT_BASE_CASE_BY_SCOPE',
  CURRENT_BULLISH_BEARISH_PATHS_BY_SCOPE = 'CURRENT_BULLISH_BEARISH_PATHS_BY_SCOPE',
  CURRENT_TRIGGER_PROFILE_BY_SCENARIO_ID = 'CURRENT_TRIGGER_PROFILE_BY_SCENARIO_ID',
  CURRENT_INVALIDATION_PROFILE_BY_SCENARIO_ID = 'CURRENT_INVALIDATION_PROFILE_BY_SCENARIO_ID',
  CURRENT_PATH_CONFIDENCE_BY_SCENARIO_SET_ID = 'CURRENT_PATH_CONFIDENCE_BY_SCENARIO_SET_ID',
  CURRENT_SHIFT_CONDITIONS_BY_SCENARIO_SET_ID = 'CURRENT_SHIFT_CONDITIONS_BY_SCENARIO_SET_ID',
  CURRENT_RESTRICTIONS_BY_SCENARIO_SET_ID = 'CURRENT_RESTRICTIONS_BY_SCENARIO_SET_ID',
  SCENARIO_HISTORY_BY_SCOPE_WINDOW = 'SCENARIO_HISTORY_BY_SCOPE_WINDOW',
  SCENARIO_EVIDENCE_BUNDLE = 'SCENARIO_EVIDENCE_BUNDLE',
  SCENARIO_LINEAGE_BY_RUN_ID = 'SCENARIO_LINEAGE_BY_RUN_ID',
  SCENARIO_FAILURES_BY_SCOPE = 'SCENARIO_FAILURES_BY_SCOPE',
}

export const ALL_L12_READ_SURFACE_IDS: readonly L12ReadSurfaceId[] =
  Object.values(L12ReadSurfaceId);

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.12 — Read modes                                         */
/* ────────────────────────────────────────────────────────────── */

export enum L12ReadMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL = 'LIVE_HISTORICAL',
  REPLAY_VIEW = 'REPLAY_VIEW',
  REPAIR_VIEW = 'REPAIR_VIEW',
  EVIDENCE_VIEW = 'EVIDENCE_VIEW',
  LINEAGE_VIEW = 'LINEAGE_VIEW',
}

export const ALL_L12_READ_MODES: readonly L12ReadMode[] = Object.values(L12ReadMode);

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.13 — Consumer classes                                   */
/* ────────────────────────────────────────────────────────────── */

export enum L12ConsumerClass {
  L13_SCENARIO_CONSUMER = 'L13_SCENARIO_CONSUMER',
  L14_JUDGMENT_SUPPORT = 'L14_JUDGMENT_SUPPORT',
  DELIVERY_LAYER = 'DELIVERY_LAYER',
  AUDIT_SYSTEM = 'AUDIT_SYSTEM',
  REPLAY_SYSTEM = 'REPLAY_SYSTEM',
  REPAIR_SYSTEM = 'REPAIR_SYSTEM',
  CALIBRATION_SYSTEM = 'CALIBRATION_SYSTEM',
  INTERNAL_MONITORING = 'INTERNAL_MONITORING',
}

export const ALL_L12_CONSUMER_CLASSES: readonly L12ConsumerClass[] =
  Object.values(L12ConsumerClass);

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.16 — Freshness classes                                  */
/* ────────────────────────────────────────────────────────────── */

export enum L12ReadFreshnessClass {
  LIVE = 'LIVE',
  RECENT = 'RECENT',
  HISTORICAL = 'HISTORICAL',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  EVIDENCE = 'EVIDENCE',
  LINEAGE = 'LINEAGE',
}

export const ALL_L12_READ_FRESHNESS_CLASSES: readonly L12ReadFreshnessClass[] =
  Object.values(L12ReadFreshnessClass);

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.13 — Read request                                       */
/* ────────────────────────────────────────────────────────────── */

export interface L12ReadRequest {
  readonly read_request_id: string;

  readonly read_surface_id: L12ReadSurfaceId;
  readonly read_mode: L12ReadMode;

  readonly consumer_class: L12ConsumerClass;

  readonly scope_type?: string;
  readonly scope_id?: string;

  readonly scenario_subject_id?: string;
  readonly scenario_set_id?: string;
  readonly scenario_id?: string;
  readonly trigger_id?: string;
  readonly invalidation_id?: string;
  readonly compute_run_id?: string;

  readonly window_start?: string;
  readonly window_end?: string;

  readonly require_evidence: boolean;
  readonly require_lineage: boolean;
  readonly require_replay_hash: boolean;
  readonly require_restriction_profile: boolean;

  readonly allow_blocked_readiness: boolean;
  readonly allow_shadow_outputs: boolean;
  readonly allow_replay_outputs: boolean;
  readonly allow_repair_outputs: boolean;

  readonly policy_version: string;
}

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.14 — Read surface descriptor                            */
/* ────────────────────────────────────────────────────────────── */

export interface L12ReadSurfaceDescriptor {
  readonly read_surface_id: L12ReadSurfaceId;

  readonly backing_durable_surfaces: readonly L12DurableSurfaceId[];

  readonly allowed_read_modes: readonly L12ReadMode[];
  readonly allowed_consumers: readonly L12ConsumerClass[];

  readonly requires_scope: boolean;
  readonly requires_scenario_id: boolean;
  readonly requires_scenario_set_id: boolean;
  readonly requires_run_id: boolean;

  readonly requires_evidence: boolean;
  readonly requires_lineage: boolean;
  readonly requires_replay_hash: boolean;
  readonly requires_restriction_profile: boolean;

  readonly exposes_current_authority: boolean;
  readonly exposes_historical: boolean;
  readonly exposes_evidence: boolean;
  readonly exposes_lineage: boolean;

  readonly policy_version: string;
}

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.16 — Governed read result                               */
/* ────────────────────────────────────────────────────────────── */

export interface L12GovernedReadResult<T> {
  readonly read_result_id: string;

  readonly read_request_id: string;
  readonly read_surface_id: L12ReadSurfaceId;
  readonly read_mode: L12ReadMode;

  readonly payload: T;

  readonly source_durable_surface_refs: readonly L12DurableSurfaceId[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash_refs: readonly string[];

  readonly restriction_profile_ref?: string;

  readonly freshness_class: L12ReadFreshnessClass;

  readonly served_from_cache: boolean;
  readonly cache_authoritative: false;

  readonly policy_version: string;
}
