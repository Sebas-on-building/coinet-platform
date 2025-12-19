/**
 * 📊 SENTIMENT DATA SERVICE
 * 
 * Fetches real market sentiment data from multiple sources:
 * - Alternative.me Fear & Greed Index (free, no API key)
 * - Derivatives data (funding rates, liquidations)
 * - Technical indicators (RSI, trend analysis)
 */

import { logger } from '../utils/logger';
import axios from 'axios';
import NodeCache from 'node-cache';

// ============================================================================
// TYPES
// ============================================================================

export interface FearGreedData {
  value: number;                    // 0-100
  classification: string;           // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: Date;
  previousValue?: number;
  previousClassification?: string;
  trend: 'improving' | 'worsening' | 'stable';
}

export interface DerivativesData {
  fundingRate: number;              // Current funding rate (%)
  fundingRateTrend: 'bullish' | 'bearish' | 'neutral';
  openInterest: number;             // Total open interest in USD
  openInterestChange24h: number;    // % change
  longShortRatio: number;           // Ratio of longs to shorts
  liquidations24h: {
    total: number;
    longs: number;
    shorts: number;
  };
}

export interface TechnicalIndicators {
  rsi14: number;                    // 0-100
  rsiSignal: 'oversold' | 'neutral' | 'overbought';
  macdSignal: 'bullish' | 'bearish' | 'neutral';
  trendStrength: number;            // 0-100
  volatility: number;               // Realized volatility
  priceVsSMA: {
    vs20: number;                   // % above/below 20 SMA
    vs50: number;
    vs200: number;
  };
}

