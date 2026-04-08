/**
 * L1.2 Source Authority Constitution
 *
 * This is not a provider list. It is a formal authority constitution.
 * For every observable field in Coinet it defines:
 *   - who owns truth
 *   - who may confirm
 *   - who may enrich
 *   - who may only detect
 *   - who is explicitly barred from claiming authority
 *   - what happens when co-authorities disagree
 *   - what claims become illegal when authority weakens
 */

import { TRUTH_CLASSES, SOURCE_CLASSES } from '../registry';
import type { TruthClass, SourceClass } from '../registry';

export const L12_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY TIERS
// ═══════════════════════════════════════════════════════════════════════════════

export type AuthorityTier =
  | 'A0_native'
  | 'A1_specialist'
  | 'A2_breadth'
  | 'A3_enrichment'
  | 'A4_discovery'
  | 'A5_expression';

export const AUTHORITY_TIER_LABELS: Record<AuthorityTier, string> = {
  A0_native: 'Native authority — direct first-party or direct-state observation',
  A1_specialist: 'Specialist authority — best-in-domain structured provider',
  A2_breadth: 'Breadth authority — broad aggregator with standardized access',
  A3_enrichment: 'Enrichment authority — adds interpretation to raw fact',
  A4_discovery: 'Discovery authority — detection, recall, early signal',
  A5_expression: 'Expression authority — internal reasoning only, never truth-owning',
};

