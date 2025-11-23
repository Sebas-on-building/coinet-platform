import axios from "axios";
import { NewsItem, NewsFilter } from "@/types/news";
import { newsService } from "./news";
import { api } from "./api";
import { SentimentAnalysisService } from "./sentimentAnalysis";

// Create sentiment analysis instance
const sentimentAnalysis = SentimentAnalysisService.getInstance();

// News sources interfaces
export interface NewsSource {
  id: string;
  name: string;
  baseUrl: string;
  logoUrl: string;
  reliability: number; // 0-1
  category: "mainstream" | "crypto" | "financial" | "social" | "blog";
  fetchNews: (options?: any) => Promise<NewsItem[]>;
}

export interface AggregationOptions {
  sources?: string[];
  maxItemsPerSource?: number;
  deduplicate?: boolean;
  enhanceWithSentiment?: boolean;
  enhanceWithSocial?: boolean;
  timeframe?: {
    start: Date;
    end: Date;
  };
  preferredLanguages?: string[];
  sortBy?: "relevance" | "date" | "popularity";
}

const DEFAULT_OPTIONS: AggregationOptions = {
  maxItemsPerSource: 10,
  deduplicate: true,
  enhanceWithSentiment: true,
  enhanceWithSocial: true,
  preferredLanguages: ["en"],
  sortBy: "date",
};

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

interface CoinDeskNewsItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  enclosure: {
    url: string;
  };
  categories: string[];
}

// Source-specific fetch functions
async function fetchCryptoCompareNews(): Promise<NewsItem[]> {
  try {
    const response = await axios.get(
      "https://min-api.cryptocompare.com/data/v2/news/?lang=EN",
    );
    return response.data.Data.map((item: CryptoCompareNewsItem) =>
      transformCryptoCompareNews(item),
    );
  } catch (error) {
    console.error("Error fetching CryptoCompare news:", error);
    return [];
  }
}

async function fetchCoinDeskNews(): Promise<NewsItem[]> {
  try {
    const response = await axios.get(
      "https://www.coindesk.com/arc/outboundfeeds/rss/",
    );
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, "text/xml");
    const items = xmlDoc.querySelectorAll("item");

    return Array.from(items).map((item: any) => transformCoinDeskNews(item));
  } catch (error) {
    console.error("Error fetching CoinDesk news:", error);
    return [];
  }
}

async function fetchCoinTelegraphNews(): Promise<NewsItem[]> {
  try {
    const response = await axios.get("https://cointelegraph.com/rss");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, "text/xml");
    const items = xmlDoc.querySelectorAll("item");

    return Array.from(items).map((item: any) => ({
      id:
        item.querySelector("guid")?.textContent ||
        Math.random().toString(36).substring(2),
      title: item.querySelector("title")?.textContent || "",
      content: item.querySelector("description")?.textContent || "",
      summary:
        item.querySelector("description")?.textContent?.substring(0, 150) +
          "..." || "",
      source: "Cointelegraph",
      url: item.querySelector("link")?.textContent || "",
      timestamp: new Date(
        item.querySelector("pubDate")?.textContent || "",
      ).toISOString(),
      impact: {
        score: 0,
        confidence: 0,
        affected_assets: [],
        volatility_change: 0,
        market_sentiment: "neutral",
      },
      category: detectCategory(item.querySelector("title")?.textContent || ""),
      sentiment_analysis: {
        score: 0,
        magnitude: 0,
        keywords: [],
        entities: [],
        topics: [],
      },
      social_metrics: createDefaultSocialMetrics(),
      verified: true,
      verification_sources: ["Cointelegraph"],
      related_assets: [],
      verification_metrics: createDefaultVerificationMetrics(),
      manipulation_indicators: createDefaultManipulationIndicators(),
      content_analysis: createDefaultContentAnalysis(),
    }));
  } catch (error) {
    console.error("Error fetching Cointelegraph news:", error);
    return [];
  }
}

// News sources registry
const newsSources: NewsSource[] = [
  {
    id: "cryptocompare",
    name: "CryptoCompare",
    baseUrl: "https://cryptocompare.com",
    logoUrl: "https://www.cryptocompare.com/media/20562/favicon.png",
    reliability: 0.85,
    category: "crypto",
    fetchNews: fetchCryptoCompareNews,
  },
  {
    id: "coindesk",
    name: "CoinDesk",
    baseUrl: "https://coindesk.com",
    logoUrl: "https://www.coindesk.com/favicon.ico",
    reliability: 0.9,
    category: "crypto",
    fetchNews: fetchCoinDeskNews,
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    baseUrl: "https://cointelegraph.com",
    logoUrl: "https://cointelegraph.com/favicon.ico",
    reliability: 0.8,
    category: "crypto",
    fetchNews: fetchCoinTelegraphNews,
  },
  // Additional sources can be added here
];

