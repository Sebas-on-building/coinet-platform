/**
 * DeFiLlama REST API Client
 * Implements DeFiLlama endpoints with rate limiting and retry logic
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import {
  ProviderConfig,
  DataSource,
  ProviderError,
} from '../types';
import { getRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

// DeFiLlama API response types
export interface DeFiLlamaProtocol {
  id: string;
  name: string;
  address?: string;
  symbol?: string;
  url?: string;
  description?: string;
  chain?: string;
  logo?: string;
  audits?: number;
  audit_note?: string;
  gecko_id?: string;
  cmcId?: string;
  category?: string;
  chains?: string[];
  module?: string;
  twitter?: string;
  forkedFrom?: string[];
  oracles?: string[];
  listedAt?: number;
  slug?: string;
  tvl?: number;
  chainTvls?: Record<string, number>;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  tokenAddress?: string;
  mcap?: number;
}

export interface DeFiLlamaYieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd?: number;
  apy?: number;
  apyBase?: number;
  apyReward?: number;
  apyMean30d?: number;
  ilRisk?: string;
  apyPct1D?: number;
  apyPct7D?: number;
  apyPct30D?: number;
  stablecoin?: boolean;
  il7d?: number;
  apyBase7d?: number;
  apyReward7d?: number;
  apyBaseInception?: number;
  apyRewardInception?: number;
  predictions?: {
    predictedClass?: string;
    predictedProbability?: number;
    binnedConfidence?: number;
  };
  poolMeta?: string;
  mu?: number;
  sigma?: number;
  count?: number;
  outlier?: boolean;
  rewardTokens?: string[];
  underlyingTokens?: string[];
  url?: string;
  volumeUsd1d?: number;
  volumeUsd7d?: number;
}

export interface DeFiLlamaStablecoin {
  id: string;
  name: string;
  symbol: string;
  gecko_id?: string;
  pegType?: string;
  pegMechanism?: string;
  circulating?: {
    peggedUSD?: number;
    [key: string]: number | undefined;
  };
  circulatingPrevDay?: {
    peggedUSD?: number;
    [key: string]: number | undefined;
  };
  circulatingPrevWeek?: {
    peggedUSD?: number;
    [key: string]: number | undefined;
  };
  circulatingPrevMonth?: {
    peggedUSD?: number;
    [key: string]: number | undefined;
  };
  price?: number;
  priceSource?: string;
  chains?: string[];
  chainCirculating?: Record<string, any>;
}

export interface DeFiLlamaTokenUnlock {
  name: string;
  symbol: string;
  nextEvent: {
    date: number;
    amount: number;
    amountUSD: number;
  };
  totalLocked: number;
  totalLockedUSD: number;
  circulatingSupply: number;
  maxSupply: number;
}

/**
 * Bridge data for cross-chain analytics
 */
export interface DeFiLlamaBridge {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  chains: string[];
  tvl: number;
  volume24h?: number;
  volume7d?: number;
  volume30d?: number;
  uniqueUsers24h?: number;
  uniqueUsers7d?: number;
  uniqueUsers30d?: number;
  change24h?: number;
  change7d?: number;
  change30d?: number;
}

/**
 * Protocol revenue data for investment analysis
 */
export interface DeFiLlamaRevenue {
  date: number;
  dailyRevenueUSD?: number;
  dailyFeesUSD?: number;
  dailySupplySideRevenueUSD?: number;
  dailyProtocolRevenueUSD?: number;
  totalRevenueUSD?: number;
  totalFeesUSD?: number;
  totalSupplySideRevenueUSD?: number;
  totalProtocolRevenueUSD?: number;
}

/**
 * Protocol fees data for fee analysis
 */
export interface DeFiLlamaFees {
  date: number;
  dailyFeesUSD?: number;
  dailyRevenueUSD?: number;
  dailySupplySideRevenueUSD?: number;
  dailyProtocolRevenueUSD?: number;
  totalFeesUSD?: number;
  totalRevenueUSD?: number;
  totalSupplySideRevenueUSD?: number;
  totalProtocolRevenueUSD?: number;
  protocolId?: string;
  protocolName?: string;
}

/**
 * Historical yield data for yield trend analysis
 */
export interface DeFiLlamaYieldHistory {
  date: number;
  apy?: number;
  apyBase?: number;
  apyReward?: number;
  apyMean30d?: number;
  tvlUsd?: number;
  volumeUsd?: number;
  pool?: string;
  chain?: string;
  project?: string;
  symbol?: string;
}

