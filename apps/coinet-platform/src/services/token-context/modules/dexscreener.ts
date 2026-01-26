/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 DEXSCREENER MODULE - Price, Liquidity, Volume Data                     ║
 * ║                                                                               ║
 * ║   Fetches core market data from DexScreener API.                              ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Optimized for token-context orchestrator                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import axios from 'axios';
import { logger } from '../../../utils/logger';
import {
  ChainId,
  ModuleResult,
  DexScreenerData,
} from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex';
const TIMEOUT_MS = 8000;

// ============================================================================
// DEXSCREENER DATA FETCH
// ============================================================================

/**
 * Fetch token data from DexScreener
 */
export async function fetchDexScreenerData(
  address: string,
  chain?: ChainId
): Promise<ModuleResult<DexScreenerData>> {
  try {
    logger.debug('📊 Fetching DexScreener data', { 
      address: address.slice(0, 10),
      chain,
    });
    
    // Fetch by token address
    const response = await axios.get(
      `${DEXSCREENER_API_URL}/tokens/${address}`,
      { timeout: TIMEOUT_MS }
    );
    
    if (!response.data?.pairs || response.data.pairs.length === 0) {
      logger.debug('📊 DexScreener: No pairs found', { address: address.slice(0, 10) });
      return {
        status: 'failed',
        timestamp: new Date().toISOString(),
        ttlSeconds: 60,
        data: null,
        error: 'Token not found on DexScreener',
        source: 'dexscreener',
      };
    }
    
    // Filter by chain if specified, then sort by liquidity
    let pairs = response.data.pairs;
    if (chain && chain !== 'unknown') {
      const chainFiltered = pairs.filter((p: any) => 
        p.chainId?.toLowerCase() === chain.toLowerCase()
      );
      if (chainFiltered.length > 0) {
        pairs = chainFiltered;
      }
    }
    
    // Sort by liquidity (highest first)
    pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    
    const bestPair = pairs[0];
    
    // Parse into our format
    const dexData: DexScreenerData = {
      price: parseFloat(bestPair.priceUsd) || 0,
      priceChange24h: bestPair.priceChange?.h24 || 0,
      volume24h: bestPair.volume?.h24 || 0,
      liquidity: bestPair.liquidity?.usd || 0,
      marketCap: bestPair.marketCap || null,
      fdv: bestPair.fdv || null,
      pairAge: calculatePairAge(bestPair.pairCreatedAt),
      pairCreatedAt: bestPair.pairCreatedAt 
        ? new Date(bestPair.pairCreatedAt).toISOString() 
        : new Date().toISOString(),
      txns24h: {
        buys: bestPair.txns?.h24?.buys || 0,
        sells: bestPair.txns?.h24?.sells || 0,
      },
      priceChange: {
        m5: bestPair.priceChange?.m5 || 0,
        h1: bestPair.priceChange?.h1 || 0,
        h6: bestPair.priceChange?.h6 || 0,
        h24: bestPair.priceChange?.h24 || 0,
      },
    };
    
    logger.info('📊 DexScreener data fetched', {
      address: address.slice(0, 10),
      price: dexData.price,
      liquidity: dexData.liquidity,
      volume24h: dexData.volume24h,
      pairAgeHours: dexData.pairAge,
    });
    
    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      ttlSeconds: 60, // 1 minute for price data
      data: dexData,
      source: 'dexscreener',
    };
    
  } catch (error: any) {
    logger.error('📊 DexScreener API error', {
      address: address.slice(0, 10),
      error: error.message,
      status: error.response?.status,
    });
    
    return {
      status: 'failed',
      timestamp: new Date().toISOString(),
      ttlSeconds: 30,
      data: null,
      error: error.message,
      source: 'dexscreener',
    };
  }
}

/**
 * Calculate pair age in hours
 */
function calculatePairAge(pairCreatedAt: number | string | undefined): number {
  if (!pairCreatedAt) return 0;
  
  const created = typeof pairCreatedAt === 'number' 
    ? pairCreatedAt 
    : new Date(pairCreatedAt).getTime();
  
  const now = Date.now();
  const ageMs = now - created;
  const ageHours = ageMs / (1000 * 60 * 60);
  
  return Math.max(0, ageHours);
}

/**
 * Format DexScreener data for human-readable output
 */
export function formatDexScreenerForDisplay(data: DexScreenerData): string {
  const lines: string[] = [];
  
  // Price line
  const priceStr = data.price < 0.0001 
    ? data.price.toExponential(4) 
    : data.price.toFixed(6);
  const changeEmoji = data.priceChange24h >= 0 ? '📈' : '📉';
  lines.push(`💰 Price: $${priceStr} ${changeEmoji} ${data.priceChange24h >= 0 ? '+' : ''}${data.priceChange24h.toFixed(1)}% (24h)`);
  
  // Market metrics
  lines.push(`💧 Liquidity: $${formatNumber(data.liquidity)}`);
  lines.push(`📊 Volume 24h: $${formatNumber(data.volume24h)}`);
  
  if (data.marketCap) {
    lines.push(`🏷️ Market Cap: $${formatNumber(data.marketCap)}`);
  }
  
  // Age
  const ageStr = data.pairAge < 1 
    ? `${Math.round(data.pairAge * 60)} minutes`
    : data.pairAge < 24 
      ? `${data.pairAge.toFixed(1)} hours`
      : `${(data.pairAge / 24).toFixed(1)} days`;
  lines.push(`⏱️ Age: ${ageStr}`);
  
  // Transactions
  const txnRatio = data.txns24h.buys + data.txns24h.sells > 0
    ? (data.txns24h.buys / (data.txns24h.buys + data.txns24h.sells) * 100).toFixed(0)
    : '50';
  lines.push(`🔄 24h Txns: ${data.txns24h.buys} buys / ${data.txns24h.sells} sells (${txnRatio}% buy pressure)`);
  
  // Price changes at different timeframes
  lines.push(`📈 Price Change: 5m: ${formatChange(data.priceChange.m5)} | 1h: ${formatChange(data.priceChange.h1)} | 6h: ${formatChange(data.priceChange.h6)}`);
  
  return lines.join('\n');
}

function formatNumber(n: number): string {
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function formatChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}
