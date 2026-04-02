/**
 * L1.4 — Historical Reliability Tracker
 *
 * Rolling memory of source performance. Updates slowly and conservatively.
 * One bad run does not destroy trust. One good run does not create it.
 */

import type { ReliabilityMemoryEntry, HistoricalReliabilitySnapshot } from './source-health-types';

const ROLLING_WINDOW = 50;

const memoryStore = new Map<string, ReliabilityMemoryEntry[]>();

export function recordReliabilityEvent(
  sourceId: string,
  event: Omit<ReliabilityMemoryEntry, 'sourceId'>,
): void {
  let entries = memoryStore.get(sourceId);
  if (!entries) {
    entries = [];
    memoryStore.set(sourceId, entries);
  }
  entries.push({ ...event, sourceId });
  if (entries.length > ROLLING_WINDOW) {
    entries.splice(0, entries.length - ROLLING_WINDOW);
  }
}

export function getReliabilitySnapshot(sourceId: string): HistoricalReliabilitySnapshot {
  const entries = memoryStore.get(sourceId) ?? [];
  const count = entries.length;

  if (count === 0) {
    return {
      sourceId,
      windowSize: ROLLING_WINDOW,
      entries: 0,
      successRate: 0.5,
      schemaStability: 0.5,
      lowConflictRate: 0.5,
      freshnessConsistency: 0.5,
      correctionCleanliness: 0.5,
      compositeReliability: 0.5,
    };
  }

  const successRate = entries.filter(e => e.success).length / count;
  const schemaStability = entries.filter(e => e.schemaValid).length / count;
  const lowConflictRate = 1 - (entries.filter(e => e.conflicted).length / count);
  const correctionCleanliness = 1 - (entries.filter(e => e.corrected).length / count);

  // Freshness consistency: fraction of entries where success happened with reasonable spacing
  const successEntries = entries.filter(e => e.success);
  let freshnessConsistency = 0.5;
  if (successEntries.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < successEntries.length; i++) {
      gaps.push(successEntries[i].timestamp - successEntries[i - 1].timestamp);
    }
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (meanGap > 0) {
      const variance = gaps.reduce((sum, g) => sum + Math.pow(g - meanGap, 2), 0) / gaps.length;
      const cv = Math.sqrt(variance) / meanGap;
      freshnessConsistency = Math.max(0, Math.min(1, 1 - cv));
    }
  }

  const compositeReliability =
    0.35 * successRate +
    0.20 * schemaStability +
    0.20 * lowConflictRate +
    0.15 * freshnessConsistency +
    0.10 * correctionCleanliness;

  return {
    sourceId,
    windowSize: ROLLING_WINDOW,
    entries: count,
    successRate: round(successRate),
    schemaStability: round(schemaStability),
    lowConflictRate: round(lowConflictRate),
    freshnessConsistency: round(freshnessConsistency),
    correctionCleanliness: round(correctionCleanliness),
    compositeReliability: round(compositeReliability),
  };
}

export function getReliabilityEntryCount(sourceId: string): number {
  return (memoryStore.get(sourceId) ?? []).length;
}

export function clearReliabilityMemory(sourceId?: string): void {
  if (sourceId) {
    memoryStore.delete(sourceId);
  } else {
    memoryStore.clear();
  }
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
