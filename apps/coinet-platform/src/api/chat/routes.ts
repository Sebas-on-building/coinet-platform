/**
 * 🛣️ Chat API Routes
 * 
 * Protected route definitions for chat API endpoints.
 * All routes require authentication via JWT token.
 * Rate limited to prevent abuse.
 */

import express, { Router, Request, Response } from 'express';
import { chatController } from './controller';
import { chatStreamingController } from './streaming';
import { requireAuth } from '../../middleware/requireAuth';
import { 
  chatMessageRateLimit, 
  chatStreamRateLimit 
} from '../../middleware/rateLimit';

const router: Router = express.Router();

// =============================================================================
// Apply authentication middleware to all chat routes
// =============================================================================
router.use(requireAuth);

// =============================================================================
// CONVERSATION MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/chat/conversations
 * List all conversations for the authenticated user
 * 
 * Query params:
 * - limit: number (default 50)
 * - offset: number (default 0)
 * - includeArchived: boolean (default false)
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.get('/conversations', (req: Request, res: Response) => {
  chatController.listConversations(req, res);
});

/**
 * POST /api/chat/conversations
 * Create a new empty conversation
 * 
 * Body:
 * - title?: string
 * - agentId?: string
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.post('/conversations', (req: Request, res: Response) => {
  chatController.createConversation(req, res);
});

/**
 * DELETE /api/chat/conversations
 * Clear ALL conversations for the user (dangerous!)
 * 
 * Body:
 * - confirm: "DELETE_ALL_CONVERSATIONS" (required)
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.delete('/conversations', (req: Request, res: Response) => {
  chatController.clearAllConversations(req, res);
});

/**
 * DELETE /api/chat/conversations/:conversationId
 * Delete a single conversation and all its messages
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.delete('/conversations/:conversationId', (req: Request, res: Response) => {
  chatController.deleteConversation(req, res);
});

/**
 * PATCH /api/chat/conversations/:conversationId
 * Update a conversation (title, archive status)
 * 
 * Body:
 * - title?: string
 * - archived?: boolean
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.patch('/conversations/:conversationId', (req: Request, res: Response) => {
  chatController.updateConversation(req, res);
});

/**
 * POST /api/chat/conversations/:conversationId/archive
 * Archive/unarchive a conversation
 * 
 * Body:
 * - archive?: boolean (default true)
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.post('/conversations/:conversationId/archive', (req: Request, res: Response) => {
  chatController.archiveConversation(req, res);
});

// =============================================================================
// CHAT MESSAGE ENDPOINTS
// =============================================================================

/**
 * POST /api/chat/message
 * Send a message and get AI response
 * 
 * @requires Authentication (JWT token in Authorization header)
 * @rateLimit 60 requests per minute per user
 */
router.post('/message', chatMessageRateLimit, (req: Request, res: Response) => {
  chatController.sendMessage(req, res);
});

/**
 * POST /api/chat/stream
 * Stream chat response using Server-Sent Events (SSE)
 * 
 * @requires Authentication (JWT token in Authorization header)
 * @rateLimit 30 requests per minute per user
 */
router.post('/stream', chatStreamRateLimit, (req: Request, res: Response) => {
  chatStreamingController.streamMessage(req, res);
});

/**
 * GET /api/chat/history/:conversationId
 * Get conversation history
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.get('/history/:conversationId', (req: Request, res: Response) => {
  chatController.getHistory(req, res);
});

/**
 * DELETE /api/chat/message/:messageId
 * Delete a message
 * Query params: conversationId
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.delete('/message/:messageId', (req: Request, res: Response) => {
  chatController.deleteMessage(req, res);
});

/**
 * POST /api/chat/regenerate
 * Regenerate an assistant message
 * 
 * @requires Authentication (JWT token in Authorization header)
 */
router.post('/regenerate', (req: Request, res: Response) => {
  chatController.regenerate(req, res);
});

export default router;