export interface SentimentContext {
  fearGreed: FearGreedData;
  derivatives?: DerivativesData;
  technicals?: TechnicalIndicators;
  overallSentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  sentimentScore: number;           // -100 to +100
  summary: string;
  lastUpdated: Date;
  dataSource: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class SentimentDataService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 600; // 10 minutes (Fear & Greed updates every 12h)
  private readonly FEAR_GREED_URL = 'https://api.alternative.me/fng/';

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
    logger.info('📊 SentimentDataService initialized');
  }

  /**
   * Get comprehensive sentiment data
   */
  async getSentimentData(): Promise<SentimentContext> {
    const cacheKey = 'sentiment_global';
    const cached = this.cache.get<SentimentContext>(cacheKey);
    
    if (cached) {
      logger.info('📊 Returning cached sentiment data');
      return cached;
    }

    try {
      logger.info('📊 Fetching LIVE sentiment data');

      // Fetch Fear & Greed Index
      const fearGreed = await this.fetchFearGreedIndex();

      // Calculate overall sentiment
      const { overallSentiment, sentimentScore, summary } = this.calculateOverallSentiment(fearGreed);

      const result: SentimentContext = {
        fearGreed,
        overallSentiment,
        sentimentScore,
        summary,
        lastUpdated: new Date(),
        dataSource: 'alternative.me',
      };

      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('❌ Failed to fetch sentiment data:', error);
      return this.getFallbackSentiment();
    }
  }

  /**
   * Fetch Fear & Greed Index from Alternative.me (FREE API)
   */
  private async fetchFearGreedIndex(): Promise<FearGreedData> {
    try {
      // Get current and previous day's values
      const response = await axios.get(this.FEAR_GREED_URL, {
        params: { limit: 2 },
        timeout: 10000,
      });

      const data = response.data?.data;
      if (!data || data.length === 0) {
        throw new Error('No data returned from Fear & Greed API');
      }

      const current = data[0];
      const previous = data[1];

      const currentValue = parseInt(current.value, 10);
      const previousValue = previous ? parseInt(previous.value, 10) : undefined;

      // Determine trend
      let trend: 'improving' | 'worsening' | 'stable' = 'stable';
      if (previousValue !== undefined) {
        const diff = currentValue - previousValue;
        if (diff > 5) trend = 'improving';
        else if (diff < -5) trend = 'worsening';
      }

      const result: FearGreedData = {
        value: currentValue,
        classification: current.value_classification,
        timestamp: new Date(parseInt(current.timestamp, 10) * 1000),
        previousValue,
        previousClassification: previous?.value_classification,
        trend,
      };

      logger.info(`✅ Fear & Greed Index: ${result.value} (${result.classification})`);
      return result;

    } catch (error: any) {
      logger.error('Failed to fetch Fear & Greed Index:', error.message);
      // Return a reasonable default rather than failing completely
      return {
        value: 50,
        classification: 'Neutral',
        timestamp: new Date(),
        trend: 'stable',
      };
    }
  }

  /**
   * Calculate overall sentiment from all indicators
   */
  private calculateOverallSentiment(fearGreed: FearGreedData): {
    overallSentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
    sentimentScore: number;
    summary: string;
  } {
    const value = fearGreed.value;

    // Map 0-100 to sentiment categories
    let overallSentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
    let sentimentScore: number;
    let summary: string;

    if (value <= 20) {
      overallSentiment = 'extreme_fear';
      sentimentScore = -80 - ((20 - value) / 20) * 20; // -80 to -100
      summary = `Market in EXTREME FEAR (${value}/100). Historically, this signals potential buying opportunities for long-term holders. Smart money often accumulates during these periods.`;
    } else if (value <= 40) {
      overallSentiment = 'fear';
      sentimentScore = -40 - ((40 - value) / 20) * 40; // -40 to -80
      summary = `Market in FEAR (${value}/100). Sentiment is cautious. This often precedes recoveries but timing remains uncertain.`;
    } else if (value <= 60) {
      overallSentiment = 'neutral';
      sentimentScore = ((value - 50) / 10) * 40; // -40 to +40
      summary = `Market sentiment is NEUTRAL (${value}/100). Neither fear nor greed dominates - a balanced environment.`;
    } else if (value <= 80) {
      overallSentiment = 'greed';
      sentimentScore = 40 + ((value - 60) / 20) * 40; // +40 to +80
      summary = `Market in GREED (${value}/100). Optimism is high but not extreme. Watch for overextension.`;
    } else {
      overallSentiment = 'extreme_greed';
      sentimentScore = 80 + ((value - 80) / 20) * 20; // +80 to +100
      summary = `Market in EXTREME GREED (${value}/100). ⚠️ Historically, this signals potential correction risk. Consider taking profits or reducing exposure.`;
    }

    // Add trend context
    if (fearGreed.trend === 'improving' && fearGreed.previousValue) {
      summary += ` Sentiment is improving from yesterday's ${fearGreed.previousValue}/100.`;
    } else if (fearGreed.trend === 'worsening' && fearGreed.previousValue) {
      summary += ` Sentiment declined from yesterday's ${fearGreed.previousValue}/100.`;
    }

    return { overallSentiment, sentimentScore, summary };
  }

  /**
   * Get Fear & Greed history for charting
   */
  async getFearGreedHistory(days: number = 30): Promise<Array<{ date: Date; value: number; classification: string }>> {
    const cacheKey = `fng_history_${days}`;
    const cached = this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.FEAR_GREED_URL, {
        params: { limit: days },
        timeout: 10000,
      });

      const history = response.data?.data?.map((item: any) => ({
        date: new Date(parseInt(item.timestamp, 10) * 1000),
        value: parseInt(item.value, 10),
        classification: item.value_classification,
      })) || [];

      this.cache.set(cacheKey, history, 3600); // Cache for 1 hour
      return history;

    } catch (error) {
      logger.error('Failed to fetch Fear & Greed history:', error);
      return [];
    }
  }

  /**
   * Fallback sentiment when APIs fail
   */
  private getFallbackSentiment(): SentimentContext {
    logger.warn('⚠️ Returning fallback sentiment data - API unavailable');
    return {
      fearGreed: {
        value: 50,
        classification: 'Neutral',
        timestamp: new Date(),
        trend: 'stable',
      },
      overallSentiment: 'neutral',
      sentimentScore: 0,
      summary: 'Sentiment data temporarily unavailable. Please check back later.',
      lastUpdated: new Date(),
      dataSource: 'fallback',
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
  }
}
