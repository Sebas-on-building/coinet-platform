/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 OMNISCORE v2.5.0 CANONICAL ENTRYPOINT                                 ║
 * ║                                                                               ║
 * ║   This is the SINGLE SOURCE OF TRUTH for OmniScore engine.                  ║
 * ║   All consumers MUST import from here, never from versioned files.           ║
 * ║                                                                               ║
 * ║   Current Engine: v2.5.0 (Convex Combination Formula)                        ║
 * ║   Formula: POS = 0.60×QS + 0.25×OS + 0.15×(100-Risk)                         ║
 * ║                                                                               ║
 * ║   Mathematical Properties:                                                    ║
 * ║   1. BOUNDEDNESS   - Score never exceeds input range                         ║
 * ║   2. CONVEXITY     - Weights sum to 1                                        ║
 * ║   3. MONOTONICITY  - ↑QS → ↑POS, ↓Risk → ↑POS                                ║
 * ║   4. FLOORING      - Blue-chips protected (QS≥90 → POS≥65)                   ║
 * ║   5. PLAUSIBILITY  - Cap at 97, 100/100 impossible                           ║
 * ║                                                                               ║
 * ║   ⚠️ BANNED IMPORTS (DO NOT USE):                                            ║
 * ║   - ../omniscore-v2.5.ts (import from this index instead)                    ║
 * ║   - ../omniscore-v2.3.ts (deprecated)                                        ║
 * ║   - ../omniscore-v2.2.ts (legacy)                                            ║
 * ║   - ../omniscore/legacy/** (legacy versions)                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION CONSTANTS (SINGLE SOURCE OF TRUTH)
// Import version info from here, not from omniscore-v2.5.ts directly
// ═══════════════════════════════════════════════════════════════════════════════
export {
  ENGINE_VERSION,
  FORMULA_VERSION,
  METHODOLOGY_ID,
  METHODOLOGY_URL,
  FEATURE_SCHEMA_VERSION,
  BUILD_COMMIT_SHA,
  BUILD_TIMESTAMP,
  METHODOLOGY_PROVENANCE,
  computeMethodologyHash,
  assertEngineVersion,
  assertFormulaVersion,
  assertVersionIntegrity,
  getVersionInfo,
  logVersionInfo,
  OmniScoreVersionError,
} from './current/version';
export type { VersionErrorCode } from './current/version';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ENGINE EXPORTS (v2.5.0 Convex Combination)
// ═══════════════════════════════════════════════════════════════════════════════
export * from '../omniscore-v2.5';

// Re-export current data fetcher (v2.3)
export {
  getProjectOmniScoreV23,
  getOmniScoreSnapshot,
  getMultipleOmniScoreSnapshots,
  snapshotToProjectPoint,
  formatSnapshotForAI,
  formatOmniScoreForAI,
} from '../omniscore-data-fetcher-v23';

// Re-export debug view
export {
  generateDebugView,
  formatDebugView,
  formatSnapshotForAI as formatSnapshotForAIDebug,
} from '../omniscore-debug-view';

// Re-export visualizer
export * from '../omniscore-visualizer';

// Re-export constants (excluding TierLabel to avoid duplicate export)
export {
  DEFAULT_QS_THRESHOLD,
  DEFAULT_OS_THRESHOLD,
  TIER_THRESHOLDS,
  getTierFromScore,
} from '../omniscore-constants';
export type { TierLabel } from '../omniscore-constants';

// Legacy alias for backwards compatibility
// Prefer using ENGINE_VERSION from './current/version'
export { OMNISCORE_ENGINE_VERSION } from '../omniscore-v2.5';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION (Phase 3)
// ═══════════════════════════════════════════════════════════════════════════════
export {
  // Schemas
  SegmentSchema,
  FeatureInputSchema,
  RegimeTypeSchema,
  SectorTypeSchema,
  CapBucketSchema,
  MarketDataSchema,
  CryptoRegimeSignalsSchema,
  CalculateOmniScoreParamsSchema,
  OmniScoreResultSchema,
  // Thresholds
  MIN_QS_INPUTS,
  MIN_OS_INPUTS,
  MIN_COVERAGE_QS,
  MIN_COVERAGE_OS,
  // Functions
  validateOmniScoreParams,
  safeValidateOmniScoreParams,
  validateOmniScoreResult,
  trackMissingFields,
  // Error class
  OmniScoreValidationError,
} from './current/validation';
export type { 
  ValidatedOmniScoreParams,
  ValidatedOmniScoreResult,
  MissingFieldsAudit,
} from './current/validation';

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS & DATA QUALITY (Phase 4)
// ═══════════════════════════════════════════════════════════════════════════════
export {
  // Error class
  OmniScoreError,
  // Type guards
  isOmniScoreError,
  wrapError,
  // Data quality
  checkDataQuality,
  assertDataQualityOrThrow,
  // Assertions
  assertFinite,
  assertScoreBounds,
  assertNormalizedBounds,
  // Factory functions
  createUpstreamTimeoutError,
  createUpstreamFailureError,
  createVersionMismatchError,
  createInvariantViolationError,
} from './current/errors';
export type {
  OmniScoreErrorCode,
  OmniScoreErrorSeverity,
  OmniScoreErrorDetails,
  DataQualityResult,
} from './current/errors';

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE (Phase 5)
// ═══════════════════════════════════════════════════════════════════════════════
export {
  isPersistenceEnabled,
  getPreviousPos,
  getRecentHistory,
  storePosForSmoothing,
  getHoursSinceLastPos,
  computeInputsHash,
  cleanupOldHistory,
  getRecordCounts,
} from './current/persistence';
export type {
  StoredPosState,
  StorePosParams,
} from './current/persistence';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANTS (Phase 6)
// ═══════════════════════════════════════════════════════════════════════════════
export {
  INVARIANT_CODES,
  validateBundleOrThrow,
  validateResultOrThrow,
  clampScore,
  normalizeProbs,
  normalizeWeights,
} from './current/invariants';
export type {
  InvariantCode,
  InvariantViolation,
  InvariantCheckResult,
  InputBundle,
  ScoreResult,
} from './current/invariants';

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS (Phase 9)
// ═══════════════════════════════════════════════════════════════════════════════
export {
  getFeatureFlags,
  resetFeatureFlagCache,
  isFailClosedEnabled,
  isSmoothingPersistEnabled,
  isStrictValidationEnabled,
  isMetricsEnabled,
  isVerboseAuditEnabled,
  isVersionCheckStrictEnabled,
  getFeatureFlagsForLogging,
  logFeatureFlags,
  getRolloutPercentage,
  shouldUseNewBehavior,
} from './current/feature-flags';
export type { FeatureFlags } from './current/feature-flags';

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVABILITY - METRICS (Phase 7)
// ═══════════════════════════════════════════════════════════════════════════════
export {
  // Metrics
  omniscoreCalcLatencyMs,
  omniscoreCalcTotal,
  omniscoreUpstreamFailuresTotal,
  omniscoreInsufficientDataTotal,
  omniscoreVersionMismatchTotal,
  omniscoreSmoothingMissingStateTotal,
  omniscoreInvariantViolationTotal,
  omniscoreValidationErrorTotal,
  omniscoreCoverageGauge,
  omniscoreDegradedTotal,
  omniscoreFeatureFlagGauge,
  // Helpers
  recordCalcSuccess,
  recordCalcError,
  recordUpstreamFailure,
  recordSmoothingStateMiss,
  recordCoverage,
  // Export
  getPrometheusMetrics,
  getMetricsJson,
  resetMetrics,
} from './current/metrics';
export type {
  Counter,
  Histogram,
  Gauge,
} from './current/metrics';

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVABILITY - LOGGING (Phase 7)
// ═══════════════════════════════════════════════════════════════════════════════
export {
  OmniScoreLogger,
  createOmniScoreLogger,
  defaultLogger,
  createAuditLogEntry,
} from './current/logging';
export type {
  LogLevel,
  OmniScoreLogContext,
  StructuredLogEntry,
  AuditLogEntry,
} from './current/logging';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS FROM ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
export type {
  RegimeType,
  Segment,
  Severity,
  ConfidenceLevel,
  TierLabel,
  NRGInterpretation,
  CapBucket,
  SectorType,
  NMITier,
  OmniScoreSnapshot,
  OmniScoreProductionResponse,
  CalculateOmniScoreParams,
  FeatureInput,
} from '../omniscore-v2.5';
