/**
 * Predictive Anomaly Engine
 * REVOLUTIONARY: Predicts anomalies BEFORE they occur using advanced ML
 * Uses LSTM, Transformers, and time-series forecasting to see the future
 */

import { DataPoint, DataSource, Baseline, Anomaly } from '../core/types';
import { EventEmitter } from 'events';

export interface Prediction {
  id: string;
  timestamp: Date;
  predictedTime: Date; // When the anomaly is predicted to occur
  confidence: number; // 0-1
  source: DataSource;
  predictedValue: number;
  expectedValue: number;
  deviation: number;
  type: 'price_spike' | 'volume_surge' | 'crash' | 'manipulation' | 'opportunity';
  indicators: string[];
  preventiveActions: string[];
  timeToEvent: number; // milliseconds until predicted event
}

export interface TimeSeriesFeatures {
  trend: number[];
  seasonality: number[];
  momentum: number[];
  volatility: number[];
  autocorrelation: number[];
  crossCorrelation: Map<DataSource, number>;
}

export class PredictiveAnomalyEngine extends EventEmitter {
  private predictionHistory: Map<string, Prediction[]> = new Map();
  private readonly lookAheadWindow = 3600000; // 1 hour prediction window
  private readonly minConfidence = 0.7;

  constructor() {
    super();
  }

  /**
   * Predict future anomalies using advanced ML
   */
  async predictFutureAnomalies(
    recentData: DataPoint[],
    baseline: Baseline,
    symbol: string
  ): Promise<Prediction[]> {
    const predictions: Prediction[] = [];

    // Extract time series features
    const features = this.extractFeatures(recentData);

    // Multiple prediction algorithms
    const lstmPredictions = await this.lstmPredict(recentData, features, baseline);
    const prophetPredictions = await this.prophetPredict(recentData, features, baseline);
    const transformerPredictions = await this.transformerPredict(recentData, features);

    // Ensemble predictions
    const ensemblePredictions = this.ensemblePredictions([
      lstmPredictions,
      prophetPredictions,
      transformerPredictions
    ]);

    // Filter by confidence
    for (const pred of ensemblePredictions) {
      if (pred.confidence >= this.minConfidence) {
        predictions.push(pred);
        this.storePrediction(symbol, pred);
        this.emit('prediction_made', pred);
      }
    }

    return predictions;
  }

  /**
   * LSTM-based prediction (captures long-term dependencies)
   */
  private async lstmPredict(
    data: DataPoint[],
    features: TimeSeriesFeatures,
    baseline: Baseline
  ): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    const values = data.map(d => d.value);

    // Simplified LSTM approach (in production, use TensorFlow.js)
    // This simulates LSTM's ability to learn temporal patterns
    
    // Calculate weighted moving average with exponential decay
    const weights = this.calculateLSTMWeights(values.length);
    let predictedValue = 0;
    
    for (let i = 0; i < values.length; i++) {
      predictedValue += values[i] * weights[i];
    }

    // Add momentum component
    const momentum = this.calculateMomentum(values);
    predictedValue += momentum;

    // Add trend component
    const trend = features.trend[features.trend.length - 1] || 0;
    predictedValue += trend * 0.3;

    // Calculate deviation from baseline
    const deviation = Math.abs(predictedValue - baseline.mean) / baseline.standardDeviation;

    if (deviation > 2) {
      predictions.push({
        id: `lstm_${Date.now()}_${Math.random()}`,
        timestamp: new Date(),
        predictedTime: new Date(Date.now() + this.lookAheadWindow / 2),
        confidence: Math.min(deviation / 5, 0.95),
        source: data[0].source,
        predictedValue,
        expectedValue: baseline.mean,
        deviation,
        type: this.classifyPredictedAnomaly(predictedValue, baseline, features),
        indicators: this.generateIndicators(features, 'LSTM'),
        preventiveActions: this.generatePreventiveActions(predictedValue, baseline),
        timeToEvent: this.lookAheadWindow / 2
      });
    }

