/**
 * =========================================
 * CORRELATION ANALYZER
 * =========================================
 * Divine world-class signal correlation analysis and pattern detection
 */

// import { Logger } from '../utils/Logger';
import { Matrix } from 'ml-matrix';
import {
  AlertPerformance,
  SignalCorrelation,
  AIInsightsConfig,
  CorrelationMatrix,
  PerformanceTrend
} from '../types';

/**
 * Correlation analyzer for signal analysis
 */
export class CorrelationAnalyzer {
  private config: AIInsightsConfig;

  constructor(config: AIInsightsConfig) {
    this.config = config;
  }

  /**
   * Analyze correlations between signals
   */
  async analyzeCorrelations(
    performance: AlertPerformance[],
    existingCorrelations: SignalCorrelation[]
  ): Promise<SignalCorrelation[]> {
    // Debug logging removed for simplicity

    // Extract unique signal types
    const signalTypes = this.extractSignalTypes(performance);

    if (signalTypes.length < 2) {
      return existingCorrelations;
    }

    // Calculate new correlations
    const newCorrelations = await this.calculateCorrelations(performance, signalTypes);

    // Merge with existing correlations
    const allCorrelations = this.mergeCorrelations(existingCorrelations, newCorrelations);

    // Detect correlation patterns
    const patterns = this.detectCorrelationPatterns(allCorrelations);

    // Filter by significance and sample size
    const significantCorrelations = allCorrelations.filter(
      corr => corr.significance < 0.05 && corr.sampleSize >= this.config.analysis.minSampleSize
    );

    // Logging removed for simplicity

    return significantCorrelations;
  }

  /**
   * Extract unique signal types from performance data
   */
  private extractSignalTypes(performance: AlertPerformance[]): string[] {
    const signalTypes = new Set<string>();

    for (const perf of performance) {
      signalTypes.add(perf.signalType);

      // Also consider symbol-specific signals
      if (perf.symbol) {
        signalTypes.add(`${perf.signalType}_${perf.symbol}`);
      }

      // Consider exchange-specific signals
      if (perf.exchange) {
        signalTypes.add(`${perf.signalType}_${perf.exchange}`);
      }
    }

    return Array.from(signalTypes);
  }

  /**
   * Calculate correlations between signals
   */
  private async calculateCorrelations(
    performance: AlertPerformance[],
    signalTypes: string[]
  ): Promise<SignalCorrelation[]> {
    const correlations: SignalCorrelation[] = [];

    // Group performance data by signal type
    const signalData = this.groupBySignalType(performance);

    // Calculate pairwise correlations
    for (let i = 0; i < signalTypes.length; i++) {
      for (let j = i + 1; j < signalTypes.length; j++) {
        const signalA = signalTypes[i];
        const signalB = signalTypes[j];

        const correlation = await this.calculatePairwiseCorrelation(
          signalA,
          signalB,
          signalData
        );

        if (correlation) {
          correlations.push(correlation);
        }
      }
    }

    return correlations;
  }

  /**
   * Group performance data by signal type
   */
  private groupBySignalType(performance: AlertPerformance[]): Map<string, AlertPerformance[]> {
    const groups = new Map<string, AlertPerformance[]>();

    for (const perf of performance) {
      const key = perf.signalType;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(perf);
    }

    return groups;
  }

