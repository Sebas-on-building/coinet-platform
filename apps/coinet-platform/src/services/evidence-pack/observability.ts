/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 EVIDENCE PACK — OBSERVABILITY                                          ║
 * ║                                                                               ║
 * ║   Structured event emission for debugging and monitoring.                     ║
 * ║   Every decision and failure is logged with context.                          ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import {
  EvidencePackKind,
  ResolutionStatus,
  BudgetTier,
  ModuleStatus,
  EligibilityDecision,
  CoverageMap,
} from './types';

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface EvidenceEligibilityDecisionEvent {
  type: 'EVIDENCE_ELIGIBILITY_DECISION';
  ts: number;
  payload: {
    eligible: boolean;
    kind: EvidencePackKind | 'NONE';
    reason: string;
    intent: string;
    token_entities_count: number;
    resolution_status: ResolutionStatus | 'NOT_REQUIRED';
    user_message_preview: string;
  };
}

export interface EvidencePackPlannedEvent {
  type: 'EVIDENCE_PACK_PLANNED';
  ts: number;
  payload: {
    planned_modules: string[];
    budget_tier: BudgetTier;
    kind: EvidencePackKind;
    resolution_status: ResolutionStatus;
    token_ref?: string;
    chain?: string;
  };
}

export interface EvidenceModuleFetchResultEvent {
  type: 'EVIDENCE_MODULE_FETCH_RESULT';
  ts: number;
  payload: {
    module: string;
    status: ModuleStatus;
    latency_ms: number;
    error_code?: string;
    error_message?: string;
    freshness_seconds?: number;
    from_cache: boolean;
  };
}

export interface EvidencePackCompleteEvent {
  type: 'EVIDENCE_PACK_COMPLETE';
  ts: number;
  payload: {
    kind: EvidencePackKind;
    available: string[];
    missing: string[];
    staleness_max_seconds: number;
    total_latency_ms: number;
    resolution_status: ResolutionStatus;
    budget_tier: BudgetTier;
  };
}

export interface EvidenceResolutionEvent {
  type: 'EVIDENCE_RESOLUTION';
  ts: number;
  payload: {
    status: ResolutionStatus;
    token_ref: string;
    candidates_count: number;
    primary_confidence?: number;
    primary_chain?: string;
    clarification_needed: boolean;
    source: string;
  };
}

export interface EvidenceCacheEvent {
  type: 'EVIDENCE_CACHE';
  ts: number;
  payload: {
    action: 'hit' | 'miss' | 'stale' | 'set' | 'invalidate';
    module: string;
    cache_key: string;
    age_seconds?: number;
    ttl_seconds?: number;
  };
}

export type EvidenceEvent =
  | EvidenceEligibilityDecisionEvent
  | EvidencePackPlannedEvent
  | EvidenceModuleFetchResultEvent
  | EvidencePackCompleteEvent
  | EvidenceResolutionEvent
  | EvidenceCacheEvent;

// ============================================================================
// EVENT EMITTER SINGLETON
// ============================================================================

class EvidenceEventEmitter {
  private emitter = new EventEmitter();
  private recentEvents: EvidenceEvent[] = [];
  private maxRecentEvents = 100;

  emit(event: EvidenceEvent): void {
    // Store in recent buffer
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }

    // Structured log based on event type
    switch (event.type) {
      case 'EVIDENCE_ELIGIBILITY_DECISION':
        logger.info(`📊 ${event.type}`, {
          eligible: event.payload.eligible,
          kind: event.payload.kind,
          reason: event.payload.reason,
          intent: event.payload.intent,
          tokenCount: event.payload.token_entities_count,
        });
        break;

      case 'EVIDENCE_PACK_PLANNED':
        logger.info(`📊 ${event.type}`, {
          modules: event.payload.planned_modules.join(', '),
          budget: event.payload.budget_tier,
          kind: event.payload.kind,
          tokenRef: event.payload.token_ref,
        });
        break;

      case 'EVIDENCE_MODULE_FETCH_RESULT':
        if (event.payload.status === 'success') {
          logger.debug(`📊 ${event.type}`, {
            module: event.payload.module,
            status: event.payload.status,
            latencyMs: event.payload.latency_ms,
            fromCache: event.payload.from_cache,
          });
        } else {
          logger.warn(`📊 ${event.type}`, {
            module: event.payload.module,
            status: event.payload.status,
            latencyMs: event.payload.latency_ms,
            errorCode: event.payload.error_code,
          });
        }
        break;

      case 'EVIDENCE_PACK_COMPLETE':
        logger.info(`📊 ${event.type}`, {
          kind: event.payload.kind,
          available: event.payload.available.length,
          missing: event.payload.missing.length,
          totalLatencyMs: event.payload.total_latency_ms,
          resolutionStatus: event.payload.resolution_status,
        });
        break;

      case 'EVIDENCE_RESOLUTION':
        logger.info(`📊 ${event.type}`, {
          status: event.payload.status,
          tokenRef: event.payload.token_ref,
          candidates: event.payload.candidates_count,
          confidence: event.payload.primary_confidence,
          clarificationNeeded: event.payload.clarification_needed,
        });
        break;

      case 'EVIDENCE_CACHE':
        logger.debug(`📊 ${event.type}`, event.payload);
        break;
    }

