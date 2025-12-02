/**
 * 🌐 SOCIAL INTELLIGENCE SERVICE - Multi-Platform Social Aggregation
 * 
 * Divine Perfection Step 1.2.1: Comprehensive social data aggregation
 * 
 * PLATFORMS SUPPORTED:
 * - Twitter/X (via official API or LunarCrush)
 * - Reddit (cryptocurrency, CryptoMarkets, WallStreetBets, etc.)
 * - Telegram (via public channel scraping)
 * - Discord (via webhook/bot integration)
 * - YouTube (crypto influencer tracking)
 * 
 * FEATURES:
 * - Unified SocialIntelligence structure
 * - Cross-platform sentiment aggregation
 * - Trending topic detection
 * - Influencer activity tracking
 * - Volume spike detection
 * - Narrative extraction
 * 
 * @module social-intelligence
 * @version 1.1.0 - Divine Perfection Step 1.2.1 + 1.2.2
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { 
  analyzeSentiment as advancedSentimentAnalysis,
  analyzeTrend,
  detectVirality,
  analyzeCommunity,
  aggregateSentiment,
  SentimentAnalysisResult,
  TrendAnalysisResult,
  ViralityIndicator,
  CommunityMetrics,
} from './sentiment-analysis';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Unified social mention from any platform
 */
export interface SocialMention {
  id: string;
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord' | 'youtube' | 'other';
  author: {
    username: string;
    displayName?: string;
    followers?: number;
    isInfluencer: boolean;
    influencerTier?: 'mega' | 'macro' | 'micro' | 'nano';
    verified?: boolean;
  };
  content: {
    text: string;
    truncated: boolean;
    url?: string;
    mediaType?: 'text' | 'image' | 'video' | 'link';
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
    engagementRate?: number;
  };
  sentiment: {
    label: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    score: number; // -1 to 1
    confidence: number; // 0 to 1
  };
  coins: string[]; // Mentioned coins
  hashtags: string[];
  cashtags: string[];
  timestamp: Date;
  source: {
    name: string;
    credibility: number; // 0 to 1
  };
}

/**
 * Platform-specific metrics
 */
export interface PlatformMetrics {
  platform: string;
  isAvailable: boolean;
  lastFetch?: Date;
  mentionCount: number;
  uniqueAuthors: number;
  totalEngagement: number;
  avgSentiment: number;
  topHashtags: string[];
  topInfluencers: string[];
  error?: string;
}

/**
 * Coin-specific social metrics
 */
export interface CoinSocialMetrics {
  symbol: string;
  name?: string;
  
  // Volume metrics
  totalMentions: number;
  mentionChange24h: number; // percentage
  uniqueAuthors: number;
  
  // Platform breakdown
  platformBreakdown: {
    twitter: number;
    reddit: number;
    telegram: number;
    discord: number;
    youtube: number;
  };
  
  // Sentiment
  sentiment: {
    overall: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    score: number; // -1 to 1
    breakdown: {
      veryBullish: number;
      bullish: number;
      neutral: number;
      bearish: number;
      veryBearish: number;
    };
  };
  
  // Engagement
  totalEngagement: number;
  avgEngagementPerMention: number;
  viralMentions: number; // High engagement mentions
  
  // Trending
  isTrending: boolean;
  trendingRank?: number;
  trendingScore: number;
  
  // Influencer activity
  influencerMentions: number;
  topInfluencers: Array<{
    username: string;
    platform: string;
    followers: number;
    sentiment: string;
  }>;
  
  // Top content
  topMentions: SocialMention[];
  
  // Narratives
  dominantNarratives: string[];
  
  lastUpdated: Date;
}

/**
 * Complete social intelligence snapshot
 */
export interface SocialIntelligence {
  timestamp: string;
  
  // Platform status
  platforms: PlatformMetrics[];
  activePlatforms: string[];
  
  // Coin metrics
  coins: CoinSocialMetrics[];
  
  // Aggregate metrics
  aggregate: {
    totalMentions: number;
    totalEngagement: number;
    uniqueAuthors: number;
    overallSentiment: {
      label: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
      score: number;
    };
    marketMood: string;
  };
  
  // Trending
  trendingCoins: string[];
  trendingTopics: Array<{
    topic: string;
    mentions: number;
    sentiment: number;
  }>;
  
  // Influencer signals
  influencerAlerts: Array<{
    influencer: string;
    platform: string;
    action: string;
    coin?: string;
    sentiment: string;
    followers: number;
  }>;
  
  // Narratives
  dominantNarratives: Array<{
    narrative: string;
    mentions: number;
    sentiment: number;
    coins: string[];
  }>;
  
  // Performance
  fetchTime: number;
  dataQuality: 'high' | 'medium' | 'low';
  
  // Step 1.2.2: Enhanced Analytics
  trendAnalysis: {
    trends: TrendAnalysisResult[];
    viralityAlerts: ViralityIndicator[];
  };
  
  communityMetrics: CommunityMetrics[];
  
