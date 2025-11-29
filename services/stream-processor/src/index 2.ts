// =============================================================================
// COINET AI STREAM PROCESSOR SERVICE
// Real-time Kafka-ClickHouse integration with data transformation and monitoring
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { KafkaClientManager } from '../../context/src/config/kafka';
import { z } from 'zod';
import { EachMessagePayload } from 'kafkajs';

// =============================================================================
// CONFIGURATION SCHEMAS
// =============================================================================

const StreamProcessorConfigSchema = z.object({
  port: z.number().default(3003),
  clickhouse: z.object({
    host: z.string().default('coinet-clickhouse-0-0.default.svc.cluster.local'),
    port: z.number().default(8123),
    username: z.string().default('coinet_etl'),
    password: z.string().default('etl-readwrite-2024!'),
    database: z.string().default('coinet_analytics'),
  }),
  kafka: z.object({
    brokers: z.array(z.string()).default(['coinet-kafka:9092']),
    clientId: z.string().default('coinet-stream-processor'),
    groupId: z.string().default('stream-processor-group'),
  }),
  processing: z.object({
    batchSize: z.number().default(1000),
    flushInterval: z.number().default(10000),
    maxRetries: z.number().default(3),
    errorThreshold: z.number().default(0.05),
  }),
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsInterval: z.number().default(30000),
    healthCheckInterval: z.number().default(60000),
  }),
});

type StreamProcessorConfig = z.infer<typeof StreamProcessorConfigSchema>;

// =============================================================================
// DATA TRANSFORMATION SCHEMAS
// =============================================================================

const MarketDataSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  source: z.string(),
  version: z.string(),
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

const NewsDataSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  source: z.string(),
  version: z.string(),
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

const SocialDataSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  source: z.string(),
  version: z.string(),
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

const AIContextSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  source: z.string(),
  version: z.string(),
  type: z.literal('ai.context'),
  contextId: z.string(),
  symbol: z.string(),
  timeframe: z.enum(['5m', '15m', '1h', '4h', '1d']),
  data: z.object({
    market: z.unknown(),
    news: z.array(z.unknown()),
    social: z.array(z.unknown()),
    onChain: z.unknown().optional(),
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

// =============================================================================
// STREAM PROCESSOR CLASS
// =============================================================================

class StreamProcessor {
  private app: express.Application;
  private config: StreamProcessorConfig;
  private clickhouse!: ClickHouseClient;
  private kafka!: KafkaClientManager;
  private isRunning = false;
  private metrics = {
    processed: 0,
    errors: 0,
    lastProcessed: Date.now(),
    startTime: Date.now(),
    byType: {
      market: 0,
      news: 0,
      social: 0,
      ai: 0,
    },
  };

  constructor(config: Partial<StreamProcessorConfig> = {}) {
    this.config = StreamProcessorConfigSchema.parse(config);
    this.app = express();
    this.setupExpress();
    this.initializeClickHouse();
    this.initializeKafka();
  }

  private setupExpress(): void {
    // Security and middleware
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    });
    this.app.use('/api/', limiter);

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: Date.now() - this.metrics.startTime,
        isRunning: this.isRunning,
        metrics: this.metrics,
      });
    });

    // Metrics endpoint
    this.app.get('/api/metrics', (req, res) => {
      const runtime = Date.now() - this.metrics.startTime;
      const throughput = this.metrics.processed / (runtime / 1000);
      const errorRate = this.metrics.errors / Math.max(this.metrics.processed, 1);

      res.json({
        processed: this.metrics.processed,
        errors: this.metrics.errors,
        errorRate,
        throughput,
        runtime,
        lastProcessed: this.metrics.lastProcessed,
        byType: this.metrics.byType,
      });
    });

    // Pipeline status endpoint
    this.app.get('/api/pipeline/status', async (req, res) => {
      try {
        const status = await this.getPipelineStatus();
        res.json(status);
      } catch (error) {
        // console.error('Error getting pipeline status:', error);
        res.status(500).json({ error: 'Failed to get pipeline status' });
      }
    });

    // Data quality metrics endpoint
    this.app.get('/api/data-quality', async (req, res) => {
      try {
        const quality = await this.getDataQualityMetrics();
        res.json(quality);
      } catch (error) {
        // console.error('Error getting data quality metrics:', error);
        res.status(500).json({ error: 'Failed to get data quality metrics' });
      }
    });

    // Control endpoints
    this.app.post('/api/pipeline/start', async (req, res) => {
      try {
        await this.start();
        res.json({ message: 'Pipeline started successfully' });
      } catch (error) {
        // console.error('Error starting pipeline:', error);
        res.status(500).json({ error: 'Failed to start pipeline' });
      }
    });

    this.app.post('/api/pipeline/stop', async (req, res) => {
      try {
        await this.stop();
        res.json({ message: 'Pipeline stopped successfully' });
      } catch (error) {
        // console.error('Error stopping pipeline:', error);
        res.status(500).json({ error: 'Failed to stop pipeline' });
      }
    });
  }

  private initializeClickHouse(): void {
    this.clickhouse = createClient({
      host: `http://${this.config.clickhouse.host}:${this.config.clickhouse.port}`,
      username: this.config.clickhouse.username,
      password: this.config.clickhouse.password,
      database: this.config.clickhouse.database,
      compression: {
        response: true,
        request: true,
      },
    });
  }

  private initializeKafka(): void {
    this.kafka = new KafkaClientManager({
      brokers: this.config.kafka.brokers,
      clientId: this.config.kafka.clientId,
      consumer: {
        groupId: this.config.kafka.groupId,
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
    });
  }

  // =============================================================================
  // DATA PROCESSING METHODS
  // =============================================================================

  private async processMarketData(payload: EachMessagePayload): Promise<void> {
    try {
      const data = JSON.parse(payload.message.value?.toString() || '{}');
      const validated = MarketDataSchema.parse(data);

      // Transform data for ClickHouse
      const transformed = {
        id: validated.id,
        timestamp: new Date(validated.timestamp).toISOString(),
        source: validated.source,
        version: validated.version,
        type: validated.type,
        symbol: validated.symbol,
        exchange: validated.exchange,
        price: validated.price,
        volume: validated.volume,
        bid: validated.data?.bid || 0,
        ask: validated.data?.ask || 0,
        spread: validated.data?.spread || 0,
        change24h: validated.data?.change24h || 0,
        changePercent24h: validated.data?.changePercent24h || 0,
      };

      // Insert into ClickHouse via Kafka engine table
      await this.clickhouse.insert({
        table: 'market_analytics.kafka_market_data_queue',
        values: [transformed],
        format: 'JSONEachRow',
      });

      this.metrics.processed++;
      this.metrics.byType.market++;
      this.metrics.lastProcessed = Date.now();

    } catch (error) {
      // console.error('Error processing market data:', error);
      this.metrics.errors++;
      await this.handleProcessingError('market_data', payload, error as Error);
    }
  }

  private async processNewsData(payload: EachMessagePayload): Promise<void> {
    try {
      const data = JSON.parse(payload.message.value?.toString() || '{}');
      const validated = NewsDataSchema.parse(data);

      // Transform data for ClickHouse
      const transformed = {
        id: validated.id,
        timestamp: new Date(validated.timestamp).toISOString(),
        source: validated.source,
        version: validated.version,
        type: validated.type,
        title: validated.title,
        content: validated.content.substring(0, 10000), // Truncate long content
        publishedAt: new Date(validated.publishedAt).toISOString(),
        sentiment_score: validated.sentiment.score,
        sentiment_label: validated.sentiment.label,
        sentiment_confidence: validated.sentiment.confidence,
        symbols: validated.symbols,
        topics: validated.topics,
        importance: validated.importance,
      };

      // Insert into ClickHouse
      await this.clickhouse.insert({
        table: 'news_analytics.kafka_news_data_queue',
        values: [transformed],
        format: 'JSONEachRow',
      });

      this.metrics.processed++;
      this.metrics.byType.news++;
      this.metrics.lastProcessed = Date.now();

    } catch (error) {
      // console.error('Error processing news data:', error);
      this.metrics.errors++;
      await this.handleProcessingError('news_data', payload, error as Error);
    }
  }

  private async processSocialData(payload: EachMessagePayload): Promise<void> {
    try {
      const data = JSON.parse(payload.message.value?.toString() || '{}');
      const validated = SocialDataSchema.parse(data);

      // Transform data for ClickHouse
      const transformed = {
        id: validated.id,
        timestamp: new Date(validated.timestamp).toISOString(),
        source: validated.source,
        version: validated.version,
        type: validated.type,
        platform: validated.platform,
        content: validated.content.substring(0, 5000), // Truncate long content
        author_username: validated.author.username,
        author_followers: validated.author.followers || null,
        author_influence: validated.author.influence || null,
        sentiment_score: validated.sentiment.score,
        sentiment_label: validated.sentiment.label,
        sentiment_confidence: validated.sentiment.confidence,
        engagement_likes: validated.engagement.likes,
        engagement_shares: validated.engagement.shares,
        engagement_comments: validated.engagement.comments,
        symbols: validated.symbols,
      };

      // Insert into ClickHouse
      await this.clickhouse.insert({
        table: 'social_analytics.kafka_social_data_queue',
        values: [transformed],
        format: 'JSONEachRow',
      });

      this.metrics.processed++;
      this.metrics.byType.social++;
      this.metrics.lastProcessed = Date.now();

    } catch (error) {
      // console.error('Error processing social data:', error);
      this.metrics.errors++;
      await this.handleProcessingError('social_data', payload, error as Error);
    }
  }

  private async processAIContext(payload: EachMessagePayload): Promise<void> {
    try {
      const data = JSON.parse(payload.message.value?.toString() || '{}');
      const validated = AIContextSchema.parse(data);

      // Transform data for ClickHouse
      const transformed = {
        id: validated.id,
        timestamp: new Date(validated.timestamp).toISOString(),
        source: validated.source,
        version: validated.version,
        type: validated.type,
        contextId: validated.contextId,
        symbol: validated.symbol,
        timeframe: validated.timeframe,
        market_data: JSON.stringify(validated.data.market),
        news_data: JSON.stringify(validated.data.news),
        social_data: JSON.stringify(validated.data.social),
        onchain_data: validated.data.onChain ? JSON.stringify(validated.data.onChain) : null,
        aggregated_sentiment_overall: validated.data.aggregatedSentiment.overall,
        aggregated_sentiment_confidence: validated.data.aggregatedSentiment.confidence,
        aggregated_sentiment_trend: validated.data.aggregatedSentiment.trend,
        market_conditions_volatility: validated.data.marketConditions.volatility,
        market_conditions_momentum: validated.data.marketConditions.momentum,
        importance: validated.data.importance,
        completeness: validated.data.completeness,
      };

      // Insert into ClickHouse
      await this.clickhouse.insert({
        table: 'coinet_analytics.kafka_ai_context_queue',
        values: [transformed],
        format: 'JSONEachRow',
      });

      this.metrics.processed++;
      this.metrics.byType.ai++;
      this.metrics.lastProcessed = Date.now();

    } catch (error) {
      // console.error('Error processing AI context data:', error);
      this.metrics.errors++;
      await this.handleProcessingError('ai_context', payload, error as Error);
    }
  }

  private async handleProcessingError(
    dataType: string,
    payload: EachMessagePayload,
    error: Error
  ): Promise<void> {
    // Log error details
    // console.error(`Processing error for ${dataType}:`, {
    //   topic: payload.topic,
    //   partition: payload.partition,
    //   offset: payload.message.offset,
    //   error: error.message,
    //   value: payload.message.value?.toString(),
    // });

    // Store error in ClickHouse for analysis
    try {
      await this.clickhouse.insert({
        table: 'coinet_analytics.pipeline_alerts',
        values: [{
          timestamp: new Date().toISOString(),
          alert_type: 'processing_error',
          severity: 'error',
          source: dataType,
          message: error.message,
          metric_value: 1,
          threshold: 0,
          status: 'active',
        }],
        format: 'JSONEachRow',
      });
    } catch (insertError) {
      // console.error('Failed to insert error record:', insertError);
    }
  }

  // =============================================================================
  // MONITORING AND STATUS METHODS
  // =============================================================================

  private async getPipelineStatus(): Promise<unknown> {
    try {
      const result = await this.clickhouse.query({
        query: 'SELECT checkPipelineHealth() as health_status',
        format: 'JSONEachRow',
      });

      const healthData = await result.json();
      return {
        isRunning: this.isRunning,
        metrics: this.metrics,
        health: healthData as unknown,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      // console.error('Error getting pipeline status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        isRunning: this.isRunning,
        metrics: this.metrics,
        health: 'unknown',
        error: errorMessage,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private async getDataQualityMetrics(): Promise<unknown> {
    try {
      const result = await this.clickhouse.query({
        query: `
          SELECT 
            table_name,
            metric_type,
            metric_value,
            threshold_value,
            status,
            details,
            timestamp
          FROM coinet_analytics.data_quality_metrics 
          WHERE timestamp >= now() - INTERVAL 1 HOUR
          ORDER BY timestamp DESC
          LIMIT 100
        `,
        format: 'JSONEachRow',
      });

      const qualityData = await result.json<unknown[]>();
      return {
        metrics: Array.isArray(qualityData) ? qualityData : [],
        summary: this.calculateQualitySummary(Array.isArray(qualityData) ? qualityData : []),
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      // console.error('Error getting data quality metrics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        metrics: [],
        summary: {},
        error: errorMessage,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private calculateQualitySummary(qualityData: unknown[]): unknown {
    const summary = {
      totalChecks: qualityData.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      byTable: {} as Record<string, unknown>,
    };

    qualityData.forEach((metric: { status: string; table_name: string; }) => {
      if (metric.status === 'OK') summary.passed++;
      else if (metric.status === 'ERROR') summary.failed++;
      else if (metric.status === 'WARNING') summary.warnings++;

      if (!summary.byTable[metric.table_name]) {
        summary.byTable[metric.table_name] = {
          total: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
        };
      }

      summary.byTable[metric.table_name].total++;
      if (metric.status === 'OK') summary.byTable[metric.table_name].passed++;
      else if (metric.status === 'ERROR') summary.byTable[metric.table_name].failed++;
      else if (metric.status === 'WARNING') summary.byTable[metric.table_name].warnings++;
    });

    return summary;
  }

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  public async start(): Promise<void> {
    if (this.isRunning) {
      // console.log('Stream processor is already running');
      return;
    }

    // Connect to Kafka
    await this.kafka.connect();

    // Create consumers for different data types
    await this.kafka.createConsumer(
      'market-data-processor',
      ['market.price.processed'],
      this.processMarketData.bind(this)
    );

    await this.kafka.createConsumer(
      'news-data-processor',
      ['news.articles.processed'],
      this.processNewsData.bind(this)
    );

    await this.kafka.createConsumer(
      'social-data-processor',
      ['social.mentions.processed'],
      this.processSocialData.bind(this)
    );

    await this.kafka.createConsumer(
      'ai-context-processor',
      ['ai.context.assembled'],
      this.processAIContext.bind(this)
    );

    // Start monitoring
    if (this.config.monitoring.enabled) {
      this.startMonitoring();
    }

    this.isRunning = true;
    // console.log('Stream processor started successfully');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      // console.log('Stream processor is not running');
      return;
    }

    // Disconnect from Kafka
    await this.kafka.disconnect();

    this.isRunning = false;
    // console.log('Stream processor stopped successfully');
  }

  private startMonitoring(): void {
    setInterval(async () => {
      try {
        // Update ingestion metrics
        const runtime = Date.now() - this.metrics.startTime;
        const throughput = this.metrics.processed / (runtime / 1000);
        const errorRate = this.metrics.errors / Math.max(this.metrics.processed, 1);

        await this.clickhouse.insert({
          table: 'coinet_analytics.ingestion_metrics',
          values: [{
            timestamp: new Date().toISOString(),
            data_source: 'stream_processor',
            records_per_second: throughput,
            lag_seconds: (Date.now() - this.metrics.lastProcessed) / 1000,
            error_rate: errorRate,
            bytes_per_second: 0, // Would need to track actual bytes
            partition_count: 0,
            consumer_group: this.config.kafka.groupId,
          }],
          format: 'JSONEachRow',
        });

        // console.log(`Metrics updated - Processed: ${this.metrics.processed}, Errors: ${this.metrics.errors}, Throughput: ${throughput.toFixed(2)}/s`);

      } catch (error) {
        // console.error('Error updating metrics:', error);
      }
    }, this.config.monitoring.metricsInterval);
  }

  public listen(): void {
    this.app.listen(this.config.port, () => {
      // console.log(`Stream processor service listening on port ${this.config.port}`);
    });
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

const config = {
  port: parseInt(process.env.PORT || '3003'),
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'coinet-clickhouse-0-0.default.svc.cluster.local',
    port: parseInt(process.env.CLICKHOUSE_PORT || '8123'),
    username: process.env.CLICKHOUSE_USER || 'coinet_etl',
    password: process.env.CLICKHOUSE_PASSWORD || 'etl-readwrite-2024!',
    database: process.env.CLICKHOUSE_DATABASE || 'coinet_analytics',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'coinet-kafka:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'coinet-stream-processor',
    groupId: process.env.KAFKA_GROUP_ID || 'stream-processor-group',
  },
};

const processor = new StreamProcessor(config);

// Graceful shutdown
process.on('SIGTERM', async () => {
  // console.log('Received SIGTERM, shutting down gracefully');
  await processor.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  // console.log('Received SIGINT, shutting down gracefully');
  await processor.stop();
  process.exit(0);
});

// Start the service
async function main() {
  try {
    await processor.start();
    processor.listen();
  } catch (error) {
    // console.error('Failed to start stream processor:', error);
    process.exit(1);
  }
}

main().catch((_error: unknown) => { /* console.error(error) */ });

export { StreamProcessor }; 