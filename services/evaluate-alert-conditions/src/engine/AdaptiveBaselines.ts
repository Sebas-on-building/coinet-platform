/**
 * =========================================
 * ADAPTIVE BASELINES ENGINE
 * =========================================
 * Divine world-class adaptive baselines calculation engine
 * Real-time baseline computation with statistical rigor and performance
 */

import { Logger } from '@/utils/Logger';
import {
  AdaptiveBaseline,
  BaselineValue,
  MetricType,
  TimeWindow,
  NormalizedMarketSignal,
  IBaselineStorage
} from '../types';

/**
 * Adaptive baselines calculation engine
 */
export class AdaptiveBaselinesEngine {
  private logger: Logger;
  private storage: IBaselineStorage;
  private baselines: Map<string, AdaptiveBaseline> = new Map();

  constructor(storage: IBaselineStorage) {
    this.logger = new Logger('AdaptiveBaselines');
    this.storage = storage;
  }

  /**
   * Register a baseline configuration
   */
  async registerBaseline(baseline: AdaptiveBaseline): Promise<void> {
    this.baselines.set(baseline.id, baseline);
    this.logger.info('Registered adaptive baseline', {
      baselineId: baseline.id,
      metricType: baseline.metricType,
      method: baseline.method,
    });
  }

  /**
   * Update baseline with new signal data
   */
  async updateBaseline(
    baselineId: string,
    signal: NormalizedMarketSignal,
    historicalSignals: NormalizedMarketSignal[]
  ): Promise<BaselineValue> {
    const baseline = this.baselines.get(baselineId);
    if (!baseline) {
      throw new Error(`Baseline ${baselineId} not found`);
    }

    const metricValue = this.extractMetricValue(signal, baseline.metricType);
    if (metricValue === null) {
      throw new Error(`Cannot extract ${baseline.metricType} from signal`);
    }

    // Get existing baseline
    const existingBaseline = await this.storage.getBaseline(baselineId);

    // Combine historical data with new signal
    const allSignals = [...historicalSignals, signal];

    // Calculate baseline using the specified method
    const baselineValue = await this.calculateBaseline(baseline, allSignals, existingBaseline);

    // Update storage
    await this.storage.updateBaseline(baselineValue);

    this.logger.debug('Updated baseline', {
      baselineId,
      metricType: baseline.metricType,
      newValue: baselineValue.value,
      confidence: baselineValue.confidence,
    });

    return baselineValue;
  }

  /**
   * Calculate baseline value using specified method
   */
  private async calculateBaseline(
    baseline: AdaptiveBaseline,
    signals: NormalizedMarketSignal[],
    existingBaseline?: BaselineValue | null
  ): Promise<BaselineValue> {
    // Filter signals by time window
    const windowMs = this.timeWindowToMs(baseline.window);
    const cutoffTime = Date.now() - windowMs;

    const relevantSignals = signals.filter(s => s.timestamp >= cutoffTime);

    if (relevantSignals.length < baseline.minSamples) {
      return {
        baselineId: baseline.id,
        value: 0,
        confidence: 0,
        lastUpdated: Date.now(),
        sampleCount: 0,
        trend: 'stable',
        trendStrength: 0,
      };
    }

    // Extract metric values
    const values = relevantSignals.map(s => this.extractMetricValue(s, baseline.metricType)).filter(v => v !== null) as number[];

    if (values.length < baseline.minSamples) {
      return {
        baselineId: baseline.id,
        value: 0,
        confidence: 0,
        lastUpdated: Date.now(),
        sampleCount: 0,
        trend: 'stable',
        trendStrength: 0,
      };
    }

    let baselineValue: number;
    let confidence: number;

    switch (baseline.method) {
      case 'rolling_mean':
        baselineValue = this.calculateRollingMean(values);
        confidence = this.calculateConfidence(values, baselineValue);
        break;

      case 'rolling_median':
        baselineValue = this.calculateRollingMedian(values);
        confidence = this.calculateConfidence(values, baselineValue);
        break;

      case 'exponential_moving_average':
        baselineValue = this.calculateEMA(values, baseline.parameters.alpha || 0.1, existingBaseline?.value);
        confidence = this.calculateConfidence(values, baselineValue);
        break;

      case 'seasonal_decomposition':
        const decomposition = this.seasonalDecomposition(values, baseline.parameters);
        baselineValue = decomposition.trend;
        confidence = decomposition.confidence;
        break;

      default:
        throw new Error(`Unsupported baseline method: ${baseline.method}`);
    }

    // Calculate trend
    const trend = this.calculateTrend(values, baselineValue);

    return {
      baselineId: baseline.id,
      value: baselineValue,
      confidence,
      lastUpdated: Date.now(),
      sampleCount: values.length,
      trend: trend.direction,
      trendStrength: trend.strength,
    };
  }

