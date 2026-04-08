/**
 * L2.3 — Routing Mode Types
 *
 * Route choice is an epistemic decision, not just an engineering optimization.
 * A route determines how quickly Coinet sees reality, how stale the observation
 * may already be, how recoverable the path is, how much semantic loss fallback
 * introduces, and which downstream layers may legally trust the result.
 */

export const L23_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE MODES — constitutional transport classes
// ═══════════════════════════════════════════════════════════════════════════════

export type L23RouteMode = 'REALTIME' | 'SCHEDULED' | 'ON_DEMAND' | 'BACKFILL';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE STATES — operational readiness
// ═══════════════════════════════════════════════════════════════════════════════

export type RouteState =
  | 'R0_PREFERRED'
  | 'R1_AVAILABLE'
  | 'R2_DEGRADED'
  | 'R3_PARTIAL'
  | 'R4_FALLBACK_ONLY'
  | 'R5_PROHIBITED';

export const ROUTE_STATE_RANK: Record<RouteState, number> = {
  R0_PREFERRED: 0,
  R1_AVAILABLE: 1,
  R2_DEGRADED: 2,
  R3_PARTIAL: 3,
  R4_FALLBACK_ONLY: 4,
  R5_PROHIBITED: 5,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROBATION STATES — route must re-earn preferred status after degradation
// ═══════════════════════════════════════════════════════════════════════════════

export type RouteProbationState =
  | 'RECOVERING_UNVERIFIED'
  | 'RECOVERING_PROBATION'
  | 'RECOVERED_LIMITED'
  | 'RESTORED_PREFERRED';

// ═══════════════════════════════════════════════════════════════════════════════
// LATENCY CLASSES — field-family aware
// ═══════════════════════════════════════════════════════════════════════════════

export type LatencyClass = 'GOOD' | 'ACCEPTABLE' | 'DEGRADED' | 'UNUSABLE';

export interface LatencyBands {
  goodMaxMs: number;
  acceptableMaxMs: number;
  degradedMaxMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST TOLERANCE — explicit optimization stances
// ═══════════════════════════════════════════════════════════════════════════════

export type CostToleranceMode =
  | 'TRUTH_FIRST'
  | 'BALANCED'
  | 'CHEAP_FIRST'
  | 'RECOVERY_FIRST'
  | 'FORENSIC_FIRST';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE CONSUMERS — explicit downstream trust allowlist
// ═══════════════════════════════════════════════════════════════════════════════

export type RouteConsumer =
  | 'CANONICALIZATION'
  | 'LIVE_SCORING'
  | 'SCENARIO_ENGINE'
  | 'CONTRADICTION_ENGINE'
  | 'ALERTING'
  | 'DISPLAY'
  | 'AUDIT'
  | 'REPLAY'
  | 'CALIBRATION'
  | 'DRILLDOWN_EXPLANATION';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE INTENTION — what the request/job is trying to achieve
// ═══════════════════════════════════════════════════════════════════════════════

export type RouteIntention =
  | 'LIVE_THESIS'
  | 'LIVE_DISPLAY'
  | 'DEEP_VERIFICATION'
  | 'FORENSIC_REPLAY'
  | 'HISTORICAL_BACKFILL'
  | 'CALIBRATION_BUILD'
  | 'INCIDENT_RECOVERY';

// ═══════════════════════════════════════════════════════════════════════════════
// FAILOVER OUTCOMES
// ═══════════════════════════════════════════════════════════════════════════════

export type RouteFailoverOutcome =
  | 'NO_FAILOVER_NEEDED'
  | 'FAILOVER_ALLOWED_EQUIVALENT'
  | 'FAILOVER_ALLOWED_DEGRADED'
  | 'FAILOVER_PARTIAL_ONLY'
  | 'FAILOVER_PROHIBITED'
  | 'ESCALATE_ROUTE_INCIDENT';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE BLIND SPOTS
// ═══════════════════════════════════════════════════════════════════════════════

export type RouteBlindSpot =
  | 'ORDERING_GAP'
  | 'EVENT_MISS'
  | 'RECONNECT_UNCERTAINTY'
  | 'DUPLICATE_BURST_CONTAMINATION'
  | 'MISSED_INTERVAL'
  | 'SNAPSHOT_CARRY_FORWARD'
  | 'PARTIAL_METRIC_LAG'
  | 'REQUEST_BOUNDED_INCOMPLETENESS'
  | 'EVIDENCE_SET_TRUNCATION'
  | 'CACHE_SUBSTITUTION'
  | 'HISTORICAL_GAP'
  | 'INCOMPLETE_REPLAY'
  | 'CORRECTION_CHAIN_BREAK'
  | 'ORDERING_APPROXIMATION';

// ═══════════════════════════════════════════════════════════════════════════════
// DEGRADATION SEMANTIC — route-specific consequence, not generic "unhealthy"
// ═══════════════════════════════════════════════════════════════════════════════

export type DegradationSemantic =
  | 'VISIBILITY_GAP'
  | 'ORDERING_UNCERTAINTY'
  | 'DUPLICATE_RISK'
  | 'SEQUENCE_CONTAMINATION'
  | 'LIVE_CLAIM_RESTRICTION'
  | 'CADENCE_MISS'
  | 'PARTIAL_SNAPSHOT'
  | 'DELAYED_RUN'
  | 'STALE_CARRY_FORWARD'
  | 'TIMEOUT_INCOMPLETE'
  | 'OWNER_UNAVAILABLE'
  | 'CACHE_SUBSTITUTED'
  | 'COST_CEILING_TRUNCATED'
  | 'HISTORICAL_GAP_DETECTED'
  | 'REPLAY_VERSION_MISMATCH'
  | 'ORDERING_UNRESOLVED';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE DECISION RECORD — the core output of route planning
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteDecisionRecord {
  routeId: string;
  routeMode: L23RouteMode;
  selectedConnector: string;
  routeState: RouteState;

  truthFidelityScore: number;
  freshnessFitnessScore: number;
  failureResilienceScore: number;
  costDisciplineScore: number;
  compositeScore: number;
  provenanceScore: number;

  allowedConsumers: RouteConsumer[];
  blindSpots: RouteBlindSpot[];
  degradationSemantics: DegradationSemantic[];
  selectedReasonCodes: string[];

  rejectedCandidates: RejectedCandidate[];
  fallbackLadder: FallbackCandidate[];

  decidedAt: string;
}

export interface RejectedCandidate {
  routeMode: L23RouteMode;
  connector: string;
  reasonCodes: string[];
}

export interface FallbackCandidate {
  routeMode: L23RouteMode;
  connector: string;
  failoverOutcome: RouteFailoverOutcome;
  expectedBlindSpots: RouteBlindSpot[];
  expectedDegradation: DegradationSemantic[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE PLANNING INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoutePlanningInput {
  fieldFamily: string;
  sourceClass: string;
  claimUsage: string;
  criticality: 'MISSION_CRITICAL' | 'THESIS_CRITICAL' | 'CONTEXTUAL' | 'ENRICHMENT_ONLY';
  intention: RouteIntention;

  availableRoutes: AvailableRoute[];
  currentIncidents?: RouteIncident[];
}

export interface AvailableRoute {
  routeMode: L23RouteMode;
  connector: string;
  routeState: RouteState;
  probationState?: RouteProbationState;
  latencyMs?: number;
  costUnits?: number;
  isOwnerPath: boolean;
  isConfirmerPath: boolean;
  recentFailureCount: number;
  lastSuccessAt?: string;
}

export interface RouteIncident {
  routeMode: L23RouteMode;
  connector: string;
  incidentType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  since: string;
}
