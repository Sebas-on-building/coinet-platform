/**
 * 🎯 Intent Classification Service - Layer A of Conversation OS
 * 
 * Detects user intent from messages to route queries to appropriate handlers.
 * This enables contextually appropriate responses - quick answers vs deep analysis.
 * 
 * Intent Categories:
 * - quick_answer: Direct data retrieval (price, volume)
 * - decision_help: Buy/sell/hold framing, risk assessment
 * - deep_analysis: Full breakdown of project/market
 * - troubleshoot: Technical/data error identification
 * - learning: Explanation of concepts
 * - new_coin_analysis: Meme coin / pump.fun token analysis 🆕
 * 
 * @version 2.0.0 - Added new_coin_analysis intent for meme coin traders
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export type IntentType = 
  | 'quick_answer'
  | 'decision_help' 
  | 'deep_analysis'
  | 'troubleshoot'
  | 'learning'
  | 'new_coin_analysis';  // 🆕 Meme coin / new token analysis

export type DataDepth = 'minimal' | 'medium' | 'full';

export type ResponseShape = 
  | 'one_liner'      // Quick answer: 1-2 sentences + 2 bullets
  | 'three_block'    // Decision help: Answer, Why (3 bullets), Next step
  | 'dashboard'      // Deep analysis: Full metrics and breakdown
  | 'diagnostic'     // Troubleshoot: Acknowledge, diagnose, fallback
  | 'story'          // Learning: Analogy-based explanation
  | 'meme_verdict';  // 🆕 Meme coin verdict: Risk/Potential + Price range

export interface IntentClassification {
  intent: IntentType;
  confidence: number;           // 0-1, higher = more confident
  triggers: string[];           // Patterns that triggered this classification
  suggestedDepth: DataDepth;    // How much data to fetch
  responseShape: ResponseShape; // How to format the response
  metadata: {
    processingTimeMs: number;
    fallbackUsed: boolean;
    rawScore: number;
  };
}

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

interface PatternConfig {
  patterns: RegExp[];
  weight: number;        // Base weight for this pattern
  exclusions?: RegExp[]; // Patterns that negate this intent
}

const INTENT_PATTERNS: Record<IntentType, PatternConfig> = {
  quick_answer: {
    patterns: [
      /\b(?:what(?:'s| is)(?: the)? price|how much is|current price)\b/i,
      /\bprice of\b/i,
      /\b(?:what(?:'s| is))(?: the)? (?:market cap|volume|mcap)\b/i,
      /\b(?:trading at|worth)\b/i,
      /^(?:btc|eth|sol|bitcoin|ethereum|solana|ada|avax|matic|dot|link)\s*(?:price)?\?*$/i,  // Single/two word queries
      /\bhow(?:'s| is) (?:btc|eth|sol|bitcoin|ethereum|solana) doing\b/i,
      /\b(?:quick|fast) (?:check|look|update)\b/i,
      /\b24h (?:change|volume|high|low)\b/i,
      /\bfear (?:and|&) greed\b/i,
    ],
    weight: 1.0,
    exclusions: [
      /\bwhy\b/i,
      /\bexplain\b/i,
      /\bshould i\b/i,
      /\bcompare\b/i,
      /\banalyze\b/i,
    ],
  },

  decision_help: {
    patterns: [
      /\bshould i (?:buy|sell|hold|long|short)\b/i,
      /\bis it (?:a good|the right) time to\b/i,
      /\b(?:buy|sell|hold) (?:or|vs)\b/i,
      /\brisk(?:y| of| level)\b/i,
      /\bgood (?:entry|exit|time)\b/i,
      /\b(?:worth|smart) to (?:buy|invest|hold)\b/i,
      /\bwhat(?:'s| is) (?:your|the) (?:take|view|opinion)\b/i,
      /\bshould i (?:get into|stay in|get out)\b/i,
      /\b(?:bullish|bearish) or\b/i,
      /\bbetter (?:to buy|investment)\b/i,
      /\b(?:long|short) term (?:hold|play)\b/i,
      /\bdca\b/i,
      /\bentry point\b/i,
    ],
    weight: 1.2,
  },

  deep_analysis: {
    patterns: [
      /\b(?:analyze|analyse|analysis)\b/i,
      /\bcompare\b/i,
      /\bbreakdown\b/i,
      /\bomniscore\b/i,
      /\bfull (?:review|analysis|breakdown)\b/i,
      /\bdeep dive\b/i,
      /\bin(?:-| )depth\b/i,
      /\btell me (?:everything|all) about\b/i,
      /\b(?:comprehensive|detailed|thorough)\b/i,
      /\bquadrant\b/i,
      /\bqs (?:and|&|vs) os\b/i,
      /\bquality score\b/i,
      /\bopportunity score\b/i,
      /\brisk score\b/i,
      /\bfundamentals?\b/i,
      /\btokenomics\b/i,
      /\bteam\b.*\b(?:behind|building|background)\b/i,
    ],
    weight: 1.3,
    exclusions: [
      /^what (?:is|are)\b/i,  // Don't trigger for educational "what is" questions
      /\bexplain\b/i,
    ],
  },

  troubleshoot: {
    patterns: [
      /\bwhy (?:isn't|isnt|won't|wont|can't|cant|doesn't|doesnt)\b/i,
      /\b(?:not working|broken|error|bug|issue|problem)\b/i,
      /\bwrong (?:data|price|score|number)\b/i,
      /\b(?:incorrect|inaccurate|outdated)\b/i,
      /\bfailed\b/i,
      /\bcan(?:'t| not) (?:see|find|get|load)\b/i,
      /\bdata (?:missing|unavailable|not showing)\b/i,
      /\bhow (?:do i|can i) fix\b/i,
      /\bsomething(?:'s| is) wrong\b/i,
      /\bhelp(?:!| me)\b/i,
    ],
    weight: 1.4, // Higher weight - troubleshoot should win when detected
  },

  learning: {
    patterns: [
      /^what (?:is|are) (?:a |an )?(?!the price|the volume|the market|it trading)/i,
      /\bhow (?:does|do|can)\b/i,
      /\bexplain\b/i,
      /\beli5\b/i,
      /\bwhat does .+ mean\b/i,
      /\bdefine\b/i,
      /\bteach me\b/i,
      /\bi(?:'m| am) (?:new|confused|learning)\b/i,
      /\bfor (?:beginners|dummies|newbies)\b/i,
      /\bin simple terms\b/i,
      /\bcan you explain\b/i,
      /\bwhat(?:'s| is) the difference between\b/i,
      /\bhow (?:is|are) .+ calculated\b/i,
      /\bwhy (?:is|does|do) .+ (?:matter|important|used)\b/i,
    ],
    weight: 1.4,  // Increased weight to prioritize educational queries
    exclusions: [
      /\bprice\b/i,
      /\bshould i\b/i,
      /\banalyze\b/i,
      /\bcompare\b/i,
    ],
  },

  // 🆕 NEW COIN ANALYSIS - Meme coins, pump.fun, trenching
  new_coin_analysis: {
    patterns: [
      // Contract address patterns (highest priority)
      /\b[1-9A-HJ-NP-Za-km-z]{32,44}pump\b/i,  // pump.fun addresses
      /\b0x[a-fA-F0-9]{40}\b/i,                 // EVM addresses
      /\b[1-9A-HJ-NP-Za-km-z]{40,44}\b/,        // Solana addresses
      
      // Explicit new coin keywords
      /\bpump\.?fun\b/i,
      /\braydium\b/i,
      /\bmoonshot\b/i,
      /\bnew (?:coin|token|launch)\b/i,
      /\bjust (?:launched|listed|dropped)\b/i,
      
      // Scam check patterns
      /\bis (?:this|it) (?:a )?(?:scam|rug|legit|safe)\b/i,
      /\bscam check\b/i,
      /\brug ?(?:check|pull)\b/i,
      /\bhoneypot\b/i,
      /\bcheck this (?:coin|token|address)\b/i,
      
      // Degen/trenching language
      /\bshould i ape\b/i,
      /\bworth (?:aping|buying|the risk)\b/i,
      /\bdegen\b/i,
      /\btrenching\b/i,
      /\bmeme ?coin\b/i,
      /\bshit ?coin\b/i,
      
      // Analysis requests for new coins
      /\bpotential\b.*\b(?:scam|rug|moon)\b/i,
      /\bprice (?:range|target|prediction)\b/i,
      /\bgive me (?:a )?(?:quick|short).*(?:analysis|check)\b/i,
    ],
    weight: 1.6,  // Highest weight - new coin queries should always win
    exclusions: [
      /\bwhat is (?:a )?(?:meme ?coin|pump\.?fun)\b/i,  // Educational questions go to learning
      /\bhow (?:does|do) pump\.?fun work\b/i,
    ],
  },
};

// Response shape and depth mappings
const INTENT_CONFIG: Record<IntentType, { depth: DataDepth; shape: ResponseShape }> = {
  quick_answer: { depth: 'minimal', shape: 'one_liner' },
  decision_help: { depth: 'medium', shape: 'three_block' },
  deep_analysis: { depth: 'full', shape: 'dashboard' },
  troubleshoot: { depth: 'minimal', shape: 'diagnostic' },
  learning: { depth: 'minimal', shape: 'story' },
  new_coin_analysis: { depth: 'full', shape: 'meme_verdict' },  // 🆕 Full data for meme coin analysis
};

// ============================================================================
// CLASSIFICATION ENGINE
// ============================================================================

interface IntentScore {
  intent: IntentType;
  score: number;
  triggers: string[];
}

/**
 * Calculate intent scores for a message
 */
