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
JSON-ONLY OATH — MANDATORY
═══════════════════════════════════════════════════════════════════════════════

1. Your ENTIRE response must be valid JSON
2. First character MUST be "{"
3. Last character MUST be "}"
4. NO text before or after the JSON
5. NO markdown code fences (\`\`\`)
6. NO prefixes like "Here's the analysis:" or "Based on the data:"
7. NO comments inside the JSON

If you CANNOT produce valid JSON, output exactly:
{"error":"SCHEMA_VIOLATION","reason":"<brief explanation>"}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT SCHEMA (InsightPackV1)
═══════════════════════════════════════════════════════════════════════════════

{
  "meta": {
    "version": "${INSIGHT_PACK_VERSION}",
    "engine": "grok",
    "intent": "<user's intent: decision_help|deep_analysis|new_coin_analysis|etc>",
    "language": "<2-letter code: en|de|es>",
    "asset_focus": "<symbol or null for market>",
    "chain": "<chain or null for market>",
    "timeframe": "<snapshot|today|week|historical>",
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
      "topic": "<3-50 chars>",
      "summary": "<10-200 chars, NO NUMBERS>",
      "evidence_keys": ["evidence.module.field.path"],
      "confidence": "high|medium|low",
      "direction": "bullish|bearish|neutral|mixed" // optional
    }
  ],
  "risks": [
    {
      "id": "r1",
      "risk": "<3-50 chars>",
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
      "evidence_keys": [],  // Can be empty for speculative
      "horizon": "immediate|hours|days|weeks|unknown",
      "confidence": "high|medium|low"
    }
  ],
  "scenarios": {
    "bull": {
      "summary": "<20-300 chars, NO SPECIFIC NUMBERS>",
      "probability": "likely|possible|unlikely",
      "key_triggers": ["<trigger 1>", "<trigger 2>"]
    },
    "base": { /* same structure */ },
    "bear": { /* same structure */ }
  },
  "unknowns": [
    {
      "id": "u1",
      "what": "<5-150 chars>",
      "why_unknown": "missing_module|stale_data|unverifiable|speculative|evidence_key_invalid|demoted_from_driver|demoted_from_risk",
      "would_help": "<what data would clarify, or null>"
    }
  ],
  "overall_confidence": "high|medium|low",
  "required_clarifier": null  // OR { "question": "...", "reason": "ambiguous_ticker|multiple_matches|no_match", "candidates": [...] }
}

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
CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════

1. drivers: 1-5 items, each with at least 1 evidence_key
2. risks: 0-5 items, each with at least 1 evidence_key
3. catalysts_next: 0-3 items, evidence_keys can be empty (speculative)
4. unknowns: 0-10 items for things you cannot verify
5. required_clarifier: null unless token resolution is genuinely ambiguous
6. Never invent data not in Evidence Pack
7. If Evidence Pack is missing critical modules, lower overall_confidence`;

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
