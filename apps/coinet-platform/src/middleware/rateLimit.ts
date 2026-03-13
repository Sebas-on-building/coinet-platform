/**
 * COINET RATE LIMITING MIDDLEWARE
 * 
 * Implements rate limiting for API endpoints to prevent abuse.
 * Uses in-memory storage by default, can be configured for Redis in production.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
  keyGenerator?: (req: Request) => string;  // Custom key generator
  skip?: (req: Request) => boolean;         // Skip rate limiting for certain requests
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

// Simple in-memory rate limit store
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// =============================================================================
// RATE LIMIT FACTORY
// =============================================================================

/**
 * Create a rate limiting middleware
 */
function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = defaultKeyGenerator,
    skip,
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if we should skip rate limiting
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment existing entry
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);
    
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    // Check if over limit
    if (entry.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        key,
        count: entry.count,
        maxRequests,
        ip: req.ip,
        path: req.path,
      });

      res.status(429).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: resetSeconds,
      });
      return;
    }

    next();
  };
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Try to get real IP from proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.ip || req.socket.remoteAddress || 'unknown';
  
  return `ratelimit:${ip}`;
}

/**
 * User-based key generator - uses user ID if authenticated
 */
function userKeyGenerator(req: Request): string {
  const userId = (req as any).userId || (req as any).user?.id;
  if (userId) {
    return `ratelimit:user:${userId}`;
  }
  return defaultKeyGenerator(req);
}

/**
 * Endpoint-specific key generator
 */
function endpointKeyGenerator(req: Request): string {
  const baseKey = userKeyGenerator(req);
  return `${baseKey}:${req.method}:${req.path}`;
}

// =============================================================================
// PRE-CONFIGURED RATE LIMITERS
// =============================================================================

/**
 * Rate limiter for chat messages
 * Allows 30 messages per minute per user
 */
export const chatMessageRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'You are sending messages too quickly. Please wait a moment.',
  keyGenerator: userKeyGenerator,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  },
});

/**
 * Rate limiter for streaming chat
 * Allows 20 streaming requests per minute per user
 */
export const chatStreamRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  message: 'Too many streaming requests. Please wait a moment.',
  keyGenerator: userKeyGenerator,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  },
});

/**
 * Rate limiter for API endpoints
 * Allows 100 requests per minute per IP
 */
export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many API requests. Please slow down.',
  keyGenerator: defaultKeyGenerator,
});

/**
 * Strict rate limiter for sensitive endpoints (auth, etc.)
 * Allows 10 requests per minute per IP
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many attempts. Please try again later.',
  keyGenerator: defaultKeyGenerator,
});

/**
 * Burst rate limiter for expensive operations
 * Allows 5 requests per minute per user
 */
export const burstRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  message: 'This operation is rate limited. Please wait before trying again.',
  keyGenerator: userKeyGenerator,
});

/**
 * Daily rate limiter for premium features
 * Allows 1000 requests per day per user
 */
export const dailyRateLimit = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 1000,
  message: 'Daily request limit reached. Upgrade to premium for higher limits.',
  keyGenerator: userKeyGenerator,
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(key: string): { remaining: number; resetTime: number } | null {
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime < Date.now()) {
    return null;
  }
  return {
    remaining: entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (use with caution)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  createRateLimiter,
  defaultKeyGenerator,
  userKeyGenerator,
  endpointKeyGenerator,
};
export type { RateLimitConfig };
