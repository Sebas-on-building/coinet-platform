/**
 * =========================================
 * DYNAMIC RATE LIMITING STRATEGY
 * =========================================
 * Dynamic rate limiting based on server load and user behavior
 */

import { LoadMetrics, UserBehavior, RateLimitConfig } from '../types';
import { RateLimitingService } from '../RateLimitingService';

export interface DynamicLimitAdjustment {
  algorithm: string;
  originalLimit: number;
  adjustedLimit: number;
  reason: string;
  duration: number; // milliseconds
}

export interface LoadBasedAdjustment {
  cpuThreshold: number;
  memoryThreshold: number;
  adjustmentFactor: number;
  minimumLimit: number;
}

export interface BehaviorBasedAdjustment {
  suspiciousPatternMultiplier: number;
  burstyPatternMultiplier: number;
  normalPatternMultiplier: number;
}

export class DynamicRateLimitingStrategy {
  private service: RateLimitingService;
  private config: RateLimitConfig;
  private adjustments: Map<string, DynamicLimitAdjustment> = new Map();
  private loadBasedConfig: LoadBasedAdjustment;
  private behaviorBasedConfig: BehaviorBasedAdjustment;

  constructor(service: RateLimitingService, config: RateLimitConfig) {
    this.service = service;
    this.config = config;

    this.loadBasedConfig = {
      cpuThreshold: config.dynamic.loadThreshold,
      memoryThreshold: config.dynamic.loadThreshold,
      adjustmentFactor: 0.5, // Reduce by 50% when load is high
      minimumLimit: 10,
    };

    this.behaviorBasedConfig = {
      suspiciousPatternMultiplier: 0.3, // Reduce to 30% for suspicious users
      burstyPatternMultiplier: 0.7, // Reduce to 70% for bursty users
      normalPatternMultiplier: 1.0, // No reduction for normal users
    };
  }

  /**
   * Check if dynamic adjustments should be applied
   */
  shouldApplyDynamicLimits(loadMetrics: LoadMetrics, userBehavior?: UserBehavior): boolean {
    if (!this.config.dynamic.enabled) {
      return false;
    }

    // Check load-based triggers
    const loadTriggered = loadMetrics.cpuUsage > this.loadBasedConfig.cpuThreshold ||
                         loadMetrics.memoryUsage > this.loadBasedConfig.memoryThreshold;

    // Check behavior-based triggers
    const behaviorTriggered = userBehavior?.requestPattern === 'suspicious';

    return loadTriggered || behaviorTriggered;
  }

  /**
   * Apply dynamic rate limit adjustments
   */
  async applyDynamicAdjustments(
    key: string,
    loadMetrics: LoadMetrics,
    userBehavior?: UserBehavior
  ): Promise<DynamicLimitAdjustment[]> {
    const adjustments: DynamicLimitAdjustment[] = [];

    try {
      // Apply load-based adjustments
      if (loadMetrics.cpuUsage > this.loadBasedConfig.cpuThreshold ||
          loadMetrics.memoryUsage > this.loadBasedConfig.memoryThreshold) {
        const loadAdjustment = await this.applyLoadBasedAdjustment(key, loadMetrics);
        if (loadAdjustment) {
          adjustments.push(loadAdjustment);
        }
      }

      // Apply behavior-based adjustments
      if (userBehavior?.requestPattern === 'suspicious') {
        const behaviorAdjustment = await this.applyBehaviorBasedAdjustment(key, userBehavior);
        if (behaviorAdjustment) {
          adjustments.push(behaviorAdjustment);
        }
      }

      // Apply burst protection if needed
      if (this.detectBurstBehavior(userBehavior)) {
        const burstAdjustment = await this.applyBurstProtection(key);
        if (burstAdjustment) {
          adjustments.push(burstAdjustment);
        }
      }

      return adjustments;

    } catch (error: any) {
      console.error('Failed to apply dynamic adjustments:', error);
      return [];
    }
  }

  /**
   * Apply load-based rate limit adjustment
   */
  private async applyLoadBasedAdjustment(key: string, loadMetrics: LoadMetrics): Promise<DynamicLimitAdjustment | null> {
    try {
      // Calculate load factor (higher = more restrictive)
      const cpuFactor = Math.max(0, (loadMetrics.cpuUsage - this.loadBasedConfig.cpuThreshold) /
                                (1 - this.loadBasedConfig.cpuThreshold));
      const memoryFactor = Math.max(0, (loadMetrics.memoryUsage - this.loadBasedConfig.memoryThreshold) /
                                   (1 - this.loadBasedConfig.memoryThreshold));
      const loadFactor = Math.max(cpuFactor, memoryFactor);

      if (loadFactor <= 0) {
        return null;
      }

      // Get current limits
      const currentLimits = await this.getCurrentLimits(key);
      if (!currentLimits) {
        return null;
      }

      // Calculate adjusted limit
      const adjustmentFactor = Math.max(this.loadBasedConfig.adjustmentFactor,
                                       1 - (loadFactor * 0.8)); // Max 80% reduction
      const adjustedLimit = Math.max(this.loadBasedConfig.minimumLimit,
                                    Math.floor(currentLimits.limit * adjustmentFactor));

      const adjustment: DynamicLimitAdjustment = {
        algorithm: currentLimits.algorithm,
        originalLimit: currentLimits.limit,
        adjustedLimit,
        reason: `High load detected (CPU: ${(loadMetrics.cpuUsage * 100).toFixed(1)}%, Memory: ${(loadMetrics.memoryUsage * 100).toFixed(1)}%)`,
        duration: 300000, // 5 minutes
      };

      this.adjustments.set(key, adjustment);

      console.log(`Applied load-based rate limit adjustment for ${key}: ${currentLimits.limit} -> ${adjustedLimit}`);

      return adjustment;

    } catch (error: any) {
      console.error('Failed to apply load-based adjustment:', error);
      return null;
    }
  }

