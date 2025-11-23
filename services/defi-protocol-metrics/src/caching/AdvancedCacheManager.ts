/**
 * =========================================
 * ADVANCED CACHE MANAGER
 * =========================================
 * Sophisticated caching layer with Redis support, cache warming, and intelligent invalidation
 */

import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  size: number; // Estimated size in bytes
  tags: string[]; // For tag-based invalidation
  priority: 'high' | 'medium' | 'low'; // Cache priority for eviction
}

export interface CacheConfig {
  defaultTtl: number; // Default TTL in seconds
  maxSize: number; // Max cache size in MB
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  localCache?: {
    enabled: boolean;
    maxKeys: number;
    checkperiod: number; // Cleanup interval in seconds
  };
  warmUp?: {
    enabled: boolean;
    strategies: string[]; // 'recent', 'frequent', 'important'
  };
  invalidation?: {
    strategy: 'ttl' | 'lru' | 'lfu' | 'adaptive';
    maxAge?: number;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
  averageSize: number;
  redisConnected: boolean;
  localCacheSize: number;
}

export class AdvancedCacheManager {
  private logger: Logger;
  private config: CacheConfig;
  private redisClient?: Redis;
  private localCache?: NodeCache;
  private isInitialized: boolean = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    hitRate: 0,
    memoryUsage: 0,
    keyCount: 0,
    averageSize: 0,
    redisConnected: false,
    localCacheSize: 0
  };

  // Metadata tracking
  private metadata: Map<string, Omit<CacheEntry, 'key' | 'value'>> = new Map();
  private warmUpQueue: Set<string> = new Set();
  private evictionQueue: string[] = []; // LRU tracking

