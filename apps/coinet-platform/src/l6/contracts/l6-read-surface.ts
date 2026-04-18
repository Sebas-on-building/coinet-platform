/**
 * L6.7 — Read-Surface Contracts
 *
 * §6.7.6 — Later layers must consume Layer 6 through governed read surfaces,
 * not raw historical tables or ad hoc recomputed primitives. This file
 * freezes the seven required read-surface identifiers, their payload
 * contracts, the historical-state classes they may return, and the
 * consumption law (§6.7.7) that governs who may consume which surface.
 */

/**
 * §6.7.6.2 — Seven required read surfaces.
 */
export enum L6ReadSurfaceId {
  CURRENT_FEATURE_SNAPSHOT_BY_SCOPE = 'current_feature_snapshot_by_scope',
  FEATURE_HISTORY_BY_SCOPE_AND_WINDOW = 'feature_history_by_scope_and_window',
  ACTIVE_EVENTS_BY_SCOPE = 'active_events_by_scope',
  EVENT_HISTORY_BY_SCOPE = 'event_history_by_scope',
  FEATURE_EVIDENCE_BUNDLE = 'feature_evidence_bundle',
  EVENT_EVIDENCE_PACK = 'event_evidence_pack',
  RECOMPUTE_LINEAGE_BY_COMPUTE_RUN = 'recompute_lineage_by_compute_run',
}

export const ALL_READ_SURFACE_IDS: readonly L6ReadSurfaceId[] =
  Object.values(L6ReadSurfaceId);

/**
 * §6.7.3.4, §6.7.6.11 — Classes a historical row may belong to. Read APIs
 * must tag rows with one of these; ambiguous reads are rejected.
 */
export enum L6HistoricalSurfaceClass {
  LIVE_PROJECTED = 'LIVE_PROJECTED',
  REPLAY_TAGGED = 'REPLAY_TAGGED',
  REPAIR_TAGGED = 'REPAIR_TAGGED',
  LATE_DATA_REMATERIALIZED = 'LATE_DATA_REMATERIALIZED',
}

export const ALL_HISTORICAL_SURFACE_CLASSES: readonly L6HistoricalSurfaceClass[] =
  Object.values(L6HistoricalSurfaceClass);

/**
 * §6.7.6.11 — Mode of a read: what flavor of authority the caller wants.
 */
export enum L6ReadMode {
  CURRENT_AUTHORITATIVE = 'CURRENT_AUTHORITATIVE',
  HISTORICAL = 'HISTORICAL',
  REPLAY_TAGGED = 'REPLAY_TAGGED',
  REPAIRED_REMATERIALIZED = 'REPAIRED_REMATERIALIZED',
  EVIDENCE_LOOKUP = 'EVIDENCE_LOOKUP',
  LINEAGE_LOOKUP = 'LINEAGE_LOOKUP',
}

export const ALL_READ_MODES: readonly L6ReadMode[] = Object.values(L6ReadMode);

/**
 * §6.7.6.3, §6.7.6.5 — Current snapshot row shape (both feature and event).
 */
export interface L6CurrentFeatureSnapshotRow {
  readonly feature_id: string;
  readonly feature_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly effective_at: string;
  readonly validity_state: string;
  readonly quality_state: string;
  readonly confidence_band: string;
  readonly freshness_state: string;
  readonly null_state: string;
  readonly late_data_class: string;
  readonly evidence_pack_ref: string | null;
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export interface L6ActiveEventRow {
  readonly event_instance_id: string;
  readonly event_id: string;
  readonly event_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly lifecycle_state: string;
  readonly severity_band: string;
  readonly confidence_band: string;
  readonly dedupe_key: string;
  readonly suppression_group: string | null;
  readonly evidence_pack_ref: string | null;
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

/**
 * §6.7.6.4, §6.7.6.6 — Historical row shape. Every historical row carries a
 * historical surface class; ambiguous-class rows are illegal.
 */
export interface L6HistoricalFeatureRow {
  readonly feature_id: string;
  readonly feature_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly window_start: string | null;
  readonly window_end: string | null;
  readonly baseline_ref: string | null;
  readonly surface_class: L6HistoricalSurfaceClass;
  readonly validity_state: string;
  readonly quality_state: string;
  readonly evidence_pack_ref: string | null;
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export interface L6HistoricalEventRow {
  readonly event_instance_id: string;
  readonly event_id: string;
  readonly transition_id: string;
  readonly prior_state: string;
  readonly new_state: string;
  readonly transitioned_at: string;
  readonly surface_class: L6HistoricalSurfaceClass;
  readonly evidence_pack_ref: string | null;
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

/**
 * §6.7.6.9 — Recompute lineage view.
 */
export interface L6ComputeRunLineage {
  readonly compute_run_id: string;
  readonly mode: string;
  readonly trigger_source: string;
  readonly parent_run_id: string | null;
  readonly definition_version_set: readonly string[];
  readonly affected_scopes: readonly string[];
  readonly outputs_emitted: number;
  readonly failures: number;
  readonly evidence_refs: readonly string[];
  readonly started_at: string;
  readonly completed_at: string | null;
}

/**
 * §6.7.6.3, §6.7.6.4, §6.7.6.5, §6.7.6.6, §6.7.6.7, §6.7.6.8, §6.7.6.9 —
 * Typed request shapes for each read surface.
 */
export interface L6CurrentFeatureSnapshotRequest {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly feature_ids?: readonly string[];
  readonly as_of_hint?: string;
}

export interface L6FeatureHistoryRequest {
  readonly feature_id: string;
  readonly feature_version?: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly limit?: number;
  readonly surface_class?: L6HistoricalSurfaceClass;
}

export interface L6ActiveEventsRequest {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly event_family?: string;
}

export interface L6EventHistoryRequest {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly event_id?: string;
  readonly surface_class?: L6HistoricalSurfaceClass;
}

export interface L6FeatureEvidenceBundleRequest {
  readonly feature_id: string;
  readonly feature_version?: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
}

export interface L6EventEvidencePackRequest {
  readonly event_instance_id: string;
  readonly lifecycle_state?: string;
}

export interface L6ComputeRunLineageRequest {
  readonly compute_run_id: string;
}

/**
 * §6.7.7.1, §6.7.7.4 — Allowed consumer surfaces per caller class. Later
 * layers may only consume through governed read surfaces; raw historical
 * tables and ad-hoc recomputes are forbidden.
 */
export enum L6ConsumerClass {
  LATER_LAYER = 'LATER_LAYER',
  LAYER_6_INTERNAL = 'LAYER_6_INTERNAL',
  GOVERNED_AUDIT = 'GOVERNED_AUDIT',
  REPLAY_RUNNER = 'REPLAY_RUNNER',
  REPAIR_RUNNER = 'REPAIR_RUNNER',
}

export const ALL_CONSUMER_CLASSES: readonly L6ConsumerClass[] =
  Object.values(L6ConsumerClass);

/**
 * §6.7.7.4 — Raw-storage surface names that later layers may not consume
 * as their primary read path. These are the shapes governed by L5 physical.
 */
export const PROHIBITED_RAW_STORAGE_SURFACES: readonly string[] = Object.freeze([
  'ts_feature_fact_v1',
  'ts_event_fact_v1',
  'ts_event_transition_v1',
  'ts_ohlcv_bar_v1',
  'ts_numeric_fact_v1',
  'ts_score_history_v1',
]);
