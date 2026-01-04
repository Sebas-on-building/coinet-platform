/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 ANCHOR PRIORS SYSTEM                                                   ║
 * ║                                                                               ║
 * ║   8.2 Anchor Priors - Uncertainty Shrinkage                                  ║
 * ║                                                                               ║
 * ║   Rules:                                                                      ║
 * ║   - If coverage is LOW → QS shrinks toward prior (softly)                    ║
 * ║   - If coverage is HIGH → prior influence vanishes                           ║
 * ║   - Prevents absurd major rankings under partial outages                     ║
 * ║                                                                               ║
 * ║   THIS IS NOT A CHEAT. It's principled uncertainty handling.                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  AnchorPrior,
  AnchorPriorConfig,
} from './types';
import {
  WELL_KNOWN_PRIORS,
  DEFAULT_ANCHOR_PRIOR_CONFIG,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIOR STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory prior cache
 * In production, this would be backed by database
 */
const priorCache = new Map<string, AnchorPrior>();

/**
 * Initialize well-known priors
 */
export function initializeWellKnownPriors(): void {
  const now = new Date();
  
  for (const [assetId, priorData] of Object.entries(WELL_KNOWN_PRIORS)) {
    priorCache.set(assetId, {
      ...priorData,
      updatedAt: now,
    });
  }
}

// Initialize on module load
initializeWellKnownPriors();

/**
 * Get prior for an asset
 */
export function getPrior(assetId: string): AnchorPrior | null {
  return priorCache.get(assetId.toLowerCase()) ?? null;
}

/**
 * Set/update prior for an asset
 */
export function setPrior(prior: AnchorPrior): void {
  priorCache.set(prior.assetId.toLowerCase(), prior);
}

/**
 * Check if asset has a prior
 */
export function hasPrior(assetId: string): boolean {
  return priorCache.has(assetId.toLowerCase());
}

/**
 * Get all priors
 */
export function getAllPriors(): AnchorPrior[] {
  return Array.from(priorCache.values());
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIOR INFLUENCE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate prior influence based on coverage
 * 
 * The influence decreases as coverage increases:
 * - At 0% coverage → maxPriorInfluence
 * - At minCoverageForObserved → starts decreasing
 * - At fullCoverageThreshold → 0 (prior ignored)
 */
export function calculatePriorInfluence(
  coverage: number,
  config: AnchorPriorConfig = DEFAULT_ANCHOR_PRIOR_CONFIG
): number {
  // Clamp coverage to [0, 1]
  const c = Math.max(0, Math.min(1, coverage));
  
  // If coverage is at or above full threshold, no prior influence
  if (c >= config.fullCoverageThreshold) {
    return 0;
  }
  
  // If coverage is below minimum, full prior influence
  if (c <= config.minCoverageForObserved) {
    return config.maxPriorInfluence;
  }
  
  // Calculate decay between min and full coverage
  // Normalized position: 0 at minCoverage, 1 at fullCoverage
  const normalizedCoverage = 
    (c - config.minCoverageForObserved) / 
    (config.fullCoverageThreshold - config.minCoverageForObserved);
  
  // Apply decay function (quadratic by default)
  const decay = Math.pow(1 - normalizedCoverage, config.decayRate);
  
  return config.maxPriorInfluence * decay;
}

/**
 * Debug helper to show influence curve
 */
export function getPriorInfluenceCurve(
  config: AnchorPriorConfig = DEFAULT_ANCHOR_PRIOR_CONFIG
): Array<{ coverage: number; influence: number }> {
  const points: Array<{ coverage: number; influence: number }> = [];
  
  for (let c = 0; c <= 100; c += 5) {
    points.push({
      coverage: c,
      influence: calculatePriorInfluence(c / 100, config) * 100,
    });
  }
  
  return points;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE ADJUSTMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface AdjustedScore {
  /** Original observed score */
  observed: number;
  
  /** Prior value used */
  prior: number;
  
  /** Final adjusted score */
  adjusted: number;
  
  /** Prior influence (0-1) */
  priorInfluence: number;
  
  /** Was adjustment applied? */
  wasAdjusted: boolean;
  
  /** Explanation */
  explanation: string;
}

/**
 * Apply prior-based adjustment to a score
 * 
 * Formula: adjusted = observed * (1 - influence) + prior * influence
 * 
 * This is BAYESIAN SHRINKAGE toward the prior when data is uncertain.
 */
export function applyPriorAdjustment(
  observed: number,
  prior: number,
  coverage: number,
  config: AnchorPriorConfig = DEFAULT_ANCHOR_PRIOR_CONFIG
): AdjustedScore {
  const influence = calculatePriorInfluence(coverage, config);
  
  // If no influence, return observed as-is
  if (influence === 0) {
    return {
      observed,
      prior,
      adjusted: observed,
      priorInfluence: 0,
      wasAdjusted: false,
      explanation: 'Coverage sufficient, using observed score',
    };
  }
  
  // Apply Bayesian shrinkage
  const adjusted = observed * (1 - influence) + prior * influence;
  
  return {
    observed,
    prior,
    adjusted,
    priorInfluence: influence,
    wasAdjusted: true,
    explanation: `Coverage ${(coverage * 100).toFixed(0)}% triggers ${(influence * 100).toFixed(0)}% prior influence`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL SCORE ADJUSTMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoreWithPriorAdjustment {
  /** Asset ID */
  assetId: string;
  
  /** Quality Score adjustment */
  qs: AdjustedScore;
  
  /** Opportunity Score adjustment (if applicable) */
  os: AdjustedScore | null;
  
  /** Risk Score adjustment */
  risk: AdjustedScore;
  
  /** POS recalculated with adjusted scores */
  posAdjusted: number;
  
  /** Original POS */
  posOriginal: number;
  
  /** Delta */
  posDelta: number;
  
  /** Has prior */
  hasPrior: boolean;
}

/**
 * Adjust all scores using anchor priors
 */
export function adjustScoresWithPrior(
  assetId: string,
  observed: {
    qs: number;
    os: number | null;
    risk: number;
    pos: number;
  },
  coverage: {
    qs: number;
    os: number;
  },
  config: AnchorPriorConfig = DEFAULT_ANCHOR_PRIOR_CONFIG
): ScoreWithPriorAdjustment {
  const prior = getPrior(assetId);
  
  // If no prior, return unchanged
  if (!prior) {
    return {
      assetId,
      qs: {
        observed: observed.qs,
        prior: observed.qs,
        adjusted: observed.qs,
        priorInfluence: 0,
        wasAdjusted: false,
        explanation: 'No prior available',
      },
      os: observed.os !== null ? {
        observed: observed.os,
        prior: observed.os,
        adjusted: observed.os,
        priorInfluence: 0,
        wasAdjusted: false,
        explanation: 'No prior available',
      } : null,
      risk: {
        observed: observed.risk,
        prior: observed.risk,
        adjusted: observed.risk,
        priorInfluence: 0,
        wasAdjusted: false,
        explanation: 'No prior available',
      },
      posAdjusted: observed.pos,
      posOriginal: observed.pos,
      posDelta: 0,
      hasPrior: false,
    };
  }
  
  // Adjust QS
  const qsAdjusted = applyPriorAdjustment(
    observed.qs,
    prior.qsPrior,
    coverage.qs,
    config
  );
  
  // Adjust OS (if available)
  let osAdjusted: AdjustedScore | null = null;
  if (observed.os !== null && prior.osPrior !== null) {
    osAdjusted = applyPriorAdjustment(
      observed.os,
      prior.osPrior,
      coverage.os,
      config
    );
  }
  
  // Adjust Risk
  const riskAdjusted = applyPriorAdjustment(
    observed.risk,
    prior.riskPrior,
    coverage.qs, // Use QS coverage for risk (they share data sources)
    config
  );
  
  // Recalculate POS with adjusted scores
  // POS = 0.50*QS + 0.30*OS + 0.20*(100 - Risk)
  const osForCalc = osAdjusted?.adjusted ?? observed.os ?? 50;
  const posAdjusted = 
    0.50 * qsAdjusted.adjusted +
    0.30 * osForCalc +
    0.20 * (100 - riskAdjusted.adjusted);
  
  return {
    assetId,
    qs: qsAdjusted,
    os: osAdjusted,
    risk: riskAdjusted,
    posAdjusted,
    posOriginal: observed.pos,
    posDelta: posAdjusted - observed.pos,
    hasPrior: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIOR LEARNING (Update priors from observations)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PriorUpdateConfig {
  /** Minimum coverage to consider observation valid */
  minCoverageForUpdate: number;
  
  /** Learning rate for updating prior */
  learningRate: number;
  
  /** Minimum observations before updating */
  minObservations: number;
}

export const DEFAULT_PRIOR_UPDATE_CONFIG: PriorUpdateConfig = {
  minCoverageForUpdate: 0.7,
  learningRate: 0.1,
  minObservations: 10,
};

/**
 * Update a prior based on new observation
 * Uses exponential moving average for stability
 */
export function updatePriorFromObservation(
  assetId: string,
  observed: {
    qs: number;
    os: number | null;
    risk: number;
  },
  coverage: {
    qs: number;
    os: number;
  },
  config: PriorUpdateConfig = DEFAULT_PRIOR_UPDATE_CONFIG
): AnchorPrior | null {
  // Only update if coverage is sufficient
  if (coverage.qs < config.minCoverageForUpdate) {
    return null;
  }
  
  const existing = getPrior(assetId);
  const now = new Date();
  
  if (!existing) {
    // Create new prior from this observation
    const newPrior: AnchorPrior = {
      assetId: assetId.toLowerCase(),
      qsPrior: observed.qs,
      osPrior: observed.os,
      riskPrior: observed.risk,
      priorConfidence: 10, // Low confidence for new prior
      observationCount: 1,
      updatedAt: now,
    };
    
    setPrior(newPrior);
    return newPrior;
  }
  
  // Update existing prior with EMA
  const alpha = config.learningRate;
  
  const updatedPrior: AnchorPrior = {
    assetId: existing.assetId,
    qsPrior: existing.qsPrior * (1 - alpha) + observed.qs * alpha,
    osPrior: existing.osPrior !== null && observed.os !== null
      ? existing.osPrior * (1 - alpha) + observed.os * alpha
      : existing.osPrior,
    riskPrior: existing.riskPrior * (1 - alpha) + observed.risk * alpha,
    priorConfidence: Math.min(100, existing.priorConfidence + 1),
    observationCount: existing.observationCount + 1,
    updatedAt: now,
  };
  
  setPrior(updatedPrior);
  return updatedPrior;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if an observed score deviates significantly from prior
 */
export function checkPriorDeviation(
  assetId: string,
  observed: {
    qs: number;
    os: number | null;
    risk: number;
    pos: number;
  },
  maxDeviation: number = 15
): {
  deviates: boolean;
  deviations: Array<{
    metric: string;
    prior: number;
    observed: number;
    delta: number;
  }>;
  explanation: string;
} {
  const prior = getPrior(assetId);
  
  if (!prior) {
    return {
      deviates: false,
      deviations: [],
      explanation: 'No prior to compare against',
    };
  }
  
  const deviations: Array<{
    metric: string;
    prior: number;
    observed: number;
    delta: number;
  }> = [];
  
  // Check QS
  const qsDelta = Math.abs(observed.qs - prior.qsPrior);
  if (qsDelta > maxDeviation) {
    deviations.push({
      metric: 'QS',
      prior: prior.qsPrior,
      observed: observed.qs,
      delta: qsDelta,
    });
  }
  
  // Check OS
  if (observed.os !== null && prior.osPrior !== null) {
    const osDelta = Math.abs(observed.os - prior.osPrior);
    if (osDelta > maxDeviation) {
      deviations.push({
        metric: 'OS',
        prior: prior.osPrior,
        observed: observed.os,
        delta: osDelta,
      });
    }
  }
  
  // Check Risk
  const riskDelta = Math.abs(observed.risk - prior.riskPrior);
  if (riskDelta > maxDeviation) {
    deviations.push({
      metric: 'Risk',
      prior: prior.riskPrior,
      observed: observed.risk,
      delta: riskDelta,
    });
  }
  
  return {
    deviates: deviations.length > 0,
    deviations,
    explanation: deviations.length > 0
      ? `${deviations.map(d => `${d.metric} deviates by ${d.delta.toFixed(1)}`).join(', ')}`
      : 'All metrics within expected range',
  };
}
