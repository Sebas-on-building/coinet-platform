/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 GOLDEN FIXTURES — Test Data for Evidence Pack                          ║
 * ║                                                                               ║
 * ║   Comprehensive fixtures for all module states:                               ║
 * ║   - OK (fresh data)                                                           ║
 * ║   - STALE (freshness_seconds > TTL)                                           ║
 * ║   - MISSING (not applicable)                                                  ║
 * ║   - ERROR (timeout/429/malformed)                                             ║
 * ║   - AMBIGUOUS (needs clarifier)                                               ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  DexScreenerData,
  SecurityData,
  HoldersData,
  SentimentData,
  NewsData,
  DerivativesData,
  OnchainData,
  MarketSnapshotData,
  TokenCandidate,
  ResolvedToken,
  MODULE_TTL_SECONDS,
} from '../../types';

// ============================================================================
// TIMESTAMP HELPERS
// ============================================================================

const NOW_UNIX = Math.floor(Date.now() / 1000);

export function freshTimestamp(moduleName: string): number {
  // Within TTL
  const ttl = MODULE_TTL_SECONDS[moduleName] || 300;
  return NOW_UNIX - Math.floor(ttl * 0.5);
}

export function staleTimestamp(moduleName: string): number {
  // Beyond TTL
  const ttl = MODULE_TTL_SECONDS[moduleName] || 300;
  return NOW_UNIX - (ttl * 2);
}

// ============================================================================
// DEXSCREENER FIXTURES
// ============================================================================

export const DEXSCREENER_OK: DexScreenerData = {
  price_usd: 0.00001234,
  price_native: 0.0000000412,
  liquidity_usd: 125000,
  volume_24h_usd: 450000,
  volume_6h_usd: 120000,
  volume_1h_usd: 25000,
  market_cap_usd: 5000000,
  fdv_usd: 10000000,
  pair_created_at_unix: NOW_UNIX - 86400 * 3,  // 3 days ago
  pair_age_hours: 72,
  txns_5m: { buys: 15, sells: 8 },
  txns_1h: { buys: 180, sells: 95 },
  txns_24h: { buys: 3500, sells: 1800 },
  price_change_5m: 2.5,
  price_change_1h: 8.3,
  price_change_6h: -5.2,
  price_change_24h: 45.6,
  pair_url: 'https://dexscreener.com/solana/abc123',
  dex_name: 'Raydium',
};

export const DEXSCREENER_BTC_OK: DexScreenerData = {
  price_usd: 97500,
  liquidity_usd: 500000000,
  volume_24h_usd: 35000000000,
  market_cap_usd: 1900000000000,
  price_change_24h: -3.2,
  price_change_1h: -0.5,
};

export const DEXSCREENER_LOW_LIQUIDITY: DexScreenerData = {
  ...DEXSCREENER_OK,
  liquidity_usd: 500,  // Very low
  volume_24h_usd: 100,
};

// ============================================================================
// SECURITY FIXTURES
// ============================================================================

export const SECURITY_OK_SAFE: SecurityData = {
  is_honeypot: false,
  buy_tax: 0,
  sell_tax: 0,
  is_mintable: false,
  has_blacklist: false,
  is_proxy: false,
  is_open_source: true,
  owner_change_balance: false,
  can_take_back_ownership: false,
  flags: [],
  risk_score: 5,
  provider: 'goplus',
};

export const SECURITY_OK_RISKY: SecurityData = {
  is_honeypot: false,
  buy_tax: 5,
  sell_tax: 10,
  is_mintable: true,
  has_blacklist: true,
  is_proxy: false,
  is_open_source: true,
  owner_change_balance: true,
  can_take_back_ownership: false,
  flags: [
    { code: 'HIGH_TAX', severity: 'high', description: 'Sell tax above 5%' },
    { code: 'MINTABLE', severity: 'medium', description: 'Token supply can be increased' },
    { code: 'BLACKLIST', severity: 'medium', description: 'Contract has blacklist function' },
  ],
  risk_score: 65,
  provider: 'goplus',
};

