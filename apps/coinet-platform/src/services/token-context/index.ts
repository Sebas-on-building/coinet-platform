/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 TOKEN CONTEXT SERVICE - Entity-Driven Enrichment                       ║
 * ║                                                                               ║
 * ║   Main entry point for the token-context system.                              ║
 * ║   Decouples token enrichment from intent classification.                      ║
 * ║                                                                               ║
 * ║   ARCHITECTURE:                                                               ║
 * ║   1. Entity Detection → Detect token mentions (address, ticker, URL)          ║
 * ║   2. Resolution → Resolve ticker to address/chain                             ║
 * ║   3. Enrichment → Fetch data from modules based on budget                     ║
 * ║   4. Injection → Build standardized context with FACT_GATE                    ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, anti-hallucination design               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// Export types
export * from './types';

// Export resolver functions
export {
  detectTokenEntities,
  resolveToken,
  generateClarificationQuestion,
  // Confidence scoring
  CONFIDENCE_THRESHOLDS,
  calculateConfidenceResult,
  type ConfidenceResult,
  type SupportedLanguage,
} from './resolver';

// Export session memory (COINET_TOKEN_RESOLUTION_POLICY Section 7)
export {
  getResolvedToken,
  storeResolvedToken,
  extendTokenTTL,
  invalidateToken,
  shouldReuseCachedResolution,
  getSessionTokens,
  clearSession,
  normalizeTokenRefSignature,
  RESOLUTION_TTL,
  type ResolvedTokenRecord,
} from './session-memory';

// Export cache
export { tokenContextCache, MODULE_TTL } from './cache';

// Export orchestrator
export {
  buildTokenContext,
  determineBudgetTier,
} from './orchestrator';

// Export modules
export { fetchDexScreenerData, formatDexScreenerForDisplay } from './modules/dexscreener';
export { fetchSecurityData, formatSecurityForDisplay } from './modules/security';

// ============================================================================
// CONVENIENCE FUNCTION FOR CHAT SERVICE INTEGRATION
// ============================================================================

import { buildTokenContext } from './orchestrator';
import { detectTokenEntities, generateClarificationQuestion, CONFIDENCE_THRESHOLDS } from './resolver';
import { 
  getResolvedToken, 
  storeResolvedToken, 
  shouldReuseCachedResolution,
  extendTokenTTL,
  normalizeTokenRefSignature,
} from './session-memory';
import { TokenContext, BudgetTier, ResolvedToken, ChainId } from './types';
import { logger } from '../../utils/logger';

export interface EnrichmentOptions {
  budgetOverride?: BudgetTier;
  conversationId?: string;
  userLanguage?: 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'other';
}

export interface EnrichmentResult {
  hasTokenContext: boolean;
  tokenContext: TokenContext | null;
  shouldInject: boolean;
  injectionText: string | null;
  
  // Confidence-gated resolution info
  resolution: {
    resolved: boolean;
    fromCache: boolean;
    confidenceLevel?: 'high' | 'medium' | 'low';
    shouldAutoResolve: boolean;
    clarificationQuestion?: string;
    tokenRef?: string;
    chain?: ChainId;
    address?: string;
  };
}

/**
 * Process a user message and return token context if applicable
 * This is the main function to call from the chat service
 * 
 * Implements COINET_TOKEN_RESOLUTION_POLICY:
 * - Confidence-gated resolution
 * - Session memory for preventing re-asking
 * - Human-style clarification questions
 */
