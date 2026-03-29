/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ROUTING MODES — Operational Doctrine (Section 4.2)                        ║
 * ║                                                                               ║
 * ║   Defines formal execution classes: not transport labels but contracts for   ║
 * ║   urgency, freshness, cost, isolation, degradation, and downstream meaning.   ║
 * ║   See ROUTING_MODES_DOCTRINE.md for the full prose specification.             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  RoutingMode,
  RoutingModeContract,
  ConnectorCategory,
  IngressOrigin,
  FallbackStatus,
  FreshnessBucket,
  ModeOperationalFlags,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY → MODE (default when connector does not override routing_mode)
// ═══════════════════════════════════════════════════════════════════════════════

export const CATEGORY_TO_MODE: Record<ConnectorCategory, RoutingMode> = {
  stream: 'realtime',
  polling: 'scheduled',
  triggered: 'on_demand',
  backfill: 'backfill',
};

/** Canonical mapping: routing mode ↔ ingress semantic class (4.2.3 Rule 1) */
export const ROUTING_MODE_TO_INGRESS_ORIGIN: Record<RoutingMode, IngressOrigin> = {
  realtime: 'stream_event',
  scheduled: 'periodic_fetch',
  on_demand: 'user_triggered',
  backfill: 'historical_replay',
};

export function getIngressOriginForRoutingMode(mode: RoutingMode): IngressOrigin {
  return ROUTING_MODE_TO_INGRESS_ORIGIN[mode];
}

/** Resolve ingress origin: explicit param wins only if consistent with mode (validator enforces). */
export function resolveIngressOrigin(
  mode: RoutingMode,
  override?: IngressOrigin,
): IngressOrigin {
  return override ?? getIngressOriginForRoutingMode(mode);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING MODE CONTRACTS — Full 4.2.2 / 4.2.3–4.2.6 operational doctrine
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
    retry_behavior:
      'At most one quick retry on transient failure; then mark degraded — do not block capture on deep retry chains.',
    fallback_behavior:
      'Prefer explicit temporal downgrade over silent cache; if substitute used, mark fallback_status and temporal_downgrade.',
    degradation_semantics:
      'Preserve last trusted state only if temporally acceptable; downgrade timing outputs; increase uncertainty; mark temporal degradation explicitly.',
    allowed_downstream_consumers: [
      'event_engine',
      'contradiction_engine',
      'timing_sequence_engine',
      'alerting',
      'judgment_refresh_triggers',
      'confidence_adjustments',
    ],
    forbidden_auto_triggers: [
      'expensive_full_recomputation_per_low_value_event',
      'unnecessary_narrative_reanalysis',
      'broad_historical_rebuilds',
    ],
  },
  scheduled: {
    mode: 'scheduled',
    latency_expectation_ms: 60_000,
    freshness_acceptable_buckets: ['live', 'fresh', 'acceptable'],
    retry_budget: 2,
    fallback_depth: 2,
    cache_permissible: true,
    downstream_priority: 2,
    retry_behavior:
      'Up to retry_budget attempts with backoff; respect provider rate limits and cadence tier.',
    fallback_behavior:
      'Provider chain per source doctrine; cached trusted state allowed when within acceptable periodic bounds.',
    degradation_semantics:
      'Preserve latest trusted snapshot if within tier bounds; mark snapshot age; reduce confidence if lag is material.',
    allowed_downstream_consumers: [
      'state_refresh',
      'feature_updates',
      'confidence_refresh',
      'hypothesis_refresh',
      'scenario_recalculation',
      'dashboard_views',
      'baseline_market_context',
    ],
  },
  on_demand: {
    mode: 'on_demand',
    latency_expectation_ms: 15_000,
    freshness_acceptable_buckets: ['live', 'fresh', 'acceptable'],
    retry_budget: 2,
    fallback_depth: 2,
    cache_permissible: false,
    downstream_priority: 3,
    retry_behavior:
      'Bounded retries within timeout ceiling; never unbounded recursive tool/API expansion.',
    fallback_behavior:
      'Narrowest sufficient scope first; partial completion must be explicit — no fake completeness.',
    degradation_semantics:
      'Return partial explicit analysis; identify missing dimensions; never imply full depth when not achieved.',
    allowed_downstream_consumers: [
      'full_judgment_generation',
      'deep_hypothesis_analysis',
      'comparative_reports',
      'ai_analysis_surfaces',
      'user_decision_support',
      'advanced_alert_inspection',
    ],
  },
  backfill: {
    mode: 'backfill',
    latency_expectation_ms: 300_000,
    freshness_acceptable_buckets: ['live', 'fresh', 'acceptable', 'stale', 'expired'],
    retry_budget: 3,
    fallback_depth: 3,
    cache_permissible: true,
    downstream_priority: 1,
    retry_behavior:
      'Higher retry budget for completeness; must not preempt realtime or interactive paths.',
    fallback_behavior:
      'Archival or slower paths allowed; outputs tagged historical_replay for calibration and audit only.',
    degradation_semantics:
      'If reconstruction incomplete, halt or mark replay invalid — never silently mix partial history into calibration.',
    allowed_downstream_consumers: [
      'calibration_jobs',
      'score_audits',
      'feature_recomputation',
      'historical_scenario_reconstruction',
      'evaluation_harnesses',
      'threshold_validation',
      'outcome_analytics',
    ],
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
  preserve_last_trusted: boolean;
  mark_temporal_downgrade: boolean;
}

