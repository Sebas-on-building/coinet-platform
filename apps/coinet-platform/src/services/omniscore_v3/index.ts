/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 OMNISCORE v3.0 "DIABOLICAL" — CANONICAL ENTRYPOINT                    ║
 * ║                                                                               ║
 * ║   This is the SINGLE SOURCE OF TRUTH for OmniScore v3.0.                     ║
 * ║   All consumers MUST import from here, never from internal modules.          ║
 * ║                                                                               ║
 * ║   Non-negotiable rules:                                                       ║
 * ║   1. No regime-dependent weights                                              ║
 * ║   2. No estimates masquerading as truth                                       ║
 * ║   3. One engine, one entrypoint, one output                                  ║
 * ║   4. Fail-closed on low coverage                                             ║
 * ║   5. Every number traceable                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  ENGINE_VERSION,
  FORMULA_VERSION,
  METHODOLOGY_ID,
} from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE — THE SINGLE CALCULATION PATH (Phase 7)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Main entrypoint (THE ONLY WAY TO CALCULATE)
  computeOmniScore,
  computeOmniScoreBatch,
  
  // Pipeline steps
  fetchBundle,
  calculateSnapshot,
  storeState,
  
  // Validation
  validatePipelineCompletion,
  validatePipelineOrder,
  isBundleViable,
  
  // Inspection
  getPipelineSummary,
  
  // Types
  type PipelineStep,
  type StepResult,
  type DataBundle,
  type PipelineContext,
  type OmniScoreSnapshot as PipelineSnapshot,
  type PipelineConfig,
  type PipelineResult,
  type ComputeOmniScoreInput,
  type FetchBundleInput,
  type FetchBundleResult,
  type CalculateSnapshotInput,
  type CalculateSnapshotResult,
  type StoreStateInput,
  type StoreStateResult,
  type BatchComputeInput,
  type BatchComputeResult,
  
  // Constants
  PIPELINE_STEPS,
  DEFAULT_PIPELINE_CONFIG,
} from './pipeline';

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY ENGINE (deprecated - use pipeline instead)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  calculateOmniScore as calculateOmniScoreLegacy,
  createSmoothingState,
  type CalculationContext,
} from './engine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // CANONICAL OUTPUT (THE ONLY TRUTH)
  OmniScoreSnapshot,
  
  // Identity
  TokenIdentity,
  
  // Drivers (explainability)
  ScoreDriver,
  ScoreDrivers,
  
  // Labels
  LegitimacyLabel,
  IntegrityFlag,
  
  // Core result (legacy alias)
  OmniScoreResult,
  CalculateOmniScoreParams,
  
  // Tiers & confidence
  TierLabel,
  ConfidenceLevel,
  
  // Segments
  Segment,
  QSSegment,
  OSSegment,
  RiskSegment,
  SegmentScore,
  
  // Score results
  QualityScoreResult,
  OpportunityScoreResult,
  RiskScoreResult,
  
  // Gates
  LegitimacyResult,
  LegitimacyStatus,
  LegitimacyHardFails,
  LegitimacySoftFails,
  ConfidenceResult,
  
  // Views
  AllocatorView,
  TraderView,
  AllocatorRecommendation,
  TraderSignal,
  
  // Data
  DataPoint,
  DataSource,
  DataSourceType,
  
  // Smoothing
  SmoothingState,
  SmoothingResult,
  
  // Classification
  SectorType,
  CapBucket,
  
  // Audit
  AuditMetadata,
  
  // Errors
  OmniScoreError,
  OmniScoreErrorCode,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  TIER_THRESHOLDS,
  FIXED_WEIGHTS,
  FIXED_WEIGHTS_OS_GATED,
  CONFIDENCE_THRESHOLDS,
  CONFIDENCE_FORMULA_WEIGHTS,
  COVERAGE_GATES,
  LEGITIMACY_THRESHOLDS,
  SMOOTHING_CONFIG,
  STALENESS_THRESHOLDS,
  QS_SEGMENT_WEIGHTS,
  OS_SEGMENT_WEIGHTS,
  RISK_SEGMENT_WEIGHTS,
  SCORE_BOUNDS,
  getTierFromScore,
  getConfidenceLevel,
} from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA SOURCE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  DATA_SOURCES,
  TIER1_SOURCES,
  TIER2_SOURCES,
  TIER3_SOURCES,
  isSourceValidForScoring,
  getSourceReliability,
  isDataStale,
  validateDerivationChain,
  MIN_RELIABILITY_THRESHOLD,
} from './data/sources';

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY RESOLUTION EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  resolveEntity,
  resolveEntities,
  canEntityBeScored,
  getProviderId,
  hasMinimumProviderIds,
  resolveWellKnown,
  WELL_KNOWN_ENTITIES,
  KNOWN_CHAINS,
  IDENTITY_CONFIDENCE_THRESHOLD,
  type ResolvedEntity,
  type EntityResolutionInput,
  type EntityResolutionResult,
  type ProviderIds,
  type ContractAddresses,
  type OfficialUrls,
  type IdentityVerification,
  type KnownChain,
} from './data/entity';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FETCHER EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  fetchAllData,
  createDataPoint,
  fetchMarketData,
  fetchOnChainData,
  fetchDevelopmentData,
  fetchTokenomicsData,
  marketDataToDataPoints,
  onChainDataToDataPoints,
  developmentDataToDataPoints,
  tokenomicsDataToDataPoints,
  PROVIDER_TRUST_SCORES,
  type MarketData,
  type OnChainData,
  type DevelopmentData,
  type TokenomicsData,
  type FetchAllDataResult,
} from './data/fetcher';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // CoinGecko
  CoinGeckoClient,
  getCoinGeckoClient,
  coinGeckoToMarketData,
  
  // DefiLlama
  DefiLlamaClient,
  getDefiLlamaClient,
  defiLlamaToTvlData,
  defiLlamaToFeesData,
  
  // GitHub
  GitHubClient,
  getGitHubClient,
  fetchGitHubDevelopmentData,
  
  // Health checks
  checkProviderHealth,
  resetAllProviders,
  type ProviderStatus,
} from './data/providers';

