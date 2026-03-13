/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔗 EVIDENCE PACK INTEGRATION — Pass-1 Pipeline Integration                ║
 * ║                                                                               ║
 * ║   Wires Evidence Pack into the Grok Pass-1 orchestrator with feature flag.   ║
 * ║                                                                               ║
 * ║   FEATURE FLAG: ENABLE_EVIDENCE_PACK_V1                                       ║
 * ║   - When true: Build Evidence Pack before Pass-1                              ║
 * ║   - When false: Use existing behavior                                         ║
 * ║                                                                               ║
 * ║   RULES:                                                                      ║
 * ║   1. If resolver confidence < threshold → return clarifier (skip Pass-1)      ║
 * ║   2. If quality_score is low → Pass-1 runs but gets unknowns pressure         ║
 * ║   3. Fallback to current behavior if pack build fails                         ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import {
  buildEvidencePack,
  shouldBuildEvidencePack,
  getEvidenceSummaryForPrompt,
} from './builder';
import {
  EvidencePack,
  EvidencePackBuildOptions,
  EvidenceIntent,
  ResolvedToken,
  TokenClarifier,
  RESOLUTION_THRESHOLDS,
  type EvidencePackBuildFailure,
} from './types';
import { generateCoverageSummary, getConfidenceCapFromQuality, requiresUncertaintyDisclosure } from './coverage';
import { trackPackBuild, logPackSummary } from './observability';

// ============================================================================
// FEATURE FLAG
// ============================================================================

/**
 * Check if Evidence Pack V1 is enabled
 */
export function isEvidencePackEnabled(): boolean {
  return process.env.ENABLE_EVIDENCE_PACK_V1 === 'true';
}

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineInput {
  userMessage: string;
  language: string;
  intent: string;
  
  // Session state (for token reuse)
  sessionLastToken?: ResolvedToken;
  pendingClarifier?: TokenClarifier;
  
  // Override detection
  forceEvidence?: boolean;
  skipEvidence?: boolean;
}

export interface PipelineResult {
  // Evidence Pack (null if not built or failed)
  evidencePack: EvidencePack | null;
  
  // Clarifier needed (if token resolution is ambiguous)
  clarifier: TokenClarifier | null;
  
  // Coverage summary for Pass-1 prompt
  coverageSummary: string;
  
  // Quality metrics
  qualityScore: number;
  confidenceCap: 'high' | 'medium' | 'low';
  requiresUncertaintyDisclosure: boolean;
  
  // Debug info
  buildTimeMs: number;
  usedFallback: boolean;
  fallbackReason?: string;
}

export interface Pass1ReadyResult {
  ready: true;
  evidencePack: EvidencePack;
  coverageSummary: string;
  qualityScore: number;
  confidenceCap: 'high' | 'medium' | 'low';
  requiresUncertaintyDisclosure: boolean;
}

export interface Pass1ClarifierResult {
  ready: false;
  clarifier: TokenClarifier;
  evidencePack: EvidencePack | null;
}

export interface Pass1FailureResult {
  ready: false;
  error: string;
  fallbackReason: string;
}

export type Pass1PreparationResult = Pass1ReadyResult | Pass1ClarifierResult | Pass1FailureResult;

// ============================================================================
// INTENT MAPPING
// ============================================================================

const INTENT_MAP: Record<string, EvidenceIntent> = {
  'new_coin_analysis': 'NEW_COIN_ANALYSIS',
  'token_analysis': 'TOKEN_ANALYSIS',
  'explain_move': 'EXPLAIN_MOVE',
  'market_overview': 'MARKET_OVERVIEW',
  'decision_help': 'DECISION_HELP',
  'portfolio_analysis': 'PORTFOLIO_ANALYSIS',
  'news_summary': 'NEWS_SUMMARY',
  'derivatives_check': 'DERIVATIVES_CHECK',
  'sentiment_check': 'SENTIMENT_CHECK',
  'whale_tracking': 'WHALE_TRACKING',
  'quick_price': 'QUICK_PRICE',
  'learning': 'LEARNING',
  // Lowercase variants
  'NEW_COIN_ANALYSIS': 'NEW_COIN_ANALYSIS',
  'TOKEN_ANALYSIS': 'TOKEN_ANALYSIS',
  'EXPLAIN_MOVE': 'EXPLAIN_MOVE',
  'MARKET_OVERVIEW': 'MARKET_OVERVIEW',
  'DECISION_HELP': 'DECISION_HELP',
};

