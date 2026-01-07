/**
 * 🛡️ Authentication Middleware
 * 
 * Production-ready authentication middleware for Express.
 * Verifies JWT tokens, validates users, and attaches auth context to requests.
 * 
 * Features:
 * - Strict token extraction and verification
 * - Optional database user verification
 * - Consistent error responses with request IDs
 * - Security logging (no token leakage)
 * - Feature flags for gradual rollout
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import {
  AuthContext,
  AuthenticatedRequest,
  AuthMiddlewareConfig,
  UserRole,
  UserTier,
} from '../auth/types';
import {
  AuthError,
  AUTH_ERROR_CODES,
  buildAuthErrorResponse,
} from '../auth/errors';
import {
  extractToken,
  verifyToken,
  getJWTConfigFromEnv,
  timestampToDate,
} from '../auth/token';

// =============================================================================
// FEATURE FLAGS (from environment)
// =============================================================================

/**
 * Feature flag: Enforce authentication on chat routes.
 * Defaults to true (enforce auth) unless explicitly set to 'false'.
 * 
 * Valid values:
 * - 'true' or unset → enforce authentication (default)
 * - 'false' → allow anonymous access (rollback mode - NOT RECOMMENDED IN PRODUCTION)
 * 
 * ⚠️ WARNING: Setting to 'false' will allow unauthenticated requests but will fail
 * when creating conversations because anonymous users don't exist in the database.
 */
const AUTH_ENFORCE_CHAT = (() => {
  const value = process.env.AUTH_ENFORCE_CHAT;
  // Explicitly check for 'false' string, everything else enforces auth
  if (value === 'false' || value === 'False' || value === 'FALSE') {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('⚠️ AUTH_ENFORCE_CHAT=false in production - this is not recommended!');
    }
    return false;
  }
  // Default to true (enforce auth)
  return true;
})();

// Log auth configuration on module load
if (process.env.NODE_ENV === 'production') {
  logger.info('🔐 Auth middleware configuration', {
    AUTH_ENFORCE_CHAT,
    AUTH_VERIFY_USER_IN_DB: process.env.AUTH_VERIFY_USER_IN_DB !== 'false',
    AUTH_ALLOW_LEGACY_X_ACCESS_TOKEN: process.env.AUTH_ALLOW_LEGACY_X_ACCESS_TOKEN === 'true',
    JWT_SECRET_SET: !!process.env.JWT_SECRET,
  });
}

/**
 * Feature flag: Allow legacy x-access-token header.
 * Set to 'false' to disable (after deprecation period).
 */
const AUTH_ALLOW_LEGACY_HEADER = process.env.AUTH_ALLOW_LEGACY_X_ACCESS_TOKEN !== 'false';

/**
 * Feature flag: Verify user exists and is active in database.
 * Set to 'false' to skip DB verification (not recommended for production).
 */
const AUTH_VERIFY_USER_IN_DB = process.env.AUTH_VERIFY_USER_IN_DB !== 'false';

// =============================================================================
// USER CACHE (simple in-memory cache)
// =============================================================================

interface CachedUserStatus {
  active: boolean;
  suspended: boolean;
  role: UserRole;
  tier: UserTier;
  cachedAt: number;
}

const userStatusCache = new Map<string, CachedUserStatus>();
const USER_CACHE_TTL_MS = (parseInt(process.env.AUTH_USER_CACHE_TTL_SEC || '60', 10)) * 1000;

/**
 * Clear user from cache (call on user update/suspension).
 */
export function invalidateUserCache(userId: string): void {
  userStatusCache.delete(userId);
}

/**
 * Clear entire user cache.
 */
export function clearUserCache(): void {
  userStatusCache.clear();
}

// =============================================================================
// REQUEST ID HELPER
// =============================================================================

/**
 * Get or generate request ID.
 */
