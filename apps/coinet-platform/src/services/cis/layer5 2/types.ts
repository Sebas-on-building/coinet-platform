/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 5 - CONTEXT-AWARE CLASSIFICATION                            ║
 * ║                                                                               ║
 * ║   PREVENTING CATEGORY MISTAKES                                                ║
 * ║                                                                               ║
 * ║   "Achieving accurate interpretation necessitates moving beyond generic      ║
 * ║    analysis and applying metrics only within their valid domains."           ║
 * ║                                                                               ║
 * ║   This layer ensures that only relevant, material metrics are passed to      ║
 * ║   the interpretation stage, removing interpretive bias before the AI sees    ║
 * ║   the data.                                                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const CIS_LAYER5_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Primary asset classification categories
 * Based on Bitcoin Suisse Global Crypto Taxonomy and similar frameworks
 */
export const AssetCategoryEnum = z.enum([
  'L1',              // Layer 1 blockchains (BTC, ETH, SOL)
  'L2',              // Layer 2 scaling (ARB, OP, MATIC)
  'DeFi_Lending',    // DeFi lending protocols (AAVE, COMP)
  'DeFi_DEX',        // Decentralized exchanges (UNI, SUSHI)
  'DeFi_Derivatives', // DeFi derivatives (GMX, DYDX)
  'DeFi_Yield',      // Yield aggregators (YFI, CVX)
  'DeFi_Other',      // Other DeFi (MKR, SNX)
  'Payments',        // Payment tokens (XRP, XLM, ALGO)
  'Utility',         // Utility tokens (LINK, GRT, FIL)
  'Infrastructure',  // Infrastructure (ATOM, DOT)
  'Exchange',        // Exchange tokens (BNB, CRO)
  'Meme',            // Meme coins (DOGE, SHIB, PEPE)
  'Stablecoin',      // Stablecoins (USDT, USDC, DAI)
  'Gaming',          // Gaming/Metaverse (AXS, SAND)
  'Privacy',         // Privacy coins (XMR, ZEC)
  'NFT',             // NFT platforms (APE, BLUR)
  'AI',              // AI tokens (FET, AGIX)
  'RWA',             // Real World Assets (ONDO, MAPLE)
  'Unknown',         // Unclassified
]);

export type AssetCategory = z.infer<typeof AssetCategoryEnum>;

/**
 * Broader sector groupings (for FSS compatibility)
 */
export const SectorGroupEnum = z.enum([
  'L1',
  'L2', 
  'DeFi',
  'Payment',
  'Utility',
  'Infrastructure',
  'Exchange',
  'Memecoin',
  'Stablecoin',
  'Gaming',
  'Privacy',
  'NFT',
  'AI',
  'RWA',
  'Unknown',
]);

export type SectorGroup = z.infer<typeof SectorGroupEnum>;

/**
 * Map detailed category to broader sector group
 */
export const CATEGORY_TO_SECTOR: Record<AssetCategory, SectorGroup> = {
  'L1': 'L1',
  'L2': 'L2',
  'DeFi_Lending': 'DeFi',
  'DeFi_DEX': 'DeFi',
  'DeFi_Derivatives': 'DeFi',
  'DeFi_Yield': 'DeFi',
  'DeFi_Other': 'DeFi',
  'Payments': 'Payment',
  'Utility': 'Utility',
  'Infrastructure': 'Infrastructure',
  'Exchange': 'Exchange',
  'Meme': 'Memecoin',
  'Stablecoin': 'Stablecoin',
  'Gaming': 'Gaming',
  'Privacy': 'Privacy',
  'NFT': 'NFT',
  'AI': 'AI',
  'RWA': 'RWA',
  'Unknown': 'Unknown',
};

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY CONFIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Identity confidence components
 */
export interface IdentityConfidenceComponents {
  /** Classification certainty (0-1): How confident are we in the category? */
  classification_certainty: number;
  
  /** Documentation quality (0-1): Is the asset well-documented? */
  documentation_quality: number;
  
  /** Provider agreement (0-1): Do data providers agree on identity? */
  provider_agreement: number;
  
  /** Historical consistency (0-1): Has classification been stable? */
  historical_consistency: number;
  
  /** Multi-faceted penalty (0-1): Lower if asset spans multiple categories */
  multi_faceted_penalty: number;
}

/**
 * Complete asset classification result
 */
export const AssetClassificationSchema = z.object({
  /** Canonical entity ID */
  entity_id: z.string(),
  
  /** Primary asset category */
  primary_category: AssetCategoryEnum,
  
  /** Secondary categories (if multi-faceted) */
  secondary_categories: z.array(AssetCategoryEnum),
  
  /** Sector group (for FSS compatibility) */
  sector_group: SectorGroupEnum,
  
  /** Identity confidence score (0-100) */
  identity_confidence: z.number().min(0).max(100),
  
  /** Identity confidence components */
  confidence_components: z.object({
    classification_certainty: z.number().min(0).max(1),
    documentation_quality: z.number().min(0).max(1),
    provider_agreement: z.number().min(0).max(1),
    historical_consistency: z.number().min(0).max(1),
    multi_faceted_penalty: z.number().min(0).max(1),
  }),
  
  /** Is this a well-known, high-confidence asset? */
  is_well_known: z.boolean(),
  
  /** Classification sources */
  sources: z.array(z.string()),
  
  /** Classification timestamp */
  classified_at: z.string().datetime(),
  
  /** Notes/reasoning */
  notes: z.string().optional(),
});

export type AssetClassification = z.infer<typeof AssetClassificationSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXTUAL METRIC RELEVANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Metric relevance for a specific asset category
 */
export type MetricRelevance = 
  | 'CRITICAL'      // Essential for this category
  | 'IMPORTANT'     // Highly relevant
  | 'RELEVANT'      // Useful but not essential
  | 'OPTIONAL'      // May provide context
  | 'NOT_APPLICABLE' // Should be excluded
  | 'FORBIDDEN';    // Must not be applied (semantic error)

/**
 * Contextual metric filter result
 */
export interface ContextualFilterResult {
  /** Entity ID */
  entity_id: string;
  
  /** Asset classification used */
  classification: AssetClassification;
  
  /** Metrics that passed contextual filtering */
  applicable_metrics: Array<{
    metric_id: string;
    relevance: MetricRelevance;
    weight_modifier: number;
  }>;
  
  /** Metrics excluded by contextual rules */
  excluded_metrics: Array<{
    metric_id: string;
    reason: string;
    would_be_relevance: MetricRelevance;
  }>;
  
  /** Priority metrics for this asset type */
  priority_metrics: string[];
  
  /** Coverage assessment */
  coverage: {
    critical_coverage: number;  // % of critical metrics present
    important_coverage: number; // % of important metrics present
    overall_coverage: number;   // Weighted coverage
  };
  
  /** Filter timestamp */
  filtered_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY-SPECIFIC METRIC PRIORITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Metric priority specification for a category
 */
export interface CategoryMetricPriority {
  /** Asset category */
  category: AssetCategory;
  
  /** Critical metrics (must have for scoring) */
  critical_metrics: string[];
  
  /** Important metrics (strongly recommended) */
  important_metrics: string[];
  
  /** Relevant metrics (useful) */
  relevant_metrics: string[];
  
  /** Not applicable metrics (exclude) */
  not_applicable_metrics: string[];
  
  /** Forbidden metrics (semantic error if applied) */
  forbidden_metrics: string[];
  
  /** Category-specific notes */
  notes: string;
}
