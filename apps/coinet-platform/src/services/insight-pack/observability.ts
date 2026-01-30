/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 INSIGHT PACK OBSERVABILITY — Structured Events & Metrics               ║
 * ║                                                                               ║
 * ║   Emits structured events for debugging Pass-1 enforcement.                   ║
 * ║   Tracks parsing, validation, retries, and success/failure rates.             ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

// ============================================================================
// EVENT EMITTER
// ============================================================================

export const insightPackEventEmitter = new EventEmitter();

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface Pass1RawReceivedEvent {
  type: 'RAW_RECEIVED';
  timestamp: number;
  length: number;
  latencyMs: number;
}

export interface Pass1ParseAttemptEvent {
  type: 'PARSE_ATTEMPT';
  timestamp: number;
  attempt: number;
  success: boolean;
  errorType?: string;
}

export interface Pass1SchemaFailEvent {
  type: 'SCHEMA_FAIL';
  timestamp: number;
  attempt: number;
  errors: string[];
  rawExcerpt: string;
}

export interface Pass1EvidenceKeyFailEvent {
  type: 'EVIDENCE_KEY_FAIL';
  timestamp: number;
  invalidKeys: string[];
  missingModules: string[];
}

export interface Pass1DegradedEvent {
  type: 'DEGRADED';
  timestamp: number;
  demotedCount: number;
  warnings: string[];
}

export interface Pass1SuccessEvent {
  type: 'SUCCESS';
  timestamp: number;
  attemptsUsed: number;
  degraded: boolean;
  latencyMs: number;
}

export interface Pass1TimeoutEvent {
  type: 'TIMEOUT';
  timestamp: number;
  attempt: number;
  timeoutMs: number;
}

export interface Pass1RetryEvent {
  type: 'RETRY';
  timestamp: number;
  attempt: number;
  maxAttempts: number;
  reason: string;
  errorCount: number;
}

