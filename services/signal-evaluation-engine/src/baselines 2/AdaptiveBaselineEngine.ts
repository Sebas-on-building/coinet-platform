/**
 * =========================================
 * ADAPTIVE BASELINE ENGINE
 * =========================================
 * Dynamically adjusts signal baselines based on market regimes
 * using statistical techniques and machine learning models
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type { NormalizedSignal, SignalType } from '../types';
import type {
  MarketRegime,
  BaselineStats,
  SignalBaseline,
  AnomalyDetection,
  RegimeShift,
  BaselineConfig,
  BaselineStats as IBaselineStats
} from '../alerts/types';

export class AdaptiveBaselineEngine extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;

  // Core data structures
  private signalBaselines: Map<string, SignalBaseline> = new Map(); // key -> baseline
  private currentRegimes: Map<string, MarketRegime> = new Map(); // signalType -> regime
  private regimeHistory: RegimeShift[] = [];

  // Signal data buffers for analysis
  private signalBuffers: Map<string, Map<string, number[]>> = new Map(); // signalType -> assetClass -> values
  private regimeBuffers: Map<string, NormalizedSignal[]> = new Map(); // signalType -> signals

  // Machine learning models (simplified - would use actual ML libraries)
  private mlModels: Map<string, any> = new Map(); // signalType -> model

  // Configuration
  private config: BaselineConfig;

  constructor(config: BaselineConfig) {
    super();
    this.logger = new Logger('AdaptiveBaselineEngine');
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing adaptive baseline engine...');

      // Initialize ML models if enabled
      if (this.config.ml.enabled) {
        await this.initializeMLModels();
      }

      // Start regime monitoring
      this.startRegimeMonitoring();

      this.isInitialized = true;
      this.logger.info('✅ Adaptive baseline engine initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize adaptive baseline engine', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping adaptive baseline engine...');

      // Clear all data structures
      this.signalBaselines.clear();
      this.currentRegimes.clear();
      this.regimeHistory = [];
      this.signalBuffers.clear();
      this.regimeBuffers.clear();
      this.mlModels.clear();

      this.isInitialized = false;
      this.logger.info('✅ Adaptive baseline engine stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop adaptive baseline engine', error);
      throw error;
    }
  }

  /**
   * Process a new signal for baseline updates and anomaly detection
   */
  processSignal(signal: NormalizedSignal): void {
    if (!this.isInitialized) {
      throw new Error('Adaptive baseline engine is not initialized');
    }

    try {
      this.logger.debug('Processing signal for baseline analysis', {
        signalId: signal.id,
        signalType: signal.type,
        timestamp: signal.timestamp
      });

      // Update signal buffers
      this.updateSignalBuffers(signal);

      // Update baselines for this signal type
      this.updateBaselines(signal.type);

      // Check for regime shifts
      this.detectRegimeShifts(signal.type);

      // Perform anomaly detection
      const anomalies = this.detectAnomalies(signal);

      // Emit anomaly events
      for (const anomaly of anomalies) {
        this.emit('anomaly', anomaly);
      }

      this.logger.debug('Signal processed for baseline analysis', {
        signalId: signal.id,
        anomaliesDetected: anomalies.length
      });

    } catch (error: any) {
      this.logger.error('Failed to process signal for baseline analysis', {
        signalId: signal.id,
        error: error.message
      });
    }
  }

  /**
   * Update signal buffers for statistical analysis
   */
  private updateSignalBuffers(signal: NormalizedSignal): void {
    const signalType = signal.type;
    const assetClass = (signal.metadata as any)?.assetClass || 'default';

    // Initialize buffers if needed
    if (!this.signalBuffers.has(signalType)) {
      this.signalBuffers.set(signalType, new Map());
    }

    if (!this.signalBuffers.get(signalType)!.has(assetClass)) {
      this.signalBuffers.get(signalType)!.set(assetClass, []);
    }

    // Add signal value to appropriate buffer
    const buffer = this.signalBuffers.get(signalType)!.get(assetClass)!;
    buffer.push(signal.normalizedValues.value || 0);

    // Maintain buffer size based on configuration
    const maxBufferSize = Math.max(...this.config.statistical.windowSizes);
    if (buffer.length > maxBufferSize) {
      buffer.splice(0, buffer.length - maxBufferSize);
    }

    // Update regime buffer
    if (!this.regimeBuffers.has(signalType)) {
      this.regimeBuffers.set(signalType, []);
    }

    const regimeBuffer = this.regimeBuffers.get(signalType)!;
    regimeBuffer.push(signal);

    // Maintain regime buffer size
    const regimeWindowSize = this.config.regimeDetection.windowSize * 60 * 1000; // Convert to milliseconds
    const cutoffTime = new Date(Date.now() - regimeWindowSize);

    const filteredBuffer = regimeBuffer.filter(s => s.timestamp > cutoffTime);
    this.regimeBuffers.set(signalType, filteredBuffer);
  }

  /**
   * Update baselines for a signal type
   */
  private updateBaselines(signalType: string): void {
    const currentRegime = this.getCurrentRegime(signalType);

    for (const [assetClass, buffer] of this.signalBuffers.get(signalType) || []) {
      const key = `${signalType}:${assetClass}:global`;

      if (!this.signalBaselines.has(key)) {
        this.initializeBaseline(signalType, assetClass);
      }

      const baseline = this.signalBaselines.get(key)!;

      // Update regime-specific baseline
      if (currentRegime) {
        baseline.regimeBaselines[currentRegime.id] = this.calculateBaselineStats(buffer);
        baseline.currentRegime = currentRegime.id;
      }

      // Update overall baseline
      baseline.overallBaseline = this.calculateBaselineStats(buffer);

      // Update anomaly thresholds based on current regime
      this.updateAnomalyThresholds(baseline, currentRegime);

      // Retrain ML models if enabled
      if (this.config.ml.enabled) {
        this.updateMLModels(signalType, assetClass, buffer);
      }
    }
  }

  /**
   * Calculate baseline statistics for a signal buffer
   */
  private calculateBaselineStats(values: number[]): BaselineStats {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        percentiles: { p5: 0, p25: 0, p75: 0, p95: 0 },
        range: { min: 0, max: 0 },
        sampleSize: 0,
        lastUpdated: new Date()
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate percentiles
    const p5 = sorted[Math.floor(sorted.length * 0.05)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return {
      mean,
      median,
      standardDeviation,
      percentiles: { p5, p25, p75, p95 },
      range: { min: sorted[0], max: sorted[sorted.length - 1] },
      sampleSize: values.length,
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize baseline for a signal type and asset class
   */
  private initializeBaseline(signalType: string, assetClass?: string): void {
    const key = `${signalType}:${assetClass || 'default'}:global`;
    const userId = undefined; // Would be determined from context

    const baseline: SignalBaseline = {
      signalType,
      assetClass,
      userId,
      currentRegime: 'default',
      regimeBaselines: {
        'default': this.calculateBaselineStats([])
      },
      overallBaseline: this.calculateBaselineStats([]),
      anomalyThresholds: {
        zScore: 3.0,
        percentile: 0.05,
        custom: 2.5
      },
      updateFrequency: 60000, // 1 minute
      windowSize: 1000
    };

    this.signalBaselines.set(key, baseline);

    this.logger.debug('Baseline initialized', {
      signalType,
      assetClass,
      key
    });
  }


  /**
   * Detect regime shifts based on signal patterns
   */
  private detectRegimeShifts(signalType: string): void {
    if (!this.config.regimeDetection.enabled) return;

    const signals = this.regimeBuffers.get(signalType) || [];
    if (signals.length < 100) return; // Need minimum samples

    const currentRegime = this.getCurrentRegime(signalType);
    const newRegime = this.analyzeMarketRegime(signals);

    if (!currentRegime || currentRegime.id !== newRegime.id) {
      const shift: RegimeShift = {
        fromRegime: currentRegime?.id || 'unknown',
        toRegime: newRegime.id,
        shiftTime: new Date(),
        confidence: newRegime.confidence,
        indicators: this.calculateRegimeIndicators(signals),
        duration: currentRegime ?
          (Date.now() - currentRegime.startTime.getTime()) / (1000 * 60) :
          0
      };

      this.regimeHistory.push(shift);
      this.currentRegimes.set(signalType, newRegime);

      this.emit('regimeShift', shift);

      this.logger.info('Regime shift detected', {
        signalType,
        fromRegime: shift.fromRegime,
        toRegime: shift.toRegime,
        confidence: shift.confidence
      });
    }
  }

  /**
   * Analyze current market regime based on signal patterns
   */
  private analyzeMarketRegime(signals: NormalizedSignal[]): MarketRegime {
    // Calculate volatility
    const values = signals.map(s => s.normalizedValues.value || 0);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    // Calculate volume (using signal frequency as proxy)
    const volume = signals.length / (this.config.regimeDetection.windowSize * 60); // signals per second

    // Calculate trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const trend = this.calculateTrend(firstHalf, secondHalf);

    // Determine regime characteristics
    const volatilityLevel = this.categorizeVolatility(volatility);
    const volumeLevel = this.categorizeVolume(volume);
    const trendDirection = trend;

    const regimeId = `${trendDirection}_${volatilityLevel}_${volumeLevel}`;
    const regimeName = `${trendDirection} ${volatilityLevel} volatility, ${volumeLevel} volume`;

    return {
      id: regimeId,
      name: regimeName,
      characteristics: {
        volatility: volatilityLevel,
        trend: trendDirection,
        volume: volumeLevel,
        liquidity: this.estimateLiquidity(volatility, volume)
      },
      confidence: this.calculateRegimeConfidence(signals, volatility, volume, trend),
      startTime: new Date(),
      duration: 0,
      signalPatterns: {}
    };
  }

  /**
   * Calculate trend direction from signal values
   */
  private calculateTrend(firstHalf: number[], secondHalf: number[]): 'bull' | 'bear' | 'sideways' {
    const firstMean = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    const change = (secondMean - firstMean) / firstMean;

    if (change > 0.02) return 'bull';
    if (change < -0.02) return 'bear';
    return 'sideways';
  }

  /**
   * Categorize volatility level
   */
  private categorizeVolatility(volatility: number): 'low' | 'medium' | 'high' {
    const { low, medium, high } = this.config.regimeDetection.volatilityBands;

    if (volatility < low) return 'low';
    if (volatility < medium) return 'medium';
    return 'high';
  }

  /**
   * Categorize volume level
   */
  private categorizeVolume(volume: number): 'low' | 'medium' | 'high' {
    // Simple categorization based on signal frequency
    if (volume < 0.1) return 'low';
    if (volume < 1.0) return 'medium';
    return 'high';
  }

  /**
   * Estimate liquidity based on volatility and volume
   */
  private estimateLiquidity(volatility: number, volume: number): 'low' | 'medium' | 'high' {
    const liquidityScore = volume / (volatility + 0.01); // Avoid division by zero

    if (liquidityScore < 5) return 'low';
    if (liquidityScore < 20) return 'medium';
    return 'high';
  }

  /**
   * Calculate confidence in regime detection
   */
  private calculateRegimeConfidence(signals: NormalizedSignal[], volatility: number, volume: number, trend: 'bull' | 'bear' | 'sideways'): number {
    // Base confidence from signal count
    const signalConfidence = Math.min(signals.length / 100, 1.0);

    // Volatility stability confidence
    const volatilityStability = 1 - Math.min(volatility / 0.1, 1.0);

    // Trend consistency confidence
    const trendConsistency = this.calculateTrendConsistency(signals);

    return (signalConfidence + volatilityStability + trendConsistency) / 3;
  }

  /**
   * Calculate trend consistency across signals
   */
  private calculateTrendConsistency(signals: NormalizedSignal[]): number {
    if (signals.length < 10) return 0.5;

    const values = signals.map(s => s.normalizedValues.value || 0);
    let consistentCount = 0;

    for (let i = 1; i < values.length; i++) {
      const change = (values[i] - values[i-1]) / values[i-1];
      if (Math.abs(change) < 0.05) { // Less than 5% change
        consistentCount++;
      }
    }

    return consistentCount / (values.length - 1);
  }

  /**
   * Calculate regime indicators for shift detection
   */
  private calculateRegimeIndicators(signals: NormalizedSignal[]): RegimeShift['indicators'] {
    const values = signals.map(s => s.normalizedValues.value || 0);

    // Simple indicators - in practice would use more sophisticated calculations
    const volatilityChange = this.calculateVolatilityChange(values);
    const volumeChange = this.calculateVolumeChange(signals);
    const priceChange = this.calculatePriceChange(values);
    const correlationChange = this.calculateCorrelationChange(values);

    return {
      volatilityChange,
      volumeChange,
      priceChange,
      correlationChange
    };
  }

  /**
   * Calculate volatility change
   */
  private calculateVolatilityChange(values: number[]): number {
    if (values.length < 20) return 0;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstVolatility = this.calculateVolatility(firstHalf);
    const secondVolatility = this.calculateVolatility(secondHalf);

    return (secondVolatility - firstVolatility) / firstVolatility;
  }

  /**
   * Calculate volatility for a set of values
   */
  private calculateVolatility(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate volume change
   */
  private calculateVolumeChange(signals: NormalizedSignal[]): number {
    if (signals.length < 20) return 0;

    const firstHalf = signals.slice(0, Math.floor(signals.length / 2));
    const secondHalf = signals.slice(Math.floor(signals.length / 2));

    const firstVolume = firstHalf.length;
    const secondVolume = secondHalf.length;

    return (secondVolume - firstVolume) / firstVolume;
  }

  /**
   * Calculate price change
   */
  private calculatePriceChange(values: number[]): number {
    if (values.length < 2) return 0;

    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    return (lastValue - firstValue) / firstValue;
  }

  /**
   * Calculate correlation change (simplified)
   */
  private calculateCorrelationChange(values: number[]): number {
    // Simplified correlation change calculation
    return 0; // Placeholder
  }

  /**
   * Detect anomalies in signal values
   */
  private detectAnomalies(signal: NormalizedSignal): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const signalType = signal.type;
    const assetClass = (signal.metadata as any)?.assetClass || 'default';
    const key = `${signalType}:${assetClass || 'default'}:global`;

    const baseline = this.signalBaselines.get(key);
    if (!baseline) return anomalies;

    const currentRegime = this.getCurrentRegime(signalType);
    const regimeBaseline = currentRegime ?
      baseline.regimeBaselines[currentRegime.id] :
      baseline.overallBaseline;

    if (!regimeBaseline || regimeBaseline.sampleSize < 50) return anomalies;

    const value = signal.normalizedValues.value || 0;
    const deviation = value - regimeBaseline.mean;
    const zScore = deviation / (regimeBaseline.standardDeviation || 1);

    // Check for outliers using z-score
    if (Math.abs(zScore) > baseline.anomalyThresholds.zScore) {
      anomalies.push({
        signalId: signal.id,
        signalType: signal.type,
        value,
        baseline: regimeBaseline.mean,
        deviation,
        zScore,
        percentile: this.calculatePercentile(value, regimeBaseline),
        anomalyType: 'outlier',
        severity: this.categorizeAnomalySeverity(Math.abs(zScore)),
        confidence: this.calculateAnomalyConfidence(signal, regimeBaseline),
        timestamp: signal.timestamp,
        regime: currentRegime?.id || 'unknown'
      });
    }

    // Check for trend breaks
    if (this.detectTrendBreak(signal, baseline)) {
      anomalies.push({
        signalId: signal.id,
        signalType: signal.type,
        value,
        baseline: regimeBaseline.mean,
        deviation,
        zScore,
        percentile: this.calculatePercentile(value, regimeBaseline),
        anomalyType: 'trend_break',
        severity: 'high',
        confidence: 0.8,
        timestamp: signal.timestamp,
        regime: currentRegime?.id || 'unknown'
      });
    }

    return anomalies;
  }

  /**
   * Detect trend breaks using statistical tests
   */
  private detectTrendBreak(signal: NormalizedSignal, baseline: SignalBaseline): boolean {
    const signalType = signal.type;
    const assetClass = (signal.metadata as any)?.assetClass || 'default';
    const buffer = this.signalBuffers.get(signalType)?.get(assetClass);

    if (!buffer || buffer.length < 20) return false;

    // Simple trend break detection using linear regression
    const recentValues = buffer.slice(-20);
    const trend = this.calculateLinearTrend(recentValues);

    // If trend slope is significant, check if current signal breaks the trend
    if (Math.abs(trend.slope) > this.config.statistical.trendSensitivity) {
      const predicted = trend.intercept + trend.slope * recentValues.length;
      const deviation = Math.abs(signal.normalizedValues.value - predicted);

      return deviation > (baseline.overallBaseline.standardDeviation * 2);
    }

    return false;
  }

  /**
   * Calculate linear trend for a series of values
   */
  private calculateLinearTrend(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Calculate percentile for a value relative to baseline
   */
  private calculatePercentile(value: number, baseline: BaselineStats): number {
    // Simplified percentile calculation
    const { min, max } = baseline.range;
    if (max === min) return 0.5;

    return (value - min) / (max - min);
  }

  /**
   * Categorize anomaly severity based on z-score
   */
  private categorizeAnomalySeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    const absZ = Math.abs(zScore);

    if (absZ > 5) return 'critical';
    if (absZ > 4) return 'high';
    if (absZ > 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence in anomaly detection
   */
  private calculateAnomalyConfidence(signal: NormalizedSignal, baseline: BaselineStats): number {
    // Base confidence from sample size
    const sampleConfidence = Math.min(baseline.sampleSize / 1000, 1.0);

    // Regime stability confidence
    const currentRegime = this.getCurrentRegime(signal.type);
    const regimeConfidence = currentRegime?.confidence || 0.5;

    return (sampleConfidence + regimeConfidence) / 2;
  }

  /**
   * Update anomaly thresholds based on current regime
   */
  private updateAnomalyThresholds(baseline: SignalBaseline, regime: MarketRegime | null): void {
    if (!regime) return;

    // Adjust thresholds based on regime characteristics
    switch (regime.characteristics.volatility) {
      case 'low':
        baseline.anomalyThresholds.zScore = 2.5;
        break;
      case 'medium':
        baseline.anomalyThresholds.zScore = 3.0;
        break;
      case 'high':
        baseline.anomalyThresholds.zScore = 3.5;
        break;
    }

    // Adjust based on liquidity
    switch (regime.characteristics.liquidity) {
      case 'low':
        baseline.anomalyThresholds.percentile = 0.03;
        break;
      case 'medium':
        baseline.anomalyThresholds.percentile = 0.05;
        break;
      case 'high':
        baseline.anomalyThresholds.percentile = 0.07;
        break;
    }
  }

  /**
   * Initialize ML models for baseline prediction
   */
  private async initializeMLModels(): Promise<void> {
    this.logger.info('Initializing ML models for baseline prediction...');

    // Initialize models for each signal type
    for (const signalType of ['price', 'volume', 'social_media', 'on_chain', 'technical']) {
      this.mlModels.set(signalType, {
        type: 'linear', // Simple model for now
        trained: false,
        lastTraining: null,
        accuracy: 0
      });
    }

    this.logger.info('✅ ML models initialized');
  }

  /**
   * Update ML models with new data
   */
  private updateMLModels(signalType: string, assetClass: string, values: number[]): void {
    const model = this.mlModels.get(signalType);
    if (!model) return;

    // Simple model update - in practice would use actual ML libraries
    // For now, just track that we have new data
    model.lastTraining = new Date();
  }

  /**
   * Start regime monitoring
   */
  private startRegimeMonitoring(): void {
    // Monitor for regime changes every 5 minutes
    setInterval(() => {
      this.performRegimeMaintenance();
    }, 5 * 60 * 1000);
  }

  /**
   * Perform regime maintenance and cleanup
   */
  private performRegimeMaintenance(): void {
    // Clean up old regime history
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.regimeHistory = this.regimeHistory.filter(shift => shift.shiftTime > cutoffTime);

    // Update regime durations
    for (const regime of this.currentRegimes.values()) {
      regime.duration = (Date.now() - regime.startTime.getTime()) / (1000 * 60);
    }

    this.logger.debug('Regime maintenance completed', {
      activeRegimes: this.currentRegimes.size,
      regimeHistorySize: this.regimeHistory.length
    });
  }

  /**
   * Get baseline for a signal type and asset class
   */
  getBaseline(signalType: string, assetClass?: string): SignalBaseline | null {
    const key = `${signalType}:${assetClass || 'default'}:global`;
    return this.signalBaselines.get(key) || null;
  }

  /**
   * Get current market regime for a signal type
   */
  getCurrentRegime(signalType: string): MarketRegime | null {
    return this.currentRegimes.get(signalType) || null;
  }


  /**
   * Get engine statistics
   */
  getStatistics(): {
    totalBaselines: number;
    activeRegimes: number;
    totalAnomalies: number;
    regimeShifts: number;
    averageBaselineAge: number;
    mlModelsTrained: number;
  } {
    const totalBaselines = this.signalBaselines.size;
    const activeRegimes = this.currentRegimes.size;
    const regimeShifts = this.regimeHistory.length;
    const mlModelsTrained = Array.from(this.mlModels.values()).filter(model => model.trained).length;

    // Calculate average baseline age
    const baselineAges = Array.from(this.signalBaselines.values())
      .map(baseline => Date.now() - baseline.overallBaseline.lastUpdated.getTime());

    const averageBaselineAge = baselineAges.length > 0
      ? baselineAges.reduce((sum, age) => sum + age, 0) / baselineAges.length
      : 0;

    return {
      totalBaselines,
      activeRegimes,
      totalAnomalies: 0, // Would track actual anomalies
      regimeShifts,
      averageBaselineAge,
      mlModelsTrained
    };
  }

  /**
   * Get detailed status
   */
  getDetailedStatus(): {
    isInitialized: boolean;
    statistics: ReturnType<AdaptiveBaselineEngine['getStatistics']>;
    currentRegimes: Array<{
      signalType: string;
      regime: MarketRegime;
    }>;
    recentRegimeShifts: RegimeShift[];
  } {
    return {
      isInitialized: this.isInitialized,
      statistics: this.getStatistics(),
      currentRegimes: Array.from(this.currentRegimes.entries()).map(([signalType, regime]) => ({
        signalType,
        regime
      })),
      recentRegimeShifts: this.regimeHistory.slice(-10) // Last 10 shifts
    };
  }
}
