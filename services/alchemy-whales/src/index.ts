/**
 * Alchemy Whales Service Entry Point
 */

import { AlchemyWhalesService } from './services/AlchemyWhalesService';
import { logger } from './utils/logger';
import { config } from './config';

// Export main service
export { AlchemyWhalesService };

// Export types
export * from './types';

// Export clients and utilities
export { AlchemyClientManager } from './clients/AlchemyClient';
export { DatabaseManager } from './database/DatabaseManager';
export { CacheManager } from './cache/CacheManager';
export { TransferProcessor } from './processors/TransferProcessor';
export { NotificationService } from './services/NotificationService';
export { WebhookServer } from './webhooks/WebhookServer';
export { MetricsCollector } from './monitoring/MetricsCollector';
export { HealthCheck } from './monitoring/HealthCheck';

/**
 * Main entry point when running as standalone service
 */
async function main() {
  logger.info('🐋 Starting Alchemy Whales Service...');

  const service = new AlchemyWhalesService();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ msg: `Received ${signal}, shutting down gracefully...` });
    try {
      await service.shutdown();
      process.exit(0);
    } catch (error) {
      logger.error({ msg: 'Error during shutdown', error });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error({ 
      msg: 'Uncaught exception', 
      error: error.message, 
      stack: error.stack 
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ msg: 'Unhandled rejection', reason, promise });
    process.exit(1);
  });

  try {
    // Initialize service
    await service.initialize();

    const metricsPort = config.metrics.port;
    const webhookPort = config.webhook.port;
    logger.info({ msg: '🚀 Alchemy Whales Service is running!' });
    logger.info({ msg: '📊 Metrics available', url: `http://0.0.0.0:${metricsPort}/metrics` });
    logger.info({ msg: '🏥 Health check', url: `http://0.0.0.0:${metricsPort}/health` });
    logger.info({ msg: '🏥 API Health check', url: `http://0.0.0.0:${metricsPort}/api/health` });
    logger.info({ msg: '🔔 Webhooks listening', url: `http://0.0.0.0:${webhookPort}${config.webhook.path}` });
  } catch (error: any) {
    logger.error({ msg: 'Failed to start service', error: error.message });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error: Error) => {
    logger.error({ 
      msg: 'Fatal error',
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  });
}

