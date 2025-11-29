/**
 * Coinet API Gateway - Advanced Monitoring & Observability
 * Prometheus metrics, health checks, and performance monitoring
 */

import { Request, Response } from 'express';

export interface MetricsCollector {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  getMetrics(): string;
}

export class PrometheusMetrics implements MetricsCollector {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.createKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.createKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.createKey(name, labels);
    this.gauges.set(key, value);
  }

  getMetrics(): string {
    let metrics = '';

    // Export counters
    for (const [key, value] of this.counters.entries()) {
      const { name, labels } = this.parseKey(key);
      metrics += `# HELP ${name} Total number of ${name}\n`;
      metrics += `# TYPE ${name} counter\n`;
      metrics += `${name}${this.formatLabels(labels)} ${value}\n\n`;
    }

    // Export gauges
    for (const [key, value] of this.gauges.entries()) {
      const { name, labels } = this.parseKey(key);
      metrics += `# HELP ${name} Current value of ${name}\n`;
      metrics += `# TYPE ${name} gauge\n`;
      metrics += `${name}${this.formatLabels(labels)} ${value}\n\n`;
    }

    // Export histograms
    for (const [key, values] of this.histograms.entries()) {
      const { name, labels } = this.parseKey(key);
      const sorted = values.sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((a, b) => a + b, 0);
      
      metrics += `# HELP ${name} Histogram for ${name}\n`;
      metrics += `# TYPE ${name} histogram\n`;
      
      // Calculate percentiles
      const p50 = this.percentile(sorted, 0.5);
      const p95 = this.percentile(sorted, 0.95);
      const p99 = this.percentile(sorted, 0.99);
      
      metrics += `${name}_bucket{le="50"${this.formatLabels(labels, false)}} ${this.countBelow(sorted, 50)}\n`;
      metrics += `${name}_bucket{le="100"${this.formatLabels(labels, false)}} ${this.countBelow(sorted, 100)}\n`;
      metrics += `${name}_bucket{le="500"${this.formatLabels(labels, false)}} ${this.countBelow(sorted, 500)}\n`;
      metrics += `${name}_bucket{le="1000"${this.formatLabels(labels, false)}} ${this.countBelow(sorted, 1000)}\n`;
      metrics += `${name}_bucket{le="+Inf"${this.formatLabels(labels, false)}} ${count}\n`;
      metrics += `${name}_sum${this.formatLabels(labels)} ${sum}\n`;
      metrics += `${name}_count${this.formatLabels(labels)} ${count}\n\n`;
    }

    return metrics;
  }

  private createKey(name: string, labels?: Record<string, string>): string {
    const labelStr = labels ? JSON.stringify(labels) : '';
    return `${name}:${labelStr}`;
  }

  private parseKey(key: string): { name: string; labels?: Record<string, string> } {
    const [name, labelStr] = key.split(':');
    const labels = labelStr ? JSON.parse(labelStr) : undefined;
    return { name, labels };
  }

  private formatLabels(labels?: Record<string, string>, withBraces = true): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    
    const labelPairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return withBraces ? `{${labelPairs}}` : `,${labelPairs}`;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private countBelow(sorted: number[], threshold: number): number {
    return sorted.filter(v => v <= threshold).length;
  }
}

export class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  register(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  async runAll(): Promise<Record<string, { healthy: boolean; error?: string }>> {
    const results: Record<string, { healthy: boolean; error?: string }> = {};
    
    for (const [name, check] of this.checks.entries()) {
      try {
        const healthy = await check();
        results[name] = { healthy };
      } catch (error) {
        results[name] = { 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
    
    return results;
  }
}

export class PerformanceMonitor {
  private metrics: PrometheusMetrics;

  constructor(metrics: PrometheusMetrics) {
    this.metrics = metrics;
  }

  middleware() {
    return (req: Request, res: Response, next: any) => {
      const start = process.hrtime.bigint();
      
      // Increment request counter
      this.metrics.incrementCounter('http_requests_total', {
        method: req.method,
        route: req.route?.path || req.path
      });

      // Track active requests
      this.metrics.setGauge('http_requests_active', 1);

      res.on('finish', () => {
        const duration = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
        
        // Record response time
        this.metrics.recordHistogram('http_request_duration_ms', duration, {
          method: req.method,
          status: res.statusCode.toString(),
          route: req.route?.path || req.path
        });

        // Update response counter
        this.metrics.incrementCounter('http_responses_total', {
          method: req.method,
          status: res.statusCode.toString(),
          route: req.route?.path || req.path
        });

        // Decrease active requests
        this.metrics.setGauge('http_requests_active', -1);
      });

      next();
    };
  }

  recordServiceHealth(serviceName: string, healthy: boolean): void {
    this.metrics.setGauge('service_health', healthy ? 1 : 0, {
      service: serviceName
    });
  }

  recordServiceResponseTime(serviceName: string, duration: number): void {
    this.metrics.recordHistogram('service_response_time_ms', duration, {
      service: serviceName
    });
  }
}

export class AlertManager {
  private alerts: Array<{
    name: string;
    condition: () => boolean;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    lastTriggered?: number;
    cooldown: number; // milliseconds
  }> = [];

  addAlert(
    name: string, 
    condition: () => boolean, 
    message: string, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    cooldown = 300000 // 5 minutes
  ): void {
    this.alerts.push({
      name,
      condition,
      message,
      severity,
      cooldown
    });
  }

  checkAlerts(): Array<{ name: string; message: string; severity: string }> {
    const triggeredAlerts = [];
    const now = Date.now();

    for (const alert of this.alerts) {
      if (alert.condition()) {
        // Check cooldown
        if (!alert.lastTriggered || (now - alert.lastTriggered) > alert.cooldown) {
          triggeredAlerts.push({
            name: alert.name,
            message: alert.message,
            severity: alert.severity
          });
          alert.lastTriggered = now;
        }
      }
    }

    return triggeredAlerts;
  }
}

// System metrics collector
export class SystemMetrics {
  private metrics: PrometheusMetrics;

  constructor(metrics: PrometheusMetrics) {
    this.metrics = metrics;
    this.startCollection();
  }

  private startCollection(): void {
    setInterval(() => {
      this.collectMemoryMetrics();
      this.collectCPUMetrics();
      this.collectEventLoopMetrics();
    }, 10000); // Every 10 seconds
  }

  private collectMemoryMetrics(): void {
    const memUsage = process.memoryUsage();
    
    this.metrics.setGauge('nodejs_memory_heap_used_bytes', memUsage.heapUsed);
    this.metrics.setGauge('nodejs_memory_heap_total_bytes', memUsage.heapTotal);
    this.metrics.setGauge('nodejs_memory_external_bytes', memUsage.external);
    this.metrics.setGauge('nodejs_memory_rss_bytes', memUsage.rss);
  }

  private collectCPUMetrics(): void {
    const cpuUsage = process.cpuUsage();
    
    this.metrics.setGauge('nodejs_cpu_user_seconds_total', cpuUsage.user / 1e6);
    this.metrics.setGauge('nodejs_cpu_system_seconds_total', cpuUsage.system / 1e6);
  }

  private collectEventLoopMetrics(): void {
    const start = process.hrtime.bigint();
    
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6;
      this.metrics.recordHistogram('nodejs_eventloop_lag_ms', lag);
    });
  }
}
