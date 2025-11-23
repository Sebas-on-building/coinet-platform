/**
 * =========================================
 * CACHE MANAGER
 * =========================================
 * Divine world-class caching system for AI insights performance optimization
 */

import { Logger } from '../utils/Logger';

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number;
}

/**
 * High-performance cache manager for AI insights
 */
export class CacheManager {
  private logger: Logger;
  private config: CacheConfig;
  private cache: Map<string, { data: any; expiresAt: number; size: number }> = new Map();
  private accessOrder: string[] = []; // For LRU eviction

  constructor(config: CacheConfig) {
    this.logger = new Logger('CacheManager');
    this.config = config;

    // Clean up expired entries periodically
    if (config.enabled) {
      setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }

  /**
   * Get cached data
   */
  async get(key: string): Promise<any | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.logger.debug('Cache miss', { key });
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.logger.debug('Cache expired', { key });
        return null;
      }

      // Update access order for LRU
      this.updateAccessOrder(key);

      this.logger.debug('Cache hit', { key, size: entry.size });
      return entry.data;

    } catch (error: any) {
      this.logger.error('Cache get failed', { error: error.message, key });
      return null;
    }
  }

  /**
   * Set cache data
   */
  async set(key: string, data: any): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Estimate size (rough calculation)
      const size = this.estimateSize(data);

      // Check if we need to evict entries (LRU)
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }

      const expiresAt = Date.now() + (this.config.ttl * 1000);

      this.cache.set(key, { data, expiresAt, size });
      this.updateAccessOrder(key);

      this.logger.debug('Cache set', { key, size, expiresAt: new Date(expiresAt).toISOString() });

    } catch (error: any) {
      this.logger.error('Cache set failed', { error: error.message, key });
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.removeFromAccessOrder(key);
        this.logger.debug('Cache entry deleted', { key });
      }
      return deleted;

    } catch (error: any) {
      this.logger.error('Cache delete failed', { error: error.message, key });
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.cache.clear();
      this.accessOrder = [];
      this.logger.info('Cache cleared');

    } catch (error: any) {
      this.logger.error('Cache clear failed', { error: error.message });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    enabled: boolean;
    size: number;
    maxSize: number;
    hitRate?: number;
    memoryUsage?: number;
  } {
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);

    return {
      enabled: this.config.enabled,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      memoryUsage: totalSize
    };
  }

  /**
   * Health check for cache
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const stats = this.getStats();

      const isHealthy = this.config.enabled ?
        (stats.size < this.config.maxSize * 0.9) : // Less than 90% capacity
        true;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          ...stats,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    // Remove if exists
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder.shift()!; // Remove first (least recently used)
    this.cache.delete(lruKey);

    this.logger.debug('Evicted LRU cache entry', { key: lruKey });
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    if (expiredKeys.length > 0) {
      this.logger.debug('Cleaned up expired cache entries', { count: expiredKeys.length });
    }
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    try {
      // Rough estimation based on JSON serialization
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // Rough multiplier for UTF-16
    } catch {
      return 1000; // Default estimate
    }
  }
}

export default CacheManager;