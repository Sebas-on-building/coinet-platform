import { NewsAggregationService } from "../services/news/NewsAggregationService";
import { NewsItem, NewsFilter } from "../types/news";
import { AutomatedNewsPublisher } from "./AutomatedNewsPublisher";
import {
  formatTraditionalNews,
  ArticleTemplateData,
} from "../templates/crypto-news-article-template";
import {
  NewsImpactPredictor,
  CategoryPriceCorrelation,
  AnalyzedNewsGroup,
} from "./NewsImpactPredictor";
import fs from "fs";
import path from "path";
import { motion } from "framer-motion";
import React from "react";

/**
 * Digest grouping categories
 */
type DigestCategory =
  | "market"
  | "regulatory"
  | "technology"
  | "adoption"
  | "security";

/**
 * Configuration for a digest
 */
interface DigestConfig {
  title: string;
  timeframeHours: number;
  maxItemsPerCategory: number;
  includeCategories: DigestCategory[];
  includeSummaryBullets: boolean;
  includeMarketImpact: boolean;
  minImportance: number;
  featuredAssets?: string[];
  outputDir?: string;
}

/**
 * Results of a summary
 */
interface SummaryResult {
  title: string;
  bulletPoints: string[];
  keyAssets: string[];
  sentiment: {
    score: number;
    label: "bullish" | "bearish" | "neutral";
  };
  sources: string[];
}

/**
 * NewsDigestGenerator - Generates summaries and digests from crypto news
 */
export class NewsDigestGenerator {
  private newsService: NewsAggregationService;
  private publisher?: AutomatedNewsPublisher;
  private outputDir: string;
  private impactPredictor: NewsImpactPredictor;

