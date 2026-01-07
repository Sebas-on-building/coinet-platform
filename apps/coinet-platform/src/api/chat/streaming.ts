/**
 * 🌊 Chat Streaming - Server-Sent Events (SSE)
 * 
 * SSE implementation for real-time chat responses.
 * Streams tokens as they are generated for instant user feedback.
 * 
 * All handlers expect authenticated requests (req.auth is set by requireAuth middleware).
 */

import { Request, Response } from 'express';
import { chatService } from './service';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../middleware/requireAuth';

export interface StreamChunk {
  type: 'token' | 'source' | 'chart' | 'metadata' | 'complete' | 'error';
  content?: string;
  data?: any;
  metadata?: {
    confidence?: number;
    model?: string;
    processingTime?: number;
  };
}

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

export class ChatStreamingController {
  /**
   * POST /api/chat/stream
   * Stream chat response using Server-Sent Events
   * 
   * @requires Authentication (JWT token in Authorization header)
   */
  async streamMessage(req: Request, res: Response): Promise<void> {
    const requestId = getRequestId(req);
    
    // Set up SSE headers first (before any potential errors)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('X-Request-ID', requestId);
    
    let userId: string;
    
    try {
      // Get authenticated user ID (no more anonymous fallback)
      userId = getUserId(req);
    } catch (error) {
      // Send error event for authentication failures
      this.sendEvent(res, {
        type: 'error',
        content: 'Authentication required',
        data: { code: 'AUTH_REQUIRED' },
      });
      res.end();
      return;
    }
    
    const { message, conversationId, agentId, context } = req.body;

    logger.info('🌊 Starting SSE stream', { requestId, userId, conversationId });

    try {
      // Send initial connection event
      this.sendEvent(res, {
        type: 'metadata',
        data: {
          status: 'connected',
          requestId,
        },
      });

      // Get response from chat service
      const response = await chatService.sendMessage(userId, {
        message,
        conversationId,
        agentId,
        context,
      });

      // Stream the response in chunks
      const content = response.data.message.content;
      const words = content.split(' ');

      // Stream words with realistic typing delay
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const token = i === words.length - 1 ? word : word + ' ';

        this.sendEvent(res, {
          type: 'token',
          content: token,
        });

        // Realistic typing delay (30-80ms per word)
        await this.sleep(30 + Math.random() * 50);
      }

      // Send sources
      if (response.data.message.sources) {
        for (const source of response.data.message.sources) {
          this.sendEvent(res, {
            type: 'source',
            data: source,
          });
          await this.sleep(100);
        }
      }

      // Send charts
      if (response.data.message.charts) {
        for (const chart of response.data.message.charts) {
          this.sendEvent(res, {
            type: 'chart',
            data: chart,
          });
          await this.sleep(100);
        }
      }

      // Send completion event
      this.sendEvent(res, {
        type: 'complete',
        metadata: {
          confidence: response.data.message.confidence,
          model: response.metadata.model,
          processingTime: response.metadata.processingTime,
        },
      });

      logger.info('✅ SSE stream complete', {
        requestId,
        userId,
        conversationId: response.data.conversationId,
      });

      res.end();
    } catch (error) {
      logger.error('❌ SSE stream error', error, { requestId, userId });

      this.sendEvent(res, {
        type: 'error',
        content: error instanceof Error ? error.message : 'Stream error',
        data: { 
          code: 'STREAM_ERROR',
          requestId,
        },
      });

      res.end();
    }
  }

  /**
   * Send SSE event
   */
  private sendEvent(res: Response, chunk: StreamChunk): void {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const chatStreamingController = new ChatStreamingController();
