/**
 * 🧠 SENTIMENT & TREND ANALYSIS SERVICE
 * 
 * Divine Perfection Step 1.2.2: Advanced NLP-based sentiment analysis
 * 
 * FEATURES:
 * - Multi-model sentiment scoring (keyword, ML-ready, context-aware)
 * - Trend velocity tracking (early trend detection)
 * - Virality indicators (rapid spike detection)
 * - Community-specific metrics (WallStreetBets, influencer tracking)
 * - Emotional intensity scoring
 * - Sarcasm and context detection
 * - Time-series sentiment tracking
 * 
 * @module sentiment-analysis
 * @version 1.0.0 - Divine Perfection Step 1.2.2
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Detailed sentiment analysis result
 */
export interface SentimentAnalysisResult {
  // Core sentiment
  sentiment: {
    label: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    score: number;           // -1 to 1
    confidence: number;      // 0 to 1
    magnitude: number;       // 0 to 1 (intensity)
  };
  
  // Emotional analysis
  emotions: {
    primary: EmotionType;
    secondary?: EmotionType;
    scores: Record<EmotionType, number>;
  };
  
  // Context detection
  context: {
    isSarcastic: boolean;
    sarcasticConfidence: number;
    isQuestion: boolean;
    isNews: boolean;
    isOpinion: boolean;
    isRumor: boolean;
    hasFUD: boolean;        // Fear, Uncertainty, Doubt
    hasFOMO: boolean;       // Fear Of Missing Out
  };
  
  // Keywords and signals
  signals: {
    bullishKeywords: string[];
    bearishKeywords: string[];
    actionKeywords: string[];  // buy, sell, hold, etc.
    priceTargets: PriceTarget[];
    timeframes: string[];
  };
  
  // Processing metadata
  metadata: {
    modelVersion: string;
    processingTimeMs: number;
    textLength: number;
    language: string;
  };
}

export type EmotionType = 
  | 'excitement' | 'fear' | 'greed' | 'hope' 
  | 'frustration' | 'confidence' | 'uncertainty' 
  | 'anger' | 'joy' | 'neutral';

export interface PriceTarget {
  value: number;
  currency: string;
  direction: 'above' | 'below' | 'at';
  timeframe?: string;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysisResult {
  topic: string;
  
  // Trend metrics
  metrics: {
    currentVolume: number;
    previousVolume: number;
    volumeChange: number;     // percentage
    velocity: number;         // mentions per hour
    acceleration: number;     // velocity change
    peakVelocity: number;
  };
  
  // Trend status
  status: {
    phase: 'emerging' | 'growing' | 'peak' | 'declining' | 'stable';
    isViral: boolean;
    viralityScore: number;    // 0 to 100
    trendStrength: number;    // 0 to 100
  };
  
  // Predictions
  prediction: {
    likelyPeak: Date | null;
    expectedDuration: string;
    sustainabilityScore: number;
  };
  
  // Associated data
  associations: {
    relatedTopics: string[];
    topCoins: string[];
    sentiment: number;
    influencerDriven: boolean;
  };
  
  // Time series (last 24 hours, hourly)
  timeSeries: Array<{
    timestamp: Date;
    volume: number;
    sentiment: number;
  }>;
}

/**
 * Virality indicator
 */
export interface ViralityIndicator {
  topic: string;
  score: number;              // 0 to 100
  isViral: boolean;
  
  triggers: {
    volumeSpike: boolean;
    influencerMention: boolean;
    crossPlatformSpread: boolean;
    engagementExplosion: boolean;
    newsCorrelation: boolean;
  };
  
  metrics: {
    mentionsPerMinute: number;
    engagementRate: number;
    spreadVelocity: number;
    platformCount: number;
  };
  
  alert: {
    level: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    actionRequired: boolean;
  };
}

/**
 * Community-specific metrics
 */
export interface CommunityMetrics {
  community: string;
  platform: string;
  
  // Activity metrics
  activity: {
    totalPosts: number;
    totalComments: number;
    uniqueUsers: number;
    avgEngagement: number;
  };
  
  // Sentiment
  sentiment: {
    overall: number;
    distribution: {
      veryBullish: number;
      bullish: number;
      neutral: number;
      bearish: number;
      veryBearish: number;
    };
  };
  
  // Top content
  topPosts: Array<{
    title: string;
    score: number;
    sentiment: number;
    coins: string[];
  }>;
  
  // Trending in community
  trending: {
    coins: string[];
    topics: string[];
    hashtags: string[];
  };
  
