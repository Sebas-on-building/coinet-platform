/**
 * Anomaly Detector
 * Advanced anomaly detection using multiple algorithms
 */

import {
  DataPoint,
  Baseline,
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  DataSource,
  DetectionResult,
  DetectionSummary,
  MonitoringConfig,
  AnomalyContext,
  CorrelatedEvent
} from './types';
import { BaselineLearningEngine } from './BaselineLearningEngine';
import { v4 as uuidv4 } from 'uuid';

interface SeasonalPattern {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  amplitude: number;
  phase: number;
  confidence: number;
}

export class AnomalyDetector {
  private learningEngine: BaselineLearningEngine;
  private config: MonitoringConfig;
  private detectedAnomalies: Map<string, Anomaly[]> = new Map();
  private correlationWindow = 3600000; // 1 hour in milliseconds

  constructor(
    learningEngine: BaselineLearningEngine,
    config: MonitoringConfig
  ) {
    this.learningEngine = learningEngine;
    this.config = config;
  }

  /**
   * Detect anomalies in data stream
   */
  async detectAnomalies(dataPoints: DataPoint[]): Promise<DetectionResult> {
    const startTime = Date.now();
    const anomalies: Anomaly[] = [];
    const baselineStats = this.learningEngine.getAllBaselines();

    for (const dataPoint of dataPoints) {
      const baseline = this.learningEngine.getBaseline(
        dataPoint.source,
        dataPoint.symbol
      );

      if (!baseline) {
        // No baseline yet, skip this data point
        continue;
      }

      // Run multiple detection algorithms
      const statisticalAnomaly = this.detectStatisticalAnomaly(dataPoint, baseline);
      const mlAnomaly = await this.detectMLAnomaly(dataPoint, baseline);
      const percentileAnomaly = this.detectPercentileAnomaly(dataPoint, baseline);

      // Combine detection results
      const isAnomaly = statisticalAnomaly || mlAnomaly || percentileAnomaly;

      if (isAnomaly) {
        const anomaly = await this.createAnomaly(dataPoint, baseline);
        anomalies.push(anomaly);
        
        // Store for correlation analysis
        this.storeAnomaly(anomaly);
      }
    }

    // Correlate anomalies
    await this.correlateAnomalies(anomalies);

    const processingTime = Date.now() - startTime;
    const summary = this.generateSummary(anomalies);

    return {
      timestamp: new Date(),
      anomalies,
      baselineStats,
      processingTime,
      dataPointsAnalyzed: dataPoints.length,
      summary
    };
  }

  /**
   * Statistical anomaly detection using z-score
   */
  private detectStatisticalAnomaly(
    dataPoint: DataPoint,
    baseline: Baseline
  ): boolean {
    const zScore = Math.abs(
      (dataPoint.value - baseline.mean) / baseline.standardDeviation
    );

    return zScore > this.config.anomalyThresholds.statistical;
  }

  /**
   * ML-based anomaly detection using Isolation Forest approach
   */
  private async detectMLAnomaly(
    dataPoint: DataPoint,
    baseline: Baseline
  ): Promise<boolean> {
    // Simplified isolation forest
    // In production, use a proper ML library like TensorFlow.js
    const score = this.calculateIsolationScore(dataPoint, baseline);
    
    return score > this.config.anomalyThresholds.ml;
  }

  /**
   * Percentile-based anomaly detection
   */
  private detectPercentileAnomaly(
    dataPoint: DataPoint,
    baseline: Baseline
  ): boolean {
    const value = dataPoint.value;
    const threshold = this.config.anomalyThresholds.percentile;

    if (threshold >= 99) {
      return value > baseline.percentiles.p99 || value < baseline.percentiles.p5;
    } else if (threshold >= 95) {
      return value > baseline.percentiles.p95 || value < baseline.percentiles.p25;
    } else {
      return value > baseline.percentiles.p75 || value < baseline.percentiles.p25;
    }
  }

