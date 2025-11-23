import axios from "axios";
import { NewsItem, NewsFilter } from "../../../types/news";
import {
  BaseNewsSourceAdapter,
  NewsSourceCapabilities,
} from "./NewsSourceAdapter";
import { CryptoNewsWriter } from "../../../tools/CryptoNewsWriter";

// Interface for Twitter/X news item
interface TwitterNewsItem {
  id: string;
  text: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
    verified: boolean;
    followers_count: number;
  };
  entities?: {
    hashtags?: Array<{
      tag: string;
    }>;
    mentions?: Array<{
      username: string;
    }>;
    urls?: Array<{
      expanded_url: string;
      display_url: string;
    }>;
    media?: Array<{
      type: string;
      media_url: string;
    }>;
  };
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  referenced_tweets?: Array<{
    type: "replied_to" | "quoted" | "retweeted";
    id: string;
  }>;
  attachments?: {
    media_keys?: string[];
  };
}

/**
 * Twitter/X Source Configuration
 */
interface TwitterSourceConfig {
  id: string;
  name: string;
  username: string;
  logoUrl: string;
  reliability: number;
  category:
    | "mainstream"
    | "crypto"
    | "financial"
    | "social"
    | "blog"
    | "official";
  dataType:
    | "whale_transactions"
    | "on_chain_metrics"
    | "market_data"
    | "general_news";
}

/**
 * Adapter for Twitter/X-based crypto news sources
 */
export class TwitterSourceAdapter extends BaseNewsSourceAdapter {
  private sourceConfig: TwitterSourceConfig;
  private apiKey: string = process.env.TWITTER_API_KEY || "";
  private apiEndpoint: string =
    "https://api.twitter.com/2/tweets/search/recent";

  // For demo purposes, we'll use mock data instead of actual API calls
  private useMockData: boolean = true;

  constructor(config: TwitterSourceConfig) {
    super(
      config.id,
      config.name,
      `https://twitter.com/${config.username}`,
      config.logoUrl,
      config.reliability,
      config.category,
    );
    this.sourceConfig = config;
  }

