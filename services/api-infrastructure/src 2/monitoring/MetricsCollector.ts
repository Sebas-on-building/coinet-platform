/**
 * =========================================
 * METRICS COLLECTOR
 * =========================================
 * Divine world-class metrics collection and monitoring system
 */

import { Logger } from '../utils/Logger';

export interface MonitoringConfig {
  metrics: {
    enabled: boolean;
    collectionInterval: number;
    retentionPeriod: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    structured: boolean;
    retentionDays: number;
  };
}

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  values: MetricValue[];
  help?: string;
}

/**
 * Advanced metrics collector with comprehensive monitoring capabilities
 */
export class MetricsCollector {
  private logger: Logger;
  private config: MonitoringConfig;
  private metrics: Map<string, Metric> = new Map();
  private collectionTimer?: NodeJS.Timeout;

  constructor(config: MonitoringConfig) {
    this.logger = new Logger('MetricsCollector');
    this.config = config;

    if (config.metrics.enabled) {
      this.startCollection();
    }
  }

  /**
   * Record a request metric
   */
  recordRequest(method: string, path: string): void {
    this.incrementCounter('http_requests_total', {
      method,
      path,
      status: 'unknown', // Will be updated when response is sent
    });
  }

  /**
   * Record a response metric
   */
  recordResponse(statusCode: number, duration: number): void {
    const status = this.getStatusCategory(statusCode);

    this.incrementCounter('http_responses_total', {
      status,
      status_code: statusCode.toString(),
    });

    this.observeHistogram('http_request_duration_seconds', duration / 1000, {
      status,
    });
  }

  /**
   * Record an error metric
   */
  recordError(statusCode: number): void {
    this.incrementCounter('http_errors_total', {
      status_code: statusCode.toString(),
    });
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    const metric = this.getOrCreateMetric(name, 'counter');

    metric.values.push({
      value: 1,
      timestamp: Date.now(),
      labels,
    });
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    const metric = this.getOrCreateMetric(name, 'gauge');

    // For gauge, we keep only the latest value
    metric.values = [{
      value,
      timestamp: Date.now(),
      labels,
    }];
  }

  /**
   * Observe a histogram metric
   */
  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    const metric = this.getOrCreateMetric(name, 'histogram');

