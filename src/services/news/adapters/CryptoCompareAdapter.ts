import axios from "axios";
import { NewsItem, NewsFilter } from "../../../types/news";
import {
  BaseNewsSourceAdapter,
  NewsSourceCapabilities,
} from "./NewsSourceAdapter";

// Interface for CryptoCompare API response
interface CryptoCompareNewsItem {
  id: string;
  guid: string;
  published_on: number;
  imageurl: string;
  title: string;
  url: string;
  source: string;
  body: string;
  tags: string;
  lang: string;
  source_info: {
    name: string;
    lang: string;
    img: string;
  };
  categories: string;
}

/**
 * Adapter for CryptoCompare news API
 */
export class CryptoCompareAdapter extends BaseNewsSourceAdapter {
  private apiKey: string;
  private apiUrl: string = "https://min-api.cryptocompare.com/data/v2";

  constructor(apiKey: string) {
    super(
      "cryptocompare",
      "CryptoCompare",
      "https://cryptocompare.com",
      "https://www.cryptocompare.com/media/20562/favicon.png",
      0.85,
      "crypto",
    );
    this.apiKey = apiKey;
  }

  /**
   * Convert CryptoCompare news item to standardized NewsItem format
   */
  private convertToNewsItem(item: CryptoCompareNewsItem): NewsItem {
    const baseItem = this.createNewsItemSkeleton() as Partial<NewsItem>;

    // Extract categories from tags
    const categories = item.categories ? item.categories.split("|") : [];
    const tags = item.tags
      ? item.tags.split("|").filter((tag) => tag.trim() !== "")
      : [];

    // Determine likely category from tags and categories
    let primaryCategory: NewsItem["category"] = "other";
    if (
      tags.some((tag) =>
        ["regulation", "sec", "law", "legal"].includes(tag.toLowerCase()),
      )
    ) {
      primaryCategory = "regulatory";
    } else if (
      tags.some((tag) =>
        ["price", "market", "trading", "rally", "crash"].includes(
          tag.toLowerCase(),
        ),
      )
    ) {
      primaryCategory = "market";
    } else if (
      tags.some((tag) =>
        ["blockchain", "technology", "protocol", "upgrade"].includes(
          tag.toLowerCase(),
        ),
      )
    ) {
      primaryCategory = "technology";
    } else if (
      tags.some((tag) =>
        ["adoption", "usage", "mainstream"].includes(tag.toLowerCase()),
      )
    ) {
      primaryCategory = "adoption";
    } else if (
      tags.some((tag) =>
        ["hack", "security", "exploit", "vulnerability"].includes(
          tag.toLowerCase(),
        ),
      )
    ) {
      primaryCategory = "security";
    } else if (
      tags.some((tag) =>
        ["partnership", "collaboration", "integration"].includes(
          tag.toLowerCase(),
        ),
      )
    ) {
      primaryCategory = "partnership";
    } else if (
      tags.some((tag) =>
        ["economy", "inflation", "fed", "interest rate"].includes(
          tag.toLowerCase(),
        ),
      )
    ) {
      primaryCategory = "macroeconomic";
    }

    // Extract likely affected assets from tags
    const commonCryptos = [
      "BTC",
      "ETH",
      "XRP",
      "LTC",
      "BCH",
      "ADA",
      "DOT",
      "LINK",
      "BNB",
      "DOGE",
      "SOL",
      "AVAX",
    ];
    const affectedAssets = commonCryptos.filter(
      (crypto) =>
        tags.some((tag) => tag.toUpperCase().includes(crypto)) ||
        item.title.toUpperCase().includes(crypto) ||
        item.body.toUpperCase().includes(crypto),
    );

    // Calculate a basic impact score based on keywords in title and body
    let impactScore = 0;
    const bullishTerms = [
      "surge",
      "rally",
      "soar",
      "breakthrough",
      "adoption",
      "gain",
      "positive",
    ];
    const bearishTerms = [
      "crash",
      "plummet",
      "drop",
      "fall",
      "sell-off",
      "ban",
      "negative",
    ];

    const titleLower = item.title.toLowerCase();
    const bodyLower = item.body.toLowerCase();

    bullishTerms.forEach((term) => {
      if (titleLower.includes(term)) impactScore += 0.1;
      if (bodyLower.includes(term)) impactScore += 0.05;
    });

    bearishTerms.forEach((term) => {
      if (titleLower.includes(term)) impactScore -= 0.1;
      if (bodyLower.includes(term)) impactScore -= 0.05;
    });

    // Clamp impact score between -1 and 1
    impactScore = Math.max(-1, Math.min(1, impactScore));

    // Create full news item
    const newsItem: NewsItem = {
      ...(baseItem as any),
      id: item.id || item.guid,
      title: item.title,
      content: item.body,
      summary:
        item.body.substring(0, 150) + (item.body.length > 150 ? "..." : ""),
      url: item.url,
      image_url: item.imageurl,
      timestamp: this.formatTimestamp(item.published_on),
      published_at: this.formatTimestamp(item.published_on),
      language: item.lang || "en",
      category: primaryCategory,
      subcategories: categories,
      tags: tags,
      impact: {
        ...baseItem.impact!,
        score: impactScore,
        affected_assets: affectedAssets,
        market_sentiment:
          impactScore > 0.2
            ? "bullish"
            : impactScore < -0.2
              ? "bearish"
              : "neutral",
      },
      social_metrics: {
        twitter: {
          mentions: 0,
          likes: 0,
          retweets: 0,
          quote_tweets: 0,
          sentiment_distribution: {
            positive: 0,
            negative: 0,
            neutral: 0,
          },
          influential_mentions: [],
          trending_hashtags: [],
        },
        reddit: {
          mentions: 0,
          upvotes: 0,
          comments: 0,
          awards: 0,
          top_subreddits: [],
          sentiment_distribution: {
            positive: 0,
            negative: 0,
            neutral: 0,
          },
        },
        telegram: {
          mentions: 0,
          channel_shares: 0,
          group_discussions: 0,
          reach: 0,
          sentiment_distribution: {
            positive: 0,
            negative: 0,
            neutral: 0,
          },
        },
        discord: {
          mentions: 0,
          server_shares: 0,
          reactions: 0,
          top_channels: [],
          sentiment_distribution: {
            positive: 0,
            negative: 0,
            neutral: 0,
          },
        },
        linkedin: {
          shares: 0,
          engagements: 0,
          industry_mentions: [],
          sentiment_distribution: {
            positive: 0,
            negative: 0,
            neutral: 0,
          },
        },
        total_engagement: 0,
        engagement_trend: 0,
        total_reach: 0,
        engagement_rate: 0,
        virality_score: 0,
        growth_rate: {
          "1h": 0,
          "4h": 0,
          "12h": 0,
          "24h": 0,
        },
      },
      related_assets: affectedAssets.map((symbol) => ({
        symbol,
        name: this.getAssetNameFromSymbol(symbol),
        correlation: 0.5, // default correlation
        mentioned_in_title: item.title.toUpperCase().includes(symbol),
        mentioned_in_content: item.body.toUpperCase().includes(symbol),
        sentiment_in_context: impactScore,
      })),
      related_news: [],
      fact_checking: {
        verified_by: [],
        accuracy_score: 0.5,
        disputed_claims: [],
      },
    };

    return newsItem;
  }

