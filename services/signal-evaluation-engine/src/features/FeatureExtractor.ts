/**
 * =========================================
 * FEATURE EXTRACTOR
 * =========================================
 * Advanced feature extraction for signal analysis
 */

import * as stats from 'simple-statistics';
import { Logger } from '../utils/Logger';
import type { NormalizedSignal, FeatureVector, FeatureExtractionConfig } from '../types';

export class FeatureExtractor {
  private logger: Logger;
  private config: FeatureExtractionConfig;
  private isInitialized: boolean = false;

  // Feature caches for efficiency
  private featureCache: Map<string, Record<string, number>> = new Map();

  constructor(config: FeatureExtractionConfig) {
    this.logger = new Logger('FeatureExtractor');
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Feature Extractor...');

      // Initialize feature caches
      this.featureCache.clear();

      this.isInitialized = true;
      this.logger.info('✅ Feature Extractor initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Feature Extractor', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.featureCache.clear();
      this.isInitialized = false;
      this.logger.info('✅ Feature Extractor stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Feature Extractor', error);
      throw error;
    }
  }

  async extractFeatures(normalizedSignal: NormalizedSignal): Promise<FeatureVector> {
    if (!this.isInitialized) {
      throw new Error('Feature Extractor is not initialized');
    }

    try {
      const startTime = Date.now();
      const cacheKey = `${normalizedSignal.type}_${normalizedSignal.id}`;

      // Check cache first
      if (this.featureCache.has(cacheKey)) {
        const cached = this.featureCache.get(cacheKey)!;
        this.logger.debug('Features extracted from cache', { signal_id: normalizedSignal.id });
        return this.createFeatureVector(cached, normalizedSignal);
      }

      // Extract features based on configuration
      const features: Record<string, number> = {};

      // Temporal features
      if (this.config.enabledFeatures.includes('temporal')) {
        features.timestamp = normalizedSignal.timestamp.getTime();
        features.timeOfDay = normalizedSignal.timestamp.getHours();
        features.dayOfWeek = normalizedSignal.timestamp.getDay();
      }

      // Statistical features
      if (this.config.enabledFeatures.includes('statistical')) {
        const values = Object.values(normalizedSignal.normalizedValues);
        features.mean = stats.mean(values);
        features.std = stats.standardDeviation(values);
        features.skewness = this.calculateSkewness(values);
        features.kurtosis = this.calculateKurtosis(values);
        features.min = Math.min(...values);
        features.max = Math.max(...values);
        features.range = features.max - features.min;
      }

      // Volatility features
      if (this.config.enabledFeatures.includes('volatility')) {
        features.volatility = this.calculateVolatility(normalizedSignal);
      }

      // Momentum features
      if (this.config.enabledFeatures.includes('momentum')) {
        features.momentum = this.calculateMomentum(normalizedSignal);
      }

      // Correlation features
      if (this.config.enabledFeatures.includes('correlation')) {
        features.correlation = this.calculateCorrelation(normalizedSignal);
      }

      // Trend features
      if (this.config.enabledFeatures.includes('trend')) {
        features.trend = this.calculateTrend(normalizedSignal);
      }

      // Composite features
      if (this.config.enabledFeatures.includes('composite')) {
        features.compositeScore = this.calculateCompositeScore(features);
      }

      // Anomaly features
      if (this.config.enabledFeatures.includes('anomaly')) {
        features.anomalyScore = this.calculateAnomalyScore(features);
      }

      // Impact features
      if (this.config.enabledFeatures.includes('impact')) {
        features.impactScore = this.calculateImpactScore(normalizedSignal);
      }

      // Cache features
      this.featureCache.set(cacheKey, features);

      const featureVector = this.createFeatureVector(features, normalizedSignal);

      this.logger.processing('feature_extraction', Date.now() - startTime, {
        signal_id: normalizedSignal.id,
        features_count: Object.keys(features).length
      });

      return featureVector;

    } catch (error: any) {
      this.logger.error('Failed to extract features', {
        signal_id: normalizedSignal.id,
        error: error.message
      });
      throw error;
    }
  }

  private calculateSkewness(values: number[]): number {
    const mean = stats.mean(values);
    const std = stats.standardDeviation(values);
    const n = values.length;

    if (std === 0) return 0;

    const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / n;
    return skewness;
  }

