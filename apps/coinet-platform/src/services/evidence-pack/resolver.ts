/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 TOKEN RESOLVER — Confidence-Gated Resolution                           ║
 * ║                                                                               ║
 * ║   Resolves token entities with strict confidence thresholds.                  ║
 * ║   Generates clarifiers when ambiguous, max 2 attempts.                        ║
 * ║                                                                               ║
 * ║   ACCEPTANCE RULE:                                                            ║
 * ║   Accept ONLY IF: confidence ≥ 0.85 AND margin ≥ 0.15                        ║
 * ║   Otherwise: generate ONE clarifier                                           ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import {
  TokenCandidate,
  ResolvedToken,
  TokenClarifier,
  TokenResolution,
  ResolutionMethod,
  ClarifierType,
  RESOLUTION_THRESHOLDS,
  TokenResolutionEvent,
} from './types';

// ============================================================================
// KNOWN ASSETS (High-confidence majors)
// ============================================================================

const KNOWN_ASSETS: Record<string, TokenCandidate> = {
  'BTC': { symbol: 'BTC', name: 'Bitcoin', chain: 'bitcoin', address: null, confidence: 1.0 },
  'BITCOIN': { symbol: 'BTC', name: 'Bitcoin', chain: 'bitcoin', address: null, confidence: 1.0 },
  'ETH': { symbol: 'ETH', name: 'Ethereum', chain: 'ethereum', address: null, confidence: 1.0 },
  'ETHEREUM': { symbol: 'ETH', name: 'Ethereum', chain: 'ethereum', address: null, confidence: 1.0 },
  'SOL': { symbol: 'SOL', name: 'Solana', chain: 'solana', address: null, confidence: 1.0 },
  'SOLANA': { symbol: 'SOL', name: 'Solana', chain: 'solana', address: null, confidence: 1.0 },
  'BNB': { symbol: 'BNB', name: 'BNB', chain: 'bsc', address: null, confidence: 1.0 },
  'XRP': { symbol: 'XRP', name: 'Ripple', chain: 'ripple', address: null, confidence: 1.0 },
  'ADA': { symbol: 'ADA', name: 'Cardano', chain: 'cardano', address: null, confidence: 1.0 },
  'DOGE': { symbol: 'DOGE', name: 'Dogecoin', chain: 'dogecoin', address: null, confidence: 1.0 },
  'AVAX': { symbol: 'AVAX', name: 'Avalanche', chain: 'avalanche', address: null, confidence: 1.0 },
  'DOT': { symbol: 'DOT', name: 'Polkadot', chain: 'polkadot', address: null, confidence: 1.0 },
  'MATIC': { symbol: 'MATIC', name: 'Polygon', chain: 'polygon', address: null, confidence: 1.0 },
  'POL': { symbol: 'POL', name: 'Polygon', chain: 'polygon', address: null, confidence: 1.0 },
  'LINK': { symbol: 'LINK', name: 'Chainlink', chain: 'ethereum', address: '0x514910771af9ca656af840dff83e8264ecf986ca', confidence: 0.98 },
  'UNI': { symbol: 'UNI', name: 'Uniswap', chain: 'ethereum', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', confidence: 0.98 },
  'AAVE': { symbol: 'AAVE', name: 'Aave', chain: 'ethereum', address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', confidence: 0.98 },
  'USDT': { symbol: 'USDT', name: 'Tether', chain: 'ethereum', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', confidence: 0.95 },
  'USDC': { symbol: 'USDC', name: 'USD Coin', chain: 'ethereum', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', confidence: 0.95 },
};

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const PATTERNS = {
  // $TICKER format
  TICKER: /\$([A-Za-z][A-Za-z0-9]{1,10})/g,
  
  // EVM address (0x...)
  EVM_ADDRESS: /\b(0x[a-fA-F0-9]{40})\b/g,
  
  // Solana address (base58, 32-44 chars, no 0/O/I/l)
  SOLANA_ADDRESS: /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g,
  
  // DEXScreener URL
  DEXSCREENER_URL: /dexscreener\.com\/([a-z]+)\/([a-zA-Z0-9]+)/i,
  
  // Pump.fun URL
  PUMPFUN_URL: /pump\.fun\/(?:coin\/)?([a-zA-Z0-9]+)/i,
  
  // Birdeye URL
  BIRDEYE_URL: /birdeye\.so\/token\/([a-zA-Z0-9]+)/i,
  
  // Chain hints
  CHAIN_HINT: /\b(on\s+)?(solana|ethereum|eth|bsc|binance|polygon|matic|avalanche|avax|arbitrum|arb|base|optimism|op)\b/i,
};

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

export interface ExtractedEntities {
  tickers: string[];
  addresses: { value: string; chain: string }[];
  urls: { url: string; type: string; chain?: string; address?: string }[];
  chainHints: string[];
}

/**
 * Extract all potential token entities from user message
 */
export function extractEntities(message: string): ExtractedEntities {
  const entities: ExtractedEntities = {
    tickers: [],
    addresses: [],
    urls: [],
    chainHints: [],
  };

  // Extract $TICKER
  const tickerMatches = message.matchAll(PATTERNS.TICKER);
  for (const match of tickerMatches) {
    const ticker = match[1].toUpperCase();
    if (!entities.tickers.includes(ticker)) {
      entities.tickers.push(ticker);
    }
  }

  // Extract EVM addresses
  const evmMatches = message.matchAll(PATTERNS.EVM_ADDRESS);
  for (const match of evmMatches) {
    entities.addresses.push({ value: match[1].toLowerCase(), chain: 'ethereum' });
  }

  // Extract Solana addresses (more strict validation)
  const solMatches = message.matchAll(PATTERNS.SOLANA_ADDRESS);
  for (const match of solMatches) {
    const addr = match[1];
    // Additional validation: Solana addresses don't start with 0x
    if (!addr.startsWith('0x') && addr.length >= 32 && addr.length <= 44) {
      // Check it's not just a random word
      if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)) {
        entities.addresses.push({ value: addr, chain: 'solana' });
      }
    }
  }

  // Extract DEXScreener URLs
  const dexMatch = message.match(PATTERNS.DEXSCREENER_URL);
  if (dexMatch) {
    entities.urls.push({
      url: dexMatch[0],
      type: 'dexscreener',
      chain: dexMatch[1],
      address: dexMatch[2],
    });
  }

  // Extract Pump.fun URLs
  const pumpMatch = message.match(PATTERNS.PUMPFUN_URL);
  if (pumpMatch) {
    entities.urls.push({
      url: pumpMatch[0],
      type: 'pumpfun',
      chain: 'solana',
      address: pumpMatch[1],
    });
  }

  // Extract Birdeye URLs
  const birdeyeMatch = message.match(PATTERNS.BIRDEYE_URL);
  if (birdeyeMatch) {
    entities.urls.push({
      url: birdeyeMatch[0],
      type: 'birdeye',
      chain: 'solana',
      address: birdeyeMatch[1],
    });
  }

  // Extract chain hints
  const chainMatch = message.match(PATTERNS.CHAIN_HINT);
  if (chainMatch) {
    const chain = normalizeChainName(chainMatch[2] || chainMatch[1]);
    if (chain && !entities.chainHints.includes(chain)) {
      entities.chainHints.push(chain);
    }
  }

  return entities;
}

/**
 * Normalize chain names to standard format
 */
function normalizeChainName(input: string): string {
  const normalized = input.toLowerCase().trim();
  const chainMap: Record<string, string> = {
    'ethereum': 'ethereum',
    'eth': 'ethereum',
    'solana': 'solana',
    'sol': 'solana',
    'bsc': 'bsc',
    'binance': 'bsc',
    'polygon': 'polygon',
    'matic': 'polygon',
    'avalanche': 'avalanche',
    'avax': 'avalanche',
    'arbitrum': 'arbitrum',
    'arb': 'arbitrum',
    'base': 'base',
    'optimism': 'optimism',
    'op': 'optimism',
  };
  return chainMap[normalized] || normalized;
}

// ============================================================================
// CANDIDATE SCORING
// ============================================================================

export interface CandidateLookupResult {
  candidates: TokenCandidate[];
  method: ResolutionMethod;
}

/**
 * Look up candidates for a given entity
 */
export async function lookupCandidates(
  entity: string,
  entityType: 'ticker' | 'address' | 'url',
  chainHint?: string,
  coinIdValidator?: any
): Promise<CandidateLookupResult> {
  // Check known assets first
  const upperEntity = entity.toUpperCase();
  if (entityType === 'ticker' && KNOWN_ASSETS[upperEntity]) {
    return {
      candidates: [KNOWN_ASSETS[upperEntity]],
      method: 'known_asset',
    };
  }

  // Address lookup - highest confidence
  if (entityType === 'address') {
    const chain = entity.startsWith('0x') ? (chainHint || 'ethereum') : 'solana';
    return {
      candidates: [{
        symbol: 'UNKNOWN',
        chain,
        address: entity,
        confidence: 0.95,
      }],
      method: 'address',
    };
  }

  // URL-derived lookup
  if (entityType === 'url') {
    return {
      candidates: [{
        symbol: 'UNKNOWN',
        chain: chainHint || 'unknown',
        address: entity,
        confidence: 0.90,
      }],
      method: 'url',
    };
  }

  // Ticker lookup via coin ID validator
  if (coinIdValidator && typeof coinIdValidator.resolveSymbol === 'function') {
    try {
      const results = await coinIdValidator.resolveSymbol(entity, chainHint);
      if (results && results.length > 0) {
        return {
          candidates: results.slice(0, 5).map((r: any, idx: number) => ({
            symbol: r.symbol || entity,
            name: r.name,
            chain: r.chain || chainHint || 'unknown',
            address: r.address || null,
            confidence: Math.max(0.6, 0.95 - (idx * 0.1)),
          })),
          method: chainHint ? 'chain_hint' : 'ticker_lookup',
        };
      }
    } catch (error) {
      logger.warn('Coin ID validator lookup failed', { entity, error });
    }
  }

  // Fallback: return low-confidence candidate
  return {
    candidates: [{
      symbol: entity.toUpperCase(),
      chain: chainHint || 'unknown',
      address: null,
      confidence: 0.5,
    }],
    method: 'ticker_lookup',
  };
}

// ============================================================================
// CONFIDENCE GATING
// ============================================================================

export interface ResolutionDecision {
  accepted: boolean;
  resolved?: ResolvedToken;
  clarifier?: TokenClarifier;
  reason: string;
}

/**
 * Apply confidence gating rules to candidates
 */
export function applyConfidenceGating(
  candidates: TokenCandidate[],
  method: ResolutionMethod,
  existingClarifierAttempts: number = 0
): ResolutionDecision {
  if (candidates.length === 0) {
    return {
      accepted: false,
      clarifier: {
        question: 'I couldn\'t find that token. Could you provide the contract address?',
        type: 'no_match',
        candidates: [],
        attempt_count: existingClarifierAttempts + 1,
      },
      reason: 'no_candidates',
    };
  }

  const top = candidates[0];
  const second = candidates[1];
  
  const margin = second ? (top.confidence - second.confidence) : 1.0;

  // Check acceptance criteria
  const meetsConfidence = top.confidence >= RESOLUTION_THRESHOLDS.MIN_CONFIDENCE;
  const meetsMargin = margin >= RESOLUTION_THRESHOLDS.MIN_MARGIN;

  if (meetsConfidence && meetsMargin) {
    return {
      accepted: true,
      resolved: {
        symbol: top.symbol,
        name: top.name,
        chain: top.chain,
        address: top.address,
        confidence: top.confidence,
        margin,
        method,
        is_user_confirmed: false,
        candidates: candidates.slice(0, 5),
      },
      reason: 'threshold_met',
    };
  }

  // Need clarification
  if (existingClarifierAttempts >= RESOLUTION_THRESHOLDS.MAX_CLARIFIER_ATTEMPTS) {
    // Max attempts reached - accept top candidate with warning
    return {
      accepted: true,
      resolved: {
        symbol: top.symbol,
        name: top.name,
        chain: top.chain,
        address: top.address,
        confidence: top.confidence,
        margin,
        method,
        is_user_confirmed: false,
        candidates: candidates.slice(0, 5),
      },
      reason: 'max_clarifier_attempts_exceeded',
    };
  }

  // Generate clarifier
  const clarifierType = determineClarifierType(candidates, margin);
  const clarifierQuestion = generateClarifierQuestion(candidates, clarifierType);

  return {
    accepted: false,
    clarifier: {
      question: clarifierQuestion,
      type: clarifierType,
      candidates: candidates.slice(0, 5),
      attempt_count: existingClarifierAttempts + 1,
    },
    reason: 'confidence_below_threshold',
  };
}

/**
 * Determine the appropriate clarifier type
 */
function determineClarifierType(
  candidates: TokenCandidate[],
  margin: number
): ClarifierType {
  if (candidates.length === 0) {
    return 'no_match';
  }

  if (candidates.length === 1 && candidates[0].confidence < 0.7) {
    return 'need_address';
  }

  // Check if candidates are on different chains
  const chains = new Set(candidates.map(c => c.chain));
  if (chains.size > 1) {
    return 'multiple_chains';
  }

  return 'ambiguous_ticker';
}

/**
 * Generate a human-friendly clarifier question
 */
function generateClarifierQuestion(
  candidates: TokenCandidate[],
  type: ClarifierType
): string {
  switch (type) {
    case 'no_match':
      return 'I couldn\'t find that token. Could you provide the contract address?';

    case 'need_address':
      return `I found ${candidates[0]?.symbol || 'a token'} but I'm not fully certain. Could you confirm with the contract address?`;

    case 'multiple_chains':
      const chains = [...new Set(candidates.map(c => c.chain))].slice(0, 3).join(', ');
      return `I found ${candidates[0]?.symbol} on multiple chains (${chains}). Which one do you mean?`;

    case 'ambiguous_ticker':
      if (candidates.length >= 2) {
        const c1 = candidates[0];
        const c2 = candidates[1];
        return `Did you mean ${c1.name || c1.symbol} on ${c1.chain} or ${c2.name || c2.symbol} on ${c2.chain}?`;
      }
      return 'Could you clarify which token you meant?';

    default:
      return 'Could you provide more details about which token you mean?';
  }
}

// ============================================================================
// MAIN RESOLVER
// ============================================================================

export interface ResolveTokensInput {
  message: string;
  sessionLastToken?: ResolvedToken;
  pendingClarifier?: TokenClarifier;
  coinIdValidator?: any;
}

export interface ResolveTokensOutput {
  resolution: TokenResolution;
  events: TokenResolutionEvent[];
}

/**
 * Main token resolution function
 */
export async function resolveTokenEntities(
  input: ResolveTokensInput
): Promise<ResolveTokensOutput> {
  const events: TokenResolutionEvent[] = [];
  const startTime = Date.now();

  // Extract entities from message
  const entities = extractEntities(input.message);
  const inputEntities: string[] = [
    ...entities.tickers,
    ...entities.addresses.map(a => a.value),
    ...entities.urls.map(u => u.address || u.url),
  ];

  // If no entities found, return empty resolution
  if (inputEntities.length === 0) {
    return {
      resolution: {
        input_entities: [],
        resolved: [],
        clarifier: null,
        used_session_cache: false,
      },
      events,
    };
  }

  const resolved: ResolvedToken[] = [];
  let clarifier: TokenClarifier | null = null;
  let usedSessionCache = false;

  // Process each entity type
  for (const ticker of entities.tickers) {
    // Check session cache first
    if (input.sessionLastToken && 
        input.sessionLastToken.symbol.toUpperCase() === ticker.toUpperCase()) {
      resolved.push({
        ...input.sessionLastToken,
        method: 'session_reuse',
      });
      usedSessionCache = true;
      continue;
    }

    // Look up candidates
    const chainHint = entities.chainHints[0];
    const lookup = await lookupCandidates(
      ticker,
      'ticker',
      chainHint,
      input.coinIdValidator
    );

    // Apply confidence gating
    const existingAttempts = input.pendingClarifier?.attempt_count || 0;
    const decision = applyConfidenceGating(
      lookup.candidates,
      lookup.method,
      existingAttempts
    );

    if (decision.accepted && decision.resolved) {
      resolved.push(decision.resolved);
    } else if (decision.clarifier && !clarifier) {
      // Only set first clarifier
      clarifier = decision.clarifier;
    }

    // Emit event
    events.push({
      type: 'TOKEN_RESOLUTION_DECISION',
      timestamp: Date.now(),
      input_entities: [ticker],
      resolved_count: decision.accepted ? 1 : 0,
      confidence: decision.resolved?.confidence || lookup.candidates[0]?.confidence || 0,
      margin: decision.resolved?.margin || 0,
      method: lookup.method,
      reused_session: false,
      clarifier_generated: !!decision.clarifier,
    });
  }

  // Process addresses (high confidence)
  for (const addr of entities.addresses) {
    const lookup = await lookupCandidates(
      addr.value,
      'address',
      addr.chain,
      input.coinIdValidator
    );

    if (lookup.candidates.length > 0) {
      const candidate = lookup.candidates[0];
      resolved.push({
        symbol: candidate.symbol,
        name: candidate.name,
        chain: candidate.chain,
        address: candidate.address,
        confidence: candidate.confidence,
        margin: 1.0,
        method: 'address',
        is_user_confirmed: false,
        candidates: lookup.candidates,
      });
    }
  }

  // Process URLs
  for (const url of entities.urls) {
    if (url.address) {
      const lookup = await lookupCandidates(
        url.address,
        'url',
        url.chain,
        input.coinIdValidator
      );

      if (lookup.candidates.length > 0) {
        const candidate = lookup.candidates[0];
        resolved.push({
          symbol: candidate.symbol,
          name: candidate.name,
          chain: url.chain || candidate.chain,
          address: url.address,
          confidence: 0.95,
          margin: 1.0,
          method: 'url',
          is_user_confirmed: false,
          candidates: lookup.candidates,
        });
      }
    }
  }

  logger.debug('Token resolution complete', {
    inputEntities,
    resolvedCount: resolved.length,
    hasClarifier: !!clarifier,
    usedSessionCache,
    durationMs: Date.now() - startTime,
  });

  return {
    resolution: {
      input_entities: inputEntities,
      resolved,
      clarifier,
      used_session_cache: usedSessionCache,
    },
    events,
  };
}

// ============================================================================
// SESSION HELPERS
// ============================================================================

/**
 * Check if a token resolution should be reused from session
 */
export function canReuseSessionToken(
  message: string,
  sessionToken: ResolvedToken | undefined
): boolean {
  if (!sessionToken) return false;

  const entities = extractEntities(message);
  
  // Check if message mentions the same symbol
  const mentionsSymbol = entities.tickers.some(
    t => t.toUpperCase() === sessionToken.symbol.toUpperCase()
  );

  // Check for pronouns that might refer to last token
  const hasPronouns = /\b(it|this|that|the token|the coin)\b/i.test(message);

  return mentionsSymbol || hasPronouns;
}

/**
 * Apply user confirmation to a resolved token
 */
export function confirmToken(
  token: ResolvedToken,
  userInput: string
): ResolvedToken {
  return {
    ...token,
    is_user_confirmed: true,
    confidence: Math.max(token.confidence, 0.95),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  KNOWN_ASSETS,
  PATTERNS,
  normalizeChainName,
};
