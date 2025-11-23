/**
 * =========================================
 * GENERIC EXCHANGE FEED
 * =========================================
 * A placeholder for a generic exchange feed implementation.
 * In a real-world scenario, this would be extended by specific
 * exchange feed implementations (e.g., BinanceFeed, CoinbaseFeed).
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { ExchangeType, FeedConfig, ExchangeClient, MarketData } from '../types';
import { DataNormalizer } from '../normalizers/DataNormalizer';
import { TimestampSynchronizer } from '../synchronization/TimestampSynchronizer';
import { BufferManager } from '../buffering/BufferManager';
import { CircuitBreaker } from '../resilience/CircuitBreaker';
import { MetricsCollector } from '../monitoring/MetricsCollector';

// No longer importing GenericExchangeFeed from ../types or ../feeds as it's defined here

export interface GenericExchangeFeedConfig {
  id: string;
  exchange: ExchangeType;
  symbols: string[];
  config: FeedConfig;
  exchangeClient: ExchangeClient;
  dataNormalizer: DataNormalizer;
  timestampSynchronizer: TimestampSynchronizer;
  bufferManager: BufferManager;
  circuitBreaker: CircuitBreaker;
  metrics: MetricsCollector;
  logger: Logger;
}

export class GenericExchangeFeed extends EventEmitter {
  protected config: GenericExchangeFeedConfig;
  protected logger: Logger;
  protected isRunning: boolean = false;

  constructor(config: GenericExchangeFeedConfig) {
    super();
    this.config = config;
    this.logger = config.logger;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.logger.info(`Starting generic feed for ${this.config.exchange}...`);

    try {
      // Connect to exchange client (WebSocket)
      await this.config.exchangeClient.connect();

      // Subscribe to symbols and data types
      await this.config.exchangeClient.subscribe(this.config.symbols, this.config.config.dataTypes);

      // Listen for incoming messages from the exchange client
      this.config.exchangeClient.on('message', (rawData: any) => {
        const dataType = this.config.dataNormalizer.detectDataType(rawData, this.config.exchange);
        const normalizedData = this.config.dataNormalizer.normalize(rawData, this.config.exchange, dataType);

        if (normalizedData) {
          const synchronizedData = this.config.timestampSynchronizer.synchronize(normalizedData);
          this.emit('marketData', synchronizedData); // Emit synchronized data for further processing
        }
      });

      this.config.exchangeClient.on('error', (error: any) => {
        this.logger.error(`Exchange client error for ${this.config.exchange}: ${error.message}`);
        this.emit('feedError', error);
      });

      this.config.exchangeClient.on('reconnected', () => {
        this.logger.info(`Exchange client for ${this.config.exchange} reconnected`);
        this.emit('feedReconnected', this.config.id);
      });

      this.isRunning = true;
      this.logger.info(`Generic feed for ${this.config.exchange} started successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to start generic feed for ${this.config.exchange}: ${error.message}`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info(`Stopping generic feed for ${this.config.exchange}...`);

    try {
      // Unsubscribe from symbols and data types
      await this.config.exchangeClient.unsubscribe(this.config.symbols, this.config.config.dataTypes);

      // Disconnect from exchange client
      await this.config.exchangeClient.disconnect();

      this.isRunning = false;
      this.logger.info(`Generic feed for ${this.config.exchange} stopped successfully`);
    } catch (error: any) {
      this.logger.error(`Error stopping generic feed for ${this.config.exchange}: ${error.message}`, error);
      throw error;
    }
  }
}
