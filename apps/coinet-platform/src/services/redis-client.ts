/**
 * 🔴 Redis Client - Unified Cache Layer
 * 
 * Connects coinet-platform to the shared Redis cache populated by ai-data-feeder.
 * This enables reading pre-fetched data instead of making redundant API calls.
 * 
 * REDIS KEY STRUCTURE (from ai-data-feeder):
 * - price:{coinId}    - Price data (60s TTL)
 * - news:{coinId}     - News data (5min TTL)
 * - analysis:{coinId} - AI analysis (10min TTL)
 * 
 * @module redis-client
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  REDIS_URL: process.env.REDIS_URL || '',
  CONNECT_TIMEOUT: 10000, // 10 seconds
  COMMAND_TIMEOUT: 5000,  // 5 seconds per command
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 50,   // Base delay for exponential backoff
  RETRY_DELAY_MAX: 3000,  // Max delay between retries
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Price data structure from ai-data-feeder
 */
export interface CachedPriceData {
  current: number;
  change24h: number;
  changePercentage24h: number;
  high24h?: number;
  low24h?: number;
  volume24h: number;
  marketCap: number;
}

/**
 * News data structure from ai-data-feeder
 */
export interface CachedNewsData {
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  panicScore: number;
  topHeadlines: Array<{
    title: string;
    sentiment: string;
    publishedAt: Date;
  }>;
}

/**
 * AI analysis structure from ai-data-feeder
 */
export interface CachedAnalysisData {
  coin: string;
  timestamp: Date;
  recommendation: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  signals: Array<{
    type: string;
    strength: number;
    description: string;
  }>;
}

/**
 * Redis client status
 */
export interface RedisStatus {
  connected: boolean;
  enabled: boolean;
  url: string;
  lastPing?: number;
  error?: string;
}

// ============================================================================
// REDIS CLIENT SINGLETON
// ============================================================================

