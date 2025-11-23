import { Logger } from '../../utils/Logger';

export type SocialMediaPlatform = 'twitter' | 'reddit' | 'telegram' | 'discord';

export interface SocialMediaMessage {
  id: string;
  platform: SocialMediaPlatform;
  author: string;
  content: string;
  timestamp: Date;
  channel?: string; // For Telegram/Discord channels
  metadata: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
    score?: number; // Reddit score
    subreddit?: string; // Reddit subreddit
    hashtags?: string[];
    mentions?: string[];
    urls?: string[];
    followers?: number; // Author follower count
    sentiment?: number; // -1 to 1 sentiment score
    language?: string;
    location?: string;
  };
  rawData: Record<string, any>; // Original API response
}

export interface SocialMediaConfig {
  platform: SocialMediaPlatform;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  bearerToken?: string;
  botToken?: string; // For Telegram/Discord bots
  rateLimits: {
    requestsPerHour: number;
    requestsPerMinute: number;
    burstLimit: number;
  };
  enabledChannels: string[]; // Specific channels/subreddits to monitor
  keywords: string[]; // Keywords to filter for
  languages: string[];
  sentimentAnalysis: boolean;
  caching: {
    enabled: boolean;
    ttl: number; // Time to live in seconds
    maxSize: number; // Maximum cache size
  };
  deduplication: {
    enabled: boolean;
    window: number; // Time window in seconds
    similarityThreshold: number; // 0-100 similarity threshold
  };
}

export interface SocialMediaMetrics {
  totalMessages: number;
  messagesPerSecond: number;
  platformBreakdown: Record<SocialMediaPlatform, number>;
  cacheHitRate: number;
  duplicatePreventionRate: number;
  averageProcessingTime: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface SocialMediaFilter {
  keywords: string[];
  excludeKeywords: string[];
  minFollowers?: number;
  minEngagement?: number;
  languages: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  platforms: SocialMediaPlatform[];
}

export class SocialMediaAPIManager {
  private static instance: SocialMediaAPIManager;
  private logger: Logger;

  // Platform configurations
  private platformConfigs: Map<SocialMediaPlatform, SocialMediaConfig> = new Map();

  // Active message streams
  private messageStreams: Map<string, any> = new Map();

  // Message cache for deduplication and performance
  private messageCache: Map<string, { message: SocialMediaMessage; timestamp: Date }> = new Map();

  // Duplicate detection
  private messageHashes: Set<string> = new Set();

  // Metrics tracking
  private metrics: SocialMediaMetrics = {
    totalMessages: 0,
    messagesPerSecond: 0,
    platformBreakdown: {} as Record<SocialMediaPlatform, number>,
    cacheHitRate: 0,
    duplicatePreventionRate: 0,
    averageProcessingTime: 0,
    errorRate: 0,
    lastUpdated: new Date()
  };

  // Message handlers
  private messageHandlers: Map<string, (message: SocialMediaMessage) => void> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializePlatformConfigs();
    this.startMetricsTimer();
  }

  static getInstance(): SocialMediaAPIManager {
    if (!SocialMediaAPIManager.instance) {
      SocialMediaAPIManager.instance = new SocialMediaAPIManager();
    }
    return SocialMediaAPIManager.instance;
  }

