/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎰 PUMP.FUN API SERVICE - Divine Perfection                               ║
 * ║                                                                               ║
 * ║   Integration with pump.fun's API for Solana meme coin data.                 ║
 * ║   Fetches bonding curve progress, creator info, replies, and more.           ║
 * ║                                                                               ║
 * ║   CAPABILITIES:                                                               ║
 * ║   • Token metadata (name, symbol, description, image)                        ║
 * ║   • Bonding curve progress (% to graduation)                                 ║
 * ║   • Creator wallet and activity                                               ║
 * ║   • Community engagement (replies count)                                      ║
 * ║   • Market data (price, market cap, volume)                                  ║
 * ║   • King of the Hill status                                                   ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Pump.fun API endpoints
  BASE_URL: 'https://frontend-api.pump.fun',
  CLIENT_URL: 'https://client-api-2-74b1891ee9f9.herokuapp.com',
  
  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MIN_REQUEST_INTERVAL: 1000, // 1 second between requests
  },
  
  // Timeouts
  TIMEOUT: 10000,
  
  // Cache TTL (pump.fun data changes rapidly)
  CACHE_TTL: 15000, // 15 seconds
  
  // Bonding curve constants
  BONDING_CURVE: {
    GRADUATION_THRESHOLD: 85000000000, // ~$85K to graduate
    INITIAL_VIRTUAL_SOL: 30,
    INITIAL_VIRTUAL_TOKENS: 1073000000,
  },
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw pump.fun token response
 */
export interface PumpFunRawToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  video_uri?: string;
  metadata_uri: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool?: string;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  show_name: boolean;
  king_of_the_hill_timestamp?: number;
  market_cap: number;
  reply_count: number;
  last_reply?: number;
  nsfw: boolean;
  market_id?: string;
  inverted?: boolean;
  usd_market_cap: number;
}

/**
 * Processed pump.fun token data
 */
export interface PumpFunToken {
  // Identity
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  
  // Socials
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  hasSocials: boolean;
  
  // Creator
  creator: string;
  createdAt: Date;
  ageMinutes: number;
  ageHours: number;
  
  // Bonding curve
  bondingCurveAddress: string;
  bondingCurveProgress: number;  // 0-100%
  isGraduated: boolean;          // Migrated to Raydium
  raydiumPool: string | null;
  
  // Market data
  priceUsd: number;
  marketCapUsd: number;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  totalSupply: number;
  
  // Community
  replyCount: number;
  lastReplyAt: Date | null;
  isKingOfTheHill: boolean;
  kingOfTheHillAt: Date | null;
  
  // Flags
  isNsfw: boolean;
  showName: boolean;
  
  // Analysis helpers
  liquidityEstimateUsd: number;
  priceImpact10kUsd: number;  // Estimated slippage for $10K trade
}

/**
 * Pump.fun trade data
 */
export interface PumpFunTrade {
  signature: string;
  mint: string;
  solAmount: number;
  tokenAmount: number;
  isBuy: boolean;
  user: string;
  timestamp: number;
  txType: 'buy' | 'sell' | 'create';
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
}

/**
 * Analysis result for pump.fun token
 */
export interface PumpFunAnalysis {
  token: PumpFunToken | null;
  trades: PumpFunTrade[];
  
  // Derived metrics
  buyCount: number;
  sellCount: number;
  buyVolume: number;
  sellVolume: number;
  buySellRatio: number;
  uniqueTraders: number;
  
  // Risk indicators
  isCreatorSelling: boolean;
  creatorSellPercent: number;
  largestSellPercent: number;
  
  // Momentum indicators
  velocityScore: number;      // How fast is it moving
  engagementScore: number;    // Community activity
  
