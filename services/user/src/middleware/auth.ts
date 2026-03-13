/**
 * Authentication Middleware - Industry-Leading Security
 * JWT verification, session management, and security checks
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createLogger } from 'winston';
import { getJwtSecret } from '../getJwtSecret';

const prisma = new PrismaClient();
const logger = createLogger({
  level: 'info',
  defaultMeta: { service: 'auth-middleware' }
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier?: string;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tier?: string;
  iat: number;
  exp: number;
}

export const authMiddleware = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        token, 
        getJwtSecret()
      ) as JWTPayload;
    } catch (jwtError) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'The access token is invalid or expired'
      });
      return;
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        tier: true,
        active: true,
        metadata: true
      }
    });

    // Check user status using metadata
    const isDeleted = user.metadata?.isDeleted || false;
    const isSuspended = user.metadata?.isSuspended || false;
    const lockedUntil = user.metadata?.lockedUntil ? new Date(user.metadata.lockedUntil) : null;

    if (!user || isDeleted) {
      res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
      return;
    }

    if (!user.active) {
      res.status(423).json({
        error: 'Account inactive',
        message: 'Your account is inactive. Please contact support.'
      });
      return;
    }

    if (isSuspended) {
      res.status(423).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.'
      });
      return;
    }

    if (lockedUntil && lockedUntil > new Date()) {
      res.status(423).json({
        error: 'Account locked',
        message: 'Your account is temporarily locked',
        lockedUntil: lockedUntil
      });
      return;
    }

    // Check session validity
    const session = await prisma.session.findFirst({
      where: {
        userId: user.id,
        token,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      res.status(401).json({
        error: 'Invalid session',
        message: 'Your session has expired. Please log in again.'
      });
      return;
    }

    // Update session activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier
    };

    // Log API access for audit
    if (req.path !== '/health' && req.path !== '/metrics') {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'API_ACCESS',
          details: JSON.stringify({
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent')
          }),
          ipAddress: req.ip || 'unknown'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole
      });
      return;
    }

    next();
  };
};

/**
 * Tier-based authorization middleware
 */
export const requireTier = (tiers: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userTier = req.user?.tier;
    const allowedTiers = Array.isArray(tiers) ? tiers : [tiers];

    if (!userTier || !allowedTiers.includes(userTier)) {
      res.status(403).json({
        error: 'Upgrade Required',
        message: 'This feature requires a higher tier subscription',
        requiredTiers: allowedTiers,
        userTier
      });
      return;
    }

    next();
  };
};

/**
 * API Key authentication middleware
 */
export const apiKeyAuth = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key in the X-API-Key header'
      });
      return;
    }

    // Find and verify API key
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            tier: true,
            active: true,
            metadata: true
          }
        }
      }
    });

    let validApiKey = null;
    for (const key of apiKeys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid) {
        validApiKey = key;
        break;
      }
    }

    const userSuspended = validApiKey?.user.metadata?.isSuspended || false;
    if (!validApiKey || !validApiKey.user.active || userSuspended) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or expired'
      });
      return;
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: validApiKey.id },
      data: { lastUsed: new Date() }
    });

    // Attach user to request
    req.user = {
      id: validApiKey.user.id,
      email: validApiKey.user.email,
      role: validApiKey.user.role,
      tier: validApiKey.user.tier
    };

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during API key authentication'
    });
  }
};
