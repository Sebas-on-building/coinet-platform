/**
 * =========================================
 * CRYPTOPANIC API TYPE DEFINITIONS
 * =========================================
 * Divine world-class type safety for CryptoPanic API
 * Supports Development, Growth, and Enterprise plans
 */

export enum CryptoPanicPlan {
  DEVELOPMENT = 'development',
  GROWTH = 'growth',
  ENTERPRISE = 'enterprise',
}

export enum CryptoPanicRegion {
  EN = 'en', // English
  DE = 'de', // German
  ES = 'es', // Spanish
  FR = 'fr', // French
  NL = 'nl', // Dutch
  IT = 'it', // Italian
  PT = 'pt', // Portuguese
  RU = 'ru', // Russian
}

export enum CryptoPanicFilter {
  RISING = 'rising',
  HOT = 'hot',
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  IMPORTANT = 'important',
  SAVED = 'saved',
  LOL = 'lol',
}

export enum CryptoPanicKind {
  NEWS = 'news',
  MEDIA = 'media',
  ALL = 'all',
}

export enum CryptoPanicSentiment {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

export interface CryptoPanicVotes {
  negative: number;
  positive: number;
  important: number;
  liked: number;
  disliked: number;
  lol: number;
  toxic: number;
  saved: number;
  comments: number;
}

export interface CryptoPanicCurrency {
  code: string;
  title: string;
  slug: string;
  url: string;
}

export interface CryptoPanicSource {
  title: string;
  region: string;
  domain: string;
  path: string | null;
}

export interface CryptoPanicMetadata {
  description: string;
  image?: string;
  has_video?: boolean;
}

export interface CryptoPanicPost {
  kind: CryptoPanicKind;
  domain: string;
  source: CryptoPanicSource;
  title: string;
  published_at: string;
  slug: string;
  id: number;
  url: string;
  created_at: string;
  votes: CryptoPanicVotes;
  currencies?: CryptoPanicCurrency[];
  metadata?: CryptoPanicMetadata;
}

export interface CryptoPanicPostsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CryptoPanicPost[];
}

export interface CryptoPanicPostsRequest {
  auth_token: string;
  public?: boolean;
  currencies?: string | string[]; // Comma-separated or array of currency codes
  regions?: CryptoPanicRegion | CryptoPanicRegion[];
  filter?: CryptoPanicFilter;
  kind?: CryptoPanicKind;
  page?: number;
}

// Normalized news article for internal use
export interface NormalizedNewsArticle {
  id: string;
  title: string;
  description?: string;
  url: string;
  publishedAt: Date;
  createdAt: Date;
  source: {
    name: string;
    domain: string;
    region: string;
  };
  sentiment: CryptoPanicSentiment;
  panicScore: number; // 0-100, derived from votes
  sentimentScore: number; // -100 to +100
  importance: number; // 0-100
  engagement: {
    likes: number;
    dislikes: number;
    comments: number;
    saves: number;
  };
  currencies: Array<{
    code: string;
    name: string;
    slug: string;
  }>;
  tokens: string[]; // Normalized token symbols
  protocols: string[]; // Detected DeFi protocols
  metadata: {
    hasImage: boolean;
    hasVideo: boolean;
    image?: string;
  };
  kind: CryptoPanicKind;
  tags: string[];
}

// Sentiment analysis result
export interface SentimentAnalysis {
  article: NormalizedNewsArticle;
  sentiment: CryptoPanicSentiment;
  sentimentScore: number; // -100 to +100
  panicScore: number; // 0-100
  confidence: number; // 0-1
  indicators: {
    bullishSignals: string[];
    bearishSignals: string[];
    neutralFactors: string[];
  };
  impactedTokens: Array<{
    token: string;
    impact: 'high' | 'medium' | 'low';
    sentiment: CryptoPanicSentiment;
  }>;
}

// Cached news item
export interface CachedNewsItem {
  article: NormalizedNewsArticle;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
}

// Rate limit tracking
export interface RateLimitStatus {
  plan: CryptoPanicPlan;
  requestsPerSecond: number;
  requestsPerMonth: number;
  currentSecondCount: number;
  currentMonthCount: number;
  monthlyLimit: number;
  resetAt: Date;
  isRealTime: boolean;
  hasDelay: boolean;
  delayHours: number;
}

// Search request (Enterprise only)
export interface CryptoPanicSearchRequest {
  auth_token: string;
  query: string;
  currencies?: string | string[];
  regions?: CryptoPanicRegion | CryptoPanicRegion[];
  filter?: CryptoPanicFilter;
  kind?: CryptoPanicKind;
  from?: string; // ISO date
  to?: string; // ISO date
  page?: number;
  limit?: number;
}

// Push API configuration (Enterprise only)
export interface CryptoPanicPushConfig {
  enabled: boolean;
  webhookUrl: string;
  events: Array<'new_post' | 'trending_post' | 'important_post'>;
  filters?: {
    currencies?: string[];
    sentiment?: CryptoPanicSentiment[];
    minPanicScore?: number;
    minImportance?: number;
  };
}

// Statistics and analytics
export interface NewsStatistics {
  totalArticles: number;
  articlesBySource: Record<string, number>;
  articlesBySentiment: Record<CryptoPanicSentiment, number>;
  articlesByToken: Record<string, number>;
  averagePanicScore: number;
  averageSentimentScore: number;
  trendingTokens: Array<{
    token: string;
    count: number;
    sentiment: CryptoPanicSentiment;
    avgPanicScore: number;
  }>;
  timeRange: {
    from: Date;
    to: Date;
  };
}

// Export all types
export * from '../types/index';

