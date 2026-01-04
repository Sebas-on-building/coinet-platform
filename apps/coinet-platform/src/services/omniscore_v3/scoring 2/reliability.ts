/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 RELIABILITY WEIGHTING                                                  ║
 * ║                                                                               ║
 * ║   Each feature gets:                                                          ║
 * ║     - baseWeight (fixed)                                                      ║
 * ║     - reliability (0-1) from freshness + availability + trust + anomalies    ║
 * ║     - effectiveWeight = baseWeight × reliability                             ║
 * ║                                                                               ║
 * ║   Missing feature reduces CONFIDENCE, not SCORE                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureResult } from '../features/types';
import type { DataPoint } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReliabilityFactors {
  /** How fresh is the data? (0-1, 1 = perfectly fresh) */
  freshness: number;
  /** How much data is available? (0-1, 1 = all data present) */
  availability: number;
  /** How trusted are the sources? (0-1, 1 = fully trusted) */
  providerTrust: number;
  /** Are there anomalies? (0-1, 1 = no anomalies) */
  anomalyScore: number;
}

export interface ReliabilityResult {
  /** Overall reliability (0-1) */
  reliability: number;
  /** Individual factors */
  factors: ReliabilityFactors;
  /** Effective weight = baseWeight × reliability */
  effectiveWeight: number;
  /** Original base weight */
  baseWeight: number;
  /** Warnings about reliability issues */
  warnings: string[];
}

