/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔐 TOKEN CONFIRMATION LATCH                                              ║
 * ║                                                                               ║
 * ║   Stops wrong-token analysis forever.                                        ║
 * ║                                                                               ║
 * ║   RULES:                                                                      ║
 * ║   - If token came from ticker (not address) and confidence < VERY_HIGH:      ║
 * ║     - First time: MUST ask clarifier OR show best guess with confirmation    ║
 * ║     - userConfirmed=true ONLY if user explicitly confirms                    ║
 * ║   - Until confirmed: token identity is "tentative"                           ║
 * ║   - Tentative tokens get special handling in output                          ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Final hardening                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export type TokenSource = 
  | 'address_explicit'    // User pasted full address
  | 'ticker_search'       // Resolved from ticker like $PENGUIN
  | 'name_search'         // Resolved from name like "penguin"
  | 'url_extract'         // Extracted from dexscreener/pumpfun URL
  | 'context_reuse'       // Reused from conversation context
  | 'user_confirmed';     // Explicitly confirmed by user

export type LatchState = 
  | 'unlatched'           // Not resolved yet
  | 'tentative'           // Resolved but not confirmed
  | 'latched'             // Confirmed by user or high-confidence address
  | 'rejected';           // User said "no, wrong token"

export interface TokenLatch {
  symbol: string;
  chain: string;
  address: string | null;
  source: TokenSource;
  confidence: number;
  latchState: LatchState;
  resolvedAt: number;
  confirmedAt: number | null;
  candidates: TokenCandidate[];
  clarificationCount: number;
  lastClarificationAt: number | null;
}

export interface TokenCandidate {
  chain: string;
  address: string;
  symbol: string;
  name: string;
  confidence: number;
  liquidity: number;
  volume24h: number;
}

export interface LatchDecision {
  proceed: boolean;
  requiresClarification: boolean;
  clarificationQuestion: string | null;
  tentativeWarning: string | null;
  canAnalyze: boolean;
}

// ============================================================================
// CONFIDENCE THRESHOLDS
// ============================================================================

export const LATCH_THRESHOLDS = {
  // Address-based resolution: high confidence, auto-latch
  ADDRESS_AUTO_LATCH: 0.95,
  
  // Ticker search: need higher confidence to auto-latch
  TICKER_AUTO_LATCH: 0.90,
  
  // Below this: MUST ask clarification
  TICKER_REQUIRE_CLARIFICATION: 0.75,
  
  // Below this: don't even try to analyze
  MINIMUM_ANALYZABLE: 0.50,
  
  // URL extraction: usually high confidence
  URL_AUTO_LATCH: 0.92,
  
  // Context reuse: depends on original latch
  CONTEXT_REUSE_DECAY: 0.05, // Lose 5% confidence per reuse
};

// ============================================================================
// LATCH STORAGE
// ============================================================================

const latchStore = new Map<string, TokenLatch>();

const LATCH_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// LATCH LOGIC
// ============================================================================

/**
 * Get or create a token latch for a conversation
 */
export function getTokenLatch(conversationId: string): TokenLatch | null {
  const latch = latchStore.get(conversationId);
  
  if (!latch) return null;
  
  // Check TTL
  if (Date.now() - latch.resolvedAt > LATCH_TTL_MS) {
    latchStore.delete(conversationId);
    return null;
  }
  
  return latch;
}

/**
 * Determine latch state for a new resolution
 */
export function determineLatchState(
  source: TokenSource,
  confidence: number,
  hasMultipleCandidates: boolean
): LatchState {
  // Address-based: high confidence, auto-latch
  if (source === 'address_explicit') {
    return confidence >= LATCH_THRESHOLDS.ADDRESS_AUTO_LATCH ? 'latched' : 'tentative';
  }
  
  // URL-based: usually reliable
  if (source === 'url_extract') {
    return confidence >= LATCH_THRESHOLDS.URL_AUTO_LATCH ? 'latched' : 'tentative';
  }
  
  // User confirmed: always latched
  if (source === 'user_confirmed') {
    return 'latched';
  }
  
  // Ticker/name search: need high confidence AND no ambiguity
  if (source === 'ticker_search' || source === 'name_search') {
    if (confidence >= LATCH_THRESHOLDS.TICKER_AUTO_LATCH && !hasMultipleCandidates) {
      return 'latched';
    }
    return 'tentative';
  }
  
  // Context reuse: inherit state with decay
  if (source === 'context_reuse') {
    return confidence >= LATCH_THRESHOLDS.TICKER_AUTO_LATCH ? 'latched' : 'tentative';
  }
  
  return 'tentative';
}

