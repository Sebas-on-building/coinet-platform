/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 3 - MULTI-SOURCE RECONCILIATION                             ║
 * ║                                                                               ║
 * ║   ANTI-MANIPULATION CORE                                                      ║
 * ║                                                                               ║
 * ║   "In the cryptocurrency domain, high-impact metrics (price, supply,         ║
 * ║    volume, TVL) are notoriously susceptible to disagreement among data       ║
 * ║    providers due to latency, methodology, or outright manipulation."         ║
 * ║                                                                               ║
 * ║   This layer ensures the system will NOT confidently output an analysis      ║
 * ║   based on one compromised or outlier feed.                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const CIS_LAYER3_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE TRUST TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Source provider identifier
 */
export type SourceProvider = 
  | 'coingecko'
  | 'coinmarketcap'
  | 'defillama'
  | 'messari'
  | 'santiment'
  | 'glassnode'
  | 'kaiko'
  | 'cryptoquant'
  | 'dune'
  | 'tokenterminal'
  | 'github'
  | 'chain_rpc'
  | 'manual'
  | 'aggregated' // Added for reconciliation results
  | string; // Allow custom providers

/**
 * Trust score components for a source
 */
export interface SourceTrustComponents {
  /** Historical consistency against aggregated mean (0-1) */
  consistency: number;
  
  /** API uptime percentage (0-1) */
  uptime: number;
  
  /** Average response latency penalty (0-1, 1=fast) */
  latency_score: number;
  
  /** Frequency of corrections/restatements (0-1, 1=no corrections) */
  correction_frequency: number;
  
  /** Adherence to Layer 1 contracts (0-1) */
  contract_adherence: number;
  
  /** Manual override/reputation factor (0-1) */
  reputation: number;
}

/**
 * Dynamic trust score for a source
 */
export const SourceTrustSchema = z.object({
  /** Provider identifier */
  provider: z.string(),
  
  /** Initial/base trust score T₀ (0-1) */
  base_trust: z.number().min(0).max(1),
  
  /** Current dynamic trust score Tᵢ (0-1) */
  current_trust: z.number().min(0).max(1),
  
  /** Trust score components */
  components: z.object({
    consistency: z.number().min(0).max(1),
    uptime: z.number().min(0).max(1),
    latency_score: z.number().min(0).max(1),
    correction_frequency: z.number().min(0).max(1),
    contract_adherence: z.number().min(0).max(1),
    reputation: z.number().min(0).max(1),
  }),
  
  /** Number of observations used to compute consistency */
  observation_count: z.number().int().min(0),
  
  /** Last updated timestamp */
  last_updated: z.string().datetime(),
  
  /** Trust trend (improving/stable/degrading) */
  trend: z.enum(['improving', 'stable', 'degrading']),
});

export type SourceTrust = z.infer<typeof SourceTrustSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single source report for a metric
 */
export interface SourceReport {
  /** Source provider */
  provider: SourceProvider;
  
  /** Metric ID for this report */
  metric_id: string; // Added metric_id
  
  /** Entity ID for this report */
  entity_id: string; // Added entity_id
  
  /** Reported raw value */
  value: number;
  
  /** Timestamp of observation */
  timestamp: string;
  
  /** Source's current trust score */
  trust_score: number;
  
  /** Explicit confidence score provided by source */
  confidence_score: number; // Added explicit confidence score
  
  /** Latency from source (ms) */
  latency_ms: number;
  
  /** Any warnings from this source */
  warnings: string[];
}

/**
 * Reconciliation method used
 */
export type ReconciliationMethod = 
  | 'WTM'              // Weighted Trimmed Mean (default)
  | 'MEDIAN'           // Simple median (fallback)
  | 'SINGLE_SOURCE'    // Only one source available
  | 'MANUAL_OVERRIDE'
  | 'NONE';            // No sources or insufficient sources

/**
 * Dispute status
 */
export type DisputeStatus = 
  | 'AGREED'           // Sources agree (Agreement Score ≥ threshold)
  | 'MINOR_DISPUTE'    // Small disagreement (0.95 ≤ AS < threshold)
  | 'DISPUTED'         // Significant disagreement (AS < 0.95)
  | 'SEVERE_DISPUTE'   // Extreme disagreement (AS < 0.90)
  | 'INSUFFICIENT_SOURCES'; // Not enough sources to reconcile

/**
 * Reconciliation result for a single metric
 */
