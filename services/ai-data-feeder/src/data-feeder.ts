/**
 * AI Data Feeder Service
 * Continuously feeds AI with market data from CoinGecko and CryptoPanic
 */

import EventEmitter from 'eventemitter3';
import cron from 'node-cron';
// Lazy imports from market-prices package to avoid crashes on module load
// We'll import these dynamically when needed
import Redis from 'ioredis';
import { AIMarketDataPoint, AIAnalysisResult, DataFeederConfig, DataFeedEvent } from './types';
import { logger } from './logger';

// Type definitions (local types to avoid build-time dependency)
// These types match the market-prices package but are defined locally
// to avoid requiring the package at build time
type CoinGeckoRestClient = any;
type CryptoPanicNewsService = any;
type CryptoPanicSentimentAnalyzer = any;
type CryptoPanicRestClient = any;
type CryptoPanicPlan = any;

export class AIDataFeeder extends EventEmitter {
  private config: DataFeederConfig;
  private coinGecko!: CoinGeckoRestClient;
  private cryptoPanicNews?: CryptoPanicNewsService;
  private cryptoPanicSentiment?: CryptoPanicSentimentAnalyzer;
  private redis?: Redis;
  
  private priceScheduler?: cron.ScheduledTask;
  private newsScheduler?: cron.ScheduledTask;
  private aiScheduler?: cron.ScheduledTask;
  
  private isRunning = false;
  private dataStore: Map<string, AIMarketDataPoint> = new Map();

  constructor(config: DataFeederConfig) {
    super();
    this.config = config;
  }

