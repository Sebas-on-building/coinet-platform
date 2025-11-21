/**
 * =========================================
 * AGGREGATION ENGINE
 * =========================================
 * Time-window aggregation for sentiment analysis, volume tracking,
 * and anomaly detection in social media data
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  SocialMediaPost,
  AggregatedMetrics,
  AggregationWindow,
  Platform
} from '../types';

export interface AggregationConfig {
  short_window_seconds: number;
  medium_window_seconds: number;
  long_window_seconds: number;
  anomaly_threshold: number;
  min_volume_for_anomaly: number;
}

export class AggregationEngine extends EventEmitter {
  private logger: Logger;
  private config: AggregationConfig;
  private isInitialized: boolean = false;

  // Data storage for different time windows
  private shortWindowData: Map<string, Map<string, unknown>> = new Map();
  private mediumWindowData: Map<string, Map<string, unknown>> = new Map();
  private longWindowData: Map<string, Map<string, unknown>> = new Map();

  // Current window tracking
  private currentWindows: Map<string, AggregationWindow> = new Map();

  // Anomaly detection
  private baselineMetrics: Map<string, unknown> = new Map();
  private anomalyHistory: unknown[] = [];

  constructor(config?: Partial<AggregationConfig>) {
    super();
    this.logger = new Logger('AggregationEngine');

    this.config = {
      short_window_seconds: 60,    // 1 minute
      medium_window_seconds: 300,  // 5 minutes
      long_window_seconds: 3600,   // 1 hour
      anomaly_threshold: 2.0,      // 2 standard deviations
      min_volume_for_anomaly: 100,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Aggregation Engine...');

      // Initialize current windows
      this.initializeWindows();

      // Set up cleanup intervals
      this.setupCleanupIntervals();

      this.isInitialized = true;
      this.logger.info('✅ Aggregation Engine initialized successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to initialize Aggregation Engine', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Clear all data
      this.shortWindowData.clear();
      this.mediumWindowData.clear();
      this.longWindowData.clear();
      this.currentWindows.clear();
      this.baselineMetrics.clear();
      this.anomalyHistory = [];

      this.isInitialized = false;
      this.logger.info('✅ Aggregation Engine stopped successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop Aggregation Engine', error);
      throw error;
    }
  }

  async addPost(post: SocialMediaPost): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Aggregation Engine is not initialized');
    }

    try {
      const platform = post.platform;
      const _timestamp = post.timestamp;

      // Update all time windows
      await this.updateShortWindow(platform, post);
      await this.updateMediumWindow(platform, post);
      await this.updateLongWindow(platform, post);

      // Check for anomalies
      await this.detectAnomalies(platform);

      // Update baseline metrics
      this.updateBaselineMetrics(platform, post);

    } catch (error: unknown) {
      this.logger.error('Failed to add post to aggregation', {
        post_id: post.id,
        platform: post.platform,
        error: (error as Error).message
      });
    }
  }

  async getMetrics(windowType: 'short' | 'medium' | 'long'): Promise<AggregatedMetrics[]> {
    const metrics: AggregatedMetrics[] = [];

    try {
      const windowData = this.getWindowData(windowType);
      const currentWindow = this.getCurrentWindow(windowType);

      if (!windowData || !currentWindow) {
        return metrics;
      }

      for (const [platform, platformData] of windowData) {
        const metric = this.buildAggregatedMetrics(
          platform as Platform,
          platformData,
          currentWindow
        );

        if (metric) {
          metrics.push(metric);
        }
      }

      return metrics;

    } catch (error: unknown) {
      this.logger.error('Failed to get aggregated metrics', error);
      return metrics;
    }
  }

  getStatus(): string {
    return this.isInitialized ? 'Running' : 'Stopped';
  }

  private initializeWindows(): void {
    const now = new Date();

    // Initialize short windows (1-minute intervals)
    for (let _i = 0; _i < 10; _i++) { // Keep 10 minutes of short windows
      const windowStart = new Date(now.getTime() - (_i * this.config.short_window_seconds * 1000));
      const _windowKey = this.getWindowKey(windowStart, 'short');
      this.currentWindows.set(`short_${_i}`, {
        start: windowStart,
        end: new Date(windowStart.getTime() + (this.config.short_window_seconds * 1000)),
        duration: this.config.short_window_seconds * 1000
      });
    }

    // Initialize medium windows (5-minute intervals)
    for (let _i = 0; _i < 12; _i++) { // Keep 1 hour of medium windows
      const windowStart = new Date(now.getTime() - (_i * this.config.medium_window_seconds * 1000));
      const _windowKey = this.getWindowKey(windowStart, 'medium');
      this.currentWindows.set(`medium_${_i}`, {
        start: windowStart,
        end: new Date(windowStart.getTime() + (this.config.medium_window_seconds * 1000)),
        duration: this.config.medium_window_seconds * 1000
      });
    }

    // Initialize long windows (1-hour intervals)
    for (let _i = 0; _i < 24; _i++) { // Keep 24 hours of long windows
      const windowStart = new Date(now.getTime() - (_i * this.config.long_window_seconds * 1000));
      const _windowKey = this.getWindowKey(windowStart, 'long');
      this.currentWindows.set(`long_${_i}`, {
        start: windowStart,
        end: new Date(windowStart.getTime() + (this.config.long_window_seconds * 1000)),
        duration: this.config.long_window_seconds * 1000
      });
    }
  }

  private setupCleanupIntervals(): void {
    // Clean up old short windows every minute
    setInterval(() => {
      this.cleanupOldWindows('short');
    }, this.config.short_window_seconds * 1000);

    // Clean up old medium windows every 5 minutes
    setInterval(() => {
      this.cleanupOldWindows('medium');
    }, this.config.medium_window_seconds * 1000);

    // Clean up old long windows every hour
    setInterval(() => {
      this.cleanupOldWindows('long');
    }, this.config.long_window_seconds * 1000);
  }

  private async updateShortWindow(platform: Platform, post: SocialMediaPost): Promise<void> {
    const windowKey = this.getCurrentWindowKey('short');
    const platformKey = `${platform}_short`;

    if (!this.shortWindowData.has(platformKey)) {
      this.shortWindowData.set(platformKey, new Map());
    }

    const platformData = this.shortWindowData.get(platformKey)!;
    const postKey = post.id;

    if (!platformData.has(postKey)) {
      // New post in this window
      platformData.set(postKey, {
        post,
        timestamp: new Date()
      });

      // Update counts
      this.incrementCount(platformData, 'total_posts');
      this.updateSentimentDistribution(platformData, post);
      this.updateTopTopics(platformData, post);
      this.updateTopHashtags(platformData, post);
      this.updateEngagementMetrics(platformData, post);
    }
  }

  private async updateMediumWindow(platform: Platform, post: SocialMediaPost): Promise<void> {
    const windowKey = this.getCurrentWindowKey('medium');
    const platformKey = `${platform}_medium`;

    if (!this.mediumWindowData.has(platformKey)) {
      this.mediumWindowData.set(platformKey, new Map());
    }

    const platformData = this.mediumWindowData.get(platformKey)!;
    const postKey = post.id;

    if (!platformData.has(postKey)) {
      platformData.set(postKey, {
        post,
        timestamp: new Date()
      });

      this.incrementCount(platformData, 'total_posts');
      this.updateSentimentDistribution(platformData, post);
      this.updateTopTopics(platformData, post);
      this.updateTopHashtags(platformData, post);
      this.updateEngagementMetrics(platformData, post);
    }
  }

  private async updateLongWindow(platform: Platform, post: SocialMediaPost): Promise<void> {
    const windowKey = this.getCurrentWindowKey('long');
    const platformKey = `${platform}_long`;

    if (!this.longWindowData.has(platformKey)) {
      this.longWindowData.set(platformKey, new Map());
    }

    const platformData = this.longWindowData.get(platformKey)!;
    const postKey = post.id;

    if (!platformData.has(postKey)) {
      platformData.set(postKey, {
        post,
        timestamp: new Date()
      });

      this.incrementCount(platformData, 'total_posts');
      this.updateSentimentDistribution(platformData, post);
      this.updateTopTopics(platformData, post);
      this.updateTopHashtags(platformData, post);
      this.updateEngagementMetrics(platformData, post);
    }
  }

  private async detectAnomalies(platform: Platform): Promise<void> {
    const currentMetrics = await this.getCurrentMetrics(platform, 'medium');

    if (!currentMetrics || (currentMetrics as any).total_posts < this.config.min_volume_for_anomaly) {
      return;
    }

    const baseline = this.baselineMetrics.get(`${platform}_baseline`) || {
      avg_volume: 0,
      std_volume: 0,
      avg_sentiment: 0,
      std_sentiment: 0
    };

    // Calculate anomaly scores
    const volumeAnomalyScore = this.calculateVolumeAnomalyScore(
      (currentMetrics as any).total_posts,
      (baseline as any).avg_volume,
      (baseline as any).std_volume
    );

    const sentimentAnomalyScore = this.calculateSentimentAnomalyScore(
      (currentMetrics as any).sentiment_distribution,
      baseline
    );

    const overallAnomalyScore = Math.max(volumeAnomalyScore, sentimentAnomalyScore);

    if (overallAnomalyScore > this.config.anomaly_threshold) {
      const anomaly = {
        platform,
        timestamp: new Date(),
        anomaly_score: overallAnomalyScore,
        volume_anomaly: volumeAnomalyScore,
        sentiment_anomaly: sentimentAnomalyScore,
        current_metrics: currentMetrics,
        baseline
      };

      this.anomalyHistory.push(anomaly);

      // Emit anomaly event
      this.emit('anomaly', anomaly);

      this.logger.warn('Anomaly detected', {
        platform,
        anomaly_score: overallAnomalyScore,
        volume_score: volumeAnomalyScore,
        sentiment_score: sentimentAnomalyScore
      });
    }
  }

  private updateBaselineMetrics(_platform: Platform, _post: SocialMediaPost): void {
    const baselineKey = `${_platform}_baseline`;

    if (!this.baselineMetrics.has(baselineKey)) {
      this.baselineMetrics.set(baselineKey, {
        volumes: [],
        sentiments: [],
        last_updated: new Date()
      });
    }

    const baseline = this.baselineMetrics.get(baselineKey) as { last_updated: Date; };
    const now = Date.now();

    // Only update baseline every 5 minutes to avoid noise
    if (now - baseline.last_updated.getTime() > 300000) {
      // Add current metrics to baseline calculation
      // This is a simplified implementation
      baseline.last_updated = new Date();
    }
  }

  private incrementCount(platformData: Map<string, unknown>, metric: string): void {
    const current = (platformData.get(metric) as number) || 0;
    platformData.set(metric, current + 1);
  }

  private updateSentimentDistribution(platformData: Map<string, unknown>, post: SocialMediaPost): void {
    const sentiment = post.sentiment;
    const distribution = (platformData.get('sentiment_distribution') as { positive: number; negative: number; neutral: number; }) || {
      positive: 0,
      negative: 0,
      neutral: 0
    };

    if (sentiment.label === 'positive') {
      distribution.positive++;
    } else if (sentiment.label === 'negative') {
      distribution.negative++;
    } else {
      distribution.neutral++;
    }

    platformData.set('sentiment_distribution', distribution);
  }

  private updateTopTopics(platformData: Map<string, unknown>, post: SocialMediaPost): void {
    const topics = (platformData.get('top_topics') as { topic: string; count: number; avg_sentiment: number; }[]) || [];
    const postTopics = post.topics.topics;

    for (const topic of postTopics) {
      const existingTopic = topics.find((t) => t.topic === topic);
      if (existingTopic) {
        existingTopic.count++;
      } else {
        topics.push({
          topic,
          count: 1,
          avg_sentiment: post.sentiment.score
        });
      }
    }

    // Keep only top 10 topics
    topics.sort((a, b) => b.count - a.count);
    platformData.set('top_topics', topics.slice(0, 10));
  }

  private updateTopHashtags(platformData: Map<string, unknown>, post: SocialMediaPost): void {
    const hashtags = (platformData.get('top_hashtags') as { hashtag: string; count: number; }[]) || [];
    const postHashtags = post.hashtags;

    for (const hashtag of postHashtags) {
      const existingHashtag = hashtags.find((h) => h.hashtag === hashtag);
      if (existingHashtag) {
        existingHashtag.count++;
      } else {
        hashtags.push({
          hashtag,
          count: 1
        });
      }
    }

    // Keep only top 10 hashtags
    hashtags.sort((a, b) => b.count - a.count);
    platformData.set('top_hashtags', hashtags.slice(0, 10));
  }

  private updateEngagementMetrics(platformData: Map<string, unknown>, post: SocialMediaPost): void {
    const engagement = (platformData.get('engagement_metrics') as { total_likes: number; total_shares: number; post_count: number; }) || {
      total_likes: 0,
      total_shares: 0,
      post_count: 0
    };

    engagement.total_likes += post.engagement.likes || 0;
    engagement.total_shares += post.engagement.shares || 0;
    engagement.post_count++;

    platformData.set('engagement_metrics', engagement);
  }

  private buildAggregatedMetrics(
    platform: Platform,
    platformData: Map<string, unknown>,
    window: AggregationWindow
  ): AggregatedMetrics | null {
    try {
      const totalPosts = (platformData.get('total_posts') as number) || 0;
      const sentimentDistribution = (platformData.get('sentiment_distribution') as { positive: number; negative: number; neutral: number; }) || {
        positive: 0, negative: 0, neutral: 0
      };
      const topTopics = (platformData.get('top_topics') as { topic: string; count: number; avg_sentiment: number; }[]) || [];
      const topHashtags = (platformData.get('top_hashtags') as { hashtag: string; count: number; }[]) || [];
      const engagementMetrics = (platformData.get('engagement_metrics') as { total_likes: number; total_shares: number; post_count: number; }) || {
        total_likes: 0, total_shares: 0, post_count: 0
      };

      // Calculate unique authors (simplified)
      const uniqueAuthors = new Set();
      for (const [_key, value] of platformData) {
        if (_key !== 'total_posts' && _key !== 'sentiment_distribution' &&
            _key !== 'top_topics' && _key !== 'top_hashtags' && _key !== 'engagement_metrics') {
          const postData = value as { post: SocialMediaPost };
          if (postData.post) {
            uniqueAuthors.add(postData.post.author.id);
          }
        }
      }

      // Calculate velocity and anomaly scores
      const volumeMetrics = this.calculateVolumeMetrics(platform, totalPosts, window);

      return {
        window,
        platform,
        total_posts: totalPosts,
        unique_authors: uniqueAuthors.size,
        sentiment_distribution: {
          positive: sentimentDistribution.positive,
          negative: sentimentDistribution.negative,
          neutral: sentimentDistribution.neutral,
          avg_confidence: 0.8 // Simplified
        },
        top_topics: topTopics.map((topic: { topic: string; count: number; avg_sentiment: number; }) => ({
          topic: topic.topic,
          count: topic.count,
          avg_sentiment: topic.avg_sentiment,
          trend: 'stable' as const // Would be calculated based on historical data
        })),
        top_hashtags: topHashtags.map((hashtag: { hashtag: string; count: number; }) => ({
          hashtag: hashtag.hashtag,
          count: hashtag.count,
          growth_rate: 0 // Would be calculated based on historical data
        })),
        influencer_activity: {
          total_influencers: 0, // Would be calculated
          avg_influence_score: 0,
          top_influencers: []
        },
        volume_metrics: volumeMetrics,
        engagement_metrics: {
          avg_likes: engagementMetrics.post_count > 0 ?
            engagementMetrics.total_likes / engagementMetrics.post_count : 0,
          avg_shares: engagementMetrics.post_count > 0 ?
            engagementMetrics.total_shares / engagementMetrics.post_count : 0,
          viral_coefficient: 0 // Would be calculated
        }
      };

    } catch (error: unknown) {
      this.logger.error('Failed to build aggregated metrics', error);
      return null;
    }
  }

  private calculateVolumeMetrics(platform: Platform, totalPosts: number, window: AggregationWindow): unknown {
    const postsPerMinute = (totalPosts * 60000) / window.duration;
    const baseline = this.baselineMetrics.get(`${platform}_baseline`) || { avg_volume: 0 };

    return {
      posts_per_minute: postsPerMinute,
      velocity_change: 0, // Would be calculated based on previous windows
      anomaly_score: this.calculateVolumeAnomalyScore(postsPerMinute, (baseline as any).avg_volume, 1),
      peak_time: totalPosts > 0 ? window.start : undefined
    };
  }

  private calculateVolumeAnomalyScore(current: number, baseline: number, stdDev: number): number {
    if (stdDev === 0 || baseline === 0) return 0;

    const zScore = Math.abs(current - baseline) / stdDev;
    return Math.min(1, zScore / this.config.anomaly_threshold);
  }

  private calculateSentimentAnomalyScore(current: unknown, baseline: unknown): number {
    // Simplified sentiment anomaly calculation
    return 0;
  }

  private getWindowData(windowType: 'short' | 'medium' | 'long'): Map<string, Map<string, unknown>> | null {
    switch (windowType) {
      case 'short': return this.shortWindowData;
      case 'medium': return this.mediumWindowData;
      case 'long': return this.longWindowData;
      default: return null;
    }
  }

  private getCurrentWindow(windowType: 'short' | 'medium' | 'long'): AggregationWindow | null {
    const windowKey = this.getCurrentWindowKey(windowType);
    return this.currentWindows.get(windowKey) || null;
  }

  private getCurrentWindowKey(windowType: 'short' | 'medium' | 'long'): string {
    const now = new Date();
    const interval = this.getWindowInterval(windowType);

    const windowStart = new Date(now.getTime() - (now.getTime() % interval));
    return this.getWindowKey(windowStart, windowType);
  }

  private getWindowKey(startTime: Date, windowType: 'short' | 'medium' | 'long'): string {
    return `${windowType}_${startTime.getTime()}`;
  }

  private getWindowInterval(windowType: 'short' | 'medium' | 'long'): number {
    switch (windowType) {
      case 'short': return this.config.short_window_seconds * 1000;
      case 'medium': return this.config.medium_window_seconds * 1000;
      case 'long': return this.config.long_window_seconds * 1000;
      default: return 60000;
    }
  }

  private cleanupOldWindows(_windowType: 'short' | 'medium' | 'long'): void {
    const windowData = this.getWindowData(_windowType);
    if (!windowData) return;

    const now = Date.now();
    const interval = this.getWindowInterval(_windowType);
    const maxAge = interval * 10; // Keep 10 windows

    for (const [_key, _data] of windowData) {
      // This is a simplified cleanup - in practice, you'd check timestamps
      // For now, just keep the most recent data
    }
  }

  private async getCurrentMetrics(platform: Platform, windowType: 'short' | 'medium' | 'long'): Promise<unknown> {
    const windowData = this.getWindowData(windowType);
    const platformKey = `${platform}_${windowType}`;

    if (!windowData || !windowData.has(platformKey)) {
      return null;
    }

    return this.buildAggregatedMetrics(
      platform,
      windowData.get(platformKey)!,
      this.getCurrentWindow(windowType)!
    );
  }
}
