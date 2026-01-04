/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📈 EMA SMOOTHING                                                          ║
 * ║                                                                               ║
 * ║   Simple, stable EMA smoothing algorithm                                     ║
 * ║   posSmoothed = α*posRaw + (1-α)*prevPosSmoothed                            ║
 * ║                                                                               ║
 * ║   α = 0.25 (fixed, documented)                                               ║
 * ║   Cold-start: posSmoothed = posRaw                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { type SmoothingState, createInitialSmoothingState } from './schema';

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING CONFIGURATION (FIXED - DO NOT CHANGE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EMA smoothing configuration
 * 
 * α (alpha) determines how much weight is given to new data:
 * - α = 0.25 means 25% new data, 75% historical
 * - Lower α = more smoothing (slower to react)
 * - Higher α = less smoothing (faster to react)
 * 
 * Half-life: ln(0.5) / ln(1 - α) ≈ 2.4 periods
 * 
 * This means it takes ~2.4 calculation cycles for a change
 * to be halfway reflected in the smoothed score.
 */
export const SMOOTHING_CONFIG = {
  /** EMA alpha coefficient (FIXED at 0.25) */
  alpha: 0.25,
  
  /** Maximum time gap before resetting smoothing (24 hours) */
  maxGapHours: 24,
  
  /** Minimum calculations before smoothing stabilizes */
  warmupPeriods: 3,
  
  /** Maximum single-period change allowed (emergency cap) */
  maxDeltaPerPeriod: 15,
  
  /** Version for audit trail */
  version: '1.0.0',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SmoothingInput {
  /** Raw POS value from current calculation */
  posRaw: number;
  /** Previous smoothing state */
  prevState: SmoothingState | null;
  /** Current timestamp */
  timestamp: Date;
  /** Whether this is a forced reset (e.g., methodology change) */
  forceReset?: boolean;
}

export interface SmoothingResult {
  /** Smoothed POS value */
  posSmoothed: number;
  /** Raw POS value (unchanged) */
  posRaw: number;
  /** Updated state for next calculation */
  newState: SmoothingState;
  /** Whether cold-start was applied */
  isColdStart: boolean;
  /** Whether gap reset was applied */
  isGapReset: boolean;
  /** Whether emergency cap was applied */
  wasEmergencyCapped: boolean;
  /** Delta from previous smoothed value */
  delta: number;
  /** Alpha coefficient used */
  alpha: number;
  /** Debug info */
  debug: {
    prevSmoothed: number | null;
    gapHours: number | null;
    stateCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE SMOOTHING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply EMA smoothing to a raw POS score
 * 
 * Formula: posSmoothed = α*posRaw + (1-α)*prevPosSmoothed
 * 
 * Cold-start handling:
 * - If no previous state: posSmoothed = posRaw
 * - If time gap > maxGapHours: reset to posRaw
 * - If forced reset: posSmoothed = posRaw
 * 
 * Emergency cap:
 * - If delta > maxDeltaPerPeriod: cap the change
 */
export function applySmoothingEMA(input: SmoothingInput): SmoothingResult {
  const { posRaw, prevState, timestamp, forceReset = false } = input;
  const { alpha, maxGapHours, maxDeltaPerPeriod } = SMOOTHING_CONFIG;
  
  // Calculate time gap if we have previous state
  let gapHours: number | null = null;
  if (prevState?.prevTimestamp) {
    gapHours = (timestamp.getTime() - prevState.prevTimestamp.getTime()) / (1000 * 60 * 60);
  }
  
  // Determine if this is a cold start or reset scenario
  const isColdStart = !prevState || prevState.prevPosSmoothed === null;
  const isGapReset = !isColdStart && gapHours !== null && gapHours > maxGapHours;
  const shouldReset = forceReset || isColdStart || isGapReset;
  
  let posSmoothed: number;
  let delta: number;
  let wasEmergencyCapped = false;
  
  if (shouldReset) {
    // Cold start or reset: use raw value directly
    posSmoothed = posRaw;
    delta = 0;
  } else {
    // Apply EMA smoothing
    const prevSmoothed = prevState!.prevPosSmoothed!;
    posSmoothed = alpha * posRaw + (1 - alpha) * prevSmoothed;
    delta = posSmoothed - prevSmoothed;
    
    // Apply emergency cap if delta is too large
    if (Math.abs(delta) > maxDeltaPerPeriod) {
      wasEmergencyCapped = true;
      const cappedDelta = Math.sign(delta) * maxDeltaPerPeriod;
      posSmoothed = prevSmoothed + cappedDelta;
      delta = cappedDelta;
    }
  }
  
  // Clamp to valid range
  posSmoothed = Math.max(0, Math.min(100, posSmoothed));
  
  // Round to 2 decimal places
  posSmoothed = Math.round(posSmoothed * 100) / 100;
  
  // Create new state
  const newState: SmoothingState = {
    prevPosSmoothed: posSmoothed,
    prevTimestamp: timestamp,
    stateCount: (prevState?.stateCount ?? 0) + 1,
    projectId: prevState?.projectId ?? '',
  };
  
  return {
    posSmoothed,
    posRaw,
    newState,
    isColdStart,
    isGapReset,
    wasEmergencyCapped,
    delta,
    alpha,
    debug: {
      prevSmoothed: prevState?.prevPosSmoothed ?? null,
      gapHours,
      stateCount: newState.stateCount,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if smoothing has warmed up (stabilized)
 */
export function isSmoothingWarmedUp(state: SmoothingState): boolean {
  return state.stateCount >= SMOOTHING_CONFIG.warmupPeriods;
}

/**
 * Calculate theoretical half-life of EMA
 * (how many periods until a change is 50% reflected)
 */
export function calculateHalfLife(alpha: number = SMOOTHING_CONFIG.alpha): number {
  return Math.log(0.5) / Math.log(1 - alpha);
}

/**
 * Calculate how much of a change is reflected after N periods
 */
export function calculateReflection(periods: number, alpha: number = SMOOTHING_CONFIG.alpha): number {
  return 1 - Math.pow(1 - alpha, periods);
}

/**
 * Estimate final smoothed value after convergence
 * (useful for testing)
 */
export function simulateSmoothing(
  values: number[],
  initialState?: SmoothingState
): number[] {
  const results: number[] = [];
  let state = initialState ?? null;
  
  for (let i = 0; i < values.length; i++) {
    const result = applySmoothingEMA({
      posRaw: values[i],
      prevState: state,
      timestamp: new Date(Date.now() + i * 60 * 60 * 1000), // 1 hour apart
    });
    
    results.push(result.posSmoothed);
    state = result.newState;
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH SMOOTHING (for historical data)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BatchSmoothingInput {
  projectId: string;
  /** Raw scores with timestamps, sorted by timestamp ascending */
  scores: Array<{
    posRaw: number;
    timestamp: Date;
  }>;
  /** Initial state (if continuing from previous batch) */
  initialState?: SmoothingState;
}

export interface BatchSmoothingResult {
  /** Smoothed results in same order as input */
  results: SmoothingResult[];
  /** Final state after all smoothing */
  finalState: SmoothingState;
}

/**
 * Apply smoothing to a batch of historical scores
 */
export function applyBatchSmoothing(input: BatchSmoothingInput): BatchSmoothingResult {
  const { projectId, scores, initialState } = input;
  
  let state: SmoothingState | null = initialState ?? createInitialSmoothingState(projectId);
  const results: SmoothingResult[] = [];
  
  for (const score of scores) {
    const result = applySmoothingEMA({
      posRaw: score.posRaw,
      prevState: state,
      timestamp: score.timestamp,
    });
    
    results.push(result);
    state = result.newState;
  }
  
  return {
    results,
    finalState: state ?? createInitialSmoothingState(projectId),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SmoothingAnalysis {
  /** Average absolute delta per period */
  avgDelta: number;
  /** Maximum delta observed */
  maxDelta: number;
  /** Number of emergency caps applied */
  emergencyCapCount: number;
  /** Number of resets (cold start or gap) */
  resetCount: number;
  /** Volatility of raw vs smoothed */
  rawVolatility: number;
  smoothedVolatility: number;
  /** Smoothing effectiveness (volatility reduction) */
  volatilityReduction: number;
}

/**
 * Analyze smoothing effectiveness over a series
 */
export function analyzeSmoothingResults(results: SmoothingResult[]): SmoothingAnalysis {
  if (results.length === 0) {
    return {
      avgDelta: 0,
      maxDelta: 0,
      emergencyCapCount: 0,
      resetCount: 0,
      rawVolatility: 0,
      smoothedVolatility: 0,
      volatilityReduction: 0,
    };
  }
  
  const deltas = results.map(r => Math.abs(r.delta));
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const maxDelta = Math.max(...deltas);
  const emergencyCapCount = results.filter(r => r.wasEmergencyCapped).length;
  const resetCount = results.filter(r => r.isColdStart || r.isGapReset).length;
  
  // Calculate volatility (standard deviation)
  const rawValues = results.map(r => r.posRaw);
  const smoothedValues = results.map(r => r.posSmoothed);
  
  const rawMean = rawValues.reduce((a, b) => a + b, 0) / rawValues.length;
  const smoothedMean = smoothedValues.reduce((a, b) => a + b, 0) / smoothedValues.length;
  
  const rawVariance = rawValues.reduce((sum, v) => sum + Math.pow(v - rawMean, 2), 0) / rawValues.length;
  const smoothedVariance = smoothedValues.reduce((sum, v) => sum + Math.pow(v - smoothedMean, 2), 0) / smoothedValues.length;
  
  const rawVolatility = Math.sqrt(rawVariance);
  const smoothedVolatility = Math.sqrt(smoothedVariance);
  const volatilityReduction = rawVolatility > 0 ? (rawVolatility - smoothedVolatility) / rawVolatility : 0;
  
  return {
    avgDelta,
    maxDelta,
    emergencyCapCount,
    resetCount,
    rawVolatility,
    smoothedVolatility,
    volatilityReduction,
  };
}
