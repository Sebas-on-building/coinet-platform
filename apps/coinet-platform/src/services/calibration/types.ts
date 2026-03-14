/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     FEEDBACK & CALIBRATION LOOP — TYPE SYSTEM                                 ║
 * ║                                                                               ║
 * ║   This is what converts Coinet from a well-designed architecture             ║
 * ║   into a compounding judgment engine.                                        ║
 * ║                                                                               ║
 * ║   Four subsystems:                                                           ║
 * ║     1. Drift Monitor — detects score distribution shifts                     ║
 * ║     2. Outcome Tracker — records what actually happened                      ║
 * ║     3. Feedback Integrator — wires user/outcome signals into calibration     ║
 * ║     4. Backtest Runner — scheduled validation against historical cases       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE SNAPSHOT (what we predicted)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoreSnapshot {
  entityId: string;
  timestamp: number;
  /** OmniScore POS at prediction time */
  pos: number;
  /** Quality Segment */
  qs: number;
  /** Opportunity Segment */
  os: number;
  /** Risk segment */
  risk: number;
  /** Regime at time of scoring */
  regime: string;
  /** Judgment state at time of scoring */
  judgmentState: string;
  /** Top hypothesis at time of scoring */
  topHypothesis: string | null;
  /** Confidence band */
  confidenceBand: string;
  /** Price at the time the snapshot was captured (USD). Required for outcome computation. */
  priceAtSnapshot: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOME (what actually happened)
// ═══════════════════════════════════════════════════════════════════════════════

export type OutcomeType =
  | 'price_change_24h'
  | 'price_change_7d'
  | 'price_change_30d'
  | 'thesis_confirmed'
  | 'thesis_invalidated'
  | 'contradiction_resolved'
  | 'regime_changed'
  | 'scenario_triggered';

export interface Outcome {
  id: string;
  entityId: string;
  type: OutcomeType;
  /** Timestamp when outcome was observed */
  observedAt: number;
  /** Reference to the score snapshot this outcome validates against */
  snapshotTimestamp: number;
  /** Numerical outcome value (e.g. price change %) */
  value: number;
  /** Whether the prediction direction was correct */
  directionCorrect: boolean | null;
  /** Raw evidence supporting this outcome */
  evidence: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIFT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type DriftSeverity = 'none' | 'minor' | 'moderate' | 'severe';

export interface DriftReport {
  timestamp: number;
  /** Time window analyzed */
  windowHours: number;
  /** Distribution statistics for the analysis window */
  currentDistribution: DistributionStats;
  /** Baseline distribution (from golden cases or historical) */
  baselineDistribution: DistributionStats;
  /** Statistical divergence score (0 = identical, 1 = completely different) */
  divergenceScore: number;
  severity: DriftSeverity;
  /** Specific dimension(s) that drifted */
  driftedDimensions: DriftDimension[];
  /** Recommended action */
  recommendation: string;
}

export interface DriftDimension {
  name: string;
  currentMean: number;
  baselineMean: number;
  shift: number;
  severity: DriftSeverity;
}

export interface DistributionStats {
  mean: number;
  median: number;
  stddev: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  count: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

export type FeedbackType = 'score_too_high' | 'score_too_low' | 'thesis_wrong' | 'timing_wrong' | 'helpful' | 'unhelpful';

export interface UserFeedback {
  id: string;
  userId: string;
  entityId: string;
  feedbackType: FeedbackType;
  /** Optional free-text detail */
  detail: string | null;
  /** The score/judgment that was rated */
  snapshotTimestamp: number;
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalibrationReport {
  timestamp: number;
  /** How many outcomes were evaluated */
  outcomeCount: number;
  /** Direction accuracy (% of times the direction was right) */
  directionAccuracy: number;
  /** Mean absolute error of score vs actual outcome */
  mae: number;
  /** Confidence calibration: did "high confidence" predictions do better? */
  confidenceCalibration: ConfidenceBucket[];
  /** Per-regime performance */
  regimeBreakdown: RegimePerformance[];
  /** Per-hypothesis performance */
  hypothesisBreakdown: HypothesisPerformance[];
  /** Drift summary */
  drift: DriftReport | null;
  /** Actionable recommendations */
  recommendations: string[];
}

export interface ConfidenceBucket {
  band: string;
  count: number;
  directionAccuracy: number;
  avgAbsoluteError: number;
}

export interface RegimePerformance {
  regime: string;
  count: number;
  directionAccuracy: number;
  avgScore: number;
}

export interface HypothesisPerformance {
  hypothesis: string;
  count: number;
  confirmationRate: number;
}
