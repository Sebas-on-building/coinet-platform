// =============================================================================
// COINET AI CONTEXT SERVICE - MAIN ENTRY POINT
// Complete AI context intelligence and prompt generation service
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { ContextAssembler, DEFAULT_CONTEXT_ASSEMBLER_CONFIG, _AssembledContext } from './core/contextAssembler';
import { PromptBuilder, DEFAULT_PROMPT_OPTIONS, _GeneratedPrompt } from './core/promptBuilder';

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

const ServiceConfigSchema = z.object({
  port: z.number().default(8002),
  host: z.string().default('0.0.0.0'),
  cors: z.object({
    origin: z.array(z.string()).default(['http://localhost:3000', 'http://localhost:3001']),
    credentials: z.boolean().default(true),
  }).default({}),
  rateLimiting: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    max: z.number().default(100), // 100 requests per window
  }).default({}),
  auth: z.object({
    enabled: z.boolean().default(false),
    apiKeyHeader: z.string().default('x-api-key'),
    validApiKeys: z.array(z.string()).default([]),
  }).default({}),
});

type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

// =============================================================================
// REQUEST/RESPONSE SCHEMAS
// =============================================================================

const AssembleContextRequestSchema = z.object({
  symbol: z.string().min(1).max(20),
  timeframe: z.enum(['5m', '15m', '1h', '4h', '1d']).default('1h'),
  options: z.object({
    useCache: z.boolean().default(true),
    maxAge: z.number().optional(), // Override cache age in milliseconds
  }).default({}),
});

const GeneratePromptRequestSchema = z.object({
  symbol: z.string().min(1).max(20),
  timeframe: z.enum(['5m', '15m', '1h', '4h', '1d']).default('1h'),
  template: z.string().min(1),
  options: z.object({
    focus: z.array(z.string()).optional(),
    timeHorizon: z.enum(['short_term', 'medium_term', 'long_term']).optional(),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    analysisDepth: z.enum(['quick', 'standard', 'comprehensive']).optional(),
    includeDisclaimer: z.boolean().optional(),
    customInstructions: z.string().optional(),
    outputFormat: z.enum(['text', 'json', 'markdown']).optional(),
  }).default({}),
  context: z.object({
    useCache: z.boolean().default(true),
    maxAge: z.number().optional(),
  }).default({}),
});

const AnalyzeRequestSchema = z.object({
  symbol: z.string().min(1).max(20),
  analysisType: z.enum(['comprehensive', 'trading_signals', 'sentiment_analysis', 'risk_assessment']),
  timeframe: z.enum(['5m', '15m', '1h', '4h', '1d']).default('1h'),
  options: z.object({
    timeHorizon: z.enum(['short_term', 'medium_term', 'long_term']).default('medium_term'),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
    analysisDepth: z.enum(['quick', 'standard', 'comprehensive']).default('standard'),
    includeDisclaimer: z.boolean().default(true),
    customInstructions: z.string().optional(),
    outputFormat: z.enum(['text', 'json', 'markdown']).default('text'),
  }).default({}),
});

// =============================================================================
// CONTEXT SERVICE CLASS
// =============================================================================

export class ContextService {
  private app: express.Application;
  private config: ServiceConfig;
  private contextAssembler: ContextAssembler;
  private promptBuilder: PromptBuilder;
  private server?: unknown;

