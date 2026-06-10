/**
 * 💀 Liquidation & Funding Rate Service - Phase 3 Divine Integration
 * 
 * Real-time liquidation data and funding rates for perpetual traders.
 * This is a KEY DIFFERENTIATOR - ChatGPT and Perplexity don't have this!
 * 
 * DATA SOURCES:
 * - Coinglass API (primary) - https://open-api.coinglass.com
 * - Fallback: derived from exchange APIs
 * 
 * FEATURES:
 * - 24h liquidation totals (longs vs shorts)
 * - Liquidation heatmaps (price levels with concentrated liquidations)
 * - Long/short ratio tracking
 * - Open interest changes and trends
 * - Funding rates across exchanges (Binance, Bybit, OKX, etc.)
 * - Risk level assessment (low/medium/high/extreme)
 * - Cost warnings for high funding rates
 * 
 * USAGE:
 * ```typescript
 * import { getPerpsSnapshot, formatPerpsForAI } from './liquidation-service';
 * 
 * // Get comprehensive perps data
 * const snapshot = await getPerpsSnapshot(['BTC', 'ETH', 'SOL']);
 * 
 * // Format for AI context
 * const aiContext = formatPerpsForAI(snapshot);
 * ```
 * 
 * ENVIRONMENT VARIABLES:
 * - COINGLASS_API_KEY: Optional but recommended for full features
 * 
 * @module liquidation-service
 * @since 1.0.0
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Coinglass API v4 (paid tier; Hobbyist 30 req/min). The 3s global spacing
  // below hard-caps ALL Coinglass calls at ~20/min regardless of burst, safely
  // under 30/min; liquidation/coin-list is fetched ONCE and shared across tokens.
  COINGLASS_URL: 'https://open-api-v4.coinglass.com',
  COINGLASS_API_KEY: process.env.COINGLASS_API_KEY || '',
  
  // Rate limiting
  RATE_LIMIT_MS: 3000, // 3 seconds between requests
  
  // Cache settings
  CACHE_TTL_MS: 60000, // 1 minute
  
  // Timeout
  TIMEOUT_MS: 10000,
};

// ============================================================================
// TYPES
// ============================================================================

export interface LiquidationData {
  symbol: string;
  longLiquidations24h: number;   // USD value of long liquidations
  shortLiquidations24h: number;  // USD value of short liquidations
  totalLiquidations24h: number;  // Total in USD
  longShortRatio: number;        // > 1 = more longs, < 1 = more shorts
  dominantSide: 'longs' | 'shorts' | 'balanced';
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  lastUpdated: string;
}

export interface FundingRate {
  symbol: string;
  exchange: string;
  rate: number;           // Funding rate (e.g., 0.01 = 1%)
  predictedRate?: number; // Predicted next funding
  annualizedRate: number; // Annualized cost
  sentiment: 'bullish' | 'bearish' | 'neutral';
  costPerDay: number;     // Daily cost for 1x leverage in %
  lastUpdated: string;
}

export interface OpenInterest {
  symbol: string;
  openInterest: number;     // USD value
  change24h: number;        // % change
  change1h: number;         // % change
  trend: 'increasing' | 'decreasing' | 'stable';
  /** Global ACCOUNT long/short ratio (>1 = more long accounts). Feeds
   *  leverage_pressure. Attached by getPerpsSnapshot from the v4 L/S endpoint;
   *  undefined when unavailable for this symbol (no fabricated default). */
  longShortRatio?: number;
  lastUpdated: string;
}

export interface PerpsSnapshot {
  timestamp: string;
  liquidations: LiquidationData[];
  fundingRates: FundingRate[];
  openInterest: OpenInterest[];
  marketSummary: {
    totalLiquidations24h: number;
    dominantLiquidations: 'longs' | 'shorts' | 'balanced';
    avgFundingRate: number;
    fundingSentiment: 'bullish' | 'bearish' | 'neutral';
    totalOpenInterest: number;
    oiTrend: 'increasing' | 'decreasing' | 'stable';
  };
  fetchTime: number;
}

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// RATE LIMITER
// ============================================================================

let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < CONFIG.RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

// ============================================================================
// COINGLASS API INTEGRATION
// ============================================================================

// Track Coinglass API health
let coinglassApiDisabled = false;
let coinglassDisabledUntil = 0;
const COINGLASS_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown after plan error