  // Data quality
  dataSource: 'pump_fun_api';
  fetchedAt: Date;
  isStale: boolean;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class PumpFunRateLimiter {
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
        logger.debug('🎰 Pump.fun rate limit reached, waiting', { waitTime });
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

const rateLimiter = new PumpFunRateLimiter();

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class PumpFunCache {
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

const cache = new PumpFunCache();

// ============================================================================
// API METHODS
// ============================================================================

/**
 * 🎯 Get token data from pump.fun
 */
export async function getPumpFunToken(mint: string): Promise<PumpFunToken | null> {
  const cacheKey = `token:${mint}`;
  
  // Check cache
  const cached = cache.get<PumpFunToken>(cacheKey);
  if (cached) {
    logger.debug('🎰 Pump.fun cache hit', { mint: mint.slice(0, 8) });
    return cached;
  }
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get<PumpFunRawToken>(
      `${CONFIG.BASE_URL}/coins/${mint}`,
      {
        timeout: CONFIG.TIMEOUT,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinet-Platform/1.0',
        },
      }
    );
    
    if (!response.data || !response.data.mint) {
      logger.debug('🎰 Token not found on pump.fun', { mint: mint.slice(0, 8) });
      return null;
    }
    
    const token = processRawToken(response.data);
    cache.set(cacheKey, token);
    
    logger.debug('🎰 Pump.fun token fetched', {
      symbol: token.symbol,
      bondingProgress: token.bondingCurveProgress.toFixed(1) + '%',
      marketCap: '$' + formatNumber(token.marketCapUsd),
    });
    
    return token;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        logger.debug('🎰 Token not found on pump.fun', { mint: mint.slice(0, 8) });
        return null;
      }
    }
    logger.error('🎰 Pump.fun API error', {
      mint: mint.slice(0, 8),
      error: error.message,
    });
    return null;
  }
}

/**
 * 🔥 Get recent trades for a token
 */
export async function getPumpFunTrades(
  mint: string, 
  limit: number = 50
): Promise<PumpFunTrade[]> {
  const cacheKey = `trades:${mint}:${limit}`;
  
  const cached = cache.get<PumpFunTrade[]>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.CLIENT_URL}/trades/latest/${mint}`,
      {
        params: { limit, minimumSize: 0 },
        timeout: CONFIG.TIMEOUT,
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    const trades: PumpFunTrade[] = (response.data || []).map((t: any) => ({
      signature: t.signature,
      mint: t.mint,
      solAmount: t.sol_amount / 1e9,  // Convert lamports to SOL
      tokenAmount: t.token_amount,
      isBuy: t.is_buy,
      user: t.user,
      timestamp: t.timestamp,
      txType: t.tx_type || (t.is_buy ? 'buy' : 'sell'),
      bondingCurveKey: t.bonding_curve_key,
      vTokensInBondingCurve: t.virtual_token_reserves,
      vSolInBondingCurve: t.virtual_sol_reserves,
      marketCapSol: t.market_cap_sol,
    }));
    
    cache.set(cacheKey, trades);
    
    logger.debug('🎰 Pump.fun trades fetched', {
      mint: mint.slice(0, 8),
      count: trades.length,
    });
    
    return trades;
  } catch (error: any) {
    logger.error('🎰 Failed to fetch pump.fun trades', {
      mint: mint.slice(0, 8),
      error: error.message,
    });
    return [];
  }
}

/**
 * 🏆 Get King of the Hill tokens (trending)
 */
export async function getPumpFunKingOfTheHill(): Promise<PumpFunToken[]> {
  const cacheKey = 'koth';
  
  const cached = cache.get<PumpFunToken[]>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.BASE_URL}/coins/king-of-the-hill`,
      {
        params: { includeNsfw: false },
        timeout: CONFIG.TIMEOUT,
      }
    );
    
    const tokens = (response.data || []).map(processRawToken);
    cache.set(cacheKey, tokens);
    
    return tokens;
  } catch (error: any) {
    logger.error('🎰 Failed to fetch KOTH', { error: error.message });
    return [];
  }
}

/**
 * 📊 Get comprehensive analysis for a pump.fun token
 */
