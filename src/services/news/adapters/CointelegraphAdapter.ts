import axios from "axios";
import { NewsItem, NewsFilter } from "../../../types/news";
import {
  BaseNewsSourceAdapter,
  NewsSourceCapabilities,
} from "./NewsSourceAdapter";

// Interface for Cointelegraph RSS item
interface CointelegraphNewsItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  creator?: string;
  categories?: string[];
  enclosure?: {
    url: string;
  };
}

/**
 * Adapter for Cointelegraph RSS feed
 */
export class CointelegraphAdapter extends BaseNewsSourceAdapter {
  private rssUrl: string = "https://cointelegraph.com/rss";
  private categoryEndpoints: Record<string, string> = {
    bitcoin: "https://cointelegraph.com/tags/bitcoin/feed",
    ethereum: "https://cointelegraph.com/tags/ethereum/feed",
    blockchain: "https://cointelegraph.com/tags/blockchain/feed",
    regulation: "https://cointelegraph.com/tags/regulation/feed",
    defi: "https://cointelegraph.com/tags/defi/feed",
    "market-analysis":
      "https://cointelegraph.com/category/market-analysis/feed",
  };

  constructor() {
    super(
      "cointelegraph",
      "Cointelegraph",
      "https://cointelegraph.com",
      "https://cointelegraph.com/favicon.ico",
      0.92,
      "crypto",
    );
  }

  /**
   * Convert Cointelegraph RSS item to standardized NewsItem format
   */
  private convertToNewsItem(item: CointelegraphNewsItem): NewsItem {
    const baseItem = this.createNewsItemSkeleton() as Partial<NewsItem>;

    // Extract HTML content from description
    const cleanContent = item.description
      ? item.description.replace(/<\/?[^>]+(>|$)/g, "")
      : "";

    // Generate a summary
    const summary =
      cleanContent.length > 150
        ? cleanContent.substring(0, 147) + "..."
        : cleanContent;

    // Determine primary category based on categories or content analysis
    let primaryCategory: NewsItem["category"] = "other";
    const categories = item.categories || [];

    if (categories.some((c) => /regulation|policy|sec|legal/i.test(c))) {
      primaryCategory = "regulatory";
    } else if (
      categories.some((c) => /market|price|trading|bull|bear/i.test(c))
    ) {
      primaryCategory = "market";
    } else if (
      categories.some((c) => /tech|upgrade|protocol|blockchain/i.test(c))
    ) {
      primaryCategory = "technology";
    } else if (
      categories.some((c) => /adoption|mainstream|integration/i.test(c))
    ) {
      primaryCategory = "adoption";
    } else if (categories.some((c) => /security|hack|vulnerability/i.test(c))) {
      primaryCategory = "security";
    } else if (categories.some((c) => /partnership|collaboration/i.test(c))) {
      primaryCategory = "partnership";
    } else if (categories.some((c) => /economy|fed|inflation|macro/i.test(c))) {
      primaryCategory = "macroeconomic";
    }

    // Extract affected assets using regex pattern matching
    const commonCryptos = [
      { symbol: "BTC", name: "Bitcoin" },
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "XRP", name: "XRP" },
      { symbol: "BNB", name: "Binance Coin" },
      { symbol: "SOL", name: "Solana" },
      { symbol: "ADA", name: "Cardano" },
      { symbol: "DOT", name: "Polkadot" },
      { symbol: "DOGE", name: "Dogecoin" },
      { symbol: "SHIB", name: "Shiba Inu" },
      { symbol: "AVAX", name: "Avalanche" },
      { symbol: "LINK", name: "Chainlink" },
      { symbol: "MATIC", name: "Polygon" },
      { symbol: "LTC", name: "Litecoin" },
      { symbol: "UNI", name: "Uniswap" },
      { symbol: "AAVE", name: "Aave" },
    ];

