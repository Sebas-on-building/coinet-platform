/**
 * =========================================
 * ALERT EVALUATION TYPES
 * =========================================
 * Divine world-class type definitions for alert condition evaluation
 * Comprehensive interfaces for rules, baselines, thresholds, and patterns
 */

import { z } from 'zod';
// Note: RawMarketSignal and NormalizedMarketSignal are imported from market-signal-processor
// For now, defining simplified versions here

export interface RawMarketSignal {
  id?: string;
  exchange: string;
  symbol: string;
  timestamp: number;
  signalType: 'trade' | 'quote' | 'orderbook' | 'liquidation' | 'funding_rate' | 'open_interest';
  assetType: 'spot' | 'futures' | 'options' | 'perpetual' | 'margin';
  rawData?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface NormalizedMarketSignal extends RawMarketSignal {
  normalizedAt: Date;
  normalizationVersion: string;
  sourceId?: string;
  // Core data (varies by signal type)
  price?: number;
  volume?: number;
  side?: 'buy' | 'sell' | 'long' | 'short';
  bid?: number;
  ask?: number;
  bidVolume?: number;
  askVolume?: number;
  spread?: number;
  midPrice?: number;
  fundingRate?: number;
  fundingTime?: number;
  markPrice?: number;
  indexPrice?: number;
  openInterest?: number;
  change?: number;
  changePercent?: number;
  // Enriched data
  momentumScore?: number;
  volatility?: number;
  liquidityScore?: number;
  orderBookImbalance?: number;
  marketDepth?: number;
}

// =========================================
// CORE ALERT RULE TYPES
// =========================================

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Alert rule status
 */
export enum AlertRuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

/**
 * Comparison operators for conditions
 */
export enum ComparisonOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  INCREASES_BY = 'increases_by',
  DECREASES_BY = 'decreases_by',
  WITHIN_PERCENTAGE = 'within_percentage',
  OUTSIDE_PERCENTAGE = 'outside_percentage'
}

/**
 * Logical operators for combining conditions
 */
export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not',
  XOR = 'xor'
}

/**
 * Time windows for evaluation
 */
export enum TimeWindow {
  INSTANT = 'instant',
  MINUTE_1 = '1m',
  MINUTE_5 = '5m',
  MINUTE_15 = '15m',
  HOUR_1 = '1h',
  HOUR_4 = '4h',
  HOUR_24 = '24h',
  WEEK_1 = '1w'
}

/**
 * Metric types for evaluation
 */
export enum MetricType {
  PRICE = 'price',
  VOLUME = 'volume',
  SPREAD = 'spread',
  LIQUIDITY = 'liquidity',
  VOLATILITY = 'volatility',
  MOMENTUM = 'momentum',
  ORDERBOOK_IMBALANCE = 'orderbook_imbalance',
  FUNDING_RATE = 'funding_rate',
  OPEN_INTEREST = 'open_interest',
  MARKET_DEPTH = 'market_depth'
}

// =========================================
// ADAPTIVE BASELINES
// =========================================

/**
 * Adaptive baseline configuration
 */
export interface AdaptiveBaseline {
  /** Baseline ID */
  id: string;

  /** Metric type */
  metricType: MetricType;

  /** Time window for calculation */
  window: TimeWindow;

  /** Adaptive method */
  method: 'rolling_mean' | 'rolling_median' | 'exponential_moving_average' | 'seasonal_decomposition';

  /** Parameters for the method */
  parameters: {
    alpha?: number; // For EMA
    seasonalPeriods?: number; // For seasonal decomposition
    trendSmoothing?: number; // For seasonal decomposition
    seasonalSmoothing?: number; // For seasonal decomposition
  };

  /** Update frequency */
  updateFrequency: TimeWindow;

  /** Minimum samples required */
  minSamples: number;

  /** Maximum age for samples */
  maxAge: TimeWindow;
}

/**
 * Calculated baseline value
 */
export interface BaselineValue {
  /** Baseline ID */
  baselineId: string;

  /** Current value */
  value: number;

  /** Confidence level (0-1) */
  confidence: number;

  /** Last updated timestamp */
  lastUpdated: number;