  // Community mood
  mood: {
    label: string;
    description: string;
    confidence: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MODEL_VERSION: '1.2.2-divine',
  
  // Virality thresholds
  VIRALITY: {
    VOLUME_SPIKE_THRESHOLD: 3.0,      // 3x normal volume
    VELOCITY_THRESHOLD: 100,           // mentions per hour
    ENGAGEMENT_SPIKE_THRESHOLD: 5.0,   // 5x normal engagement
    PLATFORM_SPREAD_THRESHOLD: 3,      // Number of platforms
  },
  
  // Trend phases
  TREND_PHASES: {
    EMERGING_VELOCITY: 20,             // mentions/hour
    GROWING_VELOCITY: 50,
    PEAK_VELOCITY: 200,
  },
  
  // Sentiment thresholds
  SENTIMENT: {
    VERY_BULLISH: 0.6,
    BULLISH: 0.2,
    NEUTRAL_LOW: -0.2,
    NEUTRAL_HIGH: 0.2,
    BEARISH: -0.2,
    VERY_BEARISH: -0.6,
  },
  
  // Time windows
  TIME_WINDOWS: {
    SHORT_TERM_HOURS: 1,
    MEDIUM_TERM_HOURS: 4,
    LONG_TERM_HOURS: 24,
  },
};

// ============================================================================
// ENHANCED SENTIMENT DICTIONARIES
// ============================================================================

const SENTIMENT_LEXICON = {
  // Very bullish (weight 2.0-3.0)
  veryBullish: new Map<string, number>([
    ['moon', 2.5], ['mooning', 2.5], ['🚀', 2.5], ['rocket', 2.0],
    ['ath', 2.5], ['all time high', 2.5], ['all-time high', 2.5],
    ['parabolic', 2.5], ['exploding', 2.0], ['skyrocket', 2.5],
    ['100x', 3.0], ['1000x', 3.0], ['10x', 2.0],
    ['generational wealth', 2.5], ['life changing', 2.0],
    ['diamond hands', 2.0], ['💎🙌', 2.0], ['💎', 1.5],
    ['lambo', 2.0], ['wagmi', 2.0], ['gmi', 1.8],
    ['massive gains', 2.5], ['huge pump', 2.5],
    ['bull run', 2.0], ['supercycle', 2.5],
    ['etf approved', 3.0], ['institutional adoption', 2.5],
  ]),
  
  // Bullish (weight 0.8-1.5)
  bullish: new Map<string, number>([
    ['bullish', 1.2], ['bull', 1.0], ['📈', 1.0],
    ['buy', 0.8], ['buying', 0.8], ['bought', 0.8],
    ['long', 1.0], ['longing', 1.0],
    ['accumulate', 1.0], ['accumulating', 1.0], ['dca', 0.9],
    ['hodl', 1.0], ['hold', 0.5], ['holding', 0.5],
    ['pump', 0.8], ['pumping', 0.9],
    ['breakout', 1.2], ['breaking out', 1.2],
    ['green', 0.6], ['gains', 0.8], ['profit', 0.8],
    ['rally', 1.0], ['rallying', 1.0],
    ['surge', 1.0], ['surging', 1.0],
    ['up', 0.3], ['rising', 0.5], ['higher', 0.5],
    ['support', 0.6], ['bounce', 0.7],
    ['undervalued', 1.0], ['cheap', 0.7],
    ['opportunity', 0.8], ['potential', 0.6],
    ['bullish divergence', 1.5], ['golden cross', 1.5],
  ]),
  
  // Bearish (weight 0.8-1.5)
  bearish: new Map<string, number>([
    ['bearish', 1.2], ['bear', 1.0], ['📉', 1.0],
    ['sell', 0.8], ['selling', 0.8], ['sold', 0.8],
    ['short', 1.0], ['shorting', 1.0],
    ['dump', 1.0], ['dumping', 1.0],
    ['drop', 0.8], ['dropping', 0.8],
    ['red', 0.6], ['loss', 0.8], ['losing', 0.8],
    ['down', 0.3], ['falling', 0.5], ['lower', 0.5],
    ['resistance', 0.5], ['rejection', 0.7],
    ['correction', 0.7], ['pullback', 0.6],
    ['weak', 0.5], ['weakness', 0.6],
    ['overvalued', 1.0], ['expensive', 0.6],
    ['risk', 0.4], ['risky', 0.5],
    ['bearish divergence', 1.5], ['death cross', 1.5],
    ['distribution', 0.8], ['exit', 0.7],
  ]),
  
  // Very bearish (weight 2.0-3.0)
  veryBearish: new Map<string, number>([
    ['crash', 2.5], ['crashing', 2.5], ['crashed', 2.5],
    ['rekt', 2.5], ['rekted', 2.5], ['wrecked', 2.0],
    ['scam', 3.0], ['scammer', 3.0], ['fraud', 3.0],
    ['rug', 3.0], ['rugpull', 3.0], ['rug pull', 3.0],
    ['dead', 2.0], ['dying', 2.0], ['death', 2.0],
    ['worthless', 2.5], ['zero', 2.0], ['going to zero', 3.0],
    ['collapse', 2.5], ['collapsing', 2.5],
    ['plunge', 2.0], ['plunging', 2.0],
    ['panic', 2.0], ['panicking', 2.0],
    ['fear', 1.5], ['fearful', 1.5],
    ['capitulation', 2.5], ['capitulating', 2.5],
    ['liquidated', 2.5], ['liquidation', 2.0],
    ['ngmi', 2.0], ['💀', 1.5], ['☠️', 1.5],
    ['ponzi', 3.0], ['pyramid', 2.5],
    ['bankrupt', 3.0], ['bankruptcy', 3.0],
    ['hack', 2.5], ['hacked', 2.5], ['exploit', 2.5],
  ]),
};

// Emotion keywords
const EMOTION_LEXICON: Record<EmotionType, string[]> = {
  excitement: ['excited', 'amazing', 'incredible', 'awesome', 'insane', 'crazy', 'wild', '🔥', '🎉', 'lets go', 'lfg'],
  fear: ['scared', 'afraid', 'worried', 'nervous', 'anxious', 'panic', 'fear', 'terrified', '😰', '😱'],
  greed: ['greedy', 'want more', 'all in', 'yolo', 'fomo', 'cant miss', 'need to buy', '🤑'],
  hope: ['hope', 'hopeful', 'optimistic', 'believe', 'faith', 'trust', 'confident', '🙏', '🤞'],
  frustration: ['frustrated', 'annoying', 'tired of', 'sick of', 'enough', 'fed up', '😤', '🤬'],
  confidence: ['confident', 'certain', 'sure', 'definitely', 'guaranteed', 'no doubt', '💪'],
  uncertainty: ['uncertain', 'unsure', 'maybe', 'perhaps', 'might', 'could', 'idk', '🤷'],
  anger: ['angry', 'mad', 'furious', 'hate', 'pissed', 'outraged', '😡', '🤬'],
  joy: ['happy', 'joyful', 'celebrating', 'love', 'great', 'wonderful', '😊', '🥳', '❤️'],
  neutral: [],
};

// FUD and FOMO indicators
const FUD_INDICATORS = [
  'fud', 'fear uncertainty doubt', 'dont buy', "don't buy", 'stay away',
  'warning', 'be careful', 'red flag', 'suspicious', 'sketchy',
  'too good to be true', 'scam alert', 'avoid',
];

const FOMO_INDICATORS = [
  'fomo', 'missing out', 'last chance', 'dont miss', "don't miss",
  'hurry', 'before its too late', 'gonna regret', 'still early',
  'not too late', 'get in now', 'buy now',
];

// Sarcasm indicators
const SARCASM_INDICATORS = [
  'totally', 'obviously', 'clearly', 'definitely', 'sure',
  '/s', 'lol', 'lmao', 'yeah right', 'of course',
  '🙄', '😏', '🤡', 'clown', 'genius move',
];

// Action keywords
const ACTION_KEYWORDS = {
  buy: ['buy', 'buying', 'bought', 'accumulate', 'long', 'dca', 'ape in', 'aped'],
  sell: ['sell', 'selling', 'sold', 'dump', 'short', 'exit', 'take profit'],
  hold: ['hold', 'holding', 'hodl', 'diamond hands', 'not selling'],
};

// Community-specific keywords
const COMMUNITY_KEYWORDS: Record<string, string[]> = {
  wallstreetbets: ['ape', 'tendies', 'wife boyfriend', 'smooth brain', 'retard', 'yolo', 'diamond hands', 'paper hands', 'loss porn', 'gain porn'],
  cryptocurrency: ['altseason', 'altcoin', 'shitcoin', 'memecoin', 'defi', 'nft', 'web3', 'dyor', 'nfa'],
  bitcoin: ['sats', 'satoshi', 'halving', 'lightning', 'hodler', 'maxi', 'maximalist', 'orange pill'],
};

// ============================================================================
// SENTIMENT ANALYSIS ENGINE
// ============================================================================

/**
 * Analyze sentiment of text with full NLP pipeline
 */
export function analyzeSentiment(text: string): SentimentAnalysisResult {
  const startTime = Date.now();
  const lowerText = text.toLowerCase();
  
  // 1. Calculate base sentiment score
  const { score, confidence, bullishWords, bearishWords } = calculateSentimentScore(lowerText);
  
  // 2. Calculate magnitude (intensity)
  const magnitude = calculateMagnitude(lowerText, score);
  
  // 3. Detect emotions
  const emotions = detectEmotions(lowerText);
  
  // 4. Analyze context
  const context = analyzeContext(lowerText, score);
  
  // 5. Adjust for sarcasm
  const adjustedScore = context.isSarcastic && context.sarcasticConfidence > 0.7 
    ? -score * 0.5 // Flip sentiment if sarcastic
    : score;
  
  // 6. Determine label
  const label = getSentimentLabel(adjustedScore);
  
  // 7. Extract signals
  const signals = extractSignals(text, lowerText);
  
  const processingTimeMs = Date.now() - startTime;
  
  return {
    sentiment: {
      label,
      score: Math.round(adjustedScore * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      magnitude: Math.round(magnitude * 100) / 100,
    },
    emotions,
    context,
    signals: {
      ...signals,
      bullishKeywords: bullishWords,
      bearishKeywords: bearishWords,
    },
    metadata: {
      modelVersion: CONFIG.MODEL_VERSION,
      processingTimeMs,
      textLength: text.length,
      language: 'en', // TODO: Add language detection
    },
  };
}

function calculateSentimentScore(text: string): { 
  score: number; 
  confidence: number; 
  bullishWords: string[]; 
  bearishWords: string[] 
} {
  let bullishScore = 0;
  let bearishScore = 0;
  const bullishWords: string[] = [];
  const bearishWords: string[] = [];
  let totalWeight = 0;
  
  // Very bullish
  for (const [word, weight] of SENTIMENT_LEXICON.veryBullish) {
    if (text.includes(word)) {
      bullishScore += weight * 2;
      totalWeight += weight;
      bullishWords.push(word);
    }
  }
  
  // Bullish
  for (const [word, weight] of SENTIMENT_LEXICON.bullish) {
    if (text.includes(word)) {
      bullishScore += weight;
      totalWeight += weight;
      bullishWords.push(word);
    }
  }
  
  // Bearish
  for (const [word, weight] of SENTIMENT_LEXICON.bearish) {
    if (text.includes(word)) {
      bearishScore += weight;
      totalWeight += weight;
      bearishWords.push(word);
    }
  }
  
  // Very bearish
  for (const [word, weight] of SENTIMENT_LEXICON.veryBearish) {
    if (text.includes(word)) {
      bearishScore += weight * 2;
      totalWeight += weight;
      bearishWords.push(word);
    }
  }
  
  // Calculate normalized score
  const rawScore = bullishScore - bearishScore;
  const normalizedScore = totalWeight > 0 
    ? Math.max(-1, Math.min(1, rawScore / Math.max(5, totalWeight)))
    : 0;
  
  // Confidence based on keyword matches
  const confidence = Math.min(0.95, 0.3 + (totalWeight / 15) * 0.7);
  
  return { 
    score: normalizedScore, 
    confidence, 
    bullishWords: [...new Set(bullishWords)].slice(0, 10),
    bearishWords: [...new Set(bearishWords)].slice(0, 10),
  };
}

function calculateMagnitude(text: string, score: number): number {
  // Count intensity indicators
  const exclamations = (text.match(/!/g) || []).length;
  const caps = (text.match(/[A-Z]{3,}/g) || []).length;
  const emojis = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const repetition = (text.match(/(.)\1{2,}/g) || []).length;
  
  // Base magnitude from score
  let magnitude = Math.abs(score);
  
  // Boost for intensity indicators
  magnitude += Math.min(0.3, exclamations * 0.05);
  magnitude += Math.min(0.2, caps * 0.05);
  magnitude += Math.min(0.2, emojis * 0.03);
  magnitude += Math.min(0.1, repetition * 0.03);
  
  return Math.min(1, magnitude);
}

function detectEmotions(text: string): SentimentAnalysisResult['emotions'] {
  const scores: Record<EmotionType, number> = {
    excitement: 0, fear: 0, greed: 0, hope: 0,
    frustration: 0, confidence: 0, uncertainty: 0,
    anger: 0, joy: 0, neutral: 0,
  };
  
  // Score each emotion
  for (const [emotion, keywords] of Object.entries(EMOTION_LEXICON) as [EmotionType, string[]][]) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[emotion] += 1;
      }
    }
  }
  
