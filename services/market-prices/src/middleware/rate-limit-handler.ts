/**
 * Advanced Rate Limit Handler
 * Handles 429 errors with proper retry-after parsing and exponential backoff
 */

import { AxiosError } from 'axios';
import { RateLimitError, DataSource } from '../types';
import { logger } from '../utils/logger';

export interface RateLimitInfo {
  retryAfter: number; // milliseconds
  resetTime?: Date;
  limit?: number;
  remaining?: number;
  used?: number;
}

export class RateLimitHandler {
  /**
   * Extract rate limit information from error response
   */
  static extractRateLimitInfo(error: AxiosError, source: DataSource): RateLimitInfo | null {
    if (!error.response || error.response.status !== 429) {
      return null;
    }

    const headers = error.response.headers;
    const info: RateLimitInfo = {
      retryAfter: 60000, // Default: 1 minute
    };

    // Parse Retry-After header (seconds or HTTP date)
    if (headers['retry-after']) {
      const retryAfter = headers['retry-after'];
      
      // Try parsing as seconds (integer)
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        info.retryAfter = seconds * 1000;
      } else {
        // Try parsing as HTTP date
        const date = new Date(retryAfter);
        if (!isNaN(date.getTime())) {
          info.retryAfter = Math.max(0, date.getTime() - Date.now());
        }
      }
    }

    // Parse X-RateLimit-Reset (Unix timestamp)
    if (headers['x-ratelimit-reset']) {
      const resetTimestamp = parseInt(headers['x-ratelimit-reset'], 10);
      if (!isNaN(resetTimestamp)) {
        info.resetTime = new Date(resetTimestamp * 1000);
        info.retryAfter = Math.max(0, resetTimestamp * 1000 - Date.now());
      }
    }

    // Parse rate limit headers (provider-specific)
    if (source === DataSource.COINGECKO) {
      if (headers['x-ratelimit-limit']) {
        info.limit = parseInt(headers['x-ratelimit-limit'], 10);
      }
      if (headers['x-ratelimit-remaining']) {
        info.remaining = parseInt(headers['x-ratelimit-remaining'], 10);
        if (info.limit) {
          info.used = info.limit - info.remaining;
        }
      }
    }

    if (source === DataSource.COINMARKETCAP) {
      if (headers['x-cmc-credits-used']) {
        info.used = parseInt(headers['x-cmc-credits-used'], 10);
      }
      if (headers['x-cmc-credits-remaining']) {
        info.remaining = parseInt(headers['x-cmc-credits-remaining'], 10);
        if (info.used !== undefined && info.remaining !== undefined) {
          info.limit = info.used + info.remaining;
        }
      }
      if (headers['x-cmc-credits-reset']) {
        const resetTimestamp = parseInt(headers['x-cmc-credits-reset'], 10);
        if (!isNaN(resetTimestamp)) {
          info.resetTime = new Date(resetTimestamp * 1000);
          info.retryAfter = Math.max(0, resetTimestamp * 1000 - Date.now());
        }
      }
    }

    return info;
  }

  /**
   * Create RateLimitError with proper retry-after information
   */
  static createRateLimitError(
    error: AxiosError,
    source: DataSource
  ): RateLimitError {
    const info = this.extractRateLimitInfo(error, source);

    const message = info
      ? `Rate limit exceeded for ${source}. Retry after ${Math.ceil(info.retryAfter / 1000)}s`
      : `Rate limit exceeded for ${source}`;

    const rateLimitError = new RateLimitError(
      message,
      info?.retryAfter,
      source
    );

    // Add additional context
    if (info) {
      (rateLimitError as any).resetTime = info.resetTime;
      (rateLimitError as any).limit = info.limit;
      (rateLimitError as any).remaining = info.remaining;
      (rateLimitError as any).used = info.used;
    }

    logger.warn('Rate limit exceeded', {
      source,
      retryAfter: info?.retryAfter,
      resetTime: info?.resetTime,
      limit: info?.limit,
      remaining: info?.remaining,
    });

    return rateLimitError;
  }

  /**
   * Calculate exponential backoff delay
   */
  static calculateBackoff(attempt: number, baseDelay: number = 1000): number {
    // Exponential backoff: baseDelay * 2^attempt, capped at 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, attempt), 5 * 60 * 1000);
    return delay;
  }

  /**
   * Wait for rate limit reset
   */
  static async waitForReset(retryAfter: number): Promise<void> {
    if (retryAfter <= 0) {
      return;
    }

    logger.info(`Waiting ${Math.ceil(retryAfter / 1000)}s for rate limit reset`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter));
  }
}

export default RateLimitHandler;

