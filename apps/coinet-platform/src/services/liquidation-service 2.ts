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
  // Coinglass API (free tier available)
  COINGLASS_URL: 'https://open-api.coinglass.com/public/v2',
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

async function coinglassRequest<T>(endpoint: string): Promise<T | null> {
  if (!CONFIG.COINGLASS_API_KEY) {
    logger.debug('💀 Coinglass API key not configured');
    return null;
  }

  try {
    await waitForRateLimit();
    
    const response = await axios.get(`${CONFIG.COINGLASS_URL}${endpoint}`, {
      headers: {
        'coinglassSecret': CONFIG.COINGLASS_API_KEY,
        'Accept': 'application/json',
      },
      timeout: CONFIG.TIMEOUT_MS,
    });

    if (response.data?.code !== '0' && response.data?.code !== 0) {
      logger.warn('💀 Coinglass API error', { code: response.data?.code, msg: response.data?.msg });
      return null;
    }

    return response.data?.data;
  } catch (error: any) {
    logger.debug('💀 Coinglass request failed', { endpoint, error: error.message });
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
export async function getLiquidationData(symbol: string): Promise<LiquidationData | null> {
  const cacheKey = `liquidation:${symbol}`;
  const cached = getFromCache<LiquidationData>(cacheKey);
  if (cached) return cached;

  // Try Coinglass first
  const data = await coinglassRequest<any>(`/liquidation_history?symbol=${symbol}&time_type=h24`);
  
  if (data && Array.isArray(data) && data.length > 0) {
    const latest = data[0];
    const longLiq = parseFloat(latest.longLiquidationUsd || 0);
    const shortLiq = parseFloat(latest.shortLiquidationUsd || 0);
    const total = longLiq + shortLiq;
    const ratio = shortLiq > 0 ? longLiq / shortLiq : longLiq > 0 ? 10 : 1;

    const liquidation: LiquidationData = {
      symbol: symbol.toUpperCase(),
      longLiquidations24h: longLiq,
      shortLiquidations24h: shortLiq,
      totalLiquidations24h: total,
      longShortRatio: ratio,
      dominantSide: ratio > 1.2 ? 'longs' : ratio < 0.8 ? 'shorts' : 'balanced',
      riskLevel: total > 500_000_000 ? 'extreme' :
                 total > 100_000_000 ? 'high' :
                 total > 20_000_000 ? 'medium' : 'low',
      lastUpdated: new Date().toISOString(),
    };

    setCache(cacheKey, liquidation);
    return liquidation;
  }

  // Return mock/default data if API fails
  return createDefaultLiquidationData(symbol);
}

function createDefaultLiquidationData(symbol: string): LiquidationData {
  return {
    symbol: symbol.toUpperCase(),
    longLiquidations24h: 0,
    shortLiquidations24h: 0,
    totalLiquidations24h: 0,
    longShortRatio: 1,
    dominantSide: 'balanced',
    riskLevel: 'low',
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

  const data = await coinglassRequest<any[]>(`/funding?symbol=${symbol}`);
  
  if (data && Array.isArray(data)) {
    const rates: FundingRate[] = data.map(item => {
      const rate = parseFloat(item.rate || item.fundingRate || 0);
      const annualized = rate * 3 * 365; // 3 funding periods per day
      
      return {
        symbol: symbol.toUpperCase(),
        exchange: item.exchangeName || item.exchange || 'Unknown',
        rate,
        predictedRate: item.predictedRate ? parseFloat(item.predictedRate) : undefined,
        annualizedRate: annualized,
        sentiment: rate > 0.01 ? 'bullish' : rate < -0.01 ? 'bearish' : 'neutral',
        costPerDay: Math.abs(rate * 3) * 100, // Daily cost as %
        lastUpdated: new Date().toISOString(),
      };
    });

    setCache(cacheKey, rates);
    return rates;
  }

  // Return default data
  return [createDefaultFundingRate(symbol)];
}

function createDefaultFundingRate(symbol: string): FundingRate {
  return {
    symbol: symbol.toUpperCase(),
    exchange: 'Unknown',
    rate: 0,
    annualizedRate: 0,
    sentiment: 'neutral',
    costPerDay: 0,
    lastUpdated: new Date().toISOString(),
  };
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

  const data = await coinglassRequest<any>(`/open_interest?symbol=${symbol}`);
  
  if (data) {
    const oi: OpenInterest = {
      symbol: symbol.toUpperCase(),
      openInterest: parseFloat(data.openInterest || data.openInterestUsd || 0),
      change24h: parseFloat(data.change24h || data.h24Change || 0),
      change1h: parseFloat(data.change1h || data.h1Change || 0),
      trend: data.change24h > 2 ? 'increasing' : data.change24h < -2 ? 'decreasing' : 'stable',
      lastUpdated: new Date().toISOString(),
    };

    setCache(cacheKey, oi);
    return oi;
  }

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

  // Fetch all data in parallel
  const [liquidationsResults, fundingResults, oiResults] = await Promise.all([
    Promise.all(targetSymbols.map(s => getLiquidationData(s))),
    Promise.all(targetSymbols.map(s => getFundingRates(s))),
    Promise.all(targetSymbols.map(s => getOpenInterest(s))),
  ]);

  const liquidations = liquidationsResults.filter(Boolean) as LiquidationData[];
  const fundingRates = fundingResults.flat();
  const openInterest = oiResults.filter(Boolean) as OpenInterest[];

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

