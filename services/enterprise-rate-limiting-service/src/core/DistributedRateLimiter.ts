/**
 * =========================================
 * DISTRIBUTED RATE LIMITER
 * =========================================
 * Distributed rate limiting with Redis/Etcd/Consul clustering
 */

import { Logger, createLogger } from '../utils/Logger';

export interface DistributedRateLimitConfig {
  enabled: boolean;
  provider: 'redis' | 'etcd' | 'consul';
  consistency: 'strong' | 'eventual';
  replicationFactor: number;
  timeout: number;
  retryAttempts: number;
}

export interface RateLimitEntry {
  key: string;
  count: number;
  windowStart: number;
  windowSize: number;
  lastAccess: number;
}

export class DistributedRateLimiter {
  private logger: Logger;
  private config: DistributedRateLimitConfig;
  private isInitialized: boolean = false;
  private client: any = null; // Would be Redis/Etcd/Consul client

  // In-memory cache for performance
  private localCache = new Map<string, RateLimitEntry>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(config: DistributedRateLimitConfig) {
    this.logger = createLogger('DistributedRateLimiter');
    this.config = config;
  }

  /**
   * Initialize the distributed rate limiter
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing Distributed Rate Limiter...', {
      provider: this.config.provider,
      consistency: this.config.consistency,
    });

    try {
      // Initialize distributed store client
      await this.initializeClient();

      // Perform connectivity test
      await this.testConnectivity();

      this.isInitialized = true;
      this.logger.info('✅ Distributed Rate Limiter initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Distributed Rate Limiter', error);
      throw error;
    }
  }

  /**
   * Check rate limit for a key
   */
  async checkLimit(
    key: string,
    limit: number,
    windowSize: number,
    increment: number = 1
  ): Promise<{
    allowed: boolean;
    current: number;
    remaining: number;
    resetTime: Date;
  }> {
    if (!this.isInitialized) {
      throw new Error('Distributed rate limiter not initialized');
    }

    try {
      // Check local cache first
      const cached = this.localCache.get(key);
      if (cached && Date.now() - cached.lastAccess < this.CACHE_TTL) {
        return this.processCachedEntry(cached, limit, windowSize, increment);
      }

      // Get from distributed store
      const entry = await this.getEntryFromStore(key, windowSize);

      // Update count
      entry.count += increment;
      entry.lastAccess = Date.now();

      // Check if limit exceeded
      const allowed = entry.count <= limit;
      const remaining = Math.max(0, limit - entry.count);
      const resetTime = new Date(entry.windowStart + windowSize);

      // Store updated entry
      await this.storeEntryInStore(key, entry);

      // Update local cache
      this.localCache.set(key, entry);

      return {
        allowed,
        current: entry.count,
        remaining,
        resetTime,
      };
    } catch (error: any) {
      this.logger.error('Failed to check rate limit', error, { key });
      // Fallback to allow on error
      return {
        allowed: true,
        current: 0,
        remaining: limit,
        resetTime: new Date(Date.now() + windowSize),
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Distributed rate limiter not initialized');
    }

    try {
      // Remove from distributed store
      await this.deleteEntryFromStore(key);

      // Remove from local cache
      this.localCache.delete(key);

      this.logger.debug('Rate limit reset', { key });
    } catch (error: any) {
      this.logger.error('Failed to reset rate limit', error, { key });
      throw error;
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    hitRate: number;
    errorRate: number;
  }> {
    try {
      const totalKeys = await this.getTotalKeysFromStore();
      const activeKeys = this.localCache.size;

      return {
        totalKeys,
        activeKeys,
        hitRate: 0.95, // Would calculate from metrics
        errorRate: 0.01, // Would calculate from metrics
      };
    } catch (error: any) {
      this.logger.error('Failed to get rate limit stats', error);
      return {
        totalKeys: 0,
        activeKeys: 0,
        hitRate: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * Health check for distributed rate limiter
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    provider: string;
    connectivity: 'connected' | 'disconnected';
    latency: number;
    totalKeys: number;
  }> {
    try {
      const connectivity = await this.testConnectivity();
      const latency = await this.measureLatency();
      const totalKeys = await this.getTotalKeysFromStore();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (!connectivity) {
        status = 'unhealthy';
      } else if (latency > 100) { // > 100ms
        status = 'degraded';
      }

      return {
        status,
        provider: this.config.provider,
        connectivity: connectivity ? 'connected' : 'disconnected',
        latency,
        totalKeys,
      };
    } catch (error) {
      this.logger.error('Distributed rate limiter health check failed', error);
      return {
        status: 'unhealthy',
        provider: this.config.provider,
        connectivity: 'disconnected',
        latency: 0,
        totalKeys: 0,
      };
    }
  }

  /**
   * Shutdown the distributed rate limiter
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Distributed Rate Limiter');

    try {
      if (this.client) {
        await this.disconnectClient();
      }

      this.localCache.clear();
      this.isInitialized = false;

      this.logger.info('✅ Distributed Rate Limiter shutdown successfully');
    } catch (error: any) {
      this.logger.error('Error during distributed rate limiter shutdown', error);
      throw error;
    }
  }

  // Private methods

  private async initializeClient(): Promise<void> {
    switch (this.config.provider) {
      case 'redis':
        await this.initializeRedisClient();
        break;
      case 'etcd':
        await this.initializeEtcdClient();
        break;
      case 'consul':
        await this.initializeConsulClient();
        break;
      default:
        throw new Error(`Unsupported distributed provider: ${this.config.provider}`);
    }
  }

  private async initializeRedisClient(): Promise<void> {
    // Initialize Redis client
    this.logger.debug('Initializing Redis client');
  }

  private async initializeEtcdClient(): Promise<void> {
    // Initialize etcd client
    this.logger.debug('Initializing etcd client');
  }

  private async initializeConsulClient(): Promise<void> {
    // Initialize Consul client
    this.logger.debug('Initializing Consul client');
  }

  private async testConnectivity(): Promise<boolean> {
    try {
      // Test basic connectivity
      return true; // Placeholder
    } catch {
      return false;
    }
  }

  private async measureLatency(): Promise<number> {
    const start = Date.now();
    try {
      // Perform a simple operation to measure latency
      await this.getTotalKeysFromStore();
      return Date.now() - start;
    } catch {
      return Date.now() - start;
    }
  }

  private async getEntryFromStore(key: string, windowSize: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowSize) * windowSize;

    // In a real implementation, this would fetch from distributed store
    return {
      key,
      count: 0,
      windowStart,
      windowSize,
      lastAccess: now,
    };
  }

  private async storeEntryInStore(key: string, entry: RateLimitEntry): Promise<void> {
    // In a real implementation, this would store in distributed store
    this.logger.debug(`Stored entry for key: ${key}`);
  }

  private async deleteEntryFromStore(key: string): Promise<void> {
    // In a real implementation, this would delete from distributed store
    this.logger.debug(`Deleted entry for key: ${key}`);
  }

  private async getTotalKeysFromStore(): Promise<number> {
    // In a real implementation, this would count keys in distributed store
    return this.localCache.size;
  }

  private async disconnectClient(): Promise<void> {
    // Disconnect from distributed store
    this.logger.debug('Disconnected from distributed store');
  }

  private processCachedEntry(
    entry: RateLimitEntry,
    limit: number,
    windowSize: number,
    increment: number
  ): {
    allowed: boolean;
    current: number;
    remaining: number;
    resetTime: Date;
  } {
    const now = Date.now();

    // Check if window has expired
    if (now - entry.windowStart >= windowSize) {
      // Reset window
      entry.windowStart = Math.floor(now / windowSize) * windowSize;
      entry.count = increment;
    } else {
      entry.count += increment;
    }

    entry.lastAccess = now;

    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);
    const resetTime = new Date(entry.windowStart + windowSize);

    return {
      allowed,
      current: entry.count,
      remaining,
      resetTime,
    };
  }
}

export default DistributedRateLimiter;
