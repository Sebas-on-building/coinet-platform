/**
 * =========================================
 * KAFKA PUBLISHER
 * =========================================
 * Divine world-class Kafka publisher for market signal processing
 * High-throughput, fault-tolerant publishing with batching and compression
 */

import { Kafka, Producer, CompressionTypes, logLevel, SASLOptions, Message } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { NormalizedMarketSignal, ProcessingContext, KafkaConfig, EnrichedMarketSignal } from '@/types';
import { Logger } from '@/utils/Logger';

/**
 * Advanced Kafka publisher with sophisticated batching and error handling
 */
export class KafkaPublisher {
  private kafka: Kafka;
  private producer: Producer;
  private logger: Logger;
  private isConnected: boolean = false;
  private pendingMessages: Array<{ topic: string; message: NormalizedMarketSignal; key: string | null }> = [];
  private batchTimer?: NodeJS.Timeout | undefined;
  private config: KafkaConfig;

  // Performance tracking
  private publishedCount: number = 0;
  private errorCount: number = 0;
  private averageLatency: number = 0;
  private lastPublishTime: number = 0;

  constructor(config: KafkaConfig) {
    this.config = config;
    this.logger = new Logger('KafkaPublisher');

    // Initialize Kafka client
    const kafkaConfig: any = {
      clientId: config.clientId || 'market-signal-processor',
      brokers: config.brokers,
      ssl: config.ssl ?? false,
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: 100,
        retries: 10,
        maxRetryTime: 30000,
      },
      requestTimeout: config.requestTimeoutMs || 30000,
    };

    if (config.sasl) {
      kafkaConfig.sasl = config.sasl;
    }

