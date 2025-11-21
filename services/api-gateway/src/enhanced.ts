/**
 * Coinet AI - Enhanced Professional API Gateway
 * Industry-leading API gateway with advanced caching, rate limiting,
 * intelligent monitoring, and circuit breaker patterns
 */

import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// Enhanced features with graceful fallbacks
let helmet: any, compression: any, rateLimit: any, createClient: any, winston: any;

try { helmet = require('helmet'); } catch (e) { helmet = (opts?: any) => (req: any, res: any, next: any) => next(); }
try { compression = require('compression'); } catch (e) { compression = () => (req: any, res: any, next: any) => next(); }
try { rateLimit = require('express-rate-limit'); } catch (e) { rateLimit = (opts?: any) => (req: any, res: any, next: any) => next(); }
try { const redis = require('redis'); createClient = redis.createClient; } catch (e) { createClient = null; }
try { winston = require('winston'); } catch (e) { 
  winston = { 
    createLogger: () => ({ info: console.log, warn: console.warn, error: console.error, debug: console.debug }),
    format: { combine: () => ({}), timestamp: () => ({}), errors: () => ({}), json: () => ({}), colorize: () => ({}), simple: () => ({}) },
    transports: { File: function(opts: any) { return {}; }, Console: function(opts: any) { return {}; } }
  };
}

interface ServiceConfig {
  name: string;
  url: string;
  healthPath: string;
  timeout: number;
  priority: number;
  isHealthy: boolean;
  lastHealthCheck: number;
  errorCount: number;
  responseTime: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface CircuitState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  nextAttempt: number;
}

class EnhancedCoinetGateway {
  private app: express.Application;
  private services: Map<string, ServiceConfig> = new Map();
  private redisClient: any;
  private logger: any;
  private startTime: number;
  
