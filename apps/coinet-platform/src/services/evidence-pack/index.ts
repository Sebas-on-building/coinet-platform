/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📦 UNIVERSAL EVIDENCE PACK — PUBLIC API                                   ║
 * ║                                                                               ║
 * ║   The single source of truth for all factual claims and numbers.             ║
 * ║   Any LLM stage must treat Evidence Pack as the only facts provider.         ║
 * ║                                                                               ║
 * ║   USAGE:                                                                      ║
 * ║   1. decideEvidenceEligibility() → Check if request needs Evidence Pack      ║
 * ║   2. buildEvidencePack() → Build the pack with all modules                   ║
 * ║   3. formatEvidencePackForAI() → Format for LLM context                      ║
 * ║                                                                               ║
 * ║   HARD INVARIANTS:                                                            ║
 * ║   I1. No analysis-intent response without Evidence Pack attached              ║
 * ║   I2. No token-specific metrics unless present in Evidence Pack               ║
 * ║   I3. Coverage map always includes available, missing, freshness_seconds      ║
 * ║   I4. Same inputs → same module plan (deterministic)                          ║
 * ║   I5. Ticker ambiguity must be confidence-gated                               ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// TYPES
// ============================================================================

export {
  // Core types
  EvidencePackKind,
  ModuleStatus,
  BudgetTier,
  ResolutionStatus,
  ChainId,
  
  // Module wrapper
  EvidenceModule,
  ModuleError,
  
  // Token resolution
  TokenResolution,
  ResolvedTokenPrimary,
  TokenCandidate,
  
  // Coverage
  CoverageMap,
  
  // Token evidence types
  DexScreenerEvidence,
  SecurityEvidence,
  HoldersEvidence,
  PumpFunEvidence,
  SmartMoneyEvidence,
  
  // Market evidence types
  MarketSnapshotEvidence,
  DerivativesEvidence,
  SentimentEvidence,
  NewsEvidence,
  
  // Pack types
  TokenEvidencePack,
  MarketEvidencePack,
  CombinedEvidencePack,
  EvidencePack,
  
  // Input types
  EvidencePackBuilderInput,
  DetectedTokenEntity,
  
  // Eligibility types
  EligibilityInput,
  EligibilityDecision,
  
  // Configuration
  TOKEN_MODULE_CONFIG,
  MARKET_MODULE_CONFIG,
  CONFIDENCE_THRESHOLDS,
  LATENCY_TARGETS,
} from './types';

// ============================================================================
// ELIGIBILITY GATE
// ============================================================================

export {
  decideEvidenceEligibility,
  
  // Helpers (for testing)
  isGreetingOrAck,
  isEducationalQuery,
  isMarketQuery,
  isPriceCheckOnly,
  mapIntentToBudget,
  evaluateTokenConfidence,
  
  // Patterns (for testing)
  GREETING_PATTERNS,
  EDUCATIONAL_PATTERNS,
  MARKET_QUERY_PATTERNS,
  ANALYSIS_INTENTS,
  PRICE_CHECK_MAJORS,
} from './eligibility';

// ============================================================================
// BUILDER
// ============================================================================

export {
  buildEvidencePack,
  formatEvidencePackForAI,
  
  // Individual builders (for testing)
  resolveTokenEntity,
  buildTokenEvidencePack,
  buildMarketEvidencePack,
  formatTokenDataForAI,
  formatMarketDataForAIFromPack,
} from './builder';

// ============================================================================
// COVERAGE
// ============================================================================

export {
  CoverageTracker,
  analyzeCoverage,
  formatCoverageForAI,
  formatCoverageSummary,
  buildFactGate,
  type CoverageAnalysis,
} from './coverage';

// ============================================================================
// CACHE
// ============================================================================

export {
  evidenceCache,
  getCachedModuleData,
  setCachedModuleData,
  invalidateCacheEntry,
} from './cache';

// ============================================================================
// OBSERVABILITY
// ============================================================================

export {
  evidenceEventEmitter,
  emitEligibilityDecision,
  emitPackPlanned,
  emitModuleFetchResult,
  emitPackComplete,
  emitResolution,
  emitCacheEvent,
  aggregateMetrics,
  
  // Event types
  type EvidenceEvent,
  type EvidenceEligibilityDecisionEvent,
  type EvidencePackPlannedEvent,
  type EvidenceModuleFetchResultEvent,
  type EvidencePackCompleteEvent,
  type EvidenceResolutionEvent,
  type EvidenceCacheEvent,
  type EvidenceMetrics,
} from './observability';

