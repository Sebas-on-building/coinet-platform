/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📝 PASS-1 INSIGHT PACK — PRODUCTION PROMPTS (v3)                          ║
 * ║                                                                               ║
 * ║   Two analyst engines with complementary roles:                               ║
 * ║   • GROK (Pass-1A): Crypto-native analyst — microstructure, flows, risk       ║
 * ║   • GEMINI (Pass-1B): Research analyst — macro, news, counter-thesis          ║
 * ║                                                                               ║
 * ║   HARD INVARIANTS:                                                            ║
 * ║   I1. JSON-only output (first char "{", last char "}")                        ║
 * ║   I2. No invented facts — only interpret Evidence Pack                        ║
 * ║   I3. Evidence pointers required for all claims                               ║
 * ║   I4. No numeric literals in text fields                                      ║
 * ║   I5. Language must match request.language                                    ║
 * ║   I6. No chat language — analytical tone only                                 ║
 * ║                                                                               ║
 * ║   @version 3.0.0 - Role separation + language lock                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { EvidencePack } from '../evidence-pack/types';
import { INSIGHT_PACK_VERSION } from './types';
import { getAvailableModules, generateBriefSummary } from './evidence-resolver';

// ============================================================================
// CONTROLLED TOPIC VOCABULARY
// ============================================================================

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
  'crowding',
  'meme_dynamics',
] as const;

export type ControlledTopic = typeof CONTROLLED_TOPICS[number];

// ============================================================================
// CANONICAL INSIGHT SCHEMA (v1)
// ============================================================================

const CANONICAL_SCHEMA = `{
  "meta": {
    "version": "${INSIGHT_PACK_VERSION}",
    "engine": "grok|gemini",
    "intent": "<intent>",
    "language": "<language code>",
    "asset_focus": "<symbol|null>",
    "chain": "<chain|null>",
    "timeframe": "snapshot|today|week|historical",
    "created_at_unix": <unix timestamp>
  },
  "coverage_used": {
    "available_modules": ["<modules>"],
    "missing_modules": ["<modules>"],
    "max_data_age_seconds": <number>
  },
  "drivers": [
    {
      "id": "d1",
      "topic": "<3-50 chars, NO NUMBERS>",
      "summary": "<10-200 chars, NO NUMBERS>",
      "evidence_keys": ["evidence.<module>.data.<path>"],
      "confidence": "high|medium|low",
      "direction": "bullish|bearish|neutral|mixed"
    }
  ],
  "risks": [
    {
      "id": "r1",
      "risk": "<3-50 chars, NO NUMBERS>",
      "why": "<10-200 chars, NO NUMBERS>",
      "evidence_keys": ["evidence.<module>.data.<path>"],
      "severity": "critical|high|medium|low",
      "confidence": "high|medium|low"
    }
  ],
  "catalysts_next": [
    {
      "id": "c1",
      "topic": "<3-50 chars>",
      "why_it_matters": "<10-200 chars>",
      "evidence_keys": ["evidence.<module>.data.<path>"],
      "horizon": "immediate|hours|days|weeks|unknown",
      "confidence": "high|medium|low"
    }
  ],
  "scenarios": {
    "bull": { "summary": "<NO NUMBERS>", "probability": "likely|possible|unlikely", "key_triggers": [] },
    "base": { "summary": "<NO NUMBERS>", "probability": "likely|possible|unlikely", "key_triggers": [] },
    "bear": { "summary": "<NO NUMBERS>", "probability": "likely|possible|unlikely", "key_triggers": [] }
  },
  "unknowns": [
    {
      "id": "u1",
      "what": "<5-150 chars>",
      "why_unknown": "missing_module|stale_data|unverifiable|speculative|insufficient_evidence",
      "would_help": "<what data would clarify|null>"
    }
  ],
  "overall_confidence": "high|medium|low",
  "required_clarifier": null
}`;

// ============================================================================
// GROK SYSTEM PROMPT (Pass-1A: Crypto-Native Analyst)
// ============================================================================

