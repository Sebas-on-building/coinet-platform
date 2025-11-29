// =============================================================================
// COINET AI CONTEXT SERVICE - TIMESCALEDB CONFIGURATION
// Database connection and time-series operations for context data
// =============================================================================

import { Pool, _PoolClient, PoolConfig } from 'pg';
import { z } from 'zod';

// =============================================================================
// CONFIGURATION SCHEMAS
// =============================================================================

const TimescaleDBConfigSchema = z.object({
  // Connection settings
  host: z.string().default('timescaledb.default.svc.cluster.local'),
  port: z.number().default(5432),
  database: z.string().default('coinet_timeseries'),
  user: z.string().default('coinet_context'),
  password: z.string(),
  
  // SSL settings
  ssl: z.boolean().default(false),
  sslMode: z.enum(['disable', 'require', 'verify-ca', 'verify-full']).default('disable'),
  
  // Pool settings
  pool: z.object({
    min: z.number().default(2),
    max: z.number().default(20),
    idleTimeoutMillis: z.number().default(30000),
    connectionTimeoutMillis: z.number().default(10000),
  }).default({}),
  
  // Query settings
  query: z.object({
    timeout: z.number().default(30000),
    retries: z.number().default(3),
    retryDelay: z.number().default(1000),
  }).default({}),
  
  // Cache settings
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(300000), // 5 minutes
    maxSize: z.number().default(1000),
  }).default({}),
});

export type TimescaleDBConfig = z.infer<typeof TimescaleDBConfigSchema>;

// =============================================================================
// DATABASE SCHEMAS FOR CONTEXT DATA
// =============================================================================

export interface PriceCandleRow {
  time: Date;
  symbol: string;
  timeframe: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  quote_volume?: number;
  trades_count?: number;
}

export interface SentimentScoreRow {
  time: Date;
  symbol: string;
  platform: string;
  sentiment_score: number;
  confidence: number;
  volume: number;
}

export interface NewsImpactRow {
  time: Date;
  symbol: string;
  source: string;
  sentiment_score: number;
  importance: number;
  price_impact?: number;
  volume_spike?: number;
}

export interface NetworkMetricsRow {
  time: Date;
  symbol: string;
  network: string;
  active_addresses?: number;
  transaction_count?: number;
  transaction_volume?: number;
  average_transaction_value?: number;
  hash_rate?: number;
  difficulty?: number;
  block_time?: number;
}

// =============================================================================
// TIMESCALEDB CONNECTION MANAGER
// =============================================================================

export class TimescaleDBManager {
  private pool: Pool;
  private config: TimescaleDBConfig;
  private queryCache = new Map<string, { data: unknown; timestamp: number }>();

  constructor(config: Partial<TimescaleDBConfig> = {}) {
    this.config = TimescaleDBConfigSchema.parse({
      ...config,
      password: config.password || process.env.TIMESCALEDB_PASSWORD || '',
    });

    // Create connection pool
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      min: this.config.pool.min,
      max: this.config.pool.max,
      idleTimeoutMillis: this.config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.pool.connectionTimeoutMillis,
      statement_timeout: this.config.query.timeout,
    };

    if (this.config.ssl) {
      poolConfig.ssl = {
        rejectUnauthorized: this.config.sslMode === 'verify-full',
      };
    }

    this.pool = new Pool(poolConfig);

    // Setup error handling
    this.pool.on('error', (_err, _client) => {
      // console.error('Unexpected error on idle client:', err);
    });

    // Setup cache cleanup
    if (this.config.cache.enabled) {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
  }

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  async getClient(): Promise<_PoolClient> {
    return await this.pool.connect();
  }

  async query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
    const cacheKey = this.getCacheKey(text, params);
    
