/**
 * L10.8 — Durable Surface Registry
 *
 * §10.8.3 — Runtime registry for every durable surface Layer 10
 * publishes through L5. Every write validator (§10.8.2 – §10.8.6)
 * resolves its descriptor through this registry; no code is permitted
 * to inline the class, authority store, or legal mode set of a
 * surface.
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';
import {
  L10DurableSurface,
  L10DurableSurfaceId,
  L10MaterializationMode,
  L10MutationDiscipline,
  L10PersistenceClass,
} from '../contracts/l10-persistence-surface';

/**
 * §10.8.3.1 / §10.8.3.2 / §10.8.4 / §10.8.6 — Canonical default
 * descriptor set. Every surface still satisfies §10.8.3.5.
 */
export const L10_DEFAULT_DURABLE_SURFACES: readonly L10DurableSurface[] = [
  // ── Definition / run surfaces ──────────────────────────────────
  {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_SUBJECT_DEFINITIONS,
    persistence_class: L10PersistenceClass.DEFINITION_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L10MutationDiscipline.REGISTER_ONLY,
    materialization_modes_allowed: [L10MaterializationMode.LIVE_CURRENT],
    required_identity_fields: ['hypothesis_subject_id'],
    required_lineage_fields: ['policy_version'],
    required_replay_fields: [],
    required_evidence_fields: [],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description:
      'Registered L10 hypothesis subject definitions (family, scope, policy).',
  },
  {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_RUNS,
    persistence_class: L10PersistenceClass.RUN_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L10MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_CURRENT,
      L10MaterializationMode.REPLAY_HISTORICAL,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['compute_run_id'],
    required_lineage_fields: ['policy_version'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description:
      'Runtime run records (one row per hypothesis compute run).',
  },

  // ── Current-authority surfaces (Postgres only — INV-10.8-B) ────
  currentAuthority(
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_REGISTRY,
    'Authoritative current hypothesis assessment state per subject/scope.',
  ),
  currentAuthority(
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_RANKING_REGISTRY,
    'Authoritative current ranked hypothesis set per subject/scope.',
  ),
  currentAuthority(
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_SPREAD_REGISTRY,
    'Authoritative current spread profile per subject/scope.',
  ),
  currentAuthority(
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_CONFIDENCE_REGISTRY,
    'Authoritative current confidence profile per subject/scope.',
  ),
  currentAuthority(
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_RESTRICTION_REGISTRY,
    'Authoritative current restriction profile per subject/scope.',
  ),
  currentAuthority(
    L10DurableSurfaceId.CURRENT_HYPOTHESIS_READINESS_REGISTRY,
    'Authoritative current readiness class per subject/scope.',
  ),
  currentAuthority(
    L10DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY,
    'Authoritative current shift-condition set per subject/scope.',
  ),
  currentAuthority(
    L10DurableSurfaceId.CURRENT_CONFIRMATION_REGISTRY,
    'Authoritative current confirmation posture per subject/scope.',
  ),
  currentAuthority(
    L10DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY,
    'Authoritative current invalidation posture per subject/scope.',
  ),

  // ── Transition / failure surfaces ──────────────────────────────
  {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_TRANSITIONS,
    persistence_class: L10PersistenceClass.TRANSITION_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L10MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_CURRENT,
      L10MaterializationMode.REPLAY_HISTORICAL,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'hypothesis_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description:
      'Append-only L10 hypothesis competition transitions per subject/scope.',
  },
  {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_FAILURES,
    persistence_class: L10PersistenceClass.FAILURE_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L10MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_CURRENT,
      L10MaterializationMode.REPLAY_HISTORICAL,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'hypothesis_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: [],
    required_evidence_fields: [],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description:
      'Append-only L10 hypothesis failure records per subject/scope.',
  },

  // ── Historical fact families (ClickHouse) ──────────────────────
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_FACT_V1,
    'ClickHouse historical hypothesis assessment facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_RANKING_V1,
    'ClickHouse historical ranking facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_CONFIDENCE_V1,
    'ClickHouse historical confidence facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_SPREAD_V1,
    'ClickHouse historical spread facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_RESTRICTION_V1,
    'ClickHouse historical restriction facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_READINESS_V1,
    'ClickHouse historical readiness facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_SHIFT_CONDITION_V1,
    'ClickHouse historical shift-condition facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_CONFIRMATION_V1,
    'ClickHouse historical confirmation facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_INVALIDATION_V1,
    'ClickHouse historical invalidation facts.',
  ),
  ...historicalFact(
    L10DurableSurfaceId.TS_HYPOTHESIS_COMPETITION_TRANSITION_V1,
    'ClickHouse historical competition transition facts.',
  ),

  // ── Evidence / lineage (object store + index) ──────────────────
  {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_EVIDENCE_STORE,
    persistence_class: L10PersistenceClass.EVIDENCE_SURFACE,
    authority_store: L5AuthorityStore.OBJECT_STORAGE,
    mutation_discipline: L10MutationDiscipline.IMMUTABLE,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_CURRENT,
      L10MaterializationMode.LIVE_HISTORICAL_APPEND,
      L10MaterializationMode.REPLAY_HISTORICAL,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['evidence_pointer_id', 'hypothesis_subject_id'],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [
      'archive_uri',
      'checksum',
      'manifest_ref',
      'deterministic_path',
    ],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description:
      'Immutable object-store hypothesis evidence with deterministic paths.',
  },
  {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_EVIDENCE_INDEX,
    persistence_class: L10PersistenceClass.EVIDENCE_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L10MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_CURRENT,
      L10MaterializationMode.LIVE_HISTORICAL_APPEND,
      L10MaterializationMode.REPLAY_HISTORICAL,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['evidence_pointer_id', 'hypothesis_subject_id'],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [
      'archive_uri',
      'checksum',
      'manifest_ref',
      'deterministic_path',
    ],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description:
      'Index of hypothesis evidence pointers (rows pointing into the object store).',
  },
  {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_LINEAGE_STORE,
    persistence_class: L10PersistenceClass.LINEAGE_SURFACE,
    authority_store: L5AuthorityStore.OBJECT_STORAGE,
    mutation_discipline: L10MutationDiscipline.IMMUTABLE,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_CURRENT,
      L10MaterializationMode.LIVE_HISTORICAL_APPEND,
      L10MaterializationMode.REPLAY_HISTORICAL,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['lineage_id', 'compute_run_id'],
    required_lineage_fields: ['policy_version'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['archive_uri', 'checksum'],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description: 'Immutable hypothesis run-lineage bundles.',
  },
  {
    durable_surface_id: L10DurableSurfaceId.HYPOTHESIS_LINEAGE_REGISTRY,
    persistence_class: L10PersistenceClass.LINEAGE_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L10MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_CURRENT,
      L10MaterializationMode.LIVE_HISTORICAL_APPEND,
      L10MaterializationMode.REPLAY_HISTORICAL,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['lineage_id', 'compute_run_id'],
    required_lineage_fields: ['policy_version'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description: 'Index of hypothesis lineage bundles.',
  },
];

function currentAuthority(
  id: L10DurableSurfaceId,
  description: string,
): L10DurableSurface {
  return {
    durable_surface_id: id,
    persistence_class: L10PersistenceClass.CURRENT_AUTHORITY_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L10MutationDiscipline.SUPERSEDE_WITH_LINKAGE,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_CURRENT,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'hypothesis_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['evidence_refs'],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description,
  };
}

function historicalFact(
  id: L10DurableSurfaceId,
  description: string,
): readonly L10DurableSurface[] {
  return [{
    durable_surface_id: id,
    persistence_class: L10PersistenceClass.HISTORICAL_FACT_SURFACE,
    authority_store: L5AuthorityStore.CLICKHOUSE,
    mutation_discipline: L10MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L10MaterializationMode.LIVE_HISTORICAL_APPEND,
      L10MaterializationMode.REPLAY_HISTORICAL,
      L10MaterializationMode.REPAIR_REBUILD,
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'fact_id',
      'hypothesis_subject_id',
      'scope_type',
      'scope_id',
      'as_of',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['evidence_refs'],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description,
  }];
}

/**
 * §10.8.3 — Registry class. Same shape as other L10 registries.
 */
export class L10DurableSurfaceRegistry {
  private readonly byId: Map<L10DurableSurfaceId, L10DurableSurface>;

  constructor(surfaces: readonly L10DurableSurface[]) {
    this.byId = new Map();
    for (const s of surfaces) {
      if (this.byId.has(s.durable_surface_id)) {
        throw new Error(
          `L10.8: duplicate durable surface ${s.durable_surface_id}`,
        );
      }
      this.byId.set(s.durable_surface_id, s);
    }
  }

  static default(): L10DurableSurfaceRegistry {
    return new L10DurableSurfaceRegistry(L10_DEFAULT_DURABLE_SURFACES);
  }

  list(): readonly L10DurableSurface[] {
    return Array.from(this.byId.values());
  }

  get(id: L10DurableSurfaceId): L10DurableSurface | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id as L10DurableSurfaceId);
  }

  /** §10.8.3.4 — every surface of a given class. */
  byClass(cls: L10PersistenceClass): readonly L10DurableSurface[] {
    return this.list().filter((s) => s.persistence_class === cls);
  }

  /** §10.8.3.5 — does `surface` accept `mode`? */
  surfaceAcceptsMode(
    id: L10DurableSurfaceId,
    mode: L10MaterializationMode,
  ): boolean {
    const s = this.byId.get(id);
    if (!s) return false;
    return s.materialization_modes_allowed.includes(mode);
  }
}
