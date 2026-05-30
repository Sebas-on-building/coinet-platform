/**
 * L13.10 — Persistence Surface + Envelope Contracts
 *
 * §13.10.6 / §13.10.7 / §13.10.13 — Closed set of durable surfaces
 * Layer 13 may write to (through Layer 5 only), per-surface
 * descriptor, and the persistence envelope that every write must
 * pass through.
 */

import type { L13MaterializationMode, L13MutationDiscipline, L13StorageAuthorityClass } from './l13-storage-authority';
import type { L13PersistenceClass, L13PersistenceWriteIntent } from './l13-persistence-class';

export enum L13DurableSurfaceId {
  AI_INPUT_PACKAGES = 'l13.ai_input_packages',
  AI_PROMPT_ASSEMBLIES = 'l13.ai_prompt_assemblies',
  AI_MODEL_RUNS = 'l13.ai_model_runs',
  AI_MODEL_RESPONSE_ARTIFACTS = 'l13.ai_model_response_artifacts',
  AI_OUTPUTS = 'l13.ai_outputs',
  AI_PRODUCT_MODE_PAYLOADS = 'l13.ai_product_mode_payloads',
  AI_STYLED_RESPONSE_ENVELOPES = 'l13.ai_styled_response_envelopes',
  AI_SAFETY_GATE_RESULTS = 'l13.ai_safety_gate_results',
  AI_FINAL_GATE_RESULTS = 'l13.ai_final_gate_results',
  AI_GROUNDED_CLAIMS = 'l13.ai_grounded_claims',
  AI_BLOCKED_CLAIMS = 'l13.ai_blocked_claims',
  AI_USER_FEEDBACK = 'l13.ai_user_feedback',
  AI_OUTPUT_QUALITY_METRICS = 'l13.ai_output_quality_metrics',
  AI_OUTPUT_QUALITY_EVALUATIONS = 'l13.ai_output_quality_evaluations',
  AI_OUTPUT_FAILURES = 'l13.ai_output_failures',
  AI_AUDIT_EVENTS = 'l13.ai_audit_events',
  CURRENT_AI_OUTPUT_REGISTRY = 'l13.current_ai_output_registry',
  CURRENT_AI_FEEDBACK_SUMMARY_REGISTRY = 'l13.current_ai_feedback_summary_registry',
  TS_AI_OUTPUT_FACT_V1 = 'ts_ai_output_fact_v1',
  TS_AI_CLAIM_GROUNDING_V1 = 'ts_ai_claim_grounding_v1',
  TS_AI_BLOCKED_CLAIM_FACT_V1 = 'ts_ai_blocked_claim_fact_v1',
  TS_AI_FEEDBACK_V1 = 'ts_ai_feedback_v1',
  TS_AI_FEEDBACK_RESOLUTION_FACT_V1 = 'ts_ai_feedback_resolution_fact_v1',
  TS_AI_SAFETY_EVENT_V1 = 'ts_ai_safety_event_v1',
  TS_AI_OUTPUT_QUALITY_V1 = 'ts_ai_output_quality_v1',
  TS_AI_MODEL_RUN_FACT_V1 = 'ts_ai_model_run_fact_v1',
  TS_AI_FAILURE_FACT_V1 = 'ts_ai_failure_fact_v1',
}

export const ALL_L13_DURABLE_SURFACE_IDS:
  readonly L13DurableSurfaceId[] =
  Object.values(L13DurableSurfaceId);

export interface L13DurableSurfaceDescriptor {
  readonly surface_id: L13DurableSurfaceId;
  readonly storage_authority_class: L13StorageAuthorityClass;
  readonly mutation_discipline: L13MutationDiscipline;
  readonly materialization_mode: readonly L13MaterializationMode[];
  readonly current_authority: boolean;
  readonly append_safe: boolean;
  readonly correction_aware: boolean;
  readonly required_lineage_refs: boolean;
  readonly required_replay_hash: boolean;
  readonly required_policy_version: boolean;
  readonly policy_version: string;
}

export interface L13PersistenceEnvelope {
  readonly persistence_envelope_id: string;
  readonly surface_id: L13DurableSurfaceId;
  readonly persistence_class: L13PersistenceClass;
  readonly materialization_mode: L13MaterializationMode;
  readonly storage_authority_class: L13StorageAuthorityClass;
  readonly source_artifact_ref: string;
  readonly durable_record_ref?: string;
  readonly write_intent: L13PersistenceWriteIntent;
  readonly append_safe_required: boolean;
  readonly current_authority_update: boolean;
  readonly evidence_storage_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
