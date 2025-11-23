/**
 * =========================================
 * RATE LIMIT ALGORITHM INTERFACE
 * =========================================
 * Base interface for all rate limiting algorithms
 */

import { RateLimitResult, RateLimitContext } from '../types';

export interface IRateLimitAlgorithm {
  /**
   * Check if a request is allowed under the current rate limit
   */
  checkLimit(context: RateLimitContext): Promise<RateLimitResult>;

  /**
   * Reset the rate limit state for a specific key
   */
  reset(key: string): Promise<void>;

  /**
   * Get current usage statistics for a key
   */
  getUsage(key: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  }>;

  /**
   * Health check for the algorithm
   */
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;

  /**
   * Get algorithm name and configuration
   */
  getInfo(): {
    name: string;
    config: Record<string, any>;
  };
}
