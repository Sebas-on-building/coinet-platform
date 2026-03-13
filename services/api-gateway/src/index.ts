/**
 * Coinet AI - Professional API Gateway
 * World-class enterprise-grade API gateway with service discovery, 
 * load balancing, circuit breakers, and comprehensive monitoring
 */

/**
 * =========================================
 * ELITE API GATEWAY ENDPOINTS
 * =========================================
 * World-class API gateway with enterprise-grade security,
 * intelligent routing, advanced rate limiting, and comprehensive documentation
 */

import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import AdvancedCacheManager from './cache';
import AdvancedRateLimiter from './rateLimiter';
import EnhancedMonitoringManager from './enhancedMonitoring';
import IntelligentCircuitBreaker from './circuitBreaker';
import APIVersionManager from './versioning';
import { swaggerSpec, swaggerUi } from './swagger';
import {
  authenticateToken,
  requireAuth,
  securityHeaders,
  requestLogging,
  authErrorHandler,
  EliteObservabilityManager,
} from '@coinet-ai/shared-utils/auth';
import { corsConfig } from './cors';

// Optional imports with fallbacks
let helmet: any;
let compression: any;
let rateLimit: any;
let createClient: any;
let winston: any;

try {
  helmet = require('helmet');
} catch (e) {
  helmet = (options?: any) => (req: any, res: any, next: any) => next();
}

try {
  compression = require('compression');
} catch (e) {
  compression = () => (req: any, res: any, next: any) => next();
}

try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  rateLimit = (options?: any) => (req: any, res: any, next: any) => next();
}

try {
  const redis = require('redis');
  createClient = redis.createClient;
} catch (e) {
  createClient = null;
}

try {
  winston = require('winston');
} catch (e) {
  // Fallback logger
  winston = {
    createLogger: () => ({
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    }),
    format: {
      combine: (...args: any[]) => ({}),
      timestamp: () => ({}),
      errors: () => ({}),
      json: () => ({}),
      colorize: () => ({}),
      simple: () => ({})
    },
    transports: {
      File: function(options: any) { return {}; },
      Console: function(options: any) { return {}; }
    }
  };
}

// Types and interfaces
interface ServiceConfig {
  name: string;
  url: string;
  healthPath: string;
  timeout: number;
  retries: number;
  priority: number;
  isHealthy: boolean;
  lastHealthCheck: number;
  errorCount: number;
}

interface GatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeConnections: number;
  uptime: number;
}

// Professional Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Elite API Gateway Class with comprehensive security and observability
class EliteAPIGateway {
  private app: express.Application;
  private services: Map<string, ServiceConfig> = new Map();
  private metrics: GatewayMetrics;
  private redisClient: any;
  private startTime: number;
  private logger = logger;
  private cacheManager?: AdvancedCacheManager;
  private rateLimiter?: AdvancedRateLimiter;
  private monitoring: EnhancedMonitoringManager;
  private circuitBreaker: IntelligentCircuitBreaker;
  private versionManager: APIVersionManager;
  private observability: EliteObservabilityManager;

  constructor() {
    this.app = express();
    this.startTime = Date.now();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      uptime: 0
    };

    // Initialize enhanced components
    this.monitoring = new EnhancedMonitoringManager();
    this.circuitBreaker = new IntelligentCircuitBreaker();
    this.versionManager = new APIVersionManager();

    // Initialize elite observability
    this.observability = new EliteObservabilityManager({
      serviceName: 'api-gateway',
      serviceVersion: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      tracing: {
        enabled: process.env.OTEL_TRACING_ENABLED !== 'false',
        endpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
        protocol: 'grpc',
        samplingRate: 0.1
      },
      metrics: {
        enabled: process.env.OTEL_METRICS_ENABLED !== 'false',
        endpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
        protocol: 'grpc',
        collectionInterval: 60000,
        exportInterval: 60000
      },
      logging: {
        enabled: process.env.OTEL_LOGS_ENABLED !== 'false',
        endpoint: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
        protocol: 'grpc',
        level: 'info',
        structured: true
      }
    });

