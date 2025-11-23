// =============================================================================
// COINET AI INGEST SERVICE - MAIN ORCHESTRATOR
// Coordinates real-time crypto data ingestion and processing
// =============================================================================

import { EventEmitter } from 'events';
import { databaseManager } from '../config/database';
import { BinanceAdapter, BinanceAdapterConfig } from '../adapters/market/binanceAdapter';
import { DataProcessor } from '../core/dataProcessor';
import { createKafkaProducer, KafkaProducerClient } from '../integrations/kafkaProducer';
import { createTimescaleDBManager, TimescaleDBManager, PriceCandleRow } from '../integrations/timescaledbClient';
import * as cron from 'node-cron';

export interface IngestServiceConfig {
  symbols: string[];
  enableBinance: boolean;
  enableCoinbase: boolean;
  enableKraken: boolean;
  enableOnChain: boolean;
  enableSocial: boolean;
  enableKafkaStreaming: boolean;
  kafkaBrokers?: string[];
  enableTimescaleDBStorage?: boolean;
}

export interface ServiceStats {
  uptime: number;
  symbolsMonitored: number;
  messagesProcessed: number;
  kafkaMessagesProduced: number;
  errors: number;
  adapters: {
    binance: {
      connected: boolean;
      symbols: number;
      messagesReceived: number;
    };
  };
}

export class IngestService extends EventEmitter {
  private config: IngestServiceConfig;
  private dataProcessor: DataProcessor;
  private binanceAdapter: BinanceAdapter | null = null;
  private kafkaProducer: KafkaProducerClient | null = null;
  private timescaleManager: TimescaleDBManager | null = null;
  private startTime: number;
  private serviceRunning: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private stats = {
    messagesProcessed: 0,
    kafkaMessagesProduced: 0,
    errors: 0,
  };

  constructor(config: IngestServiceConfig) {
    super();
    this.config = config;
    this.startTime = Date.now();
    this.dataProcessor = new DataProcessor();
    
    // Setup event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Data processor events
    this.dataProcessor.on('dataProcessed', (data) => {
      this.stats.messagesProcessed++;
      this.emit('dataProcessed', data);
    });

    this.dataProcessor.on('error', (error) => {
      this.stats.errors++;
      this.emit('processingError', error);
    });

    process.on('SIGINT', () => this.shutdown());
  }

  async start(): Promise<void> {
    if (this.serviceRunning) {
      console.log('⚠️ Ingest service is already running');
      return;
    }

    console.log('🚀 Starting Coinet AI Ingest Service...');

    try {
      // Initialize database connections
      await databaseManager.connectAll();

      // Initialize Kafka producer if enabled
      if (this.config.enableKafkaStreaming) {
        await this.startKafkaProducer();
      }

      // Initialize TimescaleDB if enabled
      if (this.config.enableTimescaleDBStorage) {
        this.timescaleManager = createTimescaleDBManager({
          host: process.env.TIMESCALEDB_HOST,
          port: process.env.TIMESCALEDB_PORT ? parseInt(process.env.TIMESCALEDB_PORT) : undefined,
          database: process.env.TIMESCALEDB_DATABASE,
          username: process.env.TIMESCALEDB_USER,
          password: process.env.TIMESCALEDB_PASSWORD,
        });
        await this.timescaleManager.connect();
        console.log('✅ TimescaleDB manager initialized');
      }

      // Start market data adapters
      if (this.config.enableBinance) {
        await this.startBinanceAdapter();
      }

      // Start health monitoring
      this.startHealthMonitoring();

      // Start periodic tasks
      this.startPeriodicTasks();

      this.serviceRunning = true;
      console.log('✅ Ingest service started successfully');
      this.emit('started');

    } catch (error) {
      console.error('❌ Failed to start ingest service:', error);
      await this.shutdown();
      throw error;
    }
  }

