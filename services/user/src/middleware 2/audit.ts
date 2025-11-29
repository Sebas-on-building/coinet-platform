/**
 * Audit Middleware - Fixed for Coinet User Service
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  defaultMeta: { service: 'audit-middleware' }
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  id?: string;
}

export const auditMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip audit logging for health checks and metrics
  const skipPaths = ['/health', '/metrics', '/favicon.ico'];
  if (skipPaths.some(path => req.path.includes(path))) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const userId = req.user?.id;
      
      // Log significant actions
      if (shouldLogAction(req.method, req.path, res.statusCode)) {
        logger.info('User action', {
          userId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          requestId: req.id,
          ip: getClientIP(req),
          userAgent: req.get('User-Agent')
        });
      }
    } catch (error) {
      logger.error('Audit logging failed:', error);
    }
  });

  next();
};

function shouldLogAction(method: string, path: string, statusCode: number): boolean {
  // Always log authentication actions
  if (path.includes('/auth/')) return true;
  
  // Always log admin actions
  if (path.includes('/admin/')) return true;
  
  // Log failed requests
  if (statusCode >= 400) return true;
  
  // Log data modification actions
  if (['POST', 'PUT', 'DELETE'].includes(method)) return true;
  
  // Skip routine health checks
  if (path.includes('/health') || path.includes('/metrics')) return false;
  
  return false;
}

function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  ).split(',')[0].trim();
}

export default auditMiddleware;