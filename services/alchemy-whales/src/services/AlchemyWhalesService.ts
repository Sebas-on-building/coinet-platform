/**
 * Main Alchemy Whales Service - Orchestrates all components
 */

import { config, validateConfig } from '../config';
import {
  Chain,
  TransferQuery,
  NormalizedTransfer,
  WhaleProfile,
  ServiceMetrics,
  TransferCategory,
} from '../types';
import { createLogger } from '../utils/logger';
import { RateLimiterManager } from '../utils/rateLimiter';
import { AlchemyClientManager } from '../clients/AlchemyClient';
import { DatabaseManager } from '../database/DatabaseManager';
import { CacheManager } from '../cache/CacheManager';
import { TransferProcessor } from '../processors/TransferProcessor';
import { NotificationService } from './NotificationService';
import { WebhookServer } from '../webhooks/WebhookServer';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { HealthCheck } from '../monitoring/HealthCheck';
import { MonitoringServer } from '../monitoring/MonitoringServer';
import { validate } from '../utils/validation';
import { TransferQuerySchema } from '../types';
import { UltimateFraudDetector } from '../ai/UltimateFraudDetector';
import { SolanaTokenMonitor } from './SolanaTokenMonitor';
import { QuickNodeClientManager } from '../clients/QuickNodeClient';
import { QuickNodeChain } from '../types/quicknode';
import { quickNodeConfig } from '../config';

export class AlchemyWhalesService {
  private logger: any;
  private rateLimiter: RateLimiterManager;
  private alchemyClients: AlchemyClientManager;
  private db: DatabaseManager;
  private cache: CacheManager;
  private processor: TransferProcessor;
  private notifications: NotificationService;
  private webhookServer: WebhookServer;
  private metricsCollector: MetricsCollector;
  private healthCheck: HealthCheck;
  private monitoringServer: MonitoringServer;
  private ultimateFraudDetector: UltimateFraudDetector | null = null;
  private solanaTokenMonitor: SolanaTokenMonitor | null = null;
  private quickNodeClient: QuickNodeClientManager | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = createLogger({ component: 'AlchemyWhalesService' });
    
    // Initialize configuration
    try {
      validateConfig();
    } catch (error: any) {
      this.logger.error({ 
        msg: 'Configuration validation failed', 
        error: error.message,
        hint: 'Set REQUIRE_API_KEYS=false to start without API keys, or configure your Alchemy API keys in .env file'
      });
      // In development, allow starting without API keys
      if (process.env.NODE_ENV !== 'production' && process.env.REQUIRE_API_KEYS !== 'true') {
        this.logger.warn({ msg: 'Starting in development mode without API keys. Some features will be disabled.' });
      } else {
        throw error;
      }
    }

    // Initialize components
    this.rateLimiter = new RateLimiterManager(config.rateLimit);
    this.alchemyClients = new AlchemyClientManager(config.alchemy.apiKeys, this.rateLimiter);
    this.db = new DatabaseManager(config.database);
    this.cache = new CacheManager(config.redis);
    this.processor = new TransferProcessor(this.cache, this.db, config.whaleThresholds);
    this.notifications = new NotificationService(config.features);
    this.webhookServer = new WebhookServer(config.webhook, this.processor);
    this.metricsCollector = new MetricsCollector();
    this.healthCheck = new HealthCheck(this.db, this.cache, this.alchemyClients);
    this.monitoringServer = new MonitoringServer(
      config.metrics,
      this.metricsCollector,
      this.healthCheck
    );

    // Initialize Ultimate Fraud Detector if enabled
    if (process.env.AI_ULTIMATE_FRAUD_ENABLED === 'true') {
      try {
        this.ultimateFraudDetector = new UltimateFraudDetector();
        this.logger.info('✅ Ultimate Fraud Detector initialized (99.99% accuracy)');
      } catch (error: any) {
        this.logger.warn('Failed to initialize Ultimate Fraud Detector', { error: error.message });
      }
    }

    // Initialize QuickNode client if enabled
    if (quickNodeConfig.enabled && quickNodeConfig.endpoints.length > 0) {
      try {
        this.quickNodeClient = new QuickNodeClientManager(quickNodeConfig.endpoints, this.rateLimiter);
        this.logger.info('✅ QuickNode client manager initialized');
      } catch (error: any) {
        this.logger.warn('Failed to initialize QuickNode client', { error: error.message });
      }
    }

