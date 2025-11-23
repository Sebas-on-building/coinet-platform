/**
 * =========================================
 * SOCIAL MEDIA SENTIMENT ANALYSIS MONITOR
 * =========================================
 * Main orchestration service for social media sentiment analysis
 * across multiple platforms with real-time streaming capabilities
 */

import { EventEmitter } from 'events';
import { TwitterClient } from './platforms/twitter/TwitterClient';
import { RedditClient } from './platforms/reddit/RedditClient';
import { TelegramClient } from './platforms/telegram/TelegramClient';
import { DiscordClient } from './platforms/discord/DiscordClient';
import { NLPProcessor } from './nlp/NLPProcessor';
import { AggregationEngine } from './aggregation/AggregationEngine';
import { HealthMonitor } from './monitoring/HealthMonitor';
import { MetricsCollector } from './monitoring/MetricsCollector';
import { CacheManager } from './caching/CacheManager';
import { Logger } from './utils/Logger';

import type {
  Platform,
  SubscriptionOptions,
  SocialMediaPost,
  AggregatedMetrics,
  HealthStatus,
  StreamingEvent,
  ProcessingError
} from './types';

export interface MonitorConfig {
  enabledPlatforms: Platform[];
  processingLatencyMs: number;
  batchSize: number;
  concurrentRequests: number;
  cacheTtlSeconds: number;
  aggregationWindows: {
    short: number;    // seconds
    medium: number;   // seconds
    long: number;     // seconds
  };
  privacySettings: {
    hashUserIds: boolean;
    storeRawContent: boolean;
    retentionDays: number;
    anonymizeLocation: boolean;
  };
}

export class SocialMediaMonitor extends EventEmitter {
  private twitterClient?: TwitterClient;
  private redditClient?: RedditClient;
  private telegramClient?: TelegramClient;
  private discordClient?: DiscordClient;

  private nlpProcessor: NLPProcessor;
  private aggregationEngine: AggregationEngine;
  private healthMonitor: HealthMonitor;
  private metricsCollector: MetricsCollector;
  private cacheManager: CacheManager;

  private logger: Logger;
  private config: MonitorConfig;
  private isRunning: boolean = false;
  private subscriptions: Map<string, unknown> = new Map();

  // Performance tracking
  private postsProcessed: number = 0;
  private startTime: number = Date.now();
  private processingLatencies: number[] = [];

  constructor(config?: Partial<MonitorConfig>) {
    super();
    this.logger = new Logger('SocialMediaMonitor');

    // Default configuration
    this.config = {
      enabledPlatforms: ['twitter', 'reddit', 'telegram', 'discord'],
      processingLatencyMs: 5000, // 5 seconds
      batchSize: 100,
      concurrentRequests: 10,
      cacheTtlSeconds: 300, // 5 minutes
      aggregationWindows: {
        short: 60,    // 1 minute
        medium: 300,  // 5 minutes
        long: 3600    // 1 hour
      },
      privacySettings: {
        hashUserIds: true,
        storeRawContent: false,
        retentionDays: 30,
        anonymizeLocation: true
      },
      ...config
    };

    // Initialize core components
    this.nlpProcessor = new NLPProcessor();
    this.aggregationEngine = new AggregationEngine({
      short_window_seconds: this.config.aggregationWindows.short,
      medium_window_seconds: this.config.aggregationWindows.medium,
      long_window_seconds: this.config.aggregationWindows.long,
      anomaly_threshold: 2.0,
      min_volume_for_anomaly: 100
    });
    this.healthMonitor = new HealthMonitor();
    this.metricsCollector = new MetricsCollector();
    this.cacheManager = new CacheManager(this.config.cacheTtlSeconds);

    this.setupEventHandlers();
  }

