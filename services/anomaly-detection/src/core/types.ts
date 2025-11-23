/**
 * Anomaly Detection System - Core Types
 * World-class type definitions for AI-driven anomaly detection
 */

export enum AnomalyType {
  BENIGN = 'benign',
  EMERGING_THREAT = 'emerging_threat',
  OPPORTUNITY = 'opportunity',
  CRITICAL = 'critical'
}

export enum AnomalySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum DataSource {
  TRADING_VOLUME = 'trading_volume',
  SENTIMENT = 'sentiment',
  WALLET_ACTIVITY = 'wallet_activity',
  NETWORK_FEES = 'network_fees',
  PRICE_MOVEMENT = 'price_movement',
  SOCIAL_VOLUME = 'social_volume',
  ON_CHAIN_METRICS = 'on_chain_metrics',
  NEWS_FLOW = 'news_flow',
  LIQUIDITY = 'liquidity',
  MARKET_DEPTH = 'market_depth'
}

export interface DataPoint {
  timestamp: Date;
  source: DataSource;
  value: number;
  metadata: Record<string, unknown>;
  symbol?: string;
  chain?: string;
}

export interface Baseline {
  source: DataSource;
  symbol?: string;
  mean: number;
  standardDeviation: number;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    p99: number;
  };
  seasonalPatterns?: SeasonalPattern[];
  trendComponent?: number[];
  lastUpdated: Date;
  sampleSize: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface SeasonalPattern {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  amplitude: number;
  phase: number;
  confidence: number;
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  source: DataSource;
  type: AnomalyType;
  severity: AnomalySeverity;
  score: number; // 0-1, higher = more anomalous
  dataPoint: DataPoint;
  baseline: Baseline;
  deviation: {
    standardDeviations: number;
    percentileRank: number;
    absoluteDifference: number;
    relativeDifference: number; // percentage
  };
  context: AnomalyContext;
  classification: AnomalyClassification;
  suggestedActions: Action[];
  relatedAnomalies: string[]; // IDs of related anomalies
  metadata: Record<string, unknown>;
}

export interface AnomalyContext {
  historicalComparison: {
    similarEvents: number;
    lastOccurrence?: Date;
    averageImpact?: number;
  };
  marketConditions: {
    volatility: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    volume: 'high' | 'normal' | 'low';
  };
  correlatedEvents: CorrelatedEvent[];
  timeContext: {
    dayOfWeek: string;
    hour: number;
    isHoliday: boolean;
    isTradingHours: boolean;
  };
}

export interface CorrelatedEvent {
  source: DataSource;
  symbol?: string;
  timestamp: Date;
  correlation: number;
  description: string;
}

export interface AnomalyClassification {
  primaryCategory: string;
  subCategories: string[];
  confidence: number;
  reasoning: string[];
  domainKnowledge: string[];
}

export interface Action {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'investigate' | 'alert' | 'trade' | 'monitor' | 'hedge';
  description: string;
  details: string;
  estimatedImpact?: {
    potential: string;
    risk: string;
    timeframe: string;
  };
  prerequisites?: string[];
  automatable: boolean;
}

export interface MonitoringConfig {
  sources: DataSource[];
  symbols?: string[];
  chains?: string[];
  updateInterval: number; // milliseconds
  lookbackPeriod: number; // hours
  sensitivityThreshold: number; // 0-1
  enableRealTime: boolean;
  enableBatching: boolean;
  batchSize?: number;
  anomalyThresholds: {
    statistical: number; // standard deviations
    ml: number; // anomaly score threshold
    percentile: number; // percentile threshold
  };
}

export interface DetectionResult {
  timestamp: Date;
  anomalies: Anomaly[];
  baselineStats: Map<string, Baseline>;
  processingTime: number;
  dataPointsAnalyzed: number;
  summary: DetectionSummary;
}

export interface DetectionSummary {
  totalAnomalies: number;
  byType: Record<AnomalyType, number>;
  bySeverity: Record<AnomalySeverity, number>;
  bySource: Record<DataSource, number>;
  topAnomalies: Anomaly[];
  criticalActions: Action[];
  insights: string[];
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  truePositiveRate: number;
  lastTraining: Date;
  trainingSize: number;
  validationSize: number;
}

export interface LearningUpdate {
  timestamp: Date;
  baselineUpdates: number;
  newPatterns: number;
  improvedAccuracy: number;
  notes: string[];
}

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertChannel {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app',
  TELEGRAM = 'telegram'
}

