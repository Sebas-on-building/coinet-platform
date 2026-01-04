/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔒 OMNISCORE INVARIANT VALIDATION                                        ║
 * ║                                                                               ║
 * ║   Production invariants that MUST hold for every calculation.                ║
 * ║   Violation → CRITICAL error, no score output.                               ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 6                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { ENGINE_VERSION, FORMULA_VERSION } from './version';
import { 
  OmniScoreError, 
  createInvariantViolationError,
  assertFinite,
  assertScoreBounds,
  assertNormalizedBounds,
} from './errors';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT CODES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Invariant codes for tracking and alerting
 * Each code maps to a specific production invariant
 */
export const INVARIANT_CODES = {
  // Value bounds
  INV_1: 'INV-1',   // Data quality bounded [0,1]
  INV_2: 'INV-2',   // Coverage bounded [0,1]
  INV_4a: 'INV-4a', // Soft clamp applied
  INV_4b: 'INV-4b', // Hard bound (NaN/Inf)
  
  // Probability/weight sanity
  INV_3: 'INV-3',   // Probability sum = 1
  INV_7: 'INV-7',   // Weights sum = 1
  
  // Risk monotonicity
  INV_5: 'INV-5',   // Risk monotonicity
  INV_8: 'INV-8',   // Gamma >= 0
  
  // Reflexivity
  INV_9: 'INV-9',   // QS/OS feature isolation
  INV_12: 'INV-12', // Reflexivity leak threshold
  
  // Time/confidence
  INV_10: 'INV-10', // Timestamp sanity
  INV_11: 'INV-11', // Coverage → confidence mapping
  
  // Quality gate
  INV_6: 'INV-6',   // Minimum coverage gate
} as const;

export type InvariantCode = typeof INVARIANT_CODES[keyof typeof INVARIANT_CODES];

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT VIOLATION TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvariantViolation {
  code: InvariantCode;
  severity: 'WARN' | 'ERROR';
  message: string;
  value?: number;
  bound?: string;
}

