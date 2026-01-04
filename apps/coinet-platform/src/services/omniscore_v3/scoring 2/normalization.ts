/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 NORMALIZATION                                                          ║
 * ║                                                                               ║
 * ║   Cross-sectional robust percentiles, winsorization, 0-100 conversion        ║
 * ║   Eliminates "everything becomes 43" compression issues                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizationConfig {
  /** Winsorization lower percentile (default: 1) */
  winsorLower: number;
  /** Winsorization upper percentile (default: 99) */
  winsorUpper: number;
  /** Minimum value for the universe (used when universe too small) */
  fallbackMin: number;
  /** Maximum value for the universe (used when universe too small) */
  fallbackMax: number;
  /** Minimum universe size for robust percentiles */
  minUniverseSize: number;
}

export interface NormalizationResult {
  /** Original raw value */
  raw: number;
  /** Winsorized value */
  winsorized: number;
  /** Percentile rank (0-100) */
  percentile: number;
  /** Final normalized score (0-100) */
  normalized: number;
  /** Method used */
  method: 'percentile' | 'linear' | 'fallback';
  /** Universe size used */
  universeSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_NORMALIZATION_CONFIG: NormalizationConfig = {
  winsorLower: 1,
  winsorUpper: 99,
  fallbackMin: 0,
  fallbackMax: 100,
  minUniverseSize: 10,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate percentile value from sorted array
 * @param sorted Sorted array (ascending)
 * @param p Percentile (0-100)
 */
export function percentileValue(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper >= sorted.length) return sorted[sorted.length - 1];
  if (lower < 0) return sorted[0];
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate percentile rank of a value within a distribution
 * @param value The value to rank
 * @param sorted Sorted array (ascending)
 * @returns Percentile rank (0-100)
 */
export function percentileRank(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  if (sorted.length === 1) return value >= sorted[0] ? 100 : 0;
  
  let countBelow = 0;
  let countEqual = 0;
  
  for (const v of sorted) {
    if (v < value) countBelow++;
    else if (v === value) countEqual++;
  }
  
  // Average rank for ties
  const rank = countBelow + countEqual / 2;
  return (rank / sorted.length) * 100;
}

/**
 * Calculate median of an array
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate Median Absolute Deviation (MAD)
 * Robust measure of spread
 */
export function mad(values: number[]): number {
  if (values.length === 0) return 0;
  const med = median(values);
  const deviations = values.map(v => Math.abs(v - med));
  return median(deviations);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WINSORIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Winsorize a value based on percentile bounds from a universe
 */
export function winsorize(
  value: number,
  universe: number[],
  lowerP: number = 1,
  upperP: number = 99
): { value: number; clipped: 'none' | 'lower' | 'upper' } {
  if (universe.length === 0) {
    return { value, clipped: 'none' };
  }
  
  const sorted = [...universe].sort((a, b) => a - b);
  const lowerBound = percentileValue(sorted, lowerP);
  const upperBound = percentileValue(sorted, upperP);
  
  if (value < lowerBound) {
    return { value: lowerBound, clipped: 'lower' };
  }
  if (value > upperBound) {
    return { value: upperBound, clipped: 'upper' };
  }
  
  return { value, clipped: 'none' };
}

/**
 * Winsorize an entire array
 */
export function winsorizeArray(
  values: number[],
  lowerP: number = 1,
  upperP: number = 99
): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const lowerBound = percentileValue(sorted, lowerP);
  const upperBound = percentileValue(sorted, upperP);
  
  return values.map(v => Math.max(lowerBound, Math.min(upperBound, v)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize using cross-sectional percentile rank
 * 
 * 1. Winsorize extremes (p1/p99)
 * 2. Compute percentile rank within universe
 * 3. Convert to 0-100
 */
export function normalizePercentile(
  value: number,
  universe: number[],
  config: NormalizationConfig = DEFAULT_NORMALIZATION_CONFIG
): NormalizationResult {
  // Handle edge cases
  if (universe.length === 0) {
    return {
      raw: value,
      winsorized: value,
      percentile: 50,
      normalized: Math.max(0, Math.min(100, value)),
      method: 'fallback',
      universeSize: 0,
    };
  }
  
  // Sort universe
  const sorted = [...universe].sort((a, b) => a - b);
  
  // Winsorize
  const { value: winsorized, clipped } = winsorize(
    value, 
    sorted, 
    config.winsorLower, 
    config.winsorUpper
  );
  
  // Check universe size
  if (universe.length < config.minUniverseSize) {
    // Use linear normalization with fallback bounds
    const min = Math.min(config.fallbackMin, sorted[0]);
    const max = Math.max(config.fallbackMax, sorted[sorted.length - 1]);
    const range = max - min;
    const normalized = range > 0 
      ? ((winsorized - min) / range) * 100 
      : 50;
    
    return {
      raw: value,
      winsorized,
      percentile: normalized,
      normalized: Math.max(0, Math.min(100, normalized)),
      method: 'linear',
      universeSize: universe.length,
    };
  }
  
  // Compute percentile rank
  const pRank = percentileRank(winsorized, sorted);
  
  return {
    raw: value,
    winsorized,
    percentile: pRank,
    normalized: Math.max(0, Math.min(100, pRank)),
    method: 'percentile',
    universeSize: universe.length,
  };
}

/**
 * Normalize using robust Z-score (MAD-based)
 * Converts to 0-100 using sigmoid
 */
export function normalizeRobustZ(
  value: number,
  universe: number[],
  scale: number = 1.4826 // Constant for normal distribution
): NormalizationResult {
  if (universe.length === 0) {
    return {
      raw: value,
      winsorized: value,
      percentile: 50,
      normalized: 50,
      method: 'fallback',
      universeSize: 0,
    };
  }
  
  const med = median(universe);
  const madValue = mad(universe);
  
  // Avoid division by zero
  const adjustedMad = madValue > 0 ? madValue : 1;
  
  // Robust Z-score
  const z = (value - med) / (scale * adjustedMad);
  
  // Convert to 0-100 using sigmoid
  const sigmoid = 1 / (1 + Math.exp(-z));
  const normalized = sigmoid * 100;
  
  return {
    raw: value,
    winsorized: value,
    percentile: normalized,
    normalized: Math.max(0, Math.min(100, normalized)),
    method: 'percentile',
    universeSize: universe.length,
  };
}

/**
 * Linear normalization with min/max bounds
 */
export function normalizeLinear(
  value: number,
  min: number,
  max: number,
  invert: boolean = false
): number {
  if (max === min) return 50;
  
  const normalized = ((value - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  
  return invert ? 100 - clamped : clamped;
}

/**
 * Logarithmic normalization
 */
export function normalizeLog(
  value: number,
  min: number,
  max: number,
  invert: boolean = false
): number {
  if (value <= 0 || min <= 0 || max <= min) {
    return invert ? 100 : 0;
  }
  
  const logValue = Math.log10(value);
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  
  if (logMax === logMin) return 50;
  
  const normalized = ((logValue - logMin) / (logMax - logMin)) * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  
  return invert ? 100 - clamped : clamped;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reference universe for normalization
 * In production, this would be loaded from a database of top N assets
 */
export interface UniverseConfig {
  featureId: string;
  values: number[];
  lastUpdated: Date;
  assetCount: number;
}

/**
 * Create a mock universe for a feature (placeholder for actual data)
 */
export function createDefaultUniverse(
  featureId: string,
  sampleValues: number[]
): UniverseConfig {
  return {
    featureId,
    values: sampleValues,
    lastUpdated: new Date(),
    assetCount: sampleValues.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BatchNormalizationInput {
  featureId: string;
  raw: number;
  universe?: number[];
}

export interface BatchNormalizationOutput {
  featureId: string;
  result: NormalizationResult;
}

/**
 * Normalize multiple features at once
 */
export function normalizeBatch(
  inputs: BatchNormalizationInput[],
  config: NormalizationConfig = DEFAULT_NORMALIZATION_CONFIG
): BatchNormalizationOutput[] {
  return inputs.map(input => ({
    featureId: input.featureId,
    result: normalizePercentile(
      input.raw,
      input.universe ?? [],
      config
    ),
  }));
}
