// =============================================================================
// COINET AI TIMESCALEDB CLIENT - STREAMLINED FOR PRODUCTION
// Essential time-series data storage for market data
// =============================================================================

import { Pool, Client } from 'pg';
import { EventEmitter } from 'events';

export interface TimescaleDBConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface PriceCandleRow {
  time: Date;
  symbol: string;
  exchange: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quote_volume?: number;
  trade_count?: number;
}

export class TimescaleDBManager extends EventEmitter {
  private pool: Pool;
  private config: TimescaleDBConfig;
  private connected: boolean = false;

  constructor(config: TimescaleDBConfig) {
    super();
    this.config = config;
    
    this.pool = new Pool({
      host: config.host || 'timescaledb-ha',
      port: config.port || 5432,
      database: config.database || 'coinet_timeseries',
      user: config.username || 'coinet_ingest',
      password: config.password || 'ingest-2024!',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', () => {
      console.log('🔗 TimescaleDB client connected');
      this.connected = true;
      this.emit('connected');
    });

    this.pool.on('error', (err) => {
      console.error('❌ TimescaleDB pool error:', err);
      this.connected = false;
      this.emit('error', err);
    });
  }

  async connect(): Promise<void> {
    try {
      console.log('🔗 Connecting to TimescaleDB...');
      
      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ TimescaleDB connection verified:', result.rows[0]);
      client.release();
      
      this.connected = true;
      this.emit('connected');
      
    } catch (error) {
      console.error('❌ Failed to connect to TimescaleDB:', error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('📤 Disconnecting from TimescaleDB...');
      await this.pool.end();
      this.connected = false;
      console.log('✅ TimescaleDB disconnected');
      this.emit('disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from TimescaleDB:', error);
      throw error;
    }
  }

  async insertPriceCandle(candle: PriceCandleRow): Promise<void> {
    if (!this.connected) {
      throw new Error('TimescaleDB not connected');
    }

    try {
      const query = `
        INSERT INTO market_data.price_candles 
        (time, symbol, exchange, open, high, low, close, volume, quote_volume, trade_count, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (time, symbol, exchange) 
        DO UPDATE SET 
          open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume,
          quote_volume = EXCLUDED.quote_volume,
          trade_count = EXCLUDED.trade_count,
          created_at = NOW()
      `;

      const values = [
        candle.time,
        candle.symbol,
        candle.exchange,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
        candle.quote_volume || null,
        candle.trade_count || null,
      ];

      await this.pool.query(query, values);
      this.emit('candleInserted', candle);
      
    } catch (error) {
      console.error('❌ Failed to insert price candle:', error);
      this.emit('insertError', { candle, error });
      throw error;
    }
  }

  async getLatestCandles(symbol: string, limit: number = 100): Promise<PriceCandleRow[]> {
    if (!this.connected) {
      throw new Error('TimescaleDB not connected');
    }

    try {
      const query = `
        SELECT time, symbol, exchange, open, high, low, close, volume, quote_volume, trade_count
        FROM market_data.price_candles 
        WHERE symbol = $1 
        ORDER BY time DESC 
        LIMIT $2
      `;

      const result = await this.pool.query(query, [symbol, limit]);
      return result.rows.map(row => ({
        time: row.time,
        symbol: row.symbol,
        exchange: row.exchange,
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume),
        quote_volume: row.quote_volume ? parseFloat(row.quote_volume) : undefined,
        trade_count: row.trade_count || undefined,
      }));
      
    } catch (error) {
      console.error('❌ Failed to get latest candles:', error);
      throw error;
    }
  }

  async getCandleCount(): Promise<number> {
    if (!this.connected) {
      throw new Error('TimescaleDB not connected');
    }

    try {
      const result = await this.pool.query('SELECT COUNT(*) FROM market_data.price_candles');
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Failed to get candle count:', error);
      throw error;
    }
  }

  isConnectedToDatabase(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; stats?: any }> {
    try {
      if (!this.connected) {
        return { status: 'disconnected', timestamp: new Date().toISOString() };
      }

      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW(), COUNT(*) as total_candles FROM market_data.price_candles');
      client.release();

      return {
        status: 'healthy',
        timestamp: result.rows[0].now,
        stats: {
          totalCandles: parseInt(result.rows[0].total_candles),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export function createTimescaleDBManager(config: TimescaleDBConfig): TimescaleDBManager {
  return new TimescaleDBManager(config);
} 