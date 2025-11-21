/**
 * 🧠 DIVINE MARKET INTELLIGENCE ML TYPES
 *
 * Type definitions for deep learning models and data structures
 * Ensures type safety across the entire ML pipeline
 */

import { Tensor } from '@tensorflow/tfjs';

// ============================================================================
// CORE DATA TYPES
// ============================================================================

export interface MarketData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  volatility: number;
  technicalIndicators: TechnicalIndicators;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
  };
  support: number;
  resistance: number;
  volumeProfile: {
    poc: number; // Point of Control
    vah: number; // Value Area High
    val: number; // Value Area Low
  };
}

export interface SocialData {
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord';
  timestamp: number;
  content: string;
  author: string;
  sentiment: SentimentAnalysis;
  engagement: EngagementMetrics;
  influence: InfluenceMetrics;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  polarity: 'positive' | 'negative' | 'neutral';
  subjectivity: number; // 0 to 1
  emotions: EmotionScores;
  authenticity: number; // 0 to 1
  confidence: number; // 0 to 1
  trend: 'improving' | 'declining' | 'stable';
}

export interface EmotionScores {
  fear: number;
  greed: number;
  fomo: number; // Fear of Missing Out
  fud: number;  // Fear, Uncertainty, Doubt
  hopium: number; // Excessive optimism
  panic: number;
  euphoria: number;
  despair: number;
}

export interface EngagementMetrics {
  likes: number;
  retweets: number;
  replies: number;
  shares: number;
  views: number;
  comments: number;
  uniqueAuthors: number;
}

export interface InfluenceMetrics {
  authorFollowers: number;
  authorInfluence: number;
  networkReach: number;
  credibility: number;
  expertise: number;
}

export interface NewsData {
  source: string;
  title: string;
  content: string;
  url: string;
  publishedAt: number;
  sentiment: SentimentAnalysis;
  category: 'technical' | 'fundamental' | 'regulatory' | 'market' | 'adoption';
  importance: number; // 0 to 1
  reliability: number; // 0 to 1
}

export interface OnChainData {
  network: string;
  timestamp: number;
  blockNumber: number;
  address?: string;
  balance?: number;
  transactions: Transaction[];
  whaleActivity: WhaleActivity;
  gasMetrics: GasMetrics;
  networkActivity: NetworkActivity;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  timestamp: number;
  type: 'transfer' | 'swap' | 'mint' | 'burn' | 'contract';
}

export interface WhaleActivity {
  largeTransactions: Transaction[];
  accumulation: 'buying' | 'selling' | 'holding' | 'unknown';
  netFlow: number;
  whaleCount: number;
  largeTransfers: number; // count in last 24h
  whaleConcentration: number; // 0 to 1
}

export interface GasMetrics {
  averageGasPrice: number;
  gasUsed: number;
  gasLimit: number;
  congestionLevel: number; // 0 to 1
  priorityFee: number;
}

export interface NetworkActivity {
  activeAddresses: number;
  newAddresses: number;
  transactionCount: number;
  tvl: number; // Total Value Locked
  dexVolume: number;
  nftVolume: number;
}

// ============================================================================
// PSYCHOLOGY MODEL TYPES
// ============================================================================

export interface PsychologyFeatures {
  text: {
    socialPosts: string[];
    newsHeadlines: string[];
    marketCommentary: string[];
  };
  market: {
    priceSeries: number[];
    volumeSeries: number[];
    volatilityMetrics: number[];
  };
  social: {
    sentimentScores: number[];
    engagementMetrics: EngagementMetrics[];
    influenceGraphs: SocialGraph;
  };
  temporal: {
    timeOfDay: number;
    dayOfWeek: number;
    marketSession: 'asia' | 'europe' | 'us';
  };
  image?: {
    chartImages: any[]; // Base64 encoded or tensor representations
    patternImages: any[];
  };
  onchain?: {
    transactionGraphs: any;
    whaleActivity: any;
    networkMetrics: any;
  };
}

export interface SocialGraph {
  nodes: SocialNode[];
  edges: SocialEdge[];
}

