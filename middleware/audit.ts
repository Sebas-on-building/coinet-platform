/**
 * =========================================
 * COMPREHENSIVE AUDIT MIDDLEWARE
 * =========================================
 * Divine world-class audit logging middleware for API calls,
 * database operations, and critical system events
 */

import { Request, Response, NextFunction } from 'express';
import { AuditService, AuditLogEntry, AuditLogCategory, LogSeverity } from '../services/auth/services/auditService';

// Track request start time for performance monitoring
const requestStartTimes = new Map<string, number>();

/**
 * Enhanced audit middleware that captures comprehensive API call information
 */
export function comprehensiveAuditMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Store request start time for duration calculation
    requestStartTimes.set(requestId, startTime);

    // Skip audit logging for health checks and static assets
    const skipPaths = [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/_next/',
      '/api/health',
      '/api/metrics'
    ];

    if (skipPaths.some(path => req.path.includes(path))) {
      return next();
    }

    // Capture response for audit logging
    const originalSend = res.send;
    let responseBody: any = null;

    res.send = function(data: any) {
      responseBody = data;
      return originalSend.call(this, data);
    };

    // Log audit event after response is sent
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        await logApiCall(req, res, requestId, duration, responseBody);
      } catch (error) {
        console.error('❌ Audit middleware error:', error);
      } finally {
        requestStartTimes.delete(requestId);
      }
    });

    next();
  };
}

/**
 * Database operation audit middleware for Prisma queries
 */
export function databaseAuditMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Store original Prisma methods for wrapping
    const originalDb = (req as any).db;

    if (originalDb) {
      // Wrap Prisma methods to capture database operations
      (req as any).db = new Proxy(originalDb, {
        get(target, prop) {
          const value = target[prop];

          // Wrap methods that modify data
          if (typeof value === 'function' && shouldAuditDbOperation(prop)) {
            return async function(...args: any[]) {
              const startTime = Date.now();
              const operation = prop.toString();

              try {
                // Execute the original operation
                const result = await value.apply(target, args);

                // Log successful database operation
                await logDatabaseOperation(req, operation, args, result, startTime, 'SUCCESS');

                return result;
              } catch (error) {
                // Log failed database operation
                await logDatabaseOperation(req, operation, args, null, startTime, 'ERROR', error.message);

                throw error;
              }
            };
          }

          return value;
        }
      });
    }

    next();
  };
}

/**
 * Authentication-specific audit logging
 */
export function authenticationAuditMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Log authentication attempts
    if (req.path.includes('/auth/') || req.path.includes('/login') || req.path.includes('/signup')) {
      const authAction = getAuthAction(req.path, req.method);

      if (authAction) {
        await AuditService.log({
          category: AuditLogCategory.AUTHENTICATION,
          action: authAction,
          resource: 'user',
          details: `Authentication attempt from ${getClientIP(req)}`,
          ipAddress: getClientIP(req),
          userAgent: req.get('User-Agent'),
          outcome: 'SUCCESS' as const, // Will be updated after response
          severity: LogSeverity.INFO,
        }, req);

        // Track auth outcome after response
        const originalSend = res.send;
        res.send = function(data: any) {
          const outcome = res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';
          const severity = outcome === 'SUCCESS' ? LogSeverity.INFO : LogSeverity.WARN;

          AuditService.log({
            category: AuditLogCategory.AUTHENTICATION,
            action: authAction,
            resource: 'user',
            details: `Authentication ${outcome.toLowerCase()} from ${getClientIP(req)}`,
            ipAddress: getClientIP(req),
            userAgent: req.get('User-Agent'),
            outcome,
            severity,
          }, req).catch(console.error);

          return originalSend.call(this, data);
        };
      }
    }

    next();
  };
}

/**
 * Configuration change audit logging
 */
export function configurationAuditMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Log configuration changes
    if (req.path.includes('/admin/') || req.path.includes('/config/') || req.path.includes('/settings/')) {
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        await AuditService.log({
          category: AuditLogCategory.CONFIGURATION,
          action: `config_${req.method.toLowerCase()}`,
          resource: 'configuration',
          resourceId: extractResourceId(req.path),
          details: `Configuration change attempt: ${req.method} ${req.path}`,
          ipAddress: getClientIP(req),
          userAgent: req.get('User-Agent'),
          outcome: 'SUCCESS' as const,
          severity: LogSeverity.WARN,
        }, req);
      }
    }

    next();
  };
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log API call with comprehensive details
 */
async function logApiCall(req: Request, res: Response, requestId: string, duration: number, responseBody: any): Promise<void> {
  const category = determineApiCategory(req.path, req.method);
  const severity = determineSeverity(res.statusCode, duration);
  const outcome = res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';

  // Extract sensitive data from response for logging (be careful with PII)
  const sanitizedResponseBody = sanitizeResponseBody(responseBody, req.path);

  await AuditService.log({
    category,
    action: `${req.method}_${req.path}`,
    resource: extractResource(req.path),
    resourceId: extractResourceId(req.path),
    details: `API call: ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`,
    ipAddress: getClientIP(req),
    userAgent: req.get('User-Agent'),
    sessionId: (req as any).sessionID || req.headers['x-session-id'],
    outcome,
    severity,
    metadata: {
      requestId,
      duration,
      statusCode: res.statusCode,
      requestSize: JSON.stringify(req.body || {}).length,
      responseSize: JSON.stringify(sanitizedResponseBody).length,
      headers: sanitizeHeaders(req.headers),
    },
  }, req);
}

