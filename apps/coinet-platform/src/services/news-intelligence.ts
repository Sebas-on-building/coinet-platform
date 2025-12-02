/**
 * 🧠 NEWS INTELLIGENCE SERVICE - AI-Driven News Enrichment
 * 
 * Transforms raw news articles into actionable intelligence through:
 * - Advanced sentiment analysis (very bearish to very bullish)
 * - Market impact scoring and prediction
 * - Urgency categorization (low → critical)
 * - Price impact prediction with confidence levels
 * - Portfolio relevance scoring
 * - Narrative extraction and trend detection
 * 
 * @module news-intelligence
 * @version 1.0.0 - Divine Perfection Step 1.1.3
 */

import { logger } from '../utils/logger';
import { NewsArticle, NewsSnapshot } from './news-service';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Enhanced news article with AI-driven intelligence
 */
export interface EnrichedNewsArticle extends NewsArticle {
  intelligence: {
    // Sentiment Analysis
    sentimentAnalysis: {
      score: number;           // -1 (very bearish) to 1 (very bullish)
      label: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
      confidence: number;      // 0 to 1
      drivers: string[];       // What drove this sentiment
    };
    
    // Market Impact Assessment
    marketImpact: {
      score: number;           // 0 to 100
      level: 'negligible' | 'low' | 'medium' | 'high' | 'critical';
      affectedAssets: string[];
      marketSegments: string[];
      reasoning: string;
    };
    
    // Price Impact Prediction
    priceImpact: {
      direction: 'up' | 'down' | 'neutral';
      magnitude: {
        min: number;           // Minimum expected % change
        max: number;           // Maximum expected % change
        expected: number;      // Most likely % change
      };
      confidence: number;      // 0 to 1
      timeframe: '1h' | '4h' | '24h' | '7d';
      reasoning: string;
    };
    
    // Urgency Assessment
    urgency: {
      level: 'low' | 'medium' | 'high' | 'critical';
      score: number;           // 0 to 100
      actionRequired: boolean;
      suggestedAction?: string;
      expiresAt?: Date;        // When this news becomes stale
    };
    
    // Categorization
    categories: {
      primary: string;
      secondary: string[];
      tags: string[];
    };
    
    // Narrative Analysis
    narrative: {
      theme: string;
      isPartOfTrend: boolean;
      relatedEvents: string[];
      marketContext: string;
    };
    
    // Portfolio Relevance (can be personalized)
    portfolioRelevance: {
      score: number;           // 0 to 100
      affectedHoldings: string[];
      riskLevel: 'low' | 'medium' | 'high';
      recommendation: string;
    };
    
    // Meta
    enrichedAt: Date;
    processingTimeMs: number;
    modelVersion: string;
  };
}

/**
 * Enriched news snapshot with aggregate intelligence
 */
