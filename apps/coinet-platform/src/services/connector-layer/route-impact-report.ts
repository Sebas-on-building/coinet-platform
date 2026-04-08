/**
 * Layer 2 — Route Impact Report
 *
 * Maps route choices to downstream confidence and claim restrictions.
 * Tracks route planner selection quality, fallback severity trends,
 * and provides operator views for route regret analysis.
 */

import type { BlindSpotRecord } from './blindspot-engine';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE IMPACT RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteImpactRecord {
  recordId: string;
  requestId: string;
  traceId: string;
  fieldFamily: string;
  routeId: string;
  routeMode: string;
  selectedConnector: string;

  truthFidelityScore: number;
  freshnessFitnessScore: number;
  failureResilienceScore: number;
  costDisciplineScore: number;
  compositeScore: number;

  fallbackUsed: boolean;
  fallbackEquivalence?: string;
  blindSpotCount: number;
  blindSpotSeverityMax?: string;
  confidenceHaircut: number;
  claimRestrictions: string[];

  bestRejectedRouteMode?: string;
  bestRejectedCompositeScore?: number;
  routeRegret: number;

  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteImpactInput {
  requestId: string;
  traceId: string;
  fieldFamily: string;
  routeId: string;
  routeMode: string;
  selectedConnector: string;
  truthFidelityScore: number;
  freshnessFitnessScore: number;
  failureResilienceScore: number;
  costDisciplineScore: number;
  fallbackUsed: boolean;
  fallbackEquivalence?: string;
  blindSpots: BlindSpotRecord[];
  confidenceHaircut: number;
  bestRejectedRouteMode?: string;
  bestRejectedCompositeScore?: number;
}

let nextId = 1;

export function buildRouteImpactRecord(input: RouteImpactInput): RouteImpactRecord {
  const composite = (
    input.truthFidelityScore * 0.40 +
    input.freshnessFitnessScore * 0.30 +
    input.failureResilienceScore * 0.20 +
    input.costDisciplineScore * 0.10
  );

  const worstSev = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const)
    .find(s => input.blindSpots.some(bs => bs.severity === s));

  const restrictions = new Set<string>();
  for (const bs of input.blindSpots) {
    for (const c of bs.claimConstraints) restrictions.add(c);
  }

  const regret = input.bestRejectedCompositeScore !== undefined
    ? Math.max(0, input.bestRejectedCompositeScore - composite)
    : 0;

  return {
    recordId: `ri-${nextId++}`,
    requestId: input.requestId,
    traceId: input.traceId,
    fieldFamily: input.fieldFamily,
    routeId: input.routeId,
    routeMode: input.routeMode,
    selectedConnector: input.selectedConnector,
    truthFidelityScore: input.truthFidelityScore,
    freshnessFitnessScore: input.freshnessFitnessScore,
    failureResilienceScore: input.failureResilienceScore,
    costDisciplineScore: input.costDisciplineScore,
    compositeScore: composite,
    fallbackUsed: input.fallbackUsed,
    fallbackEquivalence: input.fallbackEquivalence,
    blindSpotCount: input.blindSpots.length,
    blindSpotSeverityMax: worstSev,
    confidenceHaircut: input.confidenceHaircut,
    claimRestrictions: Array.from(restrictions),
    bestRejectedRouteMode: input.bestRejectedRouteMode,
    bestRejectedCompositeScore: input.bestRejectedCompositeScore,
    routeRegret: regret,
    createdAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

const impactStore: RouteImpactRecord[] = [];

export function recordRouteImpact(rec: RouteImpactRecord): void {
  impactStore.push(rec);
}

export function getRouteImpactRecords(): RouteImpactRecord[] {
  return [...impactStore];
}

export function getImpactByFieldFamily(ff: string): RouteImpactRecord[] {
  return impactStore.filter(r => r.fieldFamily === ff);
}

export function getImpactByRouteMode(mode: string): RouteImpactRecord[] {
  return impactStore.filter(r => r.routeMode === mode);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouteImpactSummary {
  totalDecisions: number;
  avgCompositeScore: number;
  avgConfidenceHaircut: number;
  avgRouteRegret: number;
  fallbackRate: number;
  highRegretCount: number;
  byFieldFamily: Array<{
    fieldFamily: string;
    count: number;
    avgComposite: number;
    avgRegret: number;
    fallbackRate: number;
  }>;
  byRouteMode: Array<{
    routeMode: string;
    count: number;
    avgComposite: number;
    blindSpotRate: number;
  }>;
}

export function summarizeRouteImpact(): RouteImpactSummary {
  const total = impactStore.length;
  if (total === 0) {
    return {
      totalDecisions: 0, avgCompositeScore: 0, avgConfidenceHaircut: 0,
      avgRouteRegret: 0, fallbackRate: 0, highRegretCount: 0,
      byFieldFamily: [], byRouteMode: [],
    };
  }

  const sumComposite = impactStore.reduce((s, r) => s + r.compositeScore, 0);
  const sumHaircut = impactStore.reduce((s, r) => s + r.confidenceHaircut, 0);
  const sumRegret = impactStore.reduce((s, r) => s + r.routeRegret, 0);
  const fbCount = impactStore.filter(r => r.fallbackUsed).length;
  const highRegret = impactStore.filter(r => r.routeRegret > 0.1).length;

  const ffGroups = new Map<string, RouteImpactRecord[]>();
  const rmGroups = new Map<string, RouteImpactRecord[]>();
  for (const r of impactStore) {
    ffGroups.set(r.fieldFamily, [...(ffGroups.get(r.fieldFamily) ?? []), r]);
    rmGroups.set(r.routeMode, [...(rmGroups.get(r.routeMode) ?? []), r]);
  }

  const byFF = Array.from(ffGroups).map(([ff, recs]) => ({
    fieldFamily: ff,
    count: recs.length,
    avgComposite: recs.reduce((s, r) => s + r.compositeScore, 0) / recs.length,
    avgRegret: recs.reduce((s, r) => s + r.routeRegret, 0) / recs.length,
    fallbackRate: recs.filter(r => r.fallbackUsed).length / recs.length,
  })).sort((a, b) => b.avgRegret - a.avgRegret);

  const byRM = Array.from(rmGroups).map(([rm, recs]) => ({
    routeMode: rm,
    count: recs.length,
    avgComposite: recs.reduce((s, r) => s + r.compositeScore, 0) / recs.length,
    blindSpotRate: recs.filter(r => r.blindSpotCount > 0).length / recs.length,
  })).sort((a, b) => b.blindSpotRate - a.blindSpotRate);

  return {
    totalDecisions: total,
    avgCompositeScore: sumComposite / total,
    avgConfidenceHaircut: sumHaircut / total,
    avgRouteRegret: sumRegret / total,
    fallbackRate: fbCount / total,
    highRegretCount: highRegret,
    byFieldFamily: byFF,
    byRouteMode: byRM,
  };
}

export function resetRouteImpactStore(): void {
  impactStore.length = 0;
  nextId = 1;
}
