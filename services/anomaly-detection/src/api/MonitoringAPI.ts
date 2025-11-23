/**
 * Monitoring API
 * RESTful API for the anomaly detection system
 */

import express, { Request, Response, Router } from 'express';
import { ProactiveMonitoringSystem } from '../ProactiveMonitoringSystem';
import { DataSource } from '../core/types';
import { AlertLevel } from '../core/types';

export class MonitoringAPI {
  private system: ProactiveMonitoringSystem;
  private router: Router;

  constructor(system: ProactiveMonitoringSystem) {
    this.system = system;
    this.router = express.Router();
    this.setupRoutes();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // System status and health
    this.router.get('/health', this.handleHealthCheck.bind(this));
    this.router.get('/status', this.handleGetStatus.bind(this));
    this.router.get('/statistics', this.handleGetStatistics.bind(this));

    // Anomaly detection
    this.router.get('/anomalies', this.handleGetAnomalies.bind(this));
    this.router.get('/anomalies/:id', this.handleGetAnomaly.bind(this));
    this.router.post('/anomalies/:id/investigate', this.handleInvestigateAnomaly.bind(this));

    // Alerts
    this.router.get('/alerts', this.handleGetAlerts.bind(this));
    this.router.get('/alerts/:id', this.handleGetAlert.bind(this));
    this.router.post('/alerts/:id/acknowledge', this.handleAcknowledgeAlert.bind(this));
    this.router.get('/alerts/unacknowledged', this.handleGetUnacknowledgedAlerts.bind(this));

    // Baselines
    this.router.get('/baselines', this.handleGetBaselines.bind(this));
    this.router.post('/baselines/learn', this.handleLearnBaseline.bind(this));

    // Configuration
    this.router.get('/config', this.handleGetConfig.bind(this));
    this.router.put('/config', this.handleUpdateConfig.bind(this));

    // Alert rules
    this.router.get('/alert-rules', this.handleGetAlertRules.bind(this));
    this.router.post('/alert-rules', this.handleAddAlertRule.bind(this));
    this.router.put('/alert-rules/:id/enable', this.handleEnableAlertRule.bind(this));
    this.router.put('/alert-rules/:id/disable', this.handleDisableAlertRule.bind(this));

    // Data ingestion
    this.router.post('/ingest/trade', this.handleIngestTrade.bind(this));
    this.router.post('/ingest/sentiment', this.handleIngestSentiment.bind(this));
    this.router.post('/ingest/wallet', this.handleIngestWallet.bind(this));

    // Reports
    this.router.get('/reports/summary', this.handleGetSummary.bind(this));
    this.router.get('/reports/export', this.handleExportData.bind(this));

    // Dashboard data
    this.router.get('/dashboard/overview', this.handleGetDashboardOverview.bind(this));
    this.router.get('/dashboard/charts', this.handleGetDashboardCharts.bind(this));
  }

