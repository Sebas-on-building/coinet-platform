/**
 * Token Unlocks System - Main Integration File
 * Divine world-class single-entry point for the entire token unlocks system
 * 
 * This file provides a unified interface to initialize and use all
 * token unlock features in a streamlined way.
 */

import { TokenUnlocksService } from './token-unlocks.service';
import { TokenUnlocksAnalytics } from './token-unlocks-analytics';
import { TokenUnlocksMonitoring } from './token-unlocks-monitoring';
import { MarketDataAggregator } from '../aggregator';
import { logger } from '../utils/logger';
import type {
  NormalizedTokenUnlock,
  TokenUnlockAlert,
  MessariTokenomicsData,
} from '../types/messari.types';
import type { MarketPrice } from '../types';

/**
 * Complete configuration for the token unlocks system
 */
export interface TokenUnlocksSystemConfig {
  messari: {
    apiKey: string;
    apiUrl?: string;
  };
  cache: {
    host: string;
    port: number;
    password?: string;
    db: number;
    defaultTTL?: number;
    nearTermThreshold?: number;
    nearTermTTL?: number;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  scheduler?: {
    dailyPollingCron?: string;
    nearTermPollingCron?: string;
    nearTermThresholdDays?: number;
    daysAheadToFetch?: number;
    enableDailyPolling?: boolean;
    enableNearTermPolling?: boolean;
  };
  monitoring?: {
    enabled: boolean;
    intervalMs?: number;
  };
  enablePriceFeedIntegration?: boolean;
  alertThresholds?: {
    minSeverity?: 'low' | 'medium' | 'high' | 'critical';
    daysAhead?: number;
  };
}

/**
 * Main Token Unlocks System Class
 * 
 * Provides a unified interface to all token unlock features:
 * - Data fetching and caching
 * - Impact analysis
 * - Alert generation
 * - Monitoring and health checks
 * - Analytics and reporting
 */
export class TokenUnlocksSystem {
  private service: TokenUnlocksService;
  private monitoring?: TokenUnlocksMonitoring;
  private config: TokenUnlocksSystemConfig;
  private isInitialized: boolean = false;

