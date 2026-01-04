/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ COINET INTERPRETATION SYSTEM (CIS) - LAYER 2                          ║
 * ║                                                                               ║
 * ║   FEATURE SPECIFICATION SHEETS (FSS) - TYPES                                 ║
 * ║   "The Semantic Registry"                                                     ║
 * ║                                                                               ║
 * ║   The official "meaning bible" - transforms raw numerical data into          ║
 * ║   structured financial intelligence with full semantic contracts.            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import type { Direction, ScoreCategory, Unit } from '../layer1/schema';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION CONTROL
// ═══════════════════════════════════════════════════════════════════════════════

export const CIS_LAYER2_VERSION = '1.0.0' as const;
export const FSS_REGISTRY_VERSION = 'FSS-v1.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR CLASSIFICATION (Links to Layer 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asset sector classification - determines metric applicability
 */
export const SectorEnum = z.enum([
  'L1',              // Layer 1 blockchains
  'L2',              // Layer 2 scaling solutions
  'DeFi',            // DeFi protocols
  'Payment',         // Payment tokens
  'Exchange',        // Exchange tokens
  'Memecoin',        // Memecoins
  'Stablecoin',      // Stablecoins
  'Gaming',          // Gaming/Metaverse
  'Infrastructure',  // Infrastructure tokens
  'Privacy',         // Privacy coins
  'NFT',             // NFT platforms
  'AI',              // AI tokens
  'RWA',             // Real World Assets
  'Unknown',         // Unclassified
]);
export type Sector = z.infer<typeof SectorEnum>;

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalization method for raw_value → comparable metric
 */
export const NormalizationMethodEnum = z.enum([
  'percentile',           // Cross-sectional percentile rank
  'z_score',              // Standard score (μ=0, σ=1)
  'z_score_robust',       // MAD-based robust z-score
  'min_max',              // Linear scaling to [0, 1]
  'log_transform',        // log(1 + x) transform
  'winsorize',            // Clip extremes at percentile
  'rank',                 // Simple rank ordering
  'boolean',              // Binary 0/1
  'passthrough',          // No transformation
  'custom',               // Custom formula (specify in recipe)
]);
export type NormalizationMethod = z.infer<typeof NormalizationMethodEnum>;

/**
 * Normalization recipe - exact method for transformation
 */
export const NormalizationRecipeSchema = z.object({
  /** Primary normalization method */
  method: NormalizationMethodEnum,
  
  /** Winsorization bounds (if applicable) */
  winsorize_lower: z.number().min(0).max(50).optional(),
  winsorize_upper: z.number().min(50).max(100).optional(),
  
  /** Output range */
  output_min: z.number().default(0),
  output_max: z.number().default(100),
  
  /** Comparable universe for cross-sectional methods */
  comparable_universe: z.enum(['top_50', 'top_100', 'top_200', 'sector', 'all']),
  
  /** Custom formula (if method === 'custom') */
  custom_formula: z.string().optional(),
  
  /** Notes on transformation */
  notes: z.string().optional(),
});
export type NormalizationRecipe = z.infer<typeof NormalizationRecipeSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// FMEA INTEGRATION (Failure Mode Effects Analysis)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Failure mode types - what could go wrong
 */
export const FailureModeEnum = z.enum([
  'source_outage',           // Data provider is unavailable
  'stale_data',              // Data exceeds freshness threshold
  'cross_metric_inconsistency', // Conflicting values from multiple sources
  'outlier_detected',        // Value outside sanity bounds
  'semantic_mismatch',       // Metric applied to wrong asset type
  'derivation_failure',      // Calculation failed/invalid inputs
  'coverage_gap',            // Missing required related metrics
  'manipulation_signal',     // Suspected wash trading/fake data
  'schema_violation',        // Data doesn't match contract
]);
export type FailureMode = z.infer<typeof FailureModeEnum>;

/**
 * Severity classification - consequence of data failure
 * Based on MIL-STD-1629A FMEA severity categories
 */
export const SeverityEnum = z.enum([
  'catastrophic',   // Complete misinterpretation, could cause major financial loss
  'critical',       // Significant interpretation error, unreliable risk modeling
  'marginal',       // Minor interpretation degradation, reduced confidence
  'minor',          // Negligible impact, cosmetic issue
]);
export type Severity = z.infer<typeof SeverityEnum>;

/**
 * Compensation action - system reaction to failure
 */
export const CompensationActionEnum = z.enum([
  'exclude_metric',           // Remove from scoring entirely
  'gate_score',               // Block final score output
  'use_fallback',             // Switch to backup data source
  'use_prior',                // Use historical value with penalty
  'reduce_confidence',        // Apply confidence multiplier
  'flag_for_review',          // Allow through with warning
  'apply_sector_average',     // Use sector mean as substitute
  'hard_reject',              // Fail-closed, no score possible
]);
export type CompensationAction = z.infer<typeof CompensationActionEnum>;

/**
 * FMEA record for a specific failure mode
 */
export const FMEARecordSchema = z.object({
  /** Failure mode type */
  failure_mode: FailureModeEnum,
  
  /** Description of the failure scenario */
  description: z.string(),
  
  /** Severity of this failure */
  severity: SeverityEnum,
  
  /** Probability of occurrence (0-1) */
  occurrence_probability: z.number().min(0).max(1),
  
  /** Detection difficulty (1=easy, 10=hard) */
  detection_difficulty: z.number().int().min(1).max(10),
  
  /** Risk Priority Number (RPN) = severity × occurrence × detection */
  rpn: z.number().int().min(0),
  
  /** Compensation actions (in priority order) */
  compensation: z.array(CompensationActionEnum),
  
  /** Specific mitigation steps */
  mitigation_steps: z.array(z.string()),
  
  /** Example scenario */
  example: z.string().optional(),
});
export type FMEARecord = z.infer<typeof FMEARecordSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// SANITY BOUNDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanity bounds - non-negotiable hard limits
 */
