/**
 * L9.8 — Durable Surface Registry
 *
 * §9.8.3 — Runtime registry for every durable surface Layer 9
 * publishes through L5. Every write validator (§9.8.2 – §9.8.6)
 * resolves its surface descriptor through this registry; no code is
 * permitted to inline the class, authority store, or legal mode set
 * of a surface.
 */

import { L5AuthorityStore } from '../../l5/authority/authority-store';
import {
  L9DurableSurface,
  L9DurableSurfaceId,
  L9MaterializationMode,
  L9MutationDiscipline,
  L9PersistenceClass,
} from '../contracts/l9-persistence-surface';

/**
 * §9.8.3.1 / §9.8.3.2 — Canonical default descriptor set. Loaded by
 * `L9DurableSurfaceRegistry.default()`. Production deployments can
 * swap this set for a config-driven loader, provided every surface
 * still satisfies §9.8.3.5.
 */
export const L9_DEFAULT_DURABLE_SURFACES: readonly L9DurableSurface[] = [
  // ── Definition / run surfaces ──────────────────────────────────
  {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_SUBJECT_DEFINITIONS,
    persistence_class: L9PersistenceClass.DEFINITION_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.REGISTER_ONLY,
    materialization_modes_allowed: [L9MaterializationMode.LIVE_CURRENT],
    required_identity_fields: ['sequence_subject_id'],
    required_lineage_fields: ['policy_version'],
    required_replay_fields: [],
    required_evidence_fields: [],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description:
      'Registered L9 subject definitions (family, scope, policy).',
  },
  {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_RUNS,
    persistence_class: L9PersistenceClass.RUN_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPLAY_HISTORICAL,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['compute_run_id'],
    required_lineage_fields: ['policy_version'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description: 'Runtime run records (one row per sequence compute run).',
  },

  // ── Current-authority surfaces (Postgres only — INV-9.8-B) ─────
  {
    durable_surface_id: L9DurableSurfaceId.CURRENT_SEQUENCE_REGISTRY,
    persistence_class: L9PersistenceClass.CURRENT_AUTHORITY_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.SUPERSEDE_WITH_LINKAGE,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'sequence_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['evidence_refs'],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description: 'Authoritative current sequence state per subject/scope.',
  },
  {
    durable_surface_id: L9DurableSurfaceId.CURRENT_PHASE_REGISTRY,
    persistence_class: L9PersistenceClass.CURRENT_AUTHORITY_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.SUPERSEDE_WITH_LINKAGE,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'sequence_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['evidence_refs'],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description: 'Authoritative current phase posture per subject/scope.',
  },
  {
    durable_surface_id: L9DurableSurfaceId.CURRENT_DECAY_REGISTRY,
    persistence_class: L9PersistenceClass.CURRENT_AUTHORITY_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.SUPERSEDE_WITH_LINKAGE,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'sequence_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['evidence_refs'],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description: 'Authoritative current decay posture per subject/scope.',
  },
  {
    durable_surface_id:
      L9DurableSurfaceId.CURRENT_SEQUENCE_CONFIDENCE_REGISTRY,
    persistence_class: L9PersistenceClass.CURRENT_AUTHORITY_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.SUPERSEDE_WITH_LINKAGE,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'sequence_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['evidence_refs'],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description:
      'Authoritative current sequence confidence profile per scope.',
  },
  {
    durable_surface_id:
      L9DurableSurfaceId.CURRENT_SEQUENCE_RESTRICTION_REGISTRY,
    persistence_class: L9PersistenceClass.CURRENT_AUTHORITY_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.SUPERSEDE_WITH_LINKAGE,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'sequence_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['evidence_refs'],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description:
      'Authoritative current restriction profile per subject/scope.',
  },
  {
    durable_surface_id: L9DurableSurfaceId.CURRENT_CAUSAL_RESTRAINT_REGISTRY,
    persistence_class: L9PersistenceClass.CURRENT_AUTHORITY_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.SUPERSEDE_WITH_LINKAGE,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'sequence_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['evidence_refs'],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description:
      'Authoritative current causal-restraint posture per subject/scope.',
  },

  // ── Transition / failure surfaces ──────────────────────────────
  {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_TRANSITIONS,
    persistence_class: L9PersistenceClass.TRANSITION_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPLAY_HISTORICAL,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'sequence_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description: 'Append-only L9 sequence transitions per subject/scope.',
  },
  {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_FAILURES,
    persistence_class: L9PersistenceClass.FAILURE_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.REPLAY_HISTORICAL,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'sequence_subject_id',
      'scope_type',
      'scope_id',
    ],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: [],
    required_evidence_fields: [],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description: 'Append-only L9 failure records per subject/scope.',
  },

  // ── Historical fact families (ClickHouse) ──────────────────────
  ...historicalFact(L9DurableSurfaceId.TS_SEQUENCE_FACT_V1,
    'ClickHouse historical sequence facts.'),
  ...historicalFact(L9DurableSurfaceId.TS_PHASE_PROGRESSION_V1,
    'ClickHouse historical phase progression facts.'),
  ...historicalFact(L9DurableSurfaceId.TS_SEQUENCE_CONFIDENCE_V1,
    'ClickHouse historical sequence confidence facts.'),
  ...historicalFact(L9DurableSurfaceId.TS_SEQUENCE_DECAY_V1,
    'ClickHouse historical sequence decay facts.'),
  ...historicalFact(L9DurableSurfaceId.TS_SEQUENCE_RESTRICTION_V1,
    'ClickHouse historical sequence restriction facts.'),
  ...historicalFact(L9DurableSurfaceId.TS_SEQUENCE_CAUSAL_RESTRAINT_V1,
    'ClickHouse historical causal-restraint facts.'),
  ...historicalFact(L9DurableSurfaceId.TS_SEQUENCE_CHANGE_POINT_V1,
    'ClickHouse historical change-point facts.'),
  ...historicalFact(L9DurableSurfaceId.TS_LEAD_LAG_FACT_V1,
    'ClickHouse historical lead-lag facts.'),
  ...historicalFact(L9DurableSurfaceId.TS_POST_EVENT_WINDOW_V1,
    'ClickHouse historical post-event window facts.'),

  // ── Evidence / lineage (object store, immutable) ───────────────
  {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_EVIDENCE_STORE,
    persistence_class: L9PersistenceClass.EVIDENCE_SURFACE,
    authority_store: L5AuthorityStore.OBJECT_STORAGE,
    mutation_discipline: L9MutationDiscipline.IMMUTABLE,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.LIVE_HISTORICAL_APPEND,
      L9MaterializationMode.REPLAY_HISTORICAL,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['evidence_id', 'sequence_subject_id'],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [
      'archive_uri',
      'checksum_sha256',
      'manifest_id',
      'deterministic_path',
    ],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description:
      'Immutable object-store evidence with deterministic path rules.',
  },
  {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_EVIDENCE_INDEX,
    persistence_class: L9PersistenceClass.EVIDENCE_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.LIVE_HISTORICAL_APPEND,
      L9MaterializationMode.REPLAY_HISTORICAL,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['evidence_id', 'sequence_subject_id'],
    required_lineage_fields: ['policy_version', 'compute_run_id'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [
      'archive_uri',
      'checksum_sha256',
      'manifest_id',
      'deterministic_path',
    ],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description:
      'Index into the object-store evidence surface (pointer rows).',
  },
  {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_LINEAGE_STORE,
    persistence_class: L9PersistenceClass.LINEAGE_SURFACE,
    authority_store: L5AuthorityStore.OBJECT_STORAGE,
    mutation_discipline: L9MutationDiscipline.IMMUTABLE,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.LIVE_HISTORICAL_APPEND,
      L9MaterializationMode.REPLAY_HISTORICAL,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['lineage_id', 'compute_run_id'],
    required_lineage_fields: ['policy_version'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: ['archive_uri', 'checksum_sha256'],
    redis_cache_permitted: false,
    routes_through_l5: true,
    description: 'Immutable run-lineage bundles.',
  },
  {
    durable_surface_id: L9DurableSurfaceId.SEQUENCE_LINEAGE_REGISTRY,
    persistence_class: L9PersistenceClass.LINEAGE_SURFACE,
    authority_store: L5AuthorityStore.POSTGRES,
    mutation_discipline: L9MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_CURRENT,
      L9MaterializationMode.LIVE_HISTORICAL_APPEND,
      L9MaterializationMode.REPLAY_HISTORICAL,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: ['lineage_id', 'compute_run_id'],
    required_lineage_fields: ['policy_version'],
    required_replay_fields: ['replay_hash'],
    required_evidence_fields: [],
    redis_cache_permitted: true,
    routes_through_l5: true,
    description: 'Index into lineage bundles.',
  },
];

function historicalFact(
  id: L9DurableSurfaceId,
  description: string,
): readonly L9DurableSurface[] {
  return [{
    durable_surface_id: id,
    persistence_class: L9PersistenceClass.HISTORICAL_FACT_SURFACE,
    authority_store: L5AuthorityStore.CLICKHOUSE,
    mutation_discipline: L9MutationDiscipline.APPEND_ONLY,
    materialization_modes_allowed: [
      L9MaterializationMode.LIVE_HISTORICAL_APPEND,
      L9MaterializationMode.REPLAY_HISTORICAL,
      L9MaterializationMode.REPAIR_REBUILD,
      L9MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    required_identity_fields: [
      'fact_id',
      'sequence_subject_id',
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
 * §9.8.3 — Registry class. Keeps the same shape as other L9
 * registries (family-definition, template, etc.).
 */
export class L9DurableSurfaceRegistry {
  private readonly byId: Map<L9DurableSurfaceId, L9DurableSurface>;

  constructor(surfaces: readonly L9DurableSurface[]) {
    this.byId = new Map();
    for (const s of surfaces) {
      if (this.byId.has(s.durable_surface_id)) {
        throw new Error(
          `L9.8: duplicate durable surface ${s.durable_surface_id}`,
        );
      }
      this.byId.set(s.durable_surface_id, s);
    }
  }

  static default(): L9DurableSurfaceRegistry {
    return new L9DurableSurfaceRegistry(L9_DEFAULT_DURABLE_SURFACES);
  }

  list(): readonly L9DurableSurface[] {
    return Array.from(this.byId.values());
  }

  get(id: L9DurableSurfaceId): L9DurableSurface | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id as L9DurableSurfaceId);
  }

  /** §9.8.3.4 — every surface of a given class. */
  byClass(cls: L9PersistenceClass): readonly L9DurableSurface[] {
    return this.list().filter((s) => s.persistence_class === cls);
  }

  /** §9.8.3.5 — does `surface` accept `mode`? */
  surfaceAcceptsMode(
    id: L9DurableSurfaceId,
    mode: L9MaterializationMode,
  ): boolean {
    const s = this.byId.get(id);
    if (!s) return false;
    return s.materialization_modes_allowed.includes(mode);
  }
}
