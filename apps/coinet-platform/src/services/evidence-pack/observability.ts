/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 EVIDENCE PACK OBSERVABILITY — Structured Events & Metrics              ║
 * ║                                                                               ║
 * ║   Emits structured events for debugging and monitoring.                       ║
 * ║   Tracks resolution decisions, module results, and pack completions.          ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import {
  TokenResolutionEvent,
  ModuleResultEvent,
  PackCompleteEvent,
  ProviderErrorEvent,
  EvidenceObservabilityEvent,
  EvidencePackKind,
  ModuleStatus,
  ResolutionMethod,
} from './types';

// ============================================================================
// EVENT EMITTERS
// ============================================================================

/**
 * Emit token resolution decision event
 */
export function emitTokenResolution(
  inputEntities: string[],
  resolvedCount: number,
  confidence: number,
  margin: number,
  method: ResolutionMethod,
  reusedSession: boolean,
  clarifierGenerated: boolean
): void {
  const event: TokenResolutionEvent = {
    type: 'TOKEN_RESOLUTION_DECISION',
    timestamp: Date.now(),
    input_entities: inputEntities,
    resolved_count: resolvedCount,
    confidence,
    margin,
    method,
    reused_session: reusedSession,
    clarifier_generated: clarifierGenerated,
  };

  logger.debug('📍 Token resolution', event);
  
  // In production, emit to metrics system
  emitMetric('evidence.token_resolution', {
    resolved: resolvedCount > 0,
    confidence,
    margin,
    method,
    clarifier: clarifierGenerated,
  });
}

/**
 * Emit module fetch result event
 */
export function emitModuleResult(
  module: string,
  status: ModuleStatus,
  freshnessSeconds: number,
  latencyMs: number,
  errorCode?: string
): void {
  const event: ModuleResultEvent = {
    type: 'EVIDENCE_MODULE_RESULT',
    timestamp: Date.now(),
    module,
    status,
    freshness_seconds: freshnessSeconds,
    latency_ms: latencyMs,
    error_code: errorCode,
  };

  logger.debug(`📦 Module result: ${module}`, event);

  emitMetric('evidence.module_fetch', {
    module,
    status,
    latency_ms: latencyMs,
    has_error: !!errorCode,
  });
}

/**
 * Emit pack completion event
 */
export function emitPackComplete(
  kind: EvidencePackKind,
  availableModules: string[],
  missingModules: string[],
  qualityScore: number,
  totalLatencyMs: number
): void {
  const event: PackCompleteEvent = {
    type: 'EVIDENCE_PACK_COMPLETE',
    timestamp: Date.now(),
    kind,
    available_modules: availableModules,
    missing_modules: missingModules,
    quality_score: qualityScore,
    total_latency_ms: totalLatencyMs,
  };

  logger.info('📦 Evidence Pack complete', event);

  emitMetric('evidence.pack_complete', {
    kind,
    available_count: availableModules.length,
    missing_count: missingModules.length,
    quality_score: qualityScore,
    latency_ms: totalLatencyMs,
  });
}

/**
 * Emit provider error event
 */
export function emitProviderError(
  provider: string,
  module: string,
  errorCode: string,
  isRateLimit: boolean
): void {
  const event: ProviderErrorEvent = {
    type: 'PROVIDER_ERROR',
    timestamp: Date.now(),
    provider,
    module,
    error_code: errorCode,
    is_rate_limit: isRateLimit,
  };

  logger.warn(`⚠️ Provider error: ${provider}/${module}`, event);

  emitMetric('evidence.provider_error', {
    provider,
    module,
    error_code: errorCode,
    rate_limit: isRateLimit,
  });
}

// ============================================================================
// METRICS AGGREGATION
// ============================================================================

interface MetricData {
  name: string;
  value: number | Record<string, any>;
  timestamp: number;
}

const metricsBuffer: MetricData[] = [];
const METRICS_BUFFER_SIZE = 100;

/**
 * Emit a metric (buffered for batch sending)
 */
function emitMetric(name: string, value: Record<string, any>): void {
  metricsBuffer.push({
    name,
    value,
    timestamp: Date.now(),
  });

  // Trim buffer if too large
  if (metricsBuffer.length > METRICS_BUFFER_SIZE) {
    metricsBuffer.shift();
  }
}

/**
 * Get and clear buffered metrics
 */
export function flushMetrics(): MetricData[] {
  const metrics = [...metricsBuffer];
  metricsBuffer.length = 0;
  return metrics;
}

/**
 * Get current metrics without clearing
 */
