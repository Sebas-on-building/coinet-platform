/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     SOURCE SYSTEMS REGISTRY — Layer 1                                         ║
 * ║                                                                               ║
 * ║   The observational foundation of Coinet AI.                                  ║
 * ║                                                                               ║
 * ║   Every source is assigned:                                                   ║
 * ║     - exactly one primary truth role                                          ║
 * ║     - a truth class (what kind of reality it observes)                        ║
 * ║     - operational metadata (tier, rate limits, freshness)                     ║
 * ║     - doctrine constraints (what it may and may not imply)                    ║
 * ║                                                                               ║
 * ║   No source is "the source of truth" for crypto markets as a whole.           ║
 * ║   Each source is only authoritative within its own observational domain.      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH CLASSES — the nine dimensions of market reality Coinet can observe
// ═══════════════════════════════════════════════════════════════════════════════

export const TRUTH_CLASSES = {
  MARKET_SURFACE: 'market_surface',
  DEX_EMERGENCE: 'dex_emergence',
  DERIVATIVES_PRESSURE: 'derivatives_pressure',
  PROTOCOL_SUBSTANCE: 'protocol_substance',
  ONCHAIN_BEHAVIOR: 'onchain_behavior',
  STRUCTURAL_SAFETY: 'structural_safety',
  NARRATIVE_ATTENTION: 'narrative_attention',
  ENTITY_CONTEXT: 'entity_context',
  REASONING_EXPRESSION: 'reasoning_expression',
} as const;

export type TruthClass = (typeof TRUTH_CLASSES)[keyof typeof TRUTH_CLASSES];

export const TRUTH_CLASS_LABELS: Record<TruthClass, string> = {
  market_surface: 'Market Surface',
  dex_emergence: 'DEX Emergence',
  derivatives_pressure: 'Derivatives Pressure',
  protocol_substance: 'Protocol Substance',
  onchain_behavior: 'On-Chain Behavior',
  structural_safety: 'Structural Safety',
  narrative_attention: 'Narrative & Attention',
  entity_context: 'Entity Context',
  reasoning_expression: 'Reasoning Expression',
};

