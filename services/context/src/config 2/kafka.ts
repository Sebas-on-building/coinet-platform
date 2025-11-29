// =============================================================================
// COINET AI CONTEXT SERVICE - KAFKA INTEGRATION
// High-performance Kafka producer/consumer client for real-time messaging
// =============================================================================

import { Kafka, Producer, Consumer, KafkaConfig, ProducerRecord, ConsumerConfig, EachMessagePayload } from 'kafkajs';
import { z } from 'zod';

// =============================================================================
// CONFIGURATION SCHEMAS
// =============================================================================

const KafkaClientConfigSchema = z.object({
  // Connection settings
  brokers: z.array(z.string()).default(['coinet-kafka:9092']),
  clientId: z.string().default('coinet-context-service'),
  connectionTimeout: z.number().default(3000),
  requestTimeout: z.number().default(30000),
  
  // SSL configuration
  ssl: z.object({
    enabled: z.boolean().default(false),
    rejectUnauthorized: z.boolean().default(false),
  }).default({}),
  
  // SASL authentication
  sasl: z.object({
    enabled: z.boolean().default(false),
    mechanism: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).default('plain'),
    username: z.string().optional(),
    password: z.string().optional(),
  }).default({}),
  
  // Producer configuration
  producer: z.object({
    maxInFlightRequests: z.number().default(5),
    idempotent: z.boolean().default(true),
    transactionTimeout: z.number().default(30000),
    acks: z.enum(['-1', '0', '1', 'all']).default('all'),
    retries: z.number().default(5),
    retry: z.object({
      initialRetryTime: z.number().default(300),
      maxRetryTime: z.number().default(30000),
      retries: z.number().default(5),
    }).default({}),
    compression: z.enum(['none', 'gzip', 'snappy', 'lz4', 'zstd']).default('snappy'),
    batchSize: z.number().default(65536),
    lingerMs: z.number().default(10),
  }).default({}),
  
  // Consumer configuration
  consumer: z.object({
    groupId: z.string().default('coinet-context-group'),
    sessionTimeout: z.number().default(30000),
    rebalanceTimeout: z.number().default(60000),
    heartbeatInterval: z.number().default(3000),
    metadataMaxAge: z.number().default(300000),
    allowAutoTopicCreation: z.boolean().default(false),
    maxBytesPerPartition: z.number().default(1048576),
    minBytes: z.number().default(1024),
    maxBytes: z.number().default(10485760),
    maxWaitTimeInMs: z.number().default(5000),
    retry: z.object({
      initialRetryTime: z.number().default(300),
      maxRetryTime: z.number().default(30000),
      retries: z.number().default(5),
    }).default({}),
  }).default({}),
  
  // Schema registry
  schemaRegistry: z.object({
    enabled: z.boolean().default(true),
    url: z.string().default('http://coinet-kafka-schema-registry:8081'),
  }).default({}),
  
  // Monitoring
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsInterval: z.number().default(30000),
  }).default({}),
});

export type KafkaClientConfig = z.infer<typeof KafkaClientConfigSchema>;

// =============================================================================
// MESSAGE SCHEMAS
// =============================================================================

// Base message schema
const BaseMessageSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  source: z.string(),
  version: z.string().default('1.0'),
});

// Market data message schemas
export const MarketPriceMessageSchema = BaseMessageSchema.extend({
  type: z.literal('market.price'),
  symbol: z.string(),
  price: z.number(),
  volume: z.number(),
  exchange: z.string(),
  data: z.object({
    bid: z.number().optional(),
    ask: z.number().optional(),
    spread: z.number().optional(),
    change24h: z.number().optional(),
    changePercent24h: z.number().optional(),
  }).optional(),
});

export const OrderBookMessageSchema = BaseMessageSchema.extend({
  type: z.literal('market.orderbook'),
  symbol: z.string(),
  exchange: z.string(),
  data: z.object({
    bestBid: z.number(),
    bestAsk: z.number(),
    bidQuantity: z.number(),
    askQuantity: z.number(),
    spread: z.number(),
    spreadPercent: z.number(),
  }),
});

// News message schema
export const NewsMessageSchema = BaseMessageSchema.extend({
  type: z.literal('news.article'),
  title: z.string(),
  content: z.string(),
  publishedAt: z.number(),
  sentiment: z.object({
    score: z.number().min(-1).max(1),
    label: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
  }),
  symbols: z.array(z.string()),
  topics: z.array(z.string()),
  importance: z.number().min(0).max(1),
});