export interface EnrichedNewsSnapshot extends Omit<NewsSnapshot, 'articles'> {
  articles: EnrichedNewsArticle[];
  aggregateIntelligence: {
    marketMood: {
      overall: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
      score: number;
      trend: 'improving' | 'stable' | 'deteriorating';
    };
    topNarratives: Array<{
      theme: string;
      articleCount: number;
      sentiment: number;
      impact: number;
    }>;
    criticalAlerts: EnrichedNewsArticle[];
    actionableInsights: string[];
    marketPrediction: {
      shortTerm: { direction: string; confidence: number };
      mediumTerm: { direction: string; confidence: number };
    };
    riskAssessment: {
      level: 'low' | 'elevated' | 'high' | 'extreme';
      factors: string[];
    };
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Sentiment thresholds
  SENTIMENT: {
    VERY_BEARISH: -0.6,
    BEARISH: -0.2,
    NEUTRAL_LOW: -0.2,
    NEUTRAL_HIGH: 0.2,
    BULLISH: 0.2,
    VERY_BULLISH: 0.6,
  },
  
  // Impact thresholds
  IMPACT: {
    NEGLIGIBLE: 20,
    LOW: 40,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 90,
  },
  
  // Urgency decay (hours until news becomes stale)
  URGENCY_DECAY: {
    critical: 1,
    high: 4,
    medium: 12,
    low: 48,
  },
  
  // Model version for tracking
  MODEL_VERSION: '1.0.0-divine',
};

// ============================================================================
// KEYWORD DICTIONARIES
// ============================================================================

const SENTIMENT_KEYWORDS = {
  veryBullish: [
    { word: 'etf approved', weight: 3 },
    { word: 'all-time high', weight: 2.5 },
    { word: 'ath', weight: 2.5 },
    { word: 'moon', weight: 2 },
    { word: 'skyrocket', weight: 2 },
    { word: 'parabolic', weight: 2 },
    { word: 'massive rally', weight: 2 },
    { word: 'institutional adoption', weight: 2 },
    { word: 'breakthrough', weight: 1.8 },
    { word: 'revolutionary', weight: 1.5 },
    { word: 'game changer', weight: 1.5 },
    { word: 'historic', weight: 1.5 },
    { word: 'unprecedented growth', weight: 2 },
  ],
  bullish: [
    { word: 'surge', weight: 1 },
    { word: 'soar', weight: 1 },
    { word: 'rally', weight: 1 },
    { word: 'bullish', weight: 1 },
    { word: 'gain', weight: 0.8 },
    { word: 'rise', weight: 0.7 },
    { word: 'breakout', weight: 1 },
    { word: 'pump', weight: 0.8 },
    { word: 'adoption', weight: 0.8 },
    { word: 'partnership', weight: 0.9 },
    { word: 'launch', weight: 0.7 },
    { word: 'upgrade', weight: 0.7 },
    { word: 'milestone', weight: 0.8 },
    { word: 'growth', weight: 0.6 },
    { word: 'success', weight: 0.6 },
    { word: 'buy', weight: 0.5 },
    { word: 'accumulate', weight: 0.7 },
    { word: 'support', weight: 0.5 },
  ],
  bearish: [
    { word: 'drop', weight: 1 },
    { word: 'fall', weight: 1 },
    { word: 'decline', weight: 1 },
    { word: 'bearish', weight: 1 },
    { word: 'sink', weight: 1 },
    { word: 'fear', weight: 0.8 },
    { word: 'sell', weight: 0.7 },
    { word: 'concern', weight: 0.6 },
    { word: 'warning', weight: 0.7 },
    { word: 'delay', weight: 0.6 },
    { word: 'issue', weight: 0.5 },
    { word: 'problem', weight: 0.5 },
    { word: 'risk', weight: 0.4 },
    { word: 'uncertainty', weight: 0.6 },
    { word: 'pullback', weight: 0.7 },
    { word: 'correction', weight: 0.6 },
  ],
  veryBearish: [
    { word: 'crash', weight: 3 },
    { word: 'plunge', weight: 2.5 },
    { word: 'dump', weight: 2 },
    { word: 'collapse', weight: 3 },
    { word: 'hack', weight: 2.5 },
    { word: 'exploit', weight: 2.5 },
    { word: 'rug', weight: 3 },
    { word: 'scam', weight: 3 },
    { word: 'ban', weight: 2 },
    { word: 'lawsuit', weight: 1.5 },
    { word: 'sec charges', weight: 2 },
    { word: 'investigation', weight: 1.5 },
    { word: 'fraud', weight: 3 },
    { word: 'bankrupt', weight: 3 },
    { word: 'insolvent', weight: 3 },
    { word: 'liquidation', weight: 2 },
    { word: 'ponzi', weight: 3 },
    { word: 'exit scam', weight: 3 },
  ],
};

const IMPACT_KEYWORDS = {
  critical: [
    { word: 'etf approved', weight: 100 },
    { word: 'etf rejected', weight: 95 },
    { word: 'hack', weight: 90 },
    { word: 'exploit', weight: 90 },
    { word: 'billion', weight: 70 },
    { word: 'major', weight: 50 },
    { word: 'breaking', weight: 60 },
    { word: 'ban', weight: 80 },
    { word: 'bankrupt', weight: 95 },
    { word: 'collapse', weight: 90 },
    { word: 'emergency', weight: 85 },
    { word: 'critical', weight: 70 },
    { word: 'halving', weight: 80 },
    { word: 'fork', weight: 70 },
  ],
  high: [
    { word: 'etf', weight: 50 },
    { word: 'sec', weight: 45 },
    { word: 'regulation', weight: 40 },
    { word: 'institutional', weight: 45 },
    { word: 'million', weight: 35 },
    { word: 'partnership', weight: 40 },
    { word: 'acquisition', weight: 50 },
    { word: 'launch', weight: 35 },
    { word: 'upgrade', weight: 35 },
    { word: 'fed', weight: 45 },
    { word: 'interest rate', weight: 50 },
    { word: 'whale', weight: 40 },
    { word: 'exchange', weight: 35 },
  ],
  medium: [
    { word: 'announce', weight: 25 },
    { word: 'update', weight: 20 },
    { word: 'release', weight: 25 },
    { word: 'report', weight: 20 },
    { word: 'analysis', weight: 15 },
    { word: 'prediction', weight: 20 },
    { word: 'trend', weight: 15 },
    { word: 'market', weight: 10 },
    { word: 'price', weight: 10 },
    { word: 'volume', weight: 15 },
  ],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  regulation: ['sec', 'regulation', 'regulatory', 'law', 'legal', 'compliance', 'ban', 'approve', 'reject', 'license'],
  defi: ['defi', 'dex', 'yield', 'liquidity', 'aave', 'uniswap', 'compound', 'lending', 'borrowing', 'tvl'],
  nft: ['nft', 'opensea', 'collectible', 'digital art', 'mint', 'collection'],
  bitcoin: ['bitcoin', 'btc', 'satoshi', 'lightning', 'halving', 'mining'],
  ethereum: ['ethereum', 'eth', 'vitalik', 'layer 2', 'l2', 'eip', 'gas'],
  altcoin: ['altcoin', 'alt season', 'memecoin', 'shitcoin', 'solana', 'cardano'],
  exchange: ['binance', 'coinbase', 'kraken', 'exchange', 'cex', 'listing', 'delisting'],
  market: ['market', 'price', 'rally', 'crash', 'bull', 'bear', 'correction', 'volatility'],
  technology: ['upgrade', 'fork', 'protocol', 'blockchain', 'smart contract', 'consensus'],
  adoption: ['adoption', 'institutional', 'partnership', 'integration', 'payment', 'merchant'],
  security: ['hack', 'exploit', 'vulnerability', 'audit', 'security', 'breach'],
  macro: ['fed', 'inflation', 'interest rate', 'recession', 'gdp', 'unemployment', 'dollar'],
};

const URGENCY_FACTORS = {
  timeDecay: {
    '< 1 hour': 1.5,
    '1-4 hours': 1.2,
    '4-12 hours': 1.0,
    '12-24 hours': 0.8,
    '> 24 hours': 0.5,
  },
  impactMultiplier: {
    critical: 2.0,
    high: 1.5,
    medium: 1.0,
    low: 0.7,
    negligible: 0.3,
  },
};

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

interface SentimentAnalysisResult {
  score: number;
  label: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  confidence: number;
  drivers: string[];
}

function analyzeSentiment(text: string, votes?: NewsArticle['votes']): SentimentAnalysisResult {
  const lowerText = text.toLowerCase();
  let score = 0;
  const drivers: string[] = [];
  let totalWeight = 0;
  
  // Very bullish keywords
  for (const { word, weight } of SENTIMENT_KEYWORDS.veryBullish) {
    if (lowerText.includes(word)) {
      score += weight * 2;
      totalWeight += weight;
      drivers.push(`+++ ${word}`);
    }
  }
  
  // Bullish keywords
  for (const { word, weight } of SENTIMENT_KEYWORDS.bullish) {
    if (lowerText.includes(word)) {
      score += weight;
      totalWeight += weight;
      drivers.push(`+ ${word}`);
    }
  }
  
  // Bearish keywords
  for (const { word, weight } of SENTIMENT_KEYWORDS.bearish) {
    if (lowerText.includes(word)) {
      score -= weight;
      totalWeight += weight;
      drivers.push(`- ${word}`);
    }
  }
  
  // Very bearish keywords
  for (const { word, weight } of SENTIMENT_KEYWORDS.veryBearish) {
    if (lowerText.includes(word)) {
      score -= weight * 2;
      totalWeight += weight;
      drivers.push(`--- ${word}`);
    }
  }
  
  // Factor in community votes if available
  if (votes) {
    const positiveSignal = (votes.positive || 0) + (votes.liked || 0) + (votes.important || 0);
    const negativeSignal = (votes.negative || 0) + (votes.disliked || 0) + (votes.toxic || 0);
    const voteScore = (positiveSignal - negativeSignal) * 0.05;
    score += voteScore;
    if (Math.abs(voteScore) > 0.1) {
      drivers.push(voteScore > 0 ? '+ community positive' : '- community negative');
    }
  }
  
  // Normalize score to -1 to 1
  const normalizedScore = Math.max(-1, Math.min(1, score / Math.max(5, totalWeight)));
  
  // Calculate confidence based on keyword matches
  const confidence = Math.min(0.95, 0.3 + (totalWeight / 10) * 0.7);
  
  // Determine label
  let label: SentimentAnalysisResult['label'];
  if (normalizedScore <= CONFIG.SENTIMENT.VERY_BEARISH) {
    label = 'very_bearish';
  } else if (normalizedScore <= CONFIG.SENTIMENT.BEARISH) {
    label = 'bearish';
  } else if (normalizedScore >= CONFIG.SENTIMENT.VERY_BULLISH) {
    label = 'very_bullish';
  } else if (normalizedScore >= CONFIG.SENTIMENT.BULLISH) {
    label = 'bullish';
  } else {
    label = 'neutral';
  }
  
  return {
    score: Math.round(normalizedScore * 100) / 100,
    label,
    confidence: Math.round(confidence * 100) / 100,
    drivers: drivers.slice(0, 5), // Top 5 drivers
  };
}

// ============================================================================
// MARKET IMPACT ASSESSMENT
// ============================================================================

interface MarketImpactResult {
  score: number;
  level: 'negligible' | 'low' | 'medium' | 'high' | 'critical';
  affectedAssets: string[];
  marketSegments: string[];
  reasoning: string;
}

function assessMarketImpact(
  text: string, 
  coins: string[], 
  credibility: number,
  votes?: NewsArticle['votes']
): MarketImpactResult {
  const lowerText = text.toLowerCase();
  let score = 10; // Base score
  const affectedAssets = [...coins];
  const marketSegments: string[] = [];
  const reasons: string[] = [];
  
  // Critical keywords
  for (const { word, weight } of IMPACT_KEYWORDS.critical) {
    if (lowerText.includes(word)) {
      score += weight;
      reasons.push(`Critical: "${word}"`);
    }
  }
  
  // High impact keywords
  for (const { word, weight } of IMPACT_KEYWORDS.high) {
    if (lowerText.includes(word)) {
      score += weight;
      if (reasons.length < 3) reasons.push(`High impact: "${word}"`);
    }
  }
  
  // Medium impact keywords
  for (const { word, weight } of IMPACT_KEYWORDS.medium) {
    if (lowerText.includes(word)) {
      score += weight;
    }
  }
  
  // Identify market segments
  for (const [segment, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lowerText.includes(k))) {
      marketSegments.push(segment);
    }
  }
  
