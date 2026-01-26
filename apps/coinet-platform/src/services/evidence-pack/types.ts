/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📦 UNIVERSAL EVIDENCE PACK — TYPE DEFINITIONS                             ║
 * ║                                                                               ║
 * ║   The single source of truth for all factual claims and numbers.             ║
 * ║   Any LLM stage must treat Evidence Pack as the only facts provider.         ║
 * ║                                                                               ║
 * ║   HARD INVARIANTS:                                                            ║
 * ║   I1. No analysis-intent response without Evidence Pack attached              ║
 * ║   I2. No token-specific metrics unless present in Evidence Pack               ║
 * ║   I3. Coverage map always includes available, missing, freshness_seconds      ║
 * ║   I4. Same inputs → same module plan (deterministic)                          ║
 * ║   I5. Ticker ambiguity must be confidence-gated                               ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// CORE ENUMS & TYPES
// ============================================================================

export type EvidencePackKind = 'TOKEN' | 'MARKET' | 'BOTH';

export type ModuleStatus = 
  | 'success'        // Data fetched successfully
  | 'partial'        // Some data fetched, some missing
  | 'failed'         // Fetch failed
  | 'timeout'        // Fetch timed out
  | 'skipped'        // Skipped due to budget
  | 'not_applicable' // Module doesn't apply (e.g., pumpfun for ETH)
  | 'rate_limited';  // Hit rate limit

export type BudgetTier = 'minimal' | 'standard' | 'full';

export type ResolutionStatus = 
  | 'CONFIRMED'           // High confidence, auto-resolved
  | 'TENTATIVE'           // Medium confidence, proceeding with warning
  | 'NEEDS_CONFIRMATION'  // Low confidence, must ask user
  | 'UNRESOLVED'          // Could not resolve at all
  | 'NOT_REQUIRED';       // No token to resolve (market query)

export type ChainId = 
  | 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'avalanche'
  | 'solana' | 'unknown';

// ============================================================================
// EVIDENCE MODULE WRAPPER (Generic)
// ============================================================================

export interface ModuleError {
  code: string;
  message: string;
}

export interface EvidenceModule<T> {
  module: string;                 // e.g., 'dexscreener'
  status: ModuleStatus;
  ts: number;                     // Unix timestamp of fetch
  freshness_seconds: number;      // Age of data at pack build time
  source: string;                 // API source (e.g., 'dexscreener.com')
  data: T | null;
  error?: ModuleError;
  from_cache: boolean;
  latency_ms: number;
}

// ============================================================================
// TOKEN RESOLUTION
// ============================================================================

export interface ResolvedTokenPrimary {
  chain: ChainId;
  address: string;
  symbol: string;
  name: string;
  confidence: number;
}

export interface TokenCandidate {
  chain: ChainId;
  address: string;
  symbol: string;
  name: string;
  confidence: number;
  liquidity: number;
  volume_24h: number;
  why: string;                    // Why this is a candidate
}

export interface TokenResolution {
  status: ResolutionStatus;
  primary: ResolvedTokenPrimary | null;
  candidates: TokenCandidate[];
  clarification_question: string | null;
  resolution_source: 'address_direct' | 'ticker_search' | 'url_parse' | 'session_cache';
}

// ============================================================================
// COVERAGE MAP (INVARIANT I3)
// ============================================================================

export interface CoverageMap {
  kind: EvidencePackKind;
  available: string[];            // Modules that succeeded
  missing: string[];              // Modules that failed/timed out
  freshness_seconds: Record<string, number>;  // Module → age in seconds
  errors: Record<string, ModuleError>;
  planned_modules: string[];      // What was planned to fetch
  used_budget_tier: BudgetTier;
  total_latency_ms: number;
}

// ============================================================================
// TOKEN MODULE DATA TYPES
// ============================================================================

export interface DexScreenerEvidence {
  price: number;
  price_change_24h: number;
  price_change_1h: number;
  price_change_5m: number;
  volume_24h: number;
  liquidity: number;
  market_cap: number | null;
  fdv: number | null;
  pair_age_hours: number;
  pair_created_at: string;
  txns_24h: { 
    buys: number; 
    sells: number;
    total: number;
  };
  pair_address: string;
  dex_id: string;
}

export interface SecurityEvidence {
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;             // 0-100 (higher = riskier)
  flags: Array<{ 
    code: string; 
    severity: 'info' | 'warning' | 'danger'; 
    description: string;
  }>;
  is_honeypot: boolean | null;
  is_mintable: boolean | null;
  is_proxy: boolean | null;
  is_open_source: boolean | null;
  can_take_back_ownership: boolean | null;
  has_blacklist: boolean | null;
  has_trading_cooldown: boolean | null;
  buy_tax: number | null;         // Percentage
  sell_tax: number | null;        // Percentage
  // Solana-specific
  is_freeze_authority: boolean | null;
  is_mint_authority: boolean | null;
  notes: string[];
}

