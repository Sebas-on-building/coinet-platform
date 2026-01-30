/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔄 DUAL ENGINE ORCHESTRATOR                                               ║
 * ║                                                                               ║
 * ║   Runs Grok + Gemini Pass-1 in parallel on the same Evidence Pack.            ║
 * ║   Implements trigger policy, timeouts, and deterministic fallback logic.      ║
 * ║                                                                               ║
 * ║   TRIGGER POLICY:                                                             ║
 * ║   - DUAL mode requires: intent allowlist, coverage threshold, budget          ║
 * ║   - SINGLE mode: Grok only                                                    ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import { EvidencePack } from '../evidence-pack/types';
import { InsightPackV1, EnforcementOptions } from './types';
import { executeGrokPass1, GrokPass1Input, GrokPass1Output, GrokPass1Options } from './grok-pass1';
import { executeGeminiPass1, GeminiPass1Input, GeminiPass1Output, GeminiPass1Options } from './gemini-pass1';
import { getAvailableModules } from './evidence-resolver';

// ============================================================================
// TYPES
// ============================================================================

export type ResearchMode = 'SINGLE' | 'DUAL';

export type Pass1Status = 'both_ok' | 'grok_only' | 'gemini_only' | 'none_ok';

export interface DualEngineInput {
  userMessage: string;
  intent: string;
  language: string;
  evidencePack: EvidencePack;
  assetFocus: string | null;
  chain: string | null;
  timeframe?: 'snapshot' | 'today' | 'week' | 'historical';
  
  // Research mode configuration
  researchMode?: ResearchMode;
  forceDual?: boolean;  // Override trigger policy
  
  // Budget/tier info
  userTier?: 'free' | 'pro' | 'enterprise';
  dailyCreditsRemaining?: number;
}

export interface DualEngineResult {
  grokResult: GrokPass1Output | null;
  geminiResult: GeminiPass1Output | null;
  status: Pass1Status;
  researchMode: ResearchMode;
  
  // Telemetry
  telemetry: {
    grokLatencyMs: number | null;
    geminiLatencyMs: number | null;
    totalLatencyMs: number;
    grokRetries: number;
    geminiRetries: number;
    triggerReason: string;
  };
}

export interface DualEngineOptions {
  grokOptions?: GrokPass1Options;
  geminiOptions?: GeminiPass1Options;
  grokTimeoutMs?: number;
  geminiTimeoutMs?: number;
}

// ============================================================================
// TRIGGER POLICY
// ============================================================================

/**
 * Intents that qualify for dual-engine research.
 */
const DUAL_ENGINE_INTENTS = new Set([
  'decision_help',
  'deep_analysis',
  'explain_move',
  'compare_assets',
  'event_recap',
  'new_coin_analysis',
  'portfolio_analysis',
]);

/**
 * Minimum coverage required for dual-engine research.
 * At least one of these must be present.
 */
const MINIMUM_COVERAGE_MODULES = ['dexscreener', 'market_snapshot'];

/**
 * User tiers that allow dual-engine research.
 */
const DUAL_ENGINE_TIERS = new Set(['pro', 'enterprise']);

/**
 * Determine research mode based on trigger policy.
 */
export function determineResearchMode(input: DualEngineInput): {
  mode: ResearchMode;
  reason: string;
} {
  // Force override
  if (input.forceDual) {
    return { mode: 'DUAL', reason: 'force_override' };
  }

  // Check explicit mode
  if (input.researchMode === 'SINGLE') {
    return { mode: 'SINGLE', reason: 'explicit_single' };
  }

  // Check intent allowlist
  if (!DUAL_ENGINE_INTENTS.has(input.intent)) {
    return { mode: 'SINGLE', reason: `intent_not_in_allowlist:${input.intent}` };
  }

  // Check evidence coverage
  const availableModules = getAvailableModules(input.evidencePack);
  const hasMinCoverage = MINIMUM_COVERAGE_MODULES.some(m => availableModules.includes(m));
  if (!hasMinCoverage) {
    return { mode: 'SINGLE', reason: 'insufficient_coverage' };
  }

  // Check user tier
  if (input.userTier && !DUAL_ENGINE_TIERS.has(input.userTier)) {
    return { mode: 'SINGLE', reason: `tier_not_eligible:${input.userTier}` };
  }

  // Check budget
  if (input.dailyCreditsRemaining !== undefined && input.dailyCreditsRemaining < 2) {
    return { mode: 'SINGLE', reason: 'insufficient_credits' };
  }

  // All checks passed
  return { mode: 'DUAL', reason: 'all_triggers_passed' };
}

