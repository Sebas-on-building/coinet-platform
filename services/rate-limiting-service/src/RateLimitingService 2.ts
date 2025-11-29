/**
 * =========================================
 * RATE LIMITING SERVICE
 * =========================================
 * Divine world-class rate limiting service with multi-algorithm support
 */

import { RateLimitConfig, RateLimitResult, RateLimitContext, LoadMetrics, UserBehavior } from './types';
import { IRateLimitAlgorithm } from './algorithms/RateLimitAlgorithm';
import { FixedWindowAlgorithm } from './algorithms/FixedWindowAlgorithm';
import { SlidingWindowAlgorithm } from './algorithms/SlidingWindowAlgorithm';
import { TokenBucketAlgorithm } from './algorithms/TokenBucketAlgorithm';
import { LeakyBucketAlgorithm } from './algorithms/LeakyBucketAlgorithm';

export class RateLimitingService {
  private config: RateLimitConfig;
  private algorithms: Map<string, IRateLimitAlgorithm> = new Map();
  private keyLimits: Map<string, { limit: number; algorithm: string }> = new Map();
  private resourceLimits: Map<string, { limit: number; algorithm: string }> = new Map();
  private globalLimiter?: IRateLimitAlgorithm;

  // Monitoring
  private trafficPatterns: Map<string, any> = new Map();
  private userBehaviors: Map<string, UserBehavior> = new Map();
  private loadMetrics: LoadMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    requestsPerSecond: 0,
    averageResponseTime: 0,
  };

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.initializeAlgorithms();
    this.initializeLimits();
  }

  /**
   * Initialize rate limiting algorithms
   */
  private initializeAlgorithms(): void {
    // Fixed Window Algorithm
    this.algorithms.set('fixed_window', new FixedWindowAlgorithm(this.config.algorithms.fixedWindow));

    // Sliding Window Algorithm
    this.algorithms.set('sliding_window', new SlidingWindowAlgorithm(this.config.algorithms.slidingWindow));

    // Token Bucket Algorithm
    this.algorithms.set('token_bucket', new TokenBucketAlgorithm(this.config.algorithms.tokenBucket));

    // Leaky Bucket Algorithm
    this.algorithms.set('leaky_bucket', new LeakyBucketAlgorithm(this.config.algorithms.leakyBucket));

    // Global rate limiter (if enabled)
    if (this.config.limits.global.enabled) {
      this.globalLimiter = new TokenBucketAlgorithm({
        capacity: this.config.limits.global.maxRequestsPerSecond,
        refillRate: this.config.limits.global.maxRequestsPerSecond,
        headers: false,
      });
    }
  }

  /**
   * Initialize key and resource level limits
   */
  private initializeLimits(): void {
    if (this.config.limits.keyLevel.enabled) {
      // Set up default key limits
      this.keyLimits.set('default', {
        limit: this.config.limits.keyLevel.defaultLimit,
        algorithm: this.config.algorithms.default,
      });

      // Set up differentiated limits
      this.keyLimits.set('free', {
        limit: this.config.limits.keyLevel.differentiated.free,
        algorithm: this.config.algorithms.default,
      });

      this.keyLimits.set('premium', {
        limit: this.config.limits.keyLevel.differentiated.premium,
        algorithm: this.config.algorithms.default,
      });

      this.keyLimits.set('enterprise', {
        limit: this.config.limits.keyLevel.differentiated.enterprise,
        algorithm: this.config.algorithms.default,
      });
    }

    if (this.config.limits.resourceLevel.enabled) {
      // Set up resource-specific limits
      Object.entries(this.config.limits.resourceLevel.endpoints).forEach(([endpoint, config]) => {
        this.resourceLimits.set(endpoint, {
          limit: config.limit,
          algorithm: this.config.algorithms.default,
        });
      });
    }
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    try {
      // Check global limits first
      if (this.globalLimiter) {
        const globalResult = await this.globalLimiter.checkLimit({
          key: 'global',
          resource: context.resource,
          algorithm: 'token_bucket',
          timestamp: context.timestamp,
        });

        if (!globalResult.allowed) {
          return this.formatRateLimitResponse(globalResult, context);
        }
      }

      // Check resource-level limits
      if (this.config.limits.resourceLevel.enabled) {
        const resourceLimit = this.resourceLimits.get(context.resource);
        if (resourceLimit) {
          const algorithm = this.algorithms.get(resourceLimit.algorithm);
          if (algorithm) {
            const result = await algorithm.checkLimit({
              key: `${context.key}:${context.resource}`,
              resource: context.resource,
              algorithm: resourceLimit.algorithm,
              timestamp: context.timestamp,
            });

            if (!result.allowed) {
              return this.formatRateLimitResponse(result, context);
            }
          }
        }
      }

      // Check key-level limits
      if (this.config.limits.keyLevel.enabled) {
        const keyLimit = this.getKeyLimit(context.key);
        if (keyLimit) {
          const algorithm = this.algorithms.get(keyLimit.algorithm);
          if (algorithm) {
            const result = await algorithm.checkLimit({
              key: context.key,
              resource: context.resource,
              algorithm: keyLimit.algorithm,
              timestamp: context.timestamp,
            });

            if (!result.allowed) {
              return this.formatRateLimitResponse(result, context);
            }
          }
        }
      }

      // Update traffic patterns and user behavior
      this.updateTrafficPatterns(context);
      this.updateUserBehavior(context);

      return {
        allowed: true,
        remaining: 0, // Will be calculated by specific algorithms
        resetTime: 0,
        limit: 0,
        windowSize: 0,
      };

    } catch (error: any) {
      // On error, fail open (allow request) but log the issue
      console.error('Rate limiting check failed:', error);
      return {
        allowed: true,
        remaining: 0,
        resetTime: 0,
        limit: 0,
        windowSize: 0,
      };
    }
  }

  /**
   * Get appropriate limit for a key based on user tier
   */
  private getKeyLimit(key: string): { limit: number; algorithm: string } | null {
    // In a real implementation, this would check user tier from database
    // For demo purposes, use default limits
    return this.keyLimits.get('default') || null;
  }

  /**
   * Update traffic pattern analysis
   */
  private updateTrafficPatterns(context: RateLimitContext): void {
    const patternKey = `${context.resource}:${Math.floor(context.timestamp / 60000)}`; // per minute
    const pattern = this.trafficPatterns.get(patternKey) || {
      endpoint: context.resource,
      requests: 0,
      uniqueUsers: new Set(),
      errors: 0,
      startTime: context.timestamp,
    };

    pattern.requests++;
    pattern.uniqueUsers.add(context.key);

    this.trafficPatterns.set(patternKey, pattern);
  }

  /**
   * Update user behavior analysis
   */
  private updateUserBehavior(context: RateLimitContext): void {
    let behavior = this.userBehaviors.get(context.key);

    if (!behavior) {
      behavior = {
        userId: context.key,
        requestPattern: 'normal',
        averageRequestsPerHour: 0,
        lastRequestTime: context.timestamp,
        errorRate: 0,
      };
    }

    // Update request pattern analysis
    const timeSinceLastRequest = context.timestamp - behavior.lastRequestTime;
    const requestsPerHour = (3600000 / Math.max(timeSinceLastRequest, 1000)) * 60; // normalize to per hour

    behavior.averageRequestsPerHour = (behavior.averageRequestsPerHour + requestsPerHour) / 2;
    behavior.lastRequestTime = context.timestamp;

    // Classify behavior pattern
    if (behavior.averageRequestsPerHour > 1000) {
      behavior.requestPattern = 'suspicious';
    } else if (behavior.averageRequestsPerHour > 100) {
      behavior.requestPattern = 'bursty';
    } else {
      behavior.requestPattern = 'normal';
    }

    this.userBehaviors.set(context.key, behavior);
  }

  /**
   * Format rate limit response with proper headers
   */
  private formatRateLimitResponse(result: RateLimitResult, context: RateLimitContext): RateLimitResult {
    return {
      ...result,
      // Additional context for logging would be added here in real implementation
    };
  }

  /**
   * Update load metrics (called by monitoring system)
   */
  updateLoadMetrics(metrics: LoadMetrics): void {
    this.loadMetrics = metrics;

    // Trigger dynamic rate limiting if load is high
    if (this.config.dynamic.enabled && this.shouldApplyDynamicLimits()) {
      this.applyDynamicLimits();
    }
  }

  /**
   * Check if dynamic limits should be applied
   */
  private shouldApplyDynamicLimits(): boolean {
    return this.loadMetrics.cpuUsage > this.config.dynamic.loadThreshold ||
           this.loadMetrics.memoryUsage > this.config.dynamic.loadThreshold;
  }

  /**
   * Apply dynamic rate limiting based on current load
   */
  private applyDynamicLimits(): void {
    // In a real implementation, this would adjust rate limits dynamically
    // For demo purposes, just log the adjustment
    console.log('Applying dynamic rate limits due to high load:', this.loadMetrics);
  }

  /**
   * Get rate limiting statistics
   */
  async getStatistics(): Promise<{
    algorithms: Record<string, any>;
    limits: {
      keyLevel: Record<string, any>;
      resourceLevel: Record<string, any>;
      global: any;
    };
    patterns: {
      traffic: Record<string, any>;
      users: Record<string, any>;
    };
    load: LoadMetrics;
  }> {
    const algorithmStats = {};
    for (const [name, algorithm] of Array.from(this.algorithms.entries())) {
      algorithmStats[name] = algorithm.getInfo();
    }

    return {
      algorithms: algorithmStats,
      limits: {
        keyLevel: Object.fromEntries(this.keyLimits.entries()),
        resourceLevel: Object.fromEntries(this.resourceLimits.entries()),
        global: this.globalLimiter?.getInfo(),
      },
      patterns: {
        traffic: Object.fromEntries(this.trafficPatterns.entries()),
        users: Object.fromEntries(this.userBehaviors.entries()),
      },
      load: this.loadMetrics,
    };
  }

  /**
   * Reset rate limits for a specific key
   */
  async resetKeyLimits(key: string): Promise<void> {
    for (const algorithm of Array.from(this.algorithms.values())) {
      await algorithm.reset(key);
    }
  }

  /**
   * Health check for all algorithms
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      const checks = await Promise.all(
        Array.from(this.algorithms.values()).map(alg => alg.healthCheck())
      );

      const unhealthy = checks.filter(check => check.status === 'unhealthy');

      if (unhealthy.length > 0) {
        return {
          status: 'unhealthy',
          details: `Some algorithms unhealthy: ${unhealthy.map(c => c.details).join(', ')}`,
        };
      }

      return {
        status: 'healthy',
        details: `${this.algorithms.size} algorithms active`,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: error.message,
      };
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): RateLimitConfig {
    return this.config;
  }
}
