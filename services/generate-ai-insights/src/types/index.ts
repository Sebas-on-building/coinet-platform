/**
 * =========================================
 * AI INSIGHTS SERVICE TYPES
 * =========================================
 * Divine world-class type definitions for AI-powered recommendations
 */

import { z } from 'zod';

/**
 * Supported recommendation types
 */
export enum RecommendationType {
  SIGNAL_WEIGHT = 'signal_weight',
  NEW_DATA_SOURCE = 'new_data_source',
  ALERT_PARAMETER = 'alert_parameter',
  TIME_WINDOW = 'time_window',
  EXCHANGE_ADDITION = 'exchange_addition',
  SIGNAL_COMBINATION = 'signal_combination',
  RISK_ADJUSTMENT = 'risk_adjustment',
  PERFORMANCE_TUNING = 'performance_tuning'
}

/**
 * Supported recommendation priorities
 */
export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Supported recommendation impact levels
 */
export enum ImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Supported effort levels for implementation
 */
export enum EffortLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  COMPLEX = 'complex'
}

/**
 * Historical alert performance data
 */
export interface AlertPerformance {
  alertId: string;
  userId: string;
  timestamp: Date;
  signalType: string;
  symbol: string;
  exchange: string;
  triggerValue: number;
  actualOutcome: {
    price?: number;
    volume?: number;
    timestamp: Date;
    success: boolean;
  };
  accuracy: number;
  latency: number; // milliseconds
  confidence: number;
  roi?: number;
  metadata?: Record<string, any>;
}

/**
 * Signal correlation analysis
 */
