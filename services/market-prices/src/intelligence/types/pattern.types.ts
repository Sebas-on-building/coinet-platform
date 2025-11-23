/**
 * =========================================
 * PATTERN MINING TYPES
 * =========================================
 * Type definitions for the Pattern Mining & Prediction System
 * Divine perfection in type safety
 */

/**
 * Access pattern record - captures user behavior
 */
export interface AccessPattern {
  userId: string;
  requestedTokens: string[];
  timestamp: Date;
  sessionId: string;
  sequence: number; // Position in session (1st request, 2nd, etc.)
  timeOfDay: number; // Hour (0-23)
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  marketCondition: 'bull' | 'bear' | 'neutral' | 'extreme_volatile';
  requestType: 'single' | 'portfolio' | 'market_overview';
  responseTime: number; // ms
  cached: boolean;
  userAgent?: string;
  region?: string;
}

/**
 * Frequent pattern discovered by Apriori algorithm
 */
export interface FrequentPattern {
  tokens: string[];
  support: number; // Frequency (0-1) - % of sessions containing this pattern
  confidence: number; // P(Y|X) for association rule X→Y (0-1)
  lift: number; // Lift score - measures independence
  conviction: number; // Conviction score - measures implication strength
  createdAt: Date;
  lastSeen: Date;
  occurrences: number;
}

/**
 * Sequential pattern (order matters)
 */
export interface SequentialPattern {
  sequence: string[]; // Ordered list of tokens
  support: number; // Frequency (0-1)
  avgTimeBetween: number; // Average time between requests (ms)
  stdDevTimeBetween: number; // Standard deviation of time gaps
  confidence: number; // Probability of sequence completion
  createdAt: Date;
  lastSeen: Date;
  occurrences: number;
}

/**
 * Temporal pattern (time-based)
 */
export interface TemporalPattern {
  tokens: string[];
  timeOfDay: number; // Hour (0-23)
  dayOfWeek?: number; // Optional - specific day
  support: number;
  avgVolume: number; // Average request volume at this time
  volatilityScore: number; // How volatile requests are at this time
  createdAt: Date;
}

/**
 * User behavior profile
 */
export interface UserBehaviorProfile {
  userId: string;
  favoriteTokens: string[]; // Top 10 most requested
  portfolioSize: number; // Average # of tokens per request
  requestFrequency: number; // Requests per hour
  activeHours: number[]; // Hours when user is most active (0-23)
  activeDays: number[]; // Days when user is most active (0-6)
  avgSessionLength: number; // Minutes per session
  preferredTokens: Map<string, number>; // Token → request count
  sequencePreferences: SequentialPattern[];
  lastSeen: Date;
  createdAt: Date;
  totalRequests: number;
}

/**
 * Prediction result
 */
export interface PredictionResult {
  predictedTokens: string[];
  confidence: number; // Overall confidence (0-1)
  reasoning: PredictionReasoning[];
  timestamp: Date;
  expiresAt: Date;
  basedOnPatterns: string[]; // Pattern IDs used
}

/**
 * Reasoning for a prediction
 */
export interface PredictionReasoning {
  type: 'frequent_pattern' | 'sequential_pattern' | 'temporal_pattern' | 'user_history' | 'collaborative_filtering';
  description: string;
  confidence: number;
  patternId?: string;
  tokens: string[];
}

/**
 * Pattern mining statistics
 */
export interface PatternMiningStats {
  totalPatterns: number;
  frequentPatterns: number;
  sequentialPatterns: number;
  temporalPatterns: number;
  avgSupport: number;
  avgConfidence: number;
  totalSessions: number;
  totalRequests: number;
  uniqueUsers: number;
  uniqueTokens: number;
  lastMiningTime: Date;
  miningDuration: number; // ms
  cacheHitPrediction: number; // % of predictions that resulted in cache hits
}

/**
 * Pattern mining configuration
 */