  constructor(outputDir: string = "./crypto-news-digests") {
    this.newsService = NewsAggregationService.getInstance();
    this.outputDir = outputDir;
    this.impactPredictor = new NewsImpactPredictor();

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Set the publisher to use for automatic publishing
   */
  public setPublisher(publisher: AutomatedNewsPublisher): void {
    this.publisher = publisher;
  }

  /**
   * Generate a bullet-point summary of a single article
   */
  public async summarizeArticle(
    url: string,
    options: { maxBullets?: number; extractKeyAssets?: boolean } = {},
  ): Promise<SummaryResult> {
    const { maxBullets = 5, extractKeyAssets = true } = options;

    try {
      // Fetch the article content
      const newsItem = await this.fetchArticleContent(url);

      if (!newsItem) {
        throw new Error(`Could not fetch article from ${url}`);
      }

      // Extract key sentences using importance ranking
      const sentences = this.extractSentences(newsItem.content);
      const rankedSentences = this.rankSentencesByImportance(
        sentences,
        newsItem,
      );

      // Take top N sentences for the summary
      const topSentences = rankedSentences.slice(0, maxBullets);

      // Convert to bullet points and clean up
      const bulletPoints = topSentences.map((sentence) =>
        this.formatBulletPoint(sentence.text),
      );

      // Extract key assets if requested
      const keyAssets = extractKeyAssets ? (newsItem.related_assets ?? []) : [];

      return {
        title: newsItem.title,
        bulletPoints,
        keyAssets,
        sentiment: {
          score: newsItem.impact?.score ?? 0,
          label: newsItem.market_sentiment ?? "neutral",
        },
        sources: [newsItem.source],
      };
    } catch (error) {
      console.error(`Error summarizing article: ${error}`);
      throw error;
    }
  }

  /**
   * Generate a news digest for a specific timeframe
   */
  public async generateDigest(config: DigestConfig): Promise<string> {
    const {
      title,
      timeframeHours,
      maxItemsPerCategory,
      includeCategories,
      includeSummaryBullets,
      includeMarketImpact,
      minImportance,
      featuredAssets = [],
    } = config;

    try {
      // Fetch recent news across all categories
      const allNews = await this.fetchRecentNews(timeframeHours);

      // Filter by minimum importance
      const importantNews = allNews.filter(
        (item) => (item.impact?.importance ?? 0) >= minImportance,
      );

      // Group news by category
      const newsByCategory = this.groupNewsByCategory(
        importantNews,
        includeCategories,
      );

      // Create the digest content
      return this.formatDigest({
        title,
        newsByCategory,
        maxItemsPerCategory,
        includeSummaryBullets,
        includeMarketImpact,
        featuredAssets,
      });
    } catch (error) {
      console.error(`Error generating digest: ${error}`);
      throw error;
    }
  }

  /**
   * Generate a news digest for a specific timeframe with correlation analysis
   */
  public async generateDigestWithCorrelation(
    config: DigestConfig,
  ): Promise<string> {
    const {
      title,
      timeframeHours,
      maxItemsPerCategory,
      includeCategories,
      includeSummaryBullets,
      includeMarketImpact,
      minImportance,
      featuredAssets = [],
    } = config;

    try {
      // Fetch recent news across all categories
      const allNews = await this.fetchRecentNews(timeframeHours);

      // Filter by minimum importance
      const importantNews = allNews.filter(
        (item) => (item.impact?.importance ?? 0) >= minImportance,
      );

      // Group news by category
      const newsByCategory = this.groupNewsByCategory(
        importantNews,
        includeCategories,
      );

      // Get price correlation analysis
      const correlationAnalysis = await this.generateCorrelationAnalysis(
        importantNews,
        featuredAssets,
      );

      // Get market impact predictions
      const impactPredictions = await this.generateMarketImpactPredictions(
        importantNews,
        featuredAssets,
      );

      // Create the digest content with correlations
      return this.formatDigestWithCorrelation({
        title,
        newsByCategory,
        maxItemsPerCategory,
        includeSummaryBullets,
        includeMarketImpact,
        featuredAssets,
        correlationAnalysis,
        impactPredictions,
      });
    } catch (error) {
      console.error(`Error generating digest with correlation: ${error}`);
      throw error;
    }
  }

  /**
   * Create and save daily market digest
   */
  public async createDailyDigest(assets: string[] = []): Promise<string> {
    const config: DigestConfig = {
      title: `Crypto Market Daily Digest - ${new Date().toISOString().split("T")[0]}`,
      timeframeHours: 24,
      maxItemsPerCategory: 3,
      includeCategories: [
        "market",
        "regulatory",
        "technology",
        "adoption",
        "security",
      ],
      includeSummaryBullets: true,
      includeMarketImpact: true,
      minImportance: 0.4,
      featuredAssets: assets,
      outputDir: this.outputDir,
    };

    const digest = await this.generateDigest(config);
    return this.saveDigest(config.title, digest);
  }

  /**
   * Create and save weekly market digest
   */
  public async createWeeklyDigest(assets: string[] = []): Promise<string> {
    const config: DigestConfig = {
      title: `Crypto Market Weekly Digest - ${new Date().toISOString().split("T")[0]}`,
      timeframeHours: 7 * 24,
      maxItemsPerCategory: 5,
      includeCategories: [
        "market",
        "regulatory",
        "technology",
        "adoption",
        "security",
      ],
      includeSummaryBullets: true,
      includeMarketImpact: true,
      minImportance: 0.5,
      featuredAssets: assets,
      outputDir: this.outputDir,
    };

    const digest = await this.generateDigest(config);
    return this.saveDigest(config.title, digest);
  }

  /**
   * Create and save topic-specific digest
   */
  public async createTopicDigest(
    topic: string,
    assets: string[] = [],
    timeframeHours: number = 48,
  ): Promise<string> {
    // Fetch news related to this topic
    const news = await this.newsService.searchNews(topic, {
      assets,
      limit: 20,
      publishedAfter: new Date(
        Date.now() - timeframeHours * 60 * 60 * 1000,
      ).toISOString(),
    });

    // Only include news with importance score above threshold
    const importantNews = news.filter(
      (item) => (item.impact?.importance ?? 0) >= 0.4,
    );

    if (importantNews.length === 0) {
      throw new Error(`Not enough important news found for topic "${topic}"`);
    }

    // Group news by category
    const newsByCategory = this.groupNewsByCategory(importantNews, [
      "market",
      "regulatory",
      "technology",
      "adoption",
      "security",
    ]);

    // Create the digest title
    const title = `${topic} Digest - ${new Date().toISOString().split("T")[0]}`;

    // Format the digest
    const digest = this.formatDigest({
      title,
      newsByCategory,
      maxItemsPerCategory: 5,
      includeSummaryBullets: true,
      includeMarketImpact: true,
      featuredAssets: assets,
    });

    return this.saveDigest(title, digest);
  }

  /**
   * Save digest to file
   */
  private saveDigest(title: string, content: string): string {
    const filename = title.replace(/[^a-z0-9]/gi, "-").toLowerCase() + ".md";
    const filePath = path.join(this.outputDir, filename);

    fs.writeFileSync(filePath, content, "utf8");
    return filePath;
  }

  /**
   * Publish a digest using the AutomatedNewsPublisher
   */
  public async publishDigest(
    digestType: "daily" | "weekly" | "topic",
    topic?: string,
    assets: string[] = [],
  ): Promise<string> {
    if (!this.publisher) {
      throw new Error("Publisher not set. Call setPublisher() first.");
    }

    let filePath: string;

    // Generate the appropriate digest
    switch (digestType) {
      case "daily":
        filePath = await this.createDailyDigest(assets);
        break;
      case "weekly":
        filePath = await this.createWeeklyDigest(assets);
        break;
      case "topic":
        if (!topic) {
          throw new Error("Topic is required for topic-specific digests");
        }
        filePath = await this.createTopicDigest(topic, assets);
        break;
    }

    // Read the content
    const content = fs.readFileSync(filePath, "utf8");
    const title = path.basename(filePath, ".md").replace(/-/g, " ");

    // Create an article using the publisher
    const result = await this.publisher.saveArticle(title, content);

    return result;
  }

  /**
   * Fetch article content by URL
   */
  private async fetchArticleContent(url: string): Promise<NewsItem | null> {
    // This would normally fetch from an external API or database
    // For now, we'll simulate by searching for news with matching URL
    const newsItems = await this.newsService.searchNews("", {
      limit: 1,
    });

    const matchedItem = newsItems.find((item) => item.url === url);

    if (matchedItem) {
      return matchedItem;
    }

    // If not found, create a mock item for demo purposes
    return {
      id: "mock-" + Date.now(),
      title: "Sample Crypto Article",
      content:
        "This is a sample article about cryptocurrency markets. Bitcoin has been showing strong performance lately. Ethereum is also gaining momentum with its upcoming upgrade. Regulators are closely watching developments in the space. Institutional adoption continues to grow steadily.",
      summary: "A summary of recent cryptocurrency market developments.",
      url: url,
      source: "Demo Source",
      image_url: "",
      category: "market",
      subcategories: ["price", "analysis"],
      tags: ["bitcoin", "ethereum", "market"],
      author: "Demo Author",
      author_image_url: "",
      language: "en",
      published_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      impact: {
        score: 0.45,
        confidence: 0.8,
        importance: 0.7,
        credibility: 0.8,
      } as any,
      verified: true,
      verification_sources: ["Demo Source"],
      social_metrics: {
        shares: 10,
        likes: 100,
        comments: 5,
        total_engagement: 115,
      },
      related_assets: ["BTC", "ETH"],
      related_news: [],
      fact_checking: {
        verified_by: ["Demo Source"],
        accuracy_score: 0.9,
        disputed_claims: [],
      },
      source_id: "demo-source",
      impact_change: 0,
      market_sentiment: "neutral",
      sentiment_analysis: {
        score: 0,
        magnitude: 0,
        keywords: [],
        entities: [],
        topics: [],
        primary_emotion: "neutral",
      },
      social_metrics_details: {
        twitter: {
          mentions: 0,
          likes: 0,
          retweets: 0,
          quote_tweets: 0,
          sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
          influential_mentions: [],
          trending_hashtags: [],
        },
        reddit: {
          mentions: 0,
          upvotes: 0,
          comments: 0,
          awards: 0,
          top_subreddits: [],
          sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
        },
        telegram: {
          mentions: 0,
          channel_shares: 0,
          group_discussions: 0,
          reach: 0,
          sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
        },
        discord: {
          mentions: 0,
          server_shares: 0,
          reactions: 0,
          top_channels: [],
          sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
        },
        linkedin: {
          shares: 0,
          engagements: 0,
          industry_mentions: [],
          sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
        },
        engagement_trend: 0,
        total_reach: 0,
        engagement_rate: 0,
        virality_score: 0,
        growth_rate: { "1h": 0, "4h": 0, "12h": 0, "24h": 0 },
      },
    };
  }

  /**
   * Fetch recent news
   */
  private async fetchRecentNews(timeframeHours: number): Promise<NewsItem[]> {
    return this.newsService.fetchNews({
      limit: 100,
      publishedAfter: new Date(
        Date.now() - timeframeHours * 60 * 60 * 1000,
      ).toISOString(),
    });
  }

  /**
   * Group news items by category
   */
  private groupNewsByCategory(
    news: NewsItem[],
    categories: DigestCategory[],
  ): Record<DigestCategory, NewsItem[]> {
    const result: Record<DigestCategory, NewsItem[]> = {
      market: [],
      regulatory: [],
      technology: [],
      adoption: [],
      security: [],
    };

    // Filter news into categories
    news.forEach((item) => {
      const category = (item.category ?? "other") as string;
      if (
        (
          [
            "market",
            "regulatory",
            "technology",
            "adoption",
            "security",
          ] as string[]
        ).includes(category)
      ) {
        result[category as DigestCategory].push(item);
      }
    });

    // Sort each category by importance
    categories.forEach((category) => {
      result[category].sort(
        (a, b) => (b.impact?.importance ?? 0) - (a.impact?.importance ?? 0),
      );
    });

    return result;
  }

  /**
   * Format the digest content
   */
  private formatDigest(options: {
    title: string;
    newsByCategory: Record<DigestCategory, NewsItem[]>;
    maxItemsPerCategory: number;
    includeSummaryBullets: boolean;
    includeMarketImpact: boolean;
    featuredAssets: string[];
  }): string {
    const {
      title,
      newsByCategory,
      maxItemsPerCategory,
      includeSummaryBullets,
      includeMarketImpact,
      featuredAssets,
    } = options;

    let content = `# ${title}\n\n`;
    content += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;

    // Add introduction
    content += `## Executive Summary\n\n`;
    content +=
      this.generateExecutiveSummary(newsByCategory, featuredAssets) + "\n\n";

    // Add fact-checking section
    content += this.generateFactCheckingSection(newsByCategory);

    // Add social trends section
    content += this.generateSocialTrendsSection(newsByCategory);

    // Add manipulation and objectivity section
    content += this.generateManipulationAndObjectivitySection(newsByCategory);

    // Add market context section
    content += this.generateMarketContextSection(newsByCategory);

    // Add volatility and momentum section
    content += this.generateVolatilityAndMomentumSection(newsByCategory);

    // Add sector and industry trends section
    content += this.generateSectorAndIndustryTrendsSection(newsByCategory);

    // Add cross-asset correlation section
    content += this.generateCrossAssetCorrelationSection(newsByCategory);

    // Add user personalized insights section
    if (featuredAssets && featuredAssets.length > 0) {
      content += this.generateUserPersonalizedInsightsSection(
        newsByCategory,
        featuredAssets,
      );
    }

    // Add forward-looking signals section
    content += this.generateForwardLookingSignalsSection(newsByCategory);

    // Add narrative timeline section
    content += this.generateNarrativeTimelineSection(newsByCategory);

    // Add anomaly and outlier detection section
    content += this.generateAnomalyAndOutlierDetectionSection(newsByCategory);

    // Add expert and influencer quotes section
    content += this.generateExpertAndInfluencerQuotesSection(newsByCategory);

    // Add regional and language trends section
    content += this.generateRegionalAndLanguageTrendsSection(newsByCategory);

    // Add sections for each category that has news
    const categories: { key: DigestCategory; label: string }[] = [
      { key: "market", label: "Market Developments" },
      { key: "regulatory", label: "Regulatory Updates" },
      { key: "technology", label: "Technology Advancements" },
      { key: "adoption", label: "Adoption News" },
      { key: "security", label: "Security & Governance" },
    ];

    categories.forEach(({ key, label }) => {
      const categoryNews = newsByCategory[key];

      if (categoryNews.length > 0) {
        content += `## ${label}\n\n`;

        // Take top N items for this category
        const topItems = categoryNews.slice(0, maxItemsPerCategory);

        topItems.forEach((item) => {
          content += `### ${item.title}\n\n`;
          content += `${item.summary}\n\n`;

          // Add inline flag
          if (
            (item.manipulation_indicators &&
              (item.manipulation_indicators.sentiment_manipulation_score >
                0.7 ||
                item.manipulation_indicators.coordinated_activity?.detected ||
                item.manipulation_indicators.market_manipulation_risk?.level ===
                  "high" ||
                item.manipulation_indicators.bot_activity?.detected)) ||
            (typeof item.content_analysis?.objectivity_score === "number" &&
              item.content_analysis.objectivity_score < 0.4)
          ) {
            content += `⚠️ **Flagged for manipulation risk or low objectivity**\n`;
          }

          // Add bullet point summary if requested
          if (includeSummaryBullets) {
            const sentences = this.extractSentences(item.content);
            const rankedSentences = this.rankSentencesByImportance(
              sentences,
              item,
            );
            const topSentences = rankedSentences.slice(0, 3);
            const bullets = topSentences.map((s) =>
              this.formatBulletPoint(s.text),
            );

            content += `Key points:\n\n`;
            bullets.forEach((bullet) => {
              content += `- ${bullet}\n`;
            });
            content += "\n";
          }

          // Add market impact if requested
          if (includeMarketImpact && item.impact) {
            content += `**Market Impact:** ${item.market_sentiment ?? "neutral"} sentiment (${(item.impact?.score ?? 0.0).toFixed(2)})\n\n`;
          }

          content += `**Source:** [${item.source}](${item.url})\n\n`;
        });
      }
    });

    // Add market sentiment overview for featured assets
    if (featuredAssets.length > 0 && includeMarketImpact) {
      content += this.generateAssetSentimentSection(
        newsByCategory,
        featuredAssets,
      );
    }

    return content;
  }

  /**
   * Generate executive summary for the digest
   */
  private generateExecutiveSummary(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
    featuredAssets: string[],
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Get overall sentiment
    const sentiments = allNews.map((item) => item.impact?.score ?? 0);
    const avgSentiment =
      sentiments.length > 0
        ? sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length
        : 0;

    const sentimentLabel =
      avgSentiment > 0.2
        ? "bullish"
        : avgSentiment < -0.2
          ? "bearish"
          : "neutral";

    // Count news by category
    const categoryCounts: Record<string, number> = {};
    Object.entries(newsByCategory).forEach(([category, items]) => {
      categoryCounts[category] = items.length;
    });

    // Sentiment breakdown by category
    const categorySentiments: Record<string, { avg: number; label: string }> =
      {};
    Object.entries(newsByCategory).forEach(([category, items]) => {
      const scores = items.map((item) => item.impact?.score ?? 0);
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      const label = avg > 0.2 ? "bullish" : avg < -0.2 ? "bearish" : "neutral";
      categorySentiments[category] = { avg, label };
    });

    // Fact-checked news count and most fact-checked news
    const factCheckedNews = allNews.filter(
      (item) => item.fact_checking && item.fact_checking.verified_by.length > 0,
    );
    const mostFactChecked = factCheckedNews.sort(
      (a, b) =>
        (b.fact_checking?.verified_by.length ?? 0) -
        (a.fact_checking?.verified_by.length ?? 0),
    )[0];

    // Unique verified sources
    const verifiedSources = new Set<string>();
    factCheckedNews.forEach((item) =>
      item.fact_checking?.verified_by.forEach((src) =>
        verifiedSources.add(src),
      ),
    );

    // Find top categories
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([category]) => this.formatCategoryName(category));

    // Create summary paragraph
    let summary = `This digest covers ${allNews.length} significant developments `;

    if (topCategories.length > 0) {
      summary += `with emphasis on ${topCategories.join(" and ")}. `;
    } else {
      summary += `across various categories. `;
    }

    summary += `The overall market sentiment is ${sentimentLabel}`;

    if (Math.abs(avgSentiment) > 0.1) {
      summary += ` (${avgSentiment.toFixed(2)}). `;
    } else {
      summary += `. `;
    }

    // Add sentiment breakdown by category
    summary += `\n\n**Sentiment by Category:**\n`;
    Object.entries(categorySentiments).forEach(([cat, { avg, label }]) => {
      summary += `- ${this.formatCategoryName(cat)}: ${label} (${avg.toFixed(2)})\n`;
    });

    // Add fact-checking and verification info
    summary += `\n**Fact-Checked News:** ${factCheckedNews.length} articles verified by ${verifiedSources.size} unique sources.\n`;
    if (mostFactChecked) {
      summary += `Most fact-checked: "${mostFactChecked.title}" (verified by ${mostFactChecked.fact_checking?.verified_by.length} sources).\n`;
    }

    // Add featured assets if available
    if (featuredAssets.length > 0) {
      // Count how many news items mention each asset
      const assetMentions: Record<string, number> = {};
      featuredAssets.forEach((asset) => {
        assetMentions[asset] = allNews.filter((item) =>
          item.related_assets?.includes(asset),
        ).length;
      });

      // Find top mentioned assets
      const topAssets = Object.entries(assetMentions)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([asset]) => asset);

      if (topAssets.length > 0) {
        summary += `Among the featured assets, ${topAssets.join(", ")} received the most attention in recent news.`;
      }
    }

