/**
 * 📚 Source Manager - Real Citation System
 * 
 * Tracks and returns ONLY the actual data sources that were used
 * during a chat response. No fake/placeholder sources.
 * 
 * Sources are only shown when:
 * - External APIs were actually called
 * - Real data was fetched from those sources
 * - The data was used in the response
 */

import { Source } from './types';
import { logger } from '../../utils/logger';

// ============================================================================
// SOURCE REGISTRY - Known data sources with metadata
// ============================================================================

export interface DataSourceInfo {
  id: string;
  domain: string;
  name: string;
  baseUrl: string;
  favicon: string;
  category: 'market-data' | 'on-chain' | 'news' | 'social' | 'governance' | 'security' | 'analytics';
}

const DATA_SOURCES: Record<string, DataSourceInfo> = {
  coingecko: {
    id: 'coingecko',
    domain: 'coingecko.com',
    name: 'CoinGecko',
    baseUrl: 'https://www.coingecko.com',
    favicon: 'https://static.coingecko.com/s/thumbnail-007177f3eca19695592f0b8b0eabbdae282b54154e1be912285c9034ea6cbaf2.png',
    category: 'market-data',
  },
  coinmarketcap: {
    id: 'coinmarketcap',
    domain: 'coinmarketcap.com',
    name: 'CoinMarketCap',
    baseUrl: 'https://coinmarketcap.com',
    favicon: 'https://coinmarketcap.com/favicon.ico',
    category: 'market-data',
  },
  defillama: {
    id: 'defillama',
    domain: 'defillama.com',
    name: 'DeFiLlama',
    baseUrl: 'https://defillama.com',
    favicon: 'https://defillama.com/defillama-press-kit/defi/PNG/defillama.png',
    category: 'on-chain',
  },
  snapshot: {
    id: 'snapshot',
    domain: 'snapshot.org',
    name: 'Snapshot',
    baseUrl: 'https://snapshot.org',
    favicon: 'https://snapshot.org/favicon.ico',
    category: 'governance',
  },
  goplus: {
    id: 'goplus',
    domain: 'gopluslabs.io',
    name: 'GoPlus Security',
    baseUrl: 'https://gopluslabs.io',
    favicon: 'https://gopluslabs.io/favicon.ico',
    category: 'security',
  },
  birdeye: {
    id: 'birdeye',
    domain: 'birdeye.so',
    name: 'Birdeye',
    baseUrl: 'https://birdeye.so',
    favicon: 'https://birdeye.so/favicon.ico',
    category: 'market-data',
  },
  dexscreener: {
    id: 'dexscreener',
    domain: 'dexscreener.com',
    name: 'DEX Screener',
    baseUrl: 'https://dexscreener.com',
    favicon: 'https://dexscreener.com/favicon.ico',
    category: 'market-data',
  },
  coinglass: {
    id: 'coinglass',
    domain: 'coinglass.com',
    name: 'Coinglass',
    baseUrl: 'https://coinglass.com',
    favicon: 'https://coinglass.com/favicon.ico',
    category: 'analytics',
  },
  lunarcrush: {
    id: 'lunarcrush',
    domain: 'lunarcrush.com',
    name: 'LunarCrush',
    baseUrl: 'https://lunarcrush.com',
    favicon: 'https://lunarcrush.com/favicon.ico',
    category: 'social',
  },
  cryptopanic: {
    id: 'cryptopanic',
    domain: 'cryptopanic.com',
    name: 'CryptoPanic',
    baseUrl: 'https://cryptopanic.com',
    favicon: 'https://cryptopanic.com/favicon.ico',
    category: 'news',
  },
};

// ============================================================================
// SOURCE TRACKER - Tracks which sources were actually used
// ============================================================================

export class SourceTracker {
  private usedSources: Map<string, { sourceId: string; symbol?: string; dataType: string; timestamp: number }> = new Map();

  /**
   * Record that a data source was used
   */
  recordSource(sourceId: string, options?: { symbol?: string; dataType?: string }) {
    const key = `${sourceId}-${options?.symbol || 'general'}-${options?.dataType || 'data'}`;
    this.usedSources.set(key, {
      sourceId,
      symbol: options?.symbol,
      dataType: options?.dataType || 'data',
      timestamp: Date.now(),
    });
    logger.debug('📚 Source recorded', { sourceId, symbol: options?.symbol, dataType: options?.dataType });
  }

