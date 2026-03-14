/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     FEEDBACK INTEGRATOR & CALIBRATION REPORT GENERATOR                        ║
 * ║                                                                               ║
 * ║   Closes the loop:                                                           ║
 * ║   1. Aggregates user feedback signals                                        ║
 * ║   2. Correlates outcomes with predictions                                    ║
 * ║   3. Produces calibration reports                                            ║
 * ║   4. Generates actionable weight/threshold adjustment recommendations        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  UserFeedback,
  FeedbackType,
  Outcome,
  ScoreSnapshot,
  CalibrationReport,
  ConfidenceBucket,
  RegimePerformance,
  HypothesisPerformance,
} from './types';
import { detectDrift } from './drift-monitor';
import { getAllOutcomes, getAllRecentSnapshots } from './outcome-tracker';

// ═══════════════════════════════════════════════════════════════════════════════
// USER FEEDBACK STORE
// ═══════════════════════════════════════════════════════════════════════════════

const feedbackStore: UserFeedback[] = [];
let nextFeedbackId = 1;

/**
 * Record user feedback on a score/judgment.
 */
export function recordFeedback(params: {
  userId: string;
  entityId: string;
  feedbackType: FeedbackType;
  detail?: string;
  snapshotTimestamp: number;
}): UserFeedback {
  const feedback: UserFeedback = {
    id: `feedback-${nextFeedbackId++}`,
    userId: params.userId,
    entityId: params.entityId,
    feedbackType: params.feedbackType,
    detail: params.detail ?? null,
    snapshotTimestamp: params.snapshotTimestamp,
    createdAt: Date.now(),
  };

  feedbackStore.push(feedback);
  if (feedbackStore.length > 10_000) feedbackStore.splice(0, feedbackStore.length - 10_000);

  return feedback;
}

