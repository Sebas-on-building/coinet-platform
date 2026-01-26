/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔐 HARDENING MODULE — PRODUCTION-GRADE EDGE CASE HANDLING                ║
 * ║                                                                               ║
 * ║   This module turns "looks good" into "actually survives production."        ║
 * ║                                                                               ║
 * ║   COMPONENTS:                                                                 ║
 * ║   1. JSON Schema Enforcer - Strict extraction with retries                   ║
 * ║   2. Evidence Verifier - Path resolution + claim gate                        ║
 * ║   3. Conflict Resolver - Deterministic tie-break rules                       ║
 * ║   4. Conversation State - Full entity tracking (not just last token)         ║
 * ║   5. Streaming Buffer - Validate before you stream                           ║
 * ║   6. Observability - Structured events for debugging                         ║
 * ║                                                                               ║
 * ║   PRODUCTION ACCEPTANCE CRITERIA:                                             ║
 * ║   - 0 outputs with numbers not in evidence                                   ║
 * ║   - 0 outputs with claim-types missing evidence                              ║
 * ║   - >99% language lock accuracy                                              ║
 * ║   - <3.5s p95 for dual research                                              ║
 * ║   - <2.5s p95 for single research                                            ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production hardening                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// JSON SCHEMA ENFORCER
// ============================================================================

export {
  // Main functions
  enforceSchema,
  extractJSON,
  validateAgainstSchema,
  buildRetryPrompt,
  
  // Driver/Risk validators
  validateDriverItem,
  validateRiskItem,
  
  // Schemas
  INSIGHT_PACK_SCHEMA,
  RENDERER_ENVELOPE_SCHEMA,
  
  // Types
  type SchemaField,
  type SchemaDefinition,
  type ExtractionResult,
  type RetryContext,
  type EnforcerConfig,
} from './json-schema-enforcer';

// ============================================================================
// EVIDENCE VERIFIER + CLAIM GATE
// ============================================================================

export {
  // Main functions
  verifyInsightEvidence,
  gateClaimsInOutput,
  buildEvidencePathMap,
  verifyEvidenceKeys,
  
  // Claim detection
  detectClaimsInText,
  checkClaimEvidence,
  
  // Path resolution
  resolvePath,
  
  // Constants
  CLAIM_REQUIREMENTS,
  
  // Types
  type ClaimType,
  type ClaimRequirement,
  type ClaimVerification,
  type EvidencePathResult,
  type VerificationResult,
  type VerifyInsightInput,
} from './evidence-verifier';

// ============================================================================
// CONFLICT RESOLVER
// ============================================================================

export {
  // Main function
  analyzeConflicts,
  
  // Classification
  classifyDriverConflict,
  classifyRiskConflict,
  
  // Resolution
  resolveDriverConflict,
  resolveRiskConflict,
  
  // Direction detection
  detectDirection,
  directionsConflict,
  
  // Types
  type ConflictClass,
  type DriverConflict,
  type RiskConflict,
  type ConflictResolution,
  type ConflictAnalysis,
} from './conflict-resolver';

// ============================================================================
// CONVERSATION STATE
// ============================================================================

export {
  // State management
  getConversationState,
  updateConversationState,
  
  // Token resolution
  shouldReuseLastToken,
  storeTokenResolution,
  confirmTokenResolution,
  
  // Clarification
  hasPendingClarification,
  setPendingClarification,
  shouldAskClarification,
  parseClarificationResponse,
  
  // Intent tracking
  storeLastIntent,
  shouldRepeatLastIntent,
  
  // Evidence freshness
  updateEvidenceFreshness,
  getStaleModules,
  
  // Cleanup
  cleanupExpiredStates,
  
  // Constants
  STATE_TTL_MS,
  STALE_EVIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_REUSE_TTL,
  
  // Types
  type ResolvedTokenState,
  type ResolutionCandidate,
  type PendingClarification,
  type LastIntent,
  type EvidenceFreshness,
  type ConversationEntityState,
} from './conversation-state';

// ============================================================================
// STREAMING BUFFER
// ============================================================================

export {
  // Classes
  ResponseBuffer,
  ValidatedStreamer,
  SentenceStreamer,
  
  // Functions
  streamWithRetry,
  createSafeStream,
  preStreamChecks,
  
  // Config
  DEFAULT_STREAMING_CONFIG,
  
  // Types
  type StreamChunk,
  type BufferedResponse,
  type StreamingConfig,
  type StreamHandler,
  type StreamWithRetryOptions,
  type SafeStreamOptions,
} from './streaming-buffer';

// ============================================================================
// OBSERVABILITY
// ============================================================================

