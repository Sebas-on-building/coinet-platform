import { NewsItem } from "../../types/news";
import { SentimentAnalysisService } from "../sentimentAnalysis";
import { MarketDataService } from "../market/MarketDataService";

/**
 * Service for enriching news items with additional data like social metrics,
 * market impact analysis, related content, and more
 */
export class NewsEnrichmentService {
  private static instance: NewsEnrichmentService;
  private sentimentService: SentimentAnalysisService;
  private marketDataService: MarketDataService;

  private constructor() {
    this.sentimentService = SentimentAnalysisService.getInstance();
    this.marketDataService = MarketDataService.getInstance();
  }

  public static getInstance(): NewsEnrichmentService {
    if (!NewsEnrichmentService.instance) {
      NewsEnrichmentService.instance = new NewsEnrichmentService();
    }
    return NewsEnrichmentService.instance;
  }

  /**
   * Enhance a batch of news items with additional data
   */
  public async enrichNewsBatch(newsItems: NewsItem[]): Promise<NewsItem[]> {
    const enrichedItems = await Promise.all(
      newsItems.map(async (item) => {
        // Enrich with sentiment analysis
        const sentiment = await this.sentimentService.analyzeText(item.content);

        // Get market data for the time period around the news
        const marketData = await this.getMarketData(item);

        // Calculate impact metrics
        const impactMetrics = this.calculateImpactMetrics(item, marketData);

        // Extract entities and topics
        const entities = await this.extractEntities(item);

        // Get related content
        const relatedContent = await this.findRelatedContent(item, newsItems);

        // Calculate social engagement metrics
        const socialMetrics = await this.calculateSocialMetrics(item);

        return {
          ...item,
          marketContext: {
            sentiment: sentiment.score,
            confidence: sentiment.confidence,
            topics: sentiment.topics,
            entities: entities,
          },
          impactMetrics: {
            priceChange24h: impactMetrics.priceChange24h,
            volumeChange24h: impactMetrics.volumeChange24h,
            volatility: impactMetrics.volatility,
            momentum: impactMetrics.momentum,
          },
          relatedContent,
          social_metrics: {
            shares: socialMetrics.shares,
            likes: socialMetrics.likes,
            comments: socialMetrics.comments,
            total_engagement: socialMetrics.total_engagement,
          },
        };
      }),
    );

    return enrichedItems;
  }

  /**
   * Get market data for the time period around a news item
   */
  private async getMarketData(item: NewsItem) {
    const publishedDate = new Date(item.published_at);
    const beforeDate = new Date(publishedDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
    const afterDate = new Date(publishedDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours after

    return await this.marketDataService.getHistoricalData({
      startDate: beforeDate,
      endDate: afterDate,
      assets: item.related_assets || [],
    });
  }

  /**
   * Calculate impact metrics based on market data
   */
  private calculateImpactMetrics(item: NewsItem, marketData: any) {
    const publishedDate = new Date(item.published_at);
    const beforePrice = this.getPriceBeforeNews(marketData, publishedDate);
    const afterPrice = this.getPriceAfterNews(marketData, publishedDate);
    const beforeVolume = this.getVolumeBeforeNews(marketData, publishedDate);
    const afterVolume = this.getVolumeAfterNews(marketData, publishedDate);

    return {
      priceChange24h: this.calculatePercentageChange(beforePrice, afterPrice),
      volumeChange24h: this.calculatePercentageChange(
        beforeVolume,
        afterVolume,
      ),
      volatility: this.calculateVolatility(marketData, publishedDate),
      momentum: this.calculateMomentum(marketData, publishedDate),
    };
  }

  /**
   * Extract entities and topics from news content
   */
  private async extractEntities(item: NewsItem) {
    // In a real implementation, this would use NLP services
    // For now, return a simplified version
    const words = item.content.toLowerCase().split(/\W+/);
    const entities = new Set<string>();

    // Simple entity extraction based on capitalization and common patterns
    const sentences = item.content.split(/[.!?]+/);
    sentences.forEach((sentence) => {
      const words = sentence.split(/\s+/);
      words.forEach((word, index) => {
        if (word[0] === word[0]?.toUpperCase() && word.length > 2) {
          entities.add(word);
        }
      });
    });

    return Array.from(entities);
  }

  /**
   * Find related content based on similarity and relevance
   */
  private async findRelatedContent(item: NewsItem, allItems: NewsItem[]) {
    const relatedItems = allItems
      .filter((other) => other.id !== item.id)
      .map((other) => ({
        item: other,
        similarity: this.calculateContentSimilarity(item, other),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return relatedItems.map(({ item }) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      similarity: this.calculateContentSimilarity(item, item),
    }));
  }

  /**
   * Calculate social engagement metrics
   */
  private async calculateSocialMetrics(item: NewsItem) {
    // In a real implementation, this would fetch data from social media APIs
    // For now, return simulated metrics
    return {
      shares: Math.floor(Math.random() * 1000),
      likes: Math.floor(Math.random() * 5000),
      comments: Math.floor(Math.random() * 500),
      total_engagement: Math.floor(Math.random() * 10000),
    };
  }

  /**
   * Helper methods for market data analysis
   */
  private getPriceBeforeNews(marketData: any, publishedDate: Date) {
    // Implementation would depend on market data structure
    return 0;
  }

  private getPriceAfterNews(marketData: any, publishedDate: Date) {
    // Implementation would depend on market data structure
    return 0;
  }

  private getVolumeBeforeNews(marketData: any, publishedDate: Date) {
    // Implementation would depend on market data structure
    return 0;
  }

  private getVolumeAfterNews(marketData: any, publishedDate: Date) {
    // Implementation would depend on market data structure
    return 0;
  }

  private calculatePercentageChange(before: number, after: number) {
    if (!before) return 0;
    return ((after - before) / before) * 100;
  }

  private calculateVolatility(marketData: any, publishedDate: Date) {
    // Implementation would calculate price volatility
    return 0;
  }

  private calculateMomentum(marketData: any, publishedDate: Date) {
    // Implementation would calculate price momentum
    return 0;
  }

  private calculateContentSimilarity(item1: NewsItem, item2: NewsItem) {
    // Simple implementation using word overlap
    const words1 = new Set(item1.content.toLowerCase().split(/\W+/));
    const words2 = new Set(item2.content.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }
}
