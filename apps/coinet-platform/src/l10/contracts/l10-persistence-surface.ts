/**
 * L10.8 — Persistence Surface Doctrine
 *
 * §10.8.1 / §10.8.3 — Governed shape of every durable surface Layer 10
 * publishes *through L5*. L10 never owns a store; it owns a typed
 * description of what a legal durable surface looks like so runtime
 * writes can be routed, validated, and replayed without any direct-
 * store bypass (§10.8.2.1 / INV-10.8-A).
 *
 * Distinct from `L10HypothesisMaterializationPolicy` (L10.3, per-subject
 * runtime policy): L10.8 governs *where hypothesis truth lives* and
 * *who may write it in what mode*, not *when* a subject is recomputed.
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';

/**
 * §10.8.3.1 / §10.8.3.2 — Canonical durable surface ids. Typed enum so
 * registry and validator code never string-matches. The split below
 * mirrors the spec's canonical (§10.8.3.1) plus production-ready
 * extensions (§10.8.3.2) plus historical families (§10.8.4) plus
 * evidence/lineage object-store surfaces (§10.8.6).
 */
export enum L10DurableSurfaceId {
  // §10.8.3.1 — canonical required
  HYPOTHESIS_SUBJECT_DEFINITIONS = 'l10.hypothesis_subject_definitions',
  HYPOTHESIS_RUNS = 'l10.hypothesis_runs',
  CURRENT_HYPOTHESIS_REGISTRY = 'l10.current_hypothesis_registry',
  CURRENT_HYPOTHESIS_RANKING_REGISTRY =
    'l10.current_hypothesis_ranking_registry',
  CURRENT_HYPOTHESIS_SPREAD_REGISTRY =
    'l10.current_hypothesis_spread_registry',
  HYPOTHESIS_TRANSITIONS = 'l10.hypothesis_transitions',
  HYPOTHESIS_FAILURES = 'l10.hypothesis_failures',

  // §10.8.3.2 — production-ready extensions
  CURRENT_HYPOTHESIS_CONFIDENCE_REGISTRY =
    'l10.current_hypothesis_confidence_registry',
  CURRENT_HYPOTHESIS_RESTRICTION_REGISTRY =
    'l10.current_hypothesis_restriction_registry',
  CURRENT_HYPOTHESIS_READINESS_REGISTRY =
    'l10.current_hypothesis_readiness_registry',
  CURRENT_SHIFT_CONDITION_REGISTRY = 'l10.current_shift_condition_registry',
  CURRENT_CONFIRMATION_REGISTRY = 'l10.current_confirmation_registry',
  CURRENT_INVALIDATION_REGISTRY = 'l10.current_invalidation_registry',
  HYPOTHESIS_EVIDENCE_INDEX = 'l10.hypothesis_evidence_index',
  HYPOTHESIS_LINEAGE_REGISTRY = 'l10.hypothesis_lineage_registry',

  // §10.8.4.1 / §10.8.4.2 — historical fact families (ClickHouse)
  TS_HYPOTHESIS_FACT_V1 = 'l10.ts_hypothesis_fact_v1',
  TS_HYPOTHESIS_RANKING_V1 = 'l10.ts_hypothesis_ranking_v1',
  TS_HYPOTHESIS_CONFIDENCE_V1 = 'l10.ts_hypothesis_confidence_v1',
  TS_HYPOTHESIS_SPREAD_V1 = 'l10.ts_hypothesis_spread_v1',
  TS_HYPOTHESIS_RESTRICTION_V1 = 'l10.ts_hypothesis_restriction_v1',
  TS_HYPOTHESIS_READINESS_V1 = 'l10.ts_hypothesis_readiness_v1',
  TS_HYPOTHESIS_SHIFT_CONDITION_V1 = 'l10.ts_hypothesis_shift_condition_v1',
  TS_HYPOTHESIS_CONFIRMATION_V1 = 'l10.ts_hypothesis_confirmation_v1',
  TS_HYPOTHESIS_INVALIDATION_V1 = 'l10.ts_hypothesis_invalidation_v1',
  TS_HYPOTHESIS_COMPETITION_TRANSITION_V1 =
    'l10.ts_hypothesis_competition_transition_v1',

