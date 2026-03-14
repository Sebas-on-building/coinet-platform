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
  
  // Market-level keys: module:market:timeframe (3 parts)
  // Token-level keys: module:chain:address:timeframe (4 parts)
  if (parts[1] === 'market') {
    return {
      module: parts[0],
      chain: undefined,
      address: undefined,
      timeframe: parts[2] || 'snapshot',
    };
  }
  
  return {
    module: parts[0],
    chain: parts[1],
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
 * Uses TwoTierCache (L1 memory + L2 Redis) when Redis is configured,
 * otherwise falls back to InMemoryLRUCache.
 */
export function initializeCache(options?: { maxSize?: number; useRedis?: boolean }): void {
  const maxSize = options?.maxSize ?? 1000;
  const shouldUseRedis = options?.useRedis ?? isRedisAvailable();

  if (shouldUseRedis) {
    globalCache = new TwoTierCache(maxSize);
    logger.info('Evidence Pack cache initialized (L1 memory + L2 Redis)', { maxSize });
  } else {
    globalCache = new InMemoryLRUCache(maxSize);
    logger.info('Evidence Pack cache initialized (in-memory only)', { maxSize });
  }
  globalSingleFlight = new SingleFlight();
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
// REDIS CACHE ADAPTER
// ============================================================================

import { getRedisClient, isRedisAvailable } from '../redis-client';
import type Redis from 'ioredis';

const EP_CACHE_PREFIX = 'ep:';

interface RedisStoredEntry<T> {
  v: T;
  ca: number; // cached_at_unix
  ttl: number; // ttl_seconds
}

/**
 * Redis-backed cache adapter for production multi-instance deployments.
 * Falls back gracefully to returning null/no-op when Redis is unavailable —
 * callers should pair this with an InMemoryLRUCache as L1.
 */
export class RedisCacheAdapter implements CacheStore {
  private hits = 0;
  private misses = 0;
  private prefix: string;

  constructor(prefix: string = EP_CACHE_PREFIX) {
    this.prefix = prefix;
  }

  private client(): Redis | null {
    return getRedisClient();
  }

  private key(raw: string): string {
    return `${this.prefix}${raw}`;
  }

  async get<T>(key: string): Promise<CachedValue<T> | null> {
    const redis = this.client();
    if (!redis) { this.misses++; return null; }

    try {
      const raw = await redis.get(this.key(key));
      if (!raw) { this.misses++; return null; }

      const entry: RedisStoredEntry<T> = JSON.parse(raw);
      const now = Math.floor(Date.now() / 1000);
      const age = now - entry.ca;

      if (age > entry.ttl) {
        await redis.del(this.key(key)).catch(() => {});
        this.misses++;
        return null;
      }

      this.hits++;
      return { value: entry.v, cached_at_unix: entry.ca, ttl_seconds: entry.ttl };
    } catch (err) {
      logger.warn('RedisCacheAdapter.get failed', { key, error: (err as Error).message });
      this.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl_seconds: number): Promise<void> {
    const redis = this.client();
    if (!redis) return;

    const now = Math.floor(Date.now() / 1000);
    const entry: RedisStoredEntry<T> = { v: value, ca: now, ttl: ttl_seconds };

    try {
      await redis.setex(this.key(key), ttl_seconds, JSON.stringify(entry));
    } catch (err) {
      logger.warn('RedisCacheAdapter.set failed', { key, error: (err as Error).message });
    }
  }

  async delete(key: string): Promise<void> {
    const redis = this.client();
    if (!redis) return;

    try {
      await redis.del(this.key(key));
    } catch (err) {
      logger.warn('RedisCacheAdapter.del failed', { key, error: (err as Error).message });
    }
  }

  async clear(): Promise<void> {
    const redis = this.client();
    if (!redis) return;

    try {
      const stream = redis.scanStream({ match: `${this.prefix}*`, count: 200 });
      const pipeline = redis.pipeline();
      let count = 0;

      for await (const keys of stream) {
        for (const k of keys as string[]) {
          pipeline.del(k);
          count++;
        }
      }

      if (count > 0) {
        await pipeline.exec();
        logger.info('RedisCacheAdapter: cleared entries', { count });
      }
    } catch (err) {
      logger.warn('RedisCacheAdapter.clear failed', { error: (err as Error).message });
    }
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: -1, // Redis size not tracked locally; use Redis INFO
      maxSize: -1,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

// ============================================================================
// TWO-TIER CACHE (L1 in-memory + L2 Redis)
// ============================================================================

/**
 * Two-tier cache combining fast in-memory L1 with shared Redis L2.
 * Reads check L1 first; on miss, check L2 and promote to L1.
 * Writes go to both tiers.
 */
export class TwoTierCache implements CacheStore {
  private l1: InMemoryLRUCache;
  private l2: RedisCacheAdapter;

  constructor(l1MaxSize: number = 1000) {
    this.l1 = new InMemoryLRUCache(l1MaxSize);
    this.l2 = new RedisCacheAdapter();
  }

  async get<T>(key: string): Promise<CachedValue<T> | null> {
    const l1Hit = await this.l1.get<T>(key);
    if (l1Hit) return l1Hit;

    const l2Hit = await this.l2.get<T>(key);
    if (l2Hit) {
      const remainingTtl = l2Hit.ttl_seconds - (Math.floor(Date.now() / 1000) - l2Hit.cached_at_unix);
      if (remainingTtl > 0) {
        await this.l1.set(key, l2Hit.value, remainingTtl);
      }
      return l2Hit;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl_seconds: number): Promise<void> {
    await Promise.all([
      this.l1.set(key, value, ttl_seconds),
      this.l2.set(key, value, ttl_seconds),
    ]);
  }

  async delete(key: string): Promise<void> {
    await Promise.all([this.l1.delete(key), this.l2.delete(key)]);
  }

  async clear(): Promise<void> {
    await Promise.all([this.l1.clear(), this.l2.clear()]);
  }

  stats(): CacheStats {
    const l1Stats = this.l1.stats();
    const l2Stats = this.l2.stats();
    return {
      hits: l1Stats.hits + l2Stats.hits,
      misses: l2Stats.misses,
      size: l1Stats.size,
      maxSize: l1Stats.maxSize,
      hitRate: (l1Stats.hits + l2Stats.hits) / Math.max(1, l1Stats.hits + l2Stats.hits + l2Stats.misses),
    };
  }
}
