/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 TOKEN RESOLVER - Ticker/URL → Address Resolution                       ║
 * ║                                                                               ║
 * ║   Resolves user-provided token references to concrete addresses.              ║
 * ║   Handles ambiguity by returning candidates for user selection.               ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready resolution logic                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import axios from 'axios';
import { logger } from '../../utils/logger';
import {
  TokenRef,
  TokenRefType,
  ResolvedToken,
  ResolvedTokenCandidate,
  ChainId,
  DetectedTokenEntity,
  EntityDetectionResult,
} from './types';

// ============================================================================
// PATTERNS FOR ENTITY DETECTION
// ============================================================================

// EVM contract address (0x followed by 40 hex chars)
const EVM_ADDRESS_PATTERN = /\b0x[a-fA-F0-9]{40}\b/g;

// Solana address (32-44 base58 chars, no 0/O/I/l)
const SOLANA_ADDRESS_PATTERN = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

// Ticker pattern ($SYMBOL or just SYMBOL in caps)
const TICKER_PATTERN = /\$([A-Za-z][A-Za-z0-9]{1,10})\b|\b([A-Z][A-Z0-9]{1,10})\b/g;

// DexScreener URL
const DEXSCREENER_URL_PATTERN = /https?:\/\/(?:www\.)?dexscreener\.com\/([a-z]+)\/([a-zA-Z0-9]+)/i;

// pump.fun URL
const PUMPFUN_URL_PATTERN = /https?:\/\/(?:www\.)?pump\.fun\/(?:coin\/)?([1-9A-HJ-NP-Za-km-z]{32,44})/i;

// Common non-token uppercase words to filter out
const EXCLUDED_TICKERS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'AVAX', // Major coins (keep these)
  'I', 'A', 'THE', 'AND', 'OR', 'FOR', 'TO', 'IN', 'ON', 'AT', 'OF', 'IS', 'IT',
  'YES', 'NO', 'OK', 'HEY', 'HI', 'YO', 'LOL', 'OMG', 'WTF', 'NFT', 'AI', 'API',
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'USDT', 'USDC', 'DAI', 'BUSD',
  'APY', 'APR', 'TVL', 'ROI', 'ATH', 'ATL', 'FOMO', 'FUD', 'HODL',
  'CEO', 'CTO', 'CFO', 'COO', 'CMO',
  'URL', 'HTTP', 'HTTPS', 'WWW', 'COM', 'ORG', 'NET',
]);

// Chain detection from address prefix or context
const CHAIN_CONTEXT_PATTERNS: Record<string, ChainId> = {
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  'mainnet': 'ethereum',
  'bsc': 'bsc',
  'bnb': 'bsc',
  'binance': 'bsc',
  'polygon': 'polygon',
  'matic': 'polygon',
  'arbitrum': 'arbitrum',
  'arb': 'arbitrum',
  'base': 'base',
  'optimism': 'optimism',
  'op': 'optimism',
  'avalanche': 'avalanche',
  'avax': 'avalanche',
  'solana': 'solana',
  'sol': 'solana',
  'pump.fun': 'solana',
  'raydium': 'solana',
};

// ============================================================================
// ENTITY DETECTION
// ============================================================================

/**
 * Detect all token entities in a message
 */
