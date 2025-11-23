/**
 * =========================================
 * ALERT EVALUATION ENGINE TYPES
 * =========================================
 * Type definitions for the rule-based alert system
 * with logical operators and real-time evaluation
 */

import type { SignalType, NormalizedSignal } from '../types';

// Rule AST Node Types
export type ASTNodeType =
  | 'signal_condition'
  | 'logical_and'
  | 'logical_or'
  | 'logical_not'
  | 'group' // For parentheses
  | 'sequence'; // For sequential patterns

export interface BaseASTNode {
  type: ASTNodeType;
  id: string;
}

export interface SignalConditionNode extends BaseASTNode {
  type: 'signal_condition';
  signalType: SignalType;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  field: string; // e.g., 'price', 'volume', 'sentiment_score'
  window?: number; // Optional time window in seconds
}

export interface LogicalOperatorNode extends BaseASTNode {
  type: 'logical_and' | 'logical_or' | 'logical_not';
  left?: ASTNode;
  right?: ASTNode;
}

export interface GroupNode extends BaseASTNode {
  type: 'group';
  expression: ASTNode;
}

export interface SequenceNode extends BaseASTNode {
  type: 'sequence';
  steps: ASTNode[];
  maxGap: number; // Maximum time gap between steps in seconds
  orderSensitive: boolean; // Whether order matters
  timeWeighted: boolean; // Whether to apply time-based scoring
  minMatches: number; // Minimum number of steps that must match
  temporalConstraints?: TemporalConstraints; // Advanced temporal constraints
  windowStrategy?: WindowStrategy; // Sliding window configuration
}

export interface TemporalConstraints {
  // Gap constraints between specific steps
  stepGaps?: Array<{
    fromStep: number;
    toStep: number;
    minGap?: number; // Minimum gap in seconds
    maxGap: number; // Maximum gap in seconds
    preferredGap?: number; // Preferred gap for optimal scoring
  }>;

  // Overall pattern timing
  totalDuration?: {
    min?: number; // Minimum total duration in seconds
    max?: number; // Maximum total duration in seconds
    preferred?: number; // Preferred duration for optimal scoring
  };

  // Step timing constraints
  stepTiming?: Array<{
    stepIndex: number;
    earliest?: number; // Earliest time after pattern start (seconds)
    latest?: number; // Latest time after pattern start (seconds)
    preferred?: number; // Preferred time for optimal scoring
  }>;

  // Temporal patterns (e.g., must happen during certain hours)
  timeOfDayConstraints?: Array<{
    stepIndex?: number; // If specified, applies to specific step; otherwise applies to entire pattern
    allowedHours?: number[]; // Hours of day (0-23)
    allowedDays?: number[]; // Days of week (0-6, Sunday = 0)
    timezone?: string;
  }>;
}

export interface WindowStrategy {
  type: 'fixed' | 'sliding' | 'expanding' | 'tumbling';
  size?: number; // Window size in seconds (for sliding/expanding)
  slideInterval?: number; // Slide interval in seconds (for sliding)
  maxWindows?: number; // Maximum number of concurrent windows
  allowOverlapping?: boolean; // Whether windows can overlap
  gracePeriod?: number; // Grace period for late arrivals (seconds)
}

export interface TimeWindow {
  id: string;
  patternId: string;
  startTime: Date;
  endTime: Date;
  windowType: WindowStrategy['type'];
  activeSteps: Map<number, {
    signal: NormalizedSignal;
    matchedAt: Date;
    confidence: number;
  }>;
  isComplete: boolean;
  isExpired: boolean;
  metadata: {
    totalSignals: number;
    matchedSteps: number;
    currentGap: number;
    windowUtilization: number;
  };
}

export type ASTNode = SignalConditionNode | LogicalOperatorNode | GroupNode | SequenceNode;