export const ReconciliationResultSchema = z.object({
  /** Metric identifier */
  metric_id: z.string(),
  
  /** Entity identifier */
  entity_id: z.string(),
  
  /** Reconciled value (WTM) */
  reconciled_value: z.number(),
  
  /** Method used for reconciliation */
  method: z.enum(['WTM', 'MEDIAN', 'SINGLE_SOURCE', 'MANUAL_OVERRIDE', 'NONE']),
  
  /** Number of sources that reported */
  source_count: z.number().int().min(0),
  
  /** Number of sources after trimming */
  sources_after_trim: z.number().int().min(0),
  
  /** Trimming percentage used (α) */
  trim_percentage: z.number().min(0).max(0.5),
  
  /** Raw statistics */
  statistics: z.object({
    min: z.number(),
    max: z.number(),
    mean: z.number(),
    median: z.number(),
    std_dev: z.number(),
    spread: z.number(),
    spread_percentage: z.number(),
  }),
  
  /** Agreement Score = 1 - (Spread / WTM) */
  agreement_score: z.number().min(0).max(1),
  
  /** Agreement threshold for this metric */
  agreement_threshold: z.number().min(0).max(1),
  
  /** Dispute status */
  dispute_status: z.enum(['AGREED', 'MINOR_DISPUTE', 'DISPUTED', 'SEVERE_DISPUTE', 'INSUFFICIENT_SOURCES']),
  
  /** Confidence multiplier based on reconciliation quality */
  confidence_multiplier: z.number().min(0).max(1),
  
  /** Should this metric be excluded from scoring? */
  exclude_from_scoring: z.boolean(),
  
  /** Timestamp of reconciliation */
  reconciled_at: z.string().datetime(),
  
  /** Full audit trail of all source reports */
  audit_trail: z.array(z.object({
    provider: z.string(),
    value: z.number(),
    timestamp: z.string(),
    trust_score: z.number(),
    included_in_wtm: z.boolean(),
    trim_reason: z.string().nullable(),
  })),
  
  /** Reports that were trimmed */
  trimmed_reports: z.array(z.object({
    report: z.object({
      provider: z.string(),
      metric_id: z.string(),
      entity_id: z.string(),
      value: z.number(),
      timestamp: z.string(),
      trust_score: z.number(),
      confidence_score: z.number(),
      latency_ms: z.number(),
      warnings: z.array(z.string()),
    }),
    reason: z.string(),
  })).optional(), // Made optional
});

export type ReconciliationResult = z.infer<typeof ReconciliationResultSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reconciliation configuration per metric category
 */
export interface ReconciliationConfig {
  /** Metric category */
  category: 'price' | 'volume' | 'supply' | 'tvl' | 'general';
  
  /** Trim percentage α (fraction to remove from each tail) */
  trim_alpha: number;
  
  /** Agreement threshold (below this → DISPUTED) */
  agreement_threshold: number;
  
  /** Minimum sources required */
  min_sources: number;
  
  /** Whether to gate on dispute */
  gate_on_dispute: boolean;
  
  /** Staleness threshold (seconds) */
  staleness_threshold_seconds: number;
}

/**
 * Default configurations for high-impact metrics
 */
export const RECONCILIATION_CONFIGS: Record<string, ReconciliationConfig> = {
  price: {
    category: 'price',
    trim_alpha: 0.05,          // 5% trim from each tail
    agreement_threshold: 0.98, // 98% agreement required
    min_sources: 2,
    gate_on_dispute: true,     // Critical - gate if disputed
    staleness_threshold_seconds: 60, // 1 minute max
  },
  volume: {
    category: 'volume',
    trim_alpha: 0.10,          // 10% trim (volume varies more)
    agreement_threshold: 0.90, // 90% agreement
    min_sources: 2,
    gate_on_dispute: false,    // Warn but don't gate
    staleness_threshold_seconds: 300, // 5 minutes
  },
  supply: {
    category: 'supply',
    trim_alpha: 0.05,
    agreement_threshold: 0.995, // 99.5% - supply should be exact
    min_sources: 2,
    gate_on_dispute: true,
    staleness_threshold_seconds: 3600, // 1 hour
  },
  tvl: {
    category: 'tvl',
    trim_alpha: 0.10,
    agreement_threshold: 0.85, // TVL methodologies differ
    min_sources: 1,            // Often only DefiLlama
    gate_on_dispute: false,
    staleness_threshold_seconds: 600, // 10 minutes
  },
  general: {
    category: 'general',
    trim_alpha: 0.10,
    agreement_threshold: 0.80,
    min_sources: 1,
    gate_on_dispute: false,
    staleness_threshold_seconds: 3600,
  },
};

/**
 * Default reconciliation config for metrics not explicitly defined
 */
export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = RECONCILIATION_CONFIGS.general;

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE TRUST DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default trust scores for known providers (T₀)
 */
export const DEFAULT_SOURCE_TRUST: Record<SourceProvider, number> = {
  coingecko: 0.90,
  coinmarketcap: 0.85,
  defillama: 0.95,      // Gold standard for TVL
  messari: 0.88,
  santiment: 0.85,
  glassnode: 0.92,      // High quality on-chain
  kaiko: 0.94,          // Institutional grade
  cryptoquant: 0.90,
  dune: 0.82,           // Community queries vary
  tokenterminal: 0.88,
  github: 0.95,         // Direct source
  chain_rpc: 0.98,      // Direct blockchain
  manual: 0.70,         // Human input
  aggregated: 1.00,     // Internal reconciliation result
};
