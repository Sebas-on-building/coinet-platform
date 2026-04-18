/**
 * L7.7 — Durable Surface Registry
 *
 * §7.7.2.7 — The frozen `DURABLE_SURFACE_REGISTRY` that maps each
 * logical L7 surface to authority store, mutation discipline, identity
 * + lineage requirements, allowed modes, and archive / replay policy.
 *
 * This is the single source of truth for the persistence validators —
 * no other file in Layer 7 is allowed to decide "does X surface go to
 * Postgres or ClickHouse?".
 */

import {
  L7AuthorityStore,
  L7DurableSurfaceDescriptor,
  L7DurableSurfaceId,
  L7MutationDiscipline,
  L7MaterializationMode,
  L7PersistenceClass,
  L7_SURFACE_LEGAL_MODES,
  ALL_L7_DURABLE_SURFACE_IDS,
} from '../contracts/l7-persistence-surface';

// ── Identity / lineage requirement blocks ──────────────────────────────

const CURRENT_IDENTITY_FIELDS: readonly string[] = [
  'current_state_id',
  'validation_subject_id',
  'scope_type',
  'scope_id',
  'effective_as_of',
  'compute_run_id',
];

const CURRENT_LINEAGE_FIELDS: readonly string[] = [
  'policy_version',
  'materialization_mode',
  'replay_hash',
  'lineage_refs.trace_id',
  'lineage_refs.manifest_id',
];

const HISTORICAL_IDENTITY_FIELDS: readonly string[] = [
  'fact_id',
  'validation_subject_id',
  'scope_type',
  'scope_id',
  'as_of',
  'effective_at',
  'compute_run_id',
];

const HISTORICAL_LINEAGE_FIELDS: readonly string[] = [
  'materialization_mode',
  'policy_version',
  'replay_hash',
  'lineage_refs.trace_id',
  'lineage_refs.manifest_id',
];

// ── Per-surface descriptors ────────────────────────────────────────────

function mk(
  id: L7DurableSurfaceId,
  cls: L7PersistenceClass,
  auth: L7AuthorityStore,
  disc: L7MutationDiscipline,
  opts: {
    readonly identity?: readonly string[];
    readonly lineage?: readonly string[];
    readonly requires_replay_hash?: boolean;
    readonly requires_evidence_ref?: boolean;
    readonly requires_archive_pointer?: boolean;
    readonly caches_allowed?: boolean;
    readonly description: string;
  },
): L7DurableSurfaceDescriptor {
  return {
    surface_id: id,
    persistence_class: cls,
    authority_store: auth,
    mutation_discipline: disc,
    allowed_modes: L7_SURFACE_LEGAL_MODES[id],
    required_identity_fields: opts.identity ?? [],
    required_lineage_fields: opts.lineage ?? [],
    requires_replay_hash: opts.requires_replay_hash ?? false,
    requires_evidence_ref: opts.requires_evidence_ref ?? false,
    requires_archive_pointer: opts.requires_archive_pointer ?? false,
    caches_allowed: opts.caches_allowed ?? false,
    description: opts.description,
  };
}

export const L7_DURABLE_SURFACE_REGISTRY: Readonly<
  Record<L7DurableSurfaceId, L7DurableSurfaceDescriptor>
