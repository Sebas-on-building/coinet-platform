import {
  NewsItem,
  NewsFilter,
  NewsEvent,
  TrendingTopic,
  ContentAggregationSettings,
} from "../../types/news";
import { EventEmitter } from "events";
import { NewsSourceAdapter } from "./adapters/NewsSourceAdapter";
import { NewsSourceFactory } from "./adapters/NewsSourceFactory";
import { SentimentAnalysisService } from "../sentimentAnalysis";
import { VerificationService } from "./VerificationService";
import { NewsEnrichmentService } from "./NewsEnrichmentService";

// Configuration for the service
interface NewsAggregationConfig {
  enabledSources: string[];
  cacheDuration: number;
  maxCacheItems: number;
  apiKeys: {
    cryptocompare?: string;
    twitter?: string;
    // other API keys
  };
}

/**
 * Comprehensive news aggregation service that fetches, processes,
 * and analyzes news from multiple sources
 */
export class NewsAggregationService extends EventEmitter {
  private static instance: NewsAggregationService;
  private sources: Map<string, NewsSourceAdapter> = new Map();
  private sourceFactory: NewsSourceFactory;
  private cachedNews: Map<string, { items: NewsItem[]; timestamp: number }> =
    new Map();
  private cachedTrending: {
    topics: TrendingTopic[];
    timestamp: number;
  } | null = null;
  private cachedEvents: { events: NewsEvent[]; timestamp: number } | null =
    null;
  private config: NewsAggregationConfig;
  private sentimentService: SentimentAnalysisService;
  private verificationService: VerificationService;
  private enrichmentService: NewsEnrichmentService;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: NewsAggregationConfig) {
    super();
    this.config = config;
    this.sentimentService = SentimentAnalysisService.getInstance();
    this.verificationService = new VerificationService();
    this.enrichmentService = new NewsEnrichmentService();
    this.sourceFactory = new NewsSourceFactory();

    this.initializeSources();
  }

  /**
   * Get the singleton instance of the service
   */
  public static getInstance(
    config?: NewsAggregationConfig,
  ): NewsAggregationService {
    if (!NewsAggregationService.instance) {
      if (!config) {
        config = {
          enabledSources: [
            "cryptocompare",
            "coindesk",
            "cointelegraph",
            "crypto-news",
            "whale-alert",
            "cryptoquant",
            "glassnode-alerts",
            "santiment",
            "radar-hits",
          ],
          cacheDuration: 5 * 60 * 1000, // 5 minutes
          maxCacheItems: 1000,
          apiKeys: {},
        };
      }
      NewsAggregationService.instance = new NewsAggregationService(config);
    }
    return NewsAggregationService.instance;
  }

  /**
   * Initialize and register all available news sources
   */
  private initializeSources(): void {
    // Get all adapters from the factory
    const allAdapters = this.sourceFactory.getAllAdapters();

    // Filter by enabled sources in config
    for (const adapter of allAdapters) {
      if (this.config.enabledSources.includes(adapter.id)) {
        this.sources.set(adapter.id, adapter);
      }
    }

    // Register event listeners for each source
    this.sources.forEach((source) => {
      if (source.getCapabilities().supportsRealTimeUpdates) {
        // Some sources might support real-time updates via websockets or other mechanisms
        // We would set up those listeners here
      }
    });

    console.log(`Initialized ${this.sources.size} news sources`);
  }

  /**
   * Get cache key for a specific filter
   */
  private getCacheKey(filter?: Partial<NewsFilter>): string {
    return filter ? `news_${JSON.stringify(filter)}` : "news_all";
  }

  /**
   * Check if cache is valid for a given key
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cachedNews.get(key);
    if (!cached) return false;

    const now = Date.now();
    return now - cached.timestamp < this.config.cacheDuration;
  }

  /**
   * Fetch news from all enabled sources
   */
  public async fetchNews(filter?: Partial<NewsFilter>): Promise<NewsItem[]> {
    const cacheKey = this.getCacheKey(filter);

    // Return cached results if available and not expired
    if (this.isCacheValid(cacheKey)) {
      return this.cachedNews.get(cacheKey)!.items;
    }

    // Define which sources to use
    let sourcesToUse = Array.from(this.sources.values());
    if (filter?.sources && filter.sources.length > 0) {
      sourcesToUse = sourcesToUse.filter((source) =>
        filter.sources!.includes(source.id),
      );
    }

    // Fetch news from all sources in parallel
    const fetchPromises = sourcesToUse.map(async (source) => {
      try {
        console.log(`Fetching news from ${source.name}`);
        const news = await source.fetchNews(filter);
        return news;
      } catch (error) {
        console.error(`Error fetching news from ${source.name}:`, error);
        return [] as NewsItem[];
      }
    });

    let allNews = (await Promise.all(fetchPromises)).flat();

    // Deduplicate news items
    allNews = this.deduplicateNews(allNews);

    // Enrich news with additional information if requested
    if (!filter || filter.verifiedOnly === undefined || !filter.verifiedOnly) {
      allNews = await this.enrichNewsItems(allNews);
    }

    // Apply additional filtering that couldn't be done at the source level
    allNews = this.applyAdvancedFilters(allNews, filter);

    // Sort results
    allNews = this.sortResults(allNews, filter?.sortBy);

    // Update cache
    this.cachedNews.set(cacheKey, {
      items: allNews,
      timestamp: Date.now(),
    });

    // Manage cache size
    if (this.cachedNews.size > this.config.maxCacheItems) {
      // Remove oldest entries
      const entries = Array.from(this.cachedNews.entries());
      const oldestEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, entries.length - this.config.maxCacheItems);

      oldestEntries.forEach(([key]) => this.cachedNews.delete(key));
    }

    return allNews;
  }

  /**
   * Deduplicate news items from different sources
   */
  private deduplicateNews(news: NewsItem[]): NewsItem[] {
    const uniqueMap = new Map<string, NewsItem>();

    // Prioritize items with higher source reliability
    news.sort((a, b) => {
      // Prioritize by reliability
      const reliabilityDiff =
        (b.impact?.credibility || 0) - (a.impact?.credibility || 0);
      if (reliabilityDiff !== 0) return reliabilityDiff;

      // If reliability is the same, prioritize by recency
      return (
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
    });

    news.forEach((item) => {
      // Check for duplicates based on title similarity or URL
      let isDuplicate = false;

      for (const [key, existingItem] of uniqueMap.entries()) {
        // Check if URLs are similar
        if (
          item.url &&
          existingItem.url &&
          this.areUrlsSimilar(item.url, existingItem.url)
        ) {
          isDuplicate = true;
          break;
        }

        // Check if titles are very similar
        if (this.calculateSimilarity(item.title, existingItem.title) > 0.85) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueMap.set(item.id, item);
      }
    });

    return Array.from(uniqueMap.values());
  }

  /**
   * Check if two URLs are similar (from the same source/article)
   */
  private areUrlsSimilar(url1: string, url2: string): boolean {
    try {
      const parsedUrl1 = new URL(url1);
      const parsedUrl2 = new URL(url2);

      // Same hostname
      if (parsedUrl1.hostname !== parsedUrl2.hostname) {
        return false;
      }

      // Get path parts
      const path1Parts = parsedUrl1.pathname.split("/").filter((p) => p);
      const path2Parts = parsedUrl2.pathname.split("/").filter((p) => p);

      // If paths have different lengths, check if one is contained in the other
      if (path1Parts.length !== path2Parts.length) {
        const longerPath =
          path1Parts.length > path2Parts.length ? path1Parts : path2Parts;
        const shorterPath =
          path1Parts.length > path2Parts.length ? path2Parts : path1Parts;

        // Check if shorter path is contained in longer path
        return shorterPath.every((part) => longerPath.includes(part));
      }

      // If paths have same length, check if they're mostly the same
      const commonParts = path1Parts.filter((part) =>
        path2Parts.includes(part),
      );
      return (
        commonParts.length >=
        Math.min(path1Parts.length, path2Parts.length) * 0.7
      );
    } catch (e) {
      // If URLs can't be parsed, compare them as strings
      return url1 === url2;
    }
  }

  /**
   * Calculate similarity between two strings (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const words1 = s1.split(/\W+/).filter((w) => w.length > 3);
    const words2 = s2.split(/\W+/).filter((w) => w.length > 3);

    const commonWords = words1.filter((word) => words2.includes(word));
    return (2 * commonWords.length) / (words1.length + words2.length);
  }

  /**
   * Enrich news items with additional information
   */
  private async enrichNewsItems(news: NewsItem[]): Promise<NewsItem[]> {
    // Sentiment analysis
    news = await this.sentimentService.analyzeNewsBatch(news);

    // Fact checking and verification
    news = await this.verificationService.verifyNewsBatch(news);

    // Additional enrichment (social media metrics, related assets, etc.)
    news = await this.enrichmentService.enrichNewsBatch(news);

    return news;
  }

  /**
   * Apply advanced filters that couldn't be done at the source level
   */
  private applyAdvancedFilters(
    news: NewsItem[],
    filter?: Partial<NewsFilter>,
  ): NewsItem[] {
    if (!filter) return news;

    let filtered = [...news];

    // Apply verified only filter
    if (filter.verifiedOnly) {
      filtered = filtered.filter((item) => item.verified);
    }

    // Apply fact-checked only filter
    if (filter.factCheckedOnly) {
      filtered = filtered.filter(
        (item) =>
          item.fact_checking && item.fact_checking.verified_by.length > 0,
      );
    }

    // Apply impact threshold filter
    if (filter.impactThreshold !== undefined) {
      filtered = filtered.filter(
        (item) => Math.abs(item.impact.score) >= filter.impactThreshold!,
      );
    }

    // Apply asset filter
    if (filter.assets && filter.assets.length > 0) {
      filtered = filtered.filter((item) =>
        item.related_assets.some((asset) =>
          filter.assets!.includes(asset.symbol),
        ),
      );
    }

    // Apply social metrics filters
    if (filter.socialMetrics) {
      const { minEngagement, minViralityScore, platforms } =
        filter.socialMetrics;

      if (minEngagement !== undefined) {
        filtered = filtered.filter(
          (item) => item.social_metrics.total_engagement >= minEngagement,
        );
      }

      if (minViralityScore !== undefined) {
        filtered = filtered.filter(
          (item) => item.social_metrics.virality_score >= minViralityScore,
        );
      }

      if (platforms && platforms.length > 0) {
        filtered = filtered.filter((item) => {
          return platforms.some((platform) => {
            switch (platform.toLowerCase()) {
              case "twitter":
                return item.social_metrics.twitter.mentions > 0;
              case "reddit":
                return item.social_metrics.reddit.mentions > 0;
              case "telegram":
                return item.social_metrics.telegram.mentions > 0;
              case "discord":
                return item.social_metrics.discord.mentions > 0;
              case "linkedin":
                return item.social_metrics.linkedin.shares > 0;
              default:
                return false;
            }
          });
        });
      }
    }

    // Apply trading signal filters
    if (filter.tradingSignals) {
      const { direction, minConfidence, timeframe } = filter.tradingSignals;

      if (direction && minConfidence) {
        filtered = filtered.filter(
          (item) =>
            item.trading_signals?.direction === direction &&
            item.trading_signals?.confidence !== undefined &&
            item.trading_signals.confidence >= minConfidence,
        );
      } else if (direction) {
        filtered = filtered.filter(
          (item) => item.trading_signals?.direction === direction,
        );
      } else if (minConfidence) {
        filtered = filtered.filter(
          (item) =>
            item.trading_signals?.confidence !== undefined &&
            item.trading_signals.confidence >= minConfidence,
        );
      }

      if (timeframe) {
        filtered = filtered.filter(
          (item) => item.trading_signals?.timeframe === timeframe,
        );
      }
    }

    // Apply offset and limit
    if (filter.offset !== undefined && filter.limit !== undefined) {
      filtered = filtered.slice(filter.offset, filter.offset + filter.limit);
    } else if (filter.limit !== undefined) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Sort news results based on specified criteria
   */
  private sortResults(news: NewsItem[], sortBy?: string): NewsItem[] {
    switch (sortBy) {
      case "date":
        return news.sort(
          (a, b) =>
            new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime(),
        );

      case "impact":
        return news.sort((a, b) =>
          // Sort by absolute impact score and then by confidence
          Math.abs(b.impact.score) !== Math.abs(a.impact.score)
            ? Math.abs(b.impact.score) - Math.abs(a.impact.score)
            : b.impact.confidence - a.impact.confidence,
        );

      case "popularity":
        return news.sort(
          (a, b) =>
            b.social_metrics.total_engagement -
            a.social_metrics.total_engagement,
        );

      default: // 'relevance' is default
        return news.sort((a, b) => {
          // Complex relevance scoring
          const scoreA =
            a.impact.importance * 0.4 +
            Math.abs(a.impact.score) * 0.2 +
            a.impact.confidence * 0.2 +
            (a.verified ? 0.1 : 0) +
            (a.social_metrics.total_engagement / 1000) * 0.1;

          const scoreB =
            b.impact.importance * 0.4 +
            Math.abs(b.impact.score) * 0.2 +
            b.impact.confidence * 0.2 +
            (b.verified ? 0.1 : 0) +
            (b.social_metrics.total_engagement / 1000) * 0.1;

          return scoreB - scoreA;
        });
    }
  }

  /**
   * Search for news across all sources
   */
  public async searchNews(
    query: string,
    filter?: Partial<NewsFilter>,
  ): Promise<NewsItem[]> {
    // Define which sources to use
    let sourcesToUse = Array.from(this.sources.values());
    if (filter?.sources && filter.sources.length > 0) {
      sourcesToUse = sourcesToUse.filter((source) =>
        filter.sources!.includes(source.id),
      );
    }

    // Search news from all sources in parallel
    const searchPromises = sourcesToUse.map(async (source) => {
      try {
        const news = await source.searchNews(query, filter);
        return news;
      } catch (error) {
        console.error(`Error searching news from ${source.name}:`, error);
        return [] as NewsItem[];
      }
    });

    let searchResults = (await Promise.all(searchPromises)).flat();

    // Deduplicate results
    searchResults = this.deduplicateNews(searchResults);

    // Enrich news with additional information
    searchResults = await this.enrichNewsItems(searchResults);

    // Apply additional filtering
    searchResults = this.applyAdvancedFilters(searchResults, filter);

    // Sort results
    searchResults = this.sortResults(searchResults, filter?.sortBy);

    return searchResults;
  }

  /**
   * Get news specifically related to a particular asset
   */
  public async getAssetNews(
    assetSymbol: string,
    filter?: Partial<NewsFilter>,
  ): Promise<NewsItem[]> {
    // Create a combined filter
    const assetFilter: Partial<NewsFilter> = {
      ...filter,
      assets: [assetSymbol],
    };

    return this.fetchNews(assetFilter);
  }

  /**
   * Get news for a specific category
   */
  public async getCategoryNews(
    category: string,
    filter?: Partial<NewsFilter>,
  ): Promise<NewsItem[]> {
    // Create a combined filter
    const categoryFilter: Partial<NewsFilter> = {
      ...filter,
      categories: [category],
    };

    return this.fetchNews(categoryFilter);
  }

  /**
   * Get trending news based on social engagement
   */
  public async getTrendingNews(
    timeframeHours: number = 24,
    limit: number = 10,
  ): Promise<NewsItem[]> {
    // Get recent news
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - timeframeHours);

    const filter: Partial<NewsFilter> = {
      publishedAfter: startTime.toISOString(),
      sortBy: "popularity",
      limit,
    };

    return this.fetchNews(filter);
  }

  /**
   * Get trending topics based on news and social media
   */
  public async getTrendingTopics(
    timeframe: "1h" | "4h" | "24h" | "7d" = "24h",
  ): Promise<TrendingTopic[]> {
    // Check cache
    if (
      this.cachedTrending &&
      Date.now() - this.cachedTrending.timestamp < this.config.cacheDuration
    ) {
      return this.cachedTrending.topics;
    }

    // In a real implementation, this would analyze news and extract trending topics
    // For this demo, we'll return mock data
    const mockTopics: TrendingTopic[] = [
      {
        id: "1",
        name: "Ethereum Shanghai Upgrade",
        sentiment: 0.65,
        volume: 3240,
        momentum: 28,
        peak_time: new Date().toISOString(),
        related_assets: [
          { symbol: "ETH", strength: 0.95 },
          { symbol: "LDO", strength: 0.7 },
          { symbol: "RPL", strength: 0.5 },
        ],
        related_news: [],
        timeframe,
      },
      {
        id: "2",
        name: "SEC Crypto Crackdown",
        sentiment: -0.3,
        volume: 2890,
        momentum: 15,
        peak_time: new Date().toISOString(),
        related_assets: [
          { symbol: "XRP", strength: 0.8 },
          { symbol: "BNB", strength: 0.7 },
          { symbol: "SOL", strength: 0.6 },
        ],
        related_news: [],
        timeframe,
      },
      {
        id: "3",
        name: "Bitcoin ETF Approval",
        sentiment: 0.8,
        volume: 5120,
        momentum: 45,
        peak_time: new Date().toISOString(),
        related_assets: [
          { symbol: "BTC", strength: 0.98 },
          { symbol: "COIN", strength: 0.7 },
          { symbol: "ETH", strength: 0.4 },
        ],
        related_news: [],
        timeframe,
      },
    ];

    // Update cache
    this.cachedTrending = {
      topics: mockTopics,
      timestamp: Date.now(),
    };

    return mockTopics;
  }

  /**
   * Get upcoming events relevant to crypto markets
   */
  public async getUpcomingEvents(
    daysAhead: number = 30,
    filter?: Partial<NewsFilter>,
  ): Promise<NewsEvent[]> {
    // Check cache
    if (
      this.cachedEvents &&
      Date.now() - this.cachedEvents.timestamp < this.config.cacheDuration
    ) {
      return this.cachedEvents.events;
    }

    // In a real implementation, this would fetch events from a calendar API
    // For this demo, we'll return mock data
    const mockEvents: NewsEvent[] = [
      {
        id: "1",
        title: "Bitcoin Halving",
        description:
          "The Bitcoin block reward will be cut in half, reducing new supply.",
        start_time: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        type: "other",
        importance: 0.9,
        affected_assets: ["BTC"],
        source: "Bitcoin Network",
        verified: true,
        reminder_times: [],
        expected_impact: {
          direction: "positive",
          confidence: 0.8,
          magnitude: 0.7,
        },
      },
      {
        id: "2",
        title: "Ethereum DevCon",
        description:
          "Annual Ethereum developer conference with potential protocol announcements.",
        start_time: new Date(
          Date.now() + 15 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_time: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000).toISOString(),
        type: "conference",
        importance: 0.7,
        location: "Prague, Czech Republic",
        affected_assets: ["ETH"],
        url: "https://devcon.org",
        source: "Ethereum Foundation",
        verified: true,
        reminder_times: [],
        expected_impact: {
          direction: "positive",
          confidence: 0.6,
          magnitude: 0.5,
        },
      },
      {
        id: "3",
        title: "SEC Decision on XYZ Token",
        description:
          "SEC will announce decision on whether XYZ token is a security.",
        start_time: new Date(
          Date.now() + 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        type: "regulatory_deadline",
        importance: 0.8,
        affected_assets: ["XYZ"],
        source: "SEC Calendar",
        verified: true,
        reminder_times: [],
        expected_impact: {
          direction: "unknown",
          confidence: 0.4,
          magnitude: 0.8,
        },
      },
    ];

    // Filter events if needed
    let filteredEvents = mockEvents;
    if (filter?.assets && filter.assets.length > 0) {
      filteredEvents = mockEvents.filter((event) =>
        event.affected_assets.some((asset) => filter.assets!.includes(asset)),
      );
    }

    // Update cache
    this.cachedEvents = {
      events: filteredEvents,
      timestamp: Date.now(),
    };

    return filteredEvents;
  }

  /**
   * Generate a personalized news digest based on user preferences
   */
  public async generateNewsDigest(
    settings: ContentAggregationSettings,
    limit: number = 10,
  ): Promise<NewsItem[]> {
    const filter: Partial<NewsFilter> = {
      sources: settings.preferred_sources,
      categories: settings.preferred_categories,
      language: settings.preferred_languages,
      verifiedOnly: true,
      factCheckedOnly: settings.notification_settings.high_impact_only,
      limit,
    };

    // Add asset filter if needed
    if (
      settings.notification_settings.favorite_assets_only &&
      settings.preferred_sources
    ) {
      filter.assets = settings.preferred_sources;
    }

    // Fetch news with the filter
    const news = await this.fetchNews(filter);

    // Additional personalization based on settings
    if (settings.content_optimization === "in_depth") {
      // Prioritize longer, more detailed content
      news.sort((a, b) => b.content.length - a.content.length);
    } else if (settings.content_optimization === "concise") {
      // Prioritize shorter, more concise content
      news.sort((a, b) => a.content.length - b.content.length);
    }

    return news.slice(0, limit);
  }

  /**
   * Track when a user reads a news item for analytics and personalization
   */
  public trackNewsRead(newsId: string, userId: string): void {
    // In a real implementation, this would track user behavior
    console.log(`User ${userId} read news ${newsId}`);
    // Could emit an event for other services to consume
    this.emit("news_read", { newsId, userId, timestamp: Date.now() });
  }

  /**
   * Get available news sources
   */
  public getAvailableSources() {
    return Array.from(this.sources.values()).map((source) => ({
      id: source.id,
      name: source.name,
      category: source.category,
      reliability: source.reliability,
      capabilities: source.getCapabilities(),
    }));
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cachedNews.clear();
    this.cachedTrending = null;
    this.cachedEvents = null;
    console.log("News cache cleared");
  }
}
