/**
 * COINET FEEDBACK API ROUTES
 * 
 * RLHF (Reinforcement Learning from Human Feedback) system
 * Collects user feedback to improve AI responses and platform quality.
 */

import express, { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { prisma } from '../../db/client';

const router: Router = express.Router();

// =============================================================================
// TYPES
// =============================================================================

interface FeedbackSubmission {
  alertId?: string;
  satisfactionScore: number; // 1-5
  category: string; // "HELPFUL", "TOO_LATE", "INACCURATE", "TOO_EARLY", "MISLEADING", etc.
  subcategories?: string[];
  comment?: string;
  alertTriggerId?: string;
  metadata?: Record<string, any>;
  feedbackChannel?: string;
  feedbackMethod?: string;
  solicited?: boolean;
}

interface ChatFeedbackSubmission {
  messageId?: string;
  conversationId?: string;
  satisfactionScore: number;
  category: string;
  comment?: string;
  helpfulness?: number;
  accuracy?: number;
  relevance?: number;
  metadata?: Record<string, any>;
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/feedback
 * Submit user feedback (for alerts or general feedback)
 */
router.post('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const feedback = req.body as FeedbackSubmission;

    // Validate required fields
    if (!feedback.satisfactionScore || feedback.satisfactionScore < 1 || feedback.satisfactionScore > 5) {
      return res.status(400).json({
        error: 'Invalid satisfaction score',
        message: 'satisfactionScore must be between 1 and 5',
      });
    }

    if (!feedback.category) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'category is required',
      });
    }

    // Get user ID from auth or request
    const userId = authReq.user?.id || req.body.userId || `anonymous_${Date.now()}`;

    // If alertId is provided, validate it exists
    if (feedback.alertId) {
      const alert = await prisma.alert.findUnique({
        where: { id: feedback.alertId },
      });

      if (!alert) {
        return res.status(404).json({
          error: 'Alert not found',
          message: `Alert with id ${feedback.alertId} does not exist`,
        });
      }
    }

    // Calculate comment length
    const commentLength = feedback.comment ? feedback.comment.length : null;

    // Create feedback entry
    const feedbackData: any = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId,
      tenantId: 'default',
      satisfactionScore: feedback.satisfactionScore,
      category: feedback.category,
      subcategories: feedback.subcategories || [],
      comment: feedback.comment || null,
      commentLength,
      feedbackChannel: feedback.feedbackChannel || 'in_app',
      feedbackMethod: feedback.feedbackMethod || 'rating',
      solicited: feedback.solicited || false,
      isAnonymous: !authReq.user,
      gdprConsent: true,
      metadata: feedback.metadata || {},
      feedbackTime: new Date(),
      alertTime: feedback.alertId ? new Date() : new Date(), // Would need to fetch actual alert time
      processed: false,
    };

    // Add alert-related fields if provided
    if (feedback.alertId) {
      feedbackData.alertId = feedback.alertId;
    }

    if (feedback.alertTriggerId) {
      feedbackData.alertTriggerId = feedback.alertTriggerId;
    }

    // Save to database (using Prisma)
    try {
      const createdFeedback = await prisma.userFeedback.create({
        data: feedbackData,
      });

      logger.info('Feedback submitted', {
        feedbackId: createdFeedback.id,
        userId,
        category: feedback.category,
        score: feedback.satisfactionScore,
      });

      res.status(201).json({
        success: true,
        feedbackId: createdFeedback.id,
        message: 'Feedback submitted successfully',
      });
    } catch (dbError: any) {
      // If database save fails, still log the feedback for analysis
      logger.error('Failed to save feedback to database', {
        error: dbError.message,
        feedback: feedbackData,
      });

      // Return success but log the error
      res.status(201).json({
        success: true,
        feedbackId: feedbackData.id,
        message: 'Feedback received (may not be persisted)',
        warning: 'Database save failed, but feedback was logged',
      });
    }
  } catch (error: any) {
    logger.error('Failed to submit feedback', { error: error.message });
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: 'Unable to process feedback submission',
    });
  }
});

/**
 * POST /api/feedback/chat
 * Submit feedback for chat/AI responses
 */
router.post('/chat', optionalAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const feedback = req.body as ChatFeedbackSubmission;

    // Validate required fields
    if (!feedback.satisfactionScore || feedback.satisfactionScore < 1 || feedback.satisfactionScore > 5) {
      return res.status(400).json({
        error: 'Invalid satisfaction score',
        message: 'satisfactionScore must be between 1 and 5',
      });
    }

    if (!feedback.category) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'category is required',
      });
    }

    const userId = authReq.user?.id || req.body.userId || `anonymous_${Date.now()}`;

    // Store chat feedback (could be stored separately or in metadata)
    const feedbackData = {
      id: `chat_feedback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId,
      satisfactionScore: feedback.satisfactionScore,
      category: feedback.category,
      comment: feedback.comment,
      metadata: {
        ...feedback.metadata,
        messageId: feedback.messageId,
        conversationId: feedback.conversationId,
        helpfulness: feedback.helpfulness,
        accuracy: feedback.accuracy,
        relevance: feedback.relevance,
        type: 'chat',
      },
      timestamp: new Date(),
    };

    logger.info('Chat feedback submitted', {
      feedbackId: feedbackData.id,
      userId,
      category: feedback.category,
      score: feedback.satisfactionScore,
    });

    // In production, you might want to store this in a separate table or queue
    // For now, we'll just log it
    res.status(201).json({
      success: true,
      feedbackId: feedbackData.id,
      message: 'Chat feedback submitted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to submit chat feedback', { error: error.message });
    res.status(500).json({
      error: 'Failed to submit chat feedback',
      message: 'Unable to process feedback submission',
    });
  }
});

/**
 * GET /api/feedback
 * Get user's feedback history
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const feedback = await prisma.userFeedback.findMany({
      where: {
        userId: authReq.user.id,
      },
      orderBy: {
        feedbackTime: 'desc',
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        satisfactionScore: true,
        category: true,
        comment: true,
        feedbackTime: true,
        alertId: true,
        metadata: true,
      },
    });

    res.json({
      feedback,
      total: feedback.length,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error('Failed to get feedback', { error: error.message });
    res.status(500).json({
      error: 'Failed to get feedback',
      message: 'Unable to retrieve feedback history',
    });
  }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics for the user
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const feedback = await prisma.userFeedback.findMany({
      where: {
        userId: authReq.user.id,
      },
      select: {
        satisfactionScore: true,
        category: true,
        feedbackTime: true,
      },
    });

    const total = feedback.length;
    const avgScore = total > 0
      ? feedback.reduce((sum, f) => sum + f.satisfactionScore, 0) / total
      : 0;

    const categoryCounts: Record<string, number> = {};
    feedback.forEach(f => {
      categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    });

    res.json({
      total,
      averageScore: Math.round(avgScore * 10) / 10,
      categoryBreakdown: categoryCounts,
      recentCount: feedback.filter(f => {
        const daysAgo = (Date.now() - f.feedbackTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
      }).length,
    });
  } catch (error: any) {
    logger.error('Failed to get feedback stats', { error: error.message });
    res.status(500).json({
      error: 'Failed to get feedback stats',
      message: 'Unable to retrieve feedback statistics',
    });
  }
});

/**
 * GET /api/feedback/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'feedback',
    version: '1.0.0',
  });
});

export default router;