export interface SocialNode {
  id: string;
  type: 'user' | 'topic' | 'entity';
  features: number[];
  influence: number;
}

export interface SocialEdge {
  source: string;
  target: string;
  type: 'follows' | 'mentions' | 'replies' | 'retweets';
  weight: number;
  timestamp: number;
}

export interface PsychologyLabels {
  emotionalState: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  manipulationRisk: 'low' | 'medium' | 'high' | 'extreme';
  biases: string[];
  warnings: string[];
}

export interface PsychologyPrediction {
  emotionalState: {
    prediction: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
    confidence: number;
    probabilities: Record<string, number>;
  };
  manipulationRisk: {
    prediction: 'low' | 'medium' | 'high' | 'extreme';
    confidence: number;
    probabilities: Record<string, number>;
  };
  biases: {
    detected: string[];
    confidence: number;
    explanations: string[];
  };
  warnings: {
    messages: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    reasoning: string[];
  };
  marketPsychology: {
    dominantEmotion: string;
    phaseOfCycle: 'accumulation' | 'markup' | 'distribution' | 'panic' | 'euphoria';
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    contrarianSignal: boolean;
    coolingOffSuggested: boolean;
  };
}

// ============================================================================
// ORACLE MODEL TYPES
// ============================================================================

export interface OracleFeatures {
  price: number[];
  volume: number[];
  socialSentiment: number[];
  whaleTransactions: Transaction[];
  newsSentiment: number[];
  technicalIndicators: TechnicalIndicators[];
  onchainMetrics: OnChainData[];
}

export interface OracleTargets {
  next1h: {
    direction: 'bullish' | 'bearish' | 'neutral';
    magnitude: number;
    probability: number;
  };
  next24h: {
    direction: 'bullish' | 'bearish' | 'neutral';
    magnitude: number;
    probability: number;
  };
  next7d: {
    direction: 'bullish' | 'bearish' | 'neutral';
    magnitude: number;
    probability: number;
  };
}

export interface OraclePrediction {
  predictions: {
    next1h: {
      direction: 'bullish' | 'bearish' | 'neutral';
      magnitude: number;
      probability: number;
      confidence: number;
    };
    next24h: {
      direction: 'bullish' | 'bearish' | 'neutral';
      magnitude: number;
      probability: number;
      confidence: number;
    };
    next7d: {
      direction: 'bullish' | 'bearish' | 'neutral';
      magnitude: number;
      probability: number;
      confidence: number;
    };
  };
  whaleActivity: 'accumulating' | 'distributing' | 'holding' | 'unknown';
  marketConsciousness: {
    dominantEmotion: string;
    phaseOfCycle: string;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  };
  turningPoints: string[];
  actionWindows: {
    action: 'buy' | 'sell' | 'hold' | 'watch';
    timeframe: string;
    confidence: number;
    reasoning: string;
  }[];
  uncertainty: {
    epistemic: number; // model uncertainty
    aleatoric: number; // data uncertainty
    total: number;
  };
}

// ============================================================================
// TRAINING DATA TYPES
// ============================================================================

export interface TrainingSample {
  id: string;
  features: PsychologyFeatures | OracleFeatures;
  labels: PsychologyLabels | OracleTargets;
  metadata: {
    timestamp: number;
    symbol: string;
    dataQuality: number;
    completeness: number;
    source: string;
  };
}

export interface TrainingDataset {
  train: TrainingSample[];
  validation: TrainingSample[];
  test: TrainingSample[];
  metadata: {
    createdAt: number;
    version: string;
    size: number;
    featureStatistics: Record<string, any>;
    labelDistribution: Record<string, number>;
  };
}

export interface ModelCheckpoint {
  modelId: string;
  epoch: number;
  timestamp: number;
  metrics: Record<string, number>;
  modelPath: string;
  optimizerState: any;
  bestMetric: string;
  bestValue: number;
}

// ============================================================================
// MODEL ARCHITECTURE TYPES
// ============================================================================