export interface HoldersEvidence {
  total_holders: number;
  top_10_concentration: number;   // Percentage held by top 10
  top_20_concentration: number;   // Percentage held by top 20
  top_holders: Array<{
    address: string;
    percentage: number;
    label?: string;               // e.g., 'Creator', 'LP', 'Exchange'
  }>;
  whale_count: number;            // Holders with >1% supply
  retail_count: number;           // Holders with <0.01% supply
  distribution_score: number;     // 0-100 (higher = better distributed)
}

export interface PumpFunEvidence {
  bonding_progress: number;       // 0-100%
  is_graduated: boolean;
  raydium_pool: string | null;
  creator: string;
  created_at: string;
  age_minutes: number;
  reply_count: number;
  is_king_of_the_hill: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  recent_buys: number;
  recent_sells: number;
  is_creator_selling: boolean;
  creator_sell_percent: number;
}

export interface SmartMoneyEvidence {
  smart_money_holders: number;
  smart_money_percentage: number;
  recent_activity: Array<{
    wallet: string;
    action: 'buy' | 'sell';
    amount_usd: number;
    timestamp: number;
  }>;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  confidence: number;
}

// ============================================================================
// MARKET MODULE DATA TYPES
// ============================================================================

export interface MarketSnapshotEvidence {
  btc: { 
    price: number; 
    change_24h: number; 
    dominance: number;
    volume_24h: number;
  };
  eth: { 
    price: number; 
    change_24h: number;
    volume_24h: number;
  };
  sol: {
    price: number;
    change_24h: number;
    volume_24h: number;
  };
  total_market_cap: number;
  total_volume_24h: number;
  fear_greed_index: number;
  fear_greed_label: string;
  btc_eth_ratio: number;
  market_trend: 'bullish' | 'bearish' | 'neutral';
}

export interface DerivativesEvidence {
  funding_btc: number;
  funding_eth: number;
  funding_sol: number;
  open_interest_btc: number;
  open_interest_eth: number;
  liquidations_24h: number;
  liquidations_long: number;
  liquidations_short: number;
  long_short_ratio: number;
  market_bias: 'long' | 'short' | 'neutral';
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
}

export interface SentimentEvidence {
  overall_score: number;          // 0-100
  social_score: number;           // 0-100
  news_score: number;             // 0-100
  label: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  trending_topics: string[];
  sentiment_change_24h: number;
}

export interface NewsEvidence {
  articles: Array<{
    title: string;
    source: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    impact: 'high' | 'medium' | 'low';
    timestamp: number;
    url?: string;
  }>;
  dominant_sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  alert_count: number;
  breaking_news: boolean;
  key_events: string[];
}

// ============================================================================
// TOKEN EVIDENCE PACK
// ============================================================================

export interface TokenEvidencePackRequest {
  user_message: string;
  language: string;
  intent: string;
}

export interface TokenEvidencePack {
  kind: 'TOKEN';
  request: TokenEvidencePackRequest;
  resolution: TokenResolution;
  evidence: {
    dexscreener: EvidenceModule<DexScreenerEvidence> | null;
    security: EvidenceModule<SecurityEvidence> | null;
    holders: EvidenceModule<HoldersEvidence> | null;
    pumpfun: EvidenceModule<PumpFunEvidence> | null;
    smartmoney: EvidenceModule<SmartMoneyEvidence> | null;
  };
  coverage: CoverageMap;
  built_at: string;               // ISO timestamp
}

// ============================================================================
// MARKET EVIDENCE PACK
// ============================================================================

export interface MarketEvidencePackRequest {
  user_message: string;
  language: string;
  intent: string;
}

export interface MarketEvidencePack {
  kind: 'MARKET';
  request: MarketEvidencePackRequest;
  evidence: {
    market_snapshot: EvidenceModule<MarketSnapshotEvidence> | null;
    derivatives: EvidenceModule<DerivativesEvidence> | null;
    sentiment: EvidenceModule<SentimentEvidence> | null;
    news: EvidenceModule<NewsEvidence> | null;
  };
  coverage: CoverageMap;
  built_at: string;
}

// ============================================================================
// COMBINED EVIDENCE PACK
// ============================================================================

