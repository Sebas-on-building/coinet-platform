/**
 * ============================================
 * PROMETHEUS METRICS EXPORTER
 * ============================================
 * 
 * Exposes real-time efficiency and performance metrics:
 * - Cache hit rates
 * - API call counts
 * - Latency percentiles
 * - Provider health status
 * - Efficiency multipliers
 * 
 * Endpoint: GET /metrics (Prometheus format)
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric definition
 */
export interface MetricDefinition {
  name: string;
  help: string;
  type: MetricType;
  labels?: string[];
}

/**
 * Metric value with labels
 */
export interface MetricValue {
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

/**
 * Histogram bucket
 */
export interface HistogramBucket {
  le: number;
  count: number;
}

/**
 * Prometheus Metrics Collector
 */
export class PrometheusMetrics extends EventEmitter {
  private metrics: Map<string, {
    definition: MetricDefinition;
    values: MetricValue[];
    histogramBuckets?: Map<string, HistogramBucket[]>;
  }> = new Map();

  private readonly PREFIX = 'coinet_market_prices';

  constructor() {
    super();
    this.registerDefaultMetrics();
    logger.info('Prometheus metrics collector initialized');
  }

  /**
   * Register default metrics
   */
  private registerDefaultMetrics(): void {
    // Cache metrics
    this.register({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      type: 'counter',
      labels: ['cache_type'],
    });

    this.register({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      type: 'counter',
      labels: ['cache_type'],
    });

    this.register({
      name: 'cache_hit_ratio',
      help: 'Current cache hit ratio (0-1)',
      type: 'gauge',
      labels: ['cache_type'],
    });

    // API metrics
    this.register({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      type: 'counter',
      labels: ['provider', 'status'],
    });

    this.register({
      name: 'api_request_duration_seconds',
      help: 'API request duration in seconds',
      type: 'histogram',
      labels: ['provider'],
    });

    // Provider health
    this.register({
      name: 'provider_health',
      help: 'Provider health status (1=healthy, 0=unhealthy)',
      type: 'gauge',
      labels: ['provider'],
    });

    this.register({
      name: 'provider_success_rate',
      help: 'Provider success rate (0-1)',
      type: 'gauge',
      labels: ['provider'],
    });

    // Efficiency metrics
    this.register({
      name: 'efficiency_multiplier',
      help: 'Current efficiency multiplier (queries served per API call)',
      type: 'gauge',
    });

    this.register({
      name: 'queries_served_total',
      help: 'Total number of queries served',
      type: 'counter',
    });

    this.register({
      name: 'actual_api_calls_total',
      help: 'Total number of actual API calls made',
      type: 'counter',
      labels: ['provider'],
    });

    // WebSocket metrics
    this.register({
      name: 'websocket_connections',
      help: 'Current number of WebSocket connections',
      type: 'gauge',
    });

    this.register({
      name: 'websocket_subscriptions',
      help: 'Current number of WebSocket subscriptions',
      type: 'gauge',
    });

    this.register({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages received',
      type: 'counter',
    });

    // Fallback metrics
    this.register({
      name: 'fallback_triggered_total',
      help: 'Total number of fallback triggers',
      type: 'counter',
      labels: ['from_provider', 'to_provider'],
    });

    this.register({
      name: 'fallback_accuracy',
      help: 'ML fallback selection accuracy (0-1)',
      type: 'gauge',
    });

    // Response time percentiles
    this.register({
      name: 'response_time_p50_seconds',
      help: 'Response time 50th percentile',
      type: 'gauge',
    });

    this.register({
      name: 'response_time_p95_seconds',
      help: 'Response time 95th percentile',
      type: 'gauge',
    });

    this.register({
      name: 'response_time_p99_seconds',
      help: 'Response time 99th percentile',
      type: 'gauge',
    });

    // System metrics
    this.register({
      name: 'uptime_seconds',
      help: 'Service uptime in seconds',
      type: 'gauge',
    });

    this.register({
      name: 'memory_usage_bytes',
      help: 'Current memory usage in bytes',
      type: 'gauge',
      labels: ['type'],
    });
  }

  /**
   * Register a new metric
   */
  register(definition: MetricDefinition): void {
    const fullName = `${this.PREFIX}_${definition.name}`;
    
    this.metrics.set(fullName, {
      definition: { ...definition, name: fullName },
      values: [],
      histogramBuckets: definition.type === 'histogram' ? new Map() : undefined,
    });
  }

  /**
   * Increment a counter
   */
  incCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const fullName = `${this.PREFIX}_${name}`;
    const metric = this.metrics.get(fullName);
    
    if (!metric || metric.definition.type !== 'counter') {
      logger.warn(`Counter ${name} not found or wrong type`);
      return;
    }

    const labelKey = labels ? JSON.stringify(labels) : '';
    const existing = metric.values.find(v => JSON.stringify(v.labels) === labelKey);
    