  constructor(config: Partial<ServiceConfig> = {}) {
    this.config = ServiceConfigSchema.parse(config);
    this.app = express();
    this.promptBuilder = new PromptBuilder();
    
    // Initialize context assembler with mock providers for now
    this.contextAssembler = new ContextAssembler(
      DEFAULT_CONTEXT_ASSEMBLER_CONFIG,
      this.createMockProviders()
    );

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          // console.log(`🧠 Context Service running on ${this.config.host}:${this.config.port}`);
          // console.log(`📊 Available endpoints:`);
          // console.log(`   GET  /health - Health check`);
          // console.log(`   POST /context/assemble - Assemble context for symbol`);
          // console.log(`   POST /prompts/generate - Generate AI prompt`);
          // console.log(`   POST /analyze - Complete analysis with prompt`);
          // console.log(`   GET  /templates - List available prompt templates`);
          // console.log(`   GET  /stats - Service statistics`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          // console.log('🧠 Context Service stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // =============================================================================
  // PRIVATE SETUP METHODS
  // =============================================================================

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors(this.config.cors));
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, _res, next) => {
      // console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // Authentication middleware (if enabled)
    if (this.config.auth.enabled) {
      this.app.use((req, res, next) => {
        const apiKey = req.headers[this.config.auth.apiKeyHeader] as string;
        
        if (!apiKey || !this.config.auth.validApiKeys.includes(apiKey)) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or missing API key',
          });
        }
        
        next();
      });
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        service: 'context-service',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Readiness check endpoint
    this.app.get('/ready', (req, res) => {
      res.json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    });

    // Assemble context endpoint
    this.app.post('/context/assemble', async (req, res) => {
      try {
        const validatedRequest = AssembleContextRequestSchema.parse(req.body);
        
        const context = await this.contextAssembler.assembleContext(
          validatedRequest.symbol,
          validatedRequest.timeframe
        );

        res.json({
          success: true,
          data: {
            context,
            metadata: {
              symbol: validatedRequest.symbol,
              timeframe: validatedRequest.timeframe,
              assembledAt: new Date().toISOString(),
              completeness: context.completeness,
              importance: context.importance,
            },
          },
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Generate prompt endpoint
    this.app.post('/prompts/generate', async (req, res) => {
      try {
        const validatedRequest = GeneratePromptRequestSchema.parse(req.body);
        
        // Assemble context first
        const context = await this.contextAssembler.assembleContext(
          validatedRequest.symbol,
          validatedRequest.timeframe
        );

        // Generate prompt
        const promptOptions = {
          template: validatedRequest.template,
          ...DEFAULT_PROMPT_OPTIONS,
          ...validatedRequest.options,
        };

        const generatedPrompt = this.promptBuilder.generatePrompt(context, promptOptions);

        res.json({
          success: true,
          data: {
            prompt: generatedPrompt,
            metadata: {
              symbol: validatedRequest.symbol,
              timeframe: validatedRequest.timeframe,
              template: validatedRequest.template,
              generatedAt: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // Complete analysis endpoint
    this.app.post('/analyze', async (req, res) => {
      try {
        const validatedRequest = AnalyzeRequestSchema.parse(req.body);
        
        // Map analysis type to template
        const templateMap = {
          comprehensive: 'comprehensive_analysis',
          trading_signals: 'trading_signals',
          sentiment_analysis: 'sentiment_deep_dive',
          risk_assessment: 'risk_assessment',
        };

        const templateId = templateMap[validatedRequest.analysisType];
        
        // Assemble context
        const context = await this.contextAssembler.assembleContext(
          validatedRequest.symbol,
          validatedRequest.timeframe
        );

        // Generate prompt
        const promptOptions = {
          template: templateId,
          ...DEFAULT_PROMPT_OPTIONS,
          ...validatedRequest.options,
        };

        const generatedPrompt = this.promptBuilder.generatePrompt(context, promptOptions);

        res.json({
          success: true,
          data: {
            analysis: {
              symbol: validatedRequest.symbol,
              analysisType: validatedRequest.analysisType,
              timeframe: validatedRequest.timeframe,
              context,
              prompt: generatedPrompt,
            },
            metadata: {
              generatedAt: new Date().toISOString(),
              contextCompleteness: context.completeness,
              contextImportance: context.importance,
              estimatedTokens: generatedPrompt.metadata.estimatedTokens,
            },
          },
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    // List templates endpoint
    this.app.get('/templates', (req, res) => {
      try {
        const category = req.query.category as string;
        const templates = this.promptBuilder.getTemplatesByCategory(category as unknown as any);

        res.json({
          success: true,
          data: {
            templates: templates.map(t => ({
              id: t.id,
              name: t.name,
              description: t.description,
              category: t.category,
              requirements: {
                marketData: t.requiresMarketData,
                news: t.requiresNews,
                social: t.requiresSocial,
                onChain: t.requiresOnChain,
              },
              config: {
                maxTokens: t.maxTokens,
                temperature: t.temperature,
                topP: t.topP,
              },
            })),
            totalCount: templates.length,
            categories: Array.from(new Set(templates.map(t => t.category))),
          },
        });
      } catch (_error: unknown) {
        this.handleError(res, _error);
      }
    });

    // Service statistics endpoint
    this.app.get('/stats', (req, res) => {
      try {
        const assemblerStats = this.contextAssembler.getStats();
        const templateStats = {
          totalTemplates: this.promptBuilder.getTemplatesByCategory().length,
          templatesByCategory: this.promptBuilder.getTemplatesByCategory()
            .reduce((acc, template) => {
              acc[template.category] = (acc[template.category] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
        };

        res.json({
          success: true,
          data: {
            service: {
              uptime: process.uptime(),
              memoryUsage: process.memoryUsage(),
              pid: process.pid,
            },
            contextAssembler: assemblerStats,
            promptBuilder: templateStats,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (_error: unknown) {
        this.handleError(res, _error);
      }
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
      });
    });

    // Global error handler
    this.app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      // console.error('Unhandled error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private handleError(res: express.Response, error: unknown): void {
    // console.error('Request error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: (error as any).errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'An error occurred',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // =============================================================================
  // MOCK PROVIDERS (FOR DEVELOPMENT)
  // =============================================================================

  private createMockProviders() {
    return {
      market: {
        async getMarketData(symbol: string, _timeframe: string) {
          // Mock market data for development
          return {
            symbol,
            currentPrice: 45000 + Math.random() * 10000,
            priceChange24h: (Math.random() - 0.5) * 4000,
            priceChangePercent24h: (Math.random() - 0.5) * 10,
            volume24h: 1000000000 + Math.random() * 500000000,
            marketCap: 850000000000,
            high24h: 48000,
            low24h: 42000,
            technicalIndicators: {
              rsi: 30 + Math.random() * 40,
              macd: {
                value: Math.random() * 200 - 100,
                signal: Math.random() * 200 - 100,
                histogram: Math.random() * 100 - 50,
              },
              bollinger: {
                upper: 46000,
                middle: 44000,
                lower: 42000,
              },
              support: 42000,
              resistance: 48000,
            },
            orderBook: {
              bestBid: 44950,
              bestAsk: 45050,
              spread: 100,
              spreadPercent: 0.22,
            },
            timestamp: Date.now(),
          };
        },
        subscribeToUpdates: (_symbol: string, _callback: (_data: unknown) => void) => {},
      },
      news: {
        async getRecentNews(_symbol: string, _limit: number) {
          // Mock news data
          return Array.from({ length: Math.min(_limit, 3) }, (_, _i) => ({
            title: `${_symbol} Market Update ${_i + 1}`,
            content: `This is mock news content about ${_symbol} market conditions and recent developments.`,
            source: ['CoinDesk', 'CryptoPanic', 'CoinTelegraph'][_i % 3],
            publishedAt: Date.now() - (_i * 3600000), // Hours ago
            sentiment: {
              score: (Math.random() - 0.5) * 2,
              label: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as 'positive' | 'negative' | 'neutral',
              confidence: 0.5 + Math.random() * 0.5,
            },
            relevantSymbols: [_symbol],
            topics: ['market', 'trading', 'analysis'],
            importance: 0.3 + Math.random() * 0.7,
          }));
        },
        subscribeToNews: (_symbol: string, _callback: (_news: unknown) => void) => {},
      },
      social: {
        async getSocialMentions(_symbol: string, _limit: number) {
          // Mock social data
          return Array.from({ length: Math.min(_limit, 5) }, (_, _i) => ({
            platform: ['twitter', 'reddit', 'telegram', 'discord'][_i % 4] as 'twitter' | 'reddit' | 'telegram' | 'discord',
            content: `Mock social post about ${_symbol} #crypto #trading`,
            author: {
              username: `user_${_i + 1}`,
              followers: Math.floor(Math.random() * 100000),
              influence: Math.random(),
            },
            sentiment: {
              score: (Math.random() - 0.5) * 2,
              label: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as 'positive' | 'negative' | 'neutral',
              confidence: 0.5 + Math.random() * 0.5,
            },
            engagement: {
              likes: Math.floor(Math.random() * 1000),
              shares: Math.floor(Math.random() * 100),
              comments: Math.floor(Math.random() * 50),
            },
            symbols: [_symbol],
            timestamp: Date.now() - (_i * 1800000), // 30 minutes ago
          }));
        },
        subscribeToMentions: (_symbol: string, _callback: (_mention: unknown) => void) => {},
      },
      onChain: {
        async getOnChainMetrics(_symbol: string) {
          // Mock on-chain data
          return {
            symbol: _symbol,
            network: 'ethereum',
            metrics: {
              activeAddresses: Math.floor(Math.random() * 100000),
              transactionCount: Math.floor(Math.random() * 1000000),
              transactionVolume: Math.random() * 1000000000,
              averageTransactionValue: Math.random() * 10000,
              whaleActivity: {
                largeTransactions: Math.floor(Math.random() * 100),
                totalValue: Math.random() * 100000000,
              },
              networkHealth: {
                hashRate: Math.random() * 200000000,
                difficulty: Math.random() * 50000000000000,
                blockTime: 12 + Math.random() * 3,
              },
            },
            timestamp: Date.now(),
          };
        },
        subscribeToMetrics: (_symbol: string, _callback: (_metrics: unknown) => void) => {},
      },
    };
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  try {
    const config: Partial<ServiceConfig> = {
      port: parseInt(process.env.PORT || '8002'),
      host: process.env.HOST || '0.0.0.0',
    };

    const service = new ContextService(config);
    await service.start();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      // console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await service.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      // console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await service.stop();
      process.exit(0);
    });

  } catch (error) {
    // console.error('Failed to start Context Service:', error);
    process.exit(1);
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  main();
}

export default ContextService; 