  /**
   * Apply behavior-based rate limit adjustment
   */
  private async applyBehaviorBasedAdjustment(key: string, behavior: UserBehavior): Promise<DynamicLimitAdjustment | null> {
    try {
      const currentLimits = await this.getCurrentLimits(key);
      if (!currentLimits) {
        return null;
      }

      let multiplier = this.behaviorBasedConfig.normalPatternMultiplier;

      switch (behavior.requestPattern) {
        case 'suspicious':
          multiplier = this.behaviorBasedConfig.suspiciousPatternMultiplier;
          break;
        case 'bursty':
          multiplier = this.behaviorBasedConfig.burstyPatternMultiplier;
          break;
        default:
          return null; // No adjustment needed for normal behavior
      }

      const adjustedLimit = Math.max(this.loadBasedConfig.minimumLimit,
                                    Math.floor(currentLimits.limit * multiplier));

      const adjustment: DynamicLimitAdjustment = {
        algorithm: currentLimits.algorithm,
        originalLimit: currentLimits.limit,
        adjustedLimit,
        reason: `Suspicious behavior detected: ${behavior.requestPattern} pattern`,
        duration: 600000, // 10 minutes
      };

      this.adjustments.set(key, adjustment);

      console.log(`Applied behavior-based rate limit adjustment for ${key}: ${currentLimits.limit} -> ${adjustedLimit}`);

      return adjustment;

    } catch (error: any) {
      console.error('Failed to apply behavior-based adjustment:', error);
      return null;
    }
  }

  /**
   * Apply burst protection
   */
  private async applyBurstProtection(key: string): Promise<DynamicLimitAdjustment | null> {
    try {
      const currentLimits = await this.getCurrentLimits(key);
      if (!currentLimits) {
        return null;
      }

      // Reduce limit to 50% for burst protection
      const adjustedLimit = Math.max(this.loadBasedConfig.minimumLimit,
                                    Math.floor(currentLimits.limit * 0.5));

      const adjustment: DynamicLimitAdjustment = {
        algorithm: currentLimits.algorithm,
        originalLimit: currentLimits.limit,
        adjustedLimit,
        reason: 'Burst behavior detected',
        duration: 120000, // 2 minutes
      };

      this.adjustments.set(key, adjustment);

      console.log(`Applied burst protection for ${key}: ${currentLimits.limit} -> ${adjustedLimit}`);

      return adjustment;

    } catch (error: any) {
      console.error('Failed to apply burst protection:', error);
      return null;
    }
  }

  /**
   * Get current limits for a key
   */
  private async getCurrentLimits(key: string): Promise<{ limit: number; algorithm: string } | null> {
    // This would check the current rate limiting configuration
    // For demo purposes, return a default
    return {
      limit: 1000,
      algorithm: this.config.algorithms.default,
    };
  }

  /**
   * Detect burst behavior patterns
   */
  private detectBurstBehavior(behavior?: UserBehavior): boolean {
    if (!behavior) return false;

    // Consider burst behavior if requests per hour is very high
    return behavior.averageRequestsPerHour > 5000; // 5000+ requests per hour
  }

  /**
   * Clean up expired adjustments
   */
  cleanupExpiredAdjustments(): void {
    const now = Date.now();

    for (const [key, adjustment] of Array.from(this.adjustments.entries())) {
      if (now > adjustment.duration + Date.now()) {
        this.adjustments.delete(key);
      }
    }
  }

  /**
   * Get active adjustments
   */
  getActiveAdjustments(): DynamicLimitAdjustment[] {
    return Array.from(this.adjustments.values());
  }

  /**
   * Check if key has active adjustment
   */
  hasActiveAdjustment(key: string): boolean {
    const adjustment = this.adjustments.get(key);
    if (!adjustment) return false;

    // Check if adjustment has expired
    const now = Date.now();
    return (now - adjustment.duration) < 0;
  }

  /**
   * Get adjusted limit for a key
   */
  getAdjustedLimit(key: string, originalLimit: number): number {
    const adjustment = this.adjustments.get(key);
    if (!adjustment) return originalLimit;

    // Check if adjustment is still active
    const now = Date.now();
    const adjustmentStart = now - adjustment.duration;

    if (now > adjustmentStart) {
      this.adjustments.delete(key);
      return originalLimit;
    }

    return adjustment.adjustedLimit;
  }
}
