/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧠 CONVERSATION ENTITY STATE                                             ║
 * ║                                                                               ║
 * ║   More than just last_resolved_token — full entity tracking for trust.       ║
 * ║                                                                               ║
 * ║   TRACKS:                                                                     ║
 * ║   - Last resolved token (chain/address/symbol/confidence)                    ║
 * ║   - Resolution candidates (top 3 + scores)                                   ║
 * ║   - Last user intent (for "again" / "more" context)                          ║
 * ║   - Clarification state (pending / resolved)                                 ║
 * ║   - Evidence freshness per module                                            ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production hardening                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolvedTokenState {
  chain: string;
  address: string | null;
  symbol: string;
  confidence: number;
  resolvedAt: number;
  source: 'user_explicit' | 'auto_resolved' | 'user_confirmed' | 'ticker_search';
  userConfirmed: boolean;
}

export interface ResolutionCandidate {
  chain: string;
  address: string;
  symbol: string;
  name: string;
  score: number;
  liquidity: number;
  volume24h: number;
}

export interface PendingClarification {
  type: 'CHAIN_AMBIGUITY' | 'TICKER_AMBIGUITY' | 'ADDRESS_NEEDED' | 'CONFIRMATION_NEEDED';
  candidates: ResolutionCandidate[];
  askedAt: number;
  question: string;
  attempts: number;
}

export interface LastIntent {
  type: string;
  timestamp: number;
  tokenRef: string | null;
  wasSuccessful: boolean;
}

export interface EvidenceFreshness {
  module: string;
  fetchedAt: number;
  ageSeconds: number;
  isStale: boolean;
}

export interface ConversationEntityState {
  conversationId: string;
  lastResolvedToken: ResolvedTokenState | null;
  resolutionCandidates: ResolutionCandidate[];
  pendingClarification: PendingClarification | null;
  lastIntent: LastIntent | null;
  evidenceFreshness: EvidenceFreshness[];
  turnCount: number;
  lastActivityAt: number;
  clarificationHistory: Array<{
    question: string;
    answer: string | null;
    timestamp: number;
  }>;
}

// ============================================================================
// STORAGE (IN-MEMORY, REPLACE WITH REDIS IN PRODUCTION)
// ============================================================================

const stateStore = new Map<string, ConversationEntityState>();

// TTLs
const STATE_TTL_MS = 30 * 60 * 1000;       // 30 minutes
const STALE_EVIDENCE_THRESHOLD = 5 * 60;   // 5 minutes
const HIGH_CONFIDENCE_REUSE_TTL = 10 * 60; // 10 minutes

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Get or create conversation state
 */
export function getConversationState(conversationId: string): ConversationEntityState {
  let state = stateStore.get(conversationId);
  
  if (!state) {
    state = {
      conversationId,
      lastResolvedToken: null,
      resolutionCandidates: [],
      pendingClarification: null,
      lastIntent: null,
      evidenceFreshness: [],
      turnCount: 0,
      lastActivityAt: Date.now(),
      clarificationHistory: [],
    };
    stateStore.set(conversationId, state);
  }
  
  // Check TTL
  if (Date.now() - state.lastActivityAt > STATE_TTL_MS) {
    // Reset stale state
    state.lastResolvedToken = null;
    state.resolutionCandidates = [];
    state.pendingClarification = null;
    state.evidenceFreshness = [];
  }
  
  return state;
}

/**
 * Update state after a turn
 */
export function updateConversationState(
  conversationId: string,
  update: Partial<ConversationEntityState>
): ConversationEntityState {
  const state = getConversationState(conversationId);
  
  Object.assign(state, update, {
    lastActivityAt: Date.now(),
    turnCount: state.turnCount + 1,
  });
  
  stateStore.set(conversationId, state);
  
  return state;
}

// ============================================================================
// TOKEN RESOLUTION LOGIC
// ============================================================================

/**
 * Check if we should reuse the last resolved token
 */
export function shouldReuseLastToken(
  state: ConversationEntityState,
  currentMention: string
): { reuse: boolean; reason: string } {
  const { lastResolvedToken } = state;
  
  if (!lastResolvedToken) {
    return { reuse: false, reason: 'No previous token' };
  }
  
  // Check TTL
  const ageSeconds = (Date.now() - lastResolvedToken.resolvedAt) / 1000;
  if (ageSeconds > HIGH_CONFIDENCE_REUSE_TTL) {
    return { reuse: false, reason: `Token resolution expired (${Math.round(ageSeconds)}s old)` };
  }
  
  // Check if current mention matches
  const normalizedMention = currentMention.replace(/^\$/, '').toLowerCase();
  const normalizedSymbol = lastResolvedToken.symbol.toLowerCase();
  
  if (normalizedMention === normalizedSymbol) {
    // Same symbol mentioned
    if (lastResolvedToken.confidence >= 0.85 || lastResolvedToken.userConfirmed) {
      return { reuse: true, reason: 'High confidence match' };
    }
  }
  
  // Check for implicit reference ("it", "this token", "again")
  const implicitPatterns = /^(it|this|that|the token|this one|same|again)$/i;
  if (implicitPatterns.test(currentMention.trim())) {
    if (lastResolvedToken.confidence >= 0.7 || lastResolvedToken.userConfirmed) {
      return { reuse: true, reason: 'Implicit reference to previous token' };
    }
  }
  
  return { reuse: false, reason: 'Different token or low confidence' };
}

