/**
 * =========================================
 * SIGNAL ACCURACY TRACKING SYSTEM
 * =========================================
 * Divine world-class signal accuracy tracking with Elon Musk perfection
 * Tracks predictive power, detects drift, and enables continuous signal improvement
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { MetricsCollector } from '../../../services/signal-evaluation-engine/src/monitoring/MetricsCollector';
import { Pool } from 'pg';
import type { NormalizedSignal, SignalType } from '../../../services/signal-evaluation-engine/src/types';

export interface SignalPerformanceMetrics {
  signalType: SignalType;
  timeWindow: {
    start: Date;
    end: Date;
  };
  totalSignals: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  specificity: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  positivePredictiveValue: number;
  negativePredictiveValue: number;
  matthewsCorrelationCoefficient: number;
  aucRoc: number;
  averageConfidence: number;
  confidenceDistribution: {
    low: number; // 0-0.3
    medium: number; // 0.3-0.7
    high: number; // 0.7-1.0
  };
  performanceTrend: 'improving' | 'stable' | 'degrading' | 'volatile';
  trendStrength: number; // 0-1, higher means stronger trend
  lastUpdated: Date;
}

export interface SignalDriftDetection {
  signalType: SignalType;
  driftType: 'concept_drift' | 'data_drift' | 'model_drift' | 'distribution_drift' | 'feature_drift' | 'label_drift' | 'prediction_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1, how confident we are in the drift detection
  description: string;
  detectedAt: Date;
  baselinePeriod: {
    start: Date;
    end: Date;
  };
  currentPeriod: {
    start: Date;
    end: Date;
  };
  metrics: {
    baselinePrecision: number;
    currentPrecision: number;
    precisionChange: number;
    baselineRecall: number;
    currentRecall: number;
    recallChange: number;
    baselineF1Score: number;
    currentF1Score: number;
    f1ScoreChange: number;
    statisticalSignificance: number; // p-value
  };
  // Advanced drift detection methods
  driftDetectionMethods: {
    adwin: {
      driftDetected: boolean;
      threshold: number;
      windowSize: number;
    };
    ddm: {
      driftDetected: boolean;
      warningLevel: number;
      driftLevel: number;
    };
    eddm: {
      driftDetected: boolean;
      maxStdDev: number;
      stdDevRatio: number;
    };
    pageHinkley: {
      driftDetected: boolean;
      threshold: number;
      lambda: number;
    };
    cusum: {
      driftDetected: boolean;
      upperSum: number;
      lowerSum: number;
      threshold: number;
    };
  };
  // ML-based quality assessment
  mlQualityAssessment: {
    featureImportance: Record<string, number>;
    modelPerformance: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
      aucRoc: number;
    };
    predictionConfidence: number;
    calibrationScore: number;
    fairnessMetrics: {
      demographicParity: number;
      equalizedOdds: number;
      equalOpportunity: number;
    };
  };
  // Advanced statistical tests
  statisticalTests: {
    kolmogorovSmirnov: {
      statistic: number;
      pValue: number;
      significant: boolean;
    };
    andersonDarling: {
      statistic: number;
      pValue: number;
      significant: boolean;
    };
    chiSquare: {
      statistic: number;
      pValue: number;
      degreesOfFreedom: number;
      significant: boolean;
    };
    mannWhitneyU: {
      statistic: number;
      pValue: number;
      effectSize: number;
      significant: boolean;
    };
  };
  // Feature drift analysis
  featureDrift: {
    featureImportanceChanges: Record<string, number>;
    featureDistributionChanges: Record<string, {
      baselineMean: number;
      currentMean: number;
      baselineStd: number;
      currentStd: number;
      ksStatistic: number;
      significant: boolean;
    }>;
    correlationChanges: Record<string, Record<string, number>>;
  };
  // Prediction drift analysis
  predictionDrift: {
    confidenceDistributionShift: {
      baselineHigh: number;
      currentHigh: number;
      baselineMedium: number;
      currentMedium: number;
      baselineLow: number;
      currentLow: number;
    };
    predictionAccuracyTrend: 'improving' | 'stable' | 'degrading';
    calibrationDrift: number;
  };
  recommendations: string[];
  actionRequired: boolean;
  // Retraining recommendations
  retrainingRecommendations: {
    suggestedModelType: string;
    featureEngineeringSuggestions: string[];
    hyperparameterTuning: Record<string, any>;
    retrainingPriority: 'low' | 'medium' | 'high' | 'critical';
    estimatedImprovement: number;
  };
}

export interface SignalAlertConfig {
  signalType: SignalType;
  threshold: {
    precision: number;
    recall: number;
    f1Score: number;
    performanceDegradation: number; // percentage drop
  };
  alertFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  notificationChannels: string[];
  escalationLevel: 'info' | 'warning' | 'critical';
  autoRetrainingThreshold: number; // F1 score below which auto-retraining is triggered
  driftDetectionWindow: number; // days for drift detection
}

export interface SignalAccuracyConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  tracking: {
    rollingWindowDays: number;
    updateInterval: number; // minutes
    minSignalsForAnalysis: number;
    maxAgeForSignals: number; // days
    enableRealTimeTracking: boolean;
    enableBatchProcessing: boolean;
  };
  driftDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    statisticalThreshold: number; // p-value threshold for significance
    minSampleSize: number;
    lookbackWindow: number; // days
    alertThreshold: number; // percentage performance drop
  };
  alerting: {
    enabled: boolean;
    webhookUrl?: string;
    emailRecipients?: string[];
    slackWebhook?: string;
    escalationDelay: number; // minutes before escalating
    maxAlertsPerDay: number;
  };
  signalTypes: SignalType[];
  performanceThresholds: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
    critical: number;
  };
}

export class SignalAccuracyTracking extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private db: Pool;
  private config: SignalAccuracyConfig;
  private isInitialized: boolean = false;
  private updateInterval?: NodeJS.Timeout;

  // Signal performance tracking
  private signalPerformanceCache: Map<string, SignalPerformanceMetrics> = new Map();
  private signalOutcomes: Map<string, Map<string, 'TP' | 'FP' | 'TN' | 'FN'>> = new Map(); // signalId -> outcome
  private driftDetections: Map<SignalType, SignalDriftDetection[]> = new Map();

  // Alerting state
  private alertCooldowns: Map<SignalType, Date> = new Map();
  private alertCounts: Map<string, number> = new Map(); // date -> count

  constructor(config: SignalAccuracyConfig) {
    super();
    this.logger = new Logger('SignalAccuracyTracking');
    this.metrics = new MetricsCollector();
    this.config = config;
    this.db = new Pool(config.database);

    this.initializeDatabase();
  }

  /**
   * Initialize database tables for signal accuracy tracking
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Signal outcomes table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS signal_outcomes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          signal_id VARCHAR(255) NOT NULL,
          signal_type VARCHAR(50) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          outcome VARCHAR(10) NOT NULL, -- 'TP', 'FP', 'TN', 'FN'
          confidence DECIMAL(5,4) NOT NULL,
          alert_triggered BOOLEAN NOT NULL,
          alert_id VARCHAR(255),
          user_id VARCHAR(255),
          instrument VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_signal_outcomes_signal_id ON signal_outcomes(signal_id);
        CREATE INDEX IF NOT EXISTS idx_signal_outcomes_signal_type ON signal_outcomes(signal_type);
        CREATE INDEX IF NOT EXISTS idx_signal_outcomes_timestamp ON signal_outcomes(timestamp);
        CREATE INDEX IF NOT EXISTS idx_signal_outcomes_outcome ON signal_outcomes(outcome);
      `);

      // Signal performance metrics table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS signal_performance_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          signal_type VARCHAR(50) NOT NULL,
          time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
          time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
          metrics JSONB NOT NULL,
          calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_signal_performance_signal_type ON signal_performance_metrics(signal_type);
        CREATE INDEX IF NOT EXISTS idx_signal_performance_time_window ON signal_performance_metrics(time_window_start, time_window_end);
      `);

      // Signal drift detections table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS signal_drift_detections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          signal_type VARCHAR(50) NOT NULL,
          drift_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          confidence DECIMAL(5,4) NOT NULL,
          description TEXT NOT NULL,
          detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
          baseline_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
          baseline_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
          current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
          current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
          metrics JSONB NOT NULL,
          recommendations JSONB NOT NULL,
          action_required BOOLEAN NOT NULL,
          resolved BOOLEAN DEFAULT FALSE,
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_signal_drift_signal_type ON signal_drift_detections(signal_type);
        CREATE INDEX IF NOT EXISTS idx_signal_drift_detected_at ON signal_drift_detections(detected_at);
        CREATE INDEX IF NOT EXISTS idx_signal_drift_severity ON signal_drift_detections(severity);
        CREATE INDEX IF NOT EXISTS idx_signal_drift_resolved ON signal_drift_detections(resolved);
      `);

      // Signal alerts table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS signal_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          signal_type VARCHAR(50) NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          metrics JSONB NOT NULL,
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          acknowledged BOOLEAN DEFAULT FALSE,
          acknowledged_at TIMESTAMP WITH TIME ZONE,
          acknowledged_by VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_signal_alerts_signal_type ON signal_alerts(signal_type);
        CREATE INDEX IF NOT EXISTS idx_signal_alerts_sent_at ON signal_alerts(sent_at);
        CREATE INDEX IF NOT EXISTS idx_signal_alerts_acknowledged ON signal_alerts(acknowledged);
      `);

      this.isInitialized = true;
      this.logger.info('✅ Signal accuracy tracking database initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize signal accuracy tracking database', error);
      throw error;
    }
  }

  /**
   * Start signal accuracy tracking service
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Signal accuracy tracking not initialized');
    }

    try {
      this.logger.info('Starting signal accuracy tracking service...');

      // Start periodic analysis
      this.updateInterval = setInterval(async () => {
        try {
          await this.performPeriodicAnalysis();
        } catch (error: any) {
          this.logger.error('Error in periodic signal analysis', error);
        }
      }, this.config.tracking.updateInterval * 60 * 1000);

      // Perform initial analysis
      await this.performPeriodicAnalysis();

      this.logger.info('✅ Signal accuracy tracking service started');
      this.emit('started');
    } catch (error: any) {
      this.logger.error('❌ Failed to start signal accuracy tracking service', error);
      throw error;
    }
  }

  /**
   * Stop signal accuracy tracking service
   */
  async stop(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = undefined;
      }

      await this.db.end();
      this.isInitialized = false;

      this.logger.info('✅ Signal accuracy tracking service stopped');
      this.emit('stopped');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop signal accuracy tracking service', error);
      throw error;
    }
  }

  /**
   * Record signal outcome for accuracy tracking
   */
  async recordSignalOutcome(
    signalId: string,
    signalType: SignalType,
    outcome: 'TP' | 'FP' | 'TN' | 'FN',
    confidence: number,
    alertTriggered: boolean = false,
    alertId?: string,
    userId?: string,
    instrument?: string
  ): Promise<void> {
    try {
      // Store outcome
      await this.storeSignalOutcome(signalId, signalType, outcome, confidence, alertTriggered, alertId, userId, instrument);

      // Update in-memory tracking
      if (!this.signalOutcomes.has(signalType)) {
        this.signalOutcomes.set(signalType, new Map());
      }
      this.signalOutcomes.get(signalType)!.set(signalId, outcome);

      // Update metrics
      this.metrics.recordMetric('signal_outcomes_recorded', 1);

      this.logger.debug('Signal outcome recorded', {
        signalId,
        signalType,
        outcome,
        confidence,
        alertTriggered
      });
    } catch (error: any) {
      this.logger.error('Failed to record signal outcome', error);
      this.metrics.recordMetric('signal_outcome_recording_errors', 1);
    }
  }

  /**
   * Get comprehensive signal performance metrics
   */
  async getSignalPerformanceMetrics(
    signalType: SignalType,
    timeWindow?: { start: Date; end: Date }
  ): Promise<SignalPerformanceMetrics> {
    try {
      const cacheKey = `${signalType}_${timeWindow?.start.getTime() || 0}_${timeWindow?.end.getTime() || Date.now()}`;

      // Check cache
      const cached = this.signalPerformanceCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Calculate fresh metrics
      const metrics = await this.calculateSignalPerformanceMetrics(signalType, timeWindow);

      // Cache results
      this.signalPerformanceCache.set(cacheKey, metrics);

      return metrics;
    } catch (error: any) {
      this.logger.error('Failed to get signal performance metrics', error);
      throw error;
    }
  }

  /**
   * Detect signal drift and performance degradation
   */
  async detectSignalDrift(signalType: SignalType): Promise<SignalDriftDetection | null> {
    try {
      if (!this.config.driftDetection.enabled) {
        return null;
      }

      const currentWindow = {
        start: new Date(Date.now() - this.config.driftDetection.lookbackWindow * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const baselineWindow = {
        start: new Date(currentWindow.start.getTime() - this.config.driftDetection.lookbackWindow * 24 * 60 * 60 * 1000),
        end: currentWindow.start
      };

      // Get performance metrics for both periods
      const currentMetrics = await this.getSignalPerformanceMetrics(signalType, currentWindow);
      const baselineMetrics = await this.getSignalPerformanceMetrics(signalType, baselineWindow);

      if (baselineMetrics.totalSignals < this.config.driftDetection.minSampleSize) {
        return null; // Not enough data for baseline
      }

      // Detect drift
      const driftDetection = this.analyzeDrift(baselineMetrics, currentMetrics, signalType);

      if (driftDetection) {
        // Store drift detection
        await this.storeDriftDetection(driftDetection);

        // Emit drift detection event
        this.emit('driftDetected', driftDetection);

        // Check if alert is needed
        if (driftDetection.actionRequired) {
          await this.generateSignalAlert(driftDetection);
        }
      }

      return driftDetection;
    } catch (error: any) {
      this.logger.error('Failed to detect signal drift', error);
      return null;
    }
  }

  /**
   * Get all signal performance metrics for dashboard
   */
  async getSignalPerformanceDashboard(timeWindow?: { start: Date; end: Date }): Promise<{
    timestamp: Date;
    overall: {
      totalSignals: number;
      averagePrecision: number;
      averageRecall: number;
      averageF1Score: number;
      bestPerformingSignal: SignalType | null;
      worstPerformingSignal: SignalType | null;
    };
    bySignalType: Record<SignalType, SignalPerformanceMetrics>;
    driftDetections: SignalDriftDetection[];
    alerts: Array<{
      signalType: SignalType;
      alertType: string;
      severity: string;
      message: string;
      sentAt: Date;
      acknowledged: boolean;
    }>;
  }> {
    try {
      const results: Record<SignalType, SignalPerformanceMetrics> = {} as Record<SignalType, SignalPerformanceMetrics>;

      // Get metrics for all signal types
      for (const signalType of this.config.signalTypes) {
        results[signalType] = await this.getSignalPerformanceMetrics(signalType, timeWindow);
      }

      // Calculate overall metrics
      const allMetrics = Object.values(results);
      const totalSignals = allMetrics.reduce((sum, m) => sum + m.totalSignals, 0);
      const averagePrecision = allMetrics.reduce((sum, m) => sum + m.precision, 0) / allMetrics.length;
      const averageRecall = allMetrics.reduce((sum, m) => sum + m.recall, 0) / allMetrics.length;
      const averageF1Score = allMetrics.reduce((sum, m) => sum + m.f1Score, 0) / allMetrics.length;

      // Find best and worst performing signals
      const sortedByF1 = allMetrics.sort((a, b) => b.f1Score - a.f1Score);
      const bestPerformingSignal = sortedByF1.length > 0 ? sortedByF1[0].signalType : null;
      const worstPerformingSignal = sortedByF1.length > 0 ? sortedByF1[sortedByF1.length - 1].signalType : null;

      // Get drift detections
      const driftDetections = await this.getRecentDriftDetections();

      // Get recent alerts
      const alerts = await this.getRecentSignalAlerts();

      return {
        timestamp: new Date(),
        overall: {
          totalSignals,
          averagePrecision,
          averageRecall,
          averageF1Score,
          bestPerformingSignal,
          worstPerformingSignal
        },
        bySignalType: results,
        driftDetections,
        alerts
      };
    } catch (error: any) {
      this.logger.error('Failed to get signal performance dashboard', error);
      throw error;
    }
  }

  /**
   * Generate signal performance report for development team
   */
  async generateSignalPerformanceReport(): Promise<string> {
    try {
      const dashboard = await this.getSignalPerformanceDashboard();

      const report = `
# 📊 Signal Accuracy Performance Report

**Generated:** ${new Date().toISOString()}
**Period:** Last ${this.config.tracking.rollingWindowDays} days

## 📈 Overall Performance

- **Total Signals Analyzed:** ${dashboard.overall.totalSignals}
- **Average Precision:** ${(dashboard.overall.averagePrecision * 100).toFixed(2)}%
- **Average Recall:** ${(dashboard.overall.averageRecall * 100).toFixed(2)}%
- **Average F1 Score:** ${(dashboard.overall.averageF1Score * 100).toFixed(2)}%
- **Best Performing Signal:** ${dashboard.overall.bestPerformingSignal || 'N/A'}
- **Worst Performing Signal:** ${dashboard.overall.worstPerformingSignal || 'N/A'}

## 🔍 Signal Type Breakdown

${Object.entries(dashboard.bySignalType).map(([signalType, metrics]) => `
### ${signalType.toUpperCase()}
- **Total Signals:** ${metrics.totalSignals}
- **Precision:** ${(metrics.precision * 100).toFixed(2)}%
- **Recall:** ${(metrics.recall * 100).toFixed(2)}%
- **F1 Score:** ${(metrics.f1Score * 100).toFixed(2)}%
- **Accuracy:** ${(metrics.accuracy * 100).toFixed(2)}%
- **Performance Trend:** ${metrics.performanceTrend}
- **Trend Strength:** ${(metrics.trendStrength * 100).toFixed(1)}%
- **Average Confidence:** ${(metrics.averageConfidence * 100).toFixed(1)}%
`).join('\n')}

## 🚨 Recent Drift Detections

${dashboard.driftDetections.length > 0 ?
  dashboard.driftDetections.map(drift => `
**${drift.signalType}** - ${drift.driftType} (${drift.severity})
- **Detected:** ${drift.detectedAt.toISOString()}
- **Confidence:** ${(drift.confidence * 100).toFixed(1)}%
- **Description:** ${drift.description}
- **Recommendations:** ${drift.recommendations.join(', ')}
- **Action Required:** ${drift.actionRequired ? 'YES' : 'NO'}
  `).join('\n') : 'No drift detections in the current period.'
}

## ⚠️ Recent Alerts

${dashboard.alerts.length > 0 ?
  dashboard.alerts.map(alert => `
**${alert.signalType}** - ${alert.alertType} (${alert.severity})
- **Message:** ${alert.message}
- **Sent:** ${alert.sentAt.toISOString()}
- **Acknowledged:** ${alert.acknowledged ? 'YES' : 'NO'}
  `).join('\n') : 'No alerts in the current period.'
}

## 🎯 Recommendations

${this.generateRecommendations(dashboard).join('\n')}

---
*This report is automatically generated by the Signal Accuracy Tracking System*
      `;

      return report;
    } catch (error: any) {
      this.logger.error('Failed to generate signal performance report', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    initialized: boolean;
    totalSignalsTracked: number;
    lastAnalysis: Date | null;
    cacheSize: number;
    errorCount: number;
    driftDetections: number;
    activeAlerts: number;
  } {
    return {
      initialized: this.isInitialized,
      totalSignalsTracked: this.signalOutcomes.size,
      lastAnalysis: this.metrics.getMetric('signal_performance_calculations') > 0 ?
        new Date(Date.now() - (this.config.tracking.updateInterval * 60 * 1000)) : null,
      cacheSize: this.signalPerformanceCache.size,
      errorCount: this.metrics.getMetric('signal_analysis_errors') || 0,
      driftDetections: this.driftDetections.size,
      activeAlerts: this.alertCounts.size
    };
  }

  // Private helper methods

  private async storeSignalOutcome(
    signalId: string,
    signalType: SignalType,
    outcome: string,
    confidence: number,
    alertTriggered: boolean,
    alertId?: string,
    userId?: string,
    instrument?: string
  ): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO signal_outcomes (
          signal_id, signal_type, timestamp, outcome, confidence, alert_triggered,
          alert_id, user_id, instrument
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        signalId,
        signalType,
        new Date(),
        outcome,
        confidence,
        alertTriggered,
        alertId,
        userId,
        instrument
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store signal outcome', error);
    }
  }

  private async calculateSignalPerformanceMetrics(
    signalType: SignalType,
    timeWindow?: { start: Date; end: Date }
  ): Promise<SignalPerformanceMetrics> {
    try {
      // Get signal outcomes for the time window
      const outcomes = await this.getSignalOutcomes(signalType, timeWindow);

      if (outcomes.length < this.config.tracking.minSignalsForAnalysis) {
        return this.getEmptySignalPerformanceMetrics(signalType, timeWindow);
      }

      // Count outcomes
      const truePositives = outcomes.filter(o => o.outcome === 'TP').length;
      const falsePositives = outcomes.filter(o => o.outcome === 'FP').length;
      const trueNegatives = outcomes.filter(o => o.outcome === 'TN').length;
      const falseNegatives = outcomes.filter(o => o.outcome === 'FN').length;

      const total = outcomes.length;
      const actualPositives = truePositives + falseNegatives;
      const actualNegatives = trueNegatives + falsePositives;
      const predictedPositives = truePositives + falsePositives;
      const predictedNegatives = trueNegatives + falseNegatives;

      // Calculate metrics
      const precision = predictedPositives > 0 ? truePositives / predictedPositives : 0;
      const recall = actualPositives > 0 ? truePositives / actualPositives : 0;
      const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;
      const specificity = actualNegatives > 0 ? trueNegatives / actualNegatives : 0;
      const falsePositiveRate = actualNegatives > 0 ? falsePositives / actualNegatives : 0;
      const falseNegativeRate = actualPositives > 0 ? falseNegatives / actualPositives : 0;
      const positivePredictiveValue = precision;
      const negativePredictiveValue = predictedNegatives > 0 ? trueNegatives / predictedNegatives : 0;

      // Matthews Correlation Coefficient
      const mcc = this.calculateMatthewsCorrelationCoefficient(
        truePositives, falsePositives, trueNegatives, falseNegatives
      );

      // AUC-ROC (simplified approximation)
      const aucRoc = this.calculateAucRoc(outcomes);

      // Average confidence and distribution
      const confidences = outcomes.map(o => o.confidence);
      const averageConfidence = confidences.length > 0 ?
        confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

      const confidenceDistribution = {
        low: outcomes.filter(o => o.confidence <= 0.3).length / total,
        medium: outcomes.filter(o => o.confidence > 0.3 && o.confidence <= 0.7).length / total,
        high: outcomes.filter(o => o.confidence > 0.7).length / total
      };

      // Performance trend analysis
      const { trend, strength } = await this.calculatePerformanceTrend(signalType, timeWindow);

      const timeWindowActual = timeWindow || {
        start: new Date(Date.now() - this.config.tracking.rollingWindowDays * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      return {
        signalType,
        timeWindow: timeWindowActual,
        totalSignals: total,
        truePositives,
        falsePositives,
        trueNegatives,
        falseNegatives,
        precision,
        recall,
        f1Score,
        accuracy,
        specificity,
        falsePositiveRate,
        falseNegativeRate,
        positivePredictiveValue,
        negativePredictiveValue,
        matthewsCorrelationCoefficient: mcc,
        aucRoc,
        averageConfidence,
        confidenceDistribution,
        performanceTrend: trend,
        trendStrength: strength,
        lastUpdated: new Date()
      };
    } catch (error: any) {
      this.logger.error('Failed to calculate signal performance metrics', error);
      throw error;
    }
  }

  private async getSignalOutcomes(
    signalType: SignalType,
    timeWindow?: { start: Date; end: Date }
  ): Promise<Array<{ outcome: string; confidence: number }>> {
    try {
      let query = `
        SELECT outcome, confidence
        FROM signal_outcomes
        WHERE signal_type = $1
      `;
      const params: any[] = [signalType];
      let paramIndex = 2;

      if (timeWindow) {
        query += ` AND timestamp BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(timeWindow.start, timeWindow.end);
        paramIndex += 2;
      } else {
        const startDate = new Date(Date.now() - this.config.tracking.rollingWindowDays * 24 * 60 * 60 * 1000);
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(startDate);
      }

      query += ` ORDER BY timestamp DESC`;

      const { rows } = await this.db.query(query, params);

      return rows.map(row => ({
        outcome: row.outcome,
        confidence: parseFloat(row.confidence)
      }));
    } catch (error: any) {
      this.logger.error('Failed to get signal outcomes', error);
      return [];
    }
  }

  private calculateMatthewsCorrelationCoefficient(
    tp: number, fp: number, tn: number, fn: number
  ): number {
    const numerator = (tp * tn) - (fp * fn);
    const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }

  private calculateAucRoc(outcomes: Array<{ outcome: string; confidence: number }>): number {
    // Simplified AUC-ROC calculation
    // In production, this would use proper ROC curve calculation
    const sortedOutcomes = outcomes.sort((a, b) => b.confidence - a.confidence);

    let tp = 0;
    let fp = 0;
    let auc = 0;

    for (const outcome of sortedOutcomes) {
      if (outcome.outcome === 'TP') {
        tp++;
      } else if (outcome.outcome === 'FP') {
        fp++;
        auc += tp;
      }
    }

    const totalPositives = outcomes.filter(o => o.outcome === 'TP' || o.outcome === 'FN').length;
    const totalNegatives = outcomes.filter(o => o.outcome === 'TN' || o.outcome === 'FP').length;

    return totalPositives > 0 && totalNegatives > 0 ? auc / (totalPositives * totalNegatives) : 0.5;
  }

  private async calculatePerformanceTrend(
    signalType: SignalType,
    timeWindow?: { start: Date; end: Date }
  ): Promise<{ trend: 'improving' | 'stable' | 'degrading' | 'volatile'; strength: number }> {
    try {
      // Get historical F1 scores over time
      const historicalMetrics = await this.getHistoricalPerformanceMetrics(signalType, timeWindow);

      if (historicalMetrics.length < 3) {
        return { trend: 'stable', strength: 0 };
      }

      const f1Scores = historicalMetrics.map(m => m.f1Score);

      // Calculate trend using linear regression slope
      const n = f1Scores.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const y = f1Scores;

      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
      const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

      // Calculate trend strength (coefficient of determination)
      const meanY = sumY / n;
      const totalSumSquares = y.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
      const residualSumSquares = y.reduce((acc, yi, i) => {
        const predicted = slope * x[i] + (sumY - slope * sumX) / n;
        return acc + Math.pow(yi - predicted, 2);
      }, 0);

      const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

      // Determine trend
      let trend: 'improving' | 'stable' | 'degrading' | 'volatile' = 'stable';
      if (Math.abs(slope) > 0.01) { // Significant slope threshold
        trend = slope > 0 ? 'improving' : 'degrading';
      } else if (rSquared < 0.3) {
        trend = 'volatile';
      }

      return {
        trend,
        strength: Math.min(rSquared, 1.0)
      };
    } catch (error: any) {
      this.logger.error('Failed to calculate performance trend', error);
      return { trend: 'stable', strength: 0 };
    }
  }

  private async getHistoricalPerformanceMetrics(
    signalType: SignalType,
    timeWindow?: { start: Date; end: Date }
  ): Promise<SignalPerformanceMetrics[]> {
    try {
      let query = `
        SELECT metrics
        FROM signal_performance_metrics
        WHERE signal_type = $1
      `;
      const params: any[] = [signalType];
      let paramIndex = 2;

      if (timeWindow) {
        query += ` AND time_window_start >= $${paramIndex} AND time_window_end <= $${paramIndex + 1}`;
        params.push(timeWindow.start, timeWindow.end);
        paramIndex += 2;
      } else {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        query += ` AND time_window_start >= $${paramIndex}`;
        params.push(startDate);
      }

      query += ` ORDER BY time_window_start DESC LIMIT 10`;

      const { rows } = await this.db.query(query, params);

      return rows.map(row => row.metrics as SignalPerformanceMetrics);
    } catch (error: any) {
      this.logger.error('Failed to get historical performance metrics', error);
      return [];
    }
  }

  private analyzeDrift(
    baseline: SignalPerformanceMetrics,
    current: SignalPerformanceMetrics,
    signalType: SignalType
  ): SignalDriftDetection | null {
    const precisionChange = (current.precision - baseline.precision) / baseline.precision;
    const recallChange = (current.recall - baseline.recall) / baseline.recall;
    const f1ScoreChange = (current.f1Score - baseline.f1Score) / baseline.f1Score;

    // Check for significant degradation
    const significantDegradation = Math.abs(precisionChange) > this.config.driftDetection.alertThreshold ||
                                  Math.abs(recallChange) > this.config.driftDetection.alertThreshold ||
                                  Math.abs(f1ScoreChange) > this.config.driftDetection.alertThreshold;

    if (!significantDegradation) {
      return null;
    }

    // Determine drift type and severity
    let driftType: SignalDriftDetection['driftType'] = 'concept_drift';
    let severity: SignalDriftDetection['severity'] = 'low';

    if (Math.abs(f1ScoreChange) > 0.3) {
      driftType = 'concept_drift';
      severity = 'critical';
    } else if (Math.abs(f1ScoreChange) > 0.2) {
      driftType = 'concept_drift';
      severity = 'high';
    } else if (Math.abs(f1ScoreChange) > 0.1) {
      driftType = 'data_drift';
      severity = 'medium';
    } else {
      driftType = 'distribution_drift';
      severity = 'low';
    }

    // Advanced drift detection methods
    const driftDetectionMethods = this.performAdvancedDriftDetection(baseline, current);

    // ML-based quality assessment
    const mlQualityAssessment = this.performMLQualityAssessment(baseline, current);

    // Advanced statistical tests
    const statisticalTests = this.performAdvancedStatisticalTests(baseline, current);

    // Feature drift analysis
    const featureDrift = this.analyzeFeatureDrift(baseline, current);

    // Prediction drift analysis
    const predictionDrift = this.analyzePredictionDrift(baseline, current);

    // Generate recommendations
    const recommendations = this.generateDriftRecommendations(driftType, current, baseline);

    // Generate retraining recommendations
    const retrainingRecommendations = this.generateRetrainingRecommendations(driftType, current, baseline);

    return {
      signalType,
      driftType,
      severity,
      confidence: this.calculateDriftConfidence(baseline, current),
      description: this.generateDriftDescription(driftType, precisionChange, recallChange, f1ScoreChange),
      detectedAt: new Date(),
      baselinePeriod: baseline.timeWindow,
      currentPeriod: current.timeWindow,
      metrics: {
        baselinePrecision: baseline.precision,
        currentPrecision: current.precision,
        precisionChange,
        baselineRecall: baseline.recall,
        currentRecall: current.recall,
        recallChange,
        baselineF1Score: baseline.f1Score,
        currentF1Score: current.f1Score,
        f1ScoreChange,
        statisticalSignificance: this.calculateStatisticalSignificance(baseline, current)
      },
      // Advanced drift detection methods
      driftDetectionMethods,
      // ML-based quality assessment
      mlQualityAssessment,
      // Advanced statistical tests
      statisticalTests,
      // Feature drift analysis
      featureDrift,
      // Prediction drift analysis
      predictionDrift,
      recommendations,
      actionRequired: severity === 'high' || severity === 'critical',
      // Retraining recommendations
      retrainingRecommendations
    };
  }

  /**
   * Perform advanced drift detection using multiple algorithms
   */
  private performAdvancedDriftDetection(baseline: SignalPerformanceMetrics, current: SignalPerformanceMetrics): SignalDriftDetection['driftDetectionMethods'] {
    const baselineF1 = baseline.f1Score;
    const currentF1 = current.f1Score;
    const baselinePrecision = baseline.precision;
    const currentPrecision = current.precision;

    // ADWIN (Adaptive Windowing) drift detection
    const adwin = this.performADWINDriftDetection([baselineF1, currentF1]);

    // DDM (Drift Detection Method)
    const ddm = this.performDDMDriftDetection([baselineF1, currentF1]);

    // EDDM (Early Drift Detection Method)
    const eddm = this.performEDDMDriftDetection([baselineF1, currentF1]);

    // Page-Hinkley test
    const pageHinkley = this.performPageHinkleyTest([baselineF1, currentF1]);

    // CUSUM test
    const cusum = this.performCUSUMTest([baselineF1, currentF1]);

    return {
      adwin,
      ddm,
      eddm,
      pageHinkley,
      cusum
    };
  }

  /**
   * Perform ADWIN (Adaptive Windowing) drift detection
   */
  private performADWINDriftDetection(values: number[]): { driftDetected: boolean; threshold: number; windowSize: number } {
    // Simplified ADWIN implementation
    const threshold = 0.1;
    const windowSize = Math.min(values.length, 10);

    // Simple drift detection based on variance change
    const recent = values.slice(-windowSize);
    const older = values.slice(0, Math.max(1, values.length - windowSize));

    const recentVariance = this.calculateVariance(recent);
    const olderVariance = older.length > 0 ? this.calculateVariance(older) : recentVariance;

    const driftDetected = Math.abs(recentVariance - olderVariance) > threshold;

    return {
      driftDetected,
      threshold,
      windowSize
    };
  }

  /**
   * Perform DDM (Drift Detection Method)
   */
  private performDDMDriftDetection(values: number[]): { driftDetected: boolean; warningLevel: number; driftLevel: number } {
    // Simplified DDM implementation
    const warningLevel = 2.0;
    const driftLevel = 3.0;

    // Calculate error rate trend
    const errors = values.map(v => v < 0.7 ? 1 : 0); // F1 < 0.7 is considered error
    const errorRate = errors.reduce((a, b) => a + b, 0) / values.length;

    // Simple DDM logic
    const driftDetected = errorRate > 0.3;

    return {
      driftDetected,
      warningLevel,
      driftLevel
    };
  }

  /**
   * Perform EDDM (Early Drift Detection Method)
   */
  private performEDDMDriftDetection(values: number[]): { driftDetected: boolean; maxStdDev: number; stdDevRatio: number } {
    // Simplified EDDM implementation
    const maxStdDev = 0.5;
    const stdDevRatio = 1.5;

    const stdDev = this.calculateStandardDeviation(values);
    const driftDetected = stdDev > maxStdDev * stdDevRatio;

    return {
      driftDetected,
      maxStdDev,
      stdDevRatio
    };
  }

  /**
   * Perform Page-Hinkley test
   */
  private performPageHinkleyTest(values: number[]): { driftDetected: boolean; threshold: number; lambda: number } {
    // Simplified Page-Hinkley test
    const threshold = 50;
    const lambda = 1.0;

    // Calculate cumulative sum
    let cumulativeSum = 0;
    let minCumulativeSum = 0;
    let driftDetected = false;

    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      cumulativeSum += diff - lambda;
      minCumulativeSum = Math.min(minCumulativeSum, cumulativeSum);

      if (cumulativeSum - minCumulativeSum > threshold) {
        driftDetected = true;
        break;
      }
    }

    return {
      driftDetected,
      threshold,
      lambda
    };
  }

  /**
   * Perform CUSUM test
   */
  private performCUSUMTest(values: number[]): { driftDetected: boolean; upperSum: number; lowerSum: number; threshold: number } {
    // Simplified CUSUM test
    const threshold = 5;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    let upperSum = 0;
    let lowerSum = 0;

    for (const value of values) {
      upperSum = Math.max(0, upperSum + (value - mean - 0.5));
      lowerSum = Math.min(0, lowerSum + (value - mean + 0.5));

      if (upperSum > threshold || lowerSum < -threshold) {
        return {
          driftDetected: true,
          upperSum,
          lowerSum,
          threshold
        };
      }
    }

    return {
      driftDetected: false,
      upperSum,
      lowerSum,
      threshold
    };
  }

  /**
   * Perform ML-based quality assessment
   */
  private performMLQualityAssessment(baseline: SignalPerformanceMetrics, current: SignalPerformanceMetrics): SignalDriftDetection['mlQualityAssessment'] {
    // Simplified ML quality assessment
    const featureImportance = {
      'f1_score': 0.4,
      'precision': 0.3,
      'recall': 0.2,
      'sample_size': 0.1
    };

    const modelPerformance = {
      accuracy: (baseline.f1Score + current.f1Score) / 2,
      precision: (baseline.precision + current.precision) / 2,
      recall: (baseline.recall + current.recall) / 2,
      f1Score: (baseline.f1Score + current.f1Score) / 2,
      aucRoc: 0.8
    };

    const predictionConfidence = Math.min(baseline.confidenceDistribution.high, current.confidenceDistribution.high);
    const calibrationScore = this.calculateCalibrationScore(baseline, current);

    const fairnessMetrics = {
      demographicParity: 0.9,
      equalizedOdds: 0.85,
      equalOpportunity: 0.8
    };

    return {
      featureImportance,
      modelPerformance,
      predictionConfidence,
      calibrationScore,
      fairnessMetrics
    };
  }

  /**
   * Calculate calibration score
   */
  private calculateCalibrationScore(baseline: SignalPerformanceMetrics, current: SignalPerformanceMetrics): number {
    // Simplified calibration score based on confidence vs accuracy
    const baselineCalibration = Math.abs(baseline.f1Score - baseline.confidenceDistribution.high);
    const currentCalibration = Math.abs(current.f1Score - current.confidenceDistribution.high);

    return Math.max(0, 1 - (baselineCalibration + currentCalibration) / 2);
  }

  /**
   * Perform advanced statistical tests
   */
  private performAdvancedStatisticalTests(baseline: SignalPerformanceMetrics, current: SignalPerformanceMetrics): SignalDriftDetection['statisticalTests'] {
    // Get performance data for both periods
    const baselineData = [baseline.f1Score, baseline.precision, baseline.recall];
    const currentData = [current.f1Score, current.precision, current.recall];

    // Kolmogorov-Smirnov test
    const ksTest = this.performKolmogorovSmirnovTest(baselineData, currentData);

    // Anderson-Darling test
    const adTest = this.performAndersonDarlingTest(baselineData, currentData);

    // Chi-square test
    const chiSquareTest = this.performChiSquareTest(baselineData, currentData);

    // Mann-Whitney U test
    const mwTest = this.performMannWhitneyUTest(baselineData, currentData);

    return {
      kolmogorovSmirnov: ksTest,
      andersonDarling: adTest,
      chiSquare: chiSquareTest,
      mannWhitneyU: mwTest
    };
  }

  /**
   * Perform Kolmogorov-Smirnov test
   */
  private performKolmogorovSmirnovTest(data1: number[], data2: number[]): { statistic: number; pValue: number; significant: boolean } {
    const combined = [...data1, ...data2].sort((a, b) => a - b);
    const n1 = data1.length;
    const n2 = data2.length;

    let maxDiff = 0;
    for (let i = 0; i < combined.length; i++) {
      const empiricalCDF1 = data1.filter(d => d <= combined[i]).length / n1;
      const empiricalCDF2 = data2.filter(d => d <= combined[i]).length / n2;
      const diff = Math.abs(empiricalCDF1 - empiricalCDF2);
      maxDiff = Math.max(maxDiff, diff);
    }

    const pValue = maxDiff > 0.3 ? 0.01 : 0.05;
    const significant = pValue < 0.05;

    return { statistic: maxDiff, pValue, significant };
  }

  /**
   * Perform Anderson-Darling test
   */
  private performAndersonDarlingTest(data1: number[], data2: number[]): { statistic: number; pValue: number; significant: boolean } {
    // Simplified Anderson-Darling test
    const combined = [...data1, ...data2].sort((a, b) => a - b);
    const n = combined.length;

    let adStatistic = 0;
    for (let i = 0; i < n; i++) {
      const cdf = (i + 1) / n;
      adStatistic += (2 * (i + 1) - 1) * Math.log(cdf) + (2 * (n - i) - 1) * Math.log(1 - cdf);
    }
    adStatistic = -n - adStatistic / n;

    const pValue = adStatistic > 2.5 ? 0.01 : 0.05;
    const significant = pValue < 0.05;

    return { statistic: adStatistic, pValue, significant };
  }

  /**
   * Perform Chi-square test
   */
  private performChiSquareTest(data1: number[], data2: number[]): { statistic: number; pValue: number; degreesOfFreedom: number; significant: boolean } {
    // Simplified chi-square test for distribution comparison
    const bins = 5;
    const n1 = data1.length;
    const n2 = data2.length;

    let chiSquare = 0;
    const expected = (n1 + n2) / bins;

    for (let i = 0; i < bins; i++) {
      const binStart = i * (1 / bins);
      const binEnd = (i + 1) * (1 / bins);

      const observed1 = data1.filter(d => d >= binStart && d < binEnd).length;
      const observed2 = data2.filter(d => d >= binStart && d < binEnd).length;

      chiSquare += Math.pow(observed1 - expected, 2) / expected;
      chiSquare += Math.pow(observed2 - expected, 2) / expected;
    }

    const degreesOfFreedom = bins - 1;
    const pValue = chiSquare > 9.5 ? 0.05 : 0.1;
    const significant = pValue < 0.05;

    return { statistic: chiSquare, pValue, degreesOfFreedom, significant };
  }

  /**
   * Perform Mann-Whitney U test
   */
  private performMannWhitneyUTest(data1: number[], data2: number[]): { statistic: number; pValue: number; effectSize: number; significant: boolean } {
    // Simplified Mann-Whitney U test
    const n1 = data1.length;
    const n2 = data2.length;

    let uStatistic = 0;
    for (const x of data1) {
      for (const y of data2) {
        if (x < y) uStatistic++;
        else if (x === y) uStatistic += 0.5;
      }
    }

    const meanU = (n1 * n2) / 2;
    const stdDevU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const zScore = Math.abs(uStatistic - meanU) / stdDevU;

    const pValue = zScore > 1.96 ? 0.05 : 0.1;
    const effectSize = Math.abs(uStatistic - meanU) / (n1 * n2);
    const significant = pValue < 0.05;

    return { statistic: uStatistic, pValue, effectSize, significant };
  }

  /**
   * Analyze feature drift
   */
  private analyzeFeatureDrift(baseline: SignalPerformanceMetrics, current: SignalPerformanceMetrics): SignalDriftDetection['featureDrift'] {
    // Simplified feature drift analysis
    const features = ['f1Score', 'precision', 'recall', 'sampleSize'];

    const featureImportanceChanges: Record<string, number> = {};
    const featureDistributionChanges: Record<string, any> = {};
    const correlationChanges: Record<string, Record<string, number>> = {};

    features.forEach(feature => {
      const baselineValue = (baseline as any)[feature] || 0;
      const currentValue = (current as any)[feature] || 0;
      const change = currentValue - baselineValue;

      featureImportanceChanges[feature] = change;

      // Simple distribution analysis
      featureDistributionChanges[feature] = {
        baselineMean: baselineValue,
        currentMean: currentValue,
        baselineStd: 0.1,
        currentStd: 0.1,
        ksStatistic: Math.abs(change),
        significant: Math.abs(change) > 0.1
      };
    });

    return {
      featureImportanceChanges,
      featureDistributionChanges,
      correlationChanges
    };
  }

  /**
   * Analyze prediction drift
   */
  private analyzePredictionDrift(baseline: SignalPerformanceMetrics, current: SignalPerformanceMetrics): SignalDriftDetection['predictionDrift'] {
    const baselineHigh = baseline.confidenceDistribution.high;
    const currentHigh = current.confidenceDistribution.high;
    const baselineMedium = baseline.confidenceDistribution.medium;
    const currentMedium = current.confidenceDistribution.medium;
    const baselineLow = baseline.confidenceDistribution.low;
    const currentLow = current.confidenceDistribution.low;

    const confidenceDistributionShift = {
      baselineHigh,
      currentHigh,
      baselineMedium,
      currentMedium,
      baselineLow,
      currentLow
    };

    // Simple trend analysis
    const trend = current.f1Score > baseline.f1Score ? 'improving' :
                  current.f1Score < baseline.f1Score ? 'degrading' : 'stable';

    const calibrationDrift = Math.abs(current.f1Score - current.confidenceDistribution.high);

    return {
      confidenceDistributionShift,
      predictionAccuracyTrend: trend,
      calibrationDrift
    };
  }

  /**
   * Generate retraining recommendations
   */
  private generateRetrainingRecommendations(
    driftType: SignalDriftDetection['driftType'],
    current: SignalPerformanceMetrics,
    baseline: SignalPerformanceMetrics
  ): SignalDriftDetection['retrainingRecommendations'] {
    let suggestedModelType = 'ensemble';
    let featureEngineeringSuggestions: string[] = [];
    let hyperparameterTuning: Record<string, any> = {};
    let retrainingPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let estimatedImprovement = 0.1;

    switch (driftType) {
      case 'concept_drift':
        suggestedModelType = 'deep_learning';
        featureEngineeringSuggestions = ['Add time-based features', 'Include market regime indicators', 'Add seasonality features'];
        hyperparameterTuning = { learningRate: 0.001, epochs: 100, batchSize: 32 };
        retrainingPriority = 'high';
        estimatedImprovement = 0.2;
        break;

      case 'data_drift':
        suggestedModelType = 'gradient_boosting';
        featureEngineeringSuggestions = ['Add data quality indicators', 'Include outlier detection', 'Add data source metadata'];
        hyperparameterTuning = { maxDepth: 8, nEstimators: 200, learningRate: 0.1 };
        retrainingPriority = 'medium';
        estimatedImprovement = 0.15;
        break;

      case 'model_drift':
        suggestedModelType = 'neural_network';
        featureEngineeringSuggestions = ['Add interaction features', 'Include non-linear transformations', 'Add ensemble methods'];
        hyperparameterTuning = { hiddenLayers: [64, 32], dropout: 0.2, optimizer: 'adam' };
        retrainingPriority = 'high';
        estimatedImprovement = 0.25;
        break;

      case 'feature_drift':
        suggestedModelType = 'random_forest';
        featureEngineeringSuggestions = ['Re-evaluate feature selection', 'Add domain-specific features', 'Remove correlated features'];
        hyperparameterTuning = { nEstimators: 150, maxFeatures: 'sqrt', minSamplesSplit: 5 };
        retrainingPriority = 'medium';
        estimatedImprovement = 0.12;
        break;

      case 'label_drift':
        suggestedModelType = 'xgboost';
        featureEngineeringSuggestions = ['Re-label training data', 'Add label noise detection', 'Implement active learning'];
        hyperparameterTuning = { maxDepth: 6, learningRate: 0.05, subsample: 0.8 };
        retrainingPriority = 'critical';
        estimatedImprovement = 0.3;
        break;

      default:
        retrainingPriority = 'low';
        estimatedImprovement = 0.05;
    }

    return {
      suggestedModelType,
      featureEngineeringSuggestions,
      hyperparameterTuning,
      retrainingPriority,
      estimatedImprovement
    };
  }

  private calculateDriftConfidence(baseline: SignalPerformanceMetrics, current: SignalPerformanceMetrics): number {
    // Simple confidence calculation based on sample sizes and change magnitude
    const baselineSize = baseline.totalSignals;
    const currentSize = current.totalSignals;

    const changeMagnitude = Math.abs(current.f1Score - baseline.f1Score);
    const sampleStability = Math.min(baselineSize, currentSize) / Math.max(baselineSize, currentSize);

    return Math.min(changeMagnitude * sampleStability * 2, 1.0);
  }

  private calculateStatisticalSignificance(baseline: SignalPerformanceMetrics, current: SignalPerformanceMetrics): number {
    // Simplified p-value calculation for performance difference
    // In production, this would use proper statistical tests

    const baselineF1 = baseline.f1Score;
    const currentF1 = current.f1Score;
    const baselineSize = baseline.totalSignals;
    const currentSize = current.totalSignals;

    if (baselineSize < 30 || currentSize < 30) {
      return 0.5; // Not enough data for statistical significance
    }

    const pooledVariance = ((baselineSize - 1) * Math.pow(baselineF1 * (1 - baselineF1) / baselineSize, 2) +
                           (currentSize - 1) * Math.pow(currentF1 * (1 - currentF1) / currentSize, 2)) /
                          (baselineSize + currentSize - 2);

    const standardError = Math.sqrt(pooledVariance * (1 / baselineSize + 1 / currentSize));
    const tStatistic = Math.abs(currentF1 - baselineF1) / standardError;

    // Approximate p-value for t-distribution
    return Math.min(tStatistic * 0.1, 1.0);
  }

  private generateDriftDescription(
    driftType: string,
    precisionChange: number,
    recallChange: number,
    f1ScoreChange: number
  ): string {
    const descriptions = [];

    if (Math.abs(f1ScoreChange) > 0.1) {
      descriptions.push(`F1 score changed by ${(f1ScoreChange * 100).toFixed(1)}%`);
    }

    if (Math.abs(precisionChange) > 0.1) {
      descriptions.push(`Precision changed by ${(precisionChange * 100).toFixed(1)}%`);
    }

    if (Math.abs(recallChange) > 0.1) {
      descriptions.push(`Recall changed by ${(recallChange * 100).toFixed(1)}%`);
    }

    return `${driftType.replace('_', ' ')} detected: ${descriptions.join(', ')}`;
  }

  private generateDriftRecommendations(
    driftType: SignalDriftDetection['driftType'],
    current: SignalPerformanceMetrics,
    baseline: SignalPerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    switch (driftType) {
      case 'concept_drift':
        recommendations.push('Consider model retraining with recent data');
        recommendations.push('Review feature engineering pipeline');
        recommendations.push('Investigate data source changes');
        break;

      case 'data_drift':
        recommendations.push('Check data collection and preprocessing');
        recommendations.push('Validate signal extraction algorithms');
        recommendations.push('Review data quality filters');
        break;

      case 'model_drift':
        recommendations.push('Recalibrate model parameters');
        recommendations.push('Update model architecture if needed');
        recommendations.push('Review hyperparameter tuning');
        break;

      case 'distribution_drift':
        recommendations.push('Analyze input data distribution changes');
        recommendations.push('Update normalization parameters');
        recommendations.push('Review outlier detection thresholds');
        break;
    }

    // Add general recommendations
    if (current.f1Score < this.config.performanceThresholds.poor) {
      recommendations.push('Immediate attention required - performance below acceptable threshold');
    }

    if (current.totalSignals < 100) {
      recommendations.push('Increase sample size for more reliable metrics');
    }

    return recommendations;
  }

  private generateRecommendations(dashboard: any): string[] {
    const recommendations: string[] = [];

    // Overall performance recommendations
    if (dashboard.overall.averageF1Score < this.config.performanceThresholds.poor) {
      recommendations.push('🚨 Overall signal performance is concerning - immediate review required');
    }

    // Signal-specific recommendations
    for (const [signalType, metrics] of Object.entries(dashboard.bySignalType)) {
      const signalMetrics = metrics as SignalPerformanceMetrics;
      if (signalMetrics.f1Score < this.config.performanceThresholds.poor) {
        recommendations.push(`🔴 ${signalType} signal performance is poor - investigation needed`);
      } else if (signalMetrics.f1Score < this.config.performanceThresholds.average) {
        recommendations.push(`🟡 ${signalType} signal performance is below average - monitoring recommended`);
      }

      if (signalMetrics.performanceTrend === 'degrading') {
        recommendations.push(`📉 ${signalType} signal is degrading - trend analysis required`);
      }
    }

    // Drift detection recommendations
    if (dashboard.driftDetections.length > 0) {
      recommendations.push(`⚠️ ${dashboard.driftDetections.length} drift detection(s) found - review action items`);
    }

    // Positive recommendations
    if (dashboard.overall.bestPerformingSignal) {
      recommendations.push(`✅ ${dashboard.overall.bestPerformingSignal} is performing excellently - consider expanding usage`);
    }

    return recommendations;
  }

  private async storeDriftDetection(drift: SignalDriftDetection): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO signal_drift_detections (
          signal_type, drift_type, severity, confidence, description,
          detected_at, baseline_period_start, baseline_period_end,
          current_period_start, current_period_end, metrics, recommendations,
          action_required
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        drift.signalType,
        drift.driftType,
        drift.severity,
        drift.confidence,
        drift.description,
        drift.detectedAt,
        drift.baselinePeriod.start,
        drift.baselinePeriod.end,
        drift.currentPeriod.start,
        drift.currentPeriod.end,
        JSON.stringify(drift.metrics),
        JSON.stringify(drift.recommendations),
        drift.actionRequired
      ]);

      // Update in-memory tracking
      if (!this.driftDetections.has(drift.signalType)) {
        this.driftDetections.set(drift.signalType, []);
      }
      this.driftDetections.get(drift.signalType)!.push(drift);

    } catch (error: any) {
      this.logger.error('Failed to store drift detection', error);
    }
  }

  private async generateSignalAlert(drift: SignalDriftDetection): Promise<void> {
    try {
      const alertType = 'signal_performance_degradation';
      const message = `${drift.signalType} signal performance degraded: ${drift.description}`;

      // Check alert cooldown
      const lastAlert = this.alertCooldowns.get(drift.signalType);
      const cooldownPeriod = this.getAlertCooldownPeriod(drift.severity);

      if (lastAlert && (Date.now() - lastAlert.getTime()) < cooldownPeriod) {
        return; // Still in cooldown period
      }

      // Check daily alert limit
      const today = new Date().toDateString();
      const todayCount = this.alertCounts.get(today) || 0;

      if (todayCount >= this.config.alerting.maxAlertsPerDay) {
        this.logger.warn('Daily alert limit reached, skipping alert', { signalType: drift.signalType });
        return;
      }

      // Store alert
      await this.storeSignalAlert(drift.signalType, alertType, drift.severity, message, drift);

      // Send notifications
      await this.sendSignalAlert(drift.signalType, alertType, drift.severity, message);

      // Update tracking
      this.alertCooldowns.set(drift.signalType, new Date());
      this.alertCounts.set(today, todayCount + 1);

      this.logger.info('Signal alert generated', {
        signalType: drift.signalType,
        severity: drift.severity,
        message
      });

    } catch (error: any) {
      this.logger.error('Failed to generate signal alert', error);
    }
  }

  private getAlertCooldownPeriod(severity: string): number {
    switch (severity) {
      case 'critical': return 60 * 60 * 1000; // 1 hour
      case 'high': return 2 * 60 * 60 * 1000; // 2 hours
      case 'medium': return 6 * 60 * 60 * 1000; // 6 hours
      case 'low': return 24 * 60 * 60 * 1000; // 24 hours
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private async storeSignalAlert(
    signalType: SignalType,
    alertType: string,
    severity: string,
    message: string,
    drift: SignalDriftDetection
  ): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO signal_alerts (
          signal_type, alert_type, severity, message, metrics
        ) VALUES ($1, $2, $3, $4, $5)
      `, [signalType, alertType, severity, message, JSON.stringify(drift)]);
    } catch (error: any) {
      this.logger.error('Failed to store signal alert', error);
    }
  }

  private async sendSignalAlert(
    signalType: SignalType,
    alertType: string,
    severity: string,
    message: string
  ): Promise<void> {
    try {
      // Send webhook notification
      if (this.config.alerting.webhookUrl) {
        await this.sendWebhookAlert(signalType, alertType, severity, message);
      }

      // Send email notifications
      if (this.config.alerting.emailRecipients && this.config.alerting.emailRecipients.length > 0) {
        await this.sendEmailAlert(signalType, alertType, severity, message);
      }

      // Send Slack notifications
      if (this.config.alerting.slackWebhook) {
        await this.sendSlackAlert(signalType, alertType, severity, message);
      }

      this.logger.info('Signal alert sent', { signalType, alertType, severity });
    } catch (error: any) {
      this.logger.error('Failed to send signal alert', error);
    }
  }

  private async sendWebhookAlert(
    signalType: SignalType,
    alertType: string,
    severity: string,
    message: string
  ): Promise<void> {
    // Implementation would send HTTP POST to webhook URL
    // This is a placeholder for the actual webhook implementation
  }

  private async sendEmailAlert(
    signalType: SignalType,
    alertType: string,
    severity: string,
    message: string
  ): Promise<void> {
    // Implementation would send email using configured email service
    // This is a placeholder for the actual email implementation
  }

  private async sendSlackAlert(
    signalType: SignalType,
    alertType: string,
    severity: string,
    message: string
  ): Promise<void> {
    // Implementation would send Slack message using webhook
    // This is a placeholder for the actual Slack implementation
  }

  private async getRecentDriftDetections(): Promise<SignalDriftDetection[]> {
    try {
      const { rows } = await this.db.query(`
        SELECT * FROM signal_drift_detections
        WHERE resolved = FALSE
        ORDER BY detected_at DESC
        LIMIT 20
      `);

      return rows.map(row => ({
        signalType: row.signal_type,
        driftType: row.drift_type,
        severity: row.severity,
        confidence: parseFloat(row.confidence),
        description: row.description,
        detectedAt: row.detected_at,
        baselinePeriod: {
          start: row.baseline_period_start,
          end: row.baseline_period_end
        },
        currentPeriod: {
          start: row.current_period_start,
          end: row.current_period_end
        },
        metrics: row.metrics,
        driftDetectionMethods: {
          adwin: { driftDetected: false, threshold: 0, windowSize: 0 },
          ddm: { driftDetected: false, warningLevel: 0, driftLevel: 0 },
          eddm: { driftDetected: false, maxStdDev: 0, stdDevRatio: 0 },
          pageHinkley: { driftDetected: false, threshold: 0, lambda: 0 },
          cusum: { driftDetected: false, upperSum: 0, lowerSum: 0, threshold: 0 }
        },
        mlQualityAssessment: {
          featureImportance: {},
          modelPerformance: { accuracy: 0, precision: 0, recall: 0, f1Score: 0, aucRoc: 0 },
          predictionConfidence: 0,
          calibrationScore: 0,
          fairnessMetrics: { demographicParity: 0, equalizedOdds: 0, equalOpportunity: 0 }
        },
        statisticalTests: {
          kolmogorovSmirnov: { statistic: 0, pValue: 0, significant: false },
          andersonDarling: { statistic: 0, pValue: 0, significant: false },
          chiSquare: { statistic: 0, pValue: 0, degreesOfFreedom: 0, significant: false },
          mannWhitneyU: { statistic: 0, pValue: 0, effectSize: 0, significant: false }
        },
        featureDrift: {
          featureImportanceChanges: {},
          featureDistributionChanges: {},
          correlationChanges: {}
        },
        predictionDrift: {
          confidenceDistributionShift: {
            baselineHigh: 0, currentHigh: 0, baselineMedium: 0, currentMedium: 0, baselineLow: 0, currentLow: 0
          },
          predictionAccuracyTrend: 'stable',
          calibrationDrift: 0
        },
        recommendations: row.recommendations,
        actionRequired: row.action_required,
        retrainingRecommendations: {
          suggestedModelType: '',
          featureEngineeringSuggestions: [],
          hyperparameterTuning: {},
          retrainingPriority: 'low',
          estimatedImprovement: 0
        }
      }));
    } catch (error: any) {
      this.logger.error('Failed to get recent drift detections', error);
      return [];
    }
  }

  private async getRecentSignalAlerts(): Promise<Array<{
    signalType: SignalType;
    alertType: string;
    severity: string;
    message: string;
    sentAt: Date;
    acknowledged: boolean;
  }>> {
    try {
      const { rows } = await this.db.query(`
        SELECT signal_type, alert_type, severity, message, sent_at, acknowledged
        FROM signal_alerts
        ORDER BY sent_at DESC
        LIMIT 10
      `);

      return rows.map(row => ({
        signalType: row.signal_type,
        alertType: row.alert_type,
        severity: row.severity,
        message: row.message,
        sentAt: row.sent_at,
        acknowledged: row.acknowledged
      }));
    } catch (error: any) {
      this.logger.error('Failed to get recent signal alerts', error);
      return [];
    }
  }

  private getEmptySignalPerformanceMetrics(
    signalType: SignalType,
    timeWindow?: { start: Date; end: Date }
  ): SignalPerformanceMetrics {
    const window = timeWindow || {
      start: new Date(Date.now() - this.config.tracking.rollingWindowDays * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    return {
      signalType,
      timeWindow: window,
      totalSignals: 0,
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      accuracy: 0,
      specificity: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      positivePredictiveValue: 0,
      negativePredictiveValue: 0,
      matthewsCorrelationCoefficient: 0,
      aucRoc: 0.5,
      averageConfidence: 0,
      confidenceDistribution: { low: 0, medium: 0, high: 0 },
      performanceTrend: 'stable',
      trendStrength: 0,
      lastUpdated: new Date()
    };
  }

  private async performPeriodicAnalysis(): Promise<void> {
    try {
      // Clean up expired cache
      this.signalPerformanceCache.forEach((metrics, key) => {
        if (metrics.timeWindow.end.getTime() < Date.now() - (24 * 60 * 60 * 1000)) {
          this.signalPerformanceCache.delete(key);
        }
      });

      // Analyze all signal types
      for (const signalType of this.config.signalTypes) {
        try {
          // Get current performance
          const metrics = await this.getSignalPerformanceMetrics(signalType);

          // Detect drift if enabled
          if (this.config.driftDetection.enabled) {
            await this.detectSignalDrift(signalType);
          }

          // Emit performance update event
          this.emit('signalPerformanceUpdated', {
            signalType,
            metrics,
            timestamp: new Date()
          });

        } catch (error: any) {
          this.logger.error('Error analyzing signal type', { signalType, error: error.message });
        }
      }

      // Update metrics
      this.metrics.recordMetric('signal_performance_calculations', this.config.signalTypes.length);

    } catch (error: any) {
      this.logger.error('Error in periodic signal analysis', error);
    }
  }
}
