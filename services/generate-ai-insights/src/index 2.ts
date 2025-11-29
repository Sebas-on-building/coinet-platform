/**
 * =========================================
 * GENERATE AI INSIGHTS SERVICE
 * =========================================
 * Divine world-class AI insights service for intelligent recommendations
 */

import express from 'express';
// import helmet from 'helmet';
// import compression from 'compression';
// import cors from 'cors';
import { Logger } from './utils/Logger';
import { AIInsightsEngine } from './engines/AIInsightsEngine';
import { DashboardIntegration } from './dashboard/DashboardIntegration';
import { RealTimeManager } from './realtime/RealTimeManager';
import { AIInsightsConfig, AIInsightsConfigSchema, InsightRequest, InsightRequestSchema, RecommendationType, RecommendationPriority, ImpactLevel } from './types';

/**
 * Default AI insights configuration
 */
const DEFAULT_CONFIG: AIInsightsConfig = {
  models: [
    {
      type: 'neural_network',
      parameters: {
        layers: [128, 64, 32, 16, 1],
        activation: 'relu',
        dropout: 0.2,
        learningRate: 0.001,
        optimizer: 'adam',
        loss: 'binary_crossentropy'
      },
      training: {
        epochs: 200,
        batchSize: 64,
        validationSplit: 0.25,
        earlyStopping: true,
        patience: 10,
        minDelta: 0.001
      },
      features: [
        'accuracy', 'latency', 'confidence', 'roi', 'signal_type',
        'market_volatility', 'user_risk_tolerance', 'time_of_day',
        'correlation_strength', 'feedback_score', 'implementation_success'
      ],
      target: 'recommendation_confidence',
      version: '2.0.0',
      lastTrained: new Date(),
      accuracy: 0.89,
      precision: 0.87,
      recall: 0.85,
      f1Score: 0.86
    },
    {
      type: 'gradient_boosting',
      parameters: {
        nEstimators: 500,
        learningRate: 0.05,
        maxDepth: 6,
        subsample: 0.8,
        minSamplesSplit: 10,
        minSamplesLeaf: 5
      },
      training: {
        validationSplit: 0.2,
        earlyStopping: true
      },
      features: [
        'accuracy', 'latency', 'confidence', 'roi', 'signal_type',
        'market_volatility', 'user_risk_tolerance', 'correlation_strength',
        'feedback_score', 'implementation_success', 'user_tier'
      ],
      target: 'recommendation_priority',
      version: '1.5.0',
      lastTrained: new Date(),
      accuracy: 0.91,
      precision: 0.89,
      recall: 0.88,
      f1Score: 0.88
    },
    {
      type: 'random_forest',
      parameters: {
        nEstimators: 200,
        maxDepth: 8,
        minSamplesSplit: 5,
        minSamplesLeaf: 3,
        maxFeatures: 'sqrt'
      },
      training: {
        validationSplit: 0.2
      },
      features: [
        'accuracy', 'latency', 'confidence', 'roi', 'signal_type',
        'market_volatility', 'correlation_strength', 'feedback_score'
      ],
      target: 'recommendation_impact',
      version: '1.2.0',
      lastTrained: new Date(),
      accuracy: 0.85,
      precision: 0.83,
      recall: 0.82,
      f1Score: 0.82
    },
    {
      type: 'ensemble_voting',
      parameters: {
        models: ['neural_network', 'gradient_boosting', 'random_forest'],
        voting: 'soft',
        weights: [0.4, 0.35, 0.25]
      },
      training: {
        validationSplit: 0.2,
        crossValidation: true,
        folds: 5
      },
      features: [
        'accuracy', 'latency', 'confidence', 'roi', 'signal_type',
        'market_volatility', 'user_risk_tolerance', 'time_of_day',
        'correlation_strength', 'feedback_score', 'implementation_success'
      ],
      target: 'final_recommendation_score',
      version: '1.0.0',
      lastTrained: new Date(),
      accuracy: 0.92,
      precision: 0.90,
      recall: 0.89,
      f1Score: 0.89
    }
  ],
  dataSources: [
    {
      id: 'alert_performance_db',
      name: 'Alert Performance Database',
      type: 'price',
      reliability: 0.95,
      latency: 50,
      coverage: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
      lastUpdated: new Date()
    },
    {
      id: 'user_feedback_db',
      name: 'User Feedback Database',
      type: 'social',
      reliability: 0.90,
      latency: 100,
      coverage: ['all_users'],
      lastUpdated: new Date()
    }
  ],
  analysis: {
    lookbackPeriod: 30,
    minSampleSize: 50,
    confidenceThreshold: 0.7,
    correlationThreshold: 0.5
  },
  recommendations: {
    maxPerRequest: 10,
    types: [RecommendationType.SIGNAL_WEIGHT, RecommendationType.NEW_DATA_SOURCE, RecommendationType.ALERT_PARAMETER, RecommendationType.TIME_WINDOW],
    priorities: [RecommendationPriority.CRITICAL, RecommendationPriority.HIGH, RecommendationPriority.MEDIUM, RecommendationPriority.LOW]
  },
  feedback: {
    enabled: true,
    dataRetention: 90,
    minFeedbackCount: 10,
    autoImplementation: {
      enabled: false,
      minConfidence: 0.8,
      maxRisk: ImpactLevel.MEDIUM
    },
    userConsent: {
      required: true,
      optOutEnabled: true
    }
  },
  caching: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 10000
  },
  performance: {
    maxConcurrentAnalyses: 5,
    timeout: 60000, // 1 minute
    retryAttempts: 3
  },
  realtime: {
    enabled: true,
    updateInterval: 30000, // 30 seconds
    maxConnections: 1000,
    heartbeatInterval: 60000 // 1 minute
  }
};