export async function analyzePumpFunToken(mint: string): Promise<PumpFunAnalysis> {
  const startTime = Date.now();
  
  // Fetch token and trades in parallel
  const [token, trades] = await Promise.all([
    getPumpFunToken(mint),
    getPumpFunTrades(mint, 100),
  ]);
  
  // Calculate trade metrics
  let buyCount = 0;
  let sellCount = 0;
  let buyVolume = 0;
  let sellVolume = 0;
  const traders = new Set<string>();
  let isCreatorSelling = false;
  let creatorSellPercent = 0;
  let largestSellPercent = 0;
  
  const totalSupply = token?.totalSupply || 1000000000;
  
  for (const trade of trades) {
    traders.add(trade.user);
    
    if (trade.isBuy) {
      buyCount++;
      buyVolume += trade.solAmount;
    } else {
      sellCount++;
      sellVolume += trade.solAmount;
      
      // Check if creator is selling
      if (token && trade.user === token.creator) {
        isCreatorSelling = true;
        creatorSellPercent += (trade.tokenAmount / totalSupply) * 100;
      }
      
      // Track largest sell
      const sellPercent = (trade.tokenAmount / totalSupply) * 100;
      if (sellPercent > largestSellPercent) {
        largestSellPercent = sellPercent;
      }
    }
  }
  
  // Calculate velocity (trades in last 5 minutes)
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const recentTrades = trades.filter(t => t.timestamp * 1000 > fiveMinAgo);
  const velocityScore = Math.min(100, recentTrades.length * 5);
  
  // Calculate engagement score
  let engagementScore = 0;
  if (token) {
    engagementScore = Math.min(100, 
      (token.replyCount * 2) + 
      (traders.size * 3) + 
      (token.isKingOfTheHill ? 30 : 0)
    );
  }
  
  return {
    token,
    trades,
    buyCount,
    sellCount,
    buyVolume,
    sellVolume,
    buySellRatio: sellCount > 0 ? buyCount / sellCount : buyCount,
    uniqueTraders: traders.size,
    isCreatorSelling,
    creatorSellPercent,
    largestSellPercent,
    velocityScore,
    engagementScore,
    dataSource: 'pump_fun_api',
    fetchedAt: new Date(),
    isStale: Date.now() - startTime > 5000,
  };
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

/**
 * Process raw pump.fun token data into our format
 */
function processRawToken(raw: PumpFunRawToken): PumpFunToken {
  const now = Date.now();
  const createdAt = new Date(raw.created_timestamp);
  const ageMs = now - createdAt.getTime();
  const ageMinutes = ageMs / (1000 * 60);
  const ageHours = ageMinutes / 60;
  
  // Calculate bonding curve progress
  const virtualSol = raw.virtual_sol_reserves / 1e9;
  const bondingCurveProgress = calculateBondingCurveProgress(raw);
  
  // Estimate liquidity (simplified - actual is more complex)
  const liquidityEstimateUsd = raw.usd_market_cap * 0.1; // Rough estimate
  
  // Estimate price impact for $10K trade
  const priceImpact10kUsd = estimatePriceImpact(raw, 10000);
  
  // Calculate USD price from market cap and supply
  const priceUsd = raw.total_supply > 0 
    ? raw.usd_market_cap / raw.total_supply 
    : 0;
  
  return {
    mint: raw.mint,
    name: raw.name,
    symbol: raw.symbol,
    description: raw.description || '',
    imageUrl: raw.image_uri || '',
    
    twitter: raw.twitter || null,
    telegram: raw.telegram || null,
    website: raw.website || null,
    hasSocials: !!(raw.twitter || raw.telegram || raw.website),
    
    creator: raw.creator,
    createdAt,
    ageMinutes,
    ageHours,
    
    bondingCurveAddress: raw.bonding_curve,
    bondingCurveProgress,
    isGraduated: raw.complete,
    raydiumPool: raw.raydium_pool || null,
    
    priceUsd,
    marketCapUsd: raw.usd_market_cap,
    virtualSolReserves: virtualSol,
    virtualTokenReserves: raw.virtual_token_reserves,
    totalSupply: raw.total_supply,
    
    replyCount: raw.reply_count || 0,
    lastReplyAt: raw.last_reply ? new Date(raw.last_reply) : null,
    isKingOfTheHill: !!raw.king_of_the_hill_timestamp,
    kingOfTheHillAt: raw.king_of_the_hill_timestamp 
      ? new Date(raw.king_of_the_hill_timestamp) 
      : null,
    
    isNsfw: raw.nsfw,
    showName: raw.show_name,
    
    liquidityEstimateUsd,
    priceImpact10kUsd,
  };
}

/**
 * Calculate bonding curve progress (0-100%)
 */
function calculateBondingCurveProgress(raw: PumpFunRawToken): number {
  if (raw.complete) return 100;
  
  // Bonding curve progress based on virtual SOL reserves
  // Graduation typically happens around 85 SOL
  const virtualSol = raw.virtual_sol_reserves / 1e9;
  const initialSol = CONFIG.BONDING_CURVE.INITIAL_VIRTUAL_SOL;
  const targetSol = 85; // Graduation threshold
  
  const solAdded = virtualSol - initialSol;
  const targetSolToAdd = targetSol - initialSol;
  
  if (targetSolToAdd <= 0) return 100;
  
  const progress = (solAdded / targetSolToAdd) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Estimate price impact for a given USD trade size
 */
function estimatePriceImpact(raw: PumpFunRawToken, usdAmount: number): number {
  // Simplified constant product AMM price impact estimation
  // Real impact depends on actual bonding curve formula
  const k = raw.virtual_sol_reserves * raw.virtual_token_reserves;
  const currentSol = raw.virtual_sol_reserves;
  
  // Assume ~$100 per SOL for estimation
  const solAmount = (usdAmount / 100) * 1e9; // Convert to lamports
  const newSol = currentSol + solAmount;
  const newTokens = k / newSol;
  const tokensOut = raw.virtual_token_reserves - newTokens;
  
  // Calculate effective price vs spot price
  const spotPrice = currentSol / raw.virtual_token_reserves;
  const effectivePrice = solAmount / tokensOut;
  
  const priceImpact = ((effectivePrice - spotPrice) / spotPrice) * 100;
  return Math.abs(priceImpact);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an address looks like a pump.fun token
 */
export function isPumpFunAddress(address: string): boolean {
  // Pump.fun addresses end with "pump"
  return address.toLowerCase().endsWith('pump');
}

/**
 * Format number for display
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

/**
 * Build AI context from pump.fun analysis
 */
export function buildPumpFunContext(analysis: PumpFunAnalysis): string {
  if (!analysis.token) {
    return 'Token not found on pump.fun.';
  }
  
  const t = analysis.token;
  
  return `
=== PUMP.FUN DATA: ${t.symbol} ===

📊 TOKEN INFO:
• Name: ${t.name}
• Symbol: ${t.symbol}
• Mint: ${t.mint}
• Created: ${t.ageHours < 1 ? `${Math.round(t.ageMinutes)} minutes ago` : `${t.ageHours.toFixed(1)} hours ago`}
• Creator: ${t.creator.slice(0, 8)}...

🎰 BONDING CURVE:
• Progress: ${t.bondingCurveProgress.toFixed(1)}%
• Status: ${t.isGraduated ? '✅ GRADUATED (on Raydium)' : '🔄 Still bonding'}
${t.raydiumPool ? `• Raydium Pool: ${t.raydiumPool}` : ''}

💰 MARKET DATA:
• Price: $${t.priceUsd < 0.00001 ? t.priceUsd.toExponential(4) : t.priceUsd.toFixed(8)}
• Market Cap: $${formatNumber(t.marketCapUsd)}
• Est. Liquidity: $${formatNumber(t.liquidityEstimateUsd)}
• Price Impact ($10K): ~${t.priceImpact10kUsd.toFixed(1)}%

📈 TRADING ACTIVITY (Recent):
• Buys: ${analysis.buyCount} (${analysis.buyVolume.toFixed(2)} SOL)
• Sells: ${analysis.sellCount} (${analysis.sellVolume.toFixed(2)} SOL)
• Buy/Sell Ratio: ${analysis.buySellRatio.toFixed(2)}
• Unique Traders: ${analysis.uniqueTraders}

👤 CREATOR STATUS:
• Creator Selling: ${analysis.isCreatorSelling ? '⚠️ YES' : '✅ NO'}
${analysis.isCreatorSelling ? `• Creator Sold: ${analysis.creatorSellPercent.toFixed(2)}% of supply` : ''}
• Largest Single Sell: ${analysis.largestSellPercent.toFixed(2)}%

💬 COMMUNITY:
• Replies: ${t.replyCount}
• King of the Hill: ${t.isKingOfTheHill ? '👑 YES' : 'No'}
• Velocity Score: ${analysis.velocityScore}/100
• Engagement Score: ${analysis.engagementScore}/100

🔗 SOCIALS:
${t.twitter ? `• Twitter: ${t.twitter}` : '• Twitter: None'}
${t.telegram ? `• Telegram: ${t.telegram}` : '• Telegram: None'}
${t.website ? `• Website: ${t.website}` : '• Website: None'}
`.trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const pumpFunApi = {
  getToken: getPumpFunToken,
  getTrades: getPumpFunTrades,
  analyze: analyzePumpFunToken,
  getKingOfTheHill: getPumpFunKingOfTheHill,
  isPumpFunAddress,
  buildContext: buildPumpFunContext,
};

export default pumpFunApi;
