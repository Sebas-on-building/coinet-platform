/**
 * Example: HTTP Metrics Server
 * Demonstrates how to expose metrics endpoints for monitoring
 */

import express from 'express';
import { createAggregator } from '../index';
import { getMetricsService } from '../services/metrics.service';
import { getQuotaMonitor } from '../services/quota-monitor.service';
import { logger } from '../utils/logger';

const app = express();
const PORT = process.env.METRICS_PORT || 9090;

async function startMetricsServer() {
  try {
    // Initialize aggregator
    logger.info('Initializing market data aggregator...');
    const aggregator = await createAggregator();

    // Get metrics service with aggregator reference
    const metricsService = getMetricsService(aggregator);
    const quotaMonitor = getQuotaMonitor();

    // Set up quota alert listeners
    quotaMonitor.on('alert', (alert) => {
      logger.warn(`Quota Alert [${alert.severity}]: ${alert.message}`, {
        source: alert.source,
        usage: alert.usage,
      });
    });

    // Metrics endpoints
    
    /**
     * GET /metrics
     * Returns comprehensive JSON metrics
     */
    app.get('/metrics', async (req, res) => {
      try {
        const metrics = await metricsService.getMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Failed to get metrics', { error });
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    });

    /**
     * GET /metrics/prometheus
     * Returns Prometheus-compatible metrics format
     */
    app.get('/metrics/prometheus', async (req, res) => {
      try {
        const prometheusMetrics = await metricsService.getPrometheusMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(prometheusMetrics);
      } catch (error) {
        logger.error('Failed to get Prometheus metrics', { error });
        res.status(500).send('# Error retrieving metrics\n');
      }
    });

    /**
     * GET /metrics/summary
     * Returns simplified metrics summary for dashboards
     */
    app.get('/metrics/summary', async (req, res) => {
      try {
        const summary = await metricsService.getSummary();
        res.json(summary);
      } catch (error) {
        logger.error('Failed to get metrics summary', { error });
        res.status(500).json({ error: 'Failed to retrieve summary' });
      }
    });

    /**
     * GET /metrics/rate-limits
     * Returns only rate limiter metrics
     */
    app.get('/metrics/rate-limits', (req, res) => {
      try {
        const rateLimits = metricsService.getRateLimitMetrics();
        res.json(rateLimits);
      } catch (error) {
        logger.error('Failed to get rate limit metrics', { error });
        res.status(500).json({ error: 'Failed to retrieve rate limits' });
      }
    });

    /**
     * GET /metrics/quotas
     * Returns only quota usage metrics
     */
    app.get('/metrics/quotas', (req, res) => {
      try {
        const quotas = metricsService.getQuotaMetrics();
        res.json(quotas);
      } catch (error) {
        logger.error('Failed to get quota metrics', { error });
        res.status(500).json({ error: 'Failed to retrieve quotas' });
      }
    });

    /**
     * GET /health
     * Health check endpoint
     */
    app.get('/health', async (req, res) => {
      try {
        const health = await aggregator.getHealthStatus();
        const statusCode = health.healthy ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({ healthy: false, error: 'Health check failed' });
      }
    });

    /**
     * GET /
     * Simple info page
     */
    app.get('/', (req, res) => {
      res.json({
        service: 'Coinet Market Prices - Metrics Server',
        version: process.env.npm_package_version || '1.0.0',
        endpoints: [
          'GET /metrics - Comprehensive metrics',
          'GET /metrics/prometheus - Prometheus format',
          'GET /metrics/summary - Dashboard summary',
          'GET /metrics/rate-limits - Rate limiter stats',
          'GET /metrics/quotas - Quota usage stats',
          'GET /health - Service health',
        ],
      });
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`Metrics server started on port ${PORT}`, {
        endpoints: {
          metrics: `http://localhost:${PORT}/metrics`,
          prometheus: `http://localhost:${PORT}/metrics/prometheus`,
          summary: `http://localhost:${PORT}/metrics/summary`,
          health: `http://localhost:${PORT}/health`,
        },
      });
    });

    // Example: Subscribe to some coins for data flow
    if (process.env.ENABLE_WEBSOCKET === 'true') {
      const topCoins = ['bitcoin', 'ethereum', 'solana'];
      await aggregator.subscribeToWebSocket(topCoins);
      logger.info('WebSocket subscriptions active for metrics tracking');
    }

    // Example: Periodic price fetches to generate metrics
    setInterval(async () => {
      try {
        const symbols = ['BTC', 'ETH', 'SOL'];
        await aggregator.getMarketPrices(symbols);
        logger.info('Periodic price fetch completed');
      } catch (error) {
        logger.error('Periodic price fetch failed', { error });
      }
    }, 60000); // Every minute

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down metrics server...');
      await aggregator.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start metrics server', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  startMetricsServer();
}

export default startMetricsServer;