let redisClient: Redis | null = null;
let isConnected = false;
let lastError: string | null = null;
let lastPingTime: number | null = null;

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<boolean> {
  if (!CONFIG.REDIS_URL) {
    logger.info('🔴 Redis not configured (REDIS_URL not set) - using direct API calls');
    return false;
  }

  // Clean up URL if needed (Railway sometimes includes variable name)
  let redisUrl = CONFIG.REDIS_URL;
  if (redisUrl.startsWith('REDIS_URL=')) {
    redisUrl = redisUrl.substring('REDIS_URL='.length);
  }
  redisUrl = redisUrl.trim();

  // Validate URL format
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    logger.warn('🔴 Invalid Redis URL format - using direct API calls');
    lastError = 'Invalid URL format';
    return false;
  }

  try {
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        if (times > CONFIG.MAX_RETRIES) {
          logger.warn('🔴 Redis max retries reached, giving up');
          return null; // Stop retrying
        }
        const delay = Math.min(times * CONFIG.RETRY_DELAY_BASE, CONFIG.RETRY_DELAY_MAX);
        logger.debug(`🔴 Redis retry ${times}/${CONFIG.MAX_RETRIES} in ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: CONFIG.MAX_RETRIES,
      connectTimeout: CONFIG.CONNECT_TIMEOUT,
      commandTimeout: CONFIG.COMMAND_TIMEOUT,
      enableReadyCheck: true,
      enableOfflineQueue: false, // Don't queue commands when disconnected
      lazyConnect: false,
    });

    // Set up event handlers
    redisClient.on('connect', () => {
      logger.info('🔴 Redis connecting...');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      lastError = null;
      logger.info('🔴 Redis connected and ready');
    });

    redisClient.on('error', (error: Error) => {
      lastError = error.message;
      logger.warn('🔴 Redis error', { error: error.message });
    });

    redisClient.on('close', () => {
      isConnected = false;
      logger.warn('🔴 Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔴 Redis reconnecting...');
    });

    // Test connection with ping
    const pingStart = Date.now();
    await redisClient.ping();
    lastPingTime = Date.now() - pingStart;
    
    logger.info('🔴 Redis initialized successfully', { pingMs: lastPingTime });
    return true;

  } catch (error: any) {
    lastError = error.message;
    logger.warn('🔴 Redis initialization failed - using direct API calls', { error: error.message });
    redisClient = null;
    return false;
  }
}

/**
 * Get Redis client status
 */
export function getRedisStatus(): RedisStatus {
  return {
    connected: isConnected,
    enabled: !!CONFIG.REDIS_URL,
    url: CONFIG.REDIS_URL ? `${CONFIG.REDIS_URL.substring(0, 20)}...` : 'not configured',
    lastPing: lastPingTime || undefined,
    error: lastError || undefined,
  };
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isConnected && redisClient !== null;
}

// ============================================================================
// CACHE READ FUNCTIONS
// ============================================================================

/**
 * Get cached price data for a coin
 * @param coinId - CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
 * @returns Cached price data or null if not found
 */
export async function getCachedPrice(coinId: string): Promise<CachedPriceData | null> {
  if (!isRedisAvailable()) return null;

  try {
    const data = await redisClient!.get(`price:${coinId}`);
    if (data) {
      logger.debug('🔴 Redis cache hit: price', { coinId });
      return JSON.parse(data) as CachedPriceData;
    }
    logger.debug('🔴 Redis cache miss: price', { coinId });
    return null;
  } catch (error: any) {
    logger.warn('🔴 Redis get failed: price', { coinId, error: error.message });
    return null;
  }
}

/**
 * Get cached prices for multiple coins
 * @param coinIds - Array of CoinGecko coin IDs
 * @returns Map of coinId to price data
 */
export async function getCachedPrices(coinIds: string[]): Promise<Map<string, CachedPriceData>> {
  const result = new Map<string, CachedPriceData>();
  
  if (!isRedisAvailable() || coinIds.length === 0) return result;

  try {
    const keys = coinIds.map(id => `price:${id}`);
    const values = await redisClient!.mget(...keys);
    
    let hits = 0;
    values.forEach((value, index) => {
      if (value) {
        result.set(coinIds[index], JSON.parse(value) as CachedPriceData);
        hits++;
      }
    });

    logger.debug('🔴 Redis bulk price lookup', { 
      requested: coinIds.length, 
      hits, 
      misses: coinIds.length - hits 
    });

    return result;
  } catch (error: any) {
    logger.warn('🔴 Redis mget failed: prices', { error: error.message });
    return result;
  }
}

/**
 * Get cached news data for a coin
 * @param coinId - CoinGecko coin ID
 * @returns Cached news data or null if not found
 */
export async function getCachedNews(coinId: string): Promise<CachedNewsData | null> {
  if (!isRedisAvailable()) return null;

  try {
    const data = await redisClient!.get(`news:${coinId}`);
    if (data) {
      logger.debug('🔴 Redis cache hit: news', { coinId });
      return JSON.parse(data) as CachedNewsData;
    }
    logger.debug('🔴 Redis cache miss: news', { coinId });
    return null;
  } catch (error: any) {
    logger.warn('🔴 Redis get failed: news', { coinId, error: error.message });
    return null;
  }
}

/**
 * Get cached news for multiple coins
 * @param coinIds - Array of CoinGecko coin IDs
 * @returns Map of coinId to news data
 */
export async function getCachedNewsMultiple(coinIds: string[]): Promise<Map<string, CachedNewsData>> {
  const result = new Map<string, CachedNewsData>();
  
  if (!isRedisAvailable() || coinIds.length === 0) return result;

  try {
    const keys = coinIds.map(id => `news:${id}`);
    const values = await redisClient!.mget(...keys);
    
    let hits = 0;
    values.forEach((value, index) => {
      if (value) {
        result.set(coinIds[index], JSON.parse(value) as CachedNewsData);
        hits++;
      }
    });

    logger.debug('🔴 Redis bulk news lookup', { 
      requested: coinIds.length, 
      hits 
    });

    return result;
  } catch (error: any) {
    logger.warn('🔴 Redis mget failed: news', { error: error.message });
    return result;
  }
}

/**
 * Get cached AI analysis for a coin
 * @param coinId - CoinGecko coin ID
 * @returns Cached analysis data or null if not found
 */
export async function getCachedAnalysis(coinId: string): Promise<CachedAnalysisData | null> {
  if (!isRedisAvailable()) return null;

  try {
    const data = await redisClient!.get(`analysis:${coinId}`);
    if (data) {
      logger.debug('🔴 Redis cache hit: analysis', { coinId });
      return JSON.parse(data) as CachedAnalysisData;
    }
    logger.debug('🔴 Redis cache miss: analysis', { coinId });
    return null;
  } catch (error: any) {
    logger.warn('🔴 Redis get failed: analysis', { coinId, error: error.message });
    return null;
  }
}

/**
 * Get all cached data for a coin (price, news, analysis)
 * @param coinId - CoinGecko coin ID
 * @returns Object with all cached data
 */
export async function getAllCachedData(coinId: string): Promise<{
  price: CachedPriceData | null;
  news: CachedNewsData | null;
  analysis: CachedAnalysisData | null;
}> {
  if (!isRedisAvailable()) {
    return { price: null, news: null, analysis: null };
  }

  try {
    const keys = [`price:${coinId}`, `news:${coinId}`, `analysis:${coinId}`];
    const values = await redisClient!.mget(...keys);

    return {
      price: values[0] ? JSON.parse(values[0]) as CachedPriceData : null,
      news: values[1] ? JSON.parse(values[1]) as CachedNewsData : null,
      analysis: values[2] ? JSON.parse(values[2]) as CachedAnalysisData : null,
    };
  } catch (error: any) {
    logger.warn('🔴 Redis mget failed: all data', { coinId, error: error.message });
    return { price: null, news: null, analysis: null };
  }
}

// ============================================================================
// CACHE WRITE FUNCTIONS (for local caching when ai-data-feeder data is stale)
// ============================================================================

/**
 * Cache price data (local fallback when ai-data-feeder is unavailable)
 * @param coinId - CoinGecko coin ID
 * @param data - Price data to cache
 * @param ttlSeconds - Time to live in seconds (default: 60)
 */
export async function setCachedPrice(
  coinId: string, 
  data: CachedPriceData, 
  ttlSeconds: number = 60
): Promise<boolean> {
  if (!isRedisAvailable()) return false;

  try {
    await redisClient!.setex(`price:${coinId}`, ttlSeconds, JSON.stringify(data));
    logger.debug('🔴 Redis cache set: price', { coinId, ttl: ttlSeconds });
    return true;
  } catch (error: any) {
    logger.warn('🔴 Redis set failed: price', { coinId, error: error.message });
    return false;
  }
}

/**
 * Cache news data
 * @param coinId - CoinGecko coin ID
 * @param data - News data to cache
 * @param ttlSeconds - Time to live in seconds (default: 300)
 */
export async function setCachedNews(
  coinId: string, 
  data: CachedNewsData, 
  ttlSeconds: number = 300
): Promise<boolean> {
  if (!isRedisAvailable()) return false;

  try {
    await redisClient!.setex(`news:${coinId}`, ttlSeconds, JSON.stringify(data));
    logger.debug('🔴 Redis cache set: news', { coinId, ttl: ttlSeconds });
    return true;
  } catch (error: any) {
    logger.warn('🔴 Redis set failed: news', { coinId, error: error.message });
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all cached coin IDs (for debugging)
 */
export async function getCachedCoinIds(): Promise<string[]> {
  if (!isRedisAvailable()) return [];

  try {
    const keys = await redisClient!.keys('price:*');
    return keys.map(k => k.replace('price:', ''));
  } catch (error: any) {
    logger.warn('🔴 Redis keys failed', { error: error.message });
    return [];
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  priceKeys: number;
  newsKeys: number;
  analysisKeys: number;
  totalKeys: number;
}> {
  if (!isRedisAvailable()) {
    return { priceKeys: 0, newsKeys: 0, analysisKeys: 0, totalKeys: 0 };
  }

  try {
    const [priceKeys, newsKeys, analysisKeys] = await Promise.all([
      redisClient!.keys('price:*'),
      redisClient!.keys('news:*'),
      redisClient!.keys('analysis:*'),
    ]);

    return {
      priceKeys: priceKeys.length,
      newsKeys: newsKeys.length,
      analysisKeys: analysisKeys.length,
      totalKeys: priceKeys.length + newsKeys.length + analysisKeys.length,
    };
  } catch (error: any) {
    logger.warn('🔴 Redis stats failed', { error: error.message });
    return { priceKeys: 0, newsKeys: 0, analysisKeys: 0, totalKeys: 0 };
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('🔴 Redis connection closed');
    } catch (error: any) {
      logger.warn('🔴 Redis quit failed, forcing disconnect', { error: error.message });
      redisClient.disconnect();
    }
    redisClient = null;
    isConnected = false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const redisCache = {
  initialize: initializeRedis,
  getStatus: getRedisStatus,
  isAvailable: isRedisAvailable,
  close: closeRedis,
  // Price
  getPrice: getCachedPrice,
  getPrices: getCachedPrices,
  setPrice: setCachedPrice,
  // News
  getNews: getCachedNews,
  getNewsMultiple: getCachedNewsMultiple,
  setNews: setCachedNews,
  // Analysis
  getAnalysis: getCachedAnalysis,
  // All data
  getAllData: getAllCachedData,
  // Utils
  getCoinIds: getCachedCoinIds,
  getStats: getCacheStats,
};

export default redisCache;

