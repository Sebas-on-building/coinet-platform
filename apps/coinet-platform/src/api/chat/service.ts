/**
 * 💬 Chat Service - Core Logic
 * 
 * Divine chat service that orchestrates all components:
 * - Conversation management
 * - AI integration
 * - Chart detection
 * - Source management
 * - Context preservation
 */

import { prisma } from '../../db/client';
import { aiService } from '../../services/ai-service';
import { fetchPricesForMessage, formatMarketDataForAI } from '../../services/market-data';
import { getWhaleContextForAI } from '../../services/whale-data';
import { getNewsForCoins, formatNewsForAI } from '../../services/news-service';
import { getMarketSentiment, formatSentimentForAI } from '../../services/sentiment-service';
import { buildUserContextForAI, extractMemoriesFromMessage } from '../../services/memory-service';
import { symbolDetector } from '../../services/symbol-detector';
import { chartDetector } from './chart-detector';
import { sourceManager } from './source-manager';
import { logger } from '../../utils/logger';
import { generateMockResponse } from './mock-ai-response';
import {
  ChatMessageRequest,
  ChatMessageResponse,
  ConversationHistoryResponse,
  ChatMessage,
  Source,
  ChartConfig,
} from './types';

export class ChatService {
  /**
   * Send a message and get AI response
   */
  async sendMessage(
    userId: string,
    request: ChatMessageRequest
  ): Promise<ChatMessageResponse> {
    const startTime = Date.now();

    try {
      logger.info('💬 Processing chat message', {
        userId,
        hasConversationId: !!request.conversationId,
        hasAgentId: !!request.agentId,
      });

      // 1. Get or create conversation
      const conversation = await this.getOrCreateConversation(
        userId,
        request.conversationId,
        request.agentId
      );

      // 2. Store user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: request.message,
        },
      });

      logger.debug('✅ User message stored', { messageId: userMessage.id });

      // 3. Detect chart request
      const chartConfig = chartDetector.detect(request.message);
      if (chartConfig) {
        logger.info('📊 Chart detected', chartConfig);
      }

      // 4. Get conversation context (last 10 messages)
      const context = await this.getConversationContext(conversation.id);

      // 4.5. Fetch ALL live context: User Memory + Market + Whale + News + Sentiment (parallel)
      let liveContextStr: string | undefined;
      try {
        // Detect coins mentioned in the message for targeted news
        const detectedCoins = await symbolDetector.detectCoins(request.message);
        const coinSymbols = detectedCoins.map(c => c.symbol.toUpperCase());
        
        // Parallel fetch all context sources (including user memory)
        const [userContext, marketData, whaleContext, newsSnapshot, sentiment] = await Promise.all([
          buildUserContextForAI(userId),  // 🧠 NEW: User memory
          fetchPricesForMessage(request.message),
          getWhaleContextForAI(),
          getNewsForCoins(coinSymbols),
          getMarketSentiment(),
        ]);
        
        let contextParts: string[] = [];
        
        // 0. Add user profile context (highest priority - personalization!)
        if (userContext.hasProfile && userContext.contextString) {
          contextParts.push(userContext.contextString);
          logger.debug('🧠 User context added', { 
            hasPortfolio: userContext.portfolio.totalHoldings > 0,
            hasPreferences: !!userContext.preferences.riskTolerance,
            watchlistSize: userContext.watchlist.length
          });
        }
        
        // 1. Add market data
        if (marketData && marketData.prices.length > 0) {
          contextParts.push(formatMarketDataForAI(marketData));
          logger.debug('📊 Dynamic market data fetched', { 
            requested: marketData.requestedSymbols,
            found: marketData.foundSymbols,
            missing: marketData.missingSymbols
          });
        }
        
        // 2. Add market sentiment (Fear & Greed)
        if (sentiment) {
          contextParts.push(formatSentimentForAI(sentiment));
          logger.debug('📊 Sentiment added', { 
            value: sentiment.fearGreed.value,
            classification: sentiment.fearGreed.classification 
          });
        }
        
        // 3. Add news context
        if (newsSnapshot && newsSnapshot.articles.length > 0) {
          contextParts.push(formatNewsForAI(newsSnapshot));
          logger.debug('📰 News context added', { 
            count: newsSnapshot.articles.length,
            sentiment: newsSnapshot.dominantSentiment 
          });
        }
        
        // 4. Add whale intelligence context
        if (whaleContext.isAvailable && whaleContext.contextForAI) {
          contextParts.push(whaleContext.contextForAI);
          logger.debug('🐋 Whale context added', { 
            chains: whaleContext.monitoredChains,
            capabilities: whaleContext.capabilities.length
          });
        }
        
        if (contextParts.length > 0) {
          liveContextStr = contextParts.join('\n');
        }
      } catch (error: any) {
        logger.debug('⚠️ Could not fetch live context', { error: error?.message });
      }
      
      // 4.6. Extract memories from user message (background, don't block)
      extractMemoriesFromMessage(userId, request.message).catch(err => 
        logger.debug('🧠 Memory extraction failed', { error: err?.message })
      );

      // 5. Call AI service (or use mock if unavailable)
      let aiResponse;
      try {
        aiResponse = await aiService.analyze({
          content: request.message,
          type: 'question',
          context: {
            conversationId: conversation.id,
            agentId: request.agentId,
            analysisDepth: request.context?.analysisDepth || 'standard',
            conversationHistory: context,
            liveMarketData: liveContextStr, // Now includes both market + whale data
          },
        });
      } catch (error) {
        logger.warn('⚠️  AI Service unavailable, using mock response');
        aiResponse = generateMockResponse(request.message);
      }

      // 6. Get sources
      const sources = request.context?.includeSources !== false
        ? await sourceManager.getSources(
            aiResponse.data.symbol || 'BTC',
            aiResponse.data.keyTopics || [],
            5
          )
        : [];

      // 7. Prepare assistant response
      const assistantContent = aiResponse.data.thesis || 
                               aiResponse.data.summary || 
                               (aiResponse.data as any).recommendation || 
                               'I apologize, but I couldn\'t generate a response.';

      // 8. Store assistant message
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: assistantContent,
          sources: sources.length > 0 ? (sources as unknown as any) : undefined,
          charts: chartConfig ? ([chartConfig] as unknown as any) : undefined,
          confidence: aiResponse.data.confidence,
          model: aiResponse.metadata?.version || 'unknown',
          tokens: undefined, // Would be populated from AI service
        },
      });

      // 9. Update conversation title if first message
      if (!conversation.title && userMessage.role === 'user') {
        const title = this.generateConversationTitle(request.message);
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { title },
        });
      }

      // 10. Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      const processingTime = Date.now() - startTime;

      logger.info('✅ Chat message processed', {
        conversationId: conversation.id,
        processingTime,
        confidence: aiResponse.data.confidence,
        hasSources: sources.length > 0,
        hasCharts: !!chartConfig,
      });

      return {
        success: true,
        data: {
          message: {
            id: assistantMessage.id,
            role: 'assistant',
            content: assistantContent,
            sources: sources.length > 0 ? sources : undefined,
            charts: chartConfig ? [chartConfig] : undefined,
            confidence: aiResponse.data.confidence,
            createdAt: assistantMessage.createdAt.toISOString(),
          },
          conversationId: conversation.id,
          conversationTitle: conversation.title || undefined,
        },
        metadata: {
          processingTime,
          tokens: undefined, // Would be from AI service
          model: aiResponse.metadata?.version,
        },
      };
    } catch (error) {
      logger.error('❌ Chat message processing failed', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    userId: string,
    conversationId: string
  ): Promise<ConversationHistoryResponse> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId, // Ensure user owns this conversation
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messages: ChatMessage[] = conversation.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: (msg.sources as unknown) as Source[] | undefined,
        charts: (msg.charts as unknown) as ChartConfig[] | undefined,
        confidence: msg.confidence || undefined,
        createdAt: msg.createdAt.toISOString(),
      }));

      return {
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            title: conversation.title || undefined,
            messages,
            createdAt: conversation.createdAt.toISOString(),
            updatedAt: conversation.updatedAt.toISOString(),
          },
        },
      };
    } catch (error) {
      logger.error('❌ Failed to get conversation history', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    userId: string,
    conversationId: string,
    messageId: string
  ): Promise<{ success: boolean }> {
    try {
      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Delete message
      await prisma.message.delete({
        where: {
          id: messageId,
        },
      });

      logger.info('✅ Message deleted', { messageId, conversationId });

      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to delete message', error);
      throw error;
    }
  }

  /**
   * Get or create conversation
   */
  private async getOrCreateConversation(
    userId: string,
    conversationId?: string,
    agentId?: string
  ) {
    if (conversationId) {
      const existing = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId, // Security: ensure user owns conversation
        },
      });

      if (existing) {
        return existing;
      }

      logger.warn('⚠️ Conversation ID provided but not found, creating new', {
        conversationId,
        userId,
      });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        agentId,
        context: {},
      },
    });

    logger.info('✅ New conversation created', {
      conversationId: conversation.id,
      userId,
    });

    return conversation;
  }

  /**
   * Get conversation context (last 10 messages)
   */
  private async getConversationContext(conversationId: string) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    return messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Generate conversation title from first message
   */
  private generateConversationTitle(firstMessage: string): string {
    // Extract key topic or use truncated message
    const maxLength = 50;
    if (firstMessage.length <= maxLength) {
      return firstMessage;
    }

    // Try to extract main topic
    const cryptoPattern = /\b(bitcoin|btc|ethereum|eth|solana|sol|cardano|ada)\b/i;
    const match = firstMessage.match(cryptoPattern);
    
    if (match) {
      const symbol = match[1].toUpperCase();
      return `${symbol} Discussion`;
    }

    // Default: truncate first message
    return firstMessage.substring(0, maxLength - 3) + '...';
  }

  /**
   * Regenerate assistant message
   */
  async regenerateMessage(
    userId: string,
    conversationId: string,
    messageId: string
  ): Promise<ChatMessageResponse> {
    try {
      // Get the original message
      const originalMessage = await prisma.message.findFirst({
        where: {
          id: messageId,
          conversationId,
          role: 'assistant',
        },
        include: {
          conversation: true,
        },
      });

      if (!originalMessage) {
        throw new Error('Message not found');
      }

      // Security: ensure user owns conversation
      if (originalMessage.conversation.userId !== userId) {
        throw new Error('Unauthorized');
      }

      // Get the user message that prompted this
      const userMessages = await prisma.message.findMany({
        where: {
          conversationId,
          role: 'user',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (userMessages.length === 0) {
        throw new Error('No user message found to regenerate');
      }

      // Mark original as regenerated
      await prisma.message.update({
        where: { id: messageId },
        data: { regeneratedFrom: messageId },
      });

      // Generate new response using the user's original message
      const response = await this.sendMessage(userId, {
        message: userMessages[0].content,
        conversationId,
      });

      logger.info('✅ Message regenerated', {
        originalMessageId: messageId,
        newMessageId: response.data.message.id,
      });

      return response;
    } catch (error) {
      logger.error('❌ Failed to regenerate message', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();

