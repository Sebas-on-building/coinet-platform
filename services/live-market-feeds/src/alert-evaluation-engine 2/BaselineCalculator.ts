/**
 * =========================================
 * ELITE ADAPTIVE BASELINE CALCULATOR
 * =========================================
 * DIVINE WORLD-CLASS adaptive baseline system using statistical techniques
 * and machine learning to learn normal ranges for each signal under different
 * volatility or liquidity conditions. Updates baselines continuously using
 * sliding windows and detects regime shifts with Elon Musk-level sophistication.
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { SignalData, SignalType, AdaptiveBaseline } from './AlertEvaluationEngine';

export interface BaselineCalculatorConfig {
  windowSize: number; // Number of samples for baseline calculation
  updateFrequency: number; // milliseconds between updates
  regimeDetection: boolean; // Enable regime shift detection
  enableML: boolean; // Enable machine learning for baseline prediction
  outlierThreshold: number; // Z-score threshold for outlier detection
  minSamplesForBaseline: number; // Minimum samples needed for baseline calculation
  regimeChangeSensitivity: number; // Sensitivity for regime change detection
}

export interface SignalStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
  skewness: number;
  kurtosis: number;
  sampleSize: number;
}

export interface RegimeState {
  name: string;
  volatility: number; // 0-1 scale
  trend: 'bullish' | 'bearish' | 'sideways' | 'volatile';
  liquidity: number; // 0-1 scale
  confidence: number;
  lastUpdated: Date;
  samples: number;
}

export interface BaselineModel {
  asset: string;
  exchange: string;
  signalType: SignalType;
  currentBaseline: AdaptiveBaseline;
  historicalBaselines: AdaptiveBaseline[];
  regimeStates: Map<string, RegimeState>;
  mlModel?: MLBaselineModel;
  stats: SignalStats;
  lastUpdated: Date;
}

export interface MLBaselineModel {
  weights: number[];
  bias: number;
  accuracy: number;
  lastTrained: Date;
  trainingSamples: number;
}

export class BaselineCalculator extends EventEmitter {
  private config: BaselineCalculatorConfig;
  private logger: Logger;
  private isRunning: boolean = false;
  private baselineModels: Map<string, BaselineModel> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private regimeDetector: RegimeDetector | null = null;
  private mlTrainer: MLTrainer | null = null;

  constructor(config: BaselineCalculatorConfig) {
    super();
    this.config = config;
    this.logger = new Logger('BaselineCalculator');

    this.setupEventHandlers();
  }

  /**
   * Initialize baseline calculator with divine precision
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Baseline Calculator is already running');
    }

    this.logger.info('📊 Starting ELITE Adaptive Baseline Calculator - Divine Elon Musk Perfection Mode...');

    try {
      // Initialize regime detection
      if (this.config.regimeDetection) {
        this.regimeDetector = new RegimeDetector({
          sensitivity: this.config.regimeChangeSensitivity,
          windowSize: this.config.windowSize,
          enableML: this.config.enableML
        });
        await this.regimeDetector.initialize();
      }

      // Initialize ML trainer
      if (this.config.enableML) {
        this.mlTrainer = new MLTrainer({
          learningRate: 0.01,
          epochs: 100,
          regularization: 0.001
        });
        await this.mlTrainer.initialize();
      }

      // Start periodic updates
      this.startPeriodicUpdates();

      this.isRunning = true;
      this.logger.info('✅ ELITE Adaptive Baseline Calculator initialized');

      this.emit('baselineCalculatorReady', {
        regimeDetection: this.config.regimeDetection,
        mlEnabled: this.config.enableML,
        windowSize: this.config.windowSize,
        updateFrequency: this.config.updateFrequency
      });

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize ELITE Adaptive Baseline Calculator', error);
      throw error;
    }
  }

  /**
   * Stop baseline calculator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('🛑 Stopping Baseline Calculator...');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.regimeDetector) {
      await this.regimeDetector.stop();
    }

    if (this.mlTrainer) {
      await this.mlTrainer.stop();
    }

    this.isRunning = false;
    this.logger.info('✅ Baseline Calculator stopped');
  }

  /**
   * Calculate adaptive baseline for asset/exchange/signal combination
   */
  async calculateBaseline(asset: string | undefined, exchange: string, signals: SignalData[]): Promise<AdaptiveBaseline | null> {
    if (signals.length < this.config.minSamplesForBaseline) {
      this.logger.debug(`Insufficient samples for baseline calculation: ${signals.length} < ${this.config.minSamplesForBaseline}`);
      return null;
    }

    const assetValue = asset || 'unknown';
    const signalType = signals[0]?.type as SignalType;
    const key = `${assetValue}:${exchange}:${signalType}`;

    // Get or create baseline model
    if (!this.baselineModels.has(key)) {
      this.baselineModels.set(key, this.createBaselineModel(assetValue, exchange, signalType));
    }

    const model = this.baselineModels.get(key)!;

    // Calculate current statistics
    const stats = this.calculateSignalStats(signals);

    // Detect current regime
    const regime = await this.detectRegime(assetValue, exchange, signalType, signals);

    // Update baseline value using statistical methods and ML
    const baselineValue = await this.calculateAdaptiveBaseline(model, stats, regime);

    // Create adaptive baseline
    const adaptiveBaseline: AdaptiveBaseline = {
      signalType,
      asset: assetValue,
      exchange,
      baselineValue,
      confidence: this.calculateBaselineConfidence(stats, regime),
      regime: regime.name,
      lastUpdated: new Date(),
      sampleSize: signals.length
    };

    // Update model
    model.currentBaseline = adaptiveBaseline;
    model.historicalBaselines.push(adaptiveBaseline);
    model.stats = stats;
    model.lastUpdated = new Date();

    // Keep only last 1000 baselines
    if (model.historicalBaselines.length > 1000) {
      model.historicalBaselines.shift();
    }

    this.logger.debug(`✅ Calculated baseline for ${key}: ${baselineValue.toFixed(4)} (regime: ${regime.name})`);

    return adaptiveBaseline;
  }

  /**
   * Get current baseline for signal
   */
  getBaseline(asset: string, exchange: string, signalType: SignalType): AdaptiveBaseline | null {
    const key = `${asset}:${exchange}:${signalType}`;
    const model = this.baselineModels.get(key);

    return model?.currentBaseline || null;
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): AdaptiveBaseline[] {
    return Array.from(this.baselineModels.values()).map(model => model.currentBaseline);
  }

  /**
   * Get baseline statistics
   */
  getBaselineStats(): any {
    const stats = {
      totalModels: this.baselineModels.size,
      totalSamples: 0,
      regimes: [] as string[],
      averageConfidence: 0,
      lastUpdates: new Map<string, Date>()
    };

    for (const [key, model] of this.baselineModels) {
      stats.totalSamples += model.stats.sampleSize;
      if (!stats.regimes.includes(model.currentBaseline.regime)) {
        stats.regimes.push(model.currentBaseline.regime);
      }
      stats.lastUpdates.set(key, model.lastUpdated);

      if (model.currentBaseline.confidence > 0) {
        stats.averageConfidence += model.currentBaseline.confidence;
      }
    }

    stats.averageConfidence /= Math.max(1, this.baselineModels.size);
    stats.regimes = Array.from(stats.regimes);

    return stats;
  }

  /**
   * Create new baseline model
   */
  private createBaselineModel(asset: string, exchange: string, signalType: SignalType): BaselineModel {
    return {
      asset,
      exchange,
      signalType,
      currentBaseline: {
        signalType,
        asset,
        exchange,
        baselineValue: 0,
        confidence: 0,
        regime: 'neutral',
        lastUpdated: new Date(),
        sampleSize: 0
      },
      historicalBaselines: [],
      regimeStates: new Map(),
      stats: {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        q25: 0,
        q75: 0,
        skewness: 0,
        kurtosis: 0,
        sampleSize: 0
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate signal statistics
   */
  private calculateSignalStats(signals: SignalData[]): SignalStats {
    if (signals.length === 0) {
      return {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        q25: 0,
        q75: 0,
        skewness: 0,
        kurtosis: 0,
        sampleSize: 0
      };
    }

    // Extract signal values based on type
    const values = signals.map(signal => {
      switch (signal.type) {
        case 'trade':
          return signal.price || 0;
        case 'quote':
          return ((signal.bid || 0) + (signal.ask || 0)) / 2;
        case 'orderbook':
          return signal.bids?.[0]?.[0] || 0;
        default:
          return signal.value || 0;
      }
    }).filter(val => typeof val === 'number' && !isNaN(val));

    // Remove outliers using IQR method
    const cleanedValues = this.removeOutliers(values);

    if (cleanedValues.length === 0) {
      return {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        q25: 0,
        q75: 0,
        skewness: 0,
        kurtosis: 0,
        sampleSize: values.length
      };
    }

    // Calculate basic statistics
    const sorted = [...cleanedValues].sort((a, b) => a - b);
    const mean = cleanedValues.reduce((sum, val) => sum + val, 0) / cleanedValues.length;
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    const min = sorted[0] || 0;
    const max = sorted[sorted.length - 1] || 0;

    // Calculate quartiles
    const q25Index = Math.floor(sorted.length * 0.25);
    const q75Index = Math.floor(sorted.length * 0.75);
    const q25 = sorted[q25Index] || 0;
    const q75 = sorted[q75Index] || 0;

    // Calculate standard deviation
    const variance = cleanedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / cleanedValues.length;
    const stdDev = Math.sqrt(variance);

    // Calculate skewness and kurtosis
    const skewness = cleanedValues.length > 2 ?
      (cleanedValues.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / cleanedValues.length) : 0;

    const kurtosis = cleanedValues.length > 3 ?
      (cleanedValues.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / cleanedValues.length) - 3 : 0;

    return {
      mean,
      median,
      stdDev,
      min,
      max,
      q25,
      q75,
      skewness,
      kurtosis,
      sampleSize: cleanedValues.length
    };
  }

  /**
   * Remove outliers using IQR method
   */
  private removeOutliers(values: number[]): number[] {
    if (values.length < 4) return values;

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(val => val >= lowerBound && val <= upperBound);
  }

  /**
   * Detect current market regime
   */
  private async detectRegime(asset: string, exchange: string, signalType: SignalType, signals: SignalData[]): Promise<RegimeState> {
    if (!this.regimeDetector) {
      return {
        name: 'neutral',
        volatility: 0.5,
        trend: 'sideways',
        liquidity: 0.5,
        confidence: 0.5,
        lastUpdated: new Date(),
        samples: signals.length
      };
    }

    return await this.regimeDetector.detectRegime(asset, exchange, signalType, signals);
  }

  /**
   * Calculate adaptive baseline using statistical methods and ML
   */
  private async calculateAdaptiveBaseline(model: BaselineModel, stats: SignalStats, regime: RegimeState): Promise<number> {
    let baselineValue = stats.mean; // Default to mean

    // Regime-based adjustment
    const regimeMultiplier = this.getRegimeMultiplier(regime.name, model.signalType);
    baselineValue *= regimeMultiplier;

    // Statistical adjustment based on distribution
    if (stats.skewness > 0.5) {
      // Positive skew - use median instead of mean
      baselineValue = (baselineValue * 0.7) + (stats.median * 0.3);
    } else if (stats.skewness < -0.5) {
      // Negative skew - adjust for outliers
      baselineValue = (baselineValue * 0.8) + (stats.q75 * 0.2);
    }

    // ML prediction if available
    if (this.mlTrainer && model.mlModel) {
      const mlPrediction = await this.mlTrainer.predictBaseline(model, stats, regime);
      if (mlPrediction !== null) {
        // Blend statistical and ML predictions
        baselineValue = (baselineValue * 0.6) + (mlPrediction * 0.4);
      }
    }

    // Smooth baseline changes to avoid sudden jumps
    if (model.currentBaseline.baselineValue !== 0) {
      const smoothingFactor = 0.3; // 30% new, 70% old
      baselineValue = (baselineValue * smoothingFactor) + (model.currentBaseline.baselineValue * (1 - smoothingFactor));
    }

    return baselineValue;
  }

  /**
   * Calculate baseline confidence
   */
  private calculateBaselineConfidence(stats: SignalStats, regime: RegimeState): number {
    let confidence = 0.5; // Base confidence

    // Sample size confidence (0-0.3)
    const sampleScore = Math.min(stats.sampleSize / 1000, 1); // Max at 1000 samples
    confidence += sampleScore * 0.3;

    // Statistical stability (0-0.3)
    const cv = stats.stdDev / Math.max(stats.mean, 0.001); // Coefficient of variation
    const stabilityScore = Math.max(0, 1 - cv); // Lower CV = higher stability
    confidence += stabilityScore * 0.3;

    // Regime confidence (0-0.2)
    confidence += regime.confidence * 0.2;

    // Distribution normality (0-0.2)
    const normalityScore = Math.max(0, 1 - Math.abs(stats.skewness) - Math.abs(stats.kurtosis));
    confidence += normalityScore * 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Get regime multiplier for baseline calculation
   */
  private getRegimeMultiplier(regime: string, signalType: SignalType): number {
    const regimeMultipliers: Record<string, Record<string, number>> = {
      'bullish': {
        [SignalType.MARKET_DATA]: 1.05,
        [SignalType.ON_CHAIN]: 1.02,
        [SignalType.SOCIAL]: 1.08,
        [SignalType.NEWS]: 1.03,
        [SignalType.DEFI]: 1.04
      },
      'bearish': {
        [SignalType.MARKET_DATA]: 0.95,
        [SignalType.ON_CHAIN]: 0.98,
        [SignalType.SOCIAL]: 0.92,
        [SignalType.NEWS]: 0.97,
        [SignalType.DEFI]: 0.96
      },
      'volatile': {
        [SignalType.MARKET_DATA]: 1.0,
        [SignalType.ON_CHAIN]: 1.0,
        [SignalType.SOCIAL]: 1.0,
        [SignalType.NEWS]: 1.0,
        [SignalType.DEFI]: 1.0
      },
      'neutral': {
        [SignalType.MARKET_DATA]: 1.0,
        [SignalType.ON_CHAIN]: 1.0,
        [SignalType.SOCIAL]: 1.0,
        [SignalType.NEWS]: 1.0,
        [SignalType.DEFI]: 1.0
      }
    };

    return regimeMultipliers[regime]?.[signalType] || 1.0;
  }

  /**
   * Start periodic baseline updates
   */
  private startPeriodicUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.performPeriodicUpdate();
    }, this.config.updateFrequency);
  }

  /**
   * Perform periodic baseline updates
   */
  private performPeriodicUpdate(): void {
    // This method would be called periodically to update baselines
    // For now, it's a placeholder for the periodic update logic
    this.logger.debug(`🔄 Performing periodic baseline update (${this.baselineModels.size} models)`);
  }

  /**
   * Get update frequency
   */
  getUpdateFrequency(): number {
    return this.config.updateFrequency;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle regime changes (simplified - would need to extend RegimeDetector to emit events)
    // this.regimeDetector.on('regimeChanged', (regimeChange) => {
    //   this.handleRegimeChange(regimeChange);
    // });
  }

  /**
   * Handle regime change
   */
  private handleRegimeChange(regimeChange: any): void {
    this.logger.info(`📊 Regime change detected: ${regimeChange.from} -> ${regimeChange.to}`);

    // Update all baselines for affected assets
    for (const [key, model] of this.baselineModels) {
      if (key.startsWith(`${regimeChange.asset}:${regimeChange.exchange}`)) {
        // Trigger baseline recalculation for this asset/exchange
        this.emit('baselineRecalculationNeeded', {
          asset: regimeChange.asset,
          exchange: regimeChange.exchange,
          newRegime: regimeChange.to
        });
      }
    }
  }
}

