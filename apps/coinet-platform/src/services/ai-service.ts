/**
 * 🤖 Coinet AI Service - OpenAI Integration
 * 
 * Real AI-powered market analysis using OpenAI GPT-4
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';

export interface AIAnalysisRequest {
  content: string;
  type: 'ticker' | 'url' | 'thread' | 'question' | 'news';
  context?: {
    conversationId?: string;
    agentId?: string;
    analysisDepth?: 'quick' | 'standard' | 'deep';
    conversationHistory?: Array<{ role: string; content: string }>;
  };
}

export interface AIAnalysisResponse {
  success: boolean;
  data: {
    symbol?: string;
    thesis?: string;
    summary?: string;
    confidence: number;
    recommendation?: string;
    keyTopics?: string[];
    risks?: string[];
    catalysts?: string[];
  };
  metadata: {
    requestId: string;
    processingTime: number;
    version: string;
  };
}

const SYSTEM_PROMPT = `You are Coinet AI, an expert cryptocurrency and financial market analyst. You provide:

1. **Market Analysis**: Deep insights on crypto assets, trends, and market conditions
2. **Trading Intelligence**: Technical analysis, sentiment analysis, and trading signals
3. **Risk Assessment**: Identify potential risks and opportunities
4. **Educational Content**: Explain complex concepts in simple terms

Guidelines:
- Be concise but thorough
- Use data-driven insights when possible
- Always mention relevant risks
- Provide actionable insights
- Be honest about uncertainty
- Format responses with clear sections when appropriate

You have access to real-time market data through the Coinet platform.`;

export class AIService {
  private openai: OpenAI | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.isConfigured = true;
      logger.info('✅ OpenAI AI Service initialized');
    } else {
      logger.warn('⚠️ OPENAI_API_KEY not configured - AI will use fallback responses');
    }
  }

  /**
   * Analyze market/crypto query using OpenAI
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const startTime = Date.now();
    const requestId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (!this.openai || !this.isConfigured) {
        throw new Error('OpenAI not configured');
      }

      // Build conversation messages
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
      ];

      // Add conversation history if available
      if (request.context?.conversationHistory) {
        for (const msg of request.context.conversationHistory.slice(-8)) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      // Add current message
      messages.push({ role: 'user', content: request.content });

      // Call OpenAI
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
      const processingTime = Date.now() - startTime;

      // Extract symbol if mentioned
      const symbolMatch = content.match(/\b(BTC|ETH|SOL|ADA|AVAX|DOGE|XRP|DOT|MATIC|LINK)\b/i);
      const symbol = symbolMatch ? symbolMatch[1].toUpperCase() : undefined;

      // Extract key topics
      const keyTopics = this.extractKeyTopics(content);

      logger.info('🧠 AI Analysis Complete', {
        requestId,
        type: request.type,
        processingTime,
        model: response.model,
        tokens: response.usage?.total_tokens,
      });

      return {
        success: true,
        data: {
          symbol,
          thesis: content,
          summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          confidence: 0.85,
          keyTopics,
        },
        metadata: {
          requestId,
          processingTime,
          version: response.model,
        },
      };
    } catch (error) {
      logger.error('❌ AI Analysis Failed', error);
      throw error;
    }
  }

  /**
   * Extract key topics from response
   */
  private extractKeyTopics(content: string): string[] {
    const topics: string[] = [];
    
    const cryptoKeywords = ['bitcoin', 'ethereum', 'solana', 'defi', 'nft', 'trading', 'market', 'bull', 'bear', 'whale', 'analysis'];
    
    for (const keyword of cryptoKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        topics.push(keyword);
      }
    }
    
    return topics.slice(0, 5);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    if (!this.isConfigured) {
      return { healthy: false };
    }

    try {
      const start = Date.now();
      await this.openai?.models.list();
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      return { healthy: false };
    }
  }

  /**
   * Check if service is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const aiService = new AIService();