export function detectTokenEntities(message: string): EntityDetectionResult {
  const entities: DetectedTokenEntity[] = [];
  
  // 1. Detect EVM addresses
  let match;
  while ((match = EVM_ADDRESS_PATTERN.exec(message)) !== null) {
    entities.push({
      ref: {
        type: 'contract_address',
        raw: match[0],
        normalized: match[0].toLowerCase(),
        chain: 'ethereum', // Default, may be refined
        confidence: 0.95,
      },
      position: { start: match.index, end: match.index + match[0].length },
      matchedPattern: 'EVM_ADDRESS',
    });
  }
  
  // 2. Detect Solana addresses (but filter out false positives)
  EVM_ADDRESS_PATTERN.lastIndex = 0; // Reset
  while ((match = SOLANA_ADDRESS_PATTERN.exec(message)) !== null) {
    const candidate = match[0];
    
    // Skip if it's actually an EVM address we already caught
    if (entities.some(e => e.ref.raw === candidate)) continue;
    
    // Skip if it looks like a hash or other non-address string
    if (candidate.length < 32 || candidate.length > 44) continue;
    
    // Check if it's in a pump.fun context
    const isPumpFun = message.toLowerCase().includes('pump.fun') || 
                      candidate.endsWith('pump') ||
                      PUMPFUN_URL_PATTERN.test(message);
    
    entities.push({
      ref: {
        type: 'contract_address',
        raw: candidate,
        normalized: candidate,
        chain: 'solana',
        confidence: isPumpFun ? 0.95 : 0.75,
      },
      position: { start: match.index, end: match.index + candidate.length },
      matchedPattern: isPumpFun ? 'SOLANA_PUMPFUN' : 'SOLANA_ADDRESS',
    });
  }
  
  // 3. Detect DexScreener URLs
  const dexMatch = DEXSCREENER_URL_PATTERN.exec(message);
  if (dexMatch) {
    const chain = dexMatch[1].toLowerCase() as ChainId;
    const identifier = dexMatch[2];
    
    entities.push({
      ref: {
        type: 'dexscreener_url',
        raw: dexMatch[0],
        normalized: identifier.toLowerCase(),
        chain: chain in CHAIN_CONTEXT_PATTERNS ? CHAIN_CONTEXT_PATTERNS[chain] : 'unknown',
        confidence: 0.98,
      },
      position: { start: dexMatch.index, end: dexMatch.index + dexMatch[0].length },
      matchedPattern: 'DEXSCREENER_URL',
    });
  }
  
  // 4. Detect pump.fun URLs
  const pumpMatch = PUMPFUN_URL_PATTERN.exec(message);
  if (pumpMatch) {
    entities.push({
      ref: {
        type: 'pumpfun_url',
        raw: pumpMatch[0],
        normalized: pumpMatch[1],
        chain: 'solana',
        confidence: 0.99,
      },
      position: { start: pumpMatch.index, end: pumpMatch.index + pumpMatch[0].length },
      matchedPattern: 'PUMPFUN_URL',
    });
  }
  
  // 5. Detect tickers (only if no address found)
  if (entities.length === 0) {
    TICKER_PATTERN.lastIndex = 0;
    while ((match = TICKER_PATTERN.exec(message)) !== null) {
      const ticker = (match[1] || match[2]).toUpperCase();
      
      // Skip excluded words
      if (EXCLUDED_TICKERS.has(ticker) && ticker.length <= 3) continue;
      
      // Skip if too short
      if (ticker.length < 2) continue;
      
      entities.push({
        ref: {
          type: 'ticker',
          raw: match[0],
          normalized: ticker,
          chain: detectChainFromContext(message),
          confidence: match[0].startsWith('$') ? 0.85 : 0.6,
        },
        position: { start: match.index, end: match.index + match[0].length },
        matchedPattern: match[0].startsWith('$') ? 'TICKER_CASHTAG' : 'TICKER_CAPS',
      });
    }
  }
  
  // Sort by confidence (highest first)
  entities.sort((a, b) => b.ref.confidence - a.ref.confidence);
  
  // Determine primary entity
  const primaryEntity = entities.length > 0 ? entities[0] : null;
  
  // Check if resolution is needed
  const needsResolution = primaryEntity?.ref.type === 'ticker';
  
  return {
    hasTokenEntity: entities.length > 0,
    entities,
    primaryEntity,
    needsResolution,
  };
}

/**
 * Detect chain from message context
 */
function detectChainFromContext(message: string): ChainId | undefined {
  const lowerMessage = message.toLowerCase();
  
  for (const [pattern, chain] of Object.entries(CHAIN_CONTEXT_PATTERNS)) {
    if (lowerMessage.includes(pattern)) {
      return chain;
    }
  }
  
  return undefined;
}

// ============================================================================
// TOKEN RESOLUTION
// ============================================================================

/**
 * Resolve a token reference to a concrete address
 */
