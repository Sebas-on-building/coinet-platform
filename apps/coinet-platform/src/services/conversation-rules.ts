/**
 * 🎛️ Verbosity & Structure Controller v2.0
 * 
 * Production-ready deterministic policy layer that prevents "Bible replies"
 * by forcing Coinet to choose a response size + structure BEFORE writing.
 * 
 * This runs EVERY turn and hard-limits:
 * - Output length (lines)
 * - Numbers/metrics count
 * - Bullets allowed
 * - Structure template
 * - Question count (max 1)
 * 
 * FIVE-STEP PROCESS:
 * 1. Extract signals from user message (LEN, DEPTH, URGENT, STATE, DOMAIN)
 * 2. Decide output mode (S/M/L) with deterministic rules
 * 3. Apply hard caps per mode
 * 4. Select structure template
 * 5. Generate expansion protocol
 * 
 * @version 2.0.0 - Production-ready spec
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES — SIGNAL FLAGS
// ============================================================================

/**
 * Detail Signal - How much info the user provided
 */
export type LengthSignal = 'LEN_SHORT' | 'LEN_MED' | 'LEN_LONG';

/**
 * Depth Intent Signal - What level of detail they want
 */
export type DepthSignal = 'DEPTH_LOW' | 'DEPTH_MED' | 'DEPTH_HIGH' | 'DEPTH_NONE';

/**
 * Urgency Signal - Time pressure
 */
export type UrgencySignal = 'URGENT' | 'NOT_URGENT';

/**
 * Conversation State Signal - Where we are in the flow
 */
export type StateSignal = 'STATE_NEW' | 'STATE_ACTIVE' | 'STATE_DEEP';

/**
 * Domain Focus Signal - Scope of the query
 */
export type DomainSignal = 'SINGLE_ASSET' | 'MARKET_WIDE' | 'META' | 'SOCIAL' | 'UNKNOWN';

/**
 * Output Mode - The final verbosity decision
 */
export type OutputMode = 'S' | 'M' | 'L';

/**
 * All extracted signals from a message
 */
export interface MessageSignals {
  length: LengthSignal;
  depth: DepthSignal;
  urgency: UrgencySignal;
  state: StateSignal;
  domain: DomainSignal;
  detectedAssets: string[];
  isGreeting: boolean;
  isDepthOptIn: boolean;  // User said "yes", "full", "deep dive" to expand
}

/**
 * Hard caps for the response
 */
export interface HardCaps {
  minLines: number;
  maxLines: number;
  maxBullets: number;
  maxNumbers: number;
  maxAssets: number;
  requireHumanSummary: boolean;
  maxQuestions: 1;
  structure: StructureTemplate;
}

/**
 * Structure templates for different query types
 */
export type StructureTemplate = 
  | 'GREETING'           // Greet + 1 question
  | 'PRICE_CHECK'        // Price + context + offer
  | 'MARKET_OVERVIEW'    // Vibe + leaders/laggers + risk + bullets + question
  | 'WHY_MOVE'           // Driver + supporting + confirm/deny + question
  | 'DECISION_HELP'      // Opinion + reasons + their situation question
  | 'DEEP_ANALYSIS'      // Thesis → Drivers → Levels → Risk → Question
  | 'META_RESPONSE'      // Acknowledge + explain + help
  | 'GENERIC_SMALL'      // Answer + context + offer
  | 'GENERIC_MEDIUM';    // Summary + details + offer

/**
 * Complete classification result
 */
export interface VerbosityClassification {
  signals: MessageSignals;
  mode: OutputMode;
  caps: HardCaps;
  template: StructureTemplate;
  depthOffer: string | null;
  questionPrompt: string | null;
}

// ============================================================================
// STEP 1 — SIGNAL EXTRACTION
// ============================================================================

/**
 * Count words in a message (excluding emojis and punctuation)
 */
function countWords(message: string): number {
  const words = message.trim().split(/\s+/).filter(w => /\w/.test(w));
  return words.length;
}

/**
 * Check if message is only emojis
 */
function isOnlyEmojis(message: string): boolean {
  const withoutEmojis = message.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  return withoutEmojis.length === 0 && message.trim().length > 0;
}

/**
 * Extract LENGTH signal
 */