// Helper functions
function transformCryptoCompareNews(newsItem: CryptoCompareNewsItem): NewsItem {
  const categories = newsItem.categories.split("|");
  const title = newsItem.title;
  return {
    id: newsItem.id || newsItem.guid,
    title: title,
    content: newsItem.body,
    summary: newsItem.body.substring(0, 150) + "...",
    source: newsItem.source,
    url: newsItem.url,
    timestamp: new Date(newsItem.published_on * 1000).toISOString(),
    impact: {
      score: 0, // This will be calculated later
      confidence: 0.5,
      affected_assets: extractAssetMentions(title + " " + newsItem.body),
      volatility_change: 0,
      market_sentiment: "neutral",
    },
    category: detectCategory(title, categories),
    sentiment_analysis: {
      score: 0, // This will be calculated later
      magnitude: 0,
      keywords: extractKeywords(title + " " + newsItem.body),
      entities: [],
      topics: categories.slice(0, 5),
    },
    social_metrics: createDefaultSocialMetrics(),
    verified: true,
    verification_sources: ["CryptoCompare"],
    related_assets: [],
    verification_metrics: createDefaultVerificationMetrics(),
    manipulation_indicators: createDefaultManipulationIndicators(),
    content_analysis: createDefaultContentAnalysis(),
  };
}

function transformCoinDeskNews(item: any): NewsItem {
  const title = item.querySelector("title")?.textContent || "";
  const description = item.querySelector("description")?.textContent || "";
  const link = item.querySelector("link")?.textContent || "";
  const guid = item.querySelector("guid")?.textContent || "";
  const pubDate = item.querySelector("pubDate")?.textContent || "";
  const categories = Array.from(item.querySelectorAll("category")).map(
    (cat: any) => cat.textContent,
  );

  return {
    id: guid || Math.random().toString(36).substring(2),
    title: title,
    content: description,
    summary: description.substring(0, 150) + "...",
    source: "CoinDesk",
    url: link,
    timestamp: new Date(pubDate).toISOString(),
    impact: {
      score: 0,
      confidence: 0.5,
      affected_assets: extractAssetMentions(title + " " + description),
      volatility_change: 0,
      market_sentiment: "neutral",
    },
    category: detectCategory(title, categories),
    sentiment_analysis: {
      score: 0,
      magnitude: 0,
      keywords: extractKeywords(title + " " + description),
      entities: [],
      topics: categories.slice(0, 5),
    },
    social_metrics: createDefaultSocialMetrics(),
    verified: true,
    verification_sources: ["CoinDesk"],
    related_assets: [],
    verification_metrics: createDefaultVerificationMetrics(),
    manipulation_indicators: createDefaultManipulationIndicators(),
    content_analysis: createDefaultContentAnalysis(),
  };
}