  /**
   * Calculate pairwise correlation between two signals
   */
  private async calculatePairwiseCorrelation(
    signalA: string,
    signalB: string,
    signalData: Map<string, AlertPerformance[]>
  ): Promise<SignalCorrelation | null> {
    const dataA = signalData.get(signalA) || [];
    const dataB = signalData.get(signalB) || [];

    if (dataA.length < this.config.analysis.minSampleSize ||
        dataB.length < this.config.analysis.minSampleSize) {
      return null;
    }

    // Extract values for correlation calculation
    const valuesA = dataA.map(p => p.accuracy);
    const valuesB = dataB.map(p => p.accuracy);

    // Align data by timestamp
    const alignedData = this.alignByTimestamp(dataA, dataB);

    if (alignedData.length < this.config.analysis.minSampleSize) {
      return null;
    }

    // Calculate correlation
    const correlation = this.calculatePearsonCorrelation(
      alignedData.map(d => d.accuracyA),
      alignedData.map(d => d.accuracyB)
    );

    // Calculate significance (p-value)
    const significance = this.calculateSignificance(correlation, alignedData.length);

    // Determine trend and strength
    const trend = correlation > 0.3 ? 'positive' : correlation < -0.3 ? 'negative' : 'neutral';
    const strength = this.determineCorrelationStrength(Math.abs(correlation));

    return {
      signalA,
      signalB,
      correlation,
      timeframe: '1h', // Default timeframe
      sampleSize: alignedData.length,
      significance,
      trend,
      strength,
      lastUpdated: new Date()
    };
  }

  /**
   * Align performance data by timestamp for correlation calculation
   */
  private alignByTimestamp(dataA: AlertPerformance[], dataB: AlertPerformance[]): Array<{
    accuracyA: number;
    accuracyB: number;
    timestamp: Date;
  }> {
    const aligned: Array<{
      accuracyA: number;
      accuracyB: number;
      timestamp: Date;
    }> = [];

    // Create timestamp maps
    const mapA = new Map<number, number>();
    const mapB = new Map<number, number>();

    for (const perf of dataA) {
      const timestamp = perf.timestamp.getTime();
      mapA.set(timestamp, perf.accuracy);
    }

    for (const perf of dataB) {
      const timestamp = perf.timestamp.getTime();
      mapB.set(timestamp, perf.accuracy);
    }

    // Find common timestamps
    for (const [timestamp, accuracyA] of mapA) {
      if (mapB.has(timestamp)) {
        aligned.push({
          accuracyA,
          accuracyB: mapB.get(timestamp)!,
          timestamp: new Date(timestamp)
        });
      }
    }

    return aligned;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  /**
   * Calculate statistical significance (p-value approximation)
   */
  private calculateSignificance(correlation: number, sampleSize: number): number {
    // Simplified p-value calculation using t-distribution
    const t = Math.abs(correlation) * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    const degreesOfFreedom = sampleSize - 2;

    // Approximation for p-value (simplified)
    return Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI);
  }

