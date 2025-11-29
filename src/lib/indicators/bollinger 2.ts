/**
 * Bollinger Bands indicator
 * 
 * Bollinger Bands consist of a middle band (simple moving average) with
 * upper and lower bands based on standard deviation of prices.
 */

import { Series, IndicatorFunction } from './types';
import { calculateSMA } from './sma';

/**
 * Calculate standard deviation for a set of values
 */
function calculateStdDev(values: number[], mean: number): number {
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate Bollinger Bands for a series of numbers.
 * 
 * @param values - Array of input values (typically closing prices)
 * @param period - Period for the SMA and standard deviation (default: 20)
 * @param multiplier - Standard deviation multiplier (default: 2)
 * @returns Object containing upper, middle (SMA), and lower band arrays
 */
export function calculateBollingerBands(
  values: Series,
  period: number = 20,
  multiplier: number = 2
): {
  upper: (number | null)[],
  middle: (number | null)[],
  lower: (number | null)[]
} {
  if (!values.length || period <= 0 || !Number.isFinite(period)) {
    return { upper: [], middle: [], lower: [] };
  }

  // Ensure period is an integer
  period = Math.floor(period);

  // Calculate the middle band (SMA)
  const middle = calculateSMA(values, period);

  // Initialize upper and lower bands
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  // Calculate bands for each point
  for (let i = 0; i < values.length; i++) {
    if (middle[i] === null) {
      // Not enough data yet
      upper.push(null);
      lower.push(null);
    } else {
      // Calculate standard deviation for this window
      const windowStart = Math.max(0, i - period + 1);
      const window = values.slice(windowStart, i + 1);
      const stdDev = calculateStdDev(window, middle[i]!);

      // Calculate bands
      const deviation = multiplier * stdDev;
      upper.push(middle[i]! + deviation);
      lower.push(middle[i]! - deviation);
    }
  }

  return { upper, middle, lower };
}

/**
 * Bollinger Bands Indicator definition with metadata
 */
export const BollingerBands: IndicatorFunction = {
  name: 'Bollinger Bands',
  calculate: (series: Series, options: {
    period?: number;
    multiplier?: number;
  }) => calculateBollingerBands(
    series,
    options.period || 20,
    options.multiplier || 2
  ),
  defaultOptions: {
    period: 20,
    multiplier: 2
  },
  description: 'Bollinger Bands are a volatility indicator composed of three lines: a simple moving average (middle band) and an upper and lower band. These bands expand and contract based on the volatility of prices. By default, the bands are set 2 standard deviations above and below the middle band. Prices reaching the upper band may suggest the asset is overbought, while prices at the lower band may indicate oversold conditions.',
  category: 'volatility',
  overlayOnPrice: true,
  references: [
    {
      name: 'Investopedia',
      url: 'https://www.investopedia.com/terms/b/bollingerbands.asp'
    }
  ]
}; 