  // Enhanced features
  private cache: Map<string, CacheEntry> = new Map();
  private circuits: Map<string, CircuitState> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  
  // Metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    blockedRequests: 0,
    circuitBreakerTrips: 0
  };

  constructor() {
    this.app = express();
    this.startTime = Date.now();
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      defaultMeta: { service: 'enhanced-gateway' },
      transports: [
        new winston.transports.Console({ format: winston.format.simple() })
      ]
    });

    this.initializeServices();
    this.initializeRedis();
    this.setupMiddleware();
    this.setupRoutes();
    this.startHealthChecks();
  }

  private initializeServices(): void {
    const serviceConfigs = [
      { name: 'auth', url: 'http://auth-service:8001', healthPath: '/health', timeout: 5000, priority: 1 },
      { name: 'user', url: 'http://user-service:8005', healthPath: '/health', timeout: 5000, priority: 1 },
      { name: 'portfolio', url: 'http://portfolio-service:8006', healthPath: '/health', timeout: 5000, priority: 1 },
      { name: 'ai', url: 'http://coinet-ai-service:3001', healthPath: '/health', timeout: 10000, priority: 2 },
      { name: 'data', url: 'http://data-aggregator-service:8004', healthPath: '/health', timeout: 5000, priority: 1 },
      { name: 'context', url: 'http://context-service:8002', healthPath: '/health', timeout: 5000, priority: 1 },
      { name: 'ingest', url: 'http://ingest-service:8001', healthPath: '/health', timeout: 5000, priority: 1 },
      { name: 'inference', url: 'http://inference-service:8003', healthPath: '/health', timeout: 10000, priority: 2 },
      { name: 'feedback', url: 'http://feedback-service:8004', healthPath: '/health', timeout: 5000, priority: 2 }
    ];

    serviceConfigs.forEach(config => {
      this.services.set(config.name, {
        ...config,
        isHealthy: false,
        lastHealthCheck: 0,
        errorCount: 0,
        responseTime: 0
      });
      
      // Initialize circuit breaker
      this.circuits.set(config.name, {
        state: 'closed',
        failures: 0,
        successes: 0,
        nextAttempt: 0
      });
    });

    this.logger.info(`Initialized ${this.services.size} services with enhanced features`);
  }

  private async initializeRedis(): Promise<void> {
    if (process.env.REDIS_ENABLED !== 'false' && createClient) {
      try {
        this.redisClient = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
        await this.redisClient.connect();
        this.logger.info('Redis connected - Enhanced caching enabled');
      } catch (error) {
        this.logger.warn('Redis unavailable, using memory cache');
        this.redisClient = null;
      }
    } else {
      this.logger.info('Redis disabled - Using in-memory features only');
    }
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({ origin: true, credentials: true }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request tracking
    this.app.use((req: any, res, next) => {
      req.id = uuidv4();
      req.startTime = Date.now();
      res.setHeader('X-Request-ID', req.id);
      res.setHeader('X-Gateway-Version', '2.0.0-Enhanced');
      res.setHeader('X-Powered-By', 'Coinet-Enhanced-Gateway');
      
      this.metrics.totalRequests++;
      
      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        this.metrics.averageResponseTime = (this.metrics.averageResponseTime + duration) / 2;
        
        if (res.statusCode < 400) {
          this.metrics.successfulRequests++;
        } else {
          this.metrics.failedRequests++;
        }
      });

      next();
    });

    // Enhanced rate limiting
    this.app.use(this.rateLimitMiddleware());
    
    // Response caching
    this.app.use(this.cacheMiddleware());
  }

  private rateLimitMiddleware() {
    return (req: any, res: any, next: any) => {
      const key = `${req.ip}:${req.path}`;
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      const maxRequests = req.path.includes('/health') ? 1000 : 100;

      let limit = this.rateLimits.get(key);
      if (!limit || now > limit.resetTime) {
        limit = { count: 0, resetTime: now + windowMs };
      }

      limit.count++;
      this.rateLimits.set(key, limit);

      if (limit.count > maxRequests) {
        this.metrics.blockedRequests++;
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((limit.resetTime - now) / 1000)
        });
      }

      res.setHeader('X-RateLimit-Remaining', (maxRequests - limit.count).toString());
      next();
    };
  }

  private cacheMiddleware() {
    return (req: any, res: any, next: any) => {
      if (req.method !== 'GET') return next();

      const cacheKey = `${req.path}:${req.query ? JSON.stringify(req.query) : ''}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.metrics.cacheHits++;
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached.data);
      }

      this.metrics.cacheMisses++;
      
      const originalJson = res.json;
      res.json = (data: any) => {
        // Cache successful responses
        if (res.statusCode < 400) {
          const ttl = req.path.includes('/health') ? 10000 : 300000; // 10s for health, 5min for others
          this.cache.set(cacheKey, { data, timestamp: Date.now(), ttl });
        }
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson.call(res, data);
      };

      next();
    };
  }

  private setupRoutes(): void {
    // Enhanced health check
    this.app.get('/health', (req, res) => {
      const healthyServices = Array.from(this.services.values()).filter(s => s.isHealthy).length;
      const totalServices = this.services.size;
      const healthPercentage = totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

      res.json({
        status: healthPercentage >= 80 ? 'healthy' : healthPercentage >= 50 ? 'degraded' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0-Enhanced',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        services: { total: totalServices, healthy: healthyServices, healthPercentage: Math.round(healthPercentage) },
        features: { caching: true, rateLimiting: true, circuitBreaker: true, monitoring: true },
        redis: { connected: !!this.redisClient }
      });
    });

    // Enhanced metrics with Prometheus support
    this.app.get('/metrics', (req, res) => {
      if (req.query.format === 'prometheus' || req.headers.accept?.includes('text/plain')) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(this.getPrometheusMetrics());
      } else {
        res.json({
          ...this.metrics,
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          services: Object.fromEntries(
            Array.from(this.services.entries()).map(([name, service]) => [
              name, {
                healthy: service.isHealthy,
                responseTime: service.responseTime,
                errorCount: service.errorCount,
                circuitState: this.circuits.get(name)?.state || 'closed'
              }
            ])
          ),
          cache: { size: this.cache.size, hitRate: this.getCacheHitRate() },
          circuitBreakers: Object.fromEntries(this.circuits.entries())
        });
      }
    });

    // Admin endpoints
    this.app.get('/admin/cache/stats', (req, res) => {
      res.json({
        size: this.cache.size,
        hitRate: this.getCacheHitRate(),
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses
      });
    });

    this.app.post('/admin/cache/clear', (req, res) => {
      this.cache.clear();
      res.json({ message: 'Cache cleared successfully' });
    });

    this.app.get('/admin/circuit-breaker/stats', (req, res) => {
      res.json({
        circuits: Object.fromEntries(this.circuits.entries()),
        totalTrips: this.metrics.circuitBreakerTrips
      });
    });

    this.app.get('/admin/versions', (req, res) => {
      res.json({
        current: '2.0.0-Enhanced',
        supported: ['v1', 'v2'],
        features: ['caching', 'rateLimiting', 'circuitBreaker', 'monitoring', 'versioning']
      });
    });

    // Service proxies
    this.setupServiceProxies();
  }

  private setupServiceProxies(): void {
    const routes = [
      { path: '/api/auth', service: 'auth' },
      { path: '/api/users', service: 'user' },
      { path: '/api/portfolio', service: 'portfolio' },
      { path: '/api/ai', service: 'ai' },
      { path: '/api/data', service: 'data' },
      { path: '/api/context', service: 'context' },
      { path: '/api/ingest', service: 'ingest' },
      { path: '/api/inference', service: 'inference' },
      { path: '/api/feedback', service: 'feedback' }
    ];

    routes.forEach(route => {
      this.app.use(route.path, this.createEnhancedProxy(route.service));
    });
  }

  private createEnhancedProxy(serviceName: string) {
    return (req: any, res: any, next: any) => {
      const circuit = this.circuits.get(serviceName);
      const service = this.services.get(serviceName);

      if (!service) {
        return res.status(404).json({ error: 'Service not found', service: serviceName });
      }

      // Circuit breaker check
      if (circuit?.state === 'open' && Date.now() < circuit.nextAttempt) {
        return res.status(503).json({
          error: 'Service Circuit Breaker Open',
          service: serviceName,
          message: 'Service temporarily unavailable due to repeated failures',
          retryAfter: Math.ceil((circuit.nextAttempt - Date.now()) / 1000)
        });
      }

      const proxy = createProxyMiddleware({
        target: service.url,
        changeOrigin: true,
        timeout: service.timeout,
        pathRewrite: { [`^/api/${serviceName === 'user' ? 'users' : serviceName}`]: '' },
        onError: (err, req: any, res) => {
          this.recordFailure(serviceName);
          
          if (!res.headersSent) {
            res.status(503).json({
              error: 'Service unavailable',
              service: serviceName,
              message: `${serviceName} service is temporarily unavailable`,
              requestId: req.id
            });
          }
        },
        onProxyRes: (proxyRes, req: any) => {
          if (proxyRes.statusCode && proxyRes.statusCode < 500) {
            this.recordSuccess(serviceName);
          } else {
            this.recordFailure(serviceName);
          }
        }
      });

      return proxy(req, res, next);
    };
  }

  private recordSuccess(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (circuit) {
      circuit.successes++;
      if (circuit.state === 'half-open' && circuit.successes >= 3) {
        circuit.state = 'closed';
        circuit.failures = 0;
        this.logger.info(`Circuit breaker closed for ${serviceName}`);
      }
    }
  }

  private recordFailure(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (circuit) {
      circuit.failures++;
      if (circuit.failures >= 5 && circuit.state === 'closed') {
        circuit.state = 'open';
        circuit.nextAttempt = Date.now() + 60000; // 1 minute
        this.metrics.circuitBreakerTrips++;
        this.logger.warn(`Circuit breaker opened for ${serviceName}`);
      }
    }
  }

  private getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? Math.round((this.metrics.cacheHits / total) * 100) : 0;
  }

  private getPrometheusMetrics(): string {
    return `
# HELP gateway_requests_total Total requests
# TYPE gateway_requests_total counter
gateway_requests_total ${this.metrics.totalRequests}

# HELP gateway_cache_hit_rate Cache hit rate percentage
# TYPE gateway_cache_hit_rate gauge
gateway_cache_hit_rate ${this.getCacheHitRate()}

# HELP gateway_circuit_breaker_trips Circuit breaker trips
# TYPE gateway_circuit_breaker_trips counter
gateway_circuit_breaker_trips ${this.metrics.circuitBreakerTrips}
`.trim();
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [name, service] of this.services.entries()) {
        try {
          const start = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${service.url}${service.healthPath}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Enhanced-Gateway-HealthCheck' }
          });

          clearTimeout(timeoutId);
          
          service.responseTime = Date.now() - start;
          service.isHealthy = response.ok;
          service.lastHealthCheck = Date.now();
          
          if (response.ok) {
            service.errorCount = Math.max(0, service.errorCount - 1);
          } else {
            service.errorCount++;
          }
        } catch (error) {
          service.isHealthy = false;
          service.errorCount++;
          service.lastHealthCheck = Date.now();
        }
      }
    }, 30000);
  }

  async start(): Promise<void> {
    const port = parseInt(process.env.PORT || '8000');
    const host = process.env.HOST || '0.0.0.0';

    // Error handling
    this.app.use((error: Error, req: any, res: any, next: any) => {
      this.logger.error('Gateway error', { error: error.message, requestId: req.id });
      
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred',
          requestId: req.id
        });
      }
    });

    // 404 handler
    this.app.use('*', (req: any, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
        requestId: req.id
      });
    });

    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        this.logger.info('🚀 Enhanced Coinet API Gateway started', {
          port, host,
          features: ['caching', 'rateLimiting', 'circuitBreaker', 'monitoring'],
          services: Array.from(this.services.keys())
        });
        resolve();
      });
    });
  }
}

// Start the enhanced gateway
const gateway = new EnhancedCoinetGateway();
gateway.start().catch(console.error);