export const SECURITY_HONEYPOT: SecurityData = {
  is_honeypot: true,
  buy_tax: 0,
  sell_tax: 100,
  is_mintable: true,
  has_blacklist: true,
  is_proxy: true,
  is_open_source: false,
  owner_change_balance: true,
  can_take_back_ownership: true,
  flags: [
    { code: 'HONEYPOT', severity: 'critical', description: 'Cannot sell - honeypot detected' },
    { code: 'HIDDEN_OWNER', severity: 'critical', description: 'Owner can be changed' },
  ],
  risk_score: 100,
  provider: 'goplus',
};

// ============================================================================
// HOLDERS FIXTURES
// ============================================================================

export const HOLDERS_OK_DISTRIBUTED: HoldersData = {
  total_holders: 15000,
  top_10_percentage: 25,
  top_20_percentage: 35,
  top_holders: [
    { address: 'DexPool...', balance: 1000000, percentage: 8, is_contract: true, label: 'Raydium Pool' },
    { address: 'TeamWallet...', balance: 500000, percentage: 4, is_contract: false, label: 'Team' },
    { address: 'Whale1...', balance: 300000, percentage: 2.4, is_contract: false },
    { address: 'Whale2...', balance: 250000, percentage: 2, is_contract: false },
    { address: 'Whale3...', balance: 200000, percentage: 1.6, is_contract: false },
  ],
  holder_change_24h: 250,
  holder_change_7d: 1500,
  concentration_risk: 'low',
};

export const HOLDERS_CONCENTRATED: HoldersData = {
  total_holders: 500,
  top_10_percentage: 85,
  top_20_percentage: 92,
  top_holders: [
    { address: 'DevWallet...', balance: 50000000, percentage: 50, is_contract: false, label: 'Dev' },
    { address: 'Whale1...', balance: 20000000, percentage: 20, is_contract: false },
    { address: 'Whale2...', balance: 10000000, percentage: 10, is_contract: false },
  ],
  holder_change_24h: -50,
  holder_change_7d: -200,
  concentration_risk: 'critical',
};

// ============================================================================
// SENTIMENT FIXTURES
// ============================================================================

export const SENTIMENT_OK_BULLISH: SentimentData = {
  label: 'greed',
  score: 0.65,
  volume_mentions_24h: 5000,
  trending_rank: 15,
  bullish_percentage: 72,
  social_dominance: 2.5,
  sentiment_change_24h: 0.15,
};

export const SENTIMENT_OK_BEARISH: SentimentData = {
  label: 'fear',
  score: -0.45,
  volume_mentions_24h: 8000,
  trending_rank: 5,
  bullish_percentage: 28,
  social_dominance: 4.2,
  sentiment_change_24h: -0.25,
};

export const SENTIMENT_EXTREME_FEAR: SentimentData = {
  label: 'extreme_fear',
  score: -0.85,
  volume_mentions_24h: 15000,
  bullish_percentage: 12,
};

// ============================================================================
// NEWS FIXTURES
// ============================================================================

export const NEWS_OK_POSITIVE: NewsData = {
  items: [
    {
      headline: 'Major Exchange Lists $PENGUIN Token',
      source: 'CoinDesk',
      url: 'https://coindesk.com/...',
      published_at_unix: NOW_UNIX - 3600,
      sentiment: 'positive',
      relevance_score: 0.95,
    },
    {
      headline: 'PENGUIN Protocol Announces Partnership with Leading DeFi Platform',
      source: 'The Block',
      url: 'https://theblock.co/...',
      published_at_unix: NOW_UNIX - 7200,
      sentiment: 'positive',
      relevance_score: 0.88,
    },
  ],
  overall_sentiment: 'bullish',
  has_critical_news: false,
  dominant_topics: ['listing', 'partnership', 'defi'],
};

export const NEWS_OK_NEGATIVE: NewsData = {
  items: [
    {
      headline: 'SEC Files Lawsuit Against Token Project',
      source: 'Bloomberg',
      published_at_unix: NOW_UNIX - 1800,
      sentiment: 'negative',
      relevance_score: 0.98,
    },
    {
      headline: 'Team Wallet Dumps Large Position',
      source: 'CT Analytics',
      published_at_unix: NOW_UNIX - 3600,
      sentiment: 'negative',
      relevance_score: 0.92,
    },
  ],
  overall_sentiment: 'bearish',
  has_critical_news: true,
  dominant_topics: ['regulation', 'dump', 'legal'],
};

