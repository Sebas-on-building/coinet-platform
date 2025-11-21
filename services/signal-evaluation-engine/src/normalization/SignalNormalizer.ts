/**
 * =========================================
 * SIGNAL NORMALIZER
 * =========================================
 * Z-score normalization for signal features
 */

import * as stats from 'simple-statistics';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type { RawSignal, NormalizedSignal, NormalizationConfig } from '../types';

export class SignalNormalizer extends EventEmitter {
  private logger: Logger;
  private config: NormalizationConfig;
  private isInitialized: boolean = false;

  // Normalization parameters storage
  private featureStats: Map<string, {
    mean: number;
    std: number;
    count: number;
    lastUpdated: Date;
  }> = new Map();

  // Signal type specific normalization
  private typeNormalizers: Map<string, Map<string, any>> = new Map();

  constructor(config: NormalizationConfig) {
    super();
    this.logger = new Logger('SignalNormalizer');
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Signal Normalizer...');

      // Initialize normalization parameters
      this.featureStats.clear();
      this.typeNormalizers.clear();

      this.isInitialized = true;
      this.logger.info('✅ Signal Normalizer initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Signal Normalizer', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.featureStats.clear();
      this.typeNormalizers.clear();
      this.isInitialized = false;
      this.logger.info('✅ Signal Normalizer stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Signal Normalizer', error);
      throw error;
    }
  }

  async normalize(rawSignal: RawSignal): Promise<NormalizedSignal> {
    if (!this.isInitialized) {
      throw new Error('Signal Normalizer is not initialized');
    }

    try {
      const startTime = Date.now();

      // Extract features from raw signal
      const features = this.extractFeatures(rawSignal);

      // Get or create normalizer for this signal type
      const typeKey = `${rawSignal.type}_${rawSignal.source}`;
      if (!this.typeNormalizers.has(typeKey)) {
        this.typeNormalizers.set(typeKey, new Map());
      }
      const typeNormalizer = this.typeNormalizers.get(typeKey)!;

      // Normalize each feature
      const normalizedValues: Record<string, number> = {};
      const originalValues: Record<string, number> = {};

      for (const [featureName, featureValue] of Object.entries(features)) {
        const normalized = this.normalizeFeature(featureName, featureValue, typeNormalizer);
        normalizedValues[featureName] = normalized;
        originalValues[featureName] = featureValue;
      }

      // Create normalized signal
      const normalizedSignal: NormalizedSignal = {
        id: rawSignal.id,
        type: rawSignal.type,
        source: rawSignal.source,
        timestamp: rawSignal.timestamp,
        normalizedValues,
        originalValues,
        metadata: {
          ...rawSignal.metadata,
          normalizationMethod: this.config.method,
          featureExtractionMethod: 'signal_normalizer'
        }
      };

      this.logger.processing('signal_normalization', Date.now() - startTime, Object.keys(features).length);

      // Emit normalized signal event
      this.emit('normalized', normalizedSignal);

      return normalizedSignal;

    } catch (error: any) {
      this.logger.error('Failed to normalize signal', {
        signal_id: rawSignal.id,
        error: error.message
      });
      throw error;
    }
  }

  private extractFeatures(rawSignal: RawSignal): Record<string, number> {
    const features: Record<string, number> = {};

    let extractedFeatures: Record<string, number> = {
      timestamp: rawSignal.timestamp.getTime(),
      confidence: rawSignal.metadata.confidence,
      compositeScore: rawSignal.metadata.confidence
    };

    try {
      // Basic signal features
      extractedFeatures.timestamp = rawSignal.timestamp.getTime();
      extractedFeatures.confidence = rawSignal.metadata.confidence;

      // Extract features based on signal type
      switch (rawSignal.type) {
        case 'social_media':
          extractedFeatures = { ...extractedFeatures, ...this.extractSocialMediaFeatures(rawSignal) };
          break;
        case 'news':
          extractedFeatures = { ...extractedFeatures, ...this.extractNewsFeatures(rawSignal) };
          break;
        case 'defi_metrics':
          extractedFeatures = { ...extractedFeatures, ...this.extractDeFiFeatures(rawSignal) };
          break;
        case 'on_chain':
          extractedFeatures = { ...extractedFeatures, ...this.extractOnChainFeatures(rawSignal) };
          break;
        case 'price':
          extractedFeatures = { ...extractedFeatures, ...this.extractPriceFeatures(rawSignal) };
          break;
        case 'volume':
          extractedFeatures = { ...extractedFeatures, ...this.extractVolumeFeatures(rawSignal) };
          break;
        default:
          extractedFeatures.compositeScore = rawSignal.metadata.confidence;
      }

    } catch (error: any) {
      this.logger.error('Failed to extract features', {
        signal_id: rawSignal.id,
        error: error.message
      });
      // Return basic features on error
      extractedFeatures = {
        timestamp: rawSignal.timestamp.getTime(),
        confidence: rawSignal.metadata.confidence,
        compositeScore: rawSignal.metadata.confidence
      };
    }

    return extractedFeatures;
  }

  private extractSocialMediaFeatures(signal: RawSignal): Record<string, number> {
    const data = signal.data as any;
    return {
      sentimentScore: data.sentiment?.score || 0,
      engagementRate: this.calculateEngagementRate(data),
      followerCount: data.author?.followers || 0,
      postLength: data.content?.length || 0,
      hashtagCount: (data.hashtags || []).length,
      mentionCount: (data.mentions || []).length
    };
  }

