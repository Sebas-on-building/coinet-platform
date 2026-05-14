/**
 * L11.8 — Durable Surface Registry (§11.8.3)
 *
 * Static registry mapping every L11 durable surface to its
 * authority class, mutation discipline, allowed materialization
 * modes, allowed persistence classes, and serving constraints.
 */

import {
  L11DurableSurfaceId,
  L11DurableSurfaceDescriptor,
  L11StorageAuthorityClass,
  L11MutationDiscipline,
  L11MaterializationMode,
  L11PersistenceClass,
  ALL_L11_DURABLE_SURFACE_IDS,
  L11_PERSISTENCE_CLASS_FOR_SURFACE,
} from '../contracts/l11-persistence-surface';

const POSTGRES_CURRENT_MODES: readonly L11MaterializationMode[] = [
  L11MaterializationMode.LIVE_CURRENT,
  L11MaterializationMode.REPAIR_REBUILD,
  L11MaterializationMode.LATE_DATA_REMATERIALIZATION,
];

const HISTORICAL_APPEND_MODES: readonly L11MaterializationMode[] = [
  L11MaterializationMode.LIVE_HISTORICAL_APPEND,
  L11MaterializationMode.REPLAY_HISTORICAL,
  L11MaterializationMode.REPAIR_REBUILD,
  L11MaterializationMode.LATE_DATA_REMATERIALIZATION,
];

const DEFINITION_MODES: readonly L11MaterializationMode[] = [
  L11MaterializationMode.LIVE_HISTORICAL_APPEND,
];

