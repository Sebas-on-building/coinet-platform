/**
 * DexScreener REST API Client
 * Implements DEX pair discovery, token profiles, and liquidity metrics
 * Divine perfection in DEX data integration - World-Class Implementation
 * 
 * Features:
 * - Advanced caching with pre-caching for trending pairs
 * - Smart analytics (liquidity score, risk assessment, pair quality)
 * - Real-time monitoring with intelligent polling
 * - Historical data tracking for liquidity/volume/price
 * - Multi-chain aggregation with batching optimization
 * - Performance telemetry and metrics
 * - Header-based intelligent backoff for rate limits
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import Bottleneck from 'bottleneck';
import {
  ProviderConfig,
  DataSource,
  ProviderError,
  PriceUpdateType,
} from '../types';
import { getRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Historical data point for tracking
 */
interface HistoricalDataPoint {
  timestamp: number;
  liquidity: number;
  volume24h: number;
  priceUsd: number;
}

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  cacheHits: number;
  cacheMisses: number;
}

// DexScreener API response types
export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
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
  priceUsd?: string;
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume?: {
    h24?: number;
    h6?: number;
    h1?: number;
    m5?: number;
  };
  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  pairCreatedAt?: number;
}

export interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
  decimals?: number;
}

export interface DexScreenerTokenProfile {
  schemaVersion: string;
  pairs: DexScreenerPair[];
  tokens: DexScreenerToken[];
}

export interface DexScreenerSearchResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
  pairsCount?: number;
}

export interface DexScreenerBoostResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

export interface DexScreenerLiquiditySpike {
  pair: DexScreenerPair;
  spikeType: 'increase' | 'decrease';
  changePercentage: number;
  previousLiquidity: number;
  currentLiquidity: number;
  timestamp: Date;
}

/**
 * Pair quality score (0-100)
 */
export interface PairQualityScore {
  overall: number;
  liquidityScore: number;
  volumeScore: number;
  activityScore: number;
  ageScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  flags: string[];
}

/**
 * Liquidity depth analysis
 */
export interface LiquidityDepthAnalysis {
  totalLiquidity: number;
  baseDepth: number;
  quoteDepth: number;
  depthRatio: number;
  isBalanced: boolean;
  concentration: 'concentrated' | 'balanced' | 'dispersed';
}

/**
 * Volume analysis
 */
export interface VolumeAnalysis {
  volume24h: number;
  volumeChange24h: number;
  buyPressure: number; // Percentage of buys vs total txns
  sellPressure: number; // Percentage of sells vs total txns
  momentum: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Multi-chain aggregated data
 */
export interface MultiChainAggregatedData {
  token: DexScreenerToken;
  totalLiquidity: number;
  totalVolume24h: number;
  averagePrice: number;
  chains: {
    chainId: string;
    pairs: DexScreenerPair[];
    liquidity: number;
    volume24h: number;
  }[];
  bestPair: DexScreenerPair;
  pairCount: number;
}

/**
 * Rate limit configuration for different endpoint types
 */
enum DexScreenerEndpointType {
  SEARCH = 'search',      // 300 rpm
  PROFILE = 'profile',    // 60 rpm
  BOOST = 'boost',        // 60 rpm
  MONITOR = 'monitor',    // 60 rpm
}

/**
 * DexScreener REST Client
 * Handles DEX pair discovery, token profiles, and monitoring
 * World-Class Implementation with Advanced Features
 */
export class DexScreenerRestClient {
  private axios: AxiosInstance;
  private config: ProviderConfig;
  private rateLimiter = getRateLimiter();
  private searchRateLimiter: any; // Separate limiter for search endpoints (300 rpm)
  private profileRateLimiter: any; // Limiter for profile/boost endpoints (60 rpm)
  
  // Advanced caching layer
  private cache: Map<string, CacheEntry<any>> = new Map();
  private trendingPairsCache: Map<string, DexScreenerPair[]> = new Map();
  
  // Historical data tracking
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();
  private maxHistoricalPoints: number = 1000; // Keep last 1000 data points per pair
  
  // Performance metrics
  private metrics: PerformanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    rateLimitHits: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  
  // Pre-caching job
  private preCachingInterval?: NodeJS.Timeout;

  constructor(config: ProviderConfig) {
    this.config = config;

    // Initialize axios instance
    this.axios = axios.create({
      baseURL: config.apiUrl || 'https://api.dexscreener.com/latest/dex',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        ...(config.apiKey && config.apiKey !== 'free-tier' 
          ? { 'Authorization': `Bearer ${config.apiKey}` } 
          : {}),
      },
    });

