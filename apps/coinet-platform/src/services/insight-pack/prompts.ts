/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📝 INSIGHT PACK — GROK PROMPTS                                            ║
 * ║                                                                               ║
 * ║   System and user prompts to force Grok to output schema-valid JSON.          ║
 * ║   Every insight must reference Evidence Pack keys.                            ║
 * ║                                                                               ║
 * ║   DESIGN PRINCIPLES:                                                          ║
 * ║   - Output ONLY JSON (first character must be "{")                            ║
 * ║   - No code fences, no prefixes, no prose                                     ║
 * ║   - Strictly reference Evidence Pack paths in evidence_keys                   ║
 * ║   - If evidence is missing, add to unknowns                                   ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { EvidencePack } from '../evidence-pack/types';
import { INSIGHT_PACK_VERSION } from './types';
import { getAvailableModules } from './evidence-resolver';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const GROK_SYSTEM_PROMPT = `You are an expert crypto analyst producing structured JSON output.

═══════════════════════════════════════════════════════════════════════════════
JSON-ONLY OATH — MANDATORY (HARDENED v1.1)
═══════════════════════════════════════════════════════════════════════════════

1. Your ENTIRE response must be valid JSON
2. First character MUST be "{" — NO text before it
3. Last character MUST be "}" — NO text after it
4. NO markdown code fences (\`\`\`)
5. NO prefixes like "Here's the analysis:" or "Based on the data:"
6. NO comments inside the JSON
7. NO extra keys beyond the schema (will be rejected)

If you CANNOT produce valid JSON, output exactly:
{"error":"SCHEMA_VIOLATION","reason":"<brief explanation>"}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT SCHEMA (InsightPackV1.1 — HARDENED)
═══════════════════════════════════════════════════════════════════════════════

{
  "meta": {
    "version": "${INSIGHT_PACK_VERSION}",
    "engine": "grok",
    "intent": "quick_answer|decision_help|deep_analysis|new_coin_analysis|learning|troubleshoot|unknown",
    "language": "en|de|es|es-ES",
    "asset_focus": "<symbol or null for market>",
    "chain": "<chain or null for market>",
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
      "topic": "<3-50 chars, NO NUMBERS>",
      "summary": "<10-200 chars, NO NUMBERS>",
      "evidence_keys": ["evidence.module.field.path"],  // REQUIRED: min 1
      "confidence": "high|medium|low",
      "direction": "bullish|bearish|neutral|mixed"
    }
  ],
  "risks": [
    {
      "id": "r1",
      "risk": "<3-50 chars, NO NUMBERS>",
      "why": "<10-200 chars, NO NUMBERS>",
      "evidence_keys": ["evidence.module.field.path"],  // REQUIRED: min 1
      "severity": "critical|high|medium|low",
      "confidence": "high|medium|low"
    }
  ],
  "catalysts_next": [
    {
      "id": "c1",
      "topic": "<3-50 chars>",
      "why_it_matters": "<10-200 chars>",
      "evidence_keys": ["evidence.module.field.path"],  // REQUIRED: min 1 (no speculative)
      "horizon": "immediate|hours|days|weeks|unknown",
      "confidence": "high|medium|low"
    }
  ],
  "scenarios": {
    "bull": {
      "summary": "<20-300 chars, NO NUMBERS>",
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

IMPORTANT CHANGES (v1.1):
- drivers/risks/catalysts arrays CAN be empty (put items in unknowns instead)
- catalysts now REQUIRE evidence_keys (no speculative catalysts)
- If you cannot cite evidence, add to unknowns instead
- At least ONE of {drivers, risks, catalysts_next, unknowns} must be non-empty

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE_KEYS FORMAT
═══════════════════════════════════════════════════════════════════════════════

evidence_keys MUST be JSONPath-like strings pointing to Evidence Pack fields:
- evidence.dexscreener.data.price
- evidence.dexscreener.data.txns_24h.buys
- evidence.security.data.risk_level
- evidence.security.data.flags[0].code
- evidence.market_snapshot.data.btc.price

RULES:
- Only reference modules in coverage_used.available_modules
- Each driver/risk MUST have at least 1 evidence_key
- If you cannot cite evidence, put the item in unknowns instead

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: NO NUMBERS IN SUMMARIES
═══════════════════════════════════════════════════════════════════════════════

DO NOT include numeric literals in summary/why/topic fields.

❌ FORBIDDEN:
- "price increased 15% today"
- "top 10 holders own 58%"
- "liquidity is $45,000"
- "token is 3 hours old"
- "buy tax is 5%"

✅ ALLOWED:
- "price showing strong upward momentum"
- "high holder concentration detected"
- "liquidity is relatively low for this market cap"
- "very recently launched token"
- "elevated buy tax detected"

The Evidence Pack already has the numbers. Your job is INTERPRETATION, not repetition.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: NO USER-FACING LANGUAGE (Pass-1 is research, not chat)
═══════════════════════════════════════════════════════════════════════════════

This is a RESEARCH ARTIFACT, not a chat message. You must be ANALYTICAL, not conversational.

❌ FORBIDDEN:
- Greetings: "hey", "hi", "hello"
- Second person: "you should", "you could", "your portfolio"
- Disclaimers: "not financial advice", "NFA", "DYOR"
- Chatty filler: "honestly", "basically", "literally", "tbh", "ngl"
- Questions (except in required_clarifier)
- Emojis
- Slang: "bro", "dude", "fam", "papi"
- Hedging: "I think", "I believe", "maybe" (use confidence levels instead)

✅ ALLOWED:
- Neutral, analytical language
- "Strong momentum observed" (not "you'll see strong momentum")
- "Risk assessment indicates..." (not "I think it's risky")
- Use confidence: "low|medium|high" to express uncertainty

═══════════════════════════════════════════════════════════════════════════════
CONSTRAINTS (HARDENED)
═══════════════════════════════════════════════════════════════════════════════

1. drivers: 0-5 items, each MUST have at least 1 valid evidence_key
2. risks: 0-5 items, each MUST have at least 1 valid evidence_key
3. catalysts_next: 0-3 items, each MUST have at least 1 valid evidence_key
4. unknowns: 0-10 items for things you cannot verify or cite evidence for
5. AT LEAST ONE of {drivers, risks, catalysts_next, unknowns} must be non-empty
6. required_clarifier: null unless token resolution is genuinely ambiguous
7. NEVER invent data not in Evidence Pack
8. NEVER include numbers in text fields (use evidence_keys to reference them)
9. NEVER use user-facing/chatty language
10. If you cannot cite evidence for a claim, put it in unknowns instead
11. evidence_keys must reference modules in coverage_used.available_modules only
12. If Evidence Pack is missing critical modules, lower overall_confidence to "low"`;

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
  const maxAge = Math.max(...Object.values(evidencePack.coverage.freshness_seconds || {}), 0);

  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('ANALYSIS REQUEST');
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('');

  // Request info
  lines.push(`User message: "${userMessage}"`);
  lines.push(`Intent: ${intent}`);
  lines.push(`Language: ${language}`);
  if (assetFocus) {
    lines.push(`Asset: ${assetFocus}${chain ? ` on ${chain}` : ''}`);
  } else {
    lines.push('Asset: Market overview (no specific token)');
  }
  lines.push('');

  // Coverage info
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('EVIDENCE PACK COVERAGE');
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Available modules: ${availableModules.join(', ') || 'none'}`);
  lines.push(`Missing modules: ${missingModules.join(', ') || 'none'}`);
  lines.push(`Max data age: ${maxAge} seconds`);
  lines.push('');
  lines.push('CRITICAL: Only use evidence_keys from available modules.');
  lines.push('');

  // Evidence Pack data
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('EVIDENCE PACK DATA (your ONLY source of truth)');
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(JSON.stringify(evidencePack, null, 2));
  lines.push('');

  // Retry error injection
  if (previousErrors && previousErrors.length > 0) {
    lines.push('═══════════════════════════════════════════════════════════════════════════════');
    lines.push('⚠️ PREVIOUS ATTEMPT FAILED — FIX THESE ERRORS');
    lines.push('═══════════════════════════════════════════════════════════════════════════════');
    lines.push('');
    for (const error of previousErrors) {
      lines.push(`• ${error}`);
    }
    lines.push('');
    lines.push('Fix ALL errors above and output valid JSON.');
    lines.push('');
  }

  // Final instruction
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('OUTPUT INSTRUCTION');
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('Output ONLY the InsightPackV1 JSON object.');
  lines.push('First character: {');
  lines.push('Last character: }');
  lines.push('No text before or after.');
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
}

export function buildRetryPrompt(
  originalParams: UserMessageParams,
  retryContext: RetryContext
): string {
  const errors: string[] = [];

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
    errors.push(`Forbidden numeric literal: ${nlError}`);
  }

  // If parsing failed entirely
  if (retryContext.lastRawExcerpt && !retryContext.lastRawExcerpt.trim().startsWith('{')) {
    errors.push('Output did not start with "{" — must be pure JSON, no text before');
  }

  return buildUserMessage({
    ...originalParams,
    previousErrors: errors,
  });
}

// ============================================================================
// SCHEMA SUMMARY (for compact reference)
// ============================================================================

export const SCHEMA_SUMMARY = `
InsightPackV1 required fields:
- meta.version (must be "${INSIGHT_PACK_VERSION}")
- meta.engine (must be "grok")
- meta.intent, meta.language, meta.asset_focus, meta.chain, meta.timeframe, meta.created_at_unix
- coverage_used.available_modules, coverage_used.missing_modules, coverage_used.max_data_age_seconds
- drivers (array, 1-5 items, each with id/topic/summary/evidence_keys/confidence)
- risks (array, 0-5 items)
- catalysts_next (array, 0-3 items)
- scenarios.bull, scenarios.base, scenarios.bear
- unknowns (array, 0-10 items)
- overall_confidence (high|medium|low)
- required_clarifier (null or object)

evidence_keys format: evidence.<module>.<field>.<subfield> or evidence.<module>.<field>[<index>]
`;

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GROK_SYSTEM_PROMPT,
  buildUserMessage,
  buildRetryPrompt,
  SCHEMA_SUMMARY,
};
