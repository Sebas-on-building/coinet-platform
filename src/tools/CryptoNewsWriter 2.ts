import { NewsAggregationService } from "../services/news/NewsAggregationService";
import { NewsItem, NewsFilter } from "../types/news";
import fs from "fs";
import path from "path";

/**
 * CryptoNewsWriter - A utility to help generate and write original crypto news articles
 * by aggregating information from multiple trusted sources.
 */
export class CryptoNewsWriter {
  private newsService: NewsAggregationService;
  private outputDir: string;

  constructor(outputDir: string = "./crypto-news-articles") {
    this.newsService = NewsAggregationService.getInstance();
    this.outputDir = outputDir;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Get the latest information about a specific cryptocurrency or topic
   * to use as research for writing an article
   */
  public async researchTopic(
    topic: string,
    options: {
      assets?: string[];
      sources?: string[];
      limit?: number;
      timeframeHours?: number;
    } = {},
  ): Promise<{
    newsItems: NewsItem[];
    summary: string;
    keyPoints: string[];
    sources: string[];
  }> {
    // Default options
    const {
      assets = [],
      sources = [],
      limit = 10,
      timeframeHours = 24,
    } = options;

    // Prepare filter for news search
    const filter: Partial<NewsFilter> = {
      assets: assets.length > 0 ? assets : undefined,
      sources: sources.length > 0 ? sources : undefined,
      limit: limit,
      publishedAfter: new Date(
        Date.now() - timeframeHours * 60 * 60 * 1000,
      ).toISOString(),
    };

    // Search for relevant news
    const newsItems = await this.newsService.searchNews(topic, filter);

    // Generate summary and key points
    const summary = this.generateSummary(newsItems, topic);
    const keyPoints = this.extractKeyPoints(newsItems);

    // Extract sources for attribution
    const sourcesSet = new Set<string>();
    newsItems.forEach((item) => {
      sourcesSet.add(`${item.source} (${item.url})`);
    });

    return {
      newsItems,
      summary,
      keyPoints,
      sources: Array.from(sourcesSet),
    };
  }

  /**
   * Research market impact of a news event or topic
   */
  public async researchMarketImpact(
    topic: string,
    assets: string[],
  ): Promise<{
    overallSentiment: "bullish" | "bearish" | "neutral";
    sentimentScore: number;
    keyAssets: Array<{
      symbol: string;
      sentiment: number;
      mentions: number;
    }>;
    relatedNews: NewsItem[];
  }> {
    // Search for news about this topic
    const newsItems = await this.newsService.searchNews(topic, {
      assets,
      limit: 20,
      sortBy: "impact",
    });

    // Calculate overall sentiment
    let totalSentiment = 0;
    let validItems = 0;

    newsItems.forEach((item) => {
      if (item.impact && item.impact.score !== undefined) {
        totalSentiment += item.impact.score;
        validItems++;
      }
    });

    const avgSentiment = validItems > 0 ? totalSentiment / validItems : 0;
    const overallSentiment: "bullish" | "bearish" | "neutral" =
      avgSentiment > 0.2
        ? "bullish"
        : avgSentiment < -0.2
          ? "bearish"
          : "neutral";

    // Track asset mentions and sentiment
    const assetStats = new Map<
      string,
      { mentions: number; totalSentiment: number }
    >();

    assets.forEach((asset) => {
      assetStats.set(asset, { mentions: 0, totalSentiment: 0 });
    });

    // Count mentions and aggregate sentiment per asset
    newsItems.forEach((item) => {
      if (item.impact && Array.isArray((item.impact as any).affected_assets)) {
        (item.impact as any).affected_assets.forEach((asset: string) => {
          if (assetStats.has(asset)) {
            const stats = assetStats.get(asset)!;
            stats.mentions++;
            stats.totalSentiment += item.impact?.score ?? 0;
            assetStats.set(asset, stats);
          }
        });
      }
    });

    // Calculate per-asset sentiment
    const keyAssets = Array.from(assetStats.entries())
      .map(([symbol, stats]) => ({
        symbol,
        sentiment:
          stats.mentions > 0 ? stats.totalSentiment / stats.mentions : 0,
        mentions: stats.mentions,
      }))
      .sort((a, b) => b.mentions - a.mentions);

    return {
      overallSentiment,
      sentimentScore: avgSentiment,
      keyAssets,
      relatedNews: newsItems,
    };
  }

  /**
   * Generate an article template that can be used as a starting point
   */
  public async generateArticleTemplate(
    title: string,
    topic: string,
    assets: string[] = [],
  ): Promise<string> {
    // Research the topic
    const research = await this.researchTopic(topic, { assets });

    // Get market impact data if assets are specified
    let marketImpact = null;
    if (assets.length > 0) {
      marketImpact = await this.researchMarketImpact(topic, assets);
    }

    // Generate article template
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    let template = `# ${title}\n\n`;
    template += `**Date:** ${dateStr}\n\n`;

    // Add introduction based on summary
    template += `## Introduction\n\n${research.summary}\n\n`;

    // Add key points section
    template += `## Key Points\n\n`;
    research.keyPoints.forEach((point) => {
      template += `- ${point}\n`;
    });
    template += "\n";

    // Add market impact section if available
    if (marketImpact) {
      template += `## Market Impact\n\n`;
      template += `The overall market sentiment is **${marketImpact.overallSentiment}** with a sentiment score of ${marketImpact.sentimentScore.toFixed(2)}.\n\n`;

      template += `### Impact on Key Assets\n\n`;
      marketImpact.keyAssets.forEach((asset) => {
        const sentiment =
          asset.sentiment > 0.2
            ? "bullish"
            : asset.sentiment < -0.2
              ? "bearish"
              : "neutral";
        template += `- **${asset.symbol}**: ${sentiment} sentiment (${asset.sentiment.toFixed(2)}), mentioned in ${asset.mentions} news items\n`;
      });
      template += "\n";
    }

    // Add sections for the article body
    template += `## Background\n\n[Add relevant background information here]\n\n`;
    template += `## Analysis\n\n[Add your analysis of the situation here]\n\n`;
    template += `## Expert Opinions\n\n[Include quotes or insights from experts]\n\n`;
    template += `## Potential Implications\n\n[Discuss what this means for the market and investors]\n\n`;
    template += `## Conclusion\n\n[Summarize the key takeaways]\n\n`;

    // Add sources
    template += `## Sources\n\n`;
    research.sources.forEach((source) => {
      template += `- ${source}\n`;
    });

    return template;
  }

  /**
   * Save an article to disk
   */
  public async saveArticle(title: string, content: string): Promise<string> {
    const filename = this.sanitizeFilename(`${title}.md`);
    const filePath = path.join(this.outputDir, filename);

    fs.writeFileSync(filePath, content, "utf8");
    return filePath;
  }

  /**
   * Create and save a complete article based on a topic
   */
  public async createArticle(
    title: string,
    topic: string,
    assets: string[] = [],
  ): Promise<string> {
    const template = await this.generateArticleTemplate(title, topic, assets);
    return this.saveArticle(title, template);
  }

  /**
   * Generate a summary based on news items
   */
  protected generateSummary(newsItems: NewsItem[], topic: string): string {
    if (newsItems.length === 0) {
      return `No recent news found about ${topic}.`;
    }

    // Extract common themes
    const commonThemes = this.findCommonThemes(newsItems);

    // Create summary paragraph
    let summary = `Recent news about ${topic} indicates `;

    // Add sentiment information
    const sentiments = newsItems.map((item) =>
      item.impact && (item.impact as any).market_sentiment
        ? (item.impact as any).market_sentiment
        : "neutral",
    );
    const bullishCount = sentiments.filter((s) => s === "bullish").length;
    const bearishCount = sentiments.filter((s) => s === "bearish").length;
    const neutralCount = sentiments.filter((s) => s === "neutral").length;

    if (bullishCount > bearishCount && bullishCount > neutralCount) {
      summary += `a generally positive outlook, with ${bullishCount} of ${newsItems.length} sources reporting bullish sentiment. `;
    } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
      summary += `a generally negative outlook, with ${bearishCount} of ${newsItems.length} sources reporting bearish sentiment. `;
    } else {
      summary += `a mixed or neutral outlook in the market. `;
    }

    // Add information about common themes
    if (commonThemes.length > 0) {
      summary += `The most discussed aspects include ${commonThemes.slice(0, 3).join(", ")}. `;
    }

    // Add information about key sources
    const topSources = this.getTopSources(newsItems).slice(0, 3);
    if (topSources.length > 0) {
      summary += `Key information has been reported by ${topSources.join(", ")}.`;
    }

    return summary;
  }

