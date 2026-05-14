/**
 * L12.7 — Rollback Policy (§12.7.13)
 *
 * Modes and triggers for governed Layer 12 rollback. A rollback may
 * never delete or mutate historical scenario truth; it must preserve
 * lineage and append failure / rollback records.
 */

export const L12_ROLLBACK_POLICY_VERSION = 'l12.7.rollback.v1';

/** §12.7.13 — rollback actions. */
export enum L12RollbackAction {
  DISABLE_LIVE_SERVING = 'DISABLE_LIVE_SERVING',
  FALL_BACK_TO_PREVIOUS_RATIFIED_ARTIFACT =
    'FALL_BACK_TO_PREVIOUS_RATIFIED_ARTIFACT',
  DISABLE_TEMPLATE_FAMILY = 'DISABLE_TEMPLATE_FAMILY',
  FORCE_SHADOW_ONLY = 'FORCE_SHADOW_ONLY',
  BLOCK_L13_CONSUMPTION = 'BLOCK_L13_CONSUMPTION',
  REQUIRE_REPAIR_RUN = 'REQUIRE_REPAIR_RUN',
  REQUIRE_FULL_RECERTIFICATION = 'REQUIRE_FULL_RECERTIFICATION',
}

export const ALL_L12_ROLLBACK_ACTIONS:
  readonly L12RollbackAction[] = Object.values(L12RollbackAction);

/** §12.7.13 — canonical rollback triggers. */
export enum L12RollbackTrigger {
  PREDICTION_THEATER_BREACH = 'PREDICTION_THEATER_BREACH',
  RECOMMENDATION_LEAKAGE = 'RECOMMENDATION_LEAKAGE',
  FINAL_JUDGMENT_LEAKAGE = 'FINAL_JUDGMENT_LEAKAGE',
  L13_REBUILD_BYPASS_ATTEMPT = 'L13_REBUILD_BYPASS_ATTEMPT',
  REPLAY_MISMATCH_THRESHOLD = 'REPLAY_MISMATCH_THRESHOLD',
  INVALIDATION_MISSING_IN_LIVE_OUTPUT =
    'INVALIDATION_MISSING_IN_LIVE_OUTPUT',
  TRIGGER_MISSING_IN_LIVE_OUTPUT = 'TRIGGER_MISSING_IN_LIVE_OUTPUT',
  DIRECT_WRITE_DETECTED = 'DIRECT_WRITE_DETECTED',
  CURRENT_AUTHORITY_CORRUPTION_DETECTED =
    'CURRENT_AUTHORITY_CORRUPTION_DETECTED',
  EVIDENCE_PACK_ORPHANING_DETECTED =
    'EVIDENCE_PACK_ORPHANING_DETECTED',
}

export const ALL_L12_ROLLBACK_TRIGGERS:
  readonly L12RollbackTrigger[] = Object.values(L12RollbackTrigger);

/** Canonical mapping trigger → action. */
export const L12_ROLLBACK_TRIGGER_TO_ACTION:
  Readonly<Record<L12RollbackTrigger, L12RollbackAction>> = {
  [L12RollbackTrigger.PREDICTION_THEATER_BREACH]:
    L12RollbackAction.DISABLE_LIVE_SERVING,
  [L12RollbackTrigger.RECOMMENDATION_LEAKAGE]:
    L12RollbackAction.DISABLE_LIVE_SERVING,
  [L12RollbackTrigger.FINAL_JUDGMENT_LEAKAGE]:
    L12RollbackAction.DISABLE_LIVE_SERVING,
  [L12RollbackTrigger.L13_REBUILD_BYPASS_ATTEMPT]:
    L12RollbackAction.BLOCK_L13_CONSUMPTION,
  [L12RollbackTrigger.REPLAY_MISMATCH_THRESHOLD]:
    L12RollbackAction.REQUIRE_REPAIR_RUN,
  [L12RollbackTrigger.INVALIDATION_MISSING_IN_LIVE_OUTPUT]:
    L12RollbackAction.FORCE_SHADOW_ONLY,
  [L12RollbackTrigger.TRIGGER_MISSING_IN_LIVE_OUTPUT]:
    L12RollbackAction.FORCE_SHADOW_ONLY,
  [L12RollbackTrigger.DIRECT_WRITE_DETECTED]:
    L12RollbackAction.REQUIRE_FULL_RECERTIFICATION,
  [L12RollbackTrigger.CURRENT_AUTHORITY_CORRUPTION_DETECTED]:
    L12RollbackAction.FALL_BACK_TO_PREVIOUS_RATIFIED_ARTIFACT,
  [L12RollbackTrigger.EVIDENCE_PACK_ORPHANING_DETECTED]:
    L12RollbackAction.REQUIRE_REPAIR_RUN,
};

/** Concrete rollback request. */
export interface L12RollbackRequest {
  readonly rollback_request_id: string;
  readonly trigger: L12RollbackTrigger;
  readonly action: L12RollbackAction;
  readonly reason: string;
  readonly affected_scenario_subject_ids: readonly string[];
  readonly affected_template_families: readonly string[];

  readonly deletes_historical_scenario_facts: boolean;
  readonly mutates_prior_scenario_outputs: boolean;
  readonly invents_evidence: boolean;
  readonly hides_failure_reason: boolean;
  readonly bypasses_l5_persistence: boolean;

