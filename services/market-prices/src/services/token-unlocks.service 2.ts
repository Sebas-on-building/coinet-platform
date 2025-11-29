/**
 * Token Unlocks Service
 * Divine world-class orchestration of token unlock data
 * 
 * Features:
 * - Integration with Messari API
 * - Price feed integration for USD conversion
 * - Asset registry mapping
 * - Intelligent caching and scheduling
 * - Impact analysis and alerts
 * - Historical tracking
 */

import EventEmitter from 'eventemitter3';
import { MessariRestClient } from '../providers/messari-rest';
import { TokenUnlocksCache } from '../storage/token-unlocks-cache';
import { TokenUnlocksStorage } from '../storage/token-unlocks-storage';
import { TokenUnlocksScheduler } from './token-unlocks-scheduler';
import { MarketDataAggregator } from '../aggregator';
import { DataNormalizer, getDataNormalizer } from '../utils/normalizer';
import { logger } from '../utils/logger';
import {
  NormalizedTokenUnlock,
  TokenUnlockAlert,
  MessariTokenomicsData,
  MessariVestingSchedule,
  MessariUnlockEvent,
} from '../types/messari.types';
import { MarketPrice } from '../types';

export interface TokenUnlocksServiceConfig {
  messari: {
    apiKey: string;
    apiUrl?: string;
  };
  cache: {
    host: string;
    port: number;
    password?: string;
    db: number;
    defaultTTL: number;
    nearTermThreshold: number;
    nearTermTTL: number;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  scheduler: {
    dailyPollingCron?: string;
    nearTermPollingCron?: string;
    nearTermThresholdDays?: number;
    daysAheadToFetch?: number;
    enableDailyPolling?: boolean;
    enableNearTermPolling?: boolean;
  };
  enablePriceFeedIntegration: boolean;
  alertThresholds: {
    minSeverity: 'low' | 'medium' | 'high' | 'critical';
    daysAhead: number;
  };
}

export interface UnlockAnalytics {
  totalUpcoming: number;
  totalValueUsd: number;
  byCategory: Record<string, { count: number; valueUsd: number }>;
  bySeverity: Record<string, { count: number; valueUsd: number }>;
  byTimeframe: {
    next7Days: { count: number; valueUsd: number };
    next30Days: { count: number; valueUsd: number };
    next90Days: { count: number; valueUsd: number };
  };
  topUnlocksByValue: NormalizedTokenUnlock[];
  topUnlocksByImpact: NormalizedTokenUnlock[];
}

export class TokenUnlocksService extends EventEmitter {
  private messariClient: MessariRestClient;
  private cache: TokenUnlocksCache;
  private storage: TokenUnlocksStorage;
  private scheduler: TokenUnlocksScheduler;
  private marketDataAggregator?: MarketDataAggregator;
  private normalizer: DataNormalizer;
  private config: TokenUnlocksServiceConfig;
  private isInitialized: boolean = false;

