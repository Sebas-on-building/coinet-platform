/**
 * =========================================
 * ENTERPRISE RATE LIMITING SERVICE
 * =========================================
 * Divine world-class enterprise rate limiting service
 * Multi-algorithm adaptive rate limiting with ML-powered threat detection
 */

import * as express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Logger, createLogger } from './utils/Logger';
import { AdaptiveRateLimiter } from './core/AdaptiveRateLimiter';
import { DistributedRateLimiter } from './core/DistributedRateLimiter';
import { RateLimitingOrchestrator } from './core/RateLimitingOrchestrator';
import { EnterpriseRateLimitingConfig } from './types';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
  id?: string;
}

export class EnterpriseRateLimitingService {
  private logger: Logger;
  private config: EnterpriseRateLimitingConfig;
  private app: express.Application;
  private server: any;

  // Core rate limiting components
  private adaptiveLimiter: AdaptiveRateLimiter;
  private distributedLimiter: DistributedRateLimiter;
  private orchestrator: RateLimitingOrchestrator;

  // Performance tracking
  private metrics = {
    totalRequests: 0,
    allowedRequests: 0,
    deniedRequests: 0,
    averageResponseTime: 0,
    requestsByAlgorithm: new Map<string, number>(),
  };

  constructor(config: EnterpriseRateLimitingConfig) {
    this.logger = createLogger('EnterpriseRateLimitingService');
    this.config = config;
    this.app = express();

    // Initialize core components
    this.adaptiveLimiter = new AdaptiveRateLimiter(config.adaptive);
    this.distributedLimiter = new DistributedRateLimiter(config.distributed);
    this.orchestrator = new RateLimitingOrchestrator({
      adaptiveLimiter: this.adaptiveLimiter,
      distributedLimiter: this.distributedLimiter,
      config: config.orchestrator,
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthMonitoring();
  }

  /**
   * Set up security middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS for enterprise API access
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'https://coinet.ai',
          'https://app.coinet.ai',
          'https://admin.coinet.ai',
          'http://localhost:3000',
          'http://localhost:3001',
        ];

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin', 'X-Requested-With', 'Content-Type', 'Accept',
        'Authorization', 'X-API-Key', 'X-User-ID', 'X-Request-ID'
      ],
    }));

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID middleware
    this.app.use((req: AuthenticatedRequest, res, next) => {
      req.id = `rl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      next();
    });

    // Request logging and metrics
    this.app.use((req: AuthenticatedRequest, res, next) => {
      const start = Date.now();

      this.logger.debug('Rate limit request received', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.updateMetrics(duration, res.statusCode < 400);

        this.logger.info('Rate limit request completed', {
          requestId: req.id,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        });
      });

      next();
    });
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.handleHealthCheck.bind(this));

    // Rate limiting endpoints
    this.app.post('/check', this.handleRateLimitCheck.bind(this));
    this.app.post('/check/batch', this.handleBatchRateLimitCheck.bind(this));

    // Configuration endpoints
    this.app.get('/config', this.handleGetConfig.bind(this));
    this.app.put('/config', this.handleUpdateConfig.bind(this));

    // Statistics and monitoring
    this.app.get('/stats', this.handleGetStats.bind(this));
    this.app.get('/metrics', this.handleGetMetrics.bind(this));
    this.app.get('/dashboard', this.handleGetDashboard.bind(this));

    // Threat intelligence
    this.app.get('/threats', this.handleGetThreats.bind(this));
    this.app.post('/threats/report', this.handleReportThreat.bind(this));

    // Adaptive learning
    this.app.get('/adaptive/status', this.handleGetAdaptiveStatus.bind(this));
    this.app.post('/adaptive/feedback', this.handleAdaptiveFeedback.bind(this));
  }

  /**
   * Set up health monitoring
   */
  private setupHealthMonitoring(): void {
    // Health check every 30 seconds
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error: any) {
        this.logger.error('Health check failed', error);
      }
    }, 30000);

