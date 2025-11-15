/**
 * Standalone AI Data Feeder
 * Works independently without workspace dependencies
 */

import EventEmitter from 'eventemitter3';
import cron from 'node-cron';
import axios from 'axios';
import Redis from 'ioredis';
import { logger } from './logger';
import { AIMarketDataPoint, DataFeederConfig } from './types';

interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
}

export class StandaloneAIDataFeeder extends EventEmitter {
  private config: DataFeederConfig;
  private redis?: Redis;
  private priceScheduler?: cron.ScheduledTask;
  private newsScheduler?: cron.ScheduledTask;
  private aiScheduler?: cron.ScheduledTask;
  private isRunning = false;
  private dataStore: Map<string, AIMarketDataPoint> = new Map();

  constructor(config: DataFeederConfig) {
    super();
    this.config = config;

    // Initialize Redis if enabled
    if (config.enableRedisCache && process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
      logger.info('Redis cache enabled');
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Data feeder is already running');
      return;
    }

    logger.info('Starting Standalone AI Data Feeder...', {
      coins: this.config.coins.length,
      priceInterval: `${this.config.priceUpdateInterval / 1000}s`,
      newsInterval: `${this.config.newsUpdateInterval / 60000}m`,
      aiInterval: `${this.config.aiAnalysisInterval / 60000}m`,
    });

    // Initial data fetch
    await this.fetchPrices();

    // Schedule updates
    this.schedulePriceUpdates();
    if (this.config.enableSentimentAnalysis) {
      this.scheduleNewsUpdates();
    }
    this.scheduleAIAnalysis();

    this.isRunning = true;
    logger.info('Standalone AI Data Feeder started successfully ✅');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping AI Data Feeder...');
    if (this.priceScheduler) this.priceScheduler.stop();
    if (this.newsScheduler) this.newsScheduler.stop();
    if (this.aiScheduler) this.aiScheduler.stop();
    if (this.redis) await this.redis.quit();
    this.isRunning = false;
    logger.info('AI Data Feeder stopped');
  }

  private schedulePriceUpdates(): void {
    const intervalSeconds = Math.ceil(this.config.priceUpdateInterval / 1000);
    const cronExpression = `*/${intervalSeconds} * * * * *`;
    this.priceScheduler = cron.schedule(cronExpression, () => this.fetchPrices());
    logger.info('Price updates scheduled', { interval: `${intervalSeconds}s` });
  }

  private scheduleNewsUpdates(): void {
    const intervalMinutes = Math.ceil(this.config.newsUpdateInterval / 60000);
    const cronExpression = `*/${intervalMinutes} * * * *`;
    this.newsScheduler = cron.schedule(cronExpression, () => this.fetchNews());
    logger.info('News updates scheduled', { interval: `${intervalMinutes}m` });
  }

  private scheduleAIAnalysis(): void {
    const intervalMinutes = Math.ceil(this.config.aiAnalysisInterval / 60000);
    const cronExpression = `*/${intervalMinutes} * * * *`;
    this.aiScheduler = cron.schedule(cronExpression, () => this.performAIAnalysis());
    logger.info('AI analysis scheduled', { interval: `${intervalMinutes}m` });
  }

  private async fetchPrices(): Promise<void> {
    try {
      const coinIds = this.config.coins.join(',');
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=100&page=1&sparkline=false`;
      
      const response = await axios.get<CoinGeckoPrice[]>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinet-AI-DataFeeder/1.0',
        },
        timeout: 30000,
      });

      for (const price of response.data) {
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
            60,
            JSON.stringify(dataPoint.price)
          );
        }

        this.emit('data_update', {
          type: 'price_update',
          coin: price.id,
          timestamp: new Date(),
          data: dataPoint.price,
        });
      }

      logger.info('Prices updated', { count: response.data.length });
    } catch (error: any) {
      logger.error('Failed to fetch prices', { error: error.message });
    }
  }

  private async fetchNews(): Promise<void> {
    if (!process.env.CRYPTOPANIC_AUTH_TOKEN) {
      logger.warn('CryptoPanic token not set, skipping news');
      return;
    }

    try {
      const url = `https://cryptopanic.com/api/developer/v2/posts/?auth_token=${process.env.CRYPTOPANIC_AUTH_TOKEN}&public=true&currencies=${this.config.coins.map(c => c.toUpperCase()).join(',')}`;
      
      const response = await axios.get(url, {
        headers: { 'Accept': 'application/json' },
        timeout: 30000,
      });

      const articles = response.data.results || [];
      
      // Simple sentiment analysis
      for (const coin of this.config.coins) {
        const symbol = coin.toUpperCase();
        const coinArticles = articles.filter((a: any) => 
          a.currencies?.some((c: any) => c.code === symbol) ||
          a.title?.toUpperCase().includes(symbol)
        );

        if (coinArticles.length > 0) {
          const dataPoint = this.dataStore.get(coin) || {
            coin,
            timestamp: new Date(),
            price: { current: 0, change24h: 0, changePercentage24h: 0, volume24h: 0, marketCap: 0 },
            news: { count: 0, sentiment: 'neutral' as const, sentimentScore: 0, panicScore: 0, topHeadlines: [] },
          };

          // Simple sentiment calculation
          const bullish = coinArticles.filter((a: any) => 
            a.title?.toLowerCase().includes('surge') ||
            a.title?.toLowerCase().includes('rally') ||
            a.title?.toLowerCase().includes('bull')
          ).length;
          const bearish = coinArticles.filter((a: any) => 
            a.title?.toLowerCase().includes('crash') ||
            a.title?.toLowerCase().includes('drop') ||
            a.title?.toLowerCase().includes('bear')
          ).length;

          const sentimentScore = bullish > bearish ? 30 : bearish > bullish ? -30 : 0;

          dataPoint.news = {
            count: coinArticles.length,
            sentiment: sentimentScore > 20 ? 'positive' : sentimentScore < -20 ? 'negative' : 'neutral',
            sentimentScore,
            panicScore: bearish * 10,
            topHeadlines: coinArticles.slice(0, 5).map((a: any) => ({
              title: a.title,
              sentiment: sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral',
              publishedAt: new Date(a.published_at),
            })),
          };

          this.dataStore.set(coin, dataPoint);

          if (this.redis) {
            await this.redis.setex(`news:${coin}`, 300, JSON.stringify(dataPoint.news));
          }

          this.emit('data_update', {
            type: 'news_update',
            coin,
            timestamp: new Date(),
            data: dataPoint.news,
          });
        }
      }

      logger.info('News updated', { articles: articles.length });
    } catch (error: any) {
      logger.error('Failed to fetch news', { error: error.message });
    }
  }

