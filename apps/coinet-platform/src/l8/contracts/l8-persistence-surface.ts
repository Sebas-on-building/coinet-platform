/**
 * L8.8 — Durable Persistence Surfaces
 *
 * §8.8.2 / §8.8.3 / §8.8.4 — Every L8 write goes through Layer 5.
 * This file declares the frozen logical surfaces L8 persists against,
 * the authority store for each, the mutation discipline it obeys,
 * the legal materialization modes, and the identity / lineage /
 * evidence / archive requirements each surface imposes.
 *
 * This file is contract-only — registration + lookup + validation
 * live under `src/l8/persistence/` and `src/l8/registry/`.
 */

// ── Durable Surface IDs ─────────────────────────────────────────────────

/**
 * §8.8.3.1 / §8.8.3.3 — The full, frozen set of durable logical
 * surfaces Layer 8 persists. Downstream layers must address these
 * logical surfaces, never the raw physical tables.
 */
export enum L8DurableSurfaceId {
  REGIME_SUBJECT_DEFINITIONS = 'l8.regime_subject_definitions',
  REGIME_RUNS = 'l8.regime_runs',

  CURRENT_REGIME_REGISTRY = 'l8.current_regime_registry',
  CURRENT_TRANSITION_REGISTRY = 'l8.current_transition_registry',
  CURRENT_CONFIDENCE_REGISTRY = 'l8.current_confidence_registry',
  CURRENT_MULTIPLIER_REGISTRY = 'l8.current_multiplier_registry',

  REGIME_TRANSITIONS = 'l8.regime_transitions',
  REGIME_FAILURES = 'l8.regime_failures',

  HISTORICAL_REGIME_FACTS = 'l8.ts_regime_fact_v1',
  HISTORICAL_TRANSITION_FACTS = 'l8.ts_regime_transition_v1',
  HISTORICAL_CONFIDENCE_FACTS = 'l8.ts_regime_confidence_v1',
  HISTORICAL_MULTIPLIER_FACTS = 'l8.ts_regime_multiplier_v1',

  EVIDENCE_REGISTRY = 'l8.evidence_registry',
  LINEAGE_REGISTRY = 'l8.regime_lineage_registry',
}

export const ALL_L8_DURABLE_SURFACE_IDS: readonly L8DurableSurfaceId[] =
  Object.values(L8DurableSurfaceId);

export function isL8DurableSurfaceId(x: unknown): x is L8DurableSurfaceId {
  return typeof x === 'string' &&
    ALL_L8_DURABLE_SURFACE_IDS.includes(x as L8DurableSurfaceId);
}

// ── Authority stores ────────────────────────────────────────────────────

/**
 * §8.8.2.3 / §8.8.2.5 — Every durable surface declares exactly one
 * authoritative home. Redis is explicitly NOT an authority store; it
 * may accelerate reads but may never become regime / transition /
 * confidence / multiplier authority.
 */
export enum L8AuthorityStore {
  POSTGRES = 'POSTGRES',
  CLICKHOUSE = 'CLICKHOUSE',
  OBJECT_STORE = 'OBJECT_STORE',
}

export const ALL_L8_AUTHORITY_STORES: readonly L8AuthorityStore[] =
  Object.values(L8AuthorityStore);

export function isL8AuthorityStore(x: unknown): x is L8AuthorityStore {
  return typeof x === 'string' &&
    ALL_L8_AUTHORITY_STORES.includes(x as L8AuthorityStore);
}

// ── Mutation discipline ─────────────────────────────────────────────────

/**
 * §8.8.2.4 / §8.8.4.3 — Mutation discipline controls how a surface is
 * allowed to change. History is append-only; current state supersedes
 * through linked pointers; transitions/failures append; pointers append.
 */
export enum L8MutationDiscipline {
  /** Append-only fact rows; writes never mutate prior rows. */
  IMMUTABLE_APPEND = 'IMMUTABLE_APPEND',
  /** Current-state row supersedes prior current row via linked ref. */
  CURRENT_SUPERSEDED = 'CURRENT_SUPERSEDED',
  /** Append-only transition record coupled to prior/new state pair. */
  TRANSITION_APPEND = 'TRANSITION_APPEND',
  /** Append-only failure surface. */
  FAILURE_APPEND = 'FAILURE_APPEND',
  /** Append-only pointer rows (evidence / lineage). */
  POINTER_APPEND = 'POINTER_APPEND',
  /** Cache-only surface; never authoritative, always rebuildable. */
  CACHE_ONLY = 'CACHE_ONLY',
}