    return summary;
  }

  /**
   * Generate fact-checking section
   */
  private generateFactCheckingSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    const factCheckedNews = allNews.filter(
      (item) => item.fact_checking && item.fact_checking.verified_by.length > 0,
    );
    if (factCheckedNews.length === 0) {
      return "";
    }

    let content = `## Fact-Checking & Verification\n\n`;
    content += `A total of ${factCheckedNews.length} articles in this digest have been fact-checked and verified by trusted sources.\n\n`;
    factCheckedNews.forEach((item) => {
      content += `- **${item.title}**\n`;
      content += `  - Verified by: ${item.fact_checking?.verified_by.join(", ")}\n`;
      if (
        item.fact_checking?.disputed_claims &&
        item.fact_checking.disputed_claims.length > 0
      ) {
        content += `  - Disputed Claims:`;
        item.fact_checking.disputed_claims.forEach((claim) => {
          content += `\n    - Claim: ${claim.claim}\n      Refutation: ${claim.refutation}\n      Source: ${claim.source}`;
        });
        content += `\n`;
      }
    });
    content += `\n`;
    return content;
  }

  /**
   * Generate social trends section
   */
  private generateSocialTrendsSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Aggregate hashtags, subreddits, and influential mentions
    const hashtags: Record<string, number> = {};
    const subreddits: Record<string, number> = {};
    const influentialMentions: Array<{
      username: string;
      followers: number;
      tweet_url: string;
      tweet_text: string;
    }> = [];

    allNews.forEach((item) => {
      // Twitter hashtags
      item.social_metrics_details?.twitter?.trending_hashtags?.forEach(
        (tag) => {
          hashtags[tag] = (hashtags[tag] || 0) + 1;
        },
      );
      // Reddit subreddits
      item.social_metrics_details?.reddit?.top_subreddits?.forEach((sub) => {
        if (typeof sub === "string") {
          subreddits[sub] = (subreddits[sub] || 0) + 1;
        } else if (sub?.name) {
          subreddits[sub.name] =
            (subreddits[sub.name] || 0) + (sub.mentions ?? 1);
        }
      });
      // Influential Twitter mentions
      item.social_metrics_details?.twitter?.influential_mentions?.forEach(
        (mention) => {
          influentialMentions.push(mention);
        },
      );
    });

    if (
      Object.keys(hashtags).length === 0 &&
      Object.keys(subreddits).length === 0 &&
      influentialMentions.length === 0
    ) {
      return "";
    }

    let content = `## Social Trends\n\n`;
    if (Object.keys(hashtags).length > 0) {
      const topHashtags = Object.entries(hashtags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => `#${tag} (${count})`)
        .join(", ");
      content += `**Trending Hashtags:** ${topHashtags}\n`;
    }
    if (Object.keys(subreddits).length > 0) {
      const topSubs = Object.entries(subreddits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sub, count]) => `r/${sub} (${count})`)
        .join(", ");
      content += `**Top Subreddits:** ${topSubs}\n`;
    }
    if (influentialMentions.length > 0) {
      const topMentions = influentialMentions
        .sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0))
        .slice(0, 5)
        .map(
          (mention) =>
            `[@${mention.username}](${mention.tweet_url}) (${mention.followers} followers): ${mention.tweet_text}`,
        )
        .join("\n");
      content += `**Influential Twitter Mentions:**\n${topMentions}\n`;
    }
    content += `\n`;
    return content;
  }

  /**
   * Generate asset sentiment section
   */
  private generateAssetSentimentSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
    featuredAssets: string[],
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    let content = `## Asset Sentiment Overview\n\n`;

    // Calculate sentiment for each asset
    featuredAssets.forEach((asset) => {
      // Get news mentioning this asset
      const assetNews = allNews.filter((item) =>
        item.related_assets?.includes(asset),
      );

      if (assetNews.length === 0) {
        content += `**${asset}:** No significant news during this period.\n\n`;
        return;
      }

      // Calculate average market sentiment
      const sentiments = assetNews.map((item) => item.impact?.score ?? 0);
      const avgSentiment =
        sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
      const sentimentLabel =
        avgSentiment > 0.2
          ? "bullish"
          : avgSentiment < -0.2
            ? "bearish"
            : "neutral";

      // Calculate average NLP sentiment
      const nlpScores = assetNews.map(
        (item) => item.sentiment_analysis?.score ?? 0,
      );
      const avgNlpSentiment =
        nlpScores.length > 0
          ? nlpScores.reduce((a, b) => a + b, 0) / nlpScores.length
          : 0;

      // Most bullish and most bearish news
      const sortedByNlp = assetNews
        .filter((item) => typeof item.sentiment_analysis?.score === "number")
        .sort(
          (a, b) =>
            (b.sentiment_analysis?.score ?? 0) -
            (a.sentiment_analysis?.score ?? 0),
        );
      const mostBullish = sortedByNlp[0];
      const mostBearish = sortedByNlp[sortedByNlp.length - 1];

      // Social engagement stats (Twitter, Reddit, etc.)
      let twitterMentions = 0,
        redditMentions = 0,
        telegramMentions = 0;
      assetNews.forEach((item) => {
        twitterMentions += item.social_metrics_details?.twitter?.mentions ?? 0;
        redditMentions += item.social_metrics_details?.reddit?.mentions ?? 0;
        telegramMentions +=
          item.social_metrics_details?.telegram?.mentions ?? 0;
      });

      // Fact-checking status for top news
      const topNews = assetNews
        .sort(
          (a, b) => (b.impact?.importance ?? 0) - (a.impact?.importance ?? 0),
        )
        .slice(0, 1)[0];
      const isFactChecked = topNews?.fact_checking?.verified_by.length > 0;
      const factCheckSources = topNews?.fact_checking?.verified_by.join(", ");

      content += `**${asset}:** ${sentimentLabel} sentiment (${avgSentiment.toFixed(2)}), NLP avg: ${avgNlpSentiment.toFixed(2)} across ${assetNews.length} news items.\n`;
      content += `- **Social Engagement:** Twitter: ${twitterMentions}, Reddit: ${redditMentions}, Telegram: ${telegramMentions}\n`;
      if (mostBullish && mostBearish && mostBullish !== mostBearish) {
        content += `- **Most Bullish News:** [${mostBullish.title}](${mostBullish.url}) (NLP: ${(mostBullish.sentiment_analysis?.score ?? 0).toFixed(2)})\n`;
        content += `- **Most Bearish News:** [${mostBearish.title}](${mostBearish.url}) (NLP: ${(mostBearish.sentiment_analysis?.score ?? 0).toFixed(2)})\n`;
      } else if (mostBullish) {
        content += `- **Most Significant News:** [${mostBullish.title}](${mostBullish.url}) (NLP: ${(mostBullish.sentiment_analysis?.score ?? 0).toFixed(2)})\n`;
      }
      if (topNews) {
        content += `- **Top News Fact-Checked:** ${isFactChecked ? `Yes (by ${factCheckSources})` : "No"}\n`;
      }
      content += `\n`;
    });

    return content;
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): string[] {
    // Simple sentence extraction using periods, question marks, and exclamation points
    if (!text) return [];

    const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
    return sentences.map((s) => s.trim() + ".");
  }

  /**
   * Rank sentences by importance
   */
  private rankSentencesByImportance(
    sentences: string[],
    newsItem: NewsItem,
  ): Array<{ text: string; score: number }> {
    // Calculate score for each sentence
    const scoredSentences = sentences.map((sentence) => {
      let score = 0;

      // Position score (sentences at the beginning are usually more important)
      const position = sentences.indexOf(sentence);
      score += (sentences.length - position) / sentences.length;

      // Keyword match score
      const keywords = [
        ...(newsItem.tags ?? []),
        ...(newsItem.subcategories ?? []),
        ...(newsItem.related_assets ?? []),
      ];

      keywords.forEach((keyword) => {
        if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
          score += 0.5;
        }
      });

      // Length penalty (avoid very short sentences)
      if (sentence.length < 30) {
        score *= 0.7;
      }

      return { text: sentence, score };
    });

    // Sort by score descending
    return scoredSentences.sort((a, b) => b.score - a.score);
  }

  /**
   * Format a bullet point
   */
  private formatBulletPoint(text: string): string {
    // Clean up the text and ensure it ends with proper punctuation
    let bullet = text.trim();

    // Remove trailing spaces before punctuation
    bullet = bullet.replace(/\s+([.!?])$/, "$1");

    // Ensure the sentence ends with punctuation
    if (!bullet.match(/[.!?]$/)) {
      bullet += ".";
    }

    return bullet;
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    switch (category) {
      case "market":
        return "market developments";
      case "regulatory":
        return "regulatory updates";
      case "technology":
        return "technology advancements";
      case "adoption":
        return "adoption news";
      case "security":
        return "security concerns";
      default:
        return category;
    }
  }

  /**
   * Generate correlation analysis for news items
   */
  private async generateCorrelationAnalysis(
    newsItems: NewsItem[],
    featuredAssets: string[] = [],
  ): Promise<CategoryPriceCorrelation[]> {
    // Get all unique categories
    const categories = [
      ...new Set(newsItems.map((item) => item.category ?? "other")),
    ];

    // Get correlations for all categories
    const categoryCorrelations = this.impactPredictor.getCategoryCorrelations();

    // Get asset-specific correlations
    const assetCorrelations: CategoryPriceCorrelation[] = [];

    for (const asset of featuredAssets) {
      const correlations =
        this.impactPredictor.getAssetCategoryCorrelations(asset);
      assetCorrelations.push(...correlations);
    }

    // Combine and filter by categories present in the news
    const filteredCorrelations = categoryCorrelations.filter((corr) =>
      categories.includes(corr.category ?? "other"),
    );

    return filteredCorrelations;
  }

  /**
   * Generate market impact predictions for news categories
   */
  private async generateMarketImpactPredictions(
    newsItems: NewsItem[],
    featuredAssets: string[] = [],
  ): Promise<AnalyzedNewsGroup[]> {
    // Analyze all news items as groups
    return await this.impactPredictor.analyzeNewsGroup(newsItems);
  }

  /**
   * Format the digest content with correlation data
   */
  private formatDigestWithCorrelation(options: {
    title: string;
    newsByCategory: Record<DigestCategory, NewsItem[]>;
    maxItemsPerCategory: number;
    includeSummaryBullets: boolean;
    includeMarketImpact: boolean;
    featuredAssets: string[];
    correlationAnalysis: CategoryPriceCorrelation[];
    impactPredictions: AnalyzedNewsGroup[];
  }): string {
    const {
      title,
      newsByCategory,
      maxItemsPerCategory,
      includeSummaryBullets,
      includeMarketImpact,
      featuredAssets,
      correlationAnalysis,
      impactPredictions,
    } = options;

    // Start with standard digest content
    let content = this.formatDigest({
      title,
      newsByCategory,
      maxItemsPerCategory,
      includeSummaryBullets,
      includeMarketImpact,
      featuredAssets,
    });

    // Add correlation and prediction sections
    content += this.formatCorrelationSection(correlationAnalysis);
    content += this.formatPredictionSection(impactPredictions, featuredAssets);

    // Add user personalized insights section
    if (featuredAssets && featuredAssets.length > 0) {
      content += this.generateUserPersonalizedInsightsSection(
        newsByCategory,
        featuredAssets,
      );
    }

    // Add forward-looking signals section
    content += this.generateForwardLookingSignalsSection(newsByCategory);

    // Add narrative timeline section
    content += this.generateNarrativeTimelineSection(newsByCategory);

    // Add sections for each category that has news
    const categories: { key: DigestCategory; label: string }[] = [
      { key: "market", label: "Market Developments" },
      { key: "regulatory", label: "Regulatory Updates" },
      { key: "technology", label: "Technology Advancements" },
      { key: "adoption", label: "Adoption News" },
      { key: "security", label: "Security & Governance" },
    ];

    categories.forEach(({ key, label }) => {
      const categoryNews = newsByCategory[key];

      if (categoryNews.length > 0) {
        content += `## ${label}\n\n`;

        // Take top N items for this category
        const topItems = categoryNews.slice(0, maxItemsPerCategory);

        topItems.forEach((item) => {
          content += `### ${item.title}\n\n`;
          content += `${item.summary}\n\n`;

          // Add inline flag
          if (
            (item.manipulation_indicators &&
              (item.manipulation_indicators.sentiment_manipulation_score >
                0.7 ||
                item.manipulation_indicators.coordinated_activity?.detected ||
                item.manipulation_indicators.market_manipulation_risk?.level ===
                  "high" ||
                item.manipulation_indicators.bot_activity?.detected)) ||
            (typeof item.content_analysis?.objectivity_score === "number" &&
              item.content_analysis.objectivity_score < 0.4)
          ) {
            content += `⚠️ **Flagged for manipulation risk or low objectivity**\n`;
          }

          // Add bullet point summary if requested
          if (includeSummaryBullets) {
            const sentences = this.extractSentences(item.content);
            const rankedSentences = this.rankSentencesByImportance(
              sentences,
              item,
            );
            const topSentences = rankedSentences.slice(0, 3);
            const bullets = topSentences.map((s) =>
              this.formatBulletPoint(s.text),
            );

            content += `Key points:\n\n`;
            bullets.forEach((bullet) => {
              content += `- ${bullet}\n`;
            });
            content += "\n";
          }

          // Add market impact if requested
          if (includeMarketImpact && item.impact) {
            content += `**Market Impact:** ${item.market_sentiment ?? "neutral"} sentiment (${(item.impact?.score ?? 0.0).toFixed(2)})\n\n`;
          }

          content += `**Source:** [${item.source}](${item.url})\n\n`;
        });
      }
    });

    // Add market sentiment overview for featured assets
    if (featuredAssets.length > 0 && includeMarketImpact) {
      content += this.generateAssetSentimentSection(
        newsByCategory,
        featuredAssets,
      );
    }

    return content;
  }

  /**
   * Format correlation section
   */
  private formatCorrelationSection(
    correlations: CategoryPriceCorrelation[],
  ): string {
    if (correlations.length === 0) {
      return "";
    }

    let content = `\n\n## Historical Price Correlations\n\n`;
    content += `The following analysis shows historical correlations between news categories and price movements:\n\n`;

    correlations.forEach((corr: CategoryPriceCorrelation) => {
      const avgImpact =
        typeof corr.avg_price_impact["24h"] === "number"
          ? corr.avg_price_impact["24h"].toFixed(2)
          : String(corr.avg_price_impact["24h"]);
      content += `### ${this.formatCategoryName(corr.category ?? "other")}\n\n`;
      content += `- **Correlation Score:** ${typeof corr.correlation_score === "number" ? corr.correlation_score.toFixed(2) : String(corr.correlation_score)}\n`;
      content += `- **Average Price Impact (24h):** ${avgImpact}%\n`;
      content += `- **Sample Size:** ${corr.sample_size} news events\n\n`;

      if (corr.top_affected_assets.length > 0) {
        content += `**Top Affected Assets:**\n\n`;
        corr.top_affected_assets.forEach((asset) => {
          content += `- **${asset.symbol}:** ${asset.avg_impact.toFixed(2)}% average impact (reliability: ${(asset.reliability * 100).toFixed(0)}%)\n`;
        });
        content += `\n`;
      }
    });

    return content;
  }

  /**
   * Format prediction section
   */
  private formatPredictionSection(
    predictions: AnalyzedNewsGroup[],
    featuredAssets: string[] = [],
  ): string {
    if (predictions.length === 0) {
      return "";
    }

    let content = `\n\n## Market Impact Predictions\n\n`;
    content += `Based on historical correlations and current news sentiment, here are the predicted market impacts: \n\n`;

    predictions.forEach((group) => {
      content += `### ${this.formatCategoryName(group.category ?? "other")} (${group.news_count} news items) \n\n`;

      // Overall prediction
      const direction = group.predictions.overall_prediction.direction;
      const magnitude = group.predictions.overall_prediction.expected_magnitude;
      const confidence = group.predictions.overall_prediction.confidence;

      content += `** Overall Market Prediction:** ${direction === "up" ? "📈 Upward" : direction === "down" ? "📉 Downward" : "⟷ Neutral"} movement`;
      content += ` of approximately ${magnitude.toFixed(2)}% (${(confidence * 100).toFixed(0)}% confidence) \n\n`;

      // Asset-specific predictions
      const relevantAssets =
        featuredAssets.length > 0
          ? Object.keys(group.predictions.asset_predictions).filter((asset) =>
              featuredAssets.includes(asset),
            )
          : Object.keys(group.predictions.asset_predictions);

      if (relevantAssets.length > 0) {
        content += `** Asset - Specific Predictions:**\n\n`;

        relevantAssets.forEach((asset) => {
          const prediction = group.predictions.asset_predictions[asset];

          if (prediction) {
            const dirIcon =
              prediction.direction === "up"
                ? "📈"
                : prediction.direction === "down"
                  ? "📉"
                  : "⟷";
            const changeText =
              prediction.direction === "neutral"
                ? "minimal change"
                : `${prediction.expected_magnitude.toFixed(2)}% ${prediction.direction === "up" ? "increase" : "decrease"} `;

            content += `- ** ${asset}:** ${dirIcon} Expected ${changeText} (${(prediction.confidence * 100).toFixed(0)}% confidence)`;
            content += ` - Historical accuracy: ${(prediction.historical_accuracy * 100).toFixed(0)}%\n`;
          } else {
            content += `No specific prediction available for ${asset} in this category.\n\n`;
          }
        });
        content += `\n`;
      } else {
        content += `Insufficient data for impact prediction.\n\n`;
      }
    });

    return content;
  }

  /**
   * Create and save daily market digest with correlation analysis
   */
  public async createDailyDigestWithCorrelation(
    assets: string[] = [],
  ): Promise<string> {
    const config: DigestConfig = {
      title: `Crypto Market Daily Digest & Impact Analysis - ${new Date().toISOString().split("T")[0]} `,
      timeframeHours: 24,
      maxItemsPerCategory: 3,
      includeCategories: [
        "market",
        "regulatory",
        "technology",
        "adoption",
        "security",
      ],
      includeSummaryBullets: true,
      includeMarketImpact: true,
      minImportance: 0.4,
      featuredAssets: assets,
      outputDir: this.outputDir,
    };

    const digest = await this.generateDigestWithCorrelation(config);
    return this.saveDigest(config.title, digest);
  }

  /**
   * Create and save weekly market digest with correlation analysis
   */
  public async createWeeklyDigestWithCorrelation(
    assets: string[] = [],
  ): Promise<string> {
    const config: DigestConfig = {
      title: `Crypto Market Weekly Digest & Impact Analysis - ${new Date().toISOString().split("T")[0]} `,
      timeframeHours: 7 * 24,
      maxItemsPerCategory: 5,
      includeCategories: [
        "market",
        "regulatory",
        "technology",
        "adoption",
        "security",
      ],
      includeSummaryBullets: true,
      includeMarketImpact: true,
      minImportance: 0.5,
      featuredAssets: assets,
      outputDir: this.outputDir,
    };

    const digest = await this.generateDigestWithCorrelation(config);
    return this.saveDigest(config.title, digest);
  }

  /**
   * Create and save asset-specific impact analysis
   */
  public async createAssetImpactAnalysis(
    asset: string,
    timeframeHours: number = 48,
  ): Promise<string> {
    // Fetch all news mentioning this asset
    const news = await this.newsService.searchNews("", {
      assets: [asset],
      limit: 50,
      publishedAfter: new Date(
        Date.now() - timeframeHours * 60 * 60 * 1000,
      ).toISOString(),
    });

    if (news.length === 0) {
      throw new Error(`No recent news found for ${asset}`);
    }

    // Get price correlations for this asset
    const assetCorrelations =
      this.impactPredictor.getAssetCategoryCorrelations(asset);

    // Analyze news impact
    const analyzedGroups = await this.impactPredictor.analyzeNewsGroup(news);

    // Format the analysis
    const title = `${asset} Price Impact Analysis - ${new Date().toISOString().split("T")[0]} `;
    let content = `# ${title} \n\n`;

    // Summary section
    content += `## Summary\n\n`;
    content += `This analysis examines ${news.length} news items mentioning ${asset} over the past ${timeframeHours} hours.\n\n`;

    // Calculate overall sentiment
    const sentimentScores = news.map((item) => item.impact?.score ?? 0);
    const avgSentiment =
      sentimentScores.reduce((sum, score) => sum + score, 0) /
      sentimentScores.length;
    const sentimentLabel =
      avgSentiment > 0.2
        ? "bullish"
        : avgSentiment < -0.2
          ? "bearish"
          : "neutral";

    content += `** Overall Sentiment:** ${sentimentLabel} (${avgSentiment.toFixed(2)}) \n\n`;

    // Add historical correlation data
    content += `## Historical Price Correlations for ${asset}\n\n`;
    if (assetCorrelations.length > 0) {
      assetCorrelations.forEach((corr: CategoryPriceCorrelation) => {
        const avgImpact =
          typeof corr.avg_price_impact["24h"] === "number"
            ? corr.avg_price_impact["24h"].toFixed(2)
            : String(corr.avg_price_impact["24h"]);
        const corrScore =
          typeof corr.correlation_score === "number"
            ? (corr.correlation_score * 100).toFixed(0)
            : String(corr.correlation_score);
        content += `- ** ${this.formatCategoryName(corr.category ?? "other")} News:** ${avgImpact}% average price impact`;
        content += ` (${corr.sample_size} historical events, ${corrScore}% correlation score) \n`;
      });
    } else {
      content += `No historical correlation data available for ${asset} yet.\n`;
    }
    content += `\n`;

    // Add impact predictions
    content += `## Price Impact Predictions\n\n`;

    if (analyzedGroups.length > 0) {
      analyzedGroups.forEach((group) => {
        content += `### Based on ${this.formatCategoryName(group.category ?? "other")} News(${group.news_count} items) \n\n`;

        // Get prediction for this asset
        const assetPrediction = group.predictions.asset_predictions[asset];

        if (assetPrediction) {
          const dirIcon =
            assetPrediction.direction === "up"
              ? "📈"
              : assetPrediction.direction === "down"
                ? "📉"
                : "⟷";
          const changeText =
            assetPrediction.direction === "neutral"
              ? "minimal change"
              : `${assetPrediction.expected_magnitude.toFixed(2)}% ${assetPrediction.direction === "up" ? "increase" : "decrease"} `;

          content += `** Prediction:** ${dirIcon} Expected ${changeText} over the next 24 hours\n`;
          content += `** Confidence:** ${(assetPrediction.confidence * 100).toFixed(0)}%\n`;
          content += `** Historical Accuracy:** ${(assetPrediction.historical_accuracy * 100).toFixed(0)}%\n\n`;
          content += `Current Price: $${assetPrediction.current_price.toFixed(2)} \n`;
          content += `Predicted Price: $${assetPrediction.expected_price.toFixed(2)} \n\n`;
        } else {
          content += `No specific prediction available for ${asset} in this category.\n\n`;
        }

        // Show supporting events
        if (group.predictions.supporting_events.length > 0) {
          content += `** Similar Historical Events:**\n\n`;
          group.predictions.supporting_events.forEach(
            (event: { title: string; actual_impact: number | string }) => {
              const impact =
                typeof event.actual_impact === "number"
                  ? event.actual_impact.toFixed(2)
                  : String(event.actual_impact);
              content += `- ** ${event.title}** - Impact: ${impact} \n`;
            },
          );
          content += `\n`;
        }
      });
    } else {
      content += `Insufficient data for impact prediction.\n\n`;
    }

    // Recent news section
    content += `## Recent ${asset} News\n\n`;
    const topNews = news
      .sort((a, b) => (b.impact?.importance ?? 0) - (a.impact?.importance ?? 0))
      .slice(0, 10);
    topNews.forEach((item) => {
      content += `### ${item.title} \n\n`;
      content += `${item.summary} \n\n`;
      content += `** Source:** [${item.source}](${item.url}) \n`;
      content += `** Published:** ${new Date(item.published_at).toLocaleString()} \n`;
      content += `** Sentiment:** ${item.market_sentiment ?? "neutral"} (${(item.impact?.score ?? 0.0).toFixed(2)}) \n\n`;
    });
    return this.saveDigest(title, content);
  }

  /**
   * Generate manipulation and objectivity section
   */
  private generateManipulationAndObjectivitySection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Find flagged news
    const flagged = allNews.filter((item) => {
      const manipulation = item.manipulation_indicators;
      const objectivity = item.content_analysis?.objectivity_score;
      return (
        (manipulation &&
          (manipulation.sentiment_manipulation_score > 0.7 ||
            manipulation.coordinated_activity?.detected ||
            manipulation.market_manipulation_risk?.level === "high" ||
            manipulation.bot_activity?.detected)) ||
        (typeof objectivity === "number" && objectivity < 0.4)
      );
    });

    if (flagged.length === 0) {
      return "";
    }

    let content = `## Manipulation & Objectivity Flags\n\n`;
    content += `The following articles are flagged for high manipulation risk or low objectivity.\n\n`;
    flagged.forEach((item) => {
      content += `- **${item.title}**\n`;
      if (item.manipulation_indicators) {
        const m = item.manipulation_indicators;
        if (m.sentiment_manipulation_score > 0.7)
          content += `  - High sentiment manipulation score: ${m.sentiment_manipulation_score}\n`;
        if (m.coordinated_activity?.detected)
          content += `  - Coordinated activity detected (pattern: ${m.coordinated_activity.pattern_type}, confidence: ${m.coordinated_activity.confidence})\n`;
        if (m.market_manipulation_risk?.level === "high")
          content += `  - High market manipulation risk\n`;
        if (m.bot_activity?.detected)
          content += `  - Bot activity detected (${m.bot_activity.percentage}% bots)\n`;
      }
      if (
        typeof item.content_analysis?.objectivity_score === "number" &&
        item.content_analysis.objectivity_score < 0.4
      ) {
        content += `  - Low objectivity score: ${item.content_analysis.objectivity_score}\n`;
      }
    });
    content += `\n`;
    return content;
  }

  /**
   * Generate market context section
   */
  private generateMarketContextSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Aggregate sentiment, topics, and entities
    let totalSentiment = 0,
      sentimentCount = 0;
    const topicCounts: Record<string, number> = {};
    const entityCounts: Record<string, number> = {};

    allNews.forEach((item) => {
      // Aggregate marketContext sentiment
      if (typeof item.marketContext?.sentiment === "number") {
        totalSentiment += item.marketContext.sentiment;
        sentimentCount++;
      }
      // Aggregate topics
      item.marketContext?.topics?.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
      // Aggregate entities
      item.marketContext?.entities?.forEach((entity) => {
        entityCounts[entity] = (entityCounts[entity] || 0) + 1;
      });
      // Also include sentiment_analysis topics/entities
      item.sentiment_analysis?.topics?.forEach((t) => {
        if (typeof t === "string") {
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        } else if (t?.name) {
          topicCounts[t.name] = (topicCounts[t.name] || 0) + 1;
        }
      });
      item.sentiment_analysis?.entities?.forEach((e) => {
        if (typeof e === "string") {
          entityCounts[e] = (entityCounts[e] || 0) + 1;
        } else if (e?.name) {
          entityCounts[e.name] = (entityCounts[e.name] || 0) + 1;
        }
      });
    });

    if (
      sentimentCount === 0 &&
      Object.keys(topicCounts).length === 0 &&
      Object.keys(entityCounts).length === 0
    ) {
      return "";
    }

    let content = `## Market Context & Narrative Trends\n\n`;
    if (sentimentCount > 0) {
      const avgSentiment = totalSentiment / sentimentCount;
      const sentimentLabel =
        avgSentiment > 0.2
          ? "bullish"
          : avgSentiment < -0.2
            ? "bearish"
            : "neutral";
      content += `**Aggregate Market Sentiment:** ${sentimentLabel} (${avgSentiment.toFixed(2)})\n`;
    }
    if (Object.keys(topicCounts).length > 0) {
      const topTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => `${topic} (${count})`)
        .join(", ");
      content += `**Top Topics:** ${topTopics}\n`;
    }
    if (Object.keys(entityCounts).length > 0) {
      const topEntities = Object.entries(entityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([entity, count]) => `${entity} (${count})`)
        .join(", ");
      content += `**Key Entities:** ${topEntities}\n`;
    }
    content += `\n`;
    return content;
  }

  /**
   * Generate volatility and momentum section
   */
  private generateVolatilityAndMomentumSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Aggregate volatility, momentum, price/volume changes by asset
    const assetStats: Record<
      string,
      {
        volatility: number[];
        momentum: number[];
        priceChange: number[];
        volumeChange: number[];
      }
    > = {};

    allNews.forEach((item) => {
      // impactMetrics
      if (item.impactMetrics) {
        for (const key of Object.keys(
          item.market_data_snapshot?.prices ?? {},
        )) {
          if (!assetStats[key])
            assetStats[key] = {
              volatility: [],
              momentum: [],
              priceChange: [],
              volumeChange: [],
            };
          if (typeof item.impactMetrics.volatility === "number")
            assetStats[key].volatility.push(item.impactMetrics.volatility);
          if (typeof item.impactMetrics.momentum === "number")
            assetStats[key].momentum.push(item.impactMetrics.momentum);
          if (typeof item.impactMetrics.priceChange24h === "number")
            assetStats[key].priceChange.push(item.impactMetrics.priceChange24h);
          if (typeof item.impactMetrics.volumeChange24h === "number")
            assetStats[key].volumeChange.push(
              item.impactMetrics.volumeChange24h,
            );
        }
      }
      // market_data_snapshot
      if (item.market_data_snapshot) {
        for (const [symbol, price] of Object.entries(
          item.market_data_snapshot.price_movements_24h ?? {},
        )) {
          if (!assetStats[symbol])
            assetStats[symbol] = {
              volatility: [],
              momentum: [],
              priceChange: [],
              volumeChange: [],
            };
          assetStats[symbol].priceChange.push(price);
        }
        for (const [symbol, vol] of Object.entries(
          item.market_data_snapshot.volume_24h ?? {},
        )) {
          if (!assetStats[symbol])
            assetStats[symbol] = {
              volatility: [],
              momentum: [],
              priceChange: [],
              volumeChange: [],
            };
          assetStats[symbol].volumeChange.push(vol);
        }
      }
    });

    // Calculate averages and find top movers
    const summary: Array<{
      asset: string;
      avgVolatility: number;
      avgMomentum: number;
      avgPriceChange: number;
      avgVolumeChange: number;
    }> = [];
    for (const [asset, stats] of Object.entries(assetStats)) {
      const avgVolatility = stats.volatility.length
        ? stats.volatility.reduce((a, b) => a + b, 0) / stats.volatility.length
        : 0;
      const avgMomentum = stats.momentum.length
        ? stats.momentum.reduce((a, b) => a + b, 0) / stats.momentum.length
        : 0;
      const avgPriceChange = stats.priceChange.length
        ? stats.priceChange.reduce((a, b) => a + b, 0) /
          stats.priceChange.length
        : 0;
      const avgVolumeChange = stats.volumeChange.length
        ? stats.volumeChange.reduce((a, b) => a + b, 0) /
          stats.volumeChange.length
        : 0;
      summary.push({
        asset,
        avgVolatility,
        avgMomentum,
        avgPriceChange,
        avgVolumeChange,
      });
    }

    if (summary.length === 0) {
      return "";
    }

    // Find top movers
    const topVolatility = [...summary]
      .sort((a, b) => Math.abs(b.avgVolatility) - Math.abs(a.avgVolatility))
      .slice(0, 3);
    const topMomentum = [...summary]
      .sort((a, b) => Math.abs(b.avgMomentum) - Math.abs(a.avgMomentum))
      .slice(0, 3);
    const topPriceChange = [...summary]
      .sort((a, b) => Math.abs(b.avgPriceChange) - Math.abs(a.avgPriceChange))
      .slice(0, 3);
    const topVolumeChange = [...summary]
      .sort((a, b) => Math.abs(b.avgVolumeChange) - Math.abs(a.avgVolumeChange))
      .slice(0, 3);

    let content = `## Volatility & Market Movers\n\n`;
    if (topVolatility.length > 0) {
      content +=
        `**Top Volatility:** ` +
        topVolatility
          .map((x) => `${x.asset} (${x.avgVolatility.toFixed(2)})`)
          .join(", ") +
        `\n`;
    }
    if (topMomentum.length > 0) {
      content +=
        `**Top Momentum:** ` +
        topMomentum
          .map((x) => `${x.asset} (${x.avgMomentum.toFixed(2)})`)
          .join(", ") +
        `\n`;
    }
    if (topPriceChange.length > 0) {
      content +=
        `**Top Price Change (24h):** ` +
        topPriceChange
          .map((x) => `${x.asset} (${x.avgPriceChange.toFixed(2)}%)`)
          .join(", ") +
        `\n`;
    }
    if (topVolumeChange.length > 0) {
      content +=
        `**Top Volume Change (24h):** ` +
        topVolumeChange
          .map((x) => `${x.asset} (${x.avgVolumeChange.toFixed(2)})`)
          .join(", ") +
        `\n`;
    }
    content += `\n`;
    return content;
  }

  /**
   * Generate sector and industry trends section
   */
  private generateSectorAndIndustryTrendsSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Mock asset-to-sector mapping (should be replaced with real mapping in production)
    const assetToSector: Record<string, string> = {
      BTC: "Layer 1",
      ETH: "Layer 1",
      SOL: "Layer 1",
      ADA: "Layer 1",
      BNB: "Exchange",
      OKB: "Exchange",
      FTT: "Exchange",
      UNI: "DeFi",
      AAVE: "DeFi",
      SNX: "DeFi",
      SAND: "Gaming",
      AXS: "Gaming",
      MANA: "Metaverse",
      LINK: "Oracle",
      FIL: "Storage",
      DOT: "Interoperability",
      MATIC: "Layer 2",
      AVAX: "Layer 1",
      XRP: "Payments",
      DOGE: "Meme",
      SHIB: "Meme",
    };

    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Aggregate sector stats
    const sectorStats: Record<
      string,
      { count: number; sentiment: number[]; volatility: number[] }
    > = {};
    allNews.forEach((item) => {
      (item.related_assets ?? []).forEach((asset) => {
        const sector = assetToSector[asset] || "Other";
        if (!sectorStats[sector])
          sectorStats[sector] = { count: 0, sentiment: [], volatility: [] };
        sectorStats[sector].count++;
        if (typeof item.impact?.score === "number")
          sectorStats[sector].sentiment.push(item.impact.score);
        if (typeof item.impactMetrics?.volatility === "number")
          sectorStats[sector].volatility.push(item.impactMetrics.volatility);
      });
    });

    if (Object.keys(sectorStats).length === 0) {
      return "";
    }

    // Calculate averages and find top sectors
    const summary: Array<{
      sector: string;
      count: number;
      avgSentiment: number;
      avgVolatility: number;
    }> = [];
    for (const [sector, stats] of Object.entries(sectorStats)) {
      const avgSentiment = stats.sentiment.length
        ? stats.sentiment.reduce((a, b) => a + b, 0) / stats.sentiment.length
        : 0;
      const avgVolatility = stats.volatility.length
        ? stats.volatility.reduce((a, b) => a + b, 0) / stats.volatility.length
        : 0;
      summary.push({ sector, count: stats.count, avgSentiment, avgVolatility });
    }

    // Sort by count (mentions)
    const topSectors = summary.sort((a, b) => b.count - a.count).slice(0, 5);

    let content = `## Sector & Industry Trends\n\n`;
    content += `**Top Sectors by Mentions:**\n`;
    topSectors.forEach((s) => {
      const sentimentLabel =
        s.avgSentiment > 0.2
          ? "bullish"
          : s.avgSentiment < -0.2
            ? "bearish"
            : "neutral";
      content += `- ${s.sector}: ${s.count} mentions, avg sentiment: ${sentimentLabel} (${s.avgSentiment.toFixed(2)}), avg volatility: ${s.avgVolatility.toFixed(2)}\n`;
    });
    content += `\n`;
    return content;
  }

  /**
   * Generate cross-asset correlation section
   */
  private generateCrossAssetCorrelationSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Count co-occurrences of asset pairs
    const pairCounts: Record<string, number> = {};
    const sentimentPairs: Record<string, number[]> = {};

    allNews.forEach((item) => {
      const assets = item.related_assets ?? [];
      for (let i = 0; i < assets.length; i++) {
        for (let j = i + 1; j < assets.length; j++) {
          const pair = [assets[i], assets[j]].sort().join("-");
          pairCounts[pair] = (pairCounts[pair] || 0) + 1;
          // Aggregate sentiment difference
          if (typeof item.impact?.score === "number") {
            if (!sentimentPairs[pair]) sentimentPairs[pair] = [];
            sentimentPairs[pair].push(item.impact.score);
          }
        }
      }
    });

    // Find top correlated pairs
    const topPairs = Object.entries(pairCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topPairs.length === 0) {
      return "";
    }

    let content = `## Cross-Asset Correlations & Co-Movements\n\n`;
    content += `**Top Asset Pairs Frequently Mentioned Together:**\n`;
    topPairs.forEach(([pair, count]) => {
      const sentiments = sentimentPairs[pair] || [];
      const avgSentiment = sentiments.length
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;
      const sentimentLabel =
        avgSentiment > 0.2
          ? "bullish"
          : avgSentiment < -0.2
            ? "bearish"
            : "neutral";
      content += `- ${pair}: ${count} co-mentions, avg sentiment: ${sentimentLabel} (${avgSentiment.toFixed(2)})\n`;
    });
    content += `\n`;
    return content;
  }

  /**
   * Generate user personalized insights section
   */
  private generateUserPersonalizedInsightsSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
    userAssets: string[],
  ): string {
    if (!userAssets || userAssets.length === 0) return "";
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    let content = `## Personalized Insights for Your Portfolio\n\n`;
    userAssets.forEach((asset) => {
      const assetNews = allNews.filter((item) =>
        item.related_assets?.includes(asset),
      );
      if (assetNews.length === 0) {
        content += `**${asset}:** No significant news during this period.\n`;
        return;
      }
      // Average sentiment
      const sentiments = assetNews.map((item) => item.impact?.score ?? 0);
      const avgSentiment = sentiments.length
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;
      const sentimentLabel =
        avgSentiment > 0.2
          ? "bullish"
          : avgSentiment < -0.2
            ? "bearish"
            : "neutral";
      // Top news
      const topNews = assetNews
        .sort(
          (a, b) => (b.impact?.importance ?? 0) - (a.impact?.importance ?? 0),
        )
        .slice(0, 2);
      content += `**${asset}:** ${sentimentLabel} sentiment (${avgSentiment.toFixed(2)}) across ${assetNews.length} news items.\n`;
      topNews.forEach((item) => {
        content += `- [${item.title}](${item.url}) (${item.published_at.split("T")[0]})\n`;
      });
    });
    content += `\n`;
    return content;
  }

  /**
   * Generate forward-looking signals section
   */
  private generateForwardLookingSignalsSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Aggregate trading signals and upcoming events
    const signals: Array<{
      asset: string;
      direction: string;
      confidence: number;
      timeframe: string;
    }> = [];
    const events: Array<{ title: string; date: string; assets: string[] }> = [];
    const analystOutlooks: Array<{
      asset: string;
      outlook: string;
      source: string;
    }> = [];

    allNews.forEach((item) => {
      // Trading signals
      if (item.trading_signals && Array.isArray(item.trading_signals.assets)) {
        item.trading_signals.assets.forEach((signal) => {
          signals.push({
            asset: String(signal.symbol),
            direction: String(signal.signal),
            confidence: signal.confidence,
            timeframe: String(item.trading_signals?.timeframe || "unknown"),
          });
        });
      }
      // Upcoming events (mock: use tags or subcategories for demo)
      if (
        item.subcategories?.some((sub) =>
          /event|upgrade|launch|airdrop|listing/i.test(sub),
        )
      ) {
        events.push({
          title: item.title,
          date: item.published_at.split("T")[0],
          assets: item.related_assets ?? [],
        });
      }
      // Analyst outlooks (mock: use summary or tags for demo)
      if (
        item.summary &&
        /analyst|forecast|prediction|target/i.test(item.summary)
      ) {
        (item.related_assets ?? []).forEach((asset) => {
          analystOutlooks.push({
            asset: String(asset),
            outlook: String(item.summary || ""),
            source: String(item.source || ""),
          });
        });
      }
    });

    if (
      signals.length === 0 &&
      events.length === 0 &&
      analystOutlooks.length === 0
    ) {
      return "";
    }

    let content = `## Forward-Looking Signals & Catalysts\n\n`;
    if (signals.length > 0) {
      content += `**Trading Signals:**\n`;
      signals.slice(0, 10).forEach((sig) => {
        content += `- ${sig.asset}: ${sig.direction.toUpperCase()} (${(sig.confidence * 100).toFixed(0)}% confidence, ${sig.timeframe})\n`;
      });
    }
    if (events.length > 0) {
      content += `**Upcoming Events & Catalysts:**\n`;
      events.slice(0, 10).forEach((ev) => {
        content += `- ${ev.title} (${ev.date}) [${ev.assets.join(", ")}]\n`;
      });
    }
    if (analystOutlooks.length > 0) {
      content += `**Analyst Outlooks & Predictions:**\n`;
      analystOutlooks.slice(0, 10).forEach((outlook) => {
        content += `- ${outlook.asset}: ${outlook.outlook} (Source: ${outlook.source})\n`;
      });
    }
    content += `\n`;
    return content;
  }

  /**
   * Generate narrative timeline section
   */
  private generateNarrativeTimelineSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Aggregate topics/entities by day
    const timeline: Record<
      string,
      Record<string, { count: number; sentiment: number[] }>
    > = {};
    allNews.forEach((item) => {
      const date = item.published_at.split("T")[0];
      const topics: string[] = [];
      item.marketContext?.topics?.forEach((t) => topics.push(t));
      item.sentiment_analysis?.topics?.forEach((t) => {
        if (typeof t === "string") topics.push(t);
        else if (t?.name) topics.push(t.name);
      });
      item.marketContext?.entities?.forEach((e) => topics.push(e));
      item.sentiment_analysis?.entities?.forEach((e) => {
        if (typeof e === "string") topics.push(e);
        else if (e?.name) topics.push(e.name);
      });
      topics.forEach((topic) => {
        if (!timeline[topic]) timeline[topic] = {};
        if (!timeline[topic][date])
          timeline[topic][date] = { count: 0, sentiment: [] };
        timeline[topic][date].count++;
        if (typeof item.impact?.score === "number")
          timeline[topic][date].sentiment.push(item.impact.score);
      });
    });

    // Calculate momentum (change in mentions) for each topic/entity
    const topicMomentum: Array<{
      topic: string;
      change: number;
      lastCount: number;
      lastSentiment: number;
    }> = [];
    for (const [topic, byDate] of Object.entries(timeline)) {
      const dates = Object.keys(byDate).sort();
      if (dates.length < 2) continue;
      const prev = byDate[dates[dates.length - 2]];
      const last = byDate[dates[dates.length - 1]];
      const lastSentiment = last.sentiment.length
        ? last.sentiment.reduce((a, b) => a + b, 0) / last.sentiment.length
        : 0;
      topicMomentum.push({
        topic,
        change: last.count - prev.count,
        lastCount: last.count,
        lastSentiment,
      });
    }
    // Sort by biggest change
    const topMomentum = topicMomentum
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);

    if (topMomentum.length === 0) {
      return "";
    }

    let content = `## Narrative Timeline & Evolution\n\n`;
    content += `**Topics/Entities with Biggest Change in Momentum:**\n`;
    topMomentum.forEach((t) => {
      const sentimentLabel =
        t.lastSentiment > 0.2
          ? "bullish"
          : t.lastSentiment < -0.2
            ? "bearish"
            : "neutral";
      content += `- ${t.topic}: change ${t.change >= 0 ? "+" : ""}${t.change} (last day: ${t.lastCount} mentions, avg sentiment: ${sentimentLabel} (${t.lastSentiment.toFixed(2)}))\n`;
    });
    content += `\n`;
    return content;
  }

  // Move generateExpertAndInfluencerQuotesSection to be a class method, not nested inside another method.
  public generateExpertAndInfluencerQuotesSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Find expert and influencer quotes
    const expertQuotes: string[] = [];
    const influencerQuotes: string[] = [];

    allNews.forEach((item) => {
      if (
        item.summary &&
        /analyst|forecast|prediction|target/i.test(item.summary)
      ) {
        expertQuotes.push(item.summary);
      }
      if (item.summary && /influencer|expert|commentator/i.test(item.summary)) {
        influencerQuotes.push(item.summary);
      }
    });

    if (expertQuotes.length === 0 && influencerQuotes.length === 0) {
      return "";
    }

    let content = `## Expert and Influencer Quotes\n\n`;
    if (expertQuotes.length > 0) {
      content += `**Expert Insights:**\n\n`;
      expertQuotes.forEach((quote) => {
        content += `- ${quote}\n\n`;
      });
    }
    if (influencerQuotes.length > 0) {
      content += `**Influencer Perspectives:**\n\n`;
      influencerQuotes.forEach((quote) => {
        content += `- ${quote}\n\n`;
      });
    }
    content += `\n`;
    return content;
  }

  private generateRegionalAndLanguageTrendsSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Aggregate by region and language
    const regionStats: Record<string, { count: number; sentiment: number[] }> =
      {};
    const languageStats: Record<
      string,
      { count: number; sentiment: number[] }
    > = {};
    allNews.forEach((item) => {
      if (item.region) {
        if (!regionStats[item.region])
          regionStats[item.region] = { count: 0, sentiment: [] };
        regionStats[item.region].count++;
        if (typeof item.impact?.score === "number")
          regionStats[item.region].sentiment.push(item.impact.score);
      }
      if (item.language) {
        if (!languageStats[item.language])
          languageStats[item.language] = { count: 0, sentiment: [] };
        languageStats[item.language].count++;
        if (typeof item.impact?.score === "number")
          languageStats[item.language].sentiment.push(item.impact.score);
      }
    });

    if (
      Object.keys(regionStats).length === 0 &&
      Object.keys(languageStats).length === 0
    ) {
      return "";
    }

    let content = `## Regional & Language Trends\n\n`;
    if (Object.keys(regionStats).length > 0) {
      content += `**Top Regions by News Volume:**\n`;
      Object.entries(regionStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .forEach(([region, stats]) => {
          const avgSentiment = stats.sentiment.length
            ? stats.sentiment.reduce((a, b) => a + b, 0) /
              stats.sentiment.length
            : 0;
          const sentimentLabel =
            avgSentiment > 0.2
              ? "bullish"
              : avgSentiment < -0.2
                ? "bearish"
                : "neutral";
          content += `- ${region}: ${stats.count} articles, avg sentiment: ${sentimentLabel} (${avgSentiment.toFixed(2)})\n`;
        });
    }
    if (Object.keys(languageStats).length > 0) {
      content += `**Top Languages by News Volume:**\n`;
      Object.entries(languageStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .forEach(([lang, stats]) => {
          const avgSentiment = stats.sentiment.length
            ? stats.sentiment.reduce((a, b) => a + b, 0) /
              stats.sentiment.length
            : 0;
          const sentimentLabel =
            avgSentiment > 0.2
              ? "bullish"
              : avgSentiment < -0.2
                ? "bearish"
                : "neutral";
          content += `- ${lang}: ${stats.count} articles, avg sentiment: ${sentimentLabel} (${avgSentiment.toFixed(2)})\n`;
        });
    }
    content += `\n`;
    return content;
  }

  private generateCustomUserAlertsSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
    userAlerts?: Array<{
      keywords?: string[];
      assets?: string[];
      minImpact?: number;
    }>,
  ): string {
    if (!userAlerts || userAlerts.length === 0) return "";
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    let content = `## Custom User Alerts\n\n`;
    userAlerts.forEach((alert, idx) => {
      const matches = allNews.filter((item) => {
        const matchesKeywords = alert.keywords
          ? alert.keywords.some(
              (kw) =>
                item.title?.toLowerCase().includes(kw.toLowerCase()) ||
                item.summary?.toLowerCase().includes(kw.toLowerCase()),
            )
          : true;
        const matchesAssets = alert.assets
          ? (item.related_assets ?? []).some((a) => alert.assets!.includes(a))
          : true;
        const matchesImpact =
          typeof alert.minImpact === "number"
            ? (item.impact?.importance ?? 0) >= alert.minImpact
            : true;
        return matchesKeywords && matchesAssets && matchesImpact;
      });
      if (matches.length > 0) {
        content += `**Alert #${idx + 1}:**\n`;
        matches.slice(0, 5).forEach((item) => {
          content += `- [${item.title}](${item.url}) (${item.published_at.split("T")[0]})\n`;
        });
      }
    });
    content += `\n`;
    return content;
  }

  private generateTradingViewAnalyticsSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
    impactPredictions?: AnalyzedNewsGroup[],
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    // Most mentioned assets with strong sentiment
    const assetMentions: Record<
      string,
      { count: number; sentiment: number[] }
    > = {};
    allNews.forEach((item) => {
      (item.related_assets ?? []).forEach((asset) => {
        if (!assetMentions[asset])
          assetMentions[asset] = { count: 0, sentiment: [] };
        assetMentions[asset].count++;
        if (typeof item.impact?.score === "number")
          assetMentions[asset].sentiment.push(item.impact.score);
      });
    });
    const topAssets = Object.entries(assetMentions)
      .map(([asset, stats]) => {
        const avgSentiment = stats.sentiment.length
          ? stats.sentiment.reduce((a, b) => a + b, 0) / stats.sentiment.length
          : 0;
        return { asset, count: stats.count, avgSentiment };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Assets with largest predicted price moves (from impactPredictions)
    let topPredictedMoves: Array<{
      asset: string;
      direction: string;
      magnitude: number;
      confidence: number;
    }> = [];
    if (impactPredictions) {
      impactPredictions.forEach((group) => {
        Object.entries(group.predictions.asset_predictions).forEach(
          ([asset, pred]) => {
            topPredictedMoves.push({
              asset,
              direction: pred.direction,
              magnitude: pred.expected_magnitude,
              confidence: pred.confidence,
            });
          },
        );
      });
      topPredictedMoves = topPredictedMoves
        .sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude))
        .slice(0, 5);
    }

    // News-driven technical patterns (mock: use tags or subcategories)
    const technicalPatterns: Array<{
      asset: string;
      pattern: string;
      newsTitle: string;
      url: string;
    }> = [];
    allNews.forEach((item) => {
      if (item.subcategories) {
        item.subcategories.forEach((sub) => {
          if (
            /pattern|breakout|support|resistance|trend|reversal|double|head|shoulder|triangle|wedge|flag|channel/i.test(
              sub,
            )
          ) {
            (item.related_assets ?? []).forEach((asset) => {
              technicalPatterns.push({
                asset,
                pattern: sub,
                newsTitle: item.title,
                url: item.url,
              });
            });
          }
        });
      }
    });

    if (
      topAssets.length === 0 &&
      topPredictedMoves.length === 0 &&
      technicalPatterns.length === 0
    ) {
      return "";
    }

    let content = `## TradingView Analytics\n\n`;
    if (topAssets.length > 0) {
      content += `**Most Mentioned Assets with Strong Sentiment:**\n`;
      topAssets.forEach((a) => {
        const sentimentLabel =
          a.avgSentiment > 0.2
            ? "bullish"
            : a.avgSentiment < -0.2
              ? "bearish"
              : "neutral";
        content += `- ${a.asset}: ${a.count} mentions, avg sentiment: ${sentimentLabel} (${a.avgSentiment.toFixed(2)})\n`;
      });
    }
    if (topPredictedMoves.length > 0) {
      content += `**Assets with Largest Predicted Price Moves:**\n`;
      topPredictedMoves.forEach((p) => {
        const dirIcon =
          p.direction === "up" ? "📈" : p.direction === "down" ? "📉" : "⟷";
        content += `- ${p.asset}: ${dirIcon} ${p.magnitude.toFixed(2)}% (${(p.confidence * 100).toFixed(0)}% confidence)\n`;
      });
    }
    if (technicalPatterns.length > 0) {
      content += `**News-Driven Technical Patterns:**\n`;
      technicalPatterns.slice(0, 5).forEach((tp) => {
        content += `- ${tp.asset}: ${tp.pattern} ([${tp.newsTitle}](${tp.url}))\n`;
      });
    }
    content += `\n`;
    return content;
  }

  // Restore the generateAnomalyAndOutlierDetectionSection method as a class method.
  private generateAnomalyAndOutlierDetectionSection(
    newsByCategory: Record<DigestCategory, NewsItem[]>,
  ): string {
    // Collect all news items
    const allNews: NewsItem[] = [];
    Object.values(newsByCategory).forEach((items) => allNews.push(...items));

    if (allNews.length === 0) return "";

    // Find outlier sentiment
    const sentiments = allNews.map((item) => item.impact?.score ?? 0);
    const avgSentiment = sentiments.length
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;
    const stdSentiment = Math.sqrt(
      sentiments.reduce((sum, s) => sum + Math.pow(s - avgSentiment, 2), 0) /
        (sentiments.length || 1),
    );
    const extremePositive = allNews.filter(
      (item) => (item.impact?.score ?? 0) > avgSentiment + 2 * stdSentiment,
    );
    const extremeNegative = allNews.filter(
      (item) => (item.impact?.score ?? 0) < avgSentiment - 2 * stdSentiment,
    );

    // Find outlier engagement
    const engagements = allNews.map(
      (item) => item.social_metrics?.total_engagement ?? 0,
    );
    const avgEngagement = engagements.length
      ? engagements.reduce((a, b) => a + b, 0) / engagements.length
      : 0;
    const stdEngagement = Math.sqrt(
      engagements.reduce((sum, e) => sum + Math.pow(e - avgEngagement, 2), 0) /
        (engagements.length || 1),
    );
    const extremeEngagement = allNews.filter(
      (item) =>
        (item.social_metrics?.total_engagement ?? 0) >
        avgEngagement + 2 * stdEngagement,
    );

    // Find outlier price/volume changes
    const priceChanges: number[] = [];
    const volumeChanges: number[] = [];
    allNews.forEach((item) => {
      if (item.impactMetrics?.priceChange24h)
        priceChanges.push(item.impactMetrics.priceChange24h);
      if (item.impactMetrics?.volumeChange24h)
        volumeChanges.push(item.impactMetrics.volumeChange24h);
    });
    const avgPriceChange = priceChanges.length
      ? priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length
      : 0;
    const stdPriceChange = Math.sqrt(
      priceChanges.reduce(
        (sum, p) => sum + Math.pow(p - avgPriceChange, 2),
        0,
      ) / (priceChanges.length || 1),
    );
    const extremePrice = allNews.filter(
      (item) =>
        (item.impactMetrics?.priceChange24h ?? 0) >
        avgPriceChange + 2 * stdPriceChange,
    );
    const avgVolumeChange = volumeChanges.length
      ? volumeChanges.reduce((a, b) => a + b, 0) / volumeChanges.length
      : 0;
    const stdVolumeChange = Math.sqrt(
      volumeChanges.reduce(
        (sum, v) => sum + Math.pow(v - avgVolumeChange, 2),
        0,
      ) / (volumeChanges.length || 1),
    );
    const extremeVolume = allNews.filter(
      (item) =>
        (item.impactMetrics?.volumeChange24h ?? 0) >
        avgVolumeChange + 2 * stdVolumeChange,
    );

    if (
      extremePositive.length === 0 &&
      extremeNegative.length === 0 &&
      extremeEngagement.length === 0 &&
      extremePrice.length === 0 &&
      extremeVolume.length === 0
    ) {
      return "";
    }

    let content = `## Anomaly & Outlier Detection\n\n`;
    if (extremePositive.length > 0) {
      content += `**Extreme Positive Sentiment:**\n`;
      extremePositive.slice(0, 3).forEach((item) => {
        content += `- [${item.title}](${item.url}) (${(item.impact?.score ?? 0).toFixed(2)})\n`;
      });
    }
    if (extremeNegative.length > 0) {
      content += `**Extreme Negative Sentiment:**\n`;
      extremeNegative.slice(0, 3).forEach((item) => {
        content += `- [${item.title}](${item.url}) (${(item.impact?.score ?? 0).toFixed(2)})\n`;
      });
    }
    if (extremeEngagement.length > 0) {
      content += `**Highest Engagement:**\n`;
      extremeEngagement.slice(0, 3).forEach((item) => {
        content += `- [${item.title}](${item.url}) (${item.social_metrics?.total_engagement ?? 0} engagements)\n`;
      });
    }
    if (extremePrice.length > 0) {
      content += `**Largest Price Change (24h):**\n`;
      extremePrice.slice(0, 3).forEach((item) => {
        content += `- [${item.title}](${item.url}) (${item.impactMetrics?.priceChange24h?.toFixed(2)}%)\n`;
      });
    }
    if (extremeVolume.length > 0) {
      content += `**Largest Volume Change (24h):**\n`;
      extremeVolume.slice(0, 3).forEach((item) => {
        content += `- [${item.title}](${item.url}) (${item.impactMetrics?.volumeChange24h?.toFixed(2)})\n`;
      });
    }
    content += `\n`;
    return content;
  }
}
