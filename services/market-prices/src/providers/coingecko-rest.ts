/**
 * CoinGecko REST API Client
 * Implements all required endpoints with rate limiting and retry logic
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import {
  ProviderConfig,
  DataSource,
  CoinGeckoSimplePrice,
  CoinGeckoMarket,
  CoinGeckoOHLC,
  CoinGeckoCoin,
  MarketPrice,
  OHLCV,
  CoinMetadata,
  TickerData,
  ProviderError,
  PriceUpdateType,
} from '../types';
import { getRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { getQuotaMonitor } from '../services/quota-monitor.service';
import { getCircuitBreakerManager } from '../middleware/circuit-breaker';
import { RateLimitHandler } from '../middleware/rate-limit-handler';

export class CoinGeckoRestClient {
  private axios: AxiosInstance;
  private config: ProviderConfig;
  private rateLimiter = getRateLimiter();
  private quotaMonitor = getQuotaMonitor();
  private circuitBreaker = getCircuitBreakerManager().getBreaker(DataSource.COINGECKO);

  constructor(config: ProviderConfig) {
    this.config = config;

    // Initialize axios instance
    this.axios = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'x-cg-pro-api-key': config.apiKey,
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
        logger.warn(`CoinGecko request retry #${retryCount}`, {
          error: error.message,
          url: error.config?.url,
        });
        if (config.retry.onRetry) {
          config.retry.onRetry(retryCount, error);
        }
      },
    });

    // Register rate limiter
    this.rateLimiter.register(DataSource.COINGECKO, config.rateLimit);

    logger.info('CoinGecko REST client initialized', {
      baseURL: config.apiUrl,
      rateLimitPerMinute: config.rateLimit.maxRequestsPerMinute,
    });
  }

  /**
   * Make a rate-limited request with circuit breaker protection
   */
  private async request<T>(
    method: string,
    url: string,
    params?: any,
    priority?: number
  ): Promise<T> {
    return this.rateLimiter.schedule<T>(
      DataSource.COINGECKO,
      async () => {
        return this.circuitBreaker.execute(async () => {
          try {
            logger.debug(`CoinGecko API request: ${method} ${url}`, { params });
            
            const response = await this.axios.request<T>({
              method,
              url,
              params,
            });

            // Record quota usage
            this.quotaMonitor.recordUsage(DataSource.COINGECKO, response.headers);

            logger.debug(`CoinGecko API response: ${method} ${url}`, {
              status: response.status,
              quotaRemaining: response.headers['x-ratelimit-remaining'],
              creditsUsed: response.headers['x-cg-credits-used'],
            });

            return response.data;
          } catch (error) {
            const axiosError = error as AxiosError;
            
            // Handle 429 rate limit errors with proper retry-after
            if (axiosError.response?.status === 429) {
              const rateLimitError = RateLimitHandler.createRateLimitError(
                axiosError,
                DataSource.COINGECKO
              );
              throw rateLimitError;
            }
            
            this.handleError(axiosError, url);
            throw error;
          }
        });
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

      logger.error(`CoinGecko API error: ${status}`, {
        endpoint,
        status,
        error: data?.error || data?.status?.error_message || error.message,
      });

      throw new ProviderError(
        data?.error || data?.status?.error_message || `HTTP ${status}`,
        DataSource.COINGECKO,
        status,
        error
      );
    } else if (error.request) {
      logger.error('CoinGecko network error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        'Network error',
        DataSource.COINGECKO,
        undefined,
        error
      );
    } else {
      logger.error('CoinGecko request error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        error.message,
        DataSource.COINGECKO,
        undefined,
        error
      );
    }
  }

  /**
   * Get simple price for one or more coins
   * @param ids Coin IDs (comma-separated)
   * @param vsCurrencies Target currencies (comma-separated)
   * @param includeMarketCap Include market cap
   * @param include24hrVol Include 24h volume
   * @param include24hrChange Include 24h change
   * @param includeLastUpdatedAt Include last updated timestamp
   */
  async getSimplePrice(
    ids: string | string[],
    vsCurrencies: string | string[] = 'usd',
    includeMarketCap: boolean = true,
    include24hrVol: boolean = true,
    include24hrChange: boolean = true,
    includeLastUpdatedAt: boolean = true
  ): Promise<CoinGeckoSimplePrice> {
    const idsStr = Array.isArray(ids) ? ids.join(',') : ids;
    const currenciesStr = Array.isArray(vsCurrencies) ? vsCurrencies.join(',') : vsCurrencies;

    return this.request<CoinGeckoSimplePrice>('GET', '/simple/price', {
      ids: idsStr,
      vs_currencies: currenciesStr,
      include_market_cap: includeMarketCap,
      include_24hr_vol: include24hrVol,
      include_24hr_change: include24hrChange,
      include_last_updated_at: includeLastUpdatedAt,
    });
  }

  /**
   * Get coin markets data
   * @param vsCurrency Target currency (default: usd)
   * @param ids Coin IDs to filter
   * @param category Filter by category
   * @param order Sort order
   * @param perPage Results per page (max 250)
   * @param page Page number
   * @param sparkline Include sparkline 7d data
   * @param priceChangePercentage Time frames for price change (1h,24h,7d,14d,30d,200d,1y)
   */
  async getCoinMarkets(
    vsCurrency: string = 'usd',
    ids?: string[],
    category?: string,
    order: string = 'market_cap_desc',
    perPage: number = 100,
    page: number = 1,
    sparkline: boolean = false,
    priceChangePercentage?: string
  ): Promise<CoinGeckoMarket[]> {
    const params: any = {
      vs_currency: vsCurrency,
      order,
      per_page: Math.min(perPage, 250),
      page,
      sparkline,
    };

    if (ids && ids.length > 0) {
      params.ids = ids.join(',');
    }
    if (category) {
      params.category = category;
    }
    if (priceChangePercentage) {
      params.price_change_percentage = priceChangePercentage;
    }

    return this.request<CoinGeckoMarket[]>('GET', '/coins/markets', params);
  }

  /**
   * Get OHLC (candles) data
   * @param id Coin ID
   * @param vsCurrency Target currency
   * @param days Data up to number of days ago (1/7/14/30/90/180/365/max)
   */
  async getOHLC(
    id: string,
    vsCurrency: string = 'usd',
    days: number | 'max' = 7
  ): Promise<number[][]> {
    const response = await this.request<number[][]>('GET', `/coins/${id}/ohlc`, {
      vs_currency: vsCurrency,
      days,
    });

    return response;
  }

  /**
   * Get coin metadata by ID
   * @param id Coin ID
   * @param localization Include all localized languages
   * @param tickers Include tickers data
   * @param marketData Include market data
   * @param communityData Include community data
   * @param developerData Include developer data
   * @param sparkline Include sparkline 7d data
   */
  async getCoinById(
    id: string,
    localization: boolean = false,
    tickers: boolean = true,
    marketData: boolean = true,
    communityData: boolean = false,
    developerData: boolean = false,
    sparkline: boolean = false
  ): Promise<CoinGeckoCoin> {
    return this.request<CoinGeckoCoin>('GET', `/coins/${id}`, {
      localization,
      tickers,
      market_data: marketData,
      community_data: communityData,
      developer_data: developerData,
      sparkline,
    });
  }

  /**
   * Get coin tickers by ID
   * @param id Coin ID
   * @param exchangeIds Filter by exchange IDs
   * @param includeExchangeLogo Include exchange logo
   * @param page Page number
   * @param order Sort order
   * @param depth Include 2% orderbook depth
   */
  async getCoinTickers(
    id: string,
    exchangeIds?: string[],
    includeExchangeLogo: boolean = false,
    page: number = 1,
    order: string = 'trust_score_desc',
    depth: boolean = false
  ): Promise<any> {
    const params: any = {
      include_exchange_logo: includeExchangeLogo,
      page,
      order,
      depth,
    };

    if (exchangeIds && exchangeIds.length > 0) {
      params.exchange_ids = exchangeIds.join(',');
    }

    return this.request<any>('GET', `/coins/${id}/tickers`, params);
  }

  /**
   * Get list of all supported coins with id, name, and symbol
   * @param includePlatform Include platform contract addresses
   */
  async getCoinsList(includePlatform: boolean = true): Promise<any[]> {
    return this.request<any[]>('GET', '/coins/list', {
      include_platform: includePlatform,
    });
  }

  /**
   * Get list of all supported categories
   */
  async getCategories(): Promise<any[]> {
    return this.request<any[]>('GET', '/coins/categories/list');
  }

  /**
   * Get categories with market data
   * @param order Sort order
   */
  async getCategoriesWithData(order: string = 'market_cap_desc'): Promise<any[]> {
    return this.request<any[]>('GET', '/coins/categories', {
      order,
    });
  }

  /**
   * Ping the API to check if it's accessible
   */
  async ping(): Promise<{ gecko_says: string }> {
    return this.request<{ gecko_says: string }>('GET', '/ping');
  }

  /**
   * Get API usage statistics (for Pro API users)
   */
  async getApiUsage(): Promise<any> {
    try {
      return await this.request<any>('GET', '/key');
    } catch (error) {
      // This endpoint might not be available on all tiers
      logger.warn('Failed to get API usage stats', { error });
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.ping();
      return result.gecko_says === '(V3) To the Moon!';
    } catch (error) {
      logger.error('CoinGecko health check failed', { error });
      return false;
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): any {
    return this.rateLimiter.getCounts(DataSource.COINGECKO);
  }
}

export default CoinGeckoRestClient;

