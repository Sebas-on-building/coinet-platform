/**
 * Anomaly Detection Service - Server
 * Production-ready server with REST API
 */

import express, { Application } from 'express';
import { ProactiveMonitoringSystem } from './ProactiveMonitoringSystem';
import { MonitoringAPI } from './api/MonitoringAPI';
import { DataSource, AlertChannel } from './core/types';

const PORT = process.env.PORT || 3030;

// Configuration
const systemConfig = {
  monitoring: {
    sources: [
      DataSource.TRADING_VOLUME,
      DataSource.PRICE_MOVEMENT,
      DataSource.SENTIMENT,
      DataSource.WALLET_ACTIVITY,
      DataSource.NETWORK_FEES,
      DataSource.ON_CHAIN_METRICS
    ],
    updateInterval: 5000, // 5 seconds
    lookbackPeriod: 24, // 24 hours
    sensitivityThreshold: 0.7,
    enableRealTime: true,
    enableBatching: true,
    batchSize: 100,
    anomalyThresholds: {
      statistical: 3, // 3 standard deviations
      ml: 0.7, // 70% anomaly score
      percentile: 95 // 95th percentile
    }
  },
  notifications: {
    channels: {
      email: {
        enabled: false,
        recipients: []
      },
      webhook: {
        enabled: true,
        urls: ['http://localhost:3000/webhooks/anomaly']
      },
      slack: {
        enabled: false,
        webhookUrl: ''
      }
    },
    defaultChannels: [AlertChannel.WEBHOOK],
    rateLimits: {
      maxAlertsPerMinute: 10,
      maxAlertsPerHour: 100
    }
  },
  autoClassify: true,
  autoSuggestActions: true,
  autoAlert: true,
  persistResults: true,
  dataRetentionHours: 168 // 7 days
};

// Initialize system
// console.log('🚀 Initializing Proactive Monitoring System...');
const monitoringSystem = new ProactiveMonitoringSystem(systemConfig);

// Setup event listeners
monitoringSystem.on('system_started', (status) => {
  // console.log('✅ System started:', status);
});

monitoringSystem.on('anomaly_detected', (anomaly) => {
  // console.log(`🔍 Anomaly detected: ${anomaly.type} - ${anomaly.source} - Score: ${anomaly.score.toFixed(3)}`);
});

monitoringSystem.on('alert_sent', (alert) => {
  // console.log(`📢 Alert sent: ${alert.title}`);
});

monitoringSystem.on('processing_error', (error) => {
  // console.error('❌ Processing error:', error);
});

// Create Express app
const app: Application = express();
app.use(express.json());

// Add monitoring API
const monitoringAPI = new MonitoringAPI(monitoringSystem);
app.use('/api/monitoring', monitoringAPI.getRouter());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Anomaly Detection System',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/api/monitoring/health',
      status: '/api/monitoring/status',
      statistics: '/api/monitoring/statistics',
      anomalies: '/api/monitoring/anomalies',
      alerts: '/api/monitoring/alerts',
      dashboard: '/api/monitoring/dashboard/overview'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  const health = await monitoringSystem.healthCheck();
  res.json(health);
});

// Start server
const server = app.listen(PORT, async () => {
  // console.log(`🌐 Anomaly Detection API listening on port ${PORT}`);
  // console.log(`📊 Dashboard: http://localhost:${PORT}/api/monitoring/dashboard/overview`);
  // console.log(`🏥 Health: http://localhost:${PORT}/health`);
  
  // Start monitoring system
  await monitoringSystem.start();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  // console.log('SIGTERM received, shutting down gracefully...');
  await monitoringSystem.stop();
  server.close(() => {
    // console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  // console.log('SIGINT received, shutting down gracefully...');
  await monitoringSystem.stop();
  server.close(() => {
    // console.log('Server closed');
    process.exit(0);
  });
});

export { monitoringSystem, app };

