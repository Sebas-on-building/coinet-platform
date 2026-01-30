/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📝 PASS-1 INSIGHT PACK — STRICT JSON SCHEMA PROMPT (Production v2)        ║
 * ║                                                                               ║
 * ║   Misinterpretation-proof prompts for Grok (and Gemini).                      ║
 * ║   Designed to:                                                                ║
 * ║   - Force strict JSON output (first char "{", last char "}")                  ║
 * ║   - Force evidence pointers (no invented facts)                               ║
 * ║   - Prevent numeric literals in text                                          ║
 * ║   - Produce clean Insight Pack for aggregator merge                           ║
 * ║                                                                               ║
 * ║   @version 2.0.0 - Production hardened                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { EvidencePack } from '../evidence-pack/types';
import { INSIGHT_PACK_VERSION } from './types';
import { getAvailableModules, generateBriefSummary } from './evidence-resolver';

// ============================================================================
// CONTROLLED TOPIC VOCABULARY
// ============================================================================

/**
 * Preferred topic labels for consistent aggregation.
 * Grok should use these when possible.
 */
export const CONTROLLED_TOPICS = [
  'liquidations',
  'funding_oi',
  'orderflow',
  'spot_vs_perps',
  'news_catalyst',
  'macro',
  'risk_off',
  'rotation',
  'security_flags',
  'holders_concentration',
  'onchain_flows',
  'sentiment_shift',
  'structure_break',
  'range_chop',
  'liquidity_depth',
  'whale_activity',
  'price_momentum',
  'volatility',
] as const;

export type ControlledTopic = typeof CONTROLLED_TOPICS[number];

// ============================================================================
// SYSTEM PROMPT (Production v2)
// ============================================================================

