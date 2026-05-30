/**
 * L13.11 — Repair Request + Result Contracts
 *
 * §13.11.13–§13.11.16 — Closed sets for repair triggers / allowed
 * actions / statuses and the durable request and result shapes.
 */

import type { L13RepairReasonCode } from './l13-replay-result';

export enum L13RepairTriggerClass {
  REPLAY_LEGAL_DRIFT = 'REPLAY_LEGAL_DRIFT',
  REPLAY_SAFETY_DRIFT = 'REPLAY_SAFETY_DRIFT',
  OUTPUT_FAILURE_RECOVERY = 'OUTPUT_FAILURE_RECOVERY',
  FEEDBACK_ESCALATION = 'FEEDBACK_ESCALATION',
  AUDIT_CRITICAL_FINDING = 'AUDIT_CRITICAL_FINDING',
  POLICY_MIGRATION = 'POLICY_MIGRATION',
  MANUAL_REPAIR_REQUEST = 'MANUAL_REPAIR_REQUEST',
}

export const ALL_L13_REPAIR_TRIGGER_CLASSES:
  readonly L13RepairTriggerClass[] =
  Object.values(L13RepairTriggerClass);

export enum L13AllowedRepairAction {
  RERUN_GROUNDING = 'RERUN_GROUNDING',
  RERUN_EXPRESSION_GOVERNANCE = 'RERUN_EXPRESSION_GOVERNANCE',
  RERUN_PRODUCT_MODE = 'RERUN_PRODUCT_MODE',
  RERUN_STYLE = 'RERUN_STYLE',
  RERUN_SAFETY = 'RERUN_SAFETY',
  REREMIT_GOVERNED_REWRITE = 'REREMIT_GOVERNED_REWRITE',
  EMIT_REFUSAL_REPLACEMENT = 'EMIT_REFUSAL_REPLACEMENT',
  SUPERSEDE_CURRENT_AUTHORITY = 'SUPERSEDE_CURRENT_AUTHORITY',
}

export const ALL_L13_ALLOWED_REPAIR_ACTIONS:
  readonly L13AllowedRepairAction[] =
  Object.values(L13AllowedRepairAction);

export interface L13RepairRequest {
  readonly repair_request_id: string;
  readonly source_output_id: string;
  readonly source_runtime_run_id: string;
  readonly repair_trigger: L13RepairTriggerClass;
  readonly repair_reason_codes: readonly L13RepairReasonCode[];
  readonly violation_refs: readonly string[];
  readonly replay_result_ref?: string;
  readonly failure_record_ref?: string;
  readonly feedback_record_refs?: readonly string[];
  readonly allowed_repair_actions: readonly L13AllowedRepairAction[];
  readonly may_reuse_input_package: boolean;
  readonly may_reuse_prompt_template: boolean;
  readonly must_rebuild_prompt_assembly: boolean;
  readonly must_rerun_model: boolean;
  readonly must_rerun_grounding: boolean;
  readonly must_rerun_safety: boolean;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

export enum L13RepairStatus {
  REPAIR_COMPLETED_WITH_SUPERSESSION = 'REPAIR_COMPLETED_WITH_SUPERSESSION',
  REPAIR_COMPLETED_NO_USER_REEMISSION = 'REPAIR_COMPLETED_NO_USER_REEMISSION',
  REPAIR_REFUSAL_EMITTED = 'REPAIR_REFUSAL_EMITTED',
  REPAIR_BLOCKED_UNSUPPORTED = 'REPAIR_BLOCKED_UNSUPPORTED',
  REPAIR_BLOCKED_SAFETY = 'REPAIR_BLOCKED_SAFETY',
  REPAIR_FAILED_INCOMPLETE_SUBSTRATE = 'REPAIR_FAILED_INCOMPLETE_SUBSTRATE',
}

export const ALL_L13_REPAIR_STATUSES: readonly L13RepairStatus[] =
  Object.values(L13RepairStatus);

export interface L13RepairResult {
  readonly repair_result_id: string;
  readonly repair_request_id: string;
  readonly source_output_id: string;
  readonly repaired_output_id?: string;
  readonly repair_status: L13RepairStatus;
  readonly original_output_preserved: true;
  readonly supersession_record_ref?: string;
  readonly grounding_rerun: boolean;
  readonly safety_rerun: boolean;
  readonly expression_rerun: boolean;
  readonly style_rerun: boolean;
  readonly product_mode_rerun: boolean;
  readonly invented_evidence_detected: false;
  readonly contradiction_disclosure_preserved: boolean;
  readonly confidence_upgrade_without_support_detected: boolean;
  readonly repair_audit_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
