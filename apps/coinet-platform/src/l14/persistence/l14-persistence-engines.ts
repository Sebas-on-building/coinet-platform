/**
 * L14.8 — Persistence Engines (registry + materialization + current registry writer)
 *
 * §14.8.6 / §14.8.7 / §14.8.40 / §14.8.41 / §14.8.42
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  ALL_L14_DURABLE_SURFACES,
  L14DurableSurfaceId,
  L14MaterializationMode,
  L14MutationDiscipline,
  L14StorageAuthorityClass,
  type L14DurableSurfaceDescriptor,
  type L14PersistenceEnvelope,
  type L14SublayerRef,
} from '../contracts/l14-persistence-surfaces';
import {
  ALL_L14_HISTORICAL_FAMILIES,
  L14HistoricalFactFamily,
  L14_FAMILY_SOURCE_SURFACES,
  type L14HistoricalFactRecord,
} from '../contracts/l14-historical-facts';
import {
  ALL_L14_CURRENT_REGISTRIES,
  L14CurrentRegistryId,
} from '../contracts/l14-current-registries';

const POLICY_V = 'l14.persistence.v1';

// ── Durable surface registry ──────────────────────────────────────

function descriptor(
  surface_id: L14DurableSurfaceId,
  cls: L14StorageAuthorityClass,
  mut: readonly L14MutationDiscipline[],
  modes: readonly L14MaterializationMode[],
  sources: readonly L14SublayerRef[],
  repair: readonly ('MATERIALIZATION_REBUILD' | 'DERIVED_FACT_RECOMPUTE' | 'CURRENT_REGISTRY_REBUILD')[],
  flags: {
    replay_supported: boolean;
    authoritative_current_truth: boolean;
    historical_fact_surface: boolean;
    derived_recomputable_surface: boolean;
  },
): L14DurableSurfaceDescriptor {
  return {
    surface_id,
    storage_authority_class: cls,
    mutation_discipline: mut,
    allowed_materialization_modes: modes,
    source_sublayers: sources,
    allowed_repair_modes: repair,
    ...flags,
    lineage_required: true,
    replay_hash_required: true,
    l5_route_required: true,
    policy_version: POLICY_V,
  };
}

const SURFACE_REGISTRY: Readonly<Record<L14DurableSurfaceId, L14DurableSurfaceDescriptor>> = {
  [L14DurableSurfaceId.DELIVERY_PAYLOADS]: descriptor(
    L14DurableSurfaceId.DELIVERY_PAYLOADS,
    L14StorageAuthorityClass.APPEND_ONLY_OPERATIONAL_FACT,
    [L14MutationDiscipline.APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.INITIAL_APPEND, L14MaterializationMode.REPAIR_REBUILD_APPEND],
    ['L14.2', 'L14.3'], ['MATERIALIZATION_REBUILD'],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
  [L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS]: descriptor(
    L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    L14StorageAuthorityClass.APPEND_ONLY_OPERATIONAL_FACT,
    [L14MutationDiscipline.APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.EVENT_APPEND, L14MaterializationMode.REPAIR_REBUILD_APPEND],
    ['L14.3'], ['MATERIALIZATION_REBUILD'],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
  [L14DurableSurfaceId.DELIVERY_SUPPRESSIONS]: descriptor(
    L14DurableSurfaceId.DELIVERY_SUPPRESSIONS,
    L14StorageAuthorityClass.APPEND_ONLY_OPERATIONAL_FACT,
    [L14MutationDiscipline.APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.EVENT_APPEND, L14MaterializationMode.REPAIR_REBUILD_APPEND],
    ['L14.3'], ['MATERIALIZATION_REBUILD'],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
  [L14DurableSurfaceId.USER_INTERACTION_EVENTS]: descriptor(
    L14DurableSurfaceId.USER_INTERACTION_EVENTS,
    L14StorageAuthorityClass.APPEND_ONLY_OPERATIONAL_FACT,
    [L14MutationDiscipline.APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.EVENT_APPEND],
    ['L14.4'], [],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
  [L14DurableSurfaceId.OUTCOME_EVALUATIONS]: descriptor(
    L14DurableSurfaceId.OUTCOME_EVALUATIONS,
    L14StorageAuthorityClass.APPEND_ONLY_ANALYTICAL_FACT,
    [L14MutationDiscipline.APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.DERIVED_FACT_APPEND],
    ['L14.5'], [],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
  [L14DurableSurfaceId.CALIBRATION_EVIDENCE]: descriptor(
    L14DurableSurfaceId.CALIBRATION_EVIDENCE,
    L14StorageAuthorityClass.APPEND_ONLY_ANALYTICAL_FACT,
    [L14MutationDiscipline.APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.DERIVED_FACT_APPEND],
    ['L14.6'], [],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
  [L14DurableSurfaceId.CALIBRATION_PROPOSALS]: descriptor(
    L14DurableSurfaceId.CALIBRATION_PROPOSALS,
    L14StorageAuthorityClass.APPEND_ONLY_ANALYTICAL_FACT,
    [L14MutationDiscipline.APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.DERIVED_FACT_APPEND],
    ['L14.7'], [],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
  [L14DurableSurfaceId.DELIVERY_FAILURES]: descriptor(
    L14DurableSurfaceId.DELIVERY_FAILURES,
    L14StorageAuthorityClass.APPEND_ONLY_OPERATIONAL_FACT,
    [L14MutationDiscipline.APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.EVENT_APPEND, L14MaterializationMode.REPAIR_REBUILD_APPEND],
    ['L14.3', 'L14.8'], ['MATERIALIZATION_REBUILD'],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
  [L14DurableSurfaceId.ALERT_PERFORMANCE_FACTS]: descriptor(
    L14DurableSurfaceId.ALERT_PERFORMANCE_FACTS,
    L14StorageAuthorityClass.DERIVED_RECOMPUTABLE_FACT,
    [L14MutationDiscipline.RECOMPUTABLE_DERIVED_APPEND, L14MutationDiscipline.REPAIR_APPEND_WITH_PARENT],
    [L14MaterializationMode.DERIVED_FACT_APPEND, L14MaterializationMode.REPAIR_REBUILD_APPEND],
    ['L14.4', 'L14.5'], ['DERIVED_FACT_RECOMPUTE'],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: true },
  ),
  [L14DurableSurfaceId.CHANNEL_HEALTH_FACTS]: descriptor(
    L14DurableSurfaceId.CHANNEL_HEALTH_FACTS,
    L14StorageAuthorityClass.DERIVED_RECOMPUTABLE_FACT,
    [L14MutationDiscipline.RECOMPUTABLE_DERIVED_APPEND, L14MutationDiscipline.REPAIR_APPEND_WITH_PARENT],
    [L14MaterializationMode.DERIVED_FACT_APPEND, L14MaterializationMode.REPAIR_REBUILD_APPEND],
    ['L14.3'], ['DERIVED_FACT_RECOMPUTE'],
    { replay_supported: true, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: true },
  ),
  [L14DurableSurfaceId.AUDIT_EVENTS]: descriptor(
    L14DurableSurfaceId.AUDIT_EVENTS,
    L14StorageAuthorityClass.APPEND_ONLY_AUDIT_FACT,
    [L14MutationDiscipline.AUDIT_APPEND_ONLY, L14MutationDiscipline.NEVER_DIRECT_MUTATION],
    [L14MaterializationMode.AUDIT_APPEND],
    ['L14.1', 'L14.2', 'L14.3', 'L14.4', 'L14.5', 'L14.6', 'L14.7', 'L14.8'], [],
    { replay_supported: false, authoritative_current_truth: false, historical_fact_surface: true, derived_recomputable_surface: false },
  ),
};

export function getL14DurableSurfaceDescriptor(id: L14DurableSurfaceId): L14DurableSurfaceDescriptor | undefined {
  return SURFACE_REGISTRY[id];
}

export function getAllL14DurableSurfaceDescriptors(): readonly L14DurableSurfaceDescriptor[] {
  return ALL_L14_DURABLE_SURFACES.map(s => SURFACE_REGISTRY[s]);
}

export function isL14DurableSurfaceRegistered(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(SURFACE_REGISTRY, id);
}

export function isL14HistoricalFamilyRegistered(family: string): boolean {
  return ALL_L14_HISTORICAL_FAMILIES.includes(family as L14HistoricalFactFamily);
}

export function isL14CurrentRegistryRegistered(id: string): boolean {
  return ALL_L14_CURRENT_REGISTRIES.includes(id as L14CurrentRegistryId);
}

// ── Persistence envelope builder + materialization policy ────────

export interface L14PersistenceEnvelopeInput {
  readonly target_surface_id: L14DurableSurfaceId;
  readonly materialization_mode: L14MaterializationMode;
  readonly source_object_ref: string;
  readonly source_sublayer_ref: L14SublayerRef;
  readonly l5_route_ref: string;
  readonly write_authority_ref: string;
  readonly current_registry_supersession_ref?: string;
  readonly repair_request_ref?: string;
  readonly replay_result_ref?: string;
  readonly lineage_refs?: readonly string[];
}

export function buildL14PersistenceEnvelope(input: L14PersistenceEnvelopeInput): L14PersistenceEnvelope {
  const lineage = input.lineage_refs ?? ['l14.persistence.lineage'];
  const replayHash = fnv1a([
    input.target_surface_id, input.materialization_mode, input.source_object_ref,
    input.source_sublayer_ref, input.l5_route_ref, input.write_authority_ref,
    input.current_registry_supersession_ref ?? '', input.repair_request_ref ?? '',
    input.replay_result_ref ?? '', lineage.join(','), POLICY_V,
  ].join('|'));
  return {
    persistence_envelope_id: `l14.persistence.envelope.${replayHash}`,
    target_surface_id: input.target_surface_id,
    materialization_mode: input.materialization_mode,
    source_object_ref: input.source_object_ref,
    source_sublayer_ref: input.source_sublayer_ref,
    l5_route_ref: input.l5_route_ref,
    write_authority_ref: input.write_authority_ref,
    current_registry_supersession_ref: input.current_registry_supersession_ref,
    repair_request_ref: input.repair_request_ref,
    replay_result_ref: input.replay_result_ref,
    lineage_refs: lineage,
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

export function isMaterializationModeLegalForSurface(
  surfaceId: L14DurableSurfaceId,
  mode: L14MaterializationMode,
): boolean {
  const d = SURFACE_REGISTRY[surfaceId];
  if (!d) return false;
  return d.allowed_materialization_modes.includes(mode);
}

// ── Historical fact builder ──────────────────────────────────────

export interface L14HistoricalFactInput {
  readonly fact_family: L14HistoricalFactFamily;
  readonly source_surface_id: L14DurableSurfaceId;
  readonly source_record_ref: string;
  readonly occurred_at: string;
  readonly observed_window_start?: string;
  readonly observed_window_end?: string;
  readonly normalized_subject_ref?: string;
  readonly normalized_channel_ref?: L14HistoricalFactRecord['normalized_channel_ref'];
  readonly normalized_alert_class_ref?: string;
  readonly normalized_regime_ref?: string;
}

export function buildL14HistoricalFactRecord(input: L14HistoricalFactInput): L14HistoricalFactRecord {
  const replayHash = fnv1a([
    input.fact_family, input.source_surface_id, input.source_record_ref,
    input.occurred_at, input.observed_window_start ?? '', input.observed_window_end ?? '',
    input.normalized_subject_ref ?? '', input.normalized_channel_ref ?? '',
    input.normalized_alert_class_ref ?? '', input.normalized_regime_ref ?? '',
    POLICY_V,
  ].join('|'));
  return {
    historical_fact_id: `l14.hist.${replayHash}`,
    fact_family: input.fact_family,
    source_surface_id: input.source_surface_id,
    source_record_ref: input.source_record_ref,
    occurred_at: input.occurred_at,
    observed_window_start: input.observed_window_start,
    observed_window_end: input.observed_window_end,
    normalized_subject_ref: input.normalized_subject_ref,
    normalized_channel_ref: input.normalized_channel_ref,
    normalized_alert_class_ref: input.normalized_alert_class_ref,
    normalized_regime_ref: input.normalized_regime_ref,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

export function isHistoricalFamilySourceSurfaceLegal(
  family: L14HistoricalFactFamily,
  surface: L14DurableSurfaceId,
): boolean {
  return L14_FAMILY_SOURCE_SURFACES[family].includes(surface);
}
