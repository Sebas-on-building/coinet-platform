/**
 * L13.11 — Repair Adapter
 *
 * §13.11.13–§13.11.17 — Pure function that consumes a repair
 * request and runtime signals and emits an `L13RepairResult`.
 * Enforces the repair may/may-not law (§13.11.12).
 */

import {
  L13AllowedRepairAction,
  L13RepairStatus,
  L13RepairTriggerClass,
  type L13RepairRequest,
  type L13RepairResult,
} from '../contracts/l13-repair-request';
import { L13RepairReasonCode } from '../contracts/l13-replay-result';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.repair.v1';

export interface L13RepairAdapterInput {
  readonly request: L13RepairRequest;
  /** Repair must NEVER mutate this; only fingerprint it for the audit. */
  readonly source_output_fingerprint: string;
  readonly substrate_complete: boolean;
  /** Did the governed rerun produce a re-emittable result? */
  readonly governed_rerun_emittable: boolean;
  readonly governed_rerun_refusal: boolean;
  readonly governed_rerun_blocked_safety: boolean;
  readonly governed_rerun_blocked_unsupported: boolean;
  readonly grounding_rerun: boolean;
  readonly safety_rerun: boolean;
  readonly expression_rerun: boolean;
  readonly style_rerun: boolean;
  readonly product_mode_rerun: boolean;
  readonly contradiction_disclosure_preserved: boolean;
  readonly confidence_upgrade_without_support_detected: boolean;
  readonly supersession_record_ref?: string;
  readonly repaired_output_id?: string;
  readonly repair_audit_refs?: readonly string[];
}

export function buildL13RepairRequest(
  input: {
    readonly source_output_id: string;
    readonly source_runtime_run_id: string;
    readonly repair_trigger: L13RepairTriggerClass;
    readonly repair_reason_codes: readonly L13RepairReasonCode[];
    readonly violation_refs?: readonly string[];
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
    readonly lineage_refs?: readonly string[];
  },
): L13RepairRequest {
  const lineage = input.lineage_refs ?? ['l13.repair.lineage'];
  const violations = input.violation_refs ?? [];
  const replayHash = fnv1a(
    [
      input.source_output_id,
      input.source_runtime_run_id,
      input.repair_trigger,
      input.repair_reason_codes.slice().sort().join(','),
      violations.slice().sort().join(','),
      input.replay_result_ref ?? '',
      input.failure_record_ref ?? '',
      (input.feedback_record_refs ?? []).slice().sort().join(','),
      input.allowed_repair_actions.slice().sort().join(','),
      String(input.may_reuse_input_package),
      String(input.may_reuse_prompt_template),
      String(input.must_rebuild_prompt_assembly),
      String(input.must_rerun_model),
      String(input.must_rerun_grounding),
      String(input.must_rerun_safety),
      POLICY_V,
    ].join('|'),
  );
  return {
    repair_request_id: `l13.repair.req.${replayHash}`,
    source_output_id: input.source_output_id,
    source_runtime_run_id: input.source_runtime_run_id,
    repair_trigger: input.repair_trigger,
    repair_reason_codes: input.repair_reason_codes,
    violation_refs: violations,
    replay_result_ref: input.replay_result_ref,
    failure_record_ref: input.failure_record_ref,
    feedback_record_refs: input.feedback_record_refs,
    allowed_repair_actions: input.allowed_repair_actions,
    may_reuse_input_package: input.may_reuse_input_package,
    may_reuse_prompt_template: input.may_reuse_prompt_template,
    must_rebuild_prompt_assembly: input.must_rebuild_prompt_assembly,
    must_rerun_model: input.must_rerun_model,
    must_rerun_grounding: input.must_rerun_grounding,
    must_rerun_safety: input.must_rerun_safety,
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

export function runL13Repair(
  input: L13RepairAdapterInput,
): L13RepairResult {
  const lineage = ['l13.repair.lineage'];
  const auditRefs = input.repair_audit_refs ?? [];

  let status: L13RepairStatus;
  if (!input.substrate_complete) {
    status = L13RepairStatus.REPAIR_FAILED_INCOMPLETE_SUBSTRATE;
  } else if (input.governed_rerun_blocked_safety) {
    status = L13RepairStatus.REPAIR_BLOCKED_SAFETY;
  } else if (input.governed_rerun_blocked_unsupported) {
    status = L13RepairStatus.REPAIR_BLOCKED_UNSUPPORTED;
  } else if (input.governed_rerun_refusal) {
    status = L13RepairStatus.REPAIR_REFUSAL_EMITTED;
  } else if (
    input.governed_rerun_emittable &&
    input.supersession_record_ref
  ) {
    status = L13RepairStatus.REPAIR_COMPLETED_WITH_SUPERSESSION;
  } else {
    status = L13RepairStatus.REPAIR_COMPLETED_NO_USER_REEMISSION;
  }

  const replayHash = fnv1a(
    [
      input.request.repair_request_id,
      input.request.source_output_id,
      input.source_output_fingerprint,
      input.repaired_output_id ?? '',
      status,
      String(input.grounding_rerun),
      String(input.safety_rerun),
      String(input.expression_rerun),
      String(input.style_rerun),
      String(input.product_mode_rerun),
      String(input.contradiction_disclosure_preserved),
      String(input.confidence_upgrade_without_support_detected),
      input.supersession_record_ref ?? '',
      auditRefs.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );

  return {
    repair_result_id: `l13.repair.${replayHash}`,
    repair_request_id: input.request.repair_request_id,
    source_output_id: input.request.source_output_id,
    repaired_output_id: input.repaired_output_id,
    repair_status: status,
    original_output_preserved: true,
    supersession_record_ref: input.supersession_record_ref,
    grounding_rerun: input.grounding_rerun,
    safety_rerun: input.safety_rerun,
    expression_rerun: input.expression_rerun,
    style_rerun: input.style_rerun,
    product_mode_rerun: input.product_mode_rerun,
    invented_evidence_detected: false,
    contradiction_disclosure_preserved:
      input.contradiction_disclosure_preserved,
    confidence_upgrade_without_support_detected:
      input.confidence_upgrade_without_support_detected,
    repair_audit_refs: auditRefs,
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