  private async performAIAnalysis(): Promise<void> {
    try {
      for (const [coin, dataPoint] of this.dataStore.entries()) {
        const recommendation = this.generateRecommendation(dataPoint);
        const confidence = this.calculateConfidence(dataPoint);
        const reasoning = this.generateReasoning(dataPoint);
        const signals = this.detectSignals(dataPoint);

        const analysis = {
          coin,
          timestamp: new Date(),
          recommendation,
          confidence,
          reasoning,
          signals,
        };

        if (this.redis) {
          await this.redis.setex(`analysis:${coin}`, 600, JSON.stringify(analysis));
        }

        this.emit('data_update', {
          type: 'ai_analysis',
          coin,
          timestamp: new Date(),
          data: analysis,
        });
      }

      logger.info('AI analysis complete', { coins: this.dataStore.size });
    } catch (error: any) {
      logger.error('Failed to perform AI analysis', { error: error.message });
    }
  }

  private generateRecommendation(data: AIMarketDataPoint): 'buy' | 'sell' | 'hold' {
    const priceChange = data.price.changePercentage24h;
    const sentiment = data.news.sentimentScore;
    const panic = data.news.panicScore;

    if (priceChange < -10 && sentiment > 30 && panic < 30) return 'buy';
    if (priceChange > 10 && sentiment < -30) return 'sell';
    if (panic > 70) return 'sell';
    return 'hold';
  }

  private calculateConfidence(data: AIMarketDataPoint): number {
    const factors = [
      data.news.count > 5 ? 20 : 10,
      Math.abs(data.news.sentimentScore) > 30 ? 30 : 15,
      Math.abs(data.price.changePercentage24h) > 5 ? 25 : 10,
      data.price.volume24h > 1000000000 ? 25 : 15,
    ];
    return Math.min(100, factors.reduce((sum, f) => sum + f, 0));
  }

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
    return parts.join('. ') || 'No significant signals detected';
  }

  private detectSignals(data: AIMarketDataPoint): Array<{ type: string; strength: number; description: string }> {
    const signals: Array<{ type: string; strength: number; description: string }> = [];
    if (Math.abs(data.price.changePercentage24h) > 5) {
      signals.push({
        type: 'price_momentum',
        strength: Math.min(100, Math.abs(data.price.changePercentage24h) * 10),
        description: `Strong ${data.price.changePercentage24h > 0 ? 'upward' : 'downward'} momentum`,
      });
    }
    if (Math.abs(data.news.sentimentScore) > 30) {
      signals.push({
        type: 'news_sentiment',
        strength: Math.min(100, Math.abs(data.news.sentimentScore)),
        description: `${data.news.sentiment === 'positive' ? 'Positive' : 'Negative'} news sentiment`,
      });
    }
    if (data.news.panicScore > 50) {
      signals.push({
        type: 'panic',
        strength: data.news.panicScore,
        description: 'High market panic detected',
      });
    }
    return signals;
  }

  getDataPoint(coin: string): AIMarketDataPoint | undefined {
    return this.dataStore.get(coin);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      coinsTracked: this.config.coins.length,
      dataPoints: this.dataStore.size,
      lastUpdate: Array.from(this.dataStore.values())[0]?.timestamp,
    };
  }
}

