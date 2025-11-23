/**
 * =========================================
 * REUTERS API CLIENT
 * =========================================
 * Specialized client for Reuters news API integration with financial focus
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '../../utils/Logger';
import type { NewsSource, NewsArticle, BackfillRequest } from '../../types';

export interface ReutersAPIResponse {
  result: {
    articles: Array<{
      id: string;
      title: string;
      description: string;
      body?: string;
      url: string;
      publishedTime: string;
      authors?: Array<{
        name: string;
      }>;
      images?: Array<{
        url: string;
        caption?: string;
      }>;
      tags?: Array<{
        name: string;
        type: string;
      }>;
    }>;
    count: number;
    totalCount: number;
  };
}

export interface ReutersAPIConfig {
  apiKey: string;
  baseUrl?: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export class ReutersAPIClient {
  private logger: Logger;
  private config: ReutersAPIConfig;
  private httpClient: AxiosInstance;
  private isInitialized: boolean = false;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindow: number = 60000; // 1 minute

  constructor(config: ReutersAPIConfig) {
    this.logger = new Logger('ReutersAPIClient');
    this.config = {
      baseUrl: 'https://api.reuters.com/content/v1',
      rateLimit: {
        requestsPerMinute: 100, // Conservative limit for Reuters API
        requestsPerHour: 1000
      },
      ...config
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'CoinetNewsAggregator/1.0',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
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
          this.logger.rateLimit('reuters', 'rate_limit_exceeded', new Date(Date.now() + 60000));
        } else if (error.response?.status === 401) {
          this.logger.error('Reuters API authentication failed - check API key');
        } else if (error.response?.status === 403) {
          this.logger.error('Reuters API access forbidden - check permissions');
        }
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Reuters API Client...');

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('✅ Reuters API Client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Reuters API Client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ Reuters API Client stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Reuters API Client', error);
      throw error;
    }
  }

  /**
   * Fetch cryptocurrency and financial news from Reuters
   */
  async fetchFinancialNews(options: {
    query?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<NewsArticle[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('Reuters API Client is not initialized');
      }

      const {
        query = 'cryptocurrency OR bitcoin OR ethereum OR blockchain OR "digital assets"',
        category = 'financial',
        limit = 50,
        offset = 0
      } = options;

      this.logger.debug(`Fetching financial news from Reuters: query="${query}", category="${category}"`);

      const response: AxiosResponse<ReutersAPIResponse> = await this.httpClient.get('/search', {
        params: {
          q: query,
          category,
          limit: Math.min(limit, 100),
          offset,
          sort: 'display_date:desc',
          dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24h
          dateTo: new Date().toISOString()
        }
      });

      const articles = this.convertReutersResponse(response.data, {
        id: 'reuters',
        name: 'Reuters',
        type: 'api',
        url: this.config.baseUrl || '',
        enabled: true,
        updateInterval: 300000, // 5 minutes
        errorCount: 0
      });

      this.logger.debug(`Fetched ${articles.length} articles from Reuters API`);
      return articles;

    } catch (error: any) {
      this.logger.error('Failed to fetch financial news from Reuters API', error);
      throw error;
    }
  }

  /**
   * Fetch breaking financial news
   */
  async fetchBreakingNews(options: {
    limit?: number;
  } = {}): Promise<NewsArticle[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('Reuters API Client is not initialized');
      }

      const { limit = 50 } = options;

      this.logger.debug(`Fetching breaking news from Reuters`);

      const response: AxiosResponse<ReutersAPIResponse> = await this.httpClient.get('/search', {
        params: {
          q: 'breaking OR urgent OR flash',
          category: 'financial',
          limit: Math.min(limit, 100),
          sort: 'display_date:desc',
          dateFrom: new Date(Date.now() - 60 * 60 * 1000).toISOString() // Last hour
        }
      });

      const articles = this.convertReutersResponse(response.data, {
        id: 'reuters-breaking',
        name: 'Reuters Breaking',
        type: 'api',
        url: this.config.baseUrl || '',
        enabled: true,
        updateInterval: 60000, // 1 minute for breaking news
        errorCount: 0
      });

      this.logger.debug(`Fetched ${articles.length} breaking news articles from Reuters`);
      return articles;

    } catch (error: any) {
      this.logger.error('Failed to fetch breaking news from Reuters API', error);
      throw error;
    }
  }

  /**
   * Fetch historical data for backfill
   */
  async fetchHistorical(source: NewsSource, request: BackfillRequest): Promise<NewsArticle[]> {
    try {
      this.logger.info(`Fetching historical data from Reuters API`, {
        start_date: request.startDate.toISOString(),
        end_date: request.endDate.toISOString()
      });

      const articles: NewsArticle[] = [];
      let currentDate = new Date(request.startDate);
      const maxDays = Math.min(
        Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (24 * 60 * 60 * 1000)),
        30 // Reuters API limitations
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
          await this.delay(2000); // 2 seconds between requests

          currentDate.setDate(currentDate.getDate() + 1);

        } catch (error: any) {
          this.logger.error(`Failed to fetch historical data for ${currentDate.toISOString()}`, error);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      this.logger.info(`Fetched ${articles.length} historical articles from Reuters API`);
      return articles.slice(0, request.maxArticles);

    } catch (error: any) {
      this.logger.error(`Failed to fetch historical data from Reuters API`, error);
      throw error;
    }
  }

  private async fetchArticlesForDate(date: Date): Promise<NewsArticle[]> {
    const dateStr = date.toISOString().split('T')[0];
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    const response: AxiosResponse<ReutersAPIResponse> = await this.httpClient.get('/search', {
      params: {
        q: 'cryptocurrency OR bitcoin OR ethereum OR blockchain OR "digital assets"',
        category: 'financial',
        limit: 100,
        sort: 'display_date:desc',
        dateFrom: `${dateStr}T00:00:00Z`,
        dateTo: `${nextDayStr}T00:00:00Z`
      }
    });

    return this.convertReutersResponse(response.data, {
      id: 'reuters',
      name: 'Reuters',
      type: 'api',
      url: this.config.baseUrl || '',
      enabled: true,
      updateInterval: 300000,
      errorCount: 0
    });
  }

  private convertReutersResponse(data: ReutersAPIResponse, source: NewsSource): NewsArticle[] {
    const articles: NewsArticle[] = [];

    if (!data.result?.articles) {
      this.logger.warn('No articles found in Reuters response');
      return articles;
    }

    for (const item of data.result.articles) {
      try {
        // Skip articles without essential content
        if (!item.title || (!item.description && !item.body)) {
          continue;
        }

        // Extract image URL
        const imageUrl = item.images && item.images.length > 0 ? item.images[0].url : undefined;

        // Extract author
        const author = item.authors && item.authors.length > 0 ? item.authors[0].name : undefined;

        // Extract tags/categories
        const tags: string[] = [];
        if (item.tags && Array.isArray(item.tags)) {
          tags.push(...item.tags.map(tag => tag.name));
        }

        const article: NewsArticle = {
          id: `${source.id}_${item.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source,
          title: item.title,
          content: item.body || item.description,
          summary: item.description || '',
          url: item.url,
          publishedAt: new Date(item.publishedTime),
          fetchedAt: new Date(),
          author,
          imageUrl,
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
        this.logger.error(`Failed to convert Reuters article`, error);
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
      const response = await this.httpClient.get('/search', {
        params: {
          q: 'test',
          limit: 1
        }
      });

      this.logger.debug('Reuters API connection test successful');
    } catch (error: any) {
      throw new Error(`Reuters API connection test failed: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
