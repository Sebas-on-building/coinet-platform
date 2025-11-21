/**
 * =========================================
 * RATE LIMITER
 * =========================================
 * Divine world-class dynamic rate limiting system
 * Intelligent throttling with adaptive algorithms
 */

// Note: Logger import would be uncommented when Logger is implemented
// import { Logger } from '@/utils/Logger';
import { RateLimitingConfig, RateLimitingResult, IRateLimiter } from '@/types';

/**
 * Rate limiter implementation
 */
export class RateLimiter implements IRateLimiter {
  private logger: any; // Logger
  private config: RateLimitingConfig;
  private counters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: RateLimitingConfig) {
    // this.logger = new Logger('RateLimiter'); // Commented out until Logger implemented
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitingResult> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create counter for this key
    let counter = this.counters.get(key);

    if (!counter || counter.resetTime < windowStart) {
      // Reset counter for new window
      counter = {
        count: 0,
        resetTime: now + windowMs,
      };
      this.counters.set(key, counter);
    }

    // Check if limit is exceeded
    const isAllowed = counter.count < limit;
    const remaining = Math.max(0, limit - counter.count);
    const resetTime = counter.resetTime;

    // Calculate retry delay if not allowed
    const retryAfter = isAllowed ? undefined : Math.ceil((resetTime - now) / 1000);

    const result: any = {
      allowed: isAllowed,
      remaining,
      resetTime,
    };

    if (retryAfter !== undefined) {
      result.retryAfter = retryAfter;
    }

    // if (!isAllowed) {
    //   // this.logger.debug('Rate limit exceeded', { // Commented out until Logger implemented
    //   //   key,
    //   //   limit,
    //   //   currentCount: counter.count,
    //   //   resetTime,
    //   // });
    // }

    return result;
  }

  /**
   * Increment counter for key
   */
  async increment(key: string, windowMs: number): Promise<void> {
    const now = Date.now();
    let counter = this.counters.get(key);

    if (!counter || counter.resetTime < now - windowMs) {
      counter = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      counter.count++;
    }

    this.counters.set(key, counter);
  }

  /**
   * Get current count for key
   */
  async getCount(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const counter = this.counters.get(key);

    if (!counter || counter.resetTime < now - windowMs) {
      return 0;
    }

    return counter.count;
  }

  /**
   * Reset counter for key
   */
  async reset(key: string): Promise<void> {
    this.counters.delete(key);
  }

  /**
   * Get rate limiting statistics
   */
  getStats(): {
    totalRequests: number;
    blockedRequests: number;
    averageResponseTime: number;
  } {
    let totalRequests = 0;
    let blockedRequests = 0;

    for (const [key, counter] of this.counters.entries()) {
      totalRequests += counter.count;

      // Count as blocked if over global limit (simplified)
      if (counter.count > this.config.global.maxRequestsPerMinute) {
        blockedRequests += counter.count - this.config.global.maxRequestsPerMinute;
      }
    }

    return {
      totalRequests,
      blockedRequests,
      averageResponseTime: 0, // Would need to track this separately
    };
  }

  /**
   * Clean up expired counters
   */
  cleanup(): void {
    const now = Date.now();

    for (const [key, counter] of this.counters.entries()) {
      // Remove counters older than 1 hour
      if (now - counter.resetTime > 3600000) {
        this.counters.delete(key);
      }
    }

    // this.logger.debug('Cleaned up expired rate limit counters'); // Commented out until Logger implemented
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on provider performance
 */
export class AdaptiveRateLimiter {
  private logger: any; // Logger
  private baseLimiter: RateLimiter;
  private providerHealth: Map<string, {
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    lastUpdated: number;
  }> = new Map();

  constructor(baseLimiter: RateLimiter) {
    // this.logger = new Logger('AdaptiveRateLimiter'); // Commented out until Logger implemented
    this.baseLimiter = baseLimiter;
  }

  /**
   * Check limit with adaptive adjustment
   */
  async checkAdaptiveLimit(
    key: string,
    provider: string,
    baseLimit: number,
    windowMs: number
  ): Promise<RateLimitingResult> {
    // Get provider health metrics
    const health = this.providerHealth.get(provider);

    // Calculate adaptive limit based on provider performance
    let adaptiveLimit = baseLimit;

    if (health) {
      // Adjust limit based on success rate
      if (health.successRate < 0.95) {
        adaptiveLimit = Math.floor(adaptiveLimit * 0.8); // Reduce by 20%
      } else if (health.successRate > 0.99) {
        adaptiveLimit = Math.floor(adaptiveLimit * 1.1); // Increase by 10%
      }

      // Adjust based on response time
      if (health.averageResponseTime > 5000) { // > 5 seconds
        adaptiveLimit = Math.floor(adaptiveLimit * 0.7); // Reduce significantly
      } else if (health.averageResponseTime < 1000) { // < 1 second
        adaptiveLimit = Math.floor(adaptiveLimit * 1.05); // Slight increase
      }

      // Ensure limit doesn't go below minimum
      adaptiveLimit = Math.max(1, adaptiveLimit);
    }

    // Use base limiter with adaptive limit
    return this.baseLimiter.checkLimit(key, adaptiveLimit, windowMs);
  }

  /**
   * Update provider health metrics
   */
  updateProviderHealth(provider: string, metrics: {
    success: boolean;
    responseTime: number;
  }): void {
    const current = this.providerHealth.get(provider) || {
      successRate: 1,
      averageResponseTime: 0,
      errorRate: 0,
      lastUpdated: Date.now(),
    };

    // Update success rate (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    current.successRate = current.successRate * (1 - alpha) + (metrics.success ? 1 : 0) * alpha;

    // Update average response time
    current.averageResponseTime = current.averageResponseTime * (1 - alpha) + metrics.responseTime * alpha;

    // Update error rate
    current.errorRate = 1 - current.successRate;

    current.lastUpdated = Date.now();

    this.providerHealth.set(provider, current);

    // this.logger.debug('Updated provider health metrics', { // Commented out until Logger implemented
    //   provider,
    //   successRate: current.successRate,
    //   averageResponseTime: current.averageResponseTime,
    //   errorRate: current.errorRate,
    // });
  }

  /**
   * Get provider health status
   */
  getProviderHealth(provider: string): {
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
  } | null {
    const health = this.providerHealth.get(provider);

    if (!health) return null;

    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (health.successRate > 0.95 && health.averageResponseTime < 2000) {
      status = 'healthy';
    } else if (health.successRate > 0.8 && health.averageResponseTime < 5000) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      ...health,
      status,
    };
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): Record<string, {
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    status: string;
  }> {
    const result: Record<string, any> = {};

    for (const [provider, health] of this.providerHealth.entries()) {
      result[provider] = this.getProviderHealth(provider);
    }

    return result;
  }
}
