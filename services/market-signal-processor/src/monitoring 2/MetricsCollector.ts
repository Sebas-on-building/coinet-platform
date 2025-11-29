/**
 * =========================================
 * METRICS COLLECTOR
 * =========================================
 * Divine world-class metrics collection system for market signal processing
 * High-performance metrics aggregation with time-series storage
 */

import { Logger } from '@/utils/Logger';

/**
 * Metric data point
 */
interface MetricDataPoint {
  timestamp: number;
  value: number;
}

/**
 * Metrics collector for real-time monitoring
 */
export class MetricsCollector {
  private logger: Logger;
  private metrics: Map<string, MetricDataPoint[]> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('MetricsCollector');
  }

  /**
   * Initialize the metrics collector
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.logger.info('Initializing metrics collector');
    this.isInitialized = true;

    // Initialize core metrics
    this.recordMetric('uptime', 0);
    this.recordMetric('requests', 0);
    this.recordMetric('errors', 0);
  }

  /**
   * Stop the metrics collector
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) return;

    this.logger.info('Stopping metrics collector');
    this.isInitialized = false;
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number): void {
    if (!this.isInitialized) return;

    const dataPoints = this.metrics.get(name) || [];
    dataPoints.push({
      timestamp: Date.now(),
      value,
    });

    // Keep only recent data points (last 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const filtered = dataPoints.filter(point => point.timestamp > cutoff);

    this.metrics.set(name, filtered);
  }

  /**
   * Record an error metric
   */
  recordError(): void {
    this.recordMetric('errors', 1);
  }

  /**
   * Get the latest value for a specific metric
   */
  getMetric(name: string): number | undefined {
    const dataPoints = this.metrics.get(name);
    if (!dataPoints || dataPoints.length === 0) return undefined;

    return dataPoints[dataPoints.length - 1]?.value;
  }

  /**
   * Get all current metrics (latest values)
   */
  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [name, dataPoints] of this.metrics.entries()) {
      if (dataPoints.length > 0) {
        result[name] = dataPoints[dataPoints.length - 1]?.value || 0;
      }
    }

    return result;
  }

  /**
   * Get metrics from the last N seconds
   */
  getRecentMetrics(seconds: number): Record<string, number> {
    const cutoff = Date.now() - (seconds * 1000);
    const result: Record<string, number> = {};

    for (const [name, dataPoints] of this.metrics.entries()) {
      const recentPoints = dataPoints.filter(point => point.timestamp > cutoff);
      if (recentPoints.length > 0) {
        // Return the average of recent points
        const sum = recentPoints.reduce((acc, point) => acc + point.value, 0);
        result[name] = sum / recentPoints.length;
      }
    }

    return result;
  }

  /**
   * Get metric history for a specific metric
   */
  getMetricHistory(name: string, seconds: number = 3600): MetricDataPoint[] {
    const dataPoints = this.metrics.get(name) || [];
    const cutoff = Date.now() - (seconds * 1000);

    return dataPoints.filter(point => point.timestamp > cutoff);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

/**
 * Signal processing specific metrics collector
 */
export class SignalProcessingMetricsCollector extends MetricsCollector {
  private signalMetrics: Map<string, number> = new Map();

  /**
   * Record signal-specific metrics
   */
  recordSignalMetrics(metrics: {
    exchange?: string;
    signalType?: string;
    assetType?: string;
    enrichmentConfidence?: number;
    momentumScore?: number;
    orderBookImbalance?: number;
    processingLatency?: number;
  }): void {
    if (metrics.exchange) {
      this.recordMetric(`signalsByExchange.${metrics.exchange}`, 1);
    }

    if (metrics.signalType) {
      this.recordMetric(`signalsByType.${metrics.signalType}`, 1);
    }

    if (metrics.assetType) {
      this.recordMetric(`signalsByAssetType.${metrics.assetType}`, 1);
    }

    if (metrics.enrichmentConfidence !== undefined) {
      this.recordMetric(`enrichmentConfidence.${metrics.exchange || 'unknown'}`, metrics.enrichmentConfidence);
    }

    if (metrics.momentumScore !== undefined) {
      this.recordMetric(`momentumScore.${metrics.exchange || 'unknown'}`, metrics.momentumScore);
    }

    if (metrics.orderBookImbalance !== undefined) {
      this.recordMetric(`orderBookImbalance.${metrics.exchange || 'unknown'}`, metrics.orderBookImbalance);
    }

    if (metrics.processingLatency !== undefined) {
      this.recordMetric('processingLatency', metrics.processingLatency);
    }
  }

  /**
   * Get signal-specific metrics
   */
  getSignalMetrics(): Record<string, number> {
    return Object.fromEntries(this.signalMetrics);
  }
}