  /** Sample count used */
  sampleCount: number;

  /** Trend direction */
  trend: 'increasing' | 'decreasing' | 'stable';

  /** Trend strength (0-1) */
  trendStrength: number;
}

// =========================================
// DYNAMIC THRESHOLDS
// =========================================

/**
 * Dynamic threshold configuration
 */
export interface DynamicThreshold {
  /** Threshold ID */
  id: string;

  /** Metric type */
  metricType: MetricType;

  /** Baseline reference */
  baselineId: string;

  /** Threshold type */
  type: 'absolute' | 'percentage' | 'standard_deviation' | 'z_score';

  /** Threshold value (interpreted based on type) */
  value: number;

  /** Direction (above/below baseline) */
  direction: 'above' | 'below' | 'both';

  /** Sensitivity adjustment */
  sensitivity: number;

  /** Seasonal adjustment */
  seasonalAdjustment?: {
    enabled: boolean;
    period: TimeWindow;
    amplitude: number;
  };

  /** Volatility adjustment */
  volatilityAdjustment?: {
    enabled: boolean;
    lookbackPeriod: TimeWindow;
    multiplier: number;
  };
}

/**
 * Calculated threshold value
 */
export interface ThresholdValue {
  /** Threshold ID */
  thresholdId: string;

  /** Current threshold value */
  value: number;

  /** Baseline value used */
  baselineValue: number;

  /** Adjustment factors applied */
  adjustments: {
    seasonal?: number;
    volatility?: number;
    sensitivity?: number;
  };

  /** Last calculated timestamp */
  lastCalculated: number;
}

// =========================================
// SEQUENCE PATTERNS
// =========================================

/**
 * Pattern element for sequence matching
 */
export interface PatternElement {
  /** Metric type */
  metricType: MetricType;

  /** Operator for comparison */
  operator: ComparisonOperator;

  /** Value for comparison */
  value: number;

  /** Time constraint (relative to sequence start) */
  timeConstraint?: {
    minDelay?: TimeWindow;
    maxDelay?: TimeWindow;
  };

  /** Optional baseline reference */
  baselineId?: string;

  /** Optional threshold reference */
  thresholdId?: string;
}

/**
 * Sequence pattern definition
 */
export interface SequencePattern {
  /** Pattern ID */
  id: string;

  /** Pattern name */
  name: string;

  /** Pattern description */
  description: string;

  /** Pattern elements in sequence */
  elements: PatternElement[];

  /** Maximum time between first and last element */
  maxDuration: TimeWindow;

  /** Minimum occurrences for pattern */
  minOccurrences: number;

  /** Pattern strength (0-1) */
  strength: number;

  /** Pattern confidence (0-1) */
  confidence: number;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  /** Pattern ID */
  patternId: string;

  /** Sequence of signals that matched */
  matchedSignals: NormalizedMarketSignal[];

  /** Match timestamp */
  timestamp: number;

  /** Match strength (0-1) */
  strength: number;

  /** Confidence in match (0-1) */
  confidence: number;

  /** Pattern completion percentage */
  completion: number;
}

// =========================================
// ALERT RULE DEFINITION
// =========================================

/**
 * Single condition in an alert rule
 */
export interface AlertCondition {
  /** Condition ID */
  id: string;

  /** Metric type to evaluate */
  metricType: MetricType;

  /** Comparison operator */
  operator: ComparisonOperator;

  /** Value for comparison */
  value: number;

  /** Optional baseline reference */
  baselineId?: string;

  /** Optional threshold reference */
  thresholdId?: string;

  /** Optional pattern reference */
  patternId?: string;

  /** Time window for evaluation */
  timeWindow: TimeWindow;

  /** Aggregation method */
  aggregation: 'last' | 'avg' | 'max' | 'min' | 'sum' | 'count';

  /** Condition weight for scoring */
  weight: number;
}

/**
 * Alert rule definition
 */
export interface AlertRule {
  /** Rule ID */
  id: string;

  /** Rule name */
  name: string;

  /** Rule description */
  description: string;

  /** Rule status */
  status: AlertRuleStatus;

  /** Rule severity */
  severity: AlertSeverity;

