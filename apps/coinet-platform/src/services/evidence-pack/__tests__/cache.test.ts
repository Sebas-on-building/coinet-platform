/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 CACHE TEST SUITE — TTL, LRU, and Dogpile Protection                    ║
 * ║                                                                               ║
 * ║   Tests for caching correctness:                                              ║
 * ║   - TTL expiration                                                            ║
 * ║   - LRU eviction                                                              ║
 * ║   - Dogpile protection                                                        ║
 * ║   - Cache never changes factual outputs                                       ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  InMemoryLRUCache,
  SingleFlight,
  buildCacheKey,
  parseCacheKey,
  createCachedFetcher,
} from '../cache';

// ============================================================================
// LRU CACHE TESTS
// ============================================================================

describe('InMemoryLRUCache', () => {
  let cache: InMemoryLRUCache;

  beforeEach(() => {
    cache = new InMemoryLRUCache(3);  // Small size for testing
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', { value: 'test' }, 60);
      const result = await cache.get('key1');

      expect(result).not.toBeNull();
      expect(result!.value).toEqual({ value: 'test' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await cache.set('key1', 'test', 60);
      await cache.delete('key1');
      const result = await cache.get('key1');

      expect(result).toBeNull();
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'test1', 60);
      await cache.set('key2', 'test2', 60);
      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('TTL Expiration', () => {
    it('should return null for expired values', async () => {
      // Set with very short TTL
      await cache.set('key1', 'test', 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await cache.get('key1');
      expect(result).toBeNull();
    });

    it('should include cached_at_unix in returned value', async () => {
      const before = Math.floor(Date.now() / 1000);
      await cache.set('key1', 'test', 60);
      const after = Math.floor(Date.now() / 1000);

      const result = await cache.get<string>('key1');

      expect(result).not.toBeNull();
      expect(result!.cached_at_unix).toBeGreaterThanOrEqual(before);
      expect(result!.cached_at_unix).toBeLessThanOrEqual(after);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used when at capacity', async () => {
      // Fill cache to capacity (maxSize = 3)
      await cache.set('key1', 'val1', 60);
      await cache.set('key2', 'val2', 60);
      await cache.set('key3', 'val3', 60);

      // Add one more (should evict key1)
      await cache.set('key4', 'val4', 60);

      expect(await cache.get('key1')).toBeNull();  // Evicted
      expect(await cache.get('key2')).not.toBeNull();
      expect(await cache.get('key3')).not.toBeNull();
      expect(await cache.get('key4')).not.toBeNull();
    });

    it('should update LRU order on access', async () => {
      // Fill cache
      await cache.set('key1', 'val1', 60);
      await cache.set('key2', 'val2', 60);
      await cache.set('key3', 'val3', 60);

      // Access key1 (moves to head)
      await cache.get('key1');

      // Add new key (should evict key2, the new LRU)
      await cache.set('key4', 'val4', 60);

      expect(await cache.get('key1')).not.toBeNull();  // Kept (recently accessed)
      expect(await cache.get('key2')).toBeNull();  // Evicted (LRU)
      expect(await cache.get('key3')).not.toBeNull();
      expect(await cache.get('key4')).not.toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'val1', 60);

      await cache.get('key1');  // Hit
      await cache.get('key1');  // Hit
      await cache.get('nonexistent');  // Miss

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should report correct size', async () => {
      expect(cache.stats().size).toBe(0);

      await cache.set('key1', 'val1', 60);
      expect(cache.stats().size).toBe(1);

      await cache.set('key2', 'val2', 60);
      expect(cache.stats().size).toBe(2);
    });
  });
});

// ============================================================================
// SINGLE-FLIGHT TESTS
// ============================================================================

describe('SingleFlight', () => {
  let singleFlight: SingleFlight;

  beforeEach(() => {
    singleFlight = new SingleFlight();
  });

  it('should prevent concurrent duplicate requests', async () => {
    let fetchCount = 0;
    const slowFetch = async () => {
      fetchCount++;
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'result';
    };

    // Start 5 concurrent requests for the same key
    const promises = [
      singleFlight.do('key1', slowFetch),
      singleFlight.do('key1', slowFetch),
      singleFlight.do('key1', slowFetch),
      singleFlight.do('key1', slowFetch),
      singleFlight.do('key1', slowFetch),
    ];

    const results = await Promise.all(promises);

    // All should get the same result
    expect(results).toEqual(['result', 'result', 'result', 'result', 'result']);

    // But only one fetch should have happened
    expect(fetchCount).toBe(1);
  });

  it('should allow different keys to run in parallel', async () => {
    let fetchCount = 0;
    const slowFetch = async (id: string) => {
      fetchCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return `result-${id}`;
    };

    const promises = [
      singleFlight.do('key1', () => slowFetch('1')),
      singleFlight.do('key2', () => slowFetch('2')),
      singleFlight.do('key3', () => slowFetch('3')),
    ];

    const results = await Promise.all(promises);

    expect(results).toEqual(['result-1', 'result-2', 'result-3']);
    expect(fetchCount).toBe(3);  // Different keys, different fetches
  });

  it('should remove from inflight after completion', async () => {
    expect(singleFlight.isInflight('key1')).toBe(false);

    const promise = singleFlight.do('key1', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'result';
    });

    expect(singleFlight.isInflight('key1')).toBe(true);

    await promise;

    expect(singleFlight.isInflight('key1')).toBe(false);
  });

  it('should handle errors without caching them', async () => {
    let callCount = 0;
    const failingFetch = async () => {
      callCount++;
      throw new Error('Fetch failed');
    };

    // First call should fail
    await expect(singleFlight.do('key1', failingFetch)).rejects.toThrow('Fetch failed');

    // Second call should also fail (not cached)
    await expect(singleFlight.do('key1', failingFetch)).rejects.toThrow('Fetch failed');

    // Both calls should have executed
    expect(callCount).toBe(2);
  });
});

// ============================================================================
// CACHE KEY TESTS
// ============================================================================

describe('Cache Key Utilities', () => {
  describe('buildCacheKey', () => {
    it('should build token-level key with address', () => {
      const key = buildCacheKey({
        module: 'dexscreener',
        chain: 'solana',
        address: 'abc123',
      });

      expect(key).toBe('dexscreener:solana:abc123:snapshot');
    });

    it('should build token-level key with symbol (for majors)', () => {
      const key = buildCacheKey({
        module: 'dexscreener',
        chain: 'bitcoin',
        symbol: 'BTC',
      });

      expect(key).toBe('dexscreener:bitcoin:btc:snapshot');
    });

    it('should build market-level key', () => {
      const key = buildCacheKey({
        module: 'market_snapshot',
        timeframe: 'today',
      });

      expect(key).toBe('market_snapshot:market:today');
    });

    it('should include timeframe', () => {
      const key = buildCacheKey({
        module: 'dexscreener',
        chain: 'ethereum',
        address: '0x123',
        timeframe: 'week',
      });

      expect(key).toBe('dexscreener:ethereum:0x123:week');
    });
  });

  describe('parseCacheKey', () => {
    it('should parse token-level key', () => {
      const parsed = parseCacheKey('dexscreener:solana:abc123:snapshot');

      expect(parsed.module).toBe('dexscreener');
      expect(parsed.chain).toBe('solana');
      expect(parsed.address).toBe('abc123');
      expect(parsed.timeframe).toBe('snapshot');
    });

    it('should parse market-level key', () => {
      const parsed = parseCacheKey('market_snapshot:market:today');

      expect(parsed.module).toBe('market_snapshot');
      expect(parsed.chain).toBeUndefined();
      expect(parsed.timeframe).toBe('today');
    });
  });
});

// ============================================================================
// SHIP CRITERIA: CACHE NEVER CHANGES FACTUAL OUTPUTS
// ============================================================================

describe('Ship Criteria: Cache Consistency', () => {
  it('cached data should be identical to original data', async () => {
    const cache = new InMemoryLRUCache(100);
    
    const originalData = {
      price_usd: 97500.123456,
      liquidity_usd: 500000000,
      volume_24h_usd: 35000000000,
      nested: {
        field1: 'value1',
        field2: 42,
      },
      array: [1, 2, 3, 'four'],
    };

    // Store
    await cache.set('test-key', originalData, 60);

    // Retrieve
    const cached = await cache.get<typeof originalData>('test-key');

    // Must be deeply equal
    expect(cached!.value).toEqual(originalData);
    
    // Specific fields
    expect(cached!.value.price_usd).toBe(97500.123456);
    expect(cached!.value.nested.field1).toBe('value1');
    expect(cached!.value.array).toEqual([1, 2, 3, 'four']);
  });

  it('multiple cache retrievals should return identical data', async () => {
    const cache = new InMemoryLRUCache(100);
    const singleFlight = new SingleFlight();

    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { timestamp: Date.now(), value: Math.random() };
    };

    // First fetch (should call fetcher)
    const key = 'consistency-test';
    const result1 = await singleFlight.do(key, fetcher);
    await cache.set(key, result1, 60);

    // Subsequent retrievals from cache
    const result2 = (await cache.get(key))!.value;
    const result3 = (await cache.get(key))!.value;
    const result4 = (await cache.get(key))!.value;

    // All should be identical
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
    expect(result3).toEqual(result4);

    // Only one fetch
    expect(fetchCount).toBe(1);
  });
});
