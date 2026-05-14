/**
 * L12.6 — Durable persistence surfaces, storage authority, mutation
 * discipline, materialization modes, and the persistence envelope (§12.6.3 –
 * §12.6.7).
 *
 * These contracts describe *where* L12 truth lives, *how* it may be mutated,
 * and *which mode* a materialization may use. All actual writes happen
 * through L5 — L12.6 only emits envelopes that L5 routes consume.
 */

import { L12ScenarioRunMode } from '../runtime/scenario-compute-run';

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.3 — Durable logical surfaces                            */
/* ────────────────────────────────────────────────────────────── */

export enum L12DurableSurfaceId {
  SCENARIO_SUBJECT_DEFINITIONS = 'l12.scenario_subject_definitions',
  SCENARIO_TEMPLATE_DEFINITIONS = 'l12.scenario_template_definitions',
  SCENARIO_RUNS = 'l12.scenario_runs',

  CURRENT_SCENARIO_REGISTRY = 'l12.current_scenario_registry',
  CURRENT_TRIGGER_REGISTRY = 'l12.current_trigger_registry',
  CURRENT_INVALIDATION_REGISTRY = 'l12.current_invalidation_registry',
  CURRENT_PATH_CONFIDENCE_REGISTRY = 'l12.current_path_confidence_registry',
  CURRENT_SHIFT_CONDITION_REGISTRY = 'l12.current_shift_condition_registry',
  CURRENT_SCENARIO_RESTRICTION_REGISTRY = 'l12.current_scenario_restriction_registry',

  SCENARIO_TRANSITIONS = 'l12.scenario_transitions',
  SCENARIO_FAILURES = 'l12.scenario_failures',

  CURRENT_SCENARIO_EVIDENCE_INDEX = 'l12.current_scenario_evidence_index',
  CURRENT_SCENARIO_LINEAGE_INDEX = 'l12.current_scenario_lineage_index',
}

export const ALL_L12_DURABLE_SURFACE_IDS: readonly L12DurableSurfaceId[] =
  Object.values(L12DurableSurfaceId);

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.4 — Storage authority law                               */
/* ────────────────────────────────────────────────────────────── */

export enum L12StorageAuthorityClass {
  POSTGRES_CURRENT_AUTHORITY = 'POSTGRES_CURRENT_AUTHORITY',
  CLICKHOUSE_HISTORICAL_APPEND = 'CLICKHOUSE_HISTORICAL_APPEND',
  OBJECT_STORAGE_EVIDENCE_ARCHIVE = 'OBJECT_STORAGE_EVIDENCE_ARCHIVE',
  REDIS_ACCELERATION_ONLY = 'REDIS_ACCELERATION_ONLY',
}

export const ALL_L12_STORAGE_AUTHORITY_CLASSES: readonly L12StorageAuthorityClass[] =
  Object.values(L12StorageAuthorityClass);

/**
 * Canonical mapping of durable surface → authoritative storage class
 * (§12.6.4.2). Redis is *never* mapped as authority.
 */
export const L12_DURABLE_SURFACE_AUTHORITY: Readonly<
  Record<L12DurableSurfaceId, L12StorageAuthorityClass>
