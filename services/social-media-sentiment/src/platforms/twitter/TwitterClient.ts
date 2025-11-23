/**
 * =========================================
 * TWITTER CLIENT
 * =========================================
 * Twitter API v2 client for real-time tweet streaming and analysis
 */

import { TwitterApi } from 'twitter-api-v2';
import { Logger } from '../../utils/Logger';
import type { Platform, SubscriptionOptions, SocialMediaPost, PlatformConfig } from '../../types';

export interface TwitterConfig extends PlatformConfig {
  api_keys: {
    bearer_token: string;
    api_key?: string;
    api_secret?: string;
    access_token?: string;
    access_secret?: string;
  };
}

export class TwitterClient {
  private twitter: TwitterApi | null = null;
  private logger: Logger;
  private config: TwitterConfig;
  private isInitialized: boolean = false;
  private activeStreams: Map<string, unknown> = new Map();
  private rateLimitInfo: Map<string, { resetTime: Date; remaining: number }> = new Map();

  constructor(config?: Partial<TwitterConfig>) {
    this.logger = new Logger('TwitterClient');

    this.config = {
      enabled: true,
      api_keys: {
        bearer_token: process.env.TWITTER_BEARER_TOKEN || '',
        api_key: process.env.TWITTER_API_KEY,
        api_secret: process.env.TWITTER_API_SECRET,
        access_token: process.env.TWITTER_ACCESS_TOKEN,
        access_secret: process.env.TWITTER_ACCESS_SECRET
      },
      rate_limits: {
        requests_per_minute: 300,
        requests_per_hour: 50000,
        posts_per_request: 100,
        backoff_strategy: 'exponential'
      },
      retry_config: {
        max_retries: 3,
        base_delay_ms: 1000,
        max_delay_ms: 30000
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      if (!this.config.api_keys.bearer_token) {
        throw new Error('Twitter bearer token is required');
      }

      // Initialize Twitter API client
      this.twitter = new TwitterApi(this.config.api_keys.bearer_token);

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('✅ Twitter client initialized successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to initialize Twitter client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Close all active streams
      for (const [id, stream] of this.activeStreams) {
        try {
          (stream as any).close();
        } catch (error: unknown) {
          this.logger.error(`Failed to close stream ${id}`, error);
        }
      }
      this.activeStreams.clear();

      this.isInitialized = false;
      this.logger.info('✅ Twitter client stopped successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop Twitter client', error);
      throw error;
    }
  }

  async subscribeToKeywords(keywords: string[], _options: SubscriptionOptions = {}): Promise<string> {
    if (!this.isInitialized || !this.twitter) {
      throw new Error('Twitter client is not initialized');
    }

    const subscriptionId = `twitter_keywords_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info(`Setting up Twitter stream for keywords: ${keywords.join(', ')}`);

      // Build the stream rules
      const rules = keywords.map((keyword: string) => ({
        value: keyword,
        tag: `keyword_${keyword.replace(/[^a-zA-Z0-9]/g, '_')}`
      }));

      // Add or update stream rules
      const existingRules = await this.twitter.v2.streamRules();
      if (existingRules.data?.length > 0) {
        await this.twitter.v2.updateStreamRules({
          delete: { ids: existingRules.data.map(rule => rule.id) }
        });
      }

      await this.twitter.v2.updateStreamRules({
        add: rules
      });

      // Start the stream
      const stream = await this.twitter.v2.searchStream({
        'tweet.fields': ['created_at', 'author_id', 'public_metrics', 'lang', 'entities'],
        'user.fields': ['public_metrics', 'verified', 'created_at'],
        'expansions': ['author_id']
      });

      // Set up event handlers
      stream.on('data', async (_tweetData: unknown) => {
        try {
          const tweet = (_tweetData as any).data;
          const includes = (_tweetData as any).includes;

          // Convert to standardized format
          const socialMediaPost = await this.convertTweetToPost(tweet, includes);

          // Emit the post for processing
          this.emit('post', socialMediaPost);

        } catch (error: unknown) {
          this.logger.error('Error processing tweet', error);
        }
      });

      stream.on('error', (error: unknown) => {
        this.logger.error('Twitter stream error', error);
      });

      stream.on('end', () => {
        this.logger.warn('Twitter stream ended');
      });

      // Store the stream
      this.activeStreams.set(subscriptionId, stream);

      this.logger.info(`✅ Twitter keywords subscription created: ${subscriptionId}`);
      return subscriptionId;

    } catch (error: unknown) {
      this.logger.error('❌ Failed to subscribe to Twitter keywords', error);
      throw error;
    }
  }

  async subscribeToTopics(topics: string[], _options: SubscriptionOptions = {}): Promise<string> {
    // For Twitter, topics can be handled similarly to keywords
    // or we can use more sophisticated filtering
    return this.subscribeToKeywords(topics, _options);
  }

  async getUserInfo(userId: string): Promise<unknown> {
    if (!this.isInitialized || !this.twitter) {
      throw new Error('Twitter client is not initialized');
    }

    try {
      const user = await this.twitter.v2.user(userId, {
        'user.fields': ['public_metrics', 'verified', 'created_at', 'location']
      });

      return user.data;

    } catch (error: unknown) {
      this.logger.error(`Failed to get user info for ${userId}`, error);
      throw error;
    }
  }

  async getHistoricalTweets(
    query: string,
    startTime?: Date,
    endTime?: Date,
    maxResults: number = 100
  ): Promise<unknown[]> {
    if (!this.isInitialized || !this.twitter) {
      throw new Error('Twitter client is not initialized');
    }

    try {
      const params: Record<string, unknown> = {
        query,
        max_results: Math.min(maxResults, 100), // Twitter API limit
        'tweet.fields': ['created_at', 'author_id', 'public_metrics', 'lang', 'entities'],
        'user.fields': ['public_metrics', 'verified']
      };

      if (startTime) params.start_time = startTime.toISOString();
      if (endTime) params.end_time = endTime.toISOString();

      const response = await this.twitter.v2.searchRecent(params as any);

      return response.data || [];

    } catch (error: unknown) {
      this.logger.error('Failed to get historical tweets', error);
      throw error;
    }
  }

  async checkRateLimits(): Promise<void> {
    if (!this.isInitialized || !this.twitter) {
      return;
    }

    try {
      // Check rate limit status
      const rateLimitStatus = await (this.twitter!.v2 as any).rateLimitStatus();

      // Update our rate limit tracking
      if (rateLimitStatus.data) {
        for (const [_endpoint, _limits] of Object.entries(rateLimitStatus.data)) {
          const limitInfo = _limits as any;
          if (limitInfo.reset && limitInfo.remaining !== undefined) {
            this.rateLimitInfo.set(_endpoint, {
              resetTime: new Date(limitInfo.reset * 1000),
              remaining: limitInfo.remaining
            });
          }
        }
      }

    } catch (error: unknown) {
      this.logger.error('Failed to check rate limits', error);
    }
  }

  getStatus(): string {
    return this.isInitialized ? 'Connected' : 'Disconnected';
  }

  async getHealth(): Promise<unknown> {
    return {
      status: this.isInitialized ? 'healthy' : 'disconnected',
      active_streams: this.activeStreams.size,
      last_rate_check: new Date(),
      rate_limits: Object.fromEntries(this.rateLimitInfo)
    };
  }

  private async testConnection(): Promise<void> {
    try {
      // Simple API call to test connectivity
      await this.twitter!.v2.me();
      this.logger.info('Twitter API connection test successful');
    } catch (error: unknown) {
      throw new Error(`Twitter API connection failed: ${(error as Error).message}`);
    }
  }

  private async convertTweetToPost(tweet: unknown, includes?: unknown): Promise<SocialMediaPost> {
    // Get author info from includes
    const author = (includes as any)?.users?.find((user: unknown) => (user as any).id === (tweet as any).author_id);

    // Extract hashtags and mentions from entities
    const hashtags = (tweet as any).entities?.hashtags?.map((tag: unknown) => `#${(tag as any).tag}`) || [];
    const mentions = (tweet as any).entities?.mentions?.map((mention: unknown) => `@${(mention as any).username}`) || [];

    // Convert engagement metrics
    const engagement = {
      likes: (tweet as any).public_metrics?.like_count || 0,
      retweets: (tweet as any).public_metrics?.retweet_count || 0,
      replies: (tweet as any).public_metrics?.reply_count || 0,
      views: (tweet as any).public_metrics?.impression_count || 0
    };

    // Build author info
    const authorInfo = {
      id: this.hashUserId((tweet as any).author_id),
      username: (author as any)?.username,
      followers: (author as any)?.public_metrics?.followers_count,
      verified: (author as any)?.verified || false,
      joinDate: (author as any)?.created_at ? new Date((author as any).created_at) : undefined
    };

    return {
      id: (tweet as any).id,
      platform: 'twitter' as Platform,
      content: (tweet as any).text,
      author: authorInfo,
      timestamp: new Date((tweet as any).created_at),
      language: (tweet as any).lang || 'en',
      sentiment: {
        score: 0, // Will be filled by NLP processor
        confidence: 0,
        label: 'neutral' as const
      },
      topics: {
        topics: [],
        confidence: {},
        categories: []
      },
      hashtags,
      mentions,
      urls: (tweet as any).entities?.urls?.map((url: unknown) => (url as any).expanded_url),
      engagement,
      influencer_metrics: (author as any)?.public_metrics?.followers_count > 10000 ? {
        score: Math.min(100, ((author as any).public_metrics.followers_count / 100000) * 100),
        reach: (author as any).public_metrics.followers_count,
        engagement: 0, // Will be calculated
        credibility: (author as any).verified ? 0.9 : 0.7,
        categories: [] // Will be determined by NLP
      } : undefined,
      processed_at: new Date(),
      processing_latency_ms: 0
    };
  }

  private hashUserId(userId: string): string {
    // Simple hash function for user ID anonymization
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Event emitter for posts
  private emit(_event: string, _data: unknown): void {
    // This will be connected to the main monitor's event system
  }

  on(_event: string, _listener: (...args: unknown[]) => void): void {
    // Event listener setup - will be connected to main monitor
  }
}
