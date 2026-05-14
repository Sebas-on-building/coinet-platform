/**
 * L12.6 — Durable surface registry (§12.6.3, §12.6.4, §12.6.5).
 *
 * Single source of truth for the L12 durable surface descriptors. Each
 * surface declares its authority class, mutation discipline, default
 * materialization mode, and whether evidence archival is required for writes.
 */

import {
  ALL_L12_DURABLE_SURFACE_IDS,
  L12_DURABLE_SURFACE_AUTHORITY,
  L12DurableSurfaceId,
  L12MaterializationMode,
  L12MutationDiscipline,
  L12StorageAuthorityClass,
} from '../contracts/l12-persistence-surface';

export interface L12DurableSurfaceDescriptor {
  readonly durable_surface_id: L12DurableSurfaceId;
  readonly storage_authority: L12StorageAuthorityClass;
  readonly mutation_discipline: L12MutationDiscipline;
  readonly default_materialization_mode: L12MaterializationMode;
  readonly evidence_archive_required: boolean;
  readonly current_authority_allowed: boolean;
  readonly historical_append_allowed: boolean;
  readonly policy_version: string;
}

const POLICY = 'l12.6.durable_surface_registry.v1';

/**
 * Default descriptor table. Built lazily and frozen on first access.
 */
const DESCRIPTORS: Map<L12DurableSurfaceId, L12DurableSurfaceDescriptor> = new Map();

function buildDefaultDescriptor(
  id: L12DurableSurfaceId,
): L12DurableSurfaceDescriptor {
  const authority = L12_DURABLE_SURFACE_AUTHORITY[id];
  let discipline: L12MutationDiscipline;
  let defaultMode: L12MaterializationMode;
  let currentOk = false;
  let historicalOk = false;
  let evidenceRequired = false;

  if (authority === L12StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY) {
    discipline = L12MutationDiscipline.CURRENT_UPSERT_WITH_SUPERSESSION;
    defaultMode = L12MaterializationMode.LIVE_CURRENT;
    currentOk = true;
    evidenceRequired =
      id === L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY ||
      id === L12DurableSurfaceId.CURRENT_TRIGGER_REGISTRY ||
      id === L12DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY ||
      id === L12DurableSurfaceId.CURRENT_PATH_CONFIDENCE_REGISTRY ||
      id === L12DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY ||
      id === L12DurableSurfaceId.CURRENT_SCENARIO_RESTRICTION_REGISTRY;
  } else if (authority === L12StorageAuthorityClass.CLICKHOUSE_HISTORICAL_APPEND) {
    discipline =
      id === L12DurableSurfaceId.SCENARIO_FAILURES
        ? L12MutationDiscipline.FAILURE_APPEND_ONLY
        : id === L12DurableSurfaceId.SCENARIO_TRANSITIONS
          ? L12MutationDiscipline.TRANSITION_APPEND_ONLY
          : L12MutationDiscipline.APPEND_ONLY_HISTORY;
    defaultMode =
      id === L12DurableSurfaceId.SCENARIO_FAILURES
        ? L12MaterializationMode.FAILURE_RECORD
        : L12MaterializationMode.LIVE_HISTORICAL_APPEND;
    historicalOk = true;
  } else if (authority === L12StorageAuthorityClass.OBJECT_STORAGE_EVIDENCE_ARCHIVE) {
    discipline = L12MutationDiscipline.IMMUTABLE_EVIDENCE_ARCHIVE;
    defaultMode = L12MaterializationMode.LIVE_HISTORICAL_APPEND;
    evidenceRequired = true;
  } else {
    discipline = L12MutationDiscipline.CACHE_REFRESH_ONLY;
    defaultMode = L12MaterializationMode.SHADOW_EVALUATION;
  }

  return {
    durable_surface_id: id,
    storage_authority: authority,
    mutation_discipline: discipline,
    default_materialization_mode: defaultMode,
    evidence_archive_required: evidenceRequired,
    current_authority_allowed: currentOk,
    historical_append_allowed: historicalOk,
    policy_version: POLICY,
  };
}

function ensureBootstrapped(): void {
  if (DESCRIPTORS.size === ALL_L12_DURABLE_SURFACE_IDS.length) return;
  for (const id of ALL_L12_DURABLE_SURFACE_IDS) {
    if (!DESCRIPTORS.has(id)) {
      DESCRIPTORS.set(id, buildDefaultDescriptor(id));
    }
  }
}

export function getL12DurableSurfaceDescriptor(
  id: L12DurableSurfaceId,
): L12DurableSurfaceDescriptor | undefined {
  ensureBootstrapped();
  return DESCRIPTORS.get(id);
}

export function listL12DurableSurfaceDescriptors(): readonly L12DurableSurfaceDescriptor[] {
  ensureBootstrapped();
  return [...DESCRIPTORS.values()].sort((a, b) =>
    a.durable_surface_id.localeCompare(b.durable_surface_id),
  );
}

export function isL12DurableSurfaceRegistered(
  id: L12DurableSurfaceId,
): boolean {
  ensureBootstrapped();
  return DESCRIPTORS.has(id);
}

/** Test/maintenance utility — wipes the registry. */
export function clearL12DurableSurfaceRegistry(): void {
  DESCRIPTORS.clear();
}

/** Force re-bootstrap to canonical defaults. */
export function bootstrapL12DurableSurfaceRegistry(): void {
  DESCRIPTORS.clear();
  ensureBootstrapped();
}