  /**
   * Lazy load market-prices modules to avoid crashes on import
   * Using require() since compiled code is CommonJS
   */
  private async loadMarketPricesModules() {
    try {
      // Use dynamic require() - this will be CommonJS at runtime
      const path = require('path');
      const fs = require('fs');
      
      // Debug: Log current directory and check file existence
      const currentDir = __dirname;
      logger.info('Loading market-prices modules', { currentDir });
      
      // Check multiple possible locations
      const possiblePaths = [
        '/app/services/market-prices/dist/index.js',
        path.resolve(currentDir, '../../market-prices/dist/index.js'),
        path.resolve(currentDir, '../../../market-prices/dist/index.js'),
        path.resolve('/app', 'services/market-prices/dist/index.js'),
      ];
      
      logger.info('Checking possible paths', { paths: possiblePaths });
      
      let marketPrices;
      let foundPath: string | null = null;
      
      // Try package name first
      try {
        marketPrices = require('@coinet/market-prices');
        foundPath = '@coinet/market-prices';
        logger.info('✅ Successfully loaded via package name');
      } catch (packageError: any) {
        logger.warn('Package require failed', { error: packageError?.message || String(packageError) });
        
        // Try all possible paths
        for (const tryPath of possiblePaths) {
          try {
            if (fs.existsSync(tryPath)) {
              logger.info(`Found file at ${tryPath}, attempting require...`);
              marketPrices = require(tryPath);
              foundPath = tryPath;
              logger.info(`✅ Successfully loaded from ${tryPath}`);
              break;
            } else {
              logger.debug(`File not found: ${tryPath}`);
            }
          } catch (pathError: any) {
            logger.warn(`Failed to require ${tryPath}`, { error: pathError?.message || String(pathError) });
            continue;
          }
        }
        
        if (!foundPath) {
          logger.warn('⚠️  market-prices module not found - service will run with limited functionality', {
            checkedPaths: possiblePaths,
            currentDir,
          });
          return false; // Return false instead of throwing
        }
      }
      
      if (!marketPrices) {
        logger.warn('⚠️  market-prices module is null/undefined - service will run with limited functionality');
        return false; // Return false instead of throwing
      }
      
      const { CoinGeckoRestClient, CryptoPanicRestClient, CryptoPanicNewsService, CryptoPanicSentimentAnalyzer, CryptoPanicPlan } = marketPrices;
      
      // Initialize CoinGecko
      this.coinGecko = new CoinGeckoRestClient({
        apiKey: process.env.COINGECKO_API_KEY || '',
        apiUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
        rateLimit: {
          maxRequestsPerMinute: 50,
          reservoir: 50,
          reservoirRefreshAmount: 50,
          reservoirRefreshInterval: 60 * 1000,
        },
        retry: {
          retries: 3,
          retryDelay: 1000,
        },
        priority: 1,
      });
      
      // Initialize CryptoPanic if token available
      if (process.env.CRYPTOPANIC_AUTH_TOKEN) {
        try {
          // Parse plan from environment variable (handle cases where it might include variable name)
          let planEnv = process.env.CRYPTOPANIC_PLAN || 'development';
          // Fix: Remove variable name prefix if present (e.g., "CRYPTOPANIC_PLAN=development" -> "development")
          if (planEnv.includes('=')) {
            planEnv = planEnv.split('=').pop() || 'development';
          }
          planEnv = planEnv.trim().toLowerCase();
          
          // Convert string to CryptoPanicPlan enum
          let plan: CryptoPanicPlan = CryptoPanicPlan.DEVELOPMENT;
          if (planEnv === 'development' || planEnv === 'developer') {
            plan = CryptoPanicPlan.DEVELOPMENT;
          } else if (planEnv === 'growth') {
            plan = CryptoPanicPlan.GROWTH;
          } else if (planEnv === 'enterprise') {
            plan = CryptoPanicPlan.ENTERPRISE;
          }
          
          const cryptoPanicClient = new CryptoPanicRestClient({
            authToken: process.env.CRYPTOPANIC_AUTH_TOKEN,
            plan,
            enableCaching: true,
          });
          
          this.cryptoPanicNews = new CryptoPanicNewsService({
            client: cryptoPanicClient,
            enableCaching: true,
          });
          
          this.cryptoPanicSentiment = new CryptoPanicSentimentAnalyzer();
        } catch (error) {
          logger.warn('Failed to initialize CryptoPanic (continuing without it)', { error });
          // Don't throw - CryptoPanic is optional
        }
      }
      
      return true; // Successfully loaded
    } catch (error) {
      logger.error('Failed to load market-prices modules', { error });
      logger.warn('⚠️  Service will continue without market-prices features');
      return false; // Return false instead of throwing
    }
    
    // Initialize Redis if enabled - with proper error handling
    if (this.config.enableRedisCache && process.env.REDIS_URL) {
      try {
        let redisUrl = process.env.REDIS_URL;
        
        // Fix common issue: Railway sometimes includes variable name in value
        // e.g., "REDIS_URL=redis://..." instead of just "redis://..."
        if (redisUrl.startsWith('REDIS_URL=')) {
          redisUrl = redisUrl.substring('REDIS_URL='.length);
          logger.debug('Fixed Redis URL format (removed variable name prefix)');
        }
        
        // Trim whitespace
        redisUrl = redisUrl.trim();
        
        // Validate Redis URL format
        if (!redisUrl || (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://'))) {
          logger.warn('Invalid Redis URL format (should start with redis:// or rediss://), disabling Redis cache', { 
            url: redisUrl ? `${redisUrl.substring(0, 20)}...` : 'undefined' 
          });
          return;
        }
        
        // Create Redis client with connection options
        this.redis = new Redis(redisUrl, {
          retryStrategy: (times: number) => {
            // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, max 3000ms
            const delay = Math.min(times * 50, 3000);
            logger.debug(`Redis retry attempt ${times}, waiting ${delay}ms`);
            return delay;
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: true, // Allow queuing commands when offline (needed for initial ping)
          connectTimeout: 10000, // 10 seconds
          lazyConnect: false, // Connect immediately
        });
        
        // Handle connection events
        this.redis.on('connect', () => {
          logger.info('Redis connected successfully');
        });
        
        this.redis.on('ready', () => {
          logger.info('Redis ready to accept commands');
          // Test connection with a ping after ready
          this.redis!.ping().then(() => {
            logger.info('Redis cache enabled and connected');
          }).catch((error: Error) => {
            logger.warn('Redis ping failed after ready event', { error: error.message });
            // Don't disable Redis here - connection is established, ping might fail for other reasons
          });
        });
        
        this.redis.on('error', (error: Error) => {
          // Log error but don't crash - Redis is optional
          logger.warn('Redis connection error (continuing without cache)', { 
            error: error.message,
            code: (error as any).code,
          });
          // Only disable Redis on critical connection errors
          if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ENOTFOUND') {
            this.redis = undefined;
          }
        });
        
        this.redis.on('close', () => {
          logger.warn('Redis connection closed');
        });
        
        this.redis.on('reconnecting', (delay: number) => {
          logger.info(`Redis reconnecting in ${delay}ms`);
        });
        
      } catch (error: any) {
        logger.warn('Failed to initialize Redis (continuing without cache)', { 
          error: error?.message || String(error) 
        });
        this.redis = undefined;
        // Don't throw - Redis is optional
      }
    } else {
      logger.info('Redis cache disabled (not configured)');
    }
  }

  /**
   * Start the data feeder
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Data feeder is already running');
      return;
    }

    logger.info('Starting AI Data Feeder...', {
      coins: this.config.coins.length,
      priceInterval: `${this.config.priceUpdateInterval / 1000}s`,
      newsInterval: `${this.config.newsUpdateInterval / 1000}s`,
      aiInterval: `${this.config.aiAnalysisInterval / 1000}s`,
    });

    // Lazy load market-prices modules first
    const marketPricesLoaded = await this.loadMarketPricesModules();
    
    if (!marketPricesLoaded) {
      logger.warn('⚠️  market-prices module not available - service will run with limited functionality');
      logger.warn('⚠️  Price updates and news features will be disabled');
      // Continue without market-prices - service can still run basic functionality
    }

    // Initial data fetch (only if market-prices is loaded)
    if (marketPricesLoaded) {
      await this.fetchAllData();
    } else {
      logger.info('Skipping initial data fetch (market-prices not available)');
    }

    // Schedule price updates (every minute) - only if market-prices is loaded
    if (marketPricesLoaded && this.coinGecko) {
      this.schedulePriceUpdates();
    } else {
      logger.info('Skipping price updates schedule (market-prices not available)');
    }

    // Schedule news updates (every 5 minutes)
    if (this.cryptoPanicNews) {
      this.scheduleNewsUpdates();
    }

    // Schedule AI analysis (every 10 minutes)
    this.scheduleAIAnalysis();

    this.isRunning = true;
    logger.info('AI Data Feeder started successfully ✅');
  }

  /**
   * Stop the data feeder
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping AI Data Feeder...');

    // Stop schedulers
    if (this.priceScheduler) this.priceScheduler.stop();
    if (this.newsScheduler) this.newsScheduler.stop();
    if (this.aiScheduler) this.aiScheduler.stop();

    // Disconnect Redis gracefully
    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('Redis disconnected gracefully');
      } catch (error: any) {
        logger.warn('Error disconnecting Redis', { error: error?.message || String(error) });
        // Force disconnect if quit fails
        try {
          this.redis.disconnect();
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
      }
      this.redis = undefined;
    }

    this.isRunning = false;
    logger.info('AI Data Feeder stopped');
  }

  /**
   * Schedule price updates
   */
  private schedulePriceUpdates(): void {
    const intervalSeconds = Math.ceil(this.config.priceUpdateInterval / 1000);
    const cronExpression = `*/${intervalSeconds} * * * * *`;

    this.priceScheduler = cron.schedule(cronExpression, async () => {
      await this.fetchPrices();
    });

    logger.info('Price updates scheduled', { interval: `${intervalSeconds}s` });
  }

  /**
   * Schedule news updates
   */
  private scheduleNewsUpdates(): void {
    const intervalMinutes = Math.ceil(this.config.newsUpdateInterval / 60000);
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.newsScheduler = cron.schedule(cronExpression, async () => {
      await this.fetchNews();
    });

    logger.info('News updates scheduled', { interval: `${intervalMinutes}m` });
  }

  /**
   * Schedule AI analysis
   */
  private scheduleAIAnalysis(): void {
    const intervalMinutes = Math.ceil(this.config.aiAnalysisInterval / 60000);
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.aiScheduler = cron.schedule(cronExpression, async () => {
      await this.performAIAnalysis();
    });

    logger.info('AI analysis scheduled', { interval: `${intervalMinutes}m` });
  }

  /**
   * Fetch all data (initial load)
   */
  private async fetchAllData(): Promise<void> {
    logger.info('Fetching initial data...');
    
    await Promise.all([
      this.fetchPrices(),
      this.cryptoPanicNews ? this.fetchNews() : Promise.resolve(),
    ]);
    
    logger.info('Initial data fetch complete');
  }

  /**
   * Fetch prices from CoinGecko
   */
  private async fetchPrices(): Promise<void> {
    if (!this.coinGecko) {
      logger.warn('Skipping price fetch - CoinGecko client not available (market-prices module not loaded)');
      return;
    }
    
    try {
      // Clean and validate coins array
      const coins = this.config.coins
        .map(coin => coin.trim().toLowerCase())
        .filter(coin => coin.length > 0 && !coin.includes('=')); // Remove any malformed entries
      
      if (coins.length === 0) {
        logger.warn('No valid coins to fetch, using defaults');
        coins.push('bitcoin', 'ethereum', 'solana', 'cardano', 'avalanche-2');
      }
      
      logger.debug('Fetching prices from CoinGecko', {
        coins: coins.length,
        coinIds: coins.slice(0, 5), // Log first 5 for debugging
      });

      const markets = await this.coinGecko.getCoinMarkets('usd', coins);
      // Convert CoinGeckoMarket to our format
      const prices = markets.map(m => ({
        id: m.id,
        symbol: m.symbol,
        name: m.name,
        current_price: m.current_price,
        price_change_24h: m.price_change_24h,
        price_change_percentage_24h: m.price_change_percentage_24h,
        high_24h: m.high_24h,
        low_24h: m.low_24h,
        total_volume: m.total_volume,
        market_cap: m.market_cap,
      }));

      for (const price of prices) {
        const dataPoint = this.dataStore.get(price.id) || {
          coin: price.id,
          timestamp: new Date(),
          price: {
            current: 0,
            change24h: 0,
            changePercentage24h: 0,
            volume24h: 0,
            marketCap: 0,
          },
          news: {
            count: 0,
            sentiment: 'neutral' as const,
            sentimentScore: 0,
            panicScore: 0,
            topHeadlines: [],
          },
        };

        // Update price data
        dataPoint.price = {
          current: price.current_price,
          change24h: price.price_change_24h,
          changePercentage24h: price.price_change_percentage_24h,
          high24h: price.high_24h,
          low24h: price.low_24h,
          volume24h: price.total_volume,
          marketCap: price.market_cap,
        };
        dataPoint.timestamp = new Date();

        this.dataStore.set(price.id, dataPoint);

        // Cache in Redis
        if (this.redis) {
          await this.redis.setex(
            `price:${price.id}`,
            60, // 1 minute TTL
            JSON.stringify(dataPoint.price)
          );
        }

        // Emit event
        this.emit('data_update', {
          type: 'price_update',
          coin: price.id,
          timestamp: new Date(),
          data: dataPoint.price,
        } as DataFeedEvent);
      }

      logger.info('Prices updated', { count: prices.length });
    } catch (error) {
      logger.error('Failed to fetch prices', { error });
      this.emit('error', {
        type: 'error',
        coin: 'all',
        timestamp: new Date(),
        data: error,
      } as DataFeedEvent);
    }
  }

  /**
   * Fetch news from CryptoPanic
   */
  private async fetchNews(): Promise<void> {
    if (!this.cryptoPanicNews || !this.cryptoPanicSentiment) {
      return;
    }

    try {
      logger.debug('Fetching news from CryptoPanic');

      const symbols = this.config.coins.map(c => c.toUpperCase());
      const articles = await this.cryptoPanicNews.fetchNews({
        currencies: symbols,
      });
      // Limit articles to maxNewsArticles
      const limitedArticles = articles.slice(0, this.config.maxNewsArticles);

      // Analyze sentiment
      const analyses = this.cryptoPanicSentiment.analyzeBatch(limitedArticles);
      const overview = this.cryptoPanicSentiment.getMarketSentimentOverview();

      // Update news data for each coin
      for (const coin of this.config.coins) {
        const symbol = coin.toUpperCase();
        const coinArticles = limitedArticles.filter(a => 
          a.currencies.some(c => c.code === symbol)
        );

        if (coinArticles.length > 0) {
          const dataPoint = this.dataStore.get(coin) || {
            coin,
            timestamp: new Date(),
            price: {
              current: 0,
              change24h: 0,
              changePercentage24h: 0,
              volume24h: 0,
              marketCap: 0,
            },
            news: {
              count: 0,
              sentiment: 'neutral' as const,
              sentimentScore: 0,
              panicScore: 0,
              topHeadlines: [],
            },
          };

          // Calculate average sentiment for this coin
          const coinAnalyses = analyses.filter(a =>
            coinArticles.find(ca => ca.id === a.article.id)
          );

          const avgSentiment = coinAnalyses.reduce((sum, a) => sum + a.sentimentScore, 0) / coinAnalyses.length;
          const avgPanic = coinAnalyses.reduce((sum, a) => sum + a.panicScore, 0) / coinAnalyses.length;

          dataPoint.news = {
            count: coinArticles.length,
            sentiment: avgSentiment > 20 ? 'positive' : avgSentiment < -20 ? 'negative' : 'neutral',
            sentimentScore: Math.round(avgSentiment),
            panicScore: Math.round(avgPanic),
            topHeadlines: coinArticles.slice(0, 5).map(a => ({
              title: a.title,
              sentiment: a.sentiment,
              publishedAt: a.publishedAt,
            })),
          };

          this.dataStore.set(coin, dataPoint);

          // Cache in Redis
          if (this.redis) {
            await this.redis.setex(
              `news:${coin}`,
              300, // 5 minutes TTL
              JSON.stringify(dataPoint.news)
            );
          }

          // Emit event
          this.emit('data_update', {
            type: 'news_update',
            coin,
            timestamp: new Date(),
            data: dataPoint.news,
          } as DataFeedEvent);
        }
      }

      logger.info('News updated', { 
        articles: limitedArticles.length,
        avgSentiment: overview.averageSentimentScore,
        avgPanic: overview.averagePanicScore,
      });
    } catch (error) {
      logger.error('Failed to fetch news', { error });
      this.emit('error', {
        type: 'error',
        coin: 'all',
        timestamp: new Date(),
        data: error,
      } as DataFeedEvent);
    }
  }

  /**
   * Perform AI analysis
   */
  private async performAIAnalysis(): Promise<void> {
    try {
      logger.debug('Performing AI analysis');

      for (const [coin, dataPoint] of this.dataStore.entries()) {
        // Simple AI analysis (you can enhance this with your AI service)
        const analysis: AIAnalysisResult = {
          coin,
          timestamp: new Date(),
          recommendation: this.generateRecommendation(dataPoint),
          confidence: this.calculateConfidence(dataPoint),
          reasoning: this.generateReasoning(dataPoint),
          signals: this.detectSignals(dataPoint),
        };

        // Cache in Redis
        if (this.redis) {
          await this.redis.setex(
            `analysis:${coin}`,
            600, // 10 minutes TTL
            JSON.stringify(analysis)
          );
        }

        // Emit event
        this.emit('data_update', {
          type: 'ai_analysis',
          coin,
          timestamp: new Date(),
          data: analysis,
        } as DataFeedEvent);
      }

      logger.info('AI analysis complete', { coins: this.dataStore.size });
    } catch (error) {
      logger.error('Failed to perform AI analysis', { error });
      this.emit('error', {
        type: 'error',
        coin: 'all',
        timestamp: new Date(),
        data: error,
      } as DataFeedEvent);
    }
  }

  /**
   * Generate recommendation based on data
   */
  private generateRecommendation(data: AIMarketDataPoint): 'buy' | 'sell' | 'hold' {
    const priceChange = data.price.changePercentage24h;
    const sentiment = data.news.sentimentScore;
    const panic = data.news.panicScore;

    // Simple logic (enhance with your AI)
    if (priceChange < -10 && sentiment > 30 && panic < 30) return 'buy';
    if (priceChange > 10 && sentiment < -30) return 'sell';
    if (panic > 70) return 'sell';
    
    return 'hold';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(data: AIMarketDataPoint): number {
    const factors = [
      data.news.count > 5 ? 20 : 10,
      Math.abs(data.news.sentimentScore) > 30 ? 30 : 15,
      Math.abs(data.price.changePercentage24h) > 5 ? 25 : 10,
      data.price.volume24h > 1000000000 ? 25 : 15,
    ];

    return Math.min(100, factors.reduce((sum, f) => sum + f, 0));
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(data: AIMarketDataPoint): string {
    const parts: string[] = [];

    if (Math.abs(data.price.changePercentage24h) > 5) {
      parts.push(`Price ${data.price.changePercentage24h > 0 ? 'increased' : 'decreased'} ${Math.abs(data.price.changePercentage24h).toFixed(2)}%`);
    }

    if (data.news.count > 0) {
      parts.push(`${data.news.count} news articles with ${data.news.sentiment} sentiment`);
    }

    if (data.news.panicScore > 50) {
      parts.push(`High panic score (${data.news.panicScore}/100)`);
    }

    return parts.join('. ');
  }

  /**
   * Detect signals
   */
  private detectSignals(data: AIMarketDataPoint): Array<{ type: string; strength: number; description: string }> {
    const signals: Array<{ type: string; strength: number; description: string }> = [];

    // Price momentum
    if (Math.abs(data.price.changePercentage24h) > 5) {
      signals.push({
        type: 'price_momentum',
        strength: Math.min(100, Math.abs(data.price.changePercentage24h) * 10),
        description: `Strong ${data.price.changePercentage24h > 0 ? 'upward' : 'downward'} momentum`,
      });
    }

    // News sentiment
    if (Math.abs(data.news.sentimentScore) > 30) {
      signals.push({
        type: 'news_sentiment',
        strength: Math.min(100, Math.abs(data.news.sentimentScore)),
        description: `${data.news.sentiment === 'positive' ? 'Positive' : 'Negative'} news sentiment`,
      });
    }

    // Panic indicator
    if (data.news.panicScore > 50) {
      signals.push({
        type: 'panic',
        strength: data.news.panicScore,
        description: 'High market panic detected',
      });
    }

    return signals;
  }

  /**
   * Get current data for a coin
   */
  getDataPoint(coin: string): AIMarketDataPoint | undefined {
    return this.dataStore.get(coin);
  }

  /**
   * Get all data points
   */
  getAllDataPoints(): Map<string, AIMarketDataPoint> {
    return new Map(this.dataStore);
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      coinsTracked: this.config.coins.length,
      dataPoints: this.dataStore.size,
      lastUpdate: Array.from(this.dataStore.values())[0]?.timestamp,
    };
  }
}

