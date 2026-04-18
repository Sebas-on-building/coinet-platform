/**
 * L8.8 — Durable Surface Registry
 *
 * §8.8.3.4 — The frozen `L8_DURABLE_SURFACE_REGISTRY` that maps each
 * logical L8 surface to its authority store, mutation discipline,
 * identity + lineage requirements, allowed modes, and archive / replay
 * policy. This is the single source of truth that persistence
 * validators consult.
 */

import {
  L8AuthorityStore,
  L8DurableSurfaceDescriptor,
  L8DurableSurfaceId,
  L8MaterializationMode,
  L8MutationDiscipline,
  L8PersistenceClass,
  L8_SURFACE_LEGAL_MODES,
  ALL_L8_DURABLE_SURFACE_IDS,
} from '../contracts/l8-persistence-surface';

// ── Identity / lineage requirement blocks ───────────────────────────────

const CURRENT_IDENTITY_FIELDS: readonly string[] = [
  'current_state_id',
  'regime_subject_id',
  'scope_type',
  'scope_id',
  'regime_family',
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
  'regime_subject_id',
  'scope_type',
  'scope_id',
  'regime_family',
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

// ── Per-surface descriptors ─────────────────────────────────────────────

function mk(
  id: L8DurableSurfaceId,
  cls: L8PersistenceClass,
  auth: L8AuthorityStore,
  disc: L8MutationDiscipline,
  opts: {
    readonly identity?: readonly string[];
    readonly lineage?: readonly string[];
    readonly requires_replay_hash?: boolean;
    readonly requires_evidence_ref?: boolean;
    readonly requires_archive_pointer?: boolean;
    readonly caches_allowed?: boolean;
    readonly description: string;
  },
): L8DurableSurfaceDescriptor {
  return {
    surface_id: id,
    persistence_class: cls,
    authority_store: auth,
    mutation_discipline: disc,
    allowed_modes: L8_SURFACE_LEGAL_MODES[id],
    required_identity_fields: opts.identity ?? [],
    required_lineage_fields: opts.lineage ?? [],
    requires_replay_hash: opts.requires_replay_hash ?? false,
    requires_evidence_ref: opts.requires_evidence_ref ?? false,
    requires_archive_pointer: opts.requires_archive_pointer ?? false,
    caches_allowed: opts.caches_allowed ?? false,
    description: opts.description,
  };
}

export const L8_DURABLE_SURFACE_REGISTRY: Readonly<
  Record<L8DurableSurfaceId, L8DurableSurfaceDescriptor>
> = {
  [L8DurableSurfaceId.REGIME_SUBJECT_DEFINITIONS]: mk(
    L8DurableSurfaceId.REGIME_SUBJECT_DEFINITIONS,
    L8PersistenceClass.SUBJECT_DEFINITION,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: [
        'regime_subject_id', 'regime_family', 'scope_type', 'scope_id',
      ],
      lineage: ['policy_version', 'lineage_refs.manifest_id'],
      caches_allowed: true,
      description:
        'Regime subject definitions (canonical, supersedable).',
    },
  ),
  [L8DurableSurfaceId.REGIME_RUNS]: mk(
    L8DurableSurfaceId.REGIME_RUNS,
    L8PersistenceClass.REGIME_RUN,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: [
        'compute_run_id', 'materialization_mode', 'policy_version',
      ],
      lineage: ['lineage_refs.trace_id', 'lineage_refs.manifest_id'],
      description:
        'One row per governed regime execution; append-only.',
    },
  ),

  [L8DurableSurfaceId.CURRENT_REGIME_REGISTRY]: mk(
    L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
    L8PersistenceClass.CURRENT_REGIME,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: CURRENT_IDENTITY_FIELDS,
      lineage: CURRENT_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: true,
      description:
        'Authoritative current regime state per (family, scope).',
    },
  ),
  [L8DurableSurfaceId.CURRENT_TRANSITION_REGISTRY]: mk(
    L8DurableSurfaceId.CURRENT_TRANSITION_REGISTRY,
    L8PersistenceClass.CURRENT_TRANSITION,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: CURRENT_IDENTITY_FIELDS,
      lineage: CURRENT_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: true,
      description:
        'Authoritative current transition profile per (family, scope).',
    },
  ),
  [L8DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY]: mk(
    L8DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY,
    L8PersistenceClass.CURRENT_CONFIDENCE,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: CURRENT_IDENTITY_FIELDS,
      lineage: CURRENT_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      caches_allowed: true,
      description:
        'Authoritative current confidence decision per (family, scope).',
    },
  ),
  [L8DurableSurfaceId.CURRENT_MULTIPLIER_REGISTRY]: mk(
    L8DurableSurfaceId.CURRENT_MULTIPLIER_REGISTRY,
    L8PersistenceClass.CURRENT_MULTIPLIER,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.CURRENT_SUPERSEDED,
    {
      identity: CURRENT_IDENTITY_FIELDS,
      lineage: CURRENT_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: false,
      caches_allowed: true,
      description:
        'Authoritative current multiplier + reliance posture per (family, scope).',
    },
  ),

  [L8DurableSurfaceId.REGIME_TRANSITIONS]: mk(
    L8DurableSurfaceId.REGIME_TRANSITIONS,
    L8PersistenceClass.REGIME_TRANSITION,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.TRANSITION_APPEND,
    {
      identity: [
        'transition_id', 'regime_subject_id', 'scope_type', 'scope_id',
        'regime_family', 'delta_kind', 'new_state_ref',
      ],
      lineage: ['materialization_mode', 'compute_run_id'],
      description:
        'Append-only transition records for every current-state change.',
    },
  ),
  [L8DurableSurfaceId.REGIME_FAILURES]: mk(
    L8DurableSurfaceId.REGIME_FAILURES,
    L8PersistenceClass.REGIME_FAILURE,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.FAILURE_APPEND,
    {
      identity: [
        'failure_id', 'regime_subject_id', 'scope_type', 'scope_id',
        'regime_family', 'stage', 'failure_code',
      ],
      lineage: [
        'materialization_mode', 'compute_run_id',
        'lineage_refs.trace_id',
      ],
      description:
        'Append-only failure surface; operational truth for regime materialization.',
    },
  ),

  [L8DurableSurfaceId.HISTORICAL_REGIME_FACTS]: mk(
    L8DurableSurfaceId.HISTORICAL_REGIME_FACTS,
    L8PersistenceClass.HISTORICAL_REGIME,
    L8AuthorityStore.CLICKHOUSE,
    L8MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: HISTORICAL_IDENTITY_FIELDS,
      lineage: HISTORICAL_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      description:
        'Append-safe historical regime fact rows (ts_regime_fact_v1).',
    },
  ),
  [L8DurableSurfaceId.HISTORICAL_TRANSITION_FACTS]: mk(
    L8DurableSurfaceId.HISTORICAL_TRANSITION_FACTS,
    L8PersistenceClass.HISTORICAL_TRANSITION,
    L8AuthorityStore.CLICKHOUSE,
    L8MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: HISTORICAL_IDENTITY_FIELDS,
      lineage: HISTORICAL_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      description:
        'Append-safe historical transition fact rows (ts_regime_transition_v1).',
    },
  ),
  [L8DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS]: mk(
    L8DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS,
    L8PersistenceClass.HISTORICAL_CONFIDENCE,
    L8AuthorityStore.CLICKHOUSE,
    L8MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: HISTORICAL_IDENTITY_FIELDS,
      lineage: HISTORICAL_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: true,
      description:
        'Append-safe historical confidence fact rows (ts_regime_confidence_v1).',
    },
  ),
  [L8DurableSurfaceId.HISTORICAL_MULTIPLIER_FACTS]: mk(
    L8DurableSurfaceId.HISTORICAL_MULTIPLIER_FACTS,
    L8PersistenceClass.HISTORICAL_MULTIPLIER,
    L8AuthorityStore.CLICKHOUSE,
    L8MutationDiscipline.IMMUTABLE_APPEND,
    {
      identity: HISTORICAL_IDENTITY_FIELDS,
      lineage: HISTORICAL_LINEAGE_FIELDS,
      requires_replay_hash: true,
      requires_evidence_ref: false,
      description:
        'Append-safe historical multiplier fact rows (ts_regime_multiplier_v1).',
    },
  ),

  [L8DurableSurfaceId.EVIDENCE_REGISTRY]: mk(
    L8DurableSurfaceId.EVIDENCE_REGISTRY,
    L8PersistenceClass.EVIDENCE_POINTER,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.POINTER_APPEND,
    {
      identity: [
        'evidence_id', 'evidence_class', 'subject_ref',
        'archive_uri', 'checksum',
      ],
      lineage: [
        'manifest_id', 'compute_run_id', 'lineage_refs.trace_id',
      ],
      requires_archive_pointer: true,
      description:
        'Append-only evidence pointers linking archive payload to regime state.',
    },
  ),
  [L8DurableSurfaceId.LINEAGE_REGISTRY]: mk(
    L8DurableSurfaceId.LINEAGE_REGISTRY,
    L8PersistenceClass.LINEAGE_POINTER,
    L8AuthorityStore.POSTGRES,
    L8MutationDiscipline.POINTER_APPEND,
    {
      identity: [
        'lineage_id', 'regime_subject_id', 'state_ref',
        'compute_run_id', 'manifest_id', 'trace_id',
      ],
      lineage: ['manifest_id', 'trace_id'],
      description:
        'Append-only lineage pointers binding state to compute run + manifest + trace.',
    },
  ),
};