  // §10.8.6 — evidence / lineage object-store surfaces
  HYPOTHESIS_EVIDENCE_STORE = 'l10.hypothesis_evidence_store',
  HYPOTHESIS_LINEAGE_STORE = 'l10.hypothesis_lineage_store',
}

export const ALL_L10_DURABLE_SURFACE_IDS: readonly L10DurableSurfaceId[] =
  Object.values(L10DurableSurfaceId);

/**
 * §10.8.3.4 — Persistence class. Declares the *role* a surface plays
 * in serving hypothesis truth. A single surface has exactly one class.
 */
export enum L10PersistenceClass {
  DEFINITION_SURFACE = 'DEFINITION_SURFACE',
  RUN_SURFACE = 'RUN_SURFACE',
  CURRENT_AUTHORITY_SURFACE = 'CURRENT_AUTHORITY_SURFACE',
  HISTORICAL_FACT_SURFACE = 'HISTORICAL_FACT_SURFACE',
  TRANSITION_SURFACE = 'TRANSITION_SURFACE',
  FAILURE_SURFACE = 'FAILURE_SURFACE',
  EVIDENCE_SURFACE = 'EVIDENCE_SURFACE',
  LINEAGE_SURFACE = 'LINEAGE_SURFACE',
}

export const ALL_L10_PERSISTENCE_CLASSES: readonly L10PersistenceClass[] =
  Object.values(L10PersistenceClass);

/**
 * §10.8.2.5 / §10.8.3.4 — Authority store for a durable surface. L10.8
 * re-exports the L5 store enum so L10 code never crosses the L5
 * boundary for literal string values.
 */
export { L5AuthorityStore as L10AuthorityStore };

/**
 * §10.8.3.3 — Mutation discipline governing how a surface may be
 * mutated. `SUPERSEDE_WITH_LINKAGE` is the only legal way to replace a
 * current-authority row; `APPEND_ONLY` for historical / transition /
 * failure; `IMMUTABLE` for evidence / lineage object stores;
 * `REGISTER_ONLY` for definition surfaces.
 */
export enum L10MutationDiscipline {
  APPEND_ONLY = 'APPEND_ONLY',
  SUPERSEDE_WITH_LINKAGE = 'SUPERSEDE_WITH_LINKAGE',
  IMMUTABLE = 'IMMUTABLE',
  REGISTER_ONLY = 'REGISTER_ONLY',
}

export const ALL_L10_MUTATION_DISCIPLINES:
  readonly L10MutationDiscipline[] = Object.values(L10MutationDiscipline);

/**
 * §10.8.10.1 — Materialization modes. Every write is *always* tagged
 * with the mode under which it was produced; validators reject illegal
 * (mode × surface) combinations.
 */
export enum L10MaterializationMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL_APPEND = 'LIVE_HISTORICAL_APPEND',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_REBUILD = 'REPAIR_REBUILD',
  LATE_DATA_REMATERIALIZATION = 'LATE_DATA_REMATERIALIZATION',
}

export const ALL_L10_MATERIALIZATION_MODES:
  readonly L10MaterializationMode[] = Object.values(L10MaterializationMode);

/**
 * §10.8.10.3 — Hypothesis serving class. Distinct from persistence
 * class: serving class describes *what a persisted row represents*
 * to later layers, not *where it lives*.
 */