  constructor(config: CacheConfig) {
    this.logger = new Logger('AdvancedCacheManager');
    this.config = {
      defaultTtl: config.defaultTtl || 300, // 5 minutes default
      maxSize: config.maxSize || 100, // 100MB max
      localCache: {
        enabled: true,
        maxKeys: 10000,
        checkperiod: 60,
        ...config.localCache
      },
      warmUp: {
        enabled: true,
        strategies: ['recent', 'frequent'],
        ...config.warmUp
      },
      invalidation: {
        strategy: 'adaptive',
        maxAge: 3600, // 1 hour max age
        ...config.invalidation
      },
      redis: config.redis
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Advanced Cache Manager...');

      // Initialize Redis if configured
      if (this.config.redis) {
        await this.initializeRedis();
      }

      // Initialize local cache
      if (this.config.localCache?.enabled) {
        await this.initializeLocalCache();
      }

      // Set up periodic tasks
      this.setupPeriodicTasks();

      this.isInitialized = true;
      this.logger.info('✅ Advanced Cache Manager initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Advanced Cache Manager', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Advanced Cache Manager...');

      // Close Redis connection
      if (this.redisClient) {
        await this.redisClient.quit();
      }

      // Close local cache
      if (this.localCache) {
        this.localCache.close();
      }

      this.isInitialized = false;
      this.logger.info('✅ Advanced Cache Manager stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop Advanced Cache Manager', error);
      throw error;
    }
  }

  /**
   * Set a value in cache with metadata tracking
   */
  async set(key: string, value: any, options: {
    ttl?: number;
    tags?: string[];
    priority?: 'high' | 'medium' | 'low';
  } = {}): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const {
        ttl = this.config.defaultTtl,
        tags = [],
        priority = 'medium'
      } = options;

      const entry: CacheEntry = {
        key,
        value,
        ttl,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        size: this.estimateSize(value),
        tags,
        priority
      };

      // Store in metadata
      this.metadata.set(key, {
        ttl,
        createdAt: entry.createdAt,
        lastAccessedAt: entry.lastAccessedAt,
        accessCount: 0,
        size: entry.size,
        tags,
        priority
      });

      // Add to eviction queue (LRU)
      this.evictionQueue.push(key);

      // Store in Redis if available
      if (this.redisClient) {
        await this.redisClient.setex(
          this.getRedisKey(key),
          ttl,
          JSON.stringify(value)
        );
      }

      // Store in local cache
      if (this.localCache) {
        this.localCache.set(key, value, ttl);
      }

      this.stats.sets++;
      this.updateStats();

      return true;

    } catch (error: any) {
      this.logger.error(`Failed to set cache key ${key}`, error);
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      let value: T | null = null;

      // Try Redis first (if available)
      if (this.redisClient) {
        const redisValue = await this.redisClient.get(this.getRedisKey(key));
        if (redisValue) {
          value = JSON.parse(redisValue);
          this.stats.hits++;
        }
      }

      // Fallback to local cache
      if (!value && this.localCache) {
        value = this.localCache.get<T>(key) || null;
        if (value) {
          this.stats.hits++;
        }
      }

      // Update metadata if found
      if (value) {
        const metadata = this.metadata.get(key);
        if (metadata) {
          metadata.lastAccessedAt = new Date();
          metadata.accessCount++;

          // Update Redis with new access info
          if (this.redisClient) {
            await this.redisClient.setex(
              this.getRedisMetadataKey(key),
              metadata.ttl,
              JSON.stringify(metadata)
            );
          }
        }

        this.updateStats();
        return value;
      }

      // Not found
      this.stats.misses++;
      this.updateStats();
      return null;

    } catch (error: any) {
      this.logger.error(`Failed to get cache key ${key}`, error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // Remove from Redis
      if (this.redisClient) {
        await this.redisClient.del(this.getRedisKey(key));
        await this.redisClient.del(this.getRedisMetadataKey(key));
      }

      // Remove from local cache
      if (this.localCache) {
        this.localCache.del(key);
      }

      // Remove from metadata
      this.metadata.delete(key);

      // Remove from eviction queue
      const index = this.evictionQueue.indexOf(key);
      if (index > -1) {
        this.evictionQueue.splice(index, 1);
      }

      this.stats.deletes++;
      this.updateStats();

      return true;

    } catch (error: any) {
      this.logger.error(`Failed to delete cache key ${key}`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // Check Redis first
      if (this.redisClient) {
        const exists = await this.redisClient.exists(this.getRedisKey(key));
        if (exists) return true;
      }

      // Check local cache
      if (this.localCache) {
        return this.localCache.has(key);
      }

      return false;

    } catch (error: any) {
      this.logger.error(`Failed to check cache key ${key}`, error);
      return false;
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isInitialized) {
      return 0;
    }

    try {
      let deletedCount = 0;

      for (const [key, metadata] of this.metadata.entries()) {
        if (metadata.tags.some(tag => tags.includes(tag))) {
          await this.del(key);
          deletedCount++;
        }
      }

      this.logger.info(`Invalidated ${deletedCount} cache entries by tags: ${tags.join(', ')}`);
      return deletedCount;

    } catch (error: any) {
      this.logger.error(`Failed to invalidate cache by tags ${tags.join(', ')}`, error);
      return 0;
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(keys: string[]): Promise<number> {
    if (!this.isInitialized || !this.config.warmUp?.enabled) {
      return 0;
    }

    try {
      let warmedCount = 0;

      for (const key of keys) {
        // Check if key needs warming
        if (!await this.has(key)) {
          this.warmUpQueue.add(key);
          warmedCount++;
        }
      }

      this.logger.info(`Queued ${warmedCount} keys for cache warming`);
      return warmedCount;

    } catch (error: any) {
      this.logger.error('Failed to warm up cache', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache metadata for a key
   */
  getMetadata(key: string): Omit<CacheEntry, 'key' | 'value'> | null {
    return this.metadata.get(key) || null;
  }

  /**
   * Get all cache keys with metadata
   */
  getAllKeys(): string[] {
    return Array.from(this.metadata.keys());
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // Clear Redis
      if (this.redisClient) {
        const keys = await this.redisClient.keys(`${this.config.redis?.keyPrefix || 'defi:'}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }

      // Clear local cache
      if (this.localCache) {
        this.localCache.flushAll();
      }

      // Clear metadata
      this.metadata.clear();
      this.evictionQueue.length = 0;
      this.warmUpQueue.clear();

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        hitRate: 0,
        memoryUsage: 0,
        keyCount: 0,
        averageSize: 0,
        redisConnected: this.redisClient?.status === 'ready',
        localCacheSize: 0
      };

      this.logger.info('Cache cleared successfully');
      return true;

    } catch (error: any) {
      this.logger.error('Failed to clear cache', error);
      return false;
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisConfig = this.config.redis!;

      this.redisClient = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db || 0,
        keyPrefix: redisConfig.keyPrefix || 'defi:'
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        this.redisClient!.on('ready', () => {
          this.stats.redisConnected = true;
          resolve();
        });

        this.redisClient!.on('error', (error) => {
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 10000);
      });

      this.logger.info('✅ Redis cache initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Redis cache', error);
      throw error;
    }
  }

  private async initializeLocalCache(): Promise<void> {
    try {
      const localConfig = this.config.localCache!;

      this.localCache = new NodeCache({
        stdTTL: this.config.defaultTtl,
        checkperiod: localConfig.checkperiod,
        maxKeys: localConfig.maxKeys,
        useClones: false
      });

      this.logger.info('✅ Local cache initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize local cache', error);
      throw error;
    }
  }

  private setupPeriodicTasks(): void {
    // Periodic cache cleanup and maintenance
    setInterval(() => {
      this.performMaintenance();
    }, 30000); // Every 30 seconds

    // Warm up cache periodically
    setInterval(() => {
      this.performWarmUp();
    }, 60000); // Every minute
  }

  private performMaintenance(): void {
    try {
      // Clean up expired metadata
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, metadata] of this.metadata.entries()) {
        const age = now - metadata.createdAt.getTime();
        if (age > (metadata.ttl * 1000)) {
          expiredKeys.push(key);
        }
      }

      // Remove expired entries
      expiredKeys.forEach(key => {
        this.metadata.delete(key);
        const index = this.evictionQueue.indexOf(key);
        if (index > -1) {
          this.evictionQueue.splice(index, 1);
        }
      });

      if (expiredKeys.length > 0) {
        this.logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }

      // Evict least recently used items if memory usage is high
      this.performEviction();

    } catch (error: any) {
      this.logger.error('Failed to perform cache maintenance', error);
    }
  }

  private performEviction(): void {
    try {
      // Calculate current memory usage
      let totalSize = 0;
      for (const metadata of this.metadata.values()) {
        totalSize += metadata.size;
      }

      // Convert to MB
      const memoryUsageMB = totalSize / (1024 * 1024);

      if (memoryUsageMB > this.config.maxSize) {
        // Need to evict items
        const itemsToEvict = Math.ceil((memoryUsageMB - this.config.maxSize) / (this.stats.averageSize || 1));

        for (let i = 0; i < itemsToEvict && this.evictionQueue.length > 0; i++) {
          const keyToEvict = this.evictionQueue.shift()!;
          this.del(keyToEvict);
          this.stats.evictions++;
        }

        this.logger.info(`Evicted ${itemsToEvict} cache entries due to memory pressure`);
      }
    } catch (error: any) {
      this.logger.error('Failed to perform cache eviction', error);
    }
  }

  private async performWarmUp(): Promise<void> {
    try {
      if (this.warmUpQueue.size === 0) return;

      // Process warm-up queue in batches
      const keysToWarm = Array.from(this.warmUpQueue).slice(0, 10);
      this.warmUpQueue = new Set(Array.from(this.warmUpQueue).slice(10));

      // Here you would implement actual data fetching logic
      // For now, just log the keys that need warming
      if (keysToWarm.length > 0) {
        this.logger.debug(`Cache warming needed for keys: ${keysToWarm.join(', ')}`);
      }

    } catch (error: any) {
      this.logger.error('Failed to perform cache warm-up', error);
    }
  }

  private estimateSize(value: any): number {
    // Rough size estimation in bytes
    return JSON.stringify(value).length * 2; // Account for object overhead
  }

  private getRedisKey(key: string): string {
    return `${this.config.redis?.keyPrefix || 'defi:'}data:${key}`;
  }

  private getRedisMetadataKey(key: string): string {
    return `${this.config.redis?.keyPrefix || 'defi:'}meta:${key}`;
  }

  private updateStats(): void {
    this.stats.keyCount = this.metadata.size;

    // Calculate average size
    if (this.metadata.size > 0) {
      let totalSize = 0;
      for (const metadata of this.metadata.values()) {
        totalSize += metadata.size;
      }
      this.stats.averageSize = totalSize / this.metadata.size;
    }

    // Calculate hit rate
    const totalRequests = this.stats.hits + this.stats.misses;
    if (totalRequests > 0) {
      this.stats.hitRate = this.stats.hits / totalRequests;
    }

    // Update memory usage
    this.stats.memoryUsage = this.stats.averageSize * this.stats.keyCount;

    // Update local cache size
    if (this.localCache) {
      this.stats.localCacheSize = this.localCache.getStats()?.keys || 0;
    }
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
