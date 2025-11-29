/**
 * DeFiLlama Unlocks API Client
 * Free, decentralized token unlock data
 * 
 * API: https://api.llama.fi/unlocks
 * Documentation: https://defillama.com/docs/api
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface DeFiLlamaUnlock {
  name: string;
  symbol: string;
  address?: string;
  chain?: string;
  gecko_id?: string;
  event: string;
  timestamp: number;
  noOfTokens: number;
  price?: number;
  usdValue?: number;
  percentOfCirculating?: number;
  percentOfMax?: number;
  category?: string;
  description?: string;
}

export interface DeFiLlamaProtocol {
  id: string;
  name: string;
  symbol: string;
  chain: string;
  gecko_id?: string;
  address?: string;
  totalLockedTokens: number;
  totalLockedUsd: number;
  nextUnlock?: DeFiLlamaUnlock;
  upcomingUnlocks: DeFiLlamaUnlock[];
  historicalUnlocks: DeFiLlamaUnlock[];
}

export interface NormalizedDeFiLlamaUnlock {
  id: string;
  source: 'defillama';
  symbol: string;
  name: string;
  chain?: string;
  geckoId?: string;
  unlockDate: Date;
  unlockAmount: number;
  unlockAmountUsd: number;
  percentOfCirculating: number;
  percentOfMax: number;
  category: string;
  event: string;
  description?: string;
  verified: boolean;
}

// =============================================================================
// MAIN CLASS
// =============================================================================

export class DeFiLlamaUnlocksClient extends EventEmitter {
  private axios: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTtl: number;

  constructor(options?: { cacheTtl?: number }) {
    super();
    
    this.cacheTtl = options?.cacheTtl || 300000; // 5 minutes default
    this.cache = new Map();

    this.axios = axios.create({
      baseURL: 'https://api.llama.fi',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
      },
    });

    logger.info('DeFiLlama Unlocks Client initialized');
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
   * Get all upcoming unlocks
   */
  async getUpcomingUnlocks(): Promise<DeFiLlamaUnlock[]> {
    const cacheKey = 'upcoming';
    const cached = this.getCached<DeFiLlamaUnlock[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axios.get('/unlocks');
      const data = response.data;

      // DeFiLlama returns unlocks grouped by protocol
      const unlocks: DeFiLlamaUnlock[] = [];
      
      if (Array.isArray(data)) {
        for (const protocol of data) {
          if (protocol.events) {
            for (const event of protocol.events) {
              unlocks.push({
                name: protocol.name || '',
                symbol: protocol.symbol || '',
                address: protocol.address,
                chain: protocol.chain,
                gecko_id: protocol.gecko_id,
                event: event.name || event.event || 'Unknown',
                timestamp: event.timestamp || event.date,
                noOfTokens: event.noOfTokens || event.amount || 0,
                price: event.price,
                usdValue: event.usdValue || (event.noOfTokens * (event.price || 0)),
                percentOfCirculating: event.percentOfCirculating,
                percentOfMax: event.percentOfMax,
                category: event.category,
                description: event.description,
              });
            }
          }
        }
      } else if (data.unlocks) {
        // Alternative format
        for (const unlock of data.unlocks) {
          unlocks.push({
            name: unlock.protocol || unlock.name || '',
            symbol: unlock.symbol || '',
            chain: unlock.chain,
            event: unlock.event || 'Unlock',
            timestamp: unlock.timestamp || unlock.date,
            noOfTokens: unlock.amount || unlock.noOfTokens || 0,
            price: unlock.price,
            usdValue: unlock.usdValue,
            percentOfCirculating: unlock.percentOfCirculating,
            percentOfMax: unlock.percentOfMax,
            category: unlock.category,
          });
        }
      }

      // Filter to upcoming only
      const now = Date.now() / 1000;
      const upcoming = unlocks.filter(u => u.timestamp > now);
      
      this.setCache(cacheKey, upcoming);
      logger.info('Fetched DeFiLlama upcoming unlocks', { count: upcoming.length });
      
      return upcoming;
    } catch (error) {
      logger.error('Failed to fetch DeFiLlama unlocks', { error });
      return [];
    }
  }

  /**
   * Get unlocks for a specific protocol
   */
  async getProtocolUnlocks(protocol: string): Promise<DeFiLlamaProtocol | null> {
    const cacheKey = `protocol-${protocol}`;
    const cached = this.getCached<DeFiLlamaProtocol>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.axios.get(`/unlocks/${protocol}`);
      const data = response.data;

      if (!data) return null;

      const protocolData: DeFiLlamaProtocol = {
        id: data.id || protocol,
        name: data.name || protocol,
        symbol: data.symbol || '',
        chain: data.chain || '',
        gecko_id: data.gecko_id,
        address: data.address,
        totalLockedTokens: data.totalLocked || 0,
        totalLockedUsd: data.totalLockedUsd || 0,
        upcomingUnlocks: [],
        historicalUnlocks: [],
      };

      const now = Date.now() / 1000;

      if (data.events) {
        for (const event of data.events) {
          const unlock: DeFiLlamaUnlock = {
            name: data.name,
            symbol: data.symbol,
            event: event.name || 'Unlock',
            timestamp: event.timestamp,
            noOfTokens: event.noOfTokens || 0,
            price: event.price,
            usdValue: event.usdValue,
            percentOfCirculating: event.percentOfCirculating,
            percentOfMax: event.percentOfMax,
            category: event.category,
            description: event.description,
          };

          if (event.timestamp > now) {
            protocolData.upcomingUnlocks.push(unlock);
          } else {
            protocolData.historicalUnlocks.push(unlock);
          }
        }
      }

      // Set next unlock
      if (protocolData.upcomingUnlocks.length > 0) {
        protocolData.upcomingUnlocks.sort((a, b) => a.timestamp - b.timestamp);
        protocolData.nextUnlock = protocolData.upcomingUnlocks[0];
      }

      this.setCache(cacheKey, protocolData);
      return protocolData;
    } catch (error) {
      logger.error('Failed to fetch protocol unlocks', { error, protocol });
      return null;
    }
  }

  /**
   * Get emissions data (inflation/emissions schedules)
   */
  async getEmissions(protocol: string): Promise<any> {
    try {
      const response = await this.axios.get(`/emissions/${protocol}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch emissions', { error, protocol });
      return null;
    }
  }

  /**
   * Normalize unlock to standard format
   */
  normalizeUnlock(unlock: DeFiLlamaUnlock): NormalizedDeFiLlamaUnlock {
    return {
      id: `defillama-${unlock.symbol}-${unlock.timestamp}`,
      source: 'defillama',
      symbol: unlock.symbol?.toUpperCase() || 'UNKNOWN',
      name: unlock.name || unlock.symbol || 'Unknown',
      chain: unlock.chain,
      geckoId: unlock.gecko_id,
      unlockDate: new Date(unlock.timestamp * 1000),
      unlockAmount: unlock.noOfTokens,
      unlockAmountUsd: unlock.usdValue || 0,
      percentOfCirculating: unlock.percentOfCirculating || 0,
      percentOfMax: unlock.percentOfMax || 0,
      category: unlock.category || this.inferCategory(unlock.event),
      event: unlock.event,
      description: unlock.description,
      verified: true, // DeFiLlama data is generally reliable
    };
  }

  /**
   * Infer category from event name
   */
  private inferCategory(event: string): string {
    const eventLower = (event || '').toLowerCase();
    
    if (eventLower.includes('team')) return 'Team';
    if (eventLower.includes('investor') || eventLower.includes('seed') || eventLower.includes('private')) return 'Investor';
    if (eventLower.includes('advisor')) return 'Advisor';
    if (eventLower.includes('treasury') || eventLower.includes('foundation')) return 'Treasury';
    if (eventLower.includes('community') || eventLower.includes('ecosystem')) return 'Community';
    if (eventLower.includes('public') || eventLower.includes('sale')) return 'Public Sale';
    if (eventLower.includes('airdrop')) return 'Airdrop';
    if (eventLower.includes('mining') || eventLower.includes('staking')) return 'Mining/Staking';
    
    return 'Other';
  }

  /**
   * Get normalized upcoming unlocks
   */
  async getUpcomingUnlocksNormalized(options?: {
    limit?: number;
    minUsdValue?: number;
    daysAhead?: number;
  }): Promise<NormalizedDeFiLlamaUnlock[]> {
    const unlocks = await this.getUpcomingUnlocks();
    
    let normalized = unlocks.map(u => this.normalizeUnlock(u));
    
    // Filter by date range
    if (options?.daysAhead) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + options.daysAhead);
      normalized = normalized.filter(u => u.unlockDate <= cutoff);
    }
    
    // Filter by USD value
    if (options?.minUsdValue) {
      normalized = normalized.filter(u => u.unlockAmountUsd >= options.minUsdValue!);
    }
    
    // Sort by date
    normalized.sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
    
    // Limit
    if (options?.limit) {
      normalized = normalized.slice(0, options.limit);
    }
    
    return normalized;
  }

  /**
   * Get high-impact unlocks
   */
  async getHighImpactUnlocks(options?: {
    minPercent?: number;
    minUsdValue?: number;
    daysAhead?: number;
  }): Promise<NormalizedDeFiLlamaUnlock[]> {
    const normalized = await this.getUpcomingUnlocksNormalized({
      daysAhead: options?.daysAhead || 30,
    });
    
    return normalized.filter(u => {
      if (options?.minPercent && u.percentOfCirculating < options.minPercent) return false;
      if (options?.minUsdValue && u.unlockAmountUsd < options.minUsdValue) return false;
      return true;
    });
  }

  /**
   * Search protocols
   */
  async searchProtocols(query: string): Promise<DeFiLlamaProtocol[]> {
    const unlocks = await this.getUpcomingUnlocks();
    const queryLower = query.toLowerCase();
    
    const matched = new Set<string>();
    const results: DeFiLlamaProtocol[] = [];
    
    for (const unlock of unlocks) {
      if (matched.has(unlock.name)) continue;
      
      if (unlock.name?.toLowerCase().includes(queryLower) ||
          unlock.symbol?.toLowerCase().includes(queryLower)) {
        matched.add(unlock.name);
        
        results.push({
          id: unlock.symbol || unlock.name,
          name: unlock.name,
          symbol: unlock.symbol || '',
          chain: unlock.chain || '',
          gecko_id: unlock.gecko_id,
          totalLockedTokens: 0,
          totalLockedUsd: 0,
          upcomingUnlocks: [unlock],
          historicalUnlocks: [],
        });
      }
    }
    
    return results;
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
      await this.axios.get('/unlocks', { timeout: 5000 });
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
    cacheTtl: number;
  } {
    return {
      cacheSize: this.cache.size,
      cacheTtl: this.cacheTtl,
    };
  }
}

// Singleton
let instance: DeFiLlamaUnlocksClient | null = null;

export function getDeFiLlamaUnlocksClient(): DeFiLlamaUnlocksClient {
  if (!instance) {
    instance = new DeFiLlamaUnlocksClient();
  }
  return instance;
}

export default DeFiLlamaUnlocksClient;

