/**
 * =========================================
 * RATE LIMITING SERVICE TYPES
 * =========================================
 * Divine world-class type definitions for API rate limiting
 */

export interface RateLimitConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';

  algorithms: {
    default: 'fixed_window' | 'sliding_window' | 'token_bucket' | 'leaky_bucket';
    fixedWindow: FixedWindowConfig;
    slidingWindow: SlidingWindowConfig;
    tokenBucket: TokenBucketConfig;
    leakyBucket: LeakyBucketConfig;
  };

  limits: {
    keyLevel: KeyLevelLimits;
    resourceLevel: ResourceLevelLimits;
    global: GlobalLimits;
  };

  dynamic: {
    enabled: boolean;
    loadThreshold: number; // CPU/memory threshold to trigger dynamic limiting
    behaviorAnalysis: {
      enabled: boolean;
      windowSize: number; // minutes
      thresholdMultiplier: number;
    };
  };

  monitoring: {
    enabled: boolean;
    collectionInterval: number;
    retentionDays: number;
  };

  alerting: {
    enabled: boolean;
    thresholds: {
      highUsage: number; // percentage of limit
      suspiciousActivity: number; // requests per minute
      loadSpike: number; // sudden increase percentage
    };
  };
}

export interface FixedWindowConfig {
  windowSize: number; // milliseconds
  maxRequests: number;
  headers: boolean;
}

export interface SlidingWindowConfig {
  windowSize: number; // milliseconds
  maxRequests: number;
  precision: number; // sub-window precision in milliseconds
  headers: boolean;
}

export interface TokenBucketConfig {
  capacity: number; // maximum tokens
  refillRate: number; // tokens per second
  headers: boolean;
}

export interface LeakyBucketConfig {
  capacity: number; // maximum requests in queue
  leakRate: number; // requests per second that leak out
  headers: boolean;
}

export interface KeyLevelLimits {
  enabled: boolean;
  defaultLimit: number; // requests per window
  windowSize: number; // milliseconds
  burstLimit?: number; // allow burst requests
  differentiated: {
    free: number;
    premium: number;
    enterprise: number;
  };
}

export interface ResourceLevelLimits {
  enabled: boolean;
  endpoints: Record<string, EndpointLimit>;
  methods: Record<string, number>;
}

export interface EndpointLimit {
  limit: number;
  windowSize: number;
  burstLimit?: number;
}

export interface GlobalLimits {
  enabled: boolean;
  maxRequestsPerSecond: number;
  maxConcurrentRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  limit: number;
  windowSize: number;
}

export interface RateLimitContext {
  key: string;
  resource: string;
  algorithm: string;
  timestamp: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

export interface TrafficPattern {
  endpoint: string;
  method: string;
  requestsPerMinute: number;
  uniqueUsers: number;
  errorRate: number;
  averageLatency: number;
}

export interface LoadMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
  averageResponseTime: number;
}

export interface UserBehavior {
  userId: string;
  requestPattern: 'normal' | 'bursty' | 'suspicious';
  averageRequestsPerHour: number;
  lastRequestTime: number;
  errorRate: number;
}
