/**
 * 🔑 Token Parsing & Verification Utilities
 * 
 * Handles JWT token extraction, verification, and claims validation.
 * Secure-by-default with defensive coding practices.
 */

import jwt, { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import { Request } from 'express';
import { TokenClaims, JWTConfig, UserRole, UserTier } from './types';
import { AuthError, AUTH_ERROR_CODES } from './errors';
import { logger } from '../utils/logger';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum token length to prevent DoS attacks */
const MAX_TOKEN_LENGTH = 4096;

/** Valid user roles */
const VALID_ROLES: UserRole[] = ['USER', 'ADMIN', 'MODERATOR'];

/** Valid user tiers */
const VALID_TIERS: UserTier[] = ['FREE', 'PREMIUM', 'ENTERPRISE', 'VIP'];

/** Default clock tolerance in seconds */
const DEFAULT_CLOCK_TOLERANCE_SEC = 30;

// =============================================================================
// TOKEN EXTRACTION
// =============================================================================

/**
 * Extract JWT token from request.
 * 
 * Order of precedence:
 * 1. Authorization header (Bearer token)
 * 2. x-access-token header (legacy, feature-flagged)
 * 
 * @throws AuthError if header is malformed
 */
export function extractToken(req: Request, allowLegacyHeader = false): string | null {
  // 1. Check Authorization header (preferred)
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    // Must be "Bearer <token>" format
    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthError(
        AUTH_ERROR_CODES.AUTH_MALFORMED_HEADER,
        `Authorization header must use Bearer scheme, got: ${authHeader.substring(0, 20)}...`
      );
    }
    
    const token = authHeader.substring(7).trim();
    
    // Validate token is present after "Bearer "
    if (!token) {
      throw new AuthError(
        AUTH_ERROR_CODES.AUTH_MALFORMED_HEADER,
        'Authorization header has Bearer scheme but no token'
      );
    }
    
    // Basic DoS protection: reject overly long tokens
    if (token.length > MAX_TOKEN_LENGTH) {
      throw new AuthError(
        AUTH_ERROR_CODES.AUTH_MALFORMED_TOKEN,
        `Token exceeds maximum length of ${MAX_TOKEN_LENGTH} characters`
      );
    }
    
    return token;
  }
  
  // 2. Check legacy x-access-token header (if allowed)
  if (allowLegacyHeader) {
    const legacyToken = req.headers['x-access-token'] as string | undefined;
    
    if (legacyToken) {
      // Log deprecation warning (sampled)
      if (Math.random() < 0.01) {
        logger.warn('⚠️ Deprecated: x-access-token header used', {
          path: req.path,
          userAgent: req.get('User-Agent')?.substring(0, 50),
        });
      }
      
      if (legacyToken.length > MAX_TOKEN_LENGTH) {
        throw new AuthError(
          AUTH_ERROR_CODES.AUTH_MALFORMED_TOKEN,
          `Token exceeds maximum length of ${MAX_TOKEN_LENGTH} characters`
        );
      }
      
      return legacyToken;
    }
  }
  
  // No token found
  return null;
}

// =============================================================================
// TOKEN VERIFICATION
// =============================================================================

/**
 * Verify JWT token and extract claims.
 * 
 * @throws AuthError with specific code for each failure type
 */
