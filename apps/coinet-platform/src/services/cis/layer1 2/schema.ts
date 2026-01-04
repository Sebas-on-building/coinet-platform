/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ COINET INTERPRETATION SYSTEM (CIS) - LAYER 1                          ║
 * ║                                                                               ║
 * ║   CANONICAL DATA CONTRACT SPECIFICATION                                       ║
 * ║   "Zero Ambiguity Input"                                                      ║
 * ║                                                                               ║
 * ║   This layer establishes the fundamental contract for every single datapoint ║
 * ║   entering the Coinet ecosystem, eliminating the possibility of              ║
 * ║   interpretation errors arising from missing context.                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION CONTROL
// ═══════════════════════════════════════════════════════════════════════════════

export const CIS_LAYER1_VERSION = '1.0.0' as const;
export const SCHEMA_VERSION = 'CIS-L1-v1.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ENUMERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Direction enumeration - pre-defines the normative implication of the metric
 * This is the SCORING CONTRACT that determines contribution to QS/OS/Risk
 */
export const DirectionEnum = z.enum([
  'higher_is_better',   // e.g., TVL, active users, dev activity
  'higher_is_worse',    // e.g., concentration risk, unlock pressure
  'neutral',            // e.g., market cap (context-dependent)
]);
export type Direction = z.infer<typeof DirectionEnum>;

/**
 * Unit enumeration - standardizes magnitude and scale
 */
export const UnitEnum = z.enum([
  // Currency
  'USD',
  'BTC',
  'ETH',
  
  // Percentages
  'PERCENT',           // 0-100
  'RATIO',             // 0-1
  'BASIS_POINTS',      // 1bp = 0.01%
  
  // Counts
  'COUNT',             // Discrete count (users, txs)
  'TOKENS',            // Token quantity
  
  // Rates
  'TX_PER_DAY',
  'TX_PER_SECOND',
  'USERS_PER_DAY',
  
  // Time
  'SECONDS',
  'DAYS',
  'HOURS',
  
  // Scores
  'SCORE_0_100',       // Normalized score
  'SCORE_0_1',         // Normalized ratio
  'RAW_SCORE',         // Unscaled
  
  // Special
  'BOOLEAN',           // true/false encoded as 1/0
  'ORDINAL',           // Ranked categories
  'HASH',              // Hash/ID reference
]);
export type Unit = z.infer<typeof UnitEnum>;

/**
 * Validation status - result of Layer 4 checks
 */
export const ValidationStatusEnum = z.enum([
  'pass',              // All checks passed
  'warn',              // Minor issues, usable with caution
  'fail',              // Critical issues, must be rejected/gated
]);
export type ValidationStatus = z.infer<typeof ValidationStatusEnum>;

/**
 * Quality flags - specific issues detected
 */
export const QualityFlagEnum = z.enum([
  'fresh',             // Data is current
  'stale',             // Data exceeds freshness threshold
  'outlier',           // Statistical outlier detected
  'suspicious',        // Anomaly/manipulation signal
  'incomplete',        // Missing related data
  'derived',           // Calculated, not directly observed
  'interpolated',      // Gap-filled estimate
  'cross_validated',   // Verified against multiple sources
  'single_source',     // Only one provider
  'conflicting',       // Sources disagree
]);
export type QualityFlag = z.infer<typeof QualityFlagEnum>;

/**
 * Score category - which score this metric contributes to
 */
export const ScoreCategoryEnum = z.enum([
  'QS',                // Quality Score
  'OS',                // Opportunity Score
  'RISK',              // Risk Score
  'META',              // Metadata (not directly scored)
]);
export type ScoreCategory = z.infer<typeof ScoreCategoryEnum>;

/**
 * Data source type
 */
export const SourceTypeEnum = z.enum([
  'exchange_api',      // CEX/DEX API
  'blockchain_rpc',    // Direct chain query
  'aggregator',        // CoinGecko, CMC, etc.
  'defi_protocol',     // DefiLlama, etc.
  'social_api',        // Twitter, Discord, etc.
  'github_api',        // Development metrics
  'manual_entry',      // Human-curated
  'derived',           // Calculated from other metrics
  'oracle',            // Chainlink, Pyth, etc.
]);
export type SourceType = z.infer<typeof SourceTypeEnum>;

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL DATAPOINT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Provenance record - full audit trail for data origin
 */