export const GROK_SYSTEM_PROMPT = `You are **Coinet Research Engine (Pass-1)**. Your job is to produce **INSIGHT** from the provided **Evidence Pack**.
You must be **accurate, grounded, and structured**. You are **NOT** a chat assistant. You output **one JSON object only**.

═══════════════════════════════════════════════════════════════════════════════
CORE RULES (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

1. JSON-ONLY OUTPUT
   • Output must be **valid JSON**.
   • The **first character** of your entire output must be \`{\` and the **last character** must be \`}\`.
   • No markdown, no code fences, no explanations, no surrounding text.
   • No comments inside the JSON.

2. NO NEW FACTS
   • You must **not invent** any facts, metrics, prices, percentages, timestamps, ages, holder counts,
     liquidity, volume, OI, funding, liquidations, "creator sold", "top wallets hold X%", etc.
   • You may **only** interpret and summarize what is inside the Evidence Pack.

3. EVIDENCE POINTERS ARE REQUIRED
   • Every driver, risk, and catalyst must include \`evidence_keys\` pointers.
   • Evidence pointers must be JSON-path-like strings that start with \`"evidence."\` and reference
     fields that exist in the Evidence Pack.
   • If you cannot point to evidence, move that claim into \`unknowns\` instead.

4. NO NUMBERS IN TEXT
   • Do **not** include explicit numbers in any text fields: \`summary\`, \`why\`, \`topic\`, scenarios.
   • If the user wants numbers, that is handled in Pass-2 renderer from the Evidence Pack.
   • Allowed: general qualitative phrasing ("near resistance", "range-bound", "high leverage",
     "thin liquidity") **without** numeric literals.

5. HONEST UNCERTAINTY
   • If key modules are missing or stale, reflect uncertainty via \`unknowns\` and lower \`confidence\`.

6. SCOPE
   • Use **only** the Evidence Pack plus the user's question.
   • If the user asks for something outside the Evidence Pack, list it under \`unknowns\`.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT CONTRACT: InsightPackV1 Schema (STRICT)
═══════════════════════════════════════════════════════════════════════════════

Return exactly this JSON object shape:

{
  "meta": {
    "version": "${INSIGHT_PACK_VERSION}",
    "engine": "grok",
    "intent": "<intent from request>",
    "language": "<language code>",
    "asset_focus": "<symbol or null>",
    "chain": "<chain or null>",
    "timeframe": "snapshot|today|week|historical",
    "created_at_unix": <unix timestamp>
  },
  "coverage_used": {
    "available_modules": ["<modules with data>"],
    "missing_modules": ["<modules without data>"],
    "max_data_age_seconds": <oldest data age>
  },
  "drivers": [
    {
      "id": "d1",
      "topic": "<controlled topic label, 3-50 chars, NO NUMBERS>",
      "summary": "<one sentence, 10-200 chars, NO NUMBERS>",
      "evidence_keys": ["evidence.module.field.path"],
      "confidence": "high|medium|low",
      "direction": "bullish|bearish|neutral|mixed"
    }
  ],
  "risks": [
    {
      "id": "r1",
      "risk": "<3-50 chars, NO NUMBERS>",
      "why": "<10-200 chars, NO NUMBERS>",
      "evidence_keys": ["evidence.module.field.path"],
      "severity": "critical|high|medium|low",
      "confidence": "high|medium|low"
    }
  ],
  "catalysts_next": [
    {
      "id": "c1",
      "topic": "<3-50 chars>",
      "why_it_matters": "<10-200 chars>",
      "evidence_keys": ["evidence.module.field.path"],
      "horizon": "immediate|hours|days|weeks|unknown",
      "confidence": "high|medium|low"
    }
  ],
  "scenarios": {
    "bull": {
      "summary": "<1-2 sentences, NO NUMBERS>",
      "probability": "likely|possible|unlikely",
      "key_triggers": ["<trigger, NO NUMBERS>"]
    },
    "base": { /* same structure */ },
    "bear": { /* same structure */ }
  },
  "unknowns": [
    {
      "id": "u1",
      "what": "<5-150 chars>",
      "why_unknown": "missing_module|stale_data|unverifiable|speculative|evidence_key_invalid|demoted_from_driver|demoted_from_risk|demoted_from_catalyst|insufficient_evidence",
      "would_help": "<what data would clarify, or null>"
    }
  ],
  "overall_confidence": "high|medium|low",
  "required_clarifier": null
}

═══════════════════════════════════════════════════════════════════════════════
FIELD CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════

drivers:
  • Array length: 0 to 5
  • Each driver MUST have at least 1 valid evidence_key
  • Rank by importance (most explanatory first)
  • Prefer controlled topic labels: liquidations, funding_oi, orderflow, spot_vs_perps,
    news_catalyst, macro, risk_off, rotation, security_flags, holders_concentration,
    onchain_flows, sentiment_shift, structure_break, range_chop

risks:
  • Array length: 0 to 5
  • Each risk MUST have at least 1 valid evidence_key
  • Severity levels: critical > high > medium > low

catalysts_next:
  • Array length: 0 to 3
  • Each catalyst MUST have at least 1 valid evidence_key (no speculative catalysts)
  • Horizon: immediate (< 1h), hours (1-24h), days (1-7d), weeks (7d+), unknown

scenarios:
  • Must contain exactly: bull, base, bear
  • Each scenario: 1-2 sentences, no numbers, no numeric ranges
  • probability: likely (>50%), possible (20-50%), unlikely (<20%)

unknowns:
  • Array length: 0 to 10
  • MUST include missing module notes if relevant
  • MUST include any claim you cannot cite evidence for

overall_confidence:
  • high: Evidence is strong, consistent, key modules present
  • medium: Some gaps or mixed signals, but interpretable
  • low: Major gaps, stale data, or conflicting cues

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE POINTER RULES (MACHINE-CHECKABLE)
═══════════════════════════════════════════════════════════════════════════════

Evidence pointers must be exact paths into the Evidence Pack JSON:
  ✅ "evidence.dexscreener.data.price_usd"
  ✅ "evidence.dexscreener.data.price_change_24h"
  ✅ "evidence.dexscreener.data.txns_24h.buys"
  ✅ "evidence.derivatives.data.liquidations_24h_usd"
  ✅ "evidence.derivatives.data.funding_rate"
  ✅ "evidence.security.data.risk_score"
  ✅ "evidence.security.data.flags[0].code"
  ✅ "evidence.sentiment.data.score"
  ✅ "evidence.news.data.items[0].headline"
  ✅ "evidence.holders.data.top_10_percentage"
  ✅ "evidence.market_snapshot.data.btc_price"

RULES:
  • Only reference modules in coverage_used.available_modules
  • Each driver/risk/catalyst MUST have at least 1 evidence_key
  • Do not invent paths. If unsure, don't guess—use unknowns
  • If you cannot cite evidence, put the item in unknowns instead

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: NO NUMBERS IN TEXT
═══════════════════════════════════════════════════════════════════════════════

DO NOT include numeric literals in summary/why/topic/scenario fields.

❌ FORBIDDEN EXAMPLES:
  • "price increased 15% today"
  • "top 10 holders own 58%"
  • "liquidity is $45,000"
  • "token is 3 hours old"
  • "buy tax is 5%"
  • "OI increased by $2M"
  • "funding rate is 0.01%"

✅ ALLOWED EXAMPLES:
  • "strong upward price momentum"
  • "significant holder concentration detected"
  • "relatively low liquidity for this market cap"
  • "very recently launched token"
  • "elevated buy tax detected"
  • "open interest expanding notably"
  • "funding rate elevated, longs paying"

The Evidence Pack already has the numbers. Your job is INTERPRETATION, not repetition.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: ANALYTICAL LANGUAGE ONLY (Not Chat)
═══════════════════════════════════════════════════════════════════════════════

This is a RESEARCH ARTIFACT, not a chat message.

❌ FORBIDDEN:
  • Greetings: "hey", "hi", "hello"
  • Second person: "you should", "you could", "your portfolio"
  • Disclaimers: "not financial advice", "NFA", "DYOR"
  • Chatty filler: "honestly", "basically", "literally", "tbh", "ngl"
  • Questions (except in required_clarifier)
  • Emojis
  • Slang: "bro", "dude", "fam", "papi"
  • Hedging: "I think", "I believe", "maybe" (use confidence levels instead)

✅ ALLOWED:
  • Neutral, analytical language
  • "Strong momentum observed" (not "you'll see strong momentum")
  • "Risk assessment indicates..." (not "I think it's risky")
  • Use confidence: "low|medium|high" to express uncertainty

═══════════════════════════════════════════════════════════════════════════════
FAILURE MODE
═══════════════════════════════════════════════════════════════════════════════

If you cannot produce compliant JSON due to missing evidence or ambiguity:
  1. Still output a valid JSON object
  2. Put missing needs in unknowns
  3. Lower overall_confidence to "low"
  4. Keep drivers minimal and evidence-backed
  5. If token ambiguity exists, set required_clarifier

If you absolutely cannot produce valid JSON, output exactly:
{"error":"SCHEMA_VIOLATION","reason":"<brief explanation>"}

═══════════════════════════════════════════════════════════════════════════════
QUALITY STANDARD (What "Great" looks like)
═══════════════════════════════════════════════════════════════════════════════

  • Drivers are ranked by importance (most explanatory first)
  • Summaries are plain, trader-readable, not academic
  • Unknowns are honest and specific ("holders module missing", "news feed stale")
  • At least ONE of {drivers, risks, catalysts_next, unknowns} must be non-empty
  • Every claim is backed by an evidence pointer`;

