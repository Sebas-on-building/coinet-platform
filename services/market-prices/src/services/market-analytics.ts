/**
 * Market Analytics Service
 * Advanced analytics for price correlation, anomaly detection, and trend analysis
 * Divine perfection in financial analytics
 */

import {
  DataSource,
  MarketPrice,
  OHLCV,
} from '../types';
import { CoinGeckoRestClient } from '../providers/coingecko-rest';
import { logger } from '../utils/logger';

/**
 * Correlation result between two assets
 */
export interface CorrelationResult {
  symbol1: string;
  symbol2: string;
  correlation: number; // Pearson correlation coefficient (-1 to 1)
  pValue?: number; // Statistical significance
  sampleSize: number;
  period: string;
  confidence: number; // 0-100
}

/**
 * Price anomaly detection result
 */
export interface Anomaly {
  symbol: string;
  timestamp: Date;
  price: number;
  expectedPrice: number;
  deviation: number; // Standard deviations from expected
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  reason: string;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  symbol: string;
  period: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  support: number; // Support level
  resistance: number; // Resistance level
  momentum: number; // Momentum indicator
  confidence: number; // 0-100
}

/**
 * Market Analytics Service
 * Provides advanced analytics including correlation, anomaly detection, and trend analysis
 */
export class MarketAnalytics {
  private geckoClient: CoinGeckoRestClient;

  constructor(geckoClient: CoinGeckoRestClient) {
    this.geckoClient = geckoClient;
  }

  /**
   * Calculate price correlation between two assets
   * Uses Pearson correlation coefficient
   * @param symbol1 First asset symbol
   * @param symbol2 Second asset symbol
   * @param days Number of days of historical data (default: 30)
   * @returns Correlation result
   */
  async calculateCorrelation(
    symbol1: string,
    symbol2: string,
    days: number = 30
  ): Promise<CorrelationResult> {
    try {
      // Fetch historical OHLCV data for both assets
      // getOHLC returns number[][] where each array is [timestamp, open, high, low, close]
      const [data1, data2] = await Promise.all([
        this.geckoClient.getOHLC(symbol1.toLowerCase(), 'usd', days),
        this.geckoClient.getOHLC(symbol2.toLowerCase(), 'usd', days),
      ]);

      if (!data1 || data1.length === 0 || !data2 || data2.length === 0) {
        throw new Error('Insufficient historical data');
      }

      // Extract closing prices (index 4 in each array)
      const prices1 = data1.map(d => d[4]); // close price
      const prices2 = data2.map(d => d[4]); // close price

      // Ensure same length (align by timestamp if needed)
      const minLength = Math.min(prices1.length, prices2.length);
      const alignedPrices1 = prices1.slice(-minLength);
      const alignedPrices2 = prices2.slice(-minLength);

      // Calculate Pearson correlation coefficient
      const correlation = this.pearsonCorrelation(
        alignedPrices1,
        alignedPrices2
      );

      // Calculate confidence based on sample size
      const confidence = Math.min(100, (minLength / 30) * 100);

      return {
        symbol1,
        symbol2,
        correlation,
        sampleSize: minLength,
        period: `${days} days`,
        confidence: Math.round(confidence),
      };
    } catch (error) {
      logger.error('Failed to calculate correlation', {
        symbol1,
        symbol2,
        days,
        error,
      });
      throw error;
    }
  }

  /**
   * Detect price anomalies using statistical methods
   * Uses Z-score and moving average deviation
   * @param symbol Asset symbol
   * @param days Number of days to analyze (default: 30)
   * @param threshold Standard deviations threshold (default: 2)
   * @returns Array of detected anomalies
   */
  async detectAnomalies(
    symbol: string,
    days: number = 30,
    threshold: number = 2
  ): Promise<Anomaly[]> {
    try {
      // Fetch historical OHLCV data
      // getOHLC returns number[][] where each array is [timestamp, open, high, low, close]
      const data = await this.geckoClient.getOHLC(symbol.toLowerCase(), 'usd', days);

      if (!data || data.length < 10) {
        throw new Error('Insufficient historical data for anomaly detection');
      }

      const prices = data.map(d => d[4]); // close price
      const timestamps = data.map(d => new Date(d[0])); // timestamp

      // Calculate moving average and standard deviation
      const windowSize = Math.min(7, Math.floor(prices.length / 3));
      const anomalies: Anomaly[] = [];

      for (let i = windowSize; i < prices.length; i++) {
        const window = prices.slice(i - windowSize, i);
        const mean = this.calculateMean(window);
        const stdDev = this.calculateStdDev(window, mean);

        if (stdDev === 0) continue;

        const currentPrice = prices[i];
        const zScore = Math.abs((currentPrice - mean) / stdDev);

        if (zScore >= threshold) {
          const deviation = (currentPrice - mean) / stdDev;
          const severity = this.determineSeverity(zScore);
          const confidence = Math.min(100, zScore * 20);

          anomalies.push({
            symbol,
            timestamp: timestamps[i],
            price: currentPrice,
            expectedPrice: mean,
            deviation,
            severity,
            confidence: Math.round(confidence),
            reason: this.getAnomalyReason(deviation, zScore),
          });
        }
      }

      return anomalies.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error('Failed to detect anomalies', { symbol, days, error });
      throw error;
    }
  }