    if (existing) {
      existing.value += value;
    } else {
      metric.values.push({ value, labels, timestamp: new Date() });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const fullName = `${this.PREFIX}_${name}`;
    const metric = this.metrics.get(fullName);
    
    if (!metric || metric.definition.type !== 'gauge') {
      logger.warn(`Gauge ${name} not found or wrong type`);
      return;
    }

    const labelKey = labels ? JSON.stringify(labels) : '';
    const existing = metric.values.find(v => JSON.stringify(v.labels) === labelKey);
    
    if (existing) {
      existing.value = value;
      existing.timestamp = new Date();
    } else {
      metric.values.push({ value, labels, timestamp: new Date() });
    }
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const fullName = `${this.PREFIX}_${name}`;
    const metric = this.metrics.get(fullName);
    
    if (!metric || metric.definition.type !== 'histogram') {
      logger.warn(`Histogram ${name} not found or wrong type`);
      return;
    }

    const labelKey = labels ? JSON.stringify(labels) : 'default';
    
    if (!metric.histogramBuckets!.has(labelKey)) {
      // Initialize buckets (standard Prometheus buckets)
      metric.histogramBuckets!.set(labelKey, [
        { le: 0.005, count: 0 },
        { le: 0.01, count: 0 },
        { le: 0.025, count: 0 },
        { le: 0.05, count: 0 },
        { le: 0.1, count: 0 },
        { le: 0.25, count: 0 },
        { le: 0.5, count: 0 },
        { le: 1, count: 0 },
        { le: 2.5, count: 0 },
        { le: 5, count: 0 },
        { le: 10, count: 0 },
        { le: Infinity, count: 0 },
      ]);
    }

    const buckets = metric.histogramBuckets!.get(labelKey)!;
    for (const bucket of buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  /**
   * Generate Prometheus format output
   */
  export(): string {
    const lines: string[] = [];

    for (const [name, metric] of this.metrics) {
      // Add HELP line
      lines.push(`# HELP ${name} ${metric.definition.help}`);
      
      // Add TYPE line
      lines.push(`# TYPE ${name} ${metric.definition.type}`);

      if (metric.definition.type === 'histogram' && metric.histogramBuckets) {
        // Export histogram buckets
        for (const [labelKey, buckets] of metric.histogramBuckets) {
          const labels = labelKey !== 'default' ? JSON.parse(labelKey) : {};
          
          let sum = 0;
          let count = 0;
          
          for (const bucket of buckets) {
            const labelStr = this.formatLabels({ ...labels, le: String(bucket.le) });
            lines.push(`${name}_bucket${labelStr} ${bucket.count}`);
            count = bucket.count;
            sum += bucket.le * (bucket.count - (buckets.indexOf(bucket) > 0 ? buckets[buckets.indexOf(bucket) - 1].count : 0));
          }
          
          const baseLabelStr = Object.keys(labels).length > 0 ? this.formatLabels(labels) : '';
          lines.push(`${name}_sum${baseLabelStr} ${sum}`);
          lines.push(`${name}_count${baseLabelStr} ${count}`);
        }
      } else {
        // Export counter/gauge values
        for (const value of metric.values) {
          const labelStr = value.labels ? this.formatLabels(value.labels) : '';
          lines.push(`${name}${labelStr} ${value.value}`);
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    
    const formatted = entries.map(([k, v]) => `${k}="${v}"`).join(',');
    return `{${formatted}}`;
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    
    this.setGauge('uptime_seconds', process.uptime());
    this.setGauge('memory_usage_bytes', memUsage.heapUsed, { type: 'heap_used' });
    this.setGauge('memory_usage_bytes', memUsage.heapTotal, { type: 'heap_total' });
    this.setGauge('memory_usage_bytes', memUsage.rss, { type: 'rss' });
    this.setGauge('memory_usage_bytes', memUsage.external, { type: 'external' });
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    for (const metric of this.metrics.values()) {
      metric.values = [];
      if (metric.histogramBuckets) {
        metric.histogramBuckets.clear();
      }
    }
  }

  /**
   * Get current metric value
   */
  getValue(name: string, labels?: Record<string, string>): number | undefined {
    const fullName = `${this.PREFIX}_${name}`;
    const metric = this.metrics.get(fullName);
    
    if (!metric) return undefined;

    const labelKey = labels ? JSON.stringify(labels) : '';
    const value = metric.values.find(v => JSON.stringify(v.labels) === labelKey);
    
    return value?.value;
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }
}

/**
 * Global Prometheus metrics instance
 */
let globalPrometheusMetrics: PrometheusMetrics | null = null;

/**
 * Get or create global Prometheus metrics instance
 */
export function getPrometheusMetrics(): PrometheusMetrics {
  if (!globalPrometheusMetrics) {
    globalPrometheusMetrics = new PrometheusMetrics();
  }
  return globalPrometheusMetrics;
}

/**
 * Create metrics HTTP handler
 */
export function createMetricsHandler(): (req: any, res: any) => void {
  const metrics = getPrometheusMetrics();
  
  return (req: any, res: any) => {
    // Update system metrics before export
    metrics.updateSystemMetrics();
    
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(metrics.export());
  };
}

export default PrometheusMetrics;