export {
  // Event emitter
  eventEmitter,
  observabilityEmitter,
  
  // Emit functions
  emitTokenResolution,
  emitEvidenceCoverage,
  emitPass1Parse,
  emitConflictAnalysis,
  emitGuardrailBlock,
  emitRegeneration,
  emitLatency,
  emitUserFeedback,
  emitSystemError,
  
  // Metrics
  aggregateMetrics,
  
  // Types
  type EventCategory,
  type EventSeverity,
  type BaseEvent,
  type TokenResolutionEvent,
  type EvidenceCoverageEvent,
  type Pass1ParseEvent,
  type ConflictAnalysisEvent,
  type GuardrailBlockEvent,
  type RegenerationEvent,
  type LatencyEvent,
  type UserFeedbackEvent,
  type SystemErrorEvent,
  type ObservabilityEvent,
  type AggregatedMetrics,
} from './observability';

// ============================================================================
// STRUCTURED CLAIMS
// ============================================================================

export {
  // Main functions
  validateClaim,
  validateAllClaims,
  buildClaim,
  extractAvailableClaims,
  generateClaimAllowlist,
  
  // Constants
  CLAIM_VALIDATION_RULES,
  
  // Types
  type ClaimType,
  type StructuredClaim,
  type ClaimValidationRule,
  type ClaimValidationResult,
} from './structured-claims';

// ============================================================================
// TIME COHERENCE
// ============================================================================

export {
  // Main functions
  checkTimeCoherence,
  checkClaimTimeCoherence,
  generateTimeBounds,
  
  // Config
  DEFAULT_TIME_CONFIG,
  MODULE_FRESHNESS_THRESHOLDS,
  
  // Types
  type ModuleTimestamp,
  type TimeCoherenceResult,
  type TimeCoherenceConfig,
  type TimeBounds,
} from './time-coherence';

// ============================================================================
// PRESENTATION CONTRACT
// ============================================================================

export {
  // Main functions
  generatePresentationContract,
  enforcePresentationContract,
  generatePresentationPromptSection,
  
  // Constants
  CONFIDENT_PHRASES,
  DEFINITIVE_PHRASES,
  OVERPROMISE_PHRASES,
  HEDGING_PHRASES,
  MIXED_SIGNAL_ACK,
  CAUTIOUS_ENDINGS,
  CONFIDENT_ENDINGS,
  
  // Types
  type ToneLevel,
  type ToneFlags,
  type AllowedEndings,
  type PresentationContract,
  type PresentationInput,
  type PresentationViolation,
} from './presentation-contract';

// ============================================================================
// TOKEN CONFIRMATION LATCH
// ============================================================================

export {
  // Main functions
  getTokenLatch,
  setTokenLatch,
  confirmTokenLatch,
  rejectTokenLatch,
  decideLatchAction,
  parseUserConfirmation,
  recordClarificationAsked,
  determineLatchState,
  cleanupExpiredLatches,
  
  // Constants
  LATCH_THRESHOLDS,
  LATCH_TTL_MS,
  
  // Types
  type TokenSource,
  type LatchState,
  type TokenLatch,
  type TokenCandidate,
  type LatchDecision,
} from './token-confirmation-latch';

// ============================================================================
// INSTRUCTION FIREWALL
// ============================================================================

export {
  // Main functions
  detectInjections,
  sanitizeUserMessage,
  runFirewall,
  extractUserIntent,
  checkResponseForInjectionSuccess,
  hasHighSeverityInjection,
  
  // Constants
  INJECTION_PATTERNS,
  
  // Types
  type InjectionType,
  type InjectionDetection,
  type SanitizedInput,
  type FirewallResult,
} from './instruction-firewall';

// ============================================================================
// DIALOGUE CONTRACT
// ============================================================================

export {
  // Main functions
  generateDialogueContract,
  buildDialogueContract,
  validateDialogueContract,
  generateDialoguePromptSection,
  
  // Detection functions
  detectSlang,
  detectMixedLanguageScaffolding,
  analyzeQuestion,
  checkContinuity,
  detectTemplateIssues,
  checkRegisterCompliance,
  
  // Opener tracking
  recordOpener,
  getRecentOpeners,
  isOpenerRepeated,
  
  // Constants
  TEMPLATE_OPENERS,
  NATURAL_OPENERS,
  SLANG_PATTERNS,
  REGISTER_RULES,
  
  // Types
  type DialogueRegister,
  type FormalityLevel,
  type EmojiLevel,
  type QuestionType,
  type DialogueStyle,
  type DialogueContinuity,
  type DialogueQuestion,
  type AntiTemplate,
  type DialogueContract,
  type DialogueContractInput,
  type DialogueValidationResult,
} from './dialogue-contract';

// ============================================================================
// LANGUAGE AUTHORITY
// ============================================================================

