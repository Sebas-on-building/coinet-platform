/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧠 INSIGHT PACK — GROK PASS-1 ORCHESTRATOR                                ║
 * ║                                                                               ║
 * ║   Orchestrates the full Pass-1 pipeline:                                      ║
 * ║   1. Build prompt with Evidence Pack                                          ║
 * ║   2. Call Grok API                                                            ║
 * ║   3. Enforce schema compliance                                                ║
 * ║   4. Retry with error injection if needed                                     ║
 * ║   5. Return InsightPack or mark engine as missing                             ║
 * ║                                                                               ║
 * ║   HARD INVARIANTS:                                                            ║
 * ║   I5. If Evidence Pack is missing/empty, Pass-1 MUST NOT proceed              ║
 * ║   I6. On schema failure after max retries, mark engine as missing             ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import { EvidencePack } from '../evidence-pack/types';
import {
  InsightPackV1,
  EnforcementResult,
  EnforcementOptions,
  DEFAULT_ENFORCEMENT_OPTIONS,
  INSIGHT_PACK_VERSION,
} from './types';
import {
  GROK_SYSTEM_PROMPT,
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

export interface GrokPass1Input {
  userMessage: string;
  intent: string;
  language: string;
  evidencePack: EvidencePack;
  assetFocus: string | null;
  chain: string | null;
}

export interface GrokPass1Result {
  ok: true;
  data: InsightPackV1;
  degraded: boolean;
  warnings: string[];
  attemptsUsed: number;
  latencyMs: number;
}

export interface GrokPass1Failure {
  ok: false;
  error: string;
  attemptsUsed: number;
  latencyMs: number;
  lastRawExcerpt?: string;
}

export type GrokPass1Output = GrokPass1Result | GrokPass1Failure;

export interface GrokPass1Options extends Partial<EnforcementOptions> {
  grokApiKey?: string;
  grokModel?: string;
  grokBaseUrl?: string;
}

// ============================================================================
// GROK API CALL
// ============================================================================

interface GrokApiResponse {
  ok: boolean;
  text: string;
  latencyMs: number;
  error?: string;
}

async function callGrokApi(
  systemPrompt: string,
  userPrompt: string,
  options: GrokPass1Options
): Promise<GrokApiResponse> {
  const apiKey = options.grokApiKey || process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  const model = options.grokModel || 'grok-3-mini';
  const baseUrl = options.grokBaseUrl || 'https://api.x.ai/v1';
  const timeoutMs = options.timeoutMs || DEFAULT_ENFORCEMENT_OPTIONS.timeoutMs;

  if (!apiKey) {
    return {
      ok: false,
      text: '',
      latencyMs: 0,
      error: 'Grok API key not configured',
    };
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,  // Lower for more deterministic JSON
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        ok: false,
        text: '',
        latencyMs,
        error: `Grok API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

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
        error: `Grok API timeout after ${timeoutMs}ms`,
      };
    }

    return {
      ok: false,
      text: '',
      latencyMs,
      error: `Grok API error: ${error.message}`,
    };
  }
}

// ============================================================================
// EVIDENCE PACK VALIDATION
// ============================================================================

function validateEvidencePackForPass1(pack: EvidencePack): { valid: boolean; reason?: string } {
  // INVARIANT I5: Evidence Pack must exist and not be empty
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
 * Execute Pass-1 Grok analysis with full enforcement pipeline.
 * 
 * @param input - The input containing user message, intent, and Evidence Pack
 * @param options - Optional configuration for retries, API, etc.
 * @returns GrokPass1Output with InsightPack on success or failure details
 */
export async function executeGrokPass1(
  input: GrokPass1Input,
  options: GrokPass1Options = {}
): Promise<GrokPass1Output> {
  const startTime = Date.now();
  const maxRetries = options.maxRetries ?? DEFAULT_ENFORCEMENT_OPTIONS.maxRetries;

  // Validate Evidence Pack (INVARIANT I5)
  const packValidation = validateEvidencePackForPass1(input.evidencePack);
  if (!packValidation.valid) {
    logger.error('🧠 Pass-1 Grok: Evidence Pack invalid', { reason: packValidation.reason });
    emitMissing(0, packValidation.reason!, false);
    return {
      ok: false,
      error: `Evidence Pack validation failed: ${packValidation.reason}`,
      attemptsUsed: 0,
      latencyMs: Date.now() - startTime,
    };
  }

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
  let lastResult: EnforcementResult | null = null;

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

    // Call Grok API
    logger.info(`🧠 Pass-1 Grok: Attempt ${attempt}/${maxRetries + 1}`);
    const apiResponse = await callGrokApi(GROK_SYSTEM_PROMPT, userPrompt, options);

    if (!apiResponse.ok) {
      logger.error('🧠 Pass-1 Grok: API call failed', { error: apiResponse.error, attempt });
      
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

    // Enforce schema
    lastResult = enforceInsightPack(lastRawText, input.evidencePack, {
      ...options,
      attempt,
    });

    if (lastResult.ok) {
      // Success!
      return {
        ok: true,
        data: lastResult.data,
        degraded: lastResult.degraded,
        warnings: lastResult.warnings,
        attemptsUsed: attempt,
        latencyMs: Date.now() - startTime,
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
      logger.warn('🧠 Pass-1 Grok: Enforcement failed, retrying', {
        attempt,
        errorCount: lastResult.validationErrors.length,
        errors: lastResult.validationErrors.slice(0, 3),
      });
      continue;
    }
  }

  // INVARIANT I6: Max retries exceeded, mark engine as missing
  emitMissing(attempt, lastResult?.error || 'Unknown error', true);
  logger.error('🧠 Pass-1 Grok: Max retries exceeded, marking engine as missing', {
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
 * Create a minimal fallback InsightPack when Grok fails.
 * This is NOT a substitute for real analysis — it's a structured "missing" marker.
 */
export function createMissingEngineInsightPack(
  input: GrokPass1Input,
  reason: string
): InsightPackV1 {
  const availableModules = getAvailableModules(input.evidencePack);

  return {
    meta: {
      version: INSIGHT_PACK_VERSION,
      engine: 'grok',
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
    drivers: [
      {
        id: 'd1',
        topic: 'Analysis unavailable',
        summary: 'Unable to generate analysis due to engine failure. Raw data is available in Evidence Pack.',
        evidence_keys: [],
        confidence: 'low',
      },
    ],
    risks: [],
    catalysts_next: [],
    scenarios: {
      bull: {
        summary: 'Cannot project scenarios without successful analysis.',
        probability: 'possible',
        key_triggers: [],
      },
      base: {
        summary: 'Cannot project scenarios without successful analysis.',
        probability: 'possible',
        key_triggers: [],
      },
      bear: {
        summary: 'Cannot project scenarios without successful analysis.',
        probability: 'possible',
        key_triggers: [],
      },
    },
    unknowns: [
      {
        id: 'u1',
        what: `Grok analysis failed: ${reason}`,
        why_unknown: 'unverifiable',
        would_help: 'Retry request or use alternative analysis engine',
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
  callGrokApi,
};
