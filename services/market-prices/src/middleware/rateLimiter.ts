/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm using Bottleneck
 */

import Bottleneck from 'bottleneck';
import { RateLimitConfig, DataSource, RateLimitError } from '../types';
import { logger } from '../utils/logger';

export class RateLimiter {
  private limiters: Map<DataSource, Bottleneck>;
  private configs: Map<DataSource, RateLimitConfig>;

  constructor() {
    this.limiters = new Map();
    this.configs = new Map();
  }

  /**
   * Register a rate limiter for a data source
   */
  register(source: DataSource, config: RateLimitConfig): void {
    logger.info(`Registering rate limiter for ${source}`, {
      maxRequestsPerMinute: config.maxRequestsPerMinute,
    });

    this.configs.set(source, config);

    const limiter = new Bottleneck({
      reservoir: config.reservoir,
      reservoirRefreshAmount: config.reservoirRefreshAmount,
      reservoirRefreshInterval: config.reservoirRefreshInterval,
      maxConcurrent: 10, // Max concurrent requests
      minTime: Math.floor(config.reservoirRefreshInterval / config.maxRequestsPerMinute),
    });

    // Event handlers
    limiter.on('failed', async (error, jobInfo) => {
      logger.warn(`Rate limit job failed for ${source}`, {
        error: error.message,
        retryCount: jobInfo.retryCount,
      });

      // Retry logic
      if (jobInfo.retryCount < 3) {
        return 2000 * (jobInfo.retryCount + 1); // Exponential backoff
      }
    });

    limiter.on('retry', (error, jobInfo) => {
      logger.info(`Retrying rate limit job for ${source}`, {
        retryCount: jobInfo.retryCount,
      });
    });

    limiter.on('depleted', () => {
      logger.warn(`Rate limit reservoir depleted for ${source}`);
    });

    limiter.on('error', (error) => {
      logger.error(`Rate limiter error for ${source}`, { error: error.message });
    });

    this.limiters.set(source, limiter);
  }

  /**
   * Schedule a task with rate limiting
   */
  async schedule<T>(
    source: DataSource,
    task: () => Promise<T>,
    priority?: number
  ): Promise<T> {
    const limiter = this.limiters.get(source);
    if (!limiter) {
      throw new Error(`No rate limiter registered for ${source}`);
    }

    try {
      return await limiter.schedule({ priority: priority || 5 }, task);
    } catch (error: any) {
      if (error.statusCode === 429 || error.response?.status === 429) {
        const retryAfter = this.extractRetryAfter(error);
        throw new RateLimitError(
          `Rate limit exceeded for ${source}`,
          retryAfter,
          source
        );
      }
      throw error;
    }
  }

  /**
   * Extract retry-after value from error response
   */
  private extractRetryAfter(error: any): number | undefined {
    // Check Retry-After header
    if (error.response?.headers?.['retry-after']) {
      const retryAfter = error.response.headers['retry-after'];
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to milliseconds
      }
    }

    // Check X-RateLimit-Reset header (Unix timestamp)
    if (error.response?.headers?.['x-ratelimit-reset']) {
      const resetTime = parseInt(error.response.headers['x-ratelimit-reset'], 10);
      if (!isNaN(resetTime)) {
        return Math.max(0, resetTime * 1000 - Date.now());
      }
    }

    return undefined;
  }

  /**
   * Get current counts for a source
   */
  getCounts(source: DataSource): {
    running: number;
    queued: number;
    executing: number;
  } {
    const limiter = this.limiters.get(source);
    if (!limiter) {
      return { running: 0, queued: 0, executing: 0 };
    }

    return {
      running: limiter.counts().RUNNING,
      queued: limiter.counts().QUEUED,
      executing: limiter.counts().EXECUTING,
    };
  }

  /**
   * Check if source is currently throttled
   */
  isThrottled(source: DataSource): boolean {
    const counts = this.getCounts(source);
    const config = this.configs.get(source);
    
    if (!config) {
      return false;
    }

    // Consider throttled if queue is building up
    return counts.queued > config.maxRequestsPerMinute / 2;
  }

  /**
   * Pause a rate limiter
   */
  async pause(source: DataSource, duration?: number): Promise<void> {
    const limiter = this.limiters.get(source);
    if (!limiter) {
      return;
    }

    logger.info(`Pausing rate limiter for ${source}`, { duration });
    
    if (duration) {
      await limiter.schedule(() => new Promise((resolve) => setTimeout(resolve, duration)));
    } else {
      await limiter.stop({ dropWaitingJobs: false });
    }
  }

  /**
   * Resume a paused rate limiter
   */
  resume(source: DataSource): void {
    const limiter = this.limiters.get(source);
    if (!limiter) {
      return;
    }

    logger.info(`Resuming rate limiter for ${source}`);
    // Bottleneck doesn't have an explicit resume, just continue scheduling
  }

  /**
   * Clear all pending jobs for a source
   */
  async clear(source: DataSource): Promise<void> {
    const limiter = this.limiters.get(source);
    if (!limiter) {
      return;
    }

    logger.info(`Clearing rate limiter for ${source}`);
    await limiter.stop({ dropWaitingJobs: true });
  }

  /**
   * Disconnect all rate limiters
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting all rate limiters');
    
    const promises = Array.from(this.limiters.entries()).map(([source, limiter]) => {
      logger.info(`Stopping rate limiter for ${source}`);
      return limiter.stop({ dropWaitingJobs: false });
    });

    await Promise.all(promises);
    this.limiters.clear();
    this.configs.clear();
  }

  /**
   * Get statistics for all rate limiters
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [source, limiter] of this.limiters.entries()) {
      const config = this.configs.get(source);
      stats[source] = {
        counts: {
          running: limiter.counts().RUNNING,
          queued: limiter.counts().QUEUED,
          executing: limiter.counts().EXECUTING,
          done: limiter.counts().DONE,
        },
        config: {
          maxRequestsPerMinute: config?.maxRequestsPerMinute,
          reservoir: config?.reservoir,
        },
        isThrottled: this.isThrottled(source),
      };
    }

    return stats;
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

export function resetRateLimiter(): void {
  if (rateLimiterInstance) {
    rateLimiterInstance.disconnect();
    rateLimiterInstance = null;
  }
}

export default getRateLimiter;

