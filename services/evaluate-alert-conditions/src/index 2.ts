/**
 * =========================================
 * EVALUATE ALERT CONDITIONS SERVICE
 * =========================================
 * Divine world-class stateless alert evaluation service
 * Sub-millisecond performance with comprehensive rule matching
 */

import express from 'express';
// Note: These would be installed in a real implementation
// import helmet from 'helmet';
// import compression from 'compression';
// import cors from 'cors';
import Redis from 'ioredis';
import { Logger } from '@/utils/Logger';
import { AlertEvaluationEngine } from '@/engine/AlertEvaluationEngine';
import { AdaptiveBaselinesEngine } from '@/engine/AdaptiveBaselines';
import { SequencePatternsEngine } from '@/engine/SequencePatterns';
import { RuleIndexingEngine } from '@/indexing/RuleIndex';
import {
  RedisAlertRuleStorage,
  RedisBaselineStorage,
  RedisThresholdStorage,
  RedisPatternStorage
} from '@/storage/RedisStorage';
import { SignalCache } from '@/storage/SignalCache';
import { EvaluationHandler } from '@/handlers/EvaluationHandler';
import {
  EvaluateAlertConditionsConfig
} from '@/types';

/**
 * Main service class
 */
export class EvaluateAlertConditionsService {
  private app: express.Application;
  private logger: Logger;
  private config: EvaluateAlertConditionsConfig;
  private evaluationEngine?: AlertEvaluationEngine;
  private evaluationHandler?: EvaluationHandler;
  private redis?: Redis;
  private server?: any;

  constructor(config: EvaluateAlertConditionsConfig) {
    this.config = config;
    this.logger = new Logger('EvaluateAlertConditionsService');
    this.app = express();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing evaluate-alert-conditions service...', {
      environment: this.config.environment,
      port: this.config.port,
    });

    // Initialize Redis
    await this.initializeRedis();

    // Initialize storage components
    const ruleStorage = new RedisAlertRuleStorage(this.redis!);
    const baselineStorage = new RedisBaselineStorage(this.redis!);
    const thresholdStorage = new RedisThresholdStorage(this.redis!);
    const patternStorage = new RedisPatternStorage(this.redis!);

    // Initialize cache
    const signalCache = new SignalCache(
      this.config.cache.defaultTTL,
      this.config.cache.maxSize,
      this.config.cache.checkPeriod
    );

    // Initialize evaluation engines
    const baselinesEngine = new AdaptiveBaselinesEngine(baselineStorage);
    const patternsEngine = new SequencePatternsEngine(patternStorage);
    const ruleIndexEngine = new RuleIndexingEngine(this.config.indexing.updateInterval);

    // Initialize main evaluation engine
    this.evaluationEngine = new AlertEvaluationEngine(
      ruleStorage,
      baselineStorage,
      thresholdStorage,
      patternStorage,
      signalCache,
      this.config.performance.concurrencyLimit,
      this.config.performance.maxEvaluationTime
    );

    // Initialize HTTP handler
    this.evaluationHandler = new EvaluationHandler(this.evaluationEngine);

    // Setup Express middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();

    this.logger.info('Service initialization completed');
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    if (!this.evaluationEngine || !this.evaluationHandler) {
      throw new Error('Service not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          this.logger.info('Evaluate-alert-conditions service started', {
            port: this.config.port,
            host: this.config.host,
            environment: this.config.environment,
          });
          resolve();
        });

        this.server.on('error', (error: any) => {
          this.logger.error('Server error', { error: error.message });
          reject(error);
        });

      } catch (error: any) {
        this.logger.error('Failed to start service', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping evaluate-alert-conditions service...');

    if (this.server) {
      this.server.close();
    }

    if (this.redis) {
      await this.redis.quit();
    }

    this.logger.info('Service stopped');
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    const redisConfig: any = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      db: this.config.redis.db,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    if (this.config.redis.password) {
      redisConfig.password = this.config.redis.password;
    }

    this.redis = new Redis(redisConfig);

    // Test connection
    try {
      await this.redis.ping();
      this.logger.info('Redis connection established');
    } catch (error: any) {
      this.logger.error('Redis connection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware (commented out - would be added in real implementation)
    // this.app.use(helmet({
    //   contentSecurityPolicy: false, // Disable for API endpoints
    //   crossOriginEmbedderPolicy: false,
    // }));

    // Compression middleware (commented out - would be added in real implementation)
    // this.app.use(compression());

    // CORS middleware (commented out - would be added in real implementation)
    // this.app.use(cors({
    //   origin: true, // Allow all origins in development
    //   credentials: true,
    // }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] as string ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      res.setHeader('X-Request-ID', requestId);
      (req as any).requestId = requestId;
      next();
    });

    // Request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      (req as any).startTime = startTime;

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logger.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          requestId: (req as any).requestId,
        });
      });

      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    if (!this.evaluationHandler) {
      throw new Error('Evaluation handler not initialized');
    }

    // Signal evaluation endpoint
    this.app.post('/evaluate', async (req, res) => {
      await this.evaluationHandler!.handleEvaluation(req, res);
    });

    // Batch evaluation endpoint
    this.app.post('/evaluate/batch', async (req, res) => {
      await this.evaluationHandler!.handleBatchEvaluation(req, res);
    });

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      await this.evaluationHandler!.handleHealthCheck(req, res);
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      await this.evaluationHandler!.handleMetrics(req, res);
    });

    // Prometheus metrics (if enabled)
    if (this.config.observability.metrics.enabled) {
      // Prometheus middleware would be added here
    }
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): EvaluateAlertConditionsConfig {
  const config: EvaluateAlertConditionsConfig = {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || '0.0.0.0',
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',

    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
    },

    cache: {
      defaultTTL: parseInt(process.env.CACHE_TTL || '300'),
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000'),
      checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '60'),
    },

    performance: {
      maxEvaluationTime: parseInt(process.env.MAX_EVALUATION_TIME || '50'),
      batchSize: parseInt(process.env.BATCH_SIZE || '100'),
      concurrencyLimit: parseInt(process.env.CONCURRENCY_LIMIT || '10'),
      cacheHitTarget: parseFloat(process.env.CACHE_HIT_TARGET || '0.8'),
    },

    indexing: {
      updateInterval: parseInt(process.env.INDEX_UPDATE_INTERVAL || '5000'),
      maxIndexSize: parseInt(process.env.MAX_INDEX_SIZE || '100000'),
      enablePatternIndexing: process.env.ENABLE_PATTERN_INDEXING === 'true',
    },

    observability: {
      metrics: {
        enabled: process.env.METRICS_ENABLED === 'true',
        port: parseInt(process.env.METRICS_PORT || '9090'),
        path: process.env.METRICS_PATH || '/metrics',
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        structured: process.env.STRUCTURED_LOGGING === 'true',
      },
    },
  };

  return config;
}