// ============================================================================
// PARALLEL EXECUTION
// ============================================================================

/**
 * Execute both engines in parallel with independent timeouts.
 */
export async function executeDualEnginePass1(
  input: DualEngineInput,
  options: DualEngineOptions = {}
): Promise<DualEngineResult> {
  const startTime = Date.now();

  // Determine research mode
  const { mode, reason } = determineResearchMode(input);
  
  logger.info('🔄 Dual Engine: Research mode determined', { mode, reason });

  // Build common input
  const commonInput = {
    userMessage: input.userMessage,
    intent: input.intent,
    language: input.language,
    evidencePack: input.evidencePack,
    assetFocus: input.assetFocus,
    chain: input.chain,
    timeframe: input.timeframe,
  };

  // SINGLE mode: Grok only
  if (mode === 'SINGLE') {
    const grokResult = await executeGrokPass1(
      commonInput as GrokPass1Input,
      options.grokOptions
    );

    return {
      grokResult,
      geminiResult: null,
      status: grokResult.ok ? 'grok_only' : 'none_ok',
      researchMode: 'SINGLE',
      telemetry: {
        grokLatencyMs: grokResult.latencyMs,
        geminiLatencyMs: null,
        totalLatencyMs: Date.now() - startTime,
        grokRetries: grokResult.attemptsUsed - 1,
        geminiRetries: 0,
        triggerReason: reason,
      },
    };
  }

  // DUAL mode: Run both in parallel
  logger.info('🔄 Dual Engine: Starting parallel execution');

  // Create timeout-wrapped promises
  const grokTimeoutMs = options.grokTimeoutMs || 1800;
  const geminiTimeoutMs = options.geminiTimeoutMs || 2200;

  const grokPromise = executeWithTimeout(
    executeGrokPass1(commonInput as GrokPass1Input, options.grokOptions),
    grokTimeoutMs,
    'Grok'
  );

  const geminiPromise = executeWithTimeout(
    executeGeminiPass1(commonInput as GeminiPass1Input, options.geminiOptions),
    geminiTimeoutMs,
    'Gemini'
  );

  // Wait for both
  const [grokResult, geminiResult] = await Promise.all([grokPromise, geminiPromise]);

  // Determine status
  const grokOk = grokResult?.ok === true;
  const geminiOk = geminiResult?.ok === true;

  let status: Pass1Status;
  if (grokOk && geminiOk) {
    status = 'both_ok';
  } else if (grokOk) {
    status = 'grok_only';
  } else if (geminiOk) {
    status = 'gemini_only';
  } else {
    status = 'none_ok';
  }

  const totalLatencyMs = Date.now() - startTime;

  logger.info('🔄 Dual Engine: Execution complete', {
    status,
    grokLatencyMs: grokResult?.latencyMs,
    geminiLatencyMs: geminiResult?.latencyMs,
    totalLatencyMs,
  });

  return {
    grokResult,
    geminiResult,
    status,
    researchMode: 'DUAL',
    telemetry: {
      grokLatencyMs: grokResult?.latencyMs ?? null,
      geminiLatencyMs: geminiResult?.latencyMs ?? null,
      totalLatencyMs,
      grokRetries: grokResult?.attemptsUsed ? grokResult.attemptsUsed - 1 : 0,
      geminiRetries: geminiResult?.attemptsUsed ? geminiResult.attemptsUsed - 1 : 0,
      triggerReason: reason,
    },
  };
}

