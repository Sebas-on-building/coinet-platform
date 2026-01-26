/**
 * RLHF Feedback Controller
 */

import { Request, Response } from 'express';
import { feedbackService } from './service';
import { logger } from '../../utils/logger';
import { FeedbackType, FeedbackCategory, FeedbackSeverity } from '@prisma/client';

export class FeedbackController {
  /**
   * POST /api/feedback/submit
   * Submit feedback on an AI message
   */
  async submitFeedback(req: Request, res: Response) {
    try {
      const { messageId, type, category, severity, reason, context, responseMetadata } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!messageId || !type) {
        return res.status(400).json({ error: 'messageId and type are required' });
      }

      // Validate type
      if (!Object.values(FeedbackType).includes(type)) {
        return res.status(400).json({ error: 'Invalid feedback type' });
      }

      const result = await feedbackService.submitFeedback({
        messageId,
        userId,
        type,
        category,
        severity,
        reason,
        context,
        responseMetadata,
      });

      res.json(result);
    } catch (error) {
      logger.error('❌ Feedback submission failed', { error });
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  }

  /**
   * GET /api/feedback/analytics
   * Get feedback analytics (admin only)
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Check if user is admin
      if (!userId || userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const timeRange = (req.query.range as '24h' | '7d' | '30d' | 'all') || '7d';
      const analytics = await feedbackService.getAnalytics(timeRange);

      res.json(analytics);
    } catch (error) {
      logger.error('❌ Failed to get analytics', { error });
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }

  /**
   * GET /api/feedback/training-pairs
   * Get training pairs for RLHF (admin only)
   */
  async getTrainingPairs(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const trainingPairs = await feedbackService.generateTrainingPairs();

      res.json(trainingPairs);
    } catch (error) {
      logger.error('❌ Failed to generate training pairs', { error });
      res.status(500).json({ error: 'Failed to generate training pairs' });
    }
  }

  /**
   * GET /api/feedback/negative-examples
   * Get negative feedback examples for analysis (admin only)
   */
  async getNegativeExamples(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const examples = await feedbackService.getNegativeFeedbackExamples(limit);

      res.json({ examples, count: examples.length });
    } catch (error) {
      logger.error('❌ Failed to get negative examples', { error });
      res.status(500).json({ error: 'Failed to retrieve examples' });
    }
  }

  /**
   * GET /api/feedback/positive-examples
   * Get positive feedback examples for reinforcement (admin only)
   */
  async getPositiveExamples(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const examples = await feedbackService.getPositiveFeedbackExamples(limit);

      res.json({ examples, count: examples.length });
    } catch (error) {
      logger.error('❌ Failed to get positive examples', { error });
      res.status(500).json({ error: 'Failed to retrieve examples' });
    }
  }
}

export const feedbackController = new FeedbackController();
