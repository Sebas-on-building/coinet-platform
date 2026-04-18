/**
 * L7.7 — Durable Persistence Surfaces
 *
 * §7.7.2 — Durable logical surfaces, authority-store law, and mutation
 * discipline. Layer 7 does not invent a parallel storage universe: every
 * surface registered here maps to exactly one authority store at Layer 5,
 * a mutation discipline, and identity / lineage requirements.
 *
 * This file is contract-only — registration, lookup, and validation live
 * in `src/l7/persistence/`.
 */

// ── Durable Surface IDs ─────────────────────────────────────────────────

/**
 * §7.7.2.1 / §7.7.2.2 — The full, frozen set of durable logical surfaces
 * Layer 7 persists through Layer 5. Downstream layers must address these
 * logical surfaces, never the raw physical tables.
 */
export enum L7DurableSurfaceId {
  VALIDATION_SUBJECT_DEFINITIONS = 'l7.validation_subject_definitions',
  VALIDATION_RUNS = 'l7.validation_runs',

  CURRENT_VALIDATION_REGISTRY = 'l7.current_validation_registry',
  CURRENT_CONTRADICTION_REGISTRY = 'l7.current_contradiction_registry',
  CURRENT_CONFIDENCE_REGISTRY = 'l7.current_confidence_registry',
  CURRENT_RESTRICTION_REGISTRY = 'l7.current_restriction_registry',

  VALIDATION_TRANSITIONS = 'l7.validation_transitions',
  VALIDATION_FAILURES = 'l7.validation_failures',

  HISTORICAL_VALIDATION_FACTS = 'l7.ts_validation_fact_v1',
  HISTORICAL_CONTRADICTION_FACTS = 'l7.ts_contradiction_fact_v1',
  HISTORICAL_CONFIDENCE_FACTS = 'l7.ts_validation_confidence_v1',
  HISTORICAL_RESTRICTION_FACTS = 'l7.ts_claim_restriction_v1',

  EVIDENCE_POINTERS = 'l7.evidence_pointers',
  LINEAGE_POINTERS = 'l7.lineage_pointers',
}

export const ALL_L7_DURABLE_SURFACE_IDS: readonly L7DurableSurfaceId[] =
  Object.values(L7DurableSurfaceId);

export function isL7DurableSurfaceId(x: unknown): x is L7DurableSurfaceId {
  return typeof x === 'string' && ALL_L7_DURABLE_SURFACE_IDS.includes(x as L7DurableSurfaceId);
}

// ── Authority stores ────────────────────────────────────────────────────

/**
 * §7.7.2.3 — Every durable surface declares exactly one authoritative
 * home. Redis is explicitly NOT an authority store.
 */
export enum L7AuthorityStore {
  POSTGRES = 'POSTGRES',
  CLICKHOUSE = 'CLICKHOUSE',
  OBJECT_STORE = 'OBJECT_STORE',
}

export const ALL_L7_AUTHORITY_STORES: readonly L7AuthorityStore[] =
  Object.values(L7AuthorityStore);

export function isL7AuthorityStore(x: unknown): x is L7AuthorityStore {
  return typeof x === 'string' && ALL_L7_AUTHORITY_STORES.includes(x as L7AuthorityStore);
}

// ── Mutation discipline ─────────────────────────────────────────────────

/**
 * §7.7.2.4 — Mutation discipline controls how a surface is allowed to
 * change: never destructively overwrite history, never overwrite current
 * state without supersession, etc.
 */
export enum L7MutationDiscipline {
  /** Append-only fact rows; writes never mutate prior rows. */
  IMMUTABLE_APPEND = 'IMMUTABLE_APPEND',
  /** Current-state row supersedes prior current row through linked pointer. */
  CURRENT_SUPERSEDED = 'CURRENT_SUPERSEDED',
  /** Append-only transition record coupled to a prior/new state pair. */
  TRANSITION_APPEND = 'TRANSITION_APPEND',
  /** Append-only failure surface. */
  FAILURE_APPEND = 'FAILURE_APPEND',
  /** Append-only pointer rows (evidence / lineage). */
  POINTER_APPEND = 'POINTER_APPEND',
  /** Cache-only surface; never authoritative, always rebuildable. */
  CACHE_ONLY = 'CACHE_ONLY',
}

