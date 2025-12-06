/**
 * 📊 Market Sentiment Service - Phase 2 Divine Integration
 * 
 * Real-time market sentiment aggregation from multiple sources.
 * 
 * SOURCES:
 * - Alternative.me Fear & Greed Index (free, no key required)
 * - CoinGlass funding rates (via market-prices)
 * - Social trends analysis
 * 
 * FEATURES:
 * - Fear & Greed Index (0-100)
 * - Historical sentiment comparison
 * - Sentiment trend detection
 * - Multi-indicator aggregation
 * - Smart caching
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Alternative.me Fear & Greed Index (free API)
  FEAR_GREED_URL: 'https://api.alternative.me/fng/',
  
  // CoinGlass for funding rates (optional)
  COINGLASS_URL: 'https://open-api.coinglass.com/public/v2',
  COINGLASS_API_KEY: process.env.COINGLASS_API_KEY || '',
  
  // Cache settings
  CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes (Fear & Greed updates every 12h)
  
  // Request timeout
  TIMEOUT_MS: 8000,
};

// ============================================================================
// TYPES
// ============================================================================

export interface FearGreedIndex {
  value: number;           // 0-100
  classification: string;  // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: Date;
  previousValue?: number;
  previousClassification?: string;
  trend: 'improving' | 'worsening' | 'stable';
}

export interface MarketSentiment {
  fearGreed: FearGreedIndex;
  overall: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  summary: string;
  signals: {
    name: string;
    value: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
  }[];
  recommendation: string;
  lastUpdated: string;
}

interface SentimentCache {
  data: MarketSentiment;
  timestamp: number;
}

// ============================================================================
// CACHE
// ============================================================================

let sentimentCache: SentimentCache | null = null;

// ============================================================================
// FEAR & GREED INDEX
// ============================================================================

interface FearGreedResponse {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
    time_until_update?: string;
  }>;
}

async function fetchFearGreedIndex(): Promise<FearGreedIndex | null> {
  try {
    // Get current and yesterday's values
    const response = await axios.get<FearGreedResponse>(CONFIG.FEAR_GREED_URL, {
      params: { limit: 2 },
      timeout: CONFIG.TIMEOUT_MS,
    });
    
    if (!response.data?.data?.length) {
      return null;
    }
    
    const current = response.data.data[0];
    const previous = response.data.data[1];
    
    const currentValue = parseInt(current.value);
    const previousValue = previous ? parseInt(previous.value) : undefined;
    
    // Determine trend
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (previousValue !== undefined) {
      const diff = currentValue - previousValue;
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'worsening';
    }
    
    return {
      value: currentValue,
      classification: current.value_classification,
      timestamp: new Date(parseInt(current.timestamp) * 1000),
      previousValue,
      previousClassification: previous?.value_classification,
      trend,
    };
  } catch (error: any) {
    logger.warn('📊 Fear & Greed fetch failed', { error: error.message });
    return null;
  }
}

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

function classifyOverallSentiment(fearGreed: FearGreedIndex): MarketSentiment['overall'] {
  const value = fearGreed.value;
  
  if (value <= 20) return 'extreme_fear';
  if (value <= 40) return 'fear';
  if (value <= 60) return 'neutral';
  if (value <= 80) return 'greed';
  return 'extreme_greed';
}

function generateSummary(fearGreed: FearGreedIndex, overall: MarketSentiment['overall']): string {
  const trendText = {
    improving: 'improving from yesterday',
    worsening: 'declining from yesterday',
    stable: 'stable from yesterday',
  };
  
  const sentimentDescriptions = {
    extreme_fear: 'Market is in extreme fear - historically a buying opportunity for long-term holders',
    fear: 'Market sentiment is fearful - caution advised but opportunities may exist',
    neutral: 'Market sentiment is neutral - no strong directional bias',
    greed: 'Market sentiment is greedy - be cautious of potential corrections',
    extreme_greed: 'Market is extremely greedy - high risk of correction, consider taking profits',
  };
  
  return `${sentimentDescriptions[overall]}. Sentiment is ${trendText[fearGreed.trend]}.`;
}

function generateRecommendation(overall: MarketSentiment['overall'], trend: string): string {
  const recommendations = {
    extreme_fear: 'Consider accumulating quality assets - "Be greedy when others are fearful"',
    fear: 'Look for selective entry points in fundamentally strong projects',
    neutral: 'No strong signal - maintain current strategy and watch for breakouts',
    greed: 'Consider taking partial profits and tightening stop losses',
    extreme_greed: 'High risk zone - strongly consider profit-taking and reducing exposure',
  };
  
  return recommendations[overall];
}

function buildSignals(fearGreed: FearGreedIndex): MarketSentiment['signals'] {
  const signals: MarketSentiment['signals'] = [];
  
  // Fear & Greed signal
  let fgSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (fearGreed.value <= 30) fgSentiment = 'bearish';
  else if (fearGreed.value >= 70) fgSentiment = 'bullish';
  
  signals.push({
    name: 'Fear & Greed Index',
    value: `${fearGreed.value}/100 (${fearGreed.classification})`,
    sentiment: fgSentiment,
  });
  
  // Trend signal
  let trendSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (fearGreed.trend === 'improving') trendSentiment = 'bullish';
  else if (fearGreed.trend === 'worsening') trendSentiment = 'bearish';
  
  signals.push({
    name: 'Sentiment Trend',
    value: fearGreed.trend.charAt(0).toUpperCase() + fearGreed.trend.slice(1),
    sentiment: trendSentiment,
  });
  
  // Historical comparison
  if (fearGreed.previousValue !== undefined) {
    const diff = fearGreed.value - fearGreed.previousValue;
    const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
    
    signals.push({
      name: '24h Change',
      value: `${diffStr} points`,
      sentiment: diff > 0 ? 'bullish' : diff < 0 ? 'bearish' : 'neutral',
    });
  }
  
  return signals;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * 🎯 MAIN: Get comprehensive market sentiment
 */
