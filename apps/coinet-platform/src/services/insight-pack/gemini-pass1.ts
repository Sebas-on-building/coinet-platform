/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔮 GEMINI PASS-1B ORCHESTRATOR                                            ║
 * ║                                                                               ║
 * ║   Runs Gemini as counter-thesis engine alongside Grok.                        ║
 * ║   Same Evidence Pack, same schema, different perspective.                     ║
 * ║                                                                               ║
 * ║   ROLE DEFINITION:                                                            ║
 * ║   - Counter-thesis + coverage completion                                      ║
 * ║   - Highlight missing evidence and alternative explanations                   ║
 * ║   - Macro/news framing if present                                             ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import { EvidencePack } from '../evidence-pack/types';
import {
  InsightPackV1,
  EnforcementOptions,
  DEFAULT_ENFORCEMENT_OPTIONS,
  INSIGHT_PACK_VERSION,
  IntentType,
  Timeframe,
} from './types';
import {
  GEMINI_SYSTEM_PROMPT,
  buildUserMessage,
  buildRetryPrompt,
  UserMessageParams,
} from './prompts';
import {
  enforceInsightPack,
  collectRetryErrors,
} from './enforcer';
import {
  emitRawReceived,
  emitTimeout,
  emitRetry,
  emitMissing,
} from './observability';
import { getAvailableModules } from './evidence-resolver';

// ============================================================================
// TYPES
// ============================================================================

export interface GeminiPass1Input {
  userMessage: string;
  intent: string;
  language: string;
  evidencePack: EvidencePack;
  assetFocus: string | null;
  chain: string | null;
  timeframe?: 'snapshot' | 'today' | 'week' | 'historical';
}

export interface GeminiPass1Result {
  ok: true;
  data: InsightPackV1;
  degraded: boolean;
  warnings: string[];
  attemptsUsed: number;
  latencyMs: number;
  serverOverwrites: string[];
}

export interface GeminiPass1Failure {
  ok: false;
  error: string;
  attemptsUsed: number;
  latencyMs: number;
  lastRawExcerpt?: string;
}

export type GeminiPass1Output = GeminiPass1Result | GeminiPass1Failure;

export interface GeminiPass1Options extends Partial<EnforcementOptions> {
  geminiApiKey?: string;
  geminiModel?: string;
  geminiBaseUrl?: string;
}

// ============================================================================
// GEMINI-SPECIFIC SYSTEM PROMPT ADDITIONS
// ============================================================================

const GEMINI_ROLE_ADDITIONS = `
═══════════════════════════════════════════════════════════════════════════════
GEMINI PASS-1B ROLE (Counter-Thesis Engine)
═══════════════════════════════════════════════════════════════════════════════

You are the **second opinion** in a dual-engine research system.
Your specific role is:

1. COUNTER-THESIS
   • Look for alternative explanations that Grok might miss
   • Challenge the obvious narrative
   • Consider bearish angles if bullish seems obvious (and vice versa)

2. COVERAGE COMPLETION
   • Heavily weight modules that might be overlooked:
     - news.data.items (specific headlines)
     - sentiment.data.label and sentiment.data.score
     - onchain.data.whale_net_flow_24h
   • If key modules are missing, make that prominent in unknowns

3. MACRO FRAMING
   • If market_snapshot is available, frame the token in macro context
   • Reference BTC dominance, fear/greed, altcoin season if relevant

4. EXPLICIT GAPS
   • Be more aggressive about listing unknowns
   • Note specific evidence you wish you had

You must still follow ALL the same rules:
  • JSON-only output
  • Evidence pointers required
  • No numbers in text
  • Analytical language only
`;

// ============================================================================
// GEMINI API CALL
// ============================================================================

interface GeminiApiResponse {
  ok: boolean;
  text: string;
  latencyMs: number;
  error?: string;
}