  // Find primary and secondary emotions
  const sortedEmotions = Object.entries(scores)
    .filter(([e]) => e !== 'neutral')
    .sort((a, b) => b[1] - a[1]);
  
  const primary = sortedEmotions[0]?.[1] > 0 ? sortedEmotions[0][0] as EmotionType : 'neutral';
  const secondary = sortedEmotions[1]?.[1] > 0 ? sortedEmotions[1][0] as EmotionType : undefined;
  
  // Normalize scores
  const maxScore = Math.max(...Object.values(scores), 1);
  for (const emotion of Object.keys(scores) as EmotionType[]) {
    scores[emotion] = Math.round((scores[emotion] / maxScore) * 100) / 100;
  }
  
  return { primary, secondary, scores };
}

function analyzeContext(text: string, score: number): SentimentAnalysisResult['context'] {
  // Sarcasm detection
  let sarcasticScore = 0;
  for (const indicator of SARCASM_INDICATORS) {
    if (text.includes(indicator)) {
      sarcasticScore += 0.2;
    }
  }
  // Contradiction detection (positive words with negative emojis or vice versa)
  const hasContradiction = (score > 0.3 && (text.includes('🙄') || text.includes('🤡'))) ||
                          (score < -0.3 && (text.includes('😊') || text.includes('🎉')));
  if (hasContradiction) sarcasticScore += 0.3;
  
  // Question detection
  const isQuestion = text.includes('?') || 
                    text.startsWith('what ') || 
                    text.startsWith('why ') ||
                    text.startsWith('how ') ||
                    text.startsWith('when ');
  
  // News vs opinion
  const newsIndicators = ['breaking', 'just in', 'announced', 'reports', 'according to', 'official'];
  const opinionIndicators = ['i think', 'imo', 'imho', 'my opinion', 'i believe', 'i feel'];
  const isNews = newsIndicators.some(i => text.includes(i));
  const isOpinion = opinionIndicators.some(i => text.includes(i));
  
  // Rumor detection
  const rumorIndicators = ['rumor', 'rumour', 'allegedly', 'supposedly', 'unconfirmed', 'sources say'];
  const isRumor = rumorIndicators.some(i => text.includes(i));
  
  // FUD detection
  const hasFUD = FUD_INDICATORS.some(i => text.includes(i));
  
  // FOMO detection
  const hasFOMO = FOMO_INDICATORS.some(i => text.includes(i));
  
  return {
    isSarcastic: sarcasticScore > 0.3,
    sarcasticConfidence: Math.min(1, sarcasticScore),
    isQuestion,
    isNews,
    isOpinion,
    isRumor,
    hasFUD,
    hasFOMO,
  };
}

