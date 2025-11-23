/**
 * =========================================
 * EXTERNAL DATA INTEGRATION SERVICE
 * =========================================
 * Unified service orchestrating all external data sources with comprehensive monitoring
 */

import { EventEmitter } from 'events';
import { PriceFeedManager, PriceData } from './websocket/PriceFeedManager';
import { BlockchainMonitor, TransactionData, BlockData, LogData } from './blockchain/BlockchainMonitor';
import { SentimentAnalyzer, SocialMediaPost, SentimentAnalysis } from './social/SentimentAnalyzer';
import { Logger } from './utils/Logger';

export interface ExternalDataIntegrationConfig {
  priceFeeds: {
    enabled: boolean;
    endpoints: Array<{
      id: string;
      name: string;
      url: string;
      type: 'price' | 'orderbook' | 'trades';
      symbols: string[];
      reconnectDelay: number;
      heartbeatInterval: number;
      maxReconnectAttempts: number;
    }>;
  };
  blockchain: {
    enabled: boolean;
    nodes: Array<{
      id: string;
      name: string;
      url: string;
      chainId: number;
      type: 'full' | 'archive' | 'light';
      priority: number;
      healthCheckInterval: number;
      maxReconnectAttempts: number;
    }>;
    subscriptions: {
      newBlocks: boolean;
      pendingTransactions: boolean;
      logs: {
        enabled: boolean;
        addresses?: string[];
        topics?: string[];
      };
    };
  };
  socialMedia: {
    enabled: boolean;
    platforms: {
      twitter?: {
        enabled: boolean;
        bearerToken: string;
      };
      reddit?: {
        enabled: boolean;
        clientId: string;
        clientSecret: string;
        userAgent: string;
      };
      telegram?: {
        enabled: boolean;
        botToken: string;
        channels: string[];
      };
      discord?: {
        enabled: boolean;
        botToken: string;
        guilds: string[];
      };
    };
    keywords: string[];
  };
  global: {
    bufferSize: number;
    maxLatency: number;
    healthCheckInterval: number;
    failoverThreshold: number;
  };
}

export interface UnifiedHealthStatus {
  isRunning: boolean;
  components: {
    priceFeeds: {
      status: string;
      activeConnections: number;
      totalConnections: number;
      averageLatency: number;
      messagesPerSecond: number;
    };
    blockchain: {
      status: string;
      healthyNodes: number;
      totalNodes: number;
      transactionsPerSecond: number;
      blocksPerSecond: number;
    };
    socialMedia: {
      status: string;
      platformsActive: string[];
      postsCollected: number;
      sentimentAnalyses: number;
    };
  };
  overall: {
    dataPointsPerSecond: number;
    averageLatency: number;
    uptime: number;
    errors: number;
  };
}

export class ExternalDataIntegration extends EventEmitter {
  private logger: Logger;
  private config: ExternalDataIntegrationConfig;
  private priceFeedManager?: PriceFeedManager;
  private blockchainMonitor?: BlockchainMonitor;
  private sentimentAnalyzer?: SentimentAnalyzer;
  private isRunning: boolean = false;

  // Performance tracking
  private startTime: number = Date.now();
  private totalDataPoints: number = 0;
  private totalErrors: number = 0;

