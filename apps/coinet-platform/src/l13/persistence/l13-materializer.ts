/**
 * L13.10 — Materializer
 *
 * §13.10.15 / §13.10.16 — Consumes finalized L13.6→L13.9 artifacts
 * and emits the L5-routed persistence envelopes that make the
 * Layer 13 run durable. Pure: no I/O. Returns the full envelope
 * set plus the current/historical/failure records. The caller is
 * the L5 router.
 */

import { L13DurableSurfaceId, type L13PersistenceEnvelope } from '../contracts/l13-persistence-surface';
import { L13PersistenceClass, L13PersistenceWriteIntent } from '../contracts/l13-persistence-class';
import {
  L13MaterializationMode,
  L13StorageAuthorityClass,
} from '../contracts/l13-storage-authority';
import type { L13CurrentAIOutputRecord } from '../contracts/l13-current-output-record';
import type { L13HistoricalAIOutputFact } from '../contracts/l13-historical-output-fact';
import {
  L13OutputFailureClass,
  L13OutputFailureStage,
  type L13AIOutputFailureRecord,
} from '../contracts/l13-output-failure-record';
import { buildL13PersistenceEnvelope } from './l13-persistence-envelope';
import {
  writeL13CurrentAIOutputRecord,
  type L13CurrentAuthorityWriterInput,
} from './l13-current-authority-writer';
import {
  writeL13HistoricalAIOutputFact,
  type L13HistoricalOutputFactWriterInput,
} from './l13-historical-fact-writer';
import { writeL13AIOutputFailureRecord } from './l13-output-failure-writer';

export interface L13MaterializerInput {
  readonly request_id: string;
  readonly runtime_run_id: string;
  readonly output_id?: string;
  readonly input_package_ref?: string;
  readonly prompt_assembly_ref?: string;
  readonly model_run_ref?: string;
  readonly model_response_artifact_ref?: string;
  readonly final_output_ref?: string;
  readonly product_mode_payload_ref?: string;
  readonly styled_response_ref?: string;
  readonly safety_gate_result_ref?: string;
  readonly final_gate_result_ref?: string;
  readonly grounded_claim_refs?: readonly string[];
  readonly blocked_claim_refs?: readonly string[];
  /**
   * Pure-data fields used to construct the durable current /
   * historical authority records.
   */
  readonly current_authority?: L13CurrentAuthorityWriterInput;
  readonly historical_fact?: L13HistoricalOutputFactWriterInput;
  readonly lineage_refs?: readonly string[];
}

export interface L13MaterializerResult {
  readonly envelopes: readonly L13PersistenceEnvelope[];
  readonly current_authority?: L13CurrentAIOutputRecord;
  readonly historical_fact?: L13HistoricalAIOutputFact;
  readonly failures: readonly L13AIOutputFailureRecord[];
  readonly required_artifacts_complete: boolean;
}

interface ArtifactSpec {
  readonly ref: string | undefined;
  readonly surface_id: L13DurableSurfaceId;
  readonly persistence_class: L13PersistenceClass;
  readonly materialization_mode: L13MaterializationMode;
  readonly storage_authority_class: L13StorageAuthorityClass;
  readonly required: boolean;
  readonly failure_stage: L13OutputFailureStage;
  readonly failure_reason_code: string;
}

