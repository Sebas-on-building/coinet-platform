/**
 * L2.6 — Route Trace Recorder
 *
 * Capture route decisions as structured causal evidence.
 * Preserves counterfactual structure: not only what happened,
 * but what was possible and rejected.
 */

import { createHash } from 'crypto';
import type {
  RouteTrace, RouteCandidateTrace, FallbackTraceStep,
} from './trace-graph';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE TRACE FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteTraceInput {
  requestId: string;
  traceId: string;
  fieldFamily: string;
  sourceClass: string;
  claimUsage: string;

  selectedRouteId: string;
  selectedRouteMode: string;
  selectedConnector: string;

  truthFidelityScore: number;
  freshnessFitnessScore: number;
  failureResilienceScore: number;
  costDisciplineScore: number;
  provenanceScore: number;

  admittedCandidates?: RouteCandidateTrace[];
  rejectedCandidates?: RouteCandidateTrace[];
  fallbackLadder?: FallbackTraceStep[];

  routeState: string;
  routeProbationState?: string;
  blindSpotFlags?: string[];
  reasonCodes?: string[];
}

export function buildRouteTrace(input: RouteTraceInput): RouteTrace {
  const now = new Date().toISOString();
  const routeTraceId = `rt-${createHash('sha256')
    .update(`${input.traceId}-${input.fieldFamily}-${now}`)
    .digest('hex').slice(0, 16)}`;

  const rejected = input.rejectedCandidates ?? [];
  const bestRejected = rejected.length > 0
    ? rejected.reduce((best, c) => c.compositeScore > best.compositeScore ? c : best, rejected[0])
    : undefined;

  return {
    routeTraceId,
    requestId: input.requestId,
    traceId: input.traceId,
    fieldFamily: input.fieldFamily,
    sourceClass: input.sourceClass,
    claimUsage: input.claimUsage,
    selectedRouteId: input.selectedRouteId,
    selectedRouteMode: input.selectedRouteMode,
    selectedConnector: input.selectedConnector,
    truthFidelityScore: input.truthFidelityScore,
    freshnessFitnessScore: input.freshnessFitnessScore,
    failureResilienceScore: input.failureResilienceScore,
    costDisciplineScore: input.costDisciplineScore,
    provenanceScore: input.provenanceScore,
    admittedCandidates: input.admittedCandidates ?? [],
    rejectedCandidates: rejected,
    fallbackLadder: input.fallbackLadder ?? [],
    routeState: input.routeState,
    routeProbationState: input.routeProbationState,
    blindSpotFlags: input.blindSpotFlags ?? [],
    reasonCodes: input.reasonCodes ?? [],
    bestRejectedRoute: bestRejected,
    createdAt: now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTERFACTUAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CounterfactualAnalysis {
  betterRouteExisted: boolean;
  bestRejected?: RouteCandidateTrace;
  fidelityDelta: number;
  freshnessDelta: number;
  selectedComposite: number;
  bestRejectedComposite: number;
}

export function analyzeCounterfactual(routeTrace: RouteTrace): CounterfactualAnalysis {
  const selected = {
    truth: routeTrace.truthFidelityScore,
    freshness: routeTrace.freshnessFitnessScore,
    composite: (
      routeTrace.truthFidelityScore * 0.4 +
      routeTrace.freshnessFitnessScore * 0.3 +
      routeTrace.failureResilienceScore * 0.2 +
      routeTrace.costDisciplineScore * 0.1
    ),
  };

  if (!routeTrace.bestRejectedRoute) {
    return {
      betterRouteExisted: false,
      fidelityDelta: 0,
      freshnessDelta: 0,
      selectedComposite: selected.composite,
      bestRejectedComposite: 0,
    };
  }

  const best = routeTrace.bestRejectedRoute;
  const bestComposite = (
    best.truthFidelityScore * 0.4 +
    best.freshnessFitnessScore * 0.3 +
    best.failureResilienceScore * 0.2 +
    best.costDisciplineScore * 0.1
  );

  return {
    betterRouteExisted: bestComposite > selected.composite,
    bestRejected: best,
    fidelityDelta: best.truthFidelityScore - selected.truth,
    freshnessDelta: best.freshnessFitnessScore - selected.freshness,
    selectedComposite: selected.composite,
    bestRejectedComposite: bestComposite,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE SCAR DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteScar {
  routeTraceId: string;
  scarType: 'DEGRADED_ROUTE' | 'FALLBACK_USED' | 'PROBATION_ACTIVE' | 'BLIND_SPOTS_PRESENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detail: string;
}

export function detectRouteScars(routeTrace: RouteTrace): RouteScar[] {
  const scars: RouteScar[] = [];

  if (routeTrace.routeState === 'R2_DEGRADED' || routeTrace.routeState === 'R3_PARTIAL') {
    scars.push({
      routeTraceId: routeTrace.routeTraceId,
      scarType: 'DEGRADED_ROUTE',
      severity: routeTrace.routeState === 'R3_PARTIAL' ? 'HIGH' : 'MEDIUM',
      detail: `Route in ${routeTrace.routeState}`,
    });
  }

  if (routeTrace.fallbackLadder.length > 0) {
    scars.push({
      routeTraceId: routeTrace.routeTraceId,
      scarType: 'FALLBACK_USED',
      severity: routeTrace.fallbackLadder.length > 2 ? 'HIGH' : 'MEDIUM',
      detail: `${routeTrace.fallbackLadder.length} fallback step(s)`,
    });
  }

  if (routeTrace.routeProbationState) {
    scars.push({
      routeTraceId: routeTrace.routeTraceId,
      scarType: 'PROBATION_ACTIVE',
      severity: 'MEDIUM',
      detail: `Probation: ${routeTrace.routeProbationState}`,
    });
  }

  if (routeTrace.blindSpotFlags.length > 0) {
    scars.push({
      routeTraceId: routeTrace.routeTraceId,
      scarType: 'BLIND_SPOTS_PRESENT',
      severity: routeTrace.blindSpotFlags.length > 2 ? 'HIGH' : 'LOW',
      detail: routeTrace.blindSpotFlags.join(', '),
    });
  }

  return scars;
}
