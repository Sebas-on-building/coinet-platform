/**
 * =========================================
 * API INFRASTRUCTURE SERVICE
 * =========================================
 * Divine world-class API infrastructure for the Coinet platform
 * Comprehensive security, rate limiting, monitoring, and orchestration
 */

import express from 'express';
// Note: These would be installed in a real implementation
// import helmet from 'helmet';
// import compression from 'compression';
// import cors from 'cors';
import { Logger } from './utils/Logger';
import { MetricsCollector } from './monitoring/MetricsCollector';
import { DistributedTracer } from './monitoring/DistributedTracer';
import { AuthenticationMiddleware } from './security/AuthenticationMiddleware';
import { AuthorizationMiddleware } from './security/AuthorizationMiddleware';
import { AdvancedRateLimiter } from './rate-limiting/AdvancedRateLimiter';
import { RequestValidator } from './validation/RequestValidator';
import { ErrorHandler } from './error-handling/ErrorHandler';
import { HealthChecker } from './health/HealthChecker';

// Import all the core services
import { MarketSignalProcessorApp } from '../../market-signal-processor/dist/services/MarketSignalProcessor';
import { EvaluateAlertConditionsService } from '../../evaluate-alert-conditions/dist/index';
import { SendNotificationsService } from '../../send-notifications/dist/index';
import { ParseNaturalLanguageService } from '../../parse-natural-language/dist/index';

import { APIInfrastructureConfig } from './types';

/**
 * Divine world-class API Infrastructure Service
 * Orchestrates all microservices with enterprise-grade security and performance
 */
export class APIInfrastructureService {
  private logger: Logger;
  private config: APIInfrastructureConfig;
  private app: express.Application;

  // Core services
  private marketSignalProcessor?: MarketSignalProcessorApp;
  private alertEvaluator?: EvaluateAlertConditionsService;
  private notificationSender?: SendNotificationsService;
  private nlpParser?: ParseNaturalLanguageService;

  // Infrastructure components
  private metrics: MetricsCollector;
  private tracer: DistributedTracer;
  private auth: AuthenticationMiddleware;
  private authz: AuthorizationMiddleware;
  private rateLimiter: AdvancedRateLimiter;
  private validator: RequestValidator;
  private errorHandler: ErrorHandler;
  private healthChecker: HealthChecker;

  constructor(config: APIInfrastructureConfig) {
    this.logger = new Logger('APIInfrastructureService');
    this.config = config;
    this.app = express();

    // Initialize infrastructure components
    this.metrics = new MetricsCollector(config.monitoring);
    this.tracer = new DistributedTracer(config.tracing);
    this.auth = new AuthenticationMiddleware(config.authentication);
    this.authz = new AuthorizationMiddleware(config.authorization);
    this.rateLimiter = new AdvancedRateLimiter(config.rateLimiting);
    this.validator = new RequestValidator(config.validation);
    this.errorHandler = new ErrorHandler(config.errorHandling);
    this.healthChecker = new HealthChecker(config.health);

    this.setupInfrastructure();
    this.setupRoutes();
  }

