/**
 * Timing Evaluator — tests whether lifecycle classification has measurable expectancy.
 *
 * Measures expectancy by timing band, continuation rate, drawdown profile.
 */

import type { JudgmentSnapshotRecord, ForwardOutcomeRecord, TimingExpectancyEntry } from '../types';

interface Pair {
  snapshot: JudgmentSnapshotRecord;
  outcome: ForwardOutcomeRecord;
}

export function evaluateTiming(pairs: Pair[]): TimingExpectancyEntry[] {
  const byPhase = new Map<string, {
    returns: number[];
    drawdowns: number[];
    continuations: number;
  }>();

  for (const { snapshot, outcome } of pairs) {
    const phase = snapshot.timingPhase ?? 'unknown';
    const entry = byPhase.get(phase) ?? { returns: [], drawdowns: [], continuations: 0 };
    entry.returns.push(outcome.endReturn);
    entry.drawdowns.push(outcome.maxDrawdown);
    if (outcome.continuationStrength > 0.5) entry.continuations++;
    byPhase.set(phase, entry);
  }

  const results: TimingExpectancyEntry[] = [];
  for (const [phase, data] of byPhase) {
    const count = data.returns.length;
    if (count === 0) continue;
    results.push({
      phase,
      count,
      avgReturn: data.returns.reduce((s, v) => s + v, 0) / count,
      continuationRate: data.continuations / count,
      avgDrawdown: data.drawdowns.reduce((s, v) => s + v, 0) / count,
    });
  }

  results.sort((a, b) => b.count - a.count);
  return results;
}
