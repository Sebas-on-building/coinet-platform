/**
 * 🐦 Twitter/X Service - REAL Social Intelligence
 * 
 * Fetches real-time crypto sentiment from Twitter/X using official API v2.
 * 
 * FEATURES:
 * - Real tweet volume tracking
 * - Crypto influencer monitoring  
 * - Hashtag trend analysis
 * - Sentiment from actual tweets
 * - Cashtag tracking ($BTC, $ETH, etc.)
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Twitter API v2
  BASE_URL: 'https://api.twitter.com/2',
  
  // Credentials (from environment)
  API_KEY: process.env.TWITTER_API_KEY || '',
  API_SECRET: process.env.TWITTER_API_SECRET || '',
  BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN || '',
  
  // Rate limits (Twitter free tier: 10 requests/15 min for search)
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS_PER_WINDOW: 10,
  
  // Cache
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  
  // Request settings
  TIMEOUT_MS: 10000,
};

// ============================================================================
// TYPES
// ============================================================================

export interface TwitterMetrics {
  symbol: string;
  tweetCount: number;
  uniqueAuthors: number;
  impressions: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // 0-100
  topTweets: TweetSummary[];
  influencerMentions: number;
  hashtags: string[];
  lastUpdated: Date;
}

export interface TweetSummary {
  id: string;
  text: string;
  authorUsername: string;
  authorFollowers: number;
  likes: number;
  retweets: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  createdAt: Date;
}

export interface TwitterContext {
  isAvailable: boolean;
  metrics: TwitterMetrics[];
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  trendingCoins: string[];
  contextForAI: string;
}

interface TwitterCache {
  data: TwitterContext;
  timestamp: number;
}

// ============================================================================
// STATE
// ============================================================================

let bearerToken: string | null = null;
let twitterCache: TwitterCache | null = null;
let requestCount = 0;
let windowStart = Date.now();

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Get Bearer Token using OAuth 2.0 Client Credentials
 */
async function getBearerToken(): Promise<string | null> {
  // If already configured via env, use it
  if (CONFIG.BEARER_TOKEN) {
    return CONFIG.BEARER_TOKEN;
  }
  
  // If we have a cached token, use it
  if (bearerToken) {
    return bearerToken;
  }
  
  // Generate from API Key + Secret
  if (!CONFIG.API_KEY || !CONFIG.API_SECRET) {
    logger.warn('🐦 Twitter API credentials not configured');
    return null;
  }
  
  try {
    const credentials = Buffer.from(`${CONFIG.API_KEY}:${CONFIG.API_SECRET}`).toString('base64');
    
    const response = await axios.post(
      'https://api.twitter.com/oauth2/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: CONFIG.TIMEOUT_MS,
      }
    );
    
    if (response.data?.access_token) {
      bearerToken = response.data.access_token;
      logger.info('🐦 Twitter Bearer Token obtained successfully');
      return bearerToken;
    }
    
    return null;
  } catch (error: any) {
    logger.error('🐦 Failed to get Twitter Bearer Token', { 
      error: error.response?.data || error.message 
    });
    return null;
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Reset window if expired
  if (now - windowStart > CONFIG.RATE_LIMIT_WINDOW_MS) {
    windowStart = now;
    requestCount = 0;
  }
  
  // Check if under limit
  if (requestCount >= CONFIG.MAX_REQUESTS_PER_WINDOW) {
    logger.warn('🐦 Twitter rate limit reached', { 
      requests: requestCount, 
      windowRemainingMs: CONFIG.RATE_LIMIT_WINDOW_MS - (now - windowStart) 
    });
    return false;
  }
  
  requestCount++;
  return true;
}

// ============================================================================
// TWITTER API CALLS
// ============================================================================

/**
 * Search recent tweets for a crypto symbol
 */
async function searchTweets(symbol: string, maxResults: number = 100): Promise<any[]> {
  const token = await getBearerToken();
  if (!token) return [];
  
  if (!checkRateLimit()) return [];
  
  try {
    // Build query for crypto cashtag and symbol
    const query = `($${symbol} OR #${symbol}) lang:en -is:retweet`;
    
    const response = await axios.get(`${CONFIG.BASE_URL}/tweets/search/recent`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        query,
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,public_metrics,author_id',
        'user.fields': 'username,public_metrics',
        'expansions': 'author_id',
      },
      timeout: CONFIG.TIMEOUT_MS,
    });
    
    if (response.data?.data) {
      logger.debug('🐦 Twitter search successful', { 
        symbol, 
        count: response.data.data.length 
      });
      return response.data.data;
    }
    
    return [];
  } catch (error: any) {
    logger.debug('🐦 Twitter search failed', { 
      symbol, 
      error: error.response?.data?.detail || error.message 
    });
    return [];
  }
}