    // Emit for external listeners
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  on(eventType: string, callback: (event: EvidenceEvent) => void): void {
    this.emitter.on(eventType, callback);
  }

  off(eventType: string, callback: (event: EvidenceEvent) => void): void {
    this.emitter.off(eventType, callback);
  }

  getRecentEvents(limit = 50): EvidenceEvent[] {
    return this.recentEvents.slice(-limit);
  }

  getRecentEventsByType(type: EvidenceEvent['type'], limit = 20): EvidenceEvent[] {
    return this.recentEvents
      .filter(e => e.type === type)
      .slice(-limit);
  }
}

export const evidenceEventEmitter = new EvidenceEventEmitter();

// ============================================================================
// CONVENIENCE EMIT FUNCTIONS
// ============================================================================

export function emitEligibilityDecision(decision: EligibilityDecision, userMessage: string): void {
  evidenceEventEmitter.emit({
    type: 'EVIDENCE_ELIGIBILITY_DECISION',
    ts: Date.now(),
    payload: {
      eligible: decision.eligible,
      kind: decision.kind,
      reason: decision.reason,
      intent: decision.detectedIntent,
      token_entities_count: decision.tokenEntitiesCount,
      resolution_status: decision.resolutionStatus,
      user_message_preview: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
    },
  });
}

export function emitPackPlanned(
  plannedModules: string[],
  budgetTier: BudgetTier,
  kind: EvidencePackKind,
  resolutionStatus: ResolutionStatus,
  tokenRef?: string,
  chain?: string
): void {
  evidenceEventEmitter.emit({
    type: 'EVIDENCE_PACK_PLANNED',
    ts: Date.now(),
    payload: {
      planned_modules: plannedModules,
      budget_tier: budgetTier,
      kind,
      resolution_status: resolutionStatus,
      token_ref: tokenRef,
      chain,
    },
  });
}

export function emitModuleFetchResult(
  module: string,
  status: ModuleStatus,
  latencyMs: number,
  fromCache: boolean,
  errorCode?: string,
  errorMessage?: string,
  freshnessSeconds?: number
): void {
  evidenceEventEmitter.emit({
    type: 'EVIDENCE_MODULE_FETCH_RESULT',
    ts: Date.now(),
    payload: {
      module,
      status,
      latency_ms: latencyMs,
      error_code: errorCode,
      error_message: errorMessage,
      freshness_seconds: freshnessSeconds,
      from_cache: fromCache,
    },
  });
}

export function emitPackComplete(coverage: CoverageMap, resolutionStatus: ResolutionStatus): void {
  const freshnessValues = Object.values(coverage.freshness_seconds);
  const stalenessMax = freshnessValues.length > 0 ? Math.max(...freshnessValues) : 0;

  evidenceEventEmitter.emit({
    type: 'EVIDENCE_PACK_COMPLETE',
    ts: Date.now(),
    payload: {
      kind: coverage.kind,
      available: coverage.available,
      missing: coverage.missing,
      staleness_max_seconds: stalenessMax,
      total_latency_ms: coverage.total_latency_ms,
      resolution_status: resolutionStatus,
      budget_tier: coverage.used_budget_tier,
    },
  });
}

export function emitResolution(
  status: ResolutionStatus,
  tokenRef: string,
  candidatesCount: number,
  primaryConfidence?: number,
  primaryChain?: string,
  source = 'unknown'
): void {
  evidenceEventEmitter.emit({
    type: 'EVIDENCE_RESOLUTION',
    ts: Date.now(),
    payload: {
      status,
      token_ref: tokenRef,
      candidates_count: candidatesCount,
      primary_confidence: primaryConfidence,
      primary_chain: primaryChain,
      clarification_needed: status === 'NEEDS_CONFIRMATION',
      source,
    },
  });
}

export function emitCacheEvent(
  action: 'hit' | 'miss' | 'stale' | 'set' | 'invalidate',
  module: string,
  cacheKey: string,
  ageSeconds?: number,
  ttlSeconds?: number
): void {
  evidenceEventEmitter.emit({
    type: 'EVIDENCE_CACHE',
    ts: Date.now(),
    payload: {
      action,
      module,
      cache_key: cacheKey,
      age_seconds: ageSeconds,
      ttl_seconds: ttlSeconds,
    },
  });
}

