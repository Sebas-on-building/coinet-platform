/**
 * 🎛️ Unified Response Policy v6.0 — ANTI-BOT HUMAN RESPONSE ENGINE
 * 
 * Production-ready policy layer that combines:
 * 1. Verbosity & Structure Controller (Mode S/M/L, hard caps, templates)
 * 2. Human Conversation Behaviors (clarifier gate, continuity, uncertainty)
 * 3. No-Unasked-Metrics Gate (BLOCK/LIMIT/ALLOW, metric budgets)
 * 4. Greeting Cooldown + Variation Bank (30 variants, no repeats)
 * 5. Topic Persistence (MARKET_MODE, PRODUCT_MODE, SOCIAL_MODE)
 * 6. Anti-Bot Template System (phrase cooldowns, shape rotation, self-check)
 * 
 * PRIME DIRECTIVE: Sound like a real person. Never sound like a reusable script.
 * 
 * EXECUTION FLOW (every turn):
 * 1. Extract signals from message (LEN, DEPTH, URGENT, STATE, DOMAIN)
 * 2. Classify user intent (SOCIAL, DATA_REQUEST, EXPLAIN, ADVICE, PRODUCT)
 * 3. Run greeting cooldown + topic persistence
 * 4. Select output mode (S/M/L) and response shape
 * 5. Run Metrics Gate — determine if numbers are allowed
 * 6. Run Clarifier Gate — ask ONE question if genuinely needed
 * 7. Apply phrase cooldowns + lexical rotation
 * 8. Run self-check validation (rewrite if botty)
 * 
 * CORE PRINCIPLE: Meaning first. Numbers only when invited. Sound human always.
 * 
 * @version 6.0.0 - Added Anti-Bot Template System
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

// ============================================================================
// GREETING COOLDOWN + VARIATION BANK TYPES
// ============================================================================

/**
 * Greeting tone categories for variation bank
 */
export type GreetingTone = 'neutral' | 'fast' | 'friendly' | 'market_context' | 'continuation';

/**
 * Greeting variation entry
 */
export interface GreetingVariant {
  id: string;
  text: string;
  tone: GreetingTone;
  hasQuestion: boolean;
  /** If true, this is a micro-ack for when user greets within cooldown */
  isMicroAck: boolean;
}

/**
 * Greeting cooldown state
 */
export interface GreetingCooldownState {
  shouldUseFullGreeting: boolean;
  lastGreetingTurnCount: number;
  suggestedGreeting: GreetingVariant;
  recentlyUsedIds: string[];
  turnsWithinCooldown: boolean;
  reason: string;
}

/**
 * Greeting cooldown configuration
 */
export const GREETING_COOLDOWN_TURNS = 3;
export const GREETING_REUSE_COOLDOWN = 5;

// ============================================================================
// TOPIC PERSISTENCE (CONVERSATION MODE MEMORY) TYPES
// ============================================================================

/**
 * Conversation mode - sticky topic context
 */
export type ConversationMode = 
  | 'MARKET_MODE'   // User is asking about coins, prices, market analysis
  | 'PRODUCT_MODE'  // User is asking about Coinet, how it works, data sources
  | 'SOCIAL_MODE'   // Pure greeting/chat with no topic
  | 'NONE';         // No mode established yet

/**
 * Topic persistence state
 */
export interface TopicPersistenceState {
  currentMode: ConversationMode;
  modeConfidence: number;        // 0-1, how confident we are in this mode
  turnsSinceModeSet: number;     // How many turns since this mode was established
  shouldAskIntent: boolean;      // Whether to ask "markets or something else?"
  contextCarryPhrase: string | null;  // Phrase to carry context forward
  reason: string;
}

// ============================================================================
// SOURCE PROTOCOL TYPES
// ============================================================================

/**
 * Data freshness levels
 */
export type DataFreshness = 'live' | 'near_realtime' | 'delayed' | 'estimated';

/**
 * Data source provider info
 */
export interface DataSourceProvider {
  name: string;
  backup?: string;
  freshness: DataFreshness;
  freshnessDescription: string;
}

/**
 * Source protocol layer
 */
export interface SourceProtocol {
  dataType: string;
  humanDescription: string;
  providers: DataSourceProvider[];
}

/**
 * Complete source protocol response
 */
export interface SourceProtocolResponse {
  layers: SourceProtocol[];
  summary: string;
  caveat: string | null;
}

// ============================================================================
// GREETING VARIATION BANK — 30 VARIANTS
// ============================================================================

/**
 * Full greeting variants (for first greeting or after cooldown expires)
 * These should sound like a friend texting, not a support bot.
 */
export const GREETING_VARIANTS_FULL: GreetingVariant[] = [
  // Simple/Neutral (6) - just acknowledge, no structure
  { id: 'n1', text: "Hey — what's up?", tone: 'neutral', hasQuestion: true, isMicroAck: false },
  { id: 'n2', text: "Hey, what do you need?", tone: 'neutral', hasQuestion: true, isMicroAck: false },
  { id: 'n3', text: "Yo, what's going on?", tone: 'neutral', hasQuestion: true, isMicroAck: false },
  { id: 'n4', text: "Hey — what are you looking at?", tone: 'neutral', hasQuestion: true, isMicroAck: false },
  { id: 'n5', text: "What's up?", tone: 'neutral', hasQuestion: true, isMicroAck: false },
  { id: 'n6', text: "Hey 👋", tone: 'neutral', hasQuestion: false, isMicroAck: false },
  
  // Fast/Direct (6) - minimal, get to the point
  { id: 'f1', text: "Yo, what do you need?", tone: 'fast', hasQuestion: true, isMicroAck: false },
  { id: 'f2', text: "What's up?", tone: 'fast', hasQuestion: true, isMicroAck: false },
  { id: 'f3', text: "Hey — shoot.", tone: 'fast', hasQuestion: false, isMicroAck: false },
  { id: 'f4', text: "Yo.", tone: 'fast', hasQuestion: false, isMicroAck: false },
  { id: 'f5', text: "What do you need?", tone: 'fast', hasQuestion: true, isMicroAck: false },
  { id: 'f6', text: "Hey, what's going on?", tone: 'fast', hasQuestion: true, isMicroAck: false },
  
  // Friendly (6) - warm but still natural
  { id: 'fr1', text: "Hey 👋 what's on your mind?", tone: 'friendly', hasQuestion: true, isMicroAck: false },
  { id: 'fr2', text: "Yo — what's up?", tone: 'friendly', hasQuestion: true, isMicroAck: false },
  { id: 'fr3', text: "Hey — what's going on?", tone: 'friendly', hasQuestion: true, isMicroAck: false },
  { id: 'fr4', text: "What's good?", tone: 'friendly', hasQuestion: true, isMicroAck: false },
  { id: 'fr5', text: "Hey 👋 what are you looking at?", tone: 'friendly', hasQuestion: true, isMicroAck: false },
  { id: 'fr6', text: "Yo — anything specific?", tone: 'friendly', hasQuestion: true, isMicroAck: false },
  
  // Market context (6) - only use when MARKET_MODE is active, still natural
  { id: 'm1', text: "Hey — which coin?", tone: 'market_context', hasQuestion: true, isMicroAck: false },
  { id: 'm2', text: "Yo — what are you trading?", tone: 'market_context', hasQuestion: true, isMicroAck: false },
  { id: 'm3', text: "Hey, what are you watching?", tone: 'market_context', hasQuestion: true, isMicroAck: false },
  { id: 'm4', text: "What coin?", tone: 'market_context', hasQuestion: true, isMicroAck: false },
  { id: 'm5', text: "Hey — BTC or something else?", tone: 'market_context', hasQuestion: true, isMicroAck: false },
  { id: 'm6', text: "Yo, anything specific?", tone: 'market_context', hasQuestion: true, isMicroAck: false },
];

/**
 * Micro-ack variants (for when user greets within cooldown period)
 * Short, carry context forward, no menu questions
 */
export const GREETING_VARIANTS_MICRO: GreetingVariant[] = [
  // Continuation - keep it simple
  { id: 'c1', text: "Yo 👋 what's up?", tone: 'continuation', hasQuestion: true, isMicroAck: true },
  { id: 'c2', text: "Hey — what do you need?", tone: 'continuation', hasQuestion: true, isMicroAck: true },
  { id: 'c3', text: "What's going on?", tone: 'continuation', hasQuestion: true, isMicroAck: true },
  { id: 'c4', text: "Yo — still looking at markets?", tone: 'continuation', hasQuestion: true, isMicroAck: true },
  { id: 'c5', text: "Hey, what's up?", tone: 'continuation', hasQuestion: true, isMicroAck: true },
  { id: 'c6', text: "Back — which coin?", tone: 'continuation', hasQuestion: true, isMicroAck: true },
];

// ============================================================================
// SOURCE PROTOCOL — NAMED FEEDS + FRESHNESS
// ============================================================================

/**
 * Production data sources with REAL provider names
 * Layer 1: Data type (plain language)
 * Layer 2: Exact providers (named) — NO VAGUE HAND-WAVING
 * Layer 3: Freshness + confidence
 * 
 * HARD RULE: If you can't name the provider, say "internal aggregation"
 * and offer to show the configured feed list.
 */
