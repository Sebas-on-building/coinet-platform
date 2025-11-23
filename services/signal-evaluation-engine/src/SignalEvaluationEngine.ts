/**
 * =========================================
 * SIGNAL EVALUATION ENGINE
 * =========================================
 * Real-time signal evaluation engine with Kafka Streams processing
 * for millisecond-level signal processing and fusion engine updates
 */

import { EventEmitter } from 'events';
import { KafkaStreams } from './kafka/KafkaStreams';
import { SignalNormalizer } from './normalization/SignalNormalizer';
import { FeatureExtractor } from './features/FeatureExtractor';
import { FusionEngine } from './fusion/FusionEngine';
import { HealthMonitor } from './monitoring/HealthMonitor';
import { MetricsCollector } from './monitoring/MetricsCollector';
import { CacheManager } from './caching/CacheManager';
import { ConditionEvaluator } from './api/ConditionEvaluator';
import { AnomalyDetector } from './anomaly/AnomalyDetector';
import { Logger } from './utils/Logger';

import type {
  RawSignal,
  NormalizedSignal,
  FusionUpdate,
  SignalCondition,
  EvaluationResult,
  EngineMetrics,
  KafkaConfig,
  StreamConfig,
  NormalizationConfig,
  FeatureExtractionConfig,
  FusionConfig,
  EvaluationConfig,
  HealthStatus,
  StreamingEvent,
  ProcessingError,
  EvaluationRequest,
  EvaluationResponse,
  AnomalyConfig
} from './types';

export interface SignalEvaluationEngineConfig {
  kafka: KafkaConfig;
  streams: StreamConfig;
  normalization: NormalizationConfig;
  features: FeatureExtractionConfig;
  fusion: FusionConfig;
  evaluation: EvaluationConfig;
  anomaly: AnomalyConfig;
  conditions: SignalCondition[];
}

export class SignalEvaluationEngine extends EventEmitter {
  private kafkaStreams: KafkaStreams;
  private signalNormalizer: SignalNormalizer;
  private featureExtractor: FeatureExtractor;
  private fusionEngine: FusionEngine;
  private anomalyDetector: AnomalyDetector;
  private healthMonitor: HealthMonitor;
  private metricsCollector: MetricsCollector;
  private cacheManager: CacheManager;
  private conditionEvaluator: ConditionEvaluator;

  private logger: Logger;
  private config: SignalEvaluationEngineConfig;
  private isRunning: boolean = false;
  private startTime: number = Date.now();

  // Performance tracking
  private signalsProcessed: number = 0;
  private processingLatencies: number[] = [];
  private fusionUpdates: number = 0;