export async function resolveToken(ref: TokenRef): Promise<ResolvedToken | null> {
  logger.debug('🔍 Resolving token reference', {
    type: ref.type,
    raw: ref.raw.slice(0, 20),
    chain: ref.chain,
  });
  
  switch (ref.type) {
    case 'contract_address':
      return resolveFromAddress(ref);
      
    case 'ticker':
      return resolveFromTicker(ref);
      
    case 'dexscreener_url':
    case 'pumpfun_url':
      return resolveFromUrl(ref);
      
    default:
      logger.warn('🔍 Unknown token ref type', { type: ref.type });
      return null;
  }
}

/**
 * Resolve from contract address (just validate and get metadata)
 */
async function resolveFromAddress(ref: TokenRef): Promise<ResolvedToken | null> {
  try {
    // Use DexScreener to get token info
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${ref.normalized}`,
      { timeout: 5000 }
    );
    
    if (!response.data?.pairs || response.data.pairs.length === 0) {
      // Token not found on DexScreener, but address is still valid
      return {
        address: ref.normalized,
        chain: ref.chain || 'unknown',
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        resolvedFrom: ref.type,
        resolvedAt: new Date().toISOString(),
        resolutionConfidence: 0.5,
        isAmbiguous: false,
      };
    }
    
    // Get the best pair (highest liquidity)
    const pairs = response.data.pairs
      .filter((p: any) => p.baseToken?.address?.toLowerCase() === ref.normalized.toLowerCase())
      .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    
    if (pairs.length === 0) {
      return null;
    }
    
    const bestPair = pairs[0];
    const chain = mapDexScreenerChain(bestPair.chainId);
    
    return {
      address: bestPair.baseToken.address,
      chain,
      symbol: bestPair.baseToken.symbol,
      name: bestPair.baseToken.name,
      pairAddress: bestPair.pairAddress,
      dexscreenerUrl: bestPair.url,
      resolvedFrom: ref.type,
      resolvedAt: new Date().toISOString(),
      resolutionConfidence: 0.95,
      isAmbiguous: false,
    };
    
  } catch (error: any) {
    logger.error('🔍 Address resolution failed', {
      address: ref.normalized.slice(0, 10),
      error: error.message,
    });
    return null;
  }
}

/**
 * Resolve from ticker (search DexScreener for candidates)
 * Implements confidence-gated resolution per COINET_TOKEN_RESOLUTION_POLICY
 */
async function resolveFromTicker(ref: TokenRef): Promise<ResolvedToken | null> {
  try {
    // Search DexScreener
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(ref.normalized)}`,
      { timeout: 5000 }
    );
    
    if (!response.data?.pairs || response.data.pairs.length === 0) {
      logger.debug('🔍 No pairs found for ticker', { ticker: ref.normalized });
      return null;
    }
    
    // Filter and score candidates
    const candidates: ResolvedTokenCandidate[] = response.data.pairs
      .filter((p: any) => 
        p.baseToken?.symbol?.toUpperCase() === ref.normalized.toUpperCase()
      )
      .slice(0, 10)  // Limit to top 10
      .map((p: any) => ({
        address: p.baseToken.address,
        chain: mapDexScreenerChain(p.chainId),
        symbol: p.baseToken.symbol,
        name: p.baseToken.name,
        liquidity: p.liquidity?.usd || 0,
        volume24h: p.volume?.h24 || 0,
        confidence: calculateCandidateConfidence(p, ref),
        source: 'dexscreener' as const,
      }))
      .sort((a: ResolvedTokenCandidate, b: ResolvedTokenCandidate) => b.confidence - a.confidence);
    
    if (candidates.length === 0) {
      return null;
    }
    
    // If user specified a chain, filter to that chain first
    let filteredCandidates = candidates;
    if (ref.chain && ref.chain !== 'unknown') {
      const chainFiltered = candidates.filter(c => c.chain === ref.chain);
      if (chainFiltered.length > 0) {
        filteredCandidates = chainFiltered;
      }
    }
    
    // Calculate confidence result using the new system
    const confidenceResult = calculateConfidenceResult(filteredCandidates, ref);
    
    logger.info('🔍 Token resolution confidence', {
      ticker: ref.normalized,
      level: confidenceResult.level,
      topConfidence: confidenceResult.topConfidence.toFixed(2),
      margin: confidenceResult.margin.toFixed(2),
      shouldAutoResolve: confidenceResult.shouldAutoResolve,
      candidateCount: filteredCandidates.length,
    });
    
    // Build resolved token with confidence metadata
    const topCandidate = filteredCandidates[0];
    const isAmbiguous = !confidenceResult.shouldAutoResolve;
    
    return buildResolvedToken(
      topCandidate, 
      ref, 
      filteredCandidates.slice(1), 
      isAmbiguous,
      confidenceResult
    );
    
  } catch (error: any) {
    logger.error('🔍 Ticker resolution failed', {
      ticker: ref.normalized,
      error: error.message,
    });
    return null;
  }
}