export const TRUTH_CLASS_DESCRIPTIONS: Record<TruthClass, string> = {
  market_surface: 'What is priced, traded, ranked, liquid, and visible at a token level',
  dex_emergence: 'What is forming before it becomes broadly recognized',
  derivatives_pressure: 'Where leverage, crowding, and forced positioning are building',
  protocol_substance: 'Whether there is real business quality behind the token or protocol',
  onchain_behavior: 'What wallets, contracts, treasuries, and liquidity actors are actually doing',
  structural_safety: 'Whether the structure itself may be dangerous, centralized, or deceptive',
  narrative_attention: 'How quickly market mindshare is concentrating or dispersing',
  entity_context: 'Which wallets matter, who they may belong to, and why an action is significant',
  reasoning_expression: 'Judgment expression — converts structured intelligence into reasoning and language',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE CLASS — grouping of providers by truth role
// ═══════════════════════════════════════════════════════════════════════════════

export const SOURCE_CLASSES = {
  MARKET_DATA: 'market_data',
  DEX_DISCOVERY: 'dex_discovery',
  DERIVATIVES: 'derivatives',
  FUNDAMENTALS: 'fundamentals',
  ONCHAIN: 'onchain',
  SECURITY: 'security',
  NARRATIVE: 'narrative',
  ENTITY: 'entity',
  REASONING: 'reasoning',
} as const;

export type SourceClass = (typeof SOURCE_CLASSES)[keyof typeof SOURCE_CLASSES];

export const SOURCE_CLASS_TO_TRUTH: Record<SourceClass, TruthClass> = {
  market_data: TRUTH_CLASSES.MARKET_SURFACE,
  dex_discovery: TRUTH_CLASSES.DEX_EMERGENCE,
  derivatives: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
  fundamentals: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
  onchain: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
  security: TRUTH_CLASSES.STRUCTURAL_SAFETY,
  narrative: TRUTH_CLASSES.NARRATIVE_ATTENTION,
  entity: TRUTH_CLASSES.ENTITY_CONTEXT,
  reasoning: TRUTH_CLASSES.REASONING_EXPRESSION,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH PRECEDENCE — when sources disagree, this resolves authority
// ═══════════════════════════════════════════════════════════════════════════════

export type TruthDomain =
  | 'behavioral'
  | 'pressure'
  | 'substance'
  | 'safety'
  | 'attention'
  | 'context'
  | 'surface'
  | 'expression';

export const TRUTH_PRECEDENCE: Record<TruthDomain, SourceClass[]> = {
  behavioral: [SOURCE_CLASSES.ONCHAIN, SOURCE_CLASSES.ENTITY, SOURCE_CLASSES.MARKET_DATA],
  pressure: [SOURCE_CLASSES.DERIVATIVES, SOURCE_CLASSES.MARKET_DATA],
  substance: [SOURCE_CLASSES.FUNDAMENTALS, SOURCE_CLASSES.ONCHAIN, SOURCE_CLASSES.MARKET_DATA],
  safety: [SOURCE_CLASSES.SECURITY, SOURCE_CLASSES.ONCHAIN],
  attention: [SOURCE_CLASSES.NARRATIVE, SOURCE_CLASSES.MARKET_DATA],
  context: [SOURCE_CLASSES.ENTITY, SOURCE_CLASSES.ONCHAIN],
  surface: [SOURCE_CLASSES.MARKET_DATA, SOURCE_CLASSES.DEX_DISCOVERY],
  expression: [SOURCE_CLASSES.REASONING],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER TIER — reliability and priority ranking
// ═══════════════════════════════════════════════════════════════════════════════

export type ProviderTier = 'primary' | 'secondary' | 'tertiary';

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE PROVIDER DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SourceProviderDef {
  id: string;
  name: string;
  sourceClass: SourceClass;
  tier: ProviderTier;
  truthRole: TruthClass;

  /** What this source is authoritative for */
  authoritativeFor: string[];
  /** What this source must NOT be used for (doctrine constraint) */
  notAuthoritativeFor: string[];

  /** Rate limit (requests per minute) */
  rateLimitPerMin: number;
  /** Expected freshness window (ms) — data older than this is considered stale */
  freshnessWindowMs: number;
  /** Whether this source requires an API key */
  requiresApiKey: boolean;
  /** Environment variable name for the API key */
  apiKeyEnv?: string;

  /** Fallback provider IDs within the same source class */
  fallbacks: string[];

  /** Whether this source can operate as the sole provider for its class */
  canStandAlone: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE DOCTRINE — constraints per source class
// ═══════════════════════════════════════════════════════════════════════════════

export interface SourceClassDoctrine {
  sourceClass: SourceClass;
  truthClass: TruthClass;
  /** What this class is best at */
  bestAt: string[];
  /** What this class must NOT be used for */
  notSufficientFor: string[];
  /** Production rule: how Coinet must treat data from this class */
  productionRule: string;
  /** Can security flags from this class cap confidence? */
  canCapConfidence: boolean;
  /** Should data from this class require cross-layer confirmation? */
  requiresCrossLayerConfirmation: boolean;
}

export const SOURCE_CLASS_DOCTRINES: Record<SourceClass, SourceClassDoctrine> = {
  market_data: {
    sourceClass: SOURCE_CLASSES.MARKET_DATA,
    truthClass: TRUTH_CLASSES.MARKET_SURFACE,
    bestAt: ['spot price', 'market cap', 'volume', 'token metadata', 'ranking', 'broad comparability'],
    notSufficientFor: ['early DEX discovery', 'derivatives structure', 'on-chain behavior', 'security risk', 'protocol economics', 'timing'],
    productionRule: 'Treat as broad reference truth, not complete truth. Surface layer, not the whole market story.',
    canCapConfidence: false,
    requiresCrossLayerConfirmation: false,
  },
  dex_discovery: {
    sourceClass: SOURCE_CLASSES.DEX_DISCOVERY,
    truthClass: TRUTH_CLASSES.DEX_EMERGENCE,
    bestAt: ['new pair detection', 'early liquidity', 'pool activity', 'DEX-native momentum', 'pre-mainstream discovery'],
    notSufficientFor: ['protocol business quality', 'leverage structure', 'wallet interpretation', 'token security'],
    productionRule: 'Treat as high-opportunity but high-noise observation. DEX discovery alone must never produce high-confidence bullishness.',
    canCapConfidence: false,
    requiresCrossLayerConfirmation: true,
  },
  derivatives: {
    sourceClass: SOURCE_CLASSES.DERIVATIVES,
    truthClass: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    bestAt: ['open interest', 'funding', 'liquidations', 'leverage crowding', 'forced-flow visibility'],
    notSufficientFor: ['early discovery', 'protocol quality', 'wallet behavior', 'narrative interpretation', 'token safety'],
    productionRule: 'Treat as pressure truth. Signals become meaningful only inside regime, sequence, spot confirmation, and contradiction analysis.',
    canCapConfidence: false,
    requiresCrossLayerConfirmation: true,
  },
  fundamentals: {
    sourceClass: SOURCE_CLASSES.FUNDAMENTALS,
    truthClass: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    bestAt: ['TVL', 'inflows', 'fees', 'revenue', 'business quality', 'unlock pressure', 'treasury health'],
    notSufficientFor: ['real-time timing', 'leverage dynamics', 'raw chain behavior', 'immediate narrative shifts'],
    productionRule: 'Treat as substance truth. No strong bullish thesis is structurally clean if fundamentals are weak and worsening.',
    canCapConfidence: false,
    requiresCrossLayerConfirmation: false,
  },
  onchain: {
    sourceClass: SOURCE_CLASSES.ONCHAIN,
    truthClass: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    bestAt: ['wallet transfers', 'contract events', 'treasury movement', 'whale flows', 'exchange movements', 'real-time chain activity'],
    notSufficientFor: ['entity identity by itself', 'protocol business quality', 'sentiment', 'leverage structure'],
    productionRule: 'Treat as behavior truth. Highly authoritative as direct observations, but interpretation depends on entity context and timing.',
    canCapConfidence: false,
    requiresCrossLayerConfirmation: false,
  },
  security: {
    sourceClass: SOURCE_CLASSES.SECURITY,
    truthClass: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    bestAt: ['contract verification', 'token risk', 'authority centralization', 'honeypot detection', 'lock status'],
    notSufficientFor: ['opportunity timing', 'market pressure', 'protocol fundamentals', 'sentiment'],
    productionRule: 'Treat as hard constraint truth. Security red flags can cap or crush confidence. Cannot be overruled by bullish momentum.',
    canCapConfidence: true,
    requiresCrossLayerConfirmation: false,
  },
  narrative: {
    sourceClass: SOURCE_CLASSES.NARRATIVE,
    truthClass: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    bestAt: ['news intensity', 'sentiment acceleration', 'narrative breadth', 'social momentum', 'attention asymmetry'],
    notSufficientFor: ['protocol truth', 'leverage truth', 'wallet truth', 'safety truth'],
    productionRule: 'Treat as attention truth, not structural truth. Narrative can explain spread but cannot prove soundness.',
    canCapConfidence: false,
    requiresCrossLayerConfirmation: true,
  },
  entity: {
    sourceClass: SOURCE_CLASSES.ENTITY,
    truthClass: TRUTH_CLASSES.ENTITY_CONTEXT,
    bestAt: ['wallet labels', 'exchange/fund identity', 'smart-money context', 'holder quality', 'cluster meaning'],
    notSufficientFor: ['protocol fundamentals', 'leverage pressure', 'narrative', 'timing'],
    productionRule: 'Treat as context truth. Labels elevate or reduce significance of on-chain behavior. Unlabeled wallets must not be overinterpreted.',
    canCapConfidence: false,
    requiresCrossLayerConfirmation: false,
  },
  reasoning: {
    sourceClass: SOURCE_CLASSES.REASONING,
    truthClass: TRUTH_CLASSES.REASONING_EXPRESSION,
    bestAt: ['explanation', 'synthesis', 'communication', 'user-facing reasoning expression'],
    notSufficientFor: ['raw market truth', 'canonical identity', 'contradiction detection', 'score computation', 'regime classification'],
    productionRule: 'Treat as judgment expression system, not truth-generation system. Must receive structured outputs from prior layers.',
    canCapConfidence: false,
    requiresCrossLayerConfirmation: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER REGISTRY — all known providers
// ═══════════════════════════════════════════════════════════════════════════════

export const PROVIDERS: Record<string, SourceProviderDef> = {
  // ── Market Data ──────────────────────────────────────────────────────────
  coingecko: {
    id: 'coingecko',
    name: 'CoinGecko',
    sourceClass: SOURCE_CLASSES.MARKET_DATA,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.MARKET_SURFACE,
    authoritativeFor: ['spot_price', 'market_cap', 'fdv', 'volume', 'token_metadata', 'ranking'],
    notAuthoritativeFor: ['early_dex', 'derivatives', 'onchain', 'security', 'protocol_economics'],
    rateLimitPerMin: 30,
    freshnessWindowMs: 60_000,
    requiresApiKey: true,
    apiKeyEnv: 'COINGECKO_API_KEY',
    fallbacks: ['coinmarketcap', 'birdeye'],
    canStandAlone: true,
  },
  coinmarketcap: {
    id: 'coinmarketcap',
    name: 'CoinMarketCap',
    sourceClass: SOURCE_CLASSES.MARKET_DATA,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.MARKET_SURFACE,
    authoritativeFor: ['spot_price', 'market_cap', 'volume', 'token_metadata', 'ranking'],
    notAuthoritativeFor: ['early_dex', 'derivatives', 'onchain', 'security'],
    rateLimitPerMin: 30,
    freshnessWindowMs: 60_000,
    requiresApiKey: true,
    apiKeyEnv: 'CMC_API_KEY',
    fallbacks: ['coingecko', 'birdeye'],
    canStandAlone: true,
  },
  birdeye: {
    id: 'birdeye',
    name: 'Birdeye',
    sourceClass: SOURCE_CLASSES.MARKET_DATA,
    tier: 'secondary',
    truthRole: TRUTH_CLASSES.MARKET_SURFACE,
    authoritativeFor: ['solana_prices', 'solana_volume', 'solana_liquidity'],
    notAuthoritativeFor: ['derivatives', 'security', 'protocol_economics'],
    rateLimitPerMin: 60,
    freshnessWindowMs: 30_000,
    requiresApiKey: true,
    apiKeyEnv: 'BIRDEYE_API_KEY',
    fallbacks: ['coingecko', 'dexscreener'],
    canStandAlone: false,
  },

  // ── DEX Discovery ────────────────────────────────────────────────────────
  dexscreener: {
    id: 'dexscreener',
    name: 'DexScreener',
    sourceClass: SOURCE_CLASSES.DEX_DISCOVERY,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.DEX_EMERGENCE,
    authoritativeFor: ['new_pairs', 'dex_liquidity', 'pair_ohlcv', 'dex_momentum', 'early_discovery'],
    notAuthoritativeFor: ['protocol_quality', 'leverage', 'wallet_interpretation', 'security'],
    rateLimitPerMin: 300,
    freshnessWindowMs: 30_000,
    requiresApiKey: false,
    fallbacks: ['geckoterminal'],
    canStandAlone: true,
  },
  geckoterminal: {
    id: 'geckoterminal',
    name: 'GeckoTerminal',
    sourceClass: SOURCE_CLASSES.DEX_DISCOVERY,
    tier: 'secondary',
    truthRole: TRUTH_CLASSES.DEX_EMERGENCE,
    authoritativeFor: ['dex_structure', 'dex_history', 'dex_validation', 'pool_context'],
    notAuthoritativeFor: ['protocol_quality', 'leverage', 'security'],
    rateLimitPerMin: 30,
    freshnessWindowMs: 60_000,
    requiresApiKey: false,
    fallbacks: ['dexscreener'],
    canStandAlone: false,
  },

  // ── Derivatives ──────────────────────────────────────────────────────────
  coinglass: {
    id: 'coinglass',
    name: 'CoinGlass',
    sourceClass: SOURCE_CLASSES.DERIVATIVES,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    authoritativeFor: ['open_interest', 'funding', 'liquidations', 'long_short_ratio', 'leverage_crowding'],
    notAuthoritativeFor: ['early_discovery', 'protocol_quality', 'wallet_behavior', 'narrative', 'safety'],
    rateLimitPerMin: 30,
    freshnessWindowMs: 60_000,
    requiresApiKey: true,
    apiKeyEnv: 'COINGLASS_API_KEY',
    fallbacks: [],
    canStandAlone: true,
  },

  // ── Fundamentals ─────────────────────────────────────────────────────────
  defillama: {
    id: 'defillama',
    name: 'DeFiLlama',
    sourceClass: SOURCE_CLASSES.FUNDAMENTALS,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    authoritativeFor: ['tvl', 'inflows', 'fees', 'revenue', 'chain_liquidity', 'stablecoin_growth', 'unlocks'],
    notAuthoritativeFor: ['real_time_timing', 'leverage_dynamics', 'raw_chain_behavior', 'narrative_shifts'],
    rateLimitPerMin: 60,
    freshnessWindowMs: 300_000,
    requiresApiKey: false,
    fallbacks: [],
    canStandAlone: true,
  },

  // ── On-Chain ─────────────────────────────────────────────────────────────
  alchemy: {
    id: 'alchemy',
    name: 'Alchemy',
    sourceClass: SOURCE_CLASSES.ONCHAIN,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    authoritativeFor: ['wallet_transfers', 'contract_events', 'treasury_movement', 'whale_flows', 'exchange_movements', 'evm_behavior'],
    notAuthoritativeFor: ['entity_identity', 'protocol_quality', 'sentiment', 'leverage'],
    rateLimitPerMin: 300,
    freshnessWindowMs: 15_000,
    requiresApiKey: true,
    apiKeyEnv: 'ALCHEMY_API_KEY',
    fallbacks: ['quicknode'],
    canStandAlone: true,
  },
  quicknode: {
    id: 'quicknode',
    name: 'QuickNode',
    sourceClass: SOURCE_CLASSES.ONCHAIN,
    tier: 'secondary',
    truthRole: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    authoritativeFor: ['solana_behavior', 'real_time_chain_access', 'multi_chain_rpc'],
    notAuthoritativeFor: ['entity_identity', 'protocol_quality', 'sentiment'],
    rateLimitPerMin: 300,
    freshnessWindowMs: 15_000,
    requiresApiKey: true,
    apiKeyEnv: 'QUICKNODE_API_KEY',
    fallbacks: ['alchemy'],
    canStandAlone: false,
  },

  // ── Security ─────────────────────────────────────────────────────────────
  goplus: {
    id: 'goplus',
    name: 'GoPlus',
    sourceClass: SOURCE_CLASSES.SECURITY,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    authoritativeFor: ['contract_risk', 'honeypot_detection', 'authority_centralization', 'lock_status', 'malicious_patterns'],
    notAuthoritativeFor: ['opportunity_timing', 'market_pressure', 'protocol_fundamentals', 'sentiment'],
    rateLimitPerMin: 60,
    freshnessWindowMs: 300_000,
    requiresApiKey: false,
    fallbacks: ['etherscan', 'solscan'],
    canStandAlone: true,
  },
  etherscan: {
    id: 'etherscan',
    name: 'Etherscan',
    sourceClass: SOURCE_CLASSES.SECURITY,
    tier: 'secondary',
    truthRole: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    authoritativeFor: ['contract_verification', 'explorer_validation', 'evm_structural_fallback'],
    notAuthoritativeFor: ['opportunity_timing', 'market_pressure', 'sentiment'],
    rateLimitPerMin: 5,
    freshnessWindowMs: 300_000,
    requiresApiKey: true,
    apiKeyEnv: 'ETHERSCAN_API_KEY',
    fallbacks: ['goplus'],
    canStandAlone: false,
  },
  solscan: {
    id: 'solscan',
    name: 'Solscan',
    sourceClass: SOURCE_CLASSES.SECURITY,
    tier: 'secondary',
    truthRole: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    authoritativeFor: ['solana_contract_verification', 'solana_explorer_validation'],
    notAuthoritativeFor: ['opportunity_timing', 'market_pressure', 'sentiment'],
    rateLimitPerMin: 10,
    freshnessWindowMs: 300_000,
    requiresApiKey: false,
    fallbacks: ['goplus'],
    canStandAlone: false,
  },

  // ── Narrative & Sentiment ────────────────────────────────────────────────
  cryptopanic: {
    id: 'cryptopanic',
    name: 'CryptoPanic',
    sourceClass: SOURCE_CLASSES.NARRATIVE,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    authoritativeFor: ['news_intensity', 'news_sentiment', 'headline_pressure'],
    notAuthoritativeFor: ['protocol_truth', 'leverage_truth', 'wallet_truth', 'safety_truth'],
    rateLimitPerMin: 10,
    freshnessWindowMs: 120_000,
    requiresApiKey: true,
    apiKeyEnv: 'CRYPTOPANIC_API_KEY',
    fallbacks: ['lunarcrush'],
    canStandAlone: false,
  },
  lunarcrush: {
    id: 'lunarcrush',
    name: 'LunarCrush',
    sourceClass: SOURCE_CLASSES.NARRATIVE,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    authoritativeFor: ['social_momentum', 'sentiment_acceleration', 'social_dominance', 'attention_asymmetry'],
    notAuthoritativeFor: ['protocol_truth', 'leverage_truth', 'wallet_truth', 'safety_truth'],
    rateLimitPerMin: 20,
    freshnessWindowMs: 120_000,
    requiresApiKey: true,
    apiKeyEnv: 'LUNARCRUSH_API_KEY',
    fallbacks: ['cryptopanic', 'twitter_api'],
    canStandAlone: false,
  },
  twitter_api: {
    id: 'twitter_api',
    name: 'Twitter/X API',
    sourceClass: SOURCE_CLASSES.NARRATIVE,
    tier: 'secondary',
    truthRole: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    authoritativeFor: ['real_time_social', 'memetic_concentration', 'influencer_activity'],
    notAuthoritativeFor: ['protocol_truth', 'leverage_truth', 'safety_truth'],
    rateLimitPerMin: 15,
    freshnessWindowMs: 60_000,
    requiresApiKey: true,
    apiKeyEnv: 'TWITTER_API_KEY',
    fallbacks: ['twitter_api_io'],
    canStandAlone: false,
  },
  twitter_api_io: {
    id: 'twitter_api_io',
    name: 'TwitterAPI.io',
    sourceClass: SOURCE_CLASSES.NARRATIVE,
    tier: 'tertiary',
    truthRole: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    authoritativeFor: ['twitter_scraping_fallback', 'social_monitoring'],
    notAuthoritativeFor: ['protocol_truth', 'leverage_truth', 'safety_truth'],
    rateLimitPerMin: 30,
    freshnessWindowMs: 120_000,
    requiresApiKey: true,
    apiKeyEnv: 'TWITTER_API_IO_KEY',
    fallbacks: ['lunarcrush'],
    canStandAlone: false,
  },

  // ── Entity Intelligence ──────────────────────────────────────────────────
  arkham: {
    id: 'arkham',
    name: 'Arkham',
    sourceClass: SOURCE_CLASSES.ENTITY,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.ENTITY_CONTEXT,
    authoritativeFor: ['wallet_labels', 'entity_identity', 'smart_money_context', 'holder_quality'],
    notAuthoritativeFor: ['protocol_fundamentals', 'leverage_pressure', 'narrative', 'timing'],
    rateLimitPerMin: 30,
    freshnessWindowMs: 300_000,
    requiresApiKey: true,
    apiKeyEnv: 'ARKHAM_API_KEY',
    fallbacks: ['nansen'],
    canStandAlone: false,
  },
  nansen: {
    id: 'nansen',
    name: 'Nansen',
    sourceClass: SOURCE_CLASSES.ENTITY,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.ENTITY_CONTEXT,
    authoritativeFor: ['wallet_labels', 'cluster_meaning', 'smart_money_flows', 'holder_segmentation'],
    notAuthoritativeFor: ['protocol_fundamentals', 'leverage_pressure', 'narrative'],
    rateLimitPerMin: 20,
    freshnessWindowMs: 300_000,
    requiresApiKey: true,
    apiKeyEnv: 'NANSEN_API_KEY',
    fallbacks: ['arkham'],
    canStandAlone: false,
  },

  // ── Reasoning Models ─────────────────────────────────────────────────────
  openai: {
    id: 'openai',
    name: 'OpenAI',
    sourceClass: SOURCE_CLASSES.REASONING,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.REASONING_EXPRESSION,
    authoritativeFor: ['explanation', 'synthesis', 'communication', 'structured_reasoning'],
    notAuthoritativeFor: ['raw_market_truth', 'canonical_identity', 'contradiction_detection', 'score_computation', 'regime_classification'],
    rateLimitPerMin: 60,
    freshnessWindowMs: Infinity,
    requiresApiKey: true,
    apiKeyEnv: 'OPENAI_API_KEY',
    fallbacks: ['gemini', 'xai'],
    canStandAlone: true,
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    sourceClass: SOURCE_CLASSES.REASONING,
    tier: 'primary',
    truthRole: TRUTH_CLASSES.REASONING_EXPRESSION,
    authoritativeFor: ['explanation', 'synthesis', 'communication'],
    notAuthoritativeFor: ['raw_market_truth', 'canonical_identity', 'score_computation'],
    rateLimitPerMin: 60,
    freshnessWindowMs: Infinity,
    requiresApiKey: true,
    apiKeyEnv: 'GEMINI_API_KEY',
    fallbacks: ['openai', 'xai'],
    canStandAlone: true,
  },
  xai: {
    id: 'xai',
    name: 'xAI',
    sourceClass: SOURCE_CLASSES.REASONING,
    tier: 'secondary',
    truthRole: TRUTH_CLASSES.REASONING_EXPRESSION,
    authoritativeFor: ['explanation', 'synthesis', 'communication'],
    notAuthoritativeFor: ['raw_market_truth', 'canonical_identity', 'score_computation'],
    rateLimitPerMin: 30,
    freshnessWindowMs: Infinity,
    requiresApiKey: true,
    apiKeyEnv: 'XAI_API_KEY',
    fallbacks: ['openai', 'gemini'],
    canStandAlone: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY API
// ═══════════════════════════════════════════════════════════════════════════════

export function getProvider(id: string): SourceProviderDef | undefined {
  return PROVIDERS[id];
}

export function getProvidersByClass(sourceClass: SourceClass): SourceProviderDef[] {
  return Object.values(PROVIDERS).filter(p => p.sourceClass === sourceClass);
}

export function getPrimaryProviders(sourceClass: SourceClass): SourceProviderDef[] {
  return getProvidersByClass(sourceClass).filter(p => p.tier === 'primary');
}

export function getFallbackChain(providerId: string): SourceProviderDef[] {
  const provider = PROVIDERS[providerId];
  if (!provider) return [];
  return provider.fallbacks
    .map(id => PROVIDERS[id])
    .filter((p): p is SourceProviderDef => p !== undefined);
}

export function getDoctrine(sourceClass: SourceClass): SourceClassDoctrine {
  return SOURCE_CLASS_DOCTRINES[sourceClass];
}

export function getTruthPrecedence(domain: TruthDomain): SourceClass[] {
  return TRUTH_PRECEDENCE[domain];
}

export function getAllSourceClasses(): SourceClass[] {
  return Object.values(SOURCE_CLASSES);
}

export function isProviderConfigured(providerId: string): boolean {
  const provider = PROVIDERS[providerId];
  if (!provider) return false;
  if (!provider.requiresApiKey) return true;
  if (!provider.apiKeyEnv) return true;
  return !!process.env[provider.apiKeyEnv];
}

export function getConfiguredProviders(): SourceProviderDef[] {
  return Object.values(PROVIDERS).filter(p => isProviderConfigured(p.id));
}

export function getSourceClassCoverage(): Record<SourceClass, { total: number; configured: number; providers: string[] }> {
  const result = {} as Record<SourceClass, { total: number; configured: number; providers: string[] }>;
  for (const sc of getAllSourceClasses()) {
    const all = getProvidersByClass(sc);
    const configured = all.filter(p => isProviderConfigured(p.id));
    result[sc] = {
      total: all.length,
      configured: configured.length,
      providers: configured.map(p => p.id),
    };
  }
  return result;
}
