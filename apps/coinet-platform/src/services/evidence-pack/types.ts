/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📦 EVIDENCE PACK v1 — TYPE DEFINITIONS                                    ║
 * ║                                                                               ║
 * ║   The ONLY source of numeric truth for Pass-1 engines.                        ║
 * ║   Every module is timestamped, sourced, and freshness-scored.                 ║
 * ║   Missing/stale data is EXPLICIT, never silently ignored.                     ║
 * ║                                                                               ║
 * ║   HARD INVARIANTS:                                                            ║
 * ║   I1. Evidence Pack is server-generated, NEVER LLM-generated                  ║
 * ║   I2. Every module has status + timestamp + source + freshness                ║
 * ║   I3. Token identity is confidence-gated (≥0.85 AND margin ≥0.15)            ║
 * ║   I4. Coverage map is always present and accurate                             ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ============================================================================
// VERSION
// ============================================================================

export const EVIDENCE_PACK_VERSION = '1.0.0' as const;

// ============================================================================
// ENUMS
// ============================================================================

export const EvidencePackKind = z.enum(['TOKEN', 'MARKET', 'COMBINED']);
export type EvidencePackKind = z.infer<typeof EvidencePackKind>;

export const ModuleStatus = z.enum(['ok', 'missing', 'stale', 'error']);
export type ModuleStatus = z.infer<typeof ModuleStatus>;

export const ResolutionMethod = z.enum([
  'known_asset',      // BTC, ETH, SOL - well-known majors
  'ticker_lookup',    // $PENGUIN lookup
  'address',          // Direct contract address
  'url',              // DEXScreener/pump.fun URL
  'chain_hint',       // "SOL token called X"
  'session_reuse',    // Reused from last_resolved_token
]);
export type ResolutionMethod = z.infer<typeof ResolutionMethod>;

export const ClarifierType = z.enum([
  'ambiguous_ticker',   // Multiple tokens with same ticker
  'multiple_chains',    // Token exists on multiple chains
  'no_match',           // No token found
  'need_address',       // Need contract address for certainty
]);
export type ClarifierType = z.infer<typeof ClarifierType>;

export const EvidenceIntent = z.enum([
  'EXPLAIN_MOVE',
  'MARKET_OVERVIEW',
  'TOKEN_ANALYSIS',
  'DECISION_HELP',
  'NEW_COIN_ANALYSIS',
  'PORTFOLIO_ANALYSIS',
  'NEWS_SUMMARY',
  'DERIVATIVES_CHECK',
  'SENTIMENT_CHECK',
  'WHALE_TRACKING',
  'QUICK_PRICE',
  'LEARNING',
  'OTHER',
]);
export type EvidenceIntent = z.infer<typeof EvidenceIntent>;

export const Timeframe = z.enum(['snapshot', 'today', 'week', 'historical']);
export type Timeframe = z.infer<typeof Timeframe>;

export const ResponseDepth = z.enum(['S', 'M', 'L']);
export type ResponseDepth = z.infer<typeof ResponseDepth>;

// ============================================================================
// TTL CONFIGURATION
// ============================================================================

export const MODULE_TTL_SECONDS: Record<string, number> = {
  dexscreener: 60,
  coingecko: 120,
  security: 900,      // 15 min
  holders: 300,       // 5 min
  sentiment: 900,     // 15 min
  news: 1800,         // 30 min
  derivatives: 120,   // 2 min
  onchain: 300,       // 5 min
  market_snapshot: 60,
};

// ============================================================================
// REQUEST METADATA
// ============================================================================

export const EvidenceRequest = z.object({
  user_message: z.string(),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  intent: EvidenceIntent,
  timeframe: Timeframe,
  requested_depth: ResponseDepth,
  received_at_unix: z.number().int().positive(),
}).strict();
export type EvidenceRequest = z.infer<typeof EvidenceRequest>;

// ============================================================================
// TOKEN RESOLUTION
// ============================================================================

export const TokenCandidate = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  chain: z.string(),
  address: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  logo_url: z.string().url().optional(),
}).strict();
export type TokenCandidate = z.infer<typeof TokenCandidate>;

export const ResolvedToken = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  chain: z.string(),
  address: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  margin: z.number().min(0).max(1),  // confidence - second_best
  method: ResolutionMethod,
  is_user_confirmed: z.boolean(),
  candidates: z.array(TokenCandidate).max(5),
}).strict();
export type ResolvedToken = z.infer<typeof ResolvedToken>;

