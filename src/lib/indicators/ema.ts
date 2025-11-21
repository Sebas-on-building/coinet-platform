/**
 * Exponential Moving Average (EMA) indicator
 * 
 * A type of moving average that places a greater weight and significance
 * on the most recent data points.
 */

import { Series, IndicatorFunction } from './types';
import { calculateSMA } from './sma';

/**
 * Calculate Exponential Moving Average (EMA) for a series of numbers.
 * 
 * @param values - Array of input values (typically closing prices)
 * @param period - Period for EMA calculation
 * @returns Array of EMA values (first period-1 values will be null)
 */
export function calculateEMA(values: Series, period: number): (number | null)[] {
  if (!values.length || period <= 0 || !Number.isFinite(period)) {
    return [];
  }

  // Ensure period is an integer
  period = Math.floor(period);

  const result: (number | null)[] = [];

  // Calculate the multiplier (smoothing factor)
  const multiplier = 2 / (period + 1);

  // Initialize EMA with SMA for first period points
  let ema: number | null = null;

  // First (period-1) values will be null
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }

  // Calculate first EMA value using SMA of first 'period' values
  if (values.length >= period) {
    // Calculate SMA for first 'period' values
    const sma = values.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    result.push(sma);
    ema = sma;

    // Calculate remaining EMA values
    for (let i = period; i < values.length; i++) {
      // EMA = Current price × multiplier + Previous EMA × (1 − multiplier)
      ema = values[i] * multiplier + ema! * (1 - multiplier);
      result.push(ema);
    }
  }

  return result;
}

/**
 * EMA Indicator definition with metadata
 */
export const EMA: IndicatorFunction = {
  name: 'Exponential Moving Average',
  calculate: (series: Series, options: { period: number }) =>
    calculateEMA(series, options.period || 12),
  defaultOptions: {
    period: 12
  },
  description: 'Exponential Moving Average (EMA) is a type of moving average that places a greater weight and significance on the most recent data points. It reacts more significantly to recent price changes than a Simple Moving Average.',
  category: 'trend',
  overlayOnPrice: true,
  references: [
    {
      name: 'Investopedia',
      url: 'https://www.investopedia.com/terms/e/ema.asp'
    }
  ]
}; 