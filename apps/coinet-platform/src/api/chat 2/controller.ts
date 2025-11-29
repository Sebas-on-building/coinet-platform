/**
 * 🎮 Chat Controller - Request Handlers
 * 
 * Divine controller that handles HTTP requests with
 * validation, error handling, and response formatting.
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

export class ChatController {
  /**
   * POST /api/chat/message
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Get user ID from auth (for now, using placeholder)
      const userId = (req as any).user?.id || req.headers['x-user-id'] as string || 'anonymous';

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
        });
        return;
      }

      // Type assertion is safe here because Zod validated the data
      const request = validationResult.data as ChatMessageRequest;

      // Process message
      const response = await chatService.sendMessage(userId, request);

      const processingTime = Date.now() - startTime;
      logger.info('✅ Chat message sent', {
        userId,
        conversationId: response.data.conversationId,
        processingTime,
      });

      res.status(200).json(response);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Chat message failed', error, { processingTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process chat message',
        },
        metadata: {
          processingTime,
        },
      });
    }
  }

  /**
   * GET /api/chat/history/:conversationId
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'] as string || 'anonymous';
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'conversationId is required',
          },
        });
        return;
      }

      const response = await chatService.getConversationHistory(userId, conversationId);

      res.status(200).json(response);
    } catch (error) {
      logger.error('❌ Failed to get conversation history', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'HISTORY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get conversation history',
        },
      });
    }
  }

  /**
   * DELETE /api/chat/message/:messageId
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'] as string || 'anonymous';
      const { messageId } = req.params;
      const conversationId = req.query.conversationId as string;

      if (!messageId || !conversationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'messageId and conversationId are required',
          },
        });
        return;
      }

      const response = await chatService.deleteMessage(userId, conversationId, messageId);

      res.status(200).json(response);
    } catch (error) {
      logger.error('❌ Failed to delete message', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete message',
        },
      });
    }
  }

  /**
   * POST /api/chat/regenerate
   */
  async regenerate(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'] as string || 'anonymous';

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
        });
        return;
      }

      const { messageId, conversationId } = validationResult.data;

      const response = await chatService.regenerateMessage(userId, conversationId, messageId);

      const processingTime = Date.now() - startTime;
      logger.info('✅ Message regenerated', {
        userId,
        messageId,
        conversationId,
        processingTime,
      });

      res.status(200).json(response);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Failed to regenerate message', error, { processingTime });

      res.status(500).json({
        success: false,
        error: {
          code: 'REGENERATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to regenerate message',
        },
        metadata: {
          processingTime,
        },
      });
    }
  }
}

// Export singleton instance
export const chatController = new ChatController();

