/**
 * Redis Cache Manager for high-performance queries
 */

import Redis from 'ioredis';
import { ServiceConfig, EntityLabel } from '../types';
import { createLogger } from '../utils/logger';

export class CacheManager {
  private redis: Redis;
  private logger: any;
  private keyPrefix: string;
  private defaultTTL: number = 3600; // 1 hour

  constructor(config: ServiceConfig['redis']) {
    this.logger = createLogger({ component: 'CacheManager' });
    this.keyPrefix = config.keyPrefix;

    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      db: config.db,
      keyPrefix: this.keyPrefix,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    // Event handlers
    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis error', { error: err.message });
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.logger.info('Redis cache manager initialized', {
      host: config.host,
      port: config.port,
      db: config.db,
    });
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error: any) {
      this.logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const ttlSeconds = ttl || this.defaultTTL;
      await this.redis.setex(key, ttlSeconds, serialized);
    } catch (error: any) {
      this.logger.error('Cache set error', { key, error: error.message });
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error: any) {
      this.logger.error('Cache delete error', { key, error: error.message });
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error: any) {
      this.logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Set with expiration time
   */
  async setex(key: string, seconds: number, value: any): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, seconds, serialized);
    } catch (error: any) {
      this.logger.error('Cache setex error', { key, error: error.message });
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error: any) {
      this.logger.error('Cache incr error', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.redis.decr(key);
    } catch (error: any) {
      this.logger.error('Cache decr error', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error: any) {
      this.logger.error('Cache sadd error', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.redis.smembers(key);
    } catch (error: any) {
      this.logger.error('Cache smembers error', { key, error: error.message });
      return [];
    }
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.redis.zadd(key, score, member);
    } catch (error: any) {
      this.logger.error('Cache zadd error', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Get sorted set range (descending)
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redis.zrevrange(key, start, stop);
    } catch (error: any) {
      this.logger.error('Cache zrevrange error', { key, error: error.message });
      return [];
    }
  }

  /**
   * Cache entity label
   */
  async cacheEntityLabel(label: EntityLabel, chain: string): Promise<void> {
    const key = `entity:${chain}:${label.address}`;
    await this.set(key, label, 86400); // 24 hours
  }

  /**
   * Get cached entity label
   */
  async getCachedEntityLabel(address: string, chain: string): Promise<EntityLabel | null> {
    const key = `entity:${chain}:${address}`;
    return await this.get<EntityLabel>(key);
  }

  /**
   * Cache token metadata
   */
  async cacheTokenMetadata(
    chain: string,
    contractAddress: string,
    metadata: any
  ): Promise<void> {
    const key = `token:${chain}:${contractAddress}`;
    await this.set(key, metadata, 86400); // 24 hours
  }

  /**
   * Get cached token metadata
   */
  async getCachedTokenMetadata(chain: string, contractAddress: string): Promise<any | null> {
    const key = `token:${chain}:${contractAddress}`;
    return await this.get(key);
  }

  /**
   * Cache price data
   */
  async cachePrice(symbol: string, priceUsd: number): Promise<void> {
    const key = `price:${symbol}`;
    await this.set(key, priceUsd, 300); // 5 minutes
  }

  /**
   * Get cached price
   */
  async getCachedPrice(symbol: string): Promise<number | null> {
    const key = `price:${symbol}`;
    return await this.get<number>(key);
  }

  /**
   * Track whale address (for fast lookups)
   */
  async trackWhale(address: string, chain: string): Promise<void> {
    const key = `whales:${chain}`;
    await this.sadd(key, address);
  }

  /**
   * Check if address is tracked whale
   */
  async isWhale(address: string, chain: string): Promise<boolean> {
    const key = `whales:${chain}`;
    try {
      const result = await this.redis.sismember(key, address);
      return result === 1;
    } catch (error: any) {
      this.logger.error('Cache isWhale error', { address, chain, error: error.message });
      return false;
    }
  }

  /**
   * Get all tracked whales for a chain
   */
  async getWhales(chain: string): Promise<string[]> {
    const key = `whales:${chain}`;
    return await this.smembers(key);
  }

  /**
   * Add to whale leaderboard
   */
  async updateWhaleLeaderboard(
    chain: string,
    address: string,
    totalValueUsd: number
  ): Promise<void> {
    const key = `leaderboard:${chain}`;
    await this.zadd(key, totalValueUsd, address);
  }

  /**
   * Get whale leaderboard
   */
  async getWhaleLeaderboard(chain: string, limit: number = 100): Promise<string[]> {
    const key = `leaderboard:${chain}`;
    return await this.zrevrange(key, 0, limit - 1);
  }

  /**
   * Increment metric counter
   */
  async incrementMetric(metric: string): Promise<number> {
    const key = `metrics:${metric}`;
    return await this.incr(key);
  }

  /**
   * Get metric value
   */
  async getMetric(metric: string): Promise<number> {
    const key = `metrics:${metric}`;
    const value = await this.get<number>(key);
    return value || 0;
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();
      
      return {
        connected: this.redis.status === 'ready',
        dbSize,
        info: this.parseRedisInfo(info),
      };
    } catch (error: any) {
      this.logger.error('Failed to get cache stats', { error: error.message });
      return null;
    }
  }

  /**
   * Parse Redis INFO output
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const parsed: Record<string, string> = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key] = value;
        }
      }
    });
    
    return parsed;
  }

  /**
   * Flush all cache
   */
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.warn('Cache flushed');
    } catch (error: any) {
      this.logger.error('Cache flush error', { error: error.message });
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
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    this.logger.info('Redis connection closed');
  }
}

export default CacheManager;

