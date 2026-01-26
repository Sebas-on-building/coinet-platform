/**
 * RLHF Feedback Routes
 */

import { Router } from 'express';
import { feedbackController } from './controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/feedback/submit
 * Submit feedback on an AI message
 */
router.post('/submit', (req, res) => feedbackController.submitFeedback(req, res));

/**
 * GET /api/feedback/analytics
 * Get feedback analytics (admin only)
 */
router.get('/analytics', (req, res) => feedbackController.getAnalytics(req, res));

/**
 * GET /api/feedback/training-pairs
 * Generate training pairs for RLHF (admin only)
 */
router.get('/training-pairs', (req, res) => feedbackController.getTrainingPairs(req, res));

/**
 * GET /api/feedback/negative-examples
 * Get negative feedback examples (admin only)
 */
router.get('/negative-examples', (req, res) => feedbackController.getNegativeExamples(req, res));

/**
 * GET /api/feedback/positive-examples
 * Get positive feedback examples (admin only)
 */
router.get('/positive-examples', (req, res) => feedbackController.getPositiveExamples(req, res));

export default router;
