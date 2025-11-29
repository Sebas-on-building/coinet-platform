export interface NewsItem {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  published_at: string;
  author?: string;
  image_url?: string;
  summary?: string;
  sentiment?: number;
  impact?: {
    score: number;
    confidence: number;
    importance: number;
    credibility: number;
  };
  social_metrics?: {
    shares: number;
    likes: number;
    comments: number;
    total_engagement: number;
  };
  verified?: boolean;
  fact_checked?: boolean;
  category?: string;
  categories?: string[];
  subcategories?: string[];
  tags?: string[];
  assets?: string[];
  related_assets?: string[];
  language?: string;
  region?: string;
  source_id: string;
  timestamp: string;
  updated_at?: string;
  impact_change: number; // Expected volatility change
  market_sentiment: "bullish" | "bearish" | "neutral";
  author_image_url?: string;
  sentiment_analysis: {
    score: number; // -1 to 1
    magnitude: number; // 0 to 1
    keywords: Array<{
      word: string;
      sentiment: number;
      importance: number;
    }>;
    entities: Array<{
      name: string;
      type: string;
      sentiment: number;
      salience: number;
    }>;
    topics: Array<{
      name: string;
      score: number;
    }>;
    primary_emotion:
      | "joy"
      | "surprise"
      | "anger"
      | "disgust"
      | "fear"
      | "sadness"
      | "neutral";
  };
  social_metrics_details: {
    twitter: {
      mentions: number;
      likes: number;
      retweets: number;
      quote_tweets: number;
      sentiment_distribution: {
        positive: number;
        negative: number;
        neutral: number;
      };
      influential_mentions: Array<{
        username: string;
        followers: number;
        tweet_url: string;
        tweet_text: string;
        profile_image: string;
      }>;
      trending_hashtags: string[];
    };
    reddit: {
      mentions: number;
      upvotes: number;
      comments: number;
      awards: number;
      top_subreddits: Array<{
        name: string;
        mentions: number;
        subscriber_count: number;
      }>;
      sentiment_distribution: {
        positive: number;
        negative: number;
        neutral: number;
      };
    };
    telegram: {
      mentions: number;
      channel_shares: number;
      group_discussions: number;
      reach: number;
      sentiment_distribution: {
        positive: number;
        negative: number;
        neutral: number;
      };
    };
    discord: {
      mentions: number;
      server_shares: number;
      reactions: number;
      top_channels: Array<{
        name: string;
        mentions: number;
        user_count: number;
      }>;
      sentiment_distribution: {
        positive: number;
        negative: number;
        neutral: number;
      };
    };
    linkedin: {
      shares: number;
      engagements: number;
      industry_mentions: Array<{
        industry: string;
        count: number;
      }>;
      sentiment_distribution: {
        positive: number;
        negative: number;
        neutral: number;
      };
    };
    engagement_trend: number; // Percentage change in last hour
    total_reach: number;
    engagement_rate: number; // engagement/reach
    virality_score: number; // 0-100
    growth_rate: {
      "1h": number; // percentage
      "4h": number;
      "12h": number;
      "24h": number;
    };
  };
  verification_sources: string[];
  verification_metrics?: {
    source_credibility: number;
    fact_check_score: number;
    cross_references: Array<{
      source: string;
      url: string;
      matching_score: number;
    }>;
    ai_detection: {
      is_ai_generated: boolean;
      confidence: number;
      detection_method: string;
      flagged_patterns: string[];
    };
    expert_reviews: Array<{
      expert_name: string;
      credentials: string;
      verification_status: "verified" | "disputed" | "unverified";
      comments: string;
    }>;
    blockchain_verification: {
      hash: string;
      timestamp: string;
      platform: string;
      verified_by: string[];
    };
  };
  manipulation_indicators?: {
    sentiment_manipulation_score: number;
    coordinated_activity: {
      detected: boolean;
      pattern_type: string;
      involved_accounts: number;
      confidence: number;
    };
    market_manipulation_risk: {
      level: "high" | "medium" | "low";
      indicators: string[];
      historical_patterns: boolean;
    };
    bot_activity: {
      detected: boolean;
      percentage: number;
      pattern_type: string[];
    };
  };
  content_analysis?: {
    objectivity_score: number;
    technical_accuracy: {
      score: number;
      verified_by: string[];
      comments: string;
    };
    readability_score: number;
    complexity_level: "basic" | "intermediate" | "advanced";
    citation_count: number;
    sources_quality_score: number;
  };
  fact_checking: {
    verified_by: string[];
    accuracy_score: number; // 0-1
    disputed_claims: Array<{
      claim: string;
      refutation: string;
      source: string;
    }>;
  };
  related_news: string[]; // IDs of related news items
  market_data_snapshot?: {
    timestamp: string;
    prices: Record<string, number>; // symbol: price at article publication
    price_movements_24h: Record<string, number>; // symbol: 24h % change at time of article
    volume_24h: Record<string, number>;
    market_cap: Record<string, number>;
  };
  historical_impact?: Array<{
    timeframe: "1h" | "4h" | "24h";
    price_changes: Record<string, number>; // symbol: % change after publication
    volume_changes: Record<string, number>; // symbol: % volume change
    correlation_score: number; // how well this news correlated with market moves
  }>;
  machine_translation?: {
    available_languages: string[];
  };
  trading_signals?: {
    direction: "buy" | "sell" | "hold" | "unclear";
    confidence: number;
    timeframe: "short" | "medium" | "long";
    assets: Array<{
      symbol: string;
      signal: "buy" | "sell" | "hold";
      confidence: number;
    }>;
  };
  marketContext?: {
    sentiment: number;
    confidence: number;
    topics: string[];
    entities: string[];
  };
  impactMetrics?: {
    priceChange24h: number;
    volumeChange24h: number;
    volatility: number;
    momentum: number;
  };
  relatedContent?: {
    id: string;
    title: string;
    url: string;
    similarity: number;
  }[];
  verification_score?: number;
}

