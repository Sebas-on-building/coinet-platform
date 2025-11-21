/**
 * 🚀 COINET AI SERVICE ENTRY POINT
 * 
 * Main entry point for the Coinet AI API service.
 * Starts the divine API server and handles graceful shutdown.
 */

import { config } from 'dotenv';
import { CoinetApiService } from './api/main-api';
import { logger } from './utils/logger';

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = ['NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.warn(`⚠️ Missing optional environment variables: ${missingEnvVars.join(', ')}`);
}

// Server configuration
const serverConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  enableCors: process.env.ENABLE_CORS !== 'false',
  rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10),
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10)
};

async function startServer() {
  try {
    logger.info('🌟 Starting Coinet AI Service...');
    logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📊 Configuration:`, {
      port: serverConfig.port,
      host: serverConfig.host,
      cors: serverConfig.enableCors,
      rateLimit: `${serverConfig.rateLimitRequests} requests per ${serverConfig.rateLimitWindow} minutes`
    });

    // Create and start the API service
    const apiService = new CoinetApiService(serverConfig);
    await apiService.start();

    logger.info('✅ Coinet AI Service started successfully!');
    logger.info('🎯 Ready to provide divine crypto analysis!');

    // Log service capabilities
    logger.info('🧠 Available AI Engines:');
    logger.info('   • CryptoPsychologyEngine - Psychological analysis & manipulation detection');
    logger.info('   • Market Oracle System - Predictive insights & whale tracking');
    logger.info('   • Multi-source data integration - Market, social, news, on-chain');
    logger.info('   • Professional brief generation - Thesis, risks, catalysts, sentiment');

  } catch (error) {
    logger.error('❌ Failed to start Coinet AI Service:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  logger.error('🚨 Failed to start server:', error);
  process.exit(1);
});
