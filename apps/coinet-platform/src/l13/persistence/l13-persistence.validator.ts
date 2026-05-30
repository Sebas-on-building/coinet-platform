/**
 * L13.10 — Master Persistence Validator
 *
 * §13.10.36 — Orchestrator that composes the per-shape persistence
 * and feedback validators into a single result.
 */

import type { L13PersistenceEnvelope } from '../contracts/l13-persistence-surface';
import type { L13CurrentAIOutputRecord } from '../contracts/l13-current-output-record';
import type { L13HistoricalAIOutputFact } from '../contracts/l13-historical-output-fact';
import type { L13UserFeedbackRecord } from '../contracts/l13-feedback-record';
import type { L13CurrentFeedbackSummaryRecord } from '../contracts/l13-feedback-summary-record';
import type { L13OutputQualityMetric } from '../contracts/l13-output-quality-metric';
import type { L13OutputQualityEvaluationRecord } from '../contracts/l13-output-quality-evaluation';
import type { L13AIOutputFailureRecord } from '../contracts/l13-output-failure-record';
import {
  validateL13AIOutputFailureRecord,
  validateL13CurrentAIOutputRecord,
  validateL13FeedbackSummaryRecord,
  validateL13HistoricalAIOutputFact,
  validateL13OutputQualityEvaluation,
  validateL13OutputQualityMetric,
  validateL13PersistenceEnvelope,
  validateL13UserFeedbackRecord,
} from '../validation/persistence.validators';
import type {
  L13PersistenceFeedbackIssue,
  L13PersistenceFeedbackValidationResult,
} from '../validation/_l13-persistence-issue';

export interface L13MasterPersistenceInput {
  readonly envelopes?: readonly L13PersistenceEnvelope[];
  readonly current_outputs?: readonly L13CurrentAIOutputRecord[];
  readonly historical_facts?: readonly L13HistoricalAIOutputFact[];
  readonly feedback_records?: readonly L13UserFeedbackRecord[];
  readonly feedback_summaries?: readonly L13CurrentFeedbackSummaryRecord[];
  readonly quality_metrics?: readonly L13OutputQualityMetric[];
  readonly quality_evaluations?: readonly L13OutputQualityEvaluationRecord[];
  readonly failure_records?: readonly L13AIOutputFailureRecord[];
}

export function validateL13Persistence(
  input: L13MasterPersistenceInput,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  const push = (r: L13PersistenceFeedbackValidationResult) =>
    issues.push(...r.issues);
  for (const e of input.envelopes ?? []) push(validateL13PersistenceEnvelope(e));
  for (const r of input.current_outputs ?? [])
    push(validateL13CurrentAIOutputRecord(r));
  for (const f of input.historical_facts ?? [])
    push(validateL13HistoricalAIOutputFact(f));
  for (const r of input.feedback_records ?? [])
    push(validateL13UserFeedbackRecord(r));
  for (const s of input.feedback_summaries ?? [])
    push(validateL13FeedbackSummaryRecord(s));
  for (const m of input.quality_metrics ?? [])
    push(validateL13OutputQualityMetric(m));
  for (const e of input.quality_evaluations ?? [])
    push(validateL13OutputQualityEvaluation(e));
  for (const f of input.failure_records ?? [])
    push(validateL13AIOutputFailureRecord(f));
  return { clean: issues.length === 0, issues };
}
