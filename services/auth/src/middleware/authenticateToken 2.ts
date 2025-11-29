import { Request, Response, NextFunction } from 'express';
import { authService } from '../../../../src/lib/auth/AuthService';
import { AuthError } from '../../../../src/lib/errors/ErrorManager';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  authService.verifyAccessToken(token)
    .then(payload => {
      (req as any).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId
      };

      // Update session activity if session exists
      if (payload.sessionId) {
        authService.updateSessionActivity(payload.sessionId);
      }

      next();
    })
    .catch(error => {
      if (error instanceof AuthError) {
        switch (error.code) {
          case 'TOKEN_EXPIRED':
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
          case 'INVALID_TOKEN':
            return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
          case 'SESSION_EXPIRED':
            return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
          default:
            return res.status(401).json({ error: 'Authentication failed', code: error.code });
        }
      }
      return res.status(500).json({ error: 'Internal server error' });
    });
} 