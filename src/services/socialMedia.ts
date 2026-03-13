import axios from "axios";
import { config } from "../config/env";
import { ApiKeyManager } from "./apiKeyManager";
import { Cache } from "../utils/cache";
import { SentimentAnalysisService } from "./sentimentAnalysis";
import { SentimentDashboard } from "../components/SentimentVisualizations";

interface TwitterCredentials {
  accessToken: string;
  expiresAt: number;
}

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    created_utc: number;
    score: number;
    num_comments: number;
    permalink: string;
    url: string;
    media?: {
      type: string;
      oembed?: {
        thumbnail_url?: string;
      };
    };
    preview?: {
      images: Array<{
        source: {
          url: string;
        };
      }>;
    };
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
    after?: string;
    before?: string;
  };
}

interface RedditCredentials {
  accessToken: string;
  expiresAt: number;
}

export interface SocialPost {
  id: string;
  platform: "twitter" | "reddit" | "telegram";
  content: string;
  author: string;
  timestamp: string;
  likes: number;
  retweets?: number;
  replies?: number;
  quotes?: number;
  impressions?: number;
  sentiment?: "positive" | "negative" | "neutral";
  url: string;
  media?: {
    type: "image" | "video";
    url: string;
    altText?: string;
    dimensions?: { width: number; height: number };
  }[];
  metadata: {
    hashtags: string[];
    mentions: string[];
    cashtags: string[];
    cryptoContext: string[];
    language: string;
  };
}

interface SearchParams {
  query: string;
  startTime?: string;
  endTime?: string;
  maxResults?: number;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

interface TwitterMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
  duration_ms?: number;
  height?: number;
  width?: number;
}

interface TwitterResponse {
  data: {
    id: string;
    text: string;
    author_id: string;
    created_at: string;
    public_metrics?: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
      quote_count: number;
      impression_count: number;
    };
    entities?: {
      urls?: Array<{
        url: string;
        expanded_url: string;
        media_key?: string;
      }>;
      mentions?: Array<{
        username: string;
      }>;
      hashtags?: Array<{
        tag: string;
      }>;
      cashtags?: Array<{
        tag: string;
      }>;
    };
    attachments?: {
      media_keys: string[];
    };
    context_annotations?: Array<{
      domain: {
        id: string;
        name: string;
        description?: string;
      };
      entity: {
        id: string;
        name: string;
      };
    }>;
    lang: string;
  }[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMedia[];
    tweets?: {
      id: string;
      text: string;
    }[];
  };
  meta?: {
    newest_id: string;
    oldest_id: string;
    result_count: number;
    next_token?: string;
  };
}

interface SentimentAnalysis {
  overall: "positive" | "negative" | "neutral";
  score: number;
  confidence: number;
  posts: SocialPost[];
  trends: {
    technical: number[];
    fundamental: number[];
    social: number[];
  };
}

interface SocialMediaMetrics {
  totalPosts: number;
  averageEngagement: number;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    totalEngagement: number;
    engagementRate: number;
  };
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    overallScore: number;
  };
  topHashtags: Array<{ tag: string; count: number }>;
  topCashtags: Array<{ tag: string; count: number }>;
  topMentions: Array<{ username: string; count: number }>;
  postFrequency: {
    hourly: number[];
    daily: number[];
    weekday: Record<string, number>;
  };
  platforms: Record<string, number>;
  growthRate?: number;
  viralityScore?: number;
}

export class SocialMediaService {
  private static instance: SocialMediaService;
  private apiKeyManager: ApiKeyManager;
  private cache: Cache;
  private twitterCredentials: Map<string, TwitterCredentials>;
  private redditCredentials: Map<string, RedditCredentials>;
  private sentimentAnalysis: SentimentAnalysisService;

  private constructor() {
    this.apiKeyManager = ApiKeyManager.getInstance();
    this.cache = new Cache();
    this.twitterCredentials = new Map();
    this.redditCredentials = new Map();
    this.sentimentAnalysis = SentimentAnalysisService.getInstance();
    this.initializeService();
  }

  public static getInstance(): SocialMediaService {
    if (!SocialMediaService.instance) {
      SocialMediaService.instance = new SocialMediaService();
    }
    return SocialMediaService.instance;
  }

  private async initializeService() {
    // Initialize Twitter API keys
    if (config.api.twitter.apiKeys.length > 0) {
      await this.apiKeyManager.addKeys("twitter", config.api.twitter.apiKeys);
    }
  }