export function getRecentFeedback(fromTs?: number): UserFeedback[] {
  if (!fromTs) return [...feedbackStore];
  return feedbackStore.filter(f => f.createdAt >= fromTs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeedbackSummary {
  totalCount: number;
  scoreToHighCount: number;
  scoreTooLowCount: number;
  thesisWrongCount: number;
  timingWrongCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
  satisfactionRate: number;
  /** Bias signal: positive = users think scores are too high on average */
  scoreBias: number;
}

export function aggregateFeedback(fromTs?: number): FeedbackSummary {
  const recent = getRecentFeedback(fromTs);

  const counts: Record<FeedbackType, number> = {
    score_too_high: 0,
    score_too_low: 0,
    thesis_wrong: 0,
    timing_wrong: 0,
    helpful: 0,
    unhelpful: 0,
  };

  for (const f of recent) {
    counts[f.feedbackType]++;
  }

  const total = recent.length || 1;
  const satisfactionRate = (counts.helpful) / Math.max(counts.helpful + counts.unhelpful, 1);

  const scoreFeedback = counts.score_too_high + counts.score_too_low;
  const scoreBias = scoreFeedback > 0
    ? (counts.score_too_high - counts.score_too_low) / scoreFeedback
    : 0;

  return {
    totalCount: recent.length,
    scoreToHighCount: counts.score_too_high,
    scoreTooLowCount: counts.score_too_low,
    thesisWrongCount: counts.thesis_wrong,
    timingWrongCount: counts.timing_wrong,
    helpfulCount: counts.helpful,
    unhelpfulCount: counts.unhelpful,
    satisfactionRate,
    scoreBias,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a comprehensive calibration report.
 *
 * This is the primary diagnostic tool for understanding whether the scoring
 * and judgment systems are producing accurate, well-calibrated outputs.
 */
export function generateCalibrationReport(windowHours = 168): CalibrationReport {
  const windowMs = windowHours * 60 * 60 * 1000;
  const fromTs = Date.now() - windowMs;

  const allOutcomes = getAllOutcomes(undefined, fromTs);
  const allSnapshots = getAllRecentSnapshots(windowMs);

  const priceOutcomes = allOutcomes.filter(o =>
    o.type === 'price_change_24h' || o.type === 'price_change_7d'
  );

  const directionCorrectCount = priceOutcomes.filter(o => o.directionCorrect === true).length;
  const directionTotalCount = priceOutcomes.filter(o => o.directionCorrect !== null).length;
  const directionAccuracy = directionTotalCount > 0
    ? directionCorrectCount / directionTotalCount
    : 0;

  const mae = computeMAE(priceOutcomes, allSnapshots);
  const confidenceCalibration = computeConfidenceCalibration(priceOutcomes, allSnapshots);
  const regimeBreakdown = computeRegimeBreakdown(priceOutcomes, allSnapshots);
  const hypothesisBreakdown = computeHypothesisBreakdown(allOutcomes, allSnapshots);

  const drift = allSnapshots.length > 10 ? detectDrift(allSnapshots, windowHours) : null;

  const recommendations = generateRecommendations(
    directionAccuracy,
    mae,
    confidenceCalibration,
    regimeBreakdown,
    drift,
    aggregateFeedback(fromTs),
  );

  return {
    timestamp: Date.now(),
    outcomeCount: allOutcomes.length,
    directionAccuracy,
    mae,
    confidenceCalibration,
    regimeBreakdown,
    hypothesisBreakdown,
    drift,
    recommendations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeMAE(outcomes: Outcome[], snapshots: ScoreSnapshot[]): number {
  if (outcomes.length === 0) return 0;

  const snapshotMap = new Map<number, ScoreSnapshot>();
  for (const s of snapshots) snapshotMap.set(s.timestamp, s);

  let totalError = 0;
  let count = 0;

  for (const o of outcomes) {
    const snap = snapshotMap.get(o.snapshotTimestamp);
    if (!snap) continue;

    const predictedDirection = snap.pos > 60 ? 1 : snap.pos < 40 ? -1 : 0;
    const actualDirection = o.value > 0 ? 1 : o.value < 0 ? -1 : 0;

    totalError += Math.abs(predictedDirection - actualDirection);
    count++;
  }

  return count > 0 ? totalError / count : 0;
}

function computeConfidenceCalibration(
  outcomes: Outcome[],
  snapshots: ScoreSnapshot[],
): ConfidenceBucket[] {
  const buckets: Map<string, { correct: number; total: number; errors: number[] }> = new Map();

  const snapshotByTs = new Map<number, ScoreSnapshot>();
  for (const s of snapshots) snapshotByTs.set(s.timestamp, s);

  for (const o of outcomes) {
    const snap = snapshotByTs.get(o.snapshotTimestamp);
    if (!snap || o.directionCorrect === null) continue;

    const band = snap.confidenceBand || 'unknown';
    const bucket = buckets.get(band) ?? { correct: 0, total: 0, errors: [] };

    if (o.directionCorrect) bucket.correct++;
    bucket.total++;
    bucket.errors.push(Math.abs(o.value));
    buckets.set(band, bucket);
  }

  return [...buckets.entries()].map(([band, b]) => ({
    band,
    count: b.total,
    directionAccuracy: b.total > 0 ? b.correct / b.total : 0,
    avgAbsoluteError: b.errors.length > 0 ? b.errors.reduce((s, v) => s + v, 0) / b.errors.length : 0,
  }));
}

function computeRegimeBreakdown(
  outcomes: Outcome[],
  snapshots: ScoreSnapshot[],
): RegimePerformance[] {
  const byRegime = new Map<string, { correct: number; total: number; scores: number[] }>();

  const snapshotByTs = new Map<number, ScoreSnapshot>();
  for (const s of snapshots) snapshotByTs.set(s.timestamp, s);

  for (const o of outcomes) {
    const snap = snapshotByTs.get(o.snapshotTimestamp);
    if (!snap) continue;

    const regime = snap.regime || 'unknown';
    const entry = byRegime.get(regime) ?? { correct: 0, total: 0, scores: [] };

    if (o.directionCorrect === true) entry.correct++;
    if (o.directionCorrect !== null) entry.total++;
    entry.scores.push(snap.pos);
    byRegime.set(regime, entry);
  }

  return [...byRegime.entries()].map(([regime, r]) => ({
    regime,
    count: r.total,
    directionAccuracy: r.total > 0 ? r.correct / r.total : 0,
    avgScore: r.scores.length > 0 ? r.scores.reduce((s, v) => s + v, 0) / r.scores.length : 0,
  }));
}

function computeHypothesisBreakdown(
  outcomes: Outcome[],
  snapshots: ScoreSnapshot[],
): HypothesisPerformance[] {
  const byHypothesis = new Map<string, { confirmed: number; total: number }>();

  const snapshotByTs = new Map<number, ScoreSnapshot>();
  for (const s of snapshots) snapshotByTs.set(s.timestamp, s);

  for (const o of outcomes) {
    const snap = snapshotByTs.get(o.snapshotTimestamp);
    if (!snap?.topHypothesis) continue;

    const entry = byHypothesis.get(snap.topHypothesis) ?? { confirmed: 0, total: 0 };

    if (o.type === 'thesis_confirmed') entry.confirmed++;
    entry.total++;
    byHypothesis.set(snap.topHypothesis, entry);
  }

  return [...byHypothesis.entries()].map(([hypothesis, h]) => ({
    hypothesis,
    count: h.total,
    confirmationRate: h.total > 0 ? h.confirmed / h.total : 0,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function generateRecommendations(
  directionAccuracy: number,
  mae: number,
  confidenceCalibration: ConfidenceBucket[],
  regimeBreakdown: RegimePerformance[],
  drift: ReturnType<typeof detectDrift> | null,
  feedback: FeedbackSummary,
): string[] {
  const recs: string[] = [];

  if (directionAccuracy < 0.45) {
    recs.push('Direction accuracy is below 45%. Review hypothesis scoring weights and contradiction penalty magnitudes.');
  } else if (directionAccuracy > 0.65) {
    recs.push('Direction accuracy is strong (>65%). Current calibration is healthy.');
  }

  if (mae > 1.5) {
    recs.push('Mean absolute error is high. Consider tightening the neutral band (currently 40-60).');
  }

  const highConfBucket = confidenceCalibration.find(b => b.band === 'high' || b.band === 'very_high');
  const lowConfBucket = confidenceCalibration.find(b => b.band === 'low' || b.band === 'very_low');

  if (highConfBucket && lowConfBucket) {
    if (highConfBucket.directionAccuracy < lowConfBucket.directionAccuracy) {
      recs.push('CRITICAL: High-confidence predictions are less accurate than low-confidence ones. Confidence bands are miscalibrated.');
    }
  }

  for (const rp of regimeBreakdown) {
    if (rp.count >= 5 && rp.directionAccuracy < 0.35) {
      recs.push(`Poor performance in "${rp.regime}" regime (${(rp.directionAccuracy * 100).toFixed(0)}% accuracy). Consider regime-specific weight adjustments.`);
    }
  }

  if (drift && drift.severity === 'severe') {
    recs.push(`Score distribution has severely drifted. ${drift.recommendation}`);
  }

  if (feedback.totalCount > 10) {
    if (feedback.scoreBias > 0.3) {
      recs.push(`User feedback indicates scores trend too high (bias: ${(feedback.scoreBias * 100).toFixed(0)}%). Consider lowering QS or OS baseline weights.`);
    } else if (feedback.scoreBias < -0.3) {
      recs.push(`User feedback indicates scores trend too low (bias: ${(feedback.scoreBias * 100).toFixed(0)}%). Review if risk penalties are too aggressive.`);
    }

    if (feedback.thesisWrongCount > feedback.totalCount * 0.3) {
      recs.push('Over 30% of feedback reports wrong thesis. Review hypothesis ranking logic and signal weight profiles.');
    }

    if (feedback.satisfactionRate < 0.4) {
      recs.push('User satisfaction is below 40%. Prioritize judgment quality investigation.');
    }
  }

  if (recs.length === 0) {
    recs.push('All calibration metrics are within acceptable bounds. No action required.');
  }

  return recs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKTEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

export interface BacktestCase {
  entityId: string;
  inputSnapshot: ScoreSnapshot;
  expectedOutcome: Outcome;
}

export interface BacktestResult {
  totalCases: number;
  passed: number;
  failed: number;
  accuracy: number;
  failures: Array<{
    entityId: string;
    expectedDirection: boolean | null;
    actualDirection: boolean | null;
    scorePOS: number;
  }>;
}

/**
 * Run a backtest against a set of historical cases.
 *
 * Each case includes the input snapshot and the known outcome.
 * The function checks whether the scoring system would have predicted
 * the right direction.
 */
export function runBacktest(cases: BacktestCase[]): BacktestResult {
  let passed = 0;
  let failed = 0;
  const failures: BacktestResult['failures'] = [];

  for (const c of cases) {
    const scoreBias = c.inputSnapshot.pos > 60 ? true : c.inputSnapshot.pos < 40 ? false : null;
    const actualDirection = c.expectedOutcome.directionCorrect;

    if (scoreBias === actualDirection || scoreBias === null) {
      passed++;
    } else {
      failed++;
      failures.push({
        entityId: c.entityId,
        expectedDirection: actualDirection,
        actualDirection: scoreBias,
        scorePOS: c.inputSnapshot.pos,
      });
    }
  }

  const total = cases.length || 1;

  return {
    totalCases: cases.length,
    passed,
    failed,
    accuracy: passed / total,
    failures,
  };
}