export async function getMarketSentiment(): Promise<MarketSentiment | null> {
  // Check cache
  if (sentimentCache && Date.now() - sentimentCache.timestamp < CONFIG.CACHE_TTL_MS) {
    logger.debug('📊 Sentiment cache hit');
    return sentimentCache.data;
  }
  
  // Fetch Fear & Greed Index
  const fearGreed = await fetchFearGreedIndex();
  
  if (!fearGreed) {
    logger.warn('📊 Could not fetch sentiment data');
    return null;
  }
  
  const overall = classifyOverallSentiment(fearGreed);
  const summary = generateSummary(fearGreed, overall);
  const recommendation = generateRecommendation(overall, fearGreed.trend);
  const signals = buildSignals(fearGreed);
  
  const sentiment: MarketSentiment = {
    fearGreed,
    overall,
    summary,
    signals,
    recommendation,
    lastUpdated: new Date().toISOString(),
  };
  
  // Update cache
  sentimentCache = { data: sentiment, timestamp: Date.now() };
  
  logger.info('📊 Market sentiment updated', {
    value: fearGreed.value,
    classification: fearGreed.classification,
    trend: fearGreed.trend,
  });
  
  return sentiment;
}

/**
 * Format sentiment for AI context
 */
export function formatSentimentForAI(sentiment: MarketSentiment): string {
  const emoji = {
    extreme_fear: '😱',
    fear: '😟',
    neutral: '😐',
    greed: '🤑',
    extreme_greed: '🚀💥',
  };
  
  let context = `\n[📊 MARKET SENTIMENT - ${emoji[sentiment.overall]} ${sentiment.overall.replace('_', ' ').toUpperCase()}]\n`;
  context += `Fear & Greed Index: ${sentiment.fearGreed.value}/100 (${sentiment.fearGreed.classification})\n`;
  context += `Trend: ${sentiment.fearGreed.trend}\n`;
  
  if (sentiment.fearGreed.previousValue !== undefined) {
    const diff = sentiment.fearGreed.value - sentiment.fearGreed.previousValue;
    const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
    context += `24h Change: ${diffStr} points\n`;
  }
  
  context += `\n${sentiment.summary}\n`;
  context += `💡 ${sentiment.recommendation}\n`;
  
  return context;
}

/**
 * Quick sentiment check
 */
export async function getSentimentSummary(): Promise<string> {
  const sentiment = await getMarketSentiment();
  if (!sentiment) return 'Sentiment data unavailable';
  
  return `${sentiment.fearGreed.classification} (${sentiment.fearGreed.value}/100) - ${sentiment.fearGreed.trend}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const sentimentService = {
  get: getMarketSentiment,
  getSummary: getSentimentSummary,
  formatForAI: formatSentimentForAI,
};

export default sentimentService;

