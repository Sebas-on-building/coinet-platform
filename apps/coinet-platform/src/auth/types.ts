/**
 * 🔐 Authentication Types
 * 
 * Single source of truth for auth-related types.
 * Production-ready with strict typing and minimal data exposure.
 */

import { Request } from 'express';

// =============================================================================
// USER ROLES & TIERS
// =============================================================================

export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';
export type UserTier = 'FREE' | 'PREMIUM' | 'ENTERPRISE' | 'VIP';

// =============================================================================
// JWT TOKEN CLAIMS
// =============================================================================

/**
 * Claims extracted from JWT token payload.
 * These are the fields we sign into the token.
 */
export interface TokenClaims {
  /** User ID (sub claim) */
  sub: string;
  /** User ID (alias for sub, for backwards compatibility) */
  userId: string;
  /** User email */
  email: string;
  /** User role */
  role: UserRole;
  /** User tier/subscription level */
  tier: UserTier;
  /** Token issued at (Unix timestamp) */
  iat: number;
  /** Token expiration (Unix timestamp) */
  exp: number;
  /** Optional: Session ID for session tracking/revocation */
  sid?: string;
  /** Optional: Token ID for token revocation */
  jti?: string;
  /** Optional: Issuer */
  iss?: string;
  /** Optional: Audience */
  aud?: string | string[];
}

// =============================================================================
// AUTH CONTEXT (attached to request)
// =============================================================================

/**
 * Authentication context attached to req.auth.
 * Minimal fields needed for request processing.
 * Do NOT add sensitive fields (password hash, billing info, etc.)
 */
export interface AuthContext {
  /** User ID */
  userId: string;
  /** User email */
  email: string;
  /** User role */
  role: UserRole;
  /** User tier */
  tier: UserTier;
  /** Token issued at timestamp */
  issuedAt: Date;
  /** Token expiration timestamp */
  expiresAt: Date;
  /** Session ID (if using sessions) */
  sessionId?: string;
  /** Token ID (for revocation tracking) */
  tokenId?: string;
}

/**
 * Full user data from database lookup.
 * Used for additional validation (active status, suspension, etc.)
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  active: boolean;
  name?: string;
  avatar?: string;
}

// =============================================================================
// REQUEST AUGMENTATION
// =============================================================================

/**
 * Express Request with authentication context.
 * Use this type in route handlers that require auth.
 */
export interface AuthenticatedRequest extends Request {
  /** Authentication context from JWT token */
  auth: AuthContext;
  /** Request ID for tracing */
  requestId: string;
  /** Raw JWT token (for logging/debugging, never expose to client) */
  _token?: string;
}

/**
 * Type guard to check if request is authenticated.
 */
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'auth' in req && req.auth !== undefined && typeof (req as any).auth.userId === 'string';
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * JWT verification configuration.
 */
export interface JWTConfig {
  /** JWT secret (required) */
  secret: string;
  /** Expected issuer (optional) */
  issuer?: string;
  /** Expected audience (optional) */
  audience?: string;
  /** Clock tolerance in seconds (default: 30) */
  clockToleranceSec?: number;
  /** Maximum token age in seconds (default: 7 days) */
  maxAgeSec?: number;
}

/**
 * Auth middleware configuration.
 */
export interface AuthMiddlewareConfig {
  /** JWT configuration */
  jwt: JWTConfig;
  /** Whether to verify user exists and is active in DB */
  verifyUserInDB?: boolean;
  /** Cache user status TTL in seconds (0 = no cache) */
  userCacheTTLSec?: number;
  /** Allow legacy x-access-token header (deprecation phase) */
  allowLegacyHeader?: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION (Runtime)
// =============================================================================

/**
 * JWT configuration values from environment variables.
 * Used by token verification utilities.
 */
export const JWT_CONFIG = {
  /** JWT secret from environment */
  secret: process.env.JWT_SECRET || '',
  /** Expected token issuer */
  issuer: process.env.JWT_ISSUER || 'coinet-platform',
  /** Expected token audience */
  audience: process.env.JWT_AUDIENCE || 'coinet-users',
  /** Clock skew tolerance in seconds */
  clockToleranceSec: Number(process.env.JWT_CLOCK_TOLERANCE_SEC) || 5,
  /** Maximum token length in bytes (DoS protection) */
  maxTokenLengthBytes: Number(process.env.JWT_MAX_TOKEN_LENGTH_BYTES) || 8192,
} as const;