export const SOURCE_PROTOCOL_DATA: SourceProtocol[] = [
  {
    dataType: 'PRICE',
    humanDescription: 'Prices, volume, market cap',
    providers: [
      { name: 'CoinGecko', backup: 'CoinMarketCap + DexScreener (for DEX tokens)', freshness: 'near_realtime', freshnessDescription: 'Updates every 1-2 minutes' },
    ],
  },
  {
    dataType: 'DERIVATIVES',
    humanDescription: 'Funding rates, open interest, liquidations',
    providers: [
      { name: 'Coinglass', backup: 'Binance Futures + OKX + Bybit (free APIs)', freshness: 'near_realtime', freshnessDescription: 'Updates every 1-5 minutes' },
    ],
  },
  {
    dataType: 'ONCHAIN',
    humanDescription: 'Exchange flows, whale moves, TVL',
    providers: [
      { name: 'DeFiLlama (TVL/fees)', backup: 'Internal aggregation via RPC providers', freshness: 'near_realtime', freshnessDescription: 'Updates every 5-15 minutes' },
    ],
  },
  {
    dataType: 'GOVERNANCE',
    humanDescription: 'Voting, proposals, DAO activity',
    providers: [
      { name: 'Snapshot.org', freshness: 'near_realtime', freshnessDescription: 'Updates with each proposal/vote' },
    ],
  },
  {
    dataType: 'SECURITY',
    humanDescription: 'Contract audits, honeypot detection, token safety',
    providers: [
      { name: 'GoPlus Security', freshness: 'near_realtime', freshnessDescription: 'Scanned on request' },
    ],
  },
  {
    dataType: 'SENTIMENT',
    humanDescription: 'Social buzz, community sentiment',
    providers: [
      { name: 'LunarCrush', backup: 'X/Twitter signals + internal classifier', freshness: 'near_realtime', freshnessDescription: 'Aggregated hourly' },
    ],
  },
  {
    dataType: 'DEV_ACTIVITY',
    humanDescription: 'GitHub commits, development momentum',
    providers: [
      { name: 'GitHub Events API', freshness: 'delayed', freshnessDescription: 'Aggregated daily' },
    ],
  },
  {
    dataType: 'NEWS',
    humanDescription: 'News headlines, event detection',
    providers: [
      { name: 'CryptoPanic', backup: 'CoinGecko News + Messari + RSS feeds (CoinDesk, Decrypt)', freshness: 'near_realtime', freshnessDescription: 'Updates every 15-30 minutes' },
    ],
  },
];

/**
 * Generate a concrete source protocol response
 */
export function generateSourceProtocolResponse(asset?: string): SourceProtocolResponse {
  const assetContext = asset ? ` for ${asset}` : '';
  
  return {
    layers: SOURCE_PROTOCOL_DATA,
    summary: `Here's where my data comes from${assetContext}:`,
    caveat: 'If you want the exact signal list we use for QS and OS scoring, I can show you that too.',
  };
}

/**
 * Format source protocol as human-readable response
 */
export function formatSourceProtocolResponse(response: SourceProtocolResponse): string {
  let output = response.summary + '\n\n';
  
  for (const layer of response.layers) {
    const provider = layer.providers[0];
    const backup = provider.backup ? ` (backup: ${provider.backup})` : '';
    output += `• **${layer.humanDescription}**: ${provider.name}${backup} — ${provider.freshnessDescription}\n`;
  }
  
  if (response.caveat) {
    output += `\n${response.caveat}`;
  }
  
  return output;
}

// ============================================================================
// ANTI-BOT TEMPLATE SYSTEM v1.0 — HUMAN RESPONSE ENGINE
// ============================================================================
// 
// Prime directive: Sound like a real person. Never sound like a reusable script.
// Prioritize conversational flow over "showing metrics." Be concise by default.
//
// This system prevents the "template bot" issue through:
// 1. Phrase cooldowns (hard bans on repeated phrases)
// 2. Shape rotation (never same structure twice)
// 3. Lexical rotation (controlled synonym variation)
// 4. Self-check validation (rewrite if botty)
// ============================================================================

/**
 * User intent classification (choose exactly 1)
 */
export type UserIntent =
  | 'SOCIAL'        // hey/yo/sup/emoji
  | 'DATA_REQUEST'  // overview/update/price/metrics
  | 'EXPLAIN'       // why did it move / what does X mean
  | 'ADVICE'        // should I buy/sell/entries
  | 'PRODUCT';      // how Coinet works / sources / bugs

/**
 * Response size classification
 */
export type ResponseSize = 'S' | 'M' | 'L';

/**
 * Response shape - rotate to avoid sounding templated
 */
export type ResponseShape =
  | 'ONE_LINER_QUESTION'    // Shape 1: anchor + core (1 line) + question
  | 'VIBE_WHY_QUESTION'     // Shape 2: anchor + vibe + why (1-2 lines) + question
  | 'TWO_BULLETS_QUESTION'  // Shape 3: anchor + 2 bullets + question
  | 'DRIVER_FIRST'          // Shape 4: anchor + main driver + 1-2 supports + question
  | 'ADVICE_GUARDRAIL';     // Shape 5: anchor + safe guidance + risk + ask timeframe

/**
 * Meaning block types for response composition
 */
export interface MeaningBlocks {
  anchor: string;           // Block A: 1 short line reflecting user message
  corePoint: string;        // Block B: single most useful conclusion
  support?: string;         // Block C: 1-3 lines of detail (optional)
  nextStep: string;         // Block D: exactly ONE question
}

/**
 * Anti-bot state for tracking cooldowns and rotations
 */
export interface AntiBotState {
  recentPhrases: string[];      // Last 30 phrases used (for cooldown)
  recentShapes: ResponseShape[]; // Last 5 shapes used (for rotation)
  recentAnchors: string[];       // Last 5 anchors used
  recentConnectors: string[];    // Last 5 connectors used
  lastResponseLength: number;    // For jitter calculation
}

/**
 * Self-check validation result
 */
export interface SelfCheckResult {
  passed: boolean;
  failures: string[];
  suggestions: string[];
}

// ============================================================================
// PHRASE COOLDOWN BLACKLIST — BANNED BOT PHRASES
// ============================================================================

/**
 * Phrases that are BANNED if used in last N turns.
 * These are the most common "bot giveaways" in Coinet responses.
 */
export const PHRASE_COOLDOWN_LIST: { phrase: string; cooldownTurns: number }[] = [
  // Opener cooldowns (ban for 5 turns)
  { phrase: 'Got you', cooldownTurns: 5 },
  { phrase: 'Got it', cooldownTurns: 5 },
  { phrase: 'Yo —', cooldownTurns: 5 },
  { phrase: 'Hey —', cooldownTurns: 5 },
  { phrase: 'Alright —', cooldownTurns: 5 },
  { phrase: 'Sure —', cooldownTurns: 5 },
  { phrase: 'Keeping it short', cooldownTurns: 8 },
  { phrase: 'Quick pulse', cooldownTurns: 8 },
  { phrase: 'Fast snapshot', cooldownTurns: 8 },
  
  // Connector cooldowns (ban for 5 turns)
  { phrase: 'neutral and choppy', cooldownTurns: 5 },
  { phrase: 'feels choppy', cooldownTurns: 5 },
  { phrase: 'still sideways', cooldownTurns: 5 },
  { phrase: 'messy tape', cooldownTurns: 5 },
  { phrase: 'no clean direction', cooldownTurns: 5 },
  { phrase: 'balanced and range', cooldownTurns: 5 },
  { phrase: 'range-bound', cooldownTurns: 5 },
  { phrase: 'leverage is the risk', cooldownTurns: 5 },
  
  // Closer cooldowns (ban for 5 turns)
  { phrase: 'want the receipts', cooldownTurns: 5 },
  { phrase: 'want receipts', cooldownTurns: 5 },
  { phrase: 'You here for markets', cooldownTurns: 8 },
  { phrase: 'markets or something else', cooldownTurns: 8 },
  { phrase: 'entries or direction', cooldownTurns: 5 },
  { phrase: 'entries or just direction', cooldownTurns: 5 },
  { phrase: 'levels or entries', cooldownTurns: 5 },
  { phrase: 'quick vibe or deep dive', cooldownTurns: 8 },
  { phrase: 'quick pulse or', cooldownTurns: 8 },
  
  // Generic bot phrases (ban for 10 turns)
  { phrase: 'Let me know if', cooldownTurns: 10 },
  { phrase: 'Feel free to', cooldownTurns: 10 },
  { phrase: 'Happy to help', cooldownTurns: 10 },
  { phrase: 'I\'d be happy to', cooldownTurns: 10 },
  { phrase: 'Let\'s dive into', cooldownTurns: 10 },
  { phrase: 'Great question', cooldownTurns: 10 },
  { phrase: 'Absolutely', cooldownTurns: 10 },
];

/**
 * N-gram size for repetition blocking
 * Don't reuse any 4-word sequence from last 10 turns
 */
export const NGRAM_BLOCK_SIZE = 4;
export const NGRAM_BLOCK_TURNS = 10;

// ============================================================================
// LEXICAL ROTATION TABLES — CONTROLLED SYNONYM VARIATION
// ============================================================================

/**
 * Acknowledgement variations (rotate, never same twice in a row)
 */
export const ACKNOWLEDGEMENT_BANK = [
  'Alright',
  'Sure',
  'Okay',
  'Yep',
  'Makes sense',
  'Cool',
  'Got it',
  'On it',
  'Heard',
];

// ============================================================================
// BANNED BOT PHRASES — HARD BLACKLIST (never use these)
// ============================================================================

/**
 * These phrases are COMPLETELY BANNED. If they appear in a draft → rewrite.
 * They are the most obvious "AI assistant" giveaways.
 */
export const BANNED_BOT_PHRASES = [
  // Menu questions (the worst offenders)
  'Want levels or just the vibe',
  'Want X or Y',
  'Want the receipts',
  'entries or direction',
  'entries or just direction',
  'levels or entries',
  'quick pulse or',
  'quick vibe or deep dive',
  'You here for markets or something else',
  'markets or something else',
  
  // Overused Coinet catchphrases
  'quick pulse',
  'the receipts',
  'neutral and choppy',
  'feels choppy',
  'the vibe',
  'just the vibe',
  
  // Generic AI phrases
  'Let me know if',
  'Feel free to',
  'Happy to help',
  'I\'d be happy to',
  'Let\'s dive into',
  'Great question',
  'Absolutely',
  'Certainly',
  'I understand',
  'That\'s a great',
  
  // Salesy CTAs
  'Would you like me to',
  'Shall I',
  'Do you want me to',
  'If you\'d like',
  'I can also',
];

/**
 * Natural sentence starters (not bot-like)
 */
export const NATURAL_STARTERS = [
  'Right now',
  'At the moment',
  'Currently',
  'Looks like',
  'So far',
  'From what I see',
  'Honestly',
  'To be real',
  'The short version:',
  'Here\'s the deal:',
  'Basically',
  'In short',
];

/**
 * Natural market descriptions (replace "neutral and choppy")
 */
export const MARKET_DESCRIPTION_BANK = [
  'sideways, nothing clear yet',
  'grinding without a real trend',
  'range-bound, no breakout yet',
  'quiet, no strong move either way',
  'consolidating, waiting for a trigger',
  'stuck between levels',
  'not much happening',
  'coiling up, could go either way',
  'holding but without conviction',
  'mixed signals, no clear direction',
];

/**
 * Natural depth offers (replace "want the receipts")
 */
