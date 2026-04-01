/**
 * Substitution Memory — Strategy E: log substitution events for
 * later evaluation, governance, and calibration.
 */

import type { SubstitutionEvent, SubstitutionMode } from './types';

const MAX_MEMORY_SIZE = 5000;
const events: SubstitutionEvent[] = [];

export function recordSubstitutionEvent(
  truthAtomId: string,
  fromSource: string,
  toSource: string | null,
  mode: SubstitutionMode,
  reason: string,
): void {
  events.push({
    timestamp: new Date().toISOString(),
    truthAtomId,
    fromSource,
    toSource,
    mode,
    reason,
  });

  if (events.length > MAX_MEMORY_SIZE) {
    events.splice(0, events.length - MAX_MEMORY_SIZE);
  }
}

export function getRecentEvents(limit: number = 100): SubstitutionEvent[] {
  return events.slice(-limit);
}

export function getEventsForAtom(truthAtomId: string, limit: number = 50): SubstitutionEvent[] {
  return events.filter(e => e.truthAtomId === truthAtomId).slice(-limit);
}

export function getSubstitutionFrequency(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.truthAtomId] = (counts[e.truthAtomId] ?? 0) + 1;
  }
  return counts;
}

export function getMostFragileAtoms(topN: number = 10): Array<{ atomId: string; count: number }> {
  const freq = getSubstitutionFrequency();
  return Object.entries(freq)
    .map(([atomId, count]) => ({ atomId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export function getBlindEventCount(): number {
  return events.filter(e => e.mode === 'NO_FALLBACK').length;
}

export function clearMemory(): void {
  events.length = 0;
}