export interface SignalCorrelation {
  signalA: string;
  signalB: string;
  correlation: number; // -1 to 1
  timeframe: string;
  sampleSize: number;
  significance: number; // p-value
  trend: 'positive' | 'negative' | 'neutral';
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

/**
 * User feedback data
 */
export interface UserFeedback {
  userId: string;
  alertId: string;
  timestamp: Date;
  rating: number; // 1-5
  comment?: string;
  categories: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  helpfulness: number; // 1-5
  actionTaken?: 'implemented' | 'ignored' | 'modified';
  metadata?: Record<string, any>;
}

/**
 * Data source information
 */
export interface DataSource {
  id: string;
  name: string;
  type: 'price' | 'volume' | 'orderbook' | 'funding' | 'liquidation' | 'social' | 'news';
  exchange?: string;
  reliability: number; // 0-1
  latency: number; // milliseconds
  coverage: string[]; // supported symbols
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

/**
 * AI recommendation structure
 */
export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: ImpactLevel;
  effort: EffortLevel;
  explanation: {
    reasoning: string;
    dataPoints: string[];
    alternatives?: string[];
    risks?: string[];
    benefits?: string[];
  };
  actions: RecommendationAction[];
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Recommendation action
 */
export interface RecommendationAction {
  type: string;
  signal?: string;
  exchange?: string;
  parameter?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
  estimatedImpact?: number;
}

/**
 * Insight generation request
 */
export interface InsightRequest {
  userId?: string;
  alertIds?: string[];
  signalTypes?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeCorrelations?: boolean;
  includeFeedback?: boolean;
  minConfidence?: number;
  maxRecommendations?: number;
  focusAreas?: string[];
}

/**
 * Insight generation result
 */
export interface InsightResult {
  success: boolean;
  recommendations: AIRecommendation[];
  summary: {
    totalDataPoints: number;
    analyzedPeriod: {
      start: Date;
      end: Date;
    };
    confidence: number;
    keyInsights: string[];
  };
  correlations?: SignalCorrelation[];
  performance?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  errors?: InsightError[];
  processingTime: number;
}

/**
 * Insight error with user-friendly messages
 */
export interface InsightError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'error' | 'warning' | 'info';
  suggestions?: string[];
  context?: Record<string, any>;
}

/**
 * ML model configuration
 */
export interface MLModelConfig {
  type: 'neural_network' | 'decision_tree' | 'random_forest' | 'gradient_boosting' | 'linear_regression' | 'ensemble_voting';
  parameters: Record<string, any>;
  training: {
    epochs?: number;
    batchSize?: number;
    validationSplit?: number;
    earlyStopping?: boolean;
    patience?: number;
    minDelta?: number;
    crossValidation?: boolean;
    folds?: number;
  };
  features: string[];
  target: string;
  version: string;
  lastTrained: Date;
  accuracy: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  validationLoss?: number;
}

/**
 * Dashboard insight visualization
 */
export interface DashboardInsight {
  id: string;
  type: 'recommendation' | 'correlation' | 'performance' | 'trend';
  title: string;
  description: string;
  data: any;
  visualization: {
    type: 'chart' | 'table' | 'metric' | 'heatmap';
    config: Record<string, any>;
  };
  actionable: boolean;
  priority: RecommendationPriority;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Feedback loop configuration
 */
export interface FeedbackLoopConfig {
  enabled: boolean;
  dataRetention: number; // days
  minFeedbackCount: number;
  autoImplementation: {
    enabled: boolean;
    minConfidence: number;
    maxRisk: ImpactLevel;
  };
  userConsent: {
    required: boolean;
    optOutEnabled: boolean;
  };
}

/**
 * AI insights service configuration
 */
export interface AIInsightsConfig {
  models: MLModelConfig[];
  dataSources: DataSource[];
  analysis: {
    lookbackPeriod: number; // days
    minSampleSize: number;
    confidenceThreshold: number;
    correlationThreshold: number;
  };
  recommendations: {
    maxPerRequest: number;
    types: RecommendationType[];
    priorities: RecommendationPriority[];
  };
  feedback: FeedbackLoopConfig;
  caching: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number;
  };
  performance: {
    maxConcurrentAnalyses: number;
    timeout: number; // seconds
    retryAttempts: number;
  };
  realtime: {
    enabled: boolean;
    updateInterval: number; // milliseconds
    maxConnections: number;
    heartbeatInterval: number; // milliseconds
  };
}

/**
 * Correlation matrix for signal analysis
 */
export interface CorrelationMatrix {
  signals: string[];
  matrix: number[][];
  timeframe: string;
  lastUpdated: Date;
  significance: number[][];
}

/**
 * Performance trend analysis
 */
export interface PerformanceTrend {
  signal: string;
  trend: 'improving' | 'declining' | 'stable';
  slope: number;
  rSquared: number;
  confidence: number;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * User behavior pattern
 */
export interface UserBehaviorPattern {
  userId: string;
  pattern: string;
  frequency: number;
  confidence: number;
  impact: ImpactLevel;
  recommendations: string[];
  lastSeen: Date;
}

/**
 * Zod schemas for validation
 */
export const AlertPerformanceSchema = z.object({
  alertId: z.string(),
  userId: z.string(),
  timestamp: z.date(),
  signalType: z.string(),
  symbol: z.string(),
  exchange: z.string(),
  triggerValue: z.number(),
  actualOutcome: z.object({
    price: z.number().optional(),
    volume: z.number().optional(),
    timestamp: z.date(),
    success: z.boolean()
  }),
  accuracy: z.number(),
  latency: z.number(),
  confidence: z.number(),
  roi: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

export const SignalCorrelationSchema = z.object({
  signalA: z.string(),
  signalB: z.string(),
  correlation: z.number(),
  timeframe: z.string(),
  sampleSize: z.number(),
  significance: z.number(),
  trend: z.enum(['positive', 'negative', 'neutral']),
  strength: z.enum(['weak', 'moderate', 'strong', 'very_strong']),
  lastUpdated: z.date(),
  metadata: z.record(z.any()).optional()
});

export const UserFeedbackSchema = z.object({
  userId: z.string(),
  alertId: z.string(),
  timestamp: z.date(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  categories: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  helpfulness: z.number().min(1).max(5),
  actionTaken: z.enum(['implemented', 'ignored', 'modified']).optional(),
  metadata: z.record(z.any()).optional()
});

export const AIRecommendationSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(RecommendationType),
  priority: z.nativeEnum(RecommendationPriority),
  title: z.string(),
  description: z.string(),
  confidence: z.number(),
  impact: z.nativeEnum(ImpactLevel),
  effort: z.nativeEnum(EffortLevel),
  explanation: z.object({
    reasoning: z.string(),
    dataPoints: z.array(z.string()),
    alternatives: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional()
  }),
  actions: z.array(z.object({
    type: z.string(),
    signal: z.string().optional(),
    exchange: z.string().optional(),
    parameter: z.string().optional(),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
    description: z.string(),
    estimatedImpact: z.number().optional()
  })),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

export const InsightRequestSchema = z.object({
  userId: z.string().optional(),
  alertIds: z.array(z.string()).optional(),
  signalTypes: z.array(z.string()).optional(),
  timeRange: z.object({
    start: z.date(),
    end: z.date()
  }).optional(),
  includeCorrelations: z.boolean().optional(),
  includeFeedback: z.boolean().optional(),
  minConfidence: z.number().optional(),
  maxRecommendations: z.number().optional(),
  focusAreas: z.array(z.string()).optional()
});

export const InsightResultSchema = z.object({
  success: z.boolean(),
  recommendations: z.array(AIRecommendationSchema),
  summary: z.object({
    totalDataPoints: z.number(),
    analyzedPeriod: z.object({
      start: z.date(),
      end: z.date()
    }),
    confidence: z.number(),
    keyInsights: z.array(z.string())
  }),
  correlations: z.array(SignalCorrelationSchema).optional(),
  performance: z.object({
    accuracy: z.number(),
    precision: z.number(),
    recall: z.number(),
    f1Score: z.number()
  }).optional(),
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    userMessage: z.string(),
    severity: z.enum(['error', 'warning', 'info']),
    suggestions: z.array(z.string()).optional(),
    context: z.record(z.any()).optional()
  })).optional(),
  processingTime: z.number()
});

export const AIInsightsConfigSchema = z.object({
  models: z.array(z.object({
    type: z.enum(['neural_network', 'decision_tree', 'random_forest', 'gradient_boosting', 'linear_regression', 'ensemble_voting']),
    parameters: z.record(z.any()),
    training: z.object({
      epochs: z.number().optional(),
      batchSize: z.number().optional(),
      validationSplit: z.number().optional(),
      earlyStopping: z.boolean().optional(),
      patience: z.number().optional(),
      minDelta: z.number().optional(),
      crossValidation: z.boolean().optional(),
      folds: z.number().optional()
    }),
    features: z.array(z.string()),
    target: z.string(),
    version: z.string(),
    lastTrained: z.date(),
    accuracy: z.number(),
    precision: z.number().optional(),
    recall: z.number().optional(),
    f1Score: z.number().optional(),
    validationLoss: z.number().optional()
  })),
  dataSources: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['price', 'volume', 'orderbook', 'funding', 'liquidation', 'social', 'news']),
    exchange: z.string().optional(),
    reliability: z.number(),
    latency: z.number(),
    coverage: z.array(z.string()),
    lastUpdated: z.date(),
    metadata: z.record(z.any()).optional()
  })),
  analysis: z.object({
    lookbackPeriod: z.number(),
    minSampleSize: z.number(),
    confidenceThreshold: z.number(),
    correlationThreshold: z.number()
  }),
  recommendations: z.object({
    maxPerRequest: z.number(),
    types: z.array(z.nativeEnum(RecommendationType)),
    priorities: z.array(z.nativeEnum(RecommendationPriority))
  }),
  feedback: z.object({
    enabled: z.boolean(),
    dataRetention: z.number(),
    minFeedbackCount: z.number(),
    autoImplementation: z.object({
      enabled: z.boolean(),
      minConfidence: z.number(),
      maxRisk: z.nativeEnum(ImpactLevel)
    }),
    userConsent: z.object({
      required: z.boolean(),
      optOutEnabled: z.boolean()
    })
  }),
  caching: z.object({
    enabled: z.boolean(),
    ttl: z.number(),
    maxSize: z.number()
  }),
  performance: z.object({
    maxConcurrentAnalyses: z.number(),
    timeout: z.number(),
    retryAttempts: z.number()
  }),
  realtime: z.object({
    enabled: z.boolean(),
    updateInterval: z.number(),
    maxConnections: z.number(),
    heartbeatInterval: z.number()
  })
});

// Type exports
export type AlertPerformanceType = z.infer<typeof AlertPerformanceSchema>;
export type SignalCorrelationType = z.infer<typeof SignalCorrelationSchema>;
export type UserFeedbackType = z.infer<typeof UserFeedbackSchema>;
export type AIRecommendationType = z.infer<typeof AIRecommendationSchema>;
export type InsightRequestType = z.infer<typeof InsightRequestSchema>;
export type InsightResultType = z.infer<typeof InsightResultSchema>;
export type AIInsightsConfigType = z.infer<typeof AIInsightsConfigSchema>;
