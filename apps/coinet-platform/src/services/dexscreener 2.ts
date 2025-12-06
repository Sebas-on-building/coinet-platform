/**
 * 🦎 DexScreener Integration - Divine Perfection
 * 
 * The most comprehensive DEX token data service.
 * Fetches prices, liquidity, and pair info for ANY token on ANY DEX.
 * 
 * CAPABILITIES:
 * - Real-time prices for DEX-only tokens
 * - Liquidity depth analysis
 * - Multi-chain support (ETH, SOL, BSC, ARB, BASE, etc.)
 * - Pair discovery and ranking
 * - New token detection
 * - Trending tokens
 * - Contract address lookup
 * 
 * USE CASES:
 * - New memecoins not on CEXes
 * - Pre-listing tokens
 * - Low-cap gems
 * - Liquidity verification
 * - Rug pull detection signals
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  BASE_URL: 'https://api.dexscreener.com',
  
  // Rate limiting (DexScreener is generous but respect limits)
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 300,
    MIN_REQUEST_INTERVAL: 200, // ms between requests
  },
  
  // Timeouts
  TIMEOUT: 8000,
  
  // Cache TTL
  CACHE_TTL: 30000, // 30 seconds
  
  // Supported chains
  CHAINS: {
    ethereum: 'ethereum',
    solana: 'solana',
    bsc: 'bsc',
    arbitrum: 'arbitrum',
    base: 'base',
    polygon: 'polygon',
    avalanche: 'avalanche',
    optimism: 'optimism',
    fantom: 'fantom',
    cronos: 'cronos',
    sui: 'sui',
    aptos: 'aptos',
  } as const,
  
  // Minimum liquidity for valid pairs (filter out dust)
  MIN_LIQUIDITY_USD: 1000,
  
  // Quote tokens for USD pairs
  USD_QUOTE_TOKENS: ['USDC', 'USDT', 'DAI', 'BUSD', 'UST', 'FRAX', 'TUSD'],
};

// ============================================================================
// TYPES
// ============================================================================

export type ChainId = keyof typeof CONFIG.CHAINS;

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[];
  
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  
  priceNative: string;
  priceUsd: string;
  
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  
  fdv: number;
  marketCap?: number;
  pairCreatedAt?: number;
  
  info?: {
    imageUrl?: string;
    websites?: { label: string; url: string }[];
    socials?: { type: string; url: string }[];
  };
}

export interface DexToken {
  symbol: string;
  name: string;
  address: string;
  chainId: string;
  priceUsd: number;
  priceChange24h: number;
  priceChange1h: number;
  priceChange5m: number;
  volume24h: number;
  liquidity: number;
  fdv: number;
  marketCap?: number;
  txns24h: { buys: number; sells: number };
  dex: string;
  pairAddress: string;
  pairUrl: string;
  quoteToken: string;
  pairCreatedAt?: Date;
  isVerified: boolean;
  confidence: number;
  source: 'dexscreener';
}

export interface DexSearchResult {
  query: string;
  tokens: DexToken[];
  totalPairs: number;
  chains: string[];
  searchTime: number;
}

export interface TrendingToken extends DexToken {
  rank: number;
  volumeRank: number;
  liquidityRank: number;
  priceChangeRank: number;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class DexScreenerRateLimiter {
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private windowStart: number = Date.now();

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Reset window if minute passed
    if (now - this.windowStart > 60000) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    // Check rate limit
    if (this.requestCount >= CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.windowStart);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }
    
    // Minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < CONFIG.RATE_LIMIT.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, CONFIG.RATE_LIMIT.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}

const rateLimiter = new DexScreenerRateLimiter();

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DexCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const cache = new DexCache();

// ============================================================================
// API METHODS
// ============================================================================

/**
 * 🔍 Search for tokens by symbol, name, or address
 */
export async function searchToken(query: string): Promise<DexSearchResult> {
  const startTime = Date.now();
  const cacheKey = `search:${query.toLowerCase()}`;
  
  // Check cache
  const cached = cache.get<DexSearchResult>(cacheKey);
  if (cached) {
    logger.debug('🦎 DexScreener cache hit', { query });
    return cached;
  }
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(`${CONFIG.BASE_URL}/latest/dex/search`, {
      params: { q: query },
      timeout: CONFIG.TIMEOUT,
      headers: { 'Accept': 'application/json' },
    });
    
    const pairs: DexPair[] = response.data?.pairs || [];
    const tokens = processAndRankPairs(pairs, query);
    
    const result: DexSearchResult = {
      query,
      tokens,
      totalPairs: pairs.length,
      chains: [...new Set(pairs.map(p => p.chainId))],
      searchTime: Date.now() - startTime,
    };
    
    cache.set(cacheKey, result);
    
    logger.debug('🦎 DexScreener search', { 
      query, 
      found: tokens.length, 
      chains: result.chains.length,
      time: result.searchTime 
    });
    
    return result;
  } catch (error: any) {
    logger.error('🦎 DexScreener search failed', { query, error: error.message });
    return {
      query,
      tokens: [],
      totalPairs: 0,
      chains: [],
      searchTime: Date.now() - startTime,
    };
  }
}

