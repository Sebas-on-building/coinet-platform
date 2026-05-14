/**
 * L12.6 — Persistence-aware repair adapter (§12.6.18).
 *
 * Performs a parent-linked, reason-linked, lineage-linked, supersession-safe
 * repair. Cannot mutate prior runs, masquerade as live, or invent evidence.
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';

export enum L12RepairReason {
  LATE_DATA = 'LATE_DATA',
  EVIDENCE_CORRECTION = 'EVIDENCE_CORRECTION',
  TEMPLATE_BUG_FIX = 'TEMPLATE_BUG_FIX',
  RUNTIME_BUG_FIX = 'RUNTIME_BUG_FIX',
  STORAGE_CORRUPTION_REPAIR = 'STORAGE_CORRUPTION_REPAIR',
  LINEAGE_CORRECTION = 'LINEAGE_CORRECTION',
  GOVERNANCE_ACTION = 'GOVERNANCE_ACTION',
}

export const ALL_L12_REPAIR_REASONS: readonly L12RepairReason[] =
  Object.values(L12RepairReason);

export enum L12RepairStatus {
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  BLOCKED = 'BLOCKED',
  REJECTED = 'REJECTED',
}

export const ALL_L12_REPAIR_STATUSES: readonly L12RepairStatus[] =
  Object.values(L12RepairStatus);

export interface L12RepairRequest {
  readonly repair_request_id: string;

  readonly parent_compute_run_id: string;
  readonly scenario_set_id: string;

  readonly repair_reason: L12RepairReason;

  readonly changed_input_refs: readonly string[];
  readonly correction_lineage_refs: readonly string[];

  readonly requested_by: string;

  readonly allow_current_supersession: boolean;
  readonly allow_historical_correction: boolean;

  readonly policy_version: string;
}

export interface L12RepairExecutionInputs {
  readonly repair_compute_run_id: string;

  readonly removed_trigger_refs: readonly string[];
  readonly removed_invalidation_refs: readonly string[];

  readonly parent_primary_confidence: number;
  readonly repair_primary_confidence: number;

  readonly added_evidence_refs: readonly string[];
  readonly invented_evidence_refs: readonly string[];

  readonly mutates_parent_run: boolean;
  readonly masquerades_as_live: boolean;
  readonly bypasses_supersession: boolean;

  readonly superseded_current_record_refs: readonly string[];
  readonly new_current_record_refs: readonly string[];
  readonly corrected_historical_fact_refs: readonly string[];
  readonly new_evidence_pack_refs: readonly string[];

  readonly lineage_refs: readonly string[];
}

export interface L12RepairResult {
  readonly repair_result_id: string;

  readonly repair_request_id: string;
  readonly parent_compute_run_id: string;
  readonly repair_compute_run_id: string;

  readonly superseded_current_record_refs: readonly string[];
  readonly new_current_record_refs: readonly string[];

  readonly corrected_historical_fact_refs: readonly string[];

  readonly new_evidence_pack_refs: readonly string[];

  readonly repair_status: L12RepairStatus;

  readonly repair_change_summary_codes: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

/** Run the persistence-aware repair adapter. */
export function runL12PersistenceRepair(
  request: L12RepairRequest,
  inputs: L12RepairExecutionInputs,
): L12RepairResult {
  const reasons: string[] = [];
  let status: L12RepairStatus = L12RepairStatus.COMPLETED;

  if (!request.parent_compute_run_id) {
    reasons.push('REPAIR_PARENT_MISSING');
    status = L12RepairStatus.REJECTED;
  }
  if (!request.repair_reason) {
    reasons.push('REPAIR_REASON_MISSING');
    status = L12RepairStatus.REJECTED;
  }
  if (
    request.correction_lineage_refs.length === 0 &&
    inputs.lineage_refs.length === 0
  ) {
    reasons.push('REPAIR_LINEAGE_MISSING');
    if (status !== L12RepairStatus.REJECTED) status = L12RepairStatus.BLOCKED;
  }
  if (inputs.repair_compute_run_id === request.parent_compute_run_id) {
    reasons.push('REPAIR_REUSES_PARENT_COMPUTE_RUN_ID');
    status = L12RepairStatus.REJECTED;
  }
  if (inputs.mutates_parent_run) {
    reasons.push('REPAIR_MUTATES_PRIOR_RUN');
    status = L12RepairStatus.REJECTED;
  }
  if (inputs.masquerades_as_live) {
    reasons.push('REPAIR_MASQUERADES_AS_LIVE');
    status = L12RepairStatus.REJECTED;
  }
  if (inputs.bypasses_supersession) {
    reasons.push('REPAIR_BYPASSES_SUPERSESSION');
    status = L12RepairStatus.REJECTED;
  }
  if (
    inputs.removed_trigger_refs.length > 0 &&
    request.repair_reason !== L12RepairReason.EVIDENCE_CORRECTION
  ) {
    reasons.push('REPAIR_REMOVED_TRIGGER_WITHOUT_EVIDENCE');
    status = L12RepairStatus.BLOCKED;
  }
  if (
    inputs.removed_invalidation_refs.length > 0 &&
    request.repair_reason !== L12RepairReason.EVIDENCE_CORRECTION
  ) {
    reasons.push('REPAIR_REMOVED_INVALIDATION_WITHOUT_EVIDENCE');
    status = L12RepairStatus.BLOCKED;
  }
  if (
    inputs.repair_primary_confidence > inputs.parent_primary_confidence &&
    inputs.added_evidence_refs.length === 0
  ) {
    reasons.push('REPAIR_UPGRADED_CONFIDENCE_WITHOUT_EVIDENCE');
    status = L12RepairStatus.BLOCKED;
  }
  if (inputs.invented_evidence_refs.length > 0) {
    reasons.push('REPAIR_INVENTED_EVIDENCE');
    status = L12RepairStatus.REJECTED;
  }

  if (reasons.length > 0 && status === L12RepairStatus.COMPLETED) {
    status = L12RepairStatus.PARTIAL;
  }

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.repair.result',
    policy_version: request.policy_version,
    material: {
      repair_request_id: request.repair_request_id,
      parent_run_id: request.parent_compute_run_id,
      repair_run_id: inputs.repair_compute_run_id,
      reason: request.repair_reason,
      reason_codes: [...reasons].sort(),
      superseded: [...inputs.superseded_current_record_refs].sort(),
      new_current: [...inputs.new_current_record_refs].sort(),
      corrected_history: [...inputs.corrected_historical_fact_refs].sort(),
      new_evidence: [...inputs.new_evidence_pack_refs].sort(),
    },
  });

  return {
    repair_result_id: `l12.repair.result.${replay_hash}`,
    repair_request_id: request.repair_request_id,
    parent_compute_run_id: request.parent_compute_run_id,
    repair_compute_run_id: inputs.repair_compute_run_id,
    superseded_current_record_refs: [...inputs.superseded_current_record_refs].sort(),
    new_current_record_refs: [...inputs.new_current_record_refs].sort(),
    corrected_historical_fact_refs: [...inputs.corrected_historical_fact_refs].sort(),
    new_evidence_pack_refs: [...inputs.new_evidence_pack_refs].sort(),
    repair_status: status,
    repair_change_summary_codes: [...reasons].sort(),
    lineage_refs: [
      ...new Set([...request.correction_lineage_refs, ...inputs.lineage_refs]),
    ].sort(),
    replay_hash,
    policy_version: request.policy_version,
  };
}