export const ALL_L7_MUTATION_DISCIPLINES: readonly L7MutationDiscipline[] =
  Object.values(L7MutationDiscipline);

export function isL7MutationDiscipline(x: unknown): x is L7MutationDiscipline {
  return typeof x === 'string' && ALL_L7_MUTATION_DISCIPLINES.includes(x as L7MutationDiscipline);
}

// ── Persistence classes ─────────────────────────────────────────────────

/**
 * §7.7 — `L7PersistenceClass` categorises WHAT kind of durable object a
 * materialization is writing. Used by validators and audit to quickly
 * classify a persistence attempt without round-tripping the whole surface
 * registry.
 */
export enum L7PersistenceClass {
  SUBJECT_DEFINITION = 'SUBJECT_DEFINITION',
  VALIDATION_RUN = 'VALIDATION_RUN',
  CURRENT_VALIDATION = 'CURRENT_VALIDATION',
  CURRENT_CONTRADICTION = 'CURRENT_CONTRADICTION',
  CURRENT_CONFIDENCE = 'CURRENT_CONFIDENCE',
  CURRENT_RESTRICTION = 'CURRENT_RESTRICTION',
  VALIDATION_TRANSITION = 'VALIDATION_TRANSITION',
  VALIDATION_FAILURE = 'VALIDATION_FAILURE',
  HISTORICAL_VALIDATION = 'HISTORICAL_VALIDATION',
  HISTORICAL_CONTRADICTION = 'HISTORICAL_CONTRADICTION',
  HISTORICAL_CONFIDENCE = 'HISTORICAL_CONFIDENCE',
  HISTORICAL_RESTRICTION = 'HISTORICAL_RESTRICTION',
  EVIDENCE_POINTER = 'EVIDENCE_POINTER',
  LINEAGE_POINTER = 'LINEAGE_POINTER',
}

export const ALL_L7_PERSISTENCE_CLASSES: readonly L7PersistenceClass[] =
  Object.values(L7PersistenceClass);

// ── Materialization modes ───────────────────────────────────────────────

/**
 * §7.7.4.2 — Every durable write MUST be tagged with exactly one mode.
 * Live writes go to current registries and emit historical append rows;
 * replay and repair writes reconstruct historical truth and NEVER silently
 * mutate current state.
 */
export enum L7MaterializationMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL = 'LIVE_HISTORICAL',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_REBUILD = 'REPAIR_REBUILD',
  LATE_DATA_REVALIDATION = 'LATE_DATA_REVALIDATION',
}

export const ALL_L7_MATERIALIZATION_MODES: readonly L7MaterializationMode[] =
  Object.values(L7MaterializationMode);

export function isL7MaterializationMode(x: unknown): x is L7MaterializationMode {
  return typeof x === 'string' && ALL_L7_MATERIALIZATION_MODES.includes(x as L7MaterializationMode);
}

/**
 * Legal-mode table per durable surface. Current registries accept only
 * `LIVE_CURRENT`; historical facts accept live/replay/repair/late-data.
 */
export const L7_SURFACE_LEGAL_MODES: Readonly<
  Record<L7DurableSurfaceId, readonly L7MaterializationMode[]>
