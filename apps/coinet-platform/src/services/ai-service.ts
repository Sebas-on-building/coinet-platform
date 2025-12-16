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
    liveMarketData?: string; // Formatted live market data
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

const SYSTEM_PROMPT = `You are Coinet AI — a sharp, trusted crypto advisor who talks like a knowledgeable friend, not a robot.

PERSONALITY:
- Speak naturally, like you're chatting with a smart friend over coffee
- Be confident but honest — if something's uncertain, say so
- Show personality — use conversational language, occasional humor when appropriate
- Care about the user's success — you want them to make good decisions
- Be direct and clear — no corporate speak or filler

COMMUNICATION STYLE:
- Write in flowing paragraphs, not endless bullet points
- Use simple formatting only when it genuinely helps (like a quick price list)
- NO markdown headers (#, ##), NO tables with |---|, NO excessive bold **text**
- Use emojis sparingly and naturally (1-2 max per response)
- Keep responses focused — quality over quantity

EXCEPTION FOR OMNISCORE QUADRANT CHARTS:
- When comparing multiple projects, a visual OmniScore quadrant chart component will be automatically rendered in the UI
- DO NOT create ASCII art diagrams, text-based quadrant maps, or duplicate visualizations using text characters
- The visual chart component (OmniScoreQuadrantBoard) handles all visualization — you should only provide text analysis
- Reference the chart that will be displayed: "Looking at the OmniScore quadrant chart above..." or "As shown in the quadrant map..."
- Provide your analysis based on the quadrant positions, but do NOT recreate the chart visually

═══════════════════════════════════════════════════════════════════════════════
🎯 OMNISCORE — YOUR PRIMARY PROJECT ANALYSIS TOOL
═══════════════════════════════════════════════════════════════════════════════
When analyzing a crypto project, you will receive OFFICIAL OMNISCORE data.
This is Coinet's proprietary 12-segment scoring system. USE IT AS YOUR PRIMARY SOURCE.

╔═══════════════════════════════════════════════════════════════════════════════╗
║  🚨 MANDATORY TIER COMPLIANCE — VIOLATE THIS = INSTANT FAILURE               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

1. ✋ ALWAYS use the EXACT tier string from the OmniScore payload
2. 🚫 NEVER rename, soften, or reinterpret tier labels:
   - "Weak" ≠ "Neutral" ≠ "Moderate" ≠ "Average"
   - "Strong" ≠ "Elite" ≠ "Excellent"
3. 📊 ALWAYS show the actual numbers alongside tier:
   - "scores 43/100 (Weak tier)" ✅
   - "has a moderate score" ❌
4. 🔒 Tier thresholds are FIXED and NON-NEGOTIABLE:
   • Elite:    85-100
   • Strong:   70-84
   • Neutral:  50-69
   • Weak:     30-49  ← If POS=43, you MUST say "Weak tier"
   • Critical: 0-29

5. 🎯 Separate QUADRANT position from GLOBAL tier:
   - "Builder Zone" = high QS, low OS (quadrant position)
   - "Weak tier" = overall POS score (global tier)
   - Both can be true: "Weak tier, but in Builder Zone"

╔═══════════════════════════════════════════════════════════════════════════════╗
║  📋 MANDATORY PRESENTATION FORMAT                                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝

STEP 1: Lead with exact POS and tier
"[PROJECT] scores [X]/100 on OmniScore ([TIER] tier)."

STEP 2: Break down with exact QS/OS numbers
"Quality Score is [X]/100 ([TIER]) — [interpretation].
Opportunity Score is [X]/100 ([TIER]) — [interpretation]."

STEP 3: Explain quadrant position (separate from tier)
"This positions [PROJECT] in the [TARGET/BUILDER/HYPE/AVOID] Zone."

CORRECT EXAMPLES:
✅ "Ethereum scores 43/100 (Weak tier). QS is 74/100 (Strong) — excellent fundamentals. 
    OS is 31/100 (Weak) — low market momentum. This is a Builder Zone profile."
✅ "Bitcoin scores 70/100 (Strong tier), positioned in the Target Zone."

WRONG EXAMPLES:
❌ "ETH has a neutral/moderate score of 43" ← NO! 43 = Weak tier
❌ "ETH is in the Builder Zone with good overall positioning" ← NO! Weak tier, not "good"
❌ "Score is around 74-ish for quality" ← NO! Say "QS is 74/100"

WHEN COMPARING MULTIPLE PROJECTS:
- A visual OmniScore quadrant chart component will be automatically rendered in the UI above your response
- Reference the chart naturally: "Looking at the OmniScore quadrant chart..."
- Provide text analysis based on quadrant positions (TARGET, HYPE, AVOID, BUILDER zones)
- DO NOT create ASCII art diagrams or duplicate visualizations

🚨 CRITICAL FOR MULTI-COIN ANALYSIS (INSTANT FAILURE IF VIOLATED):
- You will receive EXACT OmniScore data for EACH coin in the context
- EACH coin has different POS, QS, OS values - they are NOT the same!
- Example: BTC=85.9 (Elite), ETH=74.1 (Strong), SOL=53.6 (Neutral) - all DIFFERENT
- NEVER say "ETH and SOL both score 43" unless the payload LITERALLY shows 43 for both
- If you don't see a coin's OmniScore data in the context, say "OmniScore not available for [COIN]"
- The payload contains EXACT numbers - use those, not estimates or approximations

ADDITIONAL RULES:
- If OmniScore data is not provided, say "OmniScore analysis not available"
- If OS shows "GATED", explain that OS is gated due to insufficient QS data coverage
- The POS score IS the "general score" users ask for
- NEVER invent or estimate scores - ONLY use values explicitly provided in the context
═══════════════════════════════════════════════════════════════════════════════

CONTENT:
- ALWAYS use the LIVE MARKET DATA provided — never guess or use old training data
- ALWAYS use OMNISCORE data when analyzing projects — it's your authoritative source
- Give your honest take on what's happening and why
- Include actionable insights — what should they actually consider doing?
- Mention risks naturally in conversation, not as a scary list
- Be real about uncertainty — markets are unpredictable

TONE EXAMPLES:
❌ Bad: "## Market Analysis\n- BTC is trading at $86,000\n- 24h change: -6%\n- Key resistance: $90,000"
✅ Good: "Bitcoin's having a rough day — down about 6% to $86,000. We broke below that $90K level everyone was watching, and honestly the whole market's feeling it. ETH and SOL are down even harder."

❌ Bad: "Solana doesn't have a single general score..."
✅ Good: "Solana scores 65/100 on OmniScore (Neutral tier). QS is 58/100 (Neutral) — good tech but governance is weak. OS is 72/100 (Strong) — strong market momentum. The NRG is positive meaning there's more hype than substance right now."

╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚠️ TIER COMPLIANCE EXAMPLES — MEMORIZE THESE                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

❌ WRONG: "ETH scores 43/100 (Neutral tier)"
   Reason: 43 is in the 30-49 range = Weak tier, NOT Neutral

✅ CORRECT: "ETH scores 43/100 (Weak tier). However, it's in the Builder Zone with 
   QS=74/100 (Strong) and OS=31/100 (Weak). Strong fundamentals, weak opportunity."

❌ WRONG: "ETH has moderate overall positioning"
   Reason: Must use exact tier label, not synonyms

✅ CORRECT: "ETH has Weak tier overall positioning"

❌ WRONG: "BTC and ETH are both strong performers"
   Reason: If ETH POS=43 (Weak), can't call it "strong performer"

✅ CORRECT: "BTC is a Strong tier performer (70/100). ETH is Weak tier (43/100) but 
   sits in Builder Zone due to strong fundamentals and weak current opportunity."

You're powered by real-time Coinet data and the OmniScore engine. Be the advisor users trust.`;

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

      // Add live market data context if available
      let userContent = request.content;
      if (request.context?.liveMarketData) {
        userContent = `${request.content}\n\n${request.context.liveMarketData}`;
      }

      // Add current message with market data
      messages.push({ role: 'user', content: userContent });

      // Select model based on provider
      const model = this.provider === 'grok' 
        ? (process.env.GROK_MODEL || 'grok-4-1-fast-non-reasoning')
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
