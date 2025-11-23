// =============================================================================
// COINET AI INGEST SERVICE - CORE DATA PROCESSOR
// Streamlined data processing for real-time market intelligence
// =============================================================================

import { EventEmitter } from 'events';
import { databaseManager } from '../config/database';
import { MarketDataPoint, TradeData, OrderBookData } from '../adapters/market/binanceAdapter';

export interface ProcessorStats {
  processed: number;
  errors: number;
  rate: number;
  lastUpdate: number;
}

export class DataProcessor extends EventEmitter {
  private stats: ProcessorStats = {
    processed: 0,
    errors: 0,
    rate: 0,
    lastUpdate: Date.now(),
  };

  private rateTimer: NodeJS.Timeout;
  private lastCount = 0;

  constructor() {
    super();
    
    // Update processing rate every 10 seconds
    this.rateTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.stats.lastUpdate) / 1000;
      this.stats.rate = (this.stats.processed - this.lastCount) / elapsed;
      this.lastCount = this.stats.processed;
      this.stats.lastUpdate = now;
    }, 10000);
  }

  async processMarketData(data: MarketDataPoint): Promise<void> {
    try {
      // Store in TimescaleDB
      const client = await databaseManager.postgres.connect();
      
      await client.query(`
        INSERT INTO market_data (time, symbol, exchange, price, volume, bid, ask, market_cap, metadata)
        VALUES (to_timestamp($1 / 1000.0), $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (time, symbol, exchange) DO UPDATE SET
          price = EXCLUDED.price, volume = EXCLUDED.volume;
      `, [
        data.timestamp, data.symbol, data.exchange, data.price, data.volume,
        data.bid || null, data.ask || null, data.marketCap || null,
        JSON.stringify(data.metadata || {})
      ]);
      
      client.release();

      // Cache latest price
      await databaseManager.redisClient.setex(
        `price:${data.exchange}:${data.symbol}`,
        300,
        JSON.stringify({ price: data.price, timestamp: data.timestamp })
      );

      this.stats.processed++;
      this.emit('processed', { type: 'market', symbol: data.symbol });
      
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Market data processing error:', error);
      this.emit('error', { type: 'market', error, data });
    }
  }

  async processTradeData(data: TradeData): Promise<void> {
    try {
      const client = await databaseManager.postgres.connect();
      
      await client.query(`
        INSERT INTO trading_data (time, symbol, exchange, trade_id, side, amount, price, metadata)
        VALUES (to_timestamp($1 / 1000.0), $2, $3, $4, $5, $6, $7, $8);
      `, [
        data.timestamp, data.symbol, data.exchange, data.tradeId,
        data.side, data.amount, data.price, JSON.stringify(data.metadata || {})
      ]);
      
      client.release();

      this.stats.processed++;
      this.emit('processed', { type: 'trade', symbol: data.symbol });
      
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Trade data processing error:', error);
      this.emit('error', { type: 'trade', error, data });
    }
  }

  async processOrderBook(data: OrderBookData): Promise<void> {
    try {
      // Cache order book data in Redis
      await databaseManager.redisClient.setex(
        `orderbook:${data.exchange}:${data.symbol}`,
        60,
        JSON.stringify({
          bids: data.bids.slice(0, 10),
          asks: data.asks.slice(0, 10),
          timestamp: data.timestamp
        })
      );

      this.stats.processed++;
      this.emit('processed', { type: 'orderbook', symbol: data.symbol });
      
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Order book processing error:', error);
      this.emit('error', { type: 'orderbook', error, data });
    }
  }

  getStats(): ProcessorStats {
    return { ...this.stats };
  }

  async shutdown(): Promise<void> {
    if (this.rateTimer) {
      clearInterval(this.rateTimer);
    }
    console.log('✅ Data processor shutdown complete');
  }
} 