  /**
   * Analyze price trends using technical indicators
   * @param symbol Asset symbol
   * @param days Number of days to analyze (default: 30)
   * @returns Trend analysis result
   */
  async analyzeTrend(
    symbol: string,
    days: number = 30
  ): Promise<TrendAnalysis> {
    try {
      // Fetch historical OHLCV data
      // getOHLC returns number[][] where each array is [timestamp, open, high, low, close]
      const data = await this.geckoClient.getOHLC(symbol.toLowerCase(), 'usd', days);

      if (!data || data.length < 10) {
        throw new Error('Insufficient historical data for trend analysis');
      }

      const closes = data.map(d => d[4]); // close price
      const highs = data.map(d => d[2]); // high price
      const lows = data.map(d => d[3]); // low price

      // Calculate moving averages
      const shortMA = this.calculateMovingAverage(closes, 7);
      const longMA = this.calculateMovingAverage(closes, 14);

      // Determine trend direction
      const currentPrice = closes[closes.length - 1];
      const trend = this.determineTrend(currentPrice, shortMA, longMA);

      // Calculate support and resistance levels
      const support = Math.min(...lows.slice(-14));
      const resistance = Math.max(...highs.slice(-14));

      // Calculate momentum (rate of change)
      const momentum = this.calculateMomentum(closes);

      // Calculate trend strength
      const strength = this.calculateTrendStrength(closes, trend);

      // Calculate confidence
      const confidence = Math.min(100, (data.length / 30) * 100);

      return {
        symbol,
        period: `${days} days`,
        trend,
        strength: Math.round(strength),
        support,
        resistance,
        momentum: Math.round(momentum * 100) / 100,
        confidence: Math.round(confidence),
      };
    } catch (error) {
      logger.error('Failed to analyze trend', { symbol, days, error });
      throw error;
    }
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const meanX = this.calculateMean(x);
    const meanY = this.calculateMean(y);

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      sumSqX += diffX * diffX;
      sumSqY += diffY * diffY;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate mean of values
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const variance = values.reduce(
      (sum, v) => sum + Math.pow(v - mean, 2),
      0
    ) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[], window: number): number {
    if (values.length < window) {
      return this.calculateMean(values);
    }
    const windowValues = values.slice(-window);
    return this.calculateMean(windowValues);
  }

  /**
   * Determine trend direction
   */
  private determineTrend(
    currentPrice: number,
    shortMA: number,
    longMA: number
  ): 'bullish' | 'bearish' | 'neutral' {
    if (currentPrice > shortMA && shortMA > longMA) {
      return 'bullish';
    } else if (currentPrice < shortMA && shortMA < longMA) {
      return 'bearish';
    }
    return 'neutral';
  }

  /**
   * Calculate momentum (rate of change)
   */
  private calculateMomentum(prices: number[]): number {
    if (prices.length < 2) return 0;
    const recent = prices.slice(-5);
    const older = prices.slice(-10, -5);
    if (older.length === 0) return 0;
    const recentAvg = this.calculateMean(recent);
    const olderAvg = this.calculateMean(older);
    return olderAvg === 0 ? 0 : (recentAvg - olderAvg) / olderAvg;
  }

  /**
   * Calculate trend strength
   */
  private calculateTrendStrength(
    prices: number[],
    trend: 'bullish' | 'bearish' | 'neutral'
  ): number {
    if (prices.length < 2) return 0;

    let consistentMoves = 0;
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (
        (trend === 'bullish' && change > 0) ||
        (trend === 'bearish' && change < 0)
      ) {
        consistentMoves++;
      }
    }

    return (consistentMoves / (prices.length - 1)) * 100;
  }

  /**
   * Determine anomaly severity based on Z-score
   */
  private determineSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (zScore >= 4) return 'critical';
    if (zScore >= 3) return 'high';
    if (zScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Get human-readable anomaly reason
   */
  private getAnomalyReason(deviation: number, zScore: number): string {
    const direction = deviation > 0 ? 'spike' : 'drop';
    const magnitude = zScore >= 3 ? 'significant' : 'moderate';
    return `${magnitude} price ${direction} detected (${zScore.toFixed(2)}σ deviation)`;
  }
}

export default MarketAnalytics;