  /**
   * Get all sources that were used, formatted for display
   */
  getSources(): Source[] {
    const sources: Source[] = [];
    const seenSources = new Set<string>();

    for (const [, usage] of this.usedSources) {
      // Don't duplicate sources
      if (seenSources.has(usage.sourceId)) continue;
      seenSources.add(usage.sourceId);

      const sourceInfo = DATA_SOURCES[usage.sourceId];
      if (!sourceInfo) continue;

      // Build the URL based on symbol if available
      let url = sourceInfo.baseUrl;
      let title = sourceInfo.name;
      let excerpt = '';

      if (usage.symbol) {
        const symbolLower = usage.symbol.toLowerCase();
        switch (usage.sourceId) {
          case 'coingecko':
            url = `${sourceInfo.baseUrl}/en/coins/${symbolLower}`;
            title = `${usage.symbol.toUpperCase()} on CoinGecko`;
            excerpt = `Real-time price, market cap, volume, and charts for ${usage.symbol.toUpperCase()}.`;
            break;
          case 'coinmarketcap':
            url = `${sourceInfo.baseUrl}/currencies/${symbolLower}`;
            title = `${usage.symbol.toUpperCase()} on CoinMarketCap`;
            excerpt = `Live price data and market statistics for ${usage.symbol.toUpperCase()}.`;
            break;
          case 'defillama':
            url = `${sourceInfo.baseUrl}/protocol/${symbolLower}`;
            title = `${usage.symbol.toUpperCase()} Protocol Data`;
            excerpt = `TVL, fees, and on-chain metrics from DeFiLlama.`;
            break;
          case 'birdeye':
            url = `${sourceInfo.baseUrl}/token/${symbolLower}`;
            title = `${usage.symbol.toUpperCase()} on Birdeye`;
            excerpt = `Solana token analytics and trading data.`;
            break;
          case 'dexscreener':
            url = `${sourceInfo.baseUrl}/search?q=${symbolLower}`;
            title = `${usage.symbol.toUpperCase()} on DEX Screener`;
            excerpt = `DEX trading pairs and liquidity data.`;
            break;
          default:
            title = `${usage.symbol.toUpperCase()} - ${sourceInfo.name}`;
            excerpt = `Data sourced from ${sourceInfo.name}.`;
        }
      } else {
        // Generic source without symbol
        title = sourceInfo.name;
        excerpt = `Market intelligence and data from ${sourceInfo.name}.`;
      }

      sources.push({
        id: `${usage.sourceId}-${Date.now()}`,
        domain: sourceInfo.domain,
        url,
        title,
        excerpt,
        favicon: sourceInfo.favicon,
        relevanceScore: 1.0, // All shown sources are relevant (actually used)
      });
    }

    return sources;
  }

  /**
   * Clear tracked sources (call at start of new request)
   */
  clear() {
    this.usedSources.clear();
  }

  /**
   * Check if any sources were used
   */
  hasAnySources(): boolean {
    return this.usedSources.size > 0;
  }
}

// ============================================================================
// LEGACY SOURCE MANAGER (for backwards compatibility)
// ============================================================================

export class SourceManager {
  /**
   * Get sources - NOW RETURNS EMPTY ARRAY
   * 
   * Sources should be tracked during data fetching using SourceTracker,
   * not generated after the fact.
   * 
   * @deprecated Use SourceTracker.recordSource() during data fetching instead
   */
  async getSources(
    symbol: string,
    topics: string[] = [],
    limit: number = 5
  ): Promise<Source[]> {
    // Return empty - sources should only come from actual data usage
    logger.debug('📚 SourceManager.getSources called (deprecated) - returning empty', { symbol, topics });
    return [];
  }
}

// Export instances
export const sourceManager = new SourceManager();
export const sourceTracker = new SourceTracker();

// Helper function to record a source during data fetching
export function recordDataSource(sourceId: string, symbol?: string, dataType?: string) {
  sourceTracker.recordSource(sourceId, { symbol, dataType });
}

// Helper to get tracked sources
export function getTrackedSources(): Source[] {
  return sourceTracker.getSources();
}

// Helper to clear sources at start of request
export function clearTrackedSources() {
  sourceTracker.clear();
}
