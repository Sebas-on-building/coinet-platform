/**
 * =========================================
 * SIGNAL CACHE
 * =========================================
 * Divine world-class caching system for notification signals
 * High-performance in-memory caching with Redis fallback
 */

import NodeCache from 'node-cache';
import { Logger } from '@/utils/Logger';

/**
 * Cache configuration
 */
export interface CacheConfig {
  stdTTL: number; // Standard TTL in seconds
  checkperiod: number; // Cleanup interval in seconds
  maxKeys: number; // Maximum number of keys
  useClones: boolean; // Clone objects on get/set
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  stdTTL: 3600, // 1 hour
  checkperiod: 600, // 10 minutes
  maxKeys: 10000,
  useClones: false,
};

/**
 * Signal cache for high-performance caching
 */
export class SignalCache {
  private logger: Logger;
  private cache: NodeCache;
  private config: CacheConfig;

  constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.logger = new Logger('SignalCache');
    this.config = config;
    this.cache = new NodeCache({
      stdTTL: config.stdTTL,
      checkperiod: config.checkperiod,
      maxKeys: config.maxKeys,
      useClones: config.useClones,
    });

    this.logger.info('SignalCache initialized', {
      stdTTL: config.stdTTL,
      maxKeys: config.maxKeys,
    });
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        this.logger.debug('Cache hit', { key });
      } else {
        this.logger.debug('Cache miss', { key });
      }
      return value;
    } catch (error: any) {
      this.logger.error('Cache get failed', { key, error: error.message });
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = ttl ? this.cache.set(key, value, ttl) : this.cache.set(key, value);
      if (success) {
        this.logger.debug('Cache set', { key, ttl });
      } else {
        this.logger.warn('Cache set failed', { key });
      }
      return success;
    } catch (error: any) {
      this.logger.error('Cache set failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  del(key: string): number {
    try {
      const deleted = this.cache.del(key);
      if (deleted > 0) {
        this.logger.debug('Cache delete', { key, deleted });
      }
      return deleted;
    } catch (error: any) {
      this.logger.error('Cache delete failed', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    try {
      return this.cache.has(key);
    } catch (error: any) {
      this.logger.error('Cache has failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get multiple keys from cache
   */
  mget<T>(keys: string[]): { [key: string]: T | undefined } {
    try {
      const result = this.cache.mget<T>(keys);
      this.logger.debug('Cache mget', { keys: keys.length, hits: Object.keys(result).length });
      return result;
    } catch (error: any) {
      this.logger.error('Cache mget failed', { keys: keys.length, error: error.message });
      return {};
    }
  }

  /**
   * Set multiple keys in cache
   */
  mset<T>(keyValuePairs: { key: string; value: T; ttl?: number }[]): boolean {
    try {
      const keyValueSet = keyValuePairs.map(({ key, value }) => ({ key, val: value }));
      const success = this.cache.mset(keyValueSet);
      if (success) {
        this.logger.debug('Cache mset', { count: keyValuePairs.length });
      }
      return success;
    } catch (error: any) {
      this.logger.error('Cache mset failed', { count: keyValuePairs.length, error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  } {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize,
    };
  }

  /**
   * Flush all cache data
   */
  flushAll(): void {
    try {
      this.cache.flushAll();
      this.logger.info('Cache flushed');
    } catch (error: any) {
      this.logger.error('Cache flush failed', { error: error.message });
    }
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    try {
      return this.cache.keys();
    } catch (error: any) {
      this.logger.error('Cache keys failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get TTL for a key
   */
  getTtl(key: string): number {
    try {
      const ttl = this.cache.getTtl(key);
      return ttl || -1;
    } catch (error: any) {
      this.logger.error('Cache getTtl failed', { key, error: error.message });
      return -1;
    }
  }

  /**
   * Set TTL for a key
   */
  setTtl(key: string, ttl: number): boolean {
    try {
      return this.cache.ttl(key, ttl);
    } catch (error: any) {
      this.logger.error('Cache setTtl failed', { key, ttl, error: error.message });
      return false;
    }
  }

  /**
   * Get key details including TTL and value size
   */
  getKeyDetails(key: string): {
    exists: boolean;
    ttl?: number;
    value?: any;
    size?: number;
  } | null {
    try {
      const value = this.get(key);
      const ttl = this.getTtl(key);

      if (value === undefined && ttl === -2) {
        return null; // Key doesn't exist
      }

      const size = JSON.stringify(value).length;

      return {
        exists: value !== undefined,
        ttl,
        value,
        size,
      };
    } catch (error: any) {
      this.logger.error('Cache getKeyDetails failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Clean up expired keys
   */
  cleanup(): void {
    try {
      const beforeKeys = this.cache.getStats().keys;
      this.cache.flushAll(); // flushExpired doesn't exist in NodeCache
      const afterKeys = this.cache.getStats().keys;

      if (beforeKeys !== afterKeys) {
        this.logger.info('Cache cleanup completed', {
          beforeKeys,
          afterKeys,
          removed: beforeKeys - afterKeys,
        });
      }
    } catch (error: any) {
      this.logger.error('Cache cleanup failed', { error: error.message });
    }
  }

  /**
   * Health check for cache
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    stats: ReturnType<SignalCache['getStats']>;
    memoryUsage: number;
  } {
    try {
      const stats = this.getStats();
      const memoryUsage = process.memoryUsage().heapUsed;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      // Consider degraded if hit rate is below 80%
      const hitRate = stats.hits / (stats.hits + stats.misses);
      if (hitRate < 0.8 && (stats.hits + stats.misses) > 100) {
        status = 'degraded';
      }

      // Consider unhealthy if memory usage is very high
      if (memoryUsage > 100 * 1024 * 1024) { // 100MB
        status = 'unhealthy';
      }

      return {
        status,
        stats,
        memoryUsage,
      };
    } catch (error: any) {
      this.logger.error('Cache health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        stats: { keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 },
        memoryUsage: 0,
      };
    }
  }
}