  // Credibility multiplier
  score *= (0.5 + credibility * 0.5);
  
  // Engagement multiplier
  if (votes) {
    const totalEngagement = Object.values(votes).reduce((a, b) => a + (b || 0), 0);
    if (totalEngagement > 100) score *= 1.5;
    else if (totalEngagement > 50) score *= 1.3;
    else if (totalEngagement > 20) score *= 1.1;
  }
  
  // Normalize to 0-100
  score = Math.min(100, Math.round(score));
  
  // Determine level
  let level: MarketImpactResult['level'];
  if (score >= CONFIG.IMPACT.CRITICAL) level = 'critical';
  else if (score >= CONFIG.IMPACT.HIGH) level = 'high';
  else if (score >= CONFIG.IMPACT.MEDIUM) level = 'medium';
  else if (score >= CONFIG.IMPACT.LOW) level = 'low';
  else level = 'negligible';
  
  // Add global assets if macro news
  if (marketSegments.includes('macro') || marketSegments.includes('regulation')) {
    if (!affectedAssets.includes('BTC')) affectedAssets.push('BTC');
    if (!affectedAssets.includes('ETH')) affectedAssets.push('ETH');
  }
  
  return {
    score,
    level,
    affectedAssets: affectedAssets.slice(0, 10),
    marketSegments: marketSegments.slice(0, 5),
    reasoning: reasons.join('; ') || 'Standard market news',
  };
}