export const ALL_L8_MUTATION_DISCIPLINES: readonly L8MutationDiscipline[] =
  Object.values(L8MutationDiscipline);

// ── Persistence classes ─────────────────────────────────────────────────

/**
 * §8.8.3.2 — `L8PersistenceClass` categorises WHAT kind of durable
 * object a materialization is writing. Validators and audit use this
 * to quickly classify a persistence attempt.
 */
export enum L8PersistenceClass {
  SUBJECT_DEFINITION = 'SUBJECT_DEFINITION',
  REGIME_RUN = 'REGIME_RUN',

  CURRENT_REGIME = 'CURRENT_REGIME',
  CURRENT_TRANSITION = 'CURRENT_TRANSITION',
  CURRENT_CONFIDENCE = 'CURRENT_CONFIDENCE',
  CURRENT_MULTIPLIER = 'CURRENT_MULTIPLIER',

  REGIME_TRANSITION = 'REGIME_TRANSITION',
  REGIME_FAILURE = 'REGIME_FAILURE',

  HISTORICAL_REGIME = 'HISTORICAL_REGIME',
  HISTORICAL_TRANSITION = 'HISTORICAL_TRANSITION',
  HISTORICAL_CONFIDENCE = 'HISTORICAL_CONFIDENCE',
  HISTORICAL_MULTIPLIER = 'HISTORICAL_MULTIPLIER',

  EVIDENCE_POINTER = 'EVIDENCE_POINTER',
  LINEAGE_POINTER = 'LINEAGE_POINTER',
}

export const ALL_L8_PERSISTENCE_CLASSES: readonly L8PersistenceClass[] =
  Object.values(L8PersistenceClass);

// ── Materialization modes ───────────────────────────────────────────────

/**
 * §8.8.5.5 — Every durable write MUST be tagged with exactly one mode.
 * Live writes go to current registries + emit historical append rows;
 * replay / repair / late-data writes reconstruct historical truth and
 * NEVER silently mutate current state.
 */
export enum L8MaterializationMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL_APPEND = 'LIVE_HISTORICAL_APPEND',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_REBUILD = 'REPAIR_REBUILD',
  LATE_DATA_REMATERIALIZATION = 'LATE_DATA_REMATERIALIZATION',
}

export const ALL_L8_MATERIALIZATION_MODES: readonly L8MaterializationMode[] =
  Object.values(L8MaterializationMode);

export function isL8MaterializationMode(
  x: unknown,
): x is L8MaterializationMode {
  return typeof x === 'string' &&
    ALL_L8_MATERIALIZATION_MODES.includes(x as L8MaterializationMode);
}

/**
 * Legal-mode table per durable surface. Current registries accept only
 * `LIVE_CURRENT`; historical facts accept live-append/replay/repair/
 * late-data; transition/failure/evidence/lineage accept their natural
 * emission modes.
 */
export const L8_SURFACE_LEGAL_MODES: Readonly<
  Record<L8DurableSurfaceId, readonly L8MaterializationMode[]>
