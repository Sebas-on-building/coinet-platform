/**
 * =========================================
 * CRYPTOPANIC NEWS SERVICE
 * =========================================
 * Divine world-class news aggregation and normalization service
 * Handles news fetching, caching, normalization, and token mapping
 */

import { EventEmitter } from 'eventemitter3';
import CryptoPanicRestClient from '../providers/cryptopanic-rest';
import {
  CryptoPanicPost,
  CryptoPanicPostsResponse,
  NormalizedNewsArticle,
  CryptoPanicSentiment,
  CryptoPanicKind,
  CryptoPanicFilter,
  CryptoPanicRegion,
  NewsStatistics,
  CachedNewsItem,
} from '../types/cryptopanic.types';
import { logger } from '../utils/logger';

export interface CryptoPanicNewsServiceConfig {
  client: CryptoPanicRestClient;
  enableCaching?: boolean;
  cacheTTL?: number; // seconds
  enableAutoRefresh?: boolean;
  refreshInterval?: number; // seconds
  enableTokenMapping?: boolean;
  tokenMappings?: Record<string, string>; // CryptoPanic code -> Standard symbol
  protocolDetection?: boolean;
}

export class CryptoPanicNewsService extends EventEmitter {
  private client: CryptoPanicRestClient;
  private config: CryptoPanicNewsServiceConfig;
  private cache: Map<string, CachedNewsItem>;
  private articleIndex: Map<number, NormalizedNewsArticle>;
  private refreshTimer?: NodeJS.Timeout;
  private watchedCurrencies: Set<string>;
  private statistics: NewsStatistics;

  constructor(config: CryptoPanicNewsServiceConfig) {
    super();

    this.config = {
      enableCaching: true,
      cacheTTL: 300, // 5 minutes
      enableAutoRefresh: false,
      refreshInterval: 60, // 1 minute
      enableTokenMapping: true,
      protocolDetection: true,
      tokenMappings: this.getDefaultTokenMappings(),
      ...config,
    };

    this.client = config.client;
    this.cache = new Map();
    this.articleIndex = new Map();
    this.watchedCurrencies = new Set();
    this.statistics = this.initializeStatistics();

    logger.info('CryptoPanic News Service initialized', {
      caching: this.config.enableCaching,
      autoRefresh: this.config.enableAutoRefresh,
      tokenMapping: this.config.enableTokenMapping,
    });
  }

  /**
   * Get default token mappings
   */
  private getDefaultTokenMappings(): Record<string, string> {
    return {
      BTC: 'BTC',
      ETH: 'ETH',
      SOL: 'SOL',
      USDT: 'USDT',
      USDC: 'USDC',
      BNB: 'BNB',
      XRP: 'XRP',
      ADA: 'ADA',
      DOGE: 'DOGE',
      AVAX: 'AVAX',
      MATIC: 'MATIC',
      DOT: 'DOT',
      LINK: 'LINK',
      UNI: 'UNI',
      AAVE: 'AAVE',
      COMP: 'COMP',
      MKR: 'MKR',
      SNX: 'SNX',
      CRV: 'CRV',
      SUSHI: 'SUSHI',
      // Add more as needed
    };
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): NewsStatistics {
    return {
      totalArticles: 0,
      articlesBySource: {},
      articlesBySentiment: {
        [CryptoPanicSentiment.POSITIVE]: 0,
        [CryptoPanicSentiment.NEGATIVE]: 0,
        [CryptoPanicSentiment.NEUTRAL]: 0,
      },
      articlesByToken: {},
      averagePanicScore: 0,
      averageSentimentScore: 0,
      trendingTokens: [],
      timeRange: {
        from: new Date(),
        to: new Date(),
      },
    };
  }

  /**
   * Calculate panic score from votes (0-100)
   */
  private calculatePanicScore(post: CryptoPanicPost): number {
    const votes = post.votes;
    const totalVotes = votes.positive + votes.negative + votes.important;

    if (totalVotes === 0) return 0;

    // Important votes are weighted heavily
    const importanceWeight = (votes.important / totalVotes) * 50;

    // Negative votes increase panic
    const negativeWeight = (votes.negative / totalVotes) * 30;

    // High engagement (likes, comments) adds to panic score
    const engagementWeight = Math.min((votes.liked + votes.comments) / 100, 20);

    return Math.min(100, importanceWeight + negativeWeight + engagementWeight);
  }