export function peekMetrics(): MetricData[] {
  return [...metricsBuffer];
}

// ============================================================================
// STATISTICS TRACKING
// ============================================================================

interface EvidencePackStats {
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  avgQualityScore: number;
  avgLatencyMs: number;
  moduleSuccessRates: Record<string, number>;
  clarifierRate: number;
  topMissingModules: string[];
}

const stats: EvidencePackStats = {
  totalBuilds: 0,
  successfulBuilds: 0,
  failedBuilds: 0,
  avgQualityScore: 0,
  avgLatencyMs: 0,
  moduleSuccessRates: {},
  clarifierRate: 0,
  topMissingModules: [],
};

const moduleAttempts: Record<string, number> = {};
const moduleSuccesses: Record<string, number> = {};
const missingModuleCounts: Record<string, number> = {};
let clarifierCount = 0;
let totalResolutions = 0;

/**
 * Track a pack build completion
 */
export function trackPackBuild(
  success: boolean,
  qualityScore: number,
  latencyMs: number,
  availableModules: string[],
  missingModules: string[],
  clarifierGenerated: boolean
): void {
  stats.totalBuilds++;
  
  if (success) {
    stats.successfulBuilds++;
  } else {
    stats.failedBuilds++;
  }

  // Update rolling averages
  const n = stats.totalBuilds;
  stats.avgQualityScore = ((stats.avgQualityScore * (n - 1)) + qualityScore) / n;
  stats.avgLatencyMs = ((stats.avgLatencyMs * (n - 1)) + latencyMs) / n;

  // Track module success rates
  for (const mod of availableModules) {
    moduleAttempts[mod] = (moduleAttempts[mod] || 0) + 1;
    moduleSuccesses[mod] = (moduleSuccesses[mod] || 0) + 1;
  }
  for (const mod of missingModules) {
    moduleAttempts[mod] = (moduleAttempts[mod] || 0) + 1;
    missingModuleCounts[mod] = (missingModuleCounts[mod] || 0) + 1;
  }

  // Update module success rates
  for (const mod of Object.keys(moduleAttempts)) {
    stats.moduleSuccessRates[mod] = (moduleSuccesses[mod] || 0) / moduleAttempts[mod];
  }

  // Track clarifier rate
  totalResolutions++;
  if (clarifierGenerated) {
    clarifierCount++;
  }
  stats.clarifierRate = clarifierCount / totalResolutions;

  // Update top missing modules
  stats.topMissingModules = Object.entries(missingModuleCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([mod]) => mod);
}

/**
 * Get current statistics
 */
export function getStats(): EvidencePackStats {
  return { ...stats };
}

/**
 * Reset statistics (for testing)
 */
export function resetStats(): void {
  stats.totalBuilds = 0;
  stats.successfulBuilds = 0;
  stats.failedBuilds = 0;
  stats.avgQualityScore = 0;
  stats.avgLatencyMs = 0;
  stats.moduleSuccessRates = {};
  stats.clarifierRate = 0;
  stats.topMissingModules = [];
  
  Object.keys(moduleAttempts).forEach(k => delete moduleAttempts[k]);
  Object.keys(moduleSuccesses).forEach(k => delete moduleSuccesses[k]);
  Object.keys(missingModuleCounts).forEach(k => delete missingModuleCounts[k]);
  clarifierCount = 0;
  totalResolutions = 0;
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Log a detailed Evidence Pack summary
 */
export function logPackSummary(
  pack: {
    kind: string;
    coverage: {
      available: string[];
      missing: string[];
      stale: string[];
      errors: string[];
      quality_score: number;
    };
    token_resolution: {
      resolved: any[];
      clarifier: any;
    };
  },
  latencyMs: number
): void {
  const tokenInfo = pack.token_resolution.resolved[0];
  
  logger.info('📦 Evidence Pack Summary', {
    kind: pack.kind,
    token: tokenInfo ? `${tokenInfo.symbol} (${tokenInfo.chain})` : 'none',
    tokenConfidence: tokenInfo?.confidence,
    available: pack.coverage.available.join(', ') || 'none',
    missing: pack.coverage.missing.join(', ') || 'none',
    stale: pack.coverage.stale.join(', ') || 'none',
    errors: pack.coverage.errors.join(', ') || 'none',
    quality: `${Math.round(pack.coverage.quality_score * 100)}%`,
    latency: `${latencyMs}ms`,
    hasClarifier: !!pack.token_resolution.clarifier,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  MetricData,
  EvidencePackStats,
};
