/**
 * Technical Indicators Library
 * 
 * This module exports all available technical indicators and utility functions
 * for working with price data and indicators.
 */

import { Candle, Series, IndicatorFunction, IndicatorConfig } from './types';
import { SMA, calculateSMA } from './sma';
import { EMA, calculateEMA } from './ema';
import { MACD, calculateMACD } from './macd';
import { RSI, calculateRSI } from './rsi';
import { BollingerBands, calculateBollingerBands } from './bollinger';

// Export all individual indicator functions
export {
  calculateSMA,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateBollingerBands
};

// Export types
export * from './types';

/**
 * Registry of all available indicators
 */
export const Indicators: Record<string, IndicatorFunction> = {
  SMA,
  EMA,
  MACD,
  RSI,
  BollingerBands,
};

/**
 * Generate a unique ID for a new indicator instance
 */
export function generateIndicatorId(name: string): string {
  return `${name.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new indicator configuration with default settings
 */
export function createIndicatorConfig(name: string): IndicatorConfig | null {
  const indicator = Indicators[name];

  if (!indicator) {
    return null;
  }

  // Set up default visuals based on indicator type
  const defaultVisuals: Record<string, any> = {};

  // Different defaults for different indicator types
  switch (name) {
    case 'SMA':
      defaultVisuals.line = {
        color: '#3B82F6', // blue-500
        lineWidth: 1.5,
        lineStyle: 'solid'
      };
      break;
    case 'EMA':
      defaultVisuals.line = {
        color: '#EC4899', // pink-500
        lineWidth: 1.5,
        lineStyle: 'solid'
      };
      break;
    case 'MACD':
      defaultVisuals.macdLine = {
        color: '#3B82F6', // blue-500
        lineWidth: 1.5,
        lineStyle: 'solid'
      };
      defaultVisuals.signalLine = {
        color: '#F59E0B', // amber-500
        lineWidth: 1.5,
        lineStyle: 'solid'
      };
      defaultVisuals.histogram = {
        color: '#10B981', // emerald-500
        type: 'column',
        opacity: 0.8
      };
      break;
    case 'RSI':
      defaultVisuals.line = {
        color: '#8B5CF6', // violet-500
        lineWidth: 1.5,
        lineStyle: 'solid'
      };
      break;
    case 'BollingerBands':
      defaultVisuals.upper = {
        color: '#6366F1', // indigo-500
        lineWidth: 1,
        lineStyle: 'dashed',
        opacity: 0.8
      };
      defaultVisuals.middle = {
        color: '#6B7280', // gray-500
        lineWidth: 1,
        lineStyle: 'solid'
      };
      defaultVisuals.lower = {
        color: '#6366F1', // indigo-500
        lineWidth: 1,
        lineStyle: 'dashed',
        opacity: 0.8
      };
      break;
    default:
      defaultVisuals.line = {
        color: '#6B7280', // gray-500
        lineWidth: 1.5,
        lineStyle: 'solid'
      };
  }

  return {
    id: generateIndicatorId(name),
    name,
    isActive: true,
    options: { ...indicator.defaultOptions },
    visuals: defaultVisuals,
    position: indicator.overlayOnPrice ? 'main' : 'below'
  };
}

/**
 * Extract a specific data series from OHLCV candles
 * @param candles Array of price candles
 * @param series The series to extract (close, open, high, low, volume)
 */
export function extractSeries(
  candles: Candle[],
  series: 'close' | 'open' | 'high' | 'low' | 'volume' = 'close'
): number[] {
  return candles.map(candle => {
    if (series === 'volume' && typeof candle.volume === 'undefined') {
      return 0;
    }
    return candle[series] as number;
  });
}

/**
 * Calculate an indicator based on candle data
 * @param candles Array of price candles
 * @param indicator The indicator configuration
 * @param inputSeries Which price series to use (default: 'close')
 */
export function calculateIndicator(
  candles: Candle[],
  indicator: IndicatorConfig,
  inputSeries: 'close' | 'open' | 'high' | 'low' | 'volume' = 'close'
): any {
  const indicatorFn = Indicators[indicator.name];

  if (!indicatorFn || !candles.length) {
    return null;
  }

  // Extract relevant data series
  const series = extractSeries(candles, inputSeries);

  // Calculate the indicator
  return indicatorFn.calculate(series, indicator.options);
}

/**
 * Get all available indicators in a category
 */
export function getIndicatorsByCategory(category?: string): IndicatorFunction[] {
  return Object.values(Indicators).filter(indicator =>
    !category || indicator.category === category
  );
} 