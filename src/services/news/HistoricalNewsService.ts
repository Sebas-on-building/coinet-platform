import {
  HistoricalNewsData,
  NarrativeTimeline,
  NewsArchiveFilter,
  NewsItem,
} from "../../types/news";
import { NewsAggregationService } from "./NewsAggregationService";
import { NewsEnrichmentService } from "./NewsEnrichmentService";
import { EventEmitter } from "events";

export class HistoricalNewsService extends EventEmitter {
  private static instance: HistoricalNewsService;
  private newsAggregationService: NewsAggregationService;
  private newsEnrichmentService: NewsEnrichmentService;
  private historicalData: Map<string, HistoricalNewsData> = new Map();
  private narratives: Map<string, NarrativeTimeline> = new Map();
  private narrativeUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.newsAggregationService = NewsAggregationService.getInstance();
    this.newsEnrichmentService = NewsEnrichmentService.getInstance();
  }

  public static getInstance(): HistoricalNewsService {
    if (!HistoricalNewsService.instance) {
      HistoricalNewsService.instance = new HistoricalNewsService();
    }
    return HistoricalNewsService.instance;
  }

  /**
   * Start periodic narrative tracking
   */
  public async startNarrativeTracking() {
    // Update narratives every hour
    this.narrativeUpdateInterval = setInterval(
      async () => {
        await this.updateNarratives();
      },
      60 * 60 * 1000,
    );
  }

  /**
   * Stop narrative tracking
   */
  public async stopNarrativeTracking() {
    if (this.narrativeUpdateInterval) {
      clearInterval(this.narrativeUpdateInterval);
      this.narrativeUpdateInterval = null;
    }
  }

  /**
   * Archive a news item with its market context
   */
  public async archiveNewsItem(newsItem: NewsItem): Promise<void> {
    const enrichedItem = await this.newsEnrichmentService.enrichNewsBatch([
      newsItem,
    ]);
    const narrativeTags = this.extractNarrativeTags(enrichedItem[0]);

    const historicalData: HistoricalNewsData = {
      id: newsItem.id,
      newsItem: enrichedItem[0],
      marketContext: {
        timestamp: newsItem.published_at,
        price: 0, // Will be updated with real market data
        volume: 0,
        marketCap: 0,
        sentiment: enrichedItem[0].marketContext?.sentiment || 0,
      },
      narrativeTags,
      impactMetrics: {
        priceChange24h: enrichedItem[0].impactMetrics?.priceChange24h || 0,
        volumeChange24h: enrichedItem[0].impactMetrics?.volumeChange24h || 0,
        socialEngagement: enrichedItem[0].social_metrics?.total_engagement || 0,
        reach: enrichedItem[0].social_metrics_details?.total_reach || 0,
      },
    };

    this.historicalData.set(newsItem.id, historicalData);
    await this.updateNarratives();
  }

  /**
   * Extract narrative tags from a news item
   */
  private extractNarrativeTags(newsItem: NewsItem): string[] {
    const tags = new Set<string>();

    // Add categories as tags
    if (newsItem.categories) {
      newsItem.categories.forEach((category) => tags.add(category));
    }

    // Add sentiment analysis topics
    if (newsItem.marketContext?.topics) {
      newsItem.marketContext.topics.forEach((topic) => tags.add(topic));
    }

    // Add trending hashtags
    if (newsItem.social_metrics_details?.twitter?.trending_hashtags) {
      newsItem.social_metrics_details.twitter.trending_hashtags.forEach((tag) =>
        tags.add(tag),
      );
    }

    return Array.from(tags);
  }

  /**
   * Search historical news archive with advanced filtering
   */
  public async searchArchive(
    filter: NewsArchiveFilter = {},
  ): Promise<HistoricalNewsData[]> {
    let results = Array.from(this.historicalData.values());

    // Apply filters
    if (filter.startDate) {
      results = results.filter(
        (item) =>
          new Date(item.newsItem.published_at) >= new Date(filter.startDate!),
      );
    }
    if (filter.endDate) {
      results = results.filter(
        (item) =>
          new Date(item.newsItem.published_at) <= new Date(filter.endDate!),
      );
    }
    if (filter.narratives?.length) {
      results = results.filter((item) =>
        item.narrativeTags.some((tag) => filter.narratives!.includes(tag)),
      );
    }
    if (filter.assets?.length) {
      results = results.filter((item) =>
        item.newsItem.related_assets?.some((asset) =>
          filter.assets!.includes(asset),
        ),
      );
    }
    if (filter.minImpact) {
      results = results.filter(
        (item) =>
          Math.abs(item.impactMetrics.priceChange24h) >= filter.minImpact!,
      );
    }
    if (filter.sources?.length) {
      results = results.filter((item) =>
        filter.sources!.includes(item.newsItem.source),
      );
    }
    if (filter.categories?.length) {
      results = results.filter((item) =>
        item.newsItem.categories?.some((category) =>
          filter.categories!.includes(category),
        ),
      );
    }
    if (filter.sentiment && filter.sentiment !== "all") {
      results = results.filter((item) => {
        const sentiment = item.newsItem.marketContext?.sentiment || 0;
        switch (filter.sentiment) {
          case "positive":
            return sentiment > 0.2;
          case "negative":
            return sentiment < -0.2;
          case "neutral":
            return sentiment >= -0.2 && sentiment <= 0.2;
          default:
            return true;
        }
      });
    }
    if (filter.query) {
      const query = filter.query.toLowerCase();
      results = results.filter(
        (item) =>
          item.newsItem.title.toLowerCase().includes(query) ||
          item.newsItem.content.toLowerCase().includes(query) ||
          item.narrativeTags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return results;
  }

  /**
   * Get narrative timeline with detailed analysis
   */
  public async getNarrativeTimeline(
    narrativeId: string,
  ): Promise<NarrativeTimeline> {
    const narrative = this.narratives.get(narrativeId);
    if (!narrative) {
      throw new Error(`Narrative ${narrativeId} not found`);
    }
    return narrative;
  }

  /**
   * Get all active narratives
   */
  public async getActiveNarratives(): Promise<NarrativeTimeline[]> {
    return Array.from(this.narratives.values())
      .filter((narrative) => narrative.status === "active")
      .map((narrative) => ({
        ...narrative,
        momentum: this.calculateNarrativeMomentum(narrative),
        sentimentTrend: this.calculateSentimentTrend(narrative),
        marketCorrelation: this.calculateMarketCorrelation(narrative),
      }));
  }

  private async updateNarratives() {
    const newsItems = Array.from(this.historicalData.values());
    const narratives = new Map<string, NarrativeTimeline>();

    // Group news items by narrative tags
    const tagGroups = new Map<string, HistoricalNewsData[]>();
    newsItems.forEach((item) => {
      item.narrativeTags.forEach((tag) => {
        if (!tagGroups.has(tag)) {
          tagGroups.set(tag, []);
        }
        tagGroups.get(tag)!.push(item);
      });
    });

    // Create or update narratives
    for (const [tag, items] of tagGroups) {
      const existingNarrative = this.narratives.get(tag);
      const marketImpact = this.calculateNarrativeMarketImpact(items);

      const narrative: NarrativeTimeline = {
        id: tag,
        name: tag,
        description: this.generateNarrativeDescription(items),
        startDate: this.getEarliestDate(items),
        endDate: this.getLatestDate(items),
        relatedNews: items,
        marketImpact,
        relatedNarratives: this.findRelatedNarratives(tag, tagGroups),
        status: this.determineNarrativeStatus(items, marketImpact),
      };

      narratives.set(tag, narrative);
    }

    this.narratives = narratives;
    this.emit("narrativesUpdated", Array.from(narratives.values()));
  }

  private calculateNarrativeMomentum(narrative: NarrativeTimeline): number {
    const recentNews = narrative.relatedNews.filter((item) => {
      const newsDate = new Date(item.newsItem.published_at);
      const now = new Date();
      return now.getTime() - newsDate.getTime() <= 7 * 24 * 60 * 60 * 1000; // Last 7 days
    });

    if (recentNews.length === 0) return 0;

    const engagementTrend =
      recentNews.reduce(
        (sum, item) => sum + item.impactMetrics.socialEngagement,
        0,
      ) / recentNews.length;

    const priceImpact =
      recentNews.reduce(
        (sum, item) => sum + item.impactMetrics.priceChange24h,
        0,
      ) / recentNews.length;

    return (engagementTrend * 0.6 + priceImpact * 0.4) / 100;
  }

  private calculateSentimentTrend(narrative: NarrativeTimeline): number {
    const recentNews = narrative.relatedNews.filter((item) => {
      const newsDate = new Date(item.newsItem.published_at);
      const now = new Date();
      return now.getTime() - newsDate.getTime() <= 7 * 24 * 60 * 60 * 1000; // Last 7 days
    });

    if (recentNews.length === 0) return 0;

    return (
      recentNews.reduce(
        (sum, item) => sum + (item.newsItem.marketContext?.sentiment || 0),
        0,
      ) / recentNews.length
    );
  }

  private calculateMarketCorrelation(narrative: NarrativeTimeline): number {
    const recentNews = narrative.relatedNews.filter((item) => {
      const newsDate = new Date(item.newsItem.published_at);
      const now = new Date();
      return now.getTime() - newsDate.getTime() <= 7 * 24 * 60 * 60 * 1000; // Last 7 days
    });

    if (recentNews.length === 0) return 0;

    const priceChanges = recentNews.map(
      (item) => item.impactMetrics.priceChange24h,
    );
    const sentimentScores = recentNews.map(
      (item) => item.newsItem.marketContext?.sentiment || 0,
    );

    // Calculate correlation coefficient
    const n = priceChanges.length;
    const sumX = priceChanges.reduce((a, b) => a + b, 0);
    const sumY = sentimentScores.reduce((a, b) => a + b, 0);
    const sumXY = priceChanges.reduce(
      (sum, x, i) => sum + x * sentimentScores[i],
      0,
    );
    const sumX2 = priceChanges.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = sentimentScores.reduce((sum, y) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateNarrativeMarketImpact(items: HistoricalNewsData[]) {
    return {
      totalPriceChange: items.reduce(
        (sum, item) => sum + item.impactMetrics.priceChange24h,
        0,
      ),
      peakPriceChange: Math.max(
        ...items.map((item) => item.impactMetrics.priceChange24h),
      ),
      averageSentiment:
        items.reduce(
          (sum, item) => sum + (item.newsItem.marketContext?.sentiment || 0),
          0,
        ) / items.length,
      totalVolume: items.reduce(
        (sum, item) => sum + item.impactMetrics.volumeChange24h,
        0,
      ),
    };
  }

  private generateNarrativeDescription(items: HistoricalNewsData[]): string {
    const topics = new Set<string>();
    items.forEach((item) => {
      item.newsItem.marketContext?.topics.forEach((topic) => topics.add(topic));
    });
    return `Narrative covering ${topics.size} topics including ${Array.from(topics).slice(0, 3).join(", ")}`;
  }

  private getEarliestDate(items: HistoricalNewsData[]): string {
    return items.reduce((earliest, item) => {
      const date = new Date(item.newsItem.published_at);
      return date < new Date(earliest) ? item.newsItem.published_at : earliest;
    }, items[0].newsItem.published_at);
  }

  private getLatestDate(items: HistoricalNewsData[]): string {
    return items.reduce((latest, item) => {
      const date = new Date(item.newsItem.published_at);
      return date > new Date(latest) ? item.newsItem.published_at : latest;
    }, items[0].newsItem.published_at);
  }

  private findRelatedNarratives(
    tag: string,
    tagGroups: Map<string, HistoricalNewsData[]>,
  ): string[] {
    const related = new Set<string>();
    const currentItems = tagGroups.get(tag) || [];

    currentItems.forEach((item) => {
      item.narrativeTags.forEach((otherTag) => {
        if (otherTag !== tag) {
          related.add(otherTag);
        }
      });
    });

    return Array.from(related);
  }

  private determineNarrativeStatus(
    items: HistoricalNewsData[],
    marketImpact: {
      totalPriceChange: number;
      peakPriceChange: number;
      averageSentiment: number;
      totalVolume: number;
    },
  ): "active" | "completed" | "evolving" {
    const now = new Date();
    const latestDate = new Date(this.getLatestDate(items));
    const daysSinceLastUpdate =
      (now.getTime() - latestDate.getTime()) / (24 * 60 * 60 * 1000);

    if (daysSinceLastUpdate > 7) {
      return "completed";
    }

    const momentum = this.calculateNarrativeMomentum({
      id: "",
      name: "",
      description: "",
      startDate: "",
      relatedNews: items,
      marketImpact,
      relatedNarratives: [],
      status: "active",
    });

    return momentum > 0.5 ? "active" : "evolving";
  }
}
