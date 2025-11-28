/**
 * Redis Cache Layer
 * Caching for market data with TTL
 */

import Redis from 'ioredis';
import { MarketPrice, OHLCV, CoinMetadata, DataSource } from '../types';
import { logger } from '../utils/logger';
import { ServiceConfig } from '../types';

/**
 * Tiered cache TTL configuration
 */
export interface CacheTTLTiers {
  realtime: number;      // For WebSocket price updates (very short)
  default: number;       // For general price/market data
  metadata: number;      // For coin metadata (longer)
  historical: number;    // For OHLCV data (longest)
  nonCritical: number;   // For non-critical data like categories
}

export class CacheStorage {
  private redis: Redis;
  private ttl: number;
  private ttlTiers: CacheTTLTiers;
  private errorSuppressed: boolean = false;

  constructor(config: ServiceConfig['redis'], ttl: number) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      db: config.db,
      retryStrategy: (times: number) => {
        // Stop retrying after 10 attempts (about 20 seconds)
        if (times > 10) {
          this.errorSuppressed = true;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.ttl = ttl;
    
    // Initialize tiered TTL configuration
    this.ttlTiers = {
      realtime: 10,           // 10 seconds for WebSocket prices
      default: ttl,           // Default TTL (30s typically)
      metadata: ttl * 20,     // 10 minutes for metadata
      historical: ttl * 40,   // 20 minutes for OHLCV
      nonCritical: ttl * 60,  // 30 minutes for non-critical data
    };

    this.redis.on('error', (err) => {
      // Suppress repeated errors after initial failure (Redis is optional)
      if (!this.errorSuppressed) {
        logger.debug('Redis error (optional component)', { error: err.message || err });
        // After first error, suppress subsequent errors for 30 seconds
        setTimeout(() => {
          this.errorSuppressed = false;
        }, 30000);
        this.errorSuppressed = true;
      }
    });

    this.redis.on('connect', () => {
      this.errorSuppressed = false; // Reset suppression on successful connect
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
   * Set custom TTL tiers
   */
  setTTLTiers(tiers: Partial<CacheTTLTiers>): void {
    this.ttlTiers = { ...this.ttlTiers, ...tiers };
    logger.info('Cache TTL tiers updated', { tiers: this.ttlTiers });
  }

  /**
   * Cache market price with appropriate TTL based on update type
   */
  async cachePrice(price: MarketPrice): Promise<void> {
    try {
      const key = this.getPriceKey(price.coinId, price.source);
      const value = JSON.stringify(price);
      
      // Use realtime TTL for WebSocket updates, default for REST
      const ttl = price.updateType === 'websocket' 
        ? this.ttlTiers.realtime 
        : this.ttlTiers.default;
      
      await this.redis.setex(key, ttl, value);

      logger.debug('Price cached', {
        coinId: price.coinId,
        source: price.source,
        ttl,
        updateType: price.updateType,
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
   * Cache multiple prices with appropriate TTL based on update type
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
        // Use realtime TTL for WebSocket updates, default for REST
        const ttl = price.updateType === 'websocket' 
          ? this.ttlTiers.realtime 
          : this.ttlTiers.default;
        pipeline.setex(key, ttl, value);
      }

      await pipeline.exec();

      logger.debug('Prices cached in batch', { count: prices.length });
    } catch (error) {
      logger.error('Failed to cache prices batch', { error });
      // Don't throw - caching is non-critical
    }
  }

  /**
   * Cache OHLCV data with historical data TTL
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
      // Use historical TTL for OHLCV data (longer)
      await this.redis.setex(key, this.ttlTiers.historical, value);

      logger.debug('OHLCV cached', { 
        coinId, 
        interval, 
        source, 
        ttl: this.ttlTiers.historical 
      });
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
   * Cache metadata with appropriate TTL for static data
   */
  async cacheMetadata(metadata: CoinMetadata): Promise<void> {
    try {
      const key = this.getMetadataKey(metadata.coinId);
      const value = JSON.stringify(metadata);
      // Use metadata TTL for coin info (much longer)
      await this.redis.setex(key, this.ttlTiers.metadata, value);

      logger.debug('Metadata cached', { 
        coinId: metadata.coinId,
        ttl: this.ttlTiers.metadata 
      });
    } catch (error) {
      logger.error('Failed to cache metadata', { error, metadata });
      // Don't throw - caching is non-critical
    }
  }
  
  /**
   * Cache non-critical data (e.g., categories, global metrics) with longest TTL
   */
  async cacheNonCritical(key: string, data: any): Promise<void> {
    try {
      const value = JSON.stringify(data);
      await this.redis.setex(key, this.ttlTiers.nonCritical, value);
      
      logger.debug('Non-critical data cached', { 
        key,
        ttl: this.ttlTiers.nonCritical 
      });
    } catch (error) {
      logger.error('Failed to cache non-critical data', { error, key });
    }
  }
  
  /**
   * Get non-critical cached data
   */
  async getNonCritical(key: string): Promise<any | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (error) {
      logger.error('Failed to get non-critical cache', { error, key });
      return null;
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