export const L11_DURABLE_SURFACE_REGISTRY:
  Readonly<Record<L11DurableSurfaceId, L11DurableSurfaceDescriptor>> = {
  [L11DurableSurfaceId.SCORE_DEFINITIONS]: {
    surface_id: L11DurableSurfaceId.SCORE_DEFINITIONS,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.IMMUTABLE_DEFINITION,
    materialization_modes_allowed: DEFINITION_MODES,
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.SCORE_DEFINITIONS],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: false,
    append_only: true,
    correction_aware: false,
    caches_allowed: false,
  },
  [L11DurableSurfaceId.SCORE_FORMULA_DEFINITIONS]: {
    surface_id: L11DurableSurfaceId.SCORE_FORMULA_DEFINITIONS,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.IMMUTABLE_DEFINITION,
    materialization_modes_allowed: DEFINITION_MODES,
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.SCORE_FORMULA_DEFINITIONS],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: false,
    append_only: true,
    correction_aware: false,
    caches_allowed: false,
  },
  [L11DurableSurfaceId.SCORE_RUNS]: {
    surface_id: L11DurableSurfaceId.SCORE_RUNS,
    authority_class: L11StorageAuthorityClass.CLICKHOUSE_HISTORICAL_FACT,
    mutation_discipline: L11MutationDiscipline.APPEND_ONLY_FACT,
    materialization_modes_allowed: [
      L11MaterializationMode.LIVE_HISTORICAL_APPEND,
      L11MaterializationMode.REPLAY_HISTORICAL,
      L11MaterializationMode.REPAIR_REBUILD,
      L11MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ],
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.SCORE_RUNS],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: false,
    append_only: true,
    correction_aware: true,
    caches_allowed: false,
  },
  [L11DurableSurfaceId.CURRENT_SCORE_REGISTRY]: {
    surface_id: L11DurableSurfaceId.CURRENT_SCORE_REGISTRY,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.CURRENT_SUPERSEDE_WITH_PRIOR_REF,
    materialization_modes_allowed: POSTGRES_CURRENT_MODES,
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.CURRENT_SCORE_REGISTRY],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: true,
    current_authority: true,
    append_only: false,
    correction_aware: true,
    caches_allowed: true,
  },
  [L11DurableSurfaceId.CURRENT_SCORE_COMPONENT_REGISTRY]: {
    surface_id: L11DurableSurfaceId.CURRENT_SCORE_COMPONENT_REGISTRY,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.CURRENT_SUPERSEDE_WITH_PRIOR_REF,
    materialization_modes_allowed: POSTGRES_CURRENT_MODES,
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.CURRENT_SCORE_COMPONENT_REGISTRY],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: true,
    append_only: false,
    correction_aware: true,
    caches_allowed: true,
  },
  [L11DurableSurfaceId.CURRENT_SCORE_ATTRIBUTION_REGISTRY]: {
    surface_id: L11DurableSurfaceId.CURRENT_SCORE_ATTRIBUTION_REGISTRY,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.CURRENT_SUPERSEDE_WITH_PRIOR_REF,
    materialization_modes_allowed: POSTGRES_CURRENT_MODES,
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.CURRENT_SCORE_ATTRIBUTION_REGISTRY],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: true,
    current_authority: true,
    append_only: false,
    correction_aware: true,
    caches_allowed: true,
  },
  [L11DurableSurfaceId.CURRENT_SCORE_MODIFIER_REGISTRY]: {
    surface_id: L11DurableSurfaceId.CURRENT_SCORE_MODIFIER_REGISTRY,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.CURRENT_SUPERSEDE_WITH_PRIOR_REF,
    materialization_modes_allowed: POSTGRES_CURRENT_MODES,
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.CURRENT_SCORE_MODIFIER_REGISTRY],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: true,
    append_only: false,
    correction_aware: true,
    caches_allowed: true,
  },
  [L11DurableSurfaceId.CURRENT_MISSING_DATA_REGISTRY]: {
    surface_id: L11DurableSurfaceId.CURRENT_MISSING_DATA_REGISTRY,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.CURRENT_SUPERSEDE_WITH_PRIOR_REF,
    materialization_modes_allowed: POSTGRES_CURRENT_MODES,
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.CURRENT_MISSING_DATA_REGISTRY],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: true,
    append_only: false,
    correction_aware: true,
    caches_allowed: true,
  },
  [L11DurableSurfaceId.CURRENT_CALIBRATION_HOOK_REGISTRY]: {
    surface_id: L11DurableSurfaceId.CURRENT_CALIBRATION_HOOK_REGISTRY,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.CURRENT_SUPERSEDE_WITH_PRIOR_REF,
    materialization_modes_allowed: [
      ...POSTGRES_CURRENT_MODES,
      L11MaterializationMode.CALIBRATION_APPEND,
    ],
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.CURRENT_CALIBRATION_HOOK_REGISTRY],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: true,
    append_only: false,
    correction_aware: true,
    caches_allowed: true,
  },
  [L11DurableSurfaceId.CURRENT_DRIFT_REGISTRY]: {
    surface_id: L11DurableSurfaceId.CURRENT_DRIFT_REGISTRY,
    authority_class: L11StorageAuthorityClass.POSTGRES_CURRENT_AUTHORITY,
    mutation_discipline: L11MutationDiscipline.CURRENT_SUPERSEDE_WITH_PRIOR_REF,
    materialization_modes_allowed: [
      ...POSTGRES_CURRENT_MODES,
      L11MaterializationMode.DRIFT_APPEND,
    ],
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.CURRENT_DRIFT_REGISTRY],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: true,
    append_only: false,
    correction_aware: true,
    caches_allowed: true,
  },
  [L11DurableSurfaceId.SCORE_TRANSITIONS]: {
    surface_id: L11DurableSurfaceId.SCORE_TRANSITIONS,
    authority_class: L11StorageAuthorityClass.CLICKHOUSE_HISTORICAL_FACT,
    mutation_discipline: L11MutationDiscipline.APPEND_ONLY_FACT,
    materialization_modes_allowed: HISTORICAL_APPEND_MODES,
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.SCORE_TRANSITIONS],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: false,
    append_only: true,
    correction_aware: true,
    caches_allowed: false,
  },
  [L11DurableSurfaceId.SCORE_FAILURES]: {
    surface_id: L11DurableSurfaceId.SCORE_FAILURES,
    authority_class: L11StorageAuthorityClass.CLICKHOUSE_HISTORICAL_FACT,
    mutation_discipline: L11MutationDiscipline.FAILURE_APPEND,
    materialization_modes_allowed: [
      L11MaterializationMode.FAILURE_APPEND,
    ],
    persistence_classes_allowed:
      L11_PERSISTENCE_CLASS_FOR_SURFACE[L11DurableSurfaceId.SCORE_FAILURES],
    requires_lineage: true,
    requires_replay_hash: true,
    requires_policy_version: true,
    requires_evidence_ref: false,
    current_authority: false,
    append_only: true,
    correction_aware: false,
    caches_allowed: false,
  },
};

export function getL11DurableSurfaceDescriptor(
  id: L11DurableSurfaceId,
): L11DurableSurfaceDescriptor | null {
  return L11_DURABLE_SURFACE_REGISTRY[id] ?? null;
}

export function listL11DurableSurfaces():
  readonly L11DurableSurfaceDescriptor[] {
  return ALL_L11_DURABLE_SURFACE_IDS
    .map(id => L11_DURABLE_SURFACE_REGISTRY[id]);
}

export interface L11DurableSurfaceRegistryReport {
  readonly ok: boolean;
  readonly registered: number;
  readonly current_authority_count: number;
  readonly historical_count: number;
  readonly missing: readonly L11DurableSurfaceId[];
}

export function buildL11DurableSurfaceRegistryReport():
  L11DurableSurfaceRegistryReport {
  const missing: L11DurableSurfaceId[] = [];
  let currentAuthority = 0;
  let historical = 0;
  for (const id of ALL_L11_DURABLE_SURFACE_IDS) {
    const desc = L11_DURABLE_SURFACE_REGISTRY[id];
    if (!desc) { missing.push(id); continue; }
    if (desc.current_authority) currentAuthority++;
    if (desc.append_only) historical++;
  }
  return {
    ok: missing.length === 0,
    registered: ALL_L11_DURABLE_SURFACE_IDS.length - missing.length,
    current_authority_count: currentAuthority,
    historical_count: historical,
    missing,
  };
}
