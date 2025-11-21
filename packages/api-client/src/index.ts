/**
 * Production-Ready API Client for Coinet Platform
 * Features: Retry logic, caching, request deduplication, error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Redis } from 'ioredis';
import crypto from 'crypto';
import pRetry from 'p-retry';
import CircuitBreaker from 'opossum';

// Types
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  circuitBreakerEnabled?: boolean;
  rateLimitPerSecond?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  cached?: boolean;
  timestamp: number;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  requestId: string;
}

// Request deduplication
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();

  async deduplicate<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing;
    }

    const promise = fn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

// Rate limiter
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number = 1000;

  constructor(maxRequestsPerSecond: number) {
    this.maxRequests = maxRequestsPerSecond;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(t => t > now - this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.windowMs - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.requests.push(now);
  }
}

// Main API Client
export class CoinetApiClient {
  private client: AxiosInstance;
  private redis?: Redis;
  private deduplicator: RequestDeduplicator;
  private rateLimiter?: RateLimiter;
  private circuitBreaker?: any;
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes
      circuitBreakerEnabled: true,
      rateLimitPerSecond: 100,
      headers: {},
      ...config
    };

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
        ...this.config.headers
      }
    });

    // Setup interceptors
    this.setupInterceptors();

    // Initialize components
    this.deduplicator = new RequestDeduplicator();

    if (this.config.rateLimitPerSecond) {
      this.rateLimiter = new RateLimiter(this.config.rateLimitPerSecond);
    }

    if (this.config.cacheEnabled) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });
    }

    if (this.config.circuitBreakerEnabled) {
      this.setupCircuitBreaker();
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add request ID
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        // Add timestamp
        config.headers['X-Request-Timestamp'] = Date.now().toString();

        // Rate limiting
        if (this.rateLimiter) {
          await this.rateLimiter.acquire();
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => this.handleResponse(response),
      (error) => this.handleError(error)
    );
  }

  private setupCircuitBreaker(): void {
    const options = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: 'api-circuit-breaker',
      fallback: () => {
        throw new Error('Service temporarily unavailable');
      }
    };

    this.circuitBreaker = new CircuitBreaker(
      (config: AxiosRequestConfig) => this.client.request(config),
      options
    );

    // Circuit breaker events
    this.circuitBreaker.on('open', () => {
      console.error('Circuit breaker opened - API calls will be rejected');
    });

    this.circuitBreaker.on('halfOpen', () => {
      console.log('Circuit breaker half-open - testing if service recovered');
    });

    this.circuitBreaker.on('close', () => {
      console.log('Circuit breaker closed - service recovered');
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private getCacheKey(method: string, url: string, params?: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${method}:${url}:${JSON.stringify(params || {})}`)
      .digest('hex');
    return `api_cache:${hash}`;
  }

  private async getFromCache(key: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    return null;
  }

  private async setCache(key: string, data: any, ttl?: number): Promise<void> {
    if (!this.redis) return;

    try {
      const ttlSeconds = ttl || this.config.cacheTTL;
      await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  private handleResponse(response: AxiosResponse): ApiResponse {
    return {
      data: response.data,
      status: response.status,
      timestamp: Date.now(),
      requestId: response.headers['x-request-id'] || this.generateRequestId()
    };
  }

  private handleError(error: AxiosError): never {
    const apiError: ApiError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      details: error.response?.data,
      timestamp: Date.now(),
      requestId: error.config?.headers?.['X-Request-ID'] || this.generateRequestId()
    };

    // Log error for monitoring
    console.error('API Error:', {
      ...apiError,
      url: error.config?.url,
      method: error.config?.method
    });

    throw apiError;
  }

  // Main request method with all features
  private async makeRequest<T>(
    config: AxiosRequestConfig,
    options?: {
      cache?: boolean;
      cacheTTL?: number;
      deduplicate?: boolean;
      retry?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    const { cache = true, cacheTTL, deduplicate = true, retry = true } = options || {};

    // Check cache first
    if (cache && this.config.cacheEnabled && config.method?.toLowerCase() === 'get') {
      const cacheKey = this.getCacheKey(
        config.method,
        config.url!,
        config.params
      );
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return {
          ...cached,
          cached: true
        };
      }
    }

    // Request function
    const requestFn = async () => {
      if (this.circuitBreaker) {
        return this.circuitBreaker.fire(config);
      }
      return this.client.request(config);
    };

    // Deduplication
    const executeRequest = deduplicate
      ? () => this.deduplicator.deduplicate(
          `${config.method}:${config.url}:${JSON.stringify(config.params)}`,
          requestFn
        )
      : requestFn;

    // Retry logic
    const response = retry
      ? await pRetry(executeRequest, {
          retries: this.config.retries,
          onFailedAttempt: (error) => {
            console.warn(
              `Request failed (attempt ${error.attemptNumber}/${this.config.retries + 1}):`,
              error.message
            );
          },
          minTimeout: 1000,
          maxTimeout: 5000
        })
      : await executeRequest();

    const apiResponse = this.handleResponse(response);

    // Cache successful GET responses
    if (
      cache &&
      this.config.cacheEnabled &&
      config.method?.toLowerCase() === 'get' &&
      apiResponse.status === 200
    ) {
      const cacheKey = this.getCacheKey(
        config.method,
        config.url!,
        config.params
      );
      await this.setCache(cacheKey, apiResponse, cacheTTL);
    }

    return apiResponse;
  }

  // Public API methods
  async get<T>(
    url: string,
    params?: any,
    options?: { cache?: boolean; cacheTTL?: number }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      { method: 'GET', url, params },
      options
    );
  }

  async post<T>(
    url: string,
    data?: any,
    options?: { retry?: boolean }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      { method: 'POST', url, data },
      { ...options, cache: false }
    );
  }

  async put<T>(
    url: string,
    data?: any,
    options?: { retry?: boolean }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      { method: 'PUT', url, data },
      { ...options, cache: false }
    );
  }

  async delete<T>(
    url: string,
    options?: { retry?: boolean }
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      { method: 'DELETE', url },
      { ...options, cache: false }
    );
  }

  // Batch requests
  async batch<T>(
    requests: Array<{
      method: string;
      url: string;
      data?: any;
      params?: any;
    }>
  ): Promise<ApiResponse<T>[]> {
    return Promise.all(
      requests.map((req) =>
        this.makeRequest<T>({
          method: req.method,
          url: req.url,
          data: req.data,
          params: req.params
        })
      )
    );
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', undefined, { cache: false, retry: false });
      return true;
    } catch {
      return false;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Factory function for different services
export function createApiClient(service: 'ingest' | 'context' | 'inference' | 'web'): CoinetApiClient {
  const configs: Record<string, ApiClientConfig> = {
    ingest: {
      baseURL: process.env.INGEST_API_URL || 'http://localhost:8001',
      timeout: 10000,
      rateLimitPerSecond: 200
    },
    context: {
      baseURL: process.env.CONTEXT_API_URL || 'http://localhost:8002',
      timeout: 30000,
      rateLimitPerSecond: 50
    },
    inference: {
      baseURL: process.env.INFERENCE_API_URL || 'http://localhost:8003',
      timeout: 60000,
      rateLimitPerSecond: 20
    },
    web: {
      baseURL: process.env.WEB_API_URL || 'http://localhost:3000/api',
      timeout: 15000,
      rateLimitPerSecond: 100
    }
  };

  return new CoinetApiClient(configs[service]);
}

export default CoinetApiClient;