/**
 * Resolve from URL (parse and fetch)
 */
async function resolveFromUrl(ref: TokenRef): Promise<ResolvedToken | null> {
  // The URL patterns have already been parsed in entity detection
  // Just need to resolve the extracted identifier
  
  const addressRef: TokenRef = {
    ...ref,
    type: 'contract_address',
    raw: ref.normalized,
  };
  
  return resolveFromAddress(addressRef);
}

// ============================================================================
// CONFIDENCE SCORING (PRODUCTION-READY, CALIBRATED)
// ============================================================================

/**
 * Confidence level thresholds (from policy)
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,       // Auto-resolve threshold
  MEDIUM: 0.65,     // Ask for clarification
  MARGIN: 0.15,     // Required margin between top and runner-up for HIGH
} as const;

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceResult {
  level: ConfidenceLevel;
  topConfidence: number;
  runnerUpConfidence: number;
  margin: number;
  ambiguityScore: number;  // 0-1, higher = more ambiguous
  shouldAutoResolve: boolean;
  clarificationReason?: string;
}

/**
 * Calculate confidence score for a candidate
 * Based on: liquidity, volume, symbol match, chain match, uniqueness
 */
function calculateCandidateConfidence(pair: any, ref: TokenRef): number {
  let confidence = 0.45;  // Base confidence
  
  // --- Liquidity boost (primary signal) ---
  const liquidity = pair.liquidity?.usd || 0;
  if (liquidity > 1000000) confidence += 0.30;
  else if (liquidity > 100000) confidence += 0.20;
  else if (liquidity > 10000) confidence += 0.10;
  else if (liquidity > 1000) confidence += 0.05;
  
  // --- Volume boost ---
  const volume = pair.volume?.h24 || 0;
  if (volume > 500000) confidence += 0.10;
  else if (volume > 50000) confidence += 0.05;
  else if (volume > 5000) confidence += 0.02;
  
  // --- Chain match boost (if user specified) ---
  if (ref.chain && ref.chain !== 'unknown' && mapDexScreenerChain(pair.chainId) === ref.chain) {
    confidence += 0.15;
  }
  
  // --- Exact symbol match ---
  if (pair.baseToken?.symbol?.toUpperCase() === ref.normalized) {
    confidence += 0.05;
  }
  
  // --- Exact name match (partial) ---
  if (pair.baseToken?.name?.toUpperCase().includes(ref.normalized)) {
    confidence += 0.03;
  }
  
  // --- Recent activity boost ---
  const txns = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
  if (txns > 1000) confidence += 0.05;
  else if (txns > 100) confidence += 0.02;
  
  return Math.min(0.98, confidence);
}

/**
 * Calculate overall confidence result from candidates
 */