// ═══════════════════════════════════════════════════════════════════════════════
// REQUIREMENTS EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  QS_REQUIREMENTS,
  OS_REQUIREMENTS,
  RISK_REQUIREMENTS,
  ALL_REQUIREMENTS,
  checkRequiredData,
  calculateSegmentCoverage,
  meetsMinimumCoverage,
  type SegmentRequirement,
} from './data/requirements';

// ═══════════════════════════════════════════════════════════════════════════════
// GATE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  checkLegitimacy,
  extractLegitimacyData,
  getLegitimacySummary,
  type LegitimacyInput,
} from './gates/legitimacy';

export {
  checkConfidence,
  getConfidenceSummary,
  getConfidenceBand,
} from './gates/confidence';

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { calculateQualityScore } from './segments/quality';
export { calculateOpportunityScore } from './segments/opportunity';
export { calculateRiskScore } from './segments/risk';

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateAllocatorView,
  type AllocatorInput,
} from './views/allocator';

export {
  generateTraderView,
  type TraderInput,
} from './views/trader';

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  applySmoothing,
  shouldApplySmoothing,
} from './smoothing';

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURES EXPORTS (PHASE 3)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type Feature,
  type FeatureDefinition,
  type FeatureFunction,
  type FeatureResult,
  type FeatureContext,
  type FeatureCategory,
  
  // All features
  ALL_FEATURES,
  ALL_FEATURES_MAP,
  FEATURE_COUNTS,
  
  // Feature groups
  QS_FEATURES,
  QS_FEATURE_MAP,
  OS_FEATURES,
  OS_FEATURE_MAP,
  RISK_FEATURES,
  RISK_FEATURE_MAP,
  
  // Compute functions
  buildFeatureContext,
  computeCategory,
  computeAllFeatures,
  computeFeatureById,
  aggregateResults,
  getTopDrivers,
  
  // Helpers
  getDataValue,
  getDataValues,
  checkRequiredInputs,
  calculateFreshnessHours as calculateFeatureFreshnessHours,
  calculateConfidence as calculateFeatureConfidence,
} from './features';

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING EXPORTS (PHASE 4)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Normalization
  type NormalizationConfig,
  type NormalizationResult,
  DEFAULT_NORMALIZATION_CONFIG,
  percentileValue,
  percentileRank,
  median,
  mad,
  winsorize,
  normalizePercentile,
  normalizeRobustZ,
  normalizeLinear,
  normalizeLog,
  
  // Reliability
  type ReliabilityFactors,
  type ReliabilityResult,
  type ReliabilityConfig,
  type FeatureWithReliability,
  type CoverageResult,
  DEFAULT_RELIABILITY_CONFIG,
  calculateFreshness,
  calculateAvailability,
  calculateProviderTrust,
  calculateReliability,
  calculateFeatureReliability,
  calculateCoverage,
  
  // Weights (FIXED - NO REGIME MODULATION)
  POS_WEIGHTS,
  QS_FEATURE_WEIGHTS,
  OS_FEATURE_WEIGHTS,
  RISK_FEATURE_WEIGHTS,
  WEIGHT_DOCUMENTATION,
  getFeatureWeight,
  getCategoryWeights,
  
  // Scoring
  type CategoryScoreResult,
  type POSCalculation,
  type ScoringResult,
  type ScoringInput,
  type ScoringConfig,
  DEFAULT_SCORING_CONFIG,
  calculateCategoryScore,
  calculatePOS,
  calculateScores,
  checkScoringInvariants,
  testMonotonicity,
  
  // Gating (FAIL-CLOSED)
  type GateStatus,
  type GateCheckResult,
  type GatingResult,
  type GatingConfig,
  type GatedScoringResult,
  DEFAULT_GATING_CONFIG,
  calculateConfidence as calculateOverallConfidence,
  applyGates,
  produceGatedResult,
  mapConfidenceLevel,
} from './scoring';

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE EXPORTS (PHASE 5)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Schema types
  type OmniScoreStateRecord,
  type SmoothingState as PersistenceSmoothingState,
  type LegitimacyStatus as PersistenceLegitimacyStatus,
  type ScoringStatus,
  type HistoryQuery,
  type HistoryResult,
  
  // Schema functions
  createInitialSmoothingState as createInitialPersistenceSmoothingState,
  CREATE_TABLE_SQL,
  DROP_TABLE_SQL,
  
  // Smoothing (EMA)
  SMOOTHING_CONFIG,
  type SmoothingInput,
  type SmoothingResult as EMASmoothingResult,
  type BatchSmoothingInput,
  type BatchSmoothingResult,
  type SmoothingAnalysis,
  applySmoothingEMA,
  isSmoothingWarmedUp,
  calculateHalfLife,
  calculateReflection,
  simulateSmoothing,
  applyBatchSmoothing,
  analyzeSmoothingResults,
  
  // Store
  type OmniScoreStore,
  type SaveStateInput,
  type PersistScoreInput,
  type PersistScoreResult,
  InMemoryOmniScoreStore,
  getStore,
  setStore,
  resetStore,
  persistScore,
  getLatestScore,
  getScoreHistory,
} from './persistence';

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY GATE EXPORTS (PHASE 6)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type LegitimacyLabel,
  type LegitimacyFactors,
  type LegitimacyRuleResult,
  type LegitimacyResult as LegitimacyGateResult,
  
  // Thresholds
  LEGITIMACY_THRESHOLDS,
  
  // Decision tree
  determineLegitimacy,
  createDefaultFactors,
  
  // Mode-specific helpers
  canShowToAllocator,
  canShowToTrader,
  canAppearInRankings,
  getLegitimacySummary,
} from './gates/legitimacy-v2';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION EXPORTS (THE LAW)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Schemas
  OmniScoreSnapshotSchema,
  TokenIdentitySchema,
  DataPointSchema,
  CalculateOmniScoreParamsSchema,
  AuditMetadataSchema,
  ScoreDriverSchema,
  ScoreDriversSchema,
  AllocatorViewSchema,
  TraderViewSchema,
  
  // Validation functions
  validateSnapshotOrThrow,
  validateSnapshotSafe,
  validateParamsOrThrow,
  getSnapshotValidationErrors,
  checkAllInvariants,
  
  // Invariant definitions
  SNAPSHOT_INVARIANTS,
  
  // Validated types (inferred from schemas)
  type ValidatedOmniScoreSnapshot,
  type ValidatedTokenIdentity,
  type ValidatedDataPoint,
  type ValidatedCalculateParams,
} from './validation';

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION EXPORTS (PHASE 8)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type DistributionStats,
  type ScoreDistribution,
  type DistributionHealth,
  type DistributionHealthCheck,
  type HealthStatus,
  type AnchorPrior,
  type AnchorPriorConfig,
  type GoldenCase,
  type GoldenCaseInput,
  type GoldenCaseExpected,
  type GoldenCaseResult,
  type CalibrationReport,
  
  // Config
  WELL_KNOWN_PRIORS,
  DEFAULT_ANCHOR_PRIOR_CONFIG,
  CALIBRATION_THRESHOLDS,
  
  // Distribution analysis
  calculateDistributionStats,
  analyzeScoreDistribution,
  checkDistributionHealth,
  compareDistributions,
  type DistributionDelta,
  
  // Anchor priors
  initializeWellKnownPriors,
  getPrior,
  setPrior,
  hasPrior,
  getAllPriors,
  calculatePriorInfluence,
  getPriorInfluenceCurve,
  applyPriorAdjustment,
  adjustScoresWithPrior,
  type AdjustedScore,
  type ScoreWithPriorAdjustment,
  updatePriorFromObservation,
  type PriorUpdateConfig,
  DEFAULT_PRIOR_UPDATE_CONFIG,
  checkPriorDeviation,
  
  // Golden cases
  BITCOIN_GOLDEN_CASE,
  ETHEREUM_GOLDEN_CASE,
  SOLANA_GOLDEN_CASE,
  ALL_GOLDEN_CASES,
  getGoldenCase,
  getMajorGoldenCases,
  validateGoldenCase,
  runAllGoldenCases,
  
  // Report generation
  generateCalibrationReport,
  formatReportAsMarkdown,
  formatReportAsJSON,
  type GenerateReportInput,
} from './calibration';

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT MODULE (TRUTH DUMP + FEATURE SPECS)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Truth dump
  type TruthDump,
  type TruthDumpInput,
  type FeatureContribution,
  generateTruthDump,
  formatTruthDumpAsText,
  formatTruthDumpAsJSON,
  formatTruthDumpAsCompact,
  
  // Feature specs
  type FeatureSpec,
  type FeatureDirection,
  type FeatureScope,
  type AssetType,
  type Transformation,
  type MissingBehavior,
  QS_FEATURE_SPECS,
  OS_FEATURE_SPECS,
  RISK_FEATURE_SPECS,
  ALL_FEATURE_SPECS,
  getFeatureSpec,
  getSpecsForCategory,
  getApplicableSpecs,
  isFeatureApplicable,
  formatSpecsAsMarkdown,
} from './audit';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTORS MODULE (SECTOR SEGMENTATION)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type Sector,
  type SectorInfo,
  type SectorRanking,
  type SectorComparison,
  SECTOR_INFO,
  ASSET_SECTORS,
  
  // Sector detection
  getAssetSector,
  getSectorInfo,
  hasSectorAssignment,
  
  // Ranking
  calculateSectorRanking,
  calculateAllSectorRankings,
  getRankingsBySector,
  getTopBySector,
  compareAcrossSectors,
} from './sectors';

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULA FREEZE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  FORMULA_FROZEN,
  FORMULA_FROZEN_DATE,
  FORMULA_FROZEN_UNTIL,
} from './constants';