// Rule Definition
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  expression: string; // Human-readable expression like "price > 50000 AND volume > 1000000"
  ast: ASTNode; // Parsed AST
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata: {
    category: 'price' | 'volume' | 'social' | 'onchain' | 'technical' | 'composite';
    severity: 'info' | 'warning' | 'critical' | 'emergency';
    tags: string[];
    cooldownPeriod: number; // Minimum time between alerts in seconds
    cooldownConfig?: CooldownConfiguration; // Enhanced cooldown settings
  };
  conditions: {
    evaluationWindow: number; // Seconds to evaluate condition
    requiredSignals: number; // Minimum signals needed for evaluation
    stalenessThreshold: number; // Maximum signal age in seconds
    dynamicThresholds?: DynamicThresholdConfig; // Dynamic threshold configuration
  };
  channels?: {
    email: boolean;
    webhook: boolean;
    dashboard: boolean;
    telegram: boolean;
    discord: boolean;
  };
}

// Rule Evaluation Context
export interface RuleEvaluationContext {
  signals: Map<SignalType, NormalizedSignal[]>; // Signals by type
  currentTime: Date;
  evaluationWindow: number; // Seconds to look back
  signalHistory: Map<SignalType, NormalizedSignal[]>; // Historical signals for context
  rule?: AlertRule; // The rule being evaluated
}

// Sequential Pattern State
export interface PatternState {
  patternId: string;
  ruleId: string;
  startTime: Date;
  currentStep: number;
  matchedSteps: Array<{
    stepIndex: number;
    signal: NormalizedSignal;
    matchedAt: Date;
    confidence: number;
  }>;
  isActive: boolean;
  expiresAt: Date;
  metadata: {
    maxGap: number;
    orderSensitive: boolean;
    timeWeighted: boolean;
  };
}

// Sequential Pattern Match Result
export interface PatternMatchResult {
  patternId: string;
  ruleId: string;
  matchedAt: Date;
  matchedSteps: Array<{
    stepIndex: number;
    signal: NormalizedSignal;
    matchedAt: Date;
    confidence: number;
  }>;
  completeness: number; // 0-1, how complete the pattern is
  confidence: number; // 0-1, overall confidence
  timeWeightedScore: number; // Time-weighted score
  explanation: string;
  matchType: 'exact' | 'partial' | 'fuzzy';
  similarity?: number; // For fuzzy matches
  gapAnalysis?: {
    totalGaps: number;
    averageGap: number;
    maxGap: number;
    gapDistribution: number[];
  };
}

// Advanced Pattern Matching Types
export interface PatternMatcher {
  patternId: string;
  pattern: SequenceNode;
  matcherType: 'exact' | 'partial' | 'fuzzy';
  tolerance: number; // For fuzzy matching (0-1)
  allowSubsequences: boolean;
  allowGaps: boolean;
  maxGapTolerance: number; // Maximum gap deviation allowed
}

export interface FuzzyPatternMatcher {
  patternId: string;
  pattern: SequenceNode;
  similarityThreshold: number; // Minimum similarity for match (0-1)
  distanceMetric: 'euclidean' | 'manhattan' | 'cosine' | 'dtw';
  temporalTolerance: number; // Time tolerance in seconds
  amplitudeTolerance: number; // Value tolerance (0-1)
  sequenceAlignment: boolean; // Use sequence alignment algorithms
}

export interface PatternEvaluationOptions {
  enableFuzzyMatching: boolean;
  enablePartialMatching: boolean;
  enableGapAnalysis: boolean;
  maxConcurrentEvaluations: number;
  evaluationTimeout: number; // milliseconds
  memoryLimit: number; // MB
  patternComplexityLimit: number; // Maximum pattern steps
  stateMachine?: StateMachineConfig;
  scoring?: ScoringConfig;
}