// Cache for responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class DefiLlamaRestClient {
  private axios: AxiosInstance;
  private config: ProviderConfig;
  private rateLimiter = getRateLimiter();
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheTTL: number = 60000; // 1 minute default

  constructor(config: ProviderConfig) {
    this.config = config;

    // Initialize axios instance
    this.axios = axios.create({
      baseURL: config.apiUrl || 'https://api.llama.fi',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
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
        logger.warn(`DeFiLlama request retry #${retryCount}`, {
          error: error.message,
          url: error.config?.url,
        });
        if (config.retry.onRetry) {
          config.retry.onRetry(retryCount, error);
        }
      },
    });

    // Register rate limiter
    this.rateLimiter.register(DataSource.DEFILLAMA, config.rateLimit);

    logger.info('DeFiLlama REST client initialized', {
      baseURL: this.axios.defaults.baseURL,
      rateLimitPerMinute: config.rateLimit.maxRequestsPerMinute,
    });
  }

  /**
   * Make a rate-limited request
   */
  private async request<T>(
    method: string,
    url: string,
    params?: any,
    priority?: number,
    useCache: boolean = true
  ): Promise<T> {
    // Check cache first
    if (useCache && method === 'GET') {
      const cacheKey = `${method}:${url}:${JSON.stringify(params || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        logger.debug(`DeFiLlama cache hit: ${url}`);
        return cached.data as T;
      }
    }

    return this.rateLimiter.schedule<T>(
      DataSource.DEFILLAMA,
      async () => {
        try {
          logger.debug(`DeFiLlama API request: ${method} ${url}`, { params });
          
          const response = await this.axios.request<T>({
            method,
            url,
            params,
          });

          logger.debug(`DeFiLlama API response: ${method} ${url}`, {
            status: response?.status || 'unknown',
          });

          // Axios always returns AxiosResponse with data property
          const data = response.data;

          // Cache the response
          if (useCache && method === 'GET') {
            const cacheKey = `${method}:${url}:${JSON.stringify(params || {})}`;
            this.cache.set(cacheKey, {
              data,
              timestamp: Date.now(),
            });
          }

          return data;
        } catch (error) {
          this.handleError(error as AxiosError, url);
          throw error;
        }
      },
      priority
    );
  }

  /**
   * Handle API errors with comprehensive error handling
   */
  private handleError(error: AxiosError, endpoint: string): void {
    // Safely check for error.response before accessing properties
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      logger.error(`DeFiLlama API error: ${status}`, {
        endpoint,
        status,
        error: data?.error || data?.status?.error_message || error.message,
      });

      throw new ProviderError(
        `DeFiLlama API error: ${status} - ${data?.error || data?.status?.error_message || error.message}`,
        DataSource.DEFILLAMA,
        status,
        error
      );
    } else if (error.request) {
      // The request was made but no response was received
      logger.error('DeFiLlama network error', {
        endpoint,
        error: error.message,
      });

      throw new ProviderError(
        `DeFiLlama network error: ${error.message}`,
        DataSource.DEFILLAMA,
        undefined,
        error
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error('DeFiLlama request error', {
        endpoint,
        error: error.message,
      });

      throw new ProviderError(
        `DeFiLlama request error: ${error.message}`,
        DataSource.DEFILLAMA,
        undefined,
        error
      );
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('DeFiLlama cache cleared', { timestamp: new Date().toISOString() });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Get all protocols
   */
  async getProtocols(): Promise<DeFiLlamaProtocol[]> {
    const response = await this.request<any>('GET', '/protocols');
    // DeFiLlama returns an array directly
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get specific protocol by ID or slug
   */
  async getProtocol(protocolId: string): Promise<DeFiLlamaProtocol | null> {
    try {
      const response = await this.request<any>('GET', `/protocol/${protocolId}`);
      return response || null;
    } catch (error) {
      logger.error('Failed to get protocol', { protocolId, error });
      return null;
    }
  }

  /**
   * Get historical TVL data for all protocols
   */
  async getHistoricalTVL(): Promise<any[]> {
    const response = await this.request<any>('GET', '/charts');
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get all chains
   */
  async getChains(): Promise<string[]> {
    const response = await this.request<any>('GET', '/chains');
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get all yield pools
   * Handles both direct array responses and nested structures
   */
  async getPools(): Promise<DeFiLlamaYieldPool[]> {
    const response = await this.request<any>('GET', '/yields');
    
    // Handle direct array response (most common case)
    if (Array.isArray(response)) {
      return response;
    }
    
    // Handle nested structures (for test compatibility)
    if (response && typeof response === 'object') {
      // If response has a data property that's an array
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // If response has a results property that's an array
      if (Array.isArray(response.results)) {
        return response.results;
      }
    }
    
    // Return empty array if response is invalid
    return [];
  }

  /**
   * Get specific pool by ID (alias for getPoolById for test compatibility)
   */
  async getPool(poolId: string): Promise<DeFiLlamaYieldPool | null> {
    return this.getPoolById(poolId);
  }

  /**
   * Get specific pool by ID
   */
  async getPoolById(poolId: string): Promise<DeFiLlamaYieldPool | null> {
    try {
      const pools = await this.getPools();
      // Find pool by pool property, symbol, or id
      const pool = pools.find(p => 
        p.pool === poolId || 
        p.symbol === poolId ||
        (p as any).id === poolId
      );
      return pool || null;
    } catch (error) {
      logger.error('Failed to get pool', { poolId, error });
      return null;
    }
  }

  /**
   * Get all stablecoins
   * Handles DeFiLlama API format: { peggedAssets: [...] }
   */
  async getStablecoins(): Promise<DeFiLlamaStablecoin[]> {
    const response = await this.request<any>('GET', '/stablecoins');
    
    // Handle DeFiLlama API format: { peggedAssets: [...] }
    if (response && typeof response === 'object') {
      // Primary format: { peggedAssets: [...] }
      if (response.peggedAssets && Array.isArray(response.peggedAssets)) {
        return response.peggedAssets;
      }
      // Nested format: { data: { peggedAssets: [...] } }
      if (response.data && response.data.peggedAssets && Array.isArray(response.data.peggedAssets)) {
        return response.data.peggedAssets;
      }
      // Fallback: { data: [...] }
      if (Array.isArray(response.data)) {
        return response.data;
      }
    }
    
    // Fallback: return as array if it is one
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get specific stablecoin by symbol or ID
   */
  async getStablecoin(symbolOrId: string): Promise<DeFiLlamaStablecoin | null> {
    try {
      const stablecoins = await this.getStablecoins();
      const searchLower = symbolOrId.toLowerCase();
      const stablecoin = stablecoins.find(
        (sc) => sc.symbol?.toLowerCase() === searchLower || 
                sc.id?.toLowerCase() === searchLower ||
                sc.gecko_id?.toLowerCase() === searchLower
      );
      return stablecoin || null;
    } catch (error) {
      logger.error('Failed to get stablecoin', { symbolOrId, error });
      return null;
    }
  }

  /**
   * Get token unlocks data
   */
  async getTokenUnlocks(): Promise<DeFiLlamaTokenUnlock[]> {
    const response = await this.request<any>('GET', '/emission/all');
    return Array.isArray(response) ? response : [];
  }

  /**
   * Get all bridge data for cross-chain analytics
   * Returns bridge TVL, volume, and unique users data
   */
  async getBridges(): Promise<DeFiLlamaBridge[]> {
    const response = await this.request<any>('GET', '/bridges');
    
    // Handle direct array response
    if (Array.isArray(response)) {
      return response;
    }
    
    // Handle object with bridges property
    if (response && typeof response === 'object') {
      if (Array.isArray(response.bridges)) {
        return response.bridges;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
    }
    
    return [];
  }

  /**
   * Get specific bridge by ID or name
   */
  async getBridge(bridgeId: string): Promise<DeFiLlamaBridge | null> {
    try {
      const bridges = await this.getBridges();
      const searchLower = bridgeId.toLowerCase();
      const bridge = bridges.find(
        (b) => b.id?.toLowerCase() === searchLower ||
               b.name?.toLowerCase() === searchLower ||
               b.displayName?.toLowerCase() === searchLower
      );
      return bridge || null;
    } catch (error) {
      logger.error('Failed to get bridge', { bridgeId, error });
      return null;
    }
  }

  /**
   * Get protocol revenue data for investment analysis
   * @param protocolId Protocol ID or slug
   * @param days Number of days of historical data (default: 30)
   */
  async getProtocolRevenue(
    protocolId: string,
    days: number = 30
  ): Promise<DeFiLlamaRevenue[]> {
    try {
      const response = await this.request<any>(
        'GET',
        `/protocol/${protocolId}/revenue`,
        { days }
      );
      
      // Handle array response
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle object with data property
      if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response.revenue)) {
          return response.revenue;
        }
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to get protocol revenue', { protocolId, days, error });
      return [];
    }
  }

  /**
   * Get all protocol fees data
   * Returns fees data for all protocols or a specific protocol
   */
  async getFees(protocolId?: string): Promise<DeFiLlamaFees[]> {
    try {
      const endpoint = protocolId 
        ? `/protocol/${protocolId}/fees`
        : '/fees';
      
      const response = await this.request<any>('GET', endpoint);
      
      // Handle array response
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle object with data property
      if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response.fees)) {
          return response.fees;
        }
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to get fees', { protocolId, error });
      return [];
    }
  }

  /**
   * Get protocol fees data (alias for getFees with protocolId)
   */
  async getProtocolFees(protocolId: string): Promise<DeFiLlamaFees[]> {
    return this.getFees(protocolId);
  }

  /**
   * Get historical yield data for a specific pool
   * @param poolId Pool ID or identifier
   * @param days Number of days of historical data (default: 30)
   */
  async getHistoricalYields(
    poolId: string,
    days: number = 30
  ): Promise<DeFiLlamaYieldHistory[]> {
    try {
      // First, get the pool to find its chain and project
      const pool = await this.getPoolById(poolId);
      
      if (!pool) {
        logger.warn('Pool not found for historical yields', { poolId });
        return [];
      }

      // DeFiLlama doesn't have a direct historical yields endpoint
      // We'll use the yields endpoint with date filtering if available
      // For now, return empty array as this endpoint may not exist
      // This is a placeholder for future API support
      logger.debug('Historical yields endpoint not yet available', { poolId, days });
      return [];
    } catch (error) {
      logger.error('Failed to get historical yields', { poolId, days, error });
      return [];
    }
  }

  /**
   * Health check for DeFiLlama API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getProtocols(); // Attempt to fetch some data
      return true;
    } catch (error) {
      logger.error('DeFiLlama health check failed', { 
        error: error instanceof ProviderError ? {
          message: error.message,
          source: error.source,
          statusCode: error.statusCode,
        } : error 
      });
      return false;
    }
  }

  /**
   * Data Normalization Methods
   * Convert DeFiLlama API responses into Coinet-compatible format
   */

  normalizeProtocolData(protocol: any): any {
    return {
      id: protocol.slug || protocol.id,
      name: protocol.name,
      tvl: protocol.tvl,
      tvlChange24h: protocol.change_1d,
      tvlChange7d: protocol.change_7d,
      mcap: protocol.mcap,
      fdv: protocol.fdv,
      source: DataSource.DEFILLAMA,
      chains: protocol.chains || [],
    };
  }

  normalizeYieldData(pool: any): any {
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (pool.stablecoin) {
      riskLevel = 'low';
    } else if (pool.ilRisk === 'yes' || pool.exposure === 'multi') {
      riskLevel = 'high';
    }

    return {
      poolId: pool.pool,
      protocol: pool.project,
      chain: pool.chain,
      symbol: pool.symbol,
      tvl: pool.tvlUsd,
      apy: pool.apy,
      apyBase: pool.apyBase,
      apyReward: pool.apyReward,
      isStablecoin: pool.stablecoin,
      ilRisk: pool.ilRisk,
      exposure: pool.exposure,
      riskLevel,
      source: DataSource.DEFILLAMA,
      rewardTokens: pool.rewardTokens || [],
      underlyingTokens: pool.underlyingTokens || [],
    };
  }

  createTimeSeriesData(
    protocol: string,
    chain: string,
    metric: string,
    value: number,
    change24h: number,
    change7d: number
  ): any {
    return {
      protocol,
      chain,
      metric,
      value,
      change24h,
      change7d,
      timestamp: new Date(),
      source: DataSource.DEFILLAMA,
    };
  }

  // Aliases for test compatibility
  async getAllChains(): Promise<string[]> {
    return this.getChains();
  }

  async getUnlocks(): Promise<DeFiLlamaTokenUnlock[]> {
    return this.getTokenUnlocks();
  }
}

export default DefiLlamaRestClient;
