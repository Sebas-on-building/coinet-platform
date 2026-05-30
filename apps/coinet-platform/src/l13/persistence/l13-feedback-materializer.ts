/**
 * L13.10 — Feedback Materializer
 *
 * §13.10.17–§13.10.21 — Builds durable user feedback records,
 * append envelopes, and recomputes the current feedback summary.
 */

import {
  L13FeedbackReasonCode,
  L13FeedbackSanitizationStatus,
  L13FeedbackType,
  l13IsNegativeFeedback,
  l13IsPositiveFeedback,
  type L13UserFeedbackRecord,
} from '../contracts/l13-feedback-record';
import type { L13CurrentFeedbackSummaryRecord } from '../contracts/l13-feedback-summary-record';
import {
  L13DurableSurfaceId,
  type L13PersistenceEnvelope,
} from '../contracts/l13-persistence-surface';
import { L13PersistenceClass, L13PersistenceWriteIntent } from '../contracts/l13-persistence-class';
import {
  L13MaterializationMode,
  L13StorageAuthorityClass,
} from '../contracts/l13-storage-authority';
import { buildL13PersistenceEnvelope } from './l13-persistence-envelope';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.persistence.v1';

export interface L13FeedbackWriterInput {
  readonly output_id: string;
  readonly runtime_run_id?: string;
  readonly request_id?: string;
  readonly user_id_hash?: string;
  readonly feedback_type: L13FeedbackType;
  readonly feedback_reason_codes: readonly L13FeedbackReasonCode[];
  readonly freeform_feedback?: string;
  readonly freeform_feedback_sanitization_status?: L13FeedbackSanitizationStatus;
  readonly created_at?: string;
  readonly lineage_refs?: readonly string[];
}

export interface L13FeedbackWriteResult {
  readonly record: L13UserFeedbackRecord;
  readonly envelope: L13PersistenceEnvelope;
}

