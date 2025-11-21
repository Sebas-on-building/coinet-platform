/**
 * =========================================
 * RECOMMENDATION GENERATOR
 * =========================================
 * Divine world-class recommendation generation with explainable AI
 */

// import { Logger } from '../utils/Logger';
import {
  AlertPerformance,
  SignalCorrelation,
  UserFeedback,
  AIRecommendation,
  RecommendationType,
  RecommendationPriority,
  ImpactLevel,
  EffortLevel,
  RecommendationAction,
  InsightRequest,
  AIInsightsConfig
} from '../types';

/**
 * Recommendation generator with explainable AI
 */
export class RecommendationGenerator {
  private config: AIInsightsConfig;

  constructor(config: AIInsightsConfig) {
    this.config = config;
  }

  /**
   * Generate recommendations based on analysis data
   */
  async generateRecommendations(data: {
    performance: AlertPerformance[];
    correlations: SignalCorrelation[];
    feedback: any;
    request: InsightRequest;
  }): Promise<AIRecommendation[]> {
    // Debug logging removed for simplicity

    const recommendations: AIRecommendation[] = [];

    // Generate performance-based recommendations
    recommendations.push(...this.generatePerformanceRecommendations(data.performance));

    // Generate correlation-based recommendations
    recommendations.push(...this.generateCorrelationRecommendations(data.correlations));

    // Generate feedback-based recommendations
    if (data.feedback) {
      recommendations.push(...this.generateFeedbackRecommendations(data.feedback));
    }

    // Generate data source recommendations
    recommendations.push(...this.generateDataSourceRecommendations(data.performance));

    // Sort by confidence and priority
    const sortedRecommendations = recommendations
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by confidence
        return b.confidence - a.confidence;
      })
      .slice(0, this.config.recommendations.maxPerRequest);

    // Logging removed for simplicity

    return sortedRecommendations;
  }

  /**
   * Generate recommendations based on performance analysis
   */
  private generatePerformanceRecommendations(performance: AlertPerformance[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Analyze accuracy trends
    const signalPerformance = this.groupPerformanceBySignal(performance);

    for (const [signal, data] of signalPerformance) {
      if (data.length < 5) continue; // Need minimum data

      const avgAccuracy = data.reduce((sum, p) => sum + p.accuracy, 0) / data.length;
      const avgLatency = data.reduce((sum, p) => sum + p.latency, 0) / data.length;

      // Low accuracy recommendation
      if (avgAccuracy < 0.6) {
        recommendations.push(this.createRecommendation({
          type: RecommendationType.SIGNAL_WEIGHT,
          priority: RecommendationPriority.HIGH,
          title: `Improve ${signal} signal accuracy`,
          description: `Current accuracy is ${(avgAccuracy * 100).toFixed(1)}%, below optimal threshold`,
          confidence: 0.8,
          impact: ImpactLevel.HIGH,
          effort: EffortLevel.MEDIUM,
          explanation: {
            reasoning: `Historical data shows ${signal} signals have consistently low accuracy`,
            dataPoints: [
              `Average accuracy: ${(avgAccuracy * 100).toFixed(1)}%`,
              `Sample size: ${data.length} alerts`,
              `Trend: ${this.calculateAccuracyTrend(data)}`
            ],
            benefits: ['Higher alert reliability', 'Reduced false positives', 'Better user trust'],
            risks: ['May temporarily reduce alert frequency', 'Requires parameter tuning']
          },
          actions: [
            {
              type: 'adjust_signal_weight',
              signal,
              oldValue: 1.0,
              newValue: 0.7,
              description: `Reduce ${signal} signal weight by 30%`
            }
          ]
        }));
      }

      // High latency recommendation
      if (avgLatency > 1000) { // More than 1 second
        recommendations.push(this.createRecommendation({
          type: RecommendationType.PERFORMANCE_TUNING,
          priority: RecommendationPriority.MEDIUM,
          title: `Optimize ${signal} signal latency`,
          description: `Average processing time is ${avgLatency.toFixed(0)}ms, above target`,
          confidence: 0.7,
          impact: ImpactLevel.MEDIUM,
          effort: EffortLevel.LOW,
          explanation: {
            reasoning: `High latency detected in ${signal} signal processing`,
            dataPoints: [
              `Average latency: ${avgLatency.toFixed(0)}ms`,
              `Target latency: < 500ms`,
              `Impact: Slower alert delivery`
            ],
            benefits: ['Faster alert delivery', 'Better user experience'],
            risks: ['May increase computational load']
          },
          actions: [
            {
              type: 'optimize_processing',
              signal,
              description: 'Implement caching for signal processing'
            }
          ]
        }));
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendations based on signal correlations
   */
  private generateCorrelationRecommendations(correlations: SignalCorrelation[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Strong positive correlations suggest signal combination
    const strongPositiveCorrelations = correlations.filter(c =>
      c.correlation > 0.7 && c.strength === 'very_strong'
    );

    for (const correlation of strongPositiveCorrelations) {
      recommendations.push(this.createRecommendation({
        type: RecommendationType.SIGNAL_COMBINATION,
        priority: RecommendationPriority.MEDIUM,
        title: `Combine ${correlation.signalA} and ${correlation.signalB} signals`,
        description: `Strong correlation (${correlation.correlation.toFixed(2)}) suggests these signals complement each other`,
        confidence: correlation.significance < 0.05 ? 0.9 : 0.7,
        impact: ImpactLevel.HIGH,
        effort: EffortLevel.MEDIUM,
        explanation: {
          reasoning: `Statistical analysis shows strong positive correlation between these signals`,
          dataPoints: [
            `Correlation coefficient: ${correlation.correlation.toFixed(3)}`,
            `Sample size: ${correlation.sampleSize}`,
            `Significance: p < ${correlation.significance.toFixed(3)}`
          ],
          benefits: ['Improved accuracy through signal synergy', 'Reduced false negatives'],
          risks: ['May increase computational complexity']
        },
        actions: [
          {
            type: 'create_combined_signal',
            signal: `${correlation.signalA}_${correlation.signalB}`,
            description: `Create combined signal using both ${correlation.signalA} and ${correlation.signalB}`
          }
        ]
      }));
    }

    // Negative correlations suggest diversification
    const negativeCorrelations = correlations.filter(c =>
      c.correlation < -0.5 && c.strength === 'moderate'
    );

    for (const correlation of negativeCorrelations) {
      recommendations.push(this.createRecommendation({
        type: RecommendationType.RISK_ADJUSTMENT,
        priority: RecommendationPriority.LOW,
        title: `Diversify signal sources for ${correlation.signalA}`,
        description: `Negative correlation with ${correlation.signalB} indicates over-reliance on single signal type`,
        confidence: 0.6,
        impact: ImpactLevel.MEDIUM,
        effort: EffortLevel.LOW,
        explanation: {
          reasoning: `Negative correlation suggests these signals provide different information`,
          dataPoints: [
            `Negative correlation: ${correlation.correlation.toFixed(3)}`,
            `Suggests diversification benefits`
          ],
          benefits: ['Reduced signal correlation risk', 'More robust alert system'],
          risks: ['May increase alert frequency']
        },
        actions: [
          {
            type: 'add_diversification',
            signal: correlation.signalA,
            description: 'Add complementary signal sources'
          }
        ]
      }));
    }

    return recommendations;
  }

  /**
   * Generate recommendations based on user feedback
   */
  private generateFeedbackRecommendations(feedbackAnalysis: any): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    if (!feedbackAnalysis) return recommendations;

    // Low satisfaction recommendations
    if (feedbackAnalysis.summary.avgRating < 3.0) {
      recommendations.push(this.createRecommendation({
        type: RecommendationType.ALERT_PARAMETER,
        priority: RecommendationPriority.HIGH,
        title: 'Improve alert accuracy based on user feedback',
        description: `User satisfaction is ${(feedbackAnalysis.summary.avgRating).toFixed(1)}/5, below acceptable threshold`,
        confidence: 0.8,
        impact: ImpactLevel.HIGH,
        effort: EffortLevel.HIGH,
        explanation: {
          reasoning: `Multiple users have reported dissatisfaction with alert accuracy`,
          dataPoints: [
            `Average rating: ${feedbackAnalysis.summary.avgRating.toFixed(1)}/5`,
            `Negative feedback: ${feedbackAnalysis.summary.sentimentDistribution.negative}`,
            `Common complaints: ${feedbackAnalysis.summary.commonComplaints.join(', ')}`
          ],
          benefits: ['Higher user satisfaction', 'Reduced churn risk'],
          risks: ['May require significant system changes']
        },
        actions: [
          {
            type: 'review_accuracy_thresholds',
            description: 'Review and adjust signal accuracy thresholds'
          }
        ]
      }));
    }

    // Specific complaint patterns
    if (feedbackAnalysis.summary.commonComplaints.includes('late')) {
      recommendations.push(this.createRecommendation({
        type: RecommendationType.TIME_WINDOW,
        priority: RecommendationPriority.MEDIUM,
        title: 'Optimize alert timing',
        description: 'Users report late alerts - consider adjusting time windows',
        confidence: 0.7,
        impact: ImpactLevel.MEDIUM,
        effort: EffortLevel.LOW,
        explanation: {
          reasoning: `Feedback analysis shows timing issues with current alert windows`,
          dataPoints: ['Common complaint: "late"', 'Affects user experience'],
          benefits: ['Better alert timing', 'Improved user satisfaction'],
          risks: ['May increase alert frequency']
        },
        actions: [
          {
            type: 'adjust_time_windows',
            description: 'Reduce alert time windows by 20%'
          }
        ]
      }));
    }

    return recommendations;
  }

  /**
   * Generate data source recommendations
   */
  private generateDataSourceRecommendations(performance: AlertPerformance[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Analyze exchange performance
    const exchangePerformance = this.groupPerformanceByExchange(performance);

    for (const [exchange, data] of exchangePerformance) {
      if (data.length < 10) continue;

      const avgAccuracy = data.reduce((sum, p) => sum + p.accuracy, 0) / data.length;

      // Poor performing exchange recommendation
      if (avgAccuracy < 0.5) {
        recommendations.push(this.createRecommendation({
          type: RecommendationType.EXCHANGE_ADDITION,
          priority: RecommendationPriority.LOW,
          title: `Consider alternative data sources for ${exchange}`,
          description: `Performance on ${exchange} is ${(avgAccuracy * 100).toFixed(1)}%, below optimal`,
          confidence: 0.6,
          impact: ImpactLevel.MEDIUM,
          effort: EffortLevel.HIGH,
          explanation: {
            reasoning: `Historical performance on ${exchange} shows consistent issues`,
            dataPoints: [
              `Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`,
              `Sample size: ${data.length} alerts`,
              `May indicate data quality issues`
            ],
            benefits: ['Improved data quality', 'Better alert accuracy'],
            risks: ['Increased operational complexity', 'Higher costs']
          },
          actions: [
            {
              type: 'evaluate_data_source',
              exchange,
              description: `Evaluate alternative data providers for ${exchange}`
            }
          ]
        }));
      }
    }

    return recommendations;
  }

  /**
   * Create a recommendation with proper structure
   */
  private createRecommendation(params: {
    type: RecommendationType;
    priority: RecommendationPriority;
    title: string;
    description: string;
    confidence: number;
    impact: ImpactLevel;
    effort: EffortLevel;
    explanation: {
      reasoning: string;
      dataPoints: string[];
      benefits?: string[];
      risks?: string[];
    };
    actions: RecommendationAction[];
  }): AIRecommendation {
    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      priority: params.priority,
      title: params.title,
      description: params.description,
      confidence: params.confidence,
      impact: params.impact,
      effort: params.effort,
      explanation: params.explanation,
      actions: params.actions,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: {
        generatedBy: 'ai_insights_engine',
        version: '1.0.0'
      }
    };
  }

  /**
   * Group performance data by signal type
   */
  private groupPerformanceBySignal(performance: AlertPerformance[]): Map<string, AlertPerformance[]> {
    const groups = new Map<string, AlertPerformance[]>();

    for (const perf of performance) {
      if (!groups.has(perf.signalType)) {
        groups.set(perf.signalType, []);
      }
      groups.get(perf.signalType)!.push(perf);
    }

    return groups;
  }

  /**
   * Group performance data by exchange
   */
  private groupPerformanceByExchange(performance: AlertPerformance[]): Map<string, AlertPerformance[]> {
    const groups = new Map<string, AlertPerformance[]>();

    for (const perf of performance) {
      if (!groups.has(perf.exchange)) {
        groups.set(perf.exchange, []);
      }
      groups.get(perf.exchange)!.push(perf);
    }

    return groups;
  }

  /**
   * Calculate accuracy trend for signal
   */
  private calculateAccuracyTrend(data: AlertPerformance[]): string {
    if (data.length < 3) return 'insufficient_data';

    const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvg = firstHalf.reduce((sum, p) => sum + p.accuracy, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.accuracy, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Generate explainable recommendation text
   */
  generateExplanation(recommendation: AIRecommendation): string {
    const { explanation } = recommendation;

    let text = explanation.reasoning + '\n\n';

    text += 'Key Data Points:\n';
    explanation.dataPoints.forEach(point => {
      text += `• ${point}\n`;
    });

    if (explanation.benefits && explanation.benefits.length > 0) {
      text += '\nExpected Benefits:\n';
      explanation.benefits.forEach(benefit => {
        text += `• ${benefit}\n`;
      });
    }

    if (explanation.risks && explanation.risks.length > 0) {
      text += '\nPotential Risks:\n';
      explanation.risks.forEach(risk => {
        text += `• ${risk}\n`;
      });
    }

    if (explanation.alternatives && explanation.alternatives.length > 0) {
      text += '\nAlternative Approaches:\n';
      explanation.alternatives.forEach(alt => {
        text += `• ${alt}\n`;
      });
    }

    return text;
  }

  /**
   * Calculate recommendation priority based on impact and confidence
   */
  private calculatePriority(impact: ImpactLevel, confidence: number): RecommendationPriority {
    if (impact === ImpactLevel.CRITICAL && confidence > 0.8) {
      return RecommendationPriority.CRITICAL;
    }
    if (impact === ImpactLevel.HIGH && confidence > 0.7) {
      return RecommendationPriority.HIGH;
    }
    if (impact === ImpactLevel.MEDIUM && confidence > 0.6) {
      return RecommendationPriority.MEDIUM;
    }
    return RecommendationPriority.LOW;
  }

  /**
   * Estimate effort level for recommendation
   */
  private estimateEffort(actions: RecommendationAction[]): EffortLevel {
    const complexActions = actions.filter(action =>
      action.type === 'create_combined_signal' ||
      action.type === 'add_data_source' ||
      action.type === 'review_accuracy_thresholds'
    );

    if (complexActions.length > 1) return EffortLevel.COMPLEX;
    if (complexActions.length === 1) return EffortLevel.HIGH;
    if (actions.length > 2) return EffortLevel.MEDIUM;
    return EffortLevel.LOW;
  }

  /**
   * Validate recommendation before generation
   */
  private validateRecommendation(params: any): boolean {
    // Basic validation logic
    return (
      params.confidence >= this.config.analysis.confidenceThreshold &&
      this.config.recommendations.types.includes(params.type) &&
      this.config.recommendations.priorities.includes(params.priority)
    );
  }
}
