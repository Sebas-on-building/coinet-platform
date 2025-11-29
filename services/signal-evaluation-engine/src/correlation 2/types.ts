/**
 * =========================================
 * CROSS-SIGNAL CORRELATION ANALYSIS TYPES
 * =========================================
 * Type definitions for correlation analysis system
 */

import type { SignalType, NormalizedSignal } from '../types';

export interface CorrelationMatrix {
  signalTypes: SignalType[];
  matrix: number[][];
  timestamp: Date;
  metadata: {
    correlationMethod: 'pearson' | 'spearman';
    timeWindow: number; // minutes
    minDataPoints: number;
    significanceLevel: number;
  };
}

export interface CorrelationPair {
  signalType1: SignalType;
  signalType2: SignalType;
  correlation: number; // -1 to 1
  pValue: number; // statistical significance
  strength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative' | 'none';
  sampleSize: number;
  lastUpdated: Date;
}

export interface GrangerCausalityResult {
  cause: SignalType;
  effect: SignalType;
  fStatistic: number;
  pValue: number;
  lagOrder: number;
  isCausal: boolean;
  strength: 'weak' | 'moderate' | 'strong';
  direction: 'leads' | 'lags' | 'bidirectional';
}

export interface LeadLagRelationship {
  leading: SignalType;
  lagging: SignalType;
  lagPeriods: number; // how many periods the lagging signal trails
  strength: number; // 0-1
  confidence: number; // 0-1
  stability: number; // how consistent the relationship is over time
}

export interface SignalCluster {
  id: string;
  signals: SignalType[];
  convergenceScore: number; // 0-1, how often signals converge
  predictivePower: number; // 0-1, how well cluster predicts price moves
  cohesion: number; // 0-1, internal consistency of cluster
  centroid: number[]; // principal component centroid
  size: number;
  lastUpdated: Date;
}

export interface ConvergencePattern {
  clusterId: string;
  signals: SignalType[];
  convergenceTime: Date;
  duration: number; // minutes until price move
  strength: number; // 0-1
  priceMove: {
    direction: 'up' | 'down' | 'sideways';
    magnitude: number; // percentage change
    confidence: number; // 0-1
  };
  frequency: number; // how often this pattern occurs
}

export interface PCAResult {
  components: number[][]; // principal components
  explainedVariance: number[];
  cumulativeVariance: number[];
  loadings: number[][]; // component loadings for each signal type
  signalImportance: Record<SignalType, number>;
  reducedDimensions: number;
}

export interface CorrelationConfig {
  // Correlation analysis settings
  correlationMethods: ('pearson' | 'spearman')[];
  timeWindows: number[]; // minutes for different analysis periods
  minDataPoints: number;
  significanceLevel: number;

  // Granger causality settings
  granger: {
    maxLagOrder: number;
    minObservations: number;
    significanceLevel: number;
  };

  // Clustering settings
  clustering: {
    minClusterSize: number;
    maxClusters: number;
    convergenceThreshold: number;
    stabilityWindow: number; // days
  };

  // PCA settings
  pca: {
    varianceThreshold: number; // minimum variance to retain
    maxComponents: number;
    standardization: boolean;
  };

  // Update settings
  updateInterval: number; // minutes
  lookbackPeriod: number; // days
  adaptiveWeighting: {
    enabled: boolean;
    learningRate: number;
    decayFactor: number;
  };
}

export interface CorrelationAnalysisRequest {
  signalTypes: SignalType[];
  timeWindow?: number; // minutes
  correlationMethod?: 'pearson' | 'spearman';
  includeCausality?: boolean;
  includeClustering?: boolean;
  includePCA?: boolean;
}

export interface CorrelationAnalysisResponse {
  request: CorrelationAnalysisRequest;
  matrix: CorrelationMatrix;
  significantPairs: CorrelationPair[];
  causalityResults: GrangerCausalityResult[];
  clusters: SignalCluster[];
  convergencePatterns: ConvergencePattern[];
  pcaResult?: PCAResult;
  signals?: NormalizedSignal[]; // Added for consistency with usage in API
  analysisTime: number; // milliseconds
  timestamp: Date;
}

export interface AdaptiveWeightingUpdate {
  signalType: SignalType;
  correlationInfluence: number; // how much correlations affect this signal's weight
  clusterInfluence: number; // how much cluster membership affects weight
  causalityInfluence: number; // how much causality relationships affect weight
  newWeight: number;
  confidence: number; // confidence in the updated weight
  reasoning: string[];
}

export interface CorrelationInsights {
  dominantCorrelations: CorrelationPair[];
  predictiveClusters: SignalCluster[];
  leadLagRelationships: LeadLagRelationship[];
  dimensionalityReduction: {
    originalDimensions: number;
    reducedDimensions: number;
    informationRetained: number;
  };
  adaptiveUpdates: AdaptiveWeightingUpdate[];
  marketRegime: {
    correlations: CorrelationMatrix;
    clusters: SignalCluster[];
    regimeShift: boolean;
  };
}

export interface CorrelationMetrics {
  totalAnalyses: number;
  avgCorrelationStrength: number;
  mostCorrelatedPairs: CorrelationPair[];
  clusterCount: number;
  avgClusterSize: number;
  pcaVarianceExplained: number;
  causalityDetections: number;
  adaptiveWeightingUpdates: number;
  lastUpdated: Date;
}