export function calculateConfidenceResult(
  candidates: ResolvedTokenCandidate[],
  ref: TokenRef
): ConfidenceResult {
  if (candidates.length === 0) {
    return {
      level: 'low',
      topConfidence: 0,
      runnerUpConfidence: 0,
      margin: 0,
      ambiguityScore: 1,
      shouldAutoResolve: false,
      clarificationReason: 'No matching tokens found',
    };
  }
  
  const topConfidence = candidates[0].confidence;
  const runnerUpConfidence = candidates.length > 1 ? candidates[1].confidence : 0;
  const margin = topConfidence - runnerUpConfidence;
  
  // Calculate ambiguity score
  let ambiguityScore = 0;
  if (candidates.length > 1) {
    // More candidates = more ambiguous
    ambiguityScore += Math.min(0.3, candidates.length * 0.05);
    
    // Similar confidence = more ambiguous
    if (margin < 0.10) ambiguityScore += 0.3;
    else if (margin < 0.15) ambiguityScore += 0.2;
    else if (margin < 0.20) ambiguityScore += 0.1;
    
    // Similar liquidity = more ambiguous
    const topLiq = candidates[0].liquidity;
    const runnerUpLiq = candidates[1].liquidity;
    if (runnerUpLiq > topLiq * 0.5) ambiguityScore += 0.2;
  }
  ambiguityScore = Math.min(1, ambiguityScore);
  
  // Determine confidence level
  let level: ConfidenceLevel;
  let shouldAutoResolve: boolean;
  let clarificationReason: string | undefined;
  
  if (topConfidence >= CONFIDENCE_THRESHOLDS.HIGH && margin >= CONFIDENCE_THRESHOLDS.MARGIN) {
    level = 'high';
    shouldAutoResolve = true;
  } else if (topConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    level = 'medium';
    shouldAutoResolve = false;
    if (margin < CONFIDENCE_THRESHOLDS.MARGIN) {
      clarificationReason = 'Multiple similar matches - need user confirmation';
    } else {
      clarificationReason = 'Confidence below auto-resolve threshold';
    }
  } else {
    level = 'low';
    shouldAutoResolve = false;
    clarificationReason = 'Low confidence - recommend contract address';
  }
  
  return {
    level,
    topConfidence,
    runnerUpConfidence,
    margin,
    ambiguityScore,
    shouldAutoResolve,
    clarificationReason,
  };
}

/**
 * Build resolved token from candidate with full confidence metadata
 */
function buildResolvedToken(
  candidate: ResolvedTokenCandidate,
  ref: TokenRef,
  alternatives: ResolvedTokenCandidate[],
  isAmbiguous: boolean,
  confidenceResult?: ConfidenceResult
): ResolvedToken {
  return {
    address: candidate.address,
    chain: candidate.chain,
    symbol: candidate.symbol,
    name: candidate.name,
    resolvedFrom: ref.type,
    resolvedAt: new Date().toISOString(),
    resolutionConfidence: candidate.confidence,
    isAmbiguous,
    alternatives: isAmbiguous ? alternatives.slice(0, 3) : undefined,
    // Extended confidence metadata
    confidenceLevel: confidenceResult?.level,
    confidenceMargin: confidenceResult?.margin,
    shouldAutoResolve: confidenceResult?.shouldAutoResolve ?? !isAmbiguous,
    clarificationReason: confidenceResult?.clarificationReason,
  };
}

/**
 * Map DexScreener chain ID to our ChainId
 */
function mapDexScreenerChain(dexChain: string): ChainId {
  const mapping: Record<string, ChainId> = {
    'ethereum': 'ethereum',
    'bsc': 'bsc',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'base': 'base',
    'optimism': 'optimism',
    'avalanche': 'avalanche',
    'solana': 'solana',
  };
  
  return mapping[dexChain?.toLowerCase()] || 'unknown';
}

// ============================================================================
// CLARIFICATION GENERATION (HUMAN-STYLE, LANGUAGE-AWARE)
// ============================================================================

export type SupportedLanguage = 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'other';

/**
 * Clarification templates per language (from COINET_TOKEN_RESOLUTION_POLICY)
 * Style: short, human, exactly one question mark
 */
