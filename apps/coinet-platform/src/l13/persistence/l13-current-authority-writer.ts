/**
 * L13.10 — Current Authority Writer
 *
 * §13.10.8 / §13.10.9 — Builds a current AI output authority
 * record and its persistence envelope. Pure function: no I/O.
 * The actual upsert is routed via L5.
 */

import {
  L13AIOutputSupersessionReason,
  L13CurrentOutputAuthorityStatus,
  type L13CurrentAIOutputRecord,
} from '../contracts/l13-current-output-record';
import { L13DurableSurfaceId, type L13PersistenceEnvelope } from '../contracts/l13-persistence-surface';
import { L13PersistenceClass, L13PersistenceWriteIntent } from '../contracts/l13-persistence-class';
import {
  L13MaterializationMode,
  L13StorageAuthorityClass,
} from '../contracts/l13-storage-authority';
import { buildL13PersistenceEnvelope } from './l13-persistence-envelope';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.persistence.v1';

export interface L13CurrentAuthorityWriterInput {
  readonly output_id: string;
  readonly request_id: string;
  readonly runtime_run_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly product_answer_mode: string;
  readonly output_class: string;
  readonly final_emission_decision: string;
  readonly safety_decision: string;
  readonly style_readiness: string;
  readonly mode_readiness: string;
  readonly expression_readiness: string;
  readonly grounding_readiness: string;
  readonly user_emittable_payload_ref?: string;
  readonly final_gate_result_ref: string;
  readonly safety_gate_result_ref: string;
  readonly styled_response_ref: string;
  readonly output_mode_envelope_ref: string;
  readonly supersedes_output_ref?: string;
  readonly supersession_reason?: L13AIOutputSupersessionReason;
  readonly current_authority_status?: L13CurrentOutputAuthorityStatus;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
  /**
   * Set true if any required upstream artifact is missing. The
   * writer will refuse to mark the record AUTHORITATIVE_CURRENT.
   */
  readonly required_artifacts_complete: boolean;
}

export interface L13CurrentAuthorityWriteResult {
  readonly record: L13CurrentAIOutputRecord;
  readonly envelope: L13PersistenceEnvelope;
}

export function writeL13CurrentAIOutputRecord(
  input: L13CurrentAuthorityWriterInput,
): L13CurrentAuthorityWriteResult {
  const evidence = input.evidence_refs ?? [];
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const status: L13CurrentOutputAuthorityStatus = input.current_authority_status
    ?? (input.required_artifacts_complete
      ? L13CurrentOutputAuthorityStatus.AUTHORITATIVE_CURRENT
      : L13CurrentOutputAuthorityStatus.PENDING_MATERIALIZATION);
  const replayHash = fnv1a(
    [
      input.output_id,
      input.request_id,
      input.runtime_run_id,
      input.scope_type,
      input.scope_id,
      input.as_of,
      input.product_answer_mode,
      input.output_class,
      input.final_emission_decision,
      input.safety_decision,
      input.style_readiness,
      input.mode_readiness,
      input.expression_readiness,
      input.grounding_readiness,
      input.user_emittable_payload_ref ?? '',
      input.final_gate_result_ref,
      input.safety_gate_result_ref,
      input.styled_response_ref,
      input.output_mode_envelope_ref,
      input.supersedes_output_ref ?? '',
      input.supersession_reason ?? '',
      status,
      evidence.slice().sort().join(','),
      lineage.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13CurrentAIOutputRecord = {
    current_output_record_id: `l13.current.out.${replayHash}`,
    output_id: input.output_id,
    request_id: input.request_id,
    runtime_run_id: input.runtime_run_id,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    as_of: input.as_of,
    product_answer_mode: input.product_answer_mode,
    output_class: input.output_class,
    final_emission_decision: input.final_emission_decision,
    safety_decision: input.safety_decision,
    style_readiness: input.style_readiness,
    mode_readiness: input.mode_readiness,
    expression_readiness: input.expression_readiness,
    grounding_readiness: input.grounding_readiness,
    user_emittable_payload_ref: input.user_emittable_payload_ref,
    final_gate_result_ref: input.final_gate_result_ref,
    safety_gate_result_ref: input.safety_gate_result_ref,
    styled_response_ref: input.styled_response_ref,
    output_mode_envelope_ref: input.output_mode_envelope_ref,
    supersedes_output_ref: input.supersedes_output_ref,
    supersession_reason: input.supersession_reason,
    current_authority_status: status,
    evidence_refs: evidence,
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  const envelope = buildL13PersistenceEnvelope({
    surface_id: L13DurableSurfaceId.CURRENT_AI_OUTPUT_REGISTRY,
    persistence_class: L13PersistenceClass.CURRENT_OUTPUT_AUTHORITY,
    materialization_mode: L13MaterializationMode.CURRENT_REGISTRY_UPSERT,
    storage_authority_class: L13StorageAuthorityClass.POSTGRES_CURRENT,
    source_artifact_ref: record.current_output_record_id,
    durable_record_ref: record.current_output_record_id,
    write_intent: L13PersistenceWriteIntent.UPSERT_CURRENT_AUTHORITY,
    append_safe_required: false,
    current_authority_update: true,
    lineage_refs: lineage,
  });
  return { record, envelope };
}
