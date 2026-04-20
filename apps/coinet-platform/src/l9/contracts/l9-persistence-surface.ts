/**
 * L9.8 — Persistence Surface Doctrine
 *
 * §9.8.1 / §9.8.3 — Governed shape of every durable surface Layer 9
 * publishes *through L5*. L9 never owns a store; it owns a typed
 * description of what a legal durable surface looks like so runtime
 * writes can be routed, validated, and replayed without any direct-
 * store bypass (§9.8.2.1 / INV-9.8-A).
 *
 * Distinct from `L9SequenceMaterializationPolicy` (L9.3, per-subject
 * runtime policy): L9.8 governs *where truth lives* and *who may
 * write it in what mode*, not when a subject is recomputed.
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';

/**
 * §9.8.3.1 / §9.8.3.2 — Canonical durable surface ids. Kept as a
 * typed enum so registry and validator code never string-matches.
 *
 * The split below mirrors the spec's canonical + production-ready
 * surface list (§9.8.3.1 + §9.8.3.2). The last five are L9.7-aware
 * surfaces that carry reliance-governance state into storage.
 */
export enum L9DurableSurfaceId {
  // §9.8.3.1 — canonical required
  SEQUENCE_SUBJECT_DEFINITIONS = 'l9.sequence_subject_definitions',
  SEQUENCE_RUNS = 'l9.sequence_runs',
  CURRENT_SEQUENCE_REGISTRY = 'l9.current_sequence_registry',
  CURRENT_PHASE_REGISTRY = 'l9.current_phase_registry',
  CURRENT_DECAY_REGISTRY = 'l9.current_decay_registry',
  SEQUENCE_TRANSITIONS = 'l9.sequence_transitions',
  SEQUENCE_FAILURES = 'l9.sequence_failures',

  // §9.8.3.2 — production-ready extensions
  CURRENT_SEQUENCE_CONFIDENCE_REGISTRY =
    'l9.current_sequence_confidence_registry',
  CURRENT_SEQUENCE_RESTRICTION_REGISTRY =
    'l9.current_sequence_restriction_registry',
  CURRENT_CAUSAL_RESTRAINT_REGISTRY =
    'l9.current_causal_restraint_registry',
  SEQUENCE_EVIDENCE_INDEX = 'l9.sequence_evidence_index',
  SEQUENCE_LINEAGE_REGISTRY = 'l9.sequence_lineage_registry',

  // §9.8.4.1 / §9.8.4.2 — historical fact families (ClickHouse)
  TS_SEQUENCE_FACT_V1 = 'l9.ts_sequence_fact_v1',
  TS_PHASE_PROGRESSION_V1 = 'l9.ts_phase_progression_v1',
  TS_SEQUENCE_CONFIDENCE_V1 = 'l9.ts_sequence_confidence_v1',
  TS_SEQUENCE_DECAY_V1 = 'l9.ts_sequence_decay_v1',
  TS_SEQUENCE_RESTRICTION_V1 = 'l9.ts_sequence_restriction_v1',
  TS_SEQUENCE_CAUSAL_RESTRAINT_V1 = 'l9.ts_sequence_causal_restraint_v1',
  TS_SEQUENCE_CHANGE_POINT_V1 = 'l9.ts_sequence_change_point_v1',
  TS_LEAD_LAG_FACT_V1 = 'l9.ts_lead_lag_fact_v1',
  TS_POST_EVENT_WINDOW_V1 = 'l9.ts_post_event_window_v1',

  // §9.8.6 — evidence / lineage object-store surfaces
  SEQUENCE_EVIDENCE_STORE = 'l9.sequence_evidence_store',
  SEQUENCE_LINEAGE_STORE = 'l9.sequence_lineage_store',
}

export const ALL_L9_DURABLE_SURFACE_IDS: readonly L9DurableSurfaceId[] =
  Object.values(L9DurableSurfaceId);

/**
 * §9.8.3.4 — Persistence class. Declares the *role* a surface plays
 * in serving sequence truth. A single surface has exactly one class.
 */
export enum L9PersistenceClass {
  DEFINITION_SURFACE = 'DEFINITION_SURFACE',
  RUN_SURFACE = 'RUN_SURFACE',
  CURRENT_AUTHORITY_SURFACE = 'CURRENT_AUTHORITY_SURFACE',
  HISTORICAL_FACT_SURFACE = 'HISTORICAL_FACT_SURFACE',
  TRANSITION_SURFACE = 'TRANSITION_SURFACE',
  FAILURE_SURFACE = 'FAILURE_SURFACE',
  EVIDENCE_SURFACE = 'EVIDENCE_SURFACE',
  LINEAGE_SURFACE = 'LINEAGE_SURFACE',
}

export const ALL_L9_PERSISTENCE_CLASSES: readonly L9PersistenceClass[] =
  Object.values(L9PersistenceClass);

/**
 * §9.8.2.5 / §9.8.3.4 — Authority store for a durable surface. L9.8
 * re-exports the L5 store enum so L9 code never crosses the L5
 * boundary for literal string values.
 */
export { L5AuthorityStore as L9AuthorityStore };

/**
 * §9.8.3.3 — Mutation discipline governing how a surface may be
 * mutated. `SUPERSEDE_WITH_LINKAGE` is the only legal way to replace
 * a current-authority row; `APPEND_ONLY` for historical facts;
 * `IMMUTABLE` for evidence/lineage stores.
 */
