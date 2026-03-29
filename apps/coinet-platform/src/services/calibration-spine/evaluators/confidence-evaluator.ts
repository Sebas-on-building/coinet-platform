/**
 * Confidence Evaluator — tests whether confidence bands deserve their names.
 *
 * Measures calibration error, overconfidence zones, coverage-adjusted accuracy.
 */

import type { JudgmentSnapshotRecord, ForwardOutcomeRecord, ConfidenceCalibrationEntry } from '../types';

interface Pair {
  snapshot: JudgmentSnapshotRecord;
  outcome: ForwardOutcomeRecord;
}

const CONFIDENCE_BANDS = [
  { name: 'very_high', min: 0.85, expectedAccuracy: 0.85 },
  { name: 'high', min: 0.70, expectedAccuracy: 0.70 },
  { name: 'medium', min: 0.50, expectedAccuracy: 0.55 },
  { name: 'low', min: 0.30, expectedAccuracy: 0.40 },
  { name: 'very_low', min: 0, expectedAccuracy: 0.30 },
];

function classifyBand(confidence: number): typeof CONFIDENCE_BANDS[number] {
  for (const band of CONFIDENCE_BANDS) {
    if (confidence >= band.min) return band;
  }
  return CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1];
}

export function evaluateConfidence(pairs: Pair[]): {
  entries: ConfidenceCalibrationEntry[];
  calibrationError: number;
  overconfidenceRate: number;
} {
  const buckets = new Map<string, {
    band: typeof CONFIDENCE_BANDS[number];
    correct: number;
    total: number;
    absReturns: number[];
  }>();

  for (const b of CONFIDENCE_BANDS) {
    buckets.set(b.name, { band: b, correct: 0, total: 0, absReturns: [] });
  }

  for (const { snapshot, outcome } of pairs) {
    const conf = snapshot.signalConfidence;
    if (conf == null) continue;
    const band = classifyBand(conf);
    const entry = buckets.get(band.name)!;

    entry.total++;
    entry.absReturns.push(Math.abs(outcome.endReturn));

    if (outcome.directionCorrect === true) entry.correct++;
  }

  const entries: ConfidenceCalibrationEntry[] = [];
  let totalCalibrationError = 0;
  let overconfidentCount = 0;
  let totalWithData = 0;

  for (const [, bucket] of buckets) {
    const count = bucket.total;
    const actualAccuracy = count > 0 ? bucket.correct / count : 0;
    const gap = actualAccuracy - bucket.band.expectedAccuracy;
    const avgAbsReturn = bucket.absReturns.length > 0
      ? bucket.absReturns.reduce((s, v) => s + v, 0) / bucket.absReturns.length
      : 0;

    entries.push({
      band: bucket.band.name,
      count,
      expectedAccuracy: bucket.band.expectedAccuracy,
      actualAccuracy,
      calibrationGap: gap,
      avgAbsReturn,
    });

    if (count >= 3) {
      totalCalibrationError += Math.abs(gap) * count;
      totalWithData += count;
      if (gap < -0.1) overconfidentCount += count;
    }
  }

  return {
    entries,
    calibrationError: totalWithData > 0 ? totalCalibrationError / totalWithData : 0,
    overconfidenceRate: totalWithData > 0 ? overconfidentCount / totalWithData : 0,
  };
}
