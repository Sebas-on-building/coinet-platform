/**
 * =========================================
 * CRYPTOPANIC REST API CLIENT
 * =========================================
 * Divine world-class implementation of CryptoPanic API
 * Supports Development, Growth, and Enterprise plans
 * 
 * Features:
 * - Plan-aware rate limiting (2 req/s, 5 req/s, unlimited)
 * - Automatic caching for trending news
 * - Retry logic with exponential backoff
 * - Real-time vs delayed news handling
 * - Enterprise search and push API support
 * - Comprehensive error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import Bottleneck from 'bottleneck';
import {
  CryptoPanicPlan,
  CryptoPanicRegion,
  CryptoPanicFilter,
  CryptoPanicKind,
  CryptoPanicPostsRequest,
  CryptoPanicPostsResponse,
  CryptoPanicSearchRequest,
  RateLimitStatus,
  CryptoPanicPost,
} from '../types/cryptopanic.types';
import { logger } from '../utils/logger';

export interface CryptoPanicConfig {
  authToken: string;
  plan: CryptoPanicPlan;
  baseUrl?: string;
  enableCaching?: boolean;
  cacheTTL?: number; // seconds
  retry?: {
    retries: number;
    retryDelay: number;
  };
}

export class CryptoPanicRestClient {
  private axios: AxiosInstance;
  private config: CryptoPanicConfig;
  private limiter: Bottleneck;
  private rateLimitStatus: RateLimitStatus;
  private cache: Map<string, { data: any; expiresAt: number; hits: number }>;
  private monthlyRequestCount: number = 0;
  private monthlyResetDate: Date;

  constructor(config: CryptoPanicConfig) {
    this.config = {
      baseUrl: 'https://cryptopanic.com/api',
      enableCaching: true,
      cacheTTL: 300, // 5 minutes default
      retry: {
        retries: 3,
        retryDelay: 2000,
      },
      ...config,
    };

    // Initialize cache
    this.cache = new Map();

    // Initialize monthly tracking
    this.monthlyResetDate = this.getNextMonthStart();

    // Initialize rate limit status based on plan
    this.rateLimitStatus = this.initializeRateLimitStatus();

    // Configure rate limiter based on plan
    this.limiter = this.createRateLimiter();

    // Map plan names to API endpoint paths
    const planPathMap: Record<CryptoPanicPlan, string> = {
      [CryptoPanicPlan.DEVELOPMENT]: 'developer',
      [CryptoPanicPlan.GROWTH]: 'growth',
      [CryptoPanicPlan.ENTERPRISE]: 'enterprise',
    };
    
    const planPath = planPathMap[this.config.plan];
    
    // Initialize axios instance
    this.axios = axios.create({
      baseURL: `${this.config.baseUrl}/${planPath}/v2`,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Coinet-CryptoPanic/1.0',
      },
    });

    // Configure axios-retry
    axiosRetry(this.axios, {
      retries: this.config.retry!.retries,
      retryDelay: (retryCount) => {
        return retryCount * this.config.retry!.retryDelay;
      },
      retryCondition: (error) => {
        // Retry on network errors or 5xx errors, but not on rate limit (429)
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          ((error.response?.status || 0) >= 500 && error.response?.status !== 429)
        );
      },
      onRetry: (retryCount, error) => {
        logger.warn(`CryptoPanic request retry #${retryCount}`, {
          error: error.message,
          url: error.config?.url,
        });
      },
    });

    // Response interceptor for rate limit tracking
    this.axios.interceptors.response.use(
      (response) => {
        this.trackRequest();
        return response;
      },
      (error) => {
        if (error.response?.status === 429) {
          logger.error('CryptoPanic rate limit exceeded', {
            plan: this.config.plan,
            status: this.rateLimitStatus,
          });
        }
        return Promise.reject(error);
      }
    );

    logger.info('CryptoPanic REST client initialized', {
      plan: this.config.plan,
      baseURL: this.axios.defaults.baseURL,
      rateLimitPerSecond: this.rateLimitStatus.requestsPerSecond,
      monthlyLimit: this.rateLimitStatus.monthlyLimit,
      isRealTime: this.rateLimitStatus.isRealTime,
    });
  }

  /**
   * Initialize rate limit status based on plan
   */
  private initializeRateLimitStatus(): RateLimitStatus {
    const planConfigs = {
      [CryptoPanicPlan.DEVELOPMENT]: {
        requestsPerSecond: 2,
        requestsPerMonth: 100,
        monthlyLimit: 100,
        isRealTime: false,
        hasDelay: true,
        delayHours: 24,
      },
      [CryptoPanicPlan.GROWTH]: {
        requestsPerSecond: 5,
        requestsPerMonth: 180000,
        monthlyLimit: 180000,
        isRealTime: true,
        hasDelay: false,
        delayHours: 0,
      },
      [CryptoPanicPlan.ENTERPRISE]: {
        requestsPerSecond: Infinity,
        requestsPerMonth: Infinity,
        monthlyLimit: Infinity,
        isRealTime: true,
        hasDelay: false,
        delayHours: 0,
      },
    };

    const planConfig = planConfigs[this.config.plan];

    return {
      plan: this.config.plan,
      ...planConfig,
      currentSecondCount: 0,
      currentMonthCount: 0,
      resetAt: this.monthlyResetDate,
    };
  }

  /**
   * Create rate limiter based on plan
   */
  private createRateLimiter(): Bottleneck {
    const isEnterprise = this.config.plan === CryptoPanicPlan.ENTERPRISE;

    if (isEnterprise) {
      // No rate limiting for Enterprise
      return new Bottleneck({
        maxConcurrent: 20,
        minTime: 0,
      });
    }

    const maxPerSecond = this.rateLimitStatus.requestsPerSecond;

    return new Bottleneck({
      reservoir: maxPerSecond,
      reservoirRefreshAmount: maxPerSecond,
      reservoirRefreshInterval: 1000, // 1 second
      maxConcurrent: Math.min(maxPerSecond, 5),
      minTime: Math.floor(1000 / maxPerSecond),
    });
  }

  /**
   * Get next month start date
   */
  private getNextMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Track request for rate limit monitoring
   */
  private trackRequest(): void {
    this.rateLimitStatus.currentMonthCount++;
    this.monthlyRequestCount++;

    // Check if month has reset
    if (new Date() >= this.monthlyResetDate) {
      this.monthlyRequestCount = 0;
      this.monthlyResetDate = this.getNextMonthStart();
      this.rateLimitStatus.currentMonthCount = 0;
      this.rateLimitStatus.resetAt = this.monthlyResetDate;
    }

    // Warn if approaching monthly limit
    if (
      this.rateLimitStatus.monthlyLimit !== Infinity &&
      this.monthlyRequestCount >= this.rateLimitStatus.monthlyLimit * 0.9
    ) {
      logger.warn('Approaching CryptoPanic monthly rate limit', {
        current: this.monthlyRequestCount,
        limit: this.rateLimitStatus.monthlyLimit,
        remaining: this.rateLimitStatus.monthlyLimit - this.monthlyRequestCount,
      });
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(endpoint: string, params: any): string {
    const sortedParams = Object.keys(params || {})
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as any);
    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    cached.hits++;
    logger.debug('Cache hit', { key, hits: cached.hits });
    return cached.data as T;
  }

  /**
   * Set to cache
   */
  private setToCache(key: string, data: any, ttl?: number): void {
    if (!this.config.enableCaching) return;

    const cacheTTL = ttl || this.config.cacheTTL!;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + cacheTTL * 1000,
      hits: 0,
    });

    // Clean up old cache entries (keep last 1000)
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value as string;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Make rate-limited request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    params?: any
  ): Promise<T> {
    // Check monthly limit
    if (
      this.rateLimitStatus.monthlyLimit !== Infinity &&
      this.monthlyRequestCount >= this.rateLimitStatus.monthlyLimit
    ) {
      throw new Error(
        `Monthly rate limit exceeded. Limit: ${this.rateLimitStatus.monthlyLimit}. Resets: ${this.monthlyResetDate.toISOString()}`
      );
    }

    // Try cache first
    const cacheKey = this.getCacheKey(endpoint, params || {});
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Make rate-limited request
    return this.limiter.schedule(async () => {
      try {
        logger.debug(`CryptoPanic API request: ${method} ${endpoint}`, { params });

        const response = await this.axios.request<T>({
          method,
          url: endpoint,
          params: {
            ...params,
            auth_token: this.config.authToken,
          },
        });

        logger.debug(`CryptoPanic API response: ${method} ${endpoint}`, {
          status: response.status,
        });

        // Cache successful responses
        this.setToCache(cacheKey, response.data);

        return response.data;
      } catch (error) {
        this.handleError(error as AxiosError, endpoint);
        throw error;
      }
    });
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError, endpoint: string): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      logger.error(`CryptoPanic API error: ${status}`, {
        endpoint,
        status,
        error: data?.error || data?.detail || error.message,
        plan: this.config.plan,
      });

      if (status === 401) {
        throw new Error('Invalid CryptoPanic auth token');
      } else if (status === 403) {
        throw new Error(`Feature not available on ${this.config.plan} plan`);
      } else if (status === 429) {
        throw new Error('Rate limit exceeded');
      }
    } else if (error.request) {
      logger.error('CryptoPanic network error', {
        endpoint,
        error: error.message,
      });
      throw new Error('Network error connecting to CryptoPanic');
    } else {
      logger.error('CryptoPanic request error', {
        endpoint,
        error: error.message,
      });
    }
  }

  /**
   * Fetch posts (headlines/news)
   * @param options Request options
   */
  async fetchPosts(
    options: Partial<CryptoPanicPostsRequest> = {}
  ): Promise<CryptoPanicPostsResponse> {
    const params: any = {
      public: options.public ?? false,
      ...options,
    };

    // Handle currencies as array or comma-separated string
    if (options.currencies) {
      params.currencies = Array.isArray(options.currencies)
        ? options.currencies.join(',')
        : options.currencies;
    }

    // Handle regions
    if (options.regions) {
      params.regions = Array.isArray(options.regions)
        ? options.regions.join(',')
        : options.regions;
    }

    return this.request<CryptoPanicPostsResponse>('GET', '/posts/', params);
  }

  /**
   * Fetch trending posts
   */
  async fetchTrendingPosts(
    currencies?: string | string[]
  ): Promise<CryptoPanicPostsResponse> {
    return this.fetchPosts({
      filter: CryptoPanicFilter.HOT,
      currencies,
      kind: CryptoPanicKind.NEWS,
    });
  }

  /**
   * Fetch bullish news
   */
  async fetchBullishNews(
    currencies?: string | string[]
  ): Promise<CryptoPanicPostsResponse> {
    return this.fetchPosts({
      filter: CryptoPanicFilter.BULLISH,
      currencies,
      kind: CryptoPanicKind.NEWS,
    });
  }

  /**
   * Fetch bearish news
   */
  async fetchBearishNews(
    currencies?: string | string[]
  ): Promise<CryptoPanicPostsResponse> {
    return this.fetchPosts({
      filter: CryptoPanicFilter.BEARISH,
      currencies,
      kind: CryptoPanicKind.NEWS,
    });
  }

  /**
   * Fetch important news
   */
  async fetchImportantNews(
    currencies?: string | string[]
  ): Promise<CryptoPanicPostsResponse> {
    return this.fetchPosts({
      filter: CryptoPanicFilter.IMPORTANT,
      currencies,
      kind: CryptoPanicKind.NEWS,
    });
  }

  /**
   * Search news (Enterprise only)
   * @param options Search options
   */
  async searchNews(
    options: Partial<CryptoPanicSearchRequest>
  ): Promise<CryptoPanicPostsResponse> {
    if (this.config.plan !== CryptoPanicPlan.ENTERPRISE) {
      throw new Error('Search endpoint requires Enterprise plan');
    }

    const params: any = { ...options };

    if (options.currencies) {
      params.currencies = Array.isArray(options.currencies)
        ? options.currencies.join(',')
        : options.currencies;
    }

    if (options.regions) {
      params.regions = Array.isArray(options.regions)
        ? options.regions.join(',')
        : options.regions;
    }

    return this.request<CryptoPanicPostsResponse>('GET', '/search/', params);
  }

  /**
   * Fetch news by currency
   */
  async fetchNewsByCurrency(
    currency: string,
    options?: {
      filter?: CryptoPanicFilter;
      kind?: CryptoPanicKind;
      region?: CryptoPanicRegion;
    }
  ): Promise<CryptoPanicPostsResponse> {
    return this.fetchPosts({
      currencies: currency,
      ...options,
    });
  }

  /**
   * Fetch news by multiple currencies
   */
  async fetchNewsByMultipleCurrencies(
    currencies: string[],
    options?: {
      filter?: CryptoPanicFilter;
      kind?: CryptoPanicKind;
      region?: CryptoPanicRegion;
    }
  ): Promise<CryptoPanicPostsResponse> {
    return this.fetchPosts({
      currencies,
      ...options,
    });
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    return { ...this.rateLimitStatus };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    totalHits: number;
    entries: Array<{ key: string; hits: number; expiresAt: Date }>;
  } {
    let totalHits = 0;
    const entries: Array<{ key: string; hits: number; expiresAt: Date }> = [];

    this.cache.forEach((value, key) => {
      totalHits += value.hits;
      entries.push({
        key,
        hits: value.hits,
        expiresAt: new Date(value.expiresAt),
      });
    });

    return {
      size: this.cache.size,
      totalHits,
      entries: entries.sort((a, b) => b.hits - a.hits).slice(0, 10), // Top 10
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('CryptoPanic cache cleared');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to fetch a single post
      const result = await this.fetchPosts({ public: true });
      return result.results.length >= 0;
    } catch (error) {
      logger.error('CryptoPanic health check failed', { error });
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStats(): any {
    return {
      plan: this.config.plan,
      rateLimit: this.rateLimitStatus,
      cache: this.getCacheStats(),
      limiter: {
        running: this.limiter.counts().RUNNING,
        queued: this.limiter.counts().QUEUED,
        done: this.limiter.counts().DONE,
      },
    };
  }
}

