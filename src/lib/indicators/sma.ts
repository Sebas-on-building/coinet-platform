/**
 * Simple Moving Average (SMA) indicator
 * 
 * Calculates the arithmetic mean of a given set of values over a specified period.
 * SMA is one of the most basic and widely used technical indicators.
 */

import { Series, IndicatorFunction } from './types';

/**
 * Calculate Simple Moving Average (SMA) for a series of numbers.
 * 
 * @param values - Array of input values (typically closing prices)
 * @param period - Window size for the moving average (number of periods to average)
 * @returns Array of SMA values; the first (period-1) values will be null
 */
export function calculateSMA(values: Series, period: number): (number | null)[] {
  if (!values.length || period <= 0 || !Number.isFinite(period)) {
    return [];
  }

  // Ensure period is an integer
  period = Math.floor(period);

  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    // Add current value to sum
    sum += values[i];

    if (i < period - 1) {
      // Not enough data yet for a complete window
      result.push(null);
    } else {
      if (i >= period) {
        // Remove the oldest value from the sum when window slides
        sum -= values[i - period];
      }

      // Calculate average for current window
      result.push(sum / period);
    }
  }

  return result;
}

/**
 * SMA Indicator definition with metadata
 */
export const SMA: IndicatorFunction = {
  name: 'Simple Moving Average',
  calculate: (series: Series, options: { period: number }) =>
    calculateSMA(series, options.period || 20),
  defaultOptions: {
    period: 20
  },
  description: 'Simple Moving Average (SMA) calculates the arithmetic mean of a given set of prices over a specified number of periods. It smooths price data to form a trend-following indicator.',
  category: 'trend',
  overlayOnPrice: true,
  references: [
    {
      name: 'Investopedia',
      url: 'https://www.investopedia.com/terms/s/sma.asp'
    }
  ]
}; 