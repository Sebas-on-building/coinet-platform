/**
 * Contradiction Evaluator — tests whether contradiction load carries predictive value.
 *
 * Measures outcome degradation, failure rate, reliability collapse by band.
 */

import type { JudgmentSnapshotRecord, ForwardOutcomeRecord, ContradictionImpactEntry } from '../types';

interface Pair {
  snapshot: JudgmentSnapshotRecord;
  outcome: ForwardOutcomeRecord;
}

const CONTRADICTION_BANDS = [
  { name: 'clean', min: 0, max: 0.1 },
  { name: 'low', min: 0.1, max: 0.25 },
  { name: 'moderate', min: 0.25, max: 0.45 },
  { name: 'high', min: 0.45, max: 0.65 },
  { name: 'severe', min: 0.65, max: 1.01 },
];

function classifyBand(load: number): string {
  for (const band of CONTRADICTION_BANDS) {
    if (load >= band.min && load < band.max) return band.name;
  }
  return 'severe';
}

export function evaluateContradictions(pairs: Pair[]): ContradictionImpactEntry[] {
  const byBand = new Map<string, {
    returns: number[];
    drawdowns: number[];
    failures: number;
  }>();

  for (const b of CONTRADICTION_BANDS) {
    byBand.set(b.name, { returns: [], drawdowns: [], failures: 0 });
  }

  for (const { snapshot, outcome } of pairs) {
    const band = classifyBand(snapshot.contradictionLoad);
    const entry = byBand.get(band)!;
    entry.returns.push(outcome.endReturn);
    entry.drawdowns.push(outcome.maxDrawdown);
    if (outcome.directionCorrect === false) entry.failures++;
  }

  const entries: ContradictionImpactEntry[] = [];
  const cleanEntry = byBand.get('clean');
  const cleanAvg = cleanEntry && cleanEntry.returns.length > 0
    ? cleanEntry.returns.reduce((s, v) => s + v, 0) / cleanEntry.returns.length
    : 0;

  for (const band of CONTRADICTION_BANDS) {
    const data = byBand.get(band.name)!;
    const count = data.returns.length;
    if (count === 0) {
      entries.push({ band: band.name, count: 0, avgReturn: 0, failureRate: 0, avgDrawdown: 0, reliabilityDelta: 0 });
      continue;
    }
    const avgReturn = data.returns.reduce((s, v) => s + v, 0) / count;
    entries.push({
      band: band.name,
      count,
      avgReturn,
      failureRate: data.failures / count,
      avgDrawdown: data.drawdowns.reduce((s, v) => s + v, 0) / count,
      reliabilityDelta: avgReturn - cleanAvg,
    });
  }

  return entries;
}