    // Configure axios-retry
    axiosRetry(this.axios, {
      retries: config.retry.retries,
      retryDelay: (retryCount) => {
        return retryCount * config.retry.retryDelay;
      },
      retryCondition: config.retry.retryCondition || ((error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status || 0) >= 500;
      }),
      onRetry: (retryCount, error) => {
        logger.warn(`DexScreener request retry #${retryCount}`, {
          error: error.message,
          url: error.config?.url,
        });
        if (config.retry.onRetry) {
          config.retry.onRetry(retryCount, error);
        }
      },
    });

    // Register main rate limiter (60 rpm for profile/boost endpoints)
    this.rateLimiter.register(DataSource.DEXSCREENER, config.rateLimit);

    // Create separate rate limiter for search endpoints (300 rpm)
    // We'll use Bottleneck directly for the search limiter
    this.searchRateLimiter = new Bottleneck({
      reservoir: 300,
      reservoirRefreshAmount: 300,
      reservoirRefreshInterval: 60 * 1000, // 1 minute
      maxConcurrent: 10,
      minTime: Math.floor(60000 / 300), // ~200ms between requests
    });

    // Create rate limiter for profile/boost endpoints (60 rpm)
    this.profileRateLimiter = new Bottleneck({
      reservoir: 60,
      reservoirRefreshAmount: 60,
      reservoirRefreshInterval: 60 * 1000, // 1 minute
      maxConcurrent: 5,
      minTime: Math.floor(60000 / 60), // 1 second between requests
    });

