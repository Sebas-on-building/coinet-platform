/**
 * L2.3 — Routing Constitution
 *
 * For each route mode: optimization priority order, latency expectations,
 * degradation semantics, allowed consumers, restoration requirements,
 * failover legality, non-goals, and route-specific blind spots.
 *
 * This is the constitutional source of truth for route rights.
 */

import type {
  L23RouteMode, RouteConsumer, CostToleranceMode, LatencyBands,
  RouteBlindSpot, DegradationSemantic, RouteProbationState,
} from './routing-mode-types';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE MODE CONSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteModeConstitution {
  mode: L23RouteMode;
  purpose: string;
  primaryOptimizationRight: string;
  secondaryOptimizationRights: string[];
  explicitNonGoals: string[];

  defaultCostTolerance: CostToleranceMode;
  latencyBands: LatencyBands;

  allowedConsumers: RouteConsumer[];
  conditionalConsumers: RouteConsumer[];
  prohibitedConsumers: RouteConsumer[];

  degradationSemantics: DegradationSemantic[];
  possibleBlindSpots: RouteBlindSpot[];

  restorationRequirements: string[];
  probationSequence: RouteProbationState[];
  restorationCleanWindowMs: number;
  restorationMaxFlapCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REALTIME CONSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export const REALTIME_CONSTITUTION: RouteModeConstitution = {
  mode: 'REALTIME',
  purpose: 'Deliver low-latency visibility for time-sensitive truths where ordering and immediacy matter',
  primaryOptimizationRight: 'FRESHNESS_FITNESS_FIRST',
  secondaryOptimizationRights: ['TRUTH_FIDELITY', 'SEQUENCE_INTEGRITY', 'RECONNECT_CONTINUITY'],
  explicitNonGoals: [
    'CHEAPEST_TRANSPORT',
    'BROADEST_HISTORICAL_COMPLETENESS',
    'RELAXED_SNAPSHOT_CONSISTENCY',
  ],

  defaultCostTolerance: 'TRUTH_FIRST',
  latencyBands: { goodMaxMs: 500, acceptableMaxMs: 2_000, degradedMaxMs: 10_000 },

  allowedConsumers: [
    'LIVE_SCORING', 'CONTRADICTION_ENGINE', 'SCENARIO_ENGINE',
    'ALERTING', 'DISPLAY', 'CANONICALIZATION',
  ],
  conditionalConsumers: ['REPLAY', 'CALIBRATION'],
  prohibitedConsumers: [],

  degradationSemantics: [
    'VISIBILITY_GAP', 'ORDERING_UNCERTAINTY', 'DUPLICATE_RISK',
    'SEQUENCE_CONTAMINATION', 'LIVE_CLAIM_RESTRICTION',
  ],
  possibleBlindSpots: [
    'ORDERING_GAP', 'EVENT_MISS', 'RECONNECT_UNCERTAINTY', 'DUPLICATE_BURST_CONTAMINATION',
  ],

  restorationRequirements: [
    'STABLE_RECONNECT_WINDOW',
    'LOW_DUPLICATE_BURST',
    'ACCEPTABLE_LAG_WINDOW',
    'NO_UNRESOLVED_ORDERING_GAP',
  ],
  probationSequence: ['RECOVERING_UNVERIFIED', 'RECOVERING_PROBATION', 'RECOVERED_LIMITED', 'RESTORED_PREFERRED'],
  restorationCleanWindowMs: 60_000,
  restorationMaxFlapCount: 3,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED CONSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export const SCHEDULED_CONSTITUTION: RouteModeConstitution = {
  mode: 'SCHEDULED',
  purpose: 'Provide stable, cadence-aligned visibility for truths that evolve slower and care more about reliable completeness',
  primaryOptimizationRight: 'TRUTH_FIDELITY_UNDER_CADENCE',
  secondaryOptimizationRights: ['COST_DISCIPLINE', 'SNAPSHOT_COMPLETENESS', 'OPERATIONAL_STABILITY'],
  explicitNonGoals: [
    'PRETEND_REALTIME',
    'EVENT_ORDER_EXACT',
    'OPTIMAL_FOR_LIVE_FRAGILITY_INFERENCE',
  ],

  defaultCostTolerance: 'BALANCED',
  latencyBands: { goodMaxMs: 5_000, acceptableMaxMs: 30_000, degradedMaxMs: 120_000 },

  allowedConsumers: [
    'CANONICALIZATION', 'DISPLAY', 'AUDIT', 'CALIBRATION',
  ],
  conditionalConsumers: ['LIVE_SCORING', 'CONTRADICTION_ENGINE', 'SCENARIO_ENGINE'],
  prohibitedConsumers: ['ALERTING'],

  degradationSemantics: [
    'CADENCE_MISS', 'PARTIAL_SNAPSHOT', 'DELAYED_RUN', 'STALE_CARRY_FORWARD',
  ],
  possibleBlindSpots: [
    'MISSED_INTERVAL', 'SNAPSHOT_CARRY_FORWARD', 'PARTIAL_METRIC_LAG',
  ],

  restorationRequirements: [
    'CADENCE_CONSISTENCY_RESTORED',
    'BACKLOG_CAUGHT_UP_OR_WAIVED',
    'SNAPSHOT_FRESHNESS_INSIDE_POLICY',
    'NO_UNRESOLVED_MISSING_INTERVAL',
  ],
  probationSequence: ['RECOVERING_UNVERIFIED', 'RECOVERING_PROBATION', 'RECOVERED_LIMITED', 'RESTORED_PREFERRED'],
  restorationCleanWindowMs: 300_000,
  restorationMaxFlapCount: 5,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ON-DEMAND CONSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export const ON_DEMAND_CONSTITUTION: RouteModeConstitution = {
  mode: 'ON_DEMAND',
  purpose: 'Support request-specific evidence acquisition where immediacy is contextual and depth may outrank continuous coverage',
  primaryOptimizationRight: 'REQUEST_FITNESS',
  secondaryOptimizationRights: ['EVIDENCE_PRECISION', 'USER_RELEVANCE', 'TARGETED_VERIFICATION'],
  explicitNonGoals: [
    'MASQUERADE_AS_CONTINUOUS_LIVE_COVERAGE',
    'SILENTLY_FILL_SYSTEMIC_MONITORING_GAPS',
    'HIDDEN_ALWAYS_ON_FALLBACK',
  ],

  defaultCostTolerance: 'BALANCED',
  latencyBands: { goodMaxMs: 10_000, acceptableMaxMs: 30_000, degradedMaxMs: 60_000 },

  allowedConsumers: [
    'DRILLDOWN_EXPLANATION', 'DISPLAY', 'AUDIT',
  ],
  conditionalConsumers: ['CONTRADICTION_ENGINE', 'LIVE_SCORING', 'SCENARIO_ENGINE'],
  prohibitedConsumers: [],

  degradationSemantics: [
    'TIMEOUT_INCOMPLETE', 'OWNER_UNAVAILABLE', 'CACHE_SUBSTITUTED', 'COST_CEILING_TRUNCATED',
  ],
  possibleBlindSpots: [
    'REQUEST_BOUNDED_INCOMPLETENESS', 'EVIDENCE_SET_TRUNCATION', 'CACHE_SUBSTITUTION',
  ],

  restorationRequirements: [
    'FAILURE_NO_LONGER_SYSTEMIC',
    'NO_DEPENDENCY_ABUSE_DETECTED',
  ],
  probationSequence: ['RECOVERING_UNVERIFIED', 'RECOVERED_LIMITED', 'RESTORED_PREFERRED'],
  restorationCleanWindowMs: 120_000,
  restorationMaxFlapCount: 10,
};

// ═══════════════════════════════════════════════════════════════════════════════
// BACKFILL CONSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export const BACKFILL_CONSTITUTION: RouteModeConstitution = {
  mode: 'BACKFILL',
  purpose: 'Reconstruct historically faithful ingress state without polluting live-route semantics',
  primaryOptimizationRight: 'DETERMINISTIC_REPRODUCIBILITY',
  secondaryOptimizationRights: ['ORDERING_CORRECTNESS', 'HISTORICAL_COMPLETENESS', 'REPLAY_SAFETY'],
  explicitNonGoals: [
    'SILENTLY_ENTER_LIVE_SCORING_AS_FRESH',
    'OVERWRITE_LIVE_ROUTE_WITHOUT_SUPERSESSION',
    'FAKE_REALTIME_RECENCY',
  ],

  defaultCostTolerance: 'RECOVERY_FIRST',
  latencyBands: { goodMaxMs: 60_000, acceptableMaxMs: 300_000, degradedMaxMs: 600_000 },

  allowedConsumers: [
    'REPLAY', 'AUDIT', 'CALIBRATION',
  ],
  conditionalConsumers: ['DISPLAY'],
  prohibitedConsumers: ['LIVE_SCORING', 'SCENARIO_ENGINE', 'CONTRADICTION_ENGINE', 'ALERTING'],

  degradationSemantics: [
    'HISTORICAL_GAP_DETECTED', 'REPLAY_VERSION_MISMATCH', 'ORDERING_UNRESOLVED',
  ],
  possibleBlindSpots: [
    'HISTORICAL_GAP', 'INCOMPLETE_REPLAY', 'CORRECTION_CHAIN_BREAK', 'ORDERING_APPROXIMATION',
  ],

  restorationRequirements: [
    'RECONSTRUCTION_VERIFIED',
    'HISTORICAL_COMPLETENESS_RESTORED',
  ],
  probationSequence: ['RECOVERING_UNVERIFIED', 'RECOVERED_LIMITED', 'RESTORED_PREFERRED'],
  restorationCleanWindowMs: 600_000,
  restorationMaxFlapCount: 3,
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const ROUTE_CONSTITUTIONS: Record<L23RouteMode, RouteModeConstitution> = {
  REALTIME: REALTIME_CONSTITUTION,
  SCHEDULED: SCHEDULED_CONSTITUTION,
  ON_DEMAND: ON_DEMAND_CONSTITUTION,
  BACKFILL: BACKFILL_CONSTITUTION,
};

export function getConstitution(mode: L23RouteMode): RouteModeConstitution {
  return ROUTE_CONSTITUTIONS[mode];
}

export function isConsumerAllowed(mode: L23RouteMode, consumer: RouteConsumer): boolean {
  const c = ROUTE_CONSTITUTIONS[mode];
  return c.allowedConsumers.includes(consumer);
}

export function isConsumerConditional(mode: L23RouteMode, consumer: RouteConsumer): boolean {
  const c = ROUTE_CONSTITUTIONS[mode];
  return c.conditionalConsumers.includes(consumer);
}

export function isConsumerProhibited(mode: L23RouteMode, consumer: RouteConsumer): boolean {
  const c = ROUTE_CONSTITUTIONS[mode];
  return c.prohibitedConsumers.includes(consumer);
}

export function getConsumerVerdict(mode: L23RouteMode, consumer: RouteConsumer): 'ALLOWED' | 'CONDITIONAL' | 'PROHIBITED' {
  if (isConsumerProhibited(mode, consumer)) return 'PROHIBITED';
  if (isConsumerAllowed(mode, consumer)) return 'ALLOWED';
  if (isConsumerConditional(mode, consumer)) return 'CONDITIONAL';
  return 'PROHIBITED';
}
