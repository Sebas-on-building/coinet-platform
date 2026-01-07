/**
 * 🎮 Chat Controller - Request Handlers
 * 
 * Controller that handles HTTP requests with
 * validation, error handling, and response formatting.
 * 
 * All handlers expect authenticated requests (req.auth is set by requireAuth middleware).
 */

import { Request, Response } from 'express';
import { chatService } from './service';
import { logger } from '../../utils/logger';
import {
  ChatMessageRequest,
  ChatMessageResponse,
  ConversationHistoryResponse,
  RegenerateMessageRequest,
} from './types';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/requireAuth';

// Request validation schemas
const ChatMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  agentId: z.string().optional(),
  context: z.object({
    includeSources: z.boolean().optional(),
    includeCharts: z.boolean().optional(),
    analysisDepth: z.enum(['quick', 'standard', 'deep']).optional(),
  }).optional(),
});

const RegenerateMessageSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
});

/**
 * Get userId from authenticated request.
 * Throws if request is not authenticated.
 */
function getUserId(req: Request): string {
  const auth = (req as AuthenticatedRequest).auth;
  
  if (!auth?.userId) {
    // This should never happen if requireAuth middleware is applied
    throw new Error('Request is not authenticated');
  }
  
  return auth.userId;
}

/**
 * Get requestId from request.
 */
function getRequestId(req: Request): string {
  return (req as any).requestId || 'unknown';
}

export class ChatController {
  /**
   * POST /api/chat/message
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    try {
      // Get authenticated user ID (no more anonymous fallback)
      const userId = getUserId(req);

      // Validate request
      const validationResult = ChatMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request format',
            details: validationResult.error.errors,
          },
          requestId,
        });
        return;
      }

      // Type assertion is safe here because Zod validated the data
      const request = validationResult.data as ChatMessageRequest;

      // Process message
      const response = await chatService.sendMessage(userId, request);

      const processingTime = Date.now() - startTime;
      logger.info('✅ Chat message sent', {
        requestId,
        userId,
        conversationId: response.data.conversationId,
        processingTime,
      });

      res.status(200).json(response);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Chat message failed', error, { requestId, processingTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process chat message',
        },
        metadata: {
          processingTime,
        },
        requestId,
      });
    }
  }

  /**
   * GET /api/chat/history/:conversationId
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    const requestId = getRequestId(req);

    try {
      const userId = getUserId(req);
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'conversationId is required',
          },
          requestId,
        });
        return;
      }

      const response = await chatService.getConversationHistory(userId, conversationId);

      res.status(200).json(response);
    } catch (error) {
      logger.error('❌ Failed to get conversation history', error, { requestId });

      // Check for authorization errors (user doesn't own conversation)
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this conversation',
          },
          requestId,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'HISTORY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get conversation history',
        },
        requestId,
      });
    }
  }

  /**
   * DELETE /api/chat/message/:messageId
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    const requestId = getRequestId(req);

    try {
      const userId = getUserId(req);
      const { messageId } = req.params;
      const conversationId = req.query.conversationId as string;

      if (!messageId || !conversationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'messageId and conversationId are required',
          },
          requestId,
        });
        return;
      }

      const response = await chatService.deleteMessage(userId, conversationId, messageId);

      res.status(200).json(response);
    } catch (error) {
      logger.error('❌ Failed to delete message', error, { requestId });

      // Check for authorization errors
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to delete this message',
          },
          requestId,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete message',
        },
        requestId,
      });
    }
  }

  /**
   * POST /api/chat/regenerate
   */
  async regenerate(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    try {
      const userId = getUserId(req);

      // Validate request
      const validationResult = RegenerateMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request format',
            details: validationResult.error.errors,
          },
          requestId,
        });
        return;
      }

      const { messageId, conversationId } = validationResult.data;

      const response = await chatService.regenerateMessage(userId, conversationId, messageId);

      const processingTime = Date.now() - startTime;
      logger.info('✅ Message regenerated', {
        requestId,
        userId,
        messageId,
        conversationId,
        processingTime,
      });

      res.status(200).json(response);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Failed to regenerate message', error, { requestId, processingTime });

      // Check for authorization errors
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to regenerate this message',
          },
          requestId,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'REGENERATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to regenerate message',
        },
        metadata: {
          processingTime,
        },
        requestId,
      });
    }
  }
}

// Export singleton instance
export const chatController = new ChatController();
