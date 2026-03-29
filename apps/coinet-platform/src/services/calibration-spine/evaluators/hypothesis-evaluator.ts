/**
 * Hypothesis Evaluator — tests explanation quality.
 *
 * Measures primary hit rate, secondary later-win rate, spread informativeness,
 * ambiguity reliability, hypothesis bias, regime-conditioned quality.
 */

import type { JudgmentSnapshotRecord, ForwardOutcomeRecord, HypothesisHitRate } from '../types';

interface Pair {
  snapshot: JudgmentSnapshotRecord;
  outcome: ForwardOutcomeRecord;
}

const POSITIVE_RETURN_THRESHOLD = 0.02;

export function evaluateHypotheses(pairs: Pair[]): {
  hitRates: HypothesisHitRate[];
  secondaryLaterWinRate: number;
  spreadInformativeness: number;
} {
  const byHypothesis = new Map<string, {
    primaryCorrect: number;
    primaryTotal: number;
    returnsWhenPrimary: number[];
    returnsWhenWrong: number[];
    spreadsWhenCorrect: number[];
  }>();

  let secondaryLaterWins = 0;
  let secondaryTotal = 0;
  let wideSpreadCorrect = 0;
  let wideSpreadTotal = 0;
  let narrowSpreadCorrect = 0;
  let narrowSpreadTotal = 0;

  for (const { snapshot, outcome } of pairs) {
    const hyp = snapshot.primaryHypothesisId;
    if (!hyp) continue;

    const entry = byHypothesis.get(hyp) ?? {
      primaryCorrect: 0, primaryTotal: 0,
      returnsWhenPrimary: [], returnsWhenWrong: [],
      spreadsWhenCorrect: [],
    };
    entry.primaryTotal++;
    entry.returnsWhenPrimary.push(outcome.endReturn);

    const isHit = outcome.directionCorrect === true || outcome.endReturn > POSITIVE_RETURN_THRESHOLD;
    if (isHit) {
      entry.primaryCorrect++;
      if (snapshot.confidenceSpread != null) entry.spreadsWhenCorrect.push(snapshot.confidenceSpread);
    } else {
      entry.returnsWhenWrong.push(outcome.endReturn);
    }

    byHypothesis.set(hyp, entry);

    if (snapshot.secondaryHypothesisId) {
      secondaryTotal++;
      if (!isHit && outcome.endReturn < -POSITIVE_RETURN_THRESHOLD) {
        secondaryLaterWins++;
      }
    }

    const spread = snapshot.confidenceSpread ?? 0;
    if (spread > 0.15) {
      wideSpreadTotal++;
      if (isHit) wideSpreadCorrect++;
    } else {
      narrowSpreadTotal++;
      if (isHit) narrowSpreadCorrect++;
    }
  }

  const hitRates: HypothesisHitRate[] = [];
  for (const [hypothesisId, data] of byHypothesis) {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    hitRates.push({
      hypothesisId,
      count: data.primaryTotal,
      hitRate: data.primaryTotal > 0 ? data.primaryCorrect / data.primaryTotal : 0,
      avgReturnWhenPrimary: avg(data.returnsWhenPrimary),
      avgReturnWhenWrong: avg(data.returnsWhenWrong),
      avgSpreadWhenCorrect: avg(data.spreadsWhenCorrect),
    });
  }

  hitRates.sort((a, b) => b.count - a.count);

  const wideRate = wideSpreadTotal > 0 ? wideSpreadCorrect / wideSpreadTotal : 0;
  const narrowRate = narrowSpreadTotal > 0 ? narrowSpreadCorrect / narrowSpreadTotal : 0;
  const spreadInformativeness = wideRate - narrowRate;

  return {
    hitRates,
    secondaryLaterWinRate: secondaryTotal > 0 ? secondaryLaterWins / secondaryTotal : 0,
    spreadInformativeness,
  };
}
