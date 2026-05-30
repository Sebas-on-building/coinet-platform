/**
 * L13.10 — Quality Metric & Evaluation Materializer
 *
 * §13.10.22–§13.10.26 — Builds quality metric records and per-output
 * quality evaluations. Enforces metric definition law (denominator
 * sanity, satisfaction-vs-adjudication distinction).
 */

import {
  L13MetricConfidenceClass,
  L13MetricStatus,
  L13OutputQualityMetricClass,
  L13QualityEvaluationWindow,
  l13IsAdjudicatedMetric,
  l13IsSatisfactionProxyMetric,
  type L13OutputQualityMetric,
} from '../contracts/l13-output-quality-metric';
import {
  L13OutputQualityStatus,
  type L13OutputQualityEvaluationRecord,
} from '../contracts/l13-output-quality-evaluation';
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

export interface L13QualityMetricWriterInput {
  readonly metric_class: L13OutputQualityMetricClass;
  readonly metric_window: L13QualityEvaluationWindow;
  readonly scope_type?: string;
  readonly scope_id?: string;
  readonly answer_mode?: string;
  readonly output_class?: string;
  readonly numerator: number;
  readonly denominator: number;
  readonly derived_from_fact_refs?: readonly string[];
  readonly adjudication_label_present?: boolean;
  readonly created_at?: string;
  readonly lineage_refs?: readonly string[];
}

export interface L13QualityMetricWriteResult {
  readonly metric: L13OutputQualityMetric;
  readonly envelope: L13PersistenceEnvelope;
}

function resolveConfidence(
  cls: L13OutputQualityMetricClass,
  denominator: number,
  adjudicated: boolean,
): L13MetricConfidenceClass {
  if (l13IsAdjudicatedMetric(cls) && adjudicated) {
    return L13MetricConfidenceClass.ADJUDICATED;
  }
  if (l13IsSatisfactionProxyMetric(cls)) {
    return L13MetricConfidenceClass.PROXY_ONLY;
  }
  if (denominator < 20) {
    return L13MetricConfidenceClass.PROVISIONAL_LOW_SAMPLE;
  }
  return L13MetricConfidenceClass.CONFIDENT;
}

