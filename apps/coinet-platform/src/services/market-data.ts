/**
 * 📊 Dynamic Price Fetcher - Divine Perfection v3
 * 
 * The most comprehensive cryptocurrency price fetching system.
 * Fetches real-time data for ANY coin with intelligent fallback chain.
 * 
 * FALLBACK PRIORITY:
 * 0. Redis Cache (populated by ai-data-feeder) ← NEW! Fastest!
 * 1. market-prices service (internal service)
 * 2. CoinGecko API (comprehensive, rate-limited)
 * 3. CoinMarketCap API (backup, requires key)
 * 4. DexScreener API (DEX-only tokens, new listings)
 * 
 * FEATURES:
 * - Redis integration with ai-data-feeder
 * - Dynamic symbol detection integration
 * - Per-provider rate limiting
 * - Intelligent caching (local + Redis)
 * - Graceful degradation
 * - Parallel fetching where possible
 * - Comprehensive error handling
 * 
 * @module market-data
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { symbolDetector, DetectedCoin } from './symbol-detector';
import { searchToken, DexToken, analyzeTokenRisk } from './dexscreener';
import { 
  isRedisAvailable, 
  getCachedPrice, 
  getCachedPrices, 
  setCachedPrice,
  CachedPriceData 
} from './redis-client';
import { 
  getCoinIdValidator, 
  validateCoinIds as validateCoinIdsService,
  CoinIdValidationResult 
} from './coin-id-validator';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Service URLs
  MARKET_PRICES_URL: process.env.MARKET_PRICES_URL || 'https://market-prices-production.up.railway.app',
  COINGECKO_BASE_URL: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  COINGECKO_PRO_URL: 'https://pro-api.coingecko.com/api/v3',
  CMC_BASE_URL: 'https://pro-api.coinmarketcap.com/v1',
  DEXSCREENER_BASE_URL: 'https://api.dexscreener.com/latest/dex',

  // API Keys (optional - enables pro features)
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || '',
  CMC_API_KEY: process.env.CMC_API_KEY || '',

  // Rate Limits (requests per minute)
  RATE_LIMITS: {
    MARKET_PRICES: 60,      // Internal service, generous
    COINGECKO_FREE: 10,     // Conservative for free tier
    COINGECKO_PRO: 500,     // Pro tier
    CMC: 30,                // CMC basic tier
    DEXSCREENER: 300,       // DexScreener is generous
  },

  // Timeouts (ms)
  TIMEOUTS: {
    MARKET_PRICES: 3000,
    COINGECKO: 8000,
    CMC: 8000,
    DEXSCREENER: 5000,
  },

  // Cache TTL (ms)
  CACHE_TTL: 30000,  // 30 seconds
};

// ============================================================================
// TYPES
// ============================================================================

export interface MarketPrice {
  symbol: string;
  name: string;
  coinGeckoId?: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  high24h?: number;
  low24h?: number;
  ath?: number;
  athDate?: string;
  source: 'market-prices' | 'coingecko' | 'coinmarketcap' | 'dexscreener' | 'cache';
  lastUpdated: string;
  confidence: number;  // 0-1, how reliable is this data
}

export interface MarketSnapshot {
  timestamp: string;
  prices: MarketPrice[];
  requestedSymbols: string[];
  foundSymbols: string[];
  missingSymbols: string[];
  sources: string[];
  fetchTime: number;
}

interface RateLimiter {
  lastCall: number;
  callCount: number;
  windowStart: number;
}

interface CacheEntry {
  data: MarketPrice;
  timestamp: number;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimitManager {
  private limiters: Map<string, RateLimiter> = new Map();

  async waitForSlot(provider: string, maxPerMinute: number): Promise<boolean> {
    const now = Date.now();
    let limiter = this.limiters.get(provider);

    if (!limiter) {
      limiter = { lastCall: 0, callCount: 0, windowStart: now };
      this.limiters.set(provider, limiter);
    }

    // Reset window if minute has passed
    if (now - limiter.windowStart > 60000) {
      limiter.callCount = 0;
      limiter.windowStart = now;
    }

    // Check if we've hit the limit
    if (limiter.callCount >= maxPerMinute) {
      const waitTime = 60000 - (now - limiter.windowStart);
      if (waitTime > 0) {
        logger.debug(`Rate limit reached for ${provider}, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
        return this.waitForSlot(provider, maxPerMinute);
      }
    }

    // Minimum delay between calls
    const minDelay = 60000 / maxPerMinute;
    const timeSinceLastCall = now - limiter.lastCall;
    if (timeSinceLastCall < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastCall));
    }

    limiter.lastCall = Date.now();
    limiter.callCount++;
    return true;
  }

  getStats(provider: string): { callCount: number; remaining: number } {
    const limiter = this.limiters.get(provider);
    if (!limiter) return { callCount: 0, remaining: 60 };
    
    const limit = (CONFIG.RATE_LIMITS as any)[provider.toUpperCase()] || 60;
    return {
      callCount: limiter.callCount,
      remaining: Math.max(0, limit - limiter.callCount),
    };
  }
}

const rateLimiter = new RateLimitManager();

// ============================================================================
// PRICE CACHE
// ============================================================================

class PriceCache {
  private cache: Map<string, CacheEntry> = new Map();

  set(symbol: string, data: MarketPrice): void {
    this.cache.set(symbol.toLowerCase(), {
      data: { ...data, source: 'cache' },
      timestamp: Date.now(),
    });
  }

  get(symbol: string): MarketPrice | null {
    const entry = this.cache.get(symbol.toLowerCase());
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL) {
      this.cache.delete(symbol.toLowerCase());
      return null;
    }

    return entry.data;
  }

  getMultiple(symbols: string[]): { found: MarketPrice[]; missing: string[] } {
    const found: MarketPrice[] = [];
    const missing: string[] = [];

    for (const symbol of symbols) {
      const cached = this.get(symbol);
      if (cached) {
        found.push(cached);
      } else {
        missing.push(symbol);
      }
    }

    return { found, missing };
  }

  clear(): void {
    this.cache.clear();
  }
}

const priceCache = new PriceCache();

// ============================================================================
// DATA SOURCE FETCHERS
// ============================================================================

/**
 * Fetch from market-prices service (internal, fastest)
 */
