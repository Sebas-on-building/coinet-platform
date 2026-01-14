/**
 * 🎛️ Unified Response Policy v3.0
 * 
 * Production-ready policy layer that combines:
 * 1. Verbosity & Structure Controller (Mode S/M/L, hard caps, templates)
 * 2. Human Conversation Behaviors (clarifier gate, continuity, uncertainty)
 * 
 * EXECUTION FLOW (every turn):
 * 1. Extract signals from message (LEN, DEPTH, URGENT, STATE, DOMAIN)
 * 2. Select output mode (S/M/L) with deterministic rules
 * 3. Run Clarifier Gate — ask ONE question if genuinely needed
 * 4. Apply Continuity Anchoring — first line must reference user's request
 * 5. Check Uncertainty — inject micro-pattern if data is uncertain
 * 6. Apply hard caps and structure template
 * 7. End with exactly ONE question (clarifier OR next-step, never both)
 * 
 * @version 3.0.0 - Unified Response Policy
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
 * Clarifier types - when we need to ask a clarifying question
 */
export type ClarifierType = 
  | 'ASSET'      // "Which coin are we talking about?"
  | 'TIMEFRAME'  // "Scalp today or swing?"
  | 'GOAL'       // "Looking for entries or just direction?"
  | 'SCOPE'      // "Whole market or one coin?"
  | 'NONE';      // No clarifier needed

/**
 * Uncertainty types - what kind of data uncertainty exists
 */
export type UncertaintyType =
  | 'STALE_DATA'       // Data may be minutes behind
  | 'PARTIAL_DATA'     // Rate limit or incomplete feed
  | 'CONFLICTING_DATA' // Multiple sources disagree
  | 'ESTIMATED'        // Inferred metrics, not confirmed
  | 'NONE';            // Data is fresh and reliable

/**
 * Continuity anchor types - how to start the response
 */
export type ContinuityAnchor =
  | 'ACKNOWLEDGE_SCOPE'  // "Got you — quick market pulse: …"
  | 'ECHO_ASSET'         // "On BTC: …"
  | 'CONFIRM_CONSTRAINT' // "Keeping it short: …"
  | 'CARRY_FORWARD'      // "Still same story as earlier: …"
  | 'PARAPHRASE';        // "You want a market overview…"

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
  isDepthOptIn: boolean;
  // New: for human behaviors
  hasTimeframe: boolean;
  hasGoal: boolean;
  requestsAnalysis: boolean;
  requestsDecision: boolean;
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
  | 'GREETING'
  | 'PRICE_CHECK'
  | 'MARKET_OVERVIEW'
  | 'WHY_MOVE'
  | 'DECISION_HELP'
  | 'DEEP_ANALYSIS'
  | 'META_RESPONSE'
  | 'GENERIC_SMALL'
  | 'GENERIC_MEDIUM'
  | 'CLARIFIER_ONLY';  // New: when we only ask a clarifier

/**
 * Human conversation behaviors result
 */
export interface HumanBehaviors {
  clarifier: {
    needed: boolean;
    type: ClarifierType;
    question: string | null;
    reason: string | null;
  };
  continuity: {
    anchor: ContinuityAnchor;
    phrase: string;
  };
  uncertainty: {
    present: boolean;
    type: UncertaintyType;
    disclosure: string | null;
    actionOffer: string | null;
  };
}

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
  // New: human behaviors
  behaviors: HumanBehaviors;
}

// ============================================================================
// STEP 1 — SIGNAL EXTRACTION
// ============================================================================

function countWords(message: string): number {
  const words = message.trim().split(/\s+/).filter(w => /\w/.test(w));
  return words.length;
}

function isOnlyEmojis(message: string): boolean {
  const withoutEmojis = message.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  return withoutEmojis.length === 0 && message.trim().length > 0;
}

function extractLengthSignal(message: string): LengthSignal {
  const wordCount = countWords(message);
  if (wordCount <= 3 || isOnlyEmojis(message)) return 'LEN_SHORT';
  if (wordCount <= 20) return 'LEN_MED';
  return 'LEN_LONG';
}

