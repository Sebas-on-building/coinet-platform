import { ErrorManager } from '../errors/ErrorManager';
import { Logger } from '../logging/Logger';
import { MetricsCollector } from '../metrics/MetricsCollector';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  retryOptions?: RetryOptions;
  cacheKey?: string;
  cacheTtl?: number;
  bypassCache?: boolean;
  rateLimitKey?: string;
  endpoint?: string;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class ApiManager {
  private static instance: ApiManager;
  private errorManager: ErrorManager;
  private logger: Logger;
  private metrics: MetricsCollector;
  private rateLimiter: RateLimiter;
  private cacheManager: CacheManager;
  private retryManager: RetryManager;

  private constructor() {
    this.errorManager = ErrorManager.getInstance();
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.rateLimiter = new RateLimiter();
    this.cacheManager = new CacheManager();
    this.retryManager = new RetryManager();
  }

  static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager();
    }
    return ApiManager.instance;
  }

  /**
   * Make HTTP request with comprehensive error handling, caching, and retry logic
   */
  async makeRequest<T>(config: ApiRequestConfig): Promise<T> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // 1. Check rate limits
      if (config.rateLimitKey) {
        await this.rateLimiter.checkLimit(config.rateLimitKey);
      }

      // 2. Check cache first
      if (config.cacheKey && !config.bypassCache) {
        const cached = await this.cacheManager.get<T>(config.cacheKey);
        if (cached) {
          this.metrics.incrementCounter('api.cache.hit');
          this.logger.debug('Cache hit', { cacheKey: config.cacheKey, requestId });
          return cached;
        }
        this.metrics.incrementCounter('api.cache.miss');
      }

      // 3. Make request with retry logic
      const response = await this.retryManager.execute(
        () => this.executeRequest(config),
        config.retryOptions || this.getDefaultRetryOptions()
      );

      // 4. Cache response if successful
      if (config.cacheKey && config.cacheTtl) {
        await this.cacheManager.set(config.cacheKey, response.data, config.cacheTtl);
      }

      // 5. Record metrics
      this.metrics.incrementCounter('api.request.success');
      this.metrics.recordHistogram('api.request.duration', Date.now() - startTime);

      this.logger.info('API request successful', {
        url: config.url,
        method: config.method,
        duration: Date.now() - startTime,
        requestId,
      });

      return response.data;

    } catch (error) {
      this.metrics.incrementCounter('api.request.error');
      this.metrics.recordHistogram('api.request.duration', Date.now() - startTime);

      this.errorManager.handleError(error as Error, {
        operation: 'apiRequest',
        url: config.url,
        method: config.method,
        requestId,
      });

      throw error;
    }
  }

  /**
   * Execute HTTP request
   */
  private async executeRequest(config: ApiRequestConfig): Promise<AxiosResponse> {
    const axiosConfig: AxiosRequestConfig = {
      url: config.url,
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Coinet/1.0',
        ...config.headers,
      },
      data: config.data,
      timeout: config.timeout || 30000,
      validateStatus: (status) => status < 500, // Don't retry on 4xx errors
    };

    return axios(axiosConfig);
  }

  /**
   * Get default retry options
   */
  private getDefaultRetryOptions(): RetryOptions {
    return {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryCondition: (error) => {
        // Retry on network errors and 5xx status codes
        return !error.response || error.response.status >= 500;
      },
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Configure rate limiting for specific endpoints
   */
  configureRateLimit(key: string, config: RateLimitConfig): void {
    this.rateLimiter.configure(key, config);
  }

  /**
   * Get API health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      totalRequests: number;
      successRate: number;
      avgResponseTime: number;
      errorRate: number;
      cacheHitRate: number;
    };
  }> {
    const metrics = this.metrics.getAllMetrics();

    // Get counter values safely
    const successCount = this.getCounterValue(metrics.counters, 'api.request.success');
    const errorCount = this.getCounterValue(metrics.counters, 'api.request.error');
    const cacheHitCount = this.getCounterValue(metrics.counters, 'api.cache.hit');
    const cacheMissCount = this.getCounterValue(metrics.counters, 'api.cache.miss');

    const totalRequests = successCount + errorCount;
    const successRate = totalRequests > 0 ? successCount / totalRequests : 0;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
    const cacheHitRate = (cacheHitCount + cacheMissCount) > 0 ?
      cacheHitCount / (cacheHitCount + cacheMissCount) : 0;

    const avgResponseTime = this.getHistogramMean(metrics.histograms['api.request.duration']);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (errorRate > 0.1 || avgResponseTime > 5000) {
      status = 'degraded';
    }

    if (errorRate > 0.3 || avgResponseTime > 10000) {
      status = 'unhealthy';
    }

    return {
      status,
      metrics: {
        totalRequests,
        successRate,
        avgResponseTime,
        errorRate,
        cacheHitRate,
      },
    };
  }

  private getCounterValue(counters: Record<string, Record<string, number>>, name: string): number {
    const counter = counters[name];
    if (!counter) return 0;
    return Object.values(counter).reduce((sum, value) => sum + value, 0);
  }

  private getHistogramMean(histogram: number[] | undefined): number {
    if (!histogram || histogram.length === 0) return 0;
    return histogram.reduce((sum, value) => sum + value, 0) / histogram.length;
  }
}

/**
 * Rate Limiter Implementation
 */
class RateLimiter {
  private limits: Map<string, RateLimitConfig> = new Map();
  private requests: Map<string, number[]> = new Map();

  configure(key: string, config: RateLimitConfig): void {
    this.limits.set(key, config);
  }

  async checkLimit(key: string): Promise<void> {
    const config = this.limits.get(key);
    if (!config) {
      return; // No limit configured
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get current requests for this key
    const keyRequests = this.requests.get(key) || [];

    // Filter out old requests
    const validRequests = keyRequests.filter(time => time > windowStart);

    // Check if we're over the limit
    if (validRequests.length >= config.requests) {
      const oldestRequest = Math.min(...validRequests);
      const resetTime = oldestRequest + config.windowMs;
      const waitTime = resetTime - now;

      throw new Error(`Rate limit exceeded. Try again in ${waitTime}ms`);
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
  }

  // Clean up old requests periodically
  cleanup(): void {
    const now = Date.now();

    for (const [key, requests] of this.requests.entries()) {
      const config = this.limits.get(key);
      if (!config) continue;

      const windowStart = now - config.windowMs;
      const validRequests = requests.filter(time => time > windowStart);

      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

/**
 * Cache Manager Implementation
 */
class CacheManager {
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  async set(key: string, data: any, ttlMs: number): Promise<void> {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Retry Manager Implementation
 */
class RetryManager {
  async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry if condition fails
        if (options.retryCondition && !options.retryCondition(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === options.maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          options.baseDelay * Math.pow(options.backoffMultiplier, attempt),
          options.maxDelay
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiManager = ApiManager.getInstance(); 