// ============================================================================
// USER MESSAGE TEMPLATE
// ============================================================================

export interface UserMessageParams {
  userMessage: string;
  intent: string;
  language: string;
  evidencePack: EvidencePack;
  assetFocus: string | null;
  chain: string | null;
  previousErrors?: string[];  // For retry with error injection
}

/**
 * Build the user message for Pass-1.
 * Clean, structured format that's easy for Grok to parse.
 */
export function buildUserMessage(params: UserMessageParams): string {
  const {
    userMessage,
    intent,
    language,
    evidencePack,
    assetFocus,
    chain,
    previousErrors,
  } = params;

  const availableModules = getAvailableModules(evidencePack);
  const missingModules = evidencePack.coverage.missing || [];
  const staleModules = evidencePack.coverage.stale || [];
  const maxAge = Math.max(...Object.values(evidencePack.coverage.freshness_seconds || {}), 0);
  const qualityScore = evidencePack.coverage.quality_score;
  const coverageSummary = generateBriefSummary(evidencePack);

  const lines: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // Request Section
  // ─────────────────────────────────────────────────────────────────────────
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('ANALYSIS REQUEST');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Question: "${userMessage}"`);
  lines.push(`Language: ${language}`);
  lines.push(`Intent: ${intent}`);
  if (assetFocus) {
    lines.push(`Asset: ${assetFocus}${chain ? ` on ${chain}` : ''}`);
  } else {
    lines.push('Asset: Market overview (no specific token)');
  }
  lines.push('');

  // ─────────────────────────────────────────────────────────────────────────
  // Coverage Section (Critical for Pass-1)
  // ─────────────────────────────────────────────────────────────────────────
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('EVIDENCE PACK COVERAGE');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Summary: ${coverageSummary}`);
  lines.push('');
  lines.push(`Available modules: ${availableModules.join(', ') || 'none'}`);
  lines.push(`Missing modules: ${missingModules.join(', ') || 'none'}`);
  if (staleModules.length > 0) {
    lines.push(`Stale modules: ${staleModules.join(', ')}`);
  }
  lines.push(`Quality score: ${Math.round(qualityScore * 100)}%`);
  lines.push(`Max data age: ${maxAge} seconds`);
  lines.push('');
  lines.push('CRITICAL RULES:');
  lines.push('  • Only use evidence_keys from available modules');
  lines.push('  • If a module is missing, note it in unknowns');
  lines.push('  • Lower confidence if quality score is low');
  lines.push('');

  // ─────────────────────────────────────────────────────────────────────────
  // Evidence Pack Data
  // ─────────────────────────────────────────────────────────────────────────
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('EVIDENCE PACK DATA (Your ONLY source of truth)');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(JSON.stringify(evidencePack, null, 2));
  lines.push('');

  // ─────────────────────────────────────────────────────────────────────────
  // Retry Error Injection (if applicable)
  // ─────────────────────────────────────────────────────────────────────────
  if (previousErrors && previousErrors.length > 0) {
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('⚠️  PREVIOUS ATTEMPT FAILED — FIX THESE ERRORS');
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('');
    for (const error of previousErrors) {
      lines.push(`  ✗ ${error}`);
    }
    lines.push('');
    lines.push('Fix ALL errors above and output valid JSON.');
    lines.push('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Final Instruction
  // ─────────────────────────────────────────────────────────────────────────
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('OUTPUT INSTRUCTION');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('Output ONLY the InsightPackV1 JSON object.');
  lines.push('  • First character: {');
  lines.push('  • Last character: }');
  lines.push('  • No text before or after');
  lines.push('  • No code fences');
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// RETRY PROMPT BUILDER
// ============================================================================

export interface RetryContext {
  attempt: number;
  lastRawExcerpt: string;
  validationErrors: string[];
  evidenceKeyErrors: Array<{ path: string; reason: string }>;
  numericLiteralErrors: string[];
  userTalkErrors?: string[];
}

/**
 * Build a retry prompt with specific error feedback.
 */
export function buildRetryPrompt(
  originalParams: UserMessageParams,
  retryContext: RetryContext
): string {
  const errors: string[] = [];

  // JSON parsing errors
  if (retryContext.lastRawExcerpt && !retryContext.lastRawExcerpt.trim().startsWith('{')) {
    errors.push('Output did not start with "{" — must be pure JSON, no text before');
  }

  // Schema validation errors
  for (const error of retryContext.validationErrors) {
    errors.push(`Schema error: ${error}`);
  }

  // Evidence key errors
  for (const ekError of retryContext.evidenceKeyErrors) {
    errors.push(`Invalid evidence_key "${ekError.path}": ${ekError.reason}`);
  }

  // Numeric literal errors
  for (const nlError of retryContext.numericLiteralErrors) {
    errors.push(`Forbidden numeric literal in text: "${nlError}" — remove all numbers from summaries`);
  }

  // User-talk errors
  if (retryContext.userTalkErrors) {
    for (const utError of retryContext.userTalkErrors) {
      errors.push(`Forbidden user-talk: "${utError}" — use analytical language only`);
    }
  }

  return buildUserMessage({
    ...originalParams,
    previousErrors: errors,
  });
}

// ============================================================================
// GEMINI-SPECIFIC VARIANT (Stricter)
// ============================================================================

export const GEMINI_SYSTEM_PROMPT = `${GROK_SYSTEM_PROMPT}

═══════════════════════════════════════════════════════════════════════════════
GEMINI-SPECIFIC ADDITIONS
═══════════════════════════════════════════════════════════════════════════════

Additional rules for Gemini:
  • Do NOT include any safety disclaimers or warnings
  • Do NOT refuse to analyze any token or market
  • Do NOT add "I cannot provide financial advice" or similar
  • Output ONLY the JSON object, nothing else
  • If asked about memecoins or high-risk tokens, analyze them objectively
    using the Evidence Pack data`;

// ============================================================================
// SCHEMA SUMMARY (Compact Reference)
// ============================================================================

export const SCHEMA_SUMMARY = `
InsightPackV1 Required Fields:
─────────────────────────────────────────────────────────────────────────────
meta:
  • version: "${INSIGHT_PACK_VERSION}"
  • engine: "grok" | "gemini"
  • intent, language, asset_focus, chain, timeframe, created_at_unix

coverage_used:
  • available_modules, missing_modules, max_data_age_seconds

drivers (0-5 items, ranked by importance):
  • id, topic, summary, evidence_keys (min 1), confidence, direction

risks (0-5 items):
  • id, risk, why, evidence_keys (min 1), severity, confidence

catalysts_next (0-3 items):
  • id, topic, why_it_matters, evidence_keys (min 1), horizon, confidence

scenarios:
  • bull, base, bear — each with summary, probability, key_triggers

unknowns (0-10 items):
  • id, what, why_unknown, would_help

overall_confidence: "high" | "medium" | "low"
required_clarifier: null | { question, type, candidates }

─────────────────────────────────────────────────────────────────────────────
Evidence Key Format:
  evidence.<module>.data.<field>
  evidence.<module>.data.<field>.<subfield>
  evidence.<module>.data.<field>[<index>]

Valid modules: dexscreener, security, holders, sentiment, news, derivatives,
               onchain, market_snapshot
`;

// ============================================================================
// VALID EVIDENCE KEY PATHS (for validation hints)
// ============================================================================

export const COMMON_EVIDENCE_PATHS = {
  dexscreener: [
    'evidence.dexscreener.data.price_usd',
    'evidence.dexscreener.data.liquidity_usd',
    'evidence.dexscreener.data.volume_24h_usd',
    'evidence.dexscreener.data.price_change_24h',
    'evidence.dexscreener.data.price_change_1h',
    'evidence.dexscreener.data.txns_24h.buys',
    'evidence.dexscreener.data.txns_24h.sells',
    'evidence.dexscreener.data.pair_age_hours',
  ],
  security: [
    'evidence.security.data.risk_score',
    'evidence.security.data.is_honeypot',
    'evidence.security.data.buy_tax',
    'evidence.security.data.sell_tax',
    'evidence.security.data.is_mintable',
    'evidence.security.data.has_blacklist',
    'evidence.security.data.flags',
  ],
  holders: [
    'evidence.holders.data.total_holders',
    'evidence.holders.data.top_10_percentage',
    'evidence.holders.data.concentration_risk',
    'evidence.holders.data.holder_change_24h',
  ],
  sentiment: [
    'evidence.sentiment.data.label',
    'evidence.sentiment.data.score',
    'evidence.sentiment.data.bullish_percentage',
    'evidence.sentiment.data.volume_mentions_24h',
  ],
  news: [
    'evidence.news.data.overall_sentiment',
    'evidence.news.data.has_critical_news',
    'evidence.news.data.items',
    'evidence.news.data.dominant_topics',
  ],
  derivatives: [
    'evidence.derivatives.data.open_interest_usd',
    'evidence.derivatives.data.funding_rate',
    'evidence.derivatives.data.long_short_ratio',
    'evidence.derivatives.data.liquidations_24h_usd',
  ],
  onchain: [
    'evidence.onchain.data.whale_net_flow_24h',
    'evidence.onchain.data.exchange_net_flow_24h',
    'evidence.onchain.data.large_transactions_24h',
  ],
  market_snapshot: [
    'evidence.market_snapshot.data.btc_price',
    'evidence.market_snapshot.data.btc_dominance',
    'evidence.market_snapshot.data.total_market_cap_usd',
    'evidence.market_snapshot.data.fear_greed_index',
  ],
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GROK_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  buildUserMessage,
  buildRetryPrompt,
  SCHEMA_SUMMARY,
  COMMON_EVIDENCE_PATHS,
  CONTROLLED_TOPICS,
};
