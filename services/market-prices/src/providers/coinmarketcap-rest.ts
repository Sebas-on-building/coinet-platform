/**
 * CoinMarketCap REST API Client
 * Secondary/fallback data source
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import {
  ProviderConfig,
  DataSource,
  CoinMarketCapQuote,
  CoinMarketCapListing,
  CoinMarketCapOHLCV,
  MarketPrice,
  OHLCV,
  CoinMetadata,
  ProviderError,
  PriceUpdateType,
} from '../types';
import { getRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

export class CoinMarketCapRestClient {
  private axios: AxiosInstance;
  private config: ProviderConfig;
  private rateLimiter = getRateLimiter();
  
  // Monthly quota tracking
  private monthlyRequestCount: number = 0;
  private monthlyQuotaLimit: number = 10000; // Default monthly limit (adjust based on plan)
  private currentMonth: string = '';

  constructor(config: ProviderConfig) {
    this.config = config;

    // Initialize axios instance
    this.axios = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'X-CMC_PRO_API_KEY': config.apiKey,
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
        logger.warn(`CoinMarketCap request retry #${retryCount}`, {
          error: error.message,
          url: error.config?.url,
        });
        if (config.retry.onRetry) {
          config.retry.onRetry(retryCount, error);
        }
      },
    });

    // Register rate limiter
    this.rateLimiter.register(DataSource.COINMARKETCAP, config.rateLimit);

    // Initialize monthly tracking
    this.initializeMonthlyTracking();

    logger.info('CoinMarketCap REST client initialized', {
      baseURL: config.apiUrl,
      rateLimitPerMinute: config.rateLimit.maxRequestsPerMinute,
      monthlyQuotaLimit: this.monthlyQuotaLimit,
    });
  }

  /**
   * Initialize monthly quota tracking
   */
  private initializeMonthlyTracking(): void {
    const now = new Date();
    this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.monthlyRequestCount = 0;
    
    // Check if month changed (for persistence across restarts, would need Redis/DB)
    logger.info('CoinMarketCap monthly quota tracking initialized', {
      currentMonth: this.currentMonth,
      monthlyQuotaLimit: this.monthlyQuotaLimit,
    });
  }

  /**
   * Check and update monthly quota
   */
  private checkMonthlyQuota(): void {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Reset if month changed
    if (currentMonth !== this.currentMonth) {
      logger.info('CoinMarketCap monthly quota reset', {
        previousMonth: this.currentMonth,
        previousCount: this.monthlyRequestCount,
        newMonth: currentMonth,
      });
      this.currentMonth = currentMonth;
      this.monthlyRequestCount = 0;
    }
    
    this.monthlyRequestCount++;
    const usagePercent = (this.monthlyRequestCount / this.monthlyQuotaLimit) * 100;
    
    // Log warning at 90% usage
    if (usagePercent >= 90) {
      logger.error('CoinMarketCap monthly quota CRITICAL: Approaching limit', {
        currentCount: this.monthlyRequestCount,
        quotaLimit: this.monthlyQuotaLimit,
        usagePercent: usagePercent.toFixed(2),
        remaining: this.monthlyQuotaLimit - this.monthlyRequestCount,
      });
    } else if (usagePercent >= 75) {
      logger.warn('CoinMarketCap monthly quota WARNING: High usage', {
        currentCount: this.monthlyRequestCount,
        quotaLimit: this.monthlyQuotaLimit,
        usagePercent: usagePercent.toFixed(2),
        remaining: this.monthlyQuotaLimit - this.monthlyRequestCount,
      });
    }
  }

  /**
   * Get monthly quota status
   */
  getMonthlyQuotaStatus(): {
    currentCount: number;
    quotaLimit: number;
    usagePercent: number;
    remaining: number;
    currentMonth: string;
  } {
    return {
      currentCount: this.monthlyRequestCount,
      quotaLimit: this.monthlyQuotaLimit,
      usagePercent: (this.monthlyRequestCount / this.monthlyQuotaLimit) * 100,
      remaining: this.monthlyQuotaLimit - this.monthlyRequestCount,
      currentMonth: this.currentMonth,
    };
  }

  /**
   * Make a rate-limited request with monthly quota tracking
   */
  private async request<T>(
    method: string,
    url: string,
    params?: any,
    priority?: number
  ): Promise<T> {
    // Check monthly quota before making request
    this.checkMonthlyQuota();
    
    return this.rateLimiter.schedule<T>(
      DataSource.COINMARKETCAP,
      async () => {
        try {
          logger.debug(`CoinMarketCap API request: ${method} ${url}`, { params });
          
          const response = await this.axios.request<T>({
            method,
            url,
            params,
          });

          logger.debug(`CoinMarketCap API response: ${method} ${url}`, {
            status: response.status,
            monthlyQuota: this.getMonthlyQuotaStatus(),
          });

          return response.data;
        } catch (error) {
          this.handleError(error as AxiosError, url);
          throw error;
        }
      },
      priority
    );
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError, endpoint: string): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      logger.error(`CoinMarketCap API error: ${status}`, {
        endpoint,
        status,
        error: data?.status?.error_message || error.message,
      });

      throw new ProviderError(
        data?.status?.error_message || `HTTP ${status}`,
        DataSource.COINMARKETCAP,
        status,
        error
      );
    } else if (error.request) {
      logger.error('CoinMarketCap network error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        'Network error',
        DataSource.COINMARKETCAP,
        undefined,
        error
      );
    } else {
      logger.error('CoinMarketCap request error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        error.message,
        DataSource.COINMARKETCAP,
        undefined,
        error
      );
    }
  }

  /**
   * Get latest market quotes for one or more cryptocurrencies
   * @param symbols Comma-separated list of symbols (e.g., "BTC,ETH")
   * @param convert Target currency (default: USD)
   */
  async getQuotesBySymbol(
    symbols: string | string[],
    convert: string = 'USD'
  ): Promise<CoinMarketCapQuote> {
    const symbolsStr = Array.isArray(symbols) ? symbols.join(',') : symbols;

    return this.request<CoinMarketCapQuote>('GET', '/cryptocurrency/quotes/latest', {
      symbol: symbolsStr,
      convert,
    });
  }

  /**
   * Get latest market quotes by CMC ID
   * @param ids Comma-separated list of CMC IDs
   * @param convert Target currency (default: USD)
   */
  async getQuotesById(
    ids: string | number | Array<string | number>,
    convert: string = 'USD'
  ): Promise<CoinMarketCapQuote> {
    const idsStr = Array.isArray(ids) ? ids.join(',') : String(ids);

    return this.request<CoinMarketCapQuote>('GET', '/cryptocurrency/quotes/latest', {
      id: idsStr,
      convert,
    });
  }

  /**
   * Get a paginated list of all active cryptocurrencies with latest market data
   * @param start Starting position
   * @param limit Number of results (max 5000)
   * @param convert Target currency
   * @param sort Sort field
   * @param sortDir Sort direction (asc/desc)
   * @param cryptocurrencyType Type filter (all/coins/tokens)
   */
  async getListingsLatest(
    start: number = 1,
    limit: number = 100,
    convert: string = 'USD',
    sort: string = 'market_cap',
    sortDir: 'asc' | 'desc' = 'desc',
    cryptocurrencyType: 'all' | 'coins' | 'tokens' = 'all'
  ): Promise<CoinMarketCapListing> {
    return this.request<CoinMarketCapListing>('GET', '/cryptocurrency/listings/latest', {
      start,
      limit: Math.min(limit, 5000),
      convert,
      sort,
      sort_dir: sortDir,
      cryptocurrency_type: cryptocurrencyType,
    });
  }

  /**
   * Get OHLCV data for a cryptocurrency
   * @param id CMC ID
   * @param convert Target currency
   * @param timePeriod Time period (hourly/daily/weekly/monthly/yearly)
   * @param timeStart Start time (Unix timestamp or ISO 8601)
   * @param timeEnd End time (Unix timestamp or ISO 8601)
   * @param count Number of data points to return
   * @param interval Interval (1h/2h/3h/4h/6h/12h/1d/2d/3d/7d/14d/15d/30d/60d/90d/365d)
   */
  async getOHLCV(
    id: number,
    convert: string = 'USD',
    timePeriod: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily',
    timeStart?: string | number,
    timeEnd?: string | number,
    count?: number,
    interval?: string
  ): Promise<CoinMarketCapOHLCV> {
    const params: any = {
      id,
      convert,
      time_period: timePeriod,
    };

    if (timeStart) params.time_start = timeStart;
    if (timeEnd) params.time_end = timeEnd;
    if (count) params.count = count;
    if (interval) params.interval = interval;

    return this.request<CoinMarketCapOHLCV>('GET', '/cryptocurrency/ohlcv/historical', params);
  }

  /**
   * Get metadata for one or more cryptocurrencies
   * @param ids Comma-separated CMC IDs
   */
  async getMetadataById(
    ids: string | number | Array<string | number>
  ): Promise<any> {
    const idsStr = Array.isArray(ids) ? ids.join(',') : String(ids);

    return this.request<any>('GET', '/cryptocurrency/info', {
      id: idsStr,
    });
  }

  /**
   * Get metadata by symbol
   * @param symbols Comma-separated symbols
   */
  async getMetadataBySymbol(
    symbols: string | string[]
  ): Promise<any> {
    const symbolsStr = Array.isArray(symbols) ? symbols.join(',') : symbols;

    return this.request<any>('GET', '/cryptocurrency/info', {
      symbol: symbolsStr,
    });
  }

  /**
   * Get CoinMarketCap ID map
   * @param listingStatus Filter by listing status
   * @param start Starting position
   * @param limit Number of results (max 5000)
   * @param sort Sort field
   * @param symbol Filter by symbols
   */
  async getIdMap(
    listingStatus: 'active' | 'inactive' | 'untracked' = 'active',
    start: number = 1,
    limit: number = 100,
    sort: string = 'id',
    symbol?: string[]
  ): Promise<any> {
    const params: any = {
      listing_status: listingStatus,
      start,
      limit: Math.min(limit, 5000),
      sort,
    };

    if (symbol && symbol.length > 0) {
      params.symbol = symbol.join(',');
    }

    return this.request<any>('GET', '/cryptocurrency/map', params);
  }

  /**
   * Get categories
   * @param start Starting position
   * @param limit Number of results
   */
  async getCategories(
    start: number = 1,
    limit: number = 100
  ): Promise<any> {
    return this.request<any>('GET', '/cryptocurrency/categories', {
      start,
      limit,
    });
  }

  /**
   * Get category data
   * @param id Category ID
   * @param start Starting position
   * @param limit Number of results
   * @param convert Target currency
   */
  async getCategory(
    id: string,
    start: number = 1,
    limit: number = 100,
    convert: string = 'USD'
  ): Promise<any> {
    return this.request<any>('GET', '/cryptocurrency/category', {
      id,
      start,
      limit,
      convert,
    });
  }

  /**
   * Get global market metrics
   * @param convert Target currency
   */
  async getGlobalMetrics(convert: string = 'USD'): Promise<any> {
    return this.request<any>('GET', '/global-metrics/quotes/latest', {
      convert,
    });
  }

  /**
   * Get API key info and usage statistics
   */
  async getKeyInfo(): Promise<any> {
    try {
      return await this.request<any>('GET', '/key/info');
    } catch (error) {
      logger.warn('Failed to get API key info', { error });
      return null;
    }
  }

  /**
   * Ping the API
   */
  async ping(): Promise<boolean> {
    try {
      await this.request<any>('GET', '/key/info');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.ping();
    } catch (error) {
      logger.error('CoinMarketCap health check failed', { error });
      return false;
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): any {
    return this.rateLimiter.getCounts(DataSource.COINMARKETCAP);
  }
}

export default CoinMarketCapRestClient;