// ============================================================================
// PRICE IMPACT PREDICTION
// ============================================================================

interface PriceImpactResult {
  direction: 'up' | 'down' | 'neutral';
  magnitude: {
    min: number;
    max: number;
    expected: number;
  };
  confidence: number;
  timeframe: '1h' | '4h' | '24h' | '7d';
  reasoning: string;
}

function predictPriceImpact(
  sentiment: SentimentAnalysisResult,
  impact: MarketImpactResult
): PriceImpactResult {
  // Only predict for significant news
  if (impact.level === 'negligible' || impact.level === 'low') {
    return {
      direction: 'neutral',
      magnitude: { min: -0.5, max: 0.5, expected: 0 },
      confidence: 0.3,
      timeframe: '24h',
      reasoning: 'Low impact news, minimal price effect expected',
    };
  }
  
  // Determine direction
  const direction: 'up' | 'down' | 'neutral' = 
    sentiment.score > 0.15 ? 'up' : 
    sentiment.score < -0.15 ? 'down' : 'neutral';
  
  // Calculate magnitude based on impact and sentiment
  const baseMagnitude = impact.level === 'critical' ? 8 :
                        impact.level === 'high' ? 4 :
                        impact.level === 'medium' ? 2 : 1;
  
  const sentimentMultiplier = Math.abs(sentiment.score) + 0.5;
  const expectedMagnitude = baseMagnitude * sentimentMultiplier;
  
  // Determine timeframe based on impact
  const timeframe: PriceImpactResult['timeframe'] = 
    impact.level === 'critical' ? '1h' :
    impact.level === 'high' ? '4h' : '24h';
  
  // Calculate confidence
  const confidence = Math.min(0.85, 
    (sentiment.confidence * 0.4) + 
    (impact.score / 100 * 0.4) +
    0.2
  );
  
  // Build reasoning
  const reasons: string[] = [];
  if (sentiment.label.includes('bullish')) {
    reasons.push(`${sentiment.label} sentiment`);
  } else if (sentiment.label.includes('bearish')) {
    reasons.push(`${sentiment.label} sentiment`);
  }
  if (impact.level === 'critical' || impact.level === 'high') {
    reasons.push(`${impact.level} market impact`);
  }
  
  return {
    direction,
    magnitude: {
      min: Math.round(expectedMagnitude * 0.5 * 10) / 10,
      max: Math.round(expectedMagnitude * 1.5 * 10) / 10,
      expected: Math.round(expectedMagnitude * 10) / 10,
    },
    confidence: Math.round(confidence * 100) / 100,
    timeframe,
    reasoning: reasons.join(', ') || 'Standard market dynamics',
  };
}