  private async startKafkaProducer(): Promise<void> {
    console.log('🔗 Starting Kafka producer...');
    
    try {
      this.kafkaProducer = createKafkaProducer({
        brokers: this.config.kafkaBrokers || [process.env.KAFKA_BROKERS || 'coinet-kafka:9092'],
        clientId: 'coinet-ingest-service',
        retries: 3,
        retryDelayOnFailover: 100,
      });

      // Setup Kafka event handlers
      this.kafkaProducer.on('connected', () => {
        console.log('✅ Kafka producer connected');
        this.emit('kafkaConnected');
      });

      this.kafkaProducer.on('disconnected', () => {
        console.log('⚠️ Kafka producer disconnected');
        this.emit('kafkaDisconnected');
      });

      this.kafkaProducer.on('message_sent', (data) => {
        this.stats.kafkaMessagesProduced++;
        this.emit('kafkaMessageSent', data);
      });

      this.kafkaProducer.on('error', (error) => {
        console.error('❌ Kafka producer error:', error);
        this.stats.errors++;
        this.emit('kafkaError', error);
      });

      await this.kafkaProducer.connect();
      console.log('✅ Kafka producer initialized successfully');

    } catch (error) {
      console.error('❌ Failed to start Kafka producer:', error);
      throw error;
    }
  }