export interface AdvancedPatternState extends PatternState {
  matchType: 'exact' | 'partial' | 'fuzzy';
  similarity?: number;
  partialMatches: Map<number, {
    stepIndex: number;
    signal: NormalizedSignal;
    similarity: number;
    matchedAt: Date;
  }>;
  gapHistory: Array<{
    fromStep: number;
    toStep: number;
    gapDuration: number;
    timestamp: Date;
  }>;
  stateTransitions: StateTransition[];
  lastTransitionAt: Date;
  transitionHistory: Array<{
    fromState: number;
    toState: number;
    transition: string;
    timestamp: Date;
    duration: number;
  }>;
}

// State Machine Types
export interface StateTransition {
  id: string;
  patternId: string;
  fromState: number;
  toState: number;
  transitionType: 'step_match' | 'timeout' | 'reset' | 'completion' | 'error' | 'initialization';
  timestamp: Date;
  duration: number;
  signal?: NormalizedSignal;
  metadata?: {
    confidence?: number;
    similarity?: number;
    gapDuration?: number;
  };
}

export interface PartialStateBuffer {
  patternId: string;
  bufferSize: number;
  maxBufferAge: number; // milliseconds
  states: Map<string, {
    state: AdvancedPatternState;
    addedAt: Date;
    lastAccessed: Date;
    accessCount: number;
  }>;
  compressionEnabled: boolean;
  compressionRatio: number;
}

export interface StateMachineConfig {
  enableTransitionTracking: boolean;
  enablePartialBuffering: boolean;
  maxTransitionsPerPattern: number;
  transitionHistorySize: number;
  stateValidationInterval: number; // milliseconds
  autoRecoveryEnabled: boolean;
  corruptionThreshold: number; // percentage
}

export interface ScoringStrategy {
  type: 'time_weighted' | 'confidence_weighted' | 'completeness_weighted' | 'gap_aware' | 'custom';
  weights?: {
    timeWeight: number; // 0-1, importance of timing
    confidenceWeight: number; // 0-1, importance of signal confidence
    completenessWeight: number; // 0-1, importance of pattern completeness
    gapWeight: number; // 0-1, importance of gap timing
  };
  customFormula?: (context: ScoringContext) => number;
}

export interface ScoringContext {
  patternState: AdvancedPatternState;
  sequenceNode: SequenceNode;
  totalDuration: number; // milliseconds
  averageGap: number; // milliseconds
  stepConfidences: number[];
  gapDistribution: number[];
  temporalConstraints?: TemporalConstraints;
}

export interface ScoringConfig {
  defaultStrategy: ScoringStrategy;
  enableGapAnalysis: boolean;
  enableTimeDecay: boolean;
  timeDecayFactor: number; // 0-1, how quickly scores decay over time
  minScoreThreshold: number; // Minimum score to trigger alert
  maxScoreCap: number; // Maximum possible score
  adaptiveThresholds: boolean; // Adjust thresholds based on historical performance
}

// Rule Evaluation Result
export interface RuleEvaluationResult {
  ruleId: string;
  evaluationTime: Date;
  triggered: boolean;
  confidence: number; // 0-1, confidence in the evaluation
  matchedSignals: NormalizedSignal[];
  patternMatches?: PatternMatchResult[]; // Sequential pattern matches
  context: {
    signalCounts: Record<SignalType, number>;
    evaluationDuration: number; // milliseconds
    lastSignalAge: number; // seconds
    patternStates: number; // Number of active pattern states
    thresholdAdaptations?: Array<{
      timestamp: Date;
      threshold: number;
      reason: string;
    }>; // Recent threshold adaptations for UI
  };
  explanation: string; // Human-readable explanation of why it triggered/didn't trigger
  metadata: {
    evaluationCount: number;
    totalEvaluationTime: number; // milliseconds
    avgEvaluationTime: number; // milliseconds
  };
}