/**
 * 📍 Get token by contract address
 */
export async function getTokenByAddress(
  chainId: ChainId, 
  address: string
): Promise<DexToken | null> {
  const cacheKey = `address:${chainId}:${address.toLowerCase()}`;
  
  const cached = cache.get<DexToken>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.BASE_URL}/latest/dex/tokens/${address}`,
      { timeout: CONFIG.TIMEOUT }
    );
    
    const pairs: DexPair[] = response.data?.pairs || [];
    
    // Filter to specified chain
    const chainPairs = pairs.filter(p => p.chainId === chainId);
    if (chainPairs.length === 0) return null;
    
    const tokens = processAndRankPairs(chainPairs, '');
    if (tokens.length === 0) return null;
    
    cache.set(cacheKey, tokens[0]);
    return tokens[0];
  } catch (error: any) {
    logger.debug('🦎 DexScreener address lookup failed', { chainId, address, error: error.message });
    return null;
  }
}

/**
 * 📊 Get all pairs for a token address
 */
export async function getTokenPairs(address: string): Promise<DexPair[]> {
  const cacheKey = `pairs:${address.toLowerCase()}`;
  
  const cached = cache.get<DexPair[]>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.BASE_URL}/latest/dex/tokens/${address}`,
      { timeout: CONFIG.TIMEOUT }
    );
    
    const pairs: DexPair[] = response.data?.pairs || [];
    cache.set(cacheKey, pairs);
    return pairs;
  } catch (error: any) {
    logger.debug('🦎 DexScreener pairs lookup failed', { address, error: error.message });
    return [];
  }
}

/**
 * 🔥 Get pair by address
 */
