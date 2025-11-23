/**
 * =========================================
 * NEWSAPI.ORG CLIENT
 * =========================================
 * Specialized client for NewsAPI.org integration with crypto focus
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '../../utils/Logger';
import type { NewsSource, NewsArticle, BackfillRequest } from '../../types';

export interface NewsAPIResponse {
  status: 'ok' | 'error';
  totalResults: number;
  articles: Array<{
    source: {
      id: string | null;
      name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }>;
  message?: string;
}

export interface NewsAPIConfig {
  apiKey: string;
  baseUrl?: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export class NewsAPIClient {
  private logger: Logger;
  private config: NewsAPIConfig;
  private httpClient: AxiosInstance;
  private isInitialized: boolean = false;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindow: number = 60000; // 1 minute

  constructor(config: NewsAPIConfig) {
    this.logger = new Logger('NewsAPIClient');
    this.config = {
      baseUrl: 'https://newsapi.org/v2',
      rateLimit: {
        requestsPerMinute: 1000, // NewsAPI allows 1000 requests per day for free tier
        requestsPerHour: 50      // Conservative per-hour limit
      },
      ...config
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'CoinetNewsAggregator/1.0',
        'X-Api-Key': this.config.apiKey,
        'Accept': 'application/json'
      }
    });

    // Rate limiting interceptor
    this.httpClient.interceptors.request.use((config) => {
      return this.enforceRateLimit(config);
    });

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          this.logger.rateLimit('newsapi', 'rate_limit_exceeded', new Date(Date.now() + 60000));
        } else if (error.response?.status === 401) {
          this.logger.error('NewsAPI authentication failed - check API key');
        }
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing NewsAPI Client...');

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('✅ NewsAPI Client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize NewsAPI Client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ NewsAPI Client stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop NewsAPI Client', error);
      throw error;
    }
  }

  /**
   * Fetch latest cryptocurrency and financial news
   */
  async fetchCryptoNews(options: {
    query?: string;
    category?: 'business' | 'technology';
    pageSize?: number;
    page?: number;
  } = {}): Promise<NewsArticle[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('NewsAPI Client is not initialized');
      }

      const {
        query = 'cryptocurrency OR bitcoin OR ethereum OR blockchain',
        category = 'technology',
        pageSize = 100,
        page = 1
      } = options;

      this.logger.debug(`Fetching crypto news from NewsAPI: query="${query}", category="${category}"`);

      const response: AxiosResponse<NewsAPIResponse> = await this.httpClient.get('/everything', {
        params: {
          q: query,
          category,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: Math.min(pageSize, 100), // NewsAPI max is 100
          page,
          from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 24h
          to: new Date().toISOString().split('T')[0]
        }
      });

      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.data.message}`);
      }

      const articles = this.convertNewsAPIResponse(response.data, {
        id: 'newsapi',
        name: 'NewsAPI',
        type: 'api',
        url: this.config.baseUrl || '',
        enabled: true,
        updateInterval: 300000, // 5 minutes
        errorCount: 0
      });

      this.logger.debug(`Fetched ${articles.length} articles from NewsAPI`);
      return articles;

    } catch (error: any) {
      this.logger.error('Failed to fetch crypto news from NewsAPI', error);
      throw error;
    }
  }

  /**
   * Fetch top headlines
   */
  async fetchTopHeadlines(options: {
    category?: 'business' | 'technology';
    country?: string;
    pageSize?: number;
  } = {}): Promise<NewsArticle[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('NewsAPI Client is not initialized');
      }

      const {
        category = 'technology',
        country = 'us',
        pageSize = 100
      } = options;

      this.logger.debug(`Fetching top headlines from NewsAPI: category="${category}", country="${country}"`);

      const response: AxiosResponse<NewsAPIResponse> = await this.httpClient.get('/top-headlines', {
        params: {
          category,
          country,
          pageSize: Math.min(pageSize, 100),
          q: 'cryptocurrency OR bitcoin OR ethereum OR blockchain'
        }
      });

      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.data.message}`);
      }

      const articles = this.convertNewsAPIResponse(response.data, {
        id: 'newsapi',
        name: 'NewsAPI',
        type: 'api',
        url: this.config.baseUrl || '',
        enabled: true,
        updateInterval: 300000,
        errorCount: 0
      });

      this.logger.debug(`Fetched ${articles.length} top headlines from NewsAPI`);
      return articles;

    } catch (error: any) {
      this.logger.error('Failed to fetch top headlines from NewsAPI', error);
      throw error;
    }
  }

  /**
   * Fetch historical data for backfill
   */
  async fetchHistorical(source: NewsSource, request: BackfillRequest): Promise<NewsArticle[]> {
    try {
      this.logger.info(`Fetching historical data from NewsAPI`, {
        start_date: request.startDate.toISOString(),
        end_date: request.endDate.toISOString()
      });

      const articles: NewsArticle[] = [];
      let currentDate = new Date(request.startDate);
      const maxDays = Math.min(
        Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (24 * 60 * 60 * 1000)),
        30 // NewsAPI free tier has limitations
      );

      for (let i = 0; i < maxDays; i++) {
        try {
          const dayArticles = await this.fetchArticlesForDate(currentDate);

          // Filter by date range
          const filteredArticles = dayArticles.filter(article =>
            article.publishedAt >= request.startDate &&
            article.publishedAt <= request.endDate
          );

          articles.push(...filteredArticles);

          // Limit results
          if (request.maxArticles && articles.length >= request.maxArticles) {
            break;
          }

          // Respect rate limits
          await this.delay(1000);

          currentDate.setDate(currentDate.getDate() + 1);

        } catch (error: any) {
          this.logger.error(`Failed to fetch historical data for ${currentDate.toISOString()}`, error);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      this.logger.info(`Fetched ${articles.length} historical articles from NewsAPI`);
      return articles.slice(0, request.maxArticles);

    } catch (error: any) {
      this.logger.error(`Failed to fetch historical data from NewsAPI`, error);
      throw error;
    }
  }

  private async fetchArticlesForDate(date: Date): Promise<NewsArticle[]> {
    const dateStr = date.toISOString().split('T')[0];

    const response: AxiosResponse<NewsAPIResponse> = await this.httpClient.get('/everything', {
      params: {
        q: 'cryptocurrency OR bitcoin OR ethereum OR blockchain',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 100,
        from: dateStr,
        to: dateStr
      }
    });

    if (response.data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${response.data.message}`);
    }

    return this.convertNewsAPIResponse(response.data, {
      id: 'newsapi',
      name: 'NewsAPI',
      type: 'api',
      url: this.config.baseUrl || '',
      enabled: true,
      updateInterval: 300000,
      errorCount: 0
    });
  }

  private convertNewsAPIResponse(data: NewsAPIResponse, source: NewsSource): NewsArticle[] {
    const articles: NewsArticle[] = [];

    for (const item of data.articles) {
      try {
        // Skip articles without content
        if (!item.title || !item.description) {
          continue;
        }

        const article: NewsArticle = {
          id: `${source.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source,
          title: item.title,
          content: item.content || item.description,
          summary: item.description || '',
          url: item.url,
          publishedAt: new Date(item.publishedAt),
          fetchedAt: new Date(),
          author: item.author || undefined,
          imageUrl: item.urlToImage || undefined,
          classification: 'general',
          urgency: 'low',
          confidence: 0,
          sentiment: {
            score: 0,
            confidence: 0,
            label: 'neutral'
          },
          keyFacts: {
            tokens: [],
            projects: [],
            companies: [],
            people: [],
            locations: [],
            amounts: [],
            dates: []
          },
          entities: {
            organizations: [],
            persons: [],
            locations: [],
            monetary: [],
            percentages: []
          },
          processingLatencyMs: 0,
          wordCount: 0,
          language: 'en',
          marketImpact: {
            volatility: 0,
            relevance: 0,
            scope: 'local'
          }
        };

        articles.push(article);
      } catch (error: any) {
        this.logger.error(`Failed to convert NewsAPI article`, error);
      }
    }

    return articles;
  }

  private async enforceRateLimit(config: any): Promise<any> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset counter if we're in a new window
    if (timeSinceLastRequest >= this.rateLimitWindow) {
      this.requestCount = 0;
    }

    // Check rate limits
    if (this.requestCount >= this.config.rateLimit!.requestsPerMinute) {
      const waitTime = this.rateLimitWindow - timeSinceLastRequest;
      if (waitTime > 0) {
        this.logger.debug(`Rate limiting: waiting ${waitTime}ms`);
        await this.delay(waitTime);
      }
      this.requestCount = 0;
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();

    return config;
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.httpClient.get('/sources', {
        params: { category: 'technology' }
      });

      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI connection test failed: ${response.data.message}`);
      }

      this.logger.debug('NewsAPI connection test successful');
    } catch (error: any) {
      throw new Error(`NewsAPI connection test failed: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