function getSentimentLabel(score: number): SentimentAnalysisResult['sentiment']['label'] {
  if (score <= CONFIG.SENTIMENT.VERY_BEARISH) return 'very_bearish';
  if (score <= CONFIG.SENTIMENT.BEARISH) return 'bearish';
  if (score >= CONFIG.SENTIMENT.VERY_BULLISH) return 'very_bullish';
  if (score >= CONFIG.SENTIMENT.BULLISH) return 'bullish';
  return 'neutral';
}

function extractSignals(originalText: string, lowerText: string): {
  actionKeywords: string[];
  priceTargets: PriceTarget[];
  timeframes: string[];
} {
  const actionKeywords: string[] = [];
  
  // Extract action keywords
  for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        actionKeywords.push(action);
        break;
      }
    }
  }
  
  // Extract price targets (e.g., "$100k", "100,000", "to 50k")
  const priceTargets: PriceTarget[] = [];
  const pricePatterns = [
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[kK]?/g,
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[kK]/g,
    /(?:to|at|reach|hit)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[kK]?/gi,
  ];
  
  for (const pattern of pricePatterns) {
    let match;
    while ((match = pattern.exec(originalText)) !== null) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      if (match[0].toLowerCase().includes('k')) {
        value *= 1000;
      }
      if (value > 0 && value < 10000000) { // Reasonable price range
        priceTargets.push({
          value,
          currency: 'USD',
          direction: lowerText.includes('above') ? 'above' : 
                    lowerText.includes('below') ? 'below' : 'at',
        });
      }
    }
  }
  
  // Extract timeframes
  const timeframes: string[] = [];
  const timeframePatterns = [
    /\b(today|tomorrow|tonight)\b/gi,
    /\b(this|next)\s+(week|month|year)\b/gi,
    /\b(eoy|eom|eow)\b/gi,
    /\b(q[1-4])\b/gi,
    /\b(\d+)\s*(hour|day|week|month|year)s?\b/gi,
    /\b(short|medium|long)\s*term\b/gi,
  ];
  
  for (const pattern of timeframePatterns) {
    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      timeframes.push(match[0]);
    }
  }
  
  return {
    actionKeywords: [...new Set(actionKeywords)],
    priceTargets: priceTargets.slice(0, 5),
    timeframes: [...new Set(timeframes)].slice(0, 5),
  };
}

