/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 SOLSCAN API SERVICE - Divine Perfection                                ║
 * ║                                                                               ║
 * ║   Integration with Solscan's public API for Solana token analytics.          ║
 * ║   Fetches holder distribution, top holders, and token metadata.              ║
 * ║                                                                               ║
 * ║   CAPABILITIES:                                                               ║
 * ║   • Token holder count and distribution                                      ║
 * ║   • Top holder analysis (concentration risk)                                 ║
 * ║   • Token metadata and supply info                                           ║
 * ║   • Account balance lookups                                                   ║
 * ║   • Transfer history analysis                                                 ║
 * ║                                                                               ║
 * ║   API LIMITS (Public):                                                        ║
 * ║   • 100 requests per minute (respect this!)                                  ║
 * ║   • Some endpoints require Pro API key for full data                         ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Solscan API endpoints
  BASE_URL: 'https://public-api.solscan.io',
  PRO_URL: 'https://pro-api.solscan.io/v1.0',
  
  // API key (optional - for higher limits)
  API_KEY: process.env.SOLSCAN_API_KEY || '',
  
  // Rate limiting (public API)
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 60,  // Conservative
    MIN_REQUEST_INTERVAL: 1000,   // 1 second between requests
  },
  
  // Timeouts
  TIMEOUT: 15000,
  
  // Cache TTL
  CACHE_TTL: 60000, // 1 minute (holder data doesn't change as fast)
  
  // Default limits
  DEFAULT_TOP_HOLDERS: 20,
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Token metadata from Solscan
 */
export interface SolscanTokenMeta {
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
  holder: number;
  supply: string;
  address: string;
  tag: string[];
  extensions?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    coingeckoId?: string;
  };
}

/**
 * Token holder information
 */
export interface SolscanHolder {
  address: string;
  amount: number;
  decimals: number;
  owner: string;
  rank: number;
}

/**
 * Processed holder distribution data
 */
export interface HolderDistribution {
  // Basic counts
  totalHolders: number;
  
  // Top holder analysis
  topHolders: ProcessedHolder[];
  top10Percent: number;      // % of supply held by top 10
  top20Percent: number;      // % of supply held by top 20
  top50Percent: number;      // % of supply held by top 50
  
  // Distribution metrics
  giniCoefficient: number;   // 0-1, higher = more concentrated
  herfindahlIndex: number;   // Market concentration index
  
  // Risk indicators
  concentrationRisk: 'low' | 'medium' | 'high' | 'extreme';
  whaleCount: number;        // Holders with > 1% of supply
  
  // Special addresses
  creatorAddress: string | null;
  creatorPercent: number;
  lpAddresses: string[];
  lpPercent: number;
  
  // Data quality
  dataSource: 'solscan';
  fetchedAt: Date;
  isComplete: boolean;
}

/**
 * Processed holder with additional info
 */
export interface ProcessedHolder {
  address: string;
  balance: number;
  percent: number;
  rank: number;
  isCreator: boolean;
  isLpPool: boolean;
  isExchange: boolean;
  label: string | null;
}

/**
 * Token transfer activity
 */
export interface TokenTransfer {
  signature: string;
  blockTime: number;
  slot: number;
  from: string;
  to: string;
  amount: number;
  decimals: number;
  changeType: string;
  fee: number;
}

/**
 * Account info
 */
export interface AccountInfo {
  address: string;
  lamports: number;
  ownerProgram: string;
  type: string;
  rentEpoch: number;
  executable: boolean;
  data?: any;
}

// ============================================================================
// KNOWN ADDRESSES
// ============================================================================

/**
 * Known LP pool programs and exchanges
 */
const KNOWN_LP_PROGRAMS = new Set([
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CPMM
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca Token Swap
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // Jupiter
]);

const KNOWN_EXCHANGES = new Set([
  'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2', // Binance
  'H8sMJSCQxfKiFTCfDR3DUfPwqJfCGpLByLQBFgD7Ld9S', // Coinbase
  // Add more as needed
]);

// ============================================================================
// RATE LIMITER
// ============================================================================

class SolscanRateLimiter {
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private windowStart: number = Date.now();

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    if (now - this.windowStart > 60000) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    if (this.requestCount >= CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.windowStart);
      if (waitTime > 0) {
        logger.debug('🔍 Solscan rate limit reached, waiting', { waitTime });
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }
    
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < CONFIG.RATE_LIMIT.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, CONFIG.RATE_LIMIT.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}