  /** Exchange filter */
  exchanges: string[];

  /** Symbol filter (regex pattern) */
  symbols: string[];

  /** Asset type filter */
  assetTypes: string[];

  /** Signal type filter */
  signalTypes: string[];

  /** Conditions (combined with logical operators) */
  conditions: AlertCondition[];

  /** Logical combination of conditions */
  logic: LogicalOperator[];

  /** Minimum score for alert trigger */
  minScore: number;

  /** Maximum score for alert suppression */
  maxScore?: number;

  /** Cooldown period after trigger */
  cooldownPeriod: TimeWindow;

  /** Rule priority (higher = more important) */
  priority: number;

  /** Rule tags for categorization */
  tags: string[];

  /** Creation timestamp */
  createdAt: number;

  /** Last modified timestamp */
  updatedAt: number;

  /** Created by user */
  createdBy: string;

  /** Rule version */
  version: string;
}

// =========================================
// EVALUATION CONTEXT
// =========================================

/**
 * Context for alert evaluation
 */
export interface EvaluationContext {
  /** Signal being evaluated */
  signal: NormalizedMarketSignal;

  /** Historical signals for pattern matching */
  historicalSignals: NormalizedMarketSignal[];

  /** Current baselines */
  baselines: Map<string, BaselineValue>;

  /** Current thresholds */
  thresholds: Map<string, ThresholdValue>;

  /** Active patterns */
  patterns: Map<string, SequencePattern>;

  /** Rule index for fast lookup */
  ruleIndex: RuleIndex;

  /** Evaluation timestamp */
  timestamp: number;

  /** Request ID for tracing */
  requestId: string;
}

/**
 * Rule index for fast evaluation
 */
export interface RuleIndex {
  /** Rules indexed by exchange */
  byExchange: Map<string, AlertRule[]>;

  /** Rules indexed by symbol pattern */
  bySymbol: Map<string, AlertRule[]>;

  /** Rules indexed by asset type */
  byAssetType: Map<string, AlertRule[]>;

  /** Rules indexed by signal type */
  bySignalType: Map<string, AlertRule[]>;

  /** Rules indexed by metric type */
  byMetricType: Map<MetricType, AlertRule[]>;

  /** Rules indexed by priority */
  byPriority: Map<number, AlertRule[]>;

  /** Total rule count */
  totalRules: number;

  /** Last index update */
  lastUpdated: number;
}

// =========================================
// EVALUATION RESULTS
// =========================================

/**
 * Single condition evaluation result
 */
export interface ConditionResult {
  /** Condition ID */
  conditionId: string;

  /** Rule ID */
  ruleId: string;

  /** Whether condition was met */
  met: boolean;

  /** Actual value */
  actualValue: number;

  /** Expected value */
  expectedValue: number;

  /** Score contribution */
  score: number;

  /** Confidence in evaluation */
  confidence: number;

  /** Evaluation timestamp */
  evaluatedAt: number;
}

/**
 * Single rule evaluation result
 */
export interface RuleEvaluationResult {
  /** Rule ID */
  ruleId: string;

  /** Whether rule was triggered */
  triggered: boolean;

  /** Total score */
  score: number;

  /** Maximum possible score */
  maxScore: number;

  /** Condition results */
  conditionResults: ConditionResult[];

  /** Pattern matches (if any) */
  patternMatches: PatternMatch[];

  /** Evaluation timestamp */
  evaluatedAt: number;

  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Batch evaluation result
 */
export interface EvaluationResult {
  /** Request ID */
  requestId: string;

  /** Signal evaluated */
  signal: NormalizedMarketSignal;

  /** Matching rules */
  matchingRules: RuleEvaluationResult[];

  /** Non-matching rules (for debugging) */
  nonMatchingRules: RuleEvaluationResult[];

  /** Total rules evaluated */
  totalRules: number;

  /** Processing time in milliseconds */
  totalProcessingTime: number;

  /** Evaluation timestamp */
  evaluatedAt: number;

  /** Cache hit ratio */
  cacheHitRatio: number;
}

// =========================================
// SERVICE INTERFACES
// =========================================

/**
 * Alert rule storage interface
 */
export interface IAlertRuleStorage {
  /** Get all active rules */
  getActiveRules(): Promise<AlertRule[]>;

