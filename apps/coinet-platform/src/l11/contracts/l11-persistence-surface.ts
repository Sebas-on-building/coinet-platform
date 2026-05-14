/**
 * L11.8 — Persistence Surface, Mutation Discipline, Materialization
 * Modes, and Persistence Envelope (§11.8.2 / §11.8.3 / §11.8.4 /
 * §11.8.5 / §11.8.6)
 *
 * Defines the storage-authority taxonomy, the durable logical
 * surfaces, mutation discipline, materialization modes, and the
 * canonical L11 → L5 persistence envelope.
 */

import { L11ScoreFamily } from './score-family';

export const L11_PERSISTENCE_POLICY_VERSION = 'l11.8.persistence.v1';

// ── Storage authority (§11.8.2.2) ────────────────────────────────

export enum L11StorageAuthorityClass {
  POSTGRES_CURRENT_AUTHORITY = 'POSTGRES_CURRENT_AUTHORITY',
  CLICKHOUSE_HISTORICAL_FACT = 'CLICKHOUSE_HISTORICAL_FACT',
  OBJECT_STORE_EVIDENCE_ARCHIVE = 'OBJECT_STORE_EVIDENCE_ARCHIVE',
  REDIS_ACCELERATION_CACHE = 'REDIS_ACCELERATION_CACHE',
}

export const ALL_L11_STORAGE_AUTHORITY_CLASSES:
  readonly L11StorageAuthorityClass[] =
  Object.values(L11StorageAuthorityClass);

// ── Durable surfaces (§11.8.3) ───────────────────────────────────

export enum L11DurableSurfaceId {
  SCORE_DEFINITIONS = 'l11.score_definitions',
  SCORE_FORMULA_DEFINITIONS = 'l11.score_formula_definitions',
  SCORE_RUNS = 'l11.score_runs',

  CURRENT_SCORE_REGISTRY = 'l11.current_score_registry',
  CURRENT_SCORE_COMPONENT_REGISTRY = 'l11.current_score_component_registry',
  CURRENT_SCORE_ATTRIBUTION_REGISTRY = 'l11.current_score_attribution_registry',
  CURRENT_SCORE_MODIFIER_REGISTRY = 'l11.current_score_modifier_registry',
  CURRENT_MISSING_DATA_REGISTRY = 'l11.current_missing_data_registry',
  CURRENT_CALIBRATION_HOOK_REGISTRY = 'l11.current_calibration_hook_registry',
  CURRENT_DRIFT_REGISTRY = 'l11.current_drift_registry',

  SCORE_TRANSITIONS = 'l11.score_transitions',
  SCORE_FAILURES = 'l11.score_failures',
}

export const ALL_L11_DURABLE_SURFACE_IDS:
  readonly L11DurableSurfaceId[] = Object.values(L11DurableSurfaceId);

// ── Mutation discipline (§11.8.4) ────────────────────────────────

export enum L11MutationDiscipline {
  CURRENT_SUPERSEDE_WITH_PRIOR_REF = 'CURRENT_SUPERSEDE_WITH_PRIOR_REF',
  APPEND_ONLY_FACT = 'APPEND_ONLY_FACT',
  IMMUTABLE_DEFINITION = 'IMMUTABLE_DEFINITION',
  CORRECTION_APPEND = 'CORRECTION_APPEND',
  FAILURE_APPEND = 'FAILURE_APPEND',
  CACHE_REFRESH_ONLY = 'CACHE_REFRESH_ONLY',
}

export const ALL_L11_MUTATION_DISCIPLINES:
  readonly L11MutationDiscipline[] = Object.values(L11MutationDiscipline);

// ── Materialization modes (§11.8.5) ──────────────────────────────

export enum L11MaterializationMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL_APPEND = 'LIVE_HISTORICAL_APPEND',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_REBUILD = 'REPAIR_REBUILD',
  LATE_DATA_REMATERIALIZATION = 'LATE_DATA_REMATERIALIZATION',
  CALIBRATION_APPEND = 'CALIBRATION_APPEND',
  DRIFT_APPEND = 'DRIFT_APPEND',
  FAILURE_APPEND = 'FAILURE_APPEND',
}

export const ALL_L11_MATERIALIZATION_MODES:
  readonly L11MaterializationMode[] = Object.values(L11MaterializationMode);

// ── Persistence class (§11.8.6.2) ────────────────────────────────

export enum L11PersistenceClass {
  SCORE_DEFINITION = 'SCORE_DEFINITION',
  FORMULA_DEFINITION = 'FORMULA_DEFINITION',
  SCORE_RUN = 'SCORE_RUN',
  CURRENT_SCORE = 'CURRENT_SCORE',
  CURRENT_COMPONENT = 'CURRENT_COMPONENT',
  CURRENT_ATTRIBUTION = 'CURRENT_ATTRIBUTION',
  CURRENT_MODIFIER = 'CURRENT_MODIFIER',
  CURRENT_MISSING_DATA = 'CURRENT_MISSING_DATA',
  CURRENT_CALIBRATION_HOOK = 'CURRENT_CALIBRATION_HOOK',
  CURRENT_DRIFT_REPORT = 'CURRENT_DRIFT_REPORT',
  HISTORICAL_SCORE_FACT = 'HISTORICAL_SCORE_FACT',
  HISTORICAL_COMPONENT_FACT = 'HISTORICAL_COMPONENT_FACT',
  HISTORICAL_ATTRIBUTION_FACT = 'HISTORICAL_ATTRIBUTION_FACT',
  HISTORICAL_MODIFIER_FACT = 'HISTORICAL_MODIFIER_FACT',
  HISTORICAL_CALIBRATION_FACT = 'HISTORICAL_CALIBRATION_FACT',
  HISTORICAL_DRIFT_FACT = 'HISTORICAL_DRIFT_FACT',
  HISTORICAL_MISSING_DATA_FACT = 'HISTORICAL_MISSING_DATA_FACT',
  SCORE_TRANSITION = 'SCORE_TRANSITION',
  SCORE_FAILURE = 'SCORE_FAILURE',
}