// Social media message schema
export const SocialMessageSchema = BaseMessageSchema.extend({
  type: z.literal('social.mention'),
  platform: z.enum(['twitter', 'reddit', 'telegram', 'discord']),
  content: z.string(),
  author: z.object({
    username: z.string(),
    followers: z.number().optional(),
    influence: z.number().min(0).max(1).optional(),
  }),
  sentiment: z.object({
    score: z.number().min(-1).max(1),
    label: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
  }),
  engagement: z.object({
    likes: z.number().default(0),
    shares: z.number().default(0),
    comments: z.number().default(0),
  }),
  symbols: z.array(z.string()),
});

// AI context message schema
export const AIContextMessageSchema = BaseMessageSchema.extend({
  type: z.literal('ai.context'),
  contextId: z.string(),
  symbol: z.string(),
  timeframe: z.enum(['5m', '15m', '1h', '4h', '1d']),
  data: z.object({
    market: z.any(),
    news: z.array(z.any()),
    social: z.array(z.any()),
    onChain: z.any().optional(),
    aggregatedSentiment: z.object({
      overall: z.number().min(-1).max(1),
      confidence: z.number().min(0).max(1),
      trend: z.enum(['bullish', 'bearish', 'neutral']),
    }),
    marketConditions: z.object({
      volatility: z.enum(['low', 'medium', 'high']),
      momentum: z.enum(['strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish']),
    }),
    importance: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
  }),
});

// Alert message schema
export const AlertMessageSchema = BaseMessageSchema.extend({
  type: z.literal('alert'),
  alertType: z.enum(['price_movement', 'sentiment_extreme', 'whale_activity', 'news_breaking']),
  symbol: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  message: z.string(),
  data: z.any(),
  actionsRequired: z.array(z.string()).default([]),
});

export type MarketPriceMessage = z.infer<typeof MarketPriceMessageSchema>;
export type OrderBookMessage = z.infer<typeof OrderBookMessageSchema>;
export type NewsMessage = z.infer<typeof NewsMessageSchema>;
export type SocialMessage = z.infer<typeof SocialMessageSchema>;
export type AIContextMessage = z.infer<typeof AIContextMessageSchema>;
export type AlertMessage = z.infer<typeof AlertMessageSchema>;

// =============================================================================
// KAFKA CLIENT CLASS
// =============================================================================

export class KafkaClientManager {
  private kafka: Kafka;
  private producer?: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private config: KafkaClientConfig;
  private isConnected = false;

  constructor(config: Partial<KafkaClientConfig> = {}) {
    this.config = KafkaClientConfigSchema.parse({
      ...config,
      brokers: config.brokers || [process.env.KAFKA_BROKERS || 'coinet-kafka:9092'],
      clientId: config.clientId || process.env.KAFKA_CLIENT_ID || 'coinet-context-service',
    });

    // Initialize Kafka client
    const kafkaConfig: KafkaConfig = {
      clientId: this.config.clientId,
      brokers: this.config.brokers,
      connectionTimeout: this.config.connectionTimeout,
      requestTimeout: this.config.requestTimeout,
    };

    // Add SSL configuration if enabled
    if (this.config.ssl.enabled) {
      kafkaConfig.ssl = {
        rejectUnauthorized: this.config.ssl.rejectUnauthorized,
      };
    }

    // Add SASL authentication if enabled
    if (this.config.sasl.enabled && this.config.sasl.username && this.config.sasl.password) {
      kafkaConfig.sasl = {
        mechanism: this.config.sasl.mechanism as unknown as 'plain' | 'scram-sha-256' | 'scram-sha-512',
        username: this.config.sasl.username,
        password: this.config.sasl.password,
      };
    }

    this.kafka = new Kafka(kafkaConfig);
  }

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  async connect(): Promise<void> {
    if (this.isConnected) return;

    // Initialize producer
    this.producer = this.kafka.producer({
      maxInFlightRequests: this.config.producer.maxInFlightRequests,
      idempotent: this.config.producer.idempotent,
      transactionTimeout: this.config.producer.transactionTimeout,
      retry: {
        initialRetryTime: this.config.producer.retry.initialRetryTime,
        maxRetryTime: this.config.producer.retry.maxRetryTime,
        retries: this.config.producer.retry.retries,
      },
    });

    await this.producer.connect();
    this.isConnected = true;

    // console.log('Kafka client connected successfully');
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    // Disconnect all consumers
    for (const [_groupId, consumer] of this.consumers.entries()) {
      await consumer.disconnect();
      // console.log(`Consumer ${groupId} disconnected`);
    }
    this.consumers.clear();

    // Disconnect producer
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = undefined;
    }