// ============================================================================
// URGENCY ASSESSMENT
// ============================================================================

interface UrgencyResult {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  actionRequired: boolean;
  suggestedAction?: string;
  expiresAt?: Date;
}

function assessUrgency(
  publishedAt: Date,
  sentiment: SentimentAnalysisResult,
  impact: MarketImpactResult
): UrgencyResult {
  const now = new Date();
  const ageHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
  
  // Time decay factor
  let timeDecay = 1.0;
  if (ageHours < 1) timeDecay = 1.5;
  else if (ageHours < 4) timeDecay = 1.2;
  else if (ageHours < 12) timeDecay = 1.0;
  else if (ageHours < 24) timeDecay = 0.8;
  else timeDecay = 0.5;
  
  // Impact multiplier
  const impactMultiplier = URGENCY_FACTORS.impactMultiplier[impact.level] || 1.0;
  
  // Sentiment extremity bonus
  const sentimentBonus = Math.abs(sentiment.score) > 0.6 ? 1.3 : 1.0;
  
  // Calculate urgency score
  let score = impact.score * timeDecay * impactMultiplier * sentimentBonus;
  score = Math.min(100, Math.round(score));
  
  // Determine level
  let level: UrgencyResult['level'];
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';
  else level = 'low';
  
  // Determine if action is required
  const actionRequired = level === 'critical' || level === 'high';
  
  // Suggest action
  let suggestedAction: string | undefined;
  if (level === 'critical') {
    if (sentiment.score < -0.5) {
      suggestedAction = 'Review positions immediately - significant negative news';
    } else if (sentiment.score > 0.5) {
      suggestedAction = 'Potential opportunity - review for entry points';
    } else {
      suggestedAction = 'Monitor closely - high impact event';
    }
  } else if (level === 'high') {
    suggestedAction = 'Review within next few hours';
  }
  
  // Calculate expiration
  const expiryHours = CONFIG.URGENCY_DECAY[level];
  const expiresAt = new Date(publishedAt.getTime() + expiryHours * 60 * 60 * 1000);
  
  return {
    level,
    score,
    actionRequired,
    suggestedAction,
    expiresAt: expiresAt > now ? expiresAt : undefined,
  };
}

