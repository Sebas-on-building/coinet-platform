/**
 * =========================================
 * TELEGRAM CLIENT
 * =========================================
 * Telegram Bot API client for channel and group monitoring
 */

import { Bot, webhookCallback as _webhookCallback } from 'grammy';
import { Logger } from '../../utils/Logger';
import type { Platform, SubscriptionOptions, SocialMediaPost, PlatformConfig } from '../../types';

export interface TelegramConfig extends PlatformConfig {
  api_keys: {
    bot_token: string;
    webhook_url?: string;
  };
}

export class TelegramClient {
  private bot: Bot | null = null;
  private logger: Logger;
  private config: TelegramConfig;
  private isInitialized: boolean = false;
  private activeSubscriptions: Map<string, unknown> = new Map();
  private rateLimitInfo: { resetTime: Date; remaining: number } | null = null;
  private processedMessages: Set<string> = new Set(); // Deduplication

  constructor(config?: Partial<TelegramConfig>) {
    this.logger = new Logger('TelegramClient');

    this.config = {
      enabled: true,
      api_keys: {
        bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
        webhook_url: process.env.TELEGRAM_WEBHOOK_URL
      },
      rate_limits: {
        requests_per_minute: 30,
        requests_per_hour: 1000,
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
      if (!this.config.api_keys.bot_token) {
        throw new Error('Telegram bot token is required');
      }

      // Initialize Telegram bot
      this.bot = new Bot(this.config.api_keys.bot_token);

      // Set up webhook if URL is provided
      if (this.config.api_keys.webhook_url) {
        await this.bot.api.setWebhook(this.config.api_keys.webhook_url);
      }

      // Set up message handler
      this.setupMessageHandler();

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('✅ Telegram client initialized successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to initialize Telegram client', error);
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

      // Delete webhook if it was set
      if (this.config.api_keys.webhook_url && this.bot) {
        await this.bot.api.deleteWebhook();
      }

      // Stop the bot
      if (this.bot) {
        await this.bot.stop();
      }

      this.processedMessages.clear();
      this.isInitialized = false;
      this.logger.info('✅ Telegram client stopped successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop Telegram client', error);
      throw error;
    }
  }

  async subscribeToKeywords(keywords: string[], options: SubscriptionOptions = {}): Promise<string> {
    if (!this.isInitialized || !this.bot) {
      throw new Error('Telegram client is not initialized');
    }

    const subscriptionId = `telegram_keywords_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info(`Setting up Telegram monitoring for keywords: ${keywords.join(', ')}`);

      // For Telegram, we need to monitor specific channels/groups
      // This is a simplified implementation - in practice, you'd need channel IDs
      const subscription = {
        id: subscriptionId,
        keywords,
        options,
        stop: () => {
          this.logger.info(`Stopped Telegram subscription: ${subscriptionId}`);
        }
      };

      this.activeSubscriptions.set(subscriptionId, subscription);
      this.logger.info(`✅ Telegram keywords subscription created: ${subscriptionId}`);
      return subscriptionId;

    } catch (error: unknown) {
      this.logger.error('❌ Failed to subscribe to Telegram keywords', error);
      throw error;
    }
  }

  async subscribeToTopics(topics: string[], options: SubscriptionOptions = {}): Promise<string> {
    // For Telegram, topics can map to channel names or topics within groups
    return this.subscribeToKeywords(topics, options);
  }

  async joinChannel(channelId: string | number): Promise<void> {
    if (!this.isInitialized || !this.bot) {
      throw new Error('Telegram client is not initialized');
    }

    try {
      // Note: Bots can't actually join channels without being added by an admin
      // This is a placeholder for the actual implementation
      this.logger.info(`Attempting to join Telegram channel: ${channelId}`);

      // In a real implementation, you'd need to:
      // 1. Get channel info
      // 2. Send join request (if public)
      // 3. Set up message monitoring

    } catch (error: unknown) {
      this.logger.error(`Failed to join channel ${channelId}`, error);
      throw error;
    }
  }

  async getChannelInfo(channelId: string | number): Promise<unknown> {
    if (!this.isInitialized || !this.bot) {
      throw new Error('Telegram client is not initialized');
    }

    try {
      const chat = await this.bot.api.getChat(channelId);
      return chat;
    } catch (error: unknown) {
      this.logger.error(`Failed to get channel info for ${channelId}`, error);
      throw error;
    }
  }

  async getUserInfo(userId: number): Promise<unknown> {
    if (!this.isInitialized || !this.bot) {
      throw new Error('Telegram client is not initialized');
    }

    try {
      const user = await this.bot.api.getChat(userId);
      return user;
    } catch (error: unknown) {
      this.logger.error(`Failed to get user info for ${userId}`, error);
      throw error;
    }
  }

  async sendMessage(chatId: string | number, text: string, options?: unknown): Promise<unknown> {
    if (!this.isInitialized || !this.bot) {
      throw new Error('Telegram client is not initialized');
    }

    try {
      const message = await this.bot.api.sendMessage(chatId, text, options);
      return message;
    } catch (error: unknown) {
      this.logger.error(`Failed to send message to ${chatId}`, error);
      throw error;
    }
  }

  async checkRateLimits(): Promise<void> {
    // Telegram Bot API has rate limits, but they're handled automatically
    // by the grammy library. We can implement custom tracking if needed.
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
      rate_limits: this.rateLimitInfo,
      processed_messages: this.processedMessages.size
    };
  }

  private async testConnection(): Promise<void> {
    try {
      // Test by getting bot info
      if (this.bot) {
        const botInfo = await this.bot.api.getMe();
        this.logger.info(`Connected to Telegram as: ${botInfo.first_name} (@${botInfo.username})`);
      }
    } catch (error: unknown) {
      throw new Error(`Telegram API connection failed: ${(error as Error).message}`);
    }
  }

  private setupMessageHandler(): void {
    if (!this.bot) return;

    this.bot.on('message', async (ctx: unknown) => {
      try {
        const message = (ctx as any).message;

        // Skip if we've already processed this message (deduplication)
        const messageKey = `${message.chat.id}_${message.message_id}`;
        if (this.processedMessages.has(messageKey)) {
          return;
        }
        this.processedMessages.add(messageKey);

        // Convert to standardized format
        const socialMediaPost = await this.convertTelegramMessageToPost(message);

        // Emit the post for processing
        this.emit('post', socialMediaPost);

      } catch (error: unknown) {
        this.logger.error('Error processing Telegram message', error);
      }
    });

    // Handle channel posts
    this.bot.on('channel_post', async (ctx: unknown) => {
      try {
        const message = (ctx as any).channelPost;

        // Skip if we've already processed this message
        const messageKey = `${message.chat.id}_${message.message_id}`;
        if (this.processedMessages.has(messageKey)) {
          return;
        }
        this.processedMessages.add(messageKey);

        // Convert to standardized format
        const socialMediaPost = await this.convertTelegramMessageToPost(message);

        // Emit the post for processing
        this.emit('post', socialMediaPost);

      } catch (error: unknown) {
        this.logger.error('Error processing Telegram channel post', error);
      }
    });
  }

  private async convertTelegramMessageToPost(message: unknown): Promise<SocialMediaPost> {
    // Extract hashtags from message text
    const content = (message as any).text || (message as any).caption || '';
    const hashtagRegex = /#[\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];

    // Extract mentions (@username)
    const mentionRegex = /@[\w]+/g;
    const mentions = content.match(mentionRegex) || [];

    // Convert engagement metrics (Telegram doesn't provide detailed metrics)
    const engagement = {
      likes: 0, // Not available in basic API
      replies: 0, // Not available in basic API
      shares: 0, // Not available in basic API
      views: (message as any).views || 0
    };

    // Build author info
    const authorInfo = {
      id: this.hashUserId((message as any).from?.id?.toString() || 'unknown'),
      username: (message as any).from?.username,
      followers: 0, // Not available in Telegram Bot API
      verified: false, // Telegram doesn't have verification
      joinDate: undefined
    };

    return {
      id: `${(message as any).chat.id}_${(message as any).message_id}`,
      platform: 'telegram' as Platform,
      content: content,
      author: authorInfo,
      timestamp: new Date((message as any).date * 1000),
      language: (message as any).from?.language_code || 'en',
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
      influencer_metrics: undefined, // Telegram doesn't provide follower counts
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
