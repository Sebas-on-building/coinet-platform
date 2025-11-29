/**
 * CryptoRank REST API Client
 * Free-tier token unlock data aggregation
 * 
 * API Documentation: https://cryptorank.io/api
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { ProviderConfig, DataSource, ProviderError } from '../types';
import { getRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

// CryptoRank Types
export interface CryptoRankUnlock {
  id: string;
  coinId: string;
  coinSymbol: string;
  coinName: string;
  eventDate: string;
  eventType: 'cliff' | 'linear' | 'immediate' | 'other';
  tokensToUnlock: number;
  tokensToUnlockUsd: number;
  percentOfTotalSupply: number;
  percentOfCirculatingSupply: number;
  category: string;
  description?: string;
  source: string;
  verified: boolean;
}

export interface CryptoRankVestingSchedule {
  id: string;
  coinId: string;
  coinSymbol: string;
  category: string;
  allocation: number;
  allocationPercent: number;
  vestingType: 'linear' | 'cliff' | 'hybrid';
  startDate: string;
  endDate: string;
  cliffMonths?: number;
  vestingMonths?: number;
  tge: number; // Token Generation Event unlock %
}

export interface CryptoRankTokenomics {
  coinId: string;
  symbol: string;
  name: string;
  totalSupply: number;
  maxSupply: number | null;
  circulatingSupply: number;
  inflationRate: number;
  distributions: CryptoRankDistribution[];
}

export interface CryptoRankDistribution {
  category: string;
  percentage: number;
  tokens: number;
  isLocked: boolean;
  vestingEnd?: string;
}

export interface NormalizedCryptoRankUnlock {
  id: string;
  source: 'cryptorank';
  symbol: string;
  name: string;
  unlockDate: Date;
  unlockAmount: number;
  unlockAmountUsd: number;
  percentOfTotalSupply: number;
  percentOfCirculatingSupply: number;
  category: string;
  eventType: string;
  verified: boolean;
  impactScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class CryptoRankRestClient {
  private axios: AxiosInstance;
  private config: ProviderConfig;
  private rateLimiter = getRateLimiter();

  constructor(config: ProviderConfig) {
    this.config = config;

    // CryptoRank free tier: 10 requests/minute
    const baseURL = config.apiUrl || 'https://api.cryptorank.io/v1';

    this.axios = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        ...(config.apiKey && { 'X-API-KEY': config.apiKey }),
      },
    });

    // Configure retry
    axiosRetry(this.axios, {
      retries: config.retry?.retries || 3,
      retryDelay: (retryCount) => retryCount * (config.retry?.retryDelay || 1000),
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status || 0) >= 500 ||
               error.response?.status === 429;
      },
      onRetry: (retryCount, error) => {
        logger.warn(`CryptoRank retry #${retryCount}`, {
          error: error.message,
          url: error.config?.url,
        });
      },
    });

    // Register rate limiter (free tier: 10/min)
    this.rateLimiter.register(DataSource.CRYPTORANK, {
      maxRequestsPerMinute: config.rateLimit?.maxRequestsPerMinute || 10,
      reservoir: 10,
      reservoirRefreshAmount: 10,
      reservoirRefreshInterval: 60000,
    });

    logger.info('CryptoRank REST client initialized', { baseURL });
  }

  /**
   * Rate-limited request
   */
  private async request<T>(
    method: string,
    url: string,
    params?: any
  ): Promise<T> {
    return this.rateLimiter.schedule<T>(
      DataSource.CRYPTORANK,
      async () => {
        try {
          const response = await this.axios.request<{ data: T }>({
            method,
            url,
            params,
          });
          return response.data.data;
        } catch (error) {
          this.handleError(error as AxiosError, url);
          throw error;
        }
      }
    );
  }

  private handleError(error: AxiosError, endpoint: string): void {
    if (error.response) {
      const status = error.response.status;
      logger.error(`CryptoRank API error: ${status}`, { endpoint, status });
      throw new ProviderError(
        `HTTP ${status}`,
        DataSource.CRYPTORANK,
        status,
        error
      );
    }
    throw new ProviderError('Network error', DataSource.CRYPTORANK, undefined, error);
  }

  /**
   * Get upcoming token unlocks
   */
  async getUpcomingUnlocks(options?: {
    limit?: number;
    daysAhead?: number;
    minUsdValue?: number;
  }): Promise<CryptoRankUnlock[]> {
    const params = {
      limit: options?.limit || 100,
      days_ahead: options?.daysAhead || 90,
      min_usd: options?.minUsdValue || 100000,
    };

    return this.request<CryptoRankUnlock[]>('GET', '/events/unlocks/upcoming', params);
  }

  /**
   * Get historical unlocks
   */
  async getHistoricalUnlocks(options?: {
    limit?: number;
    daysPast?: number;
    symbol?: string;
  }): Promise<CryptoRankUnlock[]> {
    const params = {
      limit: options?.limit || 100,
      days_past: options?.daysPast || 90,
      ...(options?.symbol && { symbol: options.symbol }),
    };

    return this.request<CryptoRankUnlock[]>('GET', '/events/unlocks/historical', params);
  }

  /**
   * Get unlocks for a specific token
   */
  async getTokenUnlocks(symbol: string): Promise<CryptoRankUnlock[]> {
    return this.request<CryptoRankUnlock[]>('GET', `/coins/${symbol}/unlocks`);
  }

  /**
   * Get vesting schedule for a token
   */
  async getVestingSchedule(symbol: string): Promise<CryptoRankVestingSchedule[]> {
    return this.request<CryptoRankVestingSchedule[]>('GET', `/coins/${symbol}/vesting`);
  }

  /**
   * Get tokenomics data
   */
  async getTokenomics(symbol: string): Promise<CryptoRankTokenomics> {
    return this.request<CryptoRankTokenomics>('GET', `/coins/${symbol}/tokenomics`);
  }

  /**
   * Normalize unlock to standard format
   */
  normalizeUnlock(unlock: CryptoRankUnlock): NormalizedCryptoRankUnlock {
    const impactScore = this.calculateImpactScore(unlock);
    
    return {
      id: `cryptorank-${unlock.id}`,
      source: 'cryptorank',
      symbol: unlock.coinSymbol,
      name: unlock.coinName,
      unlockDate: new Date(unlock.eventDate),
      unlockAmount: unlock.tokensToUnlock,
      unlockAmountUsd: unlock.tokensToUnlockUsd,
      percentOfTotalSupply: unlock.percentOfTotalSupply,
      percentOfCirculatingSupply: unlock.percentOfCirculatingSupply,
      category: unlock.category,
      eventType: unlock.eventType,
      verified: unlock.verified,
      impactScore,
      severity: this.determineSeverity(impactScore),
    };
  }

  /**
   * Calculate impact score (0-100)
   */
  private calculateImpactScore(unlock: CryptoRankUnlock): number {
    let score = 0;

    // Factor 1: Percent of circulating supply (max 40)
    score += Math.min(unlock.percentOfCirculatingSupply * 4, 40);

    // Factor 2: USD value (max 30)
    if (unlock.tokensToUnlockUsd > 100_000_000) score += 30;
    else if (unlock.tokensToUnlockUsd > 50_000_000) score += 25;
    else if (unlock.tokensToUnlockUsd > 10_000_000) score += 20;
    else if (unlock.tokensToUnlockUsd > 1_000_000) score += 10;
    else score += 5;

    // Factor 3: Event type (max 20)
    const typeRisk: Record<string, number> = {
      'cliff': 20,
      'immediate': 15,
      'linear': 5,
      'other': 10,
    };
    score += typeRisk[unlock.eventType] || 10;

    // Factor 4: Category risk (max 10)
    const categoryRisk: Record<string, number> = {
      'team': 10,
      'investor': 8,
      'advisor': 6,
      'treasury': 4,
      'community': 2,
    };
    score += categoryRisk[unlock.category.toLowerCase()] || 5;

    return Math.min(Math.round(score), 100);
  }

  private determineSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get normalized upcoming unlocks
   */
  async getUpcomingUnlocksNormalized(
    daysAhead: number = 30
  ): Promise<NormalizedCryptoRankUnlock[]> {
    const unlocks = await this.getUpcomingUnlocks({ daysAhead });
    return unlocks.map(u => this.normalizeUnlock(u));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getUpcomingUnlocks({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

export default CryptoRankRestClient;