// ============================================================================
// TREND VELOCITY TRACKING
// ============================================================================

interface TrendDataPoint {
  timestamp: Date;
  volume: number;
  sentiment: number;
  engagement: number;
}

// In-memory trend tracking (would be Redis in production)
const trendHistory: Map<string, TrendDataPoint[]> = new Map();

/**
 * Track and analyze trend velocity
 */
export function analyzeTrend(
  topic: string,
  currentMentions: number,
  currentSentiment: number,
  currentEngagement: number
): TrendAnalysisResult {
  const now = new Date();
  
  // Get or initialize history
  let history = trendHistory.get(topic) || [];
  
  // Add current data point
  history.push({
    timestamp: now,
    volume: currentMentions,
    sentiment: currentSentiment,
    engagement: currentEngagement,
  });
  
  // Keep only last 24 hours
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  history = history.filter(h => h.timestamp > cutoff);
  trendHistory.set(topic, history);
  
  // Calculate metrics
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  
  const recentData = history.filter(h => h.timestamp > hourAgo);
  const olderData = history.filter(h => h.timestamp <= hourAgo && h.timestamp > fourHoursAgo);
  
  const currentVolume = recentData.reduce((sum, d) => sum + d.volume, 0);
  const previousVolume = olderData.reduce((sum, d) => sum + d.volume, 0) || 1;
  const volumeChange = ((currentVolume - previousVolume) / previousVolume) * 100;
  
  // Velocity (mentions per hour)
  const velocity = recentData.length > 0 
    ? currentVolume / (recentData.length / 60) 
    : currentMentions;
  
  // Acceleration (change in velocity)
  const previousVelocity = olderData.length > 0 
    ? previousVolume / (olderData.length / 60) 
    : 0;
  const acceleration = velocity - previousVelocity;
  
  // Peak velocity in history
  const peakVelocity = Math.max(...history.map(h => h.volume), velocity);
  
  // Determine trend phase
  let phase: TrendAnalysisResult['status']['phase'];
  if (velocity < CONFIG.TREND_PHASES.EMERGING_VELOCITY) {
    phase = acceleration > 0 ? 'emerging' : 'stable';
  } else if (velocity < CONFIG.TREND_PHASES.GROWING_VELOCITY) {
    phase = 'growing';
  } else if (velocity >= CONFIG.TREND_PHASES.PEAK_VELOCITY || acceleration < 0) {
    phase = acceleration < -10 ? 'declining' : 'peak';
  } else {
    phase = 'growing';
  }
  
  // Virality score
  const viralityScore = calculateViralityScore(velocity, volumeChange, currentEngagement);
  const isViral = viralityScore > 70;
  
  // Trend strength
  const trendStrength = Math.min(100, 
    (velocity / CONFIG.TREND_PHASES.PEAK_VELOCITY) * 50 +
    (volumeChange > 0 ? Math.min(volumeChange, 100) / 2 : 0)
  );
  
  // Predictions
  const likelyPeak = phase === 'growing' 
    ? new Date(now.getTime() + (velocity / acceleration) * 60 * 60 * 1000)
    : null;
  
  const expectedDuration = phase === 'emerging' ? '2-6 hours' :
                          phase === 'growing' ? '6-24 hours' :
                          phase === 'peak' ? '1-4 hours remaining' :
                          phase === 'declining' ? 'ending soon' : 'stable';
  
  const sustainabilityScore = Math.min(100, 
    50 + (history.length * 2) + (currentSentiment > 0 ? 20 : -10)
  );
  
  // Time series for last 24 hours (hourly buckets)
  const timeSeries = generateHourlyTimeSeries(history);
  
  return {
    topic,
    metrics: {
      currentVolume,
      previousVolume,
      volumeChange: Math.round(volumeChange * 10) / 10,
      velocity: Math.round(velocity * 10) / 10,
      acceleration: Math.round(acceleration * 10) / 10,
      peakVelocity: Math.round(peakVelocity * 10) / 10,
    },
    status: {
      phase,
      isViral,
      viralityScore: Math.round(viralityScore),
      trendStrength: Math.round(trendStrength),
    },
    prediction: {
      likelyPeak,
      expectedDuration,
      sustainabilityScore: Math.round(sustainabilityScore),
    },
    associations: {
      relatedTopics: [], // Would be populated from co-occurrence analysis
      topCoins: [],
      sentiment: currentSentiment,
      influencerDriven: false, // Would be determined from influencer tracking
    },
    timeSeries,
  };
}

