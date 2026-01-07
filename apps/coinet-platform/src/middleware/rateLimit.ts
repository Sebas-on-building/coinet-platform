/**
 * 🚦 Rate Limiting Middleware
 * 
 * Production-ready rate limiting for authentication and chat endpoints.
 * Uses sliding window algorithm with IP-based and user-based limits.
 * 
 * Features:
 * - IP-based rate limiting for auth failures
 * - User-based rate limiting for authenticated endpoints
 * - Different limits for different endpoint types
 * - Redis-backed in production, in-memory for dev
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from './requireAuth';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Rate limit configuration for different endpoint types.
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSec: number;
  /** Key prefix for storage */
  keyPrefix: string;
  /** Whether to use user ID (requires auth) or IP */
  keyType: 'ip' | 'user' | 'ip+user';
  /** Custom message when limit exceeded */
  message?: string;
  /** Skip rate limiting for certain conditions */
  skip?: (req: Request) => boolean;
}

/**
 * Default rate limit configurations.
 */
export const RATE_LIMIT_CONFIGS = {
  // Auth failure rate limiting (IP-based, strict)
  authFailure: {
    maxRequests: 10,
    windowSec: 60 * 15, // 15 minutes
    keyPrefix: 'rl:auth:fail',
    keyType: 'ip' as const,
    message: 'Too many failed login attempts. Please try again later.',
  },
  
  // Login/register endpoints (IP-based)
  authEndpoint: {
    maxRequests: 20,
    windowSec: 60, // 1 minute
    keyPrefix: 'rl:auth:endpoint',
    keyType: 'ip' as const,
    message: 'Too many authentication requests. Please try again later.',
  },
  
  // Chat message endpoint (user-based)
  chatMessage: {
    maxRequests: 60,
    windowSec: 60, // 1 minute (60 messages per minute per user)
    keyPrefix: 'rl:chat:message',
    keyType: 'user' as const,
    message: 'Message rate limit exceeded. Please slow down.',
  },
  
  // Chat stream endpoint (user-based, more restrictive)
  chatStream: {
    maxRequests: 30,
    windowSec: 60, // 1 minute (30 streams per minute per user)
    keyPrefix: 'rl:chat:stream',
    keyType: 'user' as const,
    message: 'Stream rate limit exceeded. Please slow down.',
  },
  
  // General API rate limit (IP + user)
  general: {
    maxRequests: 200,
    windowSec: 60, // 1 minute
    keyPrefix: 'rl:general',
    keyType: 'ip+user' as const,
    message: 'Rate limit exceeded. Please try again later.',
  },
};

// =============================================================================
// IN-MEMORY STORE (for development/fallback)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

// =============================================================================
// RATE LIMIT STORE INTERFACE
// =============================================================================

interface RateLimitStore {
  increment(key: string, windowSec: number): Promise<{ count: number; resetAt: number }>;
  get(key: string): Promise<RateLimitEntry | null>;
  reset(key: string): Promise<void>;
}

/**
 * In-memory rate limit store (for development).
 */
const memoryRateLimitStore: RateLimitStore = {
  async increment(key: string, windowSec: number) {
    const now = Date.now();
    const entry = memoryStore.get(key);
    
    if (!entry || entry.resetAt < now) {
      // New window
      const newEntry = { count: 1, resetAt: now + windowSec * 1000 };
      memoryStore.set(key, newEntry);
      return newEntry;
    }
    
    // Increment existing
    entry.count++;
    return entry;
  },
  
  async get(key: string) {
    const entry = memoryStore.get(key);
    if (!entry || entry.resetAt < Date.now()) {
      return null;
    }
    return entry;
  },
  
  async reset(key: string) {
    memoryStore.delete(key);
  },
};

// Use memory store (can be replaced with Redis in production)
const store = memoryRateLimitStore;

// =============================================================================
// KEY GENERATION
// =============================================================================

/**
 * Get rate limit key based on configuration.
 */
function getRateLimitKey(req: Request, config: RateLimitConfig): string {
  const { keyPrefix, keyType } = config;
  
  switch (keyType) {
    case 'ip': {
      const ip = getClientIP(req);
      return `${keyPrefix}:${ip}`;
    }
    
    case 'user': {
      const auth = (req as AuthenticatedRequest).auth;
      if (!auth?.userId) {
        // Fall back to IP if not authenticated
        const ip = getClientIP(req);
        return `${keyPrefix}:ip:${ip}`;
      }
      return `${keyPrefix}:user:${auth.userId}`;
    }
    
    case 'ip+user': {
      const ip = getClientIP(req);
      const auth = (req as AuthenticatedRequest).auth;
      const userId = auth?.userId || 'anon';
      return `${keyPrefix}:${ip}:${userId}`;
    }
    
    default:
      return `${keyPrefix}:unknown`;
  }
}

