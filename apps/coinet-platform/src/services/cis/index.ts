/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ COINET INTERPRETATION SYSTEM (CIS)                                     ║
 * ║                                                                               ║
 * ║   A mathematically grounded, multi-layered data meaning firewall designed    ║
 * ║   to guarantee the traceability and semantic integrity of every metric       ║
 * ║   consumed by the Coinet AI.                                                 ║
 * ║                                                                               ║
 * ║   The primary mandate: decouple data verification and validation from the    ║
 * ║   generative function of the LLM, ensuring the AI operates strictly as a     ║
 * ║   deterministic rendering engine of verified evidence.                       ║
 * ║                                                                               ║
 * ║   ARCHITECTURAL DETERMINISM: The entire data preparation pipeline must       ║
 * ║   operate under verifiable contracts and fail-closed rules.                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const CIS_VERSION = '1.0.0' as const;
export const CIS_ARCHITECTURE = 'DETERMINISM_MODEL' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: CANONICAL DATA CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Schema version
  CIS_LAYER1_VERSION,
  SCHEMA_VERSION,
  
  // Enums
  DirectionEnum,
  UnitEnum,
  ValidationStatusEnum,
  QualityFlagEnum,
  ScoreCategoryEnum,
  SourceTypeEnum,
  
  // Types
  type Direction,
  type Unit,
  type ValidationStatus,
  type QualityFlag,
  type ScoreCategory,
  type SourceType,
  type Provenance,
  type DerivationRecipe,
  type CanonicalDatapoint,
  type EntityDataBundle,
  
  // Schemas (Zod)
  ProvenanceSchema,
  DerivationRecipeSchema,
  CanonicalDatapointSchema,
  EntityDataBundleSchema,
  
  // Utilities
  validateDatapoint,
  validateDatapointBatch,
  createDatapoint,
} from './layer1';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: FEATURE SPECIFICATION SHEETS (FSS)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  CIS_LAYER2_VERSION,
  FSS_REGISTRY_VERSION,
  
  // Enums
  SectorEnum,
  NormalizationMethodEnum,
  FailureModeEnum,
  SeverityEnum,
  CompensationActionEnum,
  
  // Types
  type Sector,
  type NormalizationMethod,
  type FailureMode,
  type Severity,
  type CompensationAction,
  type NormalizationRecipe,
  type FMEARecord,
  type SanityBounds,
  type FeatureSpecificationSheet,
  type FSSRegistry,
  
  // Schemas (Zod)
  NormalizationRecipeSchema,
  FMEARecordSchema,
  SanityBoundsSchema,
  FeatureSpecificationSheetSchema,
  FSSRegistrySchema,
  
  // Registry
  FSS_REGISTRY,
  
  // Accessors
  getFSS,
  isMetricApplicableToSector,
  getMetricsForSector,
  getMetricsForCategory,
  validateMetricApplication,
} from './layer2';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type ValidationIssue,
  type DatapointValidationResult,
  type BundleValidationResult,
  
  // Validators
  validateCanonicalDatapoint,
  validateEntityBundle,
} from './validation';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Quick validation check
// ═══════════════════════════════════════════════════════════════════════════════

import { validateMetricApplication, type Sector } from './layer2';

/**
 * Quick check: Can this metric be applied to this sector?
 * 
 * Example:
 *   canApplyMetric('qs_tvl_v1', 'Payment') // false - TVL doesn't apply to XRP
 *   canApplyMetric('qs_tvl_v1', 'DeFi')    // true - TVL is valid for DeFi
 */
export function canApplyMetric(metricId: string, sector: Sector): boolean {
  const result = validateMetricApplication(metricId, sector);
  return result.valid;
}

/**
 * Get error message if metric cannot be applied
 * Returns null if metric can be applied
 */
