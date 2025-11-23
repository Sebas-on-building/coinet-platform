/**
 * Correlation Analysis Module
 * 
 * Provides tools for analyzing relationships between different assets and markets.
 * Supports various correlation methods, visual correlation matrices, and time-varying
 * correlation analysis to identify stable and changing relationships.
 */

export interface CorrelationData {
  symbols: string[];
  correlationMatrix: number[][];
  timeFrame: string;
  startDate?: Date;
  endDate?: Date;
}

export interface RollingCorrelationData {
  dates: Date[];
  correlations: { [pairKey: string]: number[] };
  symbols: string[];
}

/**
 * Calculate the Pearson correlation coefficient between two series
 * 
 * @param series1 - First price or return series
 * @param series2 - Second price or return series
 * @returns Correlation coefficient between -1 and 1
 */
export function calculateCorrelation(series1: number[], series2: number[]): number {
  if (series1.length !== series2.length || series1.length === 0) {
    throw new Error('Series must have the same length and not be empty');
  }

  // Calculate means
  const mean1 = series1.reduce((sum, val) => sum + val, 0) / series1.length;
  const mean2 = series2.reduce((sum, val) => sum + val, 0) / series2.length;

  // Calculate covariance and standard deviations
  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;

  for (let i = 0; i < series1.length; i++) {
    const diff1 = series1[i] - mean1;
    const diff2 = series2[i] - mean2;

    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }

  covariance /= series1.length;
  variance1 /= series1.length;
  variance2 /= series1.length;

  const stdDev1 = Math.sqrt(variance1);
  const stdDev2 = Math.sqrt(variance2);

  // Calculate Pearson correlation coefficient
  if (stdDev1 === 0 || stdDev2 === 0) {
    return 0; // No correlation if either series has no variation
  }

  return covariance / (stdDev1 * stdDev2);
}

/**
 * Calculate Spearman's rank correlation coefficient between two series
 * 
 * @param series1 - First data series
 * @param series2 - Second data series
 * @returns Spearman's rank correlation coefficient
 */
export function calculateSpearmanCorrelation(series1: number[], series2: number[]): number {
  if (series1.length !== series2.length || series1.length === 0) {
    throw new Error('Series must have the same length and not be empty');
  }

  // Convert to ranks
  const ranks1 = convertToRanks(series1);
  const ranks2 = convertToRanks(series2);

  // Calculate Pearson correlation of ranks
  return calculateCorrelation(ranks1, ranks2);
}

/**
 * Convert a series to ranks (1-based)
 */
function convertToRanks(series: number[]): number[] {
  // Create array of [value, index] pairs
  const indexed = series.map((value, index) => ({ value, index }));

  // Sort by value
  indexed.sort((a, b) => a.value - b.value);

  // Assign ranks, handling ties
  const ranks: number[] = new Array(series.length);
  let currentRank = 1;

  for (let i = 0; i < indexed.length; i++) {
    const currentIndex = indexed[i].index;

    // Check for ties
    let tieCount = 1;
    let tieSum = currentRank;

    while (i + 1 < indexed.length && indexed[i].value === indexed[i + 1].value) {
      i++;
      tieCount++;
      tieSum += currentRank + tieCount - 1;
    }

    // Assign average rank for ties
    const avgRank = tieSum / tieCount;
    for (let j = 0; j < tieCount; j++) {
      ranks[indexed[i - j].index] = avgRank;
    }

    currentRank += tieCount;
  }

  return ranks;
}

/**
 * Calculate correlation matrix for multiple assets
 * 
 * @param seriesData - Object mapping asset symbols to price/return series
 * @param method - Correlation method ('pearson' or 'spearman')
 * @returns Correlation matrix and symbols
 */
export function calculateCorrelationMatrix(
  seriesData: { [symbol: string]: number[] },
  method: 'pearson' | 'spearman' = 'pearson'
): CorrelationData {
  const symbols = Object.keys(seriesData);
  const n = symbols.length;

  // Initialize correlation matrix with zeros
  const correlationMatrix = Array(n).fill(0).map(() => Array(n).fill(0));

  // Calculate correlation for each pair
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const series1 = seriesData[symbols[i]];
      const series2 = seriesData[symbols[j]];

      // Calculate minimum length (might be different in case of missing data)
      const minLength = Math.min(series1.length, series2.length);
      const s1 = series1.slice(0, minLength);
      const s2 = series2.slice(0, minLength);

      // Calculate correlation based on selected method
      let correlation = 0;
      try {
        correlation = method === 'pearson'
          ? calculateCorrelation(s1, s2)
          : calculateSpearmanCorrelation(s1, s2);
      } catch (error) {
        console.warn(`Error calculating correlation between ${symbols[i]} and ${symbols[j]}:`, error);
      }

      // Set correlation in matrix (symmetric)
      correlationMatrix[i][j] = correlation;
      correlationMatrix[j][i] = correlation;
    }
  }

  return {
    symbols,
    correlationMatrix,
    timeFrame: 'custom', // This could be parameterized
  };
}