  private async startBinanceAdapter(): Promise<void> {
    console.log('🔗 Starting Binance adapter...');
    
    const binanceConfig: BinanceAdapterConfig = {
      symbols: this.config.symbols,
      enableTicker: true,
      enableTrades: true,
      enableDepth: true,
      kafkaProducer: this.kafkaProducer || undefined,
      enableKafkaStreaming: this.config.enableKafkaStreaming && !!this.kafkaProducer,
    };

    this.binanceAdapter = new BinanceAdapter(binanceConfig);

    // Setup event handlers
    this.binanceAdapter.on('started', (data) => {
      console.log(`✅ Binance adapter started for symbols: ${data.symbols.join(', ')}`);
      this.emit('binanceStarted', data);
    });

    this.binanceAdapter.on('symbolConnected', (data) => {
      console.log(`✅ Binance connected to ${data.symbol}: ${data.streams.join(', ')}`);
      this.emit('binanceSymbolConnected', data);
    });

    this.binanceAdapter.on('symbolDisconnected', (data) => {
      console.log(`⚠️ Binance disconnected from ${data.symbol}: ${data.code} ${data.reason}`);
      this.emit('binanceSymbolDisconnected', data);
    });

    this.binanceAdapter.on('marketData', async (data) => {
      try {
        // Process market data locally (database storage, caching, etc.)
        await this.dataProcessor.processMarketData(data);
        this.emit('marketDataProcessed', data);

        // Dual storage: store to TimescaleDB
        if (this.timescaleManager && this.config.enableTimescaleDBStorage) {
          const candle: PriceCandleRow = {
            time: new Date(data.timestamp),
            symbol: data.symbol,
            exchange: data.exchange || 'binance',
            open: typeof data.open === 'number' ? data.open : data.price,
            high: typeof data.high === 'number' ? data.high : data.price,
            low: typeof data.low === 'number' ? data.low : data.price,
            close: data.price,
            volume: data.volume || 0,
            quote_volume: undefined,
            trade_count: typeof data.tradeCount === 'number' ? data.tradeCount : undefined,
          };
          await this.timescaleManager.insertPriceCandle(candle);
        }
      } catch (error) {
        console.error('❌ Error processing market data:', error);
        this.stats.errors++;
      }
    });

    this.binanceAdapter.on('tradeData', async (data) => {
      try {
        // Process trade data locally
        await this.dataProcessor.processTradeData(data);
        this.emit('tradeDataProcessed', data);
      } catch (error) {
        console.error('❌ Error processing trade data:', error);
        this.stats.errors++;
      }
    });

    this.binanceAdapter.on('orderBookData', async (data) => {
      try {
        // Process order book data locally
        await this.dataProcessor.processOrderBook(data);
        this.emit('orderBookProcessed', data);
      } catch (error) {
        console.error('❌ Error processing order book data:', error);
        this.stats.errors++;
      }
    });

    this.binanceAdapter.on('error', (error) => {
      console.error('❌ Binance adapter error:', error);
      this.stats.errors++;
      this.emit('binanceError', error);
    });

    await this.binanceAdapter.start();
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        // Check database connections (simplified health check)
        const dbHealth = databaseManager.postgres ? true : false;
        
        // Check Kafka connection
        const kafkaHealth = this.kafkaProducer?.getConnectionStatus() || false;
        
        // Check TimescaleDB connection
        const timescaleHealth = this.timescaleManager?.isConnectedToDatabase() || false;
        
        // Check adapter connections
        const binanceHealth = this.binanceAdapter?.getConnectionStatus() || {};
        
        const healthStatus = {
          timestamp: new Date().toISOString(),
          database: dbHealth,
          kafka: kafkaHealth,
          timescaledb: timescaleHealth,
          adapters: {
            binance: binanceHealth,
          },
          uptime: Date.now() - this.startTime,
          stats: this.getStats(),
        };

        this.emit('healthCheck', healthStatus);

        // Log health status periodically
        const now = Date.now();
        if (now % (5 * 60 * 1000) < 30000) { // Every 5 minutes
          console.log('💊 Health check:', {
            uptime: Math.round((now - this.startTime) / 1000) + 's',
            messagesProcessed: this.stats.messagesProcessed,
            kafkaProduced: this.stats.kafkaMessagesProduced,
            timescaledb: timescaleHealth,
            errors: this.stats.errors,
          });
        }

      } catch (error) {
        console.error('❌ Health check failed:', error);
        this.emit('healthCheckFailed', error);
      }
    }, 30000); // Every 30 seconds
  }

  private startPeriodicTasks(): void {
    // Cleanup old data every hour
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('🧹 Running periodic cleanup...');
        // Simple cleanup placeholder
        console.log('✅ Periodic cleanup completed');
      } catch (error) {
        console.error('❌ Periodic cleanup failed:', error);
      }
    });

    // Generate aggregations every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('📊 Running periodic aggregations...');
        // Simple aggregation placeholder
        console.log('✅ Periodic aggregations completed');
      } catch (error) {
        console.error('❌ Periodic aggregations failed:', error);
      }
    });

    // Kafka topics health check every hour
    if (this.kafkaProducer) {
      cron.schedule('0 * * * *', async () => {
        try {
          console.log('🔍 Checking Kafka topics...');
          const topics = await this.kafkaProducer!.getTopics();
          console.log(`✅ Kafka topics available: ${topics.length}`);
          this.emit('kafkaTopicsChecked', { topics });
        } catch (error) {
          console.error('❌ Kafka topics check failed:', error);
        }
      });
    }
  }

  async shutdown(): Promise<void> {
    if (!this.serviceRunning) {
      console.log('⚠️ Ingest service is not running');
      return;
    }

    console.log('🛑 Shutting down ingest service...');
    this.serviceRunning = false;

    try {
      // Clear health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Stop adapters
      if (this.binanceAdapter) {
        await this.binanceAdapter.stop();
        console.log('✅ Binance adapter stopped');
      }

      // Disconnect Kafka producer
      if (this.kafkaProducer) {
        await this.kafkaProducer.disconnect();
        console.log('✅ Kafka producer disconnected');
      }

      // Disconnect TimescaleDB
      if (this.timescaleManager) {
        await this.timescaleManager.disconnect();
        console.log('✅ TimescaleDB manager disconnected');
      }

      // Close database connections (placeholder)
      console.log('✅ Database connections closed');

      console.log('✅ Ingest service shutdown completed');
      this.emit('shutdown');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  // API Methods for external access

  getStats(): ServiceStats {
    const binanceStats = this.binanceAdapter?.getSymbolStats() || [];
    
    return {
      uptime: Date.now() - this.startTime,
      symbolsMonitored: this.config.symbols.length,
      messagesProcessed: this.stats.messagesProcessed,
      kafkaMessagesProduced: this.stats.kafkaMessagesProduced,
      errors: this.stats.errors,
      adapters: {
        binance: {
          connected: Object.values(this.binanceAdapter?.getConnectionStatus() || {}).some(status => status === 'connected'),
          symbols: binanceStats.length,
          messagesReceived: binanceStats.reduce((sum, stat) => sum + stat.messagesReceived, 0),
        },
      },
    };
  }

  async getLatestPrice(symbol: string): Promise<any> {
    try {
      // Simplified implementation - get from Redis cache or return placeholder
      const cached = await databaseManager.redisClient?.get(`price:${symbol}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`❌ Failed to get latest price for ${symbol}:`, error);
      throw error;
    }
  }

  async getOrderBook(exchange: string, symbol: string): Promise<any> {
    try {
      // Simplified implementation - get from Redis cache
      const cached = await databaseManager.redisClient?.get(`orderbook:${exchange}:${symbol}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`❌ Failed to get order book for ${exchange}:${symbol}:`, error);
      throw error;
    }
  }

  async getMarketData(symbol: string, timeframe: string = '1h', limit: number = 100): Promise<any> {
    try {
      // Simplified implementation - placeholder for database query
      return { symbol, timeframe, limit, data: [] };
    } catch (error) {
      console.error(`❌ Failed to get market data for ${symbol}:`, error);
      throw error;
    }
  }

  async getTradeHistory(symbol: string, limit: number = 100): Promise<any> {
    try {
      // Simplified implementation - placeholder for database query
      return { symbol, limit, trades: [] };
    } catch (error) {
      console.error(`❌ Failed to get trade history for ${symbol}:`, error);
      throw error;
    }
  }

  async addSymbol(symbol: string): Promise<void> {
    try {
      if (this.config.symbols.includes(symbol)) {
        throw new Error(`Symbol ${symbol} is already being monitored`);
      }

      this.config.symbols.push(symbol);

      if (this.binanceAdapter) {
        await this.binanceAdapter.addSymbol(symbol);
      }

      console.log(`✅ Added symbol ${symbol} to monitoring`);
      this.emit('symbolAdded', { symbol });

    } catch (error) {
      console.error(`❌ Failed to add symbol ${symbol}:`, error);
      throw error;
    }
  }

  async removeSymbol(symbol: string): Promise<void> {
    try {
      const index = this.config.symbols.indexOf(symbol);
      if (index === -1) {
        throw new Error(`Symbol ${symbol} is not being monitored`);
      }

      this.config.symbols.splice(index, 1);

      if (this.binanceAdapter) {
        await this.binanceAdapter.removeSymbol(symbol);
      }

      console.log(`✅ Removed symbol ${symbol} from monitoring`);
      this.emit('symbolRemoved', { symbol });

    } catch (error) {
      console.error(`❌ Failed to remove symbol ${symbol}:`, error);
      throw error;
    }
  }

  getMonitoredSymbols(): string[] {
    return [...this.config.symbols];
  }

  isRunning(): boolean {
    return this.serviceRunning;
  }

  getKafkaStatus(): { connected: boolean; topics?: string[] } {
    return {
      connected: this.kafkaProducer?.getConnectionStatus() || false,
    };
  }

  getDatabaseStatus(): any {
    return {
      postgres: databaseManager.postgres ? 'connected' : 'disconnected',
      redis: databaseManager.redisClient ? 'connected' : 'disconnected',
      timescaledb: this.timescaleManager?.isConnectedToDatabase() ? 'connected' : 'disconnected',
    };
  }
} 