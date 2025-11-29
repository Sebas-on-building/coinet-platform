/**
 * =========================================
 * CORRELATION ANALYSIS ENGINE
 * =========================================
 * Advanced cross-signal correlation analysis with statistical
 * measures, causality detection, clustering, and PCA
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import * as stats from 'simple-statistics';
import type {
  NormalizedSignal,
  SignalType
} from '../types';
import type {
  CorrelationMatrix,
  CorrelationPair,
  GrangerCausalityResult,
  CorrelationConfig,
  CorrelationAnalysisRequest,
  CorrelationAnalysisResponse,
  CorrelationInsights,
  CorrelationMetrics
} from './types';

export class CorrelationAnalyzer extends EventEmitter {
  private logger: Logger;
  private config: CorrelationConfig;
  private isInitialized: boolean = false;

  // Signal data storage
  private signalHistory: Map<SignalType, NormalizedSignal[]> = new Map();
  private correlationCache: Map<string, CorrelationMatrix> = new Map();

  // Analysis results storage
  private correlationPairs: Map<string, CorrelationPair> = new Map();
  private causalityResults: GrangerCausalityResult[] = [];
  private lastAnalysis: Date = new Date();

  constructor(config: CorrelationConfig) {
    super();
    this.logger = new Logger('CorrelationAnalyzer');
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Correlation Analyzer...');

      // Initialize signal history storage
      this.signalHistory.clear();
      this.correlationCache.clear();
      this.correlationPairs.clear();

      this.isInitialized = true;
      this.logger.info('✅ Correlation Analyzer initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Correlation Analyzer', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.signalHistory.clear();
      this.correlationCache.clear();
      this.correlationPairs.clear();
      this.causalityResults = [];

      this.isInitialized = false;
      this.logger.info('✅ Correlation Analyzer stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Correlation Analyzer', error);
      throw error;
    }
  }

  /**
   * Add signal to history for correlation analysis
   */
  addSignal(signal: NormalizedSignal): void {
    if (!this.isInitialized) {
      throw new Error('Correlation Analyzer is not initialized');
    }

    // Add to signal history
    if (!this.signalHistory.has(signal.type)) {
      this.signalHistory.set(signal.type, []);
    }

    const signals = this.signalHistory.get(signal.type)!;
    signals.push(signal);

    // Keep only recent signals based on lookback period
    const cutoffTime = Date.now() - (this.config.lookbackPeriod * 24 * 60 * 60 * 1000);
    this.signalHistory.set(signal.type, signals.filter(s =>
      s.timestamp.getTime() > cutoffTime
    ));

    this.logger.debug('Signal added to correlation analysis', {
      signal_id: signal.id,
      signal_type: signal.type,
      history_size: signals.length
    });
  }

  /**
   * Perform comprehensive correlation analysis
   */
  async analyzeCorrelations(request: CorrelationAnalysisRequest): Promise<CorrelationAnalysisResponse> {
    if (!this.isInitialized) {
      throw new Error('Correlation Analyzer is not initialized');
    }

    const startTime = Date.now();

    try {
      this.logger.info('Starting correlation analysis', {
        signal_types: request.signalTypes,
        time_window: request.timeWindow,
        method: request.correlationMethod
      });

      // Get signals for analysis
      const signalsForAnalysis = this.getSignalsForAnalysis(request.signalTypes, request.timeWindow);

      if (signalsForAnalysis.length < this.config.minDataPoints) {
        throw new Error(`Insufficient data: ${signalsForAnalysis.length} signals, need ${this.config.minDataPoints}`);
      }

      // Calculate correlation matrix
      const correlationMatrix = this.calculateCorrelationMatrix(
        request.signalTypes,
        signalsForAnalysis,
        request.correlationMethod || 'pearson'
      );

      // Find significant correlation pairs
      const significantPairs = this.findSignificantPairs(correlationMatrix);

      // Perform Granger causality analysis if requested
      const causalityResults = request.includeCausality ?
        await this.analyzeGrangerCausality(request.signalTypes, signalsForAnalysis) : [];

      // Update correlation pairs storage
      this.updateCorrelationPairs(significantPairs);

      // Emit analysis complete event
      const response: CorrelationAnalysisResponse = {
        request,
        matrix: correlationMatrix,
        significantPairs,
        causalityResults,
        clusters: [], // Will be populated by clustering module
        convergencePatterns: [], // Will be populated by clustering module
        analysisTime: Date.now() - startTime,
        timestamp: new Date(),
        signals: signalsForAnalysis
      };

      this.lastAnalysis = new Date();

      this.logger.info('Correlation analysis completed', {
        signal_types: request.signalTypes.length,
        significant_pairs: significantPairs.length,
        analysis_time: response.analysisTime + 'ms'
      });

      this.emit('analysis_complete', response);

      return response;

    } catch (error: any) {
      this.logger.error('Correlation analysis failed', {
        signal_types: request.signalTypes,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get signals for correlation analysis within time window
   */
  private getSignalsForAnalysis(signalTypes: SignalType[], timeWindowMinutes?: number): NormalizedSignal[] {
    const allSignals: NormalizedSignal[] = [];
    const cutoffTime = timeWindowMinutes ?
      Date.now() - (timeWindowMinutes * 60 * 1000) :
      Date.now() - (this.config.lookbackPeriod * 24 * 60 * 60 * 1000);

    for (const signalType of signalTypes) {
      const signals = this.signalHistory.get(signalType) || [];
      const filteredSignals = signals.filter(s => s.timestamp.getTime() > cutoffTime);
      allSignals.push(...filteredSignals);
    }

    // Sort by timestamp
    return allSignals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate correlation matrix for signal types
   */
  private calculateCorrelationMatrix(
    signalTypes: SignalType[],
    signals: NormalizedSignal[],
    method: 'pearson' | 'spearman'
  ): CorrelationMatrix {
    const matrix: number[][] = [];
    const cacheKey = `${signalTypes.sort().join('_')}_${method}_${signals.length}`;

    // Check cache first
    const cached = this.correlationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp.getTime()) < (5 * 60 * 1000)) {
      return cached;
    }

    // Extract signal values for each type
    const signalValues: Record<SignalType, number[]> = {} as Record<SignalType, number[]>;
    for (const signalType of signalTypes) {
      const typeSignals = signals.filter(s => s.type === signalType);
      signalValues[signalType] = typeSignals.map(s => {
        // Extract primary normalized value
        const values = Object.values(s.normalizedValues);
        return values.length > 0 ? values[0] as number : 0;
      });
    }

    // Calculate correlation matrix
    for (let i = 0; i < signalTypes.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < signalTypes.length; j++) {
        if (i === j) {
          matrix[i][j] = 1.0; // Self-correlation
        } else {
          const correlation = this.calculateCorrelation(
            signalValues[signalTypes[i]],
            signalValues[signalTypes[j]],
            method
          );
          matrix[i][j] = correlation;
        }
      }
    }

    const result: CorrelationMatrix = {
      signalTypes,
      matrix,
      timestamp: new Date(),
      metadata: {
        correlationMethod: method,
        timeWindow: this.config.lookbackPeriod * 24 * 60, // Convert to minutes
        minDataPoints: this.config.minDataPoints,
        significanceLevel: this.config.significanceLevel
      }
    };

    // Cache the result
    this.correlationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Calculate correlation between two signal series
   */
  private calculateCorrelation(values1: number[], values2: number[], method: 'pearson' | 'spearman'): number {
    if (values1.length !== values2.length || values1.length < 3) {
      return 0;
    }

    if (method === 'pearson') {
      return this.calculatePearsonCorrelation(values1, values2);
    } else {
      return this.calculateSpearmanCorrelation(values1, values2);
    }
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate Spearman rank correlation coefficient
   */
  private calculateSpearmanCorrelation(x: number[], y: number[]): number {
    const n = x.length;

    // Calculate ranks
    const rankX = this.calculateRanks(x);
    const rankY = this.calculateRanks(y);

    // Calculate Pearson correlation on ranks
    return this.calculatePearsonCorrelation(rankX, rankY);
  }

  /**
   * Calculate ranks for Spearman correlation
   */
  private calculateRanks(values: number[]): number[] {
    const n = values.length;
    const indexed = values.map((value, index) => ({ value, index }));

    // Sort by value
    indexed.sort((a, b) => a.value - b.value);

    // Assign ranks
    const ranks = new Array(n);
    for (let i = 0; i < n; i++) {
      ranks[indexed[i].index] = i + 1;
    }

    // Handle ties by averaging
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && indexed[j].value === indexed[j + 1].value) {
        j++;
      }

      if (i !== j) {
        const avgRank = (i + j + 2) / 2; // +2 because ranks are 1-indexed
        for (let k = i; k <= j; k++) {
          ranks[indexed[k].index] = avgRank;
        }
      }

      i = j + 1;
    }

    return ranks;
  }

  /**
   * Find statistically significant correlation pairs
   */
  private findSignificantPairs(matrix: CorrelationMatrix): CorrelationPair[] {
    const pairs: CorrelationPair[] = [];

    for (let i = 0; i < matrix.signalTypes.length; i++) {
      for (let j = i + 1; j < matrix.signalTypes.length; j++) {
        const correlation = matrix.matrix[i][j];
        const pValue = this.calculatePValue(correlation, matrix.signalTypes.length);

        if (pValue < this.config.significanceLevel) {
          const strength = this.categorizeCorrelationStrength(Math.abs(correlation));
          const direction = correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none';

          const pair: CorrelationPair = {
            signalType1: matrix.signalTypes[i],
            signalType2: matrix.signalTypes[j],
            correlation,
            pValue,
            strength,
            direction,
            sampleSize: matrix.signalTypes.length,
            lastUpdated: new Date()
          };

          pairs.push(pair);
        }
      }
    }

    return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Calculate p-value for correlation coefficient
   */
  private calculatePValue(correlation: number, sampleSize: number): number {
    if (sampleSize < 3) return 1;

    // Fisher's z-transformation for correlation significance
    const z = 0.5 * Math.log((1 + correlation) / (1 - correlation));
    const se = 1 / Math.sqrt(sampleSize - 3);
    const zScore = Math.abs(z / se);

    // Two-tailed test
    return 2 * (1 - this.normalCDF(zScore));
  }

  /**
   * Normal cumulative distribution function approximation
   */
  private normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Categorize correlation strength
   */
  private categorizeCorrelationStrength(absCorrelation: number): CorrelationPair['strength'] {
    if (absCorrelation >= 0.8) return 'very_strong';
    if (absCorrelation >= 0.6) return 'strong';
    if (absCorrelation >= 0.4) return 'moderate';
    if (absCorrelation >= 0.2) return 'weak';
    return 'very_weak';
  }

  /**
   * Perform Granger causality analysis
   */
  private async analyzeGrangerCausality(
    signalTypes: SignalType[],
    signals: NormalizedSignal[]
  ): Promise<GrangerCausalityResult[]> {
    const results: GrangerCausalityResult[] = [];

    // Extract time series for each signal type
    const timeSeries: Record<SignalType, number[]> = {} as Record<SignalType, number[]>;
    for (const signalType of signalTypes) {
      const typeSignals = signals.filter(s => s.type === signalType);
      timeSeries[signalType] = typeSignals.map(s => {
        const values = Object.values(s.normalizedValues);
        return values.length > 0 ? values[0] as number : 0;
      });
    }

    // Test causality in both directions for each pair
    for (let i = 0; i < signalTypes.length; i++) {
      for (let j = 0; j < signalTypes.length; j++) {
        if (i !== j) {
          const causeType = signalTypes[i];
          const effectType = signalTypes[j];

          const causalityResult = await this.testGrangerCausality(
            timeSeries[causeType],
            timeSeries[effectType]
          );

          if (causalityResult.isCausal) {
            results.push({
              cause: causeType,
              effect: effectType,
              ...causalityResult
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Test Granger causality between two time series
   */
  private async testGrangerCausality(cause: number[], effect: number[]): Promise<{
    fStatistic: number;
    pValue: number;
    lagOrder: number;
    isCausal: boolean;
    strength: 'weak' | 'moderate' | 'strong';
    direction: 'leads' | 'lags' | 'bidirectional';
  }> {
    if (cause.length !== effect.length || cause.length < this.config.granger.minObservations) {
      return {
        fStatistic: 0,
        pValue: 1,
        lagOrder: 0,
        isCausal: false,
        strength: 'weak',
        direction: 'leads'
      };
    }

    // Simplified Granger causality test
    // In a real implementation, this would use proper time series analysis
    const correlation = Math.abs(this.calculatePearsonCorrelation(cause, effect));

    // For demonstration, assume strong correlation indicates potential causality
    const isCausal = correlation > 0.5 && this.calculatePValue(correlation, cause.length) < this.config.granger.significanceLevel;

    const strength = correlation > 0.8 ? 'strong' : correlation > 0.6 ? 'moderate' : 'weak';

    return {
      fStatistic: correlation * 10, // Placeholder
      pValue: isCausal ? 0.01 : 0.5, // Placeholder
      lagOrder: 1, // Placeholder
      isCausal,
      strength,
      direction: 'leads'
    };
  }

  /**
   * Update stored correlation pairs
   */
  private updateCorrelationPairs(newPairs: CorrelationPair[]): void {
    for (const pair of newPairs) {
      const key = `${pair.signalType1}_${pair.signalType2}`;
      this.correlationPairs.set(key, pair);
    }
  }

  /**
   * Get correlation insights
   */
  getCorrelationInsights(): CorrelationInsights {
    const pairs = Array.from(this.correlationPairs.values());

    return {
      dominantCorrelations: pairs.filter(p => p.strength === 'strong' || p.strength === 'very_strong'),
      predictiveClusters: [], // Will be populated by clustering module
      leadLagRelationships: [], // Will be populated by lead-lag detection
      dimensionalityReduction: {
        originalDimensions: pairs.length,
        reducedDimensions: 0,
        informationRetained: 0
      },
      adaptiveUpdates: [], // Will be populated by adaptive weighting
      marketRegime: {
        correlations: Array.from(this.correlationCache.values())[0] || this.createEmptyMatrix(),
        clusters: [],
        regimeShift: false
      }
    };
  }

  /**
   * Create empty correlation matrix for fallback
   */
  private createEmptyMatrix(): CorrelationMatrix {
    return {
      signalTypes: [],
      matrix: [],
      timestamp: new Date(),
      metadata: {
        correlationMethod: 'pearson',
        timeWindow: 0,
        minDataPoints: 0,
        significanceLevel: 0
      }
    };
  }

  /**
   * Get correlation metrics
   */
  getMetrics(): CorrelationMetrics {
    const pairs = Array.from(this.correlationPairs.values());
    const avgStrength = pairs.length > 0 ?
      pairs.reduce((sum, p) => sum + Math.abs(p.correlation), 0) / pairs.length : 0;

    return {
      totalAnalyses: this.correlationCache.size,
      avgCorrelationStrength: avgStrength,
      mostCorrelatedPairs: pairs.slice(0, 5),
      clusterCount: 0, // Will be populated by clustering
      avgClusterSize: 0,
      pcaVarianceExplained: 0, // Will be populated by PCA
      causalityDetections: this.causalityResults.length,
      adaptiveWeightingUpdates: 0, // Will be populated by adaptive weighting
      lastUpdated: this.lastAnalysis
    };
  }

  /**
   * Get current status
   */
  getStatus(): string {
    return this.isInitialized ?
      `Active (${this.signalHistory.size} signal types, ${this.correlationPairs.size} correlation pairs)` :
      'Not Initialized';
  }

  /**
   * Get configuration
   */
  getConfig(): CorrelationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CorrelationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Correlation configuration updated', newConfig);
  }
}
