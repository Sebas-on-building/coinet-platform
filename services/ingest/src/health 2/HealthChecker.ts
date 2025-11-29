// =============================================================================
// COINET AI - ADVANCED HEALTH CHECK SYSTEM
// Comprehensive health monitoring with detailed metrics
// =============================================================================

import { Registry, Gauge, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
import { DataConnectionManager } from '../services/DataConnectionManager';

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  message?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface HealthCheck {
  name: string;
  execute: () => Promise<HealthCheckResult>;
  critical?: boolean; // If true, failure makes the service unhealthy
  timeout?: number;  // Timeout in milliseconds
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, HealthCheckResult>;
  metrics: {
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    eventLoop?: {
      delay: number;
      utilization: number;
    };
  };
  dependencies: {
    critical: string[];
    optional: string[];
  };
}

export class HealthChecker {
  private checks = new Map<string, HealthCheck>();
  private metricsRegistry: Registry;
  private connectionManager?: DataConnectionManager;
  
  // Prometheus metrics
  private healthGauge: Gauge<string>;
  private checkDurationHistogram: Histogram<string>;
  private checkFailureCounter: Counter<string>;
  private uptimeGauge: Gauge<string>;
  private memoryGauge: Gauge<string>;
  private cpuGauge: Gauge<string>;
  
  private startTime = Date.now();
  private lastHealthStatus?: HealthStatus;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(connectionManager?: DataConnectionManager) {
    this.connectionManager = connectionManager;
    this.metricsRegistry = new Registry();
    
    // Initialize Prometheus metrics
    this.healthGauge = new Gauge({
      name: 'service_health_status',
      help: 'Health status of the service (1=healthy, 0.5=degraded, 0=unhealthy)',
      labelNames: ['service'],
      registers: [this.metricsRegistry],
    });

    this.checkDurationHistogram = new Histogram({
      name: 'health_check_duration_seconds',
      help: 'Duration of health checks in seconds',
      labelNames: ['check_name'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.metricsRegistry],
    });

    this.checkFailureCounter = new Counter({
      name: 'health_check_failures_total',
      help: 'Total number of health check failures',
      labelNames: ['check_name'],
      registers: [this.metricsRegistry],
    });

    this.uptimeGauge = new Gauge({
      name: 'service_uptime_seconds',
      help: 'Service uptime in seconds',
      registers: [this.metricsRegistry],
    });

    this.memoryGauge = new Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage',
      labelNames: ['type'],
      registers: [this.metricsRegistry],
    });

    this.cpuGauge = new Gauge({
      name: 'nodejs_cpu_usage_microseconds',
      help: 'Node.js CPU usage',
      labelNames: ['type'],
      registers: [this.metricsRegistry],
    });

    // Collect default Node.js metrics
    collectDefaultMetrics({ register: this.metricsRegistry });

    // Register default health checks
    this.registerDefaultChecks();
  }

  private registerDefaultChecks(): void {
    // Memory check
    this.register({
      name: 'memory',
      critical: true,
      timeout: 1000,
      execute: async () => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

        // Update Prometheus metrics
        this.memoryGauge.set({ type: 'heap_used' }, memUsage.heapUsed);
        this.memoryGauge.set({ type: 'heap_total' }, memUsage.heapTotal);
        this.memoryGauge.set({ type: 'rss' }, memUsage.rss);
        this.memoryGauge.set({ type: 'external' }, memUsage.external);

        const healthy = heapPercentage < 90;
        
        return {
          healthy,
          message: healthy 
            ? `Memory usage normal: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${heapPercentage.toFixed(1)}%)`
            : `High memory usage: ${heapPercentage.toFixed(1)}%`,
          details: {
            heapUsedMB: heapUsedMB.toFixed(2),
            heapTotalMB: heapTotalMB.toFixed(2),
            heapPercentage: heapPercentage.toFixed(1),
            rss: (memUsage.rss / 1024 / 1024).toFixed(2),
          },
        };
      },
    });

    // CPU check
    this.register({
      name: 'cpu',
      critical: false,
      timeout: 1000,
      execute: async () => {
        const cpuUsage = process.cpuUsage();
        
        // Update Prometheus metrics
        this.cpuGauge.set({ type: 'user' }, cpuUsage.user);
        this.cpuGauge.set({ type: 'system' }, cpuUsage.system);

        return {
          healthy: true,
          details: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
        };
      },
    });

    // Event loop check
    this.register({
      name: 'eventLoop',
      critical: true,
      timeout: 1000,
      execute: async () => {
        const startTime = Date.now();
        
        return new Promise<HealthCheckResult>((resolve) => {
          setImmediate(() => {
            const delay = Date.now() - startTime;
            const healthy = delay < 100; // Event loop delay should be < 100ms
            
            resolve({
              healthy,
              latency: delay,
              message: healthy
                ? `Event loop responsive: ${delay}ms delay`
                : `Event loop blocked: ${delay}ms delay`,
              details: {
                delay,
                threshold: 100,
              },
            });
          });
        });
      },
    });

    // Connection checks (if connection manager provided)
    if (this.connectionManager) {
      this.registerConnectionChecks();
    }
  }

  private registerConnectionChecks(): void {
    if (!this.connectionManager) return;

    // TimescaleDB check
    this.register({
      name: 'timescaledb',
      critical: true,
      timeout: 5000,
      execute: async () => {
        const pool = this.connectionManager!.getConnection<any>('timescaledb');
        if (!pool) {
          return {
            healthy: false,
            error: 'Connection not initialized',
          };
        }

        try {
          const startTime = Date.now();
          await pool.query('SELECT NOW()');
          const latency = Date.now() - startTime;

          return {
            healthy: true,
            latency,
            message: `Connected (${latency}ms)`,
          };
        } catch (error) {
          return {
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    });

    // Kafka check
    this.register({
      name: 'kafka',
      critical: true,
      timeout: 5000,
      execute: async () => {
        const kafka = this.connectionManager!.getConnection<any>('kafka');
        if (!kafka || !kafka.admin) {
          return {
            healthy: false,
            error: 'Kafka not initialized',
          };
        }

        try {
          const startTime = Date.now();
          const topics = await kafka.admin.listTopics();
          const latency = Date.now() - startTime;

          return {
            healthy: true,
            latency,
            message: `Connected (${topics.length} topics)`,
            details: {
              topicCount: topics.length,
            },
          };
        } catch (error) {
          return {
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    });

    // Redis check
    this.register({
      name: 'redis',
      critical: true,
      timeout: 2000,
      execute: async () => {
        const redis = this.connectionManager!.getConnection<any>('redis');
        if (!redis) {
          return {
            healthy: false,
            error: 'Redis not initialized',
          };
        }

        try {
          const startTime = Date.now();
          await redis.ping();
          const latency = Date.now() - startTime;

          return {
            healthy: true,
            latency,
            message: `Connected (${latency}ms)`,
          };
        } catch (error) {
          return {
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    });

    // ClickHouse check (optional)
    this.register({
      name: 'clickhouse',
      critical: false,
      timeout: 5000,
      execute: async () => {
        const clickhouse = this.connectionManager!.getConnection<any>('clickhouse');
        if (!clickhouse) {
          return {
            healthy: false,
            message: 'ClickHouse not configured',
          };
        }

        try {
          const startTime = Date.now();
          await clickhouse.ping();
          const latency = Date.now() - startTime;

          return {
            healthy: true,
            latency,
            message: `Connected (${latency}ms)`,
          };
        } catch (error) {
          return {
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    });
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  register(check: HealthCheck): void {
    this.checks.set(check.name, check);
  }

  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checkResults: Record<string, HealthCheckResult> = {};
    const criticalChecks: string[] = [];
    const optionalChecks: string[] = [];

    // Execute all health checks in parallel with timeout
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      const checkStartTime = Date.now();
      
      try {
        const timeoutPromise = new Promise<HealthCheckResult>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout || 5000);
        });

        const result = await Promise.race([
          check.execute(),
          timeoutPromise,
        ]);

        const duration = (Date.now() - checkStartTime) / 1000;
        this.checkDurationHistogram.observe({ check_name: name }, duration);

        checkResults[name] = result;
        
        if (check.critical) {
          criticalChecks.push(name);
        } else {
          optionalChecks.push(name);
        }

        if (!result.healthy) {
          this.checkFailureCounter.inc({ check_name: name });
        }

        return { name, result, critical: check.critical || false };
      } catch (error) {
        const duration = (Date.now() - checkStartTime) / 1000;
        this.checkDurationHistogram.observe({ check_name: name }, duration);
        this.checkFailureCounter.inc({ check_name: name });

        checkResults[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        if (check.critical) {
          criticalChecks.push(name);
        } else {
          optionalChecks.push(name);
        }

        return { name, result: checkResults[name], critical: check.critical || false };
      }
    });

    const results = await Promise.allSettled(checkPromises);

    // Determine overall health status
    const criticalHealthy = criticalChecks.every(name => checkResults[name]?.healthy);
    const optionalHealthy = optionalChecks.filter(name => checkResults[name]?.healthy).length;
    const totalOptional = optionalChecks.length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalHealthy && optionalHealthy === totalOptional) {
      status = 'healthy';
    } else if (criticalHealthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    // Update Prometheus metrics
    const statusValue = status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0;
    this.healthGauge.set({ service: 'ingest' }, statusValue);
    this.uptimeGauge.set(process.uptime());

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks: checkResults,
      metrics: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      dependencies: {
        critical: criticalChecks,
        optional: optionalChecks,
      },
    };

    this.lastHealthStatus = healthStatus;
    return healthStatus;
  }

  async getLiveness(): Promise<{ alive: boolean; message: string }> {
    // Simple liveness check - is the process running?
    return {
      alive: true,
      message: 'Service is alive',
    };
  }

  async getReadiness(): Promise<{ ready: boolean; message: string; checks?: Record<string, boolean> }> {
    // Readiness check - are all critical dependencies healthy?
    const health = await this.getHealth();
    const criticalChecks: Record<string, boolean> = {};

    health.dependencies.critical.forEach(name => {
      criticalChecks[name] = health.checks[name]?.healthy || false;
    });

    const ready = Object.values(criticalChecks).every(healthy => healthy);

    return {
      ready,
      message: ready ? 'Service is ready' : 'Service is not ready',
      checks: criticalChecks,
    };
  }

  async getMetrics(): Promise<string> {
    return await this.metricsRegistry.metrics();
  }

  async getMetricsJson(): Promise<any> {
    return this.metricsRegistry.getMetricsAsJSON();
  }

  startPeriodicHealthCheck(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealth();
        if (health.status === 'unhealthy') {
          console.error('⚠️ Service health check failed:', health);
        }
      } catch (error) {
        console.error('❌ Error during periodic health check:', error);
      }
    }, intervalMs);
  }

  stopPeriodicHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  getLastHealthStatus(): HealthStatus | undefined {
    return this.lastHealthStatus;
  }
}

export default HealthChecker;
