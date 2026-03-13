/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📐 CANONICAL METRIC NAMESPACE — STANDARD METRIC IDENTIFIERS               ║
 * ║                                                                               ║
 * ║   Every source metric maps into this namespace.                               ║
 * ║   Maps to CIS Layer 1 metric_id and OmniScore DataPoint keys.                 ║
 * ║                                                                               ║
 * ║   Part of Coinet AI Production Architecture — Layer 3                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL METRIC KEYS
// ═══════════════════════════════════════════════════════════════════════════════

export const CANONICAL_METRICS = {
  // Price
  PRICE_SPOT: 'price.spot',
  PRICE_DEX: 'price.dex',
  PRICE_CHANGE_5M: 'price.change_5m',
  PRICE_CHANGE_1H: 'price.change_1h',
  PRICE_CHANGE_24H: 'price.change_24h',
  PRICE_CHANGE_7D: 'price.change_7d',

  // Market
  MARKET_CAP: 'market_cap',
  FDV: 'fdv',
  VOLUME_24H: 'volume_24h',
  VOLUME_6H: 'volume_6h',
  VOLUME_1H: 'volume_1h',

  // DEX / Liquidity
  LIQUIDITY_USD: 'liquidity.usd',
  LIQUIDITY_GROWTH_RATE: 'liquidity.growth_rate',
  PAIR_AGE_HOURS: 'pair.age_hours',
  TXNS_BUYS_24H: 'txns.buys_24h',
  TXNS_SELLS_24H: 'txns.sells_24h',

  // Derivatives
  OI_NOTIONAL: 'oi.notional',
  OI_CHANGE_24H: 'oi.change_24h',
  FUNDING_RATE: 'funding.rate',
  FUNDING_RATE_ANNUALIZED: 'funding.rate_annualized',
  LIQ_LONG_USD: 'liq.long.usd',
  LIQ_SHORT_USD: 'liq.short.usd',
  LONG_SHORT_RATIO: 'derivatives.long_short_ratio',

  // Protocol
  PROTOCOL_TVL: 'protocol.tvl',
  PROTOCOL_INFLOWS_USD: 'protocol.inflows.usd',
  PROTOCOL_FEES_USD: 'protocol.fees.usd',
  PROTOCOL_REVENUE_USD: 'protocol.revenue.usd',
  PROTOCOL_UNLOCK_NEXT_USD: 'protocol.unlock.next_usd',

  // On-chain / Wallet
  WALLET_INFLOW_EXCHANGE_USD: 'wallet.inflow.exchange.usd',
  WALLET_OUTFLOW_EXCHANGE_USD: 'wallet.outflow.exchange.usd',
  WALLET_WHALE_NET_FLOW_24H: 'wallet.whale.net_flow_24h',
  ACTIVE_ADDRESSES_24H: 'onchain.active_addresses_24h',
  TRANSACTION_COUNT_24H: 'onchain.transaction_count_24h',

  // Security
  SECURITY_RISK_SCORE: 'security.risk_score',
  SECURITY_IS_HONEYPOT: 'security.is_honeypot',
  SECURITY_TOP_10_HOLDERS_PCT: 'security.top_10_holders_pct',

  // Sentiment / Narrative
  SENTIMENT_VELOCITY: 'sentiment.velocity',
  SENTIMENT_SCORE: 'sentiment.score',
  NARRATIVE_NEWS_INTENSITY: 'narrative.news_intensity',
  NARRATIVE_SOCIAL_ACCELERATION: 'narrative.social_acceleration',
} as const;

export type CanonicalMetricKey = (typeof CANONICAL_METRICS)[keyof typeof CANONICAL_METRICS];

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING: CANONICAL → CIS METRIC_ID
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps canonical metric keys to CIS Layer 1 metric_id format.
 * CIS format: {category}_{name}_v{version}
 * Categories: qs (Quality), os (Opportunity), risk, meta
 */