async function callGeminiApi(
  systemPrompt: string,
  userPrompt: string,
  options: GeminiPass1Options
): Promise<GeminiApiResponse> {
  const apiKey = options.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  const model = options.geminiModel || 'gemini-2.0-flash';
  const baseUrl = options.geminiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  const timeoutMs = options.timeoutMs || 2200;  // Slightly longer for Gemini

  if (!apiKey) {
    return {
      ok: false,
      text: '',
      latencyMs: 0,
      error: 'Gemini API key not configured',
    };
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            topP: 0.8,
          },
          safetySettings: [
            // Disable safety filters for financial analysis
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        ok: false,
        text: '',
        latencyMs,
        error: `Gemini API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    
    // Extract text from Gemini response format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Check for safety blocks
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      return {
        ok: false,
        text: '',
        latencyMs,
        error: 'Gemini blocked response due to safety filters',
      };
    }

    emitRawReceived(text.length, latencyMs);

    return {
      ok: true,
      text,
      latencyMs,
    };

  } catch (error: any) {
    const latencyMs = Date.now() - startTime;

    if (error.name === 'AbortError') {
      emitTimeout(1, timeoutMs);
      return {
        ok: false,
        text: '',
        latencyMs,
        error: `Gemini API timeout after ${timeoutMs}ms`,
      };
    }

    return {
      ok: false,
      text: '',
      latencyMs,
      error: `Gemini API error: ${error.message}`,
    };
  }
}

// ============================================================================
// EVIDENCE PACK VALIDATION (Same as Grok)
// ============================================================================

function validateEvidencePackForPass1(pack: EvidencePack): { valid: boolean; reason?: string } {
  if (!pack) {
    return { valid: false, reason: 'Evidence Pack is null or undefined' };
  }

  const availableModules = getAvailableModules(pack);

  if (availableModules.length === 0) {
    return { valid: false, reason: 'Evidence Pack has no available modules' };
  }

  // For TOKEN pack, require at least dexscreener
  if (pack.kind === 'TOKEN') {
    if (!availableModules.includes('dexscreener')) {
      return { valid: false, reason: 'TOKEN pack requires at least dexscreener module' };
    }
  }

  // For MARKET pack, require at least market_snapshot
  if (pack.kind === 'MARKET') {
    if (!availableModules.includes('market_snapshot')) {
      return { valid: false, reason: 'MARKET pack requires at least market_snapshot module' };
    }
  }

  return { valid: true };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Execute Pass-1B Gemini analysis with full enforcement pipeline.
 */
export async function executeGeminiPass1(
  input: GeminiPass1Input,
  options: GeminiPass1Options = {}
): Promise<GeminiPass1Output> {
  const startTime = Date.now();
  const maxRetries = options.maxRetries ?? 1;  // Only 1 retry for Gemini

  // Build server-authoritative meta
  const serverMeta = {
    intent: (input.intent as IntentType) || 'unknown',
    language: input.language || 'en',
    asset_focus: input.assetFocus,
    chain: input.chain,
    timeframe: (input.timeframe || 'snapshot') as Timeframe,
  };

  // Validate Evidence Pack
  const packValidation = validateEvidencePackForPass1(input.evidencePack);
  if (!packValidation.valid) {
    logger.error('🔮 Pass-1B Gemini: Evidence Pack invalid', { reason: packValidation.reason });
    emitMissing(0, packValidation.reason!, false);
    return {
      ok: false,
      error: `Evidence Pack validation failed: ${packValidation.reason}`,
      attemptsUsed: 0,
      latencyMs: Date.now() - startTime,
    };
  }

  // Build combined system prompt with Gemini role additions
  const fullSystemPrompt = GEMINI_SYSTEM_PROMPT + GEMINI_ROLE_ADDITIONS;

  // Build initial prompt
  const userMessageParams: UserMessageParams = {
    userMessage: input.userMessage,
    intent: input.intent,
    language: input.language,
    evidencePack: input.evidencePack,
    assetFocus: input.assetFocus,
    chain: input.chain,
  };

  let attempt = 0;
  let lastRawText = '';
  let lastResult: any = null;

  while (attempt <= maxRetries) {
    attempt++;

    // Build prompt (with errors for retries)
    const userPrompt = attempt === 1
      ? buildUserMessage(userMessageParams)
      : buildRetryPrompt(
          userMessageParams,
          {
            attempt,
            lastRawExcerpt: lastRawText.slice(0, 1000),
            ...collectRetryErrors(lastRawText, input.evidencePack),
          }
        );

    // Call Gemini API
    logger.info(`🔮 Pass-1B Gemini: Attempt ${attempt}/${maxRetries + 1}`);
    const apiResponse = await callGeminiApi(fullSystemPrompt, userPrompt, options);

    if (!apiResponse.ok) {
      logger.error('🔮 Pass-1B Gemini: API call failed', { error: apiResponse.error, attempt });
      
      if (attempt <= maxRetries) {
        emitRetry(attempt, maxRetries, apiResponse.error!, 1);
        continue;
      }

      // Max retries exceeded
      emitMissing(attempt, apiResponse.error!, true);
      return {
        ok: false,
        error: apiResponse.error!,
        attemptsUsed: attempt,
        latencyMs: Date.now() - startTime,
      };
    }

    lastRawText = apiResponse.text;

    // Enforce schema (with server-authoritative overrides)
    lastResult = enforceInsightPack(lastRawText, input.evidencePack, {
      ...options,
      attempt,
      serverMeta: {
        ...serverMeta,
        engine: 'gemini',  // Override engine
      },
    });

    if (lastResult.ok) {
      // Ensure engine is set to gemini
      lastResult.data.meta.engine = 'gemini';
      
      // Success!
      return {
        ok: true,
        data: lastResult.data,
        degraded: lastResult.degraded,
        warnings: lastResult.warnings,
        attemptsUsed: attempt,
        latencyMs: Date.now() - startTime,
        serverOverwrites: lastResult.serverOverwrites || [],
      };
    }

    // Enforcement failed
    if (attempt <= maxRetries) {
      emitRetry(
        attempt,
        maxRetries,
        lastResult.error,
        lastResult.validationErrors.length
      );
      logger.warn('🔮 Pass-1B Gemini: Enforcement failed, retrying', {
        attempt,
        errorCount: lastResult.validationErrors.length,
        errors: lastResult.validationErrors.slice(0, 3),
      });
      continue;
    }
  }

  // Max retries exceeded, mark engine as missing
  emitMissing(attempt, lastResult?.error || 'Unknown error', true);
  logger.error('🔮 Pass-1B Gemini: Max retries exceeded, marking engine as missing', {
    attemptsUsed: attempt,
    lastError: lastResult?.error,
  });

  return {
    ok: false,
    error: lastResult?.error || 'Max retries exceeded',
    attemptsUsed: attempt,
    latencyMs: Date.now() - startTime,
    lastRawExcerpt: lastRawText.slice(0, 500),
  };
}

// ============================================================================
// FALLBACK / MISSING ENGINE HANDLER
// ============================================================================

/**
 * Create a minimal fallback InsightPack when Gemini fails.
 */
export function createMissingGeminiInsightPack(
  input: GeminiPass1Input,
  reason: string
): InsightPackV1 {
  const availableModules = getAvailableModules(input.evidencePack);

  return {
    meta: {
      version: INSIGHT_PACK_VERSION,
      engine: 'gemini',
      intent: input.intent,
      language: input.language,
      asset_focus: input.assetFocus,
      chain: input.chain,
      timeframe: 'snapshot',
      created_at_unix: Math.floor(Date.now() / 1000),
    },
    coverage_used: {
      available_modules: availableModules,
      missing_modules: input.evidencePack.coverage.missing || [],
      max_data_age_seconds: Math.max(
        ...Object.values(input.evidencePack.coverage.freshness_seconds || {}),
        0
      ),
    },
    drivers: [],
    risks: [],
    catalysts_next: [],
    scenarios: {
      bull: {
        summary: 'Gemini analysis unavailable.',
        probability: 'possible',
        key_triggers: [],
      },
      base: {
        summary: 'Gemini analysis unavailable.',
        probability: 'possible',
        key_triggers: [],
      },
      bear: {
        summary: 'Gemini analysis unavailable.',
        probability: 'possible',
        key_triggers: [],
      },
    },
    unknowns: [
      {
        id: 'u1',
        what: `Gemini engine failed: ${reason}`,
        why_unknown: 'unverifiable',
        would_help: 'Retry request or use Grok analysis only',
      },
    ],
    overall_confidence: 'low',
    required_clarifier: null,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  validateEvidencePackForPass1,
  callGeminiApi,
  GEMINI_ROLE_ADDITIONS,
};
