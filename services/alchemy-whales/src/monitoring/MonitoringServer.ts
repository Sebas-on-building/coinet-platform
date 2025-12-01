/**
 * Monitoring Server - Prometheus metrics, health checks, and Whale Query API
 */

import express, { Express } from 'express';
import { MetricsCollector } from './MetricsCollector';
import { HealthCheck } from './HealthCheck';
import { ServiceConfig } from '../types';
import { createLogger } from '../utils/logger';
import { createWhaleQueryRouter } from '../api/WhaleQueryRouter';

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
    // Whale Query API endpoints
    this.app.use('/api/whales', createWhaleQueryRouter());
    this.logger.info('Whale Query API mounted at /api/whales');

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
    // Always return 200 if service is running (even if some components are degraded)
    this.app.get('/api/health', async (_req, res) => {
      try {
        const health = await this.healthCheck.check();
        // Return 200 for healthy/degraded, only 503 if truly unhealthy
        // For Railway, we want to pass healthcheck even if DB/cache are unavailable
        // Service can function without DB/cache, so degraded is acceptable
        const statusCode = health.status === 'unhealthy' ? 503 : 200;
        res.status(statusCode).json(health);
      } catch (error: any) {
        this.logger.error('Health check failed', { error: error.message });
        // Even on error, return 200 if service is running
        // Railway needs to know the service is up, even if healthcheck has issues
        res.status(200).json({
          status: 'degraded',
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'Service is running but health check encountered an error',
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
      // Listen on 0.0.0.0 to allow Railway/external access
      this.app.listen(this.config.port, '0.0.0.0', () => {
        this.logger.info('Monitoring server started', {
          port: this.config.port,
          host: '0.0.0.0',
          metricsPath: this.config.path,
          healthPath: '/health',
          apiHealthPath: '/api/health',
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

