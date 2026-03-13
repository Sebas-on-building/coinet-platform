/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║     📱 TWITTER INTELLIGENCE SERVICE — COMM SEGMENT DATA PROVIDER                                  ║
 * ║                                                                                                   ║
 * ║   Integrates with TwitterAPI.io to provide real social data for OmniScore                        ║
 * ║   • User profile metrics (followers, engagement)                                                  ║
 * ║   • Tweet analysis (sentiment, activity)                                                          ║
 * ║   • Bot detection (follower quality)                                                              ║
 * ║   • Mention tracking (buzz, influencers)                                                          ║
 * ║                                                                                                   ║
 * ║   Cost: ~$0.003-0.01 per project analysis                                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const TWITTER_API_CONFIG = {
  BASE_URL: 'https://api.twitterapi.io',
  API_KEY: process.env.TWITTER_API_KEY ?? '',
  
  // Cost per endpoint (in credits, $0.001 = 1 credit approximately)
  COSTS: {
    USER_INFO: 1,        // Get user profile
    USER_TWEETS: 2,      // Get user's tweets
    SEARCH_TWEETS: 3,    // Search mentions
    USER_FOLLOWERS: 5,   // Sample followers (for bot detection)
  },
  
  // Rate limiting - free tier is 1 request per 5 seconds
  RATE_LIMIT_MS: 5200,   // 5.2 seconds between calls
  MAX_CALLS_PER_MINUTE: 11,
  
  // Cache TTL
  CACHE_TTL_MS: 15 * 60 * 1000,  // 15 minutes
};

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

let lastApiCallTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  const waitTime = TWITTER_API_CONFIG.RATE_LIMIT_MS - timeSinceLastCall;
  
  if (waitTime > 0) {
    logger.debug(`[TwitterAPI] Rate limit: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastApiCallTime = Date.now();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TwitterUserProfile {
  id: string;
  username: string;
  name: string;
  description: string;
  followers: number;
  following: number;
  tweetCount: number;
  listedCount: number;
  verified: boolean;
  createdAt: string;
  profileImageUrl: string;
  location?: string;
  url?: string;
}

export interface TwitterTweet {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views?: number;
  isRetweet: boolean;
  isReply: boolean;
}

export interface TwitterEngagementMetrics {
  avgLikesPerTweet: number;
  avgRetweetsPerTweet: number;
  avgRepliesPerTweet: number;
  avgViewsPerTweet: number;
  engagementRate: number;          // (likes + RTs + replies) / followers
  tweetsPerDay: number;
  mostEngagedTweet: TwitterTweet | null;
}

export interface TwitterFollowerQuality {
  sampleSize: number;
  avgFollowerCount: number;
  avgFollowingCount: number;
  avgTweetCount: number;
  noProfilePicRatio: number;       // High = bot indicator
  lowActivityRatio: number;        // High = bot indicator
  estimatedBotRatio: number;       // 0-1
  estimatedRealFollowers: number;
}

export interface TwitterMentionAnalysis {
  totalMentions: number;
  uniqueUsers: number;
  avgSentiment: number;            // -1 to +1
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topInfluencers: {
    username: string;
    followers: number;
    sentiment: number;
  }[];
  mentionVelocity: number;         // Mentions per hour
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMM v2.2: WEAPON-GRADE COMMUNITY INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════
//
// v2.2 Enhancements:
// - Peer-normalized ICR (z-score vs sector/cap)
// - Verified Anchor Discount for institutional accounts
// - Temporal smoothing (70% 30d + 30% 7d)
// - Regime-aware Social-Reality penalty
// - Explicit NMI formula in audit
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * VERIFIED ANCHOR ACCOUNTS
 * Official institutional accounts get ICR discount
 */
export const VERIFIED_ANCHOR_PATTERNS: RegExp[] = [
  /foundation$/i,
  /official$/i,
  /docs$/i,
  /protocol$/i,
  /labs$/i,
  /network$/i,
  /core$/i,
  /ecosystem$/i,
  /dao$/i,
];

/**
 * ICR Peer Benchmarks by sector/cap
 * Used for z-score normalization
 */
export const ICR_PEER_BENCHMARKS: Record<string, { mean: number; std: number }> = {
  'L1:mega': { mean: 0.75, std: 0.10 },    // Big L1s naturally have concentrated official accounts
  'L1:large': { mean: 0.70, std: 0.12 },
  'L1:mid': { mean: 0.65, std: 0.15 },
  'DeFi:large': { mean: 0.60, std: 0.15 },
  'DeFi:mid': { mean: 0.55, std: 0.18 },
  'Meme:large': { mean: 0.80, std: 0.12 }, // Meme coins often have concentrated community
  'Meme:mid': { mean: 0.75, std: 0.15 },
  'Infrastructure:mid': { mean: 0.55, std: 0.15 },
  'default': { mean: 0.60, std: 0.15 },
};

export interface CommBaseScore {
  score: number;                    // 0-100: Stable community foundation
  components: {
    followerQuality: number;        // Quality-adjusted follower score
    uniqueEngagers30d: number;      // Unique accounts engaging (not just count)
    discordActiveRatio: number;     // Active/total Discord members (estimated)
    devCommunitySignal: number;     // GitHub discussions, forum engagement
  };
}

export interface CommVelocityScore {
  score: number;                    // 0-100: Short-term momentum
  components: {
    growth7d: number;               // Follower growth rate 7d
    growth30d: number;              // Follower growth rate 30d
    sentimentShift7d: number;       // Sentiment momentum
    attentionBurst: number;         // Unusual spike detection
    crossPlatformSync: number;      // Narrative appears across channels
  };
}

/**
 * Enhanced Influencer Concentration Risk (ICR) v2.2
 * Includes Top-3, Top-10, Gini, AND peer normalization
 */
export interface InfluencerConcentrationRisk {
  top3: number;                     // 0-1: Top 3 accounts' share
  top10: number;                    // 0-1: Top 10 accounts' share
  gini: number;                     // 0-1: Gini coefficient of engagement
  composite: number;                // 0-1: Weighted composite (used in risk calc)
  // v2.2: Peer normalization
  peerNormalized: {
    rawICR: number;                 // Original composite
    peerZ: number;                  // z(ICR | sector, cap)
    peerMean: number;               // Sector/cap mean
    peerStd: number;                // Sector/cap std
  };
  // v2.2: Verified Anchor Discount
  verifiedAnchorDiscount: {
    applied: boolean;
    discountFactor: number;         // 0.7 if anchors detected
    anchorAccountsDetected: string[];
  };
  // v2.2: Effective ICR after adjustments
  effective: number;                // Final ICR used in calculations
}

export interface CommRiskFactors {
  botRisk: number;                  // 0-1: Estimated fake follower ratio
  anomalyScore: number;             // 0-1: Growth/engagement anomalies
  influencerConcentration: InfluencerConcentrationRisk;  // Full ICR breakdown
  sentimentDispersion: number;      // 0-1: Polarization penalty
}

/**
 * Multi-Source Coherence (MSC) v2.1
 * Now includes source enumeration, independence score, and reason tags
 */
export interface MultiSourceCoherence {
  score: number;                    // 0-1: Cross-platform agreement
  sources: string[];                // Which platforms we have data for
  sourceCount: number;              // Number of sources (for INV-COMM-6)
  independenceScore: number;        // 0-1: How independent are the sources
  independenceReasons: string[];    // Explainable reasons for low independence
  divergences: string[];            // Where narratives conflict
}

/**
 * Caps Applied Audit Trail
 */
export interface CommCapsApplied {
  botRiskCap: { active: boolean; threshold: number; upperBound: number } | null;
  mscCap: { active: boolean; threshold: number; upperBound: number } | null;
  anyCapActive: boolean;
}

/**
 * Peer Confidence Level
 */
export type PeerConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

/**
 * Peer Context with fallback tracking
 */
export interface CommPeerContext {
  sector: string;
  capBucket: string;
  peerMedian: number;
  peerMAD: number;
  peerConfidence: PeerConfidenceLevel;
  fallbackUsed: 'sector_cap' | 'sector_only' | 'global' | 'none';
  sampleSize: number;               // How many peers in the comparison set
  peerBoostDisabled: boolean;       // True if insufficient peers
}

/**
 * Full COMM Trace for forensic audit
 * Shows all internal states for trading desk transparency
 */
export interface CommTrace {
  commB: number;          // Base score
  commV: number;          // Velocity score
  commRaw: number;        // After combination
  commAdj: number;        // After risk adjustment
  commCapped: number;     // After hard caps
  commPeerZ: number;      // Peer-normalized z-score
  commFinal: number;      // Final output
}

export interface CommV2Output {
  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE: Explicit order for audit clarity
  // 1. COMM-B computed → 2. COMM-V computed → 3. Combined → 4. Risk adjusted
  // → 5. Capped → 6. Peer normalized → 7. Final output
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Split scores (Steps 1-2)
  base: CommBaseScore;
  velocity: CommVelocityScore;
  
  // Risk factors (for Step 4)
  risks: CommRiskFactors;
  
  // Multi-source validation
  multiSource: MultiSourceCoherence;
  
  // Aggregated scores (Pipeline steps)
  commRaw: number;                  // Step 3: COMM-B × 0.65 + COMM-V × 0.35
  commAdj: number;                  // Step 4: After risk multipliers
  commCapped: number;               // Step 5: After hard caps
  commPeerZ: number;                // Step 6: Peer-normalized z-score
  commFinal: number;                // Step 7: Final output
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FORENSIC AUDIT TRAIL
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Full trace for trading desks
  commTrace: CommTrace;
  
  // Caps audit trail
  capsApplied: CommCapsApplied;
  
  // Peer context with fallback tracking
  peerContext: CommPeerContext;
  
  // COMM-local invariants validation
  invariantsValid: boolean;
  invariantViolations: string[];
}

export interface TwitterProjectIntelligence {
  // Profile data
  profile: TwitterUserProfile | null;
  profileFound: boolean;
  
  // Engagement metrics
  engagement: TwitterEngagementMetrics | null;
  
  // Follower quality (bot detection)
  followerQuality: TwitterFollowerQuality | null;
  
  // Mention analysis
  mentions: TwitterMentionAnalysis | null;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMM v2: Enhanced Output
  // ═══════════════════════════════════════════════════════════════════════════
  commV2: CommV2Output | null;
  
  // Legacy scores (for backwards compatibility)
  scores: {
    followerScore: number;         // 0-100
    engagementScore: number;       // 0-100
    authenticityScore: number;     // 0-100 (inverse of bot ratio)
    sentimentScore: number;        // 0-100
    activityScore: number;         // 0-100
    overallCommScore: number;      // 0-100 (now uses COMM v2 if available)
  };
  
  // Metadata
  fetchedAt: string;
  apiCallsUsed: number;
  creditsUsed: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════════════

const cache = new Map<string, { data: TwitterProjectIntelligence; timestamp: number }>();

function getCached(key: string): TwitterProjectIntelligence | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TWITTER_API_CONFIG.CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: TwitterProjectIntelligence): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function callTwitterAPI<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<{ data: T | null; error: string | null }> {
  if (!TWITTER_API_CONFIG.API_KEY || TWITTER_API_CONFIG.API_KEY.trim() === '') {
    logger.debug('[TwitterAPI] TWITTER_API_KEY not configured - skipping API call');
    return { data: null, error: 'TWITTER_API_KEY not configured' };
  }
  try {
    // Wait for rate limit before making the call
    await waitForRateLimit();
    
    const url = new URL(`${TWITTER_API_CONFIG.BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    logger.info(`[TwitterAPI] Calling ${endpoint}`, { params });
    
    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': TWITTER_API_CONFIG.API_KEY,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`[TwitterAPI] Error ${response.status}: ${errorText}`);
      return { data: null, error: `API error: ${response.status}` };
    }
    
    const data = await response.json();
    logger.info(`[TwitterAPI] Success for ${endpoint}`, { 
      hasData: !!data,
      status: (data as Record<string, unknown>)?.status 
    });
    return { data: data as T, error: null };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn(`[TwitterAPI] Request timed out for ${endpoint}`);
      return { data: null, error: 'Request timed out' };
    }
    logger.error('[TwitterAPI] Request failed:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get user profile by username
 */
async function getUserProfile(username: string): Promise<{ profile: TwitterUserProfile | null; error: string | null }> {
  const result = await callTwitterAPI<{
    status?: string;
    msg?: string;
    data?: {
      id?: string;
      userName?: string;
      name?: string;
      description?: string;
      followers?: number;
      following?: number;
      statusesCount?: number;
      favouritesCount?: number;
      isVerified?: boolean;
      isBlueVerified?: boolean;
      createdAt?: string;
      profilePicture?: string;
      location?: string;
      url?: string;
    };
  }>('/twitter/user/info', { userName: username });
  
  if (result.error || !result.data?.data || result.data.status !== 'success') {
    return { profile: null, error: result.error || result.data?.msg || 'User not found' };
  }
  
  const userData = result.data.data;
  const profile: TwitterUserProfile = {
    id: userData.id || '',
    username: userData.userName || username,
    name: userData.name || '',
    description: userData.description || '',
    followers: userData.followers || 0,
    following: userData.following || 0,
    tweetCount: userData.statusesCount || 0,
    listedCount: 0, // Not in this API response
    verified: userData.isVerified || userData.isBlueVerified || false,
    createdAt: userData.createdAt || '',
    profileImageUrl: userData.profilePicture || '',
    location: userData.location,
    url: userData.url,
  };
  
  logger.info(`[TwitterAPI] Got profile for @${username}`, {
    followers: profile.followers,
    tweetCount: profile.tweetCount,
    verified: profile.verified,
  });
  
  return { profile, error: null };
}

/**
 * Get user's recent tweets
 */
async function getUserTweets(userId: string, count: number = 20): Promise<{ tweets: TwitterTweet[]; error: string | null }> {
  const result = await callTwitterAPI<{
    status?: string;
    msg?: string;
    data?: {
      tweets?: Array<{
        id?: string;
        text?: string;
        createdAt?: string;
        likeCount?: number;
        retweetCount?: number;
        replyCount?: number;
        quoteCount?: number;
        viewCount?: number;
        isReply?: boolean;
        type?: string;
      }>;
    };
  }>('/twitter/user/last_tweets', { userId, count: count.toString() });
  
  if (result.error || !result.data?.data?.tweets || result.data.status !== 'success') {
    return { tweets: [], error: result.error || result.data?.msg || 'No tweets found' };
  }
  
  const tweets: TwitterTweet[] = result.data.data.tweets.map(t => ({
    id: t.id || '',
    text: t.text || '',
    createdAt: t.createdAt || '',
    likes: t.likeCount || 0,
    retweets: t.retweetCount || 0,
    replies: t.replyCount || 0,
    quotes: t.quoteCount || 0,
    views: t.viewCount || 0,
    isRetweet: t.text?.startsWith('RT @') || false,
    isReply: t.isReply || false,
  }));
  
  logger.info(`[TwitterAPI] Got ${tweets.length} tweets for user ${userId}`);
  
  return { tweets, error: null };
}

/**
 * Search for mentions of a term (e.g., $BTC, @project)
 */
async function searchMentions(query: string, count: number = 50): Promise<{ tweets: TwitterTweet[]; users: Map<string, number>; error: string | null }> {
  const result = await callTwitterAPI<{
    tweets?: Array<{
      id?: string;
      text?: string;
      createdAt?: string;
      likeCount?: number;
      retweetCount?: number;
      replyCount?: number;
      quoteCount?: number;
      author?: {
        userName?: string;
        followers?: number;
      };
    }>;
    has_next_page?: boolean;
  }>('/twitter/tweet/advanced_search', { query, count: count.toString() });
  
  if (result.error || !result.data?.tweets) {
    return { tweets: [], users: new Map(), error: result.error || 'No mentions found' };
  }
  
  const tweets: TwitterTweet[] = [];
  const users = new Map<string, number>();
  
  for (const t of result.data.tweets) {
    tweets.push({
      id: t.id || '',
      text: t.text || '',
      createdAt: t.createdAt || '',
      likes: t.likeCount || 0,
      retweets: t.retweetCount || 0,
      replies: t.replyCount || 0,
      quotes: t.quoteCount || 0,
      isRetweet: t.text?.startsWith('RT @') || false,
      isReply: false,
    });
    
    if (t.author?.userName) {
      users.set(t.author.userName, t.author.followers || 0);
    }
  }
  
  logger.info(`[TwitterAPI] Search for "${query}" found ${tweets.length} tweets from ${users.size} users`);
  
  return { tweets, users, error: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate engagement metrics from tweets
 */
function calculateEngagementMetrics(tweets: TwitterTweet[], followers: number): TwitterEngagementMetrics {
  if (tweets.length === 0) {
    return {
      avgLikesPerTweet: 0,
      avgRetweetsPerTweet: 0,
      avgRepliesPerTweet: 0,
      avgViewsPerTweet: 0,
      engagementRate: 0,
      tweetsPerDay: 0,
      mostEngagedTweet: null,
    };
  }
  
  // Filter out retweets for engagement calculation
  const originalTweets = tweets.filter(t => !t.isRetweet);
  if (originalTweets.length === 0) {
    return {
      avgLikesPerTweet: 0,
      avgRetweetsPerTweet: 0,
      avgRepliesPerTweet: 0,
      avgViewsPerTweet: 0,
      engagementRate: 0,
      tweetsPerDay: tweets.length / 7, // Estimate
      mostEngagedTweet: null,
    };
  }
  
  const totalLikes = originalTweets.reduce((sum, t) => sum + t.likes, 0);
  const totalRetweets = originalTweets.reduce((sum, t) => sum + t.retweets, 0);
  const totalReplies = originalTweets.reduce((sum, t) => sum + t.replies, 0);
  const totalViews = originalTweets.reduce((sum, t) => sum + (t.views || 0), 0);
  
  const avgLikes = totalLikes / originalTweets.length;
  const avgRetweets = totalRetweets / originalTweets.length;
  const avgReplies = totalReplies / originalTweets.length;
  const avgViews = totalViews / originalTweets.length;
  
  // Engagement rate = (likes + RTs + replies) / followers * 100
  const engagementRate = followers > 0 
    ? ((avgLikes + avgRetweets + avgReplies) / followers) * 100 
    : 0;
  
  // Find most engaged tweet
  const mostEngaged = [...originalTweets].sort((a, b) => 
    (b.likes + b.retweets + b.replies) - (a.likes + a.retweets + a.replies)
  )[0] || null;
  
  // Calculate tweets per day (estimate from tweet timestamps)
  let tweetsPerDay = originalTweets.length / 7; // Default: assume 7 days of tweets
  if (originalTweets.length >= 2) {
    const newest = new Date(originalTweets[0].createdAt).getTime();
    const oldest = new Date(originalTweets[originalTweets.length - 1].createdAt).getTime();
    const daySpan = (newest - oldest) / (1000 * 60 * 60 * 24);
    if (daySpan > 0) {
      tweetsPerDay = originalTweets.length / daySpan;
    }
  }
  
  return {
    avgLikesPerTweet: Math.round(avgLikes * 10) / 10,
    avgRetweetsPerTweet: Math.round(avgRetweets * 10) / 10,
    avgRepliesPerTweet: Math.round(avgReplies * 10) / 10,
    avgViewsPerTweet: Math.round(avgViews),
    engagementRate: Math.round(engagementRate * 1000) / 1000,
    tweetsPerDay: Math.round(tweetsPerDay * 10) / 10,
    mostEngagedTweet: mostEngaged,
  };
}

/**
 * Simple sentiment analysis (keyword-based)
 * In production, use a proper NLP model
 */
function analyzeSentiment(text: string): number {
  const positiveWords = [
    'bullish', 'moon', 'pump', 'buy', 'gem', 'amazing', 'great', 'love',
    'profit', 'gains', 'winner', 'success', 'strong', 'breakout', 'ath',
    'undervalued', 'potential', 'exciting', '🚀', '💎', '🔥', '💪', '📈'
  ];
  const negativeWords = [
    'bearish', 'dump', 'sell', 'scam', 'rug', 'dead', 'trash', 'avoid',
    'loss', 'crash', 'fake', 'warning', 'ponzi', 'shit', 'rekt', 'down',
    'overvalued', 'bubble', '📉', '💀', '🚨', '⚠️'
  ];
  
  const textLower = text.toLowerCase();
  let score = 0;
  
  for (const word of positiveWords) {
    if (textLower.includes(word)) score += 0.1;
  }
  for (const word of negativeWords) {
    if (textLower.includes(word)) score -= 0.1;
  }
  
  // Clamp to -1 to 1
  return Math.max(-1, Math.min(1, score));
}

/**
 * Analyze mentions for sentiment and influencer coverage
 */
function analyzeMentions(tweets: TwitterTweet[], users: Map<string, number>): TwitterMentionAnalysis {
  if (tweets.length === 0) {
    return {
      totalMentions: 0,
      uniqueUsers: 0,
      avgSentiment: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      topInfluencers: [],
      mentionVelocity: 0,
    };
  }
  
  // Analyze sentiment
  const sentiments = tweets.map(t => analyzeSentiment(t.text));
  const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  
  const positive = sentiments.filter(s => s > 0.1).length / sentiments.length;
  const negative = sentiments.filter(s => s < -0.1).length / sentiments.length;
  const neutral = 1 - positive - negative;
  
  // Find top influencers
  const sortedUsers = [...users.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const topInfluencers = sortedUsers.map(([username, followers]) => ({
    username,
    followers,
    sentiment: 0, // Would need per-user tweet analysis
  }));
  
  // Calculate mention velocity (mentions per hour)
  let mentionVelocity = tweets.length / 24; // Default: assume 24 hours
  if (tweets.length >= 2) {
    const newest = new Date(tweets[0].createdAt).getTime();
    const oldest = new Date(tweets[tweets.length - 1].createdAt).getTime();
    const hourSpan = (newest - oldest) / (1000 * 60 * 60);
    if (hourSpan > 0) {
      mentionVelocity = tweets.length / hourSpan;
    }
  }
  
  return {
    totalMentions: tweets.length,
    uniqueUsers: users.size,
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    sentimentDistribution: {
      positive: Math.round(positive * 100),
      neutral: Math.round(neutral * 100),
      negative: Math.round(negative * 100),
    },
    topInfluencers,
    mentionVelocity: Math.round(mentionVelocity * 10) / 10,
  };
}

/**
 * Calculate OmniScore-compatible scores from Twitter data
 */
function calculateScores(
  profile: TwitterUserProfile | null,
  engagement: TwitterEngagementMetrics | null,
  followerQuality: TwitterFollowerQuality | null,
  mentions: TwitterMentionAnalysis | null
): TwitterProjectIntelligence['scores'] {
  // Default scores
  let followerScore = 50;
  let engagementScore = 50;
  let authenticityScore = 50;
  let sentimentScore = 50;
  let activityScore = 50;
  
  // Follower score (log scale, maxes out around 1M followers)
  if (profile) {
    const logFollowers = Math.log10(Math.max(1, profile.followers));
    followerScore = Math.min(100, (logFollowers / 6) * 100); // 1M followers = 100
  }
  
  // Engagement score (engagement rate comparison)
  if (engagement) {
    // Average crypto project engagement is 0.5-2%
    // Great is 3%+, poor is <0.3%
    const engRate = engagement.engagementRate;
    if (engRate >= 3) engagementScore = 90 + Math.min(10, (engRate - 3) * 2);
    else if (engRate >= 1) engagementScore = 60 + (engRate - 1) * 15;
    else if (engRate >= 0.3) engagementScore = 30 + (engRate - 0.3) * 43;
    else engagementScore = engRate / 0.3 * 30;
  }
  
  // Authenticity score (inverse of bot ratio)
  if (followerQuality) {
    authenticityScore = (1 - followerQuality.estimatedBotRatio) * 100;
  }
  
  // Sentiment score (mapped from -1 to +1 → 0 to 100)
  if (mentions) {
    sentimentScore = ((mentions.avgSentiment + 1) / 2) * 100;
  }
  
  // Activity score (tweets per day)
  if (engagement) {
    // 1-3 tweets/day is healthy, >10 might be spam
    const tpd = engagement.tweetsPerDay;
    if (tpd >= 1 && tpd <= 5) activityScore = 70 + Math.min(30, (tpd - 1) * 7.5);
    else if (tpd > 5 && tpd <= 10) activityScore = 100 - (tpd - 5) * 6;
    else if (tpd > 10) activityScore = 70 - Math.min(40, (tpd - 10) * 4);
    else activityScore = tpd * 70; // Less than 1 tweet/day
  }
  
  // Overall COMM score (weighted average)
  const overallCommScore = Math.round(
    followerScore * 0.25 +
    engagementScore * 0.30 +
    authenticityScore * 0.20 +
    sentimentScore * 0.15 +
    activityScore * 0.10
  );
  
  return {
    followerScore: Math.round(followerScore),
    engagementScore: Math.round(engagementScore),
    authenticityScore: Math.round(authenticityScore),
    sentimentScore: Math.round(sentimentScore),
    activityScore: Math.round(activityScore),
    overallCommScore: Math.min(100, Math.max(0, overallCommScore)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMM v2: SPLIT ARCHITECTURE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Peer medians for context normalization
 * These would ideally be computed from historical data across all projects
 */
const PEER_BENCHMARKS: Record<string, { median: number; mad: number }> = {
  // sector:capBucket -> { median followers, MAD }
  'L1:mega': { median: 5000000, mad: 2000000 },
  'L1:large': { median: 1500000, mad: 500000 },
  'L1:mid': { median: 500000, mad: 200000 },
  'L1:small': { median: 100000, mad: 50000 },
  'L1:micro': { median: 20000, mad: 15000 },
  'L2:large': { median: 1000000, mad: 400000 },
  'L2:mid': { median: 300000, mad: 150000 },
  'L2:small': { median: 80000, mad: 40000 },
  'DeFi:large': { median: 800000, mad: 300000 },
  'DeFi:mid': { median: 200000, mad: 100000 },
  'DeFi:small': { median: 50000, mad: 30000 },
  'Infrastructure:mid': { median: 400000, mad: 200000 },
  'Meme:large': { median: 2000000, mad: 1000000 },
  'Meme:mid': { median: 500000, mad: 300000 },
  'Meme:small': { median: 100000, mad: 80000 },
  'default': { median: 300000, mad: 200000 },
};

/**
 * Calculate COMM-B (Base Strength)
 * Stable, harder-to-fake community foundation
 */
function calculateCommBase(
  profile: TwitterUserProfile | null,
  engagement: TwitterEngagementMetrics | null,
  mentions: TwitterMentionAnalysis | null,
  followerQuality: TwitterFollowerQuality | null
): CommBaseScore {
  let followerQualityScore = 50;
  let uniqueEngagers30d = 50;
  let discordActiveRatio = 50; // Estimated
  let devCommunitySignal = 50; // Would need GitHub data
  
  if (profile && followerQuality) {
    // Follower quality = real followers * account age factor
    const realFollowers = followerQuality.estimatedRealFollowers;
    const logReal = Math.log10(Math.max(1, realFollowers));
    const accountAgeDays = profile.createdAt ? 
      (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24) : 365;
    const ageMultiplier = Math.min(1.2, Math.max(0.8, accountAgeDays / 1000));
    followerQualityScore = Math.min(100, (logReal / 6) * 100 * ageMultiplier);
  } else if (profile) {
    const logFollowers = Math.log10(Math.max(1, profile.followers));
    followerQualityScore = Math.min(100, (logFollowers / 6) * 100);
  }
  
  // Unique engagers - based on mentions unique users
  if (mentions && mentions.uniqueUsers > 0) {
    // Normalize: 100+ unique engagers in mentions = high score
    uniqueEngagers30d = Math.min(100, (mentions.uniqueUsers / 100) * 100);
  }
  
  // Discord active ratio (estimate based on Twitter engagement)
  if (engagement) {
    // High Twitter engagement suggests active community
    discordActiveRatio = Math.min(100, engagement.engagementRate * 30 + 20);
  }
  
  // Dev community signal (would need GitHub Discussions data)
  // For now, estimate based on profile completeness
  if (profile) {
    devCommunitySignal = profile.description.length > 50 ? 60 : 40;
  }
  
  const baseScore = (
    followerQualityScore * 0.35 +
    uniqueEngagers30d * 0.30 +
    discordActiveRatio * 0.20 +
    devCommunitySignal * 0.15
  );
  
  return {
    score: Math.round(baseScore),
    components: {
      followerQuality: Math.round(followerQualityScore),
      uniqueEngagers30d: Math.round(uniqueEngagers30d),
      discordActiveRatio: Math.round(discordActiveRatio),
      devCommunitySignal: Math.round(devCommunitySignal),
    },
  };
}

/**
 * Calculate COMM-V (Velocity)
 * Short-term momentum - useful for traders but highly gameable
 */
function calculateCommVelocity(
  profile: TwitterUserProfile | null,
  engagement: TwitterEngagementMetrics | null,
  mentions: TwitterMentionAnalysis | null,
  tweets: TwitterTweet[]
): CommVelocityScore {
  let growth7d = 50;
  let growth30d = 50;
  let sentimentShift7d = 50;
  let attentionBurst = 0;
  let crossPlatformSync = 50;
  
  // Growth rates (would need historical data for accurate calculation)
  // For now, estimate based on recent activity vs follower count
  if (profile && engagement) {
    // Active accounts with high engagement suggest growth
    const activityRatio = engagement.tweetsPerDay / Math.max(1, Math.log10(profile.followers + 1));
    growth7d = Math.min(100, Math.max(0, 50 + activityRatio * 10));
    growth30d = Math.min(100, Math.max(0, 50 + activityRatio * 8));
  }
  
  // Sentiment shift - compare recent tweets sentiment
  if (tweets.length > 0) {
    const recentSentiments = tweets.slice(0, 10).map(t => analyzeSentiment(t.text));
    const avgRecent = recentSentiments.reduce((a, b) => a + b, 0) / recentSentiments.length;
    sentimentShift7d = ((avgRecent + 1) / 2) * 100;
  }
  
  // Attention burst detection (unusual spike in mentions)
  if (mentions) {
    // High mention velocity relative to follower count = attention burst
    if (profile) {
      const expectedVelocity = Math.log10(profile.followers + 1) / 10;
      if (mentions.mentionVelocity > expectedVelocity * 3) {
        attentionBurst = Math.min(100, (mentions.mentionVelocity / expectedVelocity) * 20);
      }
    }
  }
  
  // Cross-platform sync (would need multi-platform data)
  // For now, use as placeholder
  crossPlatformSync = mentions && mentions.uniqueUsers > 10 ? 60 : 40;
  
  const velocityScore = (
    growth7d * 0.25 +
    growth30d * 0.20 +
    sentimentShift7d * 0.25 +
    attentionBurst * 0.15 +
    crossPlatformSync * 0.15
  );
  
  return {
    score: Math.round(velocityScore),
    components: {
      growth7d: Math.round(growth7d),
      growth30d: Math.round(growth30d),
      sentimentShift7d: Math.round(sentimentShift7d),
      attentionBurst: Math.round(attentionBurst),
      crossPlatformSync: Math.round(crossPlatformSync),
    },
  };
}

/**
 * Calculate Gini coefficient for engagement distribution
 * Measures inequality: 0 = perfect equality, 1 = maximum inequality
 */
function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  if (sum === 0) return 0;
  
  let cumulativeSum = 0;
  let giniNumerator = 0;
  
  for (let i = 0; i < n; i++) {
    cumulativeSum += sorted[i];
    giniNumerator += (2 * (i + 1) - n - 1) * sorted[i];
  }
  
  return giniNumerator / (n * sum);
}

/**
 * Detect if an account name matches verified anchor patterns
 */
function isVerifiedAnchor(username: string): boolean {
  return VERIFIED_ANCHOR_PATTERNS.some(pattern => pattern.test(username));
}

/**
 * Calculate enhanced Influencer Concentration Risk (ICR v2.2)
 * Now includes: peer normalization + verified anchor discount
 */
function calculateICR(
  mentions: TwitterMentionAnalysis | null,
  sector: string = 'Unknown',
  capBucket: string = 'mid'
): InfluencerConcentrationRisk {
  const emptyICR: InfluencerConcentrationRisk = { 
    top3: 0, top10: 0, gini: 0, composite: 0,
    peerNormalized: { rawICR: 0, peerZ: 0, peerMean: 0.6, peerStd: 0.15 },
    verifiedAnchorDiscount: { applied: false, discountFactor: 1.0, anchorAccountsDetected: [] },
    effective: 0,
  };
  
  if (!mentions || mentions.topInfluencers.length === 0) {
    return emptyICR;
  }
  
  const followers = mentions.topInfluencers.map(i => i.followers);
  const totalFollowers = followers.reduce((sum, f) => sum + f, 0);
  
  if (totalFollowers === 0) {
    return emptyICR;
  }
  
  // Top-3 concentration
  const top3 = followers.slice(0, 3).reduce((sum, f) => sum + f, 0) / totalFollowers;
  
  // Top-10 concentration
  const top10 = followers.slice(0, 10).reduce((sum, f) => sum + f, 0) / totalFollowers;
  
  // Gini coefficient
  const gini = calculateGiniCoefficient(followers);
  
  // Composite: weighted average (Top-10 is most stable)
  const composite = top3 * 0.3 + top10 * 0.5 + gini * 0.2;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: PEER NORMALIZATION
  // z(ICR | sector, cap) - high ICR is less suspicious if peers are similar
  // ═══════════════════════════════════════════════════════════════════════════
  const peerKey = `${sector}:${capBucket}`;
  const peerBenchmark = ICR_PEER_BENCHMARKS[peerKey] || ICR_PEER_BENCHMARKS['default'];
  const peerZ = (composite - peerBenchmark.mean) / (peerBenchmark.std + 0.01);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: VERIFIED ANCHOR DISCOUNT
  // Reduce ICR penalty if top accounts are institutional (foundation, docs, etc)
  // ═══════════════════════════════════════════════════════════════════════════
  const anchorAccountsDetected: string[] = [];
  for (const influencer of mentions.topInfluencers.slice(0, 5)) {
    if (isVerifiedAnchor(influencer.username)) {
      anchorAccountsDetected.push(influencer.username);
    }
  }
  
  // Apply 30% discount if 2+ verified anchors in top 5
  const hasAnchors = anchorAccountsDetected.length >= 2;
  const discountFactor = hasAnchors ? 0.7 : 1.0;
  
  // Effective ICR = composite adjusted by peer context and anchor discount
  // If peerZ is low (ICR is normal for this sector), reduce penalty
  // If anchors detected, apply discount
  let effectiveICR = composite;
  
  // Peer adjustment: if ICR is within 1 std of peer mean, reduce impact
  if (peerZ < 1.0) {
    effectiveICR = effectiveICR * (0.7 + 0.3 * Math.max(0, peerZ));
  }
  
  // Apply anchor discount
  effectiveICR = effectiveICR * discountFactor;
  
  return {
    top3: Math.min(1, Math.max(0, top3)),
    top10: Math.min(1, Math.max(0, top10)),
    gini: Math.min(1, Math.max(0, gini)),
    composite: Math.min(1, Math.max(0, composite)),
    peerNormalized: {
      rawICR: composite,
      peerZ: Math.round(peerZ * 100) / 100,
      peerMean: peerBenchmark.mean,
      peerStd: peerBenchmark.std,
    },
    verifiedAnchorDiscount: {
      applied: hasAnchors,
      discountFactor,
      anchorAccountsDetected,
    },
    effective: Math.min(1, Math.max(0, effectiveICR)),
  };
}

/**
 * Calculate Risk Factors v2.2
 * BotRisk, AnomalyScore, Influencer Concentration (ICR v2.2 with peer normalization)
 */
function calculateRiskFactors(
  profile: TwitterUserProfile | null,
  followerQuality: TwitterFollowerQuality | null,
  mentions: TwitterMentionAnalysis | null,
  engagement: TwitterEngagementMetrics | null,
  sector: string = 'Unknown',
  capBucket: string = 'mid'
): CommRiskFactors {
  let botRisk = 0.15; // Base assumption
  let anomalyScore = 0;
  let sentimentDispersion = 0;
  
  // Bot risk from follower quality
  if (followerQuality) {
    botRisk = followerQuality.estimatedBotRatio;
  }
  
  // Anomaly detection
  if (profile && engagement) {
    // Check for suspicious patterns
    const followingRatio = profile.following / Math.max(1, profile.followers);
    const tweetRatio = profile.tweetCount / Math.max(1, profile.followers);
    
    // High following/follower ratio is suspicious
    if (followingRatio > 1) anomalyScore += 0.2;
    if (followingRatio > 2) anomalyScore += 0.2;
    
    // Very low tweet count for follower size is suspicious
    if (tweetRatio < 0.001 && profile.followers > 100000) anomalyScore += 0.2;
    
    // Unusually high engagement rate might be bots
    if (engagement.engagementRate > 10) anomalyScore += 0.3;
  }
  
  // Enhanced Influencer Concentration Risk (ICR v2.2)
  // Now with peer normalization and verified anchor discount
  const icr = calculateICR(mentions, sector, capBucket);
  
  // Sentiment dispersion (polarized = high penalty)
  if (mentions && mentions.sentimentDistribution) {
    const { positive, negative } = mentions.sentimentDistribution;
    // High polarization = both positive and negative are high
    const polarization = Math.min(positive, negative) / 50; // 0-1
    sentimentDispersion = polarization;
  }
  
  return {
    botRisk: Math.min(1, Math.max(0, botRisk)),
    anomalyScore: Math.min(1, Math.max(0, anomalyScore)),
    influencerConcentration: icr,
    sentimentDispersion: Math.min(1, Math.max(0, sentimentDispersion)),
  };
}

/**
 * Calculate Multi-Source Coherence (MSC) v2.1
 * Cross-platform agreement score with independence tracking and reasons
 */
function calculateMultiSourceCoherence(
  mentions: TwitterMentionAnalysis | null,
  hasTwitter: boolean,
  hasDiscord: boolean = false,
  hasTelegram: boolean = false,
  hasReddit: boolean = false
): MultiSourceCoherence {
  const sources: string[] = [];
  const divergences: string[] = [];
  const independenceReasons: string[] = [];
  
  if (hasTwitter) sources.push('x');  // Use 'x' as current platform name
  if (hasDiscord) sources.push('discord');
  if (hasTelegram) sources.push('telegram');
  if (hasReddit) sources.push('reddit');
  
  // Calculate independence score (how independent are the sources)
  // Twitter-only = 0.3 (highly correlated, single point of failure)
  // Twitter + Discord = 0.5 (some independence)
  // Twitter + Discord + Telegram = 0.7 (good independence)
  // All four = 0.9 (excellent independence)
  let independenceScore = Math.min(0.9, 0.2 + sources.length * 0.2);
  
  // Generate independence reasons (for audit transparency)
  if (sources.length === 1) {
    independenceReasons.push('single_platform_dependency');
    independenceReasons.push('no_cross_validation_possible');
  }
  if (sources.length === 1 && sources[0] === 'x') {
    independenceReasons.push('x_only_high_bot_exposure');
    independenceScore = Math.min(independenceScore, 0.3);
  }
  if (sources.includes('x') && sources.includes('telegram') && !sources.includes('discord')) {
    // X and Telegram often share influencer clusters
    independenceReasons.push('same_influencer_cluster_risk');
    independenceScore = Math.min(independenceScore, 0.5);
  }
  // Check if mentions suggest same content echoing
  if (mentions && mentions.uniqueUsers < 20) {
    independenceReasons.push('low_unique_voices');
  }
  
  // Single source = low coherence
  // INV-COMM-6: MSC cap only applies if sources < 2
  if (sources.length < 2) {
    return {
      score: 0.4,                     // Single source penalty
      sources,
      sourceCount: sources.length,
      independenceScore: 0.3,         // Low independence
      independenceReasons: ['single_platform_data_only', 'cross_validation_not_possible'],
      divergences: ['Single platform data only - cross-validation not possible'],
    };
  }
  
  // Multi-source coherence (would need actual cross-platform comparison)
  // For now, assume moderate coherence with multiple sources
  let score = 0.5 + sources.length * 0.15;
  
  // Cap at 0.95
  score = Math.min(0.95, score);
  
  // If no independence issues found
  if (independenceReasons.length === 0) {
    independenceReasons.push('multi_platform_validated');
  }
  
  return {
    score,
    sources,
    sourceCount: sources.length,
    independenceScore,
    independenceReasons,
    divergences,
  };
}

/**
 * Peer sample sizes for confidence estimation
 */
const PEER_SAMPLE_SIZES: Record<string, number> = {
  'L1:mega': 15, 'L1:large': 40, 'L1:mid': 80, 'L1:small': 120, 'L1:micro': 200,
  'L2:large': 30, 'L2:mid': 60, 'L2:small': 100,
  'DeFi:large': 50, 'DeFi:mid': 150, 'DeFi:small': 300,
  'Infrastructure:mid': 60,
  'Meme:large': 20, 'Meme:mid': 100, 'Meme:small': 500,
  'default': 100,
};

/**
 * Peer-normalize COMM score v2.1
 * Compare to sector + cap bucket median with fallback ladder
 * 
 * PEER-SUFFICIENCY HARD RULE:
 * If peerConfidence === "insufficient", peer boost is disabled
 */
function peerNormalize(
  rawScore: number,
  followers: number,
  sector: string,
  capBucket: string
): CommPeerContext {
  // Fallback ladder: sector_cap → sector_only → global
  const sectorCapKey = `${sector}:${capBucket}`;
  const sectorOnlyKey = `${sector}:mid`;  // Fallback to mid cap for sector
  
  let benchmark = PEER_BENCHMARKS[sectorCapKey];
  let fallbackUsed: CommPeerContext['fallbackUsed'] = 'sector_cap';
  let sampleSize = PEER_SAMPLE_SIZES[sectorCapKey] || PEER_SAMPLE_SIZES['default'];
  
  if (!benchmark) {
    benchmark = PEER_BENCHMARKS[sectorOnlyKey];
    fallbackUsed = 'sector_only';
    sampleSize = Math.floor(sampleSize * 0.7); // Lower sample in fallback
  }
  
  if (!benchmark) {
    benchmark = PEER_BENCHMARKS['default'];
    fallbackUsed = 'global';
    sampleSize = Math.floor(sampleSize * 0.5);
  }
  
  // Determine peer confidence
  let peerConfidence: PeerConfidenceLevel;
  if (sampleSize >= 50 && fallbackUsed === 'sector_cap') {
    peerConfidence = 'high';
  } else if (sampleSize >= 20 && fallbackUsed !== 'global') {
    peerConfidence = 'medium';
  } else if (sampleSize >= 10) {
    peerConfidence = 'low';
  } else {
    peerConfidence = 'insufficient';
  }
  
  // PEER-SUFFICIENCY HARD RULE:
  // If insufficient, disable peer boost entirely
  const peerBoostDisabled = peerConfidence === 'insufficient';
  
  return {
    sector,
    capBucket,
    peerMedian: benchmark.median,
    peerMAD: benchmark.mad,
    peerConfidence,
    fallbackUsed,
    sampleSize,
    peerBoostDisabled,
  };
}

/**
 * Validate COMM-local invariants
 * Returns list of violations (empty = all valid)
 */
function validateCommInvariants(
  base: CommBaseScore,
  velocity: CommVelocityScore,
  risks: CommRiskFactors,
  multiSource: MultiSourceCoherence,
  commRaw: number,
  commAdj: number,
  commCapped: number,
  mscCapApplied: boolean
): string[] {
  const violations: string[] = [];
  
  // INV-COMM-1: Score bounds [0, 100]
  if (base.score < 0 || base.score > 100) {
    violations.push(`COMM-B out of bounds: ${base.score}`);
  }
  if (velocity.score < 0 || velocity.score > 100) {
    violations.push(`COMM-V out of bounds: ${velocity.score}`);
  }
  
  // INV-COMM-2: Risk factors in [0, 1]
  if (risks.botRisk < 0 || risks.botRisk > 1) {
    violations.push(`BotRisk out of bounds: ${risks.botRisk}`);
  }
  if (risks.anomalyScore < 0 || risks.anomalyScore > 1) {
    violations.push(`AnomalyScore out of bounds: ${risks.anomalyScore}`);
  }
  if (risks.influencerConcentration.composite < 0 || risks.influencerConcentration.composite > 1) {
    violations.push(`ICR composite out of bounds: ${risks.influencerConcentration.composite}`);
  }
  if (risks.sentimentDispersion < 0 || risks.sentimentDispersion > 1) {
    violations.push(`SentimentDispersion out of bounds: ${risks.sentimentDispersion}`);
  }
  
  // INV-COMM-3: Monotonic cap rule (higher BotRisk cannot increase COMM)
  // This is enforced by the cap logic, but we verify the outcome
  if (risks.botRisk > 0.40 && commCapped > 50) {
    violations.push(`Monotonic cap violation: BotRisk=${risks.botRisk} but commCapped=${commCapped}`);
  }
  if (risks.botRisk > 0.60 && commCapped > 35) {
    violations.push(`Monotonic cap violation: BotRisk=${risks.botRisk} but commCapped=${commCapped}`);
  }
  if (risks.botRisk > 0.80 && commCapped > 20) {
    violations.push(`Monotonic cap violation: BotRisk=${risks.botRisk} but commCapped=${commCapped}`);
  }
  
  // INV-COMM-4: Risk adjustment cannot increase score
  if (commAdj > commRaw + 0.01) { // Small epsilon for floating point
    violations.push(`Risk adjustment increased score: ${commRaw} → ${commAdj}`);
  }
  
  // INV-COMM-5: Caps cannot increase score
  if (commCapped > commAdj + 0.01) {
    violations.push(`Cap increased score: ${commAdj} → ${commCapped}`);
  }
  
  // INV-COMM-6: MSC cap applied only if sources < 2
  // A single platform should never satisfy coherence logic
  if (mscCapApplied && multiSource.sourceCount >= 2) {
    violations.push(`MSC cap applied with ${multiSource.sourceCount} sources (should only apply with <2)`);
  }
  if (!mscCapApplied && multiSource.sourceCount < 2 && multiSource.score < 0.75) {
    violations.push(`MSC cap NOT applied despite single source and low score`);
  }
  
  return violations;
}

/**
 * Calculate complete COMM v2.1 output
 * 
 * PIPELINE ORDER (explicit for audit):
 * 1. Compute COMM-B (Base)
 * 2. Compute COMM-V (Velocity)
 * 3. Combine → commRaw
 * 4. Apply risk multipliers → commAdj
 * 5. Apply hard caps → commCapped
 * 6. Peer-normalize → commPeerZ
 * 7. Output commFinal
 */
function calculateCommV2(
  profile: TwitterUserProfile | null,
  engagement: TwitterEngagementMetrics | null,
  followerQuality: TwitterFollowerQuality | null,
  mentions: TwitterMentionAnalysis | null,
  tweets: TwitterTweet[],
  sector: string = 'Unknown',
  capBucket: string = 'mid'
): CommV2Output {
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Compute COMM-B (Base Strength)
  // ═══════════════════════════════════════════════════════════════════════════
  const base = calculateCommBase(profile, engagement, mentions, followerQuality);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Compute COMM-V (Velocity)
  // ═══════════════════════════════════════════════════════════════════════════
  const velocity = calculateCommVelocity(profile, engagement, mentions, tweets);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Combine → commRaw
  // ═══════════════════════════════════════════════════════════════════════════
  const WEIGHT_BASE = 0.65;
  const WEIGHT_VELOCITY = 0.35;
  const commRaw = base.score * WEIGHT_BASE + velocity.score * WEIGHT_VELOCITY;
  
  // Calculate risk factors (needed for step 4)
  // v2.2: Now includes peer normalization and verified anchor discount
  const risks = calculateRiskFactors(profile, followerQuality, mentions, engagement, sector, capBucket);
  const multiSource = calculateMultiSourceCoherence(mentions, !!profile, false, false, false);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Apply risk multipliers → commAdj
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: Use ICR.effective (already adjusted for peers + anchors)
  let commAdj = commRaw * 
    (1 - risks.botRisk) * 
    (1 - risks.anomalyScore) * 
    (1 - risks.influencerConcentration.effective * 0.5); // ICR effective at 50% weight
  
  // Apply sentiment dispersion penalty
  commAdj = commAdj * (1 - risks.sentimentDispersion * 0.2);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: Apply hard caps → commCapped
  // ═══════════════════════════════════════════════════════════════════════════
  let commCapped = commAdj;
  const capsApplied: CommCapsApplied = {
    botRiskCap: null,
    mscCap: null,
    anyCapActive: false,
  };
  
  // BotRisk caps (tiered)
  if (risks.botRisk > 0.80) {
    capsApplied.botRiskCap = { active: true, threshold: 0.80, upperBound: 20 };
    commCapped = Math.min(commCapped, 20);
  } else if (risks.botRisk > 0.60) {
    capsApplied.botRiskCap = { active: true, threshold: 0.60, upperBound: 35 };
    commCapped = Math.min(commCapped, 35);
  } else if (risks.botRisk > 0.40) {
    capsApplied.botRiskCap = { active: true, threshold: 0.40, upperBound: 50 };
    commCapped = Math.min(commCapped, 50);
  }
  
  // MSC cap (single-source penalty)
  // INV-COMM-6: MSC cap applied only if sources < 2
  const MSC_THRESHOLD = 0.75;
  const mscCapShouldApply = multiSource.sourceCount < 2 && multiSource.score < MSC_THRESHOLD;
  if (mscCapShouldApply) {
    capsApplied.mscCap = { active: true, threshold: MSC_THRESHOLD, upperBound: 70 };
    commCapped = Math.min(commCapped, 70);
  }
  
  capsApplied.anyCapActive = capsApplied.botRiskCap?.active || capsApplied.mscCap?.active || false;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: Peer-normalize → commPeerZ
  // ═══════════════════════════════════════════════════════════════════════════
  const followers = profile?.followers || 0;
  const peerContext = peerNormalize(commCapped, followers, sector, capBucket);
  
  // Calculate peer z-score
  const zFollowers = (followers - peerContext.peerMedian) / (peerContext.peerMAD + 1);
  let commPeerZ = (commCapped - 50) / 25 + zFollowers * 0.3;
  
  // PEER-SUFFICIENCY HARD RULE:
  // If insufficient peer data, force zScore to 0 and disable any positive peer boost
  if (peerContext.peerBoostDisabled) {
    commPeerZ = 0;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: Final output + Invariant validation
  // ═══════════════════════════════════════════════════════════════════════════
  const commFinal = Math.min(100, Math.max(0, commCapped));
  
  // Build forensic trace for trading desks
  const commTrace: CommTrace = {
    commB: Math.round(base.score * 10) / 10,
    commV: Math.round(velocity.score * 10) / 10,
    commRaw: Math.round(commRaw * 10) / 10,
    commAdj: Math.round(commAdj * 10) / 10,
    commCapped: Math.round(commCapped * 10) / 10,
    commPeerZ: Math.round(commPeerZ * 100) / 100,
    commFinal: Math.round(commFinal * 10) / 10,
  };
  
  // Validate COMM-local invariants (now includes INV-COMM-6)
  const invariantViolations = validateCommInvariants(
    base, velocity, risks, multiSource, commRaw, commAdj, commCapped, 
    capsApplied.mscCap?.active || false
  );
  
  return {
    base,
    velocity,
    risks,
    multiSource,
    commRaw: commTrace.commRaw,
    commAdj: commTrace.commAdj,
    commCapped: commTrace.commCapped,
    commPeerZ: commTrace.commPeerZ,
    commFinal: commTrace.commFinal,
    commTrace,
    capsApplied,
    peerContext,
    invariantsValid: invariantViolations.length === 0,
    invariantViolations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: GET TWITTER INTELLIGENCE FOR A PROJECT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get comprehensive Twitter intelligence for a crypto project
 * 
 * @param twitterHandle - The project's Twitter handle (without @)
 * @param searchTerms - Additional search terms (e.g., ['$BTC', 'Bitcoin'])
 * @param options - Configuration options
 */
export async function getTwitterIntelligence(
  twitterHandle: string,
  searchTerms: string[] = [],
  options: {
    skipMentions?: boolean;
    skipFollowerQuality?: boolean;
    forceRefresh?: boolean;
    sector?: string;      // For peer normalization
    capBucket?: string;   // For peer normalization ('mega'|'large'|'mid'|'small'|'micro')
  } = {}
): Promise<TwitterProjectIntelligence> {
  const cacheKey = `twitter:${twitterHandle}:${searchTerms.join(',')}`;
  
  // Check cache
  if (!options.forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      logger.debug(`[TwitterIntel] Cache hit for ${twitterHandle}`);
      return cached;
    }
  }
  
  logger.info(`[TwitterIntel] Fetching data for @${twitterHandle}`, { searchTerms });
  
  const errors: string[] = [];
  let apiCallsUsed = 0;
  let creditsUsed = 0;
  
  // 1. Get user profile
  const { profile, error: profileError } = await getUserProfile(twitterHandle);
  apiCallsUsed++;
  creditsUsed += TWITTER_API_CONFIG.COSTS.USER_INFO;
  
  if (profileError) {
    errors.push(`Profile: ${profileError}`);
  }
  
  // 2. Get user tweets (for engagement metrics)
  let engagement: TwitterEngagementMetrics | null = null;
  let userTweets: TwitterTweet[] = [];
  if (profile) {
    const { tweets, error: tweetsError } = await getUserTweets(profile.id, 30);
    apiCallsUsed++;
    creditsUsed += TWITTER_API_CONFIG.COSTS.USER_TWEETS;
    
    if (tweetsError) {
      errors.push(`Tweets: ${tweetsError}`);
    } else {
      userTweets = tweets;
      engagement = calculateEngagementMetrics(tweets, profile.followers);
    }
  }
  
  // 3. Search for mentions (optional)
  let mentions: TwitterMentionAnalysis | null = null;
  if (!options.skipMentions && searchTerms.length > 0) {
    const query = searchTerms.join(' OR ');
    const { tweets: mentionTweets, users, error: mentionsError } = await searchMentions(query, 100);
    apiCallsUsed++;
    creditsUsed += TWITTER_API_CONFIG.COSTS.SEARCH_TWEETS;
    
    if (mentionsError) {
      errors.push(`Mentions: ${mentionsError}`);
    } else {
      mentions = analyzeMentions(mentionTweets, users);
    }
  }
  
  // 4. Follower quality analysis (optional, expensive)
  // For now, we estimate based on profile metrics
  let followerQuality: TwitterFollowerQuality | null = null;
  if (profile && !options.skipFollowerQuality) {
    // Heuristic-based bot detection (real analysis would sample followers)
    const followingToFollowerRatio = profile.following / Math.max(1, profile.followers);
    const tweetsPerFollower = profile.tweetCount / Math.max(1, profile.followers);
    
    // Suspicious patterns:
    // - Very high following/follower ratio
    // - Very low tweet count for follower size
    // - Very new account with high followers
    
    let estimatedBotRatio = 0.15; // Base assumption: 15% bots on average
    
    if (followingToFollowerRatio > 1) estimatedBotRatio += 0.1;
    if (followingToFollowerRatio > 2) estimatedBotRatio += 0.15;
    if (tweetsPerFollower < 0.01) estimatedBotRatio += 0.1;
    if (profile.followers > 100000 && profile.tweetCount < 1000) estimatedBotRatio += 0.15;
    
    // Cap at 0.8 (we can never be 100% sure)
    estimatedBotRatio = Math.min(0.8, estimatedBotRatio);
    
    followerQuality = {
      sampleSize: 0,  // We didn't actually sample
      avgFollowerCount: 0,
      avgFollowingCount: 0,
      avgTweetCount: 0,
      noProfilePicRatio: 0,
      lowActivityRatio: 0,
      estimatedBotRatio,
      estimatedRealFollowers: Math.round(profile.followers * (1 - estimatedBotRatio)),
    };
  }
  
  // 5. Calculate legacy scores (backwards compatibility)
  const scores = calculateScores(profile, engagement, followerQuality, mentions);
  
  // 6. Calculate COMM v2 (enhanced scoring)
  const sector = options.sector || 'Unknown';
  const capBucket = options.capBucket || 'mid';
  const commV2 = calculateCommV2(
    profile, 
    engagement, 
    followerQuality, 
    mentions, 
    userTweets,
    sector,
    capBucket
  );
  
  // Update overall COMM score to use COMM v2 final score
  const overallCommScoreV2 = Math.round(commV2.commFinal);
  
  // Build result
  const result: TwitterProjectIntelligence = {
    profile,
    profileFound: !!profile,
    engagement,
    followerQuality,
    mentions,
    commV2,
    scores: {
      ...scores,
      overallCommScore: overallCommScoreV2, // Use COMM v2 final score
    },
    fetchedAt: new Date().toISOString(),
    apiCallsUsed,
    creditsUsed,
    errors,
  };
  
  // Cache result
  setCache(cacheKey, result);
  
  logger.info(`[TwitterIntel] Completed for @${twitterHandle}`, {
    profileFound: result.profileFound,
    followers: profile?.followers,
    commV2Score: commV2.commFinal,
    commBase: commV2.base.score,
    commVelocity: commV2.velocity.score,
    commPeerZ: commV2.commPeerZ,
    risks: commV2.risks,
    apiCalls: apiCallsUsed,
    credits: creditsUsed,
    errors: errors.length,
  });
  
  return result;
}

/**
 * Get Twitter handles for known crypto projects
 */
export const KNOWN_PROJECT_HANDLES: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // TOP L1s
  // ═══════════════════════════════════════════════════════════════════════════
  'bitcoin': 'Bitcoin',
  'btc': 'Bitcoin',
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  'solana': 'solana',
  'sol': 'solana',
  'cardano': 'Cardano',
  'ada': 'Cardano',
  'polkadot': 'Polkadot',
  'dot': 'Polkadot',
  'avalanche': 'ava_foundation',
  'avax': 'ava_foundation',
  'near': 'NEARProtocol',
  'aptos': 'Aptos',
  'apt': 'Aptos',
  'sui': 'SuiNetwork',
  'cosmos': 'cosmos',
  'atom': 'cosmos',
  'algorand': 'Algorand',
  'algo': 'Algorand',
  'tezos': 'tezos',
  'xtz': 'tezos',
  'fantom': 'FantomFDN',
  'ftm': 'FantomFDN',
  'hedera': 'hedera',
  'hbar': 'hedera',
  'icp': 'dfinity',
  'internet-computer': 'dfinity',
  'toncoin': 'ton_blockchain',
  'ton': 'ton_blockchain',
  'supra': 'SABORATORY_Labs',
  'kaspa': 'KaspaLabs',
  'kas': 'KaspaLabs',
  'sei': 'SeiNetwork',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // L2s
  // ═══════════════════════════════════════════════════════════════════════════
  'polygon': '0xPolygon',
  'matic': '0xPolygon',
  'arbitrum': 'arbitrum',
  'arb': 'arbitrum',
  'optimism': 'Optimism',
  'op': 'Optimism',
  'base': 'base',
  'zksync': 'ZK_sync_era',
  'starknet': 'Starknet',
  'strk': 'Starknet',
  'mantle': '0xMantle',
  'mnt': '0xMantle',
  'scroll': 'Scroll_ZKP',
  'linea': 'LineaBuild',
  'blast': 'Blast_L2',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DEFI
  // ═══════════════════════════════════════════════════════════════════════════
  'uniswap': 'Uniswap',
  'uni': 'Uniswap',
  'aave': 'AaveAave',
  'curve': 'CurveFinance',
  'crv': 'CurveFinance',
  'maker': 'MakerDAO',
  'mkr': 'MakerDAO',
  'compound': 'compoundfinance',
  'comp': 'compoundfinance',
  'lido': 'LidoFinance',
  'steth': 'LidoFinance',
  'gmx': 'GMX_IO',
  'dydx': 'dYdX',
  'pancakeswap': 'PancakeSwap',
  'cake': 'PancakeSwap',
  'sushiswap': 'SushiSwap',
  'sushi': 'SushiSwap',
  'synthetix': 'synthetix_io',
  'snx': 'synthetix_io',
  'yearn': 'yearnfi',
  'yfi': 'yearnfi',
  'convex': 'ConvexFinance',
  'cvx': 'ConvexFinance',
  'frax': 'frax_finance',
  'balancer': 'Balancer',
  'bal': 'Balancer',
  'pendle': 'pendle_fi',
  'jupiter': 'JupiterExchange',
  'jup': 'JupiterExchange',
  'raydium': 'RaydiumProtocol',
  'ethena': 'ethena_labs',
  'ena': 'ethena_labs',
  'morpho': 'MorphoLabs',
  'ondo': 'OndoFinance',
  'eigenlayer': 'eigenlayer',
  'eigen': 'eigenlayer',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════
  'chainlink': 'chainlink',
  'link': 'chainlink',
  'thegraph': 'graphprotocol',
  'grt': 'graphprotocol',
  'filecoin': 'Filecoin',
  'fil': 'Filecoin',
  'arweave': 'ArweaveEco',
  'ar': 'ArweaveEco',
  'render': 'rendernetwork',
  'rndr': 'rendernetwork',
  'pyth': 'PythNetwork',
  'wormhole': 'wormhole',
  'w': 'wormhole',
  'celestia': 'CelestiaOrg',
  'tia': 'CelestiaOrg',
  'altlayer': 'alt_layer',
  'alt': 'alt_layer',
  'injective': 'Injective_',
  'inj': 'Injective_',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AI
  // ═══════════════════════════════════════════════════════════════════════════
  'bittensor': 'opentensor',
  'tao': 'opentensor',
  'fetchai': 'Fetch_ai',
  'fetch-ai': 'Fetch_ai',
  'fet': 'Fetch_ai',
  'ocean': 'oceanprotocol',
  'akash': 'akashnet_',
  'akt': 'akashnet_',
  'worldcoin': 'worldcoin',
  'wld': 'worldcoin',
  'virtuals': 'virtua_ls_io',
  'virtual': 'virtua_ls_io',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MEMECOINS
  // ═══════════════════════════════════════════════════════════════════════════
  'dogecoin': 'dogecoin',
  'doge': 'dogecoin',
  'shiba-inu': 'Shibtoken',
  'shib': 'Shibtoken',
  'pepe': 'pepecoineth',
  'bonk': 'bonk_inu',
  'floki': 'RealFlokiInu',
  'dogwifhat': 'dogwifcoin',
  'wif': 'dogwifcoin',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GAMING
  // ═══════════════════════════════════════════════════════════════════════════
  'axie': 'AxieInfinity',
  'axs': 'AxieInfinity',
  'sandbox': 'TheSandboxGame',
  'sand': 'TheSandboxGame',
  'decentraland': 'decentraland',
  'mana': 'decentraland',
  'gala': 'GoGalaGames',
  'immutable': 'Immutable',
  'imx': 'Immutable',
  'illuvium': 'illuviumio',
  'ilv': 'illuviumio',
  'beam': 'BuildOnBeam',
  'ronin': 'Ronin_Network',
  'ron': 'Ronin_Network',
};

/**
 * Lookup Twitter handle for a project
 */
export function getProjectTwitterHandle(projectId: string): string | null {
  const normalized = projectId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return KNOWN_PROJECT_HANDLES[normalized] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extended OmniScore inputs from COMM v2.1
 */
export interface OmniScoreCommInputs {
  // COMM v2 scores
  commScore: number;
  commBase: number;
  commVelocity: number;
  commPeerZ: number;
  commCapped: number;
  
  // Risk factors
  botRisk: number;
  anomalyScore: number;
  influencerConcentration: InfluencerConcentrationRisk;
  sentimentDispersion: number;
  
  // Multi-source coherence
  multiSourceCoherence: number;
  crossSourceDivergence: number;
  mscSources: string[];
  mscIndependence: number;
  mscIndependenceReasons: string[];
  
  // Caps audit
  capsApplied: CommCapsApplied;
  
  // Peer context
  peerContext: CommPeerContext;
  
  // Forensic audit trail
  commTrace: CommTrace;
  
  // Invariant validation
  invariantsValid: boolean;
  invariantViolations: string[];
}

/**
 * Convert Twitter intelligence to OmniScore COMM segment inputs (v2.1)
 * Uses the enhanced COMM v2.1 split architecture with full audit trail
 */
export function toOmniScoreInputs(intel: TwitterProjectIntelligence): OmniScoreCommInputs {
  const commV2 = intel.commV2;
  
  if (commV2) {
    return {
      // COMM v2 scores
      commScore: commV2.commFinal,
      commBase: commV2.base.score,
      commVelocity: commV2.velocity.score,
      commPeerZ: commV2.commPeerZ,
      commCapped: commV2.commCapped,
      
      // Risk factors from COMM v2
      botRisk: commV2.risks.botRisk,
      anomalyScore: commV2.risks.anomalyScore,
      influencerConcentration: commV2.risks.influencerConcentration,
      sentimentDispersion: commV2.risks.sentimentDispersion,
      
      // Multi-source coherence
      multiSourceCoherence: commV2.multiSource.score,
      crossSourceDivergence: 1 - commV2.multiSource.score,
      mscSources: commV2.multiSource.sources,
      mscIndependence: commV2.multiSource.independenceScore,
      mscIndependenceReasons: commV2.multiSource.independenceReasons,
      
      // Caps audit
      capsApplied: commV2.capsApplied,
      
      // Peer context
      peerContext: commV2.peerContext,
      
      // Forensic audit trail
      commTrace: commV2.commTrace,
      
      // Invariant validation
      invariantsValid: commV2.invariantsValid,
      invariantViolations: commV2.invariantViolations,
    };
  }
  
  // Fallback to legacy scores
  const legacyScore = intel.scores.overallCommScore;
  return {
    commScore: legacyScore,
    commBase: legacyScore,
    commVelocity: 50,
    commPeerZ: 0,
    commCapped: legacyScore,
    botRisk: intel.followerQuality?.estimatedBotRatio || 0.15,
    anomalyScore: 0,
    influencerConcentration: { 
      top3: 0, top10: 0, gini: 0, composite: 0,
      peerNormalized: { rawICR: 0, peerZ: 0, peerMean: 0.6, peerStd: 0.15 },
      verifiedAnchorDiscount: { applied: false, discountFactor: 1.0, anchorAccountsDetected: [] },
      effective: 0,
    },
    sentimentDispersion: intel.mentions?.sentimentDistribution
      ? Math.abs(intel.mentions.sentimentDistribution.positive - intel.mentions.sentimentDistribution.negative) / 100
      : 0,
    multiSourceCoherence: 0.4,
    crossSourceDivergence: 0.6,
    mscSources: ['x'],
    mscIndependence: 0.3,
    mscIndependenceReasons: ['single_platform_data_only', 'legacy_fallback'],
    capsApplied: { botRiskCap: null, mscCap: null, anyCapActive: false },
    peerContext: {
      sector: 'Unknown',
      capBucket: 'mid',
      peerMedian: 300000,
      peerMAD: 200000,
      peerConfidence: 'low',
      fallbackUsed: 'global',
      sampleSize: 50,
      peerBoostDisabled: false,
    },
    commTrace: {
      commB: legacyScore,
      commV: 50,
      commRaw: legacyScore,
      commAdj: legacyScore,
      commCapped: legacyScore,
      commPeerZ: 0,
      commFinal: legacyScore,
    },
    invariantsValid: true,
    invariantViolations: [],
  };
}

export default {
  getTwitterIntelligence,
  getProjectTwitterHandle,
  toOmniScoreInputs,
  KNOWN_PROJECT_HANDLES,
};

