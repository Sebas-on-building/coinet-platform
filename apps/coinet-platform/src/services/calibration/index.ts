/**
 * Feedback & Calibration Loop — public API.
 *
 * Four subsystems:
 * 1. Drift Monitor — detects score distribution shifts
 * 2. Outcome Tracker — records what actually happened
 * 3. Feedback Integrator — wires user signals into calibration
 * 4. Backtest Runner — validates against historical cases
 */

// Drift Monitor
export {
  detectDrift,
  startDriftMonitor,
  stopDriftMonitor,
  updateBaseline,
  getBaseline,
} from './drift-monitor';

// Outcome Tracker
export {
  captureSnapshot,
  getSnapshots,
  getAllRecentSnapshots,
  recordOutcome,
  getOutcomes,
  getAllOutcomes,
  collect24hOutcomes,
} from './outcome-tracker';

// Feedback Loop & Calibration
export {
  recordFeedback,
  getRecentFeedback,
  aggregateFeedback,
  generateCalibrationReport,
  runBacktest,
} from './feedback-loop';

// Types
export type {
  ScoreSnapshot,
  Outcome,
  OutcomeType,
  DriftReport,
  DriftSeverity,
  DriftDimension,
  DistributionStats,
  UserFeedback,
  FeedbackType,
  CalibrationReport,
  ConfidenceBucket,
  RegimePerformance,
  HypothesisPerformance,
} from './types';

export type {
  FeedbackSummary,
  BacktestCase,
  BacktestResult,
} from './feedback-loop';

export type {
  PriceProvider,
} from './outcome-tracker';
