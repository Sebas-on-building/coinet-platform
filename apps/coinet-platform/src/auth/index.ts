/**
 * 🔐 Authentication Module
 * 
 * Single entry point for all auth-related exports.
 */

// Types
export {
  UserRole,
  UserTier,
  TokenClaims,
  AuthContext,
  AuthenticatedRequest,
  AuthenticatedUser,
  JWTConfig,
  AuthMiddlewareConfig,
  isAuthenticatedRequest,
} from './types';

// Errors
export {
  AUTH_ERROR_CODES,
  AuthErrorCode,
  AUTH_ERROR_MESSAGES,
  AUTH_ERROR_STATUS,
  AuthError,
  buildAuthErrorResponse,
} from './errors';

// Token utilities
export {
  extractToken,
  verifyToken,
  getJWTConfigFromEnv,
  timestampToDate,
} from './token';
