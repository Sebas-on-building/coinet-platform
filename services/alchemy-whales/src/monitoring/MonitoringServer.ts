/**
 * Monitoring Server - Prometheus metrics and health checks
 */

import express, { Express } from 'express';
import { MetricsCollector } from './MetricsCollector';
import { HealthCheck } from './HealthCheck';
import { ServiceConfig } from '../types';
import { createLogger } from '../utils/logger';

export class MonitoringServer {
  private app: Express;
  private logger: any;
  private config: ServiceConfig['metrics'];
  private metricsCollector: MetricsCollector;
  private healthCheck: HealthCheck;

  constructor(
    config: ServiceConfig['metrics'],
    metricsCollector: MetricsCollector,
    healthCheck: HealthCheck
  ) {
    this.logger = createLogger({ component: 'MonitoringServer' });
    this.config = config;
    this.metricsCollector = metricsCollector;
    this.healthCheck = healthCheck;
    this.app = express();

    this.setupRoutes();
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Prometheus metrics endpoint
    this.app.get(this.config.path, async (_req, res) => {
      try {
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        const metrics = await this.metricsCollector.getMetrics();
        res.send(metrics);
      } catch (error: any) {
        this.logger.error('Failed to collect metrics', { error: error.message });
        res.status(500).send('Failed to collect metrics');
      }
    });

    // Metrics JSON endpoint
    this.app.get('/metrics/json', async (_req, res) => {
      try {
        const metrics = await this.metricsCollector.getMetricsJSON();
        res.json(metrics);
      } catch (error: any) {
        this.logger.error('Failed to collect metrics JSON', { error: error.message });
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    // Health check endpoint
    this.app.get('/health', async (_req, res) => {
      try {
        const health = await this.healthCheck.check();
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error: any) {
        this.logger.error('Health check failed', { error: error.message });
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
        });
      }
    });

    // Railway-compatible health check endpoint
    this.app.get('/api/health', async (_req, res) => {
      try {
        const health = await this.healthCheck.check();
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error: any) {
        this.logger.error('Health check failed', { error: error.message });
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
        });
      }
    });

    // Liveness probe (Kubernetes)
    this.app.get('/health/live', async (_req, res) => {
      const isAlive = await this.healthCheck.liveness();
      res.status(isAlive ? 200 : 503).json({ alive: isAlive });
    });

    // Readiness probe (Kubernetes)
    this.app.get('/health/ready', async (_req, res) => {
      const isReady = await this.healthCheck.readiness();
      res.status(isReady ? 200 : 503).json({ ready: isReady });
    });

    // Info endpoint
    this.app.get('/info', (_req, res) => {
      res.json({
        service: 'alchemy-whales',
        version: process.env.npm_package_version || '1.0.0',
        uptime: this.healthCheck.getUptime(),
        timestamp: new Date().toISOString(),
        node: process.version,
        environment: process.env.NODE_ENV || 'development',
      });
    });
  }

  /**
   * Start monitoring server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        this.logger.info('Monitoring server started', {
          port: this.config.port,
          metricsPath: this.config.path,
        });
        resolve();
      });
    });
  }

  /**
   * Stop monitoring server
   */
  async stop(): Promise<void> {
    this.logger.info('Monitoring server stopped');
  }
}

export default MonitoringServer;