    this.isConnected = false;
    // console.log('Kafka client disconnected successfully');
  }

  // =============================================================================
  // PRODUCER METHODS
  // =============================================================================

  async sendMessage<T>(topic: string, message: T, key?: string): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized. Call connect() first.');
    }

    try {
      const messagePayload: ProducerRecord = {
        topic,
        messages: [{
          key: key || undefined,
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
          headers: {
            'content-type': 'application/json',
            'producer': this.config.clientId,
          },
        }],
        acks: this.config.producer.acks as unknown as -1 | 0 | 1 | 'all',
        timeout: this.config.requestTimeout,
        compression: this.config.producer.compression as unknown as 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd',
      };

      await this.producer.send(messagePayload);
    } catch (error) {
      // console.error(`Failed to send message to topic ${topic}:`, error);
      throw new Error(`Failed to send message to topic ${topic}`);
    }
  }

  async sendBatch<T>(topic: string, messages: Array<{ key?: string; value: T }>): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized. Call connect() first.');
    }

    try {
      const messagePayload: ProducerRecord = {
        topic,
        messages: messages.map(msg => ({
          key: msg.key || undefined,
          value: JSON.stringify(msg.value),
          timestamp: Date.now().toString(),
          headers: {
            'content-type': 'application/json',
            'producer': this.config.clientId,
          },
        })),
        acks: this.config.producer.acks as unknown as -1 | 0 | 1 | 'all',
        timeout: this.config.requestTimeout,
        compression: this.config.producer.compression as unknown as 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd',
      };

      await this.producer.send(messagePayload);
    } catch (error) {
      // console.error(`Failed to send batch messages to topic ${topic}:`, error);
      throw new Error(`Failed to send batch messages to topic ${topic}`);
    }
  }

  // =============================================================================
  // CONSUMER METHODS
  // =============================================================================

  async createConsumer(
    groupId: string,
    topics: string[],
    messageHandler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    const consumerConfig: ConsumerConfig = {
      groupId,
      sessionTimeout: this.config.consumer.sessionTimeout,
      rebalanceTimeout: this.config.consumer.rebalanceTimeout,
      heartbeatInterval: this.config.consumer.heartbeatInterval,
      metadataMaxAge: this.config.consumer.metadataMaxAge,
      allowAutoTopicCreation: this.config.consumer.allowAutoTopicCreation,
      maxBytesPerPartition: this.config.consumer.maxBytesPerPartition,
      minBytes: this.config.consumer.minBytes,
      maxBytes: this.config.consumer.maxBytes,
      maxWaitTimeInMs: this.config.consumer.maxWaitTimeInMs,
      retry: {
        initialRetryTime: this.config.consumer.retry.initialRetryTime,
        maxRetryTime: this.config.consumer.retry.maxRetryTime,
        retries: this.config.consumer.retry.retries,
      },
    };

    const consumer = this.kafka.consumer(consumerConfig);
    await consumer.connect();
    await consumer.subscribe({ topics });

    await consumer.run({
      eachMessage: async (payload) => {
        try {
          await messageHandler(payload);
        } catch (error) {
          // console.error('Error processing message:', error);
          // Implement dead letter queue logic here
          await this.handleFailedMessage(payload, error as Error);
        }
      },
    });

    this.consumers.set(groupId, consumer);
    // console.log(`Consumer ${groupId} created and subscribed to topics:`, topics);
  }

  async stopConsumer(_groupId: string): Promise<void> {
    const consumer = this.consumers.get(_groupId);
    if (consumer) {
      await consumer.stop();
      await consumer.disconnect();
      this.consumers.delete(_groupId);
      // console.log(`Consumer ${groupId} stopped and disconnected`);
    }
  }

  // =============================================================================
  // SPECIALIZED MESSAGE METHODS
  // =============================================================================

  async publishMarketPrice(message: MarketPriceMessage): Promise<void> {
    const validatedMessage = MarketPriceMessageSchema.parse(message);
    await this.sendMessage('market.price.processed', validatedMessage, validatedMessage.symbol);
  }

  async publishOrderBook(message: OrderBookMessage): Promise<void> {
    const validatedMessage = OrderBookMessageSchema.parse(message);
    await this.sendMessage('market.orderbook.processed', validatedMessage, validatedMessage.symbol);
  }

  async publishNews(message: NewsMessage): Promise<void> {
    const validatedMessage = NewsMessageSchema.parse(message);
    await this.sendMessage('news.articles.processed', validatedMessage, validatedMessage.id);
  }

  async publishSocialMention(message: SocialMessage): Promise<void> {
    const validatedMessage = SocialMessageSchema.parse(message);
    await this.sendMessage('social.mentions.processed', validatedMessage, validatedMessage.id);
  }

  async publishAIContext(message: AIContextMessage): Promise<void> {
    const validatedMessage = AIContextMessageSchema.parse(message);
    await this.sendMessage('ai.context.assembled', validatedMessage, validatedMessage.symbol);
  }

  async publishAlert(message: AlertMessage): Promise<void> {
    const validatedMessage = AlertMessageSchema.parse(message);
    const topicMap = {
      price_movement: 'alerts.price.movement',
      sentiment_extreme: 'alerts.sentiment.extreme',
      whale_activity: 'alerts.whale.activity',
      news_breaking: 'alerts.news.breaking',
    };
    const topic = topicMap[validatedMessage.alertType];
    await this.sendMessage(topic, validatedMessage, validatedMessage.symbol);
  }

  // =============================================================================
  // ERROR HANDLING AND DEAD LETTER QUEUE
  // =============================================================================

  private async handleFailedMessage(payload: EachMessagePayload, error: Error): Promise<void> {
    const deadLetterMessage = {
      originalTopic: payload.topic,
      originalPartition: payload.partition,
      originalOffset: payload.message.offset,
      originalKey: payload.message.key?.toString(),
      originalValue: payload.message.value?.toString(),
      originalHeaders: payload.message.headers,
      errorMessage: error.message,
      errorStack: error.stack,
      failedAt: Date.now(),
      retryCount: 0,
    };

    // Determine dead letter topic based on original topic
    const deadLetterTopic = this.getDeadLetterTopic(payload.topic);
    
    try {
      await this.sendMessage(deadLetterTopic, deadLetterMessage);
      // console.log(`Message sent to dead letter queue: ${deadLetterTopic}`);
    } catch (dlqError) {
      // console.error('Failed to send message to dead letter queue:', dlqError);
    }
  }

  private getDeadLetterTopic(originalTopic: string): string {
    if (originalTopic.startsWith('market.')) return 'dead.letter.market.data';
    if (originalTopic.startsWith('news.')) return 'dead.letter.news.data';
    if (originalTopic.startsWith('social.')) return 'dead.letter.social.data';
    if (originalTopic.startsWith('onchain.')) return 'dead.letter.onchain.data';
    if (originalTopic.startsWith('ai.')) return 'dead.letter.ai.processing';
    return 'dead.letter.general';
  }

  // =============================================================================
  // HEALTH CHECK AND MONITORING
  // =============================================================================

  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) return false;

    // Try to get cluster metadata
    const admin = this.kafka.admin();
    await admin.connect();
    await admin.fetchTopicMetadata();
    await admin.disconnect();

    return true;
  }

  getConnectionStats(): {
    isConnected: boolean;
    producerConnected: boolean;
    activeConsumers: number;
    consumerGroups: string[];
  } {
    return {
      isConnected: this.isConnected,
      producerConnected: !!this.producer,
      activeConsumers: this.consumers.size,
      consumerGroups: Array.from(this.consumers.keys()),
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  generateMessageId(): string {
    return `${this.config.clientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createBaseMessage(type: string, source: string = 'context-service'): unknown {
    return {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      source,
      version: '1.0',
      type,
    };
  }
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_KAFKA_CONFIG: Partial<KafkaClientConfig> = {
  brokers: [process.env.KAFKA_BROKERS || 'coinet-kafka:9092'],
  clientId: process.env.KAFKA_CLIENT_ID || 'coinet-context-service',
  
  producer: {
    maxInFlightRequests: 5,
    idempotent: true,
    transactionTimeout: 30000,
    acks: 'all',
    retries: 5,
    retry: {
      initialRetryTime: 300,
      maxRetryTime: 30000,
      retries: 5,
    },
    compression: 'snappy',
    batchSize: 65536,
    lingerMs: 10,
  },
  
  consumer: {
    groupId: process.env.KAFKA_CONSUMER_GROUP || 'coinet-context-group',
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
    heartbeatInterval: 3000,
    metadataMaxAge: 300000,
    allowAutoTopicCreation: false,
    maxBytesPerPartition: 1048576,
    minBytes: 1024,
    maxBytes: 10485760,
    maxWaitTimeInMs: 5000,
    retry: {
      initialRetryTime: 300,
      maxRetryTime: 30000,
      retries: 5,
    },
  },
  
  monitoring: {
    enabled: process.env.KAFKA_MONITORING_ENABLED !== 'false',
    metricsInterval: 30000,
  },
};

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let kafkaManager: KafkaClientManager | null = null;

export function getKafkaManager(config?: Partial<KafkaClientConfig>): KafkaClientManager {
  if (!kafkaManager) {
    kafkaManager = new KafkaClientManager({ ...DEFAULT_KAFKA_CONFIG, ...config });
  }
  return kafkaManager;
}

export async function closeKafkaManager(): Promise<void> {
  if (kafkaManager) {
    await kafkaManager.disconnect();
    kafkaManager = null;
  }
} 