export const CANONICAL_TO_CIS_METRIC: Record<string, string> = {
  [CANONICAL_METRICS.PRICE_SPOT]: 'os_price_spot_v1',
  [CANONICAL_METRICS.PRICE_DEX]: 'os_price_dex_v1',
  [CANONICAL_METRICS.PRICE_CHANGE_5M]: 'os_momentum_5m_v1',
  [CANONICAL_METRICS.PRICE_CHANGE_1H]: 'os_momentum_1h_v1',
  [CANONICAL_METRICS.PRICE_CHANGE_24H]: 'os_momentum_24h_v1',
  [CANONICAL_METRICS.PRICE_CHANGE_7D]: 'os_momentum_7d_v1',
  [CANONICAL_METRICS.MARKET_CAP]: 'meta_market_cap_v1',
  [CANONICAL_METRICS.FDV]: 'meta_fdv_v1',
  [CANONICAL_METRICS.VOLUME_24H]: 'os_volume_24h_v1',
  [CANONICAL_METRICS.LIQUIDITY_USD]: 'os_liquidity_usd_v1',
  [CANONICAL_METRICS.PAIR_AGE_HOURS]: 'os_pair_age_v1',
  [CANONICAL_METRICS.OI_NOTIONAL]: 'os_oi_notional_v1',
  [CANONICAL_METRICS.FUNDING_RATE]: 'risk_funding_rate_v1',
  [CANONICAL_METRICS.PROTOCOL_TVL]: 'qs_tvl_v1',
  [CANONICAL_METRICS.PROTOCOL_FEES_USD]: 'qs_fees_usd_v1',
  [CANONICAL_METRICS.PROTOCOL_UNLOCK_NEXT_USD]: 'risk_unlock_next_usd_v1',
  [CANONICAL_METRICS.WALLET_INFLOW_EXCHANGE_USD]: 'risk_exchange_inflow_v1',
  [CANONICAL_METRICS.WALLET_OUTFLOW_EXCHANGE_USD]: 'risk_exchange_outflow_v1',
  [CANONICAL_METRICS.SECURITY_RISK_SCORE]: 'risk_security_score_v1',
  [CANONICAL_METRICS.SECURITY_TOP_10_HOLDERS_PCT]: 'risk_concentration_v1',
  [CANONICAL_METRICS.SENTIMENT_SCORE]: 'os_sentiment_v1',
  [CANONICAL_METRICS.NARRATIVE_NEWS_INTENSITY]: 'os_news_intensity_v1',
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING: CANONICAL → EVIDENCE PACK / OMNISCORE KEY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps canonical metric keys to Evidence Pack / OmniScore DataPoint key names.
 */
export const CANONICAL_TO_DATAPOINT_KEY: Record<string, string> = {
  [CANONICAL_METRICS.PRICE_SPOT]: 'price_usd',
  [CANONICAL_METRICS.PRICE_DEX]: 'price_usd',
  [CANONICAL_METRICS.MARKET_CAP]: 'market_cap_usd',
  [CANONICAL_METRICS.FDV]: 'fdv_usd',
  [CANONICAL_METRICS.VOLUME_24H]: 'volume_24h_usd',
  [CANONICAL_METRICS.LIQUIDITY_USD]: 'liquidity_usd',
  [CANONICAL_METRICS.PAIR_AGE_HOURS]: 'pair_age_hours',
  [CANONICAL_METRICS.OI_NOTIONAL]: 'open_interest_usd',
  [CANONICAL_METRICS.FUNDING_RATE]: 'funding_rate',
  [CANONICAL_METRICS.PROTOCOL_TVL]: 'tvl_usd',
  [CANONICAL_METRICS.SECURITY_RISK_SCORE]: 'risk_score',
  [CANONICAL_METRICS.SENTIMENT_SCORE]: 'sentiment_score',
};

/** Get CIS metric_id for a canonical key, or the canonical key itself if no mapping */
export function getCisMetricId(canonicalKey: CanonicalMetricKey | string): string {
  return CANONICAL_TO_CIS_METRIC[canonicalKey] ?? canonicalKey;
}

/** Get DataPoint key for a canonical key, or the canonical key itself */
export function getDatapointKey(canonicalKey: CanonicalMetricKey | string): string {
  return CANONICAL_TO_DATAPOINT_KEY[canonicalKey] ?? canonicalKey;
}
