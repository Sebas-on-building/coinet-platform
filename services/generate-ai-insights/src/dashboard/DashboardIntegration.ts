/**
 * =========================================
 * DASHBOARD INTEGRATION
 * =========================================
 * Divine world-class dashboard integration for AI insights visualization
 */

// import { Logger } from '../utils/Logger';
import {
  AIRecommendation,
  SignalCorrelation,
  PerformanceTrend,
  UserBehaviorPattern,
  DashboardInsight,
  InsightResult,
  RecommendationPriority
} from '../types';

/**
 * Dashboard integration for AI insights
 */
export class DashboardIntegration {
  constructor() {
    // Logger removed for simplicity
  }

  /**
   * Generate dashboard insights from analysis results
   */
  generateDashboardInsights(result: InsightResult): DashboardInsight[] {
    // Debug logging removed for simplicity

    const insights: DashboardInsight[] = [];

    // Convert recommendations to dashboard insights
    for (const recommendation of result.recommendations) {
      insights.push(this.createRecommendationInsight(recommendation));
    }

    // Add correlation insights
    if (result.correlations && result.correlations.length > 0) {
      insights.push(this.createCorrelationInsight(result.correlations));
    }

    // Add performance insights
    if (result.performance) {
      insights.push(this.createPerformanceInsight(result.performance));
    }

    // Add summary insights
    insights.push(this.createSummaryInsight(result.summary));

    // Sort by priority and recency
    const sortedInsights = insights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Logging removed for simplicity

    return sortedInsights;
  }

  /**
   * Create dashboard insight from recommendation
   */
  private createRecommendationInsight(recommendation: AIRecommendation): DashboardInsight {
    const actionable = recommendation.actions.length > 0;

    return {
      id: `dashboard_${recommendation.id}`,
      type: 'recommendation',
      title: recommendation.title,
      description: recommendation.description,
      data: {
        recommendation,
        explanation: recommendation.explanation,
        actions: recommendation.actions
      },
      visualization: {
        type: actionable ? 'chart' : 'metric',
        config: {
          showExplanation: true,
          showActions: actionable,
          highlightConfidence: recommendation.confidence > 0.8,
          colorScheme: this.getPriorityColor(recommendation.priority)
        }
      },
      actionable,
      priority: recommendation.priority,
      createdAt: recommendation.createdAt,
      expiresAt: recommendation.expiresAt
    };
  }

  /**
   * Create correlation heatmap insight
   */
  private createCorrelationInsight(correlations: SignalCorrelation[]): DashboardInsight {
    // Group correlations by strength
    const strongCorrelations = correlations.filter(c => c.strength === 'very_strong');
    const moderateCorrelations = correlations.filter(c => c.strength === 'moderate');

    return {
      id: `correlation_${Date.now()}`,
      type: 'correlation',
      title: 'Signal Correlation Analysis',
      description: `${correlations.length} signal correlations detected`,
      data: {
        correlations,
        heatmapData: this.generateCorrelationHeatmapData(correlations),
        summary: {
          strong: strongCorrelations.length,
          moderate: moderateCorrelations.length,
          total: correlations.length
        }
      },
      visualization: {
        type: 'heatmap',
        config: {
          title: 'Signal Correlation Matrix',
          xAxis: 'Signal A',
          yAxis: 'Signal B',
          colorScale: ['red', 'yellow', 'green'],
          showValues: true,
          highlightStrong: true
        }
      },
      actionable: strongCorrelations.length > 0,
      priority: strongCorrelations.length > 0 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
      createdAt: new Date()
    };
  }