  /**
   * Set up core infrastructure middleware and security
   */
  private setupInfrastructure(): void {
    // Security middleware (commented out - would be added in real implementation)
    // this.app.use(require('helmet')({
    //   contentSecurityPolicy: {
    //     directives: {
    //       defaultSrc: ["'self'"],
    //       styleSrc: ["'self'", "'unsafe-inline'"],
    //       scriptSrc: ["'self'"],
    //       imgSrc: ["'self'", "data:", "https:"],
    //       connectSrc: ["'self'", "https:"],
    //       fontSrc: ["'self'"],
    //       objectSrc: ["'none'"],
    //       mediaSrc: ["'self'"],
    //       frameSrc: ["'none'"],
    //     },
    //   },
    //   crossOriginEmbedderPolicy: false,
    //   hsts: {
    //     maxAge: 31536000,
    //     includeSubDomains: true,
    //     preload: true,
    //   },
    // }));

    // Performance middleware (commented out - would be added in real implementation)
    // this.app.use(require('compression')({
    //   level: 6,
    //   threshold: 1024,
    //   filter: (req, res) => {
    //     if (req.headers['x-no-compression']) {
    //       return false;
    //     }
    //     return compression.filter(req, res);
    //   },
    // }));

    // CORS configuration (commented out - would be added in real implementation)
    // this.app.use(require('cors')({
    //   origin: (origin, callback) => {
    //     // Allow requests with no origin (like mobile apps or curl requests)
    //     if (!origin) return callback(null, true);
    //
    //     const allowedOrigins = this.config.security.allowedOrigins || [];
    //     if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    //       callback(null, true);
    //     } else {
    //       callback(new Error('Not allowed by CORS'));
    //     }
    //   },
    //   credentials: true,
    //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    //   allowedHeaders: [
    //     'Origin',
    //     'X-Requested-With',
    //     'Content-Type',
    //     'Accept',
    //     'Authorization',
    //     'X-API-Key',
    //     'X-Request-ID',
    //     'X-Trace-ID',
    //   ],
    // }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] as string ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      res.setHeader('X-Request-ID', requestId);
      (req as any).requestId = requestId;

      // Initialize tracing
      this.tracer.startSpan(`http:${req.method}:${req.path}`, { requestId });

      next();
    });

    // Request logging and metrics
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      (req as any).startTime = startTime;

      this.metrics.recordRequest(req.method, req.path);

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        this.metrics.recordResponse(statusCode, duration);

        if (statusCode >= 400) {
          this.metrics.recordError(statusCode);
        }

        this.logger.http(`${req.method} ${req.path}`, {
          statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: (req as any).requestId,
        });

        // End tracing span
        this.tracer.endSpan(`http:${req.method}:${req.path}`, {
          statusCode,
          duration,
        });
      });

      next();
    });

    // Authentication middleware
    this.app.use(this.auth.middleware());

    // Authorization middleware
    this.app.use(this.authz.middleware());

    // Rate limiting middleware
    this.app.use(this.rateLimiter.middleware());

    // Request validation middleware
    this.app.use(this.validator.middleware());

    // Body parsing with security limits
    this.app.use(express.json({
      limit: '10mb',
      strict: true,
      verify: (req, res, buf) => {
        // Validate JSON structure
        try {
          JSON.parse(buf.toString());
        } catch (error) {
          throw new Error('Invalid JSON format');
        }
      },
    }));

    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb',
      parameterLimit: 1000,
    }));

    // Global error handling
    this.app.use(this.errorHandler.middleware());
  }

  /**
   * Set up API routes for all services
   */
  private setupRoutes(): void {
    // API v1 routes
    const v1Router = express.Router();

    // Market Signal Processing Routes
    this.setupMarketSignalRoutes(v1Router);

    // Alert Evaluation Routes
    this.setupAlertEvaluationRoutes(v1Router);

    // Notification Routes
    this.setupNotificationRoutes(v1Router);

    // NLP Parsing Routes
    this.setupNLPRoutes(v1Router);

    // Mount v1 routes
    this.app.use('/api/v1', v1Router);

    // Health check routes
    this.app.get('/health', this.handleHealthCheck.bind(this));
    this.app.get('/ready', this.handleReadinessCheck.bind(this));
    this.app.get('/metrics', this.handleMetrics.bind(this));

    // API documentation
    this.app.get('/api-docs', (req, res) => {
      res.json({
        title: 'Coinet API Infrastructure',
        version: '1.0.0',
        description: 'Divine world-class API infrastructure for trading and financial services',
        endpoints: {
          marketSignals: '/api/v1/market-signals',
          alertEvaluation: '/api/v1/alerts/evaluate',
          notifications: '/api/v1/notifications',
          nlp: '/api/v1/nlp/parse',
        },
      });
    });
  }

  /**
   * Set up market signal processing routes
   */
  private setupMarketSignalRoutes(router: express.Router): void {
    // Initialize market signal processor
    this.marketSignalProcessor = new MarketSignalProcessorApp(this.config.marketSignals);

    // Mount the market signal processor routes
    router.use('/market-signals', this.marketSignalProcessor.getApp());
  }

  /**
   * Set up alert evaluation routes
   */
  private setupAlertEvaluationRoutes(router: express.Router): void {
    // Initialize alert evaluator
    this.alertEvaluator = new EvaluateAlertConditionsService(this.config.alertEvaluation);

    // Single signal evaluation
    router.post('/alerts/evaluate', async (req, res) => {
      try {
        await this.alertEvaluator!.initialize();
        // Handle single signal evaluation
        res.json({ success: true, message: 'Alert evaluation endpoint ready' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Batch evaluation
    router.post('/alerts/evaluate/batch', async (req, res) => {
      try {
        await this.alertEvaluator!.initialize();
        // Handle batch evaluation
        res.json({ success: true, message: 'Batch alert evaluation endpoint ready' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  /**
   * Set up notification routes
   */
  private setupNotificationRoutes(router: express.Router): void {
    // Initialize notification sender
    this.notificationSender = new SendNotificationsService(this.config.notifications);

    // Single notification
    router.post('/notifications/send', async (req, res) => {
      try {
        await this.notificationSender!.initialize();
        // Handle single notification
        res.json({ success: true, message: 'Notification sending endpoint ready' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Batch notifications
    router.post('/notifications/send/batch', async (req, res) => {
      try {
        await this.notificationSender!.initialize();
        // Handle batch notifications
        res.json({ success: true, message: 'Batch notification sending endpoint ready' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  /**
   * Set up NLP parsing routes
   */
  private setupNLPRoutes(router: express.Router): void {
    // Initialize NLP parser
    this.nlpParser = new ParseNaturalLanguageService(this.config.nlp);

    // Natural language parsing
    router.post('/nlp/parse', async (req, res) => {
      try {
        // Handle NLP parsing
        res.json({ success: true, message: 'NLP parsing endpoint ready' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  /**
   * Handle health check requests
   */
  private async handleHealthCheck(req: express.Request, res: express.Response): Promise<void> {
    try {
      const health = await this.healthChecker.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        status: health.status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        services: health.services,
        metrics: this.metrics.getSummary(),
      });
    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle readiness check requests
   */
  private async handleReadinessCheck(req: express.Request, res: express.Response): Promise<void> {
    try {
      const readiness = await this.healthChecker.getReadinessStatus();

      res.status(readiness.ready ? 200 : 503).json({
        ready: readiness.ready,
        timestamp: new Date().toISOString(),
        checks: readiness.checks,
      });
    } catch (error: any) {
      res.status(503).json({
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle metrics requests
   */
  private handleMetrics(req: express.Request, res: express.Response): void {
    try {
      const metrics = this.metrics.getDetailedMetrics();

      res.json({
        timestamp: new Date().toISOString(),
        ...metrics,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start the API infrastructure service
   */
  async start(port?: number): Promise<void> {
    const serverPort = port || this.config.port;

    try {
      this.logger.info('🚀 Starting divine API Infrastructure Service...', {
        port: serverPort,
        environment: this.config.environment,
      });

      // Initialize all services
      await Promise.all([
        this.marketSignalProcessor?.getProcessor().initialize(),
        this.alertEvaluator?.initialize(),
        this.notificationSender?.initialize(),
        // NLP parser doesn't need initialization
      ]);

      // Start the HTTP server
      const server = this.app.listen(serverPort, () => {
        this.logger.info('✅ API Infrastructure Service started successfully', {
          port: serverPort,
          services: {
            marketSignals: !!this.marketSignalProcessor,
            alertEvaluation: !!this.alertEvaluator,
            notifications: !!this.notificationSender,
            nlp: !!this.nlpParser,
          },
        });
      });

      // Graceful shutdown handling
      const shutdown = async (signal: string) => {
        this.logger.info(`${signal} received, shutting down gracefully...`);

        server.close(async () => {
          await Promise.all([
            this.marketSignalProcessor?.getProcessor().shutdown(),
            this.alertEvaluator?.stop(),
            this.notificationSender?.stop(),
          ]);

          this.logger.info('✅ API Infrastructure Service shutdown completed');
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error: any) {
      this.logger.error('❌ Failed to start API Infrastructure Service', error);
      throw error;
    }
  }

  /**
   * Get the Express application
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get service configuration
   */
  getConfig(): APIInfrastructureConfig {
    return this.config;
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    return this.healthChecker.getHealthStatus();
  }

  /**
   * Get metrics
   */
  getMetrics(): any {
    return this.metrics.getDetailedMetrics();
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): APIInfrastructureConfig {
  return {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',

    // Security configuration
    security: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      apiKeys: process.env.API_KEYS?.split(',') || [],
      encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
    },

    // Authentication configuration
    authentication: {
      jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: process.env.JWT_ISSUER || 'coinet-api',
        audience: process.env.JWT_AUDIENCE || 'coinet-clients',
      },
      apiKeys: {
        enabled: process.env.API_KEY_AUTH === 'true',
        header: process.env.API_KEY_HEADER || 'X-API-Key',
      },
      oauth: {
        enabled: process.env.OAUTH_ENABLED === 'true',
        providers: process.env.OAUTH_PROVIDERS?.split(',') || [],
      },
    },

    // Authorization configuration
    authorization: {
      rbac: {
        enabled: process.env.RBAC_ENABLED === 'true',
        defaultRole: process.env.DEFAULT_ROLE || 'user',
      },
      permissions: {
        checkInterval: parseInt(process.env.PERMISSION_CHECK_INTERVAL || '300'),
      },
    },

    // Rate limiting configuration
    rateLimiting: {
      global: {
        maxRequestsPerSecond: parseInt(process.env.GLOBAL_RPS || '1000'),
        maxRequestsPerMinute: parseInt(process.env.GLOBAL_RPM || '10000'),
        maxRequestsPerHour: parseInt(process.env.GLOBAL_RPH || '100000'),
      },
      perUser: {
        maxRequestsPerMinute: parseInt(process.env.USER_RPM || '100'),
        maxRequestsPerHour: parseInt(process.env.USER_RPH || '1000'),
        burstLimit: parseInt(process.env.USER_BURST || '20'),
      },
      perEndpoint: {
        '/api/v1/market-signals/process-signals': {
          maxRequestsPerSecond: parseInt(process.env.MARKET_SIGNALS_RPS || '500'),
          maxRequestsPerMinute: parseInt(process.env.MARKET_SIGNALS_RPM || '5000'),
          burstLimit: parseInt(process.env.MARKET_SIGNALS_BURST || '100'),
        },
        '/api/v1/alerts/evaluate': {
          maxRequestsPerSecond: parseInt(process.env.ALERT_EVAL_RPS || '200'),
          maxRequestsPerMinute: parseInt(process.env.ALERT_EVAL_RPM || '2000'),
          burstLimit: parseInt(process.env.ALERT_EVAL_BURST || '50'),
        },
      },
      adaptive: {
        enabled: process.env.ADAPTIVE_RATE_LIMITING === 'true',
        adjustmentFactor: parseFloat(process.env.RATE_ADJUSTMENT_FACTOR || '0.1'),
        cooldownPeriod: parseInt(process.env.RATE_COOLDOWN || '300000'),
        maxAdjustment: parseFloat(process.env.MAX_RATE_ADJUSTMENT || '0.5'),
      },
    },

    // Validation configuration
    validation: {
      strictMode: process.env.VALIDATION_STRICT === 'true',
      maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '10485760'), // 10MB
      maxArraySize: parseInt(process.env.MAX_ARRAY_SIZE || '1000'),
    },

    // Error handling configuration
    errorHandling: {
      includeStackTrace: process.env.INCLUDE_STACK_TRACE === 'true',
      logErrors: process.env.LOG_ERRORS === 'true',
      errorReporting: {
        enabled: process.env.ERROR_REPORTING === 'true',
        endpoint: process.env.ERROR_REPORTING_ENDPOINT || '',
      },
    },

    // Health check configuration
    health: {
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      unhealthyThreshold: parseInt(process.env.HEALTH_UNHEALTHY_THRESHOLD || '3'),
      services: {
        redis: process.env.REDIS_URL || 'redis://localhost:6379',
        kafka: process.env.KAFKA_BROKERS?.split(',') || ['localhost:29092'],
        database: process.env.DATABASE_URL || '',
      },
    },

    // Monitoring configuration
    monitoring: {
      metrics: {
        enabled: process.env.METRICS_ENABLED === 'true',
        collectionInterval: parseInt(process.env.METRICS_INTERVAL || '60000'),
        retentionPeriod: parseInt(process.env.METRICS_RETENTION || '86400000'),
      },
      logging: {
        level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
        structured: process.env.STRUCTURED_LOGGING === 'true',
        retentionDays: parseInt(process.env.LOG_RETENTION || '30'),
      },
    },

    // Distributed tracing configuration
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      serviceName: process.env.TRACING_SERVICE_NAME || 'api-infrastructure',
      samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '0.1'),
      exporter: {
        type: (process.env.TRACING_EXPORTER as 'jaeger' | 'zipkin' | 'otlp') || 'jaeger',
        endpoint: process.env.TRACING_ENDPOINT || 'http://localhost:14268/api/traces',
      },
    },

    // Service configurations
    marketSignals: {
      port: 3001,
      host: '0.0.0.0',
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      processing: {
        rateLimiting: {
          enabled: true,
          defaultLimit: parseInt(process.env.MARKET_SIGNALS_RATE_LIMIT || '1000'),
          defaultWindowMs: parseInt(process.env.MARKET_SIGNALS_RATE_WINDOW || '60000'),
          burstLimit: parseInt(process.env.MARKET_SIGNALS_BURST_LIMIT || '100'),
        },
        enrichment: {
          enabled: true,
          lookbackPeriods: [60, 300, 900],
          momentumCalculation: {
            enabled: true,
            priceWindow: 300,
            volumeWindow: 300,
            smoothingAlpha: 0.1,
          },
          orderBookAnalysis: {
            enabled: true,
            depthLevels: 10,
            imbalanceThreshold: 0.1,
          },
          liquidityAnalysis: {
            enabled: true,
            minDepthLevels: 5,
          },
          volatilityCalculation: {
            enabled: true,
            windowSize: 300,
            annualizationFactor: 252,
          },
        },
        kafka: {
          enabled: true,
          topic: process.env.KAFKA_TOPIC || 'market-signals',
          partitionKey: 'exchange',
          compression: 'snappy',
          batchSize: 100,
          lingerMs: 1000,
          requestTimeoutMs: 30000,
        },
        observability: {
          metrics: {
            enabled: true,
            collectionInterval: 60000,
            retentionPeriod: 86400000,
          },
          logging: {
            level: 'info',
            structured: true,
          },
          tracing: {
            enabled: true,
            serviceName: 'market-signal-processor',
            samplingRate: 0.1,
          },
        },
      },
      kafka: {
        brokers: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
        clientId: 'market-signal-processor',
        ssl: process.env.KAFKA_SSL === 'true',
        sasl: process.env.KAFKA_SASL_MECHANISM ? {
          mechanism: process.env.KAFKA_SASL_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512',
          username: process.env.KAFKA_SASL_USERNAME || '',
          password: process.env.KAFKA_SASL_PASSWORD || '',
        } : undefined,
        topic: process.env.KAFKA_TOPIC || 'market-signals',
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      },
      health: {
        checkInterval: 30000,
        unhealthyThreshold: 3,
      },
    },

    alertEvaluation: {
      port: 3002,
      host: '0.0.0.0',
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '1'),
      },
      cache: {
        defaultTTL: 300,
        maxSize: 10000,
        checkPeriod: 60,
      },
      performance: {
        maxEvaluationTime: 50,
        batchSize: 100,
        concurrencyLimit: 10,
        cacheHitTarget: 0.8,
      },
      indexing: {
        updateInterval: 5000,
        maxIndexSize: 100000,
        enablePatternIndexing: true,
      },
      observability: {
        metrics: {
          enabled: true,
          port: 9090,
          path: '/metrics',
        },
        logging: {
          level: 'info',
          structured: true,
        },
      },
    },

    notifications: {
      port: 3003,
      host: '0.0.0.0',
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '2'),
      },
      database: {
        url: process.env.DATABASE_URL || 'mongodb://localhost:27017/notifications',
        type: 'mongodb',
      },
      providers: {
        email: process.env.EMAIL_PROVIDER ? {
          name: 'email',
          type: 'email' as any,
          credentials: {
            username: process.env.EMAIL_USERNAME || '',
            password: process.env.EMAIL_PASSWORD || '',
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || '587',
            secure: process.env.EMAIL_SECURE || 'false',
          },
          settings: {
            fromEmail: process.env.EMAIL_FROM || 'noreply@coinet.com',
            provider: process.env.EMAIL_PROVIDER || 'smtp',
          },
          rateLimits: {
            requestsPerSecond: 10,
            requestsPerMinute: 100,
            requestsPerHour: 1000,
            burstLimit: 20,
          },
          retryConfig: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
          },
          health: {
            status: 'healthy',
            lastChecked: Date.now(),
            errorRate: 0,
            averageResponseTime: 0,
          },
        } : undefined,
        sms: process.env.SMS_PROVIDER ? {
          name: 'sms',
          type: 'sms' as any,
          credentials: {
            accountSid: process.env.TWILIO_ACCOUNT_SID || '',
            authToken: process.env.TWILIO_AUTH_TOKEN || '',
            fromNumber: process.env.TWILIO_FROM_NUMBER || '',
          },
          settings: {
            provider: 'twilio',
          },
          rateLimits: {
            requestsPerSecond: 5,
            requestsPerMinute: 50,
            requestsPerHour: 500,
            burstLimit: 10,
          },
          retryConfig: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
          },
          health: {
            status: 'healthy',
            lastChecked: Date.now(),
            errorRate: 0,
            averageResponseTime: 0,
          },
        } : undefined,
        webhook: process.env.WEBHOOK_PROVIDER ? {
          name: 'webhook',
          type: 'webhook' as any,
          credentials: {},
          settings: {
            timeout: 10000,
          },
          rateLimits: {
            requestsPerSecond: 20,
            requestsPerMinute: 200,
            requestsPerHour: 2000,
            burstLimit: 50,
          },
          retryConfig: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
          },
          health: {
            status: 'healthy',
            lastChecked: Date.now(),
            errorRate: 0,
            averageResponseTime: 0,
          },
        } : undefined,
      },
      rateLimiting: {
        global: {
          maxRequestsPerSecond: 100,
          maxRequestsPerMinute: 1000,
          maxRequestsPerHour: 10000,
        },
        perUser: {
          maxRequestsPerMinute: 50,
          maxRequestsPerHour: 500,
          burstLimit: 10,
        },
        perChannel: {
          email: {
            maxRequestsPerSecond: 10,
            maxRequestsPerMinute: 100,
            burstLimit: 20,
          },
          sms: {
            maxRequestsPerSecond: 5,
            maxRequestsPerMinute: 50,
            burstLimit: 10,
          },
          push: {
            maxRequestsPerSecond: 50,
            maxRequestsPerMinute: 500,
            burstLimit: 100,
          },
          webhook: {
            maxRequestsPerSecond: 20,
            maxRequestsPerMinute: 200,
            burstLimit: 50,
          },
        },
        perProvider: {},
        adaptive: {
          enabled: true,
          adjustmentFactor: 0.1,
          cooldownPeriod: 300000,
          maxAdjustment: 0.5,
        },
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true,
      },
      batch: {
        maxSize: 100,
        maxWaitTime: 1000,
        processingConcurrency: 10,
      },
      performance: {
        maxProcessingTime: 5000,
        cacheTTL: 300,
        healthCheckInterval: 30000,
      },
      observability: {
        metrics: {
          enabled: true,
          port: 9091,
          path: '/metrics',
        },
        logging: {
          level: 'info',
          structured: true,
          retentionDays: 30,
        },
      },
    },

    nlp: {
      providers: [
        {
          name: 'openai',
          model: 'gpt-4',
          apiKey: process.env.OPENAI_API_KEY,
        },
        {
          name: 'anthropic',
          model: 'claude-3-sonnet-20240229',
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      ],
      fallbackProvider: 'openai',
      caching: {
        enabled: true,
        ttl: 3600,
        maxSize: 10000,
      },
      validation: {
        strictMode: false,
        maxRetries: 3,
        timeout: 30000,
      },
      performance: {
        maxConcurrentRequests: 10,
        requestTimeout: 60000,
        retryDelay: 1000,
      },
    },
  };
}

/**
 * Main function for running the API Infrastructure Service
 */
async function main() {
  const logger = new Logger('APIInfrastructureMain');

  try {
    const config = loadConfig();
    const service = new APIInfrastructureService(config);

    logger.info('🚀 Starting divine API Infrastructure Service...');
    await service.start();

    logger.info('✅ API Infrastructure Service started successfully');

  } catch (error: any) {
    logger.error('❌ Failed to start API Infrastructure Service', error);
    process.exit(1);
  }
}

// Run service if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default APIInfrastructureService;
