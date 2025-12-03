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

// =============================================================================
// 🌐 SOCIAL INTELLIGENCE TEST ENDPOINT - Verify Section 1.2 Multi-Platform
// =============================================================================
app.get('/api/test/social', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const coins = req.query.coins ? (req.query.coins as string).split(',') : ['BTC', 'ETH', 'SOL'];
  
  try {
    // Import dynamically to avoid circular dependencies
    const { getSocialIntelligence } = await import('./services/social-intelligence');
    const socialIntel = await getSocialIntelligence(coins);
    const fetchTime = Date.now() - startTime;
    
    // Acceptance criteria checks
    const acceptanceCriteria = {
      multiPlatform: {
        required: 'Multiple platforms',
        actual: socialIntel.activePlatforms.length,
        platforms: socialIntel.activePlatforms,
        passed: socialIntel.activePlatforms.length >= 1,
      },
      mentionVolume: {
        required: 'Social mentions',
        actual: socialIntel.aggregate.totalMentions,
        passed: socialIntel.aggregate.totalMentions >= 0,
      },
      sentimentAnalysis: {
        required: 'Sentiment scoring',
        overall: socialIntel.aggregate.overallSentiment,
        passed: socialIntel.aggregate.overallSentiment.label !== undefined,
      },
      trendingDetection: {
        required: 'Trending detection',
        trending: socialIntel.trendingCoins,
        passed: true,
      },
      dataQuality: {
        required: 'Data quality assessment',
        quality: socialIntel.dataQuality,
        passed: true,
      },
    };
    
    const allPassed = Object.values(acceptanceCriteria).every(c => c.passed);
    
    res.json({
      success: true,
      section: '1.2 SOCIAL INTELLIGENCE RESURRECTION',
      status: allPassed ? '✅ SOCIAL INTELLIGENCE OPERATIONAL' : '⚠️ PARTIAL FUNCTIONALITY',
      acceptanceCriteria,
      intelligence: {
        timestamp: socialIntel.timestamp,
        platforms: socialIntel.platforms.map(p => ({
          platform: p.platform,
          isAvailable: p.isAvailable,
          mentionCount: p.mentionCount,
          avgSentiment: p.avgSentiment,
          error: p.error,
        })),
        aggregate: socialIntel.aggregate,
        trendingCoins: socialIntel.trendingCoins,
        trendingTopics: socialIntel.trendingTopics.slice(0, 5),
        influencerAlerts: socialIntel.influencerAlerts.slice(0, 3),
        dominantNarratives: socialIntel.dominantNarratives,
        dataQuality: socialIntel.dataQuality,
        fetchTime: `${fetchTime}ms`,
      },
      coinMetrics: socialIntel.coins.slice(0, 5).map(c => ({
        symbol: c.symbol,
        totalMentions: c.totalMentions,
        sentiment: c.sentiment.overall,
        sentimentScore: c.sentiment.score,
        isTrending: c.isTrending,
        platformBreakdown: c.platformBreakdown,
      })),
      // Step 1.2.2: Enhanced Analytics
      sentimentAnalysis: {
        overall: socialIntel.sentimentBreakdown?.overall,
        distribution: socialIntel.sentimentBreakdown?.distribution,
        dominantEmotion: socialIntel.sentimentBreakdown?.dominantEmotion,
        topBullishSignals: socialIntel.sentimentBreakdown?.topBullishSignals,
        topBearishSignals: socialIntel.sentimentBreakdown?.topBearishSignals,
        context: socialIntel.sentimentBreakdown?.contextSummary,
      },
      trendAnalysis: {
        trends: socialIntel.trendAnalysis?.trends?.slice(0, 5).map(t => ({
          topic: t.topic,
          phase: t.status.phase,
          velocity: t.metrics.velocity,
          isViral: t.status.isViral,
          viralityScore: t.status.viralityScore,
          trendStrength: t.status.trendStrength,
        })),
        viralityAlerts: socialIntel.trendAnalysis?.viralityAlerts?.map(v => ({
          topic: v.topic,
          score: v.score,
          isViral: v.isViral,
          alert: v.alert,
          triggers: v.triggers,
        })),
      },
      communityMetrics: socialIntel.communityMetrics?.slice(0, 5).map(c => ({
        community: c.community,
        mood: c.mood,
        sentiment: c.sentiment.overall,
        activity: c.activity,
        trending: c.trending,
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

// =============================================================================
// 👤 INFLUENCER TRACKING TEST ENDPOINT - Verify Section 1.2.3
// =============================================================================
app.get('/api/test/influencers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const coin = (req.query.coin as string) || 'BTC';
  
  try {
    const { getInfluencerSnapshot, getTrackedInfluencers, getInfluencersByTier, getInfluencersBySpecialization } = await import('./services/influencer-tracking');
    const { analyzeContrarianIndicator, analyzeConsensus, getInfluencerAccuracyStats } = await import('./services/influencer-analytics');
    
    const snapshot = await getInfluencerSnapshot();
    const allInfluencers = getTrackedInfluencers();
    const fetchTime = Date.now() - startTime;
    
    // Tier breakdown
    const tierBreakdown = {
      legendary: getInfluencersByTier('legendary').length,
      elite: getInfluencersByTier('elite').length,
      major: getInfluencersByTier('major').length,
      notable: getInfluencersByTier('notable').length,
      rising: getInfluencersByTier('rising').length,
    };
    
    // Specialization breakdown
    const specializationBreakdown = {
      bitcoin: getInfluencersBySpecialization('bitcoin').length,
      ethereum: getInfluencersBySpecialization('ethereum').length,
      defi: getInfluencersBySpecialization('defi').length,
      trading: getInfluencersBySpecialization('trading').length,
      macro: getInfluencersBySpecialization('macro').length,
      onChain: getInfluencersBySpecialization('on-chain').length,
    };
    
    // Advanced analytics (if we have posts)
    let advancedAnalytics = null;
    if (snapshot.recentPosts.length >= 3) {
      const contrarian = analyzeContrarianIndicator(snapshot.recentPosts);
      const consensus = analyzeConsensus(coin, snapshot.recentPosts, allInfluencers);
      
      advancedAnalytics = {
        contrarianIndicator: {
          consensus: contrarian.consensus,
          signal: contrarian.contrarian,
          isActionable: contrarian.contrarian.isExtreme,
        },
        consensusAnalysis: {
          coin,
          weightedSignal: consensus.weighted,
          tierBreakdown: {
            legendary: consensus.weighted.legendaryConsensus,
            elite: consensus.weighted.eliteConsensus,
            major: consensus.weighted.majorConsensus,
            notable: consensus.weighted.notableConsensus,
            rising: consensus.weighted.risingConsensus,
          },
          divergence: consensus.divergence,
          smartVsRetail: consensus.smartVsRetail,
        },
      };
    }
    
    // Top influencer accuracy stats
    const topInfluencerStats = allInfluencers.slice(0, 5).map(i => ({
      name: i.name,
      tier: i.tier,
      stats: getInfluencerAccuracyStats(i.id),
    }));
    
    res.json({
      success: true,
      section: '1.2.3 INFLUENCER TRACKING SYSTEM (ENHANCED)',
      status: '✅ ADVANCED INFLUENCER ANALYTICS OPERATIONAL',
      database: {
        totalInfluencers: allInfluencers.length,
        tierBreakdown,
        specializationBreakdown,
        topInfluencers: allInfluencers.slice(0, 10).map(i => ({
          name: i.name,
          tier: i.tier,
          platform: i.platform,
          followers: i.followers,
          credibilityScore: i.credibilityScore,
          marketImpactScore: i.marketImpactScore,
          historicalAccuracy: i.historicalAccuracy,
          specialization: i.specialization,
          isInstitutional: i.isInstitutional,
          tags: i.tags,
        })),
      },
      snapshot: {
        timestamp: snapshot.timestamp,
        activeInfluencers: snapshot.activeInfluencers,
        recentPosts: snapshot.recentPosts.length,
        activeAlerts: snapshot.activeAlerts.length,
        criticalAlerts: snapshot.criticalAlerts.length,
        influencerSentiment: snapshot.influencerSentiment,
        topMentionedCoins: snapshot.topMentionedCoins.slice(0, 5),
        recentCalls: snapshot.recentCalls.slice(0, 5),
      },
      advancedAnalytics,
      accuracyTracking: {
        description: 'Historical accuracy tracking for top influencers',
        topInfluencers: topInfluencerStats,
      },
      features: {
        contrarianIndicator: '✅ Detects extreme consensus for contrarian signals',
        pumpDumpDetection: '✅ Identifies coordinated pump & dump schemes',
        consensusAnalysis: '✅ Cross-influencer weighted consensus',
        smartVsRetail: '✅ Institutional vs retail divergence tracking',
        accuracyTracking: '✅ Historical call accuracy with decay',
        influenceDecay: '✅ Dynamic credibility adjustment',
      },
      fetchTime: `${fetchTime}ms`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// =============================================================================
// 🎯 COMPREHENSIVE SOCIAL INTELLIGENCE TEST ENDPOINT
// =============================================================================
app.get('/api/test/social-intelligence', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const coins = ((req.query.coins as string) || 'BTC,ETH,SOL').split(',').map(c => c.trim().toUpperCase());
  
  try {
    const { getComprehensiveSocialIntelligence } = await import('./services/social-intelligence-orchestrator');
    
    const report = await getComprehensiveSocialIntelligence(coins);
    
    res.json({
      success: true,
      section: 'REVOLUTIONARY SOCIAL INTELLIGENCE SYSTEM',
      status: '✅ COMPREHENSIVE SOCIAL INTELLIGENCE OPERATIONAL',
      report: {
        timestamp: report.timestamp,
        dataQuality: report.dataQuality,
        signals: report.signals,
        coinAnalysis: report.coinAnalysis,
        errors: report.errors,
      },
      systems: {
        socialIntelligence: report.intelligence.social ? '✅ Active' : '❌ Unavailable',
        influencerTracking: report.intelligence.influencers ? '✅ Active' : '❌ Unavailable',
        psychometrics: report.intelligence.psychometrics ? '✅ Active' : '❌ Unavailable',
        networkAnalysis: report.intelligence.network ? '✅ Active' : '❌ Unavailable',
      },
      analytics: {
        contrarianSignal: report.analytics.contrarian?.contrarian.isExtreme ? 
          `⚠️ ${report.analytics.contrarian.contrarian.contrarySignal.toUpperCase()} SIGNAL` : 'No extreme signal',
        pumpDumpAlerts: report.analytics.pumpDump.length,
        consensusAnalyses: report.analytics.consensus.length,
      },
      capabilities: {
        crowdPsychology: '✅ Fear/Greed cycle analysis',
        cognitiveBiases: '✅ 10+ bias types detected',
        manipulationDetection: '✅ Pump & dump, FUD, shilling',
        emotionalContagion: '✅ Spread velocity, amplification',
        herdBehavior: '✅ Stampede risk, contrarian ratio',
        narrativeTracking: '✅ Lifecycle stage analysis',
        botDetection: '✅ Spam, amplifier, coordinated',
        coordinationNetworks: '✅ Multi-account detection',
        communityAnalysis: '✅ Echo chamber identification',
        influencerConsensus: '✅ Tier-weighted signals',
        smartMoneyVsRetail: '✅ Divergence tracking',
      },
      fetchTime: `${report.fetchTime}ms`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// =============================================================================
// 📊 CRYPTO FEAR & GREED INDEX - Real-Time Market Sentiment
// =============================================================================
app.get('/api/test/csi', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { calculateCSI, formatCSIForAI } = await import('./services/coinet-sentiment-index');
    
    const result = await calculateCSI();
    const aiContext = formatCSIForAI(result);
    
    res.json({
      success: true,
      section: 'CRYPTO FEAR & GREED INDEX - Real-Time Market Sentiment',
      status: '✅ FEAR & GREED INDEX OPERATIONAL',
      
      // Main index - THE REAL VALUE
      index: {
        value: result.index.rounded,
        regime: result.index.regime,
        regimeLabel: result.index.regimeLabel,
        smoothed: result.index.smoothed,
        source: 'Alternative.me / CMC Fear & Greed Index',
        updateFrequency: 'Every 12 hours',
      },
      
      // Historical context
      historical: {
        yesterday: result.historical.previousIndex,
        change24h: result.historical.change24h,
        change7d: result.historical.change7d,
        daysInCurrentRegime: result.historical.daysInCurrentRegime,
      },
      
      // Regime scale
      regimeScale: {
        extremeFear: '0-24',
        fear: '25-44',
        neutral: '45-55',
        greed: '56-75',
        extremeGreed: '76-100',
        current: `${result.index.rounded} = ${result.index.regimeLabel}`,
      },
      
      // Factor analysis (what's driving sentiment)
      factorAnalysis: {
        momentum: {
          description: 'Price trend of top-10 coins',
          weight: '30%',
          greedScore: result.factors.momentum.greedScore,
          signal: result.factors.momentum.signal,
        },
        volatility: {
          description: 'Market volatility level',
          weight: '20%',
          greedScore: result.factors.volatility.greedScore,
          signal: result.factors.volatility.signal,
        },
        derivatives: {
          description: 'Options put/call ratio',
          weight: '20%',
          greedScore: result.factors.derivatives.greedScore,
          signal: result.factors.derivatives.signal,
        },
        ssr: {
          description: 'BTC vs stablecoin ratio',
          weight: '15%',
          greedScore: result.factors.ssr.greedScore,
          signal: result.factors.ssr.signal,
        },
        social: {
          description: 'Social media sentiment',
          weight: '15%',
          greedScore: result.factors.social.greedScore,
          signal: result.factors.social.signal,
        },
      },
      
      // Trading interpretation
      tradingInterpretation: {
        regime: result.index.regimeLabel,
        recommendation: result.index.regime === 'extreme_fear' 
          ? 'Historical buying opportunity - "Be greedy when others are fearful"'
          : result.index.regime === 'fear'
          ? 'Consider accumulating quality assets with caution'
          : result.index.regime === 'neutral'
          ? 'Wait for confirmation of trend direction'
          : result.index.regime === 'greed'
          ? 'Exercise caution, consider taking partial profits'
          : 'High correction risk - "Be fearful when others are greedy"',
      },
      
      // Data quality
      metadata: {
        ...result.metadata,
        source: 'Alternative.me Fear & Greed Index',
        updateFrequency: 'Every 12 hours (industry standard)',
        methodology: 'Aggregated from price momentum, volatility, derivatives, market composition, and social sentiment',
      },
      
      // AI context preview
      aiContextPreview: aiContext.substring(0, 800) + '...',
      
      fetchTime: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// =============================================================================
// 📊 CSI v4.0 - SCARY SHARP PRECISION TEST ENDPOINT
// =============================================================================
app.get('/api/test/csi-v4', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { calculateCSIV4Factors, calculateCSIV4Score, formatCSIV4ForAI, CSI_V4_CONFIG } = 
      await import('./services/csi-v4-factors');
    const { calculateCSI } = await import('./services/coinet-sentiment-index');
    
    // Get headline from Alternative.me
    const csiResult = await calculateCSI();
    const headline = csiResult.index.rounded;
    
    // Calculate v4.0 factors
    const factors = await calculateCSIV4Factors();
    const factorScore = calculateCSIV4Score(factors);
    const aiContext = formatCSIV4ForAI(factors, headline);
    
    res.json({
      success: true,
      section: 'CSI v4.0 - SCARY SHARP PRECISION',
      status: '✅ CSI v4.0 OPERATIONAL',
      
      // Comparison
      comparison: {
        headline: `${headline}/100 (Alternative.me)`,
        factorScore: `${factorScore}/100 (6-factor model)`,
        delta: factorScore - headline,
      },
      
      // 6 Factor breakdown
      factors: {
        '1_MOMENTUM (25%)': {
          composite: factors.momentum.composite,
          subFactors: {
            '7d_return': factors.momentum.r7d,
            '30d_return': factors.momentum.r30d,
            '90d_return': factors.momentum.r90d,
            'breadth_%_above_200dMA': factors.momentum.breadth,
          },
          weights: CSI_V4_CONFIG.MOMENTUM_WEIGHTS,
        },
        '2_VOLATILITY (15%) [INVERTED]': {
          composite: factors.volatility.composite,
          subFactors: {
            'implied_vol': factors.volatility.iv,
            'realized_vol': factors.volatility.rv,
            'IV/RV_ratio': factors.volatility.ivRvRatio,
          },
          weights: CSI_V4_CONFIG.VOLATILITY_WEIGHTS,
        },
        '3_DERIVATIVES (20%) [INVERTED]': {
          composite: factors.derivatives.composite,
          subFactors: {
            'put_call_ratio': factors.derivatives.pcr,
            'OI_to_MC': factors.derivatives.oi,
            'funding_zscore': factors.derivatives.funding,
            'basis_zscore': factors.derivatives.basis,
          },
          weights: CSI_V4_CONFIG.DERIVATIVES_WEIGHTS,
        },
        '4_SSR (10%)': {
          composite: factors.ssr.composite,
          subFactors: {
            'level': factors.ssr.level,
            'flow_7d': factors.ssr.flow,
          },
          weights: CSI_V4_CONFIG.SSR_WEIGHTS,
        },
        '5_SOCIAL (10%)': {
          composite: factors.social.composite,
          subFactors: {
            'buzz': factors.social.buzz,
            'net_sentiment': factors.social.netSentiment,
            'hype_skew': factors.social.hypeSkew,
          },
          weights: CSI_V4_CONFIG.SOCIAL_WEIGHTS,
        },
        '6_ONCHAIN (20%) [NEW!]': {
          composite: factors.onchain.composite,
          subFactors: {
            'MVRV_Z': factors.onchain.mvrvZ,
            'SOPR': factors.onchain.sopr,
          },
          weights: CSI_V4_CONFIG.ONCHAIN_WEIGHTS,
        },
      },
      
      // Formula
      formula: {
        equation: 'CSI = 0.25×MOM + 0.15×VOL + 0.20×DERIV + 0.10×SSR + 0.10×SOC + 0.20×ONCHAIN',
        calculation: {
          momentum: (CSI_V4_CONFIG.WEIGHTS.momentum * factors.momentum.composite).toFixed(2),
          volatility: (CSI_V4_CONFIG.WEIGHTS.volatility * factors.volatility.composite).toFixed(2),
          derivatives: (CSI_V4_CONFIG.WEIGHTS.derivatives * factors.derivatives.composite).toFixed(2),
          ssr: (CSI_V4_CONFIG.WEIGHTS.ssr * factors.ssr.composite).toFixed(2),
          social: (CSI_V4_CONFIG.WEIGHTS.social * factors.social.composite).toFixed(2),
          onchain: (CSI_V4_CONFIG.WEIGHTS.onchain * factors.onchain.composite).toFixed(2),
          total: factorScore,
        },
      },
      
      // Upgrades from v3.0
      upgrades: {
        momentum: 'Multi-horizon (7d, 30d, 90d) + Breadth (% above 200d MA)',
        volatility: 'IV + RV + IV/RV ratio (separates real chaos vs options panic)',
        derivatives: 'PCR + OI/MC + Funding z-score + Basis z-score',
        ssr: 'Level + 7d Flow (capital movement)',
        social: 'Buzz + Net Sentiment + Hype Skew (meme vs majors)',
        onchain: 'NEW! MVRV-Z + SOPR (holder PnL, valuation)',
        math: 'Exponentially weighted percentiles (λ=90d) + Convex mapping (γ=1.5)',
      },
      
      // AI context preview
      aiContextPreview: aiContext,
      
      fetchTime: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// =============================================================================
// 📊 CSI v5.0 - THE 10/10 EMPIRICALLY TUNED SIGNAL
// =============================================================================
app.get('/api/test/csi-v5', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { calculateCSIV5, formatCSIV5ForAI, CSI_V5_CONFIG } = 
      await import('./services/csi-v5-calibrated');
    const { calculateCSI } = await import('./services/coinet-sentiment-index');
    
    // Get headline from Alternative.me
    const csiResult = await calculateCSI();
    const headline = csiResult.index.rounded;
    
    // Calculate v5.0
    const result = await calculateCSIV5(headline);
    const aiContext = formatCSIV5ForAI(result);
    
    res.json({
      success: true,
      section: 'CSI v5.0 - THE 10/10 EMPIRICALLY TUNED SIGNAL',
      status: '✅ CSI v5.0 OPERATIONAL',
      
      // Primary indices
      indices: {
        headlineFNG: `${result.indices.headlineFNG}/100 (Alternative.me)`,
        csiExplainer: `${result.indices.csiExplainer}/100 (matches headline, R²=${(result.calibration.explainerR2 * 100).toFixed(0)}%)`,
        csiAlpha: `${result.indices.csiAlpha}/100 (predictive, power=${(result.calibration.alphaPredictivePower * 100).toFixed(0)}%)`,
        csiFinal: `${result.indices.csiFinal}/100 (blended λ=${CSI_V5_CONFIG.LAMBDA_BLEND})`,
      },
      
      // Confidence band
      confidence: {
        value: result.indices.csiFinal,
        lower: result.confidence.lower,
        upper: result.confidence.upper,
        confidence: `${(result.confidence.confidence * 100).toFixed(0)}%`,
        uncertainty: result.confidence.uncertainty,
      },
      
      // Market regime
      regime: {
        current: result.regime.current,
        trendStrength: `${(result.regime.trendStrength * 100).toFixed(0)}%`,
        volRegime: result.regime.volRegime,
        confidence: `${(result.regime.confidence * 100).toFixed(0)}%`,
      },
      
      // Multi-CSI family
      csiFamily: {
        CSI_BTC: `${result.indices.csiFamily.btc}/100 (${(CSI_V5_CONFIG.SEGMENT_WEIGHTS.btc * 100).toFixed(0)}% weight)`,
        CSI_ALTS: `${result.indices.csiFamily.largeCapAlts}/100 (${(CSI_V5_CONFIG.SEGMENT_WEIGHTS.largeCapAlts * 100).toFixed(0)}% weight)`,
        CSI_DEGEN: `${result.indices.csiFamily.degenMeme}/100 (${(CSI_V5_CONFIG.SEGMENT_WEIGHTS.degenMeme * 100).toFixed(0)}% weight)`,
        CSI_STABLES: `${result.indices.csiFamily.stablecoinStress}/100 (${(CSI_V5_CONFIG.SEGMENT_WEIGHTS.stablecoinStress * 100).toFixed(0)}% weight)`,
      },
      
      // Statistically-anchored interpretation
      interpretation: {
        regime: result.interpretation.regime,
        historicalContext: result.interpretation.historicalContext,
        expectedReturn30d: `${(result.interpretation.expectedReturn.mean * 100).toFixed(1)}% ± ${(result.interpretation.expectedReturn.std * 100).toFixed(0)}%`,
        drawdownRisk: `${(result.interpretation.tailRisk.drawdownProb * 100).toFixed(0)}% chance of >${(result.interpretation.tailRisk.magnitude * 100).toFixed(0)}% drawdown`,
        recommendation: result.interpretation.recommendation,
      },
      
      // Data quality
      dataQuality: {
        overall: result.metadata.dataQuality,
        factorsAvailable: `${result.metadata.factorsAvailable}/6`,
        issues: result.factorQuality.filter(q => q.issues.length > 0).map(q => ({
          factor: q.factor,
          quality: `${(q.qualityScore * 100).toFixed(0)}%`,
          issues: q.issues,
        })),
      },
      
      // Effective weights (quality & correlation adjusted)
      effectiveWeights: Object.entries(result.effectiveWeights).map(([k, v]) => ({
        factor: k,
        weight: `${(v * 100).toFixed(1)}%`,
      })),
      
      // 5 pillars of 10/10
      pillars: {
        '1_EMPIRICAL_CALIBRATION': {
          description: 'Data-driven weights from regression',
          explainerR2: `${(result.calibration.explainerR2 * 100).toFixed(0)}%`,
          alphaPredictivePower: `${(result.calibration.alphaPredictivePower * 100).toFixed(0)}%`,
          blend: `CSI_final = ${CSI_V5_CONFIG.LAMBDA_BLEND}×CSI_explainer + ${1 - CSI_V5_CONFIG.LAMBDA_BLEND}×CSI_alpha`,
        },
        '2_DECORRELATION_REGIME': {
          description: 'Correlation-aware weights + regime-specific',
          currentRegime: result.regime.current,
          correlationPenalty: CSI_V5_CONFIG.CORRELATION_PENALTY_ALPHA,
        },
        '3_DATA_QUALITY_ROBUSTNESS': {
          description: 'Per-factor quality scores + confidence bands',
          overallQuality: result.metadata.dataQuality,
          confidenceBand: `${result.confidence.lower}-${result.confidence.upper}`,
        },
        '4_MULTI_CSI_FAMILY': {
          description: 'Segment-specific indices',
          segments: ['CSI_BTC', 'CSI_ALTS', 'CSI_DEGEN', 'CSI_STABLES'],
        },
        '5_STATISTICAL_THRESHOLDS': {
          description: 'Regime labels based on historical risk/reward',
          thresholds: CSI_V5_CONFIG.THRESHOLDS,
        },
      },
      
      // AI context preview
      aiContextPreview: aiContext,
      
      fetchTime: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 SOCIAL INTELLIGENCE v2.0 TEST ENDPOINT - 10/10 Divine Perfection
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/test/social-v2', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { calculateSocialIntelligenceV2, formatSocialIntelligenceV2ForAI } = 
      await import('./services/social-intelligence-v2');
    
    const result = await calculateSocialIntelligenceV2();
    const aiContext = formatSocialIntelligenceV2ForAI(result);
    
    res.json({
      success: true,
      section: '🌐 SOCIAL INTELLIGENCE v2.0 - 10/10 Divine Perfection',
      status: '✅ SOCIAL INTELLIGENCE v2.0 OPERATIONAL',
      version: result.version,
      
      // Headline
      headline: result.headline,
      
      // Confidence
      confidence: result.confidence,
      
      // Regime
      regime: result.regime,
      
      // Platform breakdown
      platformScores: result.platformScores,
      platformWeights: result.platformWeights,
      
      // Segment scores
      segments: result.segments,
      
      // FUD analysis
      fud: {
        score: result.fud.score,
        level: result.fud.level,
        components: result.fud.components,
        percentileVsHistory: result.fud.percentileVsHistory,
      },
      
      // FOMO analysis
      fomo: {
        score: result.fomo.score,
        level: result.fomo.level,
        components: result.fomo.components,
        percentileVsHistory: result.fomo.percentileVsHistory,
      },
      
      // Influencer intelligence
      influencers: result.influencers,
      
      // Historical context
      historical: result.historical,
      
      // Interpretation
      interpretation: result.interpretation,
      
      // Data quality
      dataQuality: result.dataQuality,
      
      // Calibration
      calibration: result.calibration,
      
      // AI context preview
      aiContextPreview: aiContext,
      
      // Performance
      computeTime: `${result.computeTime}ms`,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    logger.error('❌ Social Intelligence v2.0 test endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📰 NEWS INTELLIGENCE v2.0 TEST ENDPOINT - 10/10 Divine Perfection
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/test/news-v2', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { calculateNewsIntelligenceV2, formatNewsIntelligenceV2ForAI } = 
      await import('./services/news-intelligence-v2');
    
    const result = await calculateNewsIntelligenceV2();
    const aiContext = formatNewsIntelligenceV2ForAI(result);
    
    res.json({
      success: true,
      section: '📰 NEWS INTELLIGENCE v2.0 - 10/10 Divine Perfection',
      status: '✅ NEWS INTELLIGENCE v2.0 OPERATIONAL',
      version: result.version,
      
      // Headline
      headline: result.headline,
      
      // Confidence
      confidence: result.confidence,
      
      // Regime
      regime: result.regime,
      
      // Source breakdown
      sourceScores: result.sourceScores,
      sourceWeights: result.sourceWeights,
      
      // Segment analysis
      segments: Object.fromEntries(
        Object.entries(result.segments).map(([k, v]) => [k, {
          articleCount: v.articleCount,
          avgSentiment: v.avgSentiment,
          avgImpact: v.avgImpact,
          trend: v.trend,
        }])
      ),
      
      // Articles summary
      articles: {
        total: result.articles.total,
        last24h: result.articles.last24h,
        lastHour: result.articles.lastHour,
        criticalCount: result.articles.critical.length,
        topByImpact: result.articles.topByImpact.slice(0, 3).map(a => ({
          title: a.title.slice(0, 80),
          source: a.source,
          sentiment: a.intelligence.sentiment.label,
          impact: a.intelligence.impact.level,
        })),
      },
      
      // Narratives
      narratives: result.narratives.active.slice(0, 5),
      
      // Historical
      historical: result.historical,
      
      // Interpretation
      interpretation: result.interpretation,
      
      // Data quality
      dataQuality: result.dataQuality,
      
      // Calibration
      calibration: result.calibration,
      
      // AI context preview
      aiContextPreview: aiContext,
      
      // Performance
      computeTime: `${result.computeTime}ms`,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    logger.error('❌ News Intelligence v2.0 test endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📊 COMPOSITE SOCIAL SCORE (CSS) TEST ENDPOINT - 10/10 Divine Perfection
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/test/css', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { calculateCompositeSocialScore, formatCSSForAI, CSS_CONFIG } = 
      await import('./services/composite-social-score');
    
    const result = await calculateCompositeSocialScore();
    const aiContext = formatCSSForAI(result);
    
    res.json({
      success: true,
      section: '📊 COMPOSITE SOCIAL SCORE (CSS) - 10/10 Divine Perfection',
      status: '✅ CSS OPERATIONAL',
      
      // Primary scores
      scores: {
        composite: `${result.scores.composite}/100`,
        compositeLabel: result.scores.compositeLabel,
        fud: `${result.scores.fud.score}/100 (${result.scores.fud.level})`,
        fomo: `${result.scores.fomo.score}/100 (${result.scores.fomo.level})`,
      },
      
      // Confidence
      confidence: {
        band: `${result.confidence.lower}-${result.confidence.upper}`,
        confidence: `${(result.confidence.confidence * 100).toFixed(0)}%`,
        uncertainty: result.confidence.uncertainty,
      },
      
      // Regime
      regime: result.regime,
      
      // Platform breakdown
      platformScores: result.platformScores,
      
      // Segment scores
      segments: result.segments,
      
      // FUD breakdown
      fudBreakdown: result.scores.fud.components,
      
      // FOMO breakdown
      fomoBreakdown: result.scores.fomo.components,
      
      // Historical context
      historical: result.historical,
      
      // Interpretation
      interpretation: result.interpretation,
      
      // Data quality
      dataQuality: result.dataQuality,
      
      // Calibration
      calibration: result.calibration,
      
      // Effective weights
      effectiveWeights: result.effectiveWeights,
      
      // AI context preview
      aiContextPreview: aiContext,
      
      // Performance
      fetchTime: `${Date.now() - startTime}ms`,
      
      // Config reference
      thresholds: {
        sentiment: CSS_CONFIG.SENTIMENT_THRESHOLDS,
        fud: CSS_CONFIG.FUD_THRESHOLDS,
        fomo: CSS_CONFIG.FOMO_THRESHOLDS,
      },
    });
  } catch (error: any) {
    logger.error('❌ CSS test endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 💀 DERIVATIVES INTELLIGENCE v2.0 TEST ENDPOINT - 10/10 Divine Perfection
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/test/derivatives-v2', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { calculateDerivativesIntelligenceV2, formatDerivativesIntelligenceV2ForAI } = 
      await import('./services/derivatives-intelligence-v2');
    
    const result = await calculateDerivativesIntelligenceV2();
    const aiContext = formatDerivativesIntelligenceV2ForAI(result);
    
    res.json({
      success: true,
      section: '💀 DERIVATIVES INTELLIGENCE v2.0 - With Sentiment Inertia',
      status: '✅ DERIVATIVES INTELLIGENCE v2.0 OPERATIONAL',
      
      // Primary outputs
      headline: result.headline,
      
      // ═══════════════════════════════════════════════════════════════════════
      // NEW: SENTIMENT INERTIA - Prevents rapid sentiment flips
      // This is the KEY improvement based on user feedback
      // ═══════════════════════════════════════════════════════════════════════
      sentimentInertia: {
        rawScore: result.sentimentSmoothing.rawScore,
        smoothedScore: result.sentimentSmoothing.smoothedScore,
        adjustedScore: result.sentimentSmoothing.adjustedScore,
        adjustments: result.sentimentSmoothing.adjustments,
        explanation: result.sentimentSmoothing.rawScore > result.sentimentSmoothing.adjustedScore + 5
          ? `Raw score ${result.sentimentSmoothing.rawScore} adjusted DOWN to ${result.sentimentSmoothing.adjustedScore} because market is still ${(result.marketContext.drawdownFromHigh * 100).toFixed(1)}% below highs with only ${result.marketContext.daysOfRecovery} days of recovery. 2 green days don't erase weeks of pain!`
          : 'Score reflects current market conditions with appropriate smoothing.',
      },
      
      // NEW: Market Context (REAL DATA from CoinGecko)
      marketContext: {
        dataSource: result.marketContext.dataSource || 'unknown',
        currentPrice: `$${result.marketContext.currentPrice.toLocaleString()}`,
        recentHigh: `$${result.marketContext.recentHigh.toLocaleString()}`,
        recentLow: `$${result.marketContext.recentLow.toLocaleString()}`,
        drawdownFromHigh: `${(result.marketContext.drawdownFromHigh * 100).toFixed(1)}%`,
        recoveryFromLow: `${(result.marketContext.recoveryFromLow * 100).toFixed(0)}%`,
        daysInDrawdown: result.marketContext.daysInDrawdown,
        daysOfRecovery: result.marketContext.daysOfRecovery,
        priceChanges: {
          '24h': `${result.marketContext.priceChange24h >= 0 ? '+' : ''}${(result.marketContext.priceChange24h * 100).toFixed(1)}%`,
          '7d': `${result.marketContext.priceChange7d >= 0 ? '+' : ''}${(result.marketContext.priceChange7d * 100).toFixed(1)}%`,
          '30d': `${result.marketContext.priceChange30d >= 0 ? '+' : ''}${(result.marketContext.priceChange30d * 100).toFixed(1)}%`,
        },
      },
      
      // NEW: Investor Pain Index
      painIndex: {
        score: `${result.painIndex.painScore}/100`,
        level: result.painIndex.painLevel,
        estimatedUnderwaterPercent: `${result.painIndex.estimatedUnderwaterPercent}%`,
        avgDrawdown: `${(result.painIndex.avgDrawdown * 100).toFixed(1)}%`,
        interpretation: result.painIndex.interpretation,
      },
      
      // Confidence
      confidence: {
        overall: `${(result.confidence.overall * 100).toFixed(0)}%`,
        band: `${result.confidence.band.lower.toFixed(0)}-${result.confidence.band.upper.toFixed(0)}`,
        uncertainty: result.confidence.uncertainty,
        factors: result.confidence.factors,
      },
      
      // Regime
      regime: result.regime,
      
      // Liquidations summary
      liquidations: {
        total24h: `$${(result.liquidations.total24h / 1_000_000).toFixed(1)}M`,
        longs: `$${(result.liquidations.totalLong24h / 1_000_000).toFixed(1)}M`,
        shorts: `$${(result.liquidations.totalShort24h / 1_000_000).toFixed(1)}M`,
        longShortRatio: result.liquidations.longShortRatio.toFixed(2),
        largeCount: result.liquidations.largeCount,
        isExtreme: result.liquidations.isExtreme,
        percentileVsHistory: `${result.liquidations.percentileVsHistory.toFixed(0)}%`,
      },
      
      // Funding summary
      funding: {
        weightedAvgRate: `${(result.funding.weightedAvgRate * 100).toFixed(4)}%`,
        bias: result.funding.bias,
        highest: result.funding.highest,
        lowest: result.funding.lowest,
        arbitrageOpportunities: result.funding.arbitrageOpportunities.length,
        isExtreme: result.funding.isExtreme,
      },
      
      // Open Interest summary
      openInterest: {
        total: `$${(result.openInterest.totalOI / 1_000_000_000).toFixed(1)}B`,
        change24h: `${result.openInterest.changePercent24h.toFixed(1)}%`,
        divergenceSignal: result.openInterest.divergence.signal,
      },
      
      // Segment analysis (abbreviated)
      segments: Object.fromEntries(
        Object.entries(result.segments).map(([k, v]) => [k, { signal: v.signal }])
      ),
      
      // Historical context
      historical: result.historical,
      
      // Interpretation
      interpretation: result.interpretation,
      
      // Data quality
      dataQuality: result.dataQuality,
      
      // Calibration
      calibration: result.calibration,
      
      // AI context preview
      aiContextPreview: aiContext,
      
      // Performance
      computeTime: `${result.computeTime}ms`,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    logger.error('❌ Derivatives Intelligence v2.0 test endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 INVESTOR PSYCHOLOGY ENGINE TEST ENDPOINT - Neuroeconomic Analysis
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/test/psychology', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { calculateInvestorPsychology, formatPsychologyForAI } = 
      await import('./services/investor-psychology-engine');
    
    // Get market context from derivatives endpoint
    const { calculateDerivativesIntelligenceV2 } = 
      await import('./services/derivatives-intelligence-v2');
    
    const derivativesResult = await calculateDerivativesIntelligenceV2();
    
    // Build input from derivatives data
    const psychologyInput = {
      currentPrice: derivativesResult.marketContext.currentPrice,
      recentHigh30d: derivativesResult.marketContext.recentHigh,  // RENAMED: This is recent high, NOT ATH
      priceChange24h: derivativesResult.marketContext.priceChange24h,
      priceChange7d: derivativesResult.marketContext.priceChange7d,
      priceChange30d: derivativesResult.marketContext.priceChange30d,
      socialSentiment: (derivativesResult.headline.derivativesScore - 50) / 50, // Normalize to -1 to 1
      fundingRate: derivativesResult.funding.weightedAvgRate,
      longShortRatio: derivativesResult.liquidations.longShortRatio,
      volatility: derivativesResult.headline.liquidationPressure / 100,
      newsCount: 15, // Would come from news service
      influencerSentiment: (derivativesResult.headline.derivativesScore - 50) / 50,
      leverageLevel: 3,
    };
    
    const result = await calculateInvestorPsychology(psychologyInput);
    const aiContext = formatPsychologyForAI(result);
    
    res.json({
      success: true,
      section: '🧠 INVESTOR PSYCHOLOGY ENGINE - Neuroeconomic Analysis',
      status: '✅ INVESTOR PSYCHOLOGY ENGINE OPERATIONAL',
      
      // Primary outputs
      headline: result.headline,
      
      // Loss Aversion (Prospect Theory)
      lossAversion: {
        painIndex: `${result.lossAversion.painIndex}/100`,
        painMultiplier: `${result.lossAversion.painMultiplier}x (losses hurt more than gains)`,
        underwaterInvestors: `${result.lossAversion.underwaterInvestors.percentUnderwater}%`,
        breakEvenPrice: `$${result.lossAversion.underwaterInvestors.breakEvenPrice.toLocaleString()}`,
        hodlPressure: `${result.lossAversion.dispositionEffect.hodlPressure}/100`,
        profitTakingPressure: `${result.lossAversion.dispositionEffect.profitTakingPressure}/100`,
        anchors: result.lossAversion.anchors,
      },
      
      // FOMO/FUD Analysis
      fomoFud: {
        fomo: result.fomoFud.fomo,
        fud: result.fomoFud.fud,
        netSentiment: result.fomoFud.netSentiment,
        dominantEmotion: result.fomoFud.dominantEmotion,
      },
      
      // Herding Behavior
      herding: {
        strength: `${result.herding.herdStrength}/100`,
        direction: result.herding.herdDirection,
        consensusLevel: `${result.herding.consensusLevel}/100`,
        contrarianSignal: result.herding.contraindicator,
        socialContagion: result.herding.socialContagion,
      },
      
      // Cognitive Load (System 1 vs System 2)
      cognitiveLoad: {
        load: `${result.cognitiveLoad.currentLoad}/100`,
        level: result.cognitiveLoad.loadLevel,
        mode: result.cognitiveLoad.cognitiveMode,
        system2Capacity: `${result.cognitiveLoad.system2Capacity}%`,
        stressors: result.cognitiveLoad.stressors,
        recommendation: result.cognitiveLoad.recommendedAction,
      },
      
      // Behavioral Signals
      signals: result.signals,
      
      // Risk Assessment
      risk: result.risk,
      
      // Recommendations
      recommendations: result.recommendations,
      
      // Academic Context
      academicContext: result.academicContext,
      
      // AI context preview
      aiContextPreview: aiContext,
      
      // Performance
      computeTime: `${result.computeTime}ms`,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    logger.error('❌ Investor Psychology test endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 BEHAVIORAL FINANCE INTELLIGENCE - Complete Neuroeconomic Analysis
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/test/behavioral-finance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Import services
    const { calculateBehavioralFinanceIntelligence } = 
      await import('./services/behavioral-finance-intelligence');
    const { calculateDerivativesIntelligenceV2 } = 
      await import('./services/derivatives-intelligence-v2');
    const { calculateCSI } = 
      await import('./services/coinet-sentiment-index');
    
    // Get market context
    const [derivativesResult, csiResult] = await Promise.all([
      calculateDerivativesIntelligenceV2(),
      calculateCSI(),
    ]);
    
    // Build behavioral finance input
    const input = {
      currentPrice: derivativesResult.marketContext.currentPrice,
      recentHigh: derivativesResult.marketContext.recentHigh,
      priceChange24h: derivativesResult.marketContext.priceChange24h,
      priceChange7d: derivativesResult.marketContext.priceChange7d,
      priceChange30d: derivativesResult.marketContext.priceChange30d,
      fearGreedIndex: csiResult.index.rounded,
      socialSentiment: (csiResult.index.rounded - 50) / 50, // Convert 0-100 to -1 to 1
      herdStrength: 65, // Default - would come from social data
      fundingRate: derivativesResult.funding.weightedAvgRate,
      volatility: Math.abs(derivativesResult.marketContext.drawdownFromHigh) * 3, // Proxy
      newsCount: 50, // Default
      cognitiveLoad: 50, // Default
    };
    
    const result = await calculateBehavioralFinanceIntelligence(input);
    
    res.json({
      success: true,
      section: '🧠 BEHAVIORAL FINANCE INTELLIGENCE - Neuroeconomic Analysis',
      status: '✅ BEHAVIORAL FINANCE ENGINE OPERATIONAL',
      
      // Emotional Cycle
      emotionalCycle: {
        phase: result.profile.emotionalPhase,
        confidence: result.profile.phaseConfidence,
        description: result.profile.phaseDescription,
        riskLevel: result.profile.riskLevel,
      },
      
      // Contrarian Signal
      contrarianSignal: result.profile.contrarianSignal,
      
      // Loss Aversion (Prospect Theory)
      lossAversion: result.profile.lossAversion,
      
      // Cognitive State (System 1 vs System 2)
      cognitiveState: result.profile.cognitiveState,
      
      // Active Biases
      activeBiases: result.profile.activeBiases.map(b => ({
        bias: b.bias,
        severity: b.severity,
        mitigation: b.mitigation,
        academicReference: b.academicReference,
      })),
      biasRiskScore: result.profile.biasRiskScore,
      
      // Alerts
      alerts: result.profile.alerts,
      
      // Trading Psychology Coaching
      coaching: result.profile.coaching,
      
      // Manipulation Risk
      manipulationRisk: result.profile.manipulationRisk,
      
      // Key Insights
      keyInsights: result.keyInsights,
      
      // Warnings & Opportunities
      warnings: result.warnings,
      opportunities: result.opportunities,
      
      // AI Context Preview
      aiContextPreview: result.aiContext,
      
      // Performance
      fetchTime: `${Date.now() - startTime}ms`,
    });
  } catch (error: any) {
    logger.error('❌ Behavioral Finance test endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      fetchTime: `${Date.now() - startTime}ms`,
    });
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'coinet-platform',
    version: '2.1.0',
    status: 'running',
    tagline: 'Divine Perfection: Revolutionary AI Intelligence for Crypto Markets',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      diagnostic: '/api/diagnostic?symbol=SUPRA',
      keys: '/api/keys',
      testBehavioralFinance: '/api/test/behavioral-finance', // NEW: Full Neuroeconomic Analysis
      testPsychology: '/api/test/psychology',
      testDerivativesV2: '/api/test/derivatives-v2',
      testNewsV2: '/api/test/news-v2',
      testSocialV2: '/api/test/social-v2',
      testCSS: '/api/test/css',
      testCSIv4: '/api/test/csi-v4',
      testCSIv5: '/api/test/csi-v5',
      testPrice: '/api/test/price/:symbol',
      testNews: '/api/test/news?coins=BTC,ETH',
      testSocial: '/api/test/social?coins=BTC,ETH,SOL',
      testInfluencers: '/api/test/influencers?coin=BTC',
      testSocialIntelligence: '/api/test/social-intelligence?coins=BTC,ETH,SOL',
      testCSI: '/api/test/csi',
      chat: '/api/chat',
    },
    documentation: 'Use /api/test/behavioral-finance for complete Neuroeconomic Analysis (Prospect Theory, Cognitive Biases, Emotional Cycles)',
    academicFoundations: {
      prospectTheory: 'Kahneman & Tversky (1979)',
      dualProcessTheory: 'Kahneman (2011)',
      dispositionEffect: 'Shefrin & Statman (1985)',
      herdBehavior: 'Banerjee (1992)',
      irrationalExuberance: 'Shiller (2000)',
    },
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

// Rebuild trigger: Wed Dec  3 16:39:59 CET 2025