function extractLengthSignal(message: string): LengthSignal {
  const wordCount = countWords(message);
  
  // ≤3 words OR only emojis = SHORT
  if (wordCount <= 3 || isOnlyEmojis(message)) {
    return 'LEN_SHORT';
  }
  
  // 4-20 words = MED
  if (wordCount <= 20) {
    return 'LEN_MED';
  }
  
  // >20 words or multiple clauses = LONG
  return 'LEN_LONG';
}

/**
 * Extract DEPTH signal - what level of detail they explicitly requested
 */
function extractDepthSignal(message: string): DepthSignal {
  const lower = message.toLowerCase();
  
  // DEPTH_HIGH triggers
  const highPatterns = [
    /\bdeep\s*dive\b/,
    /\bfull\s*(?:breakdown|analysis|review)\b/,
    /\bstep[\s-]*by[\s-]*step\b/,
    /\bthesis\b/,
    /\beverything\b/,
    /\bdetailed\b/,
    /\bcomprehensive\b/,
    /\bin[\s-]*depth\b/,
    /\btell\s+me\s+(?:all|everything)\b/,
    /\bbreak(?:down)?\s+(?:it|this)\s+(?:for|to)\s+me\b/,
  ];
  
  for (const pattern of highPatterns) {
    if (pattern.test(lower)) return 'DEPTH_HIGH';
  }
  
  // DEPTH_MED triggers
  const medPatterns = [
    /\boverview\b/,
    /\bupdate\b/,
    /\bwhat'?s\s+happening\b/,
    /\bsummary\b/,
    /\bquick\s+(?:look|check|rundown)\b/,
    /\bstatus\b/,
    /\bhow'?s\s+(?:the\s+)?market\b/,
  ];
  
  for (const pattern of medPatterns) {
    if (pattern.test(lower)) return 'DEPTH_MED';
  }
  
  // DEPTH_LOW triggers
  const lowPatterns = [
    /\bprice\s*\??$/,
    /^[A-Z]{2,5}\s*\??$/,  // Single ticker
    /\bcheck\s+\w+\b/,
    /\bthoughts\s+on\b/,
    /\bquick\b/,
    /\bjust\s+(?:the|a)\b/,
  ];
  
  for (const pattern of lowPatterns) {
    if (pattern.test(lower) || pattern.test(message)) return 'DEPTH_LOW';
  }
  
  return 'DEPTH_NONE';
}

/**
 * Extract URGENCY signal
 */
function extractUrgencySignal(message: string): UrgencySignal {
  const lower = message.toLowerCase();
  
  const urgentPatterns = [
    /\bnow\b/,
    /\bquick(?:ly)?\b/,
    /\bfast\b/,
    /\basap\b/,
    /\brn\b/,
    /\bhurry\b/,
    /\bimmediately\b/,
    /\burgent\b/,
  ];
  
  // Caps + exclamation = urgent
  if (/[A-Z]{4,}.*!/.test(message)) return 'URGENT';
  
  // Multiple exclamations
  if (/!{2,}/.test(message)) return 'URGENT';
  
  // Frustration indicators
  if (/\b(?:wtf|seriously|come on|cmon)\b/i.test(message)) return 'URGENT';
  
  for (const pattern of urgentPatterns) {
    if (pattern.test(lower)) return 'URGENT';
  }
  
  return 'NOT_URGENT';
}

/**
 * Extract DOMAIN signal - what scope is the user asking about
 */