  /**
   * Determine correlation strength
   */
  private determineCorrelationStrength(absCorrelation: number): 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (absCorrelation < 0.3) return 'weak';
    if (absCorrelation < 0.5) return 'moderate';
    if (absCorrelation < 0.7) return 'strong';
    return 'very_strong';
  }

  /**
   * Merge existing and new correlations
   */
  private mergeCorrelations(
    existing: SignalCorrelation[],
    newCorrelations: SignalCorrelation[]
  ): SignalCorrelation[] {
    const merged = new Map<string, SignalCorrelation>();

    // Add existing correlations
    for (const corr of existing) {
      const key = `${corr.signalA}_${corr.signalB}_${corr.timeframe}`;
      merged.set(key, corr);
    }

    // Add/update with new correlations
    for (const corr of newCorrelations) {
      const key = `${corr.signalA}_${corr.signalB}_${corr.timeframe}`;
      merged.set(key, corr);
    }

    return Array.from(merged.values());
  }

  /**
   * Detect correlation patterns and trends
   */
  private detectCorrelationPatterns(correlations: SignalCorrelation[]): any[] {
    const patterns: any[] = [];

    // Detect strong positive correlations
    const strongPositive = correlations.filter(c =>
      c.correlation > 0.7 && c.strength === 'very_strong'
    );

    if (strongPositive.length > 0) {
      patterns.push({
        type: 'strong_positive_correlation',
        signals: strongPositive.map(c => [c.signalA, c.signalB]),
        description: 'Strong positive correlation detected between signals',
        confidence: 0.9
      });
    }

    // Detect negative correlations (inverse relationships)
    const negativeCorrelations = correlations.filter(c =>
      c.correlation < -0.5 && c.strength === 'moderate'
    );

    if (negativeCorrelations.length > 0) {
      patterns.push({
        type: 'negative_correlation',
        signals: negativeCorrelations.map(c => [c.signalA, c.signalB]),
        description: 'Negative correlation detected (inverse relationship)',
        confidence: 0.8
      });
    }

    return patterns;
  }

  /**
   * Generate correlation matrix for visualization
   */
  generateCorrelationMatrix(
    correlations: SignalCorrelation[],
    signals: string[]
  ): CorrelationMatrix {
    const matrix: number[][] = [];
    const significance: number[][] = [];

    for (let i = 0; i < signals.length; i++) {
      matrix[i] = [];
      significance[i] = [];

      for (let j = 0; j < signals.length; j++) {
        if (i === j) {
          matrix[i][j] = 1; // Perfect correlation with self
          significance[i][j] = 0;
        } else {
          const correlation = correlations.find(c =>
            (c.signalA === signals[i] && c.signalB === signals[j]) ||
            (c.signalA === signals[j] && c.signalB === signals[i])
          );

          matrix[i][j] = correlation?.correlation || 0;
          significance[i][j] = correlation?.significance || 1;
        }
      }
    }

    return {
      signals,
      matrix,
      timeframe: '1h',
      lastUpdated: new Date(),
      significance
    };
  }

  /**
   * Analyze performance trends for signals
   */
  async analyzePerformanceTrends(performance: AlertPerformance[]): Promise<PerformanceTrend[]> {
    const trends: PerformanceTrend[] = [];

    // Group by signal type
    const signalGroups = this.groupBySignalType(performance);

    for (const [signal, data] of signalGroups) {
      if (data.length < 10) continue; // Need minimum data points

      const trend = this.calculateTrend(data);

      if (trend.confidence > 0.6) {
        trends.push({
          signal,
          trend: trend.direction,
          slope: trend.slope,
          rSquared: trend.rSquared,
          confidence: trend.confidence,
          period: {
            start: data[0].timestamp,
            end: data[data.length - 1].timestamp
          }
        });
      }
    }

    return trends;
  }

  /**
   * Calculate trend for signal performance
   */
  private calculateTrend(data: AlertPerformance[]): {
    direction: 'improving' | 'declining' | 'stable';
    slope: number;
    rSquared: number;
    confidence: number;
  } {
    if (data.length < 2) {
      return { direction: 'stable', slope: 0, rSquared: 0, confidence: 0 };
    }

    // Sort by timestamp
    const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Create time series
    const x = sorted.map((_, i) => i);
    const y = sorted.map(p => p.accuracy);

    // Calculate linear regression
    const result = this.linearRegression(x, y);

    // Determine trend direction
    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    if (result.slope > 0.01) direction = 'improving';
    else if (result.slope < -0.01) direction = 'declining';

    return {
      direction,
      slope: result.slope,
      rSquared: result.rSquared,
      confidence: Math.min(result.rSquared, 1)
    };
  }

  /**
   * Perform linear regression
   */
  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;

    if (n === 0) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);

    const rSquared = 1 - (residualSumSquares / totalSumSquares);

    return { slope, intercept, rSquared };
  }

  /**
   * Detect anomalous correlation patterns
   */
  detectAnomalies(correlations: SignalCorrelation[]): Array<{
    type: string;
    signals: string[];
    description: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
  }> {
    const anomalies: Array<{
      type: string;
      signals: string[];
      description: string;
      severity: 'low' | 'medium' | 'high';
      confidence: number;
    }> = [];

    // Detect sudden correlation changes
    const recentCorrelations = correlations.filter(c =>
      c.lastUpdated.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    for (const corr of recentCorrelations) {
      if (Math.abs(corr.correlation) > 0.8 && corr.significance < 0.01) {
        anomalies.push({
          type: 'strong_recent_correlation',
          signals: [corr.signalA, corr.signalB],
          description: `Strong correlation (${corr.correlation.toFixed(2)}) detected recently`,
          severity: 'medium',
          confidence: 1 - corr.significance
        });
      }
    }

    return anomalies;
  }
}
