/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ROUTING MODES — Formal Execution Classes (4.2)                            ║
 * ║                                                                               ║
 * ║   Routing mode determines the operational contract of an ingress path.        ║
 * ║   Different observations enter Coinet under radically different conditions:  ║
 * ║     - some are perishable and must arrive immediately (realtime)               ║
 * ║     - some are periodic and refreshable on a schedule (scheduled)             ║
 * ║     - some are only worth fetching when explicitly asked (on_demand)           ║
 * ║     - some belong to historical reconstruction (backfill)                     ║
 * ║                                                                               ║
 * ║   These are not interchangeable. Each solves a different class of problem.   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { RoutingMode, RoutingModeContract, ConnectorCategory } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY → MODE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export const CATEGORY_TO_MODE: Record<ConnectorCategory, RoutingMode> = {
  stream: 'realtime',
  polling: 'scheduled',
  triggered: 'on_demand',
  backfill: 'backfill',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING MODE CONTRACTS — Per-mode operational doctrine
// ═══════════════════════════════════════════════════════════════════════════════

export const ROUTING_MODE_CONTRACTS: Record<RoutingMode, RoutingModeContract> = {
  realtime: {
    mode: 'realtime',
    latency_expectation_ms: 5_000,
    freshness_acceptable_buckets: ['live', 'fresh'],
    retry_budget: 1,
    fallback_depth: 1,
    cache_permissible: false,
    downstream_priority: 4,
  },
  scheduled: {
    mode: 'scheduled',
    latency_expectation_ms: 60_000,
    freshness_acceptable_buckets: ['live', 'fresh', 'acceptable'],
    retry_budget: 2,
    fallback_depth: 2,
    cache_permissible: true,
    downstream_priority: 2,
  },
  on_demand: {
    mode: 'on_demand',
    latency_expectation_ms: 15_000,
    freshness_acceptable_buckets: ['live', 'fresh', 'acceptable'],
    retry_budget: 2,
    fallback_depth: 2,
    cache_permissible: false,
    downstream_priority: 3,
  },
  backfill: {
    mode: 'backfill',
    latency_expectation_ms: 300_000,
    freshness_acceptable_buckets: ['live', 'fresh', 'acceptable', 'stale', 'expired'],
    retry_budget: 3,
    fallback_depth: 3,
    cache_permissible: true,
    downstream_priority: 1,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODE-SPECIFIC DEGRADED BEHAVIOR (4.2.8)
// ═══════════════════════════════════════════════════════════════════════════════

export type DegradationAction =
  | 'preserve_last_trusted'
  | 'downgrade_timing'
  | 'increase_uncertainty'
  | 'mark_temporal_degradation'
  | 'mark_snapshot_age'
  | 'reduce_confidence'
  | 'return_partial_explicit'
  | 'identify_missing_dimensions'
  | 'halt_or_mark_invalid';

export interface ModeDegradationPolicy {
  mode: RoutingMode;
  actions: DegradationAction[];
  /** Whether to preserve last trusted state */
  preserve_last_trusted: boolean;
  /** Whether to explicitly mark temporal downgrade */
  mark_temporal_downgrade: boolean;
}

export const MODE_DEGRADATION_POLICIES: Record<RoutingMode, ModeDegradationPolicy> = {
  realtime: {
    mode: 'realtime',
    actions: ['preserve_last_trusted', 'downgrade_timing', 'increase_uncertainty', 'mark_temporal_degradation'],
    preserve_last_trusted: true,
    mark_temporal_downgrade: true,
  },
  scheduled: {
    mode: 'scheduled',
    actions: ['preserve_last_trusted', 'mark_snapshot_age', 'reduce_confidence'],
    preserve_last_trusted: true,
    mark_temporal_downgrade: true,
  },
  on_demand: {
    mode: 'on_demand',
    actions: ['return_partial_explicit', 'identify_missing_dimensions'],
    preserve_last_trusted: false,
    mark_temporal_downgrade: true,
  },
  backfill: {
    mode: 'backfill',
    actions: ['halt_or_mark_invalid'],
    preserve_last_trusted: false,
    mark_temporal_downgrade: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get routing mode from connector category.
 */
export function getRoutingModeFromCategory(category: ConnectorCategory): RoutingMode {
  return CATEGORY_TO_MODE[category];
}

/**
 * Get the formal contract for a routing mode.
 */
export function getRoutingModeContract(mode: RoutingMode): RoutingModeContract {
  return ROUTING_MODE_CONTRACTS[mode];
}

/**
 * Get mode-specific degradation policy.
 */
export function getModeDegradationPolicy(mode: RoutingMode): ModeDegradationPolicy {
  return MODE_DEGRADATION_POLICIES[mode];
}

/**
 * Check if freshness bucket is acceptable for a given routing mode.
 */
export function isFreshnessAcceptableForMode(
  freshnessBucket: string,
  mode: RoutingMode,
): boolean {
  const contract = ROUTING_MODE_CONTRACTS[mode];
  return contract.freshness_acceptable_buckets.includes(freshnessBucket);
}

/**
 * Check if latency exceeds mode expectation (degraded).
 */
export function isLatencyDegradedForMode(latencyMs: number, mode: RoutingMode): boolean {
  const contract = ROUTING_MODE_CONTRACTS[mode];
  return latencyMs > contract.latency_expectation_ms;
}

/**
 * Compare routing modes by priority (higher = more urgent).
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareModePriority(a: RoutingMode, b: RoutingMode): number {
  const pa = ROUTING_MODE_CONTRACTS[a].downstream_priority;
  const pb = ROUTING_MODE_CONTRACTS[b].downstream_priority;
  return pa - pb;
}

/**
 * Get all routing modes in priority order (highest first).
 */
export function getModesByPriority(): RoutingMode[] {
  return (['realtime', 'on_demand', 'scheduled', 'backfill'] as RoutingMode[]).sort(
    (a, b) => compareModePriority(b, a),
  );
}