> = {
  [L7DurableSurfaceId.VALIDATION_SUBJECT_DEFINITIONS]: [
    L7MaterializationMode.LIVE_CURRENT,
  ],
  [L7DurableSurfaceId.VALIDATION_RUNS]: [
    L7MaterializationMode.LIVE_HISTORICAL,
    L7MaterializationMode.REPLAY_HISTORICAL,
    L7MaterializationMode.REPAIR_REBUILD,
    L7MaterializationMode.LATE_DATA_REVALIDATION,
  ],

  [L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY]: [
    L7MaterializationMode.LIVE_CURRENT,
  ],
  [L7DurableSurfaceId.CURRENT_CONTRADICTION_REGISTRY]: [
    L7MaterializationMode.LIVE_CURRENT,
  ],
  [L7DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY]: [
    L7MaterializationMode.LIVE_CURRENT,
  ],
  [L7DurableSurfaceId.CURRENT_RESTRICTION_REGISTRY]: [
    L7MaterializationMode.LIVE_CURRENT,
  ],

  [L7DurableSurfaceId.VALIDATION_TRANSITIONS]: [
    L7MaterializationMode.LIVE_CURRENT,
    L7MaterializationMode.LATE_DATA_REVALIDATION,
  ],
  [L7DurableSurfaceId.VALIDATION_FAILURES]: [
    L7MaterializationMode.LIVE_CURRENT,
    L7MaterializationMode.REPLAY_HISTORICAL,
    L7MaterializationMode.REPAIR_REBUILD,
    L7MaterializationMode.LATE_DATA_REVALIDATION,
  ],

  [L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS]: [
    L7MaterializationMode.LIVE_HISTORICAL,
    L7MaterializationMode.REPLAY_HISTORICAL,
    L7MaterializationMode.REPAIR_REBUILD,
    L7MaterializationMode.LATE_DATA_REVALIDATION,
  ],
  [L7DurableSurfaceId.HISTORICAL_CONTRADICTION_FACTS]: [
    L7MaterializationMode.LIVE_HISTORICAL,
    L7MaterializationMode.REPLAY_HISTORICAL,
    L7MaterializationMode.REPAIR_REBUILD,
    L7MaterializationMode.LATE_DATA_REVALIDATION,
  ],
  [L7DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS]: [
    L7MaterializationMode.LIVE_HISTORICAL,
    L7MaterializationMode.REPLAY_HISTORICAL,
    L7MaterializationMode.REPAIR_REBUILD,
    L7MaterializationMode.LATE_DATA_REVALIDATION,
  ],
  [L7DurableSurfaceId.HISTORICAL_RESTRICTION_FACTS]: [
    L7MaterializationMode.LIVE_HISTORICAL,
    L7MaterializationMode.REPLAY_HISTORICAL,
    L7MaterializationMode.REPAIR_REBUILD,
    L7MaterializationMode.LATE_DATA_REVALIDATION,
  ],

  [L7DurableSurfaceId.EVIDENCE_POINTERS]: [
    L7MaterializationMode.LIVE_HISTORICAL,
    L7MaterializationMode.REPLAY_HISTORICAL,
    L7MaterializationMode.REPAIR_REBUILD,
  ],
  [L7DurableSurfaceId.LINEAGE_POINTERS]: [
    L7MaterializationMode.LIVE_HISTORICAL,
    L7MaterializationMode.REPLAY_HISTORICAL,
    L7MaterializationMode.REPAIR_REBUILD,
  ],
};

// ── Durable surface descriptor ──────────────────────────────────────────

/**
 * §7.7.2.7 — Frozen descriptor for each durable surface. The registry
 * is the single source of truth that persistence validators consult.
 */
export interface L7DurableSurfaceDescriptor {
  readonly surface_id: L7DurableSurfaceId;
  readonly persistence_class: L7PersistenceClass;
  readonly authority_store: L7AuthorityStore;
  readonly mutation_discipline: L7MutationDiscipline;
  readonly allowed_modes: readonly L7MaterializationMode[];
  readonly required_identity_fields: readonly string[];
  readonly required_lineage_fields: readonly string[];
  readonly requires_replay_hash: boolean;
  readonly requires_evidence_ref: boolean;
  readonly requires_archive_pointer: boolean;
  readonly caches_allowed: boolean;
  readonly description: string;
}

// ── Persistence envelope + record shapes ────────────────────────────────