export function verifyToken(token: string, config: JWTConfig): TokenClaims {
  const { secret, issuer, audience, clockToleranceSec = DEFAULT_CLOCK_TOLERANCE_SEC } = config;
  
  // Validate secret is configured
  if (!secret) {
    logger.error('❌ JWT_SECRET is not configured');
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_CONFIG_ERROR,
      'JWT secret is not configured on the server'
    );
  }
  
  try {
    // Verify token signature and basic claims
    const decoded = jwt.verify(token, secret, {
      clockTolerance: clockToleranceSec,
      issuer: issuer,
      audience: audience,
      algorithms: ['HS256', 'HS384', 'HS512'],
    }) as Record<string, unknown>;
    
    // Validate and normalize claims
    const claims = validateAndNormalizeClaims(decoded);
    
    return claims;
    
  } catch (error) {
    // Map JWT library errors to our error codes
    if (error instanceof TokenExpiredError) {
      throw new AuthError(
        AUTH_ERROR_CODES.AUTH_EXPIRED_TOKEN,
        `Token expired at ${error.expiredAt}`
      );
    }
    
    if (error instanceof NotBeforeError) {
      throw new AuthError(
        AUTH_ERROR_CODES.AUTH_TOKEN_NOT_YET_VALID,
        `Token not valid until ${error.date}`
      );
    }
    
    if (error instanceof JsonWebTokenError) {
      throw new AuthError(
        AUTH_ERROR_CODES.AUTH_INVALID_TOKEN,
        `JWT verification failed: ${error.message}`
      );
    }
    
    // Re-throw AuthErrors as-is
    if (error instanceof AuthError) {
      throw error;
    }
    
    // Unknown error
    logger.error('❌ Unexpected token verification error', error);
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR,
      `Unexpected verification error: ${error instanceof Error ? error.message : 'Unknown'}`
    );
  }
}

// =============================================================================
// CLAIMS VALIDATION
// =============================================================================

/**
 * Validate and normalize JWT claims.
 * Ensures required claims are present and have correct types.
 * 
 * @throws AuthError if claims are invalid
 */
function validateAndNormalizeClaims(decoded: Record<string, unknown>): TokenClaims {
  // Extract userId from 'sub' or 'userId' claim
  const userId = (decoded.sub || decoded.userId) as string | undefined;
  if (!userId || typeof userId !== 'string') {
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_INVALID_CLAIMS,
      'Token missing required claim: sub/userId'
    );
  }
  
  // Validate email (required)
  const email = decoded.email as string | undefined;
  if (!email || typeof email !== 'string') {
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_INVALID_CLAIMS,
      'Token missing required claim: email'
    );
  }
  
  // Validate role (required, must be valid enum)
  const role = (decoded.role || 'USER') as string;
  if (!VALID_ROLES.includes(role as UserRole)) {
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_INVALID_CLAIMS,
      `Invalid role claim: ${role}`
    );
  }
  
  // Validate tier (required, must be valid enum)
  const tier = (decoded.tier || 'FREE') as string;
  if (!VALID_TIERS.includes(tier as UserTier)) {
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_INVALID_CLAIMS,
      `Invalid tier claim: ${tier}`
    );
  }
  
  // Validate timestamps (required)
  const iat = decoded.iat as number | undefined;
  const exp = decoded.exp as number | undefined;
  
  if (!iat || typeof iat !== 'number') {
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_INVALID_CLAIMS,
      'Token missing required claim: iat'
    );
  }
  
  if (!exp || typeof exp !== 'number') {
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_INVALID_CLAIMS,
      'Token missing required claim: exp'
    );
  }
  
  // Build normalized claims object
  const claims: TokenClaims = {
    sub: userId,
    userId: userId,
    email: email,
    role: role as UserRole,
    tier: tier as UserTier,
    iat: iat,
    exp: exp,
  };
  
  // Optional claims
  if (decoded.sid && typeof decoded.sid === 'string') {
    claims.sid = decoded.sid;
  }
  
  if (decoded.jti && typeof decoded.jti === 'string') {
    claims.jti = decoded.jti;
  }
  
  if (decoded.iss && typeof decoded.iss === 'string') {
    claims.iss = decoded.iss;
  }
  
  if (decoded.aud) {
    claims.aud = decoded.aud as string | string[];
  }
  
  return claims;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get JWT configuration from environment.
 */
export function getJWTConfigFromEnv(): JWTConfig {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new AuthError(
      AUTH_ERROR_CODES.AUTH_CONFIG_ERROR,
      'JWT_SECRET environment variable is not set'
    );
  }
  
  return {
    secret,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    clockToleranceSec: parseInt(process.env.JWT_CLOCK_TOLERANCE_SEC || '30', 10),
    maxAgeSec: parseInt(process.env.JWT_MAX_AGE_SEC || '604800', 10), // 7 days default
  };
}

/**
 * Convert Unix timestamp to Date.
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
