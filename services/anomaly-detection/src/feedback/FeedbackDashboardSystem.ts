/**
 * Feedback Dashboard System
 * REVOLUTIONARY: Real-time visualization and analytics for AI feedback loops
 * Provides comprehensive dashboards showing prediction accuracy trends,
 * improvement areas, and system performance over time
 */

import { EventEmitter } from 'events';
import {
  PredictionOutcome,
  UserFeedback,
  MarketPerformance,
  SelfCorrectionAction
} from './AutomatedFeedbackLoopSystem';

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'heatmap' | 'gauge' | 'timeline';
  size: { width: number; height: number };
  position: { x: number; y: number };
  data: unknown;
  refreshInterval?: number;
  config: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'masonry' | 'custom';
  theme: 'light' | 'dark' | 'auto';
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface PerformanceChart {
  title: string;
  type: 'line' | 'bar' | 'area' | 'scatter' | 'timeline';
  data: Array<{ timestamp: Date; value: number; label?: string }>;
  xAxis: { label: string; format: string };
  yAxis: { label: string; format: string; range?: [number, number] };
  annotations?: Array<{ timestamp: Date; text: string; type: 'info' | 'warning' | 'error' }>;
}

export interface AccuracyHeatmap {
  title: string;
  data: Array<Array<{ value: number; label: string; color?: string }>>;
  xLabels: string[];
  yLabels: string[];
  colorScale: { min: number; max: number; colors: string[] };
}

export interface TrendAnalysis {
  metric: string;
  direction: 'improving' | 'declining' | 'stable' | 'volatile';
  confidence: number;
  slope: number;
  changePoints: Date[];
  forecast?: Array<{ timestamp: Date; predictedValue: number; confidence: number }>;
}

export interface ImprovementRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'accuracy' | 'efficiency' | 'user_experience' | 'reliability';
  expectedImpact: number;
  effort: 'low' | 'medium' | 'high';
  implementationTime: string;
  dependencies: string[];
}

export interface ComprehensiveDashboard {
  id: string;
  title: string;
  description: string;
  timeRange: { start: Date; end: Date };
  summary: {
    overallAccuracy: number;
    totalPredictions: number;
    userSatisfaction: number;
    systemHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
    keyInsights: string[];
  };
  charts: {
    accuracyTrend: PerformanceChart;
    errorDistribution: PerformanceChart;
    userFeedback: PerformanceChart;
    performanceHeatmap: AccuracyHeatmap;
    correctionTimeline: PerformanceChart;
  };
  metrics: {
    current: Record<string, number>;
    targets: Record<string, number>;
    improvements: Record<string, number>;
  };
  trends: TrendAnalysis[];
  recommendations: ImprovementRecommendation[];
  alerts: Array<{
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    timestamp: Date;
    actionRequired: boolean;
  }>;
}

export class FeedbackDashboardSystem extends EventEmitter {
  private dashboards: Map<string, ComprehensiveDashboard> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private activeVisualizations: Set<string> = new Set();

  constructor() {
    super();
    this.initializeDefaultDashboards();
    this.setupRealTimeUpdates();
  }

  /**
   * Generate comprehensive feedback dashboard
   */
  async generateComprehensiveDashboard(
    timeRange: { start: Date; end: Date },
    filters?: {
      modelTypes?: string[];
      anomalyTypes?: string[];
      severityLevels?: string[];
    }
  ): Promise<ComprehensiveDashboard> {
    const dashboardId = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Gather data for the dashboard
    const predictionOutcomes = await this.getPredictionOutcomes(timeRange, filters);
    const userFeedback = await this.getUserFeedback(timeRange, filters);
    const marketPerformance = await this.getMarketPerformance(timeRange, filters);
    const corrections = await this.getCorrectionHistory(timeRange);

    // Generate dashboard components
    const summary = this.generateDashboardSummary(predictionOutcomes, userFeedback);
    const charts = await this.generateCharts(predictionOutcomes, userFeedback, marketPerformance, corrections);
    const metrics = this.generateMetrics(predictionOutcomes, userFeedback);
    const trends = this.analyzeTrends(predictionOutcomes, userFeedback);
    const recommendations = this.generateRecommendations(predictionOutcomes, userFeedback, trends);
    const alerts = this.generateAlerts(predictionOutcomes, userFeedback, trends);

    const dashboard: ComprehensiveDashboard = {
      id: dashboardId,
      title: 'AI Feedback Loop Analytics Dashboard',
      description: 'Comprehensive view of AI prediction accuracy and continuous improvement',
      timeRange,
      summary,
      charts,
      metrics,
      trends,
      recommendations,
      alerts
    };

    this.dashboards.set(dashboardId, dashboard);

    this.emit('dashboard_generated', {
      dashboardId,
      timeRange,
      dataPoints: predictionOutcomes.length,
      insights: summary.keyInsights.length
    });

    return dashboard;
  }