// ============================================================================
// METRICS AGGREGATION (for dashboards)
// ============================================================================

export interface EvidenceMetrics {
  eligibility: {
    total: number;
    eligible: number;
    rate: number;
    byKind: Record<string, number>;
    byReason: Record<string, number>;
  };
  modules: {
    total: number;
    success: number;
    failed: number;
    timeout: number;
    cached: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  };
  resolution: {
    total: number;
    confirmed: number;
    needsConfirmation: number;
    avgConfidence: number;
  };
  packs: {
    total: number;
    token: number;
    market: number;
    both: number;
    avgLatencyMs: number;
    avgModulesAvailable: number;
    avgModulesMissing: number;
  };
}

export function aggregateMetrics(events: EvidenceEvent[]): EvidenceMetrics {
  const eligibilityEvents = events.filter(
    (e): e is EvidenceEligibilityDecisionEvent => e.type === 'EVIDENCE_ELIGIBILITY_DECISION'
  );
  const moduleFetchEvents = events.filter(
    (e): e is EvidenceModuleFetchResultEvent => e.type === 'EVIDENCE_MODULE_FETCH_RESULT'
  );
  const resolutionEvents = events.filter(
    (e): e is EvidenceResolutionEvent => e.type === 'EVIDENCE_RESOLUTION'
  );
  const packCompleteEvents = events.filter(
    (e): e is EvidencePackCompleteEvent => e.type === 'EVIDENCE_PACK_COMPLETE'
  );

  // Eligibility metrics
  const eligibleCount = eligibilityEvents.filter(e => e.payload.eligible).length;
  const byKind: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  for (const e of eligibilityEvents) {
    byKind[e.payload.kind] = (byKind[e.payload.kind] || 0) + 1;
    byReason[e.payload.reason] = (byReason[e.payload.reason] || 0) + 1;
  }

  // Module metrics
  const latencies = moduleFetchEvents.map(e => e.payload.latency_ms);
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);

  // Resolution metrics
  const confirmedResolutions = resolutionEvents.filter(e => e.payload.status === 'CONFIRMED');
  const needsConfirmationResolutions = resolutionEvents.filter(
    e => e.payload.status === 'NEEDS_CONFIRMATION'
  );
  const confidences = resolutionEvents
    .filter(e => e.payload.primary_confidence !== undefined)
    .map(e => e.payload.primary_confidence!);

  // Pack metrics
  const tokenPacks = packCompleteEvents.filter(e => e.payload.kind === 'TOKEN');
  const marketPacks = packCompleteEvents.filter(e => e.payload.kind === 'MARKET');
  const bothPacks = packCompleteEvents.filter(e => e.payload.kind === 'BOTH');

  return {
    eligibility: {
      total: eligibilityEvents.length,
      eligible: eligibleCount,
      rate: eligibilityEvents.length > 0 ? eligibleCount / eligibilityEvents.length : 0,
      byKind,
      byReason,
    },
    modules: {
      total: moduleFetchEvents.length,
      success: moduleFetchEvents.filter(e => e.payload.status === 'success').length,
      failed: moduleFetchEvents.filter(e => e.payload.status === 'failed').length,
      timeout: moduleFetchEvents.filter(e => e.payload.status === 'timeout').length,
      cached: moduleFetchEvents.filter(e => e.payload.from_cache).length,
      avgLatencyMs:
        latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p95LatencyMs: sortedLatencies[p95Index] || 0,
    },
    resolution: {
      total: resolutionEvents.length,
      confirmed: confirmedResolutions.length,
      needsConfirmation: needsConfirmationResolutions.length,
      avgConfidence:
        confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
    },
    packs: {
      total: packCompleteEvents.length,
      token: tokenPacks.length,
      market: marketPacks.length,
      both: bothPacks.length,
      avgLatencyMs:
        packCompleteEvents.length > 0
          ? packCompleteEvents.reduce((a, b) => a + b.payload.total_latency_ms, 0) /
            packCompleteEvents.length
          : 0,
      avgModulesAvailable:
        packCompleteEvents.length > 0
          ? packCompleteEvents.reduce((a, b) => a + b.payload.available.length, 0) /
            packCompleteEvents.length
          : 0,
      avgModulesMissing:
        packCompleteEvents.length > 0
          ? packCompleteEvents.reduce((a, b) => a + b.payload.missing.length, 0) /
            packCompleteEvents.length
          : 0,
    },
  };
}
