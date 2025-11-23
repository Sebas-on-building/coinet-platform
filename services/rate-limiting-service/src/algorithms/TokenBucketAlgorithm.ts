/**
 * =========================================
 * TOKEN BUCKET ALGORITHM
 * =========================================
 * Token bucket rate limiting algorithm for burst handling
 */

import { IRateLimitAlgorithm } from './RateLimitAlgorithm';
import { TokenBucketConfig, RateLimitResult, RateLimitContext } from '../types';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per millisecond
}

export class TokenBucketAlgorithm implements IRateLimitAlgorithm {
  private config: TokenBucketConfig;
  private buckets: Map<string, TokenBucket> = new Map();

  constructor(config: TokenBucketConfig) {
    this.config = config;
  }

  async checkLimit(context: RateLimitContext): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.getOrCreateBucket(context.key);

    // Refill tokens based on elapsed time
    this.refillTokens(bucket, now);

    // Check if we have enough tokens
    if (bucket.tokens < 1) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + Math.ceil((1 - bucket.tokens) / this.config.refillRate),
        retryAfter: Math.ceil((1 - bucket.tokens) / this.config.refillRate / 1000),
        limit: this.config.capacity,
        windowSize: Math.ceil(this.config.capacity / this.config.refillRate),
      };
    }

    // Consume token
    bucket.tokens--;

    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetTime: now + Math.ceil((this.config.capacity - bucket.tokens) / this.config.refillRate),
      limit: this.config.capacity,
      windowSize: Math.ceil(this.config.capacity / this.config.refillRate),
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  async getUsage(key: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const bucket = this.getOrCreateBucket(key);
    this.refillTokens(bucket, now);

    return {
      current: Math.floor(bucket.tokens),
      limit: this.config.capacity,
      remaining: Math.floor(bucket.tokens),
      resetTime: now + Math.ceil((this.config.capacity - bucket.tokens) / this.config.refillRate),
    };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return {
      status: 'healthy',
      details: `Token bucket algorithm active, ${this.buckets.size} active buckets`,
    };
  }

  getInfo() {
    return {
      name: 'token_bucket',
      config: this.config,
    };
  }

  private getOrCreateBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.config.capacity,
        lastRefill: Date.now(),
        capacity: this.config.capacity,
        refillRate: this.config.refillRate / 1000, // convert to tokens per millisecond
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  private refillTokens(bucket: TokenBucket, now: number): void {
    const elapsed = now - bucket.lastRefill;
    if (elapsed <= 0) return;

    const tokensToAdd = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
}