function extractDepthSignal(message: string): DepthSignal {
  const lower = message.toLowerCase();
  
  const highPatterns = [
    /\bdeep\s*dive\b/, /\bfull\s*(?:breakdown|analysis|review)\b/,
    /\bstep[\s-]*by[\s-]*step\b/, /\bthesis\b/, /\beverything\b/,
    /\bdetailed\b/, /\bcomprehensive\b/, /\bin[\s-]*depth\b/,
    /\btell\s+me\s+(?:all|everything)\b/,
  ];
  for (const pattern of highPatterns) {
    if (pattern.test(lower)) return 'DEPTH_HIGH';
  }
  
  const medPatterns = [
    /\boverview\b/, /\bupdate\b/, /\bwhat'?s\s+happening\b/,
    /\bsummary\b/, /\bquick\s+(?:look|check|rundown)\b/,
    /\bstatus\b/, /\bhow'?s\s+(?:the\s+)?market\b/,
  ];
  for (const pattern of medPatterns) {
    if (pattern.test(lower)) return 'DEPTH_MED';
  }
  
  const lowPatterns = [
    /\bprice\s*\??$/, /^[A-Z]{2,5}\s*\??$/,
    /\bcheck\s+\w+\b/, /\bthoughts\s+on\b/,
    /\bquick\b/, /\bjust\s+(?:the|a)\b/,
  ];
  for (const pattern of lowPatterns) {
    if (pattern.test(lower) || pattern.test(message)) return 'DEPTH_LOW';
  }
  
  return 'DEPTH_NONE';
}

function extractUrgencySignal(message: string): UrgencySignal {
  const lower = message.toLowerCase();
  const urgentPatterns = [
    /\bnow\b/, /\bquick(?:ly)?\b/, /\bfast\b/, /\basap\b/,
    /\brn\b/, /\bhurry\b/, /\bimmediately\b/, /\burgent\b/,
  ];
  
  if (/[A-Z]{4,}.*!/.test(message)) return 'URGENT';
  if (/!{2,}/.test(message)) return 'URGENT';
  if (/\b(?:wtf|seriously|come on|cmon)\b/i.test(message)) return 'URGENT';
  
  for (const pattern of urgentPatterns) {
    if (pattern.test(lower)) return 'URGENT';
  }
  return 'NOT_URGENT';
}