/**
 * Create or update a token latch
 */
export function setTokenLatch(
  conversationId: string,
  token: {
    symbol: string;
    chain: string;
    address: string | null;
    source: TokenSource;
    confidence: number;
  },
  candidates: TokenCandidate[] = []
): TokenLatch {
  const existing = latchStore.get(conversationId);
  const hasMultipleCandidates = candidates.length > 1 && 
    candidates[1].confidence > candidates[0].confidence * 0.7;
  
  const latchState = determineLatchState(token.source, token.confidence, hasMultipleCandidates);
  
  const latch: TokenLatch = {
    symbol: token.symbol,
    chain: token.chain,
    address: token.address,
    source: token.source,
    confidence: token.confidence,
    latchState,
    resolvedAt: Date.now(),
    confirmedAt: latchState === 'latched' ? Date.now() : null,
    candidates: candidates.slice(0, 5),
    clarificationCount: existing?.clarificationCount || 0,
    lastClarificationAt: existing?.lastClarificationAt || null,
  };
  
  latchStore.set(conversationId, latch);
  
  logger.info('🔐 Token latch set', {
    conversationId,
    symbol: token.symbol,
    chain: token.chain,
    source: token.source,
    confidence: token.confidence,
    latchState,
    candidateCount: candidates.length,
  });
  
  return latch;
}

/**
 * Confirm a token (upgrade to latched)
 */
export function confirmTokenLatch(
  conversationId: string,
  confirmedAddress?: string
): TokenLatch | null {
  const latch = latchStore.get(conversationId);
  if (!latch) return null;
  
  latch.latchState = 'latched';
  latch.source = 'user_confirmed';
  latch.confidence = 1.0;
  latch.confirmedAt = Date.now();
  
  if (confirmedAddress) {
    latch.address = confirmedAddress;
    
    // Find matching candidate to get chain
    const matching = latch.candidates.find(c => 
      c.address.toLowerCase() === confirmedAddress.toLowerCase()
    );
    if (matching) {
      latch.chain = matching.chain;
      latch.symbol = matching.symbol;
    }
  }
  
  latchStore.set(conversationId, latch);
  
  logger.info('🔐 Token latch confirmed', {
    conversationId,
    symbol: latch.symbol,
    address: latch.address,
  });
  
  return latch;
}

/**
 * Reject a token (mark as wrong)
 */
export function rejectTokenLatch(conversationId: string): void {
  const latch = latchStore.get(conversationId);
  if (latch) {
    latch.latchState = 'rejected';
    latchStore.set(conversationId, latch);
  }
}

/**
 * Record that we asked a clarification
 */
export function recordClarificationAsked(conversationId: string): void {
  const latch = latchStore.get(conversationId);
  if (latch) {
    latch.clarificationCount++;
    latch.lastClarificationAt = Date.now();
    latchStore.set(conversationId, latch);
  }
}

// ============================================================================
// DECISION LOGIC
// ============================================================================

/**
 * Decide what to do with current latch state
 */
