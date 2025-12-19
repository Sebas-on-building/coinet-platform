/**
 * 🐦 SOCIAL DATA SERVICE
 * 
 * Aggregates and analyzes social sentiment from multiple platforms.
 * 
 * NOTE: Currently returns "unavailable" status as social media APIs
 * (Twitter/X, Reddit) require API keys and have complex rate limits.
 * 
 * TODO: Integrate when API keys are available:
 * - Twitter/X API v2
 * - Reddit API
 * - Telegram API
 * - Discord API
 */

import { logger } from '../utils/logger';
import { SocialContext } from '../types/coinet-brief';
import NodeCache from 'node-cache';

export class SocialDataService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 300; // 5 minutes cache for social data

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
    logger.info('🐦 SocialDataService initialized (APIs not configured - will return unavailable status)');
  }

  /**
   * Get aggregated social sentiment and mentions
   */
  async getSocialData(symbol: string): Promise<SocialContext> {
    const cacheKey = `social_${symbol}`;
    
    // Check cache first
    const cached = this.cache.get<SocialContext>(cacheKey);
    if (cached) {
      return cached;
    }

    // Return unavailable status - no fake data
    logger.info(`🐦 Social data for ${symbol}: APIs not configured`);
    
    const result = this.getUnavailableResponse(symbol);
    this.cache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Return honest "unavailable" response instead of fake data
   */
  private getUnavailableResponse(symbol: string): SocialContext {
    return {
      sentiment: {
        score: 0,           // 0 indicates unavailable, not neutral
        trend: 'stable',
        volume: 0,
        authenticity: 0
      },
      topMentions: [],
      trendingTopics: [],
      lastUpdated: new Date(),
      dataSource: 'unavailable',
      unavailableReason: 'Social media APIs not configured. Requires Twitter/X, Reddit API keys.',
    };
  }

  /**
   * Clear cache for a symbol
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.del(`social_${symbol}`);
    } else {
      this.cache.flushAll();
    }
  }
}