  /**
   * Create performance metrics insight
   */
  private createPerformanceInsight(performance: InsightResult['performance']): DashboardInsight {
    if (!performance) {
      return {
        id: `performance_${Date.now()}`,
        type: 'performance',
        title: 'Performance Metrics Unavailable',
        description: 'Performance data not available',
        data: {},
        visualization: { type: 'metric', config: {} },
        actionable: false,
        priority: 'low' as any,
        createdAt: new Date()
      };
    }

    const overallScore = (performance.accuracy + performance.precision + performance.recall + performance.f1Score) / 4;

    return {
      id: `performance_${Date.now()}`,
      type: 'performance',
      title: 'Alert Performance Metrics',
      description: `Overall performance score: ${(overallScore * 100).toFixed(1)}%`,
      data: {
        metrics: performance,
        trends: this.analyzePerformanceTrends(performance),
        benchmarks: {
          targetAccuracy: 0.8,
          targetPrecision: 0.75,
          targetRecall: 0.7,
          targetF1Score: 0.75
        }
      },
      visualization: {
        type: 'chart',
        config: {
          type: 'radar',
          metrics: ['accuracy', 'precision', 'recall', 'f1Score'],
          showTargets: true,
          colorScheme: overallScore > 0.7 ? 'green' : overallScore > 0.5 ? 'yellow' : 'red'
        }
      },
      actionable: overallScore < 0.7,
      priority: overallScore < 0.5 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
      createdAt: new Date()
    };
  }

  /**
   * Create summary insight
   */
  private createSummaryInsight(summary: InsightResult['summary']): DashboardInsight {
    const confidenceLevel = summary.confidence > 0.8 ? 'high' : summary.confidence > 0.6 ? 'medium' : 'low';

    return {
      id: `summary_${Date.now()}`,
      type: 'trend',
      title: 'AI Insights Summary',
      description: `${summary.keyInsights.length} key insights identified`,
      data: {
        summary,
        confidence: summary.confidence,
        period: summary.analyzedPeriod,
        insights: summary.keyInsights
      },
      visualization: {
        type: 'metric',
        config: {
          showProgress: true,
          highlightKey: summary.keyInsights.length > 0,
          confidenceIndicator: true,
          colorScheme: this.getConfidenceColor(summary.confidence)
        }
      },
      actionable: summary.keyInsights.length > 0,
      priority: summary.confidence > 0.8 ? RecommendationPriority.HIGH : RecommendationPriority.MEDIUM,
      createdAt: new Date()
    };
  }

  /**
   * Generate correlation heatmap data
   */
  private generateCorrelationHeatmapData(correlations: SignalCorrelation[]): any {
    // Extract unique signals
    const signals = new Set<string>();
    correlations.forEach(c => {
      signals.add(c.signalA);
      signals.add(c.signalB);
    });

    const signalArray = Array.from(signals);
    const matrix: number[][] = [];

    for (let i = 0; i < signalArray.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < signalArray.length; j++) {
        if (i === j) {
          matrix[i][j] = 1; // Perfect correlation with self
        } else {
          const correlation = correlations.find(c =>
            (c.signalA === signalArray[i] && c.signalB === signalArray[j]) ||
            (c.signalA === signalArray[j] && c.signalB === signalArray[i])
          );
          matrix[i][j] = correlation?.correlation || 0;
        }
      }
    }

    return {
      signals: signalArray,
      matrix,
      min: -1,
      max: 1
    };
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends(performance: InsightResult['performance']): any {
    if (!performance) return {};

    const trends = {
      accuracy: this.getTrendDirection(performance.accuracy),
      precision: this.getTrendDirection(performance.precision),
      recall: this.getTrendDirection(performance.recall),
      f1Score: this.getTrendDirection(performance.f1Score)
    };

    return trends;
  }

  /**
   * Get trend direction for a metric
   */
  private getTrendDirection(value: number): 'improving' | 'stable' | 'declining' {
    if (value > 0.8) return 'improving';
    if (value < 0.6) return 'declining';
    return 'stable';
  }

  /**
   * Get color scheme for priority
   */
  private getPriorityColor(priority: RecommendationPriority): string {
    const colors = {
      [RecommendationPriority.CRITICAL]: 'red',
      [RecommendationPriority.HIGH]: 'orange',
      [RecommendationPriority.MEDIUM]: 'yellow',
      [RecommendationPriority.LOW]: 'green'
    };
    return colors[priority];
  }