function detectCategory(
  title: string,
  categories?: string[],
): NewsItem["category"] {
  const regulatoryKeywords = [
    "regulation",
    "sec",
    "cftc",
    "law",
    "legal",
    "compliance",
    "ban",
  ];
  const marketKeywords = [
    "market",
    "price",
    "rally",
    "crash",
    "bull",
    "bear",
    "trading",
  ];
  const technologyKeywords = [
    "blockchain",
    "protocol",
    "update",
    "fork",
    "upgrade",
    "technology",
  ];
  const adoptionKeywords = [
    "adoption",
    "institutional",
    "mainstream",
    "acceptance",
    "use case",
  ];
  const securityKeywords = [
    "hack",
    "security",
    "breach",
    "vulnerability",
    "exploit",
    "steal",
  ];
  const partnershipKeywords = [
    "partnership",
    "collaborate",
    "alliance",
    "working with",
  ];
  const macroKeywords = [
    "fed",
    "inflation",
    "economy",
    "interest rate",
    "recession",
  ];

  const lowerTitle = title.toLowerCase();

  if (categories) {
    for (const category of categories) {
      const lowerCat = category.toLowerCase();
      if (
        lowerCat.includes("regulat") ||
        lowerCat.includes("legal") ||
        lowerCat.includes("law")
      )
        return "regulatory";
      if (
        lowerCat.includes("market") ||
        lowerCat.includes("price") ||
        lowerCat.includes("trade")
      )
        return "market";
      if (lowerCat.includes("tech") || lowerCat.includes("develop"))
        return "technology";
      if (lowerCat.includes("adopt") || lowerCat.includes("use"))
        return "adoption";
      if (lowerCat.includes("secur") || lowerCat.includes("hack"))
        return "security";
      if (lowerCat.includes("partner") || lowerCat.includes("alliance"))
        return "partnership";
      if (lowerCat.includes("econom") || lowerCat.includes("macro"))
        return "macroeconomic";
    }
  }

  if (regulatoryKeywords.some((keyword) => lowerTitle.includes(keyword)))
    return "regulatory";
  if (marketKeywords.some((keyword) => lowerTitle.includes(keyword)))
    return "market";
  if (technologyKeywords.some((keyword) => lowerTitle.includes(keyword)))
    return "technology";
  if (adoptionKeywords.some((keyword) => lowerTitle.includes(keyword)))
    return "adoption";
  if (securityKeywords.some((keyword) => lowerTitle.includes(keyword)))
    return "security";
  if (partnershipKeywords.some((keyword) => lowerTitle.includes(keyword)))
    return "partnership";
  if (macroKeywords.some((keyword) => lowerTitle.includes(keyword)))
    return "macroeconomic";

  return "other";
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const cryptoKeywords = [
    "bitcoin",
    "ethereum",
    "blockchain",
    "crypto",
    "token",
    "nft",
    "defi",
    "stablecoin",
    "mining",
    "wallet",
    "exchange",
    "altcoin",
  ];

  for (const keyword of cryptoKeywords) {
    if (text.toLowerCase().includes(keyword)) {
      keywords.add(keyword);
    }
  }

  return Array.from(keywords).slice(0, 10);
}

function extractAssetMentions(text: string): string[] {
  const assets = new Set<string>();
  const commonAssets = [
    "BTC",
    "ETH",
    "XRP",
    "SOL",
    "ADA",
    "DOT",
    "AVAX",
    "MATIC",
    "LINK",
    "UNI",
    "DOGE",
    "SHIB",
    "USDT",
    "USDC",
  ];

  const lowerText = text.toLowerCase();

  if (lowerText.includes("bitcoin")) assets.add("BTC");
  if (lowerText.includes("ethereum")) assets.add("ETH");
  if (lowerText.includes("ripple")) assets.add("XRP");
  if (lowerText.includes("solana")) assets.add("SOL");
  if (lowerText.includes("cardano")) assets.add("ADA");
  if (lowerText.includes("polkadot")) assets.add("DOT");
  if (lowerText.includes("avalanche")) assets.add("AVAX");
  if (lowerText.includes("polygon")) assets.add("MATIC");
  if (lowerText.includes("chainlink")) assets.add("LINK");
  if (lowerText.includes("uniswap")) assets.add("UNI");
  if (lowerText.includes("dogecoin")) assets.add("DOGE");
  if (lowerText.includes("shiba")) assets.add("SHIB");
  if (lowerText.includes("tether")) assets.add("USDT");
  if (lowerText.includes("usdc")) assets.add("USDC");

  // Check for ticker symbols
  for (const asset of commonAssets) {
    const regex = new RegExp(`\\b${asset}\\b`, "i");
    if (regex.test(text)) {
      assets.add(asset);
    }
  }

  return Array.from(assets);
}

function createDefaultSocialMetrics(): NewsItem["social_metrics"] {
  return {
    twitter: {
      mentions: 0,
      likes: 0,
      retweets: 0,
      quote_tweets: 0,
      sentiment_distribution: {
        positive: 0,
        negative: 0,
        neutral: 1,
      },
      influential_mentions: [],
    },
    reddit: {
      mentions: 0,
      upvotes: 0,
      comments: 0,
      awards: 0,
      top_subreddits: [],
    },
    telegram: {
      mentions: 0,
      channel_shares: 0,
      group_discussions: 0,
      reach: 0,
    },
    discord: {
      mentions: 0,
      server_shares: 0,
      reactions: 0,
      top_channels: [],
    },
    linkedin: {
      shares: 0,
      engagements: 0,
      industry_mentions: [],
    },
    total_engagement: 0,
    engagement_trend: 0,
  };
}