  constructor(
    config: TokenUnlocksServiceConfig,
    marketDataAggregator?: MarketDataAggregator
  ) {
    super();
    this.config = config;
    this.marketDataAggregator = marketDataAggregator;
    this.normalizer = getDataNormalizer();

    // Initialize Messari client
    this.messariClient = new MessariRestClient({
      apiKey: config.messari.apiKey,
      apiUrl: config.messari.apiUrl || 'https://data.messari.io/api/v1',
      rateLimit: {
        maxRequestsPerMinute: 30, // Messari free tier
        reservoir: 30,
        reservoirRefreshAmount: 30,
        reservoirRefreshInterval: 60 * 1000,
      },
      retry: {
        retries: 3,
        retryDelay: 2000,
      },
      priority: 2,
    });

    // Initialize cache
    this.cache = new TokenUnlocksCache({
      redis: config.cache,
      defaultTTL: config.cache.defaultTTL,
      nearTermThreshold: config.cache.nearTermThreshold,
      nearTermTTL: config.cache.nearTermTTL,
    });

    // Initialize storage
    this.storage = new TokenUnlocksStorage(config.database);

    // Initialize scheduler
    this.scheduler = new TokenUnlocksScheduler(
      this.messariClient,
      this.cache,
      this.storage,
      config.scheduler
    );

    // Forward scheduler events
    this.scheduler.on('daily_poll_completed', (data) => {
      this.emit('daily_poll_completed', data);
      this.handleNewUnlocks(data.unlocks);
    });

    this.scheduler.on('near_term_poll_completed', (data) => {
      this.emit('near_term_poll_completed', data);
      this.handleNewUnlocks(data.unlocks);
    });

    this.scheduler.on('daily_poll_failed', (data) => {
      this.emit('poll_failed', data);
    });

    this.scheduler.on('near_term_poll_failed', (data) => {
      this.emit('poll_failed', data);
    });

    logger.info('Token unlocks service initialized');
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing token unlocks service...');

    // Initialize database schema
    await this.storage.initialize();

    // Test connections
    const cacheHealthy = await this.cache.healthCheck();
    const storageHealthy = await this.storage.healthCheck();
    const messariHealthy = await this.messariClient.healthCheck();

    if (!cacheHealthy) {
      logger.warn('Cache health check failed');
    }

    if (!storageHealthy) {
      throw new Error('Storage health check failed');
    }

    if (!messariHealthy) {
      logger.warn('Messari API health check failed');
    }

    // Start scheduler
    this.scheduler.start();

    this.isInitialized = true;
    logger.info('Token unlocks service initialized successfully');
  }

  /**
   * Handle new unlocks (enrich with price data if available)
   */
  private async handleNewUnlocks(unlocks: NormalizedTokenUnlock[]): Promise<void> {
    try {
      if (!this.config.enablePriceFeedIntegration || !this.marketDataAggregator) {
        return;
      }

      // Get unique symbols
      const symbols = [...new Set(unlocks.map((u) => u.symbol))];

      // Fetch current prices
      const prices = await this.marketDataAggregator.getMarketPrices(
        symbols,
        true
      );

      const priceMap = new Map<string, MarketPrice>();
      prices.forEach((price) => priceMap.set(price.symbol, price));

      // Update unlock USD values with current prices
      const updatedUnlocks: NormalizedTokenUnlock[] = [];

      for (const unlock of unlocks) {
        const price = priceMap.get(unlock.symbol);

        if (price) {
          const updatedUnlock = {
            ...unlock,
            unlockAmountUsd: unlock.unlockAmount * price.price,
            priceAtUnlockUsd: price.price,
            marketCapBeforeUsd: price.marketCap,
            updatedAt: new Date(),
          };

          updatedUnlocks.push(updatedUnlock);
        }
      }

      if (updatedUnlocks.length > 0) {
        // Update in database
        await this.storage.storeUnlocks(updatedUnlocks);

        // Update in cache
        await this.cache.cacheUnlocks(updatedUnlocks);

        logger.info('Enriched unlocks with current price data', {
          enriched: updatedUnlocks.length,
          total: unlocks.length,
        });
      }

      // Generate alerts for high-impact unlocks
      await this.generateAndStoreAlerts();
    } catch (error) {
      logger.error('Failed to handle new unlocks', { error });
    }
  }