  /**
   * Calculate rolling mean
   */
  private calculateRollingMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate rolling median
   */
  private calculateRollingMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1]! + sorted[mid]!) / 2;
    } else {
      return sorted[mid]!;
    }
  }

  /**
   * Calculate exponential moving average
   */
  private calculateEMA(values: number[], alpha: number, previousEMA?: number): number {
    if (values.length === 0) return previousEMA || 0;

    const currentValue = values[values.length - 1]!;

    if (previousEMA === undefined) {
      // Use simple mean for first calculation
      return this.calculateRollingMean(values);
    }

    return alpha * currentValue + (1 - alpha) * previousEMA;
  }

  /**
   * Seasonal decomposition for trend extraction
   */
  private seasonalDecomposition(
    values: number[],
    parameters: { seasonalPeriods?: number; trendSmoothing?: number; seasonalSmoothing?: number }
  ): { trend: number; seasonal: number; residual: number; confidence: number } {
    const { seasonalPeriods = 24, trendSmoothing = 0.1, seasonalSmoothing = 0.1 } = parameters;

    if (values.length < seasonalPeriods * 2) {
      // Not enough data for seasonal decomposition
      return {
        trend: this.calculateRollingMean(values),
        seasonal: 0,
        residual: 0,
        confidence: 0.5,
      };
    }

    // Simple trend extraction using moving average
    const trendValues = this.calculateTrendValues(values, Math.min(seasonalPeriods, Math.floor(values.length / 4)));

    return {
      trend: trendValues[trendValues.length - 1] || 0,
      seasonal: 0, // Simplified - would need full seasonal decomposition
      residual: 0, // Simplified
      confidence: 0.8, // Higher confidence for trend-based calculation
    };
  }

  /**
   * Calculate trend direction and strength
   */
  private calculateTrend(values: number[], baselineValue: number): { direction: 'increasing' | 'decreasing' | 'stable'; strength: number } {
    if (values.length < 3) {
      return { direction: 'stable', strength: 0 };
    }

    // Calculate linear regression slope
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i]!, 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Normalize slope to strength (0-1)
    const maxSlope = Math.max(...values) - Math.min(...values);
    const strength = Math.min(Math.abs(slope) / (maxSlope || 1), 1);

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.001) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return { direction, strength };
  }

  /**
   * Calculate trend values using moving average
   */
  private calculateTrendValues(values: number[], windowSize: number): number[] {
    const trendValues: number[] = [];

    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      trendValues.push(this.calculateRollingMean(window));
    }

    return trendValues;
  }

  /**
   * Calculate confidence based on value stability
   */
  private calculateConfidence(values: number[], baselineValue: number): number {
    if (values.length < 2) return 0;

    // Calculate coefficient of variation
    const mean = this.calculateRollingMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const coefficientOfVariation = stdDev / (Math.abs(mean) || 1);

    // Convert to confidence (lower variation = higher confidence)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Extract metric value from signal
   */
  private extractMetricValue(signal: NormalizedMarketSignal, metricType: MetricType): number | null {
    switch (metricType) {
      case MetricType.PRICE:
        return signal.price || null;
      case MetricType.VOLUME:
        return signal.volume || null;
      case MetricType.SPREAD:
        return signal.spread || null;
      case MetricType.LIQUIDITY:
        return signal.bidVolume && signal.askVolume ? (signal.bidVolume + signal.askVolume) / 2 : null;
      case MetricType.VOLATILITY:
        return signal.volatility || null;
      case MetricType.MOMENTUM:
        return signal.momentumScore || null;
      case MetricType.ORDERBOOK_IMBALANCE:
        return signal.orderBookImbalance || null;
      case MetricType.FUNDING_RATE:
        return signal.fundingRate || null;
      case MetricType.OPEN_INTEREST:
        return signal.openInterest || null;
      case MetricType.MARKET_DEPTH:
        return signal.marketDepth || null;
      default:
        return null;
    }
  }

  /**
   * Convert time window to milliseconds
   */
  private timeWindowToMs(window: TimeWindow): number {
    switch (window) {
      case TimeWindow.INSTANT: return 0;
      case TimeWindow.MINUTE_1: return 60 * 1000;
      case TimeWindow.MINUTE_5: return 5 * 60 * 1000;
      case TimeWindow.MINUTE_15: return 15 * 60 * 1000;
      case TimeWindow.HOUR_1: return 60 * 60 * 1000;
      case TimeWindow.HOUR_4: return 4 * 60 * 60 * 1000;
      case TimeWindow.HOUR_24: return 24 * 60 * 60 * 1000;
      case TimeWindow.WEEK_1: return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  }

  /**
   * Get all registered baselines
   */
  getRegisteredBaselines(): AdaptiveBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Clear all baselines
   */
  async clearBaselines(): Promise<void> {
    this.baselines.clear();
    await this.storage.invalidateBaselines();
    this.logger.info('Cleared all adaptive baselines');
  }
}