> = {
  [L7DurableSurfaceId.VALIDATION_SUBJECT_DEFINITIONS]: mk(
    L7DurableSurfaceId.VALIDATION_SUBJECT_DEFINITIONS,
    L7PersistenceClass.SUBJECT_DEFINITION,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: ['validation_subject_id', 'claim_family', 'claim_version'],
      lineage: ['policy_version', 'lineage_refs.manifest_id'],
      requires_replay_hash: false,
      caches_allowed: true,
      description: 'Validation subject definitions (canonical, supersedable).',
    },
  ),
  [L7DurableSurfaceId.VALIDATION_RUNS]: mk(
    L7DurableSurfaceId.VALIDATION_RUNS,
    L7PersistenceClass.VALIDATION_RUN,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: ['compute_run_id', 'materialization_mode', 'policy_version'],
      lineage: ['lineage_refs.trace_id', 'lineage_refs.manifest_id'],
      requires_replay_hash: false,
      caches_allowed: false,
      description: 'One row per governed runtime execution; append-only.',
    },
  ),
  [L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY]: mk(
    L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
    L7PersistenceClass.CURRENT_VALIDATION,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: CURRENT_IDENTITY_FIELDS,
      lineage: CURRENT_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: true,
      description: 'Authoritative current validation assessment per (subject, scope).',
    },
  ),
  [L7DurableSurfaceId.CURRENT_CONTRADICTION_REGISTRY]: mk(
    L7DurableSurfaceId.CURRENT_CONTRADICTION_REGISTRY,
    L7PersistenceClass.CURRENT_CONTRADICTION,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: CURRENT_IDENTITY_FIELDS,
      lineage: CURRENT_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: true,
      description: 'Authoritative current contradiction bundle per (subject, scope).',
    },
  ),
  [L7DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY]: mk(
    L7DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY,
    L7PersistenceClass.CURRENT_CONFIDENCE,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: CURRENT_IDENTITY_FIELDS,
      lineage: CURRENT_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: true,
      description: 'Authoritative current confidence decision per (subject, scope).',
    },
  ),
  [L7DurableSurfaceId.CURRENT_RESTRICTION_REGISTRY]: mk(
    L7DurableSurfaceId.CURRENT_RESTRICTION_REGISTRY,
    L7PersistenceClass.CURRENT_RESTRICTION,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: CURRENT_IDENTITY_FIELDS,
      lineage: CURRENT_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: false,
      caches_allowed: true,
      description: 'Authoritative current restriction profile per (subject, scope).',
    },
  ),
  [L7DurableSurfaceId.VALIDATION_TRANSITIONS]: mk(
    L7DurableSurfaceId.VALIDATION_TRANSITIONS,
    L7PersistenceClass.VALIDATION_TRANSITION,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.TRANSITION_APPEND,
    {
      identity: [
        'transition_id',
        'subject_id',
        'scope_type',
        'scope_id',
        'delta_kind',
        'new_state_ref',
      ],
      lineage: ['materialization_mode', 'compute_run_id'],
      requires_replay_hash: false,
      caches_allowed: false,
      description: 'Append-only transition records for every current-state change.',
    },
  ),
  [L7DurableSurfaceId.VALIDATION_FAILURES]: mk(
    L7DurableSurfaceId.VALIDATION_FAILURES,
    L7PersistenceClass.VALIDATION_FAILURE,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.FAILURE_APPEND,
    {
      identity: [
        'failure_id',
        'subject_id',
        'scope_type',
        'scope_id',
        'stage',
        'failure_code',
      ],
      lineage: ['materialization_mode', 'compute_run_id', 'lineage_refs.trace_id'],
      requires_replay_hash: false,
      caches_allowed: false,
      description: 'Append-only failure surface; operational truth for materialization issues.',
    },
  ),
  [L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS]: mk(
    L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS,
    L7PersistenceClass.HISTORICAL_VALIDATION,
    L7AuthorityStore.CLICKHOUSE,
    L7MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: HISTORICAL_IDENTITY_FIELDS,
      lineage: HISTORICAL_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: false,
      description: 'Append-safe historical validation fact rows (ts_validation_fact_v1).',
    },
  ),
  [L7DurableSurfaceId.HISTORICAL_CONTRADICTION_FACTS]: mk(
    L7DurableSurfaceId.HISTORICAL_CONTRADICTION_FACTS,
    L7PersistenceClass.HISTORICAL_CONTRADICTION,
    L7AuthorityStore.CLICKHOUSE,
    L7MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: HISTORICAL_IDENTITY_FIELDS,
      lineage: HISTORICAL_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: false,
      description: 'Append-safe historical contradiction fact rows (ts_contradiction_fact_v1).',
    },
  ),
  [L7DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS]: mk(
    L7DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS,
    L7PersistenceClass.HISTORICAL_CONFIDENCE,
    L7AuthorityStore.CLICKHOUSE,
    L7MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: HISTORICAL_IDENTITY_FIELDS,
      lineage: HISTORICAL_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: false,
      description: 'Append-safe historical confidence fact rows (ts_validation_confidence_v1).',
    },
  ),
  [L7DurableSurfaceId.HISTORICAL_RESTRICTION_FACTS]: mk(
    L7DurableSurfaceId.HISTORICAL_RESTRICTION_FACTS,
    L7PersistenceClass.HISTORICAL_RESTRICTION,
    L7AuthorityStore.CLICKHOUSE,
    L7MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: HISTORICAL_IDENTITY_FIELDS,
      lineage: HISTORICAL_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: false,
      caches_allowed: false,
      description: 'Append-safe historical restriction fact rows (ts_claim_restriction_v1).',
    },
  ),
  [L7DurableSurfaceId.EVIDENCE_POINTERS]: mk(
    L7DurableSurfaceId.EVIDENCE_POINTERS,
    L7PersistenceClass.EVIDENCE_POINTER,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.POINTER_APPEND,
    {
      identity: [
        'evidence_id',
        'evidence_class',
        'subject_ref',
        'archive_uri',
        'checksum',
      ],
      lineage: ['manifest_id', 'compute_run_id', 'lineage_refs.trace_id'],
      requires_replay_hash: false,
      requires_evidence_ref: false,
      requires_archive_pointer: true,
      caches_allowed: false,
      description: 'Append-only evidence pointers linking archive payload to state.',
    },
  ),
  [L7DurableSurfaceId.LINEAGE_POINTERS]: mk(
    L7DurableSurfaceId.LINEAGE_POINTERS,
    L7PersistenceClass.LINEAGE_POINTER,
    L7AuthorityStore.POSTGRES,
    L7MutationDiscipline.POINTER_APPEND,
    {
      identity: [
        'lineage_id',
        'subject_id',
        'state_ref',
        'compute_run_id',
        'manifest_id',
        'trace_id',
      ],
      lineage: [],
      requires_replay_hash: false,
      caches_allowed: false,
      description: 'Append-only lineage pointers linking state rows to compute runs.',
    },
  ),
};