// Alert Notification
export interface AlertNotification {
  id: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: Date;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  signals: NormalizedSignal[];
  context: {
    marketRegime?: string;
    confidence: number;
    explanation: string;
  };
  channels: {
    email: boolean;
    webhook: boolean;
    dashboard: boolean;
    telegram: boolean;
    discord: boolean;
  };
  metadata: {
    evaluationResult: RuleEvaluationResult;
    deliveryStatus: Record<string, 'pending' | 'sent' | 'failed'>;
    retryCount: number;
  };
}

// Rule Management
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  expression: string;
  parameters: Record<string, {
    type: 'number' | 'string' | 'boolean' | 'signal_type';
    default: any;
    min?: number;
    max?: number;
    options?: string[];
  }>;
  examples: string[];
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  performanceImpact: 'low' | 'medium' | 'high';
}

// Alert Studio UI Components
export interface AlertStudioState {
  currentRule: AlertRule | null;
  availableSignals: SignalType[];
  ruleTemplates: RuleTemplate[];
  expressionBuilder: {
    selectedSignals: SignalType[];
    operators: string[];
    currentExpression: string;
    validationErrors: string[];
  };
  preview: {
    isEvaluating: boolean;
    lastEvaluation?: RuleEvaluationResult;
    sampleSignals: NormalizedSignal[];
  };
}

// Performance Configuration
export interface AlertEngineConfig {
  evaluation: {
    maxConcurrentEvaluations: number;
    evaluationTimeout: number; // milliseconds
    batchSize: number; // Signals to evaluate together
    cacheTtl: number; // milliseconds
  };
  rules: {
    maxRules: number;
    maxExpressionLength: number;
    maxNestingDepth: number;
    validationTimeout: number; // milliseconds
  };
  notifications: {
    maxRetries: number;
    retryDelay: number; // milliseconds
    batchSize: number;
    queueSize: number;
  };
  performance: {
    enableMetrics: boolean;
    metricsInterval: number; // milliseconds
    enableProfiling: boolean;
  };
  baselines?: BaselineConfig; // Adaptive baseline configuration
}

// Metrics and Monitoring
export interface AlertEngineMetrics {
  rules: {
    total: number;
    active: number;
    averageEvaluationTime: number; // milliseconds
    evaluationCount: number;
    errorCount: number;
  };
  evaluations: {
    totalPerSecond: number;
    averageLatency: number; // milliseconds
    p95Latency: number; // milliseconds
    p99Latency: number; // milliseconds
  };
  notifications: {
    sent: number;
    failed: number;
    pending: number;
    averageDeliveryTime: number; // milliseconds
  };
  cache: {
    hitRate: number; // percentage
    size: number; // entries
    memoryUsage: number; // MB
  };
  timestamp: Date;
}

// Real-time Updates
export interface RuleUpdateEvent {
  type: 'rule_created' | 'rule_updated' | 'rule_deleted' | 'rule_activated' | 'rule_deactivated';
  ruleId: string;
  timestamp: Date;
  changes?: Partial<AlertRule>;
}

export interface EvaluationEvent {
  type: 'evaluation_started' | 'evaluation_completed' | 'evaluation_failed';
  ruleId: string;
  evaluationId: string;
  timestamp: Date;
  duration?: number;
  result?: RuleEvaluationResult;
  error?: string;
}

export interface AlertEvent {
  type: 'alert_triggered' | 'alert_sent' | 'alert_failed';
  alertId: string;
  ruleId: string;
  timestamp: Date;
  channels: string[];
  error?: string;
}

// API Interfaces
export interface CreateRuleRequest {
  name: string;
  description: string;
  expression: string;
  metadata: AlertRule['metadata'];
  conditions: AlertRule['conditions'];
}

export interface UpdateRuleRequest {
  ruleId: string;
  updates: Partial<Pick<AlertRule, 'name' | 'description' | 'expression' | 'isActive' | 'metadata' | 'conditions'>>;
}

export interface EvaluateRuleRequest {
  ruleId: string;
  context?: Partial<RuleEvaluationContext>;
  forceEvaluation?: boolean; // Skip caching
}