/**
 * Execute a promise with a timeout.
 */
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  engineName: string
): Promise<T | null> {
  try {
    const result = await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        setTimeout(() => {
          logger.warn(`🔄 Dual Engine: ${engineName} timed out after ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs);
      }),
    ]);
    return result;
  } catch (error: any) {
    logger.error(`🔄 Dual Engine: ${engineName} threw error`, { error: error.message });
    return null;
  }
}

// ============================================================================
// RESULT HELPERS
// ============================================================================

/**
 * Get the valid InsightPacks from a dual engine result.
 */
export function getValidInsightPacks(result: DualEngineResult): {
  grok: InsightPackV1 | null;
  gemini: InsightPackV1 | null;
  count: number;
} {
  const grok = result.grokResult?.ok ? result.grokResult.data : null;
  const gemini = result.geminiResult?.ok ? result.geminiResult.data : null;
  
  return {
    grok,
    gemini,
    count: (grok ? 1 : 0) + (gemini ? 1 : 0),
  };
}

/**
 * Check if dual engine result is suitable for aggregation.
 */
export function canAggregate(result: DualEngineResult): boolean {
  return result.status === 'both_ok';
}

/**
 * Get the single available InsightPack if only one engine succeeded.
 */
export function getSingleInsightPack(result: DualEngineResult): InsightPackV1 | null {
  if (result.grokResult?.ok) {
    return result.grokResult.data;
  }
  if (result.geminiResult?.ok) {
    return result.geminiResult.data;
  }
  return null;
}

// ============================================================================
// TELEMETRY HELPERS
// ============================================================================

export interface DualEngineTelemetry {
  mode: ResearchMode;
  status: Pass1Status;
  grokLatencyMs: number | null;
  geminiLatencyMs: number | null;
  totalLatencyMs: number;
  grokRetries: number;
  geminiRetries: number;
  grokSchemaValid: boolean;
  geminiSchemaValid: boolean;
  grokEvidencePointerPct: number;
  geminiEvidencePointerPct: number;
  unknownsCount: { grok: number; gemini: number };
}

/**
 * Extract telemetry from dual engine result.
 */
export function extractTelemetry(result: DualEngineResult): DualEngineTelemetry {
  const { grok, gemini } = getValidInsightPacks(result);

  // Calculate evidence pointer percentage
  const calculatePointerPct = (pack: InsightPackV1 | null): number => {
    if (!pack) return 0;
    const drivers = pack.drivers || [];
    if (drivers.length === 0) return 100;  // No drivers = 100% compliant
    const withPointers = drivers.filter(d => d.evidence_keys && d.evidence_keys.length > 0).length;
    return Math.round((withPointers / drivers.length) * 100);
  };

  return {
    mode: result.researchMode,
    status: result.status,
    grokLatencyMs: result.telemetry.grokLatencyMs,
    geminiLatencyMs: result.telemetry.geminiLatencyMs,
    totalLatencyMs: result.telemetry.totalLatencyMs,
    grokRetries: result.telemetry.grokRetries,
    geminiRetries: result.telemetry.geminiRetries,
    grokSchemaValid: result.grokResult?.ok === true,
    geminiSchemaValid: result.geminiResult?.ok === true,
    grokEvidencePointerPct: calculatePointerPct(grok),
    geminiEvidencePointerPct: calculatePointerPct(gemini),
    unknownsCount: {
      grok: grok?.unknowns?.length || 0,
      gemini: gemini?.unknowns?.length || 0,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DUAL_ENGINE_INTENTS,
  MINIMUM_COVERAGE_MODULES,
  DUAL_ENGINE_TIERS,
};
