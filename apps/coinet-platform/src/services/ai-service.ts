/**
 * 🤖 Coinet AI Service - Grok (xAI) Integration
 * 
 * Real AI-powered market analysis using Grok
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

const SYSTEM_PROMPT = `You are Coinet AI, an expert cryptocurrency and financial market analyst powered by Grok. You provide:

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
  private client: OpenAI | null = null;
  private isConfigured: boolean = false;
  private provider: 'grok' | 'openai' = 'grok';

  constructor() {
    // Try Grok (xAI) first, then fall back to OpenAI
    const grokApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (grokApiKey) {
      this.client = new OpenAI({ 
        apiKey: grokApiKey,
        baseURL: 'https://api.x.ai/v1',
      });
      this.provider = 'grok';
      this.isConfigured = true;
      logger.info('✅ Grok (xAI) AI Service initialized');
    } else if (openaiApiKey) {
      this.client = new OpenAI({ apiKey: openaiApiKey });
      this.provider = 'openai';
      this.isConfigured = true;
      logger.info('✅ OpenAI AI Service initialized (fallback)');
    } else {
      logger.warn('⚠️ No AI API key configured (XAI_API_KEY or OPENAI_API_KEY) - AI will use fallback responses');
    }
  }

  /**
   * Analyze market/crypto query using OpenAI
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const startTime = Date.now();
    const requestId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (!this.client || !this.isConfigured) {
        throw new Error('AI not configured');
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

      // Select model based on provider
      const model = this.provider === 'grok' 
        ? (process.env.GROK_MODEL || 'grok-3-latest')
        : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

      // Call AI
      const response = await this.client.chat.completions.create({
        model,
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
        provider: this.provider,
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
    } catch (error: any) {
      logger.error('❌ AI Analysis Failed', {
        provider: this.provider,
        errorMessage: error?.message || 'Unknown error',
        errorCode: error?.code,
        errorStatus: error?.status,
        errorType: error?.type,
      });
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
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; provider?: string }> {
    if (!this.isConfigured) {
      return { healthy: false };
    }

    try {
      const start = Date.now();
      await this.client?.models.list();
      const latency = Date.now() - start;
      return { healthy: true, latency, provider: this.provider };
    } catch (error) {
      return { healthy: false, provider: this.provider };
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