export interface EvaluateRuleResponse {
  request: EvaluateRuleRequest;
  result: RuleEvaluationResult;
  cached: boolean;
  evaluationTime: number; // milliseconds
}

export interface BulkRuleOperationRequest {
  operation: 'activate' | 'deactivate' | 'delete';
  ruleIds: string[];
  reason?: string;
}

export interface BulkRuleOperationResponse {
  operation: string;
  successCount: number;
  failureCount: number;
  errors: Array<{
    ruleId: string;
    error: string;
  }>;
}

// Error Types
export class RuleParsingError extends Error {
  constructor(message: string, public position?: number) {
    super(message);
    this.name = 'RuleParsingError';
  }
}

export class RuleValidationError extends Error {
  constructor(message: string, public ruleId?: string) {
    super(message);
    this.name = 'RuleValidationError';
  }
}

export class RuleEvaluationError extends Error {
  constructor(message: string, public ruleId?: string, public evaluationId?: string) {
    super(message);
    this.name = 'RuleEvaluationError';
  }
}

export class AlertDeliveryError extends Error {
  constructor(message: string, public alertId?: string, public channel?: string) {
    super(message);
    this.name = 'AlertDeliveryError';
  }
}

// Adaptive Baselines Types
export interface MarketRegime {
  id: string;
  name: string;
  characteristics: {
    volatility: 'low' | 'medium' | 'high';
    trend: 'bull' | 'bear' | 'sideways';
    volume: 'low' | 'medium' | 'high';
    liquidity: 'low' | 'medium' | 'high';
  };
  confidence: number; // 0-1, confidence in regime detection
  startTime: Date;
  duration: number; // minutes
  signalPatterns: Record<string, BaselineStats>;
}

export interface BaselineStats {
  mean: number;
  median: number;
  standardDeviation: number;
  percentiles: {
    p5: number;
    p25: number;
    p75: number;
    p95: number;
  };
  range: {
    min: number;
    max: number;
  };
  sampleSize: number;
  lastUpdated: Date;
}

export interface SignalBaseline {
  signalType: string;
  assetClass?: string;
  userId?: string;
  currentRegime: string;
  regimeBaselines: Record<string, BaselineStats>;
  overallBaseline: BaselineStats;
  anomalyThresholds: {
    zScore: number;
    percentile: number;
    custom: number;
  };
  updateFrequency: number; // milliseconds
  windowSize: number; // number of samples in sliding window
}

export interface AnomalyDetection {
  signalId: string;
  signalType: string;
  value: number;
  baseline: number;
  deviation: number;
  zScore: number;
  percentile: number;
  anomalyType: 'outlier' | 'trend_break' | 'regime_shift' | 'structural_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  timestamp: Date;
  regime: string;
}

export interface RegimeShift {
  fromRegime: string;
  toRegime: string;
  shiftTime: Date;
  confidence: number; // 0-1
  indicators: {
    volatilityChange: number;
    volumeChange: number;
    priceChange: number;
    correlationChange: number;
  };
  duration: number; // minutes since last shift
}

export interface BaselineConfig {
  // Statistical configuration
  statistical: {
    windowSizes: number[]; // Different window sizes for analysis
    outlierThreshold: number; // Z-score threshold for outliers
    trendSensitivity: number; // 0-1, how sensitive to trend changes
    seasonalityEnabled: boolean;
    seasonalPeriod: number; // minutes
  };

  // Machine learning configuration
  ml: {
    enabled: boolean;
    modelTypes: ('linear' | 'polynomial' | 'neural' | 'ensemble')[];
    retrainInterval: number; // hours
    minSamplesForTraining: number;
    predictionHorizon: number; // minutes
    featureEngineering: {
      lagFeatures: number[];
      rollingStats: boolean;
      volatilityFeatures: boolean;
    };
  };