const CLARIFICATION_TEMPLATES: Record<SupportedLanguage, {
  askAddress: string;
  askChain: (chains: string[]) => string;
  confirmChain: (token: string, chain: string) => string;
  notFound: (token: string) => string;
}> = {
  en: {
    askAddress: "Can you send me the contract address? I'll pull the right token.",
    askChain: (chains) => `Which one did you mean — ${chains.join(' or ')}? (Drop the address if you have it.)`,
    confirmChain: (token, chain) => `You mean ${token} on ${chain}?`,
    notFound: (token) => `Couldn't find ${token}. Do you have the contract address?`,
  },
  de: {
    askAddress: "Kannst du mir die Contract-Adresse schicken? Dann check ich genau den richtigen Token.",
    askChain: (chains) => `Welchen meinst du — ${chains.join(' oder ')}? (Wenn du die Adresse hast, schick sie kurz.)`,
    confirmChain: (token, chain) => `Meinst du ${token} auf ${chain}?`,
    notFound: (token) => `Kann ${token} nicht finden. Hast du die Contract-Adresse?`,
  },
  es: {
    askAddress: "¿Me pasas la dirección del contrato? Así verifico el token correcto.",
    askChain: (chains) => `¿Cuál — el de ${chains.join(' o ')}? (Si tienes la dirección, pásala.)`,
    confirmChain: (token, chain) => `¿Te refieres a ${token} en ${chain}?`,
    notFound: (token) => `No encuentro ${token}. ¿Tienes la dirección del contrato?`,
  },
  fr: {
    askAddress: "Tu peux m'envoyer l'adresse du contrat ? Je vérifie le bon token.",
    askChain: (chains) => `Lequel tu veux — ${chains.join(' ou ')}? (Envoie l'adresse si tu l'as.)`,
    confirmChain: (token, chain) => `Tu parles de ${token} sur ${chain}?`,
    notFound: (token) => `Je ne trouve pas ${token}. Tu as l'adresse du contrat?`,
  },
  it: {
    askAddress: "Mi mandi l'indirizzo del contratto? Così verifico il token giusto.",
    askChain: (chains) => `Quale intendi — ${chains.join(' o ')}? (Mandami l'indirizzo se ce l'hai.)`,
    confirmChain: (token, chain) => `Intendi ${token} su ${chain}?`,
    notFound: (token) => `Non trovo ${token}. Hai l'indirizzo del contratto?`,
  },
  pt: {
    askAddress: "Pode me enviar o endereço do contrato? Assim pego o token certo.",
    askChain: (chains) => `Qual você quis dizer — ${chains.join(' ou ')}? (Manda o endereço se tiver.)`,
    confirmChain: (token, chain) => `Você quis dizer ${token} no ${chain}?`,
    notFound: (token) => `Não encontro ${token}. Tem o endereço do contrato?`,
  },
  other: {
    askAddress: "Can you send me the contract address?",
    askChain: (chains) => `Which one — ${chains.join(' or ')}?`,
    confirmChain: (token, chain) => `${token} on ${chain}?`,
    notFound: (token) => `Can't find ${token}. Contract address?`,
  },
};

/**
 * Generate clarification question for ambiguous resolution
 * Implements RULE C2 and C3 from COINET_TOKEN_RESOLUTION_POLICY
 * 
 * @param resolved - The resolved token (may be ambiguous)
 * @param ref - Original token reference
 * @param language - User's language (defaults to 'en')
 */
export function generateClarificationQuestion(
  resolved: ResolvedToken | null,
  ref: TokenRef,
  language: SupportedLanguage = 'en'
): string | undefined {
  const templates = CLARIFICATION_TEMPLATES[language] || CLARIFICATION_TEMPLATES.other;
  
  // Case 1: Token not found at all (LOW confidence)
  if (!resolved) {
    return templates.notFound(ref.raw);
  }
  
  // Case 2: High confidence, auto-resolve → no clarification needed
  if (resolved.shouldAutoResolve && !resolved.isAmbiguous) {
    return undefined;
  }
  
  // Case 3: Multiple candidates on different chains (MEDIUM confidence)
  if (resolved.isAmbiguous && resolved.alternatives && resolved.alternatives.length > 0) {
    // Get unique chains
    const chains = new Set([resolved.chain, ...resolved.alternatives.map(a => a.chain)]);
    const uniqueChains = Array.from(chains)
      .filter(c => c !== 'unknown')
      .slice(0, 3)  // Max 3 chains
      .map(c => capitalizeFirst(c));
    
    if (uniqueChains.length >= 2) {
      // Multiple chains → ask which chain
      return templates.askChain(uniqueChains);
    } else if (uniqueChains.length === 1) {
      // Same chain but multiple tokens → ask for address
      return templates.askAddress;
    }
  }
  
  // Case 4: Single candidate with MEDIUM confidence → confirm
  if (resolved.confidenceLevel === 'medium' && resolved.chain !== 'unknown') {
    return templates.confirmChain(ref.raw, capitalizeFirst(resolved.chain));
  }
  
  // Case 5: LOW confidence → always ask for address
  if (resolved.confidenceLevel === 'low') {
    return templates.askAddress;
  }
  
  // Default: ask for address
  return templates.askAddress;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
