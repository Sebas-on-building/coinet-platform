/**
 * 📰 News Service - Phase 2 Divine Integration
 * 
 * Real-time crypto news aggregation from multiple sources.
 * 
 * SOURCES:
 * - CryptoPanic API (free tier: 5 req/min)
 * - Direct RSS feeds (backup)
 * 
 * FEATURES:
 * - Multi-source aggregation
 * - Coin-specific filtering
 * - Sentiment classification (bullish/bearish/neutral)
 * - Impact scoring
 * - Credibility rating
 * - Smart caching
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // CryptoPanic API (free tier)
  CRYPTOPANIC_URL: 'https://cryptopanic.com/api/v1/posts/',
  CRYPTOPANIC_AUTH_TOKEN: process.env.CRYPTOPANIC_API_KEY || '', // Optional, works without
  
  // Alternative news sources
  COINDESK_RSS: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  
  // Rate limiting
  RATE_LIMIT_MS: 12000, // 5 requests per minute = 12 seconds between
  
  // Cache
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  
  // Limits
  MAX_NEWS_PER_COIN: 5,
  MAX_TOTAL_NEWS: 15,
};

// ============================================================================
// TYPES
// ============================================================================

export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  publishedAt: Date;
  coins: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
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
  impact: 'low' | 'medium' | 'high';
  credibility: number; // 0-1
}

export interface NewsSnapshot {
  timestamp: string;
  articles: NewsArticle[];
  requestedCoins: string[];
  dominantSentiment: 'bullish' | 'bearish' | 'neutral';
  majorNarratives: string[];
  fetchTime: number;
}

interface NewsCache {
  data: NewsSnapshot;
  timestamp: number;
}

// ============================================================================
// CACHE & RATE LIMITER
// ============================================================================

let newsCache: Map<string, NewsCache> = new Map();
let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < CONFIG.RATE_LIMIT_MS) {
    const waitTime = CONFIG.RATE_LIMIT_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

// ============================================================================
// CRYPTOPANIC INTEGRATION
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
  try {
    await waitForRateLimit();
    
    let url = `${CONFIG.CRYPTOPANIC_URL}?public=true`;
    
    // Add auth token if available
    if (CONFIG.CRYPTOPANIC_AUTH_TOKEN) {
      url += `&auth_token=${CONFIG.CRYPTOPANIC_AUTH_TOKEN}`;
    }
    
    // Filter by currencies if specified
    if (coins && coins.length > 0) {
      url += `&currencies=${coins.join(',')}`;
    }
    
    // Get only news (not media)
    url += '&kind=news';
    
    const response = await axios.get<CryptoPanicResponse>(url, {
      timeout: 8000,
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.data?.results) {
      return [];
    }
    
    const articles: NewsArticle[] = response.data.results.map(post => {
      const sentiment = analyzeSentiment(post);
      const credibility = assessCredibility(post.source.domain, post.source.title);
      const impact = assessImpact(post, credibility);
      
      return {
        id: `cp-${post.id}`,
        title: post.title,
        url: post.url,
        source: post.source.title,
        publishedAt: new Date(post.published_at),
        coins: post.currencies?.map(c => c.code.toUpperCase()) || [],
        sentiment,
        votes: post.votes,
        impact,
        credibility,
      };
    });
    
    logger.debug('📰 CryptoPanic fetch', { 
      count: articles.length, 
      coins: coins?.join(',') || 'all' 
    });
    
    return articles;
  } catch (error: any) {
    logger.warn('📰 CryptoPanic fetch failed', { error: error.message });
    return [];
  }
}

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

function analyzeSentiment(post: CryptoPanicPost): 'bullish' | 'bearish' | 'neutral' {
  const { votes } = post;
  
  // Use community votes as primary signal
  const positiveSignal = votes.positive + votes.liked + votes.important;
  const negativeSignal = votes.negative + votes.disliked + votes.toxic;
  
  // Also analyze title for keywords
  const title = post.title.toLowerCase();
  
  const bullishWords = [
    'surge', 'soar', 'rally', 'bullish', 'gain', 'rise', 'high', 'record',
    'breakout', 'pump', 'moon', 'adoption', 'institutional', 'etf approve',
    'partnership', 'launch', 'upgrade', 'breakthrough'
  ];
  
  const bearishWords = [
    'crash', 'drop', 'fall', 'bearish', 'decline', 'plunge', 'dump', 'sink',
    'low', 'fear', 'sell', 'hack', 'exploit', 'rug', 'scam', 'ban', 
    'regulation', 'lawsuit', 'sec', 'investigation'
  ];
  
  let bullishCount = bullishWords.filter(w => title.includes(w)).length;
  let bearishCount = bearishWords.filter(w => title.includes(w)).length;
  
  // Combine signals
  const totalBullish = positiveSignal + bullishCount * 10;
  const totalBearish = negativeSignal + bearishCount * 10;
  
  if (totalBullish > totalBearish * 1.5) return 'bullish';
  if (totalBearish > totalBullish * 1.5) return 'bearish';
  return 'neutral';
}

function assessCredibility(domain: string, source: string): number {
  const highCredibility = [
    'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com',
    'coindesk.com', 'theblock.co', 'decrypt.co'
  ];
  
  const mediumCredibility = [
    'cointelegraph.com', 'bitcoinmagazine.com', 'cryptonews.com',
    'u.today', 'beincrypto.com', 'newsbtc.com'
  ];
  
  const domainLower = domain.toLowerCase();
  
  if (highCredibility.some(d => domainLower.includes(d))) return 0.9;
  if (mediumCredibility.some(d => domainLower.includes(d))) return 0.7;
  return 0.5;
}

function assessImpact(post: CryptoPanicPost, credibility: number): 'low' | 'medium' | 'high' {
  const title = post.title.toLowerCase();
  const totalVotes = Object.values(post.votes).reduce((a, b) => a + b, 0);
  
  const highImpactKeywords = [
    'etf', 'sec', 'regulation', 'institutional', 'billion', 'major',
    'breaking', 'hack', 'exploit', 'ban', 'approval'
  ];
  
  const hasHighImpactKeyword = highImpactKeywords.some(k => title.includes(k));
  const hasHighEngagement = totalVotes > 50 || post.votes.important > 10;
  
  if (hasHighImpactKeyword && (credibility > 0.8 || hasHighEngagement)) return 'high';
  if (hasHighImpactKeyword || hasHighEngagement || credibility > 0.8) return 'medium';
  return 'low';
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * 🎯 MAIN: Fetch news for specific coins or general crypto
 */
