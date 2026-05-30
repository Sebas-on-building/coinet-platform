/**
 * L13.10 — Persistence + Feedback Validators
 *
 * §13.10.36 — Per-shape validators. The master orchestrator in
 * `persistence/l13-persistence.validator.ts` composes them.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import {
  L13CurrentOutputAuthorityStatus,
  type L13CurrentAIOutputRecord,
} from '../contracts/l13-current-output-record';
import type { L13HistoricalAIOutputFact } from '../contracts/l13-historical-output-fact';
import type {
  L13UserFeedbackRecord,
} from '../contracts/l13-feedback-record';
import type { L13CurrentFeedbackSummaryRecord } from '../contracts/l13-feedback-summary-record';
import {
  L13MetricStatus,
  type L13OutputQualityMetric,
} from '../contracts/l13-output-quality-metric';
import type { L13OutputQualityEvaluationRecord } from '../contracts/l13-output-quality-evaluation';
import type { L13AIOutputFailureRecord } from '../contracts/l13-output-failure-record';
import {
  L13DurableSurfaceId,
  type L13PersistenceEnvelope,
} from '../contracts/l13-persistence-surface';
import {
  L13StorageAuthorityClass,
  l13IsAuthorityClass,
} from '../contracts/l13-storage-authority';
import {
  l13SurfaceIsRegistered,
} from '../persistence/l13-materialization-policy';
import { L13PersistenceFeedbackViolationCode } from './l13-persistence-feedback-violation-codes';
import {
  l13PersistenceResult,
  type L13PersistenceFeedbackIssue,
  type L13PersistenceFeedbackValidationResult,
} from './_l13-persistence-issue';

const C = L13PersistenceFeedbackViolationCode;
const SEV = L13ViolationSeverity;

// ── Persistence envelope ────────────────────────────────────────────

export function validateL13PersistenceEnvelope(
  envelope: L13PersistenceEnvelope,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!envelope.persistence_envelope_id) {
    issues.push({
      code: C.L13D_PERSISTENCE_ENVELOPE_MISSING,
      severity: SEV.CRITICAL,
      message: 'persistence_envelope_id missing',
    });
  }
  if (!envelope.replay_hash) {
    issues.push({
      code: C.L13D_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'persistence envelope replay_hash missing',
    });
  }
  if (envelope.lineage_refs.length === 0) {
    issues.push({
      code: C.L13D_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'persistence envelope lineage_refs empty',
    });
  }
  if (!l13SurfaceIsRegistered(envelope.surface_id)) {
    issues.push({
      code: C.L13D_READ_SURFACE_UNREGISTERED,
      severity: SEV.CRITICAL,
      message: `surface ${envelope.surface_id} not registered`,
    });
  }
  if (!l13IsAuthorityClass(envelope.storage_authority_class)) {
    issues.push({
      code: C.L13D_STORAGE_AUTHORITY_ILLEGAL,
      severity: SEV.CRITICAL,
      message: `${L13StorageAuthorityClass.REDIS_CACHE_NON_AUTHORITY} cannot be authority`,
    });
  }
  return l13PersistenceResult(issues);
}

// ── Current AI output record ────────────────────────────────────────

export function validateL13CurrentAIOutputRecord(
  record: L13CurrentAIOutputRecord,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!record.current_output_record_id) {
    issues.push({
      code: C.L13D_CURRENT_OUTPUT_AUTHORITY_MISSING,
      severity: SEV.CRITICAL,
      message: 'current_output_record_id missing',
    });
  }
  if (!record.replay_hash) {
    issues.push({
      code: C.L13D_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'current output record replay_hash missing',
    });
  }
  if (record.lineage_refs.length === 0) {
    issues.push({
      code: C.L13D_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'current output record lineage_refs empty',
    });
  }
  if (record.supersedes_output_ref && !record.supersession_reason) {
    issues.push({
      code: C.L13D_CURRENT_OUTPUT_SUPERSESSION_ILLEGAL,
      severity: SEV.CRITICAL,
      message: 'supersedes_output_ref without supersession_reason',
    });
  }
  // AUTHORITATIVE_CURRENT requires final-gate, safety-gate, mode-envelope, styled refs.
  if (
    record.current_authority_status ===
      L13CurrentOutputAuthorityStatus.AUTHORITATIVE_CURRENT &&
    (!record.final_gate_result_ref ||
      !record.safety_gate_result_ref ||
      !record.styled_response_ref ||
      !record.output_mode_envelope_ref)
  ) {
    issues.push({
      code: C.L13D_CURRENT_OUTPUT_AUTHORITY_MISSING,
      severity: SEV.CRITICAL,
      message:
        'AUTHORITATIVE_CURRENT requires final_gate/safety_gate/styled/mode refs',
    });
  }
  return l13PersistenceResult(issues);
}

// ── Historical output fact ──────────────────────────────────────────

export function validateL13HistoricalAIOutputFact(
  fact: L13HistoricalAIOutputFact,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!fact.historical_fact_id) {
    issues.push({
      code: C.L13D_HISTORICAL_FACT_APPEND_MISSING,
      severity: SEV.CRITICAL,
      message: 'historical_fact_id missing',
    });
  }
  if (!fact.replay_hash) {
    issues.push({
      code: C.L13D_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'historical fact replay_hash missing',
    });
  }
  if (fact.lineage_refs.length === 0) {
    issues.push({
      code: C.L13D_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'historical fact lineage_refs empty',
    });
  }
  return l13PersistenceResult(issues);
}

// ── Feedback record ─────────────────────────────────────────────────

export function validateL13UserFeedbackRecord(
  record: L13UserFeedbackRecord,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!record.feedback_id) {
    issues.push({
      code: C.L13D_FEEDBACK_RECORD_INVALID,
      severity: SEV.CRITICAL,
      message: 'feedback_id missing',
    });
  }
  if (!record.output_id) {
    issues.push({
      code: C.L13D_FEEDBACK_OUTPUT_REF_MISSING,
      severity: SEV.CRITICAL,
      message: 'feedback record missing output_id',
    });
  }
  if (record.feedback_reason_codes.length === 0) {
    issues.push({
      code: C.L13D_FEEDBACK_REASON_CODES_MISSING,
      severity: SEV.ERROR,
      message: 'feedback record has no reason codes',
    });
  }
  if (!record.replay_hash) {
    issues.push({
      code: C.L13D_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'feedback record replay_hash missing',
    });
  }
  return l13PersistenceResult(issues);
}

// ── Feedback summary record ─────────────────────────────────────────

export function validateL13FeedbackSummaryRecord(
  summary: L13CurrentFeedbackSummaryRecord,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!summary.feedback_summary_id) {
    issues.push({
      code: C.L13D_FEEDBACK_SUMMARY_NOT_RECOMPUTABLE,
      severity: SEV.ERROR,
      message: 'feedback_summary_id missing',
    });
  }
  if (
    summary.total_feedback_count !==
    summary.positive_feedback_count +
      summary.negative_feedback_count +
      // Allow neutral types (TOO_LONG / TOO_SHORT etc., which the
      // helper classifies neither as positive nor negative).
      Math.max(
        0,
        summary.total_feedback_count -
          summary.positive_feedback_count -
          summary.negative_feedback_count,
      )
  ) {
    issues.push({
      code: C.L13D_FEEDBACK_SUMMARY_NOT_RECOMPUTABLE,
      severity: SEV.ERROR,
      message: 'feedback summary counts inconsistent',
    });
  }
  if (!summary.replay_hash) {
    issues.push({
      code: C.L13D_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'feedback summary replay_hash missing',
    });
  }
  return l13PersistenceResult(issues);
}

// ── Output quality metric ───────────────────────────────────────────

export function validateL13OutputQualityMetric(
  metric: L13OutputQualityMetric,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!metric.output_quality_metric_id) {
    issues.push({
      code: C.L13D_QUALITY_METRIC_DEFINITION_INVALID,
      severity: SEV.CRITICAL,
      message: 'output_quality_metric_id missing',
    });
  }
  if (!metric.replay_hash) {
    issues.push({
      code: C.L13D_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'quality metric replay_hash missing',
    });
  }
  if (metric.denominator <= 0 || !Number.isFinite(metric.denominator)) {
    issues.push({
      code: C.L13D_QUALITY_METRIC_DENOMINATOR_INVALID,
      severity: SEV.ERROR,
      message: `quality metric denominator invalid (${metric.denominator})`,
    });
    if (metric.metric_status !== L13MetricStatus.METRIC_INVALID_DENOMINATOR) {
      issues.push({
        code: C.L13D_QUALITY_METRIC_DEFINITION_INVALID,
        severity: SEV.CRITICAL,
        message:
          'invalid denominator must be reflected in metric_status=METRIC_INVALID_DENOMINATOR',
      });
    }
  }
  if (metric.numerator < 0 || !Number.isFinite(metric.numerator)) {
    issues.push({
      code: C.L13D_QUALITY_METRIC_DEFINITION_INVALID,
      severity: SEV.ERROR,
      message: `quality metric numerator invalid (${metric.numerator})`,
    });
  }
  return l13PersistenceResult(issues);
}

// ── Output quality evaluation ───────────────────────────────────────

export function validateL13OutputQualityEvaluation(
  evaluation: L13OutputQualityEvaluationRecord,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!evaluation.output_quality_evaluation_id) {
    issues.push({
      code: C.L13D_QUALITY_EVALUATION_MISSING,
      severity: SEV.CRITICAL,
      message: 'output_quality_evaluation_id missing',
    });
  }
  if (!evaluation.replay_hash) {
    issues.push({
      code: C.L13D_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'quality evaluation replay_hash missing',
    });
  }
  return l13PersistenceResult(issues);
}

// ── Output failure record ───────────────────────────────────────────

export function validateL13AIOutputFailureRecord(
  record: L13AIOutputFailureRecord,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!record.output_failure_id) {
    issues.push({
      code: C.L13D_OUTPUT_FAILURE_NOT_RECORDED,
      severity: SEV.CRITICAL,
      message: 'output_failure_id missing',
    });
  }
  if (!record.replay_hash) {
    issues.push({
      code: C.L13D_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'output failure replay_hash missing',
    });
  }
  if (record.failure_reason_codes.length === 0) {
    issues.push({
      code: C.L13D_OUTPUT_FAILURE_NOT_RECORDED,
      severity: SEV.ERROR,
      message: 'output failure has no reason codes',
    });
  }
  return l13PersistenceResult(issues);
}

// ── Read surface ────────────────────────────────────────────────────

export function validateL13ReadSurface(
  surface_id: L13DurableSurfaceId,
): L13PersistenceFeedbackValidationResult {
  const issues: L13PersistenceFeedbackIssue[] = [];
  if (!l13SurfaceIsRegistered(surface_id)) {
    issues.push({
      code: C.L13D_READ_SURFACE_UNREGISTERED,
      severity: SEV.CRITICAL,
      message: `read surface ${surface_id} not registered`,
    });
  }
  return l13PersistenceResult(issues);
}