    // Check cache first
    if (this.config.cache.enabled) {
      const cached = this.getFromCache<T[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let retries = this.config.query.retries;
    let lastError: Error;

    while (retries > 0) {
      try {
        const result = await this.pool.query(text, params);
        
        // Cache successful queries
        if (this.config.cache.enabled) {
          this.setCache(cacheKey, result.rows);
        }
        
        return result.rows;
      } catch (error) {
        lastError = error as Error;
        retries--;
        
        if (retries > 0) {
          // console.warn(`Query failed, retrying in ${this.config.query.retryDelay}ms:`, error);
          await this.sleep(this.config.query.retryDelay);
        }
      }
    }

    throw lastError!;
  }

  async transaction<T>(callback: (client: _PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // =============================================================================
  // TIME-SERIES SPECIFIC QUERIES
  // =============================================================================

  async getLatestPriceCandles(
    symbol: string,
    timeframe: string,
    limit: number = 100
  ): Promise<PriceCandleRow[]> {
    const query = `
      SELECT time, symbol, timeframe, open_price, high_price, low_price, 
             close_price, volume, quote_volume, trades_count
      FROM market_data.price_candles
      WHERE symbol = $1 AND timeframe = $2
      ORDER BY time DESC
      LIMIT $3
    `;
    
    return await this.query<PriceCandleRow>(query, [symbol, timeframe, limit]);
  }

  async getPriceChange(symbol: string, interval: string): Promise<number | null> {
    const query = `
      SELECT market_data.calculate_price_change($1, $2::INTERVAL) as price_change
    `;
    
    const result = await this.query<{ price_change: number | null }>(query, [symbol, interval]);
    return result[0]?.price_change || null;
  }

  async getAverageSentiment(
    symbol: string,
    timeInterval: string = '1 hour'
  ): Promise<number | null> {
    const query = `
      SELECT social_data.get_average_sentiment($1, $2::INTERVAL) as avg_sentiment
    `;
    
    const result = await this.query<{ avg_sentiment: number | null }>(query, [symbol, timeInterval]);
    return result[0]?.avg_sentiment || null;
  }

  async getSentimentTimeSeries(
    symbol: string,
    platform?: string,
    hours: number = 24
  ): Promise<SentimentScoreRow[]> {
    let query = `
      SELECT time, symbol, platform, sentiment_score, confidence, volume
      FROM social_data.sentiment_scores
      WHERE symbol = $1 AND time >= NOW() - INTERVAL '${hours} hours'
    `;
    
    const params = [symbol];
    
    if (platform) {
      query += ` AND platform = $2`;
      params.push(platform);
    }
    
    query += ` ORDER BY time DESC`;
    
    return await this.query<SentimentScoreRow>(query, params);
  }

  async getNewsImpact(
    symbol: string,
    hours: number = 24,
    minImportance: number = 0.3
  ): Promise<NewsImpactRow[]> {
    const query = `
      SELECT time, symbol, source, sentiment_score, importance, 
             price_impact, volume_spike
      FROM news_data.news_impact
      WHERE symbol = $1 
        AND time >= NOW() - INTERVAL '${hours} hours'
        AND importance >= $2
      ORDER BY importance DESC, time DESC
    `;
    
    return await this.query<NewsImpactRow>(query, [symbol, minImportance]);
  }

  async getNetworkMetrics(
    symbol: string,
    network: string,
    hours: number = 24
  ): Promise<NetworkMetricsRow[]> {
    const query = `
      SELECT time, symbol, network, active_addresses, transaction_count,
             transaction_volume, average_transaction_value, hash_rate,
             difficulty, block_time
      FROM onchain_data.network_metrics
      WHERE symbol = $1 AND network = $2
        AND time >= NOW() - INTERVAL '${hours} hours'
      ORDER BY time DESC
    `;
    
    return await this.query<NetworkMetricsRow>(query, [symbol, network]);
  }

  // =============================================================================
  // AGGREGATION QUERIES
  // =============================================================================

  async getMarketSummary(symbol: string): Promise<{
    current_price: number;
    price_change_24h: number;
    price_change_percent_24h: number;
    volume_24h: number;
    high_24h: number;
    low_24h: number;
  } | null> {
    const query = `
      WITH latest_candle AS (
        SELECT * FROM market_data.price_candles
        WHERE symbol = $1 AND timeframe = '1h'
        ORDER BY time DESC
        LIMIT 1
      ),
      candle_24h_ago AS (
        SELECT close_price FROM market_data.price_candles
        WHERE symbol = $1 AND timeframe = '1h'
          AND time <= (SELECT time FROM latest_candle) - INTERVAL '24 hours'
        ORDER BY time DESC
        LIMIT 1
      ),
      stats_24h AS (
        SELECT 
          MAX(high_price) as high_24h,
          MIN(low_price) as low_24h,
          SUM(volume) as volume_24h
        FROM market_data.price_candles
        WHERE symbol = $1 AND timeframe = '1h'
          AND time >= (SELECT time FROM latest_candle) - INTERVAL '24 hours'
      )
      SELECT 
        lc.close_price as current_price,
        lc.close_price - c24.close_price as price_change_24h,
        ((lc.close_price - c24.close_price) / c24.close_price) * 100 as price_change_percent_24h,
        s24.volume_24h,
        s24.high_24h,
        s24.low_24h
      FROM latest_candle lc
      CROSS JOIN candle_24h_ago c24
      CROSS JOIN stats_24h s24
    `;
    
    const result = await this.query(query, [symbol]);
    return result[0] || null;
  }

  async getTechnicalIndicators(symbol: string): Promise<{
    rsi_14: number;
    sma_20: number;
    sma_50: number;
    ema_12: number;
    ema_26: number;
  } | null> {
    const query = `
      WITH recent_candles AS (
        SELECT close_price, 
               ROW_NUMBER() OVER (ORDER BY time DESC) as rn
        FROM market_data.price_candles
        WHERE symbol = $1 AND timeframe = '1h'
        ORDER BY time DESC
        LIMIT 50
      ),
      price_changes AS (
        SELECT 
          close_price,
          close_price - LAG(close_price) OVER (ORDER BY rn DESC) as price_change,
          rn
        FROM recent_candles
        WHERE rn <= 14
      ),
      rsi_calc AS (
        SELECT 
          AVG(CASE WHEN price_change > 0 THEN price_change ELSE 0 END) as avg_gain,
          AVG(CASE WHEN price_change < 0 THEN ABS(price_change) ELSE 0 END) as avg_loss
        FROM price_changes
        WHERE price_change IS NOT NULL
      )
      SELECT 
        CASE 
          WHEN avg_loss = 0 THEN 100
          ELSE 100 - (100 / (1 + (avg_gain / avg_loss)))
        END as rsi_14,
        (SELECT AVG(close_price) FROM recent_candles WHERE rn <= 20) as sma_20,
        (SELECT AVG(close_price) FROM recent_candles WHERE rn <= 50) as sma_50,
        -- EMA calculations would need more complex queries
        NULL as ema_12,
        NULL as ema_26
      FROM rsi_calc
    `;
    
    const result = await this.query(query, [symbol]);
    return result[0] || null;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return result.length > 0;
    } catch (error) {
      // console.error('TimescaleDB health check failed:', error);
      return false;
    }
  }

  async getConnectionStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingCount: number;
  }> {
    return {
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private getCacheKey(query: string, params?: unknown[]): string {
    return `${query}:${JSON.stringify(params || [])}`;
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.config.cache.enabled) return null;
    
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.config.cache.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    if (!this.config.cache.enabled) return;
    
    // Implement LRU eviction
    if (this.queryCache.size >= this.config.cache.maxSize) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }
    
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > this.config.cache.ttl) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.queryCache.delete(key));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_TIMESCALEDB_CONFIG: Partial<TimescaleDBConfig> = {
  host: process.env.TIMESCALEDB_HOST || 'timescaledb.default.svc.cluster.local',
  port: parseInt(process.env.TIMESCALEDB_PORT || '5432'),
  database: process.env.TIMESCALEDB_DATABASE || 'coinet_timeseries',
  user: process.env.TIMESCALEDB_USER || 'coinet_context',
  password: process.env.TIMESCALEDB_PASSWORD || '',
  
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000'),
  },
  
  cache: {
    enabled: process.env.DB_CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.DB_CACHE_TTL || '300000'),
    maxSize: parseInt(process.env.DB_CACHE_MAX_SIZE || '1000'),
  },
};

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let dbManager: TimescaleDBManager | null = null;

export function getTimescaleDBManager(config?: Partial<TimescaleDBConfig>): TimescaleDBManager {
  if (!dbManager) {
    dbManager = new TimescaleDBManager({ ...DEFAULT_TIMESCALEDB_CONFIG, ...config });
  }
  return dbManager;
}

export async function closeTimescaleDBManager(): Promise<void> {
  if (dbManager) {
    await dbManager.close();
    dbManager = null;
  }
} 