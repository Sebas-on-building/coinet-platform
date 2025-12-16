/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔢 OMNISCORE v3.0 CONSTANTS                                               ║
 * ║                                                                               ║
 * ║   Fixed thresholds and weights. These DO NOT change based on regime.         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { TierLabel, ConfidenceLevel } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const ENGINE_VERSION = '3.0.0' as const;
export const FORMULA_VERSION = 'v3.0' as const;
export const METHODOLOGY_ID = 'OMNISCORE_V3.0_DIABOLICAL' as const;

/**
 * FORMULA FREEZE
 * 
 * "Freeze the formula for a month. Stop tweaking the 0.60/0.25/0.15 split.
 *  Treat it as a fixed contract while you fix the underlying pipeline.
 *  Otherwise you'll chase ghosts."
 * 
 * Set to true to indicate formula is frozen. Do NOT change weights
 * while this is true - focus on data quality and interpretation.
 */
export const FORMULA_FROZEN = true as const;
export const FORMULA_FROZEN_DATE = '2024-12-16' as const;
export const FORMULA_FROZEN_UNTIL = '2025-01-16' as const; // 1 month

// ═══════════════════════════════════════════════════════════════════════════════
// TIER THRESHOLDS (FIXED - DO NOT CHANGE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tier thresholds (investor-grade)
 * 
 * Elite ≥ 85  - Top-tier assets (BTC, ETH)
 * Strong ≥ 70 - Solid fundamentals (SOL, BNB)
 * Neutral ≥ 50 - Average (XRP range)
 * Weak ≥ 30   - Below average
 * Critical < 30 - High risk / poor quality
 */
export const TIER_THRESHOLDS = {
  Elite: 85,
  Strong: 70,
  Neutral: 50,
  Weak: 30,
  Critical: 0,
} as const;