export interface ReliabilityConfig {
  /** Weight for freshness in overall reliability */
  freshnessWeight: number;
  /** Weight for availability in overall reliability */
  availabilityWeight: number;
  /** Weight for provider trust in overall reliability */
  trustWeight: number;
  /** Weight for anomaly score in overall reliability */
  anomalyWeight: number;
  /** Max age in hours before freshness starts degrading */
  maxFreshHours: number;
  /** Age in hours where freshness = 0 */
  staleCutoffHours: number;
  /** Minimum reliability to include feature */
  minReliability: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_RELIABILITY_CONFIG: ReliabilityConfig = {
  freshnessWeight: 0.30,
  availabilityWeight: 0.35,
  trustWeight: 0.25,
  anomalyWeight: 0.10,
  maxFreshHours: 1,
  staleCutoffHours: 48,
  minReliability: 0.3,
};

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate freshness score based on data age
 * 
 * @param ageHours Age of data in hours
 * @param maxFresh Max age for perfect freshness (default: 1 hour)
 * @param staleCutoff Age where freshness = 0 (default: 48 hours)
 * @returns Freshness score (0-1)
 */
export function calculateFreshness(
  ageHours: number,
  maxFresh: number = 1,
  staleCutoff: number = 48
): number {
  if (ageHours <= maxFresh) return 1;
  if (ageHours >= staleCutoff) return 0;
  
  // Linear decay between maxFresh and staleCutoff
  const range = staleCutoff - maxFresh;
  const decay = (ageHours - maxFresh) / range;
  return Math.max(0, 1 - decay);
}

/**
 * Calculate freshness from multiple data points
 */
export function calculateAggregateFreshness(
  dataPoints: DataPoint[],
  config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG
): number {
  const validPoints = dataPoints.filter(dp => dp.raw !== null);
  if (validPoints.length === 0) return 0;
  
  let totalFreshness = 0;
  for (const dp of validPoints) {
    const ageHours = dp.freshnessSeconds / 3600;
    totalFreshness += calculateFreshness(
      ageHours,
      config.maxFreshHours,
      config.staleCutoffHours
    );
  }
  
  return totalFreshness / validPoints.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABILITY CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate availability score based on present vs expected data points
 */
export function calculateAvailability(
  presentCount: number,
  expectedCount: number
): number {
  if (expectedCount === 0) return 0;
  return Math.min(1, presentCount / expectedCount);
}

/**
 * Calculate availability from feature result
 */
export function calculateFeatureAvailability(result: FeatureResult): number {
  const total = result.inputs.length + result.missing.length;
  if (total === 0) return 0;
  return result.inputs.length / total;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER TRUST CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Provider trust scores (same as in data fetcher)
 */
export const PROVIDER_TRUST_SCORES: Record<string, number> = {
  coingecko: 0.90,
  defillama: 0.92,
  github: 0.95,
  blockchain_rpc: 0.98,
  tokenterminal: 0.88,
  messari: 0.85,
  glassnode: 0.90,
  nansen: 0.88,
  santiment: 0.80,
  unknown: 0.50,
};

/**
 * Calculate aggregate provider trust from data points
 */
export function calculateProviderTrust(dataPoints: DataPoint[]): number {
  const validPoints = dataPoints.filter(dp => dp.raw !== null);
  if (validPoints.length === 0) return 0;
  
  let totalTrust = 0;
  for (const dp of validPoints) {
    totalTrust += dp.confidenceSource;
  }
  
  return totalTrust / validPoints.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnomalyCheck {
  type: 'outlier' | 'disagreement' | 'pattern' | 'spike';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Check for outliers using robust Z-score
 */
export function checkForOutlier(
  value: number,
  historicalValues: number[],
  threshold: number = 3
): AnomalyCheck | null {
  if (historicalValues.length < 5) return null;
  
  const sorted = [...historicalValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = historicalValues.map(v => Math.abs(v - median));
  const medianDeviation = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
  
  if (medianDeviation === 0) return null;
  
  const zScore = Math.abs(value - median) / (1.4826 * medianDeviation);
  
  if (zScore > threshold * 2) {
    return {
      type: 'outlier',
      severity: 'high',
      description: `Value ${value.toFixed(2)} is extreme outlier (z=${zScore.toFixed(2)})`,
    };
  }
  if (zScore > threshold) {
    return {
      type: 'outlier',
      severity: 'medium',
      description: `Value ${value.toFixed(2)} is outlier (z=${zScore.toFixed(2)})`,
    };
  }
  
  return null;
}

/**
 * Check for disagreement between sources
 */
export function checkForDisagreement(
  values: { source: string; value: number }[],
  threshold: number = 0.10
): AnomalyCheck | null {
  if (values.length < 2) return null;
  
  const nums = values.map(v => v.value);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const maxDiff = Math.max(...nums.map(v => Math.abs(v - mean) / mean));
  
  if (maxDiff > threshold * 2) {
    return {
      type: 'disagreement',
      severity: 'high',
      description: `Sources disagree by ${(maxDiff * 100).toFixed(1)}%`,
    };
  }
  if (maxDiff > threshold) {
    return {
      type: 'disagreement',
      severity: 'medium',
      description: `Sources disagree by ${(maxDiff * 100).toFixed(1)}%`,
    };
  }
  
  return null;
}

/**
 * Calculate anomaly score (1 = no anomalies, 0 = severe anomalies)
 */
export function calculateAnomalyScore(anomalies: AnomalyCheck[]): number {
  if (anomalies.length === 0) return 1;
  
  let penalty = 0;
  for (const a of anomalies) {
    switch (a.severity) {
      case 'high': penalty += 0.4; break;
      case 'medium': penalty += 0.2; break;
      case 'low': penalty += 0.1; break;
    }
  }
  
  return Math.max(0, 1 - penalty);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELIABILITY CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate overall reliability for a feature
 */
export function calculateReliability(
  factors: ReliabilityFactors,
  config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG
): number {
  // Weighted combination of factors
  const reliability = 
    factors.freshness * config.freshnessWeight +
    factors.availability * config.availabilityWeight +
    factors.providerTrust * config.trustWeight +
    factors.anomalyScore * config.anomalyWeight;
  
  return Math.max(0, Math.min(1, reliability));
}

/**
 * Calculate effective weight for a feature
 */
export function calculateEffectiveWeight(
  baseWeight: number,
  reliability: number
): number {
  return baseWeight * reliability;
}

/**
 * Full reliability calculation for a feature result
 */
export function calculateFeatureReliability(
  result: FeatureResult,
  dataPoints: DataPoint[],
  anomalies: AnomalyCheck[] = [],
  config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG
): ReliabilityResult {
  const warnings: string[] = [];
  
  // Calculate individual factors
  const freshness = result.quality.freshnessHours !== Infinity
    ? calculateFreshness(
        result.quality.freshnessHours,
        config.maxFreshHours,
        config.staleCutoffHours
      )
    : 0;
  
  const availability = result.quality.coverage;
  const providerTrust = result.quality.confidence;
  const anomalyScore = calculateAnomalyScore(anomalies);
  
  const factors: ReliabilityFactors = {
    freshness,
    availability,
    providerTrust,
    anomalyScore,
  };
  
  // Generate warnings
  if (freshness < 0.5) {
    warnings.push(`Low freshness: data is ${result.quality.freshnessHours.toFixed(1)} hours old`);
  }
  if (availability < 0.5) {
    warnings.push(`Low availability: only ${(availability * 100).toFixed(0)}% of data present`);
  }
  if (providerTrust < 0.7) {
    warnings.push('Low source reliability');
  }
  if (anomalyScore < 0.8) {
    warnings.push('Anomalies detected in data');
  }
  
  // Calculate overall reliability
  const reliability = calculateReliability(factors, config);
  
  // Calculate effective weight
  const effectiveWeight = calculateEffectiveWeight(result.weight, reliability);
  
  return {
    reliability,
    factors,
    effectiveWeight,
    baseWeight: result.weight,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH RELIABILITY
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeatureWithReliability {
  result: FeatureResult;
  reliability: ReliabilityResult;
}

/**
 * Calculate reliability for multiple features
 */
export function calculateBatchReliability(
  results: FeatureResult[],
  dataPoints: DataPoint[],
  config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG
): FeatureWithReliability[] {
  return results.map(result => ({
    result,
    reliability: calculateFeatureReliability(result, dataPoints, [], config),
  }));
}

/**
 * Filter features that meet minimum reliability threshold
 */
export function filterByReliability(
  features: FeatureWithReliability[],
  minReliability: number = DEFAULT_RELIABILITY_CONFIG.minReliability
): FeatureWithReliability[] {
  return features.filter(f => f.reliability.reliability >= minReliability);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoverageResult {
  /** Total base weight of available features */
  weightedCoverage: number;
  /** Simple ratio of available/total features */
  simpleCoverage: number;
  /** Number of features available */
  availableCount: number;
  /** Total number of features */
  totalCount: number;
  /** Features that are missing or below reliability threshold */
  missingFeatures: string[];
}

/**
 * Calculate coverage for a set of features
 */
export function calculateCoverage(
  features: FeatureWithReliability[],
  allFeatureIds: string[],
  minReliability: number = DEFAULT_RELIABILITY_CONFIG.minReliability
): CoverageResult {
  const available = features.filter(
    f => f.result.available && 
         f.result.normalized !== null &&
         f.reliability.reliability >= minReliability
  );
  
  const availableIds = new Set(available.map(f => f.result.id));
  const missingFeatures = allFeatureIds.filter(id => !availableIds.has(id));
  
  // Weighted coverage: sum of effective weights / sum of base weights
  const totalBaseWeight = features.reduce((sum, f) => sum + f.reliability.baseWeight, 0);
  const availableEffectiveWeight = available.reduce(
    (sum, f) => sum + f.reliability.effectiveWeight,
    0
  );
  
  const weightedCoverage = totalBaseWeight > 0 
    ? availableEffectiveWeight / totalBaseWeight 
    : 0;
  
  return {
    weightedCoverage,
    simpleCoverage: features.length > 0 ? available.length / features.length : 0,
    availableCount: available.length,
    totalCount: features.length,
    missingFeatures,
  };
}