  sentimentBreakdown: {
    overall: {
      label: string;
      score: number;
      confidence: number;
      magnitude: number;
    };
    distribution: Record<string, number>;
    dominantEmotion: string;
    topBullishSignals: string[];
    topBearishSignals: string[];
    contextSummary: {
      fudPercentage: number;
      fomoPercentage: number;
      questionPercentage: number;
      newsPercentage: number;
    };
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // API Keys (from environment)
  LUNARCRUSH_API_KEY: process.env.LUNARCRUSH_API_KEY || '',
  TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN || '',
  TWITTER_API_KEY: process.env.TWITTER_API_KEY || '',
  TWITTER_API_SECRET: process.env.TWITTER_API_SECRET || '',
  
  // API URLs
  LUNARCRUSH_URL: 'https://lunarcrush.com/api4/public',
  REDDIT_URL: 'https://www.reddit.com',
  
  // Subreddits to monitor
  REDDIT_SUBREDDITS: [
    { name: 'cryptocurrency', weight: 1.0 },
    { name: 'bitcoin', weight: 0.9 },
    { name: 'ethereum', weight: 0.9 },
    { name: 'CryptoMarkets', weight: 0.8 },
    { name: 'solana', weight: 0.7 },
    { name: 'altcoin', weight: 0.6 },
    { name: 'wallstreetbets', weight: 0.5 },
    { name: 'SatoshiStreetBets', weight: 0.5 },
  ],
  
  // Telegram channels (public)
  TELEGRAM_CHANNELS: [
    { name: 'crypto_signals', id: 'crypto' },
    { name: 'whale_alert', id: 'whale_alert_io' },
  ],
  
  // Influencer thresholds
  INFLUENCER_THRESHOLDS: {
    mega: 1000000,    // 1M+ followers
    macro: 100000,    // 100K-1M followers
    micro: 10000,     // 10K-100K followers
    nano: 1000,       // 1K-10K followers
  },
  
  // Cache settings
  CACHE_TTL_MS: 3 * 60 * 1000, // 3 minutes
  
  // Request settings
  TIMEOUT_MS: 8000,
  MAX_RETRIES: 2,
  
  // Limits
  MAX_MENTIONS_PER_COIN: 50,
  MAX_TOP_MENTIONS: 10,
};

// ============================================================================
// SENTIMENT KEYWORDS (Enhanced)
// ============================================================================

const SENTIMENT_KEYWORDS = {
  veryBullish: [
    { word: 'moon', weight: 2 },
    { word: '🚀', weight: 2 },
    { word: 'ath', weight: 2 },
    { word: 'all time high', weight: 2 },
    { word: 'parabolic', weight: 2 },
    { word: 'massive gains', weight: 2 },
    { word: 'to the moon', weight: 2.5 },
    { word: 'generational', weight: 1.8 },
    { word: '100x', weight: 2 },
    { word: '10x', weight: 1.5 },
    { word: 'diamond hands', weight: 1.5 },
    { word: '💎🙌', weight: 1.5 },
  ],
  bullish: [
    { word: 'bullish', weight: 1.2 },
    { word: 'buy', weight: 0.8 },
    { word: 'long', weight: 1 },
    { word: 'accumulate', weight: 1 },
    { word: 'hodl', weight: 1 },
    { word: 'pump', weight: 0.8 },
    { word: 'breakout', weight: 1 },
    { word: 'green', weight: 0.6 },
    { word: 'gains', weight: 0.8 },
    { word: 'rally', weight: 1 },
    { word: 'surge', weight: 1 },
    { word: 'up', weight: 0.3 },
    { word: '📈', weight: 1 },
  ],
  bearish: [
    { word: 'bearish', weight: 1.2 },
    { word: 'sell', weight: 0.8 },
    { word: 'short', weight: 1 },
    { word: 'dump', weight: 1 },
    { word: 'drop', weight: 0.8 },
    { word: 'red', weight: 0.6 },
    { word: 'down', weight: 0.3 },
    { word: 'correction', weight: 0.7 },
    { word: 'pullback', weight: 0.6 },
    { word: 'weak', weight: 0.5 },
    { word: '📉', weight: 1 },
  ],
  veryBearish: [
    { word: 'crash', weight: 2 },
    { word: 'rekt', weight: 2 },
    { word: 'scam', weight: 2.5 },
    { word: 'rug', weight: 2.5 },
    { word: 'rugpull', weight: 2.5 },
    { word: 'dead', weight: 1.5 },
    { word: 'worthless', weight: 2 },
    { word: 'collapse', weight: 2 },
    { word: 'plunge', weight: 1.8 },
    { word: 'panic', weight: 1.5 },
    { word: 'fear', weight: 1 },
    { word: 'exit', weight: 0.8 },
    { word: '💀', weight: 1.5 },
  ],
};

// ============================================================================
// CACHE
// ============================================================================

interface SocialCache {
  data: SocialIntelligence;
  timestamp: number;
}

let socialIntelligenceCache: SocialCache | null = null;
const mentionCache: Map<string, SocialMention[]> = new Map();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function analyzeSentiment(text: string): { label: SocialMention['sentiment']['label']; score: number; confidence: number } {
  const lowerText = text.toLowerCase();
  let score = 0;
  let totalWeight = 0;
  
  // Very bullish
  for (const { word, weight } of SENTIMENT_KEYWORDS.veryBullish) {
    if (lowerText.includes(word)) {
      score += weight * 2;
      totalWeight += weight;
    }
  }
  
  // Bullish
  for (const { word, weight } of SENTIMENT_KEYWORDS.bullish) {
    if (lowerText.includes(word)) {
      score += weight;
      totalWeight += weight;
    }
  }
  
  // Bearish
  for (const { word, weight } of SENTIMENT_KEYWORDS.bearish) {
    if (lowerText.includes(word)) {
      score -= weight;
      totalWeight += weight;
    }
  }
  
  // Very bearish
  for (const { word, weight } of SENTIMENT_KEYWORDS.veryBearish) {
    if (lowerText.includes(word)) {
      score -= weight * 2;
      totalWeight += weight;
    }
  }
  
  // Normalize to -1 to 1
  const normalizedScore = totalWeight > 0 ? Math.max(-1, Math.min(1, score / Math.max(5, totalWeight))) : 0;
  const confidence = Math.min(0.95, 0.3 + (totalWeight / 10) * 0.7);
  
  // Determine label
  let label: SocialMention['sentiment']['label'];
  if (normalizedScore <= -0.5) label = 'very_bearish';
  else if (normalizedScore <= -0.15) label = 'bearish';
  else if (normalizedScore >= 0.5) label = 'very_bullish';
  else if (normalizedScore >= 0.15) label = 'bullish';
  else label = 'neutral';
  
  return { label, score: Math.round(normalizedScore * 100) / 100, confidence };
}

function extractCoins(text: string): string[] {
  const coins: Set<string> = new Set();
  const upperText = text.toUpperCase();
  
  // Common coin mappings
  const coinMappings: Record<string, string> = {
    'BITCOIN': 'BTC', 'BTC': 'BTC',
    'ETHEREUM': 'ETH', 'ETH': 'ETH', 'ETHER': 'ETH',
    'SOLANA': 'SOL', 'SOL': 'SOL',
    'CARDANO': 'ADA', 'ADA': 'ADA',
    'DOGECOIN': 'DOGE', 'DOGE': 'DOGE',
    'XRP': 'XRP', 'RIPPLE': 'XRP',
    'POLKADOT': 'DOT', 'DOT': 'DOT',
    'AVALANCHE': 'AVAX', 'AVAX': 'AVAX',
    'CHAINLINK': 'LINK', 'LINK': 'LINK',
    'POLYGON': 'MATIC', 'MATIC': 'MATIC',
    'UNISWAP': 'UNI', 'UNI': 'UNI',
    'AAVE': 'AAVE',
    'BINANCE': 'BNB', 'BNB': 'BNB',
    'LITECOIN': 'LTC', 'LTC': 'LTC',
    'SHIBA': 'SHIB', 'SHIB': 'SHIB',
    'PEPE': 'PEPE',
  };
  
  // Check for coin names/symbols
  for (const [key, symbol] of Object.entries(coinMappings)) {
    if (upperText.includes(key)) {
      coins.add(symbol);
    }
  }
  
  // Extract cashtags ($BTC, $ETH, etc.)
  const cashtagPattern = /\$([A-Z]{2,6})\b/g;
  let match;
  while ((match = cashtagPattern.exec(upperText)) !== null) {
    coins.add(match[1]);
  }
  
  return Array.from(coins);
}

function extractHashtags(text: string): string[] {
  const hashtagPattern = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;
  while ((match = hashtagPattern.exec(text)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  return hashtags;
}

function extractCashtags(text: string): string[] {
  const cashtagPattern = /\$([A-Z]{2,6})\b/g;
  const cashtags: string[] = [];
  let match;
  while ((match = cashtagPattern.exec(text.toUpperCase())) !== null) {
    cashtags.push(match[1]);
  }
  return cashtags;
}

function getInfluencerTier(followers: number): 'mega' | 'macro' | 'micro' | 'nano' | undefined {
  if (followers >= CONFIG.INFLUENCER_THRESHOLDS.mega) return 'mega';
  if (followers >= CONFIG.INFLUENCER_THRESHOLDS.macro) return 'macro';
  if (followers >= CONFIG.INFLUENCER_THRESHOLDS.micro) return 'micro';
  if (followers >= CONFIG.INFLUENCER_THRESHOLDS.nano) return 'nano';
  return undefined;
}

// ============================================================================
// REDDIT INTEGRATION
// ============================================================================

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  permalink: string;
  upvote_ratio: number;
}

async function fetchRedditPosts(subreddit: string, limit: number = 25): Promise<RedditPost[]> {
  try {
    const response = await axios.get(
      `${CONFIG.REDDIT_URL}/r/${subreddit}/hot.json`,
      {
        params: { limit },
        timeout: CONFIG.TIMEOUT_MS,
        headers: { 'User-Agent': 'Coinet/1.0 Social Intelligence' },
      }
    );
    
    return response.data?.data?.children?.map((c: any) => c.data) || [];
  } catch (error: any) {
    logger.debug(`📱 Reddit ${subreddit} fetch failed`, { error: error.message });
    return [];
  }
}

async function getRedditMentions(symbols: string[]): Promise<{ mentions: SocialMention[]; metrics: PlatformMetrics }> {
  const mentions: SocialMention[] = [];
  const authors = new Set<string>();
  let totalEngagement = 0;
  let sentimentSum = 0;
  const hashtagCounts: Map<string, number> = new Map();
  
  const startTime = Date.now();
  
  try {
    // Fetch from all subreddits in parallel
    const subredditPromises = CONFIG.REDDIT_SUBREDDITS.map(async (sub) => {
      const posts = await fetchRedditPosts(sub.name, 25);
      return { subreddit: sub.name, weight: sub.weight, posts };
    });
    
    const results = await Promise.allSettled(subredditPromises);
    
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      
      const { subreddit, weight, posts } = result.value;
      
      for (const post of posts) {
        const fullText = `${post.title} ${post.selftext || ''}`;
        const postCoins = extractCoins(fullText);
        
        // Filter for requested symbols or general crypto content
        const isRelevant = symbols.length === 0 || 
          postCoins.some(c => symbols.includes(c)) ||
          fullText.toLowerCase().includes('crypto') ||
          fullText.toLowerCase().includes('bitcoin');
        
        if (!isRelevant) continue;
        
        const sentiment = analyzeSentiment(fullText);
        const hashtags = extractHashtags(fullText);
        
        // Track hashtags
        for (const tag of hashtags) {
          hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
        }
        
        const engagement = post.score + post.num_comments * 2;
        totalEngagement += engagement;
        sentimentSum += sentiment.score;
        authors.add(post.author);
        
        mentions.push({
          id: `reddit-${post.id}`,
          platform: 'reddit',
          author: {
            username: post.author,
            isInfluencer: post.score > 1000,
            verified: false,
          },
          content: {
            text: post.title,
            truncated: post.title.length > 200,
            url: `https://reddit.com${post.permalink}`,
            mediaType: 'text',
          },
          engagement: {
            likes: post.score,
            comments: post.num_comments,
            shares: 0,
            engagementRate: post.upvote_ratio,
          },
          sentiment,
          coins: postCoins,
          hashtags,
          cashtags: extractCashtags(fullText),
          timestamp: new Date(post.created_utc * 1000),
          source: {
            name: `r/${subreddit}`,
            credibility: weight,
          },
        });
      }
    }
    
    // Sort top hashtags
    const topHashtags = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
    
    // Top influencers (high karma posts)
    const topInfluencers = mentions
      .filter(m => m.engagement.likes > 500)
      .slice(0, 5)
      .map(m => m.author.username);
    
    const metrics: PlatformMetrics = {
      platform: 'reddit',
      isAvailable: mentions.length > 0,
      lastFetch: new Date(),
      mentionCount: mentions.length,
      uniqueAuthors: authors.size,
      totalEngagement,
      avgSentiment: mentions.length > 0 ? sentimentSum / mentions.length : 0,
      topHashtags,
      topInfluencers,
    };
    
    logger.debug('📱 Reddit mentions fetched', { 
      count: mentions.length, 
      authors: authors.size,
      fetchTime: Date.now() - startTime 
    });
    
    return { mentions, metrics };
  } catch (error: any) {
    logger.warn('📱 Reddit integration failed', { error: error.message });
    return {
      mentions: [],
      metrics: {
        platform: 'reddit',
        isAvailable: false,
        mentionCount: 0,
        uniqueAuthors: 0,
        totalEngagement: 0,
        avgSentiment: 0,
        topHashtags: [],
        topInfluencers: [],
        error: error.message,
      },
    };
  }
}

// ============================================================================
// LUNARCRUSH INTEGRATION (Aggregated Social Data)
// ============================================================================

async function getLunarCrushMentions(symbols: string[]): Promise<{ mentions: SocialMention[]; metrics: PlatformMetrics }> {
  if (!CONFIG.LUNARCRUSH_API_KEY) {
    return {
      mentions: [],
      metrics: {
        platform: 'lunarcrush',
        isAvailable: false,
        mentionCount: 0,
        uniqueAuthors: 0,
        totalEngagement: 0,
        avgSentiment: 0,
        topHashtags: [],
        topInfluencers: [],
        error: 'API key not configured',
      },
    };
  }
  
  try {
    // Fetch coin social data from LunarCrush
    const response = await axios.get(`${CONFIG.LUNARCRUSH_URL}/coins/list/v2`, {
      headers: {
        'Authorization': `Bearer ${CONFIG.LUNARCRUSH_API_KEY}`,
      },
      params: {
        sort: 'social_volume',
        limit: 100,
      },
      timeout: CONFIG.TIMEOUT_MS,
    });
    
    if (!response.data?.data) {
      throw new Error('No data from LunarCrush');
    }
    
    const mentions: SocialMention[] = [];
    const symbolsLower = symbols.map(s => s.toLowerCase());
    
    // Filter for requested symbols
    const relevantCoins = response.data.data.filter((coin: any) =>
      symbolsLower.length === 0 ||
      symbolsLower.includes(coin.symbol?.toLowerCase()) ||
      symbolsLower.includes(coin.name?.toLowerCase())
    );
    
    let totalEngagement = 0;
    let sentimentSum = 0;
    
    for (const coin of relevantCoins.slice(0, 20)) {
      // LunarCrush provides aggregated metrics, not individual mentions
      // Create a synthetic "mention" representing the aggregated data
      const lunarSentiment = coin.sentiment || coin.average_sentiment || 3;
      const normalizedSentiment = ((lunarSentiment - 1) / 4) * 2 - 1; // Convert 1-5 to -1 to 1
      
      const socialVolume = coin.social_volume || coin.social_volume_24h || 0;
      totalEngagement += socialVolume;
      sentimentSum += normalizedSentiment;
      
      let label: SocialMention['sentiment']['label'];
      if (normalizedSentiment <= -0.5) label = 'very_bearish';
      else if (normalizedSentiment <= -0.15) label = 'bearish';
      else if (normalizedSentiment >= 0.5) label = 'very_bullish';
      else if (normalizedSentiment >= 0.15) label = 'bullish';
      else label = 'neutral';
      
      mentions.push({
        id: `lunarcrush-${coin.symbol}-${Date.now()}`,
        platform: 'twitter', // LunarCrush aggregates Twitter primarily
        author: {
          username: 'LunarCrush Aggregate',
          isInfluencer: false,
        },
        content: {
          text: `${coin.name} (${coin.symbol}): ${socialVolume.toLocaleString()} social mentions`,
          truncated: false,
        },
        engagement: {
          likes: coin.tweets || 0,
          comments: coin.reddit_posts || 0,
          shares: 0,
          views: socialVolume,
        },
        sentiment: {
          label,
          score: Math.round(normalizedSentiment * 100) / 100,
          confidence: 0.8,
        },
        coins: [coin.symbol?.toUpperCase()],
        hashtags: [],
        cashtags: [`$${coin.symbol?.toUpperCase()}`],
        timestamp: new Date(),
        source: {
          name: 'LunarCrush',
          credibility: 0.85,
        },
      });
    }
    
    const metrics: PlatformMetrics = {
      platform: 'lunarcrush',
      isAvailable: true,
      lastFetch: new Date(),
      mentionCount: mentions.length,
      uniqueAuthors: 0, // Aggregated data
      totalEngagement,
      avgSentiment: mentions.length > 0 ? sentimentSum / mentions.length : 0,
      topHashtags: [],
      topInfluencers: [],
    };
    
    logger.info('📱 LunarCrush data fetched', { coins: mentions.length });
    
    return { mentions, metrics };
  } catch (error: any) {
    logger.warn('📱 LunarCrush integration failed', { error: error.message });
    return {
      mentions: [],
      metrics: {
        platform: 'lunarcrush',
        isAvailable: false,
        mentionCount: 0,
        uniqueAuthors: 0,
        totalEngagement: 0,
        avgSentiment: 0,
        topHashtags: [],
        topInfluencers: [],
        error: error.message,
      },
    };
  }
}

// ============================================================================
// TELEGRAM INTEGRATION (Public Channels)
// ============================================================================

async function getTelegramMentions(symbols: string[]): Promise<{ mentions: SocialMention[]; metrics: PlatformMetrics }> {
  // Note: Full Telegram integration requires bot API access
  // This is a placeholder that can be expanded with Telegram Bot API
  
  // For now, return empty but available (can be expanded)
  return {
    mentions: [],
    metrics: {
      platform: 'telegram',
      isAvailable: false,
      mentionCount: 0,
      uniqueAuthors: 0,
      totalEngagement: 0,
      avgSentiment: 0,
      topHashtags: [],
      topInfluencers: [],
      error: 'Telegram bot integration not configured',
    },
  };
}

// ============================================================================
// DISCORD INTEGRATION
// ============================================================================

async function getDiscordMentions(symbols: string[]): Promise<{ mentions: SocialMention[]; metrics: PlatformMetrics }> {
  // Note: Full Discord integration requires bot with server access
  // This is a placeholder that can be expanded with Discord Bot API
  
  return {
    mentions: [],
    metrics: {
      platform: 'discord',
      isAvailable: false,
      mentionCount: 0,
      uniqueAuthors: 0,
      totalEngagement: 0,
      avgSentiment: 0,
      topHashtags: [],
      topInfluencers: [],
      error: 'Discord bot integration not configured',
    },
  };
}

// ============================================================================
// YOUTUBE INTEGRATION
// ============================================================================

async function getYouTubeMentions(symbols: string[]): Promise<{ mentions: SocialMention[]; metrics: PlatformMetrics }> {
  // Note: YouTube Data API integration can be added here
  // Tracks crypto influencer videos and comments
  
  return {
    mentions: [],
    metrics: {
      platform: 'youtube',
      isAvailable: false,
      mentionCount: 0,
      uniqueAuthors: 0,
      totalEngagement: 0,
      avgSentiment: 0,
      topHashtags: [],
      topInfluencers: [],
      error: 'YouTube API not configured',
    },
  };
}

// ============================================================================
// AGGREGATION ENGINE
// ============================================================================

function aggregateCoinMetrics(mentions: SocialMention[], symbols: string[]): CoinSocialMetrics[] {
  const coinMetrics: Map<string, CoinSocialMetrics> = new Map();
  
  // Initialize metrics for requested symbols
  for (const symbol of symbols) {
    coinMetrics.set(symbol.toUpperCase(), {
      symbol: symbol.toUpperCase(),
      totalMentions: 0,
      mentionChange24h: 0,
      uniqueAuthors: 0,
      platformBreakdown: {
        twitter: 0,
        reddit: 0,
        telegram: 0,
        discord: 0,
        youtube: 0,
      },
      sentiment: {
        overall: 'neutral',
        score: 0,
        breakdown: {
          veryBullish: 0,
          bullish: 0,
          neutral: 0,
          bearish: 0,
          veryBearish: 0,
        },
      },
      totalEngagement: 0,
      avgEngagementPerMention: 0,
      viralMentions: 0,
      isTrending: false,
      trendingScore: 0,
      influencerMentions: 0,
      topInfluencers: [],
      topMentions: [],
      dominantNarratives: [],
      lastUpdated: new Date(),
    });
  }
  
  // Process mentions
  const authorsByCoin: Map<string, Set<string>> = new Map();
  const influencersByCoin: Map<string, Array<{ username: string; platform: string; followers: number; sentiment: string }>> = new Map();
  
  for (const mention of mentions) {
    for (const coin of mention.coins) {
      const upperCoin = coin.toUpperCase();
      
      // Get or create metrics
      let metrics = coinMetrics.get(upperCoin);
      if (!metrics) {
        metrics = {
          symbol: upperCoin,
          totalMentions: 0,
          mentionChange24h: 0,
          uniqueAuthors: 0,
          platformBreakdown: {
            twitter: 0,
            reddit: 0,
            telegram: 0,
            discord: 0,
            youtube: 0,
          },
          sentiment: {
            overall: 'neutral',
            score: 0,
            breakdown: {
              veryBullish: 0,
              bullish: 0,
              neutral: 0,
              bearish: 0,
              veryBearish: 0,
            },
          },
          totalEngagement: 0,
          avgEngagementPerMention: 0,
          viralMentions: 0,
          isTrending: false,
          trendingScore: 0,
          influencerMentions: 0,
          topInfluencers: [],
          topMentions: [],
          dominantNarratives: [],
          lastUpdated: new Date(),
        };
        coinMetrics.set(upperCoin, metrics);
      }
      
      // Update counts
      metrics.totalMentions++;
      // Only update platform breakdown for known platforms
      if (mention.platform !== 'other' && mention.platform in metrics.platformBreakdown) {
        metrics.platformBreakdown[mention.platform as keyof typeof metrics.platformBreakdown]++;
      }
      
      // Update sentiment breakdown based on label
      const label = mention.sentiment.label;
      if (label === 'very_bullish') metrics.sentiment.breakdown.veryBullish++;
      else if (label === 'very_bearish') metrics.sentiment.breakdown.veryBearish++;
      else if (label === 'bullish') metrics.sentiment.breakdown.bullish++;
      else if (label === 'bearish') metrics.sentiment.breakdown.bearish++;
      else metrics.sentiment.breakdown.neutral++;
      
      // Accumulate sentiment score
      metrics.sentiment.score += mention.sentiment.score;
      
      // Update engagement
      const engagement = mention.engagement.likes + mention.engagement.comments + mention.engagement.shares;
      metrics.totalEngagement += engagement;
      
      // Track viral mentions
      if (engagement > 1000) {
        metrics.viralMentions++;
      }
      
      // Track authors
      if (!authorsByCoin.has(upperCoin)) {
        authorsByCoin.set(upperCoin, new Set());
      }
      authorsByCoin.get(upperCoin)!.add(mention.author.username);
      
      // Track influencers
      if (mention.author.isInfluencer) {
        metrics.influencerMentions++;
        if (!influencersByCoin.has(upperCoin)) {
          influencersByCoin.set(upperCoin, []);
        }
        influencersByCoin.get(upperCoin)!.push({
          username: mention.author.username,
          platform: mention.platform,
          followers: mention.author.followers || 0,
          sentiment: mention.sentiment.label,
        });
      }
      
      // Track top mentions
      if (metrics.topMentions.length < CONFIG.MAX_TOP_MENTIONS) {
        metrics.topMentions.push(mention);
      } else if (engagement > (metrics.topMentions[metrics.topMentions.length - 1]?.engagement.likes || 0)) {
        metrics.topMentions.pop();
        metrics.topMentions.push(mention);
        metrics.topMentions.sort((a, b) => b.engagement.likes - a.engagement.likes);
      }
    }
  }
  
  // Finalize metrics
  for (const [coin, metrics] of coinMetrics) {
    // Unique authors
    metrics.uniqueAuthors = authorsByCoin.get(coin)?.size || 0;
    
    // Average sentiment
    if (metrics.totalMentions > 0) {
      metrics.sentiment.score = Math.round((metrics.sentiment.score / metrics.totalMentions) * 100) / 100;
      metrics.avgEngagementPerMention = Math.round(metrics.totalEngagement / metrics.totalMentions);
    }
    
    // Determine overall sentiment
    const { breakdown } = metrics.sentiment;
    const totalSentiment = breakdown.veryBullish + breakdown.bullish + breakdown.neutral + breakdown.bearish + breakdown.veryBearish;
    if (totalSentiment > 0) {
      const bullishRatio = (breakdown.veryBullish * 2 + breakdown.bullish) / totalSentiment;
      const bearishRatio = (breakdown.veryBearish * 2 + breakdown.bearish) / totalSentiment;
      
      if (bullishRatio > 0.6) metrics.sentiment.overall = metrics.sentiment.score > 0.4 ? 'very_bullish' : 'bullish';
      else if (bearishRatio > 0.6) metrics.sentiment.overall = metrics.sentiment.score < -0.4 ? 'very_bearish' : 'bearish';
      else metrics.sentiment.overall = 'neutral';
    }
    
    // Trending score
    metrics.trendingScore = metrics.totalMentions * 0.3 + metrics.totalEngagement * 0.0001 + metrics.viralMentions * 10;
    metrics.isTrending = metrics.trendingScore > 50 || metrics.viralMentions > 2;
    
    // Top influencers
    metrics.topInfluencers = (influencersByCoin.get(coin) || [])
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 5);
  }
  