export function writeL13UserFeedbackRecord(
  input: L13FeedbackWriterInput,
): L13FeedbackWriteResult {
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const reasonCodes = input.feedback_reason_codes ?? [];
  const sanitization =
    input.freeform_feedback_sanitization_status ??
    (input.freeform_feedback === undefined
      ? L13FeedbackSanitizationStatus.NOT_PROVIDED
      : L13FeedbackSanitizationStatus.STORED_AS_SAFE_FREEFORM);
  const replayHash = fnv1a(
    [
      input.output_id,
      input.runtime_run_id ?? '',
      input.request_id ?? '',
      input.user_id_hash ?? '',
      input.feedback_type,
      reasonCodes.slice().sort().join(','),
      input.freeform_feedback ?? '',
      sanitization,
      POLICY_V,
    ].join('|'),
  );
  const record: L13UserFeedbackRecord = {
    feedback_id: `l13.feedback.${replayHash}`,
    output_id: input.output_id,
    runtime_run_id: input.runtime_run_id,
    request_id: input.request_id,
    user_id_hash: input.user_id_hash,
    feedback_type: input.feedback_type,
    feedback_reason_codes: reasonCodes,
    freeform_feedback: input.freeform_feedback,
    freeform_feedback_sanitization_status: sanitization,
    created_at: input.created_at ?? new Date().toISOString(),
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  const envelope = buildL13PersistenceEnvelope({
    surface_id: L13DurableSurfaceId.AI_USER_FEEDBACK,
    persistence_class: L13PersistenceClass.USER_FEEDBACK,
    materialization_mode: L13MaterializationMode.DIRECT_ROW,
    storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    source_artifact_ref: record.feedback_id,
    durable_record_ref: record.feedback_id,
    write_intent: L13PersistenceWriteIntent.WRITE_NEW,
    append_safe_required: true,
    current_authority_update: false,
    lineage_refs: lineage,
  });
  return { record, envelope };
}

const QUALITY_FLAG = new Set<L13FeedbackReasonCode>([
  L13FeedbackReasonCode.POSSIBLE_FACTUAL_ISSUE,
  L13FeedbackReasonCode.POSSIBLE_HALLUCINATION,
  L13FeedbackReasonCode.CONTRADICTION_NOT_DISCLOSED,
  L13FeedbackReasonCode.FELT_OVERCONFIDENT,
  L13FeedbackReasonCode.FELT_UNSUPPORTED,
]);

const SAFETY_FLAG = new Set<L13FeedbackReasonCode>([
  L13FeedbackReasonCode.SAFETY_BOUNDARY_ISSUE,
]);

const HALLUCINATION_FLAG = new Set<L13FeedbackReasonCode>([
  L13FeedbackReasonCode.POSSIBLE_HALLUCINATION,
]);

export interface L13FeedbackSummaryInput {
  readonly output_id: string;
  readonly feedback_records: readonly L13UserFeedbackRecord[];
  readonly lineage_refs?: readonly string[];
}

export interface L13FeedbackSummaryResult {
  readonly summary: L13CurrentFeedbackSummaryRecord;
  readonly envelope: L13PersistenceEnvelope;
}

export function recomputeL13CurrentFeedbackSummary(
  input: L13FeedbackSummaryInput,
): L13FeedbackSummaryResult {
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const records = input.feedback_records;
  const typeCounts = new Map<L13FeedbackType, number>();
  const reasonCounts = new Map<L13FeedbackReasonCode, number>();
  let positive = 0;
  let negative = 0;
  let qualityFlag = false;
  let safetyFlag = false;
  let halluciFlag = false;
  let lastAt: string | undefined;
  for (const r of records) {
    typeCounts.set(r.feedback_type, (typeCounts.get(r.feedback_type) ?? 0) + 1);
    if (l13IsPositiveFeedback(r.feedback_type)) positive += 1;
    if (l13IsNegativeFeedback(r.feedback_type)) negative += 1;
    for (const c of r.feedback_reason_codes) {
      reasonCounts.set(c, (reasonCounts.get(c) ?? 0) + 1);
      if (QUALITY_FLAG.has(c)) qualityFlag = true;
      if (SAFETY_FLAG.has(c)) safetyFlag = true;
      if (HALLUCINATION_FLAG.has(c)) halluciFlag = true;
    }
    if (!lastAt || r.created_at > lastAt) lastAt = r.created_at;
  }
  const topTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
  const topReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([r]) => r);
  const replayHash = fnv1a(
    [
      input.output_id,
      String(records.length),
      String(positive),
      String(negative),
      topTypes.slice().sort().join(','),
      topReasons.slice().sort().join(','),
      String(qualityFlag),
      String(safetyFlag),
      String(halluciFlag),
      lastAt ?? '',
      POLICY_V,
    ].join('|'),
  );
  const summary: L13CurrentFeedbackSummaryRecord = {
    feedback_summary_id: `l13.feedback.summary.${replayHash}`,
    output_id: input.output_id,
    total_feedback_count: records.length,
    positive_feedback_count: positive,
    negative_feedback_count: negative,
    top_feedback_types: topTypes,
    top_feedback_reason_codes: topReasons,
    flagged_for_quality_review: qualityFlag,
    flagged_for_safety_review: safetyFlag,
    flagged_for_hallucination_review: halluciFlag,
    last_feedback_at: lastAt,
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  const envelope = buildL13PersistenceEnvelope({
    surface_id: L13DurableSurfaceId.CURRENT_AI_FEEDBACK_SUMMARY_REGISTRY,
    persistence_class: L13PersistenceClass.CURRENT_FEEDBACK_SUMMARY,
    materialization_mode: L13MaterializationMode.CURRENT_REGISTRY_UPSERT,
    storage_authority_class: L13StorageAuthorityClass.POSTGRES_CURRENT,
    source_artifact_ref: summary.feedback_summary_id,
    durable_record_ref: summary.feedback_summary_id,
    write_intent: L13PersistenceWriteIntent.RECOMPUTE_RECOMPUTABLE_CURRENT,
    append_safe_required: false,
    current_authority_update: true,
    lineage_refs: lineage,
  });
  return { summary, envelope };
}