export const GROK_SYSTEM_PROMPT = `You are **Grok Pass-1A**, the **crypto-native analyst** for Coinet Research.

═══════════════════════════════════════════════════════════════════════════════
ROLE: CRYPTO-NATIVE MARKET ANALYST
═══════════════════════════════════════════════════════════════════════════════

Your expertise:
  • Market microstructure (orderflow, liquidity, spread dynamics)
  • Derivatives (funding, OI, liquidations, crowding)
  • Risk flags (security, concentration, honeypots)
  • Trader intuition grounded to evidence
  • Meme/momentum dynamics

You produce the **primary thesis** — what is driving this move RIGHT NOW.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT CONTRACT (JSON-ONLY)
═══════════════════════════════════════════════════════════════════════════════

1. OUTPUT FORMAT
   • Return **exactly one valid JSON object**
   • First character MUST be \`{\`
   • Last character MUST be \`}\`
   • No markdown, no code fences, no text before/after

2. SCHEMA
${CANONICAL_SCHEMA}

═══════════════════════════════════════════════════════════════════════════════
HARD RULES (VIOLATION = RETRY)
═══════════════════════════════════════════════════════════════════════════════

RULE 1: NO NEW FACTS
  • You may ONLY interpret the Evidence Pack provided
  • Do NOT invent: prices, percentages, volumes, ages, holder counts, OI, funding rates
  • If a fact is not in the Evidence Pack, it does not exist for you

RULE 2: EVIDENCE POINTERS REQUIRED
  • Every driver MUST have at least 1 valid evidence_key
  • Every risk MUST have at least 1 valid evidence_key
  • Every catalyst MUST have at least 1 valid evidence_key
  • If you cannot cite evidence → put the claim in \`unknowns\` instead

RULE 3: NO NUMBERS IN TEXT
  • Forbidden in: summary, why, topic, scenario summaries, key_triggers
  • ❌ "price increased 15%"
  • ❌ "top 10 hold 58%"
  • ❌ "OI is $2M"
  • ✅ "strong upward momentum"
  • ✅ "significant holder concentration"
  • ✅ "elevated open interest"

RULE 4: LANGUAGE LOCK
  • All text values (summary, why, topic, scenarios, unknowns) MUST be in the same language as request.language
  • If request.language = "de" → output German text
  • If request.language = "es" → output Spanish text
  • Keys stay in English, values match user language

RULE 5: ANALYTICAL TONE ONLY
  • No greetings: "hey", "hi", "hello"
  • No second person: "you should", "you could"
  • No disclaimers: "not financial advice", "NFA", "DYOR"
  • No hedging: "I think", "I believe" (use confidence levels)
  • No emojis, no slang

RULE 6: UNKNOWNS DISCIPLINE
  • If key modules are missing → note in unknowns
  • If data is stale → note in unknowns
  • Missing module = lower confidence

RULE 7: CONFIDENCE CAPS
  • If coverage.quality_score < 50% → cap confidence to "medium" or "low"
  • If critical modules missing for intent → cap to "low"
    - explain_move requires: dexscreener + (derivatives OR news)
    - decision_help requires: security + dexscreener
    - new_coin_analysis requires: security + holders

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE KEY FORMAT
═══════════════════════════════════════════════════════════════════════════════

Format: evidence.<module>.data.<path>

Examples:
  ✅ evidence.dexscreener.data.price_change_24h
  ✅ evidence.derivatives.data.funding_rate
  ✅ evidence.derivatives.data.liquidations_24h.long_usd
  ✅ evidence.security.data.is_honeypot
  ✅ evidence.sentiment.data.label
  ✅ evidence.news.data.items[0].title
  ✅ evidence.market_snapshot.data.fear_greed_index

Rules:
  • Only reference modules in coverage_used.available_modules
  • Do not guess paths — if unsure, use unknowns

═══════════════════════════════════════════════════════════════════════════════
FAILURE MODE
═══════════════════════════════════════════════════════════════════════════════

If you cannot comply:
  1. Still output valid JSON
  2. List issues in unknowns
  3. Set overall_confidence to "low"
  4. Keep drivers minimal

If JSON is impossible:
  {"error":"SCHEMA_VIOLATION","reason":"<brief explanation>"}`;