function getRequestId(req: Request): string {
  // Use existing request ID if available
  const existingId = (req as any).requestId || req.headers['x-request-id'];
  if (existingId && typeof existingId === 'string') {
    return existingId;
  }
  
  // Generate new request ID
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// MAIN MIDDLEWARE
// =============================================================================

/**
 * Authentication middleware.
 * 
 * Verifies JWT token and attaches auth context to request.
 * Returns 401/403 on authentication/authorization failures.
 * 
 * Usage:
 *   router.use(requireAuth);
 *   // or per-route:
 *   router.post('/message', requireAuth, controller.sendMessage);
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = getRequestId(req);
  (req as any).requestId = requestId;
  
  // Set request ID in response header
  res.setHeader('X-Request-ID', requestId);
  
  // Log auth enforcement status on first request (for debugging)
  if (!(global as any).__auth_logged) {
    logger.info('🔐 Auth middleware initialized', {
      AUTH_ENFORCE_CHAT,
      AUTH_VERIFY_USER_IN_DB,
      AUTH_ALLOW_LEGACY_HEADER,
      path: req.path,
    });
    (global as any).__auth_logged = true;
  }
  
  try {
    // 1. Extract token from request
    let token: string | null = null;
    try {
      token = extractToken(req, AUTH_ALLOW_LEGACY_HEADER);
    } catch (error) {
      // extractToken throws AuthError for malformed headers
      if (error instanceof AuthError) {
        throw error;
      }
      // Re-throw unexpected errors
      throw error;
    }
    
    if (!token) {
      // No token - check if we should allow anonymous (rollback mode)
      if (!AUTH_ENFORCE_CHAT) {
        logger.warn('⚠️ Auth bypass: AUTH_ENFORCE_CHAT=false', { requestId, path: req.path });
        // Set anonymous user context for backward compatibility
        // NOTE: This user must exist in the database or conversations will fail
        (req as AuthenticatedRequest).auth = {
          userId: 'anonymous-dev-user',
          email: 'anonymous@coinet.ai',
          role: 'USER',
          tier: 'FREE',
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        };
        return next();
      }
      
      // No token and auth is enforced - reject request
      logger.warn('🚫 Auth required but no token provided', { requestId, path: req.path });
      throw new AuthError(AUTH_ERROR_CODES.AUTH_MISSING_TOKEN);
    }
    
    // 2. Verify token and extract claims
    const jwtConfig = getJWTConfigFromEnv();
    const claims = verifyToken(token, jwtConfig);
    
    // 3. Verify user in database (if enabled)
    if (AUTH_VERIFY_USER_IN_DB) {
      await verifyUserInDatabase(claims.userId, requestId);
    }
    
    // 4. Build auth context
    const authContext: AuthContext = {
      userId: claims.userId,
      email: claims.email,
      role: claims.role,
      tier: claims.tier,
      issuedAt: timestampToDate(claims.iat),
      expiresAt: timestampToDate(claims.exp),
      sessionId: claims.sid,
      tokenId: claims.jti,
    };
    
    // 5. Attach auth context to request
    (req as AuthenticatedRequest).auth = authContext;
    
    // Store token reference for internal use (never expose to client)
    (req as any)._token = token;
    
    // 6. Log successful authentication (sampled to reduce log volume)
    if (Math.random() < 0.01) {
      logger.info('🔐 Auth success', {
        requestId,
        userId: claims.userId,
        role: claims.role,
        tier: claims.tier,
        path: req.path,
      });
    }
    
    next();
    
  } catch (error) {
    // Only handle error if response hasn't been sent
    if (!res.headersSent) {
      handleAuthError(error, requestId, req, res);
    } else {
      // Response already sent, log error but don't try to send another response
      logger.error('❌ Auth error after response sent', error, { requestId, path: req.path });
    }
  }
}

// =============================================================================
// USER VERIFICATION
// =============================================================================

/**
 * Verify user exists and is active in database.
 * Uses cache to reduce DB load.
 * 
 * @throws AuthError if user not found, inactive, or suspended
 */
async function verifyUserInDatabase(userId: string, requestId: string): Promise<void> {
  // Check cache first
  const cached = userStatusCache.get(userId);
  if (cached && (Date.now() - cached.cachedAt) < USER_CACHE_TTL_MS) {
    if (!cached.active) {
      throw new AuthError(AUTH_ERROR_CODES.AUTH_USER_INACTIVE);
    }
    if (cached.suspended) {
      throw new AuthError(AUTH_ERROR_CODES.AUTH_USER_SUSPENDED);
    }
    return;
  }
  
  // Query database
  try {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        active: true,
        role: true,
        tier: true,
      },
    });
    
    if (!user) {
      logger.warn('⚠️ User not found in database', { requestId, userId });
      throw new AuthError(AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND);
    }
    
    // Check active status
    if (!user.active) {
      logger.warn('⚠️ Inactive user attempted access', { requestId, userId });
      throw new AuthError(AUTH_ERROR_CODES.AUTH_USER_INACTIVE);
    }
    
    // Update cache
    userStatusCache.set(userId, {
      active: user.active,
      suspended: false, // Add suspended field to User model if needed
      role: user.role,
      tier: user.tier,
      cachedAt: Date.now(),
    });
    
  } catch (error) {
    // Re-throw AuthErrors
    if (error instanceof AuthError) {
      throw error;
    }
    
    // Database error - log and throw internal error
    logger.error('❌ Database error during user verification', error, { requestId, userId });
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR,
      `Database error: ${error instanceof Error ? error.message : 'Unknown'}`
    );
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Handle authentication errors and send appropriate response.
 */