/**
 * Serverless function handler for AWS Lambda
 */
export async function handler(event: any, context: any) {
  const logger = new Logger('EvaluateAlertConditionsLambda');

  try {
    // Load configuration
    const config = loadConfig();

    // Initialize service components
    const redisConfig: any = {
      host: config.redis.host,
      port: config.redis.port,
      db: config.redis.db,
    };

    if (config.redis.password) {
      redisConfig.password = config.redis.password;
    }

    const redis = new Redis(redisConfig);

    const ruleStorage = new RedisAlertRuleStorage(redis);
    const baselineStorage = new RedisBaselineStorage(redis);
    const thresholdStorage = new RedisThresholdStorage(redis);
    const patternStorage = new RedisPatternStorage(redis);
    const signalCache = new SignalCache();

    const evaluationEngine = new AlertEvaluationEngine(
      ruleStorage,
      baselineStorage,
      thresholdStorage,
      patternStorage,
      signalCache
    );

    // Parse request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    if (!body || !body.signal) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Signal data is required',
        }),
      };
    }

    // Evaluate signal
    const result = await evaluationEngine.evaluateSignal(body.signal);

    // Cleanup
    await redis.quit();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result,
      }),
    };

  } catch (error: any) {
    logger.error('Lambda evaluation failed', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}

/**
 * Main function for standalone execution
 */
async function main() {
  const config = loadConfig();
  const service = new EvaluateAlertConditionsService(config);

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await service.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await service.stop();
    process.exit(0);
  });

  try {
    await service.initialize();
    await service.start();
  } catch (error: any) {
    console.error('Failed to start service:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export main service components (class is already exported above)
// export { loadConfig, handler };
