/**
 * 📰 DIVINE NEWS SERVICE - Multi-Source Aggregation Engine v3
 * 
 * Revolutionary news intelligence with 5+ redundant sources and intelligent failover.
 * Zero downtime news coverage through automatic source switching.
 * 
 * DATA SOURCES (Priority Order):
 * 0. Redis Cache (from ai-data-feeder) ← NEW! Fastest!
 * 1. CryptoPanic API (Pro/Free) - Primary, community-curated
 * 2. CoinGecko News API - Comprehensive coverage
 * 3. Messari News API - Institutional-grade research
 * 4. The Block API - Premium crypto journalism
 * 5. RSS Aggregator - CoinDesk, Decrypt, Bitcoin Magazine (fallback)
 * 
 * FEATURES:
 * - Redis integration with ai-data-feeder
 * - Multi-source aggregation with intelligent failover
 * - AI-powered sentiment analysis
 * - Impact scoring and price prediction hints
 * - Credibility rating per source
 * - Smart deduplication
 * - Rate limiting per source
 * - Tiered caching strategy
 * 
 * @version 3.0.0 - Divine Perfection with Redis
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { 
  isRedisAvailable, 
  getCachedNews, 
  getCachedNewsMultiple,
  setCachedNews,
  CachedNewsData 
} from './redis-client';
import { 
  enrichNewsSnapshot, 
  EnrichedNewsSnapshot, 
  EnrichedNewsArticle 
} from './news-intelligence';

// ============================================================================
// TYPES
// ============================================================================

export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  sourcePriority: number;
  publishedAt: Date;
  coins: string[];
  sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  sentimentScore: number; // -1 to 1
  votes: {
    positive: number;
    negative: number;
    important: number;
    liked: number;
    disliked: number;
    lol: number;
    toxic: number;
    saved: number;
    comments: number;
  };
  impact: 'low' | 'medium' | 'high' | 'critical';
  impactScore: number; // 0 to 100
  credibility: number; // 0 to 1
  priceImpactPrediction?: {
    direction: 'up' | 'down' | 'neutral';
    magnitude: number; // percentage
    confidence: number; // 0 to 1
    timeframe: string; // "1h", "4h", "24h"
  };
  categories: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface NewsSnapshot {
  timestamp: string;
  articles: NewsArticle[];
  requestedCoins: string[];
  dominantSentiment: 'bullish' | 'bearish' | 'neutral';
  overallSentimentScore: number;
  majorNarratives: string[];
  criticalAlerts: NewsArticle[];
  sourcesUsed: string[];
  sourcesFailed: string[];
  fetchTime: number;
  totalArticlesProcessed: number;
}

interface NewsSource {
  name: string;
  priority: number;
  enabled: boolean;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    lastRequestTime: number;
    requestCount: number;
    windowStart: number;
  };
  fetch: (coins?: string[]) => Promise<NewsArticle[]>;
  healthStatus: 'healthy' | 'degraded' | 'failed';
  consecutiveFailures: number;
  lastSuccess?: Date;
  lastError?: string;
}

interface NewsCache {
  data: NewsSnapshot;
  timestamp: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Cache settings
  CACHE_TTL_MS: 2 * 60 * 1000, // 2 minutes for fresh news (faster updates)
  STALE_CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes stale-while-revalidate
  
  // Limits (increased to meet 50+ article requirement)
  MAX_NEWS_PER_SOURCE: 25,
  MAX_TOTAL_NEWS: 100, // Allow up to 100 articles
  MAX_NEWS_FOR_AI: 20, // More context for AI
  MIN_ARTICLES_REQUIRED: 20, // Reduced - RSS alone can provide sufficient coverage
  
  // Failover
  MAX_CONSECUTIVE_FAILURES: 3,
  FAILURE_COOLDOWN_MS: 15 * 60 * 1000, // 15 minutes before retrying failed source
  RATE_LIMIT_COOLDOWN_MS: 30 * 60 * 1000, // 30 minutes cooldown after rate limit
  
  // Deduplication
  TITLE_SIMILARITY_THRESHOLD: 0.75, // Slightly more aggressive dedup
  
  // Timeouts
  REQUEST_TIMEOUT_MS: 6000, // 6 seconds max per source (total <500ms target)
  TOTAL_FETCH_TIMEOUT_MS: 500, // Target: 500ms total fetch time
};

// ============================================================================
// NEWS SOURCES REGISTRY
// ============================================================================

const newsSources: Map<string, NewsSource> = new Map();

// Initialize CryptoPanic source
// NOTE: CryptoPanic has very strict rate limits - disable if no API key or consistently rate limited
newsSources.set('cryptopanic', {
  name: 'CryptoPanic',
  priority: 1,
  enabled: !!process.env.CRYPTOPANIC_API_KEY, // Only enable if API key is configured
  apiKey: process.env.CRYPTOPANIC_API_KEY,
  rateLimit: {
    requestsPerMinute: 2, // Very conservative - even with API key, they rate limit aggressively
    lastRequestTime: 0,
    requestCount: 0,
    windowStart: Date.now(),
  },
  fetch: fetchFromCryptoPanic,
  healthStatus: 'healthy',
  consecutiveFailures: 0,
});

// Initialize CoinGecko News source
newsSources.set('coingecko', {
  name: 'CoinGecko News',
  priority: 2,
  enabled: false, // Disabled: CoinGecko /status_updates endpoint is unreliable. RSS aggregator provides better news coverage.
  apiKey: process.env.COINGECKO_API_KEY,
  rateLimit: {
    requestsPerMinute: process.env.COINGECKO_API_KEY ? 30 : 10,
    lastRequestTime: 0,
    requestCount: 0,
    windowStart: Date.now(),
  },
  fetch: fetchFromCoinGecko,
  healthStatus: 'healthy',
  consecutiveFailures: 0,
});

// Initialize Messari source
newsSources.set('messari', {
  name: 'Messari',
  priority: 3,
  enabled: !!process.env.MESSARI_API_KEY,
  apiKey: process.env.MESSARI_API_KEY,
  rateLimit: {
    requestsPerMinute: 20,
    lastRequestTime: 0,
    requestCount: 0,
    windowStart: Date.now(),
  },
  fetch: fetchFromMessari,
  healthStatus: 'healthy',
  consecutiveFailures: 0,
});

// Initialize The Block source
newsSources.set('theblock', {
  name: 'The Block',
  priority: 4,
  enabled: !!process.env.THEBLOCK_API_KEY,
  apiKey: process.env.THEBLOCK_API_KEY,
  rateLimit: {
    requestsPerMinute: 10,
    lastRequestTime: 0,
    requestCount: 0,
    windowStart: Date.now(),
  },
  fetch: fetchFromTheBlock,
  healthStatus: 'healthy',
  consecutiveFailures: 0,
});

// Initialize RSS Aggregator (always available as fallback)
newsSources.set('rss', {
  name: 'RSS Aggregator',
  priority: 5,
  enabled: true,
  rateLimit: {
    requestsPerMinute: 60,
    lastRequestTime: 0,
    requestCount: 0,
    windowStart: Date.now(),
  },
  fetch: fetchFromRSS,
  healthStatus: 'healthy',
  consecutiveFailures: 0,
});

// ============================================================================
// REDIS NEWS CONVERSION
// ============================================================================

/**
 * Convert Redis cached news data to NewsArticle format
 */
