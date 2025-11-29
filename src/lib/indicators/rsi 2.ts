/**
 * Relative Strength Index (RSI) indicator
 * 
 * RSI measures the magnitude of recent price changes to evaluate
 * overbought or oversold conditions in the price of an asset.
 */

import { Series, IndicatorFunction } from './types';

/**
 * Calculate Relative Strength Index (RSI) for a series of numbers.
 * 
 * @param values - Array of input values (typically closing prices)
 * @param period - Period for RSI calculation (default: 14)
 * @returns Array of RSI values (0-100), with initial values as null
 */
export function calculateRSI(values: Series, period: number = 14): (number | null)[] {
  if (!values.length || period <= 0 || !Number.isFinite(period)) {
    return [];
  }

  // Ensure period is an integer
  period = Math.floor(period);

  const result: (number | null)[] = [];

  // First we need to calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1]);
  }

  // Calculate initial average gain and loss
  let sumGain = 0;
  let sumLoss = 0;

  // Use the first 'period' changes to calculate initial averages
  for (let i = 0; i < period; i++) {
    if (i < changes.length) {
      if (changes[i] > 0) {
        sumGain += changes[i];
      } else if (changes[i] < 0) {
        sumLoss += Math.abs(changes[i]);
      }
    }
  }

  // First (period) values will be null
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  // Initialize average gain and loss
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;

  // Calculate first RSI value
  if (avgLoss === 0) {
    result.push(100); // Prevent division by zero
  } else {
    const RS = avgGain / avgLoss;
    result.push(100 - (100 / (1 + RS)));
  }

  // Calculate remaining RSI values using smoothed averages
  for (let i = period; i < changes.length; i++) {
    // Update average gain and loss using smoothing method
    const change = changes[i];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    // Smoothed Averages: [(previous avg * (period-1)) + current value] / period
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

    // Calculate RSI
    if (avgLoss === 0) {
      result.push(100); // Prevent division by zero
    } else {
      const RS = avgGain / avgLoss;
      result.push(100 - (100 / (1 + RS)));
    }
  }

  return result;
}

/**
 * RSI Indicator definition with metadata
 */
export const RSI: IndicatorFunction = {
  name: 'Relative Strength Index',
  calculate: (series: Series, options: {
    period?: number;
  }) => calculateRSI(series, options.period || 14),
  defaultOptions: {
    period: 14
  },
  description: 'Relative Strength Index (RSI) is a momentum oscillator that measures the speed and change of price movements. It oscillates between zero and 100 and is typically used to identify overbought or oversold conditions in a market. Traditionally, RSI values of 70 or above suggest overbought conditions, while RSI values of 30 or below suggest oversold conditions.',
  category: 'momentum',
  overlayOnPrice: false,
  references: [
    {
      name: 'Investopedia',
      url: 'https://www.investopedia.com/terms/r/rsi.asp'
    }
  ]
}; 