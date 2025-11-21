/**
 * Ichimoku Cloud Technical Indicator
 *
 * The Ichimoku Cloud is a comprehensive technical indicator that defines support and
 * resistance, identifies trend direction, gauges momentum, and provides trading signals.
 * It consists of five lines: Tenkan-sen (Conversion Line), Kijun-sen (Base Line),
 * Senkou Span A (Leading Span A), Senkou Span B (Leading Span B), and Chikou Span (Lagging Span).
 */

import { Series } from './types';

interface IchimokuResult {
  tenkanSen: (number | null)[]; // Conversion Line
  kijunSen: (number | null)[]; // Base Line
  senkouSpanA: (number | null)[]; // Leading Span A (part of the cloud)
  senkouSpanB: (number | null)[]; // Leading Span B (part of the cloud)
  chikouSpan: (number | null)[]; // Lagging Span
}

/**
 * Calculate Ichimoku Cloud components
 * 
 * @param high - High prices array
 * @param low - Low prices array
 * @param close - Close prices array
 * @param tenkanPeriod - Period for Tenkan-sen (default: 9)
 * @param kijunPeriod - Period for Kijun-sen (default: 26)
 * @param senkouBPeriod - Period for Senkou Span B (default: 52)
 * @param displacement - Displacement period for cloud (default: 26)
 * @returns Object containing all Ichimoku components
 */
export function calculateIchimoku(
  high: Series,
  low: Series,
  close: Series,
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52,
  displacement: number = 26
): IchimokuResult {
  const length = high.length;

  // Initialize result arrays with nulls
  const tenkanSen: (number | null)[] = Array(length).fill(null);
  const kijunSen: (number | null)[] = Array(length).fill(null);
  const senkouSpanA: (number | null)[] = Array(length).fill(null);
  const senkouSpanB: (number | null)[] = Array(length).fill(null);
  const chikouSpan: (number | null)[] = Array(length).fill(null);

  // Calculate Tenkan-sen (Conversion Line): (highest high + lowest low) / 2 for the past tenkanPeriod
  for (let i = tenkanPeriod - 1; i < length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - tenkanPeriod + 1; j <= i; j++) {
      if (high[j] > highestHigh) highestHigh = high[j];
      if (low[j] < lowestLow) lowestLow = low[j];
    }

    tenkanSen[i] = (highestHigh + lowestLow) / 2;
  }

  // Calculate Kijun-sen (Base Line): (highest high + lowest low) / 2 for the past kijunPeriod
  for (let i = kijunPeriod - 1; i < length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - kijunPeriod + 1; j <= i; j++) {
      if (high[j] > highestHigh) highestHigh = high[j];
      if (low[j] < lowestLow) lowestLow = low[j];
    }

    kijunSen[i] = (highestHigh + lowestLow) / 2;
  }

  // Calculate Senkou Span A (Leading Span A): (Tenkan-sen + Kijun-sen) / 2, shifted forward by displacement
  for (let i = 0; i < length; i++) {
    if (i >= kijunPeriod - 1) {
      const spanA = (tenkanSen[i]! + kijunSen[i]!) / 2;

      // Apply displacement (shift forward)
      if (i + displacement < length) {
        senkouSpanA[i + displacement] = spanA;
      }
    }
  }

  // Calculate Senkou Span B (Leading Span B): (highest high + lowest low) / 2 for the past senkouBPeriod, shifted forward by displacement
  for (let i = senkouBPeriod - 1; i < length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - senkouBPeriod + 1; j <= i; j++) {
      if (high[j] > highestHigh) highestHigh = high[j];
      if (low[j] < lowestLow) lowestLow = low[j];
    }

    const spanB = (highestHigh + lowestLow) / 2;

    // Apply displacement (shift forward)
    if (i + displacement < length) {
      senkouSpanB[i + displacement] = spanB;
    }
  }

  // Calculate Chikou Span (Lagging Span): Current closing price shifted backwards by displacement periods
  for (let i = displacement; i < length; i++) {
    chikouSpan[i - displacement] = close[i];
  }

  return {
    tenkanSen,
    kijunSen,
    senkouSpanA,
    senkouSpanB,
    chikouSpan
  };
}

/**
 * Determine if the Ichimoku cloud is bullish or bearish at a given index
 * 
 * @param ichimoku - Ichimoku calculation result
 * @param index - Index to check cloud direction
 * @returns 1 for bullish (green cloud), -1 for bearish (red cloud), 0 for neutral/undefined
 */
export function getCloudDirection(ichimoku: IchimokuResult, index: number): number {
  const { senkouSpanA, senkouSpanB } = ichimoku;

  if (senkouSpanA[index] === null || senkouSpanB[index] === null) {
    return 0; // Neutral/undefined
  }

  return senkouSpanA[index]! > senkouSpanB[index]! ? 1 : -1;
}

/**
 * Check for Ichimoku cloud trend confirmation signals
 * 
 * @param close - Close prices array
 * @param ichimoku - Ichimoku calculation result
 * @param index - Index to check for signals
 * @returns Object with boolean signal properties
 */
export function getIchimokuSignals(
  close: Series,
  ichimoku: IchimokuResult,
  index: number
): {
  bullishTKCross: boolean;
  bearishTKCross: boolean;
  priceAboveCloud: boolean;
  priceBelowCloud: boolean;
  bullishConfirmation: boolean;
  bearishConfirmation: boolean;
} {
  const { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan } = ichimoku;

  if (
    index < 1 ||
    tenkanSen[index] === null ||
    tenkanSen[index - 1] === null ||
    kijunSen[index] === null ||
    kijunSen[index - 1] === null ||
    senkouSpanA[index] === null ||
    senkouSpanB[index] === null ||
    close[index] === null
  ) {
    return {
      bullishTKCross: false,
      bearishTKCross: false,
      priceAboveCloud: false,
      priceBelowCloud: false,
      bullishConfirmation: false,
      bearishConfirmation: false
    };
  }

  // Tenkan/Kijun (TK) Crosses
  const bullishTKCross = tenkanSen[index - 1]! <= kijunSen[index - 1]! && tenkanSen[index]! > kijunSen[index]!;
  const bearishTKCross = tenkanSen[index - 1]! >= kijunSen[index - 1]! && tenkanSen[index]! < kijunSen[index]!;

  // Price position relative to the cloud
  const upperCloud = Math.max(senkouSpanA[index]!, senkouSpanB[index]!);
  const lowerCloud = Math.min(senkouSpanA[index]!, senkouSpanB[index]!);
  const priceAboveCloud = close[index]! > upperCloud;
  const priceBelowCloud = close[index]! < lowerCloud;

  // Cloud direction
  const cloudDirection = getCloudDirection(ichimoku, index);

  // Comprehensive signals (combining multiple components)
  const bullishConfirmation =
    priceAboveCloud &&
    cloudDirection > 0 &&
    (bullishTKCross || tenkanSen[index]! > kijunSen[index]!);

  const bearishConfirmation =
    priceBelowCloud &&
    cloudDirection < 0 &&
    (bearishTKCross || tenkanSen[index]! < kijunSen[index]!);

  return {
    bullishTKCross,
    bearishTKCross,
    priceAboveCloud,
    priceBelowCloud,
    bullishConfirmation,
    bearishConfirmation
  };
} 