  // Regime detection
  regimeDetection: {
    enabled: boolean;
    windowSize: number; // minutes
    minRegimeDuration: number; // minutes
    transitionThreshold: number; // 0-1, when to detect regime change
    volatilityBands: {
      low: number;
      medium: number;
      high: number;
    };
  };

  // Update and maintenance
  maintenance: {
    cleanupInterval: number; // hours
    maxHistoryAge: number; // days
    compressionEnabled: boolean;
    backupEnabled: boolean;
  };
}

// Dynamic Threshold Configuration Types
export interface DynamicThresholdConfig {
  enabled: boolean;
  adaptationStrategy: 'bayesian' | 'reinforcement_learning' | 'statistical' | 'hybrid';
  baseThreshold: number; // Starting threshold value
  adaptationRate: number; // 0-1, how quickly thresholds adapt
  userRiskTolerance: 'conservative' | 'moderate' | 'aggressive'; // User risk preference
  signalStrengthWeight: number; // 0-1, importance of signal strength in adaptation
  historicalPerformanceWeight: number; // 0-1, importance of historical performance
  marketRegimeWeight: number; // 0-1, importance of market conditions
  manualOverrides: ManualThresholdOverride[]; // Manual overrides
  performanceTracking: ThresholdPerformanceTracking;
  bayesian?: BayesianThresholdConfig;
  reinforcementLearning?: ReinforcementLearningConfig;
  statistical?: StatisticalThresholdConfig;
}

export interface ManualThresholdOverride {
  id: string;
  signalType: SignalType;
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  reason: string;
  appliedBy: string;
  appliedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface ThresholdPerformanceTracking {
  enabled: boolean;
  windowSize: number; // Hours to track performance
  metrics: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
    averageConfidence: number;
  };
  lastUpdated: Date;
}

export interface BayesianThresholdConfig {
  priorStrength: number; // Strength of prior beliefs (0-1)
  learningRate: number; // How quickly to update beliefs (0-1)
  evidenceWeight: number; // Weight given to new evidence (0-1)
  uncertaintyThreshold: number; // Threshold for considering evidence uncertain
  convergenceThreshold: number; // When to stop updating (0-1)
  maxIterations: number;
  useConjugatePrior: boolean;
  priorDistribution: 'beta' | 'normal' | 'gamma';
}

export interface ReinforcementLearningConfig {
  algorithm: 'q_learning' | 'policy_gradient' | 'actor_critic';
  stateSpace: ThresholdStateSpace;
  actionSpace: ThresholdActionSpace;
  learningRate: number; // Alpha (0-1)
  discountFactor: number; // Gamma (0-1)
  explorationRate: number; // Epsilon (0-1)
  explorationDecay: number; // How quickly exploration decreases
  experienceBufferSize: number;
  batchSize: number;
  targetUpdateFrequency: number;
  rewardFunction: ThresholdRewardFunction;
}

export interface StatisticalThresholdConfig {
  method: 'moving_average' | 'exponential_smoothing' | 'regression' | 'quantile';
  windowSize: number; // Data points for calculation
  smoothingFactor: number; // For exponential smoothing (0-1)
  confidenceLevel: number; // For quantile method (0-1)
  outlierDetection: {
    enabled: boolean;
    method: 'z_score' | 'isolation_forest';
    threshold: number;
  };
  trendAnalysis: {
    enabled: boolean;
    method: 'linear' | 'polynomial' | 'seasonal';
    degree: number; // For polynomial regression
  };
}

export interface ThresholdStateSpace {
  signalStrength: number[];
  historicalPerformance: number[];
  marketConditions: string[];
  timeOfDay: number[];
  dayOfWeek: number[];
  volatility: number[];
  volume: number[];
}

export interface ThresholdActionSpace {
  thresholdMultiplier: number[]; // Multipliers to apply to base threshold
  adaptationRate: number[]; // Different adaptation rates to try
  signalWeight: number[]; // Different signal strength weights
  performanceWeight: number[]; // Different performance weights
}

