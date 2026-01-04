/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 SCORE DISTRIBUTION ANALYZER                                            ║
 * ║                                                                               ║
 * ║   8.1 Score Distribution Sanity                                              ║
 * ║   - Verifies score distribution is stable (no compression/inflation)         ║
 * ║   - Ensures majors don't randomly become "weak"                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { OmniScoreSnapshot } from '../pipeline';
import type {
  DistributionStats,
  ScoreDistribution,
  DistributionHealth,
  DistributionHealthCheck,
  HealthStatus,
} from './types';
import { CALIBRATION_THRESHOLDS } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate mean of an array
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate median of an array
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[], sampleMean?: number): number {
  if (values.length < 2) return 0;
  const m = sampleMean ?? mean(values);
  const squaredDiffs = values.map(v => (v - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

/**
 * Calculate percentile
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper >= sorted.length) return sorted[sorted.length - 1];
  if (lower === upper) return sorted[lower];
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate skewness (measure of asymmetry)
 */
function skewness(values: number[]): number {
  if (values.length < 3) return 0;
  const m = mean(values);
  const s = stdDev(values, m);
  if (s === 0) return 0;
  
  const n = values.length;
  const sumCubed = values.reduce((sum, v) => sum + ((v - m) / s) ** 3, 0);
  
  return (n / ((n - 1) * (n - 2))) * sumCubed;
}

/**
 * Calculate kurtosis (measure of "tailedness")
 */
function kurtosis(values: number[]): number {
  if (values.length < 4) return 0;
  const m = mean(values);
  const s = stdDev(values, m);
  if (s === 0) return 0;
  
  const n = values.length;
  const sumFourth = values.reduce((sum, v) => sum + ((v - m) / s) ** 4, 0);
  
  // Excess kurtosis (normal distribution = 0)
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sumFourth -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate distribution stats for an array of values
 */
export function calculateDistributionStats(values: number[]): DistributionStats {
  if (values.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      percentiles: { p5: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 },
      skewness: 0,
      kurtosis: 0,
    };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const m = mean(values);
  
  return {
    count: values.length,
    mean: m,
    median: median(values),
    stdDev: stdDev(values, m),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    percentiles: {
      p5: percentile(values, 5),
      p10: percentile(values, 10),
      p25: percentile(values, 25),
      p50: percentile(values, 50),
      p75: percentile(values, 75),
      p90: percentile(values, 90),
      p95: percentile(values, 95),
    },
    skewness: skewness(values),
    kurtosis: kurtosis(values),
  };
}

/**
 * Analyze score distribution from a set of snapshots
 */
export function analyzeScoreDistribution(
  snapshots: OmniScoreSnapshot[]
): ScoreDistribution {
  // Extract scores
  const posValues = snapshots
    .filter(s => s.posFinal !== null)
    .map(s => s.posFinal!);
  
  const qsValues = snapshots.map(s => s.qs);
  
  const osValues = snapshots
    .filter(s => s.os !== null)
    .map(s => s.os!);
  
  const riskValues = snapshots.map(s => s.risk);
  const confidenceValues = snapshots.map(s => s.confidence);
  const coverageQsValues = snapshots.map(s => s.coverageQS);
  const coverageOsValues = snapshots.map(s => s.coverageOS);
  
  // Count statuses
  const gatedCount = snapshots.filter(s => s.status === 'gated').length;
  const partialCount = snapshots.filter(s => s.status === 'partial').length;
  
  // Count legitimacy labels
  const legitimacyCounts: Record<string, number> = {};
  for (const s of snapshots) {
    legitimacyCounts[s.legitimacy] = (legitimacyCounts[s.legitimacy] ?? 0) + 1;
  }
  
  return {
    timestamp: new Date(),
    universeSize: snapshots.length,
    
    pos: calculateDistributionStats(posValues),
    qs: calculateDistributionStats(qsValues),
    os: calculateDistributionStats(osValues),
    risk: calculateDistributionStats(riskValues),
    confidence: calculateDistributionStats(confidenceValues),
    
    coverageQs: calculateDistributionStats(coverageQsValues),
    coverageOs: calculateDistributionStats(coverageOsValues),
    
    gatedCount,
    gatedPercent: snapshots.length > 0 ? (gatedCount / snapshots.length) * 100 : 0,
    partialCount,
    partialPercent: snapshots.length > 0 ? (partialCount / snapshots.length) * 100 : 0,
    
    legitimacyCounts,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION HEALTH CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check distribution health
 */
export function checkDistributionHealth(
  distribution: ScoreDistribution
): DistributionHealth {
  const checks: DistributionHealthCheck[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];
  
  const thresholds = CALIBRATION_THRESHOLDS.distribution;
  
  // Check 1: POS mean range
  const posMean = distribution.pos.mean;
  const meanCheck: DistributionHealthCheck = {
    metric: 'POS Mean',
    expected: `${thresholds.posMeanRange.min}-${thresholds.posMeanRange.max}`,
    actual: posMean.toFixed(1),
    status: 'healthy',
    message: '',
  };
  
  if (posMean < thresholds.posMeanRange.min) {
    meanCheck.status = 'critical';
    meanCheck.message = `POS mean ${posMean.toFixed(1)} is below expected minimum ${thresholds.posMeanRange.min}`;
    criticalIssues.push(meanCheck.message);
  } else if (posMean > thresholds.posMeanRange.max) {
    meanCheck.status = 'critical';
    meanCheck.message = `POS mean ${posMean.toFixed(1)} is above expected maximum ${thresholds.posMeanRange.max}`;
    criticalIssues.push(meanCheck.message);
  } else {
    meanCheck.message = 'POS mean is within expected range';
  }
  checks.push(meanCheck);
  
  // Check 2: POS standard deviation
  const posStdDev = distribution.pos.stdDev;
  const stdDevCheck: DistributionHealthCheck = {
    metric: 'POS StdDev',
    expected: `${thresholds.posStdDevRange.min}-${thresholds.posStdDevRange.max}`,
    actual: posStdDev.toFixed(1),
    status: 'healthy',
    message: '',
  };
  
  if (posStdDev < thresholds.posStdDevRange.min) {
    stdDevCheck.status = 'warning';
    stdDevCheck.message = `Score compression detected: stdDev ${posStdDev.toFixed(1)} below ${thresholds.posStdDevRange.min}`;
    warnings.push(stdDevCheck.message);
  } else if (posStdDev > thresholds.posStdDevRange.max) {
    stdDevCheck.status = 'warning';
    stdDevCheck.message = `Score inflation detected: stdDev ${posStdDev.toFixed(1)} above ${thresholds.posStdDevRange.max}`;
    warnings.push(stdDevCheck.message);
  } else {
    stdDevCheck.message = 'Score spread is healthy';
  }
  checks.push(stdDevCheck);
  
  // Check 3: Skewness
  const posSkewness = distribution.pos.skewness;
  const skewnessCheck: DistributionHealthCheck = {
    metric: 'POS Skewness',
    expected: `|skew| < ${thresholds.maxSkewness}`,
    actual: posSkewness.toFixed(2),
    status: 'healthy',
    message: '',
  };
  
  if (Math.abs(posSkewness) > thresholds.maxSkewness) {
    skewnessCheck.status = 'warning';
    skewnessCheck.message = `Distribution is highly skewed (${posSkewness.toFixed(2)})`;
    warnings.push(skewnessCheck.message);
  } else {
    skewnessCheck.message = 'Distribution symmetry is acceptable';
  }
  checks.push(skewnessCheck);
  
  // Check 4: Gated percentage
  const gatedPercent = distribution.gatedPercent;
  const gatedCheck: DistributionHealthCheck = {
    metric: 'Gated %',
    expected: `< ${thresholds.maxGatedPercent}%`,
    actual: `${gatedPercent.toFixed(1)}%`,
    status: 'healthy',
    message: '',
  };
  
  if (gatedPercent > thresholds.maxGatedPercent) {
    gatedCheck.status = 'critical';
    gatedCheck.message = `Too many gated scores: ${gatedPercent.toFixed(1)}% exceeds ${thresholds.maxGatedPercent}%`;
    criticalIssues.push(gatedCheck.message);
  } else if (gatedPercent > thresholds.maxGatedPercent * 0.7) {
    gatedCheck.status = 'warning';
    gatedCheck.message = `Gated percentage approaching threshold: ${gatedPercent.toFixed(1)}%`;
    warnings.push(gatedCheck.message);
  } else {
    gatedCheck.message = 'Gated percentage is acceptable';
  }
  checks.push(gatedCheck);
  
  // Check 5: Elite tier sanity
  const eliteCount = distribution.pos.count > 0
    ? (distribution.pos.percentiles.p95 > 85 ? Math.floor(distribution.pos.count * 0.05) : 0)
    : 0;
  const elitePercent = distribution.pos.count > 0
    ? (eliteCount / distribution.pos.count) * 100
    : 0;
  
  // Actually count scores above elite threshold (90)
  // We can't do this directly from distribution, so we use p95 as proxy
  const approximateElitePercent = distribution.pos.percentiles.p95 >= 90 ? 5 : 
    (distribution.pos.percentiles.p90 >= 90 ? 10 : 0);
  
  const eliteCheck: DistributionHealthCheck = {
    metric: 'Elite Tier %',
    expected: `${thresholds.minElitePercent}-${thresholds.maxElitePercent}%`,
    actual: `~${approximateElitePercent}%`,
    status: 'healthy',
    message: '',
  };
  
  if (distribution.pos.percentiles.p95 < 80) {
    eliteCheck.status = 'warning';
    eliteCheck.message = 'No clear elite tier differentiation (P95 < 80)';
    warnings.push(eliteCheck.message);
  } else {
    eliteCheck.message = 'Elite tier differentiation is healthy';
  }
  checks.push(eliteCheck);
  
  // Check 6: Score floor (check if too many low scores)
  const lowScorePercent = distribution.pos.percentiles.p10;
  const floorCheck: DistributionHealthCheck = {
    metric: 'Score Floor (P10)',
    expected: '> 20',
    actual: lowScorePercent.toFixed(1),
    status: 'healthy',
    message: '',
  };
  
  if (lowScorePercent < 15) {
    floorCheck.status = 'warning';
    floorCheck.message = `Low score floor: P10 = ${lowScorePercent.toFixed(1)} suggests many poor scores`;
    warnings.push(floorCheck.message);
  } else {
    floorCheck.message = 'Score floor is healthy';
  }
  checks.push(floorCheck);
  
  // Check 7: Coverage health
  const avgCoverageQs = distribution.coverageQs.mean;
  const coverageCheck: DistributionHealthCheck = {
    metric: 'Avg QS Coverage',
    expected: '> 50%',
    actual: `${(avgCoverageQs * 100).toFixed(1)}%`,
    status: 'healthy',
    message: '',
  };
  
  if (avgCoverageQs < 0.3) {
    coverageCheck.status = 'critical';
    coverageCheck.message = `Data coverage critically low: ${(avgCoverageQs * 100).toFixed(1)}%`;
    criticalIssues.push(coverageCheck.message);
  } else if (avgCoverageQs < 0.5) {
    coverageCheck.status = 'warning';
    coverageCheck.message = `Data coverage below target: ${(avgCoverageQs * 100).toFixed(1)}%`;
    warnings.push(coverageCheck.message);
  } else {
    coverageCheck.message = 'Data coverage is healthy';
  }
  checks.push(coverageCheck);
  
  // Determine overall status
  let overall: HealthStatus = 'healthy';
  if (criticalIssues.length > 0) {
    overall = 'critical';
  } else if (warnings.length > 0) {
    overall = 'warning';
  }
  
  return {
    overall,
    checks,
    warnings,
    criticalIssues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

export interface DistributionDelta {
  metric: string;
  previous: number;
  current: number;
  delta: number;
  percentChange: number;
  isSignificant: boolean;
}

/**
 * Compare two distributions to detect drift
 */
export function compareDistributions(
  previous: ScoreDistribution,
  current: ScoreDistribution
): DistributionDelta[] {
  const deltas: DistributionDelta[] = [];
  const significanceThreshold = 0.05; // 5% change is significant
  
  const comparisons: Array<[string, number, number]> = [
    ['POS Mean', previous.pos.mean, current.pos.mean],
    ['POS StdDev', previous.pos.stdDev, current.pos.stdDev],
    ['POS Median', previous.pos.median, current.pos.median],
    ['QS Mean', previous.qs.mean, current.qs.mean],
    ['OS Mean', previous.os.mean, current.os.mean],
    ['Risk Mean', previous.risk.mean, current.risk.mean],
    ['Gated %', previous.gatedPercent, current.gatedPercent],
    ['Coverage QS', previous.coverageQs.mean, current.coverageQs.mean],
  ];
  
  for (const [metric, prev, curr] of comparisons) {
    const delta = curr - prev;
    const percentChange = prev !== 0 ? (delta / prev) * 100 : (curr !== 0 ? 100 : 0);
    
    deltas.push({
      metric,
      previous: prev,
      current: curr,
      delta,
      percentChange,
      isSignificant: Math.abs(percentChange) > significanceThreshold * 100,
    });
  }
  
  return deltas;
}
