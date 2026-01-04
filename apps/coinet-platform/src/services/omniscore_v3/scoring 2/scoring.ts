/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 SCORING ENGINE                                                         ║
 * ║                                                                               ║
 * ║   Fixed weights + reliability-weighted aggregation                           ║
 * ║                                                                               ║
 * ║   posRaw = 0.60*QS + 0.25*OS + 0.15*(100 - Risk)                            ║
 * ║                                                                               ║
 * ║   When OS is gated:                                                          ║
 * ║   posRaw = 0.80*QS + 0.20*(100 - Risk)                                       ║
 * ║                                                                               ║
 * ║   NO regime modulation                                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureResult } from '../features/types';
import { POS_WEIGHTS, POS_WEIGHTS_OS_GATED, getFeatureWeight } from './weights';
import {
  calculateFeatureReliability,
  calculateCoverage,
  type FeatureWithReliability,
  type CoverageResult,
  type ReliabilityConfig,
  DEFAULT_RELIABILITY_CONFIG,
} from './reliability';
import type { DataPoint } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CategoryScoreResult {
  /** Weighted score (0-100) */
  score: number;
  /** Raw unweighted average */
  rawAverage: number;
  /** Coverage information */
  coverage: CoverageResult;
  /** Sum of effective weights (after reliability adjustment) */
  totalEffectiveWeight: number;
  /** Sum of base weights */
  totalBaseWeight: number;
  /** Feature-level results with reliability */
  features: FeatureWithReliability[];
  /** Top contributors to this score */
  topDrivers: {
    featureId: string;
    name: string;
    contribution: number;
    reliability: number;
  }[];
}

export interface POSCalculation {
  /** Quality Score (0-100) */
  qs: number;
  /** Opportunity Score (0-100 or null if gated) */
  os: number | null;
  /** Risk Score (0-100) */
  risk: number;
  /** Safety Score = 100 - Risk */
  safety: number;
  /** Raw POS before smoothing */
  posRaw: number;
  /** Formula used */
  formula: string;
  /** Component contributions */
  contributions: {
    qs: number;
    os: number;
    safety: number;
  };
}