    this.kafka = new Kafka(kafkaConfig);

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 60000,
      idempotent: true,
      maxInFlightRequests: 5,
      // requestTimeout is not a valid property for ProducerConfig, it's for Kafka config
      // requestTimeout: config.requestTimeoutMs || 30000,
    });
  }

  /**
   * Initialize the Kafka publisher
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Kafka publisher...', {
        brokers: this.config.brokers,
        clientId: this.config.clientId,
      });

      await this.producer.connect();
      this.isConnected = true;

      // Start batch processing timer
      this.startBatchTimer();

      this.logger.info('✅ Kafka publisher initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Kafka publisher', error);
      throw error;
    }
  }

  /**
   * Shutdown the Kafka publisher gracefully
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Kafka publisher...');

      // Stop batch timer
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
        this.batchTimer = undefined;
      }

      // Flush any pending messages
      if (this.pendingMessages.length > 0) {
        await this.flushBatch();
      }

      // Disconnect producer
      await this.producer.disconnect();
      this.isConnected = false;

      this.logger.info('✅ Kafka publisher shutdown successfully');
    } catch (error: any) {
      this.logger.error('❌ Error during Kafka publisher shutdown', error);
      throw error;
    }
  }

  /**
   * Publish a normalized market signal to Kafka
   */
  async publishSignal(signal: NormalizedMarketSignal, context?: ProcessingContext): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka publisher not connected');
    }

    const startTime = Date.now();

    try {
      // Create message with proper key for partitioning
      const key = this.generatePartitionKey(signal);
      const message = {
        topic: this.config.topic,
        message: signal,
        key: key || null,
      };

      // Add to batch for efficient publishing
      this.pendingMessages.push(message);

      // Flush if batch is full
      if (this.pendingMessages.length >= (this.config.batchSize || 100)) {
        await this.flushBatch();
      }

      // Update metrics
      this.updateMetrics(startTime);

      if (context) {
        context.metadata.kafkaPublished = true;
        context.metadata.kafkaLatency = Date.now() - startTime;
      }

    } catch (error: any) {
      this.errorCount++;
      this.logger.error('Failed to publish signal to Kafka', error, {
        signalId: signal.id,
        symbol: signal.symbol,
        signalType: signal.signalType,
      });

      if (context) {
        context.errors.push(`Kafka publish failed: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Publish multiple signals in batch
   */
  async publishBatch(signals: NormalizedMarketSignal[], context?: ProcessingContext): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka publisher not connected');
    }

    if (signals.length === 0) return;

    const startTime = Date.now();

    try {
      // Create messages with proper keys
      const messages = signals.map(signal => ({
        topic: this.config.topic,
        message: signal,
        key: this.generatePartitionKey(signal) || null,
      }));

      // Add to pending messages
      this.pendingMessages.push(...messages);

      // Flush immediately for large batches
      if (this.pendingMessages.length >= (this.config.batchSize || 100)) {
        await this.flushBatch();
      }

      // Update metrics
      this.updateMetrics(startTime);

      if (context) {
        context.metadata.batchPublished = true;
        context.metadata.batchSize = signals.length;
        context.metadata.kafkaLatency = Date.now() - startTime;
      }

    } catch (error: any) {
      this.errorCount += signals.length;
      this.logger.error('Failed to publish batch to Kafka', error, {
        batchSize: signals.length,
        firstSignalId: signals[0]?.id,
      });

      if (context) {
        context.errors.push(`Kafka batch publish failed: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Flush pending messages to Kafka
   */
  private async flushBatch(): Promise<void> {
    if (this.pendingMessages.length === 0) return;

    const batchStartTime = Date.now();

    try {
      const messages: Message[] = this.pendingMessages.map(({ topic, message, key }) => ({
        topic,
        value: JSON.stringify(message),
        key: key || null, // Ensure key is string or null
        headers: {
          'x-signal-id': message.id || 'unknown',
          'x-timestamp': message.timestamp.toString(),
          'x-source': 'market-signal-processor',
          'x-version': '1.0.0',
        },
      }));

      await this.producer.send({
        topic: this.config.topic,
        messages,
        compression: this.getCompressionType(),
        timeout: this.config.requestTimeoutMs || 30000,
      });

      const batchSize = this.pendingMessages.length;
      this.publishedCount += batchSize;
      this.pendingMessages = [];

      const batchLatency = Date.now() - batchStartTime;
      this.updateAverageLatency(batchLatency);

      this.logger.debug('Batch published to Kafka', {
        batchSize,
        latency: batchLatency,
        totalPublished: this.publishedCount,
      });

    } catch (error: any) {
      this.errorCount += this.pendingMessages.length;
      this.logger.error('Failed to flush batch to Kafka', error, {
        batchSize: this.pendingMessages.length,
      });
      throw error;
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchTimer(): void {
    const lingerMs = this.config.lingerMs || 1000; // Default 1 second

    this.batchTimer = setInterval(async () => {
      if (this.pendingMessages.length > 0) {
        try {
          await this.flushBatch();
        } catch (error: any) {
          this.logger.error('Error in batch timer', error);
        }
      }
    }, lingerMs);
  }

  /**
   * Generate partition key for message routing
   */
  private generatePartitionKey(signal: NormalizedMarketSignal): string {
    if (this.config.partitionKey) {
      // Use specified field for partitioning
      const field = this.config.partitionKey as keyof NormalizedMarketSignal;
      const value = signal[field];

      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
    }

    // Default partitioning by exchange and symbol
    return `${signal.exchange}:${signal.symbol}`;
  }

  /**
   * Get compression type for Kafka messages
   */
  private getCompressionType(): CompressionTypes {
    switch (this.config.compression) {
      case 'gzip': return CompressionTypes.GZIP;
      case 'snappy': return CompressionTypes.Snappy; // Corrected SNAPPY enum
      case 'lz4': return CompressionTypes.LZ4;
      case 'zstd': return CompressionTypes.ZSTD;
      default: return CompressionTypes.None; // Corrected NONE enum
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(startTime: number): void {
    this.lastPublishTime = Date.now();
    const latency = this.lastPublishTime - startTime;

    // Update average latency using exponential moving average
    const alpha = 0.1; // Smoothing factor
    this.averageLatency = this.averageLatency * (1 - alpha) + latency * alpha;
  }

  private updateAverageLatency(latency: number): void {
    const alpha = 0.1; // Smoothing factor
    this.averageLatency = this.averageLatency * (1 - alpha) + latency * alpha;
  }

  /**
   * Get publisher health and metrics
   */
  getHealth() {
    return {
      connected: this.isConnected,
      pendingMessages: this.pendingMessages.length,
      publishedCount: this.publishedCount,
      errorCount: this.errorCount,
      averageLatency: Math.round(this.averageLatency),
      errorRate: this.publishedCount > 0 ? this.errorCount / this.publishedCount : 0,
      lastPublishTime: this.lastPublishTime,
    };
  }

  /**
   * Force flush any pending messages (useful for graceful shutdown)
   */
  async forceFlush(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.pendingMessages.length > 0) {
      await this.flushBatch();
    }
  }
}

/**
 * Factory for creating Kafka publishers with different configurations
 */
export class KafkaPublisherFactory {
  private static instances: Map<string, KafkaPublisher> = new Map();

  /**
   * Get or create a Kafka publisher instance
   */
  static getPublisher(config: KafkaConfig): KafkaPublisher {
    const key = `${config.brokers.join(',')}:${config.topic}:${config.clientId}`;

    if (!this.instances.has(key)) {
      this.instances.set(key, new KafkaPublisher(config));
    }

    return this.instances.get(key)!;
  }

  /**
   * Create a new publisher instance (always creates new instance)
   */
  static createPublisher(config: KafkaConfig): KafkaPublisher {
    return new KafkaPublisher(config);
  }

  /**
   * Shutdown all publisher instances
   */
  static async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.instances.values()).map(publisher =>
      publisher.shutdown().catch(error => {
        console.error('Error shutting down Kafka publisher:', error);
      })
    );

    await Promise.allSettled(shutdownPromises);
    this.instances.clear();
  }
}

/**
 * Signal normalizer for converting enriched signals to Kafka format
 */
export class SignalNormalizer {
  /**
   * Normalize an enriched signal for Kafka publishing
   */
  static normalizeForKafka(enrichedSignal: EnrichedMarketSignal): NormalizedMarketSignal {
    const normalized: NormalizedMarketSignal = {
      id: enrichedSignal.id || uuidv4(),
      exchange: enrichedSignal.exchange,
      symbol: enrichedSignal.symbol,
      timestamp: enrichedSignal.timestamp,
      signalType: enrichedSignal.signalType,
      assetType: enrichedSignal.assetType,
      normalizedAt: new Date(),
      normalizationVersion: '1.0.0',
      sourceId: enrichedSignal.id || uuidv4(),
    };

    // Add signal-specific data
    switch (enrichedSignal.signalType) {
      case 'trade':
        if (enrichedSignal.price !== undefined) normalized.price = enrichedSignal.price;
        if (enrichedSignal.volume !== undefined) normalized.volume = enrichedSignal.volume;
        if (enrichedSignal.side !== undefined) normalized.side = enrichedSignal.side;
        break;

      case 'quote':
        if (enrichedSignal.bid !== undefined) normalized.bid = enrichedSignal.bid;
        if (enrichedSignal.ask !== undefined) normalized.ask = enrichedSignal.ask;
        if (enrichedSignal.bidVolume !== undefined) normalized.bidVolume = enrichedSignal.bidVolume;
        if (enrichedSignal.askVolume !== undefined) normalized.askVolume = enrichedSignal.askVolume;
        if (enrichedSignal.spread !== undefined) normalized.spread = enrichedSignal.spread;
        if (enrichedSignal.midPrice !== undefined) normalized.midPrice = enrichedSignal.midPrice;
        break;

      case 'orderbook':
        // For orderbook, we might want to publish summary metrics
        // rather than full orderbook to reduce message size
        break;

      case 'liquidation':
        if (enrichedSignal.price !== undefined) normalized.price = enrichedSignal.price;
        if (enrichedSignal.volume !== undefined) normalized.volume = enrichedSignal.volume;
        if (enrichedSignal.side !== undefined) normalized.side = enrichedSignal.side;
        break;

      case 'funding_rate':
        if (enrichedSignal.fundingRate !== undefined) normalized.fundingRate = enrichedSignal.fundingRate;
        if (enrichedSignal.markPrice !== undefined) normalized.markPrice = enrichedSignal.markPrice;
        if (enrichedSignal.indexPrice !== undefined) normalized.indexPrice = enrichedSignal.indexPrice;
        break;

      case 'open_interest':
        if (enrichedSignal.openInterest !== undefined) normalized.openInterest = enrichedSignal.openInterest;
        if (enrichedSignal.change !== undefined) normalized.change = enrichedSignal.change;
        if (enrichedSignal.changePercent !== undefined) normalized.changePercent = enrichedSignal.changePercent;
        break;
    }

    // Add enriched metrics
    if (enrichedSignal.momentum) {
      normalized.momentumScore = enrichedSignal.momentum.momentumScore;
    }

    if (enrichedSignal.orderBookImbalance) {
      normalized.orderBookImbalance = enrichedSignal.orderBookImbalance.imbalanceScore;
    }

    if (enrichedSignal.liquidity) {
      normalized.liquidityScore = enrichedSignal.liquidity.liquidityScore;
    }

    if (enrichedSignal.volatility) {
      normalized.volatilityScore = enrichedSignal.volatility.volatilityScore;
    }

    return normalized;
  }

  /**
   * Normalize multiple enriched signals
   */
  static normalizeBatch(enrichedSignals: EnrichedMarketSignal[]): NormalizedMarketSignal[] {
    return enrichedSignals.map(signal => this.normalizeForKafka(signal));
  }
}
