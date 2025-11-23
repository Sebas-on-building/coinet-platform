export interface AdaptiveRateLimitConfig {
  enabled: boolean;
  modelUpdateInterval: number;
  thresholdAdjustmentInterval: number;
  defaultLimit: number;
  fallbackLimit: number;
  learningRate: number;
  confidenceThreshold: number;
  anomalyThreshold: number;
  riskThreshold: number;
}

export interface DistributedRateLimitConfig {
  enabled: boolean;
  provider: 'redis' | 'etcd' | 'consul';
  consistency: 'strong' | 'eventual';
  replicationFactor: number;
  timeout: number;
  retryAttempts: number;
}

export interface RateLimitingOrchestratorConfig {
  fallbackLimit: number;
  circuitBreakerThreshold: number;
  healthCheckInterval: number;
  metricsRetentionDays: number;
}

export interface EnterpriseRateLimitingConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';
  adaptive: AdaptiveRateLimitConfig;
  distributed: DistributedRateLimitConfig;
  orchestrator: RateLimitingOrchestratorConfig;
  algorithms: {
    default: 'fixed_window' | 'sliding_window' | 'token_bucket' | 'adaptive';
    fixedWindow: {
      windowSize: number;
      maxRequests: number;
    };
    slidingWindow: {
      windowSize: number;
      maxRequests: number;
    };
    tokenBucket: {
      capacity: number;
      refillRate: number;
    };
    adaptive: {
      enabled: boolean;
      sensitivity: number;
    };
  };
  security: {
    enableThreatDetection: boolean;
    suspiciousActivityThreshold: number;
    blockDuration: number;
    whitelistEnabled: boolean;
    blacklistEnabled: boolean;
  };
  monitoring: {
    enabled: boolean;
    collectionInterval: number;
    retentionDays: number;
    alerting: {
      enabled: boolean;
      highUsageThreshold: number;
      suspiciousActivityThreshold: number;
    };
  };
  performance: {
    maxConcurrentOperations: number;
    cacheSize: number;
    cacheTTL: number;
    enableCompression: boolean;
  };
}
