/**
 * =========================================
 * ELITE EXTERNAL DATA INTEGRATION SERVICE
 * =========================================
 * World-class external data integration system designed for sub-second
 * market data processing, blockchain monitoring, social sentiment analysis,
 * news aggregation, and DeFi metrics collection. Handles tens of thousands
 * of concurrent connections with enterprise-grade reliability and monitoring.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../utils/Logger';
import { WebSocketConnectionManager, WebSocketConfig } from './connectors/WebSocketConnectionManager';
import { BlockchainNodeManager, BlockchainConfig } from './connectors/BlockchainNodeManager';
import { SocialMediaIntegrationService, SocialMediaConfig } from './connectors/SocialMediaIntegrationService';
import { NewsIntegrationService, NewsConfig } from './connectors/NewsIntegrationService';
import { DeFiProtocolIntegrationService, DeFiConfig } from './connectors/DeFiProtocolIntegrationService';
import { ExternalDataPipeline } from './pipeline/ExternalDataPipeline';
import { ConnectionHealthMonitor, MonitoringConfig } from './monitoring/ConnectionHealthMonitor';
import { DataQualityValidator, ValidationConfig } from './validation/DataQualityValidator';

// Centralized error handling utility
class ExternalDataErrorHandler {
  private static instance: ExternalDataErrorHandler;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): ExternalDataErrorHandler {
    if (!ExternalDataErrorHandler.instance) {
      ExternalDataErrorHandler.instance = new ExternalDataErrorHandler();
    }
    return ExternalDataErrorHandler.instance;
  }

  handleError(error: unknown, context: string, service: string): never {
    if (error instanceof Error) {
      this.logger.error(`❌ Error in ${service} - ${context}`, {
        error: error.message,
        stack: error.stack,
        service
      });
      throw error;
    } else {
      const errorMessage = String(error);
      this.logger.error(`❌ Unknown error in ${service} - ${context}`, {
        error: errorMessage,
        service
      });
      throw new Error(`${context}: ${errorMessage}`);
    }
  }

  handleAsyncError<T>(promise: Promise<T>, context: string, service: string): Promise<T> {
    return promise.catch(error => this.handleError(error, context, service));
  }

  isRecoverableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timeout') ||
             message.includes('connection') ||
             message.includes('network') ||
             message.includes('rate limit');
    }
    return false;
  }
}

export interface ExternalDataConfig {
  websocket: {
    enabled: boolean;
    maxConnections: number;
    heartbeatInterval: number;
    reconnectionDelay: number;
    maxReconnectAttempts: number;
    bufferSize: number;
  };
  blockchain: {
    enabled: boolean;
    chains: {
      ethereum: { rpcUrls: string[]; subscriptions: string[] };
      bsc: { rpcUrls: string[]; subscriptions: string[] };
      solana: { rpcUrls: string[]; subscriptions: string[] };
      polygon: { rpcUrls: string[]; subscriptions: string[] };
    };
    maxConnectionsPerChain: number;
    blockReorgTolerance: number;
  };
  socialMedia: {
    enabled: boolean;
    twitter: { bearerToken?: string; rateLimit: number };
    reddit: { clientId?: string; clientSecret?: string; rateLimit: number };
    telegram: { botToken?: string; rateLimit: number };
    discord: { botToken?: string; rateLimit: number };
  };
  news: {
    enabled: boolean;
    newsApi: { apiKey?: string; rateLimit: number };
    cryptoNewsFeeds: string[];
    pollingInterval: number;
  };
  defi: {
    enabled: boolean;
    theGraph: { endpoints: string[]; rateLimit: number };
    defiLlama: { rateLimit: number };
    protocolApis: Record<string, { endpoint: string; rateLimit: number }>;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      connectionFailureRate: number;
      dataLatencyMs: number;
      errorRate: number;
    };
  };
  dataQuality: {
    enabled: boolean;
    schemaValidation: boolean;
    freshnessThreshold: number; // seconds
    accuracyThreshold: number; // percentage
  };
}

export interface ExternalDataMetrics {
  websocket: {
    activeConnections: number;
    totalConnections: number;
    messagesReceived: number;
    messagesBuffered: number;
    averageLatency: number;
    errorRate: number;
    reconnectionCount: number;
  };
  blockchain: {
    activeNodes: number;
    blocksProcessed: number;
    transactionsProcessed: number;
    reorganizations: number;
    averageBlockTime: number;
    rpcResponseTime: number;
  };
  socialMedia: {
    postsProcessed: number;
    apiCallsMade: number;
    rateLimitHits: number;
    sentimentScores: number;
    averageProcessingTime: number;
  };
  news: {
    articlesProcessed: number;
    feedsMonitored: number;
    breakingNewsDetected: number;
    averageFetchTime: number;
    cacheHitRate: number;
  };
  defi: {
    protocolsMonitored: number;
    metricsCollected: number;
    apiCallsMade: number;
    dataValidationErrors: number;
    cacheHitRate: number;
  };
  overall: {
    totalDataPoints: number;
    pipelineThroughput: number;
    errorRate: number;
    averageLatency: number;
    uptime: number;
  };
}

export interface ExternalDataEvent {
  type: 'websocket_connected' | 'websocket_disconnected' | 'blockchain_reorg' | 'social_post' | 'news_article' | 'defi_metric' | 'data_quality_issue' | 'connection_error';
  source: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export class ExternalDataIntegrationService extends EventEmitter {
  private static instance: ExternalDataIntegrationService;
  private logger: Logger;
  private config: ExternalDataConfig;
  private isRunning: boolean = false;
  private errorHandler: ExternalDataErrorHandler;

  // Core components
  private websocketManager: WebSocketConnectionManager;
  private blockchainManager: BlockchainNodeManager;
  private socialMediaService: SocialMediaIntegrationService;
  private newsService: NewsIntegrationService;
  private defiService: DeFiProtocolIntegrationService;
  private dataPipeline: ExternalDataPipeline;
  private healthMonitor: ConnectionHealthMonitor;
  private dataValidator: DataQualityValidator;

  // Metrics and monitoring
  private metrics: ExternalDataMetrics;
  private connectionStatus: Map<string, boolean> = new Map();
  private dataBuffer: Map<string, any[]> = new Map();

  constructor(config?: Partial<ExternalDataConfig>) {
    super();
    this.logger = Logger.getInstance();
    this.errorHandler = ExternalDataErrorHandler.getInstance();

    // Enterprise-grade default configuration
    this.config = {
      websocket: {
        enabled: true,
        maxConnections: 1000,
        heartbeatInterval: 30000,
        reconnectionDelay: 5000,
        maxReconnectAttempts: 10,
        bufferSize: 10000,
        ...config?.websocket
      },
      blockchain: {
        enabled: true,
        chains: {
          ethereum: { rpcUrls: ['https://mainnet.infura.io/v3/YOUR_KEY'], subscriptions: ['newHeads', 'logs'] },
          bsc: { rpcUrls: ['https://bsc-dataseed.binance.org'], subscriptions: ['newHeads', 'logs'] },
          solana: { rpcUrls: ['https://api.mainnet-beta.solana.com'], subscriptions: ['slot', 'logs'] },
          polygon: { rpcUrls: ['https://polygon-rpc.com'], subscriptions: ['newHeads', 'logs'] }
        },
        maxConnectionsPerChain: 5,
        blockReorgTolerance: 12,
        ...config?.blockchain
      },
      socialMedia: {
        enabled: true,
        twitter: { rateLimit: 300 },
        reddit: { rateLimit: 60 },
        telegram: { rateLimit: 30 },
        discord: { rateLimit: 1000 },
        ...config?.socialMedia
      },
      news: {
        enabled: true,
        newsApi: { rateLimit: 1000 },
        cryptoNewsFeeds: [
          'https://cointelegraph.com/rss',
          'https://coindesk.com/arc/outboundfeeds/rss/',
          'https://cryptonews.com/news/rss.xml'
        ],
        pollingInterval: 60000,
        ...config?.news
      },
      defi: {
        enabled: true,
        theGraph: { endpoints: ['https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'], rateLimit: 1000 },
        defiLlama: { rateLimit: 1000 },
        protocolApis: {
          compound: { endpoint: 'https://api.compound.finance/api/v2', rateLimit: 1000 },
          aave: { endpoint: 'https://aave-api-v2.aave.com', rateLimit: 1000 },
          curve: { endpoint: 'https://api.curve.fi/api', rateLimit: 1000 }
        },
        ...config?.defi
      },
      monitoring: {
        enabled: true,
        metricsInterval: 10000,
        alertThresholds: {
          connectionFailureRate: 0.05,
          dataLatencyMs: 5000,
          errorRate: 0.01
        },
        ...config?.monitoring
      },
      dataQuality: {
        enabled: true,
        schemaValidation: true,
        freshnessThreshold: 300,
        accuracyThreshold: 0.95,
        ...config?.dataQuality
      }
    };

    // Initialize core components
    this.websocketManager = new WebSocketConnectionManager(this.config.websocket as WebSocketConfig);
    this.blockchainManager = new BlockchainNodeManager(this.config.blockchain as BlockchainConfig);
    this.socialMediaService = new SocialMediaIntegrationService(this.config.socialMedia as SocialMediaConfig);
    this.newsService = new NewsIntegrationService(this.config.news as NewsConfig);
    this.defiService = new DeFiProtocolIntegrationService(this.config.defi as DeFiConfig);
    this.dataPipeline = new ExternalDataPipeline();
    this.healthMonitor = new ConnectionHealthMonitor(this.config.monitoring as MonitoringConfig);
    this.dataValidator = new DataQualityValidator(this.config.dataQuality as ValidationConfig);

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Set up event handlers
    this.setupEventHandlers();
  }

  static getInstance(config?: Partial<ExternalDataConfig>): ExternalDataIntegrationService {
    if (!ExternalDataIntegrationService.instance) {
      ExternalDataIntegrationService.instance = new ExternalDataIntegrationService(config);
    }
    return ExternalDataIntegrationService.instance;
  }

  private initializeMetrics(): ExternalDataMetrics {
    return {
      websocket: {
        activeConnections: 0,
        totalConnections: 0,
        messagesReceived: 0,
        messagesBuffered: 0,
        averageLatency: 0,
        errorRate: 0,
        reconnectionCount: 0
      },
      blockchain: {
        activeNodes: 0,
        blocksProcessed: 0,
        transactionsProcessed: 0,
        reorganizations: 0,
        averageBlockTime: 0,
        rpcResponseTime: 0
      },
      socialMedia: {
        postsProcessed: 0,
        apiCallsMade: 0,
        rateLimitHits: 0,
        sentimentScores: 0,
        averageProcessingTime: 0
      },
      news: {
        articlesProcessed: 0,
        feedsMonitored: 0,
        breakingNewsDetected: 0,
        averageFetchTime: 0,
        cacheHitRate: 0
      },
      defi: {
        protocolsMonitored: 0,
        metricsCollected: 0,
        apiCallsMade: 0,
        dataValidationErrors: 0,
        cacheHitRate: 0
      },
      overall: {
        totalDataPoints: 0,
        pipelineThroughput: 0,
        errorRate: 0,
        averageLatency: 0,
        uptime: 1
      }
    };
  }

  private setupEventHandlers(): void {
    // WebSocket events
    this.websocketManager.on('connected', (data: any) => this.handleWebSocketConnected(data));
    this.websocketManager.on('disconnected', (data: any) => this.handleWebSocketDisconnected(data));
    this.websocketManager.on('message', (data: any) => this.handleWebSocketMessage(data));
    this.websocketManager.on('error', (data: any) => this.handleConnectionError('websocket', data));

    // Blockchain events
    this.blockchainManager.on('block', (data: any) => this.handleBlockchainBlock(data));
    this.blockchainManager.on('transaction', (data: any) => this.handleBlockchainTransaction(data));
    this.blockchainManager.on('reorg', (data: any) => this.handleBlockchainReorg(data));
    this.blockchainManager.on('error', (data: any) => this.handleConnectionError('blockchain', data));

    // Social media events
    this.socialMediaService.on('post', (data: any) => this.handleSocialPost(data));
    this.socialMediaService.on('sentiment', (data: any) => this.handleSentimentData(data));
    this.socialMediaService.on('error', (data: any) => this.handleConnectionError('social', data));

    // News events
    this.newsService.on('article', (data: any) => this.handleNewsArticle(data));
    this.newsService.on('breaking', (data: any) => this.handleBreakingNews(data));
    this.newsService.on('error', (data: any) => this.handleConnectionError('news', data));

    // DeFi events
    this.defiService.on('metric', (data: any) => this.handleDeFiMetric(data));
    this.defiService.on('validation_error', (data: any) => this.handleDataQualityIssue(data));
    this.defiService.on('error', (data: any) => this.handleConnectionError('defi', data));

    // Health monitoring events
    this.healthMonitor.on('alert', (data: any) => this.handleHealthAlert(data));
  }

  /**
   * Initialize all external data connectors
   */
  async initialize(): Promise<{ success: true } | { success: false; error: string }> {
    if (this.isRunning) {
      const error = 'External Data Integration Service is already running';
      this.logger.error('❌ Initialization failed', { error });
      return { success: false, error };
    }

    this.logger.info('🚀 Initializing ELITE External Data Integration Service...');

    try {
      // Initialize all connectors with individual error handling
      const initPromises: Promise<any>[] = [];

      if (this.config.websocket.enabled) {
        initPromises.push(
          this.errorHandler.handleAsyncError(
            this.websocketManager.initialize(),
            'WebSocket manager initialization',
            'websocket'
          )
        );
      }

      if (this.config.blockchain.enabled) {
        initPromises.push(
          this.errorHandler.handleAsyncError(
            this.blockchainManager.initialize(),
            'Blockchain manager initialization',
            'blockchain'
          )
        );
      }

      if (this.config.socialMedia.enabled) {
        initPromises.push(
          this.errorHandler.handleAsyncError(
            this.socialMediaService.initialize(),
            'Social media service initialization',
            'social'
          )
        );
      }

      if (this.config.news.enabled) {
        initPromises.push(
          this.errorHandler.handleAsyncError(
            this.newsService.initialize(),
            'News service initialization',
            'news'
          )
        );
      }

      if (this.config.defi.enabled) {
        initPromises.push(
          this.errorHandler.handleAsyncError(
            this.defiService.initialize(),
            'DeFi service initialization',
            'defi'
          )
        );
      }

      // Initialize core components
      initPromises.push(
        this.errorHandler.handleAsyncError(
          this.dataPipeline.initialize(),
          'Data pipeline initialization',
          'pipeline'
        )
      );

      initPromises.push(
        this.errorHandler.handleAsyncError(
          this.healthMonitor.initialize(),
          'Health monitor initialization',
          'monitoring'
        )
      );

      // Wait for all initializations to complete
      const results = await Promise.allSettled(initPromises);

      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        const errorMessages = failures.map(failure =>
          failure.status === 'rejected' ? String(failure.reason) : 'Unknown error'
        );
        const combinedError = `Multiple initialization failures: ${errorMessages.join(', ')}`;
        this.logger.error('❌ Partial initialization failure', { errors: errorMessages });
        return { success: false, error: combinedError };
      }

      this.isRunning = true;
      this.logger.info('✅ External Data Integration Service initialized successfully');

      // Start monitoring
      this.startMonitoring();

      return { success: true };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('❌ Failed to initialize External Data Integration Service', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Stop all external data connectors
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('🛑 Stopping External Data Integration Service...');

    try {
      const promises = [];

      if (this.config.websocket.enabled) {
        promises.push(this.websocketManager.stop());
      }

      if (this.config.blockchain.enabled) {
        promises.push(this.blockchainManager.stop());
      }

      if (this.config.socialMedia.enabled) {
        promises.push(this.socialMediaService.stop());
      }

      if (this.config.news.enabled) {
        promises.push(this.newsService.stop());
      }

      if (this.config.defi.enabled) {
        promises.push(this.defiService.stop());
      }

      promises.push(this.dataPipeline.stop());
      promises.push(this.healthMonitor.stop());

      await Promise.all(promises);

      this.isRunning = false;
      this.logger.info('✅ External Data Integration Service stopped');

    } catch (error) {
      this.logger.error('❌ Error stopping External Data Integration Service', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ExternalDataMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection status for all sources
   */
  getConnectionStatus(): Record<string, boolean> {
    return Object.fromEntries(this.connectionStatus) as Record<string, boolean>;
  }

  /**
   * Force refresh data from a specific source
   */
  async refreshDataSource(source: string): Promise<void> {
    this.logger.info(`🔄 Force refreshing data source: ${source}`);

    switch (source) {
      case 'websocket':
        await this.websocketManager.refreshConnections();
        break;
      case 'blockchain':
        await this.blockchainManager.refreshNodes();
        break;
      case 'social':
        await this.socialMediaService.refreshFeeds();
        break;
      case 'news':
        await this.newsService.refreshFeeds();
        break;
      case 'defi':
        await this.defiService.refreshProtocols();
        break;
      default:
        throw new Error(`Unknown data source: ${source}`);
    }
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.updateMetrics();
      this.checkHealth();
    }, this.config.monitoring.metricsInterval);
  }

  private updateMetrics(): void {
    // Update WebSocket metrics
    const wsMetrics = this.websocketManager.getMetrics();
    this.metrics.websocket = { ...wsMetrics };

    // Update blockchain metrics
    const bcMetrics = this.blockchainManager.getMetrics();
    this.metrics.blockchain = { ...bcMetrics };

    // Update social media metrics
    const smMetrics = this.socialMediaService.getMetrics();
    this.metrics.socialMedia = { ...smMetrics };

    // Update news metrics
    const newsMetrics = this.newsService.getMetrics();
    this.metrics.news = { ...newsMetrics };

    // Update DeFi metrics
    const defiMetrics = this.defiService.getMetrics();
    this.metrics.defi = { ...defiMetrics };

    // Calculate overall metrics
    this.metrics.overall.totalDataPoints =
      this.metrics.websocket.messagesReceived +
      this.metrics.blockchain.blocksProcessed +
      this.metrics.socialMedia.postsProcessed +
      this.metrics.news.articlesProcessed +
      this.metrics.defi.metricsCollected;

    this.metrics.overall.pipelineThroughput =
      this.metrics.overall.totalDataPoints / (this.config.monitoring.metricsInterval / 1000);
  }

  private checkHealth(): void {
    const alerts = this.healthMonitor.checkHealth(this.metrics, Object.fromEntries(this.connectionStatus));

    for (const alert of alerts) {
      this.logger.warn(`🚨 Health Alert: ${alert.message}`, alert.data);
      this.emit('health_alert', alert);
    }
  }

  // Event handlers
  private handleWebSocketConnected(data: any): void {
    this.connectionStatus.set('websocket', true);
    this.metrics.websocket.activeConnections++;
    this.emit('data_event', {
      type: 'websocket_connected',
      source: 'websocket',
      timestamp: new Date(),
      data
    });
  }

  private handleWebSocketDisconnected(data: any): void {
    this.connectionStatus.set('websocket', false);
    this.metrics.websocket.activeConnections--;
    this.emit('data_event', {
      type: 'websocket_disconnected',
      source: 'websocket',
      timestamp: new Date(),
      data
    });
  }

  private handleWebSocketMessage(data: any): void {
    this.metrics.websocket.messagesReceived++;
    this.dataPipeline.processWebSocketData(data);
  }

  private handleBlockchainBlock(data: any): void {
    this.metrics.blockchain.blocksProcessed++;
    this.dataPipeline.processBlockchainData(data);
    this.emit('data_event', {
      type: 'blockchain_block',
      source: 'blockchain',
      timestamp: new Date(),
      data
    });
  }

  private handleBlockchainTransaction(data: any): void {
    this.metrics.blockchain.transactionsProcessed++;
    this.dataPipeline.processBlockchainData(data);
  }

  private handleBlockchainReorg(data: any): void {
    this.metrics.blockchain.reorganizations++;
    this.emit('data_event', {
      type: 'blockchain_reorg',
      source: 'blockchain',
      timestamp: new Date(),
      data
    });
  }

  private handleSocialPost(data: any): void {
    this.metrics.socialMedia.postsProcessed++;
    this.dataPipeline.processSocialData(data);
    this.emit('data_event', {
      type: 'social_post',
      source: 'social',
      timestamp: new Date(),
      data
    });
  }

  private handleSentimentData(data: any): void {
    this.metrics.socialMedia.sentimentScores++;
    this.dataPipeline.processSocialData(data);
  }

  private handleNewsArticle(data: any): void {
    this.metrics.news.articlesProcessed++;
    this.dataPipeline.processNewsData(data);
    this.emit('data_event', {
      type: 'news_article',
      source: 'news',
      timestamp: new Date(),
      data
    });
  }

  private handleBreakingNews(data: any): void {
    this.metrics.news.breakingNewsDetected++;
    this.emit('data_event', {
      type: 'breaking_news',
      source: 'news',
      timestamp: new Date(),
      data
    });
  }

  private handleDeFiMetric(data: any): void {
    this.metrics.defi.metricsCollected++;
    this.dataPipeline.processDeFiData(data);
    this.emit('data_event', {
      type: 'defi_metric',
      source: 'defi',
      timestamp: new Date(),
      data
    });
  }

  private handleDataQualityIssue(data: any): void {
    this.metrics.defi.dataValidationErrors++;
    this.emit('data_event', {
      type: 'data_quality_issue',
      source: 'validation',
      timestamp: new Date(),
      data
    });
  }

  private handleConnectionError(source: string, data: any): void {
    this.connectionStatus.set(source, false);
    this.logger.error(`Connection error in ${source}`, data);
    this.emit('data_event', {
      type: 'connection_error',
      source,
      timestamp: new Date(),
      data
    });
  }

  private handleHealthAlert(data: any): void {
    this.emit('health_alert', data);
  }
} 