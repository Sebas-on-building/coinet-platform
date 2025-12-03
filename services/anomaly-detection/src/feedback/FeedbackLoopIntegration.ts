/**
 * Feedback Loop Integration
 * REVOLUTIONARY: Seamless integration of automated feedback loops with existing AI systems
 * Coordinates all feedback loop components and integrates them with anomaly detection,
 * explainability, and model management systems
 */

import { EventEmitter } from 'events';
import { Anomaly, DataPoint, AnomalyType } from '../core/types';

// Import all feedback loop components
import { AutomatedFeedbackLoopSystem, PredictionOutcome, UserFeedback, MarketPerformance, SelfCorrectionAction } from './AutomatedFeedbackLoopSystem';
import { FeedbackDataLogger } from './FeedbackDataLogger';
import { ContinuousModelUpdater } from './ContinuousModelUpdater';
import { SelfCorrectionEngine } from './SelfCorrectionEngine';
import { FeedbackDashboardSystem } from './FeedbackDashboardSystem';

export interface FeedbackLoopConfig {
  enableContinuousOptimization: boolean;
  enableSelfCorrection: boolean;
  enableRealTimeDashboards: boolean;
  optimizationInterval: number; // milliseconds
  correctionCheckInterval: number; // milliseconds
  dashboardUpdateInterval: number; // milliseconds
  dataRetentionDays: number;
  autoExecuteCorrections: boolean;
  minAccuracyThreshold: number;
  maxFalsePositiveRate: number;
}

export interface IntegratedFeedbackResult {
  predictionOutcome?: PredictionOutcome;
  modelUpdates?: Array<{
    parameter: string;
    oldValue: number;
    newValue: number;
    reason: string;
  }>;
  correctionsApplied?: Array<{
    type: string;
    description: string;
    impact: number;
  }>;
  explanationsGenerated?: string[];
  dashboardData?: unknown;
}