const rateLimiter = new SolscanRateLimiter();

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SolscanCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  get<T>(key: string, customTtl?: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const ttl = customTtl || CONFIG.CACHE_TTL;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const cache = new SolscanCache();

// ============================================================================
// API METHODS
// ============================================================================

/**
 * Get request headers
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  
  if (CONFIG.API_KEY) {
    headers['token'] = CONFIG.API_KEY;
  }
  
  return headers;
}

/**
 * 🎯 Get token metadata
 */
export async function getTokenMeta(mint: string): Promise<SolscanTokenMeta | null> {
  const cacheKey = `meta:${mint}`;
  
  const cached = cache.get<SolscanTokenMeta>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.BASE_URL}/token/meta`,
      {
        params: { tokenAddress: mint },
        timeout: CONFIG.TIMEOUT,
        headers: getHeaders(),
      }
    );
    
    if (!response.data || response.data.error) {
      return null;
    }
    
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error: any) {
    logger.error('🔍 Solscan meta fetch failed', {
      mint: mint.slice(0, 8),
      error: error.message,
    });
    return null;
  }
}

/**
 * 👥 Get token holders (top N)
 */
export async function getTokenHolders(
  mint: string, 
  limit: number = CONFIG.DEFAULT_TOP_HOLDERS,
  offset: number = 0
): Promise<SolscanHolder[]> {
  const cacheKey = `holders:${mint}:${limit}:${offset}`;
  
  const cached = cache.get<SolscanHolder[]>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.BASE_URL}/token/holders`,
      {
        params: { 
          tokenAddress: mint,
          limit,
          offset,
        },
        timeout: CONFIG.TIMEOUT,
        headers: getHeaders(),
      }
    );
    
    const holders = response.data?.data || response.data || [];
    cache.set(cacheKey, holders);
    
    logger.debug('🔍 Solscan holders fetched', {
      mint: mint.slice(0, 8),
      count: holders.length,
    });
    
    return holders;
  } catch (error: any) {
    logger.error('🔍 Solscan holders fetch failed', {
      mint: mint.slice(0, 8),
      error: error.message,
    });
    return [];
  }
}

/**
 * 📊 Get comprehensive holder distribution analysis
 */
export async function analyzeHolderDistribution(
  mint: string,
  creatorAddress?: string
): Promise<HolderDistribution> {
  const cacheKey = `distribution:${mint}`;
  
  const cached = cache.get<HolderDistribution>(cacheKey);
  if (cached) return cached;
  
  // Fetch token meta and top holders in parallel
  const [meta, topHolders] = await Promise.all([
    getTokenMeta(mint),
    getTokenHolders(mint, 50), // Get top 50 for analysis
  ]);
  
  const totalHolders = meta?.holder || 0;
  const totalSupply = meta?.supply ? parseFloat(meta.supply) : 0;
  const decimals = meta?.decimals || 9;
  
  // Process holders
  const processedHolders: ProcessedHolder[] = topHolders.map((h, index) => {
    const balance = h.amount / Math.pow(10, decimals);
    const percent = totalSupply > 0 ? (balance / totalSupply) * 100 : 0;
    
    return {
      address: h.owner || h.address,
      balance,
      percent,
      rank: index + 1,
      isCreator: creatorAddress ? (h.owner === creatorAddress || h.address === creatorAddress) : false,
      isLpPool: KNOWN_LP_PROGRAMS.has(h.owner || h.address),
      isExchange: KNOWN_EXCHANGES.has(h.owner || h.address),
      label: getLabelForAddress(h.owner || h.address),
    };
  });
  
  // Calculate concentration metrics
  const top10 = processedHolders.slice(0, 10);
  const top20 = processedHolders.slice(0, 20);
  const top50 = processedHolders.slice(0, 50);
  
  const top10Percent = top10.reduce((sum, h) => sum + h.percent, 0);
  const top20Percent = top20.reduce((sum, h) => sum + h.percent, 0);
  const top50Percent = top50.reduce((sum, h) => sum + h.percent, 0);
  
  // Calculate Gini coefficient (simplified)
  const giniCoefficient = calculateGini(processedHolders.map(h => h.percent));
  
  // Calculate Herfindahl Index
  const herfindahlIndex = processedHolders.reduce((sum, h) => sum + Math.pow(h.percent / 100, 2), 0);
  
  // Count whales (> 1% of supply)
  const whaleCount = processedHolders.filter(h => h.percent > 1 && !h.isLpPool).length;
  
  // Determine concentration risk
  let concentrationRisk: 'low' | 'medium' | 'high' | 'extreme';
  if (top10Percent > 80) concentrationRisk = 'extreme';
  else if (top10Percent > 60) concentrationRisk = 'high';
  else if (top10Percent > 40) concentrationRisk = 'medium';
  else concentrationRisk = 'low';
  
  // Find creator
  const creatorHolder = processedHolders.find(h => h.isCreator);
  
  // Find LP pools
  const lpHolders = processedHolders.filter(h => h.isLpPool);
  const lpPercent = lpHolders.reduce((sum, h) => sum + h.percent, 0);
  
  const result: HolderDistribution = {
    totalHolders,
    topHolders: processedHolders,
    top10Percent,
    top20Percent,
    top50Percent,
    giniCoefficient,
    herfindahlIndex,
    concentrationRisk,
    whaleCount,
    creatorAddress: creatorHolder?.address || creatorAddress || null,
    creatorPercent: creatorHolder?.percent || 0,
    lpAddresses: lpHolders.map(h => h.address),
    lpPercent,
    dataSource: 'solscan',
    fetchedAt: new Date(),
    isComplete: topHolders.length >= 50,
  };
  
  cache.set(cacheKey, result);
  
  logger.debug('🔍 Holder distribution analyzed', {
    mint: mint.slice(0, 8),
    holders: totalHolders,
    top10: top10Percent.toFixed(1) + '%',
    risk: concentrationRisk,
  });
  
  return result;
}