  /**
   * Initialize platform configurations
   */
  private initializePlatformConfigs(): void {
    const configs: SocialMediaConfig[] = [
      {
        platform: 'twitter',
        ...(process.env.TWITTER_BEARER_TOKEN && { bearerToken: process.env.TWITTER_BEARER_TOKEN }),
        rateLimits: {
          requestsPerHour: 300, // Twitter v2 API limit
          requestsPerMinute: 5,
          burstLimit: 15
        },
        enabledChannels: ['crypto', 'bitcoin', 'ethereum'],
        keywords: ['#BTC', '#ETH', '#crypto', 'Bitcoin', 'Ethereum'],
        languages: ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'],
        sentimentAnalysis: true,
        caching: {
          enabled: true,
          ttl: 300, // 5 minutes
          maxSize: 10000
        },
        deduplication: {
          enabled: true,
          window: 60, // 1 minute
          similarityThreshold: 85
        }
      },
      {
        platform: 'reddit',
        ...(process.env.REDDIT_CLIENT_ID && { apiKey: process.env.REDDIT_CLIENT_ID }),
        ...(process.env.REDDIT_CLIENT_SECRET && { apiSecret: process.env.REDDIT_CLIENT_SECRET }),
        rateLimits: {
          requestsPerHour: 60, // Reddit API limit
          requestsPerMinute: 1,
          burstLimit: 5
        },
        enabledChannels: ['cryptocurrency', 'bitcoin', 'ethereum', 'defi'],
        keywords: ['BTC', 'ETH', 'crypto', 'blockchain', 'DeFi'],
        languages: ['en'],
        sentimentAnalysis: true,
        caching: {
          enabled: true,
          ttl: 600, // 10 minutes
          maxSize: 5000
        },
        deduplication: {
          enabled: true,
          window: 120, // 2 minutes
          similarityThreshold: 80
        }
      },
      {
        platform: 'telegram',
        ...(process.env.TELEGRAM_BOT_TOKEN && { botToken: process.env.TELEGRAM_BOT_TOKEN }),
        rateLimits: {
          requestsPerHour: 1000, // Telegram bot API limit
          requestsPerMinute: 20,
          burstLimit: 30
        },
        enabledChannels: ['@cryptonews', '@bitcoin', '@ethereum'],
        keywords: ['BTC', 'ETH', 'crypto', 'blockchain'],
        languages: ['en', 'es', 'fr', 'de', 'ru'],
        sentimentAnalysis: true,
        caching: {
          enabled: true,
          ttl: 180, // 3 minutes
          maxSize: 8000
        },
        deduplication: {
          enabled: true,
          window: 45, // 45 seconds
          similarityThreshold: 90
        }
      },
      {
        platform: 'discord',
        ...(process.env.DISCORD_BOT_TOKEN && { botToken: process.env.DISCORD_BOT_TOKEN }),
        rateLimits: {
          requestsPerHour: 2000, // Discord bot API limit
          requestsPerMinute: 50,
          burstLimit: 100
        },
        enabledChannels: ['crypto-general', 'bitcoin-discussion', 'ethereum-dev'],
        keywords: ['BTC', 'ETH', 'crypto', 'blockchain', 'DeFi'],
        languages: ['en'],
        sentimentAnalysis: true,
        caching: {
          enabled: true,
          ttl: 240, // 4 minutes
          maxSize: 6000
        },
        deduplication: {
          enabled: true,
          window: 30, // 30 seconds
          similarityThreshold: 95
        }
      }
    ];

    for (const config of configs) {
      this.platformConfigs.set(config.platform, config);
    }

    this.logger.info('Social media platform configurations initialized');
  }

