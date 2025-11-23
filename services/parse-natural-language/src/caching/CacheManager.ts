/**
 * =========================================
 * NLP CACHE MANAGER
 * =========================================
 * Divine world-class caching for NLP operations
 */

import NodeCache from 'node-cache';
import { Logger } from '@/utils/Logger';
import { ParsingResult, NLPConfig } from '@/types';

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of keys
  checkPeriod: number; // Cleanup interval in seconds
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 3600, // 1 hour
  maxSize: 10000,
  checkPeriod: 600 // 10 minutes
};

/**
 * Cache key generator
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for NLP input
   */
  static generate(input: string, options?: any): string {
    const hash = this.simpleHash(input + JSON.stringify(options || {}));
    return `nlp:${hash}`;
  }

  /**
   * Generate cache key for similar inputs (fuzzy matching)
   */
  static generateFuzzy(input: string): string {
    const normalized = input.toLowerCase().replace(/\s+/g, ' ').trim();
    const hash = this.simpleHash(normalized);
    return `nlp:fuzzy:${hash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * NLP cache manager
 */
export class CacheManager {
  private cache: NodeCache;
  private logger: Logger;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.logger = new Logger('CacheManager');

    this.cache = new NodeCache({
      stdTTL: this.config.ttl,
      maxKeys: this.config.maxSize,
      checkperiod: this.config.checkPeriod,
      useClones: false,
      deleteOnExpire: true
    } as any); // Type assertion for node-cache options

    this.setupEventListeners();
  }

  /**
   * Get cached parsing result
   */
  get(input: string, options?: any): ParsingResult | undefined {
    if (!this.config.enabled) {
      return undefined;
    }

    const key = CacheKeyGenerator.generate(input, options);
    const cached = this.cache.get<ParsingResult>(key);

    if (cached) {
      this.logger.debug('Cache hit', { key });
      return cached;
    }

    // Try fuzzy matching for similar inputs
    const fuzzyKey = CacheKeyGenerator.generateFuzzy(input);
    const fuzzyCached = this.cache.get<ParsingResult>(fuzzyKey);

    if (fuzzyCached) {
      this.logger.debug('Fuzzy cache hit', { key: fuzzyKey });
      return fuzzyCached;
    }

    this.logger.debug('Cache miss', { key });
    return undefined;
  }

  /**
   * Set parsing result in cache
   */
  set(input: string, options: any, result: ParsingResult): void {
    if (!this.config.enabled) {
      return;
    }

    const key = CacheKeyGenerator.generate(input, options);
    const fuzzyKey = CacheKeyGenerator.generateFuzzy(input);

    this.cache.set(key, result);
    this.cache.set(fuzzyKey, result);

    this.logger.debug('Cached result', { key, fuzzyKey });
  }

  /**
   * Invalidate cache for specific input
   */
  invalidate(input: string, options?: any): void {
    const key = CacheKeyGenerator.generate(input, options);
    const fuzzyKey = CacheKeyGenerator.generateFuzzy(input);

    this.cache.del(key);
    this.cache.del(fuzzyKey);

    this.logger.debug('Invalidated cache', { key, fuzzyKey });
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.flushAll();
    this.logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }

  /**
   * Check cache health
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    try {
      const stats = this.getStats();
      const isHealthy = stats.keys > 0 && stats.hits > 0;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Setup cache event listeners
   */
  private setupEventListeners(): void {
    this.cache.on('set', (key: string, value: any) => {
      this.logger.debug('Cache set', { key, size: JSON.stringify(value).length });
    });

    this.cache.on('del', (key: string, value: any) => {
      this.logger.debug('Cache deleted', { key });
    });

    this.cache.on('expired', (key: string, value: any) => {
      this.logger.debug('Cache expired', { key });
    });

    this.cache.on('flush', () => {
      this.logger.info('Cache flushed');
    });
  }
}
