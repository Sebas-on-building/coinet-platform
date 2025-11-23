// =============================================================================
// COINET AI INGEST SERVICE - MARKET DATA PROCESSOR
// Process, validate, and store market data across multiple databases
// =============================================================================

import { EventEmitter } from 'events';
import { Queue, Worker } from 'bullmq';
import { databaseManager } from '../config/database';
import { MarketDataPoint, TradeData, OrderBookData } from '../adapters/market/binanceAdapter';
import { z } from 'zod';

// Validation schemas
const ProcessedMarketDataSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.string().min(1),
  price: z.number().positive(),
  volume: z.number().nonnegative(),
  bid: z.number().positive().optional(),
  ask: z.number().positive().optional(),
  marketCap: z.number().positive().optional(),
  timestamp: z.number().positive(),
  metadata: z.any().optional(),
});

const ProcessedTradeDataSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.string().min(1),
  tradeId: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  amount: z.number().positive(),
  price: z.number().positive(),
  timestamp: z.number().positive(),
  metadata: z.any().optional(),
});

const ProcessedOrderBookSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.string().min(1),
  bids: z.array(z.tuple([z.number(), z.number()])),
  asks: z.array(z.tuple([z.number(), z.number()])),
  timestamp: z.number().positive(),
});

export interface ProcessingStats {
  marketDataCount: number;
  tradeDataCount: number;
  orderBookCount: number;
  errorCount: number;
  lastProcessedTime: number;
  processingRate: number; // records per second
  avgProcessingTime: number; // milliseconds
}

export interface AggregatedData {
  symbol: string;
  exchange: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
  vwap: number; // Volume Weighted Average Price
}

export class MarketDataProcessor extends EventEmitter {
  private marketDataQueue: Queue;
  private tradeDataQueue: Queue;
  private orderBookQueue: Queue;
  private aggregationQueue: Queue;
  
  private marketDataWorker: Worker;
  private tradeDataWorker: Worker;
  private orderBookWorker: Worker;
  private aggregationWorker: Worker;

  private stats: ProcessingStats;
  private startTime: number;
  private processingTimes: number[] = [];
  private aggregationBuffer: Map<string, AggregatedData> = new Map();
  private aggregationInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    this.stats = {
      marketDataCount: 0,
      tradeDataCount: 0,
      orderBookCount: 0,
      errorCount: 0,
      lastProcessedTime: 0,
      processingRate: 0,
      avgProcessingTime: 0,
    };
    
    this.startTime = Date.now();
    
    // Initialize job queues
    this.initializeQueues();
    
    // Initialize workers
    this.initializeWorkers();
    
