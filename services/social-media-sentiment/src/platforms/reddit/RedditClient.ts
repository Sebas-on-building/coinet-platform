/**
 * =========================================
 * REDDIT CLIENT
 * =========================================
 * Reddit API client for post and comment monitoring
 */

import Snooper from 'reddit-snooper';
import { Logger } from '../../utils/Logger';
import type { Platform, SubscriptionOptions, SocialMediaPost, PlatformConfig } from '../../types';

export interface RedditConfig extends PlatformConfig {
  api_keys: {
    client_id: string;
    client_secret: string;
    username?: string;
    password?: string;
  };
}

export class RedditClient {
  private snooper: unknown = null;
  private logger: Logger;
  private config: RedditConfig;
  private isInitialized: boolean = false;
  private activeSubscriptions: Map<string, unknown> = new Map();
  private rateLimitInfo: { resetTime: Date; remaining: number } | null = null;

  constructor(config?: Partial<RedditConfig>) {
    this.logger = new Logger('RedditClient');

    this.config = {
      enabled: true,
      api_keys: {
        client_id: process.env.REDDIT_CLIENT_ID || '',
        client_secret: process.env.REDDIT_CLIENT_SECRET || '',
        username: process.env.REDDIT_USERNAME,
        password: process.env.REDDIT_PASSWORD
      },
      rate_limits: {
        requests_per_minute: 60,
        requests_per_hour: 1000,
        posts_per_request: 100,
        backoff_strategy: 'exponential'
      },
      retry_config: {
        max_retries: 3,
        base_delay_ms: 2000,
        max_delay_ms: 60000
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      if (!this.config.api_keys.client_id || !this.config.api_keys.client_secret) {
        throw new Error('Reddit client ID and secret are required');
      }

      // Initialize Reddit snooper
      this.snooper = new Snooper({
        client_id: this.config.api_keys.client_id,
        client_secret: this.config.api_keys.client_secret,
        username: this.config.api_keys.username,
        password: this.config.api_keys.password,
        user_agent: 'CoinetSocialMediaMonitor/1.0'
      });

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('✅ Reddit client initialized successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to initialize Reddit client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Stop all active subscriptions
      for (const [id, subscription] of this.activeSubscriptions) {
        try {
          if (subscription.stop) {
            subscription.stop();
          }
        } catch (error: unknown) {
          this.logger.error(`Failed to stop subscription ${id}`, error);
        }
      }
      this.activeSubscriptions.clear();

      this.isInitialized = false;
      this.logger.info('✅ Reddit client stopped successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop Reddit client', error);
      throw error;
    }
  }

  async subscribeToKeywords(keywords: string[], options: SubscriptionOptions = {}): Promise<string> {
    if (!this.isInitialized || !this.snooper) {
      throw new Error('Reddit client is not initialized');
    }

    const subscriptionId = `reddit_keywords_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info(`Setting up Reddit monitoring for keywords: ${keywords.join(', ')}`);

      // Reddit snooper for subreddit monitoring
      const snooperConfig = {
        subreddit: keywords.join('+'), // Join keywords as subreddit names
        limit: this.config.rate_limits.posts_per_request,
        polling_frequency: 30000 // 30 seconds
      };

      const redditStream = (this.snooper as any).snooper(snooperConfig);

      redditStream.on('post', async (post: any) => {
        try {
          // Convert to standardized format
          const socialMediaPost = await this.convertRedditPostToPost(post);

          // Emit the post for processing
          this.emit('post', socialMediaPost);

        } catch (error: unknown) {
          this.logger.error('Error processing Reddit post', error);
        }
      });

      redditStream.on('error', (error: unknown) => {
        this.logger.error('Reddit stream error', error);
      });

      // Store the subscription
      this.activeSubscriptions.set(subscriptionId, redditStream);

      this.logger.info(`✅ Reddit keywords subscription created: ${subscriptionId}`);
      return subscriptionId;

    } catch (error: unknown) {
      this.logger.error('❌ Failed to subscribe to Reddit keywords', error);
      throw error;
    }
  }

  async subscribeToTopics(topics: string[], options: SubscriptionOptions = {}): Promise<string> {
    // For Reddit, topics can map to subreddits
    const subreddits = topics.map(topic => {
      // Convert topic to subreddit name (remove spaces, special chars)
      return topic.toLowerCase().replace(/[^a-z0-9]/g, '');
    }).filter(subreddit => subreddit.length > 0);

    return this.subscribeToKeywords(subreddits, options);
  }

  async getSubredditInfo(subreddit: string): Promise<unknown> {
    if (!this.isInitialized || !this.snooper) {
      throw new Error('Reddit client is not initialized');
    }

    try {
      const subredditInfo = await (this.snooper as any).get_subreddit(subreddit);
      return subredditInfo;
    } catch (error: unknown) {
      this.logger.error(`Failed to get subreddit info for ${subreddit}`, error);
      throw error;
    }
  }

  async getUserInfo(username: string): Promise<unknown> {
    if (!this.isInitialized || !this.snooper) {
      throw new Error('Reddit client is not initialized');
    }

    try {
      const userInfo = await (this.snooper as any).get_user(username);
      return userInfo;
    } catch (error: unknown) {
      this.logger.error(`Failed to get user info for ${username}`, error);
      throw error;
    }
  }

  async getPostComments(postId: string): Promise<unknown[]> {
    if (!this.isInitialized || !this.snooper) {
      throw new Error('Reddit client is not initialized');
    }

    try {
      const comments = await (this.snooper as any).get_comments(postId);
      return comments;
    } catch (error: unknown) {
      this.logger.error(`Failed to get comments for post ${postId}`, error);
      throw error;
    }
  }

  async searchPosts(
    query: string,
    subreddit?: string,
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    _limit: number = 25
  ): Promise<unknown[]> {
    if (!this.isInitialized || !this.snooper) {
      throw new Error('Reddit client is not initialized');
    }

    try {
      const searchParams: Record<string, unknown> = {
        query,
        sort,
        limit: Math.min(_limit, 100)
      };

      if (subreddit) {
        searchParams.subreddit = subreddit;
      }

      const results = await (this.snooper as any).search(searchParams);
      return results.posts || [];

    } catch (error: unknown) {
      this.logger.error('Failed to search Reddit posts', error);
      throw error;
    }
  }

  async checkRateLimits(): Promise<void> {
    // Reddit API rate limits are typically handled by the snooper library
    // We can implement custom rate limiting if needed
    this.rateLimitInfo = {
      resetTime: new Date(Date.now() + 60000), // 1 minute from now
      remaining: this.config.rate_limits.requests_per_minute
    };
  }

  getStatus(): string {
    return this.isInitialized ? 'Connected' : 'Disconnected';
  }

  async getHealth(): Promise<unknown> {
    return {
      status: this.isInitialized ? 'healthy' : 'disconnected',
      active_subscriptions: this.activeSubscriptions.size,
      last_rate_check: this.rateLimitInfo?.resetTime || new Date(),
      rate_limits: this.rateLimitInfo
    };
  }

  private async testConnection(): Promise<void> {
    try {
      // Test by getting Reddit's front page (limited request)
      await (this.snooper as any).get_front_page({ limit: 1 });
      this.logger.info('Reddit API connection test successful');
    } catch (error: unknown) {
      throw new Error(`Reddit API connection failed: ${(error as Error).message}`);
    }
  }

  private async convertRedditPostToPost(post: unknown): Promise<SocialMediaPost> {
    // Extract hashtags from title and selftext
    const content = `${(post as any).title} ${(post as any).selftext || ''}`;
    const hashtagRegex = /#[\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];

    // Extract mentions (@username)
    const mentionRegex = /u\/[\w]+/g;
    const mentions = content.match(mentionRegex) || [];

    // Convert engagement metrics
    const engagement = {
      likes: (post as any).score || 0,
      replies: (post as any).num_comments || 0,
      shares: 0, // Reddit doesn't have direct shares
      views: 0   // Not available in basic API
    };

    // Build author info
    const authorInfo = {
      id: this.hashUserId((post as any).author),
      username: (post as any).author,
      followers: 0, // Not available in basic Reddit API
      verified: false, // Reddit doesn't have verification like Twitter
      joinDate: undefined // Not available in basic API
    };

    return {
      id: (post as any).id,
      platform: 'reddit' as Platform,
      content: content,
      author: authorInfo,
      timestamp: new Date((post as any).created_utc * 1000),
      language: 'en', // Reddit API doesn't provide language info
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
      engagement,
      influencer_metrics: (post as any).score > 1000 ? { // High-karma posts
        score: Math.min(100, ((post as any).score / 10000) * 100),
        reach: (post as any).score * 10, // Rough estimate
        engagement: (post as any).num_comments / Math.max(1, (post as any).score),
        credibility: 0.8, // Reddit karma-based credibility
        categories: [(post as any).subreddit]
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
