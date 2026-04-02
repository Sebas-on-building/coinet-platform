/**
 * Builds a typed ReasoningContext from pipeline outputs.
 * This is the ONLY path for data to reach the LLM about quantum risk
 * and source governance state.
 *
 * Now bridges L1.0/L1.1 into the production loop by:
 * 1. Feeding health-monitor from real fetch results
 * 2. Building the L1 truth fingerprint from live health state
 * 3. Including it in the reasoning context the LLM receives
 */

import type { PipelineResult } from '../source-systems/classes/cryptographic-integrity/quantum-risk/pipeline';
import type { ReasoningContext, QuantumReasoningBlock, SystemStateBlock, TruthFingerprintBlock } from './types';
import { recordSuccess, recordFailure } from '../source-systems/health-monitor';
import { buildTruthFingerprint, formatFingerprintForAI } from '../source-systems/classes/truth-fingerprint-builder';

/**
 * Maps chat service fetch result names → source-systems provider IDs.
 * This is how L1 health-monitor learns what actually succeeded or failed.
 */
const FETCH_TO_PROVIDER: Record<string, string> = {
  marketData: 'coingecko',
  enterpriseMarketData: 'coinmarketcap',
  sentiment: 'lunarcrush',
  enrichedNews: 'cryptopanic',
  perpsData: 'coinglass',
  derivativesFinal: 'coinglass',
  derivativesV2: 'coinglass',
  comprehensiveDerivatives: 'coinglass',
  socialV2Result: 'lunarcrush',
  whaleContext: 'alchemy',
  csiResult: 'lunarcrush',
  socialIntel: 'twitter_api',
  influencerIntel: 'twitter_api_io',
  newsV2Result: 'cryptopanic',
};

/**
 * Maps chat fetch result names → L1.1 truth class names for fingerprint override.
 */
const FETCH_TO_TRUTH_CLASS: Record<string, string> = {
  marketData: 'market_surface',
  enterpriseMarketData: 'market_surface',
  sentiment: 'narrative_attention',
  enrichedNews: 'narrative_attention',
  perpsData: 'derivatives_pressure',
  derivativesFinal: 'derivatives_pressure',
  derivativesV2: 'derivatives_pressure',
  comprehensiveDerivatives: 'derivatives_pressure',
  socialV2Result: 'narrative_attention',
  whaleContext: 'onchain_behavior',
  csiResult: 'narrative_attention',
  socialIntel: 'narrative_attention',
  influencerIntel: 'entity_context',
  newsV2Result: 'narrative_attention',
};

/**
 * Feed L1 health-monitor from the chat service's real fetch results.
 * This bridges the gap between "L1 exists" and "L1 reflects production reality."
 */
export function syncHealthFromFetchResults(
  fetchResults: Record<string, { success: boolean; duration?: number; error?: string }>,
): void {
  for (const [key, result] of Object.entries(fetchResults)) {
    const providerId = FETCH_TO_PROVIDER[key];
    if (!providerId) continue;
    const latency = result.duration ?? 500;
    if (result.success) {
      recordSuccess(providerId, latency);
    } else {
      recordFailure(providerId, latency);
    }
  }
}

/**
 * Build L1.1 truth fingerprint from real fetch results.
 * Returns both the structured block for the reasoning context
 * and the formatted string for the LLM.
 */
