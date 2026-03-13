/**
 * =========================================
 * AUTHENTICATION MIDDLEWARE
 * =========================================
 * Divine world-class authentication system with JWT, API keys, and OAuth
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';

export interface AuthenticationConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    issuer: string;
    audience: string;
  };
  apiKeys: {
    enabled: boolean;
    header: string;
  };
  oauth: {
    enabled: boolean;
    providers: string[];
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  tier: string;
  metadata?: Record<string, any>;
}

/**
 * Advanced authentication middleware with multiple authentication methods
 */
export class AuthenticationMiddleware {
  private logger: Logger;
  private config: AuthenticationConfig;

  constructor(config: AuthenticationConfig) {
    this.logger = new Logger('AuthenticationMiddleware');
    this.config = config;
  }

  /**
   * Express middleware for authentication
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip authentication for health checks and public endpoints
        if (this.isPublicEndpoint(req.path)) {
          return next();
        }

        const authResult = await this.authenticateRequest(req);

        if (!authResult.authenticated) {
          this.logger.warn('Authentication failed', {
            reason: authResult.reason,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
          });

          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            reason: authResult.reason,
          });
        }

        // Attach authenticated user to request
        (req as any).user = authResult.user;
        (req as any).authMethod = authResult.method;

        next();
      } catch (error: any) {
        this.logger.error('Authentication middleware error', error);
        res.status(500).json({
          success: false,
          error: 'Authentication service error',
        });
      }
    };
  }

  /**
   * Authenticate request using multiple methods
   */
  private async authenticateRequest(req: Request): Promise<{
    authenticated: boolean;
    user?: AuthenticatedUser;
    method?: string;
    reason?: string;
  }> {
    // Try JWT authentication first
    const jwtResult = this.authenticateJWT(req);
    if (jwtResult.authenticated && jwtResult.user) {
      return {
        authenticated: true,
        user: jwtResult.user,
        method: 'jwt',
      };
    }

    // Try API key authentication
    if (this.config.apiKeys.enabled) {
      const apiKeyResult = this.authenticateAPIKey(req);
      if (apiKeyResult.authenticated && apiKeyResult.user) {
        return {
          authenticated: true,
          user: apiKeyResult.user,
          method: 'api_key',
        };
      }
    }

    // Try OAuth authentication
    if (this.config.oauth.enabled) {
      const oauthResult = this.authenticateOAuth(req);
      if (oauthResult.authenticated && oauthResult.user) {
        return {
          authenticated: true,
          user: oauthResult.user,
          method: 'oauth',
        };
      }
    }

    return {
      authenticated: false,
      reason: 'No valid authentication method found',
    };
  }

  /**
   * Authenticate using JWT token
   */
  private authenticateJWT(req: Request): {
    authenticated: boolean;
    user?: AuthenticatedUser;
    reason?: string;
  } {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        reason: 'Missing or invalid Bearer token',
      };
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, this.config.jwt.secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
      }) as any;

      // Extract user information from JWT payload
      const user: AuthenticatedUser = {
        id: decoded.sub || decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || [],
        tier: decoded.tier || 'free',
        metadata: decoded.metadata,
      };

      return {
        authenticated: true,
        user,
      };
    } catch (error: any) {
      return {
        authenticated: false,
        reason: `JWT verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Authenticate using API key
   * 
   * SECURITY: This method requires proper database-backed API key authentication.
   * Demo keys are NOT allowed in production environments.
   */
  private authenticateAPIKey(req: Request): {
    authenticated: boolean;
    user?: AuthenticatedUser;
    reason?: string;
  } {
    const apiKey = req.headers[this.config.apiKeys.header.toLowerCase()] as string;

    if (!apiKey) {
      return {
        authenticated: false,
        reason: 'Missing API key',
      };
    }

    // SECURITY: Demo keys are NEVER accepted — in any environment.
    // Divine precision: zero tolerance for placeholder or demo credentials.
    const isDemoKey =
      apiKey.startsWith('demo-api-key') ||
      apiKey === 'demo-api-key-1' ||
      apiKey === 'demo-api-key-2' ||
      apiKey === 'demo-key' ||
      apiKey.trim() === '';

    if (isDemoKey) {
      this.logger.warn('Rejected demo/placeholder API key', {
        keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : '(empty)',
        ip: req.ip,
        path: req.path,
      });
      return {
        authenticated: false,
        reason: 'Invalid API key. Demo and placeholder keys are not accepted.',
      };
    }

    // TODO: Implement proper database-backed API key authentication.
    // Required steps:
    // 1. Hash the provided API key (e.g. SHA-256) and look up in ApiKey table
    // 2. Verify key belongs to an active user, check expiration and rate limits
    // 3. Extract user from database
    // See services/user for Prisma ApiKey model reference.
    this.logger.warn('API key authentication requires database implementation', {
      message: 'Database-backed API key lookup not yet implemented',
    });
    return {
      authenticated: false,
      reason: 'API key authentication requires database implementation',
    };
  }

  /**
   * Authenticate using OAuth tokens
   */
  private authenticateOAuth(req: Request): {
    authenticated: boolean;
    user?: AuthenticatedUser;
    reason?: string;
  } {
    // OAuth implementation would go here
    // For now, return not authenticated
    return {
      authenticated: false,
      reason: 'OAuth authentication not implemented in demo',
    };
  }

  /**
   * Check if endpoint is public (doesn't require authentication)
   */
  private isPublicEndpoint(path: string): boolean {
    const publicPaths = [
      '/health',
      '/ready',
      '/metrics',
      '/api-docs',
      '/',
    ];

    return publicPaths.some(publicPath => path.startsWith(publicPath));
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: AuthenticatedUser): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      tier: user.tier,
      metadata: user.metadata,
      iat: Math.floor(Date.now() / 1000),
    };

    const options: jwt.SignOptions = {
      expiresIn: this.config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
    };

    return jwt.sign(payload, this.config.jwt.secret, options);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthenticatedUser | null {
    try {
      const decoded = jwt.verify(token, this.config.jwt.secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
      }) as any;

      return {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
        tier: decoded.tier,
        metadata: decoded.metadata,
      };
    } catch (error) {
      return null;
    }
  }
}
