/**
 * L6.8 — Rollback Policy
 *
 * §6.8.6.5 — A bad rollout must be reversible. Rollback must preserve
 * historical lineage, §6.8.8.3 invariant: no rollback without lineage
 * preservation.
 */

export enum L6RollbackMode {
  FAMILY_DISABLE = 'FAMILY_DISABLE',
  EVENT_FAMILY_DISABLE = 'EVENT_FAMILY_DISABLE',
  CURRENT_STATE_MATERIALIZATION_FREEZE = 'CURRENT_STATE_MATERIALIZATION_FREEZE',
  REPLAY_ONLY_MODE = 'REPLAY_ONLY_MODE',
  REPAIR_ONLY_MODE = 'REPAIR_ONLY_MODE',
  RESTORE_PREVIOUS_CONTRACT_VERSION = 'RESTORE_PREVIOUS_CONTRACT_VERSION',
}

export const ALL_ROLLBACK_MODES: readonly L6RollbackMode[] = Object.values(L6RollbackMode);

export interface L6RollbackPlan {
  readonly plan_id: string;
  readonly mode: L6RollbackMode;
  readonly target_kind: 'FEATURE_FAMILY' | 'EVENT_FAMILY' | 'CONTRACT' | 'LAYER';
  readonly target_id: string;
  readonly preserves_history: true;
  readonly keeps_lineage_visible: true;
  readonly approval_required: boolean;
  readonly notes: string;
}

export interface L6RollbackRecord {
  readonly record_id: string;
  readonly plan_id: string;
  readonly executed_at: string;
  readonly actor: string;
  readonly lineage_preserved: boolean;
  readonly historical_rows_touched: 0;
}

const rollbackLog: L6RollbackRecord[] = [];

/**
 * Enforce constitutional rollback law: may never delete history, may
 * never rewrite prior current-state rows silently.
 */
export function executeRollback(
  plan: L6RollbackPlan,
  actor: string,
): L6RollbackRecord {
  if (!plan.preserves_history) {
    throw new Error('L6.8 rollback violation: plan.preserves_history must be true');
  }
  if (!plan.keeps_lineage_visible) {
    throw new Error('L6.8 rollback violation: plan.keeps_lineage_visible must be true');
  }
  const record: L6RollbackRecord = {
    record_id: `rbk:${plan.plan_id}:${Date.now()}`,
    plan_id: plan.plan_id,
    executed_at: new Date().toISOString(),
    actor,
    lineage_preserved: true,
    historical_rows_touched: 0,
  };
  rollbackLog.push(record);
  return record;
}

export function listRollbackRecords(): readonly L6RollbackRecord[] {
  return [...rollbackLog];
}

export function clearRollbackLog(): void {
  rollbackLog.length = 0;
}

/**
 * §6.8.6.6 — Failure recovery playbook registry. Explicit, not tribal.
 */
export interface L6FailurePlaybook {
  readonly playbook_id: string;
  readonly failure_class: string;
  readonly first_actions: readonly string[];
  readonly verification_steps: readonly string[];
  readonly escalation_path: readonly string[];
}

export const L6_FAILURE_PLAYBOOKS: readonly L6FailurePlaybook[] = Object.freeze([
  {
    playbook_id: 'pb.compute_run_partial',
    failure_class: 'compute_run_partial_failure',
    first_actions: [
      'isolate failing node family', 'freeze its current-state materialization',
      'enqueue repair-only recompute for affected scopes',
    ],
    verification_steps: ['replay matches live for unaffected scopes'],
    escalation_path: ['on-call L6', 'L5 storage lead'],
  },
  {
    playbook_id: 'pb.persistence_failure',
    failure_class: 'persistence_failure',
    first_actions: ['halt current-state writes', 'drain outbox', 'verify manifest integrity'],
    verification_steps: ['no archive-linkage failures', 'no orphan evidence packs'],
    escalation_path: ['on-call L6', 'L5 storage lead', 'L7 risk'],
  },
  {
    playbook_id: 'pb.replay_mismatch',
    failure_class: 'replay_mismatch',
    first_actions: ['pin rollback to REPLAY_ONLY_MODE', 'collect diff samples'],
    verification_steps: ['diff bounded to known migration window'],
    escalation_path: ['on-call L6', 'L6 contract owner'],
  },
  {
    playbook_id: 'pb.illegal_supersession',
    failure_class: 'illegal_supersession_attempt',
    first_actions: ['block writer', 'audit supersession lineage'],
    verification_steps: ['no current rows silently overwritten'],
    escalation_path: ['on-call L6', 'L5 coordination'],
  },
  {
    playbook_id: 'pb.corrupted_watermark',
    failure_class: 'corrupted_watermark_state',
    first_actions: ['pin family to replay-only', 'rebuild watermark from compute run lineage'],
    verification_steps: ['watermark strictly monotonic'],
    escalation_path: ['on-call L6'],
  },
  {
    playbook_id: 'pb.migration_incompat',
    failure_class: 'migration_incompatibility',
    first_actions: ['restore previous contract version', 'freeze migration gate'],
    verification_steps: ['replay stable on prior version'],
    escalation_path: ['L6 contract owner'],
  },
  {
    playbook_id: 'pb.event_storm',
    failure_class: 'event_storm_instability',
    first_actions: ['disable event family', 'tune suppression', 'replay-verify'],
    verification_steps: ['storm rate < SLO'],
    escalation_path: ['on-call L6', 'event owner'],
  },
  {
    playbook_id: 'pb.evidence_archive_failure',
    failure_class: 'evidence_pack_archive_failure',
    first_actions: ['halt affected materializer', 'failover archive target'],
    verification_steps: ['no orphan packs'],
    escalation_path: ['L5 storage lead'],
  },
]);