function createDefaultVerificationMetrics(): NewsItem["verification_metrics"] {
  return {
    source_credibility: 0.8,
    fact_check_score: 0.75,
    cross_references: [],
    ai_detection: {
      is_ai_generated: false,
      confidence: 0.7,
      detection_method: "heuristic",
      flagged_patterns: [],
    },
    expert_reviews: [],
    blockchain_verification: {
      hash: "",
      timestamp: "",
      platform: "",
      verified_by: [],
    },
  };
}

function createDefaultManipulationIndicators(): NewsItem["manipulation_indicators"] {
  return {
    sentiment_manipulation_score: 0.1,
    coordinated_activity: {
      detected: false,
      pattern_type: "",
      involved_accounts: 0,
      confidence: 0,
    },
    market_manipulation_risk: {
      level: "low",
      indicators: [],
      historical_patterns: false,
    },
    bot_activity: {
      detected: false,
      percentage: 0,
      pattern_type: [],
    },
  };
}

function createDefaultContentAnalysis(): NewsItem["content_analysis"] {
  return {
    objectivity_score: 0.7,
    bias_analysis: {
      political_bias: 0,
      commercial_bias: 0.2,
      source_bias: [],
    },
    technical_accuracy: {
      score: 0.8,
      verified_claims: [],
      disputed_claims: [],
      unverified_claims: [],
    },
    context_completeness: {
      score: 0.7,
      missing_context: [],
      related_events: [],
    },
  };
}

// Deduplication function
function deduplicateNews(newsItems: NewsItem[]): NewsItem[] {
  const uniqueItems = new Map<string, NewsItem>();

  for (const item of newsItems) {
    const titleNormalized = item.title.toLowerCase().trim();

    if (!uniqueItems.has(titleNormalized)) {
      uniqueItems.set(titleNormalized, item);
    } else {
      // If we already have this news, keep the one with more complete data
      const existing = uniqueItems.get(titleNormalized)!;
      if (
        item.sentiment_analysis.keywords.length >
          existing.sentiment_analysis.keywords.length ||
        item.impact.affected_assets.length >
          existing.impact.affected_assets.length
      ) {
        uniqueItems.set(titleNormalized, item);
      }
    }
  }

  return Array.from(uniqueItems.values());
}

// Main class
class NewsAggregationService {
  private cachedNews: Map<string, { news: NewsItem[]; timestamp: number }> =
    new Map();
  private readonly cacheLifetime = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  /**
   * Get news sources available for aggregation
   */
  getAvailableSources(): Array<Omit<NewsSource, "fetchNews">> {
    return newsSources.map(
      ({ id, name, baseUrl, logoUrl, reliability, category }) => ({
        id,
        name,
        baseUrl,
        logoUrl,
        reliability,
        category,
      }),
    );
  }

  /**
   * Fetch news from multiple sources and aggregate them
   */
  async fetchAggregatedNews(
    options: Partial<AggregationOptions> = {},
  ): Promise<NewsItem[]> {
    const fullOptions: AggregationOptions = { ...DEFAULT_OPTIONS, ...options };
    const cacheKey = JSON.stringify(fullOptions);

    // Check cache
    const cached = this.cachedNews.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheLifetime) {
      return cached.news;
    }

    // Determine sources to fetch from
    const sourcesToFetch = fullOptions.sources
      ? newsSources.filter((source) => fullOptions.sources!.includes(source.id))
      : newsSources;

    // Fetch from all sources in parallel
    const fetchPromises = sourcesToFetch.map(async (source) => {
      try {
        const newsItems = await source.fetchNews();
        return newsItems.slice(0, fullOptions.maxItemsPerSource);
      } catch (error) {
        console.error(`Error fetching news from ${source.name}:`, error);
        return [];
      }
    });

    let allNews = (await Promise.all(fetchPromises)).flat();

    // Apply deduplication if enabled
    if (fullOptions.deduplicate) {
      allNews = deduplicateNews(allNews);
    }

    // Enhance with sentiment analysis if enabled
    if (fullOptions.enhanceWithSentiment) {
      allNews = await this.enhanceWithSentimentAnalysis(allNews);
    }