export function decideLatchAction(
  conversationId: string,
  currentMention: string,
  language: string = 'en'
): LatchDecision {
  const latch = getTokenLatch(conversationId);
  
  // No latch yet
  if (!latch) {
    return {
      proceed: false,
      requiresClarification: false,
      clarificationQuestion: null,
      tentativeWarning: null,
      canAnalyze: false,
    };
  }
  
  // Already latched: proceed
  if (latch.latchState === 'latched') {
    return {
      proceed: true,
      requiresClarification: false,
      clarificationQuestion: null,
      tentativeWarning: null,
      canAnalyze: true,
    };
  }
  
  // Rejected: need new resolution
  if (latch.latchState === 'rejected') {
    return {
      proceed: false,
      requiresClarification: true,
      clarificationQuestion: generateClarificationQuestion(latch, language, 'rejected'),
      tentativeWarning: null,
      canAnalyze: false,
    };
  }
  
  // Tentative: decide based on confidence and clarification history
  if (latch.latchState === 'tentative') {
    // Too low confidence: must clarify
    if (latch.confidence < LATCH_THRESHOLDS.TICKER_REQUIRE_CLARIFICATION) {
      // But don't ask too many times
      if (latch.clarificationCount >= 2) {
        return {
          proceed: true,
          requiresClarification: false,
          clarificationQuestion: null,
          tentativeWarning: generateTentativeWarning(latch, language),
          canAnalyze: true,
        };
      }
      
      return {
        proceed: false,
        requiresClarification: true,
        clarificationQuestion: generateClarificationQuestion(latch, language, 'ambiguous'),
        tentativeWarning: null,
        canAnalyze: false,
      };
    }
    
    // Medium confidence: analyze but warn
    if (latch.confidence < LATCH_THRESHOLDS.TICKER_AUTO_LATCH) {
      return {
        proceed: true,
        requiresClarification: false,
        clarificationQuestion: null,
        tentativeWarning: generateTentativeWarning(latch, language),
        canAnalyze: true,
      };
    }
    
    // High confidence tentative: proceed without warning
    return {
      proceed: true,
      requiresClarification: false,
      clarificationQuestion: null,
      tentativeWarning: null,
      canAnalyze: true,
    };
  }
  
  return {
    proceed: false,
    requiresClarification: false,
    clarificationQuestion: null,
    tentativeWarning: null,
    canAnalyze: false,
  };
}

// ============================================================================
// CLARIFICATION QUESTIONS
// ============================================================================

type ClarificationType = 'ambiguous' | 'rejected' | 'chain_unknown';

function generateClarificationQuestion(
  latch: TokenLatch,
  language: string,
  type: ClarificationType
): string {
  const templates: Record<string, Record<ClarificationType, string>> = {
    en: {
      ambiguous: latch.candidates.length > 1
        ? `I found multiple ${latch.symbol} tokens. Which one?\n${formatCandidates(latch.candidates, language)}`
        : `Which chain is ${latch.symbol} on? Or paste the contract address.`,
      rejected: `Got it, that wasn't the right ${latch.symbol}. Which one did you mean? Or paste the address.`,
      chain_unknown: `${latch.symbol} exists on multiple chains. Which one?`,
    },
    de: {
      ambiguous: latch.candidates.length > 1
        ? `Ich habe mehrere ${latch.symbol} Tokens gefunden. Welches?\n${formatCandidates(latch.candidates, language)}`
        : `Auf welcher Chain ist ${latch.symbol}? Oder paste die Contract-Adresse.`,
      rejected: `Verstanden, das war nicht das richtige ${latch.symbol}. Welches meintest du?`,
      chain_unknown: `${latch.symbol} gibt es auf mehreren Chains. Welche?`,
    },
    es: {
      ambiguous: latch.candidates.length > 1
        ? `Encontré múltiples tokens ${latch.symbol}. ¿Cuál?\n${formatCandidates(latch.candidates, language)}`
        : `¿En qué cadena está ${latch.symbol}? O pega la dirección del contrato.`,
      rejected: `Entendido, ese no era el ${latch.symbol} correcto. ¿Cuál querías decir?`,
      chain_unknown: `${latch.symbol} existe en múltiples cadenas. ¿Cuál?`,
    },
  };
  
  const langTemplates = templates[language] || templates.en;
  return langTemplates[type];
}

function formatCandidates(candidates: TokenCandidate[], language: string): string {
  const topCandidates = candidates.slice(0, 3);
  
  return topCandidates.map((c, i) => {
    const liq = c.liquidity > 1000000 
      ? `$${(c.liquidity / 1000000).toFixed(1)}M` 
      : `$${(c.liquidity / 1000).toFixed(0)}K`;
    
    return `${i + 1}) ${c.symbol} on ${c.chain} (${liq} liq)`;
  }).join('\n');
}

