/**
 * L6.7 — Persistence Surface Contracts
 *
 * §6.7.1 — Layer 6 does not create a parallel storage universe. It persists
 * through Layer 5 only. This contract surface enumerates the five legal
 * persistence classes, the four legal materialization modes, the logical
 * durable surfaces required by §6.7.2, and the identity law every persisted
 * L6 object must satisfy (§6.7.1.6).
 */

/**
 * §6.7.1.3 — Five persistence classes every L6 output resolves to.
 */
export enum L6PersistenceClass {
  DEFINITION_STATE = 'DEFINITION_STATE',
  RUNTIME_COORDINATION_STATE = 'RUNTIME_COORDINATION_STATE',
  CURRENT_AUTHORITATIVE_STATE = 'CURRENT_AUTHORITATIVE_STATE',
  HISTORICAL_STATE = 'HISTORICAL_STATE',
  EVIDENCE_STATE = 'EVIDENCE_STATE',
}

export const ALL_PERSISTENCE_CLASSES: readonly L6PersistenceClass[] =
  Object.values(L6PersistenceClass);

/**
 * §6.7.1.5 — Four legal materialization modes. Every persisted object must
 * carry exactly one, explicitly tagged in lineage.
 */
export enum L6MaterializationMode {
  LIVE_MATERIALIZATION = 'LIVE_MATERIALIZATION',
  REPLAY_MATERIALIZATION = 'REPLAY_MATERIALIZATION',
  REPAIR_MATERIALIZATION = 'REPAIR_MATERIALIZATION',
  LATE_DATA_GOVERNED_REMATERIALIZATION = 'LATE_DATA_GOVERNED_REMATERIALIZATION',
}

export const ALL_MATERIALIZATION_MODES: readonly L6MaterializationMode[] =
  Object.values(L6MaterializationMode);

export function isRematerializationMode(m: L6MaterializationMode): boolean {
  return (
    m === L6MaterializationMode.REPAIR_MATERIALIZATION ||
    m === L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION
  );
}

export function isHistoricalMaterializationMode(m: L6MaterializationMode): boolean {
  return (
    m === L6MaterializationMode.REPLAY_MATERIALIZATION ||
    m === L6MaterializationMode.REPAIR_MATERIALIZATION
  );
}

/**
 * §6.7.2.1 — Logical durable surfaces Layer 6 owns. Each must map to a
 * concrete L5-backed store via its `authority_store`.
 */
export enum L6DurableSurfaceId {
  FEATURE_DEFINITIONS = 'l6.feature_definitions',
  EVENT_DEFINITIONS = 'l6.event_definitions',
  COMPUTE_RUNS = 'l6.compute_runs',
  FEATURE_CURRENT_REGISTRY = 'l6.feature_current_registry',
  EVENT_CURRENT_REGISTRY = 'l6.event_current_registry',
  EVENT_TRANSITIONS = 'l6.event_transitions',
  DEPENDENCY_WATERMARKS = 'l6.dependency_watermarks',
  COMPUTE_FAILURES = 'l6.compute_failures',
  EVIDENCE_PACK_INDEX = 'l6.evidence_pack_index',
}

export const ALL_DURABLE_SURFACE_IDS: readonly L6DurableSurfaceId[] =
  Object.values(L6DurableSurfaceId);

export enum L6AuthorityStore {
  POSTGRES = 'POSTGRES',
  CLICKHOUSE = 'CLICKHOUSE',
  OBJECT_STORE = 'OBJECT_STORE',
  REDIS_CACHE = 'REDIS_CACHE',
}

export enum L6MutationDiscipline {
  APPEND_ONLY = 'APPEND_ONLY',
  APPEND_ORIENTED_WITH_VERSIONED_CORRECTION = 'APPEND_ORIENTED_WITH_VERSIONED_CORRECTION',
  SUPERSEDING_CURRENT_AUTHORITY = 'SUPERSEDING_CURRENT_AUTHORITY',
  IMMUTABLE = 'IMMUTABLE',
  MUTABLE_COORDINATION_ONLY = 'MUTABLE_COORDINATION_ONLY',
}

export interface L6DurableSurfaceSpec {
  readonly surface_id: L6DurableSurfaceId;
  readonly persistence_class: L6PersistenceClass;
  readonly authority_store: L6AuthorityStore;
  readonly mutation_discipline: L6MutationDiscipline;
  readonly required_fields: readonly string[];
  readonly manifest_linkage_required: boolean;
  readonly replay_identity_required: boolean;
  readonly redis_cache_permitted: boolean;
  readonly description: string;
}

/**
 * §6.7.2.2–6.7.2.10 — Registry of the required durable surfaces.
 * These are the logical contracts; concrete table shapes live in L5 physical.
 */