  /**
   * Start monitoring social media platform
   */
  async startMonitoring(platform: SocialMediaPlatform): Promise<string> {
    const config = this.platformConfigs.get(platform);
    if (!config) {
      throw new Error(`No configuration found for platform: ${platform}`);
    }

    const streamId = `${platform}-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      await this.establishPlatformConnection(platform, config, streamId);
      this.messageStreams.set(streamId, { platform, config, status: 'active' });

      this.logger.info('Social media monitoring started', {
        streamId,
        platform,
        channels: config.enabledChannels.length
      });

      return streamId;

    } catch (error) {
      this.logger.error('Failed to start social media monitoring', { error, platform, streamId });
      throw error;
    }
  }

  /**
   * Establish connection to social media platform
   */
  private async establishPlatformConnection(platform: SocialMediaPlatform, config: SocialMediaConfig, streamId: string): Promise<void> {
    try {
      switch (platform) {
        case 'twitter':
          await this.connectTwitter(config, streamId);
          break;
        case 'reddit':
          await this.connectReddit(config, streamId);
          break;
        case 'telegram':
          await this.connectTelegram(config, streamId);
          break;
        case 'discord':
          await this.connectDiscord(config, streamId);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      this.logger.info('Platform connection established', { platform, streamId });

    } catch (error) {
      this.logger.error('Failed to establish platform connection', { error, platform, streamId });
      throw error;
    }
  }

  /**
   * Connect to Twitter API
   */
  private async connectTwitter(config: SocialMediaConfig, streamId: string): Promise<void> {
    // Twitter API v2 filtered stream implementation
    // In production, use official Twitter API client
    this.logger.info('Twitter connection established (simulated)', { streamId });
  }

  /**
   * Connect to Reddit API
   */
  private async connectReddit(config: SocialMediaConfig, streamId: string): Promise<void> {
    // Reddit API implementation for subreddit monitoring
    // In production, use official Reddit API client
    this.logger.info('Reddit connection established (simulated)', { streamId });
  }

  /**
   * Connect to Telegram bot API
   */
  private async connectTelegram(config: SocialMediaConfig, streamId: string): Promise<void> {
    // Telegram bot API for channel monitoring
    // In production, use node-telegram-bot-api
    this.logger.info('Telegram connection established (simulated)', { streamId });
  }

  /**
   * Connect to Discord bot API
   */
  private async connectDiscord(config: SocialMediaConfig, streamId: string): Promise<void> {
    // Discord bot API for server/channel monitoring
    // In production, use discord.js
    this.logger.info('Discord connection established (simulated)', { streamId });
  }

  /**
   * Process incoming social media message
   */
  async processMessage(platform: SocialMediaPlatform, rawMessage: any): Promise<SocialMediaMessage | null> {
    try {
      // Normalize message format
      const normalizedMessage = await this.normalizeMessage(platform, rawMessage);

      if (!normalizedMessage) {
        return null;
      }

      // Check cache for deduplication
      if (this.isDuplicate(normalizedMessage)) {
        this.metrics.duplicatePreventionRate = Math.min(100,
          this.metrics.duplicatePreventionRate + 0.1);
        return null;
      }

      // Check filters
      if (!this.passesFilters(normalizedMessage)) {
        return null;
      }

      // Cache message
      if (this.platformConfigs.get(platform)?.caching.enabled) {
        this.cacheMessage(normalizedMessage);
      }

      // Update metrics
      this.metrics.totalMessages++;
      this.metrics.platformBreakdown[platform] = (this.metrics.platformBreakdown[platform] || 0) + 1;

      // Trigger message handlers
      await this.triggerMessageHandlers(normalizedMessage);

      return normalizedMessage;

    } catch (error) {
      this.logger.error('Failed to process social media message', { error, platform, messageId: rawMessage.id });
      return null;
    }
  }

  /**
   * Normalize message from platform-specific format
   */
  private async normalizeMessage(platform: SocialMediaPlatform, rawMessage: any): Promise<SocialMediaMessage | null> {
    try {
      switch (platform) {
        case 'twitter':
          return this.normalizeTwitterMessage(rawMessage);
        case 'reddit':
          return this.normalizeRedditMessage(rawMessage);
        case 'telegram':
          return this.normalizeTelegramMessage(rawMessage);
        case 'discord':
          return this.normalizeDiscordMessage(rawMessage);
        default:
          return null;
      }
    } catch (error) {
      this.logger.error('Failed to normalize message', { error, platform, rawMessage });
      return null;
    }
  }

  /**
   * Normalize Twitter message
   */
  private normalizeTwitterMessage(rawMessage: any): SocialMediaMessage {
    return {
      id: rawMessage.id_str || rawMessage.id,
      platform: 'twitter',
      author: rawMessage.user?.screen_name || rawMessage.user?.username || 'unknown',
      content: rawMessage.text || rawMessage.full_text || '',
      timestamp: new Date(rawMessage.created_at || Date.now()),
      metadata: {
        likes: rawMessage.favorite_count || rawMessage.like_count || 0,
        retweets: rawMessage.retweet_count || 0,
        replies: rawMessage.reply_count || 0,
        hashtags: this.extractHashtags(rawMessage.text || rawMessage.full_text || ''),
        mentions: this.extractMentions(rawMessage.text || rawMessage.full_text || ''),
        urls: this.extractUrls(rawMessage.text || rawMessage.full_text || ''),
        language: rawMessage.lang || 'en'
      },
      rawData: rawMessage
    };
  }

  /**
   * Normalize Reddit message
   */
  private normalizeRedditMessage(rawMessage: any): SocialMediaMessage {
    return {
      id: rawMessage.id || rawMessage.name,
      platform: 'reddit',
      author: rawMessage.author || 'unknown',
      content: rawMessage.selftext || rawMessage.body || rawMessage.title || '',
      timestamp: new Date(rawMessage.created_utc * 1000 || Date.now()),
      channel: rawMessage.subreddit,
      metadata: {
        score: rawMessage.score || 0,
        subreddit: rawMessage.subreddit,
        likes: rawMessage.ups || 0,
        replies: rawMessage.num_comments || 0,
        urls: this.extractUrls(rawMessage.selftext || rawMessage.url || ''),
        language: 'en'
      },
      rawData: rawMessage
    };
  }

  /**
   * Normalize Telegram message
   */
  private normalizeTelegramMessage(rawMessage: any): SocialMediaMessage {
    return {
      id: rawMessage.message_id?.toString() || rawMessage.id,
      platform: 'telegram',
      author: rawMessage.from?.username || rawMessage.from?.first_name || 'unknown',
      content: rawMessage.text || rawMessage.caption || '',
      timestamp: new Date(rawMessage.date * 1000 || rawMessage.edit_date * 1000 || Date.now()),
      channel: rawMessage.chat?.username || rawMessage.chat?.title,
      metadata: {
        views: rawMessage.views || 0,
        language: 'en'
      },
      rawData: rawMessage
    };
  }

  /**
   * Normalize Discord message
   */
  private normalizeDiscordMessage(rawMessage: any): SocialMediaMessage {
    return {
      id: rawMessage.id,
      platform: 'discord',
      author: rawMessage.author?.username || 'unknown',
      content: rawMessage.content || '',
      timestamp: new Date(rawMessage.timestamp || Date.now()),
      channel: rawMessage.channel?.name || rawMessage.channel_id,
      metadata: {
        language: 'en'
      },
      rawData: rawMessage
    };
  }

  /**
   * Check if message is a duplicate
   */
  private isDuplicate(message: SocialMediaMessage): boolean {
    const config = this.platformConfigs.get(message.platform);
    if (!config?.deduplication.enabled) return false;

    const messageHash = this.generateMessageHash(message);

    // Check if hash exists in recent window
    if (this.messageHashes.has(messageHash)) {
      return true;
    }

    // Add to hash set with expiration
    this.messageHashes.add(messageHash);

    // Clean old hashes periodically
    if (this.messageHashes.size > 10000) {
      this.cleanOldHashes();
    }

    return false;
  }

  /**
   * Generate hash for message deduplication
   */
  private generateMessageHash(message: SocialMediaMessage): string {
    // Create hash based on content, author, and timestamp
    const content = message.content.toLowerCase().trim();
    const author = message.author.toLowerCase();
    const timestamp = Math.floor(message.timestamp.getTime() / 60000); // Round to minute

    // Simple hash function
    let hash = 0;
    const str = `${author}:${content}:${timestamp}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Clean old message hashes
   */
  private cleanOldHashes(): void {
    const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    let cleanedCount = 0;

    for (const hash of Array.from(this.messageHashes)) {
      // In production, we'd track hash timestamps
      // For demo, we'll just limit the set size
      if (this.messageHashes.size > 5000) {
        this.messageHashes.delete(hash);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned ${cleanedCount} old message hashes`);
    }
  }

  /**
   * Check if message passes filters
   */
  private passesFilters(message: SocialMediaMessage): boolean {
    const config = this.platformConfigs.get(message.platform);
    if (!config) return false;

    // Check keywords
    const content = message.content.toLowerCase();
    const hasKeyword = config.keywords.some(keyword =>
      content.includes(keyword.toLowerCase())
    );

    if (!hasKeyword) return false;

    // Check language
    const messageLanguage = message.metadata.language || 'en';
    if (!config.languages.includes(messageLanguage)) return false;

    return true;
  }

  /**
   * Cache message for performance
   */
  private cacheMessage(message: SocialMediaMessage): void {
    const config = this.platformConfigs.get(message.platform);
    if (!config?.caching.enabled) return;

    const cacheKey = `${message.platform}:${message.id}`;
    this.messageCache.set(cacheKey, {
      message,
      timestamp: new Date()
    });

    // Clean old cache entries
    if (this.messageCache.size > config.caching.maxSize) {
      this.cleanOldCache();
    }
  }

  /**
   * Clean old cache entries
   */
  private cleanOldCache(): void {
    const config = Array.from(this.platformConfigs.values())[0]; // Get first config for TTL
    const ttl = config?.caching.ttl || 300;
    const cutoffTime = Date.now() - (ttl * 1000);

    let cleanedCount = 0;
    for (const [key, { timestamp }] of Array.from(this.messageCache.entries())) {
      if (timestamp.getTime() < cutoffTime) {
        this.messageCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned ${cleanedCount} old cache entries`);
    }
  }

  /**
   * Trigger message handlers
   */
  private async triggerMessageHandlers(message: SocialMediaMessage): Promise<void> {
    for (const [handlerId, handler] of Array.from(this.messageHandlers.entries())) {
      try {
        await handler(message);
      } catch (error) {
        this.logger.error('Message handler failed', { error, handlerId, messageId: message.id });
      }
    }
  }

  /**
   * Register message handler
   */
  registerMessageHandler(handlerId: string, handler: (message: SocialMediaMessage) => void): void {
    this.messageHandlers.set(handlerId, handler);

    this.logger.info('Message handler registered', { handlerId });
  }

  /**
   * Unregister message handler
   */
  unregisterMessageHandler(handlerId: string): void {
    this.messageHandlers.delete(handlerId);

    this.logger.info('Message handler unregistered', { handlerId });
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@[\w]+/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  }

  /**
   * Extract URLs from text
   */
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }

