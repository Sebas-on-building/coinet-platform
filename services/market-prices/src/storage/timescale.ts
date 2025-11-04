/**
 * TimescaleDB Storage Layer
 * Time-series storage for market data
 */

import { Pool, PoolClient } from 'pg';
import { MarketPrice, OHLCV, CoinMetadata, TickerData, DataSource } from '../types';
import { logger } from '../utils/logger';
import { ServiceConfig } from '../types';

export class TimescaleStorage {
  private pool: Pool;
  private initialized: boolean = false;

  constructor(config: ServiceConfig['database']) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err });
    });

    logger.info('TimescaleDB storage initialized', {
      host: config.host,
      database: config.database,
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create market_prices table
      await client.query(`
        CREATE TABLE IF NOT EXISTS market_prices (
          time TIMESTAMPTZ NOT NULL,
          symbol TEXT NOT NULL,
          coin_id TEXT NOT NULL,
          price DOUBLE PRECISION NOT NULL,
          price_change_24h DOUBLE PRECISION,
          price_change_percentage_24h DOUBLE PRECISION,
          market_cap DOUBLE PRECISION,
          volume_24h DOUBLE PRECISION,
          circulating_supply DOUBLE PRECISION,
          total_supply DOUBLE PRECISION,
          max_supply DOUBLE PRECISION,
          ath DOUBLE PRECISION,
          ath_date TIMESTAMPTZ,
          atl DOUBLE PRECISION,
          atl_date TIMESTAMPTZ,
          source TEXT NOT NULL,
          update_type TEXT NOT NULL,
          PRIMARY KEY (time, coin_id, source)
        );
      `);

      // Create hypertable
      await client.query(`
        SELECT create_hypertable('market_prices', 'time', 
          chunk_time_interval => INTERVAL '1 day',
          if_not_exists => TRUE
        );
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_market_prices_coin_id_time 
        ON market_prices (coin_id, time DESC);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_market_prices_symbol_time 
        ON market_prices (symbol, time DESC);
      `);

      // Create OHLCV table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ohlcv (
          time TIMESTAMPTZ NOT NULL,
          symbol TEXT NOT NULL,
          coin_id TEXT NOT NULL,
          open DOUBLE PRECISION NOT NULL,
          high DOUBLE PRECISION NOT NULL,
          low DOUBLE PRECISION NOT NULL,
          close DOUBLE PRECISION NOT NULL,
          volume DOUBLE PRECISION NOT NULL,
          source TEXT NOT NULL,
          PRIMARY KEY (time, coin_id, source)
        );
      `);

      // Create hypertable for OHLCV
      await client.query(`
        SELECT create_hypertable('ohlcv', 'time',
          chunk_time_interval => INTERVAL '7 days',
          if_not_exists => TRUE
        );
      `);

      // Create indexes for OHLCV
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ohlcv_coin_id_time 
        ON ohlcv (coin_id, time DESC);
      `);

      // Create coin_metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS coin_metadata (
          coin_id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          categories JSONB,
          platforms JSONB,
          links JSONB,
          image JSONB,
          genesis_date TIMESTAMPTZ,
          sentiment_votes_up_percentage DOUBLE PRECISION,
          sentiment_votes_down_percentage DOUBLE PRECISION,
          market_cap_rank INTEGER,
          coingecko_rank INTEGER,
          source TEXT NOT NULL,
          last_updated TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Create tickers table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tickers (
          time TIMESTAMPTZ NOT NULL,
          symbol TEXT NOT NULL,
          coin_id TEXT NOT NULL,
          base TEXT NOT NULL,
          target TEXT NOT NULL,
          market_name TEXT NOT NULL,
          market_identifier TEXT NOT NULL,
          last_price DOUBLE PRECISION NOT NULL,
          volume DOUBLE PRECISION NOT NULL,
          converted_last JSONB,
          converted_volume JSONB,
          trust_score TEXT,
          bid_ask_spread_percentage DOUBLE PRECISION,
          last_traded_at TIMESTAMPTZ,
          is_anomaly BOOLEAN,
          is_stale BOOLEAN,
          source TEXT NOT NULL,
          PRIMARY KEY (time, coin_id, market_identifier, source)
        );
      `);

      // Create hypertable for tickers
      await client.query(`
        SELECT create_hypertable('tickers', 'time',
          chunk_time_interval => INTERVAL '1 day',
          if_not_exists => TRUE
        );
      `);

      // Create continuous aggregates for common queries
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS market_prices_1h
        WITH (timescaledb.continuous) AS
        SELECT
          time_bucket('1 hour', time) AS bucket,
          coin_id,
          source,
          first(price, time) as open,
          max(price) as high,
          min(price) as low,
          last(price, time) as close,
          avg(price) as avg_price,
          avg(volume_24h) as avg_volume,
          avg(market_cap) as avg_market_cap
        FROM market_prices
        GROUP BY bucket, coin_id, source
        WITH NO DATA;
      `);

      // Add refresh policy
      await client.query(`
        SELECT add_continuous_aggregate_policy('market_prices_1h',
          start_offset => INTERVAL '3 hours',
          end_offset => INTERVAL '1 hour',
          schedule_interval => INTERVAL '1 hour',
          if_not_exists => TRUE
        );
      `);

      await client.query('COMMIT');

      this.initialized = true;
      logger.info('TimescaleDB schema initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to initialize TimescaleDB schema', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store market price
   */
  async storeMarketPrice(price: MarketPrice): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO market_prices (
          time, symbol, coin_id, price, price_change_24h, 
          price_change_percentage_24h, market_cap, volume_24h,
          circulating_supply, total_supply, max_supply,
          ath, ath_date, atl, atl_date, source, update_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (time, coin_id, source) DO UPDATE SET
          price = EXCLUDED.price,
          price_change_24h = EXCLUDED.price_change_24h,
          price_change_percentage_24h = EXCLUDED.price_change_percentage_24h,
          market_cap = EXCLUDED.market_cap,
          volume_24h = EXCLUDED.volume_24h,
          circulating_supply = EXCLUDED.circulating_supply,
          total_supply = EXCLUDED.total_supply,
          max_supply = EXCLUDED.max_supply,
          update_type = EXCLUDED.update_type`,
        [
          price.lastUpdated,
          price.symbol,
          price.coinId,
          price.price,
          price.priceChange24h,
          price.priceChangePercentage24h,
          price.marketCap,
          price.volume24h,
          price.circulatingSupply,
          price.totalSupply,
          price.maxSupply,
          price.ath,
          price.athDate,
          price.atl,
          price.atlDate,
          price.source,
          price.updateType,
        ]
      );

      logger.debug('Market price stored', { coinId: price.coinId, price: price.price });
    } catch (error) {
      logger.error('Failed to store market price', { error, price });
      throw error;
    }
  }

  /**
   * Store multiple market prices
   */
  async storeMarketPrices(prices: MarketPrice[]): Promise<void> {
    if (prices.length === 0) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const price of prices) {
        await client.query(
          `INSERT INTO market_prices (
            time, symbol, coin_id, price, price_change_24h, 
            price_change_percentage_24h, market_cap, volume_24h,
            circulating_supply, total_supply, max_supply,
            ath, ath_date, atl, atl_date, source, update_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (time, coin_id, source) DO UPDATE SET
            price = EXCLUDED.price,
            update_type = EXCLUDED.update_type`,
          [
            price.lastUpdated,
            price.symbol,
            price.coinId,
            price.price,
            price.priceChange24h,
            price.priceChangePercentage24h,
            price.marketCap,
            price.volume24h,
            price.circulatingSupply,
            price.totalSupply,
            price.maxSupply,
            price.ath,
            price.athDate,
            price.atl,
            price.atlDate,
            price.source,
            price.updateType,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Market prices stored in batch', { count: prices.length });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to store market prices batch', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store OHLCV data
   */
  async storeOHLCV(ohlcv: OHLCV[]): Promise<void> {
    if (ohlcv.length === 0) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const candle of ohlcv) {
        await client.query(
          `INSERT INTO ohlcv (
            time, symbol, coin_id, open, high, low, close, volume, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (time, coin_id, source) DO NOTHING`,
          [
            candle.timestamp,
            candle.symbol,
            candle.coinId,
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume,
            candle.source,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('OHLCV data stored', { count: ohlcv.length });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to store OHLCV data', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store coin metadata
   */
  async storeMetadata(metadata: CoinMetadata): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO coin_metadata (
          coin_id, symbol, name, description, categories, platforms,
          links, image, genesis_date, sentiment_votes_up_percentage,
          sentiment_votes_down_percentage, market_cap_rank, coingecko_rank,
          source, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (coin_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          categories = EXCLUDED.categories,
          platforms = EXCLUDED.platforms,
          links = EXCLUDED.links,
          image = EXCLUDED.image,
          genesis_date = EXCLUDED.genesis_date,
          sentiment_votes_up_percentage = EXCLUDED.sentiment_votes_up_percentage,
          sentiment_votes_down_percentage = EXCLUDED.sentiment_votes_down_percentage,
          market_cap_rank = EXCLUDED.market_cap_rank,
          coingecko_rank = EXCLUDED.coingecko_rank,
          source = EXCLUDED.source,
          last_updated = EXCLUDED.last_updated`,
        [
          metadata.coinId,
          metadata.symbol,
          metadata.name,
          metadata.description,
          JSON.stringify(metadata.categories),
          JSON.stringify(metadata.platforms),
          JSON.stringify(metadata.links),
          JSON.stringify(metadata.image),
          metadata.genesisDate,
          metadata.sentimentVotesUpPercentage,
          metadata.sentimentVotesDownPercentage,
          metadata.marketCapRank,
          metadata.coingeckoRank,
          metadata.source,
          metadata.lastUpdated,
        ]
      );

      logger.debug('Metadata stored', { coinId: metadata.coinId });
    } catch (error) {
      logger.error('Failed to store metadata', { error, metadata });
      throw error;
    }
  }

  /**
   * Get latest market price for a coin
   */
  async getLatestPrice(
    coinId: string,
    source?: DataSource
  ): Promise<MarketPrice | null> {
    try {
      const query = source
        ? 'SELECT * FROM market_prices WHERE coin_id = $1 AND source = $2 ORDER BY time DESC LIMIT 1'
        : 'SELECT * FROM market_prices WHERE coin_id = $1 ORDER BY time DESC LIMIT 1';
      
      const params = source ? [coinId, source] : [coinId];
      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.rowToMarketPrice(row);
    } catch (error) {
      logger.error('Failed to get latest price', { error, coinId });
      throw error;
    }
  }

  /**
   * Convert database row to MarketPrice
   */
  private rowToMarketPrice(row: any): MarketPrice {
    return {
      symbol: row.symbol,
      coinId: row.coin_id,
      price: parseFloat(row.price),
      priceChange24h: row.price_change_24h ? parseFloat(row.price_change_24h) : 0,
      priceChangePercentage24h: row.price_change_percentage_24h
        ? parseFloat(row.price_change_percentage_24h)
        : 0,
      marketCap: row.market_cap ? parseFloat(row.market_cap) : 0,
      volume24h: row.volume_24h ? parseFloat(row.volume_24h) : 0,
      circulatingSupply: row.circulating_supply ? parseFloat(row.circulating_supply) : undefined,
      totalSupply: row.total_supply ? parseFloat(row.total_supply) : undefined,
      maxSupply: row.max_supply ? parseFloat(row.max_supply) : undefined,
      ath: row.ath ? parseFloat(row.ath) : undefined,
      athDate: row.ath_date ? new Date(row.ath_date) : undefined,
      atl: row.atl ? parseFloat(row.atl) : undefined,
      atlDate: row.atl_date ? new Date(row.atl_date) : undefined,
      lastUpdated: new Date(row.time),
      source: row.source as DataSource,
      updateType: row.update_type as any,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('TimescaleDB connection pool closed');
  }
}

export default TimescaleStorage;

