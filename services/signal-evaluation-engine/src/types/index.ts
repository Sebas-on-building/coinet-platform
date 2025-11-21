/**
 * =========================================
 * SIGNAL EVALUATION ENGINE TYPES
 * =========================================
 * Type definitions for the real-time signal evaluation engine
 */

export type SignalType =
  | 'social_media'
  | 'news'
  | 'defi_metrics'
  | 'on_chain'
  | 'price'
  | 'volume'
  | 'technical'
  | 'fundamental';

export type SignalSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retried';

export interface RawSignal {
  id: string;
  type: SignalType;
  source: string;
  timestamp: Date;
  data: any; // Raw signal data
  metadata: {
    sourceId: string;
    confidence: number; // 0-1
    version: string;
    tags: string[];
  };
}

export interface NormalizedSignal {
  id: string;
  type: SignalType;
  source: string;
  timestamp: Date;
  normalizedValues: Record<string, number>; // Z-score normalized features
  originalValues: Record<string, number>;   // Original feature values
  features?: FeatureVector; // Will be populated by FeatureExtractor
  metadata: {
    sourceId: string;
    confidence: number;
    normalizationMethod: 'z_score' | 'min_max' | 'robust';
    featureExtractionMethod: string;
    version: string;
  };
}

export interface FeatureVector {
  // Temporal features
  timestamp: number;
  timeOfDay: number; // Hour of day (0-23)
  dayOfWeek: number; // Day of week (0-6)

  // Signal characteristics
  magnitude: number; // Signal strength/intensity
  duration: number;  // Signal duration
  frequency: number; // Signal frequency

  // Statistical features
  mean: number;
  std: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  range: number;

  // Domain-specific features
  volatility: number;
  momentum: number;
  correlation: number;
  trend: number;

  // Composite features
  compositeScore: number; // Overall signal strength
  anomalyScore: number;   // Anomaly detection score
  impactScore: number;    // Market impact score
}

export interface FusionUpdate {
  id: string;
  timestamp: Date;
  signals: NormalizedSignal[];
  aggregatedFeatures: FeatureVector;
  fusionScore: number; // 0-1, higher = more significant
  confidence: number;  // 0-1, confidence in fusion
  recommendations: {
    action: 'alert' | 'investigate' | 'ignore';
    priority: 'low' | 'medium' | 'high' | 'critical';
    reasoning: string;
  };
}

export interface SignalCondition {
  id: string;
  name: string;
  description: string;
  type: 'threshold' | 'pattern' | 'correlation' | 'anomaly' | 'composite';
  enabled: boolean;

  // Condition parameters
  parameters: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    window: number; // Time window in seconds
    aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count';
  };

  // Logical operators for composite conditions
  logic?: {
    operator: 'AND' | 'OR' | 'NOT';
    conditions: string[]; // Condition IDs
  };

  // Actions to take when condition is met
  actions: {
    alert: boolean;
    severity: SignalSeverity;
    channels: string[]; // Alert channels
    cooldown: number;   // Minimum time between alerts (seconds)
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationResult {
  conditionId: string;
  signalId: string;
  timestamp: Date;
  status: ProcessingStatus;
  result: boolean; // Whether condition was met
  confidence: number; // 0-1
  details: {
    actualValue: number;
    expectedValue: number;
    deviation: number;
    explanation: string;
  };
  executionTime: number; // milliseconds
}

export interface StreamMetrics {
  topic: string;
  partition: number;
  processedCount: number;
  processedBytes: number;
  errorCount: number;
  avgLatency: number; // milliseconds
  throughput: number; // messages/second
  lastProcessed: Date;
}

export interface EngineMetrics {
  totalSignalsProcessed: number;
  signalsPerSecond: number;
  avgProcessingLatency: number;
  errorRate: number;
  activeConditions: number;
  fusionUpdates: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  uptime: number;
  timestamp: Date;
}

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  sessionTimeout: number;
  heartbeatInterval: number;
  maxPollRecords: number;
  autoCommit: boolean;
  autoCommitInterval: number;
}

export interface StreamConfig {
  inputTopics: string[];
  outputTopics: string[];
  errorTopic: string;
  deadLetterTopic: string;
  processingTimeout: number;
  batchSize: number;
  parallelism: number;
  exactlyOnce: boolean;
}

export interface NormalizationConfig {
  method: 'z_score' | 'min_max' | 'robust';
  windowSize: number; // For rolling statistics
  updateInterval: number; // How often to update normalization parameters
  outlierThreshold: number; // Z-score threshold for outliers
}

export interface FeatureExtractionConfig {
  enabledFeatures: string[];
  windowSizes: number[]; // Multiple time windows for features
  correlationThreshold: number;
  volatilityWindow: number;
  momentumWindow: number;
}

export interface FusionConfig {
  updateInterval: number; // How often to update fusion
  signalWeights: Record<SignalType, number>; // Weight for each signal type
  minSignals: number; // Minimum signals needed for fusion
  maxSignals: number; // Maximum signals to consider
  decayFactor: number; // Exponential decay for older signals
  confidenceThreshold: number;
}

export interface EvaluationConfig {
  maxConcurrentEvaluations: number;
  evaluationTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheTtl: number;
}

export interface HealthStatus {
  is_running: boolean;
  uptime_seconds: number;
  kafka_connected: boolean;
  redis_connected: boolean;
  processing_active: boolean;
  stream_metrics: Record<string, StreamMetrics>;
  engine_metrics: EngineMetrics;
  memory_usage: {
    heap_used_mb: number;
    heap_total_mb: number;
    external_mb: number;
  };
}

export interface EvaluationRequest {
  conditionId: string;
  signalIds: string[];
  timestamp?: Date;
  timeout?: number;
}

export interface EvaluationResponse {
  request: EvaluationRequest;
  results: EvaluationResult[];
  executionTime: number;
  success: boolean;
  errors: string[];
}

export interface StreamingEvent {
  type: 'signal_processed' | 'condition_evaluated' | 'fusion_updated' | 'anomaly_detected' | 'error';
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Import anomaly types for use in main engine
export type { AnomalyEvent, AnomalyConfig, SignalAnomalyConfig } from '../anomaly/types';

export interface ProcessingError {
  id: string;
  signalId: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  retry_count: number;
  timestamp: Date;
  will_retry: boolean;
}
