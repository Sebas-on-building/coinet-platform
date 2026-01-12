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
// 🆕 NEW COIN / MEME COIN SPECIFIC FUNCTIONS
// ============================================================================

/**
 * Enhanced token data for meme coin analysis
 */
export interface EnhancedDexToken extends DexToken {
  // Additional metrics for new coins
  ageMinutes: number;
  ageHours: number;
  isNewCoin: boolean;           // < 24 hours old
  isVeryNew: boolean;           // < 1 hour old
  
  // Trading activity analysis
  buyPressure: number;          // 0-1, ratio of buys
  volumeToLiquidity: number;    // Velocity indicator
  txnsPerHour: number;          // Activity rate
  
  // Risk indicators specific to new coins
  isLowLiquidity: boolean;      // < $10K
  isMicroCap: boolean;          // < $100K mcap
  hasHighSellPressure: boolean; // > 60% sells
  
  // Price action
  priceChange5mPercent: number;
  priceChange1hPercent: number;
  
  // Data quality
  hasVerifiedInfo: boolean;
  pairCount: number;
}

/**
 * 🆕 Get enhanced token data optimized for new/meme coins
 */
export async function getEnhancedTokenData(address: string): Promise<EnhancedDexToken | null> {
  const cacheKey = `enhanced:${address.toLowerCase()}`;
  
  const cached = cache.get<EnhancedDexToken>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    // Get all pairs for the token
    const response = await axios.get(
      `${CONFIG.BASE_URL}/latest/dex/tokens/${address}`,
      { timeout: CONFIG.TIMEOUT }
    );
    
    const pairs: DexPair[] = response.data?.pairs || [];
    
    if (pairs.length === 0) {
      // Try search as fallback
      const searchResult = await searchToken(address);
      if (searchResult.tokens.length === 0) return null;
      
      const token = searchResult.tokens[0];
      return convertToEnhancedToken(token, 1);
    }
    
    // Find the best pair (highest liquidity with USD quote)
    const usdPairs = pairs.filter(p => 
      CONFIG.USD_QUOTE_TOKENS.includes(p.quoteToken.symbol.toUpperCase())
    );
    const bestPairs = usdPairs.length > 0 ? usdPairs : pairs;
    const bestPair = bestPairs.sort((a, b) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];
    
    if (!bestPair) return null;
    
    const baseToken = pairToToken(bestPair);
    const enhanced = convertToEnhancedToken(baseToken, pairs.length);
    
    cache.set(cacheKey, enhanced);
    
    logger.debug('🦎 Enhanced token data fetched', {
      symbol: enhanced.symbol,
      age: enhanced.ageHours.toFixed(1) + 'h',
      isNew: enhanced.isNewCoin,
      buyPressure: (enhanced.buyPressure * 100).toFixed(0) + '%',
    });
    
    return enhanced;
  } catch (error: any) {
    logger.error('🦎 Enhanced token fetch failed', {
      address: address.slice(0, 8),
      error: error.message,
    });
    return null;
  }
}

/**
 * Convert DexToken to EnhancedDexToken with additional metrics
 */
function convertToEnhancedToken(token: DexToken, pairCount: number): EnhancedDexToken {
  const now = Date.now();
  const createdAt = token.pairCreatedAt?.getTime() || now;
  const ageMs = now - createdAt;
  const ageMinutes = ageMs / (1000 * 60);
  const ageHours = ageMinutes / 60;
  
  const totalTxns = token.txns24h.buys + token.txns24h.sells;
  const buyPressure = totalTxns > 0 ? token.txns24h.buys / totalTxns : 0.5;
  const volumeToLiquidity = token.liquidity > 0 ? token.volume24h / token.liquidity : 0;
  const txnsPerHour = ageHours > 0 ? totalTxns / Math.min(24, ageHours) : totalTxns;
  
  return {
    ...token,
    ageMinutes,
    ageHours,
    isNewCoin: ageHours < 24,
    isVeryNew: ageHours < 1,
    buyPressure,
    volumeToLiquidity,
    txnsPerHour,
    isLowLiquidity: token.liquidity < 10000,
    isMicroCap: (token.marketCap || token.fdv) < 100000,
    hasHighSellPressure: buyPressure < 0.4,
    priceChange5mPercent: token.priceChange5m || 0,
    priceChange1hPercent: token.priceChange1h || 0,
    hasVerifiedInfo: token.isVerified,
    pairCount,
  };
}

/**
 * 🔥 Get trending new tokens on a specific chain
 */