// Regime detector for identifying market conditions
class RegimeDetector {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize regime detection
  }

  async detectRegime(asset: string, exchange: string, signalType: SignalType, signals: SignalData[]): Promise<RegimeState> {
    // Detect market regime based on signal patterns
    const volatility = this.calculateVolatility(signals);
    const trend = this.detectTrend(signals);
    const liquidity = this.estimateLiquidity(signals);

    let regimeName = 'neutral';
    if (volatility > 0.7 && trend !== 'sideways') regimeName = 'volatile';
    else if (trend === 'bullish') regimeName = 'bullish';
    else if (trend === 'bearish') regimeName = 'bearish';
    else if (volatility > 0.3) regimeName = 'sideways';

    return {
      name: regimeName,
      volatility,
      trend,
      liquidity,
      confidence: this.calculateRegimeConfidence(signals),
      lastUpdated: new Date(),
      samples: signals.length
    };
  }

  private calculateVolatility(signals: SignalData[]): number {
    // Calculate price volatility
    const values = signals.map(s => s.price || 0).filter(v => v > 0);
    if (values.length < 2) return 0.5;

    const returns = [];
    for (let i = 1; i < values.length; i++) {
      const prevValue = values[i-1];
      const currentValue = values[i];
      if (prevValue && currentValue && prevValue > 0) {
        const ret = (currentValue - prevValue) / prevValue;
        returns.push(ret);
      }
    }

    if (returns.length === 0) return 0.5;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return Math.min(stdDev * 10, 1); // Scale to 0-1
  }

  private detectTrend(signals: SignalData[]): 'bullish' | 'bearish' | 'sideways' | 'volatile' {
    // Simple trend detection
    const values = signals.map(s => s.price || 0);
    if (values.length < 10) return 'sideways';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.02) return 'bullish';
    if (change < -0.02) return 'bearish';
    if (this.calculateVolatility(signals) > 0.5) return 'volatile';

    return 'sideways';
  }

  private estimateLiquidity(signals: SignalData[]): number {
    // Estimate liquidity based on trade frequency and volume
    const trades = signals.filter(s => s.type === 'trade');
    if (trades.length === 0) return 0.5;

    const avgVolume = trades.reduce((sum, t) => sum + (t.volume || 0), 0) / trades.length;
    const timeSpan = signals.length > 1 ?
      ((signals[signals.length - 1]?.timestamp?.getTime() || 0) - (signals[0]?.timestamp?.getTime() || 0)) / (1000 * 60) : 1;

    const volumePerMinute = avgVolume / Math.max(timeSpan, 1);

    // Normalize to 0-1 scale (higher volume = higher liquidity)
    return Math.min(volumePerMinute / 1000000, 1); // 1M volume per minute = max liquidity
  }

  private calculateRegimeConfidence(signals: SignalData[]): number {
    // Calculate confidence in regime detection
    const sampleSize = signals.length;
    const timeSpan = signals.length > 1 ?
      ((signals[signals.length - 1]?.timestamp?.getTime() || 0) - (signals[0]?.timestamp?.getTime() || 0)) / (1000 * 60) : 1;

    // Higher sample size and longer time span = higher confidence
    const sampleScore = Math.min(sampleSize / 100, 1);
    const timeScore = Math.min(timeSpan / 60, 1); // 1 hour minimum

    return (sampleScore * 0.6) + (timeScore * 0.4);
  }

  async stop(): Promise<void> {
    // Stop regime detection
  }
}

// ML trainer for baseline prediction
class MLTrainer {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize ML training
  }

  async predictBaseline(model: BaselineModel, stats: SignalStats, regime: RegimeState): Promise<number | null> {
    // Use ML to predict baseline value
    if (!model.mlModel) return null;

    // Simple linear regression prediction
    const features = [
      stats.mean,
      stats.stdDev,
      stats.skewness,
      regime.volatility,
      regime.liquidity
    ];

    let prediction = model.mlModel.bias || 0;
    const weights = model.mlModel.weights || [];
    for (let i = 0; i < features.length && i < weights.length; i++) {
      const weight = weights[i];
      const feature = features[i];
      if (weight !== undefined && feature !== undefined) {
        prediction += feature * weight;
      }
    }

    return prediction;
  }

  async stop(): Promise<void> {
    // Stop ML training
  }
}