function handleAuthError(
  error: unknown,
  requestId: string,
  req: Request,
  res: Response
): void {
  // Don't send response if already sent
  if (res.headersSent) {
    logger.error('❌ Cannot send auth error response - headers already sent', {
      requestId,
      path: req.path,
    });
    return;
  }
  
  // Handle AuthError
  if (error instanceof AuthError) {
    // Log security event (never log tokens)
    logger.warn('🚫 Auth failure', {
      requestId,
      code: error.code,
      path: req.path,
      method: req.method,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('User-Agent')?.substring(0, 100),
    });
    
    try {
      res.status(error.statusCode).json(
        buildAuthErrorResponse(error.code, requestId)
      );
    } catch (sendError) {
      logger.error('❌ Failed to send auth error response', sendError, { requestId });
    }
    return;
  }
  
  // Handle unexpected errors
  logger.error('❌ Unexpected auth error', error, {
    requestId,
    path: req.path,
    method: req.method,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
  });
  
  try {
    res.status(500).json(
      buildAuthErrorResponse(AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR, requestId)
    );
  } catch (sendError) {
    logger.error('❌ Failed to send internal error response', sendError, { requestId });
  }
}

// =============================================================================
// AUTHORIZATION HELPERS
// =============================================================================

/**
 * Middleware to require specific role(s).
 * Must be used AFTER requireAuth.
 * 
 * Usage:
 *   router.post('/admin', requireAuth, requireRole('ADMIN'), controller.adminAction);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).requestId || getRequestId(req);
    const auth = (req as AuthenticatedRequest).auth;
    
    if (!auth) {
      res.status(401).json(
        buildAuthErrorResponse(AUTH_ERROR_CODES.AUTH_MISSING_TOKEN, requestId)
      );
      return;
    }
    
    if (!allowedRoles.includes(auth.role)) {
      logger.warn('🚫 Insufficient role', {
        requestId,
        userId: auth.userId,
        userRole: auth.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      
      res.status(403).json(
        buildAuthErrorResponse(AUTH_ERROR_CODES.AUTH_INSUFFICIENT_ROLE, requestId)
      );
      return;
    }
    
    next();
  };
}

/**
 * Middleware to require specific tier(s).
 * Must be used AFTER requireAuth.
 * 
 * Usage:
 *   router.post('/premium', requireAuth, requireTier('PREMIUM', 'ENTERPRISE', 'VIP'), controller.premiumAction);
 */
export function requireTier(...allowedTiers: UserTier[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).requestId || getRequestId(req);
    const auth = (req as AuthenticatedRequest).auth;
    
    if (!auth) {
      res.status(401).json(
        buildAuthErrorResponse(AUTH_ERROR_CODES.AUTH_MISSING_TOKEN, requestId)
      );
      return;
    }
    
    if (!allowedTiers.includes(auth.tier)) {
      logger.warn('🚫 Insufficient tier', {
        requestId,
        userId: auth.userId,
        userTier: auth.tier,
        requiredTiers: allowedTiers,
        path: req.path,
      });
      
      res.status(403).json(
        buildAuthErrorResponse(AUTH_ERROR_CODES.AUTH_INSUFFICIENT_TIER, requestId)
      );
      return;
    }
    
    next();
  };
}

// =============================================================================
// OPTIONAL AUTH MIDDLEWARE
// =============================================================================

/**
 * Optional authentication middleware.
 * Attaches auth context if token is present, but allows anonymous access.
 * 
 * Useful for endpoints that behave differently for authenticated vs anonymous users.
 * 
 * Usage:
 *   router.get('/public', optionalAuth, controller.publicAction);
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = getRequestId(req);
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  try {
    const token = extractToken(req, AUTH_ALLOW_LEGACY_HEADER);
    
    if (!token) {
      // No token - continue without auth context
      return next();
    }
    
    // Try to verify token
    const jwtConfig = getJWTConfigFromEnv();
    const claims = verifyToken(token, jwtConfig);
    
    // Build auth context
    const authContext: AuthContext = {
      userId: claims.userId,
      email: claims.email,
      role: claims.role,
      tier: claims.tier,
      issuedAt: timestampToDate(claims.iat),
      expiresAt: timestampToDate(claims.exp),
      sessionId: claims.sid,
      tokenId: claims.jti,
    };
    
    (req as AuthenticatedRequest).auth = authContext;
    
    next();
    
  } catch (error) {
    // Token invalid - continue without auth context (for optional auth)
    logger.debug('⚠️ Optional auth: invalid token, continuing without auth', {
      requestId,
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    next();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  AuthContext,
  AuthenticatedRequest,
} from '../auth/types';
