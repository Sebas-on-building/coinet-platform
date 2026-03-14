/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     OUTCOME TRACKER                                                           ║
 * ║                                                                               ║
 * ║   Records what actually happened after a judgment/score was produced.         ║
 * ║   Correlates predictions with outcomes to enable calibration.                ║
 * ║                                                                               ║
 * ║   Flow:                                                                      ║
 * ║   1. Score/judgment is produced → snapshot captured                          ║
 * ║   2. Outcome window passes (24h, 7d, 30d)                                   ║
 * ║   3. Actual price/state change recorded as Outcome                           ║
 * ║   4. Direction correctness + error magnitude computed                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Outcome, OutcomeType, ScoreSnapshot } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORES (production: backed by PostgreSQL)
// ═══════════════════════════════════════════════════════════════════════════════

const snapshots = new Map<string, ScoreSnapshot[]>();
const outcomes = new Map<string, Outcome[]>();

let nextOutcomeId = 1;

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Capture a score snapshot at the time of production.
 * Should be called by the scoring pipeline after every score is computed.
 */
export function captureSnapshot(snapshot: ScoreSnapshot): void {
  const list = snapshots.get(snapshot.entityId) ?? [];
  list.push(snapshot);

  if (list.length > 500) list.splice(0, list.length - 500);

  snapshots.set(snapshot.entityId, list);
}

/**
 * Retrieve snapshots for an entity within a time range.
 */
export function getSnapshots(entityId: string, fromTs?: number, toTs?: number): ScoreSnapshot[] {
  const list = snapshots.get(entityId) ?? [];
  return list.filter(s => {
    if (fromTs && s.timestamp < fromTs) return false;
    if (toTs && s.timestamp > toTs) return false;
    return true;
  });
}

/**
 * Retrieve all snapshots across all entities (for drift monitoring).
 */
export function getAllRecentSnapshots(windowMs: number): ScoreSnapshot[] {
  const cutoff = Date.now() - windowMs;
  const all: ScoreSnapshot[] = [];
  for (const list of snapshots.values()) {
    for (const s of list) {
      if (s.timestamp >= cutoff) all.push(s);
    }
  }
  return all;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOME RECORDING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record an observed outcome.
 *
 * The direction correctness is determined by comparing the predicted score bias
 * against the actual outcome:
 * - Score > 60 (bullish bias) + positive price change → direction correct
 * - Score < 40 (bearish bias) + negative price change → direction correct
 * - Score 40-60 (neutral) → direction is null (no strong prediction)
 */
export function recordOutcome(params: {
  entityId: string;
  type: OutcomeType;
  value: number;
  evidence: string;
  snapshotTimestamp?: number;
}): Outcome {
  const entitySnapshots = snapshots.get(params.entityId) ?? [];

  let matchingSnapshot: ScoreSnapshot | undefined;
  if (params.snapshotTimestamp) {
    matchingSnapshot = entitySnapshots.find(s => s.timestamp === params.snapshotTimestamp);
  } else {
    matchingSnapshot = entitySnapshots[entitySnapshots.length - 1];
  }

  let directionCorrect: boolean | null = null;
  if (matchingSnapshot && isPriceOutcome(params.type)) {
    const scoreBias = matchingSnapshot.pos;
    if (scoreBias > 60 && params.value > 0) directionCorrect = true;
    else if (scoreBias < 40 && params.value < 0) directionCorrect = true;
    else if (scoreBias > 60 && params.value < 0) directionCorrect = false;
    else if (scoreBias < 40 && params.value > 0) directionCorrect = false;
  }

  const outcome: Outcome = {
    id: `outcome-${nextOutcomeId++}`,
    entityId: params.entityId,
    type: params.type,
    observedAt: Date.now(),
    snapshotTimestamp: matchingSnapshot?.timestamp ?? Date.now(),
    value: params.value,
    directionCorrect,
    evidence: params.evidence,
  };

  const list = outcomes.get(params.entityId) ?? [];
  list.push(outcome);
  if (list.length > 1000) list.splice(0, list.length - 1000);
  outcomes.set(params.entityId, list);

  return outcome;
}

/**
 * Retrieve outcomes for an entity.
 */
export function getOutcomes(
  entityId: string,
  type?: OutcomeType,
  fromTs?: number,
): Outcome[] {
  const list = outcomes.get(entityId) ?? [];
  return list.filter(o => {
    if (type && o.type !== type) return false;
    if (fromTs && o.observedAt < fromTs) return false;
    return true;
  });
}

/**
 * Retrieve all outcomes across entities for calibration.
 */
export function getAllOutcomes(type?: OutcomeType, fromTs?: number): Outcome[] {
  const all: Outcome[] = [];
  for (const list of outcomes.values()) {
    for (const o of list) {
      if (type && o.type !== type) continue;
      if (fromTs && o.observedAt < fromTs) continue;
      all.push(o);
    }
  }
  return all;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOME COLLECTION JOBS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PriceProvider {
  getCurrentPrice(entityId: string): Promise<number | null>;
}

/**
 * Scheduled job: evaluate 24h outcomes for all tracked entities.
 *
 * For each entity with a snapshot older than 24h that doesn't yet have
 * a matching 24h outcome, fetch the current price and record the outcome.
 */
export async function collect24hOutcomes(priceProvider: PriceProvider): Promise<number> {
  const windowMs = 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - windowMs;
  let collected = 0;

  for (const [entityId, entitySnapshots] of snapshots.entries()) {
    const eligibleSnapshots = entitySnapshots.filter(s => s.timestamp <= cutoff);
    const entityOutcomes = outcomes.get(entityId) ?? [];

    for (const snap of eligibleSnapshots) {
      const hasOutcome = entityOutcomes.some(
        o => o.type === 'price_change_24h' && Math.abs(o.snapshotTimestamp - snap.timestamp) < 60_000
      );

      if (!hasOutcome) {
        const currentPrice = await priceProvider.getCurrentPrice(entityId);
        if (currentPrice !== null && snap.priceAtSnapshot !== null && snap.priceAtSnapshot > 0) {
          const priceChange = ((currentPrice - snap.priceAtSnapshot) / snap.priceAtSnapshot) * 100;
          recordOutcome({
            entityId,
            type: 'price_change_24h',
            value: priceChange,
            evidence: `Auto-collected 24h outcome. Price at snapshot: $${snap.priceAtSnapshot.toFixed(4)}, price at collection: $${currentPrice.toFixed(4)}, change: ${priceChange.toFixed(2)}%`,
            snapshotTimestamp: snap.timestamp,
          });
          collected++;
        }
      }
    }
  }

  return collected;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function isPriceOutcome(type: OutcomeType): boolean {
  return type === 'price_change_24h' || type === 'price_change_7d' || type === 'price_change_30d';
}