export interface ScoringResult {
  /** Quality Score result */
  qsResult: CategoryScoreResult;
  /** Opportunity Score result */
  osResult: CategoryScoreResult;
  /** Risk Score result */
  riskResult: CategoryScoreResult;
  /** POS calculation */
  pos: POSCalculation;
  /** Is OS gated? */
  osGated: boolean;
  /** Reason for OS gating */
  osGateReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE BOUNDS
// ═══════════════════════════════════════════════════════════════════════════════

export const SCORE_BOUNDS = {
  MIN: 0,
  MAX: 100,
} as const;

/**
 * Clamp a score to valid bounds
 */
export function clampScore(score: number): number {
  return Math.max(SCORE_BOUNDS.MIN, Math.min(SCORE_BOUNDS.MAX, score));
}

/**
 * Round score to specified precision
 */
export function roundScore(score: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(score * factor) / factor;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate weighted score for a category (QS, OS, or Risk)
 * 
 * Uses reliability-weighted aggregation:
 * - Each feature has baseWeight and reliability
 * - effectiveWeight = baseWeight × reliability
 * - score = Σ(feature.normalized × effectiveWeight) / Σ(effectiveWeight)
 * 
 * Missing features reduce CONFIDENCE, not SCORE
 */
export function calculateCategoryScore(
  results: FeatureResult[],
  dataPoints: DataPoint[],
  categoryFeatureIds: string[],
  config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG
): CategoryScoreResult {
  // Calculate reliability for each feature
  const featuresWithReliability: FeatureWithReliability[] = results.map(result => {
    // Override weight with fixed weight
    const fixedWeight = getFeatureWeight(result.id);
    const resultWithFixedWeight = { ...result, weight: fixedWeight };
    
    return {
      result: resultWithFixedWeight,
      reliability: calculateFeatureReliability(
        resultWithFixedWeight,
        dataPoints,
        [],
        config
      ),
    };
  });
  
  // Calculate coverage
  const coverage = calculateCoverage(
    featuresWithReliability,
    categoryFeatureIds,
    config.minReliability
  );
  
  // Filter to available features with sufficient reliability
  const availableFeatures = featuresWithReliability.filter(
    f => f.result.available && 
         f.result.normalized !== null &&
         f.reliability.reliability >= config.minReliability
  );
  
  // Calculate weighted score
  let weightedSum = 0;
  let totalEffectiveWeight = 0;
  let rawSum = 0;
  
  for (const f of availableFeatures) {
    const effectiveWeight = f.reliability.effectiveWeight;
    weightedSum += f.result.normalized! * effectiveWeight;
    totalEffectiveWeight += effectiveWeight;
    rawSum += f.result.normalized!;
  }
  
  // Total base weight for all features in category
  const totalBaseWeight = featuresWithReliability.reduce(
    (sum, f) => sum + f.reliability.baseWeight,
    0
  );
  
  // Calculate score (renormalized for missing features)
  const score = totalEffectiveWeight > 0 
    ? weightedSum / totalEffectiveWeight 
    : 0;
  
  const rawAverage = availableFeatures.length > 0 
    ? rawSum / availableFeatures.length 
    : 0;
  
  // Get top drivers
  const topDrivers = availableFeatures
    .filter(f => f.result.contribution !== null)
    .sort((a, b) => {
      const aContrib = Math.abs(a.result.contribution ?? 0);
      const bContrib = Math.abs(b.result.contribution ?? 0);
      return bContrib - aContrib;
    })
    .slice(0, 5)
    .map(f => ({
      featureId: f.result.id,
      name: f.result.name,
      contribution: f.result.normalized! * f.reliability.effectiveWeight / (totalEffectiveWeight || 1),
      reliability: f.reliability.reliability,
    }));
  
  return {
    score: roundScore(clampScore(score)),
    rawAverage: roundScore(rawAverage),
    coverage,
    totalEffectiveWeight,
    totalBaseWeight,
    features: featuresWithReliability,
    topDrivers,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Project OmniScore
 * 
 * Full formula:
 * posRaw = 0.60*QS + 0.25*OS + 0.15*(100 - Risk)
 * 
 * When OS is gated (missing opportunity data):
 * posRaw = 0.80*QS + 0.20*(100 - Risk)
 */
export function calculatePOS(
  qs: number,
  os: number | null,
  risk: number
): POSCalculation {
  const safety = 100 - risk;
  
  let posRaw: number;
  let formula: string;
  let contributions: { qs: number; os: number; safety: number };
  
  if (os !== null) {
    // Full formula: 0.60*QS + 0.25*OS + 0.15*Safety
    posRaw = 
      POS_WEIGHTS.QS * qs + 
      POS_WEIGHTS.OS * os + 
      POS_WEIGHTS.SAFETY * safety;
    
    formula = `${POS_WEIGHTS.QS}*QS + ${POS_WEIGHTS.OS}*OS + ${POS_WEIGHTS.SAFETY}*(100-Risk)`;
    
    contributions = {
      qs: POS_WEIGHTS.QS * qs,
      os: POS_WEIGHTS.OS * os,
      safety: POS_WEIGHTS.SAFETY * safety,
    };
  } else {
    // OS gated - use fixed renormalized weights: 0.80*QS + 0.20*Safety
    posRaw = 
      POS_WEIGHTS_OS_GATED.QS * qs + 
      POS_WEIGHTS_OS_GATED.SAFETY * safety;
    
    formula = `${POS_WEIGHTS_OS_GATED.QS}*QS + ${POS_WEIGHTS_OS_GATED.SAFETY}*(100-Risk) [OS gated]`;
    
    contributions = {
      qs: POS_WEIGHTS_OS_GATED.QS * qs,
      os: 0,
      safety: POS_WEIGHTS_OS_GATED.SAFETY * safety,
    };
  }
  
  return {
    qs: roundScore(qs),
    os: os !== null ? roundScore(os) : null,
    risk: roundScore(risk),
    safety: roundScore(safety),
    posRaw: roundScore(clampScore(posRaw)),
    formula,
    contributions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL SCORING
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoringInput {
  qsResults: FeatureResult[];
  osResults: FeatureResult[];
  riskResults: FeatureResult[];
  dataPoints: DataPoint[];
  config?: ReliabilityConfig;
}

export interface ScoringConfig {
  /** Minimum QS coverage to produce score */
  minQSCoverage: number;
  /** Minimum OS coverage to include OS */
  minOSCoverage: number;
  /** Reliability config */
  reliability: ReliabilityConfig;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minQSCoverage: 0.40,
  minOSCoverage: 0.30,
  reliability: DEFAULT_RELIABILITY_CONFIG,
};

/**
 * Calculate all scores
 */
export function calculateScores(
  input: ScoringInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoringResult {
  const qsFeatureIds = input.qsResults.map(r => r.id);
  const osFeatureIds = input.osResults.map(r => r.id);
  const riskFeatureIds = input.riskResults.map(r => r.id);
  
  // Calculate category scores
  const qsResult = calculateCategoryScore(
    input.qsResults,
    input.dataPoints,
    qsFeatureIds,
    config.reliability
  );
  
  const osResult = calculateCategoryScore(
    input.osResults,
    input.dataPoints,
    osFeatureIds,
    config.reliability
  );
  
  const riskResult = calculateCategoryScore(
    input.riskResults,
    input.dataPoints,
    riskFeatureIds,
    config.reliability
  );
  
  // Determine if OS should be gated
  let osGated = false;
  let osGateReason: string | undefined;
  
  if (osResult.coverage.weightedCoverage < config.minOSCoverage) {
    osGated = true;
    osGateReason = `OS coverage ${(osResult.coverage.weightedCoverage * 100).toFixed(0)}% < minimum ${(config.minOSCoverage * 100).toFixed(0)}%`;
  }
  
  // Calculate POS
  const pos = calculatePOS(
    qsResult.score,
    osGated ? null : osResult.score,
    riskResult.score
  );
  
  return {
    qsResult,
    osResult,
    riskResult,
    pos,
    osGated,
    osGateReason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify scoring invariants
 */
export interface ScoringInvariantResult {
  passed: boolean;
  invariant: string;
  details?: string;
}

export function checkScoringInvariants(result: ScoringResult): ScoringInvariantResult[] {
  const invariants: ScoringInvariantResult[] = [];
  
  // INV-S1: All scores in [0, 100]
  const scores = [
    result.qsResult.score,
    result.osResult.score,
    result.riskResult.score,
    result.pos.posRaw,
  ];
  
  for (const score of scores) {
    if (score < 0 || score > 100) {
      invariants.push({
        passed: false,
        invariant: 'INV-S1: Scores must be in [0, 100]',
        details: `Found score ${score}`,
      });
    }
  }
  if (!invariants.some(i => i.invariant.startsWith('INV-S1'))) {
    invariants.push({
      passed: true,
      invariant: 'INV-S1: Scores must be in [0, 100]',
    });
  }
  
  // INV-S2: Safety = 100 - Risk
  const expectedSafety = 100 - result.riskResult.score;
  if (Math.abs(result.pos.safety - expectedSafety) > 0.1) {
    invariants.push({
      passed: false,
      invariant: 'INV-S2: Safety must equal 100 - Risk',
      details: `Safety=${result.pos.safety}, expected=${expectedSafety}`,
    });
  } else {
    invariants.push({
      passed: true,
      invariant: 'INV-S2: Safety must equal 100 - Risk',
    });
  }
  
  // INV-S3: Coverage in [0, 1]
  const coverages = [
    result.qsResult.coverage.weightedCoverage,
    result.osResult.coverage.weightedCoverage,
    result.riskResult.coverage.weightedCoverage,
  ];
  
  for (const cov of coverages) {
    if (cov < 0 || cov > 1) {
      invariants.push({
        passed: false,
        invariant: 'INV-S3: Coverage must be in [0, 1]',
        details: `Found coverage ${cov}`,
      });
    }
  }
  if (!invariants.some(i => i.invariant.startsWith('INV-S3') && !i.passed)) {
    invariants.push({
      passed: true,
      invariant: 'INV-S3: Coverage must be in [0, 1]',
    });
  }
  
  // INV-S4: If OS gated, os contribution = 0
  if (result.osGated && result.pos.contributions.os !== 0) {
    invariants.push({
      passed: false,
      invariant: 'INV-S4: If OS gated, OS contribution must be 0',
      details: `OS gated but contribution=${result.pos.contributions.os}`,
    });
  } else {
    invariants.push({
      passed: true,
      invariant: 'INV-S4: If OS gated, OS contribution must be 0',
    });
  }
  
  // INV-S5: POS = sum of contributions
  const expectedPOS = 
    result.pos.contributions.qs + 
    result.pos.contributions.os + 
    result.pos.contributions.safety;
  
  if (Math.abs(result.pos.posRaw - expectedPOS) > 0.5) {
    invariants.push({
      passed: false,
      invariant: 'INV-S5: POS must equal sum of contributions',
      details: `POS=${result.pos.posRaw}, sum=${expectedPOS}`,
    });
  } else {
    invariants.push({
      passed: true,
      invariant: 'INV-S5: POS must equal sum of contributions',
    });
  }
  
  return invariants;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONOTONICITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check monotonicity: higher QS/OS should increase POS, higher Risk should decrease it
 */
export interface MonotonicityTestResult {
  passed: boolean;
  test: string;
  baseline: number;
  modified: number;
  direction: 'increase' | 'decrease' | 'unchanged';
  expected: 'increase' | 'decrease';
}

export function testMonotonicity(
  baseQS: number,
  baseOS: number,
  baseRisk: number
): MonotonicityTestResult[] {
  const results: MonotonicityTestResult[] = [];
  
  const baseline = calculatePOS(baseQS, baseOS, baseRisk);
  
  // Test: Higher QS should increase POS
  const higherQS = calculatePOS(baseQS + 10, baseOS, baseRisk);
  results.push({
    passed: higherQS.posRaw > baseline.posRaw,
    test: 'Higher QS increases POS',
    baseline: baseline.posRaw,
    modified: higherQS.posRaw,
    direction: higherQS.posRaw > baseline.posRaw ? 'increase' : 
               higherQS.posRaw < baseline.posRaw ? 'decrease' : 'unchanged',
    expected: 'increase',
  });
  
  // Test: Higher OS should increase POS
  const higherOS = calculatePOS(baseQS, baseOS + 10, baseRisk);
  results.push({
    passed: higherOS.posRaw > baseline.posRaw,
    test: 'Higher OS increases POS',
    baseline: baseline.posRaw,
    modified: higherOS.posRaw,
    direction: higherOS.posRaw > baseline.posRaw ? 'increase' : 
               higherOS.posRaw < baseline.posRaw ? 'decrease' : 'unchanged',
    expected: 'increase',
  });
  
  // Test: Higher Risk should decrease POS
  const higherRisk = calculatePOS(baseQS, baseOS, baseRisk + 10);
  results.push({
    passed: higherRisk.posRaw < baseline.posRaw,
    test: 'Higher Risk decreases POS',
    baseline: baseline.posRaw,
    modified: higherRisk.posRaw,
    direction: higherRisk.posRaw > baseline.posRaw ? 'increase' : 
               higherRisk.posRaw < baseline.posRaw ? 'decrease' : 'unchanged',
    expected: 'decrease',
  });
  
  return results;
}