export const DURABLE_SURFACE_REGISTRY: Readonly<Record<L6DurableSurfaceId, L6DurableSurfaceSpec>> = Object.freeze({
  [L6DurableSurfaceId.FEATURE_DEFINITIONS]: {
    surface_id: L6DurableSurfaceId.FEATURE_DEFINITIONS,
    persistence_class: L6PersistenceClass.DEFINITION_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.APPEND_ONLY,
    required_fields: [
      'feature_id', 'feature_family', 'feature_version', 'scope_type',
      'scope_granularity', 'contract_version', 'rollout_state',
      'effective_from', 'supersedes_ref', 'created_at',
    ],
    manifest_linkage_required: true,
    replay_identity_required: false,
    redis_cache_permitted: false,
    description: 'versioned registry of legal feature contracts and rollout status',
  },
  [L6DurableSurfaceId.EVENT_DEFINITIONS]: {
    surface_id: L6DurableSurfaceId.EVENT_DEFINITIONS,
    persistence_class: L6PersistenceClass.DEFINITION_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.APPEND_ONLY,
    required_fields: [
      'event_id', 'event_family', 'event_version', 'scope_type',
      'lifecycle_policy_version', 'suppression_binding', 'rollout_state',
      'effective_from', 'supersedes_ref',
    ],
    manifest_linkage_required: true,
    replay_identity_required: false,
    redis_cache_permitted: false,
    description: 'versioned registry of legal event contracts and lifecycle semantics',
  },
  [L6DurableSurfaceId.COMPUTE_RUNS]: {
    surface_id: L6DurableSurfaceId.COMPUTE_RUNS,
    persistence_class: L6PersistenceClass.RUNTIME_COORDINATION_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.MUTABLE_COORDINATION_ONLY,
    required_fields: [
      'compute_run_id', 'dag_version', 'mode', 'replay_mode_flag',
      'repair_mode_flag', 'trigger_source', 'parent_run_id', 'trace_id',
      'input_snapshot_ref', 'definition_version_set', 'run_status',
      'started_at', 'completed_at', 'node_count', 'output_count', 'failure_count',
    ],
    manifest_linkage_required: true,
    replay_identity_required: true,
    redis_cache_permitted: false,
    description: 'authoritative registry of each DAG execution run',
  },
  [L6DurableSurfaceId.FEATURE_CURRENT_REGISTRY]: {
    surface_id: L6DurableSurfaceId.FEATURE_CURRENT_REGISTRY,
    persistence_class: L6PersistenceClass.CURRENT_AUTHORITATIVE_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.SUPERSEDING_CURRENT_AUTHORITY,
    required_fields: [
      'feature_id', 'feature_version', 'scope_type', 'scope_id',
      'as_of', 'effective_at', 'replay_hash', 'validity_state',
      'quality_state', 'confidence_band', 'freshness_state', 'null_state',
      'late_data_class', 'evidence_pack_ref', 'input_snapshot_ref',
      'compute_run_id',
    ],
    manifest_linkage_required: true,
    replay_identity_required: true,
    redis_cache_permitted: true,
    description: 'current authoritative feature state by scope and feature version',
  },
  [L6DurableSurfaceId.EVENT_CURRENT_REGISTRY]: {
    surface_id: L6DurableSurfaceId.EVENT_CURRENT_REGISTRY,
    persistence_class: L6PersistenceClass.CURRENT_AUTHORITATIVE_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.SUPERSEDING_CURRENT_AUTHORITY,
    required_fields: [
      'event_instance_id', 'event_id', 'event_version', 'scope_type', 'scope_id',
      'lifecycle_state', 'candidate_at', 'confirmed_at', 'active_at',
      'resolved_at', 'expired_at', 'severity_band', 'confidence_band',
      'dedupe_key', 'suppression_group', 'evidence_pack_ref',
      'compute_run_id', 'replay_hash',
    ],
    manifest_linkage_required: true,
    replay_identity_required: true,
    redis_cache_permitted: true,
    description: 'current authoritative lifecycle state of current event instances',
  },
  [L6DurableSurfaceId.EVENT_TRANSITIONS]: {
    surface_id: L6DurableSurfaceId.EVENT_TRANSITIONS,
    persistence_class: L6PersistenceClass.HISTORICAL_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.IMMUTABLE,
    required_fields: [
      'event_instance_id', 'transition_id', 'prior_state', 'new_state',
      'transition_reason', 'transitioned_at', 'compute_run_id',
      'evidence_pack_ref', 'replay_hash',
    ],
    manifest_linkage_required: true,
    replay_identity_required: true,
    redis_cache_permitted: false,
    description: 'immutable event-lifecycle transition log',
  },
  [L6DurableSurfaceId.DEPENDENCY_WATERMARKS]: {
    surface_id: L6DurableSurfaceId.DEPENDENCY_WATERMARKS,
    persistence_class: L6PersistenceClass.RUNTIME_COORDINATION_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.MUTABLE_COORDINATION_ONLY,
    required_fields: [
      'watermark_id', 'primitive_family', 'dependency_surface_id',
      'scope_type', 'scope_id', 'processed_through_observed_at',
      'processed_through_ingested_at', 'last_compute_run_id',
      'dirty_flag', 'recompute_class',
    ],
    manifest_linkage_required: false,
    replay_identity_required: false,
    redis_cache_permitted: false,
    description: 'processed-through markers for dependency-driven recomputation',
  },
  [L6DurableSurfaceId.COMPUTE_FAILURES]: {
    surface_id: L6DurableSurfaceId.COMPUTE_FAILURES,
    persistence_class: L6PersistenceClass.RUNTIME_COORDINATION_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.MUTABLE_COORDINATION_ONLY,
    required_fields: [
      'failure_id', 'compute_run_id', 'primitive_id', 'scope',
      'phase', 'failure_code', 'severity', 'retry_class',
      'blocking_flag', 'first_seen_at', 'last_seen_at', 'resolved_at',
    ],
    manifest_linkage_required: false,
    replay_identity_required: false,
    redis_cache_permitted: false,
    description: 'durable failure registry for compute and materialization breakdowns',
  },
  [L6DurableSurfaceId.EVIDENCE_PACK_INDEX]: {
    surface_id: L6DurableSurfaceId.EVIDENCE_PACK_INDEX,
    persistence_class: L6PersistenceClass.EVIDENCE_STATE,
    authority_store: L6AuthorityStore.POSTGRES,
    mutation_discipline: L6MutationDiscipline.APPEND_ONLY,
    required_fields: [
      'evidence_pack_id', 'primitive_id', 'primitive_version',
      'scope', 'as_of', 'compute_run_id', 'trace_id', 'replay_hash',
      'archive_uri', 'archive_checksum',
    ],
    manifest_linkage_required: true,
    replay_identity_required: true,
    redis_cache_permitted: false,
    description: 'discovery and lineage index for evidence packs stored in object storage',
  },
});

