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
  IntentType,
  Timeframe,
  UnknownReason,
  
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
  ClarifierCandidate,
  
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
  
  // Numeric literal policy (hardened)
  NUMERIC_LITERAL_PATTERNS,
  detectNumericLiterals,
  containsNumericLiteral,
  
  // User-talk detection
  USER_TALK_PATTERNS,
  detectUserTalk,
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
  validateContent,
  verifyEvidenceKeysCoverageAware,
  applyDemotions,
  applyServerOverwrites,
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

// ============================================================================
// GEMINI PASS-1B ORCHESTRATOR
// ============================================================================

export {
  executeGeminiPass1,
  createMissingGeminiInsightPack,
  type GeminiPass1Input,
  type GeminiPass1Result,
  type GeminiPass1Failure,
  type GeminiPass1Output,
  type GeminiPass1Options,
} from './gemini-pass1';

// ============================================================================
// DUAL ENGINE ORCHESTRATOR
// ============================================================================

export {
  executeDualEnginePass1,
  determineResearchMode,
  getValidInsightPacks,
  canAggregate,
  getSingleInsightPack,
  extractTelemetry,
  DUAL_ENGINE_INTENTS,
  MINIMUM_COVERAGE_MODULES,
  DUAL_ENGINE_TIERS,
  type ResearchMode,
  type Pass1Status,
  type DualEngineInput,
  type DualEngineResult,
  type DualEngineOptions,
  type DualEngineTelemetry,
} from './dual-engine';

// ============================================================================
// AGGREGATOR
// ============================================================================

export {
  aggregateInsightPacks,
  normalizeTopic,
  calculateDisagreement,
  calculateFinalConfidence,
  FinalInsightObjectSchema,
  TOPIC_SYNONYMS,
  MODULE_TRUST_WEIGHTS,
  type FinalInsightObject,
  type AgreementTag,
  type DisagreementLevel,
  type MergedDriver,
  type MergedRisk,
  type MergedScenarios,
  type MergedUnknown,
  type AggregatorInput,
} from './aggregator';

// ============================================================================
// PROMPTS (Additional exports)
// ============================================================================

export {
  GEMINI_SYSTEM_PROMPT,
  CANONICAL_SCHEMA,
  buildGeminiUserMessage,
  COMMON_EVIDENCE_PATHS,
  CONTROLLED_TOPICS,
  type ControlledTopic,
} from './prompts';

// ============================================================================
// PASS-2 RENDERER
// ============================================================================

export {
  PASS2_SYSTEM_PROMPT,
  buildPass2UserMessage,
  executePass2Renderer,
  renderFallback,
  validateRenderedOutput,
  type Pass2Input,
  type Pass2Result,
  type Pass2Failure,
  type Pass2Output,
  type Pass2Options,
  type Pass2UserMessageParams,
} from './pass2-renderer';