export interface ChartAnnotation {
  id: string;
  timestamp: string;
  price: number;
  news_id: string;
  position: "top" | "bottom";
  impact_type: "positive" | "negative" | "neutral";
  price_change_percent: number;
  volume_change_percent: number;
  importance: number; // 0-1
  tooltip_text: string;
  category: string;
}

export interface TimeframeData {
  timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w" | "1mo";
  annotations: ChartAnnotation[];
  significant_events: NewsItem[];
  market_sentiment_score: number; // -1 to 1
  news_volume: number;
  news_impact_score: number; // 0-1
}

export interface NewsFilter {
  categories?: string[];
  subcategories?: string[];
  sources?: string[];
  authors?: string[];
  impactThreshold?: number;
  timeRange?: {
    start: string;
    end: string;
  };
  assets?: string[];
  verifiedOnly?: boolean;
  factCheckedOnly?: boolean;
  language?: string[];
  excludeTranslated?: boolean;
  socialMetrics?: {
    minEngagement?: number;
    minViralityScore?: number;
    platforms?: string[];
    influencerOnly?: boolean;
    sentimentBias?: "positive" | "negative" | "neutral";
    growthRate?: number;
  };
  sentimentAnalysis?: {
    minScore?: number;
    maxScore?: number;
    emotionTypes?: string[];
    minMagnitude?: number;
    containsEntities?: string[];
    containsTopics?: string[];
  };
  marketImpact?: {
    minConfidence?: number;
    direction?: "bullish" | "bearish" | "neutral";
    minVolatilityChange?: number;
    minImportance?: number;
    minHistoricalCorrelation?: number;
  };
  tradingSignals?: {
    direction?: "buy" | "sell" | "hold";
    minConfidence?: number;
    timeframe?: "short" | "medium" | "long";
  };
  keywords?: string[];
  searchText?: string;
  excludeKeywords?: string[];
  publishedAfter?: string;
  publishedBefore?: string;
  sortBy?: "relevance" | "date" | "impact" | "popularity";
  limit?: number;
  offset?: number;
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  logo_url: string;
  category:
    | "mainstream"
    | "crypto"
    | "financial"
    | "social"
    | "blog"
    | "official";
  reliability_score: number; // 0-1
  sentiment_accuracy: number; // 0-1 (historical accuracy of news sentiment from this source)
  coverage_metrics: {
    article_count_24h: number;
    article_count_7d: number;
    average_sentiment: number; // -1 to 1
    bias_score: number; // 0-1 (how biased they are in coverage)
    favorites_count: number; // how many users have favorited this source
  };
  supported_assets: string[]; // which assets they tend to cover
  supported_languages: string[];
  average_daily_articles: number;
  specialization?: string[]; // e.g., ["DeFi", "NFTs", "Regulation"]
  subscription_required: boolean;
  api_integration_level: "full" | "partial" | "rss" | "scraping"; // how we get data from them
}