/**
 * §7.7.4.3 — A normalized envelope produced by L7 after a runtime output
 * is deemed contract-valid and materialization-ready. The materialization
 * pipeline adapts this into an L5 StorageEnvelope.
 */
export interface L7PersistenceEnvelope {
  readonly envelope_id: string;
  readonly surface_id: L7DurableSurfaceId;
  readonly persistence_class: L7PersistenceClass;
  readonly materialization_mode: L7MaterializationMode;
  readonly authority_store: L7AuthorityStore;
  readonly mutation_discipline: L7MutationDiscipline;

  readonly subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly validation_result_id: string | null;
  readonly contradiction_bundle_id: string | null;
  readonly confidence_assessment_id: string | null;
  readonly restriction_profile_id: string | null;

  readonly as_of: string;
  readonly effective_at: string | null;
  readonly compute_run_id: string;
  readonly policy_version: string | null;
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

// ── Validation-run record ───────────────────────────────────────────────

/**
 * §7.7.2.1 — `l7.validation_runs` canonical shape. One row per governed
 * runtime execution (live, replay, repair, or late-data).
 */
export interface L7ValidationRunRecord {
  readonly compute_run_id: string;
  readonly materialization_mode: L7MaterializationMode;
  readonly policy_version: string;
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
 * §7.7.4.5 — Every current-state change emits a transition record. The
 * `delta_kind` classifies what changed (class / band / rights / bundle).
 */
export enum L7TransitionDeltaKind {
  VALIDATION_CLASS_CHANGED = 'VALIDATION_CLASS_CHANGED',
  MODIFIERS_CHANGED = 'MODIFIERS_CHANGED',
  CONTRADICTION_BUNDLE_CHANGED = 'CONTRADICTION_BUNDLE_CHANGED',
  CONFIDENCE_BAND_CHANGED = 'CONFIDENCE_BAND_CHANGED',
  RESTRICTION_RIGHTS_CHANGED = 'RESTRICTION_RIGHTS_CHANGED',
  EVIDENCE_ONLY_TOGGLED = 'EVIDENCE_ONLY_TOGGLED',
  BLOCKED_FROM_SCORING_TOGGLED = 'BLOCKED_FROM_SCORING_TOGGLED',
}

export interface L7ValidationTransitionRecord {
  readonly transition_id: string;
  readonly subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly delta_kind: L7TransitionDeltaKind;
  readonly prior_state_ref: string | null;
  readonly new_state_ref: string;
  readonly transition_reason: string;
  readonly compute_run_id: string;
  readonly materialization_mode: L7MaterializationMode;
  readonly timestamp: string;
}

// ── Failure record ──────────────────────────────────────────────────────

/**
 * §7.7.4.6 — `l7.validation_failures`. Failures are first-class operational
 * truth — not log lines.
 */
export enum L7MaterializationStage {
  CONTRACT_LEGALITY = 'CONTRACT_LEGALITY',
  RUNTIME_COMPLETENESS = 'RUNTIME_COMPLETENESS',
  MATERIALIZATION_READINESS = 'MATERIALIZATION_READINESS',
  L5_ENVELOPE_ADAPTATION = 'L5_ENVELOPE_ADAPTATION',
  L5_PERSISTENCE_COORDINATION = 'L5_PERSISTENCE_COORDINATION',
  EVIDENCE_PERSISTENCE = 'EVIDENCE_PERSISTENCE',
  TRANSITION_EMISSION = 'TRANSITION_EMISSION',
}

export const ALL_L7_MATERIALIZATION_STAGES: readonly L7MaterializationStage[] =
  Object.values(L7MaterializationStage);

export interface L7ValidationFailureRecord {
  readonly failure_id: string;
  readonly subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly stage: L7MaterializationStage;
  readonly failure_code: string;
  readonly missing_surfaces: readonly L7DurableSurfaceId[];
  readonly materialization_ready: boolean;
  readonly materialization_mode: L7MaterializationMode;
  readonly retry_eligible: boolean;
  readonly compute_run_id: string;
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly detail: string;
}
