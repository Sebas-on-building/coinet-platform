/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 EVIDENCE PACK — TTL CACHE                                              ║
 * ║                                                                               ║
 * ║   In-memory cache with TTL and stale-while-revalidate support.                ║
 * ║   Tracks freshness for each module.                                           ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import { emitCacheEvent } from './observability';
import { TOKEN_MODULE_CONFIG, MARKET_MODULE_CONFIG, ChainId } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;        // Unix timestamp (ms)
  ttlMs: number;
  staleWhileRevalidateMs: number;
  module: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  sets: number;
  invalidations: number;
}

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

class EvidencePackCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    sets: 0,
    invalidations: 0,
  };
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  
  constructor() {
    // Run cleanup every 5 minutes
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Build cache key for a module
   */
  buildKey(module: string, params: { chain?: ChainId; address?: string; scope?: string }): string {
    if (params.chain && params.address) {
      return `ep:${module}:${params.chain}:${params.address.toLowerCase()}`;
    }
    return `ep:${module}:${params.scope || 'default'}`;
  }

  /**
   * Get entry from cache
   * Returns { data, status } where status is 'fresh' | 'stale' | 'miss'
   */
  get<T>(
    module: string,
    params: { chain?: ChainId; address?: string; scope?: string }
  ): { data: T | null; status: 'fresh' | 'stale' | 'miss'; ageMs: number } {
    const key = this.buildKey(module, params);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      emitCacheEvent('miss', module, key);
      return { data: null, status: 'miss', ageMs: 0 };
    }

    const now = Date.now();
    const ageMs = now - entry.fetchedAt;

    // Check if fresh (within TTL)
    if (ageMs < entry.ttlMs) {
      this.stats.hits++;
      emitCacheEvent('hit', module, key, Math.floor(ageMs / 1000), Math.floor(entry.ttlMs / 1000));
      return { data: entry.data, status: 'fresh', ageMs };
    }

    // Check if stale but within SWR window
    if (ageMs < entry.staleWhileRevalidateMs) {
      this.stats.staleHits++;
      emitCacheEvent('stale', module, key, Math.floor(ageMs / 1000), Math.floor(entry.ttlMs / 1000));
      return { data: entry.data, status: 'stale', ageMs };
    }

    // Beyond SWR window, treat as miss
    this.stats.misses++;
    this.cache.delete(key);
    emitCacheEvent('miss', module, key);
    return { data: null, status: 'miss', ageMs: 0 };
  }

  /**
   * Set entry in cache
   */
  set<T>(
    module: string,
    params: { chain?: ChainId; address?: string; scope?: string },
    data: T
  ): void {
    const key = this.buildKey(module, params);
    const config = TOKEN_MODULE_CONFIG[module] || MARKET_MODULE_CONFIG[module];

    const entry: CacheEntry<T> = {
      data,
      fetchedAt: Date.now(),
      ttlMs: (config?.ttlSeconds || 60) * 1000,
      staleWhileRevalidateMs: (config?.staleWhileRevalidateSeconds || 300) * 1000,
      module,
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    emitCacheEvent('set', module, key, 0, config?.ttlSeconds);
  }

  /**
   * Invalidate specific entry
   */
  invalidate(module: string, params: { chain?: ChainId; address?: string; scope?: string }): void {
    const key = this.buildKey(module, params);
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.stats.invalidations++;
      emitCacheEvent('invalidate', module, key);
    }
  }

  /**
   * Invalidate all entries for a module
   */
  invalidateModule(module: string): void {
    const prefix = `ep:${module}:`;
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.stats.invalidations += count;
      logger.debug('🗑️ Cache module invalidated', { module, entriesRemoved: count });
    }
  }

  /**
   * Get freshness in seconds for a cached entry
   */
  getFreshnessSeconds(module: string, params: { chain?: ChainId; address?: string; scope?: string }): number {
    const key = this.buildKey(module, params);
    const entry = this.cache.get(key);
    
    if (!entry) return 0;
    
    return Math.floor((Date.now() - entry.fetchedAt) / 1000);
  }

  /**
   * Check if entry is stale
   */
  isStale(module: string, params: { chain?: ChainId; address?: string; scope?: string }): boolean {
    const { status } = this.get(module, params);
    return status === 'stale';
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('🗑️ Evidence cache cleared', { entriesRemoved: size });
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.fetchedAt;
      if (age > entry.staleWhileRevalidateMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('🧹 Evidence cache cleanup', { entriesRemoved: removed, remaining: this.cache.size });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses + this.stats.staleHits;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits + this.stats.staleHits) / total : 0,
    };
  }

  /**
   * Dispose cache (cleanup interval)
   */
  dispose(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const evidenceCache = new EvidencePackCache();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get cached module data with type safety
 */
export function getCachedModuleData<T>(
  module: string,
  chain?: ChainId,
  address?: string,
  scope?: string
): { data: T | null; status: 'fresh' | 'stale' | 'miss'; freshnessSeconds: number } {
  const result = evidenceCache.get<T>(module, { chain, address, scope });
  return {
    data: result.data,
    status: result.status,
    freshnessSeconds: Math.floor(result.ageMs / 1000),
  };
}

/**
 * Set cached module data
 */
export function setCachedModuleData<T>(
  module: string,
  data: T,
  chain?: ChainId,
  address?: string,
  scope?: string
): void {
  evidenceCache.set(module, { chain, address, scope }, data);
}

/**
 * Invalidate specific cache entry
 */
export function invalidateCacheEntry(
  module: string,
  chain?: ChainId,
  address?: string,
  scope?: string
): void {
  evidenceCache.invalidate(module, { chain, address, scope });
}