/**
 * Calculate rolling correlation between two series over time
 * 
 * @param series1 - First price or return series
 * @param series2 - Second price or return series
 * @param window - Rolling window size
 * @param dates - Corresponding dates for the series
 * @returns Array of [date, correlation] points
 */
export function calculateRollingCorrelation(
  series1: number[],
  series2: number[],
  window: number,
  dates: Date[]
): [Date, number][] {
  if (series1.length !== series2.length || series1.length !== dates.length) {
    throw new Error('All series must have the same length');
  }

  if (window >= series1.length) {
    throw new Error('Window size must be smaller than series length');
  }

  const result: [Date, number][] = [];

  for (let i = window - 1; i < series1.length; i++) {
    const s1Slice = series1.slice(i - window + 1, i + 1);
    const s2Slice = series2.slice(i - window + 1, i + 1);

    try {
      const correlation = calculateCorrelation(s1Slice, s2Slice);
      result.push([dates[i], correlation]);
    } catch (error) {
      console.warn(`Error calculating rolling correlation at index ${i}:`, error);
      result.push([dates[i], NaN]);
    }
  }

  return result;
}

/**
 * Calculate rolling correlations for multiple pairs
 * 
 * @param seriesData - Object mapping asset symbols to price/return series
 * @param window - Rolling window size
 * @param dates - Corresponding dates for the series
 * @returns Rolling correlation data for all pairs
 */
export function calculateMultipleRollingCorrelations(
  seriesData: { [symbol: string]: number[] },
  window: number,
  dates: Date[]
): RollingCorrelationData {
  const symbols = Object.keys(seriesData);
  const n = symbols.length;

  // Calculate rolling correlations for each pair
  const correlations: { [pairKey: string]: number[] } = {};

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const symbol1 = symbols[i];
      const symbol2 = symbols[j];
      const pairKey = `${symbol1}_${symbol2}`;

      const rolling = calculateRollingCorrelation(
        seriesData[symbol1],
        seriesData[symbol2],
        window,
        dates
      );

      // Extract just the correlation values
      correlations[pairKey] = rolling.map(point => point[1]);
    }
  }

  // Extract dates (will be the same for all pairs)
  const resultDates = dates.slice(window - 1);

  return {
    dates: resultDates,
    correlations,
    symbols
  };
}

/**
 * Calculate the average correlation of an asset with all others
 * 
 * @param correlationMatrix - Correlation matrix
 * @param symbolIndex - Index of the symbol to calculate average correlation for
 * @returns Average correlation value
 */
export function calculateAverageCorrelation(
  correlationMatrix: number[][],
  symbolIndex: number
): number {
  if (
    symbolIndex < 0 ||
    symbolIndex >= correlationMatrix.length ||
    correlationMatrix.length === 0
  ) {
    throw new Error('Invalid symbol index');
  }

  let sum = 0;
  let count = 0;

  for (let i = 0; i < correlationMatrix.length; i++) {
    if (i !== symbolIndex) {
      sum += correlationMatrix[symbolIndex][i];
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Find the most and least correlated pairs in a correlation matrix
 * 
 * @param correlationData - Correlation matrix and symbols
 * @param limit - Number of pairs to return
 * @returns Arrays of most and least correlated pairs
 */
export function findCorrelationExtremes(
  correlationData: CorrelationData,
  limit: number = 5
): {
  mostCorrelated: { pair: [string, string], correlation: number }[];
  leastCorrelated: { pair: [string, string], correlation: number }[];
} {
  const { symbols, correlationMatrix } = correlationData;
  const n = symbols.length;

  // Create array of all pairs and their correlations
  const pairs: { pair: [string, string], correlation: number }[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push({
        pair: [symbols[i], symbols[j]],
        correlation: correlationMatrix[i][j]
      });
    }
  }

  // Sort by correlation (absolute value to find strongest relationships)
  const byAbsoluteCorrelation = [...pairs].sort((a, b) =>
    Math.abs(b.correlation) - Math.abs(a.correlation)
  );

  // Sort by correlation (actual value to find positive/negative relationships)
  const byCorrelation = [...pairs].sort((a, b) =>
    b.correlation - a.correlation
  );

  return {
    mostCorrelated: byCorrelation.slice(0, limit),
    leastCorrelated: byCorrelation.slice(-limit).reverse()
  };
}

/**
 * Calculate returns from a price series
 * 
 * @param prices - Array of prices
 * @param method - 'simple' or 'log' returns
 * @returns Array of returns (length = prices.length - 1)
 */
export function calculateReturns(
  prices: number[],
  method: 'simple' | 'log' = 'simple'
): number[] {
  const returns: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] === 0) {
      returns.push(0); // Avoid division by zero
      continue;
    }

    if (method === 'simple') {
      returns.push(prices[i] / prices[i - 1] - 1);
    } else {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }

  return returns;
} 