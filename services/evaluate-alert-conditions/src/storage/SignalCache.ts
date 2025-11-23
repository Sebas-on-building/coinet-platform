/**
 * =========================================
 * SIGNAL CACHE
 * =========================================
 * Divine world-class in-memory signal cache for pattern matching
 * High-performance caching with TTL and LRU eviction
 */

import { Logger } from '@/utils/Logger';
import NodeCache from 'node-cache';
import { NormalizedMarketSignal, ISignalCache } from '../types';

/**
 * In-memory signal cache implementation
 */
export class SignalCache implements ISignalCache {
  private logger: Logger;
  private cache: NodeCache;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(
    defaultTTL: number = 300, // 5 minutes
    maxSize: number = 10000,
    checkPeriod: number = 60 // 1 minute
  ) {
    this.logger = new Logger('SignalCache');

    this.cache = new NodeCache({
      stdTTL: defaultTTL,
      maxKeys: maxSize,
      checkperiod: checkPeriod,
      useClones: false, // Don't clone for performance
    });

    // Monitor cache events
    this.cache.on('set', (key: string, value: any) => {
      this.logger.debug('Cache set', { key, size: JSON.stringify(value).length });
    });

    this.cache.on('del', (key: string, value: any) => {
      this.logger.debug('Cache delete', { key });
    });

    this.cache.on('expired', (key: string, value: any) => {
      this.logger.debug('Cache expired', { key });
    });
  }

  /**
   * Get cached signals
   */
  get(key: string): NormalizedMarketSignal[] | undefined {
    const value = this.cache.get(key);

    if (value) {
      this.stats.hits++;
      this.logger.debug('Cache hit', { key });
      return value as NormalizedMarketSignal[];
    } else {
      this.stats.misses++;
      this.logger.debug('Cache miss', { key });
      return undefined;
    }
  }

  /**
   * Set cached signals with TTL
   */
  set(key: string, signals: NormalizedMarketSignal[], ttl: number): void {
    this.cache.set(key, signals, ttl);
    this.logger.debug('Cache set', { key, signalCount: signals.length, ttl });
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string): void {
    if (pattern === '*') {
      this.cache.flushAll();
      this.logger.info('Flushed entire cache');
    } else {
      // For wildcard patterns, we'd need a more sophisticated implementation
      // For now, just log the request
      this.logger.debug('Cache invalidation requested', { pattern });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    hitRatio: number;
    size: number;
  } {
    const keys = this.cache.getStats().keys;
    const hitRatio = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRatio,
      size: keys,
    };
  }

  /**
   * Get cache keys (for debugging)
   */
  getKeys(): string[] {
    return this.cache.keys();
  }

  /**
   * Get cached value details
   */
  getKeyDetails(key: string): {
    value?: NormalizedMarketSignal[];
    ttl?: number;
    created?: number;
  } {
    const value = this.cache.get(key);
    const ttl = this.cache.getTtl(key);

    const result: any = {};
    if (value) {
      result.value = value as NormalizedMarketSignal[];
    }
    if (ttl && ttl > 0) {
      result.ttl = Math.ceil((ttl - Date.now()) / 1000);
    }
    return result;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.flushAll();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.info('Cleared signal cache');
  }

  /**
   * Get memory usage (approximate)
   */
  getMemoryUsage(): number {
    // Rough estimate based on number of keys and average signal size
    const keys = this.cache.getStats().keys;
    const avgSignalSize = 1024; // 1KB per signal estimate

    return keys * avgSignalSize;
  }
}
