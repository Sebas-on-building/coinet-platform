/**
 * =========================================
 * RATE LIMITING SERVICE MAIN
 * =========================================
 * Divine world-class API rate limiting service entry point
 */

import { RateLimitingService } from './RateLimitingService';
import { RateLimitConfig } from './types';
import { Logger } from './utils/Logger';

export class RateLimitingServiceMain {
  private logger: Logger;
  private config: RateLimitConfig;
  private service: RateLimitingService;
  private isHealthy: boolean = false;

  constructor() {
    this.logger = new Logger('RateLimitingService');
    this.config = loadConfigFromEnv();
    this.service = new RateLimitingService(this.config);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing divine Rate Limiting Service...', {
      environment: this.config.environment,
      algorithms: Object.keys(this.config.algorithms),
    });

    try {
      // Perform health check
      const health = await this.service.healthCheck();
      this.isHealthy = health.status === 'healthy';

      this.logger.info('✅ Rate Limiting Service initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Rate Limiting Service', error);
      throw error;
    }
  }

  /**
   * Start the service (for standalone mode)
   */
  async start(port?: number): Promise<void> {
    const serverPort = port || this.config.port;

    this.logger.info('✅ Rate Limiting Service started successfully', {
      port: serverPort,
      environment: this.config.environment,
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      this.logger.info('SIGTERM received, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      this.logger.info('SIGINT received, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Rate Limiting Service...');
    this.logger.info('✅ Rate Limiting Service shutdown successfully');
  }

  /**
   * Get the rate limiting service instance
   */
  getService(): RateLimitingService {
    return this.service;
  }

  /**
   * Get service configuration
   */
  getConfig(): RateLimitConfig {
    return this.config;
  }

  /**
   * Get service health
   */
  async getHealth(): Promise<any> {
    const health = await this.service.healthCheck();
    return {
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      algorithms: health.details,
    };
  }

  /**
   * Get service statistics
   */
  async getStatistics(): Promise<any> {
    return await this.service.getStatistics();
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): RateLimitConfig {
  return {
    port: parseInt(process.env.RATE_LIMIT_PORT || '3000'),
    host: process.env.RATE_LIMIT_HOST || '0.0.0.0',
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',

    algorithms: {
      default: (process.env.RATE_LIMIT_ALGORITHM as 'fixed_window' | 'sliding_window' | 'token_bucket' | 'leaky_bucket') || 'token_bucket',
      fixedWindow: {
        windowSize: parseInt(process.env.FIXED_WINDOW_SIZE || '60000'), // 1 minute
        maxRequests: parseInt(process.env.FIXED_WINDOW_LIMIT || '1000'),
        headers: process.env.FIXED_WINDOW_HEADERS === 'true',
      },
      slidingWindow: {
        windowSize: parseInt(process.env.SLIDING_WINDOW_SIZE || '60000'), // 1 minute
        maxRequests: parseInt(process.env.SLIDING_WINDOW_LIMIT || '1000'),
        precision: parseInt(process.env.SLIDING_WINDOW_PRECISION || '1000'), // 1 second
        headers: process.env.SLIDING_WINDOW_HEADERS === 'true',
      },
      tokenBucket: {
        capacity: parseInt(process.env.TOKEN_BUCKET_CAPACITY || '100'),
        refillRate: parseInt(process.env.TOKEN_BUCKET_REFILL || '10'), // 10 tokens per second
        headers: process.env.TOKEN_BUCKET_HEADERS === 'true',
      },
      leakyBucket: {
        capacity: parseInt(process.env.LEAKY_BUCKET_CAPACITY || '100'),
        leakRate: parseInt(process.env.LEAKY_BUCKET_RATE || '10'), // 10 requests per second
        headers: process.env.LEAKY_BUCKET_HEADERS === 'true',
      },
    },

    limits: {
      keyLevel: {
        enabled: process.env.KEY_LEVEL_LIMITS === 'true',
        defaultLimit: parseInt(process.env.KEY_LEVEL_DEFAULT || '1000'),
        windowSize: parseInt(process.env.KEY_LEVEL_WINDOW || '60000'),
        burstLimit: parseInt(process.env.KEY_LEVEL_BURST || '2000'),
        differentiated: {
          free: parseInt(process.env.KEY_LEVEL_FREE || '100'),
          premium: parseInt(process.env.KEY_LEVEL_PREMIUM || '1000'),
          enterprise: parseInt(process.env.KEY_LEVEL_ENTERPRISE || '10000'),
        },
      },

      resourceLevel: {
        enabled: process.env.RESOURCE_LEVEL_LIMITS === 'true',
        endpoints: {
          '/api/v1/market-data': {
            limit: parseInt(process.env.ENDPOINT_MARKET_DATA_LIMIT || '10000'),
            windowSize: parseInt(process.env.ENDPOINT_MARKET_DATA_WINDOW || '60000'),
            burstLimit: parseInt(process.env.ENDPOINT_MARKET_DATA_BURST || '20000'),
          },
          '/api/v1/alerts': {
            limit: parseInt(process.env.ENDPOINT_ALERTS_LIMIT || '1000'),
            windowSize: parseInt(process.env.ENDPOINT_ALERTS_WINDOW || '60000'),
            burstLimit: parseInt(process.env.ENDPOINT_ALERTS_BURST || '2000'),
          },
          '/api/v1/notifications': {
            limit: parseInt(process.env.ENDPOINT_NOTIFICATIONS_LIMIT || '500'),
            windowSize: parseInt(process.env.ENDPOINT_NOTIFICATIONS_WINDOW || '60000'),
            burstLimit: parseInt(process.env.ENDPOINT_NOTIFICATIONS_BURST || '1000'),
          },
        },
        methods: {
          GET: parseInt(process.env.METHOD_GET_LIMIT || '10000'),
          POST: parseInt(process.env.METHOD_POST_LIMIT || '1000'),
          PUT: parseInt(process.env.METHOD_PUT_LIMIT || '500'),
          DELETE: parseInt(process.env.METHOD_DELETE_LIMIT || '100'),
        },
      },

      global: {
        enabled: process.env.GLOBAL_LIMITS === 'true',
        maxRequestsPerSecond: parseInt(process.env.GLOBAL_RPS_LIMIT || '10000'),
        maxConcurrentRequests: parseInt(process.env.GLOBAL_CONCURRENT_LIMIT || '1000'),
      },
    },

    dynamic: {
      enabled: process.env.DYNAMIC_LIMITS === 'true',
      loadThreshold: parseFloat(process.env.DYNAMIC_LOAD_THRESHOLD || '0.8'), // 80% CPU/Memory
      behaviorAnalysis: {
        enabled: process.env.BEHAVIOR_ANALYSIS === 'true',
        windowSize: parseInt(process.env.BEHAVIOR_ANALYSIS_WINDOW || '60'), // 60 minutes
        thresholdMultiplier: parseFloat(process.env.BEHAVIOR_ANALYSIS_MULTIPLIER || '2.0'),
      },
    },

    monitoring: {
      enabled: process.env.MONITORING_ENABLED === 'true',
      collectionInterval: parseInt(process.env.MONITORING_INTERVAL || '60000'),
      retentionDays: parseInt(process.env.MONITORING_RETENTION || '30'),
    },

    alerting: {
      enabled: process.env.ALERTING_ENABLED === 'true',
      thresholds: {
        highUsage: parseFloat(process.env.ALERT_HIGH_USAGE || '0.9'), // 90% of limit
        suspiciousActivity: parseInt(process.env.ALERT_SUSPICIOUS || '1000'), // 1000 requests per minute
        loadSpike: parseFloat(process.env.ALERT_LOAD_SPIKE || '2.0'), // 200% increase
      },
    },
  };
}

/**
 * Main function for running the Rate Limiting Service
 */
async function main() {
  const logger = new Logger('RateLimitingMain');

  try {
    const service = new RateLimitingServiceMain();

    logger.info('🚀 Starting divine Rate Limiting Service...');
    await service.initialize();
    await service.start();

    logger.info('✅ Rate Limiting Service started successfully');

  } catch (error: any) {
    logger.error('❌ Failed to start Rate Limiting Service', error);
    process.exit(1);
  }
}

// Run service if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default RateLimitingServiceMain;