function specs(input: L13MaterializerInput): readonly ArtifactSpec[] {
  return [
    {
      ref: input.input_package_ref,
      surface_id: L13DurableSurfaceId.AI_INPUT_PACKAGES,
      persistence_class: L13PersistenceClass.INPUT_PACKAGE,
      materialization_mode: L13MaterializationMode.DIRECT_ROW,
      storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
      required: true,
      failure_stage: L13OutputFailureStage.INPUT_PACKAGE_PERSISTENCE,
      failure_reason_code: 'INPUT_PACKAGE_REF_MISSING',
    },
    {
      ref: input.prompt_assembly_ref,
      surface_id: L13DurableSurfaceId.AI_PROMPT_ASSEMBLIES,
      persistence_class: L13PersistenceClass.PROMPT_ASSEMBLY,
      materialization_mode: L13MaterializationMode.DIRECT_ROW,
      storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
      required: true,
      failure_stage: L13OutputFailureStage.MODEL_RUN_PERSISTENCE,
      failure_reason_code: 'PROMPT_ASSEMBLY_REF_MISSING',
    },
    {
      ref: input.model_run_ref,
      surface_id: L13DurableSurfaceId.AI_MODEL_RUNS,
      persistence_class: L13PersistenceClass.MODEL_RUN,
      materialization_mode: L13MaterializationMode.DIRECT_ROW,
      storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
      required: true,
      failure_stage: L13OutputFailureStage.MODEL_RUN_PERSISTENCE,
      failure_reason_code: 'MODEL_RUN_REF_MISSING',
    },
    {
      ref: input.model_response_artifact_ref,
      surface_id: L13DurableSurfaceId.AI_MODEL_RESPONSE_ARTIFACTS,
      persistence_class: L13PersistenceClass.MODEL_RESPONSE_ARTIFACT,
      materialization_mode: L13MaterializationMode.POINTER_TO_OBJECT_STORE,
      storage_authority_class: L13StorageAuthorityClass.OBJECT_STORAGE_IMMUTABLE,
      required: true,
      failure_stage: L13OutputFailureStage.MODEL_RUN_PERSISTENCE,
      failure_reason_code: 'MODEL_RESPONSE_ARTIFACT_REF_MISSING',
    },
    {
      ref: input.final_output_ref,
      surface_id: L13DurableSurfaceId.AI_OUTPUTS,
      persistence_class: L13PersistenceClass.FINAL_AI_OUTPUT,
      materialization_mode: L13MaterializationMode.DIRECT_ROW,
      storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
      required: true,
      failure_stage: L13OutputFailureStage.OUTPUT_PERSISTENCE,
      failure_reason_code: 'FINAL_OUTPUT_REF_MISSING',
    },
    {
      ref: input.product_mode_payload_ref,
      surface_id: L13DurableSurfaceId.AI_PRODUCT_MODE_PAYLOADS,
      persistence_class: L13PersistenceClass.PRODUCT_MODE_PAYLOAD,
      materialization_mode: L13MaterializationMode.DIRECT_ROW,
      storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
      required: true,
      failure_stage: L13OutputFailureStage.OUTPUT_PERSISTENCE,
      failure_reason_code: 'PRODUCT_MODE_PAYLOAD_REF_MISSING',
    },
    {
      ref: input.styled_response_ref,
      surface_id: L13DurableSurfaceId.AI_STYLED_RESPONSE_ENVELOPES,
      persistence_class: L13PersistenceClass.STYLED_RESPONSE,
      materialization_mode: L13MaterializationMode.DIRECT_ROW,
      storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
      required: true,
      failure_stage: L13OutputFailureStage.OUTPUT_PERSISTENCE,
      failure_reason_code: 'STYLED_RESPONSE_REF_MISSING',
    },
    {
      ref: input.safety_gate_result_ref,
      surface_id: L13DurableSurfaceId.AI_SAFETY_GATE_RESULTS,
      persistence_class: L13PersistenceClass.SAFETY_GATE_RESULT,
      materialization_mode: L13MaterializationMode.DIRECT_ROW,
      storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
      required: true,
      failure_stage: L13OutputFailureStage.OUTPUT_PERSISTENCE,
      failure_reason_code: 'SAFETY_GATE_RESULT_REF_MISSING',
    },
    {
      ref: input.final_gate_result_ref,
      surface_id: L13DurableSurfaceId.AI_FINAL_GATE_RESULTS,
      persistence_class: L13PersistenceClass.FINAL_GATE_RESULT,
      materialization_mode: L13MaterializationMode.DIRECT_ROW,
      storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
      required: true,
      failure_stage: L13OutputFailureStage.OUTPUT_PERSISTENCE,
      failure_reason_code: 'FINAL_GATE_RESULT_REF_MISSING',
    },
  ];
}