  /**
   * Get upcoming unlocks for a symbol
   */
  async getUpcomingUnlocks(
    symbol: string,
    daysAhead: number = 30,
    useCache: boolean = true
  ): Promise<NormalizedTokenUnlock[]> {
    try {
      // Try cache first
      if (useCache) {
        const cached = await this.cache.getUpcomingUnlocksBySymbol(symbol);
        if (cached && cached.length > 0) {
          logger.debug('Returning cached unlocks', { symbol, count: cached.length });
          return cached;
        }
      }

      // Try database
      const dbUnlocks = await this.storage.getUpcomingUnlocksBySymbol(
        symbol,
        daysAhead
      );

      if (dbUnlocks.length > 0) {
        // Update cache
        await this.cache.cacheUpcomingUnlocksBySymbol(symbol, dbUnlocks);
        return dbUnlocks;
      }

      // Fetch from Messari
      const messariSlug = this.normalizer['registry'].toMessari(symbol) || symbol.toLowerCase();
      const unlocks = await this.messariClient.getAssetUnlocks(messariSlug, {
        start_date: new Date().toISOString().split('T')[0],
        end_date: this.getDateAhead(daysAhead),
      });

      if (unlocks.length === 0) {
        return [];
      }

      // Normalize and enrich
      const normalized = await this.normalizeAndEnrichUnlocks(unlocks);

      // Store
      await this.storage.storeUnlocks(normalized);
      await this.cache.cacheUpcomingUnlocksBySymbol(symbol, normalized);

      return normalized;
    } catch (error) {
      logger.error('Failed to get upcoming unlocks', { error, symbol });
      return [];
    }
  }

