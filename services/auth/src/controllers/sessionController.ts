import { Request, Response } from 'express';
import { authService } from '../../../../src/lib/auth/AuthService';
import { ServiceError } from '../../../../src/lib/errors/ErrorManager';

export async function listSessions(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all sessions for the user
    const sessions = authService.getUserSessions(user.id);

    // Format sessions for response
    const formattedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      deviceInfo: {
        ip: session.deviceInfo.ip,
        userAgent: session.deviceInfo.userAgent,
        fingerprint: session.deviceInfo.fingerprint
      },
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isCurrentSession: session.sessionId === user.sessionId
    }));

    res.json({
      sessions: formattedSessions,
      totalSessions: formattedSessions.length
    });

  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function revokeSession(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Prevent users from revoking their own current session
    if (sessionId === user.sessionId) {
      return res.status(400).json({
        error: 'Cannot revoke current session. Use logout instead.'
      });
    }

    // Verify the session belongs to the user
    const sessions = authService.getUserSessions(user.id);
    const sessionToRevoke = sessions.find(s => s.sessionId === sessionId);

    if (!sessionToRevoke) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Revoke the session
    authService.revokeSession(sessionId);

    // Log the auth event
    authService.logAuthEvent('session_revoked', user.id, {
      revokedSessionId: sessionId,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    });

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });

  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function revokeAllSessions(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all sessions for the user
    const sessions = authService.getUserSessions(user.id);

    // Revoke all sessions except the current one
    const revokedCount = sessions.filter(session => {
      if (session.sessionId !== user.sessionId) {
        authService.revokeSession(session.sessionId);
        return true;
      }
      return false;
    }).length;

    // Log the auth event
    authService.logAuthEvent('all_sessions_revoked', user.id, {
      revokedCount,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    });

    res.json({
      success: true,
      message: `${revokedCount} sessions revoked successfully`,
      revokedCount
    });

  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSessionInfo(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;
    const sessions = authService.getUserSessions(user.id);
    const session = sessions.find(s => s.sessionId === sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isCurrentSession: session.sessionId === user.sessionId
    });

  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
} 