/**
 * L2.3 — Route Failover Governor
 *
 * Governs when failover is legal, when fallback is degraded,
 * when route substitution is prohibited, how restoration works,
 * and when route preference is regained.
 *
 * Hard principle: A route failover is legal only if the candidate is
 * constitutionally admissible, freshness rights remain adequate,
 * observation semantics remain valid, route-mode semantic change is
 * disclosed, and blind spots are propagated.
 */

import type {
  L23RouteMode, RouteState, RouteFailoverOutcome,
  RouteProbationState, RouteBlindSpot, DegradationSemantic,
  AvailableRoute,
} from './routing-mode-types';
import { ROUTE_STATE_RANK } from './routing-mode-types';
import { getConstitution } from './routing-constitution';
import { isRouteModeAdmissible } from './route-selection-policy';

// ═══════════════════════════════════════════════════════════════════════════════
// FAILOVER EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FailoverRequest {
  fieldFamily: string;
  sourceClass: string;
  claimUsage: string;
  primaryRoute: AvailableRoute;
  candidateRoute: AvailableRoute;
}

export interface FailoverDecision {
  outcome: RouteFailoverOutcome;
  reasonCodes: string[];
  expectedBlindSpots: RouteBlindSpot[];
  expectedDegradation: DegradationSemantic[];
  disclosureRequired: boolean;
  disclosureText?: string;
}

