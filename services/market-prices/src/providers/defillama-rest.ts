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
  chains?: {
    [chain: string]: {
      minted?: number;
      bridgedTo?: number;
      circulating?: {
        peggedUSD?: number;
        [key: string]: number | undefined;
      };
    };
  };
}

export interface DeFiLlamaTokenUnlock {
  token: string;
  unlockDate: number;
  unlockAmount: number;
  unlockPercentage: number;
}

// Cache for responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class DeFiLlamaRestClient {
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
        ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
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
      baseURL: config.apiUrl || 'https://api.llama.fi',
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
   * Handle API errors - Fixed to safely check error.response
   */
  private handleError(error: AxiosError, endpoint: string): void {
    // Safely check for error.response before accessing properties
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      logger.error(`DeFiLlama API error: ${status}`, {
        endpoint,
        error: data?.error || data?.status?.error_message || error.message,
        status,
      });

      throw new ProviderError(
        data?.error || data?.status?.error_message || `HTTP ${status}`,
        DataSource.DEFILLAMA,
        status,
        error
      );
    } else if (error.request) {
      logger.error('DeFiLlama network error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        'Network error',
        DataSource.DEFILLAMA,
        undefined,
        error
      );
    } else {
      logger.error('DeFiLlama request error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        error.message,
        DataSource.DEFILLAMA,
        undefined,
        error
      );
    }
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
   * Get specific protocol by ID
   */
  async getProtocol(protocolId: string): Promise<DeFiLlamaProtocol | null> {
    try {
      const protocols = await this.getProtocols();
      return protocols.find(p => p.id === protocolId || p.name.toLowerCase() === protocolId.toLowerCase()) || null;
    } catch (error) {
      logger.error('Failed to get protocol', { protocolId, error });
      return null;
    }
  }

  /**
   * Get historical TVL for a protocol
   */
  async getHistoricalTVL(protocolId?: string): Promise<any> {
    if (protocolId) {
      return this.request<any>('GET', `/protocol/${protocolId}`, undefined, undefined, false);
    }
    // If no protocolId, return all protocols TVL (for test compatibility)
    return this.request<any>('GET', '/protocols', undefined, undefined, false);
  }

  /**
   * Get all chains (alias for getChains for test compatibility)
   */
  async getAllChains(): Promise<string[]> {
    return this.getChains();
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
   */
  async getPools(): Promise<DeFiLlamaYieldPool[]> {
    const response = await this.request<any>('GET', '/yields');
    // Mock returns array directly after request() extracts response.data
    return Array.isArray(response) ? response : [];
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
      // Find pool by pool property or symbol
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
   */
  async getStablecoins(): Promise<DeFiLlamaStablecoin[]> {
    const response = await this.request<any>('GET', '/stablecoins');
    // Handle DeFiLlama API format: { peggedAssets: [...] }
    if (response && response.peggedAssets && Array.isArray(response.peggedAssets)) {
      return response.peggedAssets;
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
        s => s.symbol?.toLowerCase() === searchLower ||
             s.id?.toLowerCase() === searchLower ||
             s.gecko_id?.toLowerCase() === searchLower ||
             s.name?.toLowerCase() === searchLower
      );
      return stablecoin || null;
    } catch (error) {
      logger.error('Failed to get stablecoin', { symbolOrId, error });
      return null;
    }
  }

  /**
   * Get token unlocks (alias for getTokenUnlocks for test compatibility)
   */
  async getUnlocks(): Promise<DeFiLlamaTokenUnlock[]> {
    return this.getTokenUnlocks();
  }

  /**
   * Get token unlocks
   */
  async getTokenUnlocks(): Promise<DeFiLlamaTokenUnlock[]> {
    const response = await this.request<any>('GET', '/tokenUnlocks');
    if (response && Array.isArray(response)) {
      return response;
    }
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('DeFiLlama cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request<any>('GET', '/protocols', undefined, undefined, false);
      return true;
    } catch (error: any) {
      logger.error('DeFiLlama health check failed', { error });
      return false;
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): any {
    return this.rateLimiter.getCounts(DataSource.DEFILLAMA);
  }
}

export default DeFiLlamaRestClient;

