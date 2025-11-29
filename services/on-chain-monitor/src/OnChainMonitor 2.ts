/**
 * =========================================
 * ON-CHAIN MONITOR
 * =========================================
 * Main orchestration service for on-chain transaction monitoring
 * across multiple blockchain networks
 */

import { EventEmitter } from 'events';
import { ChainRegistry } from './chains/ChainRegistry';
import { TransactionProcessor } from './processors/TransactionProcessor';
import { HealthMonitor } from './monitoring/HealthMonitor';
import { MetricsCollector } from './monitoring/MetricsCollector';
import { CacheManager } from './caching/CacheManager';
import { Logger } from './utils/Logger';

export interface SubscriptionOptions {
  includeTransfers?: boolean;
  includeDexTrades?: boolean;
  includeContractCalls?: boolean;
  minValue?: number; // USD value threshold
  whaleOnly?: boolean;
  chains?: string[];
}

export interface TransactionEventData {
  transaction: any;
  whaleInfo?: any;
}

export interface WhaleDetectionEventData {
  transaction: any;
  result: any;
}

export class OnChainMonitor extends EventEmitter {
  private chainRegistry: ChainRegistry;
  private transactionProcessor: TransactionProcessor;
  private healthMonitor: HealthMonitor;
  private metricsCollector: MetricsCollector;
  private cacheManager: CacheManager;
  private logger: Logger;
  private isRunning: boolean = false;
  private subscriptions: Map<string, any> = new Map();

  constructor() {
    super();
    this.logger = new Logger('OnChainMonitor');

    // Initialize core components
    this.cacheManager = new CacheManager();
    this.chainRegistry = new ChainRegistry();
    this.transactionProcessor = new TransactionProcessor(this.cacheManager);
    this.healthMonitor = new HealthMonitor();
    this.metricsCollector = new MetricsCollector();
  }

  /**
   * Start the on-chain monitoring service
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting On-Chain Monitor...');

      // Initialize all components
      await this.chainRegistry.initialize();
      await this.transactionProcessor.initialize();
      await this.healthMonitor.initialize();
      await this.metricsCollector.initialize();
      await this.cacheManager.initialize();

      this.isRunning = true;
      this.logger.info('✅ On-Chain Monitor started successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to start On-Chain Monitor', error);
      throw error;
    }
  }

  /**
   * Stop the on-chain monitoring service
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping On-Chain Monitor...');

      // Unsubscribe from all active subscriptions
      for (const [id, subscription] of this.subscriptions) {
        try {
          await subscription.unsubscribe();
        } catch (error: any) {
          this.logger.error(`Failed to unsubscribe ${id}`, error);
        }
      }
      this.subscriptions.clear();

      // Stop all components
      await this.chainRegistry.stop();
      await this.transactionProcessor.stop();
      await this.healthMonitor.stop();
      await this.metricsCollector.stop();
      await this.cacheManager.stop();

      this.isRunning = false;
      this.logger.info('✅ On-Chain Monitor stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop On-Chain Monitor', error);
      throw error;
    }
  }

  /**
   * Subscribe to transactions across multiple chains
   */
  async subscribeToTransactions(chains: string[], options: SubscriptionOptions): Promise<string> {
    if (!this.isRunning) {
      throw new Error('On-Chain Monitor is not running');
    }

    const subscriptionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info(`Subscribing to transactions for chains: ${chains.join(', ')}`);

      // Create subscriptions for each chain
      const chainSubscriptions = await this.chainRegistry.subscribeToTransactions(chains, options);

      // Store the subscription
      this.subscriptions.set(subscriptionId, {
        chains: chains,
        options: options,
        chainSubscriptions: chainSubscriptions,
        unsubscribe: async () => {
          await this.chainRegistry.unsubscribeFromTransactions(chainSubscriptions);
        }
      });

      this.logger.info(`✅ Transaction subscription created: ${subscriptionId}`);
      return subscriptionId;

    } catch (error: any) {
      this.logger.error('❌ Failed to subscribe to transactions', error);
      throw error;
    }
  }

  /**
   * Get current service status
   */
  getStatus(): string {
    const components = [
      `Registry: ${this.chainRegistry.getStatus()}`,
      `Processor: ${this.transactionProcessor.getStatus()}`,
      `Health: ${this.healthMonitor.getStatus()}`,
      `Metrics: ${this.metricsCollector.getStatus()}`,
      `Cache: ${this.cacheManager.getStatus()}`
    ];

    return this.isRunning ? `Running (${components.join(', ')})` : 'Stopped';
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<any> {
    return {
      isRunning: this.isRunning,
      activeSubscriptions: this.subscriptions.size,
      components: {
        chainRegistry: await this.chainRegistry.getHealth(),
        transactionProcessor: await this.transactionProcessor.getHealth(),
        healthMonitor: await this.healthMonitor.getHealth(),
        metricsCollector: await this.metricsCollector.getHealth(),
        cacheManager: await this.cacheManager.getHealth()
      },
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  /**
   * Force health check
   */
  async checkHealth(): Promise<void> {
    await this.healthMonitor.getHealth();
  }
}