export interface ThresholdRewardFunction {
  truePositiveReward: number;
  falsePositivePenalty: number;
  trueNegativeReward: number;
  falseNegativePenalty: number;
  confidenceBonus: number; // Bonus for high confidence predictions
  timelinessBonus: number; // Bonus for timely alerts
  userFeedbackWeight: number; // Weight given to user feedback
}

export interface ThresholdAdaptationContext {
  signalStrength: number; // 0-1, current signal strength
  historicalPerformance: number; // 0-1, recent performance score
  marketConditions: string; // Current market regime
  userRiskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeContext: {
    hour: number;
    dayOfWeek: number;
    isWeekend: boolean;
    isHoliday: boolean;
  };
  marketVolatility: number; // 0-1
  signalNoise: number; // 0-1, estimated noise level
  recentAlerts: number; // Number of recent alerts
  userFeedback?: {
    rating: number; // 1-5, user rating of alert quality
    feedback: string;
    timestamp: Date;
  };
}

export interface AdaptedThreshold {
  originalThreshold: number;
  adaptedThreshold: number;
  adaptationReason: string;
  confidence: number; // 0-1, confidence in adaptation
  factors: {
    signalStrength: number;
    historicalPerformance: number;
    marketConditions: number;
    userRiskTolerance: number;
    manualOverride?: number;
  };
  algorithm: string; // Which algorithm was used
  timestamp: Date;
  expiresAt?: Date;
}

export interface ThresholdVisualizationData {
  currentThreshold: number;
  historicalThresholds: Array<{
    timestamp: Date;
    threshold: number;
    reason: string;
  }>;
  performanceMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
    falsePositiveRate: number;
  };
  adaptationFactors: {
    signalStrength: number;
    marketConditions: number;
    historicalPerformance: number;
    userRiskTolerance: number;
  };
  recommendations: string[];
  alertsTriggered: number;
  alertsAvoided: number;
}

export interface ThresholdOptimizationResult {
  optimalThreshold: number;
  confidence: number;
  expectedPerformance: {
    precision: number;
    recall: number;
    f1Score: number;
  };
  uncertainty: number;
  convergenceAchieved: boolean;
  iterationsUsed: number;
  algorithm: string;
}

// Enhanced Cooldown System Types
export interface CooldownConfiguration {
  enabled: boolean;
  baseCooldownPeriod: number; // Base cooldown in seconds
  adaptiveCooldown: boolean; // Enable adaptive cooldown based on asset volatility
  criticalAnomalyBypass: boolean; // Allow critical anomalies to bypass cooldown
  criticalThreshold: number; // Threshold for critical anomaly detection (0-1)
  assetVolatilityMultiplier: number; // Multiplier based on asset volatility (0.5-2.0)
  userToleranceMultiplier: number; // Multiplier based on user tolerance (0.5-2.0)
  groupingEnabled: boolean; // Enable alert grouping
  groupingWindow: number; // Window for grouping similar alerts (seconds)
  maxGroupSize: number; // Maximum alerts in a group before triggering
  spamSuppressionStats: CooldownStatistics;
}

export interface AssetSignalKey {
  assetId: string; // Asset identifier
  signalType: SignalType; // Type of signal
  signalField?: string; // Specific field within signal type
  severity: 'info' | 'warning' | 'critical' | 'emergency'; // Alert severity
}

export interface CooldownEntry {
  key: AssetSignalKey;
  lastAlertTime: Date;
  alertCount: number; // Number of alerts during current cooldown
  cooldownPeriod: number; // Current cooldown period in milliseconds
  expiresAt: Date;
  isCritical: boolean; // Whether this entry is for critical alerts
  groupedAlerts: AlertNotification[]; // Alerts grouped during cooldown
}

