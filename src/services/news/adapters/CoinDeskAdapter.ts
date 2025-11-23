import axios from "axios";
import { NewsItem, NewsFilter } from "../../../types/news";
import {
  BaseNewsSourceAdapter,
  NewsSourceCapabilities,
} from "./NewsSourceAdapter";
// import { publishToTopic } from '@/eventbus/kafkaProducer'; // Uncomment if using Kafka
// import { Kafka } from 'kafkajs'; // Uncomment if using Kafka
// import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry'; // Uncomment if using Schema Registry

// Interface for CoinDesk RSS item
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

/**
 * Adapter for CoinDesk RSS feed
 */
export class CoinDeskAdapter extends BaseNewsSourceAdapter {
  private rssUrl: string = "https://www.coindesk.com/arc/outboundfeeds/rss/";
  private categoryFeeds: Record<string, string> = {
    policy: "https://www.coindesk.com/arc/outboundfeeds/rss/category/policy/",
    business:
      "https://www.coindesk.com/arc/outboundfeeds/rss/category/business/",
    tech: "https://www.coindesk.com/arc/outboundfeeds/rss/category/tech/",
    markets: "https://www.coindesk.com/arc/outboundfeeds/rss/category/markets/",
  };

  constructor() {
    super(
      "coindesk",
      "CoinDesk",
      "https://www.coindesk.com",
      "https://www.coindesk.com/favicon.ico",
      0.9,
      "crypto",
    );
  }