  private extractNewsFeatures(signal: RawSignal): Record<string, number> {
    const data = signal.data as any;
    return {
      sentimentScore: data.sentiment?.score || 0,
      articleLength: data.content?.length || 0,
      classificationConfidence: data.confidence || 0,
      tokenCount: (data.keyFacts?.tokens || []).length,
      companyCount: (data.keyFacts?.companies || []).length,
      urgencyScore: this.getUrgencyScore(data)
    };
  }

  private extractDeFiFeatures(signal: RawSignal): Record<string, number> {
    const data = signal.data as any;
    return {
      tvlValue: data.totalValueLocked || 0,
      yieldApy: data.apy || 0,
      lendingRate: data.supplyApy || data.borrowApy || 0,
      liquidityValue: data.reserve0 + data.reserve1 || 0,
      volatilityScore: data.marketImpact?.volatility || 0
    };
  }

  private extractOnChainFeatures(signal: RawSignal): Record<string, number> {
    const data = signal.data as any;
    return {
      transactionCount: data.transactions || 0,
      gasPrice: data.gasPrice || 0,
      gasUsed: data.gasUsed || 0,
      blockNumber: data.blockNumber || 0,
      valueTransferred: data.value || 0
    };
  }

  private extractPriceFeatures(signal: RawSignal): Record<string, number> {
    const data = signal.data as any;
    return {
      price: data.price || 0,
      priceChange: data.priceChange24h || 0,
      volume: data.volume24h || 0,
      marketCap: data.marketCap || 0,
      volatility: data.volatility || 0
    };
  }

  private extractVolumeFeatures(signal: RawSignal): Record<string, number> {
    const data = signal.data as any;
    return {
      volume: data.volume || 0,
      volumeChange: data.volumeChange24h || 0,
      trades: data.trades || 0,
      volumeRatio: data.volumeRatio || 0
    };
  }

  private calculateEngagementRate(data: any): number {
    const likes = data.engagement?.likes || 0;
    const retweets = data.engagement?.retweets || 0;
    const replies = data.engagement?.replies || 0;
    const followers = data.author?.followers || 1;

    return (likes + retweets + replies) / followers;
  }

  private getUrgencyScore(data: any): number {
    const urgencyMap: Record<string, number> = {
      'low': 0.2,
      'medium': 0.5,
      'high': 0.8,
      'critical': 1.0
    };

    return urgencyMap[data.urgency] || 0.5;
  }

  private normalizeFeature(featureName: string, value: number, typeNormalizer: Map<string, any>): number {
    // Update rolling statistics for this feature
    if (!typeNormalizer.has(featureName)) {
      typeNormalizer.set(featureName, {
        values: [],
        mean: value,
        std: 1,
        count: 1,
        lastUpdated: new Date()
      });
    }

    const stats = typeNormalizer.get(featureName);

    // Add new value to rolling window
    stats.values.push(value);
    if (stats.values.length > this.config.windowSize) {
      stats.values.shift(); // Remove oldest value
    }

    // Update statistics
    stats.mean = stats.values.reduce((sum: number, val: number) => sum + val, 0) / stats.values.length;
    stats.std = Math.sqrt(
      stats.values.reduce((sum: number, val: number) => sum + Math.pow(val - stats.mean, 2), 0) / stats.values.length
    );
    stats.count++;
    stats.lastUpdated = new Date();

    // Apply z-score normalization
    if (stats.std === 0) {
      return 0; // Avoid division by zero
    }

    const zScore = (value - stats.mean) / stats.std;

    // Cap extreme outliers
    return Math.max(-this.config.outlierThreshold, Math.min(this.config.outlierThreshold, zScore));
  }

  private createFeatureVector(normalizedValues: Record<string, number>, rawSignal: RawSignal): any {
    // Create comprehensive feature vector
    return {
      timestamp: normalizedValues.timestamp || rawSignal.timestamp.getTime(),
      timeOfDay: rawSignal.timestamp.getHours(),
      dayOfWeek: rawSignal.timestamp.getDay(),

      // Signal characteristics
      magnitude: normalizedValues.compositeScore || normalizedValues.confidence || 0,
      duration: 1, // Default duration
      frequency: 1, // Default frequency

      // Statistical features
      mean: normalizedValues.mean || 0,
      std: normalizedValues.std || 1,
      skewness: 0, // Would be calculated from distribution
      kurtosis: 0, // Would be calculated from distribution
      min: normalizedValues.min || 0,
      max: normalizedValues.max || 0,
      range: normalizedValues.range || 0,

      // Domain-specific features
      volatility: normalizedValues.volatility || 0,
      momentum: normalizedValues.momentum || 0,
      correlation: normalizedValues.correlation || 0,
      trend: normalizedValues.trend || 0,

      // Composite features
      compositeScore: normalizedValues.compositeScore || normalizedValues.confidence || 0,
      anomalyScore: normalizedValues.anomalyScore || 0,
      impactScore: normalizedValues.impactScore || 0
    };
  }

  getStatus(): string {
    return this.isInitialized ? 'Ready' : 'Not Initialized';
  }
}
