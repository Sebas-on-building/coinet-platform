/**
 * Production Data Aggregator Service
 * Fetches real data from multiple sources
 */

import express from 'express';
import { WebSocket } from 'ws';
import { Redis } from 'ioredis';
import { Kafka } from 'kafkajs';
import axios from 'axios';
import pLimit from 'p-limit';

// Data source adapters
class BinanceAdapter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];

  async connect(onData: (data: unknown) => void): Promise<void> {
    const streams = this.symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      // console.log('Connected to Binance WebSocket');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        onData({
          source: 'binance',
          type: 'ticker',
          data: {
            symbol: parsed.s,
            price: parseFloat(parsed.c),
            volume: parseFloat(parsed.v),
            change24h: parseFloat(parsed.P),
            timestamp: parsed.E
          }
        });
      } catch (error) {
        // console.error('Error parsing Binance data:', error);
      }
    });

    this.ws.on('error', (_error: unknown) => {
      // console.error('Binance WebSocket error:', error);
    });

    this.ws.on('close', () => {
      // console.log('Binance WebSocket closed');
      this.reconnect(onData);
    });
  }

  private async reconnect(onData: (data: unknown) => void): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    // console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => this.connect(onData), delay);
  }

  async fetchHistorical(symbol: string, interval: string = '1h', limit: number = 100): Promise<unknown> {
    const url = `https://api.binance.com/api/v3/klines`;
    const response = await axios.get(url, {
      params: { symbol, interval, limit }
    });
    
    return response.data.map((candle: unknown[]) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1] as string),
      high: parseFloat(candle[2] as string),
      low: parseFloat(candle[3] as string),
      close: parseFloat(candle[4] as string),
      volume: parseFloat(candle[5] as string)
    }));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

class CoinGeckoAdapter {
  private apiKey = process.env.COINGECKO_API_KEY;
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private limit = pLimit(10); // Rate limit: 10 concurrent requests

  async fetchTrending(): Promise<unknown> {
    return this.limit(async () => {
      const response = await axios.get(`${this.baseUrl}/search/trending`, {
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });
      return response.data.coins;
    });
  }

  async fetchMarketData(coinIds: string[]): Promise<unknown> {
    return this.limit(async () => {
      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: coinIds.join(','),
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: true,
          price_change_percentage: '1h,24h,7d'
        },
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });
      return response.data;
    });
  }

  async fetchCoinDetails(coinId: string): Promise<unknown> {
    return this.limit(async () => {
      const response = await axios.get(`${this.baseUrl}/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: true,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: true
        },
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });
      return response.data;
    });
  }
}

class NewsAggregator {
  private sources = [
    { name: 'cryptopanic', url: process.env.CRYPTOPANIC_API_URL },
    { name: 'newsapi', url: process.env.NEWSAPI_URL }
  ];

  async fetchLatestNews(query?: string): Promise<unknown[]> {
    const newsPromises = this.sources.map(async (source) => {
      try {
        if (source.name === 'cryptopanic' && process.env.CRYPTOPANIC_API_KEY) {
          const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
            params: {
              auth_token: process.env.CRYPTOPANIC_API_KEY,
              currencies: query,
              kind: 'news',
              filter: 'important'
            }
          });
          return response.data.results.map((item: { title: string; url: string; published_at: string; votes?: { positive: number; negative: number; important: number; }; }) => ({
            source: 'cryptopanic',
            title: item.title,
            url: item.url,
            publishedAt: item.published_at,
            sentiment: item.votes?.positive as number > (item.votes?.negative as number) ? 'positive' : 'negative',
            importance: item.votes?.important || 0
          }));
        }

        if (source.name === 'newsapi' && process.env.NEWSAPI_KEY) {
          const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
              q: query || 'cryptocurrency',
              sortBy: 'publishedAt',
              language: 'en',
              apiKey: process.env.NEWSAPI_KEY
            }
          });
          return response.data.articles.map((article: { title: string; description: string; url: string; publishedAt: string; author: string; }) => ({
            source: 'newsapi',
            title: article.title,
            description: article.description,
            url: article.url,
            publishedAt: article.publishedAt,
            author: article.author
          }));
        }

        return [];
      } catch (error) {
        // console.error(`Error fetching news from ${source.name}:`, error);
        return [];
      }
    });

    const results = await Promise.all(newsPromises);
    return results.flat();
  }
}

class SocialDataAggregator {
  async fetchTwitterSentiment(query: string): Promise<unknown> {
    // Twitter API v2 integration
    if (!process.env.TWITTER_BEARER_TOKEN) {
      return { error: 'Twitter API not configured' };
    }

    try {
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        params: {
          query: `${query} -is:retweet lang:en`,
          max_results: 100,
          'tweet.fields': 'created_at,public_metrics,context_annotations'
        },
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
        }
      });

      const tweets = response.data.data || [];
      const totalEngagement = tweets.reduce((sum: number, tweet: { public_metrics?: { like_count?: number; retweet_count?: number; }; }) => 
        sum + (tweet.public_metrics?.like_count || 0) + 
        (tweet.public_metrics?.retweet_count || 0), 0
      );

      return {
        tweetCount: tweets.length,
        averageEngagement: tweets.length > 0 ? totalEngagement / tweets.length : 0,
        topTweets: tweets.slice(0, 5)
      };
    } catch (error) {
      // console.error('Twitter API error:', error);
      return { error: 'Failed to fetch Twitter data' };
    }
  }

  async fetchRedditSentiment(subreddit: string = 'cryptocurrency'): Promise<unknown> {
    try {
      const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json`, {
        params: { limit: 50 }
      });

      const posts = response.data.data.children;
      const totalScore = posts.reduce((sum: number, post: { data: { score: number; }; }) => 
        sum + post.data.score, 0
      );

      return {
        postCount: posts.length,
        averageScore: posts.length > 0 ? totalScore / posts.length : 0,
        topPosts: posts.slice(0, 5).map((post: { data: { title: string; score: number; num_comments: number; permalink: string; }; }) => ({
          title: post.data.title,
          score: post.data.score,
          comments: post.data.num_comments,
          url: `https://reddit.com${post.data.permalink}`
        }))
      };
    } catch (error) {
      // console.error('Reddit API error:', error);
      return { error: 'Failed to fetch Reddit data' };
    }
  }
}