  /**
   * Calculate isolation score (simplified)
   */
  private calculateIsolationScore(
    dataPoint: DataPoint,
    baseline: Baseline
  ): number {
    // Simplified isolation forest score
    // Real implementation would use proper decision trees
    
    const normalizedValue = (dataPoint.value - baseline.mean) / 
                           (baseline.standardDeviation + 0.0001);
    
    // Score based on distance from mean
    let score = Math.abs(normalizedValue) / 3; // Normalize to 0-1 range
    
    // Adjust for seasonal patterns
    if (baseline.seasonalPatterns && baseline.seasonalPatterns.length > 0) {
      const seasonalAdjustment = this.getSeasonalAdjustment(
        dataPoint,
        baseline.seasonalPatterns
      );
      score *= (1 - seasonalAdjustment);
    }

    // Adjust for trend
    if (baseline.trendComponent && baseline.trendComponent.length > 0) {
      const trendAdjustment = this.getTrendAdjustment(baseline);
      score *= (1 + trendAdjustment);
    }

    return Math.max(0, Math.min(score, 1));
  }

  /**
   * Get seasonal adjustment factor
   */
  private getSeasonalAdjustment(
    _dataPoint: DataPoint,
    patterns: SeasonalPattern[]
  ): number {
    // Check if current time matches any seasonal pattern
    const _hour = _dataPoint.timestamp.getHours();
    const _day = _dataPoint.timestamp.getDay();
    
    let adjustment = 0;
    for (const pattern of patterns) {
      if (pattern.period === 'hourly' && pattern.confidence > 0.5) {
        adjustment += pattern.confidence * 0.3;
      }
      if (pattern.period === 'daily' && pattern.confidence > 0.5) {
        adjustment += pattern.confidence * 0.2;
      }
    }

    return Math.min(adjustment, 0.5);
  }

  /**
   * Get trend adjustment factor
   */
  private getTrendAdjustment(baseline: Baseline): number {
    if (!baseline.trendComponent || baseline.trendComponent.length < 2) {
      return 0;
    }

    const trend = baseline.trendComponent;
    const recentTrend = trend.slice(-10);
    const trendSlope = (recentTrend[recentTrend.length - 1] - recentTrend[0]) / 
                       recentTrend.length;
    
    return Math.min(Math.abs(trendSlope) / baseline.mean, 0.3);
  }

  /**
   * Create anomaly object with full context
   */
  private async createAnomaly(
    dataPoint: DataPoint,
    baseline: Baseline
  ): Promise<Anomaly> {
    const id = uuidv4();
    const timestamp = dataPoint.timestamp;

    // Calculate deviation metrics
    const deviation = {
      standardDeviations: Math.abs(
        (dataPoint.value - baseline.mean) / baseline.standardDeviation
      ),
      percentileRank: this.calculatePercentileRank(dataPoint.value, baseline),
      absoluteDifference: dataPoint.value - baseline.mean,
      relativeDifference: ((dataPoint.value - baseline.mean) / baseline.mean) * 100
    };

    // Calculate anomaly score
    const score = this.calculateAnomalyScore(deviation);

    // Determine severity
    const severity = this.determineSeverity(score, deviation);

    // Build context
    const context = await this.buildContext(dataPoint, baseline);

    // Initial classification (will be refined by classifier)
    const classification = {
      primaryCategory: 'unclassified',
      subCategories: [],
      confidence: 0,
      reasoning: [],
      domainKnowledge: []
    };

    // Find related anomalies
    const relatedAnomalies = await this.findRelatedAnomalies(dataPoint);

    const anomaly: Anomaly = {
      id,
      timestamp,
      source: dataPoint.source,
      type: AnomalyType.BENIGN, // Will be classified later
      severity,
      score,
      dataPoint,
      baseline,
      deviation,
      context,
      classification,
      suggestedActions: [],
      relatedAnomalies,
      metadata: {}
    };

    return anomaly;
  }

