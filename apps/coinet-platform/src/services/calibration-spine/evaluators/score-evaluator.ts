/**
 * Score Evaluator — tests whether score ordering carries forward meaning.
 *
 * Measures monotonicity, separation, bucket lift, downside profile.
 */

import type { JudgmentSnapshotRecord, ForwardOutcomeRecord, ScoreMonotonicity, ScoreSeparation, BucketPerformance } from '../types';

interface Pair {
  snapshot: JudgmentSnapshotRecord;
  outcome: ForwardOutcomeRecord;
}

const SCORE_BUCKETS = ['0-20', '20-40', '40-60', '60-80', '80-100'];

function toBucket(score: number): string {
  if (score < 20) return '0-20';
  if (score < 40) return '20-40';
  if (score < 60) return '40-60';
  if (score < 80) return '60-80';
  return '80-100';
}

function computeBucketPerformance(pairs: Pair[], extract: (s: JudgmentSnapshotRecord) => number | undefined): BucketPerformance[] {
  const buckets = new Map<string, { returns: number[]; drawdowns: number[] }>();
  for (const b of SCORE_BUCKETS) buckets.set(b, { returns: [], drawdowns: [] });

  for (const { snapshot, outcome } of pairs) {
    const score = extract(snapshot);
    if (score == null) continue;
    const bucket = toBucket(score);
    const entry = buckets.get(bucket)!;
    entry.returns.push(outcome.endReturn);
    entry.drawdowns.push(outcome.maxDrawdown);
  }

  return SCORE_BUCKETS.map(bucket => {
    const { returns, drawdowns } = buckets.get(bucket)!;
    const count = returns.length;
    if (count === 0) return { bucket, count: 0, avgReturn: 0, medianReturn: 0, maxDrawdown: 0, positiveRate: 0 };
    const sorted = [...returns].sort((a, b) => a - b);
    return {
      bucket, count,
      avgReturn: returns.reduce((s, v) => s + v, 0) / count,
      medianReturn: sorted[Math.floor(count / 2)],
      maxDrawdown: drawdowns.reduce((s, v) => s + v, 0) / count,
      positiveRate: returns.filter(r => r > 0).length / count,
    };
  });
}

function isMonotonic(curve: BucketPerformance[]): boolean {
  const nonEmpty = curve.filter(b => b.count >= 3);
  if (nonEmpty.length < 3) return false;
  let increasing = 0;
  for (let i = 1; i < nonEmpty.length; i++) {
    if (nonEmpty[i].avgReturn >= nonEmpty[i - 1].avgReturn) increasing++;
  }
  return increasing >= (nonEmpty.length - 1) * 0.6;
}

function computeSeparation(curve: BucketPerformance[]): number {
  const nonEmpty = curve.filter(b => b.count >= 3);
  if (nonEmpty.length < 2) return 0;
  return nonEmpty[nonEmpty.length - 1].avgReturn - nonEmpty[0].avgReturn;
}

export function evaluateScores(pairs: Pair[]): { monotonicity: ScoreMonotonicity; separation: ScoreSeparation } {
  const osCurve = computeBucketPerformance(pairs, s => s.opportunityScore);
  const riskCurve = computeBucketPerformance(pairs, s => s.riskScore);
  const timingCurve = computeBucketPerformance(pairs, s => s.timingScore);

  return {
    monotonicity: {
      opportunityMonotonic: isMonotonic(osCurve),
      opportunityCurve: osCurve,
      riskMonotonic: isMonotonic(riskCurve),
      riskCurve,
      timingMonotonic: isMonotonic(timingCurve),
      timingCurve,
    },
    separation: {
      opportunityTopVsBottom: computeSeparation(osCurve),
      riskTopVsBottom: computeSeparation(riskCurve),
      timingTopVsBottom: computeSeparation(timingCurve),
    },
  };
}
