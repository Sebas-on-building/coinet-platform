/**
 * 🚨 Authentication Error Codes & Utilities
 * 
 * Standardized error codes for consistent API responses.
 * User-facing messages are short and non-technical.
 */

// =============================================================================
// ERROR CODES
// =============================================================================

export const AUTH_ERROR_CODES = {
  // Token extraction errors (401)
  AUTH_MISSING_TOKEN: 'AUTH_MISSING_TOKEN',
  AUTH_MALFORMED_HEADER: 'AUTH_MALFORMED_HEADER',
  AUTH_MALFORMED_TOKEN: 'AUTH_MALFORMED_TOKEN',
  
  // Token verification errors (401)
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  AUTH_TOKEN_NOT_YET_VALID: 'AUTH_TOKEN_NOT_YET_VALID',
  AUTH_INVALID_CLAIMS: 'AUTH_INVALID_CLAIMS',
  
  // User verification errors (401/403)
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_USER_INACTIVE: 'AUTH_USER_INACTIVE',
  AUTH_USER_SUSPENDED: 'AUTH_USER_SUSPENDED',
  
  // Authorization errors (403)
  AUTH_INSUFFICIENT_ROLE: 'AUTH_INSUFFICIENT_ROLE',
  AUTH_INSUFFICIENT_TIER: 'AUTH_INSUFFICIENT_TIER',
  AUTH_ACCESS_DENIED: 'AUTH_ACCESS_DENIED',
  
  // Session errors (401)
  AUTH_SESSION_INVALID: 'AUTH_SESSION_INVALID',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // Server configuration errors (500)
  AUTH_CONFIG_ERROR: 'AUTH_CONFIG_ERROR',
  AUTH_INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

// =============================================================================
// USER-FACING MESSAGES
// =============================================================================

/**
 * User-friendly messages for each error code.
 * Keep these short, non-technical, and actionable.
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERROR_CODES.AUTH_MISSING_TOKEN]: 'Please log in to continue.',
  [AUTH_ERROR_CODES.AUTH_MALFORMED_HEADER]: 'Invalid authentication format. Please log in again.',
  [AUTH_ERROR_CODES.AUTH_MALFORMED_TOKEN]: 'Invalid authentication. Please log in again.',
  [AUTH_ERROR_CODES.AUTH_INVALID_TOKEN]: 'Your session is invalid. Please log in again.',
  [AUTH_ERROR_CODES.AUTH_EXPIRED_TOKEN]: 'Your session has expired. Please log in again.',
  [AUTH_ERROR_CODES.AUTH_TOKEN_NOT_YET_VALID]: 'Your session is not yet valid. Please try again.',
  [AUTH_ERROR_CODES.AUTH_INVALID_CLAIMS]: 'Invalid session data. Please log in again.',
  [AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND]: 'Account not found. Please log in again.',
  [AUTH_ERROR_CODES.AUTH_USER_INACTIVE]: 'Your account is inactive. Please contact support.',
  [AUTH_ERROR_CODES.AUTH_USER_SUSPENDED]: 'Your account has been suspended. Please contact support.',
  [AUTH_ERROR_CODES.AUTH_INSUFFICIENT_ROLE]: 'You do not have permission to perform this action.',
  [AUTH_ERROR_CODES.AUTH_INSUFFICIENT_TIER]: 'This feature requires a premium subscription.',
  [AUTH_ERROR_CODES.AUTH_ACCESS_DENIED]: 'Access denied.',
  [AUTH_ERROR_CODES.AUTH_SESSION_INVALID]: 'Your session is invalid. Please log in again.',
  [AUTH_ERROR_CODES.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [AUTH_ERROR_CODES.AUTH_CONFIG_ERROR]: 'Authentication service unavailable. Please try again later.',
  [AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR]: 'An error occurred. Please try again later.',
};

// =============================================================================
// HTTP STATUS MAPPING
// =============================================================================

/**
 * HTTP status code for each error code.
 */
export const AUTH_ERROR_STATUS: Record<AuthErrorCode, number> = {
  [AUTH_ERROR_CODES.AUTH_MISSING_TOKEN]: 401,
  [AUTH_ERROR_CODES.AUTH_MALFORMED_HEADER]: 401,
  [AUTH_ERROR_CODES.AUTH_MALFORMED_TOKEN]: 401,
  [AUTH_ERROR_CODES.AUTH_INVALID_TOKEN]: 401,
  [AUTH_ERROR_CODES.AUTH_EXPIRED_TOKEN]: 401,
  [AUTH_ERROR_CODES.AUTH_TOKEN_NOT_YET_VALID]: 401,
  [AUTH_ERROR_CODES.AUTH_INVALID_CLAIMS]: 401,
  [AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND]: 401, // Using 401 to prevent user enumeration
  [AUTH_ERROR_CODES.AUTH_USER_INACTIVE]: 403,
  [AUTH_ERROR_CODES.AUTH_USER_SUSPENDED]: 403,
  [AUTH_ERROR_CODES.AUTH_INSUFFICIENT_ROLE]: 403,
  [AUTH_ERROR_CODES.AUTH_INSUFFICIENT_TIER]: 403,
  [AUTH_ERROR_CODES.AUTH_ACCESS_DENIED]: 403,
  [AUTH_ERROR_CODES.AUTH_SESSION_INVALID]: 401,
  [AUTH_ERROR_CODES.AUTH_SESSION_EXPIRED]: 401,
  [AUTH_ERROR_CODES.AUTH_CONFIG_ERROR]: 500,
  [AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR]: 500,
};

// =============================================================================
// AUTH ERROR CLASS
// =============================================================================

/**
 * Custom error class for authentication errors.
 * Includes error code for consistent handling.
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly statusCode: number;
  readonly userMessage: string;

  constructor(code: AuthErrorCode, internalMessage?: string) {
    super(internalMessage || AUTH_ERROR_MESSAGES[code]);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = AUTH_ERROR_STATUS[code];
    this.userMessage = AUTH_ERROR_MESSAGES[code];
    
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

// =============================================================================
// ERROR RESPONSE BUILDER
// =============================================================================

/**
 * Build standardized error response payload.
 */
export function buildAuthErrorResponse(
  code: AuthErrorCode,
  requestId: string,
  details?: Record<string, unknown>
) {
  return {
    success: false,
    error: {
      code,
      message: AUTH_ERROR_MESSAGES[code],
      ...(details && process.env.NODE_ENV !== 'production' ? { details } : {}),
    },
    requestId,
  };
}
