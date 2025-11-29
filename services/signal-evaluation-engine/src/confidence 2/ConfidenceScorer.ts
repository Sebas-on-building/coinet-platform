/**
 * =========================================
 * CONFIDENCE SCORING ENGINE
 * =========================================
 * Advanced signal confidence scoring with multiple factors,
 * normalization, time decay, and market regime awareness
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  NormalizedSignal,
  SignalType
} from '../types';
import type {
  ConfidenceScore,
  ConfidenceFactors,
  ConfidenceConfig,
  SignalTypeWeights,
  SourceReliability,
  MarketRegime,
  HistoricalAccuracy,
  ConsistencyMetrics,
  ConfidenceRequest,
  ConfidenceResponse,
  BacktestingResult
} from './types';
import type { SignalBaseline, AnomalyDetection } from '../alerts/types';

export class ConfidenceScorer extends EventEmitter {
  private logger: Logger;
  private config: ConfidenceConfig;
  private isInitialized: boolean = false;

  // Data storage
  private sourceReliability: Map<string, SourceReliability> = new Map();
  private historicalAccuracy: Map<SignalType, HistoricalAccuracy> = new Map();
  private consistencyMetrics: Map<SignalType, ConsistencyMetrics> = new Map();
  private currentMarketRegime: MarketRegime | null = null;
  private recentSignals: Map<SignalType, NormalizedSignal[]> = new Map();

  // Baseline integration
  private baselineEngine?: any; // Reference to baseline engine
  private recentAnomalies: Map<string, AnomalyDetection[]> = new Map(); // signalType -> anomalies

  // Cache for performance
  private confidenceCache: Map<string, { score: ConfidenceScore; expires: number }> = new Map();
  private cacheTtl = 5 * 60 * 1000; // 5 minutes

  // Normalization statistics
  private normalizationStats: {
    factorMeans: Record<keyof ConfidenceFactors, number>;
    factorStdDevs: Record<keyof ConfidenceFactors, number>;
    lastUpdated: Date;
  } = {
    factorMeans: {
      dataFreshness: 0.5,
      sourceReliability: 0.5,
      historicalAccuracy: 0.5,
      signalConsistency: 0.5,
      marketRegimeFit: 0.5,
      signalStrength: 0.5
    },
    factorStdDevs: {
      dataFreshness: 0.3,
      sourceReliability: 0.3,
      historicalAccuracy: 0.3,
      signalConsistency: 0.3,
      marketRegimeFit: 0.3,
      signalStrength: 0.3
    },
    lastUpdated: new Date()
  };

  constructor(config: ConfidenceConfig) {
    super();
    this.logger = new Logger('ConfidenceScorer');
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Confidence Scorer...');

      // Load historical data if available
      await this.loadHistoricalData();

      // Detect initial market regime
      await this.detectMarketRegime();

      this.isInitialized = true;
      this.logger.info('✅ Confidence Scorer initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Confidence Scorer', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Save historical data
      await this.saveHistoricalData();

      // Clear caches and storage
      this.confidenceCache.clear();
      this.sourceReliability.clear();
      this.historicalAccuracy.clear();
      this.consistencyMetrics.clear();
      this.recentSignals.clear();

      this.isInitialized = false;
      this.logger.info('✅ Confidence Scorer stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Confidence Scorer', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for a signal
   */
  async calculateConfidence(request: ConfidenceRequest): Promise<ConfidenceResponse> {
    if (!this.isInitialized) {
      throw new Error('Confidence Scorer is not initialized');
    }

    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);

    // Check cache first
    const cached = this.confidenceCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return {
        request,
        score: cached.score,
        calculationTime: Date.now() - startTime,
        cached: true
      };
    }

    try {
      // Calculate individual factors
      const factors = await this.calculateConfidenceFactors(request);

      // Normalize factors
      const normalizedFactors = this.normalizeFactors(factors);

      // Calculate weighted overall score
      const overallScore = this.calculateOverallScore(normalizedFactors);

      const score: ConfidenceScore = {
        signalId: request.signalId,
        signalType: request.signalType,
        overallScore,
        factors: normalizedFactors,
        timestamp: new Date(),
        metadata: {
          calculationMethod: 'weighted_average',
          normalizationType: this.config.normalizationType,
          timeDecayApplied: this.config.timeDecay.enabled,
          weightsUsed: this.config.signalTypeWeights
        }
      };

      // Cache the result
      this.confidenceCache.set(cacheKey, {
        score,
        expires: Date.now() + this.cacheTtl
      });

      // Clean old cache entries
      this.cleanCache();

      this.logger.debug('Confidence calculated', {
        signal_id: request.signalId,
        score: overallScore,
        factors: normalizedFactors
      });

      return {
        request,
        score,
        calculationTime: Date.now() - startTime,
        cached: false
      };

    } catch (error: any) {
      this.logger.error('Failed to calculate confidence', {
        signal_id: request.signalId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate individual confidence factors
   */
  private async calculateConfidenceFactors(request: ConfidenceRequest): Promise<ConfidenceFactors> {
    const factors: ConfidenceFactors = {
      dataFreshness: 0,
      sourceReliability: 0,
      historicalAccuracy: 0,
      signalConsistency: 0,
      marketRegimeFit: 0,
      signalStrength: 0
    };

    // Data freshness (0-1, 1 = very fresh)
    factors.dataFreshness = this.calculateDataFreshness(request.timestamp);

    // Source reliability (0-1, 1 = very reliable)
    if (request.context?.sourceId) {
      factors.sourceReliability = this.getSourceReliability(request.context.sourceId);
    } else {
      factors.sourceReliability = 0.5; // Default for unknown sources
    }

    // Historical accuracy (0-1, 1 = historically accurate)
    factors.historicalAccuracy = this.getHistoricalAccuracy(request.signalType);

    // Signal consistency (0-1, 1 = very consistent)
    factors.signalConsistency = this.calculateSignalConsistency(request.signalType);

    // Market regime fit (0-1, 1 = perfect fit)
    factors.marketRegimeFit = this.calculateMarketRegimeFit(request.signalType);

    // Signal strength (0-1, 1 = very strong)
    factors.signalStrength = this.calculateSignalStrength(request);

    // Add baseline-aware factors if baseline engine is available
    if (this.baselineEngine) {
      const baselineFactors = await this.calculateBaselineFactors(request);
      Object.assign(factors, baselineFactors);
    }

    return factors;
  }

  /**
   * Calculate data freshness factor
   */
  private calculateDataFreshness(timestamp: Date): number {
    if (!this.config.timeDecay.enabled) {
      return 1.0;
    }

    const ageMinutes = (Date.now() - timestamp.getTime()) / (1000 * 60);
    const halfLife = this.config.timeDecay.halfLifeMinutes;
    const maxAge = this.config.timeDecay.maxAgeMinutes;

    if (ageMinutes >= maxAge) {
      return 0.0;
    }

    // Exponential decay: freshness = e^(-age/halfLife)
    const freshness = Math.exp(-ageMinutes / halfLife);

    return Math.max(0, Math.min(1, freshness));
  }

  /**
   * Get source reliability score
   */
  private getSourceReliability(sourceId: string): number {
    const reliability = this.sourceReliability.get(sourceId);
    return reliability?.reliabilityScore || 0.5;
  }

  /**
   * Get historical accuracy for signal type
   */
  private getHistoricalAccuracy(signalType: SignalType): number {
    const accuracy = this.historicalAccuracy.get(signalType);
    return accuracy?.accuracyScore || 0.5;
  }

  /**
   * Calculate signal consistency with recent signals
   */
  private calculateSignalConsistency(signalType: SignalType): number {
    const metrics = this.consistencyMetrics.get(signalType);
    return metrics?.consistencyScore || 0.5;
  }

  /**
   * Calculate market regime appropriateness
   */
  private calculateMarketRegimeFit(signalType: SignalType): number {
    if (!this.currentMarketRegime) {
      return 0.5; // Neutral if no regime detected
    }

    // Different signal types are more/less appropriate in different regimes
    const regimeFit = this.calculateRegimeFit(signalType, this.currentMarketRegime);

    return regimeFit;
  }

  /**
   * Calculate baseline-aware confidence factors
   */
  private async calculateBaselineFactors(request: ConfidenceRequest): Promise<Partial<ConfidenceFactors>> {
    const baselineFactors: Partial<ConfidenceFactors> = {};

    try {
      // Get baseline for this signal type
      const baseline = this.baselineEngine.getBaseline(request.signalType);

      if (baseline) {
        // Baseline stability factor (0-1, 1 = very stable baseline)
        baselineFactors.dataFreshness = (baselineFactors.dataFreshness || 0) * this.calculateBaselineStability(baseline);

        // Regime appropriateness factor
        const currentRegime = this.baselineEngine.getCurrentRegime(request.signalType);
        if (currentRegime) {
          baselineFactors.marketRegimeFit = (baselineFactors.marketRegimeFit || 0) * currentRegime.confidence;
        }

        // Anomaly impact factor (reduce confidence if recent anomalies)
        const recentAnomalies = this.recentAnomalies.get(request.signalType) || [];
        const anomalyImpact = this.calculateAnomalyImpact(recentAnomalies);
        baselineFactors.signalStrength = (baselineFactors.signalStrength || 0) * (1 - anomalyImpact);
      }

    } catch (error: any) {
      this.logger.warn('Failed to calculate baseline factors', {
        signal_type: request.signalType,
        error: error.message
      });
    }

    return baselineFactors;
  }

  /**
   * Calculate baseline stability based on how consistent the baseline is
   */
  private calculateBaselineStability(baseline: SignalBaseline): number {
    const stats = baseline.overallBaseline;
    const coefficientOfVariation = stats.standardDeviation / (stats.mean || 1);

    // Lower coefficient of variation means more stable baseline
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Calculate impact of recent anomalies on confidence
   */
  private calculateAnomalyImpact(anomalies: AnomalyDetection[]): number {
    if (anomalies.length === 0) return 0;

    // Average severity of recent anomalies
    const avgSeverity = anomalies.reduce((sum, anomaly) => {
      const severityScore = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 }[anomaly.severity];
      return sum + severityScore;
    }, 0) / anomalies.length;

    // Weight by recency (more recent anomalies have higher impact)
    const weightedImpact = avgSeverity * Math.min(anomalies.length / 10, 1.0);

    return Math.min(weightedImpact, 0.5); // Cap at 50% confidence reduction
  }

  /**
   * Calculate inherent signal strength
   */
  private calculateSignalStrength(request: ConfidenceRequest): number {
    // This would analyze the signal's inherent characteristics
    // For now, return a placeholder based on signal type
    const typeStrengths: Record<SignalType, number> = {
      price: 0.9,        // Price signals are generally strong
      volume: 0.8,       // Volume signals are reliable
      on_chain: 0.7,     // On-chain data is generally trustworthy
      technical: 0.8,    // Technical indicators have good track record
      defi_metrics: 0.7, // DeFi metrics are emerging but promising
      social_media: 0.4, // Social media is noisy but can be valuable
      news: 0.6,         // News can be informative but requires verification
      fundamental: 0.8    // Fundamental analysis is generally solid
    };

    return typeStrengths[request.signalType] || 0.5;
  }

  /**
   * Calculate how well a signal type fits the current market regime
   */
  private calculateRegimeFit(signalType: SignalType, regime: MarketRegime): number {
    // Define which signal types work best in which regimes
    const regimePreferences: Record<string, Record<SignalType, number>> = {
      'high_volatility_bull': {
        price: 0.9, volume: 0.8, technical: 0.9, on_chain: 0.7,
        defi_metrics: 0.6, social_media: 0.3, news: 0.5, fundamental: 0.8
      },
      'high_volatility_bear': {
        price: 0.9, volume: 0.8, technical: 0.9, on_chain: 0.8,
        defi_metrics: 0.7, social_media: 0.4, news: 0.6, fundamental: 0.9
      },
      'low_volatility_bull': {
        price: 0.7, volume: 0.6, technical: 0.7, on_chain: 0.8,
        defi_metrics: 0.8, social_media: 0.5, news: 0.6, fundamental: 0.9
      },
      'low_volatility_bear': {
        price: 0.8, volume: 0.7, technical: 0.8, on_chain: 0.9,
        defi_metrics: 0.9, social_media: 0.3, news: 0.5, fundamental: 0.9
      },
      'sideways': {
        price: 0.6, volume: 0.5, technical: 0.6, on_chain: 0.7,
        defi_metrics: 0.7, social_media: 0.4, news: 0.4, fundamental: 0.7
      }
    };

    const regimeKey = `${regime.characteristics.volatility}_${regime.characteristics.trend}`;
    const preferences = regimePreferences[regimeKey] || regimePreferences.sideways;

    return preferences[signalType] || 0.5;
  }

  /**
   * Normalize factors using z-score or min-max scaling
   */
  private normalizeFactors(factors: ConfidenceFactors): ConfidenceFactors {
    const normalized: ConfidenceFactors = { ...factors };

    if (this.config.normalizationType === 'z_score') {
      // Z-score normalization
      for (const [key, value] of Object.entries(factors)) {
        const factorKey = key as keyof ConfidenceFactors;
        const mean = this.normalizationStats.factorMeans[factorKey];
        const stdDev = this.normalizationStats.factorStdDevs[factorKey];

        if (stdDev > 0) {
          const zScore = (value - mean) / stdDev;
          // Convert to 0-1 range using sigmoid-like function
          normalized[factorKey] = 1 / (1 + Math.exp(-zScore));
        } else {
          normalized[factorKey] = value > mean ? 1 : 0;
        }
      }
    } else {
      // Min-max normalization (already in 0-1 range, so just clamp)
      for (const key of Object.keys(factors)) {
        const factorKey = key as keyof ConfidenceFactors;
        normalized[factorKey] = Math.max(0, Math.min(1, factors[factorKey]));
      }
    }

    return normalized;
  }

  /**
   * Calculate weighted overall confidence score
   */
  private calculateOverallScore(factors: ConfidenceFactors): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(this.config.factorWeights)) {
      const factorKey = factor as keyof ConfidenceFactors;
      const factorValue = factors[factorKey];
      const factorWeight = weight as number;

      weightedSum += factorValue * factorWeight;
      totalWeight += factorWeight;
    }

    if (totalWeight === 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, weightedSum / totalWeight));
  }

  /**
   * Update source reliability based on signal outcomes
   */
  updateSourceReliability(sourceId: string, signalType: SignalType, wasAccurate: boolean): void {
    let reliability = this.sourceReliability.get(sourceId);

    if (!reliability) {
      reliability = {
        sourceId,
        reliabilityScore: 0.5,
        totalSignals: 0,
        accurateSignals: 0,
        lastUpdated: new Date(),
        historicalPerformance: {
          accuracyByMarketRegime: {},
          accuracyBySignalType: {} as Record<SignalType, number>
        }
      };
      this.sourceReliability.set(sourceId, reliability);
    }

    reliability.totalSignals++;
    if (wasAccurate) {
      reliability.accurateSignals++;
    }

    // Update accuracy score (exponential moving average)
    const accuracyRate = reliability.accurateSignals / reliability.totalSignals;
    reliability.reliabilityScore = accuracyRate;

    // Update by signal type
    const typeAccuracy = reliability.historicalPerformance.accuracyBySignalType[signalType] || 0;
    const typeCount = Object.values(reliability.historicalPerformance.accuracyBySignalType).length;
    reliability.historicalPerformance.accuracyBySignalType[signalType] =
      (typeAccuracy * typeCount + (wasAccurate ? 1 : 0)) / (typeCount + 1);

    reliability.lastUpdated = new Date();

    this.logger.debug('Source reliability updated', {
      source_id: sourceId,
      accuracy_rate: accuracyRate,
      total_signals: reliability.totalSignals
    });
  }

  /**
   * Update historical accuracy for signal type
   */
  updateHistoricalAccuracy(signalType: SignalType, wasAccurate: boolean): void {
    let accuracy = this.historicalAccuracy.get(signalType);

    if (!accuracy) {
      accuracy = {
        signalType,
        accuracyScore: 0.5,
        totalPredictions: 0,
        correctPredictions: 0,
        byMarketRegime: {},
        lastUpdated: new Date(),
        trend: 'stable'
      };
      this.historicalAccuracy.set(signalType, accuracy);
    }

    accuracy.totalPredictions++;
    if (wasAccurate) {
      accuracy.correctPredictions++;
    }

    // Update accuracy score
    const accuracyRate = accuracy.correctPredictions / accuracy.totalPredictions;
    accuracy.accuracyScore = accuracyRate;

    // Update regime-specific accuracy
    if (this.currentMarketRegime) {
      const regimeAccuracy = accuracy.byMarketRegime[this.currentMarketRegime.id] || 0;
      const regimeCount = Object.keys(accuracy.byMarketRegime).length;
      accuracy.byMarketRegime[this.currentMarketRegime.id] =
        (regimeAccuracy * regimeCount + (wasAccurate ? 1 : 0)) / (regimeCount + 1);
    }

    accuracy.lastUpdated = new Date();

    this.logger.debug('Historical accuracy updated', {
      signal_type: signalType,
      accuracy_rate: accuracyRate,
      total_predictions: accuracy.totalPredictions
    });
  }

  /**
   * Add signal to recent signals for consistency calculation
   */
  addRecentSignal(signal: NormalizedSignal): void {
    if (!this.recentSignals.has(signal.type)) {
      this.recentSignals.set(signal.type, []);
    }

    const signals = this.recentSignals.get(signal.type)!;
    signals.push(signal);

    // Keep only recent signals (last 24 hours)
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    this.recentSignals.set(signal.type, signals.filter(s =>
      s.timestamp.getTime() > cutoffTime
    ));

    // Recalculate consistency metrics
    this.updateConsistencyMetrics(signal.type);
  }

  /**
   * Update consistency metrics for signal type
   */
  private updateConsistencyMetrics(signalType: SignalType): void {
    const signals = this.recentSignals.get(signalType) || [];

    if (signals.length < 3) {
      return; // Need at least 3 signals for meaningful consistency
    }

    // Calculate consistency based on signal values
    const recentValues = signals.slice(-10).map(s => {
      // Extract a representative value from normalized values
      const values = Object.values(s.normalizedValues);
      return values.length > 0 ? values[0] as number : 0;
    });

    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    const stdDev = Math.sqrt(variance);

    // Consistency is inverse of standard deviation (normalized)
    const consistencyScore = Math.max(0, Math.min(1, 1 - (stdDev / 2))); // Normalize to 0-1

    const metrics: ConsistencyMetrics = {
      signalType,
      consistencyScore,
      recentSignals: signals.length,
      standardDeviation: stdDev,
      lastUpdated: new Date()
    };

    this.consistencyMetrics.set(signalType, metrics);

    this.logger.debug('Consistency metrics updated', {
      signal_type: signalType,
      consistency_score: consistencyScore,
      recent_signals: signals.length,
      std_dev: stdDev
    });
  }

  /**
   * Detect current market regime
   */
  private async detectMarketRegime(): Promise<void> {
    // This would analyze recent market data to detect regime
    // For now, create a placeholder regime
    this.currentMarketRegime = {
      id: 'current_regime',
      name: 'Current Market Regime',
      characteristics: {
        volatility: 'medium',
        trend: 'sideways',
        volume: 'medium',
        sentiment: 'neutral'
      },
      confidence: 0.7,
      startTime: new Date(),
      duration: 0
    };
  }

  /**
   * Perform backtesting to calibrate weights
   */
  async performBacktesting(startDate: Date, endDate: Date): Promise<BacktestingResult> {
    this.logger.info('Starting backtesting for confidence scoring calibration...');

    // This would load historical signal data and outcomes
    // For now, return a placeholder result
    const result: BacktestingResult = {
      config: this.config,
      period: { start: startDate, end: endDate },
      metrics: {
        totalSignals: 1000,
        avgConfidence: 0.65,
        accuracy: 0.72,
        calibrationScore: 0.68
      },
      recommendations: {
        optimalWeights: {
          market: 0.4,
          onChain: 0.35,
          social: 0.25
        },
        factorImportance: {
          dataFreshness: 0.15,
          sourceReliability: 0.25,
          historicalAccuracy: 0.20,
          signalConsistency: 0.15,
          marketRegimeFit: 0.15,
          signalStrength: 0.10
        },
        confidence: 0.75
      }
    };

    this.logger.info('Backtesting completed', result.metrics);
    return result;
  }

  /**
   * Update configuration with backtesting results
   */
  updateConfigWithBacktesting(results: BacktestingResult): void {
    if (results.recommendations.confidence > 0.6) {
      this.config.signalTypeWeights = results.recommendations.optimalWeights;

      // Update factor weights
      for (const [factor, importance] of Object.entries(results.recommendations.factorImportance)) {
        const factorKey = factor as keyof ConfidenceFactors;
        this.config.factorWeights[factorKey] = importance;
      }

      this.logger.info('Configuration updated with backtesting results', {
        signal_type_weights: this.config.signalTypeWeights,
        factor_weights: this.config.factorWeights
      });
    }
  }

  /**
   * Get cache key for confidence calculation
   */
  private getCacheKey(request: ConfidenceRequest): string {
    return `${request.signalId}_${request.signalType}_${request.timestamp.getTime()}`;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.confidenceCache.entries()) {
      if (cached.expires <= now) {
        this.confidenceCache.delete(key);
      }
    }
  }

  /**
   * Load historical data from storage
   */
  private async loadHistoricalData(): Promise<void> {
    // Implementation would load from database or file
    this.logger.debug('Historical data loaded');
  }

  /**
   * Save historical data to storage
   */
  private async saveHistoricalData(): Promise<void> {
    // Implementation would save to database or file
    this.logger.debug('Historical data saved');
  }

  /**
   * Get current status
   */
  getStatus(): string {
    return this.isInitialized ?
      `Active (${this.sourceReliability.size} sources, ${this.historicalAccuracy.size} signal types)` :
      'Not Initialized';
  }

  /**
   * Update current market regime
   */
  updateMarketRegime(regime: MarketRegime): void {
    this.currentMarketRegime = regime;

    this.logger.debug('Market regime updated', {
      regime_id: regime.id,
      confidence: regime.confidence
    });
  }

  /**
   * Set baseline engine reference for integration
   */
  setBaselineEngine(baselineEngine: any): void {
    this.baselineEngine = baselineEngine;

    this.logger.info('Baseline engine integrated with confidence scorer');
  }

  /**
   * Update recent anomalies for confidence calculation
   */
  updateRecentAnomalies(signalType: string, anomalies: AnomalyDetection[]): void {
    this.recentAnomalies.set(signalType, anomalies.slice(-100)); // Keep last 100 anomalies

    this.logger.debug('Recent anomalies updated', {
      signal_type: signalType,
      anomaly_count: anomalies.length
    });
  }

  /**
   * Get configuration
   */
  getConfig(): ConfidenceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConfidenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated', newConfig);
  }
}