  /**
   * Calculate percentile rank of value
   */
  private calculatePercentileRank(value: number, baseline: Baseline): number {
    const percentiles = baseline.percentiles;
    
    if (value <= percentiles.p5) return 5;
    if (value <= percentiles.p25) return 25;
    if (value <= percentiles.p50) return 50;
    if (value <= percentiles.p75) return 75;
    if (value <= percentiles.p95) return 95;
    if (value <= percentiles.p99) return 99;
    return 100;
  }

  /**
   * Calculate overall anomaly score
   */
  private calculateAnomalyScore(deviation: Anomaly['deviation']): number {
    // Combine multiple factors into single score
    const zScoreComponent = Math.min(deviation.standardDeviations / 5, 1) * 0.4;
    const percentileComponent = (Math.abs(deviation.percentileRank - 50) / 50) * 0.3;
    const relativeComponent = Math.min(Math.abs(deviation.relativeDifference) / 100, 1) * 0.3;

    return zScoreComponent + percentileComponent + relativeComponent;
  }

  /**
   * Determine anomaly severity
   */
  private determineSeverity(
    score: number,
    deviation: Anomaly['deviation']
  ): AnomalySeverity {
    if (score >= 0.9 || deviation.standardDeviations >= 5) {
      return AnomalySeverity.CRITICAL;
    } else if (score >= 0.7 || deviation.standardDeviations >= 4) {
      return AnomalySeverity.HIGH;
    } else if (score >= 0.5 || deviation.standardDeviations >= 3) {
      return AnomalySeverity.MEDIUM;
    } else {
      return AnomalySeverity.LOW;
    }
  }

