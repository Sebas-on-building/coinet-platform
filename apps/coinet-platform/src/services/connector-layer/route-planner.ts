/**
 * L2.3 — Route Planner
 *
 * Six-step decision engine:
 *   1. Admissibility filter — remove constitutionally illegal routes
 *   2. Truth fidelity ranking
 *   3. Freshness fitness ranking
 *   4. Failure resilience scoring
 *   5. Cost optimization — only within legal candidates
 *   6. Fallback ladder preparation
 */

import type {
  L23RouteMode, RouteState, RouteDecisionRecord, RoutePlanningInput,
  AvailableRoute, FallbackCandidate, RejectedCandidate,
  RouteBlindSpot, DegradationSemantic, RouteConsumer,
} from './routing-mode-types';
import { ROUTE_STATE_RANK } from './routing-mode-types';
import { findSelectionPolicy, type RouteSelectionPolicy } from './route-selection-policy';
import { getConstitution } from './routing-constitution';

// ═══════════════════════════════════════════════════════════════════════════════
// PLANNING LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

const planningLedger: RouteDecisionRecord[] = [];

export function getPlanningLedger(): readonly RouteDecisionRecord[] {
  return planningLedger;
}

export function clearPlanningLedger(): void {
  planningLedger.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — ADMISSIBILITY FILTER
// ═══════════════════════════════════════════════════════════════════════════════

interface AdmissibilityResult {
  admissible: AvailableRoute[];
  rejected: RejectedCandidate[];
}

function filterAdmissible(
  input: RoutePlanningInput,
  policy: RouteSelectionPolicy,
): AdmissibilityResult {
  const admissible: AvailableRoute[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const route of input.availableRoutes) {
    const reasons: string[] = [];

    if (policy.prohibitedModes.includes(route.routeMode)) {
      reasons.push('MODE_PROHIBITED_BY_POLICY');
    }
    if (!policy.admissibleModes.includes(route.routeMode)) {
      reasons.push('MODE_NOT_ADMISSIBLE');
    }
    if (route.routeState === 'R5_PROHIBITED') {
      reasons.push('ROUTE_STATE_PROHIBITED');
    }
    if (policy.requireOwnerPath && !route.isOwnerPath && !route.isConfirmerPath) {
      reasons.push('OWNER_PATH_REQUIRED');
    }
    if (policy.requireOwnerPath && !route.isOwnerPath && route.isConfirmerPath && !policy.allowConfirmerFallback) {
      reasons.push('CONFIRMER_FALLBACK_NOT_ALLOWED');
    }

    const incident = input.currentIncidents?.find(
      i => i.routeMode === route.routeMode && i.connector === route.connector && i.severity === 'CRITICAL',
    );
    if (incident) {
      reasons.push('CRITICAL_INCIDENT_ACTIVE');
    }

    if (reasons.length > 0) {
      rejected.push({ routeMode: route.routeMode, connector: route.connector, reasonCodes: reasons });
    } else {
      admissible.push(route);
    }
  }

  return { admissible, rejected };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — TRUTH FIDELITY SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function scoreTruthFidelity(route: AvailableRoute, policy: RouteSelectionPolicy): number {
  let score = 0.5;

  if (route.isOwnerPath) score += 0.3;
  else if (route.isConfirmerPath) score += 0.15;

  if (route.routeMode === policy.preferredMode) score += 0.15;

  if (route.routeState === 'R0_PREFERRED') score += 0.05;
  else if (route.routeState === 'R2_DEGRADED') score -= 0.15;
  else if (route.routeState === 'R3_PARTIAL') score -= 0.25;
  else if (route.routeState === 'R4_FALLBACK_ONLY') score -= 0.35;

  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — FRESHNESS FITNESS SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function scoreFreshnessFitness(route: AvailableRoute, policy: RouteSelectionPolicy): number {
  const constitution = getConstitution(route.routeMode);
  const bands = constitution.latencyBands;

  if (route.latencyMs == null) return 0.5;

  if (route.latencyMs <= bands.goodMaxMs) return 1.0;
  if (route.latencyMs <= bands.acceptableMaxMs) return 0.75;
  if (route.latencyMs <= bands.degradedMaxMs) return 0.4;
  return 0.1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — FAILURE RESILIENCE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function scoreFailureResilience(route: AvailableRoute, input: RoutePlanningInput): number {
  let score = 1.0;

  const stateRank = ROUTE_STATE_RANK[route.routeState];
  score -= stateRank * 0.12;

  if (route.recentFailureCount > 0) {
    score -= Math.min(0.4, route.recentFailureCount * 0.08);
  }

  if (route.probationState === 'RECOVERING_UNVERIFIED') score -= 0.25;
  else if (route.probationState === 'RECOVERING_PROBATION') score -= 0.15;
  else if (route.probationState === 'RECOVERED_LIMITED') score -= 0.05;

  const incidents = input.currentIncidents?.filter(
    i => i.routeMode === route.routeMode && i.connector === route.connector,
  ) ?? [];
  for (const inc of incidents) {
    if (inc.severity === 'HIGH') score -= 0.15;
    else if (inc.severity === 'MEDIUM') score -= 0.08;
    else if (inc.severity === 'LOW') score -= 0.03;
  }

  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — COST DISCIPLINE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function scoreCostDiscipline(route: AvailableRoute, allAdmissible: AvailableRoute[]): number {
  if (route.costUnits == null) return 0.5;
  const costs = allAdmissible.map(r => r.costUnits ?? 0).filter(c => c > 0);
  if (costs.length === 0) return 0.5;

  const maxCost = Math.max(...costs);
  if (maxCost === 0) return 1.0;
  return 1.0 - (route.costUnits / maxCost) * 0.5;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

function computeComposite(
  truth: number,
  freshness: number,
  resilience: number,
  cost: number,
  policy: RouteSelectionPolicy,
): number {
  return (
    truth * policy.truthFidelityWeight +
    freshness * policy.freshnessFitnessWeight +
    resilience * policy.failureResilienceWeight +
    cost * policy.costDisciplineWeight
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

function computeProvenance(route: AvailableRoute): number {
  let score = 0.5;
  if (route.isOwnerPath) score += 0.25;
  else if (route.isConfirmerPath) score += 0.10;
  if (route.routeState === 'R0_PREFERRED') score += 0.15;
  else if (route.routeState === 'R1_AVAILABLE') score += 0.08;
  if (route.recentFailureCount === 0) score += 0.10;
  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLIND SPOTS & DEGRADATION
// ═══════════════════════════════════════════════════════════════════════════════

function collectBlindSpots(route: AvailableRoute): RouteBlindSpot[] {
  const constitution = getConstitution(route.routeMode);
  const spots: RouteBlindSpot[] = [];

  if (route.routeState === 'R2_DEGRADED' || route.routeState === 'R3_PARTIAL') {
    spots.push(...constitution.possibleBlindSpots);
  }

  return spots;
}

function collectDegradation(route: AvailableRoute): DegradationSemantic[] {
  const constitution = getConstitution(route.routeMode);
  if (route.routeState === 'R0_PREFERRED' || route.routeState === 'R1_AVAILABLE') return [];
  return [...constitution.degradationSemantics];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — FALLBACK LADDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildFallbackLadder(
  winner: AvailableRoute,
  admissible: AvailableRoute[],
): FallbackCandidate[] {
  return admissible
    .filter(r => r !== winner)
    .map(r => {
      const constitution = getConstitution(r.routeMode);
      const isEquivalent = r.routeMode === winner.routeMode && r.isOwnerPath === winner.isOwnerPath;
      return {
        routeMode: r.routeMode,
        connector: r.connector,
        failoverOutcome: isEquivalent
          ? 'FAILOVER_ALLOWED_EQUIVALENT' as const
          : r.routeState === 'R3_PARTIAL' || r.routeState === 'R4_FALLBACK_ONLY'
            ? 'FAILOVER_PARTIAL_ONLY' as const
            : 'FAILOVER_ALLOWED_DEGRADED' as const,
        expectedBlindSpots: [...constitution.possibleBlindSpots],
        expectedDegradation: [...constitution.degradationSemantics],
      };
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOWED CONSUMERS FOR SELECTED ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

function resolveConsumers(route: AvailableRoute): RouteConsumer[] {
  const constitution = getConstitution(route.routeMode);
  const consumers = [...constitution.allowedConsumers];

  if (route.routeState === 'R0_PREFERRED' || route.routeState === 'R1_AVAILABLE') {
    consumers.push(...constitution.conditionalConsumers);
  }

  return consumers;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMARY PLANNER
// ═══════════════════════════════════════════════════════════════════════════════

export function planRoute(input: RoutePlanningInput): RouteDecisionRecord {
  const policy = findSelectionPolicy(input.fieldFamily, input.sourceClass, input.claimUsage);

  // Step 1 — admissibility
  const { admissible, rejected } = filterAdmissible(input, policy);

  if (admissible.length === 0) {
    const empty: RouteDecisionRecord = {
      routeId: `route-${Date.now()}-none`,
      routeMode: policy.preferredMode,
      selectedConnector: 'NONE',
      routeState: 'R5_PROHIBITED',
      truthFidelityScore: 0,
      freshnessFitnessScore: 0,
      failureResilienceScore: 0,
      costDisciplineScore: 0,
      compositeScore: 0,
      provenanceScore: 0,
      allowedConsumers: [],
      blindSpots: [],
      degradationSemantics: [],
      selectedReasonCodes: ['NO_ADMISSIBLE_ROUTE'],
      rejectedCandidates: rejected,
      fallbackLadder: [],
      decidedAt: new Date().toISOString(),
    };
    planningLedger.push(empty);
    return empty;
  }

  // Steps 2–5 — score every admissible route
  const scored = admissible.map(route => {
    const truth = scoreTruthFidelity(route, policy);
    const freshness = scoreFreshnessFitness(route, policy);
    const resilience = scoreFailureResilience(route, input);
    const cost = scoreCostDiscipline(route, admissible);
    const composite = computeComposite(truth, freshness, resilience, cost, policy);
    return { route, truth, freshness, resilience, cost, composite };
  });

  scored.sort((a, b) => b.composite - a.composite);
  const winner = scored[0];

  const reasons: string[] = [];
  reasons.push(`MODE_${winner.route.routeMode}`);
  if (winner.route.isOwnerPath) reasons.push('OWNER_PATH');
  else if (winner.route.isConfirmerPath) reasons.push('CONFIRMER_PATH');
  if (winner.route.routeMode === policy.preferredMode) reasons.push('PREFERRED_MODE_MATCH');
  if (winner.route.routeState !== 'R0_PREFERRED') reasons.push(`ROUTE_STATE_${winner.route.routeState}`);

  const record: RouteDecisionRecord = {
    routeId: `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    routeMode: winner.route.routeMode,
    selectedConnector: winner.route.connector,
    routeState: winner.route.routeState,
    truthFidelityScore: Math.round(winner.truth * 1000) / 1000,
    freshnessFitnessScore: Math.round(winner.freshness * 1000) / 1000,
    failureResilienceScore: Math.round(winner.resilience * 1000) / 1000,
    costDisciplineScore: Math.round(winner.cost * 1000) / 1000,
    compositeScore: Math.round(winner.composite * 1000) / 1000,
    provenanceScore: Math.round(computeProvenance(winner.route) * 1000) / 1000,
    allowedConsumers: resolveConsumers(winner.route),
    blindSpots: collectBlindSpots(winner.route),
    degradationSemantics: collectDegradation(winner.route),
    selectedReasonCodes: reasons,
    rejectedCandidates: rejected,
    fallbackLadder: buildFallbackLadder(winner.route, admissible),
    decidedAt: new Date().toISOString(),
  };

  planningLedger.push(record);
  return record;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE-CHOICE HONESTY CHECK — for anti-fake suite
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify that a cheaper, lower-fidelity route was NOT selected while a
 * higher-fidelity admissible route existed. Returns violation descriptions.
 */
export function verifyRouteChoiceHonesty(record: RouteDecisionRecord): string[] {
  const violations: string[] = [];

  if (record.selectedConnector === 'NONE') return violations;

  for (const fb of record.fallbackLadder) {
    if (fb.failoverOutcome === 'FAILOVER_ALLOWED_EQUIVALENT') continue;
  }

  if (record.truthFidelityScore < 0.3 && record.costDisciplineScore > 0.8) {
    violations.push('LOW_FIDELITY_HIGH_COST_PREFERENCE — possible cheap-first override');
  }

  if (record.routeState === 'R4_FALLBACK_ONLY' && record.fallbackLadder.length > 0) {
    const better = record.fallbackLadder.find(f => f.failoverOutcome === 'FAILOVER_ALLOWED_EQUIVALENT');
    if (better) {
      violations.push('FALLBACK_ONLY_SELECTED_WITH_EQUIVALENT_AVAILABLE');
    }
  }

  return violations;
}