  /**
   * Get full name for common crypto symbols
   */
  private getAssetNameFromSymbol(symbol: string): string {
    const symbolNames: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      XRP: "XRP",
      LTC: "Litecoin",
      BCH: "Bitcoin Cash",
      ADA: "Cardano",
      DOT: "Polkadot",
      LINK: "Chainlink",
      BNB: "Binance Coin",
      DOGE: "Dogecoin",
      SOL: "Solana",
      AVAX: "Avalanche",
    };

    return symbolNames[symbol] || symbol;
  }

  /**
   * Convert NewsFilter to CryptoCompare API parameters
   */
  private createApiParams(filter?: Partial<NewsFilter>): Record<string, any> {
    const params: Record<string, any> = {
      extraParams: "Coinet",
      api_key: this.apiKey,
    };

    if (filter) {
      // Apply limit
      if (filter.limit) {
        params.limit = filter.limit;
      } else {
        params.limit = 50; // default limit
      }

      // Filter by categories
      if (filter.categories && filter.categories.length > 0) {
        params.categories = filter.categories.join(",");
      }

      // Filter by assets
      if (filter.assets && filter.assets.length > 0) {
        params.categories = filter.assets
          .map((asset) => asset.toUpperCase())
          .join(",");
      }

      // Filter by language
      if (filter.language && filter.language.length > 0) {
        params.lang = filter.language[0]; // CryptoCompare only supports one language filter
      }

      // Filter by published date
      if (filter.publishedAfter) {
        const timestamp = Math.floor(
          new Date(filter.publishedAfter).getTime() / 1000,
        );
        params.lTs = timestamp;
      }
    }

    return params;
  }

  /**
   * Fetch news from CryptoCompare API
   */
  async fetchNews(filter?: Partial<NewsFilter>): Promise<NewsItem[]> {
    try {
      const params = this.createApiParams(filter);
      const response = await axios.get<{ Data: CryptoCompareNewsItem[] }>(
        `${this.apiUrl}/news/`,
        { params },
      );

      if (!response.data || !response.data.Data) {
        return [];
      }

      // Convert each news item to our standard format
      const newsItems = response.data.Data.map((item) =>
        this.convertToNewsItem(item),
      );

      // Apply additional filters that can't be applied at the API level
      return this.applyAdditionalFilters(newsItems, filter);
    } catch (error) {
      console.error("Error fetching news from CryptoCompare:", error);
      return [];
    }
  }

  /**
   * Apply filters that can't be directly applied through the API
   */
  private applyAdditionalFilters(
    newsItems: NewsItem[],
    filter?: Partial<NewsFilter>,
  ): NewsItem[] {
    if (!filter) return newsItems;

    let filtered = newsItems;

    // Filter by keywords
    if (filter.keywords && filter.keywords.length > 0) {
      filtered = filtered.filter((item) =>
        filter.keywords!.some(
          (keyword) =>
            item.title.toLowerCase().includes(keyword.toLowerCase()) ||
            item.content.toLowerCase().includes(keyword.toLowerCase()),
        ),
      );
    }

    // Filter by search text
    if (filter.searchText) {
      const searchText = filter.searchText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchText) ||
          item.content.toLowerCase().includes(searchText),
      );
    }

    // Filter by excluded keywords
    if (filter.excludeKeywords && filter.excludeKeywords.length > 0) {
      filtered = filtered.filter(
        (item) =>
          !filter.excludeKeywords!.some(
            (keyword) =>
              item.title.toLowerCase().includes(keyword.toLowerCase()) ||
              item.content.toLowerCase().includes(keyword.toLowerCase()),
          ),
      );
    }

    // Apply sentiment filtering
    if (filter.sentimentAnalysis) {
      const { minScore, maxScore } = filter.sentimentAnalysis;

      if (minScore !== undefined) {
        filtered = filtered.filter(
          (item) => item.sentiment_analysis.score >= minScore,
        );
      }

      if (maxScore !== undefined) {
        filtered = filtered.filter(
          (item) => item.sentiment_analysis.score <= maxScore,
        );
      }
    }

    // Apply market impact filtering
    if (filter.marketImpact) {
      const { minConfidence, direction } = filter.marketImpact;

      if (minConfidence !== undefined) {
        filtered = filtered.filter(
          (item) => item.impact.confidence >= minConfidence,
        );
      }

      if (direction) {
        filtered = filtered.filter(
          (item) => item.impact.market_sentiment === direction,
        );
      }
    }

    // Sort results
    if (filter.sortBy) {
      switch (filter.sortBy) {
        case "date":
          filtered.sort(
            (a, b) =>
              new Date(b.published_at).getTime() -
              new Date(a.published_at).getTime(),
          );
          break;
        case "impact":
          filtered.sort(
            (a, b) => Math.abs(b.impact.score) - Math.abs(a.impact.score),
          );
          break;
        case "popularity":
          filtered.sort(
            (a, b) =>
              b.social_metrics.total_engagement -
              a.social_metrics.total_engagement,
          );
          break;
        // relevance is default
      }
    }

    // Apply limit and offset
    if (filter.offset !== undefined && filter.limit !== undefined) {
      filtered = filtered.slice(filter.offset, filter.offset + filter.limit);
    } else if (filter.limit !== undefined) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Search for news with a specific query
   */
  async searchNews(
    query: string,
    filter?: Partial<NewsFilter>,
  ): Promise<NewsItem[]> {
    // CryptoCompare doesn't have a dedicated search endpoint, so we'll fetch news and filter
    const combinedFilter: Partial<NewsFilter> = {
      ...filter,
      searchText: query,
    };

    return this.fetchNews(combinedFilter);
  }

  /**
   * Get detailed information about a specific news item
   */
  async getNewsDetails(newsId: string): Promise<NewsItem | null> {
    try {
      // CryptoCompare doesn't have a specific endpoint for individual news items
      // so we fetch recent news and find the specific one
      const news = await this.fetchNews({ limit: 100 });
      return news.find((item) => item.id === newsId) || null;
    } catch (error) {
      console.error(`Error fetching news details for ID ${newsId}:`, error);
      return null;
    }
  }

  /**
   * Get the capabilities of this adapter
   */
  getCapabilities(): NewsSourceCapabilities {
    return {
      supportsRealTimeUpdates: false,
      supportsFullContentAccess: true,
      supportsSentimentAnalysis: false,
      supportsAssetFiltering: true,
      supportsLanguages: [
        "EN",
        "PT",
        "ES",
        "FR",
        "IT",
        "DE",
        "RU",
        "ZH",
        "JA",
        "KO",
      ],
      supportedCategories: [
        "BTC",
        "ETH",
        "Regulation",
        "Mining",
        "Trading",
        "General",
      ],
      requiresAuthentication: true,
      supportsHistoricalData: true,
      maxHistoricalDays: 365,
      rateLimits: {
        requestsPerMinute: 30,
        requestsPerDay: 10000,
      },
    };
  }
}
