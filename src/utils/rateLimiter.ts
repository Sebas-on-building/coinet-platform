/**
 * A simple rate limiter implementation that limits the number of requests
 * that can be made within a given time window.
 */

import rateLimit from 'express-rate-limit';

export interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Optional error message when rate limit is exceeded */
  message?: string;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  timestamps: number[]; // Add timestamps array for tracking requests
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private maxRequests: number;
  private timeWindowMs: number;
  private message: string;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.timeWindowMs = options.windowMs;
    this.message =
      options.message || "Too many requests, please try again later.";
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.maxRequests,
        lastRefill: now,
        timestamps: [],
      };
      this.buckets.set(key, bucket);
    }

    // Calculate token refill
    const timePassed = now - bucket.lastRefill;
    const refillRate = this.maxRequests / this.timeWindowMs;
    const tokensToAdd = Math.floor(timePassed * refillRate);

    bucket.tokens = Math.min(this.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      bucket.timestamps.push(now);
      // Clean up old timestamps
      bucket.timestamps = bucket.timestamps.filter(
        (ts) => now - ts < this.timeWindowMs,
      );
      return true;
    }

    return false;
  }

  async waitForToken(key: string): Promise<void> {
    while (!(await this.checkLimit(key))) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  async resetAll(): Promise<void> {
    this.buckets.clear();
  }

  /**
   * Returns the number of requests remaining for a key
   * @param key - The identifier for the rate limit
   * @returns The number of requests remaining in the current window
   */
  getRequestsRemaining(key: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket) return this.maxRequests;

    const recentTimestamps = bucket.timestamps.filter(
      (timestamp) => now - timestamp < this.timeWindowMs,
    );

    return Math.max(0, this.maxRequests - recentTimestamps.length);
  }

  /**
   * Gets the time in milliseconds until the rate limit resets
   * @param key - The identifier for the rate limit
   * @returns Time in milliseconds until the rate limit resets
   */
  getTimeUntilReset(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.timestamps.length === 0) {
      return 0;
    }

    const now = Date.now();
    const oldestTimestamp = Math.min(...bucket.timestamps);
    return Math.max(0, this.timeWindowMs - (now - oldestTimestamp));
  }
}

// API-specific rate limiter factories
export function createBinanceRateLimiter(): RateLimiter {
  return new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 1200, // Binance limit is 1200 requests per minute
    message: "Binance API rate limit exceeded",
  });
}

export function createCoinGeckoRateLimiter(): RateLimiter {
  return new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 50, // CoinGecko free tier limit
    message: "CoinGecko API rate limit exceeded",
  });
}

export function createCoinMarketCapRateLimiter(): RateLimiter {
  return new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 30, // CMC basic tier limit
    message: "CoinMarketCap API rate limit exceeded",
  });
}

// Default instance
export const defaultRateLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 100,
  message: "Rate limit exceeded",
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});