  /** Get rules by IDs */
  getRulesByIds(ids: string[]): Promise<AlertRule[]>;

  /** Get rules by exchange */
  getRulesByExchange(exchange: string): Promise<AlertRule[]>;

  /** Get rules by symbol pattern */
  getRulesBySymbol(symbolPattern: string): Promise<AlertRule[]>;

  /** Update rule index */
  updateRuleIndex(rules: AlertRule[]): Promise<void>;

  /** Get rule statistics */
  getRuleStats(): Promise<{
    totalRules: number;
    activeRules: number;
    rulesBySeverity: Record<AlertSeverity, number>;
    rulesByExchange: Record<string, number>;
  }>;
}

/**
 * Baseline storage interface
 */
export interface IBaselineStorage {
  /** Get baseline value */
  getBaseline(baselineId: string): Promise<BaselineValue | null>;

  /** Update baseline value */
  updateBaseline(baseline: BaselineValue): Promise<void>;

  /** Get baselines for metric */
  getBaselinesForMetric(metricType: MetricType): Promise<BaselineValue[]>;

  /** Invalidate baselines */
  invalidateBaselines(metricType?: MetricType): Promise<void>;
}

/**
 * Threshold storage interface
 */
export interface IThresholdStorage {
  /** Get threshold value */
  getThreshold(thresholdId: string): Promise<ThresholdValue | null>;

  /** Update threshold value */
  updateThreshold(threshold: ThresholdValue): Promise<void>;

  /** Get thresholds for metric */
  getThresholdsForMetric(metricType: MetricType): Promise<ThresholdValue[]>;
}

/**
 * Pattern storage interface
 */
export interface IPatternStorage {
  /** Get pattern definition */
  getPattern(patternId: string): Promise<SequencePattern | null>;

  /** Get active patterns */
  getActivePatterns(): Promise<SequencePattern[]>;

  /** Update pattern */
  updatePattern(pattern: SequencePattern): Promise<void>;
}

/**
 * Signal cache interface
 */
export interface ISignalCache {
  /** Get cached signal */
  get(key: string): NormalizedMarketSignal[] | undefined;

  /** Set cached signals */
  set(key: string, signals: NormalizedMarketSignal[], ttl: number): void;

  /** Invalidate cache for key pattern */
  invalidate(pattern: string): void;

  /** Get cache statistics */
  getStats(): {
    hits: number;
    misses: number;
    hitRatio: number;
    size: number;
  };
}

// =========================================
// CONFIGURATION
// =========================================

/**
 * Service configuration
 */

// =========================================
// ZOD SCHEMAS
// =========================================

export const MetricTypeSchema = z.nativeEnum(MetricType);
export const ComparisonOperatorSchema = z.nativeEnum(ComparisonOperator);
export const LogicalOperatorSchema = z.nativeEnum(LogicalOperator);
export const AlertSeveritySchema = z.nativeEnum(AlertSeverity);
export const AlertRuleStatusSchema = z.nativeEnum(AlertRuleStatus);
export const TimeWindowSchema = z.nativeEnum(TimeWindow);

// Export type inference
export const EvaluateAlertConditionsConfigSchema = z.object({
  port: z.number(),
  host: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string().optional(),
    db: z.number(),
  }),
  cache: z.object({
    defaultTTL: z.number(),
    maxSize: z.number(),
    checkPeriod: z.number(),
  }),
  performance: z.object({
    maxEvaluationTime: z.number(),
    batchSize: z.number(),
    concurrencyLimit: z.number(),
    cacheHitTarget: z.number(),
  }),
  indexing: z.object({
    updateInterval: z.number(),
    maxIndexSize: z.number(),
    enablePatternIndexing: z.boolean(),
  }),
  observability: z.object({
    metrics: z.object({
      enabled: z.boolean(),
      port: z.number(),
      path: z.string(),
    }),
    logging: z.object({
      level: z.string(),
      structured: z.boolean(),
    }),
  }),
});

export type EvaluateAlertConditionsConfig = z.infer<typeof EvaluateAlertConditionsConfigSchema>;