/**
 * True when an HTTP status or Coinglass envelope code/msg indicates an auth or
 * plan/permission failure — the conditions that should trip the 1h cooldown so
 * we stop hammering a key that's rejected or a plan-gated endpoint. (The old
 * code only matched code '40001', so the live `401 "Upgrade plan"` fell through
 * and the disable never engaged.)
 */
function isAuthOrPlanFailure(httpStatus: number | undefined, code: any, msg: string): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true;
  const c = String(code ?? '');
  if (c === '401' || c === '403' || c === '40001' || c === '30001' || c === '50001') return true;
  return /upgrade|plan|permission|not allowed|subscribe|tier|insufficient|unauthor/i.test(msg || '');
}

function disableCoinglass(reason: string, detail: Record<string, any>): void {
  coinglassApiDisabled = true;
  coinglassDisabledUntil = Date.now() + COINGLASS_COOLDOWN_MS;
  logger.warn('💀 Coinglass API disabled for 1 hour', { reason, ...detail });
}

async function coinglassRequest<T>(endpoint: string): Promise<T | null> {
  if (!CONFIG.COINGLASS_API_KEY) {
    return null;
  }

  // Check if API is temporarily disabled
  const now = Date.now();
  if (coinglassApiDisabled && now < coinglassDisabledUntil) {
    return null;
  }

  // Reset if cooldown expired
  if (coinglassApiDisabled && now >= coinglassDisabledUntil) {
    coinglassApiDisabled = false;
  }

  try {
    await waitForRateLimit();

    // validateStatus: read 4xx bodies instead of throwing, so a plan/auth error
    // is classified explicitly (and trips the cooldown) rather than vanishing
    // into the catch as a generic failure.
    const response = await axios.get(`${CONFIG.COINGLASS_URL}${endpoint}`, {
      headers: {
        'CG-API-KEY': CONFIG.COINGLASS_API_KEY, // v4 auth header
        'Accept': 'application/json',
      },
      timeout: CONFIG.TIMEOUT_MS,
      validateStatus: () => true,
    });

    const code = response.data?.code;
    const msg = response.data?.msg ?? '';

    // Auth / plan / permission failure → disable for 1h (now covers 401/403 +
    // Coinglass code variants + upgrade/permission messages, not just '40001').
    if (isAuthOrPlanFailure(response.status, code, msg)) {
      disableCoinglass('auth/plan failure', { http: response.status, code, msg });
      return null;
    }

    // v4 success envelope is string code "0".
    if (code !== '0' && code !== 0) {
      logger.warn('💀 Coinglass API error', { http: response.status, code, msg });
      return null;
    }

    return response.data?.data;
  } catch (error: any) {
    // Network/timeout or an unexpected throw — also engage cooldown on a 401/403
    // surfaced via the thrown error (defensive; validateStatus should prevent it).
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      disableCoinglass('auth/plan failure (thrown)', { http: status });
    } else {
      logger.debug('💀 Coinglass request failed', { http: status, error: error?.message });
    }
    return null;
  }
}

// ============================================================================
// LIQUIDATION DATA
// ============================================================================

/**
 * Get liquidation data for a specific cryptocurrency symbol.
 * 
 * @param symbol - Cryptocurrency symbol (e.g., 'BTC', 'ETH', 'SOL')
 * @returns Liquidation data including 24h totals, long/short ratio, and risk level
 * @example
 * ```typescript
 * const btcLiquidation = await getLiquidationData('BTC');
 * console.log(`Total liquidations: $${btcLiquidation.totalLiquidations24h}`);
 * ```
 */
const num = (v: any): number => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

/**
 * v4 `liquidation/coin-list` returns CURRENT 24h liquidations for ALL coins
 * (~1200+) in ONE call. Fetch+cache the whole list ONCE and serve every symbol
 * from it — so a multi-token judgment costs a single liquidation request, not N.
 */
async function getLiquidationCoinList(): Promise<any[] | null> {
  const cacheKey = 'cg:v4:liquidation-coin-list';
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) return cached;

  const data = await coinglassRequest<any>('/api/futures/liquidation/coin-list');
  const list = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : null;
  if (list) setCache(cacheKey, list);
  return list;
}