/**
 * Get tweet counts for a symbol (requires Elevated access)
 */
async function getTweetCounts(symbol: string): Promise<number> {
  const token = await getBearerToken();
  if (!token) return 0;
  
  if (!checkRateLimit()) return 0;
  
  try {
    const query = `($${symbol} OR #${symbol}) lang:en`;
    
    const response = await axios.get(`${CONFIG.BASE_URL}/tweets/counts/recent`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        query,
        granularity: 'day',
      },
      timeout: CONFIG.TIMEOUT_MS,
    });
    
    if (response.data?.meta?.total_tweet_count) {
      return response.data.meta.total_tweet_count;
    }
    
    return 0;
  } catch (error: any) {
    // This endpoint requires Elevated access, fall back to search count
    logger.debug('🐦 Tweet counts unavailable (requires Elevated access)', { symbol });
    return 0;
  }
}

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

/**
 * Simple keyword-based sentiment analysis
 * TODO: Replace with ML model for production
 */
function analyzeTweetSentiment(text: string): { sentiment: 'bullish' | 'bearish' | 'neutral'; score: number } {
  const lowerText = text.toLowerCase();
  
  const bullishWords = [
    'moon', 'bullish', 'buy', 'long', 'pump', 'rocket', '🚀', 'ath', 'breakout',
    'accumulate', 'hodl', 'diamond', 'hands', 'lambo', 'gains', 'up', 'surge',
    'rally', 'green', 'profit', 'winning', 'soaring', 'exploding', 'massive'
  ];
  
  const bearishWords = [
    'dump', 'bearish', 'sell', 'short', 'crash', 'rekt', 'scam', 'rug',
    'down', 'red', 'loss', 'falling', 'dead', 'worthless', 'collapse',
    'plunge', 'bleeding', 'fear', 'panic', 'exit', 'warning', 'avoid'
  ];
  
  let bullishScore = 0;
  let bearishScore = 0;
  
  for (const word of bullishWords) {
    if (lowerText.includes(word)) bullishScore++;
  }
  
  for (const word of bearishWords) {
    if (lowerText.includes(word)) bearishScore++;
  }
  
  const total = bullishScore + bearishScore;
  if (total === 0) {
    return { sentiment: 'neutral', score: 50 };
  }
  
  const ratio = bullishScore / total;
  const score = Math.round(ratio * 100);
  
  if (score >= 60) return { sentiment: 'bullish', score };
  if (score <= 40) return { sentiment: 'bearish', score };
  return { sentiment: 'neutral', score };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get Twitter metrics for a crypto symbol
 */
export async function getTwitterMetrics(symbol: string): Promise<TwitterMetrics | null> {
  try {
    const tweets = await searchTweets(symbol, 100);
    
    if (tweets.length === 0) {
      return null;
    }
    
    // Analyze tweets
    let totalScore = 0;
    const sentiments: ('bullish' | 'bearish' | 'neutral')[] = [];
    const topTweets: TweetSummary[] = [];
    const authors = new Set<string>();
    const hashtags = new Set<string>();
    
    for (const tweet of tweets) {
      const analysis = analyzeTweetSentiment(tweet.text);
      totalScore += analysis.score;
      sentiments.push(analysis.sentiment);
      authors.add(tweet.author_id);
      
      // Extract hashtags
      const hashtagMatches = tweet.text.match(/#\w+/g);
      if (hashtagMatches) {
        hashtagMatches.forEach((h: string) => hashtags.add(h));
      }
      
      // Add to top tweets if significant engagement
      const metrics = tweet.public_metrics || {};
      if (metrics.like_count > 10 || metrics.retweet_count > 5) {
        topTweets.push({
          id: tweet.id,
          text: tweet.text.substring(0, 200),
          authorUsername: tweet.author_id, // Would need expansion for username
          authorFollowers: 0, // Would need expansion
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
          sentiment: analysis.sentiment,
          createdAt: new Date(tweet.created_at),
        });
      }
    }
    
    // Calculate averages
    const avgScore = Math.round(totalScore / tweets.length);
    const bullishCount = sentiments.filter(s => s === 'bullish').length;
    const bearishCount = sentiments.filter(s => s === 'bearish').length;
    
    let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (bullishCount > bearishCount * 1.5) overallSentiment = 'bullish';
    else if (bearishCount > bullishCount * 1.5) overallSentiment = 'bearish';
    
    // Count influencer mentions (tweets with high engagement)
    const influencerMentions = topTweets.filter(t => t.likes > 100 || t.retweets > 50).length;
    
    return {
      symbol: symbol.toUpperCase(),
      tweetCount: tweets.length,
      uniqueAuthors: authors.size,
      impressions: tweets.reduce((sum, t) => sum + (t.public_metrics?.impression_count || 0), 0),
      sentiment: overallSentiment,
      sentimentScore: avgScore,
      topTweets: topTweets.slice(0, 5),
      influencerMentions,
      hashtags: Array.from(hashtags).slice(0, 10),
      lastUpdated: new Date(),
    };
  } catch (error: any) {
    logger.error('🐦 Failed to get Twitter metrics', { symbol, error: error.message });
    return null;
  }
}

/**
 * Get Twitter context for multiple coins (for AI)
 */
export async function getTwitterContextForAI(symbols: string[] = ['BTC', 'ETH', 'SOL']): Promise<TwitterContext> {
  // Check cache
  if (twitterCache && Date.now() - twitterCache.timestamp < CONFIG.CACHE_TTL_MS) {
    logger.debug('🐦 Twitter cache hit');
    return twitterCache.data;
  }
  
  // Check if configured
  if (!CONFIG.API_KEY && !CONFIG.BEARER_TOKEN) {
    return {
      isAvailable: false,
      metrics: [],
      overallSentiment: 'neutral',
      trendingCoins: [],
      contextForAI: '',
    };
  }
  
  try {
    // Fetch metrics for each symbol (rate limited)
    const metricsPromises = symbols.slice(0, 3).map(s => getTwitterMetrics(s));
    const metricsResults = await Promise.all(metricsPromises);
    const metrics = metricsResults.filter((m): m is TwitterMetrics => m !== null);
    
    if (metrics.length === 0) {
      return {
        isAvailable: false,
        metrics: [],
        overallSentiment: 'neutral',
        trendingCoins: [],
        contextForAI: '\n[🐦 TWITTER/X]\nTwitter data temporarily unavailable.\n',
      };
    }
    
    // Calculate overall sentiment
    const avgScore = metrics.reduce((sum, m) => sum + m.sentimentScore, 0) / metrics.length;
    let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (avgScore >= 60) overallSentiment = 'bullish';
    else if (avgScore <= 40) overallSentiment = 'bearish';
    
    // Find trending (highest tweet count)
    const trendingCoins = metrics
      .sort((a, b) => b.tweetCount - a.tweetCount)
      .slice(0, 3)
      .map(m => m.symbol);
    
    // Format for AI
    const sentimentEmoji = {
      bullish: '📈',
      bearish: '📉',
      neutral: '➡️',
    };
    
    let contextForAI = `\n[🐦 TWITTER/X LIVE SENTIMENT]\n`;
    contextForAI += `Overall mood: ${sentimentEmoji[overallSentiment]} ${overallSentiment.toUpperCase()}\n`;
    
    if (trendingCoins.length > 0) {
      contextForAI += `Most discussed: ${trendingCoins.join(', ')}\n`;
    }
    
    for (const m of metrics) {
      contextForAI += `${m.symbol}: ${m.tweetCount} tweets, ${sentimentEmoji[m.sentiment]} ${m.sentiment} (${m.sentimentScore}/100)\n`;
    }
    
    // Add notable tweets
    const allTopTweets = metrics.flatMap(m => m.topTweets).sort((a, b) => b.likes - a.likes);
    if (allTopTweets.length > 0) {
      contextForAI += `\nTop discussions:\n`;
      for (const tweet of allTopTweets.slice(0, 2)) {
        contextForAI += `- "${tweet.text.substring(0, 100)}..." (${tweet.likes} likes)\n`;
      }
    }
    
    const context: TwitterContext = {
      isAvailable: true,
      metrics,
      overallSentiment,
      trendingCoins,
      contextForAI,
    };
    
    // Update cache
    twitterCache = { data: context, timestamp: Date.now() };
    
    logger.info('🐦 Twitter context updated', {
      symbols: metrics.map(m => m.symbol),
      overall: overallSentiment,
    });
    
    return context;
  } catch (error: any) {
    logger.error('🐦 Failed to get Twitter context', { error: error.message });
    return {
      isAvailable: false,
      metrics: [],
      overallSentiment: 'neutral',
      trendingCoins: [],
      contextForAI: '\n[🐦 TWITTER/X]\nTwitter data temporarily unavailable.\n',
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const twitterService = {
  getMetrics: getTwitterMetrics,
  getContext: getTwitterContextForAI,
};

export default twitterService;