  /**
   * Convert Twitter/X post to standardized NewsItem format
   */
  private convertToNewsItem(item: TwitterNewsItem): NewsItem {
    const baseItem = this.createNewsItemSkeleton() as Partial<NewsItem>;

    // Extract hashtags
    const hashtags = item.entities?.hashtags?.map((h) => h.tag) || [];

    // Extract URLs
    const urls = item.entities?.urls?.map((u) => u.expanded_url) || [];

    // Extract media URLs
    const mediaUrls = item.entities?.media?.map((m) => m.media_url) || [];

    // Determine category based on source type and content
    let primaryCategory: NewsItem["category"] = "other";
    const tweetText = item.text.toLowerCase();

    switch (this.sourceConfig.dataType) {
      case "whale_transactions":
        primaryCategory = "market";
        break;
      case "on_chain_metrics":
        primaryCategory = "technology";
        break;
      case "market_data":
        primaryCategory = "market";
        break;
      case "general_news":
        // Determine based on content
        if (/regulation|policy|sec|law/i.test(tweetText)) {
          primaryCategory = "regulatory";
        } else if (/price|market|trading|volume|sell|buy/i.test(tweetText)) {
          primaryCategory = "market";
        } else if (
          /technology|protocol|update|upgrade|blockchain/i.test(tweetText)
        ) {
          primaryCategory = "technology";
        } else if (/adoption|mainstream|partnership/i.test(tweetText)) {
          primaryCategory = "adoption";
        } else if (/security|hack|exploit|vulnerability/i.test(tweetText)) {
          primaryCategory = "security";
        }
        break;
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

    const affectedAssets = commonCryptos
      .filter(
        (crypto) =>
          new RegExp(`\\b${crypto.symbol}\\b`, "i").test(tweetText) ||
          new RegExp(`\\b${crypto.name}\\b`, "i").test(tweetText),
      )
      .map((crypto) => crypto.symbol);

    // Calculate sentiment score based on keywords and source type
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
      "accumulation",
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
      "capitulation",
    ];

    if (this.sourceConfig.dataType === "whale_transactions") {
      // For whale transactions, look for specific patterns
      if (/moved to exchange|sent to exchange|transfer to/i.test(tweetText)) {
        impactScore -= 0.4; // Potentially bearish (selling)
      } else if (
        /withdrawn from exchange|moved from exchange|transfer from/i.test(
          tweetText,
        )
      ) {
        impactScore += 0.4; // Potentially bullish (accumulation)
      }
    } else {
      // Standard sentiment analysis for other sources
      bullishTerms.forEach((term) => {
        if (tweetText.includes(term)) impactScore += 0.1;
      });

      bearishTerms.forEach((term) => {
        if (tweetText.includes(term)) impactScore -= 0.1;
      });
    }

    // Clamp impact score
    impactScore = Math.max(-1, Math.min(1, impactScore));

    // Calculate an importance score based on engagement metrics
    const engagementScore = item.public_metrics
      ? (item.public_metrics.like_count +
          item.public_metrics.retweet_count * 2 +
          item.public_metrics.quote_count * 1.5 +
          item.public_metrics.reply_count) /
        1000
      : 0;

    // Clamp importance between 0.4 and 0.95
    const importance = Math.min(
      0.95,
      Math.max(0.4, engagementScore * 0.1 + 0.5),
    );

    // Create full news item
    const newsItem: NewsItem = {
      ...(baseItem as any),
      id: `twitter-${item.id}`,
      title:
        item.text.length > 60 ? item.text.substring(0, 57) + "..." : item.text,
      content: item.text,
      summary:
        item.text.length > 150
          ? item.text.substring(0, 147) + "..."
          : item.text,
      url: `https://twitter.com/${item.user.username}/status/${item.id}`,
      image_url: mediaUrls.length > 0 ? mediaUrls[0] : undefined,
      author: `${item.user.name} (@${item.user.username})`,
      author_image_url: item.user.profile_image_url,
      timestamp: this.formatTimestamp(item.created_at),
      published_at: this.formatTimestamp(item.created_at),
      language: "en",
      category: primaryCategory,
      subcategories: hashtags,
      tags: hashtags,
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
        importance: importance,
        credibility: this.reliability * (item.user.verified ? 1.1 : 0.9), // Adjust credibility based on verification
      },
      social_metrics: {
        twitter: {
          mentions: item.entities?.mentions?.length || 0,
          likes: item.public_metrics?.like_count || 0,
          retweets: item.public_metrics?.retweet_count || 0,
          quote_tweets: item.public_metrics?.quote_count || 0,
          sentiment_distribution: {
            positive: impactScore > 0 ? 0.6 : 0.2,
            negative: impactScore < 0 ? 0.6 : 0.2,
            neutral: impactScore === 0 ? 0.6 : 0.2,
          },
          influential_mentions:
            item.entities?.mentions?.map((m) => ({
              username: m.username,
              followers: 0, // Not available without additional API calls
              tweet_url: `https://twitter.com/${m.username}`,
              tweet_text: "",
              profile_image: "",
            })) || [],
          trending_hashtags: hashtags,
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
        total_engagement:
          (item.public_metrics?.like_count || 0) +
          (item.public_metrics?.retweet_count || 0) +
          (item.public_metrics?.quote_count || 0) +
          (item.public_metrics?.reply_count || 0),
        engagement_trend: 0,
        total_reach: item.user.followers_count,
        engagement_rate:
          item.user.followers_count > 0
            ? ((item.public_metrics?.like_count || 0) +
                (item.public_metrics?.retweet_count || 0) +
                (item.public_metrics?.quote_count || 0) +
                (item.public_metrics?.reply_count || 0)) /
              item.user.followers_count
            : 0,
        virality_score:
          ((item.public_metrics?.retweet_count || 0) * 2 +
            (item.public_metrics?.quote_count || 0)) /
          10, // Simple virality score
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
          correlation: 0.7,
          mentioned_in_title: true, // Since title is derived from the same tweet text
          mentioned_in_content: true,
          sentiment_in_context: impactScore,
        };
      }),
      related_news: [],
      fact_checking: {
        verified_by: [this.name],
        accuracy_score: 0.85,
        disputed_claims: [],
      },
      verified: item.user.verified,
      verification_sources: [this.name],
    };

    // Special handling for WhaleAlert
    if (this.sourceConfig.id === "whale-alert") {
      // Extract transaction amount and currency
      const amountMatch = item.text.match(/([0-9,.]+)\s*#([A-Za-z0-9]+)/);

      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
        const symbol = amountMatch[2];

        if (
          !isNaN(amount) &&
          symbol &&
          !newsItem.related_assets.some((a) => a.symbol === symbol)
        ) {
          newsItem.related_assets.push({
            symbol,
            name: symbol,
            correlation: 0.9,
            mentioned_in_title: true,
            mentioned_in_content: true,
            sentiment_in_context: impactScore,
          });
        }

        // Add to affected assets if not already included
        if (!newsItem.impact.affected_assets.includes(symbol)) {
          newsItem.impact.affected_assets.push(symbol);
        }
      }
    }

    return newsItem;
  }

  /**
   * Generate mock data for demonstration
   */
  private generateMockData(
    source: string,
    count: number = 10,
  ): TwitterNewsItem[] {
    const mockItems: TwitterNewsItem[] = [];
    const now = new Date();

    // Common templates for different sources
    const templates: Record<string, string[]> = {
      "whale-alert": [
        "🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 35,000 #BTC (2,168,764,500 USD) transferred from unknown wallet to #Binance",
        "🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 20,000 #ETH (58,712,346 USD) transferred from #Binance to unknown wallet",
        "🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 15,000 #BTC (930,327,500 USD) transferred from unknown wallet to unknown wallet",
        "🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 50,000 #XRP (56,987,500 USD) transferred from #Ripple to unknown wallet",
        "🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 5,000 #ETH (14,678,086 USD) transferred from unknown wallet to #Coinbase",
      ],
      cryptoquant: [
        "ALERT: Bitcoin Exchange Reserve has decreased by 0.5% in the last 24 hours. Accumulation pattern detected. #BTC #Bullish",
        "Ethereum miner reserves at lowest level since 2020 - miners are not selling. Strong #ETH holder sentiment.",
        "Updated Bitcoin Bull Score: 78/100 - Strong on-chain accumulation metrics detected. #BTC",
        "Net outflows from exchanges reached $1.4B in the last 24 hours - highest in 3 months. Whales accumulating. #BTC #Crypto",
        "Stablecoin inflows to exchanges spiking - buying pressure incoming? #USDT #USDC #Crypto",
      ],
      "glassnode-alerts": [
        "#Bitcoin Percent Supply in Profit (7d MA) just reached a 3-month high of 85.249%",
        "#Ethereum Number of Active Addresses (7d MA) just reached a 1-month low of 456,216.385",
        "#Bitcoin Realized HODL Ratio (1d) just reached a 6-month high of 1.481",
        "#Ethereum Exchange Netflow Volume (7d MA) just reached a 2-month low of -$54.2M",
        "#Bitcoin Number of Accumulation Addresses (1d) just reached an all-time high of 814,327",
      ],
      santiment: [
        "📈 According to our NVT model, #Bitcoin is currently undervalued despite price spike. Network activity growing faster than market cap.",
        "🧵 Social volume for #Ethereum at 3-month high while sentiment remains low - historically a good entry opportunity.",
        "📊 DEX volume up 27% this week as #DeFi tokens bounce. Top movers: $UNI, $SUSHI, $CAKE",
        "📉 Development activity for #Cardano at all-time high despite recent price drop - fundamentals remain strong. $ADA",
        "🔍 Whale wallets (>1000 BTC) have accumulated 120K more BTC in the last 30 days - strong confidence signal. #BTC",
      ],
    };

    // Use appropriate templates for each source
    const sourceTemplates = templates[source] || templates["glassnode-alerts"];

    for (let i = 0; i < count; i++) {
      const template = sourceTemplates[i % sourceTemplates.length];
      const hoursAgo = i * 2; // Each mock item is 2 hours apart
      const timestamp = new Date(
        now.getTime() - hoursAgo * 60 * 60 * 1000,
      ).toISOString();

      mockItems.push({
        id: `mock-${source}-${i}`,
        text: template,
        created_at: timestamp,
        user: {
          id: `${source}-user`,
          name: this.name,
          username: this.sourceConfig.username,
          profile_image_url: this.logoUrl,
          verified: true,
          followers_count: 500000,
        },
        entities: {
          hashtags:
            template
              .match(/#([a-zA-Z0-9]+)/g)
              ?.map((tag) => ({ tag: tag.substring(1) })) || [],
          urls: [],
          mentions: [],
        },
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 500),
          reply_count: Math.floor(Math.random() * 100),
          like_count: Math.floor(Math.random() * 2000),
          quote_count: Math.floor(Math.random() * 50),
        },
      });
    }

    return mockItems;
  }

  /**
   * Fetch tweets from Twitter API (mock implementation)
   */
  private async fetchTweets(
    query: string,
    count: number = 10,
  ): Promise<TwitterNewsItem[]> {
    if (this.useMockData) {
      return this.generateMockData(this.sourceConfig.id, count);
    }

    try {
      // In a real implementation, this would make a call to the Twitter API
      // Here we return mock data to demonstrate functionality
      const response = await axios.get(this.apiEndpoint, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        params: {
          query: `from:${this.sourceConfig.username} ${query}`,
          max_results: count,
          "tweet.fields":
            "created_at,public_metrics,referenced_tweets,entities",
          "user.fields":
            "verified,profile_image_url,username,name,id,public_metrics",
          "media.fields": "media_key,type,url",
          expansions: "author_id,attachments.media_keys",
        },
      });

      // Process response data
      return response.data.data;
    } catch (error) {
      console.error(
        `Error fetching tweets from ${this.sourceConfig.name}:`,
        error,
      );
      return this.generateMockData(this.sourceConfig.id, count);
    }
  }

  /**
   * Apply filters to tweet items
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

    // Filter by category
    if (filter.categories && filter.categories.length > 0) {
      filtered = filtered.filter((item) =>
        filter.categories!.includes(item.category),
      );
    }

    // Filter by assets
    if (filter.assets && filter.assets.length > 0) {
      filtered = filtered.filter((item) =>
        item.impact.affected_assets.some((asset) =>
          filter.assets!.includes(asset),
        ),
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
   * Build search query based on filter parameters
   */
  private buildSearchQuery(filter?: Partial<NewsFilter>): string {
    let query = "";

    // Add asset-specific filters
    if (filter?.assets && filter.assets.length > 0) {
      filter.assets.forEach((asset) => {
        query += ` OR #${asset}`;
      });
      query = query.substring(4); // Remove initial " OR "
    }

    // Add keywords
    if (filter?.keywords && filter.keywords.length > 0) {
      if (query) query += " ";
      query += filter.keywords.join(" OR ");
    }

    return query || ""; // Return empty string if no filters
  }

  /**
   * Fetch news from Twitter source
   */
  async fetchNews(filter?: Partial<NewsFilter>): Promise<NewsItem[]> {
    try {
      const query = this.buildSearchQuery(filter);
      const count = filter?.limit || 10;

      // Fetch tweets
      const tweets = await this.fetchTweets(query, count);

      // Convert to standard format
      const newsItems = tweets.map((tweet) => this.convertToNewsItem(tweet));

      // Apply additional filters
      return this.applyFilters(newsItems, filter);
    } catch (error) {
      console.error(`Error fetching news from ${this.name}:`, error);
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
    try {
      const combinedFilter: Partial<NewsFilter> = {
        ...filter,
        searchText: query,
      };

      return this.fetchNews(combinedFilter);
    } catch (error) {
      console.error(`Error searching ${this.name} for "${query}":`, error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific news item
   */
  async getNewsDetails(newsId: string): Promise<NewsItem | null> {
    try {
      // Extract tweet ID from the combined newsId
      const tweetId = newsId.replace("twitter-", "");

      // In a real implementation, fetch the specific tweet
      // For mock data, generate and filter
      const tweets = await this.fetchTweets("", 20);
      const tweet = tweets.find((t) => t.id === tweetId);

      if (!tweet) return null;

      return this.convertToNewsItem(tweet);
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
      supportsRealTimeUpdates: true,
      supportsFullContentAccess: true,
      supportsSentimentAnalysis: false,
      supportsAssetFiltering: true,
      supportsLanguages: ["EN"],
      supportedCategories: [
        "Market",
        "Technology",
        "Regulatory",
        "Security",
        "Adoption",
      ],
      requiresAuthentication: false,
      supportsHistoricalData: true,
      maxHistoricalDays: 7,
      rateLimits: {
        requestsPerMinute: 10,
        requestsPerDay: 500,
      },
    };
  }
}

// Example usage of CryptoNewsWriter with TwitterSourceAdapter
// DO NOT execute directly - this is just example code
/*
function cryptoWriterExample() {
  const writer = new CryptoNewsWriter('./my-crypto-articles');

  // This creates a complete article template
  writer.createArticle(
    'Bitcoin ETF Impact Analysis',  // Your article title
    'Bitcoin ETF approval',         // Topic to research
    ['BTC', 'ETH']                  // Assets to analyze
  ).then(filePath => {
    console.log(`Article saved to: ${filePath}`);
  });

  // Just gather information on a topic
  writer.researchTopic('Ethereum Shanghai upgrade', {
    assets: ['ETH', 'LDO', 'RPL'],
    timeframeHours: 48
  }).then(research => {
    console.log(research.summary);    // Overview of the topic
    console.log(research.keyPoints);  // Main points from news sources
  });

  // See how news is affecting specific assets
  writer.researchMarketImpact(
    'Layer 2 scaling solutions',
    ['ETH', 'MATIC', 'ARBI', 'OP']
  ).then(impact => {
    console.log(`Overall sentiment: ${impact.overallSentiment}`);
  });
}
*/
