/**
 * ⛓️ ON-CHAIN DATA SERVICE
 * 
 * Fetches and analyzes on-chain metrics for cryptocurrency analysis.
 * 
 * NOTE: Currently returns "unavailable" status as on-chain data providers
 * require API keys (Glassnode, IntoTheBlock, etc.)
 * 
 * TODO: Integrate when API keys are available:
 * - Glassnode API
 * - IntoTheBlock API
 * - Messari API
 * - DefiLlama API (free)
 */

import { logger } from '../utils/logger';
import { OnChainContext } from '../types/coinet-brief';
import NodeCache from 'node-cache';

export class OnChainDataService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 300; // 5 minutes cache for on-chain data

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
    logger.info('⛓️ OnChainDataService initialized (APIs not configured - will return unavailable status)');
  }

  /**
   * Get comprehensive on-chain metrics for a symbol
   */
  async getOnChainData(symbol: string): Promise<OnChainContext> {
    const cacheKey = `onchain_${symbol}`;
    
    // Check cache first
    const cached = this.cache.get<OnChainContext>(cacheKey);
    if (cached) {
      return cached;
    }

    // Return unavailable status - no fake data
    logger.info(`⛓️ On-chain data for ${symbol}: APIs not configured`);
    
    const result = this.getUnavailableResponse(symbol);
    this.cache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Return honest "unavailable" response instead of fake data
   */
  private getUnavailableResponse(symbol: string): OnChainContext {
    return {
      activeAddresses: 0,
      transactionVolume: 0,
      whaleActivity: {
        largeTransfers: 0,
        accumulation: 'holding',
        netFlow: 0
      },
      lastUpdated: new Date(),
      dataSource: 'unavailable',
      unavailableReason: 'On-chain APIs not configured. Requires Glassnode, IntoTheBlock, or similar API key.',
    };
  }

  /**
   * Clear cache for a symbol
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.del(`onchain_${symbol}`);
    } else {
      this.cache.flushAll();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { keys: number; hits: number; misses: number } {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses
    };
  }
}
