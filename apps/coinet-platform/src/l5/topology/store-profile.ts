/**
 * L5.3 Multi-store Architecture — Store Profiles
 *
 * §5.3.3 — Reference Production Stack
 * §5.3.4 — Reference Topology Shape
 *
 * Each store kind occupies exactly one architectural plane.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum L5StoreKind {
  POSTGRES = 'POSTGRES',
  CLICKHOUSE = 'CLICKHOUSE',
  REDIS = 'REDIS',
  OBJECT_STORAGE = 'OBJECT_STORAGE',
}

export enum L5StorePlane {
  /** Durable relational authority and operational state. */
  AUTHORITY = 'AUTHORITY',
  /** Time-series and historical numerical state. */
  ANALYTICAL = 'ANALYTICAL',
  /** Ephemeral execution and hot materialization state. */
  SPEED = 'SPEED',
  /** Immutable archives, replay artifacts, forensic bundles. */
  EVIDENCE = 'EVIDENCE',
}

export const ALL_STORE_KINDS: readonly L5StoreKind[] = [
  L5StoreKind.POSTGRES,
  L5StoreKind.CLICKHOUSE,
  L5StoreKind.REDIS,
  L5StoreKind.OBJECT_STORAGE,
];

export const ALL_STORE_PLANES: readonly L5StorePlane[] = [
  L5StorePlane.AUTHORITY,
  L5StorePlane.ANALYTICAL,
  L5StorePlane.SPEED,
  L5StorePlane.EVIDENCE,
];

// ═══════════════════════════════════════════════════════════════════════════════
// STORE PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5StoreProfile {
  readonly kind: L5StoreKind;
  readonly plane: L5StorePlane;
  readonly referenceVersion: string;
  readonly governs: string;
  readonly authoritativeFor: readonly string[];
  readonly forbiddenFor: readonly string[];
  readonly deploymentRequired: boolean;
  readonly referenceOnly: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

const POSTGRES_PROFILE: L5StoreProfile = {
  kind: L5StoreKind.POSTGRES,
  plane: L5StorePlane.AUTHORITY,
  referenceVersion: '16',
  governs: 'durable relational authority and operational state',
  authoritativeFor: [
    'canonical_projections', 'graph_metadata_pointers', 'watchlists',
    'score_registry', 'reports_registry', 'user_settings', 'audit_metadata',
    'write_manifests', 'outbox_jobs', 'archive_pointers', 'replay_coordination',
    'status_registries', 'coordination_metadata', 'durable_control_plane',
  ],
  forbiddenFor: [
    'dense_price_streams', 'large_append_only_scans', 'raw_bulky_archives',
    'high_rate_metric_telemetry',
  ],
  deploymentRequired: true,
  referenceOnly: false,
};

const CLICKHOUSE_PROFILE: L5StoreProfile = {
  kind: L5StoreKind.CLICKHOUSE,
  plane: L5StorePlane.ANALYTICAL,
  referenceVersion: '24.x',
  governs: 'analytical historical state',
  authoritativeFor: [
    'prices', 'ohlcv', 'oi_history', 'funding_history', 'tvl',
    'fees_revenue_history', 'sentiment_velocity', 'wallet_activity',
    'feature_histories', 'score_histories', 'analytical_backfills',
    'rollup_surfaces', 'replay_numerical_reads',
  ],
  forbiddenFor: [
    'canonical_identity_authority', 'manifests', 'user_settings',
    'report_registry_authority', 'archive_pointers_legal_control',
  ],
  deploymentRequired: true,
  referenceOnly: true,
};

const REDIS_PROFILE: L5StoreProfile = {
  kind: L5StoreKind.REDIS,
  plane: L5StorePlane.SPEED,
  referenceVersion: '7.x',
  governs: 'ephemeral execution state',
  authoritativeFor: [
    'hot_state', 'recent_event_windows', 'dedupe_tokens', 'alert_cooldowns',
    'active_trigger_state', 'temporary_feature_caches', 'context_package_caches',
    'near_now_hot_slices', 'execution_throttles', 'short_lived_coordination',
  ],
  forbiddenFor: [
    'durable_registry_truth', 'replay_lineage', 'canonical_current_state',
    'archive_evidence_truth', 'permanent_score_state',
  ],
  deploymentRequired: true,
  referenceOnly: false,
};

const OBJECT_STORAGE_PROFILE: L5StoreProfile = {
  kind: L5StoreKind.OBJECT_STORAGE,
  plane: L5StorePlane.EVIDENCE,
  referenceVersion: 'S3-compatible',
  governs: 'immutable evidence',
  authoritativeFor: [
    'raw_source_payloads', 'backfill_files', 'model_input_snapshots',
    'model_output_snapshots', 'reproducibility_logs', 'feature_snapshots',
    'explanation_bundles', 'report_renders', 'replay_bundles',
    'forensic_exports', 'cold_analytical_exports', 'bulky_immutable_artifacts',
  ],
  forbiddenFor: [
    'live_mutable_registries', 'hot_read_paths', 'operational_query_joins',
    'authority_bearing_current_rows',
  ],
  deploymentRequired: true,
  referenceOnly: false,
};

export const REFERENCE_STORE_PROFILES: Record<L5StoreKind, L5StoreProfile> = {
  [L5StoreKind.POSTGRES]: POSTGRES_PROFILE,
  [L5StoreKind.CLICKHOUSE]: CLICKHOUSE_PROFILE,
  [L5StoreKind.REDIS]: REDIS_PROFILE,
  [L5StoreKind.OBJECT_STORAGE]: OBJECT_STORAGE_PROFILE,
};

export function getStoreProfile(kind: L5StoreKind): L5StoreProfile {
  return REFERENCE_STORE_PROFILES[kind];
}

export function getStoreForPlane(plane: L5StorePlane): L5StoreKind {
  const entry = Object.values(REFERENCE_STORE_PROFILES).find(p => p.plane === plane);
  return entry!.kind;
}

export function getPlaneForStore(kind: L5StoreKind): L5StorePlane {
  return REFERENCE_STORE_PROFILES[kind].plane;
}
