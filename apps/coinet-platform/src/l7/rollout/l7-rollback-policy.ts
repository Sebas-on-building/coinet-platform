/**
 * L7.8 — Rollback Policy
 *
 * §7.8.5.2 INV-7.8-C, §7.8.6.6 — A bad rollout must be reversible
 * without destroying historical truth. Rollback must:
 *
 *   • preserve history (never delete or rewrite historical rows)
 *   • keep lineage visible (replay/repair still work)
 *   • be family-aware and mode-safe
 *   • never silently mutate current-state rows written under prior
 *     policy versions (§7.8.6.6)
 */

export enum L7RollbackMode {
  FAMILY_DISABLE = 'FAMILY_DISABLE',
  CURRENT_MATERIALIZATION_FREEZE = 'CURRENT_MATERIALIZATION_FREEZE',
  REPLAY_ONLY_MODE = 'REPLAY_ONLY_MODE',
  REPAIR_ONLY_MODE = 'REPAIR_ONLY_MODE',
  RESTORE_PREVIOUS_CONTRACT_VERSION = 'RESTORE_PREVIOUS_CONTRACT_VERSION',
  CONFIDENCE_POLICY_REVERT = 'CONFIDENCE_POLICY_REVERT',
  RESTRICTION_POLICY_REVERT = 'RESTRICTION_POLICY_REVERT',
}

export const ALL_L7_ROLLBACK_MODES: readonly L7RollbackMode[] =
  Object.values(L7RollbackMode);

export interface L7RollbackPlan {
  readonly plan_id: string;
  readonly mode: L7RollbackMode;
  readonly target_kind:
    | 'VALIDATION_FAMILY'
    | 'CONFIDENCE_POLICY'
    | 'RESTRICTION_POLICY'
    | 'CONTRADICTION_TEMPLATE'
    | 'CONTRACT'
    | 'LAYER';
  readonly target_id: string;
  readonly preserves_history: true;
  readonly keeps_lineage_visible: true;
  readonly approval_required: boolean;
  readonly notes: string;
}

export interface L7RollbackRecord {
  readonly record_id: string;
  readonly plan_id: string;
  readonly executed_at: string;
  readonly actor: string;
  readonly lineage_preserved: boolean;
  readonly historical_rows_touched: 0;
}

const rollbackLog: L7RollbackRecord[] = [];

/**
 * §7.8.5.2 INV-7.8-C — Enforce constitutional rollback law: may never
 * delete history, may never rewrite prior current-state rows silently.
 *
 * Throws if either structural flag is false; tests assert that illegal
 * plans throw and legal plans emit a lineage-preserving record.
 */
export function executeL7Rollback(
  plan: L7RollbackPlan,
  actor: string,
): L7RollbackRecord {
  if (!plan.preserves_history) {
    throw new Error(
      'L7.8 rollback violation: plan.preserves_history must be true',
    );
  }
  if (!plan.keeps_lineage_visible) {
    throw new Error(
      'L7.8 rollback violation: plan.keeps_lineage_visible must be true',
    );
  }
  const record: L7RollbackRecord = {
    record_id: `rbk.l7:${plan.plan_id}:${Date.now()}`,
    plan_id: plan.plan_id,
    executed_at: new Date().toISOString(),
    actor,
    lineage_preserved: true,
    historical_rows_touched: 0,
  };
  rollbackLog.push(record);
  return record;
}

export function listL7RollbackRecords(): readonly L7RollbackRecord[] {
  return [...rollbackLog];
}

export function clearL7RollbackLog(): void {
  rollbackLog.length = 0;
}
