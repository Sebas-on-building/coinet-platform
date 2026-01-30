/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📦 EVIDENCE PACK v1 — PUBLIC API                                          ║
 * ║                                                                               ║
 * ║   The ONLY source of numeric truth for Pass-1 research engines.               ║
 * ║   Every module is timestamped, sourced, and freshness-scored.                 ║
 * ║   Missing/stale data is EXPLICIT, never silently ignored.                     ║
 * ║                                                                               ║
 * ║   USAGE:                                                                      ║
 * ║   ```typescript                                                               ║
 * ║   import { buildEvidencePack } from './evidence-pack';                        ║
 * ║                                                                               ║
 * ║   const result = await buildEvidencePack({                                    ║
 * ║     userMessage: "Why is BTC down today?",                                    ║
 * ║     language: "en",                                                           ║
 * ║     intent: "EXPLAIN_MOVE",                                                   ║
 * ║     inputEntities: ["BTC"],                                                   ║
 * ║   });                                                                         ║
 * ║                                                                               ║
 * ║   if (result.ok) {                                                            ║
 * ║     // result.pack contains the full EvidencePack                             ║
 * ║     // Pass to Grok/Gemini for insight generation                             ║
 * ║   }                                                                           ║
 * ║   ```                                                                         ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// CORE EXPORTS
// ============================================================================

// Main builder
export {
  buildEvidencePack,
  shouldBuildEvidencePack,
  getAvailableModules,
  getEvidenceSummaryForPrompt,
} from './builder';

// Token resolver
export {
  resolveTokenEntities,
  extractEntities,
  lookupCandidates,
  applyConfidenceGating,
  canReuseSessionToken,
  confirmToken,
  KNOWN_ASSETS,
  PATTERNS,
  type ExtractedEntities,
  type CandidateLookupResult,
  type ResolutionDecision,
  type ResolveTokensInput,
  type ResolveTokensOutput,
} from './resolver';

// Coverage computation
export {
  computeCoverage,
  computeQualityScore,
  calculateModuleFreshness,
  checkTimeCoherence,
  generateCoverageSummary,
  getConfidenceCapFromQuality,
  requiresUncertaintyDisclosure,
  MODULE_WEIGHTS,
  type ModuleFreshness,
  type CoverageAnalysis,
} from './coverage';

// Observability
export {
  emitTokenResolution,
  emitModuleResult,
  emitPackComplete,
  emitProviderError,
  flushMetrics,
  peekMetrics,
  trackPackBuild,
  getStats,
  resetStats,
  logPackSummary,
  type MetricData,
  type EvidencePackStats,
} from './observability';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export {
  // Version
  EVIDENCE_PACK_VERSION,
  
  // Enums
  EvidencePackKind,
  ModuleStatus,
  ResolutionMethod,
  ClarifierType,
  EvidenceIntent,
  Timeframe,
  ResponseDepth,
  
  // TTL Config
  MODULE_TTL_SECONDS,
  
  // Request
  EvidenceRequest,
  
  // Token Resolution
  TokenCandidate,
  ResolvedToken,
  TokenClarifier,
  TokenResolution,
  RESOLUTION_THRESHOLDS,
  
  // Evidence Modules
  EvidenceModuleBase,
  DexScreenerData,
  DexScreenerEvidence,
  SecurityFlag,
  SecurityData,
  SecurityEvidence,
  TopHolder,
  HoldersData,
  HoldersEvidence,
  SentimentData,
  SentimentEvidence,
  NewsItem,
  NewsData,
  NewsEvidence,
  DerivativesData,
  DerivativesEvidence,
  OnchainData,
  OnchainEvidence,
  MarketSnapshotData,
  MarketSnapshotEvidence,
  
  // Coverage
  CoverageMap,
  
  // Containers
  EvidenceModules,
  
  // Evidence Pack variants
  TokenEvidencePackSchema,
  MarketEvidencePackSchema,
  CombinedEvidencePackSchema,
  EvidencePackSchema,
  
  // Union types
  type EvidencePack,
  type TokenEvidencePack,
  type MarketEvidencePack,
  type CombinedEvidencePack,
  
  // Builder types
  type EvidencePackBuildOptions,
  type EvidencePackBuildResult,
  type EvidencePackBuildFailure,
  type EvidencePackBuildOutput,
  
  // Observability events
  type TokenResolutionEvent,
  type ModuleResultEvent,
  type PackCompleteEvent,
  type ProviderErrorEvent,
  type EvidenceObservabilityEvent,
  
  // Module selection
  getModulesForIntent,
} from './types';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

import { buildEvidencePack, shouldBuildEvidencePack } from './builder';
import { resolveTokenEntities } from './resolver';
import { computeCoverage, generateCoverageSummary } from './coverage';
import { getStats } from './observability';
import { 
  EvidencePack,
  EvidencePackBuildOptions,
  EvidencePackBuildOutput,
  EVIDENCE_PACK_VERSION,
} from './types';

/**
 * Quick check if a message needs Evidence Pack
 */
export function needsEvidence(message: string, intent: string): boolean {
  return shouldBuildEvidencePack(intent as any, message);
}

/**
 * Get version info
 */
export function getVersion(): string {
  return EVIDENCE_PACK_VERSION;
}

/**
 * Health check for the Evidence Pack system
 */
export function getEvidencePackHealth(): {
  version: string;
  stats: ReturnType<typeof getStats>;
  status: 'healthy' | 'degraded' | 'unhealthy';
} {
  const stats = getStats();
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  // Check for degradation
  if (stats.avgQualityScore < 0.5) {
    status = 'degraded';
  }
  if (stats.totalBuilds > 10 && stats.failedBuilds / stats.totalBuilds > 0.3) {
    status = 'unhealthy';
  }
  
  return {
    version: EVIDENCE_PACK_VERSION,
    stats,
    status,
  };
}

// Default export for convenience
export default {
  build: buildEvidencePack,
  needsEvidence,
  resolveTokens: resolveTokenEntities,
  computeCoverage,
  generateSummary: generateCoverageSummary,
  getHealth: getEvidencePackHealth,
  getVersion,
};
