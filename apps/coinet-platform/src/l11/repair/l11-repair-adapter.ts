/**
 * L11.8 — Repair Adapter (§11.8.16)
 *
 * Pure validation adapter for governed repair runs. A repair must
 * have a parent run id, a repair reason, a fresh run id (not the
 * parent's), at least one correction lineage ref, must not invent
 * evidence, and must not masquerade as a live run.
 */

import { L11ScoreFamily } from '../contracts/score-family';
import { L11MaterializationMode } from '../contracts/l11-persistence-surface';

export const L11_REPAIR_POLICY_VERSION = 'l11.8.repair.v1';

export enum L11RepairTrigger {
  LATE_DATA_CORRECTION = 'LATE_DATA_CORRECTION',
  UPSTREAM_FACT_CORRECTION = 'UPSTREAM_FACT_CORRECTION',
  EVIDENCE_REPAIR = 'EVIDENCE_REPAIR',
  ATTRIBUTION_BUG_FIX = 'ATTRIBUTION_BUG_FIX',
  THRESHOLD_POLICY_MIGRATION = 'THRESHOLD_POLICY_MIGRATION',
  FORMULA_VERSION_MIGRATION = 'FORMULA_VERSION_MIGRATION',
  REGULATORY_CORRECTION = 'REGULATORY_CORRECTION',
}

export const ALL_L11_REPAIR_TRIGGERS:
  readonly L11RepairTrigger[] = Object.values(L11RepairTrigger);

export interface L11RepairRequest {
  readonly repair_request_id: string;

  readonly parent_run_id: string;
  readonly new_run_id: string;
  readonly repair_reason: string;
  readonly trigger: L11RepairTrigger;

  readonly score_family: L11ScoreFamily;

  readonly changed_input_refs: readonly string[];
  readonly correction_lineage_refs: readonly string[];
  readonly prior_current_record_ref?: string;

  readonly materialization_mode: L11MaterializationMode;

  readonly invents_new_evidence: boolean;
  readonly masquerades_as_live: boolean;
  readonly destructive_historical_mutation: boolean;

  readonly policy_version: string;
}

export interface L11RepairAdmission {
  readonly admitted: boolean;
  readonly reason: string;
}

/**
 * Quick admissibility decision; full validation lives in the
 * `validateL11RepairRequest` validator.
 */
export function admitL11RepairRequest(
  r: L11RepairRequest,
): L11RepairAdmission {
  if (!r) return { admitted: false, reason: 'repair request is null' };
  if (!r.parent_run_id) {
    return { admitted: false, reason: 'parent_run_id missing' };
  }
  if (!r.repair_reason) {
    return { admitted: false, reason: 'repair_reason missing' };
  }
  if (!r.new_run_id || r.new_run_id === r.parent_run_id) {
    return { admitted: false, reason: 'new_run_id missing or equals parent' };
  }
  if (!Array.isArray(r.correction_lineage_refs) ||
      r.correction_lineage_refs.length === 0) {
    return { admitted: false, reason: 'correction_lineage_refs missing' };
  }
  if (r.invents_new_evidence) {
    return { admitted: false, reason: 'repair invents new evidence' };
  }
  if (r.masquerades_as_live) {
    return { admitted: false, reason: 'repair masquerades as live' };
  }
  if (r.destructive_historical_mutation) {
    return { admitted: false, reason: 'repair attempts destructive historical mutation' };
  }
  if (r.materialization_mode !== L11MaterializationMode.REPAIR_REBUILD &&
      r.materialization_mode !== L11MaterializationMode.LATE_DATA_REMATERIALIZATION) {
    return { admitted: false,
      reason: `materialization mode ${r.materialization_mode} not allowed for repair` };
  }
  return { admitted: true, reason: 'ok' };
}
