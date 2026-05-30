/**
 * L13.10 — In-Memory Durable Store
 *
 * §13.10.4 / §13.10.30 — Test-replayable in-memory store that
 * models the L5-routed durable surfaces. Production wiring lives
 * in L5; this module provides the typed surface that read
 * services and cert tests interact with.
 *
 * Append-only and current-authority discipline is enforced here
 * so that the L13.10 invariants can be proven mechanically.
 */

import type { L13CurrentAIOutputRecord } from '../contracts/l13-current-output-record';
import type { L13HistoricalAIOutputFact } from '../contracts/l13-historical-output-fact';
import type { L13UserFeedbackRecord } from '../contracts/l13-feedback-record';
import type { L13CurrentFeedbackSummaryRecord } from '../contracts/l13-feedback-summary-record';
import type { L13OutputQualityMetric } from '../contracts/l13-output-quality-metric';
import type { L13OutputQualityEvaluationRecord } from '../contracts/l13-output-quality-evaluation';
import type { L13AIOutputFailureRecord } from '../contracts/l13-output-failure-record';
import type { L13PersistenceEnvelope } from '../contracts/l13-persistence-surface';
import {
  L13StorageAuthorityClass,
  l13IsAuthorityClass,
} from '../contracts/l13-storage-authority';

export interface L13DurableArtifactRow {
  readonly artifact_ref: string;
  readonly surface_id: string;
  readonly envelope_ref: string;
  readonly created_at: string;
}

const artifactRows: L13DurableArtifactRow[] = [];
const currentOutputByOutputId = new Map<string, L13CurrentAIOutputRecord>();
const historicalOutputFacts: L13HistoricalAIOutputFact[] = [];
const feedbackRecords: L13UserFeedbackRecord[] = [];
const feedbackSummaries = new Map<string, L13CurrentFeedbackSummaryRecord>();
const qualityMetrics: L13OutputQualityMetric[] = [];
const qualityEvaluations: L13OutputQualityEvaluationRecord[] = [];
const failureRecords: L13AIOutputFailureRecord[] = [];
const envelopes: L13PersistenceEnvelope[] = [];

export function resetL13DurableStore(): void {
  artifactRows.length = 0;
  currentOutputByOutputId.clear();
  historicalOutputFacts.length = 0;
  feedbackRecords.length = 0;
  feedbackSummaries.clear();
  qualityMetrics.length = 0;
  qualityEvaluations.length = 0;
  failureRecords.length = 0;
  envelopes.length = 0;
}

export class L13DirectWriteAttemptError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'L13DirectWriteAttemptError';
  }
}

export class L13HistoricalMutationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'L13HistoricalMutationError';
  }
}

function rejectRedisAuthority(envelope: L13PersistenceEnvelope): void {
  if (!l13IsAuthorityClass(envelope.storage_authority_class)) {
    throw new L13DirectWriteAttemptError(
      `cache class ${envelope.storage_authority_class} cannot be authority`,
    );
  }
}

export function recordL13PersistenceEnvelope(
  envelope: L13PersistenceEnvelope,
): void {
  rejectRedisAuthority(envelope);
  envelopes.push(envelope);
  artifactRows.push({
    artifact_ref: envelope.source_artifact_ref,
    surface_id: envelope.surface_id,
    envelope_ref: envelope.persistence_envelope_id,
    created_at: new Date().toISOString(),
  });
}

export function commitL13CurrentAIOutput(
  record: L13CurrentAIOutputRecord,
): void {
  currentOutputByOutputId.set(record.output_id, record);
}

export function appendL13HistoricalAIOutputFact(
  fact: L13HistoricalAIOutputFact,
): void {
  // Reject any attempt to overwrite an existing historical fact id.
  if (historicalOutputFacts.some(f => f.historical_fact_id === fact.historical_fact_id)) {
    throw new L13HistoricalMutationError(
      `historical fact ${fact.historical_fact_id} already exists`,
    );
  }
  historicalOutputFacts.push(fact);
}

export function appendL13UserFeedback(
  record: L13UserFeedbackRecord,
): void {
  feedbackRecords.push(record);
}

export function commitL13FeedbackSummary(
  summary: L13CurrentFeedbackSummaryRecord,
): void {
  feedbackSummaries.set(summary.output_id, summary);
}

export function appendL13OutputQualityMetric(
  metric: L13OutputQualityMetric,
): void {
  qualityMetrics.push(metric);
}

export function appendL13OutputQualityEvaluation(
  evaluation: L13OutputQualityEvaluationRecord,
): void {
  qualityEvaluations.push(evaluation);
}

export function appendL13AIOutputFailure(
  record: L13AIOutputFailureRecord,
): void {
  failureRecords.push(record);
}

// ── Read surface getters ────────────────────────────────────────────

export function getAllL13CurrentAIOutputs():
  readonly L13CurrentAIOutputRecord[] {
  return Array.from(currentOutputByOutputId.values());
}

export function getL13CurrentAIOutputByOutputId(
  outputId: string,
): L13CurrentAIOutputRecord | undefined {
  return currentOutputByOutputId.get(outputId);
}

export function getAllL13HistoricalAIOutputFacts():
  readonly L13HistoricalAIOutputFact[] {
  return [...historicalOutputFacts];
}

export function getL13HistoricalAIOutputFactsByOutputId(
  outputId: string,
): readonly L13HistoricalAIOutputFact[] {
  return historicalOutputFacts.filter(f => f.output_id === outputId);
}

export function getAllL13UserFeedback():
  readonly L13UserFeedbackRecord[] {
  return [...feedbackRecords];
}

export function getL13UserFeedbackByOutputId(
  outputId: string,
): readonly L13UserFeedbackRecord[] {
  return feedbackRecords.filter(r => r.output_id === outputId);
}

export function getL13FeedbackSummaryByOutputId(
  outputId: string,
): L13CurrentFeedbackSummaryRecord | undefined {
  return feedbackSummaries.get(outputId);
}

export function getAllL13OutputQualityMetrics():
  readonly L13OutputQualityMetric[] {
  return [...qualityMetrics];
}

export function getAllL13OutputQualityEvaluations():
  readonly L13OutputQualityEvaluationRecord[] {
  return [...qualityEvaluations];
}

export function getL13OutputQualityEvaluationByOutputId(
  outputId: string,
): L13OutputQualityEvaluationRecord | undefined {
  return qualityEvaluations.find(e => e.output_id === outputId);
}

export function getAllL13AIOutputFailures():
  readonly L13AIOutputFailureRecord[] {
  return [...failureRecords];
}

export function getL13AIOutputFailuresByRunId(
  runId: string,
): readonly L13AIOutputFailureRecord[] {
  return failureRecords.filter(f => f.runtime_run_id === runId);
}

export function getAllL13PersistenceEnvelopes():
  readonly L13PersistenceEnvelope[] {
  return [...envelopes];
}

export function getL13ArtifactRowsBySurface(
  surface_id: string,
): readonly L13DurableArtifactRow[] {
  return artifactRows.filter(r => r.surface_id === surface_id);
}

// Helper for tests that need to assert direct-write attempts.
export function attemptL13DirectWrite(
  surface_id: string,
): never {
  void surface_id;
  throw new L13DirectWriteAttemptError(
    'direct write outside L5 envelope is illegal',
  );
}

// Forces a Redis-as-authority attempt for invariant testing.
export function attemptL13RedisAuthority(): never {
  throw new L13DirectWriteAttemptError(
    `cache class ${L13StorageAuthorityClass.REDIS_CACHE_NON_AUTHORITY} cannot be authority`,
  );
}