export const DEPTH_OFFER_BANK = [
  'I can go deeper if you want.',
  'There\'s more detail if you need it.',
  'Let me know if you want the full picture.',
  'I can break it down more.',
  'Happy to expand on that.',
  'More specifics if that helps.',
];

/**
 * NATURAL follow-up questions (NOT menus, NOT bot-like)
 * These are questions a real person would ask in a chat.
 */
export const NATURAL_FOLLOWUP_QUESTIONS: Record<UserIntent, string[]> = {
  SOCIAL: [
    'What\'s up?',
    'What are you looking at?',
    'Anything specific?',
    'What do you need?',
  ],
  DATA_REQUEST: [
    // Natural, not menu-style
    'Which coin are you watching?',
    'What are you trading right now?',
    'Anything specific you want to check?',
    'BTC or something else?',
    'What\'s on your radar?',
    'Any particular coin?',
  ],
  EXPLAIN: [
    'Does that make sense?',
    'Clear enough?',
    'Need me to go deeper?',
    'Anything else on that?',
  ],
  ADVICE: [
    'What\'s your timeframe?',
    'How long are you planning to hold?',
    'What size are you thinking?',
    'How much risk are you comfortable with?',
  ],
  PRODUCT: [
    'Anything specific you want to know?',
    'What part are you curious about?',
    'Need more detail?',
  ],
};

// Keep old exports for backwards compatibility but mark as deprecated
/** @deprecated Use NATURAL_FOLLOWUP_QUESTIONS instead */
export const FOLLOWUP_QUESTIONS = NATURAL_FOLLOWUP_QUESTIONS;

/** @deprecated Use MARKET_DESCRIPTION_BANK instead */
export const CHOP_PHRASING_BANK = MARKET_DESCRIPTION_BANK;

/** @deprecated Use DEPTH_OFFER_BANK instead */
export const DEPTH_ASK_BANK = DEPTH_OFFER_BANK;

/** @deprecated Use NATURAL_STARTERS instead */
export const QUICK_FRAMING_BANK = NATURAL_STARTERS;

// ============================================================================
// RESPONSE SHAPE DEFINITIONS
// ============================================================================

/**
 * Shape templates with structure rules
 */
export const RESPONSE_SHAPES: Record<ResponseShape, {
  blocks: ('anchor' | 'corePoint' | 'support' | 'nextStep')[];
  maxLines: number;
  bulletAllowed: boolean;
  description: string;
}> = {
  ONE_LINER_QUESTION: {
    blocks: ['anchor', 'corePoint', 'nextStep'],
    maxLines: 3,
    bulletAllowed: false,
    description: 'Anchor + core point (1 line) + question. Best for S responses.',
  },
  VIBE_WHY_QUESTION: {
    blocks: ['anchor', 'corePoint', 'support', 'nextStep'],
    maxLines: 6,
    bulletAllowed: false,
    description: 'Anchor + vibe/core + why (1-2 lines) + question. Default for M.',
  },
  TWO_BULLETS_QUESTION: {
    blocks: ['anchor', 'support', 'nextStep'],
    maxLines: 6,
    bulletAllowed: true,
    description: 'Anchor + 2 bullets max + question. Good for M.',
  },
  DRIVER_FIRST: {
    blocks: ['anchor', 'corePoint', 'support', 'nextStep'],
    maxLines: 8,
    bulletAllowed: false,
    description: 'Anchor + main driver + 1-2 supports + question. For EXPLAIN intent.',
  },
  ADVICE_GUARDRAIL: {
    blocks: ['anchor', 'corePoint', 'support', 'nextStep'],
    maxLines: 6,
    bulletAllowed: false,
    description: 'Anchor + safe guidance + risk framing + ask timeframe. For ADVICE intent.',
  },
};

// ============================================================================
// ANTI-BOT FUNCTIONS
// ============================================================================

/**
 * Classify user intent from message
 */