  // Sort by trending score and return
  return Array.from(coinMetrics.values())
    .sort((a, b) => b.trendingScore - a.trendingScore);
}

// ============================================================================
// MAIN AGGREGATION FUNCTION
// ============================================================================

/**
 * 🎯 MAIN: Get comprehensive social intelligence across all platforms
 */
export async function getSocialIntelligence(symbols: string[] = ['BTC', 'ETH', 'SOL']): Promise<SocialIntelligence> {
  const startTime = Date.now();
  
  // Check cache
  if (socialIntelligenceCache && Date.now() - socialIntelligenceCache.timestamp < CONFIG.CACHE_TTL_MS) {
    logger.debug('🌐 Social intelligence cache hit');
    return socialIntelligenceCache.data;
  }
  
  logger.info('🌐 Fetching social intelligence', { symbols: symbols.join(',') });
  
  // Fetch from all platforms in parallel
  const [redditData, lunarCrushData, telegramData, discordData, youtubeData] = await Promise.all([
    getRedditMentions(symbols),
    getLunarCrushMentions(symbols),
    getTelegramMentions(symbols),
    getDiscordMentions(symbols),
    getYouTubeMentions(symbols),
  ]);
  
  // Combine all mentions
  const allMentions: SocialMention[] = [
    ...redditData.mentions,
    ...lunarCrushData.mentions,
    ...telegramData.mentions,
    ...discordData.mentions,
    ...youtubeData.mentions,
  ];
  
  // Aggregate platform metrics
  const platforms: PlatformMetrics[] = [
    redditData.metrics,
    lunarCrushData.metrics,
    telegramData.metrics,
    discordData.metrics,
    youtubeData.metrics,
  ];
  
  const activePlatforms = platforms.filter(p => p.isAvailable).map(p => p.platform);
  
  // Aggregate coin metrics
  const coinMetrics = aggregateCoinMetrics(allMentions, symbols);
  
  // Calculate aggregate metrics
  const totalMentions = allMentions.length;
  const totalEngagement = allMentions.reduce((sum, m) => sum + m.engagement.likes + m.engagement.comments, 0);
  const uniqueAuthors = new Set(allMentions.map(m => m.author.username)).size;
  const avgSentiment = totalMentions > 0 
    ? allMentions.reduce((sum, m) => sum + m.sentiment.score, 0) / totalMentions 
    : 0;
  
  // Determine overall sentiment
  let overallLabel: SocialIntelligence['aggregate']['overallSentiment']['label'];
  if (avgSentiment <= -0.5) overallLabel = 'very_bearish';
  else if (avgSentiment <= -0.15) overallLabel = 'bearish';
  else if (avgSentiment >= 0.5) overallLabel = 'very_bullish';
  else if (avgSentiment >= 0.15) overallLabel = 'bullish';
  else overallLabel = 'neutral';
  
  // Market mood description
  let marketMood = 'Neutral sentiment across social channels';
  if (overallLabel === 'very_bullish') marketMood = 'Extreme optimism and FOMO in social channels';
  else if (overallLabel === 'bullish') marketMood = 'Positive sentiment with growing interest';
  else if (overallLabel === 'bearish') marketMood = 'Cautious sentiment with concerns rising';
  else if (overallLabel === 'very_bearish') marketMood = 'Fear and uncertainty dominating discussions';
  
  // Trending coins
  const trendingCoins = coinMetrics
    .filter(c => c.isTrending)
    .slice(0, 10)
    .map(c => c.symbol);
  
  // Trending topics (from hashtags)
  const hashtagCounts: Map<string, { mentions: number; sentiment: number }> = new Map();
  for (const mention of allMentions) {
    for (const tag of mention.hashtags) {
      const existing = hashtagCounts.get(tag) || { mentions: 0, sentiment: 0 };
      existing.mentions++;
      existing.sentiment += mention.sentiment.score;
      hashtagCounts.set(tag, existing);
    }
  }
  const trendingTopics = Array.from(hashtagCounts.entries())
    .map(([topic, data]) => ({
      topic,
      mentions: data.mentions,
      sentiment: data.mentions > 0 ? Math.round((data.sentiment / data.mentions) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);
  
  // Influencer alerts
  const influencerAlerts = allMentions
    .filter(m => m.author.isInfluencer && m.author.followers && m.author.followers > CONFIG.INFLUENCER_THRESHOLDS.macro)
    .slice(0, 10)
    .map(m => ({
      influencer: m.author.username,
      platform: m.platform,
      action: m.content.text.substring(0, 100),
      coin: m.coins[0],
      sentiment: m.sentiment.label,
      followers: m.author.followers || 0,
    }));
  
  // Dominant narratives (simplified)
  const narratives: Map<string, { mentions: number; sentiment: number; coins: Set<string> }> = new Map();
  const narrativeKeywords = ['etf', 'halving', 'regulation', 'adoption', 'defi', 'nft', 'ai', 'meme'];
  for (const mention of allMentions) {
    const text = mention.content.text.toLowerCase();
    for (const keyword of narrativeKeywords) {
      if (text.includes(keyword)) {
        const existing = narratives.get(keyword) || { mentions: 0, sentiment: 0, coins: new Set() };
        existing.mentions++;
        existing.sentiment += mention.sentiment.score;
        mention.coins.forEach(c => existing.coins.add(c));
        narratives.set(keyword, existing);
      }
    }
  }
  const dominantNarratives = Array.from(narratives.entries())
    .map(([narrative, data]) => ({
      narrative,
      mentions: data.mentions,
      sentiment: data.mentions > 0 ? Math.round((data.sentiment / data.mentions) * 100) / 100 : 0,
      coins: Array.from(data.coins),
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);
  
  // Data quality assessment
  let dataQuality: 'high' | 'medium' | 'low' = 'low';
  if (activePlatforms.length >= 3 && totalMentions >= 100) dataQuality = 'high';
  else if (activePlatforms.length >= 2 && totalMentions >= 30) dataQuality = 'medium';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1.2.2: Enhanced Sentiment & Trend Analysis
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Run advanced sentiment analysis on all mentions
  const sentimentAnalyses: SentimentAnalysisResult[] = allMentions.map(m => 
    advancedSentimentAnalysis(m.content.text)
  );
  
  // Aggregate sentiment with full breakdown
  const sentimentBreakdown = aggregateSentiment(sentimentAnalyses);
  
  // Analyze trends for top topics
  const trends: TrendAnalysisResult[] = [];
  for (const topic of trendingTopics.slice(0, 5)) {
    const topicMentions = allMentions.filter(m => 
      m.content.text.toLowerCase().includes(topic.topic) ||
      m.hashtags.includes(topic.topic)
    );
    const trend = analyzeTrend(
      topic.topic,
      topic.mentions,
      topic.sentiment,
      topicMentions.reduce((sum, m) => sum + m.engagement.likes, 0)
    );
    trends.push(trend);
  }
  
  // Detect virality for trending topics
  const viralityAlerts: ViralityIndicator[] = [];
  for (const topic of trendingTopics.slice(0, 5)) {
    const topicMentions = allMentions.filter(m => 
      m.content.text.toLowerCase().includes(topic.topic)
    );
    const hasInfluencer = topicMentions.some(m => m.author.isInfluencer);
    const platformsWithTopic = new Set(topicMentions.map(m => m.platform)).size;
    
    const virality = detectVirality(topic.topic, {
      mentionsPerMinute: topic.mentions / 60, // Rough estimate
      engagementRate: topicMentions.length > 0 
        ? topicMentions.reduce((sum, m) => sum + m.engagement.likes, 0) / topicMentions.length / 100
        : 0,
      platformCount: platformsWithTopic,
      hasInfluencerMention: hasInfluencer,
      hasNewsCorrelation: false, // Would need news service integration
    });
    
    if (virality.score > 30) {
      viralityAlerts.push(virality);
    }
  }
  
  // Analyze Reddit communities specifically
  const communityMetrics: CommunityMetrics[] = [];
  if (redditData.mentions.length > 0) {
    // Group by subreddit
    const subredditGroups: Map<string, typeof redditData.mentions> = new Map();
    for (const mention of redditData.mentions) {
      const subreddit = mention.source.name.replace('r/', '');
      const existing = subredditGroups.get(subreddit) || [];
      existing.push(mention);
      subredditGroups.set(subreddit, existing);
    }
    
    // Analyze each community
    for (const [subreddit, mentions] of subredditGroups) {
      const posts = mentions.map(m => ({
        title: m.content.text,
        text: '',
        score: m.engagement.likes,
        comments: m.engagement.comments,
        author: m.author.username,
      }));
      
      const communityAnalysis = analyzeCommunity(subreddit, 'reddit', posts);
      communityMetrics.push(communityAnalysis);
    }
  }
  
  const intelligence: SocialIntelligence = {
    timestamp: new Date().toISOString(),
    platforms,
    activePlatforms,
    coins: coinMetrics,
    aggregate: {
      totalMentions,
      totalEngagement,
      uniqueAuthors,
      overallSentiment: {
        label: overallLabel,
        score: Math.round(avgSentiment * 100) / 100,
      },
      marketMood,
    },
    trendingCoins,
    trendingTopics,
    influencerAlerts,
    dominantNarratives,
    fetchTime: Date.now() - startTime,
    dataQuality,
    // Step 1.2.2: Enhanced analytics
    trendAnalysis: {
      trends,
      viralityAlerts,
    },
    communityMetrics,
    sentimentBreakdown,
  };
  
  // Update cache
  socialIntelligenceCache = { data: intelligence, timestamp: Date.now() };
  
  logger.info('🌐 Social intelligence aggregated', {
    platforms: activePlatforms.join(','),
    mentions: totalMentions,
    coins: coinMetrics.length,
    sentiment: overallLabel,
    fetchTime: intelligence.fetchTime,
  });
  
  return intelligence;
}

/**
 * Format social intelligence for AI context
 */
export function formatSocialIntelligenceForAI(intelligence: SocialIntelligence): string {
  const sentimentEmoji: Record<string, string> = {
    very_bullish: '🚀🚀',
    bullish: '📈',
    neutral: '➡️',
    bearish: '📉',
    very_bearish: '😰😰',
  };
  
  let context = `\n[🌐 SOCIAL INTELLIGENCE - MULTI-PLATFORM]\n`;
  context += `Overall Mood: ${sentimentEmoji[intelligence.aggregate.overallSentiment.label]} ${intelligence.aggregate.overallSentiment.label.toUpperCase()}\n`;
  context += `${intelligence.aggregate.marketMood}\n`;
  context += `Data Quality: ${intelligence.dataQuality.toUpperCase()} | Platforms: ${intelligence.activePlatforms.join(', ')}\n\n`;
  
  // Aggregate stats
  context += `📊 AGGREGATE STATS:\n`;
  context += `• Total Mentions: ${intelligence.aggregate.totalMentions.toLocaleString()}\n`;
  context += `• Unique Authors: ${intelligence.aggregate.uniqueAuthors.toLocaleString()}\n`;
  context += `• Total Engagement: ${intelligence.aggregate.totalEngagement.toLocaleString()}\n\n`;
  
  // Trending coins
  if (intelligence.trendingCoins.length > 0) {
    context += `🔥 TRENDING: ${intelligence.trendingCoins.join(', ')}\n\n`;
  }
  
  // Top coins by sentiment
  const topCoins = intelligence.coins.slice(0, 5);
  if (topCoins.length > 0) {
    context += `📈 TOP COINS BY SOCIAL ACTIVITY:\n`;
    for (const coin of topCoins) {
      const emoji = sentimentEmoji[coin.sentiment.overall];
      context += `• ${coin.symbol}: ${coin.totalMentions} mentions, ${emoji} ${coin.sentiment.overall}`;
      if (coin.influencerMentions > 0) {
        context += ` (${coin.influencerMentions} influencer mentions)`;
      }
      context += '\n';
    }
    context += '\n';
  }
  
  // Trending topics
  if (intelligence.trendingTopics.length > 0) {
    context += `💬 TRENDING TOPICS: `;
    context += intelligence.trendingTopics.slice(0, 5).map(t => `#${t.topic}(${t.mentions})`).join(', ');
    context += '\n\n';
  }
  
  // Influencer alerts
  if (intelligence.influencerAlerts.length > 0) {
    context += `👤 INFLUENCER ACTIVITY:\n`;
    for (const alert of intelligence.influencerAlerts.slice(0, 3)) {
      context += `• ${alert.influencer} (${formatFollowers(alert.followers)}): ${alert.sentiment} on ${alert.coin || 'crypto'}\n`;
    }
    context += '\n';
  }
  
  // Dominant narratives
  if (intelligence.dominantNarratives.length > 0) {
    context += `📖 DOMINANT NARRATIVES: `;
    context += intelligence.dominantNarratives.map(n => `${n.narrative}(${n.mentions})`).join(', ');
    context += '\n\n';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1.2.2: Enhanced Sentiment & Trend Analysis
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Sentiment breakdown
  if (intelligence.sentimentBreakdown) {
    const sb = intelligence.sentimentBreakdown;
    context += `🧠 SENTIMENT ANALYSIS:\n`;
    context += `• Overall: ${sb.overall.label} (score: ${sb.overall.score}, confidence: ${Math.round(sb.overall.confidence * 100)}%)\n`;
    context += `• Dominant Emotion: ${sb.dominantEmotion}\n`;
    context += `• Distribution: `;
    const dist = sb.distribution;
    context += `🟢🟢${dist.very_bullish || 0}% 🟢${dist.bullish || 0}% ⚪${dist.neutral || 0}% 🔴${dist.bearish || 0}% 🔴🔴${dist.very_bearish || 0}%\n`;
    
    if (sb.topBullishSignals.length > 0) {
      context += `• Bullish Signals: ${sb.topBullishSignals.slice(0, 3).join(', ')}\n`;
    }
    if (sb.topBearishSignals.length > 0) {
      context += `• Bearish Signals: ${sb.topBearishSignals.slice(0, 3).join(', ')}\n`;
    }
    
    // Context indicators
    const ctx = sb.contextSummary;
    if (ctx.fudPercentage > 10 || ctx.fomoPercentage > 10) {
      context += `• Context: `;
      if (ctx.fudPercentage > 10) context += `FUD ${ctx.fudPercentage}% `;
      if (ctx.fomoPercentage > 10) context += `FOMO ${ctx.fomoPercentage}% `;
      context += '\n';
    }
    context += '\n';
  }
  
  // Virality alerts
  if (intelligence.trendAnalysis?.viralityAlerts?.length > 0) {
    context += `🔥 VIRALITY ALERTS:\n`;
    for (const alert of intelligence.trendAnalysis.viralityAlerts.slice(0, 3)) {
      context += `• ${alert.alert.message}\n`;
      context += `  Score: ${alert.score}/100 | Triggers: `;
      const triggers = [];
      if (alert.triggers.volumeSpike) triggers.push('volume spike');
      if (alert.triggers.influencerMention) triggers.push('influencer');
      if (alert.triggers.crossPlatformSpread) triggers.push('cross-platform');
      if (alert.triggers.engagementExplosion) triggers.push('engagement');
      context += triggers.join(', ') + '\n';
    }
    context += '\n';
  }
  
  // Trend velocity
  if (intelligence.trendAnalysis?.trends?.length > 0) {
    const activeTrends = intelligence.trendAnalysis.trends.filter(t => 
      t.status.phase === 'growing' || t.status.phase === 'peak' || t.status.isViral
    );
    if (activeTrends.length > 0) {
      context += `📈 TREND VELOCITY:\n`;
      for (const trend of activeTrends.slice(0, 3)) {
        context += `• #${trend.topic}: ${trend.status.phase} (velocity: ${trend.metrics.velocity}/hr, strength: ${trend.status.trendStrength}%)\n`;
      }
      context += '\n';
    }
  }
  
  // Community-specific insights (WallStreetBets, etc.)
  if (intelligence.communityMetrics?.length > 0) {
    const notableCommunities = intelligence.communityMetrics.filter(c => 
      c.activity.totalPosts > 10 || 
      c.community.toLowerCase().includes('wallstreetbets') ||
      Math.abs(c.sentiment.overall) > 0.3
    );
    if (notableCommunities.length > 0) {
      context += `🏛️ COMMUNITY INSIGHTS:\n`;
      for (const community of notableCommunities.slice(0, 3)) {
        context += `• r/${community.community}: ${community.mood.label} (${community.activity.totalPosts} posts, sentiment: ${community.sentiment.overall})\n`;
        if (community.trending.coins.length > 0) {
          context += `  Trending: ${community.trending.coins.slice(0, 3).join(', ')}\n`;
        }
      }
      context += '\n';
    }
  }
  
  return context;
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const socialIntelligenceService = {
  get: getSocialIntelligence,
  formatForAI: formatSocialIntelligenceForAI,
};

export default socialIntelligenceService;

