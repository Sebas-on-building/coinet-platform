/**
 * Layer 3 Master Certification — Golden Cases
 *
 * Canonical objects, identity decisions, confidence states, reconciliation
 * outcomes, and metric observations that must always validate cleanly.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN IDENTITY CASES
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_BTC = {
  canonicalId: 'ast_btc_golden',
  objectType: 'ASSET' as const,
  symbol: 'BTC',
  name: 'Bitcoin',
  assetKind: 'NATIVE' as const,
  chainId: 'chain_btc',
  contractAddress: undefined,
  providerClaims: [
    { providerId: 'coingecko', label: 'bitcoin', confidence: 'HIGH' as const },
    { providerId: 'coinmarketcap', label: 'BTC', confidence: 'HIGH' as const },
  ],
};

export const GOLDEN_WBTC = {
  canonicalId: 'ast_wbtc_golden',
  objectType: 'ASSET' as const,
  symbol: 'WBTC',
  name: 'Wrapped BTC',
  assetKind: 'WRAPPED' as const,
  chainId: 'chain_eth',
  contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  rootAssetId: 'ast_btc_golden',
  providerClaims: [
    { providerId: 'coingecko', label: 'wrapped-bitcoin', confidence: 'HIGH' as const },
  ],
};

export const GOLDEN_USDC_ETH = {
  canonicalId: 'ast_usdc_eth_golden',
  objectType: 'ASSET' as const,
  symbol: 'USDC',
  name: 'USD Coin',
  assetKind: 'STABLECOIN' as const,
  chainId: 'chain_eth',
  contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

export const GOLDEN_USDC_BRIDGED = {
  canonicalId: 'ast_usdc_arb_golden',
  objectType: 'ASSET' as const,
  symbol: 'USDC.e',
  name: 'Bridged USDC (Arbitrum)',
  assetKind: 'BRIDGED' as const,
  chainId: 'chain_arb',
  contractAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  rootAssetId: 'ast_usdc_eth_golden',
};

export const GOLDEN_ETH_CHAIN = {
  canonicalId: 'chain_eth_golden',
  objectType: 'CHAIN' as const,
  canonicalName: 'Ethereum',
  chainFamily: 'EVM',
  nativeAssetId: 'ast_eth_golden',
};

export const GOLDEN_ARB_CHAIN = {
  canonicalId: 'chain_arb_golden',
  objectType: 'CHAIN' as const,
  canonicalName: 'Arbitrum One',
  chainFamily: 'EVM',
  nativeAssetId: 'ast_eth_arb_golden',
};

export const GOLDEN_JUPITER_PROTOCOL = {
  canonicalId: 'proto_jupiter_golden',
  objectType: 'PROTOCOL' as const,
  canonicalName: 'Jupiter',
  sector: 'DEX' as const,
  deployedChainIds: ['chain_sol'],
  governanceTokenId: 'ast_jup_golden',
};

export const GOLDEN_EXCHANGE_ENTITY = {
  canonicalId: 'ent_binance_golden',
  objectType: 'ENTITY' as const,
  entityKind: 'EXCHANGE' as const,
  addressSet: [
    { chainId: 'chain_eth', address: '0x28C6c06298d514Db089934071355E5743bf21d60' },
    { chainId: 'chain_btc', address: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo' },
  ],
  labelProvenance: [
    { providerId: 'arkham', label: 'Binance', confidence: 'HIGH' as const },
    { providerId: 'nansen', label: 'Binance: Hot Wallet', confidence: 'HIGH' as const },
  ],
};

export const GOLDEN_BTC_USDT_PAIR = {
  canonicalId: 'pair_btc_usdt_golden',
  objectType: 'PAIR' as const,
  baseAssetId: 'ast_btc_golden',
  quoteAssetId: 'ast_usdt_golden',
  scope: { marketType: 'SPOT' as const },
};

export const GOLDEN_AI_AGENTS_TOPIC = {
  canonicalId: 'topic_ai_agents_golden',
  objectType: 'NARRATIVE_TOPIC' as const,
  canonicalTitle: 'AI Agents',
  topicClass: 'SECTOR' as const,
  aliasPhraseSet: ['AI agents', 'autonomous agents', 'agent tokens'],
  status: 'ACTIVE' as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN METRIC CASES
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_METRICS = {
  btcSpotPrice: {
    metricPath: 'price.spot.usd',
    objectId: 'ast_btc_golden',
    objectType: 'ASSET',
    value: 67500,
    providerId: 'coingecko',
    rawFieldName: 'current_price',
  },
  btcVolume24h: {
    metricPath: 'volume.spot.usd.24h',
    objectId: 'ast_btc_golden',
    objectType: 'ASSET',
    value: 28_000_000_000,
    providerId: 'coingecko',
    rawFieldName: 'total_volume',
  },
  protocolTvl: {
    metricPath: 'protocol.tvl.usd',
    objectId: 'proto_jupiter_golden',
    objectType: 'PROTOCOL',
    value: 1_200_000_000,
    providerId: 'defillama',
    rawFieldName: 'tvl',
  },
  fundingRate: {
    metricPath: 'funding.rate.8h',
    objectId: 'pair_btc_usdt_golden',
    objectType: 'PAIR',
    value: 0.0012,
    providerId: 'coinglass',
    rawFieldName: 'fundingRate',
  },
  narrativeIntensity: {
    metricPath: 'narrative.intensity',
    objectId: 'topic_ai_agents_golden',
    objectType: 'NARRATIVE_TOPIC',
    value: 82,
    providerId: 'lunarcrush',
    rawFieldName: 'galaxy_score',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN CONFIDENCE STATES
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_CONFIDENCE = {
  btcHigh: { canonicalId: 'ast_btc_golden', band: 'HIGH' as const, score: 92, scars: [] },
  wbtcMedium: { canonicalId: 'ast_wbtc_golden', band: 'MEDIUM' as const, score: 78, scars: ['WRAPPED_RELATION_RISK'] },
  entityContested: { canonicalId: 'ent_unknown_golden', band: 'LOW' as const, score: 58, scars: ['ENTITY_ATTRIBUTION_RISK', 'PROVIDER_DISAGREEMENT'] },
  topicUnresolved: { canonicalId: 'topic_overlap_golden', band: 'UNRESOLVED' as const, score: 42, scars: ['TOPIC_BOUNDARY_RISK'] },
};
