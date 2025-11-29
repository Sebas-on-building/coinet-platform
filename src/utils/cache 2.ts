/**
 * A simple in-memory cache implementation with TTL support
 */

interface CacheOptions {
  /** Default Time-To-Live in milliseconds */
  defaultTTL?: number;
  /** Maximum number of items to store in the cache */
  maxItems?: number;
  /** Whether to automatically clean expired items (default: true) */
  autoCleanup?: boolean;
  /** Cleanup interval in milliseconds (default: 60000) */
  cleanupInterval?: number;
}

interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class Cache {
  private cache: Map<string, CacheItem<any>> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Create and export a default cache instance
export const defaultCache = new Cache();

// Specialized caches
export const marketDataCache = new Cache();
export const assetInfoCache = new Cache();
export const userDataCache = new Cache();

// Add type safety through wrapper functions
export function getMarketData<T>(key: string): Promise<T | null> {
  return marketDataCache.get<T>(key);
}

export function setMarketData<T>(key: string, value: T): Promise<void> {
  return marketDataCache.set(key, value, 30); // 30 seconds TTL
}

export function getAssetInfo<T>(key: string): Promise<T | null> {
  return assetInfoCache.get<T>(key);
}

export function setAssetInfo<T>(key: string, value: T): Promise<void> {
  return assetInfoCache.set(key, value, 3600); // 1 hour TTL
}

export function getUserData<T>(key: string): Promise<T | null> {
  return userDataCache.get<T>(key);
}

export function setUserData<T>(key: string, value: T): Promise<void> {
  return userDataCache.set(key, value, 300); // 5 minutes TTL
}