export interface InvariantCheckResult {
  passed: boolean;
  violations: InvariantViolation[];
  warnings: InvariantViolation[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUNDLE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface InputBundle {
  qsInputs: Array<{ raw: number | null; key?: string }>;
  osInputs: Array<{ raw: number | null; key?: string }>;
  regimeProbs?: Record<string, number>;
  weights?: Record<string, number>;
  gamma?: number;
  ers?: number;
  coverageQS?: number;
  coverageOS?: number;
}

/**
 * Validate input bundle before calculation
 * @throws OmniScoreError if critical invariant violated
 */
export function validateBundleOrThrow(bundle: InputBundle): InvariantCheckResult {
  const violations: InvariantViolation[] = [];
  const warnings: InvariantViolation[] = [];
  
  // INV-1: Data quality bounded [0,1]
  for (const input of [...bundle.qsInputs, ...bundle.osInputs]) {
    if (input.raw !== null) {
      if (!Number.isFinite(input.raw)) {
        violations.push({
          code: INVARIANT_CODES.INV_4b,
          severity: 'ERROR',
          message: `Input ${input.key || 'unknown'} has non-finite value: ${input.raw}`,
          value: input.raw,
        });
      }
    }
  }
  
  // INV-2: Coverage bounded [0,1]
  if (bundle.coverageQS !== undefined) {
    if (bundle.coverageQS < 0 || bundle.coverageQS > 1) {
      violations.push({
        code: INVARIANT_CODES.INV_2,
        severity: 'ERROR',
        message: `QS coverage out of bounds: ${bundle.coverageQS}`,
        value: bundle.coverageQS,
        bound: '[0, 1]',
      });
    }
  }
  
  if (bundle.coverageOS !== undefined) {
    if (bundle.coverageOS < 0 || bundle.coverageOS > 1) {
      violations.push({
        code: INVARIANT_CODES.INV_2,
        severity: 'ERROR',
        message: `OS coverage out of bounds: ${bundle.coverageOS}`,
        value: bundle.coverageOS,
        bound: '[0, 1]',
      });
    }
  }
  
  // INV-3: Probability sum = 1
  if (bundle.regimeProbs) {
    const probSum = Object.values(bundle.regimeProbs).reduce((a, b) => a + b, 0);
    if (Math.abs(probSum - 1) > 0.001) {
      violations.push({
        code: INVARIANT_CODES.INV_3,
        severity: 'ERROR',
        message: `Regime probabilities sum to ${probSum}, expected 1`,
        value: probSum,
        bound: '= 1',
      });
    }
  }
  
  // INV-7: Weights sum = 1
  if (bundle.weights) {
    const weightSum = Object.values(bundle.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1) > 0.001) {
      violations.push({
        code: INVARIANT_CODES.INV_7,
        severity: 'ERROR',
        message: `Weights sum to ${weightSum}, expected 1`,
        value: weightSum,
        bound: '= 1',
      });
    }
  }
  
  // INV-8: Gamma >= 0
  if (bundle.gamma !== undefined && bundle.gamma < 0) {
    violations.push({
      code: INVARIANT_CODES.INV_8,
      severity: 'ERROR',
      message: `Gamma is negative: ${bundle.gamma}`,
      value: bundle.gamma,
      bound: '>= 0',
    });
  }
  
  // If any ERROR-level violations, throw
  if (violations.length > 0) {
    const firstViolation = violations[0];
    throw createInvariantViolationError(
      firstViolation.code,
      firstViolation.message,
      firstViolation.value,
      firstViolation.bound
    );
  }
  
  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoreResult {
  qs: { score: number };
  os: { score: number };
  pos: { raw: number; adjusted: number };
  risk?: { score: number };
  nrg?: number;
  audit: {
    engineVersion: string;
    formulaVersion?: string;
    coverageQS?: number;
    coverageOS?: number;
  };
}

/**
 * Validate result before returning to caller
 * @throws OmniScoreError if critical invariant violated
 */
export function validateResultOrThrow(result: ScoreResult): InvariantCheckResult {
  const violations: InvariantViolation[] = [];
  const warnings: InvariantViolation[] = [];
  
  // Version integrity
  if (result.audit.engineVersion !== ENGINE_VERSION) {
    violations.push({
      code: INVARIANT_CODES.INV_4b,
      severity: 'ERROR',
      message: `Engine version mismatch in result: ${result.audit.engineVersion} !== ${ENGINE_VERSION}`,
    });
  }
  
  // Score bounds [0, 100]
  const scoresToCheck = [
    { name: 'QS', value: result.qs.score },
    { name: 'OS', value: result.os.score },
    { name: 'POS.raw', value: result.pos.raw },
    { name: 'POS.adjusted', value: result.pos.adjusted },
  ];
  
  if (result.risk) {
    scoresToCheck.push({ name: 'Risk', value: result.risk.score });
  }
  
  for (const { name, value } of scoresToCheck) {
    // Check for NaN/Infinity
    if (!Number.isFinite(value)) {
      violations.push({
        code: INVARIANT_CODES.INV_4b,
        severity: 'ERROR',
        message: `${name} is not finite: ${value}`,
        value,
      });
      continue;
    }
    
    // Check bounds
    if (value < 0 || value > 100) {
      violations.push({
        code: INVARIANT_CODES.INV_4a,
        severity: 'ERROR',
        message: `${name} out of bounds: ${value}`,
        value,
        bound: '[0, 100]',
      });
    }
  }
  
  // INV-5: Risk monotonicity (if ERS > 0, adjusted <= raw)
  // This is a sanity check - higher risk should not increase POS
  if (result.pos.adjusted > result.pos.raw + 0.01) {
    warnings.push({
      code: INVARIANT_CODES.INV_5,
      severity: 'WARN',
      message: `POS adjusted (${result.pos.adjusted}) > raw (${result.pos.raw})`,
      value: result.pos.adjusted - result.pos.raw,
    });
  }
  
  // INV-6: Quality gate (minimum coverage)
  const minCoverage = 0.3;
  if (result.audit.coverageQS !== undefined && result.audit.coverageQS < minCoverage) {
    warnings.push({
      code: INVARIANT_CODES.INV_6,
      severity: 'WARN',
      message: `QS coverage below threshold: ${(result.audit.coverageQS * 100).toFixed(1)}%`,
      value: result.audit.coverageQS,
      bound: `>= ${minCoverage * 100}%`,
    });
  }
  
  // If any ERROR-level violations, throw
  if (violations.length > 0) {
    const firstViolation = violations[0];
    throw createInvariantViolationError(
      firstViolation.code,
      firstViolation.message,
      firstViolation.value,
      firstViolation.bound
    );
  }
  
  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clamp score to valid bounds and track if clamping was applied
 */
export function clampScore(value: number, fieldName: string): { value: number; clamped: boolean } {
  // First check for NaN/Infinity
  if (!Number.isFinite(value)) {
    throw createInvariantViolationError(
      INVARIANT_CODES.INV_4b,
      `${fieldName} is not finite: ${value}`,
      value
    );
  }
  
  const clamped = value < 0 || value > 100;
  const clampedValue = Math.max(0, Math.min(100, value));
  
  return { value: clampedValue, clamped };
}

/**
 * Normalize probabilities to sum to 1
 */
export function normalizeProbs(probs: Record<string, number>): Record<string, number> {
  const total = Object.values(probs).reduce((a, b) => a + Math.max(0, b), 0);
  
  if (total === 0) {
    // Return uniform distribution
    const keys = Object.keys(probs);
    const uniform = 1 / keys.length;
    return Object.fromEntries(keys.map(k => [k, uniform]));
  }
  
  return Object.fromEntries(
    Object.entries(probs).map(([k, v]) => [k, Math.max(0, v) / total])
  );
}

/**
 * Normalize weights to sum to 1
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  return normalizeProbs(weights); // Same logic
}