  constructor(config?: Partial<SignalEvaluationEngineConfig>) {
    super();
    this.logger = new Logger('SignalEvaluationEngine');

    // Default configuration
    this.config = {
      kafka: {
        brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
        clientId: 'signal-evaluation-engine',
        groupId: 'signal-evaluation-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxPollRecords: 500,
        autoCommit: false,
        autoCommitInterval: 5000
      },
      streams: {
        inputTopics: ['raw-signals', 'social-media-sentiment', 'news-aggregator', 'defi-protocol-metrics'],
        outputTopics: ['normalized-signals', 'fusion-updates', 'alerts'],
        errorTopic: 'signal-evaluation-errors',
        deadLetterTopic: 'signal-evaluation-dead-letters',
        processingTimeout: 30000,
        batchSize: 100,
        parallelism: 4,
        exactlyOnce: true
      },
      normalization: {
        method: 'z_score',
        windowSize: 1000,
        updateInterval: 60000, // 1 minute
        outlierThreshold: 3.0
      },
      features: {
        enabledFeatures: [
          'temporal', 'statistical', 'volatility', 'momentum',
          'correlation', 'trend', 'composite', 'anomaly'
        ],
        windowSizes: [60, 300, 900, 3600], // 1min, 5min, 15min, 1hr
        correlationThreshold: 0.7,
        volatilityWindow: 300, // 5 minutes
        momentumWindow: 900    // 15 minutes
      },
      fusion: {
        updateInterval: 5000,  // 5 seconds
        signalWeights: {
          social_media: 0.3,
          news: 0.4,
          defi_metrics: 0.2,
          on_chain: 0.1,
          price: 0.3,
          volume: 0.2,
          technical: 0.2,
          fundamental: 0.3
        },
        minSignals: 3,
        maxSignals: 20,
        decayFactor: 0.95,
        confidenceThreshold: 0.7
      },
      evaluation: {
        maxConcurrentEvaluations: 100,
        evaluationTimeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        cacheTtl: 300
      },
      anomaly: {
        signalTypes: ['price', 'volume', 'social_media', 'news', 'defi_metrics', 'on_chain', 'technical', 'fundamental'],
        windowSizes: [300, 900, 1800, 3600], // 5min, 15min, 30min, 1hr
        outlierThreshold: 3.0,
        maxBucketAge: 7200, // 2 hours
        signalConfigs: {
          price: {
            zScoreThreshold: 2.0,
            lowThreshold: 1.5,
            mediumThreshold: 2.0,
            highThreshold: 2.5,
            criticalThreshold: 3.0,
            sustainedPeriod: 30,
            minSustainedCount: 3,
            immediateAlert: false,
            alertChannels: ['alerts', 'price-alerts'],
            cooldownPeriod: 300,
            domainFilters: {
              businessHoursOnly: false,
              excludeWeekends: false,
              minValue: 0.01,
              maxValue: 1000000,
              maxVolatility: 0.5,
              minVolatility: 0.001
            }
          },
          volume: {
            zScoreThreshold: 2.5,
            lowThreshold: 2.0,
            mediumThreshold: 2.5,
            highThreshold: 3.0,
            criticalThreshold: 4.0,
            sustainedPeriod: 20,
            minSustainedCount: 2,
            immediateAlert: true,
            alertChannels: ['alerts', 'volume-alerts'],
            cooldownPeriod: 180,
            domainFilters: {
              businessHoursOnly: false,
              excludeWeekends: false,
              minValue: 1000,
              maxValue: 1000000000,
              maxVolatility: 1.0,
              minVolatility: 0.01
            }
          },
          social_media: {
            zScoreThreshold: 2.0,
            lowThreshold: 1.5,
            mediumThreshold: 2.0,
            highThreshold: 2.5,
            criticalThreshold: 3.5,
            sustainedPeriod: 60,
            minSustainedCount: 2,
            immediateAlert: false,
            alertChannels: ['alerts', 'social-alerts'],
            cooldownPeriod: 600,
            domainFilters: {
              businessHoursOnly: false,
              excludeWeekends: false,
              minValue: 0.1,
              maxValue: 100,
              maxVolatility: 0.8,
              minVolatility: 0.05
            }
          },
          news: {
            zScoreThreshold: 2.0,
            lowThreshold: 1.5,
            mediumThreshold: 2.0,
            highThreshold: 2.5,
            criticalThreshold: 3.0,
            sustainedPeriod: 45,
            minSustainedCount: 2,
            immediateAlert: false,
            alertChannels: ['alerts', 'news-alerts'],
            cooldownPeriod: 900,
            domainFilters: {
              businessHoursOnly: true,
              excludeWeekends: true,
              minValue: 0.1,
              maxValue: 10,
              maxVolatility: 0.6,
              minVolatility: 0.02
            }
          },
          defi_metrics: {
            zScoreThreshold: 2.5,
            lowThreshold: 2.0,
            mediumThreshold: 2.5,
            highThreshold: 3.0,
            criticalThreshold: 4.0,
            sustainedPeriod: 25,
            minSustainedCount: 2,
            immediateAlert: true,
            alertChannels: ['alerts', 'defi-alerts'],
            cooldownPeriod: 240,
            domainFilters: {
              businessHoursOnly: false,
              excludeWeekends: false,
              minValue: 0.001,
              maxValue: 1000000,
              maxVolatility: 0.7,
              minVolatility: 0.01
            }
          },
          on_chain: {
            zScoreThreshold: 2.0,
            lowThreshold: 1.5,
            mediumThreshold: 2.0,
            highThreshold: 2.5,
            criticalThreshold: 3.5,
            sustainedPeriod: 40,
            minSustainedCount: 2,
            immediateAlert: false,
            alertChannels: ['alerts', 'onchain-alerts'],
            cooldownPeriod: 480,
            domainFilters: {
              businessHoursOnly: false,
              excludeWeekends: false,
              minValue: 0.1,
              maxValue: 1000000,
              maxVolatility: 0.9,
              minVolatility: 0.02
            }
          },
          technical: {
            zScoreThreshold: 2.0,
            lowThreshold: 1.5,
            mediumThreshold: 2.0,
            highThreshold: 2.5,
            criticalThreshold: 3.0,
            sustainedPeriod: 35,
            minSustainedCount: 2,
            immediateAlert: false,
            alertChannels: ['alerts', 'technical-alerts'],
            cooldownPeriod: 360,
            domainFilters: {
              businessHoursOnly: true,
              excludeWeekends: false,
              minValue: 0.01,
              maxValue: 100,
              maxVolatility: 0.4,
              minVolatility: 0.005
            }
          },
          fundamental: {
            zScoreThreshold: 2.0,
            lowThreshold: 1.5,
            mediumThreshold: 2.0,
            highThreshold: 2.5,
            criticalThreshold: 3.0,
            sustainedPeriod: 90,
            minSustainedCount: 1,
            immediateAlert: false,
            alertChannels: ['alerts', 'fundamental-alerts'],
            cooldownPeriod: 1200,
            domainFilters: {
              businessHoursOnly: true,
              excludeWeekends: true,
              minValue: 0.01,
              maxValue: 1000000,
              maxVolatility: 0.3,
              minVolatility: 0.001
            }
          }
        }
      },
      conditions: [], // Will be loaded from external source
      ...config
    };

    // Initialize components
    this.kafkaStreams = new KafkaStreams(this.config.kafka, this.config.streams);
    this.signalNormalizer = new SignalNormalizer(this.config.normalization);
    this.featureExtractor = new FeatureExtractor(this.config.features);
    this.fusionEngine = new FusionEngine(this.config.fusion);
    this.anomalyDetector = new AnomalyDetector(this.config.anomaly);
    this.healthMonitor = new HealthMonitor();
    this.metricsCollector = new MetricsCollector();
    this.cacheManager = new CacheManager(this.config.evaluation.cacheTtl);
    this.conditionEvaluator = new ConditionEvaluator(this.config.conditions, this.config.evaluation);

    this.setupEventHandlers();
  }

