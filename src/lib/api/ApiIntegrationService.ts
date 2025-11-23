import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { errorManager, ServiceError, ApiError } from '../errors/ErrorManager';
import { Logger } from '../logging/Logger';
import { MetricsCollector } from '../metrics/MetricsCollector';

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  rateLimit: { requests: number; windowMs: number };
  timeout: number;
  retries: number;
}

export interface RateLimitState {
  requests: number;
  windowStart: number;
  nextReset: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  cached: boolean;
  rateLimit?: { remaining: number; reset: number; limit: number };
}

export class ApiIntegrationService {
  private static instance: ApiIntegrationService;
  private logger: Logger;
  private metricsCollector: MetricsCollector;
  private clients: Map<string, AxiosInstance> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private cache: Map<string, CacheEntry<any>> = new Map();

  private readonly configs: Record<string, ApiConfig> = {
    coingecko: {
      baseUrl: 'https://api.coingecko.com/api/v3',
      apiKey: process.env.COINGECKO_API_KEY,
      rateLimit: { requests: 50, windowMs: 60 * 1000 },
      timeout: 10000,
      retries: 3
    },
    twitter: {
      baseUrl: 'https://api.twitter.com/2',
      apiKey: process.env.TWITTER_BEARER_TOKEN,
      rateLimit: { requests: 450, windowMs: 15 * 60 * 1000 },
      timeout: 15000,
      retries: 3
    },
    reddit: {
      baseUrl: 'https://oauth.reddit.com',
      apiKey: process.env.REDDIT_CLIENT_ID,
      rateLimit: { requests: 60, windowMs: 60 * 1000 },
      timeout: 10000,
      retries: 3
    }
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.metricsCollector = MetricsCollector.getInstance();
    this.initializeClients();
    this.setupCleanupInterval();
  }

  static getInstance(): ApiIntegrationService {
    if (!ApiIntegrationService.instance) {
      ApiIntegrationService.instance = new ApiIntegrationService();
    }
    return ApiIntegrationService.instance;
  }

