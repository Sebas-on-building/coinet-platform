/**
 * =========================================
 * SLIDING WINDOW ALGORITHM
 * =========================================
 * Advanced sliding window rate limiting with sub-window precision
 */

import { IRateLimitAlgorithm } from './RateLimitAlgorithm';
import { SlidingWindowConfig, RateLimitResult, RateLimitContext } from '../types';

interface SubWindow {
  start: number;
  count: number;
}

export class SlidingWindowAlgorithm implements IRateLimitAlgorithm {
  private config: SlidingWindowConfig;
  private windows: Map<string, SubWindow[]> = new Map();

  constructor(config: SlidingWindowConfig) {
    this.config = config;
  }

  async checkLimit(context: RateLimitContext): Promise<RateLimitResult> {
    const now = Date.now();

    // Clean up old sub-windows
    this.cleanupOldWindows(context.key, now);

    // Calculate current window boundaries
    const currentWindowStart = this.getCurrentWindowStart(now);
    const previousWindowStart = currentWindowStart - this.config.windowSize;

    // Get or create sub-windows for current key
    let keyWindows = this.windows.get(context.key) || [];

    // Calculate total requests in the sliding window
    const totalRequests = this.calculateTotalRequests(keyWindows, previousWindowStart, now);

    // Check if limit exceeded
    if (totalRequests >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: currentWindowStart + this.config.windowSize,
        retryAfter: Math.ceil((currentWindowStart + this.config.windowSize - now) / 1000),
        limit: this.config.maxRequests,
        windowSize: this.config.windowSize,
      };
    }

    // Add current request to appropriate sub-window
    const subWindowIndex = this.getSubWindowIndex(now);
    const currentSubWindowStart = currentWindowStart + (subWindowIndex * this.config.precision);

    // Find or create sub-window
    let subWindow = keyWindows.find(w => w.start === currentSubWindowStart);
    if (!subWindow) {
      subWindow = { start: currentSubWindowStart, count: 0 };
      keyWindows.push(subWindow);
    }

    subWindow.count++;

    // Update windows map
    this.windows.set(context.key, keyWindows);

    const remaining = Math.max(0, this.config.maxRequests - totalRequests - 1);

    return {
      allowed: true,
      remaining,
      resetTime: currentWindowStart + this.config.windowSize,
      limit: this.config.maxRequests,
      windowSize: this.config.windowSize,
    };
  }

  async reset(key: string): Promise<void> {
    this.windows.delete(key);
  }

  async getUsage(key: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const currentWindowStart = this.getCurrentWindowStart(now);

    let keyWindows = this.windows.get(key) || [];
    const totalRequests = this.calculateTotalRequests(keyWindows, currentWindowStart - this.config.windowSize, now);

    return {
      current: totalRequests,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - totalRequests),
      resetTime: currentWindowStart + this.config.windowSize,
    };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return {
      status: 'healthy',
      details: `Sliding window algorithm active, ${this.windows.size} active windows`,
    };
  }

  getInfo() {
    return {
      name: 'sliding_window',
      config: this.config,
    };
  }

  private cleanupOldWindows(key: string, now: number): void {
    const keyWindows = this.windows.get(key);
    if (!keyWindows) return;

    const cutoff = now - this.config.windowSize;
    const filtered = keyWindows.filter(w => w.start >= cutoff);

    if (filtered.length !== keyWindows.length) {
      this.windows.set(key, filtered);
    }
  }

  private calculateTotalRequests(windows: SubWindow[], startTime: number, endTime: number): number {
    return windows
      .filter(w => w.start >= startTime && w.start < endTime)
      .reduce((sum, w) => sum + w.count, 0);
  }

  private getCurrentWindowStart(timestamp: number): number {
    return Math.floor(timestamp / this.config.windowSize) * this.config.windowSize;
  }

  private getSubWindowIndex(timestamp: number): number {
    const windowStart = this.getCurrentWindowStart(timestamp);
    return Math.floor((timestamp - windowStart) / this.config.precision);
  }
}
