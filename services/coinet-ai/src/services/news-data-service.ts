/**
 * 📰 NEWS DATA SERVICE
 * 
 * Fetches and analyzes crypto news from multiple sources.
 * 
 * NOTE: Currently returns "unavailable" status as news APIs
 * require API keys (NewsAPI, CryptoPanic, etc.)
 * 
 * TODO: Integrate when API keys are available:
 * - CryptoPanic API (free tier available)
 * - NewsAPI
 * - CoinDesk API
 */

import { logger } from '../utils/logger';
import { NewsContext } from '../types/coinet-brief';
import NodeCache from 'node-cache';

export class NewsDataService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 600; // 10 minutes cache for news

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
    logger.info('📰 NewsDataService initialized (APIs not configured - will return unavailable status)');
  }

  /**
   * Get recent news and analysis for a symbol
   */
  async getNewsData(symbol: string): Promise<NewsContext> {
    const cacheKey = `news_${symbol}`;
    
    // Check cache first
    const cached = this.cache.get<NewsContext>(cacheKey);
    if (cached) {
      return cached;
    }

    // Return unavailable status - no fake data
    logger.info(`📰 News data for ${symbol}: APIs not configured`);
    
    const result = this.getUnavailableResponse(symbol);
    this.cache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Return honest "unavailable" response instead of fake data
   */
  private getUnavailableResponse(symbol: string): NewsContext {
    return {
      recentNews: [],
      dominantNarrative: 'News data unavailable',
      lastUpdated: new Date(),
      dataSource: 'unavailable',
      unavailableReason: 'News APIs not configured. Requires CryptoPanic or NewsAPI key.',
    };
  }

  /**
   * Clear cache for a symbol
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.del(`news_${symbol}`);
    } else {
      this.cache.flushAll();
    }
  }
}
