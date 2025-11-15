/**
 * AI Data Feeder Service - Main Entry Point
 * 24/7 service that continuously feeds Coinet AI with market data
 */

import dotenv from 'dotenv';
import { AIDataFeeder } from './data-feeder';
import { getConfig } from './config';
import { logger } from './logger';

// Load environment variables
dotenv.config();

async function main() {
  logger.info('🚀 Starting AI Data Feeder Service...');
  
  try {
    // Get configuration
    const config = getConfig();
    
    // Create and start the feeder
    const feeder = new AIDataFeeder(config);
    
    // Listen for data updates
    feeder.on('data_update', (event) => {
      logger.debug('Data update received', {
        type: event.type,
        coinId: (event.data as any).coinId,
        timestamp: new Date().toISOString(),
      });
    });
    
    // Start the feeder
    await feeder.start();
    
    logger.info('✅ AI Data Feeder started successfully');
    logger.info(`📊 Tracking ${config.coins.length} coins`);
    logger.info(`⏱️  Price updates: every ${config.priceUpdateInterval / 1000}s`);
    logger.info(`📰 News updates: every ${config.newsUpdateInterval / 1000}s`);
    logger.info(`🤖 AI analysis: every ${config.aiAnalysisInterval / 1000}s`);
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await feeder.stop();
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    logger.error('❌ Failed to start AI Data Feeder', { error });
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error', { error });
    process.exit(1);
  });
}

export { AIDataFeeder } from './data-feeder';
export * from './types';
export { getConfig } from './config';