export function evaluateFailover(req: FailoverRequest): FailoverDecision {
  const reasons: string[] = [];
  const blindSpots: RouteBlindSpot[] = [];
  const degradation: DegradationSemantic[] = [];

  // Gate 1 — candidate admissibility
  if (!isRouteModeAdmissible(req.fieldFamily, req.sourceClass, req.claimUsage, req.candidateRoute.routeMode)) {
    return {
      outcome: 'FAILOVER_PROHIBITED',
      reasonCodes: ['CANDIDATE_MODE_NOT_ADMISSIBLE'],
      expectedBlindSpots: [],
      expectedDegradation: [],
      disclosureRequired: true,
      disclosureText: `${req.candidateRoute.routeMode} not admissible for ${req.fieldFamily}/${req.claimUsage}`,
    };
  }

  // Gate 2 — candidate route state
  if (req.candidateRoute.routeState === 'R5_PROHIBITED') {
    return {
      outcome: 'FAILOVER_PROHIBITED',
      reasonCodes: ['CANDIDATE_ROUTE_PROHIBITED'],
      expectedBlindSpots: [],
      expectedDegradation: [],
      disclosureRequired: true,
    };
  }

  // Gate 3 — critical incident
  if (req.candidateRoute.recentFailureCount > 5) {
    reasons.push('CANDIDATE_HIGH_FAILURE_COUNT');
    return {
      outcome: 'ESCALATE_ROUTE_INCIDENT',
      reasonCodes: reasons,
      expectedBlindSpots: [],
      expectedDegradation: [],
      disclosureRequired: true,
      disclosureText: 'Failover candidate has excessive recent failures — escalating',
    };
  }

  const candidateConst = getConstitution(req.candidateRoute.routeMode);

  // Equivalent failover: same mode, same path type, good state
  const sameMode = req.primaryRoute.routeMode === req.candidateRoute.routeMode;
  const samePath = req.primaryRoute.isOwnerPath === req.candidateRoute.isOwnerPath;
  const goodState = ROUTE_STATE_RANK[req.candidateRoute.routeState] <= 1;

  if (sameMode && samePath && goodState) {
    reasons.push('EQUIVALENT_FAILOVER');
    return {
      outcome: 'FAILOVER_ALLOWED_EQUIVALENT',
      reasonCodes: reasons,
      expectedBlindSpots: [],
      expectedDegradation: [],
      disclosureRequired: false,
    };
  }

  // Partial failover: candidate is degraded or partial
  if (req.candidateRoute.routeState === 'R3_PARTIAL' || req.candidateRoute.routeState === 'R4_FALLBACK_ONLY') {
    reasons.push('CANDIDATE_PARTIAL_STATE');
    blindSpots.push(...candidateConst.possibleBlindSpots);
    degradation.push(...candidateConst.degradationSemantics);
    return {
      outcome: 'FAILOVER_PARTIAL_ONLY',
      reasonCodes: reasons,
      expectedBlindSpots: blindSpots,
      expectedDegradation: degradation,
      disclosureRequired: true,
      disclosureText: `Partial failover to ${req.candidateRoute.routeMode}/${req.candidateRoute.connector}`,
    };
  }

  // Degraded failover: different mode or different path type
  if (!sameMode) reasons.push(`MODE_CHANGE_${req.primaryRoute.routeMode}_TO_${req.candidateRoute.routeMode}`);
  if (!samePath) reasons.push('PATH_TYPE_CHANGE');
  if (req.candidateRoute.routeState === 'R2_DEGRADED') reasons.push('CANDIDATE_DEGRADED_STATE');

  blindSpots.push(...candidateConst.possibleBlindSpots);
  if (!sameMode) {
    degradation.push(...candidateConst.degradationSemantics);
  }

  return {
    outcome: 'FAILOVER_ALLOWED_DEGRADED',
    reasonCodes: reasons,
    expectedBlindSpots: blindSpots,
    expectedDegradation: degradation,
    disclosureRequired: true,
    disclosureText: `Degraded failover: ${reasons.join(', ')}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESTORATION GOVERNOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface RestorationState {
  routeMode: L23RouteMode;
  connector: string;
  currentProbation: RouteProbationState;
  cleanWindowStartedAt?: string;
  flapCount: number;
  lastDegradedAt?: string;
}

export interface RestorationDecision {
  newProbation: RouteProbationState;
  newRouteState: RouteState;
  reasonCodes: string[];
  rightsHaircut: boolean;
}

export function evaluateRestoration(state: RestorationState, now?: number): RestorationDecision {
  const evalNow = now ?? Date.now();
  const constitution = getConstitution(state.routeMode);
  const reasons: string[] = [];

  // Flap guard
  if (state.flapCount > constitution.restorationMaxFlapCount) {
    reasons.push('FLAP_LIMIT_EXCEEDED');
    return {
      newProbation: 'RECOVERING_UNVERIFIED',
      newRouteState: 'R4_FALLBACK_ONLY',
      reasonCodes: reasons,
      rightsHaircut: true,
    };
  }

  // Clean window check
  const cleanStart = state.cleanWindowStartedAt ? new Date(state.cleanWindowStartedAt).getTime() : 0;
  const cleanDuration = evalNow - cleanStart;
  const required = constitution.restorationCleanWindowMs;

  const sequence = constitution.probationSequence;
  const currentIdx = sequence.indexOf(state.currentProbation);

  if (cleanDuration < required * 0.5) {
    reasons.push('CLEAN_WINDOW_TOO_SHORT');
    return {
      newProbation: state.currentProbation,
      newRouteState: probationToRouteState(state.currentProbation),
      reasonCodes: reasons,
      rightsHaircut: state.currentProbation !== 'RESTORED_PREFERRED',
    };
  }

  // Advance probation
  if (currentIdx < sequence.length - 1 && cleanDuration >= required) {
    const next = sequence[currentIdx + 1];
    reasons.push(`PROBATION_ADVANCED_TO_${next}`);
    return {
      newProbation: next,
      newRouteState: probationToRouteState(next),
      reasonCodes: reasons,
      rightsHaircut: next !== 'RESTORED_PREFERRED',
    };
  }

  // Hold current
  reasons.push('HOLDING_CURRENT_PROBATION');
  return {
    newProbation: state.currentProbation,
    newRouteState: probationToRouteState(state.currentProbation),
    reasonCodes: reasons,
    rightsHaircut: state.currentProbation !== 'RESTORED_PREFERRED',
  };
}

function probationToRouteState(probation: RouteProbationState): RouteState {
  switch (probation) {
    case 'RECOVERING_UNVERIFIED': return 'R4_FALLBACK_ONLY';
    case 'RECOVERING_PROBATION': return 'R2_DEGRADED';
    case 'RECOVERED_LIMITED': return 'R1_AVAILABLE';
    case 'RESTORED_PREFERRED': return 'R0_PREFERRED';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE HEALTH TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

const routeHealthMap = new Map<string, RestorationState>();

function routeKey(mode: L23RouteMode, connector: string): string {
  return `${mode}::${connector}`;
}

export function recordRouteDegradation(mode: L23RouteMode, connector: string): void {
  const key = routeKey(mode, connector);
  const existing = routeHealthMap.get(key);
  routeHealthMap.set(key, {
    routeMode: mode,
    connector,
    currentProbation: 'RECOVERING_UNVERIFIED',
    cleanWindowStartedAt: undefined,
    flapCount: (existing?.flapCount ?? 0) + 1,
    lastDegradedAt: new Date().toISOString(),
  });
}

export function recordRouteStable(mode: L23RouteMode, connector: string): void {
  const key = routeKey(mode, connector);
  const existing = routeHealthMap.get(key);
  if (!existing) return;
  if (!existing.cleanWindowStartedAt) {
    existing.cleanWindowStartedAt = new Date().toISOString();
  }
}

export function getRestorationState(mode: L23RouteMode, connector: string): RestorationState | undefined {
  return routeHealthMap.get(routeKey(mode, connector));
}

export function advanceRestoration(mode: L23RouteMode, connector: string, now?: number): RestorationDecision | undefined {
  const state = routeHealthMap.get(routeKey(mode, connector));
  if (!state) return undefined;
  const decision = evaluateRestoration(state, now);
  state.currentProbation = decision.newProbation;
  return decision;
}

export function resetRouteHealth(): void {
  routeHealthMap.clear();
}