export interface CooldownStatistics {
  totalCooldowns: number;
  totalSuppressedAlerts: number;
  totalCriticalBypasses: number;
  averageCooldownPeriod: number; // Average cooldown period in seconds
  assetCooldownStats: Map<string, {
    cooldownCount: number;
    suppressedCount: number;
    averageCooldown: number;
    lastAlertTime: Date;
  }>;
  signalTypeCooldownStats: Map<SignalType, {
    cooldownCount: number;
    suppressedCount: number;
    averageCooldown: number;
  }>;
  effectivenessScore: number; // 0-1, how effective cooldown is at preventing spam
  lastUpdated: Date;
}

export interface AlertGroup {
  id: string;
  key: AssetSignalKey;
  alerts: AlertNotification[];
  createdAt: Date;
  expiresAt: Date;
  summaryMessage: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  isTriggered: boolean; // Whether group has been sent as alert
}

export interface CriticalAnomalyDetection {
  enabled: boolean;
  threshold: number; // 0-1, confidence threshold for critical anomaly
  lookbackWindow: number; // Seconds to look back for anomaly detection
  volatilityThreshold: number; // Volatility threshold for anomaly detection
  consecutiveAlertsThreshold: number; // Number of consecutive alerts to trigger critical
  statisticalMethods: ('z_score' | 'iqr' | 'isolation_forest')[];
}

export interface CooldownEvent {
  type: 'cooldown_started' | 'cooldown_expired' | 'alert_suppressed' | 'critical_bypass' | 'group_triggered';
  timestamp: Date;
  ruleId: string;
  assetSignalKey: AssetSignalKey;
  cooldownPeriod: number;
  reason: string;
  metadata?: {
    suppressedCount?: number;
    groupSize?: number;
    criticalLevel?: number;
  };
}

// Push Notification Service Types
export type NotificationPlatform = 'fcm' | 'apns' | 'web';
export type NotificationPriority = 'low' | 'normal' | 'high';
export type NotificationSound = 'default' | 'none' | 'custom';

export interface NotificationConfig {
  enabled: boolean;
  platforms: {
    fcm: {
      enabled: boolean;
      serverKey: string;
      projectId: string;
      rateLimit: number;
    };
    apns: {
      enabled: boolean;
      keyId: string;
      teamId: string;
      bundleId: string;
      sandbox: boolean;
      rateLimit: number;
    };
    web: {
      enabled: boolean;
      vapidKeys: {
        publicKey: string;
        privateKey: string;
      };
    };
  };
  queue: {
    enabled: boolean;
    maxQueueSize: number;
    batchSize: number;
    processingInterval: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  security: {
    tokenEncryption: boolean;
    auditLogging: boolean;
  };
}

export interface DeviceToken {
  id: string;
  userId: string;
  platform: NotificationPlatform;
  token: string;
  deviceInfo: {
    os: string;
    osVersion: string;
    appVersion: string;
    deviceModel: string;
    p256dh?: string; // For web push subscriptions
    auth?: string;    // For web push subscriptions
  };
  isActive: boolean;
  registeredAt: Date;
  lastUsedAt: Date;
  expiresAt?: Date;
}

export interface NotificationMessage {
  id: string;
  userId: string;
  alertId: string;
  payload: PushNotificationPayload;
  priority: NotificationPriority;
  platform: NotificationPlatform;
  tokenId: string;
  createdAt: Date;
  scheduledFor?: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'queued' | 'sending' | 'sent' | 'failed' | 'retrying';
  error?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  subtitle?: string; // Optional subtitle for notifications
  data?: Record<string, any>;
  sound?: NotificationSound;
  badge?: number;
  category?: string;
  threadId?: string;
  priority?: NotificationPriority;
  contentAvailable?: boolean; // For background notifications
  mutableContent?: boolean; // For iOS notification extensions
  image?: string;
  actionButtons?: Array<{
    id: string;
    title: string;
    action?: string;
  }>;
}