  /**
   * Build anomaly context
   */
  private async buildContext(
    dataPoint: DataPoint,
    baseline: Baseline
  ): Promise<AnomalyContext> {
    const timestamp = dataPoint.timestamp;

    return {
      historicalComparison: {
        similarEvents: 0, // Would query historical database
        lastOccurrence: undefined,
        averageImpact: undefined
      },
      marketConditions: {
        volatility: baseline.standardDeviation / baseline.mean,
        trend: this.detectTrend(baseline),
        volume: this.detectVolume(dataPoint, baseline)
      },
      correlatedEvents: [],
      timeContext: {
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][timestamp.getDay()],
        hour: timestamp.getHours(),
        isHoliday: false, // Would check holiday calendar
        isTradingHours: this.isTradingHours(timestamp)
      }
    };
  }

  /**
   * Detect market trend
   */
  private detectTrend(baseline: Baseline): 'bullish' | 'bearish' | 'neutral' {
    if (!baseline.trendComponent || baseline.trendComponent.length < 2) {
      return 'neutral';
    }

    const trend = baseline.trendComponent;
    const recentTrend = trend.slice(-10);
    const slope = (recentTrend[recentTrend.length - 1] - recentTrend[0]) / 
                  recentTrend.length;

    const threshold = baseline.mean * 0.01; // 1% threshold
    
    if (slope > threshold) return 'bullish';
    if (slope < -threshold) return 'bearish';
    return 'neutral';
  }

  /**
   * Detect volume level
   */
  private detectVolume(
    dataPoint: DataPoint,
    baseline: Baseline
  ): 'high' | 'normal' | 'low' {
    const value = dataPoint.value;
    
    if (value > baseline.percentiles.p75) return 'high';
    if (value < baseline.percentiles.p25) return 'low';
    return 'normal';
  }

  /**
   * Check if timestamp is during trading hours
   */
  private isTradingHours(_timestamp: Date): boolean {
    const _hour = _timestamp.getHours();
    const _day = _timestamp.getDay();
    
    // Crypto trades 24/7, but traditional markets have hours
    // For crypto, return true. For stocks, check hours.
    return true; // Assuming crypto
  }

  /**
   * Find related anomalies (correlation analysis)
   */
  private async findRelatedAnomalies(dataPoint: DataPoint): Promise<string[]> {
    const related: string[] = [];
    const timeWindow = this.correlationWindow;
    const pointTime = dataPoint.timestamp.getTime();

    // Check recent anomalies for correlation
    for (const [_key, anomalies] of this.detectedAnomalies) {
      for (const anomaly of anomalies) {
        const anomalyTime = anomaly.timestamp.getTime();
        const timeDiff = Math.abs(pointTime - anomalyTime);
        
        if (timeDiff <= timeWindow) {
          // Check if sources are related
          if (this.areSourcesRelated(dataPoint.source, anomaly.source)) {
            related.push(anomaly.id);
          }
        }
      }
    }

    return related;
  }

  /**
   * Check if data sources are related
   */
  private areSourcesRelated(source1: DataSource, source2: DataSource): boolean {
    // Define source relationships
    const relationships: Record<DataSource, DataSource[]> = {
      [DataSource.TRADING_VOLUME]: [DataSource.PRICE_MOVEMENT, DataSource.LIQUIDITY],
      [DataSource.PRICE_MOVEMENT]: [DataSource.TRADING_VOLUME, DataSource.SENTIMENT],
      [DataSource.SENTIMENT]: [DataSource.PRICE_MOVEMENT, DataSource.SOCIAL_VOLUME],
      [DataSource.WALLET_ACTIVITY]: [DataSource.ON_CHAIN_METRICS, DataSource.TRADING_VOLUME],
      [DataSource.NETWORK_FEES]: [DataSource.WALLET_ACTIVITY, DataSource.ON_CHAIN_METRICS],
      [DataSource.SOCIAL_VOLUME]: [DataSource.SENTIMENT, DataSource.PRICE_MOVEMENT],
      [DataSource.ON_CHAIN_METRICS]: [DataSource.WALLET_ACTIVITY, DataSource.NETWORK_FEES],
      [DataSource.NEWS_FLOW]: [DataSource.SENTIMENT, DataSource.PRICE_MOVEMENT],
      [DataSource.LIQUIDITY]: [DataSource.TRADING_VOLUME, DataSource.PRICE_MOVEMENT],
      [DataSource.MARKET_DEPTH]: [DataSource.LIQUIDITY, DataSource.TRADING_VOLUME]
    };

    return relationships[source1]?.includes(source2) || false;
  }

  /**
   * Store anomaly for correlation analysis
   */
  private storeAnomaly(anomaly: Anomaly): void {
    const key = anomaly.dataPoint.symbol || anomaly.source;
    
    if (!this.detectedAnomalies.has(key)) {
      this.detectedAnomalies.set(key, []);
    }
    
    const anomalies = this.detectedAnomalies.get(key)!;
    anomalies.push(anomaly);
    
    // Keep only recent anomalies (last 24 hours)
    const cutoff = Date.now() - 86400000;
    this.detectedAnomalies.set(
      key,
      anomalies.filter(a => a.timestamp.getTime() > cutoff)
    );
  }

  /**
   * Correlate anomalies with each other
   */
  private async correlateAnomalies(anomalies: Anomaly[]): Promise<void> {
    for (const anomaly of anomalies) {
      const correlatedEvents: CorrelatedEvent[] = [];

      // Find correlated anomalies
      for (const otherAnomaly of anomalies) {
        if (anomaly.id === otherAnomaly.id) continue;

        const timeDiff = Math.abs(
          anomaly.timestamp.getTime() - otherAnomaly.timestamp.getTime()
        );

        if (timeDiff <= this.correlationWindow) {
          const correlation = this.calculateCorrelation(anomaly, otherAnomaly);
          
          if (correlation > 0.5) {
            correlatedEvents.push({
              source: otherAnomaly.source,
              symbol: otherAnomaly.dataPoint.symbol,
              timestamp: otherAnomaly.timestamp,
              correlation,
              description: `${otherAnomaly.source} anomaly detected`
            });
          }
        }
      }

      anomaly.context.correlatedEvents = correlatedEvents;
    }
  }

  /**
   * Calculate correlation between two anomalies
   */
  private calculateCorrelation(anomaly1: Anomaly, anomaly2: Anomaly): number {
    let correlation = 0;

    // Time proximity
    const timeDiff = Math.abs(
      anomaly1.timestamp.getTime() - anomaly2.timestamp.getTime()
    );
    const timeCorrelation = 1 - (timeDiff / this.correlationWindow);
    correlation += timeCorrelation * 0.4;

    // Source relationship
    if (this.areSourcesRelated(anomaly1.source, anomaly2.source)) {
      correlation += 0.3;
    }

    // Same symbol
    if (anomaly1.dataPoint.symbol === anomaly2.dataPoint.symbol) {
      correlation += 0.2;
    }

    // Similar severity
    if (anomaly1.severity === anomaly2.severity) {
      correlation += 0.1;
    }

    return Math.min(correlation, 1);
  }

  /**
   * Generate detection summary
   */
  private generateSummary(anomalies: Anomaly[]): DetectionSummary {
    const byType: Record<AnomalyType, number> = {
      [AnomalyType.BENIGN]: 0,
      [AnomalyType.EMERGING_THREAT]: 0,
      [AnomalyType.OPPORTUNITY]: 0,
      [AnomalyType.CRITICAL]: 0
    };

    const bySeverity: Record<AnomalySeverity, number> = {
      [AnomalySeverity.LOW]: 0,
      [AnomalySeverity.MEDIUM]: 0,
      [AnomalySeverity.HIGH]: 0,
      [AnomalySeverity.CRITICAL]: 0
    };

    const bySource: Record<DataSource, number> = {} as Record<DataSource, number>;

    for (const anomaly of anomalies) {
      byType[anomaly.type]++;
      bySeverity[anomaly.severity]++;
      bySource[anomaly.source] = (bySource[anomaly.source] || 0) + 1;
    }

    // Top 10 anomalies by score
    const topAnomalies = [...anomalies]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Collect critical actions
    const criticalActions = anomalies
      .flatMap(a => a.suggestedActions)
      .filter(a => a.priority === 'urgent' || a.priority === 'high')
      .slice(0, 10);

    // Generate insights
    const insights = this.generateInsights(anomalies, bySource, bySeverity);

    return {
      totalAnomalies: anomalies.length,
      byType,
      bySeverity,
      bySource,
      topAnomalies,
      criticalActions,
      insights
    };
  }

  /**
   * Generate insights from anomalies
   */
  private generateInsights(
    anomalies: Anomaly[],
    bySource: Record<DataSource, number>,
    bySeverity: Record<AnomalySeverity, number>
  ): string[] {
    const insights: string[] = [];

    if (anomalies.length === 0) {
      insights.push('No anomalies detected. System operating normally.');
      return insights;
    }

    // Overall insight
    insights.push(`Detected ${anomalies.length} anomalies across ${Object.keys(bySource).length} data sources.`);

    // Severity insights
    if (bySeverity[AnomalySeverity.CRITICAL] > 0) {
      insights.push(`⚠️ CRITICAL: ${bySeverity[AnomalySeverity.CRITICAL]} critical anomalies require immediate attention.`);
    }

    // Source insights
    const topSource = Object.entries(bySource)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topSource) {
      insights.push(`Most anomalies detected in ${topSource[0]} (${topSource[1]} instances).`);
    }

    // Correlation insights
    const correlatedCount = anomalies.filter(
      a => a.context.correlatedEvents.length > 0
    ).length;
    
    if (correlatedCount > anomalies.length * 0.5) {
      insights.push(`High correlation detected: ${correlatedCount} anomalies show correlation with other events.`);
    }

    // Timing insights
    const recentAnomalies = anomalies.filter(
      a => Date.now() - a.timestamp.getTime() < 3600000
    ).length;
    
    if (recentAnomalies > anomalies.length * 0.7) {
      insights.push(`⚡ Spike detected: ${recentAnomalies} anomalies occurred in the last hour.`);
    }

    return insights;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }
}

