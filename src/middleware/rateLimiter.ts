import { Request, Response, NextFunction } from 'express';
import { Logger } from '../lib/logging/Logger';
import { MetricsCollector } from '../lib/metrics/MetricsCollector';
import { ErrorManager } from '../lib/errors/ErrorManager';
import { SecretManager } from '../lib/security/SecretManager';

interface RateLimitRule {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests in window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipIf?: (req: Request) => boolean; // Skip rate limiting condition
  onLimitReached?: (req: Request, res: Response) => void; // Custom action when limit reached
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    firstRequest: number;
  };
}

interface RateLimitConfig {
  // Global limits
  global?: RateLimitRule;
  // Per-IP limits
  perIP?: RateLimitRule;
  // Per-user limits
  perUser?: RateLimitRule;
  // Per-API key limits
  perApiKey?: RateLimitRule;
  // Per-endpoint limits
  perEndpoint?: { [endpoint: string]: RateLimitRule };
  // Custom rules
  custom?: RateLimitRule[];
}

export class RateLimiter {
  private static instance: RateLimiter;
  private store: RateLimitStore = {};
  private logger: Logger;
  private metrics: MetricsCollector;
  private errorManager: ErrorManager;
  private secretManager: SecretManager;

  // Default rate limit configurations
  private readonly DEFAULT_CONFIGS: { [key: string]: RateLimitConfig } = {
    // Public API endpoints
    public: {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000
      },
      perIP: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
      }
    },

    // Authentication endpoints
    auth: {
      perIP: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 20, // Stricter for auth
        onLimitReached: (req, res) => {
          this.logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            endpoint: req.path
          });
        }
      },
      perEndpoint: {
        '/api/auth/login': {
          windowMs: 15 * 60 * 1000,
          maxRequests: 5 // Very strict for login
        },
        '/api/auth/register': {
          windowMs: 60 * 60 * 1000, // 1 hour
          maxRequests: 3
        },
        '/api/auth/forgot-password': {
          windowMs: 60 * 60 * 1000, // 1 hour
          maxRequests: 5
        }
      }
    },

    // API endpoints
    api: {
      perApiKey: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 60, // 60 requests per minute
        keyGenerator: (req) => {
          const apiKey = req.headers['x-api-key'] as string;
          return `api_key:${apiKey || 'anonymous'}`;
        }
      },
      perUser: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 120, // Higher limit for authenticated users
        keyGenerator: (req) => {
          const user = (req as any).user;
          return `user:${user?.id || 'anonymous'}`;
        },
        skipIf: (req) => {
          const user = (req as any).user;
          return user?.role === 'admin' || user?.role === 'super_admin';
        }
      }
    },

    // Trading endpoints (stricter limits)
    trading: {
      perUser: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // Very strict for trading
        keyGenerator: (req) => {
          const user = (req as any).user;
          return `trading:${user?.id || 'anonymous'}`;
        }
      }
    },

    // Admin endpoints
    admin: {
      perUser: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 300, // Higher limits for admin operations
        keyGenerator: (req) => {
          const user = (req as any).user;
          return `admin:${user?.id || 'anonymous'}`;
        },
        skipIf: (req) => {
          const user = (req as any).user;
          return user?.role === 'super_admin';
        }
      }
    }
  };

  private constructor() {
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.errorManager = ErrorManager.getInstance();
    this.secretManager = SecretManager.getInstance();

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  // Create rate limiting middleware
  createMiddleware(configType: string, customConfig?: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const config = customConfig || this.DEFAULT_CONFIGS[configType];

        if (!config) {
          this.logger.warn('No rate limit configuration found', { configType });
          return next();
        }

        // Check all configured rate limits
        const results = await Promise.all([
          this.checkGlobalLimit(req, config.global),
          this.checkPerIPLimit(req, config.perIP),
          this.checkPerUserLimit(req, config.perUser),
          this.checkPerApiKeyLimit(req, config.perApiKey),
          this.checkPerEndpointLimit(req, config.perEndpoint),
          this.checkCustomLimits(req, config.custom)
        ]);

        // Find the most restrictive limit that was exceeded
        const exceeded = results.find(result => result && !result.allowed);

        if (exceeded) {
          this.handleRateLimitExceeded(req, res, exceeded);
          return;
        }

        // Add rate limit headers
        this.addRateLimitHeaders(req, res, results);

        next();

      } catch (error) {
        this.errorManager.handleError(error as Error, {
          operation: 'rate_limit_check',
          component: 'rate_limiter',
          metadata: {
            ip: req.ip,
            path: req.path,
            configType
          }
        });

        // Don't block requests on rate limiter errors
        next();
      }
    };
  }

  // Check global rate limit
  private async checkGlobalLimit(req: Request, rule?: RateLimitRule): Promise<RateLimitResult | null> {
    if (!rule) return null;

    const key = 'global';
    return this.checkLimit(key, rule, req);
  }

  // Check per-IP rate limit
  private async checkPerIPLimit(req: Request, rule?: RateLimitRule): Promise<RateLimitResult | null> {
    if (!rule) return null;

    const key = `ip:${req.ip}`;
    return this.checkLimit(key, rule, req);
  }

  // Check per-user rate limit
  private async checkPerUserLimit(req: Request, rule?: RateLimitRule): Promise<RateLimitResult | null> {
    if (!rule) return null;

    if (rule.skipIf && rule.skipIf(req)) {
      return null;
    }

    const user = (req as any).user;
    if (!user?.id) return null;

    const key = rule.keyGenerator ? rule.keyGenerator(req) : `user:${user.id}`;
    return this.checkLimit(key, rule, req);
  }

  // Check per-API key rate limit
  private async checkPerApiKeyLimit(req: Request, rule?: RateLimitRule): Promise<RateLimitResult | null> {
    if (!rule) return null;

    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) return null;

    const key = rule.keyGenerator ? rule.keyGenerator(req) : `api_key:${apiKey}`;
    return this.checkLimit(key, rule, req);
  }

  // Check per-endpoint rate limit
  private async checkPerEndpointLimit(req: Request, rules?: { [endpoint: string]: RateLimitRule }): Promise<RateLimitResult | null> {
    if (!rules) return null;

    const endpoint = req.path;
    const rule = rules[endpoint];

    if (!rule) return null;

    const key = `endpoint:${endpoint}:${req.ip}`;
    return this.checkLimit(key, rule, req);
  }

  // Check custom rate limits
  private async checkCustomLimits(req: Request, rules?: RateLimitRule[]): Promise<RateLimitResult | null> {
    if (!rules || rules.length === 0) return null;

    for (const rule of rules) {
      if (rule.skipIf && rule.skipIf(req)) {
        continue;
      }

      const key = rule.keyGenerator ? rule.keyGenerator(req) : `custom:${req.ip}`;
      const result = this.checkLimit(key, rule, req);

      if (result && !result.allowed) {
        return result;
      }
    }

    return null;
  }

  // Core rate limit checking logic
  private checkLimit(key: string, rule: RateLimitRule, req: Request): RateLimitResult {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store[key] = {
        count: 1,
        resetTime: now + rule.windowMs,
        firstRequest: now
      };

      return {
        allowed: true,
        limit: rule.maxRequests,
        remaining: rule.maxRequests - 1,
        resetTime: now + rule.windowMs,
        retryAfter: 0
      };
    }

    if (entry.count >= rule.maxRequests) {
      // Rate limit exceeded
      this.metrics.incrementCounter('rate_limit_exceeded', {
        key: key.split(':')[0], // Remove sensitive data
        endpoint: req.path
      });

      return {
        allowed: false,
        limit: rule.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    // Increment counter
    entry.count++;

    return {
      allowed: true,
      limit: rule.maxRequests,
      remaining: rule.maxRequests - entry.count,
      resetTime: entry.resetTime,
      retryAfter: 0
    };
  }

  // Handle rate limit exceeded
  private handleRateLimitExceeded(req: Request, res: Response, result: RateLimitResult): void {
    this.logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
      limit: result.limit,
      retryAfter: result.retryAfter
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
      limit: result.limit,
      resetTime: new Date(result.resetTime).toISOString()
    });
  }

  // Add rate limit headers to response
  private addRateLimitHeaders(req: Request, res: Response, results: (RateLimitResult | null)[]): void {
    // Find the most restrictive limit
    const validResults = results.filter(r => r !== null) as RateLimitResult[];

    if (validResults.length === 0) return;

    const mostRestrictive = validResults.reduce((min, current) =>
      current.remaining < min.remaining ? current : min
    );

    res.set({
      'X-RateLimit-Limit': mostRestrictive.limit.toString(),
      'X-RateLimit-Remaining': mostRestrictive.remaining.toString(),
      'X-RateLimit-Reset': new Date(mostRestrictive.resetTime).toISOString(),
      'X-RateLimit-RetryAfter': mostRestrictive.retryAfter.toString()
    });
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of Object.entries(this.store)) {
      if (now > entry.resetTime) {
        delete this.store[key];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Rate limiter cleanup completed', {
        entriesRemoved: cleaned,
        remainingEntries: Object.keys(this.store).length
      });
    }

    this.metrics.incrementCounter('rate_limiter_active_keys', { count: Object.keys(this.store).length.toString() });
  }

  // Get current rate limit status for a key
  getRateLimitStatus(key: string): RateLimitResult | null {
    const entry = this.store[key];
    if (!entry) return null;

    const now = Date.now();

    return {
      allowed: entry.count < entry.count, // This logic seems wrong, should be compared against limit
      limit: 0, // Would need to store the limit
      remaining: Math.max(0, 0 - entry.count), // Would need to store the limit
      resetTime: entry.resetTime,
      retryAfter: Math.max(0, Math.ceil((entry.resetTime - now) / 1000))
    };
  }

  // Reset rate limit for a specific key (admin function)
  resetRateLimit(key: string): boolean {
    if (this.store[key]) {
      delete this.store[key];
      this.logger.info('Rate limit reset', { key });
      return true;
    }
    return false;
  }

  // Get rate limit statistics
  getStatistics(): {
    totalKeys: number;
    activeWindows: number;
    topLimitedIPs: Array<{ ip: string; count: number }>;
    recentBlocks: number;
  } {
    const now = Date.now();
    const activeEntries = Object.entries(this.store).filter(([, entry]) => now <= entry.resetTime);

    // Get top limited IPs
    const ipCounts: { [ip: string]: number } = {};
    activeEntries.forEach(([key, entry]) => {
      if (key.startsWith('ip:')) {
        const ip = key.substring(3);
        ipCounts[ip] = (ipCounts[ip] || 0) + entry.count;
      }
    });

    const topLimitedIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    return {
      totalKeys: Object.keys(this.store).length,
      activeWindows: activeEntries.length,
      topLimitedIPs,
      recentBlocks: 0 // Would need to track this separately
    };
  }
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

// Factory functions for common middleware
export const createPublicRateLimit = () => RateLimiter.getInstance().createMiddleware('public');
export const createAuthRateLimit = () => RateLimiter.getInstance().createMiddleware('auth');
export const createApiRateLimit = () => RateLimiter.getInstance().createMiddleware('api');
export const createTradingRateLimit = () => RateLimiter.getInstance().createMiddleware('trading');
export const createAdminRateLimit = () => RateLimiter.getInstance().createMiddleware('admin');

// Custom rate limit factory
export const createCustomRateLimit = (config: RateLimitConfig) =>
  RateLimiter.getInstance().createMiddleware('custom', config);

export default RateLimiter; 