  private async getTwitterAccessToken(apiKey: string): Promise<string> {
    const credentials = this.twitterCredentials.get(apiKey);
    if (credentials && Date.now() < credentials.expiresAt) {
      return credentials.accessToken;
    }

    try {
      const response = await axios.post(
        "https://api.twitter.com/oauth2/token",
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${Buffer.from(apiKey + ":" + config.api.twitter.apiSecret).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const newCredentials: TwitterCredentials = {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + response.data.expires_in * 1000,
      };

      this.twitterCredentials.set(apiKey, newCredentials);
      return newCredentials.accessToken;
    } catch (error) {
      console.error("Error obtaining Twitter access token:", error);
      throw error;
    }
  }

  private async getRedditAccessToken(clientId: string): Promise<string> {
    const credentials = this.redditCredentials.get(clientId);
    if (credentials && Date.now() < credentials.expiresAt) {
      return credentials.accessToken;
    }

    try {
      const response = await axios.post(
        "https://www.reddit.com/api/v1/access_token",
        `grant_type=client_credentials`,
        {
          auth: {
            username: clientId,
            password: config.api.reddit.clientSecret,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const newCredentials: RedditCredentials = {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + response.data.expires_in * 1000,
      };

      this.redditCredentials.set(clientId, newCredentials);
      return newCredentials.accessToken;
    } catch (error) {
      console.error("Error obtaining Reddit access token:", error);
      throw error;
    }
  }

  async searchTweets(params: SearchParams): Promise<SocialPost[]> {
    const cacheKey = `twitter:search:${JSON.stringify(params)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as SocialPost[];

    try {
      const apiKey = await this.apiKeyManager.getNextKey("twitter");
      const accessToken = await this.getTwitterAccessToken(apiKey);

      // Build the query with advanced search operators
      const enhancedQuery = this.buildTwitterQuery(params.query);
      let allTweets: SocialPost[] = [];
      let paginationToken: string | undefined;
      const maxPages = 5; // Limit pagination to avoid rate limits
      let currentPage = 0;

      do {
        const response = await axios.get<TwitterResponse>(
          `${config.api.twitter.baseUrl}/tweets/search/recent`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-User-Agent": "Coinet/1.0.0",
            },
            params: {
              query: enhancedQuery,
              start_time: params.startTime,
              end_time: params.endTime,
              max_results: Math.min(params.maxResults || 100, 100),
              "tweet.fields": [
                "created_at",
                "public_metrics",
                "entities",
                "context_annotations",
                "lang",
              ].join(","),
              expansions: [
                "author_id",
                "attachments.media_keys",
                "referenced_tweets.id",
              ].join(","),
              "user.fields": "username,name,verified,profile_image_url",
              "media.fields": [
                "url",
                "preview_image_url",
                "type",
                "alt_text",
                "duration_ms",
                "height",
                "width",
              ].join(","),
              pagination_token: paginationToken,
            },
          },
        );

        const tweets = this.transformTwitterResponse(response.data);
        allTweets = allTweets.concat(tweets);

        paginationToken = response.data.meta?.next_token;
        currentPage++;

        // Respect rate limits
        if (paginationToken && currentPage < maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } while (
        paginationToken &&
        currentPage < maxPages &&
        allTweets.length < (params.maxResults || 100)
      );

      // Sort by engagement score and limit results
      const sortedTweets = this.sortTweetsByEngagement(allTweets).slice(
        0,
        params.maxResults || 100,
      );

      await this.cache.set(cacheKey, sortedTweets, 300); // Cache for 5 minutes
      return sortedTweets;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        console.error("Twitter rate limit exceeded:", error);
        throw new Error("Twitter rate limit exceeded. Please try again later.");
      }
      console.error("Error searching tweets:", error);
      throw error;
    }
  }

  private buildTwitterQuery(baseQuery: string): string {
    // Add advanced search operators
    const operators = [
      baseQuery,
      "-is:retweet", // Exclude retweets
      "lang:en", // English tweets only
      "-is:reply", // Exclude replies
      "is:safe", // Safe content only
      "-has:links", // Exclude tweets with links (optional)
      "min_faves:5", // Minimum 5 likes for quality
    ];

    // Add crypto-specific context
    if (!baseQuery.toLowerCase().includes("crypto")) {
      operators.push("(crypto OR cryptocurrency OR blockchain)");
    }

    return operators.join(" ");
  }

  private transformTwitterResponse(data: TwitterResponse): SocialPost[] {
    const users = new Map(
      data.includes?.users?.map((user) => [user.id, user]) || [],
    );
    const media = new Map(
      data.includes?.media?.map((m) => [m.media_key, m]) || [],
    );
    const referencedTweets = new Map(
      data.includes?.tweets?.map((t) => [t.id, t]) || [],
    );

    return data.data.map((tweet) => {
      const author = users.get(tweet.author_id);
      const tweetMedia =
        tweet.attachments?.media_keys
          ?.map((key) => {
            const m = media.get(key);
            if (!m) return undefined;

            // Handle different media types
            let mediaUrl = m.url || m.preview_image_url;
            if (!mediaUrl) return undefined;

            const mediaType: "image" | "video" =
              m.type === "photo"
                ? "image"
                : m.type === "video" || m.type === "animated_gif"
                  ? "video"
                  : "image";

            return {
              type: mediaType,
              url: mediaUrl,
              altText: m.alt_text,
              duration: m.duration_ms,
              dimensions:
                m.height && m.width
                  ? { height: m.height, width: m.width }
                  : undefined,
            };
          })
          .filter((m): m is NonNullable<typeof m> => m !== undefined) || [];

      // Extract hashtags and mentions
      const hashtags = tweet.entities?.hashtags?.map((h) => h.tag) || [];
      const mentions = tweet.entities?.mentions?.map((m) => m.username) || [];
      const cashtags = tweet.entities?.cashtags?.map((c) => c.tag) || [];

      // Get crypto-specific context
      const cryptoContext =
        tweet.context_annotations
          ?.filter((ctx) => ctx.domain.name.toLowerCase().includes("crypto"))
          .map((ctx) => ctx.entity.name) || [];

      return {
        id: tweet.id,
        platform: "twitter",
        content: tweet.text,
        author: author ? `${author.name} (@${author.username})` : "Unknown",
        timestamp: tweet.created_at,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        quotes: tweet.public_metrics?.quote_count || 0,
        impressions: tweet.public_metrics?.impression_count,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        media: tweetMedia,
        metadata: {
          hashtags,
          mentions,
          cashtags,
          cryptoContext,
          language: tweet.lang,
        },
      };
    });
  }

  private sortTweetsByEngagement(tweets: SocialPost[]): SocialPost[] {
    return tweets.sort((a, b) => {
      const scoreA = this.calculateEngagementScore(a);
      const scoreB = this.calculateEngagementScore(b);
      return scoreB - scoreA;
    });
  }

  private calculateEngagementScore(tweet: SocialPost): number {
    const likes = tweet.likes || 0;
    const retweets = tweet.retweets || 0;
    const replies = tweet.replies || 0;
    const quotes = (tweet as any).quotes || 0;

    // Weighted engagement score
    return likes * 1 + retweets * 2 + replies * 1.5 + quotes * 1.8;
  }

  async getCoinSentiment(coinId: string): Promise<SentimentAnalysis> {
    const cacheKey = `sentiment:${coinId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as SentimentAnalysis;

    try {
      const searchResults = await this.searchTweets({
        query: `${coinId} crypto OR cryptocurrency OR bitcoin -is:retweet lang:en`,
        maxResults: 100,
      });

      const sentiment =
        await this.sentimentAnalysis.analyzePostsSentiment(searchResults);
      await this.cache.set(cacheKey, sentiment, 900); // Cache for 15 minutes
      return sentiment;
    } catch (error) {
      console.error(`Error getting sentiment for ${coinId}:`, error);
      throw error;
    }
  }

  async searchRedditPosts(params: SearchParams): Promise<SocialPost[]> {
    const cacheKey = `reddit:search:${JSON.stringify(params)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as SocialPost[];

    try {
      const clientId = await this.apiKeyManager.getNextKey("reddit");
      const accessToken = await this.getRedditAccessToken(clientId);

      // Convert the query to a Reddit-friendly format
      const subreddits = ["CryptoCurrency", "Bitcoin", "CryptoMarkets"];
      const timeFilter = this.getRedditTimeFilter(params.startTime);

      const allPosts: SocialPost[] = [];

      for (const subreddit of subreddits) {
        const response = await axios.get<RedditResponse>(
          `https://oauth.reddit.com/r/${subreddit}/search`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": "Coinet/1.0.0",
            },
            params: {
              q: params.query,
              sort: "relevance",
              t: timeFilter,
              limit: Math.floor(params.maxResults || 100 / subreddits.length),
              restrict_sr: true,
            },
          },
        );

        const posts = this.transformRedditResponse(response.data);
        allPosts.push(...posts);
      }

      // Sort posts by timestamp
      const sortedPosts = allPosts.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      await this.cache.set(cacheKey, sortedPosts, 300); // Cache for 5 minutes
      return sortedPosts;
    } catch (error) {
      console.error("Error searching Reddit posts:", error);
      throw error;
    }
  }

  private transformRedditResponse(data: RedditResponse): SocialPost[] {
    return data.data.children.map((post) => {
      const media: { type: "image" | "video"; url: string }[] = [];

      // Handle image/video media
      if (post.data.media?.oembed?.thumbnail_url) {
        media.push({
          type: "image",
          url: post.data.media.oembed.thumbnail_url,
        });
      } else if (post.data.preview?.images[0]?.source.url) {
        media.push({
          type: "image",
          url: post.data.preview.images[0].source.url.replace(/&amp;/g, "&"),
        });
      }

      // Extract hashtags from title and content
      const combinedText = `${post.data.title} ${post.data.selftext}`;
      const hashtags = this.extractHashtags(combinedText);
      const cashtags = this.extractCashtags(combinedText);
      const cryptoTerms = this.extractCryptoTerms(combinedText);

      return {
        id: post.data.id,
        platform: "reddit",
        content: `${post.data.title}\n\n${post.data.selftext}`.trim(),
        author: post.data.author,
        timestamp: new Date(post.data.created_utc * 1000).toISOString(),
        likes: post.data.score,
        replies: post.data.num_comments,
        url: `https://reddit.com${post.data.permalink}`,
        media: media.length > 0 ? media : undefined,
        metadata: {
          hashtags,
          mentions: this.extractMentions(combinedText),
          cashtags,
          cryptoContext: cryptoTerms,
          language: "en", // Assuming English as default
        },
      };
    });
  }

  // Helper methods for extracting entities from text
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = text.match(hashtagRegex) || [];
    return matches.map((tag) => tag.substring(1));
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /(?:^|\s)@([a-zA-Z0-9_]+)/g;
    const matches = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  private extractCashtags(text: string): string[] {
    const cashtagRegex = /\$([A-Z]{2,5})/g;
    const matches = text.match(cashtagRegex) || [];
    return matches.map((tag) => tag.substring(1));
  }

  private extractCryptoTerms(text: string): string[] {
    const lowerText = text.toLowerCase();
    const cryptoTerms = [
      "bitcoin",
      "ethereum",
      "blockchain",
      "crypto",
      "nft",
      "defi",
      "altcoin",
      "token",
    ];
    return cryptoTerms.filter((term) => lowerText.includes(term));
  }

  private getRedditTimeFilter(startTime?: string): string {
    if (!startTime) return "week";

    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const diffHours = (now - start) / (1000 * 60 * 60);

    if (diffHours <= 24) return "day";
    if (diffHours <= 168) return "week";
    if (diffHours <= 720) return "month";
    return "year";
  }

  // Future methods for other platforms
  async searchTelegramMessages(params: SearchParams): Promise<SocialPost[]> {
    const isDev = process.env.NODE_ENV !== 'production';
    const useMock = process.env.SOCIAL_USE_MOCK === 'true';

    if (!isDev && !useMock) {
      return [];
    }

    try {
      const mockData: SocialPost[] = [
        {
          id: 'tg_' + Date.now(),
          platform: 'telegram',
          content: `Sample Telegram data for ${params.query}`,
          author: 'telegram_user',
          timestamp: new Date().toISOString(),
          likes: 0,
          retweets: 0,
          replies: 0,
          quotes: 0,
          impressions: 0,
          sentiment: 'neutral',
          url: 'https://example.com',
          media: [],
          metadata: {
            hashtags: [],
            mentions: [],
            cashtags: [],
            cryptoContext: [],
            language: 'en'
          }
        }
      ];

      // this.metrics.incrementCounter('social.telegram.search.success'); // Assuming metrics and logger are available
      // this.metrics.recordHistogram('social.telegram.search.duration', Date.now() - startTime);

      // this.logger.info('Telegram search completed (mock)', {
      //   query: params.query,
      //   resultsCount: mockData.length,
      //   duration: Date.now() - startTime
      // });

      return mockData;

    } catch (error) {
      // this.metrics.incrementCounter('social.telegram.search.error'); // Assuming metrics and logger are available
      // this.errorManager.handleError(error as Error, { // Assuming errorManager is available
      //   operation: 'searchTelegramMessages',
      //   query: params.query
      // });

      // Return empty array on error
      return [];
    }
  }

  async searchDiscordMessages(params: SearchParams): Promise<SocialPost[]> {
    const isDev = process.env.NODE_ENV !== 'production';
    const useMock = process.env.SOCIAL_USE_MOCK === 'true';

    if (!isDev && !useMock) {
      return [];
    }

    try {
      const mockData: SocialPost[] = [
        {
          id: 'discord_' + Date.now(),
          platform: 'discord',
          content: `Sample Discord data for ${params.query}`,
          author: 'discord_user',
          timestamp: new Date().toISOString(),
          likes: 0,
          retweets: 0,
          replies: 0,
          quotes: 0,
          impressions: 0,
          sentiment: 'neutral',
          url: 'https://example.com',
          media: [],
          metadata: {
            hashtags: [],
            mentions: [],
            cashtags: [],
            cryptoContext: [],
            language: 'en'
          }
        }
      ];
      return mockData;
    } catch (error) {
      // this.metrics.incrementCounter('social.discord.search.error'); // Assuming metrics and logger are available
      // this.errorManager.handleError(error as Error, { // Assuming errorManager is available
      //   operation: 'searchDiscordMessages',
      //   query: params.query
      // });

      return [];
    }
  }

  async searchYouTubeComments(params: SearchParams): Promise<SocialPost[]> {
    const isDev = process.env.NODE_ENV !== 'production';
    const useMock = process.env.SOCIAL_USE_MOCK === 'true';

    if (!isDev && !useMock) {
      return [];
    }

    try {
      const mockData: SocialPost[] = [
        {
          id: 'youtube_' + Date.now(),
          platform: 'youtube',
          content: `Sample YouTube comment for ${params.query}`,
          author: 'youtube_user',
          timestamp: new Date().toISOString(),
          likes: 0,
          retweets: 0,
          replies: 0,
          quotes: 0,
          impressions: 0,
          sentiment: 'neutral',
          url: 'https://example.com',
          media: [],
          metadata: {
            hashtags: [],
            mentions: [],
            cashtags: [],
            cryptoContext: [],
            language: 'en'
          }
        }
      ];
      return mockData;
    } catch (error) {
      // this.metrics.incrementCounter('social.youtube.search.error'); // Assuming metrics and logger are available
      // this.errorManager.handleError(error as Error, { // Assuming errorManager is available
      //   operation: 'searchYouTubeComments',
      //   query: params.query
      // });

      return [];
    }
  }

  /**
   * Get aggregated social sentiment for a specific topic/coin
   */
  async getAggregatedSentiment(query: string, platforms: string[] = ['twitter', 'reddit']): Promise<{
    overall: 'positive' | 'negative' | 'neutral';
    breakdown: Record<string, {
      sentiment: 'positive' | 'negative' | 'neutral';
      confidence: number;
      volume: number;
    }>;
    totalPosts: number;
    timeRange: string;
  }> {
    const startTime = Date.now();

    try {
      const params: SearchParams = {
        query,
        limit: 100,
        maxDaysBack: 7
      };

      // Get data from all requested platforms
      const promises = platforms.map(platform => {
        switch (platform) {
          case 'twitter':
            return this.searchTweets(params);
          case 'reddit':
            return this.searchRedditPosts(params);
          case 'telegram':
            return this.searchTelegramMessages(params);
          case 'discord':
            return this.searchDiscordMessages(params);
          case 'youtube':
            return this.searchYouTubeComments(params);
          default:
            return Promise.resolve([]);
        }
      });

      const results = await Promise.all(promises);
      const allPosts = results.flat();

      // Calculate sentiment breakdown
      const breakdown: Record<string, {
        sentiment: 'positive' | 'negative' | 'neutral';
        confidence: number;
        volume: number;
      }> = {};

      let totalPositive = 0;
      let totalNegative = 0;
      let totalNeutral = 0;

      platforms.forEach((platform, index) => {
        const platformPosts = results[index];
        const positive = platformPosts.filter(p => p.sentiment === 'positive').length;
        const negative = platformPosts.filter(p => p.sentiment === 'negative').length;
        const neutral = platformPosts.filter(p => p.sentiment === 'neutral').length;

        const total = platformPosts.length;
        let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';

        if (positive > negative && positive > neutral) {
          sentiment = 'positive';
        } else if (negative > positive && negative > neutral) {
          sentiment = 'negative';
        }

        breakdown[platform] = {
          sentiment,
          confidence: total > 0 ? Math.max(positive, negative, neutral) / total : 0,
          volume: total
        };

        totalPositive += positive;
        totalNegative += negative;
        totalNeutral += neutral;
      });

      // Calculate overall sentiment
      let overall: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (totalPositive > totalNegative && totalPositive > totalNeutral) {
        overall = 'positive';
      } else if (totalNegative > totalPositive && totalNegative > totalNeutral) {
        overall = 'negative';
      }

      // this.metrics.incrementCounter('social.sentiment.aggregate.success'); // Assuming metrics and logger are available
      // this.metrics.recordHistogram('social.sentiment.aggregate.duration', Date.now() - startTime);

      // this.logger.info('Aggregated sentiment analysis completed', {
      //   query,
      //   platforms,
      //   totalPosts: allPosts.length,
      //   overall,
      //   duration: Date.now() - startTime
      // });

      return {
        overall,
        breakdown,
        totalPosts: allPosts.length,
        timeRange: `${params.maxDaysBack} days`
      };

    } catch (error) {
      // this.metrics.incrementCounter('social.sentiment.aggregate.error'); // Assuming metrics and logger are available
      // this.errorManager.handleError(error as Error, { // Assuming errorManager is available
      //   operation: 'getAggregatedSentiment',
      //   query,
      //   platforms: platforms.join(',')
      // });

      // Return neutral sentiment on error
      return {
        overall: 'neutral',
        breakdown: {},
        totalPosts: 0,
        timeRange: '0 days'
      };
    }
  }

  /**
   * Get trending topics across all platforms
   */
  async getTrendingTopics(limit: number = 10): Promise<Array<{
    topic: string;
    volume: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    platforms: string[];
    growth: number; // percentage growth in last 24h
  }>> {
    const isDev = process.env.NODE_ENV !== 'production';
    const useMock = process.env.SOCIAL_USE_MOCK === 'true';

    if (!isDev && !useMock) {
      return [];
    }

    try {
      const mockTrending = [
        {
          topic: 'Bitcoin',
          volume: 15420,
          sentiment: 'positive' as const,
          platforms: ['twitter', 'reddit', 'telegram'],
          growth: 12.5
        },
        {
          topic: 'Ethereum',
          volume: 12350,
          sentiment: 'neutral' as const,
          platforms: ['twitter', 'reddit', 'discord'],
          growth: 8.3
        },
        {
          topic: 'DeFi',
          volume: 8900,
          sentiment: 'positive' as const,
          platforms: ['twitter', 'reddit'],
          growth: 15.7
        },
        {
          topic: 'NFT',
          volume: 6750,
          sentiment: 'negative' as const,
          platforms: ['twitter', 'discord'],
          growth: -5.2
        },
        {
          topic: 'Solana',
          volume: 5400,
          sentiment: 'positive' as const,
          platforms: ['twitter', 'reddit', 'telegram'],
          growth: 22.1
        }
      ];

      // this.metrics.incrementCounter('social.trending.success'); // Assuming metrics and logger are available
      // this.metrics.recordHistogram('social.trending.duration', Date.now() - startTime);

      // this.logger.info('Trending topics retrieved', {
      //   count: mockTrending.length,
      //   duration: Date.now() - startTime
      // });

      return mockTrending.slice(0, limit);

    } catch (error) {
      // this.metrics.incrementCounter('social.trending.error'); // Assuming metrics and logger are available
      // this.errorManager.handleError(error as Error, { // Assuming errorManager is available
      //   operation: 'getTrendingTopics',
      //   limit
      // });

      return [];
    }
  }

  /**
   * Get influencer mentions for a specific topic
   */
  async getInfluencerMentions(topic: string, limit: number = 20): Promise<Array<{
    influencer: string;
    platform: string;
    followers: number;
    post: SocialPost;
    influence_score: number;
  }>> {
    const isDev = process.env.NODE_ENV !== 'production';
    const useMock = process.env.SOCIAL_USE_MOCK === 'true';

    if (!isDev && !useMock) {
      return [];
    }

    try {
      const mockInfluencers = [
        {
          influencer: 'elonmusk',
          platform: 'twitter',
          followers: 150000000,
          post: {
            id: 'tweet_123',
            platform: 'twitter',
            content: `Thoughts on ${topic}...`,
            author: 'elonmusk',
            timestamp: new Date().toISOString(),
            likes: 0,
            retweets: 0,
            replies: 0,
            quotes: 0,
            impressions: 0,
            sentiment: 'positive' as const,
            url: 'https://example.com',
            media: [],
            metadata: {
              hashtags: [],
              mentions: [],
              cashtags: [],
              cryptoContext: [],
              language: 'en'
            }
          },
          influence_score: 95
        },
        {
          influencer: 'crypto_analyst',
          platform: 'twitter',
          followers: 500000,
          post: {
            id: 'tweet_456',
            platform: 'twitter',
            content: `Analysis of ${topic} trends...`,
            author: 'crypto_analyst',
            timestamp: new Date().toISOString(),
            likes: 0,
            retweets: 0,
            replies: 0,
            quotes: 0,
            impressions: 0,
            sentiment: 'neutral' as const,
            url: 'https://example.com',
            media: [],
            metadata: {
              hashtags: [],
              mentions: [],
              cashtags: [],
              cryptoContext: [],
              language: 'en'
            }
          },
          influence_score: 78
        }
      ];

      // this.metrics.incrementCounter('social.influencers.success'); // Assuming metrics and logger are available
      // this.metrics.recordHistogram('social.influencers.duration', Date.now() - startTime);

      // this.logger.info('Influencer mentions retrieved', {
      //   topic,
      //   count: mockInfluencers.length,
      //   duration: Date.now() - startTime
      // });

      return mockInfluencers.slice(0, limit);

    } catch (error) {
      // this.metrics.incrementCounter('social.influencers.error'); // Assuming metrics and logger are available
      // this.errorManager.handleError(error as Error, { // Assuming errorManager is available
      //   operation: 'getInfluencerMentions',
      //   topic
      // });

      return [];
    }
  }

  // Add new methods for comprehensive social media analytics

  /**
   * Generate comprehensive social media analytics from a collection of posts
   */
  async analyzePostsMetrics(
    posts: SocialPost[],
    timeframe: "day" | "week" | "month" = "week",
  ): Promise<SocialMediaMetrics> {
    // Basic metrics
    const totalPosts = posts.length;
    if (totalPosts === 0) {
      throw new Error("No posts available for analysis");
    }

    // Platform distribution
    const platforms = posts.reduce(
      (acc, post) => {
        acc[post.platform] = (acc[post.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Engagement metrics
    const totalLikes = posts.reduce((acc, post) => acc + (post.likes || 0), 0);
    const totalShares = posts.reduce(
      (acc, post) => acc + (post.retweets || 0),
      0,
    );
    const totalComments = posts.reduce(
      (acc, post) => acc + (post.replies || 0),
      0,
    );
    const totalEngagement = totalLikes + totalShares + totalComments;
    const averageEngagement = totalEngagement / totalPosts;
    const engagementRate =
      totalEngagement /
      posts.reduce((acc, post) => {
        // Calculate potential reach based on platform and follower estimates
        return acc + (post.impressions || 100); // Default to 100 if impressions not available
      }, 0);

    // Sentiment analysis
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    const sentimentScores = await Promise.all(
      posts.map((post) =>
        this.sentimentAnalysis.analyzeSentiment(post.content),
      ),
    );

    sentimentScores.forEach((score) => {
      if (score.score > 0.2) sentimentCounts.positive++;
      else if (score.score < -0.2) sentimentCounts.negative++;
      else sentimentCounts.neutral++;
    });

    const overallSentimentScore =
      sentimentScores.reduce((acc, score) => acc + score.score, 0) /
      sentimentScores.length;

    // Extract and count hashtags, cashtags, mentions
    const hashtagsMap = new Map<string, number>();
    const cashtagsMap = new Map<string, number>();
    const mentionsMap = new Map<string, number>();

    posts.forEach((post) => {
      post.metadata?.hashtags.forEach((tag) => {
        hashtagsMap.set(tag, (hashtagsMap.get(tag) || 0) + 1);
      });

      post.metadata?.cashtags.forEach((tag) => {
        cashtagsMap.set(tag, (cashtagsMap.get(tag) || 0) + 1);
      });

      post.metadata?.mentions.forEach((user) => {
        mentionsMap.set(user, (mentionsMap.get(user) || 0) + 1);
      });
    });

    // Sort by count and limit to top 10
    const topHashtags = Array.from(hashtagsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const topCashtags = Array.from(cashtagsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const topMentions = Array.from(mentionsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([username, count]) => ({ username, count }));

    // Post frequency analysis
    const postDates = posts.map((post) => new Date(post.timestamp));
    const hourCounts = Array(24).fill(0);
    const dayCounts = Array(30).fill(0); // For month view
    const weekdayCounts: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    postDates.forEach((date) => {
      const hour = date.getHours();
      hourCounts[hour]++;

      const day = Math.min(
        29,
        Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)),
      );
      if (day >= 0 && day < 30) {
        dayCounts[day]++;
      }

      const weekday = weekdays[date.getDay()];
      weekdayCounts[weekday]++;
    });

    // Calculate virality score - ratio of shares to total engagement
    const viralityScore = totalShares / (totalEngagement || 1);

    // Calculate weekly growth rate if enough data points
    let growthRate: number | undefined;
    if (dayCounts.length >= 14) {
      const week1 = dayCounts.slice(7, 14).reduce((a, b) => a + b, 0);
      const week2 = dayCounts.slice(0, 7).reduce((a, b) => a + b, 0);
      growthRate = ((week2 - week1) / (week1 || 1)) * 100;
    }

    return {
      totalPosts,
      averageEngagement,
      engagement: {
        likes: totalLikes,
        shares: totalShares,
        comments: totalComments,
        totalEngagement,
        engagementRate,
      },
      sentiment: {
        positive: sentimentCounts.positive,
        neutral: sentimentCounts.neutral,
        negative: sentimentCounts.negative,
        overallScore: overallSentimentScore,
      },
      topHashtags,
      topCashtags,
      topMentions,
      postFrequency: {
        hourly: hourCounts,
        daily: dayCounts,
        weekday: weekdayCounts,
      },
      platforms,
      growthRate,
      viralityScore,
    };
  }

  /**
   * Compare social media metrics across multiple time periods
   */
  async getComparativeSocialMetrics(
    query: string,
    periods: Array<{ label: string; startTime: string; endTime: string }>,
    platforms: Array<"twitter" | "reddit"> = ["twitter", "reddit"],
  ): Promise<Record<string, SocialMediaMetrics>> {
    const results: Record<string, SocialMediaMetrics> = {};

    for (const period of periods) {
      const allPosts: SocialPost[] = [];

      for (const platform of platforms) {
        let posts: SocialPost[] = [];

        if (platform === "twitter") {
          posts = await this.searchTweets({
            query,
            startTime: period.startTime,
            endTime: period.endTime,
            maxResults: 100,
          });
        } else if (platform === "reddit") {
          posts = await this.searchRedditPosts({
            query,
            startTime: period.startTime,
            endTime: period.endTime,
            maxResults: 100,
          });
        }

        allPosts.push(...posts);
      }

      if (allPosts.length > 0) {
        results[period.label] = await this.analyzePostsMetrics(allPosts);
      }
    }

    return results;
  }

  /**
   * Get social media influence for a specific topic
   */
  async getTopicInfluence(topic: string): Promise<{
    score: number;
    influencers: Array<{
      platform: string;
      author: string;
      postCount: number;
      averageEngagement: number;
      sentiment: number;
      topics: string[];
    }>;
    topPosts: SocialPost[];
    relatedTopics: Array<{ topic: string; count: number }>;
  }> {
    // Fetch posts from all platforms for this topic
    const twitterPosts = await this.searchTweets({
      query: topic,
      maxResults: 200,
    });

    const redditPosts = await this.searchRedditPosts({
      query: topic,
      maxResults: 100,
    });

    const allPosts = [...twitterPosts, ...redditPosts];

    // Find top authors by engagement
    const authorStats = new Map<
      string,
      {
        platform: string;
        author: string;
        posts: SocialPost[];
        totalEngagement: number;
      }
    >();

    allPosts.forEach((post) => {
      const authorKey = `${post.platform}:${post.author}`;
      if (!authorStats.has(authorKey)) {
        authorStats.set(authorKey, {
          platform: post.platform,
          author: post.author,
          posts: [],
          totalEngagement: 0,
        });
      }

      const stats = authorStats.get(authorKey)!;
      stats.posts.push(post);
      stats.totalEngagement +=
        (post.likes || 0) + (post.retweets || 0) + (post.replies || 0);
    });

    // Calculate influencer metrics
    const influencers = await Promise.all(
      Array.from(authorStats.values())
        .filter((stats) => stats.posts.length >= 2)
        .sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 10)
        .map(async (stats) => {
          const sentiments = await Promise.all(
            stats.posts.map((post) =>
              this.sentimentAnalysis.analyzeSentiment(post.content),
            ),
          );

          const averageSentiment =
            sentiments.reduce((acc, s) => acc + s.score, 0) / sentiments.length;

          // Extract common topics from author's posts
          const topics = new Set<string>();
          stats.posts.forEach((post) => {
            post.metadata?.cryptoContext.forEach((ctx) => topics.add(ctx));
            post.metadata?.hashtags
              .filter((tag) => tag.length > 3)
              .forEach((tag) => topics.add(tag));
          });

          return {
            platform: stats.platform,
            author: stats.author,
            postCount: stats.posts.length,
            averageEngagement: stats.totalEngagement / stats.posts.length,
            sentiment: averageSentiment,
            topics: Array.from(topics).slice(0, 5),
          };
        }),
    );

    // Find top posts by engagement
    const topPosts = allPosts
      .sort((a, b) => {
        const engA = (a.likes || 0) + (a.retweets || 0) * 2 + (a.replies || 0);
        const engB = (b.likes || 0) + (b.retweets || 0) * 2 + (b.replies || 0);
        return engB - engA;
      })
      .slice(0, 5);

    // Extract related topics
    const topicCounts = new Map<string, number>();
    allPosts.forEach((post) => {
      // Count hashtags
      post.metadata?.hashtags.forEach((tag) => {
        if (tag.toLowerCase() !== topic.toLowerCase()) {
          topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
        }
      });

      // Count cashtags
      post.metadata?.cashtags.forEach((tag) => {
        topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
      });

      // Count crypto context
      post.metadata?.cryptoContext.forEach((ctx) => {
        if (ctx.toLowerCase() !== topic.toLowerCase()) {
          topicCounts.set(ctx, (topicCounts.get(ctx) || 0) + 1);
        }
      });
    });

    const relatedTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Calculate overall influence score (0-100)
    const totalPosts = allPosts.length;
    const totalEngagement = allPosts.reduce(
      (acc, post) =>
        acc +
        (post.likes || 0) +
        (post.retweets || 0) * 2 +
        (post.replies || 0),
      0,
    );

    const influenceScore = Math.min(
      100,
      Math.round(
        totalPosts * 0.3 +
        (totalEngagement / (totalPosts || 1)) * 0.5 +
        influencers.length * 10 * 0.2,
      ),
    );

    return {
      score: influenceScore,
      influencers,
      topPosts,
      relatedTopics,
    };
  }
}
