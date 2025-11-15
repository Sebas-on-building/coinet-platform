/**
 * AI Data Feeder Service
 * Main entry point for 24/7 AI data feeding
 */

import dotenv from 'dotenv';
import { AIDataFeeder } from './data-feeder';
import { getConfig } from './config';
import { logger } from './logger';

// Load environment variables
dotenv.config();

// Export main classes
export { AIDataFeeder } from './data-feeder';
export * from './types';
export { getConfig } from './config';

/**
 * Main function - runs the data feeder
 */
async function main() {
  logger.info('Starting AI Data Feeder Service...');

  // Get configuration
  const config = getConfig();

  // Create data feeder
  const feeder = new AIDataFeeder(config);

  // Listen for data updates
  feeder.on('data_update', (event) => {
    logger.debug('Data update', {
      type: event.type,
      coin: event.coin,
      timestamp: event.timestamp,
    });
  });

  // Listen for errors
  feeder.on('error', (event) => {
    logger.error('Data feeder error', {
      coin: event.coin,
      error: event.data,
    });
  });

  // Start the feeder
  await feeder.start();

  // Log status every minute
  setInterval(() => {
    const status = feeder.getStatus();
    logger.info('Status', status);
  }, 60000);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await feeder.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('AI Data Feeder Service started successfully ✅');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error', { error });
    process.exit(1);
  });
}