  private calculateKurtosis(values: number[]): number {
    const mean = stats.mean(values);
    const std = stats.standardDeviation(values);
    const n = values.length;

    if (std === 0) return 0;

    const kurtosis = values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0) / n - 3;
    return kurtosis;
  }

  private calculateVolatility(normalizedSignal: NormalizedSignal): number {
    const values = Object.values(normalizedSignal.normalizedValues);

    // Rolling volatility over configured window
    const windowSize = Math.min(this.config.volatilityWindow, values.length);
    const recentValues = values.slice(-windowSize);

    if (recentValues.length < 2) return 0;

    // Calculate standard deviation of recent values
    return stats.standardDeviation(recentValues);
  }

  private calculateMomentum(normalizedSignal: NormalizedSignal): number {
    const values = Object.values(normalizedSignal.normalizedValues);

    // Simple momentum: difference between recent and older values
    const windowSize = Math.min(this.config.momentumWindow, values.length);
    if (windowSize < 2) return 0;

    const recent = values.slice(-Math.floor(windowSize / 2));
    const older = values.slice(-windowSize, -Math.floor(windowSize / 2));

    const recentMean = stats.mean(recent);
    const olderMean = stats.mean(older);

    return (recentMean - olderMean) / Math.max(olderMean, 0.001); // Avoid division by zero
  }

  private calculateCorrelation(normalizedSignal: NormalizedSignal): number {
    // Calculate correlation with other signals of same type
    // This would require access to historical signal data
    // For now, return a placeholder
    return 0;
  }

  private calculateTrend(normalizedSignal: NormalizedSignal): number {
    const values = Object.values(normalizedSignal.normalizedValues);

    // Simple linear trend calculation
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const xMean = stats.mean(x);
    const yMean = stats.mean(values);

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);

    if (denominator === 0) return 0;

    const slope = numerator / denominator;

    // Normalize slope to -1 to 1 range
    return Math.max(-1, Math.min(1, slope * 100));
  }

  private calculateCompositeScore(features: Record<string, number>): number {
    // Weighted combination of key features
    const weights = {
      magnitude: 0.3,
      volatility: 0.2,
      momentum: 0.2,
      trend: 0.1,
      correlation: 0.1,
      anomalyScore: 0.1
    };

    let score = 0;
    let totalWeight = 0;

    for (const [feature, weight] of Object.entries(weights)) {
      if (features[feature] !== undefined) {
        score += features[feature] * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private calculateAnomalyScore(features: Record<string, number>): number {
    // Anomaly score based on statistical outliers
    const zScores = Object.values(features).map(val =>
      Math.abs(val) > this.config.correlationThreshold ? 1 : 0
    );

    return stats.mean(zScores);
  }

  private calculateImpactScore(normalizedSignal: NormalizedSignal): number {
    // Calculate potential market impact
    const confidence = normalizedSignal.metadata.confidence;
    const magnitude = Math.abs(normalizedSignal.normalizedValues.compositeScore || 0);

    // Higher confidence and magnitude = higher impact
    return Math.min(1, confidence * magnitude);
  }

  private createFeatureVector(features: Record<string, number>, normalizedSignal: NormalizedSignal): FeatureVector {
    return {
      timestamp: normalizedSignal.timestamp.getTime(),
      timeOfDay: normalizedSignal.timestamp.getHours(),
      dayOfWeek: normalizedSignal.timestamp.getDay(),

      // Signal characteristics
      magnitude: features.compositeScore || features.magnitude || 0,
      duration: features.duration || 1,
      frequency: features.frequency || 1,

      // Statistical features
      mean: features.mean || 0,
      std: features.std || 1,
      skewness: features.skewness || 0,
      kurtosis: features.kurtosis || 0,
      min: features.min || 0,
      max: features.max || 0,
      range: features.range || 0,

      // Domain-specific features
      volatility: features.volatility || 0,
      momentum: features.momentum || 0,
      correlation: features.correlation || 0,
      trend: features.trend || 0,

      // Composite features
      compositeScore: features.compositeScore || 0,
      anomalyScore: features.anomalyScore || 0,
      impactScore: features.impactScore || 0
    };
  }

  getStatus(): string {
    return this.isInitialized ? 'Ready' : 'Not Initialized';
  }
}