// ── Public accessors ───────────────────────────────────────────────────

export class L7DurableSurfaceRegistry {
  list(): readonly L7DurableSurfaceDescriptor[] {
    return ALL_L7_DURABLE_SURFACE_IDS.map(id => L7_DURABLE_SURFACE_REGISTRY[id]);
  }

  get(id: L7DurableSurfaceId): L7DurableSurfaceDescriptor | null {
    return L7_DURABLE_SURFACE_REGISTRY[id] ?? null;
  }

  isRegistered(id: unknown): boolean {
    return typeof id === 'string' && id in L7_DURABLE_SURFACE_REGISTRY;
  }

  authorityFor(id: L7DurableSurfaceId): L7AuthorityStore {
    return L7_DURABLE_SURFACE_REGISTRY[id].authority_store;
  }

  mutationDisciplineFor(id: L7DurableSurfaceId): L7MutationDiscipline {
    return L7_DURABLE_SURFACE_REGISTRY[id].mutation_discipline;
  }

  allowedModes(id: L7DurableSurfaceId): readonly L7MaterializationMode[] {
    return L7_DURABLE_SURFACE_REGISTRY[id].allowed_modes;
  }

  isModeLegal(id: L7DurableSurfaceId, mode: L7MaterializationMode): boolean {
    return L7_DURABLE_SURFACE_REGISTRY[id].allowed_modes.includes(mode);
  }
}

let _defaultRegistry: L7DurableSurfaceRegistry | null = null;
export function getDefaultDurableSurfaceRegistry(): L7DurableSurfaceRegistry {
  if (!_defaultRegistry) _defaultRegistry = new L7DurableSurfaceRegistry();
  return _defaultRegistry;
}
