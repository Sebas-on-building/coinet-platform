// =============================================================================
// COINET AI KAFKA PRODUCER INTEGRATION
// Streams real-time market data to Kafka for downstream processing
// =============================================================================

import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { EventEmitter } from 'events';

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  retries: number;
  retryDelayOnFailover: number;
}

export interface MarketDataMessage {
  timestamp: string;
  symbol: string;
  price: number;
  volume: number;
  change24h?: number;
  source: string;
  exchange: string;
}

export interface NewsMessage {
  timestamp: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  sentiment?: number;
  impact?: string;
}

export interface SocialMessage {
  timestamp: string;
  platform: string;
  content: string;
  author: string;
  engagement: number;
  sentiment?: number;
  coins_mentioned: string[];
}

export class KafkaProducerClient extends EventEmitter {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;

  constructor(config: KafkaConfig) {
    super();
    
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        retries: config.retries,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.producer.on('producer.connect', () => {
      console.log('✅ Kafka producer connected');
      this.isConnected = true;
      this.emit('connected');
    });

    this.producer.on('producer.disconnect', () => {
      console.log('⚠️ Kafka producer disconnected');
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.producer.on('producer.network.request_timeout', (payload) => {
      console.error('⚠️ Kafka producer network timeout:', payload);
      this.emit('error', new Error('Network timeout'));
    });
  }

  async connect(): Promise<void> {
    try {
      console.log('🔗 Connecting to Kafka...');
      await this.producer.connect();
    } catch (error) {
      console.error('❌ Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('📤 Disconnecting from Kafka...');
      await this.producer.disconnect();
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Failed to disconnect from Kafka:', error);
      throw error;
    }
  }

  async publishMarketData(data: MarketDataMessage): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const message: ProducerRecord = {
        topic: 'market-data-raw',
        messages: [{
          key: `${data.exchange}_${data.symbol}`,
          value: JSON.stringify({
            ...data,
            ingested_at: new Date().toISOString(),
          }),
          timestamp: new Date(data.timestamp).getTime().toString(),
        }],
      };

      await this.producer.send(message);
      this.emit('message_sent', { topic: 'market-data-raw', symbol: data.symbol });
      
    } catch (error) {
      console.error('❌ Failed to publish market data:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async publishNewsData(data: NewsMessage): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const message: ProducerRecord = {
        topic: 'news-raw',
        messages: [{
          key: data.source,
          value: JSON.stringify({
            ...data,
            ingested_at: new Date().toISOString(),
          }),
          timestamp: new Date(data.timestamp).getTime().toString(),
        }],
      };

      await this.producer.send(message);
      this.emit('message_sent', { topic: 'news-raw', source: data.source });
      
    } catch (error) {
      console.error('❌ Failed to publish news data:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async publishSocialData(data: SocialMessage): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const message: ProducerRecord = {
        topic: 'social-raw',
        messages: [{
          key: `${data.platform}_${data.author}`,
          value: JSON.stringify({
            ...data,
            ingested_at: new Date().toISOString(),
          }),
          timestamp: new Date(data.timestamp).getTime().toString(),
        }],
      };

      await this.producer.send(message);
      this.emit('message_sent', { topic: 'social-raw', platform: data.platform });
      
    } catch (error) {
      console.error('❌ Failed to publish social data:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async publishBatchData(messages: Array<{
    topic: string;
    key: string;
    value: any;
    timestamp?: string;
  }>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const recordsByTopic = new Map<string, any[]>();

      // Group messages by topic
      messages.forEach(msg => {
        if (!recordsByTopic.has(msg.topic)) {
          recordsByTopic.set(msg.topic, []);
        }
        recordsByTopic.get(msg.topic)!.push({
          key: msg.key,
          value: JSON.stringify({
            ...msg.value,
            ingested_at: new Date().toISOString(),
          }),
          timestamp: msg.timestamp ? new Date(msg.timestamp).getTime().toString() : undefined,
        });
      });

      // Send batched messages per topic
      const promises = Array.from(recordsByTopic.entries()).map(([topic, msgs]) => {
        return this.producer.send({
          topic,
          messages: msgs,
        });
      });

      await Promise.all(promises);
      this.emit('batch_sent', { topics: Array.from(recordsByTopic.keys()), count: messages.length });
      
    } catch (error) {
      console.error('❌ Failed to publish batch data:', error);
      this.emit('error', error);
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async getTopics(): Promise<string[]> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      const topics = await admin.listTopics();
      await admin.disconnect();
      return topics;
    } catch (error) {
      console.error('❌ Failed to get topics:', error);
      throw error;
    }
  }
}

// Default Kafka configuration for Coinet AI
export const createKafkaProducer = (overrides?: Partial<KafkaConfig>): KafkaProducerClient => {
  const defaultConfig: KafkaConfig = {
    brokers: [process.env.KAFKA_BROKERS || 'coinet-kafka:9092'],
    clientId: 'coinet-ingest-service',
    retries: 3,
    retryDelayOnFailover: 100,
  };

  const config = { ...defaultConfig, ...overrides };
  return new KafkaProducerClient(config);
}; 