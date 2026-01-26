/**
 * RLHF Feedback Service
 * 
 * Collects user feedback on AI responses for continuous improvement.
 * Enables Reinforcement Learning from Human Feedback (RLHF) pipeline.
 */

import { PrismaClient, FeedbackType, FeedbackCategory, FeedbackSeverity } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface SubmitFeedbackRequest {
  messageId: string;
  userId: string;
  type: FeedbackType;
  category?: FeedbackCategory;
  severity?: FeedbackSeverity;
  reason?: string;
  context?: any;
  responseMetadata?: any;
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  positiveRate: number;
  negativeRate: number;
  topIssues: Array<{
    category: FeedbackCategory;
    count: number;
    examples: string[];
  }>;
  recentTrends: {
    last24h: { positive: number; negative: number };
    last7d: { positive: number; negative: number };
  };
}

export class FeedbackService {
  /**
   * Submit user feedback on a message
   */
  async submitFeedback(request: SubmitFeedbackRequest) {
    try {
      // Update message feedback
      await prisma.message.update({
        where: { id: request.messageId },
        data: {
          userFeedback: this.mapTypeToMessageFeedback(request.type),
          feedbackReason: request.reason,
          feedbackAt: new Date(),
        },
      });

      // Create detailed feedback entry
      const feedbackEntry = await prisma.feedbackEntry.create({
        data: {
          messageId: request.messageId,
          userId: request.userId,
          type: request.type,
          category: request.category,
          severity: request.severity || FeedbackSeverity.MINOR,
          reason: request.reason,
          context: request.context,
          responseMetadata: request.responseMetadata,
        },
      });

      logger.info('✅ Feedback submitted', {
        messageId: request.messageId,
        type: request.type,
        category: request.category,
      });

      return { success: true, feedbackId: feedbackEntry.id };
    } catch (error) {
      logger.error('❌ Failed to submit feedback', { error, request });
      throw error;
    }
  }

  /**
   * Get feedback analytics for improvement insights
   */
  async getAnalytics(timeRange: '24h' | '7d' | '30d' | 'all' = '7d'): Promise<FeedbackAnalytics> {
    const since = this.getTimeRangeCutoff(timeRange);

    const [
      totalCount,
      positiveFeedback,
      negativeFeedback,
      categoryBreakdown,
      recent24h,
      recent7d,
    ] = await Promise.all([
      prisma.feedbackEntry.count({ where: { createdAt: { gte: since } } }),
      prisma.feedbackEntry.count({
        where: {
          createdAt: { gte: since },
          type: { in: ['THUMBS_UP', 'HELPFUL', 'PERFECT'] },
        },
      }),
      prisma.feedbackEntry.count({
        where: {
          createdAt: { gte: since },
          type: { in: ['THUMBS_DOWN', 'WRONG_DATA', 'BAD_TONE', 'TOO_LONG', 'REPETITIVE'] },
        },
      }),
      this.getCategoryBreakdown(since),
      this.getRecentCounts(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      this.getRecentCounts(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    ]);

    return {
      totalFeedback: totalCount,
      positiveRate: totalCount > 0 ? positiveFeedback / totalCount : 0,
      negativeRate: totalCount > 0 ? negativeFeedback / totalCount : 0,
      topIssues: categoryBreakdown,
      recentTrends: {
        last24h: recent24h,
        last7d: recent7d,
      },
    };
  }

  /**
   * Get messages with negative feedback for training improvement
   */
  async getNegativeFeedbackExamples(limit: number = 50) {
    const messages = await prisma.message.findMany({
      where: {
        role: 'assistant',
        feedbackEntries: {
          some: {
            type: { in: ['THUMBS_DOWN', 'WRONG_DATA', 'BAD_TONE', 'TOO_LONG', 'REPETITIVE'] },
          },
        },
      },
      include: {
        feedbackEntries: true,
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 10, // Context: last 10 messages
            },
          },
        },
      },
      orderBy: { feedbackAt: 'desc' },
      take: limit,
    });

    return messages.map(msg => ({
      messageId: msg.id,
      content: msg.content,
      feedback: msg.feedbackEntries,
      conversationContext: msg.conversation.messages,
    }));
  }

  /**
   * Get messages with positive feedback for training reinforcement
   */
  async getPositiveFeedbackExamples(limit: number = 100) {
    const messages = await prisma.message.findMany({
      where: {
        role: 'assistant',
        feedbackEntries: {
          some: {
            type: { in: ['THUMBS_UP', 'HELPFUL', 'PERFECT'] },
          },
        },
      },
      include: {
        feedbackEntries: true,
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 10,
            },
          },
        },
      },
      orderBy: { feedbackAt: 'desc' },
      take: limit,
    });

    return messages.map(msg => ({
      messageId: msg.id,
      content: msg.content,
      feedback: msg.feedbackEntries,
      conversationContext: msg.conversation.messages,
    }));
  }

  /**
   * Generate training pairs (good vs bad examples) for model improvement
   */
  async generateTrainingPairs() {
    const [positiveExamples, negativeExamples] = await Promise.all([
      this.getPositiveFeedbackExamples(50),
      this.getNegativeFeedbackExamples(50),
    ]);

    return {
      preferred: positiveExamples,
      rejected: negativeExamples,
      metadata: {
        generatedAt: new Date(),
        preferredCount: positiveExamples.length,
        rejectedCount: negativeExamples.length,
      },
    };
  }

  // Helper methods
  private mapTypeToMessageFeedback(type: FeedbackType): 'positive' | 'negative' | 'neutral' {
    switch (type) {
      case 'THUMBS_UP':
      case 'HELPFUL':
      case 'PERFECT':
        return 'positive';
      case 'THUMBS_DOWN':
      case 'WRONG_DATA':
      case 'BAD_TONE':
      case 'TOO_LONG':
      case 'TOO_SHORT':
      case 'REPETITIVE':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  private getTimeRangeCutoff(range: '24h' | '7d' | '30d' | 'all'): Date {
    const now = Date.now();
    switch (range) {
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case 'all':
        return new Date(0);
    }
  }

  private async getCategoryBreakdown(since: Date) {
    const categories = await prisma.feedbackEntry.groupBy({
      by: ['category'],
      where: {
        createdAt: { gte: since },
        category: { not: null },
        type: { in: ['THUMBS_DOWN', 'WRONG_DATA', 'BAD_TONE', 'TOO_LONG', 'REPETITIVE'] },
      },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 10,
    });

    return Promise.all(
      categories.map(async cat => {
        const examples = await prisma.feedbackEntry.findMany({
          where: { category: cat.category, createdAt: { gte: since } },
          select: { reason: true },
          take: 3,
        });

        return {
          category: cat.category!,
          count: cat._count.category,
          examples: examples.map(e => e.reason).filter(Boolean) as string[],
        };
      })
    );
  }

  private async getRecentCounts(since: Date) {
    const [positive, negative] = await Promise.all([
      prisma.feedbackEntry.count({
        where: {
          createdAt: { gte: since },
          type: { in: ['THUMBS_UP', 'HELPFUL', 'PERFECT'] },
        },
      }),
      prisma.feedbackEntry.count({
        where: {
          createdAt: { gte: since },
          type: { in: ['THUMBS_DOWN', 'WRONG_DATA', 'BAD_TONE', 'TOO_LONG', 'REPETITIVE'] },
        },
      }),
    ]);

    return { positive, negative };
  }
}

export const feedbackService = new FeedbackService();
