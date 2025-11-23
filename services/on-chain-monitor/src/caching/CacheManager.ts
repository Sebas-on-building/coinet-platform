/**
 * =========================================
 * CACHE MANAGER
 * =========================================
 * High-performance caching for transaction processing
 * and duplicate prevention
 */

import { EventEmitter } from 'events';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';

export interface CacheConfig {
  defaultTTL: number; // seconds
  maxKeys: number;
  redisUrl?: string;
  redisTTL: number; // seconds
  enableRedis: boolean;
}

export class CacheManager extends EventEmitter {
  private logger: Logger;
  private memoryCache: NodeCache;
  private redis: Redis | null = null;
  private config: CacheConfig;
  private isRunning: boolean = false;

  constructor(config?: Partial<CacheConfig>) {
    super();
    this.config = {
      defaultTTL: 3600,
      maxKeys: 10000,
      redisTTL: 86400,
      enableRedis: false,
      ...config
    };
    this.logger = new Logger('CacheManager');

    // Initialize memory cache
    this.memoryCache = new NodeCache({
      stdTTL: this.config.defaultTTL,
      maxKeys: this.config.maxKeys,
      useClones: false
    });

    this.setupMemoryCacheHandlers();
  }

  /**
   * Initialize the cache manager
   */
  async initialize(): Promise<void> {
    await this.start();
    this.logger.info('✅ Cache Manager initialized');
  }

  /**
   * Start the cache manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('💾 Starting Cache Manager...');

    // Initialize Redis if enabled
    if (this.config.enableRedis && this.config.redisUrl) {
      try {
        this.redis = new Redis(this.config.redisUrl);
        this.logger.info('✅ Redis cache initialized');
      } catch (error) {
        this.logger.error('❌ Failed to initialize Redis cache', error);
      }
    }

    this.isRunning = true;
    this.logger.info('✅ Cache Manager started');
  }

  /**
   * Stop the cache manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('🛑 Stopping Cache Manager...');

    // Close Redis connection
    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
    }

    this.isRunning = false;
    this.logger.info('✅ Cache Manager stopped');
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<any> {
    // Try memory cache first
    let value = this.memoryCache.get(key);

    // Try Redis if not found in memory
    if (value === undefined && this.redis) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          value = JSON.parse(redisValue);
          // Store in memory cache for faster access
          this.memoryCache.set(key, value);
        }
      } catch (error) {
        this.logger.error(`Failed to get ${key} from Redis`, error);
      }
    }

    return value;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const effectiveTTL = ttl || this.config.defaultTTL;

    // Store in memory cache
    this.memoryCache.set(key, value, effectiveTTL);

    // Store in Redis if enabled
    if (this.redis) {
      try {
        const serializedValue = JSON.stringify(value);
        await this.redis.setex(key, effectiveTTL, serializedValue);
      } catch (error) {
        this.logger.error(`Failed to set ${key} in Redis`, error);
      }
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    // Delete from memory cache
    this.memoryCache.del(key);

    // Delete from Redis if enabled
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        this.logger.error(`Failed to delete ${key} from Redis`, error);
      }
    }
  }

  /**
   * Get multiple keys from cache
   */
  async mget(keys: string[]): Promise<any[]> {
    const results = [];

    for (const key of keys) {
      results.push(await this.get(key));
    }

    return results;
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Array<[string, any]>, ttl?: number): Promise<void> {
    for (const [key, value] of keyValuePairs) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Get keys matching pattern
   */
  async getKeys(pattern: string): Promise<string[]> {
    // Memory cache doesn't support pattern matching
    // For now, return empty array
    return [];

    // If we need pattern matching, we'd need to track keys separately
    // or use Redis SCAN command
  }

  /**
   * Clear all cache
   */
  async flush(): Promise<void> {
    // Clear memory cache
    this.memoryCache.flushAll();

    // Clear Redis if enabled
    if (this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        this.logger.error('Failed to flush Redis cache', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): any {
    return {
      memoryCache: {
        keys: this.memoryCache.getStats().keys,
        hits: this.memoryCache.getStats().hits,
        misses: this.memoryCache.getStats().misses,
        ksize: this.memoryCache.getStats().ksize,
        vsize: this.memoryCache.getStats().vsize
      },
      redisConnected: this.redis ? this.redis.status === 'ready' : false,
      isRunning: this.isRunning,
      defaultTTL: this.config.defaultTTL
    };
  }

  /**
   * Get manager status
   */
  getStatus(): string {
    return this.isRunning ? 'Running' : 'Stopped';
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    const stats = this.getStats();

    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      memoryCache: stats.memoryCache,
      redisConnected: stats.redisConnected,
      uptime: process.uptime()
    };
  }

  /**
   * Setup memory cache event handlers
   */
  private setupMemoryCacheHandlers(): void {
    this.memoryCache.on('set', (key: string, value: any) => {
      this.emit('cacheSet', { key, value });
    });

    this.memoryCache.on('del', (key: string, value: any) => {
      this.emit('cacheDel', { key, value });
    });

    this.memoryCache.on('expired', (key: string, value: any) => {
      this.emit('cacheExpired', { key, value });
    });
  }
}
