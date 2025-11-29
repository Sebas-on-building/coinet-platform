/**
 * =========================================
 * KAFKA STREAMS
 * =========================================
 * Kafka Streams implementation for real-time signal processing
 */

import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type { KafkaConfig, StreamConfig, StreamMetrics, ProcessingError } from '../types';

export interface StreamProcessor {
  (signal: any): Promise<any>;
}

export interface StreamErrorHandler {
  (error: any, signal: any): void;
}

export interface StreamTopology {
  sourceTopics: string[];
  sinkTopics: string[];
  processor: StreamProcessor;
  errorHandler: StreamErrorHandler;
}

export class KafkaStreams extends EventEmitter {
  private logger: Logger;
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private config: KafkaConfig & StreamConfig;
  private isInitialized: boolean = false;
  private isConnected: boolean = false;
  private topology?: StreamTopology;
  private streamMetrics: Map<string, StreamMetrics> = new Map();

  constructor(kafkaConfig: KafkaConfig, streamConfig: StreamConfig) {
    super();
    this.logger = new Logger('KafkaStreams');
    this.config = { ...kafkaConfig, ...streamConfig };

    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000
    });

    this.consumer = this.kafka.consumer({
      groupId: kafkaConfig.groupId,
      sessionTimeout: kafkaConfig.sessionTimeout,
      heartbeatInterval: kafkaConfig.heartbeatInterval,
      maxBytesPerPartition: 1048576, // 1MB
      maxBytes: 5242880 // 5MB
    });

    this.admin = this.kafka.admin();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Kafka Streams...');

      // Connect to Kafka
      await this.connect();

      // Create topics if they don't exist
      await this.createTopics();

      // Set up producer
      await this.producer.connect();
      this.logger.info('✅ Kafka producer connected');

      // Set up consumer
      await this.consumer.connect();
      this.logger.info('✅ Kafka consumer connected');

      // Subscribe to input topics
      for (const topic of this.config.inputTopics) {
        await this.consumer.subscribe({
          topic,
          fromBeginning: false
        });

        this.streamMetrics.set(topic, {
          topic,
          partition: 0, // Will be updated when messages are received
          processedCount: 0,
          processedBytes: 0,
          errorCount: 0,
          avgLatency: 0,
          throughput: 0,
          lastProcessed: new Date()
        });
      }

      this.isInitialized = true;
      this.logger.info('✅ Kafka Streams initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Kafka Streams', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Kafka Streams...');

      if (this.consumer) {
        await this.consumer.disconnect();
      }

      if (this.producer) {
        await this.producer.disconnect();
      }

      if (this.admin) {
        await this.admin.disconnect();
      }

      this.isInitialized = false;
      this.isConnected = false;
      this.logger.info('✅ Kafka Streams stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop Kafka Streams', error);
      throw error;
    }
  }

  async getConnectionStatus(): Promise<boolean> {
    return this.isConnected;
  }

  createTopology(topology: StreamTopology): void {
    this.topology = topology;
    this.logger.info('Stream topology configured', {
      source_topics: topology.sourceTopics,
      sink_topics: topology.sinkTopics
    });
  }

  async startProcessing(): Promise<void> {
    if (!this.topology) {
      throw new Error('Stream topology not configured');
    }

    try {
      this.logger.info('Starting stream processing...');

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const startTime = Date.now();

          try {
            // Parse message
            const signal = JSON.parse(message.value?.toString() || '{}');

            // Update metrics
            this.updateStreamMetrics(topic, message.value?.length || 0, startTime);

            // Process signal
            const processedSignal = await this.topology!.processor(signal);

            if (processedSignal) {
              // Send to output topics
              await this.sendToOutputTopics(processedSignal);
            }

          } catch (error: any) {
            // Handle processing error
            this.updateStreamErrorMetrics(topic);

            if (this.topology?.errorHandler) {
              this.topology.errorHandler(error, message);
            }

            // Send to error topic
            await this.sendToErrorTopic(error, message);

            // Emit error event
            this.emit('error', {
              id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              signalId: message.key?.toString() || 'unknown',
              error_type: 'stream_processing_error',
              error_message: error.message,
              retry_count: 0,
              timestamp: new Date(),
              will_retry: false
            });
          }
        }
      });

      this.logger.info('✅ Stream processing started');

    } catch (error: any) {
      this.logger.error('❌ Failed to start stream processing', error);
      throw error;
    }
  }

  async sendToOutputTopics(processedSignal: any): Promise<void> {
    try {
      const messages = [];

      // Send to each output topic
      for (const topic of this.config.outputTopics) {
        messages.push({
          topic,
          value: JSON.stringify(processedSignal),
          headers: {
            'signal-id': processedSignal.id,
            'timestamp': new Date().toISOString(),
            'source': 'signal-evaluation-engine'
          }
        });
      }

      await this.producer.sendBatch({
        messages
      } as any);

    } catch (error: any) {
      this.logger.error('Failed to send to output topics', error);
      throw error;
    }
  }

  async sendToErrorTopic(error: any, originalMessage: any): Promise<void> {
    try {
      const errorMessage = {
        originalMessage,
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        },
        topic: this.config.errorTopic
      };

      await this.producer.send({
        topic: this.config.errorTopic,
        messages: [{
          value: JSON.stringify(errorMessage),
          headers: {
            'error-type': 'processing_error',
            'timestamp': new Date().toISOString()
          }
        }]
      });

    } catch (sendError: any) {
      this.logger.error('Failed to send to error topic', sendError);
    }
  }

  async produceEvent(topic: string, event: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{
          value: JSON.stringify(event),
          headers: {
            'event-type': event.type || 'generic',
            'timestamp': new Date().toISOString()
          }
        }]
      });

      this.logger.debug('Event produced successfully', { topic, event_type: event.type });
    } catch (error: any) {
      this.logger.error('Failed to produce event', { topic, error: error.message });
      throw error;
    }
  }

  async getStreamMetrics(): Promise<Record<string, StreamMetrics>> {
    const metrics: Record<string, StreamMetrics> = {};

    for (const [topic, metric] of this.streamMetrics) {
      metrics[topic] = metric;
    }

    return metrics;
  }

  getStatus(): string {
    if (!this.isInitialized) return 'Not Initialized';
    if (!this.isConnected) return 'Disconnected';
    return 'Connected';
  }

  private async connect(): Promise<void> {
    try {
      await this.admin.connect();
      this.isConnected = true;
      this.logger.info('✅ Connected to Kafka cluster');
    } catch (error: any) {
      this.logger.error('❌ Failed to connect to Kafka', error);
      throw error;
    }
  }

  private async createTopics(): Promise<void> {
    try {
      const allTopics = [
        ...this.config.inputTopics,
        ...this.config.outputTopics,
        this.config.errorTopic,
        this.config.deadLetterTopic
      ];

      const existingTopics = await this.admin.listTopics();
      const topicsToCreate = allTopics.filter(topic => !existingTopics.includes(topic));

      if (topicsToCreate.length > 0) {
        await this.admin.createTopics({
          topics: topicsToCreate.map(topic => ({
            topic,
            numPartitions: 3,
            replicationFactor: 1
          }))
        });

        this.logger.info(`Created ${topicsToCreate.length} topics: ${topicsToCreate.join(', ')}`);
      }

    } catch (error: any) {
      this.logger.error('Failed to create topics', error);
      // Don't throw - topics might already exist
    }
  }

  private updateStreamMetrics(topic: string, messageSize: number, startTime: number): void {
    const metrics = this.streamMetrics.get(topic);
    if (metrics) {
      metrics.processedCount++;
      metrics.processedBytes += messageSize;
      metrics.lastProcessed = new Date();

      // Update throughput (messages per second)
      const now = Date.now();
      const timeDiff = (now - startTime) / 1000;
      if (timeDiff > 0) {
        metrics.throughput = metrics.processedCount / timeDiff;
      }

      // Update average latency
      const latency = now - startTime;
      metrics.avgLatency = (metrics.avgLatency * (metrics.processedCount - 1) + latency) / metrics.processedCount;
    }
  }

  private updateStreamErrorMetrics(topic: string): void {
    const metrics = this.streamMetrics.get(topic);
    if (metrics) {
      metrics.errorCount++;
    }
  }
}