// ============================================================================
// CATEGORIZATION
// ============================================================================

interface CategorizationResult {
  primary: string;
  secondary: string[];
  tags: string[];
}

function categorizeArticle(text: string): CategorizationResult {
  const lowerText = text.toLowerCase();
  const scores: Record<string, number> = {};
  const tags: string[] = [];
  
  // Score each category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let categoryScore = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        categoryScore++;
        if (tags.length < 10) tags.push(keyword);
      }
    }
    if (categoryScore > 0) {
      scores[category] = categoryScore;
    }
  }
  
  // Sort by score
  const sortedCategories = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
  
  return {
    primary: sortedCategories[0] || 'general',
    secondary: sortedCategories.slice(1, 4),
    tags: [...new Set(tags)].slice(0, 8),
  };
}

// ============================================================================
// NARRATIVE ANALYSIS
// ============================================================================

interface NarrativeResult {
  theme: string;
  isPartOfTrend: boolean;
  relatedEvents: string[];
  marketContext: string;
}

function analyzeNarrative(
  text: string,
  categories: CategorizationResult,
  sentiment: SentimentAnalysisResult
): NarrativeResult {
  const lowerText = text.toLowerCase();
  
  // Determine theme based on primary category and sentiment
  let theme = categories.primary;
  if (sentiment.label === 'very_bullish' || sentiment.label === 'very_bearish') {
    theme = `${sentiment.label.replace('_', ' ')} ${categories.primary}`;
  }
  
  // Check for trend indicators
  const trendIndicators = ['continues', 'ongoing', 'following', 'after', 'amid', 'as'];
  const isPartOfTrend = trendIndicators.some(t => lowerText.includes(t));
  
  // Extract related events (simplified)
  const relatedEvents: string[] = [];
  if (lowerText.includes('etf')) relatedEvents.push('ETF developments');
  if (lowerText.includes('halving')) relatedEvents.push('Bitcoin halving');
  if (lowerText.includes('fed') || lowerText.includes('interest rate')) relatedEvents.push('Fed policy');
  if (lowerText.includes('hack') || lowerText.includes('exploit')) relatedEvents.push('Security incident');
  
  // Market context
  let marketContext = 'Normal market conditions';
  if (categories.primary === 'regulation') {
    marketContext = 'Regulatory focus period';
  } else if (categories.primary === 'security') {
    marketContext = 'Heightened security concerns';
  } else if (sentiment.score > 0.5) {
    marketContext = 'Risk-on sentiment';
  } else if (sentiment.score < -0.5) {
    marketContext = 'Risk-off sentiment';
  }
  
  return {
    theme,
    isPartOfTrend,
    relatedEvents,
    marketContext,
  };
}

// ============================================================================
// PORTFOLIO RELEVANCE
// ============================================================================