export interface ImmediateCorrectionAction {
  type: 'sensitivity_increase' | 'threshold_adjustment';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SystemIntegrationStatus {
  feedbackLoop: {
    active: boolean;
    lastUpdate: Date;
    predictionsTracked: number;
    accuracy: number;
  };
  modelUpdater: {
    active: boolean;
    optimizationsApplied: number;
    averageImprovement: number;
  };
  selfCorrection: {
    active: boolean;
    errorsDetected: number;
    correctionsApplied: number;
  };
  dataLogger: {
    active: boolean;
    entriesLogged: number;
    storageUsage: string;
  };
  dashboard: {
    active: boolean;
    dashboardsGenerated: number;
    lastUpdate: Date;
  };
  overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

export class FeedbackLoopIntegration extends EventEmitter {
  private feedbackLoopSystem: AutomatedFeedbackLoopSystem;
  private dataLogger: FeedbackDataLogger;
  private modelUpdater: ContinuousModelUpdater;
  private selfCorrectionEngine: SelfCorrectionEngine;
  private dashboardSystem: FeedbackDashboardSystem;

  private config: FeedbackLoopConfig;
  private isActive = false;
  private integrationStats = {
    predictionsTracked: 0,
    optimizationsApplied: 0,
    correctionsApplied: 0,
    dashboardsGenerated: 0
  };

  constructor(config: Partial<FeedbackLoopConfig> = {}) {
    super();

    this.config = {
      enableContinuousOptimization: true,
      enableSelfCorrection: true,
      enableRealTimeDashboards: true,
      optimizationInterval: 300000, // 5 minutes
      correctionCheckInterval: 3600000, // 1 hour
      dashboardUpdateInterval: 60000, // 1 minute
      dataRetentionDays: 90,
      autoExecuteCorrections: false,
      minAccuracyThreshold: 0.7,
      maxFalsePositiveRate: 0.3,
      ...config
    };

    // Initialize all components
    this.feedbackLoopSystem = new AutomatedFeedbackLoopSystem();
    this.dataLogger = new FeedbackDataLogger({
      predictionOutcomes: this.config.dataRetentionDays,
      userFeedback: this.config.dataRetentionDays,
      marketPerformance: this.config.dataRetentionDays,
      corrections: this.config.dataRetentionDays * 2,
      parameterUpdates: this.config.dataRetentionDays * 2,
      rawLogs: this.config.dataRetentionDays / 3
    });
    this.modelUpdater = new ContinuousModelUpdater();
    this.selfCorrectionEngine = new SelfCorrectionEngine();
    this.dashboardSystem = new FeedbackDashboardSystem();

    this.setupComponentIntegration();
    this.setupPeriodicTasks();
  }

  /**
   * Process a prediction and establish feedback loop
   */
  async processPredictionWithFeedback(
    predictionId: string,
    predictedAnomaly: Anomaly,
    options?: {
      includeExplanations?: boolean;
      enableAutoCorrection?: boolean;
      generateDashboard?: boolean;
    }
  ): Promise<IntegratedFeedbackResult> {
    const result: IntegratedFeedbackResult = {};

    try {
      // 1. Record the prediction outcome (initially without actual outcome)
      const initialOutcome = await this.feedbackLoopSystem.recordPredictionOutcome(
        predictionId,
        predictedAnomaly,
        { occurred: false } // Will be updated when actual outcome is known
      );

      result.predictionOutcome = initialOutcome;

      // 2. Generate explanations if requested
      if (options?.includeExplanations) {
        const explanations = await this.generateExplanationsForPrediction(predictedAnomaly);
        result.explanationsGenerated = explanations;
      }

      // 3. Check for immediate corrections if accuracy is low
      if (options?.enableAutoCorrection && predictedAnomaly.score < this.config.minAccuracyThreshold) {
        const corrections = await this.checkForImmediateCorrections(predictedAnomaly);
        if (corrections.length > 0) {
          const appliedCorrections = await this.applyImmediateCorrections(corrections);
          result.correctionsApplied = appliedCorrections;
        }
      }

      // 4. Generate dashboard data if requested
      if (options?.generateDashboard) {
        const dashboard = await this.dashboardSystem.generateRealTimeDashboard();
        result.dashboardData = dashboard;
      }

      // 5. Update integration statistics
      this.integrationStats.predictionsTracked++;

      this.emit('prediction_processed', {
        predictionId,
        accuracy: predictedAnomaly.score,
        correctionsApplied: result.correctionsApplied?.length || 0
      });

      return result;

    } catch (error: unknown) {
      // console.error('Error processing prediction with feedback:', error);
      this.emit('prediction_processing_error', { predictionId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Update prediction outcome with actual results
   */
  async updatePredictionOutcome(
    predictionId: string,
    actualOutcome: {
      occurred: boolean;
      actualDataPoint?: DataPoint;
      actualImpact?: number;
      marketPerformance?: MarketPerformance;
      userFeedback?: UserFeedback;
    }
  ): Promise<void> {
    try {
      // Update the prediction outcome in the feedback loop system
      const outcome = this.feedbackLoopSystem.getPredictionOutcome(predictionId);
      if (outcome) {
        outcome.actualOutcome = actualOutcome;
        outcome.accuracy = this.feedbackLoopSystem['calculateAccuracy'](outcome.predictedAnomaly, actualOutcome);

        // Log the updated outcome
        await this.dataLogger.logPredictionOutcome(predictionId, outcome.predictedAnomaly, outcome);

        // Log market performance if available
        if (actualOutcome.marketPerformance) {
          await this.dataLogger.logMarketPerformance(predictionId, actualOutcome.marketPerformance);
        }

        // Log user feedback if available
        if (actualOutcome.userFeedback) {
          await this.dataLogger.logUserFeedback(predictionId, actualOutcome.userFeedback);
        }

        // Check if corrections are needed based on actual outcome
        if (outcome.accuracy.overallAccuracy < this.config.minAccuracyThreshold) {
          await this.triggerErrorCorrection(predictionId, outcome);
        }

        this.emit('prediction_outcome_updated', {
          predictionId,
          accuracy: outcome.accuracy.overallAccuracy,
          needsCorrection: outcome.accuracy.overallAccuracy < this.config.minAccuracyThreshold
        });
      }

    } catch (error: unknown) {
      // console.error('Error updating prediction outcome:', error);
      this.emit('outcome_update_error', { predictionId, error: (error as Error).message });
    }
  }

  /**
   * Generate explanations for a prediction using integrated explainability
   */
  async generateExplanationsForPrediction(
    anomaly: Anomaly
  ): Promise<string[]> {
    const explanations = [];

    try {
      // Use the existing explainability system if available
      // For now, generate basic explanations
      explanations.push(`Anomaly detected with ${(anomaly.score * 100).toFixed(1)}% confidence`);
      explanations.push(`Type: ${anomaly.type}, Severity: ${anomaly.severity}`);
      explanations.push(`Statistical deviation: ${anomaly.deviation.standardDeviations.toFixed(2)}σ`);

      if (anomaly.context.marketConditions) {
        explanations.push(`Market context: ${anomaly.context.marketConditions.trend} trend, ${anomaly.context.marketConditions.volatility.toFixed(2)} volatility`);
      }

      return explanations;

    } catch (error: unknown) {
      // console.error('Error generating explanations:', error);
      return [`Basic anomaly explanation for ${anomaly.id}`];
    }
  }

  /**
   * Start the complete feedback loop system
   */
  async startFeedbackLoopSystem(): Promise<void> {
    if (this.isActive) {
      throw new Error('Feedback loop system is already active');
    }

    this.isActive = true;

    // Start continuous optimization if enabled
    if (this.config.enableContinuousOptimization) {
      await this.modelUpdater.startContinuousOptimization('anomaly_detector', this.config.optimizationInterval);
    }

    // Start error monitoring if enabled
    if (this.config.enableSelfCorrection) {
      await this.selfCorrectionEngine.monitorErrorRecurrence(this.config.correctionCheckInterval);
    }

    // Start dashboard updates if enabled
    if (this.config.enableRealTimeDashboards) {
      // Dashboard updates are handled automatically by the dashboard system
    }

    this.emit('feedback_loop_started', {
      continuousOptimization: this.config.enableContinuousOptimization,
      selfCorrection: this.config.enableSelfCorrection,
      realTimeDashboards: this.config.enableRealTimeDashboards
    });
  }

  /**
   * Stop the feedback loop system
   */
  async stopFeedbackLoopSystem(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Stop continuous optimization
    this.modelUpdater.stopContinuousOptimization('anomaly_detector');

    // Stop error monitoring (would need to modify SelfCorrectionEngine to support stopping)

    // Flush any remaining logs
    await this.dataLogger.shutdown();

    this.emit('feedback_loop_stopped', {
      totalPredictions: this.integrationStats.predictionsTracked,
      totalOptimizations: this.integrationStats.optimizationsApplied,
      totalCorrections: this.integrationStats.correctionsApplied
    });
  }

  /**
   * Get comprehensive system integration status
   */
  getIntegrationStatus(): SystemIntegrationStatus {
    const feedbackLoopStatus = this.feedbackLoopSystem.getStatus();
    const modelUpdaterStatus = this.modelUpdater.getStatus();
    const selfCorrectionStatus = this.selfCorrectionEngine.getStatus();
    const dataLoggerStatus = this.dataLogger.getStatus();
    const dashboardStatus = this.dashboardSystem.getStatus();

    // Determine overall health
    const healthScores = [
      feedbackLoopStatus.systemHealth === 'excellent' ? 4 :
      feedbackLoopStatus.systemHealth === 'good' ? 3 :
      feedbackLoopStatus.systemHealth === 'needs_attention' ? 2 : 1,

      modelUpdaterStatus.systemHealth === 'optimal' ? 4 :
      modelUpdaterStatus.systemHealth === 'good' ? 3 :
      modelUpdaterStatus.systemHealth === 'needs_attention' ? 2 : 1,

      selfCorrectionStatus.systemStability >= 0.8 ? 4 :
      selfCorrectionStatus.systemStability >= 0.6 ? 3 :
      selfCorrectionStatus.systemStability >= 0.4 ? 2 : 1,

      dashboardStatus.systemHealth === 'healthy' ? 4 :
      dashboardStatus.systemHealth === 'stale' ? 2 : 1
    ];

    const averageHealth = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;

    let overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
    if (averageHealth >= 3.5) overallHealth = 'excellent';
    else if (averageHealth >= 2.5) overallHealth = 'good';
    else if (averageHealth >= 1.5) overallHealth = 'needs_attention';
    else overallHealth = 'critical';

    return {
      feedbackLoop: {
        active: this.isActive,
        lastUpdate: feedbackLoopStatus.lastUpdate,
        predictionsTracked: this.integrationStats.predictionsTracked,
        accuracy: feedbackLoopStatus.accuracy,
      },
      modelUpdater: {
        active: modelUpdaterStatus.activeOptimizations.length > 0,
        optimizationsApplied: this.integrationStats.optimizationsApplied,
        averageImprovement: modelUpdaterStatus.averageImprovement
      },
      selfCorrection: {
        active: selfCorrectionStatus.autoCorrectionEnabled,
        errorsDetected: selfCorrectionStatus.activePatterns,
        correctionsApplied: this.integrationStats.correctionsApplied
      },
      dataLogger: {
        active: dataLoggerStatus.systemHealth === 'healthy',
        entriesLogged: dataLoggerStatus.totalEntries,
        storageUsage: dataLoggerStatus.retentionPolicy.rawLogs + ' days retention'
      },
      dashboard: {
        active: dashboardStatus.systemHealth === 'healthy',
        dashboardsGenerated: this.integrationStats.dashboardsGenerated,
        lastUpdate: dashboardStatus.lastUpdate
      },
      overallHealth
    };
  }

  /**
   * Export all feedback data for compliance and analysis
   */
  async exportFeedbackData(
    format: 'json' | 'csv' | 'parquet',
    timeRange?: { start: Date; end: Date }
  ): Promise<string | Buffer> {
    return this.dataLogger.exportLogs(format, {
      timeRange,
      types: ['prediction', 'outcome', 'feedback', 'performance', 'correction', 'parameter_update']
    });
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    timeRange: { start: Date; end: Date }
  ): Promise<{
    summary: {
      totalPredictions: number;
      overallAccuracy: number;
      userSatisfaction: number;
      systemImprovements: number;
    };
    accuracyTrends: unknown;
    errorAnalysis: unknown;
    recommendations: string[];
    dashboardUrl?: string;
  }> {
    const dashboard = await this.dashboardSystem.generateComprehensiveDashboard(timeRange);

    return {
      summary: {
        totalPredictions: dashboard.summary.totalPredictions,
        overallAccuracy: dashboard.summary.overallAccuracy,
        userSatisfaction: dashboard.summary.userSatisfaction,
        systemImprovements: dashboard.recommendations.length
      },
      accuracyTrends: dashboard.charts.accuracyTrend,
      errorAnalysis: dashboard.charts.errorDistribution,
      recommendations: dashboard.recommendations.map(r => r.description),
      dashboardUrl: `dashboard_${dashboard.id}`
    };
  }

  // Private helper methods

  private setupComponentIntegration(): void {
    // Set up event forwarding between components

    // Forward model updates from updater to feedback loop system
    this.modelUpdater.on('parameter_updated', (data) => {
      this.feedbackLoopSystem.emit('model_parameters_updated', data);
      this.integrationStats.optimizationsApplied++;
    });

    // Forward corrections from self-correction engine to feedback loop system
    this.selfCorrectionEngine.on('self_corrections_executed', (data: { count: number; corrections: SelfCorrectionAction[] }) => {
      this.feedbackLoopSystem.emit('self_corrections_executed', data);
      this.integrationStats.correctionsApplied += data.count;
    });

    // Forward dashboard generation events
    this.dashboardSystem.on('dashboard_generated', (data) => {
      this.integrationStats.dashboardsGenerated++;
    });

    // Forward prediction processing events
    this.feedbackLoopSystem.on('prediction_outcome_recorded', (data) => {
      this.emit('prediction_recorded', data);
    });
  }

  private setupPeriodicTasks(): void {
    // Set up periodic system health checks
    setInterval(async () => {
      if (this.isActive) {
        const status = this.getIntegrationStatus();
        this.emit('system_health_check', status);

        // Auto-correct if system health is critical
        if (status.overallHealth === 'critical' && this.config.autoExecuteCorrections) {
          await this.performEmergencyCorrections();
        }
      }
    }, 300000); // Every 5 minutes
  }

  private async checkForImmediateCorrections(anomaly: Anomaly): Promise<ImmediateCorrectionAction[]> {
    // Check if immediate corrections are needed based on anomaly characteristics
    const corrections: ImmediateCorrectionAction[] = [];

    if (anomaly.score < 0.5) {
      corrections.push({
        type: 'sensitivity_increase',
        description: 'Increase detection sensitivity for low-confidence anomalies',
        priority: 'medium'
      });
    }

    if (anomaly.deviation.standardDeviations < 1.5) {
      corrections.push({
        type: 'threshold_adjustment',
        description: 'Adjust statistical thresholds for borderline anomalies',
        priority: 'low'
      });
    }

    return corrections;
  }

  private async applyImmediateCorrections(corrections: ImmediateCorrectionAction[]): Promise<Array<{
    type: string;
    description: string;
    impact: number;
  }>> {
    const applied = [];

    for (const correction of corrections) {
      try {
        // Apply the correction immediately
        switch (correction.type) {
          case 'sensitivity_increase':
            await this.modelUpdater.executeParameterUpdates('anomaly_detector', [{
              parameter: 'sensitivity',
              currentValue: 0.8, // Assuming current value
              proposedValue: 0.9,
              expectedImprovement: 0.1,
              confidence: 0.7,
              reasoning: correction.description,
              validationMethod: 'simulation',
              risk: 0.2
            }]);
            break;

          case 'threshold_adjustment':
            await this.modelUpdater.executeParameterUpdates('anomaly_detector', [{
              parameter: 'statistical_threshold',
              currentValue: 2.5, // Assuming current value
              proposedValue: 2.0,
              expectedImprovement: 0.05,
              confidence: 0.6,
              reasoning: correction.description,
              validationMethod: 'simulation',
              risk: 0.1
            }]);
            break;
        }

        applied.push({
          type: correction.type,
          description: correction.description,
          impact: 0.1 // Estimated impact
        });

      } catch (error: unknown) {
        // console.error(`Failed to apply immediate correction ${correction.type}:`, error);
      }
    }

    return applied;
  }

  private async triggerErrorCorrection(predictionId: string, outcome: PredictionOutcome): Promise<void> {
    // Trigger error analysis and correction when accuracy is below threshold

    // Analyze for error patterns
    const recentOutcomes = this.feedbackLoopSystem.getAllPredictionOutcomes();

    const errorPatterns = await this.selfCorrectionEngine.analyzeForErrors(Array.from(recentOutcomes.values()));

    if (errorPatterns.length > 0) {
      // Identify systematic errors
      const systematicErrors = await this.selfCorrectionEngine.identifySystematicErrors(errorPatterns);

      if (systematicErrors.length > 0) {
        // Propose correction strategies
        const corrections = await this.selfCorrectionEngine.proposeCorrectionStrategies(systematicErrors);

        // Execute corrections if auto-execution is enabled
        if (this.config.autoExecuteCorrections && corrections.length > 0) {
          await this.selfCorrectionEngine.executeSelfCorrections(corrections);
        }
      }
    }
  }

  private async performEmergencyCorrections(): Promise<void> {
    // console.log('🚨 Performing emergency corrections due to critical system health');

    // Perform emergency model parameter resets
    await this.modelUpdater.executeParameterUpdates('anomaly_detector', [
      {
        parameter: 'sensitivity',
        currentValue: 0.8,
        proposedValue: 0.8,
        expectedImprovement: 0,
        confidence: 0.9,
        reasoning: 'Emergency correction: Reset sensitivity to safe default',
        validationMethod: 'simulation',
        risk: 0.1
      },
      {
        parameter: 'statistical_threshold',
        currentValue: 2.5,
        proposedValue: 2.5,
        expectedImprovement: 0,
        confidence: 0.9,
        reasoning: 'Emergency correction: Reset threshold to standard value',
        validationMethod: 'simulation',
        risk: 0.1
      }
    ]);

    this.emit('emergency_corrections_applied', {
      timestamp: new Date(),
      corrections: 2,
      reason: 'Critical system health detected'
    });
  }

  /**
   * Get system configuration
   */
  getConfig(): FeedbackLoopConfig {
    return { ...this.config };
  }

  /**
   * Update system configuration
   */
  async updateConfig(newConfig: Partial<FeedbackLoopConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    // Apply configuration changes to components
    if (newConfig.optimizationInterval) {
      this.modelUpdater.stopContinuousOptimization('anomaly_detector');
      if (this.config.enableContinuousOptimization) {
        await this.modelUpdater.startContinuousOptimization('anomaly_detector', this.config.optimizationInterval);
      }
    }

    this.emit('configuration_updated', {
      changes: Object.keys(newConfig),
      timestamp: new Date()
    });
  }
}