    this.initializeServices();
    this.initializeRedis();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthChecks();
    this.setupEnhancedFeatures();
  }

  private initializeServices(): void {
    // Define service registry with fallback configurations
    const serviceConfigs: Omit<ServiceConfig, 'isHealthy' | 'lastHealthCheck' | 'errorCount'>[] = [
      {
        name: 'auth',
        url: process.env.AUTH_SERVICE_URL || 'http://auth-service:8001',
        healthPath: '/health',
        timeout: 5000,
        retries: 3,
        priority: 1
      },
      {
        name: 'user',
        url: process.env.USER_SERVICE_URL || 'http://user-service:8005',
        healthPath: '/health',
        timeout: 5000,
        retries: 3,
        priority: 1
      },
      {
        name: 'portfolio',
        url: process.env.PORTFOLIO_SERVICE_URL || 'http://portfolio-service:8006',
        healthPath: '/health',
        timeout: 5000,
        retries: 3,
        priority: 1
      },
      {
        name: 'ai',
        url: process.env.AI_SERVICE_URL || 'http://coinet-ai-service:3001',
        healthPath: '/health',
        timeout: 10000,
        retries: 2,
        priority: 2
      },
      {
        name: 'data',
        url: process.env.DATA_SERVICE_URL || 'http://data-aggregator-service:8004',
        healthPath: '/health',
        timeout: 5000,
        retries: 3,
        priority: 1
      },
      {
        name: 'context',
        url: process.env.CONTEXT_SERVICE_URL || 'http://context-service:8002',
        healthPath: '/health',
        timeout: 5000,
        retries: 3,
        priority: 1
      },
      {
        name: 'ingest',
        url: process.env.INGEST_SERVICE_URL || 'http://ingest-service:8001',
        healthPath: '/health',
        timeout: 5000,
        retries: 3,
        priority: 1
      },
      {
        name: 'inference',
        url: process.env.INFERENCE_SERVICE_URL || 'http://inference-service:8003',
        healthPath: '/health',
        timeout: 10000,
        retries: 2,
        priority: 2
      },
      {
        name: 'feedback',
        url: process.env.FEEDBACK_SERVICE_URL || 'http://feedback-service:8004',
        healthPath: '/health',
        timeout: 5000,
        retries: 3,
        priority: 2
      }
    ];

    // Initialize services with health status
    serviceConfigs.forEach(config => {
      this.services.set(config.name, {
        ...config,
        isHealthy: false,
        lastHealthCheck: 0,
        errorCount: 0
      });
    });

    logger.info(`Initialized ${this.services.size} services`, {
      services: Array.from(this.services.keys())
    });
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
      
      // Only initialize Redis if it's available
      if (process.env.REDIS_ENABLED !== 'false' && createClient) {
        this.redisClient = createClient({
          url: redisUrl,
          socket: {
            connectTimeout: 5000,
            lazyConnect: true
          },
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        });

        this.redisClient.on('error', (error: Error) => {
          logger.warn('Redis connection error, continuing without Redis', { error: error.message });
          this.redisClient = null;
        });

        this.redisClient.on('connect', () => {
          logger.info('Redis connected successfully');
        });

        try {
          await this.redisClient.connect();
          
          // Initialize Redis-dependent features
          this.cacheManager = new AdvancedCacheManager(this.redisClient);
          this.rateLimiter = new AdvancedRateLimiter(this.redisClient);
          
          logger.info('Redis connected - Enhanced features enabled');
        } catch (error) {
          logger.warn('Redis connection failed, continuing without Redis', { error });
          this.redisClient = null;
        }
      } else {
        logger.info('Redis disabled, using in-memory storage');
      }
    } catch (error) {
      logger.warn('Redis initialization failed, continuing without Redis', { error });
      this.redisClient = null;
    }
  }

  /**
   * Setup enhanced features
   */
  private setupEnhancedFeatures(): void {
    // Setup monitoring alerts
    this.monitoring.on('alert', (alert) => {
      logger.warn('System alert triggered', alert);
    });

    // Setup circuit breaker health checks for services
    for (const [serviceName, service] of this.services.entries()) {
      this.circuitBreaker.addHealthCheck(serviceName, async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(`${service.url}${service.healthPath}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Gateway-CircuitBreaker' }
          });
          
          clearTimeout(timeoutId);
          return response.ok;
        } catch {
          return false;
        }
      });
    }

    logger.info('Enhanced features initialized', {
      cache: !!this.cacheManager,
      rateLimiter: !!this.rateLimiter,
      monitoring: true,
      circuitBreaker: true,
      versioning: true
    });
  }

  private setupMiddleware(): void {
    // Elite security middleware stack
    this.app.use(securityHeaders());

    // Enhanced CORS configuration
    this.app.use(corsConfig());

    // Compression with advanced options
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Enhanced request parsing with security
    this.app.use(express.json({
      limit: '10mb',
      strict: true,
      verify: (req, res, buf) => {
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb',
      parameterLimit: 1000
    }));

    // Request ID and timing middleware with observability
    this.app.use((req: any, res, next) => {
      const requestId = uuidv4();
      const startTime = Date.now();

      req.id = requestId;
      req.startTime = startTime;

      // Set comprehensive headers
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Powered-By', 'Coinet-Elite-API-Gateway');
      res.setHeader('X-Gateway-Version', '3.0.0');
      res.setHeader('X-API-Version', req.apiVersion || 'v1');
      res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);

      // Initialize observability span
      if (this.observability) {
        const { span } = this.observability.startSpan(`gateway-${req.method}-${req.path}`, {
          'http.method': req.method,
          'http.url': req.url,
          'http.user_agent': req.get('User-Agent'),
          'user.id': req.user?.id,
          'user.role': req.user?.role
        });

        (req as any).observabilitySpan = span;
      }

      next();
    });

    // API Versioning (must be early in middleware chain)
    this.app.use(this.versionManager.middleware());

    // Elite observability and logging
    this.app.use(requestLogging());

    // Advanced caching (if available)
    if (this.cacheManager) {
      this.app.use(this.cacheManager.middleware());
    }

    // Advanced rate limiting (if available)
    if (this.rateLimiter) {
      this.app.use(this.rateLimiter.middleware());
    } else {
      // Enhanced fallback rate limiting with dynamic limits
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: (req: any) => {
          // Dynamic limits based on user role and endpoint
          if (req.user?.role === 'premium') return 5000;
          if (req.user?.role === 'enterprise') return 10000;
          if (req.path.includes('/signals')) return 1000;
          if (req.path.includes('/portfolio')) return 2000;
          return 1000; // Default limit
        },
        message: {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please upgrade your plan or try again later.',
          retryAfter: '15 minutes',
          upgradeUrl: '/api/v1/subscription/upgrade'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req: any) => {
          return req.path.includes('/health') || req.path.includes('/metrics') || req.path.includes('/docs');
        },
        keyGenerator: (req: any) => {
          // Multi-dimensional rate limiting key
          const userId = req.user?.id || 'anonymous';
          const ip = req.ip || req.connection.remoteAddress;
          const userAgent = req.get('User-Agent')?.substring(0, 50) || 'unknown';
          return `${userId}:${ip}:${userAgent}:${req.path}`;
        }
      });
      this.app.use(limiter);
    }

    // Enhanced request logging and metrics with observability
    this.app.use((req: any, res, next) => {
      this.metrics.totalRequests++;
      this.metrics.activeConnections++;

      // Record in enhanced monitoring
      this.monitoring.recordRequest(req, res);

      // Record observability metrics
      if (this.observability) {
        this.observability.recordMetric('gateway.requests.total', 1, {
          method: req.method,
          path: req.path,
          status_code: res.statusCode.toString(),
          user_role: req.user?.role || 'anonymous'
        });

        this.observability.recordHistogram('gateway.request.duration', Date.now() - req.startTime, {
          method: req.method,
          path: req.path,
          status_code: res.statusCode.toString()
        });
      }

      logger.info('Elite Gateway Request', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        apiVersion: req.apiVersion || 'v1',
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        userRole: req.user?.role,
        contentLength: req.get('Content-Length'),
        referer: req.get('Referer')
      });

      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        this.metrics.activeConnections--;

        if (res.statusCode < 400) {
          this.metrics.successfulRequests++;
        } else {
          this.metrics.failedRequests++;
        }

        // Update average response time with exponential moving average
        this.metrics.averageResponseTime =
          this.metrics.averageResponseTime === 0 ? duration :
          (this.metrics.averageResponseTime * 0.9) + (duration * 0.1);

        // End observability span
        if ((req as any).observabilitySpan) {
          const span = (req as any).observabilitySpan;
          if (res.statusCode >= 400) {
            span.setStatus({ code: 2, message: `HTTP ${res.statusCode}` });
          } else {
            span.setStatus({ code: 1, message: 'OK' });
          }
          span.end();
        }

        logger.info('Elite Gateway Response', {
          requestId: req.id,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          path: req.path,
          apiVersion: req.apiVersion || 'v1',
          cached: res.getHeader('x-cache') === 'HIT',
          cacheHit: res.getHeader('x-cache-hit') === 'true',
          userId: req.user?.id,
          userRole: req.user?.role,
          contentLength: res.get('Content-Length')
        });
      });

      next();
    });
  }

  private setupRoutes(): void {
    // Enhanced API Documentation with authentication
    this.app.use('/docs', swaggerUi.serve);
    this.app.get('/docs', swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 50px 0 }
        .swagger-ui .info .title { color: #1f2937; font-size: 36px; }
        .swagger-ui .auth-wrapper { background: #f8fafc; padding: 20px; border-radius: 8px; }
        .swagger-ui .auth-wrapper .authorize { background: #10b981 !important; }
      `,
      customSiteTitle: 'Coinet Elite API Gateway Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2
      }
    }));

    // OpenAPI JSON endpoint with caching
    this.app.get('/openapi.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.send(swaggerSpec);
    });

    // Comprehensive health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const healthyServices = Array.from(this.services.values())
          .filter(service => service.isHealthy).length;
        const totalServices = this.services.size;
        const healthPercentage = totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

        const status = healthPercentage >= 90 ? 'healthy' :
                     healthPercentage >= 70 ? 'degraded' : 'unhealthy';

        const healthResponse = {
          status,
          timestamp: new Date().toISOString(),
          version: '3.0.0',
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          environment: process.env.NODE_ENV || 'development',
          services: {
            total: totalServices,
            healthy: healthyServices,
            unhealthy: totalServices - healthyServices,
            healthPercentage: Math.round(healthPercentage)
          },
          redis: {
            connected: !!this.redisClient,
            healthy: await this.checkRedisHealth()
          },
          observability: this.observability?.getStatus(),
          gateway: {
            version: '3.0.0',
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            pid: process.pid
          }
        };

        // Record health check metrics
        if (this.observability) {
          this.observability.recordMetric('gateway.health.checks', 1, {
            status,
            health_percentage: healthPercentage.toString()
          });
        }

        res.status(status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503).json(healthResponse);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: 'Health check failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Kubernetes readiness probe
    this.app.get('/ready', async (req, res) => {
      try {
        const criticalServices = Array.from(this.services.values())
          .filter(service => service.priority === 1);
        const healthyCritical = criticalServices.filter(service => service.isHealthy);

        const redisHealthy = await this.checkRedisHealth();
        const observabilityHealthy = this.observability?.getStatus().initialized || false;

        if (healthyCritical.length === criticalServices.length && redisHealthy && observabilityHealthy) {
          res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            checks: {
              criticalServices: true,
              redis: redisHealthy,
              observability: observabilityHealthy
            }
          });
        } else {
          res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            checks: {
              criticalServices: healthyCritical.length === criticalServices.length,
              redis: redisHealthy,
              observability: observabilityHealthy
            }
          });
        }
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          error: 'Readiness check failed'
        });
      }
    });

    // Kubernetes liveness probe
    this.app.get('/live', (req, res) => {
      // Simple liveness check - if the process is running, we're alive
      res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000)
      });
    });

    // Enhanced metrics endpoint with multiple formats
    this.app.get('/metrics', async (req, res) => {
      const accept = req.headers.accept || '';
      const format = req.query.format as string;

      try {
        // Record metrics request
        if (this.observability) {
          this.observability.recordMetric('gateway.metrics.requests', 1, {
            format: format || 'json',
            user_agent: req.get('User-Agent')
          });
        }

        if (format === 'prometheus' || accept.includes('text/plain')) {
          // Prometheus format
          res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
          res.send(this.generatePrometheusMetrics());
        } else if (format === 'json' || !format) {
          // Enhanced JSON format
          const uptime = Math.floor((Date.now() - this.startTime) / 1000);
          this.metrics.uptime = uptime;

          const metricsResponse = {
            ...this.metrics,
            gateway: {
              version: '3.0.0',
              environment: process.env.NODE_ENV || 'development',
              uptime,
              memory: process.memoryUsage(),
              cpu: process.cpuUsage()
            },
            enhanced: this.monitoring.getMetrics(),
            cache: this.cacheManager?.getStats(),
            rateLimit: this.rateLimiter?.getStats(),
            circuitBreaker: this.circuitBreaker.getStatistics(),
            versioning: this.versionManager.getVersionInfo(),
            observability: this.observability?.getStatus(),
            services: Object.fromEntries(
              Array.from(this.services.entries()).map(([name, config]) => [
                name,
                {
                  healthy: config.isHealthy,
                  errorCount: config.errorCount,
                  lastCheck: config.lastHealthCheck,
                  circuitState: this.circuitBreaker.getCircuitState(name),
                  url: config.url,
                  timeout: config.timeout,
                  retries: config.retries,
                  priority: config.priority
                }
              ])
            )
          };

          res.json(metricsResponse);
        } else {
          res.status(400).json({
            error: 'Unsupported format',
            supportedFormats: ['json', 'prometheus'],
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Metrics endpoint error', error);
        res.status(500).json({
          error: 'Failed to retrieve metrics',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Service status endpoint with detailed information
    this.app.get('/status', (req, res) => {
      const statusResponse = {
        gateway: {
          status: 'running',
          version: '3.0.0',
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          pid: process.pid,
          environment: process.env.NODE_ENV || 'development'
        },
        services: Object.fromEntries(this.services.entries()),
        metrics: this.metrics,
        observability: this.observability?.getStatus(),
        timestamp: new Date().toISOString()
      };

      res.json(statusResponse);
    });

    // API version information
    this.app.get('/api/versions', (req, res) => {
      res.json({
        gateway: '3.0.0',
        api: this.versionManager.getVersionInfo(),
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: [],
        timestamp: new Date().toISOString()
      });
    });

    // Setup admin endpoints
    this.setupAdminEndpoints();

    // Setup service proxies with enhanced routing
    this.setupServiceProxies();
  }

  /**
   * Check Redis health for monitoring
   */
  private async checkRedisHealth(): Promise<boolean> {
    try {
      if (!this.redisClient) return false;
      await this.redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate Prometheus metrics format
   */
  private generatePrometheusMetrics(): string {
    const metrics = [
      `# HELP gateway_uptime_seconds Total uptime of the gateway in seconds`,
      `# TYPE gateway_uptime_seconds counter`,
      `gateway_uptime_seconds ${Math.floor((Date.now() - this.startTime) / 1000)}`,

      `# HELP gateway_requests_total Total number of requests processed`,
      `# TYPE gateway_requests_total counter`,
      `gateway_requests_total ${this.metrics.totalRequests}`,

      `# HELP gateway_requests_successful_total Total number of successful requests`,
      `# TYPE gateway_requests_successful_total counter`,
      `gateway_requests_successful_total ${this.metrics.successfulRequests}`,

      `# HELP gateway_requests_failed_total Total number of failed requests`,
      `# TYPE gateway_requests_failed_total counter`,
      `gateway_requests_failed_total ${this.metrics.failedRequests}`,

      `# HELP gateway_response_time_seconds Average response time in seconds`,
      `# TYPE gateway_response_time_seconds gauge`,
      `gateway_response_time_seconds ${this.metrics.averageResponseTime / 1000}`,

      `# HELP gateway_active_connections Current number of active connections`,
      `# TYPE gateway_active_connections gauge`,
      `gateway_active_connections ${this.metrics.activeConnections}`,
    ];

    // Add service health metrics
    for (const [serviceName, service] of this.services.entries()) {
      metrics.push(
        `# HELP gateway_service_healthy Service health status (1 = healthy, 0 = unhealthy)`,
        `# TYPE gateway_service_healthy gauge`,
        `gateway_service_healthy{service="${serviceName}"} ${service.isHealthy ? 1 : 0}`,

        `# HELP gateway_service_error_count Total errors for service`,
        `# TYPE gateway_service_error_count counter`,
        `gateway_service_error_count{service="${serviceName}"} ${service.errorCount}`
      );
    }

    return metrics.join('\n') + '\n';
  }

  /**
   * Setup admin endpoints for enhanced features
   */
  private setupAdminEndpoints(): void {
    const adminRouter = express.Router();

    // Cache management
    adminRouter.get('/cache/stats', (req, res) => {
      res.json(this.cacheManager?.getStats() || { message: 'Cache not available' });
    });

    adminRouter.post('/cache/invalidate', async (req, res) => {
      const { pattern } = req.body;
      if (this.cacheManager && pattern) {
        await this.cacheManager.invalidate(pattern);
        res.json({ message: `Cache invalidated for pattern: ${pattern}` });
      } else {
        res.status(400).json({ error: 'Pattern required or cache not available' });
      }
    });

    adminRouter.post('/cache/warm', async (req, res) => {
      const { routes } = req.body;
      if (this.cacheManager && routes) {
        await this.cacheManager.warmCache(routes);
        res.json({ message: `Cache warmed with ${routes.length} entries` });
      } else {
        res.status(400).json({ error: 'Routes required or cache not available' });
      }
    });

    // Rate limit management
    adminRouter.get('/ratelimit/stats', (req, res) => {
      res.json(this.rateLimiter?.getStats() || { message: 'Rate limiter not available' });
    });

    adminRouter.post('/ratelimit/reset', async (req, res) => {
      const { identifier, route } = req.body;
      if (this.rateLimiter && identifier) {
        await this.rateLimiter.resetLimit(identifier, route);
        res.json({ message: `Rate limit reset for ${identifier}` });
      } else {
        res.status(400).json({ error: 'Identifier required or rate limiter not available' });
      }
    });

    // Circuit breaker management
    adminRouter.get('/circuit-breaker/stats', (req, res) => {
      res.json(this.circuitBreaker.getStatistics());
    });

    adminRouter.post('/circuit-breaker/:service/force-state', (req, res) => {
      const { service } = req.params;
      const { state } = req.body;
      
      if (['open', 'closed', 'half-open'].includes(state)) {
        this.circuitBreaker.forceState(service, state);
        res.json({ message: `Circuit breaker for ${service} set to ${state}` });
      } else {
        res.status(400).json({ error: 'Invalid state. Must be: open, closed, or half-open' });
      }
    });

    // Monitoring and alerts
    adminRouter.get('/monitoring/alerts', (req, res) => {
      res.json(this.monitoring.getAlertHistory());
    });

    adminRouter.get('/monitoring/health-check', async (req, res) => {
      const healthResult = await this.monitoring.performHealthCheck();
      res.json(healthResult);
    });

    // Version management
    adminRouter.get('/versions', (req, res) => {
      res.json(this.versionManager.getVersionInfo());
    });

    adminRouter.post('/versions/:version/deprecate', (req, res) => {
      const { version } = req.params;
      const { deprecationDate, sunsetDate } = req.body;
      
      this.versionManager.deprecateVersion(
        version,
        deprecationDate ? new Date(deprecationDate) : undefined,
        sunsetDate ? new Date(sunsetDate) : undefined
      );
      
      res.json({ message: `Version ${version} marked as deprecated` });
    });

    // Service management
    adminRouter.get('/services', (req, res) => {
      res.json(Object.fromEntries(this.services.entries()));
    });

    adminRouter.get('/services/:service/health', async (req, res) => {
      const { service } = req.params;
      const serviceConfig = this.services.get(service);
      
      if (!serviceConfig) {
        return res.status(404).json({ error: 'Service not found' });
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${serviceConfig.url}${serviceConfig.healthPath}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        res.json({
          service,
          healthy: response.ok,
          statusCode: response.status,
          responseTime: Date.now() - Date.now(), // Would be calculated properly
          lastCheck: Date.now()
        });
      } catch (error) {
        res.json({
          service,
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: Date.now()
        });
      }
    });

    this.app.use('/admin', adminRouter);
  }

  private setupServiceProxies(): void {
    // Enhanced API routes with comprehensive security and observability
    const routes: Array<{
      path: string;
      service: string;
      pathRewrite: Record<string, string>;
      auth?: {
        required: boolean;
        roles?: string[];
        permissions?: string[];
      };
      rateLimit?: {
        enabled: boolean;
        limits?: Record<string, number>;
      };
    }> = [
      // Authentication endpoints (public for login, protected for user data)
      { path: '/api/v1/auth/login', service: 'auth', pathRewrite: { '^/api/v1/auth': '' }, auth: { required: false } },
      { path: '/api/v1/auth/google', service: 'auth', pathRewrite: { '^/api/v1/auth': '' }, auth: { required: false } },
      { path: '/api/v1/auth/apple', service: 'auth', pathRewrite: { '^/api/v1/auth': '' }, auth: { required: false } },
      { path: '/api/v1/auth/me', service: 'auth', pathRewrite: { '^/api/v1/auth': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/auth/refresh', service: 'auth', pathRewrite: { '^/api/v1/auth': '' }, auth: { required: true } },

      // User management (authenticated)
      { path: '/api/v1/users', service: 'user', pathRewrite: { '^/api/v1': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/users/profile', service: 'user', pathRewrite: { '^/api/v1/users': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/users/preferences', service: 'user', pathRewrite: { '^/api/v1/users': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },

      // Portfolio management (authenticated)
      { path: '/api/v1/portfolio', service: 'portfolio', pathRewrite: { '^/api/v1/portfolio': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/portfolio/positions', service: 'portfolio', pathRewrite: { '^/api/v1/portfolio': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/portfolio/performance', service: 'portfolio', pathRewrite: { '^/api/v1/portfolio': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },

      // Market signals processing (authenticated with rate limiting)
      { path: '/api/v1/signals/process', service: 'market-signal-processor', pathRewrite: { '^/api/v1/signals': '' },
        auth: { required: true, roles: ['user', 'premium', 'enterprise'], permissions: ['signals:process'] },
        rateLimit: { enabled: true, limits: { user: 100, premium: 1000, enterprise: 10000 } }
      },
      { path: '/api/v1/signals/process-batch', service: 'market-signal-processor', pathRewrite: { '^/api/v1/signals': '' },
        auth: { required: true, roles: ['premium', 'enterprise'], permissions: ['signals:process'] },
        rateLimit: { enabled: true, limits: { premium: 500, enterprise: 5000 } }
      },

      // AI services (authenticated)
      { path: '/api/v1/ai/insights', service: 'ai', pathRewrite: { '^/api/v1/ai': '/api/v1' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/ai/generate', service: 'ai', pathRewrite: { '^/api/v1/ai': '/api/v1' }, auth: { required: true, roles: ['premium', 'enterprise'] } },
      { path: '/api/v1/ai/analyze', service: 'ai', pathRewrite: { '^/api/v1/ai': '/api/v1' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },

      // Alert management (authenticated)
      { path: '/api/v1/alerts', service: 'user', pathRewrite: { '^/api/v1': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/alerts/evaluate', service: 'evaluate-alert-conditions', pathRewrite: { '^/api/v1/alerts': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/alerts/nlp', service: 'parse-natural-language', pathRewrite: { '^/api/v1/alerts': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },

      // Notification services (authenticated)
      { path: '/api/v1/notifications', service: 'notification', pathRewrite: { '^/api/v1': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/notifications/send', service: 'send-notifications', pathRewrite: { '^/api/v1/notifications': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },

      // Context and data services (authenticated)
      { path: '/api/v1/context', service: 'context', pathRewrite: { '^/api/v1/context': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/data', service: 'data', pathRewrite: { '^/api/v1/data': '/api' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },

      // Ingestion services (authenticated)
      { path: '/api/v1/ingest', service: 'ingest', pathRewrite: { '^/api/v1/ingest': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/ingest/market-data', service: 'ingest', pathRewrite: { '^/api/v1/ingest': '' }, auth: { required: true, roles: ['premium', 'enterprise'] } },

      // Inference services (authenticated)
      { path: '/api/v1/inference', service: 'inference', pathRewrite: { '^/api/v1/inference': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/v1/inference/models', service: 'inference', pathRewrite: { '^/api/v1/inference': '' }, auth: { required: true, roles: ['premium', 'enterprise'] } },

      // Feedback services (authenticated)
      { path: '/api/v1/feedback', service: 'feedback', pathRewrite: { '^/api/v1/feedback': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },

      // Admin endpoints (admin only)
      { path: '/api/v1/admin/users', service: 'user', pathRewrite: { '^/api/v1/admin': '/admin' }, auth: { required: true, roles: ['admin'] } },
      { path: '/api/v1/admin/services', service: 'user', pathRewrite: { '^/api/v1/admin': '/admin' }, auth: { required: true, roles: ['admin'] } },
      { path: '/api/v1/admin/metrics', service: 'user', pathRewrite: { '^/api/v1/admin': '/admin' }, auth: { required: true, roles: ['admin'] } },

      // Legacy API Routes (for backward compatibility) - gradually phase out
      { path: '/api/auth/login', service: 'auth', pathRewrite: { '^/api/auth': '' }, auth: { required: false } },
      { path: '/api/users', service: 'user', pathRewrite: { '^/api/users': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
      { path: '/api/portfolio', service: 'portfolio', pathRewrite: { '^/api/portfolio': '' }, auth: { required: true, roles: ['user', 'premium', 'enterprise'] } },
    ];

    routes.forEach(route => {
      this.app.use(route.path, this.createEnhancedServiceProxy(route));
    });
  }

  private createEnhancedServiceProxy(route: {
    path: string;
    service: string;
    pathRewrite: Record<string, string>;
    auth?: { required: boolean; roles?: string[]; permissions?: string[] };
    rateLimit?: { enabled: boolean; limits?: Record<string, number> };
  }) {
    const service = this.services.get(route.service);
    if (!service) {
      return (req: any, res: any) => {
        this.logger.warn('Service not found in proxy', { service: route.service, path: route.path });
        res.status(404).json({
          error: 'Service not found',
          service: route.service,
          path: route.path,
          requestId: req.id,
          timestamp: new Date().toISOString()
        });
      };
    }

    return (req: any, res: any, next: any) => {
      // 1. Authentication check if required
      if (route.auth?.required) {
        const authMiddleware = requireAuth(route.auth.roles, route.auth.permissions);
        authMiddleware(req, res, (authError: any) => {
          if (authError) return; // Authentication failed, response already sent
          this.continueProxyRequest(route, service, req, res, next);
        });
      } else {
        this.continueProxyRequest(route, service, req, res, next);
      }
    };
  }

  private continueProxyRequest(route: any, service: ServiceConfig, req: any, res: any, next: any) {
    // 2. Circuit breaker protection
    if (!this.circuitBreaker.allowRequest(route.service)) {
      // Record observability metrics for circuit breaker
      if (this.observability) {
        this.observability.recordMetric('gateway.circuit_breaker.open', 1, {
          service: route.service,
          path: route.path
        });
      }

      return res.status(503).json({
        error: 'Service Circuit Breaker Open',
        service: route.service,
        message: `${route.service} service is temporarily unavailable due to repeated failures`,
        requestId: req.id,
        timestamp: new Date().toISOString(),
        circuitBreaker: {
          state: this.circuitBreaker.getCircuitState(route.service),
          available: this.circuitBreaker.isServiceAvailable(route.service)
        }
      });
    }

    // 3. Dynamic rate limiting based on user role
    if (route.rateLimit?.enabled && route.rateLimit.limits) {
      const userRole = req.user?.role || 'anonymous';
      const roleLimit = route.rateLimit.limits[userRole];

      if (roleLimit && this.rateLimiter) {
        const rateLimitKey = `role:${userRole}:${route.path}`;
        this.rateLimiter.checkRateLimit(rateLimitKey, { limit: roleLimit, windowMs: 60000 })
          .then(result => {
            if (!result.allowed) {
              // Record rate limit exceeded metrics
              if (this.observability) {
                this.observability.recordMetric('gateway.rate_limit.exceeded', 1, {
                  user_role: userRole,
                  path: route.path,
                  limit: roleLimit.toString()
                });
              }

              return res.status(429).json({
                error: 'Rate limit exceeded',
                message: `Too many requests for role ${userRole}. Limit: ${roleLimit} per minute`,
                retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
                requestId: req.id,
                timestamp: new Date().toISOString()
              });
            }

            // Continue with proxy request
            this.executeProxy(route, service, req, res, next);
          })
          .catch(error => {
            this.logger.error('Rate limit check failed', error);
            // Continue with proxy on rate limit error (fail open)
            this.executeProxy(route, service, req, res, next);
          });
      } else {
        this.executeProxy(route, service, req, res, next);
      }
    } else {
      this.executeProxy(route, service, req, res, next);
    }
  }

  private executeProxy(route: any, service: ServiceConfig, req: any, res: any, next: any) {
    // Create the actual proxy middleware with enhanced observability
    const proxy = this.createActualProxy(route.service, route.pathRewrite, service);

    // Add observability span for service proxy
    if (this.observability) {
      const { span } = this.observability.startSpan(`proxy-${route.service}-${req.method}`, {
        'http.method': req.method,
        'http.url': req.url,
        'service.name': route.service,
        'gateway.proxy.target': service.url,
        'user.id': req.user?.id,
        'user.role': req.user?.role
      });

      // Override response finish to end span
      const originalFinish = res.end;
      res.end = function(...args: any[]) {
        span.end();
        return originalFinish.apply(this, args);
      };
    }

    return proxy(req, res, next);
  }

  private createActualProxy(serviceName: string, pathRewrite: Record<string, string>, service: ServiceConfig) {

    const proxyOptions: Options = {
      target: service.url,
      changeOrigin: true,
      timeout: service.timeout,
      pathRewrite,
      onError: (err, req: any, res) => {
        service.errorCount++;
        service.isHealthy = false;
        
        // Record failure in circuit breaker
        this.circuitBreaker.recordFailure(serviceName);
        
        logger.error('Proxy error', {
          service: serviceName,
          error: err.message,
          requestId: req.id,
          circuitState: this.circuitBreaker.getCircuitState(serviceName)
        });

        if (!res.headersSent) {
          res.status(503).json({
            error: 'Service unavailable',
            service: serviceName,
            message: `${serviceName} service is temporarily unavailable`,
            requestId: req.id,
            timestamp: new Date().toISOString(),
            circuitBreaker: {
              state: this.circuitBreaker.getCircuitState(serviceName),
              available: this.circuitBreaker.isServiceAvailable(serviceName)
            }
          });
        }
      },
      onProxyReq: (proxyReq, req: any) => {
        proxyReq.setHeader('X-Gateway-Request-ID', req.id);
        proxyReq.setHeader('X-Gateway-Service', serviceName);
        proxyReq.setHeader('X-Forwarded-For', req.ip);
        
        logger.debug('Proxying request', {
          service: serviceName,
          target: service.url,
          path: proxyReq.path,
          requestId: req.id
        });
      },
      onProxyRes: (proxyRes, req: any) => {
        if (proxyRes.statusCode && proxyRes.statusCode < 500) {
          service.errorCount = Math.max(0, service.errorCount - 1);
          service.isHealthy = true;
          
          // Record success in circuit breaker
          this.circuitBreaker.recordSuccess(serviceName);
        } else {
          // Record failure for 5xx errors
          this.circuitBreaker.recordFailure(serviceName);
        }

        logger.debug('Proxy response', {
          service: serviceName,
          statusCode: proxyRes.statusCode,
          requestId: req.id,
          circuitState: this.circuitBreaker.getCircuitState(serviceName)
        });
      }
    };

    return createProxyMiddleware(proxyOptions);
  }

  private setupHealthChecks(): void {
    // Initial health check
    this.performHealthChecks();

    // Periodic health checks every 30 seconds
    setInterval(() => {
      this.performHealthChecks();
    }, 30000);
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.services.entries()).map(
      async ([name, service]) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${service.url}${service.healthPath}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Coinet-Gateway-HealthCheck' }
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            service.isHealthy = true;
            service.errorCount = Math.max(0, service.errorCount - 1);
            service.lastHealthCheck = Date.now();
            
            logger.debug('Health check passed', { service: name });
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          service.isHealthy = false;
          service.errorCount++;
          service.lastHealthCheck = Date.now();
          
          logger.warn('Health check failed', {
            service: name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    );

    await Promise.allSettled(healthCheckPromises);
  }

  public async start(): Promise<void> {
const port = parseInt(process.env.PORT || '8000');
    const host = process.env.HOST || '0.0.0.0';

    // Error handling
    this.app.use((error: Error, req: any, res: any, next: any) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred',
          requestId: req.id,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 404 handler
    this.app.use('*', (req: any, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
        requestId: req.id,
        timestamp: new Date().toISOString()
      });
    });

    return new Promise((resolve) => {
      const server = this.app.listen(port, host, () => {
        logger.info(`🚀 Coinet API Gateway started`, {
          port,
          host,
          environment: process.env.NODE_ENV || 'development',
          services: Array.from(this.services.keys())
        });
        resolve();
      });

      // Graceful shutdown
      const shutdown = async () => {
        logger.info('Shutting down API Gateway...');
        
        server.close(() => {
          if (this.redisClient) {
            this.redisClient.quit();
          }
          logger.info('API Gateway shutdown complete');
          process.exit(0);
        });
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    });
  }
}

// Start the elite gateway
const gateway = new EliteAPIGateway();

// Initialize observability before starting
gateway['observability'].initialize().then(() => {
  gateway.start().catch((error) => {
    console.error('Failed to start Elite API Gateway:', error);
    process.exit(1);
  });
}).catch((error) => {
  console.error('Failed to initialize observability:', error);
  process.exit(1);
});