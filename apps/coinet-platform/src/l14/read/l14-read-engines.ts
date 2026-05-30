/**
 * L14.8 — Read Surface Registry and Read Engines
 *
 * §14.8.17–§14.8.25
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  ALL_L14_READ_SURFACES,
  L14ReadCompletenessClass,
  L14ReadConsumerClass,
  L14ReadFreshnessClass,
  L14ReadMode,
  L14ReadSurfaceId,
  type L14GovernedReadResult,
  type L14ReadRequest,
} from '../contracts/l14-read-surfaces';

const POLICY_V = 'l14.persistence.v1';

// ── Surface descriptor ────────────────────────────────────────────

export interface L14ReadSurfaceDescriptor {
  readonly surface_id: L14ReadSurfaceId;
  readonly allowed_modes: readonly L14ReadMode[];
  readonly allowed_consumers: readonly L14ReadConsumerClass[];
  readonly default_freshness: L14ReadFreshnessClass;
  readonly current_registry_backed: boolean;
  readonly history_backed: boolean;
  readonly masks_raw_identifiers: boolean;
  readonly policy_version: string;
}

const READ_REGISTRY: Readonly<Record<L14ReadSurfaceId, L14ReadSurfaceDescriptor>> = {
  [L14ReadSurfaceId.DELIVERY_HISTORY_BY_USER_CHANNEL_WINDOW]: {
    surface_id: L14ReadSurfaceId.DELIVERY_HISTORY_BY_USER_CHANNEL_WINDOW,
    allowed_modes: [L14ReadMode.HISTORICAL_WINDOW, L14ReadMode.AUDIT_TRACE_VIEW],
    allowed_consumers: [L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE, L14ReadConsumerClass.ADMIN_AUDIT_CONSOLE],
    default_freshness: L14ReadFreshnessClass.HISTORICAL_WINDOW_BOUND,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: true,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.ALERT_PERFORMANCE_BY_CLASS]: {
    surface_id: L14ReadSurfaceId.ALERT_PERFORMANCE_BY_CLASS,
    allowed_modes: [L14ReadMode.CURRENT_REGISTRY, L14ReadMode.DERIVED_ANALYTICAL_VIEW, L14ReadMode.HISTORICAL_WINDOW],
    allowed_consumers: [
      L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE,
      L14ReadConsumerClass.CALIBRATION_EVIDENCE_ENGINE,
      L14ReadConsumerClass.DELIVERY_POLICY_ENGINE,
      L14ReadConsumerClass.PRODUCT_OBSERVABILITY_API,
    ],
    default_freshness: L14ReadFreshnessClass.CURRENT,
    current_registry_backed: true, history_backed: true, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.IGNORED_ALERT_RATE_BY_CLASS_REGIME]: {
    surface_id: L14ReadSurfaceId.IGNORED_ALERT_RATE_BY_CLASS_REGIME,
    allowed_modes: [L14ReadMode.DERIVED_ANALYTICAL_VIEW, L14ReadMode.HISTORICAL_WINDOW],
    allowed_consumers: [L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE, L14ReadConsumerClass.CALIBRATION_EVIDENCE_ENGINE],
    default_freshness: L14ReadFreshnessClass.RECENT_DERIVED,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.WATCHLIST_SAVE_RATE_BY_ALERT_OR_REPORT_TYPE]: {
    surface_id: L14ReadSurfaceId.WATCHLIST_SAVE_RATE_BY_ALERT_OR_REPORT_TYPE,
    allowed_modes: [L14ReadMode.DERIVED_ANALYTICAL_VIEW, L14ReadMode.HISTORICAL_WINDOW],
    allowed_consumers: [L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE, L14ReadConsumerClass.CALIBRATION_EVIDENCE_ENGINE],
    default_freshness: L14ReadFreshnessClass.RECENT_DERIVED,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.CALIBRATION_EVIDENCE_BY_LAYER_SUBJECT_REGIME]: {
    surface_id: L14ReadSurfaceId.CALIBRATION_EVIDENCE_BY_LAYER_SUBJECT_REGIME,
    allowed_modes: [L14ReadMode.HISTORICAL_WINDOW, L14ReadMode.DERIVED_ANALYTICAL_VIEW],
    allowed_consumers: [
      L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE,
      L14ReadConsumerClass.CALIBRATION_PROPOSAL_ENGINE,
    ],
    default_freshness: L14ReadFreshnessClass.HISTORICAL_WINDOW_BOUND,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.CALIBRATION_PROPOSAL_QUEUE]: {
    surface_id: L14ReadSurfaceId.CALIBRATION_PROPOSAL_QUEUE,
    allowed_modes: [L14ReadMode.CURRENT_REGISTRY],
    allowed_consumers: [L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE, L14ReadConsumerClass.CALIBRATION_PROPOSAL_ENGINE],
    default_freshness: L14ReadFreshnessClass.CURRENT,
    current_registry_backed: true, history_backed: false, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.DELIVERY_SUPPRESSION_HISTORY]: {
    surface_id: L14ReadSurfaceId.DELIVERY_SUPPRESSION_HISTORY,
    allowed_modes: [L14ReadMode.HISTORICAL_WINDOW, L14ReadMode.AUDIT_TRACE_VIEW],
    allowed_consumers: [L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE, L14ReadConsumerClass.ADMIN_AUDIT_CONSOLE],
    default_freshness: L14ReadFreshnessClass.HISTORICAL_WINDOW_BOUND,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: true,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.CHANNEL_HEALTH]: {
    surface_id: L14ReadSurfaceId.CHANNEL_HEALTH,
    allowed_modes: [L14ReadMode.CURRENT_REGISTRY, L14ReadMode.HISTORICAL_WINDOW],
    allowed_consumers: [L14ReadConsumerClass.CHANNEL_HEALTH_MONITOR, L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE],
    default_freshness: L14ReadFreshnessClass.CURRENT,
    current_registry_backed: true, history_backed: true, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.USER_PREFERENCE_IMPACT]: {
    surface_id: L14ReadSurfaceId.USER_PREFERENCE_IMPACT,
    allowed_modes: [L14ReadMode.DERIVED_ANALYTICAL_VIEW, L14ReadMode.HISTORICAL_WINDOW],
    allowed_consumers: [L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE, L14ReadConsumerClass.DELIVERY_POLICY_ENGINE],
    default_freshness: L14ReadFreshnessClass.RECENT_DERIVED,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: true,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.OUTCOME_EVALUATION_HISTORY]: {
    surface_id: L14ReadSurfaceId.OUTCOME_EVALUATION_HISTORY,
    allowed_modes: [L14ReadMode.HISTORICAL_WINDOW, L14ReadMode.DERIVED_ANALYTICAL_VIEW],
    allowed_consumers: [
      L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE,
      L14ReadConsumerClass.CALIBRATION_EVIDENCE_ENGINE,
    ],
    default_freshness: L14ReadFreshnessClass.HISTORICAL_WINDOW_BOUND,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.FALSE_POSITIVE_ANALYSIS]: {
    surface_id: L14ReadSurfaceId.FALSE_POSITIVE_ANALYSIS,
    allowed_modes: [L14ReadMode.DERIVED_ANALYTICAL_VIEW, L14ReadMode.HISTORICAL_WINDOW],
    allowed_consumers: [L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE, L14ReadConsumerClass.CALIBRATION_EVIDENCE_ENGINE],
    default_freshness: L14ReadFreshnessClass.RECENT_DERIVED,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
  [L14ReadSurfaceId.CONFIDENCE_ACCURACY_DASHBOARD]: {
    surface_id: L14ReadSurfaceId.CONFIDENCE_ACCURACY_DASHBOARD,
    allowed_modes: [L14ReadMode.DERIVED_ANALYTICAL_VIEW, L14ReadMode.HISTORICAL_WINDOW],
    allowed_consumers: [L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE, L14ReadConsumerClass.PRODUCT_OBSERVABILITY_API],
    default_freshness: L14ReadFreshnessClass.RECENT_DERIVED,
    current_registry_backed: false, history_backed: true, masks_raw_identifiers: false,
    policy_version: POLICY_V,
  },
};

export function getL14ReadSurfaceDescriptor(id: L14ReadSurfaceId): L14ReadSurfaceDescriptor | undefined {
  return READ_REGISTRY[id];
}

export function getAllL14ReadSurfaceDescriptors(): readonly L14ReadSurfaceDescriptor[] {
  return ALL_L14_READ_SURFACES.map(s => READ_REGISTRY[s]);
}

export function isL14ReadSurfaceRegistered(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(READ_REGISTRY, id);
}

export function admitL14ReadRequest(request: L14ReadRequest): { admitted: boolean; reason?: string } {
  const desc = READ_REGISTRY[request.read_surface_id];
  if (!desc) return { admitted: false, reason: 'unknown_read_surface' };
  if (!desc.allowed_modes.includes(request.read_mode)) return { admitted: false, reason: 'mode_not_allowed' };
  if (!desc.allowed_consumers.includes(request.consumer_class)) return { admitted: false, reason: 'consumer_not_allowed' };
  return { admitted: true };
}

// ── Read request builder ─────────────────────────────────────────

export interface L14ReadRequestInput {
  readonly read_surface_id: L14ReadSurfaceId;
  readonly read_mode: L14ReadMode;
  readonly consumer_class: L14ReadConsumerClass;
  readonly user_scope_ref?: string;
  readonly channel_filter?: L14ReadRequest['channel_filter'];
  readonly alert_class_filter?: string;
  readonly regime_filter?: string;
  readonly subject_ref_filter?: string;
  readonly time_window_start?: string;
  readonly time_window_end?: string;
}

export function buildL14ReadRequest(input: L14ReadRequestInput): L14ReadRequest {
  const id = `l14.read.req.${fnv1a([
    input.read_surface_id, input.read_mode, input.consumer_class,
    input.user_scope_ref ?? '', input.channel_filter ?? '', input.alert_class_filter ?? '',
    input.regime_filter ?? '', input.subject_ref_filter ?? '',
    input.time_window_start ?? '', input.time_window_end ?? '', POLICY_V,
  ].join('|'))}`;
  return {
    read_request_id: id,
    read_surface_id: input.read_surface_id,
    read_mode: input.read_mode,
    consumer_class: input.consumer_class,
    user_scope_ref: input.user_scope_ref,
    channel_filter: input.channel_filter,
    alert_class_filter: input.alert_class_filter,
    regime_filter: input.regime_filter,
    subject_ref_filter: input.subject_ref_filter,
    time_window_start: input.time_window_start,
    time_window_end: input.time_window_end,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Result builder ───────────────────────────────────────────────

export function buildL14GovernedReadResult<T>(input: {
  request: L14ReadRequest;
  rows: readonly T[];
  completeness: L14ReadCompletenessClass;
  freshness: L14ReadFreshnessClass;
}): L14GovernedReadResult<T> {
  const replayHash = fnv1a([
    input.request.read_request_id, input.request.read_surface_id,
    String(input.rows.length), input.completeness, input.freshness, POLICY_V,
  ].join('|'));
  return {
    read_result_id: `l14.read.result.${replayHash}`,
    read_request_ref: input.request.read_request_id,
    read_surface_id: input.request.read_surface_id,
    result_rows: input.rows,
    result_completeness: input.completeness,
    result_freshness: input.freshness,
    cache_authoritative: false,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
