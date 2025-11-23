// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import Redis from 'ioredis';
import { SecretManager } from '../src/lib/security/SecretManager';
import { Logger } from '../src/lib/logging/Logger';
import { MetricsCollector } from '../src/lib/metrics/MetricsCollector';
import { InputValidator } from '../src/lib/validation/InputValidator';

const logger = Logger.getInstance();
const metrics = MetricsCollector.getInstance();
const secretManager = SecretManager.getInstance();

let redisClient: Redis;
let jwtSecret: string | null = null;

// Initialize Redis client
async function initializeRedis() {
  const redisUrl = await secretManager.getSecret('REDIS_URL', {
    source: 'env',
    required: true
  });

  redisClient = new Redis(redisUrl);

  redisClient.on('error', (err: Error) => {
    logger.error('Redis client error', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  await redisClient.connect();
}

// Initialize JWT secret
async function getJWTSecret(): Promise<string> {
  if (!jwtSecret) {
    jwtSecret = await secretManager.getSecret('JWT_SECRET', {
      source: 'env',
      required: true,
      minLength: 64
    });
  }
  return jwtSecret;
}

// Initialize on module load
initializeRedis().catch(err => {
  logger.error('Failed to initialize Redis', { error: err.message });
});

export async function authenticateJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();

  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      metrics.incrementCounter('auth_failures', { reason: 'missing_header' });
      res.status(401).json({
        error: 'Missing or invalid Authorization header',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Basic token validation
    if (!token || token.length < 10) {
      metrics.incrementCounter('auth_failures', { reason: 'invalid_token_format' });
      res.status(401).json({
        error: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Verify JWT token
    const secret = await getJWTSecret();
    const payload = jwt.verify(token, secret, {
      issuer: 'coinet-platform',
      audience: 'coinet-users',
      algorithms: ['HS256']
    }) as JwtPayload;

    // Validate payload structure
    if (!payload.sub || !payload.userId) {
      metrics.incrementCounter('auth_failures', { reason: 'invalid_payload' });
      res.status(401).json({
        error: 'Invalid token payload',
        code: 'INVALID_PAYLOAD'
      });
      return;
    }

    // Check if user session exists in Redis
    if (redisClient) {
      try {
        const sessionKey = `session:${payload.sub}`;
        const session = await redisClient.get(sessionKey);

        if (!session) {
          metrics.incrementCounter('auth_failures', { reason: 'session_expired' });
          res.status(401).json({
            error: 'Session expired or invalid',
            code: 'SESSION_EXPIRED'
          });
          return;
        }

        // Update session activity
        await redisClient.setEx(sessionKey, 3600, session); // Extend for 1 hour
      } catch (redisError) {
        const errorMessage = redisError instanceof Error ? redisError.message : String(redisError);
        logger.warn('Redis session check failed, proceeding without session validation', {
          error: errorMessage,
          userId: payload.userId
        });
      }
    }

    // Attach user info to request
    (req as any).user = {
      id: payload.userId,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
      sessionId: payload.sessionId
    };

    // Log successful authentication
    logger.debug('User authenticated successfully', {
      userId: payload.userId,
      email: payload.email,
      sessionId: payload.sessionId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const duration = Date.now() - startTime;
    metrics.recordHistogram('auth_duration', duration);
    metrics.incrementCounter('auth_successes');

    next();

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    metrics.recordHistogram('auth_duration', duration);

    if (error instanceof jwt.JsonWebTokenError) {
      metrics.incrementCounter('auth_failures', { reason: 'jwt_error' });
      logger.warn('JWT verification failed', {
        error: error.message,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      metrics.incrementCounter('auth_failures', { reason: 'token_expired' });
      res.status(401).json({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      metrics.incrementCounter('auth_failures', { reason: 'unknown' });
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      logger.error('Authentication error', {
        error: errorMessage,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(500).json({
        error: 'Internal server error',
        code: 'AUTH_ERROR'
      });
    }
  }
}

// Optional: Role-based authentication middleware
export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    if (user.role !== requiredRole && user.role !== 'admin') {
      metrics.incrementCounter('authorization_failures', {
        requiredRole,
        userRole: user.role
      });

      return res.status(403).json({
        error: `Insufficient permissions. Required role: ${requiredRole}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}

// Optional: Permission-based authentication middleware
export function requirePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const hasPermission = user.permissions?.includes(requiredPermission) || user.role === 'admin';

    if (!hasPermission) {
      metrics.incrementCounter('authorization_failures', {
        requiredPermission,
        userPermissions: user.permissions
      });

      return res.status(403).json({
        error: `Insufficient permissions. Required permission: ${requiredPermission}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}

// Cleanup function
export async function closeConnections(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
  }
} 