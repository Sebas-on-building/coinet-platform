/**
 * =========================================
 * RATE LIMITING MIDDLEWARE
 * =========================================
 * Express.js middleware for API rate limiting integration
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitingService } from '../RateLimitingService';
import { RateLimitContext, LoadMetrics } from '../types';

export interface RateLimitMiddlewareOptions {
  service: RateLimitingService;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  xRateLimitLimit?: number;
  xRateLimitRemaining?: number;
  xRateLimitReset?: number;
  onLimitReached?: (req: Request, res: Response, next: NextFunction) => void;
}

export class RateLimitingMiddleware {
  private service: RateLimitingService;
  private options: RateLimitMiddlewareOptions;

  constructor(options: RateLimitMiddlewareOptions) {
    this.service = options.service;
    this.options = options;
  }

  /**
   * Main middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Generate rate limit key
        const key = this.options.keyGenerator
          ? this.options.keyGenerator(req)
          : this.defaultKeyGenerator(req);

        // Create rate limit context
        const context: RateLimitContext = {
          key,
          resource: `${req.method}:${req.path}`,
          algorithm: this.service.getConfig().algorithms.default,
          timestamp: Date.now(),
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: (req as any).user?.id,
        };

        // Check rate limit
        const result = await this.service.checkRateLimit(context);

        if (!result.allowed) {
          // Handle rate limit exceeded
          return this.handleRateLimitExceeded(req, res, result);
        }

        // Set rate limit headers
        this.setRateLimitHeaders(res, result);

        // Continue to next middleware
        next();

      } catch (error: any) {
        console.error('Rate limiting middleware error:', error);
        // On error, fail open
        next();
      }
    };
  }

  /**
   * Default key generator based on IP and user ID
   */
  private defaultKeyGenerator(req: Request): string {
    const userId = (req as any).user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `${userId}:${ip}`;
  }

  /**
   * Handle rate limit exceeded scenario
   */
  private handleRateLimitExceeded(req: Request, res: Response, result: any): void {
    // Call custom handler if provided
    if (this.options.onLimitReached) {
      return this.options.onLimitReached(req, res, () => {});
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': result.limit,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': result.resetTime,
      'Retry-After': result.retryAfter || 60,
    });

    // Send 429 response
    const message = this.options.message || 'Too Many Requests';
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message,
      retryAfter: result.retryAfter,
      resetTime: result.resetTime,
      limit: result.limit,
      windowSize: result.windowSize,
    });
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(res: Response, result: any): void {
    if (!this.options.standardHeaders) return;

    res.set({
      'X-RateLimit-Limit': result.limit || this.options.xRateLimitLimit || 0,
      'X-RateLimit-Remaining': result.remaining || this.options.xRateLimitRemaining || 0,
      'X-RateLimit-Reset': result.resetTime || this.options.xRateLimitReset || 0,
    });

    if (this.options.legacyHeaders) {
      res.set({
        'X-RateLimit-Limit': result.limit || this.options.xRateLimitLimit || 0,
        'X-RateLimit-Remaining': result.remaining || this.options.xRateLimitRemaining || 0,
        'X-RateLimit-Reset': result.resetTime || this.options.xRateLimitReset || 0,
      });
    }
  }

  /**
   * Create middleware with custom options
   */
  static create(options: RateLimitMiddlewareOptions) {
    return new RateLimitingMiddleware(options).middleware();
  }

  /**
   * Create middleware with service instance
   */
  static withService(service: RateLimitingService, customOptions: Partial<RateLimitMiddlewareOptions> = {}) {
    const defaultOptions: RateLimitMiddlewareOptions = {
      service,
      keyGenerator: undefined,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too Many Requests',
      standardHeaders: true,
      legacyHeaders: false,
      onLimitReached: undefined,
      ...customOptions,
    };

    return new RateLimitingMiddleware(defaultOptions).middleware();
  }
}

/**
 * Utility function to create rate limiting middleware
 */
export function createRateLimitMiddleware(
  service: RateLimitingService,
  options: Partial<RateLimitMiddlewareOptions> = {}
) {
  return RateLimitingMiddleware.withService(service, options);
}