export function classifyUserIntent(message: string): UserIntent {
  const lower = message.toLowerCase().trim();
  
  // SOCIAL: greetings and short social messages
  if (/^(?:hey|hi|yo|sup|hello|what'?s up|👋|gm|gn)\s*[!?.]*$/i.test(lower)) {
    return 'SOCIAL';
  }
  if (lower.length <= 5 && /^[hey|hi|yo|sup]/i.test(lower)) {
    return 'SOCIAL';
  }
  
  // PRODUCT: asking about Coinet itself
  if (/\b(?:coinet|sources?|where\s+(?:do|does)|how\s+(?:do|does)\s+(?:you|this|it)|data\s+(?:from|sources?)|your\s+(?:data|feeds?|apis?))\b/i.test(lower)) {
    return 'PRODUCT';
  }
  
  // ADVICE: decision-making questions
  if (/\b(?:should\s+i|worth\s+(?:buying|selling)|good\s+(?:entry|time)|buy\s+(?:now|here)|sell\s+(?:now|here)|advice|recommend|suggestion|what\s+(?:do\s+you\s+think|would\s+you\s+do))\b/i.test(lower)) {
    return 'ADVICE';
  }
  
  // EXPLAIN: why/what questions about movements
  if (/\b(?:why\s+(?:did|is|are|was)|what\s+(?:happened|caused|drove)|explain|how\s+come|what\s+does\s+\w+\s+mean)\b/i.test(lower)) {
    return 'EXPLAIN';
  }
  
  // DATA_REQUEST: asking for data, updates, overview
  if (/\b(?:overview|update|price|chart|levels?|metrics?|pulse|snapshot|market|btc|eth|sol|omniscore|qs|os)\b/i.test(lower)) {
    return 'DATA_REQUEST';
  }
  
  // Default to DATA_REQUEST for crypto-related queries
  return 'DATA_REQUEST';
}

/**
 * Determine response size based on intent and message
 */
export function determineResponseSize(intent: UserIntent, message: string, isDepthOptIn: boolean): ResponseSize {
  // L: Only if user explicitly asked for depth
  if (isDepthOptIn) {
    return 'L';
  }
  
  const lower = message.toLowerCase();
  
  // L triggers: explicit depth requests
  if (/\b(?:deep\s+dive|full\s+breakdown|detailed|comprehensive|everything|all\s+the)\b/i.test(lower)) {
    return 'L';
  }
  
  // S: social or very short messages
  if (intent === 'SOCIAL') {
    return 'S';
  }
  if (message.length < 15) {
    return 'S';
  }
  
  // S: vague or minimal requests
  if (/^(?:thoughts|views?|take|opinion|how\s+is|what'?s)\s*[a-z]*\s*\??$/i.test(lower)) {
    return 'S';
  }
  
  // Default to M for everything else
  return 'M';
}

/**
 * Select response shape based on intent, size, and rotation history
 */
export function selectResponseShape(
  intent: UserIntent,
  size: ResponseSize,
  recentShapes: ResponseShape[] = []
): ResponseShape {
  // Get candidates based on intent and size
  let candidates: ResponseShape[];
  
  if (size === 'S') {
    candidates = ['ONE_LINER_QUESTION'];
  } else if (intent === 'EXPLAIN') {
    candidates = ['DRIVER_FIRST', 'VIBE_WHY_QUESTION'];
  } else if (intent === 'ADVICE') {
    candidates = ['ADVICE_GUARDRAIL'];
  } else {
    // DATA_REQUEST, PRODUCT, etc.
    candidates = ['VIBE_WHY_QUESTION', 'TWO_BULLETS_QUESTION', 'ONE_LINER_QUESTION'];
  }
  
  // Filter out recently used shapes
  const lastShape = recentShapes[recentShapes.length - 1];
  const available = candidates.filter(s => s !== lastShape);
  
  // Return a different shape than last time
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  
  return candidates[0];
}

/**
 * Select a connector from bank, avoiding recent ones
 */
export function selectFromBank(bank: string[], recentUsed: string[] = []): string {
  // Filter out recently used
  const available = bank.filter(item => !recentUsed.slice(-5).includes(item));
  
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  
  // Fallback to random from full bank
  return bank[Math.floor(Math.random() * bank.length)];
}

/**
 * Check if a phrase is on cooldown
 */
export function isPhraseOnCooldown(phrase: string, recentPhrases: string[]): boolean {
  const lowerPhrase = phrase.toLowerCase();
  
  for (const { phrase: banned, cooldownTurns } of PHRASE_COOLDOWN_LIST) {
    if (lowerPhrase.includes(banned.toLowerCase())) {
      // Check if this phrase appears in recent history within cooldown window
      const recentWindow = recentPhrases.slice(-cooldownTurns);
      if (recentWindow.some(p => p.toLowerCase().includes(banned.toLowerCase()))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Extract n-grams from text for repetition checking
 */
export function extractNgrams(text: string, n: number): Set<string> {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const ngrams = new Set<string>();
  
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(' '));
  }
  
  return ngrams;
}

/**
 * Check for n-gram repetition
 */
export function hasNgramRepetition(
  newText: string,
  recentTexts: string[],
  ngramSize: number = NGRAM_BLOCK_SIZE,
  lookbackTurns: number = NGRAM_BLOCK_TURNS
): boolean {
  const newNgrams = extractNgrams(newText, ngramSize);
  const recentWindow = recentTexts.slice(-lookbackTurns);
  
  for (const recent of recentWindow) {
    const recentNgrams = extractNgrams(recent, ngramSize);
    for (const ngram of newNgrams) {
      if (recentNgrams.has(ngram)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Run self-check validation on a draft response
 */
export function runSelfCheck(
  draftResponse: string,
  state: AntiBotState,
  expectedShape: ResponseShape
): SelfCheckResult {
  const failures: string[] = [];
  const suggestions: string[] = [];
  
  // 1. Check for repeated opener from last 5 turns
  const firstLine = draftResponse.split('\n')[0] || '';
  for (const recentAnchor of state.recentAnchors.slice(-5)) {
    if (firstLine.toLowerCase().includes(recentAnchor.toLowerCase().slice(0, 10))) {
      failures.push('Repeated opener from last 5 turns');
      suggestions.push(`Rewrite opener. Avoid: "${recentAnchor.slice(0, 20)}..."`);
      break;
    }
  }
  
  // 2. Check for 4-word sequence repetition from last 10 turns
  if (hasNgramRepetition(draftResponse, state.recentPhrases, 4, 10)) {
    failures.push('Repeated 4-word sequence from last 10 turns');
    suggestions.push('Rewrite to use different phrasing');
  }
  
  // 3. Check shape differs from previous
  const lastShape = state.recentShapes[state.recentShapes.length - 1];
  if (lastShape === expectedShape && state.recentShapes.length > 0) {
    failures.push('Same shape as previous response');
    suggestions.push('Use a different response structure');
  }
  
  // 4. Check for exactly one question
  const questionMarks = (draftResponse.match(/\?/g) || []).length;
  if (questionMarks === 0) {
    failures.push('No question at end');
    suggestions.push('Add exactly one follow-up question');
  } else if (questionMarks > 2) {
    failures.push('Too many questions');
    suggestions.push('Reduce to exactly one question');
  }
  
  // 5. Check for bot phrases on cooldown
  for (const { phrase } of PHRASE_COOLDOWN_LIST) {
    if (draftResponse.toLowerCase().includes(phrase.toLowerCase())) {
      if (isPhraseOnCooldown(phrase, state.recentPhrases)) {
        failures.push(`Phrase on cooldown: "${phrase}"`);
        suggestions.push(`Replace "${phrase}" with alternative`);
      }
    }
  }
  
  // 6. Check for "news anchor" phrases
  const newsAnchorPhrases = [
    'Let\'s dive into',
    'I\'d like to discuss',
    'It\'s important to note',
    'In conclusion',
    'To summarize',
    'Moving forward',
  ];
  for (const phrase of newsAnchorPhrases) {
    if (draftResponse.includes(phrase)) {
      failures.push(`"News anchor" phrase detected: "${phrase}"`);
      suggestions.push('Rewrite in casual DM style');
    }
  }
  
  return {
    passed: failures.length === 0,
    failures,
    suggestions,
  };
}

/**
 * Get metric budget based on intent
 */
export function getIntentMetricBudget(intent: UserIntent): { maxNumbers: number; allowScores: boolean } {
  switch (intent) {
    case 'SOCIAL':
      return { maxNumbers: 0, allowScores: false };
    case 'DATA_REQUEST':
      return { maxNumbers: 5, allowScores: true };
    case 'EXPLAIN':
      return { maxNumbers: 3, allowScores: false };
    case 'ADVICE':
      return { maxNumbers: 0, allowScores: false }; // No numbers unless user asked for levels
    case 'PRODUCT':
      return { maxNumbers: 0, allowScores: false };
    default:
      return { maxNumbers: 3, allowScores: false };
  }
}

/**
 * Generate anti-bot guidance for the AI
 */
export function generateAntiBotGuidance(
  message: string,
  conversationHistory?: { role: string; content: string }[]
): string {
  const intent = classifyUserIntent(message);
  const isDepthOptIn = /\b(?:deep|full|detailed|comprehensive|breakdown|everything)\b/i.test(message);
  const size = determineResponseSize(intent, message, isDepthOptIn);
  
  // Build state from conversation history
  const recentAssistant = conversationHistory
    ?.filter(m => m.role === 'assistant')
    .map(m => m.content)
    .slice(-30) || [];
  
  const state: AntiBotState = {
    recentPhrases: recentAssistant,
    recentShapes: [], // Would need to be tracked externally
    recentAnchors: recentAssistant.map(t => t.split('\n')[0] || ''),
    recentConnectors: [],
    lastResponseLength: recentAssistant[recentAssistant.length - 1]?.length || 0,
  };
  
  const shape = selectResponseShape(intent, size, state.recentShapes);
  const shapeConfig = RESPONSE_SHAPES[shape];
  const metricBudget = getIntentMetricBudget(intent);
  
  // Select fresh connectors
  const freshAck = selectFromBank(ACKNOWLEDGEMENT_BANK, state.recentAnchors.slice(-5));
  const freshChop = selectFromBank(CHOP_PHRASING_BANK, state.recentPhrases.slice(-5));
  const freshDepthAsk = selectFromBank(DEPTH_ASK_BANK, state.recentPhrases.slice(-5));
  const freshFollowup = selectFromBank(FOLLOWUP_QUESTIONS[intent] || FOLLOWUP_QUESTIONS.DATA_REQUEST, state.recentPhrases.slice(-5));
  
  return `
═══════════════════════════════════════════════════════════════════════════════
🎭 ANTI-BOT TEMPLATE SYSTEM — HUMAN RESPONSE ENGINE
═══════════════════════════════════════════════════════════════════════════════

PRIME DIRECTIVE: Sound like a real person. Never sound like a reusable script.

CLASSIFICATION:
• Intent: ${intent}
• Response Size: ${size}
• Shape: ${shape} — ${shapeConfig.description}

SHAPE STRUCTURE (${shape}):
${shapeConfig.blocks.map((b, i) => `${i + 1}. ${b.toUpperCase()}`).join('\n')}
Max lines: ${shapeConfig.maxLines}
Bullets allowed: ${shapeConfig.bulletAllowed ? 'YES (max 2)' : 'NO'}

═══════════════════════════════════════════════════════════════════════════════
🚫 PHRASE COOLDOWN — THESE ARE BANNED RIGHT NOW
═══════════════════════════════════════════════════════════════════════════════

DO NOT USE (on cooldown from recent responses):
${PHRASE_COOLDOWN_LIST.slice(0, 15).map(p => `• "${p.phrase}"`).join('\n')}

FRESH ALTERNATIVES TO USE INSTEAD:
• Acknowledgement: "${freshAck}"
• Chop/sideways: "${freshChop}"
• Depth ask: "${freshDepthAsk}"
• Follow-up: "${freshFollowup}"

═══════════════════════════════════════════════════════════════════════════════
📊 METRIC BUDGET FOR ${intent}
═══════════════════════════════════════════════════════════════════════════════

Max numbers: ${metricBudget.maxNumbers}
Scores allowed (/100): ${metricBudget.allowScores ? 'YES' : 'NO'}

${metricBudget.maxNumbers === 0 ? `
🚫 NO NUMBERS ALLOWED for this intent.
Keep it qualitative only.
` : `
✅ You may use up to ${metricBudget.maxNumbers} numbers.
Round to clean values (85k not 84,732).
`}

═══════════════════════════════════════════════════════════════════════════════
🔄 VARIATION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

1. OPENER: Must be different from last 5. Use: "${freshAck}" or similar.
2. SHAPE: Using ${shape}. Must differ from previous response.
3. CONNECTORS: Rotate. Don't reuse any word sequence from last 10 turns.
4. LENGTH JITTER: ${size === 'M' ? 'Vary between 4-8 lines' : size === 'S' ? '1-3 lines only' : '8-15 lines allowed'}

═══════════════════════════════════════════════════════════════════════════════
✅ SELF-CHECK BEFORE SENDING (must pass ALL)
═══════════════════════════════════════════════════════════════════════════════

□ Opener is different from last 5 turns
□ No 4-word sequences repeated from last 10 turns
□ Shape differs from previous response
□ Numbers within budget (${metricBudget.maxNumbers} max)
□ Exactly 1 question at the end
□ Sounds like a DM, not a report

If ANY check fails → REWRITE with different shape + different connectors.

═══════════════════════════════════════════════════════════════════════════════
`;
}

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
 * Metrics Gate state - controls if numbers are allowed
 */
export type MetricsGateState = 'BLOCK' | 'LIMIT' | 'ALLOW';

/**
 * Metric categories for budget tracking
 */
export type MetricCategory =
  | 'PRICE'        // Prices, % change, market cap
  | 'DERIVATIVES'  // Funding, OI, liquidations, basis
  | 'ONCHAIN'      // Exchange flows, whale tx, reserves
  | 'INDICATORS'   // Fear & Greed, RSI, sentiment
  | 'SCORES';      // OmniScore, /100 ratings

/**
 * Metric budget - caps on numbers allowed
 */
export interface MetricBudget {
  maxNumbers: number;
  maxMetricCategories: number;
  maxTickers: number;
  allowScores: boolean;
  preferRounded: boolean;
  requireReceiptsBlock: boolean;
}

/**
 * Metrics Gate result
 */
export interface MetricsGate {
  state: MetricsGateState;
  budget: MetricBudget;
  allowedCategories: MetricCategory[];
  priorityMetrics: string[];  // Which metrics to show first
  receiptsOffer: string | null;
  reason: string;
}

/**
 * All extracted signals from a message
 */
export interface MessageSignals {
  rawMessage: string;              // Original message for anti-bot processing
  length: LengthSignal;
  depth: DepthSignal;
  urgency: UrgencySignal;
  state: StateSignal;
  domain: DomainSignal;
  detectedAssets: string[];
  isGreeting: boolean;
  isDepthOptIn: boolean;
  // For human behaviors
  hasTimeframe: boolean;
  hasGoal: boolean;
  requestsAnalysis: boolean;
  requestsDecision: boolean;
  // For metrics gate
  requestsData: boolean;           // User explicitly wants data/metrics
  requestsSpecificMetrics: boolean; // User asked for specific metric types
  requestedMetricTypes: MetricCategory[];
  // For source protocol
  requestsSources: boolean;        // User asks about data sources
  requestsOmniScore: boolean;      // User asks for OmniScore specifically
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
  metricsGate: MetricsGate;
  // New: Greeting cooldown
  greetingCooldown: GreetingCooldownState;
  // New: Topic persistence
  topicPersistence: TopicPersistenceState;
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

// ============================================================================
// METRICS GATE — Signal Detection
// ============================================================================

/**
 * Check if user is requesting data/metrics (general data request)
 * These trigger LIMIT gate state (2-5 numbers allowed)
 */
function detectsDataRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const dataPatterns = [
    /\boverview\b/,
    /\bupdate\b/,
    /\bmarket\b/,
    /\bhow'?s\s+(?:it|the|things?)\s+(?:looking|going)\b/,
    /\bstats?\b/,
    /\bnumbers?\b/,
    /\bdata\b/,
    /\bprice\b/,
    /\bchart\b/,
    /\blevels?\b/,
    /\bsupport\b/,
    /\bresistance\b/,
    /\btargets?\b/,
    /\bwhat'?s\s+(?:btc|eth|sol|bitcoin|ethereum|solana)\b/,
    /\bhow'?s\s+(?:btc|eth|sol|bitcoin|ethereum|solana)\b/,
  ];
  return dataPatterns.some(p => p.test(lower));
}

/**
 * Check if user is requesting specific metrics (ALLOW gate state)
 * These trigger full metrics allowed with receipts block
 */
function detectsSpecificMetrics(message: string): { 
  requested: boolean; 
  types: MetricCategory[] 
} {
  const lower = message.toLowerCase();
  const types: MetricCategory[] = [];
  
  // Price metrics
  if (/\b(?:price|prices|%|percent|market\s*cap|mcap|volume|vol)\b/.test(lower)) {
    types.push('PRICE');
  }
  
  // Derivatives metrics
  if (/\b(?:funding|oi|open\s*interest|liqs?|liquidations?|basis|perps?|futures?|iv|implied)\b/.test(lower)) {
    types.push('DERIVATIVES');
  }
  
  // On-chain metrics
  if (/\b(?:on[\s-]?chain|flows?|whale|whales|exchange\s+(?:flows?|reserves?)|reserves?|inflows?|outflows?)\b/.test(lower)) {
    types.push('ONCHAIN');
  }
  
  // Indicator metrics
  if (/\b(?:fear\s*(?:and|&)?\s*greed|sentiment|rsi|macd|indicators?|technicals?|ta)\b/.test(lower)) {
    types.push('INDICATORS');
  }
  
  // Score metrics
  if (/\b(?:omniscore|score|scores|rating|ratings|\/100)\b/.test(lower)) {
    types.push('SCORES');
  }
  
  // Explicit data requests
  const explicitPatterns = [
    /\bshow\s+(?:me\s+)?(?:the\s+)?(?:exact|latest|current)\b/,
    /\bgive\s+(?:me\s+)?(?:the\s+)?(?:numbers?|data|stats?|metrics?)\b/,
    /\bpull\s+(?:the\s+)?(?:latest|current|a)?\s*(?:snapshot|data|numbers?)\b/,
    /\bexact\s+(?:numbers?|data|price)\b/,
    /\blatest\s+(?:numbers?|data|stats?)\b/,
  ];
  
  const hasExplicitRequest = explicitPatterns.some(p => p.test(lower));
  
  return {
    requested: types.length > 0 || hasExplicitRequest,
    types,
  };
}

/**
 * Check if user is asking about data sources
 */
function detectsSourcesRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const sourcePatterns = [
    /\bsources?\b/,
    /\bwhere\s+(?:does?|do)\s+(?:you|your|the)\s+(?:data|info|information)\b/,
    /\bwhere\s+(?:is|are)\s+(?:the\s+)?(?:data|prices?|metrics?)\s+(?:from|coming)\b/,
    /\b(?:data|info|information)\s+(?:sources?|providers?|feeds?)\b/,
    /\bhow\s+(?:do\s+you|does\s+coinet)\s+(?:get|fetch|pull)\s+(?:data|prices?)\b/,
    /\bwhat\s+(?:data|feeds?|apis?)\s+(?:do\s+you|does\s+coinet)\s+use\b/,
    /\bsources?\s+and\s+data\b/,
    /\bdata\s+and\s+sources?\b/,
  ];
  return sourcePatterns.some(p => p.test(lower));
}

/**
 * Check if user is asking for OmniScore specifically
 */
function detectsOmniScoreRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const omniPatterns = [
    /\bomniscore\b/,
    /\bomni\s*score\b/,
    /\b(?:qs|os)\s*(?:score|breakdown)?\b/,
    /\bquality\s*score\b/,
    /\bopportunity\s*score\b/,
    /\bfull\s+(?:qs|os|scores?|metrics?|breakdown)\b/,
  ];
  return omniPatterns.some(p => p.test(lower));
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
  
  // Detect data/metrics requests
  const dataRequest = detectsDataRequest(message);
  const specificMetrics = detectsSpecificMetrics(message);
  
  // Detect source and omniscore requests
  const sourcesRequest = detectsSourcesRequest(message);
  const omniScoreRequest = detectsOmniScoreRequest(message);
  
  return {
    rawMessage: message,
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
    requestsData: dataRequest || specificMetrics.requested,
    requestsSpecificMetrics: specificMetrics.requested,
    requestedMetricTypes: specificMetrics.types,
    requestsSources: sourcesRequest,
    requestsOmniScore: omniScoreRequest,
  };
}

// ============================================================================
// STEP 1B — GREETING COOLDOWN + VARIATION BANK
// ============================================================================

/**
 * Determine greeting cooldown state and select appropriate variant.
 * 
 * Rules:
 * - If greeting within last N turns → use micro-ack + context carry
 * - Never reuse same variant within 5 turns
 * - Select variant based on current conversation mode
 */
export function runGreetingCooldown(
  signals: MessageSignals,
  conversationHistory?: { role: string; content: string }[],
  recentGreetingIds: string[] = []
): GreetingCooldownState {
  // Default state
  const defaultGreeting = GREETING_VARIANTS_FULL[0];
  
  if (!signals.isGreeting) {
    return {
      shouldUseFullGreeting: false,
      lastGreetingTurnCount: -1,
      suggestedGreeting: defaultGreeting,
      recentlyUsedIds: recentGreetingIds,
      turnsWithinCooldown: false,
      reason: 'Not a greeting message',
    };
  }
  
  // Count turns since last greeting from assistant
  let turnsSinceLastGreeting = 999;
  if (conversationHistory && conversationHistory.length > 0) {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const turn = conversationHistory[i];
      if (turn.role === 'assistant') {
        // Check if this was a greeting response
        const isGreetingResponse = /^(?:hey|yo|what'?s up|sup)/i.test(turn.content.trim());
        if (isGreetingResponse) {
          turnsSinceLastGreeting = conversationHistory.length - 1 - i;
          break;
        }
      }
    }
  }
  
  const withinCooldown = turnsSinceLastGreeting <= GREETING_COOLDOWN_TURNS;
  
  // Determine conversation mode for context-aware greeting
  const topicPersistence = runTopicPersistence(signals, conversationHistory);
  
  // Select appropriate variant
  let selectedGreeting: GreetingVariant;
  
  if (withinCooldown) {
    // Use micro-ack variant
    const availableMicro = GREETING_VARIANTS_MICRO.filter(
      v => !recentGreetingIds.includes(v.id)
    );
    selectedGreeting = availableMicro.length > 0 
      ? availableMicro[Math.floor(Math.random() * availableMicro.length)]
      : GREETING_VARIANTS_MICRO[0];
  } else {
    // Use full greeting variant based on mode
    let toneFilter: GreetingTone = 'neutral';
    if (topicPersistence.currentMode === 'MARKET_MODE') {
      toneFilter = 'market_context';
    } else if (signals.urgency === 'URGENT') {
      toneFilter = 'fast';
    }
    
    // Filter by tone and exclude recently used
    const availableFull = GREETING_VARIANTS_FULL.filter(
      v => (v.tone === toneFilter || v.tone === 'neutral') && !recentGreetingIds.includes(v.id)
    );
    
    selectedGreeting = availableFull.length > 0
      ? availableFull[Math.floor(Math.random() * availableFull.length)]
      : GREETING_VARIANTS_FULL[Math.floor(Math.random() * GREETING_VARIANTS_FULL.length)];
  }
  
  return {
    shouldUseFullGreeting: !withinCooldown,
    lastGreetingTurnCount: turnsSinceLastGreeting,
    suggestedGreeting: selectedGreeting,
    recentlyUsedIds: [...recentGreetingIds.slice(-GREETING_REUSE_COOLDOWN + 1), selectedGreeting.id],
    turnsWithinCooldown: withinCooldown,
    reason: withinCooldown 
      ? `Greeting within cooldown (${turnsSinceLastGreeting} turns ago) — using micro-ack`
      : `Full greeting OK (${turnsSinceLastGreeting} turns since last)`,
  };
}

// ============================================================================
// STEP 1C — TOPIC PERSISTENCE (CONVERSATION MODE MEMORY)
// ============================================================================

/**
 * Determine and maintain conversation mode.
 * 
 * Modes:
 * - MARKET_MODE: User asking about coins, prices, market analysis
 * - PRODUCT_MODE: User asking about Coinet, how it works, data sources
 * - SOCIAL_MODE: Pure greeting/chat with no topic
 * - NONE: No mode established yet
 * 
 * Sticky behavior: Mode persists for ~10-15 turns or until user changes topic
 */
export function runTopicPersistence(
  signals: MessageSignals,
  conversationHistory?: { role: string; content: string }[]
): TopicPersistenceState {
  // Default state for new conversations
  if (!conversationHistory || conversationHistory.length === 0) {
    return {
      currentMode: 'NONE',
      modeConfidence: 0,
      turnsSinceModeSet: 0,
      shouldAskIntent: true,
      contextCarryPhrase: null,
      reason: 'New conversation — no mode established',
    };
  }
  
  // Scan recent history to determine mode
  const recentTurns = conversationHistory.slice(-10);
  let marketSignals = 0;
  let productSignals = 0;
  let lastModeSetTurn = 0;
  
  for (let i = 0; i < recentTurns.length; i++) {
    const turn = recentTurns[i];
    if (turn.role === 'user') {
      const content = turn.content.toLowerCase();
      
      // Market signals
      if (/\b(?:btc|eth|sol|bitcoin|ethereum|solana|market|price|chart|levels?|trade|trading|funding|oi|liquidations?)\b/.test(content)) {
        marketSignals++;
        lastModeSetTurn = i;
      }
      
      // Explicitly market-related commands
      if (/\b(?:omniscore|pulse|overview|update|what'?s\s+(?:btc|eth|sol|the\s+market))\b/.test(content)) {
        marketSignals += 2;
        lastModeSetTurn = i;
      }
      
      // Product signals
      if (/\b(?:coinet|sources?|data|how\s+(?:do|does)\s+you|where\s+(?:does?|do)\s+(?:the|your))\b/.test(content)) {
        productSignals++;
        lastModeSetTurn = i;
      }
    }
  }
  
  const turnsSinceModeSet = recentTurns.length - lastModeSetTurn;
  
  // Determine current mode
  let currentMode: ConversationMode = 'NONE';
  let modeConfidence = 0;
  
  if (marketSignals > productSignals && marketSignals >= 1) {
    currentMode = 'MARKET_MODE';
    modeConfidence = Math.min(1, marketSignals * 0.3);
  } else if (productSignals > marketSignals && productSignals >= 1) {
    currentMode = 'PRODUCT_MODE';
    modeConfidence = Math.min(1, productSignals * 0.3);
  } else if (signals.isGreeting && conversationHistory.length <= 2) {
    currentMode = 'SOCIAL_MODE';
    modeConfidence = 0.5;
  }
  
  // If current message is greeting, determine if we should ask intent
  const shouldAskIntent = signals.isGreeting && (
    currentMode === 'NONE' || 
    currentMode === 'SOCIAL_MODE' ||
    turnsSinceModeSet > 10  // Mode is stale
  );
  
  // Generate context carry phrase for when mode is active
  let contextCarryPhrase: string | null = null;
  if (signals.isGreeting && currentMode === 'MARKET_MODE' && !shouldAskIntent) {
    contextCarryPhrase = 'still on market stuff?';
  } else if (signals.isGreeting && currentMode === 'PRODUCT_MODE' && !shouldAskIntent) {
    contextCarryPhrase = 'more questions about how this works?';
  }
  
  return {
    currentMode,
    modeConfidence,
    turnsSinceModeSet,
    shouldAskIntent,
    contextCarryPhrase,
    reason: shouldAskIntent 
      ? `No strong mode detected or mode is stale — ask intent`
      : `${currentMode} active (confidence: ${(modeConfidence * 100).toFixed(0)}%) — carry context forward`,
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
// STEP 3 — METRICS GATE (No-Unasked-Metrics)
// ============================================================================

/**
 * Metric budgets for each gate state
 */
const METRIC_BUDGET_BLOCK: MetricBudget = {
  maxNumbers: 0,
  maxMetricCategories: 0,
  maxTickers: 0,
  allowScores: false,
  preferRounded: true,
  requireReceiptsBlock: false,
};

const METRIC_BUDGET_LIMIT: MetricBudget = {
  maxNumbers: 5,
  maxMetricCategories: 2,
  maxTickers: 6,
  allowScores: false,  // No /100 scores unless asked
  preferRounded: true, // Prefer 97k over $97,104
  requireReceiptsBlock: false,
};

const METRIC_BUDGET_ALLOW_M: MetricBudget = {
  maxNumbers: 12,
  maxMetricCategories: 4,
  maxTickers: 8,
  allowScores: true,
  preferRounded: false,
  requireReceiptsBlock: true,
};

const METRIC_BUDGET_ALLOW_L: MetricBudget = {
  maxNumbers: 20,
  maxMetricCategories: 5,
  maxTickers: 12,
  allowScores: true,
  preferRounded: false,
  requireReceiptsBlock: true,
};

/**
 * Run the Metrics Gate to determine if numbers are allowed.
 * 
 * BLOCK (default): No data request → 0 numbers
 * LIMIT: Overview/general request → 2-5 numbers, rounded, anchor only
 * ALLOW: Explicit metrics request → full metrics in receipts block
 */
function runMetricsGate(
  signals: MessageSignals, 
  mode: OutputMode,
  conversationHistory?: { role: string; content: string }[]
): MetricsGate {
  const { 
    domain, requestsData, requestsSpecificMetrics, 
    requestedMetricTypes, detectedAssets, isGreeting,
    requestsDecision
  } = signals;
  
  // BLOCK: Social/greetings — absolutely no numbers
  if (isGreeting || domain === 'SOCIAL') {
    return {
      state: 'BLOCK',
      budget: METRIC_BUDGET_BLOCK,
      allowedCategories: [],
      priorityMetrics: [],
      receiptsOffer: null,
      reason: 'Social/greeting message — no data allowed',
    };
  }
  
  // ALLOW: User explicitly requested specific metrics
  if (requestsSpecificMetrics && requestedMetricTypes.length > 0) {
    const budget = mode === 'L' ? METRIC_BUDGET_ALLOW_L : METRIC_BUDGET_ALLOW_M;
    return {
      state: 'ALLOW',
      budget,
      allowedCategories: requestedMetricTypes,
      priorityMetrics: getPriorityMetrics(requestedMetricTypes, detectedAssets),
      receiptsOffer: null,  // No offer needed — they asked for it
      reason: `User requested specific metrics: ${requestedMetricTypes.join(', ')}`,
    };
  }
  
  // LIMIT: General data request (overview, update, how's X looking)
  if (requestsData || detectedAssets.length > 0 || domain === 'MARKET_WIDE') {
    // Decision requests get LIMIT but avoid precision
    const allowedCategories: MetricCategory[] = ['PRICE'];
    if (domain === 'MARKET_WIDE') {
      allowedCategories.push('INDICATORS');  // Allow Fear & Greed for market overview
    }
    
    return {
      state: 'LIMIT',
      budget: { ...METRIC_BUDGET_LIMIT, maxNumbers: requestsDecision ? 2 : 5 },
      allowedCategories,
      priorityMetrics: getPriorityMetrics(allowedCategories, detectedAssets),
      receiptsOffer: getReceiptsOffer(domain, detectedAssets),
      reason: 'General data request — limited anchor numbers allowed',
    };
  }
  
  // Check for implicit data continuation from conversation
  if (conversationHistory && conversationHistory.length >= 2) {
    const lastTwoUserTurns = conversationHistory
      .filter(t => t.role === 'user')
      .slice(-2);
    
    const hadRecentDataRequest = lastTwoUserTurns.some(t => 
      detectsDataRequest(t.content) || detectsSpecificMetrics(t.content).requested
    );
    
    // User continuing a data discussion (e.g., "and ETH?")
    if (hadRecentDataRequest && detectedAssets.length > 0) {
      return {
        state: 'LIMIT',
        budget: METRIC_BUDGET_LIMIT,
        allowedCategories: ['PRICE'],
        priorityMetrics: getPriorityMetrics(['PRICE'], detectedAssets),
        receiptsOffer: getReceiptsOffer(domain, detectedAssets),
        reason: 'Implicit data continuation from previous turns',
      };
    }
  }
  
  // BLOCK: Default — no data request detected
  return {
    state: 'BLOCK',
    budget: METRIC_BUDGET_BLOCK,
    allowedCategories: [],
    priorityMetrics: [],
    receiptsOffer: 'Want the numbers, or just the vibe?',
    reason: 'No data request detected — conversation only',
  };
}

/**
 * Get priority metrics based on allowed categories and assets
 */
function getPriorityMetrics(categories: MetricCategory[], assets: string[]): string[] {
  const priority: string[] = [];
  
  // 1. Price (rounded) for requested asset or BTC/ETH if market-wide
  if (categories.includes('PRICE')) {
    if (assets.length > 0) {
      priority.push(`${assets[0]} price (rounded)`);
    } else {
      priority.push('BTC price (rounded)', 'ETH price (rounded)');
    }
    priority.push('24h direction/% (rounded, optional)');
  }
  
  // 2. One positioning/risk anchor if relevant
  if (categories.includes('DERIVATIVES')) {
    priority.push('Funding summary (if elevated)');
    priority.push('Liquidations summary (if notable)');
  }
  
  if (categories.includes('INDICATORS')) {
    priority.push('Fear & Greed (if extreme)');
  }
  
  if (categories.includes('ONCHAIN')) {
    priority.push('Exchange flows (if significant)');
  }
  
  return priority;
}

/**
 * Get the appropriate receipts offer
 */
function getReceiptsOffer(domain: DomainSignal, assets: string[]): string {
  if (domain === 'MARKET_WIDE') {
    return 'Want the exact funding/OI/liqs, or just key levels?';
  }
  if (assets.length === 1) {
    return `Want the full ${assets[0]} receipts?`;
  }
  return 'Want the detailed metrics?';
}

// ============================================================================
// STEP 4 — CLARIFIER GATE (Human Behavior 1)
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

/**
 * Get context-aware follow-up question.
 * 
 * Instead of generic questions, use context from:
 * - What the user just asked about (asset, topic)
 * - What type of response we gave (omniscore, market update, etc.)
 * - Current conversation mode
 */
export function getFollowUpQuestion(
  signals: MessageSignals, 
  template: StructureTemplate,
  clarifier: { needed: boolean; question: string | null },
  topicPersistence?: TopicPersistenceState
): string | null {
  // If clarifier is active, that's the question — no depth offer
  if (clarifier.needed && clarifier.question) {
    return clarifier.question;
  }
  
  // Greeting with active mode should carry context
  if (template === 'GREETING' && topicPersistence) {
    if (topicPersistence.currentMode === 'MARKET_MODE' && !topicPersistence.shouldAskIntent) {
      return topicPersistence.contextCarryPhrase || 'Want a quick pulse or check a coin?';
    }
    if (topicPersistence.shouldAskIntent) {
      return 'You here for markets or something else?';
    }
  }
  
  if (template === 'GREETING') {
    return 'You here for markets or something else?';
  }
  
  if (signals.detectedAssets.length === 0 && signals.domain !== 'META') {
    return 'Which coin are you watching?';
  }
  
  // Context-aware questions based on what was requested
  const asset = signals.detectedAssets[0] || 'this';
  
  // OmniScore-specific follow-up
  if (signals.requestsOmniScore) {
    return `Want the top drivers + top risks, or key ${asset} levels?`;
  }
  
  // Source request follow-up
  if (signals.requestsSources) {
    return 'Want me to list the exact signals used for QS and OS?';
  }
  
  // Context-aware questions by template
  const contextQuestions: Record<StructureTemplate, string> = {
    GREETING: 'You here for markets or something else?',
    CLARIFIER_ONLY: '',  // Clarifier question is already set
    PRICE_CHECK: `Want ${asset} levels or just the vibe?`,
    MARKET_OVERVIEW: 'Want levels or catalysts?',
    WHY_MOVE: `Want the exact drivers for ${asset}?`,
    DECISION_HELP: 'What\'s your timeframe?',
    DEEP_ANALYSIS: 'What\'s your timeframe and risk tolerance?',
    META_RESPONSE: 'Want me to show you the exact feed list?',
    GENERIC_SMALL: 'Quick take or more detail?',
    GENERIC_MEDIUM: `Want ${asset} levels + scenarios?`,
  };
  
  return contextQuestions[template] || null;
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
  },
  recentGreetingIds?: string[]
): VerbosityClassification {
  const startTime = performance.now();
  
  // Step 1: Extract signals
  const signals = extractSignals(message, conversationHistory);
  
  // Step 1B: Run greeting cooldown (new)
  const greetingCooldown = runGreetingCooldown(signals, conversationHistory, recentGreetingIds);
  
  // Step 1C: Run topic persistence (new)
  const topicPersistence = runTopicPersistence(signals, conversationHistory);
  
  // Step 2: Select mode
  const mode = selectMode(signals);
  
  // Step 3: Run metrics gate (No-Unasked-Metrics)
  // Special handling for OmniScore: use LIMIT by default to avoid data dumps
  let metricsGate = runMetricsGate(signals, mode, conversationHistory);
  
  // Override for OmniScore: default to LIMIT unless user explicitly asks for full breakdown
  if (signals.requestsOmniScore && !signals.isDepthOptIn) {
    // OmniScore requested but no depth opt-in → use LIMIT mode
    // Show 1-line conclusion + 2 supporting points, offer full breakdown
    metricsGate = {
      ...metricsGate,
      state: 'LIMIT',
      budget: {
        maxNumbers: 3,  // Score + maybe 2 supporting numbers
        maxMetricCategories: 1,
        maxTickers: 1,
        allowScores: true,  // Allow the main score only
        preferRounded: true,
        requireReceiptsBlock: false,
      },
      receiptsOffer: 'Want the full QS/OS breakdown or just levels + risks?',
      reason: 'OmniScore requested — LIMIT mode (1-line conclusion + offer)',
    };
  }
  
  // Step 4: Run clarifier gate (Human Behavior 1)
  const clarifier = runClarifierGate(signals);
  
  // Step 5: Get continuity anchor (Human Behavior 2)
  const continuity = getContinuityAnchor(signals, mode);
  
  // Step 6: Check uncertainty (Human Behavior 3)
  const uncertainty = getUncertaintyHandling(
    dataContext?.hasDataFreshnessConcern,
    dataContext?.hasPartialData,
    dataContext?.hasConflictingData,
    dataContext?.hasEstimatedMetrics
  );
  
  // Step 7: Get hard caps and template — override with metrics budget
  const caps = getCaps(mode);
  const template = selectTemplate(signals, mode, clarifier.needed);
  caps.structure = template;
  
  // Apply metrics gate budget to caps (metrics gate takes precedence)
  caps.maxNumbers = Math.min(caps.maxNumbers, metricsGate.budget.maxNumbers);
  caps.maxAssets = Math.min(caps.maxAssets, metricsGate.budget.maxTickers);
  
  // Step 8: Get expansion protocol with context-aware questions
  const depthOffer = getDepthOffer(template, mode);
  // Use receipts offer from metrics gate if available and no clarifier
  // Pass topic persistence for context-aware greeting questions
  const questionPrompt = clarifier.needed 
    ? clarifier.question 
    : (metricsGate.receiptsOffer || getFollowUpQuestion(signals, template, clarifier, topicPersistence));
  
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
      metricsGate,
      greetingCooldown,
      topicPersistence,
    },
  };
  
  logger.debug('🎛️ Response policy applied', {
    message: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
    mode,
    template,
    metricsGate: metricsGate.state,
    metricsMaxNumbers: metricsGate.budget.maxNumbers,
    clarifierNeeded: clarifier.needed,
    continuityAnchor: continuity.anchor,
    uncertaintyPresent: uncertainty.present,
    greetingCooldown: greetingCooldown.turnsWithinCooldown ? 'MICRO_ACK' : 'FULL',
    topicMode: topicPersistence.currentMode,
    processingMs: (performance.now() - startTime).toFixed(1),
  });
  
  return result;
}

// ============================================================================
// RESPONSE GUIDANCE GENERATOR
// ============================================================================

export function generateResponseGuidance(classification: VerbosityClassification): string {
  const { signals, mode, caps, template, depthOffer, questionPrompt, behaviors } = classification;
  const { clarifier, continuity, uncertainty, metricsGate, greetingCooldown, topicPersistence } = behaviors;
  
  return `
═══════════════════════════════════════════════════════════════════════════════
🎛️ UNIFIED RESPONSE POLICY v6.0 — ANTI-BOT HUMAN ENGINE
═══════════════════════════════════════════════════════════════════════════════

OUTPUT MODE: ${mode} (${mode === 'S' ? 'Small' : mode === 'M' ? 'Medium' : 'Large'})
TEMPLATE: ${template}
METRICS GATE: ${metricsGate.state}

DETECTED SIGNALS:
• Length: ${signals.length} | Depth: ${signals.depth} | Urgency: ${signals.urgency}
• Domain: ${signals.domain}${signals.detectedAssets.length > 0 ? ` (${signals.detectedAssets.join(', ')})` : ''}
• State: ${signals.state} | Data Request: ${signals.requestsData ? 'YES' : 'NO'}
${signals.isDepthOptIn ? '• ⚡ USER OPTED IN TO DEPTH' : ''}
${signals.requestsSpecificMetrics ? `• 📊 SPECIFIC METRICS REQUESTED: ${signals.requestedMetricTypes.join(', ')}` : ''}
${signals.requestsSources ? '• 📋 SOURCES REQUEST DETECTED' : ''}
${signals.requestsOmniScore ? '• 🎯 OMNISCORE REQUEST DETECTED' : ''}

═══════════════════════════════════════════════════════════════════════════════
👋 GREETING COOLDOWN + VARIATION BANK
═══════════════════════════════════════════════════════════════════════════════
${signals.isGreeting ? `
COOLDOWN STATUS: ${greetingCooldown.turnsWithinCooldown ? '⚠️ WITHIN COOLDOWN' : '✅ COOLDOWN EXPIRED'}
REASON: ${greetingCooldown.reason}

${greetingCooldown.turnsWithinCooldown ? `
🚫 DO NOT use a full greeting script again.
✅ USE THIS MICRO-ACK: "${greetingCooldown.suggestedGreeting.text}"

The user just greeted within ${GREETING_COOLDOWN_TURNS} turns. Do NOT repeat:
• "Yo — what's up. You here for markets or something else?"
• Any full greeting variant

INSTEAD, use a micro-ack that carries context forward.
` : `
✅ FULL GREETING OK
SUGGESTED VARIANT: "${greetingCooldown.suggestedGreeting.text}"
TONE: ${greetingCooldown.suggestedGreeting.tone}

You may use a full greeting since cooldown has expired.
DO NOT reuse recently used variants: ${greetingCooldown.recentlyUsedIds.join(', ') || 'none'}
`}` : `
Not a greeting message — greeting cooldown not applicable.
`}

═══════════════════════════════════════════════════════════════════════════════
🧠 TOPIC PERSISTENCE (CONVERSATION MODE MEMORY)
═══════════════════════════════════════════════════════════════════════════════

CURRENT MODE: ${topicPersistence.currentMode}
CONFIDENCE: ${(topicPersistence.modeConfidence * 100).toFixed(0)}%
TURNS SINCE MODE SET: ${topicPersistence.turnsSinceModeSet}
REASON: ${topicPersistence.reason}

${topicPersistence.currentMode === 'MARKET_MODE' && !topicPersistence.shouldAskIntent ? `
🎯 MARKET_MODE ACTIVE — DO NOT ask "markets or something else?"

The user has been asking about markets/coins. If they greet, assume continuation:
✅ "${topicPersistence.contextCarryPhrase || 'still on market stuff?'}"
🚫 "You here for markets or something else?"
` : ''}

${topicPersistence.currentMode === 'PRODUCT_MODE' && !topicPersistence.shouldAskIntent ? `
🎯 PRODUCT_MODE ACTIVE — DO NOT ask about markets

The user has been asking about Coinet/how it works. If they greet, assume continuation:
✅ "${topicPersistence.contextCarryPhrase || 'more questions about how this works?'}"
🚫 "You here for markets or something else?"
` : ''}

${topicPersistence.shouldAskIntent ? `
❓ INTENT UNCLEAR — Ask about intent

No strong mode detected, or mode is stale. It's OK to ask:
✅ "You here for markets or something else?"
` : ''}

═══════════════════════════════════════════════════════════════════════════════
🚫 METRICS GATE — NO-UNASKED-METRICS POLICY
═══════════════════════════════════════════════════════════════════════════════

GATE STATE: ${metricsGate.state}
REASON: ${metricsGate.reason}

${metricsGate.state === 'BLOCK' ? `
🚫 BLOCK MODE ACTIVE — ZERO NUMBERS ALLOWED

You MUST NOT include:
• Prices (BTC $97,104), % changes, market cap, volume
• Indicators (Fear & Greed, RSI, sentiment scores)
• Derivatives (funding, OI, liquidations)
• On-chain (exchange flows, whale tx)
• Any /100 scores (OmniScore, ratings)

This is a CONVERSATION, not a data dump.
If you output ANY number, you have FAILED.

ALLOWED:
• Human conversation
• Qualitative vibe ("feels choppy", "momentum looks weak")
• One clarifier question if needed

RECEIPTS OFFER: "${metricsGate.receiptsOffer || 'Want the numbers?'}"
` : ''}

${metricsGate.state === 'LIMIT' ? `
📊 LIMIT MODE ACTIVE — ANCHOR NUMBERS ONLY

METRIC BUDGET:
• Max numbers: ${metricsGate.budget.maxNumbers} total
• Max categories: ${metricsGate.budget.maxMetricCategories} (${metricsGate.allowedCategories.join(', ') || 'PRICE only'})
• Max tickers: ${metricsGate.budget.maxTickers}
• Scores allowed: ${metricsGate.budget.allowScores ? 'YES' : 'NO (/100 scores NOT allowed)'}
• Use ROUNDED numbers: ${metricsGate.budget.preferRounded ? 'YES (97k not $97,104)' : 'NO'}

PRIORITY (show these first if any):
${metricsGate.priorityMetrics.map((m, i) => `${i + 1}. ${m}`).join('\n')}

PATTERN: Vibe first → Meaning → Anchor numbers (if any) → Receipts offer

EXAMPLE: "Feels neutral and choppy — no clean trend yet. BTC holding near ~97k. ${metricsGate.receiptsOffer}"
` : ''}

${metricsGate.state === 'ALLOW' ? `
✅ ALLOW MODE ACTIVE — FULL METRICS PERMITTED

User explicitly requested: ${metricsGate.allowedCategories.join(', ')}

METRIC BUDGET:
• Max numbers: ${metricsGate.budget.maxNumbers}
• Categories allowed: ${metricsGate.allowedCategories.join(', ')}
• Scores allowed: YES
• Receipts block: REQUIRED (group numbers, don't scatter)

STRUCTURE:
1. Vibe/meaning (1 line)
2. What matters next (1-2 lines)
3. RECEIPTS BLOCK (grouped metrics, max 6 lines)
4. Follow-up question

DO NOT scatter 20 numbers through paragraphs. Group them cleanly.
` : ''}

${signals.requestsOmniScore && !signals.isDepthOptIn ? `
═══════════════════════════════════════════════════════════════════════════════
🎯 OMNISCORE RESPONSE PROTOCOL — LIMIT MODE
═══════════════════════════════════════════════════════════════════════════════

User asked for OmniScore but did NOT opt into full breakdown.

✅ DEFAULT RESPONSE FORMAT:
1. ONE LINE CONCLUSION — verdict + profile (e.g., "BTC is Elite right now")
2. TWO SUPPORTING POINTS — why (fundamentals + momentum, not raw numbers)
3. OFFER — "Want the full QS/OS breakdown or just levels + risks?"

🚫 DO NOT DUMP:
• OmniScore 93.9/100, QS 98.4/100, OS 94.2/100
• Target Zone, NRG +37
• Every sub-score and component

EXAMPLE:
"BTC is Elite right now — strong fundamentals and strong momentum, so it's not a weak setup. Want the quick drivers + risks, or the full QS/OS numbers?"

Only show full breakdown if user says "full metrics" / "yes" / "breakdown" / "numbers".
` : ''}

${signals.requestsSources ? `
═══════════════════════════════════════════════════════════════════════════════
📋 SOURCE PROTOCOL — CONCRETE DATA SOURCES
═══════════════════════════════════════════════════════════════════════════════

User asked about data sources. DO NOT be vague.

✅ REQUIRED FORMAT (3 layers):

**Layer 1 — What data types:**
prices, volume, derivatives, on-chain, dev activity, sentiment, news

**Layer 2 — Exact providers (named):**
• Price/volume: CoinGecko (backup: exchange APIs)
• Derivatives (funding/OI/liqs): Coinglass
• On-chain: Internal aggregation (RPC providers)
• Social/Sentiment: X/Twitter signals + internal classifier
• Dev activity: GitHub Events API
• News: News aggregators + internal classifier

**Layer 3 — Freshness:**
• "Live" (seconds)
• "Near-real-time" (1-5 minutes)
• "Delayed" (hours)

🚫 FORBIDDEN:
• "proprietary engine"
• "12 signals"
• Vague hand-waving

✅ EXAMPLE RESPONSE:
"For BTC: price/volume comes from CoinGecko (with exchange backups). Derivatives (funding/OI/liqs) come from Coinglass. On-chain signals come from our internal aggregation layer. Sentiment is from X + our classifier. If you want, I can list the exact signals we use for QS and OS."

If you CAN'T name the real provider, say:
"This module is currently using internal aggregation; I can show you the exact feed list we have configured if you want."
` : ''}

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

METRICS GATE CHECKS:
□ Did user request data? If NO → ZERO numbers in response
□ If BLOCK mode: contains no prices, %, indicators, or scores
□ If LIMIT mode: numbers ≤ ${metricsGate.budget.maxNumbers}, rounded, anchor only
□ If ALLOW mode: metrics grouped in receipts block, not scattered
□ No /100 scores unless user explicitly asked

BEHAVIOR CHECKS:
□ First line references user's request/asset (continuity anchor)
□ Total question marks: exactly 1 (or 0 if none needed)
□ If clarifier needed: minimal safe default + clarifier only
□ If uncertainty: disclosed in ≤1 line with action option

STRUCTURE CHECKS:
□ Line count within ${caps.minLines}-${caps.maxLines}
□ Number count ≤ ${caps.maxNumbers}
□ No multiple-choice menus at end
□ No unsolicited topic introductions

MENTAL MODEL: Meaning first. Numbers only when invited. Receipts when requested.

If ANY check fails, your response is NOT production-ready.

${generateAntiBotGuidanceSection(signals, continuity, mode)}

═══════════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Generate the anti-bot section of the guidance
 */
function generateAntiBotGuidanceSection(
  signals: MessageSignals,
  continuity: { anchor: ContinuityAnchor; phrase: string },
  mode: OutputMode
): string {
  const intent = classifyUserIntent(signals.rawMessage || '');
  const isDepthOptIn = signals.isDepthOptIn;
  const size = determineResponseSize(intent, signals.rawMessage || '', isDepthOptIn);
  const metricBudget = getIntentMetricBudget(intent);
  
  // Select natural alternatives
  const naturalStarter = NATURAL_STARTERS[Math.floor(Math.random() * NATURAL_STARTERS.length)];
  const marketDesc = MARKET_DESCRIPTION_BANK[Math.floor(Math.random() * MARKET_DESCRIPTION_BANK.length)];
  const depthOffer = DEPTH_OFFER_BANK[Math.floor(Math.random() * DEPTH_OFFER_BANK.length)];
  const followupBank = NATURAL_FOLLOWUP_QUESTIONS[intent] || NATURAL_FOLLOWUP_QUESTIONS.DATA_REQUEST;
  const naturalQuestion = followupBank[Math.floor(Math.random() * followupBank.length)];
  
  return `
═══════════════════════════════════════════════════════════════════════════════
🚨 NORMAL TALK MODE — SOUND LIKE A REAL PERSON
═══════════════════════════════════════════════════════════════════════════════

YOU ARE NOT AN AI ASSISTANT. You are a knowledgeable friend chatting casually.
Write like you would actually text someone. No sales language. No menus.

═══════════════════════════════════════════════════════════════════════════════
🚫 HARD BANNED PHRASES — NEVER USE THESE
═══════════════════════════════════════════════════════════════════════════════

These phrases INSTANTLY make you sound like a bot. NEVER use them:

MENU QUESTIONS (the worst):
• "Want levels or just the vibe?" ❌
• "Want X or Y?" ❌
• "Want the receipts?" ❌
• "entries or direction" ❌
• "quick pulse or deep dive" ❌
• "You here for markets or something else?" ❌

OVERUSED CATCHPHRASES:
• "quick pulse" ❌
• "the receipts" ❌
• "neutral and choppy" ❌
• "feels choppy" ❌
• "the vibe" ❌

GENERIC AI PHRASES:
• "Let me know if" ❌
• "Feel free to" ❌
• "Happy to help" ❌
• "Let's dive into" ❌
• "Great question" ❌
• "Absolutely" ❌
• "Certainly" ❌
• "I understand" ❌

═══════════════════════════════════════════════════════════════════════════════
✅ HOW TO ACTUALLY SOUND HUMAN
═══════════════════════════════════════════════════════════════════════════════

RULE 1: ANSWER FIRST, QUESTION OPTIONAL

Structure: Give the answer → then maybe ask something natural.
NOT: Structure → CTA → Menu

✅ GOOD: "Right now it's sideways, nothing clear yet. BTC holding but no real push."
         "Which coin are you watching?"

❌ BAD:  "Got you — quick pulse. Feels neutral and choppy."
         "Want levels or just the vibe?"

RULE 2: NATURAL QUESTIONS ONLY

Instead of menus, ask like a friend would:

❌ "Want levels or just the vibe?" 
✅ "Which coin are you watching?"
✅ "What are you trading right now?"
✅ "Anything specific?"
✅ "${naturalQuestion}"

RULE 3: VARY YOUR LANGUAGE

For market state, rotate through natural descriptions:
• "${marketDesc}"
• "quiet, no strong move either way"
• "holding but without conviction"
• "mixed signals, no clear direction"

For starters, use natural openers:
• "${naturalStarter}"
• "Looks like"
• "So far"
• "Here's the deal:"

RULE 4: KEEP IT SHORT BY DEFAULT

Size for this message: ${size}
${size === 'S' ? '• 1-3 sentences max. Just answer and maybe ask.' : ''}
${size === 'M' ? '• 2-5 sentences. Give context, then ask naturally.' : ''}
${size === 'L' ? '• Can go longer, but still write like a person, not a report.' : ''}

═══════════════════════════════════════════════════════════════════════════════
📝 HUMAN REWRITE PASS — RUN THIS BEFORE SENDING
═══════════════════════════════════════════════════════════════════════════════

Before you send your response, check and fix:

1. REMOVE any "menu questions" (Want A or B?)
   → Replace with a single natural question

2. REMOVE any phrase from the BANNED list above
   → Rewrite in your own words

3. REMOVE any "salesy" helper language
   → Just answer directly

4. SHORTEN sentences that feel "AI-ish"
   → If it sounds like a report, make it casual

5. ADD natural fillers (sparingly):
   → "honestly", "basically", "right now", "so far"
   → But don't overdo it

═══════════════════════════════════════════════════════════════════════════════
📋 EXAMPLES: SAME MESSAGE, BOT vs HUMAN
═══════════════════════════════════════════════════════════════════════════════

User: "market update"

❌ BOT VERSION:
"Got you — quick pulse. Market feels neutral and choppy right now. 
BTC holding steady. Want levels or just the vibe?"

✅ HUMAN VERSION:
"Right now it's sideways, nothing super clear. BTC's holding around 97k 
but no real push either direction. What are you watching?"

---

User: "btc"

❌ BOT VERSION:
"On BTC — quick pulse. Trading at $97,104, neutral momentum.
Want the full breakdown or just key levels?"

✅ HUMAN VERSION:
"BTC's at about 97k, grinding sideways. No strong move yet.
Anything specific you want to check?"

---

User: "hey"

❌ BOT VERSION:
"Yo 👋 what's up. You here for markets or something else?"

✅ HUMAN VERSION:
"Hey — what's up?"

═══════════════════════════════════════════════════════════════════════════════
✅ FINAL CHECK
═══════════════════════════════════════════════════════════════════════════════

Before sending, verify:
□ No phrases from BANNED list
□ No menu questions (Want A or B?)
□ Sounds like a text from a friend, not an AI assistant
□ Question at end is natural (or no question is fine too)
□ Numbers only if needed (budget: ${metricBudget.maxNumbers} max)

If it sounds like a bot → REWRITE completely.
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
  runMetricsGate,
  runClarifierGate,
  getContinuityAnchor,
  getUncertaintyHandling,
  generateGuidance: generateResponseGuidance,
  // Anti-bot system exports
  classifyUserIntent,
  determineResponseSize,
  selectResponseShape,
  selectFromBank,
  isPhraseOnCooldown,
  runSelfCheck,
  generateAntiBotGuidance,
  // Banks for external use
  PHRASE_COOLDOWN_LIST,
  ACKNOWLEDGEMENT_BANK,
  QUICK_FRAMING_BANK,
  CHOP_PHRASING_BANK,
  DEPTH_ASK_BANK,
  FOLLOWUP_QUESTIONS,
  RESPONSE_SHAPES,
};

export default conversationRules;
