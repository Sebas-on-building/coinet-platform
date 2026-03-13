/**
 * Advanced Rate Limiting System
 * Provides sophisticated rate limiting with user-based limits,
 * route-specific rules, and intelligent throttling
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

interface RateLimitConfig {
  defaultRule: RateLimitRule;
  routes: Record<string, RateLimitRule>;
  userTiers: Record<string, RateLimitRule>;
  enableBurstProtection: boolean;
  enableSlowDown: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class AdvancedRateLimiter {
  private redis: any;
  private config: RateLimitConfig;
  private memoryStore: Map<string, RateLimitEntry> = new Map();
  private stats = {
    totalRequests: 0,
    blockedRequests: 0,
    slowedRequests: 0,
    burstBlocked: 0
  };

  constructor(redisClient: any, config: Partial<RateLimitConfig> = {}) {
    this.redis = redisClient;
    this.config = {
      defaultRule: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000
      },
      routes: {
        '/api/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 },
        '/api/auth/register': { windowMs: 60 * 60 * 1000, maxRequests: 3 },
        '/api/users/me': { windowMs: 60 * 1000, maxRequests: 100 },
        '/api/market/prices': { windowMs: 60 * 1000, maxRequests: 500 },
        '/api/ai/analyze': { windowMs: 60 * 1000, maxRequests: 20 },
        '/health': { windowMs: 60 * 1000, maxRequests: 1000 },
        '/metrics': { windowMs: 60 * 1000, maxRequests: 100 }
      },
      userTiers: {
        'free': { windowMs: 60 * 60 * 1000, maxRequests: 100 },
        'premium': { windowMs: 60 * 60 * 1000, maxRequests: 1000 },
        'enterprise': { windowMs: 60 * 60 * 1000, maxRequests: 10000 },
        'admin': { windowMs: 60 * 60 * 1000, maxRequests: 100000 }
      },
      enableBurstProtection: true,
      enableSlowDown: true,
      ...config
    };

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 300000);
  }

  /**
   * Generate rate limit key
   */
  private generateKey(req: Request, rule: RateLimitRule): string {
    if (rule.keyGenerator) {
      return rule.keyGenerator(req);
    }

    const userId = (req as any).user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const route = req.route?.path || req.path;

    // Use user ID if available, otherwise IP
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    
    return `ratelimit:${identifier}:${route}`;
  }

  /**
   * Get applicable rate limit rule
   */
  private getRule(req: Request): RateLimitRule {
    const user = (req as any).user;
    const path = req.path;

    // Check user tier limits first
    if (user?.tier && this.config.userTiers[user.tier]) {
      return { ...this.config.defaultRule, ...this.config.userTiers[user.tier] };
    }

    // Check route-specific limits
    for (const [routePattern, rule] of Object.entries(this.config.routes)) {
      if (path.includes(routePattern) || new RegExp(routePattern).test(path)) {
        return { ...this.config.defaultRule, ...rule };
      }
    }

    // Return default rule
    return this.config.defaultRule;
  }

  /**
   * Check if request should be rate limited
   */
  private shouldLimit(req: Request): boolean {
    // Skip rate limiting for health checks from internal sources
    if (req.path.includes('/health') && req.get('User-Agent')?.includes('kube-probe')) {
      return false;
    }

    // Skip for admin users in development
    const user = (req as any).user;
    if (process.env.NODE_ENV === 'development' && user?.role === 'admin') {
      return false;
    }

    return true;
  }

  /**
   * Check rate limit for a key with custom limit/window. Returns allowed and resetTime.
   */
  async checkRateLimit(
    key: string,
    opts: { limit: number; windowMs: number }
  ): Promise<{ allowed: boolean; resetTime: number }> {
    const rule: RateLimitRule = {
      windowMs: opts.windowMs,
      maxRequests: opts.limit,
    };
    const entry = await this.getCurrentStatus(key, rule);
    const newEntry: RateLimitEntry = {
      ...entry,
      count: entry.count + 1,
    };
    const allowed = newEntry.count <= rule.maxRequests;
    if (allowed) {
      await this.updateStatus(key, newEntry, rule);
    }
    return { allowed, resetTime: newEntry.resetTime };
  }

  /**
   * Get current rate limit status
   */
  async getCurrentStatus(key: string, rule: RateLimitRule): Promise<RateLimitEntry> {
    const now = Date.now();
    
    try {
      // Try Redis first
      if (this.redis) {
        const data = await this.redis.get(key);
        if (data) {
          const entry: RateLimitEntry = JSON.parse(data);
          if (now < entry.resetTime) {
            return entry;
          } else {
            // Expired, remove it
            await this.redis.del(key);
          }
        }
      }

      // Try memory store
      const memEntry = this.memoryStore.get(key);
      if (memEntry && now < memEntry.resetTime) {
        return memEntry;
      }

      // Create new entry
      const newEntry: RateLimitEntry = {
        count: 0,
        resetTime: now + rule.windowMs,
        firstRequest: now
      };

      return newEntry;
    } catch (error) {
      console.error('Rate limit status check error:', error);
      return {
        count: 0,
        resetTime: now + rule.windowMs,
        firstRequest: now
      };
    }
  }

  /**
   * Update rate limit status
   */
  async updateStatus(key: string, entry: RateLimitEntry, rule: RateLimitRule): Promise<void> {
    try {
      const ttl = Math.ceil((entry.resetTime - Date.now()) / 1000);
      
      // Update Redis
      if (this.redis && ttl > 0) {
        await this.redis.setex(key, ttl, JSON.stringify(entry));
      }

      // Update memory store
      if (this.memoryStore.size < 10000) { // Prevent memory bloat
        this.memoryStore.set(key, entry);
      }
    } catch (error) {
      console.error('Rate limit status update error:', error);
    }
  }

  /**
   * Check for burst attacks
   */
  private checkBurstProtection(entry: RateLimitEntry, rule: RateLimitRule): boolean {
    if (!this.config.enableBurstProtection) return false;

    const now = Date.now();
    const timeSinceFirst = now - entry.firstRequest;
    
    // If too many requests in too short a time, it's likely a burst attack
    if (timeSinceFirst < 1000 && entry.count > 10) { // 10 requests in 1 second
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for slow-down feature
   */
  private calculateSlowDown(entry: RateLimitEntry, rule: RateLimitRule): number {
    if (!this.config.enableSlowDown) return 0;

    const utilizationRate = entry.count / rule.maxRequests;
    
    // Start slowing down at 80% utilization
    if (utilizationRate > 0.8) {
      const slowDownFactor = (utilizationRate - 0.8) * 5; // 0 to 1
      return Math.min(slowDownFactor * 2000, 5000); // Max 5 second delay
    }

    return 0;
  }

  /**
   * Clean up expired entries from memory
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryStore.entries()) {
      if (now >= entry.resetTime) {
        this.memoryStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get rate limiting statistics
   */
  getStats() {
    const blockRate = this.stats.totalRequests > 0 
      ? (this.stats.blockedRequests / this.stats.totalRequests * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      blockRate: `${blockRate}%`,
      memoryEntries: this.memoryStore.size,
      activeRules: Object.keys(this.config.routes).length
    };
  }

  /**
   * Rate limiting middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.stats.totalRequests++;

      // Skip if not applicable
      if (!this.shouldLimit(req)) {
        return next();
      }

      const rule = this.getRule(req);
      const key = this.generateKey(req, rule);
      
      try {
        const entry = await this.getCurrentStatus(key, rule);
        
        // Check for burst attack
        if (this.checkBurstProtection(entry, rule)) {
          this.stats.burstBlocked++;
          this.stats.blockedRequests++;
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Burst protection triggered. Please slow down.',
            type: 'burst_protection',
            retryAfter: 60,
            requestId: (req as any).id
          });
        }

        // Check rate limit
        if (entry.count >= rule.maxRequests) {
          this.stats.blockedRequests++;
          
          const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
          
          // Custom handler if provided
          if (rule.onLimitReached) {
            rule.onLimitReached(req, res);
            return;
          }

          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            limit: rule.maxRequests,
            remaining: 0,
            resetTime: new Date(entry.resetTime).toISOString(),
            retryAfter,
            requestId: (req as any).id
          });
        }

        // Calculate slow-down delay
        const delay = this.calculateSlowDown(entry, rule);
        if (delay > 0) {
          this.stats.slowedRequests++;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Update entry
        entry.count++;
        await this.updateStatus(key, entry, rule);

        // Set rate limit headers
        const remaining = Math.max(0, rule.maxRequests - entry.count);
        const resetTime = Math.ceil(entry.resetTime / 1000);

        res.setHeader('X-RateLimit-Limit', rule.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', resetTime.toString());
        res.setHeader('X-RateLimit-Window', (rule.windowMs / 1000).toString());

        // Add warning if approaching limit
        if (remaining < rule.maxRequests * 0.1) {
          res.setHeader('X-RateLimit-Warning', 'Approaching rate limit');
        }

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Continue on error to avoid blocking legitimate requests
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(identifier: string, route?: string): Promise<void> {
    try {
      const pattern = route 
        ? `ratelimit:${identifier}:${route}`
        : `ratelimit:${identifier}:*`;

      // Remove from memory
      for (const key of this.memoryStore.keys()) {
        if (key.includes(identifier)) {
          this.memoryStore.delete(key);
        }
      }

      // Remove from Redis
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }

  /**
   * Get current limits for a user/IP
   */
  async getCurrentLimits(identifier: string): Promise<Record<string, any>> {
    const limits: Record<string, any> = {};

    try {
      const pattern = `ratelimit:${identifier}:*`;
      
      // Check memory store
      for (const [key, entry] of this.memoryStore.entries()) {
        if (key.includes(identifier)) {
          const route = key.split(':').pop();
          limits[route || 'unknown'] = {
            current: entry.count,
            resetTime: entry.resetTime,
            remaining: Math.max(0, this.config.defaultRule.maxRequests - entry.count)
          };
        }
      }

      // Check Redis if available
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const entry: RateLimitEntry = JSON.parse(data);
            const route = key.split(':').pop();
            limits[route || 'unknown'] = {
              current: entry.count,
              resetTime: entry.resetTime,
              remaining: Math.max(0, this.config.defaultRule.maxRequests - entry.count)
            };
          }
        }
      }

      return limits;
    } catch (error) {
      console.error('Get current limits error:', error);
      return {};
    }
  }
}

export default AdvancedRateLimiter;
