/**
 * =========================================
 * DISCORD CLIENT
 * =========================================
 * Discord.js client for server and channel monitoring
 */

import { Client, GatewayIntentBits, Events, Message, ChannelType } from 'discord.js';
import { Logger } from '../../utils/Logger';
import type { Platform, SubscriptionOptions, SocialMediaPost, PlatformConfig } from '../../types';

export interface DiscordConfig extends PlatformConfig {
  api_keys: {
    bot_token: string;
    client_id?: string;
    client_secret?: string;
  };
}

export class DiscordClient {
  private client: Client | null = null;
  private logger: Logger;
  private config: DiscordConfig;
  private isInitialized: boolean = false;
  private activeSubscriptions: Map<string, unknown> = new Map();
  private rateLimitInfo: { resetTime: Date; remaining: number } | null = null;
  private processedMessages: Set<string> = new Set(); // Deduplication

  constructor(config?: Partial<DiscordConfig>) {
    this.logger = new Logger('DiscordClient');

    this.config = {
      enabled: true,
      api_keys: {
        bot_token: process.env.DISCORD_BOT_TOKEN || '',
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET
      },
      rate_limits: {
        requests_per_minute: 5, // Discord has strict rate limits for bots
        requests_per_hour: 120,
        posts_per_request: 50,
        backoff_strategy: 'exponential'
      },
      retry_config: {
        max_retries: 3,
        base_delay_ms: 5000,
        max_delay_ms: 60000
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      if (!this.config.api_keys.bot_token) {
        throw new Error('Discord bot token is required');
      }

      // Initialize Discord client with required intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers
        ]
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Login to Discord
      await this.client.login(this.config.api_keys.bot_token);

      // Wait for ready event
      await new Promise((resolve, reject) => {
        this.client!.once('ready', resolve);
        setTimeout(() => reject(new Error('Discord client ready timeout')), 30000);
      });

      this.isInitialized = true;
      this.logger.info('✅ Discord client initialized successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to initialize Discord client', error);
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

      // Destroy the client
      if (this.client) {
        this.client.destroy();
      }

      this.processedMessages.clear();
      this.isInitialized = false;
      this.logger.info('✅ Discord client stopped successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop Discord client', error);
      throw error;
    }
  }