export interface CombinedEvidencePack {
  kind: 'BOTH';
  token: TokenEvidencePack;
  market: MarketEvidencePack;
  coverage: CoverageMap;          // Unified coverage
  built_at: string;
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type EvidencePack = TokenEvidencePack | MarketEvidencePack | CombinedEvidencePack;

// ============================================================================
// BUILDER INPUT
// ============================================================================

export interface DetectedTokenEntity {
  ref: {
    type: 'contract_address' | 'ticker' | 'dexscreener_url' | 'pumpfun_url' | 'pair_address';
    raw: string;
    normalized: string;
    chain?: ChainId;
    confidence: number;
  };
  position: { start: number; end: number };
  matchedPattern: string;
}

export interface EvidencePackBuilderInput {
  userMessage: string;
  language: string;
  intent: string;
  tokenEntities: DetectedTokenEntity[];
  budgetTier: BudgetTier;
  kind: EvidencePackKind;
  conversationId?: string;
  forceRefresh?: boolean;
}

// ============================================================================
// ELIGIBILITY GATE
// ============================================================================

export interface EligibilityInput {
  userMessage: string;
  detectedIntent: string;
  tokenEntities: DetectedTokenEntity[];
  conversationState: {
    lastResolvedToken?: ResolvedTokenPrimary;
    pendingClarification?: boolean;
    turnCount: number;
  };
}

export interface EligibilityDecision {
  eligible: boolean;
  reason: string;
  kind: EvidencePackKind | 'NONE';
  budgetTier: BudgetTier;
  resolutionStatus: ResolutionStatus;
  tokenCandidates?: TokenCandidate[];
  // For observability
  detectedIntent: string;
  tokenEntitiesCount: number;
}

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

export interface ModuleConfig {
  name: string;
  timeoutMs: number;
  retries: number;
  ttlSeconds: number;
  staleWhileRevalidateSeconds: number;
  requiredForBudget: {
    minimal: boolean;
    standard: boolean;
    full: boolean;
  };
  chainSupport: ChainId[] | 'all';
  conditions?: string[];          // Additional conditions like 'pumpfun_context'
}

export const TOKEN_MODULE_CONFIG: Record<string, ModuleConfig> = {
  dexscreener: {
    name: 'dexscreener',
    timeoutMs: 3000,
    retries: 1,
    ttlSeconds: 30,
    staleWhileRevalidateSeconds: 60,
    requiredForBudget: { minimal: true, standard: true, full: true },
    chainSupport: 'all',
  },
  security: {
    name: 'security',
    timeoutMs: 4000,
    retries: 1,
    ttlSeconds: 600,
    staleWhileRevalidateSeconds: 1800,
    requiredForBudget: { minimal: false, standard: true, full: true },
    chainSupport: 'all',
  },
  holders: {
    name: 'holders',
    timeoutMs: 2500,
    retries: 0,
    ttlSeconds: 300,
    staleWhileRevalidateSeconds: 900,
    requiredForBudget: { minimal: false, standard: false, full: true },
    chainSupport: ['solana', 'ethereum', 'bsc'],
  },
  pumpfun: {
    name: 'pumpfun',
    timeoutMs: 2000,
    retries: 0,
    ttlSeconds: 60,
    staleWhileRevalidateSeconds: 180,
    requiredForBudget: { minimal: false, standard: true, full: true },
    chainSupport: ['solana'],
    conditions: ['pumpfun_context'],
  },
  smartmoney: {
    name: 'smartmoney',
    timeoutMs: 2000,
    retries: 0,
    ttlSeconds: 300,
    staleWhileRevalidateSeconds: 600,
    requiredForBudget: { minimal: false, standard: false, full: true },
    chainSupport: ['solana'],
  },
};

export const MARKET_MODULE_CONFIG: Record<string, ModuleConfig> = {
  market_snapshot: {
    name: 'market_snapshot',
    timeoutMs: 2000,
    retries: 1,
    ttlSeconds: 60,
    staleWhileRevalidateSeconds: 300,
    requiredForBudget: { minimal: true, standard: true, full: true },
    chainSupport: 'all',
  },
  derivatives: {
    name: 'derivatives',
    timeoutMs: 3000,
    retries: 0,
    ttlSeconds: 60,
    staleWhileRevalidateSeconds: 300,
    requiredForBudget: { minimal: false, standard: true, full: true },
    chainSupport: 'all',
  },
  sentiment: {
    name: 'sentiment',
    timeoutMs: 2000,
    retries: 0,
    ttlSeconds: 300,
    staleWhileRevalidateSeconds: 900,
    requiredForBudget: { minimal: false, standard: true, full: true },
    chainSupport: 'all',
  },
  news: {
    name: 'news',
    timeoutMs: 3000,
    retries: 0,
    ttlSeconds: 300,
    staleWhileRevalidateSeconds: 900,
    requiredForBudget: { minimal: false, standard: true, full: true },
    chainSupport: 'all',
    conditions: ['news_context'],
  },
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.60,
  MARGIN_REQUIRED: 0.15,
} as const;

export const LATENCY_TARGETS = {
  minimal: 400,
  standard: 900,
  full: 1500,
} as const;