function extractDomainSignal(message: string): { domain: DomainSignal; assets: string[] } {
  const assets: string[] = [];
  
  // Social/greeting patterns
  const greetingPatterns = [
    /^(?:hey|hi|hello|yo|sup|gm|gn|wassup|what'?s up)[\s\?!\.]*$/i,
    /^(?:how are you|how'?s it going|what'?s good)[\s\?]*$/i,
    /^(?:lol|lmao|haha|nice|cool|thanks|ty|thx)[\s!\.]*$/i,
    /^(?:bro|dude|fam|man|bruh)[\s,\?!\.]*$/i,
  ];
  for (const pattern of greetingPatterns) {
    if (pattern.test(message)) return { domain: 'SOCIAL', assets: [] };
  }
  if (isOnlyEmojis(message)) return { domain: 'SOCIAL', assets: [] };
  
  // Meta patterns
  const metaPatterns = [
    /\b(?:your|coinet'?s?)\s+(?:data|numbers?|scores?|output)\b/i,
    /\bhow\s+(?:do|does)\s+(?:you|coinet|omniscore)\b/i,
    /\b(?:fix|bug|error|wrong|incorrect|broken)\b/i,
  ];
  for (const pattern of metaPatterns) {
    if (pattern.test(message)) return { domain: 'META', assets: [] };
  }
  
  // Asset detection
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
  
  if (assets.length === 1) return { domain: 'SINGLE_ASSET', assets };
  
  // Market-wide signals
  const marketWidePatterns = [
    /\bmarket\b/i, /\balts?\b/i, /\boverall\b/i, /\bmacro\b/i,
    /\bcrypto\s+(?:market|space)\b/i, /\btop\s+\d+\b/i, /\bcompare\b/i,
  ];
  for (const pattern of marketWidePatterns) {
    if (pattern.test(message)) return { domain: 'MARKET_WIDE', assets };
  }
  
  if (assets.length > 1) return { domain: 'MARKET_WIDE', assets };
  return { domain: 'UNKNOWN', assets };
}

function isDepthOptIn(message: string): boolean {
  const lower = message.toLowerCase();
  const optInPatterns = [
    /^(?:yes|yeah|yep|yea|ya|sure|ok|okay|go|do it|please|yup)\b/,
    /\bfull\b/, /\bdeep(?:er)?\b/, /\bmore\b/, /\bdetails?\b/,
    /\bbreak(?:down)?\b/, /\bexplain\b/, /\blevels\b/,
    /\bnumbers\b/, /\bmetrics\b/,
  ];
  for (const pattern of optInPatterns) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

/**
 * Check if message contains timeframe indication
 */
function hasTimeframeIndication(message: string): boolean {
  const timeframePatterns = [
    /\b(?:scalp|swing|day\s*trade|intraday|long\s*term|short\s*term)\b/i,
    /\b\d+\s*(?:min|hour|day|week|month)\b/i,
    /\b(?:today|tonight|tomorrow|this week|this month)\b/i,
    /\b(?:1h|4h|1d|1w|daily|weekly|monthly)\b/i,
    /\bhold(?:ing)?\s+(?:for|until)\b/i,
  ];
  return timeframePatterns.some(p => p.test(message));
}

/**
 * Check if message contains goal indication
 */
function hasGoalIndication(message: string): boolean {
  const goalPatterns = [
    /\b(?:entry|entries|exit|target|tp|sl|stop\s*loss)\b/i,
    /\b(?:direction|trend|bias)\b/i,
    /\b(?:accumulate|dca|average)\b/i,
    /\blooking\s+(?:for|to)\b/i,
  ];
  return goalPatterns.some(p => p.test(message));
}

/**
 * Check if user is requesting analysis
 */
function requestsAnalysis(message: string): boolean {
  const analysisPatterns = [
    /\b(?:analyze|analyse|analysis|breakdown|review)\b/i,
    /\bthoughts\b/i,
    /\bwhat\s+do\s+you\s+think\b/i,
    /\b(?:bullish|bearish)\s*\??/i,
    /\bis\s+(?:this|it)\s+(?:good|bad|safe)\b/i,
  ];
  return analysisPatterns.some(p => p.test(message));
}

/**
 * Check if user is requesting decision help
 */
function requestsDecision(message: string): boolean {
  const decisionPatterns = [
    /\bshould\s+i\b/i,
    /\b(?:buy|sell|hold|long|short)\s*(?:now|here)?\s*\??/i,
    /\bwhat'?s\s+the\s+play\b/i,
    /\bwhat\s+would\s+you\s+do\b/i,
    /\bworth\s+(?:it|buying|holding)\b/i,
    /\bgood\s+(?:entry|time|idea)\b/i,
  ];
  return decisionPatterns.some(p => p.test(message));
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
    const hasAssetDiscussion = recentTurns.some(turn => 
      /\b(?:BTC|ETH|SOL|bitcoin|ethereum|solana)\b/i.test(turn.content)
    );
    const hasDepthRequest = recentTurns.some(turn => 
      turn.role === 'user' && /\b(?:deep|full|detailed|breakdown|thesis)\b/i.test(turn.content)
    );
    
    if (hasDepthRequest) {
      state = 'STATE_DEEP';
    } else if (hasAssetDiscussion || conversationHistory.length >= 4) {
      state = 'STATE_ACTIVE';
    }
  }
  
  return {
    length,
    depth,
    urgency,
    state,
    domain,
    detectedAssets: assets,
    isGreeting: domain === 'SOCIAL',
    isDepthOptIn: isDepthOptIn(message),
    hasTimeframe: hasTimeframeIndication(message),
    hasGoal: hasGoalIndication(message),
    requestsAnalysis: requestsAnalysis(message),
    requestsDecision: requestsDecision(message),
  };
}

// ============================================================================
// STEP 2 — MODE SELECTION
// ============================================================================

export function selectMode(signals: MessageSignals): OutputMode {
  const { length, depth, urgency, state, domain, isDepthOptIn } = signals;
  
  if (domain === 'SOCIAL') return 'S';
  if (isDepthOptIn) return 'L';
  if (length === 'LEN_SHORT' && depth !== 'DEPTH_HIGH') return 'S';
  
  if (depth === 'DEPTH_HIGH') {
    return urgency === 'URGENT' ? 'M' : 'L';
  }
  
  if (depth === 'DEPTH_MED' || domain === 'MARKET_WIDE') {
    return urgency === 'URGENT' ? 'S' : 'M';
  }
  
  if (state === 'STATE_NEW') return 'S';
  
  return 'S';
}

// ============================================================================
// STEP 3 — CLARIFIER GATE (Human Behavior 1)
// ============================================================================

/**
 * Determine if a clarifier question is genuinely needed.
 * 
 * Ask a clarifier ONLY IF:
 * 1. Missing asset - user asks for analysis but no coin specified
 * 2. Missing timeframe - user wants entry/target but no timeframe
 * 3. Ambiguous scope - "overview" could mean market-wide or single coin
 * 4. Depth mismatch - short message with multiple valid expansions
 */
function runClarifierGate(signals: MessageSignals): { 
  needed: boolean; 
  type: ClarifierType; 
  question: string | null;
  reason: string | null;
} {
  const { 
    domain, detectedAssets, hasTimeframe, hasGoal, 
    requestsAnalysis, requestsDecision, depth, length, isGreeting 
  } = signals;
  
  // No clarifiers for greetings
  if (isGreeting) {
    return { needed: false, type: 'NONE', question: null, reason: null };
  }
  
  // 1. Missing asset - user wants analysis but no coin specified
  if ((requestsAnalysis || requestsDecision) && detectedAssets.length === 0 && domain === 'UNKNOWN') {
    return {
      needed: true,
      type: 'ASSET',
      question: 'Which coin are we talking about?',
      reason: 'User wants analysis but no asset specified',
    };
  }
  
  // 2. Missing timeframe - user wants entry/target/decision but no timeframe
  if (requestsDecision && !hasTimeframe && detectedAssets.length > 0) {
    return {
      needed: true,
      type: 'TIMEFRAME',
      question: 'Scalp today or swing?',
      reason: 'User wants trading decision but no timeframe specified',
    };
  }
  
  // 3. Ambiguous scope - "overview" with no clear scope
  if (depth === 'DEPTH_MED' && domain === 'UNKNOWN' && detectedAssets.length === 0) {
    return {
      needed: true,
      type: 'SCOPE',
      question: 'Whole market or one coin?',
      reason: 'Ambiguous scope for overview request',
    };
  }
  
  // 4. Missing goal - user mentions asset but unclear what they want
  if (detectedAssets.length > 0 && !hasGoal && !requestsAnalysis && !requestsDecision && length === 'LEN_SHORT') {
    // Only clarify if the message is very short and unclear
    // e.g., just "BTC" or "SOL?"
    if (detectedAssets.length === 1 && signals.length === 'LEN_SHORT') {
      return {
        needed: true,
        type: 'GOAL',
        question: 'Looking for entries or just direction?',
        reason: 'Single asset mentioned but goal unclear',
      };
    }
  }
  
  return { needed: false, type: 'NONE', question: null, reason: null };
}

// ============================================================================
// STEP 4 — CONTINUITY ANCHORING (Human Behavior 2)
// ============================================================================

/**
 * Generate the continuity anchor phrase for the response.
 * The first sentence MUST reference the user's request/asset.
 */
function getContinuityAnchor(signals: MessageSignals, mode: OutputMode): {
  anchor: ContinuityAnchor;
  phrase: string;
} {
  const { domain, detectedAssets, depth, urgency, state, isGreeting } = signals;
  
  // Greeting response
  if (isGreeting) {
    return { anchor: 'ACKNOWLEDGE_SCOPE', phrase: '' };  // Greetings have their own handling
  }
  
  // Echo asset if present
  if (detectedAssets.length === 1) {
    const asset = detectedAssets[0];
    return { anchor: 'ECHO_ASSET', phrase: `On ${asset}:` };
  }
  
  // Multiple assets
  if (detectedAssets.length > 1) {
    return { anchor: 'ACKNOWLEDGE_SCOPE', phrase: 'Looking at those:' };
  }
  
  // Confirm constraint for small/urgent
  if (mode === 'S' || urgency === 'URGENT') {
    if (depth === 'DEPTH_MED') {
      return { anchor: 'ACKNOWLEDGE_SCOPE', phrase: 'Got you — quick pulse:' };
    }
    return { anchor: 'CONFIRM_CONSTRAINT', phrase: 'Keeping it short:' };
  }
  
  // Carry forward if active conversation
  if (state === 'STATE_ACTIVE' || state === 'STATE_DEEP') {
    return { anchor: 'CARRY_FORWARD', phrase: 'Building on that:' };
  }
  
  // Market-wide scope
  if (domain === 'MARKET_WIDE') {
    return { anchor: 'ACKNOWLEDGE_SCOPE', phrase: 'Market-wide:' };
  }
  
  // Default paraphrase
  return { anchor: 'PARAPHRASE', phrase: 'Got you —' };
}

// ============================================================================
// STEP 5 — UNCERTAINTY HANDLING (Human Behavior 3)
// ============================================================================

/**
 * Check for and handle data uncertainty.
 * 
 * Format: State briefly → Offer fix → Proceed with safe summary
 */
function getUncertaintyHandling(
  hasDataFreshnessConcern: boolean = false,
  hasPartialData: boolean = false,
  hasConflictingData: boolean = false,
  hasEstimatedMetrics: boolean = false
): {
  present: boolean;
  type: UncertaintyType;
  disclosure: string | null;
  actionOffer: string | null;
} {
  if (hasDataFreshnessConcern) {
    return {
      present: true,
      type: 'STALE_DATA',
      disclosure: 'My price may be a few minutes behind.',
      actionOffer: 'Want me to pull a fresh snapshot?',
    };
  }
  
  if (hasPartialData) {
    return {
      present: true,
      type: 'PARTIAL_DATA',
      disclosure: 'Some data feeds are lagging right now.',
      actionOffer: 'I can still give direction + key levels.',
    };
  }
  
  if (hasConflictingData) {
    return {
      present: true,
      type: 'CONFLICTING_DATA',
      disclosure: 'Getting mixed signals from different sources.',
      actionOffer: 'Want me to break down what each is showing?',
    };
  }
  
  if (hasEstimatedMetrics) {
    return {
      present: true,
      type: 'ESTIMATED',
      disclosure: 'Some of these are estimates, not confirmed.',
      actionOffer: 'Want the verified data only?',
    };
  }
  
  return { present: false, type: 'NONE', disclosure: null, actionOffer: null };
}

// ============================================================================
// STEP 6 — HARD CAPS & TEMPLATES
// ============================================================================

const CAPS_S: HardCaps = {
  minLines: 1, maxLines: 3, maxBullets: 0, maxNumbers: 1,
  maxAssets: 1, requireHumanSummary: false, maxQuestions: 1,
  structure: 'GENERIC_SMALL',
};

const CAPS_M: HardCaps = {
  minLines: 4, maxLines: 10, maxBullets: 4, maxNumbers: 5,
  maxAssets: 6, requireHumanSummary: true, maxQuestions: 1,
  structure: 'GENERIC_MEDIUM',
};

const CAPS_L: HardCaps = {
  minLines: 8, maxLines: 20, maxBullets: 8, maxNumbers: 15,
  maxAssets: 10, requireHumanSummary: true, maxQuestions: 1,
  structure: 'DEEP_ANALYSIS',
};

export function getCaps(mode: OutputMode): HardCaps {
  switch (mode) {
    case 'S': return { ...CAPS_S };
    case 'M': return { ...CAPS_M };
    case 'L': return { ...CAPS_L };
  }
}

export function selectTemplate(signals: MessageSignals, mode: OutputMode, clarifierNeeded: boolean): StructureTemplate {
  const { domain, depth, detectedAssets, requestsDecision } = signals;
  
  // If clarifier is needed and mode is S/M, use CLARIFIER_ONLY
  if (clarifierNeeded && mode !== 'L') {
    return 'CLARIFIER_ONLY';
  }
  
  if (domain === 'SOCIAL' || signals.isGreeting) return 'GREETING';
  if (domain === 'META') return 'META_RESPONSE';
  if (mode === 'L') return 'DEEP_ANALYSIS';
  if (requestsDecision) return 'DECISION_HELP';
  if (depth === 'DEPTH_LOW' && detectedAssets.length === 1) return 'PRICE_CHECK';
  if (domain === 'MARKET_WIDE' || depth === 'DEPTH_MED') return 'MARKET_OVERVIEW';
  if (detectedAssets.length > 0) return mode === 'M' ? 'WHY_MOVE' : 'PRICE_CHECK';
  
  return mode === 'S' ? 'GENERIC_SMALL' : 'GENERIC_MEDIUM';
}

export function getTemplateInstructions(template: StructureTemplate): string {
  const templates: Record<StructureTemplate, string> = {
    CLARIFIER_ONLY: `TEMPLATE: Clarifier Only
You need more info before you can help properly. Give a MINIMAL safe default + ONE clarifier.
1. Very brief acknowledgment or safe vibe (1 line max)
2. ONE clarifying question
DO NOT dump data. DO NOT give detailed analysis.
EXAMPLE: "Feels choppy overall. Which coin are you watching?"`,

    GREETING: `TEMPLATE: Greeting Response
1. Brief, natural greeting (match their energy)
2. ONE question to discover intent
DO NOT mention any market data.
EXAMPLE: "Yo — what's up. You here for markets or something else?"`,

    PRICE_CHECK: `TEMPLATE: Price Check (Mode S)
1. Price (1 line)
2. Context — trend/chop (1 line)
3. Depth offer question (1 line)
EXAMPLE: "SOL is ~146 right now. Still choppy intraday. Want levels or just the number?"`,

    MARKET_OVERVIEW: `TEMPLATE: Market Overview (Mode M)
1. VIBE in one line (human translation)
2. What's leading / lagging (2-3 lines)
3. Key risk or catalyst (1-2 lines)
4. Optional: 2-4 bullets
5. ONE question
EXAMPLE: "Market's in wait-and-see mode. BTC holding 87K, ETH lagging. What are you watching?"`,

    WHY_MOVE: `TEMPLATE: Why Did X Move (Mode M)
1. Primary driver in 1 line (human explanation)
2. Supporting drivers (2-4 lines)
3. What would confirm/deny (1 line)
4. ONE question
EXAMPLE: "Main driver was a whale liquidation cascade. Want the exact liq data?"`,

    DECISION_HELP: `TEMPLATE: Decision Help (Mode M)
1. Your honest opinion FIRST (take a stance)
2. 2-3 reasons why (conversational, not bullet list)
3. ONE question about their situation
EXAMPLE: "I'd probably wait here. Funding is stretched. What's your usual stop distance?"`,

    DEEP_ANALYSIS: `TEMPLATE: Deep Analysis (Mode L)
1. THESIS (2-3 lines): Your overall take
2. DRIVERS: What's pushing this (3-4 points)
3. LEVELS/SCENARIOS: Key prices to watch
4. RISK/INVALIDATION: What would make you wrong
5. ONE question: "What's your timeframe and risk tolerance?"`,

    META_RESPONSE: `TEMPLATE: Meta/Product Response
1. Acknowledge their point (don't be defensive)
2. Explain what's happening in plain language
3. Offer to help or provide alternative
EXAMPLE: "You're right, that looks off. Want me to recalculate?"`,

    GENERIC_SMALL: `TEMPLATE: Generic Small (Mode S)
1. Direct answer (1-2 lines)
2. One context line
3. Depth offer
Max 1 number unless they asked for data.`,

    GENERIC_MEDIUM: `TEMPLATE: Generic Medium (Mode M)
1. Human summary sentence FIRST
2. Supporting details (3-5 lines)
3. Optional: 2-3 bullets
4. Depth offer or clarifying question`,
  };
  
  return templates[template];
}

// ============================================================================
// STEP 7 — EXPANSION PROTOCOL & QUESTIONS
// ============================================================================

export function getDepthOffer(template: StructureTemplate, mode: OutputMode): string | null {
  if (mode === 'L') return null;
  if (template === 'GREETING' || template === 'CLARIFIER_ONLY') return null;
  
  const offers: Record<StructureTemplate, string> = {
    GREETING: '',
    CLARIFIER_ONLY: '',
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

export function getFollowUpQuestion(
  signals: MessageSignals, 
  template: StructureTemplate,
  clarifier: { needed: boolean; question: string | null }
): string | null {
  // If clarifier is active, that's the question — no depth offer
  if (clarifier.needed && clarifier.question) {
    return clarifier.question;
  }
  
  if (template === 'GREETING') {
    return 'You here for markets or something else?';
  }
  
  if (signals.detectedAssets.length === 0 && signals.domain !== 'META') {
    return 'Which coin are you watching?';
  }
  
  const questions: Record<StructureTemplate, string> = {
    GREETING: 'You here for markets or something else?',
    CLARIFIER_ONLY: '',  // Clarifier question is already set
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

export function classifyVerbosity(
  message: string,
  conversationHistory?: { role: string; content: string }[],
  dataContext?: {
    hasDataFreshnessConcern?: boolean;
    hasPartialData?: boolean;
    hasConflictingData?: boolean;
    hasEstimatedMetrics?: boolean;
  }
): VerbosityClassification {
  const startTime = performance.now();
  
  // Step 1: Extract signals
  const signals = extractSignals(message, conversationHistory);
  
  // Step 2: Select mode
  const mode = selectMode(signals);
  
  // Step 3: Run clarifier gate (Human Behavior 1)
  const clarifier = runClarifierGate(signals);
  
  // Step 4: Get continuity anchor (Human Behavior 2)
  const continuity = getContinuityAnchor(signals, mode);
  
  // Step 5: Check uncertainty (Human Behavior 3)
  const uncertainty = getUncertaintyHandling(
    dataContext?.hasDataFreshnessConcern,
    dataContext?.hasPartialData,
    dataContext?.hasConflictingData,
    dataContext?.hasEstimatedMetrics
  );
  
  // Step 6: Get hard caps and template
  const caps = getCaps(mode);
  const template = selectTemplate(signals, mode, clarifier.needed);
  caps.structure = template;
  
  // Step 7: Get expansion protocol
  const depthOffer = getDepthOffer(template, mode);
  const questionPrompt = getFollowUpQuestion(signals, template, clarifier);
  
  const result: VerbosityClassification = {
    signals,
    mode,
    caps,
    template,
    depthOffer,
    questionPrompt,
    behaviors: {
      clarifier,
      continuity,
      uncertainty,
    },
  };
  
  logger.debug('🎛️ Response policy applied', {
    message: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
    mode,
    template,
    clarifierNeeded: clarifier.needed,
    clarifierType: clarifier.type,
    continuityAnchor: continuity.anchor,
    uncertaintyPresent: uncertainty.present,
    processingMs: (performance.now() - startTime).toFixed(1),
  });
  
  return result;
}

// ============================================================================
// RESPONSE GUIDANCE GENERATOR
// ============================================================================

export function generateResponseGuidance(classification: VerbosityClassification): string {
  const { signals, mode, caps, template, depthOffer, questionPrompt, behaviors } = classification;
  const { clarifier, continuity, uncertainty } = behaviors;
  
  return `
═══════════════════════════════════════════════════════════════════════════════
🎛️ UNIFIED RESPONSE POLICY v3.0 — PRODUCTION MODE
═══════════════════════════════════════════════════════════════════════════════

OUTPUT MODE: ${mode} (${mode === 'S' ? 'Small' : mode === 'M' ? 'Medium' : 'Large'})
TEMPLATE: ${template}

DETECTED SIGNALS:
• Length: ${signals.length} | Depth: ${signals.depth} | Urgency: ${signals.urgency}
• Domain: ${signals.domain}${signals.detectedAssets.length > 0 ? ` (${signals.detectedAssets.join(', ')})` : ''}
• State: ${signals.state} | Has Timeframe: ${signals.hasTimeframe} | Has Goal: ${signals.hasGoal}
${signals.isDepthOptIn ? '• ⚡ USER OPTED IN TO DEPTH' : ''}

═══════════════════════════════════════════════════════════════════════════════
BEHAVIOR 1 — CLARIFIER GATE
═══════════════════════════════════════════════════════════════════════════════
${clarifier.needed ? `
⚠️ CLARIFIER REQUIRED — ${clarifier.type}
Reason: ${clarifier.reason}

DO NOT dump data. Give a minimal safe default + this question:
"${clarifier.question}"

EXAMPLE: "Feels choppy overall. ${clarifier.question}"
` : `
✅ No clarifier needed — proceed with response.`}

═══════════════════════════════════════════════════════════════════════════════
BEHAVIOR 2 — CONTINUITY ANCHORING
═══════════════════════════════════════════════════════════════════════════════

Your FIRST SENTENCE must use this anchor: "${continuity.phrase}"

Anchor type: ${continuity.anchor}
${continuity.anchor === 'ECHO_ASSET' ? `• Reference the user's asset directly` : ''}
${continuity.anchor === 'ACKNOWLEDGE_SCOPE' ? `• Acknowledge what they asked for` : ''}
${continuity.anchor === 'CONFIRM_CONSTRAINT' ? `• Confirm you're keeping it short` : ''}
${continuity.anchor === 'CARRY_FORWARD' ? `• Connect to the previous context` : ''}

🚫 FORBIDDEN: Starting with a random fact dump that doesn't reference the user's request.
If you introduce new topics, label them: "One extra thing worth watching: …" (max 1 line)

═══════════════════════════════════════════════════════════════════════════════
BEHAVIOR 3 — UNCERTAINTY HANDLING
═══════════════════════════════════════════════════════════════════════════════
${uncertainty.present ? `
⚠️ UNCERTAINTY DETECTED: ${uncertainty.type}

You MUST use this micro-pattern (3 parts, 1 line total):
1. State briefly: "${uncertainty.disclosure}"
2. Offer fix: "${uncertainty.actionOffer}"
3. Then proceed with safe summary (qualitative, avoid precision)

EXAMPLE: "${uncertainty.disclosure} ${uncertainty.actionOffer}"

🚫 FORBIDDEN:
• Long apologies
• Technical stack talk ("API timeout", "websocket")
• Confidence language ("definitely", "for sure") when uncertain
` : `
✅ No uncertainty flagged — data is fresh and reliable.`}

═══════════════════════════════════════════════════════════════════════════════
HARD CAPS — NON-NEGOTIABLE
═══════════════════════════════════════════════════════════════════════════════

📏 LENGTH:     ${caps.minLines}-${caps.maxLines} lines
📊 NUMBERS:    max ${caps.maxNumbers} total
📋 BULLETS:    max ${caps.maxBullets}
🪙 ASSETS:     max ${caps.maxAssets} tickers
❓ QUESTIONS:  EXACTLY 1 (never more)
${caps.requireHumanSummary ? '✅ MUST start with human summary sentence' : ''}

${template === 'GREETING' ? `
🚫 FORBIDDEN FOR GREETINGS:
• ANY market data, prices, percentages, metrics
• BTC, ETH, SOL mentions
• Dollar signs or numbers
` : ''}

${template === 'CLARIFIER_ONLY' ? `
🚫 FORBIDDEN FOR CLARIFIER RESPONSES:
• Data dumps or detailed analysis
• Multiple questions
• Long explanations

✅ REQUIRED:
• 1 line safe vibe/acknowledgment
• 1 clarifying question
• That's it.
` : ''}

═══════════════════════════════════════════════════════════════════════════════
STRUCTURE TEMPLATE: ${template}
═══════════════════════════════════════════════════════════════════════════════

${getTemplateInstructions(template)}

═══════════════════════════════════════════════════════════════════════════════
QUESTION PROTOCOL — EXACTLY ONE QUESTION
═══════════════════════════════════════════════════════════════════════════════

${clarifier.needed ? `
Since clarifier is needed, your ONE question is:
"${clarifier.question}"

DO NOT add a depth offer. The clarifier IS your question.
` : questionPrompt ? `
Your ONE question/offer: "${questionPrompt}"
` : `
No question required for this response.
`}

🚫 FORBIDDEN:
• Multiple question marks
• "Let me know if you want X, Y, or Z"
• Menu of options ("Entry? Levels? Analysis?")

✅ ALLOWED:
• ONE clean question that moves the conversation forward

═══════════════════════════════════════════════════════════════════════════════
EXECUTION FLOW (follow this order)
═══════════════════════════════════════════════════════════════════════════════

1. START with continuity anchor: "${continuity.phrase}"
${uncertainty.present ? `2. INJECT uncertainty disclosure (1 line): "${uncertainty.disclosure}"` : ''}
${clarifier.needed ? `3. GIVE minimal safe default (1 line max)
4. ASK clarifier: "${clarifier.question}"
5. STOP. Do not add more.` : `3. DELIVER content per template (${template})
4. END with one question: "${questionPrompt || 'none needed'}"`}

═══════════════════════════════════════════════════════════════════════════════
QA ACCEPTANCE CHECKS (your response must pass ALL)
═══════════════════════════════════════════════════════════════════════════════

□ First line references user's request/asset
□ Total question marks in response: exactly 1 (or 0 if none needed)
□ If clarifier needed: gave minimal safe default + clarifier, no data dump
□ If uncertainty: disclosed in ≤1 line with action option
□ Line count within ${caps.minLines}-${caps.maxLines}
□ Number count ≤ ${caps.maxNumbers}
□ No multiple-choice menus at end
□ No unsolicited topic introductions (or labeled as "One extra thing:")

If ANY check fails, your response is NOT production-ready.

═══════════════════════════════════════════════════════════════════════════════
`;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/** @deprecated Use classifyVerbosity instead */
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
  runClarifierGate,
  getContinuityAnchor,
  getUncertaintyHandling,
  generateGuidance: generateResponseGuidance,
};

export default conversationRules;