  /**
   * Get all upcoming unlocks
   */
  async getAllUpcomingUnlocks(
    daysAhead: number = 30,
    useCache: boolean = true
  ): Promise<NormalizedTokenUnlock[]> {
    try {
      // Try cache first
      if (useCache) {
        const cached = await this.cache.getAllUpcomingUnlocks();
        if (cached && cached.length > 0) {
          // Filter by days ahead
          const filtered = cached.filter((unlock) => {
            const daysUntil = Math.ceil(
              (unlock.unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return daysUntil <= daysAhead;
          });

          logger.debug('Returning cached all unlocks', { count: filtered.length });
          return filtered;
        }
      }

      // Try database
      const dbUnlocks = await this.storage.getAllUpcomingUnlocks(daysAhead);

      if (dbUnlocks.length > 0) {
        return dbUnlocks;
      }

      // Fetch from Messari
      const unlocks = await this.messariClient.getUpcomingUnlocksNormalized(
        daysAhead,
        0
      );

      if (unlocks.length > 0) {
        // Enrich with current prices
        const enriched = await this.enrichUnlocksWithPrices(unlocks);

        // Store
        await this.storage.storeUnlocks(enriched);
        await this.cache.cacheAllUpcomingUnlocks(enriched);

        return enriched;
      }

      return [];
    } catch (error) {
      logger.error('Failed to get all upcoming unlocks', { error });
      return [];
    }
  }

  /**
   * Get high-impact unlocks
   */
  async getHighImpactUnlocks(
    daysAhead: number = 7,
    minSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<NormalizedTokenUnlock[]> {
    try {
      return await this.storage.getHighImpactUnlocks(daysAhead, minSeverity);
    } catch (error) {
      logger.error('Failed to get high-impact unlocks', { error });
      return [];
    }
  }

  /**
   * Get tokenomics data for a symbol
   */
  async getTokenomics(
    symbol: string,
    useCache: boolean = true
  ): Promise<MessariTokenomicsData | null> {
    try {
      // Try cache first
      if (useCache) {
        const cached = await this.cache.getTokenomics(symbol);
        if (cached) {
          return cached;
        }
      }

      // Try database
      const dbTokenomics = await this.storage.getLatestTokenomics(symbol);
      if (dbTokenomics) {
        await this.cache.cacheTokenomics(symbol, dbTokenomics);
        return dbTokenomics;
      }

      // Fetch from Messari
      const messariSlug = this.normalizer['registry'].toMessari(symbol) || symbol.toLowerCase();
      const tokenomics = await this.messariClient.getAssetTokenomics(messariSlug);

      // Store
      await this.storage.storeTokenomicsSnapshot(tokenomics);
      await this.cache.cacheTokenomics(symbol, tokenomics);

      return tokenomics;
    } catch (error) {
      logger.error('Failed to get tokenomics', { error, symbol });
      return null;
    }
  }

  /**
   * Generate alerts for upcoming unlocks
   */
  async generateAlerts(
    daysAhead: number = 7,
    minSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<TokenUnlockAlert[]> {
    try {
      const alerts = await this.messariClient.generateUnlockAlerts(
        daysAhead,
        minSeverity
      );

      // Cache alerts
      await this.cache.cacheAlerts(alerts);

      return alerts;
    } catch (error) {
      logger.error('Failed to generate alerts', { error });
      return [];
    }
  }

  /**
   * Generate and store alerts
   */
  private async generateAndStoreAlerts(): Promise<void> {
    try {
      const alerts = await this.generateAlerts(
        this.config.alertThresholds.daysAhead,
        this.config.alertThresholds.minSeverity
      );

      // Store each alert
      for (const alert of alerts) {
        await this.storage.storeAlert(alert);
      }

      if (alerts.length > 0) {
        logger.info('Generated and stored alerts', { count: alerts.length });
        this.emit('alerts_generated', { alerts, count: alerts.length });
      }
    } catch (error) {
      logger.error('Failed to generate and store alerts', { error });
    }
  }

  /**
   * Get analytics for upcoming unlocks
   */
  async getUnlockAnalytics(daysAhead: number = 90): Promise<UnlockAnalytics> {
    try {
      const unlocks = await this.getAllUpcomingUnlocks(daysAhead, true);

      const analytics: UnlockAnalytics = {
        totalUpcoming: unlocks.length,
        totalValueUsd: 0,
        byCategory: {},
        bySeverity: {},
        byTimeframe: {
          next7Days: { count: 0, valueUsd: 0 },
          next30Days: { count: 0, valueUsd: 0 },
          next90Days: { count: 0, valueUsd: 0 },
        },
        topUnlocksByValue: [],
        topUnlocksByImpact: [],
      };

      const now = Date.now();

      for (const unlock of unlocks) {
        const valueUsd = unlock.unlockAmountUsd;
        analytics.totalValueUsd += valueUsd;

        // By category
        if (!analytics.byCategory[unlock.category]) {
          analytics.byCategory[unlock.category] = { count: 0, valueUsd: 0 };
        }
        analytics.byCategory[unlock.category].count++;
        analytics.byCategory[unlock.category].valueUsd += valueUsd;

        // By severity
        const severity = unlock.severity || 'low';
        if (!analytics.bySeverity[severity]) {
          analytics.bySeverity[severity] = { count: 0, valueUsd: 0 };
        }
        analytics.bySeverity[severity].count++;
        analytics.bySeverity[severity].valueUsd += valueUsd;

        // By timeframe
        const daysUntil = Math.ceil(
          (unlock.unlockDate.getTime() - now) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil <= 7) {
          analytics.byTimeframe.next7Days.count++;
          analytics.byTimeframe.next7Days.valueUsd += valueUsd;
        }
        if (daysUntil <= 30) {
          analytics.byTimeframe.next30Days.count++;
          analytics.byTimeframe.next30Days.valueUsd += valueUsd;
        }
        if (daysUntil <= 90) {
          analytics.byTimeframe.next90Days.count++;
          analytics.byTimeframe.next90Days.valueUsd += valueUsd;
        }
      }

      // Top unlocks by value
      analytics.topUnlocksByValue = [...unlocks]
        .sort((a, b) => b.unlockAmountUsd - a.unlockAmountUsd)
        .slice(0, 10);

      // Top unlocks by impact score
      analytics.topUnlocksByImpact = [...unlocks]
        .sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0))
        .slice(0, 10);

      return analytics;
    } catch (error) {
      logger.error('Failed to get unlock analytics', { error });
      throw error;
    }
  }

  /**
   * Normalize and enrich unlock events
   */
  private async normalizeAndEnrichUnlocks(
    events: MessariUnlockEvent[]
  ): Promise<NormalizedTokenUnlock[]> {
    const normalized: NormalizedTokenUnlock[] = [];

    for (const event of events) {
      // Get current price for the asset
      let currentPrice: number | undefined;

      if (this.config.enablePriceFeedIntegration && this.marketDataAggregator) {
        try {
          const prices = await this.marketDataAggregator.getMarketPrices(
            [event.asset_symbol],
            true
          );
          if (prices.length > 0) {
            currentPrice = prices[0].price;
          }
        } catch (error) {
          logger.debug('Failed to fetch price for enrichment', {
            symbol: event.asset_symbol,
          });
        }
      }

      const unlockAmountUsd =
        event.unlock_amount_usd ||
        (currentPrice ? event.unlock_amount * currentPrice : 0);

      const impactScore = this.calculateImpactScore(event, unlockAmountUsd);
      const severity = this.determineSeverity(impactScore);

      normalized.push({
        id: event.id,
        source: 'messari',
        assetId: event.asset_id,
        symbol: event.asset_symbol,
        name: event.asset_name,
        unlockDate: new Date(event.date),
        unlockAmount: event.unlock_amount,
        unlockAmountUsd,
        unlockPercentage: event.unlock_percentage || 0,
        category: event.category,
        label: event.label,
        description: event.description,
        circulatingSupplyBefore: event.circulating_supply_before,
        circulatingSupplyAfter: event.circulating_supply_after,
        marketCapBeforeUsd: event.market_cap_before_usd,
        marketCapAfterUsd: event.market_cap_after_usd,
        priceAtUnlockUsd: currentPrice || event.price_at_unlock_usd,
        impactScore,
        severity,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return normalized;
  }

  /**
   * Enrich unlocks with current price data
   */
  private async enrichUnlocksWithPrices(
    unlocks: NormalizedTokenUnlock[]
  ): Promise<NormalizedTokenUnlock[]> {
    if (!this.config.enablePriceFeedIntegration || !this.marketDataAggregator) {
      return unlocks;
    }

    try {
      const symbols = [...new Set(unlocks.map((u) => u.symbol))];
      const prices = await this.marketDataAggregator.getMarketPrices(symbols, true);

      const priceMap = new Map<string, MarketPrice>();
      prices.forEach((price) => priceMap.set(price.symbol, price));

      return unlocks.map((unlock) => {
        const price = priceMap.get(unlock.symbol);
        if (!price) return unlock;

        return {
          ...unlock,
          unlockAmountUsd: unlock.unlockAmount * price.price,
          priceAtUnlockUsd: price.price,
          marketCapBeforeUsd: price.marketCap,
          updatedAt: new Date(),
        };
      });
    } catch (error) {
      logger.error('Failed to enrich unlocks with prices', { error });
      return unlocks;
    }
  }

  /**
   * Calculate impact score (0-100)
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
      team: 25,
      investor: 20,
      treasury: 10,
      foundation: 10,
      community: 5,
      public: 3,
    };
    score += categoryRisk[event.category.toLowerCase()] || 15;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Determine severity based on impact score
   */
  private determineSeverity(impactScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (impactScore >= 80) return 'critical';
    if (impactScore >= 60) return 'high';
    if (impactScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get date ahead helper
   */
  private getDateAhead(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    messari: boolean;
    cache: boolean;
    storage: boolean;
    scheduler: any;
  }> {
    const messariHealthy = await this.messariClient.healthCheck();
    const cacheHealthy = await this.cache.healthCheck();
    const storageHealthy = await this.storage.healthCheck();
    const schedulerStatus = this.scheduler.getStatus();

    return {
      healthy: storageHealthy && schedulerStatus.isRunning,
      messari: messariHealthy,
      cache: cacheHealthy,
      storage: storageHealthy,
      scheduler: schedulerStatus,
    };
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<any> {
    const schedulerStats = this.scheduler.getStats();
    const cacheStats = await this.cache.getStats();
    const messariStats = this.messariClient.getStats();

    return {
      scheduler: schedulerStats,
      cache: cacheStats,
      messari: messariStats,
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down token unlocks service...');

    this.scheduler.stop();
    await this.cache.close();
    await this.storage.close();

    this.removeAllListeners();

    logger.info('Token unlocks service shut down successfully');
  }
}

export default TokenUnlocksService;

