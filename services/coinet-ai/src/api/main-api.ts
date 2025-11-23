/**
 * 🌐 COINET AI MAIN API SERVICE
 * 
 * Professional REST API that exposes our divine AI capabilities to the world.
 * This is the bridge between our Core AI Engine and external applications.
 * 
 * DIVINE ENDPOINTS:
 * - POST /api/v1/analyze - Generate crypto analysis brief
 * - GET /api/v1/health - Service health check
 * - GET /api/v1/status - Detailed service status
 * 
 * FEATURES:
 * - Request validation and sanitization
 * - Rate limiting and authentication ready
 * - Comprehensive error handling
 * - Performance monitoring
 * - CORS support for web clients
 * - Professional response formatting
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger, aiLogger } from '../utils/logger';
import { InputProcessor } from '../processors/input-processor';
import { BriefGenerator } from '../generators/brief-generator';
import { 
  UserInput, 
  CoinetBrief, 
  ApiResponse, 
  validateUserInput,
  ValidationError 
} from '../types/coinet-brief';
import { v4 as uuidv4 } from 'uuid';
import NodeCache from 'node-cache';

export interface ApiServiceConfig {
  port: number;
  host: string;
  enableCors: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number; // minutes
  requestTimeout: number; // milliseconds
}

export class CoinetApiService {
  private app: express.Application;
  private inputProcessor: InputProcessor;
  private briefGenerator: BriefGenerator;
  private requestCache: NodeCache;
  private config: ApiServiceConfig;

  // Request statistics
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    uptime: Date.now()
  };

  constructor(config: Partial<ApiServiceConfig> = {}) {
    this.config = {
      port: 3001,
      host: '0.0.0.0',
      enableCors: true,
      rateLimitRequests: 100,
      rateLimitWindow: 15, // 15 minutes
      requestTimeout: 30000, // 30 seconds
      ...config
    };

    this.app = express();
    this.inputProcessor = new InputProcessor();
    this.briefGenerator = new BriefGenerator();
    this.requestCache = new NodeCache({ 
      stdTTL: 300, // 5 minutes cache
      checkperiod: 60 // Check for expired keys every minute
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();

    logger.info('🌐 CoinetApiService initialized with divine endpoints');
  }

  /**
   * 🛡️ SETUP MIDDLEWARE
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
    }));

    // CORS support
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        credentials: true
      }));
    }

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request timeout
    this.app.use((req, res, next) => {
      req.setTimeout(this.config.requestTimeout);
      res.setTimeout(this.config.requestTimeout);
      next();
    });

    // Request ID and logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);

      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        aiLogger.api(req.method, req.path, res.statusCode, duration, {
          requestId,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });

        // Update statistics
        this.updateStats(res.statusCode, duration);
      });

      next();
    });

    // Rate limiting simulation (basic implementation)
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || 'unknown';
      const windowKey = `rate_limit_${clientId}_${Math.floor(Date.now() / (this.config.rateLimitWindow * 60 * 1000))}`;
      
      const requestCount = (this.requestCache.get(windowKey) as number) || 0;
      
      if (requestCount >= this.config.rateLimitRequests) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${this.config.rateLimitRequests} requests per ${this.config.rateLimitWindow} minutes.`
          },
          metadata: {
            requestId: req.headers['x-request-id'] as string,
            processingTime: 0,
            version: '1.0.0',
            rateLimit: {
              remaining: 0,
              resetAt: Math.floor(Date.now() / (this.config.rateLimitWindow * 60 * 1000) + 1) * this.config.rateLimitWindow * 60 * 1000
            }
          }
        });
      }

      this.requestCache.set(windowKey, requestCount + 1, this.config.rateLimitWindow * 60);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.rateLimitRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.rateLimitRequests - requestCount - 1));
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / (this.config.rateLimitWindow * 60 * 1000) + 1) * this.config.rateLimitWindow * 60 * 1000);

      next();
    });
  }

  /**
   * 🛣️ SETUP ROUTES
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/api/v1/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'coinet-ai-api'
      });
    });

    // Detailed status endpoint
    this.app.get('/api/v1/status', (req: Request, res: Response) => {
      const uptime = Date.now() - this.stats.uptime;
      res.json({
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'coinet-ai-api',
        uptime: {
          milliseconds: uptime,
          human: this.formatUptime(uptime)
        },
        statistics: {
          ...this.stats,
          cacheStats: {
            totalKeys: this.requestCache.keys().length,
            ...this.requestCache.getStats()
          }
        },
        capabilities: {
          inputTypes: ['ticker', 'url', 'thread', 'question', 'news'],
          analysisDepths: ['quick', 'standard', 'deep'],
          aiEngines: ['psychology', 'oracle', 'market-analysis'],
          supportedSymbols: ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'MATIC', 'AVAX', 'UNI', 'AAVE']
        }
      });
    });

    // Main analysis endpoint
    this.app.post('/api/v1/analyze', async (req: Request, res: Response) => {
      await this.handleAnalysisRequest(req, res);
    });

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'Coinet AI API',
        version: '1.0.0',
        description: 'Divine AI-powered cryptocurrency analysis engine',
        endpoints: {
          analyze: 'POST /api/v1/analyze',
          health: 'GET /api/v1/health',
          status: 'GET /api/v1/status'
        },
        documentation: 'https://docs.coinet.ai/api'
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: `Endpoint ${req.method} ${req.originalUrl} not found`
        },
        metadata: {
          requestId: req.headers['x-request-id'] as string,
          processingTime: 0,
          version: '1.0.0'
        }
      });
    });
  }

  /**
   * 🎯 MAIN ANALYSIS REQUEST HANDLER
   */
  private async handleAnalysisRequest(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Check for cached response
      const cacheKey = this.generateCacheKey(req.body);
      const cachedResponse = this.requestCache.get(cacheKey);
      
      if (cachedResponse) {
        logger.info(`🎯 Returning cached analysis [${requestId}]`);
        res.json({
          ...cachedResponse,
          metadata: {
            ...(cachedResponse as any).metadata,
            requestId,
            cached: true,
            processingTime: Date.now() - startTime
          }
        });
        return;
      }

      // Validate request body
      const validatedInput = validateUserInput(req.body);

      logger.info(`🎯 Processing analysis request [${requestId}]: "${validatedInput.content.substring(0, 100)}..."`);

      // Process input through our divine AI engine
      const processedInput = await this.inputProcessor.processInput(validatedInput);
      
      // Generate brief
      const briefOptions = {
        analysisDepth: validatedInput.context?.analysisDepth || 'standard',
        includePsychology: true,
        includeOracle: true
      };

      const brief = await this.briefGenerator.generateBrief(processedInput, briefOptions);

      // Prepare API response
      const apiResponse: ApiResponse = {
        success: true,
        data: brief,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          version: '1.0.0',
          rateLimit: {
            remaining: parseInt(res.getHeader('X-RateLimit-Remaining') as string) || 0,
            resetAt: parseInt(res.getHeader('X-RateLimit-Reset') as string) || 0
          }
        }
      };

      // Cache successful response
      this.requestCache.set(cacheKey, apiResponse, 300); // 5 minutes

      logger.info(`✅ Analysis completed successfully [${requestId}] in ${Date.now() - startTime}ms - ${brief.symbol} (${brief.recommendation}, ${Math.round(brief.confidence * 100)}% confidence)`);

      res.json(apiResponse);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof ValidationError) {
        logger.warn(`⚠️ Validation error [${requestId}]:`, error.validationErrors);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request format',
            details: error.validationErrors.errors
          },
          metadata: {
            requestId,
            processingTime,
            version: '1.0.0'
          }
        });
        return;
      }

      logger.error(`❌ Analysis request failed [${requestId}]:`, error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: 'Failed to generate analysis. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        metadata: {
          requestId,
          processingTime,
          version: '1.0.0'
        }
      });
    }
  }

  /**
   * 🚨 ERROR HANDLING
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string;
      
      logger.error(`🚨 Unhandled error [${requestId}]:`, error);

      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        metadata: {
          requestId,
          processingTime: 0,
          version: '1.0.0'
        }
      });
    });
  }

  /**
   * 🚀 START SERVER
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.config.port, this.config.host, () => {
          logger.info(`🚀 Coinet AI API Server running on http://${this.config.host}:${this.config.port}`);
          logger.info(`🌟 API Endpoints available:`);
          logger.info(`   POST http://${this.config.host}:${this.config.port}/api/v1/analyze`);
          logger.info(`   GET  http://${this.config.host}:${this.config.port}/api/v1/health`);
          logger.info(`   GET  http://${this.config.host}:${this.config.port}/api/v1/status`);
          resolve();
        });

        server.on('error', (error) => {
          logger.error('❌ Failed to start API server:', error);
          reject(error);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
          logger.info('🛑 Received SIGTERM, shutting down gracefully...');
          server.close(() => {
            logger.info('✅ API server closed successfully');
            process.exit(0);
          });
        });

      } catch (error) {
        logger.error('❌ Failed to start API server:', error);
        reject(error);
      }
    });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private generateCacheKey(input: any): string {
    const normalizedInput = {
      content: input.content?.trim().toLowerCase(),
      type: input.type,
      context: input.context
    };
    return `analysis_${Buffer.from(JSON.stringify(normalizedInput)).toString('base64')}`;
  }

  private updateStats(statusCode: number, responseTime: number): void {
    this.stats.totalRequests++;
    
    if (statusCode < 400) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Calculate rolling average response time
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
      this.stats.totalRequests
    );
  }

  private formatUptime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get current server statistics
   */
  public getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.uptime
    };
  }

  /**
   * Clear request cache
   */
  public clearCache(): void {
    this.requestCache.flushAll();
    logger.info('🧹 Request cache cleared');
  }
}