  /**
   * Get color scheme for confidence
   */
  private getConfidenceColor(confidence: number): string {
    if (confidence > 0.8) return 'green';
    if (confidence > 0.6) return 'yellow';
    return 'red';
  }

  /**
   * Create visualization configuration for recommendation
   */
  createVisualizationConfig(recommendation: AIRecommendation): any {
    return {
      type: 'recommendation_card',
      data: recommendation,
      config: {
        showConfidence: true,
        showImpact: true,
        showEffort: true,
        expandable: true,
        actions: recommendation.actions.map(action => ({
          label: action.description,
          type: action.type,
          primary: action.type === 'update_signal_weight' || action.type === 'add_data_source'
        }))
      }
    };
  }

  /**
   * Create correlation visualization configuration
   */
  createCorrelationVisualization(correlations: SignalCorrelation[]): any {
    return {
      type: 'correlation_heatmap',
      data: this.generateCorrelationHeatmapData(correlations),
      config: {
        title: 'Signal Correlation Analysis',
        subtitle: `${correlations.length} correlations analyzed`,
        colorScale: ['#ff4444', '#ffffff', '#44ff44'],
        showLabels: true,
        interactive: true
      }
    };
  }

  /**
   * Create performance visualization configuration
   */
  createPerformanceVisualization(performance: InsightResult['performance']): any {
    if (!performance) {
      return {
        type: 'performance_radar',
        data: { labels: [], datasets: [] },
        config: {}
      };
    }

    return {
      type: 'performance_radar',
      data: {
        labels: ['Accuracy', 'Precision', 'Recall', 'F1 Score'],
        datasets: [{
          data: [performance.accuracy, performance.precision, performance.recall, performance.f1Score],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          pointBorderColor: '#fff'
        }]
      },
      config: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 1
          }
        }
      }
    };
  }

  /**
   * Generate dashboard widget configurations
   */
  generateDashboardWidgets(insights: DashboardInsight[]): any[] {
    const widgets = [];

    // Group insights by type
    const recommendations = insights.filter(i => i.type === 'recommendation');
    const correlations = insights.filter(i => i.type === 'correlation');
    const performance = insights.filter(i => i.type === 'performance');
    const trends = insights.filter(i => i.type === 'trend');

    // Create recommendation widgets
    if (recommendations.length > 0) {
      widgets.push({
        id: 'recommendations',
        type: 'recommendation_list',
        title: 'AI Recommendations',
        data: recommendations,
        config: {
          maxItems: 5,
          showPriority: true,
          showConfidence: true,
          expandable: true
        }
      });
    }

    // Create correlation widget
    if (correlations.length > 0) {
      widgets.push({
        id: 'correlations',
        type: 'correlation_heatmap',
        title: 'Signal Correlations',
        data: correlations[0].data,
        config: {
          interactive: true,
          showLegend: true
        }
      });
    }

    // Create performance widget
    if (performance.length > 0) {
      widgets.push({
        id: 'performance',
        type: 'performance_metrics',
        title: 'Alert Performance',
        data: performance[0].data,
        config: {
          showTrends: true,
          showTargets: true
        }
      });
    }

    return widgets;
  }

  /**
   * Generate real-time dashboard updates
   */
  generateRealtimeUpdates(insights: DashboardInsight[]): any[] {
    const updates = [];

    // Priority recommendations for immediate attention
    const urgentRecommendations = insights.filter(i =>
      i.type === 'recommendation' &&
      (i.priority === RecommendationPriority.CRITICAL || i.priority === RecommendationPriority.HIGH)
    );

    for (const recommendation of urgentRecommendations) {
      updates.push({
        type: 'recommendation_alert',
        priority: recommendation.priority,
        title: recommendation.title,
        message: recommendation.description,
        actionable: recommendation.actionable,
        timestamp: new Date()
      });
    }

    return updates;
  }
}