    metric.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });
  }

  /**
   * Record a summary metric
   */
  recordSummary(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    const metric = this.getOrCreateMetric(name, 'summary');

    metric.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });
  }

  /**
   * Get metric key for labels
   */
  private getMetricKey(name: string, labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return name;
    }

    const sortedLabels = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');

    return `${name}{${sortedLabels}}`;
  }

  /**
   * Get or create a metric
   */
  private getOrCreateMetric(name: string, type: Metric['type']): Metric {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        values: [],
        help: `Metric for ${name}`,
      });
    }

    return this.metrics.get(name)!;
  }

  /**
   * Get status category from status code
   */
  private getStatusCategory(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  /**
   * Start metrics collection
   */
  private startCollection(): void {
    this.collectionTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metrics.collectionInterval);
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.setGauge('nodejs_heap_size_used_bytes', memUsage.heapUsed);
    this.setGauge('nodejs_heap_size_total_bytes', memUsage.heapTotal);
    this.setGauge('nodejs_external_memory_bytes', memUsage.external);

    // CPU usage (approximate)
    const cpuUsage = process.cpuUsage();
    this.setGauge('nodejs_cpu_usage_seconds_total', (cpuUsage.user + cpuUsage.system) / 1000000);

    // Event loop lag
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      this.observeHistogram('nodejs_eventloop_lag_seconds', lag / 1000);
    });

    // Active handles (using approximate values since _getActiveHandles is not exposed)
    this.setGauge('nodejs_active_handles', 0); // Would need custom tracking
    this.setGauge('nodejs_active_requests', 0); // Would need custom tracking

    // Cleanup old metrics
    this.cleanupOldMetrics();
  }

  /**
   * Cleanup old metrics beyond retention period
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.metrics.retentionPeriod;

    for (const [key, metric] of this.metrics.entries()) {
      metric.values = metric.values.filter(value => value.timestamp > cutoff);

      // Remove empty metrics
      if (metric.values.length === 0) {
        this.metrics.delete(key);
      }
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusFormat(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      if (metric.help) {
        lines.push(`# HELP ${metric.name} ${metric.help}`);
      }

      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      for (const value of metric.values) {
        const labels = value.labels && Object.keys(value.labels).length > 0
          ? `{${Object.entries(value.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
          : '';

        lines.push(`${metric.name}${labels} ${value.value} ${value.timestamp}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get summary of key metrics
   */
  getSummary(): {
    uptime: number;
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    averageLatency: number;
    memoryUsage: number;
    activeConnections: number;
  } {
    const requests = this.getCounterValue('http_requests_total');
    const errors = this.getCounterValue('http_errors_total');
    const latency = this.getHistogramAverage('http_request_duration_seconds');

    return {
      uptime: process.uptime() * 1000,
      totalRequests: requests,
      totalErrors: errors,
      errorRate: requests > 0 ? errors / requests : 0,
      averageLatency: latency,
      memoryUsage: process.memoryUsage().heapUsed,
      activeConnections: 0, // Would need to track from server
    };
  }

  /**
   * Get detailed metrics for monitoring dashboard
   */
  getDetailedMetrics(): {
    timestamp: string;
    summary: ReturnType<MetricsCollector['getSummary']>;
    requestBreakdown: Record<string, number>;
    errorBreakdown: Record<string, number>;
    latencyDistribution: { p50: number; p95: number; p99: number };
    topEndpoints: Array<{ endpoint: string; requests: number }>;
  } {
    const summary = this.getSummary();
    const requestBreakdown = this.getMetricBreakdown('http_requests_total');
    const errorBreakdown = this.getMetricBreakdown('http_errors_total');
    const latencyDistribution = this.getLatencyDistribution();

    // Get top endpoints by request count
    const topEndpoints = Object.entries(requestBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, requests]) => ({ endpoint, requests }));

    return {
      timestamp: new Date().toISOString(),
      summary,
      requestBreakdown,
      errorBreakdown,
      latencyDistribution,
      topEndpoints,
    };
  }

  /**
   * Get counter value
   */
  private getCounterValue(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      return 0;
    }

    return metric.values.reduce((sum, value) => sum + value.value, 0);
  }

  /**
   * Get histogram average
   */
  private getHistogramAverage(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      return 0;
    }

    if (metric.values.length === 0) {
      return 0;
    }

    const sum = metric.values.reduce((acc, value) => acc + value.value, 0);
    return sum / metric.values.length;
  }

  /**
   * Get metric breakdown by labels
   */
  private getMetricBreakdown(name: string): Record<string, number> {
    const metric = this.metrics.get(name);
    if (!metric) {
      return {};
    }

    const breakdown: Record<string, number> = {};

    for (const value of metric.values) {
      const key = value.labels ?
        Object.values(value.labels).join(':') :
        'unknown';

      breakdown[key] = (breakdown[key] || 0) + value.value;
    }

    return breakdown;
  }

  /**
   * Get latency distribution percentiles
   */
  private getLatencyDistribution(): { p50: number; p95: number; p99: number } {
    const metric = this.metrics.get('http_request_duration_seconds');
    if (!metric || metric.type !== 'histogram' || metric.values.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const values = metric.values.map(v => v.value).sort((a, b) => a - b);
    const length = values.length;

    return {
      p50: values[Math.floor(length * 0.5)] || 0,
      p95: values[Math.floor(length * 0.95)] || 0,
      p99: values[Math.floor(length * 0.99)] || 0,
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    prometheus: string;
    json: Record<string, any>;
  } {
    return {
      prometheus: this.getPrometheusFormat(),
      json: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([name, metric]) => [
          name,
          {
            type: metric.type,
            help: metric.help,
            values: metric.values,
          },
        ])
      ),
    };
  }
}
