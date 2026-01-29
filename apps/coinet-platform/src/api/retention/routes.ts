/**
 * COINET RETENTION API ROUTES
 * 
 * Handles user retention metrics, engagement tracking, and analytics.
 * Used for understanding user behavior and improving the platform.
 */

import express, { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router: Router = express.Router();

// =============================================================================
// TYPES
// =============================================================================

interface RetentionEvent {
  userId: string;
  eventType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  messagesPerSession: number;
}

// =============================================================================
// IN-MEMORY STORAGE (Replace with database in production)
// =============================================================================

const retentionEvents: RetentionEvent[] = [];
const userSessions = new Map<string, { startTime: Date; messageCount: number }>();

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/retention/event
 * Track a retention event
 */
router.post('/event', async (req: Request, res: Response) => {
  try {
    const { userId, eventType, metadata } = req.body;

    if (!userId || !eventType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId and eventType are required',
      });
    }

    const event: RetentionEvent = {
      userId,
      eventType,
      timestamp: new Date(),
      metadata,
    };

    retentionEvents.push(event);

    // Keep only last 10000 events in memory
    if (retentionEvents.length > 10000) {
      retentionEvents.shift();
    }

    logger.debug('Retention event tracked', { userId, eventType });

    res.json({ success: true, eventId: retentionEvents.length });
  } catch (error) {
    logger.error('Failed to track retention event', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to track event',
    });
  }
});

/**
 * POST /api/retention/session/start
 * Start a user session
 */
router.post('/session/start', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId is required',
      });
    }

    userSessions.set(userId, {
      startTime: new Date(),
      messageCount: 0,
    });

    logger.debug('Session started', { userId });

    res.json({ success: true, sessionStarted: true });
  } catch (error) {
    logger.error('Failed to start session', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to start session',
    });
  }
});

/**
 * POST /api/retention/session/end
 * End a user session
 */
router.post('/session/end', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId is required',
      });
    }

    const session = userSessions.get(userId);
    if (session) {
      const duration = Date.now() - session.startTime.getTime();
      
      // Track session end event
      retentionEvents.push({
        userId,
        eventType: 'session_end',
        timestamp: new Date(),
        metadata: {
          durationMs: duration,
          messageCount: session.messageCount,
        },
      });

      userSessions.delete(userId);
      
      logger.debug('Session ended', { userId, durationMs: duration });
    }

    res.json({ success: true, sessionEnded: true });
  } catch (error) {
    logger.error('Failed to end session', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to end session',
    });
  }
});

/**
 * POST /api/retention/message
 * Track a message in the current session
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId is required',
      });
    }

    const session = userSessions.get(userId);
    if (session) {
      session.messageCount++;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to track message', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to track message',
    });
  }
});

/**
 * GET /api/retention/metrics
 * Get engagement metrics (admin only)
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Calculate unique users in different time windows
    const dailyUsers = new Set<string>();
    const weeklyUsers = new Set<string>();
    const monthlyUsers = new Set<string>();

    for (const event of retentionEvents) {
      const eventTime = event.timestamp.getTime();
      if (eventTime >= monthAgo) {
        monthlyUsers.add(event.userId);
        if (eventTime >= weekAgo) {
          weeklyUsers.add(event.userId);
          if (eventTime >= dayAgo) {
            dailyUsers.add(event.userId);
          }
        }
      }
    }

    // Calculate average session metrics
    const sessionEndEvents = retentionEvents.filter(
      e => e.eventType === 'session_end' && e.metadata?.durationMs
    );

    const avgSessionDuration = sessionEndEvents.length > 0
      ? sessionEndEvents.reduce((sum, e) => sum + (e.metadata?.durationMs || 0), 0) / sessionEndEvents.length
      : 0;

    const avgMessagesPerSession = sessionEndEvents.length > 0
      ? sessionEndEvents.reduce((sum, e) => sum + (e.metadata?.messageCount || 0), 0) / sessionEndEvents.length
      : 0;

    const metrics: EngagementMetrics = {
      dailyActiveUsers: dailyUsers.size,
      weeklyActiveUsers: weeklyUsers.size,
      monthlyActiveUsers: monthlyUsers.size,
      avgSessionDuration: Math.round(avgSessionDuration / 1000), // Convert to seconds
      messagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get retention metrics', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get metrics',
    });
  }
});

/**
 * GET /api/retention/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'retention',
    eventsTracked: retentionEvents.length,
    activeSessions: userSessions.size,
  });
});

/**
 * GET /api/retention/events
 * Get recent events (admin only, for debugging)
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const recentEvents = retentionEvents.slice(-limit);

    res.json({
      total: retentionEvents.length,
      returned: recentEvents.length,
      events: recentEvents,
    });
  } catch (error) {
    logger.error('Failed to get retention events', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get events',
    });
  }
});

export default router;
