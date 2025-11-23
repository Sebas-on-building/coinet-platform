/**
 * =========================================
 * FIXED WINDOW ALGORITHM
 * =========================================
 * Simple time-window based rate limiting algorithm
 */

import { IRateLimitAlgorithm } from './RateLimitAlgorithm';
import { FixedWindowConfig, RateLimitResult, RateLimitContext } from '../types';

export class FixedWindowAlgorithm implements IRateLimitAlgorithm {
  private config: FixedWindowConfig;
  private windows: Map<string, { count: number; windowStart: number }> = new Map();

  constructor(config: FixedWindowConfig) {
    this.config = config;
  }

  async checkLimit(context: RateLimitContext): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = this.getWindowKey(context.key, now);
    const windowStart = this.getWindowStart(now);

    // Get or create window
    let window = this.windows.get(windowKey);
    if (!window || window.windowStart < windowStart) {
      window = {
        count: 0,
        windowStart,
      };
      this.windows.set(windowKey, window);
    }

    // Check if limit exceeded
    if (window.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + this.config.windowSize,
        retryAfter: Math.ceil((windowStart + this.config.windowSize - now) / 1000),
        limit: this.config.maxRequests,
        windowSize: this.config.windowSize,
      };
    }

    // Increment counter
    window.count++;

    return {
      allowed: true,
      remaining: Math.max(0, this.config.maxRequests - window.count),
      resetTime: windowStart + this.config.windowSize,
      limit: this.config.maxRequests,
      windowSize: this.config.windowSize,
    };
  }

  async reset(key: string): Promise<void> {
    // Remove all windows for this key
    for (const windowKey of Array.from(this.windows.keys())) {
      if (windowKey.startsWith(`${key}:`)) {
        this.windows.delete(windowKey);
      }
    }
  }

  async getUsage(key: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const windowKey = this.getWindowKey(key, now);
    const windowStart = this.getWindowStart(now);

    const window = this.windows.get(windowKey);
    const current = window && window.windowStart >= windowStart ? window.count : 0;
    const limit = this.config.maxRequests;
    const remaining = Math.max(0, limit - current);

    return {
      current,
      limit,
      remaining,
      resetTime: windowStart + this.config.windowSize,
    };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return {
      status: 'healthy',
      details: `Fixed window algorithm active, ${this.windows.size} active windows`,
    };
  }

  getInfo() {
    return {
      name: 'fixed_window',
      config: this.config,
    };
  }

  private getWindowKey(key: string, timestamp: number): string {
    const windowStart = this.getWindowStart(timestamp);
    return `${key}:${windowStart}`;
  }

  private getWindowStart(timestamp: number): number {
    return Math.floor(timestamp / this.config.windowSize) * this.config.windowSize;
  }
}