  /**
   * Calculate sentiment score (-100 to +100)
   */
  private calculateSentimentScore(post: CryptoPanicPost): number {
    const votes = post.votes;
    const totalVotes = votes.positive + votes.negative;

    if (totalVotes === 0) return 0;

    const positiveRatio = votes.positive / totalVotes;
    const negativeRatio = votes.negative / totalVotes;

    return Math.round((positiveRatio - negativeRatio) * 100);
  }

  /**
   * Determine sentiment
   */
  private determineSentiment(sentimentScore: number): CryptoPanicSentiment {
    if (sentimentScore > 20) return CryptoPanicSentiment.POSITIVE;
    if (sentimentScore < -20) return CryptoPanicSentiment.NEGATIVE;
    return CryptoPanicSentiment.NEUTRAL;
  }

  /**
   * Calculate importance score (0-100)
   */
  private calculateImportance(post: CryptoPanicPost): number {
    const votes = post.votes;

    // Important votes are the primary factor
    const importantWeight = Math.min(votes.important * 5, 50);

    // Saves indicate quality
    const savedWeight = Math.min(votes.saved * 3, 25);

    // Total engagement
    const engagementWeight = Math.min(
      (votes.liked + votes.comments) / 20,
      25
    );

    return Math.min(100, importantWeight + savedWeight + engagementWeight);
  }

  /**
   * Map currency codes to standard token symbols
   */
  private mapTokens(currencies?: Array<{ code: string }>): string[] {
    if (!currencies || !this.config.enableTokenMapping) return [];

    return currencies
      .map((c) => this.config.tokenMappings![c.code.toUpperCase()] || c.code.toUpperCase())
      .filter((token, index, self) => self.indexOf(token) === index); // Unique
  }

  /**
   * Detect DeFi protocols mentioned in title
   */
  private detectProtocols(title: string, description?: string): string[] {
    if (!this.config.protocolDetection) return [];

    const protocolKeywords = {
      uniswap: ['uniswap', 'uni'],
      aave: ['aave'],
      compound: ['compound', 'comp'],
      makerdao: ['maker', 'makerdao', 'mkr'],
      curve: ['curve', 'crv'],
      synthetix: ['synthetix', 'snx'],
      sushiswap: ['sushiswap', 'sushi'],
      pancakeswap: ['pancakeswap', 'cake'],
      balancer: ['balancer', 'bal'],
      yearn: ['yearn', 'yfi'],
      convex: ['convex', 'cvx'],
      lido: ['lido', 'ldo'],
      frax: ['frax', 'fxs'],
      liquity: ['liquity', 'lqty'],
      olympus: ['olympus', 'ohm'],
      gmx: ['gmx'],
      velodrome: ['velodrome', 'velo'],
    };

    const text = `${title} ${description || ''}`.toLowerCase();
    const detectedProtocols: string[] = [];

    for (const [protocol, keywords] of Object.entries(protocolKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        detectedProtocols.push(protocol);
      }
    }

    return detectedProtocols;
  }

  /**
   * Normalize CryptoPanic post to standard format
   */
  private normalizePost(post: CryptoPanicPost): NormalizedNewsArticle {
    const sentimentScore = this.calculateSentimentScore(post);
    const panicScore = this.calculatePanicScore(post);
    const importance = this.calculateImportance(post);
    const sentiment = this.determineSentiment(sentimentScore);
    const tokens = this.mapTokens(post.currencies);
    const protocols = this.detectProtocols(
      post.title,
      post.metadata?.description
    );

    const normalized: NormalizedNewsArticle = {
      id: `cryptopanic-${post.id}`,
      title: post.title,
      description: post.metadata?.description,
      url: post.url,
      publishedAt: new Date(post.published_at),
      createdAt: new Date(post.created_at),
      source: {
        name: post.source.title,
        domain: post.domain,
        region: post.source.region,
      },
      sentiment,
      panicScore,
      sentimentScore,
      importance,
      engagement: {
        likes: post.votes.liked,
        dislikes: post.votes.disliked,
        comments: post.votes.comments,
        saves: post.votes.saved,
      },
      currencies: (post.currencies || []).map((c) => ({
        code: c.code,
        name: c.title,
        slug: c.slug,
      })),
      tokens,
      protocols,
      metadata: {
        hasImage: !!post.metadata?.image,
        hasVideo: !!post.metadata?.has_video,
        image: post.metadata?.image,
      },
      kind: post.kind,
      tags: this.generateTags(post, sentiment, protocols),
    };

    // Update article index
    this.articleIndex.set(post.id, normalized);

    return normalized;
  }