/**
 * Store a new token resolution
 */
export function storeTokenResolution(
  conversationId: string,
  token: Omit<ResolvedTokenState, 'resolvedAt'>,
  candidates?: ResolutionCandidate[]
): void {
  const state = getConversationState(conversationId);
  
  state.lastResolvedToken = {
    ...token,
    resolvedAt: Date.now(),
  };
  
  if (candidates) {
    state.resolutionCandidates = candidates.slice(0, 5); // Keep top 5
  }
  
  // Clear pending clarification if we got a resolution
  if (token.confidence >= 0.85 || token.userConfirmed) {
    state.pendingClarification = null;
  }
  
  stateStore.set(conversationId, state);
  
  logger.info('🧠 Token resolution stored', {
    conversationId,
    symbol: token.symbol,
    chain: token.chain,
    confidence: token.confidence,
    source: token.source,
  });
}

/**
 * User confirmed a token (upgrades confidence)
 */
export function confirmTokenResolution(
  conversationId: string,
  confirmedAddress?: string
): void {
  const state = getConversationState(conversationId);
  
  if (state.lastResolvedToken) {
    state.lastResolvedToken.userConfirmed = true;
    state.lastResolvedToken.confidence = 1.0;
    state.lastResolvedToken.source = 'user_confirmed';
    
    if (confirmedAddress) {
      state.lastResolvedToken.address = confirmedAddress;
    }
  }
  
  state.pendingClarification = null;
  
  stateStore.set(conversationId, state);
}

// ============================================================================
// CLARIFICATION LOGIC
// ============================================================================

/**
 * Check if we have a pending clarification
 */
export function hasPendingClarification(conversationId: string): boolean {
  const state = getConversationState(conversationId);
  
  if (!state.pendingClarification) return false;
  
  // Check if clarification is stale (> 5 minutes)
  const ageMs = Date.now() - state.pendingClarification.askedAt;
  if (ageMs > 5 * 60 * 1000) {
    state.pendingClarification = null;
    return false;
  }
  
  return true;
}

/**
 * Set a pending clarification
 */
export function setPendingClarification(
  conversationId: string,
  clarification: Omit<PendingClarification, 'askedAt' | 'attempts'>
): void {
  const state = getConversationState(conversationId);
  
  // Track attempt count
  const previousAttempts = state.pendingClarification?.attempts || 0;
  
  state.pendingClarification = {
    ...clarification,
    askedAt: Date.now(),
    attempts: previousAttempts + 1,
  };
  
  // Add to history
  state.clarificationHistory.push({
    question: clarification.question,
    answer: null,
    timestamp: Date.now(),
  });
  
  // Keep history bounded
  if (state.clarificationHistory.length > 10) {
    state.clarificationHistory = state.clarificationHistory.slice(-10);
  }
  
  stateStore.set(conversationId, state);
}

/**
 * Check if we've asked too many times (avoid loop)
 */
export function shouldAskClarification(conversationId: string): boolean {
  const state = getConversationState(conversationId);
  
  // Don't ask more than 2 times in a row
  if (state.pendingClarification && state.pendingClarification.attempts >= 2) {
    return false;
  }
  
  // Don't ask if last clarification was just asked
  if (state.pendingClarification) {
    const ageMs = Date.now() - state.pendingClarification.askedAt;
    if (ageMs < 30000) { // Less than 30 seconds
      return false;
    }
  }
  
  return true;
}

/**
 * Parse user's response to clarification
 */
