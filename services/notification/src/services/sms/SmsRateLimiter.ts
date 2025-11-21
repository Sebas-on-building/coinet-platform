import { SmsRateLimit, SmsUserPreference } from '@/types';
import { Logger } from '@/utils/Logger';

export interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
  maxPerMonth: number;
  burstLimit?: number;
  burstWindowMs?: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  currentCount: number;
  windowStart: Date;
  windowMs: number;
  resetTime: Date;
  reason?: string;
}

export class SmsRateLimiter {
  private static instance: SmsRateLimiter;
  private logger: Logger;

  // In-memory rate limit storage (in production, use Redis)
  private destinationLimits: Map<string, SmsRateLimit[]> = new Map();
  private providerLimits: Map<string, SmsRateLimit[]> = new Map();

  // Default rate limits
  private defaultDestinationLimits: RateLimitConfig = {
    maxPerMinute: 10,
    maxPerHour: 100,
    maxPerDay: 500,
    maxPerMonth: 10000,
  };

  private defaultProviderLimits: RateLimitConfig = {
    maxPerMinute: 50,
    maxPerHour: 1000,
    maxPerDay: 5000,
    maxPerMonth: 100000,
  };

  // User-specific overrides
  private userOverrides: Map<string, RateLimitConfig> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.startCleanupTask();
  }

  static getInstance(): SmsRateLimiter {
    if (!SmsRateLimiter.instance) {
      SmsRateLimiter.instance = new SmsRateLimiter();
    }
    return SmsRateLimiter.instance;
  }

  /**
   * Check if SMS can be sent to a destination without violating rate limits
   */
  async checkDestinationRateLimit(
    destination: string,
    userId?: string,
    priority: 'low' | 'normal' | 'high' | 'critical' | 'medium' = 'normal'
  ): Promise<RateLimitCheck> {
    const config = this.getEffectiveDestinationConfig(userId, priority);
    const limits = this.getDestinationLimits(destination);

    return this.checkRateLimit(limits, config, `destination:${destination}`);
  }

  /**
   * Check if SMS can be sent via a provider without violating rate limits
   */
  async checkProviderRateLimit(
    providerName: string,
    priority: 'low' | 'normal' | 'high' | 'critical' | 'medium' = 'normal'
  ): Promise<RateLimitCheck> {
    const config = this.getEffectiveProviderConfig(priority);
    const limits = this.getProviderLimits(providerName);

    return this.checkRateLimit(limits, config, `provider:${providerName}`);
  }

  /**
   * Record a successful SMS send for rate limiting purposes
   */
  recordSmsSend(
    destination: string,
    providerName: string,
    userId?: string,
    priority: 'low' | 'normal' | 'high' | 'critical' | 'medium' = 'normal'
  ): void {
    const now = new Date();
    const config = this.getEffectiveDestinationConfig(userId, priority);

    // Record for destination limits
    this.recordRateLimit(this.destinationLimits, destination, config, now);

    // Record for provider limits
    this.recordRateLimit(this.providerLimits, providerName, config, now);

    this.logger.debug('Recorded SMS send for rate limiting', {
      destination,
      provider: providerName,
      userId,
      priority,
    });
  }

  /**
   * Set user-specific rate limit overrides
   */
  setUserOverrides(userId: string, overrides: Partial<RateLimitConfig>): void {
    const existing = this.userOverrides.get(userId) || { ...this.defaultDestinationLimits };
    this.userOverrides.set(userId, { ...existing, ...overrides });

    this.logger.info('Updated rate limit overrides for user', { userId, overrides });
  }

  /**
   * Remove user-specific rate limit overrides
   */
  removeUserOverrides(userId: string): void {
    this.userOverrides.delete(userId);
    this.logger.info('Removed rate limit overrides for user', { userId });
  }

  /**
   * Get current rate limit status for a destination
   */
  getDestinationRateLimitStatus(destination: string, userId?: string): {
    minute: { current: number; max: number; remaining: number };
    hour: { current: number; max: number; remaining: number };
    day: { current: number; max: number; remaining: number };
    month: { current: number; max: number; remaining: number };
  } {
    const config = this.getEffectiveDestinationConfig(userId);
    const limits = this.getDestinationLimits(destination);
    const now = new Date();

    return {
      minute: this.getWindowStatus(limits, config.maxPerMinute, 60 * 1000, now),
      hour: this.getWindowStatus(limits, config.maxPerHour, 60 * 60 * 1000, now),
      day: this.getWindowStatus(limits, config.maxPerDay, 24 * 60 * 60 * 1000, now),
      month: this.getWindowStatus(limits, config.maxPerMonth, 30 * 24 * 60 * 60 * 1000, now),
    };
  }

  /**
   * Get current rate limit status for a provider
   */
  getProviderRateLimitStatus(providerName: string): {
    minute: { current: number; max: number; remaining: number };
    hour: { current: number; max: number; remaining: number };
    day: { current: number; max: number; remaining: number };
    month: { current: number; max: number; remaining: number };
  } {
    const config = this.getEffectiveProviderConfig();
    const limits = this.getProviderLimits(providerName);
    const now = new Date();

    return {
      minute: this.getWindowStatus(limits, config.maxPerMinute, 60 * 1000, now),
      hour: this.getWindowStatus(limits, config.maxPerHour, 60 * 60 * 1000, now),
      day: this.getWindowStatus(limits, config.maxPerDay, 24 * 60 * 60 * 1000, now),
      month: this.getWindowStatus(limits, config.maxPerMonth, 30 * 24 * 60 * 60 * 1000, now),
    };
  }

  /**
   * Clean up old rate limit records
   */
  private cleanupOldRecords(): void {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Clean up destination limits
    for (const [destination, limits] of this.destinationLimits.entries()) {
      const filtered = limits.filter(limit => limit.windowStart > oneMonthAgo);
      if (filtered.length !== limits.length) {
        this.destinationLimits.set(destination, filtered);
      }
    }

    // Clean up provider limits
    for (const [provider, limits] of this.providerLimits.entries()) {
      const filtered = limits.filter(limit => limit.windowStart > oneMonthAgo);
      if (filtered.length !== limits.length) {
        this.providerLimits.set(provider, filtered);
      }
    }

    this.logger.debug('Cleaned up old rate limit records');
  }

  private checkRateLimit(
    limits: SmsRateLimit[],
    config: RateLimitConfig,
    key: string
  ): RateLimitCheck {
    const now = new Date();

    // Check each time window
    const minuteCheck = this.checkWindow(limits, config.maxPerMinute, 60 * 1000, now);
    if (!minuteCheck.allowed) {
      return minuteCheck;
    }

    const hourCheck = this.checkWindow(limits, config.maxPerHour, 60 * 60 * 1000, now);
    if (!hourCheck.allowed) {
      return hourCheck;
    }

    const dayCheck = this.checkWindow(limits, config.maxPerDay, 24 * 60 * 60 * 1000, now);
    if (!dayCheck.allowed) {
      return dayCheck;
    }

    const monthCheck = this.checkWindow(limits, config.maxPerMonth, 30 * 24 * 60 * 60 * 1000, now);
    if (!monthCheck.allowed) {
      return monthCheck;
    }

    return minuteCheck; // If we get here, all checks passed
  }

  private checkWindow(
    limits: SmsRateLimit[],
    maxCount: number,
    windowMs: number,
    now: Date
  ): RateLimitCheck {
    const windowStart = new Date(now.getTime() - windowMs);
    const currentWindow = limits.filter(limit => limit.windowStart >= windowStart);

    const currentCount = currentWindow.reduce((sum, limit) => sum + limit.count, 0);

    if (currentCount >= maxCount) {
      const oldestLimit = currentWindow[0];
      if (!oldestLimit) {
        return {
          allowed: false,
          currentCount,
          windowStart: windowStart,
          windowMs,
          resetTime: new Date(windowStart.getTime() + windowMs),
          reason: `Rate limit exceeded: ${currentCount}/${maxCount} in ${windowMs / 1000}s window`,
        };
      }
      const resetTime = new Date(oldestLimit.windowStart.getTime() + windowMs);

      return {
        allowed: false,
        currentCount,
        windowStart: oldestLimit.windowStart,
        windowMs,
        resetTime,
        reason: `Rate limit exceeded: ${currentCount}/${maxCount} in ${windowMs / 1000}s window`,
      };
    }

    return {
      allowed: true,
      currentCount,
      windowStart: windowStart,
      windowMs,
      resetTime: new Date(windowStart.getTime() + windowMs),
    };
  }

  private recordRateLimit(
    limitsMap: Map<string, SmsRateLimit[]>,
    key: string,
    config: RateLimitConfig,
    timestamp: Date
  ): void {
    const limits = this.getLimits(limitsMap, key);

    // Find current minute window
    const minuteWindow = new Date(Math.floor(timestamp.getTime() / (60 * 1000)) * (60 * 1000));
    const hourWindow = new Date(Math.floor(timestamp.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000));
    const dayWindow = new Date(Math.floor(timestamp.getTime() / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000));
    const monthWindow = new Date(Math.floor(timestamp.getTime() / (30 * 24 * 60 * 60 * 1000)) * (30 * 24 * 60 * 60 * 1000));

    // Update or create limits for each window
    this.updateOrCreateLimit(limits, minuteWindow, 60 * 1000, config.maxPerMinute);
    this.updateOrCreateLimit(limits, hourWindow, 60 * 60 * 1000, config.maxPerHour);
    this.updateOrCreateLimit(limits, dayWindow, 24 * 60 * 60 * 1000, config.maxPerDay);
    this.updateOrCreateLimit(limits, monthWindow, 30 * 24 * 60 * 60 * 1000, config.maxPerMonth);

    limitsMap.set(key, limits);
  }

  private updateOrCreateLimit(
    limits: SmsRateLimit[],
    windowStart: Date,
    windowMs: number,
    maxCount: number
  ): void {
    const existingIndex = limits.findIndex(
      limit => limit.windowStart.getTime() === windowStart.getTime() && limit.windowMs === windowMs
    );

    if (existingIndex >= 0 && limits[existingIndex]) {
      limits[existingIndex].count++;
    } else {
      limits.push({
        destination: 'unknown',
        provider: 'unknown',
        count: 1,
        windowStart,
        windowMs,
      });
    }
  }

  private getLimits(limitsMap: Map<string, SmsRateLimit[]>, key: string): SmsRateLimit[] {
    return limitsMap.get(key) || [];
  }

  private getDestinationLimits(destination: string): SmsRateLimit[] {
    return this.destinationLimits.get(destination) || [];
  }

  private getProviderLimits(providerName: string): SmsRateLimit[] {
    return this.providerLimits.get(providerName) || [];
  }

  private getEffectiveDestinationConfig(
    userId?: string,
    priority: 'low' | 'normal' | 'high' | 'critical' | 'medium' = 'normal'
  ): RateLimitConfig {
    const baseConfig = this.defaultDestinationLimits;

    // Apply user overrides if available
    if (userId) {
      const userOverrides = this.userOverrides.get(userId);
      if (userOverrides) {
        return { ...baseConfig, ...userOverrides };
      }
    }

    // Apply priority-based scaling
    const multiplier = this.getPriorityMultiplier(priority);

    return {
      maxPerMinute: Math.floor(baseConfig.maxPerMinute * multiplier),
      maxPerHour: Math.floor(baseConfig.maxPerHour * multiplier),
      maxPerDay: Math.floor(baseConfig.maxPerDay * multiplier),
      maxPerMonth: Math.floor(baseConfig.maxPerMonth * multiplier),
    };
  }

  private getEffectiveProviderConfig(priority: 'low' | 'normal' | 'high' | 'critical' | 'medium' = 'normal'): RateLimitConfig {
    const baseConfig = this.defaultProviderLimits;
    const multiplier = this.getPriorityMultiplier(priority);

    return {
      maxPerMinute: Math.floor(baseConfig.maxPerMinute * multiplier),
      maxPerHour: Math.floor(baseConfig.maxPerHour * multiplier),
      maxPerDay: Math.floor(baseConfig.maxPerDay * multiplier),
      maxPerMonth: Math.floor(baseConfig.maxPerMonth * multiplier),
    };
  }

  private getPriorityMultiplier(priority: 'low' | 'normal' | 'high' | 'critical' | 'medium'): number {
    switch (priority) {
      case 'low':
        return 0.5;
      case 'normal':
        return 1.0;
      case 'medium':
        return 1.2;
      case 'high':
        return 1.5;
      case 'critical':
        return 2.0;
      default:
        return 1.0;
    }
  }

  private getWindowStatus(
    limits: SmsRateLimit[],
    maxCount: number,
    windowMs: number,
    now: Date
  ): { current: number; max: number; remaining: number } {
    const windowStart = new Date(now.getTime() - windowMs);
    const currentWindow = limits.filter(limit => limit.windowStart >= windowStart);
    const current = currentWindow.reduce((sum, limit) => sum + limit.count, 0);

    return {
      current,
      max: maxCount,
      remaining: Math.max(0, maxCount - current),
    };
  }

  private startCleanupTask(): void {
    // Clean up old records every hour
    setInterval(() => {
      this.cleanupOldRecords();
    }, 60 * 60 * 1000); // 1 hour

    this.logger.info('Started SMS rate limiter cleanup task');
  }

  /**
   * Get all rate limit statistics
   */
  getRateLimitStats(): {
    destinations: Map<string, any>;
    providers: Map<string, any>;
    users: Map<string, RateLimitConfig>;
  } {
    const destinationStats = new Map<string, any>();
    const providerStats = new Map<string, any>();

    // Aggregate destination stats
    for (const [destination, limits] of this.destinationLimits.entries()) {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const hourCount = limits
        .filter(limit => limit.windowStart >= lastHour)
        .reduce((sum, limit) => sum + limit.count, 0);

      const dayCount = limits
        .filter(limit => limit.windowStart >= lastDay)
        .reduce((sum, limit) => sum + limit.count, 0);

      destinationStats.set(destination, {
        totalLimits: limits.length,
        lastHour: hourCount,
        lastDay: dayCount,
      });
    }

    // Aggregate provider stats
    for (const [provider, limits] of this.providerLimits.entries()) {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const hourCount = limits
        .filter(limit => limit.windowStart >= lastHour)
        .reduce((sum, limit) => sum + limit.count, 0);

      const dayCount = limits
        .filter(limit => limit.windowStart >= lastDay)
        .reduce((sum, limit) => sum + limit.count, 0);

      providerStats.set(provider, {
        totalLimits: limits.length,
        lastHour: hourCount,
        lastDay: dayCount,
      });
    }

    return {
      destinations: destinationStats,
      providers: providerStats,
      users: new Map(this.userOverrides),
    };
  }
}