export async function enrichMessageWithTokenContext(
  message: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  const { budgetOverride, conversationId, userLanguage = 'en' } = options;
  
  // Step A: Detect token entities
  const detection = detectTokenEntities(message);
  
  if (!detection.hasTokenEntity || !detection.primaryEntity) {
    return {
      hasTokenContext: false,
      tokenContext: null,
      shouldInject: false,
      injectionText: null,
      resolution: {
        resolved: false,
        fromCache: false,
        shouldAutoResolve: false,
      },
    };
  }
  
  const primaryRef = detection.primaryEntity.ref;
  const tokenRefSig = normalizeTokenRefSignature(primaryRef.raw);
  
  // Step E: Check session memory for cached resolution
  if (conversationId) {
    const cached = getResolvedToken(conversationId, tokenRefSig);
    
    if (cached) {
      const reuseCheck = shouldReuseCachedResolution(cached, {
        chain: primaryRef.chain,
        raw: primaryRef.raw,
      });
      
      if (reuseCheck.reuse) {
        // Extend TTL since user is still discussing this token
        extendTokenTTL(conversationId, tokenRefSig);
        
        logger.info('🧠 Reusing cached token resolution', {
          signature: tokenRefSig,
          chain: cached.chain,
          address: cached.address.slice(0, 10),
        });
        
        // Build context with cached resolution
        const tokenContext = await buildTokenContext(message, budgetOverride, {
          preResolved: {
            address: cached.address,
            chain: cached.chain,
            symbol: cached.symbol,
            name: cached.name,
            resolvedFrom: 'ticker',
            resolvedAt: new Date(cached.resolvedAt).toISOString(),
            resolutionConfidence: cached.confidence,
            isAmbiguous: false,
            confidenceLevel: cached.confidenceLevel,
            shouldAutoResolve: true,
          },
        });
        
        return {
          hasTokenContext: true,
          tokenContext,
          shouldInject: true,
          injectionText: tokenContext?.rawContext || null,
          resolution: {
            resolved: true,
            fromCache: true,
            confidenceLevel: cached.confidenceLevel,
            shouldAutoResolve: true,
            tokenRef: tokenRefSig,
            chain: cached.chain,
            address: cached.address,
          },
        };
      } else {
        logger.debug('🧠 Not reusing cached resolution', { reason: reuseCheck.reason });
      }
    }
  }
  
  // Build fresh context (includes resolution)
  const tokenContext = await buildTokenContext(message, budgetOverride);
  
  if (!tokenContext) {
    return {
      hasTokenContext: false,
      tokenContext: null,
      shouldInject: false,
      injectionText: null,
      resolution: {
        resolved: false,
        fromCache: false,
        shouldAutoResolve: false,
      },
    };
  }
  
  const resolved = tokenContext.resolved;
  
  // Confidence gate check
  const confidenceLevel = resolved?.confidenceLevel || 'low';
  const shouldAutoResolve = resolved?.shouldAutoResolve ?? false;
  
  // Store successful resolutions in session memory
  if (conversationId && resolved && shouldAutoResolve) {
    storeResolvedToken(conversationId, tokenRefSig, resolved, 
      primaryRef.type === 'contract_address' ? 'address_direct' : 'auto');
  }
  
  // Generate clarification question if needed
  let clarificationQuestion: string | undefined;
  if (!shouldAutoResolve) {
    clarificationQuestion = generateClarificationQuestion(resolved, primaryRef, userLanguage);
  }
  
  // If we need clarification, inject the "DO NOT GUESS" guarantee
  if (tokenContext.needsClarification || !shouldAutoResolve) {
    const doNotGuessInjection = `
═══════════════════════════════════════════════════════════════════════════════
🚫 TOKEN NOT RESOLVED (CONFIDENCE: ${confidenceLevel.toUpperCase()})
═══════════════════════════════════════════════════════════════════════════════
Token reference: ${primaryRef.raw}
Confidence level: ${confidenceLevel}
Reason: ${resolved?.clarificationReason || 'Resolution failed or ambiguous'}

⛔ YOU MUST NOT ANALYZE THIS TOKEN.
⛔ YOU MUST NOT GUESS METRICS, PRICES, OR TOKEN PROPERTIES.
⛔ YOU MUST ASK ONE CLARIFYING QUESTION.

Suggested clarification: "${clarificationQuestion || 'Can you provide the contract address?'}"
═══════════════════════════════════════════════════════════════════════════════
`;
    
    return {
      hasTokenContext: true,
      tokenContext: {
        ...tokenContext,
        rawContext: doNotGuessInjection,
      },
      shouldInject: true,
      injectionText: doNotGuessInjection,
      resolution: {
        resolved: false,
        fromCache: false,
        confidenceLevel,
        shouldAutoResolve: false,
        clarificationQuestion,
        tokenRef: tokenRefSig,
      },
    };
  }
  
  // We have high-confidence resolved data - inject it
  return {
    hasTokenContext: true,
    tokenContext,
    shouldInject: true,
    injectionText: tokenContext.rawContext,
    resolution: {
      resolved: true,
      fromCache: false,
      confidenceLevel,
      shouldAutoResolve: true,
      tokenRef: tokenRefSig,
      chain: resolved?.chain,
      address: resolved?.address,
    },
  };
}

/**
 * Quick check if a message likely contains a token reference
 * (Faster than full detection, for early filtering)
 */
export function messageContainsTokenRef(message: string): boolean {
  // Quick patterns that suggest token reference
  const quickPatterns = [
    /0x[a-fA-F0-9]{40}/,                    // EVM address
    /[1-9A-HJ-NP-Za-km-z]{32,44}/,          // Solana address
    /\$[A-Za-z][A-Za-z0-9]{1,10}\b/,        // Cashtag
    /dexscreener\.com/i,                     // DexScreener URL
    /pump\.fun/i,                            // pump.fun URL
  ];
  
  return quickPatterns.some(p => p.test(message));
}