  /**
   * Generate tags for an article
   */
  private generateTags(
    post: CryptoPanicPost,
    sentiment: CryptoPanicSentiment,
    protocols: string[]
  ): string[] {
    const tags: string[] = [];

    // Add sentiment tag
    tags.push(sentiment);

    // Add kind tag
    tags.push(post.kind);

    // Add importance tag
    if (post.votes.important > 10) {
      tags.push('important');
    }

    // Add trending tag
    if (post.votes.liked > 50) {
      tags.push('trending');
    }

    // Add protocol tags
    if (protocols.length > 0) {
      tags.push('defi');
      tags.push(...protocols);
    }

    // Add region tag
    if (post.source.region) {
      tags.push(`region-${post.source.region}`);
    }

    return tags;
  }

  /**
   * Update statistics with new articles
   */
  private updateStatistics(articles: NormalizedNewsArticle[]): void {
    for (const article of articles) {
      this.statistics.totalArticles++;

      // By source
      this.statistics.articlesBySource[article.source.name] =
        (this.statistics.articlesBySource[article.source.name] || 0) + 1;

      // By sentiment
      this.statistics.articlesBySentiment[article.sentiment]++;

      // By token
      for (const token of article.tokens) {
        this.statistics.articlesByToken[token] =
          (this.statistics.articlesByToken[token] || 0) + 1;
      }
    }

    // Calculate averages
    const allArticles = Array.from(this.articleIndex.values());
    if (allArticles.length > 0) {
      this.statistics.averagePanicScore =
        allArticles.reduce((sum, a) => sum + a.panicScore, 0) /
        allArticles.length;

      this.statistics.averageSentimentScore =
        allArticles.reduce((sum, a) => sum + a.sentimentScore, 0) /
        allArticles.length;
    }

    // Calculate trending tokens
    const tokenStats = new Map<
      string,
      { count: number; totalSentiment: number; totalPanic: number }
    >();

    for (const article of allArticles) {
      for (const token of article.tokens) {
        const stats = tokenStats.get(token) || {
          count: 0,
          totalSentiment: 0,
          totalPanic: 0,
        };
        stats.count++;
        stats.totalSentiment += article.sentimentScore;
        stats.totalPanic += article.panicScore;
        tokenStats.set(token, stats);
      }
    }

    this.statistics.trendingTokens = Array.from(tokenStats.entries())
      .map(([token, stats]) => ({
        token,
        count: stats.count,
        sentiment: this.determineSentiment(stats.totalSentiment / stats.count),
        avgPanicScore: stats.totalPanic / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Update time range
    if (allArticles.length > 0) {
      const dates = allArticles.map((a) => a.publishedAt.getTime());
      this.statistics.timeRange.from = new Date(Math.min(...dates));
      this.statistics.timeRange.to = new Date(Math.max(...dates));
    }
  }

  /**
   * Fetch and normalize news
   */
  async fetchNews(options?: {
    currencies?: string | string[];
    filter?: CryptoPanicFilter;
    kind?: CryptoPanicKind;
    region?: CryptoPanicRegion;
    page?: number;
  }): Promise<NormalizedNewsArticle[]> {
    try {
      logger.debug('Fetching CryptoPanic news', options);

      const response = await this.client.fetchPosts(options);

      const normalized = response.results.map((post) =>
        this.normalizePost(post)
      );

      // Update statistics
      this.updateStatistics(normalized);

      // Cache articles
      if (this.config.enableCaching) {
        for (const article of normalized) {
          const cacheKey = `article-${article.id}`;
          this.cache.set(cacheKey, {
            article,
            cachedAt: new Date(),
            expiresAt: new Date(Date.now() + this.config.cacheTTL! * 1000),
            hitCount: 0,
          });
        }
      }

      // Emit event
      this.emit('news_fetched', {
        count: normalized.length,
        articles: normalized,
        options,
      });

      logger.info(`Fetched ${normalized.length} news articles from CryptoPanic`);

      return normalized;
    } catch (error) {
      logger.error('Failed to fetch CryptoPanic news', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Fetch trending news
   */
  async fetchTrendingNews(
    currencies?: string | string[]
  ): Promise<NormalizedNewsArticle[]> {
    return this.fetchNews({
      currencies,
      filter: CryptoPanicFilter.HOT,
      kind: CryptoPanicKind.NEWS,
    });
  }

  /**
   * Fetch bullish news
   */
  async fetchBullishNews(
    currencies?: string | string[]
  ): Promise<NormalizedNewsArticle[]> {
    return this.fetchNews({
      currencies,
      filter: CryptoPanicFilter.BULLISH,
      kind: CryptoPanicKind.NEWS,
    });
  }

  /**
   * Fetch bearish news
   */
  async fetchBearishNews(
    currencies?: string | string[]
  ): Promise<NormalizedNewsArticle[]> {
    return this.fetchNews({
      currencies,
      filter: CryptoPanicFilter.BEARISH,
      kind: CryptoPanicKind.NEWS,
    });
  }

  /**
   * Fetch important news
   */
  async fetchImportantNews(
    currencies?: string | string[]
  ): Promise<NormalizedNewsArticle[]> {
    return this.fetchNews({
      currencies,
      filter: CryptoPanicFilter.IMPORTANT,
      kind: CryptoPanicKind.NEWS,
    });
  }

  /**
   * Fetch news by token
   */
  async fetchNewsByToken(token: string): Promise<NormalizedNewsArticle[]> {
    return this.fetchNews({ currencies: token.toUpperCase() });
  }

  /**
   * Fetch news by multiple tokens
   */
  async fetchNewsByTokens(tokens: string[]): Promise<NormalizedNewsArticle[]> {
    return this.fetchNews({ currencies: tokens.map((t) => t.toUpperCase()) });
  }

  /**
   * Watch currencies for news updates
   */
  async watchCurrencies(currencies: string[]): Promise<void> {
    currencies.forEach((c) => this.watchedCurrencies.add(c.toUpperCase()));

    if (this.config.enableAutoRefresh && !this.refreshTimer) {
      this.startAutoRefresh();
    }

    logger.info('Watching currencies for news updates', {
      currencies,
      total: this.watchedCurrencies.size,
    });
  }

  /**
   * Unwatch currencies
   */
  unwatchCurrencies(currencies: string[]): void {
    currencies.forEach((c) => this.watchedCurrencies.delete(c.toUpperCase()));

    if (this.watchedCurrencies.size === 0 && this.refreshTimer) {
      this.stopAutoRefresh();
    }

    logger.info('Stopped watching currencies', { currencies });
  }

  /**
   * Start auto-refresh for watched currencies
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) return;

    this.refreshTimer = setInterval(async () => {
      if (this.watchedCurrencies.size > 0) {
        try {
          const currencies = Array.from(this.watchedCurrencies);
          const articles = await this.fetchNewsByTokens(currencies);

          this.emit('news_refreshed', {
            currencies,
            count: articles.length,
            articles,
          });
        } catch (error) {
          logger.error('Auto-refresh failed', error);
        }
      }
    }, this.config.refreshInterval! * 1000);

    logger.info('Auto-refresh started', {
      interval: this.config.refreshInterval,
    });
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
      logger.info('Auto-refresh stopped');
    }
  }

  /**
   * Get article by ID
   */
  getArticleById(id: number): NormalizedNewsArticle | undefined {
    return this.articleIndex.get(id);
  }

  /**
   * Get statistics
   */
  getStatistics(): NewsStatistics {
    return { ...this.statistics };
  }

  /**
   * Get trending tokens
   */
  getTrendingTokens(limit: number = 10): NewsStatistics['trendingTokens'] {
    return this.statistics.trendingTokens.slice(0, limit);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.articleIndex.clear();
    this.statistics = this.initializeStatistics();
    logger.info('Cache and statistics cleared');
  }

  /**
   * Destroy service
   */
  async destroy(): Promise<void> {
    this.stopAutoRefresh();
    this.clearCache();
    this.removeAllListeners();
    logger.info('CryptoPanic News Service destroyed');
  }
}

export default CryptoPanicNewsService;

