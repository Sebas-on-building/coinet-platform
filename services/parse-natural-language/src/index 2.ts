/**
 * =========================================
 * PARSE NATURAL LANGUAGE SERVICE
 * =========================================
 * Divine world-class NLP service for parsing natural language alert definitions
 */

import express from 'express';
// import helmet from 'helmet';
// import compression from 'compression';
// import cors from 'cors';
import { Logger } from '@/utils/Logger';
import { NLPHandler, createNLPMiddleware } from '@/handlers/NLPHandler';
import { NLPConfig, NLPConfigSchema } from '@/types';

/**
 * Default NLP configuration
 */
const DEFAULT_CONFIG: NLPConfig = {
  providers: [
    {
      name: 'openai',
      model: 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY
    },
    {
      name: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      apiKey: process.env.ANTHROPIC_API_KEY
    },
    {
      name: 'google',
      model: 'gemini-pro',
      apiKey: process.env.GOOGLE_AI_API_KEY
    }
  ],
  fallbackProvider: 'openai',
  caching: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 10000
  },
  validation: {
    strictMode: false,
    maxRetries: 3,
    timeout: 30000 // 30 seconds
  },
  performance: {
    maxConcurrentRequests: 10,
    requestTimeout: 60000, // 1 minute
    retryDelay: 1000 // 1 second
  }
};

/**
 * Load configuration from environment or use defaults
 */
function loadConfig(): NLPConfig {
  try {
    // Try to load from environment
    const envConfig: Partial<NLPConfig> = {
      providers: DEFAULT_CONFIG.providers.map(provider => ({
        ...provider,
        apiKey: process.env[`${provider.name.toUpperCase()}_API_KEY`] || provider.apiKey
      })),
      caching: {
        enabled: process.env.NLP_CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.NLP_CACHE_TTL || '3600'),
        maxSize: parseInt(process.env.NLP_CACHE_MAX_SIZE || '10000')
      },
      validation: {
        strictMode: process.env.NLP_STRICT_MODE === 'true',
        maxRetries: parseInt(process.env.NLP_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.NLP_TIMEOUT || '30000')
      },
      performance: {
        maxConcurrentRequests: parseInt(process.env.NLP_MAX_CONCURRENT || '10'),
        requestTimeout: parseInt(process.env.NLP_REQUEST_TIMEOUT || '60000'),
        retryDelay: parseInt(process.env.NLP_RETRY_DELAY || '1000')
      }
    };

    const config = { ...DEFAULT_CONFIG, ...envConfig };

    // Validate configuration
    const validationResult = NLPConfigSchema.safeParse(config);
    if (!validationResult.success) {
      console.warn('Invalid NLP configuration, using defaults:', validationResult.error.errors);
      return DEFAULT_CONFIG;
    }

    return validationResult.data;

  } catch (error) {
    console.warn('Failed to load NLP configuration, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Parse Natural Language Service
 */
export class ParseNaturalLanguageService {
  private logger: Logger;
  private config: NLPConfig;
  private handler: NLPHandler;
  private app?: express.Application;

  constructor(config?: Partial<NLPConfig>) {
    this.logger = new Logger('ParseNaturalLanguageService');
    this.config = config ? { ...DEFAULT_CONFIG, ...config } : loadConfig();
    this.handler = new NLPHandler(this.config);
  }

  /**
   * Start the service
   */
  async start(port: number = 3000): Promise<void> {
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
        this.app.get('/health', this.handler.handleHealthCheck.bind(this.handler));

        // NLP parsing endpoint
        this.app.post('/parse', this.handler.handleParseRequest.bind(this.handler));

        // Configuration endpoint
        this.app.get('/config', this.handler.handleGetConfig.bind(this.handler));

        // Error handling middleware
        this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
          this.logger.error('Unhandled error', { error: error.message, stack: error.stack });

          res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred'
          });
        });

        // Start server
        const server = this.app.listen(port, () => {
          this.logger.info(`NLP service started successfully`, { port, config: this.config });
          resolve();
        });

        server.on('error', (error: any) => {
          this.logger.error('Failed to start NLP service', { error: error.message });
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
        this.logger.info('NLP service stopped');
        resolve();
      });
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): NLPConfig {
    return this.config;
  }

  /**
   * Get service health
   */
  async getHealth(): Promise<any> {
    return this.handler.handleHealthCheck.bind(this.handler)(null as any, null as any);
  }
}

/**
 * Serverless function handler for AWS Lambda or similar
 */
export async function handler(event: any, context: any): Promise<any> {
  const logger = new Logger('NLPLambda');
  const config = loadConfig();
  const nlpHandler = new NLPHandler(config);

  try {
    logger.info('Processing NLP request', { event });

    // Handle different event sources
    let body: any;

    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else if (event.text) {
      body = { text: event.text };
    } else {
      body = event;
    }

    // Create mock request/response objects
    const mockReq = {
      body,
      get: (header: string) => event.headers?.[header.toLowerCase()]
    } as any;

    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => ({
          statusCode: code,
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      })
    } as any;

    await nlpHandler.handleParseRequest(mockReq, mockRes);

  } catch (error: any) {
    logger.error('Lambda handler failed', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.'
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
  const logger = new Logger('NLPService');

  try {
    const port = parseInt(process.env.PORT || '3000');
    const service = new ParseNaturalLanguageService();

    logger.info('Starting NLP service...');
    await service.start(port);

    logger.info(`NLP service is running on port ${port}`);

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
    logger.error('Failed to start NLP service', { error: error.message });
    process.exit(1);
  }
}

// Run service if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default ParseNaturalLanguageService;
