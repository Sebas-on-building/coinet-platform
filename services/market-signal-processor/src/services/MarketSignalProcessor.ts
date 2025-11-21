/**
 * =========================================
 * MARKET SIGNAL PROCESSOR
 * =========================================
 * Divine world-class market signal processing service
 * High-performance async processing with comprehensive error handling and observability
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import {
  authenticateToken,
  requireAuth,
  securityHeaders,
  corsConfig,
  requestLogging,
  authErrorHandler
} from '@/../../shared-utils/src/auth';

import {
  RawMarketSignal,
  EnrichedMarketSignal,
  NormalizedMarketSignal,
  ProcessingContext,
  ProcessSignalsRequestSchema,
  ProcessingResult,
  BatchProcessingResult,
  MarketSignalProcessorConfig
} from '@/types';

import { SignalValidator } from '@/validation/schemas';
import { DataEnrichmentEngine } from '@/enrichment/algorithms';
import { KafkaPublisher, SignalNormalizer } from '@/publishers/KafkaPublisher';
import { AdvancedRateLimiter, RateLimitKeyGenerator } from '@/services/RateLimiter';
import { ObservabilityManager } from '@/monitoring/ObservabilityManager';

import { Logger } from '@/utils/Logger';

/**
 * Main market signal processor with divine world-class performance
 */
export class MarketSignalProcessor {
  private logger: Logger;
  private validator: SignalValidator;
  private enrichmentEngine: DataEnrichmentEngine;
  private kafkaPublisher: KafkaPublisher;
  private rateLimiter: AdvancedRateLimiter;
  private observability: ObservabilityManager;
  private config: MarketSignalProcessorConfig;
  private isInitialized: boolean = false;

  // Performance optimization
  private concurrencyLimiter: any; // p-limit instance
  private maxConcurrency: number = 10;

  constructor(config: MarketSignalProcessorConfig) {
    this.config = config;
    this.logger = new Logger('MarketSignalProcessor');

    // Initialize components
    this.validator = new SignalValidator();
    this.enrichmentEngine = new DataEnrichmentEngine();
    this.kafkaPublisher = new KafkaPublisher(config.kafka);
    this.rateLimiter = new AdvancedRateLimiter(config.processing.rateLimiting);
    this.observability = new ObservabilityManager(config.processing.observability as any);

    // Set up concurrency limiting
    this.concurrencyLimiter = pLimit(this.maxConcurrency);
  }