    const titleAndDesc = `${item.title} ${cleanContent}`;
    const affectedAssets = commonCryptos
      .filter(
        (crypto) =>
          new RegExp(`\\b${crypto.symbol}\\b`, "i").test(titleAndDesc) ||
          new RegExp(`\\b${crypto.name}\\b`, "i").test(titleAndDesc),
      )
      .map((crypto) => crypto.symbol);

    // Calculate sentiment score based on keywords
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
      "optimistic",
      "upward",
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
      "pessimistic",
      "downward",
    ];

    const textLower = titleAndDesc.toLowerCase();

    bullishTerms.forEach((term) => {
      if (textLower.includes(term)) impactScore += 0.1;
    });

    bearishTerms.forEach((term) => {
      if (textLower.includes(term)) impactScore -= 0.1;
    });

    // Clamp impact score
    impactScore = Math.max(-1, Math.min(1, impactScore));

    // Image URL if available
    const imageUrl = item.enclosure?.url;

    // Create full news item
    const newsItem: NewsItem = {
      ...(baseItem as any),
      id: item.guid || item.link, // Use guid or fallback to link
      title: item.title,
      content: cleanContent,
      summary: summary,
      url: item.link,
      image_url: imageUrl,
      author: item.creator || "Cointelegraph",
      timestamp: this.formatTimestamp(item.pubDate),
      published_at: this.formatTimestamp(item.pubDate),
      language: "en",
      category: primaryCategory,
      subcategories: categories,
      tags: categories,
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
        importance: 0.8, // Cointelegraph is a major news source
        credibility: this.reliability,
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
      related_assets: affectedAssets.map((symbol) => {
        const asset = commonCryptos.find((c) => c.symbol === symbol);
        return {
          symbol,
          name: asset?.name || symbol,
          correlation: 0.6,
          mentioned_in_title:
            item.title.includes(symbol) ||
            (asset?.name && item.title.includes(asset.name)),
          mentioned_in_content:
            cleanContent.includes(symbol) ||
            (asset?.name && cleanContent.includes(asset.name)),
          sentiment_in_context: impactScore,
        };
      }),
      related_news: [],
      fact_checking: {
        verified_by: ["Cointelegraph Editorial"],
        accuracy_score: 0.85,
        disputed_claims: [],
      },
      verified: true,
      verification_sources: ["Cointelegraph"],
    };

    return newsItem;
  }

  /**
   * Parse XML/RSS content to JSON
   */
  private async parseRSS(xml: string): Promise<CointelegraphNewsItem[]> {
    // For production, use a proper XML parser library
    // This is a simplified implementation for demonstration
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>([\s\S]*?)<\/title>/;
    const descriptionRegex = /<description>([\s\S]*?)<\/description>/;
    const linkRegex = /<link>([\s\S]*?)<\/link>/;
    const guidRegex = /<guid[^>]*>([\s\S]*?)<\/guid>/;
    const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
    const creatorRegex = /<dc:creator>([\s\S]*?)<\/dc:creator>/;
    const categoryRegex = /<category>([\s\S]*?)<\/category>/g;
    const enclosureRegex = /<enclosure[^>]*url="([^"]*)"[^>]*>/;

    const items: CointelegraphNewsItem[] = [];
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];

      const titleMatch = itemContent.match(titleRegex);
      const descriptionMatch = itemContent.match(descriptionRegex);
      const linkMatch = itemContent.match(linkRegex);
      const guidMatch = itemContent.match(guidRegex);
      const pubDateMatch = itemContent.match(pubDateRegex);
      const creatorMatch = itemContent.match(creatorRegex);
      const enclosureMatch = itemContent.match(enclosureRegex);

      // Extract categories
      const categories: string[] = [];
      let categoryMatch;
      const categoryRegexCopy = new RegExp(
        categoryRegex.source,
        categoryRegex.flags,
      );
      while ((categoryMatch = categoryRegexCopy.exec(itemContent)) !== null) {
        categories.push(categoryMatch[1]);
      }

      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1],
          description: descriptionMatch ? descriptionMatch[1] : "",
          link: linkMatch[1],
          guid: guidMatch ? guidMatch[1] : linkMatch[1],
          pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toUTCString(),
          creator: creatorMatch ? creatorMatch[1] : undefined,
          categories: categories.length > 0 ? categories : undefined,
          enclosure: enclosureMatch ? { url: enclosureMatch[1] } : undefined,
        });
      }
    }

    return items;
  }

  /**
   * Fetch RSS feed from specified URL
   */
  private async fetchRSS(url: string): Promise<CointelegraphNewsItem[]> {
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Coinet/1.0 (https://coinet.com; info@coinet.com)",
        },
      });
      return this.parseRSS(response.data);
    } catch (error) {
      console.error(`Error fetching RSS from ${url}:`, error);
      return [];
    }
  }

  /**
   * Get URLs to fetch based on filter criteria
   */
  private getUrlsToFetch(filter?: Partial<NewsFilter>): string[] {
    if (!filter) {
      return [this.rssUrl];
    }

    const urls: string[] = [];

    // If specific assets are requested, try to fetch their dedicated feeds
    if (filter.assets && filter.assets.length > 0) {
      for (const asset of filter.assets) {
        const assetLower = asset.toLowerCase();
        if (this.categoryEndpoints[assetLower]) {
          urls.push(this.categoryEndpoints[assetLower]);
        }
      }
    }

    // If specific categories are requested
    if (filter.categories && filter.categories.length > 0) {
      for (const category of filter.categories) {
        if (category === "regulatory" && this.categoryEndpoints["regulation"]) {
          urls.push(this.categoryEndpoints["regulation"]);
        } else if (
          category === "market" &&
          this.categoryEndpoints["market-analysis"]
        ) {
          urls.push(this.categoryEndpoints["market-analysis"]);
        } else if (
          category === "technology" &&
          this.categoryEndpoints["blockchain"]
        ) {
          urls.push(this.categoryEndpoints["blockchain"]);
        }
      }
    }

    // If no specific feeds match or none requested, use the main feed
    if (urls.length === 0) {
      urls.push(this.rssUrl);
    }

    return urls;
  }

  /**
   * Apply additional filters client-side
   */
  private applyFilters(
    newsItems: NewsItem[],
    filter?: Partial<NewsFilter>,
  ): NewsItem[] {
    if (!filter) return newsItems;

    let filtered = [...newsItems];

    // Filter by time range
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
   * Fetch news from Cointelegraph
   */
  async fetchNews(filter?: Partial<NewsFilter>): Promise<NewsItem[]> {
    try {
      const urlsToFetch = this.getUrlsToFetch(filter);

      // Fetch all requested feeds
      const fetchPromises = urlsToFetch.map((url) => this.fetchRSS(url));
      const results = await Promise.all(fetchPromises);

      // Combine and deduplicate
      const allItems = results.flat();
      const uniqueItems = allItems.filter(
        (item, index, self) =>
          index ===
          self.findIndex((t) => t.guid === item.guid || t.link === item.link),
      );

      // Convert to standard format
      const newsItems = uniqueItems.map((item) => this.convertToNewsItem(item));

      // Apply additional filters
      return this.applyFilters(newsItems, filter);
    } catch (error) {
      console.error("Error fetching news from Cointelegraph:", error);
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
      supportsFullContentAccess: true,
      supportsSentimentAnalysis: false,
      supportsAssetFiltering: true,
      supportsLanguages: ["EN"],
      supportedCategories: [
        "Bitcoin",
        "Ethereum",
        "Blockchain",
        "Regulation",
        "DeFi",
        "Market Analysis",
      ],
      requiresAuthentication: false,
      supportsHistoricalData: false,
      maxHistoricalDays: 7,
      rateLimits: {
        requestsPerMinute: 10,
        requestsPerDay: 1000,
      },
    };
  }
}
