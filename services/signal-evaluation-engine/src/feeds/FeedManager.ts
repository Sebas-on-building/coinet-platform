/**
 * =========================================
 * REAL-TIME DATA FEED MANAGER
 * =========================================
 * Unified manager for all real-time data feeds with
 * latency optimization and health monitoring
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { MarketDataFeedClass } from './MarketDataFeed';
import { BlockchainMonitor } from './BlockchainMonitor';
import type {
  ExchangeConfig,
  BlockchainConfig,
  SocialMediaConfig,
  NewsConfig,
  DeFiConfig,
  FeedHealth,
  FeedMetrics,
  LatencyRequirements,
  NormalizationConfig
} from './types';
import type { NormalizedSignal } from '../types';

export interface FeedManagerConfig {
  marketData: {
    exchanges: ExchangeConfig[];
    symbols: string[];
    enabledStreams: string[];
  };
  blockchain: {
    networks: BlockchainConfig[];
    enabledFeatures: string[];
  };
  socialMedia: {
    platforms: SocialMediaConfig[];
    keywords: string[];
    languages: string[];
  };
  news: {
    sources: NewsConfig[];
    categories: string[];
  };
  defi: {
    protocols: DeFiConfig[];
    metrics: string[];
  };
  normalization: NormalizationConfig;
  healthCheckInterval: number;
  maxBufferSize: number;
}

export class FeedManager extends EventEmitter {
  private logger: Logger;
  private config: FeedManagerConfig;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  // Feed instances
  private marketDataFeeds: Map<string, MarketDataFeedClass> = new Map();
  private blockchainMonitors: Map<string, BlockchainMonitor> = new Map();

  // Signal processing
  private signalBuffer: NormalizedSignal[] = [];
  private signalProcessor: any = null; // Will be injected

  // Health monitoring
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private feedHealth: Map<string, FeedHealth> = new Map();

  // Performance tracking
  private startTime: Date = new Date();
  private totalMessages: number = 0;
  private totalErrors: number = 0;

  constructor(config: FeedManagerConfig) {
    super();
    this.logger = new Logger('FeedManager');
    this.config = config;
  }

  async initialize(signalProcessor?: any): Promise<void> {
    try {
      this.logger.info('Initializing feed manager...');

      // Store signal processor reference
      this.signalProcessor = signalProcessor;

      // Initialize market data feeds
      await this.initializeMarketDataFeeds();

      // Initialize blockchain monitors
      await this.initializeBlockchainMonitors();

      // Initialize social media feeds (placeholder)
      await this.initializeSocialMediaFeeds();

      // Initialize news feeds (placeholder)
      await this.initializeNewsFeeds();

      // Initialize DeFi metrics (placeholder)
      await this.initializeDeFiMetrics();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      this.logger.info('✅ Feed manager initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize feed manager', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Feed manager is not initialized');
    }

    try {
      this.logger.info('Starting all data feeds...');

      // Start market data feeds
      for (const feed of this.marketDataFeeds.values()) {
        await feed.start();
      }

      // Start blockchain monitors
      for (const monitor of this.blockchainMonitors.values()) {
        await monitor.start();
      }

      // Start social media feeds (placeholder)
      await this.startSocialMediaFeeds();

      // Start news feeds (placeholder)
      await this.startNewsFeeds();

      // Start DeFi metrics (placeholder)
      await this.startDeFiMetrics();

      this.isRunning = true;
      this.startTime = new Date();

      this.logger.info('✅ All data feeds started successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to start feed manager', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping all data feeds...');

      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      // Stop market data feeds
      for (const feed of this.marketDataFeeds.values()) {
        await feed.stop();
      }

      // Stop blockchain monitors
      for (const monitor of this.blockchainMonitors.values()) {
        await monitor.stop();
      }

      // Stop social media feeds (placeholder)
      await this.stopSocialMediaFeeds();

      // Stop news feeds (placeholder)
      await this.stopNewsFeeds();

      // Stop DeFi metrics (placeholder)
      await this.stopDeFiMetrics();

      this.isRunning = false;
      this.isInitialized = false;

      this.logger.info('✅ All data feeds stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop feed manager', error);
      throw error;
    }
  }

  /**
   * Initialize market data feeds
   */
  private async initializeMarketDataFeeds(): Promise<void> {
    for (const exchangeConfig of this.config.marketData.exchanges) {
      try {
        const feed = new MarketDataFeedClass(exchangeConfig);
        await feed.initialize();

        // Subscribe to configured streams
        const streams = this.generateMarketDataStreams(exchangeConfig, this.config.marketData.symbols);
        feed.subscribe(streams);

        // Set up event handlers
        this.setupMarketDataEventHandlers(feed);

        this.marketDataFeeds.set(exchangeConfig.name, feed);
        this.logger.info('Market data feed initialized', { exchange: exchangeConfig.name });

      } catch (error: any) {
        this.logger.error('Failed to initialize market data feed', {
          exchange: exchangeConfig.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Initialize blockchain monitors
   */
  private async initializeBlockchainMonitors(): Promise<void> {
    for (const blockchainConfig of this.config.blockchain.networks) {
      try {
        const monitor = new BlockchainMonitor(blockchainConfig);
        await monitor.initialize();

        // Set up event handlers
        this.setupBlockchainEventHandlers(monitor);

        this.blockchainMonitors.set(blockchainConfig.name, monitor);
        this.logger.info('Blockchain monitor initialized', { chain: blockchainConfig.name });

      } catch (error: any) {
        this.logger.error('Failed to initialize blockchain monitor', {
          chain: blockchainConfig.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Initialize social media feeds (placeholder)
   */
  private async initializeSocialMediaFeeds(): Promise<void> {
    // Placeholder for social media feed initialization
    this.logger.info('Social media feeds initialized (placeholder)');
  }

  /**
   * Initialize news feeds (placeholder)
   */
  private async initializeNewsFeeds(): Promise<void> {
    // Placeholder for news feed initialization
    this.logger.info('News feeds initialized (placeholder)');
  }

  /**
   * Initialize DeFi metrics (placeholder)
   */
  private async initializeDeFiMetrics(): Promise<void> {
    // Placeholder for DeFi metrics initialization
    this.logger.info('DeFi metrics initialized (placeholder)');
  }

  /**
   * Start social media feeds (placeholder)
   */
  private async startSocialMediaFeeds(): Promise<void> {
    // Placeholder for social media feed startup
  }

  /**
   * Start news feeds (placeholder)
   */
  private async startNewsFeeds(): Promise<void> {
    // Placeholder for news feed startup
  }

  /**
   * Start DeFi metrics (placeholder)
   */
  private async startDeFiMetrics(): Promise<void> {
    // Placeholder for DeFi metrics startup
  }

  /**
   * Stop social media feeds (placeholder)
   */
  private async stopSocialMediaFeeds(): Promise<void> {
    // Placeholder for social media feed shutdown
  }

  /**
   * Stop news feeds (placeholder)
   */
  private async stopNewsFeeds(): Promise<void> {
    // Placeholder for news feed shutdown
  }

  /**
   * Stop DeFi metrics (placeholder)
   */
  private async stopDeFiMetrics(): Promise<void> {
    // Placeholder for DeFi metrics shutdown
  }

  /**
   * Generate market data streams for subscription
   */
  private generateMarketDataStreams(exchangeConfig: ExchangeConfig, symbols: string[]): string[] {
    const streams: string[] = [];

    for (const symbol of symbols) {
      if (exchangeConfig.supportedFeatures.orderBook) {
        streams.push(`depth:${symbol}`);
      }
      if (exchangeConfig.supportedFeatures.trades) {
        streams.push(`trade:${symbol}`);
      }
      if (exchangeConfig.supportedFeatures.quotes) {
        streams.push(`quote:${symbol}`);
      }
      if (exchangeConfig.supportedFeatures.ticker) {
        streams.push(`ticker:${symbol}`);
      }
    }

    return streams;
  }

  /**
   * Set up market data event handlers
   */
  private setupMarketDataEventHandlers(feed: MarketDataFeedClass): void {
    feed.on('feed', (data: any) => {
      this.handleMarketData(data);
    });

    feed.on('trade', (tradeData: any) => {
      this.handleTradeUpdate(tradeData);
    });

    feed.on('orderbook', (orderBookData: any) => {
      this.handleOrderBookUpdate(orderBookData);
    });

    feed.on('connected', () => {
      this.updateFeedHealth(feed.config.name, 'market', 'healthy');
    });

    feed.on('error', (error: Error) => {
      this.totalErrors++;
      this.updateFeedHealth(feed.config.name, 'market', 'degraded');
    });
  }

  /**
   * Set up blockchain event handlers
   */
  private setupBlockchainEventHandlers(monitor: BlockchainMonitor): void {
    monitor.on('block', (blockData: any) => {
      this.handleBlockUpdate(blockData);
    });

    monitor.on('transaction', (transactionData: any) => {
      this.handleTransactionUpdate(transactionData);
    });

    monitor.on('tokenTransfer', (transferData: any) => {
      this.handleTokenTransfer(transferData);
    });

    monitor.on('dexTrade', (tradeData: any) => {
      this.handleDEXTrade(tradeData);
    });

    monitor.on('whaleActivity', (activityData: any) => {
      this.handleWhaleActivity(activityData);
    });
  }

  /**
   * Handle incoming market data
   */
  private handleMarketData(data: any): void {
    this.totalMessages++;

    try {
      // Convert market data to normalized signal
      const signal = this.convertMarketDataToSignal(data);

      if (signal) {
        this.addSignalToBuffer(signal);
      }
    } catch (error: any) {
      this.logger.error('Failed to handle market data', { data, error: error.message });
      this.totalErrors++;
    }
  }

  /**
   * Handle trade updates
   */
  private handleTradeUpdate(tradeData: any): void {
    try {
      // Create price signal from trade
      const priceSignal: NormalizedSignal = {
        id: `price_${tradeData.exchange}_${tradeData.symbol}_${Date.now()}`,
        type: 'price',
        source: tradeData.exchange,
        timestamp: tradeData.timestamp,
        normalizedValues: {
          price: this.normalizePrice(tradeData.price),
          volume: this.normalizeVolume(tradeData.quantity)
        },
        originalValues: {
          price: tradeData.price,
          quantity: tradeData.quantity
        },
        features: this.extractPriceFeatures(tradeData),
        metadata: {
          sourceId: tradeData.exchange,
          confidence: 0.9, // High confidence for exchange data
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'market_data',
          version: '1.0'
        }
      };

      this.addSignalToBuffer(priceSignal);

    } catch (error: any) {
      this.logger.error('Failed to handle trade update', { tradeData, error: error.message });
      this.totalErrors++;
    }
  }

  /**
   * Handle order book updates
   */
  private handleOrderBookUpdate(orderBookData: any): void {
    try {
      // Create order book signal
      const orderBookSignal: NormalizedSignal = {
        id: `orderbook_${orderBookData.exchange}_${orderBookData.symbol}_${Date.now()}`,
        type: 'technical',
        source: orderBookData.exchange,
        timestamp: orderBookData.timestamp,
        normalizedValues: {
          bid_ask_spread: this.calculateBidAskSpread(orderBookData.bids, orderBookData.asks),
          order_book_imbalance: this.calculateOrderBookImbalance(orderBookData.bids, orderBookData.asks)
        },
        originalValues: {
          bids: orderBookData.bids,
          asks: orderBookData.asks
        },
        features: this.extractOrderBookFeatures(orderBookData),
        metadata: {
          sourceId: orderBookData.exchange,
          confidence: 0.85,
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'order_book',
          version: '1.0'
        }
      };

      this.addSignalToBuffer(orderBookSignal);

    } catch (error: any) {
      this.logger.error('Failed to handle order book update', { orderBookData, error: error.message });
      this.totalErrors++;
    }
  }

  /**
   * Handle blockchain block updates
   */
  private handleBlockUpdate(blockData: any): void {
    try {
      // Create on-chain signal from block data
      const onChainSignal: NormalizedSignal = {
        id: `onchain_${blockData.chain}_${blockData.blockNumber}_${Date.now()}`,
        type: 'on_chain',
        source: blockData.chain,
        timestamp: blockData.timestamp,
        normalizedValues: {
          gas_used_ratio: blockData.gasUsed / blockData.gasLimit,
          transaction_count: this.normalizeTransactionCount(blockData.transactions)
        },
        originalValues: {
          gasUsed: blockData.gasUsed,
          gasLimit: blockData.gasLimit,
          transactions: blockData.transactions
        },
        features: this.extractBlockFeatures(blockData),
        metadata: {
          sourceId: blockData.chain,
          confidence: 0.95, // High confidence for blockchain data
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'blockchain',
          version: '1.0'
        }
      };

      this.addSignalToBuffer(onChainSignal);

    } catch (error: any) {
      this.logger.error('Failed to handle block update', { blockData, error: error.message });
      this.totalErrors++;
    }
  }

  /**
   * Handle transaction updates
   */
  private handleTransactionUpdate(transactionData: any): void {
    try {
      // Create transaction-based signals
      if (transactionData.value && parseInt(transactionData.value, 16) > 0) {
        // Large value transfer signal
        const transferSignal: NormalizedSignal = {
          id: `transfer_${transactionData.hash}_${Date.now()}`,
          type: 'on_chain',
          source: transactionData.chain,
          timestamp: transactionData.timestamp,
          normalizedValues: {
            transfer_value: this.normalizeTransferValue(transactionData.value),
            gas_price: this.normalizeGasPrice(transactionData.gasPrice)
          },
          originalValues: {
            value: transactionData.value,
            gasPrice: transactionData.gasPrice
          },
          features: this.extractTransactionFeatures(transactionData),
          metadata: {
            sourceId: transactionData.chain,
            confidence: 0.9,
            normalizationMethod: 'z_score',
            featureExtractionMethod: 'transaction',
            version: '1.0'
          }
        };

        this.addSignalToBuffer(transferSignal);
      }

    } catch (error: any) {
      this.logger.error('Failed to handle transaction update', { transactionData, error: error.message });
      this.totalErrors++;
    }
  }

  /**
   * Handle token transfers
   */
  private handleTokenTransfer(transferData: any): void {
    try {
      // Create token transfer signal
      const tokenSignal: NormalizedSignal = {
        id: `token_${transferData.transactionHash}_${Date.now()}`,
        type: 'on_chain',
        source: transferData.chain,
        timestamp: transferData.timestamp,
        normalizedValues: {
          transfer_amount: this.normalizeTokenAmount(transferData.amount, transferData.decimals),
          token_price_impact: this.calculateTokenPriceImpact(transferData)
        },
        originalValues: {
          amount: transferData.amount,
          decimals: transferData.decimals,
          tokenAddress: transferData.tokenAddress
        },
        features: this.extractTokenFeatures(transferData),
        metadata: {
          sourceId: transferData.chain,
          confidence: 0.85,
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'token_transfer',
          version: '1.0'
        }
      };

      this.addSignalToBuffer(tokenSignal);

    } catch (error: any) {
      this.logger.error('Failed to handle token transfer', { transferData, error: error.message });
      this.totalErrors++;
    }
  }

  /**
   * Handle DEX trades
   */
  private handleDEXTrade(tradeData: any): void {
    try {
      // Create DEX trade signal
      const dexSignal: NormalizedSignal = {
        id: `dex_${tradeData.transactionHash}_${Date.now()}`,
        type: 'defi_metrics',
        source: tradeData.exchange,
        timestamp: tradeData.timestamp,
        normalizedValues: {
          trade_volume: this.normalizeTradeVolume(tradeData.amountIn, tradeData.amountOut),
          price_impact: this.calculatePriceImpact(tradeData)
        },
        originalValues: {
          amountIn: tradeData.amountIn,
          amountOut: tradeData.amountOut,
          price: tradeData.price
        },
        features: this.extractDEXFeatures(tradeData),
        metadata: {
          sourceId: tradeData.exchange,
          confidence: 0.8,
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'dex_trade',
          version: '1.0'
        }
      };

      this.addSignalToBuffer(dexSignal);

    } catch (error: any) {
      this.logger.error('Failed to handle DEX trade', { tradeData, error: error.message });
      this.totalErrors++;
    }
  }

  /**
   * Handle whale activity
   */
  private handleWhaleActivity(activityData: any): void {
    try {
      // Create whale activity signal
      const whaleSignal: NormalizedSignal = {
        id: `whale_${activityData.transaction.hash}_${Date.now()}`,
        type: 'on_chain',
        source: activityData.transaction.chain,
        timestamp: activityData.timestamp,
        normalizedValues: {
          whale_activity_score: this.calculateWhaleActivityScore(activityData.value, activityData.threshold),
          transaction_value: this.normalizeTransferValue(activityData.transaction.value)
        },
        originalValues: {
          whaleValue: activityData.value,
          threshold: activityData.threshold,
          transactionValue: activityData.transaction.value
        },
        features: this.extractWhaleFeatures(activityData),
        metadata: {
          sourceId: activityData.transaction.chain,
          confidence: 0.95, // High confidence for whale detection
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'whale_detection',
          version: '1.0'
        }
      };

      this.addSignalToBuffer(whaleSignal);

    } catch (error: any) {
      this.logger.error('Failed to handle whale activity', { activityData, error: error.message });
      this.totalErrors++;
    }
  }

  /**
   * Convert market data to normalized signal
   */
  private convertMarketDataToSignal(data: any): NormalizedSignal | null {
    // This would be implemented based on the specific data format
    // For now, return null as placeholder
    return null;
  }

  /**
   * Add signal to processing buffer
   */
  private addSignalToBuffer(signal: NormalizedSignal): void {
    this.signalBuffer.push(signal);

    // Process buffer if it gets too large
    if (this.signalBuffer.length >= this.config.maxBufferSize) {
      this.processSignalBuffer();
    }
  }

  /**
   * Process accumulated signals
   */
  private processSignalBuffer(): void {
    if (this.signalBuffer.length === 0) return;

    try {
      // Process signals through the signal evaluation engine
      if (this.signalProcessor) {
        // Send to signal evaluation engine for processing
        this.signalProcessor.processSignals(this.signalBuffer);
      }

      // Clear buffer
      this.signalBuffer = [];

      this.logger.debug('Processed signal buffer', { count: this.signalBuffer.length });

    } catch (error: any) {
      this.logger.error('Failed to process signal buffer', error);
      this.totalErrors++;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all feeds
   */
  private performHealthCheck(): void {
    try {
      // Check market data feeds
      for (const [name, feed] of this.marketDataFeeds) {
        const health = feed.getHealth();
        this.updateFeedHealth(feed.config.name, 'market', health.status);
      }

      // Check blockchain monitors
      for (const [name, monitor] of this.blockchainMonitors) {
        const health = monitor.getHealth();
        this.updateFeedHealth(monitor.config.name, 'blockchain', health.status);
      }

      // Emit health update
      this.emit('healthUpdate', this.getFeedMetrics());

    } catch (error: any) {
      this.logger.error('Health check failed', error);
    }
  }

  /**
   * Update feed health status
   */
  private updateFeedHealth(provider: string, feedType: string, status: FeedHealth['status']): void {
    const key = `${provider}_${feedType}`;
    const existingHealth = this.feedHealth.get(key);

    if (existingHealth) {
      existingHealth.status = status;
      existingHealth.lastUpdate = new Date();
      this.feedHealth.set(key, existingHealth);
    }
  }

  /**
   * Get feed metrics
   */
  getFeedMetrics(): FeedMetrics {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();
    const uptimeHours = uptime / (1000 * 60 * 60);

    const healthyFeeds = Array.from(this.feedHealth.values())
      .filter(health => health.status === 'healthy').length;

    const totalThroughput = Array.from(this.feedHealth.values())
      .reduce((sum, health) => sum + health.throughput, 0);

    const avgLatency = Array.from(this.feedHealth.values())
      .reduce((sum, health) => sum + health.latency, 0) / Math.max(this.feedHealth.size, 1);

    const errorRate = uptimeHours > 0 ? (this.totalErrors / uptimeHours) : 0;

    const bufferUtilization = (this.signalBuffer.length / this.config.maxBufferSize) * 100;

    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    return {
      totalFeeds: this.feedHealth.size,
      healthyFeeds,
      totalThroughput,
      avgLatency,
      errorRate,
      bufferUtilization,
      memoryUsage,
      timestamp: now
    };
  }

  /**
   * Check if all feeds meet latency requirements
   */
  meetsLatencyRequirements(requirements: LatencyRequirements): boolean {
    const metrics = this.getFeedMetrics();

    return (
      metrics.avgLatency <= requirements.marketData &&
      metrics.errorRate < 0.01 // Less than 1% error rate
    );
  }

  /**
   * Get current status
   */
  getStatus(): {
    initialized: boolean;
    running: boolean;
    totalMessages: number;
    totalErrors: number;
    uptime: number;
    bufferSize: number;
  } {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      totalMessages: this.totalMessages,
      totalErrors: this.totalErrors,
      uptime,
      bufferSize: this.signalBuffer.length
    };
  }

  /**
   * Get feed health summary
   */
  getFeedHealthSummary(): {
    marketData: FeedHealth[];
    blockchain: FeedHealth[];
    overall: {
      healthy: number;
      degraded: number;
      unhealthy: number;
      offline: number;
    };
  } {
    const marketData: FeedHealth[] = [];
    const blockchain: FeedHealth[] = [];
    const overall = { healthy: 0, degraded: 0, unhealthy: 0, offline: 0 };

    for (const [key, health] of this.feedHealth) {
      if (key.includes('market')) {
        marketData.push(health);
      } else if (key.includes('blockchain')) {
        blockchain.push(health);
      }

      switch (health.status) {
        case 'healthy': overall.healthy++; break;
        case 'degraded': overall.degraded++; break;
        case 'unhealthy': overall.unhealthy++; break;
        case 'offline': overall.offline++; break;
      }
    }

    return { marketData, blockchain, overall };
  }

  // Placeholder normalization and feature extraction methods
  private normalizePrice(price: number): number { return price / 50000; } // Normalize around $50k
  private normalizeVolume(volume: number): number { return Math.log10(volume + 1) / 6; }
  private normalizeTransactionCount(count: number): number { return count / 100; }
  private normalizeTransferValue(value: string): number { return parseInt(value, 16) / 1e18 / 1000; }
  private normalizeGasPrice(gasPrice: string): number { return parseInt(gasPrice, 16) / 1e9 / 50; }
  private normalizeTokenAmount(amount: string, decimals: number): number { return parseInt(amount, 16) / Math.pow(10, decimals) / 1000000; }
  private normalizeTradeVolume(amountIn: string, amountOut: string): number { return (parseInt(amountIn, 16) + parseInt(amountOut, 16)) / 1e18 / 1000; }

  private calculateBidAskSpread(bids: any[], asks: any[]): number {
    const bestBid = Math.max(...bids.map(b => b.price));
    const bestAsk = Math.min(...asks.map(a => a.price));
    return (bestAsk - bestBid) / bestBid;
  }

  private calculateOrderBookImbalance(bids: any[], asks: any[]): number {
    const bidVolume = bids.reduce((sum, b) => sum + b.quantity, 0);
    const askVolume = asks.reduce((sum, a) => sum + a.quantity, 0);
    return (bidVolume - askVolume) / (bidVolume + askVolume);
  }

  private calculateTokenPriceImpact(transfer: any): number { return 0.1; } // Placeholder
  private calculatePriceImpact(trade: any): number { return 0.05; } // Placeholder
  private calculateWhaleActivityScore(value: number, threshold: number): number {
    return Math.min(1, value / threshold);
  }

  private extractPriceFeatures(tradeData: any): any { return {}; }
  private extractOrderBookFeatures(orderBookData: any): any { return {}; }
  private extractBlockFeatures(blockData: any): any { return {}; }
  private extractTransactionFeatures(transactionData: any): any { return {}; }
  private extractTokenFeatures(transferData: any): any { return {}; }
  private extractDEXFeatures(tradeData: any): any { return {}; }
  private extractWhaleFeatures(activityData: any): any { return {}; }

  /**
   * Create default configuration
   */
  static createDefaultConfig(): FeedManagerConfig {
    return {
      marketData: {
        exchanges: [],
        symbols: [],
        enabledStreams: []
      },
      blockchain: {
        networks: [],
        enabledFeatures: []
      },
      socialMedia: {
        platforms: [],
        keywords: [],
        languages: []
      },
      news: {
        sources: [],
        categories: []
      },
      defi: {
        protocols: [],
        metrics: []
      },
      normalization: {
        timestampSync: {
          enabled: true,
          maxDrift: 1000,
          syncInterval: 60
        },
        dataValidation: {
          enabled: true,
          strictMode: false,
          allowedAge: 300
        },
        rateLimiting: {
          enabled: true,
          burstLimit: 1000,
          sustainedRate: 100
        }
      },
      healthCheckInterval: 30000,
      maxBufferSize: 10000
    };
  }
}
