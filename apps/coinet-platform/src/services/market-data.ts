/**
 * 📊 Market Data Service - Divine Perfection
 * 
 * Fetches live market data for ANY cryptocurrency.
 * Supports dynamic coin detection and multiple data sources.
 * 
 * Data Sources (Priority Order):
 * 1. market-prices service (cached, fast)
 * 2. CoinGecko API (comprehensive)
 * 3. DexScreener (for DEX-only tokens)
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { symbolDetector, DetectedCoin } from './symbol-detector';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MARKET_PRICES_URL = process.env.MARKET_PRICES_URL || 'https://market-prices-production.up.railway.app';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/latest/dex';

// Rate limiting for CoinGecko free tier
let lastCoinGeckoCall = 0;
const COINGECKO_MIN_INTERVAL = 2000; // 2 seconds between calls (30/min limit)

// ============================================================================
// TYPES
// ============================================================================

export interface MarketPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  source: 'market-prices' | 'coingecko' | 'dexscreener';
  lastUpdated: string;
}

export interface MarketSnapshot {
  timestamp: string;
  prices: MarketPrice[];
  requestedSymbols: string[];
  foundSymbols: string[];
  missingSymbols: string[];
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * 🎯 MAIN: Fetch prices for detected coins from user message
 */
export async function fetchPricesForMessage(message: string): Promise<MarketSnapshot> {
  const startTime = Date.now();
  
  // Step 1: Detect coins in message
  const detectedCoins = await symbolDetector.detectCoins(message);
  
  if (detectedCoins.length === 0) {
    // Default to top coins if none detected
    return fetchDefaultMarketData();
  }

  // Step 2: Extract unique CoinGecko IDs
  const coinIds = [...new Set(detectedCoins.map(c => c.coinGeckoId))];
  const symbols = [...new Set(detectedCoins.map(c => c.symbol))];

  logger.debug('📊 Fetching prices for detected coins', { 
    symbols,
    coinIds,
    detectionTime: Date.now() - startTime 
  });

  // Step 3: Fetch prices with fallback chain
  const prices = await fetchPricesWithFallback(coinIds, symbols);

  const snapshot: MarketSnapshot = {
    timestamp: new Date().toISOString(),
    prices,
    requestedSymbols: symbols,
    foundSymbols: prices.map(p => p.symbol),
    missingSymbols: symbols.filter(s => !prices.find(p => p.symbol.toUpperCase() === s.toUpperCase())),
  };

  logger.debug('📊 Market data fetched', {
    requested: symbols.length,
    found: prices.length,
    totalTime: Date.now() - startTime
  });

  return snapshot;
}

/**
 * Fetch prices with fallback chain
 */
async function fetchPricesWithFallback(coinIds: string[], symbols: string[]): Promise<MarketPrice[]> {
  const prices: MarketPrice[] = [];
  const missing = new Set(coinIds);

  // Try 1: market-prices service (fastest)
  try {
    const mpPrices = await fetchFromMarketPrices(symbols);
    for (const price of mpPrices) {
      prices.push(price);
      // Find matching coinId and remove from missing
      const coinId = coinIds.find(id => {
        const coin = symbolDetector.getCoinById(id);
        return coin?.symbol.toUpperCase() === price.symbol.toUpperCase();
      });
      if (coinId) missing.delete(coinId);
    }
  } catch (error: any) {
    logger.debug('market-prices fetch failed', { error: error.message });
  }

  // Try 2: CoinGecko for remaining
  if (missing.size > 0) {
    try {
      const cgPrices = await fetchFromCoinGecko([...missing]);
      for (const price of cgPrices) {
        prices.push(price);
        missing.delete(price.symbol.toLowerCase()); // Approximate match
      }
    } catch (error: any) {
      logger.debug('CoinGecko fetch failed', { error: error.message });
    }
  }

  // Try 3: DexScreener for any still missing
  if (missing.size > 0) {
    for (const coinId of missing) {
      try {
        const coin = symbolDetector.getCoinById(coinId);
        if (coin) {
          const dexPrice = await fetchFromDexScreener(coin.symbol);
          if (dexPrice) {
            prices.push(dexPrice);
          }
        }
      } catch (error: any) {
        logger.debug('DexScreener fetch failed', { coinId, error: error.message });
      }
    }
  }

  return prices;
}

/**
 * Fetch from market-prices service
 */
async function fetchFromMarketPrices(symbols: string[]): Promise<MarketPrice[]> {
  const response = await axios.get(`${MARKET_PRICES_URL}/api/prices`, {
    params: { symbols: symbols.join(',') },
    timeout: 5000,
  });

  if (!response.data?.data) return [];

  const rawData = Array.isArray(response.data.data) 
    ? response.data.data 
    : Object.values(response.data.data);

  return rawData.map((data: any) => ({
    symbol: (data.symbol || data.coinId || 'UNKNOWN').toUpperCase(),
    name: data.name || data.symbol || 'Unknown',
    price: data.price || 0,
    change24h: data.priceChange24h || 0,
    changePercent24h: data.priceChangePercentage24h || 0,
    volume24h: data.volume24h || 0,
    marketCap: data.marketCap || 0,
    source: 'market-prices' as const,
    lastUpdated: data.lastUpdated || new Date().toISOString(),
  }));
}