function generateTentativeWarning(latch: TokenLatch, language: string): string {
  const templates: Record<string, string> = {
    en: `Assuming you mean ${latch.symbol} on ${latch.chain}. Let me know if that's wrong.`,
    de: `Ich gehe von ${latch.symbol} auf ${latch.chain} aus. Sag Bescheid wenn das falsch ist.`,
    es: `Asumo que te refieres a ${latch.symbol} en ${latch.chain}. Avísame si es incorrecto.`,
  };
  
  return templates[language] || templates.en;
}

// ============================================================================
// USER RESPONSE PARSING
// ============================================================================

/**
 * Check if user's message is confirming/rejecting the tentative token
 */
export function parseUserConfirmation(
  userMessage: string,
  latch: TokenLatch
): { isConfirmation: boolean; isRejection: boolean; selectedCandidate: TokenCandidate | null } {
  const msg = userMessage.toLowerCase().trim();
  
  // Rejection patterns
  const rejectionPatterns = [
    /^no$/,
    /^nope$/,
    /^nein$/,
    /^wrong/,
    /not that one/,
    /different one/,
    /the other/,
    /falsch/,
    /incorrecto/,
  ];
  
  for (const pattern of rejectionPatterns) {
    if (pattern.test(msg)) {
      return { isConfirmation: false, isRejection: true, selectedCandidate: null };
    }
  }
  
  // Confirmation patterns
  const confirmationPatterns = [
    /^yes$/,
    /^yep$/,
    /^yeah$/,
    /^ja$/,
    /^si$/,
    /^correct$/,
    /^that('s| is)? (it|right|correct)/,
    /^genau$/,
    /^exacto$/,
  ];
  
  for (const pattern of confirmationPatterns) {
    if (pattern.test(msg)) {
      return { isConfirmation: true, isRejection: false, selectedCandidate: null };
    }
  }
  
  // Number selection
  const numberMatch = msg.match(/^(\d+)$/);
  if (numberMatch) {
    const index = parseInt(numberMatch[1]) - 1;
    if (index >= 0 && index < latch.candidates.length) {
      return { 
        isConfirmation: true, 
        isRejection: false, 
        selectedCandidate: latch.candidates[index] 
      };
    }
  }
  
  // Chain mention
  const chainPatterns: Record<string, string[]> = {
    solana: ['solana', 'sol'],
    ethereum: ['ethereum', 'eth', 'erc20'],
    bsc: ['bsc', 'bnb', 'binance'],
    base: ['base'],
    arbitrum: ['arbitrum', 'arb'],
  };
  
  for (const [chain, patterns] of Object.entries(chainPatterns)) {
    if (patterns.some(p => msg.includes(p))) {
      const candidate = latch.candidates.find(c => c.chain.toLowerCase() === chain);
      if (candidate) {
        return { isConfirmation: true, isRejection: false, selectedCandidate: candidate };
      }
    }
  }
  
  // Address paste
  const addressMatch = msg.match(/0x[a-fA-F0-9]{40}|[a-zA-Z0-9]{32,44}/);
  if (addressMatch) {
    const address = addressMatch[0];
    const candidate = latch.candidates.find(c => 
      c.address.toLowerCase() === address.toLowerCase()
    );
    if (candidate) {
      return { isConfirmation: true, isRejection: false, selectedCandidate: candidate };
    }
  }
  
  return { isConfirmation: false, isRejection: false, selectedCandidate: null };
}

// ============================================================================
// CLEANUP
// ============================================================================

export function cleanupExpiredLatches(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, latch] of latchStore) {
    if (now - latch.resolvedAt > LATCH_TTL_MS) {
      latchStore.delete(id);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Cleanup interval
setInterval(cleanupExpiredLatches, 5 * 60 * 1000);

// ============================================================================
// EXPORTS
// ============================================================================

export {
  LATCH_THRESHOLDS,
  LATCH_TTL_MS,
};