async function fetchFromMarketPrices(symbols: string[]): Promise<MarketPrice[]> {
  if (symbols.length === 0) return [];

  try {
    await rateLimiter.waitForSlot('MARKET_PRICES', CONFIG.RATE_LIMITS.MARKET_PRICES);

    const response = await axios.get(`${CONFIG.MARKET_PRICES_URL}/api/prices`, {
      params: { symbols: symbols.join(',') },
      timeout: CONFIG.TIMEOUTS.MARKET_PRICES,
    });

    if (!response.data?.data) return [];

    const rawData = Array.isArray(response.data.data) 
      ? response.data.data 
      : Object.values(response.data.data);

    const prices: MarketPrice[] = [];
    
    for (const data of rawData as any[]) {
      const price: MarketPrice = {
        symbol: (data.symbol || data.coinId || 'UNKNOWN').toUpperCase(),
        name: data.name || data.symbol || 'Unknown',
        coinGeckoId: data.coinId?.toLowerCase(),
        price: data.price || 0,
        change24h: data.priceChange24h || 0,
        changePercent24h: data.priceChangePercentage24h || 0,
        volume24h: data.volume24h || 0,
        marketCap: data.marketCap || 0,
        high24h: data.high24h,
        low24h: data.low24h,
        source: 'market-prices',
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        confidence: 0.95,
      };
      prices.push(price);
      priceCache.set(price.symbol, price);
    }

    logger.debug('📊 market-prices fetch', { requested: symbols.length, found: prices.length });
    return prices;
  } catch (error: any) {
    logger.debug('market-prices fetch failed', { error: error.message });
    return [];
  }
}

