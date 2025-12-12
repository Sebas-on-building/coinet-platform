/**
 * 🛣️ Chat API Routes
 * 
 * Divine route definitions for chat API endpoints.
 */

import express, { Router, Request, Response } from 'express';
import { chatController } from './controller';
import { chatStreamingController } from './streaming';

const router: Router = express.Router();

/**
 * POST /api/chat/message
 * Send a message and get AI response
 */
router.post('/message', (req: Request, res: Response) => {
  chatController.sendMessage(req, res);
});

/**
 * POST /api/chat/stream
 * Stream chat response using Server-Sent Events (SSE)
 */
router.post('/stream', (req: Request, res: Response) => {
  chatStreamingController.streamMessage(req, res);
});

/**
 * GET /api/chat/history/:conversationId
 * Get conversation history
 */
router.get('/history/:conversationId', (req: Request, res: Response) => {
  chatController.getHistory(req, res);
});

/**
 * DELETE /api/chat/message/:messageId
 * Delete a message
 * Query params: conversationId
 */
router.delete('/message/:messageId', (req: Request, res: Response) => {
  chatController.deleteMessage(req, res);
});

/**
 * POST /api/chat/regenerate
 * Regenerate an assistant message
 */
router.post('/regenerate', (req: Request, res: Response) => {
  chatController.regenerate(req, res);
});

export default router;