  constructor(
    config: TokenUnlocksSystemConfig,
    marketDataAggregator?: MarketDataAggregator
  ) {
    this.config = {
      ...config,
      cache: {
        host: config.cache.host,
        port: config.cache.port,
        password: config.cache.password,
        db: config.cache.db,
        defaultTTL: config.cache.defaultTTL ?? 86400,
        nearTermThreshold: config.cache.nearTermThreshold ?? 7,
        nearTermTTL: config.cache.nearTermTTL ?? 3600,
      },
      scheduler: {
        dailyPollingCron: '0 0 * * *',
        nearTermPollingCron: '0 * * * *',
        nearTermThresholdDays: 7,
        daysAheadToFetch: 90,
        enableDailyPolling: true,
        enableNearTermPolling: true,
        ...config.scheduler,
      },
      monitoring: {
        enabled: true,
        intervalMs: 60000,
        ...config.monitoring,
      },
      enablePriceFeedIntegration: config.enablePriceFeedIntegration ?? true,
      alertThresholds: {
        minSeverity: (config.alertThresholds?.minSeverity ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
        daysAhead: config.alertThresholds?.daysAhead ?? 7,
      },
    };

    // Initialize main service
    this.service = new TokenUnlocksService(
      {
        messari: this.config.messari,
        cache: {
          host: this.config.cache.host,
          port: this.config.cache.port,
          password: this.config.cache.password,
          db: this.config.cache.db,
          defaultTTL: this.config.cache.defaultTTL!,
          nearTermThreshold: this.config.cache.nearTermThreshold!,
          nearTermTTL: this.config.cache.nearTermTTL!,
        },
        database: this.config.database,
        scheduler: this.config.scheduler!,
        enablePriceFeedIntegration: this.config.enablePriceFeedIntegration!,
        alertThresholds: {
          minSeverity: this.config.alertThresholds!.minSeverity!,
          daysAhead: this.config.alertThresholds!.daysAhead!,
        },
      },
      marketDataAggregator
    );

    // Initialize monitoring if enabled
    if (this.config.monitoring!.enabled) {
      this.monitoring = new TokenUnlocksMonitoring(this.service);
    }

    logger.info('Token unlocks system created', {
      monitoringEnabled: this.config.monitoring!.enabled,
      priceFeedIntegration: this.config.enablePriceFeedIntegration,
    });
  }

  /**
   * Initialize the entire system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Token unlocks system already initialized');
      return;
    }

    logger.info('Initializing token unlocks system...');

    // Initialize service (includes database, cache, and scheduler)
    await this.service.initialize();

    // Start monitoring if enabled
    if (this.monitoring) {
      this.monitoring.start(this.config.monitoring!.intervalMs);
    }

    this.isInitialized = true;

    logger.info('✅ Token unlocks system initialized successfully', {
      components: {
        service: 'initialized',
        monitoring: this.monitoring ? 'enabled' : 'disabled',
      },
    });
  }

  /**
   * Get upcoming unlocks for a specific symbol
   */
  async getUpcomingUnlocks(
    symbol: string,
    daysAhead: number = 30,
    options?: {
      useCache?: boolean;
      minSeverity?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<NormalizedTokenUnlock[]> {
    this.ensureInitialized();

    const unlocks = await this.service.getUpcomingUnlocks(
      symbol,
      daysAhead,
      options?.useCache ?? true
    );

    // Filter by severity if specified
    if (options?.minSeverity) {
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      const minIndex = severityOrder.indexOf(options.minSeverity);

      return unlocks.filter((unlock) => {
        const unlockIndex = severityOrder.indexOf(unlock.severity || 'low');
        return unlockIndex >= minIndex;
      });
    }

    return unlocks;
  }

  /**
   * Get all upcoming unlocks with optional filtering
   */
  async getAllUpcomingUnlocks(
    daysAhead: number = 30,
    options?: {
      useCache?: boolean;
      minSeverity?: 'low' | 'medium' | 'high' | 'critical';
      category?: string;
    }
  ): Promise<NormalizedTokenUnlock[]> {
    this.ensureInitialized();

    let unlocks: NormalizedTokenUnlock[];

    // Get unlocks based on severity filter
    if (options?.minSeverity && options.minSeverity !== 'low') {
      unlocks = await this.service.getHighImpactUnlocks(
        daysAhead,
        options.minSeverity
      );
    } else {
      unlocks = await this.service.getAllUpcomingUnlocks(
        daysAhead,
        options?.useCache ?? true
      );
    }

    // Filter by category if specified
    if (options?.category) {
      unlocks = unlocks.filter(
        (unlock) =>
          unlock.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    return unlocks;
  }

  /**
   * Get high-impact unlocks
   */
  async getHighImpactUnlocks(
    daysAhead: number = 7,
    minSeverity: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ): Promise<NormalizedTokenUnlock[]> {
    this.ensureInitialized();
    return this.service.getHighImpactUnlocks(daysAhead, minSeverity);
  }

  /**
   * Get detailed impact analysis for unlocks
   */
  async getImpactAnalysis(
    symbolOrUnlocks: string | NormalizedTokenUnlock[],
    daysAhead: number = 30
  ) {
    this.ensureInitialized();

    let unlocks: NormalizedTokenUnlock[];

    if (typeof symbolOrUnlocks === 'string') {
      unlocks = await this.service.getUpcomingUnlocks(symbolOrUnlocks, daysAhead);
    } else {
      unlocks = symbolOrUnlocks;
    }

    if (unlocks.length === 0) {
      return null;
    }

    // Generate comprehensive analytics report
    return TokenUnlocksAnalytics.generateAnalyticsReport(unlocks);
  }

  /**
   * Get tokenomics data for a symbol
   */
  async getTokenomics(
    symbol: string,
    useCache: boolean = true
  ): Promise<MessariTokenomicsData | null> {
    this.ensureInitialized();
    return this.service.getTokenomics(symbol, useCache);
  }

  /**
   * Generate alerts for upcoming unlocks
   */
  async generateAlerts(
    daysAhead?: number,
    minSeverity?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<TokenUnlockAlert[]> {
    this.ensureInitialized();

    return this.service.generateAlerts(
      daysAhead ?? this.config.alertThresholds!.daysAhead!,
      minSeverity ?? this.config.alertThresholds!.minSeverity!
    );
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(daysAhead: number = 90) {
    this.ensureInitialized();
    return this.service.getUnlockAnalytics(daysAhead);
  }

  /**
   * Get market pressure analysis for a symbol
   */
  async getMarketPressure(
    symbol: string,
    daysAhead: number = 30,
    marketPrice?: MarketPrice
  ) {
    this.ensureInitialized();

    const unlocks = await this.service.getUpcomingUnlocks(symbol, daysAhead);

    if (unlocks.length === 0) {
      return null;
    }

    return TokenUnlocksAnalytics.analyzeMarketPressure(
      unlocks,
      marketPrice,
      daysAhead
    );
  }

  /**
   * Get supply dilution analysis for an unlock
   */
  getSupplyDilution(unlock: NormalizedTokenUnlock) {
    return TokenUnlocksAnalytics.analyzeSupplyDilution(unlock);
  }

  /**
   * Get system health status
   */
  async getHealth() {
    this.ensureInitialized();

    const serviceHealth = await this.service.getHealthStatus();

    if (this.monitoring) {
      const healthCheck = await this.monitoring.performHealthCheck();
      return {
        service: serviceHealth,
        monitoring: healthCheck,
      };
    }

    return {
      service: serviceHealth,
      monitoring: null,
    };
  }

  /**
   * Get system diagnostics (if monitoring enabled)
   */
  async getDiagnostics() {
    this.ensureInitialized();

    if (!this.monitoring) {
      throw new Error('Monitoring not enabled');
    }

    return this.monitoring.getDiagnostics();
  }

  /**
   * Get monitoring alerts (if monitoring enabled)
   */
  getAlerts(includeResolved: boolean = false) {
    this.ensureInitialized();

    if (!this.monitoring) {
      throw new Error('Monitoring not enabled');
    }

    return this.monitoring.getAlerts(includeResolved);
  }

  /**
   * Resolve a monitoring alert
   */
  resolveAlert(alertId: string) {
    this.ensureInitialized();

    if (!this.monitoring) {
      throw new Error('Monitoring not enabled');
    }

    this.monitoring.resolveAlert(alertId);
  }

  /**
   * Get system statistics
   */
  async getStats() {
    this.ensureInitialized();
    return this.service.getStats();
  }

  /**
   * Subscribe to system events
   */
  on(event: string, handler: (...args: any[]) => void) {
    this.service.on(event, handler);

    if (this.monitoring) {
      this.monitoring.on(event, handler);
    }
  }

  /**
   * Unsubscribe from system events
   */
  off(event: string, handler: (...args: any[]) => void) {
    this.service.off(event, handler);

    if (this.monitoring) {
      this.monitoring.off(event, handler);
    }
  }

  /**
   * Shutdown the entire system gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down token unlocks system...');

    // Stop monitoring
    if (this.monitoring) {
      this.monitoring.stop();
    }

    // Shutdown service
    await this.service.shutdown();

    this.isInitialized = false;

    logger.info('✅ Token unlocks system shut down successfully');
  }

  /**
   * Ensure system is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'Token unlocks system not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * Get the underlying service instance (for advanced usage)
   */
  getService(): TokenUnlocksService {
    return this.service;
  }

  /**
   * Get the monitoring instance (for advanced usage)
   */
  getMonitoring(): TokenUnlocksMonitoring | undefined {
    return this.monitoring;
  }
}

/**
 * Factory function to create and initialize the system
 */
export async function createTokenUnlocksSystem(
  config: TokenUnlocksSystemConfig,
  marketDataAggregator?: MarketDataAggregator
): Promise<TokenUnlocksSystem> {
  const system = new TokenUnlocksSystem(config, marketDataAggregator);
  await system.initialize();
  return system;
}

// Export all types and utilities
export {
  TokenUnlocksService,
  TokenUnlocksAnalytics,
  TokenUnlocksMonitoring,
};

export type {
  NormalizedTokenUnlock,
  TokenUnlockAlert,
  MessariTokenomicsData,
  MarketPrice,
};

export default TokenUnlocksSystem;