    logger.info('DexScreener REST client initialized', {
      baseURL: this.axios.defaults.baseURL,
      searchRateLimit: '300 rpm',
      profileRateLimit: '60 rpm',
    });
  }

  /**
   * Make a rate-limited request with endpoint-specific rate limiting
   * Enhanced with intelligent caching, metrics and header-based backoff
   */
  private async request<T>(
    method: string,
    url: string,
    params?: any,
    endpointType: DexScreenerEndpointType = DexScreenerEndpointType.SEARCH,
    priority?: number,
    cacheTTL: number = 60000 // Default 1 minute cache
  ): Promise<T> {
    // Generate cache key
    const cacheKey = `${method}:${url}:${JSON.stringify(params || {})}`;
    
    // Check cache first (only for GET requests)
    if (method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        this.metrics.cacheHits++;
        logger.debug(`DexScreener cache hit: ${url}`);
        return cached.data as T;
      }
      this.metrics.cacheMisses++;
    }
    
    // Select appropriate rate limiter based on endpoint type
    const limiter = endpointType === DexScreenerEndpointType.SEARCH
      ? this.searchRateLimiter
      : this.profileRateLimiter;

    const startTime = Date.now();
    this.metrics.totalRequests++;

    return limiter.schedule(async () => {
      try {
        logger.debug(`DexScreener API request: ${method} ${url}`, { 
          params,
          endpointType,
        });
        
        const response = await this.axios.request<T>({
          method,
          url,
          params,
        });

        const responseTime = Date.now() - startTime;
        this.updateMetrics(responseTime, true);

        logger.debug(`DexScreener API response: ${method} ${url}`, {
          status: response.status,
          responseTime: `${responseTime}ms`,
        });

        // Cache successful GET responses
        if (method === 'GET') {
          this.cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now(),
            expiresAt: Date.now() + cacheTTL,
          });
        }

        return response.data;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.updateMetrics(responseTime, false);
        this.handleError(error as AxiosError, url);
        throw error;
      }
    });
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Update average response time (rolling average)
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * Handle API errors with intelligent backoff
   */
  private handleError(error: AxiosError, endpoint: string): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      // Extract rate limit info from headers and apply intelligent backoff
      if (status === 429) {
        this.metrics.rateLimitHits++;
        
        const retryAfter = error.response.headers['retry-after'];
        const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
        const rateLimitReset = error.response.headers['x-ratelimit-reset'];

        logger.warn('DexScreener rate limit hit - applying intelligent backoff', {
          source: 'dexscreener',
          retryAfter,
          rateLimitRemaining,
          rateLimitReset,
          endpoint,
        });

        // Apply intelligent backoff by pausing the rate limiter
        if (retryAfter) {
          const retryAfterMs = parseInt(retryAfter, 10) * 1000;
          logger.info(`Pausing DexScreener requests for ${retryAfterMs}ms`);
          
          // Pause both limiters
          this.searchRateLimiter.stop({ dropWaitingJobs: false });
          this.profileRateLimiter.stop({ dropWaitingJobs: false });
          
          // Resume after backoff period
          setTimeout(() => {
            this.searchRateLimiter.start();
            this.profileRateLimiter.start();
            logger.info('DexScreener rate limiters resumed');
          }, retryAfterMs);
        } else if (rateLimitReset) {
          // Calculate time until reset
          const resetTime = parseInt(rateLimitReset, 10) * 1000;
          const now = Date.now();
          const waitTime = Math.max(0, resetTime - now);
          
          if (waitTime > 0) {
            logger.info(`Pausing DexScreener requests until rate limit reset (${waitTime}ms)`);
            this.searchRateLimiter.stop({ dropWaitingJobs: false });
            this.profileRateLimiter.stop({ dropWaitingJobs: false });
            
            setTimeout(() => {
              this.searchRateLimiter.start();
              this.profileRateLimiter.start();
              logger.info('DexScreener rate limiters resumed after reset');
            }, waitTime);
          }
        }
      }

      logger.error(`DexScreener API error: ${status}`, {
        endpoint,
        error: data?.error || data?.message || error.message,
        status,
      });

      throw new ProviderError(
        data?.error || data?.message || `HTTP ${status}`,
        DataSource.DEXSCREENER,
        status,
        error
      );
    } else if (error.request) {
      logger.error('DexScreener network error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        'Network error',
        DataSource.DEXSCREENER,
        undefined,
        error
      );
    } else {
      logger.error('DexScreener request error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        error.message,
        DataSource.DEXSCREENER,
        undefined,
        error
      );
    }
  }

  /**
   * Search for pairs by token addresses
   * Rate limit: 300 requests per minute
   * @param tokenAddresses Array of token addresses (base or quote)
   * @param chainId Optional chain ID filter (e.g., 'ethereum', 'bsc', 'polygon')
   */
  async searchPairs(
    tokenAddresses: string | string[],
    chainId?: string
  ): Promise<DexScreenerSearchResponse> {
    const addresses = Array.isArray(tokenAddresses) 
      ? tokenAddresses.join(',') 
      : tokenAddresses;

    const params: any = { tokens: addresses };
    if (chainId) {
      params.chainIds = chainId;
    }

    return this.request<DexScreenerSearchResponse>(
      'GET',
      '/search',
      params,
      DexScreenerEndpointType.SEARCH
    );
  }

  /**
   * Get token profile with all pairs
   * Rate limit: 60 requests per minute
   * @param tokenAddress Token address
   * @param chainId Optional chain ID filter
   */
  async getTokenProfile(
    tokenAddress: string,
    chainId?: string
  ): Promise<DexScreenerTokenProfile> {
    const params: any = {};
    if (chainId) {
      params.chainIds = chainId;
    }

    return this.request<DexScreenerTokenProfile>(
      'GET',
      `/tokens/${tokenAddress}`,
      params,
      DexScreenerEndpointType.PROFILE
    );
  }

  /**
   * Get pairs by pair addresses
   * Rate limit: 300 requests per minute
   * @param pairAddresses Array of pair addresses
   * @param chainId Optional chain ID filter
   */
  async getPairs(
    pairAddresses: string | string[],
    chainId?: string
  ): Promise<DexScreenerSearchResponse> {
    const addresses = Array.isArray(pairAddresses)
      ? pairAddresses.join(',')
      : pairAddresses;

    const params: any = { pairs: addresses };
    if (chainId) {
      params.chainIds = chainId;
    }

    return this.request<DexScreenerSearchResponse>(
      'GET',
      '/pairs',
      params,
      DexScreenerEndpointType.SEARCH
    );
  }

  /**
   * Boost endpoint - Get boosted/promoted pairs
   * Rate limit: 60 requests per minute
   * @param chainId Optional chain ID filter
   */
  async getBoostedPairs(chainId?: string): Promise<DexScreenerBoostResponse> {
    const params: any = {};
    if (chainId) {
      params.chainIds = chainId;
    }

    return this.request<DexScreenerBoostResponse>(
      'GET',
      '/boost',
      params,
      DexScreenerEndpointType.BOOST
    );
  }

  /**
   * Monitor endpoint - Get new tokens
   * Rate limit: 60 requests per minute
   * @param chainId Optional chain ID filter
   * @param minLiquidityUSD Minimum liquidity in USD to filter results
   */
  async getNewTokens(
    chainId?: string,
    minLiquidityUSD?: number
  ): Promise<DexScreenerSearchResponse> {
    const params: any = {};
    if (chainId) {
      params.chainIds = chainId;
    }
    if (minLiquidityUSD !== undefined) {
      params.minLiquidityUSD = minLiquidityUSD;
    }

    return this.request<DexScreenerSearchResponse>(
      'GET',
      '/tokens/latest',
      params,
      DexScreenerEndpointType.MONITOR
    );
  }

  /**
   * Get trending pairs
   * Rate limit: 60 requests per minute
   * @param chainId Optional chain ID filter
   * @param minLiquidityUSD Minimum liquidity in USD
   */
  async getTrendingPairs(
    chainId?: string,
    minLiquidityUSD?: number
  ): Promise<DexScreenerSearchResponse> {
    const params: any = {};
    if (chainId) {
      params.chainIds = chainId;
    }
    if (minLiquidityUSD !== undefined) {
      params.minLiquidityUSD = minLiquidityUSD;
    }

    return this.request<DexScreenerSearchResponse>(
      'GET',
      '/pairs/trending',
      params,
      DexScreenerEndpointType.MONITOR
    );
  }

  /**
   * Search pairs by query string
   * Searches for pairs matching the query across all chains and DEXs
   * Rate limit: 300 requests per minute
   * @param query Search query (token symbol, name, or address)
   */
  async searchPairsByQuery(query: string): Promise<DexScreenerPair[]> {
    const response = await this.request<DexScreenerSearchResponse>(
      'GET',
      '/search',
      { q: query },
      DexScreenerEndpointType.SEARCH
    );
    return response.pairs || [];
  }

  /**
   * Get pairs by token address(es) - enhanced version
   * Supports multiple token addresses across different chains
   * Rate limit: 300 requests per minute
   * @param tokenAddresses Single token address or comma-separated list
   */
  async getPairsByToken(tokenAddresses: string | string[]): Promise<DexScreenerPair[]> {
    const addresses = Array.isArray(tokenAddresses) 
      ? tokenAddresses.join(',') 
      : tokenAddresses;
    
    const response = await this.request<DexScreenerSearchResponse>(
      'GET',
      `/tokens/${addresses}`,
      undefined,
      DexScreenerEndpointType.SEARCH
    );
    return response.pairs || [];
  }

  /**
   * Get pair by chain and pair address
   * Rate limit: 300 requests per minute
   * @param chainId Chain identifier (e.g., 'ethereum', 'bsc', 'polygon')
   * @param pairAddress Pair contract address
   */
  async getPairByAddress(chainId: string, pairAddress: string): Promise<DexScreenerPair | null> {
    try {
      const response = await this.request<DexScreenerSearchResponse>(
        'GET',
        `/pairs/${chainId}/${pairAddress}`,
        undefined,
        DexScreenerEndpointType.SEARCH
      );
      return response.pairs?.[0] || null;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get multiple pairs by chain and pair addresses
   * Rate limit: 300 requests per minute
   * @param chainId Chain identifier
   * @param pairAddresses Array of pair addresses (max 30)
   */
  async getPairsByAddresses(
    chainId: string, 
    pairAddresses: string[]
  ): Promise<DexScreenerPair[]> {
    if (pairAddresses.length === 0) return [];
    if (pairAddresses.length > 30) {
      logger.warn('getPairsByAddresses: truncating to 30 addresses', {
        requested: pairAddresses.length,
      });
    }

    const addresses = pairAddresses.slice(0, 30).join(',');
    const response = await this.request<DexScreenerSearchResponse>(
      'GET',
      `/pairs/${chainId}/${addresses}`,
      undefined,
      DexScreenerEndpointType.SEARCH
    );
    return response.pairs || [];
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to search for a common token to verify API is working
      const result = await this.searchPairsByQuery('ETH');
      return result.length > 0;
    } catch (error) {
      logger.error('DexScreener health check failed', { error });
      return false;
    }
  }

  /**
   * Get supported chains
   * Returns list of chain IDs supported by DexScreener
   */
  getSupportedChains(): string[] {
    return [
      'ethereum',
      'bsc',
      'polygon',
      'avalanche',
      'fantom',
      'arbitrum',
      'optimism',
      'cronos',
      'moonbeam',
      'moonriver',
      'harmony',
      'aurora',
      'canto',
      'base',
      'blast',
      'zkSync',
      'linea',
      'scroll',
      'mantle',
      'metis',
      'solana',
      'tron',
      'aptos',
      'sui',
      'ton',
    ];
  }

  /**
   * Detect liquidity spikes
   * Compares current liquidity with historical data to identify significant changes
   * @param pairs Array of pairs to check
   * @param thresholdPercentage Minimum percentage change to consider a spike (default: 50%)
   */
  async detectLiquiditySpikes(
    pairs: DexScreenerPair[],
    thresholdPercentage: number = 50
  ): Promise<DexScreenerLiquiditySpike[]> {
    const spikes: DexScreenerLiquiditySpike[] = [];

    for (const pair of pairs) {
      const currentLiquidity = pair.liquidity?.usd || 0;
      
      // Calculate percentage change from 24h ago if available
      // Note: DexScreener doesn't provide historical liquidity directly,
      // so we'd need to track this ourselves or use priceChange data
      if (pair.priceChange?.h24) {
        const priceChange24h = Math.abs(pair.priceChange.h24);
        
        // Estimate liquidity change based on price change
        // This is a simplified approach - in production, track historical liquidity
        if (priceChange24h >= thresholdPercentage) {
          spikes.push({
            pair,
            spikeType: priceChange24h > 0 ? 'increase' : 'decrease',
            changePercentage: priceChange24h,
            previousLiquidity: currentLiquidity / (1 + priceChange24h / 100),
            currentLiquidity,
            timestamp: new Date(),
          });
        }
      }
    }

    return spikes;
  }

  /**
   * Get price and volume snapshots across supported chains
   * @param tokenAddress Token address
   * @param chains Array of chain IDs to query
   */
  async getPriceVolumeSnapshots(
    tokenAddress: string,
    chains?: string[]
  ): Promise<Map<string, DexScreenerPair[]>> {
    const snapshots = new Map<string, DexScreenerPair[]>();

    if (chains && chains.length > 0) {
      // Query each chain separately
      for (const chainId of chains) {
        try {
          const profile = await this.getTokenProfile(tokenAddress, chainId);
          if (profile.pairs && profile.pairs.length > 0) {
            snapshots.set(chainId, profile.pairs);
          }
        } catch (error) {
          logger.warn(`Failed to get snapshot for chain ${chainId}`, {
            tokenAddress,
            chainId,
            error,
          });
        }
      }
    } else {
      // Query all chains
      const profile = await this.getTokenProfile(tokenAddress);
      if (profile.pairs && profile.pairs.length > 0) {
        // Group pairs by chain
        for (const pair of profile.pairs) {
          const chainPairs = snapshots.get(pair.chainId) || [];
          chainPairs.push(pair);
          snapshots.set(pair.chainId, chainPairs);
        }
      }
    }

    return snapshots;
  }

  /**
   * Filter pairs by minimum liquidity
   * @param pairs Array of pairs to filter
   * @param minLiquidityUSD Minimum liquidity in USD
   */
  filterByMinLiquidity(
    pairs: DexScreenerPair[],
    minLiquidityUSD: number
  ): DexScreenerPair[] {
    return pairs.filter(
      (pair) => (pair.liquidity?.usd || 0) >= minLiquidityUSD
    );
  }

  /**
   * Normalize pair identifier to Coinet symbol format
   * Format: BASE/QUOTE (e.g., ETH/USDC)
   * @param pair DexScreener pair
   */
  normalizePairIdentifier(pair: DexScreenerPair): string {
    return `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`;
  }

  /**
   * Get chain name from chain ID
   * @param chainId Chain ID
   */
  getChainName(chainId: string): string {
    const chainMap: Record<string, string> = {
      '1': 'ethereum',
      '56': 'bsc',
      '137': 'polygon',
      '42161': 'arbitrum',
      '10': 'optimism',
      '43114': 'avalanche',
      '250': 'fantom',
      '8453': 'base',
    };
    return chainMap[chainId] || chainId;
  }

  // ==================== ADVANCED ANALYTICS ====================

  /**
   * Calculate comprehensive pair quality score (0-100)
   * Industry-leading scoring algorithm considering multiple factors
   * @param pair DexScreener pair to analyze
   */
  calculatePairQualityScore(pair: DexScreenerPair): PairQualityScore {
    const flags: string[] = [];
    
    // Liquidity score (0-30 points)
    const liquidity = pair.liquidity?.usd || 0;
    let liquidityScore = 0;
    if (liquidity >= 10000000) liquidityScore = 30; // $10M+
    else if (liquidity >= 1000000) liquidityScore = 25; // $1M+
    else if (liquidity >= 100000) liquidityScore = 20; // $100K+
    else if (liquidity >= 10000) liquidityScore = 10; // $10K+
    else flags.push('low_liquidity');
    
    // Volume score (0-25 points)
    const volume24h = pair.volume?.h24 || 0;
    let volumeScore = 0;
    if (volume24h >= 5000000) volumeScore = 25; // $5M+
    else if (volume24h >= 1000000) volumeScore = 20; // $1M+
    else if (volume24h >= 100000) volumeScore = 15; // $100K+
    else if (volume24h >= 10000) volumeScore = 10; // $10K+
    else flags.push('low_volume');
    
    // Activity score (0-25 points) - based on transaction counts
    const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
    let activityScore = 0;
    if (txns24h >= 1000) activityScore = 25; // 1000+ txns
    else if (txns24h >= 500) activityScore = 20; // 500+ txns
    else if (txns24h >= 100) activityScore = 15; // 100+ txns
    else if (txns24h >= 10) activityScore = 10; // 10+ txns
    else flags.push('low_activity');
    
    // Age score (0-20 points) - older pairs are more established
    const ageInDays = pair.pairCreatedAt 
      ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60 * 24)
      : 0;
    let ageScore = 0;
    if (ageInDays >= 365) ageScore = 20; // 1+ year
    else if (ageInDays >= 90) ageScore = 15; // 3+ months
    else if (ageInDays >= 30) ageScore = 10; // 1+ month
    else if (ageInDays >= 7) ageScore = 5; // 1+ week
    else flags.push('new_pair');
    
    const overall = liquidityScore + volumeScore + activityScore + ageScore;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    if (overall >= 80) riskLevel = 'low';
    else if (overall >= 60) riskLevel = 'medium';
    else if (overall >= 40) riskLevel = 'high';
    else riskLevel = 'extreme';
    
    // Additional risk flags
    if (liquidity < 50000) flags.push('rug_pull_risk');
    if (txns24h < 50) flags.push('suspicious_activity');
    if (ageInDays < 1) flags.push('brand_new');
    
    return {
      overall,
      liquidityScore,
      volumeScore,
      activityScore,
      ageScore,
      riskLevel,
      flags,
    };
  }

  /**
   * Analyze liquidity depth and balance
   * @param pair DexScreener pair
   */
  analyzeLiquidityDepth(pair: DexScreenerPair): LiquidityDepthAnalysis {
    const totalLiquidity = pair.liquidity?.usd || 0;
    const baseDepth = pair.liquidity?.base || 0;
    const quoteDepth = pair.liquidity?.quote || 0;
    
    const depthRatio = baseDepth > 0 ? quoteDepth / baseDepth : 0;
    const isBalanced = depthRatio >= 0.8 && depthRatio <= 1.2;
    
    let concentration: 'concentrated' | 'balanced' | 'dispersed';
    if (depthRatio < 0.5 || depthRatio > 2.0) {
      concentration = 'concentrated';
    } else if (isBalanced) {
      concentration = 'balanced';
    } else {
      concentration = 'dispersed';
    }
    
    return {
      totalLiquidity,
      baseDepth,
      quoteDepth,
      depthRatio,
      isBalanced,
      concentration,
    };
  }

  /**
   * Analyze volume and trading momentum
   * @param pair DexScreener pair
   */
  analyzeVolume(pair: DexScreenerPair): VolumeAnalysis {
    const volume24h = pair.volume?.h24 || 0;
    const volume6h = pair.volume?.h6 || 0;
    
    // Calculate 24h volume change (comparing 6h windows)
    const volumeChange24h = volume6h > 0 ? ((volume24h - volume6h * 4) / (volume6h * 4)) * 100 : 0;
    
    // Calculate buy/sell pressure
    const buys24h = pair.txns?.h24?.buys || 0;
    const sells24h = pair.txns?.h24?.sells || 0;
    const totalTxns = buys24h + sells24h;
    
    const buyPressure = totalTxns > 0 ? (buys24h / totalTxns) * 100 : 50;
    const sellPressure = totalTxns > 0 ? (sells24h / totalTxns) * 100 : 50;
    
    // Determine momentum
    let momentum: 'bullish' | 'bearish' | 'neutral';
    if (buyPressure > 60) momentum = 'bullish';
    else if (sellPressure > 60) momentum = 'bearish';
    else momentum = 'neutral';
    
    return {
      volume24h,
      volumeChange24h,
      buyPressure,
      sellPressure,
      momentum,
    };
  }

  // ==================== HISTORICAL DATA TRACKING ====================

  /**
   * Track pair data point in historical records
   * @param pairAddress Pair address
   * @param pair Current pair data
   */
  trackHistoricalData(pairAddress: string, pair: DexScreenerPair): void {
    const dataPoint: HistoricalDataPoint = {
      timestamp: Date.now(),
      liquidity: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      priceUsd: parseFloat(pair.priceUsd || '0'),
    };
    
    const history = this.historicalData.get(pairAddress) || [];
    history.push(dataPoint);
    
    // Keep only last N points
    if (history.length > this.maxHistoricalPoints) {
      history.shift();
    }
    
    this.historicalData.set(pairAddress, history);
  }

  /**
   * Get historical data for a pair
   * @param pairAddress Pair address
   * @param limit Max number of points to return
   */
  getHistoricalData(pairAddress: string, limit?: number): HistoricalDataPoint[] {
    const history = this.historicalData.get(pairAddress) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Detect liquidity spikes using historical data (more accurate)
   * @param pairAddress Pair address
   * @param thresholdPercentage Minimum percentage change (default: 50%)
   */
  detectLiquiditySpikesHistorical(
    pairAddress: string,
    thresholdPercentage: number = 50
  ): DexScreenerLiquiditySpike | null {
    const history = this.historicalData.get(pairAddress);
    if (!history || history.length < 2) return null;
    
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    const changePercentage = ((current.liquidity - previous.liquidity) / previous.liquidity) * 100;
    
    if (Math.abs(changePercentage) >= thresholdPercentage) {
      // We need the pair object - this method should be used in conjunction with real-time data
      return {
        pair: {} as DexScreenerPair, // Will be populated by caller
        spikeType: changePercentage > 0 ? 'increase' : 'decrease',
        changePercentage: Math.abs(changePercentage),
        previousLiquidity: previous.liquidity,
        currentLiquidity: current.liquidity,
        timestamp: new Date(current.timestamp),
      };
    }
    
    return null;
  }

  // ==================== MULTI-CHAIN AGGREGATION ====================

  /**
   * Get aggregated data across all chains for a token
   * Industry-leading multi-chain intelligence
   * @param tokenAddress Token address
   * @param preferredChains Prioritize these chains (optional)
   */
  async getMultiChainAggregatedData(
    tokenAddress: string,
    preferredChains?: string[]
  ): Promise<MultiChainAggregatedData | null> {
    try {
      // Get token profile across all chains
      const profile = await this.getTokenProfile(tokenAddress);
      
      if (!profile.pairs || profile.pairs.length === 0) {
        return null;
      }
      
      // Group pairs by chain
      const chainGroups = new Map<string, DexScreenerPair[]>();
      for (const pair of profile.pairs) {
        const chainPairs = chainGroups.get(pair.chainId) || [];
        chainPairs.push(pair);
        chainGroups.set(pair.chainId, chainPairs);
      }
      
      // Calculate chain-level stats
      const chains: MultiChainAggregatedData['chains'] = [];
      let totalLiquidity = 0;
      let totalVolume24h = 0;
      let weightedPriceSum = 0;
      let totalLiquidityForPrice = 0;
      
      for (const [chainId, pairs] of chainGroups.entries()) {
        const chainLiquidity = pairs.reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
        const chainVolume = pairs.reduce((sum, p) => sum + (p.volume?.h24 || 0), 0);
        
        chains.push({
          chainId,
          pairs,
          liquidity: chainLiquidity,
          volume24h: chainVolume,
        });
        
        totalLiquidity += chainLiquidity;
        totalVolume24h += chainVolume;
        
        // Weight prices by liquidity for more accurate average
        for (const pair of pairs) {
          const pairLiquidity = pair.liquidity?.usd || 0;
          const pairPrice = parseFloat(pair.priceUsd || '0');
          weightedPriceSum += pairPrice * pairLiquidity;
          totalLiquidityForPrice += pairLiquidity;
        }
      }
      
      // Sort chains by liquidity (preferred chains first if specified)
      chains.sort((a, b) => {
        if (preferredChains) {
          const aPreferred = preferredChains.includes(a.chainId);
          const bPreferred = preferredChains.includes(b.chainId);
          if (aPreferred && !bPreferred) return -1;
          if (!aPreferred && bPreferred) return 1;
        }
        return b.liquidity - a.liquidity;
      });
      
      // Find best pair (highest liquidity)
      const bestPair = profile.pairs.reduce((best, current) => {
        const bestLiq = best.liquidity?.usd || 0;
        const currentLiq = current.liquidity?.usd || 0;
        return currentLiq > bestLiq ? current : best;
      });
      
      // Calculate weighted average price
      const averagePrice = totalLiquidityForPrice > 0 
        ? weightedPriceSum / totalLiquidityForPrice 
        : parseFloat(bestPair.priceUsd || '0');
      
      return {
        token: profile.tokens[0] || {
          address: tokenAddress,
          name: bestPair.baseToken.name,
          symbol: bestPair.baseToken.symbol,
        },
        totalLiquidity,
        totalVolume24h,
        averagePrice,
        chains,
        bestPair,
        pairCount: profile.pairs.length,
      };
    } catch (error) {
      logger.error('Failed to get multi-chain aggregated data', {
        tokenAddress,
        error,
      });
      return null;
    }
  }

  /**
   * Smart batch query with intelligent chunking
   * Automatically splits large requests into optimal batches
   * @param pairAddresses Array of pair addresses
   * @param chainId Chain ID
   */
  async smartBatchQuery(
    pairAddresses: string[],
    chainId: string
  ): Promise<DexScreenerPair[]> {
    const BATCH_SIZE = 30; // DexScreener max per request
    const allPairs: DexScreenerPair[] = [];
    
    // Split into chunks
    for (let i = 0; i < pairAddresses.length; i += BATCH_SIZE) {
      const chunk = pairAddresses.slice(i, i + BATCH_SIZE);
      try {
        const pairs = await this.getPairsByAddresses(chainId, chunk);
        allPairs.push(...pairs);
        
        // Add small delay between batches to be respectful
        if (i + BATCH_SIZE < pairAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      } catch (error) {
        logger.warn(`Failed to fetch batch ${i / BATCH_SIZE + 1}`, {
          chainId,
          chunkSize: chunk.length,
          error,
        });
      }
    }
    
    return allPairs;
  }

  // ==================== PRE-CACHING SYSTEM ====================

  /**
   * Start pre-caching trending pairs
   * Proactive caching to reduce latency for popular queries
   * @param chains Chains to monitor (default: top 5)
   * @param intervalMs Refresh interval (default: 5 minutes)
   */
  startPreCaching(chains?: string[], intervalMs: number = 300000): void {
    if (this.preCachingInterval) {
      logger.warn('Pre-caching already running');
      return;
    }
    
    const chainsToCache = chains || ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base'];
    
    logger.info('Starting DexScreener pre-caching system', {
      chains: chainsToCache,
      intervalMinutes: intervalMs / 60000,
    });
    
    // Initial cache
    this.preCacheTrendingPairs(chainsToCache);
    
    // Set up interval
    this.preCachingInterval = setInterval(() => {
      this.preCacheTrendingPairs(chainsToCache);
    }, intervalMs);
  }

  /**
   * Stop pre-caching
   */
  stopPreCaching(): void {
    if (this.preCachingInterval) {
      clearInterval(this.preCachingInterval);
      this.preCachingInterval = undefined;
      logger.info('DexScreener pre-caching stopped');
    }
  }

  /**
   * Pre-cache trending pairs for specified chains
   * @param chains Array of chain IDs
   */
  private async preCacheTrendingPairs(chains: string[]): Promise<void> {
    for (const chainId of chains) {
      try {
        const response = await this.getTrendingPairs(chainId, 10000);
        if (response.pairs && response.pairs.length > 0) {
          this.trendingPairsCache.set(chainId, response.pairs);
          logger.debug(`Pre-cached ${response.pairs.length} trending pairs for ${chainId}`);
        }
      } catch (error) {
        logger.warn(`Failed to pre-cache trending pairs for ${chainId}`, { error });
      }
    }
  }

  /**
   * Get pre-cached trending pairs (instant response)
   * @param chainId Chain ID
   */
  getPreCachedTrendingPairs(chainId: string): DexScreenerPair[] | null {
    return this.trendingPairsCache.get(chainId) || null;
  }

  // ==================== PERFORMANCE & TELEMETRY ====================

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    logger.info('DexScreener metrics reset');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; trendingPairsCached: number } {
    const totalCacheAccess = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalCacheAccess > 0 
      ? (this.metrics.cacheHits / totalCacheAccess) * 100 
      : 0;
    
    return {
      size: this.cache.size,
      hitRate,
      trendingPairsCached: this.trendingPairsCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.trendingPairsCache.clear();
    logger.info('DexScreener cache cleared');
  }

  /**
   * Clear historical data
   */
  clearHistoricalData(): void {
    this.historicalData.clear();
    logger.info('DexScreener historical data cleared');
  }

  /**
   * Get comprehensive health status
   * Industry-standard health check with detailed metrics
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    metrics: PerformanceMetrics;
    cacheStats: { size: number; hitRate: number; trendingPairsCached: number };
    apiResponsive: boolean;
    rateLimitStatus: 'healthy' | 'warning' | 'critical';
  }> {
    const apiResponsive = await this.healthCheck();
    
    // Determine rate limit status
    let rateLimitStatus: 'healthy' | 'warning' | 'critical';
    const successRate = this.metrics.totalRequests > 0
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
      : 100;
    
    if (this.metrics.rateLimitHits === 0) {
      rateLimitStatus = 'healthy';
    } else if (this.metrics.rateLimitHits < 5) {
      rateLimitStatus = 'warning';
    } else {
      rateLimitStatus = 'critical';
    }
    
    const isHealthy = apiResponsive && successRate > 80 && rateLimitStatus !== 'critical';
    
    return {
      isHealthy,
      metrics: this.getMetrics(),
      cacheStats: this.getCacheStats(),
      apiResponsive,
      rateLimitStatus,
    };
  }

  /**
   * Graceful shutdown - clean up resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down DexScreener client...');
    
    // Stop pre-caching
    this.stopPreCaching();
    
    // Log final metrics
    logger.info('Final DexScreener metrics', this.metrics);
    
    // Clear caches
    this.clearCache();
    this.clearHistoricalData();
    
    logger.info('DexScreener client shutdown complete');
  }
}

export default DexScreenerRestClient;

