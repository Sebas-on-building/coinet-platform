/// <reference types="node" />
/**
 * Proactive Monitoring System
 * Main orchestrator that brings together all anomaly detection components
 */

import { EventEmitter } from 'events';
import { BaselineLearningEngine } from './core/BaselineLearningEngine';
import { AnomalyDetector } from './core/AnomalyDetector';
import { AnomalyClassifier } from './classifiers/AnomalyClassifier';
import { ActionSuggestionEngine } from './actions/ActionSuggestionEngine';
import { AlertSystem, NotificationConfig } from './alerts/AlertSystem';
import { TradingMonitor, TradeData } from './monitors/TradingMonitor';
import { SentimentMonitor, SentimentData } from './monitors/SentimentMonitor';
import { WalletMonitor, WalletTransaction } from './monitors/WalletMonitor';
import {
  MonitoringConfig,
  DetectionResult,
  DataPoint,
  DataSource,
  Anomaly,
  // LearningUpdate
} from './core/types';

export interface SystemConfig {
  monitoring: MonitoringConfig;
  notifications: NotificationConfig;
  autoClassify: boolean;
  autoSuggestActions: boolean;
  autoAlert: boolean;
  persistResults: boolean;
  dataRetentionHours: number;
}

export interface SystemStatus {
  running: boolean;
  startTime: Date | null;
  uptime: number;
  statistics: {
    totalAnomaliesDetected: number;
    totalAlertsGenerated: number;
    totalDataPointsProcessed: number;
    baselinesLearned: number;
    lastUpdate: Date;
  };
  health: {
    learningEngine: 'healthy' | 'degraded' | 'down';
    detector: 'healthy' | 'degraded' | 'down';
    classifier: 'healthy' | 'degraded' | 'down';
    alertSystem: 'healthy' | 'degraded' | 'down';
  };
}

export class ProactiveMonitoringSystem extends EventEmitter {
  private config: SystemConfig;
  private learningEngine: BaselineLearningEngine;
  private anomalyDetector: AnomalyDetector;
  private classifier: AnomalyClassifier;
  private actionEngine: ActionSuggestionEngine;
  private alertSystem: AlertSystem;
  private tradingMonitor: TradingMonitor;
  private sentimentMonitor: SentimentMonitor;
  private walletMonitor: WalletMonitor;

  private running: boolean = false;
  private startTime: Date | null = null;
  private statistics = {
    totalAnomaliesDetected: 0,
    totalAlertsGenerated: 0,
    totalDataPointsProcessed: 0,
    baselinesLearned: 0,
    lastUpdate: new Date()
  };