export function buildTruthFingerprintFromFetches(
  fetchResults: Record<string, { success: boolean; error?: string }>,
): { block: TruthFingerprintBlock; formatted: string } {
  const classStrengths: Record<string, number> = {};
  const classSuccesses: Record<string, { total: number; succeeded: number }> = {};

  for (const [key, result] of Object.entries(fetchResults)) {
    const tc = FETCH_TO_TRUTH_CLASS[key];
    if (!tc) continue;
    if (!classSuccesses[tc]) classSuccesses[tc] = { total: 0, succeeded: 0 };
    classSuccesses[tc].total++;
    if (result.success) classSuccesses[tc].succeeded++;
  }

  for (const [tc, counts] of Object.entries(classSuccesses)) {
    classStrengths[tc] = counts.total > 0 ? counts.succeeded / counts.total : 0;
  }

  type Vis = 'healthy' | 'partial' | 'degraded' | 'stale_dominant' | 'blind';
  const overrideVisibilities: Record<string, Vis> = {};
  for (const tc of [
    'market_surface', 'dex_emergence', 'derivatives_pressure',
    'protocol_substance', 'onchain_behavior', 'structural_safety',
    'narrative_attention', 'entity_context', 'reasoning_expression',
  ]) {
    const strength = classStrengths[tc] ?? 0;
    if (strength >= 0.8) overrideVisibilities[tc] = 'healthy';
    else if (strength >= 0.5) overrideVisibilities[tc] = 'partial';
    else if (strength > 0) overrideVisibilities[tc] = 'degraded';
    else overrideVisibilities[tc] = 'blind';
  }

  overrideVisibilities['protocol_substance'] = overrideVisibilities['protocol_substance'] ?? 'blind';
  overrideVisibilities['structural_safety'] = overrideVisibilities['structural_safety'] ?? 'blind';
  overrideVisibilities['dex_emergence'] = overrideVisibilities['dex_emergence'] ?? 'blind';
  overrideVisibilities['reasoning_expression'] = 'healthy';

  const fingerprint = buildTruthFingerprint({
    classStrengths,
    overrideVisibilities: overrideVisibilities as any,
  });

  const entries: TruthFingerprintBlock['entries'] = fingerprint.entries.map(e => ({
    truth_class: e.truthClass,
    visibility: e.visibility,
    authority_level: e.authorityLevel,
  }));

  const blindSpots = fingerprint.blindSpots.filter(s => s !== 'reasoning_expression');

  return {
    block: {
      entries,
      blind_spots: blindSpots,
      tensions: fingerprint.tensionSummary,
      overall_coverage: fingerprint.overallCoverage,
    },
    formatted: formatFingerprintForAI(fingerprint),
  };
}

export function buildQuantumReasoningBlock(result: PipelineResult): QuantumReasoningBlock {
  const s = result.snapshot;
  return {
    score: s.score.value,
    state: s.judgment.state,
    confidence: s.judgment.confidence,
    prohibit_directional_claims: s.judgment.prohibit_directional_claims,
    explanation: s.judgment.explanation,

    exposure_pct: Math.round(s.features.key_exposure_rate.value * 1000) / 10,
    dormant_supply_btc: s.features.dormant_vulnerable_supply.base,
    migration_progress_pct: Math.round(s.features.pq_migration_progress.value * 100),

    components: {
      exposure: Math.round(s.score.components.exposure * 100) / 100,
      dormant: Math.round(s.score.components.dormant * 100) / 100,
      migration: Math.round(s.score.components.migration * 100) / 100,
    },

    scenarios: {
      fast_quantum: s.scenarios[0]?.triggered ?? false,
      slow_quantum: s.scenarios[1]?.triggered ?? false,
    },

    degradation: {
      state: result.degradation.state,
      missing_inputs: result.degradation.missing_inputs,
    },

    version: s.logic_version,
  };
}

export function buildSystemStateBlock(
  fetchResults: Record<string, { success: boolean; error?: string }>,
  truthFingerprint: TruthFingerprintBlock,
): SystemStateBlock {
  const entries = Object.entries(fetchResults);
  const available = entries.filter(([_, r]) => r.success).length;
  const failed = entries.filter(([_, r]) => !r.success).map(([n]) => n);

  return {
    sources_available: available,
    sources_total: entries.length,
    failed_sources: failed,
    degraded_domains: truthFingerprint.entries
      .filter(e => e.visibility === 'degraded' || e.visibility === 'partial')
      .map(e => e.truth_class),
    blind_domains: truthFingerprint.blind_spots,
    truth_fingerprint: truthFingerprint,
  };
}

export function buildReasoningContext(
  asset: string,
  quantumResult: PipelineResult | null,
  fetchResults: Record<string, { success: boolean; error?: string }>,
): ReasoningContext {
  syncHealthFromFetchResults(fetchResults as Record<string, { success: boolean; duration?: number; error?: string }>);

  const { block: truthFingerprint } = buildTruthFingerprintFromFetches(fetchResults);

  return {
    asset,
    timestamp: new Date().toISOString(),
    quantum: quantumResult ? buildQuantumReasoningBlock(quantumResult) : null,
    system_state: buildSystemStateBlock(fetchResults, truthFingerprint),
  };
}