/**
 * Load configuration from environment or use defaults
 */
function loadConfig(): AIInsightsConfig {
  try {
    // Try to load from environment
    const envConfig: Partial<AIInsightsConfig> = {
      analysis: {
        lookbackPeriod: parseInt(process.env.INSIGHTS_LOOKBACK_PERIOD || '30'),
        minSampleSize: parseInt(process.env.INSIGHTS_MIN_SAMPLE_SIZE || '50'),
        confidenceThreshold: parseFloat(process.env.INSIGHTS_CONFIDENCE_THRESHOLD || '0.7'),
        correlationThreshold: parseFloat(process.env.INSIGHTS_CORRELATION_THRESHOLD || '0.5')
      },
  recommendations: {
    maxPerRequest: parseInt(process.env.INSIGHTS_MAX_RECOMMENDATIONS || '10'),
    types: [RecommendationType.SIGNAL_WEIGHT, RecommendationType.NEW_DATA_SOURCE, RecommendationType.ALERT_PARAMETER, RecommendationType.TIME_WINDOW],
    priorities: [RecommendationPriority.CRITICAL, RecommendationPriority.HIGH, RecommendationPriority.MEDIUM, RecommendationPriority.LOW]
  },
      caching: {
        enabled: process.env.INSIGHTS_CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.INSIGHTS_CACHE_TTL || '3600'),
        maxSize: parseInt(process.env.INSIGHTS_CACHE_MAX_SIZE || '10000')
      },
      performance: {
        maxConcurrentAnalyses: parseInt(process.env.INSIGHTS_MAX_CONCURRENT || '5'),
        timeout: parseInt(process.env.INSIGHTS_TIMEOUT || '60000'),
        retryAttempts: parseInt(process.env.INSIGHTS_RETRY_ATTEMPTS || '3')
      },
      realtime: {
        enabled: process.env.INSIGHTS_REALTIME_ENABLED !== 'false',
        updateInterval: parseInt(process.env.INSIGHTS_REALTIME_UPDATE_INTERVAL || '30000'),
        maxConnections: parseInt(process.env.INSIGHTS_REALTIME_MAX_CONNECTIONS || '1000'),
        heartbeatInterval: parseInt(process.env.INSIGHTS_REALTIME_HEARTBEAT || '60000')
      }
    };

    const config = { ...DEFAULT_CONFIG, ...envConfig };

    // Validate configuration
    const validationResult = AIInsightsConfigSchema.safeParse(config);
    if (!validationResult.success) {
      console.warn('Invalid AI insights configuration, using defaults:', validationResult.error.errors);
      return DEFAULT_CONFIG;
    }

    return validationResult.data;

  } catch (error) {
    console.warn('Failed to load AI insights configuration, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Generate AI Insights Service
 */
export class GenerateAIInsightsService {
  private logger: Logger;
  private config: AIInsightsConfig;
  private engine: AIInsightsEngine;
  private dashboard: DashboardIntegration;
  private realtime: RealTimeManager;
  private app?: express.Application;

  constructor(config?: Partial<AIInsightsConfig>) {
    this.logger = new Logger('GenerateAIInsightsService');
    this.config = config ? { ...DEFAULT_CONFIG, ...config } : loadConfig();
    this.engine = new AIInsightsEngine(this.config);
    this.dashboard = new DashboardIntegration();
    this.realtime = new RealTimeManager(this.config.realtime);
  }

  /**
   * Start the service
   */
  async start(port: number = 3001): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app = express();

        // Security middleware
        // this.app.use(helmet({
        //   contentSecurityPolicy: {
        //     directives: {
        //       defaultSrc: ["'self'"],
        //       styleSrc: ["'self'", "'unsafe-inline'"],
        //       scriptSrc: ["'self'"],
        //       imgSrc: ["'self'", "data:", "https:"],
        //     },
        //   },
        // }));

        // Compression middleware
        // this.app.use(compression());

        // CORS middleware
        // this.app.use(cors({
        //   origin: process.env.NODE_ENV === 'production'
        //     ? process.env.ALLOWED_ORIGINS?.split(',') || false
        //     : true,
        //   credentials: true
        // }));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Request logging middleware
        this.app.use((req, res, next) => {
          this.logger.http(`${req.method} ${req.path}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          next();
        });

        // Health check endpoint
        this.app.get('/health', this.handleHealthCheck.bind(this));

        // Generate insights endpoint
        this.app.post('/insights', this.handleGenerateInsights.bind(this));

        // Dashboard insights endpoint
        this.app.post('/dashboard-insights', this.handleGenerateDashboardInsights.bind(this));

        // Real-time WebSocket endpoint (would use Socket.IO or WebSocket library)
        this.app.get('/realtime/connect', this.handleRealTimeConnect.bind(this));

        // Configuration endpoint
        this.app.get('/config', this.handleGetConfig.bind(this));

        // Real-time stats endpoint
        this.app.get('/realtime/stats', this.handleRealTimeStats.bind(this));

        // Error handling middleware
        this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
          this.logger.error('Unhandled error', { error: error.message, stack: error.stack });

          res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred while processing your request.'
          });
        });

        // Start server
        const server = this.app.listen(port, () => {
          this.logger.info(`AI insights service started successfully`, { port, config: this.config });
          resolve();
        });

        server.on('error', (error: any) => {
          this.logger.error('Failed to start AI insights service', { error: error.message });
          reject(error);
        });

      } catch (error: any) {
        this.logger.error('Service initialization failed', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    if (this.app) {
      return new Promise((resolve) => {
        this.app = undefined;
        this.realtime.cleanup();
        this.logger.info('AI insights service stopped');
        resolve();
      });
    }
  }

  /**
   * Handle generate insights request
   */
  private async handleGenerateInsights(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.http('Received insights generation request', {
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length')
      });

      // Validate request body
      const validationResult = InsightRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        this.logger.warn('Invalid insights request', { errors: validationResult.error.errors });

        res.status(400).json({
          success: false,
          error: 'Invalid request format',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })),
          processingTime: Date.now() - startTime
        });
        return;
      }

      const request: InsightRequest = validationResult.data;

      // Generate insights
      const result = await this.engine.generateInsights(request);

      // Send real-time updates for new insights
      if (result.success && this.config.realtime.enabled && request.userId) {
        for (const recommendation of result.recommendations) {
          this.realtime.sendRecommendation(recommendation, request.userId);
        }
      }

      // Format response
      const response = {
        success: result.success,
        recommendations: result.recommendations,
        summary: result.summary,
        correlations: result.correlations,
        performance: result.performance,
        processingTime: result.processingTime
      };

      // Set appropriate status code
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(response);

      this.logger.http('Insights generation completed', {
        success: result.success,
        recommendationCount: result.recommendations.length,
        processingTime: result.processingTime
      });

    } catch (error: any) {
      this.logger.error('Insights generation request failed', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while generating insights.',
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Handle generate dashboard insights request
   */
  private async handleGenerateDashboardInsights(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate request body
      const validationResult = InsightRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request format',
          details: validationResult.error.errors
        });
        return;
      }

      const request: InsightRequest = validationResult.data;

      // Generate insights
      const insightResult = await this.engine.generateInsights(request);

      // Convert to dashboard format
      const dashboardInsights = this.dashboard.generateDashboardInsights(insightResult);

      res.json({
        success: true,
        insights: dashboardInsights,
        processingTime: Date.now() - startTime
      });

    } catch (error: any) {
      this.logger.error('Dashboard insights request failed', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while generating dashboard insights.'
      });
    }
  }

  /**
   * Handle health check request
   */
  private async handleHealthCheck(req: express.Request, res: express.Response): Promise<void> {
    try {
      const engineHealth = await this.engine.healthCheck();

      const health = {
        status: engineHealth.status,
        timestamp: new Date().toISOString(),
        service: 'ai-insights',
        version: '1.0.0',
        details: engineHealth.details
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error: any) {
      this.logger.error('Health check failed', { error: error.message });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  /**
   * Handle real-time connection request
   */
  private async handleRealTimeConnect(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const subscriptions = (req.query.subscriptions as string)?.split(',') || [];

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId is required'
        });
        return;
      }

      const connectionId = this.realtime.addConnection({
        userId,
        subscriptions: new Set(subscriptions),
        metadata: { source: 'http' }
      });

      res.json({
        success: true,
        connectionId,
        subscriptions: Array.from(subscriptions)
      });

    } catch (error: any) {
      this.logger.error('Real-time connection failed', { error: error.message });

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle real-time stats request
   */
  private async handleRealTimeStats(req: express.Request, res: express.Response): Promise<void> {
    try {
      const stats = this.realtime.getStats();
      const health = this.realtime.healthCheck();

      res.json({
        success: true,
        stats,
        health: health.details,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      this.logger.error('Real-time stats failed', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve real-time stats'
      });
    }
  }

  /**
   * Handle get configuration request
   */
  private async handleGetConfig(req: express.Request, res: express.Response): Promise<void> {
    try {
      // Return sanitized configuration
      const configResponse = {
        analysis: this.config.analysis,
        recommendations: this.config.recommendations,
        feedback: {
          enabled: this.config.feedback.enabled,
          dataRetention: this.config.feedback.dataRetention
        },
        performance: {
          maxConcurrentAnalyses: this.config.performance.maxConcurrentAnalyses,
          timeout: this.config.performance.timeout
        },
        realtime: {
          enabled: this.config.realtime.enabled,
          updateInterval: this.config.realtime.updateInterval
        }
      };

      res.json({
        success: true,
        config: configResponse
      });

    } catch (error: any) {
      this.logger.error('Get config failed', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration'
      });
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): AIInsightsConfig {
    return this.config;
  }

  /**
   * Get service health
   */
  async getHealth(): Promise<any> {
    try {
      const engineHealth = await this.engine.healthCheck();

      return {
        status: engineHealth.status,
        timestamp: new Date().toISOString(),
        service: 'ai-insights',
        version: '1.0.0',
        details: engineHealth.details
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

/**
 * Serverless function handler for AWS Lambda or similar
 */
export async function handler(event: any, context: any): Promise<any> {
  const logger = new Logger('AIInsightsLambda');
  const config = loadConfig();
  const insightsEngine = new AIInsightsEngine(config);

  try {
    logger.info('Processing AI insights request', { event });

    // Handle different event sources
    let body: any;

    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else if (event.insightsRequest) {
      body = event.insightsRequest;
    } else {
      body = event;
    }

    // Validate request
    const validationResult = InsightRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid request format',
          details: validationResult.error.errors
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    // Generate insights
    const result = await insightsEngine.generateInsights(validationResult.data);

    return {
      statusCode: result.success ? 200 : 400,
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };

  } catch (error: any) {
    logger.error('Lambda handler failed', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while generating insights.'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
}

/**
 * Main function for running as standalone service
 */
async function main() {
  const logger = new Logger('AIInsightsService');

  try {
    const port = parseInt(process.env.PORT || '3001');
    const service = new GenerateAIInsightsService();

    logger.info('Starting AI insights service...');
    await service.start(port);

    logger.info(`AI insights service is running on port ${port}`);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await service.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await service.stop();
      process.exit(0);
    });

  } catch (error: any) {
    logger.error('Failed to start AI insights service', { error: error.message });
    process.exit(1);
  }
}

// Run service if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default GenerateAIInsightsService;