/**
 * §13.10.15.1 — Materialize. Returns envelopes for every required
 * write plus current/historical records. If any required artifact
 * is missing the materializer marks `required_artifacts_complete=false`
 * and emits failure records — current authority then is marked
 * PENDING_MATERIALIZATION.
 */
export function materializeL13Run(
  input: L13MaterializerInput,
): L13MaterializerResult {
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const envelopes: L13PersistenceEnvelope[] = [];
  const failures: L13AIOutputFailureRecord[] = [];
  let allComplete = true;

  // 1..9 — material artifacts.
  for (const spec of specs(input)) {
    if (spec.ref) {
      envelopes.push(
        buildL13PersistenceEnvelope({
          surface_id: spec.surface_id,
          persistence_class: spec.persistence_class,
          materialization_mode: spec.materialization_mode,
          storage_authority_class: spec.storage_authority_class,
          source_artifact_ref: spec.ref,
          durable_record_ref: spec.ref,
          write_intent: L13PersistenceWriteIntent.WRITE_NEW,
          append_safe_required: true,
          current_authority_update: false,
          lineage_refs: lineage,
        }),
      );
    } else if (spec.required) {
      allComplete = false;
      const failure = writeL13AIOutputFailureRecord({
        request_id: input.request_id,
        runtime_run_id: input.runtime_run_id,
        output_id: input.output_id,
        failure_stage: spec.failure_stage,
        failure_class: L13OutputFailureClass.REQUIRED_ARTIFACT_MISSING,
        failure_reason_codes: [spec.failure_reason_code],
        safe_to_retry: true,
        repair_possible: true,
        related_audit_event_refs: [],
        lineage_refs: lineage,
      });
      failures.push(failure.record);
      envelopes.push(failure.envelope);
    }
  }

  // 5 — grounded / blocked claim refs as direct rows.
  for (const ref of input.grounded_claim_refs ?? []) {
    envelopes.push(
      buildL13PersistenceEnvelope({
        surface_id: L13DurableSurfaceId.AI_GROUNDED_CLAIMS,
        persistence_class: L13PersistenceClass.GROUNDED_CLAIM,
        materialization_mode: L13MaterializationMode.DIRECT_ROW,
        storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
        source_artifact_ref: ref,
        durable_record_ref: ref,
        write_intent: L13PersistenceWriteIntent.WRITE_NEW,
        append_safe_required: true,
        current_authority_update: false,
        lineage_refs: lineage,
      }),
    );
  }
  for (const ref of input.blocked_claim_refs ?? []) {
    envelopes.push(
      buildL13PersistenceEnvelope({
        surface_id: L13DurableSurfaceId.AI_BLOCKED_CLAIMS,
        persistence_class: L13PersistenceClass.BLOCKED_CLAIM,
        materialization_mode: L13MaterializationMode.DIRECT_ROW,
        storage_authority_class: L13StorageAuthorityClass.POSTGRES_APPEND_ONLY,
        source_artifact_ref: ref,
        durable_record_ref: ref,
        write_intent: L13PersistenceWriteIntent.WRITE_NEW,
        append_safe_required: true,
        current_authority_update: false,
        lineage_refs: lineage,
      }),
    );
  }

  // 7 — current authority registry (only if asked).
  let currentRecord: L13CurrentAIOutputRecord | undefined;
  if (input.current_authority) {
    const cw = writeL13CurrentAIOutputRecord({
      ...input.current_authority,
      required_artifacts_complete:
        input.current_authority.required_artifacts_complete && allComplete,
    });
    currentRecord = cw.record;
    envelopes.push(cw.envelope);
  }

  // 8 — historical fact append.
  let historicalFact: L13HistoricalAIOutputFact | undefined;
  if (input.historical_fact) {
    const hw = writeL13HistoricalAIOutputFact(input.historical_fact);
    historicalFact = hw.fact;
    envelopes.push(hw.envelope);
  }

  return {
    envelopes,
    current_authority: currentRecord,
    historical_fact: historicalFact,
    failures,
    required_artifacts_complete: allComplete,
  };
}
