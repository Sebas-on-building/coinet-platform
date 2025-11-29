/**
 * =========================================
 * SOCIAL MEDIA SENTIMENT ANALYSIS TYPES
 * =========================================
 * Type definitions for the social media sentiment analysis service
 */

export type Platform = 'twitter' | 'reddit' | 'telegram' | 'discord';

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export type LanguageCode = string; // ISO 639-1 language codes

export interface AuthorInfo {
  id: string;           // De-identified user ID
  username?: string;    // Username/handle (if available)
  followers?: number;   // Follower count (if available)
  verified?: boolean;   // Verification status
  joinDate?: Date;      // Account creation date
}

export interface EngagementMetrics {
  likes?: number;
  retweets?: number;
  replies?: number;
  shares?: number;
  views?: number;
  reactions?: Record<string, number>;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface SentimentData {
  score: number;        // -1 to 1 (negative to positive)
  confidence: number;   // 0 to 1
  label: SentimentLabel;
  emotions?: Record<string, number>; // Optional emotion analysis
}

export interface TopicClassification {
  topics: string[];
  confidence: Record<string, number>;
  categories: string[];
}

export interface InfluencerMetrics {
  score: number;        // 0 to 100 (influence score)
  reach: number;        // Estimated reach
  engagement: number;   // Engagement rate
  credibility: number;  // 0 to 1
  categories: string[]; // Areas of influence
}

export interface SocialMediaPost {
  id: string;
  platform: Platform;
  content: string;
  author: AuthorInfo;
  timestamp: Date;
  language: LanguageCode;

  // Content analysis
  sentiment: SentimentData;
  topics: TopicClassification;
  hashtags: string[];
  mentions: string[];
  urls?: string[];

  // Engagement
  engagement: EngagementMetrics;

  // Location (optional, privacy-filtered)
  location?: LocationInfo;

  // Influencer analysis
  influencer_metrics?: InfluencerMetrics;

  // Processing metadata
  processed_at: Date;
  processing_latency_ms: number;
}

export interface SubscriptionOptions {
  platforms?: Platform[];
  keywords?: string[];
  topics?: string[];
  languageFilter?: LanguageCode[];
  minFollowers?: number;
  verifiedOnly?: boolean;
  includeInfluencerAnalysis?: boolean;
  sentimentThreshold?: number;
  timeWindows?: {
    short?: number;   // minutes
    medium?: number;  // minutes
    long?: number;    // minutes
  };
}

export interface AggregationWindow {
  start: Date;
  end: Date;
  duration: number; // milliseconds
}

export interface AggregatedMetrics {
  window: AggregationWindow;
  platform: Platform;
  total_posts: number;
  unique_authors: number;

  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
    avg_confidence: number;
  };

  top_topics: Array<{
    topic: string;
    count: number;
    avg_sentiment: number;
    trend: 'up' | 'down' | 'stable';
  }>;

  top_hashtags: Array<{
    hashtag: string;
    count: number;
    growth_rate: number;
  }>;

  influencer_activity: {
    total_influencers: number;
    avg_influence_score: number;
    top_influencers: Array<{
      id: string;
      posts: number;
      influence_score: number;
    }>;
  };

  volume_metrics: {
    posts_per_minute: number;
    velocity_change: number; // Rate of change
    anomaly_score: number;   // 0 to 1
    peak_time?: Date;
  };

  engagement_metrics: {
    avg_likes: number;
    avg_shares: number;
    viral_coefficient: number;
  };
}

export interface PlatformLimits {
  requests_per_minute: number;
  requests_per_hour: number;
  posts_per_request: number;
  backoff_strategy: 'exponential' | 'linear' | 'fixed';
}

export interface PlatformConfig {
  enabled: boolean;
  api_keys: Record<string, string>;
  rate_limits: PlatformLimits;
  retry_config: {
    max_retries: number;
    base_delay_ms: number;
    max_delay_ms: number;
  };
}

export interface ServiceConfig {
  max_processing_latency_ms: number;
  batch_size: number;
  max_concurrent_requests: number;
  cache_ttl_seconds: number;
  aggregation_windows: {
    short: number;    // seconds
    medium: number;   // seconds
    long: number;     // seconds
  };
  privacy_settings: {
    hash_user_ids: boolean;
    store_raw_content: boolean;
    retention_days: number;
    anonymize_location: boolean;
  };
  nlp_settings: {
    model_version: string;
    confidence_threshold: number;
    max_content_length: number;
  };
}

export interface HealthStatus {
  is_running: boolean;
  uptime_seconds: number;
  active_subscriptions: number;
  posts_processed_total: number;
  posts_per_second: number;
  avg_processing_latency_ms: number;
  error_rate: number;
  platform_health: Record<Platform, {
    status: 'healthy' | 'degraded' | 'down';
    last_success: Date;
    requests_per_minute: number;
    error_count: number;
  }>;
  memory_usage: {
    heap_used_mb: number;
    heap_total_mb: number;
    external_mb: number;
  };
}

export interface StreamingEvent {
  type: 'post' | 'sentiment' | 'influencer' | 'anomaly' | 'error';
  data: any;
  timestamp: Date;
  platform?: Platform;
}

export interface ProcessingError {
  id: string;
  platform: Platform;
  error_type: string;
  error_message: string;
  post_id?: string;
  retry_count: number;
  timestamp: Date;
  will_retry: boolean;
}