    // Filter by timeframe if provided
    if (fullOptions.timeframe) {
      const { start, end } = fullOptions.timeframe;
      allNews = allNews.filter((item) => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= start && itemDate <= end;
      });
    }

    // Filter by preferred languages
    if (
      fullOptions.preferredLanguages &&
      fullOptions.preferredLanguages.length > 0
    ) {
      // This is just a placeholder - in a real implementation we would need a language detection service
      // For now we'll assume all news is in the preferred language
    }

    // Sort the news
    switch (fullOptions.sortBy) {
      case "date":
        allNews.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        break;
      case "relevance":
        allNews.sort((a, b) => {
          const scoreA =
            a.sentiment_analysis.magnitude *
            Math.abs(a.sentiment_analysis.score);
          const scoreB =
            b.sentiment_analysis.magnitude *
            Math.abs(b.sentiment_analysis.score);
          return scoreB - scoreA;
        });
        break;
      case "popularity":
        allNews.sort(
          (a, b) =>
            b.social_metrics.total_engagement -
            a.social_metrics.total_engagement,
        );
        break;
    }

    // Cache the results
    this.cachedNews.set(cacheKey, {
      news: allNews,
      timestamp: Date.now(),
    });

    return allNews;
  }

  /**
   * Enhance news items with sentiment analysis
   */
  private async enhanceWithSentimentAnalysis(
    newsItems: NewsItem[],
  ): Promise<NewsItem[]> {
    const enhanced = await Promise.all(
      newsItems.map(async (item) => {
        try {
          // Only analyze if sentiment score is not already set
          if (item.sentiment_analysis.score === 0) {
            const text = item.title + " " + item.content;
            const sentimentResult =
              await sentimentAnalysis.analyzeSentiment(text);

            // Determine market sentiment as a valid enum value
            let marketSentiment: "bullish" | "bearish" | "neutral" = "neutral";
            if (sentimentResult.score > 0.2) {
              marketSentiment = "bullish";
            } else if (sentimentResult.score < -0.2) {
              marketSentiment = "bearish";
            }

            return {
              ...item,
              sentiment_analysis: {
                ...item.sentiment_analysis,
                score: sentimentResult.score,
                magnitude: sentimentResult.magnitude || 0.5,
                entities:
                  sentimentResult.entities || item.sentiment_analysis.entities,
              },
              impact: {
                ...item.impact,
                score: sentimentResult.score * 0.7, // Simple approximation of market impact
                confidence: 0.5,
                market_sentiment: marketSentiment,
              },
            };
          }

          return item;
        } catch (error) {
          console.error("Error enhancing news with sentiment analysis:", error);
          return item;
        }
      }),
    );

    return enhanced;
  }

  /**
   * Fetch news specific to a given asset
   */
  async fetchAssetNews(
    assetSymbol: string,
    options: Partial<AggregationOptions> = {},
  ): Promise<NewsItem[]> {
    const allNews = await this.fetchAggregatedNews(options);

    // Filter for news relevant to the asset
    return allNews.filter((item) => {
      return (
        item.impact.affected_assets.includes(assetSymbol) ||
        item.title.toLowerCase().includes(assetSymbol.toLowerCase()) ||
        item.content.toLowerCase().includes(assetSymbol.toLowerCase())
      );
    });
  }

  /**
   * Get news by category
   */
  async getNewsByCategory(
    category: NewsItem["category"],
    options: Partial<AggregationOptions> = {},
  ): Promise<NewsItem[]> {
    const allNews = await this.fetchAggregatedNews(options);
    return allNews.filter((item) => item.category === category);
  }

  /**
   * Get trending news based on social engagement
   */
  async getTrendingNews(
    timeframeHours: number = 24,
    limit: number = 10,
  ): Promise<NewsItem[]> {
    const timeframe = {
      start: new Date(Date.now() - timeframeHours * 60 * 60 * 1000),
      end: new Date(),
    };

    const options: Partial<AggregationOptions> = {
      timeframe,
      sortBy: "popularity",
      deduplicate: true,
    };

    const news = await this.fetchAggregatedNews(options);
    return news.slice(0, limit);
  }

  /**
   * Search news by keyword
   */
  async searchNews(
    query: string,
    options: Partial<AggregationOptions> = {},
  ): Promise<NewsItem[]> {
    const allNews = await this.fetchAggregatedNews(options);

    const queryTerms = query
      .toLowerCase()
      .split(" ")
      .filter((t) => t.length > 2);

    return allNews.filter((item) => {
      const text = (item.title + " " + item.content).toLowerCase();
      return queryTerms.some((term) => text.includes(term));
    });
  }

  /**
   * Clear the news cache
   */
  clearCache(): void {
    this.cachedNews.clear();
  }
}

export const newsAggregationService = new NewsAggregationService();