  private initializeClients(): void {
    for (const [service, config] of Object.entries(this.configs)) {
      const client = axios.create({
        baseURL: config.baseUrl,
        timeout: config.timeout,
        headers: {
          'User-Agent': 'Coinet/1.0.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (config.apiKey) {
        if (service === 'twitter') {
          client.defaults.headers.common['Authorization'] = `Bearer ${config.apiKey}`;
        } else if (service === 'coingecko') {
          client.defaults.headers.common['x-cg-demo-api-key'] = config.apiKey;
        }
      }

      client.interceptors.request.use(
        async (config: InternalAxiosRequestConfig) => {
          await this.checkRateLimit(service);
          return config;
        },
        (error: any) => Promise.reject(error)
      );

      client.interceptors.response.use(
        (response: any) => {
          this.updateRateLimit(service, response.headers);
          this.metricsCollector.incrementCounter('api_requests_success', { service });
          return response;
        },
        (error: any) => {
          this.metricsCollector.incrementCounter('api_requests_failed', { service });
          return Promise.reject(error);
        }
      );

      this.clients.set(service, client);
    }
  }

  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  private async checkRateLimit(service: string): Promise<void> {
    const config = this.configs[service];
    const state = this.rateLimits.get(service);
    const now = Date.now();

    if (!state) {
      this.rateLimits.set(service, {
        requests: 0,
        windowStart: now,
        nextReset: now + config.rateLimit.windowMs
      });
      return;
    }

    if (now >= state.nextReset) {
      state.requests = 0;
      state.windowStart = now;
      state.nextReset = now + config.rateLimit.windowMs;
    }

    if (state.requests >= config.rateLimit.requests) {
      const waitTime = state.nextReset - now;
      this.logger.warn(`Rate limit exceeded for ${service}, waiting ${waitTime}ms`);
      this.metricsCollector.incrementCounter('api_rate_limit_exceeded', { service });
      await new Promise(resolve => setTimeout(resolve, waitTime));

      state.requests = 0;
      state.windowStart = Date.now();
      state.nextReset = Date.now() + config.rateLimit.windowMs;
    }

    state.requests++;
  }

  private updateRateLimit(service: string, headers: Record<string, string>): void {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'] || '0');
    const reset = parseInt(headers['x-ratelimit-reset'] || headers['x-rate-limit-reset'] || '0');

    if (remaining !== undefined && reset !== undefined) {
      const state = this.rateLimits.get(service);
      if (state) {
        state.requests = this.configs[service].rateLimit.requests - remaining;
        state.nextReset = reset * 1000;
      }
    }
  }

  private getCacheKey(service: string, endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${service}:${endpoint}:${paramString}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    return null;
  }

  private setCache<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs
    });
  }

  private async makeRequest<T>(
    service: string,
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      params?: Record<string, any>;
      cacheTtl?: number;
      skipCache?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', params, cacheTtl = 5 * 60 * 1000, skipCache = false } = options;
    const cacheKey = this.getCacheKey(service, endpoint, params);

    if (method === 'GET' && !skipCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return { data: cached, status: 200, cached: true };
      }
    }

    const client = this.clients.get(service);
    if (!client) {
      throw new ServiceError('API_CLIENT_NOT_FOUND', `API client for ${service} not found`);
    }

    const config = this.configs[service];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        const response = await client.request<T>({
          method,
          url: endpoint,
          params
        });

        if (method === 'GET' && !skipCache) {
          this.setCache(cacheKey, response.data, cacheTtl);
        }

        return {
          data: response.data,
          status: response.status,
          cached: false
        };

      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          break;
        }

        if (attempt < config.retries) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const axiosError = lastError as AxiosError;

    errorManager.handleError(axiosError, {
      operation: `api_request_${service}`,
      component: 'api_integration_service',
      metadata: { service, endpoint, params }
    });

    if (axiosError.response?.status === 429) {
      throw new ApiError('RATE_LIMIT_EXCEEDED', axiosError);
    } else if (axiosError.response?.status === 401) {
      throw new ApiError('UNAUTHORIZED', axiosError);
    } else if (axiosError.response?.status === 403) {
      throw new ApiError('FORBIDDEN', axiosError);
    } else if (axiosError.response?.status === 404) {
      throw new ApiError('NOT_FOUND', axiosError);
    } else {
      throw new ApiError('REQUEST_FAILED', axiosError);
    }
  }

  // CoinGecko API methods
  async getCoinPrice(coinId: string, vsCurrency: string = 'usd'): Promise<any> {
    try {
      const response = await this.makeRequest<any[]>('coingecko', '/coins/markets', {
        params: {
          ids: coinId,
          vs_currency: vsCurrency,
          order: 'market_cap_desc',
          per_page: 1,
          page: 1
        },
        cacheTtl: 30 * 1000
      });

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new ServiceError('COIN_NOT_FOUND', `Coin ${coinId} not found`);
      }

      return response.data[0];
    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'getCoinPrice',
        component: 'api_integration_service',
        metadata: { coinId, vsCurrency }
      });
      throw error;
    }
  }

  async getCoinMarketData(coinIds: string[], vsCurrency: string = 'usd'): Promise<any[]> {
    try {
      const response = await this.makeRequest<any[]>('coingecko', '/coins/markets', {
        params: {
          ids: coinIds.join(','),
          vs_currency: vsCurrency,
          order: 'market_cap_desc',
          per_page: 250,
          page: 1
        },
        cacheTtl: 60 * 1000
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'getCoinMarketData',
        component: 'api_integration_service',
        metadata: { coinIds, vsCurrency }
      });
      throw error;
    }
  }

  // Twitter API methods
  async searchTweets(query: string, maxResults: number = 10): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data?: any[] }>('twitter', '/tweets/search/recent', {
        params: {
          query: `${query} -is:retweet lang:en`,
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'created_at,public_metrics'
        },
        cacheTtl: 2 * 60 * 1000
      });

      return response.data?.data || [];
    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'searchTweets',
        component: 'api_integration_service',
        metadata: { query, maxResults }
      });
      throw error;
    }
  }

  // Reddit API methods
  async getSubredditPosts(subreddit: string, sort: 'hot' | 'new' | 'top' = 'hot', limit: number = 25): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data?: { children?: Array<{ data: any }> } }>('reddit', `/r/${subreddit}/${sort}`, {
        params: {
          limit: Math.min(limit, 100)
        },
        cacheTtl: 3 * 60 * 1000
      });

      return response.data?.data?.children?.map((child: any) => child.data) || [];
    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'getSubredditPosts',
        component: 'api_integration_service',
        metadata: { subreddit, sort, limit }
      });
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<Record<string, { status: 'healthy' | 'unhealthy'; latency: number }>> {
    const results: Record<string, { status: 'healthy' | 'unhealthy'; latency: number }> = {};

    for (const service of Object.keys(this.configs)) {
      const startTime = Date.now();

      try {
        let testEndpoint = '';

        switch (service) {
          case 'coingecko':
            testEndpoint = '/ping';
            break;
          case 'twitter':
            testEndpoint = '/users/me';
            break;
          case 'reddit':
            testEndpoint = '/api/v1/me';
            break;
        }

        await this.makeRequest(service, testEndpoint, { skipCache: true });

        results[service] = {
          status: 'healthy',
          latency: Date.now() - startTime
        };
      } catch (error) {
        results[service] = {
          status: 'unhealthy',
          latency: Date.now() - startTime
        };
      }
    }

    return results;
  }

  getApiStats(): {
    cacheSize: number;
    rateLimitStatus: Record<string, RateLimitState>;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
  } {
    const totalRequests = this.metricsCollector.getCounterValue('api_requests_success') +
      this.metricsCollector.getCounterValue('api_requests_failed');

    return {
      cacheSize: this.cache.size,
      rateLimitStatus: Object.fromEntries(this.rateLimits),
      totalRequests,
      successfulRequests: this.metricsCollector.getCounterValue('api_requests_success'),
      failedRequests: this.metricsCollector.getCounterValue('api_requests_failed')
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const apiIntegrationService = ApiIntegrationService.getInstance(); 