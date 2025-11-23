/**
 * The Tie REST API Client
 * Research-grade token unlock data with manual verification
 * 
 * API Documentation: https://thetie.io/api/docs
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { ProviderConfig, DataSource, ProviderError } from '../types';
import {
  TheTieAsset,
  TheTieUnlockEvent,
  TheTieHistoricalUnlock,
  TheTieVestingSchedule,
  TheTieTokenDistribution,
  TheTieUnlockImpactAnalysis,
  TheTieUnlockCalendar,
  TheTieUnlocksQueryParams,
  TheTieAnalyticsQueryParams,
  TheTieResponse,
  TheTiePaginatedResponse,
  UnifiedTokenUnlock,
  TokenUnlockComparison,
} from '../types/thetie.types';
import { NormalizedTokenUnlock } from '../types/messari.types';
import { getRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

export class TheTieRestClient {
  private axios: AxiosInstance;
  private config: ProviderConfig;
  private rateLimiter = getRateLimiter();

  constructor(config: ProviderConfig) {
    this.config = config;

    // Initialize axios instance
    this.axios = axios.create({
      baseURL: config.apiUrl || 'https://api.thetie.io/v1',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
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
        logger.warn(`The Tie request retry #${retryCount}`, {
          error: error.message,
          url: error.config?.url,
        });
        if (config.retry.onRetry) {
          config.retry.onRetry(retryCount, error);
        }
      },
    });

    // Register rate limiter
    this.rateLimiter.register(DataSource.THETIE, config.rateLimit);

    logger.info('The Tie REST client initialized', {
      baseURL: config.apiUrl || 'https://api.thetie.io/v1',
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
    priority?: number
  ): Promise<T> {
    return this.rateLimiter.schedule<T>(
      DataSource.THETIE,
      async () => {
        try {
          logger.debug(`The Tie API request: ${method} ${url}`, { params });
          
          const response = await this.axios.request<TheTieResponse<T>>({
            method,
            url,
            params,
          });

          // Track rate limits from response headers
          const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
          const rateLimitReset = response.headers['x-ratelimit-reset'];
          
          if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
            logger.warn('The Tie rate limit approaching', {
              remaining: rateLimitRemaining,
              resetAt: rateLimitReset,
            });
          }

          logger.debug(`The Tie API response: ${method} ${url}`, {
            status: response.status,
            rateLimitRemaining,
          });

          return response.data.data;
        } catch (error) {
          this.handleError(error as AxiosError, url);
          throw error;
        }
      },
      priority
    );
  }

  /**
   * Make a paginated request
   */
  private async requestPaginated<T>(
    method: string,
    url: string,
    params?: any,
    priority?: number
  ): Promise<T[]> {
    return this.rateLimiter.schedule<T[]>(
      DataSource.THETIE,
      async () => {
        try {
          const response = await this.axios.request<TheTiePaginatedResponse<T>>({
            method,
            url,
            params,
          });

          return response.data.data;
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

      logger.error(`The Tie API error: ${status}`, {
        endpoint,
        status,
        error: data?.error?.message || error.message,
      });

      throw new ProviderError(
        data?.error?.message || `HTTP ${status}`,
        DataSource.THETIE,
        status,
        error
      );
    } else if (error.request) {
      logger.error('The Tie network error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        'Network error',
        DataSource.THETIE,
        undefined,
        error
      );
    } else {
      logger.error('The Tie request error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        error.message,
        DataSource.THETIE,
        undefined,
        error
      );
    }
  }

  /**
   * Get all tracked assets
   */
  async getAssets(): Promise<TheTieAsset[]> {
    return this.requestPaginated<TheTieAsset>(
      'GET',
      '/assets'
    );
  }

  /**
   * Get a specific asset
   * @param ticker Asset ticker (e.g., 'BTC', 'ETH')
   */
  async getAsset(ticker: string): Promise<TheTieAsset> {
    return this.request<TheTieAsset>(
      'GET',
      `/assets/${ticker.toUpperCase()}`
    );
  }

  /**
   * Get upcoming token unlock events
   * @param params Query parameters
   */
  async getUpcomingUnlocks(
    params?: TheTieUnlocksQueryParams
  ): Promise<TheTieUnlockEvent[]> {
    const queryParams = {
      ...params,
      start_date: params?.start_date || new Date().toISOString().split('T')[0],
    };

    return this.requestPaginated<TheTieUnlockEvent>(
      'GET',
      '/unlocks/upcoming',
      queryParams
    );
  }

  /**
   * Get historical token unlock events with impact data
   * @param params Query parameters
   */
  async getHistoricalUnlocks(
    params?: TheTieUnlocksQueryParams
  ): Promise<TheTieHistoricalUnlock[]> {
    return this.requestPaginated<TheTieHistoricalUnlock>(
      'GET',
      '/unlocks/historical',
      params
    );
  }

  /**
   * Get unlock events for a specific asset
   * @param ticker Asset ticker
   * @param params Query parameters
   */
  async getAssetUnlocks(
    ticker: string,
    params?: TheTieUnlocksQueryParams
  ): Promise<TheTieUnlockEvent[]> {
    return this.requestPaginated<TheTieUnlockEvent>(
      'GET',
      `/assets/${ticker.toUpperCase()}/unlocks`,
      params
    );
  }

  /**
   * Get vesting schedules for a specific asset
   * @param ticker Asset ticker
   */
  async getAssetVestingSchedules(
    ticker: string
  ): Promise<TheTieVestingSchedule[]> {
    return this.requestPaginated<TheTieVestingSchedule>(
      'GET',
      `/assets/${ticker.toUpperCase()}/vesting`
    );
  }

  /**
   * Get token distribution for a specific asset
   * @param ticker Asset ticker
   */
  async getAssetDistribution(
    ticker: string
  ): Promise<TheTieTokenDistribution> {
    return this.request<TheTieTokenDistribution>(
      'GET',
      `/assets/${ticker.toUpperCase()}/distribution`
    );
  }

  /**
   * Get unlock impact analysis for a specific event
   * @param ticker Asset ticker
   * @param unlockDate Date of the unlock event
   */
  async getUnlockImpactAnalysis(
    ticker: string,
    unlockDate: string
  ): Promise<TheTieUnlockImpactAnalysis> {
    return this.request<TheTieUnlockImpactAnalysis>(
      'GET',
      `/assets/${ticker.toUpperCase()}/unlocks/${unlockDate}/impact`
    );
  }

  /**
   * Get unlock calendar for a date range
   * @param startDate Start date (ISO 8601)
   * @param endDate End date (ISO 8601)
   */
  async getUnlockCalendar(
    startDate: string,
    endDate: string
  ): Promise<TheTieUnlockCalendar[]> {
    return this.requestPaginated<TheTieUnlockCalendar>(
      'GET',
      '/unlocks/calendar',
      {
        start_date: startDate,
        end_date: endDate,
      }
    );
  }

  /**
   * Normalize unlock event to unified format
   */
  private normalizeUnlockEvent(event: TheTieUnlockEvent | TheTieHistoricalUnlock): UnifiedTokenUnlock {
    const isHistorical = 'price_at_unlock_usd' in event;
    const historicalEvent = isHistorical ? event as TheTieHistoricalUnlock : undefined;

    return {
      id: event.id,
      source: 'thetie',
      ticker: event.ticker,
      name: event.name,
      unlockDate: new Date(event.unlock_date),
      tokensUnlocked: event.tokens_unlocked,
      tokensUnlockedUsd: event.tokens_unlocked_usd || 0,
      percentageOfSupply: event.percentage_of_supply,
      percentageOfCirculating: event.percentage_of_circulating_supply,
      category: event.category,
      allocationType: event.allocation_type,
      isEstimate: event.is_estimated,
      confidenceScore: event.confidence_score,
      priceAtUnlock: historicalEvent?.price_at_unlock_usd,
      marketCapAtUnlock: historicalEvent?.market_cap_at_unlock_usd,
      historicalImpact: historicalEvent ? {
        priceChange1d: historicalEvent.price_change_1d_percent,
        priceChange7d: historicalEvent.price_change_7d_percent,
        priceChange30d: historicalEvent.price_change_30d_percent,
      } : undefined,
      metadata: {
        sourceType: event.source_type,
        lastVerified: event.last_verified_date ? new Date(event.last_verified_date) : undefined,
        notes: event.notes,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get normalized upcoming unlocks
   * @param daysAhead Number of days to look ahead
   * @param minConfidence Minimum confidence score (0-100)
   */
  async getUpcomingUnlocksNormalized(
    daysAhead: number = 30,
    minConfidence: number = 70
  ): Promise<UnifiedTokenUnlock[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const unlocks = await this.getUpcomingUnlocks({
      start_date: new Date().toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      include_estimates: true,
    });

    return unlocks
      .filter(unlock => !unlock.confidence_score || unlock.confidence_score >= minConfidence)
      .map(unlock => this.normalizeUnlockEvent(unlock))
      .sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
  }

  /**
   * Get high-confidence, high-impact upcoming unlocks
   * @param daysAhead Number of days to look ahead
   */
  async getHighImpactUnlocks(
    daysAhead: number = 14
  ): Promise<UnifiedTokenUnlock[]> {
    const unlocks = await this.getUpcomingUnlocksNormalized(daysAhead, 85);

    // Filter for high impact (>5% of supply or >$10M)
    return unlocks.filter(unlock => 
      unlock.percentageOfSupply > 5 || unlock.tokensUnlockedUsd > 10_000_000
    );
  }

  /**
   * Compare unlock data with Messari data to identify discrepancies
   * @param ticker Asset ticker
   * @param messariUnlocks Messari unlock data
   * @param theTieUnlocks The Tie unlock data
   */
  compareUnlockData(
    ticker: string,
    messariUnlocks: NormalizedTokenUnlock[],
    theTieUnlocks: UnifiedTokenUnlock[]
  ): TokenUnlockComparison[] {
    const comparisons: TokenUnlockComparison[] = [];

    // Group by date (within 1 day tolerance)
    const dateGroups = new Map<string, {
      messari?: NormalizedTokenUnlock;
      thetie?: UnifiedTokenUnlock;
    }>();

    messariUnlocks.forEach(unlock => {
      const dateKey = unlock.unlockDate.toISOString().split('T')[0];
      dateGroups.set(dateKey, {
        ...dateGroups.get(dateKey),
        messari: unlock,
      });
    });

    theTieUnlocks.forEach(unlock => {
      const dateKey = unlock.unlockDate.toISOString().split('T')[0];
      dateGroups.set(dateKey, {
        ...dateGroups.get(dateKey),
        thetie: unlock,
      });
    });

    // Compare each date group
    dateGroups.forEach((group, dateKey) => {
      if (!group.messari || !group.thetie) {
        // Data exists in one source but not the other
        comparisons.push({
          ticker,
          unlockDate: new Date(dateKey),
          messariData: group.messari,
          theTieData: group.thetie,
          discrepancies: [{
            field: 'existence',
            messariValue: !!group.messari,
            theTieValue: !!group.thetie,
          }],
          consensusValue: {
            tokensUnlocked: group.messari?.unlockAmount || group.thetie?.tokensUnlocked || 0,
            tokensUnlockedUsd: group.messari?.unlockAmountUsd || group.thetie?.tokensUnlockedUsd || 0,
            percentageOfSupply: group.messari?.unlockPercentage || group.thetie?.percentageOfSupply || 0,
            confidence: 'low',
          },
        });
        return;
      }

      // Both sources have data - compare values
      const discrepancies: TokenUnlockComparison['discrepancies'] = [];

      // Compare unlock amount
      const amountDiff = Math.abs(
        group.messari.unlockAmount - group.thetie.tokensUnlocked
      ) / Math.max(group.messari.unlockAmount, group.thetie.tokensUnlocked);

      if (amountDiff > 0.05) { // More than 5% difference
        discrepancies.push({
          field: 'unlockAmount',
          messariValue: group.messari.unlockAmount,
          theTieValue: group.thetie.tokensUnlocked,
          differencePercent: amountDiff * 100,
        });
      }

      // Compare USD value
      const usdDiff = Math.abs(
        group.messari.unlockAmountUsd - group.thetie.tokensUnlockedUsd
      ) / Math.max(group.messari.unlockAmountUsd, group.thetie.tokensUnlockedUsd);

      if (usdDiff > 0.1) { // More than 10% difference
        discrepancies.push({
          field: 'unlockAmountUsd',
          messariValue: group.messari.unlockAmountUsd,
          theTieValue: group.thetie.tokensUnlockedUsd,
          differencePercent: usdDiff * 100,
        });
      }

      // Determine consensus value (prefer The Tie for high confidence, otherwise average)
      const useTheTie = group.thetie.confidenceScore && group.thetie.confidenceScore > 90;
      const confidence = discrepancies.length === 0 ? 'high' : 
                        discrepancies.length <= 1 ? 'medium' : 'low';

      comparisons.push({
        ticker,
        unlockDate: new Date(dateKey),
        messariData: group.messari,
        theTieData: group.thetie,
        discrepancies,
        consensusValue: {
          tokensUnlocked: useTheTie ? group.thetie.tokensUnlocked :
            (group.messari.unlockAmount + group.thetie.tokensUnlocked) / 2,
          tokensUnlockedUsd: useTheTie ? group.thetie.tokensUnlockedUsd :
            (group.messari.unlockAmountUsd + group.thetie.tokensUnlockedUsd) / 2,
          percentageOfSupply: useTheTie ? group.thetie.percentageOfSupply :
            (group.messari.unlockPercentage + group.thetie.percentageOfSupply) / 2,
          confidence,
        },
      });
    });

    return comparisons.sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getAssets();
      return true;
    } catch (error) {
      logger.error('The Tie health check failed', { error });
      return false;
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): any {
    return this.rateLimiter.getCounts(DataSource.THETIE);
  }
}

export default TheTieRestClient;