  /**
   * Extract key points from news items
   */
  protected extractKeyPoints(newsItems: NewsItem[]): string[] {
    const keyPoints: string[] = [];

    // Use summaries from the most important news items as key points
    newsItems
      .sort((a, b) => (b.impact?.importance ?? 0) - (a.impact?.importance ?? 0))
      .slice(0, 5)
      .forEach((item) => {
        keyPoints.push(item.summary ?? "");
      });

    // Deduplicate points that are too similar
    const uniquePoints: string[] = [];
    keyPoints.forEach((point) => {
      if (
        !uniquePoints.some(
          (existing) => this.calculateSimilarity(point, existing) > 0.7,
        )
      ) {
        uniquePoints.push(point);
      }
    });

    return uniquePoints;
  }

  /**
   * Find common themes across news items
   */
  private findCommonThemes(newsItems: NewsItem[]): string[] {
    // Extract all tags and subcategories
    const allTags: string[] = [];
    newsItems.forEach((item) => {
      if (item.tags) allTags.push(...item.tags);
      if (item.subcategories) allTags.push(...item.subcategories);
    });

    // Count occurrences
    const tagCounts = new Map<string, number>();
    allTags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });

    // Sort by frequency
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  }

  /**
   * Get the most reliable or important sources
   */
  private getTopSources(newsItems: NewsItem[]): string[] {
    // Extract all sources
    const sources = newsItems.map((item) => item.source);

    // Count occurrences
    const sourceCounts = new Map<string, number>();
    sources.forEach((source) => {
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });

    // Sort by frequency
    return Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
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
   * Sanitize a filename to be safe for file systems
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
}