/**
 * Fetch from CoinGecko API (with rate limiting)
 */
async function fetchFromCoinGecko(coinIds: string[]): Promise<MarketPrice[]> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastCoinGeckoCall;
  if (timeSinceLastCall < COINGECKO_MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, COINGECKO_MIN_INTERVAL - timeSinceLastCall));
  }
  lastCoinGeckoCall = Date.now();

  const response = await axios.get(`${COINGECKO_BASE_URL}/simple/price`, {
    params: {
      ids: coinIds.join(','),
      vs_currencies: 'usd',
      include_24hr_change: true,
      include_24hr_vol: true,
      include_market_cap: true,
    },
    timeout: 10000,
  });

  const prices: MarketPrice[] = [];
  
  for (const [id, data] of Object.entries(response.data) as [string, any][]) {
    const coin = symbolDetector.getCoinById(id);
    prices.push({
      symbol: coin?.symbol.toUpperCase() || id.toUpperCase(),
      name: coin?.name || id,
      price: data.usd || 0,
      change24h: (data.usd || 0) * (data.usd_24h_change || 0) / 100,
      changePercent24h: data.usd_24h_change || 0,
      volume24h: data.usd_24h_vol || 0,
      marketCap: data.usd_market_cap || 0,
      source: 'coingecko',
      lastUpdated: new Date().toISOString(),
    });
  }

  return prices;
}

/**
 * Fetch from DexScreener (for DEX-only tokens)
 */
async function fetchFromDexScreener(symbol: string): Promise<MarketPrice | null> {
  try {
    const response = await axios.get(`${DEXSCREENER_BASE_URL}/search`, {
      params: { q: symbol },
      timeout: 5000,
    });

    const pairs = response.data?.pairs || [];
    if (pairs.length === 0) return null;

    // Find best pair (highest liquidity)
    const bestPair = pairs.reduce((best: any, current: any) => {
      const bestLiq = best?.liquidity?.usd || 0;
      const currentLiq = current?.liquidity?.usd || 0;
      return currentLiq > bestLiq ? current : best;
    }, pairs[0]);

    if (!bestPair) return null;

    return {
      symbol: bestPair.baseToken?.symbol?.toUpperCase() || symbol.toUpperCase(),
      name: bestPair.baseToken?.name || symbol,
      price: parseFloat(bestPair.priceUsd) || 0,
      change24h: 0, // DexScreener doesn't provide absolute change
      changePercent24h: bestPair.priceChange?.h24 || 0,
      volume24h: bestPair.volume?.h24 || 0,
      marketCap: bestPair.fdv || 0,
      source: 'dexscreener',
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch default market data (top coins)
 */
async function fetchDefaultMarketData(): Promise<MarketSnapshot> {
  const defaultSymbols = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'AVAX', 'LINK'];
  const defaultIds = defaultSymbols.map(s => symbolDetector.getCoinBySymbol(s)?.id).filter(Boolean) as string[];
  
  const prices = await fetchPricesWithFallback(defaultIds, defaultSymbols);

  return {
    timestamp: new Date().toISOString(),
    prices,
    requestedSymbols: defaultSymbols,
    foundSymbols: prices.map(p => p.symbol),
    missingSymbols: [],
  };
}

/**
 * Fetch live market data (legacy compatibility)
 */
export async function fetchLiveMarketData(): Promise<MarketSnapshot | null> {
  try {
    return await fetchDefaultMarketData();
  } catch (error: any) {
    logger.debug('Failed to fetch live market data', { error: error.message });
    return null;
  }
}

/**
 * Format market data for AI context
 */
export function formatMarketDataForAI(snapshot: MarketSnapshot): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    timeZoneName: 'short' 
  });

  let context = `\n\n[LIVE MARKET DATA - ${dateStr}, ${timeStr}]\n`;

  for (const coin of snapshot.prices) {
    const direction = coin.changePercent24h >= 0 ? '↑' : '↓';
    const changeStr = coin.changePercent24h >= 0 
      ? `+${coin.changePercent24h.toFixed(2)}%` 
      : `${coin.changePercent24h.toFixed(2)}%`;
    
    context += `${coin.symbol}: $${formatPrice(coin.price)} (${direction}${changeStr} 24h)`;
    if (coin.source === 'dexscreener') {
      context += ' [DEX]';
    }
    context += '\n';
  }

  if (snapshot.missingSymbols.length > 0) {
    context += `\nNote: No data found for: ${snapshot.missingSymbols.join(', ')}\n`;
  }

  context += `[Data sources: ${[...new Set(snapshot.prices.map(p => p.source))].join(', ')}]\n`;

  return context;
}

/**
 * Format price with appropriate precision
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else if (price >= 0.01) {
    return price.toFixed(4);
  } else if (price >= 0.0001) {
    return price.toFixed(6);
  } else {
    return price.toExponential(4);
  }
}