export const ProvenanceSchema = z.object({
  /** Primary data source */
  source: z.string(),
  
  /** Source type classification */
  source_type: SourceTypeEnum,
  
  /** Timestamp when data was fetched/observed (ISO 8601) */
  observed_at: z.string().datetime(),
  
  /** Timestamp when data was ingested into CIS (ISO 8601) */
  ingested_at: z.string().datetime(),
  
  /** Source-reported timestamp (if available) */
  source_timestamp: z.string().datetime().nullable(),
  
  /** API endpoint or query used */
  query_ref: z.string().optional(),
  
  /** Fallback sources attempted (if primary failed) */
  fallback_chain: z.array(z.string()).optional(),
  
  /** Which fallback succeeded (index into fallback_chain) */
  fallback_used: z.number().int().min(0).nullable().optional(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * Derivation recipe - for calculated/synthetic metrics
 */
export const DerivationRecipeSchema = z.object({
  /** Recipe identifier (links to FSS Layer 2) */
  recipe_id: z.string(),
  
  /** Recipe version */
  recipe_version: z.string(),
  
  /** Input metric IDs used in calculation */
  input_metrics: z.array(z.string()),
  
  /** Mathematical formula (human-readable) */
  formula: z.string(),
  
  /** Formula in executable form (optional) */
  formula_code: z.string().optional(),
});
export type DerivationRecipe = z.infer<typeof DerivationRecipeSchema>;

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  CANONICAL DATAPOINT                                                        │
 * │                                                                             │
 * │  The fundamental unit of data in the Coinet ecosystem.                     │
 * │  Every single datapoint MUST conform to this schema.                       │
 * │  Rejection is MANDATORY if any required field is absent.                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */
export const CanonicalDatapointSchema = z.object({
  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTITY (MANDATORY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Stable, versioned metric identifier
   * Links to Feature Specification Sheet (FSS) in Layer 2
   * Format: {category}_{metric_name}_v{version}
   * Example: "qs_tvl_v1", "os_volume_24h_v2", "risk_concentration_v1"
   */
  metric_id: z.string().regex(
    /^(qs|os|risk|meta)_[a-z0-9_]+_v\d+$/,
    'metric_id must follow pattern: {category}_{name}_v{version}'
  ),
  
  /**
   * Canonical, exchange-agnostic asset identifier
   * Must resolve to Layer 5 classification
   * Format: coingecko ID or canonical internal ID
   */
  entity_id: z.string().min(1),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VALUE (MANDATORY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Observed value BEFORE any transformation
   * MUST be finite (no NaN, no Infinity)
   */
  raw_value: z.number().finite(),
  
  /**
   * Unit of measurement - defines magnitude and scale
   * MANDATORY for all mathematical operations
   */
  unit: UnitEnum,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SCORING CONTRACT (MANDATORY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Pre-computed scoring intent
   * Determines how this metric contributes to final scores
   */
  direction: DirectionEnum,
  
  /**
   * Which score category this metric feeds into
   */
  score_category: ScoreCategoryEnum,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVATION (CONDITIONAL)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Whether this is a derived/synthetic metric
   * If true, derivation_recipe MUST be present
   */
  is_derived: z.boolean(),
  
  /**
   * Derivation recipe for synthetic metrics
   * MANDATORY if is_derived === true
   */
  derivation_recipe: DerivationRecipeSchema.nullable(),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION (SET BY LAYER 4)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Result of Layer 4 validation checks
   * Determines Layer 6 confidence multiplier
   */
  validation_status: ValidationStatusEnum,
  
  /**
   * Specific quality issues detected
   */
  quality_flags: z.array(QualityFlagEnum),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROVENANCE (MANDATORY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Full audit trail for data origin
   */
  provenance: ProvenanceSchema,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT (OPTIONAL BUT RECOMMENDED)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Time window this metric covers
   * e.g., "24h", "7d", "30d", "spot"
   */
  time_window: z.string().optional(),
  
  /**
   * Comparable universe this was ranked against
   * e.g., "top_200", "sector_l1", "all"
   */
  comparable_universe: z.string().optional(),
  
  /**
   * Additional metadata (schema-free)
   */
  metadata: z.record(z.unknown()).optional(),
});

export type CanonicalDatapoint = z.infer<typeof CanonicalDatapointSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Batch of datapoints for a single entity
 */
export const EntityDataBundleSchema = z.object({
  /** Entity identifier */
  entity_id: z.string(),
  
  /** Bundle timestamp (ISO 8601) */
  bundle_timestamp: z.string().datetime(),
  
  /** Schema version used */
  schema_version: z.literal(SCHEMA_VERSION),
  
  /** All datapoints for this entity */
  datapoints: z.array(CanonicalDatapointSchema),
  
  /** Bundle-level validation summary */
  validation_summary: z.object({
    total_count: z.number().int().min(0),
    pass_count: z.number().int().min(0),
    warn_count: z.number().int().min(0),
    fail_count: z.number().int().min(0),
    coverage: z.number().min(0).max(1),
  }),
});

export type EntityDataBundle = z.infer<typeof EntityDataBundleSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a single datapoint (fail-closed policy)
 */
export function validateDatapoint(data: unknown): {
  success: true;
  datapoint: CanonicalDatapoint;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = CanonicalDatapointSchema.safeParse(data);
  
  if (result.success) {
    // Additional business rule validation
    const dp = result.data;
    
    // Rule: derived metrics MUST have derivation_recipe
    if (dp.is_derived && dp.derivation_recipe === null) {
      return {
        success: false,
        errors: new z.ZodError([{
          code: 'custom',
          message: 'Derived metrics must have derivation_recipe',
          path: ['derivation_recipe'],
        }]),
      };
    }
    
    // Rule: non-derived metrics MUST NOT have derivation_recipe
    if (!dp.is_derived && dp.derivation_recipe !== null) {
      return {
        success: false,
        errors: new z.ZodError([{
          code: 'custom',
          message: 'Non-derived metrics must not have derivation_recipe',
          path: ['derivation_recipe'],
        }]),
      };
    }
    
    return { success: true, datapoint: dp };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Validate a batch of datapoints (returns all valid + error report)
 */
export function validateDatapointBatch(datapoints: unknown[]): {
  valid: CanonicalDatapoint[];
  invalid: Array<{ index: number; data: unknown; errors: z.ZodError }>;
  stats: {
    total: number;
    valid: number;
    invalid: number;
    pass_rate: number;
  };
} {
  const valid: CanonicalDatapoint[] = [];
  const invalid: Array<{ index: number; data: unknown; errors: z.ZodError }> = [];
  
  for (let i = 0; i < datapoints.length; i++) {
    const result = validateDatapoint(datapoints[i]);
    if (result.success) {
      valid.push(result.datapoint);
    } else {
      invalid.push({ index: i, data: datapoints[i], errors: result.errors });
    }
  }
  
  return {
    valid,
    invalid,
    stats: {
      total: datapoints.length,
      valid: valid.length,
      invalid: invalid.length,
      pass_rate: datapoints.length > 0 ? valid.length / datapoints.length : 0,
    },
  };
}

/**
 * Create a canonical datapoint (factory with defaults)
 */
export function createDatapoint(
  params: {
    metric_id: string;
    entity_id: string;
    raw_value: number;
    unit: Unit;
    direction: Direction;
    score_category: ScoreCategory;
    source: string;
    source_type: SourceType;
    is_derived?: boolean;
    derivation_recipe?: DerivationRecipe | null;
    validation_status?: ValidationStatus;
    quality_flags?: QualityFlag[];
    time_window?: string;
    comparable_universe?: string;
    metadata?: Record<string, unknown>;
  }
): CanonicalDatapoint {
  const now = new Date().toISOString();
  
  return {
    metric_id: params.metric_id,
    entity_id: params.entity_id,
    raw_value: params.raw_value,
    unit: params.unit,
    direction: params.direction,
    score_category: params.score_category,
    is_derived: params.is_derived ?? false,
    derivation_recipe: params.derivation_recipe ?? null,
    validation_status: params.validation_status ?? 'pass',
    quality_flags: params.quality_flags ?? ['fresh'],
    provenance: {
      source: params.source,
      source_type: params.source_type,
      observed_at: now,
      ingested_at: now,
      source_timestamp: null,
    },
    time_window: params.time_window,
    comparable_universe: params.comparable_universe,
    metadata: params.metadata,
  };
}