  readonly preserves_lineage: boolean;
  readonly appends_rollback_record: boolean;
  readonly maintains_evidence: boolean;
  readonly notifies_downstream: boolean;

  readonly policy_version: string;
}

export enum L12RollbackViolationCode {
  L12RB_REASON_MISSING = 'L12RB_REASON_MISSING',
  L12RB_TRIGGER_MISSING = 'L12RB_TRIGGER_MISSING',
  L12RB_ACTION_MISSING = 'L12RB_ACTION_MISSING',
  L12RB_DELETES_HISTORICAL_FACT = 'L12RB_DELETES_HISTORICAL_FACT',
  L12RB_MUTATES_PRIOR_SCENARIO_OUTPUTS =
    'L12RB_MUTATES_PRIOR_SCENARIO_OUTPUTS',
  L12RB_INVENTS_EVIDENCE = 'L12RB_INVENTS_EVIDENCE',
  L12RB_HIDES_FAILURE_REASON = 'L12RB_HIDES_FAILURE_REASON',
  L12RB_BYPASSES_L5 = 'L12RB_BYPASSES_L5',
  L12RB_LINEAGE_NOT_PRESERVED = 'L12RB_LINEAGE_NOT_PRESERVED',
  L12RB_NO_ROLLBACK_RECORD = 'L12RB_NO_ROLLBACK_RECORD',
  L12RB_EVIDENCE_NOT_MAINTAINED = 'L12RB_EVIDENCE_NOT_MAINTAINED',
  L12RB_DOWNSTREAM_NOT_NOTIFIED = 'L12RB_DOWNSTREAM_NOT_NOTIFIED',
  L12RB_TRIGGER_ACTION_MISMATCH = 'L12RB_TRIGGER_ACTION_MISMATCH',
}

export interface L12RollbackIssue {
  readonly code: L12RollbackViolationCode;
  readonly message: string;
  readonly rollback_request_id?: string;
}

export function validateL12RollbackRequest(
  r: L12RollbackRequest,
): readonly L12RollbackIssue[] {
  const issues: L12RollbackIssue[] = [];
  const ref = r?.rollback_request_id;
  if (!r) {
    issues.push({ code: L12RollbackViolationCode.L12RB_REASON_MISSING,
      message: 'rollback request null' });
    return issues;
  }
  if (!r.reason) {
    issues.push({ code: L12RollbackViolationCode.L12RB_REASON_MISSING,
      message: 'reason missing', rollback_request_id: ref });
  }
  if (!r.trigger) {
    issues.push({ code: L12RollbackViolationCode.L12RB_TRIGGER_MISSING,
      message: 'trigger missing', rollback_request_id: ref });
  }
  if (!r.action) {
    issues.push({ code: L12RollbackViolationCode.L12RB_ACTION_MISSING,
      message: 'action missing', rollback_request_id: ref });
  }
  if (r.trigger && r.action) {
    const expected = L12_ROLLBACK_TRIGGER_TO_ACTION[r.trigger];
    if (expected !== r.action) {
      issues.push({
        code: L12RollbackViolationCode.L12RB_TRIGGER_ACTION_MISMATCH,
        message: `trigger=${r.trigger} expects action=${expected}, got ${r.action}`,
        rollback_request_id: ref });
    }
  }
  if (r.deletes_historical_scenario_facts) {
    issues.push({ code: L12RollbackViolationCode.L12RB_DELETES_HISTORICAL_FACT,
      message: 'rollback may not delete historical scenario facts',
      rollback_request_id: ref });
  }
  if (r.mutates_prior_scenario_outputs) {
    issues.push({
      code: L12RollbackViolationCode.L12RB_MUTATES_PRIOR_SCENARIO_OUTPUTS,
      message: 'rollback may not mutate prior scenario outputs',
      rollback_request_id: ref });
  }
  if (r.invents_evidence) {
    issues.push({ code: L12RollbackViolationCode.L12RB_INVENTS_EVIDENCE,
      message: 'rollback may not invent evidence',
      rollback_request_id: ref });
  }
  if (r.hides_failure_reason) {
    issues.push({ code: L12RollbackViolationCode.L12RB_HIDES_FAILURE_REASON,
      message: 'rollback may not hide failure reasons',
      rollback_request_id: ref });
  }
  if (r.bypasses_l5_persistence) {
    issues.push({ code: L12RollbackViolationCode.L12RB_BYPASSES_L5,
      message: 'rollback may not bypass L5 persistence',
      rollback_request_id: ref });
  }
  if (!r.preserves_lineage) {
    issues.push({ code: L12RollbackViolationCode.L12RB_LINEAGE_NOT_PRESERVED,
      message: 'rollback must preserve lineage',
      rollback_request_id: ref });
  }
  if (!r.appends_rollback_record) {
    issues.push({ code: L12RollbackViolationCode.L12RB_NO_ROLLBACK_RECORD,
      message: 'rollback must append a rollback record',
      rollback_request_id: ref });
  }
  if (!r.maintains_evidence) {
    issues.push({ code: L12RollbackViolationCode.L12RB_EVIDENCE_NOT_MAINTAINED,
      message: 'rollback must maintain evidence',
      rollback_request_id: ref });
  }
  if (!r.notifies_downstream) {
    issues.push({ code: L12RollbackViolationCode.L12RB_DOWNSTREAM_NOT_NOTIFIED,
      message: 'rollback must notify downstream consumers',
      rollback_request_id: ref });
  }
  return issues;
}
