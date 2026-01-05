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
 * 
 * @version 1.0.0 - MVP with rule-based classification
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
  | 'learning';

export type DataDepth = 'minimal' | 'medium' | 'full';

export type ResponseShape = 
  | 'one_liner'      // Quick answer: 1-2 sentences + 2 bullets
  | 'three_block'    // Decision help: Answer, Why (3 bullets), Next step
  | 'dashboard'      // Deep analysis: Full metrics and breakdown
  | 'diagnostic'     // Troubleshoot: Acknowledge, diagnose, fallback
  | 'story';         // Learning: Analogy-based explanation

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
};

// Response shape and depth mappings
const INTENT_CONFIG: Record<IntentType, { depth: DataDepth; shape: ResponseShape }> = {
  quick_answer: { depth: 'minimal', shape: 'one_liner' },
  decision_help: { depth: 'medium', shape: 'three_block' },
  deep_analysis: { depth: 'full', shape: 'dashboard' },
  troubleshoot: { depth: 'minimal', shape: 'diagnostic' },
  learning: { depth: 'minimal', shape: 'story' },
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
  };
  return descriptions[intent];
}

/**
 * Get formatting instructions for AI based on intent
 */
export function getResponseFormatInstructions(intent: IntentType): string {
  const instructions: Record<IntentType, string> = {
    quick_answer: `RESPONSE FORMAT: Quick Answer
- Lead with the direct answer in 1-2 sentences
- Include ONE key signal or context point
- Total response: 3-4 sentences maximum
- Be crisp and actionable`,

    decision_help: `RESPONSE FORMAT: 3-Block Decision Framework
BLOCK 1 (Answer): Your clear recommendation in 1-3 sentences
BLOCK 2 (Why): Exactly 3 bullet points with key signals supporting your view
BLOCK 3 (Next Step): One specific action or follow-up question
- Keep total length moderate - respect the user's time`,

    deep_analysis: `RESPONSE FORMAT: Comprehensive Analysis
- Provide full OmniScore breakdown with exact numbers
- Include QS, OS, POS, quadrant position, and risk assessment
- Reference all relevant metrics from the data
- Structure with clear sections if comparing multiple assets
- Be thorough but organized`,

    troubleshoot: `RESPONSE FORMAT: Diagnostic Response
LINE 1: Acknowledge the issue with empathy ("I see the problem...")
LINE 2: Explain what's happening or what went wrong
LINE 3-4: Provide actionable solution or workaround
- Never expose technical errors to user
- Always offer a next step even if data is unavailable`,

    learning: `RESPONSE FORMAT: Educational Explanation
- Start with a relatable analogy or simple definition
- Build complexity gradually
- Use "imagine..." or "think of it like..." framing
- Offer to go deeper: "Want me to explain [specific aspect] in more detail?"
- Avoid jargon unless explaining it`,
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