export async function getTrendingNewTokens(
  chainId: ChainId,
  maxAgeHours: number = 24,
  minLiquidity: number = 5000,
  limit: number = 20
): Promise<EnhancedDexToken[]> {
  const cacheKey = `trending:${chainId}:${maxAgeHours}:${minLiquidity}`;
  
  const cached = cache.get<EnhancedDexToken[]>(cacheKey);
  if (cached) return cached;
  
  try {
    // DexScreener doesn't have a direct "new tokens" endpoint
    // We search for popular base tokens and filter
    const searchQueries = chainId === 'solana' 
      ? ['sol', 'usdc', 'pump'] 
      : ['eth', 'usdc', 'weth'];
    
    const allTokens: DexToken[] = [];
    
    for (const query of searchQueries) {
      const result = await searchToken(query);
      const chainTokens = result.tokens.filter(t => 
        t.chainId === chainId &&
        t.liquidity >= minLiquidity
      );
      allTokens.push(...chainTokens);
    }
    
    // Deduplicate
    const uniqueTokens = dedupeTokens(allTokens);
    
    // Convert to enhanced and filter by age
    const enhanced: EnhancedDexToken[] = uniqueTokens
      .map(t => convertToEnhancedToken(t, 1))
      .filter(t => t.ageHours <= maxAgeHours)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, limit);
    
    cache.set(cacheKey, enhanced);
    
    return enhanced;
  } catch (error: any) {
    logger.error('🦎 Failed to get trending new tokens', { error: error.message });
    return [];
  }
}

/**
 * 📊 Analyze token specifically for meme coin risks
 */
export interface MemeCoinRiskAnalysis {
  overallRisk: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number;  // 0-100
  
  // Individual risk factors
  liquidityRisk: 'low' | 'medium' | 'high';
  ageRisk: 'low' | 'medium' | 'high';
  volumeRisk: 'low' | 'medium' | 'high';
  sellPressureRisk: 'low' | 'medium' | 'high';
  
  // Warnings
  warnings: string[];
  positives: string[];
  
  // Recommendations
  maxPositionSizeUsd: number;
  expectedSlippagePercent: number;
}

export function analyzeMemeCoinRisk(token: EnhancedDexToken): MemeCoinRiskAnalysis {
  let riskScore = 0;
  const warnings: string[] = [];
  const positives: string[] = [];
  
  // Age risk
  let ageRisk: 'low' | 'medium' | 'high' = 'low';
  if (token.isVeryNew) {
    ageRisk = 'high';
    riskScore += 25;
    warnings.push(`Extremely new (${Math.round(token.ageMinutes)} minutes old)`);
  } else if (token.isNewCoin) {
    ageRisk = 'medium';
    riskScore += 10;
    warnings.push(`New token (${token.ageHours.toFixed(1)} hours old)`);
  } else if (token.ageHours > 168) { // > 7 days
    positives.push(`Established (${Math.floor(token.ageHours / 24)} days old)`);
  }
  
  // Liquidity risk
  let liquidityRisk: 'low' | 'medium' | 'high' = 'low';
  if (token.liquidity < 5000) {
    liquidityRisk = 'high';
    riskScore += 30;
    warnings.push(`Dangerously low liquidity ($${formatNumber(token.liquidity)})`);
  } else if (token.liquidity < 20000) {
    liquidityRisk = 'medium';
    riskScore += 15;
    warnings.push(`Low liquidity ($${formatNumber(token.liquidity)})`);
  } else if (token.liquidity > 100000) {
    positives.push(`Good liquidity ($${formatNumber(token.liquidity)})`);
  }
  
  // Sell pressure risk
  let sellPressureRisk: 'low' | 'medium' | 'high' = 'low';
  if (token.hasHighSellPressure) {
    sellPressureRisk = 'high';
    riskScore += 20;
    warnings.push(`Heavy sell pressure (${((1 - token.buyPressure) * 100).toFixed(0)}% sells)`);
  } else if (token.buyPressure > 0.65) {
    positives.push(`Strong buy pressure (${(token.buyPressure * 100).toFixed(0)}% buys)`);
  }
  
  // Volume/liquidity ratio risk
  let volumeRisk: 'low' | 'medium' | 'high' = 'low';
  if (token.volumeToLiquidity > 20) {
    volumeRisk = 'high';
    riskScore += 15;
    warnings.push(`Suspicious volume (${token.volumeToLiquidity.toFixed(1)}x liquidity)`);
  } else if (token.volumeToLiquidity > 10) {
    volumeRisk = 'medium';
    riskScore += 8;
    warnings.push(`High volume relative to liquidity`);
  } else if (token.volumeToLiquidity > 1 && token.volumeToLiquidity < 5) {
    positives.push(`Healthy volume/liquidity ratio`);
  }
  
  // Verification
  if (!token.hasVerifiedInfo) {
    riskScore += 10;
    warnings.push(`No verified website or socials`);
  } else {
    positives.push(`Verified project info`);
  }
  
  // Multiple pairs is usually good
  if (token.pairCount > 1) {
    positives.push(`Multiple trading pairs (${token.pairCount})`);
  }
  
  // Determine overall risk
  let overallRisk: 'low' | 'medium' | 'high' | 'extreme';
  if (riskScore >= 70) overallRisk = 'extreme';
  else if (riskScore >= 50) overallRisk = 'high';
  else if (riskScore >= 25) overallRisk = 'medium';
  else overallRisk = 'low';
  
  // Calculate max position size based on liquidity
  // Rule: don't be more than 2% of liquidity to avoid massive slippage
  const maxPositionSizeUsd = Math.min(
    token.liquidity * 0.02,
    10000 // Cap at $10K for safety
  );
  
  // Estimate slippage for a $1000 trade
  const expectedSlippagePercent = token.liquidity > 0
    ? Math.min(50, (1000 / token.liquidity) * 100 * 2) // Rough estimate
    : 50;
  
  return {
    overallRisk,
    riskScore: Math.min(100, riskScore),
    liquidityRisk,
    ageRisk,
    volumeRisk,
    sellPressureRisk,
    warnings,
    positives,
    maxPositionSizeUsd,
    expectedSlippagePercent,
  };
}