class OnChainDataAggregator {
  async fetchGasPrice(): Promise<unknown> {
    try {
      const response = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'gastracker',
          action: 'gasoracle',
          apikey: process.env.ETHERSCAN_API_KEY
        }
      });
      return response.data.result;
    } catch (error) {
      // console.error('Etherscan API error:', error);
      return null;
    }
  }

  async fetchWhaleTransactions(_address?: string): Promise<unknown> {
    try {
      const response = await axios.get('https://api.whale-alert.io/v1/transactions', {
        params: {
          api_key: process.env.WHALE_ALERT_API_KEY,
          min_value: 1000000, // $1M+ transactions
          limit: 100
        }
      });
      return response.data.transactions;
    } catch (error) {
      // console.error('Whale Alert API error:', error);
      return [];
    }
  }
}

// Main Data Aggregator Service
export class DataAggregatorService {
  private app: express.Application;
  private redis?: Redis;
  private kafka?: Kafka;
  private binance: BinanceAdapter;
  private coingecko: CoinGeckoAdapter;
  private news: NewsAggregator;
  private social: SocialDataAggregator;
  private onchain: OnChainDataAggregator;

  constructor() {
    this.app = express();
    this.app.use(express.json());

    // Initialize Redis (optional)
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'redis-master',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 2000,
        lazyConnect: true
      });
    } catch (_error: unknown) {
      // console.warn('Redis not available, continuing without cache');
    }

    // Initialize Kafka (optional)
    try {
      this.kafka = new Kafka({
        clientId: 'data-aggregator',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        connectionTimeout: 2000,
        requestTimeout: 2000
      });
    } catch (_error: unknown) {
      // console.warn('Kafka not available, continuing without streaming');
    }

    // Initialize data adapters
    this.binance = new BinanceAdapter();
    this.coingecko = new CoinGeckoAdapter();
    this.news = new NewsAggregator();
    this.social = new SocialDataAggregator();
    this.onchain = new OnChainDataAggregator();

    this.setupRoutes();
    this.startDataStreams();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        timestamp: Date.now(),
        services: {
          redis: this.redis?.status === 'ready' || false,
          kafka: !!this.kafka,
          binance: true
        }
      });
    });

    // Readiness check
    this.app.get('/ready', (req, res) => {
      res.json({
        status: 'ready',
        timestamp: Date.now()
      });
    });

    // Market data endpoints
    this.app.get('/api/market/ticker/:symbol', async (req, res) => {
      try {
        const cached = await this.redis?.get(`ticker:${req.params.symbol}`);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const data = await this.binance.fetchHistorical(req.params.symbol, '1m', 1);
        await this.redis?.setex(`ticker:${req.params.symbol}`, 10, JSON.stringify(data[0]));
        res.json(data[0]);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ticker data' });
      }
    });

    this.app.get('/api/market/trending', async (req, res) => {
      try {
        const cached = await this.redis?.get('trending');
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const data = await this.coingecko.fetchTrending();
        await this.redis?.setex('trending', 300, JSON.stringify(data));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trending data' });
      }
    });

    // News endpoints
    this.app.get('/api/news/latest', async (req, res) => {
      try {
        const query = req.query.q as string;
        const cached = await this.redis?.get(`news:${query || 'all'}`);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const data = await this.news.fetchLatestNews(query);
        await this.redis?.setex(`news:${query || 'all'}`, 300, JSON.stringify(data));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
      }
    });

    // Social sentiment endpoints
    this.app.get('/api/social/twitter/:query', async (req, res) => {
      try {
        const data = await this.social.fetchTwitterSentiment(req.params.query);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Twitter data' });
      }
    });

    this.app.get('/api/social/reddit/:subreddit?', async (req, res) => {
      try {
        const data = await this.social.fetchRedditSentiment(req.params.subreddit);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Reddit data' });
      }
    });

    // On-chain data endpoints
    this.app.get('/api/onchain/gas', async (req, res) => {
      try {
        const data = await this.onchain.fetchGasPrice();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch gas price' });
      }
    });

    this.app.get('/api/onchain/whales', async (req, res) => {
      try {
        const data = await this.onchain.fetchWhaleTransactions();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch whale transactions' });
      }
    });

    // Aggregated endpoint for Coinet AI
    this.app.post('/api/aggregate', async (req, res) => {
      try {
        const { symbol, includeNews, includeSocial, includeOnchain } = req.body;

        const results: Record<string, unknown> = {
          market: await this.binance.fetchHistorical(symbol, '1h', 24),
          timestamp: Date.now()
        };

        if (includeNews) {
          results.news = await this.news.fetchLatestNews(symbol);
        }

        if (includeSocial) {
          results.social = {
            twitter: await this.social.fetchTwitterSentiment(symbol),
            reddit: await this.social.fetchRedditSentiment()
          };
        }

        if (includeOnchain) {
          results.onchain = {
            gas: await this.onchain.fetchGasPrice(),
            whales: await this.onchain.fetchWhaleTransactions()
          };
        }

        res.json(results);
      } catch (error) {
        res.status(500).json({ error: 'Failed to aggregate data' });
      }
    });
  }

  private async startDataStreams(): Promise<void> {
    // Start Binance WebSocket stream
    let producer: unknown;
    try {
      producer = this.kafka?.producer();
      await (producer as any)?.connect();
    } catch (_error: unknown) {
      // console.warn('Kafka producer not available, continuing without streaming');
    }

    this.binance.connect(async (data: unknown) => {
      // Store in Redis for real-time access (if available)
      try {
        await this.redis?.setex(
          `realtime:${(data as { data: { symbol: string; }; }).data.symbol}`,
          60,
          JSON.stringify(data)
        );
      } catch (_error: unknown) {
        // console.warn('Redis cache unavailable');
      }

      // Send to Kafka for processing (if available)
      try {
        await (producer as any)?.send({
        topic: 'market-data',
        messages: [
          {
            key: (data as { data: { symbol: string; }; }).data.symbol,
            value: JSON.stringify(data),
            timestamp: Date.now().toString()
          }
        ]
      });
      } catch (_error: unknown) {
        // console.warn('Kafka send failed');
      }
    });

    // Start periodic data collection
    setInterval(async () => {
      try {
        // Fetch trending coins every 5 minutes
        const trending = await this.coingecko.fetchTrending();
        try {
          await (producer as any)?.send({
            topic: 'trending-data',
            messages: [
              {
                value: JSON.stringify(trending),
                timestamp: Date.now().toString()
              }
            ]
          });
        } catch (_error: unknown) {
          // console.warn('Kafka trending send failed');
        }

        // Fetch news every 10 minutes
        const news = await this.news.fetchLatestNews();
        try {
          await (producer as any)?.send({
            topic: 'news-data',
            messages: [
              {
                value: JSON.stringify(news),
                timestamp: Date.now().toString()
              }
            ]
          });
        } catch (_error: unknown) {
          // console.warn('Kafka news send failed');
        }
      } catch (_error: unknown) {
        // console.error('Periodic data collection error:', error);
      }
    }, 300000); // 5 minutes
  }

  async start(port: number = 8004): Promise<void> {
    this.app.listen(port, () => {
      // console.log(`Data Aggregator Service running on port ${port}`);
    });
  }

  async stop(): Promise<void> {
    this.binance.disconnect();
    await this.redis?.quit();
  }
}

// Start the service
if (require.main === module) {
  const service = new DataAggregatorService();
  service.start();

  process.on('SIGTERM', async () => {
    // console.log('SIGTERM received, shutting down gracefully');
    await service.stop();
    process.exit(0);
  });
}