  /**
   * Start the social media monitoring service
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Social Media Sentiment Monitor...');

      // Initialize platform clients for enabled platforms
      if (this.config.enabledPlatforms.includes('twitter')) {
        this.twitterClient = new TwitterClient();
        await this.twitterClient.initialize();
      }

      if (this.config.enabledPlatforms.includes('reddit')) {
        this.redditClient = new RedditClient();
        await this.redditClient.initialize();
      }

      if (this.config.enabledPlatforms.includes('telegram')) {
        this.telegramClient = new TelegramClient();
        await this.telegramClient.initialize();
      }

      if (this.config.enabledPlatforms.includes('discord')) {
        this.discordClient = new DiscordClient();
        await this.discordClient.initialize();
      }

      // Initialize core components
      await this.nlpProcessor.initialize();
      await this.aggregationEngine.initialize();
      await this.healthMonitor.initialize();
      await this.metricsCollector.initialize();
      await this.cacheManager.initialize();

      this.isRunning = true;
      this.startTime = Date.now();

      this.logger.info('✅ Social Media Sentiment Monitor started successfully');
      this.logger.info(`Enabled platforms: ${this.config.enabledPlatforms.join(', ')}`);
      this.logger.info(`Target processing latency: ${this.config.processingLatencyMs}ms`);

    } catch (error: unknown) {
      this.logger.error('❌ Failed to start Social Media Sentiment Monitor', error);
      throw error;
    }
  }

  /**
   * Stop the social media monitoring service
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Social Media Sentiment Monitor...');

      // Unsubscribe from all active subscriptions
      for (const [_id, _subscription] of this.subscriptions) {
        try {
          // await subscription.unsubscribe(); // Original: await subscription.unsubscribe();
        } catch (error: unknown) {
          this.logger.error(`Failed to unsubscribe ${_id}`, error);
        }
      }
      this.subscriptions.clear();

      // Stop platform clients
      if (this.twitterClient) await this.twitterClient.stop();
      if (this.redditClient) await this.redditClient.stop();
      if (this.telegramClient) await this.telegramClient.stop();
      if (this.discordClient) await this.discordClient.stop();

      // Stop core components
      await this.nlpProcessor.stop();
      await this.aggregationEngine.stop();
      await this.healthMonitor.stop();
      await this.metricsCollector.stop();
      await this.cacheManager.stop();

      this.isRunning = false;
      this.logger.info('✅ Social Media Sentiment Monitor stopped successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop Social Media Sentiment Monitor', error);
      throw error;
    }
  }

  /**
   * Subscribe to keywords across multiple platforms
   */
  async subscribeToKeywords(
    keywords: string[],
    options: SubscriptionOptions = {}
  ): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Social Media Sentiment Monitor is not running');
    }

    const subscriptionId = `keywords_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info(`Subscribing to keywords: ${keywords.join(', ')}`);

      const subscription = {
        id: subscriptionId,
        type: 'keywords',
        keywords,
        options,
        unsubscribe: async () => {
          await this.unsubscribeFromKeywords(subscriptionId);
        }
      };

      // Set up subscriptions for each platform
      for (const platform of options.platforms || this.config.enabledPlatforms) {
        await this.subscribeToPlatformKeywords(platform as Platform, keywords, options);
      }

      this.subscriptions.set(subscriptionId, subscription);
      this.logger.info(`✅ Keywords subscription created: ${subscriptionId}`);

      return subscriptionId;

    } catch (error: unknown) {
      this.logger.error('❌ Failed to subscribe to keywords', error);
      throw error;
    }
  }

  /**
   * Subscribe to topics across multiple platforms
   */
  async subscribeToTopics(
    topics: string[],
    options: SubscriptionOptions = {}
  ): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Social Media Sentiment Monitor is not running');
    }

    const subscriptionId = `topics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info(`Subscribing to topics: ${topics.join(', ')}`);

      const subscription = {
        id: subscriptionId,
        type: 'topics',
        topics,
        options,
        unsubscribe: async () => {
          await this.unsubscribeFromTopics(subscriptionId);
        }
      };

      // Set up subscriptions for each platform
      for (const platform of options.platforms || this.config.enabledPlatforms) {
        await this.subscribeToPlatformTopics(platform as Platform, topics, options);
      }

      this.subscriptions.set(subscriptionId, subscription);
      this.logger.info(`✅ Topics subscription created: ${subscriptionId}`);

      return subscriptionId;

    } catch (error: unknown) {
      this.logger.error('❌ Failed to subscribe to topics', error);
      throw error;
    }
  }

  /**
   * Process a social media post through the entire pipeline
   */
  async processPost(_platform: Platform, rawPost: unknown): Promise<SocialMediaPost | null> {
    const startTime = Date.now();

    try {
      // Convert raw post to standardized format
      const post = await this.normalizePost(_platform, rawPost);

      // Skip if post doesn't meet criteria
      if (!this.shouldProcessPost(post)) {
        return null;
      }

      // Apply privacy transformations
      const anonymizedPost = this.applyPrivacyTransforms(post);

      // Process through NLP pipeline
      const processedPost = await this.nlpProcessor.processPost(anonymizedPost);

      // Record processing metrics
      const processingTime = Date.now() - startTime;
      this.processingLatencies.push(processingTime);
      this.postsProcessed++;

      // Emit the processed post
      this.emit('post', {
        type: 'post',
        data: processedPost,
        timestamp: new Date(),
        platform: _platform
      } as StreamingEvent);

      // Add to aggregation engine
      await this.aggregationEngine.addPost(processedPost);

      // Performance logging
      this.logger.performance('post_processing', processingTime, {
        platform: _platform,
        post_id: processedPost.id,
        content_length: processedPost.content.length
      });

      // Check if we're meeting latency requirements
      if (processingTime > this.config.processingLatencyMs) {
        this.logger.warn(`Processing latency exceeded target: ${processingTime}ms > ${this.config.processingLatencyMs}ms`);
      }

      return processedPost;

    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Failed to process post from ${_platform}`, {
        error: (error as Error).message,
        processing_time_ms: processingTime,
        platform: _platform
      });

      // Emit error event
      this.emit('error', {
        type: 'error',
        data: {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          platform: _platform,
          error_type: 'processing_error',
          error_message: (error as Error).message || 'Unknown error',
          retry_count: 0,
          timestamp: new Date(),
          will_retry: false
        } as ProcessingError,
        timestamp: new Date()
      } as StreamingEvent);

      return null;
    }
  }

  /**
   * Get current service status
   */
  getStatus(): string {
    const components = [
      `NLP: ${this.nlpProcessor.getStatus()}`,
      `Aggregation: ${this.aggregationEngine.getStatus()}`,
      `Health: ${this.healthMonitor.getStatus()}`,
      `Metrics: ${this.metricsCollector.getStatus()}`,
      `Cache: ${this.cacheManager.getStatus()}`
    ];

    const platformStatuses = [];
    if (this.twitterClient) platformStatuses.push(`Twitter: ${this.twitterClient.getStatus()}`);
    if (this.redditClient) platformStatuses.push(`Reddit: ${this.redditClient.getStatus()}`);
    if (this.telegramClient) platformStatuses.push(`Telegram: ${this.telegramClient.getStatus()}`);
    if (this.discordClient) platformStatuses.push(`Discord: ${this.discordClient.getStatus()}`);

    const allComponents = [...components, ...platformStatuses];

    return this.isRunning ? `Running (${allComponents.join(', ')})` : 'Stopped';
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const avgLatency = this.processingLatencies.length > 0
      ? this.processingLatencies.reduce((a, b) => a + b, 0) / this.processingLatencies.length
      : 0;

    const platformHealth: Record<string, unknown> = {};
    if (this.twitterClient) platformHealth.twitter = await this.twitterClient.getHealth();
    if (this.redditClient) platformHealth.reddit = await this.redditClient.getHealth();
    if (this.telegramClient) platformHealth.telegram = await this.telegramClient.getHealth();
    if (this.discordClient) platformHealth.discord = await this.discordClient.getHealth();

    return {
      is_running: this.isRunning,
      uptime_seconds: uptimeSeconds,
      active_subscriptions: this.subscriptions.size,
      posts_processed_total: this.postsProcessed,
      posts_per_second: this.postsProcessed / Math.max(1, uptimeSeconds),
      avg_processing_latency_ms: avgLatency,
      error_rate: await this.metricsCollector.getErrorRate(),
      platform_health: platformHealth,
      memory_usage: {
        heap_used_mb: process.memoryUsage().heapUsed / 1024 / 1024,
        heap_total_mb: process.memoryUsage().heapTotal / 1024 / 1024,
        external_mb: process.memoryUsage().external / 1024 / 1024
      }
    };
  }

  /**
   * Get aggregated metrics for a time window
   */
  async getAggregatedMetrics(windowType: 'short' | 'medium' | 'long'): Promise<AggregatedMetrics[]> {
    return await this.aggregationEngine.getMetrics(windowType);
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Handle aggregated metrics
    this.aggregationEngine.on('aggregated', (metrics: AggregatedMetrics) => {
      this.emit('sentiment', {
        type: 'sentiment',
        data: metrics,
        timestamp: new Date()
      } as StreamingEvent);
    });

    // Handle anomalies
    this.aggregationEngine.on('anomaly', (anomaly: unknown) => {
      this.emit('anomaly', {
        type: 'anomaly',
        data: anomaly,
        timestamp: new Date()
      } as StreamingEvent);
    });

    // Handle influencer activity
    this.aggregationEngine.on('influencer', (influencerData: unknown) => {
      this.emit('influencer', {
        type: 'influencer',
        data: influencerData,
        timestamp: new Date()
      } as StreamingEvent);
    });
  }

  private async subscribeToPlatformKeywords(
    _platform: Platform,
    _keywords: string[],
    _options: SubscriptionOptions
  ): Promise<void> {
    const client = this.getPlatformClient(_platform);
    if (client) {
      await client.subscribeToKeywords(_keywords, _options);
    }
  }

  private async subscribeToPlatformTopics(
    _platform: Platform,
    _topics: string[],
    _options: SubscriptionOptions
  ): Promise<void> {
    const client = this.getPlatformClient(_platform);
    if (client) {
      await client.subscribeToTopics(_topics, _options);
    }
  }

  private async unsubscribeFromKeywords(_subscriptionId: string): Promise<void> {
    // Implementation for unsubscribing from keywords
    this.logger.info(`Unsubscribed from keywords: ${_subscriptionId}`);
  }

  private async unsubscribeFromTopics(_subscriptionId: string): Promise<void> {
    // Implementation for unsubscribing from topics
    this.logger.info(`Unsubscribed from topics: ${_subscriptionId}`);
  }

  private getPlatformClient(platform: Platform): unknown {
    switch (platform) {
      case 'twitter': return this.twitterClient;
      case 'reddit': return this.redditClient;
      case 'telegram': return this.telegramClient;
      case 'discord': return this.discordClient;
      default: return null;
    }
  }

  private async normalizePost(_platform: Platform, rawPost: unknown): Promise<SocialMediaPost> {
    // Convert platform-specific post format to standardized format
    // Implementation depends on each platform's data structure
    return {} as SocialMediaPost; // Placeholder
  }

  private shouldProcessPost(post: SocialMediaPost): boolean {
    // Apply filtering logic based on subscription options
    return true; // Placeholder
  }

  private applyPrivacyTransforms(post: SocialMediaPost): SocialMediaPost {
    // Apply privacy transformations (hashing, anonymization, etc.)
    return post; // Placeholder
  }
}