function calculateViralityScore(
  velocity: number,
  volumeChange: number,
  engagement: number
): number {
  let score = 0;
  
  // Velocity contribution (0-40 points)
  score += Math.min(40, (velocity / CONFIG.TREND_PHASES.PEAK_VELOCITY) * 40);
  
  // Volume change contribution (0-30 points)
  if (volumeChange > 0) {
    score += Math.min(30, (volumeChange / 100) * 30);
  }
  
  // Engagement contribution (0-30 points)
  score += Math.min(30, (engagement / 10000) * 30);
  
  return Math.min(100, score);
}

function generateHourlyTimeSeries(history: TrendDataPoint[]): TrendAnalysisResult['timeSeries'] {
  const now = new Date();
  const series: TrendAnalysisResult['timeSeries'] = [];
  
  // Generate 24 hourly buckets
  for (let i = 23; i >= 0; i--) {
    const bucketStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
    const bucketEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
    
    const bucketData = history.filter(h => 
      h.timestamp >= bucketStart && h.timestamp < bucketEnd
    );
    
    const volume = bucketData.reduce((sum, d) => sum + d.volume, 0);
    const sentiment = bucketData.length > 0
      ? bucketData.reduce((sum, d) => sum + d.sentiment, 0) / bucketData.length
      : 0;
    
    series.push({
      timestamp: bucketEnd,
      volume,
      sentiment: Math.round(sentiment * 100) / 100,
    });
  }
  
  return series;
}

// ============================================================================
// VIRALITY DETECTION
// ============================================================================

/**
 * Detect virality indicators for a topic
 */
export function detectVirality(
  topic: string,
  metrics: {
    mentionsPerMinute: number;
    engagementRate: number;
    platformCount: number;
    hasInfluencerMention: boolean;
    hasNewsCorrelation: boolean;
  }
): ViralityIndicator {
  const triggers = {
    volumeSpike: metrics.mentionsPerMinute > 10,
    influencerMention: metrics.hasInfluencerMention,
    crossPlatformSpread: metrics.platformCount >= CONFIG.VIRALITY.PLATFORM_SPREAD_THRESHOLD,
    engagementExplosion: metrics.engagementRate > 0.1,
    newsCorrelation: metrics.hasNewsCorrelation,
  };
  
  // Count active triggers
  const triggerCount = Object.values(triggers).filter(Boolean).length;
  
  // Calculate virality score
  let score = 0;
  if (triggers.volumeSpike) score += 25;
  if (triggers.influencerMention) score += 20;
  if (triggers.crossPlatformSpread) score += 20;
  if (triggers.engagementExplosion) score += 20;
  if (triggers.newsCorrelation) score += 15;
  
  // Boost for multiple triggers
  if (triggerCount >= 3) score *= 1.2;
  if (triggerCount >= 4) score *= 1.3;
  
  score = Math.min(100, score);
  const isViral = score >= 60;
  
  // Determine alert level
  let level: ViralityIndicator['alert']['level'];
  let message: string;
  let actionRequired: boolean;
  
  if (score >= 80) {
    level = 'critical';
    message = `🚨 ${topic} is going viral! Immediate attention required.`;
    actionRequired = true;
  } else if (score >= 60) {
    level = 'high';
    message = `⚠️ ${topic} showing strong viral potential.`;
    actionRequired = true;
  } else if (score >= 40) {
    level = 'medium';
    message = `📈 ${topic} gaining momentum.`;
    actionRequired = false;
  } else {
    level = 'low';
    message = `📊 ${topic} activity normal.`;
    actionRequired = false;
  }
  
  return {
    topic,
    score: Math.round(score),
    isViral,
    triggers,
    metrics: {
      mentionsPerMinute: metrics.mentionsPerMinute,
      engagementRate: metrics.engagementRate,
      spreadVelocity: metrics.platformCount * metrics.mentionsPerMinute,
      platformCount: metrics.platformCount,
    },
    alert: {
      level,
      message,
      actionRequired,
    },
  };
}

