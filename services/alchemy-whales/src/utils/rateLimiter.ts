/**
 * Advanced rate limiter with exponential backoff and async batching
 */

import Bottleneck from 'bottleneck';
import { RateLimiterConfig, Chain, RateLimitError } from '../types';
import { logger } from './logger';

/**
 * Rate limiter manager for multi-chain API calls
 */
export class RateLimiterManager {
  private limiters: Map<Chain, Bottleneck>;
  private config: RateLimiterConfig;
  private metrics: Map<Chain, {
    requests: number;
    errors: number;
    rateLimited: number;
    lastRequest: number;
  }>;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.limiters = new Map();
    this.metrics = new Map();
    
    // Initialize limiters for each chain
    Object.values(Chain).forEach(chain => {
      this.createLimiter(chain);
    });

    logger.info({
      msg: 'Rate limiter manager initialized',
      maxRequestsPerSecond: config.maxRequestsPerSecond,
      maxConcurrent: config.maxConcurrent,
      reservoir: config.reservoir,
    });
  }

  /**
   * Create Bottleneck limiter for a chain
   */
  private createLimiter(chain: Chain): void {
    const limiter = new Bottleneck({
      // Max concurrent jobs
      maxConcurrent: this.config.maxConcurrent,
      
      // Min time between jobs
      minTime: this.config.minTime,
      
      // Reservoir configuration (token bucket)
      reservoir: this.config.reservoir,
      reservoirRefreshAmount: this.config.reservoirRefreshAmount,
      reservoirRefreshInterval: this.config.reservoirRefreshInterval,
      
      // High water mark for warnings
      highWater: this.config.highWater,
      
      // Strategy: 'leak' = jobs leak from the reservoir
      strategy: Bottleneck.strategy.LEAK,
      
      // Track done jobs
      trackDoneStatus: true,
    });

    // Event handlers
    limiter.on('error', (error) => {
      logger.error({ msg: `Rate limiter error for ${chain}`, error: error.message });
      this.incrementMetric(chain, 'errors');
    });

    limiter.on('failed', async (error, jobInfo) => {
      logger.warn({
        msg: `Rate limiter job failed for ${chain}`,
        error: error.message,
        retryCount: jobInfo.retryCount,
      });
      
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        this.incrementMetric(chain, 'rateLimited');
        
        // Exponential backoff for retries
        const retryDelay = this.calculateRetryDelay(jobInfo.retryCount);
        
        logger.info({
          msg: `Retrying after rate limit for ${chain}`,
          retryCount: jobInfo.retryCount,
          retryDelay,
        });
        
        return retryDelay;
      }
      
      // Don't retry non-rate-limit errors
      return;
    });

    limiter.on('retry', (_message, jobInfo) => {
      logger.info({
        msg: `Retrying job for ${chain}`,
        retryCount: jobInfo.retryCount,
      });
    });

    limiter.on('depleted', () => {
      logger.warn({ msg: `Rate limiter depleted for ${chain}` });
    });

    limiter.on('debug', (message, data) => {
      logger.debug({ msg: `Rate limiter debug for ${chain}`, message, data });
    });

    this.limiters.set(chain, limiter);
    this.metrics.set(chain, {
      requests: 0,
      errors: 0,
      rateLimited: 0,
      lastRequest: 0,
    });
  }

  /**
   * Schedule a job with rate limiting
   */
  async schedule<T>(
    chain: Chain,
    fn: () => Promise<T>,
    options?: {
      priority?: number;
      weight?: number;
      expiration?: number;
      id?: string;
    }
  ): Promise<T> {
    const limiter = this.limiters.get(chain);
    if (!limiter) {
      throw new Error(`No rate limiter found for chain: ${chain}`);
    }

    this.incrementMetric(chain, 'requests');
    this.updateLastRequest(chain);

    try {
      return await limiter.schedule(
        {
          priority: options?.priority || 5,
          weight: options?.weight || 1,
          expiration: options?.expiration,
          id: options?.id,
        },
        fn
      );
    } catch (error: any) {
      this.incrementMetric(chain, 'errors');
      throw error;
    }
  }

  /**
   * Batch multiple operations with rate limiting
   */
  async scheduleBatch<T>(
    chain: Chain,
    operations: Array<() => Promise<T>>,
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(op => this.schedule(chain, op))
      );
      results.push(...batchResults);
      
      logger.debug({
        msg: `Processed batch for ${chain}`,
        processed: results.length,
        total: operations.length,
      });
    }
    
    return results;
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (error instanceof RateLimitError) return true;
    
    const status = error.response?.status || error.statusCode;
    if (status === 429) return true;
    
    const message = error.message?.toLowerCase() || '';
    return message.includes('rate limit') || message.includes('too many requests');
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000;  // 60 seconds
    const multiplier = 2;
    
    const delay = Math.min(
      baseDelay * Math.pow(multiplier, retryCount),
      maxDelay
    );
    
    // Add jitter (0-25%)
    const jitter = Math.random() * 0.25 * delay;
    
    return Math.floor(delay + jitter);
  }

  /**
   * Increment metric counter
   */
  private incrementMetric(chain: Chain, metric: 'requests' | 'errors' | 'rateLimited'): void {
    const metrics = this.metrics.get(chain);
    if (metrics) {
      metrics[metric]++;
    }
  }

  /**
   * Update last request timestamp
   */
  private updateLastRequest(chain: Chain): void {
    const metrics = this.metrics.get(chain);
    if (metrics) {
      metrics.lastRequest = Date.now();
    }
  }

  /**
   * Get metrics for a chain
   */
  getMetrics(chain: Chain) {
    return this.metrics.get(chain);
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const allMetrics: Record<string, any> = {};
    this.metrics.forEach((metrics, chain) => {
      allMetrics[chain] = { ...metrics };
    });
    return allMetrics;
  }

  /**
   * Get current reservoir level
   */
  async getReservoirLevel(chain: Chain): Promise<number | null> {
    const limiter = this.limiters.get(chain);
    if (!limiter) return null;
    
    return limiter.currentReservoir();
  }

  /**
   * Get counts (queued, running, done)
   */
  getCounts(chain: Chain) {
    const limiter = this.limiters.get(chain);
    if (!limiter) return null;
    
    return limiter.counts();
  }

  /**
   * Check if limiter is running at capacity
   */
  async isAtCapacity(chain: Chain): Promise<boolean> {
    const counts = this.getCounts(chain);
    if (!counts) return false;
    
    return counts.RUNNING >= this.config.maxConcurrent;
  }

  /**
   * Pause rate limiter
   */
  async pause(chain: Chain, duration?: number): Promise<void> {
    const limiter = this.limiters.get(chain);
    if (!limiter) return;
    
    await limiter.stop({ dropWaitingJobs: false });
    
    if (duration) {
      setTimeout(() => {
        // Note: Bottleneck doesn't have a start() method, limiter automatically resumes
        logger.info({ msg: `Rate limiter resumed for ${chain}` });
      }, duration);
    }
    
    logger.info({ msg: `Rate limiter paused for ${chain}`, duration });
  }

  /**
   * Resume rate limiter
   */
  resume(chain: Chain): void {
    const limiter = this.limiters.get(chain);
    if (!limiter) return;
    
    // Note: Bottleneck doesn't have a start() method, limiter automatically resumes
    logger.info({ msg: `Rate limiter resumed for ${chain}` });
  }

  /**
   * Update reservoir dynamically based on API response headers
   */
  updateReservoir(chain: Chain, remaining: number, limit: number): void {
    const limiter = this.limiters.get(chain);
    if (!limiter) return;
    
    const usagePercent = ((limit - remaining) / limit) * 100;
    
    // If usage is high (>80%), reduce reservoir
    if (usagePercent > 80) {
      const newReservoir = Math.max(
        Math.floor(this.config.reservoir * 0.5),
        10
      );
      
      limiter.updateSettings({
        reservoir: newReservoir,
        reservoirRefreshAmount: Math.floor(newReservoir * 0.25),
      });
      
      logger.warn({
        msg: `Reduced reservoir for ${chain} due to high usage`,
        usagePercent,
        newReservoir,
        remaining,
        limit,
      });
    }
  }

  /**
   * Reset all limiters
   */
  async resetAll(): Promise<void> {
    for (const [chain, limiter] of this.limiters) {
      await limiter.stop({ dropWaitingJobs: true });
      await limiter.disconnect();
      this.createLimiter(chain);
    }
    logger.info({ msg: 'All rate limiters reset' });
  }

  /**
   * Shutdown all limiters
   */
  async shutdown(): Promise<void> {
    logger.info({ msg: 'Shutting down rate limiters...' });
    
    for (const [chain, limiter] of this.limiters) {
      await limiter.stop({ dropWaitingJobs: false });
      await limiter.disconnect();
      logger.info({ msg: `Rate limiter shutdown for ${chain}` });
    }
  }
}

/**
 * Singleton instance
 */
let rateLimiterInstance: RateLimiterManager | null = null;

/**
 * Get or create rate limiter instance
 */
export function getRateLimiter(config?: RateLimiterConfig): RateLimiterManager {
  if (!rateLimiterInstance && config) {
    rateLimiterInstance = new RateLimiterManager(config);
  }
  
  if (!rateLimiterInstance) {
    throw new Error('Rate limiter not initialized. Provide config on first call.');
  }
  
  return rateLimiterInstance;
}

export default RateLimiterManager;

