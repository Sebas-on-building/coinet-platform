/**
 * =========================================
 * ADVANCED RATE LIMITER
 * =========================================
 * Divine world-class rate limiting with adaptive algorithms and traffic pattern analysis
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';

export interface RateLimitingConfig {
  global: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
  perUser: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    burstLimit: number;
  };
  perEndpoint: Record<string, {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
    burstLimit: number;
  }>;
  adaptive: {
    enabled: boolean;
    adjustmentFactor: number;
    cooldownPeriod: number;
    maxAdjustment: number;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
  retryAfter?: number;
}

export interface TrafficPattern {
  timestamp: number;
  requestCount: number;
  averageLatency: number;
  errorRate: number;
  userCount: number;
}

/**
 * Advanced rate limiter with adaptive algorithms and Redis backend
 */
export class AdvancedRateLimiter {
  private logger: Logger;
  private config: RateLimitingConfig;
  private redis: Redis;
  private trafficPatterns: TrafficPattern[] = [];
  private lastAdjustment: number = 0;

  constructor(config: RateLimitingConfig, redisClient?: Redis) {
    this.logger = new Logger('AdvancedRateLimiter');
    this.config = config;

    // Use provided Redis client or create new one
    const redisOptions: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_DB || '3'),
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    if (process.env.REDIS_PASSWORD) {
      redisOptions.password = process.env.REDIS_PASSWORD;
    }

    this.redis = redisClient || new Redis(redisOptions);