export function getTierFromScore(score: number): TierLabel {
  if (score >= TIER_THRESHOLDS.Elite) return 'Elite';
  if (score >= TIER_THRESHOLDS.Strong) return 'Strong';
  if (score >= TIER_THRESHOLDS.Neutral) return 'Neutral';
  if (score >= TIER_THRESHOLDS.Weak) return 'Weak';
  return 'Critical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// POS FORMULA WEIGHTS (FIXED - NO REGIME MODULATION)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POS = 0.60*QS + 0.25*OS + 0.15*(100 - Risk)
 * 
 * Fundamentals-dominant formula:
 * - QS (60%): Primary driver of long-term value
 * - OS (25%): Timing matters but less than fundamentals
 * - Safety (15%): Risk explicitly penalized
 */
export const FIXED_WEIGHTS = {
  /** Quality Score weight (fundamentals dominant) */
  w_qs: 0.60,
  /** Opportunity Score weight (secondary) */
  w_os: 0.25,
  /** Safety weight (100 - Risk) */
  w_safety: 0.15,
} as const;

/**
 * When OS is gated (missing opportunity data), renormalize:
 * POS = 0.80*QS + 0.20*(100 - Risk)
 */
export const FIXED_WEIGHTS_OS_GATED = {
  w_qs: 0.80,
  w_safety: 0.20,
} as const;

// Compile-time assertion: weights must sum to 1
const _weightSum = FIXED_WEIGHTS.w_qs + FIXED_WEIGHTS.w_os + FIXED_WEIGHTS.w_safety;
if (Math.abs(_weightSum - 1) > 0.001) {
  throw new Error(`INVARIANT VIOLATION: Weights must sum to 1, got ${_weightSum}`);
}

const _weightSumGated = FIXED_WEIGHTS_OS_GATED.w_qs + FIXED_WEIGHTS_OS_GATED.w_safety;
if (Math.abs(_weightSumGated - 1) > 0.001) {
  throw new Error(`INVARIANT VIOLATION: OS-gated weights must sum to 1, got ${_weightSumGated}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE & COVERAGE THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Confidence formula:
 * confidence = 100 * clamp(0.6*covQS + 0.3*covOS + 0.1*freshGlobal - penalties)
 */
export const CONFIDENCE_FORMULA_WEIGHTS = {
  covQS: 0.60,
  covOS: 0.30,
  freshGlobal: 0.10,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  high: 0.80,       // >= 80% = high confidence
  medium: 0.65,     // >= 65% = medium confidence
  low: 0.50,        // >= 50% = low confidence
  insufficient: 0,  // < 50% = GATED
} as const;

/**
 * HARD GATES - fail-closed
 * 
 * if covQS < 0.60 → NO SCORE
 * if confidence < 65 → NO SCORE
 */
export const COVERAGE_GATES = {
  /** Minimum QS coverage to produce a score */
  minQsCoverage: 0.60,
  
  /** Minimum OS coverage (below this, OS is gated but POS may still be computed) */
  minOsCoverage: 0.40,
  
  /** Minimum confidence to produce a score */
  minConfidence: 65,
  
  /** Confidence below which score is degraded (cap applied) */
  degradedConfidence: 75,
} as const;

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.high * 100) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.medium * 100) return 'medium';
  if (confidence >= CONFIDENCE_THRESHOLDS.low * 100) return 'low';
  return 'insufficient';
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

export const LEGITIMACY_THRESHOLDS = {
  /** Any hard fail = instant gate */
  hardFailsToGate: 1,
  /** This many soft fails = gate */
  softFailsToGate: 3,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const SMOOTHING_CONFIG = {
  qs: {
    maxDailyDelta: 2,           // Max ±2 points per day
    smoothingAlpha: 0.2,        // 20% new, 80% old
    minHoursBetweenUpdates: 24,
    bypassOnEvent: false,       // Never bypass for QS
  },
  os: {
    maxDailyDelta: 10,          // Max ±10 points per day
    smoothingAlpha: 0.5,        // 50% new, 50% old
    minHoursBetweenUpdates: 4,
    bypassOnEvent: true,        // Bypass on ERS > 0.5
  },
  pos: {
    maxDailyDelta: 5,           // Max ±5 points per day
    smoothingAlpha: 0.35,       // 35% new, 65% old
    minHoursBetweenUpdates: 8,
    bypassOnEvent: true,        // Bypass on ERS > 0.5
  },
  eventThreshold: 0.5,          // ERS above this = event mode
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DATA STALENESS THRESHOLDS (in hours)
// ═══════════════════════════════════════════════════════════════════════════════

export const STALENESS_THRESHOLDS = {
  /** Market data (price, volume) */
  MARKET: 1,
  /** Token data */
  TOKEN: 6,
  /** Adoption data */
  ADOPT: 24,
  /** Community data */
  COMM: 24,
  /** Valuation data */
  VAL: 6,
  /** Team data */
  TEAM: 168,      // 7 days
  /** Tech data */
  TECH: 168,      // 7 days
  /** Security data */
  SEC: 720,       // 30 days
  /** Governance data */
  GOV: 168,       // 7 days
  /** Ecosystem data */
  ECO: 168,       // 7 days
  /** Legal data */
  LEGAL: 720,     // 30 days
  /** Macro data */
  MACRO: 24,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT WEIGHTS (within QS and OS)
// ═══════════════════════════════════════════════════════════════════════════════

export const QS_SEGMENT_WEIGHTS = {
  TEAM: 0.20,
  TECH: 0.25,
  SEC: 0.25,
  GOV: 0.15,
  ECO: 0.15,
} as const;

export const OS_SEGMENT_WEIGHTS = {
  MARKET: 0.30,
  TOKEN: 0.20,
  VAL: 0.15,
  ADOPT: 0.20,
  COMM: 0.15,
} as const;

export const RISK_SEGMENT_WEIGHTS = {
  LEGAL: 0.50,
  MACRO: 0.50,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE BOUNDS
// ═══════════════════════════════════════════════════════════════════════════════

export const SCORE_BOUNDS = {
  min: 0,
  max: 100,
  /** No live project should achieve perfect 100 */
  plausibleMax: 97,
} as const;