export enum L9MutationDiscipline {
  APPEND_ONLY = 'APPEND_ONLY',
  SUPERSEDE_WITH_LINKAGE = 'SUPERSEDE_WITH_LINKAGE',
  IMMUTABLE = 'IMMUTABLE',
  REGISTER_ONLY = 'REGISTER_ONLY',
}

export const ALL_L9_MUTATION_DISCIPLINES: readonly L9MutationDiscipline[] =
  Object.values(L9MutationDiscipline);

/**
 * §9.8.10.1 — Materialization modes. A single write is *always*
 * tagged with the mode under which it was produced; validators
 * reject illegal (mode × surface) combinations.
 */
export enum L9MaterializationMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL_APPEND = 'LIVE_HISTORICAL_APPEND',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_REBUILD = 'REPAIR_REBUILD',
  LATE_DATA_REMATERIALIZATION = 'LATE_DATA_REMATERIALIZATION',
}

export const ALL_L9_MATERIALIZATION_MODES: readonly L9MaterializationMode[] =
  Object.values(L9MaterializationMode);

/**
 * §9.8.3.3 / §9.8.4.5 / §9.8.6.3 — Declarative descriptor for one
 * durable surface. The registry loads these descriptors; every write
 * validator consults them instead of reinventing rules.
 */
export interface L9DurableSurface {
  readonly durable_surface_id: L9DurableSurfaceId;
  readonly persistence_class: L9PersistenceClass;
  readonly authority_store: L5AuthorityStore;
  readonly mutation_discipline: L9MutationDiscipline;
  readonly materialization_modes_allowed: readonly L9MaterializationMode[];
  readonly required_identity_fields: readonly string[];
  readonly required_lineage_fields: readonly string[];
  readonly required_replay_fields: readonly string[];
  readonly required_evidence_fields: readonly string[];
  /** §9.8.5.5 — Redis acceleration may front this surface. */
  readonly redis_cache_permitted: boolean;
  /**
   * §9.8.2.1 / INV-9.8-A — every durable surface must route through
   * L5 envelope adaptation (true by doctrine). The flag exists to
   * make the invariant scan trivial.
   */
  readonly routes_through_l5: true;
  readonly description: string;
}

/**
 * §9.8.10.3 — Sequence serving class. Distinct from persistence
 * class: serving class describes *what a persisted row represents*
 * to later layers, not *where it lives*.
 */
export enum L9SequenceServingClass {
  CURRENT_SEQUENCE_STATE = 'CURRENT_SEQUENCE_STATE',
  CURRENT_PHASE_STATE = 'CURRENT_PHASE_STATE',
  CURRENT_DECAY_STATE = 'CURRENT_DECAY_STATE',
  CURRENT_RELIANCE_STATE = 'CURRENT_RELIANCE_STATE',
  HISTORICAL_SEQUENCE_FACT = 'HISTORICAL_SEQUENCE_FACT',
  TRANSITION_FACT = 'TRANSITION_FACT',
  FAILURE_FACT = 'FAILURE_FACT',
  EVIDENCE_POINTER = 'EVIDENCE_POINTER',
  LINEAGE_POINTER = 'LINEAGE_POINTER',
}

export const ALL_L9_SEQUENCE_SERVING_CLASSES:
  readonly L9SequenceServingClass[] =
    Object.values(L9SequenceServingClass);

/**
 * §9.8.2.5 — Persistence envelope. Carries an already-materialized
 * `L9SequenceOutputContract`-shaped payload together with the typed
 * metadata L9.8 validators need to enforce routing law. The `payload`
 * is kept opaque so this contract is reusable across surfaces and
 * stays decoupled from the L9.4 output shape.
 */
export interface L9PersistenceEnvelope {
  readonly envelope_id: string;
  readonly durable_surface_id: L9DurableSurfaceId;
  readonly serving_class: L9SequenceServingClass;
  readonly sequence_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly materialization_mode: L9MaterializationMode;
  readonly compute_run_id: string;
  /** §9.8.5.4 — supersession link for CURRENT_AUTHORITY_SURFACE writes. */
  readonly supersedes_envelope_id: string | null;
  readonly supersession_reason: string | null;
  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];
  readonly replay_hash: string | null;
  readonly policy_version: string;
  readonly routes_through_l5: true;
  /** §9.8.2.3 — opaque typed projection routed onward through L5. */
  readonly payload: unknown;
}

/**
 * §9.8.3.4 — Helper: is a surface a current-authority surface? Used
 * by the Postgres-only invariant (INV-9.8-B).
 */
export function l9IsCurrentAuthoritySurface(
  surface: L9DurableSurface,
): boolean {
  return surface.persistence_class ===
    L9PersistenceClass.CURRENT_AUTHORITY_SURFACE;
}

/**
 * §9.8.4.3 — Helper: is a surface append-only historical?
 */
export function l9IsHistoricalFactSurface(
  surface: L9DurableSurface,
): boolean {
  return surface.persistence_class ===
    L9PersistenceClass.HISTORICAL_FACT_SURFACE;
}

/**
 * §9.8.6 — Helper: is a surface an evidence or lineage object store?
 */
export function l9IsEvidenceOrLineageSurface(
  surface: L9DurableSurface,
): boolean {
  return (
    surface.persistence_class === L9PersistenceClass.EVIDENCE_SURFACE ||
    surface.persistence_class === L9PersistenceClass.LINEAGE_SURFACE
  );
}
