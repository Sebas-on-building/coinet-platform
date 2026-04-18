/**
 * Pre-L5 Integrated Certification — Golden Cases
 *
 * Canonical objects, graph edges, metric observations, propagation rules,
 * and context package expectations that must all work cleanly across
 * L3 and L4 together.
 */

import type { LiveGraphEdge, EdgeRightsMap } from '../../services/knowledge-graph/graph-query-surfaces';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const NOW = '2026-03-15T12:00:00.000Z';
export const PAST = '2025-06-15T12:00:00.000Z';
export const DEEP_PAST = '2025-01-01T00:00:00.000Z';

export const ALLOW_ALL: EdgeRightsMap = {
  contextEnrichment: 'ALLOW', comparison: 'ALLOW', clustering: 'ALLOW',
  propagation: 'ALLOW', judgmentSupport: 'ALLOW', explanation: 'ALLOW',
  competitorDiscovery: 'ALLOW',
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN CANONICAL OBJECTS — projection inputs for L4.0
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_OBJECTS = {
  btc: { canonicalObjectId: 'ast_btc', objectType: 'ASSET', label: 'Bitcoin' },
  wbtc: { canonicalObjectId: 'ast_wbtc', objectType: 'ASSET', label: 'Wrapped BTC' },
  eth: { canonicalObjectId: 'ast_eth', objectType: 'ASSET', label: 'Ethereum' },
  sol: { canonicalObjectId: 'ast_sol', objectType: 'ASSET', label: 'Solana' },
  uni: { canonicalObjectId: 'ast_uni', objectType: 'ASSET', label: 'Uniswap Token' },
  jup: { canonicalObjectId: 'ast_jup', objectType: 'ASSET', label: 'Jupiter Token' },

  uniswap: { canonicalObjectId: 'proto_uniswap', objectType: 'PROTOCOL', label: 'Uniswap' },
  aave: { canonicalObjectId: 'proto_aave', objectType: 'PROTOCOL', label: 'Aave' },
  jupiter: { canonicalObjectId: 'proto_jupiter', objectType: 'PROTOCOL', label: 'Jupiter' },

  chainEth: { canonicalObjectId: 'chain_eth', objectType: 'CHAIN', label: 'Ethereum' },
  chainBase: { canonicalObjectId: 'chain_base', objectType: 'CHAIN', label: 'Base' },
  chainSol: { canonicalObjectId: 'chain_sol', objectType: 'CHAIN', label: 'Solana' },
  chainArb: { canonicalObjectId: 'chain_arb', objectType: 'CHAIN', label: 'Arbitrum' },

  binance: { canonicalObjectId: 'ent_binance', objectType: 'ENTITY', label: 'Binance' },
  whale1: { canonicalObjectId: 'ent_whale1', objectType: 'ENTITY', label: 'Whale #1' },

  btcUsdt: { canonicalObjectId: 'pair_btc_usdt', objectType: 'PAIR', label: 'BTC/USDT' },

  narAi: { canonicalObjectId: 'topic_ai', objectType: 'NARRATIVE_TOPIC', label: 'AI Narrative' },
  narRwa: { canonicalObjectId: 'topic_rwa', objectType: 'NARRATIVE_TOPIC', label: 'RWA Narrative' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN GRAPH EDGES — for L4.1-L4.5
// ═══════════════════════════════════════════════════════════════════════════════

function goldenEdge(
  id: string, type: string, sub: string, obj: string,
  subType: string, objType: string, family: string,
  overrides: Partial<LiveGraphEdge> = {},
): LiveGraphEdge {
  return {
    edgeId: id, edgeType: type,
    subjectNodeId: sub, objectNodeId: obj,
    subjectNodeType: subType, objectNodeType: objType,
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    rights: { ...ALLOW_ALL }, evidenceRefs: [`ev_${id}`],
    semanticFamily: family, scars: [],
    validFrom: DEEP_PAST,
    ...overrides,
  };
}

export const GOLDEN_EDGES = {
  // Structural
  ethBelongsUniswap: goldenEdge('ge_eth_uni', 'ASSET_BELONGS_TO_PROTOCOL', 'gn:canonical:asset:ast_eth', 'gn:canonical:protocol:proto_uniswap', 'ASSET', 'PROTOCOL', 'STRUCTURAL'),
  uniBelongsUniswap: goldenEdge('ge_uni_proto', 'PROTOCOL_HAS_TOKEN', 'gn:canonical:protocol:proto_uniswap', 'gn:canonical:asset:ast_uni', 'PROTOCOL', 'ASSET', 'STRUCTURAL'),
  uniswapOnEth: goldenEdge('ge_uni_eth', 'PROTOCOL_OPERATES_ON_CHAIN', 'gn:canonical:protocol:proto_uniswap', 'gn:canonical:chain:chain_eth', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'),
  uniswapOnBase: goldenEdge('ge_uni_base', 'PROTOCOL_OPERATES_ON_CHAIN', 'gn:canonical:protocol:proto_uniswap', 'gn:canonical:chain:chain_base', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'),
  aaveOnEth: goldenEdge('ge_aave_eth', 'PROTOCOL_OPERATES_ON_CHAIN', 'gn:canonical:protocol:proto_aave', 'gn:canonical:chain:chain_eth', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'),
  jupiterOnSol: goldenEdge('ge_jup_sol', 'PROTOCOL_OPERATES_ON_CHAIN', 'gn:canonical:protocol:proto_jupiter', 'gn:canonical:chain:chain_sol', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'),

  // Narrative
  ethNarAi: goldenEdge('ge_eth_ai', 'OBJECT_MENTIONED_IN_NARRATIVE', 'gn:canonical:asset:ast_eth', 'gn:native:narrative_node:nar_ai', 'ASSET', 'NARRATIVE_NODE', 'NARRATIVE'),
  ethNarRwa: goldenEdge('ge_eth_rwa', 'OBJECT_MENTIONED_IN_NARRATIVE', 'gn:canonical:asset:ast_eth', 'gn:native:narrative_node:nar_rwa', 'ASSET', 'NARRATIVE_NODE', 'NARRATIVE',
    { confidenceBand: 'LOW', temporalStatus: 'STALE' }),

  // Competitor
  ethCompSol: goldenEdge('ge_eth_sol_comp', 'COMPETES_WITH', 'gn:canonical:asset:ast_eth', 'gn:canonical:asset:ast_sol', 'ASSET', 'ASSET', 'COMPETITIVE'),

  // Cluster
  ethSectorDefi: goldenEdge('ge_eth_defi', 'ASSET_BELONGS_TO_SECTOR', 'gn:canonical:asset:ast_eth', 'gn:native:sector_cluster:sector_defi', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'),
  solSectorDefi: goldenEdge('ge_sol_defi', 'ASSET_BELONGS_TO_SECTOR', 'gn:canonical:asset:ast_sol', 'gn:native:sector_cluster:sector_defi', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'),

  // Historical edge (valid in 2025 only)
  ethOldAave: goldenEdge('ge_eth_aave_hist', 'ASSET_BELONGS_TO_PROTOCOL', 'gn:canonical:asset:ast_eth', 'gn:canonical:protocol:proto_aave', 'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { temporalStatus: 'HISTORICAL', validFrom: '2025-01-01T00:00:00Z', validTo: '2025-12-31T23:59:59Z' }),

  // Contested narrative
  uniNarRwaContested: goldenEdge('ge_uni_rwa_contested', 'OBJECT_MENTIONED_IN_NARRATIVE', 'gn:canonical:protocol:proto_uniswap', 'gn:native:narrative_node:nar_rwa', 'PROTOCOL', 'NARRATIVE_NODE', 'NARRATIVE',
    { temporalStatus: 'CONTESTED', confidenceBand: 'MEDIUM' }),

  // DENY-blocked edge
  btcDenied: goldenEdge('ge_btc_denied', 'ASSET_BELONGS_TO_PROTOCOL', 'gn:canonical:asset:ast_btc', 'gn:canonical:protocol:proto_aave', 'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { rights: { ...ALLOW_ALL, contextEnrichment: 'DENY' } }),

  // Expired edge
  solExpired: goldenEdge('ge_sol_expired', 'PROTOCOL_OPERATES_ON_CHAIN', 'gn:canonical:protocol:proto_jupiter', 'gn:canonical:chain:chain_arb', 'PROTOCOL', 'CHAIN', 'STRUCTURAL',
    { temporalStatus: 'EXPIRED', validFrom: '2024-01-01T00:00:00Z', validTo: '2024-12-31T23:59:59Z' }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN METRIC FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_METRICS = {
  btcSpotPrice: { metricPath: 'price.spot.usd', objectId: 'ast_btc', objectType: 'ASSET' as const, value: 67500 },
  ethSpotPrice: { metricPath: 'price.spot.usd', objectId: 'ast_eth', objectType: 'ASSET' as const, value: 3200 },
  btcMarkPrice: { metricPath: 'price.mark.usd', objectId: 'ast_btc', objectType: 'ASSET' as const, value: 67520 },
  uniswapTvl: { metricPath: 'protocol.tvl.usd', objectId: 'proto_uniswap', objectType: 'PROTOCOL' as const, value: 5_200_000_000 },
  uniswapTreasury: { metricPath: 'protocol.treasury.usd', objectId: 'proto_uniswap', objectType: 'PROTOCOL' as const, value: 1_800_000_000 },
  binanceNetflow: { metricPath: 'wallet.netflow.usd.24h', objectId: 'ent_binance', objectType: 'ENTITY' as const, value: -45_000_000 },
  aiNarrativeIntensity: { metricPath: 'narrative.intensity', objectId: 'topic_ai', objectType: 'NARRATIVE_TOPIC' as const, value: 82 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN GRAPH NATIVE NODES — for L4.0 (non-canonical)
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_NATIVE_NODES = {
  sectorDefi: { nodeId: 'gn:native:sector_cluster:sector_defi', type: 'SECTOR_CLUSTER' as const, label: 'DeFi Sector' },
  narAi: { nodeId: 'gn:native:narrative_node:nar_ai', type: 'NARRATIVE_NODE' as const, label: 'AI Narrative' },
  narRwa: { nodeId: 'gn:native:narrative_node:nar_rwa', type: 'NARRATIVE_NODE' as const, label: 'RWA Narrative' },
  compSushi: { nodeId: 'gn:native:competitor_node:comp_sushi', type: 'COMPETITOR_NODE' as const, label: 'SushiSwap' },
  subPancake: { nodeId: 'gn:native:competitor_node:sub_pancake', type: 'COMPETITOR_NODE' as const, label: 'PancakeSwap' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN PROPAGATION SCENARIO
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_PROPAGATION = {
  chainWeaknessRule: 'RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS',
  triggerSource: 'chain_eth',
  expectedTarget: 'proto_uniswap',
  effectClass: 'DEPENDENCY_IMPACT',
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN PACKAGE EXPECTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_PACKAGE_EXPECTATIONS = {
  ethTokenPackage: {
    subjectId: 'ast_eth',
    mustHaveProtocolContext: true,
    mustHaveChainContext: true,
    mustHaveSectorContext: true,
    mustHaveNarrativeContext: true,
    mustHaveCompetitorContext: true,
    mustNotBeRawDump: true,
    mustHaveConfidenceSummary: true,
    mustHaveEvidenceRefs: true,
  },
};
