/**
 * Unified Token Unlocks Service
 * Divine world-class aggregation of Messari + The Tie data
 * 
 * Features:
 * - Dual-source data aggregation
 * - Automatic reconciliation and consensus
 * - Quality scoring and validation
 * - Historical accuracy tracking
 * - Intelligent source selection
 * - Comprehensive analytics with backtesting
 */

import EventEmitter from 'eventemitter3';
import { MessariRestClient } from '../providers/messari-rest';
import { TheTieRestClient } from '../providers/thetie-rest';
import { DualSourceUnlocksReconciliation } from './dual-source-unlocks-reconciliation';
import { TokenUnlocksCache } from '../storage/token-unlocks-cache';
import { TokenUnlocksStorage } from '../storage/token-unlocks-storage';
import { TokenUnlocksScheduler } from '../services/token-unlocks-scheduler';
import { MarketDataAggregator } from '../aggregator';
import { logger } from '../utils/logger';
import { NormalizedTokenUnlock } from '../types/messari.types';
import { UnifiedTokenUnlock, TokenUnlockComparison } from '../types/thetie.types';
import { MarketPrice } from '../types';

export interface UnifiedUnlocksConfig {
  messari: {
    apiKey: string;
    apiUrl?: string;
    enabled: boolean;
  };
  thetie: {
    apiKey: string;
    apiUrl?: string;
    enabled: boolean;
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
  reconciliation: {
    tolerancePercent?: number;
    preferredSource?: 'messari' | 'thetie' | 'auto';
    minConfidenceThreshold?: number;
    enableAlerts?: boolean;
  };
  enablePriceFeedIntegration: boolean;
  enableScheduler: boolean;
}

export interface UnifiedUnlockData {
  ticker: string;
  name: string;
  unlockDate: Date;
  tokensUnlocked: number;
  tokensUnlockedUsd: number;
  percentageOfSupply: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  sources: ('messari' | 'thetie')[];
  quality: {
    score: number;
    hasDiscrepancies: boolean;
    discrepancyCount: number;
  };
  impact: {
    score: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    expectedPressure: 'minimal' | 'moderate' | 'significant' | 'severe';
  };
  historical?: {
    priceChange1d?: number;
    priceChange7d?: number;
    priceChange30d?: number;
    similarEventsAvg?: number;
  };
}

export interface BacktestResult {
  ticker: string;
  unlockDate: Date;
  predicted: {
    impactScore: number;
    severity: string;
    expectedPressure: string;
  };
  actual: {
    priceChange1d: number;
    priceChange7d: number;
    priceChange30d: number;
    volumeChange: number;
  };
  accuracy: {
    scoreAccuracy: number; // 0-100
    directionCorrect: boolean;
    magnitudeError: number;
  };
  lessons: string[];
}

export class UnifiedTokenUnlocksService extends EventEmitter {
  private messariClient?: MessariRestClient;
  private theTieClient?: TheTieRestClient;
  private reconciliation?: DualSourceUnlocksReconciliation;
  private cache: TokenUnlocksCache;
  private storage: TokenUnlocksStorage;
  private scheduler?: TokenUnlocksScheduler;
  private marketDataAggregator?: MarketDataAggregator;
  private config: UnifiedUnlocksConfig;
  private isInitialized: boolean = false;

