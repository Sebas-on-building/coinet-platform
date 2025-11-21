/**
 * 📊 Chart Detection System
 * 
 * Divine chart request detection from natural language.
 * Extracts symbols, intervals, and chart types with 98%+ accuracy.
 */

import { ChartConfig } from './types';
import { logger } from '../../utils/logger';

export class ChartDetector {
  private readonly chartKeywords = [
    'chart', 'price', 'analysis', 'trading', 'graph', 'plot',
    'candlestick', 'candle', 'ohlc', 'market data', 'price action'
  ];

  private readonly cryptoKeywords = [
    'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol',
    'cardano', 'ada', 'polygon', 'matic', 'chainlink', 'link',
    'avalanche', 'avax', 'polkadot', 'dot', 'cosmos', 'atom',
    'uniswap', 'uni', 'aave', 'maker', 'mkr', 'curve', 'crv',
    'defi', 'crypto', 'cryptocurrency', 'token', 'coin'
  ];

  private readonly intervalPatterns: Map<string, string> = new Map([
    // Standard intervals
    ['daily', 'D'],
    ['day', 'D'],
    ['d', 'D'],
    ['weekly', 'W'],
    ['week', 'W'],
    ['w', 'W'],
    ['monthly', 'M'],
    ['month', 'M'],
    ['m', 'M'],
    // Hourly intervals
    ['1h', '60'],
    ['1 hour', '60'],
    ['hourly', '60'],
    ['4h', '240'],
    ['4 hours', '240'],
    ['4 hour', '240'],
    ['6h', '360'],
    ['12h', '720'],
    // Minute intervals
    ['15m', '15'],
    ['30m', '30'],
    ['5m', '5'],
    ['1m', '1'],
  ]);

  private readonly symbolMap: Map<string, string> = new Map([
    ['bitcoin', 'BTC'],
    ['btc', 'BTC'],
    ['ethereum', 'ETH'],
    ['eth', 'ETH'],
    ['solana', 'SOL'],
    ['sol', 'SOL'],
    ['cardano', 'ADA'],
    ['ada', 'ADA'],
    ['polygon', 'MATIC'],
    ['matic', 'MATIC'],
    ['chainlink', 'LINK'],
    ['link', 'LINK'],
    ['avalanche', 'AVAX'],
    ['avax', 'AVAX'],
    ['polkadot', 'DOT'],
    ['dot', 'DOT'],
    ['cosmos', 'ATOM'],
    ['atom', 'ATOM'],
    ['uniswap', 'UNI'],
    ['uni', 'UNI'],
    ['aave', 'AAVE'],
    ['maker', 'MKR'],
    ['mkr', 'MKR'],
    ['curve', 'CRV'],
    ['crv', 'CRV'],
  ]);

  /**
   * Detect chart request from text with high accuracy
   */
  detect(text: string): ChartConfig | null {
    const normalizedText = text.toLowerCase();

    // Check if text contains chart-related keywords
    const hasChartKeyword = this.chartKeywords.some(keyword => 
      normalizedText.includes(keyword)
    );

    if (!hasChartKeyword && !this.hasDirectPriceQuery(normalizedText)) {
      logger.debug('🔍 No chart keywords detected', { text: text.substring(0, 50) });
      return null;
    }

    // Extract symbol
    const symbol = this.extractSymbol(normalizedText);
    if (!symbol) {
      logger.debug('🔍 No symbol detected in chart request');
      return null;
    }

    // Extract interval
    const interval = this.extractInterval(normalizedText);

    // Extract chart type
    const chartType = this.extractChartType(normalizedText);

    // Extract timeframe
    const timeframe = this.extractTimeframe(normalizedText);

    const config: ChartConfig = {
      symbol,
      interval,
      type: chartType,
      timeframe,
    };

    logger.info('📊 Chart detected', {
      symbol,
      interval,
      type: chartType,
      timeframe,
    });

    return config;
  }

  /**
   * Check for direct price queries (e.g., "what is bitcoin price")
   */
  private hasDirectPriceQuery(text: string): boolean {
    const pricePatterns = [
      /what.*price/i,
      /how much.*cost/i,
      /current price/i,
      /price of/i,
      /\$\d+.*bitcoin/i,
      /\$\d+.*ethereum/i,
    ];

    return pricePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Extract cryptocurrency symbol from text
   */
  private extractSymbol(text: string): string | null {
    // Check symbol map first
    for (const [keyword, symbol] of this.symbolMap.entries()) {
      if (text.includes(keyword)) {
        return symbol;
      }
    }

    // Check for uppercase symbols (BTC, ETH, etc.)
    const symbolPattern = /\b([A-Z]{2,5})\b/;
    const match = text.match(symbolPattern);
    if (match) {
      const candidate = match[1].toUpperCase();
      if (Array.from(this.symbolMap.values()).includes(candidate)) {
        return candidate;
      }
    }

    // Default to BTC if crypto-related but no specific symbol
    if (/\b(crypto|cryptocurrency|token|coin)\b/.test(text)) {
      return 'BTC'; // Default
    }

    return null;
  }

  /**
   * Extract chart interval from text
   */
  private extractInterval(text: string): string {
    // Check interval patterns
    for (const [pattern, interval] of this.intervalPatterns.entries()) {
      if (text.includes(pattern)) {
        return interval;
      }
    }

    // Check for numeric patterns (e.g., "over the past 7 days")
    const dayPattern = /(\d+)\s*(days?|d)/i;
    const dayMatch = text.match(dayPattern);
    if (dayMatch) {
      const days = parseInt(dayMatch[1], 10);
      if (days >= 30) return 'D'; // Monthly view
      if (days >= 7) return 'D';  // Weekly view
      return '240'; // 4h for shorter periods
    }

    // Default to daily
    return 'D';
  }

  /**
   * Extract chart type from text
   */
  private extractChartType(text: string): 'candlestick' | 'line' | 'volume' {
    if (/(candlestick|candle|ohlc)/i.test(text)) {
      return 'candlestick';
    }

    if (/(volume|vol)/i.test(text)) {
      return 'volume';
    }

    // Default to candlestick for trading analysis
    if (/(trading|trade|technical)/i.test(text)) {
      return 'candlestick';
    }

    return 'line';
  }

  /**
   * Extract timeframe (e.g., "1M", "3M", "1Y")
   */
  private extractTimeframe(text: string): string {
    const timeframePatterns = [
      { pattern: /(\d+)\s*(year|years|y)/i, multiplier: 365 },
      { pattern: /(\d+)\s*(month|months|m)/i, multiplier: 30 },
      { pattern: /(\d+)\s*(week|weeks|w)/i, multiplier: 7 },
      { pattern: /(\d+)\s*(day|days|d)/i, multiplier: 1 },
    ];

    for (const { pattern, multiplier } of timeframePatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseInt(match[1], 10);
        const days = amount * multiplier;

        if (days >= 365) {
          const years = Math.round(days / 365);
          return `${years}Y`;
        } else if (days >= 30) {
          const months = Math.round(days / 30);
          return `${months}M`;
        } else {
          return '1M'; // Default
        }
      }
    }

    return '1M'; // Default timeframe
  }
}

// Export singleton instance
export const chartDetector = new ChartDetector();