function extractDomainSignal(message: string): { domain: DomainSignal; assets: string[] } {
  const lower = message.toLowerCase();
  const assets: string[] = [];
  
  // Check for social/greeting first
  const greetingPatterns = [
    /^(?:hey|hi|hello|yo|sup|gm|gn|wassup|what'?s up)[\s\?!\.]*$/i,
    /^(?:how are you|how'?s it going|what'?s good)[\s\?]*$/i,
    /^(?:lol|lmao|haha|nice|cool|thanks|ty|thx)[\s!\.]*$/i,
    /^(?:bro|dude|fam|man|bruh)[\s,\?!\.]*$/i,
  ];
  
  for (const pattern of greetingPatterns) {
    if (pattern.test(message)) {
      return { domain: 'SOCIAL', assets: [] };
    }
  }
  
  // Only emojis = social
  if (isOnlyEmojis(message)) {
    return { domain: 'SOCIAL', assets: [] };
  }
  
  // Check for meta (about Coinet itself)
  const metaPatterns = [
    /\b(?:your|coinet'?s?)\s+(?:data|numbers?|scores?|output)\b/i,
    /\bhow\s+(?:do|does)\s+(?:you|coinet|omniscore)\b/i,
    /\b(?:fix|bug|error|wrong|incorrect|broken)\b/i,
    /\bwhy\s+(?:is|are|did)\s+(?:your|the|this)\b/i,
  ];
  
  for (const pattern of metaPatterns) {
    if (pattern.test(message)) {
      return { domain: 'META', assets: [] };
    }
  }
  
  // Check for single asset mentions
  const tickerPattern = /\b(BTC|ETH|SOL|ADA|AVAX|MATIC|DOT|LINK|XRP|BNB|DOGE|SHIB|UNI|AAVE|ARB|OP|ATOM|NEAR|APT|SUI)\b/gi;
  const namePattern = /\b(bitcoin|ethereum|solana|cardano|avalanche|polygon|polkadot|chainlink|ripple|binance|dogecoin|shiba|uniswap|aave|arbitrum|optimism|cosmos|near|aptos|sui)\b/gi;
  
  let match;
  while ((match = tickerPattern.exec(message)) !== null) {
    const ticker = match[1].toUpperCase();
    if (!assets.includes(ticker)) assets.push(ticker);
  }
  while ((match = namePattern.exec(message)) !== null) {
    const name = match[1].toLowerCase();
    const tickerMap: Record<string, string> = {
      bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', cardano: 'ADA',
      avalanche: 'AVAX', polygon: 'MATIC', polkadot: 'DOT', chainlink: 'LINK',
      ripple: 'XRP', binance: 'BNB', dogecoin: 'DOGE', shiba: 'SHIB',
      uniswap: 'UNI', aave: 'AAVE', arbitrum: 'ARB', optimism: 'OP',
      cosmos: 'ATOM', near: 'NEAR', aptos: 'APT', sui: 'SUI',
    };
    const ticker = tickerMap[name];
    if (ticker && !assets.includes(ticker)) assets.push(ticker);
  }
  
  // Contract addresses
  const contractPattern = /\b(?:0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})\b/g;
  while ((match = contractPattern.exec(message)) !== null) {
    if (!assets.includes(match[0])) assets.push(match[0]);
  }
  
  // Determine domain
  if (assets.length === 1) {
    return { domain: 'SINGLE_ASSET', assets };
  }
  
  // Check for market-wide signals
  const marketWidePatterns = [
    /\bmarket\b/i,
    /\balts?\b/i,
    /\boverall\b/i,
    /\bmacro\b/i,
    /\bcrypto\s+(?:market|space)\b/i,
    /\btop\s+\d+\b/i,
    /\bcompare\b/i,
  ];
  
  for (const pattern of marketWidePatterns) {
    if (pattern.test(message)) {
      return { domain: 'MARKET_WIDE', assets };
    }
  }
  
  if (assets.length > 1) {
    return { domain: 'MARKET_WIDE', assets };
  }
  
  return { domain: 'UNKNOWN', assets };
}

/**
 * Check if user is opting in to more depth
 */
function isDepthOptIn(message: string): boolean {
  const lower = message.toLowerCase();
  const optInPatterns = [
    /^(?:yes|yeah|yep|yea|ya|sure|ok|okay|go|do it|please|yup)\b/,
    /\bfull\b/,
    /\bdeep(?:er)?\b/,
    /\bmore\b/,
    /\bdetails?\b/,
    /\bbreak(?:down)?\b/,
    /\bexplain\b/,
    /\blevels\b/,
    /\bnumbers\b/,
    /\bmetrics\b/,
  ];
  
  for (const pattern of optInPatterns) {
    if (pattern.test(lower)) return true;
  }
  
  return false;
}

/**
 * Extract all signals from a message
 */
export function extractSignals(
  message: string,
  conversationHistory?: { role: string; content: string }[]
): MessageSignals {
  const length = extractLengthSignal(message);
  const depth = extractDepthSignal(message);
  const urgency = extractUrgencySignal(message);
  const { domain, assets } = extractDomainSignal(message);
  
  // Determine conversation state from history
  let state: StateSignal = 'STATE_NEW';
  if (conversationHistory && conversationHistory.length > 0) {
    const recentTurns = conversationHistory.slice(-6);
    
    // Check if we've been discussing specific assets
    const hasAssetDiscussion = recentTurns.some(turn => 
      /\b(?:BTC|ETH|SOL|bitcoin|ethereum|solana)\b/i.test(turn.content)
    );
    
    // Check if user previously asked for depth
    const hasDepthRequest = recentTurns.some(turn => 
      turn.role === 'user' && /\b(?:deep|full|detailed|breakdown|thesis)\b/i.test(turn.content)
    );
    
    if (hasDepthRequest) {
      state = 'STATE_DEEP';
    } else if (hasAssetDiscussion || conversationHistory.length >= 4) {
      state = 'STATE_ACTIVE';
    }
  }
  
  const isGreeting = domain === 'SOCIAL';
  const optIn = isDepthOptIn(message);
  
  return {
    length,
    depth,
    urgency,
    state,
    domain,
    detectedAssets: assets,
    isGreeting,
    isDepthOptIn: optIn,
  };
}

// ============================================================================
// STEP 2 — MODE SELECTION (DETERMINISTIC RULES)
// ============================================================================

/**
 * Select output mode based on signals
 * 
 * BASE RULES:
 * 1. If LEN_SHORT and DEPTH_HIGH not present → Mode S
 * 2. If DEPTH_HIGH → Mode L
 * 3. If DEPTH_MED OR MARKET_WIDE → Mode M
 * 4. Else default → Mode S
 * 
 * OVERRIDE RULES:
 * - If URGENT: drop one level (L→M, M→S) unless explicit "full breakdown"
 * - If STATE_NEW and not market-wide: prefer S, ask clarifying question
 * - If SINGLE_ASSET and "overview": still M, but only about that asset
 */
export function selectMode(signals: MessageSignals): OutputMode {
  const { length, depth, urgency, state, domain, isDepthOptIn } = signals;
  
  // Social greetings are always S (actually even smaller)
  if (domain === 'SOCIAL') {
    return 'S';
  }
  
  // User opted in to depth → Mode L
  if (isDepthOptIn) {
    return 'L';
  }
  
  // BASE RULE 1: Short message without explicit depth request → S
  if (length === 'LEN_SHORT' && depth !== 'DEPTH_HIGH') {
    return 'S';
  }
  
  // BASE RULE 2: Explicit high depth request → L
  if (depth === 'DEPTH_HIGH') {
    // Override: urgent drops one level unless they said "full breakdown"
    if (urgency === 'URGENT') {
      return 'M';  // L → M
    }
    return 'L';
  }
  
  // BASE RULE 3: Medium depth OR market-wide → M
  if (depth === 'DEPTH_MED' || domain === 'MARKET_WIDE') {
    // Override: urgent drops to S
    if (urgency === 'URGENT') {
      return 'S';  // M → S
    }
    return 'M';
  }
  
  // OVERRIDE: New conversation state → prefer S with clarifying question
  // (MARKET_WIDE already handled above, so we can safely check just STATE_NEW)
  if (state === 'STATE_NEW') {
    return 'S';
  }
  
  // BASE RULE 4: Default → S (Coinet should be naturally concise)
  return 'S';
}

// ============================================================================
// STEP 3 — HARD CAPS PER MODE
// ============================================================================

/**
 * Mode S (Small) caps
 * Goal: conversational, fast
 */
const CAPS_S: HardCaps = {
  minLines: 1,
  maxLines: 3,
  maxBullets: 0,
  maxNumbers: 1,  // Only if directly asked
  maxAssets: 1,
  requireHumanSummary: false,
  maxQuestions: 1,
  structure: 'GENERIC_SMALL',
};

/**
 * Mode M (Medium) caps
 * Goal: useful overview without flooding
 */
const CAPS_M: HardCaps = {
  minLines: 4,
  maxLines: 10,
  maxBullets: 4,
  maxNumbers: 5,
  maxAssets: 6,
  requireHumanSummary: true,
  maxQuestions: 1,
  structure: 'GENERIC_MEDIUM',
};

/**
 * Mode L (Large) caps
 * Goal: deep analysis only when requested
 */
const CAPS_L: HardCaps = {
  minLines: 8,
  maxLines: 20,
  maxBullets: 8,
  maxNumbers: 15,
  maxAssets: 10,
  requireHumanSummary: true,
  maxQuestions: 1,
  structure: 'DEEP_ANALYSIS',
};

/**
 * Get hard caps for a mode
 */
export function getCaps(mode: OutputMode): HardCaps {
  switch (mode) {
    case 'S': return { ...CAPS_S };
    case 'M': return { ...CAPS_M };
    case 'L': return { ...CAPS_L };
  }
}

// ============================================================================
// STEP 4 — STRUCTURE TEMPLATES
// ============================================================================

/**
 * Select the appropriate structure template based on signals and mode
 */
export function selectTemplate(signals: MessageSignals, mode: OutputMode): StructureTemplate {
  const { domain, depth } = signals;
  const message = signals.detectedAssets.length > 0 ? 'has_asset' : 'no_asset';
  
  // Social → Greeting template
  if (domain === 'SOCIAL' || signals.isGreeting) {
    return 'GREETING';
  }
  
  // Meta questions → Meta response
  if (domain === 'META') {
    return 'META_RESPONSE';
  }
  
  // Deep analysis mode → Deep template
  if (mode === 'L') {
    return 'DEEP_ANALYSIS';
  }
  
  // Determine based on query type
  if (depth === 'DEPTH_LOW' && signals.detectedAssets.length === 1) {
    return 'PRICE_CHECK';
  }
  
  if (domain === 'MARKET_WIDE' || depth === 'DEPTH_MED') {
    return 'MARKET_OVERVIEW';
  }
  
  // "Why" questions
  if (signals.detectedAssets.length > 0) {
    return mode === 'M' ? 'WHY_MOVE' : 'PRICE_CHECK';
  }
  
  // Default based on mode
  return mode === 'S' ? 'GENERIC_SMALL' : 'GENERIC_MEDIUM';
}

/**
 * Get template instructions for the AI
 */
export function getTemplateInstructions(template: StructureTemplate): string {
  const templates: Record<StructureTemplate, string> = {
    GREETING: `TEMPLATE: Greeting Response
1. Brief, natural greeting (match their energy)
2. ONE question to discover intent
DO NOT mention any market data, prices, or metrics.
EXAMPLE: "Yo — what's up. You here for markets or something else?"`,

    PRICE_CHECK: `TEMPLATE: Price Check (Mode S)
1. Price (1 line)
2. Context — trend/chop (1 line)
3. Depth offer question (1 line)
EXAMPLE: "SOL is ~146 right now. Still choppy intraday. Want levels or just the number?"`,

    MARKET_OVERVIEW: `TEMPLATE: Market Overview (Mode M)
1. VIBE in one line (human translation of market mood)
2. What's leading / lagging (2-3 lines)
3. Key risk or catalyst (1-2 lines)
4. Optional: 2-4 bullets with notable levels/flows/alts
5. ONE question: "What are you trading today?"
EXAMPLE: "Market's in wait-and-see mode ahead of FOMC. BTC holding 87K, ETH lagging at 3.1K. Main risk is a hawkish surprise — could flush leveraged longs. What are you watching?"`,

    WHY_MOVE: `TEMPLATE: Why Did X Move (Mode M)
1. Primary driver in 1 line (human explanation)
2. Supporting drivers (2-4 lines)
3. What would confirm/deny the thesis (1 line)
4. ONE question: "Want the data-backed breakdown or just the main reason?"
EXAMPLE: "Main driver was a whale liquidation cascade on Binance — $45M in longs got flushed in 10 minutes. BTC dominance ticking up added pressure. If we reclaim 88K in the next 4 hours, it was just a shakeout. Want the exact liq data?"`,

    DECISION_HELP: `TEMPLATE: Decision Help (Mode M)
1. Your honest opinion FIRST (take a stance)
2. 2-3 reasons why (not a bullet list — conversational)
3. ONE question about their situation: timeframe, risk tolerance, or position size
EXAMPLE: "I'd probably wait here. Funding is stretched at 0.03%, and we're right at resistance. If you're set on entering, a pullback to 85K would be cleaner. What's your usual stop distance?"`,

    DEEP_ANALYSIS: `TEMPLATE: Deep Analysis (Mode L)
Structure your response as:
1. THESIS (2-3 lines): Your overall take
2. DRIVERS: What's pushing this (3-4 points, can use bullets)
3. LEVELS/SCENARIOS: Key prices to watch, bull/bear cases
4. RISK/INVALIDATION: What would make you wrong
5. ONE question: "What's your timeframe and risk tolerance?"
Keep it conversational, not report-like. No walls of numbers.`,

    META_RESPONSE: `TEMPLATE: Meta/Product Response
1. Acknowledge their point (don't be defensive)
2. Explain what's happening in plain language
3. Offer to help or provide alternative
EXAMPLE: "You're right, that OmniScore looks off — let me check. Sometimes derivatives data lags during high volume. Want me to recalculate without the derivatives component?"`,

    GENERIC_SMALL: `TEMPLATE: Generic Small (Mode S)
1. Direct answer (1-2 lines)
2. One context line
3. Depth offer
Keep it tight. No bullet points. Max 1 number unless they asked for data.`,

    GENERIC_MEDIUM: `TEMPLATE: Generic Medium (Mode M)
1. Human summary sentence FIRST
2. Supporting details (3-5 lines)
3. Optional: 2-3 bullets if listing things
4. Depth offer or clarifying question
Start with the takeaway, then explain.`,
  };
  
  return templates[template];
}

// ============================================================================
// STEP 5 — EXPANSION PROTOCOL
// ============================================================================

/**
 * Get the appropriate depth offer based on context
 */
export function getDepthOffer(template: StructureTemplate, mode: OutputMode): string | null {
  // No depth offers in L mode — they already asked for depth
  if (mode === 'L') return null;
  
  // No depth offers for greetings
  if (template === 'GREETING') return null;
  
  const offers: Record<StructureTemplate, string> = {
    GREETING: '',
    PRICE_CHECK: 'Want levels or just the number?',
    MARKET_OVERVIEW: 'Want the quick take or the full breakdown?',
    WHY_MOVE: 'Want the exact metrics behind this?',
    DECISION_HELP: 'Want levels + scenarios?',
    DEEP_ANALYSIS: '',
    META_RESPONSE: 'Want me to dig deeper into this?',
    GENERIC_SMALL: 'Want more detail?',
    GENERIC_MEDIUM: 'Want the full breakdown?',
  };
  
  return offers[template] || null;
}

/**
 * Get the appropriate follow-up question
 */
export function getFollowUpQuestion(signals: MessageSignals, template: StructureTemplate): string | null {
  // Greetings need intent discovery
  if (template === 'GREETING') {
    return 'You here for markets or something else?';
  }
  
  // If no asset detected, ask about asset
  if (signals.detectedAssets.length === 0 && signals.domain !== 'META') {
    return 'Which coin are you watching?';
  }
  
  // Based on template
  const questions: Record<StructureTemplate, string> = {
    GREETING: 'You here for markets or something else?',
    PRICE_CHECK: 'Want levels or just the number?',
    MARKET_OVERVIEW: 'What are you trading today?',
    WHY_MOVE: 'Want the data-backed breakdown?',
    DECISION_HELP: 'What\'s your timeframe?',
    DEEP_ANALYSIS: 'What\'s your timeframe and risk tolerance?',
    META_RESPONSE: 'Want me to recalculate?',
    GENERIC_SMALL: 'Quick take or deep dive?',
    GENERIC_MEDIUM: 'Want levels + setups?',
  };
  
  return questions[template] || null;
}

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Run the full verbosity classification pipeline
 */
export function classifyVerbosity(
  message: string,
  conversationHistory?: { role: string; content: string }[]
): VerbosityClassification {
  const startTime = performance.now();
  
  // Step 1: Extract signals
  const signals = extractSignals(message, conversationHistory);
  
  // Step 2: Select mode
  const mode = selectMode(signals);
  
  // Step 3: Get hard caps
  const caps = getCaps(mode);
  
  // Step 4: Select template
  const template = selectTemplate(signals, mode);
  caps.structure = template;
  
  // Step 5: Get expansion protocol
  const depthOffer = getDepthOffer(template, mode);
  const questionPrompt = getFollowUpQuestion(signals, template);
  
  const result: VerbosityClassification = {
    signals,
    mode,
    caps,
    template,
    depthOffer,
    questionPrompt,
  };
  
  logger.debug('🎛️ Verbosity classified', {
    message: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
    mode,
    template,
    signals: {
      length: signals.length,
      depth: signals.depth,
      urgency: signals.urgency,
      domain: signals.domain,
    },
    caps: {
      maxLines: caps.maxLines,
      maxNumbers: caps.maxNumbers,
      maxBullets: caps.maxBullets,
    },
    processingMs: (performance.now() - startTime).toFixed(1),
  });
  
  return result;
}

// ============================================================================
// RESPONSE GUIDANCE GENERATOR
// ============================================================================

/**
 * Generate the complete AI guidance block
 */
export function generateResponseGuidance(classification: VerbosityClassification): string {
  const { signals, mode, caps, template, depthOffer, questionPrompt } = classification;
  
  return `
═══════════════════════════════════════════════════════════════════════════════
🎛️ VERBOSITY CONTROLLER — PRODUCTION MODE
═══════════════════════════════════════════════════════════════════════════════

OUTPUT MODE: ${mode} (${mode === 'S' ? 'Small — fast, conversational' : mode === 'M' ? 'Medium — useful overview' : 'Large — deep analysis'})

DETECTED SIGNALS:
• Length: ${signals.length} (${signals.length === 'LEN_SHORT' ? '≤3 words' : signals.length === 'LEN_MED' ? '4-20 words' : '>20 words'})
• Depth Intent: ${signals.depth}
• Urgency: ${signals.urgency}
• Domain: ${signals.domain}${signals.detectedAssets.length > 0 ? ` (${signals.detectedAssets.join(', ')})` : ''}
• Conversation State: ${signals.state}
${signals.isDepthOptIn ? '• ⚡ USER OPTED IN TO DEPTH' : ''}

═══════════════════════════════════════════════════════════════════════════════
HARD CAPS — NON-NEGOTIABLE
═══════════════════════════════════════════════════════════════════════════════

📏 LENGTH:     ${caps.minLines}-${caps.maxLines} lines
📊 NUMBERS:    max ${caps.maxNumbers} total
📋 BULLETS:    max ${caps.maxBullets}
🪙 ASSETS:     max ${caps.maxAssets} tickers
❓ QUESTIONS:  max ${caps.maxQuestions}
${caps.requireHumanSummary ? '✅ MUST include human summary sentence first' : ''}

${template === 'GREETING' ? `
🚫 FORBIDDEN FOR GREETINGS:
• ANY market data, prices, percentages, metrics
• BTC, ETH, SOL mentions
• OmniScore, funding, liquidations
• Dollar signs or numbers

If you output market data in response to a greeting, YOU HAVE FAILED.
` : ''}

═══════════════════════════════════════════════════════════════════════════════
STRUCTURE TEMPLATE: ${template}
═══════════════════════════════════════════════════════════════════════════════

${getTemplateInstructions(template)}

═══════════════════════════════════════════════════════════════════════════════
EXPANSION PROTOCOL
═══════════════════════════════════════════════════════════════════════════════

${depthOffer ? `DEPTH OFFER (use at end): "${depthOffer}"` : 'No depth offer needed — user requested full analysis'}
${questionPrompt ? `FOLLOW-UP QUESTION: "${questionPrompt}"` : ''}

⚠️ CRITICAL: You may ONLY expand beyond Mode ${mode} if user explicitly opts in.
Even if you "have more to say" — respect the caps.

If user says "yes/full/deep/more" → next turn switches to Mode L.
Until then, stay within Mode ${mode} limits.

═══════════════════════════════════════════════════════════════════════════════
ANTI-SPAM SAFETY RAIL
═══════════════════════════════════════════════════════════════════════════════

${mode === 'S' ? `MODE S ACTIVE — Keep it TIGHT:
• No bullets
• No unsolicited metrics
• No "by the way" tangents
• Answer → Context → Offer. Done.` : ''}

${mode === 'M' ? `MODE M ACTIVE — Stay FOCUSED:
• Lead with human summary
• Max 5 numbers, max 4 bullets
• One clear takeaway
• No scoreboard dumps` : ''}

${mode === 'L' ? `MODE L ACTIVE — Be THOROUGH but READABLE:
• Thesis → Drivers → Levels → Risk
• Still conversational, not report-like
• No walls of numbers
• End with timeframe question` : ''}

═══════════════════════════════════════════════════════════════════════════════
`;
}

// ============================================================================
// LEGACY COMPATIBILITY — Keep old function names working
// ============================================================================

/**
 * @deprecated Use classifyVerbosity instead
 */
export function classifyConversation(message: string): VerbosityClassification {
  return classifyVerbosity(message);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const conversationRules = {
  classify: classifyVerbosity,
  extractSignals,
  selectMode,
  getCaps,
  selectTemplate,
  generateGuidance: generateResponseGuidance,
};

export default conversationRules;