interface PortfolioRelevanceResult {
  score: number;
  affectedHoldings: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

function assessPortfolioRelevance(
  coins: string[],
  impact: MarketImpactResult,
  sentiment: SentimentAnalysisResult,
  userPortfolio?: string[]
): PortfolioRelevanceResult {
  // If no user portfolio, use default top coins
  const portfolio = userPortfolio || ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'];
  
  // Find overlapping coins
  const affectedHoldings = coins.filter(c => 
    portfolio.some(p => p.toUpperCase() === c.toUpperCase())
  );
  
  // Add global impact assets
  if (impact.marketSegments.includes('macro') || impact.level === 'critical') {
    if (!affectedHoldings.includes('BTC') && portfolio.includes('BTC')) {
      affectedHoldings.push('BTC');
    }
    if (!affectedHoldings.includes('ETH') && portfolio.includes('ETH')) {
      affectedHoldings.push('ETH');
    }
  }
  
  // Calculate relevance score
  let score = 0;
  if (affectedHoldings.length > 0) {
    score = 50 + (affectedHoldings.length / portfolio.length) * 30;
    score += impact.score * 0.2;
  } else if (impact.level === 'critical') {
    score = 40; // Critical news affects everyone
  } else {
    score = 10;
  }
  score = Math.min(100, Math.round(score));
  
  // Determine risk level
  let riskLevel: PortfolioRelevanceResult['riskLevel'] = 'low';
  if (affectedHoldings.length > 0 && sentiment.score < -0.3) {
    riskLevel = 'high';
  } else if (affectedHoldings.length > 0 && Math.abs(sentiment.score) > 0.3) {
    riskLevel = 'medium';
  }
  
  // Generate recommendation
  let recommendation = 'No action needed';
  if (riskLevel === 'high') {
    recommendation = `Review ${affectedHoldings.join(', ')} positions - negative news impact`;
  } else if (riskLevel === 'medium') {
    recommendation = `Monitor ${affectedHoldings.join(', ')} - significant news`;
  } else if (affectedHoldings.length > 0) {
    recommendation = `Relevant to your holdings: ${affectedHoldings.join(', ')}`;
  }
  
  return {
    score,
    affectedHoldings,
    riskLevel,
    recommendation,
  };
}

// ============================================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================================

/**
 * Enrich a single news article with AI-driven intelligence
 */
export function enrichArticle(
  article: NewsArticle,
  userPortfolio?: string[]
): EnrichedNewsArticle {
  const startTime = Date.now();
  
  // Combine title and summary for analysis
  const fullText = `${article.title} ${article.summary || ''}`;
  
  // Run all analyses
  const sentimentAnalysis = analyzeSentiment(fullText, article.votes);
  const categories = categorizeArticle(fullText);
  const marketImpact = assessMarketImpact(fullText, article.coins, article.credibility, article.votes);
  const priceImpact = predictPriceImpact(sentimentAnalysis, marketImpact);
  const urgency = assessUrgency(article.publishedAt, sentimentAnalysis, marketImpact);
  const narrative = analyzeNarrative(fullText, categories, sentimentAnalysis);
  const portfolioRelevance = assessPortfolioRelevance(
    article.coins, 
    marketImpact, 
    sentimentAnalysis, 
    userPortfolio
  );
  
  const processingTimeMs = Date.now() - startTime;
  
  return {
    ...article,
    // Update original fields with enriched data
    sentiment: sentimentAnalysis.label,
    sentimentScore: sentimentAnalysis.score,
    impact: marketImpact.level === 'negligible' ? 'low' : marketImpact.level,
    impactScore: marketImpact.score,
    urgency: urgency.level,
    categories: [categories.primary, ...categories.secondary],
    priceImpactPrediction: {
      direction: priceImpact.direction,
      magnitude: priceImpact.magnitude.expected,
      confidence: priceImpact.confidence,
      timeframe: priceImpact.timeframe,
    },
    // Add full intelligence object
    intelligence: {
      sentimentAnalysis,
      marketImpact,
      priceImpact,
      urgency,
      categories,
      narrative,
      portfolioRelevance,
      enrichedAt: new Date(),
      processingTimeMs,
      modelVersion: CONFIG.MODEL_VERSION,
    },
  };
}

/**
 * Enrich an entire news snapshot with aggregate intelligence
 */
export function enrichNewsSnapshot(
  snapshot: NewsSnapshot,
  userPortfolio?: string[]
): EnrichedNewsSnapshot {
  const startTime = Date.now();
  
  // Enrich all articles
  const enrichedArticles = snapshot.articles.map(article => 
    enrichArticle(article, userPortfolio)
  );
  
  // Calculate aggregate intelligence
  const sentimentScores = enrichedArticles.map(a => a.intelligence.sentimentAnalysis.score);
  const avgSentiment = sentimentScores.length > 0 
    ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length 
    : 0;
  
  // Determine overall mood
  let marketMood: EnrichedNewsSnapshot['aggregateIntelligence']['marketMood']['overall'];
  if (avgSentiment <= -0.6) marketMood = 'very_bearish';
  else if (avgSentiment <= -0.2) marketMood = 'bearish';
  else if (avgSentiment >= 0.6) marketMood = 'very_bullish';
  else if (avgSentiment >= 0.2) marketMood = 'bullish';
  else marketMood = 'neutral';
  
  // Extract top narratives
  const narrativeCounts: Record<string, { count: number; sentiment: number; impact: number }> = {};
  for (const article of enrichedArticles) {
    const theme = article.intelligence.narrative.theme;
    if (!narrativeCounts[theme]) {
      narrativeCounts[theme] = { count: 0, sentiment: 0, impact: 0 };
    }
    narrativeCounts[theme].count++;
    narrativeCounts[theme].sentiment += article.intelligence.sentimentAnalysis.score;
    narrativeCounts[theme].impact += article.intelligence.marketImpact.score;
  }
  
  const topNarratives = Object.entries(narrativeCounts)
    .map(([theme, data]) => ({
      theme,
      articleCount: data.count,
      sentiment: Math.round(data.sentiment / data.count * 100) / 100,
      impact: Math.round(data.impact / data.count),
    }))
    .sort((a, b) => b.articleCount - a.articleCount)
    .slice(0, 5);
  
  // Get critical alerts
  const criticalAlerts = enrichedArticles.filter(a => 
    a.intelligence.urgency.level === 'critical' || 
    a.intelligence.marketImpact.level === 'critical'
  );
  
  // Generate actionable insights
  const actionableInsights: string[] = [];
  if (criticalAlerts.length > 0) {
    actionableInsights.push(`🚨 ${criticalAlerts.length} critical alert(s) require immediate attention`);
  }
  if (avgSentiment < -0.4) {
    actionableInsights.push('⚠️ Market sentiment is bearish - consider risk management');
  } else if (avgSentiment > 0.4) {
    actionableInsights.push('📈 Market sentiment is bullish - watch for opportunities');
  }
  
  const highImpactCount = enrichedArticles.filter(a => 
    a.intelligence.marketImpact.level === 'high' || 
    a.intelligence.marketImpact.level === 'critical'
  ).length;
  if (highImpactCount > 3) {
    actionableInsights.push(`📊 ${highImpactCount} high-impact news items - increased volatility expected`);
  }
  
  // Market prediction
  const recentArticles = enrichedArticles.filter(a => {
    const ageHours = (Date.now() - a.publishedAt.getTime()) / (1000 * 60 * 60);
    return ageHours < 4;
  });
  const recentSentiment = recentArticles.length > 0
    ? recentArticles.reduce((sum, a) => sum + a.intelligence.sentimentAnalysis.score, 0) / recentArticles.length
    : avgSentiment;
  
  // Risk assessment
  let riskLevel: 'low' | 'elevated' | 'high' | 'extreme' = 'low';
  const riskFactors: string[] = [];
  
  if (criticalAlerts.length > 2) {
    riskLevel = 'extreme';
    riskFactors.push('Multiple critical alerts');
  } else if (criticalAlerts.length > 0) {
    riskLevel = 'high';
    riskFactors.push('Critical news events');
  } else if (avgSentiment < -0.4) {
    riskLevel = 'elevated';
    riskFactors.push('Bearish sentiment');
  }
  
  if (highImpactCount > 5) {
    riskFactors.push('High news volume');
  }
  
  const processingTime = Date.now() - startTime;
  
  logger.debug('🧠 News intelligence enrichment complete', {
    articles: enrichedArticles.length,
    criticalAlerts: criticalAlerts.length,
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    processingTimeMs: processingTime,
  });
  
  return {
    ...snapshot,
    articles: enrichedArticles,
    aggregateIntelligence: {
      marketMood: {
        overall: marketMood,
        score: Math.round(avgSentiment * 100) / 100,
        trend: recentSentiment > avgSentiment ? 'improving' : 
               recentSentiment < avgSentiment ? 'deteriorating' : 'stable',
      },
      topNarratives,
      criticalAlerts,
      actionableInsights,
      marketPrediction: {
        shortTerm: {
          direction: recentSentiment > 0.1 ? 'bullish' : recentSentiment < -0.1 ? 'bearish' : 'neutral',
          confidence: Math.min(0.7, 0.3 + Math.abs(recentSentiment) * 0.5),
        },
        mediumTerm: {
          direction: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
          confidence: Math.min(0.6, 0.2 + Math.abs(avgSentiment) * 0.4),
        },
      },
      riskAssessment: {
        level: riskLevel,
        factors: riskFactors,
      },
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const newsIntelligence = {
  enrichArticle,
  enrichSnapshot: enrichNewsSnapshot,
  analyzeSentiment,
  assessMarketImpact,
  predictPriceImpact,
  assessUrgency,
  categorizeArticle,
};

export default newsIntelligence;

