/**
 * Messari REST API Client
 * Enterprise-grade implementation for token unlock and vesting data
 * 
 * API Documentation: https://messari.io/api/docs
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { ProviderConfig, DataSource, ProviderError } from '../types';
import {
  MessariAsset,
  MessariAllocation,
  MessariUnlockEvent,
  MessariVestingSchedule,
  MessariAssetMetrics,
  MessariTokenomicsData,
  MessariResponse,
  MessariPaginatedResponse,
  MessariUnlocksQueryParams,
  MessariAssetQueryParams,
  MessariTimeseriesQueryParams,
  NormalizedTokenUnlock,
  TokenUnlockAlert,
} from '../types/messari.types';
import { getRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

export class MessariRestClient {
  private axios: AxiosInstance;
  private config: ProviderConfig;
  private rateLimiter = getRateLimiter();

  constructor(config: ProviderConfig) {
    this.config = config;

    // Initialize axios instance
    this.axios = axios.create({
      baseURL: config.apiUrl || 'https://data.messari.io/api/v1',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'x-messari-api-key': config.apiKey,
      },
    });

    // Configure axios-retry for resilience
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
        logger.warn(`Messari request retry #${retryCount}`, {
          error: error.message,
          url: error.config?.url,
        });
        if (config.retry.onRetry) {
          config.retry.onRetry(retryCount, error);
        }
      },
    });

    // Register rate limiter
    this.rateLimiter.register(DataSource.MESSARI, config.rateLimit);

    logger.info('Messari REST client initialized', {
      baseURL: config.apiUrl || 'https://data.messari.io/api/v1',
      rateLimitPerMinute: config.rateLimit.maxRequestsPerMinute,
    });
  }

  /**
   * Make a rate-limited request with automatic backoff
   */
  private async request<T>(
    method: string,
    url: string,
    params?: any,
    priority?: number
  ): Promise<T> {
    return this.rateLimiter.schedule<T>(
      DataSource.MESSARI,
      async () => {
        try {
          logger.debug(`Messari API request: ${method} ${url}`, { params });
          
          const response = await this.axios.request<T>({
            method,
            url,
            params,
          });

          logger.debug(`Messari API response: ${method} ${url}`, {
            status: response.status,
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
   * Handle API errors with detailed logging
   */
  private handleError(error: AxiosError, endpoint: string): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      logger.error(`Messari API error: ${status}`, {
        endpoint,
        status,
        error: data?.status?.error_message || error.message,
      });

      throw new ProviderError(
        data?.status?.error_message || `HTTP ${status}`,
        DataSource.MESSARI,
        status,
        error
      );
    } else if (error.request) {
      logger.error('Messari network error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        'Network error',
        DataSource.MESSARI,
        undefined,
        error
      );
    } else {
      logger.error('Messari request error', {
        endpoint,
        error: error.message,
      });
      throw new ProviderError(
        error.message,
        DataSource.MESSARI,
        undefined,
        error
      );
    }
  }

  /**
   * Get all assets
   * @param params Query parameters
   */
  async getAssets(params?: MessariAssetQueryParams): Promise<MessariAsset[]> {
    const response = await this.request<MessariPaginatedResponse<MessariAsset>>(
      'GET',
      '/assets',
      params
    );
    return response.data;
  }

  /**
   * Get a specific asset by slug
   * @param assetSlug Asset slug (e.g., 'bitcoin', 'ethereum')
   * @param params Query parameters
   */
  async getAsset(
    assetSlug: string,
    params?: MessariAssetQueryParams
  ): Promise<MessariAsset> {
    const response = await this.request<MessariResponse<MessariAsset>>(
      'GET',
      `/assets/${assetSlug}`,
      params
    );
    return response.data;
  }

  /**
   * Get asset metrics (market data, supply, etc.)
   * @param assetSlug Asset slug
   */
  async getAssetMetrics(assetSlug: string): Promise<MessariAssetMetrics> {
    const response = await this.request<MessariResponse<MessariAssetMetrics>>(
      'GET',
      `/assets/${assetSlug}/metrics`,
      { fields: 'all' }
    );
    return response.data;
  }

  /**
   * Get asset allocations (token distribution)
   * @param assetSlug Asset slug
   */
  async getAssetAllocations(assetSlug: string): Promise<MessariAllocation[]> {
    const response = await this.request<MessariPaginatedResponse<MessariAllocation>>(
      'GET',
      `/assets/${assetSlug}/allocations`
    );
    return response.data;
  }

  /**
   * Get upcoming token unlock events
   * @param params Query parameters
   */
  async getUpcomingUnlocks(
    params?: MessariUnlocksQueryParams
  ): Promise<MessariUnlockEvent[]> {
    const queryParams: any = {
      ...params,
      start_date: params?.start_date || new Date().toISOString().split('T')[0],
    };

    const response = await this.request<MessariPaginatedResponse<MessariUnlockEvent>>(
      'GET',
      '/events/unlocks/upcoming',
      queryParams
    );
    return response.data;
  }

  /**
   * Get historical token unlock events
   * @param params Query parameters
   */
  async getHistoricalUnlocks(
    params?: MessariUnlocksQueryParams
  ): Promise<MessariUnlockEvent[]> {
    const response = await this.request<MessariPaginatedResponse<MessariUnlockEvent>>(
      'GET',
      '/events/unlocks/historical',
      params
    );
    return response.data;
  }

  /**
   * Get token unlock events for a specific asset
   * @param assetSlug Asset slug
   * @param params Query parameters
   */
  async getAssetUnlocks(
    assetSlug: string,
    params?: MessariUnlocksQueryParams
  ): Promise<MessariUnlockEvent[]> {
    const response = await this.request<MessariPaginatedResponse<MessariUnlockEvent>>(
      'GET',
      `/assets/${assetSlug}/events/unlocks`,
      params
    );
    return response.data;
  }

  /**
   * Get vesting schedules for a specific asset
   * @param assetSlug Asset slug
   */
  async getAssetVestingSchedules(
    assetSlug: string
  ): Promise<MessariVestingSchedule[]> {
    const response = await this.request<MessariPaginatedResponse<MessariVestingSchedule>>(
      'GET',
      `/assets/${assetSlug}/vesting`
    );
    return response.data;
  }

  /**
   * Get comprehensive tokenomics data for an asset
   * @param assetSlug Asset slug
   */
  async getAssetTokenomics(assetSlug: string): Promise<MessariTokenomicsData> {
    // Fetch all related data in parallel for performance
    const [asset, metrics, allocations, vestingSchedules, upcomingUnlocks, historicalUnlocks] = 
      await Promise.all([
        this.getAsset(assetSlug),
        this.getAssetMetrics(assetSlug).catch(() => null),
        this.getAssetAllocations(assetSlug).catch(() => []),
        this.getAssetVestingSchedules(assetSlug).catch(() => []),
        this.getAssetUnlocks(assetSlug, { 
          start_date: new Date().toISOString().split('T')[0] 
        }).catch(() => []),
        this.getAssetUnlocks(assetSlug, { 
          end_date: new Date().toISOString().split('T')[0] 
        }).catch(() => []),
      ]);

    // Calculate supply distribution from allocations
    const supplyDistribution = allocations.map(allocation => ({
      category: allocation.category,
      label: allocation.label,
      amount: allocation.amount,
      percentage: allocation.percentage || 0,
      is_locked: !!allocation.vesting_schedule || !!allocation.unlock_schedule,
      unlock_date: allocation.unlock_schedule?.[0]?.date,
    }));

    return {
      asset_id: asset.id,
      asset_symbol: asset.symbol,
      asset_name: asset.name,
      total_supply: metrics?.supply.y_2050,
      max_supply: metrics?.supply.y_2050,
      circulating_supply: metrics?.supply.circulating,
      liquid_supply: metrics?.supply.liquid,
      supply_distribution: supplyDistribution,
      vesting_schedules: vestingSchedules,
      upcoming_unlocks: upcomingUnlocks,
      historical_unlocks: historicalUnlocks,
      inflation_rate_annual: metrics?.supply.annual_inflation_percent,
    };
  }

  /**
   * Get asset timeseries data
   * @param assetSlug Asset slug
   * @param metric Metric name (e.g., 'price', 'volume', 'marketcap')
   * @param params Query parameters
   */
  async getAssetTimeseries(
    assetSlug: string,
    metric: string,
    params?: MessariTimeseriesQueryParams
  ): Promise<any> {
    const response = await this.request<MessariResponse<any>>(
      'GET',
      `/assets/${assetSlug}/metrics/${metric}/time-series`,
      params
    );
    return response.data;
  }

  /**
   * Normalize unlock event to Coinet format
   */
  private normalizeUnlockEvent(
    event: MessariUnlockEvent,
    currentPrice?: number
  ): NormalizedTokenUnlock {
    const unlockAmountUsd = event.unlock_amount_usd || 
      (event.unlock_amount * (currentPrice || event.price_at_unlock_usd || 0));

    const impactScore = this.calculateImpactScore(event, unlockAmountUsd);
    const severity = this.determineSeverity(impactScore);

    return {
      id: event.id,
      source: 'messari',
      assetId: event.asset_id,
      symbol: event.asset_symbol,
      name: event.asset_name,
      unlockDate: new Date(event.date),
      unlockAmount: event.unlock_amount,
      unlockAmountUsd: unlockAmountUsd,
      unlockPercentage: event.unlock_percentage || 0,
      category: event.category,
      label: event.label,
      description: event.description,
      circulatingSupplyBefore: event.circulating_supply_before,
      circulatingSupplyAfter: event.circulating_supply_after,
      marketCapBeforeUsd: event.market_cap_before_usd,
      marketCapAfterUsd: event.market_cap_after_usd,
      priceAtUnlockUsd: event.price_at_unlock_usd,
      impactScore,
      severity,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Calculate impact score for an unlock event (0-100)
   */
  private calculateImpactScore(
    event: MessariUnlockEvent,
    unlockAmountUsd: number
  ): number {
    let score = 0;

    // Factor 1: Unlock percentage (max 40 points)
    if (event.unlock_percentage) {
      score += Math.min(event.unlock_percentage * 4, 40);
    }

    // Factor 2: USD value relative to market cap (max 30 points)
    if (event.market_cap_before_usd && unlockAmountUsd) {
      const percentOfMarketCap = (unlockAmountUsd / event.market_cap_before_usd) * 100;
      score += Math.min(percentOfMarketCap * 3, 30);
    }

    // Factor 3: Category risk (max 30 points)
    const categoryRisk: Record<string, number> = {
      'team': 25,
      'investor': 20,
      'treasury': 10,
      'foundation': 10,
      'community': 5,
      'public': 3,
    };
    score += categoryRisk[event.category.toLowerCase()] || 15;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Determine severity level based on impact score
   */
  private determineSeverity(impactScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (impactScore >= 80) return 'critical';
    if (impactScore >= 60) return 'high';
    if (impactScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get normalized upcoming unlocks with impact analysis
   * @param daysAhead Number of days to look ahead (default: 30)
   * @param minImpactScore Minimum impact score to include (default: 0)
   */
  async getUpcomingUnlocksNormalized(
    daysAhead: number = 30,
    minImpactScore: number = 0
  ): Promise<NormalizedTokenUnlock[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const unlocks = await this.getUpcomingUnlocks({
      start_date: new Date().toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });

    const normalized = unlocks.map(event => this.normalizeUnlockEvent(event));

    return normalized.filter(unlock => (unlock.impactScore ?? 0) >= minImpactScore);
  }

  /**
   * Generate alerts for high-impact upcoming unlocks
   * @param daysAhead Number of days to look ahead
   * @param minSeverity Minimum severity level
   */
  async generateUnlockAlerts(
    daysAhead: number = 7,
    minSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<TokenUnlockAlert[]> {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const minSeverityIndex = severityOrder.indexOf(minSeverity);

    const unlocks = await this.getUpcomingUnlocksNormalized(daysAhead);

    return unlocks
      .filter(unlock => {
        const severity = unlock.severity || 'low';
        return severityOrder.indexOf(severity) >= minSeverityIndex;
      })
      .map(unlock => {
        const severity = unlock.severity || 'low';
        const daysUntil = Math.ceil(
          (unlock.unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const percentOfMarketCap = unlock.marketCapBeforeUsd
          ? (unlock.unlockAmountUsd / unlock.marketCapBeforeUsd) * 100
          : 0;

        let message = `${unlock.symbol} unlock in ${daysUntil} days: `;
        message += `${unlock.unlockAmount.toLocaleString()} tokens `;
        message += `($${unlock.unlockAmountUsd.toLocaleString()}) `;
        message += `- ${unlock.unlockPercentage.toFixed(2)}% of supply`;

        let recommendedAction = '';
        if (unlock.severity === 'critical') {
          recommendedAction = 'High selling pressure expected. Consider reducing exposure.';
        } else if (unlock.severity === 'high') {
          recommendedAction = 'Moderate selling pressure likely. Monitor closely.';
        } else if (unlock.severity === 'medium') {
          recommendedAction = 'Some selling pressure possible. Watch price action.';
        }

        return {
          unlockId: unlock.id,
          assetSymbol: unlock.symbol,
          daysUntilUnlock: daysUntil,
          unlockAmountUsd: unlock.unlockAmountUsd,
          percentOfMarketCap,
          severity: severity,
          message,
          recommendedAction,
        };
      })
      .sort((a, b) => a.daysUntilUnlock - b.daysUntilUnlock);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getAssets({ with_profiles: false });
      return true;
    } catch (error) {
      logger.error('Messari health check failed', { error });
      return false;
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): any {
    return this.rateLimiter.getCounts(DataSource.MESSARI);
  }
}

export default MessariRestClient;