export const NEWS_EMPTY: NewsData = {
  items: [],
  overall_sentiment: 'neutral',
  has_critical_news: false,
  dominant_topics: [],
};

// ============================================================================
// DERIVATIVES FIXTURES
// ============================================================================

export const DERIVATIVES_OK_NEUTRAL: DerivativesData = {
  open_interest_usd: 15000000000,
  open_interest_change_24h: 2.5,
  funding_rate: 0.0001,
  funding_rate_annualized: 0.1095,
  long_short_ratio: 1.05,
  liquidations_24h_usd: 50000000,
  liquidations_long_24h: 30000000,
  liquidations_short_24h: 20000000,
};

export const DERIVATIVES_LONG_SQUEEZE_RISK: DerivativesData = {
  open_interest_usd: 25000000000,
  open_interest_change_24h: 15,
  funding_rate: 0.001,
  funding_rate_annualized: 1.095,
  long_short_ratio: 2.5,
  liquidations_24h_usd: 200000000,
  liquidations_long_24h: 180000000,
  liquidations_short_24h: 20000000,
};

export const DERIVATIVES_SHORT_SQUEEZE_SETUP: DerivativesData = {
  open_interest_usd: 20000000000,
  open_interest_change_24h: -5,
  funding_rate: -0.0005,
  funding_rate_annualized: -0.5475,
  long_short_ratio: 0.6,
  liquidations_24h_usd: 150000000,
  liquidations_long_24h: 30000000,
  liquidations_short_24h: 120000000,
};

// ============================================================================
// ONCHAIN FIXTURES
// ============================================================================

export const ONCHAIN_OK_ACCUMULATION: OnchainData = {
  whale_inflow_24h: 5000000,
  whale_outflow_24h: 2000000,
  whale_net_flow_24h: 3000000,
  exchange_inflow_24h: 1000000,
  exchange_outflow_24h: 3500000,
  exchange_net_flow_24h: -2500000,
  active_addresses_24h: 25000,
  transaction_count_24h: 150000,
  large_transactions_24h: 45,
};

export const ONCHAIN_DISTRIBUTION: OnchainData = {
  whale_inflow_24h: 1000000,
  whale_outflow_24h: 8000000,
  whale_net_flow_24h: -7000000,
  exchange_inflow_24h: 10000000,
  exchange_outflow_24h: 2000000,
  exchange_net_flow_24h: 8000000,
  active_addresses_24h: 50000,
  transaction_count_24h: 300000,
  large_transactions_24h: 120,
};

// ============================================================================
// MARKET SNAPSHOT FIXTURES
// ============================================================================

export const MARKET_SNAPSHOT_OK: MarketSnapshotData = {
  btc_price: 97500,
  btc_dominance: 58.5,
  eth_price: 3200,
  total_market_cap_usd: 3200000000000,
  total_volume_24h_usd: 150000000000,
  fear_greed_index: 65,
  fear_greed_label: 'Greed',
  altcoin_season_index: 35,
  top_gainers: [
    { symbol: 'XRP', change_24h: 25.5 },
    { symbol: 'DOGE', change_24h: 18.2 },
    { symbol: 'ADA', change_24h: 12.8 },
  ],
  top_losers: [
    { symbol: 'SHIB', change_24h: -8.5 },
    { symbol: 'PEPE', change_24h: -6.2 },
  ],
};

export const MARKET_SNAPSHOT_FEAR: MarketSnapshotData = {
  btc_price: 85000,
  btc_dominance: 62,
  eth_price: 2800,
  total_market_cap_usd: 2800000000000,
  total_volume_24h_usd: 200000000000,
  fear_greed_index: 25,
  fear_greed_label: 'Fear',
  altcoin_season_index: 20,
};

// ============================================================================
// TOKEN RESOLUTION FIXTURES
// ============================================================================

