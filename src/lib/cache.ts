/**
 * Simple utility for caching API responses and other expensive operations
 * 
 * This implementation uses in-memory caching. In a production environment,
 * you might want to use Redis or another distributed cache system.
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * In-memory cache store
 */
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Fetch data from cache or call the fetch function if not cached or expired
 * 
 * @param key Cache key
 * @param fetchFn Function to fetch the data if not in cache
 * @param ttlSeconds Time-to-live in seconds
 * @returns The cached or freshly fetched data
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key);

  // Return cached data if it exists and hasn't expired
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  // Otherwise fetch fresh data
  const data = await fetchFn();

  // Cache the result
  memoryCache.set(key, {
    data,
    expiry: now + ttlSeconds * 1000
  });

  return data;
}

/**
 * Clear a specific item from the cache
 * 
 * @param key Cache key to clear
 */
export function clearCacheItem(key: string): void {
  memoryCache.delete(key);
}

/**
 * Clear all items from the cache
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * Clear expired items from the cache
 */
export function clearExpiredCache(): void {
  const now = Date.now();

  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiry <= now) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 * 
 * @returns Object with cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;

  for (const entry of memoryCache.values()) {
    if (entry.expiry > now) {
      validCount++;
    } else {
      expiredCount++;
    }
  }

  return {
    totalEntries: memoryCache.size,
    validEntries: validCount,
    expiredEntries: expiredCount
  };
}

// Optional: Clean up expired cache items periodically
if (typeof setInterval !== 'undefined') {
  // Only run in browser/Node, not during SSR
  setInterval(clearExpiredCache, 60 * 60 * 1000); // Clean every hour
} 