  private processingQueue: DataPoint[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(config: SystemConfig) {
    super();
    this.config = config;

    // Initialize components
    this.learningEngine = new BaselineLearningEngine();
    this.anomalyDetector = new AnomalyDetector(this.learningEngine, config.monitoring);
    this.classifier = new AnomalyClassifier();
    this.actionEngine = new ActionSuggestionEngine();
    this.alertSystem = new AlertSystem(config.notifications);
    this.tradingMonitor = new TradingMonitor(config.monitoring);
    this.sentimentMonitor = new SentimentMonitor(config.monitoring);
    this.walletMonitor = new WalletMonitor(config.monitoring);

    this.setupEventHandlers();
  }

  /**
   * Start the monitoring system
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('System is already running');
    }

    this.running = true;
    this.startTime = new Date();

    // console.log('🚀 Proactive Monitoring System starting...');

    // Start processing loop
    if (this.config.monitoring.enableRealTime) {
      this.startRealtimeProcessing();
    }

    this.emit('system_started', this.getStatus());
    // console.log('✅ Proactive Monitoring System started successfully');
  }

  /**
   * Stop the monitoring system
   */
  async stop(): Promise<void> {
    if (!this.running) {
      throw new Error('System is not running');
    }

    // console.log('🛑 Proactive Monitoring System stopping...');

    this.running = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process remaining queue
    if (this.processingQueue.length > 0) {
      await this.processDataPoints(this.processingQueue);
      this.processingQueue = [];
    }

    this.emit('system_stopped', this.getStatus());
    // console.log('✅ Proactive Monitoring System stopped');
  }

  /**
   * Learn baseline from historical data
   */
  async learnHistoricalBaselines(
    source: DataSource,
    historicalData: DataPoint[],
    symbol?: string
  ): Promise<void> {
    // console.log(`📚 Learning baseline for ${source}${symbol ? ` (${symbol})` : ''}...`);
    
    const baseline = await this.learningEngine.learnBaseline(
      source,
      historicalData,
      symbol
    );

    this.statistics.baselinesLearned++;
    this.emit('baseline_learned', { source, symbol, baseline });
    
    // console.log(`✅ Baseline learned: ${source}${symbol ? ` (${symbol})` : ''}`);
  }

  /**
   * Process incoming trade data
   */
  async processTrade(trade: TradeData): Promise<DetectionResult | null> {
    if (!this.running) return null;

    const dataPoints = await this.tradingMonitor.processTrade(trade);
    return this.ingestDataPoints(dataPoints);
  }

  /**
   * Process incoming sentiment data
   */
  async processSentiment(sentiment: SentimentData): Promise<DetectionResult | null> {
    if (!this.running) return null;

    const dataPoints = await this.sentimentMonitor.processSentiment(sentiment);
    return this.ingestDataPoints(dataPoints);
  }

  /**
   * Process incoming wallet transaction
   */
  async processWalletTransaction(transaction: WalletTransaction): Promise<DetectionResult | null> {
    if (!this.running) return null;

    const dataPoints = await this.walletMonitor.processTransaction(transaction);
    return this.ingestDataPoints(dataPoints);
  }

  /**
   * Ingest data points for processing
   */
  async ingestDataPoints(dataPoints: DataPoint[]): Promise<DetectionResult | null> {
    if (!this.running) return null;

    this.statistics.totalDataPointsProcessed += dataPoints.length;

    if (this.config.monitoring.enableBatching) {
      // Add to queue for batch processing
      this.processingQueue.push(...dataPoints);
      return null;
    } else {
      // Process immediately
      return this.processDataPoints(dataPoints);
    }
  }

  /**
   * Process data points and detect anomalies
   */
  private async processDataPoints(dataPoints: DataPoint[]): Promise<DetectionResult> {
    // Detect anomalies
    const result = await this.anomalyDetector.detectAnomalies(dataPoints);

    if (result.anomalies.length === 0) {
      return result;
    }

    this.statistics.totalAnomaliesDetected += result.anomalies.length;

    // Classify anomalies
    if (this.config.autoClassify) {
      await this.classifier.classifyBatch(result.anomalies);
    }

    // Suggest actions
    if (this.config.autoSuggestActions) {
      await this.actionEngine.suggestActionsBatch(result.anomalies);
    }

    // Generate alerts
    if (this.config.autoAlert) {
      for (const anomaly of result.anomalies) {
        const alerts = await this.alertSystem.processAnomaly(anomaly);
        this.statistics.totalAlertsGenerated += alerts.length;
      }
    }

    // Update statistics
    this.statistics.lastUpdate = new Date();

    // Emit results
    this.emit('detection_complete', result);

    // Emit individual anomaly events
    for (const anomaly of result.anomalies) {
      this.emit('anomaly_detected', anomaly);
    }

    return result;
  }

  /**
   * Start real-time processing loop
   */
  private startRealtimeProcessing(): void {
    const interval = this.config.monitoring.updateInterval || 5000;
    
    this.processingInterval = setInterval(async () => {
      if (this.processingQueue.length > 0) {
        const batchSize = this.config.monitoring.batchSize || 100;
        const batch = this.processingQueue.splice(0, batchSize);
        
        try {
          await this.processDataPoints(batch);
        } catch (error: unknown) {
          // console.error('Error processing batch:', error);
          this.emit('processing_error', error);
        }
      }
    }, interval);
  }

  /**
   * Setup event handlers for inter-component communication
   */
  private setupEventHandlers(): void {
    // Trading monitor events
    this.tradingMonitor.on('price_alert', (alert) => {
      this.emit('price_alert', alert);
    });

    // Sentiment monitor events
    this.sentimentMonitor.on('sentiment_shift', (shift) => {
      this.emit('sentiment_shift', shift);
    });

    // Wallet monitor events
    this.walletMonitor.on('suspicious_activity', (activity) => {
      this.emit('suspicious_activity', activity);
    });

    // Alert system events
    this.alertSystem.on('alert_created', (alert) => {
      this.emit('alert_created', alert);
    });

    this.alertSystem.on('alert_sent', (alert) => {
      this.emit('alert_sent', alert);
    });

    this.alertSystem.on('alert_failed', (data) => {
      this.emit('alert_failed', data);
    });
  }

  /**
   * Get system status
   */
  getStatus(): SystemStatus {
    return {
      running: this.running,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      statistics: { ...this.statistics },
      health: {
        learningEngine: 'healthy',
        detector: 'healthy',
        classifier: 'healthy',
        alertSystem: 'healthy'
      }
    };
  }

  /**
   * Get system statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      queueSize: this.processingQueue.length,
      alertsUnacknowledged: this.alertSystem.getUnacknowledgedAlerts().length,
      baselinesCount: this.learningEngine.getAllBaselines().size
    };
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(_limit: number = 100): Anomaly[] {
    // This would typically query a database
    // For now, we'll emit an event for external storage to handle
    this.emit('get_recent_anomalies_request', { limit: _limit });
    return [];
  }

  /**
   * Get detection summary for time period
   */
  async getDetectionSummary(_startTime: Date, _endTime: Date): Promise<{
    period: { start: Date; end: Date; };
    totalAnomalies: number;
    totalAlerts: number;
    byType: {};
    bySeverity: {};
    bySource: {};
}> {
    // This would aggregate data from storage
    return {
      period: { start: _startTime, end: _endTime },
      totalAnomalies: this.statistics.totalAnomaliesDetected,
      totalAlerts: this.statistics.totalAlertsGenerated,
      byType: {},
      bySeverity: {},
      bySource: {}
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.monitoring) {
      this.anomalyDetector.updateConfig(config.monitoring);
    }

    this.emit('config_updated', this.config);
  }

  /**
   * Manual anomaly investigation
   */
  async investigateAnomaly(_anomalyId: string): Promise<{
    anomaly: Anomaly;
    relatedData: DataPoint[];
    historicalComparison: unknown;
    recommendations: string[];
  }> {
    // This would perform deep dive analysis
    throw new Error('Not implemented - would query detailed data from storage');
  }

  /**
   * Export system data
   */
  async exportData(format: 'json' | 'csv', startDate: Date, endDate: Date): Promise<string> {
    // Export anomalies, alerts, and statistics
    const data = {
      exportDate: new Date(),
      period: { start: startDate, end: endDate },
      statistics: this.statistics,
      // Would include actual data from storage
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    components: Record<string, unknown>;
    timestamp: Date;
  }> {
    const components: Record<string, unknown> = {
      learningEngine: { status: 'healthy', baselinesCount: this.learningEngine.getAllBaselines().size },
      detector: { status: 'healthy' },
      classifier: { status: 'healthy' },
      actionEngine: { status: 'healthy' },
      alertSystem: { status: 'healthy', unacknowledged: this.alertSystem.getUnacknowledgedAlerts().length }
    };

    return {
      status: 'healthy',
      components,
      timestamp: new Date()
    };
  }

  /**
   * Get learning engine
   */
  getLearningEngine(): BaselineLearningEngine {
    return this.learningEngine;
  }

  /**
   * Get anomaly detector
   */
  getAnomalyDetector(): AnomalyDetector {
    return this.anomalyDetector;
  }

  /**
   * Get classifier
   */
  getClassifier(): AnomalyClassifier {
    return this.classifier;
  }

  /**
   * Get action engine
   */
  getActionEngine(): ActionSuggestionEngine {
    return this.actionEngine;
  }

  /**
   * Get alert system
   */
  getAlertSystem(): AlertSystem {
    return this.alertSystem;
  }

  /**
   * Get trading monitor
   */
  getTradingMonitor(): TradingMonitor {
    return this.tradingMonitor;
  }

  /**
   * Get sentiment monitor
   */
  getSentimentMonitor(): SentimentMonitor {
    return this.sentimentMonitor;
  }

  /**
   * Get wallet monitor
   */
  getWalletMonitor(): WalletMonitor {
    return this.walletMonitor;
  }
}

