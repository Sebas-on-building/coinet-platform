/**
 * CoinGecko Token Unlocks Integration
 * Extract vesting/unlock data from CoinGecko's tokenomics endpoints
 * 
 * Uses: /coins/{id} with tokenomics data
 * Free tier: 30 calls/min
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { getRateLimiter } from '../middleware/rateLimiter';
import { DataSource } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface CoinGeckoTokenomics {
  id: string;
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_supply: number;
    max_supply: number | null;
    circulating_supply: number;
    fully_diluted_valuation: { usd: number };
  };
  // Tokenomics data (available for some tokens)
  tickers?: any[];
  community_data?: any;
  developer_data?: any;
  status_updates?: any[];
}

export interface CoinGeckoAllocation {
  category: string;
  percentage: number;
  amount: number;
  isLocked: boolean;
  vestingEnd?: Date;
  notes?: string;
}

export interface CoinGeckoVestingInfo {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  totalSupply: number;
  circulatingSupply: number;
  maxSupply: number | null;
  percentCirculating: number;
  percentLocked: number;
  estimatedLockedTokens: number;
  estimatedLockedUsd: number;
  allocations: CoinGeckoAllocation[];
  inferredUnlocks: InferredUnlock[];
}

export interface InferredUnlock {
  id: string;
  source: 'coingecko';
  symbol: string;
  name: string;
  unlockDate: Date;
  unlockAmount: number;
  unlockAmountUsd: number;
  percentOfCirculating: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  isEstimate: boolean;
  notes?: string;
}

// Known token allocations (curated data)
const KNOWN_ALLOCATIONS: Record<string, CoinGeckoAllocation[]> = {
  'arbitrum': [
    { category: 'Team', percentage: 26.94, amount: 0, isLocked: true },
    { category: 'Investors', percentage: 17.53, amount: 0, isLocked: true },
    { category: 'DAO Treasury', percentage: 42.78, amount: 0, isLocked: false },
    { category: 'Airdrop', percentage: 12.75, amount: 0, isLocked: false },
  ],
  'optimism': [
    { category: 'Ecosystem Fund', percentage: 25, amount: 0, isLocked: false },
    { category: 'Retroactive Airdrops', percentage: 19, amount: 0, isLocked: false },
    { category: 'Core Contributors', percentage: 19, amount: 0, isLocked: true },
    { category: 'Investors', percentage: 17, amount: 0, isLocked: true },
    { category: 'Sugar Xaddies', percentage: 20, amount: 0, isLocked: false },
  ],
  'aptos': [
    { category: 'Community', percentage: 51.02, amount: 0, isLocked: false },
    { category: 'Core Contributors', percentage: 19, amount: 0, isLocked: true },
    { category: 'Foundation', percentage: 16.5, amount: 0, isLocked: true },
    { category: 'Investors', percentage: 13.48, amount: 0, isLocked: true },
  ],
  'sui': [
    { category: 'Community Reserve', percentage: 50, amount: 0, isLocked: false },
    { category: 'Early Contributors', percentage: 20, amount: 0, isLocked: true },
    { category: 'Investors', percentage: 14, amount: 0, isLocked: true },
    { category: 'Mysten Labs', percentage: 10, amount: 0, isLocked: true },
    { category: 'Community Access', percentage: 6, amount: 0, isLocked: false },
  ],
};

// =============================================================================
// MAIN CLASS
// =============================================================================

export class CoinGeckoUnlocksClient extends EventEmitter {
  private axios: AxiosInstance;
  private rateLimiter = getRateLimiter();
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTtl: number;
  private apiKey?: string;

  constructor(options?: { apiKey?: string; cacheTtl?: number }) {
    super();
    
    this.apiKey = options?.apiKey || process.env.COINGECKO_API_KEY;
    this.cacheTtl = options?.cacheTtl || 600000; // 10 minutes
    this.cache = new Map();

    const baseURL = this.apiKey
      ? 'https://pro-api.coingecko.com/api/v3'
      : 'https://api.coingecko.com/api/v3';

    this.axios = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        ...(this.apiKey && { 'x-cg-pro-api-key': this.apiKey }),
      },
    });

    // Retry configuration
    axiosRetry(this.axios, {
      retries: 3,
      retryDelay: (retryCount) => retryCount * 1000,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               error.response?.status === 429;
      },
    });

    // Register rate limiter
    this.rateLimiter.register(DataSource.COINGECKO, {
      maxRequestsPerMinute: this.apiKey ? 500 : 30,
      reservoir: this.apiKey ? 500 : 30,
      reservoirRefreshAmount: this.apiKey ? 500 : 30,
      reservoirRefreshInterval: 60000,
    });

    logger.info('CoinGecko Unlocks Client initialized', {
      isPro: !!this.apiKey,
    });
  }

  // ===========================================================================
  // CACHING
  // ===========================================================================

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ===========================================================================
  // API METHODS
  // ===========================================================================

  /**
   * Get coin data with tokenomics
   */
  async getCoinData(coinId: string): Promise<CoinGeckoTokenomics | null> {
    const cacheKey = `coin-${coinId}`;
    const cached = this.getCached<CoinGeckoTokenomics>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.rateLimiter.schedule(
        DataSource.COINGECKO,
        async () => this.axios.get(`/coins/${coinId}`, {
          params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
            sparkline: false,
          },
        })
      );

      const data = response.data;
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Failed to fetch CoinGecko coin data', { error, coinId });
      return null;
    }
  }

  /**
   * Get vesting info for a coin
   */
  async getVestingInfo(coinId: string): Promise<CoinGeckoVestingInfo | null> {
    const coinData = await this.getCoinData(coinId);
    if (!coinData) return null;

    const md = coinData.market_data;
    const totalSupply = md.total_supply || 0;
    const circulatingSupply = md.circulating_supply || 0;
    const currentPrice = md.current_price?.usd || 0;

    const percentCirculating = totalSupply > 0
      ? (circulatingSupply / totalSupply) * 100
      : 100;
    
    const percentLocked = 100 - percentCirculating;
    const estimatedLockedTokens = totalSupply - circulatingSupply;
    const estimatedLockedUsd = estimatedLockedTokens * currentPrice;

    // Get known allocations or estimate
    let allocations = KNOWN_ALLOCATIONS[coinId] || [];
    if (allocations.length === 0) {
      allocations = this.estimateAllocations(percentLocked);
    }

    // Update allocation amounts based on total supply
    allocations = allocations.map(a => ({
      ...a,
      amount: (totalSupply * a.percentage) / 100,
    }));

    // Infer unlocks from allocations
    const inferredUnlocks = this.inferUnlocksFromAllocations(
      coinId,
      coinData.symbol,
      coinData.name,
      allocations,
      currentPrice,
      circulatingSupply
    );

    return {
      id: coinId,
      symbol: coinData.symbol.toUpperCase(),
      name: coinData.name,
      currentPrice,
      marketCap: md.market_cap?.usd || 0,
      totalSupply,
      circulatingSupply,
      maxSupply: md.max_supply,
      percentCirculating,
      percentLocked,
      estimatedLockedTokens,
      estimatedLockedUsd,
      allocations,
      inferredUnlocks,
    };
  }

  /**
   * Estimate allocations when not known
   */
  private estimateAllocations(percentLocked: number): CoinGeckoAllocation[] {
    if (percentLocked <= 5) {
      return [{ category: 'Fully Circulating', percentage: 100, amount: 0, isLocked: false }];
    }

    // Common allocation patterns
    return [
      { category: 'Team/Core', percentage: Math.min(percentLocked * 0.35, 25), amount: 0, isLocked: true },
      { category: 'Investors', percentage: Math.min(percentLocked * 0.25, 20), amount: 0, isLocked: true },
      { category: 'Treasury', percentage: Math.min(percentLocked * 0.25, 15), amount: 0, isLocked: true },
      { category: 'Ecosystem', percentage: Math.min(percentLocked * 0.15, 10), amount: 0, isLocked: false },
    ];
  }

  /**
   * Infer unlock schedule from allocations
   */
  private inferUnlocksFromAllocations(
    coinId: string,
    symbol: string,
    name: string,
    allocations: CoinGeckoAllocation[],
    price: number,
    circulatingSupply: number
  ): InferredUnlock[] {
    const unlocks: InferredUnlock[] = [];
    const now = new Date();

    for (const allocation of allocations) {
      if (!allocation.isLocked) continue;

      // Estimate monthly unlocks over 2-4 years (common vesting)
      const vestingMonths = this.estimateVestingMonths(allocation.category);
      const monthlyUnlock = allocation.amount / vestingMonths;
      
      // Create monthly unlock events
      for (let i = 1; i <= Math.min(vestingMonths, 24); i++) { // Limit to 24 months ahead
        const unlockDate = new Date(now);
        unlockDate.setMonth(unlockDate.getMonth() + i);

        unlocks.push({
          id: `coingecko-${symbol}-${allocation.category}-${i}`,
          source: 'coingecko',
          symbol: symbol.toUpperCase(),
          name,
          unlockDate,
          unlockAmount: monthlyUnlock,
          unlockAmountUsd: monthlyUnlock * price,
          percentOfCirculating: circulatingSupply > 0
            ? (monthlyUnlock / circulatingSupply) * 100
            : 0,
          category: allocation.category,
          confidence: KNOWN_ALLOCATIONS[coinId] ? 'medium' : 'low',
          isEstimate: true,
          notes: `Estimated monthly linear unlock from ${allocation.category} allocation`,
        });
      }
    }

    return unlocks.sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
  }

  /**
   * Estimate vesting months based on category
   */
  private estimateVestingMonths(category: string): number {
    const catLower = category.toLowerCase();
    
    if (catLower.includes('team') || catLower.includes('core')) return 48; // 4 years
    if (catLower.includes('investor')) return 36; // 3 years
    if (catLower.includes('advisor')) return 24; // 2 years
    if (catLower.includes('treasury') || catLower.includes('foundation')) return 60; // 5 years
    if (catLower.includes('ecosystem')) return 48; // 4 years
    
    return 36; // Default 3 years
  }

  /**
   * Get inferred unlocks for top tokens
   */
  async getTopTokensUnlocks(limit: number = 50): Promise<InferredUnlock[]> {
    try {
      // Get top coins by market cap
      const response = await this.rateLimiter.schedule(
        DataSource.COINGECKO,
        async () => this.axios.get('/coins/markets', {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: limit,
            page: 1,
            sparkline: false,
          },
        })
      );

      const allUnlocks: InferredUnlock[] = [];
      
      // Get vesting info for each (with delay to respect rate limits)
      for (const coin of response.data) {
        const vestingInfo = await this.getVestingInfo(coin.id);
        if (vestingInfo && vestingInfo.inferredUnlocks.length > 0) {
          allUnlocks.push(...vestingInfo.inferredUnlocks);
        }
        
        // Small delay
        await new Promise(r => setTimeout(r, 100));
      }

      // Sort by date and return
      return allUnlocks.sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
    } catch (error) {
      logger.error('Failed to get top tokens unlocks', { error });
      return [];
    }
  }

  /**
   * Search coins
   */
  async searchCoins(query: string): Promise<{ id: string; symbol: string; name: string }[]> {
    try {
      const response = await this.rateLimiter.schedule(
        DataSource.COINGECKO,
        async () => this.axios.get('/search', { params: { query } })
      );

      return response.data.coins?.slice(0, 10).map((c: any) => ({
        id: c.id,
        symbol: c.symbol,
        name: c.name,
      })) || [];
    } catch (error) {
      logger.error('Failed to search coins', { error, query });
      return [];
    }
  }

  /**
   * Get high-impact inferred unlocks
   */
  async getHighImpactUnlocks(options?: {
    minPercent?: number;
    minUsdValue?: number;
    daysAhead?: number;
    topCoins?: number;
  }): Promise<InferredUnlock[]> {
    const allUnlocks = await this.getTopTokensUnlocks(options?.topCoins || 30);
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + (options?.daysAhead || 30));

    return allUnlocks.filter(u => {
      if (u.unlockDate > cutoff) return false;
      if (options?.minPercent && u.percentOfCirculating < options.minPercent) return false;
      if (options?.minUsdValue && u.unlockAmountUsd < options.minUsdValue) return false;
      return true;
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.axios.get('/ping', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    cacheSize: number;
    isPro: boolean;
  } {
    return {
      cacheSize: this.cache.size,
      isPro: !!this.apiKey,
    };
  }
}

// Singleton
let instance: CoinGeckoUnlocksClient | null = null;

export function getCoinGeckoUnlocksClient(): CoinGeckoUnlocksClient {
  if (!instance) {
    instance = new CoinGeckoUnlocksClient();
  }
  return instance;
}

export default CoinGeckoUnlocksClient;