// ============================================================================
// COMMUNITY-SPECIFIC ANALYSIS
// ============================================================================

/**
 * Analyze community-specific metrics
 */
export function analyzeCommunity(
  community: string,
  platform: string,
  posts: Array<{
    title: string;
    text: string;
    score: number;
    comments: number;
    author: string;
  }>
): CommunityMetrics {
  const sentimentDistribution = {
    veryBullish: 0,
    bullish: 0,
    neutral: 0,
    bearish: 0,
    veryBearish: 0,
  };
  
  let totalSentiment = 0;
  const coinMentions: Map<string, number> = new Map();
  const topicMentions: Map<string, number> = new Map();
  const hashtagMentions: Map<string, number> = new Map();
  const uniqueUsers = new Set<string>();
  let totalEngagement = 0;
  
  const analyzedPosts: CommunityMetrics['topPosts'] = [];
  
  for (const post of posts) {
    const fullText = `${post.title} ${post.text}`.toLowerCase();
    uniqueUsers.add(post.author);
    totalEngagement += post.score + post.comments;
    
    // Analyze sentiment
    const analysis = analyzeSentiment(fullText);
    totalSentiment += analysis.sentiment.score;
    
    // Update distribution
    const label = analysis.sentiment.label;
    if (label === 'very_bullish') sentimentDistribution.veryBullish++;
    else if (label === 'bullish') sentimentDistribution.bullish++;
    else if (label === 'bearish') sentimentDistribution.bearish++;
    else if (label === 'very_bearish') sentimentDistribution.veryBearish++;
    else sentimentDistribution.neutral++;
    
    // Extract coins
    const coins = extractCoinsFromText(fullText);
    for (const coin of coins) {
      coinMentions.set(coin, (coinMentions.get(coin) || 0) + 1);
    }
    
    // Extract community-specific keywords
    const communityKeywords = COMMUNITY_KEYWORDS[community.toLowerCase()] || [];
    for (const keyword of communityKeywords) {
      if (fullText.includes(keyword)) {
        topicMentions.set(keyword, (topicMentions.get(keyword) || 0) + 1);
      }
    }
    
    // Extract hashtags
    const hashtags = fullText.match(/#\w+/g) || [];
    for (const tag of hashtags) {
      hashtagMentions.set(tag, (hashtagMentions.get(tag) || 0) + 1);
    }
    
    // Track top posts
    if (post.score > 100 || analyzedPosts.length < 10) {
      analyzedPosts.push({
        title: post.title.substring(0, 100),
        score: post.score,
        sentiment: analysis.sentiment.score,
        coins,
      });
    }
  }
  
  // Sort top posts by score
  analyzedPosts.sort((a, b) => b.score - a.score);
  
  // Calculate overall sentiment
  const avgSentiment = posts.length > 0 ? totalSentiment / posts.length : 0;
  
  // Determine community mood
  let moodLabel: string;
  let moodDescription: string;
  
  if (avgSentiment > 0.4) {
    moodLabel = 'Euphoric';
    moodDescription = 'Community is extremely optimistic, high FOMO levels';
  } else if (avgSentiment > 0.15) {
    moodLabel = 'Bullish';
    moodDescription = 'Positive sentiment with buying interest';
  } else if (avgSentiment < -0.4) {
    moodLabel = 'Fearful';
    moodDescription = 'Panic and fear dominating discussions';
  } else if (avgSentiment < -0.15) {
    moodLabel = 'Bearish';
    moodDescription = 'Cautious sentiment with selling pressure';
  } else {
    moodLabel = 'Neutral';
    moodDescription = 'Mixed sentiment, market watching';
  }
  
  // Sort and get top items
  const trendingCoins = Array.from(coinMentions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([coin]) => coin);
  
  const trendingTopics = Array.from(topicMentions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
  
  const trendingHashtags = Array.from(hashtagMentions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
  
  return {
    community,
    platform,
    activity: {
      totalPosts: posts.length,
      totalComments: posts.reduce((sum, p) => sum + p.comments, 0),
      uniqueUsers: uniqueUsers.size,
      avgEngagement: posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0,
    },
    sentiment: {
      overall: Math.round(avgSentiment * 100) / 100,
      distribution: sentimentDistribution,
    },
    topPosts: analyzedPosts.slice(0, 5),
    trending: {
      coins: trendingCoins,
      topics: trendingTopics,
      hashtags: trendingHashtags,
    },
    mood: {
      label: moodLabel,
      description: moodDescription,
      confidence: Math.min(0.9, 0.5 + (posts.length / 100) * 0.4),
    },
  };
}

function extractCoinsFromText(text: string): string[] {
  const coins: Set<string> = new Set();
  const upperText = text.toUpperCase();
  
  const coinMappings: Record<string, string> = {
    'BITCOIN': 'BTC', 'BTC': 'BTC',
    'ETHEREUM': 'ETH', 'ETH': 'ETH',
    'SOLANA': 'SOL', 'SOL': 'SOL',
    'CARDANO': 'ADA', 'ADA': 'ADA',
    'DOGECOIN': 'DOGE', 'DOGE': 'DOGE',
    'XRP': 'XRP', 'RIPPLE': 'XRP',
    'POLKADOT': 'DOT', 'DOT': 'DOT',
    'AVALANCHE': 'AVAX', 'AVAX': 'AVAX',
    'CHAINLINK': 'LINK', 'LINK': 'LINK',
    'POLYGON': 'MATIC', 'MATIC': 'MATIC',
  };
  
  for (const [key, symbol] of Object.entries(coinMappings)) {
    if (upperText.includes(key)) {
      coins.add(symbol);
    }
  }
  
  // Extract cashtags
  const cashtagPattern = /\$([A-Z]{2,6})\b/g;
  let match;
  while ((match = cashtagPattern.exec(upperText)) !== null) {
    coins.add(match[1]);
  }
  
  return Array.from(coins);
}

// ============================================================================
// AGGREGATE ANALYSIS
// ============================================================================

/**
 * Aggregate sentiment across multiple texts
 */
export function aggregateSentiment(
  analyses: SentimentAnalysisResult[]
): {
  overall: SentimentAnalysisResult['sentiment'];
  distribution: Record<string, number>;
  dominantEmotion: EmotionType;
  topBullishSignals: string[];
  topBearishSignals: string[];
  contextSummary: {
    fudPercentage: number;
    fomoPercentage: number;
    questionPercentage: number;
    newsPercentage: number;
  };
} {
  if (analyses.length === 0) {
    return {
      overall: { label: 'neutral', score: 0, confidence: 0, magnitude: 0 },
      distribution: { very_bullish: 0, bullish: 0, neutral: 100, bearish: 0, very_bearish: 0 },
      dominantEmotion: 'neutral',
      topBullishSignals: [],
      topBearishSignals: [],
      contextSummary: { fudPercentage: 0, fomoPercentage: 0, questionPercentage: 0, newsPercentage: 0 },
    };
  }
  
  // Calculate distribution
  const distribution: Record<string, number> = {
    very_bullish: 0,
    bullish: 0,
    neutral: 0,
    bearish: 0,
    very_bearish: 0,
  };
  
  let totalScore = 0;
  let totalConfidence = 0;
  let totalMagnitude = 0;
  const emotionCounts: Record<EmotionType, number> = {
    excitement: 0, fear: 0, greed: 0, hope: 0,
    frustration: 0, confidence: 0, uncertainty: 0,
    anger: 0, joy: 0, neutral: 0,
  };
  const bullishSignals: Map<string, number> = new Map();
  const bearishSignals: Map<string, number> = new Map();
  let fudCount = 0;
  let fomoCount = 0;
  let questionCount = 0;
  let newsCount = 0;
  
  for (const analysis of analyses) {
    distribution[analysis.sentiment.label]++;
    totalScore += analysis.sentiment.score;
    totalConfidence += analysis.sentiment.confidence;
    totalMagnitude += analysis.sentiment.magnitude;
    emotionCounts[analysis.emotions.primary]++;
    
    // Track signals
    for (const signal of analysis.signals.bullishKeywords) {
      bullishSignals.set(signal, (bullishSignals.get(signal) || 0) + 1);
    }
    for (const signal of analysis.signals.bearishKeywords) {
      bearishSignals.set(signal, (bearishSignals.get(signal) || 0) + 1);
    }
    
    // Track context
    if (analysis.context.hasFUD) fudCount++;
    if (analysis.context.hasFOMO) fomoCount++;
    if (analysis.context.isQuestion) questionCount++;
    if (analysis.context.isNews) newsCount++;
  }
  
  // Normalize distribution to percentages
  const total = analyses.length;
  for (const key of Object.keys(distribution)) {
    distribution[key] = Math.round((distribution[key] / total) * 100);
  }
  
  // Calculate overall
  const avgScore = totalScore / total;
  const avgConfidence = totalConfidence / total;
  const avgMagnitude = totalMagnitude / total;
  
  // Find dominant emotion
  const dominantEmotion = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as EmotionType;
  
  // Top signals
  const topBullishSignals = Array.from(bullishSignals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([signal]) => signal);
  
  const topBearishSignals = Array.from(bearishSignals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([signal]) => signal);
  
  return {
    overall: {
      label: getSentimentLabel(avgScore),
      score: Math.round(avgScore * 100) / 100,
      confidence: Math.round(avgConfidence * 100) / 100,
      magnitude: Math.round(avgMagnitude * 100) / 100,
    },
    distribution,
    dominantEmotion,
    topBullishSignals,
    topBearishSignals,
    contextSummary: {
      fudPercentage: Math.round((fudCount / total) * 100),
      fomoPercentage: Math.round((fomoCount / total) * 100),
      questionPercentage: Math.round((questionCount / total) * 100),
      newsPercentage: Math.round((newsCount / total) * 100),
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const sentimentAnalysisService = {
  analyze: analyzeSentiment,
  analyzeTrend,
  detectVirality,
  analyzeCommunity,
  aggregateSentiment,
};

export default sentimentAnalysisService;

