/**
 * =========================================
 * OBSERVABILITY MANAGER
 * =========================================
 * Divine world-class observability system for market signal processing
 * Comprehensive metrics collection, structured logging, and performance monitoring
 */

import { Logger } from '@/utils/Logger';
import { MetricsCollector, SignalProcessingMetricsCollector } from '../monitoring/MetricsCollector';

/**
 * Observability configuration interface
 */
export interface ObservabilityConfig {
  metrics: {
    enabled: boolean;
    collectionInterval: number; // milliseconds
    retentionPeriod: number; // milliseconds
    prometheus?: {
      enabled: boolean;
      port: number;
      path: string;
    };
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    structured: boolean;
    includeRawData: boolean;
    maxLogSize: number;
  };
  tracing: {
    enabled: boolean;
    serviceName: string;
    samplingRate: number;
    exporter?: 'jaeger' | 'zipkin' | 'otlp';
  };
}

/**
 * Metrics definitions for market signal processing
 */
export interface SignalProcessingMetrics {
  // Request metrics
  totalRequests: number;
  requestsPerSecond: number;
  averageRequestLatency: number;

  // Processing metrics
  signalsProcessed: number;
  signalsPerSecond: number;
  averageProcessingLatency: number;
  enrichmentLatency: number;
  validationLatency: number;
  publishingLatency: number;

  // Error metrics
  validationErrors: number;
  enrichmentErrors: number;
  publishingErrors: number;
  totalErrors: number;
  errorRate: number;

  // Rate limiting metrics
  rateLimitHits: number;
  rateLimitBypasses: number;

  // Kafka metrics
  kafkaMessagesPublished: number;
  kafkaPublishErrors: number;
  kafkaAverageLatency: number;

  // Resource metrics
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;

  // Business metrics
  signalsByExchange: Record<string, number>;
  signalsByType: Record<string, number>;
  signalsByAssetType: Record<string, number>;
  averageEnrichmentConfidence: number;
  averageMomentumScore: number;
  averageOrderBookImbalance: number;
}

/**
 * Structured log entry interface
 */
export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  service: string;
  operation: string;
  duration?: number;
  status?: 'success' | 'error' | 'warning';
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  signalId?: string;
  exchange?: string;
  symbol?: string;
  signalType?: string;
}

/**
 * Advanced observability manager with comprehensive monitoring capabilities
 */
export class ObservabilityManager {
  private logger: Logger;
  private metricsCollector: MetricsCollector;
  private config: ObservabilityConfig;
  private isInitialized: boolean = false;
  private metricsInterval?: NodeJS.Timeout;
  private logBuffer: StructuredLogEntry[] = [];
  private logBufferSize = 1000;

  // Performance tracking
  private operationStartTimes: Map<string, number> = new Map();
  private operationMetrics: Map<string, number[]> = new Map();

  constructor(config: ObservabilityConfig) {
    this.config = config;
    this.logger = new Logger('ObservabilityManager');
    this.metricsCollector = new MetricsCollector();
  }

  /**
   * Initialize the observability manager
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing observability manager...');

      // Initialize metrics collector
      await this.metricsCollector.initialize();

      // Start metrics collection if enabled
      if (this.config.metrics.enabled) {
        this.startMetricsCollection();
      }

      // Initialize structured logging
      this.initializeStructuredLogging();

      // Initialize tracing if enabled
      if (this.config.tracing.enabled) {
        await this.initializeTracing();
      }

      this.isInitialized = true;
      this.logger.info('✅ Observability manager initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize observability manager', error);
      throw error;
    }
  }

  /**
   * Shutdown the observability manager gracefully
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down observability manager...');

      // Stop metrics collection
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = undefined!;
      }

      // Flush any buffered logs
      await this.flushLogs();

      // Shutdown metrics collector
      await this.metricsCollector.stop();

      this.isInitialized = false;
      this.logger.info('✅ Observability manager shutdown successfully');
    } catch (error: any) {
      this.logger.error('❌ Error during observability manager shutdown', error);
      throw error;
    }
  }

  /**
   * Start operation timing
   */
  startOperation(operationId: string): void {
    this.operationStartTimes.set(operationId, Date.now());
  }

