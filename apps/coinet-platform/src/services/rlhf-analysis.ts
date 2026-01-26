/**
 * RLHF Analysis Service
 * 
 * Continuous Alignment System for Coinet AI.
 * Analyzes feedback, generates training pairs, and improves responses.
 * 
 * This is "RLHF-lite": practical feedback loop without full retraining.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

const prisma = new PrismaClient();

// ============================================================================
// RLHF PROMPTS — For Claude/GPT-4 evaluation
// ============================================================================

export const RLHF_PROMPTS = {
  /**
   * PROMPT 1 — Failure Diagnosis
   * Identifies why a response failed and generates ideal answer
   */
  DIAGNOSE_FAILURE: (params: {
    userMessage: string;
    assistantResponse: string;
    conversationContext: string;
    language: string;
    failureTag?: string;
  }) => `You are a strict evaluator of chat naturalness and usefulness.

CONTEXT:
User message: "${params.userMessage}"
Assistant response: "${params.assistantResponse}"
Conversation context: ${params.conversationContext}
Language: ${params.language}
Failure tag: ${params.failureTag || 'none'}

TASK:
1) Identify why the assistant response failed (max 3 reasons).
2) Map each reason to one actionable fix rule (clear, implementable).
3) Provide a rewritten "ideal answer" that:
   - feels human
   - matches the user's intent and energy
   - avoids scripted menu questions
   - stays in the user's language
   - respects the metrics gate (no numbers unless asked)

Return JSON:
{
  "root_causes": ["reason 1", "reason 2"],
  "fix_rules": ["rule 1", "rule 2"],
  "ideal_answer": "..."
}`,

  /**
   * PROMPT 2 — Training Pair Generator
   * Creates structured training pairs for alignment
   */
  CREATE_TRAINING_PAIRS: (params: {
    userMessage: string;
    conversationContext: string;
    badAnswer: string;
    idealAnswer: string;
    language: string;
    intent: string;
  }) => `Create training pairs for alignment/fine-tuning.

INPUT:
- User message: "${params.userMessage}"
- Context: ${params.conversationContext}
- Bad answer: "${params.badAnswer}"
- Ideal answer: "${params.idealAnswer}"
- Language: ${params.language}
- Intent: ${params.intent}

Return JSON with:
{
  "prompt": "includes user_message + minimal context summary",
  "rejected": "bad_answer (unaltered)",
  "chosen": "ideal_answer (unaltered)",
  "labels": {
    "language": "${params.language}",
    "intent": "${params.intent}",
    "failure_tags": []
  },
  "notes": "1 line describing why chosen is better"
}

RULES:
- The chosen answer must be short by default.
- Must end with at most 1 question.
- Must feel like a real person texting.`,

  /**
   * PROMPT 3 — Multilingual Style Check
   * Verifies answer sounds natural in target language
   */
  MULTILINGUAL_STYLE_CHECK: (params: {
    chosenAnswer: string;
    language: string;
    intent: string;
  }) => `Verify the answer sounds natural in ${params.language}.

Answer: "${params.chosenAnswer}"
Intent: ${params.intent}

Fix awkward direct translations and unnatural phrasing.
Do NOT add extra content.
Output only the improved chosen_answer.`,

  /**
   * PROMPT 4 — Constitutional Rewrite
   * Self-refine using constitutional principles
   */
  CONSTITUTIONAL_REWRITE: (params: {
    draftAnswer: string;
    userMessage: string;
    conversationContext: string;
    language: string;
    intent: string;
    mode: string;
    dataRequestLevel: string;
  }) => `CONSTITUTION (NON-NEGOTIABLE PRINCIPLES):
1) Human chat voice: short, natural, not report-like.
2) Match the user's energy and intent.
3) No dashboard dumping: meaning first.
4) No menu questions by default.
5) One question max.
6) No repeated phrasing from previous turn.
7) No invented "current" numbers or news. Use only provided snapshots.
8) Stay in the user's language. No random switching.
9) If uncertain about real-time data: say it in one short line, then proceed safely.
10) Be helpful without being salesy or cringe.

DRAFT ANSWER:
"${params.draftAnswer}"

USER MESSAGE:
"${params.userMessage}"

CONTEXT:
${params.conversationContext}

PARAMETERS:
- Language: ${params.language}
- Intent: ${params.intent}
- Mode: ${params.mode}
- Data request level: ${params.dataRequestLevel}

TASK:
Rewrite the draft so it fully satisfies the constitution.
If it already satisfies it, return it unchanged.
Output ONLY the final rewritten answer.`,

  /**
   * PROMPT 5 — Response Reranker (for online preference optimization)
   */
  RESPONSE_RERANK: (params: {
    userMessage: string;
    candidateA: string;
    candidateB: string;
    language: string;
    intent: string;
  }) => `Which response sounds more like a real person?

User message: "${params.userMessage}"
Language: ${params.language}
Intent: ${params.intent}

CANDIDATE A:
"${params.candidateA}"

CANDIDATE B:
"${params.candidateB}"

CRITERIA:
- Which sounds more like a real person?
- Which matches the user's request best?
- Which avoids menu questions and bot phrasing?
- Which is shorter when user is vague?

Output only: "A" or "B" + 1-line reason.
Format: {"winner": "A", "reason": "..."}`,
};