export enum L10HypothesisServingClass {
  CURRENT_HYPOTHESIS_STATE = 'CURRENT_HYPOTHESIS_STATE',
  CURRENT_RANKING_STATE = 'CURRENT_RANKING_STATE',
  CURRENT_SPREAD_STATE = 'CURRENT_SPREAD_STATE',
  CURRENT_RELIANCE_STATE = 'CURRENT_RELIANCE_STATE',
  CURRENT_CONFIRMATION_STATE = 'CURRENT_CONFIRMATION_STATE',
  CURRENT_INVALIDATION_STATE = 'CURRENT_INVALIDATION_STATE',
  CURRENT_SHIFT_STATE = 'CURRENT_SHIFT_STATE',
  HISTORICAL_HYPOTHESIS_FACT = 'HISTORICAL_HYPOTHESIS_FACT',
  TRANSITION_FACT = 'TRANSITION_FACT',
  FAILURE_FACT = 'FAILURE_FACT',
  EVIDENCE_POINTER = 'EVIDENCE_POINTER',
  LINEAGE_POINTER = 'LINEAGE_POINTER',
}

export const ALL_L10_HYPOTHESIS_SERVING_CLASSES:
  readonly L10HypothesisServingClass[] =
    Object.values(L10HypothesisServingClass);

/**
 * §10.8.3.3 / §10.8.4.5 / §10.8.6.3 — Declarative descriptor for one
 * durable surface. The registry loads these descriptors; every write
 * validator consults them instead of reinventing rules.
 */
export interface L10DurableSurface {
  readonly durable_surface_id: L10DurableSurfaceId;
  readonly persistence_class: L10PersistenceClass;
  readonly authority_store: L5AuthorityStore;
  readonly mutation_discipline: L10MutationDiscipline;
  readonly materialization_modes_allowed: readonly L10MaterializationMode[];
  readonly required_identity_fields: readonly string[];
  readonly required_lineage_fields: readonly string[];
  readonly required_replay_fields: readonly string[];
  readonly required_evidence_fields: readonly string[];
  /** §10.8.5.5 — Redis acceleration may front this surface. */
  readonly redis_cache_permitted: boolean;
  /**
   * §10.8.2.1 / INV-10.8-A — every durable surface must route through
   * L5 envelope adaptation (true by doctrine). Flag exists so the
   * invariant scan is trivial.
   */
  readonly routes_through_l5: true;
  readonly description: string;
}

/**
 * §10.8.2.5 — Persistence envelope. Carries an already-materialized
 * hypothesis-tier payload together with the typed metadata L10.8
 * validators need to enforce routing law. The `payload` is kept
 * opaque so this contract is reusable across surfaces and stays
 * decoupled from the L10.3 output shapes.
 */
export interface L10PersistenceEnvelope {
  readonly envelope_id: string;
  readonly durable_surface_id: L10DurableSurfaceId;
  readonly serving_class: L10HypothesisServingClass;
  readonly hypothesis_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly materialization_mode: L10MaterializationMode;
  readonly compute_run_id: string;
  /** §10.8.5.4 — supersession link for CURRENT_AUTHORITY_SURFACE writes. */
  readonly supersedes_envelope_id: string | null;
  readonly supersession_reason: string | null;
  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];
  readonly replay_hash: string | null;
  readonly policy_version: string;
  readonly routes_through_l5: true;
  /** §10.8.2.3 — opaque typed projection routed onward through L5. */
  readonly payload: unknown;
}

/**
 * §10.8.3.4 — Helper: is a surface a current-authority surface? Used
 * by the Postgres-only invariant (INV-10.8-B).
 */
export function l10IsCurrentAuthoritySurface(
  surface: L10DurableSurface,
): boolean {
  return surface.persistence_class ===
    L10PersistenceClass.CURRENT_AUTHORITY_SURFACE;
}

/**
 * §10.8.4.3 — Helper: is a surface append-only historical?
 */
export function l10IsHistoricalFactSurface(
  surface: L10DurableSurface,
): boolean {
  return surface.persistence_class ===
    L10PersistenceClass.HISTORICAL_FACT_SURFACE;
}

/**
 * §10.8.6 — Helper: is a surface an evidence or lineage object store?
 */
export function l10IsEvidenceOrLineageSurface(
  surface: L10DurableSurface,
): boolean {
  return (
    surface.persistence_class === L10PersistenceClass.EVIDENCE_SURFACE ||
    surface.persistence_class === L10PersistenceClass.LINEAGE_SURFACE
  );
}