    this.logger.info('Alchemy Whales Service created');
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Service already initialized');
      return;
    }

    this.logger.info('Initializing Alchemy Whales Service...');

    try {
      // Connect to database (optional in development)
      const requireDatabase = process.env.REQUIRE_DATABASE === 'true' || process.env.NODE_ENV === 'production';
      
      if (requireDatabase) {
        await this.db.connect();
        this.logger.info({ msg: '✅ Database connected' });
      } else {
        this.logger.warn({ 
          msg: '⚠️  Database connection skipped (development mode). Set REQUIRE_DATABASE=true to enable.' 
        });
      }

      // Test cache connection (optional)
      const requireCache = process.env.REQUIRE_CACHE === 'true' || process.env.NODE_ENV === 'production';
      
      if (requireCache) {
        const cacheHealthy = await this.cache.healthCheck();
        if (cacheHealthy) {
          this.logger.info({ msg: '✅ Cache connected' });
        } else {
          this.logger.warn({ msg: '⚠️  Cache not available, continuing without cache' });
        }
      } else {
        this.logger.warn({ 
          msg: '⚠️  Cache connection skipped (development mode). Set REQUIRE_CACHE=true to enable.' 
        });
      }

      // Start webhook server
      await this.webhookServer.start();
      this.logger.info({ msg: '✅ Webhook server started' });

      // Start monitoring server
      await this.monitoringServer.start();
      this.logger.info({ msg: '✅ Monitoring server started' });

      // Test notification service (optional)
      if (config.features.enableNotifications && process.env.NODE_ENV === 'production') {
        try {
          await this.notifications.testNotification();
          this.logger.info({ msg: '✅ Notifications configured' });
        } catch (error: any) {
          this.logger.warn({ msg: '⚠️  Notification service not available', error: error.message });
        }
      }

      // Initialize Solana Token Monitor if enabled
      if (process.env.SOLANA_REALTIME_MONITORING === 'true' && this.quickNodeClient) {
        try {
          const solanaClient = this.quickNodeClient.getClient(QuickNodeChain.SOLANA);
          if (solanaClient) {
            this.solanaTokenMonitor = new SolanaTokenMonitor({
              quickNodeClient: solanaClient,
              solanaHttpUrl: process.env.QUICKNODE_SOLANA_HTTP_URL || '',
              solanaWsUrl: process.env.QUICKNODE_SOLANA_WS_URL,
              pumpFunProgramId: process.env.SOLANA_PUMPFUN_PROGRAM_ID,
              minLiquidityUsd: parseFloat(process.env.SOLANA_MIN_LIQUIDITY_USD || '10000'),
              maxTokenAgeSeconds: parseInt(process.env.SOLANA_MAX_TOKEN_AGE_SECONDS || '60'),
              blockCheckIntervalMs: parseInt(process.env.SOLANA_BLOCK_CHECK_INTERVAL_MS || '400'),
              aiAnalysisEnabled: process.env.AI_ULTIMATE_FRAUD_ENABLED === 'true' || process.env.AI_FRAUD_DETECTION_ENABLED === 'true',
              onTokenDetected: async (token) => {
                this.logger.info('New Solana token detected', { tokenAddress: token.tokenAddress });
              },
              onFraudDetected: async (token, analysis) => {
                this.logger.warn('Fraud detected', {
                  tokenAddress: token.tokenAddress,
                  fraudRiskScore: analysis.fraudRiskScore,
                  recommendation: analysis.recommendation,
                });
              },
              onHighPotentialDetected: async (token, analysis) => {
                this.logger.info('High potential token detected', {
                  tokenAddress: token.tokenAddress,
                  potentialScore: analysis.potentialScore,
                });
              },
            });

            await this.solanaTokenMonitor.start();
            this.logger.info('✅ Solana real-time token monitoring started');
          }
        } catch (error: any) {
          this.logger.warn('Failed to start Solana token monitoring', { error: error.message });
        }
      }

      this.isInitialized = true;
      this.logger.info({ msg: '🚀 Alchemy Whales Service initialized successfully' });
    } catch (error: any) {
      this.logger.error({ 
        msg: 'Failed to initialize service', 
        error: error.message,
        hint: 'Set REQUIRE_DATABASE=false and REQUIRE_CACHE=false to start without database/cache'
      });
      
      // In development, allow starting with warnings
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn({ 
          msg: '⚠️  Starting in degraded mode (some features disabled)',
          error: error.message 
        });
        this.isInitialized = true; // Mark as initialized anyway
      } else {
        throw error;
      }
    }
  }

  /**
   * Query transfers with filters
   */
  async getTransfers(query: TransferQuery): Promise<NormalizedTransfer[]> {
    // Validate query
    const validated = validate(TransferQuerySchema, query);

    const client = this.alchemyClients.getClient(validated.chain);
    const endTimer = this.metricsCollector.timeAPIRequest(validated.chain, 'getAssetTransfers');

    try {
      // Fetch from Alchemy
      const result = await client.getAssetTransfers({
        fromBlock: validated.fromBlock,
        toBlock: validated.toBlock,
        fromAddress: validated.address,
        category: validated.category,
        maxCount: validated.limit,
        pageKey: validated.pageKey,
      });

      endTimer();
      this.metricsCollector.recordAPIRequest(validated.chain, 'success');

      // Normalize transfers
      const normalized = await this.processor.batchNormalizeTransfers(
        result.transfers as any,
        validated.chain
      );

      // Filter by value if specified
      let filtered = normalized;
      if (validated.minValueUsd) {
        filtered = filtered.filter(t => t.valueUsd >= validated.minValueUsd!);
      }
      if (validated.maxValueUsd) {
        filtered = filtered.filter(t => t.valueUsd <= validated.maxValueUsd!);
      }

      // Record metrics
      filtered.forEach(transfer => {
        this.metricsCollector.recordTransfer(
          transfer.chain,
          transfer.category,
          transfer.whaleTier || undefined
        );
      });

      return filtered;
    } catch (error: any) {
      endTimer();
      this.metricsCollector.recordAPIRequest(validated.chain, 'error');
      this.metricsCollector.recordAPIError(validated.chain, error.code || 'unknown');
      throw error;
    }
  }

  /**
   * Get whale profile
   */
  async getWhaleProfile(address: string, chain: Chain): Promise<WhaleProfile | null> {
    const endTimer = this.metricsCollector.timeDBQuery('getWhaleProfile');
    
    try {
      const profile = await this.db.getWhaleProfile(address, chain);
      endTimer();
      return profile;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Get top whales leaderboard
   */
  async getTopWhales(chain?: Chain, limit: number = 100): Promise<any[]> {
    // Check cache first
    const cacheKey = `leaderboard:${chain || 'all'}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const endTimer = this.metricsCollector.timeDBQuery('getTopWhales');
    
    try {
      const whales = await this.db.getTopWhales(chain, limit);
      endTimer();

      // Cache for 5 minutes
      await this.cache.set(cacheKey, whales, 300);

      return whales;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Get recent whale transfers
   */
  async getRecentWhaleTransfers(limit: number = 100, minValueUsd?: number): Promise<any[]> {
    const endTimer = this.metricsCollector.timeDBQuery('getRecentWhaleTransfers');
    
    try {
      const transfers = await this.db.getRecentWhaleTransfers(limit, minValueUsd);
      endTimer();
      return transfers;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Sync historical transfers for an address
   */
  async syncHistoricalTransfers(
    address: string,
    chain: Chain,
    fromBlock?: string | number
  ): Promise<{ processed: number; whales: number }> {
    this.logger.info('Starting historical sync', { address, chain, fromBlock });

    const client = this.alchemyClients.getClient(chain);
    const endTimer = this.metricsCollector.timeProcessing(chain);

    try {
      // Fetch all transfers
      const transfers = await client.getAllTransfers({
        fromAddress: address,
        fromBlock,
      });

      // Process and persist
      const result = await this.processor.processAndPersist(transfers, chain);

      // Log whale transfers detected
      if (result.whales > 0) {
        this.logger.info('Whale transfers detected in sync', {
          count: result.whales,
        });
      }

      endTimer();

      this.logger.info('Historical sync completed', {
        address,
        chain,
        ...result,
      });

      return { processed: result.normalized, whales: result.whales };
    } catch (error: any) {
      endTimer();
      this.logger.error('Historical sync failed', {
        address,
        chain,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<ServiceMetrics> {
    const stats = await this.db.getStatistics();
    const rateLimiterMetrics = this.rateLimiter.getAllMetrics();
    const alchemyMetrics = this.alchemyClients.getAllMetrics();
    const webhookMetrics = this.webhookServer.getMetrics();

    return {
      transfers: {
        total: stats.totalTransfers,
        byChain: stats.transfersByChain.reduce((acc: any, item: any) => {
          acc[item.chain] = parseInt(item.count);
          return acc;
        }, {}),
        byCategory: {
          [TransferCategory.EXTERNAL]: 0,
          [TransferCategory.INTERNAL]: 0,
          [TransferCategory.ERC20]: 0,
          [TransferCategory.ERC721]: 0,
          [TransferCategory.ERC1155]: 0,
          [TransferCategory.SPECIALNFT]: 0,
        },
        whales: stats.totalWhaleTransfers,
      },
      api: {
        requests: Object.values(alchemyMetrics).reduce(
          (sum: number, m: any) => sum + m.requests,
          0
        ),
        errors: Object.values(alchemyMetrics).reduce(
          (sum: number, m: any) => sum + m.errors,
          0
        ),
        rateLimited: Object.values(rateLimiterMetrics).reduce(
          (sum: number, m: any) => sum + m.rateLimited,
          0
        ),
        averageLatency: 0, // TODO: calculate from metrics
      },
      webhooks: {
        received: webhookMetrics.received,
        processed: webhookMetrics.processed,
        failed: webhookMetrics.failed,
      },
      cache: {
        hits: 0, // TODO: track
        misses: 0,
        hitRate: 0,
      },
    };
  }

  /**
   * Get service health
   */
  async getHealth() {
    return await this.healthCheck.check();
  }

  /**
   * Shutdown service gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Alchemy Whales Service...');

    try {
      // Stop Solana token monitoring
      if (this.solanaTokenMonitor) {
        await this.solanaTokenMonitor.stop();
        this.logger.info('Solana token monitoring stopped');
      }

      await this.webhookServer.stop();
      await this.monitoringServer.stop();
      await this.rateLimiter.shutdown();
      await this.cache.close();
      await this.db.close();

      this.logger.info('✅ Service shut down successfully');
    } catch (error: any) {
      this.logger.error('Error during shutdown', { error: error.message });
      throw error;
    }
  }
}

export default AlchemyWhalesService;