export {
  // Main functions
  resolveLanguageAuthority,
  validateLanguage,
  buildLanguagePipeline,
  generateLanguagePromptSection,
  
  // Detection
  detectLanguage,
  detectExplicitLanguageCommand,
  detectMixedLanguage,
  
  // Session management
  getSessionLanguage,
  setSessionLanguage,
  cleanupExpiredSessions,
  
  // Constants
  LANGUAGE_MARKERS,
  LANGUAGE_COMMANDS,
  
  // Types
  type SupportedLanguage,
  type LanguageSource,
  type LanguageAuthority,
  type LanguagePipeline,
  type LanguageValidationResult,
} from './language-authority';

// ============================================================================
// UNBREAKABLE ENVELOPE
// ============================================================================

export {
  // Main functions
  validateUnbreakableEnvelope,
  buildUnbreakableEnvelope,
  
  // Schema
  ENVELOPE_SCHEMA_PROMPT,
  
  // Types
  type UnbreakableEnvelope,
  type EnvelopeValidationResult,
  type EnvelopeBuilderInput,
} from './unbreakable-envelope';

// ============================================================================
// CONVENIENCE: FULL HARDENING PIPELINE
// ============================================================================

import { enforceSchema, INSIGHT_PACK_SCHEMA } from './json-schema-enforcer';
import { verifyInsightEvidence, gateClaimsInOutput } from './evidence-verifier';
import { analyzeConflicts } from './conflict-resolver';
import { ValidatedStreamer, preStreamChecks } from './streaming-buffer';
import { emitPass1Parse, emitGuardrailBlock, emitLatency } from './observability';
import type { EvidencePack, InsightPack } from '../research-engine';

export interface HardenedPipelineResult {
  success: boolean;
  insightPack: InsightPack | null;
  validationIssues: string[];
  claimViolations: string[];
  conflictLevel: string;
  latencyMs: number;
}

/**
 * Run full hardening pipeline on a Pass-1 result
 */
export async function hardenPass1Result(
  rawOutput: string,
  evidencePack: EvidencePack,
  conversationId: string,
  engine: 'grok' | 'gemini',
  onRetry?: (errors: string[]) => Promise<string>
): Promise<HardenedPipelineResult> {
  const startTime = Date.now();
  
  // Step 1: Schema enforcement
  const enforced = await enforceSchema<InsightPack>(rawOutput, {
    schema: INSIGHT_PACK_SCHEMA,
    maxRetries: 2,
    onRetry: onRetry ? async (ctx) => onRetry(ctx.previousErrors) : undefined,
  });
  
  emitPass1Parse(conversationId, {
    engine,
    success: enforced.success,
    extractionMethod: enforced.extractionMethod,
    schemaErrors: enforced.validationErrors,
    retryCount: enforced.retryCount,
    latencyMs: Date.now() - startTime,
    rawLengthChars: rawOutput.length,
    driverCount: enforced.data?.insight.drivers.length || 0,
    riskCount: enforced.data?.insight.risks.length || 0,
    unknownCount: enforced.data?.insight.unknowns.length || 0,
  });
  
  if (!enforced.success || !enforced.data) {
    return {
      success: false,
      insightPack: null,
      validationIssues: enforced.validationErrors,
      claimViolations: [],
      conflictLevel: 'NONE',
      latencyMs: Date.now() - startTime,
    };
  }
  
  // Step 2: Evidence verification
  const verification = verifyInsightEvidence({
    drivers: enforced.data.insight.drivers,
    risks: enforced.data.insight.risks,
    scenarios: enforced.data.insight.scenarios,
    evidencePack,
  });
  
  // Demote items with invalid evidence to unknowns
  if (verification.demotedToUnknowns.length > 0) {
    enforced.data.insight.unknowns = [
      ...enforced.data.insight.unknowns,
      ...verification.demotedToUnknowns,
    ];
    
    // Filter out drivers/risks that got demoted
    // (In production, you'd want more sophisticated handling)
  }
  
  // Step 3: Claim violations
  const claimViolations = verification.claimViolations.map(
    v => `${v.claim}: ${v.textMatches.join(', ')}`
  );
  
  return {
    success: verification.overallValid,
    insightPack: enforced.data,
    validationIssues: verification.invalidPaths,
    claimViolations,
    conflictLevel: 'NONE', // No conflict analysis for single engine
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Create a hardened validator for streaming
 */
export function createHardenedValidator(evidencePack: EvidencePack) {
  return (content: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Pre-stream checks
    const preCheck = preStreamChecks(content);
    if (!preCheck.canStream) {
      errors.push(preCheck.reason || 'Pre-stream check failed');
      return { isValid: false, errors };
    }
    
    // Claim gate
    const claimResult = gateClaimsInOutput(content, evidencePack);
    if (!claimResult.passed) {
      for (const violation of claimResult.violations) {
        errors.push(`Ungrounded claim: ${violation.claim}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
}