export function writeL13OutputQualityMetric(
  input: L13QualityMetricWriterInput,
): L13QualityMetricWriteResult {
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const refs = input.derived_from_fact_refs ?? [];
  const denominator = input.denominator;
  let status: L13MetricStatus = L13MetricStatus.METRIC_CLEAN;
  let metric_value = 0;
  if (denominator <= 0 || !Number.isFinite(denominator)) {
    status = L13MetricStatus.METRIC_INVALID_DENOMINATOR;
    metric_value = 0;
  } else {
    metric_value = input.numerator / denominator;
  }
  const adjudicated = input.adjudication_label_present === true;
  const confidence = resolveConfidence(
    input.metric_class,
    denominator,
    adjudicated,
  );
  const replayHash = fnv1a(
    [
      input.metric_class,
      input.metric_window,
      input.scope_type ?? '',
      input.scope_id ?? '',
      input.answer_mode ?? '',
      input.output_class ?? '',
      String(input.numerator),
      String(input.denominator),
      String(metric_value),
      confidence,
      status,
      refs.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  const metric: L13OutputQualityMetric = {
    output_quality_metric_id: `l13.quality.metric.${replayHash}`,
    metric_class: input.metric_class,
    metric_window: input.metric_window,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    answer_mode: input.answer_mode,
    output_class: input.output_class,
    numerator: input.numerator,
    denominator: input.denominator,
    metric_value,
    metric_confidence_class: confidence,
    metric_status: status,
    derived_from_fact_refs: refs,
    created_at: input.created_at ?? new Date().toISOString(),
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  const envelope = buildL13PersistenceEnvelope({
    surface_id: L13DurableSurfaceId.AI_OUTPUT_QUALITY_METRICS,
    persistence_class: L13PersistenceClass.OUTPUT_QUALITY_METRIC,
    materialization_mode: L13MaterializationMode.DIRECT_ROW,
    storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    source_artifact_ref: metric.output_quality_metric_id,
    durable_record_ref: metric.output_quality_metric_id,
    write_intent: L13PersistenceWriteIntent.WRITE_NEW,
    append_safe_required: true,
    current_authority_update: false,
    lineage_refs: lineage,
  });
  return { metric, envelope };
}

export interface L13QualityEvaluationWriterInput {
  readonly output_id: string;
  readonly runtime_run_id: string;
  readonly groundedness_passed: boolean;
  readonly contradiction_disclosure_passed: boolean;
  readonly safety_gate_passed: boolean;
  readonly style_integrity_passed: boolean;
  readonly mode_completeness_passed: boolean;
  readonly unsupported_claim_attempt_count: number;
  readonly blocked_claim_count: number;
  readonly emitted_claim_count: number;
  readonly safety_rewrite_count: number;
  readonly refusal_emitted: boolean;
  readonly metric_seed_refs?: readonly string[];
  readonly created_at?: string;
  readonly lineage_refs?: readonly string[];
  /**
   * If any required disclosure is present we mark CLEAN_WITH_DISCLOSURE.
   */
  readonly required_disclosure_present?: boolean;
}

export interface L13QualityEvaluationWriteResult {
  readonly evaluation: L13OutputQualityEvaluationRecord;
  readonly envelope: L13PersistenceEnvelope;
}

function resolveEvaluationStatus(
  input: L13QualityEvaluationWriterInput,
): L13OutputQualityStatus {
  if (!input.safety_gate_passed) {
    if (input.refusal_emitted) return L13OutputQualityStatus.QUALITY_REFUSAL_OCCURRED;
    if (input.safety_rewrite_count > 0) return L13OutputQualityStatus.QUALITY_REWRITE_OCCURRED;
    return L13OutputQualityStatus.QUALITY_BLOCKED_PRE_EMISSION;
  }
  if (!input.groundedness_passed || !input.contradiction_disclosure_passed) {
    return L13OutputQualityStatus.QUALITY_REVIEW_FLAGGED;
  }
  if (!input.style_integrity_passed || !input.mode_completeness_passed) {
    return L13OutputQualityStatus.QUALITY_REVIEW_FLAGGED;
  }
  if (input.required_disclosure_present) {
    return L13OutputQualityStatus.QUALITY_CLEAN_WITH_DISCLOSURE;
  }
  return L13OutputQualityStatus.QUALITY_CLEAN;
}

export function writeL13OutputQualityEvaluation(
  input: L13QualityEvaluationWriterInput,
): L13QualityEvaluationWriteResult {
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const seedRefs = input.metric_seed_refs ?? [];
  const status = resolveEvaluationStatus(input);
  const replayHash = fnv1a(
    [
      input.output_id,
      input.runtime_run_id,
      String(input.groundedness_passed),
      String(input.contradiction_disclosure_passed),
      String(input.safety_gate_passed),
      String(input.style_integrity_passed),
      String(input.mode_completeness_passed),
      String(input.unsupported_claim_attempt_count),
      String(input.blocked_claim_count),
      String(input.emitted_claim_count),
      String(input.safety_rewrite_count),
      String(input.refusal_emitted),
      status,
      seedRefs.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  const evaluation: L13OutputQualityEvaluationRecord = {
    output_quality_evaluation_id: `l13.quality.eval.${replayHash}`,
    output_id: input.output_id,
    runtime_run_id: input.runtime_run_id,
    groundedness_passed: input.groundedness_passed,
    contradiction_disclosure_passed: input.contradiction_disclosure_passed,
    safety_gate_passed: input.safety_gate_passed,
    style_integrity_passed: input.style_integrity_passed,
    mode_completeness_passed: input.mode_completeness_passed,
    unsupported_claim_attempt_count: input.unsupported_claim_attempt_count,
    blocked_claim_count: input.blocked_claim_count,
    emitted_claim_count: input.emitted_claim_count,
    safety_rewrite_count: input.safety_rewrite_count,
    refusal_emitted: input.refusal_emitted,
    output_quality_status: status,
    metric_seed_refs: seedRefs,
    created_at: input.created_at ?? new Date().toISOString(),
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  const envelope = buildL13PersistenceEnvelope({
    surface_id: L13DurableSurfaceId.AI_OUTPUT_QUALITY_EVALUATIONS,
    persistence_class: L13PersistenceClass.OUTPUT_QUALITY_EVALUATION,
    materialization_mode: L13MaterializationMode.DIRECT_ROW,
    storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    source_artifact_ref: evaluation.output_quality_evaluation_id,
    durable_record_ref: evaluation.output_quality_evaluation_id,
    write_intent: L13PersistenceWriteIntent.WRITE_NEW,
    append_safe_required: true,
    current_authority_update: false,
    lineage_refs: lineage,
  });
  return { evaluation, envelope };
}