> = {
  [L8DurableSurfaceId.REGIME_SUBJECT_DEFINITIONS]: [
    L8MaterializationMode.LIVE_CURRENT,
  ],
  [L8DurableSurfaceId.REGIME_RUNS]: [
    L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    L8MaterializationMode.REPLAY_HISTORICAL,
    L8MaterializationMode.REPAIR_REBUILD,
    L8MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ],

  [L8DurableSurfaceId.CURRENT_REGIME_REGISTRY]: [
    L8MaterializationMode.LIVE_CURRENT,
  ],
  [L8DurableSurfaceId.CURRENT_TRANSITION_REGISTRY]: [
    L8MaterializationMode.LIVE_CURRENT,
  ],
  [L8DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY]: [
    L8MaterializationMode.LIVE_CURRENT,
  ],
  [L8DurableSurfaceId.CURRENT_MULTIPLIER_REGISTRY]: [
    L8MaterializationMode.LIVE_CURRENT,
  ],

  [L8DurableSurfaceId.REGIME_TRANSITIONS]: [
    L8MaterializationMode.LIVE_CURRENT,
    L8MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ],
  [L8DurableSurfaceId.REGIME_FAILURES]: [
    L8MaterializationMode.LIVE_CURRENT,
    L8MaterializationMode.REPLAY_HISTORICAL,
    L8MaterializationMode.REPAIR_REBUILD,
    L8MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ],

  [L8DurableSurfaceId.HISTORICAL_REGIME_FACTS]: [
    L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    L8MaterializationMode.REPLAY_HISTORICAL,
    L8MaterializationMode.REPAIR_REBUILD,
    L8MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ],
  [L8DurableSurfaceId.HISTORICAL_TRANSITION_FACTS]: [
    L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    L8MaterializationMode.REPLAY_HISTORICAL,
    L8MaterializationMode.REPAIR_REBUILD,
    L8MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ],
  [L8DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS]: [
    L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    L8MaterializationMode.REPLAY_HISTORICAL,
    L8MaterializationMode.REPAIR_REBUILD,
    L8MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ],
  [L8DurableSurfaceId.HISTORICAL_MULTIPLIER_FACTS]: [
    L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    L8MaterializationMode.REPLAY_HISTORICAL,
    L8MaterializationMode.REPAIR_REBUILD,
    L8MaterializationMode.LATE_DATA_REMATERIALIZATION,
  ],

  [L8DurableSurfaceId.EVIDENCE_REGISTRY]: [
    L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    L8MaterializationMode.REPLAY_HISTORICAL,
    L8MaterializationMode.REPAIR_REBUILD,
  ],
  [L8DurableSurfaceId.LINEAGE_REGISTRY]: [
    L8MaterializationMode.LIVE_HISTORICAL_APPEND,
    L8MaterializationMode.REPLAY_HISTORICAL,
    L8MaterializationMode.REPAIR_REBUILD,
  ],
};

// ── Durable surface descriptor ──────────────────────────────────────────

/**
 * §8.8.3.4 — Frozen descriptor for each durable surface. The registry
 * is the single source of truth that persistence validators consult.
 */
export interface L8DurableSurfaceDescriptor {
  readonly surface_id: L8DurableSurfaceId;
  readonly persistence_class: L8PersistenceClass;
  readonly authority_store: L8AuthorityStore;
  readonly mutation_discipline: L8MutationDiscipline;
  readonly allowed_modes: readonly L8MaterializationMode[];
  readonly required_identity_fields: readonly string[];
  readonly required_lineage_fields: readonly string[];
  readonly requires_replay_hash: boolean;
  readonly requires_evidence_ref: boolean;
  readonly requires_archive_pointer: boolean;
  readonly caches_allowed: boolean;
  readonly description: string;
}

// ── Persistence envelope ────────────────────────────────────────────────

/**
 * §8.8.5.5 / §8.8.9.1 — A normalized envelope produced by L8 after a
 * runtime output is deemed contract-valid and materialization-ready.
 * The materialization pipeline adapts this into an L5 StorageEnvelope.
 *
 * Unlike L7, the L8 envelope tracks ALL four ratified reliance surfaces
 * (regime / transition / confidence / multiplier) explicitly so replay
 * can rebuild the full reliance posture.
 */
export interface L8PersistenceEnvelope {
  readonly envelope_id: string;
  readonly surface_id: L8DurableSurfaceId;
  readonly persistence_class: L8PersistenceClass;
  readonly materialization_mode: L8MaterializationMode;
  readonly authority_store: L8AuthorityStore;
  readonly mutation_discipline: L8MutationDiscipline;

  readonly regime_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly regime_family: string;

  readonly regime_result_id: string | null;
  readonly transition_profile_id: string | null;
  readonly confidence_assessment_id: string | null;
  readonly multiplier_profile_id: string | null;
  readonly reliance_profile_id: string | null;