export async function getPairByAddress(
  chainId: ChainId, 
  pairAddress: string
): Promise<DexPair | null> {
  const cacheKey = `pair:${chainId}:${pairAddress.toLowerCase()}`;
  
  const cached = cache.get<DexPair>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.BASE_URL}/latest/dex/pairs/${chainId}/${pairAddress}`,
      { timeout: CONFIG.TIMEOUT }
    );
    
    const pair: DexPair = response.data?.pair;
    if (pair) cache.set(cacheKey, pair);
    return pair || null;
  } catch (error: any) {
    logger.debug('🦎 DexScreener pair lookup failed', { chainId, pairAddress, error: error.message });
    return null;
  }
}

/**
 * ⛓️ Get top tokens on a specific chain
 */
export async function getChainTopTokens(chainId: ChainId, limit: number = 20): Promise<DexToken[]> {
  // DexScreener doesn't have a direct "top tokens" endpoint
  // We'll search for common tokens on that chain
  const commonQueries = ['usdc', 'usdt', 'weth', 'wbtc'];
  const allTokens: DexToken[] = [];
  
  for (const query of commonQueries) {
    const result = await searchToken(query);
    const chainTokens = result.tokens.filter(t => t.chainId === chainId);
    allTokens.push(...chainTokens);
  }
  
  // Dedupe and sort by liquidity
  const uniqueTokens = dedupeTokens(allTokens);
  return uniqueTokens
    .sort((a, b) => b.liquidity - a.liquidity)
    .slice(0, limit);
}

/**
 * 🆕 Get newly created pairs (recent listings)
 */
export async function getNewPairs(
  chainId?: ChainId, 
  minLiquidity: number = 10000,
  limit: number = 20
): Promise<DexToken[]> {
  // Search for tokens with high recent activity (likely new)
  const result = await searchToken('');
  
  let tokens = result.tokens;
  
  // Filter by chain if specified
  if (chainId) {
    tokens = tokens.filter(t => t.chainId === chainId);
  }
  
  // Filter by liquidity
  tokens = tokens.filter(t => t.liquidity >= minLiquidity);
  
  // Sort by creation time (newest first)
  tokens = tokens
    .filter(t => t.pairCreatedAt)
    .sort((a, b) => {
      const timeA = a.pairCreatedAt?.getTime() || 0;
      const timeB = b.pairCreatedAt?.getTime() || 0;
      return timeB - timeA;
    })
    .slice(0, limit);
  
  return tokens;
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

/**
 * Process raw pairs into ranked tokens
 */
function processAndRankPairs(pairs: DexPair[], query: string): DexToken[] {
  // Filter out dust pairs and invalid data
  const validPairs = pairs.filter(pair => {
    if (!pair.priceUsd || parseFloat(pair.priceUsd) <= 0) return false;
    if ((pair.liquidity?.usd || 0) < CONFIG.MIN_LIQUIDITY_USD) return false;
    return true;
  });
  
  // Group by base token
  const tokenGroups = new Map<string, DexPair[]>();
  
  for (const pair of validPairs) {
    const key = `${pair.chainId}:${pair.baseToken.address.toLowerCase()}`;
    const existing = tokenGroups.get(key) || [];
    existing.push(pair);
    tokenGroups.set(key, existing);
  }
  
  // Convert groups to tokens (pick best pair per token)
  const tokens: DexToken[] = [];
  
  for (const [_, groupPairs] of tokenGroups) {
    const bestPair = selectBestPair(groupPairs);
    if (!bestPair) continue;
    
    const token = pairToToken(bestPair);
    token.confidence = calculateConfidence(bestPair, query);
    tokens.push(token);
  }
  
  // Sort by confidence, then liquidity
  tokens.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) > 0.1) {
      return b.confidence - a.confidence;
    }
    return b.liquidity - a.liquidity;
  });
  
  return tokens;
}

/**
 * Select the best pair from multiple pairs for the same token
 */
function selectBestPair(pairs: DexPair[]): DexPair | null {
  if (pairs.length === 0) return null;
  if (pairs.length === 1) return pairs[0];
  
  // Prefer USD quote pairs
  const usdPairs = pairs.filter(p => 
    CONFIG.USD_QUOTE_TOKENS.includes(p.quoteToken.symbol.toUpperCase())
  );
  
  const candidatePairs = usdPairs.length > 0 ? usdPairs : pairs;
  
  // Sort by liquidity * volume (best overall pair)
  return candidatePairs.sort((a, b) => {
    const scoreA = (a.liquidity?.usd || 0) * Math.sqrt(a.volume?.h24 || 1);
    const scoreB = (b.liquidity?.usd || 0) * Math.sqrt(b.volume?.h24 || 1);
    return scoreB - scoreA;
  })[0];
}

/**
 * Convert a pair to a token object
 */
function pairToToken(pair: DexPair): DexToken {
  return {
    symbol: pair.baseToken.symbol.toUpperCase(),
    name: pair.baseToken.name,
    address: pair.baseToken.address,
    chainId: pair.chainId,
    priceUsd: parseFloat(pair.priceUsd) || 0,
    priceChange24h: pair.priceChange?.h24 || 0,
    priceChange1h: pair.priceChange?.h1 || 0,
    priceChange5m: pair.priceChange?.m5 || 0,
    volume24h: pair.volume?.h24 || 0,
    liquidity: pair.liquidity?.usd || 0,
    fdv: pair.fdv || 0,
    marketCap: pair.marketCap,
    txns24h: {
      buys: pair.txns?.h24?.buys || 0,
      sells: pair.txns?.h24?.sells || 0,
    },
    dex: pair.dexId,
    pairAddress: pair.pairAddress,
    pairUrl: pair.url,
    quoteToken: pair.quoteToken.symbol,
    pairCreatedAt: pair.pairCreatedAt ? new Date(pair.pairCreatedAt) : undefined,
    isVerified: !!(pair.info?.websites?.length || pair.info?.socials?.length),
    confidence: 0.75,
    source: 'dexscreener',
  };
}

/**
 * Calculate confidence score for a token match
 */
function calculateConfidence(pair: DexPair, query: string): number {
  let confidence = 0.5; // Base confidence
  
  const symbol = pair.baseToken.symbol.toLowerCase();
  const name = pair.baseToken.name.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact symbol match
  if (symbol === queryLower) confidence += 0.3;
  else if (symbol.includes(queryLower)) confidence += 0.15;
  
  // Name match
  if (name === queryLower) confidence += 0.2;
  else if (name.includes(queryLower)) confidence += 0.1;
  
  // Liquidity boost
  const liquidity = pair.liquidity?.usd || 0;
  if (liquidity > 1000000) confidence += 0.1;
  else if (liquidity > 100000) confidence += 0.05;
  
  // Volume boost
  const volume = pair.volume?.h24 || 0;
  if (volume > 1000000) confidence += 0.1;
  else if (volume > 100000) confidence += 0.05;
  
  // Verified boost
  if (pair.info?.websites?.length || pair.info?.socials?.length) {
    confidence += 0.05;
  }
  
  // USD pair boost
  if (CONFIG.USD_QUOTE_TOKENS.includes(pair.quoteToken.symbol.toUpperCase())) {
    confidence += 0.05;
  }
  
  return Math.min(confidence, 0.95);
}

/**
 * Deduplicate tokens by address
 */
function dedupeTokens(tokens: DexToken[]): DexToken[] {
  const seen = new Map<string, DexToken>();
  
  for (const token of tokens) {
    const key = `${token.chainId}:${token.address.toLowerCase()}`;
    const existing = seen.get(key);
    
    // Keep the one with higher liquidity
    if (!existing || token.liquidity > existing.liquidity) {
      seen.set(key, token);
    }
  }
  
  return Array.from(seen.values());
}

// ============================================================================
// ANALYSIS UTILITIES
// ============================================================================

/**
 * 🚨 Analyze token for potential risks
 */
export function analyzeTokenRisk(token: DexToken): {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  warnings: string[];
  positives: string[];
} {
  const warnings: string[] = [];
  const positives: string[] = [];
  let riskScore = 0;
  
  // Liquidity analysis
  if (token.liquidity < 10000) {
    warnings.push('Very low liquidity (<$10K) - high slippage risk');
    riskScore += 3;
  } else if (token.liquidity < 50000) {
    warnings.push('Low liquidity (<$50K) - moderate slippage risk');
    riskScore += 2;
  } else if (token.liquidity > 500000) {
    positives.push('Good liquidity (>$500K)');
  }
  
  // Buy/Sell ratio
  const totalTxns = token.txns24h.buys + token.txns24h.sells;
  if (totalTxns > 0) {
    const sellRatio = token.txns24h.sells / totalTxns;
    if (sellRatio > 0.7) {
      warnings.push('Heavy selling pressure (>70% sells)');
      riskScore += 2;
    } else if (sellRatio < 0.3) {
      positives.push('Strong buying pressure');
    }
  }
  
  // Age analysis
  if (token.pairCreatedAt) {
    const ageHours = (Date.now() - token.pairCreatedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) {
      warnings.push('Very new token (<24h old) - high risk');
      riskScore += 3;
    } else if (ageHours < 72) {
      warnings.push('New token (<3 days old)');
      riskScore += 1;
    } else if (ageHours > 720) { // 30 days
      positives.push('Established token (>30 days)');
    }
  }
  
  // Verification
  if (!token.isVerified) {
    warnings.push('Unverified token - no official links');
    riskScore += 1;
  } else {
    positives.push('Verified with official links');
  }
  
  // Volume to liquidity ratio
  if (token.liquidity > 0) {
    const volumeToLiq = token.volume24h / token.liquidity;
    if (volumeToLiq > 10) {
      warnings.push('Unusual volume/liquidity ratio - possible manipulation');
      riskScore += 2;
    }
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  if (riskScore >= 6) riskLevel = 'extreme';
  else if (riskScore >= 4) riskLevel = 'high';
  else if (riskScore >= 2) riskLevel = 'medium';
  else riskLevel = 'low';
  
  return { riskLevel, warnings, positives };
}

/**
 * 📈 Format token for AI context
 */
export function formatTokenForAI(token: DexToken): string {
  const risk = analyzeTokenRisk(token);
  const changeIcon = token.priceChange24h >= 0 ? '↑' : '↓';
  const changeStr = token.priceChange24h >= 0 
    ? `+${token.priceChange24h.toFixed(2)}%`
    : `${token.priceChange24h.toFixed(2)}%`;
  
  let context = `${token.symbol}: $${formatPrice(token.priceUsd)} (${changeIcon}${changeStr} 24h)`;
  context += ` | Liq: $${formatNumber(token.liquidity)} | Vol: $${formatNumber(token.volume24h)}`;
  context += ` | Chain: ${token.chainId} | DEX: ${token.dex}`;
  
  if (risk.riskLevel === 'high' || risk.riskLevel === 'extreme') {
    context += ` | ⚠️ ${risk.riskLevel.toUpperCase()} RISK`;
  }
  
  return context;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatPrice(price: number): string {
  if (price === 0) return '0';
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  if (price >= 0.00000001) return price.toFixed(10);
  return price.toExponential(4);
}

function formatNumber(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const dexscreener = {
  search: searchToken,
  getByAddress: getTokenByAddress,
  getPairs: getTokenPairs,
  getPair: getPairByAddress,
  getChainTop: getChainTopTokens,
  getNew: getNewPairs,
  analyzeRisk: analyzeTokenRisk,
  formatForAI: formatTokenForAI,
};

export default dexscreener;

