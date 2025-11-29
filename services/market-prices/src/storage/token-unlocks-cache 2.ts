/**
 * Token Unlocks Cache Service
 * Divine world-class caching strategy for token unlock data
 * 
 * Features:
 * - Multi-layer caching (in-memory + Redis)
 * - Intelligent TTL based on unlock proximity
 * - Automatic invalidation on updates
 * - Batch operations for performance
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import {
  NormalizedTokenUnlock,
  TokenUnlockAlert,
  MessariUnlockEvent,
  MessariVestingSchedule,
  MessariTokenomicsData,
} from '../types/messari.types';

export interface UnlocksCacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  defaultTTL: number; // Default TTL in seconds
  nearTermThreshold: number; // Days to consider "near-term"
  nearTermTTL: number; // TTL for near-term unlocks (shorter)
}

export class TokenUnlocksCache {
  private redis: Redis;
  private config: UnlocksCacheConfig;
  private memoryCache: Map<string, { data: any; expiry: number }>;
  private readonly CACHE_PREFIX = 'token_unlocks:';
  private readonly MEMORY_CACHE_SIZE = 10000;

  constructor(config: UnlocksCacheConfig) {
    this.config = config;
    this.memoryCache = new Map();

    // Initialize Redis connection
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      logger.error('Token unlocks cache Redis error', { error: error.message });
    });

    this.redis.on('connect', () => {
      logger.info('Token unlocks cache connected to Redis');
    });

    // Clean up memory cache periodically
    setInterval(() => this.cleanMemoryCache(), 60000); // Every minute
  }

  /**
   * Get cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Calculate TTL based on unlock proximity
   */
  private calculateTTL(unlockDate: Date): number {
    const daysUntil = Math.ceil(
      (unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil <= this.config.nearTermThreshold) {
      return this.config.nearTermTTL; // Shorter TTL for near-term unlocks
    }

    // Longer TTL for far-future unlocks
    return this.config.defaultTTL;
  }

  /**
   * Cache a single unlock event
   */
  async cacheUnlock(unlock: NormalizedTokenUnlock): Promise<void> {
    try {
      const key = this.getKey(`unlock:${unlock.id}`);
      const ttl = this.calculateTTL(unlock.unlockDate);
      const data = JSON.stringify(unlock);

      // Store in Redis
      await this.redis.setex(key, ttl, data);

      // Store in memory cache
      this.setMemoryCache(key, unlock, ttl);

      logger.debug('Cached unlock event', {
        id: unlock.id,
        symbol: unlock.symbol,
        ttl,
      });
    } catch (error) {
      logger.error('Failed to cache unlock', { error, unlock });
    }
  }

  /**
   * Cache multiple unlock events
   */
  async cacheUnlocks(unlocks: NormalizedTokenUnlock[]): Promise<void> {
    try {
      if (unlocks.length === 0) return;

      const pipeline = this.redis.pipeline();

      for (const unlock of unlocks) {
        const key = this.getKey(`unlock:${unlock.id}`);
        const ttl = this.calculateTTL(unlock.unlockDate);
        const data = JSON.stringify(unlock);

        pipeline.setex(key, ttl, data);
        this.setMemoryCache(key, unlock, ttl);
      }

      await pipeline.exec();

      logger.info('Cached multiple unlock events', { count: unlocks.length });
    } catch (error) {
      logger.error('Failed to cache unlocks', { error, count: unlocks.length });
    }
  }

  /**
   * Get cached unlock by ID
   */
  async getUnlock(unlockId: string): Promise<NormalizedTokenUnlock | null> {
    try {
      const key = this.getKey(`unlock:${unlockId}`);

      // Try memory cache first
      const memCached = this.getMemoryCache(key);
      if (memCached) {
        return memCached as NormalizedTokenUnlock;
      }

      // Try Redis
      const data = await this.redis.get(key);
      if (!data) return null;

      const unlock = JSON.parse(data) as NormalizedTokenUnlock;

      // Restore Date objects
      unlock.unlockDate = new Date(unlock.unlockDate);
      unlock.createdAt = new Date(unlock.createdAt);
      unlock.updatedAt = new Date(unlock.updatedAt);

      // Update memory cache
      const ttl = this.calculateTTL(unlock.unlockDate);
      this.setMemoryCache(key, unlock, ttl);

      return unlock;
    } catch (error) {
      logger.error('Failed to get cached unlock', { error, unlockId });
      return null;
    }
  }

  /**
   * Cache upcoming unlocks for a symbol
   */
  async cacheUpcomingUnlocksBySymbol(
    symbol: string,
    unlocks: NormalizedTokenUnlock[]
  ): Promise<void> {
    try {
      const key = this.getKey(`upcoming:${symbol}`);
      const data = JSON.stringify(unlocks);

      // Use shortest TTL from all unlocks
      const ttls = unlocks.map((u) => this.calculateTTL(u.unlockDate));
      const minTTL = Math.min(...ttls, this.config.defaultTTL);

      await this.redis.setex(key, minTTL, data);
      this.setMemoryCache(key, unlocks, minTTL);

      logger.debug('Cached upcoming unlocks by symbol', {
        symbol,
        count: unlocks.length,
        ttl: minTTL,
      });
    } catch (error) {
      logger.error('Failed to cache upcoming unlocks by symbol', {
        error,
        symbol,
      });
    }
  }

  /**
   * Get cached upcoming unlocks for a symbol
   */
  async getUpcomingUnlocksBySymbol(
    symbol: string
  ): Promise<NormalizedTokenUnlock[] | null> {
    try {
      const key = this.getKey(`upcoming:${symbol}`);

      // Try memory cache first
      const memCached = this.getMemoryCache(key);
      if (memCached) {
        return memCached as NormalizedTokenUnlock[];
      }

      // Try Redis
      const data = await this.redis.get(key);
      if (!data) return null;

      const unlocks = JSON.parse(data) as NormalizedTokenUnlock[];

      // Restore Date objects
      unlocks.forEach((unlock) => {
        unlock.unlockDate = new Date(unlock.unlockDate);
        unlock.createdAt = new Date(unlock.createdAt);
        unlock.updatedAt = new Date(unlock.updatedAt);
      });

      // Update memory cache
      this.setMemoryCache(key, unlocks, this.config.defaultTTL);

      return unlocks;
    } catch (error) {
      logger.error('Failed to get cached upcoming unlocks', { error, symbol });
      return null;
    }
  }

  /**
   * Cache all upcoming unlocks (global)
   */
  async cacheAllUpcomingUnlocks(
    unlocks: NormalizedTokenUnlock[]
  ): Promise<void> {
    try {
      const key = this.getKey('all_upcoming');
      const data = JSON.stringify(unlocks);

      // Calculate minimum TTL from near-term unlocks
      const nearTermUnlocks = unlocks.filter((u) => {
        const daysUntil = Math.ceil(
          (u.unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil <= this.config.nearTermThreshold;
      });

      const ttl =
        nearTermUnlocks.length > 0
          ? this.config.nearTermTTL
          : this.config.defaultTTL;

      await this.redis.setex(key, ttl, data);
      this.setMemoryCache(key, unlocks, ttl);

      logger.info('Cached all upcoming unlocks', {
        count: unlocks.length,
        nearTerm: nearTermUnlocks.length,
        ttl,
      });
    } catch (error) {
      logger.error('Failed to cache all upcoming unlocks', { error });
    }
  }

  /**
   * Get all cached upcoming unlocks
   */
  async getAllUpcomingUnlocks(): Promise<NormalizedTokenUnlock[] | null> {
    try {
      const key = this.getKey('all_upcoming');

      // Try memory cache first
      const memCached = this.getMemoryCache(key);
      if (memCached) {
        return memCached as NormalizedTokenUnlock[];
      }

      // Try Redis
      const data = await this.redis.get(key);
      if (!data) return null;

      const unlocks = JSON.parse(data) as NormalizedTokenUnlock[];

      // Restore Date objects
      unlocks.forEach((unlock) => {
        unlock.unlockDate = new Date(unlock.unlockDate);
        unlock.createdAt = new Date(unlock.createdAt);
        unlock.updatedAt = new Date(unlock.updatedAt);
      });

      // Update memory cache
      this.setMemoryCache(key, unlocks, this.config.defaultTTL);

      return unlocks;
    } catch (error) {
      logger.error('Failed to get all cached upcoming unlocks', { error });
      return null;
    }
  }

  /**
   * Cache tokenomics data for an asset
   */
  async cacheTokenomics(
    symbol: string,
    tokenomics: MessariTokenomicsData
  ): Promise<void> {
    try {
      const key = this.getKey(`tokenomics:${symbol}`);
      const data = JSON.stringify(tokenomics);

      await this.redis.setex(key, this.config.defaultTTL, data);
      this.setMemoryCache(key, tokenomics, this.config.defaultTTL);

      logger.debug('Cached tokenomics data', { symbol });
    } catch (error) {
      logger.error('Failed to cache tokenomics', { error, symbol });
    }
  }

  /**
   * Get cached tokenomics data
   */
  async getTokenomics(symbol: string): Promise<MessariTokenomicsData | null> {
    try {
      const key = this.getKey(`tokenomics:${symbol}`);

      // Try memory cache first
      const memCached = this.getMemoryCache(key);
      if (memCached) {
        return memCached as MessariTokenomicsData;
      }

      // Try Redis
      const data = await this.redis.get(key);
      if (!data) return null;

      const tokenomics = JSON.parse(data) as MessariTokenomicsData;

      // Update memory cache
      this.setMemoryCache(key, tokenomics, this.config.defaultTTL);

      return tokenomics;
    } catch (error) {
      logger.error('Failed to get cached tokenomics', { error, symbol });
      return null;
    }
  }

  /**
   * Cache unlock alerts
   */
  async cacheAlerts(alerts: TokenUnlockAlert[]): Promise<void> {
    try {
      const key = this.getKey('alerts');
      const data = JSON.stringify(alerts);

      // Alerts should have short TTL as they're time-sensitive
      await this.redis.setex(key, this.config.nearTermTTL, data);
      this.setMemoryCache(key, alerts, this.config.nearTermTTL);

      logger.info('Cached unlock alerts', { count: alerts.length });
    } catch (error) {
      logger.error('Failed to cache alerts', { error });
    }
  }

  /**
   * Get cached alerts
   */
  async getAlerts(): Promise<TokenUnlockAlert[] | null> {
    try {
      const key = this.getKey('alerts');

      // Try memory cache first
      const memCached = this.getMemoryCache(key);
      if (memCached) {
        return memCached as TokenUnlockAlert[];
      }

      // Try Redis
      const data = await this.redis.get(key);
      if (!data) return null;

      const alerts = JSON.parse(data) as TokenUnlockAlert[];

      // Update memory cache
      this.setMemoryCache(key, alerts, this.config.nearTermTTL);

      return alerts;
    } catch (error) {
      logger.error('Failed to get cached alerts', { error });
      return null;
    }
  }

  /**
   * Invalidate cache for a specific symbol
   */
  async invalidateSymbol(symbol: string): Promise<void> {
    try {
      const keys = [
        this.getKey(`upcoming:${symbol}`),
        this.getKey(`tokenomics:${symbol}`),
      ];

      const pipeline = this.redis.pipeline();
      for (const key of keys) {
        pipeline.del(key);
        this.memoryCache.delete(key);
      }

      await pipeline.exec();

      logger.info('Invalidated cache for symbol', { symbol });
    } catch (error) {
      logger.error('Failed to invalidate cache', { error, symbol });
    }
  }

  /**
   * Invalidate all upcoming unlocks cache
   */
  async invalidateAllUpcoming(): Promise<void> {
    try {
      const key = this.getKey('all_upcoming');
      await this.redis.del(key);
      this.memoryCache.delete(key);

      logger.info('Invalidated all upcoming unlocks cache');
    } catch (error) {
      logger.error('Failed to invalidate all upcoming cache', { error });
    }
  }

  /**
   * Memory cache operations
   */
  private setMemoryCache(key: string, data: any, ttlSeconds: number): void {
    // Prevent memory cache from growing too large
    if (this.memoryCache.size >= this.MEMORY_CACHE_SIZE) {
      this.cleanMemoryCache();
    }

    const expiry = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { data, expiry });
  }

  private getMemoryCache(key: string): any | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private cleanMemoryCache(): void {
    const now = Date.now();
    let removed = 0;

    const entries = Array.from(this.memoryCache.entries());
    for (const [key, value] of entries) {
      if (now > value.expiry) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cleaned memory cache', {
        removed,
        remaining: this.memoryCache.size,
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryCacheSize: number;
    redisKeys: number;
    redisMemory: string;
  }> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      const info = await this.redis.info('memory');

      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const redisMemory = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        memoryCacheSize: this.memoryCache.size,
        redisKeys: keys.length,
        redisMemory,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error });
      return {
        memoryCacheSize: this.memoryCache.size,
        redisKeys: 0,
        redisMemory: 'error',
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Token unlocks cache health check failed', { error });
      return false;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      this.memoryCache.clear();
      logger.info('Token unlocks cache closed');
    } catch (error) {
      logger.error('Error closing token unlocks cache', { error });
    }
  }
}

export default TokenUnlocksCache;