function mapIntent(intent: string): EvidenceIntent {
  return INTENT_MAP[intent] || INTENT_MAP[intent.toLowerCase()] || 'OTHER';
}

// ============================================================================
// MAIN INTEGRATION FUNCTION
// ============================================================================

/**
 * Prepare Evidence Pack for Pass-1 pipeline.
 * 
 * This function:
 * 1. Checks if Evidence Pack is enabled (feature flag)
 * 2. Determines if the message needs evidence
 * 3. Builds the Evidence Pack
 * 4. Returns clarifier if token resolution is ambiguous
 * 5. Falls back gracefully on failures
 */
export async function prepareForPass1(input: PipelineInput): Promise<Pass1PreparationResult> {
  const startTime = Date.now();

  // Check feature flag
  if (!isEvidencePackEnabled() && !input.forceEvidence) {
    logger.debug('Evidence Pack V1 disabled, skipping');
    return {
      ready: false,
      error: 'Evidence Pack disabled',
      fallbackReason: 'Feature flag ENABLE_EVIDENCE_PACK_V1 is not set',
    };
  }

  // Check if we should skip evidence
  if (input.skipEvidence) {
    logger.debug('Evidence Pack explicitly skipped');
    return {
      ready: false,
      error: 'Evidence skipped by request',
      fallbackReason: 'skipEvidence flag was set',
    };
  }

  const mappedIntent = mapIntent(input.intent);

  // Check if message needs evidence
  if (!shouldBuildEvidencePack(mappedIntent, input.userMessage)) {
    logger.debug('Message does not require Evidence Pack', { intent: mappedIntent });
    return {
      ready: false,
      error: 'No evidence needed',
      fallbackReason: 'Intent does not require evidence gathering',
    };
  }

  try {
    // Build Evidence Pack
    const buildOptions: EvidencePackBuildOptions = {
      userMessage: input.userMessage,
      language: input.language,
      intent: mappedIntent,
      inputEntities: [],  // Will be extracted by resolver
      sessionLastToken: input.sessionLastToken,
      pendingClarifier: input.pendingClarifier,
    };

    const buildResult = await buildEvidencePack(buildOptions);
    const buildTimeMs = Date.now() - startTime;

    if (!buildResult.ok) {
      const failure = buildResult as EvidencePackBuildFailure;
      logger.warn('Evidence Pack build failed', { error: failure.error });
      return {
        ready: false,
        error: failure.error,
        fallbackReason: `Build failed: ${failure.error}`,
      };
    }

    const pack = buildResult.pack;

    // Track for observability
    trackPackBuild(
      true,
      pack.coverage.quality_score,
      buildTimeMs,
      pack.coverage.available,
      pack.coverage.missing,
      !!pack.token_resolution.clarifier
    );

    logPackSummary(pack, buildTimeMs);

    // Check if clarifier is needed (RULE 1)
    if (pack.token_resolution.clarifier) {
      logger.info('Token resolution needs clarification', {
        question: pack.token_resolution.clarifier.question,
        type: pack.token_resolution.clarifier.type,
      });

      return {
        ready: false,
        clarifier: pack.token_resolution.clarifier,
        evidencePack: pack,  // Partial pack with market data might still be useful
      };
    }

    // Compute quality metrics
    const qualityScore = pack.coverage.quality_score;
    const confidenceCap = getConfidenceCapFromQuality(qualityScore);
    const needsDisclosure = requiresUncertaintyDisclosure(pack.coverage);
    const coverageSummary = generateCoverageSummary(pack.coverage);

    // RULE 2: Low quality → Pass-1 runs but with unknowns pressure
    if (qualityScore < 0.5) {
      logger.warn('Evidence Pack quality is low, Pass-1 will have unknowns pressure', {
        qualityScore,
        missing: pack.coverage.missing,
      });
    }

    return {
      ready: true,
      evidencePack: pack,
      coverageSummary,
      qualityScore,
      confidenceCap,
      requiresUncertaintyDisclosure: needsDisclosure,
    };

  } catch (error: any) {
    logger.error('Evidence Pack preparation failed', { error: error.message });
    
    return {
      ready: false,
      error: error.message,
      fallbackReason: `Unexpected error: ${error.message}`,
    };
  }
}

