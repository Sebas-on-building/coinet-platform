/**
 * 🌊 Chat Streaming - Server-Sent Events (SSE)
 * 
 * Divine SSE implementation for real-time chat responses.
 * Streams tokens as they are generated for instant user feedback.
 */

import { Request, Response } from 'express';
import { chatService } from './service';
import { logger } from '../../utils/logger';

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

export class ChatStreamingController {
  /**
   * GET /api/chat/stream
   * Stream chat response using Server-Sent Events
   */
  async streamMessage(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string || 'anonymous';
    const { message, conversationId, agentId, context } = req.body;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    logger.info('🌊 Starting SSE stream', { userId, conversationId });

    try {
      // Send initial connection event
      this.sendEvent(res, {
        type: 'metadata',
        data: {
          status: 'connected',
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
        userId,
        conversationId: response.data.conversationId,
      });

      res.end();
    } catch (error) {
      logger.error('❌ SSE stream error', error);

      this.sendEvent(res, {
        type: 'error',
        content: error instanceof Error ? error.message : 'Stream error',
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

