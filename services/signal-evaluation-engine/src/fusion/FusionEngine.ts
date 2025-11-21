/**
 * =========================================
 * FUSION ENGINE
 * =========================================
 * Multi-signal fusion for comprehensive analysis
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import * as stats from 'simple-statistics';
import type {
  NormalizedSignal,
  FusionUpdate,
  FusionConfig,
  SignalType,
  FeatureVector
} from '../types';
import type {
  ConfidenceAPI,
  ConfidenceRequest,
  ConfidenceConfig
} from '../confidence';

export class FusionEngine extends EventEmitter {
  private logger: Logger;
  private config: FusionConfig;
  private isInitialized: boolean = false;

  // Signal storage for fusion
  private recentSignals: Map<string, NormalizedSignal> = new Map();
  private signalHistory: Map<string, NormalizedSignal[]> = new Map();
  private fusionState: {
    lastUpdate: Date;
    signalCount: number;
    avgConfidence: number;
    dominantTypes: SignalType[];
  } = {
    lastUpdate: new Date(),
    signalCount: 0,
    avgConfidence: 0,
    dominantTypes: []
  };

  // Confidence scoring integration
  private confidenceAPI?: ConfidenceAPI;
  private confidenceConfig?: ConfidenceConfig;

  constructor(config: FusionConfig) {
    super();
    this.logger = new Logger('FusionEngine');
    this.config = config;
  }

  /**
   * Set confidence scoring API for enhanced fusion
   */
  setConfidenceAPI(confidenceAPI: ConfidenceAPI, confidenceConfig: ConfidenceConfig): void {
    this.confidenceAPI = confidenceAPI;
    this.confidenceConfig = confidenceConfig;
    this.logger.info('Confidence API integrated with Fusion Engine');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Fusion Engine...');

      // Clear state
      this.recentSignals.clear();
      this.signalHistory.clear();

      this.isInitialized = true;
      this.logger.info('✅ Fusion Engine initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Fusion Engine', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.recentSignals.clear();
      this.signalHistory.clear();
      this.isInitialized = false;
      this.logger.info('✅ Fusion Engine stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Fusion Engine', error);
      throw error;
    }
  }

  async updateWithSignal(normalizedSignal: NormalizedSignal): Promise<void> {
    try {
      const signalKey = `${normalizedSignal.type}_${normalizedSignal.id}`;

      // Store signal
      this.recentSignals.set(signalKey, normalizedSignal);

      // Add to history
      if (!this.signalHistory.has(normalizedSignal.type)) {
        this.signalHistory.set(normalizedSignal.type, []);
      }
      const history = this.signalHistory.get(normalizedSignal.type)!;
      history.push(normalizedSignal);

      // Keep only recent signals
      if (history.length > this.config.maxSignals) {
        history.shift();
      }

      // Update fusion state
      this.updateFusionState();

      this.logger.debug('Signal added to fusion', {
        signal_id: normalizedSignal.id,
        signal_type: normalizedSignal.type,
        total_signals: this.recentSignals.size
      });

    } catch (error: any) {
      this.logger.error('Failed to update fusion with signal', {
        signal_id: normalizedSignal.id,
        error: error.message
      });
    }
  }

  async updateFusion(): Promise<FusionUpdate | null> {
    try {
      const now = new Date();
      const timeSinceLastUpdate = now.getTime() - this.fusionState.lastUpdate.getTime();

      // Only update if enough time has passed or we have enough signals
      if (timeSinceLastUpdate < this.config.updateInterval && this.recentSignals.size < this.config.minSignals) {
        return null;
      }

      // Get recent signals for fusion
      const signalsForFusion = this.getSignalsForFusion();

      if (signalsForFusion.length < this.config.minSignals) {
        this.logger.debug('Not enough signals for fusion update', {
          signal_count: signalsForFusion.length,
          min_required: this.config.minSignals
        });
        return null;
      }

      // Calculate aggregated features
      const aggregatedFeatures = this.calculateAggregatedFeatures(signalsForFusion);

      // Calculate fusion score (now async with confidence scoring)
      const fusionScore = await this.calculateFusionScore(signalsForFusion);

      // Calculate confidence
      const confidence = this.calculateFusionConfidence(signalsForFusion);

      // Generate recommendations
      const recommendations = this.generateRecommendations(fusionScore, aggregatedFeatures);

      const fusionUpdate: FusionUpdate = {
        id: `fusion_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: now,
        signals: signalsForFusion,
        aggregatedFeatures,
        fusionScore,
        confidence,
        recommendations
      };

      // Update fusion state
      this.fusionState.lastUpdate = now;
      this.fusionState.signalCount = signalsForFusion.length;
      this.fusionState.avgConfidence = confidence;

      // Update dominant types
      this.fusionState.dominantTypes = this.calculateDominantTypes(signalsForFusion);

      this.logger.fusion('Fusion updated', {
        fusion_score: fusionScore,
        signal_count: signalsForFusion.length,
        confidence: confidence,
        dominant_types: this.fusionState.dominantTypes
      });

      // Emit fusion update event
      this.emit('fusion_update', fusionUpdate);

      return fusionUpdate;

    } catch (error: any) {
      this.logger.error('Failed to update fusion', error);
      return null;
    }
  }

  private getSignalsForFusion(): NormalizedSignal[] {
    const signals: NormalizedSignal[] = [];

    // Get recent signals, applying exponential decay
    for (const signal of this.recentSignals.values()) {
      const age = Date.now() - signal.timestamp.getTime();
      const decayFactor = Math.pow(this.config.decayFactor, age / 60000); // Decay per minute

      // Apply decay to confidence
      const decayedConfidence = signal.metadata.confidence * decayFactor;

      if (decayedConfidence > this.config.confidenceThreshold && signal.features !== undefined) {
        signals.push({
          ...signal,
          metadata: {
            ...signal.metadata,
            confidence: decayedConfidence
          }
        });
      }
    }

    // Sort by decayed confidence and limit to max signals
    return signals
      .sort((a, b) => b.metadata.confidence - a.metadata.confidence)
      .slice(0, this.config.maxSignals);
  }

  private calculateAggregatedFeatures(signals: NormalizedSignal[]): FeatureVector {
    const featureVectors = signals.map(s => s.features!).filter(f => f !== undefined);

    // Aggregate each feature type
    const magnitudes = featureVectors.map(f => f.magnitude).filter(v => v !== undefined);
    const durations = featureVectors.map(f => f.duration).filter(v => v !== undefined);
    const frequencies = featureVectors.map(f => f.frequency).filter(v => v !== undefined);
    const means = featureVectors.map(f => f.mean).filter(v => v !== undefined);
    const stds = featureVectors.map(f => f.std).filter(v => v !== undefined);
    const skewnessValues = featureVectors.map(f => f.skewness).filter(v => v !== undefined);
    const kurtosisValues = featureVectors.map(f => f.kurtosis).filter(v => v !== undefined);
    const mins = featureVectors.map(f => f.min).filter(v => v !== undefined);
    const maxs = featureVectors.map(f => f.max).filter(v => v !== undefined);
    const ranges = featureVectors.map(f => f.range).filter(v => v !== undefined);
    const volatilities = featureVectors.map(f => f.volatility).filter(v => v !== undefined);
    const momentums = featureVectors.map(f => f.momentum).filter(v => v !== undefined);
    const correlations = featureVectors.map(f => f.correlation).filter(v => v !== undefined);
    const trends = featureVectors.map(f => f.trend).filter(v => v !== undefined);
    const compositeScores = featureVectors.map(f => f.compositeScore).filter(v => v !== undefined);
    const anomalyScores = featureVectors.map(f => f.anomalyScore).filter(v => v !== undefined);
    const impactScores = featureVectors.map(f => f.impactScore).filter(v => v !== undefined);

    const aggregated: FeatureVector = {
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),

      // Signal characteristics
      magnitude: magnitudes.length > 0 ? stats.mean(magnitudes) : 0,
      duration: durations.length > 0 ? stats.mean(durations) : 0,
      frequency: frequencies.length > 0 ? stats.mean(frequencies) : 0,

      // Statistical features
      mean: means.length > 0 ? stats.mean(means) : 0,
      std: stds.length > 0 ? stats.mean(stds) : 0,
      skewness: skewnessValues.length > 0 ? stats.mean(skewnessValues) : 0,
      kurtosis: kurtosisValues.length > 0 ? stats.mean(kurtosisValues) : 0,
      min: mins.length > 0 ? Math.min(...mins) : 0,
      max: maxs.length > 0 ? Math.max(...maxs) : 0,
      range: ranges.length > 0 ? Math.max(...ranges) : 0,

      // Domain-specific features
      volatility: volatilities.length > 0 ? stats.mean(volatilities) : 0,
      momentum: momentums.length > 0 ? stats.mean(momentums) : 0,
      correlation: correlations.length > 0 ? stats.mean(correlations) : 0,
      trend: trends.length > 0 ? stats.mean(trends) : 0,

      // Composite features
      compositeScore: compositeScores.length > 0 ? stats.mean(compositeScores) : 0,
      anomalyScore: anomalyScores.length > 0 ? stats.mean(anomalyScores) : 0,
      impactScore: impactScores.length > 0 ? stats.mean(impactScores) : 0
    };

    return aggregated;
  }

  private async calculateFusionScore(signals: NormalizedSignal[]): Promise<number> {
    if (signals.length === 0) return 0;

    // Enhanced fusion with confidence scoring if available
    if (this.confidenceAPI && this.confidenceConfig) {
      return await this.calculateEnhancedFusionScore(signals);
    }

    // Fallback to original weighted average
    let weightedSum = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const typeWeight = this.config.signalWeights[signal.type] || 0.1;
      const confidenceWeight = signal.metadata.confidence;
      const weight = typeWeight * confidenceWeight;

      weightedSum += (signal.features?.compositeScore || 0) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private async calculateEnhancedFusionScore(signals: NormalizedSignal[]): Promise<number> {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      let finalWeight = 0;

      try {
        // Get confidence score for this signal
        const confidenceRequest: ConfidenceRequest = {
          signalId: signal.id,
          signalType: signal.type,
          timestamp: signal.timestamp,
          context: {
            sourceId: signal.source
          }
        };

        const confidenceResponse = await this.confidenceAPI!.calculateConfidence(confidenceRequest);
        const confidenceScore = confidenceResponse.score.overallScore;

        // Calculate enhanced weight using confidence scoring
        const typeWeight = this.confidenceConfig!.signalTypeWeights[
          this.mapSignalTypeToCategory(signal.type)
        ] || 0.33;

        // Apply signal type weights from confidence config
        const baseWeight = typeWeight * confidenceScore;

        // Add signal to recent signals for consistency calculation
        this.confidenceAPI!['confidenceScorer'].addRecentSignal(signal);

        finalWeight = baseWeight;

        this.logger.debug('Enhanced fusion weight calculated', {
          signal_id: signal.id,
          signal_type: signal.type,
          confidence_score: confidenceScore,
          final_weight: finalWeight
        });

      } catch (error: any) {
        // Fallback to original weighting if confidence calculation fails
        this.logger.warn('Confidence calculation failed, using fallback weighting', {
          signal_id: signal.id,
          error: error.message
        });

        const typeWeight = this.config.signalWeights[signal.type] || 0.1;
        const confidenceWeight = signal.metadata.confidence;
        finalWeight = typeWeight * confidenceWeight;
      }

      weightedSum += (signal.features?.compositeScore || 0) * finalWeight;
      totalWeight += finalWeight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private mapSignalTypeToCategory(signalType: SignalType): 'market' | 'onChain' | 'social' {
    const marketTypes: SignalType[] = ['price', 'volume', 'technical'];
    const onChainTypes: SignalType[] = ['on_chain', 'defi_metrics', 'fundamental'];
    const socialTypes: SignalType[] = ['social_media', 'news'];

    if (marketTypes.includes(signalType)) return 'market';
    if (onChainTypes.includes(signalType)) return 'onChain';
    if (socialTypes.includes(signalType)) return 'social';

    return 'market'; // Default fallback
  }

  private calculateFusionConfidence(signals: NormalizedSignal[]): number {
    if (signals.length === 0) return 0;

    // Confidence based on signal diversity and quality
    const typeDiversity = new Set(signals.map(s => s.type)).size;
    const avgConfidence = stats.mean(signals.map(s => s.metadata.confidence));
    const signalCount = signals.length;

    // Higher diversity, confidence, and count = higher fusion confidence
    const diversityBonus = Math.min(0.3, typeDiversity / 10 * 0.3);
    const confidenceBonus = avgConfidence * 0.4;
    const countBonus = Math.min(0.3, signalCount / this.config.maxSignals * 0.3);

    return Math.min(1, diversityBonus + confidenceBonus + countBonus);
  }

  private calculateDominantTypes(signals: NormalizedSignal[]): SignalType[] {
    const typeCounts = new Map<SignalType, number>();

    for (const signal of signals) {
      const count = typeCounts.get(signal.type) || 0;
      typeCounts.set(signal.type, count + 1);
    }

    // Return top 3 most frequent types
    return Array.from(typeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  private generateRecommendations(fusionScore: number, features: FeatureVector): FusionUpdate['recommendations'] {
    let action: 'alert' | 'investigate' | 'ignore' = 'ignore';
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let reasoning = '';

    // Determine action based on fusion score and features
    if (fusionScore > 0.8) {
      action = 'alert';
      priority = 'critical';
      reasoning = 'High fusion score indicates significant market signal';
    } else if (fusionScore > 0.6 || features.anomalyScore > 0.7) {
      action = 'investigate';
      priority = 'high';
      reasoning = 'Moderate fusion score or anomaly detected';
    } else if (fusionScore > 0.4 || features.volatility > 0.6) {
      action = 'investigate';
      priority = 'medium';
      reasoning = 'Elevated volatility or moderate signal strength';
    } else {
      action = 'ignore';
      priority = 'low';
      reasoning = 'Low signal strength and normal conditions';
    }

    return {
      action,
      priority,
      reasoning
    };
  }

  private updateFusionState(): void {
    const signalTypes = Array.from(this.recentSignals.values()).map(s => s.type);
    const typeCounts = new Map<SignalType, number>();

    for (const type of signalTypes) {
      const count = typeCounts.get(type) || 0;
      typeCounts.set(type, count + 1);
    }

    this.fusionState.dominantTypes = Array.from(typeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  getStatus(): string {
    return this.isInitialized ? `Active (${this.recentSignals.size} signals)` : 'Not Initialized';
  }
}
