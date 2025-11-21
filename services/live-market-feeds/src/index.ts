#!/usr/bin/env node

/**
 * =========================================
 * LIVE MARKET DATA FEEDS SERVICE
 * =========================================
 * Revolutionary WebSocket connections to major exchanges
 * with sub-second latency for Coinet alerts system
 *
 * Features:
 * - Resilient WebSocket connections with exponential backoff
 * - Heartbeat monitoring and sequence validation
 * - Data normalization across exchanges
 * - Timestamp synchronization
 * - Horizontal scaling and failover
 * - <100ms ingestion latency
 * =========================================
 */

import { MarketDataFeedService } from './services/MarketDataFeedService';
import { ExchangeRegistry } from './exchanges/ExchangeRegistry';
import { DataNormalizer } from './normalizers/DataNormalizer';
import { TimestampSynchronizer } from './synchronization/TimestampSynchronizer';
import { BufferManager } from './buffering/BufferManager';
import { MetricsCollector } from './monitoring/MetricsCollector';
import { HealthMonitor } from './monitoring/HealthMonitor';
import { CircuitBreaker } from './resilience/CircuitBreaker';
import { Logger } from './utils/Logger';

class LiveMarketDataService {
  private feedService: MarketDataFeedService;
  private logger: Logger;
  private metrics: MetricsCollector;
  private healthMonitor: HealthMonitor;

  constructor() {
    this.logger = new Logger('LiveMarketDataService');
    this.metrics = new MetricsCollector();
    this.healthMonitor = new HealthMonitor();

    // Initialize core components
    const exchangeRegistry = new ExchangeRegistry();
    const dataNormalizer = new DataNormalizer();
    const timestampSynchronizer = new TimestampSynchronizer();
    const bufferManager = new BufferManager({
      maxBufferSize: 10000,
      maxBufferAge: 300000,
      replayBatchSize: 100,
      replayDelay: 100,
      enablePersistence: true
    });
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 30000
    });

    this.feedService = new MarketDataFeedService({
      exchangeRegistry,
      dataNormalizer,
      timestampSynchronizer,
      bufferManager,
      circuitBreaker,
      metrics: this.metrics,
      healthMonitor: this.healthMonitor
    });
  }

  async start(): Promise<void> {
    try {
      this.logger.info('🚀 Starting Live Market Data Feeds Service...');

      // Initialize health monitoring
      await this.healthMonitor.start();

      // Start the feed service
      await this.feedService.start();

      this.logger.info('✅ Live Market Data Feeds Service started successfully');
      this.logger.info('📊 Monitoring active exchanges and data streams');
      this.logger.info('🔄 Automatic failover and scaling enabled');

    } catch (error) {
      this.logger.error('❌ Failed to start Live Market Data Feeds Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('🛑 Stopping Live Market Data Feeds Service...');

      await this.feedService.stop();
      await this.healthMonitor.stop();
      await this.metrics.shutdown();

      this.logger.info('✅ Live Market Data Feeds Service stopped gracefully');
    } catch (error) {
      this.logger.error('❌ Error during service shutdown', error);
      throw error;
    }
  }

  // Graceful shutdown handling
  setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
  }
}

// =========================================
// MAIN ENTRY POINT
// =========================================

async function main() {
  const service = new LiveMarketDataService();
  service.setupGracefulShutdown();

  try {
    await service.start();
    console.log('\n🎉 LIVE MARKET DATA FEEDS SERVICE IS RUNNING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 WebSocket connections active to major exchanges');
    console.log('⚡ Sub-second latency data streaming');
    console.log('🔄 Automatic failover and reconnection');
    console.log('📊 Real-time metrics and health monitoring');
    console.log('🚀 Ready for Coinet alerts integration\n');

  } catch (error) {
    console.error('💥 Failed to start service:', error);
    process.exit(1);
  }
}

// Start the service
if (require.main === module) {
  main().catch(console.error);
}

export { LiveMarketDataService };