  /**
   * Generate real-time performance monitoring dashboard
   */
  async generateRealTimeDashboard(): Promise<ComprehensiveDashboard> {
    const timeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    };

    return this.generateComprehensiveDashboard(timeRange);
  }

  /**
   * Create custom dashboard layout
   */
  async createCustomDashboard(
    name: string,
    description: string,
    widgetConfigs: Array<{
      type: DashboardWidget['type'];
      title: string;
      size: { width: number; height: number };
      config: Record<string, unknown>;
    }>
  ): Promise<DashboardLayout> {
    const layout: DashboardLayout = {
      id: `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      widgets: [],
      layout: 'grid',
      theme: 'auto',
      autoRefresh: true,
      refreshInterval: 30000 // 30 seconds
    };

    // Create widgets based on configurations
    let positionY = 0;
    widgetConfigs.forEach((config, index) => {
      const widget: DashboardWidget = {
        id: `widget_${Date.now()}_${index}`,
        title: config.title,
        type: config.type,
        size: config.size,
        position: { x: 0, y: positionY },
        data: null,
        refreshInterval: 30000,
        config: config.config
      };

      layout.widgets.push(widget);
      positionY += config.size.height + 20; // 20px spacing
    });

    this.emit('custom_dashboard_created', {
      layoutId: layout.id,
      widgetCount: layout.widgets.length,
      layoutType: layout.layout
    });

    return layout;
  }

  /**
   * Generate accuracy trend visualization
   */
  async generateAccuracyTrend(
    timeRange: { start: Date; end: Date },
    granularity: 'hour' | 'day' | 'week' = 'day'
  ): Promise<PerformanceChart> {
    const outcomes = await this.getPredictionOutcomes(timeRange);

    // Group by time granularity
    const groupedData = this.groupOutcomesByTime(outcomes, granularity);

    const chart: PerformanceChart = {
      title: 'Prediction Accuracy Trend',
      type: 'line',
      data: groupedData.map(group => ({
        timestamp: group.timestamp,
        value: group.averageAccuracy,
        label: `${group.count} predictions`
      })),
      xAxis: {
        label: 'Time',
        format: granularity === 'hour' ? 'HH:mm' : granularity === 'day' ? 'MMM dd' : 'MMM yyyy'
      },
      yAxis: {
        label: 'Accuracy',
        format: '0.0%',
        range: [0, 1]
      },
      annotations: this.generateTrendAnnotations(groupedData)
    };

    return chart;
  }

  /**
   * Generate error pattern heatmap
   */
  async generateErrorPatternHeatmap(
    timeRange: { start: Date; end: Date }
  ): Promise<AccuracyHeatmap> {
    const outcomes = await this.getPredictionOutcomes(timeRange);

    // Create error pattern matrix
    const errorTypes = ['false_positive', 'false_negative', 'timing_error', 'severity_mismatch'];
    const timeBuckets = this.createTimeBuckets(timeRange, 24); // 24 time buckets

    const heatmapData = timeBuckets.map(timeBucket => {
      const bucketOutcomes = outcomes.filter(outcome =>
        outcome.timestamp >= timeBucket.start && outcome.timestamp < timeBucket.end
      );

      return errorTypes.map(errorType => {
        const errorCount = this.countErrorsByType(bucketOutcomes, errorType);
        const errorRate = bucketOutcomes.length > 0 ? errorCount / bucketOutcomes.length : 0;

        return {
          value: errorRate,
          label: `${(errorRate * 100).toFixed(1)}%`,
          color: this.getErrorColor(errorRate)
        };
      });
    });

    const heatmap: AccuracyHeatmap = {
      title: 'Error Pattern Heatmap',
      data: heatmapData,
      xLabels: errorTypes,
      yLabels: timeBuckets.map(bucket => bucket.label),
      colorScale: {
        min: 0,
        max: 0.5,
        colors: ['#10b981', '#fbbf24', '#f59e0b', '#ef4444']
      }
    };

    return heatmap;
  }

  /**
   * Generate improvement recommendations based on current performance
   */
  async generateImprovementRecommendations(
    timeRange: { start: Date; end: Date }
  ): Promise<ImprovementRecommendation[]> {
    const outcomes = await this.getPredictionOutcomes(timeRange);
    const feedback = await this.getUserFeedback(timeRange);

    const recommendations: ImprovementRecommendation[] = [];

    // Analyze accuracy trends
    const accuracyTrend = this.analyzeAccuracyTrend(outcomes);
    if (accuracyTrend.direction === 'declining' && accuracyTrend.confidence > 0.7) {
      recommendations.push({
        id: `rec_${Date.now()}_accuracy`,
        title: 'Improve Prediction Accuracy',
        description: 'Accuracy has been declining. Consider retraining models with more recent data.',
        priority: 'high',
        category: 'accuracy',
        expectedImpact: 0.15,
        effort: 'medium',
        implementationTime: '1-2 weeks',
        dependencies: ['recent_training_data', 'model_retraining_pipeline']
      });
    }

    // Analyze user satisfaction
    const avgSatisfaction = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
    if (avgSatisfaction < 3.5) {
      recommendations.push({
        id: `rec_${Date.now()}_satisfaction`,
        title: 'Enhance User Experience',
        description: 'User satisfaction is below target. Improve explanation quality and interface.',
        priority: 'medium',
        category: 'user_experience',
        expectedImpact: 0.2,
        effort: 'low',
        implementationTime: '2-3 days',
        dependencies: ['ui_improvements', 'explanation_enhancements']
      });
    }

    // Analyze false positive/negative rates
    const falsePositiveRate = this.calculateFalsePositiveRate(outcomes);
    const falseNegativeRate = this.calculateFalseNegativeRate(outcomes);

    if (falsePositiveRate > 0.3) {
      recommendations.push({
        id: `rec_${Date.now()}_false_positive`,
        title: 'Reduce False Positives',
        description: 'High false positive rate detected. Adjust detection thresholds.',
        priority: 'medium',
        category: 'accuracy',
        expectedImpact: 0.1,
        effort: 'low',
        implementationTime: '1 day',
        dependencies: ['threshold_optimization']
      });
    }

    if (falseNegativeRate > 0.2) {
      recommendations.push({
        id: `rec_${Date.now()}_false_negative`,
        title: 'Reduce False Negatives',
        description: 'High false negative rate detected. Increase model sensitivity.',
        priority: 'high',
        category: 'accuracy',
        expectedImpact: 0.12,
        effort: 'medium',
        implementationTime: '3-5 days',
        dependencies: ['sensitivity_tuning', 'feature_engineering']
      });
    }

    return recommendations;
  }

  /**
   * Generate performance comparison dashboard
   */
  async generatePerformanceComparison(
    baselineTimeRange: { start: Date; end: Date },
    comparisonTimeRange: { start: Date; end: Date }
  ): Promise<{
    baselineMetrics: Record<string, number>;
    comparisonMetrics: Record<string, number>;
    improvements: Record<string, number>;
    significantChanges: Array<{
      metric: string;
      change: number;
      significance: number;
      interpretation: string;
    }>;
  }> {
    const baselineOutcomes = await this.getPredictionOutcomes(baselineTimeRange);
    const comparisonOutcomes = await this.getPredictionOutcomes(comparisonTimeRange);

    const baselineMetrics = this.calculateMetrics(baselineOutcomes);
    const comparisonMetrics = this.calculateMetrics(comparisonOutcomes);

    const improvements = this.calculateImprovements(baselineMetrics, comparisonMetrics);
    const significantChanges = this.identifySignificantChanges(baselineMetrics, comparisonMetrics);

    this.emit('performance_comparison_generated', {
      baselinePeriod: baselineTimeRange,
      comparisonPeriod: comparisonTimeRange,
      improvements: Object.keys(improvements).length,
      significantChanges: significantChanges.length
    });

    return {
      baselineMetrics,
      comparisonMetrics,
      improvements,
      significantChanges
    };
  }

  /**
   * Export dashboard as static report
   */
  async exportDashboard(
    dashboardId: string,
    format: 'pdf' | 'html' | 'json' | 'png'
  ): Promise<string | Buffer> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(dashboard, null, 2);

      case 'html':
        return this.generateHTMLReport(dashboard);

      case 'pdf':
        // Would use a PDF generation library
        throw new Error('PDF export not implemented yet');

      case 'png':
        // Would use a charting library to generate images
        throw new Error('PNG export not implemented yet');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private async getPredictionOutcomes(
    _timeRange: { start: Date; end: Date },
    _filters?: unknown
  ): Promise<PredictionOutcome[]> {
    // This would query the feedback data logger
    return [];
  }

  private async getUserFeedback(
    _timeRange: { start: Date; end: Date },
    _filters?: unknown
  ): Promise<UserFeedback[]> {
    // This would query the feedback data logger
    return [];
  }

  private async getMarketPerformance(
    _timeRange: { start: Date; end: Date },
    _filters?: unknown
  ): Promise<MarketPerformance[]> {
    // This would query the feedback data logger
    return [];
  }

  private async getCorrectionHistory(
    _timeRange: { start: Date; end: Date }
  ): Promise<SelfCorrectionAction[]> {
    // This would query the self-correction engine
    return [];
  }

  private generateDashboardSummary(
    _outcomes: PredictionOutcome[],
    _feedback: UserFeedback[]
  ): ComprehensiveDashboard['summary'] {
    const overallAccuracy = _outcomes.length > 0 ?
      _outcomes.reduce((sum, o) => sum + o.accuracy.overallAccuracy, 0) / _outcomes.length : 0;

    const avgSatisfaction = _feedback.length > 0 ?
      _feedback.reduce((sum, f) => sum + f.rating, 0) / _feedback.length : 0;

    const systemHealth = this.determineSystemHealth(overallAccuracy, avgSatisfaction);

    const keyInsights = this.generateKeyInsights(_outcomes, _feedback);

    return {
      overallAccuracy,
      totalPredictions: _outcomes.length,
      userSatisfaction: avgSatisfaction,
      systemHealth,
      keyInsights
    };
  }

  private async generateCharts(
    _outcomes: PredictionOutcome[],
    _feedback: UserFeedback[],
    _performance: MarketPerformance[],
    _corrections: SelfCorrectionAction[]
  ): Promise<ComprehensiveDashboard['charts']> {
    return {
      accuracyTrend: await this.generateAccuracyTrendChart(_outcomes),
      errorDistribution: await this.generateErrorDistributionChart(_outcomes),
      userFeedback: await this.generateUserFeedbackChart(_feedback),
      performanceHeatmap: await this.generatePerformanceHeatmap(_outcomes),
      correctionTimeline: await this.generateCorrectionTimelineChart(_corrections)
    };
  }

  private async generateAccuracyTrendChart(_outcomes: PredictionOutcome[]): Promise<PerformanceChart> {
    const dailyData = this.groupOutcomesByTime(_outcomes, 'day');

    return {
      title: 'Daily Accuracy Trend',
      type: 'line',
      data: dailyData.map(day => ({
        timestamp: day.timestamp,
        value: day.averageAccuracy,
        label: `${day.count} predictions`
      })),
      xAxis: { label: 'Date', format: 'MMM dd' },
      yAxis: { label: 'Accuracy', format: '0.0%', range: [0, 1] }
    };
  }

  private async generateErrorDistributionChart(_outcomes: PredictionOutcome[]): Promise<PerformanceChart> {
    const errorTypes = ['false_positive', 'false_negative', 'timing_error', 'severity_mismatch'];
    const errorCounts = errorTypes.map(type => this.countErrorsByType(_outcomes, type));

    return {
      title: 'Error Distribution',
      type: 'bar',
      data: errorTypes.map((type, index) => ({
        timestamp: new Date(),
        value: errorCounts[index],
        label: type.replace('_', ' ')
      })),
      xAxis: { label: 'Error Type', format: 'string' },
      yAxis: { label: 'Count', format: 'number' }
    };
  }

  private async generateUserFeedbackChart(_feedback: UserFeedback[]): Promise<PerformanceChart> {
    const dailyFeedback = this.groupFeedbackByTime(_feedback, 'day');

    return {
      title: 'User Satisfaction Trend',
      type: 'line',
      data: dailyFeedback.map(day => ({
        timestamp: day.timestamp,
        value: day.averageRating,
        label: `${day.count} feedback entries`
      })),
      xAxis: { label: 'Date', format: 'MMM dd' },
      yAxis: { label: 'Satisfaction', format: '0.0', range: [1, 5] }
    };
  }

  private async generatePerformanceHeatmap(_outcomes: PredictionOutcome[]): Promise<AccuracyHeatmap> {
    const timeBuckets = this.createTimeBuckets(
      { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
      7
    );

    const metrics = ['accuracy', 'precision', 'recall'];

    const heatmapData = timeBuckets.map(timeBucket => {
      const bucketOutcomes = _outcomes.filter(outcome =>
        outcome.timestamp >= timeBucket.start && outcome.timestamp < timeBucket.end
      );

      return metrics.map(metric => {
        const value = this.calculateMetricForOutcomes(bucketOutcomes, metric);
        return {
          value,
          label: `${(value * 100).toFixed(1)}%`,
          color: this.getPerformanceColor(value)
        };
      });
    });

    return {
      title: 'Performance Heatmap (7 Days)',
      data: heatmapData,
      xLabels: metrics,
      yLabels: timeBuckets.map(bucket => bucket.label),
      colorScale: {
        min: 0,
        max: 1,
        colors: ['#ef4444', '#fbbf24', '#10b981']
      }
    };
  }

  private async generateCorrectionTimelineChart(_corrections: SelfCorrectionAction[]): Promise<PerformanceChart> {
    return {
      title: 'Self-Correction Timeline',
      type: 'timeline',
      data: _corrections.map(correction => ({
        timestamp: correction.timestamp,
        value: correction.estimatedImpact,
        label: correction.description
      })),
      xAxis: { label: 'Time', format: 'MMM dd HH:mm' },
      yAxis: { label: 'Impact', format: '0.0' }
    };
  }

  private generateMetrics(
    _outcomes: PredictionOutcome[],
    _feedback: UserFeedback[]
  ): ComprehensiveDashboard['metrics'] {
    const current = {
      accuracy: _outcomes.length > 0 ?
        _outcomes.reduce((sum, o) => sum + o.accuracy.overallAccuracy, 0) / _outcomes.length : 0,
      precision: this.calculatePrecision(_outcomes),
      recall: this.calculateRecall(_outcomes),
      falsePositiveRate: this.calculateFalsePositiveRate(_outcomes),
      falseNegativeRate: this.calculateFalseNegativeRate(_outcomes),
      userSatisfaction: _feedback.length > 0 ?
        _feedback.reduce((sum, f) => sum + f.rating, 0) / _feedback.length : 0,
      responseTime: 150 // milliseconds
    };

    const targets = {
      accuracy: 0.85,
      precision: 0.8,
      recall: 0.8,
      falsePositiveRate: 0.15,
      falseNegativeRate: 0.1,
      userSatisfaction: 4.0,
      responseTime: 100
    };

    const improvements = this.calculateImprovements(current, targets);

    return { current, targets, improvements };
  }

  private analyzeTrends(
    _outcomes: PredictionOutcome[],
    _feedback: UserFeedback[]
  ): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];

    // Analyze accuracy trend
    const accuracyTrend = this.analyzeMetricTrend(_outcomes.map(o => o.accuracy.overallAccuracy));
    trends.push({
      metric: 'accuracy',
      direction: accuracyTrend.direction,
      confidence: accuracyTrend.confidence,
      slope: accuracyTrend.slope,
      changePoints: accuracyTrend.changePoints,
      forecast: accuracyTrend.forecast
    });

    // Analyze user satisfaction trend
    const satisfactionTrend = this.analyzeMetricTrend(_feedback.map(f => f.rating));
    trends.push({
      metric: 'user_satisfaction',
      direction: satisfactionTrend.direction,
      confidence: satisfactionTrend.confidence,
      slope: satisfactionTrend.slope,
      changePoints: satisfactionTrend.changePoints
    });

    return trends;
  }

  private generateRecommendations(
    _outcomes: PredictionOutcome[],
    _feedback: UserFeedback[],
    _trends: TrendAnalysis[]
  ): ImprovementRecommendation[] {
    // Generate recommendations based on current state and trends
    return [];
  }

  private generateAlerts(
    _outcomes: PredictionOutcome[],
    _feedback: UserFeedback[],
    _trends: TrendAnalysis[]
  ): ComprehensiveDashboard['alerts'] {
    const alerts = [];

    // Check for declining trends
    const decliningTrends = _trends.filter(t => t.direction === 'declining' && t.confidence > 0.7);
    if (decliningTrends.length > 0) {
      alerts.push({
        type: 'warning' as 'info' | 'warning' | 'error' | 'success',
        message: `${decliningTrends.length} metrics showing declining trends`,
        timestamp: new Date(),
        actionRequired: true
      });
    }

    // Check for low user satisfaction
    const avgSatisfaction = _feedback.reduce((sum, f) => sum + f.rating, 0) / _feedback.length;
    if (avgSatisfaction < 3.0) {
      alerts.push({
        type: 'error' as 'info' | 'warning' | 'error' | 'success',
        message: 'User satisfaction below acceptable threshold',
        timestamp: new Date(),
        actionRequired: true
      });
    }

    // Check for high error rates
    const falsePositiveRate = this.calculateFalsePositiveRate(_outcomes);
    const falseNegativeRate = this.calculateFalseNegativeRate(_outcomes);

    if (falsePositiveRate > 0.3 || falseNegativeRate > 0.25) {
      alerts.push({
        type: 'warning' as 'info' | 'warning' | 'error' | 'success',
        message: 'High error rates detected in predictions',
        timestamp: new Date(),
        actionRequired: true
      });
    }

    return alerts;
  }

  private groupOutcomesByTime(
    outcomes: PredictionOutcome[],
    granularity: 'hour' | 'day' | 'week'
  ): Array<{ timestamp: Date; averageAccuracy: number; count: number }> {
    const groups = new Map<string, { accuracies: number[]; count: number }>();

    outcomes.forEach(outcome => {
      let key: string;
      const date = outcome.timestamp;

      switch (granularity) {
        case 'hour': {
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        }
        case 'day': {
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        }
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        }
      }

      if (!groups.has(key)) {
        groups.set(key, { accuracies: [], count: 0 });
      }

      const group = groups.get(key)!;
      group.accuracies.push(outcome.accuracy.overallAccuracy);
      group.count++;
    });

    return Array.from(groups.entries()).map(([key, data]) => ({
      timestamp: new Date(key),
      averageAccuracy: data.accuracies.reduce((sum, acc) => sum + acc, 0) / data.accuracies.length,
      count: data.count
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private groupFeedbackByTime(
    feedback: UserFeedback[],
    granularity: 'hour' | 'day' | 'week'
  ): Array<{ timestamp: Date; averageRating: number; count: number }> {
    const groups = new Map<string, { ratings: number[]; count: number }>();

    feedback.forEach(fb => {
      let key: string;
      const date = fb.timestamp;

      switch (granularity) {
        case 'hour': {
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        }
        case 'day': {
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        }
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        }
      }

      if (!groups.has(key)) {
        groups.set(key, { ratings: [], count: 0 });
      }

      const group = groups.get(key)!;
      group.ratings.push(fb.rating);
      group.count++;
    });

    return Array.from(groups.entries()).map(([key, data]) => ({
      timestamp: new Date(key),
      averageRating: data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length,
      count: data.count
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private createTimeBuckets(_timeRange: { start: Date; end: Date }, bucketCount: number): Array<{
    start: Date;
    end: Date;
    label: string;
  }> {
    const buckets = [];
    const totalMs = _timeRange.end.getTime() - _timeRange.start.getTime();
    const bucketMs = totalMs / bucketCount;

    for (let i = 0; i < bucketCount; i++) {
      const start = new Date(_timeRange.start.getTime() + i * bucketMs);
      const end = new Date(_timeRange.start.getTime() + (i + 1) * bucketMs);

      buckets.push({
        start,
        end,
        label: start.toLocaleDateString()
      });
    }

    return buckets;
  }

  private countErrorsByType(_outcomes: PredictionOutcome[], errorType: string): number {
    switch (errorType) {
      case 'false_positive':
        return _outcomes.filter(o => !o.actualOutcome.occurred && o.accuracy.anomalyDetected).length;
      case 'false_negative':
        return _outcomes.filter(o => o.actualOutcome.occurred && !o.accuracy.anomalyDetected).length;
      case 'timing_error':
        return _outcomes.filter(o => {
          if (!o.actualOutcome.marketPerformance) return false;
          return Math.abs(o.actualOutcome.marketPerformance.timeToOutcome) > 24;
        }).length;
      case 'severity_mismatch':
        return _outcomes.filter(o => {
          if (!o.actualOutcome.occurred) return false;
          return o.predictedAnomaly.severity !== this.inferActualSeverity(o);
        }).length;
      default:
        return 0;
    }
  }

  private getErrorColor(errorRate: number): string {
    if (errorRate < 0.1) return '#10b981'; // Green
    if (errorRate < 0.2) return '#fbbf24'; // Yellow
    if (errorRate < 0.3) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  }

  private getPerformanceColor(value: number): string {
    if (value >= 0.8) return '#10b981'; // Green
    if (value >= 0.6) return '#fbbf24'; // Yellow
    return '#ef4444'; // Red
  }

  private calculatePrecision(_outcomes: PredictionOutcome[]): number {
    const truePositives = _outcomes.filter(o => o.actualOutcome.occurred && o.accuracy.anomalyDetected).length;
    const falsePositives = _outcomes.filter(o => !o.actualOutcome.occurred && o.accuracy.anomalyDetected).length;

    if (truePositives + falsePositives === 0) return 0;
    return truePositives / (truePositives + falsePositives);
  }

  private calculateRecall(_outcomes: PredictionOutcome[]): number {
    const truePositives = _outcomes.filter(o => o.actualOutcome.occurred && o.accuracy.anomalyDetected).length;
    const falseNegatives = _outcomes.filter(o => o.actualOutcome.occurred && !o.accuracy.anomalyDetected).length;

    if (truePositives + falseNegatives === 0) return 0;
    return truePositives / (truePositives + falseNegatives);
  }

  private calculateFalsePositiveRate(_outcomes: PredictionOutcome[]): number {
    const falsePositives = _outcomes.filter(o => !o.actualOutcome.occurred && o.accuracy.anomalyDetected).length;
    const totalNegative = _outcomes.filter(o => !o.actualOutcome.occurred).length;

    if (totalNegative === 0) return 0;
    return falsePositives / totalNegative;
  }

  private calculateFalseNegativeRate(_outcomes: PredictionOutcome[]): number {
    const falseNegatives = _outcomes.filter(o => o.actualOutcome.occurred && !o.accuracy.anomalyDetected).length;
    const totalPositive = _outcomes.filter(o => o.actualOutcome.occurred).length;

    if (totalPositive === 0) return 0;
    return falseNegatives / totalPositive;
  }

  private calculateMetrics(_outcomes: PredictionOutcome[]): Record<string, number> {
    return {
      accuracy: _outcomes.reduce((sum, o) => sum + o.accuracy.overallAccuracy, 0) / _outcomes.length,
      precision: this.calculatePrecision(_outcomes),
      recall: this.calculateRecall(_outcomes),
      falsePositiveRate: this.calculateFalsePositiveRate(_outcomes),
      falseNegativeRate: this.calculateFalseNegativeRate(_outcomes)
    };
  }

  private calculateImprovements(_current: Record<string, number>, _targets: Record<string, number>): Record<string, number> {
    const improvements: Record<string, number> = {};

    for (const [metric, target] of Object.entries(_targets)) {
      if (_current[metric] !== undefined) {
        improvements[metric] = target - _current[metric];
      }
    }

    return improvements;
  }

  private identifySignificantChanges(
    _baseline: Record<string, number>,
    _comparison: Record<string, number>
  ): Array<{
    metric: string;
    change: number;
    significance: number;
    interpretation: string;
  }> {
    const changes = [];

    for (const metric of Object.keys(_baseline)) {
      if (_baseline[metric] !== undefined && _comparison[metric] !== undefined) {
        const change = _comparison[metric] - _baseline[metric];
        const significance = Math.abs(change) / (_baseline[metric] + 0.001); // Relative change

        if (Math.abs(change) > 0.05) { // Minimum threshold for significance
          changes.push({
            metric,
            change,
            significance,
            interpretation: this.interpretChange(metric, change)
          });
        }
      }
    }

    return changes;
  }

  private interpretChange(_metric: string, _change: number): string {
    const direction = _change > 0 ? 'improved' : 'declined';
    const magnitude = Math.abs(_change);

    if (magnitude > 0.2) {
      return `${_metric} has significantly ${direction} by ${(magnitude * 100).toFixed(1)}%`;
    } else if (magnitude > 0.1) {
      return `${_metric} has moderately ${direction} by ${(magnitude * 100).toFixed(1)}%`;
    } else {
      return `${_metric} has slightly ${direction} by ${(magnitude * 100).toFixed(1)}%`;
    }
  }

  private determineSystemHealth(accuracy: number, satisfaction: number): 'excellent' | 'good' | 'needs_attention' | 'critical' {
    if (accuracy >= 0.85 && satisfaction >= 4.0) return 'excellent';
    if (accuracy >= 0.75 && satisfaction >= 3.5) return 'good';
    if (accuracy >= 0.6 || satisfaction >= 3.0) return 'needs_attention';
    return 'critical';
  }

  private generateKeyInsights(_outcomes: PredictionOutcome[], _feedback: UserFeedback[]): string[] {
    const insights = [];

    const accuracy = _outcomes.reduce((sum, o) => sum + o.accuracy.overallAccuracy, 0) / _outcomes.length;
    if (accuracy > 0.8) {
      insights.push('High prediction accuracy indicates well-calibrated models');
    } else if (accuracy < 0.7) {
      insights.push('Low prediction accuracy suggests need for model improvements');
    }

    const avgSatisfaction = _feedback.reduce((sum, f) => sum + f.rating, 0) / _feedback.length;
    if (avgSatisfaction > 4.0) {
      insights.push('Users are highly satisfied with the system');
    } else if (avgSatisfaction < 3.0) {
      insights.push('User satisfaction needs improvement');
    }

    const falsePositiveRate = this.calculateFalsePositiveRate(_outcomes);
    if (falsePositiveRate > 0.3) {
      insights.push('High false positive rate may indicate over-sensitive detection');
    }

    return insights;
  }

  private analyzeMetricTrend(values: number[]): {
    direction: 'improving' | 'declining' | 'stable' | 'volatile';
    confidence: number;
    slope: number;
    changePoints: Date[];
    forecast?: Array<{ timestamp: Date; predictedValue: number; confidence: number }>;
  } {
    if (values.length < 5) {
      return {
        direction: 'stable',
        confidence: 0.5,
        slope: 0,
        changePoints: []
      };
    }

    // Simple linear regression for trend analysis
    const n = values.length;
    const x: number[] = Array.from({ length: n }, (_, i) => i);
    const y: number[] = values;

    const sumX = x.reduce((a: number, b: number) => a + b, 0);
    const sumY = y.reduce((a: number, b: number) => a + b, 0);
    const sumXY = x.reduce((sum: number, xi: number, i: number) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum: number, xi: number) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const _intercept = (sumY - slope * sumX) / n;

    // Determine trend direction
    let direction: 'improving' | 'declining' | 'stable' | 'volatile' = 'stable';
    const slopeAbs = Math.abs(slope);

    if (slopeAbs > 0.01) {
      direction = slope > 0 ? 'improving' : 'declining';
    }

    // Calculate confidence based on correlation
    const correlation = this.calculateCorrelation(x, y);
    const confidence = Math.abs(correlation);

    return {
      direction,
      confidence,
      slope,
      changePoints: [] // Would detect actual change points in real implementation
    };
  }

  private calculateCorrelation(_x: number[], _y: number[]): number {
    const n = _x.length;
    const sumX = _x.reduce((a: number, b: number) => a + b, 0);
    const sumY = _y.reduce((a: number, b: number) => a + b, 0);
    const sumXY = _x.reduce((sum: number, xi: number, i: number) => sum + xi * _y[i], 0);
    const sumXX = _x.reduce((sum: number, xi: number) => sum + xi * xi, 0);
    const sumYY = _y.reduce((sum: number, yi: number) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateMetricForOutcomes(_outcomes: PredictionOutcome[], _metric: string): number {
    switch (_metric) {
      case 'accuracy':
        return _outcomes.reduce((sum, o) => sum + o.accuracy.overallAccuracy, 0) / _outcomes.length;
      case 'precision':
        return this.calculatePrecision(_outcomes);
      case 'recall':
        return this.calculateRecall(_outcomes);
      default:
        return 0;
    }
  }

  private generateTrendAnnotations(groupedData: Array<{ timestamp: Date; averageAccuracy: number; count: number }>): Array<{
    timestamp: Date;
    text: string;
    type: 'info' | 'warning' | 'error';
  }> {
    const annotations = [];

    // Find significant changes
    for (let i = 1; i < groupedData.length; i++) {
      const change = groupedData[i].averageAccuracy - groupedData[i - 1].averageAccuracy;
      if (Math.abs(change) > 0.1) {
        annotations.push({
          timestamp: groupedData[i].timestamp,
          text: `Accuracy ${change > 0 ? 'improved' : 'declined'} by ${(Math.abs(change) * 100).toFixed(1)}%`,
          type: (Math.abs(change) > 0.2 ? 'warning' : 'info') as 'info' | 'warning' | 'error'
        });
      }
    }

    return annotations;
  }

  private generateHTMLReport(_dashboard: ComprehensiveDashboard): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${_dashboard.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; margin-top: 5px; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-${this.getStatusColor(_dashboard.summary.systemHealth)} { color: ${this.getStatusColor(_dashboard.summary.systemHealth)}; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${_dashboard.title}</h1>
            <p>${_dashboard.description}</p>
            <p><strong>Time Range:</strong> ${_dashboard.timeRange.start.toLocaleDateString()} - ${_dashboard.timeRange.end.toLocaleDateString()}</p>
            <p><strong>System Health:</strong> <span class="status-${_dashboard.summary.systemHealth}">${_dashboard.summary.systemHealth.toUpperCase()}</span></p>
        </div>

        <div class="summary">
            <div class="metric-card">
                <div class="metric-value">${(_dashboard.summary.overallAccuracy * 100).toFixed(1)}%</div>
                <div class="metric-label">Overall Accuracy</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${_dashboard.summary.totalPredictions}</div>
                <div class="metric-label">Total Predictions</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${_dashboard.summary.userSatisfaction.toFixed(1)}</div>
                <div class="metric-label">User Satisfaction</div>
            </div>
        </div>

        <div class="chart-container">
            <h2>Key Insights</h2>
            <ul>
                ${_dashboard.summary.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>

        <div class="chart-container">
            <h2>Performance Trends</h2>
            <p>Charts would be rendered here in a real implementation</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  private getStatusColor(health: string): string {
    switch (health) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'needs_attention': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  }

  private inferActualSeverity(_outcome: PredictionOutcome): string {
    if (!_outcome.actualOutcome.marketPerformance) return 'medium';

    const impact = Math.abs(_outcome.actualOutcome.marketPerformance.priceChange);

    if (impact > 10) return 'critical';
    if (impact > 5) return 'high';
    if (impact > 2) return 'medium';

    return 'low';
  }

  private analyzeAccuracyTrend(_outcomes: PredictionOutcome[]): {
    direction: 'improving' | 'declining' | 'stable' | 'volatile';
    confidence: number;
    slope: number;
    changePoints: Date[];
    forecast?: Array<{ timestamp: Date; predictedValue: number; confidence: number }>;
  } {
    const accuracies = _outcomes.map(o => o.accuracy.overallAccuracy);
    return this.analyzeMetricTrend(accuracies);
  }

  private initializeDefaultDashboards(): void {
    // Initialize default dashboard configurations
    this.generateComprehensiveDashboard({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    });
  }

  private setupRealTimeUpdates(): void {
    // Set up periodic dashboard updates
    setInterval(async () => {
      if (this.activeVisualizations.size > 0) {
        await this.generateRealTimeDashboard();
      }
    }, 60000); // Update every minute
  }

  /**
   * Get comprehensive dashboard system status
   */
  getStatus(): {
    totalDashboards: number;
    activeVisualizations: number;
    lastUpdate: Date;
    dataFreshness: number;
    systemHealth: 'healthy' | 'stale' | 'error';
  } {
    const lastUpdate = Math.max(...Array.from(this.dashboards.values()).map(d => d.timeRange.end.getTime()));
    const dataFreshness = (Date.now() - lastUpdate) / (1000 * 60); // Minutes since last update

    let systemHealth: 'healthy' | 'stale' | 'error' = 'healthy';
    if (dataFreshness > 60) systemHealth = 'stale';
    if (dataFreshness > 120) systemHealth = 'error';

    return {
      totalDashboards: this.dashboards.size,
      activeVisualizations: this.activeVisualizations.size,
      lastUpdate: new Date(lastUpdate),
      dataFreshness,
      systemHealth
    };
  }
}
