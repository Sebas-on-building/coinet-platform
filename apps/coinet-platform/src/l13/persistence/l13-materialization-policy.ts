/**
 * L13.10 — Materialization Policy
 *
 * §13.10.7 / §13.10.16 — Frozen per-surface materialization policy.
 * Maps each durable surface to its authority class, mutation
 * discipline, and which materialization modes it supports.
 */

import {
  L13MaterializationMode,
  L13MutationDiscipline,
  L13StorageAuthorityClass,
} from '../contracts/l13-storage-authority';
import {
  L13DurableSurfaceId,
  type L13DurableSurfaceDescriptor,
} from '../contracts/l13-persistence-surface';

const POLICY_V = 'l13.persistence.v1';

function desc(
  surface_id: L13DurableSurfaceId,
  storage_authority_class: L13StorageAuthorityClass,
  mutation_discipline: L13MutationDiscipline,
  materialization_mode: readonly L13MaterializationMode[],
  current_authority: boolean,
  append_safe: boolean,
  correction_aware = false,
): L13DurableSurfaceDescriptor {
  return {
    surface_id,
    storage_authority_class,
    mutation_discipline,
    materialization_mode,
    current_authority,
    append_safe,
    correction_aware,
    required_lineage_refs: true,
    required_replay_hash: true,
    required_policy_version: true,
    policy_version: POLICY_V,
  };
}

const SURFACE_DESCRIPTORS: ReadonlyArray<L13DurableSurfaceDescriptor> = [
  // Immutable artifact rows (Postgres or object pointer).
  desc(
    L13DurableSurfaceId.AI_INPUT_PACKAGES,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW, L13MaterializationMode.POINTER_TO_OBJECT_STORE],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_PROMPT_ASSEMBLIES,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_MODEL_RUNS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_MODEL_RESPONSE_ARTIFACTS,
    L13StorageAuthorityClass.OBJECT_STORAGE_IMMUTABLE,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.POINTER_TO_OBJECT_STORE],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_OUTPUTS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW, L13MaterializationMode.POINTER_TO_OBJECT_STORE],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_PRODUCT_MODE_PAYLOADS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_STYLED_RESPONSE_ENVELOPES,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_SAFETY_GATE_RESULTS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_FINAL_GATE_RESULTS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_GROUNDED_CLAIMS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_BLOCKED_CLAIMS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.IMMUTABLE,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_USER_FEEDBACK,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_OUTPUT_QUALITY_METRICS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_OUTPUT_QUALITY_EVALUATIONS,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_OUTPUT_FAILURES,
    L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.DIRECT_ROW],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.AI_AUDIT_EVENTS,
    L13StorageAuthorityClass.AUDIT_APPEND_ONLY,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.AUDIT_EVENT_APPEND],
    false,
    true,
  ),
  // Current authority registries.
  desc(
    L13DurableSurfaceId.CURRENT_AI_OUTPUT_REGISTRY,
    L13StorageAuthorityClass.POSTGRES_CURRENT,
    L13MutationDiscipline.SUPERSESSION_SAFE_CURRENT,
    [L13MaterializationMode.CURRENT_REGISTRY_UPSERT],
    true,
    false,
  ),
  desc(
    L13DurableSurfaceId.CURRENT_AI_FEEDBACK_SUMMARY_REGISTRY,
    L13StorageAuthorityClass.POSTGRES_CURRENT,
    L13MutationDiscipline.RECOMPUTABLE_CURRENT,
    [L13MaterializationMode.CURRENT_REGISTRY_UPSERT],
    true,
    false,
  ),
  // Historical fact families.
  desc(
    L13DurableSurfaceId.TS_AI_OUTPUT_FACT_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.TS_AI_CLAIM_GROUNDING_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.TS_AI_BLOCKED_CLAIM_FACT_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.TS_AI_FEEDBACK_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.TS_AI_FEEDBACK_RESOLUTION_FACT_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.TS_AI_SAFETY_EVENT_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.TS_AI_OUTPUT_QUALITY_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.TS_AI_MODEL_RUN_FACT_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
  desc(
    L13DurableSurfaceId.TS_AI_FAILURE_FACT_V1,
    L13StorageAuthorityClass.TIME_SERIES_APPEND,
    L13MutationDiscipline.APPEND_ONLY,
    [L13MaterializationMode.HISTORICAL_FACT_APPEND],
    false,
    true,
  ),
];

const SURFACE_INDEX: ReadonlyMap<L13DurableSurfaceId, L13DurableSurfaceDescriptor> =
  new Map(SURFACE_DESCRIPTORS.map(d => [d.surface_id, d]));

export function getL13DurableSurfaceDescriptors():
  readonly L13DurableSurfaceDescriptor[] {
  return SURFACE_DESCRIPTORS;
}

export function getL13DurableSurfaceDescriptor(
  id: L13DurableSurfaceId,
): L13DurableSurfaceDescriptor | undefined {
  return SURFACE_INDEX.get(id);
}

export function l13SurfaceIsRegistered(id: L13DurableSurfaceId): boolean {
  return SURFACE_INDEX.has(id);
}

export const L13_MATERIALIZATION_POLICY_VERSION = POLICY_V;
