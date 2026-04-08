/**
 * Layer 2 — Lineage Fitness Score
 *
 * Quantifies the quality of the ingress evidence spine supporting a
 * request or judgment. Layer 2 should not only deliver evidence — it
 * should rate how trustworthy that evidence spine is before higher
 * layers turn it into strong conclusions.
 *
 * This should later feed Signal Confidence, because the whitepaper
 * makes source freshness, contradictions, data coverage, and
 * missing-source effects part of confidence.
 */

import type { BlindSpotRecord } from './blindspot-engine';

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE FITNESS SCORE
// ═══════════════════════════════════════════════════════════════════════════════

export interface LineageFitnessScore {
  requestId: string;
  traceId: string;
  score: number;
  ownerPathCoverage: number;
  confirmerCoverage: number;
  freshnessFitness: number;
  routeIntegrity: number;
  traceCompleteness: number;
  blindSpotPenalty: number;
  replayRecoverability: number;
  reasonCodes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface LineageFitnessInput {
  requestId: string;
  traceId: string;

  requestedFieldFamilies: number;
  observedFieldFamilies: number;
  ownerPathPresent: number;
  ownerPathExpected: number;
  confirmerPresent: number;
  confirmerExpected: number;

  survivingEnvelopes: number;
  totalEnvelopes: number;

  freshnessF0F1Count: number;
  freshnessF2Count: number;
  freshnessF3F4Count: number;
  totalFreshnessEvaluations: number;

  routeDegraded: number;
  routeTotal: number;
  fallbacksUsed: number;
  fallbacksEquivalent: number;

  traceNodesComplete: number;
  traceNodesExpected: number;
  lineagePackPresent: boolean;

  blindSpots: BlindSpotRecord[];

  rawPayloadRecoverable: number;
  rawPayloadTotal: number;
  replayPinned: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function computeLineageFitness(input: LineageFitnessInput): LineageFitnessScore {
  const reasons: string[] = [];

  const ownerCov = input.ownerPathExpected > 0
    ? input.ownerPathPresent / input.ownerPathExpected : 1;
  if (ownerCov < 1) reasons.push(`Owner coverage: ${(ownerCov * 100).toFixed(0)}%`);

  const confirmerCov = input.confirmerExpected > 0
    ? input.confirmerPresent / input.confirmerExpected : 1;
  if (confirmerCov < 0.5) reasons.push(`Confirmer coverage low: ${(confirmerCov * 100).toFixed(0)}%`);

  let freshFit = 1;
  if (input.totalFreshnessEvaluations > 0) {
    const goodFrac = input.freshnessF0F1Count / input.totalFreshnessEvaluations;
    const okFrac = input.freshnessF2Count / input.totalFreshnessEvaluations;
    const badFrac = input.freshnessF3F4Count / input.totalFreshnessEvaluations;
    freshFit = goodFrac + okFrac * 0.5 - badFrac * 0.3;
    freshFit = Math.max(0, Math.min(1, freshFit));
    if (badFrac > 0.3) reasons.push(`${(badFrac * 100).toFixed(0)}% freshness stale/unusable`);
  }

  let routeInt = 1;
  if (input.routeTotal > 0) {
    const degradedFrac = input.routeDegraded / input.routeTotal;
    const fbNonEq = input.fallbacksUsed > 0
      ? 1 - (input.fallbacksEquivalent / input.fallbacksUsed) : 0;
    routeInt = 1 - degradedFrac * 0.4 - fbNonEq * 0.3;
    routeInt = Math.max(0, Math.min(1, routeInt));
    if (degradedFrac > 0.2) reasons.push(`${(degradedFrac * 100).toFixed(0)}% routes degraded`);
  }

  let traceCom = input.lineagePackPresent ? 0.5 : 0;
  if (input.traceNodesExpected > 0) {
    traceCom += 0.5 * (input.traceNodesComplete / input.traceNodesExpected);
  } else {
    traceCom = input.lineagePackPresent ? 1 : 0;
  }
  if (traceCom < 0.8) reasons.push(`Trace completeness: ${(traceCom * 100).toFixed(0)}%`);

  let bsPenalty = 0;
  for (const bs of input.blindSpots) {
    switch (bs.severity) {
      case 'CRITICAL': bsPenalty += 0.20; break;
      case 'HIGH': bsPenalty += 0.12; break;
      case 'MEDIUM': bsPenalty += 0.05; break;
      case 'LOW': bsPenalty += 0.02; break;
    }
  }
  bsPenalty = Math.min(bsPenalty, 0.6);
  if (bsPenalty > 0.1) reasons.push(`Blind-spot penalty: ${(bsPenalty * 100).toFixed(0)}%`);

  let replayRec = input.replayPinned ? 0.5 : 0;
  if (input.rawPayloadTotal > 0) {
    replayRec += 0.5 * (input.rawPayloadRecoverable / input.rawPayloadTotal);
  } else {
    replayRec = input.replayPinned ? 1 : 0;
  }
  if (replayRec < 0.8) reasons.push(`Replay recoverability: ${(replayRec * 100).toFixed(0)}%`);

  const rawScore =
    ownerCov * 25 +
    confirmerCov * 10 +
    freshFit * 20 +
    routeInt * 15 +
    traceCom * 15 +
    replayRec * 15 -
    bsPenalty * 100;

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  if (score >= 90) reasons.unshift('EXCELLENT');
  else if (score >= 70) reasons.unshift('GOOD');
  else if (score >= 50) reasons.unshift('ADEQUATE');
  else reasons.unshift('POOR');

  return {
    requestId: input.requestId,
    traceId: input.traceId,
    score,
    ownerPathCoverage: ownerCov,
    confirmerCoverage: confirmerCov,
    freshnessFitness: freshFit,
    routeIntegrity: routeInt,
    traceCompleteness: traceCom,
    blindSpotPenalty: bsPenalty,
    replayRecoverability: replayRec,
    reasonCodes: reasons,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

const fitnessStore: LineageFitnessScore[] = [];

export function recordLineageFitness(score: LineageFitnessScore): void {
  fitnessStore.push(score);
}

export function getLineageFitnessScores(): LineageFitnessScore[] {
  return [...fitnessStore];
}

export function getLineageFitnessForRequest(reqId: string): LineageFitnessScore | undefined {
  return fitnessStore.find(s => s.requestId === reqId);
}

export function getAverageLineageFitness(): number {
  if (fitnessStore.length === 0) return 0;
  return fitnessStore.reduce((s, f) => s + f.score, 0) / fitnessStore.length;
}

export function getLineageFitnessBelowThreshold(threshold: number): LineageFitnessScore[] {
  return fitnessStore.filter(s => s.score < threshold);
}

export function resetLineageFitnessStore(): void {
  fitnessStore.length = 0;
}
