import { NewsItem, NewsFilter } from "../../../types/news";

/**
 * Interface for news source adapters.
 * Adapters connect to different news sources and normalize their data format.
 */
export interface NewsSourceAdapter {
  id: string;
  name: string;
  baseUrl: string;
  logoUrl: string;
  reliability: number; // 0-1
  category:
    | "mainstream"
    | "crypto"
    | "financial"
    | "social"
    | "blog"
    | "official";

  /**
   * Fetch news from the source with optional filter parameters
   */
  fetchNews(filter?: Partial<NewsFilter>): Promise<NewsItem[]>;

  /**
   * Search for news with a specific query
   */
  searchNews(query: string, filter?: Partial<NewsFilter>): Promise<NewsItem[]>;

  /**
   * Get detailed information about a specific news item
   */
  getNewsDetails(newsId: string): Promise<NewsItem | null>;

  /**
   * Verify if the adapter is properly connected to the source
   */
  verifyConnection(): Promise<boolean>;

  /**
   * Get supported capabilities of this adapter
   */
  getCapabilities(): NewsSourceCapabilities;
}

/**
 * Capabilities supported by a news source adapter
 */
export interface NewsSourceCapabilities {
  supportsRealTimeUpdates: boolean;
  supportsFullContentAccess: boolean;
  supportsSentimentAnalysis: boolean;
  supportsAssetFiltering: boolean;
  supportsLanguages: string[];
  supportedCategories: string[];
  requiresAuthentication: boolean;
  supportsHistoricalData: boolean;
  maxHistoricalDays: number;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

/**
 * Base abstract class that implements common functionality for adapters
 */
export abstract class BaseNewsSourceAdapter implements NewsSourceAdapter {
  id: string;
  name: string;
  baseUrl: string;
  logoUrl: string;
  reliability: number;
  category:
    | "mainstream"
    | "crypto"
    | "financial"
    | "social"
    | "blog"
    | "official";

  constructor(
    id: string,
    name: string,
    baseUrl: string,
    logoUrl: string,
    reliability: number,
    category:
      | "mainstream"
      | "crypto"
      | "financial"
      | "social"
      | "blog"
      | "official",
  ) {
    this.id = id;
    this.name = name;
    this.baseUrl = baseUrl;
    this.logoUrl = logoUrl;
    this.reliability = reliability;
    this.category = category;
  }

  /**
   * Convert timestamp to standardized ISO format
   */
  protected formatTimestamp(timestamp: string | number): string {
    if (typeof timestamp === "number") {
      return new Date(timestamp * 1000).toISOString();
    }
    try {
      return new Date(timestamp).toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  }

  /**
   * Create a basic skeleton for a news item with source information
   */
  protected createNewsItemSkeleton(): Partial<NewsItem> {
    return {
      source: this.name,
      source_id: this.id,
      verified: false,
      language: "en",
      verification_sources: [],
      sentiment_analysis: {
        score: 0,
        magnitude: 0,
        keywords: [],
        entities: [],
        topics: [],
        primary_emotion: "neutral",
      },
      impact: {
        score: 0,
        confidence: 0.5,
        affected_assets: [],
        volatility_change: 0,
        market_sentiment: "neutral",
        credibility: this.reliability,
        importance: 0.5,
      },
    };
  }

  /**
   * Default implementation for verifyConnection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const news = await this.fetchNews({ limit: 1 });
      return news.length > 0;
    } catch (error) {
      console.error(`Connection error for ${this.name}:`, error);
      return false;
    }
  }

  abstract fetchNews(filter?: Partial<NewsFilter>): Promise<NewsItem[]>;
  abstract searchNews(
    query: string,
    filter?: Partial<NewsFilter>,
  ): Promise<NewsItem[]>;
  abstract getNewsDetails(newsId: string): Promise<NewsItem | null>;
  abstract getCapabilities(): NewsSourceCapabilities;
}
