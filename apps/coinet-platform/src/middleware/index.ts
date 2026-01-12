/**
 * 🛡️ Middleware Module
 * 
 * Central export point for all middleware.
 */

// Authentication middleware
export {
  requireAuth,
  requireRole,
  requireTier,
  optionalAuth,
  invalidateUserCache,
  clearUserCache,
  AuthContext,
  AuthenticatedRequest,
} from './requireAuth';

// Rate limiting middleware
export {
  rateLimit,
  authRateLimit,
  chatMessageRateLimit,
  chatStreamRateLimit,
  generalRateLimit,
  recordAuthFailure,
  clearAuthFailures,
  isAuthBlocked,
  RATE_LIMIT_CONFIGS,
} from './rateLimit';

// Security headers middleware
export {
  securityHeaders,
  CORS_OPTIONS,
} from './securityHeaders';