    // Start aggregation process
    this.startAggregation();
  }

  private initializeQueues(): void {
    const redisConnection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.marketDataQueue = new Queue('market-data', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.tradeDataQueue = new Queue('trade-data', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.orderBookQueue = new Queue('order-book', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.aggregationQueue = new Queue('aggregation', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 2,
      },
    });
  }

  private initializeWorkers(): void {
    const redisConnection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    // Market data worker
    this.marketDataWorker = new Worker(
      'market-data',
      async (job) => {
        const startTime = Date.now();
        try {
          await this.processMarketData(job.data);
          this.updateProcessingStats(Date.now() - startTime);
        } catch (error) {
          this.stats.errorCount++;
          console.error('❌ Error processing market data:', error);
          throw error;
        }
      },
      {
        connection: redisConnection,
        concurrency: 10,
      }
    );

    // Trade data worker
    this.tradeDataWorker = new Worker(
      'trade-data',
      async (job) => {
        const startTime = Date.now();
        try {
          await this.processTradeData(job.data);
          this.updateProcessingStats(Date.now() - startTime);
        } catch (error) {
          this.stats.errorCount++;
          console.error('❌ Error processing trade data:', error);
          throw error;
        }
      },
      {
        connection: redisConnection,
        concurrency: 10,
      }
    );

    // Order book worker
    this.orderBookWorker = new Worker(
      'order-book',
      async (job) => {
        const startTime = Date.now();
        try {
          await this.processOrderBookData(job.data);
          this.updateProcessingStats(Date.now() - startTime);
        } catch (error) {
          this.stats.errorCount++;
          console.error('❌ Error processing order book data:', error);
          throw error;
        }
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    // Aggregation worker
    this.aggregationWorker = new Worker(
      'aggregation',
      async (job) => {
        try {
          await this.processAggregation(job.data);
        } catch (error) {
          console.error('❌ Error processing aggregation:', error);
          throw error;
        }
      },
      {
        connection: redisConnection,
        concurrency: 2,
      }
    );

    // Worker event handlers
    this.setupWorkerEventHandlers();
  }

  private setupWorkerEventHandlers(): void {
    const workers = [
      this.marketDataWorker,
      this.tradeDataWorker,
      this.orderBookWorker,
      this.aggregationWorker,
    ];

    workers.forEach((worker) => {
      worker.on('completed', (job) => {
        console.log(`✅ Job ${job.id} completed`);
      });

      worker.on('failed', (job, err) => {
        console.error(`❌ Job ${job?.id} failed:`, err);
        this.emit('processingError', { job: job?.data, error: err });
      });

      worker.on('error', (err) => {
        console.error('❌ Worker error:', err);
        this.emit('workerError', err);
      });
    });
  }

  // Main processing methods
  async processMarketDataPoint(data: MarketDataPoint): Promise<void> {
    try {
      // Validate data
      const validatedData = ProcessedMarketDataSchema.parse(data);
      
      // Add to processing queue
      await this.marketDataQueue.add('process-market-data', validatedData, {
        priority: this.getPriority(validatedData.symbol),
      });

      this.stats.marketDataCount++;
      this.emit('dataQueued', { type: 'marketData', symbol: data.symbol });
    } catch (error) {
      this.stats.errorCount++;
      console.error('❌ Invalid market data:', error);
      this.emit('validationError', { type: 'marketData', data, error });
    }
  }

  async processTradeDataPoint(data: TradeData): Promise<void> {
    try {
      // Validate data
      const validatedData = ProcessedTradeDataSchema.parse(data);
      
      // Add to processing queue
      await this.tradeDataQueue.add('process-trade-data', validatedData, {
        priority: this.getPriority(validatedData.symbol),
      });

      this.stats.tradeDataCount++;
      this.emit('dataQueued', { type: 'tradeData', symbol: data.symbol });
    } catch (error) {
      this.stats.errorCount++;
      console.error('❌ Invalid trade data:', error);
      this.emit('validationError', { type: 'tradeData', data, error });
    }
  }

  async processOrderBookPoint(data: OrderBookData): Promise<void> {
    try {
      // Validate data
      const validatedData = ProcessedOrderBookSchema.parse(data);
      
      // Add to processing queue with lower priority (high volume)
      await this.orderBookQueue.add('process-order-book', validatedData, {
        priority: 1, // Lower priority than trades
      });

      this.stats.orderBookCount++;
      this.emit('dataQueued', { type: 'orderBook', symbol: data.symbol });
    } catch (error) {
      this.stats.errorCount++;
      console.error('❌ Invalid order book data:', error);
      this.emit('validationError', { type: 'orderBook', data, error });
    }
  }

  // Database storage methods
  private async processMarketData(data: MarketDataPoint): Promise<void> {
    const client = await databaseManager.postgres.connect();
    
    try {
      // Store in TimescaleDB
      await client.query(`
        INSERT INTO market_data (time, symbol, exchange, price, volume, bid, ask, market_cap, metadata)
        VALUES (to_timestamp($1 / 1000.0), $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (time, symbol, exchange) DO UPDATE SET
          price = EXCLUDED.price,
          volume = EXCLUDED.volume,
          bid = EXCLUDED.bid,
          ask = EXCLUDED.ask,
          market_cap = EXCLUDED.market_cap,
          metadata = EXCLUDED.metadata;
      `, [
        data.timestamp,
        data.symbol,
        data.exchange,
        data.price,
        data.volume,
        data.bid || null,
        data.ask || null,
        data.marketCap || null,
        JSON.stringify(data.metadata || {}),
      ]);

      // Update aggregation buffer
      this.updateAggregationBuffer(data);

      // Cache latest price in Redis
      await databaseManager.redisClient.setex(
        `latest:${data.exchange}:${data.symbol}`,
        300, // 5 minutes TTL
        JSON.stringify({
          price: data.price,
          volume: data.volume,
          timestamp: data.timestamp,
          bid: data.bid,
          ask: data.ask,
        })
      );

      this.emit('dataProcessed', { type: 'marketData', symbol: data.symbol });
    } finally {
      client.release();
    }
  }

  private async processTradeData(data: TradeData): Promise<void> {
    const client = await databaseManager.postgres.connect();
    
    try {
      // Store in TimescaleDB
      await client.query(`
        INSERT INTO trading_data (time, symbol, exchange, trade_id, side, amount, price, metadata)
        VALUES (to_timestamp($1 / 1000.0), $2, $3, $4, $5, $6, $7, $8);
      `, [
        data.timestamp,
        data.symbol,
        data.exchange,
        data.tradeId,
        data.side,
        data.amount,
        data.price,
        JSON.stringify(data.metadata || {}),
      ]);

      // Update real-time trade statistics
      await this.updateTradeStatistics(data);

      this.emit('dataProcessed', { type: 'tradeData', symbol: data.symbol });
    } finally {
      client.release();
    }
  }

  private async processOrderBookData(data: OrderBookData): Promise<void> {
    // For order book data, we primarily cache in Redis for real-time access
    // and store snapshots periodically in the database
    
    const key = `orderbook:${data.exchange}:${data.symbol}`;
    
    await databaseManager.redisClient.setex(
      key,
      60, // 1 minute TTL
      JSON.stringify({
        bids: data.bids.slice(0, 10), // Top 10 bids
        asks: data.asks.slice(0, 10), // Top 10 asks
        timestamp: data.timestamp,
      })
    );

    // Calculate spread
    if (data.bids.length > 0 && data.asks.length > 0) {
      const bestBid = data.bids[0][0];
      const bestAsk = data.asks[0][0];
      const spread = bestAsk - bestBid;
      const spreadPercent = (spread / bestBid) * 100;

      await databaseManager.redisClient.setex(
        `spread:${data.exchange}:${data.symbol}`,
        60,
        JSON.stringify({
          spread,
          spreadPercent,
          bestBid,
          bestAsk,
          timestamp: data.timestamp,
        })
      );
    }

    this.emit('dataProcessed', { type: 'orderBook', symbol: data.symbol });
  }

  // Aggregation methods
  private updateAggregationBuffer(data: MarketDataPoint): void {
    const key = `${data.exchange}:${data.symbol}`;
    const existing = this.aggregationBuffer.get(key);

    if (!existing) {
      this.aggregationBuffer.set(key, {
        symbol: data.symbol,
        exchange: data.exchange,
        timestamp: Math.floor(data.timestamp / 60000) * 60000, // Round to minute
        open: data.price,
        high: data.price,
        low: data.price,
        close: data.price,
        volume: data.volume,
        trades: 1,
        vwap: data.price,
      });
    } else {
      existing.high = Math.max(existing.high, data.price);
      existing.low = Math.min(existing.low, data.price);
      existing.close = data.price;
      existing.volume += data.volume;
      existing.trades += 1;
      existing.vwap = ((existing.vwap * (existing.trades - 1)) + data.price) / existing.trades;
    }
  }

  private startAggregation(): void {
    // Aggregate data every minute
    this.aggregationInterval = setInterval(async () => {
      try {
        await this.flushAggregationBuffer();
      } catch (error) {
        console.error('❌ Error during aggregation:', error);
      }
    }, 60000); // 1 minute
  }

  private async flushAggregationBuffer(): Promise<void> {
    if (this.aggregationBuffer.size === 0) return;

    const aggregatedData = Array.from(this.aggregationBuffer.values());
    this.aggregationBuffer.clear();

    // Process aggregated data
    for (const data of aggregatedData) {
      await this.aggregationQueue.add('process-aggregation', data);
    }
  }

  private async processAggregation(data: AggregatedData): Promise<void> {
    // Store aggregated data in ClickHouse
    await databaseManager.clickhouse.insert({
      table: 'market_data_aggregated',
      values: [{
        date: new Date(data.timestamp).toISOString().split('T')[0],
        hour: new Date(data.timestamp).getHours(),
        symbol: data.symbol,
        exchange: data.exchange,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
        trades: data.trades,
        vwap: data.vwap,
      }],
      format: 'JSONEachRow',
    });

    this.emit('aggregationProcessed', data);
  }

  private async updateTradeStatistics(data: TradeData): Promise<void> {
    const key = `trade_stats:${data.exchange}:${data.symbol}`;
    const now = Date.now();
    const minute = Math.floor(now / 60000);

    // Update trade count for this minute
    await databaseManager.redisClient.hincrby(key, `${minute}:count`, 1);
    await databaseManager.redisClient.hincrby(key, `${minute}:volume`, Math.round(data.amount * 1000000));
    await databaseManager.redisClient.expire(key, 3600); // 1 hour TTL
  }

  // Utility methods
  private getPriority(symbol: string): number {
    // Higher priority for major cryptocurrencies
    const majorCryptos = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT'];
    return majorCryptos.includes(symbol) ? 10 : 5;
  }

  private updateProcessingStats(processingTime: number): void {
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000); // Keep last 1000
    }

    this.stats.lastProcessedTime = Date.now();
    this.stats.avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const totalProcessed = this.stats.marketDataCount + this.stats.tradeDataCount + this.stats.orderBookCount;
    this.stats.processingRate = totalProcessed / elapsed;
  }

  // Public methods
  async getStats(): Promise<ProcessingStats> {
    return { ...this.stats };
  }

  async getQueueStats(): Promise<any> {
    const [marketDataWaiting, tradeDataWaiting, orderBookWaiting, aggregationWaiting] = await Promise.all([
      this.marketDataQueue.getWaiting(),
      this.tradeDataQueue.getWaiting(),
      this.orderBookQueue.getWaiting(),
      this.aggregationQueue.getWaiting(),
    ]);

    return {
      marketData: { waiting: marketDataWaiting.length },
      tradeData: { waiting: tradeDataWaiting.length },
      orderBook: { waiting: orderBookWaiting.length },
      aggregation: { waiting: aggregationWaiting.length },
    };
  }

  async getLatestPrice(exchange: string, symbol: string): Promise<any> {
    const cached = await databaseManager.redisClient.get(`latest:${exchange}:${symbol}`);
    return cached ? JSON.parse(cached) : null;
  }

  async getOrderBook(exchange: string, symbol: string): Promise<any> {
    const cached = await databaseManager.redisClient.get(`orderbook:${exchange}:${symbol}`);
    return cached ? JSON.parse(cached) : null;
  }

  async getSpread(exchange: string, symbol: string): Promise<any> {
    const cached = await databaseManager.redisClient.get(`spread:${exchange}:${symbol}`);
    return cached ? JSON.parse(cached) : null;
  }

  // Cleanup
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down market data processor...');

    // Stop aggregation
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }

    // Flush remaining aggregation data
    await this.flushAggregationBuffer();

    // Close workers
    await Promise.all([
      this.marketDataWorker.close(),
      this.tradeDataWorker.close(),
      this.orderBookWorker.close(),
      this.aggregationWorker.close(),
    ]);

    // Close queues
    await Promise.all([
      this.marketDataQueue.close(),
      this.tradeDataQueue.close(),
      this.orderBookQueue.close(),
      this.aggregationQueue.close(),
    ]);

    console.log('✅ Market data processor shutdown complete');
  }
} 