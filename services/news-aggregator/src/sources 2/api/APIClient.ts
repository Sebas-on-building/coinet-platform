/**
 * =========================================
 * API CLIENT
 * =========================================
 * REST API client for news aggregation
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '../../utils/Logger';
import type { NewsSource, NewsArticle, BackfillRequest, NewsClassification } from '../../types';

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
}

export class APIClient {
  private logger: Logger;
  private sources: NewsSource[] = [];
  private isInitialized: boolean = false;
  private httpClients: Map<string, AxiosInstance> = new Map();
  private fetchIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(sources: NewsSource[] = []) {
    this.logger = new Logger('APIClient');
    this.sources = sources.filter(s => s.type === 'api');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing API Client...');

      // Set up HTTP clients for each API source
      for (const source of this.sources) {
        await this.setupHttpClient(source);
      }

      this.isInitialized = true;
      this.logger.info('✅ API Client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize API Client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Clear all fetch intervals
      for (const [sourceId, interval] of this.fetchIntervals) {
        clearInterval(interval);
      }
      this.fetchIntervals.clear();

      // Clear HTTP clients
      this.httpClients.clear();

      this.isInitialized = false;
      this.logger.info('✅ API Client stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop API Client', error);
      throw error;
    }
  }

  addSource(source: NewsSource): void {
    this.sources.push(source);
    this.setupSourcePolling(source);
  }

  private async setupHttpClient(source: NewsSource): Promise<void> {
    const client = axios.create({
      baseURL: source.url,
      timeout: 30000, // 30 seconds
      headers: {
        'User-Agent': 'CoinetNewsAggregator/1.0',
        'Accept': 'application/json',
        ...source.apiKey && { 'Authorization': `Bearer ${source.apiKey}` }
      }
    });

    // Add request interceptor for rate limiting
    client.interceptors.request.use((config) => {
      // Add rate limiting logic here if needed
      return config;
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          this.logger.rateLimit(source.id, 'rate_limit', new Date(Date.now() + 60000));
        }
        return Promise.reject(error);
      }
    );

    this.httpClients.set(source.id, client);
  }

  private setupSourcePolling(source: NewsSource): void {
    if (!source.enabled) return;

    // Initial fetch
    this.fetchFromAPI(source).catch(error => {
      this.logger.error(`Initial API fetch failed for ${source.id}`, error);
    });

    // Set up periodic fetching
    const interval = setInterval(() => {
      this.fetchFromAPI(source).catch(error => {
        this.logger.error(`Periodic API fetch failed for ${source.id}`, error);
        source.errorCount++;
      });
    }, source.updateInterval);

    this.fetchIntervals.set(source.id, interval);
    this.logger.info(`Set up API polling for ${source.id} every ${source.updateInterval / 1000}s`);
  }

  private async fetchFromAPI(source: NewsSource): Promise<void> {
    try {
      const client = this.httpClients.get(source.id);
      if (!client) {
        throw new Error(`No HTTP client configured for ${source.id}`);
      }

      this.logger.debug(`Fetching from API: ${source.name} (${source.url})`);

      // Define API endpoints based on source
      const endpoints = this.getEndpointsForSource(source);

      for (const endpoint of endpoints) {
        try {
          const response: AxiosResponse = await client.request({
            url: endpoint.path,
            method: endpoint.method,
            headers: endpoint.headers,
            params: endpoint.params,
            data: endpoint.body
          });

          const articles = await this.convertAPIResponseToArticles(response.data, source);
          source.lastFetch = new Date();

      // Emit articles for processing with ultra-high-performance batching
      if (articles.length > 0) {
        // Batch emit for better performance
        this.emit('articles_batch', articles, source);

        // Also emit individual articles for real-time processing
        for (const article of articles) {
          this.emit('article', article, source);
        }
      }

          this.logger.debug(`Processed ${articles.length} articles from ${source.id} API`);

        } catch (error: any) {
          this.logger.error(`Failed to fetch from API endpoint for ${source.id}`, error);
          throw error;
        }
      }

    } catch (error: any) {
      source.errorCount++;
      this.logger.error(`Failed to fetch from API for ${source.id}`, error);
      throw error;
    }
  }

  async fetchHistorical(source: NewsSource, request: BackfillRequest): Promise<NewsArticle[]> {
    try {
      this.logger.info(`Fetching historical data from ${source.id} API`, {
        start_date: request.startDate.toISOString(),
        end_date: request.endDate.toISOString()
      });

      const client = this.httpClients.get(source.id);
      if (!client) {
        throw new Error(`No HTTP client configured for ${source.id}`);
      }

      const articles: NewsArticle[] = [];
      let currentDate = new Date(request.startDate);

      while (currentDate <= request.endDate) {
        try {
          // Fetch articles for this day
          const dayArticles = await this.fetchArticlesForDate(source, currentDate, client);

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

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);

          // Respect rate limits
          await this.delay(1000);

        } catch (error: any) {
          this.logger.error(`Failed to fetch historical data for ${currentDate.toISOString()}`, error);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      this.logger.info(`Fetched ${articles.length} historical articles from ${source.id} API`);
      return articles;

    } catch (error: any) {
      this.logger.error(`Failed to fetch historical data from ${source.id}`, error);
      throw error;
    }
  }

  private async fetchArticlesForDate(source: NewsSource, date: Date, client: AxiosInstance): Promise<NewsArticle[]> {
    const endpoints = this.getEndpointsForSource(source, date);

    for (const endpoint of endpoints) {
      try {
        const response: AxiosResponse = await client.request({
          url: endpoint.path,
          method: endpoint.method,
          headers: endpoint.headers,
          params: { ...endpoint.params, date: date.toISOString().split('T')[0] },
          data: endpoint.body
        });

        return await this.convertAPIResponseToArticles(response.data, source);

      } catch (error: any) {
        this.logger.error(`Failed to fetch articles for ${date.toISOString()}`, error);
      }
    }

    return [];
  }

  private getEndpointsForSource(source: NewsSource, date?: Date): APIEndpoint[] {
    const sourceName = source.name.toLowerCase();

    // Ultra-high-performance provider-specific endpoints
    if (sourceName.includes('newsapi')) {
      return this.getNewsAPIEndpoints(source, date);
    } else if (sourceName.includes('reuters')) {
      return this.getReutersEndpoints(source, date);
    } else if (sourceName.includes('coindesk') || sourceName.includes('cointelegraph') || sourceName.includes('cryptoslate')) {
      return this.getCryptoNewsEndpoints(source, date);
    } else if (sourceName.includes('defillama') || sourceName.includes('thegraph')) {
      return this.getDeFiAPIEndpoints(source, date);
    }

    // Default fallback for generic APIs
    return [
      {
        path: '/articles',
        method: 'GET',
        params: {
          limit: 100,
          sort: 'publishedAt',
          order: 'desc'
        }
      },
      {
        path: '/news',
        method: 'GET',
        params: {
          limit: 100,
          sort: 'date',
          order: 'desc'
        }
      }
    ];
  }

  private getNewsAPIEndpoints(source: NewsSource, date?: Date): APIEndpoint[] {
    const baseParams = {
      apiKey: source.apiKey,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 100
    };

    const cryptoKeywords = [
      'bitcoin', 'ethereum', 'crypto', 'blockchain', 'cryptocurrency',
      'defi', 'nft', 'web3', 'dao', 'metaverse', 'polygon', 'solana',
      'avalanche', 'cardano', 'chainlink', 'uniswap', 'aave'
    ];

    return [
      {
        path: '/everything',
        method: 'GET',
        params: {
          ...baseParams,
          q: cryptoKeywords.join(' OR '),
          from: date?.toISOString().split('T')[0] || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        }
      },
      {
        path: '/top-headlines',
        method: 'GET',
        params: {
          ...baseParams,
          category: 'business',
          country: 'us'
        }
      }
    ];
  }

  private getReutersEndpoints(source: NewsSource, date?: Date): APIEndpoint[] {
    return [
      {
        path: '/content/search/v1',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${source.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          q: '(bitcoin OR ethereum OR crypto OR blockchain OR "digital asset")',
          date_from: date?.toISOString() || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          date_to: new Date().toISOString(),
          limit: 100,
          sort: 'display_date:desc'
        }
      }
    ];
  }

  private getCryptoNewsEndpoints(source: NewsSource, date?: Date): APIEndpoint[] {
    const sourceName = source.name.toLowerCase();

    if (sourceName.includes('coindesk')) {
      return [
        {
          path: '/v1/search',
          method: 'GET',
          params: {
            query: 'crypto OR blockchain OR bitcoin OR ethereum',
            limit: 100,
            sort: 'date:desc'
          }
        }
      ];
    } else if (sourceName.includes('cointelegraph')) {
      return [
        {
          path: '/api/v1/articles',
          method: 'GET',
          params: {
            limit: 100,
            sort: 'date:desc'
          }
        }
      ];
    } else if (sourceName.includes('cryptoslate')) {
      return [
        {
          path: '/api/v1/articles',
          method: 'GET',
          params: {
            limit: 100,
            sort: 'date:desc'
          }
        }
      ];
    }

    return [
      {
        path: '/api/articles',
        method: 'GET',
        params: {
          limit: 100,
          sort: 'date:desc'
        }
      }
    ];
  }

  private getDeFiAPIEndpoints(source: NewsSource, date?: Date): APIEndpoint[] {
    const sourceName = source.name.toLowerCase();

    if (sourceName.includes('defillama')) {
      return [
        {
          path: '/protocols',
          method: 'GET',
          params: {}
        },
        {
          path: '/tvl',
          method: 'GET',
          params: {}
        }
      ];
    } else if (sourceName.includes('thegraph')) {
      return [
        {
          path: '/subgraphs/id/Qm...',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            query: `{
              protocols {
                id
                name
                slug
                tvlUSD
                volumeUSD
              }
            }`
          }
        }
      ];
    }

    return [];
  }

  private async convertDeFiResponseToArticles(data: any, source: NewsSource): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    if (source.name.toLowerCase().includes('defillama')) {
      // Handle DeFiLlama protocol data
      const protocols = data.protocols || [];

      for (const protocol of protocols) {
        const article = await this.convertDeFiProtocolToArticle(protocol, source);
        articles.push(article);
      }
    }

    return articles;
  }

  private async convertGraphQLResponseToArticles(data: any, source: NewsSource): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    if (data.data?.protocols) {
      for (const protocol of data.data.protocols) {
        const article = await this.convertGraphQLProtocolToArticle(protocol, source);
        articles.push(article);
      }
    }

    return articles;
  }

  private async convertDeFiProtocolToArticle(protocol: any, source: NewsSource): Promise<NewsArticle> {
    const now = new Date();
    const content = `Protocol: ${protocol.name}\nTVL: $${protocol.tvlUSD?.toLocaleString() || 'N/A'}\nVolume: $${protocol.volumeUSD?.toLocaleString() || 'N/A'}\nChain: ${protocol.chain || 'Multi-chain'}`;

    return {
      id: `${source.id}_${protocol.id}_${now.getTime()}`,
      source,
      title: `${protocol.name} - DeFi Protocol Metrics`,
      content,
      summary: `${protocol.name} TVL: $${protocol.tvlUSD?.toLocaleString() || 'N/A'}`,
      url: `https://defillama.com/protocol/${protocol.slug || protocol.id}`,
      publishedAt: now,
      fetchedAt: now,
      classification: 'market_analysis' as NewsClassification,
      urgency: protocol.tvlUSD > 1000000000 ? 'high' : 'medium', // $1B+ TVL = high urgency
      confidence: 0.95,
      sentiment: {
        score: 0,
        confidence: 0.8,
        label: 'neutral'
      },
      keyFacts: {
        tokens: protocol.symbol ? [protocol.symbol] : [],
        projects: [protocol.name],
        companies: [],
        people: [],
        locations: [],
        amounts: [protocol.tvlUSD?.toString() || ''],
        dates: []
      },
      entities: {
        organizations: [protocol.name],
        persons: [],
        locations: [],
        monetary: [protocol.tvlUSD?.toString() || ''],
        percentages: []
      },
      processingLatencyMs: 0,
      wordCount: content.split(' ').length,
      language: 'en',
      marketImpact: {
        volatility: protocol.tvlUSD > 1000000000 ? 0.8 : 0.5,
        relevance: 0.9,
        scope: 'global'
      }
    };
  }

  private async convertGraphQLProtocolToArticle(protocol: any, source: NewsSource): Promise<NewsArticle> {
    return this.convertDeFiProtocolToArticle(protocol, source);
  }

  private async convertAPIResponseToArticles(data: any, source: NewsSource): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    const sourceName = source.name.toLowerCase();

    // Handle different API response formats with ultra-high-performance parsing
    let items: any[] = [];

    if (sourceName.includes('newsapi')) {
      items = data.articles || [];
    } else if (sourceName.includes('reuters')) {
      items = data.results || [];
    } else if (sourceName.includes('coindesk')) {
      items = data.data || [];
    } else if (sourceName.includes('cointelegraph') || sourceName.includes('cryptoslate')) {
      items = data.articles || [];
    } else if (sourceName.includes('defillama')) {
      // Handle DeFi protocol data separately
      return this.convertDeFiResponseToArticles(data, source);
    } else if (sourceName.includes('thegraph')) {
      // Handle GraphQL response
      return this.convertGraphQLResponseToArticles(data, source);
    } else if (Array.isArray(data)) {
      items = data;
    } else if (data.articles) {
      items = data.articles;
    } else if (data.items) {
      items = data.items;
    } else if (data.results) {
      items = data.results;
    } else if (data.data) {
      items = data.data;
    } else {
      // Try to extract from root level
      items = [data];
    }

    for (const item of items) {
      try {
        const article = await this.convertAPIItemToArticle(item, source);
        articles.push(article);
      } catch (error: any) {
        this.logger.error(`Failed to convert API item from ${source.id}`, error);
      }
    }

    return articles;
  }

  private async convertAPIItemToArticle(item: any, source: NewsSource): Promise<NewsArticle> {
    // Extract image URL from various possible fields
    let imageUrl: string | undefined;
    if (item.imageUrl) {
      imageUrl = item.imageUrl;
    } else if (item.image?.url) {
      imageUrl = item.image.url;
    } else if (item.media?.url) {
      imageUrl = item.media.url;
    } else if (item.thumbnail) {
      imageUrl = item.thumbnail;
    }

    // Extract tags/categories
    const tags: string[] = [];
    if (item.tags && Array.isArray(item.tags)) {
      tags.push(...item.tags);
    }
    if (item.categories && Array.isArray(item.categories)) {
      tags.push(...item.categories);
    }
    if (item.category) {
      tags.push(item.category);
    }

    return {
      id: `${source.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      title: item.title || item.headline || '',
      content: item.content || item.body || item.description || item.summary || '',
      summary: item.summary || item.excerpt || '',
      url: item.url || item.link || item.permalink || '',
      publishedAt: new Date(item.publishedAt || item.pubDate || item.date || item.createdAt || Date.now()),
      fetchedAt: new Date(),
      author: item.author || item.byline || item.writer,
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
      language: item.language || 'en',
      marketImpact: {
        volatility: 0,
        relevance: 0,
        scope: 'local'
      }
    };
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Event emitter for articles
  private emit(event: string, data: any, source?: NewsSource): void {
    // This will be connected to the main aggregator's event system
  }

  on(event: string, listener: (...args: any[]) => void): void {
    // Event listener setup - will be connected to main aggregator
  }
}