export function getMetricApplicationError(metricId: string, sector: Sector): string | null {
  const result = validateMetricApplication(metricId, sector);
  return result.valid ? null : result.error;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: MULTI-SOURCE RECONCILIATION (ANTI-MANIPULATION CORE)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  CIS_LAYER3_VERSION,
  
  // Types
  type SourceProvider,
  type SourceTrust,
  type SourceTrustComponents,
  type SourceReport,
  type ReconciliationMethod,
  type DisputeStatus,
  type ReconciliationResult,
  type ReconciliationConfig,
  
  // Schemas
  SourceTrustSchema,
  ReconciliationResultSchema,
  
  // Configuration
  RECONCILIATION_CONFIGS,
  DEFAULT_SOURCE_TRUST,
  
  // Reconciliation functions
  reconcileMetric,
  reconcileEntityMetrics,
  getSourceTrust,
  createSourceReport,
  analyzeDisputes,
} from './layer3';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4: VALIDATION & ANOMALY DETECTION (FAIL-CLOSED MECHANISM)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  CIS_LAYER4_VERSION,
  
  // Types
  type RuleType,
  type ValidationFlag,
  type GatingImpact,
  type ValidationRule,
  type RuleCheckResult,
  type MetricValidationResult,
  type EntityValidationSummary,
  type AnomalyType,
  type AnomalySignal,
  type CrossMetricCheck,
  type CrossMetricCheckResult,
  
  // Rules
  STRUCTURAL_RULES,
  SEMANTIC_BOUND_RULES,
  BEHAVIORAL_ANOMALY_RULES,
  STALENESS_RULES,
  CROSS_METRIC_CHECKS,
  ALL_VALIDATION_RULES,
  getRulesForMetric,
  getRulesByType,
  
  // Validators
  validateStructural,
  validateSemanticBounds,
  validateStaleness,
  validateMetric,
  validateEntity,
  
  // Cross-metric checks
  checkMarketCapConsistency,
  checkSupplyConsistency,
  checkVolumeMCRatio,
  
  // Anomaly detection
  detectVolumeLiquidityMismatch,
  detectWashTrading,
  detectSocialFundamentalDivergence,
  detectConcentrationSpike,
} from './layer4';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 5: CONTEXT-AWARE CLASSIFICATION (PREVENTING CATEGORY MISTAKES)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  CIS_LAYER5_VERSION,
  
  // Enums
  AssetCategoryEnum,
  SectorGroupEnum,
  
  // Types
  type AssetCategory,
  type SectorGroup,
  type IdentityConfidenceComponents,
  type AssetClassification,
  type MetricRelevance,
  type ContextualFilterResult,
  type CategoryMetricPriority,
  
  // Schemas
  AssetClassificationSchema,
  
  // Constants
  CATEGORY_TO_SECTOR,
  WELL_KNOWN_CLASSIFICATIONS,
  CATEGORY_METRIC_PRIORITIES,
  
  // Classification functions
  getWellKnownClassification,
  calculateIdentityConfidence,
  classifyAsset,
  getMetricPriorities,
  getSectorFromCategory,
  
  // Contextual filtering
  getMetricRelevance,
  filterMetricsByContext,
  getPaymentTokenMetrics,
  getMemeCoinMetrics,
  getStablecoinMetrics,
  prepareForInterpretation,
} from './layer5';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 6: UNCERTAINTY & CONFIDENCE (THE HONESTY LAYER)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  CIS_LAYER6_VERSION,
  
  // Constants
  CONFIDENCE_WEIGHTS,
  HARD_GATE_THRESHOLDS,
  
  // Types
  type AgreementFactorInput,
  type ValidationFactorInput,
  type StalenessInput,
  type CoverageFactorInput,
  type ConfidenceInput,
  type ConfidenceScore,
  type GateCheckResult,
  type GateAssessment,
  
  // Schemas
  ConfidenceScoreSchema,
  
  // Factor calculations
  calculateAgreementFactor,
  calculateValidationFactor,
  calculateStalenessFactor,
  calculateCoverageFactor,
  
  // Main confidence calculation
  calculateConfidenceScore,
  
  // Gate assessment
  assessGates,
  canProduceOutput,
  buildConfidenceInput,
} from './layer6';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 7: EXPLANATION OBJECTS (SOURCE OF TRUTH CONTRACT)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  CIS_LAYER7_VERSION,
  EO_SCHEMA_VERSION,
  
  // Types
  type Claim,
  type Driver,
  type Warning,
  type WarningSeverity,
  type CoverageSummary,
  type ScoreSummary,
  type AssetContext,
  type ExplanationObject,
  type GatedOutput,
  
  // Schemas
  ClaimSchema,
  DriverSchema,
  WarningSchema,
  WarningSeverityEnum,
  CoverageSummarySchema,
  ScoreSummarySchema,
  AssetContextSchema,
  ExplanationObjectSchema,
  GatedOutputSchema,
  
  // Builder
  type PipelineResults,
  buildExplanationObject,
  isGatedOutput,
  validateExplanationObject,
} from './layer7';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 8: DETERMINISTIC NARRATION RULES (RENDERING ENGINE)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  CIS_LAYER8_VERSION,
  
  // System prompts
  SYSTEM_PROMPT_CORE,
  SYSTEM_PROMPT_TONE,
  SYSTEM_PROMPT_CATEGORY,
  SYSTEM_PROMPT_COMPLETE,
  GATED_OUTPUT_TEMPLATE,
  
  // Citation helpers
  formatCitation,
  formatClaimAssertion,
  
  // Renderer
  type RenderingContext,
  type RenderedNarrative,
  DEFAULT_RENDERING_CONTEXT,
  renderNarrative,
  renderBriefSummary,
  getSystemPrompt,
  formatEOForLLM,
} from './layer8';

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION: OMNISCORE BRIDGE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Conversion
  convertToCanonicalDatapoint,
  convertFeaturesToCanonical,
  
  // Semantic filtering
  filterBySectorApplicability,
  type SemanticFilterResult,
  
  // Full validation pipeline
  validateForOmniScore,
  type CISValidationResult,
} from './integration';