export const MODE_DEGRADATION_POLICIES: Record<RoutingMode, ModeDegradationPolicy> = {
  realtime: {
    mode: 'realtime',
    actions: [
      'preserve_last_trusted',
      'downgrade_timing',
      'increase_uncertainty',
      'mark_temporal_degradation',
    ],
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
// ROUTING-MODE BOUNDARIES (4.2.7) — invalid mode confusion examples
// ═══════════════════════════════════════════════════════════════════════════════

export const ROUTING_MODE_BOUNDARIES: ReadonlyArray<{
  id: string;
  boundary: string;
  invalid_confusion_example: string;
}> = [
  {
    id: 'B1',
    boundary: 'Realtime is for perishable event truth.',
    invalid_confusion_example: 'Treating scheduled polling as live stream truth without downgrade.',
  },
  {
    id: 'B2',
    boundary: 'Scheduled is for periodic state maintenance.',
    invalid_confusion_example: 'Driving user-blocking low-latency UX from cron snapshots.',
  },
  {
    id: 'B3',
    boundary: 'On-demand is for contextual depth tied to explicit need.',
    invalid_confusion_example: 'On-demand drilldown triggering uncontrolled market-wide refresh.',
  },
  {
    id: 'B4',
    boundary: 'Backfill is for historical reconstruction and self-improvement.',
    invalid_confusion_example: 'Backfill flooding the same resources as live judgment.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION-READY ROUTING RULES (4.2.9)
// ═══════════════════════════════════════════════════════════════════════════════

export const PRODUCTION_ROUTING_RULES_4_2_9: ReadonlyArray<string> = [
  'Every ingress path must declare exactly one routing mode.',
  'Every routing mode must have explicit latency, freshness, retry, fallback, and degradation semantics.',
  'Higher-urgency modes must not be blocked by lower-urgency modes.',
  'Mode semantics must remain visible downstream (routing_mode, ingress_origin, mode_operational_flags).',
  'Historical, periodic, interactive, and event-driven truths must never be collapsed into one operational category.',
];

// ═══════════════════════════════════════════════════════════════════════════════
// READER EXECUTION DOCTRINE (4.2.12)
// ═══════════════════════════════════════════════════════════════════════════════

export const READER_EXECUTION_DOCTRINE_4_2_12: ReadonlyArray<string> = [
  'Define the four routing modes as formal execution classes.',
  'Assign every ingress path to exactly one mode.',
  'Define per-mode latency, freshness, fallback, and degradation rules.',
  'Ensure mode semantics remain visible downstream.',
  'Prevent mode confusion between live, periodic, interactive, and historical flows.',
  'Isolate high-urgency modes from lower-priority workloads.',
  'Audit every connector path to ensure it obeys its declared mode.',
];

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE: PROVIDER → EXPECTED MODE (documentation / audit checklist)
// ═══════════════════════════════════════════════════════════════════════════════

export const PROVIDER_ROUTING_MODE_REFERENCE: ReadonlyArray<{
  provider_pattern: string;
  expected_mode: RoutingMode;
  notes: string;
}> = [
  { provider_pattern: 'alchemy_webhook / quicknode_ws / coinglass_ws', expected_mode: 'realtime', notes: 'Event paths' },
  { provider_pattern: 'coingecko, coinmarketcap, defillama, geckoterminal, dexscreener, cryptopanic, lunarcrush', expected_mode: 'scheduled', notes: 'Polling / API refresh' },
  { provider_pattern: 'evidence_pack_drilldown / user_report', expected_mode: 'on_demand', notes: 'Explicit request' },
  { provider_pattern: 'calibration_replay / historical_series', expected_mode: 'backfill', notes: 'Replay & audit' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATIONAL FLAGS (4.2.5 Rule 5, 4.2.8)
// ═══════════════════════════════════════════════════════════════════════════════

export function computeModeOperationalFlags(params: {
  latency_ms: number;
  freshness_bucket: FreshnessBucket;
  routing_mode: RoutingMode;
  fallback_status: FallbackStatus;
}): ModeOperationalFlags {
  const contract = ROUTING_MODE_CONTRACTS[params.routing_mode];
  const latency_exceeds_contract = params.latency_ms > contract.latency_expectation_ms;
  const freshness_below_mode_standard = !contract.freshness_acceptable_buckets.includes(
    params.freshness_bucket,
  );

  const temporal_downgrade =
    params.routing_mode === 'realtime' &&
    (params.fallback_status === 'cached' ||
      params.fallback_status === 'fallback' ||
      params.fallback_status === 'degraded' ||
      freshness_below_mode_standard);

  return {
    latency_exceeds_contract,
    freshness_below_mode_standard,
    temporal_downgrade,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

export function getRoutingModeFromCategory(category: ConnectorCategory): RoutingMode {
  return CATEGORY_TO_MODE[category];
}

export function getRoutingModeContract(mode: RoutingMode): RoutingModeContract {
  return ROUTING_MODE_CONTRACTS[mode];
}

export function getModeDegradationPolicy(mode: RoutingMode): ModeDegradationPolicy {
  return MODE_DEGRADATION_POLICIES[mode];
}

export function isFreshnessAcceptableForMode(freshnessBucket: string, mode: RoutingMode): boolean {
  const contract = ROUTING_MODE_CONTRACTS[mode];
  return contract.freshness_acceptable_buckets.includes(freshnessBucket);
}

export function isLatencyDegradedForMode(latencyMs: number, mode: RoutingMode): boolean {
  const contract = ROUTING_MODE_CONTRACTS[mode];
  return latencyMs > contract.latency_expectation_ms;
}

/** Higher downstream_priority = more urgent (4.2.4 Rule 4 — scheduled yields to higher). */
export function compareModePriority(a: RoutingMode, b: RoutingMode): number {
  const pa = ROUTING_MODE_CONTRACTS[a].downstream_priority;
  const pb = ROUTING_MODE_CONTRACTS[b].downstream_priority;
  return pa - pb;
}

export function getModesByPriority(): RoutingMode[] {
  return (['realtime', 'on_demand', 'scheduled', 'backfill'] as RoutingMode[]).sort(
    (x, y) => compareModePriority(y, x),
  );
}

/**
 * Sort module names so higher routing urgency is first — use when scheduling or budgeting concurrent fetches
 * (4.2.4 Rule 4: scheduled must be preemptible by higher-priority modes).
 */
export function sortModulesByRoutingPriority(
  moduleNames: string[],
  getModeForModule: (moduleName: string) => RoutingMode,
): string[] {
  return [...moduleNames].sort(
    (a, b) => compareModePriority(getModeForModule(b), getModeForModule(a)),
  );
}

/** True if mode A must not starve mode B (B is higher priority than A). */
export function shouldPreemptScheduledForHigherModes(lower: RoutingMode, higher: RoutingMode): boolean {
  return compareModePriority(higher, lower) > 0;
}
