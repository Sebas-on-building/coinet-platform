/**
 * Redis Cache Layer
 * Caching for market data with TTL
 */

import Redis from 'ioredis';
import { MarketPrice, OHLCV, CoinMetadata, DataSource } from '../types';
import { logger } from '../utils/logger';
import { ServiceConfig } from '../types';

export class CacheStorage {
  private redis: Redis;
  private ttl: number;

  constructor(config: ServiceConfig['redis'], ttl: number) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      db: config.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.ttl = ttl;

    this.redis.on('error', (err) => {
      logger.error('Redis error', { error: err });
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected', {
        host: config.host,
        port: config.port,
      });
    });

    logger.info('Cache storage initialized', {
      host: config.host,
      ttl: this.ttl,
    });
  }

  /**
   * Generate cache key for market price
   */
  private getPriceKey(coinId: string, source?: DataSource): string {
    return source
      ? `market:price:${coinId}:${source}`
      : `market:price:${coinId}`;
  }

  /**
   * Generate cache key for OHLCV
   */
  private getOHLCVKey(
    coinId: string,
    interval: string,
    source?: DataSource
  ): string {
    return source
      ? `market:ohlcv:${coinId}:${interval}:${source}`
      : `market:ohlcv:${coinId}:${interval}`;
  }

  /**
   * Generate cache key for metadata
   */
  private getMetadataKey(coinId: string): string {
    return `market:metadata:${coinId}`;
  }

  /**
   * Cache market price
   */
  async cachePrice(price: MarketPrice): Promise<void> {
    try {
      const key = this.getPriceKey(price.coinId, price.source);
      const value = JSON.stringify(price);
      await this.redis.setex(key, this.ttl, value);

      logger.debug('Price cached', {
        coinId: price.coinId,
        source: price.source,
      });
    } catch (error) {
      logger.error('Failed to cache price', { error, price });
      // Don't throw - caching is non-critical
    }
  }

  /**
   * Get cached market price
   */
  async getPrice(
    coinId: string,
    source?: DataSource
  ): Promise<MarketPrice | null> {
    try {
      const key = this.getPriceKey(coinId, source);
      const value = await this.redis.get(key);

      if (!value) {
        return null;
      }

      const price = JSON.parse(value) as MarketPrice;
      
      // Parse dates
      price.lastUpdated = new Date(price.lastUpdated);
      if (price.athDate) price.athDate = new Date(price.athDate);
      if (price.atlDate) price.atlDate = new Date(price.atlDate);

      logger.debug('Price cache hit', { coinId, source });
      return price;
    } catch (error) {
      logger.error('Failed to get cached price', { error, coinId, source });
      return null;
    }
  }

  /**
   * Cache multiple prices
   */
  async cachePrices(prices: MarketPrice[]): Promise<void> {
    if (prices.length === 0) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();

      for (const price of prices) {
        const key = this.getPriceKey(price.coinId, price.source);
        const value = JSON.stringify(price);
        pipeline.setex(key, this.ttl, value);
      }

      await pipeline.exec();

      logger.debug('Prices cached in batch', { count: prices.length });
    } catch (error) {
      logger.error('Failed to cache prices batch', { error });
      // Don't throw - caching is non-critical
    }
  }

  /**
   * Cache OHLCV data
   */
  async cacheOHLCV(
    coinId: string,
    interval: string,
    ohlcv: OHLCV[],
    source?: DataSource
  ): Promise<void> {
    try {
      const key = this.getOHLCVKey(coinId, interval, source);
      const value = JSON.stringify(ohlcv);
      await this.redis.setex(key, this.ttl * 2, value); // Longer TTL for OHLCV

      logger.debug('OHLCV cached', { coinId, interval, source });
    } catch (error) {
      logger.error('Failed to cache OHLCV', { error, coinId });
      // Don't throw - caching is non-critical
    }
  }

  /**
   * Get cached OHLCV data
   */
  async getOHLCV(
    coinId: string,
    interval: string,
    source?: DataSource
  ): Promise<OHLCV[] | null> {
    try {
      const key = this.getOHLCVKey(coinId, interval, source);
      const value = await this.redis.get(key);

      if (!value) {
        return null;
      }

      const ohlcv = JSON.parse(value) as OHLCV[];
      
      // Parse dates
      ohlcv.forEach((candle) => {
        candle.timestamp = new Date(candle.timestamp);
      });

      logger.debug('OHLCV cache hit', { coinId, interval, source });
      return ohlcv;
    } catch (error) {
      logger.error('Failed to get cached OHLCV', { error, coinId });
      return null;
    }
  }

  /**
   * Cache metadata
   */
  async cacheMetadata(metadata: CoinMetadata): Promise<void> {
    try {
      const key = this.getMetadataKey(metadata.coinId);
      const value = JSON.stringify(metadata);
      await this.redis.setex(key, this.ttl * 10, value); // Much longer TTL for metadata

      logger.debug('Metadata cached', { coinId: metadata.coinId });
    } catch (error) {
      logger.error('Failed to cache metadata', { error, metadata });
      // Don't throw - caching is non-critical
    }
  }

  /**
   * Get cached metadata
   */
  async getMetadata(coinId: string): Promise<CoinMetadata | null> {
    try {
      const key = this.getMetadataKey(coinId);
      const value = await this.redis.get(key);

      if (!value) {
        return null;
      }

      const metadata = JSON.parse(value) as CoinMetadata;
      
      // Parse dates
      metadata.lastUpdated = new Date(metadata.lastUpdated);
      if (metadata.genesisDate) {
        metadata.genesisDate = new Date(metadata.genesisDate);
      }

      logger.debug('Metadata cache hit', { coinId });
      return metadata;
    } catch (error) {
      logger.error('Failed to get cached metadata', { error, coinId });
      return null;
    }
  }

  /**
   * Invalidate cache for a coin
   */
  async invalidate(coinId: string): Promise<void> {
    try {
      const pattern = `market:*:${coinId}*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('Cache invalidated', { coinId, keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Failed to invalidate cache', { error, coinId });
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      logger.info('All cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('stats');
      const lines = info.split('\r\n');
      const stats: any = {};

      lines.forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key.trim()] = value.trim();
        }
      });

      // Get database size
      const dbsize = await this.redis.dbsize();
      stats.dbsize = dbsize;

      // Calculate hit rate
      const hits = parseInt(stats.keyspace_hits || '0', 10);
      const misses = parseInt(stats.keyspace_misses || '0', 10);
      const total = hits + misses;
      stats.hitRate = total > 0 ? (hits / total) * 100 : 0;

      return stats;
    } catch (error) {
      logger.error('Failed to get cache stats', { error });
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Cache health check failed', { error });
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis connection closed');
  }
}

export default CacheStorage;