  /**
   * Convert CoinDesk RSS item to standardized NewsItem format
   */
  private convertToNewsItem(item: CoinDeskNewsItem): NewsItem {
    const baseItem = this.createNewsItemSkeleton() as Partial<NewsItem>;

    // Extract HTML content from description
    const contentMatch = item.description.match(/<p>(.*?)<\/p>/g);
    const content = contentMatch
      ? contentMatch.map((p) => p.replace(/<\/?p>/g, "")).join("\n\n")
      : item.description.replace(/<[^>]*>/g, "");

    // Generate a summary
    const summary =
      content.length > 150 ? content.substring(0, 147) + "..." : content;

    // Determine primary category
    let primaryCategory: NewsItem["category"] = "other";
    if (item.categories) {
      if (
        item.categories.some(
          (cat) =>
            cat.toLowerCase().includes("regulation") ||
            cat.toLowerCase().includes("policy"),
        )
      ) {
        primaryCategory = "regulatory";
      } else if (
        item.categories.some((cat) => cat.toLowerCase().includes("market"))
      ) {
        primaryCategory = "market";
      } else if (
        item.categories.some((cat) => cat.toLowerCase().includes("tech"))
      ) {
        primaryCategory = "technology";
      } else if (
        item.categories.some((cat) => cat.toLowerCase().includes("adoption"))
      ) {
        primaryCategory = "adoption";
      } else if (
        item.categories.some((cat) => cat.toLowerCase().includes("security"))
      ) {
        primaryCategory = "security";
      } else if (
        item.categories.some((cat) => cat.toLowerCase().includes("partnership"))
      ) {
        primaryCategory = "partnership";
      } else if (
        item.categories.some((cat) => cat.toLowerCase().includes("economy"))
      ) {
        primaryCategory = "macroeconomic";
      }
    }

    // Extract affected assets
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
    const titleAndDesc = item.title + " " + content;
    const affectedAssets = commonCryptos.filter(
      (crypto) =>
        titleAndDesc.toUpperCase().includes(crypto) ||
        titleAndDesc
          .toUpperCase()
          .includes(this.getAssetNameFromSymbol(crypto).toUpperCase()),
    );

    // Calculate impact score based on keywords
    let impactScore = 0;
    const bullishTerms = [
      "rally",
      "surge",
      "soar",
      "rise",
      "gain",
      "positive",
      "growth",
      "bullish",
    ];
    const bearishTerms = [
      "crash",
      "plummet",
      "drop",
      "fall",
      "sell-off",
      "bearish",
      "negative",
      "decline",
    ];

    const textLower = titleAndDesc.toLowerCase();

    bullishTerms.forEach((term) => {
      if (textLower.includes(term)) impactScore += 0.1;
    });

    bearishTerms.forEach((term) => {
      if (textLower.includes(term)) impactScore -= 0.1;
    });

    // Clamp impact score between -1 and 1
    impactScore = Math.max(-1, Math.min(1, impactScore));

    // Get image URL if available
    const imageUrl = item.enclosure ? item.enclosure.url : undefined;

    // Create full news item
    const newsItem: NewsItem = {
      ...(baseItem as any),
      id: item.guid,
      title: item.title,
      content: content,
      summary: summary,
      url: item.link,
      image_url: imageUrl,
      timestamp: this.formatTimestamp(item.pubDate),
      published_at: this.formatTimestamp(item.pubDate),
      language: "en",
      category: primaryCategory,
      subcategories: item.categories || [],
      tags: item.categories || [],
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
        importance: 0.7, // CoinDesk is considered a significant source
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
        mentioned_in_content: content.toUpperCase().includes(symbol),
        sentiment_in_context: impactScore,
      })),
      related_news: [],
      fact_checking: {
        verified_by: ["CoinDesk Editorial"],
        accuracy_score: 0.8,
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
   * Parse XML/RSS content to JSON
   */
  private async parseRSS(xml: string): Promise<CoinDeskNewsItem[]> {
    // For production, use a proper XML/RSS parser library
    // This is a simplified implementation for demonstration
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>([\s\S]*?)<\/title>/;
    const descriptionRegex = /<description>([\s\S]*?)<\/description>/;
    const linkRegex = /<link>([\s\S]*?)<\/link>/;
    const guidRegex = /<guid isPermaLink="[^"]*">([\s\S]*?)<\/guid>/;
    const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
    const enclosureRegex = /<enclosure url="([^"]*)"[^>]*>/;
    const categoryRegex = /<category>([\s\S]*?)<\/category>/g;

    const items: CoinDeskNewsItem[] = [];
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];

      const titleMatch = itemContent.match(titleRegex);
      const descriptionMatch = itemContent.match(descriptionRegex);
      const linkMatch = itemContent.match(linkRegex);
      const guidMatch = itemContent.match(guidRegex);
      const pubDateMatch = itemContent.match(pubDateRegex);
      const enclosureMatch = itemContent.match(enclosureRegex);

      // Extract categories
      const categories: string[] = [];
      let categoryMatch;
      while ((categoryMatch = categoryRegex.exec(itemContent)) !== null) {
        categories.push(categoryMatch[1]);
      }

      if (titleMatch && descriptionMatch && linkMatch) {
        items.push({
          title: titleMatch[1],
          description: descriptionMatch[1],
          link: linkMatch[1],
          guid: guidMatch ? guidMatch[1] : linkMatch[1],
          pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toUTCString(),
          enclosure: enclosureMatch ? { url: enclosureMatch[1] } : { url: "" },
          categories,
        });
      }
    }

    return items;
  }

  /**
   * Fetch RSS feed from the specified URL
   */
  private async fetchRSS(url: string): Promise<CoinDeskNewsItem[]> {
    try {
      const response = await axios.get(url);
      return this.parseRSS(response.data);
    } catch (error) {
      console.error(`Error fetching RSS from ${url}:`, error);
      return [];
    }
  }

  /**
   * Determine which RSS feed URLs to fetch based on filters
   */
  private getUrlsToFetch(filter?: Partial<NewsFilter>): string[] {
    if (!filter || !filter.categories || filter.categories.length === 0) {
      // Fetch main feed if no specific categories requested
      return [this.rssUrl];
    }

    const urls: string[] = [];

    filter.categories.forEach((category) => {
      const lowerCategory = category.toLowerCase();

      if (lowerCategory === "regulatory" && this.categoryFeeds["policy"]) {
        urls.push(this.categoryFeeds["policy"]);
      } else if (lowerCategory === "market" && this.categoryFeeds["markets"]) {
        urls.push(this.categoryFeeds["markets"]);
      } else if (lowerCategory === "technology" && this.categoryFeeds["tech"]) {
        urls.push(this.categoryFeeds["tech"]);
      } else if (
        lowerCategory === "partnership" &&
        this.categoryFeeds["business"]
      ) {
        urls.push(this.categoryFeeds["business"]);
      }
    });

    // If no matching category feeds, use the main feed
    if (urls.length === 0) {
      urls.push(this.rssUrl);
    }

    return urls;
  }

  /**
   * Apply additional filters that can't be applied at the source
   */
  private applyFilters(
    newsItems: NewsItem[],
    filter?: Partial<NewsFilter>,
  ): NewsItem[] {
    if (!filter) return newsItems;

    let filtered = [...newsItems];

    // Filter by assets
    if (filter.assets && filter.assets.length > 0) {
      filtered = filtered.filter(
        (item) =>
          Array.isArray(item.related_assets) &&
          item.related_assets.some(
            (asset) =>
              typeof asset === "object" &&
              "symbol" in asset &&
              filter.assets!.includes((asset as { symbol: string }).symbol),
          ),
      );
    }

    // Filter by published date range
    if (filter.publishedAfter) {
      const afterDate = new Date(filter.publishedAfter).getTime();
      filtered = filtered.filter(
        (item) => new Date(item.published_at).getTime() >= afterDate,
      );
    }

    if (filter.publishedBefore) {
      const beforeDate = new Date(filter.publishedBefore).getTime();
      filtered = filtered.filter(
        (item) => new Date(item.published_at).getTime() <= beforeDate,
      );
    }

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

    // Apply limit and offset
    if (filter.offset !== undefined && filter.limit !== undefined) {
      filtered = filtered.slice(filter.offset, filter.offset + filter.limit);
    } else if (filter.limit !== undefined) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Fetch news from CoinDesk RSS feed
   */
  async fetchNews(filter?: Partial<NewsFilter>): Promise<NewsItem[]> {
    try {
      const urlsToFetch = this.getUrlsToFetch(filter);

      // Fetch all requested feeds in parallel
      const fetchPromises = urlsToFetch.map((url) => this.fetchRSS(url));
      const results = await Promise.all(fetchPromises);

      // Combine and deduplicate results
      const allItems = results.flat();
      const uniqueItems = allItems.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.guid === item.guid),
      );

      // Convert to standard format
      const newsItems = uniqueItems.map((item) => this.convertToNewsItem(item));

      // Apply additional filters
      return this.applyFilters(newsItems, filter);
    } catch (error) {
      console.error("Error fetching news from CoinDesk:", error);
      return [];
    }
  }

  /**
   * Search for news with a specific query
   */
  async searchNews(
    query: string,
    filter?: Partial<NewsFilter>,
  ): Promise<NewsItem[]> {
    // CoinDesk RSS doesn't have search, so fetch news and filter client-side
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
      // Fetch recent news and find the specific item
      const news = await this.fetchNews({ limit: 50 });
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
      supportsFullContentAccess: false, // Only provides summaries in RSS
      supportsSentimentAnalysis: false,
      supportsAssetFiltering: false, // Only client-side filtering
      supportsLanguages: ["EN"],
      supportedCategories: ["Markets", "Policy", "Tech", "Business"],
      requiresAuthentication: false,
      supportsHistoricalData: false, // RSS typically only has recent items
      maxHistoricalDays: 7,
      rateLimits: {
        requestsPerMinute: 10,
        requestsPerDay: 1000,
      },
    };
  }

  async publishNewsArticle(newsArticle: NewsItem): Promise<void> {
    try {
      // await publishToTopic('news-articles', newsArticle); // Uncomment if using Kafka
      // const registry = new SchemaRegistry({ host: process.env.SCHEMA_REGISTRY_URL });
      // const schemaId = await registry.register({
      //   type: SchemaType.JSON,
      //   schema: JSON.stringify(newsArticleSchema),
      // });
    } catch (error) {
      console.error("Error publishing news article:", error);
    }
  }
}

// Define newsArticleSchema if using schema registry
const newsArticleSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    url: { type: "string" },
    summary: { type: "string" },
    publishedAt: { type: "string", format: "date-time" },
    source: { type: "string" },
    assetsMentioned: { type: "array", items: { type: "string" } },
  },
  required: ["id", "title", "url", "publishedAt", "source", "assetsMentioned"],
};

// const kafka = new Kafka({ ... });
// const consumer = kafka.consumer({ groupId: 'monitor-group' });

// await consumer.connect();
// await consumer.subscribe({ topic: 'news-articles', fromBeginning: false });

// consumer.run({
//   eachMessage: async ({
//     topic,
//     partition,
//     message,
//   }: {
//     topic: string;
//     partition: number;
//     message: { value: Buffer };
//   }) => {
//     // Process message or just track offsets for lag
//   },
// });