// ============================================================================
// RLHF ANALYSIS SERVICE
// ============================================================================

export class RLHFAnalysisService {
  private evaluatorClient: OpenAI | null = null;

  constructor() {
    // Use Claude for evaluation (preferred) or GPT-4
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
      // Anthropic Claude (via OpenAI-compatible API)
      this.evaluatorClient = new OpenAI({
        apiKey: anthropicKey,
        baseURL: 'https://api.anthropic.com/v1',
      });
      logger.info('✅ RLHF Evaluator: Claude');
    } else if (openaiKey) {
      this.evaluatorClient = new OpenAI({ apiKey: openaiKey });
      logger.info('✅ RLHF Evaluator: GPT-4');
    } else {
      logger.warn('⚠️ No evaluator API key configured for RLHF');
    }
  }

  /**
   * Diagnose why a response failed and generate ideal answer
   */
  async diagnoseFailure(params: {
    userMessage: string;
    assistantResponse: string;
    conversationContext: string;
    language: string;
    failureTag?: string;
  }) {
    if (!this.evaluatorClient) {
      throw new Error('Evaluator client not configured');
    }

    const prompt = RLHF_PROMPTS.DIAGNOSE_FAILURE(params);

    const response = await this.evaluatorClient.chat.completions.create({
      model: 'gpt-4-turbo-preview', // or claude-3-opus
      messages: [
        { role: 'system', content: 'You are an expert evaluator of conversational AI quality.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  }

  /**
   * Create training pairs from feedback data
   */
  async createTrainingPairs(params: {
    userMessage: string;
    conversationContext: string;
    badAnswer: string;
    idealAnswer: string;
    language: string;
    intent: string;
  }) {
    if (!this.evaluatorClient) {
      throw new Error('Evaluator client not configured');
    }

    const prompt = RLHF_PROMPTS.CREATE_TRAINING_PAIRS(params);

    const response = await this.evaluatorClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Constitutional rewrite pass (runtime or offline)
   */
  async constitutionalRewrite(params: {
    draftAnswer: string;
    userMessage: string;
    conversationContext: string;
    language: string;
    intent: string;
    mode: string;
    dataRequestLevel: string;
  }): Promise<string> {
    if (!this.evaluatorClient) {
      return params.draftAnswer; // No rewrite if evaluator unavailable
    }

    const prompt = RLHF_PROMPTS.CONSTITUTIONAL_REWRITE(params);

    const response = await this.evaluatorClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    return response.choices[0].message.content || params.draftAnswer;
  }

  /**
   * Rerank two candidate responses (online preference optimization)
   */
  async rerankResponses(params: {
    userMessage: string;
    candidateA: string;
    candidateB: string;
    language: string;
    intent: string;
  }): Promise<{ winner: 'A' | 'B'; reason: string }> {
    if (!this.evaluatorClient) {
      return { winner: 'A', reason: 'Evaluator unavailable, using first candidate' };
    }

    const prompt = RLHF_PROMPTS.RESPONSE_RERANK(params);

    const response = await this.evaluatorClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{"winner": "A", "reason": "default"}');
  }

  /**
   * Weekly alignment job — process feedback and generate training data
   */
  async runWeeklyAlignment() {
    logger.info('🔄 Starting weekly alignment job...');

    try {
      // Get feedback samples
      const [thumbsDown, neutral, thumbsUp] = await Promise.all([
        this.sampleMessages('negative', 200),
        this.sampleMessages(null, 200),
        this.sampleMessages('positive', 200),
      ]);

      logger.info('📊 Sampled feedback', {
        thumbsDown: thumbsDown.length,
        neutral: neutral.length,
        thumbsUp: thumbsUp.length,
      });

      // Process thumbs down (priority)
      const trainingPairs = [];
      for (const msg of thumbsDown.slice(0, 50)) {
        try {
          // Diagnose failure
          const diagnosis = await this.diagnoseFailure({
            userMessage: msg.userMessage,
            assistantResponse: msg.content,
            conversationContext: msg.contextSummary,
            language: msg.language,
            failureTag: msg.failureTag,
          });

          // Create training pair
          const pair = await this.createTrainingPairs({
            userMessage: msg.userMessage,
            conversationContext: msg.contextSummary,
            badAnswer: msg.content,
            idealAnswer: diagnosis.ideal_answer,
            language: msg.language,
            intent: msg.intent,
          });

          trainingPairs.push(pair);
        } catch (error) {
          logger.error('Failed to process feedback item', { error, messageId: msg.id });
        }
      }

      logger.info('✅ Generated training pairs', { count: trainingPairs.length });

      // Export training data
      return {
        trainingPairs,
        metrics: {
          processed: thumbsDown.length + neutral.length + thumbsUp.length,
          trainingPairsGenerated: trainingPairs.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('❌ Weekly alignment job failed', { error });
      throw error;
    }
  }

  /**
   * Sample messages for alignment analysis
   */
  private async sampleMessages(feedback: 'positive' | 'negative' | null, limit: number) {
    const where: any = {
      role: 'assistant',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    };

    if (feedback) {
      where.userFeedback = feedback;
    } else {
      where.userFeedback = null;
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 10,
            },
          },
        },
        feedbackEntries: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.map(msg => {
      const userMsg = msg.conversation.messages
        .filter(m => m.createdAt < msg.createdAt)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      return {
        id: msg.id,
        userMessage: userMsg?.content || '',
        content: msg.content,
        contextSummary: this.generateContextSummary(msg.conversation.messages),
        language: this.detectLanguage(userMsg?.content || ''),
        intent: this.detectIntent(userMsg?.content || ''),
        failureTag: msg.feedbackEntries[0]?.category || undefined,
      };
    });
  }

  /**
   * Generate context summary from conversation history
   */
  private generateContextSummary(messages: any[]): string {
    const recent = messages.slice(-5);
    const topics = new Set<string>();
    let mode = 'new_conversation';

    for (const msg of recent) {
      if (/\b(?:BTC|ETH|SOL|bitcoin|ethereum|solana)\b/i.test(msg.content)) {
        const matches = msg.content.match(/\b(?:BTC|ETH|SOL|bitcoin|ethereum|solana)\b/gi);
        matches?.forEach(t => topics.add(t.toUpperCase()));
        mode = 'MARKET_MODE';
      }
    }

    return `Mode: ${mode}. Topics: ${Array.from(topics).join(', ') || 'none'}. Turn count: ${recent.length}`;
  }

  /**
   * Detect language from message
   */
  private detectLanguage(message: string): string {
    const germanWords = /\b(?:ich|du|und|oder|aber|wenn|weil|nicht|mein|haben|werden|können|grad|bisschen)\b/i;
    const hasUmlauts = /[äöüß]/;
    
    if (germanWords.test(message) || hasUmlauts.test(message)) {
      return 'de';
    }
    return 'en';
  }

  /**
   * Detect intent from message
   */
  private detectIntent(message: string): string {
    const lower = message.toLowerCase();
    if (/^(?:hey|hi|yo|sup|hallo)/i.test(lower)) return 'SOCIAL';
    if (/\b(?:should\s+i|worth|buy|sell|advice)\b/i.test(lower)) return 'ADVICE';
    if (/\b(?:why|what\s+happened|explain)\b/i.test(lower)) return 'EXPLAIN';
    if (/\b(?:coinet|sources?|how\s+(?:do|does))\b/i.test(lower)) return 'PRODUCT';
    return 'DATA_REQUEST';
  }

  /**
   * Get alignment metrics for dashboard
   */
  async getAlignmentMetrics() {
    const [
      totalFeedback,
      thumbsUp,
      thumbsDown,
      bottySentiment,
      repetitiveIssues,
      avgResponseLength,
    ] = await Promise.all([
      prisma.feedbackEntry.count(),
      prisma.feedbackEntry.count({ where: { type: { in: ['THUMBS_UP', 'HELPFUL', 'PERFECT'] } } }),
      prisma.feedbackEntry.count({ where: { type: { in: ['THUMBS_DOWN', 'WRONG_DATA', 'BAD_TONE'] } } }),
      prisma.feedbackEntry.count({ where: { type: 'BAD_TONE' } }),
      prisma.feedbackEntry.count({ where: { type: 'REPETITIVE' } }),
      this.getAverageResponseLength(),
    ]);

    return {
      totalFeedback,
      thumbsUpRate: totalFeedback > 0 ? thumbsUp / totalFeedback : 0,
      thumbsDownRate: totalFeedback > 0 ? thumbsDown / totalFeedback : 0,
      bottyRate: totalFeedback > 0 ? bottySentiment / totalFeedback : 0,
      repetitionRate: totalFeedback > 0 ? repetitiveIssues / totalFeedback : 0,
      avgResponseLength,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get average response length by intent
   */
  private async getAverageResponseLength(): Promise<Record<string, number>> {
    // This is a simplified version - in production, store intent in metadata
    const messages = await prisma.message.findMany({
      where: {
        role: 'assistant',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { content: true },
      take: 1000,
    });

    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    
    return {
      overall: Math.round(avgLength),
    };
  }
}

export const rlhfAnalysis = new RLHFAnalysisService();
