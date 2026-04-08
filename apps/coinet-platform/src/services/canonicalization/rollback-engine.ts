/**
 * L3.6 — Rollback Engine
 *
 * Governs rollback and reversal without history destruction.
 * Rollback is itself a mutation event — it never silently resets
 * state. The original mutation remains in the ledger. Rollback
 * creates a new forward mutation that restores a prior state.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getMutationById,
  linkRollbackMutation,
  type CanonicalMutationRecord,
} from './mutation-ledger';
import {
  getCanonicalVersionById,
  type CanonicalVersionRecord,
} from './canonical-versioning';
import {
  proposeMutation,
  validateMutation,
  stageMutation,
  commitMutation,
  supersedeMutation,
  emitMutationAuditEvent,
  type MutationProposalInput,
} from './mutation-control';

export const L36_ROLLBACK_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RollbackPlan {
  planId: string;
  originalMutationId: string;
  targetVersionId: string;
  restoreSnapshotRef: string;
  reasonCodes: string[];
  rollbackSafe: boolean;
  blockReasons: string[];
  createdAt: string;
}

export interface RollbackResult {
  success: boolean;
  rollbackMutationId?: string;
  plan: RollbackPlan;
  blockReason?: string;
  restoredVersionRecord?: CanonicalVersionRecord;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

const _rollbackPlans: RollbackPlan[] = [];

export function getAllRollbackPlans(): readonly RollbackPlan[] {
  return _rollbackPlans;
}

export function resetRollbackState(): void {
  _rollbackPlans.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELIGIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

export function isRollbackAllowed(mutationId: string): { allowed: boolean; reason: string } {
  const rec = getMutationById(mutationId);
  if (!rec) return { allowed: false, reason: 'MUTATION_NOT_FOUND' };

  if (rec.lifecycleState === 'PROPOSED' || rec.lifecycleState === 'VALIDATED' || rec.lifecycleState === 'STAGED') {
    return { allowed: false, reason: 'MUTATION_NOT_COMMITTED_YET' };
  }
  if (rec.lifecycleState === 'SUPERSEDED') {
    return { allowed: false, reason: 'MUTATION_ALREADY_SUPERSEDED' };
  }
  if (rec.rolledBackByMutationId) {
    return { allowed: false, reason: 'ALREADY_ROLLED_BACK' };
  }
  if (!rec.rollbackEligibility.reversible) {
    return { allowed: false, reason: rec.rollbackEligibility.reason ?? 'NOT_REVERSIBLE' };
  }

  return { allowed: true, reason: 'ELIGIBLE' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD ROLLBACK PLAN
// ═══════════════════════════════════════════════════════════════════════════════

export function buildRollbackPlan(
  mutationId: string,
  reasonCodes: string[] = ['ROLLBACK_REQUESTED'],
): RollbackPlan {
  const rec = getMutationById(mutationId);
  const blockReasons: string[] = [];

  if (!rec) {
    const plan: RollbackPlan = {
      planId: `rbplan_${uuidv4()}`, originalMutationId: mutationId,
      targetVersionId: '', restoreSnapshotRef: '', reasonCodes,
      rollbackSafe: false, blockReasons: ['MUTATION_NOT_FOUND'], createdAt: new Date().toISOString(),
    };
    _rollbackPlans.push(plan);
    return plan;
  }

  const eligibility = isRollbackAllowed(mutationId);
  if (!eligibility.allowed) blockReasons.push(eligibility.reason);

  let targetVersionId = '';
  let restoreSnapshotRef = '';

  if (rec.beforeVersionRefs.length > 0) {
    targetVersionId = rec.beforeVersionRefs[0];
    const ver = getCanonicalVersionById(targetVersionId);
    if (ver) {
      restoreSnapshotRef = ver.stateSnapshotRef;
    } else {
      blockReasons.push('BEFORE_VERSION_NOT_FOUND');
    }
  } else {
    restoreSnapshotRef = `pre_mutation_${mutationId}`;
    targetVersionId = `implicit_pre_${mutationId}`;
  }

  const plan: RollbackPlan = {
    planId: `rbplan_${uuidv4()}`,
    originalMutationId: mutationId,
    targetVersionId,
    restoreSnapshotRef,
    reasonCodes,
    rollbackSafe: blockReasons.length === 0,
    blockReasons,
    createdAt: new Date().toISOString(),
  };
  _rollbackPlans.push(plan);
  return plan;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPLY ROLLBACK
// ═══════════════════════════════════════════════════════════════════════════════

export function applyRollback(
  mutationId: string,
  initiatedBy: string,
  reasonCodes: string[] = ['ROLLBACK_REQUESTED'],
): RollbackResult {
  const plan = buildRollbackPlan(mutationId, reasonCodes);

  if (!plan.rollbackSafe) {
    return { success: false, plan, blockReason: plan.blockReasons.join(';') };
  }

  const original = getMutationById(mutationId)!;

  const proposalInput: MutationProposalInput = {
    mutationType: 'ROLLBACK_APPLIED',
    targetObjectIds: original.targetObjectIds,
    targetMetricPaths: original.targetMetricPaths,
    targetContractIds: original.targetContractIds,
    beforeState: { rollbackOf: mutationId },
    afterState: { restoredTo: plan.targetVersionId },
    reasonCodes: plan.reasonCodes,
    triggerType: 'ROLLBACK',
    evidenceRefs: [mutationId, plan.planId],
    initiatedBy,
    semanticClass: 'STRUCTURAL',
    lineageRefs: original.lineageRefs,
  };

  const proposal = proposeMutation(proposalInput);
  const validation = validateMutation(proposal.mutationId);

  if (validation.outcome !== 'VALID' && validation.outcome !== 'VALID_WITH_WARNINGS') {
    return { success: false, plan, blockReason: validation.blockReasons.join(';') };
  }

  const stageResult = stageMutation(proposal.mutationId);
  if (!stageResult.staged) {
    return { success: false, plan, blockReason: stageResult.blockReason };
  }

  const commitResult = commitMutation(proposal.mutationId, initiatedBy, plan.restoreSnapshotRef);
  if (!commitResult.committed) {
    return { success: false, plan, blockReason: commitResult.blockReason };
  }

  linkRollbackMutation(mutationId, proposal.mutationId);
  supersedeMutation(mutationId, proposal.mutationId);

  emitMutationAuditEvent(proposal.mutationId, 'ROLLBACK', `Rollback of ${mutationId}`);

  return {
    success: true,
    rollbackMutationId: proposal.mutationId,
    plan,
    restoredVersionRecord: commitResult.versionRecord,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getRollbackChain(mutationId: string): string[] {
  const chain: string[] = [];
  let current = getMutationById(mutationId);
  while (current?.rolledBackByMutationId) {
    chain.push(current.rolledBackByMutationId);
    current = getMutationById(current.rolledBackByMutationId);
  }
  return chain;
}

export function getRollbackTargetVersion(mutationId: string): string | undefined {
  const plan = _rollbackPlans.find(p => p.originalMutationId === mutationId && p.rollbackSafe);
  return plan?.targetVersionId;
}
