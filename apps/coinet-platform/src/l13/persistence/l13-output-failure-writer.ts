/**
 * L13.10 — Output Failure Writer
 *
 * §13.10.27 / §13.10.28 — Builds an immutable failure record any
 * time materialization is incomplete. Failures must persist.
 */

import {
  L13OutputFailureClass,
  L13OutputFailureStage,
  type L13AIOutputFailureRecord,
} from '../contracts/l13-output-failure-record';
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

export interface L13OutputFailureWriterInput {
  readonly request_id: string;
  readonly runtime_run_id?: string;
  readonly output_id?: string;
  readonly failure_stage: L13OutputFailureStage;
  readonly failure_class: L13OutputFailureClass;
  readonly failure_reason_codes: readonly string[];
  readonly safe_to_retry: boolean;
  readonly repair_possible: boolean;
  readonly related_audit_event_refs?: readonly string[];
  readonly created_at?: string;
  readonly lineage_refs?: readonly string[];
}

export interface L13OutputFailureWriteResult {
  readonly record: L13AIOutputFailureRecord;
  readonly envelope: L13PersistenceEnvelope;
}

export function writeL13AIOutputFailureRecord(
  input: L13OutputFailureWriterInput,
): L13OutputFailureWriteResult {
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const auditRefs = input.related_audit_event_refs ?? [];
  const replayHash = fnv1a(
    [
      input.request_id,
      input.runtime_run_id ?? '',
      input.output_id ?? '',
      input.failure_stage,
      input.failure_class,
      input.failure_reason_codes.slice().sort().join(','),
      String(input.safe_to_retry),
      String(input.repair_possible),
      auditRefs.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13AIOutputFailureRecord = {
    output_failure_id: `l13.output.failure.${replayHash}`,
    request_id: input.request_id,
    runtime_run_id: input.runtime_run_id,
    output_id: input.output_id,
    failure_stage: input.failure_stage,
    failure_class: input.failure_class,
    failure_reason_codes: input.failure_reason_codes,
    safe_to_retry: input.safe_to_retry,
    repair_possible: input.repair_possible,
    related_audit_event_refs: auditRefs,
    created_at: input.created_at ?? new Date().toISOString(),
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  const envelope = buildL13PersistenceEnvelope({
    surface_id: L13DurableSurfaceId.AI_OUTPUT_FAILURES,
    persistence_class: L13PersistenceClass.OUTPUT_FAILURE,
    materialization_mode: L13MaterializationMode.DIRECT_ROW,
    storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
    source_artifact_ref: record.output_failure_id,
    durable_record_ref: record.output_failure_id,
    write_intent: L13PersistenceWriteIntent.WRITE_NEW,
    append_safe_required: true,
    current_authority_update: false,
    lineage_refs: lineage,
  });
  return { record, envelope };
}