  /**
   * End operation timing and record metrics
   */
  endOperation(operationId: string, status: 'success' | 'error' = 'success'): number {
    const startTime = this.operationStartTimes.get(operationId);
    if (!startTime) {
      this.logger.warn('Operation timing not found', { operationId });
      return 0;
    }

    const duration = Date.now() - startTime;
    this.operationStartTimes.delete(operationId);

    // Record operation metrics
    const operationKey = `${operationId}:${status}`;
    const metrics = this.operationMetrics.get(operationKey) || [];
    metrics.push(duration);

    // Keep only recent metrics (last 1000)
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    this.operationMetrics.set(operationKey, metrics);

    return duration;
  }

  /**
   * Record a structured log entry
   */
  log(entry: Omit<StructuredLogEntry, 'timestamp' | 'service'>): void {
    const logEntry: StructuredLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      service: 'market-signal-processor',
    };

    // Add to buffer for batch processing
    this.logBuffer.push(logEntry);

    // Flush buffer if it's getting too large
    if (this.logBuffer.length >= this.logBufferSize) {
      this.flushLogs().catch(error => {
        this.logger.error('Failed to flush logs', error);
      });
    }

    // Also log to console if structured logging is disabled
    if (!this.config.logging.structured) {
      const consoleMessage = `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] ${logEntry.operation}: ${entry.status || 'unknown'}`;
      if (entry.error) {
        this.logger.error(consoleMessage, entry.error);
      } else if (entry.metadata) {
        this.logger.info(consoleMessage, entry.metadata);
      } else {
        this.logger.info(consoleMessage);
      }
    }
  }

  /**
   * Record signal processing metrics
   */
  recordSignalProcessing(
    operationId: string,
    signalCount: number,
    duration: number,
    exchange?: string,
    signalType?: string,
    assetType?: string
  ): void {
    // Update general metrics
    this.metricsCollector.recordMetric('signalsProcessed', signalCount);
    this.metricsCollector.recordMetric('processingTime', duration);

    // Update exchange-specific metrics
    if (exchange) {
      this.metricsCollector.recordMetric(`signalsByExchange.${exchange}`, signalCount);
    }

    // Update signal type metrics
    if (signalType) {
      this.metricsCollector.recordMetric(`signalsByType.${signalType}`, signalCount);
    }

    // Update asset type metrics
    if (assetType) {
      this.metricsCollector.recordMetric(`signalsByAssetType.${assetType}`, signalCount);
    }

    // Log structured entry
    this.log({
      level: 'info',
      operation: 'signal_processing',
      duration,
      status: 'success',
      metadata: {
        signalCount,
        exchange,
        signalType,
        assetType,
      },
      requestId: operationId,
    });
  }

  /**
   * Record validation error
   */
  recordValidationError(operationId: string, error: string, field?: string, value?: any): void {
    this.metricsCollector.recordError();

    this.log({
      level: 'error',
      operation: 'validation',
      status: 'error',
      error: {
        message: error,
        code: 'VALIDATION_ERROR',
      },
      metadata: {
        field,
        value,
      },
      requestId: operationId,
    });
  }

  /**
   * Record enrichment error
   */
  recordEnrichmentError(operationId: string, error: string): void {
    this.metricsCollector.recordError();

    this.log({
      level: 'error',
      operation: 'enrichment',
      status: 'error',
      error: {
        message: error,
        code: 'ENRICHMENT_ERROR',
      },
      requestId: operationId,
    });
  }

  /**
   * Record publishing error
   */
  recordPublishingError(operationId: string, error: string): void {
    this.metricsCollector.recordError();

    this.log({
      level: 'error',
      operation: 'publishing',
      status: 'error',
      error: {
        message: error,
        code: 'PUBLISHING_ERROR',
      },
      requestId: operationId,
    });
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(key: string, limit: number, windowMs: number): void {
    this.metricsCollector.recordMetric('rateLimitHits', 1);

    this.log({
      level: 'warn',
      operation: 'rate_limiting',
      status: 'warning',
      metadata: {
        key,
        limit,
        windowMs,
      },
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): SignalProcessingMetrics {
    const baseMetrics = this.metricsCollector.getAllMetrics();

    return {
      totalRequests: baseMetrics.requests || 0,
      requestsPerSecond: this.calculateRequestsPerSecond(),
      averageRequestLatency: this.calculateAverageLatency('request'),
      signalsProcessed: baseMetrics.signalsProcessed || 0,
      signalsPerSecond: this.calculateSignalsPerSecond(),
      averageProcessingLatency: this.calculateAverageLatency('processing'),
      enrichmentLatency: this.calculateAverageLatency('enrichment'),
      validationLatency: this.calculateAverageLatency('validation'),
      publishingLatency: this.calculateAverageLatency('publishing'),
      validationErrors: baseMetrics.validationErrors || 0,
      enrichmentErrors: baseMetrics.enrichmentErrors || 0,
      publishingErrors: baseMetrics.publishingErrors || 0,
      totalErrors: baseMetrics.errors || 0,
      errorRate: this.calculateErrorRate(),
      rateLimitHits: baseMetrics.rateLimitHits || 0,
      rateLimitBypasses: baseMetrics.rateLimitBypasses || 0,
      kafkaMessagesPublished: baseMetrics.kafkaMessagesPublished || 0,
      kafkaPublishErrors: baseMetrics.kafkaPublishErrors || 0,
      kafkaAverageLatency: this.calculateAverageLatency('kafka'),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      activeConnections: this.getActiveConnections(),
      signalsByExchange: this.getSignalsByExchange(),
      signalsByType: this.getSignalsByType(),
      signalsByAssetType: this.getSignalsByAssetType(),
      averageEnrichmentConfidence: this.calculateAverageEnrichmentConfidence(),
      averageMomentumScore: this.calculateAverageMomentumScore(),
      averageOrderBookImbalance: this.calculateAverageOrderBookImbalance(),
    };
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): StructuredLogEntry[] {
    return this.logBuffer.slice(-limit);
  }

  /**
   * Get operation performance metrics
   */
  getOperationMetrics(): Record<string, { count: number; averageLatency: number; p95Latency: number }> {
    const metrics: Record<string, { count: number; averageLatency: number; p95Latency: number }> = {};

    for (const [operationKey, latencies] of this.operationMetrics.entries()) {
      if (latencies.length === 0) continue;

      const sortedLatencies = [...latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);

      metrics[operationKey] = {
        count: latencies.length,
        averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
        p95Latency: sortedLatencies[Math.min(p95Index, sortedLatencies.length - 1)]!,
      };
    }

    return metrics;
  }

  /**
   * Initialize structured logging
   */
  private initializeStructuredLogging(): void {
    if (!this.config.logging.structured) return;

    // Set up periodic log flushing
    setInterval(() => {
      this.flushLogs().catch(error => {
        this.logger.error('Failed to flush structured logs', error);
      });
    }, 10000); // Flush every 10 seconds
  }

  /**
   * Initialize tracing
   */
  private async initializeTracing(): Promise<void> {
    // Simplified tracing initialization
    // In production, would integrate with Jaeger, Zipkin, or OpenTelemetry
    this.logger.info('Tracing initialized', {
      serviceName: this.config.tracing.serviceName,
      samplingRate: this.config.tracing.samplingRate,
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metrics.collectionInterval);
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    try {
      const metrics = this.getMetrics();

      // Record system metrics
      this.metricsCollector.recordMetric('memoryUsage', metrics.memoryUsage);
      this.metricsCollector.recordMetric('cpuUsage', metrics.cpuUsage);
      this.metricsCollector.recordMetric('activeConnections', metrics.activeConnections);

      // Log periodic summary
      if (metrics.totalRequests > 0) {
        this.logger.info('System metrics collected', {
          requestsPerSecond: metrics.requestsPerSecond,
          signalsPerSecond: metrics.signalsPerSecond,
          errorRate: metrics.errorRate,
          averageLatency: metrics.averageRequestLatency,
        });
      }
    } catch (error: any) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }

  /**
   * Flush buffered logs
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // In production, would send to centralized logging system
    // For now, just keep in memory
    this.logger.debug('Logs flushed', { count: logsToFlush.length });
  }

  // Metric calculation helpers
  private calculateRequestsPerSecond(): number {
    const metrics = this.metricsCollector.getRecentMetrics(60); // Last minute
    const totalRequests = Object.values(metrics).reduce((sum: number, value: number) => sum + (value || 0), 0);
    return totalRequests / 60;
  }

  private calculateSignalsPerSecond(): number {
    const metrics = this.metricsCollector.getRecentMetrics(60);
    const signalsProcessed = metrics.signalsProcessed || 0;
    return signalsProcessed / 60;
  }

  private calculateAverageLatency(operation: string): number {
    const operationKey = `${operation}:success`;
    const latencies = this.operationMetrics.get(operationKey) || [];
    return latencies.length > 0 ?
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length : 0;
  }

  private calculateErrorRate(): number {
    const totalRequests = this.metricsCollector.getMetric('requests') || 1;
    const totalErrors = this.metricsCollector.getMetric('errors') || 0;
    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }

  private getMemoryUsage(): number {
    // Simplified memory usage calculation
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }

  private getCpuUsage(): number {
    // Simplified CPU usage (would use process.cpuUsage() in real implementation)
    return 0;
  }

  private getActiveConnections(): number {
    // Would track active HTTP connections in real implementation
    return 0;
  }

  private getSignalsByExchange(): Record<string, number> {
    const metrics = this.metricsCollector.getAllMetrics();
    const exchangeMetrics: Record<string, number> = {};

    for (const [key, value] of Object.entries(metrics)) {
      if (key.startsWith('signalsByExchange.')) {
        const exchange = key.replace('signalsByExchange.', '');
        exchangeMetrics[exchange] = value;
      }
    }

    return exchangeMetrics;
  }

  private getSignalsByType(): Record<string, number> {
    const metrics = this.metricsCollector.getAllMetrics();
    const typeMetrics: Record<string, number> = {};

    for (const [key, value] of Object.entries(metrics)) {
      if (key.startsWith('signalsByType.')) {
        const type = key.replace('signalsByType.', '');
        typeMetrics[type] = value;
      }
    }

    return typeMetrics;
  }

  private getSignalsByAssetType(): Record<string, number> {
    const metrics = this.metricsCollector.getAllMetrics();
    const assetTypeMetrics: Record<string, number> = {};

    for (const [key, value] of Object.entries(metrics)) {
      if (key.startsWith('signalsByAssetType.')) {
        const assetType = key.replace('signalsByAssetType.', '');
        assetTypeMetrics[assetType] = value;
      }
    }

    return assetTypeMetrics;
  }

  private calculateAverageEnrichmentConfidence(): number {
    const metrics = this.metricsCollector.getAllMetrics();
    const confidences = Object.entries(metrics)
      .filter(([key]) => key.startsWith('enrichmentConfidence.'))
      .map(([, value]) => value);

    return confidences.length > 0 ?
      confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length : 0;
  }

  private calculateAverageMomentumScore(): number {
    const metrics = this.metricsCollector.getAllMetrics();
    const scores = Object.entries(metrics)
      .filter(([key]) => key.startsWith('momentumScore.'))
      .map(([, value]) => value);

    return scores.length > 0 ?
      scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  private calculateAverageOrderBookImbalance(): number {
    const metrics = this.metricsCollector.getAllMetrics();
    const imbalances = Object.entries(metrics)
      .filter(([key]) => key.startsWith('orderBookImbalance.'))
      .map(([, value]) => value);

    return imbalances.length > 0 ?
      imbalances.reduce((sum, imbalance) => sum + imbalance, 0) / imbalances.length : 0;
  }
}

