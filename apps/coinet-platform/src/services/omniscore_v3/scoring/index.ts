/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 SCORING MODULE INDEX                                                   ║
 * ║                                                                               ║
 * ║   OmniScore v3.0 Scoring Math                                                ║
 * ║                                                                               ║
 * ║   Components:                                                                 ║
 * ║   - Normalization: percentiles, winsorization, robust Z-score               ║
 * ║   - Reliability: freshness, availability, trust, anomalies                  ║
 * ║   - Weights: fixed POS weights (QS 50%, OS 30%, Safety 20%)                 ║
 * ║   - Scoring: category aggregation, POS calculation                          ║
 * ║   - Gating: coverage + confidence fail-closed gates                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type NormalizationConfig,
  type NormalizationResult,
  type UniverseConfig,
  type BatchNormalizationInput,
  type BatchNormalizationOutput,
  
  // Config
  DEFAULT_NORMALIZATION_CONFIG,
  
  // Functions
  percentileValue,
  percentileRank,
  median,
  mad,
  winsorize,
  winsorizeArray,
  normalizePercentile,
  normalizeRobustZ,
  normalizeLinear,
  normalizeLog,
  createDefaultUniverse,
  normalizeBatch,
} from './normalization';

// ═══════════════════════════════════════════════════════════════════════════════
// RELIABILITY
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type ReliabilityFactors,
  type ReliabilityResult,
  type ReliabilityConfig,
  type AnomalyCheck,
  type FeatureWithReliability,
  type CoverageResult,
  
  // Config
  DEFAULT_RELIABILITY_CONFIG,
  PROVIDER_TRUST_SCORES,
  
  // Functions
  calculateFreshness,
  calculateAggregateFreshness,
  calculateAvailability,
  calculateFeatureAvailability,
  calculateProviderTrust,
  checkForOutlier,
  checkForDisagreement,
  calculateAnomalyScore,
  calculateReliability,
  calculateEffectiveWeight,
  calculateFeatureReliability,
  calculateBatchReliability,
  filterByReliability,
  calculateCoverage,
} from './reliability';

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Constants
  POS_WEIGHTS,
  QS_FEATURE_WEIGHTS,
  OS_FEATURE_WEIGHTS,
  RISK_FEATURE_WEIGHTS,
  WEIGHT_DOCUMENTATION,
  
  // Types
  type FeatureWeightId,
  
  // Functions
  getFeatureWeight,
  getCategoryWeights,
} from './weights';

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type CategoryScoreResult,
  type POSCalculation,
  type ScoringResult,
  type ScoringInput,
  type ScoringConfig,
  type ScoringInvariantResult,
  type MonotonicityTestResult,
  
  // Constants
  SCORE_BOUNDS,
  DEFAULT_SCORING_CONFIG,
  
  // Functions
  clampScore,
  roundScore,
  calculateCategoryScore,
  calculatePOS,
  calculateScores,
  checkScoringInvariants,
  testMonotonicity,
} from './scoring';

// ═══════════════════════════════════════════════════════════════════════════════
// GATING
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type GateStatus,
  type GateCheckResult,
  type GatingResult,
  type GatingConfig,
  type ConfidenceFactors,
  type GatedScoringResult,
  type ConfidenceLevel,
  
  // Config
  DEFAULT_GATING_CONFIG,
  CONFIDENCE_LEVEL_DESCRIPTIONS,
  
  // Functions
  calculateConfidence,
  extractConfidenceFactors,
  applyGates,
  produceGatedResult,
  mapConfidenceLevel,
} from './gating';
