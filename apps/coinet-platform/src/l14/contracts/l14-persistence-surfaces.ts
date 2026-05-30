/**
 * L14.8 — Persistence Surfaces Contracts
 *
 * §14.8.4 / §14.8.5 / §14.8.6 / §14.8.7 / §14.8.40
 */

// ── Durable surface IDs ───────────────────────────────────────────

export enum L14DurableSurfaceId {
  DELIVERY_PAYLOADS = 'l14.delivery_payloads',
  DELIVERY_EXECUTION_RECORDS = 'l14.delivery_execution_records',
  DELIVERY_SUPPRESSIONS = 'l14.delivery_suppressions',
  USER_INTERACTION_EVENTS = 'l14.user_interaction_events',
  OUTCOME_EVALUATIONS = 'l14.outcome_evaluations',
  CALIBRATION_EVIDENCE = 'l14.calibration_evidence',
  CALIBRATION_PROPOSALS = 'l14.calibration_proposals',
  DELIVERY_FAILURES = 'l14.delivery_failures',
  ALERT_PERFORMANCE_FACTS = 'l14.alert_performance_facts',
  CHANNEL_HEALTH_FACTS = 'l14.channel_health_facts',
  AUDIT_EVENTS = 'l14.audit_events',
}
export const ALL_L14_DURABLE_SURFACES: readonly L14DurableSurfaceId[] =
  Object.values(L14DurableSurfaceId);

// ── Authority + mutation taxonomy ─────────────────────────────────

export enum L14StorageAuthorityClass {
  APPEND_ONLY_OPERATIONAL_FACT = 'APPEND_ONLY_OPERATIONAL_FACT',
  APPEND_ONLY_ANALYTICAL_FACT = 'APPEND_ONLY_ANALYTICAL_FACT',
  APPEND_ONLY_AUDIT_FACT = 'APPEND_ONLY_AUDIT_FACT',
  CURRENT_REGISTRY_AUTHORITY = 'CURRENT_REGISTRY_AUTHORITY',
  DERIVED_RECOMPUTABLE_FACT = 'DERIVED_RECOMPUTABLE_FACT',
}

export enum L14MutationDiscipline {
  APPEND_ONLY = 'APPEND_ONLY',
  SUPERSEDE_CURRENT_ONLY = 'SUPERSEDE_CURRENT_ONLY',
  RECOMPUTABLE_DERIVED_APPEND = 'RECOMPUTABLE_DERIVED_APPEND',
  AUDIT_APPEND_ONLY = 'AUDIT_APPEND_ONLY',
  REPAIR_APPEND_WITH_PARENT = 'REPAIR_APPEND_WITH_PARENT',
  NEVER_DIRECT_MUTATION = 'NEVER_DIRECT_MUTATION',
}

export enum L14MaterializationMode {
  INITIAL_APPEND = 'INITIAL_APPEND',
  EVENT_APPEND = 'EVENT_APPEND',
  DERIVED_FACT_APPEND = 'DERIVED_FACT_APPEND',
  CURRENT_REGISTRY_UPSERT = 'CURRENT_REGISTRY_UPSERT',
  CURRENT_REGISTRY_SUPERSESSION = 'CURRENT_REGISTRY_SUPERSESSION',
  REPAIR_REBUILD_APPEND = 'REPAIR_REBUILD_APPEND',
  REPLAY_CAPTURE_APPEND = 'REPLAY_CAPTURE_APPEND',
  AUDIT_APPEND = 'AUDIT_APPEND',
}

export type L14SublayerRef =
  | 'L14.1' | 'L14.2' | 'L14.3' | 'L14.4'
  | 'L14.5' | 'L14.6' | 'L14.7' | 'L14.8';

export type L14RepairMode =
  | 'MATERIALIZATION_REBUILD'
  | 'DERIVED_FACT_RECOMPUTE'
  | 'CURRENT_REGISTRY_REBUILD';

export interface L14DurableSurfaceDescriptor {
  readonly surface_id: L14DurableSurfaceId;
  readonly storage_authority_class: L14StorageAuthorityClass;
  readonly mutation_discipline: readonly L14MutationDiscipline[];
  readonly allowed_materialization_modes: readonly L14MaterializationMode[];
  readonly source_sublayers: readonly L14SublayerRef[];
  readonly allowed_repair_modes: readonly L14RepairMode[];
  readonly replay_supported: boolean;
  readonly authoritative_current_truth: boolean;
  readonly historical_fact_surface: boolean;
  readonly derived_recomputable_surface: boolean;
  readonly lineage_required: true;
  readonly replay_hash_required: true;
  readonly l5_route_required: true;
  readonly policy_version: string;
}

// ── Persistence envelope ──────────────────────────────────────────

export interface L14PersistenceEnvelope {
  readonly persistence_envelope_id: string;
  readonly target_surface_id: L14DurableSurfaceId;
  readonly materialization_mode: L14MaterializationMode;
  readonly source_object_ref: string;
  readonly source_sublayer_ref: L14SublayerRef;
  readonly l5_route_ref: string;
  readonly write_authority_ref: string;
  readonly current_registry_supersession_ref?: string;
  readonly repair_request_ref?: string;
  readonly replay_result_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
