/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CALIBRATION SPINE — TYPE SYSTEM                                           ║
 * ║                                                                               ║
 * ║   Three core objects:                                                        ║
 * ║     JudgmentSnapshot — the frozen claim                                      ║
 * ║     ForwardOutcome   — the realized consequence                              ║
 * ║     CalibrationAggregate — the pattern-level learning                        ║
 * ║                                                                               ║
 * ║   Plus modular evaluator output types for scores, confidence,                ║
 * ║   hypothesis, timing, contradiction, and drift.                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ─────────────────────────────────────────────────────────────────────────────
// OUTCOME WINDOWS
// ─────────────────────────────────────────────────────────────────────────────

export const OUTCOME_WINDOWS = ['6h', '24h', '72h', '7d', '30d'] as const;
export type OutcomeWindow = (typeof OUTCOME_WINDOWS)[number];

export const WINDOW_MS: Record<OutcomeWindow, number> = {
  '6h':  6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. JUDGMENT SNAPSHOT — the frozen claim
// ─────────────────────────────────────────────────────────────────────────────

export interface JudgmentSnapshotRecord {
  id: string;
  createdAt: string;

  assetCanonicalId: string;
  assetSymbol: string;
  chainId?: string;

  judgmentTimestamp: string;
  priceAtJudgment: number;

  // Interpretive state
  regimePrimary?: string;
  regimeSecondary?: string;
  regimeConfidence?: number;
  sequenceState?: string;
  timingPhase?: string;

  // Hypothesis state
  primaryHypothesisId: string;
  primaryHypothesisScore: number;
  primaryHypothesisConfidence: number;
  secondaryHypothesisId?: string;
  secondaryHypothesisScore?: number;
  confidenceSpread?: number;
  ambiguityLevel: string;

  // Score state
  opportunityScore?: number;
  riskScore?: number;
  timingScore?: number;
  qualityScore?: number;
  signalConfidence: number;

  // Evidence quality state
  contradictionLoad: number;
  contradictionClasses: string[];
  coverageScore: number;
  degradedDomains: string[];
  decisiveMissingEvidence: string[];

  // Governance state
  scoreConfigVersion?: string;
  hypothesisConfigVersion: string;
  regimeConfigVersion?: string;
  confidenceConfigVersion?: string;
  calibrationSpineVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FORWARD OUTCOME — the realized consequence
// ─────────────────────────────────────────────────────────────────────────────

export interface ForwardOutcomeRecord {
  id: string;
  snapshotId: string;
  window: OutcomeWindow;
  resolvedAt: string;

  // Destination metrics
  endPrice: number;
  endReturn: number;

  // Path metrics
  maxUpsideExcursion: number;
  maxDownsideExcursion: number;
  maxDrawdown: number;
  realizedVolatility: number;
  pathReturn: number;

  // Relative metrics (optional, when benchmark available)
  benchmarkReturn?: number;
  excessReturn?: number;

  // Resolution semantics
  directionCorrect: boolean | null;
  continuationStrength: number;
  reversalSeverity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CALIBRATION AGGREGATE — the pattern-level learning
// ─────────────────────────────────────────────────────────────────────────────

export interface CalibrationAggregateRecord {
  id: string;
  computedAt: string;
  window: OutcomeWindow;
  segmentType: SegmentType;
  segmentValue: string;
  sampleCount: number;

  scoreMonotonicity: ScoreMonotonicity;
  scoreSeparation: ScoreSeparation;

  confidenceCalibration: ConfidenceCalibrationEntry[];
  calibrationError: number;
  overconfidenceRate: number;

  hypothesisHitRates: HypothesisHitRate[];
  secondaryLaterWinRate: number;
  spreadInformativeness: number;

  timingExpectancy: TimingExpectancyEntry[];

  contradictionImpact: ContradictionImpactEntry[];

  configVersion: string;
  calibrationSpineVersion: string;
}

export type SegmentType =
  | 'global'
  | 'regime'
  | 'cap_bucket'
  | 'contradiction_band'
  | 'coverage_band'
  | 'config_version';

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATOR OUTPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreMonotonicity {
  opportunityMonotonic: boolean;
  opportunityCurve: BucketPerformance[];
  riskMonotonic: boolean;
  riskCurve: BucketPerformance[];
  timingMonotonic: boolean;
  timingCurve: BucketPerformance[];
}

export interface ScoreSeparation {
  opportunityTopVsBottom: number;
  riskTopVsBottom: number;
  timingTopVsBottom: number;
}

export interface BucketPerformance {
  bucket: string;
  count: number;
  avgReturn: number;
  medianReturn: number;
  maxDrawdown: number;
  positiveRate: number;
}

export interface ConfidenceCalibrationEntry {
  band: string;
  count: number;
  expectedAccuracy: number;
  actualAccuracy: number;
  calibrationGap: number;
  avgAbsReturn: number;
}

export interface HypothesisHitRate {
  hypothesisId: string;
  count: number;
  hitRate: number;
  avgReturnWhenPrimary: number;
  avgReturnWhenWrong: number;
  avgSpreadWhenCorrect: number;
}

export interface TimingExpectancyEntry {
  phase: string;
  count: number;
  avgReturn: number;
  continuationRate: number;
  avgDrawdown: number;
}

export interface ContradictionImpactEntry {
  band: string;
  count: number;
  avgReturn: number;
  failureRate: number;
  avgDrawdown: number;
  reliabilityDelta: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIFT
// ─────────────────────────────────────────────────────────────────────────────

export type DriftSeverity = 'none' | 'minor' | 'moderate' | 'severe';

export interface DriftComparison {
  dimension: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  severity: DriftSeverity;
}

export interface VersionDriftReport {
  fromVersion: string;
  toVersion: string;
  window: OutcomeWindow;
  comparisons: DriftComparison[];
  overallSeverity: DriftSeverity;
  recommendation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST SURFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface TrustSurface {
  scoreReliability: ScoreMonotonicity;
  confidenceAccountability: ConfidenceCalibrationEntry[];
  hypothesisReliability: HypothesisHitRate[];
  contradictionSignificance: ContradictionImpactEntry[];
  timingUsefulness: TimingExpectancyEntry[];
  drift: VersionDriftReport[];
  computedAt: string;
  window: OutcomeWindow;
  sampleCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION SPINE VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const CALIBRATION_SPINE_VERSION = '1.0.0' as const;
