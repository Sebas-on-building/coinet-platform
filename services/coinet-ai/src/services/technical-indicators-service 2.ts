/**
 * 📈 TECHNICAL INDICATORS SERVICE
 * 
 * Calculates technical indicators from price data:
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - Moving Averages (SMA 20, 50, 200)
 * - Trend Analysis
 * - Support/Resistance Levels
 * 
 * Uses CoinGecko OHLC data for calculations.
 */

import { logger } from '../utils/logger';
import axios from 'axios';
import NodeCache from 'node-cache';

// ============================================================================
// TYPES
// ============================================================================

export interface TechnicalAnalysis {
  symbol: string;
  
  // RSI
  rsi14: number;
  rsiSignal: 'oversold' | 'neutral' | 'overbought';
  rsiDescription: string;
  
  // MACD
  macd: {
    value: number;
    signal: number;
    histogram: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  
  // Moving Averages
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    currentPrice: number;
    priceVsSMA20: number;  // % above/below
    priceVsSMA50: number;
    priceVsSMA200: number;
    goldenCross: boolean;  // 50 SMA > 200 SMA
    deathCross: boolean;   // 50 SMA < 200 SMA
  };
  
  // Trend
  trend: {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;      // 0-100
    description: string;
  };
  
  // Support/Resistance
  levels: {
    support: number[];
    resistance: number[];
  };
  
  // Overall
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  confidence: number;
  lastUpdated: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

export class TechnicalIndicatorsService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly COINGECKO_URL = 'https://api.coingecko.com/api/v3';