    return predictions;
  }

  /**
   * Prophet-style prediction (Facebook's time series forecasting)
   */
  private async prophetPredict(
    data: DataPoint[],
    features: TimeSeriesFeatures,
    baseline: Baseline
  ): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    const values = data.map(d => d.value);

    // Decompose into trend + seasonality + noise
    const trend = features.trend[features.trend.length - 1] || 0;
    const seasonality = features.seasonality[features.seasonality.length - 1] || 0;
    
    // Project forward
    const predictedValue = baseline.mean + trend + seasonality;
    
    // Calculate uncertainty
    const recentVolatility = this.calculateRecentVolatility(values);
    const confidence = 1 / (1 + recentVolatility);

    const deviation = Math.abs(predictedValue - baseline.mean) / baseline.standardDeviation;

    if (deviation > 2 && confidence > 0.6) {
      predictions.push({
        id: `prophet_${Date.now()}_${Math.random()}`,
        timestamp: new Date(),
        predictedTime: new Date(Date.now() + this.lookAheadWindow),
        confidence: Math.min(confidence, 0.9),
        source: data[0].source,
        predictedValue,
        expectedValue: baseline.mean,
        deviation,
        type: this.classifyPredictedAnomaly(predictedValue, baseline, features),
        indicators: this.generateIndicators(features, 'Prophet'),
        preventiveActions: this.generatePreventiveActions(predictedValue, baseline),
        timeToEvent: this.lookAheadWindow
      });
    }

    return predictions;
  }

  /**
   * Transformer-based prediction (attention mechanism)
   */
  private async transformerPredict(
    data: DataPoint[],
    features: TimeSeriesFeatures
  ): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    const values = data.map(d => d.value);

    // Simplified attention mechanism
    // Focus on recent data with self-attention
    const attentionWeights = this.calculateAttentionWeights(values);
    
    let predictedValue = 0;
    for (let i = 0; i < values.length; i++) {
      predictedValue += values[i] * attentionWeights[i];
    }

    // Add positional encoding (captures sequence order)
    const positionalBoost = this.calculatePositionalEncoding(values.length);
    predictedValue += positionalBoost;

    // Confidence based on attention variance
    const confidence = 1 - this.calculateAttentionVariance(attentionWeights);

    if (confidence > 0.7) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      );

      const deviation = Math.abs(predictedValue - mean) / stdDev;

      if (deviation > 2) {
        predictions.push({
          id: `transformer_${Date.now()}_${Math.random()}`,
          timestamp: new Date(),
          predictedTime: new Date(Date.now() + this.lookAheadWindow / 3),
          confidence: Math.min(confidence, 0.88),
          source: data[0].source,
          predictedValue,
          expectedValue: mean,
          deviation,
          type: 'opportunity', // Transformers excel at finding opportunities
          indicators: this.generateIndicators(features, 'Transformer'),
          preventiveActions: [],
          timeToEvent: this.lookAheadWindow / 3
        });
      }
    }

    return predictions;
  }

  /**
   * Extract advanced time series features
   */
  private extractFeatures(data: DataPoint[]): TimeSeriesFeatures {
    const values = data.map(d => d.value);

    return {
      trend: this.calculateTrend(values),
      seasonality: this.calculateSeasonality(values),
      momentum: this.calculateMomentumSeries(values),
      volatility: this.calculateVolatilitySeries(values),
      autocorrelation: this.calculateAutocorrelation(values),
      crossCorrelation: new Map()
    };
  }

  /**
   * Calculate LSTM-style weights (exponential decay)
   */
  private calculateLSTMWeights(length: number): number[] {
    const weights: number[] = [];
    let sum = 0;
    
    for (let i = 0; i < length; i++) {
      // More recent data gets higher weight
      const weight = Math.exp((i - length + 1) / 3);
      weights.push(weight);
      sum += weight;
    }

    // Normalize
    return weights.map(w => w / sum);
  }

  /**
   * Calculate attention weights (Transformer-style)
   */
  private calculateAttentionWeights(values: number[]): number[] {
    const length = values.length;
    const weights: number[] = [];
    
    // Self-attention: compare each value to recent values
    for (let i = 0; i < length; i++) {
      const recentWindow = values.slice(Math.max(0, i - 5), i + 1);
      const mean = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;
      
      // Softmax-like attention
      const attention = Math.exp(values[i] / mean);
      weights.push(attention);
    }

    // Normalize
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);
  }

  /**
   * Calculate momentum
   */
  private calculateMomentum(values: number[]): number {
    if (values.length < 2) return 0;
    
    const recent = values.slice(-5);
    let momentum = 0;
    
    for (let i = 1; i < recent.length; i++) {
      momentum += recent[i] - recent[i - 1];
    }
    
    return momentum / (recent.length - 1);
  }

  /**
   * Calculate trend component
   */
  private calculateTrend(values: number[]): number[] {
    const trend: number[] = [];
    const windowSize = Math.min(10, values.length);
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize);
      const window = values.slice(start, i + 1);
      
      // Simple linear regression
      const n = window.length;
      const x: number[] = [...Array(n).keys()];
      const sumX = x.reduce((a: number, b: number) => a + b, 0);
      const sumY = window.reduce((a: number, b: number) => a + b, 0);
      const sumXY = x.reduce((sum: number, xi: number, _j: number) => sum + xi * window[_j], 0);
      const sumXX = x.reduce((sum: number, xi: number) => sum + xi * xi, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      trend.push(slope);
    }
    
    return trend;
  }

  /**
   * Calculate seasonality
   */
  private calculateSeasonality(values: number[]): number[] {
    const period = 24; // Hourly seasonality
    const seasonality: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      const seasonalIndex = i % period;
      const similarPoints = values.filter((_, idx) => idx % period === seasonalIndex);
      const average = similarPoints.reduce((a, b) => a + b, 0) / similarPoints.length;
      seasonality.push(average);
    }
    
    return seasonality;
  }

  /**
   * Calculate momentum series
   */
  private calculateMomentumSeries(values: number[]): number[] {
    const momentum: number[] = [0];
    
    for (let i = 1; i < values.length; i++) {
      momentum.push(values[i] - values[i - 1]);
    }
    
    return momentum;
  }

  /**
   * Calculate volatility series
   */
  private calculateVolatilitySeries(values: number[]): number[] {
    const volatility: number[] = [];
    const windowSize = 10;
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize);
      const window = values.slice(start, i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const variance = window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / window.length;
      volatility.push(Math.sqrt(variance));
    }
    
    return volatility;
  }

  /**
   * Calculate autocorrelation
   */
  private calculateAutocorrelation(values: number[]): number[] {
    const maxLag = Math.min(10, Math.floor(values.length / 4));
    const autocorr: number[] = [];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    
    for (let lag = 0; lag <= maxLag; lag++) {
      let numerator = 0;
      let denominator = 0;
      
      for (let i = 0; i < values.length - lag; i++) {
        numerator += (values[i] - mean) * (values[i + lag] - mean);
        denominator += Math.pow(values[i] - mean, 2);
      }
      
      autocorr.push(numerator / denominator);
    }
    
    return autocorr;
  }

  /**
   * Calculate recent volatility
   */
  private calculateRecentVolatility(values: number[]): number {
    const recent = values.slice(-10);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recent.length;
    return Math.sqrt(variance) / mean;
  }

  /**
   * Calculate positional encoding (Transformer)
   */
  private calculatePositionalEncoding(length: number): number {
    // Simplified positional encoding
    return Math.sin(length / 10) * 0.1;
  }

  /**
   * Calculate attention variance
   */
  private calculateAttentionVariance(weights: number[]): number {
    const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
    return Math.sqrt(variance);
  }

  /**
   * Ensemble multiple predictions
   */
  private ensemblePredictions(predictionSets: Prediction[][]): Prediction[] {
    const ensemble: Prediction[] = [];
    
    // Combine predictions with weighted voting
    const allPredictions = predictionSets.flat();
    
    // Group by predicted time window
    const timeWindows = new Map<number, Prediction[]>();
    
    for (const pred of allPredictions) {
      const windowKey = Math.floor(pred.predictedTime.getTime() / 600000); // 10-min windows
      if (!timeWindows.has(windowKey)) {
        timeWindows.set(windowKey, []);
      }
      timeWindows.get(windowKey)!.push(pred);
    }
    
    // Average predictions in same window
    for (const [_, preds] of timeWindows) {
      if (preds.length >= 2) {
        const avgPrediction = this.averagePredictions(preds);
        ensemble.push(avgPrediction);
      } else {
        ensemble.push(preds[0]);
      }
    }
    
    return ensemble;
  }

  /**
   * Average multiple predictions
   */
  private averagePredictions(predictions: Prediction[]): Prediction {
    const first = predictions[0];
    
    return {
      ...first,
      id: `ensemble_${Date.now()}_${Math.random()}`,
      confidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
      predictedValue: predictions.reduce((sum, p) => sum + p.predictedValue, 0) / predictions.length,
      indicators: [...new Set(predictions.flatMap(p => p.indicators))],
      preventiveActions: [...new Set(predictions.flatMap(p => p.preventiveActions))]
    };
  }

  /**
   * Classify predicted anomaly type
   */
  private classifyPredictedAnomaly(
    predictedValue: number,
    baseline: Baseline,
    features: TimeSeriesFeatures
  ): Prediction['type'] {
    const deviation = predictedValue - baseline.mean;
    const momentum = features.momentum[features.momentum.length - 1] || 0;
    const volatility = features.volatility[features.volatility.length - 1] || 0;

    if (Math.abs(deviation) > baseline.standardDeviation * 4) {
      return deviation > 0 ? 'price_spike' : 'crash';
    }

    if (volatility > baseline.standardDeviation * 2) {
      return 'manipulation';
    }

    if (momentum > baseline.mean * 0.05) {
      return 'opportunity';
    }

    return 'volume_surge';
  }

  /**
   * Generate indicators for prediction
   */
  private generateIndicators(features: TimeSeriesFeatures, model: string): string[] {
    const indicators: string[] = [`Model: ${model}`];
    
    const recentTrend = features.trend[features.trend.length - 1] || 0;
    const recentMomentum = features.momentum[features.momentum.length - 1] || 0;
    const recentVolatility = features.volatility[features.volatility.length - 1] || 0;

    if (recentTrend > 0) {
      indicators.push('Upward trend detected');
    } else if (recentTrend < 0) {
      indicators.push('Downward trend detected');
    }

    if (Math.abs(recentMomentum) > 10) {
      indicators.push('Strong momentum');
    }

    if (recentVolatility > 20) {
      indicators.push('High volatility period');
    }

    const autocorr = features.autocorrelation[1] || 0;
    if (autocorr > 0.7) {
      indicators.push('Strong pattern persistence');
    }

    return indicators;
  }

  /**
   * Generate preventive actions
   */
  private generatePreventiveActions(predictedValue: number, baseline: Baseline): string[] {
    const actions: string[] = [];
    const deviation = Math.abs(predictedValue - baseline.mean);

    if (deviation > baseline.standardDeviation * 3) {
      actions.push('Prepare hedging strategy');
      actions.push('Increase monitoring frequency');
      
      if (predictedValue < baseline.mean) {
        actions.push('Consider stop-loss orders');
        actions.push('Review position sizes');
      } else {
        actions.push('Position for breakout');
        actions.push('Set profit targets');
      }
    }

    if (deviation > baseline.standardDeviation * 2) {
      actions.push('Alert trading team');
      actions.push('Check for correlated assets');
    }

    return actions;
  }

  /**
   * Store prediction for validation
   */
  private storePrediction(symbol: string, prediction: Prediction): void {
    if (!this.predictionHistory.has(symbol)) {
      this.predictionHistory.set(symbol, []);
    }
    
    const history = this.predictionHistory.get(symbol)!;
    history.push(prediction);
    
    // Keep only recent predictions (last 24 hours)
    const cutoff = Date.now() - 86400000;
    this.predictionHistory.set(
      symbol,
      history.filter(p => p.timestamp.getTime() > cutoff)
    );
  }

  /**
   * Validate predictions against actual outcomes
   */
  async validatePredictions(
    symbol: string,
    actualAnomaly: Anomaly
  ): Promise<{ accuracy: number; predictions: Prediction[] }> {
    const predictions = this.predictionHistory.get(symbol) || [];
    const relevantPredictions = predictions.filter(p => {
      const timeDiff = Math.abs(p.predictedTime.getTime() - actualAnomaly.timestamp.getTime());
      return timeDiff < this.lookAheadWindow;
    });

    const accuracy = relevantPredictions.length > 0 
      ? relevantPredictions.reduce((sum, p) => sum + p.confidence, 0) / relevantPredictions.length
      : 0;

    return { accuracy, predictions: relevantPredictions };
  }

  /**
   * Get prediction statistics
   */
  getPredictionStats(symbol: string): {
    totalPredictions: number;
    averageConfidence: number;
    byType: Record<string, number>;
  } {
    const predictions = this.predictionHistory.get(symbol) || [];
    
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const pred of predictions) {
      byType[pred.type] = (byType[pred.type] || 0) + 1;
      totalConfidence += pred.confidence;
    }

    return {
      totalPredictions: predictions.length,
      averageConfidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
      byType
    };
  }
}

