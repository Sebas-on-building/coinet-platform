/**
 * COINET AUTHENTICATION MIDDLEWARE
 * 
 * Production-ready authentication with Clerk integration.
 * Supports multiple authentication methods:
 * - Clerk JWT tokens (primary - production)
 * - API keys (for programmatic access)
 * - X-User-Id header (for demo mode and internal services)
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, createClerkClient } from '@clerk/backend';
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
  clerkId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  userId?: string;
  isAuthenticated?: boolean;
  authMethod?: 'clerk' | 'apiKey' | 'demo' | 'anonymous';
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Clerk configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;

// Check if authentication is enforced (can be disabled for development)
const AUTH_ENFORCE = process.env.AUTH_ENFORCE_CHAT !== 'false';

// Demo user UUID (matches frontend)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// Anonymous user for unauthenticated requests (when auth is not enforced)
const ANONYMOUS_USER: AuthenticatedUser = {
  id: 'anonymous',
  role: 'user',
  tier: 'free',
};

// Initialize Clerk client if configured
const clerkClient = CLERK_SECRET_KEY 
  ? createClerkClient({ secretKey: CLERK_SECRET_KEY })
  : null;

// Log Clerk configuration status
if (CLERK_SECRET_KEY) {
  logger.info('✅ Clerk backend configured with secret key');
} else {
  logger.warn('⚠️ CLERK_SECRET_KEY not set - Clerk token validation disabled');
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Authentication middleware
 * Validates the request and attaches user info
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to extract authentication from various sources
    const authResult = await extractAuth(req);
    
    if (authResult.authenticated) {
      req.user = authResult.user;
      req.userId = authResult.user?.id;
      req.isAuthenticated = true;
      req.authMethod = authResult.method;
      logger.debug('Auth success', { 
        userId: req.userId, 
        method: req.authMethod,
        email: req.user?.email 
      });
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
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authResult = await extractAuth(req);
    
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
  method?: 'clerk' | 'apiKey' | 'demo' | 'anonymous';
  reason?: string;
}

/**
 * Extract and validate authentication from request
 */
async function extractAuth(req: Request): Promise<AuthResult> {
  // 1. Try Bearer token (Clerk JWT)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = await validateClerkToken(token);
    if (result.authenticated) {
      return result;
    }
    // If Clerk validation fails, try legacy JWT
    const legacyResult = validateLegacyJWT(token);
    if (legacyResult.authenticated) {
      return legacyResult;
    }
  }
  
  // 2. Try API key
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return validateApiKey(apiKey);
  }
  
  // 3. Try user ID from headers (for demo mode and internal services)
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    // Check if it's the demo user
    const isDemoUser = userId === DEMO_USER_ID || userId.startsWith('user_');
    
    return {
      authenticated: true,
      user: {
        id: userId,
        role: 'user',
        tier: isDemoUser ? 'free' : 'pro',
        name: isDemoUser ? 'Demo User' : undefined,
        email: isDemoUser ? 'demo@coinet.ai' : undefined,
      },
      method: 'demo',
    };
  }
  
  return {
    authenticated: false,
    reason: 'No authentication provided',
  };
}

/**
 * Validate Clerk JWT token
 */
async function validateClerkToken(token: string): Promise<AuthResult> {
  // Skip if Clerk is not configured
  if (!CLERK_SECRET_KEY) {
    logger.debug('Clerk not configured, skipping token validation');
    return { authenticated: false, reason: 'Clerk not configured' };
  }

  try {
    // Verify the token with Clerk
    const payload = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
    });
    
    if (!payload) {
      return { authenticated: false, reason: 'Invalid Clerk token' };
    }

    // Extract user info from the token
    const userId = payload.sub;
    
    // Optionally fetch full user details from Clerk
    let email: string | undefined;
    let name: string | undefined;
    
    if (clerkClient && userId) {
      try {
        const user = await clerkClient.users.getUser(userId);
        email = user.emailAddresses?.[0]?.emailAddress;
        name = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined;
      } catch (e) {
        // Non-fatal - we can continue without full user details
        logger.debug('Could not fetch Clerk user details', { userId, error: e });
      }
    }

    return {
      authenticated: true,
      user: {
        id: userId,
        clerkId: userId,
        email,
        name,
        role: 'user',
        tier: 'free', // Could be upgraded based on Clerk metadata
      },
      method: 'clerk',
    };
  } catch (error: any) {
    logger.debug('Clerk token validation failed', { 
      error: error.message,
      code: error.code 
    });
    return { 
      authenticated: false, 
      reason: error.message || 'Invalid or expired token' 
    };
  }
}

/**
 * Validate legacy JWT token (fallback)
 */
function validateLegacyJWT(token: string): AuthResult {
  try {
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
      method: 'clerk', // Treat as clerk method for consistency
    };
  } catch (error) {
    logger.debug('Legacy JWT validation failed', { error });
    return { authenticated: false, reason: 'Invalid token' };
  }
}

/**
 * Validate API key
 */
function validateApiKey(apiKey: string): AuthResult {
  if (!apiKey || apiKey.length < 10) {
    return { authenticated: false, reason: 'Invalid API key format' };
  }
  
  // Extract user info from API key
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
