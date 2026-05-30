/**
 * L14.8 — Read Surface Contracts
 *
 * §14.8.17 / §14.8.18 / §14.8.19 / §14.8.20 / §14.8.21 / §14.8.22
 */

import { L14DeliveryChannel } from './delivery-channel';

export enum L14ReadSurfaceId {
  DELIVERY_HISTORY_BY_USER_CHANNEL_WINDOW = 'DELIVERY_HISTORY_BY_USER_CHANNEL_WINDOW',
  ALERT_PERFORMANCE_BY_CLASS = 'ALERT_PERFORMANCE_BY_CLASS',
  IGNORED_ALERT_RATE_BY_CLASS_REGIME = 'IGNORED_ALERT_RATE_BY_CLASS_REGIME',
  WATCHLIST_SAVE_RATE_BY_ALERT_OR_REPORT_TYPE = 'WATCHLIST_SAVE_RATE_BY_ALERT_OR_REPORT_TYPE',
  CALIBRATION_EVIDENCE_BY_LAYER_SUBJECT_REGIME = 'CALIBRATION_EVIDENCE_BY_LAYER_SUBJECT_REGIME',
  CALIBRATION_PROPOSAL_QUEUE = 'CALIBRATION_PROPOSAL_QUEUE',
  DELIVERY_SUPPRESSION_HISTORY = 'DELIVERY_SUPPRESSION_HISTORY',
  CHANNEL_HEALTH = 'CHANNEL_HEALTH',
  USER_PREFERENCE_IMPACT = 'USER_PREFERENCE_IMPACT',
  OUTCOME_EVALUATION_HISTORY = 'OUTCOME_EVALUATION_HISTORY',
  FALSE_POSITIVE_ANALYSIS = 'FALSE_POSITIVE_ANALYSIS',
  CONFIDENCE_ACCURACY_DASHBOARD = 'CONFIDENCE_ACCURACY_DASHBOARD',
}
export const ALL_L14_READ_SURFACES: readonly L14ReadSurfaceId[] =
  Object.values(L14ReadSurfaceId);

export enum L14ReadMode {
  CURRENT_REGISTRY = 'CURRENT_REGISTRY',
  HISTORICAL_WINDOW = 'HISTORICAL_WINDOW',
  DERIVED_ANALYTICAL_VIEW = 'DERIVED_ANALYTICAL_VIEW',
  AUDIT_TRACE_VIEW = 'AUDIT_TRACE_VIEW',
  REPLAY_TRACE_VIEW = 'REPLAY_TRACE_VIEW',
  REPAIR_DIAGNOSTIC_VIEW = 'REPAIR_DIAGNOSTIC_VIEW',
}

export enum L14ReadConsumerClass {
  INTERNAL_ANALYST_CONSOLE = 'INTERNAL_ANALYST_CONSOLE',
  DELIVERY_POLICY_ENGINE = 'DELIVERY_POLICY_ENGINE',
  CALIBRATION_EVIDENCE_ENGINE = 'CALIBRATION_EVIDENCE_ENGINE',
  CALIBRATION_PROPOSAL_ENGINE = 'CALIBRATION_PROPOSAL_ENGINE',
  CHANNEL_HEALTH_MONITOR = 'CHANNEL_HEALTH_MONITOR',
  ADMIN_AUDIT_CONSOLE = 'ADMIN_AUDIT_CONSOLE',
  PRODUCT_OBSERVABILITY_API = 'PRODUCT_OBSERVABILITY_API',
}

export enum L14ReadCompletenessClass {
  COMPLETE = 'COMPLETE',
  COMPLETE_WITH_LIMITATIONS = 'COMPLETE_WITH_LIMITATIONS',
  PARTIAL_HISTORY_WINDOW = 'PARTIAL_HISTORY_WINDOW',
  PARTIAL_DERIVED_FACT_GAP = 'PARTIAL_DERIVED_FACT_GAP',
  BLOCKED_INSUFFICIENT_AUTHORITY = 'BLOCKED_INSUFFICIENT_AUTHORITY',
}

export enum L14ReadFreshnessClass {
  CURRENT = 'CURRENT',
  RECENT_DERIVED = 'RECENT_DERIVED',
  HISTORICAL_WINDOW_BOUND = 'HISTORICAL_WINDOW_BOUND',
  STALE_DERIVED = 'STALE_DERIVED',
  UNKNOWN = 'UNKNOWN',
}

export interface L14ReadRequest {
  readonly read_request_id: string;
  readonly read_surface_id: L14ReadSurfaceId;
  readonly read_mode: L14ReadMode;
  readonly consumer_class: L14ReadConsumerClass;
  readonly user_scope_ref?: string;
  readonly channel_filter?: L14DeliveryChannel;
  readonly alert_class_filter?: string;
  readonly regime_filter?: string;
  readonly subject_ref_filter?: string;
  readonly time_window_start?: string;
  readonly time_window_end?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14GovernedReadResult<T> {
  readonly read_result_id: string;
  readonly read_request_ref: string;
  readonly read_surface_id: L14ReadSurfaceId;
  readonly result_rows: readonly T[];
  readonly result_completeness: L14ReadCompletenessClass;
  readonly result_freshness: L14ReadFreshnessClass;
  readonly cache_authoritative: false;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
