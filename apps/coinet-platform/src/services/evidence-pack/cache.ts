/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 EVIDENCE PACK CACHE — TTL Cache with Dogpile Protection                ║
 * ║                                                                               ║
 * ║   Implements caching for Evidence Pack modules with:                          ║
 * ║   - TTL-based expiration per module                                           ║
 * ║   - LRU eviction when at capacity                                             ║
 * ║   - Dogpile protection (single-flight) for concurrent requests                ║
 * ║   - Freshness tracking via cached_at_unix                                     ║
 * ║                                                                               ║
 * ║   KEY FORMAT: module:chain:address:timeframe                                  ║
 * ║   MARKET KEY: module:market:timeframe                                         ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import { MODULE_TTL_SECONDS } from './types';

// ============================================================================
// CACHE STORE INTERFACE
// ============================================================================

export interface CachedValue<T> {
  value: T;
  cached_at_unix: number;
  ttl_seconds: number;
}

export interface CacheStore {
  /**
   * Get a cached value by key.
   * Returns null if not found or expired.
   */
  get<T>(key: string): Promise<CachedValue<T> | null>;

  /**
   * Set a cached value with TTL.
   */
  set<T>(key: string, value: T, ttl_seconds: number): Promise<void>;

  /**
   * Delete a cached value.
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cached values.
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics.
   */
  stats(): CacheStats;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

// ============================================================================
// LRU NODE
// ============================================================================

interface LRUNode<T> {
  key: string;
  value: T;
  cached_at_unix: number;
  ttl_seconds: number;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

// ============================================================================
// IN-MEMORY LRU CACHE
// ============================================================================

export class InMemoryLRUCache implements CacheStore {
  private cache: Map<string, LRUNode<any>> = new Map();
  private head: LRUNode<any> | null = null;
  private tail: LRUNode<any> | null = null;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async get<T>(key: string): Promise<CachedValue<T> | null> {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      return null;
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    const age = now - node.cached_at_unix;

    if (age > node.ttl_seconds) {
      // Expired - remove from cache
      this.removeNode(node);
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to head (most recently used)
    this.moveToHead(node);
    this.hits++;

    return {
      value: node.value,
      cached_at_unix: node.cached_at_unix,
      ttl_seconds: node.ttl_seconds,
    };
  }

  async set<T>(key: string, value: T, ttl_seconds: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    // Check if key exists
    const existing = this.cache.get(key);
    if (existing) {
      // Update existing
      existing.value = value;
      existing.cached_at_unix = now;
      existing.ttl_seconds = ttl_seconds;
      this.moveToHead(existing);
      return;
    }

    // Create new node
    const node: LRUNode<T> = {
      key,
      value,
      cached_at_unix: now,
      ttl_seconds,
      prev: null,
      next: null,
    };

    // Add to head
    this.addToHead(node);
    this.cache.set(key, node);

    // Evict if over capacity
    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  async delete(key: string): Promise<void> {
    const node = this.cache.get(key);
    if (node) {
      this.removeNode(node);
      this.cache.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  // LRU helpers

  private addToHead(node: LRUNode<any>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<any>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: LRUNode<any>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private evictLRU(): void {
    if (!this.tail) return;

    const key = this.tail.key;
    this.removeNode(this.tail);
    this.cache.delete(key);

    logger.debug('Cache: Evicted LRU entry', { key });
  }
}

// ============================================================================
// DOGPILE PROTECTION (SINGLE-FLIGHT)
// ============================================================================

type InflightPromise<T> = Promise<T>;

export class SingleFlight {
  private inflight: Map<string, InflightPromise<any>> = new Map();

  /**
   * Execute a function with dogpile protection.
   * If the same key is already being fetched, return the in-flight promise.
   */
  async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if already in-flight
    const existing = this.inflight.get(key);
    if (existing) {
      logger.debug('SingleFlight: Reusing in-flight request', { key });
      return existing as Promise<T>;
    }

    // Create new promise
    const promise = fn().finally(() => {
      // Remove from in-flight when done
      this.inflight.delete(key);
    });

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Check if a key is currently in-flight.
   */
  isInflight(key: string): boolean {
    return this.inflight.has(key);
  }

  /**
   * Get count of in-flight requests.
   */
  inflightCount(): number {
    return this.inflight.size;
  }
}

// ============================================================================
// CACHE KEY BUILDER
// ============================================================================

export interface CacheKeyParams {
  module: string;
  chain?: string;
  address?: string | null;
  symbol?: string;
  timeframe?: string;
}

/**
 * Build a cache key from parameters.
 * Format: module:chain:address:timeframe (token)
 *         module:market:timeframe (market)
 */
export function buildCacheKey(params: CacheKeyParams): string {
  const { module, chain, address, symbol, timeframe = 'snapshot' } = params;

  // Market-level modules
  if (module === 'market_snapshot') {
    return `${module}:market:${timeframe}`;
  }

  // Token-level modules
  if (address) {
    return `${module}:${chain || 'unknown'}:${address}:${timeframe}`;
  }

  // Symbol-based (for majors without address)
  if (symbol) {
    return `${module}:${chain || 'unknown'}:${symbol.toLowerCase()}:${timeframe}`;
  }

  // Fallback
  return `${module}:unknown:unknown:${timeframe}`;
}

/**
 * Parse a cache key into its components.
 */
export function parseCacheKey(key: string): CacheKeyParams {
  const parts = key.split(':');
  return {
    module: parts[0],
    chain: parts[1] !== 'market' ? parts[1] : undefined,
    address: parts[2] !== 'unknown' ? parts[2] : undefined,
    timeframe: parts[3] || 'snapshot',
  };
}

// ============================================================================
// CACHED MODULE FETCHER
// ============================================================================

export interface CachedFetcherOptions {
  cache: CacheStore;
  singleFlight: SingleFlight;
  ttlOverrides?: Record<string, number>;
}

/**
 * Create a cached version of a module fetcher.
 */
export function createCachedFetcher<TParams, TResult>(
  moduleName: string,
  fetcher: (params: TParams) => Promise<TResult>,
  keyBuilder: (params: TParams) => CacheKeyParams,
  options: CachedFetcherOptions
): (params: TParams) => Promise<{ data: TResult; fromCache: boolean; freshnessSeconds: number }> {
  const { cache, singleFlight, ttlOverrides } = options;

  return async (params: TParams) => {
    const keyParams = keyBuilder(params);
    const cacheKey = buildCacheKey(keyParams);
    const ttl = ttlOverrides?.[moduleName] || MODULE_TTL_SECONDS[moduleName] || 300;

    // Check cache first
    const cached = await cache.get<TResult>(cacheKey);
    if (cached) {
      const freshnessSeconds = Math.floor(Date.now() / 1000) - cached.cached_at_unix;
      logger.debug('Cache hit', { module: moduleName, key: cacheKey, freshnessSeconds });
      return {
        data: cached.value,
        fromCache: true,
        freshnessSeconds,
      };
    }

    // Use single-flight to prevent dogpile
    const result = await singleFlight.do(cacheKey, async () => {
      const data = await fetcher(params);
      await cache.set(cacheKey, data, ttl);
      return data;
    });

    return {
      data: result,
      fromCache: false,
      freshnessSeconds: 0,
    };
  };
}

// ============================================================================
// GLOBAL CACHE INSTANCE
// ============================================================================

let globalCache: CacheStore | null = null;
let globalSingleFlight: SingleFlight | null = null;

/**
 * Initialize the global cache.
 */
export function initializeCache(options?: { maxSize?: number }): void {
  globalCache = new InMemoryLRUCache(options?.maxSize || 1000);
  globalSingleFlight = new SingleFlight();
  logger.info('Evidence Pack cache initialized', { maxSize: options?.maxSize || 1000 });
}

/**
 * Get the global cache instance.
 */
export function getCache(): CacheStore {
  if (!globalCache) {
    // Auto-initialize with defaults
    initializeCache();
  }
  return globalCache!;
}

/**
 * Get the global single-flight instance.
 */
export function getSingleFlight(): SingleFlight {
  if (!globalSingleFlight) {
    // Auto-initialize with defaults
    initializeCache();
  }
  return globalSingleFlight!;
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): CacheStats {
  return getCache().stats();
}

/**
 * Clear the cache.
 */
export async function clearCache(): Promise<void> {
  await getCache().clear();
  logger.info('Evidence Pack cache cleared');
}

// ============================================================================
// REDIS CACHE ADAPTER (PLACEHOLDER)
// ============================================================================

/**
 * Redis cache adapter for production multi-instance deployments.
 * Implements the same CacheStore interface.
 * 
 * TODO: Implement when moving to horizontal scaling.
 */
export class RedisCacheAdapter implements CacheStore {
  private redisUrl: string;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    logger.warn('RedisCacheAdapter is a placeholder - using in-memory fallback');
  }

  async get<T>(key: string): Promise<CachedValue<T> | null> {
    // TODO: Implement Redis GET with TTL check
    // const redis = await this.getClient();
    // const data = await redis.get(key);
    // if (!data) return null;
    // const parsed = JSON.parse(data);
    // return { value: parsed.value, cached_at_unix: parsed.cached_at_unix, ttl_seconds: parsed.ttl_seconds };
    throw new Error('Redis cache not implemented');
  }

  async set<T>(key: string, value: T, ttl_seconds: number): Promise<void> {
    // TODO: Implement Redis SETEX
    // const redis = await this.getClient();
    // await redis.setex(key, ttl_seconds, JSON.stringify({ value, cached_at_unix: now, ttl_seconds }));
    throw new Error('Redis cache not implemented');
  }

  async delete(key: string): Promise<void> {
    // TODO: Implement Redis DEL
    throw new Error('Redis cache not implemented');
  }

  async clear(): Promise<void> {
    // TODO: Implement Redis FLUSHDB (careful in production!)
    throw new Error('Redis cache not implemented');
  }

  stats(): CacheStats {
    // TODO: Implement Redis INFO
    return { hits: 0, misses: 0, size: 0, maxSize: 0, hitRate: 0 };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { CacheStore, CachedValue, CacheStats };