export const TokenClarifier = z.object({
  question: z.string(),
  type: ClarifierType,
  candidates: z.array(TokenCandidate).max(5),
  attempt_count: z.number().int().min(1).max(2),
}).strict();
export type TokenClarifier = z.infer<typeof TokenClarifier>;

export const TokenResolution = z.object({
  input_entities: z.array(z.string()),
  resolved: z.array(ResolvedToken),
  clarifier: TokenClarifier.nullable(),
  used_session_cache: z.boolean(),
}).strict();
export type TokenResolution = z.infer<typeof TokenResolution>;

// ============================================================================
// CONFIDENCE THRESHOLDS
// ============================================================================

export const RESOLUTION_THRESHOLDS = {
  MIN_CONFIDENCE: 0.85,
  MIN_MARGIN: 0.15,
  MAX_CLARIFIER_ATTEMPTS: 2,
} as const;

// ============================================================================
// EVIDENCE MODULE BASE
// ============================================================================

export const EvidenceModuleBase = z.object({
  status: ModuleStatus,
  ts: z.number().int().positive(),
  source: z.string(),
  freshness_seconds: z.number().int().nonnegative(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
}).strict();
export type EvidenceModuleBase = z.infer<typeof EvidenceModuleBase>;

// ============================================================================
// DEXSCREENER MODULE
// ============================================================================

export const DexScreenerData = z.object({
  price_usd: z.number().nonnegative(),
  price_native: z.number().nonnegative().optional(),
  liquidity_usd: z.number().nonnegative(),
  volume_24h_usd: z.number().nonnegative(),
  volume_6h_usd: z.number().nonnegative().optional(),
  volume_1h_usd: z.number().nonnegative().optional(),
  market_cap_usd: z.number().nonnegative().optional(),
  fdv_usd: z.number().nonnegative().optional(),
  pair_created_at_unix: z.number().int().positive().optional(),
  pair_age_hours: z.number().nonnegative().optional(),
  txns_5m: z.object({ buys: z.number(), sells: z.number() }).optional(),
  txns_1h: z.object({ buys: z.number(), sells: z.number() }).optional(),
  txns_24h: z.object({ buys: z.number(), sells: z.number() }).optional(),
  price_change_5m: z.number().optional(),
  price_change_1h: z.number().optional(),
  price_change_6h: z.number().optional(),
  price_change_24h: z.number().optional(),
  pair_url: z.string().url().optional(),
  dex_name: z.string().optional(),
}).strict();
export type DexScreenerData = z.infer<typeof DexScreenerData>;

export const DexScreenerEvidence = EvidenceModuleBase.extend({
  data: DexScreenerData.nullable(),
}).strict();
export type DexScreenerEvidence = z.infer<typeof DexScreenerEvidence>;

// ============================================================================
// SECURITY MODULE (GoPlus / RugCheck)
// ============================================================================

export const SecurityFlag = z.object({
  code: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  description: z.string(),
}).strict();
export type SecurityFlag = z.infer<typeof SecurityFlag>;

export const SecurityData = z.object({
  is_honeypot: z.boolean().nullable(),
  buy_tax: z.number().min(0).max(100).nullable(),
  sell_tax: z.number().min(0).max(100).nullable(),
  is_mintable: z.boolean().nullable(),
  has_blacklist: z.boolean().nullable(),
  is_proxy: z.boolean().nullable(),
  is_open_source: z.boolean().nullable(),
  owner_change_balance: z.boolean().nullable(),
  can_take_back_ownership: z.boolean().nullable(),
  flags: z.array(SecurityFlag),
  risk_score: z.number().min(0).max(100),
  provider: z.enum(['goplus', 'rugcheck', 'unknown']),
}).strict();
export type SecurityData = z.infer<typeof SecurityData>;

export const SecurityEvidence = EvidenceModuleBase.extend({
  data: SecurityData.nullable(),
}).strict();
export type SecurityEvidence = z.infer<typeof SecurityEvidence>;

// ============================================================================
// HOLDERS MODULE
// ============================================================================

export const TopHolder = z.object({
  address: z.string(),
  balance: z.number().nonnegative(),
  percentage: z.number().min(0).max(100),
  is_contract: z.boolean().optional(),
  label: z.string().optional(),
}).strict();
export type TopHolder = z.infer<typeof TopHolder>;

export const HoldersData = z.object({
  total_holders: z.number().int().nonnegative(),
  top_10_percentage: z.number().min(0).max(100),
  top_20_percentage: z.number().min(0).max(100).optional(),
  top_holders: z.array(TopHolder).max(20),
  holder_change_24h: z.number().optional(),
  holder_change_7d: z.number().optional(),
  concentration_risk: z.enum(['low', 'medium', 'high', 'critical']),
}).strict();
export type HoldersData = z.infer<typeof HoldersData>;

export const HoldersEvidence = EvidenceModuleBase.extend({
  data: HoldersData.nullable(),
}).strict();
export type HoldersEvidence = z.infer<typeof HoldersEvidence>;

// ============================================================================
// SENTIMENT MODULE
// ============================================================================

export const SentimentData = z.object({
  label: z.enum(['extreme_fear', 'fear', 'neutral', 'greed', 'extreme_greed']),
  score: z.number().min(-1).max(1),
  volume_mentions_24h: z.number().int().nonnegative().optional(),
  trending_rank: z.number().int().positive().optional(),
  bullish_percentage: z.number().min(0).max(100).optional(),
  social_dominance: z.number().min(0).max(100).optional(),
  sentiment_change_24h: z.number().optional(),
}).strict();
export type SentimentData = z.infer<typeof SentimentData>;

export const SentimentEvidence = EvidenceModuleBase.extend({
  data: SentimentData.nullable(),
}).strict();
export type SentimentEvidence = z.infer<typeof SentimentEvidence>;

// ============================================================================
// NEWS MODULE
// ============================================================================

export const NewsItem = z.object({
  headline: z.string(),
  source: z.string(),
  url: z.string().url().optional(),
  published_at_unix: z.number().int().positive(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  relevance_score: z.number().min(0).max(1).optional(),
}).strict();
export type NewsItem = z.infer<typeof NewsItem>;

export const NewsData = z.object({
  items: z.array(NewsItem).max(10),
  overall_sentiment: z.enum(['bullish', 'bearish', 'neutral', 'mixed']),
  has_critical_news: z.boolean(),
  dominant_topics: z.array(z.string()).max(5),
}).strict();
export type NewsData = z.infer<typeof NewsData>;

export const NewsEvidence = EvidenceModuleBase.extend({
  data: NewsData.nullable(),
}).strict();
export type NewsEvidence = z.infer<typeof NewsEvidence>;

// ============================================================================
// DERIVATIVES MODULE
// ============================================================================

export const DerivativesData = z.object({
  open_interest_usd: z.number().nonnegative().optional(),
  open_interest_change_24h: z.number().optional(),
  funding_rate: z.number().optional(),
  funding_rate_annualized: z.number().optional(),
  long_short_ratio: z.number().positive().optional(),
  liquidations_24h_usd: z.number().nonnegative().optional(),
  liquidations_long_24h: z.number().nonnegative().optional(),
  liquidations_short_24h: z.number().nonnegative().optional(),
  predicted_funding: z.number().optional(),
  basis: z.number().optional(),
}).strict();
export type DerivativesData = z.infer<typeof DerivativesData>;

export const DerivativesEvidence = EvidenceModuleBase.extend({
  data: DerivativesData.nullable(),
}).strict();
export type DerivativesEvidence = z.infer<typeof DerivativesEvidence>;

// ============================================================================
// ONCHAIN MODULE
// ============================================================================

export const OnchainData = z.object({
  whale_inflow_24h: z.number().optional(),
  whale_outflow_24h: z.number().optional(),
  whale_net_flow_24h: z.number().optional(),
  exchange_inflow_24h: z.number().optional(),
  exchange_outflow_24h: z.number().optional(),
  exchange_net_flow_24h: z.number().optional(),
  active_addresses_24h: z.number().int().nonnegative().optional(),
  transaction_count_24h: z.number().int().nonnegative().optional(),
  large_transactions_24h: z.number().int().nonnegative().optional(),
}).strict();
export type OnchainData = z.infer<typeof OnchainData>;

export const OnchainEvidence = EvidenceModuleBase.extend({
  data: OnchainData.nullable(),
}).strict();
export type OnchainEvidence = z.infer<typeof OnchainEvidence>;

// ============================================================================
// MARKET SNAPSHOT MODULE (for MARKET kind)
// ============================================================================

export const MarketSnapshotData = z.object({
  btc_price: z.number().positive(),
  btc_dominance: z.number().min(0).max(100),
  eth_price: z.number().positive(),
  total_market_cap_usd: z.number().positive(),
  total_volume_24h_usd: z.number().nonnegative(),
  fear_greed_index: z.number().int().min(0).max(100).optional(),
  fear_greed_label: z.string().optional(),
  altcoin_season_index: z.number().min(0).max(100).optional(),
  top_gainers: z.array(z.object({
    symbol: z.string(),
    change_24h: z.number(),
  })).max(5).optional(),
  top_losers: z.array(z.object({
    symbol: z.string(),
    change_24h: z.number(),
  })).max(5).optional(),
}).strict();
export type MarketSnapshotData = z.infer<typeof MarketSnapshotData>;

export const MarketSnapshotEvidence = EvidenceModuleBase.extend({
  data: MarketSnapshotData.nullable(),
}).strict();
export type MarketSnapshotEvidence = z.infer<typeof MarketSnapshotEvidence>;

// ============================================================================
// COVERAGE MAP
// ============================================================================

export const CoverageMap = z.object({
  available: z.array(z.string()),
  missing: z.array(z.string()),
  stale: z.array(z.string()),
  errors: z.array(z.string()),
  freshness_seconds: z.record(z.string(), z.number().int().nonnegative()),
  quality_score: z.number().min(0).max(1),
  time_disclosure_required: z.boolean(),
}).strict();
export type CoverageMap = z.infer<typeof CoverageMap>;

// ============================================================================
// EVIDENCE MODULES CONTAINER
// ============================================================================

export const EvidenceModules = z.object({
  dexscreener: DexScreenerEvidence.optional(),
  security: SecurityEvidence.optional(),
  holders: HoldersEvidence.optional(),
  sentiment: SentimentEvidence.optional(),
  news: NewsEvidence.optional(),
  derivatives: DerivativesEvidence.optional(),
  onchain: OnchainEvidence.optional(),
  market_snapshot: MarketSnapshotEvidence.optional(),
}).strict();
export type EvidenceModules = z.infer<typeof EvidenceModules>;

// ============================================================================
// TOKEN EVIDENCE PACK (for single token analysis)
// ============================================================================

export const TokenEvidencePackSchema = z.object({
  version: z.literal(EVIDENCE_PACK_VERSION),
  kind: z.literal('TOKEN'),
  request: EvidenceRequest,
  token_resolution: TokenResolution,
  evidence: EvidenceModules,
  coverage: CoverageMap,
}).strict();
export type TokenEvidencePack = z.infer<typeof TokenEvidencePackSchema>;

// ============================================================================
// MARKET EVIDENCE PACK (for market overview)
// ============================================================================

export const MarketEvidencePackSchema = z.object({
  version: z.literal(EVIDENCE_PACK_VERSION),
  kind: z.literal('MARKET'),
  request: EvidenceRequest,
  token_resolution: TokenResolution,  // May be empty for pure market queries
  evidence: EvidenceModules,
  coverage: CoverageMap,
}).strict();
export type MarketEvidencePack = z.infer<typeof MarketEvidencePackSchema>;

// ============================================================================
// COMBINED EVIDENCE PACK (token + market context)
// ============================================================================

export const CombinedEvidencePackSchema = z.object({
  version: z.literal(EVIDENCE_PACK_VERSION),
  kind: z.literal('COMBINED'),
  request: EvidenceRequest,
  token_resolution: TokenResolution,
  evidence: EvidenceModules,
  coverage: CoverageMap,
}).strict();
export type CombinedEvidencePack = z.infer<typeof CombinedEvidencePackSchema>;

// ============================================================================
// UNION TYPE
// ============================================================================

export const EvidencePackSchema = z.discriminatedUnion('kind', [
  TokenEvidencePackSchema,
  MarketEvidencePackSchema,
  CombinedEvidencePackSchema,
]);
export type EvidencePack = z.infer<typeof EvidencePackSchema>;

// ============================================================================
// BUILDER OPTIONS
// ============================================================================

export interface EvidencePackBuildOptions {
  userMessage: string;
  language: string;
  intent: EvidenceIntent;
  timeframe?: Timeframe;
  depth?: ResponseDepth;
  
  // Token resolution
  inputEntities: string[];
  sessionLastToken?: ResolvedToken;
  pendingClarifier?: TokenClarifier;
  
  // Module selection overrides
  skipModules?: string[];
  forceModules?: string[];
  
  // Timeouts
  globalTimeoutMs?: number;
  perModuleTimeoutMs?: number;
}

export interface EvidencePackBuildResult {
  ok: true;
  pack: EvidencePack;
  buildTimeMs: number;
  modulesAttempted: string[];
  modulesFailed: string[];
  /** Module-level event traces for source-governance diagnostics */
  moduleEvents?: ModuleResultEvent[];
}

export interface EvidencePackBuildFailure {
  ok: false;
  error: string;
  partialPack?: Partial<EvidencePack>;
  buildTimeMs: number;
}

export type EvidencePackBuildOutput = EvidencePackBuildResult | EvidencePackBuildFailure;

// ============================================================================
// OBSERVABILITY EVENTS
// ============================================================================

export interface TokenResolutionEvent {
  type: 'TOKEN_RESOLUTION_DECISION';
  timestamp: number;
  input_entities: string[];
  resolved_count: number;
  confidence: number;
  margin: number;
  method: ResolutionMethod;
  reused_session: boolean;
  clarifier_generated: boolean;
}

export interface ModuleResultEvent {
  type: 'EVIDENCE_MODULE_RESULT';
  timestamp: number;
  module: string;
  status: ModuleStatus;
  freshness_seconds: number;
  latency_ms: number;
  error_code?: string;
}

export interface PackCompleteEvent {
  type: 'EVIDENCE_PACK_COMPLETE';
  timestamp: number;
  kind: EvidencePackKind;
  available_modules: string[];
  missing_modules: string[];
  quality_score: number;
  total_latency_ms: number;
}

export interface ProviderErrorEvent {
  type: 'PROVIDER_ERROR';
  timestamp: number;
  provider: string;
  module: string;
  error_code: string;
  is_rate_limit: boolean;
}

export type EvidenceObservabilityEvent =
  | TokenResolutionEvent
  | ModuleResultEvent
  | PackCompleteEvent
  | ProviderErrorEvent;

// ============================================================================
// MODULE SELECTION MATRIX
// ============================================================================

/**
 * Determines which modules to fetch based on intent.
 * Returns: { required: string[], optional: string[] }
 */
export function getModulesForIntent(intent: EvidenceIntent, hasToken: boolean): {
  required: string[];
  optional: string[];
} {
  const TOKEN_MODULES = {
    required: ['dexscreener'],
    optional: ['security', 'holders', 'sentiment'],
  };

  const MARKET_MODULES = {
    required: ['market_snapshot'],
    optional: ['news', 'sentiment', 'derivatives'],
  };

  switch (intent) {
    case 'TOKEN_ANALYSIS':
    case 'NEW_COIN_ANALYSIS':
    case 'DECISION_HELP':
      return hasToken
        ? { required: ['dexscreener', 'security'], optional: ['holders', 'sentiment', 'news'] }
        : MARKET_MODULES;

    case 'EXPLAIN_MOVE':
      return hasToken
        ? { required: ['dexscreener'], optional: ['news', 'derivatives', 'sentiment'] }
        : { required: ['market_snapshot'], optional: ['news', 'derivatives'] };

    case 'MARKET_OVERVIEW':
      return { required: ['market_snapshot'], optional: ['news', 'sentiment'] };

    case 'NEWS_SUMMARY':
      return { required: ['news'], optional: hasToken ? ['dexscreener'] : ['market_snapshot'] };

    case 'DERIVATIVES_CHECK':
      return hasToken
        ? { required: ['derivatives'], optional: ['dexscreener'] }
        : { required: ['derivatives', 'market_snapshot'], optional: [] };

    case 'SENTIMENT_CHECK':
      return hasToken
        ? { required: ['sentiment'], optional: ['dexscreener', 'news'] }
        : { required: ['sentiment', 'market_snapshot'], optional: ['news'] };

    case 'WHALE_TRACKING':
      return hasToken
        ? { required: ['onchain', 'holders'], optional: ['dexscreener'] }
        : { required: ['onchain'], optional: ['market_snapshot'] };

    case 'QUICK_PRICE':
      return hasToken
        ? { required: ['dexscreener'], optional: [] }
        : { required: ['market_snapshot'], optional: [] };

    case 'PORTFOLIO_ANALYSIS':
      return { required: ['market_snapshot'], optional: ['sentiment', 'news'] };

    default:
      return hasToken ? TOKEN_MODULES : MARKET_MODULES;
  }
}

// Note: All schemas are exported inline where defined
