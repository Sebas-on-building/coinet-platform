/**
 * =========================================
 * ANOMALY DETECTOR
 * =========================================
 * Z-score based anomaly detection with configurable thresholds
 * and domain-specific filtering for divine perfection
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  NormalizedSignal,
  AnomalyEvent,
  AnomalyConfig
} from '../types';
import type {
  RollingStatistics,
  TimeBucket,
  RollingWindow
} from './types';

export class AnomalyDetector extends EventEmitter {
  private logger: Logger;
  private config: AnomalyConfig;
  private isInitialized: boolean = false;

  // Rolling statistics storage per signal type
  private rollingStats: Map<string, RollingStatistics> = new Map();

  // Time bucket storage for 10-second intervals
  private timeBuckets: Map<string, Map<number, TimeBucket>> = new Map();

  // Anomaly tracking for sustained detection
  private sustainedAnomalies: Map<string, {
    count: number;
    lastSeen: Date;
    zScore: number;
  }> = new Map();

  constructor(config: AnomalyConfig) {
    super();
    this.logger = new Logger('AnomalyDetector');
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Anomaly Detector...');

      // Initialize rolling statistics for each signal type
      for (const signalType of this.config.signalTypes) {
        const stats: RollingStatistics = {
          type: signalType,
          windows: new Map(),
          lastUpdate: new Date(),
          dataPoints: 0
        };

        // Initialize windows for each configured window size
        for (const windowSize of this.config.windowSizes) {
          stats.windows.set(windowSize, {
            windowSize,
            values: [],
            mean: 0,
            stdDev: 1,
            outliers: [],
            lastUpdate: new Date()
          });
        }

        this.rollingStats.set(signalType, stats);
      }

      this.isInitialized = true;
      this.logger.info('✅ Anomaly Detector initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Anomaly Detector', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Clear all stored data
      this.rollingStats.clear();
      this.timeBuckets.clear();
      this.sustainedAnomalies.clear();
      this.isInitialized = false;
      this.logger.info('✅ Anomaly Detector stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Anomaly Detector', error);
      throw error;
    }
  }

  /**
   * Process a signal and check for anomalies
   */
  async detectAnomalies(signal: NormalizedSignal): Promise<AnomalyEvent[]> {
    if (!this.isInitialized) {
      throw new Error('Anomaly Detector is not initialized');
    }

    const anomalies: AnomalyEvent[] = [];

    try {
      // Get signal type configuration
      const signalConfig = this.config.signalConfigs[signal.type as keyof typeof this.config.signalConfigs];
      if (!signalConfig) {
        this.logger.debug('No configuration found for signal type', { type: signal.type });
        return anomalies;
      }

      // Add signal to time bucket
      const bucketKey = this.getBucketKey(signal.timestamp);
      this.addToTimeBucket(signal, bucketKey);

      // Update rolling statistics
      await this.updateRollingStatistics(signal);

      // Calculate z-score for current signal
      const zScore = this.calculateZScore(signal);

      // Check for anomalies
      const anomalyEvents = this.checkAnomalies(signal, zScore, signalConfig);

      anomalies.push(...anomalyEvents);

      // Log detection results
      if (anomalies.length > 0) {
        this.logger.anomaly('Anomalies detected', {
          signal_id: signal.id,
          signal_type: signal.type,
          anomaly_count: anomalies.length,
          z_score: zScore
        });
      }

      return anomalies;

    } catch (error: any) {
      this.logger.error('Failed to detect anomalies', {
        signal_id: signal.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get rolling statistics for a signal type
   */
  getRollingStatistics(signalType: string): RollingStatistics | null {
    return this.rollingStats.get(signalType) || null;
  }

  /**
   * Get time bucket data for debugging
   */
  getTimeBuckets(signalType: string): Map<number, TimeBucket> | null {
    return this.timeBuckets.get(signalType) || null;
  }

  private getBucketKey(timestamp: Date): number {
    // Round down to 10-second intervals
    return Math.floor(timestamp.getTime() / 10000) * 10000;
  }

  private addToTimeBucket(signal: NormalizedSignal, bucketKey: number): void {
    if (!this.timeBuckets.has(signal.type)) {
      this.timeBuckets.set(signal.type, new Map());
    }

    const signalBuckets = this.timeBuckets.get(signal.type)!;

    if (!signalBuckets.has(bucketKey)) {
      signalBuckets.set(bucketKey, {
        bucketKey,
        signals: [],
        startTime: new Date(bucketKey),
        endTime: new Date(bucketKey + 10000)
      });
    }

    const bucket = signalBuckets.get(bucketKey)!;
    bucket.signals.push(signal);

    // Keep only recent buckets to prevent memory issues
    const cutoffTime = Date.now() - (this.config.maxBucketAge * 1000);
    for (const [key, bucketData] of signalBuckets.entries()) {
      if (key < cutoffTime) {
        signalBuckets.delete(key);
      }
    }
  }

  private async updateRollingStatistics(signal: NormalizedSignal): Promise<void> {
    const stats = this.rollingStats.get(signal.type);
    if (!stats) return;

    stats.lastUpdate = new Date();
    stats.dataPoints++;

    // Get signal value for statistics
    const signalValue = this.extractSignalValue(signal);

    // Update each window
    for (const [windowSize, windowData] of stats.windows.entries()) {
      // Add new value
      windowData.values.push(signalValue);

      // Remove old values outside the window
      const windowStart = Date.now() - (windowSize * 1000);
      windowData.values = windowData.values.filter((v: { value: number; timestamp: Date }) =>
        v.timestamp && v.timestamp.getTime() > windowStart
      );

      // Remove outliers before computing statistics
      const cleanedValues = this.removeOutliers(windowData.values);

      if (cleanedValues.length > 0) {
        // Update statistics
        const numericValues = cleanedValues.map(v => v.value);
        windowData.mean = this.calculateMean(numericValues);
        windowData.stdDev = this.calculateStdDev(numericValues, windowData.mean);
        windowData.lastUpdate = new Date();

        // Update outliers list
        windowData.outliers = windowData.values.filter((v: { value: number; timestamp: Date }) =>
          Math.abs(this.calculateZScoreForValue(v.value, windowData.mean, windowData.stdDev)) > this.config.outlierThreshold
        );
      }
    }
  }

  private extractSignalValue(signal: NormalizedSignal): { value: number; timestamp: Date } {
    // Extract the primary metric value for anomaly detection
    // Use the first normalized value or a composite score
    const values = Object.values(signal.normalizedValues);
    const primaryValue = values.length > 0 ? values[0] : 0;

    return {
      value: primaryValue as number,
      timestamp: signal.timestamp
    };
  }

  private removeOutliers(values: Array<{ value: number; timestamp: Date }>): Array<{ value: number; timestamp: Date }> {
    if (values.length < 3) return values;

    const numericValues = values.map(v => v.value);
    const mean = this.calculateMean(numericValues);
    const stdDev = this.calculateStdDev(numericValues, mean);

    if (stdDev === 0) return values;

    return values.filter(v => {
      const zScore = Math.abs((v.value - mean) / stdDev);
      return zScore <= this.config.outlierThreshold;
    });
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateZScore(signal: NormalizedSignal): number {
    const stats = this.rollingStats.get(signal.type);
    if (!stats) return 0;

    const signalValue = this.extractSignalValue(signal);

    // Use the most recent window for z-score calculation
    const windows = Array.from(stats.windows.values());
    const recentWindow = windows.sort((a: RollingWindow, b: RollingWindow) =>
      b.lastUpdate.getTime() - a.lastUpdate.getTime()
    )[0];

    if (!recentWindow || recentWindow.values.length === 0) return 0;

    return this.calculateZScoreForValue(signalValue.value, recentWindow.mean, recentWindow.stdDev);
  }

  private calculateZScoreForValue(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  private checkAnomalies(
    signal: NormalizedSignal,
    zScore: number,
    signalConfig: any
  ): AnomalyEvent[] {
    const anomalies: AnomalyEvent[] = [];

    // Get current sustained anomaly state
    const sustainedKey = `${signal.type}_${signal.id}`;
    const sustained = this.sustainedAnomalies.get(sustainedKey) || {
      count: 0,
      lastSeen: new Date(0),
      zScore: 0
    };

    const now = new Date();
    const timeSinceLastSeen = now.getTime() - sustained.lastSeen.getTime();

    // Check if this is a new anomaly or continuation
    const isAnomaly = Math.abs(zScore) > signalConfig.zScoreThreshold;
    const isSustained = timeSinceLastSeen < (signalConfig.sustainedPeriod * 1000);

    if (isAnomaly) {
      if (isSustained && sustained.count > 0) {
        // Increment sustained anomaly count
        sustained.count++;
        sustained.zScore = zScore;
      } else {
        // Start new sustained anomaly
        sustained.count = 1;
        sustained.zScore = zScore;
      }
      sustained.lastSeen = now;
    } else if (isSustained && sustained.count >= signalConfig.minSustainedCount) {
      // End sustained anomaly
      const anomalyEvent = this.createAnomalyEvent(signal, zScore, sustained, true);
      anomalies.push(anomalyEvent);
      sustained.count = 0;
    } else {
      sustained.count = 0;
    }

    // Check for immediate anomalies (if configured)
    if (isAnomaly && signalConfig.immediateAlert) {
      const immediateAnomaly = this.createAnomalyEvent(signal, zScore, sustained, false);
      anomalies.push(immediateAnomaly);
    }

    // Update sustained tracking
    this.sustainedAnomalies.set(sustainedKey, sustained);

    return anomalies;
  }

  private createAnomalyEvent(
    signal: NormalizedSignal,
    zScore: number,
    sustained: any,
    isSustained: boolean
  ): AnomalyEvent {
    const stats = this.rollingStats.get(signal.type);
    const signalConfig = this.config.signalConfigs[signal.type as keyof typeof this.config.signalConfigs];

    const eventId = `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: eventId,
      signalId: signal.id,
      signalType: signal.type,
      timestamp: new Date(),
      zScore,
      threshold: signalConfig.zScoreThreshold,
      severity: this.calculateSeverity(zScore, signalConfig),
      isSustained,
      sustainedCount: sustained.count,
      sustainedPeriod: isSustained ? signalConfig.sustainedPeriod : 0,
      context: {
        signalSnapshot: {
          type: signal.type,
          timestamp: signal.timestamp,
          normalizedValues: signal.normalizedValues,
          confidence: signal.metadata.confidence
        },
        statistics: stats ? {
          mean: Array.from(stats.windows.values())[0]?.mean || 0,
          stdDev: (Array.from(stats.windows.values())[0] as RollingWindow)?.stdDev || 1,
          dataPoints: stats.dataPoints
        } : null,
        thresholds: signalConfig,
        explanation: this.generateExplanation(zScore, signal, signalConfig, isSustained)
      }
    };
  }

  private calculateSeverity(zScore: number, signalConfig: any): 'low' | 'medium' | 'high' | 'critical' {
    const absZScore = Math.abs(zScore);

    if (absZScore >= signalConfig.criticalThreshold) return 'critical';
    if (absZScore >= signalConfig.highThreshold) return 'high';
    if (absZScore >= signalConfig.mediumThreshold) return 'medium';
    return 'low';
  }

  private generateExplanation(
    zScore: number,
    signal: NormalizedSignal,
    signalConfig: any,
    isSustained: boolean
  ): string {
    const direction = zScore > 0 ? 'above' : 'below';
    const severity = this.calculateSeverity(zScore, signalConfig);
    const sustainedText = isSustained ? ' sustained' : '';

    let explanation = `Signal ${signal.type} shows${sustainedText} anomaly with z-score ${zScore.toFixed(2)} (${direction} expected range). `;

    if (isSustained) {
      explanation += `Anomaly has persisted for ${signalConfig.sustainedPeriod} seconds. `;
    }

    explanation += `Severity level: ${severity}. `;

    // Add domain-specific context
    if (signal.type === 'price' && Math.abs(zScore) > signalConfig.zScoreThreshold) {
      explanation += 'Price movement exceeds normal volatility patterns. ';
    } else if (signal.type === 'volume' && zScore > signalConfig.zScoreThreshold) {
      explanation += 'Trading volume spike detected above normal levels. ';
    } else if (signal.type === 'social_media' && Math.abs(zScore) > signalConfig.zScoreThreshold) {
      explanation += 'Social sentiment shows unusual activity patterns. ';
    }

    return explanation;
  }

  getStatus(): string {
    return this.isInitialized ? 'Ready' : 'Not Initialized';
  }
}
