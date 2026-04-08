/**
 * Layer 2 — Shadow Routing
 *
 * Runs the chosen route and one shadow alternative on a controlled
 * fraction of traffic. Compares truth fidelity, freshness fitness,
 * blind spots, cost, and downstream claim rights. Proves whether the
 * route planner is actually superior.
 */

import type { BlindSpotRecord } from './blindspot-engine';

// ═══════════════════════════════════════════════════════════════════════════════
// SHADOW EXECUTION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShadowRouteResult {
  routeId: string;
  routeMode: string;
  connector: string;
  truthFidelityScore: number;
  freshnessFitnessScore: number;
  failureResilienceScore: number;
  costDisciplineScore: number;
  compositeScore: number;
  blindSpotCount: number;
  blindSpotSeverityMax?: string;
  claimRestrictions: string[];
  executionMs: number;
}

export interface RouteBenchmarkResult {
  benchmarkId: string;
  requestId: string;
  fieldFamily: string;
  chosenRoute: ShadowRouteResult;
  shadowRoute: ShadowRouteResult;
  chosenLineageFitness: number;
  shadowLineageFitness: number;
  chosenBlindSpotSeverity: number;
  shadowBlindSpotSeverity: number;
  chosenCost: number;
  shadowCost: number;
  plannerDecisionCorrect: boolean;
  regret: number;
  avoidableBlindSpots: number;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHADOW EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShadowExecutionInput {
  requestId: string;
  fieldFamily: string;
  chosen: ShadowRouteResult;
  shadow: ShadowRouteResult;
  chosenFitness: number;
  shadowFitness: number;
}

let nextBenchId = 1;

export function executeShadowBenchmark(input: ShadowExecutionInput): RouteBenchmarkResult {
  const sevScore = (sev?: string): number => {
    switch (sev) { case 'CRITICAL': return 4; case 'HIGH': return 3; case 'MEDIUM': return 2; case 'LOW': return 1; default: return 0; }
  };

  const chosenBsSev = sevScore(input.chosen.blindSpotSeverityMax);
  const shadowBsSev = sevScore(input.shadow.blindSpotSeverityMax);

  const regret = Math.max(0, input.shadow.compositeScore - input.chosen.compositeScore);
  const avoidable = Math.max(0, input.chosen.blindSpotCount - input.shadow.blindSpotCount);

  const plannerCorrect = input.chosen.compositeScore >= input.shadow.compositeScore - 0.02;

  return {
    benchmarkId: `sb-${nextBenchId++}`,
    requestId: input.requestId,
    fieldFamily: input.fieldFamily,
    chosenRoute: input.chosen,
    shadowRoute: input.shadow,
    chosenLineageFitness: input.chosenFitness,
    shadowLineageFitness: input.shadowFitness,
    chosenBlindSpotSeverity: chosenBsSev,
    shadowBlindSpotSeverity: shadowBsSev,
    chosenCost: input.chosen.costDisciplineScore,
    shadowCost: input.shadow.costDisciplineScore,
    plannerDecisionCorrect: plannerCorrect,
    regret,
    avoidableBlindSpots: avoidable,
    createdAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK STORE
// ═══════════════════════════════════════════════════════════════════════════════

const benchmarkStore: RouteBenchmarkResult[] = [];

export function recordBenchmark(b: RouteBenchmarkResult): void {
  benchmarkStore.push(b);
}

export function getBenchmarks(): RouteBenchmarkResult[] {
  return [...benchmarkStore];
}

export function getBenchmarksByFieldFamily(ff: string): RouteBenchmarkResult[] {
  return benchmarkStore.filter(b => b.fieldFamily === ff);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLANNER CORRECTNESS REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlannerCorrectnessReport {
  totalBenchmarks: number;
  correctDecisions: number;
  incorrectDecisions: number;
  correctnessRate: number;
  avgRegret: number;
  maxRegret: number;
  totalAvoidableBlindSpots: number;
  byFieldFamily: Array<{
    fieldFamily: string;
    count: number;
    correctnessRate: number;
    avgRegret: number;
  }>;
}

export function computePlannerCorrectness(): PlannerCorrectnessReport {
  const total = benchmarkStore.length;
  if (total === 0) {
    return {
      totalBenchmarks: 0, correctDecisions: 0, incorrectDecisions: 0,
      correctnessRate: 1, avgRegret: 0, maxRegret: 0, totalAvoidableBlindSpots: 0,
      byFieldFamily: [],
    };
  }

  const correct = benchmarkStore.filter(b => b.plannerDecisionCorrect).length;
  const sumRegret = benchmarkStore.reduce((s, b) => s + b.regret, 0);
  const maxRegret = Math.max(...benchmarkStore.map(b => b.regret));
  const totalAvoidable = benchmarkStore.reduce((s, b) => s + b.avoidableBlindSpots, 0);

  const ffGroups = new Map<string, RouteBenchmarkResult[]>();
  for (const b of benchmarkStore) {
    ffGroups.set(b.fieldFamily, [...(ffGroups.get(b.fieldFamily) ?? []), b]);
  }

  const byFF = Array.from(ffGroups).map(([ff, recs]) => ({
    fieldFamily: ff,
    count: recs.length,
    correctnessRate: recs.filter(r => r.plannerDecisionCorrect).length / recs.length,
    avgRegret: recs.reduce((s, r) => s + r.regret, 0) / recs.length,
  })).sort((a, b) => a.correctnessRate - b.correctnessRate);

  return {
    totalBenchmarks: total,
    correctDecisions: correct,
    incorrectDecisions: total - correct,
    correctnessRate: correct / total,
    avgRegret: sumRegret / total,
    maxRegret,
    totalAvoidableBlindSpots: totalAvoidable,
    byFieldFamily: byFF,
  };
}

export function resetShadowRouting(): void {
  benchmarkStore.length = 0;
  nextBenchId = 1;
}