export const ALL_L11_PERSISTENCE_CLASSES:
  readonly L11PersistenceClass[] = Object.values(L11PersistenceClass);

// ── Surface descriptor (§11.8.3.3) ───────────────────────────────

export interface L11DurableSurfaceDescriptor {
  readonly surface_id: L11DurableSurfaceId;
  readonly authority_class: L11StorageAuthorityClass;
  readonly mutation_discipline: L11MutationDiscipline;
  readonly materialization_modes_allowed: readonly L11MaterializationMode[];
  readonly persistence_classes_allowed: readonly L11PersistenceClass[];
  readonly requires_lineage: boolean;
  readonly requires_replay_hash: boolean;
  readonly requires_policy_version: boolean;
  readonly requires_evidence_ref: boolean;
  readonly current_authority: boolean;
  readonly append_only: boolean;
  readonly correction_aware: boolean;
  readonly caches_allowed: boolean;
}

// ── Persistence envelope (§11.8.6) ───────────────────────────────

export interface L11PersistenceEnvelope<TPayload = unknown> {
  readonly envelope_id: string;

  readonly surface_id: L11DurableSurfaceId;
  readonly persistence_class: L11PersistenceClass;
  readonly materialization_mode: L11MaterializationMode;

  readonly score_family?: L11ScoreFamily;
  readonly score_id?: string;
  readonly run_id?: string;

  readonly scope_type?: string;
  readonly scope_id?: string;
  readonly as_of: string;

  readonly payload: TPayload;

  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];
  readonly input_snapshot_ref?: string;

  readonly replay_hash: string;
  readonly policy_version: string;

  readonly l5_route_ref: string;
  readonly direct_store_write_attempted: false;
}

export function isL11PersistenceEnvelopeStructurallyValid(
  e: L11PersistenceEnvelope<unknown>,
): { ok: boolean; reason: string } {
  if (!e.envelope_id) return { ok: false, reason: 'envelope_id missing' };
  if (!e.surface_id) return { ok: false, reason: 'surface_id missing' };
  if (!e.persistence_class) return { ok: false, reason: 'persistence_class missing' };
  if (!e.materialization_mode) {
    return { ok: false, reason: 'materialization_mode missing' };
  }
  if (e.payload === undefined || e.payload === null) {
    return { ok: false, reason: 'payload missing' };
  }
  if (!e.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  if (!Array.isArray(e.lineage_refs) || e.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  if (!e.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!e.l5_route_ref) return { ok: false, reason: 'l5_route_ref missing' };
  if (!e.as_of) return { ok: false, reason: 'as_of missing' };
  if (e.direct_store_write_attempted !== false) {
    return { ok: false, reason: 'direct_store_write_attempted must be false' };
  }
  return { ok: true, reason: 'ok' };
}

// ── Persistence-class ↔ surface mapping (§11.8.6.3) ──────────────

export const L11_PERSISTENCE_CLASS_FOR_SURFACE:
  Readonly<Record<L11DurableSurfaceId, readonly L11PersistenceClass[]>> = {
  [L11DurableSurfaceId.SCORE_DEFINITIONS]: [
    L11PersistenceClass.SCORE_DEFINITION,
  ],
  [L11DurableSurfaceId.SCORE_FORMULA_DEFINITIONS]: [
    L11PersistenceClass.FORMULA_DEFINITION,
  ],
  [L11DurableSurfaceId.SCORE_RUNS]: [
    L11PersistenceClass.SCORE_RUN,
  ],
  [L11DurableSurfaceId.CURRENT_SCORE_REGISTRY]: [
    L11PersistenceClass.CURRENT_SCORE,
  ],
  [L11DurableSurfaceId.CURRENT_SCORE_COMPONENT_REGISTRY]: [
    L11PersistenceClass.CURRENT_COMPONENT,
  ],
  [L11DurableSurfaceId.CURRENT_SCORE_ATTRIBUTION_REGISTRY]: [
    L11PersistenceClass.CURRENT_ATTRIBUTION,
  ],
  [L11DurableSurfaceId.CURRENT_SCORE_MODIFIER_REGISTRY]: [
    L11PersistenceClass.CURRENT_MODIFIER,
  ],
  [L11DurableSurfaceId.CURRENT_MISSING_DATA_REGISTRY]: [
    L11PersistenceClass.CURRENT_MISSING_DATA,
  ],
  [L11DurableSurfaceId.CURRENT_CALIBRATION_HOOK_REGISTRY]: [
    L11PersistenceClass.CURRENT_CALIBRATION_HOOK,
  ],
  [L11DurableSurfaceId.CURRENT_DRIFT_REGISTRY]: [
    L11PersistenceClass.CURRENT_DRIFT_REPORT,
  ],
  [L11DurableSurfaceId.SCORE_TRANSITIONS]: [
    L11PersistenceClass.SCORE_TRANSITION,
  ],
  [L11DurableSurfaceId.SCORE_FAILURES]: [
    L11PersistenceClass.SCORE_FAILURE,
  ],
};

export function isL11PersistenceClassMatchingSurface(
  cls: L11PersistenceClass,
  surface: L11DurableSurfaceId,
): boolean {
  return L11_PERSISTENCE_CLASS_FOR_SURFACE[surface].includes(cls);
}
