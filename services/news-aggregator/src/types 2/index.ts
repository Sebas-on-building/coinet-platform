/**
 * =========================================
 * NEWS AGGREGATOR TYPES
 * =========================================
 * Type definitions for the news aggregation and analysis service
 */

export type NewsSourceType = 'rss' | 'api' | 'websocket';

export type NewsClassification =
  | 'breaking_news'
  | 'regulatory'
  | 'protocol_exploit'
  | 'macroeconomic'
  | 'technical_analysis'
  | 'market_analysis'
  | 'company_news'
  | 'partnership'
  | 'funding'
  | 'adoption'
  | 'security'
  | 'general';

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export type LanguageCode = string; // ISO 639-1 language codes

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface NewsSource {
  id: string;
  name: string;
  type: NewsSourceType;
  url: string;
  apiKey?: string;
  enabled: boolean;
  updateInterval: number; // milliseconds
  lastFetch?: Date;
  errorCount: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface RawNewsArticle {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string;
  publishedAt: Date;
  author?: string;
  tags?: string[];
  imageUrl?: string;
  category?: string;
}

export interface NewsArticle {
  id: string;
  source: NewsSource;
  title: string;
  content: string;
  summary: string;
  url: string;
  publishedAt: Date;
  fetchedAt: Date;
  author?: string;
  imageUrl?: string;

  // Classification
  classification: NewsClassification;
  urgency: UrgencyLevel;
  confidence: number;

  // NLP Analysis
  sentiment: {
    score: number;        // -1 to 1
    confidence: number;   // 0 to 1
    label: SentimentLabel;
  };

  // Key Information Extraction
  keyFacts: {
    tokens: string[];     // Cryptocurrency tokens mentioned
    projects: string[];   // Projects/protocols mentioned
    companies: string[];  // Companies mentioned
    people: string[];     // People mentioned
    locations: string[];  // Locations mentioned
    amounts: string[];    // Financial amounts mentioned
    dates: string[];      // Important dates mentioned
  };

  // Content Analysis
  entities: {
    organizations: string[];
    persons: string[];
    locations: string[];
    monetary: string[];
    percentages: string[];
  };

  // Processing metadata
  processingLatencyMs: number;
  wordCount: number;
  language: string;

  // Impact assessment
  marketImpact: {
    volatility: number;   // 0 to 1
    relevance: number;    // 0 to 1
    scope: 'local' | 'regional' | 'global';
  };
}

export interface TokenProjectMapping {
  token: string;
  symbol: string;
  project: string;
  blockchain: string;
  categories: string[];
  aliases: string[];      // Alternative names/symbols
}

export interface ArticleTagging {
  articleId: string;
  tokens: string[];       // Token symbols
  projects: string[];     // Project names
  relevance: {
    [token: string]: number; // Relevance score 0-1
  };
  confidence: number;     // Overall tagging confidence
}

export interface NewsAlert {
  id: string;
  articleId: string;
  type: 'breaking' | 'regulatory' | 'exploit' | 'macro';
  urgency: UrgencyLevel;
  title: string;
  summary: string;
  affectedTokens: string[];
  affectedProjects: string[];
  timestamp: Date;
  expiresAt?: Date;
}

export interface AggregationWindow {
  start: Date;
  end: Date;
  duration: number; // milliseconds
}

export interface NewsMetrics {
  window: AggregationWindow;
  totalArticles: number;
  sourcesBreakdown: Record<string, number>;
  classificationBreakdown: Record<NewsClassification, number>;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topTokens: Array<{
    token: string;
    mentions: number;
    avgSentiment: number;
  }>;
  urgencyDistribution: Record<UrgencyLevel, number>;
  avgProcessingLatencyMs: number;
  errorRate: number;
}

export interface BackfillRequest {
  startDate: Date;
  endDate: Date;
  sources?: string[];
  classifications?: NewsClassification[];
  tokens?: string[];
  maxArticles?: number;
}

export interface BackfillResult {
  request: BackfillRequest;
  articles: NewsArticle[];
  totalFetched: number;
  duration: number;
  errors: string[];
}

export interface SourceConfig {
  enabled: boolean;
  updateInterval: number;
  maxRetries: number;
  timeout: number;
  userAgent?: string;
}

export interface AggregatorConfig {
  maxProcessingLatencyMs: number;
  batchSize: number;
  maxConcurrentRequests: number;
  cacheTtlSeconds: number;
  aggregationWindows: {
    short: number;    // seconds
    medium: number;   // seconds
    long: number;     // seconds
  };
  classificationThresholds: {
    breaking: number;     // confidence threshold
    regulatory: number;
    exploit: number;
    macro: number;
  };
  backfillSettings: {
    maxDaysBack: number;
    maxArticlesPerDay: number;
    retryAttempts: number;
  };
}

export interface HealthStatus {
  is_running: boolean;
  uptime_seconds: number;
  active_sources: number;
  articles_processed_total: number;
  articles_per_second: number;
  avg_processing_latency_ms: number;
  error_rate: number;
  source_health: Record<string, {
    status: 'healthy' | 'degraded' | 'down';
    last_success: Date;
    articles_fetched: number;
    error_count: number;
  }>;
  queue_stats: {
    total_items: number;
    high_priority_items: number;
    processing_items: number;
    failed_items: number;
    avg_processing_time_ms: number;
  };
  memory_usage: {
    heap_used_mb: number;
    heap_total_mb: number;
    external_mb: number;
  };
}

export interface StreamingEvent {
  type: 'article' | 'classification' | 'alert' | 'error' | 'backfill';
  data: any;
  timestamp: Date;
  source?: string;
}

export interface ProcessingError {
  id: string;
  source: string;
  error_type: string;
  error_message: string;
  article_id?: string;
  retry_count: number;
  timestamp: Date;
  will_retry: boolean;
}