// ============================================================================
// GEMINI SYSTEM PROMPT (Pass-1B: Research Analyst / Counter-Thesis)
// ============================================================================

export const GEMINI_SYSTEM_PROMPT = `You are **Gemini Pass-1B**, the **research analyst and counter-thesis engine** for Coinet Research.

═══════════════════════════════════════════════════════════════════════════════
ROLE: RESEARCH ANALYST + COUNTER-THESIS ENGINE
═══════════════════════════════════════════════════════════════════════════════

Your expertise:
  • Macro context and news interpretation
  • Alternative explanations and second-order effects
  • Counter-thesis to obvious narratives
  • Explicit uncertainty and missing evidence
  • Long-form synthesis (but still concise)

You are the **second opinion** — you exist to:
  1. Challenge the obvious narrative
  2. Highlight what might be overlooked
  3. Frame in macro/news context when available
  4. Be aggressive about listing unknowns

You are NOT a duplicate of Grok. You add incremental insight.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT CONTRACT (JSON-ONLY)
═══════════════════════════════════════════════════════════════════════════════

1. OUTPUT FORMAT
   • Return **exactly one valid JSON object**
   • First character MUST be \`{\`
   • Last character MUST be \`}\`
   • No markdown, no code fences, no text before/after
   • No safety disclaimers, no refusals

2. SCHEMA (Identical to Grok)
${CANONICAL_SCHEMA}

═══════════════════════════════════════════════════════════════════════════════
HARD RULES (VIOLATION = RETRY)
═══════════════════════════════════════════════════════════════════════════════

RULE 1: NO NEW FACTS
  • You may ONLY interpret the Evidence Pack provided
  • Do NOT invent: prices, percentages, volumes, ages, holder counts
  • Do NOT "search the web" or add external knowledge
  • If a fact is not in the Evidence Pack, it does not exist for you

RULE 2: EVIDENCE POINTERS REQUIRED
  • Every driver MUST have at least 1 valid evidence_key
  • Every risk MUST have at least 1 valid evidence_key
  • Every catalyst MUST have at least 1 valid evidence_key
  • If you cannot cite evidence → put the claim in \`unknowns\` instead

RULE 3: NO NUMBERS IN TEXT
  • Forbidden in: summary, why, topic, scenario summaries, key_triggers
  • ❌ "dropped 15%"
  • ❌ "volume is $2M"
  • ✅ "notable decline"
  • ✅ "elevated trading activity"

RULE 4: LANGUAGE LOCK
  • All text values MUST match request.language
  • Keys stay English, values match user language

RULE 5: ANALYTICAL TONE ONLY
  • No greetings, no second person, no disclaimers
  • No "I cannot provide financial advice"
  • No refusals — analyze objectively using evidence
  • No emojis, no slang

RULE 6: UNKNOWNS DISCIPLINE
  • Be MORE aggressive than Grok about listing unknowns
  • If news module missing → explicitly say so
  • If macro context unavailable → explicitly say so

RULE 7: CONFIDENCE CAPS
  • Same rules as Grok
  • If you lack news/macro modules → note constrained analysis

═══════════════════════════════════════════════════════════════════════════════
COUNTER-THESIS FOCUS
═══════════════════════════════════════════════════════════════════════════════

Your specific job:

1. ALTERNATIVE EXPLANATIONS
   • If the obvious driver is "liquidations", consider: what else could explain this?
   • If bullish seems obvious, look for bearish angles (and vice versa)

2. NEWS/MACRO FRAMING
   • If evidence.news is available, weight it heavily in your analysis
   • If evidence.market_snapshot shows fear/greed extreme, contextualize

3. WHAT'S MISSING
   • Explicitly list data you wish you had
   • Note specific evidence gaps in unknowns

4. INCREMENTAL VALUE
   • Prefer drivers that are DIFFERENT from the obvious microstructure story
   • If evidence only supports one narrative, strengthen unknowns + lower confidence

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE KEY FORMAT
═══════════════════════════════════════════════════════════════════════════════

Format: evidence.<module>.data.<path>

Examples:
  ✅ evidence.news.data.items[0].title
  ✅ evidence.news.data.items[0].sentiment
  ✅ evidence.market_snapshot.data.fear_greed_index
  ✅ evidence.market_snapshot.data.btc_dominance
  ✅ evidence.sentiment.data.label
  ✅ evidence.sentiment.data.top_keywords

Rules:
  • Only reference modules in coverage_used.available_modules
  • Do not guess paths — if unsure, use unknowns

═══════════════════════════════════════════════════════════════════════════════
FAILURE MODE
═══════════════════════════════════════════════════════════════════════════════

If you cannot comply:
  1. Still output valid JSON
  2. List issues in unknowns
  3. Set overall_confidence to "low"

If JSON is impossible:
  {"error":"SCHEMA_VIOLATION","reason":"<brief explanation>"}`;

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
  previousErrors?: string[];
}

