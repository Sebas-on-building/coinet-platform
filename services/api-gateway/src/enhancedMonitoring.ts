/**
 * Enhanced Monitoring & Alerting System
 * Provides comprehensive monitoring, intelligent alerting,
 * and performance insights for the Coinet API Gateway
 */

import { Request, Response } from 'express';
import { EventEmitter } from 'events';

interface AlertRule {
  name: string;
  condition: () => boolean;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number;
  lastTriggered: number;
}

interface PerformanceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    p95ResponseTime: number;
  };
  services: Record<string, {
    healthy: boolean;
    responseTime: number;
    errorRate: number;
  }>;
  system: {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    eventLoopLag: number;
  };
}

export class EnhancedMonitoringManager extends EventEmitter {
  private alerts: Map<string, AlertRule> = new Map();
  private metrics: PerformanceMetrics;
  private responseTimeBuffer: number[] = [];

  constructor() {
    super();
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0, p95ResponseTime: 0 },
      services: {},
      system: { memory: process.memoryUsage(), uptime: process.uptime(), eventLoopLag: 0 }
    };
    
    this.setupDefaultAlerts();
    this.startMonitoring();
  }

  private setupDefaultAlerts(): void {
    this.addAlert({
      name: 'high_error_rate',
      condition: () => {
        const errorRate = this.metrics.requests.total > 0 
          ? (this.metrics.requests.failed / this.metrics.requests.total) * 100 
          : 0;
        return errorRate > 5;
      },
      message: 'High error rate detected',
      severity: 'high',
      cooldown: 300000,
      lastTriggered: 0
    });
  }

  addAlert(rule: AlertRule): void {
    this.alerts.set(rule.name, rule);
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.updateSystemMetrics();
      this.checkAlerts();
    }, 10000);
  }

  private updateSystemMetrics(): void {
    this.metrics.system.memory = process.memoryUsage();
    this.metrics.system.uptime = process.uptime();
  }

  private checkAlerts(): void {
    const now = Date.now();
    
    for (const [name, rule] of this.alerts.entries()) {
      if (now - rule.lastTriggered > rule.cooldown && rule.condition()) {
        this.emit('alert', { name: rule.name, message: rule.message, severity: rule.severity });
        rule.lastTriggered = now;
      }
    }
  }

  recordRequest(req: Request, res: Response): void {
    const start = Date.now();
    this.metrics.requests.total++;

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.responseTimeBuffer.push(duration);
      
      if (this.responseTimeBuffer.length > 1000) {
        this.responseTimeBuffer = this.responseTimeBuffer.slice(-1000);
      }

      if (res.statusCode < 400) {
        this.metrics.requests.successful++;
      } else {
        this.metrics.requests.failed++;
      }

      // Update averages
      const sorted = [...this.responseTimeBuffer].sort((a, b) => a - b);
      this.metrics.requests.averageResponseTime = 
        this.responseTimeBuffer.reduce((a, b) => a + b, 0) / this.responseTimeBuffer.length;
      this.metrics.requests.p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)] || 0;
    });
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getAlertHistory(): Array<{ name: string; lastTriggered: number }> {
    return Array.from(this.alerts.entries()).map(([name, rule]) => ({
      name,
      lastTriggered: rule.lastTriggered
    }));
  }

  async performHealthCheck(): Promise<any> {
    return {
      status: 'healthy',
      timestamp: Date.now(),
      checks: {}
    };
  }

  exportPrometheusMetrics(): string {
    let metrics = '';
    
    metrics += `# HELP gateway_requests_total Total requests\n`;
    metrics += `# TYPE gateway_requests_total counter\n`;
    metrics += `gateway_requests_total ${this.metrics.requests.total}\n\n`;
    
    metrics += `# HELP gateway_memory_heap_used_bytes Memory usage\n`;
    metrics += `# TYPE gateway_memory_heap_used_bytes gauge\n`;
    metrics += `gateway_memory_heap_used_bytes ${this.metrics.system.memory.heapUsed}\n\n`;
    
    return metrics;
  }
}

export default EnhancedMonitoringManager;