> = {
  [L12DurableSurfaceId.SCENARIO_SUBJECT_DEFINITIONS]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
  [L12DurableSurfaceId.SCENARIO_TEMPLATE_DEFINITIONS]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
  [L12DurableSurfaceId.SCENARIO_RUNS]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,

  [L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
  [L12DurableSurfaceId.CURRENT_TRIGGER_REGISTRY]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
  [L12DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
  [L12DurableSurfaceId.CURRENT_PATH_CONFIDENCE_REGISTRY]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
  [L12DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
  [L12DurableSurfaceId.CURRENT_SCENARIO_RESTRICTION_REGISTRY]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,

  [L12DurableSurfaceId.SCENARIO_TRANSITIONS]: L12StorageAuthorityClass.CLICKHOUSE_HISTORICAL_APPEND,
  [L12DurableSurfaceId.SCENARIO_FAILURES]: L12StorageAuthorityClass.CLICKHOUSE_HISTORICAL_APPEND,

  [L12DurableSurfaceId.CURRENT_SCENARIO_EVIDENCE_INDEX]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
  [L12DurableSurfaceId.CURRENT_SCENARIO_LINEAGE_INDEX]: L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
};

/** Returns true iff the surface has current-authority semantics. */
export function isL12CurrentAuthoritySurface(s: L12DurableSurfaceId): boolean {
  return (
    L12_DURABLE_SURFACE_AUTHORITY[s] === L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY
  );
}

/** Returns true iff the surface accepts append-only historical writes. */
export function isL12HistoricalAppendSurface(s: L12DurableSurfaceId): boolean {
  return (
    L12_DURABLE_SURFACE_AUTHORITY[s] === L12StorageAuthorityClass.CLICKHOUSE_HISTORICAL_APPEND
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.5 — Mutation discipline                                 */
/* ────────────────────────────────────────────────────────────── */

export enum L12MutationDiscipline {
  CURRENT_UPSERT_WITH_SUPERSESSION = 'CURRENT_UPSERT_WITH_SUPERSESSION',
  APPEND_ONLY_HISTORY = 'APPEND_ONLY_HISTORY',
  IMMUTABLE_EVIDENCE_ARCHIVE = 'IMMUTABLE_EVIDENCE_ARCHIVE',
  FAILURE_APPEND_ONLY = 'FAILURE_APPEND_ONLY',
  TRANSITION_APPEND_ONLY = 'TRANSITION_APPEND_ONLY',
  CACHE_REFRESH_ONLY = 'CACHE_REFRESH_ONLY',
}

export const ALL_L12_MUTATION_DISCIPLINES: readonly L12MutationDiscipline[] =
  Object.values(L12MutationDiscipline);

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.6 — Materialization modes                               */
/* ────────────────────────────────────────────────────────────── */

export enum L12MaterializationMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL_APPEND = 'LIVE_HISTORICAL_APPEND',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_SUPERSESSION = 'REPAIR_SUPERSESSION',
  BACKFILL_HISTORICAL = 'BACKFILL_HISTORICAL',
  SHADOW_EVALUATION = 'SHADOW_EVALUATION',
  LATE_DATA_REMATERIALIZATION = 'LATE_DATA_REMATERIALIZATION',
  FAILURE_RECORD = 'FAILURE_RECORD',
}

export const ALL_L12_MATERIALIZATION_MODES: readonly L12MaterializationMode[] =
  Object.values(L12MaterializationMode);

/** True iff the mode may write current authority (§12.6.6). */
export function l12ModeMayWriteCurrent(mode: L12MaterializationMode): boolean {
  return (
    mode === L12MaterializationMode.LIVE_CURRENT ||
    mode === L12MaterializationMode.REPAIR_SUPERSESSION ||
    mode === L12MaterializationMode.LATE_DATA_REMATERIALIZATION
  );
}

/** True iff the mode may write historical append surfaces. */
export function l12ModeMayWriteHistorical(mode: L12MaterializationMode): boolean {
  return (
    mode === L12MaterializationMode.LIVE_HISTORICAL_APPEND ||
    mode === L12MaterializationMode.REPLAY_HISTORICAL ||
    mode === L12MaterializationMode.BACKFILL_HISTORICAL ||
    mode === L12MaterializationMode.LATE_DATA_REMATERIALIZATION ||
    mode === L12MaterializationMode.FAILURE_RECORD
  );
}

/** True iff a run-mode legitimately produces current-authority writes. */
export function l12RunModeMayWriteCurrent(mode: L12ScenarioRunMode): boolean {
  return mode === L12ScenarioRunMode.LIVE || mode === L12ScenarioRunMode.REPAIR;
}

/* ────────────────────────────────────────────────────────────── */
/*  §12.6.7 — Persistence envelope                                */
/* ────────────────────────────────────────────────────────────── */

export interface L12PersistenceEnvelope {
  readonly persistence_envelope_id: string;

  readonly durable_surface_id: L12DurableSurfaceId;
  readonly storage_authority: L12StorageAuthorityClass;
  readonly mutation_discipline: L12MutationDiscipline;
  readonly materialization_mode: L12MaterializationMode;

  readonly scenario_subject_id: string;
  readonly scenario_set_id?: string;
  readonly scenario_id?: string;
  readonly trigger_id?: string;
  readonly invalidation_id?: string;
  readonly path_confidence_profile_id?: string;
  readonly shift_condition_set_id?: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly compute_run_id: string;
  readonly source_run_mode: L12ScenarioRunMode;

  readonly current_authority_allowed: boolean;
  readonly historical_append_allowed: boolean;
  readonly evidence_archive_required: boolean;

  readonly evidence_pack_ref?: string;
  readonly input_snapshot_ref?: string;
  readonly lineage_refs: readonly string[];

  readonly supersedes_ref?: string;
  readonly superseded_by_ref?: string;
  readonly correction_of_ref?: string;
  readonly correction_reason?: string;

  readonly l5_route_ref: string;

  readonly direct_write_attempted: false;

  readonly policy_version: string;
  readonly replay_hash: string;
}
