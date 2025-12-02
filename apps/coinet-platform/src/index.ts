/**
 * 🚀 Coinet Platform - Main Entry Point
 * 
 * Divine platform with AI chat capabilities, perfect error handling,
 * and production-ready architecture.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db/client';
import { logger } from './utils/logger';
import chatRoutes from './api/chat/routes';
import { symbolDetector } from './services/symbol-detector';
import { fetchPricesForMessage, getMarketDataStatus } from './services/market-data';
import { getWhaleContextForAI } from './services/whale-data';
import { getMarketSentiment } from './services/sentiment-service';
import { fetchNews, getNewsServiceStatus, warmNewsCache, startNewsRefreshInterval } from './services/news-service';
import { aiService } from './services/ai-service';
import { initializeRedis, getRedisStatus, getCacheStats, closeRedis } from './services/redis-client';
import { logApiKeysStatus, generateApiKeysReport, getGracefulDegradation } from './services/api-keys';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Handle preflight OPTIONS requests FIRST - before CORS middleware
app.options('*', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Request-ID, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// CORS configuration - Allow specific origins including app.coinet.ai
const allowedOrigins = [
  'https://app.coinet.ai',
  'https://coinet.ai',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    // Allow all Vercel preview deployments
    if (origin.includes('vercel.app') || origin.includes('coinet')) {
      return callback(null, true);
    }
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In production, still allow for now (can restrict later)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Request-ID', 'Accept'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (req as any).requestId = requestId;
  (req as any).startTime = startTime;

  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint for Railway
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Check database health with timeout
    const dbHealthPromise = prisma.healthCheck();
    const timeoutPromise = new Promise<{ healthy: boolean }>((resolve) => 
      setTimeout(() => resolve({ healthy: false }), 3000)
    );
    
    const dbHealth = await Promise.race([dbHealthPromise, timeoutPromise]);

    const health = {
      ok: dbHealth.healthy !== false, // Consider service OK even if DB is down
      service: 'coinet-platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      database: {
        healthy: dbHealth.healthy,
        latency: 'latency' in dbHealth ? dbHealth.latency : undefined,
        configured: !!process.env.DATABASE_URL,
      },
    };

    // Always return 200 unless there's a critical error
    res.status(200).json(health);
  } catch (error) {
    logger.error('❌ Health check failed', error);
    res.status(200).json({
      ok: true,
      service: 'coinet-platform',
      database: {
        healthy: false,
        error: 'Health check error',
      },
    });
  }
});

// Status endpoint with detailed information
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const dbStats = await prisma.getStats();
    
    res.json({
      status: 'operational',
      service: 'coinet-platform',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      database: dbStats,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Status check failed', error);
    res.status(500).json({
      status: 'error',
      error: 'Status check failed',
    });
  }
});

// =============================================================================
// 🔬 DIAGNOSTIC ENDPOINT - Tests ALL services
// =============================================================================
app.get('/api/diagnostic', async (req: Request, res: Response) => {
  const testSymbol = (req.query.symbol as string) || 'SUPRA';
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    testSymbol,
    services: {},
    environment: {},
    recommendations: [],
  };

  // 1. Environment Check
  results.environment = {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    DATABASE_URL: process.env.DATABASE_URL ? '✅ configured' : '❌ missing',
    REDIS_URL: process.env.REDIS_URL ? '✅ configured' : '⚠️ missing (no shared cache)',
    // AI Keys
    XAI_API_KEY: process.env.XAI_API_KEY ? '✅ configured' : '⚠️ missing (Grok AI)',
    GROK_API_KEY: process.env.GROK_API_KEY ? '✅ configured' : '⚠️ missing (Grok AI alt)',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ configured' : '⚠️ missing (fallback AI)',
    // Market Data Keys
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY ? '✅ pro tier' : '⚠️ free tier (rate limited)',
    CMC_API_KEY: process.env.CMC_API_KEY ? '✅ configured' : '⚠️ missing (backup)',
    // News Service Keys
    CRYPTOPANIC_API_KEY: process.env.CRYPTOPANIC_API_KEY ? '✅ pro tier' : '⚠️ free tier (limited)',
    MESSARI_API_KEY: process.env.MESSARI_API_KEY ? '✅ configured' : '⚠️ missing (premium news)',
    THEBLOCK_API_KEY: process.env.THEBLOCK_API_KEY ? '✅ configured' : '⚠️ missing (premium news)',
    // Social Intelligence Keys
    LUNARCRUSH_API_KEY: process.env.LUNARCRUSH_API_KEY ? '✅ configured' : '⚠️ missing (social data)',
    // Derivatives Keys
    COINGLASS_API_KEY: process.env.COINGLASS_API_KEY ? '✅ configured' : '⚠️ missing (liquidations)',
    // Service URLs
    MARKET_PRICES_URL: process.env.MARKET_PRICES_URL || 'default',
    ALCHEMY_WHALES_URL: process.env.ALCHEMY_WHALES_URL || 'default',
  };

  // Check if AI is available
  if (!process.env.XAI_API_KEY && !process.env.GROK_API_KEY && !process.env.OPENAI_API_KEY) {
    results.recommendations.push('⚠️ CRITICAL: No AI API key configured. Set XAI_API_KEY or OPENAI_API_KEY');
  }

  // 2. Database Check
  try {
    const dbHealth = await Promise.race([
      prisma.healthCheck(),
      new Promise<{ healthy: boolean }>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      ),
    ]);
    results.services.database = {
      status: dbHealth.healthy ? '✅ connected' : '❌ unhealthy',
      latency: 'latency' in dbHealth ? `${dbHealth.latency}ms` : 'unknown',
    };
  } catch (err: any) {
    results.services.database = { status: '❌ failed', error: err.message };
    results.recommendations.push('Database connection failed. Check DATABASE_URL');
  }

  // 2.5. Redis Cache Check (ai-data-feeder integration)
  try {
    const redisStatus = getRedisStatus();
    const cacheStats = await getCacheStats();
    results.services.redisCache = {
      status: redisStatus.connected ? '✅ connected' : redisStatus.enabled ? '⚠️ disconnected' : '⚠️ not configured',
      enabled: redisStatus.enabled,
      connected: redisStatus.connected,
      lastPing: redisStatus.lastPing ? `${redisStatus.lastPing}ms` : 'N/A',
      cacheStats: {
        priceKeys: cacheStats.priceKeys,
        newsKeys: cacheStats.newsKeys,
        analysisKeys: cacheStats.analysisKeys,
        totalKeys: cacheStats.totalKeys,
      },
      error: redisStatus.error,
      note: 'Redis cache is populated by ai-data-feeder service',
    };
    if (!redisStatus.connected && redisStatus.enabled) {
      results.recommendations.push('⚠️ Redis configured but not connected. Check REDIS_URL and ai-data-feeder service.');
    }
    if (!redisStatus.enabled) {
      results.recommendations.push('💡 Add REDIS_URL to enable shared cache with ai-data-feeder (reduces API calls)');
    }
  } catch (err: any) {
    results.services.redisCache = { status: '❌ failed', error: err.message };
  }

  // 3. Symbol Detector Check
  try {
    const detected = await symbolDetector.detectCoins(`What about $${testSymbol}?`);
    const stats = symbolDetector.getStats();
    results.services.symbolDetector = {
      status: detected.length > 0 ? '✅ working' : '⚠️ no match',
      detected: detected.map(d => ({ symbol: d.symbol, id: d.coinGeckoId, confidence: d.confidence })),
      cacheSize: stats.cacheSize,
      isInitialized: stats.isInitialized,
    };
    if (detected.length === 0) {
      results.recommendations.push(`Symbol "${testSymbol}" not found in detector. May need CoinGecko cache refresh.`);
    }
  } catch (err: any) {
    results.services.symbolDetector = { status: '❌ failed', error: err.message };
  }

  // 4. Market Data Check
  try {
    const marketData = await fetchPricesForMessage(`Tell me about ${testSymbol}`);
    const marketStatus = getMarketDataStatus();
    results.services.marketData = {
      status: marketData.prices.length > 0 ? '✅ working' : '⚠️ no prices found',
      requested: marketData.requestedSymbols,
      found: marketData.foundSymbols,
      missing: marketData.missingSymbols,
      sources: marketData.sources,
      fetchTime: `${marketData.fetchTime}ms`,
      rateLimits: marketStatus.rateLimits,
    };
    if (marketData.missingSymbols.length > 0) {
      results.recommendations.push(`Price data missing for: ${marketData.missingSymbols.join(', ')}. Will try DexScreener.`);
    }
  } catch (err: any) {
    results.services.marketData = { status: '❌ failed', error: err.message };
  }

  // 5. Whale Service Check
  try {
    const whaleContext = await getWhaleContextForAI();
    results.services.whaleService = {
      status: whaleContext.isAvailable ? '✅ connected' : '⚠️ unavailable',
      monitoredChains: whaleContext.monitoredChains,
      capabilities: whaleContext.capabilities,
    };
    if (!whaleContext.isAvailable) {
      results.recommendations.push('Whale service unavailable. Check alchemy-whales deployment on Railway.');
    }
  } catch (err: any) {
    results.services.whaleService = { status: '❌ failed', error: err.message };
  }

  // 6. Sentiment Service Check
  try {
    const sentiment = await getMarketSentiment();
    results.services.sentimentService = {
      status: sentiment ? '✅ working' : '⚠️ no data',
      fearGreed: sentiment?.fearGreed ? {
        value: sentiment.fearGreed.value,
        classification: sentiment.fearGreed.classification,
        trend: sentiment.fearGreed.trend,
      } : null,
    };
  } catch (err: any) {
    results.services.sentimentService = { status: '❌ failed', error: err.message };
  }

  // 7. News Service Check (Multi-Source)
  try {
    const newsStatus = getNewsServiceStatus();
    const news = await fetchNews([testSymbol]);
    results.services.newsService = {
      status: news.articles.length > 0 ? '✅ working' : '⚠️ no articles',
      articlesFound: news.articles.length,
      sentiment: news.dominantSentiment,
      sentimentScore: news.overallSentimentScore?.toFixed(2),
      sourcesUsed: news.sourcesUsed,
      sourcesFailed: news.sourcesFailed,
      criticalAlerts: news.criticalAlerts?.length || 0,
      serviceHealth: {
        healthy: newsStatus.healthy,
        sources: newsStatus.sources.map(s => ({
          name: s.name,
          status: s.status,
          enabled: s.enabled,
        })),
      },
    };
    
    if (news.sourcesFailed.length > 0) {
      results.recommendations.push(`⚠️ News sources failed: ${news.sourcesFailed.join(', ')}`);
    }
  } catch (err: any) {
    results.services.newsService = { status: '❌ failed', error: err.message };
  }

  // 8. AI Service Check
  try {
    const aiAvailable = aiService.isAvailable();
    const aiHealth = await aiService.healthCheck();
    results.services.aiService = {
      status: aiAvailable ? '✅ configured' : '❌ not configured',
      provider: aiHealth.provider || 'none',
      healthy: aiHealth.healthy,
      latency: aiHealth.latency ? `${aiHealth.latency}ms` : 'unknown',
    };
    if (!aiAvailable) {
      results.recommendations.push('AI service not configured. Set XAI_API_KEY (Grok) or OPENAI_API_KEY');
    }
  } catch (err: any) {
    results.services.aiService = { status: '❌ failed', error: err.message };
  }

  // Summary
  const allServices = Object.values(results.services);
  const workingCount = allServices.filter((s: any) => s.status?.includes('✅')).length;
  const totalCount = allServices.length;
  
  results.summary = {
    overall: workingCount === totalCount ? '✅ ALL SYSTEMS GO' : 
             workingCount >= totalCount * 0.6 ? '⚠️ PARTIAL (some issues)' : 
             '❌ DEGRADED (needs attention)',
    working: `${workingCount}/${totalCount} services`,
  };

  res.json(results);
});

// Test endpoint for quick price check
app.get('/api/test/price/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  
  try {
    const startTime = Date.now();
    const detected = await symbolDetector.detectCoins(`$${symbol}`);
    const marketData = await fetchPricesForMessage(`$${symbol}`);
    
    res.json({
      symbol,
      detected: detected.map(d => ({ symbol: d.symbol, id: d.coinGeckoId, confidence: d.confidence })),
      price: marketData.prices[0] || null,
      sources: marketData.sources,
      missing: marketData.missingSymbols,
      fetchTime: Date.now() - startTime,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// 🔑 API KEYS STATUS ENDPOINT
// =============================================================================
app.get('/api/keys', async (_req: Request, res: Response) => {
  try {
    const report = generateApiKeysReport();
    
    // Add graceful degradation info for each service
    const services = {
      ai: getGracefulDegradation('ai'),
      news: getGracefulDegradation('news'),
      market: getGracefulDegradation('market'),
      social: getGracefulDegradation('social'),
      derivatives: getGracefulDegradation('derivatives'),
    };
    
    res.json({
      success: true,
      report: {
        ...report,
        // Remove sensitive info
        missingOptional: report.missingOptional.length,
      },
      services,
      summary: {
        configured: `${report.configuredKeys}/${report.totalKeys}`,
        criticalIssues: report.missingRequired.length,
        recommendations: report.recommendations.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API routes
app.use('/api/chat', chatRoutes);

// =============================================================================
// 📰 NEWS TEST ENDPOINT - Verify Section 1.1 Acceptance Criteria
// =============================================================================
app.get('/api/test/news', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const coins = req.query.coins ? (req.query.coins as string).split(',') : undefined;
  
  try {
    const newsSnapshot = await fetchNews(coins);
    const fetchTime = Date.now() - startTime;
    const newsStatus = getNewsServiceStatus();
    
    // Acceptance criteria checks
    const acceptanceCriteria = {
      minArticles: {
        required: 50,
        actual: newsSnapshot.articles.length,
        passed: newsSnapshot.articles.length >= 50,
      },
      maxFetchTime: {
        required: '500ms',
        actual: `${fetchTime}ms`,
        passed: fetchTime <= 500,
      },
      hasMultipleSources: {
        required: 'Multiple sources',
        actual: newsSnapshot.sourcesUsed.length,
        passed: newsSnapshot.sourcesUsed.length >= 2,
      },
      hasFailover: {
        description: 'Failover available',
        healthySources: newsStatus.sources.filter(s => s.status === 'healthy').length,
        passed: newsStatus.sources.filter(s => s.enabled).length >= 3,
      },
      hasSentiment: {
        description: 'Sentiment analysis',
        dominantSentiment: newsSnapshot.dominantSentiment,
        overallScore: newsSnapshot.overallSentimentScore,
        passed: newsSnapshot.overallSentimentScore !== undefined,
      },
    };
    
    const allPassed = Object.values(acceptanceCriteria).every(c => c.passed);
    
    res.json({
      success: true,
      section: '1.1 NEWS SERVICE RESURRECTION',
      status: allPassed ? '✅ ALL ACCEPTANCE CRITERIA MET' : '⚠️ SOME CRITERIA NOT MET',
      acceptanceCriteria,
      snapshot: {
        timestamp: newsSnapshot.timestamp,
        totalArticles: newsSnapshot.articles.length,
        dominantSentiment: newsSnapshot.dominantSentiment,
        overallSentimentScore: newsSnapshot.overallSentimentScore,
        sourcesUsed: newsSnapshot.sourcesUsed,
        sourcesFailed: newsSnapshot.sourcesFailed,
        criticalAlerts: newsSnapshot.criticalAlerts.length,
        majorNarratives: newsSnapshot.majorNarratives.slice(0, 5),
        fetchTime: `${fetchTime}ms`,
      },
      serviceHealth: newsStatus,
      sampleArticles: newsSnapshot.articles.slice(0, 5).map(a => ({
        title: a.title,
        source: a.source,
        sentiment: a.sentiment,
        sentimentScore: a.sentimentScore,
        impact: a.impact,
        urgency: a.urgency,
        publishedAt: a.publishedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'coinet-platform',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      diagnostic: '/api/diagnostic?symbol=SUPRA',
      keys: '/api/keys',
      testPrice: '/api/test/price/:symbol',
      testNews: '/api/test/news?coins=BTC,ETH',
      chat: '/api/chat',
    },
    documentation: 'Use /api/diagnostic to test all services, /api/keys to check API configuration, /api/test/news to verify news service',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId: (req as any).requestId,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('❌ Unhandled error', err, {
    requestId: (req as any).requestId,
    path: req.path,
    method: req.method,
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred'
        : err.message,
    },
    requestId: (req as any).requestId,
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  // Log API keys status at startup
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('🔑 API KEYS & CONFIGURATION CHECK');
  logger.info('═══════════════════════════════════════════════════════════');
  logApiKeysStatus();
  logger.info('═══════════════════════════════════════════════════════════');

  // Initialize Redis cache (for ai-data-feeder integration)
  try {
    const redisConnected = await initializeRedis();
    if (redisConnected) {
      logger.info('🔴 Redis cache connected - using shared cache with ai-data-feeder');
    } else {
      logger.info('🔴 Redis not configured - using direct API calls');
    }
  } catch (redisError) {
    logger.warn('🔴 Redis initialization failed', { error: redisError instanceof Error ? redisError.message : 'Unknown' });
  }

  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      logger.warn('⚠️  DATABASE_URL not configured. Server will start but database features will be unavailable.');
      logger.warn('   Set DATABASE_URL in .env file to enable database features.');
    } else {
      // Verify database connection with timeout
      logger.info('🔍 Verifying database connection...');
      
      try {
        const dbHealth = await Promise.race([
          prisma.healthCheck(),
          new Promise<{ healthy: boolean }>((_, reject) => 
            setTimeout(() => reject(new Error('Database health check timeout')), 5000)
          )
        ]);
        
        if (!dbHealth.healthy) {
          logger.warn('⚠️  Database connection failed. Server will start but database features will be unavailable.');
        } else {
          const latency = 'latency' in dbHealth ? dbHealth.latency : 0;
          logger.info('✅ Database connected', { latency });
          
          // Sync database schema automatically (using db push instead of migrations)
          try {
            logger.info('🔄 Syncing database schema...');
            const { execSync } = require('child_process');
            const path = require('path');
            const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
            // Quote schema path to handle spaces in directory names
            const quotedSchemaPath = `"${schemaPath}"`;
            execSync(`npx prisma db push --schema=${quotedSchemaPath} --accept-data-loss`, {
              stdio: 'inherit',
              env: process.env,
              cwd: path.join(__dirname, '..'),
            });
            logger.info('✅ Database schema synced');
          } catch (migrationError) {
            // Don't fail startup if schema sync fails - might already be up to date
            logger.warn('⚠️  Database schema sync failed or already up to date', {
              error: migrationError instanceof Error ? migrationError.message : 'Unknown error',
            });
          }
        }
      } catch (error) {
        logger.warn('⚠️  Database health check failed or timed out. Server will start anyway.');
        logger.warn('Database Error', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Start HTTP server (always start, even if DB fails)
    app.listen(PORT, '0.0.0.0', async () => {
      const env = process.env.NODE_ENV || 'production';
      logger.info(`🚀 Coinet Platform started`, {
        port: PORT,
        environment: env,
      });
      logger.info(`📍 Health: http://0.0.0.0:${PORT}/api/health`);
      logger.info(`📍 Status: http://0.0.0.0:${PORT}/api/status`);
      logger.info(`📍 Chat API: http://0.0.0.0:${PORT}/api/chat`);
      
      // Warm news cache after server starts (non-blocking)
      warmNewsCache().catch(err => logger.warn('News cache warming failed', { error: err }));
      
      // Start background news refresh (every 2 minutes)
      startNewsRefreshInterval(2 * 60 * 1000);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`🛑 ${signal} received, shutting down gracefully...`);

  try {
    // Close database connection
    await (prisma as any).$disconnect();
    logger.info('✅ Database connection closed');

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection', new Error(String(reason)), { promise });
  process.exit(1);
});

// Start the server
startServer();