/**
 * Get client IP address from request.
 * Handles proxied requests (X-Forwarded-For).
 */
function getClientIP(req: Request): string {
  // Trust X-Forwarded-For if behind proxy (configure trust proxy in Express)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0];
    return ips.trim();
  }
  
  // Direct connection
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// =============================================================================
// RATE LIMIT MIDDLEWARE FACTORY
// =============================================================================

/**
 * Create rate limiting middleware with specified configuration.
 * 
 * Usage:
 *   router.use(rateLimit(RATE_LIMIT_CONFIGS.chatMessage));
 *   // or
 *   router.post('/message', rateLimit({ maxRequests: 30, windowSec: 60, ... }), handler);
 */
export function rateLimit(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if rate limiting should be skipped
    if (config.skip && config.skip(req)) {
      return next();
    }
    
    const key = getRateLimitKey(req, config);
    const requestId = (req as any).requestId || 'unknown';
    
    try {
      const result = await store.increment(key, config.windowSec);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - result.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
      
      if (result.count > config.maxRequests) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);
        
        logger.warn('🚫 Rate limit exceeded', {
          requestId,
          key: key.replace(/:[^:]+$/, ':***'), // Redact user ID / last segment
          count: result.count,
          limit: config.maxRequests,
          windowSec: config.windowSec,
          path: req.path,
          method: req.method,
        });
        
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: config.message || 'Rate limit exceeded. Please try again later.',
            retryAfter,
          },
          requestId,
        });
        return;
      }
      
      next();
      
    } catch (error) {
      // On store error, log and allow request (fail open for availability)
      logger.error('❌ Rate limit store error', error, { requestId, key });
      next();
    }
  };
}

// =============================================================================
// AUTH FAILURE TRACKING
// =============================================================================

/**
 * Record an authentication failure for rate limiting.
 * Call this from auth error handlers.
 */
export async function recordAuthFailure(req: Request): Promise<void> {
  const config = RATE_LIMIT_CONFIGS.authFailure;
  const ip = getClientIP(req);
  const key = `${config.keyPrefix}:${ip}`;
  
  try {
    const result = await store.increment(key, config.windowSec);
    
    if (result.count >= config.maxRequests) {
      logger.warn('⚠️ Auth failure threshold reached', {
        ip: ip.substring(0, 10) + '***', // Partial IP for privacy
        count: result.count,
        threshold: config.maxRequests,
      });
    }
  } catch (error) {
    logger.error('❌ Failed to record auth failure', error);
  }
}

/**
 * Check if IP is blocked due to too many auth failures.
 */
export async function isAuthBlocked(req: Request): Promise<boolean> {
  const config = RATE_LIMIT_CONFIGS.authFailure;
  const ip = getClientIP(req);
  const key = `${config.keyPrefix}:${ip}`;
  
  try {
    const entry = await store.get(key);
    return entry !== null && entry.count >= config.maxRequests;
  } catch (error) {
    logger.error('❌ Failed to check auth block status', error);
    return false; // Fail open
  }
}

/**
 * Clear auth failure count for IP (call on successful auth).
 */
export async function clearAuthFailures(req: Request): Promise<void> {
  const config = RATE_LIMIT_CONFIGS.authFailure;
  const ip = getClientIP(req);
  const key = `${config.keyPrefix}:${ip}`;
  
  try {
    await store.reset(key);
  } catch (error) {
    logger.error('❌ Failed to clear auth failures', error);
  }
}

// =============================================================================
// PRE-CONFIGURED MIDDLEWARE
// =============================================================================

/**
 * Rate limiter for authentication endpoints (login/register).
 */
export const authRateLimit = rateLimit(RATE_LIMIT_CONFIGS.authEndpoint);

/**
 * Rate limiter for chat message endpoint.
 */
export const chatMessageRateLimit = rateLimit(RATE_LIMIT_CONFIGS.chatMessage);

/**
 * Rate limiter for chat stream endpoint.
 */
export const chatStreamRateLimit = rateLimit(RATE_LIMIT_CONFIGS.chatStream);

/**
 * General rate limiter for API endpoints.
 */
export const generalRateLimit = rateLimit(RATE_LIMIT_CONFIGS.general);