/**
 * 📜 Get recent transfers for a token
 */
export async function getTokenTransfers(
  mint: string,
  limit: number = 20
): Promise<TokenTransfer[]> {
  const cacheKey = `transfers:${mint}:${limit}`;
  
  const cached = cache.get<TokenTransfer[]>(cacheKey, 30000); // 30s cache for transfers
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.BASE_URL}/token/transfer`,
      {
        params: { 
          tokenAddress: mint,
          limit,
        },
        timeout: CONFIG.TIMEOUT,
        headers: getHeaders(),
      }
    );
    
    const transfers = response.data?.data || [];
    cache.set(cacheKey, transfers);
    
    return transfers;
  } catch (error: any) {
    logger.error('🔍 Solscan transfers fetch failed', {
      mint: mint.slice(0, 8),
      error: error.message,
    });
    return [];
  }
}

/**
 * 👤 Get account info
 */
export async function getAccountInfo(address: string): Promise<AccountInfo | null> {
  const cacheKey = `account:${address}`;
  
  const cached = cache.get<AccountInfo>(cacheKey);
  if (cached) return cached;
  
  try {
    await rateLimiter.waitForSlot();
    
    const response = await axios.get(
      `${CONFIG.BASE_URL}/account/${address}`,
      {
        timeout: CONFIG.TIMEOUT,
        headers: getHeaders(),
      }
    );
    
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error: any) {
    logger.error('🔍 Solscan account fetch failed', {
      address: address.slice(0, 8),
      error: error.message,
    });
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate Gini coefficient from percentages
 */
function calculateGini(percentages: number[]): number {
  if (percentages.length === 0) return 0;
  
  const sorted = [...percentages].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  if (sum === 0) return 0;
  
  let cumulativeSum = 0;
  let giniSum = 0;
  
  for (let i = 0; i < n; i++) {
    cumulativeSum += sorted[i];
    giniSum += cumulativeSum;
  }
  
  const gini = (2 * giniSum) / (n * sum) - (n + 1) / n;
  return Math.max(0, Math.min(1, gini));
}

/**
 * Get label for known addresses
 */
function getLabelForAddress(address: string): string | null {
  if (KNOWN_LP_PROGRAMS.has(address)) {
    if (address.startsWith('675kPX')) return 'Raydium AMM';
    if (address.startsWith('CAMM')) return 'Raydium CPMM';
    if (address.startsWith('whirL')) return 'Orca Whirlpool';
    return 'LP Pool';
  }
  
  if (KNOWN_EXCHANGES.has(address)) {
    if (address.startsWith('AC5RD')) return 'Binance';
    if (address.startsWith('H8sMJ')) return 'Coinbase';
    return 'Exchange';
  }
  
  return null;
}

/**
 * Build AI context from holder distribution
 */
export function buildHolderContext(distribution: HolderDistribution): string {
  const { 
    totalHolders, 
    top10Percent, 
    top20Percent,
    concentrationRisk,
    whaleCount,
    creatorPercent,
    lpPercent,
    topHolders,
  } = distribution;
  
  // Get non-LP top holders for display
  const realHolders = topHolders
    .filter(h => !h.isLpPool)
    .slice(0, 10);
  
  return `
=== HOLDER DISTRIBUTION (Solscan) ===

📊 OVERVIEW:
• Total Holders: ${totalHolders.toLocaleString()}
• Concentration Risk: ${concentrationRisk.toUpperCase()}
• Whale Count (>1%): ${whaleCount}

📈 CONCENTRATION:
• Top 10 Holders: ${top10Percent.toFixed(1)}% of supply
• Top 20 Holders: ${top20Percent.toFixed(1)}% of supply
• Gini Coefficient: ${distribution.giniCoefficient.toFixed(3)}

💧 LIQUIDITY:
• LP Pool Holdings: ${lpPercent.toFixed(1)}% of supply
${distribution.lpAddresses.length > 0 ? distribution.lpAddresses.map(a => `• LP: ${a.slice(0, 8)}...`).join('\n') : ''}

👤 CREATOR:
• Creator Holdings: ${creatorPercent > 0 ? creatorPercent.toFixed(2) + '%' : 'Unknown/0%'}
${distribution.creatorAddress ? `• Creator: ${distribution.creatorAddress.slice(0, 8)}...` : ''}

🐋 TOP HOLDERS (Non-LP):
${realHolders.map((h, i) => 
  `${i + 1}. ${h.address.slice(0, 8)}... — ${h.percent.toFixed(2)}%${h.label ? ` (${h.label})` : ''}${h.isCreator ? ' 👤 CREATOR' : ''}`
).join('\n')}
`.trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const solscanApi = {
  getTokenMeta,
  getTokenHolders,
  analyzeHolderDistribution,
  getTokenTransfers,
  getAccountInfo,
  buildHolderContext,
};

export default solscanApi;
