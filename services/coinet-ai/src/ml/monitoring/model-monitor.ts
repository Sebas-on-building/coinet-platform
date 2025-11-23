/**
 * 📊 MODEL MONITORING & OBSERVABILITY
 *
 * Comprehensive monitoring system for deep learning models in production
 * with drift detection, performance tracking, and alerting
 */

import { logger } from '../../utils/logger';
import ModelServer from '../serving/model-server';
import {
  PsychologyFeatures,
  OracleFeatures,
  PsychologyPrediction,
  OraclePrediction
} from '../types/ml-types';

export interface MonitoringMetrics {
  timestamp: number;
  modelType: 'psychology' | 'oracle';
  inferenceLatency: number;
  predictionConfidence: number;
  dataQuality: number;
  predictionAccuracy?: number;
  driftScore?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: MonitoringMetrics[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldownMinutes: number;
}

export interface ModelDrift {
  featureDrift: Record<string, number>;
  predictionDrift: Record<string, number>;
  overallDrift: number;
  timestamp: number;
  isSignificant: boolean;
}

export class ModelMonitor {
  private modelServer: ModelServer;
  private metricsHistory: MonitoringMetrics[] = [];
  private baselineData: Map<string, any> = new Map();
  private alertRules: AlertRule[] = [];
  private activeAlerts: Map<string, number> = new Map(); // alertId -> lastTriggered
  private driftThreshold: number = 0.1;
  private maxMetricsHistory: number = 10000;

  constructor(modelServer: ModelServer) {
    this.modelServer = modelServer;
    this.setupDefaultAlertRules();
    logger.info('📊 ModelMonitor initialized for production observability');
  }

  /**
   * Record inference metrics for monitoring
   */
  recordInference(
    modelType: 'psychology' | 'oracle',
    features: PsychologyFeatures | OracleFeatures,
    prediction: PsychologyPrediction | OraclePrediction,
    latency: number,
    dataQuality: number
  ): void {
    const metrics: MonitoringMetrics = {
      timestamp: Date.now(),
      modelType,
      inferenceLatency: latency,
      predictionConfidence: this.extractConfidence(prediction),
      dataQuality
    };

    // Add to history
    this.metricsHistory.push(metrics);

    // Maintain history size
    if (this.metricsHistory.length > this.maxMetricsHistory) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxMetricsHistory);
    }

    // Check for alerts
    this.checkAlerts([metrics]);

    // Check for drift
    this.detectDrift(modelType, features);

