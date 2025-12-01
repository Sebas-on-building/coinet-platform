/**
 * Redis Cache Manager for high-performance queries
 */

import Redis from 'ioredis';
import { ServiceConfig, EntityLabel } from '../types';
import { createLogger } from '../utils/logger';

export class CacheManager {
  private redis: Redis | null = null;
  private logger: any;
  private keyPrefix: string;
  private defaultTTL: number = 3600; // 1 hour
  private enabled: boolean = false;
  private errorSuppressed: boolean = false;

  constructor(config: ServiceConfig['redis']) {
    this.logger = createLogger({ component: 'CacheManager' });
    this.keyPrefix = config.keyPrefix;

    // Check if Redis is required or if REDIS_URL is provided
    const requireCache = process.env.REQUIRE_CACHE === 'true' || process.env.NODE_ENV === 'production';
    const hasRedisUrl = !!process.env.REDIS_URL;
    const hasRedisHost = config.host && config.host !== 'localhost';

    // Only initialize Redis if explicitly required or configured
    if (requireCache || hasRedisUrl || hasRedisHost) {
      this.enabled = true;
      
      this.redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password || undefined,
        db: config.db,
        keyPrefix: this.keyPrefix,
        retryStrategy: (times) => {
          // Stop retrying after 10 attempts (about 20 seconds)
          if (times > 10) {
            this.errorSuppressed = true;
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: false, // Connect immediately
      });

      // Event handlers
      this.redis.on('connect', () => {
        // Log as debug to reduce noise - initialization already logs at INFO
        this.logger.debug('Redis connected');
        this.errorSuppressed = false; // Reset suppression on successful connect
      });

      this.redis.on('error', (err) => {
        // Redis is optional - log as debug to reduce noise
        // The service will continue with in-memory fallbacks
        if (!this.errorSuppressed) {
          this.logger.debug('Redis error (optional component)', { error: err.message });
          // After first error, suppress subsequent errors for 30 seconds
          setTimeout(() => {
            this.errorSuppressed = false;
          }, 30000);
          this.errorSuppressed = true;
        }
      });

      this.redis.on('close', () => {
        // Only log close as debug if we haven't suppressed errors
        if (!this.errorSuppressed) {
          this.logger.debug('Redis connection closed (optional component)');
        }
      });

      this.logger.info('Redis cache manager initialized', {
        host: config.host,
        port: config.port,
        db: config.db,
      });
    } else {
      // Redis not configured - operate in no-op mode
      this.logger.info('Redis cache manager initialized (disabled - no Redis configured)');
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) return null;
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache get error (optional component)', { key, error: error.message });
      }
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled || !this.redis) return;
    try {
      const serialized = JSON.stringify(value);
      const ttlSeconds = ttl || this.defaultTTL;
      await this.redis.setex(key, ttlSeconds, serialized);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache set error (optional component)', { key, error: error.message });
      }
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    if (!this.enabled || !this.redis) return;
    try {
      await this.redis.del(key);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache delete error (optional component)', { key, error: error.message });
      }
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache exists error (optional component)', { key, error: error.message });
      }
      return false;
    }
  }

  /**
   * Set with expiration time
   */
  async setex(key: string, seconds: number, value: any): Promise<void> {
    if (!this.enabled || !this.redis) return;
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, seconds, serialized);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache setex error (optional component)', { key, error: error.message });
      }
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    if (!this.enabled || !this.redis) return 0;
    try {
      return await this.redis.incr(key);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache incr error (optional component)', { key, error: error.message });
      }
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    if (!this.enabled || !this.redis) return 0;
    try {
      return await this.redis.decr(key);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache decr error (optional component)', { key, error: error.message });
      }
      return 0;
    }
  }

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.enabled || !this.redis) return 0;
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache sadd error (optional component)', { key, error: error.message });
      }
      return 0;
    }
  }

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    if (!this.enabled || !this.redis) return [];
    try {
      return await this.redis.smembers(key);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache smembers error (optional component)', { key, error: error.message });
      }
      return [];
    }
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.enabled || !this.redis) return 0;
    try {
      return await this.redis.zadd(key, score, member);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache zadd error (optional component)', { key, error: error.message });
      }
      return 0;
    }
  }

  /**
   * Get sorted set range (descending)
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.enabled || !this.redis) return [];
    try {
      return await this.redis.zrevrange(key, start, stop);
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache zrevrange error (optional component)', { key, error: error.message });
      }
      return [];
    }
  }

  /**
   * Cache entity label
   */
  async cacheEntityLabel(label: EntityLabel, chain: string): Promise<void> {
    if (!this.enabled) return;
    const key = `entity:${chain}:${label.address}`;
    await this.set(key, label, 86400); // 24 hours
  }

  /**
   * Get cached entity label
   */
  async getCachedEntityLabel(address: string, chain: string): Promise<EntityLabel | null> {
    if (!this.enabled) return null;
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
    if (!this.enabled) return;
    const key = `token:${chain}:${contractAddress}`;
    await this.set(key, metadata, 86400); // 24 hours
  }

  /**
   * Get cached token metadata
   */
  async getCachedTokenMetadata(chain: string, contractAddress: string): Promise<any | null> {
    if (!this.enabled) return null;
    const key = `token:${chain}:${contractAddress}`;
    return await this.get(key);
  }

  /**
   * Cache price data
   */
  async cachePrice(symbol: string, priceUsd: number): Promise<void> {
    if (!this.enabled) return;
    const key = `price:${symbol}`;
    await this.set(key, priceUsd, 300); // 5 minutes
  }

  /**
   * Get cached price
   */
  async getCachedPrice(symbol: string): Promise<number | null> {
    if (!this.enabled) return null;
    const key = `price:${symbol}`;
    return await this.get<number>(key);
  }

  /**
   * Track whale address (for fast lookups)
   */
  async trackWhale(address: string, chain: string): Promise<void> {
    if (!this.enabled) return;
    const key = `whales:${chain}`;
    await this.sadd(key, address);
  }

  /**
   * Check if address is tracked whale
   */
  async isWhale(address: string, chain: string): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;
    const key = `whales:${chain}`;
    try {
      const result = await this.redis.sismember(key, address);
      return result === 1;
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache isWhale error (optional component)', { address, chain, error: error.message });
      }
      return false;
    }
  }

  /**
   * Get all tracked whales for a chain
   */
  async getWhales(chain: string): Promise<string[]> {
    if (!this.enabled) return [];
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
    if (!this.enabled) return;
    const key = `leaderboard:${chain}`;
    await this.zadd(key, totalValueUsd, address);
  }

  /**
   * Get whale leaderboard
   */
  async getWhaleLeaderboard(chain: string, limit: number = 100): Promise<string[]> {
    if (!this.enabled) return [];
    const key = `leaderboard:${chain}`;
    return await this.zrevrange(key, 0, limit - 1);
  }

  /**
   * Increment metric counter
   */
  async incrementMetric(metric: string): Promise<number> {
    if (!this.enabled) return 0;
    const key = `metrics:${metric}`;
    return await this.incr(key);
  }

  /**
   * Get metric value
   */
  async getMetric(metric: string): Promise<number> {
    if (!this.enabled) return 0;
    const key = `metrics:${metric}`;
    const value = await this.get<number>(key);
    return value || 0;
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.enabled || !this.redis) return null;
    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();
      
      return {
        connected: this.redis.status === 'ready',
        dbSize,
        info: this.parseRedisInfo(info),
      };
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Failed to get cache stats (optional component)', { error: error.message });
      }
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
    if (!this.enabled || !this.redis) return;
    try {
      await this.redis.flushdb();
      this.logger.warn('Cache flushed');
    } catch (error: any) {
      if (!this.errorSuppressed) {
        this.logger.debug('Cache flush error (optional component)', { error: error.message });
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;
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
    if (this.redis) {
      try {
        await this.redis.quit();
        this.logger.info('Redis connection closed');
      } catch (error: any) {
        // Ignore errors during shutdown
      }
    }
  }
}

export default CacheManager;