export interface PatternMiningConfig {
  minSupport: number; // Minimum support threshold (0-1)
  minConfidence: number; // Minimum confidence threshold (0-1)
  maxPatternLength: number; // Maximum tokens in a pattern
  miningInterval: number; // How often to mine patterns (ms)
  retentionPeriod: number; // How long to keep patterns (ms)
  enableSequentialMining: boolean;
  enableTemporalMining: boolean;
  enableCollaborativeFiltering: boolean;
}

/**
 * Prefetch recommendation
 */
export interface PrefetchRecommendation {
  tokens: string[];
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  reason: string;
  confidence: number;
  estimatedCacheHitProbability: number;
  estimatedApiCallsSaved: number;
  ttl: number; // Recommended TTL (seconds)
  timestamp: Date;
}

/**
 * Session context for predictions
 */
export interface SessionContext {
  sessionId: string;
  userId?: string;
  recentTokens: string[]; // Last N tokens requested
  sessionStartTime: Date;
  requestCount: number;
  marketCondition: 'bull' | 'bear' | 'neutral' | 'extreme_volatile';
  timeOfDay: number;
  dayOfWeek: number;
}

/**
 * Pattern evaluation metrics
 */
export interface PatternEvaluationMetrics {
  patternId: string;
  truePositives: number; // Correct predictions
  falsePositives: number; // Incorrect predictions
  trueNegatives: number;
  falseNegatives: number; // Missed predictions
  precision: number; // TP / (TP + FP)
  recall: number; // TP / (TP + FN)
  f1Score: number; // Harmonic mean of precision and recall
  accuracy: number; // (TP + TN) / (TP + TN + FP + FN)
  lastEvaluated: Date;
}

/**
 * Collaborative filtering data
 */
export interface CollaborativeFilteringData {
  userId: string;
  similarUsers: string[]; // Users with similar behavior
  similarityScore: number; // Cosine similarity (0-1)
  recommendedTokens: string[];
  confidence: number;
}

/**
 * Market condition analysis
 */
export interface MarketConditionAnalysis {
  condition: 'bull' | 'bear' | 'neutral' | 'extreme_volatile';
  btcChange24h: number;
  ethChange24h: number;
  marketCapChange24h: number;
  volumeChange24h: number;
  volatilityIndex: number; // 0-1
  fearGreedIndex?: number; // 0-100
  timestamp: Date;
}

/**
 * Pattern storage key
 */
export interface PatternStorageKey {
  type: 'frequent' | 'sequential' | 'temporal';
  id: string;
  tokens: string[];
}

/**
 * Pattern cache entry
 */
export interface PatternCacheEntry<T> {
  pattern: T;
  hitCount: number;
  lastHit: Date;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Mining job status
 */
export interface MiningJobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // ms
  recordsProcessed: number;
  patternsDiscovered: number;
  error?: string;
}

/**
 * Event types for pattern mining
 */
export enum PatternMiningEvent {
  PATTERN_DISCOVERED = 'pattern_discovered',
  PATTERN_UPDATED = 'pattern_updated',
  PATTERN_EXPIRED = 'pattern_expired',
  MINING_STARTED = 'mining_started',
  MINING_COMPLETED = 'mining_completed',
  PREDICTION_MADE = 'prediction_made',
  PREDICTION_VALIDATED = 'prediction_validated',
  CACHE_HIT_FROM_PREDICTION = 'cache_hit_from_prediction',
  CACHE_MISS_FROM_PREDICTION = 'cache_miss_from_prediction',
}

/**
 * Event payload for pattern discovery
 */
export interface PatternDiscoveryEvent {
  pattern: FrequentPattern | SequentialPattern | TemporalPattern;
  type: 'frequent' | 'sequential' | 'temporal';
  impact: 'low' | 'medium' | 'high'; // Based on support and confidence
  timestamp: Date;
}

/**
 * Event payload for prediction validation
 */
export interface PredictionValidationEvent {
  predictionId: string;
  predictedTokens: string[];
  actualTokens: string[];
  correct: boolean;
  confidence: number;
  cacheHit: boolean;
  timestamp: Date;
}

