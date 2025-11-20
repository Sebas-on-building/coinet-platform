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
      // Completely disable Bottleneck's retry mechanism
      // We handle retries manually in the schedule() method
    });

    // Event handlers for logging only (no retry control)
    limiter.on('failed', async (error, jobInfo) => {
      const originalError = error.originalError || error;
      const statusCode = 
        originalError.response?.status || 
        error.response?.status || 
        originalError.statusCode || 
        error.statusCode;

      logger.warn(`Rate limit job failed for ${source}`, {
        error: error.message,
        statusCode,
        hasOriginalError: !!error.originalError,
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

    // Manual retry logic - wrap task to handle retries ourselves
    const wrappedTask = async (): Promise<T> => {
      let lastError: any;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await task();
        } catch (error: any) {
          lastError = error;
          
          // Extract status code - check ProviderError.statusCode first, then nested properties
          // Use nullish coalescing (??) instead of || to avoid issues with falsy values like 0
          // ProviderError has statusCode as a direct property
          let statusCode: number | undefined = undefined;
          
          // Try to extract status code from various error structures
          if (typeof error?.statusCode === 'number') {
            statusCode = error.statusCode;
          } else if (typeof error?.status === 'number') {
            statusCode = error.status;
          } else if (typeof error?.originalError?.statusCode === 'number') {
            statusCode = error.originalError.statusCode;
          } else if (typeof error?.originalError?.status === 'number') {
            statusCode = error.originalError.status;
          } else if (typeof error?.response?.status === 'number') {
            statusCode = error.response.status;
          } else if (typeof error?.originalError?.response?.status === 'number') {
            statusCode = error.originalError.response.status;
          }

          // Don't retry client errors (4xx except 429) - these are permanent failures
          const isClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 && statusCode !== 429;
          
          if (isClientError) {
            logger.warn(`Not retrying ${source} - client error ${statusCode} is not retryable`, {
              error: error?.message || String(error),
              statusCode,
              errorType: error?.constructor?.name || typeof error,
            });
            throw error; // Don't retry, throw immediately
          }

          // Only retry on retryable errors
          const isRetryable = 
            statusCode === undefined || statusCode === null || // No status code = network error
            statusCode === 429 || // Rate limit error
            (typeof statusCode === 'number' && statusCode >= 500); // Server error (5xx)

          if (!isRetryable && statusCode !== undefined && statusCode !== null) {
            // Not retryable and not a client error - throw immediately
            throw error;
          }

          // If this is the last attempt, throw the error
          if (attempt === maxRetries) {
            logger.warn(`Max retries reached for ${source}`, {
              attempt: attempt + 1,
              statusCode,
            });
            throw error;
          }

          // Calculate delay for retry
          const delay = 2000 * (attempt + 1);
          logger.warn(`Retrying task for ${source} after error`, {
            attempt: attempt + 1,
            delay,
            maxRetries,
            statusCode,
            error: error?.message || String(error),
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Should never reach here, but TypeScript needs it
      throw lastError || new Error('Task failed after retries');
    };

    try {
      return await limiter.schedule({ priority: priority || 5 }, wrappedTask);
    } catch (error: any) {
      // Unwrap the error if needed
      if (error.originalError) {
        throw error.originalError;
      }
      
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
   * Alias for disconnect() for consistency
   */
  async disconnectAll(): Promise<void> {
    return this.disconnect();
  }

  /**
   * Get statistics for all rate limiters
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [source, limiter] of Array.from(this.limiters.entries())) {
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