export interface Pass1MissingEvent {
  type: 'MISSING';
  timestamp: number;
  attemptsUsed: number;
  reason: string;
  hadPartialSuccess: boolean;
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
// EVENT EMITTERS
// ============================================================================

export function emitRawReceived(length: number, latencyMs: number): void {
  const event: Pass1RawReceivedEvent = {
    type: 'RAW_RECEIVED',
    timestamp: Date.now(),
    length,
    latencyMs,
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.debug('🧠 Pass-1 raw received', { length, latencyMs });
}

export function emitParseAttempt(
  attempt: number,
  success: boolean,
  errorType?: string
): void {
  const event: Pass1ParseAttemptEvent = {
    type: 'PARSE_ATTEMPT',
    timestamp: Date.now(),
    attempt,
    success,
    errorType,
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.debug('🧠 Pass-1 parse attempt', { attempt, success, errorType });
}

export function emitSchemaFail(
  attempt: number,
  errors: string[],
  rawExcerpt: string
): void {
  const event: Pass1SchemaFailEvent = {
    type: 'SCHEMA_FAIL',
    timestamp: Date.now(),
    attempt,
    errors,
    rawExcerpt: rawExcerpt.slice(0, 500),
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.warn('🧠 Pass-1 schema fail', { attempt, errorCount: errors.length });
}

export function emitEvidenceKeyFail(
  invalidKeys: string[],
  missingModules: string[]
): void {
  const event: Pass1EvidenceKeyFailEvent = {
    type: 'EVIDENCE_KEY_FAIL',
    timestamp: Date.now(),
    invalidKeys,
    missingModules,
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.warn('🧠 Pass-1 evidence key fail', { invalidKeys, missingModules });
}

export function emitDegraded(demotedCount: number, warnings: string[]): void {
  const event: Pass1DegradedEvent = {
    type: 'DEGRADED',
    timestamp: Date.now(),
    demotedCount,
    warnings,
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.info('🧠 Pass-1 degraded', { demotedCount, warnings });
}

export function emitSuccess(
  attemptsUsed: number,
  degraded: boolean,
  latencyMs: number
): void {
  const event: Pass1SuccessEvent = {
    type: 'SUCCESS',
    timestamp: Date.now(),
    attemptsUsed,
    degraded,
    latencyMs,
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.info('🧠 Pass-1 success', { attemptsUsed, degraded, latencyMs });
}

export function emitTimeout(attempt: number, timeoutMs: number): void {
  const event: Pass1TimeoutEvent = {
    type: 'TIMEOUT',
    timestamp: Date.now(),
    attempt,
    timeoutMs,
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.warn('🧠 Pass-1 timeout', { attempt, timeoutMs });
}

export function emitRetry(
  attempt: number,
  maxAttempts: number,
  reason: string,
  errorCount: number
): void {
  const event: Pass1RetryEvent = {
    type: 'RETRY',
    timestamp: Date.now(),
    attempt,
    maxAttempts,
    reason,
    errorCount,
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.info('🧠 Pass-1 retry', { attempt, maxAttempts, reason });
}

export function emitMissing(
  attemptsUsed: number,
  reason: string,
  hadPartialSuccess: boolean
): void {
  const event: Pass1MissingEvent = {
    type: 'MISSING',
    timestamp: Date.now(),
    attemptsUsed,
    reason,
    hadPartialSuccess,
  };
  
  insightPackEventEmitter.emit('pass1', event);
  logger.error('🧠 Pass-1 missing', { attemptsUsed, reason, hadPartialSuccess });
}

// ============================================================================
// METRICS AGGREGATION
// ============================================================================

export interface InsightPackMetrics {
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  degradedCount: number;
  timeoutCount: number;
  avgLatencyMs: number;
  avgAttemptsPerSuccess: number;
  successRate: number;
  topErrors: string[];
}

const metricsStore = {
  totalAttempts: 0,
  successCount: 0,
  failureCount: 0,
  degradedCount: 0,
  timeoutCount: 0,
  totalLatencyMs: 0,
  totalAttemptsForSuccess: 0,
  errorCounts: {} as Record<string, number>,
};

// Subscribe to events for metrics
insightPackEventEmitter.on('pass1', (event: InsightPackEvent) => {
  metricsStore.totalAttempts++;

  switch (event.type) {
    case 'SUCCESS':
      metricsStore.successCount++;
      metricsStore.totalLatencyMs += event.latencyMs;
      metricsStore.totalAttemptsForSuccess += event.attemptsUsed;
      if (event.degraded) {
        metricsStore.degradedCount++;
      }
      break;
    case 'MISSING':
      metricsStore.failureCount++;
      break;
    case 'TIMEOUT':
      metricsStore.timeoutCount++;
      break;
    case 'SCHEMA_FAIL':
      for (const error of event.errors.slice(0, 3)) {
        metricsStore.errorCounts[error] = (metricsStore.errorCounts[error] || 0) + 1;
      }
      break;
  }
});

export function aggregateInsightPackMetrics(): InsightPackMetrics {
  const successRate = metricsStore.totalAttempts > 0
    ? metricsStore.successCount / metricsStore.totalAttempts
    : 0;

  const avgLatencyMs = metricsStore.successCount > 0
    ? metricsStore.totalLatencyMs / metricsStore.successCount
    : 0;

  const avgAttemptsPerSuccess = metricsStore.successCount > 0
    ? metricsStore.totalAttemptsForSuccess / metricsStore.successCount
    : 0;

  const topErrors = Object.entries(metricsStore.errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([error]) => error);

  return {
    totalAttempts: metricsStore.totalAttempts,
    successCount: metricsStore.successCount,
    failureCount: metricsStore.failureCount,
    degradedCount: metricsStore.degradedCount,
    timeoutCount: metricsStore.timeoutCount,
    avgLatencyMs: Math.round(avgLatencyMs),
    avgAttemptsPerSuccess: Math.round(avgAttemptsPerSuccess * 10) / 10,
    successRate: Math.round(successRate * 1000) / 1000,
    topErrors,
  };
}

// ============================================================================
// RESET (for testing)
// ============================================================================

export function resetInsightPackMetrics(): void {
  metricsStore.totalAttempts = 0;
  metricsStore.successCount = 0;
  metricsStore.failureCount = 0;
  metricsStore.degradedCount = 0;
  metricsStore.timeoutCount = 0;
  metricsStore.totalLatencyMs = 0;
  metricsStore.totalAttemptsForSuccess = 0;
  metricsStore.errorCounts = {};
}