export interface NewsAlert {
  id: string;
  user_id: string;
  created_at: string;
  name: string;
  filter: NewsFilter;
  notification_settings: {
    email: boolean;
    push: boolean;
    in_app: boolean;
    severity_threshold: number; // 0-1, only alert if impact >= this threshold
    max_per_day: number;
    quiet_hours: {
      start: string; // "HH:MM"
      end: string; // "HH:MM"
      timezone: string; // e.g. "America/New_York"
    };
  };
  last_triggered_at?: string;
  trigger_count: number;
}

export interface NewsEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  type:
    | "conference"
    | "product_launch"
    | "regulatory_deadline"
    | "earnings"
    | "ama"
    | "listing"
    | "airdrop"
    | "other";
  importance: number; // 0-1
  location?: string;
  affected_assets: string[];
  url?: string;
  source: string;
  verified: boolean;
  reminder_times: string[]; // ISO datetime strings
  expected_impact: {
    direction: "positive" | "negative" | "neutral" | "unknown";
    confidence: number;
    magnitude: number;
  };
}

export interface TrendingTopic {
  id: string;
  name: string;
  sentiment: number; // -1 to 1
  volume: number; // number of mentions
  momentum: number; // rate of growth (percentage)
  peak_time: string; // when mentions peaked
  related_assets: Array<{
    symbol: string;
    strength: number; // 0-1 correlation
  }>;
  related_news: string[]; // IDs of top news items
  timeframe: "1h" | "4h" | "24h" | "7d";
}

export interface ContentAggregationSettings {
  preferred_sources: string[];
  blocked_sources: string[];
  preferred_categories: string[];
  preferred_languages: string[];
  enable_translations: boolean;
  content_optimization: "balanced" | "in_depth" | "concise";
  personalized_scoring: boolean;
  digest_frequency: "real_time" | "hourly" | "daily" | "weekly";
  notification_settings: {
    high_impact_only: boolean;
    enable_price_alerts: boolean;
    enable_trending_topics: boolean;
    favorite_assets_only: boolean;
  };
}

export interface HistoricalNewsData {
  id: string;
  newsItem: NewsItem;
  marketContext: {
    timestamp: string;
    price: number;
    volume: number;
    marketCap: number;
    sentiment: number;
  };
  narrativeTags: string[];
  impactMetrics: {
    priceChange24h: number;
    volumeChange24h: number;
    socialEngagement: number;
    reach: number;
  };
}

export interface NarrativeTimeline {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  relatedNews: HistoricalNewsData[];
  marketImpact: {
    totalPriceChange: number;
    peakPriceChange: number;
    averageSentiment: number;
    totalVolume: number;
  };
  relatedNarratives: string[];
  status: "active" | "completed" | "evolving";
  momentum?: number;
  sentimentTrend?: number;
  marketCorrelation?: number;
}

export interface NewsArchiveFilter {
  startDate?: string;
  endDate?: string;
  narratives?: string[];
  assets?: string[];
  minImpact?: number;
  sources?: string[];
  categories?: string[];
  sentiment?: "positive" | "negative" | "neutral" | "all";
  query?: string;
}

export interface ImpactMetrics {
  priceChange24h: number;
  volumeChange24h: number;
  socialEngagement: number;
  reach: number;
  momentum: number;
  volatility: number;
}