export async function fetchNews(coins?: string[]): Promise<NewsSnapshot> {
  const startTime = Date.now();
  const cacheKey = coins?.sort().join(',') || 'general';
  
  // Check cache
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS) {
    logger.debug('📰 News cache hit', { cacheKey });
    return cached.data;
  }
  
  // Fetch from CryptoPanic
  const articles = await fetchFromCryptoPanic(coins);
  
  // Analyze dominant sentiment
  const sentimentCounts = { bullish: 0, bearish: 0, neutral: 0 };
  articles.forEach(a => sentimentCounts[a.sentiment]++);
  
  let dominantSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (sentimentCounts.bullish > sentimentCounts.bearish * 1.3) {
    dominantSentiment = 'bullish';
  } else if (sentimentCounts.bearish > sentimentCounts.bullish * 1.3) {
    dominantSentiment = 'bearish';
  }
  
  // Extract major narratives from high-impact articles
  const majorNarratives = articles
    .filter(a => a.impact === 'high')
    .slice(0, 3)
    .map(a => a.title);
  
  const snapshot: NewsSnapshot = {
    timestamp: new Date().toISOString(),
    articles: articles.slice(0, CONFIG.MAX_TOTAL_NEWS),
    requestedCoins: coins || [],
    dominantSentiment,
    majorNarratives,
    fetchTime: Date.now() - startTime,
  };
  
  // Update cache
  newsCache.set(cacheKey, { data: snapshot, timestamp: Date.now() });
  
  logger.info('📰 News snapshot ready', {
    count: snapshot.articles.length,
    sentiment: dominantSentiment,
    narratives: majorNarratives.length,
    fetchTime: snapshot.fetchTime,
  });
  
  return snapshot;
}

/**
 * Format news for AI context
 */
export function formatNewsForAI(snapshot: NewsSnapshot): string {
  if (snapshot.articles.length === 0) {
    return '';
  }
  
  const sentimentEmoji = {
    bullish: '🟢',
    bearish: '🔴', 
    neutral: '⚪',
  };
  
  let context = `\n[📰 CRYPTO NEWS - ${sentimentEmoji[snapshot.dominantSentiment]} ${snapshot.dominantSentiment.toUpperCase()} SENTIMENT]\n`;
  
  // Top headlines
  const topArticles = snapshot.articles
    .filter(a => a.impact === 'high' || a.credibility > 0.7)
    .slice(0, 5);
  
  if (topArticles.length > 0) {
    context += 'Top Headlines:\n';
    for (const article of topArticles) {
      const timeAgo = getTimeAgo(article.publishedAt);
      const impactIcon = article.impact === 'high' ? '🔥' : article.impact === 'medium' ? '📌' : '';
      context += `${impactIcon} ${article.title} (${article.source}, ${timeAgo})\n`;
    }
  }
  
  // Major narratives
  if (snapshot.majorNarratives.length > 0) {
    context += `\nKey Narratives: ${snapshot.majorNarratives.slice(0, 2).join('; ')}\n`;
  }
  
  return context;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Get news for specific coins mentioned in message
 */
export async function getNewsForCoins(symbols: string[]): Promise<NewsSnapshot> {
  if (symbols.length === 0) {
    return fetchNews(); // General news
  }
  return fetchNews(symbols.slice(0, 5)); // Limit to 5 coins
}

// ============================================================================
// EXPORTS
// ============================================================================

export const newsService = {
  fetch: fetchNews,
  getForCoins: getNewsForCoins,
  formatForAI: formatNewsForAI,
};

export default newsService;