/**
 * Build comprehensive AI context for a meme coin
 */
export function buildMemeCoinContext(token: EnhancedDexToken): string {
  const risk = analyzeMemeCoinRisk(token);
  const priceStr = token.priceUsd < 0.00001 
    ? token.priceUsd.toExponential(4) 
    : token.priceUsd.toFixed(8);
  
  return `
=== DEXSCREENER DATA: ${token.symbol} ===

📊 TOKEN INFO:
• Symbol: ${token.symbol}
• Name: ${token.name}
• Address: ${token.address}
• Chain: ${token.chainId}
• DEX: ${token.dex}
• Trading Pairs: ${token.pairCount}

💰 PRICE & MARKET:
• Price: $${priceStr}
• Market Cap: $${formatNumber(token.marketCap || token.fdv)}
• FDV: $${formatNumber(token.fdv)}
• Liquidity: $${formatNumber(token.liquidity)}
• 24h Volume: $${formatNumber(token.volume24h)}

📈 PRICE CHANGES:
• 5m: ${token.priceChange5mPercent >= 0 ? '+' : ''}${token.priceChange5mPercent.toFixed(1)}%
• 1h: ${token.priceChange1hPercent >= 0 ? '+' : ''}${token.priceChange1hPercent.toFixed(1)}%
• 24h: ${token.priceChange24h >= 0 ? '+' : ''}${token.priceChange24h.toFixed(1)}%

📊 TRADING ACTIVITY:
• Buys (24h): ${token.txns24h.buys}
• Sells (24h): ${token.txns24h.sells}
• Buy Pressure: ${(token.buyPressure * 100).toFixed(0)}%
• Txns/Hour: ${token.txnsPerHour.toFixed(1)}
• Volume/Liquidity: ${token.volumeToLiquidity.toFixed(2)}x

⏰ AGE & STATUS:
• Age: ${token.ageHours < 1 ? `${Math.round(token.ageMinutes)} minutes` : `${token.ageHours.toFixed(1)} hours`}
• Is New Coin: ${token.isNewCoin ? 'YES' : 'NO'}
• Is Very New (<1h): ${token.isVeryNew ? '⚠️ YES' : 'NO'}
• Verified Info: ${token.hasVerifiedInfo ? 'YES' : 'NO'}

🎯 RISK ANALYSIS:
• Overall Risk: ${risk.overallRisk.toUpperCase()} (${risk.riskScore}/100)
• Liquidity Risk: ${risk.liquidityRisk}
• Age Risk: ${risk.ageRisk}
• Sell Pressure Risk: ${risk.sellPressureRisk}
• Volume Risk: ${risk.volumeRisk}

${risk.warnings.length > 0 ? `⚠️ WARNINGS:\n${risk.warnings.map(w => `• ${w}`).join('\n')}` : ''}

${risk.positives.length > 0 ? `✅ POSITIVES:\n${risk.positives.map(p => `• ${p}`).join('\n')}` : ''}

💡 TRADING GUIDANCE:
• Max Safe Position: $${formatNumber(risk.maxPositionSizeUsd)}
• Expected Slippage: ~${risk.expectedSlippagePercent.toFixed(1)}%

🔗 DEX Link: ${token.pairUrl}
`.trim();
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
  // 🆕 New coin specific
  getEnhanced: getEnhancedTokenData,
  getTrendingNew: getTrendingNewTokens,
  analyzeMemeCoinRisk,
  buildMemeCoinContext,
};

export default dexscreener;

