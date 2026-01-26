/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 INSIGHT PACK — OBSERVABILITY                                           ║
 * ║                                                                               ║
 * ║   Structured event emission for Pass-1 Grok enforcement.                      ║
 * ║   Every decision and failure is logged with context.                          ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { ConfidenceLevel } from './types';

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface Pass1RawReceivedEvent {
  type: 'PASS1_GROK_RAW_RECEIVED';
  ts: number;
  payload: {
    bytes: number;
    latencyMs: number;
  };
}

export interface Pass1ParseAttemptEvent {
  type: 'PASS1_GROK_PARSE_ATTEMPT';
  ts: number;
  payload: {
    strategy: 'raw' | 'fenced' | 'locate_braces';
    success: boolean;
  };
}

export interface Pass1SchemaFailEvent {
  type: 'PASS1_GROK_SCHEMA_FAIL';
  ts: number;
  payload: {
    errors: string[];
    attempt: number;
  };
}

export interface Pass1EvidenceKeyFailEvent {
  type: 'PASS1_GROK_EVIDENCE_KEY_FAIL';
  ts: number;
  payload: {
    key: string;
    attempt: number;
    fieldPath: string;
  };
}

export interface Pass1DegradedEvent {
  type: 'PASS1_GROK_DEGRADED';
  ts: number;
  payload: {
    removedItemsCount: number;
    demotionsCount: number;
  };
}

export interface Pass1SuccessEvent {
  type: 'PASS1_GROK_SUCCESS';
  ts: number;
  payload: {
    attempt: number;
    degraded: boolean;
    driversCount: number;
    risksCount: number;
    confidence: ConfidenceLevel;
  };
}

export interface Pass1TimeoutEvent {
  type: 'PASS1_GROK_TIMEOUT';
  ts: number;
  payload: {
    attempt: number;
    timeoutMs: number;
  };
}

export interface Pass1RetryEvent {
  type: 'PASS1_GROK_RETRY';
  ts: number;
  payload: {
    attempt: number;
    maxRetries: number;
    reason: string;
    errorCount: number;
  };
}

export interface Pass1MissingEvent {
  type: 'PASS1_GROK_MISSING';
  ts: number;
  payload: {
    attemptsUsed: number;
    reason: string;
    willFallback: boolean;
  };
}

export type InsightPackEvent =
  | Pass1RawReceivedEvent
  | Pass1ParseAttemptEvent
  | Pass1SchemaFailEvent
  | Pass1EvidenceKeyFailEvent
  | Pass1DegradedEvent
  | Pass1SuccessEvent
  | Pass1TimeoutEvent
  | Pass1RetryEvent
  | Pass1MissingEvent;

// ============================================================================
// EVENT EMITTER
// ============================================================================

class InsightPackEventEmitter {
  private emitter = new EventEmitter();
  private recentEvents: InsightPackEvent[] = [];
  private maxRecentEvents = 100;

  emit(event: InsightPackEvent): void {
    // Store in recent buffer
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }

    // Structured log
    switch (event.type) {
      case 'PASS1_GROK_RAW_RECEIVED':
        logger.debug(`📊 ${event.type}`, {
          bytes: event.payload.bytes,
          latencyMs: event.payload.latencyMs,
        });
        break;

      case 'PASS1_GROK_PARSE_ATTEMPT':
        logger.debug(`📊 ${event.type}`, {
          strategy: event.payload.strategy,
          success: event.payload.success,
        });
        break;

      case 'PASS1_GROK_SCHEMA_FAIL':
        logger.warn(`📊 ${event.type}`, {
          errorCount: event.payload.errors.length,
          errors: event.payload.errors.slice(0, 3),
          attempt: event.payload.attempt,
        });
        break;

      case 'PASS1_GROK_EVIDENCE_KEY_FAIL':
        logger.warn(`📊 ${event.type}`, {
          key: event.payload.key,
          fieldPath: event.payload.fieldPath,
          attempt: event.payload.attempt,
        });
        break;

      case 'PASS1_GROK_DEGRADED':
        logger.warn(`📊 ${event.type}`, {
          removedItemsCount: event.payload.removedItemsCount,
          demotionsCount: event.payload.demotionsCount,
        });
        break;

      case 'PASS1_GROK_SUCCESS':
        logger.info(`📊 ${event.type}`, {
          attempt: event.payload.attempt,
          degraded: event.payload.degraded,
          drivers: event.payload.driversCount,
          risks: event.payload.risksCount,
          confidence: event.payload.confidence,
        });
        break;

      case 'PASS1_GROK_TIMEOUT':
        logger.error(`📊 ${event.type}`, {
          attempt: event.payload.attempt,
          timeoutMs: event.payload.timeoutMs,
        });
        break;

      case 'PASS1_GROK_RETRY':
        logger.info(`📊 ${event.type}`, {
          attempt: event.payload.attempt,
          maxRetries: event.payload.maxRetries,
          reason: event.payload.reason,
          errorCount: event.payload.errorCount,
        });
        break;

      case 'PASS1_GROK_MISSING':
        logger.error(`📊 ${event.type}`, {
          attemptsUsed: event.payload.attemptsUsed,
          reason: event.payload.reason,
          willFallback: event.payload.willFallback,
        });
        break;
    }