  readonly as_of: string;
  readonly effective_at: string | null;
  readonly compute_run_id: string;
  readonly policy_version: string | null;
  readonly template_id: string | null;
  readonly replay_generation_ref: string | null;
  readonly replay_hash: string | null;

  readonly superseded_prior_ref: string | null;
  readonly correction_parent_ref: string | null;
  readonly correction_reason: string | null;

  readonly evidence_pointer_refs: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };

  readonly payload_schema: string;
  readonly payload_hash: string;
}

// ── Run record ──────────────────────────────────────────────────────────

/**
 * §8.8.3.2 — `l8.regime_runs` canonical shape. One row per governed
 * regime-engine execution (live, replay, repair, or late-data).
 */
export interface L8RegimeRunRecord {
  readonly compute_run_id: string;
  readonly materialization_mode: L8MaterializationMode;
  readonly policy_version: string;
  readonly template_id: string | null;
  readonly started_at: string;
  readonly finished_at: string | null;
  readonly replay_generation_ref: string | null;
  readonly parent_run_id: string | null;
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
}

// ── Transition record ───────────────────────────────────────────────────

/**
 * §8.8.3.2 — `l8.regime_transitions`. Every current-state change emits
 * a transition record; `delta_kind` classifies what changed.
 */
export enum L8TransitionDeltaKind {
  PRIMARY_REGIME_CHANGED = 'PRIMARY_REGIME_CHANGED',
  SECONDARY_REGIME_CHANGED = 'SECONDARY_REGIME_CHANGED',
  COEXISTENCE_CLASS_CHANGED = 'COEXISTENCE_CLASS_CHANGED',
  TRANSITION_RISK_CLASS_CHANGED = 'TRANSITION_RISK_CLASS_CHANGED',
  CONFIDENCE_BAND_CHANGED = 'CONFIDENCE_BAND_CHANGED',
  MULTIPLIER_POSTURE_CHANGED = 'MULTIPLIER_POSTURE_CHANGED',
  RELIANCE_READINESS_CHANGED = 'RELIANCE_READINESS_CHANGED',
  BLOCKED_TOGGLED = 'BLOCKED_TOGGLED',
}

export const ALL_L8_TRANSITION_DELTA_KINDS:
  readonly L8TransitionDeltaKind[] = Object.values(L8TransitionDeltaKind);

export interface L8RegimeTransitionRecord {
  readonly transition_id: string;
  readonly regime_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly regime_family: string;
  readonly delta_kind: L8TransitionDeltaKind;
  readonly prior_state_ref: string | null;
  readonly new_state_ref: string;
  readonly transition_reason: string;
  readonly compute_run_id: string;
  readonly materialization_mode: L8MaterializationMode;
  readonly timestamp: string;
}

// ── Failure record ──────────────────────────────────────────────────────

/**
 * §8.8.3.2 — `l8.regime_failures`. Failures are first-class operational
 * truth, not log lines.
 */
export enum L8MaterializationStage {
  CONTRACT_LEGALITY = 'CONTRACT_LEGALITY',
  RUNTIME_COMPLETENESS = 'RUNTIME_COMPLETENESS',
  MATERIALIZATION_READINESS = 'MATERIALIZATION_READINESS',
  L5_ENVELOPE_ADAPTATION = 'L5_ENVELOPE_ADAPTATION',
  L5_PERSISTENCE_COORDINATION = 'L5_PERSISTENCE_COORDINATION',
  EVIDENCE_PERSISTENCE = 'EVIDENCE_PERSISTENCE',
  TRANSITION_EMISSION = 'TRANSITION_EMISSION',
  REPAIR_EMISSION = 'REPAIR_EMISSION',
}

export const ALL_L8_MATERIALIZATION_STAGES:
  readonly L8MaterializationStage[] = Object.values(L8MaterializationStage);

export interface L8RegimeFailureRecord {
  readonly failure_id: string;
  readonly regime_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly regime_family: string;
  readonly stage: L8MaterializationStage;
  readonly failure_code: string;
  readonly missing_surfaces: readonly L8DurableSurfaceId[];
  readonly materialization_ready: boolean;
  readonly materialization_mode: L8MaterializationMode;
  readonly retry_eligible: boolean;
  readonly compute_run_id: string;
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly detail: string;
}
