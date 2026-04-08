/**
 * L1.3 Substitution Constitution — field-by-field continuity legality.
 *
 * For every field in Coinet this defines:
 *   - what may legally substitute for the primary
 *   - at what semantic loss level
 *   - with what conditions
 *   - what is explicitly illegal
 *   - when no fallback is permitted
 *
 * Universal law: if a substitute is not enumerated here, it is not legal.
 */

import { TRUTH_CLASSES } from '../registry';
import type { FieldSubstitutionRule } from './substitution-types';
import { L13_PLATFORM_VERSION } from './substitution-types';

const V = L13_PLATFORM_VERSION;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const SUBSTITUTION_CONSTITUTION: Record<string, FieldSubstitutionRule> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKET SURFACE
  // ═══════════════════════════════════════════════════════════════════════════

  'price.spot.canonical': {
    fieldId: 'price.spot.canonical',
    truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    primaryOwner: 'coingecko',
    legalSubstitutes: [
      {
        providerId: 'coinmarketcap',
        semanticLoss: 'S0_full_equivalent',
        confidencePenalty: 0.03,
        conditions: ['same asset identity', 'same quote currency normalization', 'freshness under SLA'],
      },
      {
        providerId: 'birdeye',
        semanticLoss: 'S1_near_equivalent',
        confidencePenalty: 0.08,
        conditions: ['Solana assets only', 'same asset identity', 'DEX-derived price may differ from CEX canonical'],
        methodologyNote: 'Birdeye prices are often DEX-derived, not CEX-aggregated',
      },
    ],
    illegalSubstitutes: [
      { providerId: 'dexscreener', reason: 'Discovery surface, not canonical price truth' },
      { providerId: 'geckoterminal', reason: 'Pool price is not canonical token-level spot price' },
      { providerId: 'lunarcrush', reason: 'Social intelligence, not price truth' },
      { providerId: 'openai', reason: 'Model output is never price truth' },
    ],
    noFallbackCondition: 'If canonical spot cannot be established from owner or valid confirmer, suppress exact canonical spot claim.',
    freshnessToleranceMs: 5 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Spot price sourced from fallback provider; slight methodology variance possible.',
    downstreamBlockers: ['exact price claims', 'precise return calculations'],
    version: V,
  },

  'price.ohlcv': {
    fieldId: 'price.ohlcv',
    truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    primaryOwner: 'coingecko',
    legalSubstitutes: [
      { providerId: 'coinmarketcap', semanticLoss: 'S0_full_equivalent', confidencePenalty: 0.03, conditions: ['same interval', 'same asset'] },
    ],
    illegalSubstitutes: [
      { providerId: 'dexscreener', reason: 'Pool OHLCV is not token-level canonical OHLCV' },
      { providerId: 'openai', reason: 'Model cannot generate market data' },
    ],
    noFallbackCondition: 'Suppress precise OHLCV-dependent analysis if no valid canonical source.',
    freshnessToleranceMs: 10 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'OHLCV data from fallback provider.',
    downstreamBlockers: ['precise candle analysis'],
    version: V,
  },

  'market.cap': {
    fieldId: 'market.cap',
    truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    primaryOwner: 'coingecko',
    legalSubstitutes: [
      { providerId: 'coinmarketcap', semanticLoss: 'S0_full_equivalent', confidencePenalty: 0.03, conditions: ['same circulating supply definition'] },
    ],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot produce market cap truth' },
      { providerId: 'lunarcrush', reason: 'Social provider has no market cap authority' },
    ],
    noFallbackCondition: 'Suppress precise market cap claims if supply definition diverges.',
    freshnessToleranceMs: 15 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Market cap from fallback source.',
    downstreamBlockers: ['precise market cap ranking'],
    version: V,
  },

  'market.supply.circulating': {
    fieldId: 'market.supply.circulating',
    truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    primaryOwner: 'coingecko',
    legalSubstitutes: [
      { providerId: 'coinmarketcap', semanticLoss: 'S1_near_equivalent', confidencePenalty: 0.05, conditions: ['supply definition must align'] },
    ],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot produce supply truth' },
    ],
    noFallbackCondition: 'If supply definitions diverge, preserve contradiction or suppress precision.',
    freshnessToleranceMs: HOUR,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Circulating supply from fallback; definition may differ slightly.',
    downstreamBlockers: ['precise percentage-of-supply calculations'],
    version: V,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEX EMERGENCE
  // ═══════════════════════════════════════════════════════════════════════════

  'dex.pool.liquidity': {
    fieldId: 'dex.pool.liquidity',
    truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    primaryOwner: 'geckoterminal',
    legalSubstitutes: [
      {
        providerId: 'dexscreener',
        semanticLoss: 'S1_near_equivalent',
        confidencePenalty: 0.08,
        conditions: ['exact same pool on same chain', 'pair identity verified', 'reserve-backed liquidity alignment'],
      },
      {
        providerId: 'birdeye',
        semanticLoss: 'S2_degraded_equivalent',
        confidencePenalty: 0.15,
        conditions: ['Solana pools only', 'pool identity matches'],
      },
    ],
    illegalSubstitutes: [
      { providerId: 'coingecko', reason: 'Token-level market data cannot substitute pool-level liquidity truth' },
      { providerId: 'lunarcrush', reason: 'Social data has no pool liquidity authority' },
      { providerId: 'openai', reason: 'Model cannot produce pool liquidity data' },
    ],
    noFallbackCondition: 'If exact pool identity is unresolved, suppress pool liquidity and pool price claims.',
    freshnessToleranceMs: 5 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Pool liquidity from secondary DEX provider; slight reserve calculation variance.',
    downstreamBlockers: ['precise pool liquidity depth claims'],
    version: V,
  },

  'dex.pool.price': {
    fieldId: 'dex.pool.price',
    truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    primaryOwner: 'geckoterminal',
    legalSubstitutes: [
      { providerId: 'dexscreener', semanticLoss: 'S1_near_equivalent', confidencePenalty: 0.08, conditions: ['exact same pool', 'same chain'] },
    ],
    illegalSubstitutes: [
      { providerId: 'coingecko', reason: 'CEX-aggregated spot price is not pool price' },
      { providerId: 'openai', reason: 'Model cannot produce pool price' },
    ],
    noFallbackCondition: 'Suppress exact pool price if pool identity cannot be resolved.',
    freshnessToleranceMs: 5 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Pool price from fallback DEX provider.',
    downstreamBlockers: ['precise pool price claims'],
    version: V,
  },

  'dex.pair.discovery': {
    fieldId: 'dex.pair.discovery',
    truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    primaryOwner: 'geckoterminal',
    legalSubstitutes: [
      { providerId: 'dexscreener', semanticLoss: 'S0_full_equivalent', confidencePenalty: 0.03, conditions: ['same chain coverage'] },
    ],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot discover pairs' },
    ],
    noFallbackCondition: 'Suppress new-pair detection claims if no valid DEX source.',
    freshnessToleranceMs: 10 * MIN,
    methodologyCompatibilityRequired: false,
    disclosureTemplate: 'Pair discovery from fallback DEX provider.',
    downstreamBlockers: ['early discovery claims'],
    version: V,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVATIVES PRESSURE
  // ═══════════════════════════════════════════════════════════════════════════

  'derivatives.oi.aggregate': {
    fieldId: 'derivatives.oi.aggregate',
    truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    primaryOwner: 'coinglass',
    legalSubstitutes: [],
    illegalSubstitutes: [
      { providerId: 'coingecko', reason: 'Broad derivatives summaries lack venue-level equivalence' },
      { providerId: 'lunarcrush', reason: 'Social provider has no derivatives authority' },
      { providerId: 'dexscreener', reason: 'DEX discovery has no derivatives authority' },
      { providerId: 'openai', reason: 'Model cannot produce derivatives data' },
    ],
    noFallbackCondition: 'If CoinGlass is degraded and venue normalization incomplete, suppress unified OI claim.',
    freshnessToleranceMs: 5 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Open interest data unavailable from primary specialist.',
    downstreamBlockers: ['unified OI claims', 'leverage-driven move classification', 'crowding assessment'],
    version: V,
  },

  'derivatives.funding.aggregate': {
    fieldId: 'derivatives.funding.aggregate',
    truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    primaryOwner: 'coinglass',
    legalSubstitutes: [],
    illegalSubstitutes: [
      { providerId: 'coingecko', reason: 'No interval-preserving funding data' },
      { providerId: 'openai', reason: 'Model cannot produce funding rates' },
    ],
    noFallbackCondition: 'If interval normalization uncertain, suppress unified funding truth.',
    freshnessToleranceMs: 5 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Funding rate data unavailable.',
    downstreamBlockers: ['funding direction claims', 'squeeze proximity assessment'],
    version: V,
  },

  'derivatives.liquidation.orderflow': {
    fieldId: 'derivatives.liquidation.orderflow',
    truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    primaryOwner: 'coinglass',
    legalSubstitutes: [],
    illegalSubstitutes: [
      { providerId: 'coingecko', reason: 'No liquidation orderflow data' },
      { providerId: 'openai', reason: 'Model cannot produce liquidation data' },
    ],
    noFallbackCondition: 'If liquidation feed partial, say "liquidation visibility degraded", not canonical concentration.',
    freshnessToleranceMs: 2 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Liquidation orderflow visibility degraded.',
    downstreamBlockers: ['liquidation concentration claims', 'cascade risk assessment'],
    version: V,
  },

  'derivatives.leverage.stress': {
    fieldId: 'derivatives.leverage.stress',
    truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    primaryOwner: 'coinglass',
    legalSubstitutes: [],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot produce leverage metrics' },
    ],
    noFallbackCondition: 'Suppress leverage stress claims without specialist data.',
    freshnessToleranceMs: 5 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Leverage stress data unavailable.',
    downstreamBlockers: ['leverage stress claims'],
    version: V,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOL SUBSTANCE
  // ═══════════════════════════════════════════════════════════════════════════

  'protocol.tvl.usd': {
    fieldId: 'protocol.tvl.usd',
    truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    primaryOwner: 'defillama',
    legalSubstitutes: [],
    illegalSubstitutes: [
      { providerId: 'coingecko', reason: 'Market data provider, not TVL methodology authority' },
      { providerId: 'lunarcrush', reason: 'Social provider has no TVL authority' },
      { providerId: 'openai', reason: 'Model cannot produce TVL data' },
    ],
    noFallbackCondition: 'If methodology unresolved, show range or contradiction, not single TVL truth.',
    freshnessToleranceMs: HOUR,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'TVL data unavailable from primary methodology authority.',
    downstreamBlockers: ['precise TVL claims', 'TVL trend claims'],
    version: V,
  },

  'protocol.fees.daily': {
    fieldId: 'protocol.fees.daily',
    truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    primaryOwner: 'defillama',
    legalSubstitutes: [],
    illegalSubstitutes: [
      { providerId: 'coingecko', reason: 'No protocol fee methodology' },
      { providerId: 'openai', reason: 'Model cannot produce fee data' },
    ],
    noFallbackCondition: 'Suppress precise fee claims without definition-matched source.',
    freshnessToleranceMs: HOUR,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Protocol fee data unavailable.',
    downstreamBlockers: ['precise fee claims', 'revenue quality assessment'],
    version: V,
  },

  'protocol.revenue.daily': {
    fieldId: 'protocol.revenue.daily',
    truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    primaryOwner: 'defillama',
    legalSubstitutes: [],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot produce revenue data' },
    ],
    noFallbackCondition: 'Suppress precise revenue claims without matched methodology.',
    freshnessToleranceMs: HOUR,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Protocol revenue data unavailable.',
    downstreamBlockers: ['precise revenue claims', 'rerating justification'],
    version: V,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ON-CHAIN BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  'onchain.transfers.evm': {
    fieldId: 'onchain.transfers.evm',
    truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    primaryOwner: 'alchemy',
    legalSubstitutes: [
      {
        providerId: 'etherscan',
        semanticLoss: 'S2_degraded_equivalent',
        confidencePenalty: 0.15,
        conditions: ['EVM chains only', 'rate-limited', 'may lack deep history'],
        methodologyNote: 'Explorer API has lower throughput and coverage depth than Transfers API',
      },
    ],
    illegalSubstitutes: [
      { providerId: 'arkham', reason: 'Enrichment provider, not raw transfer source' },
      { providerId: 'nansen', reason: 'Analytics provider, not raw transfer source' },
      { providerId: 'coingecko', reason: 'Market provider has no on-chain transfer authority' },
      { providerId: 'openai', reason: 'Model cannot produce chain data' },
    ],
    noFallbackCondition: 'If raw transfer integrity degraded, show labeled interpretation only as non-canonical context.',
    freshnessToleranceMs: MIN,
    methodologyCompatibilityRequired: false,
    disclosureTemplate: 'On-chain transfer data from fallback explorer; depth and throughput may be limited.',
    downstreamBlockers: ['precise transfer volume claims', 'exchange flow exactness'],
    version: V,
  },

  'onchain.transfers.solana': {
    fieldId: 'onchain.transfers.solana',
    truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    primaryOwner: 'quicknode',
    legalSubstitutes: [],
    illegalSubstitutes: [
      { providerId: 'arkham', reason: 'Enrichment, not raw Solana chain state' },
      { providerId: 'coingecko', reason: 'No Solana chain state authority' },
      { providerId: 'openai', reason: 'Model cannot produce chain data' },
    ],
    noFallbackCondition: 'If Solana chain state unavailable, suppress Solana-specific on-chain claims.',
    freshnessToleranceMs: MIN,
    methodologyCompatibilityRequired: false,
    disclosureTemplate: 'Solana on-chain data unavailable.',
    downstreamBlockers: ['Solana transfer claims', 'Solana whale flow claims'],
    version: V,
  },

  'onchain.contract.events': {
    fieldId: 'onchain.contract.events',
    truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    primaryOwner: 'alchemy',
    legalSubstitutes: [
      { providerId: 'etherscan', semanticLoss: 'S2_degraded_equivalent', confidencePenalty: 0.15, conditions: ['EVM only', 'rate-limited'] },
    ],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot produce contract event data' },
    ],
    noFallbackCondition: 'Suppress contract-event-dependent analysis if no chain source.',
    freshnessToleranceMs: MIN,
    methodologyCompatibilityRequired: false,
    disclosureTemplate: 'Contract event data from fallback explorer.',
    downstreamBlockers: ['precise contract interaction claims'],
    version: V,
  },

  'onchain.whale.flows': {
    fieldId: 'onchain.whale.flows',
    truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    primaryOwner: 'alchemy',
    legalSubstitutes: [
      {
        providerId: 'arkham',
        semanticLoss: 'S3_partial_view_only',
        confidencePenalty: 0.30,
        conditions: ['enrichment only — labeled whale flows, not raw chain state'],
        methodologyNote: 'Arkham provides labeled flows; cannot replace raw transfer volume',
      },
      {
        providerId: 'nansen',
        semanticLoss: 'S3_partial_view_only',
        confidencePenalty: 0.30,
        conditions: ['enrichment only — smart money flow context, not raw chain state'],
      },
    ],
    illegalSubstitutes: [
      { providerId: 'lunarcrush', reason: 'Social provider cannot claim whale flow truth' },
      { providerId: 'openai', reason: 'Model cannot produce whale flow data' },
    ],
    noFallbackCondition: 'If raw whale flow integrity lost, labeled interpretations remain as non-canonical context only.',
    freshnessToleranceMs: 5 * MIN,
    methodologyCompatibilityRequired: false,
    disclosureTemplate: 'Whale flow data limited to labeled enrichment; raw chain verification unavailable.',
    downstreamBlockers: ['precise whale volume claims', 'exchange flow direction claims without chain backing'],
    version: V,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURAL SAFETY
  // ═══════════════════════════════════════════════════════════════════════════

  'security.token.flags': {
    fieldId: 'security.token.flags',
    truthClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    primaryOwner: 'goplus',
    legalSubstitutes: [
      {
        providerId: 'etherscan',
        semanticLoss: 'S2_degraded_equivalent',
        confidencePenalty: 0.18,
        conditions: ['EVM only', 'contract verification only, not full scam analysis'],
        methodologyNote: 'Explorer provides verification status, not comprehensive security scoring',
      },
      {
        providerId: 'solscan',
        semanticLoss: 'S2_degraded_equivalent',
        confidencePenalty: 0.18,
        conditions: ['Solana only', 'limited to verification status'],
      },
    ],
    illegalSubstitutes: [
      { providerId: 'coingecko', reason: 'Market data provider has no security authority' },
      { providerId: 'dexscreener', reason: 'Discovery provider has no security authority' },
      { providerId: 'lunarcrush', reason: 'Social excitement is never safety evidence' },
      { providerId: 'openai', reason: 'Model cannot produce security analysis' },
    ],
    noFallbackCondition: 'If security visibility absent, return safety_unknown, never safe.',
    freshnessToleranceMs: HOUR,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Security analysis from limited fallback; comprehensive scam detection unavailable.',
    downstreamBlockers: ['clean safety verdict', 'structural safety confidence cap removal'],
    version: V,
  },

  'security.contract.risk': {
    fieldId: 'security.contract.risk',
    truthClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    primaryOwner: 'goplus',
    legalSubstitutes: [
      { providerId: 'etherscan', semanticLoss: 'S2_degraded_equivalent', confidencePenalty: 0.18, conditions: ['EVM only'] },
    ],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot assess contract risk' },
      { providerId: 'lunarcrush', reason: 'Social data has no contract risk authority' },
    ],
    noFallbackCondition: 'Suppress contract risk verdict if no security source.',
    freshnessToleranceMs: HOUR,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Contract risk assessment limited to verification status.',
    downstreamBlockers: ['precise contract risk verdict'],
    version: V,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NARRATIVE ATTENTION
  // ═══════════════════════════════════════════════════════════════════════════

  'narrative.news.velocity': {
    fieldId: 'narrative.news.velocity',
    truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    primaryOwner: 'cryptopanic',
    legalSubstitutes: [
      {
        providerId: 'twitter_api',
        semanticLoss: 'S2_degraded_equivalent',
        confidencePenalty: 0.15,
        conditions: ['social discussion about events, not event-confirmed news'],
        methodologyNote: 'Social velocity is not event-confirmed news velocity',
      },
    ],
    illegalSubstitutes: [
      { providerId: 'lunarcrush', reason: 'Social velocity is a different field from news velocity' },
      { providerId: 'dexscreener', reason: 'Trending is retail attention, not news truth' },
      { providerId: 'coingecko', reason: 'Market provider has no news authority' },
      { providerId: 'openai', reason: 'Model cannot produce news velocity data' },
    ],
    noFallbackCondition: 'If event visibility weak, suppress event-confirmed narrative claims.',
    freshnessToleranceMs: 15 * MIN,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'News velocity assessment limited; event confirmation unavailable.',
    downstreamBlockers: ['event-confirmed narrative claims'],
    version: V,
  },

  'narrative.social.velocity': {
    fieldId: 'narrative.social.velocity',
    truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    primaryOwner: 'lunarcrush',
    legalSubstitutes: [
      { providerId: 'twitter_api', semanticLoss: 'S1_near_equivalent', confidencePenalty: 0.08, conditions: ['same social platform scope'] },
      { providerId: 'twitter_api_io', semanticLoss: 'S1_near_equivalent', confidencePenalty: 0.10, conditions: ['scraping fallback', 'same platform'] },
    ],
    illegalSubstitutes: [
      { providerId: 'cryptopanic', reason: 'News velocity is not social velocity' },
      { providerId: 'dexscreener', reason: 'Trending boosts are not social velocity truth' },
      { providerId: 'openai', reason: 'Model cannot produce social velocity data' },
    ],
    noFallbackCondition: 'Without valid social intelligence, suppress canonical social velocity claims.',
    freshnessToleranceMs: 15 * MIN,
    methodologyCompatibilityRequired: false,
    disclosureTemplate: 'Social velocity from fallback social source.',
    downstreamBlockers: ['precise social velocity claims'],
    version: V,
  },

  'narrative.retail.attention': {
    fieldId: 'narrative.retail.attention',
    truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    primaryOwner: 'lunarcrush',
    legalSubstitutes: [
      {
        providerId: 'dexscreener',
        semanticLoss: 'S3_partial_view_only',
        confidencePenalty: 0.30,
        conditions: ['trending/boosts as contamination-aware signal only'],
        methodologyNote: 'DexScreener trending is retail buzz, not structured social intelligence',
      },
    ],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot measure retail attention' },
    ],
    noFallbackCondition: 'Suppress retail attention claims if no valid source.',
    freshnessToleranceMs: 30 * MIN,
    methodologyCompatibilityRequired: false,
    disclosureTemplate: 'Retail attention estimated from trending surface; structured social data unavailable.',
    downstreamBlockers: ['precise attention concentration claims'],
    version: V,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTITY CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════

  'entity.wallet.labels': {
    fieldId: 'entity.wallet.labels',
    truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    primaryOwner: 'arkham',
    legalSubstitutes: [
      {
        providerId: 'nansen',
        semanticLoss: 'S0_full_equivalent',
        confidencePenalty: 0.03,
        conditions: ['co-authority with provenance', 'label type and confidence explicit'],
      },
    ],
    illegalSubstitutes: [
      { providerId: 'alchemy', reason: 'Chain infrastructure has no entity label authority' },
      { providerId: 'coingecko', reason: 'Market provider has no entity authority' },
      { providerId: 'openai', reason: 'Model cannot produce entity labels' },
    ],
    noFallbackCondition: 'If provenance weak or co-authority disagreement material, identity remains contested or unknown.',
    freshnessToleranceMs: DAY,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Entity labels from co-authority; disagreement preserved where material.',
    downstreamBlockers: ['confident entity identity claims without co-authority agreement'],
    version: V,
  },

  'entity.smart_money': {
    fieldId: 'entity.smart_money',
    truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    primaryOwner: 'nansen',
    legalSubstitutes: [
      { providerId: 'arkham', semanticLoss: 'S0_full_equivalent', confidencePenalty: 0.03, conditions: ['co-authority'] },
    ],
    illegalSubstitutes: [
      { providerId: 'alchemy', reason: 'Raw chain data is not smart money classification' },
      { providerId: 'openai', reason: 'Model cannot classify smart money' },
    ],
    noFallbackCondition: 'Suppress smart money claims without entity intelligence source.',
    freshnessToleranceMs: DAY,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Smart money classification from co-authority.',
    downstreamBlockers: ['precise smart money claims'],
    version: V,
  },

  'entity.cluster.attribution': {
    fieldId: 'entity.cluster.attribution',
    truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    primaryOwner: 'arkham',
    legalSubstitutes: [
      { providerId: 'nansen', semanticLoss: 'S0_full_equivalent', confidencePenalty: 0.03, conditions: ['co-authority'] },
    ],
    illegalSubstitutes: [
      { providerId: 'openai', reason: 'Model cannot produce cluster attribution' },
    ],
    noFallbackCondition: 'Unresolved provenance means attribution remains contested.',
    freshnessToleranceMs: DAY,
    methodologyCompatibilityRequired: true,
    disclosureTemplate: 'Cluster attribution from co-authority.',
    downstreamBlockers: ['precise cluster identity claims'],
    version: V,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY API
// ═══════════════════════════════════════════════════════════════════════════════

export function getSubstitutionRule(fieldId: string): FieldSubstitutionRule | undefined {
  return SUBSTITUTION_CONSTITUTION[fieldId];
}

export function getAllSubstitutionRules(): FieldSubstitutionRule[] {
  return Object.values(SUBSTITUTION_CONSTITUTION);
}

export function isSubstitutionLegal(fieldId: string, providerId: string): boolean {
  const rule = SUBSTITUTION_CONSTITUTION[fieldId];
  if (!rule) return false;
  if (rule.primaryOwner === providerId) return true;
  return rule.legalSubstitutes.some(s => s.providerId === providerId);
}

export function isSubstitutionIllegal(fieldId: string, providerId: string): { illegal: boolean; reason: string | null } {
  const rule = SUBSTITUTION_CONSTITUTION[fieldId];
  if (!rule) return { illegal: false, reason: null };
  const entry = rule.illegalSubstitutes.find(s => s.providerId === providerId);
  if (entry) return { illegal: true, reason: entry.reason };
  return { illegal: false, reason: null };
}
