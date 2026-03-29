/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CALIBRATION SPINE — Phase 3 Wave 3                                        ║
 * ║                                                                               ║
 * ║   The epistemic accountability layer that converts Coinet from a             ║
 * ║   judgment engine into a judgment engine that earns authority.                ║
 * ║                                                                               ║
 * ║   Three core objects:                                                        ║
 * ║     JudgmentSnapshot — frozen claim memory                                   ║
 * ║     ForwardOutcome   — realized consequence (path, not just destination)     ║
 * ║     CalibrationAggregate — pattern-level learning by segment                 ║
 * ║                                                                               ║
 * ║   Five evaluators:                                                           ║
 * ║     Score, Confidence, Hypothesis, Timing, Contradiction                     ║
 * ║                                                                               ║
 * ║   Five trust surfaces:                                                       ║
 * ║     Score reliability, Confidence accountability, Hypothesis reliability,    ║
 * ║     Contradiction significance, Drift detection                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// Types
export type {
  OutcomeWindow,
  JudgmentSnapshotRecord,
  ForwardOutcomeRecord,
  CalibrationAggregateRecord,
  SegmentType,
  ScoreMonotonicity,
  ScoreSeparation,
  BucketPerformance,
  ConfidenceCalibrationEntry,
  HypothesisHitRate,
  TimingExpectancyEntry,
  ContradictionImpactEntry,
  DriftSeverity,
  DriftComparison,
  VersionDriftReport,
  TrustSurface,
} from './types';
export { OUTCOME_WINDOWS, WINDOW_MS, CALIBRATION_SPINE_VERSION } from './types';

// Snapshot Writer (Gate 1)
export {
  captureJudgmentSnapshot,
  getSnapshotsForAsset,
  getAllRecentSnapshots,
  getSnapshotById,
  getSnapshotsAwaitingOutcome,
  getSnapshotCount,
} from './snapshot-writer';
export type { CaptureJudgmentSnapshotInput } from './snapshot-writer';

// Outcome Resolver (Gate 2)
export {
  resolveOutcomesForWindow,
  resolveAllWindows,
  getOutcomesForSnapshot,
  getOutcomesByWindow,
  getResolvedOutcomeCount,
  computePathMetrics,
} from './outcome-resolver';
export type { PricePathProvider, PricePoint } from './outcome-resolver';

// Evaluators (Gate 3)
export {
  evaluateScores,
  evaluateConfidence,
  evaluateHypotheses,
  evaluateTiming,
  evaluateContradictions,
  compareVersions,
  detectTemporalDrift,
} from './evaluators';

// Aggregator + Trust Surfaces
export {
  computeAggregates,
  buildTrustSurface,
  getRecentAggregates,
} from './aggregator';

// Dashboard (Gate 4)
export {
  getCalibrationDashboard,
  recomputeAggregates,
} from './dashboard';
export type { CalibrationDashboardSummary } from './dashboard';
