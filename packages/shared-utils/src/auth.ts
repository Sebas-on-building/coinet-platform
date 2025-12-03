/**
 * =========================================
 * SHARED AUTHENTICATION MIDDLEWARE
 * =========================================
 * World-class authentication and authorization middleware
 * for all Coinet services with enterprise-grade security
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Enhanced types for comprehensive security
export interface JWTPayload {
  id: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  jti: string;
  iss: string;
  aud: string;
  sub?: string;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: 'admin' | 'user' | 'premium' | 'enterprise';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  provider?: 'local' | 'google' | 'apple';
  avatar?: string;
  name?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
  tokenPayload?: JWTPayload;
  userId?: string;
}

// Enhanced configuration for different environments
const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    algorithm: 'HS256' as const,
    issuer: process.env.JWT_ISSUER || 'coinet-auth-service',
    audience: process.env.JWT_AUDIENCE || 'coinet-api',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '7d',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '30d'
  },
  security: {
    tokenBlacklist: process.env.TOKEN_BLACKLIST_ENABLED !== 'false',
    requireHttps: process.env.NODE_ENV === 'production',
    secureCookies: process.env.NODE_ENV === 'production'
  },
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.AUTH_RATE_LIMIT || '5')
    }
  }
};

// Enhanced logger with security focus
const logger = {
  info: (_message: string, _meta?: unknown) => { /* console.log(`[AUTH] ${message}`, meta) */ },
  warn: (_message: string, _meta?: unknown) => { /* console.warn(`[AUTH WARN] ${message}`, meta) */ },
  error: (_message: string, _meta?: unknown) => { /* console.error(`[AUTH ERROR] ${message}`, meta) */ },
  security: (_event: string, _details: unknown) => { /* console.log(`[SECURITY] ${event}`, details) */ }
};

/**
 * Generate a secure JWT token with comprehensive payload
 */
export function generateJWT(
  user: AuthenticatedUser,
  options: { type?: 'access' | 'refresh'; expiresIn?: string } = {}
): string {
  const { type = 'access', expiresIn } = options;

  const payload: Partial<JWTPayload> = {
    id: user.id,
    role: user.role,
    permissions: user.permissions,
    iss: authConfig.jwt.issuer,
    aud: authConfig.jwt.audience,
    jti: crypto.randomUUID(),
    sub: user.id
  };

  const tokenConfig = {
    algorithm: authConfig.jwt.algorithm,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience,
    jwtid: payload.jti,
    subject: user.id
  };

  const secret = authConfig.jwt.secret;
  const expiration = expiresIn || (type === 'refresh' ? authConfig.jwt.refreshTokenExpiry : authConfig.jwt.accessTokenExpiry);

  return jwt.sign(payload, secret, { ...tokenConfig, expiresIn: expiration });
}

/**
 * Verify and decode a JWT token with comprehensive validation
 */