export const AUTHORITY_TIER_RANK: Record<AuthorityTier, number> = {
  A0_native: 6,
  A1_specialist: 5,
  A2_breadth: 4,
  A3_enrichment: 3,
  A4_discovery: 2,
  A5_expression: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY ROLES
// ═══════════════════════════════════════════════════════════════════════════════

export type AuthorityRole =
  | 'owner'
  | 'confirmer'
  | 'enricher'
  | 'discovery_only'
  | 'prohibited_non_owner';

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS AUTHORITY CONSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProviderAuthority {
  providerId: string;
  role: AuthorityRole;
  tier: AuthorityTier;
  scope?: string;
}

export interface DisagreementPolicy {
  type: 'preserve_contradiction' | 'authority_wins' | 'fresher_wins' | 'suppress_both';
  description: string;
}

export interface ClassAuthorityConstitution {
  truthClass: TruthClass;
  sourceClass: SourceClass;

  truthOwned: string[];
  providers: ProviderAuthority[];

  coPrimaryDisagreement: DisagreementPolicy;
  noFallbackLine: string;

  antiAuthorityRules: string[];
  productionLaw: string[];

  version: string;
}

export const CLASS_AUTHORITY: Record<string, ClassAuthorityConstitution> = {
  // ── 1. Market Surface ─────────────────────────────────────────────────────
  [TRUTH_CLASSES.MARKET_SURFACE]: {
    truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    sourceClass: SOURCE_CLASSES.MARKET_DATA,
    truthOwned: [
      'canonical spot price', 'OHLCV', 'market cap',
      'circulating supply', 'exchange-level spot market surface',
    ],
    providers: [
      { providerId: 'coingecko', role: 'owner', tier: 'A2_breadth' },
      { providerId: 'coinmarketcap', role: 'confirmer', tier: 'A2_breadth' },
      { providerId: 'coinglass', role: 'confirmer', tier: 'A1_specialist', scope: 'derivatives-aware cross-check' },
      { providerId: 'birdeye', role: 'confirmer', tier: 'A2_breadth', scope: 'solana market surface' },
      { providerId: 'dexscreener', role: 'prohibited_non_owner', tier: 'A4_discovery' },
      { providerId: 'lunarcrush', role: 'prohibited_non_owner', tier: 'A4_discovery' },
      { providerId: 'cryptopanic', role: 'prohibited_non_owner', tier: 'A4_discovery' },
      { providerId: 'openai', role: 'prohibited_non_owner', tier: 'A5_expression' },
    ],
    coPrimaryDisagreement: {
      type: 'preserve_contradiction',
      description: 'If CoinGecko and CoinMarketCap diverge beyond tolerance, preserve market-surface conflict state.',
    },
    noFallbackLine: 'If canonical spot price cannot be established from owner or valid confirmer, suppress strong directional claims depending on exact market surface.',
    antiAuthorityRules: [
      'Derivative crowding never overrides printed spot price',
      'Discovery surfaces may flag attention around price but cannot define canonical price',
      'Model output cannot become a market data source',
    ],
    productionLaw: [
      'Broad price truth belongs to the broad aggregator',
      'If price sources diverge beyond tolerance, preserve market-surface conflict state before higher layers consume',
    ],
    version: L12_VERSION,
  },

  // ── 2. DEX Emergence ──────────────────────────────────────────────────────
  [TRUTH_CLASSES.DEX_EMERGENCE]: {
    truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    sourceClass: SOURCE_CLASSES.DEX_DISCOVERY,
    truthOwned: [
      'pool-level liquidity', 'pool price', 'on-chain token discovery',
      'pair creation and emergence', 'pool historical charting',
    ],
    providers: [
      { providerId: 'geckoterminal', role: 'owner', tier: 'A1_specialist' },
      { providerId: 'dexscreener', role: 'confirmer', tier: 'A4_discovery' },
      { providerId: 'birdeye', role: 'confirmer', tier: 'A2_breadth', scope: 'solana DEX pairs' },
      { providerId: 'coingecko', role: 'prohibited_non_owner', tier: 'A2_breadth' },
      { providerId: 'lunarcrush', role: 'prohibited_non_owner', tier: 'A4_discovery' },
    ],
    coPrimaryDisagreement: {
      type: 'authority_wins',
      description: 'GeckoTerminal owns canonical pool truth. DexScreener confirms and discovers but does not override.',
    },
    noFallbackLine: 'If exact pool identity, chain, or reserve-backed liquidity cannot be validated, suppress precise pool-liquidity truth.',
    antiAuthorityRules: [
      'Trending and boosted visibility is a contamination variable, not a confirmation variable',
      'DexScreener boosts cannot canonize liquidity or legitimacy',
      'Broad aggregators cannot define pool-level emergence truth',
    ],
    productionLaw: [
      'GeckoTerminal owns canonical pool truth',
      'DexScreener owns discovery advantage, not truth monopoly',
      'Boosted visibility is treated as contamination-aware signal',
    ],
    version: L12_VERSION,
  },

  // ── 3. Derivatives Pressure ───────────────────────────────────────────────
  [TRUTH_CLASSES.DERIVATIVES_PRESSURE]: {
    truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    sourceClass: SOURCE_CLASSES.DERIVATIVES,
    truthOwned: [
      'open interest', 'funding', 'liquidations',
      'order-book imbalance', 'leverage stress', 'basis and perp crowding',
    ],
    providers: [
      { providerId: 'coinglass', role: 'owner', tier: 'A1_specialist' },
      { providerId: 'coingecko', role: 'confirmer', tier: 'A2_breadth', scope: 'magnitude sanity-check only' },
      { providerId: 'dexscreener', role: 'prohibited_non_owner', tier: 'A4_discovery' },
      { providerId: 'lunarcrush', role: 'prohibited_non_owner', tier: 'A4_discovery' },
      { providerId: 'openai', role: 'prohibited_non_owner', tier: 'A5_expression' },
    ],
    coPrimaryDisagreement: {
      type: 'authority_wins',
      description: 'CoinGlass owns unified derivatives truth. Broad aggregators sanity-check magnitude but do not replace venue-aware leverage truth.',
    },
    noFallbackLine: 'If CoinGlass is degraded and venue-native normalization is incomplete, suppress unified derivatives pressure verdict.',
    antiAuthorityRules: [
      'Broad aggregators may sanity-check magnitude, not replace venue-aware leverage truth',
      'Venue-level divergence is microstructure state, not noise',
      'Social or narrative providers cannot claim derivatives truth',
    ],
    productionLaw: [
      'Derivatives pressure belongs to the derivatives-native provider',
      'If exchange coverage changes materially, degrade unified derivatives claims',
    ],
    version: L12_VERSION,
  },

  // ── 4. Protocol Substance ─────────────────────────────────────────────────
  [TRUTH_CLASSES.PROTOCOL_SUBSTANCE]: {
    truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    sourceClass: SOURCE_CLASSES.FUNDAMENTALS,
    truthOwned: [
      'TVL', 'fees', 'revenue', 'volume',
      'protocol-level economic footprint',
    ],
    providers: [
      { providerId: 'defillama', role: 'owner', tier: 'A1_specialist' },
      { providerId: 'coingecko', role: 'prohibited_non_owner', tier: 'A2_breadth' },
      { providerId: 'lunarcrush', role: 'prohibited_non_owner', tier: 'A4_discovery' },
      { providerId: 'openai', role: 'prohibited_non_owner', tier: 'A5_expression' },
    ],
    coPrimaryDisagreement: {
      type: 'preserve_contradiction',
      description: 'If protocol-native accounting and DefiLlama materially disagree, preserve contradiction until methodological gap is explained.',
    },
    noFallbackLine: 'If methodology is unresolved, show range or contradiction but not single hard protocol-substance truth.',
    antiAuthorityRules: [
      'Narrative or market proxies cannot backfill protocol substance',
      'Token price feeds are not protocol revenue truth',
      'Social feeds cannot claim TVL or fee truth',
    ],
    productionLaw: [
      'Protocol substance belongs to methodology-aware protocol analytics',
      'Protocol-native accounting may override only when scope and methodology are explicitly comparable',
    ],
    version: L12_VERSION,
  },

  // ── 5. On-Chain Behavior ──────────────────────────────────────────────────
  [TRUTH_CLASSES.ONCHAIN_BEHAVIOR]: {
    truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    sourceClass: SOURCE_CLASSES.ONCHAIN,
    truthOwned: [
      'transfers', 'balances', 'contract calls',
      'token flows', 'address event sequences', 'raw wallet interactions',
    ],
    providers: [
      { providerId: 'alchemy', role: 'owner', tier: 'A0_native', scope: 'EVM chain state' },
      { providerId: 'quicknode', role: 'owner', tier: 'A0_native', scope: 'Solana chain state' },
      { providerId: 'arkham', role: 'enricher', tier: 'A3_enrichment' },
      { providerId: 'nansen', role: 'enricher', tier: 'A3_enrichment' },
      { providerId: 'etherscan', role: 'confirmer', tier: 'A2_breadth', scope: 'contract verification' },
      { providerId: 'coingecko', role: 'prohibited_non_owner', tier: 'A2_breadth' },
      { providerId: 'openai', role: 'prohibited_non_owner', tier: 'A5_expression' },
    ],
    coPrimaryDisagreement: {
      type: 'preserve_contradiction',
      description: 'If Alchemy and QuickNode cover different chains, they are not in conflict. If indexer and native state drift, native state wins.',
    },
    noFallbackLine: 'If chain-state freshness or decode integrity fails, do not turn enriched entity narratives into raw flow truth.',
    antiAuthorityRules: [
      'Entity providers may annotate the actor, not rewrite the event',
      'If internal indexers drift from native chain state, native state wins',
      'On-chain truth must remain possible even when no entity label exists',
    ],
    productionLaw: [
      'Raw chain fact belongs to chain-state infrastructure',
      'Enrichment never overrides raw fact',
    ],
    version: L12_VERSION,
  },

  // ── 6. Structural Safety ──────────────────────────────────────────────────
  [TRUTH_CLASSES.STRUCTURAL_SAFETY]: {
    truthClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    sourceClass: SOURCE_CLASSES.SECURITY,
    truthOwned: [
      'token-level risk flags', 'contract-level risk flags',
      'scam indicators', 'admin power risk',
      'blacklist/mint/tax/honeypot risk', 'structural fragility',
    ],
    providers: [
      { providerId: 'goplus', role: 'owner', tier: 'A1_specialist' },
      { providerId: 'etherscan', role: 'confirmer', tier: 'A2_breadth', scope: 'contract verification' },
      { providerId: 'solscan', role: 'confirmer', tier: 'A2_breadth', scope: 'Solana contract verification' },
      { providerId: 'coingecko', role: 'prohibited_non_owner', tier: 'A2_breadth' },
      { providerId: 'lunarcrush', role: 'prohibited_non_owner', tier: 'A4_discovery' },
      { providerId: 'dexscreener', role: 'prohibited_non_owner', tier: 'A4_discovery' },
    ],
    coPrimaryDisagreement: {
      type: 'authority_wins',
      description: 'GoPlus owns primary security risk assessment. Explorer confirmers refine or qualify but cannot dismiss risk.',
    },
    noFallbackLine: 'If structural safety visibility is absent, do not produce clean safety verdict.',
    antiAuthorityRules: [
      'No amount of bullish price action can neutralize a severe structural red flag',
      'Internal analyzers may refine or qualify risk, but not ignore it',
      'When security visibility is partial, correct state is "unknown" not "safe"',
      'Market movement, social sentiment, price acceleration are never safety evidence',
    ],
    productionLaw: [
      'Severe security risk is a hard epistemic veto',
      'Partial safety visibility must output "limited view", not "safe"',
    ],
    version: L12_VERSION,
  },

  // ── 7. Narrative Attention ────────────────────────────────────────────────
  [TRUTH_CLASSES.NARRATIVE_ATTENTION]: {
    truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    sourceClass: SOURCE_CLASSES.NARRATIVE,
    truthOwned: [
      'news velocity', 'social velocity', 'attention concentration',
      'topic acceleration', 'narrative breadth',
    ],
    providers: [
      { providerId: 'cryptopanic', role: 'owner', tier: 'A1_specialist', scope: 'structured news' },
      { providerId: 'lunarcrush', role: 'owner', tier: 'A1_specialist', scope: 'social intelligence' },
      { providerId: 'twitter_api', role: 'confirmer', tier: 'A2_breadth', scope: 'real-time social' },
      { providerId: 'twitter_api_io', role: 'confirmer', tier: 'A2_breadth', scope: 'social monitoring fallback' },
      { providerId: 'dexscreener', role: 'discovery_only', tier: 'A4_discovery', scope: 'retail-attention emergence' },
      { providerId: 'coingecko', role: 'prohibited_non_owner', tier: 'A2_breadth' },
      { providerId: 'defillama', role: 'prohibited_non_owner', tier: 'A1_specialist' },
    ],
    coPrimaryDisagreement: {
      type: 'preserve_contradiction',
      description: 'News and social are separate sub-domains. CryptoPanic owns news velocity; LunarCrush owns social velocity. Disagreement across sub-domains is a legitimate tension signal.',
    },
    noFallbackLine: 'If event-confirmation visibility is weak, describe attention but do not present narrative as confirmed reality.',
    antiAuthorityRules: [
      'Boosted trend visibility is contamination-aware, not canonical event truth',
      'Attention spike without factual event confirmation must be marked unverified narrative acceleration',
      'Protocol truth, price truth, and safety truth are never owned by narrative sources',
    ],
    productionLaw: [
      'Narrative attention owns attention state, not truth state',
      'News and social must remain separated at authority level',
    ],
    version: L12_VERSION,
  },

  // ── 8. Entity Context ─────────────────────────────────────────────────────
  [TRUTH_CLASSES.ENTITY_CONTEXT]: {
    truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    sourceClass: SOURCE_CLASSES.ENTITY,
    truthOwned: [
      'address labels', 'entities', 'clusters',
      'smart money categories', 'exchange/fund/MM/treasury enrichment',
    ],
    providers: [
      { providerId: 'arkham', role: 'owner', tier: 'A3_enrichment' },
      { providerId: 'nansen', role: 'owner', tier: 'A3_enrichment' },
      { providerId: 'alchemy', role: 'prohibited_non_owner', tier: 'A0_native' },
      { providerId: 'coingecko', role: 'prohibited_non_owner', tier: 'A2_breadth' },
      { providerId: 'openai', role: 'prohibited_non_owner', tier: 'A5_expression' },
    ],
    coPrimaryDisagreement: {
      type: 'preserve_contradiction',
      description: 'Arkham and Nansen are co-primaries. Agreement raises attribution confidence. Disagreement is a first-class contradiction, not a bug.',
    },
    noFallbackLine: 'If provenance is weak or co-primary disagreement is material, identity must remain contested or unknown.',
    antiAuthorityRules: [
      'Raw wallet behavior heuristics cannot pretend to be hard identity',
      'Chain-state providers are not entity identity sources',
      'Model output cannot manufacture entity labels',
    ],
    productionLaw: [
      'Entity context is enrichment authority, not chain-state authority',
      'Coinet must distinguish: labeled address, entity cluster, behavioral inference, contested attribution',
    ],
    version: L12_VERSION,
  },

  // ── 9. Reasoning Expression ───────────────────────────────────────────────
  [TRUTH_CLASSES.REASONING_EXPRESSION]: {
    truthClass: TRUTH_CLASSES.REASONING_EXPRESSION,
    sourceClass: SOURCE_CLASSES.REASONING,
    truthOwned: [],
    providers: [
      { providerId: 'openai', role: 'owner', tier: 'A5_expression' },
      { providerId: 'gemini', role: 'owner', tier: 'A5_expression' },
      { providerId: 'xai', role: 'owner', tier: 'A5_expression' },
    ],
    coPrimaryDisagreement: {
      type: 'fresher_wins',
      description: 'Model substitution is acceptable. Expression quality may vary but truth quality depends on upstream layers, not model choice.',
    },
    noFallbackLine: 'If no reasoning model is available, Coinet can still produce structured judgment — it just cannot explain it in natural language.',
    antiAuthorityRules: [
      'The model may not outrank any authority owner',
      'The model may not compress unresolved contradiction into fake certainty',
      'The model may not invent truth, override hard blockers, or launder weak evidence into strong conviction',
    ],
    productionLaw: [
      'Reasoning expression has zero source authority over external truth',
      'The model synthesizes, explains, ranks hypotheses — it does not manufacture observations',
    ],
    version: L12_VERSION,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD-LEVEL AUTHORITY MAPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FieldAuthorityEntry {
  fieldId: string;
  truthClass: TruthClass;
  owner: string;
  confirmers: string[];
  enrichers: string[];
  prohibitedNonOwners: string[];
}

export const FIELD_AUTHORITY_MAP: Record<string, FieldAuthorityEntry> = {
  // ── Market Surface ──
  'price.spot.canonical': {
    fieldId: 'price.spot.canonical', truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    owner: 'coingecko', confirmers: ['coinmarketcap', 'birdeye'], enrichers: [],
    prohibitedNonOwners: ['dexscreener', 'lunarcrush', 'openai'],
  },
  'price.ohlcv': {
    fieldId: 'price.ohlcv', truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    owner: 'coingecko', confirmers: ['coinmarketcap'], enrichers: [],
    prohibitedNonOwners: ['dexscreener', 'openai'],
  },
  'market.cap': {
    fieldId: 'market.cap', truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    owner: 'coingecko', confirmers: ['coinmarketcap'], enrichers: [],
    prohibitedNonOwners: ['openai', 'lunarcrush'],
  },
  'market.supply.circulating': {
    fieldId: 'market.supply.circulating', truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    owner: 'coingecko', confirmers: ['coinmarketcap'], enrichers: [],
    prohibitedNonOwners: ['openai'],
  },

  // ── DEX Emergence ──
  'dex.pool.liquidity': {
    fieldId: 'dex.pool.liquidity', truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    owner: 'geckoterminal', confirmers: ['dexscreener', 'birdeye'], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'lunarcrush', 'openai'],
  },
  'dex.pool.price': {
    fieldId: 'dex.pool.price', truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    owner: 'geckoterminal', confirmers: ['dexscreener'], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'openai'],
  },
  'dex.pair.discovery': {
    fieldId: 'dex.pair.discovery', truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    owner: 'geckoterminal', confirmers: ['dexscreener'], enrichers: [],
    prohibitedNonOwners: ['openai'],
  },

  // ── Derivatives Pressure ──
  'derivatives.oi.aggregate': {
    fieldId: 'derivatives.oi.aggregate', truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    owner: 'coinglass', confirmers: [], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'dexscreener', 'lunarcrush', 'openai'],
  },
  'derivatives.funding.aggregate': {
    fieldId: 'derivatives.funding.aggregate', truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    owner: 'coinglass', confirmers: [], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'lunarcrush', 'openai'],
  },
  'derivatives.liquidation.orderflow': {
    fieldId: 'derivatives.liquidation.orderflow', truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    owner: 'coinglass', confirmers: [], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'openai'],
  },
  'derivatives.leverage.stress': {
    fieldId: 'derivatives.leverage.stress', truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    owner: 'coinglass', confirmers: [], enrichers: [],
    prohibitedNonOwners: ['openai'],
  },

  // ── Protocol Substance ──
  'protocol.tvl.usd': {
    fieldId: 'protocol.tvl.usd', truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    owner: 'defillama', confirmers: [], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'lunarcrush', 'openai'],
  },
  'protocol.fees.daily': {
    fieldId: 'protocol.fees.daily', truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    owner: 'defillama', confirmers: [], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'openai'],
  },
  'protocol.revenue.daily': {
    fieldId: 'protocol.revenue.daily', truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    owner: 'defillama', confirmers: [], enrichers: [],
    prohibitedNonOwners: ['openai'],
  },

  // ── On-Chain Behavior ──
  'onchain.transfers.evm': {
    fieldId: 'onchain.transfers.evm', truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    owner: 'alchemy', confirmers: ['etherscan'], enrichers: ['arkham', 'nansen'],
    prohibitedNonOwners: ['coingecko', 'openai'],
  },
  'onchain.transfers.solana': {
    fieldId: 'onchain.transfers.solana', truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    owner: 'quicknode', confirmers: [], enrichers: ['arkham', 'nansen'],
    prohibitedNonOwners: ['coingecko', 'openai'],
  },
  'onchain.contract.events': {
    fieldId: 'onchain.contract.events', truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    owner: 'alchemy', confirmers: ['etherscan'], enrichers: [],
    prohibitedNonOwners: ['openai'],
  },
  'onchain.whale.flows': {
    fieldId: 'onchain.whale.flows', truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    owner: 'alchemy', confirmers: [], enrichers: ['arkham', 'nansen'],
    prohibitedNonOwners: ['openai', 'lunarcrush'],
  },

  // ── Structural Safety ──
  'security.token.flags': {
    fieldId: 'security.token.flags', truthClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    owner: 'goplus', confirmers: ['etherscan', 'solscan'], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'lunarcrush', 'dexscreener', 'openai'],
  },
  'security.contract.risk': {
    fieldId: 'security.contract.risk', truthClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    owner: 'goplus', confirmers: ['etherscan'], enrichers: [],
    prohibitedNonOwners: ['openai', 'lunarcrush'],
  },

  // ── Narrative Attention ──
  'narrative.news.velocity': {
    fieldId: 'narrative.news.velocity', truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    owner: 'cryptopanic', confirmers: ['twitter_api'], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'defillama', 'openai'],
  },
  'narrative.social.velocity': {
    fieldId: 'narrative.social.velocity', truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    owner: 'lunarcrush', confirmers: ['twitter_api', 'twitter_api_io'], enrichers: [],
    prohibitedNonOwners: ['coingecko', 'defillama', 'openai'],
  },
  'narrative.retail.attention': {
    fieldId: 'narrative.retail.attention', truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    owner: 'lunarcrush', confirmers: [], enrichers: [],
    prohibitedNonOwners: ['openai'],
  },

  // ── Entity Context ──
  'entity.wallet.labels': {
    fieldId: 'entity.wallet.labels', truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    owner: 'arkham', confirmers: ['nansen'], enrichers: [],
    prohibitedNonOwners: ['alchemy', 'coingecko', 'openai'],
  },
  'entity.smart_money': {
    fieldId: 'entity.smart_money', truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    owner: 'nansen', confirmers: ['arkham'], enrichers: [],
    prohibitedNonOwners: ['alchemy', 'openai'],
  },
  'entity.cluster.attribution': {
    fieldId: 'entity.cluster.attribution', truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    owner: 'arkham', confirmers: ['nansen'], enrichers: [],
    prohibitedNonOwners: ['openai'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY API
// ═══════════════════════════════════════════════════════════════════════════════

export function getClassAuthority(truthClass: TruthClass): ClassAuthorityConstitution | undefined {
  return CLASS_AUTHORITY[truthClass];
}

export function getAllClassAuthorities(): ClassAuthorityConstitution[] {
  return Object.values(CLASS_AUTHORITY);
}

export function getFieldAuthority(fieldId: string): FieldAuthorityEntry | undefined {
  return FIELD_AUTHORITY_MAP[fieldId];
}

export function getFieldsForClass(truthClass: TruthClass): FieldAuthorityEntry[] {
  return Object.values(FIELD_AUTHORITY_MAP).filter(f => f.truthClass === truthClass);
}

export function getProviderRole(truthClass: TruthClass, providerId: string): AuthorityRole | 'unassigned' {
  const constitution = CLASS_AUTHORITY[truthClass];
  if (!constitution) return 'unassigned';
  const entry = constitution.providers.find(p => p.providerId === providerId);
  return entry?.role ?? 'unassigned';
}

export function getProviderTier(truthClass: TruthClass, providerId: string): AuthorityTier | null {
  const constitution = CLASS_AUTHORITY[truthClass];
  if (!constitution) return null;
  const entry = constitution.providers.find(p => p.providerId === providerId);
  return entry?.tier ?? null;
}

export function isProviderProhibited(truthClass: TruthClass, providerId: string): boolean {
  return getProviderRole(truthClass, providerId) === 'prohibited_non_owner';
}

export function getOwners(truthClass: TruthClass): string[] {
  const constitution = CLASS_AUTHORITY[truthClass];
  if (!constitution) return [];
  return constitution.providers
    .filter(p => p.role === 'owner')
    .map(p => p.providerId);
}

export function getConfirmers(truthClass: TruthClass): string[] {
  const constitution = CLASS_AUTHORITY[truthClass];
  if (!constitution) return [];
  return constitution.providers
    .filter(p => p.role === 'confirmer')
    .map(p => p.providerId);
}

export function getEnrichers(truthClass: TruthClass): string[] {
  const constitution = CLASS_AUTHORITY[truthClass];
  if (!constitution) return [];
  return constitution.providers
    .filter(p => p.role === 'enricher')
    .map(p => p.providerId);
}