/**
 * Fetch from CoinGecko API
 * 
 * ✅ ENHANCED: Pre-validates coin IDs before API call to prevent
 * misleading empty object responses from CoinGecko.
 */
async function fetchFromCoinGecko(coinIds: string[]): Promise<MarketPrice[]> {
  if (coinIds.length === 0) return [];

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 0: PRE-VALIDATE COIN IDs (Prevents misleading empty responses)
    // ═══════════════════════════════════════════════════════════════════════
    const validation = await validateCoinIdsService(coinIds);
    
    if (validation.invalid.length > 0) {
      logger.warn('🚫 Invalid coin IDs filtered before CoinGecko API call', {
        invalidIds: validation.invalid,
        validIds: validation.valid,
        originalCount: coinIds.length,
        validCount: validation.valid.length,
      });
    }

    // Use only validated coin IDs
    const validCoinIds = validation.valid;
    
    if (validCoinIds.length === 0) {
      logger.debug('No valid coin IDs after pre-validation, skipping CoinGecko call');
      return [];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: RATE LIMITING
    // ═══════════════════════════════════════════════════════════════════════
    const isPro = !!CONFIG.COINGECKO_API_KEY;
    const rateLimit = isPro ? CONFIG.RATE_LIMITS.COINGECKO_PRO : CONFIG.RATE_LIMITS.COINGECKO_FREE;
    
    await rateLimiter.waitForSlot('COINGECKO', rateLimit);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: API CALL (with validated IDs only)
    // ═══════════════════════════════════════════════════════════════════════
    const baseUrl = isPro ? CONFIG.COINGECKO_PRO_URL : CONFIG.COINGECKO_BASE_URL;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    
    if (isPro) {
      headers['x-cg-pro-api-key'] = CONFIG.COINGECKO_API_KEY;
    }

    const response = await axios.get(`${baseUrl}/simple/price`, {
      params: {
        ids: validCoinIds.join(','), // ✅ Only validated IDs
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_24hr_vol: true,
        include_market_cap: true,
        include_last_updated_at: true,
      },
      headers,
      timeout: CONFIG.TIMEOUTS.COINGECKO,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: RESPONSE VALIDATION (Defense in depth)
    // ═══════════════════════════════════════════════════════════════════════
    // ⚠️ Even with pre-validation, still check for empty responses
    // (API issues, temporary delisting, etc.)
    if (!response.data || Object.keys(response.data).length === 0) {
      logger.warn('CoinGecko returned empty response despite valid IDs', { 
        requestedCoinIds: validCoinIds,
        possibleCause: 'API issue, temporary delisting, or network problem'
      });
      return [];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: PROCESS RESPONSE
    // ═══════════════════════════════════════════════════════════════════════
    const prices: MarketPrice[] = [];

    for (const [id, data] of Object.entries(response.data) as [string, any][]) {
      // Validate data structure - CoinGecko might return incomplete data
      if (!data || typeof data !== 'object' || !data.usd) {
        logger.warn('CoinGecko returned incomplete data for coin', { id, data });
        continue;
      }
      
      const coin = symbolDetector.getCoinById(id);
      const price: MarketPrice = {
        symbol: coin?.symbol.toUpperCase() || id.toUpperCase(),
        name: coin?.name || id,
        coinGeckoId: id,
        price: data.usd || 0,
        change24h: (data.usd || 0) * (data.usd_24h_change || 0) / 100,
        changePercent24h: data.usd_24h_change || 0,
        volume24h: data.usd_24h_vol || 0,
        marketCap: data.usd_market_cap || 0,
        source: 'coingecko',
        lastUpdated: data.last_updated_at 
          ? new Date(data.last_updated_at * 1000).toISOString()
          : new Date().toISOString(),
        confidence: 0.9,
      };
      prices.push(price);
      priceCache.set(price.symbol, price);
    }

    logger.debug('📊 CoinGecko fetch complete', { 
      requested: coinIds.length,
      validated: validCoinIds.length, 
      found: prices.length, 
      isPro,
      preValidated: validation.cached,
    });
    
    return prices;
  } catch (error: any) {
    if ((error as AxiosError).response?.status === 429) {
      logger.warn('CoinGecko rate limit hit');
    } else {
      logger.debug('CoinGecko fetch failed', { error: error.message });
    }
    return [];
  }
}

/**
 * Fetch from CoinMarketCap API (requires API key)
 */
async function fetchFromCoinMarketCap(symbols: string[]): Promise<MarketPrice[]> {
  if (!CONFIG.CMC_API_KEY || symbols.length === 0) return [];

  try {
    await rateLimiter.waitForSlot('CMC', CONFIG.RATE_LIMITS.CMC);

    const response = await axios.get(`${CONFIG.CMC_BASE_URL}/cryptocurrency/quotes/latest`, {
      params: { symbol: symbols.join(',') },
      headers: {
        'X-CMC_PRO_API_KEY': CONFIG.CMC_API_KEY,
        'Accept': 'application/json',
      },
      timeout: CONFIG.TIMEOUTS.CMC,
    });

    const prices: MarketPrice[] = [];

    if (response.data?.data) {
      for (const [symbol, data] of Object.entries(response.data.data) as [string, any][]) {
        const quote = data.quote?.USD;
        if (!quote) continue;

        const price: MarketPrice = {
          symbol: symbol.toUpperCase(),
          name: data.name || symbol,
          price: quote.price || 0,
          change24h: (quote.price || 0) * (quote.percent_change_24h || 0) / 100,
          changePercent24h: quote.percent_change_24h || 0,
          volume24h: quote.volume_24h || 0,
          marketCap: quote.market_cap || 0,
          source: 'coinmarketcap',
          lastUpdated: quote.last_updated || new Date().toISOString(),
          confidence: 0.92,
        };
        prices.push(price);
        priceCache.set(price.symbol, price);
      }
    }

    logger.debug('📊 CoinMarketCap fetch', { requested: symbols.length, found: prices.length });
    return prices;
  } catch (error: any) {
    logger.debug('CoinMarketCap fetch failed', { error: error.message });
    return [];
  }
}

/**
 * Fetch from DexScreener API (DEX-only tokens)
 * Uses the comprehensive dexscreener service
 */
async function fetchFromDexScreener(symbol: string): Promise<MarketPrice | null> {
  try {
    // Use the dedicated DexScreener service
    const result = await searchToken(symbol);
    
    if (result.tokens.length === 0) {
      logger.debug('🦎 DexScreener: No tokens found', { symbol });
      return null;
    }
    
    // Get the best match (already ranked by confidence and liquidity)
    const token = result.tokens[0];
    
    // Analyze risk for confidence adjustment
    const risk = analyzeTokenRisk(token);
    let confidence = token.confidence;
    
    // Adjust confidence based on risk
    if (risk.riskLevel === 'extreme') confidence *= 0.6;
    else if (risk.riskLevel === 'high') confidence *= 0.75;
    else if (risk.riskLevel === 'medium') confidence *= 0.9;
    
    const price: MarketPrice = {
      symbol: token.symbol,
      name: token.name,
      coinGeckoId: undefined,
      price: token.priceUsd,
      change24h: token.priceUsd * (token.priceChange24h / 100),
      changePercent24h: token.priceChange24h,
      volume24h: token.volume24h,
      marketCap: token.marketCap || token.fdv,
      source: 'dexscreener',
      lastUpdated: new Date().toISOString(),
      confidence,
    };
    
    priceCache.set(price.symbol, price);
    
    logger.debug('🦎 DexScreener fetch', { 
      symbol, 
      price: price.price, 
      liquidity: token.liquidity,
      risk: risk.riskLevel,
      confidence: price.confidence.toFixed(2)
    });
    
    return price;
  } catch (error: any) {
    logger.debug('🦎 DexScreener fetch failed', { symbol, error: error.message });
    return null;
  }
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

/**
 * Convert Redis cached price to MarketPrice format
 */
function convertRedisPriceToMarketPrice(
  coinId: string, 
  cached: CachedPriceData
): MarketPrice {
  const coin = symbolDetector.getCoinById(coinId);
  return {
    symbol: coin?.symbol.toUpperCase() || coinId.toUpperCase(),
    name: coin?.name || coinId,
    coinGeckoId: coinId,
    price: cached.current,
    change24h: cached.change24h,
    changePercent24h: cached.changePercentage24h,
    volume24h: cached.volume24h,
    marketCap: cached.marketCap,
    high24h: cached.high24h,
    low24h: cached.low24h,
    // ATH data - CRITICAL for accurate AI responses
    ath: cached.ath,
    athDate: cached.athDate,
    source: 'cache', // Mark as from Redis cache
    lastUpdated: new Date().toISOString(),
    confidence: 0.98, // High confidence - from ai-data-feeder
  };
}

/**
 * 🎯 MAIN: Fetch prices with intelligent fallback chain
 * 
 * Priority:
 * 0. Redis Cache (ai-data-feeder) - Fastest!
 * 1. Local cache
 * 2. market-prices service
 * 3. CoinGecko API
 * 4. CoinMarketCap API
 * 5. DexScreener API
 */
async function fetchWithFallback(
  coinIds: string[], 
  symbols: string[]
): Promise<MarketPrice[]> {
  const allPrices: Map<string, MarketPrice> = new Map();
  const pendingCoinIds = new Set(coinIds);
  const pendingSymbols = new Set(symbols.map(s => s.toUpperCase()));

  // Helper to mark found
  const markFound = (prices: MarketPrice[]) => {
    for (const p of prices) {
      allPrices.set(p.symbol.toUpperCase(), p);
      pendingSymbols.delete(p.symbol.toUpperCase());
      if (p.coinGeckoId) pendingCoinIds.delete(p.coinGeckoId);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 0: Check REDIS CACHE first (populated by ai-data-feeder)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isRedisAvailable() && coinIds.length > 0) {
    try {
      const redisCached = await getCachedPrices(coinIds);
      if (redisCached.size > 0) {
        const redisPrices: MarketPrice[] = [];
        for (const [coinId, cached] of redisCached) {
          redisPrices.push(convertRedisPriceToMarketPrice(coinId, cached));
        }
        markFound(redisPrices);
        logger.debug('🔴 Redis cache hit', { 
          count: redisPrices.length, 
          coins: redisPrices.map(p => p.symbol).join(',')
        });
      }
    } catch (error: any) {
      logger.debug('🔴 Redis cache lookup failed', { error: error.message });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Check LOCAL cache
  // ═══════════════════════════════════════════════════════════════════════════
  if (pendingSymbols.size > 0) {
    const { found: cachedPrices, missing: _ } = priceCache.getMultiple([...pendingSymbols]);
    if (cachedPrices.length > 0) {
      markFound(cachedPrices);
      logger.debug('📊 Local cache hit', { count: cachedPrices.length });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: market-prices service (parallel with CoinGecko for speed)
  // ═══════════════════════════════════════════════════════════════════════════
  if (pendingSymbols.size > 0) {
    const [mpPrices, cgPrices] = await Promise.all([
      fetchFromMarketPrices([...pendingSymbols]),
      pendingCoinIds.size > 0 ? fetchFromCoinGecko([...pendingCoinIds]) : Promise.resolve([]),
    ]);
    
    markFound(mpPrices);
    markFound(cgPrices);
    
    // Also cache in Redis for future requests (if Redis available)
    if (isRedisAvailable()) {
      for (const price of [...mpPrices, ...cgPrices]) {
        if (price.coinGeckoId) {
          setCachedPrice(price.coinGeckoId, {
            current: price.price,
            change24h: price.change24h,
            changePercentage24h: price.changePercent24h,
            volume24h: price.volume24h,
            marketCap: price.marketCap,
            high24h: price.high24h,
            low24h: price.low24h,
            // ATH data - CRITICAL for accurate AI responses
            ath: price.ath,
            athDate: price.athDate,
          }, 60).catch(() => {}); // Fire and forget
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: CoinMarketCap for any still missing (if API key configured)
  // ═══════════════════════════════════════════════════════════════════════════
  if (pendingSymbols.size > 0 && CONFIG.CMC_API_KEY) {
    const cmcPrices = await fetchFromCoinMarketCap([...pendingSymbols]);
    markFound(cmcPrices);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: DexScreener for remaining (likely new/DEX tokens)
  // ═══════════════════════════════════════════════════════════════════════════
  if (pendingSymbols.size > 0) {
    const dexPromises = [...pendingSymbols].map(symbol => fetchFromDexScreener(symbol));
    const dexResults = await Promise.all(dexPromises);
    
    for (const price of dexResults) {
      if (price) markFound([price]);
    }
  }

  return Array.from(allPrices.values());
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * 🎯 MAIN: Fetch prices for detected coins from user message
 */
export async function fetchPricesForMessage(message: string): Promise<MarketSnapshot> {
  const startTime = Date.now();

  // Step 1: Detect coins in message
  const detectedCoins = await symbolDetector.detectCoins(message);

  if (detectedCoins.length === 0) {
    // Default to top coins if none detected
    return fetchDefaultMarketData();
  }

  // Step 2: Extract unique identifiers
  const coinIds = [...new Set(detectedCoins.map(c => c.coinGeckoId))];
  const symbols = [...new Set(detectedCoins.map(c => c.symbol.toUpperCase()))];

  logger.debug('📊 Fetching prices', { symbols, coinIds });

  // Step 3: Fetch with fallback chain
  const prices = await fetchWithFallback(coinIds, symbols);

  // Step 4: Build snapshot
  const foundSymbols = prices.map(p => p.symbol.toUpperCase());
  const missingSymbols = symbols.filter(s => !foundSymbols.includes(s.toUpperCase()));
  const sources = [...new Set(prices.map(p => p.source))];

  const snapshot: MarketSnapshot = {
    timestamp: new Date().toISOString(),
    prices,
    requestedSymbols: symbols,
    foundSymbols,
    missingSymbols,
    sources,
    fetchTime: Date.now() - startTime,
  };

  logger.info('📊 Market data complete', {
    requested: symbols.length,
    found: prices.length,
    missing: missingSymbols.length,
    sources,
    fetchTime: snapshot.fetchTime,
  });

  return snapshot;
}

/**
 * Fetch default market data (top coins)
 */
export async function fetchDefaultMarketData(): Promise<MarketSnapshot> {
  const startTime = Date.now();
  const defaultSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK'];
  const defaultIds = defaultSymbols
    .map(s => symbolDetector.getCoinBySymbol(s)?.id)
    .filter(Boolean) as string[];

  const prices = await fetchWithFallback(defaultIds, defaultSymbols);

  return {
    timestamp: new Date().toISOString(),
    prices,
    requestedSymbols: defaultSymbols,
    foundSymbols: prices.map(p => p.symbol),
    missingSymbols: [],
    sources: [...new Set(prices.map(p => p.source))],
    fetchTime: Date.now() - startTime,
  };
}

/**
 * Legacy compatibility
 */
export async function fetchLiveMarketData(): Promise<MarketSnapshot | null> {
  try {
    return await fetchDefaultMarketData();
  } catch (error: any) {
    logger.debug('Failed to fetch live market data', { error: error.message });
    return null;
  }
}

/**
 * Fetch single coin price
 */
export async function fetchSinglePrice(symbol: string): Promise<MarketPrice | null> {
  const coin = symbolDetector.getCoinBySymbol(symbol);
  if (!coin) return null;

  const prices = await fetchWithFallback([coin.id], [symbol]);
  return prices[0] || null;
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format market data for AI context
 */
export function formatMarketDataForAI(snapshot: MarketSnapshot): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  // Add verification header to prevent hallucination
  let context = `
╔═══════════════════════════════════════════════════════════════════════════════════╗
║  📋 VERIFIED MARKET DATA - ${dateStr}, ${timeStr}
║  ⚠️ USE ONLY THESE VALUES. Do NOT use training data for prices/ATH.
╚═══════════════════════════════════════════════════════════════════════════════════╝

`;

  // Sort by market cap descending
  const sortedPrices = [...snapshot.prices].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

  for (const coin of sortedPrices) {
    const direction = coin.changePercent24h >= 0 ? '↑' : '↓';
    const changeStr = coin.changePercent24h >= 0
      ? `+${coin.changePercent24h.toFixed(2)}%`
      : `${coin.changePercent24h.toFixed(2)}%`;

    context += `${coin.symbol}: CURRENT_PRICE=$${formatPrice(coin.price)} (${direction}${changeStr} 24h)`;
    
    // Add ATH data if available (CRITICAL for accurate AI responses)
    if (coin.ath && coin.athDate) {
      const athDate = new Date(coin.athDate);
      const athDateStr = athDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const athChangePercent = ((coin.price - coin.ath) / coin.ath * 100).toFixed(1);
      context += `\n  ALL_TIME_HIGH: $${formatPrice(coin.ath)} on ${athDateStr} (${athChangePercent}% from ATH)`;
    } else {
      context += `\n  ALL_TIME_HIGH: [DATA NOT AVAILABLE - DO NOT GUESS]`;
    }
    
    if (coin.source === 'dexscreener') {
      context += ' [DEX]';
    }
    if (coin.confidence < 0.8) {
      context += ' [unverified]';
    }
    context += '\n\n';
  }

  if (snapshot.missingSymbols.length > 0) {
    context += `⛔ NO DATA FOR (DO NOT GUESS): ${snapshot.missingSymbols.join(', ')}\n`;
  }

  context += `[Sources: ${snapshot.sources.join(', ')} | Fetched in ${snapshot.fetchTime}ms]\n`;
  context += `🔒 REMINDER: Use these EXACT values. Your training data is OUTDATED.\n`;

  return context;
}

/**
 * Format price with appropriate precision
 */
function formatPrice(price: number): string {
  if (price === 0) return '0';
  if (price >= 10000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 1 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 0.01) {
    return price.toFixed(4);
  } else if (price >= 0.0001) {
    return price.toFixed(6);
  } else if (price >= 0.00000001) {
    return price.toFixed(8);
  } else {
    return price.toExponential(4);
  }
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

/**
 * Get system status including coin ID validator stats
 */
export function getMarketDataStatus(): {
  rateLimits: Record<string, { callCount: number; remaining: number }>;
  cacheEnabled: boolean;
  redisEnabled: boolean;
  providers: { name: string; enabled: boolean; priority: number }[];
  coinIdValidator: {
    initialized: boolean;
    coinCount: number;
    cacheValid: boolean;
    hitRate: number;
  };
} {
  const validatorStats = getCoinIdValidator().getStats();
  
  return {
    rateLimits: {
      MARKET_PRICES: rateLimiter.getStats('MARKET_PRICES'),
      COINGECKO: rateLimiter.getStats('COINGECKO'),
      CMC: rateLimiter.getStats('CMC'),
      DEXSCREENER: rateLimiter.getStats('DEXSCREENER'),
    },
    cacheEnabled: true,
    redisEnabled: isRedisAvailable(),
    providers: [
      { name: 'redis-cache', enabled: isRedisAvailable(), priority: 0 },
      { name: 'market-prices', enabled: true, priority: 1 },
      { name: 'coingecko', enabled: true, priority: 2 },
      { name: 'coinmarketcap', enabled: !!CONFIG.CMC_API_KEY, priority: 3 },
      { name: 'dexscreener', enabled: true, priority: 4 },
    ],
    coinIdValidator: {
      initialized: validatorStats.isInitialized,
      coinCount: validatorStats.totalCoins,
      cacheValid: validatorStats.cacheValid,
      hitRate: Math.round(validatorStats.hitRate * 100) / 100,
    },
  };
}
