/**
 * =========================================
 * LEAKY BUCKET ALGORITHM
 * =========================================
 * Leaky bucket rate limiting algorithm for smooth request processing
 */

import { IRateLimitAlgorithm } from './RateLimitAlgorithm';
import { LeakyBucketConfig, RateLimitResult, RateLimitContext } from '../types';

interface LeakyBucket {
  queue: number[]; // timestamps of queued requests
  capacity: number;
  leakRate: number; // requests per millisecond
  lastLeak: number;
}

export class LeakyBucketAlgorithm implements IRateLimitAlgorithm {
  private config: LeakyBucketConfig;
  private buckets: Map<string, LeakyBucket> = new Map();

  constructor(config: LeakyBucketConfig) {
    this.config = config;
  }

  async checkLimit(context: RateLimitContext): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.getOrCreateBucket(context.key);

    // Process leaks (remove old requests)
    this.processLeaks(bucket, now);

    // Check if bucket is full
    if (bucket.queue.length >= this.config.capacity) {
      // Calculate when the oldest request will be processed
      const oldestRequest = bucket.queue[0];
      const processingTime = oldestRequest + (1 / bucket.leakRate);

      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil(processingTime),
        retryAfter: Math.ceil((processingTime - now) / 1000),
        limit: this.config.capacity,
        windowSize: Math.ceil(this.config.capacity / this.config.leakRate),
      };
    }

    // Add request to queue
    bucket.queue.push(now);

    // Calculate when this request will be processed
    const queuePosition = bucket.queue.length - 1;
    const processingTime = now + (queuePosition / bucket.leakRate);

    return {
      allowed: true,
      remaining: Math.max(0, this.config.capacity - bucket.queue.length),
      resetTime: Math.ceil(processingTime),
      limit: this.config.capacity,
      windowSize: Math.ceil(this.config.capacity / this.config.leakRate),
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
    this.processLeaks(bucket, now);

    return {
      current: bucket.queue.length,
      limit: this.config.capacity,
      remaining: Math.max(0, this.config.capacity - bucket.queue.length),
      resetTime: bucket.queue.length > 0
        ? Math.ceil(bucket.queue[bucket.queue.length - 1] + (1 / bucket.leakRate))
        : now,
    };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return {
      status: 'healthy',
      details: `Leaky bucket algorithm active, ${this.buckets.size} active buckets`,
    };
  }

  getInfo() {
    return {
      name: 'leaky_bucket',
      config: this.config,
    };
  }

  private getOrCreateBucket(key: string): LeakyBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        queue: [],
        capacity: this.config.capacity,
        leakRate: this.config.leakRate / 1000, // convert to requests per millisecond
        lastLeak: Date.now(),
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  private processLeaks(bucket: LeakyBucket, now: number): void {
    const elapsed = now - bucket.lastLeak;
    if (elapsed <= 0) return;

    const requestsToProcess = Math.floor(elapsed * bucket.leakRate);

    if (requestsToProcess > 0) {
      bucket.queue.splice(0, requestsToProcess);
      bucket.lastLeak = now;
    }
  }
}
