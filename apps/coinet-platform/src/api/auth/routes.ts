/**
 * COINET AUTH API ROUTES
 * 
 * Handles authentication, session management, and user verification.
 * Supports JWT tokens, API keys, and session-based auth.
 */

import express, { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../../middleware/requireAuth';

const router: Router = express.Router();

// =============================================================================
// TYPES
// =============================================================================

interface LoginRequest {
  email?: string;
  password?: string;
  provider?: 'email' | 'google' | 'github' | 'clerk';
  token?: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  roles: string[];
  exp: number;
  iat: number;
}

interface SessionInfo {
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}

// =============================================================================
// IN-MEMORY STORAGE (Replace with database/Redis in production)
// =============================================================================

const activeSessions = new Map<string, SessionInfo>();
const apiKeys = new Map<string, { userId: string; name: string; createdAt: Date }>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateToken(): string {
  return `coi_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, provider, token } = req.body as LoginRequest;

    // For Clerk integration, validate the token
    if (provider === 'clerk' && token) {
      // In production, verify token with Clerk SDK
      logger.info('Clerk login attempt', { email });
      
      const sessionId = generateSessionId();
      const session: SessionInfo = {
        userId: `user_${Date.now()}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        lastActivity: new Date(),
      };
      
      activeSessions.set(sessionId, session);
      
      return res.json({
        success: true,
        sessionId,
        expiresAt: session.expiresAt,
        user: {
          id: session.userId,
          email,
          tier: 'free',
        },
      });
    }

    // Basic email/password login (for development)
    if (email && password) {
      // In production, verify credentials against database
      logger.info('Email login attempt', { email });
      
      const sessionId = generateSessionId();
      const session: SessionInfo = {
        userId: `user_${Date.now()}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastActivity: new Date(),
      };
      
      activeSessions.set(sessionId, session);
      
      return res.json({
        success: true,
        sessionId,
        expiresAt: session.expiresAt,
        user: {
          id: session.userId,
          email,
          tier: 'free',
        },
      });
    }

    return res.status(400).json({
      error: 'Invalid login request',
      message: 'Provide email/password or provider token',
    });
  } catch (error) {
    logger.error('Login failed', { error });
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Unable to process login request',
    });
  }
});

/**
 * POST /api/auth/logout
 * End user session
 */
router.post('/logout', optionalAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const sessionId = req.headers['x-session-id'] as string;
    
    if (sessionId && activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
      logger.info('Session ended', { sessionId, userId: authReq.user?.id });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout failed', { error });
    res.status(500).json({
      error: 'Logout failed',
      message: 'Unable to end session',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    res.json({
      user: {
        id: authReq.user.id,
        email: authReq.user.email,
        tier: authReq.user.tier,
        role: authReq.user.role,
      },
    });
  } catch (error) {
    logger.error('Failed to get user info', { error });
    res.status(500).json({
      error: 'Failed to get user info',
      message: 'Unable to retrieve user data',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh session or token
 */
router.post('/refresh', optionalAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (sessionId && activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId)!;
      session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      session.lastActivity = new Date();
      
      return res.json({
        success: true,
        expiresAt: session.expiresAt,
      });
    }

    res.status(401).json({
      error: 'Invalid session',
      message: 'Session not found or expired',
    });
  } catch (error) {
    logger.error('Token refresh failed', { error });
    res.status(500).json({
      error: 'Refresh failed',
      message: 'Unable to refresh session',
    });
  }
});

/**
 * POST /api/auth/api-key
 * Generate a new API key for the user
 */
router.post('/api-key', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'API key name is required',
      });
    }

    const apiKey = generateToken();
    apiKeys.set(apiKey, {
      userId: authReq.user.id,
      name,
      createdAt: new Date(),
    });

    logger.info('API key created', { userId: authReq.user.id, name });

    res.json({
      success: true,
      apiKey,
      name,
      createdAt: new Date(),
      // Only show the key once
      warning: 'Store this key securely. It will not be shown again.',
    });
  } catch (error) {
    logger.error('API key creation failed', { error });
    res.status(500).json({
      error: 'Failed to create API key',
      message: 'Unable to generate new API key',
    });
  }
});

/**
 * DELETE /api/auth/api-key/:key
 * Revoke an API key
 */
router.delete('/api-key/:key', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { key } = req.params;

    const keyInfo = apiKeys.get(key);
    if (!keyInfo) {
      return res.status(404).json({
        error: 'API key not found',
        message: 'The specified API key does not exist',
      });
    }

    if (keyInfo.userId !== authReq.user.id) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You cannot revoke this API key',
      });
    }

    apiKeys.delete(key);
    logger.info('API key revoked', { userId: authReq.user.id, keyName: keyInfo.name });

    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    logger.error('API key revocation failed', { error });
    res.status(500).json({
      error: 'Failed to revoke API key',
      message: 'Unable to delete API key',
    });
  }
});

/**
 * GET /api/auth/api-keys
 * List user's API keys (without showing the actual keys)
 */
router.get('/api-keys', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    const userKeys: Array<{ name: string; createdAt: Date; prefix: string }> = [];
    
    apiKeys.forEach((value, key) => {
      if (value.userId === authReq.user.id) {
        userKeys.push({
          name: value.name,
          createdAt: value.createdAt,
          prefix: key.substring(0, 8) + '...',
        });
      }
    });

    res.json({ keys: userKeys });
  } catch (error) {
    logger.error('Failed to list API keys', { error });
    res.status(500).json({
      error: 'Failed to list API keys',
      message: 'Unable to retrieve API keys',
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify a token or session
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token, sessionId } = req.body;

    if (sessionId && activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId)!;
      
      if (session.expiresAt > new Date()) {
        return res.json({
          valid: true,
          userId: session.userId,
          expiresAt: session.expiresAt,
        });
      }
      
      // Session expired, clean up
      activeSessions.delete(sessionId);
    }

    if (token && apiKeys.has(token)) {
      const keyInfo = apiKeys.get(token)!;
      return res.json({
        valid: true,
        userId: keyInfo.userId,
        type: 'api_key',
      });
    }

    res.json({ valid: false });
  } catch (error) {
    logger.error('Token verification failed', { error });
    res.status(500).json({
      error: 'Verification failed',
      message: 'Unable to verify token',
    });
  }
});

/**
 * GET /api/auth/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'auth',
    activeSessions: activeSessions.size,
    apiKeys: apiKeys.size,
  });
});

export default router;