  // Symbol to CoinGecko ID mapping
  private readonly SYMBOL_MAP: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'BNB': 'binancecoin',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'DOT': 'polkadot',
  };

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
    logger.info('📈 TechnicalIndicatorsService initialized');
  }

  /**
   * Get technical analysis for a symbol
   */
  async getTechnicalAnalysis(symbol: string): Promise<TechnicalAnalysis> {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `ta_${normalizedSymbol}`;
    
    const cached = this.cache.get<TechnicalAnalysis>(cacheKey);
    if (cached) {
      logger.info(`📈 Returning cached technical analysis for ${normalizedSymbol}`);
      return cached;
    }

    try {
      logger.info(`📈 Calculating technical analysis for ${normalizedSymbol}`);

      // Fetch OHLC data from CoinGecko
      const ohlcData = await this.fetchOHLCData(normalizedSymbol);
      
      if (ohlcData.length < 20) {
        throw new Error('Insufficient price data for technical analysis');
      }

      // Extract closing prices
      const closes = ohlcData.map(candle => candle.close);
      const currentPrice = closes[closes.length - 1];

      // Calculate indicators
      const rsi = this.calculateRSI(closes, 14);
      const macd = this.calculateMACD(closes);
      const sma20 = this.calculateSMA(closes, 20);
      const sma50 = this.calculateSMA(closes, 50);
      const sma200 = this.calculateSMA(closes, Math.min(200, closes.length));

      // RSI Signal
      let rsiSignal: 'oversold' | 'neutral' | 'overbought' = 'neutral';
      let rsiDescription = '';
      if (rsi <= 30) {
        rsiSignal = 'oversold';
        rsiDescription = `RSI at ${rsi.toFixed(1)} indicates oversold conditions - potential bounce opportunity`;
      } else if (rsi >= 70) {
        rsiSignal = 'overbought';
        rsiDescription = `RSI at ${rsi.toFixed(1)} indicates overbought conditions - potential pullback risk`;
      } else {
        rsiDescription = `RSI at ${rsi.toFixed(1)} is in neutral territory`;
      }

      // MACD Signal
      const macdTrend = macd.histogram > 0 
        ? (macd.histogram > macd.signal * 0.1 ? 'bullish' : 'neutral')
        : (macd.histogram < -macd.signal * 0.1 ? 'bearish' : 'neutral');

      // Price vs SMAs
      const priceVsSMA20 = ((currentPrice - sma20) / sma20) * 100;
      const priceVsSMA50 = ((currentPrice - sma50) / sma50) * 100;
      const priceVsSMA200 = ((currentPrice - sma200) / sma200) * 100;

      // Golden/Death Cross
      const goldenCross = sma50 > sma200;
      const deathCross = sma50 < sma200;

      // Trend analysis
      const trend = this.analyzeTrend(closes, currentPrice, sma20, sma50, sma200);

      // Support/Resistance
      const levels = this.findSupportResistance(ohlcData);

      // Overall signal
      const { overallSignal, confidence } = this.calculateOverallSignal(
        rsiSignal, macdTrend, priceVsSMA20, priceVsSMA200, goldenCross
      );

      const result: TechnicalAnalysis = {
        symbol: normalizedSymbol,
        rsi14: Math.round(rsi * 10) / 10,
        rsiSignal,
        rsiDescription,
        macd: {
          value: Math.round(macd.macd * 100) / 100,
          signal: Math.round(macd.signal * 100) / 100,
          histogram: Math.round(macd.histogram * 100) / 100,
          trend: macdTrend as 'bullish' | 'bearish' | 'neutral',
        },
        movingAverages: {
          sma20: Math.round(sma20 * 100) / 100,
          sma50: Math.round(sma50 * 100) / 100,
          sma200: Math.round(sma200 * 100) / 100,
          currentPrice,
          priceVsSMA20: Math.round(priceVsSMA20 * 100) / 100,
          priceVsSMA50: Math.round(priceVsSMA50 * 100) / 100,
          priceVsSMA200: Math.round(priceVsSMA200 * 100) / 100,
          goldenCross,
          deathCross,
        },
        trend,
        levels,
        overallSignal,
        confidence,
        lastUpdated: new Date(),
      };

      this.cache.set(cacheKey, result);
      logger.info(`✅ Technical analysis for ${normalizedSymbol}: ${overallSignal} (${confidence}% confidence)`);
      
      return result;

    } catch (error) {
      logger.error(`❌ Technical analysis failed for ${normalizedSymbol}:`, error);
      return this.getFallbackAnalysis(normalizedSymbol);
    }
  }

  /**
   * Fetch OHLC data from CoinGecko
   */
  private async fetchOHLCData(symbol: string): Promise<Array<{ open: number; high: number; low: number; close: number; timestamp: number }>> {
    const coinId = this.SYMBOL_MAP[symbol] || symbol.toLowerCase();
    
    try {
      // Fetch 90 days of daily OHLC data
      const response = await axios.get(`${this.COINGECKO_URL}/coins/${coinId}/ohlc`, {
        params: {
          vs_currency: 'usd',
          days: 90,
        },
        timeout: 10000,
      });

      // CoinGecko OHLC format: [timestamp, open, high, low, close]
      return response.data.map((candle: number[]) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
      }));

    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('⚠️ CoinGecko rate limit hit for OHLC data');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return this.fetchOHLCData(symbol);
      }
      throw error;
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const recentChanges = changes.slice(-period);
    
    let gains = 0;
    let losses = 0;

    for (const change of recentChanges) {
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate MACD
   */
  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // For signal line, we'd need MACD history - simplified here
    const signal = macdLine * 0.9; // Approximation
    const histogram = macdLine - signal;

    return { macd: macdLine, signal, histogram };
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  /**
   * Analyze trend
   */
  private analyzeTrend(
    prices: number[], 
    currentPrice: number, 
    sma20: number, 
    sma50: number, 
    sma200: number
  ): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number; description: string } {
    let bullishPoints = 0;
    let bearishPoints = 0;

    // Price vs SMAs
    if (currentPrice > sma20) bullishPoints += 1;
    else bearishPoints += 1;

    if (currentPrice > sma50) bullishPoints += 1;
    else bearishPoints += 1;

    if (currentPrice > sma200) bullishPoints += 2; // More weight
    else bearishPoints += 2;

    // SMA alignment
    if (sma20 > sma50 && sma50 > sma200) bullishPoints += 2;
    else if (sma20 < sma50 && sma50 < sma200) bearishPoints += 2;

    // Recent momentum (last 7 candles)
    const recentPrices = prices.slice(-7);
    const recentChange = ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]) * 100;
    if (recentChange > 3) bullishPoints += 1;
    else if (recentChange < -3) bearishPoints += 1;

    const totalPoints = bullishPoints + bearishPoints;
    const strength = Math.round((Math.abs(bullishPoints - bearishPoints) / totalPoints) * 100);

    let direction: 'bullish' | 'bearish' | 'neutral';
    let description: string;

    if (bullishPoints > bearishPoints + 2) {
      direction = 'bullish';
      description = `Strong bullish trend. Price above key moving averages with positive momentum.`;
    } else if (bearishPoints > bullishPoints + 2) {
      direction = 'bearish';
      description = `Bearish trend. Price below key moving averages with negative momentum.`;
    } else {
      direction = 'neutral';
      description = `Mixed signals. Trend is consolidating or transitioning.`;
    }

    return { direction, strength, description };
  }

  /**
   * Find support and resistance levels
   */
  private findSupportResistance(ohlcData: Array<{ high: number; low: number; close: number }>): { support: number[]; resistance: number[] } {
    const recentData = ohlcData.slice(-30);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);
    const currentPrice = recentData[recentData.length - 1].close;

    // Find local minimums for support
    const support: number[] = [];
    for (let i = 2; i < lows.length - 2; i++) {
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && 
          lows[i] < lows[i+1] && lows[i] < lows[i+2] &&
          lows[i] < currentPrice) {
        support.push(Math.round(lows[i] * 100) / 100);
      }
    }

    // Find local maximums for resistance
    const resistance: number[] = [];
    for (let i = 2; i < highs.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && 
          highs[i] > highs[i+1] && highs[i] > highs[i+2] &&
          highs[i] > currentPrice) {
        resistance.push(Math.round(highs[i] * 100) / 100);
      }
    }

    // Sort and return top levels
    return {
      support: support.sort((a, b) => b - a).slice(0, 3),
      resistance: resistance.sort((a, b) => a - b).slice(0, 3),
    };
  }

  /**
   * Calculate overall trading signal
   */
  private calculateOverallSignal(
    rsiSignal: string,
    macdTrend: string,
    priceVsSMA20: number,
    priceVsSMA200: number,
    goldenCross: boolean
  ): { overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'; confidence: number } {
    let score = 0;

    // RSI
    if (rsiSignal === 'oversold') score += 2;
    else if (rsiSignal === 'overbought') score -= 2;

    // MACD
    if (macdTrend === 'bullish') score += 1;
    else if (macdTrend === 'bearish') score -= 1;

    // Price vs SMA20
    if (priceVsSMA20 > 5) score += 1;
    else if (priceVsSMA20 < -5) score -= 1;

    // Price vs SMA200
    if (priceVsSMA200 > 0) score += 1;
    else score -= 1;

    // Golden/Death Cross
    if (goldenCross) score += 1;
    else score -= 1;

    // Map score to signal
    let overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
    if (score >= 4) overallSignal = 'strong_buy';
    else if (score >= 2) overallSignal = 'buy';
    else if (score <= -4) overallSignal = 'strong_sell';
    else if (score <= -2) overallSignal = 'sell';
    else overallSignal = 'neutral';

    const confidence = Math.min(90, 50 + Math.abs(score) * 10);

    return { overallSignal, confidence };
  }

  /**
   * Fallback when analysis fails
   */
  private getFallbackAnalysis(symbol: string): TechnicalAnalysis {
    return {
      symbol,
      rsi14: 50,
      rsiSignal: 'neutral',
      rsiDescription: 'Technical data temporarily unavailable',
      macd: { value: 0, signal: 0, histogram: 0, trend: 'neutral' },
      movingAverages: {
        sma20: 0,
        sma50: 0,
        sma200: 0,
        currentPrice: 0,
        priceVsSMA20: 0,
        priceVsSMA50: 0,
        priceVsSMA200: 0,
        goldenCross: false,
        deathCross: false,
      },
      trend: { direction: 'neutral', strength: 0, description: 'Unable to determine trend' },
      levels: { support: [], resistance: [] },
      overallSignal: 'neutral',
      confidence: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
  }
}