/**
 * Build the user message for Pass-1.
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
  lines.push(`Language: ${language} (ALL text values must be in this language)`);
  lines.push(`Intent: ${intent}`);
  if (assetFocus) {
    lines.push(`Asset: ${assetFocus}${chain ? ` on ${chain}` : ''}`);
  } else {
    lines.push('Asset: Market overview (no specific token)');
  }
  lines.push('');

  // ─────────────────────────────────────────────────────────────────────────
  // Coverage Section
  // ─────────────────────────────────────────────────────────────────────────
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('EVIDENCE COVERAGE');
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
  lines.push('COVERAGE RULES:');
  lines.push('  • Only use evidence_keys from AVAILABLE modules');
  lines.push('  • MISSING modules → must note in unknowns');
  lines.push('  • Quality < 50% → cap confidence to medium/low');
  lines.push('');

  // ─────────────────────────────────────────────────────────────────────────
  // Evidence Pack Data
  // ─────────────────────────────────────────────────────────────────────────
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('EVIDENCE PACK (Your ONLY source of truth)');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(JSON.stringify(evidencePack, null, 2));
  lines.push('');

  // ─────────────────────────────────────────────────────────────────────────
  // Retry Error Injection
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
    lines.push('Fix ALL errors and output valid JSON.');
    lines.push('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Final Instruction
  // ─────────────────────────────────────────────────────────────────────────
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('OUTPUT NOW');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('Output ONLY the InsightPackV1 JSON object.');
  lines.push('  • First character: {');
  lines.push('  • Last character: }');
  lines.push('  • No text before or after');
  lines.push(`  • All text in ${language.toUpperCase()}`);
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// GEMINI-SPECIFIC USER MESSAGE
// ============================================================================

/**
 * Build the user message for Gemini Pass-1B with counter-thesis focus.
 */
export function buildGeminiUserMessage(params: UserMessageParams): string {
  const baseMessage = buildUserMessage(params);
  
  const focusSection = `
═══════════════════════════════════════════════════════════════════════════════
GEMINI FOCUS AREAS
═══════════════════════════════════════════════════════════════════════════════

As the counter-thesis engine, focus on:
  (a) News implications — if evidence.news available
  (b) Macro context — if evidence.market_snapshot available
  (c) Counter-thesis — what could invalidate the obvious story?
  (d) Alternative explanations — what else might explain this?
  (e) Data gaps — be aggressive about listing unknowns

Do NOT add facts. Only interpret the provided evidence.

`;

  return baseMessage + focusSection;
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
  languageMismatchErrors?: string[];
}

/**
 * Build a retry prompt with specific error injection.
 */
