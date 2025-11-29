/**
 * =========================================
 * MARKET SIGNAL PROCESSOR ENTRY POINT
 * =========================================
 * Divine world-class entry point for the market signal processing service
 * Serverless-ready with comprehensive configuration and error handling
 */

import { MarketSignalProcessor, MarketSignalProcessorApp } from './services/MarketSignalProcessor';
import { MarketSignalProcessorConfig } from '@/types';
import { Logger } from '@/utils/Logger';
import { ProcessingResult, BatchProcessingResult, NormalizedMarketSignal } from '@/types';

/**
 * Load configuration from environment variables with defaults
 */
function loadConfig(): MarketSignalProcessorConfig {
  const config: MarketSignalProcessorConfig = {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',

    processing: {
      rateLimiting: {
        enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
        defaultLimit: parseInt(process.env.RATE_LIMIT_DEFAULT_LIMIT || '1000'),
        defaultWindowMs: parseInt(process.env.RATE_LIMIT_DEFAULT_WINDOW || '60000'), // 1 minute
        burstLimit: parseInt(process.env.RATE_LIMIT_BURST_LIMIT || '100'),
      },

      enrichment: {
        enabled: process.env.ENRICHMENT_ENABLED !== 'false',
        lookbackPeriods: (process.env.ENRICHMENT_LOOKBACK_PERIODS || '60,300,900')
          .split(',').map(s => parseInt(s.trim())),
        momentumCalculation: {
          enabled: process.env.MOMENTUM_CALCULATION_ENABLED !== 'false',
          priceWindow: parseInt(process.env.MOMENTUM_PRICE_WINDOW || '300'), // 5 minutes
          volumeWindow: parseInt(process.env.MOMENTUM_VOLUME_WINDOW || '300'),
          smoothingAlpha: parseFloat(process.env.MOMENTUM_SMOOTHING_ALPHA || '0.1'),
        },
        orderBookAnalysis: {
          enabled: process.env.ORDER_BOOK_ANALYSIS_ENABLED !== 'false',
          depthLevels: parseInt(process.env.ORDER_BOOK_DEPTH_LEVELS || '10'),
          imbalanceThreshold: parseFloat(process.env.ORDER_BOOK_IMBALANCE_THRESHOLD || '0.1'),
        },
        liquidityAnalysis: {
          enabled: process.env.LIQUIDITY_ANALYSIS_ENABLED !== 'false',
          minDepthLevels: parseInt(process.env.LIQUIDITY_MIN_DEPTH_LEVELS || '5'),
        },
        volatilityCalculation: {
          enabled: process.env.VOLATILITY_CALCULATION_ENABLED !== 'false',
          windowSize: parseInt(process.env.VOLATILITY_WINDOW_SIZE || '300'),
          annualizationFactor: parseFloat(process.env.VOLATILITY_ANNUALIZATION_FACTOR || '252'),
        },
      },

      kafka: {
        enabled: process.env.KAFKA_ENABLED !== 'false',
        topic: process.env.KAFKA_TOPIC || 'market-signals',
        partitionKey: process.env.KAFKA_PARTITION_KEY || 'exchange',
        compression: (process.env.KAFKA_COMPRESSION as 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd') || 'snappy',
        batchSize: parseInt(process.env.KAFKA_BATCH_SIZE || '100'),
        lingerMs: parseInt(process.env.KAFKA_LINGER_MS || '1000'),
        requestTimeoutMs: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000'),
      },

      observability: {
        metrics: {
          enabled: process.env.METRICS_ENABLED !== 'false',
          collectionInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '60000'),
          retentionPeriod: parseInt(process.env.METRICS_RETENTION_PERIOD || '86400000'), // 24 hours
          prometheus: {
            enabled: process.env.PROMETHEUS_ENABLED === 'true',
            port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
            path: process.env.PROMETHEUS_PATH || '/metrics',
          },
        },
        logging: {
          level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
          structured: process.env.LOG_STRUCTURED === 'true',
          includeRawData: process.env.LOG_INCLUDE_RAW_DATA === 'true',
          maxLogSize: parseInt(process.env.LOG_MAX_SIZE || '1048576'), // 1MB
        },
        tracing: {
          enabled: process.env.TRACING_ENABLED === 'true',
          serviceName: process.env.TRACING_SERVICE_NAME || 'market-signal-processor',
          samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '0.1'),
        },
      },
    },

    kafka: {
      brokers: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
      clientId: process.env.KAFKA_CLIENT_ID || 'market-signal-processor',
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL_MECHANISM ? {
        mechanism: process.env.KAFKA_SASL_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512',
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || '',
      } : undefined,
      topic: process.env.KAFKA_TOPIC || 'market-signals', // Added topic here
    },

    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },

    health: {
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      unhealthyThreshold: parseInt(process.env.HEALTH_UNHEALTHY_THRESHOLD || '3'),
    },
  };

  return config;
}

/**
 * Main entry point for the market signal processor
 */
async function main() {
  const logger = new Logger('MarketSignalProcessorMain');

  try {
    // Load configuration
    const config = loadConfig();

    logger.info('Starting market signal processor with divine configuration', {
      environment: config.environment,
      port: config.port,
      kafkaBrokers: config.kafka.brokers,
      kafkaTopic: config.kafka.topic, // Use config.kafka.topic directly
      rateLimitEnabled: config.processing.rateLimiting.enabled,
      enrichmentEnabled: config.processing.enrichment.enabled,
    });

    // Create and start the application
    const app = new MarketSignalProcessorApp(config);
    await app.start();

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', reason, { promise });
      // In production, might want to restart the service
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    logger.info('✅ Market signal processor started successfully');

  } catch (error: any) {
    logger.error('❌ Failed to start market signal processor', error);
    process.exit(1);
  }
}

/**
 * Serverless function handler for AWS Lambda or similar platforms
 */
export async function handler(event: any, context: any) {
  const logger = new Logger('MarketSignalProcessorLambda');

  try {
    // Initialize configuration for serverless environment
    const config = loadConfig();

    // Override port for serverless
    config.port = 0; // Not used in serverless

    // Create processor instance
    const processor = new MarketSignalProcessor(config);
    await processor.initialize();

    // Parse request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    // Process signals
    const result: ProcessingResult<NormalizedMarketSignal> | BatchProcessingResult = body.signals && body.signals.length > 1 ?
      await processor.processBatch(body.signals) :
      await processor.processSignal(body);

    // Cleanup
    await processor.shutdown();

    const success = 'success' in result ? result.success : (result.failedSignals === 0);

    return {
      statusCode: success ? 200 : 422, // Access success property directly if it exists on both types
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: JSON.stringify(result),
    };

  } catch (error: any) {
    logger.error('Lambda handler error', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
}

/**
 * Health check function for load balancers
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  try {
    const config = loadConfig();
    const processor = new MarketSignalProcessor(config);
    await processor.initialize();

    const health = await processor.getHealth();

    await processor.shutdown();

    return {
      status: health.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Failed to start market signal processor:', error);
    process.exit(1);
  });
}

// Export for testing and external usage
export { MarketSignalProcessor, MarketSignalProcessorApp, loadConfig };