    // Emit for external listeners
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  on(eventType: string, callback: (event: InsightPackEvent) => void): void {
    this.emitter.on(eventType, callback);
  }

  off(eventType: string, callback: (event: InsightPackEvent) => void): void {
    this.emitter.off(eventType, callback);
  }

  getRecentEvents(limit = 50): InsightPackEvent[] {
    return this.recentEvents.slice(-limit);
  }
}

export const insightPackEventEmitter = new InsightPackEventEmitter();

// ============================================================================
// CONVENIENCE EMIT FUNCTIONS
// ============================================================================

export function emitRawReceived(bytes: number, latencyMs: number): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_RAW_RECEIVED',
    ts: Date.now(),
    payload: { bytes, latencyMs },
  });
}

export function emitParseAttempt(
  strategy: 'raw' | 'fenced' | 'locate_braces',
  success: boolean
): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_PARSE_ATTEMPT',
    ts: Date.now(),
    payload: { strategy, success },
  });
}

export function emitSchemaFail(errors: string[], attempt: number): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_SCHEMA_FAIL',
    ts: Date.now(),
    payload: { errors, attempt },
  });
}

export function emitEvidenceKeyFail(key: string, attempt: number, fieldPath: string): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_EVIDENCE_KEY_FAIL',
    ts: Date.now(),
    payload: { key, attempt, fieldPath },
  });
}

export function emitDegraded(removedItemsCount: number, demotionsCount: number): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_DEGRADED',
    ts: Date.now(),
    payload: { removedItemsCount, demotionsCount },
  });
}

export function emitSuccess(
  attempt: number,
  degraded: boolean,
  driversCount: number,
  risksCount: number,
  confidence: ConfidenceLevel
): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_SUCCESS',
    ts: Date.now(),
    payload: { attempt, degraded, driversCount, risksCount, confidence },
  });
}

export function emitTimeout(attempt: number, timeoutMs: number): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_TIMEOUT',
    ts: Date.now(),
    payload: { attempt, timeoutMs },
  });
}

export function emitRetry(
  attempt: number,
  maxRetries: number,
  reason: string,
  errorCount: number
): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_RETRY',
    ts: Date.now(),
    payload: { attempt, maxRetries, reason, errorCount },
  });
}

export function emitMissing(
  attemptsUsed: number,
  reason: string,
  willFallback: boolean
): void {
  insightPackEventEmitter.emit({
    type: 'PASS1_GROK_MISSING',
    ts: Date.now(),
    payload: { attemptsUsed, reason, willFallback },
  });
}

// ============================================================================
// METRICS
// ============================================================================

export interface InsightPackMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  degradedCount: number;
  avgAttempts: number;
  schemaFailRate: number;
  evidenceKeyFailRate: number;
  timeoutRate: number;
  confidenceDistribution: Record<ConfidenceLevel, number>;
}

export function aggregateInsightPackMetrics(
  events: InsightPackEvent[]
): InsightPackMetrics {
  const successes = events.filter(
    (e): e is Pass1SuccessEvent => e.type === 'PASS1_GROK_SUCCESS'
  );
  const failures = events.filter(
    (e): e is Pass1SchemaFailEvent => e.type === 'PASS1_GROK_SCHEMA_FAIL'
  );
  const timeouts = events.filter(
    (e): e is Pass1TimeoutEvent => e.type === 'PASS1_GROK_TIMEOUT'
  );
  const evidenceKeyFails = events.filter(
    (e): e is Pass1EvidenceKeyFailEvent => e.type === 'PASS1_GROK_EVIDENCE_KEY_FAIL'
  );

  const totalRequests = successes.length + 
    events.filter((e): e is Pass1MissingEvent => e.type === 'PASS1_GROK_MISSING').length;

  const avgAttempts = successes.length > 0
    ? successes.reduce((a, b) => a + b.payload.attempt, 0) / successes.length
    : 0;

  const confidenceDistribution: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const s of successes) {
    confidenceDistribution[s.payload.confidence]++;
  }

  return {
    totalRequests,
    successCount: successes.length,
    failureCount: events.filter(e => e.type === 'PASS1_GROK_MISSING').length,
    degradedCount: successes.filter(s => s.payload.degraded).length,
    avgAttempts,
    schemaFailRate: totalRequests > 0 ? failures.length / totalRequests : 0,
    evidenceKeyFailRate: totalRequests > 0 ? evidenceKeyFails.length / totalRequests : 0,
    timeoutRate: totalRequests > 0 ? timeouts.length / totalRequests : 0,
    confidenceDistribution,
  };
}
