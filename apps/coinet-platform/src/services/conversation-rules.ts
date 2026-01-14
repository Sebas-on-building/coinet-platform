/**
 * 🎯 Conversation Rules Engine v1.0
 * 
 * Implements three hard rules for natural, human-like conversation:
 * 
 * RULE A: Intent & Energy Matching
 *   - Classify every message into intent bucket + energy level
 *   - Response MUST match the user's mode
 * 
 * RULE B: "Small answer → offer depth" layering
 *   - Layer 1: Minimum useful response (1-3 lines)
 *   - Layer 2: Single "depth offer" line
 *   - User chooses to go deeper
 * 
 * RULE C: One question max at the end
 *   - Exactly ONE question mark per message
 *   - Move the conversation forward with minimal friction
 * 
 * @version 1.0.0
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Intent Buckets - What the user wants
 */
export type IntentBucket = 
  | 'social'      // Greetings, small talk, "hey", "yo", "lol", emojis
  | 'command'     // "give me overview", "check SOL", "price BTC"
  | 'question'    // "why did it dump?", "what does funding mean?"
  | 'decision'    // "should I buy?", "sell?", "what's the play?"
  | 'meta';       // "your data is wrong", "how do you calculate?"

/**
 * Energy Levels - How fast the user wants it
 */
export type EnergyLevel = 
  | 'low'     // 1-3 words, casual, no punctuation ("hey", "overview", "btc?")
  | 'normal'  // Clear sentence, direct request
  | 'high';   // Urgent words, caps, frustration, lots of detail

/**
 * Response verbosity based on energy
 */
export type VerbosityMode = 'tiny' | 'small' | 'medium' | 'full';

/**
 * Classification result
 */
export interface ConversationClassification {
  intent: IntentBucket;
  energy: EnergyLevel;
  verbosity: VerbosityMode;
  confidence: number;
  triggers: string[];
  responseConstraints: ResponseConstraints;
}

/**
 * Hard constraints for the response
 */
export interface ResponseConstraints {
  maxLines: number;
  maxNumbers: number;
  requiresDepthOffer: boolean;
  depthOfferType: DepthOfferType | null;
  questionType: QuestionType | null;
  forbiddenPatterns: string[];
}

/**
 * Types of depth offers
 */
export type DepthOfferType = 
  | 'vibe_or_numbers'    // "Want the quick vibe or the exact numbers?"
  | 'levels_or_direction' // "Want levels + setups, or just direction?"
  | 'short_or_deep'      // "Want the short version or a deep dive?"
  | 'metrics_offer';     // "Want the metrics to confirm?"

/**
 * Types of follow-up questions (only ONE allowed)
 */
export type QuestionType =
  | 'scope'      // "Quick pulse or deep dive?"
  | 'asset'      // "Which coin are you watching?"
  | 'goal'       // "Are you looking for entries or just direction?"
  | 'timeframe'; // "Scalp today or swing?"

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