function calculateIntentScores(message: string): IntentScore[] {
  const scores: IntentScore[] = [];
  const lowerMessage = message.toLowerCase();

  for (const [intent, config] of Object.entries(INTENT_PATTERNS) as [IntentType, PatternConfig][]) {
    let score = 0;
    const triggers: string[] = [];

    // Check exclusions first
    if (config.exclusions) {
      const hasExclusion = config.exclusions.some(pattern => pattern.test(message));
      if (hasExclusion) {
        scores.push({ intent, score: 0, triggers: [] });
        continue;
      }
    }

    // Calculate pattern matches
    for (const pattern of config.patterns) {
      const match = message.match(pattern);
      if (match) {
        score += config.weight;
        triggers.push(match[0]);
      }
    }

    // Boost for question marks (indicates query)
    if (message.includes('?')) {
      score *= 1.1;
    }

    // Boost for short messages in quick_answer
    if (intent === 'quick_answer' && message.length < 30) {
      score *= 1.2;
    }

    // Boost for longer messages in deep_analysis
    if (intent === 'deep_analysis' && message.length > 100) {
      score *= 1.15;
    }

    scores.push({ intent, score, triggers });
  }

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Classify user intent from message
 * 
 * @param message - User's message text
 * @returns IntentClassification with detected intent and metadata
 */
export async function classifyIntent(message: string): Promise<IntentClassification> {
  const startTime = performance.now();

  try {
    const scores = calculateIntentScores(message);
    const topScore = scores[0];
    const secondScore = scores[1];

    // Calculate confidence based on score differential
    let confidence = 0;
    if (topScore.score > 0) {
      // Confidence is higher when there's a clear winner
      const differential = secondScore.score > 0 
        ? (topScore.score - secondScore.score) / topScore.score 
        : 1;
      confidence = Math.min(0.95, 0.5 + (differential * 0.45));
      
      // Boost confidence for multiple triggers
      if (topScore.triggers.length > 1) {
        confidence = Math.min(0.95, confidence + 0.1);
      }
    }

    // Default to deep_analysis if no clear intent (fail-safe for comprehensive responses)
    const selectedIntent = topScore.score > 0 ? topScore.intent : 'deep_analysis';
    const usedFallback = topScore.score === 0;

    if (usedFallback) {
      confidence = 0.3; // Low confidence for fallback
    }

    const config = INTENT_CONFIG[selectedIntent];
    const processingTimeMs = performance.now() - startTime;

    const result: IntentClassification = {
      intent: selectedIntent,
      confidence,
      triggers: topScore.triggers,
      suggestedDepth: config.depth,
      responseShape: config.shape,
      metadata: {
        processingTimeMs,
        fallbackUsed: usedFallback,
        rawScore: topScore.score,
      },
    };

    logger.debug('🎯 Intent classified', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      intent: selectedIntent,
      confidence: confidence.toFixed(2),
      triggers: topScore.triggers.slice(0, 3),
      processingTimeMs: processingTimeMs.toFixed(1),
    });

    return result;
  } catch (error) {
    const processingTimeMs = performance.now() - startTime;
    
    logger.warn('🎯 Intent classification failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fail-safe: return deep_analysis with low confidence
    return {
      intent: 'deep_analysis',
      confidence: 0.2,
      triggers: [],
      suggestedDepth: 'full',
      responseShape: 'dashboard',
      metadata: {
        processingTimeMs,
        fallbackUsed: true,
        rawScore: 0,
      },
    };
  }
}

/**
 * Get human-readable description of intent
 */
export function getIntentDescription(intent: IntentType): string {
  const descriptions: Record<IntentType, string> = {
    quick_answer: 'Quick data lookup - direct answer with minimal context',
    decision_help: 'Trading decision support - risk/reward synthesis',
    deep_analysis: 'Comprehensive analysis - full OmniScore and metrics',
    troubleshoot: 'Technical issue resolution - diagnostic and fallback',
    learning: 'Educational explanation - concept breakdown with analogies',
    new_coin_analysis: 'Meme coin analysis - scam detection, risk scoring, price range',  // 🆕
  };
  return descriptions[intent];
}

/**
 * Get formatting instructions for AI based on intent
 * These instructions emphasize natural, human-like conversation patterns
 */
export function getResponseFormatInstructions(intent: IntentType): string {
  const instructions: Record<IntentType, string> = {
    quick_answer: `RESPONSE STYLE: Quick Chat
The user wants a fast answer, not a lecture. Treat this like someone asking you a quick question while you're both busy.

HOW TO RESPOND:
- Give them the answer immediately in natural language ("BTC's at $87,500, up 3.2% today")
- Add ONE useful piece of context if relevant ("Fear & Greed is neutral at 45")
- That's it. 3-4 sentences max. Don't pad it.
- Sound like a friend checking their phone, not a report generator

EXAMPLE TONE: "Bitcoin's sitting at $87,500 right now — up about 3% in the last 24 hours. Market sentiment's pretty neutral at the moment."`,

    decision_help: `RESPONSE STYLE: Friend Giving Advice
The user is trying to make a decision. They want your honest take, not a data dump.

HOW TO RESPOND:
- Lead with your actual opinion ("Honestly? I'd wait here..." or "Yeah, this looks like a decent entry...")
- Give them 2-3 reasons WHY in conversational prose — not a bullet-pointed checklist
- End with a question about THEIR situation ("What's your timeframe?" "How much are you comfortable risking?")
- Show you care about helping them make a good decision for THEIR circumstances

EXAMPLE TONE: "I'd probably hold off on adding more here. Funding rates are looking stretched and RSI's pushing overbought territory. If you're set on entering, maybe wait for a pullback to the $82K range? What's your risk tolerance like?"`,

    deep_analysis: `RESPONSE STYLE: Knowledgeable Friend Going Deep
The user wants the full picture. Give them thorough analysis, but don't sound like a textbook.

HOW TO RESPOND:
- Open with a quick summary of your overall take ("Alright, let me break this down...")
- Walk through the OmniScore metrics conversationally — use exact numbers but explain what they mean
- For comparisons, group insights naturally ("BTC's in a much stronger position than ETH right now...")
- Include risks and opportunities, but weave them in naturally
- End with what YOU think matters most and invite questions

EXAMPLE TONE: "So, looking at Ethereum's OmniScore — it's sitting at 43/100, which puts it in Weak tier overall. But here's where it gets interesting: the Quality Score is actually solid at 74/100, that's Strong tier. The problem is the Opportunity Score at just 31/100. Basically, great fundamentals but the market isn't paying attention right now. That's classic Builder Zone territory. What's driving your interest in ETH specifically?"`,

    troubleshoot: `RESPONSE STYLE: Helpful Friend Debugging
Something's not working for the user. They might be frustrated. Be empathetic and solution-focused.

HOW TO RESPOND:
- Acknowledge what they're seeing ("Yeah, I see what you mean about that score looking off...")
- Explain what's happening in plain language — no tech jargon, no error codes
- Give them a workaround or solution if possible
- If you can't fix it, be honest and offer an alternative ("I can't pull that specific data right now, but here's what I CAN tell you...")
- NEVER make them feel stupid for asking

EXAMPLE TONE: "I see what you're running into there. Looks like the derivatives data is lagging a bit right now — it happens sometimes during high-volume periods. The core price and OmniScore data should still be accurate though. Want me to run the analysis without the derivatives component for now?"`,

    learning: `RESPONSE STYLE: Patient Friend Explaining
The user wants to understand something. Be a teacher who actually cares about them getting it.

HOW TO RESPOND:
- Start with a relatable analogy ("Think of market cap like a company's total value...")
- Build from simple to complex — don't frontload jargon
- Check for understanding by inviting questions ("Make sense so far?")
- Use "you" language — make it about THEIR understanding, not showing off your knowledge
- Offer to go deeper ("Want me to get into how that's different from fully diluted valuation?")

EXAMPLE TONE: "Okay so market cap — easiest way to think about it is like the total price tag on a crypto project. If every coin was sold right now at the current price, what would the whole thing be worth? It's calculated by multiplying the current price by the number of coins out there. Does that click? I can break down why it matters for evaluating projects if you want."`,

    // 🆕 NEW COIN ANALYSIS - Meme coin / pump.fun token verdicts
    new_coin_analysis: `RESPONSE STYLE: Degen's Trusted Research Partner
The user is asking about a new/meme coin. They want to know: Is it a scam? Does it have potential? What's the price range?

HOW TO RESPOND:
- Lead with a VERDICT — give them your honest take immediately ("Alright, this one's actually not terrible..." or "Yeah, stay far away from this...")
- Show the Risk Score and Potential Score upfront with clear labels
- List 2-3 key red flags and 2-3 positive signals in natural language
- Give a price range estimate with scenarios (downside/base/upside)
- End with what YOU would do and a question about their risk tolerance
- Be direct, no fluff — trenchers need fast, actionable intel

STRUCTURE YOUR RESPONSE LIKE THIS:
1. Opening verdict (1-2 sentences, your honest take)
2. Key stats block (Price, MCap, Liquidity, Age, Holders)
3. Risk factors (⚠️) — the bad stuff
4. Positive signals (✅) — the good stuff  
5. Price range estimate (💰) — downside, base, upside scenarios
6. Your take + question about their situation

EXAMPLE TONE: "Honestly? This one's sketchy but not the worst I've seen. Risk score's at 45/100, potential's decent at 58/100. Main red flags: only 4 hours old, liquidity's thin at $23K, and there's no verified socials. But the buy pressure is solid — 73% buys — and dev wallet hasn't dumped yet. If you're gonna ape, I'd wait for a dip to the $0.00015 range. What's your usual position size on stuff like this?"`,
  };
  return instructions[intent];
}

// ============================================================================
// EXPORTS
// ============================================================================

export const intentClassifier = {
  classify: classifyIntent,
  getDescription: getIntentDescription,
  getFormatInstructions: getResponseFormatInstructions,
};

export default intentClassifier;