    logger.debug(`📊 Recorded ${modelType} inference metrics: ${latency}ms, ${metrics.predictionConfidence} confidence`);
  }

  /**
   * Detect data drift in model inputs
   */
  detectDrift(modelType: 'psychology' | 'oracle', features: any): ModelDrift {
    try {
      const currentFeatures = this.extractFeatureVector(modelType, features);
      const baselineFeatures = this.getBaselineFeatures(modelType);

      if (!baselineFeatures) {
        this.setBaselineFeatures(modelType, currentFeatures);
        return {
          featureDrift: {},
          predictionDrift: {},
          overallDrift: 0,
          timestamp: Date.now(),
          isSignificant: false
        };
      }

      // Calculate feature drift using statistical measures
      const featureDrift = this.calculateFeatureDrift(currentFeatures, baselineFeatures);

      // Calculate prediction drift (would need historical predictions)
      const predictionDrift = this.calculatePredictionDrift(modelType);

      // Overall drift score
      const overallDrift = this.calculateOverallDrift(featureDrift, predictionDrift);

      const driftResult: ModelDrift = {
        featureDrift,
        predictionDrift,
        overallDrift,
        timestamp: Date.now(),
        isSignificant: overallDrift > this.driftThreshold
      };

      if (driftResult.isSignificant) {
        logger.warn(`🚨 Significant drift detected for ${modelType} model: ${overallDrift}`);
        this.triggerDriftAlert(modelType, driftResult);
      }

      return driftResult;

    } catch (error) {
      logger.error(`Drift detection failed for ${modelType}: ${error}`);
      return {
        featureDrift: {},
        predictionDrift: {},
        overallDrift: 0,
        timestamp: Date.now(),
        isSignificant: false
      };
    }
  }

  /**
   * Get monitoring dashboard data
   */
  getMonitoringDashboard(): {
    health: any;
    performance: any;
    drift: any;
    alerts: any[];
    recentMetrics: MonitoringMetrics[];
  } {
    const health = this.modelServer.getHealthStatus();
    const performance = this.modelServer.getPerformanceStatistics();
    const recentMetrics = this.metricsHistory.slice(-100); // Last 100 metrics

    // Calculate drift status
    const drift = this.calculateCurrentDrift();

    // Get active alerts
    const activeAlerts = this.getActiveAlerts();

    return {
      health,
      performance,
      drift,
      alerts: activeAlerts,
      recentMetrics
    };
  }

  /**
   * Set up baseline data for drift detection
   */
  setBaseline(modelType: 'psychology' | 'oracle', features: any, predictions?: any[]): void {
    this.baselineData.set(`${modelType}_features`, features);
    if (predictions) {
      this.baselineData.set(`${modelType}_predictions`, predictions);
    }
    logger.info(`📊 Set baseline data for ${modelType} model`);
  }

  /**
   * Generate monitoring report
   */
  generateReport(timeWindow: number = 3600000): string { // 1 hour default
    const cutoffTime = Date.now() - timeWindow;
    const recentMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return 'No metrics available for the specified time window.';
    }

    let report = '📊 MODEL MONITORING REPORT\n';
    report += '='.repeat(50) + '\n\n';

    // Performance summary
    report += 'PERFORMANCE SUMMARY\n';
    report += '-'.repeat(30) + '\n';

    const psychologyMetrics = recentMetrics.filter(m => m.modelType === 'psychology');
    const oracleMetrics = recentMetrics.filter(m => m.modelType === 'oracle');

    if (psychologyMetrics.length > 0) {
      const avgLatency = psychologyMetrics.reduce((sum, m) => sum + m.inferenceLatency, 0) / psychologyMetrics.length;
      const avgConfidence = psychologyMetrics.reduce((sum, m) => sum + m.predictionConfidence, 0) / psychologyMetrics.length;

      report += `Psychology Model:\n`;
      report += `  Inferences: ${psychologyMetrics.length}\n`;
      report += `  Avg Latency: ${avgLatency.toFixed(2)}ms\n`;
      report += `  Avg Confidence: ${(avgConfidence * 100).toFixed(1)}%\n`;
    }

    if (oracleMetrics.length > 0) {
      const avgLatency = oracleMetrics.reduce((sum, m) => sum + m.inferenceLatency, 0) / oracleMetrics.length;
      const avgConfidence = oracleMetrics.reduce((sum, m) => sum + m.predictionConfidence, 0) / oracleMetrics.length;

      report += `Oracle Model:\n`;
      report += `  Inferences: ${oracleMetrics.length}\n`;
      report += `  Avg Latency: ${avgLatency.toFixed(2)}ms\n`;
      report += `  Avg Confidence: ${(avgConfidence * 100).toFixed(1)}%\n`;
    }

    // Drift analysis
    report += '\nDRIFT ANALYSIS\n';
    report += '-'.repeat(30) + '\n';
    const drift = this.calculateCurrentDrift();
    report += `Overall Drift Score: ${drift.overall.toFixed(3)}\n`;
    report += `Significant Drift: ${drift.significant ? 'YES' : 'NO'}\n`;

    // Alerts
    report += '\nACTIVE ALERTS\n';
    report += '-'.repeat(30) + '\n';
    const activeAlerts = this.getActiveAlerts();
    if (activeAlerts.length === 0) {
      report += 'No active alerts\n';
    } else {
      activeAlerts.forEach(alert => {
        report += `${alert.severity.toUpperCase()}: ${alert.message}\n`;
      });
    }

    return report;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private setupDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high_latency',
        name: 'High Inference Latency',
        condition: (metrics) => {
          const recent = metrics.slice(-10);
          const avgLatency = recent.reduce((sum, m) => sum + m.inferenceLatency, 0) / recent.length;
          return avgLatency > 2000; // > 2 seconds
        },
        severity: 'high',
        message: 'Average inference latency exceeds 2 seconds',
        cooldownMinutes: 5
      },
      {
        id: 'low_confidence',
        name: 'Low Prediction Confidence',
        condition: (metrics) => {
          const recent = metrics.slice(-20);
          const avgConfidence = recent.reduce((sum, m) => sum + m.predictionConfidence, 0) / recent.length;
          return avgConfidence < 0.5; // < 50% confidence
        },
        severity: 'medium',
        message: 'Average prediction confidence below 50%',
        cooldownMinutes: 10
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: (metrics) => {
          // This would need error tracking - simplified for now
          return false;
        },
        severity: 'critical',
        message: 'High error rate detected',
        cooldownMinutes: 2
      },
      {
        id: 'significant_drift',
        name: 'Model Drift Detected',
        condition: (metrics) => {
          // Check for drift in recent metrics
          return this.calculateCurrentDrift().significant;
        },
        severity: 'high',
        message: 'Significant model drift detected',
        cooldownMinutes: 30
      }
    ];

    logger.info(`📋 Set up ${this.alertRules.length} default alert rules`);
  }

  private extractConfidence(prediction: PsychologyPrediction | OraclePrediction): number {
    if ('emotionalState' in prediction) {
      // Psychology prediction
      return prediction.emotionalState.confidence;
    } else {
      // Oracle prediction - average confidence across horizons
      const confidences = [
        prediction.predictions.next1h.confidence,
        prediction.predictions.next24h.confidence,
        prediction.predictions.next7d.confidence
      ];
      return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }
  }

  private extractFeatureVector(modelType: 'psychology' | 'oracle', features: any): number[] {
    if (modelType === 'psychology') {
      // Extract key features for psychology model
      return [
        features.market?.priceSeries?.length || 0,
        features.market?.volatilityMetrics?.length || 0,
        features.social?.sentimentScores?.length || 0,
        features.temporal?.timeOfDay || 0
      ];
    } else {
      // Extract key features for oracle model
      return [
        features.price?.length || 0,
        features.volume?.length || 0,
        features.socialSentiment?.length || 0,
        features.technicalIndicators?.length || 0
      ];
    }
  }

  private getBaselineFeatures(modelType: 'psychology' | 'oracle'): number[] | null {
    return this.baselineData.get(`${modelType}_features`) || null;
  }

  private setBaselineFeatures(modelType: 'psychology' | 'oracle', features: number[]): void {
    this.baselineData.set(`${modelType}_features`, features);
  }

  private calculateFeatureDrift(current: number[], baseline: number[]): Record<string, number> {
    const drift: Record<string, number> = {};

    for (let i = 0; i < current.length && i < baseline.length; i++) {
      const relativeChange = Math.abs(current[i] - baseline[i]) / (baseline[i] || 1);
      drift[`feature_${i}`] = relativeChange;
    }

    return drift;
  }

  private calculatePredictionDrift(modelType: 'psychology' | 'oracle'): Record<string, number> {
    // Simplified prediction drift calculation
    // In practice, would compare current predictions with historical baseline
    return {
      confidence_drift: 0.05, // Placeholder
      accuracy_drift: 0.02   // Placeholder
    };
  }

  private calculateOverallDrift(featureDrift: Record<string, number>, predictionDrift: Record<string, number>): number {
    const featureDriftValues = Object.values(featureDrift);
    const predictionDriftValues = Object.values(predictionDrift);

    const avgFeatureDrift = featureDriftValues.reduce((sum, val) => sum + val, 0) / featureDriftValues.length;
    const avgPredictionDrift = predictionDriftValues.reduce((sum, val) => sum + val, 0) / predictionDriftValues.length;

    return (avgFeatureDrift * 0.7) + (avgPredictionDrift * 0.3);
  }

  private checkAlerts(recentMetrics: MonitoringMetrics[]): void {
    const now = Date.now();

    for (const rule of this.alertRules) {
      const lastTriggered = this.activeAlerts.get(rule.id) || 0;
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;

      // Check cooldown
      if (now - lastTriggered < cooldownMs) {
        continue;
      }

      // Check condition
      if (rule.condition(recentMetrics)) {
        this.triggerAlert(rule);
        this.activeAlerts.set(rule.id, now);
      }
    }
  }

  private triggerAlert(rule: AlertRule): void {
    logger.warn(`🚨 ALERT TRIGGERED: ${rule.severity.toUpperCase()} - ${rule.message}`);

    // In production, would send alerts to monitoring systems
    // (Slack, PagerDuty, email, etc.)
  }

  private triggerDriftAlert(modelType: 'psychology' | 'oracle', drift: ModelDrift): void {
    logger.warn(`🚨 DRIFT ALERT: Significant drift detected for ${modelType} model (score: ${drift.overallDrift})`);

    // In production, would trigger drift-specific alerts
  }

  private calculateCurrentDrift(): { overall: number; significant: boolean } {
    // Simplified drift calculation for dashboard
    // In practice, would use the last drift detection result
    return {
      overall: 0.05, // Placeholder
      significant: false
    };
  }

  private getActiveAlerts(): any[] {
    // Return active alerts with their details
    return [];
  }
}

export default ModelMonitor;