  constructor(
    config: UnifiedUnlocksConfig,
    marketDataAggregator?: MarketDataAggregator
  ) {
    super();
    this.config = config;
    this.marketDataAggregator = marketDataAggregator;

    // Initialize clients based on what's enabled
    if (config.messari.enabled) {
      this.messariClient = new MessariRestClient({
        apiKey: config.messari.apiKey,
        apiUrl: config.messari.apiUrl || 'https://data.messari.io/api/v1',
        rateLimit: {
          maxRequestsPerMinute: 30,
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
    }

    if (config.thetie.enabled) {
      this.theTieClient = new TheTieRestClient({
        apiKey: config.thetie.apiKey,
        apiUrl: config.thetie.apiUrl || 'https://api.thetie.io/v1',
        rateLimit: {
          maxRequestsPerMinute: 60,
          reservoir: 60,
          reservoirRefreshAmount: 60,
          reservoirRefreshInterval: 60 * 1000,
        },
        retry: {
          retries: 3,
          retryDelay: 2000,
        },
        priority: 3,
      });
    }

    // Initialize reconciliation if both sources are enabled
    if (this.messariClient && this.theTieClient) {
      this.reconciliation = new DualSourceUnlocksReconciliation(
        this.messariClient,
        this.theTieClient,
        config.reconciliation
      );

      // Forward reconciliation events
      this.reconciliation.on('critical_discrepancy', (data) => {
        this.emit('critical_discrepancy', data);
        logger.warn('Critical discrepancy detected', data);
      });
    }

    // Initialize cache
    this.cache = new TokenUnlocksCache({
      redis: config.cache,
      defaultTTL: config.cache.defaultTTL,
      nearTermThreshold: config.cache.nearTermThreshold,
      nearTermTTL: config.cache.nearTermTTL,
    });

    // Initialize storage
    this.storage = new TokenUnlocksStorage(config.database);

    logger.info('Unified token unlocks service initialized', {
      messariEnabled: config.messari.enabled,
      theTieEnabled: config.thetie.enabled,
      reconciliationEnabled: !!this.reconciliation,
    });
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing unified token unlocks service...');

    // Initialize storage
    await this.storage.initialize();

    // Test connections
    const cacheHealthy = await this.cache.healthCheck();
    const storageHealthy = await this.storage.healthCheck();

    if (!storageHealthy) {
      throw new Error('Storage health check failed');
    }

    logger.info('Unified token unlocks service initialized', {
      cache: cacheHealthy,
      storage: storageHealthy,
      messari: !!this.messariClient,
      thetie: !!this.theTieClient,
    });

    this.isInitialized = true;
  }

  /**
   * Get unified unlocks for a ticker
   */
  async getUnifiedUnlocks(
    ticker: string,
    daysAhead: number = 30,
    options?: {
      useCache?: boolean;
      minQuality?: number;
    }
  ): Promise<UnifiedUnlockData[]> {
    this.ensureInitialized();

    if (!this.reconciliation) {
      // Single source mode
      return this.getUnlocksFromAvailableSource(ticker, daysAhead);
    }

    // Dual source mode with reconciliation
    const reconciled = await this.reconciliation.reconcileTickerUnlocks(ticker, daysAhead);

    // Convert to unified format
    const unified = await Promise.all(
      reconciled.map(result => this.convertToUnifiedFormat(result))
    );

    // Filter by quality if specified
    if (options?.minQuality) {
      return unified.filter(u => u.quality.score >= options.minQuality);
    }

    return unified;
  }

  /**
   * Get all upcoming unlocks across multiple tickers
   */
  async getAllUnifiedUnlocks(
    tickers: string[],
    daysAhead: number = 30
  ): Promise<Map<string, UnifiedUnlockData[]>> {
    this.ensureInitialized();

    const results = new Map<string, UnifiedUnlockData[]>();

    await Promise.all(
      tickers.map(async ticker => {
        try {
          const unlocks = await this.getUnifiedUnlocks(ticker, daysAhead);
          results.set(ticker, unlocks);
        } catch (error) {
          logger.warn('Failed to get unified unlocks for ticker', {
            ticker,
            error,
          });
        }
      })
    );

    return results;
  }

  /**
   * Perform backtest analysis using historical data from The Tie
   */
  async performBacktest(
    ticker: string,
    lookbackDays: number = 90
  ): Promise<BacktestResult[]> {
    this.ensureInitialized();

    if (!this.theTieClient) {
      throw new Error('The Tie client required for backtesting');
    }

    logger.info('Performing backtest analysis', { ticker, lookbackDays });

    try {
      // Fetch historical unlocks with actual price impact
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);

      const historicalUnlocks = await this.theTieClient.getHistoricalUnlocks({
        ticker,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        include_historical: true,
      });

      // Analyze each historical unlock
      const results: BacktestResult[] = historicalUnlocks.map(unlock => {
        // Calculate what our prediction would have been
        const predictedImpact = this.calculatePredictedImpact(unlock);

        // Get actual results
        const actual = {
          priceChange1d: unlock.price_change_1d_percent || 0,
          priceChange7d: unlock.price_change_7d_percent || 0,
          priceChange30d: unlock.price_change_30d_percent || 0,
          volumeChange: unlock.volume_change_1d_percent || 0,
        };

        // Calculate accuracy
        const accuracy = this.calculateBacktestAccuracy(predictedImpact, actual);

        // Generate lessons learned
        const lessons = this.generateBacktestLessons(
          unlock,
          predictedImpact,
          actual,
          accuracy
        );

        return {
          ticker: unlock.ticker,
          unlockDate: new Date(unlock.unlock_date),
          predicted: predictedImpact,
          actual,
          accuracy,
          lessons,
        };
      });

      logger.info('Backtest analysis complete', {
        ticker,
        eventsAnalyzed: results.length,
        avgAccuracy: results.reduce((sum, r) => sum + r.accuracy.scoreAccuracy, 0) / results.length,
      });

      return results;
    } catch (error) {
      logger.error('Backtest analysis failed', { error, ticker });
      throw error;
    }
  }

  /**
   * Calculate predicted impact for backtesting
   */
  private calculatePredictedImpact(unlock: any): BacktestResult['predicted'] {
    // Use similar logic to our impact scoring
    let impactScore = 0;

    if (unlock.percentage_of_supply) {
      impactScore += Math.min(unlock.percentage_of_supply * 2.5, 25);
    }

    const categoryRisk: Record<string, number> = {
      team: 20,
      investor: 18,
      treasury: 10,
      community: 5,
    };
    impactScore += categoryRisk[unlock.category?.toLowerCase()] || 10;

    const severity = impactScore >= 80 ? 'critical' :
                    impactScore >= 60 ? 'high' :
                    impactScore >= 40 ? 'medium' : 'low';

    const expectedPressure = impactScore >= 85 ? 'severe' :
                            impactScore >= 65 ? 'significant' :
                            impactScore >= 40 ? 'moderate' : 'minimal';

    return {
      impactScore,
      severity,
      expectedPressure,
    };
  }

  /**
   * Calculate backtest accuracy
   */
  private calculateBacktestAccuracy(
    predicted: BacktestResult['predicted'],
    actual: BacktestResult['actual']
  ): BacktestResult['accuracy'] {
    // Map severity to expected price change
    const severityToExpectedChange: Record<string, number> = {
      critical: -15,
      high: -10,
      medium: -5,
      low: -2,
    };

    const expectedChange = severityToExpectedChange[predicted.severity];
    const actualChange = actual.priceChange7d;

    // Calculate direction accuracy
    const directionCorrect = (expectedChange < 0 && actualChange < 0) ||
                             (expectedChange >= 0 && actualChange >= 0);

    // Calculate magnitude error
    const magnitudeError = Math.abs(expectedChange - actualChange);

    // Calculate overall accuracy score
    const directionBonus = directionCorrect ? 50 : 0;
    const magnitudeScore = Math.max(0, 50 - magnitudeError * 2);
    const scoreAccuracy = directionBonus + magnitudeScore;

    return {
      scoreAccuracy: Math.min(100, Math.max(0, scoreAccuracy)),
      directionCorrect,
      magnitudeError,
    };
  }

  /**
   * Generate lessons from backtest
   */
  private generateBacktestLessons(
    unlock: any,
    predicted: BacktestResult['predicted'],
    actual: BacktestResult['actual'],
    accuracy: BacktestResult['accuracy']
  ): string[] {
    const lessons: string[] = [];

    if (accuracy.directionCorrect) {
      lessons.push('✅ Direction predicted correctly');
    } else {
      lessons.push('❌ Direction prediction was wrong - investigate factors');
    }

    if (accuracy.magnitudeError < 5) {
      lessons.push('✅ Magnitude prediction was accurate');
    } else if (accuracy.magnitudeError > 15) {
      lessons.push('❌ Magnitude significantly off - model needs adjustment');
    }

    if (Math.abs(actual.priceChange7d) > Math.abs(predicted.impactScore / 10)) {
      lessons.push('⚠️ Actual impact exceeded prediction - increase sensitivity');
    }

    if (unlock.category === 'team' && actual.priceChange7d > -5) {
      lessons.push('📊 Team unlock had less impact than expected - positive sign');
    }

    return lessons;
  }

  /**
   * Convert reconciliation result to unified format
   */
  private async convertToUnifiedFormat(
    result: any
  ): Promise<UnifiedUnlockData> {
    const sources: ('messari' | 'thetie')[] = [];
    if (result.sources.messari) sources.push('messari');
    if (result.sources.thetie) sources.push('thetie');

    // Calculate impact using our analytics
    const impactScore = result.sources.messari?.impactScore || 
                       result.sources.thetie?.impactScore || 50;
    const severity = impactScore >= 80 ? 'critical' :
                    impactScore >= 60 ? 'high' :
                    impactScore >= 40 ? 'medium' : 'low';
    const expectedPressure = impactScore >= 85 ? 'severe' :
                            impactScore >= 65 ? 'significant' :
                            impactScore >= 40 ? 'moderate' : 'minimal';

    // Get historical data if available
    const historical = result.sources.thetie?.historicalImpact;

    return {
      ticker: result.ticker,
      name: result.sources.messari?.name || result.sources.thetie?.name || result.ticker,
      unlockDate: result.unlockDate,
      tokensUnlocked: result.consensus.tokensUnlocked,
      tokensUnlockedUsd: result.consensus.tokensUnlockedUsd,
      percentageOfSupply: result.consensus.percentageOfSupply,
      category: result.consensus.category,
      confidence: result.consensus.confidence,
      sources,
      quality: {
        score: result.qualityScore,
        hasDiscrepancies: result.discrepancies.length > 0,
        discrepancyCount: result.discrepancies.length,
      },
      impact: {
        score: impactScore,
        severity,
        expectedPressure,
      },
      historical,
    };
  }

  /**
   * Get unlocks from available source (when only one source enabled)
   */
  private async getUnlocksFromAvailableSource(
    ticker: string,
    daysAhead: number
  ): Promise<UnifiedUnlockData[]> {
    let unlocks: (NormalizedTokenUnlock | UnifiedTokenUnlock)[] = [];
    let source: 'messari' | 'thetie' = 'messari';

    if (this.messariClient) {
      const messariUnlocks = await this.messariClient.getUpcomingUnlocksNormalized(
        daysAhead,
        0
      );
      unlocks = messariUnlocks;
      source = 'messari';
    } else if (this.theTieClient) {
      const theTieUnlocks = await this.theTieClient.getUpcomingUnlocksNormalized(
        daysAhead,
        70
      );
      unlocks = theTieUnlocks;
      source = 'thetie';
    }

    // Convert to unified format
    return unlocks.map(unlock => {
      if (source === 'messari') {
        const m = unlock as NormalizedTokenUnlock;
        return {
          ticker: m.symbol,
          name: m.name,
          unlockDate: m.unlockDate,
          tokensUnlocked: m.unlockAmount,
          tokensUnlockedUsd: m.unlockAmountUsd,
          percentageOfSupply: m.unlockPercentage,
          category: m.category,
          confidence: 'medium' as const,
          sources: ['messari'] as const,
          quality: {
            score: 75,
            hasDiscrepancies: false,
            discrepancyCount: 0,
          },
          impact: {
            score: m.impactScore || 50,
            severity: m.severity || 'medium',
            expectedPressure: 'moderate' as const,
          },
        };
      } else {
        const t = unlock as UnifiedTokenUnlock;
        return {
          ticker: t.ticker,
          name: t.name,
          unlockDate: t.unlockDate,
          tokensUnlocked: t.tokensUnlocked,
          tokensUnlockedUsd: t.tokensUnlockedUsd,
          percentageOfSupply: t.percentageOfSupply,
          category: t.category,
          confidence: t.confidenceScore && t.confidenceScore >= 90 ? 'high' : 'medium',
          sources: ['thetie'] as const,
          quality: {
            score: t.confidenceScore || 75,
            hasDiscrepancies: false,
            discrepancyCount: 0,
          },
          impact: {
            score: t.impactScore || 50,
            severity: t.riskLevel || 'medium',
            expectedPressure: 'moderate' as const,
          },
          historical: t.historicalImpact,
        };
      }
    });
  }

  /**
   * Get comprehensive analytics with dual-source validation
   */
  async getComprehensiveAnalytics(
    tickers: string[],
    daysAhead: number = 90
  ): Promise<{
    unlocks: Map<string, UnifiedUnlockData[]>;
    reconciliation?: any;
    backtest?: Map<string, BacktestResult[]>;
    summary: {
      totalUnlocks: number;
      highQualityCount: number;
      averageQuality: number;
      criticalUnlocks: number;
    };
  }> {
    this.ensureInitialized();

    logger.info('Generating comprehensive analytics', {
      tickers: tickers.length,
      daysAhead,
    });

    // Get unified unlocks
    const unlocks = await this.getAllUnifiedUnlocks(tickers, daysAhead);

    // Get reconciliation report if available
    let reconciliation;
    if (this.reconciliation) {
      reconciliation = await this.reconciliation.reconcileMultipleTickers(
        tickers,
        daysAhead
      );
    }

    // Perform backtesting if The Tie is available
    let backtest: Map<string, BacktestResult[]> | undefined;
    if (this.theTieClient) {
      backtest = new Map();
      for (const ticker of tickers.slice(0, 5)) { // Limit to 5 for performance
        try {
          const results = await this.performBacktest(ticker, 90);
          if (results.length > 0) {
            backtest.set(ticker, results);
          }
        } catch (error) {
          logger.debug('Backtest failed for ticker', { ticker });
        }
      }
    }

    // Calculate summary
    let totalUnlocks = 0;
    let highQualityCount = 0;
    let totalQuality = 0;
    let criticalUnlocks = 0;

    unlocks.forEach(tickerUnlocks => {
      tickerUnlocks.forEach(unlock => {
        totalUnlocks++;
        totalQuality += unlock.quality.score;
        if (unlock.quality.score >= 90) highQualityCount++;
        if (unlock.impact.severity === 'critical') criticalUnlocks++;
      });
    });

    const averageQuality = totalUnlocks > 0 ? totalQuality / totalUnlocks : 0;

    return {
      unlocks,
      reconciliation,
      backtest,
      summary: {
        totalUnlocks,
        highQualityCount,
        averageQuality,
        criticalUnlocks,
      },
    };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    messari?: boolean;
    thetie?: boolean;
    cache: boolean;
    storage: boolean;
    reconciliation: boolean;
  }> {
    const messariHealthy = this.messariClient
      ? await this.messariClient.healthCheck()
      : undefined;
    const theTieHealthy = this.theTieClient
      ? await this.theTieClient.healthCheck()
      : undefined;
    const cacheHealthy = await this.cache.healthCheck();
    const storageHealthy = await this.storage.healthCheck();

    const healthy = storageHealthy && (messariHealthy !== false || theTieHealthy !== false);

    return {
      healthy,
      messari: messariHealthy,
      thetie: theTieHealthy,
      cache: cacheHealthy,
      storage: storageHealthy,
      reconciliation: !!this.reconciliation,
    };
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down unified token unlocks service...');

    if (this.scheduler) {
      this.scheduler.stop();
    }

    await this.cache.close();
    await this.storage.close();

    this.removeAllListeners();

    logger.info('Unified token unlocks service shut down successfully');
  }
}

export default UnifiedTokenUnlocksService;