  /**
   * Initialize the market signal processor
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing market signal processor...', {
        environment: this.config.environment,
        maxConcurrency: this.maxConcurrency,
      });

      // Initialize all components
      await Promise.all([
        this.kafkaPublisher.initialize(),
        this.rateLimiter.initialize(),
        this.observability.initialize(),
      ]);

      this.isInitialized = true;
      this.logger.info('✅ Market signal processor initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize market signal processor', error);
      throw error;
    }
  }

  /**
   * Shutdown the market signal processor gracefully
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down market signal processor...');

      // Shutdown all components
      await Promise.all([
        this.kafkaPublisher.shutdown(),
        this.rateLimiter.shutdown(),
        this.observability.shutdown(),
      ]);

      this.isInitialized = false;
      this.logger.info('✅ Market signal processor shutdown successfully');
    } catch (error: any) {
      this.logger.error('❌ Error during market signal processor shutdown', error);
      throw error;
    }
  }

  /**
   * Express middleware for request processing
   */
  middleware() {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();

      // Add request ID to response headers
      res.setHeader('X-Request-ID', requestId);

      // Start operation timing
      this.observability.startOperation(requestId);

      // Add request context to response locals
      res.locals.requestId = requestId;
      res.locals.startTime = Date.now();

      // Continue to next middleware
      next();
    };
  }

  /**
   * Process a single market signal
   */
  async processSignal(signal: RawMarketSignal, options?: {
    skipEnrichment?: boolean;
    skipPublishing?: boolean;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<ProcessingResult<NormalizedMarketSignal>> {
    if (!this.isInitialized) {
      throw new Error('Market signal processor not initialized');
    }

    const requestId = uuidv4();
    const startTime = Date.now();

    const context: ProcessingContext = {
      signalId: requestId,
      startTime: new Date(startTime),
      errors: [],
      warnings: [],
      metadata: {},
    };

    try {
      this.observability.startOperation(`signal:${requestId}`);

      // Step 1: Validation
      const validationStart = Date.now();
      const validationResult = await this.validator.validateSignal(signal);
      const validationTime = Date.now() - validationStart;

      if (!validationResult.success) {
        this.observability.recordValidationError(requestId,
          validationResult.errors.map(e => e.message).join(', '));

        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
          processingTime: Date.now() - startTime,
          metadata: { validationErrors: validationResult.errors },
        };
      }

      this.observability.log({
        level: 'info',
        operation: 'validation',
        duration: validationTime,
        status: 'success',
        requestId,
        signalId: signal.id || 'unknown',
        exchange: signal.exchange,
        symbol: signal.symbol,
        signalType: signal.signalType,
      });

      // Step 2: Rate limiting check
      const rateLimitKey = RateLimitKeyGenerator.perExchangeSymbol(signal.exchange, signal.symbol);
      const rateLimitResult = await this.rateLimiter.checkRateLimit(rateLimitKey);

      if (!rateLimitResult.allowed) {
        this.observability.recordRateLimitHit(rateLimitKey, rateLimitResult.totalRequests, this.config.processing.rateLimiting.defaultWindowMs);

        return {
          success: false,
          error: `Rate limit exceeded for ${signal.exchange}:${signal.symbol}`,
          processingTime: Date.now() - startTime,
          metadata: {
            rateLimitKey,
            limit: rateLimitResult.totalRequests,
            resetTime: rateLimitResult.resetTime,
          },
        };
      }

      // Step 3: Enrichment (if enabled)
      let enrichedSignal: EnrichedMarketSignal | null = null;

      if (!options?.skipEnrichment && this.config.processing.enrichment.enabled) {
        const enrichmentStart = Date.now();
        enrichedSignal = await this.enrichmentEngine.enrichSignal(
          signal,
          context,
          this.config.processing.enrichment as any
        );
        const enrichmentTime = Date.now() - enrichmentStart;

        this.observability.log({
          level: 'info',
          operation: 'enrichment',
          duration: enrichmentTime,
          status: 'success',
          requestId,
          signalId: signal.id || 'unknown',
          metadata: {
            confidence: enrichedSignal.confidence,
            momentumScore: enrichedSignal.momentum.momentumScore,
          },
        });
      } else {
        // Create basic enriched signal
        enrichedSignal = {
          ...signal,
          enrichedAt: new Date(),
          enrichmentVersion: '1.0.0',
          processingLatency: 0,
          confidence: 1.0,
          momentum: {
            priceMomentum: 0,
            volumeMomentum: 0,
            priceVelocity: 0,
            volumeVelocity: 0,
            acceleration: 0,
            momentumScore: 0,
            trendStrength: 0,
            trendDirection: 'sideways',
          },
        };
      }

      // Step 4: Normalization
      const normalizedSignal = SignalNormalizer.normalizeForKafka(enrichedSignal);

      // Step 5: Publishing (if enabled)
      if (!options?.skipPublishing && this.config.processing.kafka.enabled) {
        const publishStart = Date.now();
        await this.kafkaPublisher.publishSignal(normalizedSignal, context);
        const publishTime = Date.now() - publishStart;

        this.observability.log({
          level: 'info',
          operation: 'publishing',
          duration: publishTime,
          status: 'success',
          requestId,
          signalId: normalizedSignal.id || 'unknown',
          metadata: {
            topic: this.config.processing.kafka.topic,
            partitionKey: normalizedSignal.exchange,
          },
        });
      }

      // Record processing metrics
      const totalTime = Date.now() - startTime;
      this.observability.recordSignalProcessing(
        requestId,
        1,
        totalTime,
        signal.exchange,
        signal.signalType,
        signal.assetType
      );

      // Complete operation timing
      this.observability.endOperation(`signal:${requestId}`, 'success');

      return {
        success: true,
        data: normalizedSignal,
        processingTime: totalTime,
        metadata: {
          validationTime,
          enrichmentTime: enrichedSignal.processingLatency,
          publishingTime: context.metadata.kafkaLatency,
          confidence: enrichedSignal.confidence,
        },
      };

    } catch (error: any) {
      const totalTime = Date.now() - startTime;

      // Record error
      this.observability.endOperation(`signal:${requestId}`, 'error');

      if (error.message.includes('enrichment')) {
        this.observability.recordEnrichmentError(requestId, error.message);
      } else if (error.message.includes('publishing') || error.message.includes('kafka')) {
        this.observability.recordPublishingError(requestId, error.message);
      } else {
        this.observability.recordValidationError(requestId, error.message);
      }

      return {
        success: false,
        error: error.message || 'Unknown processing error',
        processingTime: totalTime,
        metadata: { errorType: error.name, stack: error.stack },
      };
    }
  }

  /**
   * Process a batch of market signals
   */
  async processBatch(signals: RawMarketSignal[], options?: {
    skipEnrichment?: boolean;
    skipPublishing?: boolean;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<BatchProcessingResult> {
    if (!this.isInitialized) {
      throw new Error('Market signal processor not initialized');
    }

    const batchId = uuidv4();
    const startTime = Date.now();

    this.logger.info('Processing signal batch', {
      batchId,
      signalCount: signals.length,
      priority: options?.priority || 'normal',
    });

    const context: ProcessingContext = {
      signalId: batchId,
      startTime: new Date(startTime),
      errors: [],
      warnings: [],
      metadata: { batchSize: signals.length },
    };

    try {
      // Validate batch
      const validationStart = Date.now();
      const validationResult = await this.validator.validateBatch({ signals, batchId });
      const validationTime = Date.now() - validationStart;

      if (!validationResult.success) {
        return {
          batchId,
          totalSignals: signals.length,
          processedSignals: 0,
          failedSignals: signals.length,
          processingTime: Date.now() - startTime,
          errors: validationResult.errors.map(error => ({
            signalId: 'batch',
            error: `${error.field}: ${error.message}`,
          })),
          warnings: [],
        };
      }

      // Check rate limits for the batch
      const rateLimitKeys = [
        RateLimitKeyGenerator.perExchange(signals[0]?.exchange || 'unknown'),
        ...signals.map(s => RateLimitKeyGenerator.perExchangeSymbol(s.exchange, s.symbol)),
      ];

      const rateLimitResult = await this.rateLimiter.checkMultipleRateLimits(rateLimitKeys);

      if (!rateLimitResult.allowed) {
        return {
          batchId,
          totalSignals: signals.length,
          processedSignals: 0,
          failedSignals: signals.length,
          processingTime: Date.now() - startTime,
          errors: rateLimitResult.violations.map(v => ({
            signalId: 'batch',
            error: `Rate limit exceeded for ${v.key}: ${v.reason}`,
          })),
          warnings: [],
        };
      }

      // Process signals with concurrency limiting
      const processingPromises = signals.map(signal =>
        this.concurrencyLimiter(() => this.processSignal(signal, options))
      );

      const results = await Promise.allSettled(processingPromises);

      // Aggregate results
      const successfulResults = results.filter((result): result is PromiseFulfilledResult<ProcessingResult<NormalizedMarketSignal>> =>
        result.status === 'fulfilled' && result.value.success
      );

      const failedResults = results.filter((result): result is PromiseFulfilledResult<ProcessingResult> =>
        result.status === 'fulfilled' && !result.value.success
      );

      const rejectedResults = results.filter((result): result is PromiseRejectedResult =>
        result.status === 'rejected'
      );

      const totalProcessed = successfulResults.length;
      const totalFailed = failedResults.length + rejectedResults.length;

      // Collect errors
      const errors = [
        ...failedResults.map(result => ({
          signalId: result.value.metadata?.signalId || 'unknown',
          error: result.value.error || 'Processing failed',
        })),
        ...rejectedResults.map(result => ({
          signalId: 'unknown',
          error: result.reason?.message || 'Promise rejected',
        })),
      ];

      // Publish successful signals in batch
      if (successfulResults.length > 0 && !options?.skipPublishing && this.config.processing.kafka.enabled) {
        const normalizedSignals = successfulResults.map(result => result.value.data!);
        await this.kafkaPublisher.publishBatch(normalizedSignals, context);
      }

      const totalTime = Date.now() - startTime;

      // Record batch metrics
      this.observability.recordSignalProcessing(
        batchId,
        signals.length,
        totalTime,
        signals[0]?.exchange,
        signals[0]?.signalType,
        signals[0]?.assetType
      );

      return {
        batchId,
        totalSignals: signals.length,
        processedSignals: totalProcessed,
        failedSignals: totalFailed,
        processingTime: totalTime,
        errors,
        warnings: context.warnings,
      };

    } catch (error: any) {
      const totalTime = Date.now() - startTime;

      return {
        batchId,
        totalSignals: signals.length,
        processedSignals: 0,
        failedSignals: signals.length,
        processingTime: totalTime,
        errors: [{
          signalId: 'batch',
          error: error.message || 'Batch processing failed',
        }],
        warnings: [],
      };
    }
  }

  /**
   * Express route handler for processing signals
   */
  async handleProcessSignals(req: express.Request, res: express.Response): Promise<void> {
    const requestId = res.locals.requestId as string;

    try {
      // Parse request body
      const requestBody = ProcessSignalsRequestSchema.parse(req.body);

      // Validate request
      const validationResult = await this.validator.validateRequest(requestBody);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request format',
          details: validationResult.errors,
          requestId,
        });
        return;
      }

      // Check rate limits based on request characteristics
      const rateLimitKeys = [
        RateLimitKeyGenerator.perIP(req.ip || req.connection.remoteAddress || 'unknown'),
        ...requestBody.signals.map(s => RateLimitKeyGenerator.perExchangeSymbol(s.exchange, s.symbol)),
      ];

      const rateLimitResult = await this.rateLimiter.checkMultipleRateLimits(rateLimitKeys);

      if (!rateLimitResult.allowed) {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          details: rateLimitResult.violations,
          requestId,
          retryAfter: Math.max(...rateLimitResult.results.map(r => Math.ceil((r.resetTime - Date.now()) / 1000))),
        });
        return;
      }

      // Process signals based on count
      const options: any = {};
      if (requestBody.options?.skipEnrichment !== undefined) {
        options.skipEnrichment = requestBody.options.skipEnrichment;
      }
      if (requestBody.options?.skipPublishing !== undefined) {
        options.skipPublishing = requestBody.options.skipPublishing;
      }
      if (requestBody.options?.priority !== undefined) {
        options.priority = requestBody.options.priority;
      }

      if (requestBody.signals.length === 1) {
        // Single signal processing
        const result = await this.processSignal(requestBody.signals[0] as RawMarketSignal, options);

        if (result.success) {
          res.status(200).json({
            success: true,
            data: result.data,
            processingTime: result.processingTime,
            metadata: result.metadata,
            requestId,
          });
        } else {
          res.status(422).json({
            success: false,
            error: result.error,
            processingTime: result.processingTime,
            metadata: result.metadata,
            requestId,
          });
        }
      } else {
        // Batch processing
        const result = await this.processBatch(requestBody.signals as RawMarketSignal[], options);

        res.status(200).json({
          success: result.failedSignals === 0,
          data: {
            batchId: result.batchId,
            processedSignals: result.processedSignals,
            failedSignals: result.failedSignals,
            processingTime: result.processingTime,
          },
          errors: result.errors,
          warnings: result.warnings,
          requestId,
        });
      }

    } catch (error: any) {
      this.logger.error('Request processing failed', error, { requestId });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        requestId,
      });
    }
  }

  /**
   * Get service health and metrics
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    uptime: number;
    version: string;
    components: {
      kafka: any;
      rateLimiter: any;
      observability: any;
    };
    metrics: any;
  }> {
    const kafkaHealth = this.kafkaPublisher.getHealth();
    const metrics = this.observability.getMetrics();

    // Determine overall health
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (metrics.errorRate > 0.1 || kafkaHealth.errorRate > 0.1) {
      status = 'degraded';
    }

    if (!kafkaHealth.connected || metrics.errorRate > 0.5) {
      status = 'unhealthy';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: process.uptime() * 1000,
      version: '1.0.0',
      components: {
        kafka: kafkaHealth,
        rateLimiter: { initialized: this.rateLimiter['isInitialized'] },
        observability: { initialized: this.observability['isInitialized'] },
      },
      metrics,
    };
  }

  /**
   * Get detailed metrics for monitoring
   */
  getMetrics() {
    return this.observability.getMetrics();
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(limit: number = 100) {
    return this.observability.getRecentLogs(limit);
  }

  /**
   * Get operation performance metrics
   */
  getOperationMetrics() {
    return this.observability.getOperationMetrics();
  }
}

