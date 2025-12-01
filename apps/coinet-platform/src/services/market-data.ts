/**
 * 📊 Market Data Service
 * 
 * Fetches live market data from the market-prices service
 * to provide real-time context to AI responses
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const MARKET_PRICES_URL = process.env.MARKET_PRICES_URL || 'https://market-prices-production.up.railway.app';

export interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
}

export interface MarketSnapshot {
  timestamp: string;
  prices: MarketPrice[];
  totalMarketCap?: number;
  btcDominance?: number;
}

/**
 * Fetch live market prices for top coins
 */
export async function fetchLiveMarketData(): Promise<MarketSnapshot | null> {
  try {
    const response = await axios.get(`${MARKET_PRICES_URL}/api/prices`, {
      params: {
        symbols: 'BTC,ETH,SOL,DOGE,XRP,ADA,AVAX,MATIC,LINK,DOT'
      },
      timeout: 5000,
    });

    if (response.data?.data) {
      // API returns an array of price objects
      const rawData = Array.isArray(response.data.data) 
        ? response.data.data 
        : Object.values(response.data.data);

      const prices: MarketPrice[] = rawData.map((data: any) => ({
        symbol: (data.symbol || data.coinId || 'UNKNOWN').toUpperCase(),
        price: data.price || 0,
        change24h: data.priceChangePercentage24h || data.priceChange24h || 0,
        volume24h: data.volume24h || 0,
        marketCap: data.marketCap || 0,
      }));

      logger.debug('📊 Fetched live market data', { coins: prices.length });

      return {
        timestamp: new Date().toISOString(),
        prices,
      };
    }

    return null;
  } catch (error: any) {
    logger.debug('⚠️ Failed to fetch market data', { error: error.message });
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
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  let context = `\n\n=== LIVE MARKET DATA (${dateStr}, ${timeStr}) ===\n`;
  context += `Data is REAL-TIME from Coinet market-prices service.\n\n`;

  for (const coin of snapshot.prices) {
    const changeIcon = coin.change24h >= 0 ? '📈' : '📉';
    const changeStr = coin.change24h >= 0 ? `+${coin.change24h.toFixed(2)}%` : `${coin.change24h.toFixed(2)}%`;
    context += `${changeIcon} ${coin.symbol}: $${coin.price.toLocaleString('en-US', { maximumFractionDigits: 2 })} (${changeStr} 24h)\n`;
  }

  context += `\n=== END LIVE DATA ===\n`;
  context += `IMPORTANT: Use this LIVE data in your response. Today's date is ${dateStr}.\n`;

  return context;
}

