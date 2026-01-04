/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 FEATURE TYPES                                                          ║
 * ║                                                                               ║
 * ║   Base types for all OmniScore features.                                     ║
 * ║   Each feature = one file, one function, one test.                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { DataPoint, Segment } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export type FeatureCategory = 'qs' | 'os' | 'risk';

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result from computing a single feature
 */
export interface FeatureResult {
  /** Feature identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Category (qs/os/risk) */
  category: FeatureCategory;
  
  /** Raw computed value (in feature's native unit) */
  raw: number | null;
  
  /** Normalized score (0-100) */
  normalized: number | null;
  
  /** Weight in its category (0-1) */
  weight: number;
  
  /** Contribution to category score */
  contribution: number | null;
  
  /** Whether this feature could be computed */
  available: boolean;
  
  /** Data quality */
  quality: {
    /** Coverage: what % of required inputs were present */
    coverage: number;
    /** Freshness: average age of inputs in hours */
    freshnessHours: number;
    /** Confidence: reliability of the result (0-1) */
    confidence: number;
  };
  
  /** Input data points used */
  inputs: string[];
  
  /** Missing required inputs */
  missing: string[];
  
  /** Warnings about data quality or edge cases */
  warnings: string[];
  
  /** Debug: computation details */
  debug?: {
    formula?: string;
    intermediates?: Record<string, number>;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Static metadata about a feature
 */
export interface FeatureDefinition {
  /** Unique identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Category */
  category: FeatureCategory;
  
  /** Description of what this measures */
  description: string;
  
  /** Which segment this contributes to */
  segment: Segment;
  
  /** Default weight (can be overridden) */
  defaultWeight: number;
  
  /** Required data point keys */
  requiredInputs: string[];
  
  /** Optional data point keys */
  optionalInputs: string[];
  
  /** How often this feature should be recomputed */
  updateFrequencyHours: number;
  
  /** Whether higher raw value = better score */
  higherIsBetter: boolean;
  
  /** Normalization config */
  normalization: {
    method: 'linear' | 'log' | 'sigmoid' | 'percentile' | 'custom';
    min?: number;
    max?: number;
    median?: number;
    scale?: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FUNCTION TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input context for computing a feature
 */
export interface FeatureContext {
  /** All available data points */
  dataPoints: DataPoint[];
  
  /** Quick lookup by key */
  dataByKey: Map<string, DataPoint>;
  
  /** Timestamp of computation */
  timestamp: Date;
  
  /** Optional: previous feature result for trend analysis */
  previous?: FeatureResult;
}

/**
 * Type signature for a feature computation function
 */
export type FeatureFunction = (ctx: FeatureContext) => FeatureResult;

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE REGISTRY ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete feature entry in the registry
 */
export interface Feature {
  definition: FeatureDefinition;
  compute: FeatureFunction;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a data point value from context
 */
export function getDataValue(ctx: FeatureContext, key: string): number | null {
  const dp = ctx.dataByKey.get(key);
  return dp?.raw ?? null;
}

/**
 * Get multiple data values
 */
export function getDataValues(
  ctx: FeatureContext, 
  keys: string[]
): Map<string, number | null> {
  const result = new Map<string, number | null>();
  for (const key of keys) {
    result.set(key, getDataValue(ctx, key));
  }
  return result;
}

/**
 * Check if required inputs are present
 */
export function checkRequiredInputs(
  ctx: FeatureContext,
  required: string[]
): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];
  
  for (const key of required) {
    const value = getDataValue(ctx, key);
    if (value !== null) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }
  
  return { present, missing };
}

/**
 * Calculate data freshness in hours
 */
export function calculateFreshnessHours(ctx: FeatureContext, keys: string[]): number {
  const now = ctx.timestamp.getTime();
  let totalHours = 0;
  let count = 0;
  
  for (const key of keys) {
    const dp = ctx.dataByKey.get(key);
    if (dp) {
      const age = (now - new Date(dp.timestamp).getTime()) / (1000 * 60 * 60);
      totalHours += age;
      count++;
    }
  }
  
  return count > 0 ? totalHours / count : Infinity;
}

/**
 * Calculate average confidence from data points
 */
export function calculateConfidence(ctx: FeatureContext, keys: string[]): number {
  let totalConfidence = 0;
  let count = 0;
  
  for (const key of keys) {
    const dp = ctx.dataByKey.get(key);
    if (dp && dp.raw !== null) {
      totalConfidence += dp.confidenceSource;
      count++;
    }
  }
  
  return count > 0 ? totalConfidence / count : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Linear normalization to 0-100
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
 * Logarithmic normalization to 0-100
 */
export function normalizeLog(
  value: number,
  min: number,
  max: number,
  invert: boolean = false
): number {
  if (value <= 0 || min <= 0 || max <= min) return invert ? 100 : 0;
  
  const logValue = Math.log10(value);
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  
  if (logMax === logMin) return 50;
  
  const normalized = ((logValue - logMin) / (logMax - logMin)) * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  return invert ? 100 - clamped : clamped;
}

/**
 * Sigmoid normalization to 0-100
 */
export function normalizeSigmoid(
  value: number,
  median: number,
  scale: number,
  invert: boolean = false
): number {
  const x = (value - median) / scale;
  const sigmoid = 1 / (1 + Math.exp(-x));
  const normalized = sigmoid * 100;
  return invert ? 100 - normalized : normalized;
}

/**
 * Create an empty/unavailable feature result
 */
export function createUnavailableResult(
  definition: FeatureDefinition,
  missing: string[],
  warning?: string
): FeatureResult {
  return {
    id: definition.id,
    name: definition.name,
    category: definition.category,
    raw: null,
    normalized: null,
    weight: definition.defaultWeight,
    contribution: null,
    available: false,
    quality: {
      coverage: 0,
      freshnessHours: Infinity,
      confidence: 0,
    },
    inputs: [],
    missing,
    warnings: warning ? [warning] : ['Required data not available'],
  };
}
