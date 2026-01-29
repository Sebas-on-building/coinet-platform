/**
 * COINET AUTHENTICATION MIDDLEWARE
 * 
 * Handles request authentication and user context injection.
 * Supports multiple authentication methods:
 * - JWT tokens
 * - API keys
 * - Session cookies
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  role: 'user' | 'admin' | 'premium';
  tier: 'free' | 'pro' | 'enterprise';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  userId?: string;
  isAuthenticated?: boolean;
  authMethod?: 'jwt' | 'apiKey' | 'session' | 'anonymous';
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Check if authentication is enforced (can be disabled for development)
const AUTH_ENFORCE = process.env.AUTH_ENFORCE_CHAT !== 'false';
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Anonymous user for unauthenticated requests (when auth is not enforced)
const ANONYMOUS_USER: AuthenticatedUser = {
  id: 'anonymous',
  role: 'user',
  tier: 'free',
};

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Authentication middleware
 * Validates the request and attaches user info
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Try to extract authentication from various sources
    const authResult = extractAuth(req);
    
    if (authResult.authenticated) {
      req.user = authResult.user;
      req.userId = authResult.user?.id;
      req.isAuthenticated = true;
      req.authMethod = authResult.method;
      return next();
    }
    
    // If auth is not enforced, allow anonymous access
    if (!AUTH_ENFORCE) {
      req.user = ANONYMOUS_USER;
      req.userId = ANONYMOUS_USER.id;
      req.isAuthenticated = false;
      req.authMethod = 'anonymous';
      logger.debug('Anonymous access allowed (AUTH_ENFORCE_CHAT=false)');
      return next();
    }
    
    // Authentication required but not provided
    logger.warn('Authentication failed', { 
      reason: authResult.reason,
      ip: req.ip,
      path: req.path,
    });
    
    res.status(401).json({
      error: 'Authentication required',
      message: authResult.reason || 'Please provide valid authentication',
    });
    
  } catch (error) {
    logger.error('Auth middleware error', { error });
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if available, but allows unauthenticated requests
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authResult = extractAuth(req);
    
    if (authResult.authenticated) {
      req.user = authResult.user;
      req.userId = authResult.user?.id;
      req.isAuthenticated = true;
      req.authMethod = authResult.method;
    } else {
      req.user = ANONYMOUS_USER;
      req.userId = ANONYMOUS_USER.id;
      req.isAuthenticated = false;
      req.authMethod = 'anonymous';
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error', { error });
    // Continue without auth on error
    req.user = ANONYMOUS_USER;
    req.userId = ANONYMOUS_USER.id;
    req.isAuthenticated = false;
    req.authMethod = 'anonymous';
    next();
  }
}

// =============================================================================
// AUTHENTICATION EXTRACTION
// =============================================================================

interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  method?: 'jwt' | 'apiKey' | 'session';
  reason?: string;
}

/**
 * Extract and validate authentication from request
 */
function extractAuth(req: Request): AuthResult {
  // 1. Try Bearer token (JWT)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return validateJWT(token);
  }
  
  // 2. Try API key
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return validateApiKey(apiKey);
  }
  
  // 3. Try session cookie
  const sessionCookie = req.cookies?.session;
  if (sessionCookie) {
    return validateSession(sessionCookie);
  }
  
  // 4. Try user ID from headers (for internal services)
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    return {
      authenticated: true,
      user: {
        id: userId,
        role: 'user',
        tier: 'free',
      },
      method: 'session',
    };
  }
  
  return {
    authenticated: false,
    reason: 'No authentication provided',
  };
}

/**
 * Validate JWT token
 */
function validateJWT(token: string): AuthResult {
  try {
    // Simple JWT validation (in production, use a proper JWT library)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { authenticated: false, reason: 'Invalid token format' };
    }
    
    // Decode payload (base64)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { authenticated: false, reason: 'Token expired' };
    }
    
    return {
      authenticated: true,
      user: {
        id: payload.sub || payload.userId || payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role || 'user',
        tier: payload.tier || 'free',
      },
      method: 'jwt',
    };
  } catch (error) {
    logger.debug('JWT validation failed', { error });
    return { authenticated: false, reason: 'Invalid token' };
  }
}

/**
 * Validate API key
 */
function validateApiKey(apiKey: string): AuthResult {
  // In production, this would check against a database of valid API keys
  // For now, accept any non-empty API key with basic format validation
  
  if (!apiKey || apiKey.length < 10) {
    return { authenticated: false, reason: 'Invalid API key format' };
  }
  
  // Extract user info from API key (in production, lookup from database)
  // API key format: coinet_<userId>_<random>
  const match = apiKey.match(/^coinet_([a-zA-Z0-9-]+)_/);
  
  if (match) {
    return {
      authenticated: true,
      user: {
        id: match[1],
        role: 'user',
        tier: 'pro', // API key users are typically pro tier
      },
      method: 'apiKey',
    };
  }
  
  // Accept generic API keys for development
  if (process.env.NODE_ENV !== 'production') {
    return {
      authenticated: true,
      user: {
        id: 'api-user',
        role: 'user',
        tier: 'free',
      },
      method: 'apiKey',
    };
  }
  
  return { authenticated: false, reason: 'Invalid API key' };
}

/**
 * Validate session cookie
 */
function validateSession(sessionId: string): AuthResult {
  // In production, this would validate against session store (Redis, etc.)
  // For now, accept any session ID
  
  if (!sessionId || sessionId.length < 10) {
    return { authenticated: false, reason: 'Invalid session' };
  }
  
  return {
    authenticated: true,
    user: {
      id: `session-${sessionId.substring(0, 8)}`,
      role: 'user',
      tier: 'free',
    },
    method: 'session',
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if user has required role
 */
export function hasRole(user: AuthenticatedUser | undefined, requiredRole: 'user' | 'admin' | 'premium'): boolean {
  if (!user) return false;
  
  const roleHierarchy = { user: 1, premium: 2, admin: 3 };
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Check if user has required tier
 */
export function hasTier(user: AuthenticatedUser | undefined, requiredTier: 'free' | 'pro' | 'enterprise'): boolean {
  if (!user) return false;
  
  const tierHierarchy = { free: 1, pro: 2, enterprise: 3 };
  return tierHierarchy[user.tier] >= tierHierarchy[requiredTier];
}

/**
 * Admin-only middleware
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!hasRole(req.user, 'admin')) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
    return;
  }
  next();
}

/**
 * Premium-only middleware
 */
export function requirePremium(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!hasTier(req.user, 'pro')) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Premium subscription required',
    });
    return;
  }
  next();
}