// ============================================================================
// MODULES
// ============================================================================

export {
  TOKEN_MODULES,
  MARKET_MODULES,
  fetchDexScreener,
  fetchSecurity,
  fetchHolders,
  fetchPumpFun,
  fetchSmartMoney,
  fetchMarketSnapshot,
  fetchDerivatives,
  fetchSentiment,
  fetchNews,
  type TokenModuleName,
  type MarketModuleName,
} from './modules';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { decideEvidenceEligibility } from './eligibility';
import { buildEvidencePack, formatEvidencePackForAI } from './builder';
import { EligibilityInput, EvidencePack, DetectedTokenEntity } from './types';
import { logger } from '../../utils/logger';

/**
 * All-in-one function: Check eligibility and build pack if eligible.
 * Returns null if not eligible, pack if eligible, or throws on NEEDS_CONFIRMATION.
 */
export async function getEvidencePackIfEligible(
  userMessage: string,
  detectedIntent: string,
  tokenEntities: DetectedTokenEntity[],
  conversationState: EligibilityInput['conversationState'],
  language = 'en'
): Promise<{
  pack: EvidencePack | null;
  eligibility: ReturnType<typeof decideEvidenceEligibility>;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}> {
  const eligibility = decideEvidenceEligibility({
    userMessage,
    detectedIntent,
    tokenEntities,
    conversationState,
  });

  // Not eligible → no pack needed
  if (!eligibility.eligible) {
    return {
      pack: null,
      eligibility,
      needsClarification: false,
      clarificationQuestion: null,
    };
  }

  // Needs confirmation → don't build full pack, return clarification
  if (eligibility.resolutionStatus === 'NEEDS_CONFIRMATION') {
    return {
      pack: null,
      eligibility,
      needsClarification: true,
      clarificationQuestion: eligibility.tokenCandidates && eligibility.tokenCandidates.length > 0
        ? `I found multiple tokens. Which one do you mean?\n${eligibility.tokenCandidates.slice(0, 3).map((c, i) => `${i + 1}. ${c.symbol} on ${c.chain}`).join('\n')}`
        : 'I need the contract address to look that up. Can you share it?',
    };
  }

  // Eligible → build pack
  try {
    const pack = await buildEvidencePack({
      userMessage,
      language,
      intent: detectedIntent,
      tokenEntities,
      budgetTier: eligibility.budgetTier,
      kind: eligibility.kind as any,
    });

    // Check if resolution in pack needs confirmation
    if (pack.kind === 'TOKEN' || pack.kind === 'BOTH') {
      const tokenPack = pack.kind === 'BOTH' ? pack.token : pack;
      if (tokenPack.resolution.status === 'NEEDS_CONFIRMATION') {
        return {
          pack: null,
          eligibility,
          needsClarification: true,
          clarificationQuestion: tokenPack.resolution.clarification_question,
        };
      }
    }

    return {
      pack,
      eligibility,
      needsClarification: false,
      clarificationQuestion: null,
    };

  } catch (error: any) {
    logger.error('Evidence Pack build failed', { error: error.message });
    
    // Return eligibility info but no pack
    return {
      pack: null,
      eligibility,
      needsClarification: false,
      clarificationQuestion: null,
    };
  }
}

/**
 * Build clarification response for NEEDS_CONFIRMATION status
 */
export function buildClarificationResponse(
  question: string,
  language: string,
  candidates?: Array<{ symbol: string; chain: string; liquidity: number }>
): string {
  const templates: Record<string, { header: string; footer: string }> = {
    en: {
      header: '',
      footer: '\n\n(Share the contract address if you have it)',
    },
    de: {
      header: '',
      footer: '\n\n(Teile die Contract-Adresse, falls du sie hast)',
    },
    es: {
      header: '',
      footer: '\n\n(Comparte la dirección del contrato si la tienes)',
    },
  };

  const t = templates[language] || templates.en;
  
  let response = t.header + question;
  
  if (candidates && candidates.length > 0) {
    // Already formatted in question
  }
  
  response += t.footer;
  
  return response;
}