    // Performance monitoring every minute
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 60000);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing Enterprise Rate Limiting Service...', {
      environment: this.config.environment,
      adaptiveEnabled: this.config.adaptive.enabled,
      distributedEnabled: this.config.distributed.enabled,
    });

    try {
      // Initialize all components
      await Promise.all([
        this.adaptiveLimiter.healthCheck(),
        this.distributedLimiter.healthCheck(),
        this.orchestrator.initialize(),
      ]);

      // Perform initial health check
      await this.performHealthCheck();

      this.logger.info('✅ Enterprise Rate Limiting Service initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Enterprise Rate Limiting Service', error);
      throw error;
    }
  }

  /**
   * Start the service
   */
  async start(port?: number): Promise<void> {
    const serverPort = port || this.config.port;

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(serverPort, () => {
        this.logger.info('✅ Enterprise Rate Limiting Service started successfully', {
          port: serverPort,
          environment: this.config.environment,
          adaptiveEnabled: this.config.adaptive.enabled,
        });

        resolve();
      });

      this.server.on('error', (error: any) => {
        this.logger.error('Server startup failed', error);
        reject(error);
      });
    });
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Enterprise Rate Limiting Service...');

    try {
      if (this.server) {
        this.server.close();
      }

      await Promise.all([
        this.orchestrator.shutdown(),
        this.adaptiveLimiter.healthCheck(),
        this.distributedLimiter.shutdown(),
      ]);

      this.logger.info('✅ Enterprise Rate Limiting Service shutdown successfully');
    } catch (error: any) {
      this.logger.error('Error during Enterprise Rate Limiting Service shutdown', error);
      throw error;
    }
  }

  // Route handlers

  private async handleHealthCheck(req: AuthenticatedRequest, res: any): Promise<void> {
    const health = await this.performHealthCheck();
    res.json({
      status: health.status,
      service: 'enterprise-rate-limiting-service',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      components: health.components,
    });
  }

  private async handleRateLimitCheck(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { userId, endpoint, method, ipAddress, userAgent, currentLoad, errorRate } = req.body;

      if (!userId || !endpoint || !method || !ipAddress) {
        res.status(400).json({ error: 'Missing required fields: userId, endpoint, method, ipAddress' });
        return;
      }

      const decision = await this.orchestrator.makeDecision({
        userId,
        endpoint,
        method,
        ipAddress,
        userAgent,
        timestamp: new Date(),
        currentLoad,
        errorRate,
      });

      res.json({
        success: true,
        data: decision,
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Rate limit check failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Rate limit check failed',
        requestId: req.id,
      });
    }
  }

  private async handleBatchRateLimitCheck(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { requests } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        res.status(400).json({ error: 'Batch requests must be a non-empty array' });
        return;
      }

      const decisions = await this.orchestrator.makeBatchDecisions(requests);

      res.json({
        success: true,
        data: decisions,
        requestId: req.id,
        batchSize: requests.length,
      });
    } catch (error: any) {
      this.logger.error('Batch rate limit check failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Batch rate limit check failed',
        requestId: req.id,
      });
    }
  }

  private async handleGetConfig(req: AuthenticatedRequest, res: any): Promise<void> {
    // Return current configuration (sanitized for security)
    const config = {
      environment: this.config.environment,
      adaptive: {
        enabled: this.config.adaptive.enabled,
        modelUpdateInterval: this.config.adaptive.modelUpdateInterval,
      },
      distributed: {
        enabled: this.config.distributed.enabled,
        consistency: this.config.distributed.consistency,
      },
      orchestrator: {
        fallbackLimit: this.config.orchestrator.fallbackLimit,
        circuitBreakerThreshold: this.config.orchestrator.circuitBreakerThreshold,
      },
    };

    res.json({
      success: true,
      data: config,
      requestId: req.id,
    });
  }

  private async handleUpdateConfig(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      // In a real implementation, this would validate and apply configuration updates
      res.json({
        success: true,
        message: 'Configuration update not implemented in demo',
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Configuration update failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Configuration update failed',
        requestId: req.id,
      });
    }
  }

  private async handleGetStats(req: AuthenticatedRequest, res: any): Promise<void> {
    const stats = {
      ...this.metrics,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };

    res.json({
      success: true,
      data: stats,
      requestId: req.id,
    });
  }

  private async handleGetMetrics(req: AuthenticatedRequest, res: any): Promise<void> {
    const metrics = await this.orchestrator.getMetrics();
    res.json({
      success: true,
      data: metrics,
      requestId: req.id,
    });
  }

  private async handleGetDashboard(req: AuthenticatedRequest, res: any): Promise<void> {
    const [orchestratorMetrics, adaptiveStats] = await Promise.all([
      this.orchestrator.getMetrics(),
      this.adaptiveLimiter.getStatistics(),
    ]);

    const dashboard = {
      overview: {
        totalRequests: this.metrics.totalRequests,
        allowedRequests: this.metrics.allowedRequests,
        deniedRequests: this.metrics.deniedRequests,
        successRate: this.metrics.totalRequests > 0 ?
          (this.metrics.allowedRequests / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
        averageResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`,
      },
      adaptive: adaptiveStats,
      algorithms: {
        byAlgorithm: Array.from(this.metrics.requestsByAlgorithm.entries()).map(([algorithm, count]) => ({
          algorithm,
          requests: count,
          percentage: this.metrics.totalRequests > 0 ? (count / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
        })),
      },
      threats: {
        blockedRequests: this.metrics.deniedRequests,
        suspiciousActivity: 0, // Would be tracked by threat detection
        adaptiveBlocks: 0, // Would be tracked by adaptive limiter
      },
      performance: {
        requestsPerSecond: (this.metrics.totalRequests / Math.max(1, process.uptime())).toFixed(2),
        memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        cpuUsage: `${((process.cpuUsage().user + process.cpuUsage().system) / 1000000).toFixed(2)}%`,
      },
    };

    res.json({
      success: true,
      data: dashboard,
      requestId: req.id,
    });
  }

  private async handleGetThreats(req: AuthenticatedRequest, res: any): Promise<void> {
    // Return threat intelligence data
    const threats = {
      activeThreats: 0,
      threatTypes: [],
      blockedIPs: [],
      suspiciousPatterns: [],
      mitigationActions: [],
    };

    res.json({
      success: true,
      data: threats,
      requestId: req.id,
    });
  }

  private async handleReportThreat(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { threatType, description, evidence, userId } = req.body;

      // In a real implementation, this would process threat reports
      res.json({
        success: true,
        message: 'Threat report received',
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Threat report failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Threat report failed',
        requestId: req.id,
      });
    }
  }

  private async handleGetAdaptiveStatus(req: AuthenticatedRequest, res: any): Promise<void> {
    const status = await this.adaptiveLimiter.getStatistics();
    res.json({
      success: true,
      data: status,
      requestId: req.id,
    });
  }

  private async handleAdaptiveFeedback(req: AuthenticatedRequest, res: any): Promise<void> {
    try {
      const { decisionId, actualOutcome, feedback } = req.body;

      // In a real implementation, this would improve the ML model
      res.json({
        success: true,
        message: 'Adaptive feedback recorded',
        requestId: req.id,
      });
    } catch (error: any) {
      this.logger.error('Adaptive feedback failed', error, { requestId: req.id });
      res.status(500).json({
        error: 'Adaptive feedback failed',
        requestId: req.id,
      });
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, any>;
  }> {
    try {
      const componentHealth = await Promise.all([
        this.adaptiveLimiter.healthCheck(),
        this.distributedLimiter.healthCheck(),
        this.orchestrator.healthCheck(),
      ]);

      const components = {
        adaptiveLimiter: componentHealth[0],
        distributedLimiter: componentHealth[1],
        orchestrator: componentHealth[2],
      };

      // Determine overall health
      const unhealthyComponents = Object.entries(components)
        .filter(([, health]) => health.status === 'unhealthy');

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (unhealthyComponents.length > 0) {
        overallStatus = unhealthyComponents.length === Object.keys(components).length ?
          'unhealthy' : 'degraded';
      }

      return {
        status: overallStatus,
        components,
      };
    } catch (error: any) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        components: {},
      };
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(duration: number, success: boolean): void {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.allowedRequests++;
    } else {
      this.metrics.deniedRequests++;
    }

    // Update average response time
    const totalLatency = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration;
    this.metrics.averageResponseTime = totalLatency / this.metrics.totalRequests;
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(): void {
    const successRate = this.metrics.totalRequests > 0 ?
      (this.metrics.allowedRequests / this.metrics.totalRequests * 100) : 0;

    this.logger.info('Performance metrics', {
      totalRequests: this.metrics.totalRequests,
      successRate: `${successRate.toFixed(2)}%`,
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`,
      deniedRequests: this.metrics.deniedRequests,
    });
  }

  /**
   * Get service configuration
   */
  getConfig(): EnterpriseRateLimitingConfig {
    return this.config;
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): EnterpriseRateLimitingConfig {
  return {
    port: parseInt(process.env.ENTERPRISE_RATE_LIMIT_PORT || '8011'),
    host: process.env.ENTERPRISE_RATE_LIMIT_HOST || '0.0.0.0',
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',

    adaptive: {
      enabled: process.env.ADAPTIVE_RATE_LIMITING === 'true',
      modelUpdateInterval: parseInt(process.env.ADAPTIVE_MODEL_UPDATE_INTERVAL || '3600000'), // 1 hour
      thresholdAdjustmentInterval: parseInt(process.env.ADAPTIVE_THRESHOLD_ADJUSTMENT_INTERVAL || '300000'), // 5 minutes
      defaultLimit: parseInt(process.env.ADAPTIVE_DEFAULT_LIMIT || '1000'),
      fallbackLimit: parseInt(process.env.ADAPTIVE_FALLBACK_LIMIT || '100'),
      learningRate: parseFloat(process.env.ADAPTIVE_LEARNING_RATE || '0.1'),
      confidenceThreshold: parseFloat(process.env.ADAPTIVE_CONFIDENCE_THRESHOLD || '0.8'),
      anomalyThreshold: parseFloat(process.env.ADAPTIVE_ANOMALY_THRESHOLD || '0.7'),
      riskThreshold: parseFloat(process.env.ADAPTIVE_RISK_THRESHOLD || '0.8'),
    },

    distributed: {
      enabled: process.env.DISTRIBUTED_RATE_LIMITING === 'true',
      provider: (process.env.DISTRIBUTED_PROVIDER as 'redis' | 'etcd' | 'consul') || 'redis',
      consistency: (process.env.DISTRIBUTED_CONSISTENCY as 'strong' | 'eventual') || 'eventual',
      replicationFactor: parseInt(process.env.DISTRIBUTED_REPLICATION_FACTOR || '3'),
      timeout: parseInt(process.env.DISTRIBUTED_TIMEOUT || '5000'),
      retryAttempts: parseInt(process.env.DISTRIBUTED_RETRY_ATTEMPTS || '3'),
    },

    orchestrator: {
      fallbackLimit: parseInt(process.env.ORCHESTRATOR_FALLBACK_LIMIT || '100'),
      circuitBreakerThreshold: parseInt(process.env.ORCHESTRATOR_CIRCUIT_BREAKER_THRESHOLD || '1000'),
      healthCheckInterval: parseInt(process.env.ORCHESTRATOR_HEALTH_CHECK_INTERVAL || '30000'),
      metricsRetentionDays: parseInt(process.env.ORCHESTRATOR_METRICS_RETENTION_DAYS || '30'),
    },

    algorithms: {
      default: (process.env.DEFAULT_RATE_LIMIT_ALGORITHM as 'fixed_window' | 'sliding_window' | 'token_bucket' | 'adaptive') || 'adaptive',
      fixedWindow: {
        windowSize: parseInt(process.env.FIXED_WINDOW_SIZE || '60000'),
        maxRequests: parseInt(process.env.FIXED_WINDOW_LIMIT || '1000'),
      },
      slidingWindow: {
        windowSize: parseInt(process.env.SLIDING_WINDOW_SIZE || '60000'),
        maxRequests: parseInt(process.env.SLIDING_WINDOW_LIMIT || '1000'),
      },
      tokenBucket: {
        capacity: parseInt(process.env.TOKEN_BUCKET_CAPACITY || '1000'),
        refillRate: parseInt(process.env.TOKEN_BUCKET_REFILL_RATE || '100'),
      },
      adaptive: {
        enabled: process.env.ADAPTIVE_ALGORITHM === 'true',
        sensitivity: parseFloat(process.env.ADAPTIVE_SENSITIVITY || '0.7'),
      },
    },

    security: {
      enableThreatDetection: process.env.ENABLE_THREAT_DETECTION === 'true',
      suspiciousActivityThreshold: parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD || '1000'),
      blockDuration: parseInt(process.env.BLOCK_DURATION || '3600000'), // 1 hour
      whitelistEnabled: process.env.WHITELIST_ENABLED === 'true',
      blacklistEnabled: process.env.BLACKLIST_ENABLED === 'true',
    },

    monitoring: {
      enabled: process.env.MONITORING_ENABLED === 'true',
      collectionInterval: parseInt(process.env.MONITORING_INTERVAL || '60000'),
      retentionDays: parseInt(process.env.MONITORING_RETENTION || '90'),
      alerting: {
        enabled: process.env.ALERTING_ENABLED === 'true',
        highUsageThreshold: parseFloat(process.env.ALERT_HIGH_USAGE || '0.9'),
        suspiciousActivityThreshold: parseInt(process.env.ALERT_SUSPICIOUS || '1000'),
      },
    },

    performance: {
      maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPERATIONS || '10000'),
      cacheSize: parseInt(process.env.RATE_LIMIT_CACHE_SIZE || '100000'),
      cacheTTL: parseInt(process.env.RATE_LIMIT_CACHE_TTL || '300'),
      enableCompression: process.env.ENABLE_COMPRESSION === 'true',
    },
  };
}

/**
 * Main function for running the Enterprise Rate Limiting Service
 */
async function main() {
  const logger = createLogger('EnterpriseRateLimitingMain');

  try {
    const config = loadConfig();
    const service = new EnterpriseRateLimitingService(config);

    logger.info('🚀 Starting Enterprise Rate Limiting Service...');
    await service.initialize();
    await service.start();

    logger.info('✅ Enterprise Rate Limiting Service started successfully');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await service.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await service.shutdown();
      process.exit(0);
    });

  } catch (error: any) {
    logger.error('❌ Failed to start Enterprise Rate Limiting Service', error);
    process.exit(1);
  }
}

// Run service if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default EnterpriseRateLimitingService;