export function parseClarificationResponse(
  conversationId: string,
  userMessage: string
): { resolved: boolean; selectedCandidate: ResolutionCandidate | null } {
  const state = getConversationState(conversationId);
  
  if (!state.pendingClarification || state.resolutionCandidates.length === 0) {
    return { resolved: false, selectedCandidate: null };
  }
  
  const msg = userMessage.toLowerCase().trim();
  const candidates = state.resolutionCandidates;
  
  // Check for number selection ("1", "first", "the first one")
  const numberMatch = msg.match(/^(\d+)$|^(first|second|third|1st|2nd|3rd|one|two|three)$/i);
  if (numberMatch) {
    const numberMap: Record<string, number> = {
      '1': 0, 'first': 0, '1st': 0, 'one': 0,
      '2': 1, 'second': 1, '2nd': 1, 'two': 1,
      '3': 2, 'third': 2, '3rd': 2, 'three': 2,
    };
    
    const key = numberMatch[1] || numberMatch[2];
    const index = numberMap[key.toLowerCase()];
    
    if (index !== undefined && index < candidates.length) {
      const selected = candidates[index];
      confirmTokenResolution(conversationId, selected.address);
      
      // Update last resolved token
      storeTokenResolution(conversationId, {
        chain: selected.chain,
        address: selected.address,
        symbol: selected.symbol,
        confidence: 1.0,
        source: 'user_confirmed',
        userConfirmed: true,
      });
      
      // Record answer in history
      const lastClarification = state.clarificationHistory[state.clarificationHistory.length - 1];
      if (lastClarification) {
        lastClarification.answer = userMessage;
      }
      
      return { resolved: true, selectedCandidate: selected };
    }
  }
  
  // Check for chain mention
  const chainMentions: Record<string, string[]> = {
    'solana': ['solana', 'sol'],
    'ethereum': ['ethereum', 'eth', 'erc20'],
    'bsc': ['bsc', 'bnb', 'binance'],
    'base': ['base'],
    'arbitrum': ['arbitrum', 'arb'],
  };
  
  for (const [chain, aliases] of Object.entries(chainMentions)) {
    if (aliases.some(a => msg.includes(a))) {
      const chainCandidate = candidates.find(c => c.chain.toLowerCase() === chain);
      if (chainCandidate) {
        storeTokenResolution(conversationId, {
          chain: chainCandidate.chain,
          address: chainCandidate.address,
          symbol: chainCandidate.symbol,
          confidence: 1.0,
          source: 'user_confirmed',
          userConfirmed: true,
        });
        
        return { resolved: true, selectedCandidate: chainCandidate };
      }
    }
  }
  
  // Check for address paste
  const addressMatch = msg.match(/0x[a-fA-F0-9]{40}|[a-zA-Z0-9]{32,44}/);
  if (addressMatch) {
    const address = addressMatch[0];
    const matchingCandidate = candidates.find(c => 
      c.address.toLowerCase() === address.toLowerCase()
    );
    
    if (matchingCandidate) {
      storeTokenResolution(conversationId, {
        chain: matchingCandidate.chain,
        address: matchingCandidate.address,
        symbol: matchingCandidate.symbol,
        confidence: 1.0,
        source: 'user_explicit',
        userConfirmed: true,
      });
      
      return { resolved: true, selectedCandidate: matchingCandidate };
    }
  }
  
  return { resolved: false, selectedCandidate: null };
}

// ============================================================================
// INTENT TRACKING
// ============================================================================

/**
 * Store the last user intent
 */
export function storeLastIntent(
  conversationId: string,
  intent: Omit<LastIntent, 'timestamp'>
): void {
  const state = getConversationState(conversationId);
  
  state.lastIntent = {
    ...intent,
    timestamp: Date.now(),
  };
  
  stateStore.set(conversationId, state);
}

/**
 * Check if "again" or "more" refers to last intent
 */
export function shouldRepeatLastIntent(
  conversationId: string,
  userMessage: string
): { repeat: boolean; lastIntent: LastIntent | null } {
  const state = getConversationState(conversationId);
  
  if (!state.lastIntent) {
    return { repeat: false, lastIntent: null };
  }
  
  const repeatPatterns = /\b(again|more|same|repeat|another|refresh|update)\b/i;
  
  if (repeatPatterns.test(userMessage)) {
    // Check if last intent is recent
    const ageSeconds = (Date.now() - state.lastIntent.timestamp) / 1000;
    if (ageSeconds < 300) { // 5 minutes
      return { repeat: true, lastIntent: state.lastIntent };
    }
  }
  
  return { repeat: false, lastIntent: null };
}

// ============================================================================
// EVIDENCE FRESHNESS
// ============================================================================

/**
 * Update evidence freshness for a module
 */
export function updateEvidenceFreshness(
  conversationId: string,
  module: string,
  fetchedAt: number
): void {
  const state = getConversationState(conversationId);
  
  const existing = state.evidenceFreshness.find(e => e.module === module);
  const ageSeconds = (Date.now() - fetchedAt) / 1000;
  const isStale = ageSeconds > STALE_EVIDENCE_THRESHOLD;
  
  if (existing) {
    existing.fetchedAt = fetchedAt;
    existing.ageSeconds = ageSeconds;
    existing.isStale = isStale;
  } else {
    state.evidenceFreshness.push({
      module,
      fetchedAt,
      ageSeconds,
      isStale,
    });
  }
  
  stateStore.set(conversationId, state);
}

/**
 * Get stale modules that need refresh
 */
export function getStaleModules(conversationId: string): string[] {
  const state = getConversationState(conversationId);
  
  return state.evidenceFreshness
    .filter(e => e.isStale)
    .map(e => e.module);
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Cleanup expired states (run periodically)
 */
export function cleanupExpiredStates(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, state] of stateStore) {
    if (now - state.lastActivityAt > STATE_TTL_MS) {
      stateStore.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info('🧠 Cleaned expired conversation states', { count: cleaned });
  }
  
  return cleaned;
}

// Start cleanup interval
setInterval(cleanupExpiredStates, 5 * 60 * 1000); // Every 5 minutes

// ============================================================================
// EXPORTS
// ============================================================================

export {
  STATE_TTL_MS,
  STALE_EVIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_REUSE_TTL,
};