export const TOKEN_BTC: ResolvedToken = {
  symbol: 'BTC',
  name: 'Bitcoin',
  chain: 'bitcoin',
  address: null,
  confidence: 1.0,
  margin: 1.0,
  method: 'known_asset',
  is_user_confirmed: false,
  candidates: [
    { symbol: 'BTC', name: 'Bitcoin', chain: 'bitcoin', address: null, confidence: 1.0 },
  ],
};

export const TOKEN_PENGUIN_SOLANA: ResolvedToken = {
  symbol: 'PENGUIN',
  name: 'Penguin Token',
  chain: 'solana',
  address: 'PENGUINabc123def456...',
  confidence: 0.92,
  margin: 0.25,
  method: 'ticker_lookup',
  is_user_confirmed: false,
  candidates: [
    { symbol: 'PENGUIN', name: 'Penguin Token', chain: 'solana', address: 'PENGUINabc123def456...', confidence: 0.92 },
    { symbol: 'PENG', name: 'Penguin Finance', chain: 'avalanche', address: '0x...', confidence: 0.67 },
  ],
};

export const TOKEN_AMBIGUOUS_CANDIDATES: TokenCandidate[] = [
  { symbol: 'PEPE', name: 'Pepe', chain: 'ethereum', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', confidence: 0.75 },
  { symbol: 'PEPE', name: 'Pepe (BSC)', chain: 'bsc', address: '0x...bsc', confidence: 0.72 },
  { symbol: 'PEPE', name: 'Pepe (Solana)', chain: 'solana', address: 'PEPEsol...', confidence: 0.68 },
];

// ============================================================================
// ERROR FIXTURES
// ============================================================================

export const ERROR_TIMEOUT = {
  code: 'TIMEOUT',
  message: 'Request timed out after 800ms',
};

export const ERROR_RATE_LIMIT = {
  code: 'RATE_LIMIT',
  message: 'Too many requests (429)',
};

export const ERROR_PROVIDER_DOWN = {
  code: 'PROVIDER_ERROR',
  message: 'DexScreener API unavailable',
};

export const ERROR_MALFORMED = {
  code: 'PARSE_ERROR',
  message: 'Invalid JSON response from provider',
};

// ============================================================================
// COMPLETE EVIDENCE MODULE FIXTURES
// ============================================================================

export function createDexScreenerEvidence(
  scenario: 'ok' | 'stale' | 'error' | 'missing',
  data: DexScreenerData = DEXSCREENER_OK
) {
  const base = {
    source: 'DexScreener',
    freshness_seconds: 0,
  };

  switch (scenario) {
    case 'ok':
      return {
        ...base,
        status: 'ok' as const,
        ts: freshTimestamp('dexscreener'),
        freshness_seconds: 30,
        data,
      };
    case 'stale':
      return {
        ...base,
        status: 'ok' as const,
        ts: staleTimestamp('dexscreener'),
        freshness_seconds: 180,  // Beyond 60s TTL
        data,
      };
    case 'error':
      return {
        ...base,
        status: 'error' as const,
        ts: NOW_UNIX,
        error_code: ERROR_TIMEOUT.code,
        error_message: ERROR_TIMEOUT.message,
        data: null,
      };
    case 'missing':
      return {
        ...base,
        status: 'missing' as const,
        ts: NOW_UNIX,
        data: null,
      };
  }
}

export function createSecurityEvidence(
  scenario: 'ok' | 'stale' | 'error' | 'missing',
  data: SecurityData = SECURITY_OK_SAFE
) {
  const base = {
    source: 'GoPlus',
    freshness_seconds: 0,
  };

  switch (scenario) {
    case 'ok':
      return {
        ...base,
        status: 'ok' as const,
        ts: freshTimestamp('security'),
        freshness_seconds: 300,
        data,
      };
    case 'stale':
      return {
        ...base,
        status: 'ok' as const,
        ts: staleTimestamp('security'),
        freshness_seconds: 2000,  // Beyond 900s TTL
        data,
      };
    case 'error':
      return {
        ...base,
        status: 'error' as const,
        ts: NOW_UNIX,
        error_code: ERROR_PROVIDER_DOWN.code,
        error_message: ERROR_PROVIDER_DOWN.message,
        data: null,
      };
    case 'missing':
      return {
        ...base,
        status: 'missing' as const,
        ts: NOW_UNIX,
        data: null,
      };
  }
}

// Similar factory functions for other modules...
export function createHoldersEvidence(
  scenario: 'ok' | 'stale' | 'error' | 'missing',
  data: HoldersData = HOLDERS_OK_DISTRIBUTED
) {
  return {
    source: 'Solscan',
    freshness_seconds: scenario === 'ok' ? 120 : (scenario === 'stale' ? 600 : 0),
    status: scenario === 'error' ? 'error' as const : (scenario === 'missing' ? 'missing' as const : 'ok' as const),
    ts: scenario === 'stale' ? staleTimestamp('holders') : freshTimestamp('holders'),
    data: scenario === 'ok' || scenario === 'stale' ? data : null,
    ...(scenario === 'error' && { error_code: ERROR_TIMEOUT.code, error_message: ERROR_TIMEOUT.message }),
  };
}

export function createSentimentEvidence(
  scenario: 'ok' | 'stale' | 'error' | 'missing',
  data: SentimentData = SENTIMENT_OK_BULLISH
) {
  return {
    source: 'CT',
    freshness_seconds: scenario === 'ok' ? 300 : (scenario === 'stale' ? 2000 : 0),
    status: scenario === 'error' ? 'error' as const : (scenario === 'missing' ? 'missing' as const : 'ok' as const),
    ts: scenario === 'stale' ? staleTimestamp('sentiment') : freshTimestamp('sentiment'),
    data: scenario === 'ok' || scenario === 'stale' ? data : null,
  };
}

export function createNewsEvidence(
  scenario: 'ok' | 'stale' | 'error' | 'missing',
  data: NewsData = NEWS_OK_POSITIVE
) {
  return {
    source: 'NewsPipeline',
    freshness_seconds: scenario === 'ok' ? 600 : (scenario === 'stale' ? 4000 : 0),
    status: scenario === 'error' ? 'error' as const : (scenario === 'missing' ? 'missing' as const : 'ok' as const),
    ts: scenario === 'stale' ? staleTimestamp('news') : freshTimestamp('news'),
    data: scenario === 'ok' || scenario === 'stale' ? data : null,
  };
}

export function createDerivativesEvidence(
  scenario: 'ok' | 'stale' | 'error' | 'missing',
  data: DerivativesData = DERIVATIVES_OK_NEUTRAL
) {
  return {
    source: 'Coinglass',
    freshness_seconds: scenario === 'ok' ? 60 : (scenario === 'stale' ? 300 : 0),
    status: scenario === 'error' ? 'error' as const : (scenario === 'missing' ? 'missing' as const : 'ok' as const),
    ts: scenario === 'stale' ? staleTimestamp('derivatives') : freshTimestamp('derivatives'),
    data: scenario === 'ok' || scenario === 'stale' ? data : null,
  };
}

export function createOnchainEvidence(
  scenario: 'ok' | 'stale' | 'error' | 'missing',
  data: OnchainData = ONCHAIN_OK_ACCUMULATION
) {
  return {
    source: 'Indexer',
    freshness_seconds: scenario === 'ok' ? 120 : (scenario === 'stale' ? 700 : 0),
    status: scenario === 'error' ? 'error' as const : (scenario === 'missing' ? 'missing' as const : 'ok' as const),
    ts: scenario === 'stale' ? staleTimestamp('onchain') : freshTimestamp('onchain'),
    data: scenario === 'ok' || scenario === 'stale' ? data : null,
  };
}

export function createMarketSnapshotEvidence(
  scenario: 'ok' | 'stale' | 'error' | 'missing',
  data: MarketSnapshotData = MARKET_SNAPSHOT_OK
) {
  return {
    source: 'CoinGecko',
    freshness_seconds: scenario === 'ok' ? 30 : (scenario === 'stale' ? 180 : 0),
    status: scenario === 'error' ? 'error' as const : (scenario === 'missing' ? 'missing' as const : 'ok' as const),
    ts: scenario === 'stale' ? staleTimestamp('market_snapshot') : freshTimestamp('market_snapshot'),
    data: scenario === 'ok' || scenario === 'stale' ? data : null,
  };
}