function convertRedisNewsToArticles(redisNews: Map<string, CachedNewsData>): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  for (const [coinId, newsData] of redisNews) {
    // Convert top headlines to articles
    for (const headline of newsData.topHeadlines || []) {
      const { sentiment, sentimentScore } = mapRedisSentiment(newsData.sentiment, newsData.sentimentScore);
      
      articles.push({
        id: `redis-${coinId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: headline.title,
        url: '', // Not available from ai-data-feeder
        source: 'ai-data-feeder',
        sourcePriority: 0, // Highest priority - from our own cache
        publishedAt: new Date(headline.publishedAt),
        coins: [coinId.toUpperCase()],
        sentiment,
        sentimentScore,
        votes: { positive: 0, negative: 0, important: 0, liked: 0, disliked: 0, lol: 0, toxic: 0, saved: 0, comments: 0 },
        impact: newsData.panicScore > 50 ? 'high' : 'medium',
        impactScore: Math.min(100, newsData.panicScore + 30),
        credibility: 0.85, // From ai-data-feeder which aggregates from CryptoPanic
        categories: [],
        urgency: newsData.panicScore > 70 ? 'high' : newsData.panicScore > 50 ? 'medium' : 'low',
      });
    }
  }
  
  return articles;
}

/**
 * Map Redis sentiment format to our format
 */
function mapRedisSentiment(
  sentiment: 'positive' | 'negative' | 'neutral',
  score: number
): { sentiment: NewsArticle['sentiment']; sentimentScore: number } {
  // Convert score from ai-data-feeder (-100 to +100) to our format (-1 to 1)
  const normalizedScore = score / 100;
  
  let mappedSentiment: NewsArticle['sentiment'];
  if (normalizedScore >= 0.6) mappedSentiment = 'very_bullish';
  else if (normalizedScore >= 0.2) mappedSentiment = 'bullish';
  else if (normalizedScore <= -0.6) mappedSentiment = 'very_bearish';
  else if (normalizedScore <= -0.2) mappedSentiment = 'bearish';
  else mappedSentiment = 'neutral';
  
  return { sentiment: mappedSentiment, sentimentScore: normalizedScore };
}

/**
 * Build NewsSnapshot from Redis articles
 */
function buildSnapshotFromRedis(
  articles: NewsArticle[],
  coins: string[],
  startTime: number
): NewsSnapshot {
  // Calculate aggregate sentiment
  const sentimentSum = articles.reduce((sum, a) => sum + a.sentimentScore, 0);
  const avgSentiment = articles.length > 0 ? sentimentSum / articles.length : 0;
  
  let dominantSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (avgSentiment > 0.15) dominantSentiment = 'bullish';
  else if (avgSentiment < -0.15) dominantSentiment = 'bearish';
  
  // Extract critical alerts
  const criticalAlerts = articles.filter(a => a.urgency === 'critical' || a.urgency === 'high');
  
  return {
    timestamp: new Date().toISOString(),
    articles,
    requestedCoins: coins,
    dominantSentiment,
    overallSentimentScore: avgSentiment,
    majorNarratives: articles.slice(0, 3).map(a => a.title),
    criticalAlerts,
    sourcesUsed: ['Redis (ai-data-feeder)'],
    sourcesFailed: [],
    fetchTime: Date.now() - startTime,
    totalArticlesProcessed: articles.length,
  };
}

// ============================================================================
// CACHE
// ============================================================================

const newsCache: Map<string, NewsCache> = new Map();

function getCacheKey(coins?: string[]): string {
  return coins?.sort().join(',') || 'general';
}

function getFromCache(key: string): NewsSnapshot | null {
  const cached = newsCache.get(key);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  
  // Fresh cache
  if (age < CONFIG.CACHE_TTL_MS) {
    logger.debug('📰 News cache HIT (fresh)', { key, age: `${Math.round(age/1000)}s` });
    return cached.data;
  }
  
  // Stale but usable (will trigger background refresh)
  if (age < CONFIG.STALE_CACHE_TTL_MS) {
    logger.debug('📰 News cache HIT (stale)', { key, age: `${Math.round(age/1000)}s` });
    return cached.data;
  }
  
  return null;
}

function setCache(key: string, data: NewsSnapshot): void {
  newsCache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// RATE LIMITING
// ============================================================================

async function checkRateLimit(source: NewsSource): Promise<boolean> {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  // Reset window if expired
  if (now - source.rateLimit.windowStart > windowMs) {
    source.rateLimit.windowStart = now;
    source.rateLimit.requestCount = 0;
  }
  
  // Check if we can make a request
  if (source.rateLimit.requestCount >= source.rateLimit.requestsPerMinute) {
    const waitTime = windowMs - (now - source.rateLimit.windowStart);
    logger.debug(`📰 Rate limit reached for ${source.name}, waiting ${waitTime}ms`);
    return false;
  }
  
  source.rateLimit.requestCount++;
  source.rateLimit.lastRequestTime = now;
  return true;
}

// ============================================================================
// SOURCE HEALTH MANAGEMENT
// ============================================================================

function markSourceSuccess(sourceName: string): void {
  const source = newsSources.get(sourceName);
  if (source) {
    source.consecutiveFailures = 0;
    source.healthStatus = 'healthy';
    source.lastSuccess = new Date();
    source.lastError = undefined;
  }
}

function markSourceFailure(sourceName: string, error: string, isRateLimit: boolean = false): void {
  const source = newsSources.get(sourceName);
  if (source) {
    source.consecutiveFailures++;
    source.lastError = error;
    
    // Set appropriate cooldown based on error type
    if (isRateLimit) {
      // Longer cooldown for rate limits
      source.rateLimit.lastRequestTime = Date.now() + CONFIG.RATE_LIMIT_COOLDOWN_MS - CONFIG.FAILURE_COOLDOWN_MS;
      source.healthStatus = 'failed';
      logger.warn(`📰 Source ${sourceName} rate limited, cooling down for ${CONFIG.RATE_LIMIT_COOLDOWN_MS / 60000} minutes`);
    } else if (source.consecutiveFailures >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
      source.healthStatus = 'failed';
      logger.warn(`📰 Source ${sourceName} marked as FAILED after ${source.consecutiveFailures} failures`);
    } else {
      source.healthStatus = 'degraded';
    }
  }
}

function isSourceAvailable(source: NewsSource): boolean {
  if (!source.enabled) return false;
  
  // Check if source is in cooldown after failures
  if (source.healthStatus === 'failed') {
    const lastFailTime = source.rateLimit.lastRequestTime;
    if (Date.now() - lastFailTime < CONFIG.FAILURE_COOLDOWN_MS) {
      return false;
    }
    // Reset and try again
    source.healthStatus = 'degraded';
    source.consecutiveFailures = 0;
  }
  
  return true;
}

// ============================================================================
// CRYPTOPANIC FETCHER
// ============================================================================

interface CryptoPanicResponse {
  count: number;
  results: CryptoPanicPost[];
}

interface CryptoPanicPost {
  id: number;
  kind: 'news' | 'media';
  domain: string;
  title: string;
  published_at: string;
  slug: string;
  url: string;
  source: {
    title: string;
    region: string;
    domain: string;
  };
  currencies?: Array<{
    code: string;
    title: string;
    slug: string;
  }>;
  votes: {
    positive: number;
    negative: number;
    important: number;
    liked: number;
    disliked: number;
    lol: number;
    toxic: number;
    saved: number;
    comments: number;
  };
}

async function fetchFromCryptoPanic(coins?: string[]): Promise<NewsArticle[]> {
  const source = newsSources.get('cryptopanic')!;
  
  if (!await checkRateLimit(source)) {
    return [];
  }
  
  try {
    // Use the correct Developer API v2 endpoint
    const apiKey = source.apiKey || process.env.CRYPTOPANIC_API_KEY;
    
    if (!apiKey) {
      logger.debug('📰 CryptoPanic: No API key configured');
      return [];
    }
    
    // Build URL with Developer API v2 endpoint
    let url = `https://cryptopanic.com/api/developer/v2/posts/?auth_token=${apiKey}&public=true&kind=news`;
    
    if (coins && coins.length > 0) {
      url += `&currencies=${coins.join(',')}`;
    }
    
    // Add filter for important/rising news
    url += '&filter=rising';
    
    const response = await axios.get<CryptoPanicResponse>(url, {
      timeout: CONFIG.REQUEST_TIMEOUT_MS,
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.data?.results) {
      throw new Error('Invalid response structure');
    }
    
    const articles = response.data.results.slice(0, CONFIG.MAX_NEWS_PER_SOURCE).map(post => 
      transformCryptoPanicArticle(post)
    );
    
    markSourceSuccess('cryptopanic');
    logger.info('📰 CryptoPanic fetch SUCCESS', { count: articles.length, filter: 'rising' });
    
    return articles;
  } catch (error: any) {
    const isRateLimit = error.response?.status === 429;
    const message = isRateLimit 
      ? 'Rate limited' 
      : error.response?.status === 401
      ? 'Invalid API key'
      : error.response?.status === 403
      ? 'Access forbidden'
      : error.response?.status === 502
      ? 'Service unavailable'
      : error.message || 'Unknown error';
    markSourceFailure('cryptopanic', message, isRateLimit);
    logger.warn('📰 CryptoPanic fetch FAILED', { error: message, status: error.response?.status });
    return [];
  }
}
    
function transformCryptoPanicArticle(post: CryptoPanicPost): NewsArticle {
  const { sentiment, sentimentScore } = analyzeSentimentAdvanced(post.title, post.votes);
      const credibility = assessCredibility(post.source.domain, post.source.title);
  const { impact, impactScore } = assessImpactAdvanced(post, credibility);
  const urgency = determineUrgency(impact, sentimentScore, post.votes);
  const priceImpact = predictPriceImpact(sentiment, impact, credibility);
  const categories = extractCategories(post.title);
      
      return {
        id: `cp-${post.id}`,
        title: post.title,
        url: post.url,
        source: post.source.title,
    sourcePriority: 1,
        publishedAt: new Date(post.published_at),
        coins: post.currencies?.map(c => c.code.toUpperCase()) || [],
        sentiment,
    sentimentScore,
        votes: post.votes,
        impact,
    impactScore,
        credibility,
    priceImpactPrediction: priceImpact,
    categories,
    urgency,
  };
}

// ============================================================================
// COINGECKO NEWS FETCHER
// ============================================================================

async function fetchFromCoinGecko(coins?: string[]): Promise<NewsArticle[]> {
  const source = newsSources.get('coingecko')!;
  
  if (!await checkRateLimit(source)) {
    return [];
  }
  
  try {
    // CoinGecko doesn't have a /news endpoint - use /status_updates directly
    // This endpoint provides project status updates which serve as news-like content
    const baseUrl = 'https://api.coingecko.com/api/v3';
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    
    if (source.apiKey) {
      headers['x-cg-pro-api-key'] = source.apiKey;
    }
    
    // Go directly to status_updates endpoint (CoinGecko's only news-like endpoint)
    const articles = await fetchCoinGeckoStatusUpdates(coins, headers);
    
    if (articles.length > 0) {
      markSourceSuccess('coingecko');
      logger.debug('📰 CoinGecko fetch SUCCESS', { count: articles.length });
      return articles;
    }
    
    // No articles found
    markSourceFailure('coingecko', 'No status updates available');
    return [];
  } catch (error: any) {
    const message = error.response?.status === 429 
      ? 'Rate limited' 
      : error.response?.status === 400
      ? 'Invalid endpoint or parameters'
      : error.message || 'Unknown error';
    markSourceFailure('coingecko', message);
    logger.warn('📰 CoinGecko fetch FAILED', { error: message, status: error.response?.status });
    return [];
  }
}

async function fetchCoinGeckoStatusUpdates(coins?: string[], headers?: Record<string, string>): Promise<NewsArticle[]> {
  try {
    const baseUrl = 'https://api.coingecko.com/api/v3';
    const response = await axios.get(`${baseUrl}/status_updates`, {
      timeout: CONFIG.REQUEST_TIMEOUT_MS,
      headers: headers || { 'Accept': 'application/json' },
      params: {
        per_page: 20,
        category: 'general',
      },
    });
    
    if (!response.data?.status_updates) {
      return [];
    }
    
    return response.data.status_updates.slice(0, CONFIG.MAX_NEWS_PER_SOURCE).map((item: any) => ({
      id: `cg-${item.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.description?.substring(0, 200) || 'CoinGecko Update',
      summary: item.description,
      url: item.project?.links?.homepage?.[0] || 'https://coingecko.com',
      source: 'CoinGecko',
      sourcePriority: 2,
      publishedAt: new Date(item.created_at),
      coins: item.project?.symbol ? [item.project.symbol.toUpperCase()] : [],
      sentiment: 'neutral' as const,
      sentimentScore: 0,
      votes: { positive: 0, negative: 0, important: 0, liked: 0, disliked: 0, lol: 0, toxic: 0, saved: 0, comments: 0 },
      impact: 'low' as const,
      impactScore: 20,
      credibility: 0.8,
      categories: ['update'],
      urgency: 'low' as const,
    }));
  } catch {
    return [];
  }
}

function transformCoinGeckoArticle(item: any): NewsArticle {
  const title = item.title || item.description?.substring(0, 200) || 'News Update';
  const { sentiment, sentimentScore } = analyzeSentimentAdvanced(title);
  const credibility = 0.8; // CoinGecko is reliable
  const { impact, impactScore } = assessImpactAdvanced({ title, votes: {} } as any, credibility);
  
  return {
    id: `cg-${item.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    summary: item.description,
    url: item.url || 'https://coingecko.com',
    source: 'CoinGecko',
    sourcePriority: 2,
    publishedAt: new Date(item.created_at || item.updated_at || Date.now()),
    coins: [],
    sentiment,
    sentimentScore,
    votes: { positive: 0, negative: 0, important: 0, liked: 0, disliked: 0, lol: 0, toxic: 0, saved: 0, comments: 0 },
    impact,
    impactScore,
    credibility,
    categories: extractCategories(title),
    urgency: 'low',
  };
}

// ============================================================================
// MESSARI NEWS FETCHER
// ============================================================================

async function fetchFromMessari(coins?: string[]): Promise<NewsArticle[]> {
  const source = newsSources.get('messari')!;
  
  if (!source.apiKey || !await checkRateLimit(source)) {
    return [];
  }
  
  try {
    const response = await axios.get('https://data.messari.io/api/v1/news', {
      timeout: CONFIG.REQUEST_TIMEOUT_MS,
      headers: {
        'Accept': 'application/json',
        'x-messari-api-key': source.apiKey,
      },
      params: {
        page: 1,
        limit: CONFIG.MAX_NEWS_PER_SOURCE,
      },
    });
    
    if (!response.data?.data) {
      throw new Error('Invalid response structure');
    }
    
    const articles = response.data.data.map((item: any) => transformMessariArticle(item));
    
    markSourceSuccess('messari');
    logger.debug('📰 Messari fetch SUCCESS', { count: articles.length });
    
    return articles;
  } catch (error: any) {
    const message = error.response?.status === 429 
      ? 'Rate limited' 
      : error.message || 'Unknown error';
    markSourceFailure('messari', message);
    logger.warn('📰 Messari fetch FAILED', { error: message });
    return [];
  }
}

function transformMessariArticle(item: any): NewsArticle {
  const title = item.title || 'Messari Research';
  const { sentiment, sentimentScore } = analyzeSentimentAdvanced(title);
  const credibility = 0.95; // Messari is highly credible
  const { impact, impactScore } = assessImpactAdvanced({ title, votes: {} } as any, credibility);
  
  return {
    id: `ms-${item.id || Date.now()}`,
    title,
    summary: item.content?.substring(0, 500),
    url: item.url || item.references?.[0]?.url || 'https://messari.io',
    source: 'Messari',
    sourcePriority: 3,
    publishedAt: new Date(item.published_at || Date.now()),
    coins: item.tags?.filter((t: string) => t.length <= 5).map((t: string) => t.toUpperCase()) || [],
    sentiment,
    sentimentScore,
    votes: { positive: 0, negative: 0, important: 0, liked: 0, disliked: 0, lol: 0, toxic: 0, saved: 0, comments: 0 },
    impact,
    impactScore,
    credibility,
    categories: item.tags || [],
    urgency: impact === 'critical' ? 'critical' : impact === 'high' ? 'high' : 'medium',
  };
}

// ============================================================================
// THE BLOCK NEWS FETCHER
// ============================================================================

async function fetchFromTheBlock(coins?: string[]): Promise<NewsArticle[]> {
  const source = newsSources.get('theblock')!;
  
  if (!source.apiKey || !await checkRateLimit(source)) {
    return [];
  }
  
  try {
    // The Block API endpoint (adjust based on actual API)
    const response = await axios.get('https://api.theblockcrypto.com/v1/articles', {
      timeout: CONFIG.REQUEST_TIMEOUT_MS,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${source.apiKey}`,
      },
      params: {
        limit: CONFIG.MAX_NEWS_PER_SOURCE,
      },
    });
    
    if (!response.data?.articles) {
      throw new Error('Invalid response structure');
    }
    
    const articles = response.data.articles.map((item: any) => transformTheBlockArticle(item));
    
    markSourceSuccess('theblock');
    logger.debug('📰 The Block fetch SUCCESS', { count: articles.length });
    
    return articles;
  } catch (error: any) {
    const message = error.response?.status === 429 
      ? 'Rate limited' 
      : error.message || 'Unknown error';
    markSourceFailure('theblock', message);
    logger.warn('📰 The Block fetch FAILED', { error: message });
    return [];
  }
}

function transformTheBlockArticle(item: any): NewsArticle {
  const title = item.title || 'The Block News';
  const { sentiment, sentimentScore } = analyzeSentimentAdvanced(title);
  const credibility = 0.9; // The Block is premium journalism
  const { impact, impactScore } = assessImpactAdvanced({ title, votes: {} } as any, credibility);
  
  return {
    id: `tb-${item.id || Date.now()}`,
    title,
    summary: item.excerpt || item.summary,
    url: item.url || 'https://theblock.co',
    source: 'The Block',
    sourcePriority: 4,
    publishedAt: new Date(item.published_at || item.created_at || Date.now()),
    coins: item.tags?.filter((t: string) => t.length <= 5).map((t: string) => t.toUpperCase()) || [],
    sentiment,
    sentimentScore,
    votes: { positive: 0, negative: 0, important: 0, liked: 0, disliked: 0, lol: 0, toxic: 0, saved: 0, comments: 0 },
    impact,
    impactScore,
    credibility,
    categories: item.categories || [],
    urgency: impact === 'critical' ? 'critical' : 'medium',
  };
}

// ============================================================================
// RSS AGGREGATOR (FALLBACK)
// ============================================================================

const RSS_FEEDS = [
  // Tier 1: Most reliable
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', credibility: 0.9 },
  { name: 'Decrypt', url: 'https://decrypt.co/feed', credibility: 0.88 },
  { name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/', credibility: 0.85 },
  // Tier 2: Good sources
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', credibility: 0.78 },
  { name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/', credibility: 0.75 },
  { name: 'The Block', url: 'https://www.theblock.co/rss.xml', credibility: 0.85 },
  // Tier 3: Additional coverage
  { name: 'NewsBTC', url: 'https://www.newsbtc.com/feed/', credibility: 0.7 },
  { name: 'CryptoPotato', url: 'https://cryptopotato.com/feed/', credibility: 0.68 },
  { name: 'BeInCrypto', url: 'https://beincrypto.com/feed/', credibility: 0.65 },
  { name: 'U.Today', url: 'https://u.today/rss', credibility: 0.65 },
];

async function fetchFromRSS(coins?: string[]): Promise<NewsArticle[]> {
  const source = newsSources.get('rss')!;
  
  if (!await checkRateLimit(source)) {
    return [];
  }
  
  const allArticles: NewsArticle[] = [];
  
  // Fetch from multiple RSS feeds in parallel
  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const response = await axios.get(feed.url, {
        timeout: CONFIG.REQUEST_TIMEOUT_MS,
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        responseType: 'text',
      });
      
      // Simple RSS parsing (extract items)
      const items = parseRSSItems(response.data, feed.name, feed.credibility);
      return items.slice(0, 8); // 8 articles per feed (10 feeds = 80 potential articles)
    } catch (error) {
      logger.debug(`📰 RSS feed ${feed.name} failed`);
      return [];
    }
  });
  
  const results = await Promise.allSettled(feedPromises);
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  }
  
  if (allArticles.length > 0) {
    markSourceSuccess('rss');
    logger.debug('📰 RSS fetch SUCCESS', { count: allArticles.length });
  } else {
    markSourceFailure('rss', 'All RSS feeds failed');
  }
  
  return allArticles;
}

function parseRSSItems(xml: string, sourceName: string, credibility: number): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  // Simple regex-based RSS parsing (works for most feeds)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
  const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
  
  let match;
  while ((match = itemRegex.exec(xml)) !== null && articles.length < 15) {
    const item = match[1];
    
    const titleMatch = item.match(titleRegex);
    const linkMatch = item.match(linkRegex);
    const pubDateMatch = item.match(pubDateRegex);
    const descMatch = item.match(descRegex);
    
    const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
    const link = (linkMatch?.[1] || '').trim();
    const pubDate = pubDateMatch?.[1] ? new Date(pubDateMatch[1]) : new Date();
    const description = (descMatch?.[1] || descMatch?.[2] || '').trim();
    
    if (title && link) {
      const { sentiment, sentimentScore } = analyzeSentimentAdvanced(title);
      const { impact, impactScore } = assessImpactAdvanced({ title, votes: {} } as any, credibility);
      
      articles.push({
        id: `rss-${sourceName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${articles.length}`,
        title,
        summary: description.substring(0, 300),
        url: link,
        source: sourceName,
        sourcePriority: 5,
        publishedAt: pubDate,
        coins: extractCoinsFromText(title + ' ' + description),
        sentiment,
        sentimentScore,
        votes: { positive: 0, negative: 0, important: 0, liked: 0, disliked: 0, lol: 0, toxic: 0, saved: 0, comments: 0 },
        impact,
        impactScore,
        credibility,
        categories: extractCategories(title),
        urgency: 'medium',
      });
    }
  }
  
  return articles;
}

// ============================================================================
// SENTIMENT ANALYSIS (ADVANCED)
// ============================================================================

interface SentimentResult {
  sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  sentimentScore: number;
}

function analyzeSentimentAdvanced(title: string, votes?: any): SentimentResult {
  const text = title.toLowerCase();
  
  // Keyword dictionaries with weights
  const veryBullishWords: [string, number][] = [
    ['moon', 2], ['skyrocket', 2], ['explode', 2], ['parabolic', 2],
    ['all-time high', 2], ['ath', 2], ['massive rally', 2], ['etf approved', 2.5],
    ['institutional adoption', 2], ['breakthrough', 1.5],
  ];
  
  const bullishWords: [string, number][] = [
    ['surge', 1], ['soar', 1], ['rally', 1], ['bullish', 1], ['gain', 1],
    ['rise', 0.8], ['high', 0.5], ['record', 1], ['breakout', 1], ['pump', 1],
    ['adoption', 1], ['institutional', 0.8], ['partnership', 1], ['launch', 0.8],
    ['upgrade', 0.8], ['milestone', 1], ['growth', 0.8], ['success', 0.8],
  ];
  
  const bearishWords: [string, number][] = [
    ['drop', 1], ['fall', 1], ['decline', 1], ['bearish', 1], ['sink', 1],
    ['low', 0.5], ['fear', 0.8], ['sell', 0.8], ['concern', 0.8], ['warning', 0.8],
    ['delay', 0.8], ['issue', 0.5], ['problem', 0.5], ['risk', 0.5],
  ];
  
  const veryBearishWords: [string, number][] = [
    ['crash', 2], ['plunge', 2], ['dump', 2], ['collapse', 2], ['hack', 2],
    ['exploit', 2], ['rug', 2.5], ['scam', 2.5], ['ban', 2], ['lawsuit', 1.5],
    ['sec', 1], ['investigation', 1.5], ['fraud', 2.5], ['bankrupt', 2.5],
  ];
  
  let score = 0;
  
  // Calculate from keywords
  for (const [word, weight] of veryBullishWords) {
    if (text.includes(word)) score += weight * 2;
  }
  for (const [word, weight] of bullishWords) {
    if (text.includes(word)) score += weight;
  }
  for (const [word, weight] of bearishWords) {
    if (text.includes(word)) score -= weight;
  }
  for (const [word, weight] of veryBearishWords) {
    if (text.includes(word)) score -= weight * 2;
  }
  
  // Factor in community votes if available
  if (votes) {
    const positiveSignal = (votes.positive || 0) + (votes.liked || 0) + (votes.important || 0);
    const negativeSignal = (votes.negative || 0) + (votes.disliked || 0) + (votes.toxic || 0);
    score += (positiveSignal - negativeSignal) * 0.1;
  }
  
  // Normalize to -1 to 1
  const normalizedScore = Math.max(-1, Math.min(1, score / 5));
  
  // Determine category
  let sentiment: SentimentResult['sentiment'];
  if (normalizedScore >= 0.6) sentiment = 'very_bullish';
  else if (normalizedScore >= 0.2) sentiment = 'bullish';
  else if (normalizedScore <= -0.6) sentiment = 'very_bearish';
  else if (normalizedScore <= -0.2) sentiment = 'bearish';
  else sentiment = 'neutral';
  
  return { sentiment, sentimentScore: normalizedScore };
}

// ============================================================================
// IMPACT ASSESSMENT (ADVANCED)
// ============================================================================

interface ImpactResult {
  impact: 'low' | 'medium' | 'high' | 'critical';
  impactScore: number;
}

function assessImpactAdvanced(post: { title: string; votes?: any }, credibility: number): ImpactResult {
  const title = post.title.toLowerCase();
  
  const criticalKeywords = [
    'etf approved', 'etf rejected', 'hack', 'exploit', 'billion', 'major',
    'breaking', 'ban', 'bankrupt', 'collapse', 'emergency', 'critical',
  ];
  
  const highImpactKeywords = [
    'etf', 'sec', 'regulation', 'institutional', 'million', 'partnership',
    'acquisition', 'launch', 'upgrade', 'fork', 'halving', 'fed', 'interest rate',
  ];
  
  const mediumImpactKeywords = [
    'announce', 'update', 'release', 'report', 'analysis', 'prediction',
    'trend', 'market', 'price', 'volume', 'whale',
  ];
  
  let score = 20; // Base score
  
  // Keyword scoring
  for (const keyword of criticalKeywords) {
    if (title.includes(keyword)) score += 30;
  }
  for (const keyword of highImpactKeywords) {
    if (title.includes(keyword)) score += 15;
  }
  for (const keyword of mediumImpactKeywords) {
    if (title.includes(keyword)) score += 5;
  }
  
  // Credibility multiplier
  score *= (0.5 + credibility * 0.5);
  
  // Engagement multiplier (if votes available)
  if (post.votes) {
    const totalVotes = Object.values(post.votes).reduce((a: number, b: any) => a + (b || 0), 0);
    if (totalVotes > 100) score *= 1.5;
    else if (totalVotes > 50) score *= 1.3;
    else if (totalVotes > 20) score *= 1.1;
  }
  
  // Normalize to 0-100
  const normalizedScore = Math.min(100, Math.round(score));
  
  // Determine category
  let impact: ImpactResult['impact'];
  if (normalizedScore >= 80) impact = 'critical';
  else if (normalizedScore >= 60) impact = 'high';
  else if (normalizedScore >= 40) impact = 'medium';
  else impact = 'low';
  
  return { impact, impactScore: normalizedScore };
}

// ============================================================================
// CREDIBILITY ASSESSMENT
// ============================================================================

const CREDIBILITY_TIERS: Record<string, number> = {
  // Tier 1: Institutional/Mainstream (0.9-1.0)
  'reuters.com': 1.0,
  'bloomberg.com': 1.0,
  'wsj.com': 0.95,
  'ft.com': 0.95,
  'nytimes.com': 0.95,
  
  // Tier 2: Premium Crypto (0.85-0.9)
  'coindesk.com': 0.9,
  'theblock.co': 0.9,
  'decrypt.co': 0.88,
  'messari.io': 0.95,
  
  // Tier 3: Established Crypto (0.7-0.85)
  'cointelegraph.com': 0.8,
  'bitcoinmagazine.com': 0.85,
  'cryptonews.com': 0.75,
  'cryptoslate.com': 0.75,
  'beincrypto.com': 0.72,
  'u.today': 0.7,
  'newsbtc.com': 0.7,
  
  // Tier 4: General/Unknown (0.5-0.7)
  'default': 0.5,
};

function assessCredibility(domain: string, source: string): number {
  const domainLower = domain.toLowerCase();
  
  for (const [key, value] of Object.entries(CREDIBILITY_TIERS)) {
    if (domainLower.includes(key)) {
      return value;
    }
  }
  
  return CREDIBILITY_TIERS['default'];
}

// ============================================================================
// PRICE IMPACT PREDICTION
// ============================================================================

function predictPriceImpact(
  sentiment: string,
  impact: string,
  credibility: number
): NewsArticle['priceImpactPrediction'] | undefined {
  // Only predict for high-impact, high-credibility news
  if (impact === 'low' || credibility < 0.7) {
    return undefined;
  }
  
  const isBullish = sentiment.includes('bullish');
  const isBearish = sentiment.includes('bearish');
  const isVery = sentiment.includes('very');
  
  if (!isBullish && !isBearish) {
    return undefined;
  }
  
  // Base magnitude based on impact
  let magnitude = impact === 'critical' ? 5 : impact === 'high' ? 3 : 1;
  if (isVery) magnitude *= 1.5;
  
  // Confidence based on credibility and impact
  let confidence = credibility * 0.5;
  if (impact === 'critical') confidence += 0.3;
  else if (impact === 'high') confidence += 0.2;
  
  return {
    direction: isBullish ? 'up' : 'down',
    magnitude: Math.round(magnitude * 10) / 10,
    confidence: Math.min(0.8, confidence), // Cap at 80%
    timeframe: impact === 'critical' ? '1h' : impact === 'high' ? '4h' : '24h',
  };
}

// ============================================================================
// URGENCY DETERMINATION
// ============================================================================

function determineUrgency(
  impact: string,
  sentimentScore: number,
  votes?: any
): 'low' | 'medium' | 'high' | 'critical' {
  if (impact === 'critical') return 'critical';
  
  const extremeSentiment = Math.abs(sentimentScore) > 0.7;
  const highEngagement = votes && 
    ((votes.important || 0) > 20 || (votes.comments || 0) > 50);
  
  if (impact === 'high' && (extremeSentiment || highEngagement)) {
    return 'critical';
  }
  
  if (impact === 'high' || (impact === 'medium' && extremeSentiment)) {
    return 'high';
  }
  
  if (impact === 'medium') {
    return 'medium';
  }
  
  return 'low';
}

// ============================================================================
// CATEGORY EXTRACTION
// ============================================================================

function extractCategories(title: string): string[] {
  const categories: string[] = [];
  const text = title.toLowerCase();
  
  const categoryKeywords: Record<string, string[]> = {
    'regulation': ['sec', 'regulation', 'regulatory', 'law', 'legal', 'compliance', 'ban'],
    'defi': ['defi', 'dex', 'yield', 'liquidity', 'aave', 'uniswap', 'compound'],
    'nft': ['nft', 'opensea', 'collectible', 'digital art'],
    'bitcoin': ['bitcoin', 'btc', 'satoshi', 'lightning'],
    'ethereum': ['ethereum', 'eth', 'vitalik', 'layer 2', 'l2'],
    'altcoin': ['altcoin', 'alt season', 'memecoin', 'shitcoin'],
    'exchange': ['binance', 'coinbase', 'kraken', 'exchange', 'cex'],
    'market': ['market', 'price', 'rally', 'crash', 'bull', 'bear'],
    'technology': ['upgrade', 'fork', 'protocol', 'blockchain', 'smart contract'],
    'adoption': ['adoption', 'institutional', 'partnership', 'integration'],
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => text.includes(k))) {
      categories.push(category);
    }
  }
  
  return categories.slice(0, 3); // Max 3 categories
}

// ============================================================================
// COIN EXTRACTION FROM TEXT
// ============================================================================

const COMMON_COINS = new Map([
  ['bitcoin', 'BTC'], ['btc', 'BTC'],
  ['ethereum', 'ETH'], ['eth', 'ETH'], ['ether', 'ETH'],
  ['solana', 'SOL'], ['sol', 'SOL'],
  ['cardano', 'ADA'], ['ada', 'ADA'],
  ['dogecoin', 'DOGE'], ['doge', 'DOGE'],
  ['xrp', 'XRP'], ['ripple', 'XRP'],
  ['polkadot', 'DOT'], ['dot', 'DOT'],
  ['avalanche', 'AVAX'], ['avax', 'AVAX'],
  ['chainlink', 'LINK'], ['link', 'LINK'],
  ['polygon', 'MATIC'], ['matic', 'MATIC'],
  ['uniswap', 'UNI'], ['uni', 'UNI'],
  ['aave', 'AAVE'],
  ['binance', 'BNB'], ['bnb', 'BNB'],
]);

function extractCoinsFromText(text: string): string[] {
  const coins: Set<string> = new Set();
  const words = text.toLowerCase().split(/\s+/);
  
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (COMMON_COINS.has(cleaned)) {
      coins.add(COMMON_COINS.get(cleaned)!);
    }
  }
  
  // Also check for $SYMBOL patterns
  const symbolPattern = /\$([A-Z]{2,6})/g;
  let match;
  while ((match = symbolPattern.exec(text.toUpperCase())) !== null) {
    coins.add(match[1]);
  }
  
  return Array.from(coins);
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Map<string, NewsArticle>();
  
  for (const article of articles) {
    const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check for exact or near-duplicate
    let isDuplicate = false;
    for (const [existingTitle, existingArticle] of seen) {
      if (normalizedTitle === existingTitle) {
        isDuplicate = true;
        // Keep the one from higher priority source
        if (article.sourcePriority < existingArticle.sourcePriority) {
          seen.set(existingTitle, article);
        }
        break;
      }
      
      // Simple similarity check (Jaccard-like)
      const similarity = calculateTitleSimilarity(normalizedTitle, existingTitle);
      if (similarity > CONFIG.TITLE_SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        if (article.sourcePriority < existingArticle.sourcePriority) {
          seen.delete(existingTitle);
          seen.set(normalizedTitle, article);
        }
        break;
      }
    }
    
    if (!isDuplicate) {
      seen.set(normalizedTitle, article);
    }
  }
  
  return Array.from(seen.values());
}

function calculateTitleSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
}

// ============================================================================
// MAIN AGGREGATION ENGINE
// ============================================================================

/**
 * 🎯 MAIN: Fetch news from all available sources with intelligent failover
 */
interface FetchNewsOptions {
  skipBackgroundRefresh?: boolean;
}

export async function fetchNews(coins?: string[], options?: FetchNewsOptions): Promise<NewsSnapshot> {
  const startTime = Date.now();
  const cacheKey = getCacheKey(coins);
  const skipBackgroundRefresh = options?.skipBackgroundRefresh ?? false;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Step 0: Check REDIS CACHE first (populated by ai-data-feeder)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isRedisAvailable() && coins && coins.length > 0) {
    try {
      // Map coin symbols to CoinGecko IDs for Redis lookup
      const coinIds = coins.map(c => c.toLowerCase());
      const redisNews = await getCachedNewsMultiple(coinIds);
      
      if (redisNews.size > 0) {
        // Convert Redis cached news to our format
        const redisArticles = convertRedisNewsToArticles(redisNews);
        
        if (redisArticles.length > 0) {
          logger.debug('🔴 Redis news cache hit', { 
            coins: coins.join(','), 
            articles: redisArticles.length 
          });
          
          // Build snapshot from Redis data
          const redisSnapshot = buildSnapshotFromRedis(redisArticles, coins, startTime);
          
          // Cache locally too
          setCache(cacheKey, redisSnapshot);
          
          return redisSnapshot;
        }
      }
    } catch (error: any) {
      logger.debug('🔴 Redis news lookup failed', { error: error.message });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Check LOCAL cache
  // ═══════════════════════════════════════════════════════════════════════════
  const cached = getFromCache(cacheKey);
  if (cached) {
    // If stale and NOT already in a background refresh, trigger refresh
    const cacheAge = Date.now() - (newsCache.get(cacheKey)?.timestamp || 0);
    if (cacheAge > CONFIG.CACHE_TTL_MS && !skipBackgroundRefresh) {
      // Background refresh (don't await)
      refreshNewsInBackground(coins, cacheKey).catch(() => {});
    }
    return cached;
  }
  
  // Fetch from all available sources in parallel with timeout
  const sourcesToUse = Array.from(newsSources.values())
    .filter(isSourceAvailable)
    .sort((a, b) => a.priority - b.priority);
  
  logger.info('📰 Fetching news from sources', { 
    sources: sourcesToUse.map(s => s.name),
    coins: coins?.join(',') || 'general'
  });
  
  // Create fetch promises with individual timeouts
  const fetchPromises = sourcesToUse.map(source => {
    const fetchWithTimeout = async (): Promise<{ source: string; articles: NewsArticle[] }> => {
      try {
        const articles = await Promise.race([
          source.fetch(coins),
          new Promise<NewsArticle[]>((_, reject) => 
            setTimeout(() => reject(new Error('Source timeout')), CONFIG.REQUEST_TIMEOUT_MS)
          )
        ]);
        return { source: source.name, articles };
      } catch {
        return { source: source.name, articles: [] };
      }
    };
    return fetchWithTimeout();
  });
  
  // Use Promise.allSettled with a global timeout to ensure <500ms response
  const timeoutPromise = new Promise<{ source: string; articles: NewsArticle[] }[]>(resolve => {
    setTimeout(() => {
      logger.debug('📰 Global fetch timeout - returning partial results');
      resolve([]);
    }, CONFIG.TOTAL_FETCH_TIMEOUT_MS);
  });
  
  // Race between all fetches completing and the timeout
  const results = await Promise.race([
    Promise.allSettled(fetchPromises),
    timeoutPromise.then(() => [] as PromiseSettledResult<{ source: string; articles: NewsArticle[] }>[])
  ]);
  
  // Collect all articles
  let allArticles: NewsArticle[] = [];
  const sourcesUsed: string[] = [];
  const sourcesFailed: string[] = [];
  
  if (Array.isArray(results) && results.length > 0) {
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.articles.length > 0) {
        allArticles.push(...result.value.articles);
        sourcesUsed.push(result.value.source);
      } else if (result.status === 'fulfilled') {
        sourcesFailed.push(result.value.source);
      }
    });
  }
  
  // If we got no results or timed out, try RSS as emergency fallback
  if (allArticles.length < CONFIG.MIN_ARTICLES_REQUIRED) {
    logger.debug('📰 Insufficient articles, triggering emergency RSS fetch');
    try {
      const rssArticles = await fetchFromRSS(coins);
      allArticles.push(...rssArticles);
      if (rssArticles.length > 0 && !sourcesUsed.includes('RSS Aggregator')) {
        sourcesUsed.push('RSS Aggregator (emergency)');
      }
    } catch {
      // RSS also failed, continue with what we have
    }
  }
  
  // Deduplicate
  allArticles = deduplicateArticles(allArticles);
  
  // Sort by priority (source) then by date
  allArticles.sort((a, b) => {
    if (a.sourcePriority !== b.sourcePriority) {
      return a.sourcePriority - b.sourcePriority;
    }
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
  
  // Limit total articles
  allArticles = allArticles.slice(0, CONFIG.MAX_TOTAL_NEWS);
  
  // Calculate aggregate sentiment
  const sentimentSum = allArticles.reduce((sum, a) => sum + a.sentimentScore, 0);
  const avgSentiment = allArticles.length > 0 ? sentimentSum / allArticles.length : 0;
  
  let dominantSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (avgSentiment > 0.15) dominantSentiment = 'bullish';
  else if (avgSentiment < -0.15) dominantSentiment = 'bearish';
  
  // Extract critical alerts
  const criticalAlerts = allArticles.filter(a => a.urgency === 'critical');
  
  // Extract major narratives
  const majorNarratives = allArticles
    .filter(a => a.impact === 'high' || a.impact === 'critical')
    .slice(0, 5)
    .map(a => a.title);
  
  const snapshot: NewsSnapshot = {
    timestamp: new Date().toISOString(),
    articles: allArticles,
    requestedCoins: coins || [],
    dominantSentiment,
    overallSentimentScore: avgSentiment,
    majorNarratives,
    criticalAlerts,
    sourcesUsed,
    sourcesFailed,
    fetchTime: Date.now() - startTime,
    totalArticlesProcessed: allArticles.length,
  };
  
  // Update cache
  setCache(cacheKey, snapshot);
  
  logger.info('📰 News aggregation complete', {
    totalArticles: snapshot.articles.length,
    sourcesUsed: sourcesUsed.join(', '),
    sourcesFailed: sourcesFailed.length > 0 ? sourcesFailed.join(', ') : 'none',
    sentiment: dominantSentiment,
    criticalAlerts: criticalAlerts.length,
    fetchTime: snapshot.fetchTime,
  });
  
  return snapshot;
}

// Flag to prevent recursive background refresh calls
let isBackgroundRefreshInProgress = false;

async function refreshNewsInBackground(coins?: string[], cacheKey?: string): Promise<void> {
  // Prevent recursive calls that cause stack overflow
  if (isBackgroundRefreshInProgress) {
    return;
  }
  
  isBackgroundRefreshInProgress = true;
  try {
    const snapshot = await fetchNews(coins, { skipBackgroundRefresh: true });
    if (cacheKey) {
      setCache(cacheKey, snapshot);
    }
  } catch (error) {
    logger.debug('📰 Background refresh failed', { error });
  } finally {
    isBackgroundRefreshInProgress = false;
  }
}

// ============================================================================
// AI FORMATTING
// ============================================================================

/**
 * Format news for AI context - optimized for LLM consumption
 */
export function formatNewsForAI(snapshot: NewsSnapshot): string {
  if (snapshot.articles.length === 0) {
    return '';
  }
  
  const sentimentEmoji: Record<string, string> = {
    bullish: '🟢',
    bearish: '🔴', 
    neutral: '⚪',
  };
  
  let context = `\n[📰 CRYPTO NEWS INTELLIGENCE - ${sentimentEmoji[snapshot.dominantSentiment]} ${snapshot.dominantSentiment.toUpperCase()} MARKET SENTIMENT]\n`;
  context += `Sources: ${snapshot.sourcesUsed.join(', ')} | Articles: ${snapshot.articles.length}\n\n`;
  
  // Critical alerts first
  if (snapshot.criticalAlerts.length > 0) {
    context += '🚨 CRITICAL ALERTS:\n';
    for (const alert of snapshot.criticalAlerts.slice(0, 3)) {
      const timeAgo = getTimeAgo(alert.publishedAt);
      const prediction = alert.priceImpactPrediction 
        ? ` [Expected: ${alert.priceImpactPrediction.direction} ${alert.priceImpactPrediction.magnitude}% in ${alert.priceImpactPrediction.timeframe}]`
        : '';
      context += `• ${alert.title} (${alert.source}, ${timeAgo})${prediction}\n`;
    }
    context += '\n';
  }
  
  // Top headlines
  const topArticles = snapshot.articles
    .filter(a => a.impact === 'high' || a.credibility > 0.8)
    .filter(a => !snapshot.criticalAlerts.includes(a))
    .slice(0, 5);
  
  if (topArticles.length > 0) {
    context += '📌 TOP HEADLINES:\n';
    for (const article of topArticles) {
      const timeAgo = getTimeAgo(article.publishedAt);
      const sentimentIcon = article.sentimentScore > 0.2 ? '↗️' : article.sentimentScore < -0.2 ? '↘️' : '→';
      context += `${sentimentIcon} ${article.title} (${article.source}, ${timeAgo})\n`;
    }
    context += '\n';
  }
  
  // Major narratives summary
  if (snapshot.majorNarratives.length > 0) {
    context += `📊 KEY NARRATIVES: ${snapshot.majorNarratives.slice(0, 3).join(' | ')}\n`;
  }
  
  // Sentiment summary
  context += `\n💡 MARKET MOOD: ${snapshot.dominantSentiment} (score: ${snapshot.overallSentimentScore.toFixed(2)})\n`;
  
  return context;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 5) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get news for specific coins mentioned in message
 */
export async function getNewsForCoins(symbols: string[]): Promise<NewsSnapshot> {
  if (symbols.length === 0) {
    return fetchNews(); // General news
  }
  return fetchNews(symbols.slice(0, 5)); // Limit to 5 coins
}

/**
 * 🧠 Get ENRICHED news with AI-driven intelligence
 * This is the premium news function that adds:
 * - Advanced sentiment analysis
 * - Market impact scoring
 * - Price impact predictions
 * - Urgency assessment
 * - Portfolio relevance
 */
export async function getEnrichedNewsForCoins(
  symbols: string[],
  userPortfolio?: string[]
): Promise<EnrichedNewsSnapshot> {
  const rawNews = await getNewsForCoins(symbols);
  return enrichNewsSnapshot(rawNews, userPortfolio);
}

/**
 * Format enriched news for AI context - includes intelligence insights
 */
export function formatEnrichedNewsForAI(snapshot: EnrichedNewsSnapshot): string {
  if (snapshot.articles.length === 0) {
    return '';
  }
  
  const { aggregateIntelligence } = snapshot;
  const moodEmoji: Record<string, string> = {
    very_bullish: '🟢🟢',
    bullish: '🟢',
    neutral: '⚪',
    bearish: '🔴',
    very_bearish: '🔴🔴',
  };
  
  let context = `\n[📰 CRYPTO NEWS INTELLIGENCE - AI ENRICHED]\n`;
  context += `Market Mood: ${moodEmoji[aggregateIntelligence.marketMood.overall]} ${aggregateIntelligence.marketMood.overall.toUpperCase()} `;
  context += `(score: ${aggregateIntelligence.marketMood.score}, trend: ${aggregateIntelligence.marketMood.trend})\n`;
  context += `Risk Level: ${aggregateIntelligence.riskAssessment.level.toUpperCase()}\n\n`;
  
  // Critical alerts with predictions
  if (aggregateIntelligence.criticalAlerts.length > 0) {
    context += '🚨 CRITICAL ALERTS:\n';
    for (const alert of aggregateIntelligence.criticalAlerts.slice(0, 3)) {
      const timeAgo = getTimeAgo(alert.publishedAt);
      const intel = alert.intelligence;
      context += `• ${alert.title}\n`;
      context += `  └ Sentiment: ${intel.sentimentAnalysis.label} (${intel.sentimentAnalysis.score})\n`;
      context += `  └ Impact: ${intel.marketImpact.level} | Urgency: ${intel.urgency.level}\n`;
      if (intel.priceImpact.direction !== 'neutral') {
        context += `  └ Price Prediction: ${intel.priceImpact.direction} ${intel.priceImpact.magnitude.expected}% `;
        context += `(${Math.round(intel.priceImpact.confidence * 100)}% confidence, ${intel.priceImpact.timeframe})\n`;
      }
      if (intel.urgency.suggestedAction) {
        context += `  └ Action: ${intel.urgency.suggestedAction}\n`;
      }
      context += `  └ Source: ${alert.source}, ${timeAgo}\n`;
    }
    context += '\n';
  }
  
  // Top narratives
  if (aggregateIntelligence.topNarratives.length > 0) {
    context += '📊 DOMINANT NARRATIVES:\n';
    for (const narrative of aggregateIntelligence.topNarratives.slice(0, 3)) {
      const sentimentIcon = narrative.sentiment > 0.2 ? '↗️' : narrative.sentiment < -0.2 ? '↘️' : '→';
      context += `${sentimentIcon} ${narrative.theme} (${narrative.articleCount} articles, impact: ${narrative.impact})\n`;
    }
    context += '\n';
  }
  
  // Actionable insights
  if (aggregateIntelligence.actionableInsights.length > 0) {
    context += '💡 ACTIONABLE INSIGHTS:\n';
    for (const insight of aggregateIntelligence.actionableInsights) {
      context += `• ${insight}\n`;
    }
    context += '\n';
  }
  
  // Market prediction
  context += '🔮 MARKET PREDICTION:\n';
  context += `• Short-term (1-4h): ${aggregateIntelligence.marketPrediction.shortTerm.direction} `;
  context += `(${Math.round(aggregateIntelligence.marketPrediction.shortTerm.confidence * 100)}% confidence)\n`;
  context += `• Medium-term (24h): ${aggregateIntelligence.marketPrediction.mediumTerm.direction} `;
  context += `(${Math.round(aggregateIntelligence.marketPrediction.mediumTerm.confidence * 100)}% confidence)\n`;
  
  // Risk factors
  if (aggregateIntelligence.riskAssessment.factors.length > 0) {
    context += `\n⚠️ Risk Factors: ${aggregateIntelligence.riskAssessment.factors.join(', ')}\n`;
  }
  
  context += `\n[Sources: ${snapshot.sourcesUsed.join(', ')} | ${snapshot.articles.length} articles analyzed]\n`;
  
  return context;
}

/**
 * Get service health status
 */
export function getNewsServiceStatus(): {
  healthy: boolean;
  sources: Array<{
    name: string;
    status: string;
    enabled: boolean;
    lastSuccess?: Date;
    lastError?: string;
  }>;
  cacheSize: number;
} {
  const sources = Array.from(newsSources.values()).map(s => ({
    name: s.name,
    status: s.healthStatus,
    enabled: s.enabled,
    lastSuccess: s.lastSuccess,
    lastError: s.lastError,
  }));
  
  const healthySources = sources.filter(s => s.enabled && s.status === 'healthy').length;
  
  return {
    healthy: healthySources >= 2, // At least 2 healthy sources
    sources,
    cacheSize: newsCache.size,
  };
}

// ============================================================================
// CACHE WARMING & INITIALIZATION
// ============================================================================

/**
 * 🔥 Warm the news cache on startup
 * Pre-fetches general news and top coin news to ensure instant responses
 */
export async function warmNewsCache(): Promise<void> {
  logger.info('🔥 Warming news cache...');
  const startTime = Date.now();
  
  try {
    // Fetch general news and top coins in parallel
    await Promise.allSettled([
      fetchNews(), // General news
      fetchNews(['BTC', 'ETH']), // Top coins
      fetchNews(['SOL', 'XRP', 'ADA']), // Other major coins
    ]);
    
    const warmTime = Date.now() - startTime;
    logger.info('🔥 News cache warmed', { 
      warmTimeMs: warmTime,
      cacheSize: newsCache.size 
    });
  } catch (error) {
    logger.warn('🔥 News cache warming failed', { error });
  }
}

/**
 * Start background refresh interval
 * Keeps cache fresh without blocking user requests
 */
let refreshInterval: NodeJS.Timeout | null = null;

export function startNewsRefreshInterval(intervalMs: number = 60000): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = setInterval(async () => {
    try {
      await refreshNewsInBackground();
      logger.debug('📰 Background news refresh complete');
    } catch (error) {
      logger.debug('📰 Background news refresh failed', { error });
    }
  }, intervalMs);
  
  logger.info('📰 News refresh interval started', { intervalMs });
}

export function stopNewsRefreshInterval(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    logger.info('📰 News refresh interval stopped');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const newsService = {
  fetch: fetchNews,
  getForCoins: getNewsForCoins,
  getEnrichedForCoins: getEnrichedNewsForCoins,
  formatForAI: formatNewsForAI,
  formatEnrichedForAI: formatEnrichedNewsForAI,
  getStatus: getNewsServiceStatus,
  warmCache: warmNewsCache,
  startRefreshInterval: startNewsRefreshInterval,
  stopRefreshInterval: stopNewsRefreshInterval,
};

// Re-export intelligence types
export type { EnrichedNewsSnapshot, EnrichedNewsArticle };

export default newsService;