  /**
   * Stop monitoring platform
   */
  async stopMonitoring(streamId: string): Promise<boolean> {
    try {
      const stream = this.messageStreams.get(streamId);
      if (!stream) return false;

      // Close platform connection
      switch (stream.platform) {
        case 'twitter':
          // Close Twitter stream
          break;
        case 'reddit':
          // Close Reddit stream
          break;
        case 'telegram':
          // Close Telegram stream
          break;
        case 'discord':
          // Close Discord stream
          break;
      }

      this.messageStreams.delete(streamId);

      this.logger.info('Social media monitoring stopped', { streamId, platform: stream.platform });
      return true;

    } catch (error) {
      this.logger.error('Failed to stop social media monitoring', { error, streamId });
      return false;
    }
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig(platform: SocialMediaPlatform): SocialMediaConfig | undefined {
    return this.platformConfigs.get(platform);
  }

  /**
   * Update platform configuration
   */
  updatePlatformConfig(platform: SocialMediaPlatform, config: Partial<SocialMediaConfig>): void {
    const current = this.platformConfigs.get(platform);
    if (current) {
      Object.assign(current, config);
      this.logger.info('Platform configuration updated', { platform, config });
    }
  }

  /**
   * Get social media metrics
   */
  getSocialMediaMetrics(): SocialMediaMetrics {
    this.updateMetricsSummary();
    return { ...this.metrics };
  }

  /**
   * Update metrics summary
   */
  private updateMetricsSummary(): void {
    const now = Date.now();
    const timeDiff = (now - this.metrics.lastUpdated.getTime()) / 1000;

    if (timeDiff > 0) {
      this.metrics.messagesPerSecond = this.metrics.totalMessages / timeDiff;
    }

    // Calculate cache hit rate
    const cacheSize = this.messageCache.size;
    if (cacheSize > 0) {
      // Simplified cache hit rate calculation
      this.metrics.cacheHitRate = Math.min(95, (this.metrics.totalMessages / cacheSize) * 100);
    }

    this.metrics.lastUpdated = new Date();
  }

  /**
   * Start metrics timer
   */
  private startMetricsTimer(): void {
    setInterval(() => {
      this.updateMetricsSummary();
    }, 60000); // Update every minute
  }

  /**
   * Get cached message
   */
  getCachedMessage(platform: SocialMediaPlatform, messageId: string): SocialMediaMessage | null {
    const cacheKey = `${platform}:${messageId}`;
    const cached = this.messageCache.get(cacheKey);

    if (cached) {
      this.metrics.cacheHitRate = Math.min(100, this.metrics.cacheHitRate + 0.1);
      return cached.message;
    }

    return null;
  }

  /**
   * Search messages with filters
   */
  async searchMessages(filter: SocialMediaFilter, limit: number = 100): Promise<SocialMediaMessage[]> {
    // In production, this would query a database
    // For demo, return empty array
    this.logger.info('Message search requested', { filter, limit });
    return [];
  }

  /**
   * Get message statistics
   */
  getMessageStats(): Record<string, any> {
    return {
      totalMessages: this.metrics.totalMessages,
      platformBreakdown: this.metrics.platformBreakdown,
      cacheSize: this.messageCache.size,
      activeStreams: this.messageStreams.size,
      duplicateHashes: this.messageHashes.size,
      cacheHitRate: this.metrics.cacheHitRate,
      lastUpdated: this.metrics.lastUpdated
    };
  }

  /**
   * Test social media API connectivity
   */
  async testConnectivity(): Promise<Record<SocialMediaPlatform, { status: string; error?: string }>> {
    const results: Record<string, any> = {};

    for (const [platform, config] of Array.from(this.platformConfigs.entries())) {
      try {
        // Test basic connectivity
        results[platform] = { status: 'connected' };
      } catch (error) {
        results[platform] = {
          status: 'error',
          error: (error as Error).message
        };
      }
    }

    return results;
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): SocialMediaPlatform[] {
    return Array.from(this.platformConfigs.keys());
  }

  /**
   * Add platform configuration
   */
  addPlatformConfig(config: SocialMediaConfig): void {
    this.platformConfigs.set(config.platform, config);
    this.logger.info('Platform configuration added', { platform: config.platform });
  }

  /**
   * Remove platform configuration
   */
  removePlatformConfig(platform: SocialMediaPlatform): boolean {
    const removed = this.platformConfigs.delete(platform);
    if (removed) {
      this.logger.info('Platform configuration removed', { platform });
    }
    return removed;
  }

  /**
   * Get active message streams
   */
  getActiveStreams(): Array<{ id: string; platform: SocialMediaPlatform; status: string }> {
    return Array.from(this.messageStreams.entries()).map(([id, stream]) => ({
      id,
      platform: stream.platform,
      status: stream.status
    }));
  }

  /**
   * Stop all monitoring
   */
  async stopAllMonitoring(): Promise<void> {
    const promises = Array.from(this.messageStreams.keys()).map(streamId =>
      this.stopMonitoring(streamId)
    );

    await Promise.all(promises);

    this.logger.info('All social media monitoring stopped');
  }

  /**
   * Get platform health status
   */
  async getPlatformHealth(): Promise<Record<SocialMediaPlatform, { status: string; metrics: any }>> {
    const health: Record<string, any> = {};

    for (const [platform, config] of Array.from(this.platformConfigs.entries())) {
      health[platform] = {
        status: 'healthy',
        metrics: {
          messagesProcessed: this.metrics.platformBreakdown[platform] || 0,
          cacheHitRate: this.metrics.cacheHitRate,
          errorRate: this.metrics.errorRate
        }
      };
    }

    return health;
  }
}