  /**
   * Start the signal evaluation engine
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Signal Evaluation Engine...');

      // Initialize all components
      await this.kafkaStreams.initialize();
      await this.signalNormalizer.initialize();
      await this.featureExtractor.initialize();
      await this.fusionEngine.initialize();
      await this.anomalyDetector.initialize();
      await this.healthMonitor.initialize();
      await this.metricsCollector.initialize();
      await this.cacheManager.initialize();
      await this.conditionEvaluator.initialize();

      // Set up stream processing pipeline
      this.setupStreamProcessing();

      // Start periodic fusion updates
      this.startFusionUpdates();

      // Start metrics collection
      this.startMetricsCollection();

      this.isRunning = true;
      this.startTime = Date.now();

      this.logger.info('✅ Signal Evaluation Engine started successfully');
      this.logger.info(`Processing topics: ${this.config.streams.inputTopics.join(', ')}`);
      this.logger.info(`Output topics: ${this.config.streams.outputTopics.join(', ')}`);

    } catch (error: any) {
      this.logger.error('❌ Failed to start Signal Evaluation Engine', error);
      throw error;
    }
  }

  /**
   * Stop the signal evaluation engine
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Signal Evaluation Engine...');

      // Stop periodic updates
      this.stopFusionUpdates();
      this.stopMetricsCollection();

      // Stop all components
      await this.kafkaStreams.stop();
      await this.signalNormalizer.stop();
      await this.featureExtractor.stop();
      await this.fusionEngine.stop();
      await this.anomalyDetector.stop();
      await this.healthMonitor.stop();
      await this.metricsCollector.stop();
      await this.cacheManager.stop();
      await this.conditionEvaluator.stop();

      this.isRunning = false;
      this.logger.info('✅ Signal Evaluation Engine stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop Signal Evaluation Engine', error);
      throw error;
    }
  }

  /**
   * Evaluate signal conditions ad-hoc
   */
  async evaluateConditions(request: EvaluationRequest): Promise<EvaluationResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Evaluating signal conditions', {
        condition_id: request.conditionId,
        signal_count: request.signalIds.length
      });

      const results = await this.conditionEvaluator.evaluateConditions(
        request.conditionId,
        request.signalIds,
        request.timestamp
      );

      const executionTime = Date.now() - startTime;
      const response: EvaluationResponse = {
        request,
        results,
        executionTime,
        success: results.every((r: any) => r.status === 'completed'),
        errors: results.filter((r: any) => r.status === 'failed').map((r: any) => r.details.explanation)
      };

      this.logger.performance('condition_evaluation', executionTime, results.length);

      return response;

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Failed to evaluate conditions', error);

      return {
        request,
        results: [],
        executionTime,
        success: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Get current engine metrics
   */
  async getEngineMetrics(): Promise<EngineMetrics> {
    const uptime = Date.now() - this.startTime;
    const avgLatency = this.processingLatencies.length > 0
      ? this.processingLatencies.reduce((a, b) => a + b, 0) / this.processingLatencies.length
      : 0;

    return {
      totalSignalsProcessed: this.signalsProcessed,
      signalsPerSecond: this.signalsProcessed / Math.max(1, uptime / 1000),
      avgProcessingLatency: avgLatency,
      errorRate: await this.metricsCollector.getErrorRate(),
      activeConditions: this.config.conditions.filter(c => c.enabled).length,
      fusionUpdates: this.fusionUpdates,
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      },
      uptime,
      timestamp: new Date()
    };
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      is_running: this.isRunning,
      uptime_seconds: uptimeSeconds,
      kafka_connected: await this.kafkaStreams.getConnectionStatus(),
      redis_connected: await this.cacheManager.isConnected(),
      processing_active: this.isRunning,
      stream_metrics: await this.kafkaStreams.getStreamMetrics(),
      engine_metrics: await this.getEngineMetrics(),
      memory_usage: {
        heap_used_mb: process.memoryUsage().heapUsed / 1024 / 1024,
        heap_total_mb: process.memoryUsage().heapTotal / 1024 / 1024,
        external_mb: process.memoryUsage().external / 1024 / 1024
      }
    };
  }

  /**
   * Get current service status
   */
  getStatus(): string {
    const components = [
      `Kafka: ${this.kafkaStreams.getStatus()}`,
      `Normalizer: ${this.signalNormalizer.getStatus()}`,
      `Features: ${this.featureExtractor.getStatus()}`,
      `Fusion: ${this.fusionEngine.getStatus()}`,
      `Anomaly: ${this.anomalyDetector.getStatus()}`,
      `Health: ${this.healthMonitor.getStatus()}`,
      `Metrics: ${this.metricsCollector.getStatus()}`
    ];

    return this.isRunning ? `Running (${components.join(', ')})` : 'Stopped';
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Handle normalized signals from stream processing
    this.signalNormalizer.on('normalized', (normalizedSignal: NormalizedSignal) => {
      this.handleNormalizedSignal(normalizedSignal);
    });

    // Handle fusion updates
    this.fusionEngine.on('fusion_update', (fusionUpdate: FusionUpdate) => {
      this.handleFusionUpdate(fusionUpdate);
    });

    // Handle anomaly detection events
    this.anomalyDetector.on('anomaly_detected', (anomalyEvent: any) => {
      this.handleAnomalyDetected(anomalyEvent);
    });

    // Handle errors
    this.kafkaStreams.on('error', (error: ProcessingError) => {
      this.handleProcessingError(error);
    });
  }

  private setupStreamProcessing(): void {
    // Set up Kafka Streams topology
    this.kafkaStreams.createTopology({
      sourceTopics: this.config.streams.inputTopics,
      sinkTopics: this.config.streams.outputTopics,
      processor: async (signal: RawSignal) => {
        return await this.processSignal(signal);
      },
      errorHandler: (error: any, signal: RawSignal) => {
        this.handleStreamError(error, signal);
      }
    });
  }

  private async processSignal(rawSignal: RawSignal): Promise<NormalizedSignal | null> {
    const startTime = Date.now();

    try {
      // Normalize the signal
      const normalizedSignal = await this.signalNormalizer.normalize(rawSignal);

      // Extract features
      const features = await this.featureExtractor.extractFeatures(normalizedSignal);

      // Update normalized signal with features
      normalizedSignal.features = features;

      // Check for anomalies
      const anomalyEvents = await this.anomalyDetector.detectAnomalies(normalizedSignal);

      // Emit anomaly events if any detected
      for (const anomalyEvent of anomalyEvents) {
        this.emit('anomaly_detected', {
          type: 'anomaly_detected',
          data: anomalyEvent,
          timestamp: new Date()
        } as StreamingEvent);
      }

      // Emit normalized signal
      this.emit('signal_processed', {
        type: 'signal_processed',
        data: normalizedSignal,
        timestamp: new Date()
      } as StreamingEvent);

      // Record processing metrics
      this.signalsProcessed++;
      this.processingLatencies.push(Date.now() - startTime);

      // Log performance
      this.logger.processing('signal_processing', Date.now() - startTime, {
        signal_id: rawSignal.id,
        signal_type: rawSignal.type,
        source: rawSignal.source,
        anomalies_detected: anomalyEvents.length
      });

      return normalizedSignal;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Failed to process signal', {
        signal_id: rawSignal.id,
        error: error.message,
        processing_time_ms: processingTime
      });

      // Emit error event
      this.emit('error', {
        type: 'error',
        data: {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          signalId: rawSignal.id,
          error_type: 'processing_error',
          error_message: error.message,
          retry_count: 0,
          timestamp: new Date(),
          will_retry: false
        } as ProcessingError,
        timestamp: new Date()
      } as StreamingEvent);

      return null;
    }
  }

  private async handleNormalizedSignal(normalizedSignal: NormalizedSignal): Promise<void> {
    try {
      // Update fusion engine
      await this.fusionEngine.updateWithSignal(normalizedSignal);

      // Evaluate conditions
      const conditionResults = await this.conditionEvaluator.evaluateSignal(normalizedSignal);

      // Emit condition evaluation results
      for (const result of conditionResults) {
        this.emit('condition_evaluated', {
          type: 'condition_evaluated',
          data: result,
          timestamp: new Date()
        } as StreamingEvent);
      }

    } catch (error: any) {
      this.logger.error('Failed to handle normalized signal', {
        signal_id: normalizedSignal.id,
        error: error.message
      });
    }
  }

  private async handleFusionUpdate(fusionUpdate: FusionUpdate): Promise<void> {
    try {
      this.fusionUpdates++;

      // Emit fusion update
      this.emit('fusion_updated', {
        type: 'fusion_updated',
        data: fusionUpdate,
        timestamp: new Date()
      } as StreamingEvent);

      this.logger.fusion('Fusion updated', {
        fusion_score: fusionUpdate.fusionScore,
        signal_count: fusionUpdate.signals.length,
        confidence: fusionUpdate.confidence
      });

    } catch (error: any) {
      this.logger.error('Failed to handle fusion update', error);
    }
  }

  private async handleAnomalyDetected(anomalyEvent: any): Promise<void> {
    try {
      this.logger.anomaly('Anomaly event processed', {
        anomaly_id: anomalyEvent.id,
        signal_type: anomalyEvent.signalType,
        severity: anomalyEvent.severity,
        z_score: anomalyEvent.zScore,
        sustained: anomalyEvent.isSustained
      });

      // Emit anomaly event to Kafka for downstream processing
      await this.kafkaStreams.produceEvent('alerts', {
        type: 'anomaly_alert',
        data: anomalyEvent,
        timestamp: new Date()
      });

    } catch (error: any) {
      this.logger.error('Failed to handle anomaly detection', {
        anomaly_id: anomalyEvent?.id,
        error: error.message
      });
    }
  }

  private handleProcessingError(error: ProcessingError): void {
    this.logger.error('Processing error occurred', {
      signal_id: error.signalId,
      error_type: error.error_type,
      error_message: error.error_message
    });
  }

  private handleStreamError(error: any, signal: RawSignal): void {
    this.logger.error('Stream processing error', {
      signal_id: signal.id,
      error: error.message
    });
  }

  private startFusionUpdates(): void {
    const interval = setInterval(async () => {
      try {
        await this.fusionEngine.updateFusion();
      } catch (error: any) {
        this.logger.error('Failed to update fusion', error);
      }
    }, this.config.fusion.updateInterval);

    (this as any).fusionInterval = interval;
  }

  private stopFusionUpdates(): void {
    if ((this as any).fusionInterval) {
      clearInterval((this as any).fusionInterval);
    }
  }

  private startMetricsCollection(): void {
    const interval = setInterval(async () => {
      try {
      const metrics = await this.getEngineMetrics();
      this.emit('metrics', {
        type: 'metrics',
        data: metrics,
        timestamp: new Date()
      });
      } catch (error: any) {
        this.logger.error('Failed to collect metrics', error);
      }
    }, 30000); // Every 30 seconds

    (this as any).metricsInterval = interval;
  }

  private stopMetricsCollection(): void {
    if ((this as any).metricsInterval) {
      clearInterval((this as any).metricsInterval);
    }
  }
}