export function verifyJWT(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, authConfig.jwt.secret, {
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
      algorithms: [authConfig.jwt.algorithm]
    }) as JWTPayload;

    return payload;
  } catch (error) {
    logger.security('JWT_VERIFICATION_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Extract token from various sources (header, cookie, query)
 */
export function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookies
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  // Try query parameter (for WebSocket connections)
  if (req.query?.token) {
    return req.query.token as string;
  }

  // Try custom header
  if (req.headers['x-access-token']) {
    return req.headers['x-access-token'] as string;
  }

  return null;
}

/**
 * Main authentication middleware with comprehensive security
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.security('AUTHENTICATION_FAILED', {
        reason: 'NO_TOKEN_PROVIDED',
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      res.status(401).json({
        error: 'Authentication required',
        message: 'Access token is required',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
      return;
    }

    const payload = verifyJWT(token);

    // Validate token expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      logger.security('AUTHENTICATION_FAILED', {
        reason: 'TOKEN_EXPIRED',
        userId: payload.id,
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
      return;
    }

    // Create authenticated user object
    req.user = {
      id: payload.id,
      role: payload.role as AuthenticatedUser['role'],
      permissions: payload.permissions || [],
      isActive: true,
      createdAt: new Date()
    };

    req.token = token;
    req.tokenPayload = payload;
    req.userId = payload.id;

    // Log successful authentication
    logger.info('Authentication successful', {
      userId: payload.id,
      role: payload.role,
      permissions: payload.permissions?.length || 0,
      ip: req.ip,
      path: req.path
    });

    next();
  } catch (error) {
    logger.security('AUTHENTICATION_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString()
    });

    res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid or malformed',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles: string | string[]): (req: AuthRequest, res: Response, next: NextFunction) => void {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.security('AUTHORIZATION_FAILED', {
        reason: 'NO_USER',
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.security('AUTHORIZATION_FAILED', {
        reason: 'INSUFFICIENT_ROLE',
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${allowedRoles.join(' or ')}. Current role: ${req.user.role}`,
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info('Authorization successful', {
      userId: req.user.id,
      userRole: req.user.role,
      requiredRoles: allowedRoles,
      path: req.path
    });

    next();
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(permissions: string | string[]): (req: AuthRequest, res: Response, next: NextFunction) => void {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logger.security('AUTHORIZATION_FAILED', {
        reason: 'INSUFFICIENT_PERMISSIONS',
        userId: req.user.id,
        userPermissions,
        requiredPermissions,
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required permissions: ${requiredPermissions.join(', ')}`,
        requiredPermissions,
        userPermissions,
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info('Permission authorization successful', {
      userId: req.user.id,
      userPermissions,
      requiredPermissions,
      path: req.path
    });

    next();
  };
}

/**
 * Combined authentication and authorization middleware
 */
export function requireAuth(roles?: string | string[], permissions?: string | string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // First authenticate
    authenticateToken(req, res, (authError) => {
      if (authError) return;

      // Then check roles if specified
      if (roles) {
        const roleMiddleware = requireRole(roles);
        roleMiddleware(req, res, (roleError) => {
          if (roleError) return;

          // Finally check permissions if specified
          if (permissions) {
            const permissionMiddleware = requirePermission(permissions);
            permissionMiddleware(req, res, next);
          } else {
            next();
          }
        });
      } else if (permissions) {
        const permissionMiddleware = requirePermission(permissions);
        permissionMiddleware(req, res, next);
      } else {
        next();
      }
    });
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        const payload = verifyJWT(token);

        req.user = {
          id: payload.id,
          role: payload.role as AuthenticatedUser['role'],
          permissions: payload.permissions || [],
          isActive: true,
          createdAt: new Date()
        };

        req.token = token;
        req.tokenPayload = payload;
        req.userId = payload.id;
      } catch (error) {
        // Token is invalid but we don't fail the request
        logger.warn('Invalid optional auth token', {
          ip: req.ip,
          path: req.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors
    logger.warn('Optional auth error', {
      ip: req.ip,
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next();
  }
}

/**
 * Rate limiting for authentication endpoints
 */
export function authRateLimit() {
  const rateLimit = require('express-rate-limit');

  return rateLimit({
    windowMs: authConfig.rateLimit.auth.windowMs,
    max: authConfig.rateLimit.auth.max,
    message: {
      error: 'Too many authentication attempts',
      retryAfter: Math.ceil(authConfig.rateLimit.auth.windowMs / 1000 / 60),
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return `${req.ip}-${req.get('User-Agent')}`;
    },
    handler: (req: Request, res: Response) => {
      logger.security('AUTH_RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        timestamp: new Date().toISOString()
      });

      res.status(429).json({
        error: 'Too many authentication attempts',
        retryAfter: Math.ceil(authConfig.rateLimit.auth.windowMs / 1000 / 60),
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  const helmet = require('helmet');

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "wss:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
}

/**
 * CORS configuration for authenticated requests
 */
export function corsConfig() {
  const cors = require('cors');

  return cors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://coinet.ai',
        'https://app.coinet.ai',
        'https://staging.coinet.ai',
        'https://www.coinet.ai'
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.security('CORS_BLOCKED', {
          origin,
          userAgent: 'unknown',
          timestamp: new Date().toISOString()
        });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-User-ID',
      'X-API-Key'
    ]
  });
}

/**
 * Request logging middleware for authenticated requests
 */
export function requestLogging() {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    // Log incoming request
    logger.info('Incoming authenticated request', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      userRole: req.user?.role,
      timestamp: new Date().toISOString()
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
        userRole: req.user?.role,
        timestamp: new Date().toISOString()
      });
    });

    next();
  };
}

/**
 * Error handling middleware for authentication errors
 */
export function authErrorHandler() {
  return (error: Error, req: AuthRequest, res: Response, _next: NextFunction): void => {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.path,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Authentication service error',
        message: 'An error occurred during authentication',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    }
  };
}

// All utilities are already exported inline via 'export const' declarations