  constructor(config: ExternalDataIntegrationConfig) {
    super();
    this.logger = new Logger('ExternalDataIntegration');

    this.config = {
      global: {
        bufferSize: 10000,
        maxLatency: 1000,
        healthCheckInterval: 30000,
        failoverThreshold: 3
      },
      ...config
    };
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting External Data Integration Service...');
      this.isRunning = true;
      this.startTime = Date.now();

      // Initialize price feed manager
      if (this.config.priceFeeds.enabled) {
        await this.initializePriceFeeds();
      }

      // Initialize blockchain monitor
      if (this.config.blockchain.enabled) {
        await this.initializeBlockchainMonitor();
      }

      // Initialize social media sentiment analyzer
      if (this.config.socialMedia.enabled) {
        await this.initializeSentimentAnalyzer();
      }

      // Set up event forwarding
      this.setupEventForwarding();

      this.logger.info('✅ External Data Integration Service started successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to start External Data Integration Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping External Data Integration Service...');
      this.isRunning = false;

      // Stop all components
      if (this.priceFeedManager) {
        await this.priceFeedManager.stop();
      }

      if (this.blockchainMonitor) {
        await this.blockchainMonitor.stop();
      }

      if (this.sentimentAnalyzer) {
        await this.sentimentAnalyzer.stop();
      }

      this.logger.info('✅ External Data Integration Service stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop External Data Integration Service', error);
      throw error;
    }
  }

  /**
   * Get current price for a symbol from any source
   */
  getCurrentPrice(symbol: string): PriceData | null {
    if (this.priceFeedManager) {
      return this.priceFeedManager.getCurrentPrice(symbol);
    }
    return null;
  }

  /**
   * Get recent transactions from blockchain monitor
   */
  getRecentTransactions(limit: number = 100): TransactionData[] {
    if (this.blockchainMonitor) {
      return this.blockchainMonitor.getRecentTransactions(limit);
    }
    return [];
  }

  /**
   * Get recent blocks from blockchain monitor
   */
  getRecentBlocks(limit: number = 100): BlockData[] {
    if (this.blockchainMonitor) {
      return this.blockchainMonitor.getRecentBlocks(limit);
    }
    return [];
  }

  /**
   * Get recent social media posts
   */
  getRecentPosts(limit: number = 100): SocialMediaPost[] {
    if (this.sentimentAnalyzer) {
      return this.sentimentAnalyzer.getRecentPosts(limit);
    }
    return [];
  }

  /**
   * Get social media sentiment for specific keywords
   */
  async getSentimentForKeywords(keywords: string[], limit: number = 50): Promise<Array<{
    post: SocialMediaPost;
    sentiment: SentimentAnalysis;
  }>> {
    if (!this.sentimentAnalyzer) return [];

    const posts = this.sentimentAnalyzer.getPostsByKeywords(keywords, limit);
    const results = [];

    for (const post of posts) {
      try {
        const sentiment = await this.sentimentAnalyzer.analyzeSentiment(post);
        results.push({ post, sentiment });
      } catch (error) {
        this.logger.error(`Failed to analyze sentiment for post ${post.id}`, error);
      }
    }

    return results;
  }

  /**
   * Get comprehensive health status
   */
  getHealthStatus(): UnifiedHealthStatus {
    const priceFeeds = this.priceFeedManager?.getHealthStatus() || {
      isRunning: false,
      activeConnections: 0,
      totalConnections: 0,
      averageLatency: 0,
      messagesPerSecond: 0
    };

    const blockchain = this.blockchainMonitor?.getHealthStatus() || {
      isRunning: false,
      healthyNodes: 0,
      totalNodes: 0,
      transactionsPerSecond: 0,
      blocksPerSecond: 0
    };

    const socialMedia = this.sentimentAnalyzer?.getHealthStatus() || {
      isRunning: false,
      platformsActive: [],
      postsCollected: 0,
      sentimentAnalyses: 0
    };

    const uptime = Date.now() - this.startTime;
    const dataPointsPerSecond = this.totalDataPoints / Math.max(1, uptime / 1000);

    return {
      isRunning: this.isRunning,
      components: {
        priceFeeds: {
          status: priceFeeds.isRunning ? 'active' : 'inactive',
          activeConnections: priceFeeds.activeConnections,
          totalConnections: priceFeeds.totalConnections,
          averageLatency: priceFeeds.averageLatency,
          messagesPerSecond: priceFeeds.messagesPerSecond
        },
        blockchain: {
          status: blockchain.isRunning ? 'active' : 'inactive',
          healthyNodes: blockchain.healthyNodes,
          totalNodes: blockchain.totalNodes,
          transactionsPerSecond: blockchain.transactionsPerSecond,
          blocksPerSecond: blockchain.blocksPerSecond
        },
        socialMedia: {
          status: socialMedia.isRunning ? 'active' : 'inactive',
          platformsActive: socialMedia.platformsActive,
          postsCollected: socialMedia.postsCollected,
          sentimentAnalyses: socialMedia.sentimentAnalyses
        }
      },
      overall: {
        dataPointsPerSecond,
        averageLatency: (priceFeeds.averageLatency + blockchain.averageLatency) / 2,
        uptime,
        errors: this.totalErrors
      }
    };
  }

  /**
   * Get aggregated market sentiment
   */
  async getMarketSentiment(timeframe: '1h' | '6h' | '24h' | '7d' = '24h'): Promise<{
    overall: {
      score: number;
      confidence: number;
      label: 'positive' | 'negative' | 'neutral' | 'mixed';
    };
    byPlatform: Record<string, SentimentAnalysis>;
    trends: {
      priceCorrelation: number;
      volumeCorrelation: number;
      urgencyDistribution: Record<string, number>;
    };
  }> {
    if (!this.sentimentAnalyzer) {
      return {
        overall: { score: 0, confidence: 0, label: 'neutral' },
        byPlatform: {},
        trends: { priceCorrelation: 0, volumeCorrelation: 0, urgencyDistribution: {} }
      };
    }

    const timeframeMs = this.getTimeframeMs(timeframe);
    const cutoffTime = new Date(Date.now() - timeframeMs);

    // Get posts from timeframe
    const posts = this.sentimentAnalyzer.getRecentPosts(1000);
    const recentPosts = posts.filter(post => post.timestamp >= cutoffTime);

    if (recentPosts.length === 0) {
      return {
        overall: { score: 0, confidence: 0, label: 'neutral' },
        byPlatform: {},
        trends: { priceCorrelation: 0, volumeCorrelation: 0, urgencyDistribution: {} }
      };
    }

    // Calculate overall sentiment
    let totalScore = 0;
    let totalConfidence = 0;
    let platformScores: Record<string, number[]> = {};

    for (const post of recentPosts) {
      const sentiment = await this.sentimentAnalyzer.analyzeSentiment(post);
      totalScore += sentiment.score * sentiment.confidence;
      totalConfidence += sentiment.confidence;

      if (!platformScores[post.platform]) {
        platformScores[post.platform] = [];
      }
      platformScores[post.platform].push(sentiment.score);
    }

    const avgScore = totalConfidence > 0 ? totalScore / totalConfidence : 0;
    const avgConfidence = totalConfidence / recentPosts.length;

    // Determine overall label
    let label: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
    if (avgScore > 0.1) label = 'positive';
    else if (avgScore < -0.1) label = 'negative';
    else if (Math.abs(avgScore) > 0.3) label = 'mixed';

    // Calculate platform-specific sentiment
    const byPlatform: Record<string, SentimentAnalysis> = {};
    for (const [platform, scores] of Object.entries(platformScores)) {
      const platformAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
      byPlatform[platform] = {
        score: platformAvg,
        confidence: Math.min(0.9, scores.length / 10),
        label: platformAvg > 0.1 ? 'positive' : platformAvg < -0.1 ? 'negative' : 'neutral',
        emotions: { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0, disgust: 0 },
        topics: [],
        entities: { cryptocurrencies: [], projects: [], people: [], organizations: [] },
        urgency: 'medium',
        marketImpact: Math.abs(platformAvg)
      };
    }

    // Calculate trends (simplified)
    const trends = {
      priceCorrelation: Math.random() * 0.6 - 0.3, // Random correlation for demo
      volumeCorrelation: Math.random() * 0.4 - 0.2,
      urgencyDistribution: {
        low: 0.4,
        medium: 0.4,
        high: 0.15,
        critical: 0.05
      }
    };

    return {
      overall: {
        score: avgScore,
        confidence: avgConfidence,
        label
      },
      byPlatform,
      trends
    };
  }

  private async initializePriceFeeds(): Promise<void> {
    this.priceFeedManager = new PriceFeedManager({
      endpoints: this.config.priceFeeds.endpoints,
      bufferSize: this.config.global.bufferSize,
      maxLatency: this.config.global.maxLatency,
      failoverThreshold: this.config.global.failoverThreshold,
      healthCheckInterval: this.config.global.healthCheckInterval
    });

    // Forward price feed events
    this.priceFeedManager.on('price-update', (event) => {
      this.totalDataPoints++;
      this.emit('price-update', event);
    });

    this.priceFeedManager.on('latency-warning', (event) => {
      this.emit('latency-warning', event);
    });

    await this.priceFeedManager.start();
    this.logger.info('✅ Price feeds initialized');
  }

  private async initializeBlockchainMonitor(): Promise<void> {
    this.blockchainMonitor = new BlockchainMonitor({
      nodes: this.config.blockchain.nodes,
      subscriptions: this.config.blockchain.subscriptions,
      polling: {
        blockInterval: 12000, // 12 seconds
        healthCheckInterval: this.config.global.healthCheckInterval
      },
      bufferSize: this.config.global.bufferSize,
      maxLatency: this.config.global.maxLatency,
      failoverThreshold: this.config.global.failoverThreshold
    });

    // Forward blockchain events
    this.blockchainMonitor.on('new-block', (event) => {
      this.totalDataPoints++;
      this.emit('new-block', event);
    });

    this.blockchainMonitor.on('pending-transaction', (event) => {
      this.totalDataPoints++;
      this.emit('pending-transaction', event);
    });

    this.blockchainMonitor.on('new-log', (event) => {
      this.totalDataPoints++;
      this.emit('new-log', event);
    });

    await this.blockchainMonitor.start();
    this.logger.info('✅ Blockchain monitor initialized');
  }

  private async initializeSentimentAnalyzer(): Promise<void> {
    this.sentimentAnalyzer = new SentimentAnalyzer({
      platforms: this.config.socialMedia.platforms,
      keywords: this.config.socialMedia.keywords,
      languages: ['en'],
      collection: {
        bufferSize: this.config.global.bufferSize,
        deduplicationWindow: 300,
        maxRetries: 3
      },
      sentiment: {
        model: 'advanced',
        cacheResults: true,
        cacheTtl: 3600
      }
    });

    // Forward social media events
    this.sentimentAnalyzer.on('new-post', (event) => {
      this.totalDataPoints++;
      this.emit('new-post', event);
    });

    this.sentimentAnalyzer.on('sentiment-analysis', (event) => {
      this.totalDataPoints++;
      this.emit('sentiment-analysis', event);
    });

    await this.sentimentAnalyzer.start();
    this.logger.info('✅ Social media sentiment analyzer initialized');
  }

  private setupEventForwarding(): void {
    // Error handling
    if (this.priceFeedManager) {
      this.priceFeedManager.on('connection-error', (event) => {
        this.totalErrors++;
        this.emit('component-error', { component: 'price-feeds', ...event });
      });
    }

    if (this.blockchainMonitor) {
      this.blockchainMonitor.on('error', (event) => {
        this.totalErrors++;
        this.emit('component-error', { component: 'blockchain', ...event });
      });
    }

    if (this.sentimentAnalyzer) {
      this.sentimentAnalyzer.on('error', (event) => {
        this.totalErrors++;
        this.emit('component-error', { component: 'social-media', ...event });
      });
    }
  }

  private getTimeframeMs(timeframe: '1h' | '6h' | '24h' | '7d'): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  getStatus(): string {
    const components = [];

    if (this.priceFeedManager) {
      components.push(`Price: ${this.priceFeedManager.getStatus()}`);
    }

    if (this.blockchainMonitor) {
      components.push(`Blockchain: ${this.blockchainMonitor.getStatus()}`);
    }

    if (this.sentimentAnalyzer) {
      components.push(`Social: ${this.sentimentAnalyzer.getStatus()}`);
    }

    return this.isRunning ? `Running (${components.join(', ')})` : 'Stopped';
  }
}
