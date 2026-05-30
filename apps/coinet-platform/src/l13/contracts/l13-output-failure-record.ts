/**
 * L13.10 — Output Failure Record
 *
 * §13.10.27 / §13.10.28 — Durable record of any materialization
 * failure inside the L13.6→L13.9 pipeline. Failures must persist,
 * never silently drop.
 */

export enum L13OutputFailureStage {
  INPUT_PACKAGE_PERSISTENCE = 'INPUT_PACKAGE_PERSISTENCE',
  MODEL_RUN_PERSISTENCE = 'MODEL_RUN_PERSISTENCE',
  OUTPUT_PERSISTENCE = 'OUTPUT_PERSISTENCE',
  CLAIM_PERSISTENCE = 'CLAIM_PERSISTENCE',
  FEEDBACK_PERSISTENCE = 'FEEDBACK_PERSISTENCE',
  AUDIT_EVENT_PERSISTENCE = 'AUDIT_EVENT_PERSISTENCE',
  CURRENT_REGISTRY_UPDATE = 'CURRENT_REGISTRY_UPDATE',
  HISTORICAL_FACT_APPEND = 'HISTORICAL_FACT_APPEND',
  QUALITY_METRIC_MATERIALIZATION = 'QUALITY_METRIC_MATERIALIZATION',
}

export const ALL_L13_OUTPUT_FAILURE_STAGES:
  readonly L13OutputFailureStage[] =
  Object.values(L13OutputFailureStage);

export enum L13OutputFailureClass {
  L5_ROUTE_REJECTED = 'L5_ROUTE_REJECTED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  ENVELOPE_INVALID = 'ENVELOPE_INVALID',
  AUTHORITY_CONFLICT = 'AUTHORITY_CONFLICT',
  HISTORICAL_MUTATION_REJECTED = 'HISTORICAL_MUTATION_REJECTED',
  REQUIRED_ARTIFACT_MISSING = 'REQUIRED_ARTIFACT_MISSING',
  MATERIALIZATION_INCOMPLETE = 'MATERIALIZATION_INCOMPLETE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export const ALL_L13_OUTPUT_FAILURE_CLASSES:
  readonly L13OutputFailureClass[] =
  Object.values(L13OutputFailureClass);

export interface L13AIOutputFailureRecord {
  readonly output_failure_id: string;
  readonly request_id: string;
  readonly runtime_run_id?: string;
  readonly output_id?: string;
  readonly failure_stage: L13OutputFailureStage;
  readonly failure_class: L13OutputFailureClass;
  readonly failure_reason_codes: readonly string[];
  readonly safe_to_retry: boolean;
  readonly repair_possible: boolean;
  readonly related_audit_event_refs: readonly string[];
  readonly created_at: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
