/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 5 - ASSET TAXONOMY                                          ║
 * ║                                                                               ║
 * ║   IDENTITY CONFIDENCE & CLASSIFICATION                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  AssetCategory,
  SectorGroup,
  AssetClassification,
  IdentityConfidenceComponents,
  CategoryMetricPriority,
} from './types';
import { CATEGORY_TO_SECTOR } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// WELL-KNOWN ASSET CLASSIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-defined classifications for well-known assets
 * These have high identity confidence by default
 */
export const WELL_KNOWN_CLASSIFICATIONS: Record<string, {
  category: AssetCategory;
  secondary?: AssetCategory[];
  confidence: number;
}> = {
  // === L1 Blockchains ===
  'bitcoin': { category: 'L1', confidence: 100 },
  'ethereum': { category: 'L1', secondary: ['DeFi_Other'], confidence: 100 },
  'solana': { category: 'L1', confidence: 100 },
  'cardano': { category: 'L1', confidence: 100 },
  'avalanche-2': { category: 'L1', confidence: 100 },
  'polkadot': { category: 'Infrastructure', secondary: ['L1'], confidence: 98 },
  'near': { category: 'L1', confidence: 98 },
  'cosmos': { category: 'Infrastructure', secondary: ['L1'], confidence: 98 },
  'aptos': { category: 'L1', confidence: 95 },
  'sui': { category: 'L1', confidence: 95 },
  'toncoin': { category: 'L1', confidence: 95 },
  
  // === L2 Scaling ===
  'arbitrum': { category: 'L2', confidence: 100 },
  'optimism': { category: 'L2', confidence: 100 },
  'matic-network': { category: 'L2', confidence: 98 },
  'immutable-x': { category: 'L2', secondary: ['Gaming'], confidence: 95 },
  'starknet': { category: 'L2', confidence: 95 },
  
  // === DeFi - Lending ===
  'aave': { category: 'DeFi_Lending', confidence: 100 },
  'compound-governance-token': { category: 'DeFi_Lending', confidence: 100 },
  
  // === DeFi - DEX ===
  'uniswap': { category: 'DeFi_DEX', confidence: 100 },
  'curve-dao-token': { category: 'DeFi_DEX', secondary: ['DeFi_Yield'], confidence: 98 },
  'pancakeswap-token': { category: 'DeFi_DEX', confidence: 98 },
  'jupiter': { category: 'DeFi_DEX', confidence: 95 },
  'raydium': { category: 'DeFi_DEX', confidence: 95 },
  'sushiswap': { category: 'DeFi_DEX', confidence: 98 },
  
  // === DeFi - Other ===
  'maker': { category: 'DeFi_Other', secondary: ['DeFi_Lending'], confidence: 100 },
  'lido-dao': { category: 'DeFi_Other', confidence: 100 },
  'synthetix-network-token': { category: 'DeFi_Derivatives', confidence: 98 },
  
  // === Payment Tokens ===
  'ripple': { category: 'Payments', confidence: 100 },
  'stellar': { category: 'Payments', confidence: 100 },
  'algorand': { category: 'Payments', secondary: ['L1'], confidence: 95 },
  'hedera-hashgraph': { category: 'Payments', secondary: ['L1'], confidence: 92 },
  'litecoin': { category: 'Payments', secondary: ['L1'], confidence: 95 },
  
  // === Utility / Infrastructure ===
  'chainlink': { category: 'Infrastructure', confidence: 100 },
  'the-graph': { category: 'Infrastructure', confidence: 98 },
  'filecoin': { category: 'Infrastructure', confidence: 98 },
  'render-token': { category: 'Infrastructure', secondary: ['AI'], confidence: 95 },
  'arweave': { category: 'Infrastructure', confidence: 95 },
  
  // === Exchange Tokens ===
  'binancecoin': { category: 'Exchange', secondary: ['L1'], confidence: 100 },
  'crypto-com-chain': { category: 'Exchange', confidence: 98 },
  'okb': { category: 'Exchange', confidence: 95 },
  'kucoin-shares': { category: 'Exchange', confidence: 95 },
  'leo-token': { category: 'Exchange', confidence: 95 },
  
  // === Meme Coins ===
  'dogecoin': { category: 'Meme', secondary: ['Payments'], confidence: 100 },
  'shiba-inu': { category: 'Meme', confidence: 100 },
  'pepe': { category: 'Meme', confidence: 100 },
  'floki': { category: 'Meme', confidence: 98 },
  'bonk': { category: 'Meme', confidence: 98 },
  'dogwifcoin': { category: 'Meme', confidence: 95 },
  
  // === Stablecoins ===
  'tether': { category: 'Stablecoin', confidence: 100 },
  'usd-coin': { category: 'Stablecoin', confidence: 100 },
  'dai': { category: 'Stablecoin', secondary: ['DeFi_Other'], confidence: 100 },
  'true-usd': { category: 'Stablecoin', confidence: 95 },
  'frax': { category: 'Stablecoin', secondary: ['DeFi_Other'], confidence: 95 },
  
  // === Gaming ===
  'axie-infinity': { category: 'Gaming', confidence: 100 },
  'the-sandbox': { category: 'Gaming', confidence: 100 },
  'decentraland': { category: 'Gaming', confidence: 100 },
  'gala': { category: 'Gaming', confidence: 95 },
  'illuvium': { category: 'Gaming', confidence: 95 },
  
  // === Privacy ===
  'monero': { category: 'Privacy', confidence: 100 },
  'zcash': { category: 'Privacy', confidence: 100 },
  
  // === AI ===
  'fetch-ai': { category: 'AI', secondary: ['Infrastructure'], confidence: 95 },
  'singularitynet': { category: 'AI', confidence: 95 },
  'ocean-protocol': { category: 'AI', secondary: ['Infrastructure'], confidence: 92 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY-SPECIFIC METRIC PRIORITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Metric priorities for each asset category
 */
export const CATEGORY_METRIC_PRIORITIES: CategoryMetricPriority[] = [
  // === L1 Blockchains ===
  {
    category: 'L1',
    critical_metrics: [
      'qs_security_posture_v1',
      'qs_decentralization_v1',
      'qs_adoption_v1',
    ],
    important_metrics: [
      'qs_dev_delivery_v1',
      'qs_ecosystem_depth_v1',
      'os_liquidity_depth_v1',
      'os_volume_quality_v1',
      'risk_concentration_v1',
    ],
    relevant_metrics: [
      'qs_tvl_v1',
      'os_momentum_v1',
      'os_volatility_regime_v1',
      'risk_data_integrity_v1',
    ],
    not_applicable_metrics: [],
    forbidden_metrics: [],
    notes: 'L1 blockchains require strong decentralization and security metrics.',
  },
  
  // === L2 Scaling ===
  {
    category: 'L2',
    critical_metrics: [
      'qs_adoption_v1',
      'qs_dev_delivery_v1',
      'qs_ecosystem_depth_v1',
    ],
    important_metrics: [
      'qs_security_posture_v1',
      'qs_tvl_v1',
      'os_liquidity_depth_v1',
      'risk_admin_privilege_v1',
    ],
    relevant_metrics: [
      'os_momentum_v1',
      'os_volume_quality_v1',
      'risk_concentration_v1',
    ],
    not_applicable_metrics: [
      'qs_decentralization_v1', // L2s inherit from L1
    ],
    forbidden_metrics: [],
    notes: 'L2s inherit decentralization from L1. Focus on adoption and ecosystem.',
  },
  
  // === DeFi (all subcategories) ===
  {
    category: 'DeFi_Lending',
    critical_metrics: [
      'qs_tvl_v1',
      'qs_security_posture_v1',
      'qs_sustainability_v1',
    ],
    important_metrics: [
      'qs_adoption_v1',
      'os_liquidity_depth_v1',
      'risk_admin_privilege_v1',
      'risk_incident_v1',
    ],
    relevant_metrics: [
      'qs_dev_delivery_v1',
      'os_volume_quality_v1',
      'risk_concentration_v1',
    ],
    not_applicable_metrics: [
      'qs_decentralization_v1',
    ],
    forbidden_metrics: [],
    notes: 'DeFi lending requires strong TVL and security metrics.',
  },
  {
    category: 'DeFi_DEX',
    critical_metrics: [
      'qs_tvl_v1',
      'os_liquidity_depth_v1',
      'os_volume_quality_v1',
    ],
    important_metrics: [
      'qs_security_posture_v1',
      'qs_adoption_v1',
      'risk_admin_privilege_v1',
    ],
    relevant_metrics: [
      'qs_dev_delivery_v1',
      'os_momentum_v1',
      'risk_incident_v1',
    ],
    not_applicable_metrics: [
      'qs_decentralization_v1',
    ],
    forbidden_metrics: [],
    notes: 'DEXs require liquidity and volume quality metrics.',
  },
  
  // === Payment Tokens ===
  {
    category: 'Payments',
    critical_metrics: [
      'qs_adoption_v1',        // Settlement usage / tx count
      'os_liquidity_depth_v1', // Liquidity for payments
    ],
    important_metrics: [
      'qs_security_posture_v1',
      'os_volume_quality_v1',
      'risk_concentration_v1',
    ],
    relevant_metrics: [
      'os_momentum_v1',
      'risk_data_integrity_v1',
    ],
    not_applicable_metrics: [
      'qs_tvl_v1',              // TVL is NOT applicable to payments
      'qs_ecosystem_depth_v1', // No ecosystem for payments
      'qs_sustainability_v1',  // Different model
      'qs_dev_delivery_v1',    // Often closed development
    ],
    forbidden_metrics: [
      'qs_decentralization_v1', // Not meaningful for payment rails
    ],
    notes: 'Payment tokens: TVL is irrelevant. Focus on adoption, liquidity, settlement.',
  },
  
  // === Exchange Tokens ===
  {
    category: 'Exchange',
    critical_metrics: [
      'qs_adoption_v1',
      'os_liquidity_depth_v1',
    ],
    important_metrics: [
      'os_volume_quality_v1',
      'risk_concentration_v1',
    ],
    relevant_metrics: [
      'os_momentum_v1',
      'risk_data_integrity_v1',
    ],
    not_applicable_metrics: [
      'qs_tvl_v1',
      'qs_dev_delivery_v1',      // Internal development
      'qs_decentralization_v1', // Centralized by design
      'qs_ecosystem_depth_v1',
      'qs_sustainability_v1',
    ],
    forbidden_metrics: [],
    notes: 'Exchange tokens: Development is internal. Focus on exchange usage.',
  },
  
  // === Meme Coins ===
  {
    category: 'Meme',
    critical_metrics: [
      'qs_adoption_v1',  // Community size
    ],
    important_metrics: [
      'os_liquidity_depth_v1',
      'os_volume_quality_v1',
      'risk_concentration_v1',
    ],
    relevant_metrics: [
      'os_momentum_v1',
      'os_volatility_regime_v1',
    ],
    not_applicable_metrics: [
      'qs_security_posture_v1',
      'qs_dev_delivery_v1',
      'qs_ecosystem_depth_v1',
      'qs_sustainability_v1',
      'qs_tvl_v1',
      'qs_decentralization_v1',
      'risk_unlock_v1',         // Usually fully circulating
      'risk_admin_privilege_v1',
    ],
    forbidden_metrics: [],
    notes: 'Meme coins: Most QS metrics are not applicable. Focus on adoption and liquidity.',
  },
  
  // === Stablecoins ===
  {
    category: 'Stablecoin',
    critical_metrics: [
      'qs_security_posture_v1', // Peg stability
      'qs_adoption_v1',
    ],
    important_metrics: [
      'os_liquidity_depth_v1',
      'risk_concentration_v1',
    ],
    relevant_metrics: [
      'risk_data_integrity_v1',
    ],
    not_applicable_metrics: [
      'qs_tvl_v1',
      'qs_dev_delivery_v1',
      'qs_ecosystem_depth_v1',
      'qs_sustainability_v1',
      'qs_decentralization_v1',
      'os_momentum_v1',          // No momentum for stables
      'os_volatility_regime_v1', // Should be 0
      'os_flow_signals_v1',
      'risk_unlock_v1',
    ],
    forbidden_metrics: [],
    notes: 'Stablecoins: Peg stability is critical. Momentum/volatility are meaningless.',
  },
  
  // === Infrastructure ===
  {
    category: 'Infrastructure',
    critical_metrics: [
      'qs_adoption_v1',
      'qs_dev_delivery_v1',
    ],
    important_metrics: [
      'qs_ecosystem_depth_v1',
      'qs_security_posture_v1',
      'os_liquidity_depth_v1',
    ],
    relevant_metrics: [
      'os_volume_quality_v1',
      'os_momentum_v1',
      'risk_concentration_v1',
    ],
    not_applicable_metrics: [
      'qs_tvl_v1',
      'qs_decentralization_v1',
    ],
    forbidden_metrics: [],
    notes: 'Infrastructure: Focus on adoption and development activity.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get well-known classification for an asset
 */
export function getWellKnownClassification(entityId: string): {
  category: AssetCategory;
  secondary: AssetCategory[];
  confidence: number;
} | null {
  const normalized = entityId.toLowerCase();
  const known = WELL_KNOWN_CLASSIFICATIONS[normalized];
  
  if (known) {
    return {
      category: known.category,
      secondary: known.secondary ?? [],
      confidence: known.confidence,
    };
  }
  
  return null;
}

/**
 * Calculate identity confidence from components
 */
export function calculateIdentityConfidence(
  components: IdentityConfidenceComponents
): number {
  const weights = {
    classification_certainty: 0.35,
    documentation_quality: 0.20,
    provider_agreement: 0.20,
    historical_consistency: 0.15,
    multi_faceted_penalty: 0.10,
  };
  
  let confidence = 0;
  confidence += components.classification_certainty * weights.classification_certainty;
  confidence += components.documentation_quality * weights.documentation_quality;
  confidence += components.provider_agreement * weights.provider_agreement;
  confidence += components.historical_consistency * weights.historical_consistency;
  confidence += components.multi_faceted_penalty * weights.multi_faceted_penalty;
  
  return Math.round(confidence * 100);
}

/**
 * Classify an asset
 */
export function classifyAsset(
  entityId: string,
  hints?: {
    providerCategories?: string[];
    tags?: string[];
    hasSmartContracts?: boolean;
    hasTVL?: boolean;
    isStable?: boolean;
  }
): AssetClassification {
  const now = new Date().toISOString();
  
  // Check well-known classifications first
  const wellKnown = getWellKnownClassification(entityId);
  
  if (wellKnown) {
    const sector = CATEGORY_TO_SECTOR[wellKnown.category];
    
    return {
      entity_id: entityId,
      primary_category: wellKnown.category,
      secondary_categories: wellKnown.secondary,
      sector_group: sector,
      identity_confidence: wellKnown.confidence,
      confidence_components: {
        classification_certainty: wellKnown.confidence / 100,
        documentation_quality: 0.95,
        provider_agreement: 1.0,
        historical_consistency: 1.0,
        multi_faceted_penalty: wellKnown.secondary.length > 0 ? 0.9 : 1.0,
      },
      is_well_known: true,
      sources: ['well_known_registry'],
      classified_at: now,
    };
  }
  
  // Heuristic classification for unknown assets
  let category: AssetCategory = 'Unknown';
  let confidence = 50;
  const secondary: AssetCategory[] = [];
  
  // Use hints if available
  if (hints) {
    if (hints.isStable) {
      category = 'Stablecoin';
      confidence = 80;
    } else if (hints.hasTVL && hints.hasSmartContracts) {
      category = 'DeFi_Other';
      confidence = 70;
    } else if (hints.tags?.some(t => t.toLowerCase().includes('meme'))) {
      category = 'Meme';
      confidence = 75;
    } else if (hints.tags?.some(t => t.toLowerCase().includes('gaming'))) {
      category = 'Gaming';
      confidence = 70;
    }
  }
  
  const sector = CATEGORY_TO_SECTOR[category];
  
  return {
    entity_id: entityId,
    primary_category: category,
    secondary_categories: secondary,
    sector_group: sector,
    identity_confidence: confidence,
    confidence_components: {
      classification_certainty: confidence / 100,
      documentation_quality: 0.5,
      provider_agreement: 0.6,
      historical_consistency: 0.5,
      multi_faceted_penalty: 1.0,
    },
    is_well_known: false,
    sources: ['heuristic_classification'],
    classified_at: now,
    notes: 'Classification inferred from heuristics. May require manual review.',
  };
}

/**
 * Get metric priorities for a category
 */
export function getMetricPriorities(category: AssetCategory): CategoryMetricPriority | null {
  // Check for exact match
  let priority = CATEGORY_METRIC_PRIORITIES.find(p => p.category === category);
  
  if (priority) return priority;
  
  // Check for DeFi subcategories
  if (category.startsWith('DeFi_')) {
    priority = CATEGORY_METRIC_PRIORITIES.find(p => p.category === 'DeFi_Lending');
    if (priority) return priority;
  }
  
  return null;
}

/**
 * Get sector group from category
 */
export function getSectorFromCategory(category: AssetCategory): SectorGroup {
  return CATEGORY_TO_SECTOR[category];
}