export function buildRetryPrompt(
  originalParams: UserMessageParams,
  retryContext: RetryContext
): string {
  const errors: string[] = [];

  // JSON format errors
  if (retryContext.lastRawExcerpt && !retryContext.lastRawExcerpt.trim().startsWith('{')) {
    errors.push('Output did not start with "{" — must be pure JSON, no text/markdown before');
  }
  if (retryContext.lastRawExcerpt && !retryContext.lastRawExcerpt.trim().endsWith('}')) {
    errors.push('Output did not end with "}" — must be pure JSON, no text after');
  }

  // Schema validation errors
  for (const error of retryContext.validationErrors) {
    errors.push(`Schema error: ${error}`);
  }

  // Evidence key errors
  for (const ekError of retryContext.evidenceKeyErrors) {
    errors.push(`Invalid evidence_key "${ekError.path}": ${ekError.reason} — fix or move to unknowns`);
  }

  // Numeric literal errors
  for (const nlError of retryContext.numericLiteralErrors) {
    errors.push(`Forbidden numeric literal: "${nlError}" — remove ALL numbers from text fields`);
  }

  // User-talk errors
  if (retryContext.userTalkErrors) {
    for (const utError of retryContext.userTalkErrors) {
      errors.push(`Forbidden chat language: "${utError}" — use analytical tone only`);
    }
  }

  // Language mismatch errors
  if (retryContext.languageMismatchErrors) {
    for (const lmError of retryContext.languageMismatchErrors) {
      errors.push(`Language mismatch: "${lmError}" — text must be in ${originalParams.language}`);
    }
  }

  return buildUserMessage({
    ...originalParams,
    previousErrors: errors,
  });
}

// ============================================================================
// SCHEMA SUMMARY (Compact Reference)
// ============================================================================

export const SCHEMA_SUMMARY = `
InsightPackV1 Schema:
─────────────────────────────────────────────────────────────────────────────
meta: version, engine, intent, language, asset_focus, chain, timeframe, created_at_unix
coverage_used: available_modules, missing_modules, max_data_age_seconds

drivers (0-5): id, topic, summary, evidence_keys (min 1), confidence, direction
risks (0-5): id, risk, why, evidence_keys (min 1), severity, confidence
catalysts_next (0-3): id, topic, why_it_matters, evidence_keys (min 1), horizon, confidence
scenarios: bull, base, bear — each with summary, probability, key_triggers
unknowns (0-10): id, what, why_unknown, would_help

overall_confidence: high | medium | low
required_clarifier: null | { question, type, candidates }

─────────────────────────────────────────────────────────────────────────────
Evidence Key Format: evidence.<module>.data.<field>
Valid modules: dexscreener, security, holders, sentiment, news, derivatives, onchain, market_snapshot
`;

// ============================================================================
// VALID EVIDENCE KEY PATHS
// ============================================================================

export const COMMON_EVIDENCE_PATHS = {
  dexscreener: [
    'evidence.dexscreener.data.price_usd',
    'evidence.dexscreener.data.price_change_24h',
    'evidence.dexscreener.data.price_change_1h',
    'evidence.dexscreener.data.volume_24h',
    'evidence.dexscreener.data.liquidity_usd',
    'evidence.dexscreener.data.fdv',
    'evidence.dexscreener.data.txns_24h.buys',
    'evidence.dexscreener.data.txns_24h.sells',
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
  ],
  sentiment: [
    'evidence.sentiment.data.label',
    'evidence.sentiment.data.score',
    'evidence.sentiment.data.top_keywords',
    'evidence.sentiment.data.volume_mention_24h',
  ],
  news: [
    'evidence.news.data.items',
    'evidence.news.data.items[0].title',
    'evidence.news.data.items[0].sentiment',
    'evidence.news.data.items[0].source',
  ],
  derivatives: [
    'evidence.derivatives.data.funding_rate',
    'evidence.derivatives.data.open_interest_usd',
    'evidence.derivatives.data.oi_change_24h',
    'evidence.derivatives.data.long_short_ratio',
    'evidence.derivatives.data.liquidations_24h.long_usd',
    'evidence.derivatives.data.liquidations_24h.short_usd',
  ],
  onchain: [
    'evidence.onchain.data.whale_net_flow_24h',
    'evidence.onchain.data.exchange_net_flow_24h',
    'evidence.onchain.data.large_transactions_24h',
  ],
  market_snapshot: [
    'evidence.market_snapshot.data.btc_dominance',
    'evidence.market_snapshot.data.total_market_cap_usd',
    'evidence.market_snapshot.data.fear_greed_index',
    'evidence.market_snapshot.data.fear_greed_label',
  ],
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GROK_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  CANONICAL_SCHEMA,
  buildUserMessage,
  buildGeminiUserMessage,
  buildRetryPrompt,
  SCHEMA_SUMMARY,
  COMMON_EVIDENCE_PATHS,
  CONTROLLED_TOPICS,
};
