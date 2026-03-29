/**
 * Calibration Aggregator — computes pattern-level trust surfaces.
 *
 * Segments evaluation by regime, cap bucket, contradiction band,
 * coverage band, and config version. Produces CalibrationAggregateRecords
 * and the unified TrustSurface.
 */

import type {
  JudgmentSnapshotRecord,
  ForwardOutcomeRecord,
  CalibrationAggregateRecord,
  TrustSurface,
  OutcomeWindow,
  SegmentType,
} from './types';
import { CALIBRATION_SPINE_VERSION } from './types';
import { evaluateScores } from './evaluators/score-evaluator';
import { evaluateConfidence } from './evaluators/confidence-evaluator';
import { evaluateHypotheses } from './evaluators/hypothesis-evaluator';
import { evaluateTiming } from './evaluators/timing-evaluator';
import { evaluateContradictions } from './evaluators/contradiction-evaluator';
import { compareVersions } from './evaluators/drift-evaluator';

interface Pair {
  snapshot: JudgmentSnapshotRecord;
  outcome: ForwardOutcomeRecord;
}

const aggregateStore: CalibrationAggregateRecord[] = [];
let nextAggId = 1;

function segmentPairs(
  pairs: Pair[],
  segmentType: SegmentType,
): Map<string, Pair[]> {
  const groups = new Map<string, Pair[]>();

  for (const pair of pairs) {
    let key: string;
    switch (segmentType) {
      case 'global':
        key = 'all';
        break;
      case 'regime':
        key = pair.snapshot.regimePrimary ?? 'unknown';
        break;
      case 'cap_bucket':
        key = 'unknown';
        break;
      case 'contradiction_band':
        key = classifyContradictionBand(pair.snapshot.contradictionLoad);
        break;
      case 'coverage_band':
        key = pair.snapshot.coverageScore >= 0.7 ? 'high' : pair.snapshot.coverageScore >= 0.4 ? 'medium' : 'low';
        break;
      case 'config_version':
        key = pair.snapshot.hypothesisConfigVersion ?? 'unknown';
        break;
      default:
        key = 'unknown';
    }

    const list = groups.get(key) ?? [];
    list.push(pair);
    groups.set(key, list);
  }

  return groups;
}

function classifyContradictionBand(load: number): string {
  if (load < 0.1) return 'clean';
  if (load < 0.25) return 'low';
  if (load < 0.45) return 'moderate';
  if (load < 0.65) return 'high';
  return 'severe';
}

function buildAggregate(
  pairs: Pair[],
  window: OutcomeWindow,
  segmentType: SegmentType,
  segmentValue: string,
): CalibrationAggregateRecord {
  const scores = evaluateScores(pairs);
  const confidence = evaluateConfidence(pairs);
  const hypotheses = evaluateHypotheses(pairs);
  const timing = evaluateTiming(pairs);
  const contradictions = evaluateContradictions(pairs);

  const versions = [...new Set(pairs.map(p => p.snapshot.hypothesisConfigVersion))];

  return {
    id: `ca-${nextAggId++}-${Date.now()}`,
    computedAt: new Date().toISOString(),
    window,
    segmentType,
    segmentValue,
    sampleCount: pairs.length,
    scoreMonotonicity: scores.monotonicity,
    scoreSeparation: scores.separation,
    confidenceCalibration: confidence.entries,
    hypothesisHitRates: hypotheses.hitRates,
    secondaryLaterWinRate: hypotheses.secondaryLaterWinRate,
    spreadInformativeness: hypotheses.spreadInformativeness,
    timingExpectancy: timing,
    contradictionImpact: contradictions,
    calibrationError: confidence.calibrationError,
    overconfidenceRate: confidence.overconfidenceRate,
    configVersion: versions.join(','),
    calibrationSpineVersion: CALIBRATION_SPINE_VERSION,
  };
}

export function computeAggregates(
  pairs: Pair[],
  window: OutcomeWindow,
  segments: SegmentType[] = ['global', 'regime', 'contradiction_band', 'coverage_band', 'config_version'],
): CalibrationAggregateRecord[] {
  const results: CalibrationAggregateRecord[] = [];

  for (const segType of segments) {
    const groups = segmentPairs(pairs, segType);
    for (const [value, groupPairs] of groups) {
      if (groupPairs.length < 5) continue;
      const agg = buildAggregate(groupPairs, window, segType, value);
      results.push(agg);
      aggregateStore.push(agg);
    }
  }

  if (aggregateStore.length > 1000) aggregateStore.splice(0, aggregateStore.length - 1000);
  return results;
}

export function buildTrustSurface(
  pairs: Pair[],
  window: OutcomeWindow,
): TrustSurface {
  const scores = evaluateScores(pairs);
  const confidence = evaluateConfidence(pairs);
  const hypotheses = evaluateHypotheses(pairs);
  const timing = evaluateTiming(pairs);
  const contradictions = evaluateContradictions(pairs);

  const versions = [...new Set(pairs.map(p => p.snapshot.hypothesisConfigVersion))];
  const drift = versions.length >= 2
    ? [compareVersions(pairs, versions[0], versions[versions.length - 1], window)]
    : [];

  return {
    scoreReliability: scores.monotonicity,
    confidenceAccountability: confidence.entries,
    hypothesisReliability: hypotheses.hitRates,
    contradictionSignificance: contradictions,
    timingUsefulness: timing,
    drift,
    computedAt: new Date().toISOString(),
    window,
    sampleCount: pairs.length,
  };
}

export function getRecentAggregates(window?: OutcomeWindow, limit = 50): CalibrationAggregateRecord[] {
  let filtered = aggregateStore;
  if (window) filtered = filtered.filter(a => a.window === window);
  return filtered.slice(-limit);
}