/**
 * Log database operation
 */
async function logDatabaseOperation(
  req: Request,
  operation: string,
  args: any[],
  result: any,
  startTime: number,
  outcome: 'SUCCESS' | 'ERROR',
  errorMessage?: string
): Promise<void> {
  const duration = Date.now() - startTime;
  const severity = outcome === 'ERROR' ? LogSeverity.ERROR : LogSeverity.DEBUG;

  await AuditService.log({
    category: AuditLogCategory.DATA_MODIFICATION,
    action: `db_${operation}`,
    resource: extractDbResource(operation, args),
    resourceId: extractDbResourceId(operation, args),
    details: `Database operation: ${operation} - Duration: ${duration}ms`,
    ipAddress: getClientIP(req),
    userAgent: req.get('User-Agent'),
    outcome,
    errorMessage,
    severity,
    metadata: {
      operation,
      duration,
      argsCount: args.length,
      resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
    },
  }, req);
}

/**
 * Determine audit log category based on API path and method
 */
function determineApiCategory(path: string, method: string): AuditLogCategory {
  if (path.includes('/auth/')) return AuditLogCategory.AUTHENTICATION;
  if (path.includes('/admin/')) return AuditLogCategory.AUTHORIZATION;
  if (path.includes('/api/') && ['POST', 'PUT', 'DELETE'].includes(method)) {
    return AuditLogCategory.DATA_MODIFICATION;
  }
  if (path.includes('/api/')) return AuditLogCategory.API_CALL;
  if (path.includes('/config/') || path.includes('/settings/')) return AuditLogCategory.CONFIGURATION;
  return AuditLogCategory.SYSTEM_EVENT;
}

/**
 * Determine log severity based on status code and duration
 */
function determineSeverity(statusCode: number, duration: number): LogSeverity {
  if (statusCode >= 500) return LogSeverity.CRITICAL;
  if (statusCode >= 400) return LogSeverity.ERROR;
  if (duration > 10000) return LogSeverity.WARN; // Slow requests
  if (statusCode >= 300) return LogSeverity.INFO;
  return LogSeverity.DEBUG;
}

/**
 * Extract resource from API path
 */
function extractResource(path: string): string {
  const pathSegments = path.split('/').filter(Boolean);

  // Extract meaningful resource identifiers
  if (path.includes('/users/')) return 'users';
  if (path.includes('/portfolios/')) return 'portfolios';
  if (path.includes('/transactions/')) return 'transactions';
  if (path.includes('/plugins/')) return 'plugins';
  if (path.includes('/alerts/')) return 'alerts';
  if (path.includes('/strategies/')) return 'strategies';

  return pathSegments[0] || 'unknown';
}

/**
 * Extract resource ID from API path
 */
function extractResourceId(path: string): string | undefined {
  const pathSegments = path.split('/').filter(Boolean);

  // Look for UUID or ID patterns in path
  for (const segment of pathSegments) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
      return segment;
    }
    if (/^\d+$/.test(segment)) {
      return segment;
    }
  }

  return undefined;
}

/**
 * Extract database resource from operation
 */
function extractDbResource(operation: string, args: any[]): string {
  if (operation.includes('users')) return 'users';
  if (operation.includes('portfolios')) return 'portfolios';
  if (operation.includes('transactions')) return 'transactions';
  if (operation.includes('plugins')) return 'plugins';
  if (operation.includes('alerts')) return 'alerts';
  if (operation.includes('audit')) return 'audit_logs';

  return 'unknown';
}

/**
 * Extract database resource ID from operation arguments
 */
function extractDbResourceId(operation: string, args: any[]): string | undefined {
  if (args.length > 0 && args[0] && typeof args[0] === 'object') {
    const firstArg = args[0];
    if (firstArg.where && firstArg.where.id) return firstArg.where.id;
    if (firstArg.data && firstArg.data.id) return firstArg.data.id;
  }

  return undefined;
}

/**
 * Sanitize response body for logging (remove sensitive data)
 */
function sanitizeResponseBody(body: any, path: string): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password', 'passwordHash', 'token', 'secret', 'key',
    'apiKey', 'accessToken', 'refreshToken', 'sessionId'
  ];

  // Remove sensitive fields
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // For auth endpoints, only log basic info
  if (path.includes('/auth/') || path.includes('/login')) {
    return {
      success: sanitized.success || true,
      message: sanitized.message || 'Authentication response',
      userId: sanitized.userId || sanitized.id,
    };
  }

  return sanitized;
}

/**
 * Sanitize headers for logging
 */
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization', 'x-api-key', 'x-access-token', 'cookie',
    'x-auth-token', 'authentication', 'proxy-authorization'
  ];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Determine if database operation should be audited
 */
function shouldAuditDbOperation(operation: string | symbol): boolean {
  const auditedOperations = [
    'create', 'createMany', 'update', 'updateMany', 'upsert',
    'delete', 'deleteMany', 'findUnique', 'findMany'
  ];

  return auditedOperations.includes(operation.toString());
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  ).split(',')[0].trim();
}

/**
 * Get authentication action from request
 */
function getAuthAction(path: string, method: string): string | null {
  if (path.includes('/login') && method === 'POST') return 'user_login';
  if (path.includes('/signup') && method === 'POST') return 'user_signup';
  if (path.includes('/logout') && method === 'POST') return 'user_logout';
  if (path.includes('/refresh') && method === 'POST') return 'token_refresh';
  if (path.includes('/2fa') || path.includes('/mfa')) return 'mfa_action';

  return null;
}