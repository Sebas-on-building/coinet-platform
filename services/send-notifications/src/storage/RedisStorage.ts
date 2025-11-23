/**
 * =========================================
 * REDIS STORAGE
 * =========================================
 * Divine world-class Redis storage for notification persistence
 * High-availability distributed storage with failover support
 */

import Redis from 'ioredis';
import { Logger } from '@/utils/Logger';

/**
 * Redis configuration
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string | undefined;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

/**
 * Default Redis configuration
 */
export const DEFAULT_REDIS_CONFIG: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'notifications:',
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

/**
 * Redis storage for notification data
 */
export class RedisStorage {
  private logger: Logger;
  private client: Redis;
  private config: RedisConfig;

  constructor(config: RedisConfig = DEFAULT_REDIS_CONFIG) {
    this.logger = new Logger('RedisStorage');
    this.config = config;

    // Create Redis client
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix,
      retryDelayOnFailover: config.retryDelayOnFailover,
      enableReadyCheck: config.enableReadyCheck,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      lazyConnect: config.lazyConnect,
    } as any); // Type assertion for ioredis options

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up Redis event listeners
   */
  private setupEventListeners(): void {
    this.client.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.client.on('ready', () => {
      this.logger.info('Redis ready');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis error', { error: error.message });
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.info('Redis reconnecting');
    });

    this.client.on('+node', (node) => {
      this.logger.info('Redis cluster node added', { node });
    });

    this.client.on('-node', (node) => {
      this.logger.warn('Redis cluster node removed', { node });
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.info('Redis connection established');
    } catch (error: any) {
      this.logger.error('Failed to connect to Redis', { error: error.message });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.info('Redis connection closed');
    } catch (error: any) {
      this.logger.error('Failed to disconnect from Redis', { error: error.message });
    }
  }

  /**
   * Set value with TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      this.logger.debug('Redis set', { key, ttl });
      return true;
    } catch (error: any) {
      this.logger.error('Redis set failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get value
   */
  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      this.logger.debug('Redis get', { key, found: value !== null });
      return value;
    } catch (error: any) {
      this.logger.error('Redis get failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    try {
      const deleted = await this.client.del(key);
      this.logger.debug('Redis delete', { key, deleted });
      return deleted;
    } catch (error: any) {
      this.logger.error('Redis delete failed', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists > 0;
    } catch (error: any) {
      this.logger.error('Redis exists failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Set expiration time
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      this.logger.debug('Redis expire', { key, seconds, success: result });
      return Boolean(result);
    } catch (error: any) {
      this.logger.error('Redis expire failed', { key, seconds, error: error.message });
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      const ttl = await this.client.ttl(key);
      return ttl;
    } catch (error: any) {
      this.logger.error('Redis ttl failed', { key, error: error.message });
      return -1;
    }
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    try {
      const value = await this.client.incr(key);
      this.logger.debug('Redis incr', { key, value });
      return value;
    } catch (error: any) {
      this.logger.error('Redis incr failed', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    try {
      const value = await this.client.decr(key);
      this.logger.debug('Redis decr', { key, value });
      return value;
    } catch (error: any) {
      this.logger.error('Redis decr failed', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      const result = await this.client.hset(key, field, value);
      this.logger.debug('Redis hset', { key, field, result });
      return result;
    } catch (error: any) {
      this.logger.error('Redis hset failed', { key, field, error: error.message });
      return 0;
    }
  }

  /**
   * Get hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      const value = await this.client.hget(key, field);
      this.logger.debug('Redis hget', { key, field, found: value !== null });
      return value;
    } catch (error: any) {
      this.logger.error('Redis hget failed', { key, field, error: error.message });
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      const result = await this.client.hgetall(key);
      this.logger.debug('Redis hgetall', { key, fields: Object.keys(result).length });
      return result;
    } catch (error: any) {
      this.logger.error('Redis hgetall failed', { key, error: error.message });
      return {};
    }
  }

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      const added = await this.client.sadd(key, ...members);
      this.logger.debug('Redis sadd', { key, members: members.length, added });
      return added;
    } catch (error: any) {
      this.logger.error('Redis sadd failed', { key, members: members.length, error: error.message });
      return 0;
    }
  }

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    try {
      const members = await this.client.smembers(key);
      this.logger.debug('Redis smembers', { key, count: members.length });
      return members;
    } catch (error: any) {
      this.logger.error('Redis smembers failed', { key, error: error.message });
      return [];
    }
  }

  /**
   * Push to list
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      const length = await this.client.lpush(key, ...values);
      this.logger.debug('Redis lpush', { key, values: values.length, length });
      return length;
    } catch (error: any) {
      this.logger.error('Redis lpush failed', { key, values: values.length, error: error.message });
      return 0;
    }
  }

  /**
   * Pop from list
   */
  async lpop(key: string): Promise<string | null> {
    try {
      const value = await this.client.lpop(key);
      this.logger.debug('Redis lpop', { key, found: value !== null });
      return value;
    } catch (error: any) {
      this.logger.error('Redis lpop failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    try {
      const length = await this.client.llen(key);
      return length;
    } catch (error: any) {
      this.logger.error('Redis llen failed', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Publish to channel
   */
  async publish(channel: string, message: string): Promise<number> {
    try {
      const subscribers = await this.client.publish(channel, message);
      this.logger.debug('Redis publish', { channel, subscribers });
      return subscribers;
    } catch (error: any) {
      this.logger.error('Redis publish failed', { channel, error: error.message });
      return 0;
    }
  }

  /**
   * Subscribe to channel
   */
  subscribe(channels: string | string[], callback: (channel: string, message: string) => void): void {
    const channelList = Array.isArray(channels) ? channels : [channels];

    channelList.forEach(channel => {
      this.client.subscribe(channel, (err, count) => {
        if (err) {
          this.logger.error('Redis subscribe failed', { channel, error: err.message });
        } else {
          this.logger.info('Redis subscribed', { channel, count });
        }
      });
    });

    this.client.on('message', (channel, message) => {
      this.logger.debug('Redis message received', { channel });
      callback(channel, message);
    });
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channels?: string | string[]): Promise<void> {
    try {
      if (channels) {
        const channelList = Array.isArray(channels) ? channels : [channels];
        await this.client.unsubscribe(...channelList);
        this.logger.info('Redis unsubscribed', { channels: channelList });
      } else {
        await this.client.unsubscribe();
        this.logger.info('Redis unsubscribed from all channels');
      }
    } catch (error: any) {
      this.logger.error('Redis unsubscribe failed', { channels, error: error.message });
    }
  }

  /**
   * Get Redis info
   */
  async info(section?: string): Promise<string> {
    try {
      const info = section ? await this.client.info(section) : await this.client.info();
      return info;
    } catch (error: any) {
      this.logger.error('Redis info failed', { section, error: error.message });
      return '';
    }
  }

  /**
   * Health check for Redis
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    ping: number;
    connected: boolean;
  }> {
    const startTime = Date.now();

    try {
      const ping = await this.client.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        ping: responseTime,
        connected: true,
      };
    } catch (error: any) {
      this.logger.error('Redis health check failed', { error: error.message });

      return {
        status: 'unhealthy',
        ping: -1,
        connected: false,
      };
    }
  }

  /**
   * Get the Redis client instance
   */
  getClient(): Redis {
    return this.client;
  }
}