export interface ModelArchitecture {
  name: string;
  version: string;
  layers: Layer[];
  inputShape: number[];
  outputShape: number[];
  parameters: number;
  trainableParameters: number;
}

export interface Layer {
  type: string;
  name: string;
  config: Record<string, any>;
  inputShape?: number[];
  outputShape?: number[];
  parameters?: number;
}

export interface AttentionConfig {
  numHeads: number;
  keyDim: number;
  valueDim: number;
  dropout: number;
  useBias: boolean;
}

export interface TransformerConfig {
  numLayers: number;
  dModel: number;
  numHeads: number;
  dff: number;
  dropoutRate: number;
  layerNormEps: number;
}

// ============================================================================
// TRAINING TYPES
// ============================================================================

export interface TrainingConfig {
  modelId: string;
  dataset: TrainingDataset;
  hyperparameters: {
    batchSize: number;
    learningRate: number;
    epochs: number;
    optimizer: string;
    lossFunction: string;
    metrics: string[];
  };
  callbacks: {
    earlyStopping: boolean;
    modelCheckpoint: boolean;
    learningRateScheduler: boolean;
    tensorBoard: boolean;
  };
  distributed: {
    strategy: 'mirrored' | 'multi_worker' | 'parameter_server';
    numWorkers: number;
  };
}

export interface TrainingHistory {
  epoch: number[];
  metrics: Record<string, number[]>;
  loss: number[];
  valLoss: number[];
  learningRate: number[];
  timestamp: number;
  duration: number;
}

export interface TrainingResult {
  modelId: string;
  finalMetrics: Record<string, number>;
  bestMetrics: Record<string, number>;
  trainingHistory: TrainingHistory;
  modelPath: string;
  config: TrainingConfig;
  status: 'completed' | 'early_stopped' | 'failed';
  error?: string;
}

// ============================================================================
// INFERENCE TYPES
// ============================================================================

export interface InferenceRequest {
  modelId: string;
  input: PsychologyFeatures | OracleFeatures;
  options: {
    batchSize?: number;
    returnProbabilities?: boolean;
    returnUncertainty?: boolean;
    threshold?: number;
  };
}

export interface InferenceResponse {
  requestId: string;
  modelId: string;
  prediction: PsychologyPrediction | OraclePrediction;
  confidence: number;
  uncertainty?: {
    epistemic: number;
    aleatoric: number;
    total: number;
  };
  metadata: {
    inferenceTime: number;
    timestamp: number;
    version: string;
  };
}

// ============================================================================
// EVALUATION TYPES
// ============================================================================

export interface EvaluationMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  mse?: number;
  mae?: number;
  rmse?: number;
  r2Score?: number;
  calibrationError?: number;
  discriminationPower?: number;
  marketCorrelation?: number;
  sharpeRatio?: number;
  profitabilityScore?: number;
  directionalAccuracy?: number;
  directionalAccuracy1h?: number;
  directionalAccuracy24h?: number;
  directionalAccuracy7d?: number;
  magnitudeMAE?: number;
  magnitudeRMSE?: number;
  probabilityECE?: number;
}

export interface ModelEvaluation {
  modelId: string;
  dataset: string;
  metrics: EvaluationMetrics;
  confusionMatrix?: number[][];
  rocCurve?: { fpr: number[]; tpr: number[]; thresholds: number[] };
  calibrationCurve?: { predicted: number[]; actual: number[] };
  featureImportance?: Record<string, number>;
  crossValidation: {
    scores: number[];
    mean: number;
    std: number;
  };
  timestamp: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  timeliness: number;
  consistency: number;
  validity: number;
  uniqueness: number;
}

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  architecture: ModelArchitecture;
  trainingData: string;
  createdAt: number;
  updatedAt: number;
  author: string;
  tags: string[];
  performance: Record<string, number>;
  size: number; // bytes
}

export interface ModelRegistry {
  models: Record<string, ModelMetadata>;
  versions: Record<string, string[]>; // modelId -> [version1, version2, ...]
  aliases: Record<string, string>; // alias -> modelId:version
}

// Export all types for easy importing
export type * from './ml-types';