/**
 * Express application factory for the market signal processor
 */
export class MarketSignalProcessorApp {
  private app: express.Application;
  private processor: MarketSignalProcessor;
  private logger: Logger;

  constructor(config: MarketSignalProcessorConfig) {
    this.logger = new Logger('MarketSignalProcessorApp');

    // Initialize processor first
    this.processor = new MarketSignalProcessor(config);

    // Create Express app with optimizations
    this.app = express();

    // Security middleware stack (Elon Musk level security)
    this.app.use(securityHeaders());
    this.app.use(corsConfig());
    this.app.use(require('compression')());

    // Enhanced body parsing with security
    this.app.use(express.json({
      limit: '10mb',
      strict: true,
      verify: (req, res, buf) => {
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID and timing middleware
    this.app.use(this.processor.middleware());

    // Authentication and authorization middleware
    this.app.use(requestLogging());

    // Set up routes with authentication
    this.setupRoutes();

    // Enhanced error handling with authentication error support
    this.app.use(authErrorHandler());

    // General error handling
    this.app.use((error: Error, req: any, res: any, next: any) => {
      this.logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id || 'unknown',
        userId: req.user?.id,
        path: req.path,
        method: req.method
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred',
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString()
        });
      }
    });

    // 404 handler with authentication context
    this.app.use('*', (req: any, res) => {
      this.logger.warn('Route not found', {
        path: req.originalUrl,
        method: req.method,
        requestId: req.id || 'unknown',
        userId: req.user?.id,
        ip: req.ip
      });

      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
        requestId: req.id || 'unknown',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.processor.getHealth();
        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(health);
      } catch (error: any) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date(),
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      try {
        const metrics = this.processor.getMetrics();
        res.json(metrics);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Logs endpoint for debugging
    this.app.get('/logs', (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 100;
        const logs = this.processor.getRecentLogs(limit);
        res.json({ logs, count: logs.length });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Main signal processing endpoint (requires authentication)
    this.app.post('/process-signals',
      authenticateToken,
      requireAuth(['user', 'premium', 'enterprise'], ['signals:process']),
      async (req, res) => {
        await this.processor.handleProcessSignals(req, res);
      }
    );

    // Batch processing endpoint (requires authentication)
    this.app.post('/process-batch',
      authenticateToken,
      requireAuth(['user', 'premium', 'enterprise'], ['signals:process']),
      async (req, res) => {
        await this.processor.handleProcessSignals(req, res);
      }
    );

    // Health check endpoint (public)
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.processor.getHealth();
        const statusCode = health.status === 'healthy' ? 200 :
                          health.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(health);
      } catch (error: any) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date(),
        });
      }
    });