  /**
   * Health check endpoint
   */
  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.system.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Health check failed', message: (error as Error).message });
    }
  }

  /**
   * Get system status
   */
  private handleGetStatus(req: Request, res: Response): void {
    try {
      const status = this.system.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get status', message: (error as Error).message });
    }
  }

  /**
   * Get system statistics
   */
  private handleGetStatistics(req: Request, res: Response): void {
    try {
      const statistics = this.system.getStatistics();
      res.json(statistics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get statistics', message: (error as Error).message });
    }
  }

  /**
   * Get recent anomalies
   */
  private handleGetAnomalies(req: Request, res: Response): void {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const anomalies = this.system.getRecentAnomalies(limit);
      res.json({ anomalies, count: anomalies.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get anomalies', message: (error as Error).message });
    }
  }

  /**
   * Get specific anomaly
   */
  private handleGetAnomaly(req: Request, res: Response): void {
    try {
      const { id: _id } = req.params;
      // Would query from storage
      res.json({ message: 'Not implemented - would query anomaly from storage' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get anomaly', message: (error as Error).message });
    }
  }

  /**
   * Investigate anomaly
   */
  private async handleInvestigateAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const investigation = await this.system.investigateAnomaly(id);
      res.json(investigation);
    } catch (error) {
      res.status(500).json({ error: 'Failed to investigate anomaly', message: (error as Error).message });
    }
  }

  /**
   * Get alerts
   */
  private handleGetAlerts(req: Request, res: Response): void {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const level = req.query.level as string;
      
      const alertSystem = this.system.getAlertSystem();
      const alerts = level 
        ? alertSystem.getAlertsByLevel(level as AlertLevel, limit)
        : alertSystem.getRecentAlerts(limit);
      
      res.json({ alerts, count: alerts.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get alerts', message: (error as Error).message });
    }
  }

  /**
   * Get specific alert
   */
  private handleGetAlert(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const alertSystem = this.system.getAlertSystem();
      const alert = alertSystem.getAlert(id);
      
      if (alert) {
        res.json(alert);
      } else {
        res.status(404).json({ error: 'Alert not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to get alert', message: (error as Error).message });
    }
  }

  /**
   * Acknowledge alert
   */
  private handleAcknowledgeAlert(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { acknowledgedBy } = req.body;
      
      const alertSystem = this.system.getAlertSystem();
      alertSystem.acknowledgeAlert(id, acknowledgedBy || 'unknown');
      
      res.json({ success: true, message: 'Alert acknowledged' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to acknowledge alert', message: (error as Error).message });
    }
  }

  /**
   * Get unacknowledged alerts
   */
  private handleGetUnacknowledgedAlerts(req: Request, res: Response): void {
    try {
      const alertSystem = this.system.getAlertSystem();
      const alerts = alertSystem.getUnacknowledgedAlerts();
      res.json({ alerts, count: alerts.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get unacknowledged alerts', message: (error as Error).message });
    }
  }

  /**
   * Get all baselines
   */
  private handleGetBaselines(req: Request, res: Response): void {
    try {
      const learningEngine = this.system.getLearningEngine();
      const baselines = learningEngine.getAllBaselines();
      
      const baselineArray = Array.from(baselines.entries()).map(([key, baseline]) => ({
        key,
        ...baseline
      }));
      
      res.json({ baselines: baselineArray, count: baselineArray.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get baselines', message: (error as Error).message });
    }
  }

  /**
   * Learn new baseline
   */
  private async handleLearnBaseline(req: Request, res: Response): Promise<void> {
    try {
      const { source, historicalData, symbol } = req.body;
      
      if (!source || !historicalData) {
        res.status(400).json({ error: 'source and historicalData are required' });
        return;
      }
      
      await this.system.learnHistoricalBaselines(source as DataSource, historicalData, symbol);
      res.json({ success: true, message: 'Baseline learned successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to learn baseline', message: (error as Error).message });
    }
  }

  /**
   * Get configuration
   */
  private handleGetConfig(req: Request, res: Response): void {
    try {
      const detector = this.system.getAnomalyDetector();
      const config = detector.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get config', message: (error as Error).message });
    }
  }

  /**
   * Update configuration
   */
  private handleUpdateConfig(req: Request, res: Response): void {
    try {
      const config = req.body;
      this.system.updateConfig(config);
      res.json({ success: true, message: 'Configuration updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update config', message: (error as Error).message });
    }
  }

  /**
   * Get alert rules
   */
  private handleGetAlertRules(req: Request, res: Response): void {
    try {
      // Would return alert rules from alert system
      res.json({ message: 'Not fully implemented' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get alert rules', message: (error as Error).message });
    }
  }

  /**
   * Add alert rule
   */
  private handleAddAlertRule(req: Request, res: Response): void {
    try {
      const rule = req.body;
      const alertSystem = this.system.getAlertSystem();
      alertSystem.addRule(rule);
      res.json({ success: true, message: 'Alert rule added' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add alert rule', message: (error as Error).message });
    }
  }

  /**
   * Enable alert rule
   */
  private handleEnableAlertRule(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const alertSystem = this.system.getAlertSystem();
      alertSystem.enableRule(id);
      res.json({ success: true, message: 'Alert rule enabled' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to enable alert rule', message: (error as Error).message });
    }
  }

  /**
   * Disable alert rule
   */
  private handleDisableAlertRule(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const alertSystem = this.system.getAlertSystem();
      alertSystem.disableRule(id);
      res.json({ success: true, message: 'Alert rule disabled' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disable alert rule', message: (error as Error).message });
    }
  }

  /**
   * Ingest trade data
   */
  private async handleIngestTrade(req: Request, res: Response): Promise<void> {
    try {
      const trade = req.body;
      const result = await this.system.processTrade(trade);
      res.json({ success: true, anomaliesDetected: result?.anomalies.length || 0 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ingest trade', message: (error as Error).message });
    }
  }

  /**
   * Ingest sentiment data
   */
  private async handleIngestSentiment(req: Request, res: Response): Promise<void> {
    try {
      const sentiment = req.body;
      const result = await this.system.processSentiment(sentiment);
      res.json({ success: true, anomaliesDetected: result?.anomalies.length || 0 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ingest sentiment', message: (error as Error).message });
    }
  }

  /**
   * Ingest wallet transaction
   */
  private async handleIngestWallet(req: Request, res: Response): Promise<void> {
    try {
      const transaction = req.body;
      const result = await this.system.processWalletTransaction(transaction);
      res.json({ success: true, anomaliesDetected: result?.anomalies.length || 0 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ingest wallet transaction', message: (error as Error).message });
    }
  }

  /**
   * Get detection summary
   */
  private async handleGetSummary(req: Request, res: Response): Promise<void> {
    try {
      const startTime = req.query.startTime ? new Date(req.query.startTime as string) : new Date(Date.now() - 86400000);
      const endTime = req.query.endTime ? new Date(req.query.endTime as string) : new Date();
      
      const summary = await this.system.getDetectionSummary(startTime, endTime);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get summary', message: (error as Error).message });
    }
  }

  /**
   * Export data
   */
  private async handleExportData(req: Request, res: Response): Promise<void> {
    try {
      const format = (req.query.format as "json" | "csv") || 'json';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 86400000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const data = await this.system.exportData(format, startDate, endDate);
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=anomaly-data-${Date.now()}.${format}`);
      res.send(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export data', message: (error as Error).message });
    }
  }

  /**
   * Get dashboard overview
   */
  private handleGetDashboardOverview(req: Request, res: Response): void {
    try {
      const status = this.system.getStatus();
      const statistics = this.system.getStatistics();
      const alertSystem = this.system.getAlertSystem();
      
      const overview = {
        status: status.running ? 'online' : 'offline',
        uptime: status.uptime,
        statistics,
        recentAlerts: alertSystem.getRecentAlerts(10),
        unacknowledgedAlerts: alertSystem.getUnacknowledgedAlerts().length
      };
      
      res.json(overview);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get dashboard overview', message: (error as Error).message });
    }
  }

  /**
   * Get dashboard charts data
   */
  private handleGetDashboardCharts(req: Request, res: Response): void {
    try {
      // Would return time-series data for charts
      const chartData = {
        anomaliesOverTime: [],
        alertsByLevel: {},
        anomaliesBySource: {},
        detectionPerformance: []
      };
      
      res.json(chartData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get chart data', message: (error as Error).message });
    }
  }

  /**
   * Get router
   */
  getRouter(): Router {
    return this.router;
  }
}

