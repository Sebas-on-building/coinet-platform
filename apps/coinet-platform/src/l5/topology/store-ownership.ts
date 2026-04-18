/**
 * L5.3 Multi-store Architecture — Store Ownership
 *
 * §5.3.6 — Store Ownership Split
 *
 * Maps L5.2 sovereignty into concrete data-class ownership per store.
 */

import { L5StoreKind } from './store-profile';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA CLASS OWNERSHIP
// ═══════════════════════════════════════════════════════════════════════════════

export type DataClassOwnership = 'OWNS' | 'FORBIDDEN' | 'PROJECTION_ONLY';

export interface OwnershipEntry {
  readonly dataClass: string;
  readonly ownership: DataClassOwnership;
}

const POSTGRES_OWNS: readonly string[] = [
  'canonical_entity_projection', 'graph_metadata_pointer', 'watchlist',
  'score_registry', 'report_registry', 'user_settings', 'audit_metadata',
  'write_manifest', 'outbox_job', 'archive_pointer', 'replay_coordination',
  'status_registry', 'coordination_metadata', 'control_plane_state',
];

const POSTGRES_FORBIDDEN: readonly string[] = [
  'dense_price_stream', 'large_append_only_scan', 'raw_bulky_archive',
  'high_rate_metric_telemetry',
];

const CLICKHOUSE_OWNS: readonly string[] = [
  'price_history', 'ohlcv', 'oi_history', 'funding_history', 'tvl_history',
  'fee_revenue_history', 'sentiment_velocity', 'wallet_activity_counter',
  'feature_history', 'score_history', 'analytical_backfill',
  'rollup_surface', 'replay_numerical_read',
];

const CLICKHOUSE_FORBIDDEN: readonly string[] = [
  'canonical_identity_authority', 'manifests', 'user_settings',
  'report_registry_authority', 'archive_pointer_control',
];

const REDIS_OWNS: readonly string[] = [
  'hot_metric_snapshot', 'recent_event_window', 'dedupe_token',
  'alert_cooldown', 'active_trigger_state', 'temporary_feature_cache',
  'context_package_cache', 'near_now_hot_slice', 'execution_throttle',
  'short_lived_coordination',
];

const REDIS_FORBIDDEN: readonly string[] = [
  'durable_registry_truth', 'replay_lineage', 'canonical_current_state',
  'archive_evidence_truth', 'permanent_score_state',
];

const OBJECT_STORAGE_OWNS: readonly string[] = [
  'raw_source_payload', 'backfill_file', 'model_input_snapshot',
  'model_output_snapshot', 'reproducibility_log', 'feature_snapshot_bundle',
  'explanation_bundle', 'report_render', 'replay_bundle',
  'forensic_export', 'cold_analytical_export', 'bulky_immutable_artifact',
];

const OBJECT_STORAGE_FORBIDDEN: readonly string[] = [
  'live_mutable_registry', 'hot_read_path', 'operational_query_join',
  'authority_bearing_current_row',
];

const OWNERSHIP_MAP: Record<L5StoreKind, { owns: readonly string[]; forbidden: readonly string[] }> = {
  [L5StoreKind.POSTGRES]: { owns: POSTGRES_OWNS, forbidden: POSTGRES_FORBIDDEN },
  [L5StoreKind.CLICKHOUSE]: { owns: CLICKHOUSE_OWNS, forbidden: CLICKHOUSE_FORBIDDEN },
  [L5StoreKind.REDIS]: { owns: REDIS_OWNS, forbidden: REDIS_FORBIDDEN },
  [L5StoreKind.OBJECT_STORAGE]: { owns: OBJECT_STORAGE_OWNS, forbidden: OBJECT_STORAGE_FORBIDDEN },
};

export function getOwnedDataClasses(kind: L5StoreKind): readonly string[] {
  return OWNERSHIP_MAP[kind].owns;
}

export function getForbiddenDataClasses(kind: L5StoreKind): readonly string[] {
  return OWNERSHIP_MAP[kind].forbidden;
}

export function classifyDataClassOwnership(kind: L5StoreKind, dataClass: string): DataClassOwnership {
  if (OWNERSHIP_MAP[kind].owns.includes(dataClass)) return 'OWNS';
  if (OWNERSHIP_MAP[kind].forbidden.includes(dataClass)) return 'FORBIDDEN';
  return 'PROJECTION_ONLY';
}
