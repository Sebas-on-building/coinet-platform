/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧠 INSIGHT PACK — PUBLIC API                                              ║
 * ║                                                                               ║
 * ║   Pass-1 Grok output with strict JSON schema enforcement.                     ║
 * ║   Every insight must reference Evidence Pack keys via evidence_keys.          ║
 * ║                                                                               ║
 * ║   USAGE:                                                                      ║
 * ║   1. executeGrokPass1() → Full orchestration with retries                     ║
 * ║   2. enforceInsightPack() → Manual enforcement of raw output                  ║
 * ║   3. resolveEvidencePath() → Verify evidence key paths                        ║
 * ║                                                                               ║
 * ║   HARD INVARIANTS:                                                            ║
 * ║   I1. Output MUST parse to JSON (no markdown, no prose)                       ║
 * ║   I2. Output MUST validate against schema with required fields                ║
 * ║   I3. Every driver/risk/catalyst must have resolvable evidence_keys           ║
 * ║   I4. Pass-1 may NOT introduce token facts not in Evidence Pack               ║
 * ║   I5. Evidence Pack must be valid before Pass-1 proceeds                      ║
 * ║   I6. On schema failure after max retries, mark engine as missing             ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// TYPES
// ============================================================================

export {
  // Schema version
  INSIGHT_PACK_VERSION,
  
  // Enums
  ConfidenceLevel,
  Severity,
  Direction,
  Horizon,
  Engine,
  
  // Core types
  EvidenceKeyPath,
  InsightPackMeta,
  CoverageUsed,
  Driver,
  Risk,
  Catalyst,
  Scenario,
  Scenarios,
  Unknown,
  RequiredClarifier,
  
  // Main schema
  InsightPackV1Schema,
  InsightPackSchema,
  type InsightPackV1,
  
  // Error output
  GrokErrorOutput,
  
  // Enforcement types
  type EnforcementResult,
  type EnforcementSuccess,
  type EnforcementFailure,
  type EnforcementOptions,
  DEFAULT_ENFORCEMENT_OPTIONS,
  
  // Numeric literal policy
  NUMERIC_LITERAL_PATTERN,
  containsNumericLiteral,
} from './types';

// ============================================================================
// EVIDENCE RESOLVER
// ============================================================================

export {
  // Resolver functions
  resolveEvidencePath,
  validateEvidenceKeys,
  parseEvidencePath,
  getAvailableModules,
  getModuleFromPack,
  isModuleAvailable,
  suggestPathsForModule,
  
  // Types
  type EvidenceResolution,
  type EvidenceKeyValidation,
} from './evidence-resolver';

// ============================================================================
// PROMPTS
// ============================================================================

export {
  GROK_SYSTEM_PROMPT,
  buildUserMessage,
  buildRetryPrompt,
  SCHEMA_SUMMARY,
  type UserMessageParams,
  type RetryContext,
} from './prompts';

// ============================================================================
// ENFORCER
// ============================================================================

export {
  enforceInsightPack,
  collectRetryErrors,
  extractJson,
  validateSchema,
  checkNumericLiterals,
  verifyEvidenceKeys,
  applyDemotions,
  isGrokErrorOutput,
  type EnforceInsightPackOptions,
  type RetryErrors,
} from './enforcer';

// ============================================================================
// GROK PASS-1 ORCHESTRATOR
// ============================================================================

export {
  executeGrokPass1,
  validateEvidencePackForPass1,
  createMissingEngineInsightPack,
  type GrokPass1Input,
  type GrokPass1Result,
  type GrokPass1Failure,
  type GrokPass1Output,
  type GrokPass1Options,
} from './grok-pass1';

// ============================================================================
// OBSERVABILITY
// ============================================================================

export {
  insightPackEventEmitter,
  emitRawReceived,
  emitParseAttempt,
  emitSchemaFail,
  emitEvidenceKeyFail,
  emitDegraded,
  emitSuccess,
  emitTimeout,
  emitRetry,
  emitMissing,
  aggregateInsightPackMetrics,
  type InsightPackEvent,
  type Pass1RawReceivedEvent,
  type Pass1ParseAttemptEvent,
  type Pass1SchemaFailEvent,
  type Pass1EvidenceKeyFailEvent,
  type Pass1DegradedEvent,
  type Pass1SuccessEvent,
  type Pass1TimeoutEvent,
  type Pass1RetryEvent,
  type Pass1MissingEvent,
  type InsightPackMetrics,
} from './observability';
