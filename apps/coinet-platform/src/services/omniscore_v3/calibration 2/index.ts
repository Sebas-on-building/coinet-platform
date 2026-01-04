/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 CALIBRATION MODULE INDEX                                               ║
 * ║                                                                               ║
 * ║   Score distribution sanity, anchor priors, golden cases                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Distribution
  DistributionStats,
  ScoreDistribution,
  DistributionHealth,
  DistributionHealthCheck,
  HealthStatus,
  
  // Anchor priors
  AnchorPrior,
  AnchorPriorConfig,
  
  // Golden cases
  GoldenCase,
  GoldenCaseInput,
  GoldenCaseExpected,
  GoldenCaseResult,
  
  // Report
  CalibrationReport,
} from './types';

export {
  // Priors
  WELL_KNOWN_PRIORS,
  DEFAULT_ANCHOR_PRIOR_CONFIG,
  
  // Thresholds
  CALIBRATION_THRESHOLDS,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  calculateDistributionStats,
  analyzeScoreDistribution,
  checkDistributionHealth,
  compareDistributions,
  type DistributionDelta,
} from './distribution';

// ═══════════════════════════════════════════════════════════════════════════════
// ANCHOR PRIORS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Prior storage
  initializeWellKnownPriors,
  getPrior,
  setPrior,
  hasPrior,
  getAllPriors,
  
  // Influence calculation
  calculatePriorInfluence,
  getPriorInfluenceCurve,
  
  // Score adjustment
  applyPriorAdjustment,
  adjustScoresWithPrior,
  type AdjustedScore,
  type ScoreWithPriorAdjustment,
  
  // Prior learning
  updatePriorFromObservation,
  type PriorUpdateConfig,
  DEFAULT_PRIOR_UPDATE_CONFIG,
  
  // Diagnostics
  checkPriorDeviation,
} from './priors';

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN CASES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Cases
  BITCOIN_GOLDEN_CASE,
  ETHEREUM_GOLDEN_CASE,
  SOLANA_GOLDEN_CASE,
  GATED_ASSET_GOLDEN_CASE,
  SUSPICIOUS_ASSET_GOLDEN_CASE,
  ALL_GOLDEN_CASES,
  
  // Helpers
  getGoldenCase,
  getMajorGoldenCases,
  
  // Validation
  validateGoldenCase,
  runAllGoldenCases,
} from './golden-cases';

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateCalibrationReport,
  formatReportAsMarkdown,
  formatReportAsJSON,
  type GenerateReportInput,
} from './report';
