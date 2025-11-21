/**
 * =========================================
 * CONFIDENCE SCORING SYSTEM TYPES
 * =========================================
 * Type definitions for the signal confidence scoring system
 */

import type { SignalType } from '../types';

export interface ConfidenceFactors {
  dataFreshness: number;      // 0-1, how recent the data is
  sourceReliability: number;  // 0-1, historical reliability of the source
  historicalAccuracy: number; // 0-1, how accurate this signal type has been historically
  signalConsistency: number;  // 0-1, consistency with recent signals of same type
  marketRegimeFit: number;    // 0-1, appropriateness for current market regime
  signalStrength: number;     // 0-1, inherent strength/quality of the signal
}

export interface ConfidenceScore {
  signalId: string;
  signalType: SignalType;
  overallScore: number;       // 0-1, final confidence score
  factors: ConfidenceFactors;
  timestamp: Date;
  metadata: {
    calculationMethod: string;
    normalizationType: 'z_score' | 'min_max';
    timeDecayApplied: boolean;
    weightsUsed: SignalTypeWeights;
  };
}

export interface SignalTypeWeights {
  market: number;     // Weight for market signals (price, volume, technical)
  onChain: number;    // Weight for on-chain signals (defi_metrics, on_chain)
  social: number;     // Weight for social signals (social_media, news)
}

export interface SourceReliability {
  sourceId: string;
  reliabilityScore: number;   // 0-1
  totalSignals: number;
  accurateSignals: number;
  lastUpdated: Date;
  historicalPerformance: {
    accuracyByMarketRegime: Record<string, number>;
    accuracyBySignalType: Record<SignalType, number>;
  };
}

export interface MarketRegime {
  id: string;
  name: string;
  characteristics: {
    volatility: 'low' | 'medium' | 'high';
    trend: 'bull' | 'bear' | 'sideways';
    volume: 'low' | 'medium' | 'high';
    sentiment: 'fear' | 'greed' | 'neutral';
  };
  confidence: number; // 0-1, confidence in regime detection
  startTime: Date;
  duration: number; // minutes
}

export interface HistoricalAccuracy {
  signalType: SignalType;
  accuracyScore: number;      // 0-1
  totalPredictions: number;
  correctPredictions: number;
  byMarketRegime: Record<string, number>;
  lastUpdated: Date;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ConsistencyMetrics {
  signalType: SignalType;
  consistencyScore: number;   // 0-1
  recentSignals: number;      // Count of recent signals analyzed
  standardDeviation: number;  // Consistency measure
  lastUpdated: Date;
}

export interface ConfidenceConfig {
  // Normalization settings
  normalizationType: 'z_score' | 'min_max';
  timeDecay: {
    enabled: boolean;
    halfLifeMinutes: number;    // How quickly confidence decays
    maxAgeMinutes: number;      // Maximum age before confidence becomes 0
  };

  // Factor weights
  factorWeights: {
    dataFreshness: number;
    sourceReliability: number;
    historicalAccuracy: number;
    signalConsistency: number;
    marketRegimeFit: number;
    signalStrength: number;
  };

  // Signal type weights
  signalTypeWeights: SignalTypeWeights;

  // Market regime settings
  marketRegime: {
    detectionWindow: number;    // Minutes to analyze for regime detection
    minConfidence: number;      // Minimum confidence to trust regime detection
    regimeTransitionThreshold: number; // When to consider regime change
  };

  // Backtesting settings
  backtesting: {
    enabled: boolean;
    lookbackPeriod: number;     // Days to look back for calibration
    validationPeriod: number;   // Days to validate weights
    minSampleSize: number;      // Minimum samples for reliable backtesting
  };

  // Adaptive weighting settings for integration with correlation analysis
  adaptiveWeighting: {
    learningRate: number;
    decayFactor: number;
  };
}

export interface BacktestingResult {
  config: ConfidenceConfig;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalSignals: number;
    avgConfidence: number;
    accuracy: number;           // How well confidence correlated with outcomes
    calibrationScore: number;   // How well calibrated the confidence scores were
  };
  recommendations: {
    optimalWeights: SignalTypeWeights;
    factorImportance: Record<keyof ConfidenceFactors, number>;
    confidence: number;         // Confidence in these recommendations
  };
}

export interface ConfidenceRequest {
  signalId: string;
  signalType: SignalType;
  timestamp: Date;
  context?: {
    marketRegime?: MarketRegime;
    recentSignals?: string[];   // IDs of recent signals for consistency check
    sourceId?: string;
  };
}

export interface ConfidenceResponse {
  request: ConfidenceRequest;
  score: ConfidenceScore;
  calculationTime: number;    // milliseconds
  cached: boolean;
}