/**
 * §6.7.1.6 — Every persisted L6 object must resolve to this identity.
 */
export interface L6PersistenceIdentity {
  readonly primitive_id: string;
  readonly primitive_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly temporal_anchor: string;
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly storage_manifest_id: string;
}

export interface L6PersistenceEnvelope {
  readonly identity: L6PersistenceIdentity;
  readonly persistence_class: L6PersistenceClass;
  readonly materialization_mode: L6MaterializationMode;
  readonly target_surface: L6DurableSurfaceId;
  readonly l5_envelope_id: string;
  readonly evidence_pack_ref: string | null;
  readonly payload_keys: readonly string[];
  readonly emitted_at: string;
}

/**
 * §6.7.1.7, §6.7.4.8, §6.7.5.7 — Machine codes emitted by persistence
 * validators. Used for both audit and deterministic test assertions.
 */
export enum L6PersistenceViolationCode {
  DIRECT_STORE_WRITE = 'DIRECT_STORE_WRITE',
  MISSING_MANIFEST_LINKAGE = 'MISSING_MANIFEST_LINKAGE',
  MISSING_REPLAY_IDENTITY = 'MISSING_REPLAY_IDENTITY',
  ILLEGAL_SINK_SELECTION = 'ILLEGAL_SINK_SELECTION',
  UNKNOWN_SURFACE = 'UNKNOWN_SURFACE',
  AUTHORITY_MISROUTE = 'AUTHORITY_MISROUTE',
  SHADOW_AUTHORITY_WRITE = 'SHADOW_AUTHORITY_WRITE',
  ILLEGAL_SUPERSESSION = 'ILLEGAL_SUPERSESSION',
  SILENT_CURRENT_OVERWRITE = 'SILENT_CURRENT_OVERWRITE',
  REPLAY_AS_LIVE_CURRENT = 'REPLAY_AS_LIVE_CURRENT',
  REPAIR_WITHOUT_TAG = 'REPAIR_WITHOUT_TAG',
  MISSING_EVIDENCE_ARCHIVE = 'MISSING_EVIDENCE_ARCHIVE',
  EVIDENCE_WITHOUT_MANIFEST = 'EVIDENCE_WITHOUT_MANIFEST',
  ORPHAN_EVIDENCE_PACK = 'ORPHAN_EVIDENCE_PACK',
  EVIDENCE_REQUIRED_MISSING = 'EVIDENCE_REQUIRED_MISSING',
  CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS = 'CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS',
  HISTORICAL_WRITE_WITHOUT_REPLAY_IDENTITY = 'HISTORICAL_WRITE_WITHOUT_REPLAY_IDENTITY',
  IDENTITY_INCOMPLETE = 'IDENTITY_INCOMPLETE',
  ILLEGAL_MATERIALIZATION_MODE = 'ILLEGAL_MATERIALIZATION_MODE',
  MUTATION_DISCIPLINE_VIOLATION = 'MUTATION_DISCIPLINE_VIOLATION',
  REDIS_SHADOW_AUTHORITY = 'REDIS_SHADOW_AUTHORITY',
  AMBIGUOUS_READ_MODE = 'AMBIGUOUS_READ_MODE',
  AD_HOC_RECOMPUTE = 'AD_HOC_RECOMPUTE',
  RAW_STORAGE_CONSUMPTION = 'RAW_STORAGE_CONSUMPTION',
}

export const ALL_PERSISTENCE_VIOLATION_CODES: readonly L6PersistenceViolationCode[] =
  Object.values(L6PersistenceViolationCode);