const INTENT_PATTERNS: Record<IntentBucket, { patterns: RegExp[]; weight: number }> = {
  social: {
    patterns: [
      /^(?:hey|hi|hello|yo|sup|gm|gn|wassup|what'?s up)[\s\?!\.]*$/i,
      /^(?:how are you|how'?s it going|what'?s good)[\s\?]*$/i,
      /^(?:lol|lmao|haha|nice|cool|thanks|ty|thx)[\s!\.]*$/i,
      /^(?:bro|dude|fam|man|bruh)[\s,\?!\.]*$/i,
      /^[^\w]*(?:👋|😊|🙏|😂|🔥|💯|😎|🤙)+[^\w]*$/,
      /^(?:u there|you there|anyone|hello\??)[\s\?]*$/i,
      /^(?:ok|okay|alright|sure|yep|yeah|yea|ya)[\s!\.]*$/i,
    ],
    weight: 2.0,
  },
  
  command: {
    patterns: [
      /\b(?:give me|show me|get me|pull up)\b/i,
      /\b(?:overview|summary|update|status|check)\b/i,
      /\b(?:price|prices) (?:of |for )?/i,
      /^(?:btc|eth|sol|bitcoin|ethereum|solana)\s*\??$/i,
      /\b(?:market|markets)\b/i,
      /\b(?:compare|versus|vs)\b/i,
      /\b(?:top|best|worst)\s+\d+/i,
      /^[A-Z]{2,5}\s*\??$/,  // Single ticker like "BTC?" or "SOL"
    ],
    weight: 1.5,
  },
  
  question: {
    patterns: [
      /\bwhy\s+(?:did|does|is|are|has|have|was|were)\b/i,
      /\bwhat\s+(?:does|is|are|causes?|happened|made)\b/i,
      /\bhow\s+(?:does|do|did|can|should|would)\b/i,
      /\bwhat'?s\s+(?:the|a|an)\s+\w+\??$/i,
      /\bexplain\b/i,
      /\bmean(?:s|ing)?\b/i,
      /\bwork(?:s|ing)?\b.*\?/i,
    ],
    weight: 1.3,
  },
  
  decision: {
    patterns: [
      /\bshould\s+i\b/i,
      /\b(?:buy|sell|hold|long|short)\s*\??$/i,
      /\bis\s+(?:it|this|now)\s+(?:a\s+)?good\s+time\b/i,
      /\bwhat'?s\s+the\s+play\b/i,
      /\bwhat\s+(?:would|should)\s+you\s+do\b/i,
      /\brisk\b/i,
      /\bentry\b/i,
      /\bworth\s+(?:it|buying|holding)\b/i,
      /\bbullish\s+or\s+bearish\b/i,
    ],
    weight: 1.4,
  },
  
  meta: {
    patterns: [
      /\b(?:your|the)\s+(?:data|numbers?|scores?)\s+(?:is|are|seems?)\s+(?:wrong|off|incorrect|outdated)\b/i,
      /\bhow\s+(?:do|does)\s+(?:you|coinet|omniscore)\s+(?:calculate|work|get)\b/i,
      /\b(?:fix|update|correct)\b/i,
      /\bbug\b/i,
      /\berror\b/i,
      /\bwhy\s+(?:is|are)\s+(?:your|the)\b/i,
    ],
    weight: 1.6,
  },
};

const ENERGY_PATTERNS: Record<EnergyLevel, { patterns: RegExp[]; maxWords?: number }> = {
  low: {
    patterns: [
      /^[a-z\s\$]{1,15}[\?\!]?$/i,  // Very short, lowercase
      /^[A-Z]{2,5}\s*\??$/,          // Single ticker
      /^(?:hey|hi|yo|sup|gm|overview|update|price)\s*\??$/i,
    ],
    maxWords: 3,
  },
  
  normal: {
    patterns: [
      /[A-Z][a-z]/,  // Has proper capitalization
      /\.\s/,        // Has sentence structure
      /,\s/,         // Has commas
    ],
  },
  
  high: {
    patterns: [
      /[A-Z]{3,}/,                    // Multiple caps
      /[\!\?]{2,}/,                   // Multiple punctuation
      /\b(?:now|quick|urgent|asap|help|please)\b/i,
      /\b(?:wtf|seriously|come on)\b/i,
      /.{150,}/,                      // Long message
    ],
  },
};

// ============================================================================
// CLASSIFICATION ENGINE
// ============================================================================

/**
 * Count words in a message
 */
function countWords(message: string): number {
  return message.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Detect energy level from message
 */
function detectEnergy(message: string): EnergyLevel {
  const wordCount = countWords(message);
  const trimmed = message.trim();
  
  // Check for high energy first (urgency indicators)
  for (const pattern of ENERGY_PATTERNS.high.patterns) {
    if (pattern.test(trimmed)) {
      return 'high';
    }
  }
  
  // Check for low energy (very short, casual)
  if (wordCount <= 3) {
    return 'low';
  }
  
  // Check explicit low patterns
  for (const pattern of ENERGY_PATTERNS.low.patterns) {
    if (pattern.test(trimmed)) {
      return 'low';
    }
  }
  
  // Default to normal
  return 'normal';
}

/**
 * Detect intent bucket from message
 */
function detectIntent(message: string): { intent: IntentBucket; confidence: number; triggers: string[] } {
  const scores: Array<{ intent: IntentBucket; score: number; triggers: string[] }> = [];
  
  for (const [intent, config] of Object.entries(INTENT_PATTERNS) as [IntentBucket, { patterns: RegExp[]; weight: number }][]) {
    let score = 0;
    const triggers: string[] = [];
    
    for (const pattern of config.patterns) {
      const match = message.match(pattern);
      if (match) {
        score += config.weight;
        triggers.push(match[0].substring(0, 20));
      }
    }
    
    scores.push({ intent, score, triggers });
  }
  
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1];
  
  // Calculate confidence
  let confidence = 0;
  if (top.score > 0) {
    const differential = second.score > 0 ? (top.score - second.score) / top.score : 1;
    confidence = Math.min(0.95, 0.5 + (differential * 0.45));
  }
  
  // Default to command if no clear match (safest fallback)
  if (top.score === 0) {
    return { intent: 'command', confidence: 0.3, triggers: [] };
  }
  
  return { intent: top.intent, confidence, triggers: top.triggers };
}

/**
 * Determine verbosity mode from intent and energy
 */
function getVerbosityMode(intent: IntentBucket, energy: EnergyLevel): VerbosityMode {
  // Social is always tiny regardless of energy
  if (intent === 'social') return 'tiny';
  
  // Low energy = tiny/small responses
  if (energy === 'low') {
    return intent === 'decision' ? 'small' : 'tiny';
  }
  
  // High energy + question/decision = medium (they want depth)
  if (energy === 'high' && (intent === 'question' || intent === 'decision')) {
    return 'medium';
  }
  
  // Normal energy
  if (energy === 'normal') {
    if (intent === 'command') return 'small';
    if (intent === 'question') return 'small';
    if (intent === 'decision') return 'medium';
    if (intent === 'meta') return 'medium';
  }
  
  return 'small';
}

/**
 * Get appropriate depth offer type
 */
function getDepthOfferType(intent: IntentBucket): DepthOfferType | null {
  switch (intent) {
    case 'social': return null;  // No depth offer for social
    case 'command': return 'vibe_or_numbers';
    case 'question': return 'metrics_offer';
    case 'decision': return 'levels_or_direction';
    case 'meta': return 'short_or_deep';
  }
}

/**
 * Get appropriate question type for follow-up
 */
function getQuestionType(intent: IntentBucket, message: string): QuestionType | null {
  // Social intent → ask about intent (scope)
  if (intent === 'social') return 'scope';
  
  // If no coin detected in message, ask about asset
  const hasCoinMention = /\b(?:btc|eth|sol|bitcoin|ethereum|solana|ada|avax|matic|dot|link|xrp|bnb)\b/i.test(message);
  if (intent === 'command' && !hasCoinMention) return 'asset';
  
  // Decision intent → ask about goal or timeframe
  if (intent === 'decision') return 'timeframe';
  
  // Question intent → offer to go deeper
  if (intent === 'question') return 'scope';
  
  // Meta → no question needed usually
  if (intent === 'meta') return null;
  
  return 'scope';
}

/**
 * Build response constraints based on classification
 */
function buildConstraints(
  intent: IntentBucket, 
  energy: EnergyLevel, 
  verbosity: VerbosityMode,
  message: string
): ResponseConstraints {
  const constraints: ResponseConstraints = {
    maxLines: 3,
    maxNumbers: 2,
    requiresDepthOffer: true,
    depthOfferType: getDepthOfferType(intent),
    questionType: getQuestionType(intent, message),
    forbiddenPatterns: [],
  };
  
  // Adjust based on verbosity
  switch (verbosity) {
    case 'tiny':
      constraints.maxLines = 2;
      constraints.maxNumbers = 1;
      constraints.requiresDepthOffer = intent !== 'social';
      break;
    case 'small':
      constraints.maxLines = 4;
      constraints.maxNumbers = 2;
      break;
    case 'medium':
      constraints.maxLines = 8;
      constraints.maxNumbers = 5;
      break;
    case 'full':
      constraints.maxLines = 15;
      constraints.maxNumbers = 10;
      constraints.requiresDepthOffer = false;
      break;
  }
  
  // Social intent: NEVER output market stats
  if (intent === 'social') {
    constraints.maxNumbers = 0;
    constraints.forbiddenPatterns = [
      'BTC', 'ETH', 'market cap', 'price', 'volume', '24h', 
      'OmniScore', 'funding', 'liquidation', '$'
    ];
  }
  
  return constraints;
}

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Classify a user message according to the three conversation rules.
 * 
 * RULE A: Intent & Energy Matching
 * RULE B: Small answer → offer depth
 * RULE C: One question max
 */
export function classifyConversation(message: string): ConversationClassification {
  const startTime = performance.now();
  
  const { intent, confidence, triggers } = detectIntent(message);
  const energy = detectEnergy(message);
  const verbosity = getVerbosityMode(intent, energy);
  const constraints = buildConstraints(intent, energy, verbosity, message);
  
  const classification: ConversationClassification = {
    intent,
    energy,
    verbosity,
    confidence,
    triggers,
    responseConstraints: constraints,
  };
  
  logger.debug('🎯 Conversation classified', {
    message: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
    intent,
    energy,
    verbosity,
    confidence: confidence.toFixed(2),
    processingMs: (performance.now() - startTime).toFixed(1),
  });
  
  return classification;
}

// ============================================================================
// RESPONSE GUIDANCE GENERATOR
// ============================================================================

/**
 * Generate the system prompt guidance for the AI based on classification.
 * This enforces the three hard rules.
 */
export function generateResponseGuidance(classification: ConversationClassification): string {
  const { intent, energy, verbosity, responseConstraints: c } = classification;
  
  let guidance = `
═══════════════════════════════════════════════════════════════════════════════
🎯 CONVERSATION RULES — MANDATORY COMPLIANCE
═══════════════════════════════════════════════════════════════════════════════

DETECTED MODE:
• Intent: ${intent.toUpperCase()} (${getIntentDescription(intent)})
• Energy: ${energy.toUpperCase()} (user wants ${energy === 'low' ? 'minimal' : energy === 'high' ? 'thorough' : 'balanced'} response)
• Verbosity: ${verbosity.toUpperCase()} mode

═══════════════════════════════════════════════════════════════════════════════
RULE A — INTENT MATCHING (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════
`;

  // Intent-specific guidance
  switch (intent) {
    case 'social':
      guidance += `
🚫 HARD FAIL: This is a SOCIAL/GREETING message. DO NOT output any market data.
✅ REQUIRED: Greet naturally + ask ONE question to discover intent.
📝 EXAMPLE: "Yo — what's up. You here for markets or something else?"
`;
      break;
      
    case 'command':
      guidance += `
✅ This is a COMMAND. Deliver what they asked for, nothing more.
📝 FORMAT: [Answer] + [1 context line] + [optional depth offer]
🚫 DO NOT: Add unsolicited metrics, explanations, or lectures.
📝 EXAMPLE (overview): "Market's mostly sideways. BTC steady, ETH stable, alts mixed. Want quick vibe or levels + catalysts?"
📝 EXAMPLE (price): "SOL is ~146 right now. Still choppy intraday. Want levels or just the number?"
`;
      break;
      
    case 'question':
      guidance += `
✅ This is a QUESTION. Explain the WHY in human words first.
📝 FORMAT: [Explanation in plain language] + [optional "want the metrics?"]
🚫 DO NOT: Lead with a scoreboard of 12 indicators.
📝 EXAMPLE: "Main driver looks like liquidation pressure + BTC dominance uptick. Want the liq/funding data to confirm?"
`;
      break;
      
    case 'decision':
      guidance += `
✅ This is a DECISION request. Give your honest take, then ask about THEIR situation.
📝 FORMAT: [Your opinion] + [2-3 reasons why] + [question about their circumstances]
🚫 DO NOT: Give a neutral "here are the factors" list. Take a stance.
📝 EXAMPLE: "I'd probably wait here. Funding's stretched, RSI's hot. If you're set on entering, watch for $82K. What's your risk tolerance?"
`;
      break;
      
    case 'meta':
      guidance += `
✅ This is a META/PRODUCT question. Be helpful and transparent.
📝 FORMAT: Acknowledge their concern + explain clearly + offer to help
🚫 DO NOT: Be defensive or dismiss their feedback.
📝 EXAMPLE: "You're right, that score looks off. Let me check what's happening — sometimes data lags during high volume. Want me to recalculate?"
`;
      break;
  }

  guidance += `
═══════════════════════════════════════════════════════════════════════════════
RULE B — SMALL ANSWER FIRST (HARD CAPS)
═══════════════════════════════════════════════════════════════════════════════

LAYER 1 (your default response):
• Maximum lines: ${c.maxLines}
• Maximum numbers/metrics: ${c.maxNumbers}
• Plain language first, data only if asked

LAYER 2 (depth offer):
${c.requiresDepthOffer ? `• END with one depth offer: "${getDepthOfferPhrase(c.depthOfferType)}"` : '• No depth offer needed for this response'}

📏 VERBOSITY MODE: ${verbosity.toUpperCase()}
${verbosity === 'tiny' ? '• 1-2 lines max. Be brief.' : ''}
${verbosity === 'small' ? '• 2-4 lines. Concise but helpful.' : ''}
${verbosity === 'medium' ? '• 4-8 lines. Give context but stay focused.' : ''}
${verbosity === 'full' ? '• Full analysis allowed. Still be conversational.' : ''}

═══════════════════════════════════════════════════════════════════════════════
RULE C — ONE QUESTION MAX (STRICT)
═══════════════════════════════════════════════════════════════════════════════

⚠️ You are allowed EXACTLY ONE question mark in your entire response.
${c.questionType ? `
✅ Your question should be: ${getQuestionPhrase(c.questionType)}
` : '✅ You may skip the question if the response is complete.'}

🚫 FORBIDDEN — DO NOT end with:
• Multiple questions ("What's your timeframe? Risk tolerance? Entry size?")
• Menu of options ("Holding majors, hunting dips, or something else?")
• "Let me know if you want X, Y, or Z"

✅ GOOD — End with ONE clean question:
• "What are you trading today?"
• "Quick pulse or deep dive?"
• "Scalp or swing?"

═══════════════════════════════════════════════════════════════════════════════
`;

  // Add forbidden patterns for social intent
  if (c.forbiddenPatterns.length > 0) {
    guidance += `
🚫 FORBIDDEN WORDS/PATTERNS FOR THIS RESPONSE:
${c.forbiddenPatterns.map(p => `• "${p}"`).join('\n')}

If you mention ANY of these in response to a social greeting, you have FAILED.
═══════════════════════════════════════════════════════════════════════════════
`;
  }

  return guidance;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getIntentDescription(intent: IntentBucket): string {
  const descriptions: Record<IntentBucket, string> = {
    social: 'greeting, small talk, checking in',
    command: 'direct request for data or action',
    question: 'asking why/how something works',
    decision: 'seeking advice on what to do',
    meta: 'feedback about the product/data',
  };
  return descriptions[intent];
}

function getDepthOfferPhrase(type: DepthOfferType | null): string {
  if (!type) return '';
  const phrases: Record<DepthOfferType, string> = {
    vibe_or_numbers: 'Want the quick vibe or the exact numbers?',
    levels_or_direction: 'Want levels + setups, or just direction?',
    short_or_deep: 'Want the short version or a deep dive?',
    metrics_offer: 'Want the metrics to back that up?',
  };
  return phrases[type];
}

function getQuestionPhrase(type: QuestionType): string {
  const phrases: Record<QuestionType, string> = {
    scope: 'Quick pulse or deep dive?',
    asset: 'Which coin are you watching?',
    goal: 'Looking for entries or just direction?',
    timeframe: 'Scalp today or swing?',
  };
  return phrases[type];
}

// ============================================================================
// EXPORTS
// ============================================================================

export const conversationRules = {
  classify: classifyConversation,
  generateGuidance: generateResponseGuidance,
};

export default conversationRules;