export const SanityBoundsSchema = z.object({
  /** Absolute minimum (economically/mathematically impossible below) */
  hard_min: z.number().nullable(),
  
  /** Absolute maximum (economically/mathematically impossible above) */
  hard_max: z.number().nullable(),
  
  /** Statistical warning threshold (lower) */
  warn_min: z.number().nullable(),
  
  /** Statistical warning threshold (upper) */
  warn_max: z.number().nullable(),
  
  /** Rationale for bounds */
  rationale: z.string(),
});
export type SanityBounds = z.infer<typeof SanityBoundsSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE SPECIFICATION SHEET (FSS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  FEATURE SPECIFICATION SHEET (FSS)                                          │
 * │                                                                             │
 * │  A prescriptive document that NEVER changes silently.                      │
 * │  Every metric_id MUST have a corresponding FSS entry.                      │
 * │  This is the "meaning bible" for the Coinet ecosystem.                     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */
export const FeatureSpecificationSheetSchema = z.object({
  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Unique metric identifier (matches Layer 1 metric_id) */
  metric_id: z.string(),
  
  /** Human-readable name */
  name: z.string(),
  
  /** FSS version (for change tracking) */
  fss_version: z.string(),
  
  /** Last updated timestamp (ISO 8601) */
  last_updated: z.string().datetime(),
  
  /** Change log */
  changelog: z.array(z.object({
    version: z.string(),
    date: z.string(),
    changes: z.string(),
    author: z.string(),
  })),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC DEFINITION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Plain language explanation of what this metric measures */
  definition: z.string(),
  
  /** Why this metric matters for investors */
  investor_relevance: z.string(),
  
  /** Expected unit */
  expected_unit: z.string(),
  
  /** Scoring direction contract */
  direction: z.enum(['higher_is_better', 'higher_is_worse', 'neutral']),
  
  /** Which score category this feeds */
  score_category: z.enum(['QS', 'OS', 'RISK', 'META']),
  
  /** Base weight in category (before reliability adjustment) */
  base_weight: z.number().min(0).max(1),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SCOPE & APPLICABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Sectors where this metric is VALID and MEANINGFUL
   * If asset's sector is not in this list → metric is EXCLUDED
   * 
   * Example: TVL.allowed_sectors = ['DeFi', 'L1', 'L2']
   *          → XRP (Payment) has no TVL → EXCLUDE, not penalize
   */
  allowed_sectors: z.array(SectorEnum),
  
  /**
   * Sectors where this metric is EXPLICITLY FORBIDDEN
   * Applying to these sectors is a SEMANTIC ERROR
   */
  forbidden_sectors: z.array(SectorEnum),
  
  /**
   * Time window this metric covers
   */
  time_window: z.string(),
  
  /**
   * Geographic/chain scope
   */
  scope: z.enum(['global', 'chain_specific', 'cross_chain', 'region_specific']),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DATA SOURCES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Primary data source */
  primary_source: z.string(),
  
  /** Fallback sources (in priority order) */
  fallback_sources: z.array(z.string()),
  
  /** Maximum age before data is considered stale */
  staleness_threshold_seconds: z.number().int().min(0),
  
  /** Minimum sources required for high confidence */
  min_sources_for_confidence: z.number().int().min(1),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Normalization recipe */
  normalization: NormalizationRecipeSchema,
  
  /** Sanity bounds */
  sanity_bounds: SanityBoundsSchema,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FMEA (Failure Mode Effects Analysis)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Known failure modes and mitigations */
  fmea: z.array(FMEARecordSchema),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BEHAVIORAL CONTRACTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** What to do when metric is missing */
  when_missing: z.enum([
    'exclude_from_score',    // Don't penalize, just reduce coverage
    'use_sector_average',    // Substitute with sector mean
    'use_prior_value',       // Use last known value
    'gate_category',         // Block the entire category score
    'gate_final_score',      // Block final POS output
    'hard_reject',           // Cannot score at all
  ]),
  
  /** Confidence multiplier when available (0-1) */
  confidence_when_present: z.number().min(0).max(1),
  
  /** Confidence multiplier when missing (0-1) */
  confidence_when_missing: z.number().min(0).max(1),
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Implementation notes */
  implementation_notes: z.string().optional(),
  
  /** Known limitations */
  limitations: z.array(z.string()),
  
  /** Related metrics */
  related_metrics: z.array(z.string()),
  
  /** Academic/industry references */
  references: z.array(z.string()).optional(),
});

export type FeatureSpecificationSheet = z.infer<typeof FeatureSpecificationSheetSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// FSS REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete FSS Registry - all metric specifications
 */
export const FSSRegistrySchema = z.object({
  /** Registry version */
  version: z.string(),
  
  /** Last updated */
  last_updated: z.string().datetime(),
  
  /** All specifications indexed by metric_id */
  specifications: z.record(z.string(), FeatureSpecificationSheetSchema),
  
  /** Registry metadata */
  metadata: z.object({
    total_metrics: z.number().int().min(0),
    qs_metrics: z.number().int().min(0),
    os_metrics: z.number().int().min(0),
    risk_metrics: z.number().int().min(0),
    meta_metrics: z.number().int().min(0),
  }),
});

export type FSSRegistry = z.infer<typeof FSSRegistrySchema>;
