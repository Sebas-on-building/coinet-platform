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

// Type imports (these are safe - no runtime code)
import type { CoinGeckoRestClient } from '@coinet/market-prices';
import type { CryptoPanicNewsService } from '@coinet/market-prices';
import type { CryptoPanicSentimentAnalyzer } from '@coinet/market-prices';
import type { CryptoPanicRestClient } from '@coinet/market-prices';
import type { CryptoPanicPlan } from '@coinet/market-prices';

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
   */
  private async loadMarketPricesModules() {
    try {
      // Try package name first, then fallback to absolute/relative paths
      let marketPrices;
      try {
        marketPrices = await import('@coinet/market-prices');
      } catch (packageError) {
        // Fallback to absolute path in Docker container
        logger.warn('Package import failed, trying absolute path', { error: packageError });
        try {
          // In Docker: /app/services/market-prices/dist/index.js
          marketPrices = await import('/app/services/market-prices/dist/index.js');
        } catch (absoluteError) {
          // Fallback to relative path (from dist/data-feeder.js to market-prices/dist/index.js)
          logger.warn('Absolute path failed, trying relative path', { error: absoluteError });
          marketPrices = await import('../../market-prices/dist/index.js');
        }
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
          const cryptoPanicClient = new CryptoPanicRestClient({
            authToken: process.env.CRYPTOPANIC_AUTH_TOKEN,
            plan: (process.env.CRYPTOPANIC_PLAN as CryptoPanicPlan) || CryptoPanicPlan.DEVELOPMENT,
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
    } catch (error) {
      logger.error('Failed to load market-prices modules', { error });
      throw error;
    }
    
    // Initialize Redis if enabled
    try {
      if (this.config.enableRedisCache && process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        logger.info('Redis cache enabled');
      }
    } catch (error) {
      logger.warn('Failed to initialize Redis (continuing without cache)', { error });
      // Don't throw - Redis is optional
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
    await this.loadMarketPricesModules();

    // Initial data fetch
    await this.fetchAllData();

    // Schedule price updates (every minute)
    this.schedulePriceUpdates();

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

    // Disconnect Redis
    if (this.redis) {
      await this.redis.quit();
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
    try {
      logger.debug('Fetching prices from CoinGecko', {
        coins: this.config.coins.length,
      });

      const markets = await this.coinGecko.getCoinMarkets('usd', this.config.coins);
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