    // Metrics endpoint (admin only)
    this.app.get('/metrics',
      authenticateToken,
      requireAuth(['admin'], ['metrics:read']),
      (req, res) => {
        try {
          const metrics = this.processor.getMetrics();
          res.json(metrics);
        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Logs endpoint (admin only)
    this.app.get('/logs',
      authenticateToken,
      requireAuth(['admin'], ['logs:read']),
      (req, res) => {
        try {
          const limit = parseInt(req.query.limit as string) || 100;
          const logs = this.processor.getRecentLogs(limit);
          res.json({ logs, count: logs.length });
        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      }
    );
  }

  /**
   * Start the Express server
   */
  async start(): Promise<void> {
    try {
      // Initialize the processor
      await this.processor.initialize();

      // Start the server
      const server = this.app.listen(this.processor['config'].port, () => {
        this.logger.info('🚀 Market signal processor server started', {
          port: this.processor['config'].port,
          environment: this.processor['config'].environment,
        });
      });

      // Graceful shutdown handling
      process.on('SIGTERM', async () => {
        this.logger.info('SIGTERM received, shutting down gracefully...');
        server.close(async () => {
          await this.processor.shutdown();
          process.exit(0);
        });
      });

      process.on('SIGINT', async () => {
        this.logger.info('SIGINT received, shutting down gracefully...');
        server.close(async () => {
          await this.processor.shutdown();
          process.exit(0);
        });
      });

    } catch (error: any) {
      this.logger.error('Failed to start market signal processor server', error);
      throw error;
    }
  }

  /**
   * Get the underlying Express app
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the processor instance
   */
  getProcessor(): MarketSignalProcessor {
    return this.processor;
  }
}
