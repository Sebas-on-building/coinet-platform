/**
 * Moving Average Convergence Divergence (MACD) indicator
 * 
 * MACD is a trend-following momentum indicator that shows the relationship
 * between two moving averages of a security's price.
 */

import { Series, IndicatorFunction } from './types';
import { calculateEMA } from './ema';

/**
 * Calculate MACD (Moving Average Convergence Divergence) for a series of numbers.
 * 
 * @param values - Array of input values (typically closing prices)
 * @param fastPeriod - Period for the fast EMA line (default: 12)
 * @param slowPeriod - Period for the slow EMA line (default: 26)
 * @param signalPeriod - Period for the signal line EMA (default: 9)
 * @returns Object containing macdLine, signalLine, and histogram arrays
 */
export function calculateMACD(
  values: Series,
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: (number | null)[],
  signalLine: (number | null)[],
  histogram: (number | null)[]
} {
  if (!values.length) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  // Ensure periods are integers
  fastPeriod = Math.floor(fastPeriod);
  slowPeriod = Math.floor(slowPeriod);
  signalPeriod = Math.floor(signalPeriod);

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(values, fastPeriod);
  const slowEMA = calculateEMA(values, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macdLine.push(null);
    } else {
      macdLine.push(fastEMA[i]! - slowEMA[i]!);
    }
  }

  // Calculate signal line (EMA of MACD line)
  // First, filter out null values for EMA calculation
  const validMacdValues: number[] = macdLine.filter((value): value is number => value !== null);

  // Then calculate EMA on valid values
  const rawSignalLine = calculateEMA(validMacdValues, signalPeriod);

  // Align signal line with MACD line (padding with nulls at the beginning)
  const signalLine: (number | null)[] = Array(macdLine.length - rawSignalLine.length).fill(null).concat(rawSignalLine);

  // Calculate histogram (MACD line - signal line)
  const histogram: (number | null)[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null || signalLine[i] === null) {
      histogram.push(null);
    } else {
      histogram.push(macdLine[i]! - signalLine[i]!);
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * MACD Indicator definition with metadata
 */
export const MACD: IndicatorFunction = {
  name: 'Moving Average Convergence Divergence',
  calculate: (series: Series, options: {
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
  }) => calculateMACD(
    series,
    options.fastPeriod || 12,
    options.slowPeriod || 26,
    options.signalPeriod || 9
  ),
  defaultOptions: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9
  },
  description: 'Moving Average Convergence Divergence (MACD) is a trend-following momentum indicator that shows the relationship between two moving averages of a security\'s price. The MACD is calculated by subtracting the 26-period EMA from the 12-period EMA. The result of that calculation is the MACD line. A 9-day EMA of the MACD called the "signal line," is then plotted on top of the MACD line, which can function as a trigger for buy and sell signals.',
  category: 'momentum',
  overlayOnPrice: false,
  references: [
    {
      name: 'Investopedia',
      url: 'https://www.investopedia.com/terms/m/macd.asp'
    }
  ]
}; 