// ── Registry class ──────────────────────────────────────────────────────

export class L8DurableSurfaceRegistry {
  constructor(
    private readonly table: Readonly<
      Record<L8DurableSurfaceId, L8DurableSurfaceDescriptor>
    > = L8_DURABLE_SURFACE_REGISTRY,
  ) {}

  isRegistered(id: L8DurableSurfaceId): boolean {
    return !!this.table[id];
  }

  get(id: L8DurableSurfaceId): L8DurableSurfaceDescriptor | undefined {
    return this.table[id];
  }

  getOrThrow(id: L8DurableSurfaceId): L8DurableSurfaceDescriptor {
    const d = this.get(id);
    if (!d) throw new Error(`L8 durable surface not registered: ${id}`);
    return d;
  }

  list(): readonly L8DurableSurfaceDescriptor[] {
    return ALL_L8_DURABLE_SURFACE_IDS
      .map(id => this.table[id])
      .filter((d): d is L8DurableSurfaceDescriptor => !!d);
  }

  byAuthority(store: L8AuthorityStore):
    readonly L8DurableSurfaceDescriptor[] {
    return this.list().filter(d => d.authority_store === store);
  }

  modeLegal(
    id: L8DurableSurfaceId, mode: L8MaterializationMode,
  ): boolean {
    const d = this.table[id];
    if (!d) return false;
    return d.allowed_modes.includes(mode);
  }
}

let _defaultRegistry: L8DurableSurfaceRegistry | null = null;
export function getDefaultL8DurableSurfaceRegistry():
  L8DurableSurfaceRegistry {
  if (!_defaultRegistry) _defaultRegistry = new L8DurableSurfaceRegistry();
  return _defaultRegistry;
}