  async subscribeToKeywords(keywords: string[], options: SubscriptionOptions = {}): Promise<string> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Discord client is not initialized');
    }

    const subscriptionId = `discord_keywords_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info(`Setting up Discord monitoring for keywords: ${keywords.join(', ')}`);

      // For Discord, we need to monitor specific channels
      // This is a simplified implementation - in practice, you'd need channel IDs
      const subscription = {
        id: subscriptionId,
        keywords,
        options,
        stop: () => {
          this.logger.info(`Stopped Discord subscription: ${subscriptionId}`);
        }
      };

      this.activeSubscriptions.set(subscriptionId, subscription);
      this.logger.info(`✅ Discord keywords subscription created: ${subscriptionId}`);
      return subscriptionId;

    } catch (error: unknown) {
      this.logger.error('❌ Failed to subscribe to Discord keywords', error);
      throw error;
    }
  }

  async subscribeToTopics(topics: string[], options: SubscriptionOptions = {}): Promise<string> {
    // For Discord, topics can map to channel categories or specific channels
    return this.subscribeToKeywords(topics, options);
  }

  async joinGuild(guildId: string): Promise<void> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Discord client is not initialized');
    }

    try {
      // Note: Bots can't join guilds without being invited
      // This is a placeholder for when the bot is already in the guild
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        throw new Error(`Bot is not a member of guild ${guildId}`);
      }

      this.logger.info(`Bot is already a member of guild: ${guild.name}`);

    } catch (error: unknown) {
      this.logger.error(`Failed to join guild ${guildId}`, error);
      throw error;
    }
  }

  async getChannelInfo(channelId: string): Promise<unknown> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Discord client is not initialized');
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      return channel;
    } catch (error: unknown) {
      this.logger.error(`Failed to get channel info for ${channelId}`, error);
      throw error;
    }
  }

  async getUserInfo(userId: string): Promise<unknown> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Discord client is not initialized');
    }

    try {
      const user = await this.client.users.fetch(userId);
      return user;
    } catch (error: unknown) {
      this.logger.error(`Failed to get user info for ${userId}`, error);
      throw error;
    }
  }

  async sendMessage(channelId: string, content: string): Promise<unknown> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Discord client is not initialized');
    }

    try {
      const channel = await this.client!.channels.fetch(channelId) as { type: ChannelType, send: Function };
      if (!channel || channel.type !== ChannelType.GuildText) {
        throw new Error('Invalid text channel');
      }

      const message = await channel.send(content);
      return message;
    } catch (error: unknown) {
      this.logger.error(`Failed to send message to channel ${channelId}`, error);
      throw error;
    }
  }

  async checkRateLimits(): Promise<void> {
    // Discord has strict rate limits, especially for bots
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
      processed_messages: this.processedMessages.size,
      guilds: this.client?.guilds.cache.size || 0
    };
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on(Events.MessageCreate, async (message: Message) => {
      try {
        // Ignore bot messages and system messages
        if (message.author.bot || message.system) {
          return;
        }

        // Skip if we've already processed this message (deduplication)
        const messageKey = `${message.guild?.id || 'dm'}_${message.channel.id}_${message.id}`;
        if (this.processedMessages.has(messageKey)) {
          return;
        }
        this.processedMessages.add(messageKey);

        // Convert to standardized format
        const socialMediaPost = await this.convertDiscordMessageToPost(message);

        // Emit the post for processing
        this.emit('post', socialMediaPost);

      } catch (error: unknown) {
        this.logger.error('Error processing Discord message', error);
      }
    });

    this.client.on(Events.Error, (error: unknown) => {
      this.logger.error('Discord client error', error);
    });

    // Rate limiting is handled internally by discord.js
  }

  private async convertDiscordMessageToPost(message: Message): Promise<SocialMediaPost> {
    // Extract hashtags from message content
    const content = message.content || '';
    const hashtagRegex = /#[\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];

    // Extract mentions (@username)
    const mentionRegex = /<@!?(\d+)>/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const userId = match[1];
      try {
        const user = await this.client!.users.fetch(userId);
        mentions.push(`@${user.username}`);
      } catch (error) {
        // Skip invalid mentions
      }
    }

    // Convert reactions to engagement
    const reactions: Record<string, number> = {};
    message.reactions.cache.forEach((reaction, emoji) => {
      reactions[emoji] = reaction.count;
    });

    const engagement = {
      likes: 0, // Discord reactions are more complex
      replies: 0, // Not directly available
      shares: 0, // Not applicable for Discord
      reactions
    };

    // Build author info
    const authorInfo = {
      id: this.hashUserId(message.author.id),
      username: message.author.username,
      followers: 0, // Discord doesn't have follower counts like social media
      verified: message.author.bot, // Bots are "verified" in a sense
      joinDate: message.guild?.members.cache.get(message.author.id)?.joinedAt || undefined
    };

    return {
      id: message.id,
      platform: 'discord' as Platform,
      content: content,
      author: authorInfo,
      timestamp: message.createdAt,
      language: 'en', // Discord doesn't provide language info
      sentiment: {
        score: 0, // Will be filled by NLP processor
        confidence: 0,
        label: 'neutral' as const
      },
      topics: {
        topics: [],
        confidence: {},
        categories: [message.channel.type === ChannelType.GuildText ? 'text_channel' : 'dm']
      },
      hashtags,
      mentions,
      engagement,
      influencer_metrics: message.guild?.memberCount && message.guild.memberCount > 1000 ? {
        score: Math.min(100, (message.guild.memberCount / 10000) * 100),
        reach: message.guild.memberCount,
        engagement: 0, // Will be calculated based on reactions
        credibility: 0.8, // Discord server-based credibility
        categories: [(message.channel as { name: string }).name || 'general']
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