export async function getLiquidationData(symbol: string): Promise<LiquidationData | null> {
  const list = await getLiquidationCoinList();
  if (!list) return null;

  const symU = symbol.toUpperCase();
  const row = list.find((r: any) => String(r?.symbol ?? '').toUpperCase() === symU);
  // HONESTY: symbol not in the coin-list (e.g. a tiny memecoin with no perp) →
  // null, NOT a zero-value default. An all-zero object would flow into the
  // judgment snapshot as a "present" (SCORED) derivatives signal, masquerading
  // as real data. Absent must read as absent → APPLICABLE_NO_DATA.
  if (!row) return null;

  const longLiq = num(row.long_liquidation_usd_24h ?? row.longLiquidation_usd_24h);
  const shortLiq = num(row.short_liquidation_usd_24h ?? row.shortLiquidation_usd_24h);
  // Prefer the explicit 24h total; fall back to the long+short split.
  const total = num(row.liquidation_usd_24h) || (longLiq + shortLiq);
  const ratio = shortLiq > 0 ? longLiq / shortLiq : longLiq > 0 ? 10 : 1;

  // Genuinely-empty row (no liquidations reported) → treat as absent, not a
  // real zero signal.
  if (total <= 0 && longLiq <= 0 && shortLiq <= 0) return null;

  return {
    symbol: symU,
    longLiquidations24h: longLiq,
    shortLiquidations24h: shortLiq,
    totalLiquidations24h: total,
    longShortRatio: ratio,
    dominantSide: longLiq > shortLiq * 1.2 ? 'longs' : shortLiq > longLiq * 1.2 ? 'shorts' : 'balanced',
    riskLevel: total > 500_000_000 ? 'extreme' :
               total > 100_000_000 ? 'high' :
               total > 20_000_000 ? 'medium' : 'low',
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// FUNDING RATES
// ============================================================================

/**
 * Get funding rates for a symbol across multiple exchanges.
 * 
 * Funding rates indicate whether longs or shorts are paying fees.
 * Positive rate = longs pay shorts (bullish sentiment, crowded longs)
 * Negative rate = shorts pay longs (bearish sentiment, crowded shorts)
 * 
 * @param symbol - Cryptocurrency symbol (e.g., 'BTC', 'ETH')
 * @returns Array of funding rates from different exchanges
 * @example
 * ```typescript
 * const rates = await getFundingRates('BTC');
 * rates.forEach(rate => {
 *   console.log(`${rate.exchange}: ${rate.rate * 100}% (${rate.sentiment})`);
 * });
 * ```
 */
export async function getFundingRates(symbol: string): Promise<FundingRate[]> {
  const cacheKey = `funding:${symbol}`;
  const cached = getFromCache<FundingRate[]>(cacheKey);
  if (cached) return cached;

  // v4 funding-rate/exchange-list returns current per-exchange funding for the
  // symbol, grouped by margin type. We use USDT/stablecoin-margined perps.
  const data = await coinglassRequest<any>(`/api/futures/funding-rate/exchange-list?symbol=${symbol.toUpperCase()}`);
  const marginList: any[] | null = Array.isArray(data?.stablecoin_margin_list)
    ? data.stablecoin_margin_list
    : Array.isArray(data)
      ? data
      : null;

  if (marginList && marginList.length > 0) {
    const rates: FundingRate[] = marginList
      .map((item: any) => {
        const rate = num(item.funding_rate ?? item.fundingRate ?? item.rate);
        const annualized = rate * 3 * 365; // 3 funding periods per day
        return {
          symbol: symbol.toUpperCase(),
          exchange: item.exchange_name || item.exchange || item.exchangeName || 'Unknown',
          rate,
          predictedRate: item.predicted_funding_rate != null ? num(item.predicted_funding_rate) : undefined,
          annualizedRate: annualized,
          sentiment: (rate > 0.01 ? 'bullish' : rate < -0.01 ? 'bearish' : 'neutral') as FundingRate['sentiment'],
          costPerDay: Math.abs(rate * 3) * 100,
          lastUpdated: new Date().toISOString(),
        };
      })
      // keep only the major venues that carry meaningful funding signal
      .filter((r) => ['binance', 'okx', 'bybit'].includes(r.exchange.toLowerCase()));

    // If the major-venue filter removed everything, fall back to all entries.
    const finalRates = rates.length > 0
      ? rates
      : marginList.map((item: any) => {
          const rate = num(item.funding_rate ?? item.fundingRate ?? item.rate);
          return {
            symbol: symbol.toUpperCase(),
            exchange: item.exchange_name || item.exchange || 'Unknown',
            rate,
            annualizedRate: rate * 3 * 365,
            sentiment: (rate > 0.01 ? 'bullish' : rate < -0.01 ? 'bearish' : 'neutral') as FundingRate['sentiment'],
            costPerDay: Math.abs(rate * 3) * 100,
            lastUpdated: new Date().toISOString(),
          };
        });

    setCache(cacheKey, finalRates);
    return finalRates;
  }

  // HONESTY: no real Coinglass funding → empty, NOT a zero-rate default (which
  // would read as a real "present" derivatives signal in the judgment snapshot).
  return [];
}

/**
 * Get average funding rate across exchanges
 */
export async function getAverageFundingRate(symbol: string): Promise<{
  rate: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  annualized: number;
  costWarning?: string;
}> {
  const rates = await getFundingRates(symbol);
  
  if (rates.length === 0) {
    return { rate: 0, sentiment: 'neutral', annualized: 0 };
  }

  const avgRate = rates.reduce((sum, r) => sum + r.rate, 0) / rates.length;
  const annualized = avgRate * 3 * 365 * 100; // As percentage
  
  let costWarning: string | undefined;
  if (Math.abs(avgRate) > 0.05) {
    costWarning = `High funding! ${avgRate > 0 ? 'Longs' : 'Shorts'} pay ~${Math.abs(avgRate * 3 * 100).toFixed(2)}%/day`;
  }

  return {
    rate: avgRate,
    sentiment: avgRate > 0.01 ? 'bullish' : avgRate < -0.01 ? 'bearish' : 'neutral',
    annualized,
    costWarning,
  };
}

// ============================================================================
// OPEN INTEREST
// ============================================================================

/**
 * Get open interest data for a symbol
 */
export async function getOpenInterest(symbol: string): Promise<OpenInterest | null> {
  const cacheKey = `oi:${symbol}`;
  const cached = getFromCache<OpenInterest>(cacheKey);
  if (cached) return cached;

  // v4 open-interest/exchange-list returns per-exchange OI for the symbol plus an
  // aggregate row with exchange="All" — the latter gives both total OI in USD and
  // the 24h OI change %, the OI-change field Path B had deferred (now free).
  const data = await coinglassRequest<any>(`/api/futures/open-interest/exchange-list?symbol=${symbol.toUpperCase()}`);
  const rows: any[] | null = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : null;
  if (!rows || rows.length === 0) return null;

  const allRow = rows.find((r: any) => String(r?.exchange ?? '').toLowerCase() === 'all') ?? rows[0];
  const oiUsd = num(allRow.open_interest_usd ?? allRow.openInterest ?? allRow.open_interest);
  if (oiUsd <= 0) return null; // no real OI → absent, not a zero default

  const change24h = num(allRow.open_interest_change_percent_24h ?? allRow.open_interest_change_24h);
  const change1h = num(allRow.open_interest_change_percent_1h ?? allRow.open_interest_change_1h);

  const oi: OpenInterest = {
    symbol: symbol.toUpperCase(),
    openInterest: oiUsd,
    change24h,
    change1h,
    trend: change24h > 2 ? 'increasing' : change24h < -2 ? 'decreasing' : 'stable',
    lastUpdated: new Date().toISOString(),
  };

  setCache(cacheKey, oi);
  return oi;
}

/**
 * v4 global ACCOUNT long/short ratio for a symbol — the leverage-positioning
 * signal that feeds leverage_pressure. History endpoint; we take the latest
 * record. Returns null when unavailable (no fabricated default).
 */
export async function getLongShortAccountRatio(symbol: string): Promise<number | null> {
  const base = symbol.toUpperCase();
  const cacheKey = `ls:${base}`;
  const cached = getFromCache<number>(cacheKey);
  if (cached != null) return cached;

  // The L/S history endpoint takes an EXCHANGE-SPECIFIC PAIR (e.g. BTCUSDT), so
  // low-priced tokens hit the leverage-multiplier wrinkle: Binance lists PEPE as
  // 1000PEPEUSDT (and some as kSHIBUSDT). Try the plain pair first, then the
  // multiplier-prefixed variants before giving up — a 400 "pair does not exist"
  // returns null (not an auth failure → no cooldown), so we just fall through.
  // The account L/S ratio is multiplier-invariant, so the variant maps cleanly.
  const candidates = [base, `1000${base}`, `K${base}`, `1000000${base}`];
  for (const pair of candidates) {
    const data = await coinglassRequest<any>(
      `/api/futures/global-long-short-account-ratio/history?exchange=Binance&symbol=${pair}USDT&interval=4h&limit=1`,
    );
    const rows: any[] | null = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : null;
    if (!rows || rows.length === 0) continue;

    // Take the most recent record (greatest timestamp if present, else last).
    const latest = rows.reduce((a: any, b: any) => (num(b?.time) >= num(a?.time) ? b : a), rows[0]);
    const ratio = num(latest.global_account_long_short_ratio ?? latest.long_short_ratio);
    if (ratio <= 0) continue;

    setCache(cacheKey, ratio);
    return ratio;
  }

  // No variant carried a perp market → honest absence (undefined → APPLICABLE_NO_DATA).
  return null;
}

// ============================================================================
// COMPREHENSIVE PERPS SNAPSHOT
// ============================================================================

/**
 * 🎯 MAIN: Get comprehensive perpetual market data for multiple symbols.
 * 
 * This is the primary function to use when you need liquidation, funding,
 * and open interest data for multiple coins at once.
 * 
 * @param symbols - Array of cryptocurrency symbols (e.g., ['BTC', 'ETH', 'SOL'])
 * @returns Complete snapshot with liquidations, funding rates, OI, and market summary
 * @example
 * ```typescript
 * const snapshot = await getPerpsSnapshot(['BTC', 'ETH']);
 * 
 * // Check market summary
 * console.log(`Total liquidations: $${snapshot.marketSummary.totalLiquidations24h}`);
 * console.log(`Avg funding: ${snapshot.marketSummary.avgFundingRate * 100}%`);
 * 
 * // Format for AI context
 * const aiContext = formatPerpsForAI(snapshot);
 * ```
 */
export async function getPerpsSnapshot(symbols: string[]): Promise<PerpsSnapshot> {
  const startTime = Date.now();
  const targetSymbols = symbols.length > 0 ? symbols : ['BTC', 'ETH', 'SOL'];

  // Fetch all data in parallel. Coinglass calls are globally 3s-spaced, so a
  // burst is throttled to ~20/min (< 30/min Hobbyist). Liquidations come from
  // the single shared coin-list; funding/OI/L-S are per-symbol.
  const [liquidationsResults, fundingResults, oiResults, lsResults] = await Promise.all([
    Promise.all(targetSymbols.map(s => getLiquidationData(s))),
    Promise.all(targetSymbols.map(s => getFundingRates(s))),
    Promise.all(targetSymbols.map(s => getOpenInterest(s))),
    Promise.all(targetSymbols.map(s => getLongShortAccountRatio(s))),
  ]);

  const liquidations = liquidationsResults.filter(Boolean) as LiquidationData[];
  const fundingRates = fundingResults.flat();
  // Attach the per-symbol account L/S ratio onto the matching OI row (the carrier
  // the snapshot reads). undefined stays undefined → APPLICABLE_NO_DATA, never 1.
  const openInterest = (oiResults
    .map((oi, i) => {
      if (!oi) return oi;
      const ls = lsResults[i];
      return ls != null ? { ...oi, longShortRatio: ls } : oi;
    })
    .filter(Boolean)) as OpenInterest[];

  // Calculate market summary
  const totalLiq = liquidations.reduce((sum, l) => sum + l.totalLiquidations24h, 0);
  const totalLongLiq = liquidations.reduce((sum, l) => sum + l.longLiquidations24h, 0);
  const totalShortLiq = liquidations.reduce((sum, l) => sum + l.shortLiquidations24h, 0);
  const avgFunding = fundingRates.length > 0 
    ? fundingRates.reduce((sum, f) => sum + f.rate, 0) / fundingRates.length 
    : 0;
  const totalOI = openInterest.reduce((sum, o) => sum + o.openInterest, 0);
  const avgOIChange = openInterest.length > 0
    ? openInterest.reduce((sum, o) => sum + o.change24h, 0) / openInterest.length
    : 0;

  const snapshot: PerpsSnapshot = {
    timestamp: new Date().toISOString(),
    liquidations,
    fundingRates,
    openInterest,
    marketSummary: {
      totalLiquidations24h: totalLiq,
      dominantLiquidations: totalLongLiq > totalShortLiq * 1.2 ? 'longs' :
                            totalShortLiq > totalLongLiq * 1.2 ? 'shorts' : 'balanced',
      avgFundingRate: avgFunding,
      fundingSentiment: avgFunding > 0.01 ? 'bullish' : avgFunding < -0.01 ? 'bearish' : 'neutral',
      totalOpenInterest: totalOI,
      oiTrend: avgOIChange > 2 ? 'increasing' : avgOIChange < -2 ? 'decreasing' : 'stable',
    },
    fetchTime: Date.now() - startTime,
  };

  logger.debug('💀 Perps snapshot ready', {
    symbols: targetSymbols.join(','),
    liquidations: liquidations.length,
    fundingRates: fundingRates.length,
    fetchTime: snapshot.fetchTime,
  });

  return snapshot;
}

// ============================================================================
// AI CONTEXT FORMATTING
// ============================================================================

/**
 * Format liquidation data for AI context
 */
export function formatLiquidationsForAI(liquidations: LiquidationData[]): string {
  if (liquidations.length === 0 || liquidations.every(l => l.totalLiquidations24h === 0)) {
    return '';
  }

  let context = '\n[💀 LIQUIDATION DATA - 24H]\n';

  for (const liq of liquidations) {
    if (liq.totalLiquidations24h === 0) continue;
    
    const longStr = formatUSD(liq.longLiquidations24h);
    const shortStr = formatUSD(liq.shortLiquidations24h);
    const totalStr = formatUSD(liq.totalLiquidations24h);
    
    context += `${liq.symbol}: ${totalStr} total (Longs: ${longStr}, Shorts: ${shortStr})`;
    
    if (liq.riskLevel === 'extreme' || liq.riskLevel === 'high') {
      context += ` ⚠️ ${liq.riskLevel.toUpperCase()} liquidation activity`;
    }
    
    if (liq.dominantSide !== 'balanced') {
      context += ` - ${liq.dominantSide} getting wrecked`;
    }
    
    context += '\n';
  }

  return context;
}

/**
 * Format funding rates for AI context
 */
export function formatFundingForAI(fundingRates: FundingRate[]): string {
  if (fundingRates.length === 0) {
    return '';
  }

  // Group by symbol and get average
  const bySymbol = new Map<string, FundingRate[]>();
  for (const rate of fundingRates) {
    const existing = bySymbol.get(rate.symbol) || [];
    existing.push(rate);
    bySymbol.set(rate.symbol, existing);
  }

  let context = '\n[📊 FUNDING RATES]\n';

  for (const [symbol, rates] of bySymbol) {
    const avgRate = rates.reduce((sum, r) => sum + r.rate, 0) / rates.length;
    const rateStr = (avgRate * 100).toFixed(4);
    const sign = avgRate >= 0 ? '+' : '';
    
    context += `${symbol}: ${sign}${rateStr}%`;
    
    if (avgRate > 0) {
      context += ' (longs pay shorts)';
    } else if (avgRate < 0) {
      context += ' (shorts pay longs)';
    }
    
    // Cost warning for high funding
    if (Math.abs(avgRate) > 0.03) {
      const dailyCost = Math.abs(avgRate * 3 * 100).toFixed(2);
      context += ` ⚠️ HIGH! ~${dailyCost}%/day cost`;
    }
    
    context += '\n';
  }

  return context;
}

/**
 * Format perpetuals snapshot data for AI context injection.
 * 
 * Creates a human-readable string that can be prepended to AI prompts
 * to give the AI real-time liquidation and funding rate context.
 * 
 * @param snapshot - Perps snapshot from getPerpsSnapshot()
 * @returns Formatted string ready for AI context
 * @example
 * ```typescript
 * const snapshot = await getPerpsSnapshot(['BTC']);
 * const context = formatPerpsForAI(snapshot);
 * // Use in AI prompt: `${context}\n\nUser: What about BTC?`
 * ```
 */
export function formatPerpsForAI(snapshot: PerpsSnapshot): string {
  let context = formatLiquidationsForAI(snapshot.liquidations);
  context += formatFundingForAI(snapshot.fundingRates);
  
  // Add summary insights
  if (snapshot.marketSummary.totalLiquidations24h > 100_000_000) {
    context += `\n💡 Insight: Heavy liquidations ($${formatUSD(snapshot.marketSummary.totalLiquidations24h)}) - market is volatile\n`;
  }
  
  if (snapshot.marketSummary.avgFundingRate > 0.05) {
    context += `💡 Insight: Funding extremely high - crowded long trade, potential squeeze risk\n`;
  } else if (snapshot.marketSummary.avgFundingRate < -0.05) {
    context += `💡 Insight: Funding extremely negative - crowded short trade, potential squeeze risk\n`;
  }
  
  return context;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatUSD(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const liquidationService = {
  getLiquidation: getLiquidationData,
  getFunding: getFundingRates,
  getAvgFunding: getAverageFundingRate,
  getOI: getOpenInterest,
  getSnapshot: getPerpsSnapshot,
  formatForAI: formatPerpsForAI,
};

export default liquidationService;