// ============================================================================
// INTEGRATION WITH GROK PASS-1
// ============================================================================

export interface GrokPass1InputWithEvidence {
  userMessage: string;
  intent: string;
  language: string;
  evidencePack: EvidencePack;
  assetFocus: string | null;
  chain: string | null;
  timeframe?: 'snapshot' | 'today' | 'week' | 'historical';
  
  // Evidence Pack metadata
  coverageSummary: string;
  qualityScore: number;
  confidenceCap: 'high' | 'medium' | 'low';
  requiresUncertaintyDisclosure: boolean;
}

/**
 * Build the enhanced input for Grok Pass-1 with Evidence Pack metadata.
 */
export function buildGrokInput(
  prepResult: Pass1ReadyResult,
  originalInput: PipelineInput
): GrokPass1InputWithEvidence {
  const pack = prepResult.evidencePack;
  const primaryToken = pack.token_resolution.resolved[0];

  return {
    userMessage: originalInput.userMessage,
    intent: originalInput.intent,
    language: originalInput.language,
    evidencePack: pack,
    assetFocus: primaryToken?.symbol || null,
    chain: primaryToken?.chain || null,
    timeframe: 'snapshot',
    coverageSummary: prepResult.coverageSummary,
    qualityScore: prepResult.qualityScore,
    confidenceCap: prepResult.confidenceCap,
    requiresUncertaintyDisclosure: prepResult.requiresUncertaintyDisclosure,
  };
}

// ============================================================================
// CLARIFIER RESPONSE HELPER
// ============================================================================

/**
 * Build a user-facing response for clarifier.
 */
export function buildClarifierResponse(clarifier: TokenClarifier): {
  needsClarification: true;
  question: string;
  candidates: Array<{ symbol: string; chain: string; name?: string }>;
  attemptCount: number;
} {
  return {
    needsClarification: true,
    question: clarifier.question,
    candidates: clarifier.candidates.map(c => ({
      symbol: c.symbol,
      chain: c.chain,
      name: c.name,
    })),
    attemptCount: clarifier.attempt_count,
  };
}

// ============================================================================
// SESSION STATE HELPERS
// ============================================================================

/**
 * Extract session state for next request.
 */
export function extractSessionState(pack: EvidencePack): {
  lastToken?: ResolvedToken;
  pendingClarifier?: TokenClarifier;
} {
  const resolved = pack.token_resolution.resolved;
  
  return {
    lastToken: resolved.length > 0 ? resolved[0] : undefined,
    pendingClarifier: pack.token_resolution.clarifier || undefined,
  };
}

/**
 * Apply user's clarification response to resolve ambiguous token.
 */
export function applyClarificationResponse(
  pack: EvidencePack,
  userSelection: { symbol: string; chain: string } | { address: string }
): ResolvedToken | null {
  const clarifier = pack.token_resolution.clarifier;
  if (!clarifier) return null;

  // Find matching candidate
  const candidates = clarifier.candidates;
  
  if ('address' in userSelection) {
    // User provided address
    const candidate = candidates.find(c => c.address === userSelection.address);
    if (candidate) {
      return {
        symbol: candidate.symbol,
        name: candidate.name,
        chain: candidate.chain,
        address: candidate.address,
        confidence: 0.98,  // User confirmed
        margin: 1.0,
        method: 'address',
        is_user_confirmed: true,
        candidates,
      };
    }
  } else {
    // User selected symbol/chain
    const candidate = candidates.find(
      c => c.symbol === userSelection.symbol && c.chain === userSelection.chain
    );
    if (candidate) {
      return {
        symbol: candidate.symbol,
        name: candidate.name,
        chain: candidate.chain,
        address: candidate.address,
        confidence: 0.98,  // User confirmed
        margin: 1.0,
        method: 'ticker_lookup',
        is_user_confirmed: true,
        candidates,
      };
    }
  }

  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  mapIntent,
};
