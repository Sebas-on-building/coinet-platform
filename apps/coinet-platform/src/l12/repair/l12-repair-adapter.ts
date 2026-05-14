/**
 * L12.4 — Runtime repair adapter (§12.4.27).
 *
 * Repair runs must be:
 *   • mode == REPAIR
 *   • have a distinct compute_run_id from parent
 *   • have parent_run_id and repair_reason
 *   • bring at least one changed input ref
 *   • not invent evidence, not remove triggers/invalidations
 *   • not upgrade confidence without new evidence
 */

import {
  L12ScenarioComputeRun,
  L12ScenarioRunMode,
} from '../runtime/scenario-compute-run';

export interface L12RepairCheckArgs {
  readonly parent_run: L12ScenarioComputeRun;
  readonly repair_run: L12ScenarioComputeRun;

  readonly changed_input_refs: readonly string[];

  readonly added_evidence_refs?: readonly string[];
  readonly removed_evidence_refs?: readonly string[];
  readonly removed_trigger_refs?: readonly string[];
  readonly removed_invalidation_refs?: readonly string[];

  readonly parent_primary_confidence: number;
  readonly repair_primary_confidence: number;
}

export interface L12RepairCheckResult {
  readonly ok: boolean;
  readonly issues: readonly string[];
}

export function checkL12RepairLaw(args: L12RepairCheckArgs): L12RepairCheckResult {
  const issues: string[] = [];
  if (args.repair_run.run_mode !== L12ScenarioRunMode.REPAIR) {
    issues.push('repair run mode must be REPAIR');
  }
  if (!args.repair_run.parent_run_id) issues.push('repair run missing parent_run_id');
  if (args.repair_run.parent_run_id !== args.parent_run.compute_run_id) {
    issues.push('repair parent_run_id does not match parent compute_run_id');
  }
  if (!args.repair_run.repair_reason) issues.push('repair run missing repair_reason');
  if (args.repair_run.compute_run_id === args.parent_run.compute_run_id) {
    issues.push('repair compute_run_id must differ from parent');
  }
  if (args.changed_input_refs.length === 0) {
    issues.push('repair run must reference at least one changed input');
  }
  if ((args.removed_trigger_refs ?? []).length > 0) issues.push('repair removes trigger(s)');
  if ((args.removed_invalidation_refs ?? []).length > 0)
    issues.push('repair removes invalidation(s)');

  // Confidence may not be upgraded without new evidence.
  const upgraded = args.repair_primary_confidence > args.parent_primary_confidence;
  const newEvidence = (args.added_evidence_refs ?? []).length > 0;
  if (upgraded && !newEvidence) {
    issues.push('repair upgrades confidence without new evidence');
  }
  return { ok: issues.length === 0, issues };
}