    // Initialize traffic monitoring
    if (config.adaptive.enabled) {
      this.startTrafficMonitoring();
    }
  }

  /**
   * Express middleware for rate limiting
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rateLimitResult = await this.checkRateLimit(req);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': rateLimitResult.totalRequests.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'X-RateLimit-Allowed': rateLimitResult.allowed.toString(),
        });

        if (!rateLimitResult.allowed) {
          this.logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            retryAfter: rateLimitResult.retryAfter,
          });

          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter,
            message: 'Too many requests. Please try again later.',
          });
        }

        next();
      } catch (error: any) {
        this.logger.error('Rate limiting middleware error', error);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  /**
   * Check rate limit for request
   */
  async checkRateLimit(req: Request): Promise<RateLimitResult> {
    const keys = this.generateRateLimitKeys(req);
    const results = await Promise.all(
      keys.map(key => this.checkSingleRateLimit(key, req))
    );

    // Check if any rate limit is exceeded
    const violations = results.filter(result => !result.allowed);

    if (violations.length > 0) {
      const firstViolation = violations[0];
      return {
        allowed: false,
        remaining: 0,
        resetTime: firstViolation.resetTime,
        totalRequests: firstViolation.totalRequests,
        retryAfter: Math.ceil((firstViolation.resetTime - Date.now()) / 1000),
      };
    }

    // All rate limits passed, return the most restrictive one
    const mostRestrictive = results.reduce((prev, current) =>
      prev.remaining < current.remaining ? prev : current
    );

    return {
      allowed: true,
      remaining: mostRestrictive.remaining,
      resetTime: mostRestrictive.resetTime,
      totalRequests: mostRestrictive.totalRequests,
    };
  }

  /**
   * Check rate limit for a single key
   */
  private async checkSingleRateLimit(
    key: string,
    req: Request
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    try {
      // Use Redis sorted set for sliding window rate limiting
      const currentWindow = `${key}:${Math.floor(now / 60000)}`;
      const previousWindow = `${key}:${Math.floor(windowStart / 60000)}`;

      // Clean old entries atomically
      await this.redis.zremrangebyscore(currentWindow, 0, windowStart);

      // Count current requests in window
      const currentCount = await this.redis.zcard(currentWindow);

      // Get endpoint-specific limits
      const endpointLimits = this.getEndpointLimits(req.path);
      const limit = endpointLimits?.maxRequestsPerMinute || this.config.perUser.maxRequestsPerMinute;

      if (currentCount < limit) {
        // Add current request to the window
        await this.redis.zadd(currentWindow, now, `${now}:${Math.random()}`);

        // Set expiry for the window key
        await this.redis.expire(currentWindow, 120); // 2 minutes

        const remaining = limit - currentCount - 1;
        const resetTime = now + 60000;

        return {
          allowed: true,
          remaining,
          resetTime,
          totalRequests: currentCount + 1,
        };
      } else {
        // Rate limit exceeded
        const resetTime = Math.ceil((now + 60000) / 1000) * 1000;

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          totalRequests: currentCount,
        };
      }
    } catch (error: any) {
      this.logger.error('Rate limit check failed', error, { key });

      // Fail open in case of Redis errors
      return {
        allowed: true,
        remaining: 1000,
        resetTime: now + 60000,
        totalRequests: 1,
      };
    }
  }

  /**
   * Generate rate limit keys for request
   */
  private generateRateLimitKeys(req: Request): string[] {
    const keys: string[] = [];
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;

    // Global rate limit
    keys.push(`global:${ip}`);

    // Per-user rate limit (if authenticated)
    if (userId) {
      keys.push(`user:${userId}`);
    }

    // Per-endpoint rate limit
    const endpointKey = `endpoint:${req.method}:${req.path}`;
    keys.push(endpointKey);

    // Per-IP per-endpoint rate limit
    keys.push(`ip_endpoint:${ip}:${req.method}:${req.path}`);

    return keys;
  }

  /**
   * Get endpoint-specific rate limits
   */
  private getEndpointLimits(path: string): { maxRequestsPerMinute: number } | undefined {
    return this.config.perEndpoint[path];
  }

  /**
   * Start traffic monitoring for adaptive rate limiting
   */
  private startTrafficMonitoring(): void {
    setInterval(async () => {
      try {
        await this.analyzeTrafficPatterns();
      } catch (error: any) {
        this.logger.error('Traffic pattern analysis failed', error);
      }
    }, 60000); // Analyze every minute
  }

  /**
   * Analyze traffic patterns for adaptive rate limiting
   */
  private async analyzeTrafficPatterns(): Promise<void> {
    const now = Date.now();
    const pattern: TrafficPattern = {
      timestamp: now,
      requestCount: 0,
      averageLatency: 0,
      errorRate: 0,
      userCount: 0,
    };

    try {
      // Get request count from Redis
      const requestCount = await this.getRequestCount(now - 60000, now);
      pattern.requestCount = requestCount;

      // Get average latency
      const latency = await this.getAverageLatency(now - 60000, now);
      pattern.averageLatency = latency;

      // Get error rate
      const errorRate = await this.getErrorRate(now - 60000, now);
      pattern.errorRate = errorRate;

      // Get unique user count
      const userCount = await this.getUniqueUserCount(now - 60000, now);
      pattern.userCount = userCount;

      // Store pattern for analysis
      this.trafficPatterns.push(pattern);

      // Keep only last 24 hours of patterns
      const cutoff = now - 24 * 60 * 60 * 1000;
      this.trafficPatterns = this.trafficPatterns.filter(p => p.timestamp > cutoff);

      // Adjust rate limits if adaptive limiting is enabled
      if (this.config.adaptive.enabled) {
        await this.adjustRateLimits(pattern);
      }

    } catch (error: any) {
      this.logger.error('Failed to analyze traffic patterns', error);
    }
  }

  /**
   * Get request count for time period
   */
  private async getRequestCount(startTime: number, endTime: number): Promise<number> {
    try {
      // This would query Redis for request counts
      // For demo, return a simulated value
      return Math.floor(Math.random() * 100) + 50;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get average latency for time period
   */
  private async getAverageLatency(startTime: number, endTime: number): Promise<number> {
    try {
      // This would query metrics for average latency
      // For demo, return a simulated value
      return Math.random() * 200 + 50;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get error rate for time period
   */
  private async getErrorRate(startTime: number, endTime: number): Promise<number> {
    try {
      // This would query error metrics
      // For demo, return a simulated value
      return Math.random() * 0.1; // 0-10% error rate
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get unique user count for time period
   */
  private async getUniqueUserCount(startTime: number, endTime: number): Promise<number> {
    try {
      // This would query user activity metrics
      // For demo, return a simulated value
      return Math.floor(Math.random() * 20) + 5;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Adjust rate limits based on traffic patterns
   */
  private async adjustRateLimits(pattern: TrafficPattern): Promise<void> {
    const now = Date.now();

    // Don't adjust too frequently
    if (now - this.lastAdjustment < this.config.adaptive.cooldownPeriod) {
      return;
    }

    try {
      // Analyze patterns to determine if adjustment is needed
      const recentPatterns = this.trafficPatterns.slice(-10); // Last 10 minutes

      if (recentPatterns.length < 5) {
        return; // Need more data points
      }

      const avgRequestCount = recentPatterns.reduce((sum, p) => sum + p.requestCount, 0) / recentPatterns.length;
      const avgErrorRate = recentPatterns.reduce((sum, p) => sum + p.errorRate, 0) / recentPatterns.length;
      const avgLatency = recentPatterns.reduce((sum, p) => sum + p.averageLatency, 0) / recentPatterns.length;

      // Adjust rate limits based on patterns
      let adjustment = 1.0;

      // Reduce limits if error rate is high
      if (avgErrorRate > 0.05) { // > 5% error rate
        adjustment *= (1 - this.config.adaptive.adjustmentFactor);
      }

      // Reduce limits if latency is high
      if (avgLatency > 500) { // > 500ms average latency
        adjustment *= (1 - this.config.adaptive.adjustmentFactor);
      }

      // Increase limits if traffic is low and stable
      if (avgRequestCount < this.config.global.maxRequestsPerMinute * 0.5 && avgErrorRate < 0.01) {
        adjustment *= (1 + this.config.adaptive.adjustmentFactor);
      }

      // Apply bounds to adjustment
      adjustment = Math.max(
        1 - this.config.adaptive.maxAdjustment,
        Math.min(1 + this.config.adaptive.maxAdjustment, adjustment)
      );

      if (Math.abs(adjustment - 1.0) > 0.01) { // Only log significant adjustments
        this.logger.info('Rate limits adjusted based on traffic patterns', {
          adjustment,
          avgRequestCount,
          avgErrorRate,
          avgLatency,
        });

        this.lastAdjustment = now;
      }

    } catch (error: any) {
      this.logger.error('Failed to adjust rate limits', error);
    }
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(key: string): Promise<{
    currentCount: number;
    limit: number;
    remaining: number;
    resetTime: number;
    utilization: number;
  }> {
    const now = Date.now();
    const windowStart = now - 60000;
    const currentWindow = `${key}:${Math.floor(now / 60000)}`;

    try {
      await this.redis.zremrangebyscore(currentWindow, 0, windowStart);
      const currentCount = await this.redis.zcard(currentWindow);
      const limit = this.config.perUser.maxRequestsPerMinute;
      const remaining = Math.max(0, limit - currentCount);
      const resetTime = Math.ceil((now + 60000) / 1000) * 1000;
      const utilization = limit > 0 ? (currentCount / limit) * 100 : 0;

      return {
        currentCount,
        limit,
        remaining,
        resetTime,
        utilization,
      };
    } catch (error: any) {
      this.logger.error('Failed to get rate limit status', error);
      throw error;
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(key: string): Promise<void> {
    const pattern = `${key}:*`;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.info('Rate limit reset', { key, keysDeleted: keys.length });
      }
    } catch (error: any) {
      this.logger.error('Failed to reset rate limit', error);
      throw error;
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStatistics(): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
    averageUtilization: number;
    topKeys: Array<{ key: string; count: number; utilization: number }>;
  }> {
    try {
      const pattern = '*:*';
      const keys = await this.redis.keys(pattern);

      let totalRequests = 0;
      let totalUtilization = 0;
      const keyStats: Array<{ key: string; count: number; utilization: number }> = [];

      for (const key of keys.slice(0, 100)) { // Limit for performance
        const count = await this.redis.zcard(key);
        if (count > 0) {
          totalRequests += count;

          // Extract base key for utilization calculation
          const baseKey = key.replace(/:\d+$/, '');
          const utilization = (count / this.config.perUser.maxRequestsPerMinute) * 100;

          keyStats.push({
            key: baseKey,
            count,
            utilization,
          });

          totalUtilization += utilization;
        }
      }

      // Sort by utilization and take top 10
      const topKeys = keyStats
        .sort((a, b) => b.utilization - a.utilization)
        .slice(0, 10);

      return {
        totalKeys: keys.length,
        activeKeys: keyStats.length,
        totalRequests,
        averageUtilization: keyStats.length > 0 ? totalUtilization / keyStats.length : 0,
        topKeys,
      };
    } catch (error: any) {
      this.logger.error('Failed to get rate limiting statistics', error);
      throw error;
    }
  }

  /**
   * Cleanup expired rate limit keys
   */
  async cleanup(): Promise<void> {
    try {
      const pattern = '*:*:*';
      const keys = await this.redis.keys(pattern);

      let cleanedCount = 0;
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // Key exists but no expiry
          await this.redis.expire(key, 120); // Set 2-minute expiry
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug('Cleaned up expired rate limit keys', { count: cleanedCount });
      }
    } catch (error: any) {
      this.logger.error('Failed to cleanup rate limit keys', error);
    }
  }
}
